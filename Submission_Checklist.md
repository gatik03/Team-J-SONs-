# Submission Checklist — LoanLens AI

Shared file (PR only). Tick only with evidence (a path, URL, command output or screenshot name). Everything is unticked on 2026-10-23 because no code exists yet.

## A. The brief's "Deliverables" (docs/USECASE.md, section Deliverables)

| Done | Deliverable (brief wording) | Where | Evidence |
|---|---|---|---|
| [ ] | Working application and source code | GitHub repo URL: `TODO` ; `docker compose up` + `SETUP.md` steps | Clean-clone run log (see C-4) |
| [ ] | Architecture diagram and solution overview | `Architecture.md` (Mermaid diagram + overview) + `Preliminary_Design.md` | File exists, diagram renders on GitHub |
| [ ] | Setup instructions | `docs/SETUP.md` (S1) | Followed by non-author in C-4 |
| [ ] | Live demonstration of key capabilities | `Demo_Runbook.md`, rehearsed twice | Rehearsal date/time + who watched |
| [ ] | Use proper schema designs | `backend/prisma/schema.prisma` + `backend/prisma/migrations/` (S1; S2 appends only `KbDocument`, `KbChunk`, `AgentRun`, `AuditEvent`); ERD in `Architecture.md` / `Preliminary_Design.md` | Table list from `\dt` in psql |
| [ ] | Proper validation and error handling | `backend/src/common/errors.ts` (`AppError`, `errorHandler`), Zod `parse()` on every request body/query, error envelope per `Integration_Contracts.md` §3 | `curl` of a bad request returning the envelope |
| [ ] | Clean folder structure | matches `CLAUDE.md` §5 layout; no stray files at root; `ai/stub/` deleted | `tree -L 2` output pasted in README |
| [ ] | Seed data scripts | `backend/prisma/seed.ts` via `npm run seed` (8 products incl. VL-204, 5 users, 2 applications incl. LA-2026-00418 without address proof) | `curl /api/products | jq length` → 8 |
| [ ] | List of test prompts used in the demonstration | `docs/TEST_PROMPTS.md` (S2) — must equal `Demo_Runbook.md` §3 | diff between the two is empty |
| [ ] | Short note on AI guardrails, known limitations, responsible-AI decisions | `docs/GUARDRAILS.md` (S2) | Covers G-1..G-4, PII masking, numbers-in-code, RAG-only, HITL, limitations |

## B. Brief scenarios and requirement traceability

| Done | Item | Evidence |
|---|---|---|
| [ ] | Every ID in `REQUIREMENTS.md` ticked with a path/test | `grep -c "\[ \]" REQUIREMENTS.md` → 0 |
| [ ] | Used-car advisor query → VL-204 / 60 months / 10871 (M1-16) | Response JSON saved to `docs/demo-fallback/advisor.json` |
| [ ] | Missing-info advisor query → non-null `clarifyingQuestion` (M1-14) | JSON saved |
| [ ] | 5 brief RAG questions answer with sources (M2-Q1..Q5) | `docs/TEST_PROMPTS.md` with recorded answers |
| [ ] | Latest-version retrieval shows v2026.3 over the older version (M2-5, M2-K9) | `retriever.test.ts` green |
| [ ] | Not-found safe answer (M2-7) and internal doc hidden from customer (M2-10) | Two recorded responses |
| [ ] | LA-2026-00418 workflow → REQUEST_ADDITIONAL_DOCUMENTS, "Address proof" (M3-14) | `orchestrator.test.ts` green + `docs/demo-fallback/workflow.json` |
| [ ] | PERMISSION_DENIED event in an audit trail (G-4) | `permissionGuard.test.ts` green + trail JSON from a run with `?demoPermissionViolation=true` |
| [ ] | PAN masked in trail and in `backend/*.log` (M2-8) | `piiMasker.test.ts` green + a grep showing `XXXXX` in the log and no `[A-Z]{5}[0-9]{4}[A-Z]` |
| [ ] | No gender/religion/caste/marital-status field anywhere (G-1) | `grep -ri "gender\|religion\|caste\|marital" backend/src db/ frontend/src` → only in GUARDRAILS.md/tests |
| [ ] | `/decision` rejects LOAN_OFFICER and agents (G-2) | 403 curl output |
| [ ] | All tests green: `npm test` in `backend/` (`loanMath`, `stateMachine`, `piiMasker`, `retriever`, `permissionGuard`, `orchestrator`) and `frontend/` | CI log or terminal paste |

## C. Repo hygiene

| Done | Item | Evidence |
|---|---|---|
| [ ] | `README.md` at root: what it is, 5-line quick start, links to SETUP / ARCHITECTURE / GUARDRAILS / TEST_PROMPTS / Demo_Runbook, screenshot | File reviewed by someone other than the author |
| [ ] | `.env.example` has placeholders only, no real keys | `grep -E "nvapi-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{30,}" .env.example` → no match |
| [ ] | No `.env`, keys, or `uploads/` content committed | `git log --all -p | grep -c "nvapi-"` → 0; `git ls-files | grep -E "^\.env$|uploads/"` → empty |
| [ ] | `git log` shows all 3 contributors | `git shortlog -sn` lists 3 names |
| [ ] | All three phase PRs merged to `main`; no open PR | `gh pr list` empty; `gh pr list --state merged` ≥ 3 |
| [ ] | Commits follow `<REQ-ID>: summary` | spot-check `git log --oneline | head -30` |
| [ ] | Tag `v0.1-demo` on the commit that was rehearsed | `git tag` + `git describe` |
| [ ] | C-4: fresh `git clone` + `cp .env.example .env` + key + `docker compose up -d` + `npm i` + `npx prisma migrate dev` + `npm run seed` + `npm run ingest` + `npm run dev` on a **different machine by a non-author**, following only `docs/SETUP.md` | Name, date, time taken, issues found → fixed |
| [ ] | `docs/ASSUMPTIONS.md` lists every assumption made (CLAUDE.md §0) | File exists, one line per assumption |
| [ ] | `Memory.md` final entry says "submitted" with the tag and URL | — |
| [ ] | `Component_Change_Manual.md` line numbers refreshed and each cheatsheet row re-tested | Date of refresh in the file header |
| [ ] | Mocks (`VITE_USE_MOCKS`) default to `false` in committed `frontend/.env.example`; MSW not registered in production build | `grep VITE_USE_MOCKS frontend/.env.example` |

## D. Submission packet (what gets sent)

- [ ] GitHub URL (public or judges invited) — `TODO`
- [ ] Tag/commit hash — `TODO`
- [ ] Architecture diagram as PNG too (`docs/architecture.png`), in case Mermaid doesn't render where judges look
- [ ] 2-minute screen recording of the happy path as a backup for the live demo (`docs/demo.mp4` or link) — optional but cheap insurance
- [ ] Team names / roles as in `Team_Work_Split.md` (fill the blank "Person" column)
