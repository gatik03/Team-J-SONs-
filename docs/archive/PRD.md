> Historical development reference. Current submission guide: [SUBMISSION.md](../SUBMISSION.md). Statements about planned or pending work reflect an earlier stage.

# Product Requirements Document — LoanLens AI

Status: planning. No code exists yet; every feature below is planned. Scope is bounded by `docs/USECASE.md` (the brief). IDs refer to `REQUIREMENTS.md`. API shapes refer to `openapi.yaml`. Roles, seeded users, error envelope and tool matrix refer to `Integration_Contracts.md`.

## 1. Personas

The six seeded users from `Integration_Contracts.md` §2 (password `password` for all).

| Persona | Username | Role | Segment | Profile (synthetic) | Goal | Frustration today (brief §1) |
|---|---|---|---|---|---|---|
| **Priya Sharma** | `priya.sharma` | CUSTOMER | Salaried | CUST-1001, private-sector salaried, ₹60,000/month, ₹8,000 existing obligations, Pune, KYC verified | Buy a used car for ₹5 lakh with EMI under ₹12,000 | Does not know which product or tenure fits; gets different answers from branch and app |
| **Rahul Verma** | `rahul.verma` | CUSTOMER | Self-employed | CUST-1002, business owner, variable income | Home loan; wants to know the document list for self-employed before applying | Repeated document requests; unclear eligibility |
| **Ananya Iyer** | `ananya.iyer` | CUSTOMER | Student | CUST-1003, no salary income | Education loan discovery; understand eligibility and fees | Unsure whether she is eligible at all |
| **Officer Kumar** | `officer.kumar` | LOAN_OFFICER | — | Branch loan officer | Clear the queue of submitted applications fast; get consistent policy answers incl. internal playbooks | Manual document cross-checking; coordinating KYC/credit/compliance |
| **Analyst Mehta** | `analyst.mehta` | CREDIT_ANALYST | — | Credit analyst | Make defensible approve/reject decisions quickly with full context | Applying policy consistently; explaining decisions; audit trail for regulators |
| **Admin Rao** | `admin.rao` | POLICY_ADMIN | — | Bank policy official who owns the policy library (added after judge feedback, X-1) | Get an approved policy change in front of customers on the right date, safely, and undo it fast if it is wrong | Policy changes reach branch, app and call centre at different times; no record of who changed what or a quick way back |

Protected attributes (gender, religion, caste, marital status) are **not** part of any persona profile or data model (G-1).

## 2. User journeys

### 2.1 Priya (salaried customer) — discover, advise, apply, track

1. Login → lands on Catalogue (M1-4, M1-8).
2. Filters `loanType=VEHICLE`, sorts by rate, compares two vehicle products (M1-1, M1-2).
3. Opens VL-204, uses EMI calculator 5,00,000 / 11 % / 60 → EMI 10,871 and amortization table (M1-3).
4. Opens Advisor, types the brief's sentence → recommendation card VL-204 / 60 months / 10,871 / LIKELY_ELIGIBLE with reason and disclaimer (M1-10..M1-16).
5. Clicks "Apply" → 4-step wizard pre-filled with product and amount; saves as draft after step 2; returns later; completes; uploads identity + income proof; submits (M1-5, M1-6).
6. Status tracker shows DRAFT → SUBMITTED timeline; later UNDER_VERIFICATION → UNDER_REVIEW and the customer message "Please upload a valid address proof…" (M1-7, M3-5).
7. Uploads address proof; later sees APPROVED with the analyst's reason.

### 2.2 Rahul (self-employed customer) — policy question before applying

1. Login → Policy assistant.
2. Asks "What documents do I need for a home loan if I am self-employed?" → answer from the KYC checklist with source title, section, version (M2-Q1, M2-6, M2-9).
3. Asks "What is the processing fee for a personal loan of ₹3 lakh?" → answer from rate/fee schedule (M2-Q2).
4. Asks something not in the documents → safe not-found response with `followUpRequired: true` (M2-7).
5. Never sees content from the loan officer playbook (M2-10).

### 2.3 Ananya (student) — eligibility discovery

