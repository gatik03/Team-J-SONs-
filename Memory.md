# Memory.md — live progress log

Shared file. Append at every milestone; newest entry on top of each section. Keep it factual: only things actually run/verified go under "Working commands".

## Current state — 2026-10-23

- Planning docs, `openapi.yaml`, integration contracts and team split written. **No application code** (`backend/`, `frontend/`, `db/`, `docker-compose.yml` do not exist).
- Git initialised on `main`, **no commits yet**, **no remote** (`git remote -v` is empty). GitHub repo not created.
- **Stack switched to Node 22 + Express + TypeScript + Prisma + Zod + Vercel AI SDK v5** (`Decisions.md` ADR-0). Java/JDK is no longer needed on any machine; Node v22.22.3 and Docker 29.8.0 (present on the lead's machine) are the whole toolchain.
- Being added this session: `Preliminary_Design.md`, `Getting_Started.md`, `prompts/`. Nothing committed yet, no remote.
- Files referenced by `INITIAL_PROMPT.md` that do not exist yet: `docs/GUARDRAILS.md`, `docs/TEST_PROMPTS.md` (S2 owns both). Architecture lives in root `Architecture.md` + `Preliminary_Design.md`.
- `.gitignore` excludes `docs/full-stack/` and `docs/full-stack.zip` (original brief package), `.env`, build dirs.

## Files changed this session (2026-10-23)

Present in repo root after this session (`ls`):

```
.env.example  .gitignore  Architecture.md  CLAUDE.md  Component_Change_Manual.md
Demo_Runbook.md  Design.md  Flow.md  INITIAL_PROMPT.md  Integration_Contracts.md
Memory.md  README.md  REQUIREMENTS.md  Submission_Checklist.md  Team_Work_Split.md
openapi.yaml
docs/USECASE.md  docs/LoanLensAI_Hackathon_Usecase.docx  docs/full-stack/ (ignored)  docs/full-stack.zip (ignored)
```

Written by this (frontend/ops docs) pass: `Design.md`, `Component_Change_Manual.md`, `Demo_Runbook.md`, `Submission_Checklist.md`, `Memory.md`. `Architecture.md`, `Flow.md`, `README.md` were written by a parallel pass — see their own headers.

## Working commands

Verified on this machine: only `ls`, `git status`, `git remote -v`, `node --version`, `docker --version`. Nothing else has been run.

Planned (from `Team_Work_Split.md`, **unverified**):

| Planned command | Stream | Status |
|---|---|---|
| `docker compose up -d` | S1 | planned — no compose file yet |
| `cd backend && npm i && npx prisma migrate dev && npm run seed && npm run dev` | S1 | planned |
| `npm test` (`loanMath.test.ts`: 500000 @ 11% × 60 → 10871; `stateMachine.test.ts`) | S1 | planned |
| `curl localhost:8080/api/products` → 8 products | S1 | planned |
| `cd frontend && npm install && npm run dev` (`VITE_USE_MOCKS=true`) | S3 | planned |
| `npx vitest run` (`ApplicationWizard.test.tsx`, `RoleGuard.test.tsx`) | S3 | planned |
| `npm run ingest`; `npm test` (`piiMasker.test.ts`, `retriever.test.ts`, `permissionGuard.test.ts`, `orchestrator.test.ts`) | S2 | planned |
| `gh pr create --base main --title "S1 phase 1: skeleton"` | all | planned — needs remote |

## Known bugs / blockers

- None (no code). Blockers: no GitHub remote.
- Risks to watch:
  - NVIDIA NIM free-tier **tool-calling reliability** for the Module 3 orchestrator (Gemini fallback via env; fallback JSON per `Demo_Runbook.md` §4).
  - Embedding dimensions **fixed at 768** (`LL_EMBED_DIMENSIONS`, Gemini `gemini-embedding-001` via `@ai-sdk/google`, vectors normalised in code). Changing the embedding model later means a new PgVector column/migration and full re-ingest.
  - Embeddings are an API call: search and `npm run ingest` need internet and `LL_EMBED_API_KEY` (a Gemini key, needed even if chat uses NVIDIA); Gemini free-tier rate limits. Query-time embedding failure → `AI_UNAVAILABLE` 503.
  - `INITIAL_PROMPT.md` tells sessions to read `Rules.md` / `Phases.md` / `Flow.md` — sessions will stall or hallucinate if those files are missing when they start.

## Branch status

- `main`: no commits, no remote. Feature branches `feat/s1-core`, `feat/s2-ai`, `feat/s3-frontend` not created.
- First action for the lead: create the GitHub repo, `git add -A && git commit -m "docs: planning, contracts, openapi"`, `git remote add origin …`, `git push -u origin main`.

## Next steps per session

- **S1 (backend-core) phase 1**: Express + TypeScript skeleton (`src/app.ts`, `config/env.ts`), `backend/prisma/schema.prisma` + `npx prisma migrate dev`, `backend/prisma/seed.ts`, `docker-compose.yml` (Postgres + PgVector), JWT login for the 5 seeded users (`common/auth.ts`), `/api/auth/me`, `common/errors.ts` envelope, `core/emi/loanMath.ts` + `/api/emi/calculate` + `loanMath.test.ts`, `docs/SETUP.md`. PR "S1 phase 1: skeleton".
- **S2 (backend-ai) phase 1**: AI SDK OpenAI-compatible provider from `LL_AI_*` (`ai/config/llm.ts`), Gemini embeddings via `@ai-sdk/google` (`ai/rag/embeddings.ts`, 768 dims), pgvector `$queryRaw` retriever (`ai/rag/retriever.ts`), ingestion (`npm run ingest`, PDF/MD/CSV/JSON) with section-aware chunking + metadata, latest-effective-version retrieval, `maskPii()` in `ai/masking/piiMasker.ts` (prompt + pino), `/api/policy/ask`, knowledge docs in `db/knowledge/` (8 types, one in two versions), stubs under `ai/stub/`. PR "S2 phase 1: RAG".
- **S3 (frontend) phase 1**: Vite + React 19 + TS + Router + TanStack Query + Tailwind; Tailwind v4 `@theme` tokens in `frontend/src/styles/tokens.css` from `Design.md` §2–4 (no separate Tailwind config file); `src/api/types.ts` from `openapi.yaml`; MSW handlers from openapi examples; Login, AppLayout/Nav, RoleGuard (+test), Catalogue, Compare, Product detail + EMI calculator/table. Then refresh paths in `Component_Change_Manual.md`. PR "S3 phase 1: shell".
- **All**: fill the blank "Person" column in `Team_Work_Split.md`; write `docs/ASSUMPTIONS.md` as assumptions are made.

## Handoff notes

- The brief (`docs/USECASE.md`) wins over every other file; JSON field names are verbatim law (`openapi.yaml` schemas `AdvisorResponse`, `PolicyAnswer`, `AgentRecommendation`).
- Numbers (EMI, amortization, obligation ratio) only in `backend/src/core/emi/loanMath.ts`; frontend never computes money.
- `Demo_Runbook.md`, `Component_Change_Manual.md`, `Submission_Checklist.md` contain `TODO(after S3 phase N)` placeholders and `grep -n` anchors instead of line numbers — S3 refreshes them after each phase; the demo is rehearsed on tag `v0.1-demo`.
- Shared files (`openapi.yaml`, contracts, `.env.example`, `README.md`, `Memory.md`, `Demo_Runbook.md`) change only via a PR titled `contract: …`.


## 2026-10-23 — Judge feedback after deck
- Judge asked how RAG gets updated policies + version control. Added POLICY_ADMIN role and versioned policy lifecycle (Integration_Contracts §8a, ADR-18, REQUIREMENTS X-1). openapi.yaml updated and validated. S1/S3 prompts being updated; S2 prompt and judge docs next.
