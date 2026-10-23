> Historical development reference. Current submission guide: [SUBMISSION.md](../SUBMISSION.md). Statements about planned or pending work reflect an earlier stage.

## Integrated rehearsal — verified 2026-10-23

Use `README.md` startup commands. Open localhost:5173 for development or localhost:8080 after building the frontend. Live mode has no MOCK DATA badge.

1. Sign in as Priya from the demo button. Filter loans to Vehicle, compare two products, and calculate ₹5,00,000 at 11% for 60 months (EMI ₹10,871).
2. Ask the advisor the brief's used-car question. Ask the policy assistant a supported policy question and an off-topic question; show the source/version or safe refusal.
3. Start a personal-loan application, save, reload to resume, upload identity and income only, then submit. The address proof remains missing.
4. Sign out, sign in as Arjun Kumar. Find the new application in the queue, run AI pre-screen, show the missing-address check, persisted audit, and human-required message. Officer has no final decision control.
5. Sign in as Neha Mehta to inspect the same recommendation and record a reasoned human credit decision. Customers see only their safe next-step message.
6. Sign in as Policy Admin. Upload a fresh VEHICLE-TNC version (use a new version string), preview/test-ask the draft, publish with confirmation, then retire with a reason to demonstrate rollback.
7. Show the responsive mobile drawer and theme toggle; open the customer-only/staff-only routes with the wrong role to demonstrate the guard.

Actual browser logs and screenshots: `docs/evidence/`. The original walkthrough below is retained as reference; current implementation paths are in `Component_Change_Manual.md`.

# Demo Runbook — LoanLens AI (8 minutes)

Shared file (PR only). Owner for phase 3: S3. **Status 2026-10-23: no code exists; commands and screens are the planned ones from `Team_Work_Split.md` / `openapi.yaml`. Rehearse end to end twice once all three streams are merged, then fix this file to what actually happened.**

## 0. Roles

| Who | Does |
|---|---|
| **Driver** (S3) | Hands on keyboard, browser at 1280 px, zoom 125%, dark mode OFF (light mode has higher contrast on projectors). Second browser window pre-logged-in as `analyst.mehta` on another profile. |
| **Narrator** (S2) | Talks. Never touches the keyboard. Holds the printed prompt list (below). |
| **Safety** (S1) | Watches backend logs (`npm run dev` terminal in `backend/`, pino output), has the fallback commands (§4) ready, answers infra questions. |

## 1. Pre-demo checklist (T-30 min, tick in order)

- [ ] Clean clone of the tagged commit: `git clone <repo> && git checkout v0.1-demo` (not the working tree).
- [ ] `cp .env.example .env` and set `LL_AI_API_KEY` (NVIDIA). Confirm with `grep -c "nvapi-" .env` → `1`, and that the key is **not** the placeholder `nvapi-xxxx`. Also set `LL_EMBED_API_KEY` (Gemini key from aistudio.google.com — required for embeddings even with NVIDIA chat); venue internet must be up for ingest and policy questions.
- [ ] `docker compose up -d` → `docker compose ps` shows postgres healthy.
- [ ] `cd backend && npx prisma migrate dev && npm run seed && npm run ingest && npm run dev` → migrations applied, seed loaded, server listening on 8080 (`curl -s localhost:8080/api/products | jq length` → `8`).
- [ ] Knowledge ingested: `curl -s -H "Authorization: Bearer $TOKEN" localhost:8080/api/knowledge/documents | jq length` ≥ 8 (one in-force version per policy; superseded v2025.1 is not listed here). Token from `POST /api/auth/login` as `officer.kumar` — `TODO(after S1/S2 phase 1)`: S1 to add a `scripts/token.sh` helper or document the one-liner in `docs/SETUP.md`.
- [ ] Smoke the LLM: `curl -s -X POST localhost:8080/api/advisor/chat -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" -d '{"message":"I need ₹5 lakh for a used car. I earn ₹60,000 per month and want an EMI below ₹12,000."}' | jq '.recommendations[0].estimatedEmi'` → `10871`. Note the latency; if > 15 s go to §4 now.
- [ ] `cd frontend && npm run dev` with **`VITE_USE_MOCKS=false`** in `frontend/.env` (`grep VITE_USE_MOCKS frontend/.env`). Mocks must be OFF; the MSW banner must not be visible in the console.
- [ ] Seeded application `LA-2026-00418` is in `SUBMITTED` with identity + income docs and **no** address proof (`GET /api/applications/LA-2026-00418/documents` → 2 items). If a previous rehearsal moved it on, reset and re-seed: `cd backend && npx prisma migrate reset --force` (re-applies migrations and runs `prisma/seed.ts`), then `npm run ingest`.
- [ ] Browser tabs pre-opened in order: `/login`, `/products`, `/advisor`, `/policy`, `/applications/new`, `/officer/queue`. Clear chat histories. Third browser profile pre-logged-in as `admin.rao` on `/admin/policies`.
- [ ] Policy demo reset: `/admin/policies/VEHICLE-TNC` shows v2026.3 **ACTIVE** and no v2026.4 left from a rehearsal (if there is, `npx prisma migrate reset --force` then `npm run ingest`). `demo-files/vehicle-loan-terms-2026.4.md` exists (foreclosure after 3 EMIs, 1%) — `TODO(after S2 phase 2)`.
- [ ] Pre-recorded JSON fallbacks present: `docs/demo-fallback/advisor.json`, `policy-*.json`, `workflow.json` — `TODO(after S2 phase 3)` S2 saves real responses from a successful rehearsal.
- [ ] Phone/second laptop? No — responsiveness is shown by resizing the browser (devtools device toolbar at 375).
- [ ] `git status` clean; `git tag` shows `v0.1-demo`.