1. Login → Catalogue filtered `segment=STUDENT` shows education products only (M1-2, B-1).
2. Advisor: "I need 8 lakh for a master's degree" without income → `clarifyingQuestion` asks for co-applicant / income (M1-14).
3. Policy: "What is the minimum credit score required for a home loan?" → grounded answer (M2-Q4); eligibility indicator on her advisor result reflects segment rules (M1-13).

### 2.4 Officer Kumar — queue and workflow

1. Login → Officer queue lists all applications filterable by status (M1-8, permission matrix).
2. Opens `LA-2026-00418` (SUBMITTED), clicks "Run workflow" → `AgentRecommendation` with three checks, `REQUEST_ADDITIONAL_DOCUMENTS`, `requiresHumanApproval: true` (M3-14).
3. Opens the audit trail → every agent step, tool call, masked input/output, timestamps (M3-12).
4. Views the policy versions in force (read-only; only the Policy Admin can change them, X-1); asks the policy assistant and gets internal playbook sources too (M2-10).
5. Tries to approve → the UI hides the button; a direct call returns 403 `FORBIDDEN` (G-2).

### 2.5 Analyst Mehta — decision

1. Login → Review queue filtered `UNDER_REVIEW`.
2. Opens the application: checks table, risk band, missing documents, customer message, audit trail viewer (M3-13).
3. Records APPROVED or REJECTED with a reason of ≥ 10 characters → status transitions, `status_event` appended with `by: analyst.mehta` (M3-10, B-4).
4. Can simulate disbursement for APPROVED applications (B-7).

### 2.6 Admin Rao (Policy Admin) — publish a policy change, then roll it back

1. Login → Policy library (`/admin/policies`): one row per policy (`documentKey`) with its active version, any scheduled version and draft count (X-1).
2. Uploads `VEHICLE-TNC` v2026.4 with effective date today and change note "Foreclosure after 3 EMIs, charge reduced to 1%" → status DRAFT; nobody else can see it (M2-1, X-1).
3. Previews the sections as chunked, then test-asks "Can I foreclose my vehicle loan after six months?" against the draft only → "3 EMIs, 1%", source v2026.4 (X-1).
4. Publishes → v2026.4 is ACTIVE, v2026.3 SUPERSEDED; Priya's same question now cites v2026.4 (M2-5, X-1).
5. Finds the change was premature; retires v2026.4 with a reason → v2026.3 answers again on the next question (X-1).
6. Opens the version history: every version with its change note, who published or retired it and when, and the `POLICY_DRAFTED` / `POLICY_PUBLISHED` / `POLICY_RETIRED` audit events (X-1).
7. Cannot see applications, run the workflow or decide; those menus are hidden and the APIs return 403.

## 3. Features and acceptance criteria

All criteria are Given/When/Then and tagged with REQUIREMENTS IDs. Owner column follows `Team_Work_Split.md`.

### 3.1 Module 1 — Digital Loan Discovery & Application

