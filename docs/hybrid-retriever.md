# hybrid-retriever.ts

## Purpose
`src/lib/hybrid-retriever.ts` provides a **hybrid Bible search** that combines:

- vector search (semantic similarity with OpenAI embeddings + MongoDB vector index),
- graph search (entity-driven retrieval with `entity_slugs`),
- BM25 search (lexical relevance via Meilisearch),
- rank fusion (RRF) to merge both result sets.

It returns:
- ranked verses,
- related entity facts,
- metadata about search weights and result counts.

---

## Main flow (`retrieve`)

1. Build a cache key from query + parameters.
2. Return cached payload if available (`retrieveCache`).
3. Apply **adaptive fanout**:
   - If `vectorWeight <= 0.1`: skip vector search entirely (resolve to empty).
   - If `graphWeight <= 0.1`: skip graph search entirely (resolve to empty).
   - If `bm25Weight <= 0.05`: skip BM25 search entirely (resolve to empty).
   - Otherwise: use fanout multipliers:
     - `vectorSearchK = (vectorWeight <= 0.15) ? max(4, k) : k * 2`
     - `graphSearchK = (graphWeight >= 0.7) ? max(k + 2, 8) : k * 2`
     - `bm25SearchK = (bm25Weight >= 0.35) ? max(k + 3, 10) : k * 2`
4. Run in parallel (both or single-sided):
   - `vectorSearch(query, vectorSearchK, filters)`
   - `graphSearch(query, graphSearchK, filters)`
   - `bm25Search(query, bm25SearchK, filters)`
5. Merge both lists using `reciprocalRankFusion(...)`.
6. Keep top `k` verses above `minScore`.
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

### 3) Fusion: `reciprocalRankFusion`
- Combines vector + graph + BM25 rankings with configurable weights:
  - `vectorWeight`
  - `graphWeight`
   - `bm25Weight`
- Produces final hybrid score and source `"hybrid"`.

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
| **THEOLOGY** | 0.63 | 0.07 | 0.30 | 5 | Thematic: "Que dit la Bible sur la foi ?" |
| **GENEALOGY** | 0.15 | 0.70 | 0.15 | 6 | Kinship: "Qui est le fils de Jacob ?" |
| **GEOGRAPHY** | 0.30 | 0.30 | 0.40 | 8 | Places: "Abraham en Egypte ?" |
| **CHRONOLOGY** | 0.35 | 0.40 | 0.25 | 8 | Timeline: "Que se passe-t-il apres X ?" |
| **GENERAL** | 0.48 | 0.12 | 0.40 | 5 | Fallback balanced profile |

*Note: direct kinship fast profile is applied dynamically as `0.68/0.17/0.15`.*

---

## Optimization: Adaptive fanout & kinship fast profile

### Context
- **Genealogy queries** (`"fils de"`, `"son of"`, etc.) still benefit from graph-heavy routing.
- **Theology queries** (`gw=0.07`) usually skip graph due adaptive fanout threshold (`gw <= 0.1`).

### Solutions
1. **Kinship fast profile** (from Query Router):
   - Direct kinship patterns detected in `query-router.ts` → `isDirectKinshipQuestion`
   - Routes genealogy to `vectorWeight: 0.68, graphWeight: 0.17, bm25Weight: 0.15, k: 6` (fast)
   - Keeps graph active (`gw=0.17`) while reducing graph dominance/noise
   - Result: genealogy queries drop from 6.6s → ~2s cold, correct Genesis verses for Joseph query

2. **THEOLOGY weight bump + Christology keywords** (from Query Router US-009 refinement):
   - Added `"jesus"`, `"jésus"`, `"christ"`, `"messie"` to heuristic intent detection
   - Current defaults use BM25-aware profiles (THEOLOGY `0.63/0.07/0.30`, GENERAL `0.48/0.12/0.40`)
   - Keeps lexical recall while reducing graph overhead for theology

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