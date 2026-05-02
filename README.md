# Bible Chat Scholar

[![Release](https://img.shields.io/github/v/release/gasystarttask/bible-sg?display_name=tag)](https://github.com/gasystarttask/bible-sg/releases)
[![Security](https://img.shields.io/github/issues-search/gasystarttask/bible-sg?query=is%3Aopen+label%3Asecurity&label=security%20issues)](https://github.com/gasystarttask/bible-sg/issues?q=is%3Aopen+label%3Asecurity)
[![Code Quality](https://img.shields.io/github/actions/workflow/status/gasystarttask/bible-sg/search-engine-openapi.yml?label=code%20quality)](https://github.com/gasystarttask/bible-sg/actions/workflows/search-engine-openapi.yml)

Bible Chat Scholar is a ~~proof-of-concept~~ Bible AI engine using hybrid retrieval (vector embeddings + knowledge graph + BM25 full-text) for grounded biblical answers.

## What it includes

- XML → JSON parsing pipeline
- Verse embedding/vectorization pipeline
- Semantic Search API in Next.js
- Hybrid retriever with vector + graph + BM25 fusion
- Grounded-answer streaming API with citation enforcement

## Architecture diagram

![Bible Chat Scholar Architecture](./docs/images/architecture-en.png)

## Tech stack

- Next.js (App Router, TypeScript)
- DocumentDB / Mongo-compatible vector search
- Meilisearch (BM25 full-text search)
- OpenAI embeddings (`text-embedding-3-small`)
- LangChain

## Quick start

1. Install dependencies
2. Start local services (`docker compose -f services/compose.yml up -d`)
3. Configure environment variables (`DATABASE_URL`, `OPENAI_API_KEY`, `MEILISEARCH_URL`, `MEILISEARCH_API_KEY`, etc.)
4. Index Meilisearch data (`npm run reindex:meilisearch` from `search-engine`)
5. Run app and pipelines as needed

## Documentation references

- [Docs folder](./docs)
- [Roadmap](./docs/roadmap.md)
- [User Story: US-003 Semantic Search API](./docs/user-stories/us-003-semantic-search-api.md)

## Licensing

- **Code**: [MIT License](`./LICENSE`)
- **Data**: [CC0-1.0](`./DATA_LICENSE.md`), source: https://github.com/christos-c/bible-corpus