## Search Engine

Next.js search and chat application for the Bible RAG + knowledge-graph stack.

## Getting Started

Install dependencies and start the app:

```bash
npm install
npm run dev
```

The app runs on http://localhost:3000.

Copy `env.example` to `.env.local` and set at least one runtime provider:

- `GITHUB_TOKEN` for GitHub Models / Copilot
- `OPENAI_API_KEY` for OpenAI
- `GEMINI_API_KEY` for Gemini
- `OLLAMA_BASE_URL` for a local OpenAI-compatible endpoint such as Ollama

The runtime provider factory supports per-surface selection and fallback via env vars:

- `LLM_DEFAULT_PROVIDER`
- `LLM_CHAT_PROVIDER`
- `LLM_ROUTER_PROVIDER`
- `LLM_GROUNDED_ANSWER_PROVIDER`
- `LLM_EXTRACTION_PROVIDER`
- `LLM_FALLBACK_ORDER_CHAT`
- `LLM_FALLBACK_ORDER_ROUTER`
- `LLM_FALLBACK_ORDER_GROUNDED_ANSWER`
- `LLM_FALLBACK_ORDER_EXTRACTION`

Model overrides are available through `LLM_CHAT_MODEL`, `LLM_ROUTER_MODEL`, `LLM_GROUNDED_ANSWER_MODEL`, and `LLM_EXTRACTION_MODEL`.

## Validation

```bash
npm run test:run
```

## Notes

- Embeddings still use `OPENAI_API_KEY`.
- Chat responses must stay in AI SDK UI-message stream format.
- Extraction scripts use the same provider factory and fallback policy as runtime paths.