| ID | Feature | Owner | Acceptance criteria |
|---|---|---|---|
| M1-1, B-3 | Product catalogue | S1 + S3 | **Given** the seed has 8 products (2 per type, incl. `VL-204 Kestrel Pre-Owned Car Loan` at 11 %) **When** `GET /api/products` **Then** 8 `LoanProduct` objects with `productId`, `name`, `loanType`, rate range, tenure range, min/max amount, `processingFeePercent`, `eligibilityCriteria` are returned and rendered as cards. |
| M1-2 | Search, filter, sort, compare | S1 + S3 | **Given** products exist **When** `GET /api/products?q=car&loanType=VEHICLE&sort=rate_asc` **Then** only matching vehicle products are returned in ascending rate order. **When** `GET /api/products/compare?ids=PL-101,PL-102` **Then** both products are returned in that order and shown side by side. **When** `ids` has fewer than 2 or more than 4 entries **Then** 400 `VALIDATION_FAILED`. |
| M1-3, M3-9 | EMI calculator with amortization | S1 + S3 | **Given** `principal=500000, annualRate=11.0, tenureMonths=60` **When** `POST /api/emi/calculate` **Then** `emi` is `10871` and `schedule` has 60 rows whose final `closingBalance` is 0; computed by `calculateEmi`/`amortization` in `core/emi/loanMath.ts`, no LLM involved. **When** `principal=0` **Then** 400 with `details[].field = "principal"`. |
| M1-4, B-1, B-2 | Login and profile | S1 + S3 | **Given** seeded user `priya.sharma` / `password` **When** `POST /api/auth/login` **Then** `{token, role: CUSTOMER, customerId: CUST-1001, displayName}`. **When** `GET /api/customers/me` with the token **Then** profile with `segment`, `employmentType`, `monthlyIncome`, `existingMonthlyObligations`, `location`, `kycStatus` and **no** gender/religion/caste/marital-status fields. **When** wrong password **Then** 401 `UNAUTHORIZED`. |
| M1-5, B-4 | Multi-step application with save-as-draft | S1 + S3 | **Given** Priya is on step 2 of 4 **When** she clicks Save **Then** `PUT /api/applications/{id}` stores the partial draft with `currentStep=2` and status stays `DRAFT`. **When** she submits with a required field missing **Then** 400 `VALIDATION_FAILED` listing the fields. **When** all steps complete and she submits **Then** status is `SUBMITTED` and a `status_event` row is appended. |
| M1-6 | Document upload | S1 + S3 | **Given** a draft or submitted application owned by the caller **When** `POST /api/applications/{id}/documents` with `documentType=INCOME` and a file **Then** 201 `ApplicationDocument` and the file is on local disk under `backend/uploads/`. **When** another customer's application id is used **Then** 403/404 via the envelope. |
| M1-7 | Status tracker with timeline | S1 + S3 | **Given** an application with several transitions **When** `GET /api/applications/{id}` **Then** `timeline[]` contains every `{status, at, by, note}` in order and the UI renders them as a vertical timeline. |
| M1-8 | Role-based navigation | S1 + S3 | **Given** a CUSTOMER token **When** the app loads **Then** only customer routes are in the nav and `/officer/*`, `/analyst/*` redirect. **When** a CUSTOMER calls `GET /api/applications` **Then** only their own applications are returned; **When** `officer.kumar` calls it **Then** all. **When** `officer.kumar` calls `POST /api/applications/{id}/decision` **Then** 403 `FORBIDDEN`. |
| M1-9 | Responsive UI | S3 | **Given** viewport widths 375, 768, 1280 px **When** each screen is opened **Then** no horizontal scroll, all actions reachable by keyboard, inputs have labels. |
| M1-10, M1-11 | Advisor understands intent, extracts fields | S2 | **Given** the brief's sentence **When** `POST /api/advisor/chat` **Then** `interpretedRequirement` is a one-line paraphrase and `loanAmount=500000`, `monthlyIncome=60000`, `maxPreferredEmi=12000`, `currency="INR"`. |
| M1-12, M1-13 | Recommends product and tenure with reason and eligibility | S2 | **Given** the extracted fields **When** the advisor runs **Then** `recommendations[0]` is `VL-204`, `tenureMonths=60`, `estimatedEmi=10871` (from `calculateEmi()`), `reason` mentions the EMI-to-income ratio, `eligibilityIndicator` ∈ {LIKELY_ELIGIBLE, BORDERLINE, UNLIKELY_ELIGIBLE, UNKNOWN}, and `disclaimer` is present. |
| M1-14 | Clarifying question | S2 | **Given** a message without income ("I need 5 lakh for a car") **When** the advisor runs **Then** `clarifyingQuestion` is non-null and asks for income (and/or EMI preference) and `recommendations` may be empty. |
| M1-15, M1-16 | Exact JSON shape; sample query works | S2 | **Given** the brief's sentence **When** the response is compared to `AdvisorResponse` in `openapi.yaml` **Then** every field name matches verbatim and the values match the brief's example (VL-204 / 60 / 10871 / LIKELY_ELIGIBLE / `clarifyingQuestion: null`). |

### 3.2 Module 2 — RAG-Based Lending Policy Assistant

