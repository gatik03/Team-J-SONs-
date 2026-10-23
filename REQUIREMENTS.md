# Requirements Traceability — derived from `docs/USECASE.md`

Every line below comes from the brief. Tick a box only when it works end to end, and write the file path or test that proves it after the `→`.

## Module 1 — Digital Loan Discovery & Application

- [x] M1-1 Loan product catalogue: personal, home, vehicle, education → backend/prisma/seed.ts, backend/src/core/product/service.ts
- [x] M1-2 Product search, filtering, sorting, and comparison → backend/src/core/product/router.ts, backend/src/core/product/service.ts, backend/src/core/product/router.test.ts
- [x] M1-3 EMI calculator with amortization schedule → backend/src/core/emi/loanMath.ts, backend/src/core/emi/router.ts, backend/src/core/emi/loanMath.test.ts
- [x] M1-4 Customer login and profile (employment type, income, existing obligations) → backend/src/core/auth/router.ts, backend/src/core/customer/router.ts, backend/src/core/customer/service.ts
- [x] M1-5 Multi-step loan application with save-as-draft → backend/src/core/application/router.ts, backend/src/core/application/service.ts, backend/src/core/application/router.test.ts
- [x] M1-6 Document upload (identity, address, income proof) → backend/src/core/document/router.ts, backend/src/core/document/service.ts
- [x] M1-7 Application status tracker with timeline → backend/src/core/application/service.ts, backend/prisma/schema.prisma
- [x] M1-8 Role-based navigation: Customer, Loan Officer, Credit Analyst → backend/src/common/auth.ts, backend/src/core/application/router.ts
- [x] M1-9 Responsive UI → `frontend/src/pages/`, `frontend/src/routes/RoleGuard.test.tsx`, `frontend/src/pages/ApplicationWizard.test.tsx`; live flows and responsive proof in `docs/evidence/browser-qa.json` and `responsive-qa.json`

### AI Loan Advisor
- [x] M1-10 Understands intent from natural language → `backend/src/ai/advisor/advisorService.test.ts`; live response in `docs/TEST_PROMPTS.md` and `docs/evidence/live-ai-browser-qa.json`
- [x] M1-11 Extracts amount, purpose, income, EMI preference → `backend/src/ai/advisor/advisorService.test.ts`; live response in `docs/TEST_PROMPTS.md` and `docs/evidence/live-ai-browser-qa.json`
- [x] M1-12 Recommends suitable products and tenure → `backend/src/ai/advisor/advisorService.test.ts`; live response in `docs/TEST_PROMPTS.md` and `docs/evidence/live-ai-browser-qa.json`
- [x] M1-13 Explains the recommendation and gives an eligibility indicator → `backend/src/ai/advisor/advisorService.test.ts`; live response in `docs/TEST_PROMPTS.md` and `docs/evidence/live-ai-browser-qa.json`
- [x] M1-14 Asks a clarifying question when key information is missing → `backend/src/ai/advisor/advisorService.test.ts`; live response in `docs/TEST_PROMPTS.md` and `docs/evidence/live-ai-browser-qa.json`
- [x] M1-15 Response matches the brief's JSON (`interpretedRequirement`, `loanAmount`, `monthlyIncome`, `maxPreferredEmi`, `currency`, `recommendations[]` with `productId`, `productName`, `indicativeInterestRate`, `tenureMonths`, `estimatedEmi`, `reason`, `eligibilityIndicator`; plus `disclaimer`, `clarifyingQuestion`) → `backend/src/ai/advisor/advisorService.test.ts`; live response in `docs/TEST_PROMPTS.md` and `docs/evidence/live-ai-browser-qa.json`
- [x] M1-16 Sample query works: "I need ₹5 lakh for a used car. I earn ₹60,000 per month and want an EMI below ₹12,000." → `backend/src/ai/advisor/advisorService.test.ts`; live response in `docs/TEST_PROMPTS.md` and `docs/evidence/live-ai-browser-qa.json`

## Module 2 — RAG-Based Lending Policy Assistant

