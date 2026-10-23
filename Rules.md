# Rules — coding standards (hackathon-weight, not product-weight)

## Backend (Node 22 + Express + TypeScript)
- Strict TS (`"strict": true`, no `any`), ESM, run with `tsx`. Folder-by-feature: `src/{common,config,core/<feature>,ai/<feature>}` with `router.ts` (HTTP only), `service.ts` (logic), `schemas.ts` (zod). No logic in routers.
- **All money math lives in `core/emi/loanMath.ts`.** Integer rupees, percent rates as numbers, `Math.round` to the rupee. The LLM never computes a number.
- Every body/query/params is parsed with Zod (`Schema.parse`) before use. All errors go through `common/errors.ts` (`AppError`, `errorHandler`) and return the envelope in `Integration_Contracts.md` §3. Never swallow errors; LLM/endpoint failures → `AI_UNAVAILABLE` 503. Async routes are wrapped (`express-async-errors` or a `wrap()` helper).
- Roles via `requireAuth` then `requireRole('CREDIT_ANALYST')`; the decision endpoint is analyst-only; agents have no code path to it.
- Prisma: models in `prisma/schema.prisma`, `@@map` to snake_case, every change through `prisma migrate dev --name <req-id>`. pgvector column is `Unsupported("vector(768)")`; similarity via `$queryRaw`.
- PII: `maskPii()` from `ai/masking/piiMasker.ts` on every prompt string and every audit payload; wired into the pino logger so logs are masked too.
- Uploads: multer, pdf/jpg/png, ≤ 5 MB, stored under `backend/uploads/`, filename randomised.
- CORS allowlist `http://localhost:5173`. Secrets only via env (`LL_*`, `DATABASE_URL`) parsed once in `config/env.ts`. Never commit `.env`.

## React / TypeScript (frontend)
- Function components, strict TS, no `any`. Types in `src/api/types.ts` mirror `openapi.yaml` field-for-field.
- One hook per endpoint in `src/api/` (`useProducts`, `useEmi`, …) using TanStack Query. No money math in the browser; display what the API returns.
- Styling via Tailwind + tokens in `src/styles/tokens.css`; no inline hex colours. Components under `src/components/<area>/`.
- Mocks only in `src/mocks/handlers.ts`, toggled by `VITE_USE_MOCKS`; never demoed as real.
- Every form field has a label; focus visible; chat panel uses `aria-live="polite"`.

## Approved libraries (ask in team chat before adding anything else)
Backend: express 4, zod, prisma + @prisma/client, pgvector (npm, for `toSql`), jsonwebtoken, multer, pino + pino-pretty, cors, ai (v5) + @ai-sdk/openai-compatible + @ai-sdk/google (embeddings), pdf-parse, csv-parse, dotenv, tsx, typescript, vitest, supertest.
Frontend: react 19, react-dom, react-router, @tanstack/react-query, tailwindcss v4 + @tailwindcss/vite, @vitejs/plugin-react, @fontsource-variable/inter, msw, lucide-react, vitest, jsdom, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event.

## Naming, git, tests
- Naming: `Integration_Contracts.md` §1. Branches `feat/sN-*`, commits `<REQ-ID>: summary`, squash-merge PRs.
- Minimum tests: `loanMath.test.ts`, `stateMachine.test.ts`, `piiMasker.test.ts`, `retriever.test.ts`, `permissionGuard.test.ts`, `orchestrator.test.ts` (LLM mocked with `vi.mock`); FE `ApplicationWizard.test.tsx`, `RoleGuard.test.tsx`. Run: `npm test` in `backend/` and `frontend/`.
- Don't tick a REQUIREMENTS.md box without running it.