| ID | Feature | Owner | Acceptance criteria |
|---|---|---|---|
| M2-1, B-6, X-1 | Upload and ingest PDF/MD/CSV/JSON with metadata | S2 (+S3 UI) | **Given** `admin.rao` **When** `POST /api/admin/policies` with a file and `documentKey, title, version, effectiveDate, loanType, documentType, audience, changeNote[, customerSegment]` **Then** 201 `PolicyVersion` with `status: DRAFT` and `chunkCount > 0`. **When** a CUSTOMER, LOAN_OFFICER or CREDIT_ANALYST calls it **Then** 403. **When** `version` or `changeNote` is missing **Then** 400. **When** `(documentKey, version)` already exists **Then** 409. |
| M2-2 | Section-aware chunking | S2 | **Given** a Markdown doc with `##` headings **When** ingested **Then** each chunk carries the heading it came from as `section` metadata and no chunk spans two headings. |
| M2-3 | Embeddings + vector store | S2 | **Given** ingestion **When** chunks are stored **Then** PgVector rows have 768-dim normalised vectors from Gemini `gemini-embedding-001` via `@ai-sdk/google` (`ai/rag/embeddings.ts`, `taskType: RETRIEVAL_DOCUMENT`) and metadata `title, section, version, effectiveDate, loanType, documentType, audience, customerSegment`. |
| M2-4 | Metadata filtering | S2 | **Given** docs of several loan types **When** `POST /api/policy/ask` with `loanType=VEHICLE` **Then** all `sources[]` are VEHICLE or ALL. Same for `customerSegment`, document type and effective date (no source with `effectiveDate` in the future). |
| M2-5, M2-K9 | Version in force | S2 | **Given** `VEHICLE-TNC` exists as PUBLISHED versions 2025.1 and 2026.3 with different foreclosure charges, both effective before today **When** asked about foreclosure **Then** only version 2026.3 is cited and its number is in the answer; the version in force is computed at query time, not stored as a flag (`retriever.test.ts`). |
| M2-6, M2-9 | Grounded answer with sources, exact shape | S2 | **Given** a supported question **When** answered **Then** `answer`, `confidence` ∈ {HIGH, MEDIUM, LOW}, `sources[]` each with `document, section, version, effectiveDate`, and `followUpRequired` are present; nothing else is required. |
| M2-7 | Safe not-found | S2 | **Given** a question with no supporting chunk above the similarity threshold **When** answered **Then** `answer` is the fixed safe message, `confidence: LOW`, `sources: []`, `followUpRequired: true`, and no general-knowledge content appears. |
| M2-8 | PII masking in prompts and logs | S2 | **Given** a question containing `ABCDE1234F`, a 12-digit Aadhaar, and a 14-digit account number **When** processed **Then** the prompt sent to the LLM and every log line contain `XXXXX1234X`, `XXXX-XXXX-1234`, and last-4-only respectively (`piiMasker.test.ts` + `maskPii()` as the pino serializer in `common/logger.ts`). |
| M2-10 | Internal docs not served to customers | S2 | **Given** an `OFFICER_PLAYBOOK` with `audience=INTERNAL` **When** `priya.sharma` asks a question it would answer **Then** it is never in `sources[]`; **When** `officer.kumar` asks **Then** it can be. Audience is taken from the JWT role, not the request body. |
| M2-K1..K8 | Seeded knowledge base | S2 | **Given** `db/knowledge/` **When** seeded **Then** at least one document of each of the 8 types exists and `GET /api/knowledge/documents` lists the version in force of each, with `documentKey` and `status`. |
| M2-Q1..Q5 | The five example questions | S2 | **Given** the seeded KB **When** each of the five brief questions is asked as a CUSTOMER **Then** each returns a non-safe answer with ≥ 1 source, and the answer is consistent with the seeded document text. Prompts recorded in `docs/TEST_PROMPTS.md`. |

### 3.3 Module 3 — Agentic Loan Processing Workflow