- [x] M2-1 Document upload and ingestion: PDF, Markdown, CSV, JSON → `backend/src/ai/rag/` parser/embedding/retrieval/assistant tests; real ingest and answers in `docs/TEST_PROMPTS.md`; live governance in `docs/evidence/live-ai-browser-qa.json`
- [x] M2-2 Section-aware chunking → `backend/src/ai/rag/` parser/embedding/retrieval/assistant tests; real ingest and answers in `docs/TEST_PROMPTS.md`; live governance in `docs/evidence/live-ai-browser-qa.json`
- [x] M2-3 Embedding generation and vector storage with metadata → `backend/src/ai/rag/` parser/embedding/retrieval/assistant tests; real ingest and answers in `docs/TEST_PROMPTS.md`; live governance in `docs/evidence/live-ai-browser-qa.json`
- [x] M2-4 Metadata filtering by loan type, effective date, customer segment, document type, audience (customer or internal) → `backend/src/ai/rag/` parser/embedding/retrieval/assistant tests; real ingest and answers in `docs/TEST_PROMPTS.md`; live governance in `docs/evidence/live-ai-browser-qa.json`
- [x] M2-5 Retrieval of the latest effective version when multiple versions exist → `backend/src/ai/rag/` parser/embedding/retrieval/assistant tests; real ingest and answers in `docs/TEST_PROMPTS.md`; live governance in `docs/evidence/live-ai-browser-qa.json`
- [x] M2-6 Grounded answer with source title, section, and version → `backend/src/ai/rag/` parser/embedding/retrieval/assistant tests; real ingest and answers in `docs/TEST_PROMPTS.md`; live governance in `docs/evidence/live-ai-browser-qa.json`
- [x] M2-7 Safe response when supporting information is not found → `backend/src/ai/rag/` parser/embedding/retrieval/assistant tests; real ingest and answers in `docs/TEST_PROMPTS.md`; live governance in `docs/evidence/live-ai-browser-qa.json`
- [x] M2-8 Masking of PAN, Aadhaar, account numbers in prompts **and** logs → `backend/src/ai/rag/` parser/embedding/retrieval/assistant tests; real ingest and answers in `docs/TEST_PROMPTS.md`; live governance in `docs/evidence/live-ai-browser-qa.json`
- [x] M2-9 Response matches the brief's JSON (`answer`, `confidence`, `sources[]` with `document`, `section`, `version`, `effectiveDate`; `followUpRequired`) → `backend/src/ai/rag/` parser/embedding/retrieval/assistant tests; real ingest and answers in `docs/TEST_PROMPTS.md`; live governance in `docs/evidence/live-ai-browser-qa.json`
- [x] M2-10 Internal-audience documents (e.g. loan officer playbooks) are not served to customers → `backend/src/ai/rag/` parser/embedding/retrieval/assistant tests; real ingest and answers in `docs/TEST_PROMPTS.md`; live governance in `docs/evidence/live-ai-browser-qa.json`

### Knowledge base documents to seed (synthetic)
- [x] M2-K1 Loan product terms and conditions → `db/knowledge/manifest.json` and its 12 ingested versions; PDF/MD/CSV/JSON checks in `backend/src/ai/rag/ingest.test.ts`
- [x] M2-K2 Interest rate and fee schedules → `db/knowledge/manifest.json` and its 12 ingested versions; PDF/MD/CSV/JSON checks in `backend/src/ai/rag/ingest.test.ts`
- [x] M2-K3 Credit policy and eligibility criteria → `db/knowledge/manifest.json` and its 12 ingested versions; PDF/MD/CSV/JSON checks in `backend/src/ai/rag/ingest.test.ts`
- [x] M2-K4 KYC and document checklists → `db/knowledge/manifest.json` and its 12 ingested versions; PDF/MD/CSV/JSON checks in `backend/src/ai/rag/ingest.test.ts`
- [x] M2-K5 Prepayment and foreclosure policy → `db/knowledge/manifest.json` and its 12 ingested versions; PDF/MD/CSV/JSON checks in `backend/src/ai/rag/ingest.test.ts`
- [x] M2-K6 Grievance redressal procedure → `db/knowledge/manifest.json` and its 12 ingested versions; PDF/MD/CSV/JSON checks in `backend/src/ai/rag/ingest.test.ts`
- [x] M2-K7 Regulatory circular summaries → `db/knowledge/manifest.json` and its 12 ingested versions; PDF/MD/CSV/JSON checks in `backend/src/ai/rag/ingest.test.ts`
- [x] M2-K8 Loan officer playbooks (internal) → `db/knowledge/manifest.json` and its 12 ingested versions; PDF/MD/CSV/JSON checks in `backend/src/ai/rag/ingest.test.ts`
- [x] M2-K9 At least one document with two versions, to demonstrate M2-5 → `db/knowledge/manifest.json` and its 12 ingested versions; PDF/MD/CSV/JSON checks in `backend/src/ai/rag/ingest.test.ts`