## 2. Script — 7 beats + 4b

Timings are targets. Narrator lines in *italics*; what judges should see in **bold**.

### Beat 1 — Problem (0:00–0:30)
*"Kestrel Bank, 12 million customers, four loan types. Customers don't know which loan fits, get inconsistent answers from branch, app and call centre, and re-upload the same documents. Ops teams apply policy by hand. LoanLens gives one assistant for discovery, grounded policy answers, and agents that pre-process applications — with a human making every decision. Everything you see is synthetic data."*
Screen: `/login` with the six demo users visible. Driver logs in as `priya.sharma`.

### Beat 2 — Catalogue + deterministic EMI (0:30–1:30)
1. `/products`: type `car` in search, sort by rate, tick two products, **Compare** → side-by-side table.
2. Open `VL-204 Kestrel Pre-Owned Car Loan`. Set **₹5,00,000 / 11.0% / 60 months**. **EMI `₹10,871`**, amortization table, 60 rows, totals.
*"Every number here is computed in TypeScript by `calculateEmi` in `core/emi/loanMath.ts`, never by the model. The same function feeds the advisor and the agents, so the numbers can't disagree."*
Resize to 375 for 3 seconds: single-column cards, table scrolls. Back to 1280.

### Beat 3 — AI Loan Advisor (1:30–2:45)
Type exactly:
> `I need ₹5 lakh for a used car. I earn ₹60,000 per month and want an EMI below ₹12,000.`

**See**: "Understood" line with chips ₹5,00,000 · ₹60,000 · max EMI ₹12,000; one RecommendationCard: **VL-204, 11.0%, 60 months, EMI ₹10,871, LIKELY_ELIGIBLE**, reason "60-month tenure keeps EMI within the limit (about 18% of income)"; disclaimer line.
*"Intent and fields are extracted by the LLM into a fixed schema; the EMI is `calculateEmi()` again. The JSON behind this card is the brief's expected response field-for-field — Safety can show the network tab if asked."*

Then type:
> `I want a loan for my daughter's college fees.`

**See**: no cards, a `clarifyingQuestion` bubble — something like "How much do you need, and what is your monthly income?"
*"Missing amount and income → it asks instead of guessing."*

### Beat 4 — RAG policy assistant (2:45–4:15)
Still as `priya.sharma`, `/policy`. Ask in this order (narrator reads, driver types):

1. `Can I foreclose my vehicle loan after six months, and are there any charges?`
   **See**: answer "Foreclosure is allowed after 6 EMIs, with a 2% charge…", confidence **HIGH**, source chip **Vehicle Loan Terms and Conditions · Foreclosure and Part-Prepayment · v2026.3**.
   *"Two versions of this document are published. The chip shows 2026.3, effective 2026-07-01 — the older 2025 version says 3%, and retrieval picks the version in force: the published one with the latest effective date up to today."* Driver hovers the chip to show `effectiveDate`. (Safety: have `GET /api/admin/policies/VEHICLE-TNC/versions` output ready as `admin.rao`, showing v2026.3 `ACTIVE` and v2025.1 `SUPERSEDED`.)
2. `What documents do I need for a home loan if I am self-employed?` — **See** KYC checklist source, segment-aware answer.
3. `What is the processing fee for a personal loan of ₹3 lakh?` — **See** fee schedule source, computed-from-table answer.
4. `What is the minimum credit score required for a home loan?` — **See** credit policy source.
5. `How long does disbursal take after approval?` — **See** T&C / playbook-safe answer.

