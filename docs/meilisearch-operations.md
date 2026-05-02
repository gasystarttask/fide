# Meilisearch Operations Guide

## Overview
This guide covers operational procedures for the BM25 Meilisearch layer used by hybrid retrieval.

## Service health checks
- HTTP health endpoint: GET /health
- Compose healthcheck is configured in services/compose.yml
- App-level check: ensureMeilisearchIndexes + checkMeilisearchHealth in search-engine/src/lib/meilisearch-client.ts

## Reindexing
1. Start services:
   - docker compose -f services/compose.yml up -d
2. Run full reindex:
   - cd search-engine
   - npm run reindex:meilisearch
3. Validate document counts:
   - verses_bm25 should contain ~31k+ verses
   - entities_bm25 should contain extracted entities and aliases

## Scheduled reindex recommendation
- Trigger full reindex after:
  - processed_bible.json updates
  - raw_graph.enrich.json updates
  - production deployments with data migrations
- Suggested cadence:
  - nightly in staging
  - release-triggered in production

## Backup and restore
- Data volume: meilisearch-data in services/compose.yml
- Backup approach:
  - stop writes
  - snapshot meilisearch-data volume
- Restore approach:
  - restore volume snapshot
  - rerun npm run reindex:meilisearch for consistency if needed

## Capacity and growth
- Expected current index size: ~100-200MB combined
- Growth drivers:
  - additional Bible versions
  - entity alias expansion
  - extra searchable attributes
- Monitor:
  - disk usage of meilisearch-data volume
  - p95 latency of BM25 and fused hybrid requests

## Failure handling and recovery
- Application graceful degradation:
  - BM25 errors are caught; retrieval falls back to vector+graph.
  - Circuit breaker disables BM25 for 5 minutes after 3 consecutive failures.
- Manual emergency toggle:
  - set SKIP_MEILISEARCH=true
- Recovery steps:
  1. check /health
  2. inspect container logs
  3. verify API key and URL env vars
  4. run reindex if index corruption suspected

## Common troubleshooting
- Symptom: BM25 returns empty hits
  - Confirm indexes exist (verses_bm25, entities_bm25)
  - Confirm documents were indexed
- Symptom: connection refused
  - Verify compose service is up and port 7700 is reachable
- Symptom: unauthorized
  - Verify MEILISEARCH_API_KEY matches configured master key
- Symptom: stale lexical results
  - rerun npm run reindex:meilisearch
