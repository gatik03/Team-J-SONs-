# LoanLens AI — integration handoff

## Current state

The integrated app is a React 19, TypeScript and Vite frontend backed by a Node.js Express API using Prisma. The AI services are in `backend/src/ai`; they call the real S1 core services through `backend/src/ai/coreBridge.ts`. The frontend's HTTP client is `frontend/src/api/client.ts`, and feature requests are organized under `frontend/src/api/hooks/`. This is not a Spring Boot/FastAPI deployment.

The live configuration in the repository root `.env` selects the real API (`VITE_USE_MOCKS=false`) at `http://localhost:8080`; Vite serves the frontend at `http://localhost:5173`. The optional MSW mocks remain available when explicitly enabled. In mock mode the app displays a `MOCK DATA` badge.

## App paths and roles

- Customer: loan catalogue and comparison, EMI calculator, advisor and policy assistant, profile, application draft/upload/submission, application status.
- Loan officer: application queue and workflow, policy assistant, knowledge base, product catalogue.
- Credit analyst: review queue, persisted AI recommendation and audit trail, human decision controls, policy assistant and knowledge base.
- Policy admin: versioned policy library, upload, preview, test query, publish and retire flows.

Routes and role guards are in `frontend/src/routes/router.tsx` and `frontend/src/routes/RoleGuard.tsx`. Role-aware navigation and the responsive shell are in `frontend/src/layouts/AppLayout.tsx`; shared styles are in `frontend/src/styles/app.css` and tokens in `frontend/src/styles/tokens.css`.

## Verification evidence

`docs/evidence/browser-qa.json` records 16 passed browser checks, no uncaught runtime errors, and a 404 API error for the workflow recommendation URL. The checks cover live catalogue/filter/compare/EMI requests, draft resumption, real document upload and application submission without address proof, role restrictions, officer handling of the missing proof, analyst recommendation/audit review, policy-admin landing, mobile navigation, and no horizontal overflow at 390px. Captured screens are `emi-desktop`, `customer-status-desktop`, `officer-review-desktop`, `analyst-review-desktop`, `policy-library-desktop`, `catalogue-mobile-final`, and `catalogue-mobile-dark`; see `docs/evidence/`.

Final integration checks: backend 103 tests across 21 files; frontend 14 tests across 5 files, both on Vitest 4.1.12. Both TypeScript/build commands pass, both npm audits report zero findings. Prisma CLI and client are pinned together at 6.12.0 and regenerated. CSV ingestion uses patched csv-parse 7.0.3; parser and ingestion tests pass.

## Running locally

Start the backend and frontend using their package scripts and the repository's configured database/environment. The frontend dev server runs from `frontend/` with `npm run dev`; backend scripts and prerequisites are in `backend/package.json` and `docs/SETUP.md`. Keep the root `.env` pointed at the intended mock/live mode. Do not commit credentials or local environment files.

## Known evidence caveat

The browser evidence includes a 404 for `workflow/applications/LA-2026-28805/recommendation`; the overall run has no uncaught browser errors, but that endpoint response is an API error and should not be described as a clean success. The evidence file does not establish a comprehensive accessibility audit or full responsive coverage beyond the specific checks listed above.

## Final browser and production checks

`docs/evidence/live-ai-browser-qa.json` records live advisor ₹10,871, off-topic refusal, policy draft upload, isolated draft test-ask, publish confirmation and retire/rollback. `responsive-qa.json` records 57 checks across all six demo users at 390/768/1440px with no page-level overflow or runtime errors. `production-smoke.json` verifies built frontend login, API access and nested-route reload on Express at localhost:8080. A 404 recommendation response before the first workflow run is expected absence, handled as an empty state; it is not a failed workflow.

`customerUpdate` is a safe projection on the owning customer's application, containing only `customerMessage` and `missingDocuments`; the customer status UI never requests the staff-only recommendation endpoint. Draft save failures remain visible without losing fields. Final credit transitions compare current status inside the update transaction, so concurrent decisions cannot overwrite each other.

`docs/evidence/human-decision.json` and `human-decision.png` also prove an explicit analyst UI decision persisted REJECTED on the synthetic QA application. Mobile navigation was verified to move focus into the drawer, close with Escape, and return focus to the menu button; closed off-canvas links are hidden from keyboard focus.

## Advisor latency follow-up — 23 October 2026

Live testing reproduced an extraction timeout: one request took 37.3 seconds and the next returned AI_UNAVAILABLE after 40 seconds. Structured generation now has one retry owner (two total attempts, with a 500 ms pause), instead of multiplying SDK and application retries. Advisor extraction is limited to 512 output tokens. Optional reason wording has one attempt, 256 output tokens and a 3-second deadline; on failure the existing calculated explanation is returned. Essential extraction still fails safely if both provider attempts fail; no loan facts are invented to hide an outage.

Two follow-up live requests with the same used-car message returned HTTP 200 in 5.0 and 11.6 seconds; both used the explanation fallback. These are spot timings, not a latency guarantee. Backend verification: 104 tests pass and TypeScript build passes. Frontend code was unchanged and frontend tests were not rerun for this follow-up.
