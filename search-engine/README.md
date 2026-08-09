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

- `GEMINI_API_KEY` for Gemini
- `OPENAI_API_KEY` for OpenAI
- `GITHUB_TOKEN` for GitHub Models / Copilot
- `OLLAMA_BASE_URL` for a local OpenAI-compatible endpoint such as Ollama

The default runtime configuration targets Gemini first with `gemini-2.5-flash` for chat, router, grounded answer, and extraction. Override any surface with the per-purpose provider and model env vars if you need a different deployment profile.

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

## PR preview deployments (Vercel)

`.github/workflows/search-engine-vercel-preview.yml` deploys a Vercel preview
on every PR that touches `search-engine/**`, comments the preview URL on the
PR (updating the same comment on subsequent pushes), and removes the
deployment + updates the comment when the PR is closed.

One-time setup — add these as repository secrets (Settings → Secrets and
variables → Actions):

| Secret | Where to get it |
|---|---|
| `VERCEL_TOKEN` | Vercel account → Settings → Tokens |
| `VERCEL_ORG_ID` | `.vercel/project.json` after running `vercel link` locally once, or Vercel project → Settings → General |
| `VERCEL_PROJECT_ID` | Same as above |

Run `vercel link` from `search-engine/` once locally to create the Vercel
project and populate `.vercel/project.json` with these IDs (the `.vercel/`
folder itself is gitignored and shouldn't be committed).

## Validation

```bash
npm run test:run
```

## Notes

- Embeddings still use `OPENAI_API_KEY`.
- Chat responses must stay in AI SDK UI-message stream format.
- Extraction scripts use the same provider factory and fallback policy as runtime paths.
