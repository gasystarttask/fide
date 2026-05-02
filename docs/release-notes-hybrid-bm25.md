# Release Notes: Hybrid Retrieval with BM25

## Summary
This release introduces a three-way hybrid retriever that fuses:
- Vector search (DocumentDB)
- Graph search (entity relations)
- BM25 full-text search (Meilisearch)

## Highlights
- Added Meilisearch infrastructure and index bootstrap scripts
- Added indexing scripts for verses and entities
- Implemented RRF-3 weighted fusion with normalized weights
- Added adaptive bm25Weight tuning by query intent
- Added grounded-answer API support for disableBM25 A/B testing
- Added BM25 graceful degradation with circuit breaker fallback

## Performance targets
- BM25 query target: <100ms
- Combined hybrid query target: <300ms
- Hybrid + fusion p95 target: <350ms

## API changes
- No breaking changes
- New optional request field:
  - bm25Weight in hybrid and grounded-answer request contracts
- New optional query parameter:
  - disableBM25=true on grounded-answer endpoint

## Migration
- Run docker compose with Meilisearch service enabled
- Execute npm run reindex:meilisearch after deploy
- If Meilisearch is unavailable, the system automatically falls back to vector+graph

## Rollback
- Set SKIP_MEILISEARCH=true to disable BM25 without redeploying code
- Keep existing vector+graph path active
