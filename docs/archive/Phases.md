> Historical development reference. Current submission guide: [SUBMISSION.md](../SUBMISSION.md). Statements about planned or pending work reflect an earlier stage.

# Phases

| Phase | Hours | S1 core | S2 AI | S3 frontend | Merge point |
|---|---|---|---|---|---|
| P0 bootstrap | done | docs, openapi, contracts (this repo) | | | push `main` |
| P1 skeleton | 0–5 | Express app + Prisma schema/migration + compose + JWT login + `loanMath.ts` + `/api/emi/calculate` + `errors.ts` | AI SDK provider + Gemini embeddings (`@ai-sdk/google`) + pgvector retriever + ingest MD/PDF/CSV/JSON + section chunking + metadata + `/api/policy/ask` + `maskPii` + knowledge docs | Vite shell + types + login + RoleGuard + catalogue + EMI calculator (MSW) | PR each → main |
| P2 features | 5–14 | products search/filter/sort/compare, profile, applications draft/save/submit/decision + timeline, uploads, seed (8 products, 5 users, LA-2026-00418) | `/api/advisor/chat` structured output + clarifying question; latest-version rule; audience filter | advisor chat, policy chat + sources, profile, 4-step wizard + save-draft + upload, status tracker | PR each → main; S2 deletes stubs |
| P3 agents + integrate | 14–24 | compose on a clean machine, `docs/SETUP.md`, fix integration bugs | 5 agents, `mockTools.ts`, `permissionGuard.ts`, audit trail, HITL, `/api/workflow/.../run` | officer queue, analyst review (checks, audit viewer, decide), responsive pass, `Component_Change_Manual.md` real line numbers | `VITE_USE_MOCKS=false` end-to-end on main |
| P4 polish + demo | 24–32 | `prisma/seed.ts` final, README | `docs/GUARDRAILS.md`, `docs/TEST_PROMPTS.md` | UI polish, a11y, cheatsheet refresh | tag `v0.1-demo`, rehearse `Demo_Runbook.md` |

## Acceptance + verify commands

**P1**
```bash
docker compose up -d && cd backend && npm i && npx prisma migrate dev && npm run seed && npm test && npm run dev
curl -s -X POST localhost:8080/api/emi/calculate -H 'content-type: application/json' -d '{"principal":500000,"annualRate":11.0,"tenureMonths":60}' | grep '"emi":10871'
curl -s -X POST localhost:8080/api/auth/login -H 'content-type: application/json' -d '{"username":"priya.sharma","password":"password"}'   # token + role
curl -s -X POST localhost:8080/api/policy/ask -H "authorization: Bearer $T" -H 'content-type: application/json' -d '{"question":"Can I foreclose my vehicle loan after six months, and are there any charges?"}'   # answer + sources[].version
cd frontend && npm test && npm run dev   # login, catalogue, EMI table visible at 375 px
```
**P2**
```bash
curl -s "localhost:8080/api/products?loanType=VEHICLE&sort=rate_asc" | grep VL-204
curl -s -X POST localhost:8080/api/advisor/chat -H "authorization: Bearer $T" -H 'content-type: application/json' -d '{"message":"I need ₹5 lakh for a used car. I earn ₹60,000 per month and want an EMI below ₹12,000."}'   # VL-204, tenureMonths 60, estimatedEmi 10871
curl -s -X POST localhost:8080/api/advisor/chat ... -d '{"message":"I want a loan"}'   # clarifyingQuestion != null
# wizard: create draft → reload → draft restored → upload identity+income → submit → tracker shows SUBMITTED
```
**P3**
```bash
curl -s -X POST localhost:8080/api/workflow/applications/LA-2026-00418/run -H "authorization: Bearer $OFFICER"   # recommendation REQUEST_ADDITIONAL_DOCUMENTS, missingDocuments ["Address proof"], requiresHumanApproval true
curl -s localhost:8080/api/audit/$AUD -H "authorization: Bearer $OFFICER" | grep -c TOOL_CALL   # ≥ 3, and a PERMISSION_DENIED event in the demo scenario
# customer role asking a question only in the officer playbook → safe not-found answer
```
**P4**: every REQUIREMENTS.md box ticked with evidence; `Submission_Checklist.md` complete; demo rehearsed twice under 8 min.

## Dependencies
S2 phase 1 needs nothing from S1 (uses stubs). S2 phase 2–3 need S1 phase 1–2 merged. S3 needs nothing until P3 integration. If behind schedule, cut in this order: compare view → Customer Communication Agent (fold into Orchestrator) → CSV/JSON ingestion (keep MD/PDF) → dark mode.