### Brief's example questions (all must answer correctly)
- [x] M2-Q1 What documents do I need for a home loan if I am self-employed? → observed Q1 answer and sources in `docs/TEST_PROMPTS.md`
- [x] M2-Q2 What is the processing fee for a personal loan of ₹3 lakh? → observed Q2 answer and sources in `docs/TEST_PROMPTS.md`
- [x] M2-Q3 Can I foreclose my vehicle loan after six months, and are there any charges? → observed Q3 answer and sources in `docs/TEST_PROMPTS.md`
- [x] M2-Q4 What is the minimum credit score required for a home loan? → observed Q4 answer and sources in `docs/TEST_PROMPTS.md`
- [x] M2-Q5 How long does disbursal take after approval? → observed Q5 answer and sources in `docs/TEST_PROMPTS.md`

## Module 3 — Agentic Loan Processing Workflow

- [x] M3-1 At least three agents implemented (target: Document Verification, Credit Assessment, Compliance, plus Orchestrator and Customer Communication) → `backend/src/ai/agents/`, `tools/permissionGuard.test.ts`, `testing/fullStack.test.ts`; live new-application workflow and persisted audit in `docs/evidence/browser-qa.json`
- [x] M3-2 Document Verification Agent: completeness check; flags mismatches in name, income, address → `backend/src/ai/agents/`, `tools/permissionGuard.test.ts`, `testing/fullStack.test.ts`; live new-application workflow and persisted audit in `docs/evidence/browser-qa.json`
- [x] M3-3 Credit Assessment Agent: applies policy rules (income-to-obligation ratio, credit score band) via tools and explains the result → `backend/src/ai/agents/`, `tools/permissionGuard.test.ts`, `testing/fullStack.test.ts`; live new-application workflow and persisted audit in `docs/evidence/browser-qa.json`
- [x] M3-4 Compliance Agent: checks KYC status and policy exceptions using the RAG knowledge base → `backend/src/ai/agents/`, `tools/permissionGuard.test.ts`, `testing/fullStack.test.ts`; live new-application workflow and persisted audit in `docs/evidence/browser-qa.json`
- [x] M3-5 Customer Communication Agent: drafts plain-language status updates / additional-info requests → `backend/src/ai/agents/`, `tools/permissionGuard.test.ts`, `testing/fullStack.test.ts`; live new-application workflow and persisted audit in `docs/evidence/browser-qa.json`
- [x] M3-6 Orchestrator Agent: routes between agents and decides when to involve a human → `backend/src/ai/agents/`, `tools/permissionGuard.test.ts`, `testing/fullStack.test.ts`; live new-application workflow and persisted audit in `docs/evidence/browser-qa.json`
- [x] M3-7 Orchestration via Spring AI tool calling (or equivalent) → `backend/src/ai/agents/`, `tools/permissionGuard.test.ts`, `testing/fullStack.test.ts`; live new-application workflow and persisted audit in `docs/evidence/browser-qa.json`
- [x] M3-8 Mock tools: credit bureau score, income verification, KYC status, application update → `backend/src/ai/agents/`, `tools/permissionGuard.test.ts`, `testing/fullStack.test.ts`; live new-application workflow and persisted audit in `docs/evidence/browser-qa.json`
- [x] M3-9 Deterministic calculations (EMI, income-to-obligation ratio) done by code, not the LLM → backend/src/core/emi/loanMath.ts, loanMath.test.ts
- [x] M3-10 Human-in-the-loop approval for borderline, high-value, policy-exception cases → `backend/src/ai/agents/`, `tools/permissionGuard.test.ts`, `testing/fullStack.test.ts`; live new-application workflow and persisted audit in `docs/evidence/browser-qa.json`
- [x] M3-11 Role-based permissions for tools and actions → `backend/src/ai/agents/`, `tools/permissionGuard.test.ts`, `testing/fullStack.test.ts`; live new-application workflow and persisted audit in `docs/evidence/browser-qa.json`
- [x] M3-12 Audit trail records every agent step, tool call, input, output, timestamp → `backend/src/ai/agents/`, `tools/permissionGuard.test.ts`, `testing/fullStack.test.ts`; live new-application workflow and persisted audit in `docs/evidence/browser-qa.json`
- [x] M3-13 Output matches the brief's JSON (`applicationId`, `recommendation`, `riskBand`, `checks[]` with `agent`, `result`, `detail`; `missingDocuments`, `customerMessage`, `requiresHumanApproval`, `auditTrailId`) → `backend/src/ai/agents/`, `tools/permissionGuard.test.ts`, `testing/fullStack.test.ts`; live new-application workflow and persisted audit in `docs/evidence/browser-qa.json`
- [x] M3-14 Example scenario works: ₹5 lakh personal loan, salary slips + bank statement, address proof missing → `backend/src/ai/agents/`, `tools/permissionGuard.test.ts`, `testing/fullStack.test.ts`; live new-application workflow and persisted audit in `docs/evidence/browser-qa.json`

