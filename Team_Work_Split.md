# Team Work Split — 3 parallel sessions on 3 machines, via GitHub

Split is **by layer**, not by module, so no two people touch the same directory.

| Session | Person | Branch | Owns (exclusive) | Must NOT edit |
|---|---|---|---|---|
| **S1 backend-core** | ___ | `feat/s1-core` | `backend/src/{core,common,config}/**`, `backend/src/{index,app}.ts`, `backend/package.json`, `backend/prisma/**`, `docker-compose.yml`, `docs/SETUP.md` | `backend/src/ai/**`, `frontend/**`, `db/knowledge/**` |
| **S2 backend-ai** | ___ | `feat/s2-ai` | `backend/src/ai/**`, `db/knowledge/**`, `docs/GUARDRAILS.md`, `docs/TEST_PROMPTS.md` | `backend/src/{core,common,config}/**`, `frontend/**`. Prisma schema: S2 may append ONLY the `KbDocument`, `KbChunk`, `AgentRun`, `AuditEvent` models (bottom of `schema.prisma`, marked `// S2`) and run `prisma migrate dev --name s2_*` |
| **S3 frontend** | ___ | `feat/s3-frontend` | `frontend/**`, `Component_Change_Manual.md`, `Design.md` | anything under `backend/`, `db/` |
| Shared (PR only) | all | — | `openapi.yaml`, `Integration_Contracts.md`, `.env.example`, `backend/package.json` deps, `README.md`, `Memory.md`, `Demo_Runbook.md`, `Judge_QA_Playbook.md` | see §10 of Integration_Contracts |

Phase 3 integration/demo duties (no S4): S1 = `docker compose up` on clean machine + SETUP; S2 = test prompts + guardrails note; S3 = demo runbook + judge cheatsheet.

## S1 — backend-core deliverables (REQUIREMENTS IDs)

- Express + TS skeleton (`app.ts`, `index.ts`, `config/env.ts`), Prisma schema + migration, Postgres+pgvector compose, JWT auth, roles (M1-4, M1-8, B-1..B-5)
- `loanMath.ts` + `/api/emi/calculate` with amortization (M1-3, M3-9)
- Products: list/search/filter/sort/compare (M1-1, M1-2, B-3)
- Applications: draft/save/submit/decision, status timeline (M1-5, M1-7, B-4)
- Document upload to local disk `backend/uploads/` (M1-6)
- `common/errors.ts` errorHandler + Zod on every route (D-6)
- Seed: 8 products (2 per type, incl. `VL-204 Kestrel Pre-Owned Car Loan` 11 %), 5 users, 2 sample applications incl. one `LA-2026-00418`-style with missing address proof (D-8)
- Tests (Vitest): `loanMath.test.ts` (EMI 500000 @ 11 % × 60 = 10871), `stateMachine.test.ts`, one supertest route test
- **DoD**: `docker compose up -d && npm run dev` → `curl /api/products` returns 8; login works; brief's EMI number matches.

## S2 — backend-ai deliverables

- Vercel AI SDK `createOpenAICompatible` provider (NVIDIA NIM default, Gemini by env), Gemini embeddings, pgvector via Prisma raw SQL (M2-3)
- Ingestion for PDF/MD/CSV/JSON, section-aware chunking by heading, metadata (M2-1, M2-2, B-6)
- Retrieval with metadata filter + latest-effective-version rule (M2-4, M2-5, M2-10)
- `policyAssistant.ts` grounded answer, safe not-found, `maskPii()` in prompts + pino (M2-6..M2-9)
- `advisorService.ts` structured output via `generateObject` + zod, EMI from `loanMath.ts`, clarifying question (M1-10..M1-16)
- 5 agents + `mockTools.ts` + `permissionGuard.ts` + `auditService.ts` + HITL rule (M3-1..M3-14, G-1..G-4)
- Knowledge docs in `db/knowledge/` (M2-K1..K9, one doc in two versions)
- Tests: `piiMasker.test.ts`, `retriever.test.ts` (latest version), `permissionGuard.test.ts`, `orchestrator.test.ts` (brief's missing-address-proof scenario → `REQUEST_ADDITIONAL_DOCUMENTS`, LLM mocked)
- **DoD**: the 5 brief RAG questions answer with sources; the used-car advisor query returns VL-204 / 60 months / 10871; workflow on the seeded application returns the brief's shape.

- **X-1 Policy Admin API** (`ai/rag/policyAdmin*.ts` + routes under `/api/admin/policies`): versions, preview, test-ask, publish, retire, query-time version-in-force in `retriever.ts`, `POLICY_*` audit events; tests for scheduled / retired / draft never served

## S3 — frontend deliverables

- Vite + React 19 + TS + React Router + TanStack Query + Tailwind; MSW mocks from `openapi.yaml` examples (M1-9)
- Screens: Login; Catalogue (search/filter/sort/compare); Product detail + EMI calculator with amortization table; Advisor chat; Policy assistant chat with sources; Profile; 4-step application wizard with save-as-draft + uploads; Status tracker timeline; Officer queue; Analyst review page (checks table, audit trail viewer, approve/reject with reason)
- Role-based nav guard (M1-8), now 4 roles incl. POLICY_ADMIN
- **X-1 Policy Admin console**: library, upload new version, version detail (timeline, preview, test-ask, publish, retire)
- Responsive at 375 / 768 / 1280 px; keyboard focus; labels (M1-9)
- Tests: `ApplicationWizard.test.tsx`, `RoleGuard.test.tsx` (numbers come from the API, none computed in the browser)
- `Component_Change_Manual.md` with real paths/line numbers once components exist
- **DoD**: `npm run dev` with mocks shows every screen; with `VITE_USE_MOCKS=false` against S1+S2 the two brief scenarios run end to end.

## Git workflow (each person, own machine)

```bash
# once
git clone git@github.com:<org>/loanlens-ai.git && cd loanlens-ai
cp .env.example .env            # put your NVIDIA / Gemini key in LL_AI_API_KEY
git checkout -b feat/s1-core    # or feat/s2-ai / feat/s3-frontend

# every 30–60 min
git add -A && git commit -m "M1-3: EMI calculator with amortization"
git pull --rebase origin main   # pick up merged contract changes
git push -u origin feat/s1-core

# when a phase's DoD passes
gh pr create --base main --title "S1 phase 2: core APIs" --body "REQ IDs: M1-1..M1-7. Verified: <commands>"
# teammate reviews (skim + run), then:
gh pr merge --squash
# everyone else:
git checkout main && git pull && git checkout - && git rebase main
```

Rules: never force-push `main`; never commit `.env`; never commit a file you don't own without a `contract:` PR; if your branch is more than a phase behind `main`, rebase before writing more code. Finishing touches after all three merge happen directly on `main` in short commits.

## Dependencies between sessions

| Needs | From | Until then |
|---|---|---|
| S2 needs `loanMath.ts`, `transition()`, product/customer queries | S1 phase 1 | S2 codes against the TS signatures in Integration_Contracts §6 with in-memory stubs under `ai/stub/` (deleted at integration) |
| S3 needs every endpoint | S1 + S2 | MSW mocks |
| S1 needs nothing from others | — | — |

Integrate at the end of each phase, not at the end of the hackathon.
