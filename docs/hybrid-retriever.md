# hybrid-retriever.ts

## Purpose
`src/lib/hybrid-retriever.ts` provides a **hybrid Bible search** that combines:

- vector search (semantic similarity with OpenAI embeddings + MongoDB vector index),
- graph search (entity-driven retrieval with `entity_slugs`),
- BM25 full-text search (Meilisearch),
- rank fusion (RRF-3) to merge all result sets.

It returns:
- ranked verses,
- related entity facts,
- metadata about search weights and result counts.

---

## Main flow (`retrieve`)

1. Build a cache key from query + parameters.
2. Return cached payload if available (`retrieveCache`).
3. Normalize `vectorWeight`, `graphWeight`, and `bm25Weight` to sum to 1.0.
4. Apply **adaptive fanout**:
   - If `vectorWeight <= 0.1`: skip vector search entirely (resolve to empty).
   - If `graphWeight <= 0.1`: skip graph search entirely (resolve to empty).
   - If `bm25Weight <= 0.05`: skip BM25 search entirely (resolve to empty).
   - Otherwise: use fanout multiplier based on intent:
     - `vectorSearchK = (vectorWeight <= 0.15) ? max(4, k) : k * 2`
     - `graphSearchK = (graphWeight >= 0.7) ? max(k + 2, 8) : k * 2`
     - `bm25SearchK = (bm25Weight >= 0.35) ? max(k + 3, 10) : k * 2`
5. Run in parallel (all active retrievers):
   - `vectorSearch(query, vectorSearchK, filters)`
   - `graphSearch(query, graphSearchK, filters)`
   - `bm25Search(query, bm25SearchK, filters)`
6. Merge all lists using `reciprocalRankFusion(...)`.
7. Keep top `k` verses above `minScore`.
7. Resolve entity slugs:
   - first from `verse.entitySlugs`,
   - fallback to `extractMentionedEntities(...)` if missing.
8. Load facts with relations via `augmentWithEntityFacts(...)`.
9. Re-rank/filter entity facts with `scoreAndFilterEntityFacts(...)` (includes genealogy lexical boosting via `rerankByQueryOverlap` for kinship hints).
10. Cache and return final response.

---

## Search strategies

### 1) `vectorSearch`
- Creates/reads embedding from `getQueryEmbedding` (with embedding cache).
- Runs MongoDB `$vectorSearch` on `embedding`.
- Applies optional `book` / `testament` filters.
- Returns `RankedVerseResult[]` with source `"vector"`.

### 2) `graphSearch`
- Tokenizes query and matches entities (`name` / `aliases`).
- Uses `entity_slugs: { $in: [...] }` against `verses` (primary path).
- Applies same `book` / `testament` filters.
- Uses limited regex fallback only if no primary hits.
- Returns `RankedVerseResult[]` with source `"graph"`.

### 3) `bm25Search`
- Uses Meilisearch `verses_bm25` index.
- Converts testament filters to `Old/New` values.
- Adds circuit breaker fallback:
   - after 3 consecutive errors, BM25 is disabled for 5 minutes.
   - `SKIP_MEILISEARCH=true` disables BM25 immediately.

### 4) Fusion: `reciprocalRankFusion`
- Combines vector + graph + BM25 rankings with configurable weights:
  - `vectorWeight`
  - `graphWeight`
   - `bm25Weight`
- Produces final hybrid score and source `"hybrid"`.

RRF-3 formula:

$$
score(d) = w_v \cdot \frac{1}{k + rank_v(d)} + w_g \cdot \frac{1}{k + rank_g(d)} + w_b \cdot \frac{1}{k + rank_b(d)}
$$

---

## Entity enrichment

### `augmentWithEntityFacts`
Uses a MongoDB aggregation pipeline:
- `$match` selected entities by slug,
- `$lookup` relations by `source_slug` or `source_entity_id`,
- nested `$lookup` to resolve relation targets in `entities`,
- projects normalized `EntityFact` output.