### Guardrails
- [x] G-1 Protected attributes never used in decision logic → backend/prisma/schema.prisma (no demographic columns), backend/src/core/customer/schemas.ts
- [x] G-2 No autonomous approve/reject; agents only recommend → backend/src/core/application/router.ts (CREDIT_ANALYST human only)
- [x] G-3 Plain-language reason for every recommendation → `backend/src/ai/agents/orchestrator.test.ts`, `tools/permissionGuard.test.ts`, `testing/fullStack.test.ts`; role guards and live workflow in `docs/evidence/browser-qa.json`
- [x] G-4 Out-of-permission actions refused **and** logged → `backend/src/ai/agents/orchestrator.test.ts`, `tools/permissionGuard.test.ts`, `testing/fullStack.test.ts`; role guards and live workflow in `docs/evidence/browser-qa.json`

## Business assumptions the data model must honour

- [x] B-1 Customer segments: Salaried, Self-employed, Student → backend/prisma/schema.prisma, backend/src/core/product/schemas.ts
- [x] B-2 Customer profile: income, employment type, location, existing obligations → backend/prisma/schema.prisma, backend/src/core/customer/schemas.ts
- [x] B-3 Product fields: Product ID, name and loan type, interest rate range, tenure range, min and max amount, processing fee, eligibility criteria → backend/prisma/schema.prisma, backend/src/core/product/schemas.ts
- [x] B-4 Application statuses: Draft, Submitted, Under Verification, Under Review, Approved, Rejected, Disbursed → backend/src/core/application/stateMachine.ts, stateMachine.test.ts
- [x] B-5 Credit scores range 300–900 → backend/prisma/seed.ts, backend/src/core/product/schemas.ts
- [x] B-6 Knowledge-base document metadata: Version, Effective Date, Loan Type, Document Type, Audience → `backend/src/ai/rag/ingest.ts`, `db/knowledge/manifest.json`, `retriever.test.ts`
- [x] B-7 Synthetic data only; payments and disbursement simulated → backend/prisma/seed.ts

## Deliverables

- [x] D-1 Working application and source code → docker-compose.yml, backend/src/index.ts
- [x] D-2 Architecture diagram and solution overview (`docs/archive/Architecture.md` + `docs/archive/Preliminary_Design.md`) → `docs/archive/Architecture.md`, `docs/archive/Preliminary_Design.md`; integrated S1/S2/S3 runtime described in `docs/archive/HANDOFF.md`
- [x] D-3 Setup instructions (`docs/SETUP.md`) → docs/SETUP.md
- [x] D-4 Live demonstration of key capabilities (demo script) → live UI rehearsals: `docs/evidence/browser-qa.json`, `live-ai-browser-qa.json`, screenshots and `production-smoke.json`
- [x] D-5 Proper schema design (`backend/prisma/schema.prisma` + migrations) → backend/prisma/schema.prisma, backend/prisma/migrations/20261023085735_init/migration.sql
- [x] D-6 Proper validation and error handling → backend/src/common/errors.ts, backend/src/common/auth.ts, backend/src/config/env.ts
- [x] D-7 Clean folder structure → backend/package.json, backend/tsconfig.json, backend/src/
- [x] D-8 Seed data scripts and the list of test prompts used in the demo (`backend/prisma/seed.ts`, `docs/TEST_PROMPTS.md`) → backend/prisma/seed.ts
- [x] D-9 Short note on AI guardrails, known limitations, responsible-AI decisions (`docs/GUARDRAILS.md`) → `docs/GUARDRAILS.md`, backed by 103 backend tests and recorded live runs

## Extensions (judge feedback)

- [x] X-1 Policy Admin role: draft → `frontend/src/pages/PolicyDetailPage.test.tsx`, real browser draft/test-ask/publish/retire in `docs/evidence/live-ai-browser-qa.json`; server scheduled/rollback tests
