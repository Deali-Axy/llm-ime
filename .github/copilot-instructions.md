# Copilot Instructions for llm-ime

## Project Overview

A local-LLM-powered Chinese Pinyin IME engine. Uses node-llama-cpp to run GGUF models locally and scores candidates by real-time LLM probability, rather than N-gram word frequency. Provides a Web Dashboard (React + Vite) and an experimental RIME frontend for Windows Weasel.

## Repository Structure

pnpm monorepo managed by Turbo:

- `apps/server/` — Hono HTTP API + LLM inference engine (Node.js + tsx, ESM)
- `apps/web/` — Dashboard frontend (React 19 + Vite + TanStack Router)
- `packages/ui/` — Shared shadcn/ui component library (Tailwind CSS v4)
- `rime/` — Windows Weasel RIME configuration (Lua scripts, YAML)
- `scripts/` — Model download and RIME install helper scripts

## Commands

```bash
# Install dependencies
pnpm install

# Development (run in two terminals)
pnpm run server:dev      # tsx --watch, listens on :5000
pnpm run web:dev         # Vite dev server on :5173, proxies /api → :5000

# Production
pnpm run web:build       # tsc + vite build → apps/web/dist/
pnpm run server          # serves API + static files on :5000

# Type checking
pnpm run typecheck                               # all packages via Turbo
cd apps/server && ./node_modules/.bin/tsc --noEmit   # server only
pnpm --filter web run typecheck                  # web only

# Lint / format
pnpm run lint            # ESLint via Turbo
pnpm run format          # Prettier for all TS/TSX files
```

> Before submitting, ensure `pnpm run web:build` and `tsc --noEmit` pass. There is no automated test suite.

## Architecture

### Single-process server

LLM inference and HTTP serving run in the same Node.js process. There is no separate daemon or IPC. The server also serves the built web frontend as static files.

### Hono RPC type-sharing (critical pattern)

`apps/server/api-type.ts` defines **virtual routes** that are never executed — they exist only for `hc<AppType>()` type inference. It must only import `hono`, `zod`, and pure-type modules (never `node-llama-cpp` or heavy deps).

The web app references it via workspace alias: `import type { AppType } from "@workspace/server/api-type"`. The client is created as `hc<AppType>("/")` in `apps/web/src/lib/api.ts`.

**Adding a new API endpoint** — follow this 4-step flow in order:
1. `apps/server/runtime/types.ts` — add request/response types
2. `apps/server/api-type.ts` — add a virtual route with `zValidator` for type inference
3. `apps/server/main.ts` — add the real route implementation
4. `apps/web/src/lib/api.ts` — add the typed client call (types are inferred automatically)

### Engine layer hierarchy

```
ImeSessionManager   ← top-level, manages per-client sessions and their commit history
  └─ EngineService  ← business logic, input logging, user word persistence, ExclusiveRunner queue
       └─ ImeEngine ← raw LLM inference, token–pinyin index, candidate scoring
```

- All engine operations are serialized through `ExclusiveRunner` because `node-llama-cpp` does not support concurrent inference.
- **Session isolation**: The Web Dashboard uses the hardcoded `"web-default"` session. RIME clients get unique `sessionId`s. Switching to a new session replays that session's commit history via `EngineService.restoreHistory()`.
- **Context trimming**: `ImeEngine` auto-trims the LLM context when it approaches the model's context window limit, re-encoding to maintain coherence.

### Frontend routing

TanStack Router is configured **code-based** (not file-based) in `apps/web/src/router.tsx`. All routes are registered there explicitly. The path alias `@/` maps to `apps/web/src/`.

## Key Conventions

### Commit messages
Use Conventional Commits: `feat:`, `fix:`, `refactor:`, etc.

### Environment variables
All config is read from `.env` (via process.env) or system env vars; system env vars take priority. Supported vars:

| Variable | Default | Purpose |
|---|---|---|
| `LLM_IME_MODEL_PATH` | sibling `Qwen3-0.6B-GGUF/` dir | GGUF model file path |
| `LLM_IME_PORT` / `PORT` | `5000` | Server port |
| `LLM_IME_HOST` / `HOST` | `127.0.0.1` | Server bind address |
| `LLM_IME_SHARED_SECRET` | (empty) | Bearer token for `/api/ime/*` |
| `LLM_IME_SESSION_TTL_MS` | `900000` | IME session idle timeout (ms) |

### Error handling in the server
Throw `EngineServiceError(message, httpStatus)` for known errors; `main.ts`'s `onError` handler converts it to the appropriate HTTP response. For Hono route handlers, `HTTPException` is also accepted directly.

### Zod validation
All POST request bodies are validated with `zValidator("json", schema)` middleware. Schemas are defined inline in `main.ts` (real routes) and mirrored in `api-type.ts` (type-only routes).

### UI components
New shared components go in `packages/ui/src/`. Per-app components go in `apps/web/src/components/`. The UI package uses shadcn/ui conventions (`components.json` present).