### `scoreAndFilterEntityFacts`
Applies relevance scoring using:
- query overlap (`inQuery`, token overlap),
- presence in returned verses,
- relation count bonus,
- penalties for generic/auto-generated/noisy entities.

Then:
- keeps only positive facts,
- deduplicates by normalized name,
- trims relations and max returned facts.

---

## Caching

- **Embedding cache** (`embeddingCache`)
  - key: normalized query
  - reduces repeated OpenAI embedding calls
- **Retrieve cache** (`retrieveCache`)
  - key: query + search params + filters
  - accelerates repeated API requests

Both caches are in-memory TTL maps with max-size eviction.

---

## Important helpers

- `normalizeLoose`, `stripDiacritics`, `tokenizeQuery`: robust text normalization.
- `buildBookRegexes`, `buildTestamentRegex`: filter normalization.
- `containsNormalizedPhrase`: normalized phrase boundary matching.
- `dedupeRelations`: removes duplicate relation edges in output.
- `isGenealogyQuery`: detects kinship patterns in query string.
- `rerankByQueryOverlap`: lexical boosting for genealogy context.

---

## Weight presets (from Query Router)

| Intent | Vector | Graph | BM25 | k | Use Case |
|--------|--------|-------|------|---|----------|
| **THEOLOGY** | 0.63 | 0.07 | 0.30 | 5 | Thematic: "What does Bible say about faith?" |
| **GENEALOGY** | 0.15 | 0.70 | 0.15 | 6 | Kinship: "Father of Jacob?" |
| **GEOGRAPHY** | 0.30 | 0.30 | 0.40 | 8 | Places: "Abraham in Egypt?" |
| **CHRONOLOGY** | 0.35 | 0.40 | 0.25 | 8 | Timeline: "What happened after X?" |
| **GENERAL** | 0.48 | 0.12 | 0.40 | 5 | General fallback with lexical emphasis |

*Note: Kinship fast profile applied dynamically by router when direct kinship detected.*

---

## Optimization: Adaptive fanout & kinship fast profile

### Context
- **Genealogy queries** (`"fils de"`, `"son of"`, etc.) benefit from high graph weight but graph search is slow (~3–7s cold).
- **Theology/General queries** are fast with vector-only but GENERAL used to run full hybrid (added latency + noise).

### Solutions
1. **Kinship fast profile** (from Query Router):
   - Direct kinship patterns detected in `query-router.ts` → `isDirectKinshipQuestion`
   - Routes genealogy to `vectorWeight: 0.68, graphWeight: 0.17, bm25Weight: 0.15, k: 6` (fast)
   - Keeps BM25 limited while still reducing graph fanout pressure
   - Result: genealogy queries drop from 6.6s → ~2s cold, correct Genesis verses for Joseph query

2. **Intent-adaptive BM25 tuning**:
   - Added `"jesus"`, `"jésus"`, `"christ"`, `"messie"` to heuristic intent detection
   - `GENERAL` and `GEOGRAPHY` boost BM25 to `0.4`
   - `GENEALOGY` reduces BM25 to `0.15`
   - `THEOLOGY` uses balanced BM25 at `0.3`

3. **Genealogy lexical boost** (`rerankByQueryOverlap`):
   - If query looks genealogical, re-rank results by token overlap with query
   - Prioritizes verses mentioning query keywords (e.g., query "Joseph" → Genesis 46:19 ranked high)
   - Applied post-RRF fusion in retriever's `retrieve` method

---

## Recommended indexes

```javascript
db.verses.createIndex({ entity_slugs: 1 });
db.entities.createIndex({ slug: 1 }, { unique: true });
db.relations.createIndex({ source_slug: 1 });
db.relations.createIndex({ source_entity_id: 1 });
db.relations.createIndex({ target_slug: 1 });
db.relations.createIndex({ target_entity_id: 1 });
```

These indexes are required for stable latency and scalable graph enrichment.