Then the two guardrail prompts:
6. `What is the interest rate on gold loans?` (not in the knowledge base)
   **See**: safe answer "I couldn't find this in Kestrel Bank's approved documents…", confidence **LOW**, empty sources, `followUpRequired: true`. *"No general-knowledge fallback."*
7. `What does the loan officer playbook say about overriding a credit score band?`
   **See**: as a customer, the internal playbook is **not** served — safe not-found. Switch to the analyst window, same question → **answered with source `Loan Officer Playbook` (audience INTERNAL)**. *"Audience filter comes from the role on the token, never from the request."*

### Beat 4b — Policy Admin: versioned update and rollback (4:15–5:15)
Answers the judge question "how does the chatbot get updated policies, and how is version control done?". Third browser profile, logged in as **`admin.rao`** (POLICY_ADMIN).
1. `/admin/policies` → **See** the library row **VEHICLE-TNC · active v2026.3**. **Upload new version** (`/admin/policies/new`): file `demo-files/vehicle-loan-terms-2026.4.md`, documentKey `VEHICLE-TNC`, version `2026.4`, effective date **today**, audience CUSTOMER, change note `Foreclosure after 3 EMIs, charge reduced to 1%`. **See** status **DRAFT**.
2. **Preview** → the sections exactly as chunked; point at "Foreclosure and Part-Prepayment".
3. **Test-ask** the draft: `Can I foreclose my vehicle loan after six months, and are there any charges?` → **See** "after 3 EMIs, 1% charge", source v2026.4. *"Only the admin sees this; customers are still on 2026.3."*
4. **Publish** → **See** v2026.4 **ACTIVE**, v2026.3 **SUPERSEDED** in the history on `/admin/policies/VEHICLE-TNC`.
5. Switch to the `priya.sharma` window, `/policy`, ask prompt 3 again → **See** "3 EMIs, 1%", chip **v2026.4**.
6. Back as `admin.rao`: **Retire** v2026.4 with reason `Rate change not yet approved by credit committee`. Customer re-asks → chip back to **v2026.3**, "6 EMIs, 2%".
7. Show the history's audit events: **`POLICY_DRAFTED` → `POLICY_PUBLISHED` → `POLICY_RETIRED`**, each with `admin.rao`, the time and the change note / reason.
*"Every upload is a new immutable version. The version in force is worked out per question, so publishing takes effect immediately, a future date goes live on its own, and retiring rolls back instantly. Only the Policy Admin can do this, and every step is audited. Next on the roadmap: a second approver, maker-checker."*
(If past 5:00 when starting: skip steps 2 and 7 and say them.)

### Beat 5 — Application wizard (5:15–6:15)
Back as `priya.sharma`, `/applications/new`.
1. Step 1: product **Personal loan**, amount **₹5,00,000**, tenure 48. Step 2: salaried, income ₹60,000, obligations ₹8,000. Click **Save draft** → toast. Reload the page → draft restored at step 2. *"Save-as-draft; the status is DRAFT in the timeline."*
2. Step 3: upload `demo-files/salary-slip.pdf` as INCOME and `demo-files/pan.pdf` as IDENTITY. **Leave ADDRESS empty.** The dropzone shows "Not uploaded yet".
3. Step 4: review, **Submit**. **See**: tracker `/applications/<id>/status` with DRAFT → SUBMITTED filled, the rest grey.

(Alternative if short on time: skip and use the seeded `LA-2026-00418`, which is already in this exact state.)

### Beat 6 — Officer runs the agents (6:15–7:15)
Switch to the second window (or log out → `officer.kumar`). `/officer/queue` → row **LA-2026-00418** (or the one just submitted) → **Run workflow** (expect 5–20 s; narrator talks through the agent list while it runs).
**See** on the review page:
- Recommendation pill **REQUEST_ADDITIONAL_DOCUMENTS**, risk band **MEDIUM**, "Human decision required".
- Checks table: DocumentVerificationAgent **INCOMPLETE** "Address proof is missing"; CreditAssessmentAgent **PASS** "Obligation ratio is 38% (limit 50%); credit score band is 720-760"; ComplianceAgent **PASS** "KYC status verified".
- Missing documents: Address proof. Drafted customer message: "Please upload a valid address proof to continue your application."
- Audit trail: expand a `TOOL_CALL` row (`get_credit_score`), show timestamp and duration. This row only exists if the run was triggered with the staff-only flag `?demoPermissionViolation=true` (`POST /api/workflow/applications/LA-2026-00418/run?demoPermissionViolation=true`), which makes one agent attempt a forbidden tool; the recommendation itself is unchanged. Toggle **PERMISSION_DENIED only** → one row where an agent tried a tool outside its permission (e.g. DocumentVerificationAgent → `update_application`) and was refused by `guardedTools()`. *"Refused and logged — guardrail 4."*
- Expand a row whose input contains the customer's PAN: shows **`XXXXX1234X`**. *"Masked before it reaches the prompt, the database and the log file."* Safety shows one masked line in the backend terminal.
- Officer has **no** Approve/Reject buttons.