| ID | Feature | Owner | Acceptance criteria |
|---|---|---|---|
| M3-1 | At least three agents | S2 | **Given** the workflow runs **Then** `checks[]` contains `DocumentVerificationAgent`, `CreditAssessmentAgent`, `ComplianceAgent`; Customer Communication and Orchestrator exist as classes in `ai.agents`. |
| M3-2 | Document Verification Agent | S2 | **Given** `LA-2026-00418` with IDENTITY and INCOME documents only **When** the agent runs **Then** `result: INCOMPLETE`, `detail: "Address proof is missing"`, `missingDocuments: ["Address proof"]`. **Given** declared income differs from `verify_income` output beyond tolerance **Then** the detail flags an income mismatch. |
| M3-3, M3-9 | Credit Assessment Agent | S2 | **Given** income, obligations, proposed EMI and `get_credit_score` **When** the agent runs **Then** `obligationRatioPct()` from `core/emi/loanMath.ts` is used (not the LLM), the detail states the ratio, the limit and the score band, e.g. "Obligation ratio is 38% (limit 50%); credit score band is 720-760", and `result` is PASS/FAIL per product `maxObligationRatioPercent` and `minCreditScore`. |
| M3-4 | Compliance Agent | S2 | **Given** `get_kyc_status` returns VERIFIED **When** the agent runs **Then** `result: PASS`, `detail: "KYC status verified"`; the agent may call `search_policy` to check for policy exceptions and cites them in `detail`. |
| M3-5 | Customer Communication Agent | S2 | **Given** missing documents **When** the agent runs **Then** `customerMessage` is a plain-language request naming the document, e.g. "Please upload a valid address proof to continue your application." |
| M3-6, M3-10 | Orchestrator with HITL | S2 | **Given** a SUBMITTED application **When** `POST /api/workflow/applications/{id}/run` **Then** the orchestrator moves it to UNDER_VERIFICATION, runs the agents, moves it to UNDER_REVIEW, and sets `requiresHumanApproval=true` when any check ≠ PASS, amount ≥ 10,00,000, ratio 45–55 %, score 640–680, or a policy exception (always true in this build). **When** the application is DRAFT **Then** 409 `INVALID_STATE`. |
| M3-7, M3-8 | AI SDK tool calling + mock tools | S2 | **Given** `ai/tools/mockTools.ts` **Then** AI SDK `tool()` objects `get_credit_score` (300–900, B-5), `verify_income`, `get_kyc_status`, `update_application`, `search_policy` exist and return the shapes in `Integration_Contracts.md` §7. |
| M3-11, G-4 | Role-based tool permissions, refuse and log | S2 | **Given** `DocumentVerificationAgent` attempts `get_credit_score` **When** `guardedTools()` (`ai/tools/permissionGuard.ts`) evaluates **Then** `AgentPermissionDeniedError` is thrown, a `PERMISSION_DENIED` audit event is written, and that agent's check becomes `EXCEPTION` (`permissionGuard.test.ts`). |
| M3-12 | Audit trail | S2 (+S3 viewer) | **Given** a workflow run **When** `GET /api/audit/{auditTrailId}` **Then** events are ordered by `sequence`, each with `timestamp, agent, eventType, toolName, input, output, durationMs`, inputs/outputs masked by `maskPii()` in `ai/audit/auditService.ts`; the UI renders them in a table. |
| M3-13, M3-14 | Exact shape; sample scenario | S2 | **Given** the seeded `LA-2026-00418` **When** the workflow runs **Then** the response matches `AgentRecommendation` field-for-field and `recommendation = REQUEST_ADDITIONAL_DOCUMENTS`, `riskBand = MEDIUM`, `requiresHumanApproval = true`, `auditTrailId` resolves (`orchestrator.test.ts`). |
| G-1 | No protected attributes | S1 + S2 | **Given** the schema and all agent prompts **Then** no column, Zod schema field or prompt variable for gender, religion, caste or marital status exists (grep in CI). |
| G-2 | Agents only recommend | S1 + S2 | **Given** the `Recommendation` enum **Then** it has no APPROVE/REJECT value; `update_application` rejects targets other than UNDER_VERIFICATION / UNDER_REVIEW; only `POST /api/applications/{id}/decision` by CREDIT_ANALYST changes status to APPROVED/REJECTED. |
| G-3 | Plain-language reasons | S2 | **Given** any `AgentRecommendation` or `AdvisorResponse` **Then** every `checks[].detail`, `recommendations[].reason`, and `customerMessage` is a non-empty sentence without internal codes. |

### 3.4 Cross-cutting and deliverables

