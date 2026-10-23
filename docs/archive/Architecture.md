> Historical development reference. Current submission guide: [SUBMISSION.md](../SUBMISSION.md). Statements about planned or pending work reflect an earlier stage.

# Architecture — LoanLens AI

Technical design for the Kestrel Bank intelligent lending platform. Source of truth is `docs/USECASE.md`; contracts are `openapi.yaml` and `Integration_Contracts.md`. This file describes *how* the three modules are built; `Flow.md` describes the runtime paths, `Rules.md` the coding standards, `Decisions.md` the ADRs, `Phases.md` the delivery plan, and `Preliminary_Design.md` the plain-English version for judges.

**Status: design only. No code exists yet; everything below is planned.**

> **Why not Spring Boot?** The brief *recommends* Spring Boot + Spring AI and *permits* any framework. We chose Node 22 + Express + TypeScript + Prisma + Vercel AI SDK for delivery risk and team skills. Same design, same database, same contract, same guardrails. See `Decisions.md` ADR-0 (arguments + Spring→Node mapping table).

## 1. Solution overview

One Express backend, one React frontend, one PostgreSQL 16 database with pgvector. The three hackathon modules map to backend folders, not to separate services:

| Module (brief) | What it does | Backend folder | Frontend area | Owner |
|---|---|---|---|---|
| **M1 Digital Loan Discovery & Application** | Catalogue, search/filter/sort/compare, EMI + amortization, profile, 4-step application with drafts, uploads, status timeline, role-based nav, **AI Loan Advisor** | `src/core/*` (S1) + `src/ai/advisor` (S2) | `products`, `emi`, `applications`, `advisor` | S1 + S2 + S3 |
| **M2 RAG Lending Policy Assistant** | Ingest PDF/MD/CSV/JSON with metadata, section-aware chunks, Gemini API embeddings, pgvector retrieval with metadata + version-in-force filter (computed at query time), grounded answers with sources, safe not-found, PII masking | `src/ai/rag`, `src/ai/masking` | `chat` (policy), `knowledge` (read-only) | S2 + S3 |
| **X-1 Policy governance** (judge feedback, ADR-18) | POLICY_ADMIN only: upload a new immutable version as DRAFT, preview chunks, test-ask, publish (now or scheduled), retire (rollback), version history, `POLICY_*` audit events | `src/ai/rag/policyAdminService.ts` | `policy-admin` (`/admin/policies`) | S2 + S3 |
| **M3 Agentic Loan Processing** | 5 agents (Document Verification, Credit Assessment, Compliance, Customer Communication, Orchestrator), mock tools, permission guard, HITL, append-only audit trail | `src/ai/agents`, `src/ai/tools`, `src/ai/audit` | `review` (officer / analyst) | S2 + S3 |

