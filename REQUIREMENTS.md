# Requirements Traceability — derived from `docs/USECASE.md`

Every line below comes from the brief. Tick a box only when it works end to end, and write the file path or test that proves it after the `→`.

## Module 1 — Digital Loan Discovery & Application

- [ ] M1-1 Loan product catalogue: personal, home, vehicle, education →
- [ ] M1-2 Product search, filtering, sorting, and comparison →
- [ ] M1-3 EMI calculator with amortization schedule →
- [ ] M1-4 Customer login and profile (employment type, income, existing obligations) →
- [ ] M1-5 Multi-step loan application with save-as-draft →
- [ ] M1-6 Document upload (identity, address, income proof) →
- [ ] M1-7 Application status tracker with timeline →
- [ ] M1-8 Role-based navigation: Customer, Loan Officer, Credit Analyst →
- [ ] M1-9 Responsive UI →

### AI Loan Advisor
- [ ] M1-10 Understands intent from natural language →
- [ ] M1-11 Extracts amount, purpose, income, EMI preference →
- [ ] M1-12 Recommends suitable products and tenure →
- [ ] M1-13 Explains the recommendation and gives an eligibility indicator →
- [ ] M1-14 Asks a clarifying question when key information is missing →
- [ ] M1-15 Response matches the brief's JSON (`interpretedRequirement`, `loanAmount`, `monthlyIncome`, `maxPreferredEmi`, `currency`, `recommendations[]` with `productId`, `productName`, `indicativeInterestRate`, `tenureMonths`, `estimatedEmi`, `reason`, `eligibilityIndicator`; plus `disclaimer`, `clarifyingQuestion`) →
- [ ] M1-16 Sample query works: "I need ₹5 lakh for a used car. I earn ₹60,000 per month and want an EMI below ₹12,000." →

## Module 2 — RAG-Based Lending Policy Assistant

- [ ] M2-1 Document upload and ingestion: PDF, Markdown, CSV, JSON →
- [ ] M2-2 Section-aware chunking →
- [ ] M2-3 Embedding generation and vector storage with metadata →
- [ ] M2-4 Metadata filtering by loan type, effective date, customer segment, document type, audience (customer or internal) →
- [ ] M2-5 Retrieval of the latest effective version when multiple versions exist →
- [ ] M2-6 Grounded answer with source title, section, and version →
- [ ] M2-7 Safe response when supporting information is not found →
- [ ] M2-8 Masking of PAN, Aadhaar, account numbers in prompts **and** logs →
- [ ] M2-9 Response matches the brief's JSON (`answer`, `confidence`, `sources[]` with `document`, `section`, `version`, `effectiveDate`; `followUpRequired`) →
- [ ] M2-10 Internal-audience documents (e.g. loan officer playbooks) are not served to customers →

### Knowledge base documents to seed (synthetic)
- [ ] M2-K1 Loan product terms and conditions →
- [ ] M2-K2 Interest rate and fee schedules →
- [ ] M2-K3 Credit policy and eligibility criteria →
- [ ] M2-K4 KYC and document checklists →
- [ ] M2-K5 Prepayment and foreclosure policy →
- [ ] M2-K6 Grievance redressal procedure →
- [ ] M2-K7 Regulatory circular summaries →
- [ ] M2-K8 Loan officer playbooks (internal) →
- [ ] M2-K9 At least one document with two versions, to demonstrate M2-5 →

### Brief's example questions (all must answer correctly)
- [ ] M2-Q1 What documents do I need for a home loan if I am self-employed? →
- [ ] M2-Q2 What is the processing fee for a personal loan of ₹3 lakh? →
- [ ] M2-Q3 Can I foreclose my vehicle loan after six months, and are there any charges? →
- [ ] M2-Q4 What is the minimum credit score required for a home loan? →
- [ ] M2-Q5 How long does disbursal take after approval? →

## Module 3 — Agentic Loan Processing Workflow

- [ ] M3-1 At least three agents implemented (target: Document Verification, Credit Assessment, Compliance, plus Orchestrator and Customer Communication) →
- [ ] M3-2 Document Verification Agent: completeness check; flags mismatches in name, income, address →
- [ ] M3-3 Credit Assessment Agent: applies policy rules (income-to-obligation ratio, credit score band) via tools and explains the result →
- [ ] M3-4 Compliance Agent: checks KYC status and policy exceptions using the RAG knowledge base →
- [ ] M3-5 Customer Communication Agent: drafts plain-language status updates / additional-info requests →
- [ ] M3-6 Orchestrator Agent: routes between agents and decides when to involve a human →
- [ ] M3-7 Orchestration via Spring AI tool calling (or equivalent) →
- [ ] M3-8 Mock tools: credit bureau score, income verification, KYC status, application update →
- [ ] M3-9 Deterministic calculations (EMI, income-to-obligation ratio) done by code, not the LLM →
- [ ] M3-10 Human-in-the-loop approval for borderline, high-value, policy-exception cases →
- [ ] M3-11 Role-based permissions for tools and actions →
- [ ] M3-12 Audit trail records every agent step, tool call, input, output, timestamp →
- [ ] M3-13 Output matches the brief's JSON (`applicationId`, `recommendation`, `riskBand`, `checks[]` with `agent`, `result`, `detail`; `missingDocuments`, `customerMessage`, `requiresHumanApproval`, `auditTrailId`) →
- [ ] M3-14 Example scenario works: ₹5 lakh personal loan, salary slips + bank statement, address proof missing → `REQUEST_ADDITIONAL_DOCUMENTS` →

### Guardrails
- [ ] G-1 Protected attributes never used in decision logic →
- [ ] G-2 No autonomous approve/reject; agents only recommend →
- [ ] G-3 Plain-language reason for every recommendation →
- [ ] G-4 Out-of-permission actions refused **and** logged →

## Business assumptions the data model must honour

- [ ] B-1 Customer segments: Salaried, Self-employed, Student →
- [ ] B-2 Customer profile: income, employment type, location, existing obligations →
- [ ] B-3 Product fields: Product ID, name and loan type, interest rate range, tenure range, min and max amount, processing fee, eligibility criteria →
- [ ] B-4 Application statuses: Draft, Submitted, Under Verification, Under Review, Approved, Rejected, Disbursed →
- [ ] B-5 Credit scores range 300–900 →
- [ ] B-6 Knowledge-base document metadata: Version, Effective Date, Loan Type, Document Type, Audience →
- [ ] B-7 Synthetic data only; payments and disbursement simulated →

## Deliverables

- [ ] D-1 Working application and source code →
- [ ] D-2 Architecture diagram and solution overview (`Architecture.md` + `Preliminary_Design.md`) →
- [ ] D-3 Setup instructions (`docs/SETUP.md`) →
- [ ] D-4 Live demonstration of key capabilities (demo script) →
- [ ] D-5 Proper schema design (`backend/prisma/schema.prisma` + migrations) →
- [ ] D-6 Proper validation and error handling →
- [ ] D-7 Clean folder structure →
- [ ] D-8 Seed data scripts and the list of test prompts used in the demo (`backend/prisma/seed.ts`, `docs/TEST_PROMPTS.md`) →
- [ ] D-9 Short note on AI guardrails, known limitations, responsible-AI decisions (`docs/GUARDRAILS.md`) →

## Extensions (judge feedback)

- [ ] X-1 Policy Admin role: draft → preview → test-ask → publish (immediate or scheduled) → retire/rollback, full version history, `POLICY_*` audit events (Integration_Contracts §8a, Decisions ADR-18) →