| ID | Feature | Owner | Acceptance criteria |
|---|---|---|---|
| B-4 | State machine | S1 | **Given** the transitions in `Integration_Contracts.md` §5 **When** an illegal transition is requested (e.g. DRAFT → APPROVED) **Then** 409 `INVALID_STATE` (`stateMachine.test.ts`). |
| B-7 | Synthetic data, simulated disbursement | S1 | **Given** an APPROVED application **When** the analyst clicks "Simulate disbursement" **Then** status becomes DISBURSED with a `status_event`; no payment integration. |
| D-2 | Architecture | S1/S2 | `Architecture.md` (+ `Preliminary_Design.md`) contains a Mermaid diagram with frontend, `core`, `ai`, Postgres/PgVector, LLM endpoint, and the three brief JSON flows. |
| D-3 | Setup | S1 | On a clean machine `docker compose up -d`, then in `backend/` `npm i && npx prisma migrate dev && npm run seed && npm run ingest && npm run dev`, and `npm run dev` in `frontend/` work by following `docs/SETUP.md` alone. |
| D-5 | Schema | S1 | `backend/prisma/schema.prisma` + `prisma/migrations/` (`npx prisma migrate dev`); singular snake_case tables (`@@map`); FKs; `status_event` and `audit_event` append-only. |
| D-6 | Validation + error handling | S1 | Every request body/query is parsed with Zod; `errorHandler` in `common/errors.ts` maps all errors (`AppError`, `ZodError`) to the §3 envelope. |
| D-8 | Seed + prompts | S1/S2 | `backend/prisma/seed.ts` (`npm run seed`) creates 8 products, 6 users, 2 applications; `docs/TEST_PROMPTS.md` lists every demo prompt. |
| D-9 | Guardrails note | S2 | `docs/GUARDRAILS.md` covers G-1..G-4, mocked services, known limitations, responsible-AI decisions. |

### 3.5 Policy governance and version control (X-1, judge feedback)

Rules in `Integration_Contracts.md` §8a and `Decisions.md` ADR-18; endpoints under `/api/admin/policies/**` in `openapi.yaml`. Owner: S2 API (`ai/rag/policyAdminService.ts`), S3 console (`/admin/policies`).

| ID | Feature | Owner | Acceptance criteria |
|---|---|---|---|
| X-1 | Only the Policy Admin changes policy | S2 | **Given** any role other than POLICY_ADMIN **When** it calls any `/api/admin/policies/**` endpoint **Then** 403 `FORBIDDEN` in the error envelope. **Given** `admin.rao` **When** it calls an application, workflow or decision endpoint **Then** 403. |
| X-1 | Drafts are never served | S2 | **Given** a DRAFT `VEHICLE-TNC` v2026.4 **When** any user calls `POST /api/policy/ask` **Then** no `sources[]` entry has version 2026.4. |
| X-1 | Preview and test-ask a draft | S2 + S3 | **Given** a DRAFT version **When** `GET /api/admin/policies/versions/{documentId}/preview` **Then** its chunks are returned with `section` and `content` in document order. **When** `POST .../test-ask` with a question **Then** a `PolicyAnswer` is returned whose `sources[]` come only from that version. |
| X-1 | Publish makes it the version in force | S2 | **Given** DRAFT v2026.4 with `effectiveDate` ≤ today and PUBLISHED v2026.3 **When** `POST .../publish` **Then** v2026.4 is PUBLISHED with `publishedBy` and `publishedAt` set, `servingState` ACTIVE, v2026.3 `servingState` SUPERSEDED, and the customer foreclosure question cites v2026.4. **When** publishing a version that is not DRAFT **Then** 409. |
| X-1 | Scheduled version goes live on its date | S2 | **Given** PUBLISHED v2026.4 with `effectiveDate` tomorrow **When** asked today **Then** v2026.3 is cited and v2026.4's `servingState` is SCHEDULED. **When** the same query runs with today = that date (clock injected in the test) **Then** v2026.4 is cited, with no job or flag update in between. |
| X-1 | Retire rolls back instantly | S2 | **Given** ACTIVE v2026.4 and PUBLISHED v2026.3 **When** `POST .../retire` with `reason` of ≥ 5 characters **Then** v2026.4 is RETIRED with `retiredAt` and `retiredReason` set, and the next customer foreclosure question cites v2026.3. **When** `reason` is missing **Then** 400. |
| X-1 | Published versions are immutable | S2 | **Given** a PUBLISHED or RETIRED version **Then** no endpoint changes its file, metadata or chunks; a change is only possible as a new version under the same `documentKey`. |
| X-1 | Every action audited | S2 | **Given** draft, publish and retire actions by `admin.rao` **Then** `POLICY_DRAFTED`, `POLICY_PUBLISHED` and `POLICY_RETIRED` audit events exist with actor, `documentKey`, version, timestamp and the change note or reason. |
| X-1 | Version history | S2 + S3 | **Given** `VEHICLE-TNC` with three versions **When** `GET /api/admin/policies/VEHICLE-TNC/versions` **Then** all three are returned newest first, each with `status`, `servingState`, `changeNote`, `createdBy`, `publishedBy/At`, `retiredAt/Reason`. |