Key design stance (see `Decisions.md` #6–#9): the LLM **interprets and explains**; code **decides and computes**. Every number comes from `core/emi/loanMath.ts`; every status change goes through `core/application/service.ts → transition()`; every agent step is written to `audit_event`; the LLM never approves or rejects.

## 2. System diagram

```mermaid
flowchart LR
    U["Customer / Loan Officer / Credit Analyst"]

    subgraph FE["frontend/ - React 19 + Vite + Tailwind v4 (port 5173)"]
        R["React Router pages + RoleGuard"]
        Q["TanStack Query hooks (src/api)"]
        M["MSW mocks (VITE_USE_MOCKS=true only)"]
        R --> Q
        Q -. dev only .-> M
    end

    subgraph BE["backend/ - Node 22 + Express 4 + TypeScript (port 8080)"]
        direction TB
        C["common: requireAuth, requireRole, errorHandler, pino logger, ids"]
        CORE["core: auth, product, emi (loanMath), customer, application, document"]
        RAG["ai/rag: chunker, embeddings, ingest, retriever, policyAssistant"]
        ADV["ai/advisor: advisorService (generateObject + zod)"]
        AG["ai/agents + ai/tools + ai/audit: orchestrator, 4 agents, mockTools, permissionGuard, auditService"]
        MASK["ai/masking: maskPii (prompts, audit, logs)"]
        C --> CORE
        C --> RAG
        C --> ADV
        C --> AG
        RAG --> MASK
        ADV --> MASK
        AG --> MASK
        AG --> CORE
        ADV --> CORE
        AG --> RAG
    end

    subgraph DB["PostgreSQL 16 + pgvector (docker, port 5432)"]
        T1[("core tables: app_user, customer, loan_product, loan_application, status_event, application_document")]
        T2[("kb_document, kb_chunk with vector(768)")]
        T3[("agent_run, audit_event")]
    end

    LLM["LLM endpoint (OpenAI-compatible): NVIDIA NIM llama-3.1-70b or Gemini 2.0 Flash"]
    EMB["Embeddings API: Gemini gemini-embedding-001 via @ai-sdk/google, 768 dims"]
    MOCK["Mock bank services (in-process): credit bureau, income, KYC, application update"]
    FS[("backend/uploads/ local disk")]
    KD[("db/knowledge/ synthetic policy docs")]

    U -->|"HTTPS JSON + Bearer JWT"| R
    Q -->|"REST /api/*"| C
    CORE --> T1
    CORE --> FS
    RAG --> T2
    RAG --> EMB
    RAG --> LLM
    KD -. "npm run ingest" .-> RAG
    ADV --> LLM
    AG --> LLM
    AG --> T3
    AG --> MOCK
```

## 3. Repository layout

Follows `CLAUDE.md` §5 and the ownership in `Team_Work_Split.md`. The backend block is copied from `Integration_Contracts.md` §6 (canonical). There is **no** `db/schema/` or `db/seed/`: the schema is `backend/prisma/schema.prisma` (+ `prisma/migrations/`), the seed is `backend/prisma/seed.ts`, and only the knowledge documents live under `db/`.

```
loanlens/
  CLAUDE.md  README.md  REQUIREMENTS.md
  openapi.yaml                     # contract (shared, PR only)
  Integration_Contracts.md         # shared rules (PR only)
  Preliminary_Design.md            # judge-facing design + process
  Architecture.md  Flow.md  Rules.md  Decisions.md  Phases.md  Team_Work_Split.md
  Design.md  Component_Change_Manual.md   # S3
  Demo_Runbook.md  Submission_Checklist.md  Judge_QA_Playbook.md  Memory.md
  .env.example                     # shared, PR only
  docker-compose.yml               # S1: pgvector/pgvector:pg16
  docs/
    USECASE.md                     # holy grail (do not edit)
    LoanLensAI_Hackathon_Usecase.docx
    ASSUMPTIONS.md                 # one line per assumption
    GUARDRAILS.md                  # S2, P4
    TEST_PROMPTS.md                # S2, P4
    SETUP.md                       # S1
  db/
    knowledge/                     # S2: synthetic bank documents + manifest.json (metadata per file)
      manifest.json
      vehicle-loan-terms-2025.1.md
      vehicle-loan-terms-2026.3.md # two published versions of VEHICLE-TNC (version-in-force rule)
      ...                          # T&C, rate/fee schedule, credit policy, KYC checklist, prepayment,
                                   # grievance, regulatory circulars, officer playbook (INTERNAL)
  backend/
    package.json  tsconfig.json  .env (ignored)  vitest.config.ts
    prisma/schema.prisma   prisma/seed.ts   prisma/migrations/
    uploads/               (git-ignored)
    src/
      index.ts             express app + listen
      app.ts               createApp(): middleware, routes, errorHandler (used by tests)
      config/env.ts        zod-parsed process.env → typed `env`
      common/errors.ts     AppError, errorHandler, notFound
      common/auth.ts       signToken, requireAuth, requireRole('CREDIT_ANALYST')
      common/logger.ts     pino logger with PII masking serializer
      common/ids.ts        newId('LA'|'AUD'|'CUST'|'DOC')
      common/prisma.ts     PrismaClient singleton
      core/auth/           router.ts service.ts
      core/product/        router.ts service.ts schemas.ts
      core/emi/            loanMath.ts router.ts loanMath.test.ts
      core/customer/       router.ts service.ts schemas.ts
      core/application/    router.ts service.ts schemas.ts stateMachine.ts
      core/document/       router.ts service.ts (multer)
      ai/config/llm.ts     createOpenAICompatible({ name: "llm", baseURL: env.LL_AI_BASE_URL, apiKey: env.LL_AI_API_KEY }) → model(env.LL_AI_CHAT_MODEL)
      ai/rag/              chunker.ts embeddings.ts ingest.ts retriever.ts policyAssistant.ts policyAdminService.ts router.ts schemas.ts
      ai/advisor/          advisorService.ts router.ts schemas.ts
      ai/agents/           types.ts documentVerificationAgent.ts creditAssessmentAgent.ts complianceAgent.ts customerCommunicationAgent.ts orchestrator.ts router.ts schemas.ts
      ai/tools/            mockTools.ts permissionGuard.ts
      ai/audit/            auditService.ts router.ts
      ai/masking/          piiMasker.ts piiMasker.test.ts
  frontend/                        # S3; names follow Design.md + Component_Change_Manual.md
    package.json  vite.config.ts (react + @tailwindcss/vite)  tsconfig.json  index.html  .env.development
    src/
      main.tsx  App.tsx
      api/           client.ts  types.ts  auth.ts  products.ts  emi.ts  customers.ts  applications.ts
                     documents.ts  advisor.ts  knowledge.ts  policy.ts  workflow.ts  audit.ts
      routes/        index.tsx (createBrowserRouter)  RoleGuard.tsx  RoleGuard.test.tsx
      components/
        ui/          Button  Card  Money  RoleBadge
        layout/      AppLayout  Nav
        products/    ProductCard  ProductFilters  CompareTable
        emi/         EmiCalculator  EmiTable
        chat/        ChatPanel  SourceChip  ConfidenceBadge
        advisor/     RecommendationCard
        applications/ FormStepper  FileDropzone  StatusTimeline  ApplicationWizard.test.tsx  steps/*
        review/      AgentChecksTable  AuditTrailViewer  DecisionForm
        knowledge/   KnowledgeTable (read-only, policies in force)
        policy-admin/ PolicyLibraryTable  PolicyVersionTimeline  ServingStateBadge  PolicyUploadForm  PolicyPreview  TestAskPanel  PublishDialog  RetireDialog
      pages/         LoginPage  CataloguePage  ComparePage  ProductDetailPage  EmiCalculatorPage  AdvisorPage  PolicyPage
                     ProfilePage  MyApplicationsPage  ApplicationWizardPage  ApplicationStatusPage
                     OfficerQueuePage  KnowledgePage  AnalystReviewPage  ForbiddenPage  NotFoundPage
                     PolicyLibraryPage  PolicyUploadPage  PolicyDetailPage   (POLICY_ADMIN)
      mocks/         browser.ts  handlers.ts      # examples from openapi.yaml
      styles/        index.css (@import "tailwindcss" + tokens)  tokens.css (:root variables + @theme)
      utils/         money.ts (formatInr — formatting only, no maths)
```

Tailwind v4 is CSS-first: there is **no** `tailwind.config`. Brand tokens are CSS variables in `src/styles/tokens.css`, exposed as utilities through an `@theme` block in the same file; the `@tailwindcss/vite` plugin compiles them.

## 4. API endpoints (from `openapi.yaml`)

| Method | Path | Auth | Roles | Owner | Notes |
|---|---|---|---|---|---|
| POST | `/api/auth/login` | none | — | S1 | returns `{token, role, customerId, displayName}` |
| GET | `/api/auth/me` | JWT | all | S1 | |
| GET | `/api/products` | none | — | S1 | `q, loanType, segment, minAmount, maxAmount, sort` |
| GET | `/api/products/{productId}` | none | — | S1 | 404 envelope |
| GET | `/api/products/compare?ids=` | none | — | S1 | 2–4 ids, order preserved |
| POST | `/api/emi/calculate` | none | — | S1 | `loanMath.ts` only; returns `EmiResult` with schedule |
| GET | `/api/customers/me` | JWT | CUSTOMER | S1 | no protected attributes |
| PUT | `/api/customers/me` | JWT | CUSTOMER | S1 | |
| GET | `/api/applications` | JWT | all (customer sees own) | S1 | `?status=` |
| POST | `/api/applications` | JWT | CUSTOMER | S1 | creates DRAFT, 201 |
| GET | `/api/applications/{id}` | JWT | owner / officer / analyst | S1 | includes `timeline`, `latestRecommendation` |
| PUT | `/api/applications/{id}` | JWT | owner, DRAFT only | S1 | save-as-draft any step |
| POST | `/api/applications/{id}/submit` | JWT | owner | S1 | DRAFT → SUBMITTED, validates all steps |
| POST | `/api/applications/{id}/decision` | JWT | CREDIT_ANALYST | S1 | UNDER_REVIEW → APPROVED/REJECTED, human only |
| GET | `/api/applications/{id}/documents` | JWT | owner / officer / analyst | S1 | |
| POST | `/api/applications/{id}/documents` | JWT | owner | S1 | multer, ≤ 5 MB, pdf/jpg/png |
| POST | `/api/advisor/chat` | JWT | all | S2 | `AdvisorResponse` verbatim |
| GET | `/api/knowledge/documents` | JWT | LOAN_OFFICER, CREDIT_ANALYST, POLICY_ADMIN | S2 | read-only: versions in force; no POST (changes go through `/api/admin/policies`) |
| GET | `/api/admin/policies` | JWT | POLICY_ADMIN | S2 | `PolicyLibraryItem[]`, one row per `documentKey` |
| POST | `/api/admin/policies` | JWT | POLICY_ADMIN | S2 | multipart + metadata + `changeNote`; chunks + embeds now; 201 `PolicyVersion` DRAFT; 409 if `(documentKey, version)` exists; `POLICY_DRAFTED` |
| GET | `/api/admin/policies/{documentKey}/versions` | JWT | POLICY_ADMIN | S2 | full history newest first, with computed `servingState` |
| GET | `/api/admin/policies/versions/{documentId}/preview` | JWT | POLICY_ADMIN | S2 | sections exactly as chunked |
| POST | `/api/admin/policies/versions/{documentId}/test-ask` | JWT | POLICY_ADMIN | S2 | `PolicyAnswer` from this version only (works for DRAFT) |
| POST | `/api/admin/policies/versions/{documentId}/publish` | JWT | POLICY_ADMIN | S2 | DRAFT → PUBLISHED; future date = SCHEDULED; 409 if not DRAFT; `POLICY_PUBLISHED` |
| POST | `/api/admin/policies/versions/{documentId}/retire` | JWT | POLICY_ADMIN | S2 | PUBLISHED → RETIRED, `reason` ≥ 5 chars; previous version in force takes over; `POLICY_RETIRED` |
| POST | `/api/policy/ask` | JWT | all | S2 | audience derived from role; `PolicyAnswer` verbatim |
| POST | `/api/workflow/applications/{id}/run` | JWT | LOAN_OFFICER, CREDIT_ANALYST | S2 | 409 if not SUBMITTED; `AgentRecommendation` verbatim |
| GET | `/api/workflow/applications/{id}/recommendation` | JWT | owner / officer / analyst | S2 | latest `agent_run` |
| GET | `/api/audit/{auditTrailId}` | JWT | LOAN_OFFICER, CREDIT_ANALYST | S2 | `AuditTrail` events, masked |

"JWT" = `requireAuth`; "Roles" = `requireRole(...)` middleware from `common/auth.ts`. Every body, query and path param is parsed with a Zod schema before use. Every error on every endpoint is the envelope `{status, code, message, details[], timestamp, path}` produced once by `common/errors.ts → errorHandler` (`Integration_Contracts.md` §3).

## 5. Database schema

Prisma owns all DDL: models in `backend/prisma/schema.prisma`, PascalCase models mapped to snake_case tables with `@@map` / `@map`, every change through `npx prisma migrate dev --name <req-id>`. S1 writes the core models; S2 appends only `KbDocument`, `KbChunk`, `AgentRun`, `AuditEvent` at the bottom of the file, marked `// S2`. The pgvector column is `embedding Unsupported("vector(768)")`; the migration SQL adds `CREATE EXTENSION IF NOT EXISTS vector` and the HNSW index. **No table has gender, religion, caste or marital-status columns (guardrail G-1).**

```mermaid
erDiagram
    app_user {
        varchar username PK
        varchar password_hash
        varchar role "CUSTOMER, LOAN_OFFICER, CREDIT_ANALYST, POLICY_ADMIN"
        varchar customer_id FK "null for staff"
        varchar display_name
    }
    customer {
        varchar customer_id PK "CUST-1001"
        varchar full_name
        varchar email
        varchar phone
        varchar segment "SALARIED, SELF_EMPLOYED, STUDENT"
        varchar employment_type
        int monthly_income "integer rupees"
        int existing_monthly_obligations
        varchar location
        varchar kyc_status "VERIFIED, PENDING, FAILED"
        date date_of_birth
    }
    loan_product {
        varchar product_id PK "VL-204"
        varchar name
        varchar loan_type "PERSONAL, HOME, VEHICLE, EDUCATION"
        text description
        numeric min_interest_rate
        numeric max_interest_rate
        int min_tenure_months
        int max_tenure_months
        int min_amount
        int max_amount
        numeric processing_fee_percent
        int processing_fee_min
        int min_monthly_income
        int min_credit_score
        int max_obligation_ratio_percent
        text_array allowed_segments
        int min_age_years
        int max_age_years
    }
    loan_application {
        varchar application_id PK "LA-2026-00418"
        varchar customer_id FK
        varchar product_id FK "nullable while DRAFT"
        int requested_amount
        int tenure_months
        text purpose
        varchar employment_type
        int monthly_income
        int existing_monthly_obligations
        int current_step "1 to 4"
        varchar status "ApplicationStatus enum"
        int estimated_emi "from loanMath"
        timestamptz created_at
        timestamptz updated_at
    }
    status_event {
        bigint id PK
        varchar application_id FK
        varchar status
        timestamptz at
        varchar by "username or OrchestratorAgent"
        text note
    }
    application_document {
        varchar document_id PK
        varchar application_id FK
        varchar document_type "IDENTITY, ADDRESS, INCOME"
        varchar file_name
        varchar content_type
        int size_bytes
        varchar storage_path "backend/uploads/..."
        timestamptz uploaded_at
    }
    kb_document {
        varchar document_id PK
        varchar document_key "VEHICLE-TNC, unique with version"
        varchar title
        varchar version "2026.3"
        date effective_date
        varchar status "DRAFT, PUBLISHED, RETIRED"
        text change_note
        varchar created_by
        varchar published_by "nullable"
        timestamptz published_at "nullable"
        timestamptz retired_at "nullable"
        text retired_reason "nullable"
        varchar loan_type "LoanTypeOrAll"
        varchar document_type "KnowledgeDocumentType"
        varchar audience "CUSTOMER, INTERNAL"
        varchar customer_segment "CustomerSegmentOrAll"
        varchar source_file
        int chunk_count
        timestamptz ingested_at
    }
    kb_chunk {
        uuid id PK
        varchar document_id FK
        text content "masked"
        jsonb metadata "title, section, version, effectiveDate, loanType, documentType, audience, customerSegment"
        vector embedding "vector(768), HNSW cosine"
    }
    agent_run {
        varchar run_id PK
        varchar application_id FK
        varchar audit_trail_id
        varchar recommendation
        varchar risk_band
        jsonb recommendation_json "full AgentRecommendation"
        boolean requires_human_approval
        timestamptz started_at
        timestamptz completed_at
    }
    audit_event {
        bigint id PK
        varchar audit_trail_id "AUD-2026-77301"
        int sequence
        timestamptz timestamp
        varchar agent
        varchar event_type "AGENT_START to HUMAN_REQUIRED, POLICY_*"
        varchar tool_name "nullable"
        jsonb input_json "masked"
        jsonb output_json "masked"
        int duration_ms
    }

    customer ||--o| app_user : "login for"
    customer ||--o{ loan_application : applies
    loan_product ||--o{ loan_application : "for"
    loan_application ||--o{ status_event : timeline
    loan_application ||--o{ application_document : uploads
    loan_application ||--o{ agent_run : "workflow runs"
    agent_run ||--o{ audit_event : "trail"
    kb_document ||--o{ kb_chunk : chunks
```

Notes:
- Prisma model ↔ table: `AppUser→app_user`, `Customer→customer`, `LoanProduct→loan_product`, `LoanApplication→loan_application`, `StatusEvent→status_event`, `ApplicationDocument→application_document`, `KbDocument→kb_document`, `KbChunk→kb_chunk`, `AgentRun→agent_run`, `AuditEvent→audit_event`.
- `kb_chunk.document_id` is a real FK (`onDelete: Cascade`) because our own code inserts chunks (`$executeRaw` with `pgvector`'s `toSql`). The jsonb `metadata` duplicates the filter fields (audience, loan type, segment) for the `WHERE`; lifecycle fields (`status`, `effective_date`) are read from `kb_document` through the in-force CTE (§7.2), never copied into chunks, so publish/retire touch one row.
- `kb_document`: unique `(document_key, version)`; index `(document_key, status, effective_date)`. PUBLISHED and RETIRED rows are never edited except the retire fields; no row is ever deleted (history). There is no `is_latest` column: the version in force is computed per query (ADR-18).
- Policy admin actions write `audit_event` rows with `event_type` `POLICY_DRAFTED | POLICY_PUBLISHED | POLICY_RETIRED` recording actor, `documentKey`, version and change note or reason (`Integration_Contracts.md` §8a).
- `allowed_segments` is a Postgres `text[]` (Prisma `String[]`).
- `audit_event` and `status_event` are append-only: code never calls `update`/`delete` on them; unique `(audit_trail_id, sequence)`.
- Indexes: `loan_application(customer_id, status)`, `status_event(application_id, at)`, `kb_chunk USING hnsw (embedding vector_cosine_ops)`, `kb_chunk USING gin (metadata)`, `audit_event(audit_trail_id, sequence)`.
- IDs are generated in `common/ids.ts → newId(prefix)` (prefix + year + zero-padded number), so the brief's shapes (`LA-2026-00418`, `AUD-2026-77301`) hold.

## 6. Integrations

| Integration | How | Config | Failure mode |
|---|---|---|---|
| **Chat LLM** | Vercel AI SDK v5. `ai/config/llm.ts` builds one provider with `createOpenAICompatible` pointed at NVIDIA NIM (default) or Gemini's OpenAI-compatible endpoint. `generateObject({ schema: zod })` for structured output, `generateText({ tools })` for agent tool calling. Temperature 0.1. | `LL_AI_BASE_URL`, `LL_AI_API_KEY`, `LL_AI_CHAT_MODEL` | `APICallError`, timeout, or schema failure after one retry → `AppError(503, 'AI_UNAVAILABLE')`. Advisor/policy: no made-up fallback answer. Agents: template wording, check result still computed by code, run still audited. |
| **Embeddings** | `ai/rag/embeddings.ts`: `createGoogleGenerativeAI({ apiKey: env.LL_EMBED_API_KEY }).textEmbeddingModel(env.LL_EMBED_MODEL)` from `@ai-sdk/google`; `embedMany` (documents, `taskType: 'RETRIEVAL_DOCUMENT'`, batches ≤ 100) and `embed` (queries, `taskType: 'RETRIEVAL_QUERY'`), `outputDimensionality: 768`, vectors L2-normalised in code before storing and querying. No model hosted by us. | `LL_EMBED_API_KEY` (Gemini key, required even if chat uses NVIDIA), `LL_EMBED_MODEL=gemini-embedding-001`, `LL_EMBED_DIMENSIONS=768` (must match `vector(768)`) | 429 → wait 2 s, retry once. Any other failure at query time → `AppError(503, 'AI_UNAVAILABLE')` (never answer without retrieval). `npm run ingest` needs internet + key. |
| **Vector store** | Plain pgvector. `ai/rag/retriever.ts` runs one `prisma.$queryRaw` with `embedding <=> $query` (cosine distance) plus a metadata `WHERE`. | top-k 6, similarity threshold (tuned in P1) | DB down → `INTERNAL` 500. |
| **Document parsers** | `pdf-parse` (PDF), raw text (MD), `csv-parse` (CSV, row groups), `JSON.parse` (JSON, top-level keys) inside `ai/rag/ingest.ts`, then `chunker.ts`. | — | Unsupported type → `400 VALIDATION_FAILED`. |
| **Mock bank services** | `ai/tools/mockTools.ts`: AI SDK `tool({ description, inputSchema, execute })` objects backed by deterministic in-memory maps keyed by `customerId` (seeded so CUST-1001 scores 735 / band "720-760", KYC VERIFIED, income verified). Same interface a real service would sit behind. | none | Unknown customer → score 650 / `PENDING` so the flow still runs. |
| **File storage** | `core/document/service.ts` with multer disk storage → `backend/uploads/<applicationId>/<documentId>.<ext>`, randomised name. | `LL_UPLOAD_DIR` (default `./uploads`) | Wrong type / > 5 MB → 400; disk error → 500. |
| **Knowledge seed** | `npm run ingest` = `tsx src/ai/rag/ingest.ts` reads `db/knowledge/manifest.json` and ingests every file not already present (`documentKey + version`) as PUBLISHED by `system`. The same `ingestDocument()` serves `POST /api/admin/policies` (as DRAFT). | `LL_KNOWLEDGE_DIR` (default `../db/knowledge`) | Per-file errors logged; script continues and exits non-zero at the end. |

## 7. Data flows

### 7.1 Module 1 — AI Loan Advisor (`POST /api/advisor/chat`)

```mermaid
sequenceDiagram
    autonumber
    participant FE as AdvisorPage (useAdvisorChat)
    participant R as ai/advisor/router.ts
    participant AS as advisorService.ts
    participant PM as maskPii
    participant PS as core/product/service.ts
    participant LLM as generateObject (NIM or Gemini)
    participant LM as core/emi/loanMath.ts

    FE->>R: {message, conversationId?} + JWT
    R->>R: requireAuth, ChatRequestSchema.parse
    R->>AS: advisorChat(message, conversationId, user)
    AS->>PM: maskPii(message)
    AS->>PS: listProducts() (id, name, type, rate, tenure and amount ranges)
    AS->>LLM: system prompt + compact catalogue + last turns + masked text, schema AdvisorExtractionSchema
    LLM-->>AS: {interpretedRequirement, loanType, purpose, loanAmount, monthlyIncome, maxPreferredEmi, missingFields, clarifyingQuestion}
    alt amount or income missing
        AS-->>R: AdvisorResponse with recommendations [] and clarifyingQuestion
    else
        AS->>AS: candidates = products of that loanType with minAmount <= amount <= maxAmount and segment allowed
        loop each candidate
            AS->>LM: calculateEmi(amount, minInterestRate, tenure) for tenure = minTenure to maxTenure step 12
            AS->>AS: pick smallest tenure with emi <= maxPreferredEmi (else maxTenure)
            AS->>LM: obligationRatioPct(income, existingObligations, emi)
            AS->>AS: eligibilityIndicator from ratio and income vs product rules
            AS->>AS: reason from template "N-month tenure keeps EMI within the limit (about R% of income)"
        end
        AS->>AS: AdvisorResponseSchema.parse(response)
        AS-->>R: AdvisorResponse (brief field names) + conversationId
    end
    R-->>FE: 200 JSON
```

For the brief's sample (₹5 lakh used car, ₹60,000 income, EMI < ₹12,000) the seeded `VL-204` at 11.0 % gives 48 months → ₹12,923 (over the limit) and 60 months → **₹10,871** (within), so the planned answer is VL-204 / 60 / 10871 / `LIKELY_ELIGIBLE`, the brief's numbers. 10,871 / 60,000 ≈ 18 % of income. No number produced by the LLM reaches the response. Conversation turns (last 6 per `conversationId`) are kept in an in-memory `Map` inside `advisorService.ts`.

### 7.2 Module 2 — RAG policy ask (`POST /api/policy/ask`)

```mermaid
sequenceDiagram
    autonumber
    participant FE as PolicyPage (usePolicyAsk)
    participant R as ai/rag/router.ts
    participant PA as policyAssistant.ts
    participant PM as maskPii
    participant RT as retriever.ts
    participant EM as embeddings.ts (Gemini API)
    participant PG as Postgres kb_chunk
    participant LLM as generateObject (NIM or Gemini)

    FE->>R: {question, loanType?, customerSegment?} + JWT
    R->>R: AskSchema.parse; audience = CUSTOMER if role is CUSTOMER else ALL (never from the request)
    R->>PA: askPolicy(question, filters, audience)
    PA->>PM: maskPii(question)
    PA->>RT: retrieve(maskedQuestion, filters, audience)
    RT->>EM: embed(question, RETRIEVAL_QUERY) gives 768 numbers, normalised
    RT->>PG: $queryRaw WITH in_force (one PUBLISHED version per document_key, max effective_date <= today) JOIN kb_chunk WHERE loanType in (X, ALL) AND segment in (S, ALL) AND audience = CUSTOMER (customers only) ORDER BY embedding <=> q LIMIT 6
    PG-->>RT: chunks + metadata (title, section, version, effectiveDate) + distance
    alt no chunk above threshold
        PA-->>R: safe not-found PolicyAnswer (confidence LOW, sources [], followUpRequired true)
    else
        PA->>LLM: "answer ONLY from CONTEXT, else NOT_FOUND" + numbered masked chunks + question, schema GroundedAnswerSchema
        LLM-->>PA: {answer, usedChunkIndexes, confidence, followUpRequired}
        alt answer is NOT_FOUND or usedChunkIndexes empty
            PA-->>R: safe not-found PolicyAnswer
        else
            PA->>PA: sources = distinct (document, section, version, effectiveDate) of used chunks
            PA-->>R: PolicyAnswer (brief field names)
        end
    end
    R-->>FE: 200 JSON
```

**Version in force** (`retriever.ts`, computed on every question, no flag and no cron; `Integration_Contracts.md` §8a, ADR-18):

```sql
WITH in_force AS (
  SELECT DISTINCT ON (document_key) document_id
  FROM kb_document
  WHERE status = 'PUBLISHED' AND effective_date <= CURRENT_DATE
  ORDER BY document_key, effective_date DESC, published_at DESC
)
SELECT c.id, c.content, c.metadata, c.embedding <=> $1 AS distance
FROM kb_chunk c JOIN in_force f ON f.document_id = c.document_id
WHERE <audience / loanType / segment filters on c.metadata>
ORDER BY c.embedding <=> $1
LIMIT 6;
```

DRAFT and RETIRED rows fail `status = 'PUBLISHED'`; a future `effective_date` (SCHEDULED) fails the date test until that day, then wins on its own; retiring the active row lets the next-highest published date win on the next query (rollback). `test-ask` replaces the CTE with `document_id = :id`, so a DRAFT can be checked without being served.

**Ingestion** (`npm run ingest` and `POST /api/admin/policies`, both via `ingestDocument()`): parse file → `chunker.ts` splits on headings (Markdown `#`/`##`, heading-like lines in PDF text, top-level keys for JSON, row groups for CSV) so no chunk spans two sections and each chunk carries `section` = its heading → `maskPii(content)` → `embed` → insert `kb_document` + `kb_chunk` rows in one transaction. Admin uploads land as `status = DRAFT` with `created_by` and `change_note` and write `POLICY_DRAFTED`; `npm run ingest` seeds `db/knowledge/` as PUBLISHED by `system`. Publish and retire (`policyAdminService.ts`) update only the `kb_document` row's lifecycle fields and write `POLICY_PUBLISHED` / `POLICY_RETIRED`; chunks are never re-embedded.

### 7.3 Module 3 — Orchestrator run (`POST /api/workflow/applications/{id}/run`)

```mermaid
sequenceDiagram
    autonumber
    participant FE as AnalystReviewPage (useRunWorkflow)
    participant R as ai/agents/router.ts
    participant OR as orchestrator.ts
    participant AP as core/application/service.ts
    participant AU as auditService.ts
    participant DV as documentVerificationAgent
    participant CA as creditAssessmentAgent
    participant CO as complianceAgent
    participant CC as customerCommunicationAgent
    participant G as guardedTools (permissionGuard)
    participant LLM as generateText (NIM or Gemini)
    participant LM as loanMath.ts

    FE->>R: POST run + JWT
    R->>R: requireRole(LOAN_OFFICER, CREDIT_ANALYST)
    R->>OR: runWorkflow(applicationId, user)
    OR->>AP: getApplication(id), must be SUBMITTED else 409 INVALID_STATE
    OR->>AU: start(applicationId) gives AUD-2026-xxxxx
    OR->>G: update_application(id, UNDER_VERIFICATION) as OrchestratorAgent
    G->>AP: transition(id, UNDER_VERIFICATION, "OrchestratorAgent", note)

    OR->>DV: runDocumentVerificationAgent(ctx)
    DV->>DV: missing = IDENTITY, ADDRESS, INCOME minus uploaded (code)
    DV->>LLM: generateText with guardedTools("DocumentVerificationAgent")
    LLM->>G: verify_income(customerId, declaredIncome)
    DV->>DV: result = INCOMPLETE if missing, FAIL if mismatch, else PASS (code)
    DV-->>OR: {agent, result, detail}

    OR->>CA: runCreditAssessmentAgent(ctx)
    CA->>LLM: generateText with guardedTools("CreditAssessmentAgent")
    LLM->>G: get_credit_score(customerId)
    CA->>LM: calculateEmi + obligationRatioPct
    CA->>CA: PASS if ratio <= product limit and score >= product minimum, else FAIL (code)

    OR->>CO: runComplianceAgent(ctx)
    CO->>LLM: generateText with guardedTools("ComplianceAgent")
    LLM->>G: get_kyc_status and search_policy (audience INTERNAL)
    CO->>CO: PASS if KYC VERIFIED and no exception (code)

    OR->>OR: recommendation, riskBand, requiresHumanApproval = true (code)
    OR->>CC: runCustomerCommunicationAgent(ctx, checks, recommendation)
    CC->>LLM: draft plain-language customerMessage (no new numbers)
    OR->>AU: HUMAN_REQUIRED
    OR->>G: update_application(id, UNDER_REVIEW, summary)
    G->>AP: transition(id, UNDER_REVIEW, "OrchestratorAgent", note)
    OR->>OR: save agent_run (recommendation_json), AU.complete()
    OR-->>R: AgentRecommendation (brief field names, auditTrailId)
    R-->>FE: 200 JSON

    Note over G: Every tool execute checks the allow-list. A call outside it throws AgentPermissionDeniedError, writes PERMISSION_DENIED, check becomes EXCEPTION, run continues (G-4).
    Note over OR,AP: update_application can only move to UNDER_VERIFICATION or UNDER_REVIEW. APPROVED and REJECTED are reachable only through POST /decision by a CREDIT_ANALYST (G-2).
```

Tool calling: each agent gets `guardedTools(agentName)` (all five tools, each `execute` wrapped by the permission check and the audit writer) and calls `generateText({ model, tools, stopWhen: stepCountIs(4) })`. If the model skips a tool the agent needs (a known llama-via-NIM risk), the agent calls the same guarded tool directly, so the outcome never depends on tool-calling reliability. The check `result` is always computed in code from tool outputs and `loanMath.ts`; the LLM only writes the `detail` sentence (template fallback if the LLM is down).

Allow-list (`Integration_Contracts.md` §7): `get_credit_score` → CreditAssessmentAgent; `verify_income` → DocumentVerificationAgent, CreditAssessmentAgent; `get_kyc_status` → ComplianceAgent; `search_policy` → ComplianceAgent; `update_application` → OrchestratorAgent only.

Demo trigger for G-4: a staff-only query flag `?demoPermissionViolation=true` on the run endpoint makes CustomerCommunicationAgent attempt `get_credit_score`; the guard refuses it and writes one `PERMISSION_DENIED` event, deterministically (planned).

### 7.4 Human decision (`POST /api/applications/{id}/decision`)

`core/application/router.ts` → `requireAuth` → `requireRole('CREDIT_ANALYST')` → `DecisionSchema.parse` (`decision`, `reason` ≥ 10 chars) → `service.ts → decide(id, decision, reason, username)` → `stateMachine.ts → assertTransition(UNDER_REVIEW → APPROVED|REJECTED)` → `status_event` row with `by = username`, `note = reason`. No file under `src/ai/` imports `decide()`, and `update_application` refuses those statuses.

## 8. PII masking placement

`ai/masking/piiMasker.ts → maskPii(text: string): string` is one pure function: PAN `[A-Z]{5}[0-9]{4}[A-Z]` → `XXXXX1234X`; Aadhaar 12 digits → `XXXX-XXXX-1234`; account numbers 9–18 digits → last 4 only. It is applied at exactly these points:

| Where | What is masked |
|---|---|
| `advisorService.ts`, `policyAssistant.ts` | user message / question before it enters any prompt |
| `ingest.ts` | chunk content before it is embedded and stored (raw digits never sit in `kb_chunk`) |
| `retriever.ts` | retrieved chunk text before it is placed in the prompt (defence in depth) |
| `auditService.ts → record()` | every tool input/output and LLM prompt/result before it is written to `audit_event` |
| `common/logger.ts` | pino `formatters.log` / serializers run `maskPii()` over every log line, so **all** logs are masked no matter who logged |

Not masked: API responses to the authenticated owner (core tables have no PAN/Aadhaar/account columns; data is synthetic). Order matters: mask first, then embed, prompt or log.

## 9. Configuration

All backend config is read once in `src/config/env.ts`, which parses `process.env` with a Zod schema (dev defaults where safe) and exports a typed `env`; the app fails fast on a missing required value. `.env.example` is the shared source; copy it to `.env`.

| Env var | Default | Used by | Purpose |
|---|---|---|---|
| `DATABASE_URL` | `postgresql://loanlens:loanlens@localhost:5432/loanlens` | Prisma | matches `docker-compose.yml` |
| `LL_AI_BASE_URL` | `https://integrate.api.nvidia.com/v1` | `ai/config/llm.ts` | OpenAI-compatible chat endpoint (Gemini: `https://generativelanguage.googleapis.com/v1beta/openai`) |
| `LL_AI_API_KEY` | — (required) | `ai/config/llm.ts` | provider key; never committed |
| `LL_AI_CHAT_MODEL` | `meta/llama-3.1-70b-instruct` | `ai/config/llm.ts` | Gemini fallback: `gemini-2.0-flash` |
| `LL_EMBED_API_KEY` | — (required) | `ai/rag/embeddings.ts` | Gemini key from aistudio.google.com; required even if chat uses NVIDIA; never committed |
| `LL_EMBED_MODEL` | `gemini-embedding-001` | `ai/rag/embeddings.ts` | Gemini embedding model |
| `LL_EMBED_DIMENSIONS` | `768` | `embeddings.ts` (`outputDimensionality` + assert) | must equal `vector(768)` |
| `LL_JWT_SECRET` | `dev-only-change-me` | `common/auth.ts` (HS256) | |
| `LL_SERVER_PORT` | `8080` | `index.ts` | |
| `LL_UPLOAD_DIR` | `./uploads` (default in `env.ts`, not in `.env.example`) | `core/document` | application documents |
| `LL_KNOWLEDGE_DIR` | `../db/knowledge` (default in `env.ts`) | `ai/rag/ingest.ts` | `npm run ingest` source |
| `LL_CORS_ORIGINS` | `http://localhost:5173` (default in `env.ts`) | `app.ts` (`cors`) | allow-list |
| `VITE_API_BASE_URL` | `http://localhost:8080` | `src/api/client.ts` | |
| `VITE_USE_MOCKS` | `false` (frontend `.env.development`) | `src/main.tsx` | start MSW when `true`; never in the demo build |

Fixed in code (not env): LLM temperature 0.1; one `generateObject` retry; retrieval top-k 6; upload limit 5 MB, pdf/jpg/png; pino `level` from `NODE_ENV`.