### Beat 7 — Human decision + guardrails (7:15–8:00)
Switch to `analyst.mehta`, same review page. Decision form: **Approve** with reason `Verified income supports EMI; address proof to be collected before disbursal.` → **See** timeline jump to APPROVED with `by: analyst.mehta` and the reason as note. (Or Reject — either proves the point.)
Final slide (one static image, `docs/guardrails-slide.png` — `TODO(after S2 phase 3)`): the four brief guardrails + "numbers in code" + "RAG only from approved docs" + "PII masked" + known limitations (NIM tool-calling flakiness, embeddings need internet + Gemini key, simulated KYC/bureau).
*"Agents recommend. People decide. Everything is on the audit trail."* Stop.

## 3. Prompt list (print this)

```
ADVISOR
1. I need ₹5 lakh for a used car. I earn ₹60,000 per month and want an EMI below ₹12,000.
2. I want a loan for my daughter's college fees.

POLICY (customer)
3. Can I foreclose my vehicle loan after six months, and are there any charges?
4. What documents do I need for a home loan if I am self-employed?
5. What is the processing fee for a personal loan of ₹3 lakh?
6. What is the minimum credit score required for a home loan?
7. How long does disbursal take after approval?
8. What is the interest rate on gold loans?                      -> safe not-found
9. What does the loan officer playbook say about overriding a credit score band?   -> refused for customer, answered for analyst

POLICY ADMIN (admin.rao)
10. Change note: Foreclosure after 3 EMIs, charge reduced to 1%
11. Test-ask: prompt 3
12. Retire reason: Rate change not yet approved by credit committee

DECISION REASON
13. Verified income supports EMI; address proof to be collected before disbursal.
```
The same list must appear in `docs/TEST_PROMPTS.md` (S2 owns it).

## 4. Fallbacks

| Symptom | Action (Safety) | Narrator says |
|---|---|---|
| Advisor/policy call > 15 s or 503 `AI_UNAVAILABLE` | In `.env` switch the three `LL_AI_*` lines to the Gemini block (`LL_AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai`, Gemini key, `gemini-2.0-flash`), restart backend (~20 s). Driver moves to Beat 2 catalogue/EMI meanwhile. | "We run on an OpenAI-compatible endpoint, so we're swapping provider by env var while we talk." |
| Both providers down | Driver opens `docs/demo-fallback/*.json` in a formatted JSON viewer tab and walks through the fields; or flip `VITE_USE_MOCKS=true` and **say it is a mock**. Never present a mock as live. | "This is a recorded response from this morning's run; the shape is the brief's." |
| Workflow run fails (tool-calling flake on NIM) | Click **Run workflow** once more (orchestrator is idempotent per run; each run gets its own audit trail). Second failure → show `docs/demo-fallback/workflow.json` + the last successful audit trail via `GET /api/audit/<id>` from rehearsal. | "Tool calling on the free NIM tier is our known flaky point; it's in the limitations note." |
| Frontend dev server dies | `npm run dev` again (5 s). | — |
| Postgres down | `docker compose up -d` (10 s); if volume wiped, seeds re-run on boot. | — |
| Seeded application already decided from a rehearsal | Use the application submitted in Beat 5 instead; it is in the identical state. | — |
| Projector too dim | Zoom 150%; stay in light mode. | — |

## 5. Interruptions

- Questions mid-demo: narrator answers in one sentence and says "I'll show that in beat N" if it's coming; Driver keeps going. Deep questions go after beat 7 (`Judge_QA_Playbook.md` — **not yet written**; S2 to draft after phase 3).
- "Can you change X live?" → Driver opens `Component_Change_Manual.md` cheatsheet, picks the matching row, edits, Vite hot-reloads. Keep `git checkout -- <file>` ready to undo.
- Time check at beat 4: if past 4:30, drop prompts 4–7 and keep 3, 8, 9. At beat 5, if past 6:30, use the seeded application instead of the wizard.
- Hard stop at 8:00 even mid-beat; finish with the guardrails line.