Out of scope for X-1 (roadmap): maker-checker second approval before publish; side-by-side diff of two versions.

## 4. Non-functional requirements

| Area | Requirement | Verification (planned) |
|---|---|---|
| Responsiveness (M1-9) | All screens usable at 375 / 768 / 1280 px; no horizontal scroll; keyboard-reachable actions; labelled inputs | Manual check in S3 phase 3; `RoleGuard.test.tsx`, `ApplicationWizard.test.tsx` |
| Validation (D-6) | Zod `parse()` on every request body and query param; money as integer rupees; rates as percent numbers; dates ISO | supertest route test per S1 |
| Error envelope (D-6) | Single shape `{status, code, message, details[], timestamp, path}`; codes `VALIDATION_FAILED` 400, `UNAUTHORIZED` 401, `FORBIDDEN` 403, `NOT_FOUND` 404, `INVALID_STATE` 409, `AI_UNAVAILABLE` 503, `INTERNAL` 500; never a stack trace | `common/errors.ts` `errorHandler` + supertest route test |
| Masking (M2-8) | `maskPii()` (`ai/masking/piiMasker.ts`) applied to LLM prompts, audit `input_json`/`output_json`, and all log lines via the pino serializer in `common/logger.ts` | `piiMasker.test.ts`; log grep in rehearsal |
| Audit (M3-12) | Append-only `audit_event`; every agent step / tool call / LLM call; `durationMs` recorded | `orchestrator.test.ts` asserts event count and order |
| Auth | HS256 JWT, secret from `LL_JWT_SECRET`; backend enforces the permission matrix, frontend only hides | 403 tests |
| Config | No hard-coded keys; `LL_EMBED_API_KEY` (Gemini, always required for embeddings); `LL_AI_API_KEY`, `LL_AI_BASE_URL`, `LL_AI_MODEL` select NIM (`meta/llama-3.1-70b-instruct`) or Gemini (`gemini-2.0-flash`) | `.env.example` |
| AI failure handling | LLM timeout / 4xx / 5xx → `AI_UNAVAILABLE` 503 envelope; agent LLM failure → check `EXCEPTION`, workflow still returns with `requiresHumanApproval: true` | Stubbed-failure test (planned) |
| Determinism (M3-9) | EMI, amortization, obligation ratio only in `core/emi/loanMath.ts`; LLM never receives a request to compute | `loanMath.test.ts` (500000 @ 11 % × 60 = 10871) |
| Performance | Advisor and policy answers target < 10 s on NIM; EMI and catalogue < 200 ms locally | Observed during rehearsal, not benchmarked |
| Portability | `docker compose up` for Postgres+PgVector; embeddings via the Gemini API (`gemini-embedding-001`, 768 d), so the backend hosts no model and fits free/serverless hosts; needs internet + `LL_EMBED_API_KEY` | S1 clean-machine run in phase 3 |

## 5. Out of scope

Explicitly not built; simulated or omitted per the brief's assumptions and `CLAUDE.md`.

- Real customer registration, authentication provider, or KYC verification. Login is seeded users with a JWT; KYC status is a seeded field returned by the mock `get_kyc_status` tool.
- Real credit bureau integration. `get_credit_score` returns seeded scores in the 300–900 range.
- Real income verification. `verify_income` compares declared income against a seeded value.
- Payments, disbursement, and repayment processing. DISBURSED is a simulated status transition.
- Document OCR / content extraction for uploaded identity, address or income proofs. Completeness is checked by `documentType` presence; mismatches use seeded profile data.
- Multi-bank comparison, lead generation, or marketing offers.
- Autonomous approval or rejection by any agent (prohibited by guardrail G-2).
- Any use or storage of protected attributes (prohibited by G-1).
- Production hardening: rate limiting, secrets management, horizontal scaling, object storage for uploads (local disk only), model fine-tuning.
- Multi-language UI; the UI is English, amounts in INR.
