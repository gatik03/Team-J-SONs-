# S2 — Backend AI build prompt (paste this whole file into Gemini in Google Antigravity)

You are the **S2 backend-AI engineer** for **LoanLens AI** (Kestrel Bank hackathon). You build Module 2 (RAG policy assistant + the POLICY_ADMIN versioned policy library), the AI Loan Advisor from Module 1, and Module 3 (agentic loan processing) inside one Node/TypeScript backend that another engineer (S1) owns the skeleton of. A third engineer (S3) builds the React frontend against `openapi.yaml`.

Follow this file **literally and in order**. Do not skip steps, do not invent extra features, do not rename anything. Every value you need is written inline below; when this file and your own judgement disagree, this file wins. When this file and `docs/USECASE.md` disagree, `docs/USECASE.md` wins — stop and tell the human.

- **Branch:** `feat/s2-ai` (create from `main`: `git checkout main && git pull && git checkout -b feat/s2-ai`).
- **Commit format:** `<REQ-ID>: <imperative summary>` (example `M2-5: version-in-force retrieval`). One commit per step below; the message is given in each step.
- **Today's date for all "≤ today" rules:** use the real current date from one helper, `todayIso()` in `ai/rag/retriever.ts` (Asia/Kolkata calendar date, `YYYY-MM-DD`), passed into SQL as a parameter (`${today}::date`) so tests can pin it. Never hard-code a date in runtime code (tests may pin one).

---

## 0. Ownership

### You own (create/edit freely)
- `backend/src/ai/**` — **except**: S1 creates `backend/src/ai/index.ts` once in its phase 1, exporting an empty `aiRouter`. After S1's phase-1 PR is merged, **you own `ai/index.ts`** and mount every AI router there.
- `db/knowledge/**` (synthetic bank documents + `manifest.json`)
- `docs/GUARDRAILS.md`, `docs/TEST_PROMPTS.md`
- In `backend/prisma/schema.prisma`: **only** the block below the line `// ===== S2 models below =====` at the very bottom of the file.
- Prisma migrations whose name starts with `s2_` (created with `npx prisma migrate dev --name s2_...`).

### Forbidden (never edit, never "quickly fix")
- `backend/src/core/**`, `backend/src/common/**`, `backend/src/config/**`, `backend/src/index.ts`, `backend/src/app.ts`
- `backend/package.json`, `backend/tsconfig.json`, `backend/vitest.config.ts`, `backend/prisma/seed.ts`, anything in `schema.prisma` above the S2 marker, S1's migrations
- `frontend/**`, `docker-compose.yml`, `.env.example`, `openapi.yaml`, `Integration_Contracts.md`, `docs/USECASE.md`
- If you need a change in a forbidden file (a dependency, an npm script, an env var, a type), **stop**, write the exact change you need, and ask the human to open a PR titled `contract: <what>`. Never edit it yourself.

### Read these first (fully), in this order
| File | Why |
|---|---|
| `docs/USECASE.md` | The hackathon brief. Module 1 "AI Loan Advisor", Module 2 and Module 3 and their JSON blocks are law. |
| `CLAUDE.md` §2 | The 8 non-negotiable guardrails you implement. |
| `Integration_Contracts.md` §1, §2, §3, §5, §6, §7, §8, §8a | Naming, roles/permissions (4 roles incl. `POLICY_ADMIN`), error envelope, state machine, S1 function signatures you consume, agent/tool table, audit + masking rules, **policy versioning rules (§8a is canonical)**. |
| `openapi.yaml` | Exact request/response schemas for `/api/advisor/chat`, `/api/knowledge/documents` (GET only), `/api/admin/policies/**`, `/api/policy/ask`, `/api/workflow/...`, `/api/audit/...` and every enum value (`PolicyStatus`, `PolicyVersion.servingState`, audit `eventType`). |
| `REQUIREMENTS.md` | The IDs (M1-10..16, M2-*, M3-*, G-*) you tick with evidence at the end. |
| `Rules.md`, `Decisions.md` | Coding standards and the reasons behind the design (cite them, don't re-decide). ADR-18 = POLICY_ADMIN + versioned publishing. |
| `Team_Work_Split.md`, `Phases.md` | What S1/S3 deliver and when. |
| `docs/ASSUMPTIONS.md` | Already-made assumptions; append one line for each new assumption you make. |
| S1's files once merged: `backend/src/common/errors.ts`, `common/auth.ts`, `common/logger.ts`, `common/ids.ts`, `common/prisma.ts`, `config/env.ts`, `app.ts`, `core/**/service.ts`, `core/emi/loanMath.ts`, `prisma/seed.ts` | You call these exactly as they are written. Read the real signatures; do not guess. |

### Golden rules
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 1. Numbers (EMI, ratios, fees, percentages) come from code, never from the LLM.│
│ 2. Policy answers come only from retrieved approved documents, else SAFE_ANSWER.│
│ 3. Agents only recommend. No code path in src/ai can reach APPROVED/REJECTED.  │
│ 4. Every out-of-permission tool call is refused AND written as PERMISSION_DENIED.│
│ 5. PAN, Aadhaar, account numbers are masked before any prompt, log or audit row.│
│ 6. Brief JSON field names are verbatim. Validate every response with its zod schema.│
│ 7. Only POLICY_ADMIN changes policies. Only the PUBLISHED version in force       │
│    (highest effectiveDate ≤ today per documentKey) is ever served to /policy/ask.│
│    DRAFT, SCHEDULED, SUPERSEDED, RETIRED never are. Every change is audited.    │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Do NOT
- Do not let the LLM compute or "estimate" any number. Not EMI, not ratio, not a fee, not "about 18%".
- Do not read, store, pass or log protected attributes (gender, religion, caste, marital status, date of birth/age). The agent context type does not even contain them.
- Do not let any agent approve or reject a loan, call `/api/applications/:id/decision`, import S1's decision code, or transition to `APPROVED`/`REJECTED`/`DISBURSED`.
- Do not answer a policy question from the model's general knowledge. No context → `SAFE_ANSWER`.
- Do not edit or delete a PUBLISHED or RETIRED `kb_document` row's content or chunks. A policy change is always a new version (Integration_Contracts §8a). No `isLatest` flag anywhere: the version in force is computed at query time.
- Do not give any role except `POLICY_ADMIN` a route that creates, publishes or retires policies.
- Do not log, prompt or persist unmasked PAN / Aadhaar / account numbers.
- Do not edit S1 or S3 files (see Forbidden).
- Do not claim something works unless you ran the command in this file and saw the expected output. If a step fails and you cannot fix it, write it in `docs/GUARDRAILS.md` → "Known limitations" and tell the human.
- Do not add npm dependencies. Everything you need is already in `backend/package.json` (S1 adds: `ai` v5, `@ai-sdk/openai-compatible`, `zod` 3, `@prisma/client` 6, `@ai-sdk/google`, `pgvector`, `pdf-parse`, `csv-parse`, `multer`, `pino`, `vitest`, `supertest`, `tsx`). If one is missing → `contract:` request.

---

## 1. Stack facts (use exactly these APIs)

- Node 22, Express 4, TypeScript strict, ESM, run with `tsx`. Follow S1's import style: if S1's files import with a `.js` suffix (`import { x } from './y.js'`), you do the same everywhere.
- **Vercel AI SDK v5:**
  ```ts
  import { generateObject, generateText, tool, stepCountIs } from 'ai';
  import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
  const provider = createOpenAICompatible({ name: 'llm', baseURL: env.LL_AI_BASE_URL, apiKey: env.LL_AI_API_KEY });
  export const chatModel = provider(env.LL_AI_CHAT_MODEL);
  ```
  v5 tools use `inputSchema` (not `parameters`). Multi-step tool loops use `stopWhen: stepCountIs(n)` (not `maxSteps`). In zod schemas given to `generateObject`, optional values are `.nullable()`, never `.optional()`.
- **LLM endpoint** (from `.env`, S1 parses it in `config/env.ts`): NVIDIA NIM `https://integrate.api.nvidia.com/v1`, model `meta/llama-3.1-70b-instruct` (default). Fallback is Gemini by changing only `.env`:
  ```
  LL_AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
  LL_AI_API_KEY=<gemini key>
  LL_AI_CHAT_MODEL=gemini-2.0-flash
  ```
- **Embeddings:** Gemini `gemini-embedding-001` over the API via `@ai-sdk/google` (`createGoogleGenerativeAI({ apiKey: env.LL_EMBED_API_KEY }).textEmbeddingModel(env.LL_EMBED_MODEL)`), `embedMany`/`embed` from `ai` with `providerOptions: { google: { outputDimensionality: 768, taskType } }` → 768 floats per text, L2-normalised in code. Needs internet and `LL_EMBED_API_KEY` (a Gemini key, required even if chat uses NVIDIA). Exact code in step 1.5.
- **pgvector:** `import pgvector from 'pgvector'; pgvector.toSql(vec)` → string `'[0.1,0.2,…]'`, then cast `::vector(768)` in SQL. Vector column is `Unsupported("vector(768)")`; read/write it only with `$queryRaw` / `$executeRaw`.
- **Parsers:** `csv-parse/sync` (`parse(text, { columns: true, skip_empty_lines: true, trim: true })`), `pdf-parse` (version-specific import, see step 1.6), `JSON.parse`, plain text for `.md`.
- **Logging:** pino via S1's `common/logger.ts` (`logger.info({...}, 'msg')`). Never `console.log` in `src/ai` except in the CLI scripts.
- **Tests:** Vitest, `<file>.test.ts` next to the file. Run with `npm test` in `backend/`.

### Facts about S1's seed you rely on (restate them in tests/stubs exactly)
| Thing | Value |
|---|---|
| `PL-101` personal loan | `indicativeRate` 12.0 (S1-internal field on LoanProduct, not in openapi), tenure 12–60 months, processing fee 1.5 % min ₹2,500 max ₹10,000 |
| `VL-204` "Kestrel Pre-Owned Car Loan" | `indicativeRate` 11.0, tenure 12–84 months, amount ₹1,00,000–₹25,00,000 |
| `LA-2026-00418` | customer Priya (`CUST-1001`), product `PL-101`, requestedAmount 500000, tenureMonths 48, monthlyIncome 60000, existingMonthlyObligations 8000, status `SUBMITTED` |
| Priya `CUST-1001` | SALARIED, "Private sector salaried", income 60000, obligations 8000, Pune, kycStatus VERIFIED |
| Rahul `CUST-1002` | SELF_EMPLOYED · Ananya `CUST-1003` STUDENT |
| Users (password `password`) | `priya.sharma` CUSTOMER, `rahul.verma` CUSTOMER, `ananya.iyer` CUSTOMER, `officer.kumar` LOAN_OFFICER, `analyst.mehta` CREDIT_ANALYST, `admin.rao` POLICY_ADMIN (if S1's seed or `Role` enum lacks it → `contract:` request) |

**Indicative rate rule (code):** `rate = Number(product.indicativeRate ?? product.minInterestRate)`. Always wrap with `Number()` (Prisma may return `Decimal`).

**Pre-computed numbers (verified with the contract formula `P·r·(1+r)^n / ((1+r)^n − 1)`, `r = rate/1200`, `Math.round`):**
| Calculation | Result |
|---|---|
| `calculateEmi(500000, 11, 48)` | **12923** (above ₹12,000 → does not fit) |
| `calculateEmi(500000, 11, 60)` | **10871** (fits; 10871 / 60000 = 18.1 % → "about 18% of income") |
| `calculateEmi(500000, 12, 48)` (LA-2026-00418) | **13167** |
| Priya ratio `(8000 + 13167) / 60000` | **35.28 % → shown as 35 %** (limit 50 %) |
| PL fee for ₹3,00,000 at 1.5 % | ₹4,500 (between min ₹2,500 and max ₹10,000) — written in the KB document, never computed by the LLM |

So the brief's illustrative "38%" becomes **"Obligation ratio is 35% (limit 50%); credit score band is 720-760"** with our seed. That is correct; do not tune data to hit 38.

**Documents on LA-2026-00418 (watch this):** the brief says *salary slips and a bank statement are uploaded, address proof is missing* and the expected `missingDocuments` is `["Address proof"]`. That only works if the seed also has an `IDENTITY` document. Check S1's seed: `GET /api/applications/LA-2026-00418/documents`. If it has **no IDENTITY** document, `missingDocuments` will be `["Identity proof","Address proof"]` — do **not** hack the agent; tell the human to ask S1 to add an IDENTITY document to the seed (Demo_Runbook also expects identity + income). Your stub (step S) already includes IDENTITY + 2 × INCOME.

---

## S. Stub strategy (do this first, before S1's code exists)

S2 must not wait for S1. All S1 functions you call go through **one file**, `backend/src/ai/coreBridge.ts`. Before S1's core services are merged it re-exports an in-memory stub; after the merge it re-exports S1's real code. Switching is a one-file change.

If S1's skeleton (`backend/package.json`, `tsconfig.json`, `src/app.ts`, `src/common/*`, `src/config/env.ts`, `prisma/schema.prisma`) is not on `main` yet, write the knowledge documents (step 1.3) first — they need no code — and pull `main` every 30 minutes. Do **not** create your own `package.json`.

### S.1 `backend/src/ai/stub/core.ts`
Implements the Integration_Contracts §6 signatures in memory with the data above. Exact exports:
```ts
export type ApplicationStatus = 'DRAFT'|'SUBMITTED'|'UNDER_VERIFICATION'|'UNDER_REVIEW'|'APPROVED'|'REJECTED'|'DISBURSED';
export type LoanType = 'PERSONAL'|'HOME'|'VEHICLE'|'EDUCATION';
export type CustomerSegment = 'SALARIED'|'SELF_EMPLOYED'|'STUDENT';
export type DocumentType = 'IDENTITY'|'ADDRESS'|'INCOME';

export interface AiProduct { productId: string; name: string; loanType: LoanType; description: string;
  minInterestRate: number; maxInterestRate: number; indicativeRate: number;
  minTenureMonths: number; maxTenureMonths: number; minAmount: number; maxAmount: number;
  processingFeePercent: number; processingFeeMin: number; processingFeeMax: number;
  eligibilityCriteria: { minMonthlyIncome: number; minCreditScore: number; maxObligationRatioPercent: number; allowedSegments: CustomerSegment[] } }
export interface AiCustomer { customerId: string; fullName: string; segment: CustomerSegment; employmentType: string;
  monthlyIncome: number; existingMonthlyObligations: number; location: string; kycStatus: 'VERIFIED'|'PENDING'|'FAILED' }
export interface AiDocument { documentId: string; applicationId: string; documentType: DocumentType; fileName: string; uploadedAt: string }
export interface AiApplication { applicationId: string; customerId: string; productId: string; requestedAmount: number; tenureMonths: number;
  purpose: string; monthlyIncome: number; existingMonthlyObligations: number; status: ApplicationStatus;
  timeline: { status: ApplicationStatus; at: string; by: string; note: string }[] }

export async function getApplication(applicationId: string): Promise<AiApplication & { documents: AiDocument[] }>;
export async function transition(applicationId: string, to: ApplicationStatus, by: string, note: string): Promise<AiApplication>;
export async function listDocuments(applicationId: string): Promise<AiDocument[]>;
export async function listProducts(): Promise<AiProduct[]>;
export async function getProduct(productId: string): Promise<AiProduct | null>;
export async function getCustomer(customerId: string): Promise<AiCustomer>;
export function calculateEmi(principal: number, annualRatePct: number, months: number): number;      // Math.round, formula above
export function obligationRatioPct(monthlyIncome: number, existingObligations: number, proposedEmi: number): number; // (obl+emi)/income*100, NOT rounded
export function resetStub(): void;   // restores the initial data (used by tests)
```
- `getApplication` / `getCustomer` throw `new AppError(404, 'NOT_FOUND', ...)` (from S1's `common/errors.ts`; if not merged yet, throw `new Error('NOT_FOUND')`) for unknown ids.
- `transition` allows only these edges, else throws 409 `INVALID_STATE`: `DRAFT→SUBMITTED`, `SUBMITTED→UNDER_VERIFICATION`, `UNDER_VERIFICATION→UNDER_REVIEW`, `UNDER_REVIEW→APPROVED|REJECTED`, `APPROVED→DISBURSED`. It appends `{status, at: new Date().toISOString(), by, note}` to `timeline`.
- Stub data (8 products; only PL-101 and VL-204 values are asserted by tests — the rest are placeholders until S1's seed replaces them):

| productId | name | type | indicative | min–max rate | tenure | amount | fee % / min / max | min income | min score | segments |
|---|---|---|---|---|---|---|---|---|---|---|
| PL-101 | Kestrel Personal Loan – Salaried | PERSONAL | 12.0 | 11.5–18.0 | 12–60 | 50,000–25,00,000 | 1.5 / 2,500 / 10,000 | 25,000 | 700 | SALARIED |
| PL-102 | Kestrel Personal Loan – Self-Employed | PERSONAL | 14.0 | 13.0–20.0 | 12–48 | 1,00,000–15,00,000 | 2.0 / 3,000 / 15,000 | 40,000 | 720 | SELF_EMPLOYED |
| HL-301 | Kestrel Home Loan | HOME | 8.75 | 8.5–10.5 | 60–360 | 5,00,000–5,00,00,000 | 0.5 / 5,000 / 25,000 | 30,000 | 700 | SALARIED, SELF_EMPLOYED |
| HL-302 | Kestrel Home Top-Up Loan | HOME | 9.5 | 9.25–11.5 | 12–180 | 1,00,000–50,00,000 | 0.5 / 3,000 / 15,000 | 30,000 | 700 | SALARIED, SELF_EMPLOYED |
| VL-201 | Kestrel New Car Loan | VEHICLE | 9.25 | 9.25–12.0 | 12–84 | 1,00,000–50,00,000 | 1.5 / 1,000 / 7,500 | 25,000 | 650 | SALARIED, SELF_EMPLOYED |
| VL-204 | Kestrel Pre-Owned Car Loan | VEHICLE | 11.0 | 11.0–14.0 | 12–84 | 1,00,000–25,00,000 | 1.5 / 1,000 / 7,500 | 25,000 | 650 | SALARIED, SELF_EMPLOYED |
| EL-401 | Kestrel Education Loan – India | EDUCATION | 10.5 | 10.5–12.5 | 12–120 | 50,000–20,00,000 | 1.0 / 1,000 / 10,000 | 0 | 650 | STUDENT |
| EL-402 | Kestrel Education Loan – Abroad | EDUCATION | 11.5 | 11.5–13.5 | 12–180 | 5,00,000–75,00,000 | 1.0 / 5,000 / 20,000 | 0 | 650 | STUDENT |

All `maxObligationRatioPercent` = 50. Descriptions: VL-204 `"Finance for used (pre-owned) cars up to 8 years old"`, VL-201 `"Finance for brand-new cars"`, others one short sentence without the words "used", "pre-owned" or "new".

- Customers: CUST-1001 Priya Sharma (values above); CUST-1002 Rahul Verma, SELF_EMPLOYED, "Self-employed – retail business", 95000, 20000, Bengaluru, VERIFIED; CUST-1003 Ananya Iyer, STUDENT, "Full-time student", 10000, 0, Chennai, PENDING.
- Application `LA-2026-00418`: Priya, PL-101, 500000, 48 months, purpose "Home renovation and furniture", income 60000, obligations 8000, status SUBMITTED, timeline `[DRAFT…, SUBMITTED…]`, documents: `DOC-1` IDENTITY `pan-card.pdf`, `DOC-2` INCOME `salary-slips-jul-sep-2026.pdf`, `DOC-3` INCOME `bank-statement-6m.pdf`. **No ADDRESS.**

### S.2 `backend/src/ai/coreBridge.ts`
The **only** file in `src/ai` that imports S1 core code or the stub. Everything else imports from `../coreBridge.js`.
```ts
// Before S1's core services are merged:
export { getApplication, transition, listDocuments, listProducts, getProduct, getCustomer,
         calculateEmi, obligationRatioPct } from './stub/core.js';
export type { AiProduct, AiCustomer, AiDocument, AiApplication, ApplicationStatus, LoanType,
              CustomerSegment, DocumentType } from './stub/core.js';
```
After S1's phase-1/2 PRs merge (step 3.0), replace the body with thin wrappers that call `../core/application/service.js`, `../core/document/service.js`, `../core/product/service.js`, `../core/customer/service.js`, `../core/emi/loanMath.js` and **map** S1's shapes into the `Ai*` interfaces (e.g. if S1 stores eligibility as flat columns, build the nested `eligibilityCriteria` object here; convert `Decimal` with `Number()`; convert dates with `.toISOString()`). Keep the `Ai*` interfaces (move them from the stub into `coreBridge.ts`). No other file changes.

**Commit:** `M3-8: in-memory core stub behind coreBridge`

---

## 2. Prisma models (S2 block)

Append to the **bottom** of `backend/prisma/schema.prisma` (do not touch anything above the marker; if S1 did not add the marker, add exactly this marker line once and tell S1):
```prisma
// ===== S2 models below =====
enum KbLoanType { PERSONAL HOME VEHICLE EDUCATION ALL }
enum KbDocumentType { TERMS_AND_CONDITIONS RATE_FEE_SCHEDULE CREDIT_POLICY KYC_CHECKLIST PREPAYMENT_POLICY GRIEVANCE REGULATORY_CIRCULAR OFFICER_PLAYBOOK }
enum KbAudience { CUSTOMER INTERNAL }
enum KbCustomerSegment { SALARIED SELF_EMPLOYED STUDENT ALL }
enum PolicyStatus { DRAFT PUBLISHED RETIRED }
enum AuditEventType { AGENT_START TOOL_CALL TOOL_RESULT LLM_CALL LLM_RESULT PERMISSION_DENIED AGENT_END HUMAN_REQUIRED POLICY_DRAFTED POLICY_PUBLISHED POLICY_RETIRED }

// One row = one immutable policy VERSION. Versions of one policy share documentKey (Integration_Contracts §8a).
model KbDocument {
  id              String            @id @default(uuid())
  documentKey     String            @map("document_key")      // e.g. VEHICLE-TNC; stable across versions
  title           String
  version         String
  effectiveDate   DateTime          @map("effective_date") @db.Date
  loanType        KbLoanType        @map("loan_type")
  documentType    KbDocumentType    @map("document_type")
  audience        KbAudience
  customerSegment KbCustomerSegment @default(ALL) @map("customer_segment")
  status          PolicyStatus      @default(DRAFT)
  changeNote      String            @map("change_note")
  createdBy       String            @map("created_by")        // username, or "system" for npm run ingest
  publishedBy     String?           @map("published_by")
  publishedAt     DateTime?         @map("published_at")
  retiredAt       DateTime?         @map("retired_at")
  retiredReason   String?           @map("retired_reason")
  sourceFile      String            @map("source_file")
  ingestedAt      DateTime          @default(now()) @map("ingested_at")
  chunks          KbChunk[]

  @@unique([documentKey, version])
  @@index([documentKey, status, effectiveDate])
  @@map("kb_document")
}

model KbChunk {
  id         String                     @id @default(uuid())
  documentId String                     @map("document_id")
  document   KbDocument                 @relation(fields: [documentId], references: [id], onDelete: Cascade)
  ordinal    Int                        @default(0)            // chunk order inside the document (admin preview)
  section    String
  content    String
  metadata   Json                       @default("{}")
  embedding  Unsupported("vector(768)")

  @@index([documentId])
  @@map("kb_chunk")
}

model AgentRun {
  auditTrailId   String       @id @map("audit_trail_id")
  applicationId  String       @map("application_id")   // plain string: no FK into S1's table (we may not edit S1's model); holds the documentKey for AUD-POL-* policy trails
  startedAt      DateTime     @default(now()) @map("started_at")
  completedAt    DateTime?    @map("completed_at")
  recommendation Json?
  events         AuditEvent[]

  @@index([applicationId, startedAt])
  @@map("agent_run")
}

model AuditEvent {
  id           String         @id @default(uuid())
  auditTrailId String         @map("audit_trail_id")
  run          AgentRun       @relation(fields: [auditTrailId], references: [auditTrailId], onDelete: Cascade)
  sequence     Int
  timestamp    DateTime       @default(now())
  agent        String                                  // agent name, or the admin's username for POLICY_* events
  eventType    AuditEventType @map("event_type")
  toolName     String?        @map("tool_name")
  input        Json           @map("input_json")
  output       Json           @map("output_json")
  durationMs   Int            @default(0) @map("duration_ms")

  @@unique([auditTrailId, sequence])
  @@map("audit_event")
}
```
Enum values are copied from `openapi.yaml` (`LoanTypeOrAll`, `KnowledgeDocumentType`, `Audience`, `CustomerSegmentOrAll`, `PolicyStatus`, audit `eventType`). Do not add or rename values.

### Migration
```bash
cd backend
npx prisma migrate dev --create-only --name s2_kb_agents_audit
```
Open the generated `prisma/migrations/<timestamp>_s2_kb_agents_audit/migration.sql` and:
1. Put this as the **first** line: `CREATE EXTENSION IF NOT EXISTS vector;`
2. Append at the end:
```sql
-- HNSW index for cosine distance (operator <=>)
CREATE INDEX IF NOT EXISTS kb_chunk_embedding_hnsw ON kb_chunk USING hnsw (embedding vector_cosine_ops);
```
Then:
```bash
npx prisma migrate dev          # applies it
npx prisma generate
psql "$DATABASE_URL" -c "\d kb_chunk"   # expect: embedding | vector(768) | not null ; index kb_chunk_embedding_hnsw hnsw
```
**If you already applied an earlier S2 migration that had `is_latest`** (built from an older copy of this file): update the schema block above, run `npx prisma migrate dev --create-only --name s2_policy_versioning`, put `TRUNCATE kb_document CASCADE;` as the first line of the generated SQL (dev data only; existing rows have no `document_key`), remove any `DROP INDEX "kb_chunk_embedding_hnsw";` line, apply with `npx prisma migrate dev`, then re-run ingest (step 1.6).

Warning to pass to S1 in chat: Prisma does not know the HNSW index. If any later `prisma migrate dev` generates `DROP INDEX "kb_chunk_embedding_hnsw";`, delete that line from the new migration before applying it.

**Commit:** `M2-3: S2 prisma models + pgvector HNSW index`

---

## 3. Phase 1 — RAG policy assistant + policy admin (M2-1..M2-10, M2-K1..K9, M2-Q1..Q5, X-1)

### 1.1 `backend/src/ai/config/llm.ts`
- Exactly the provider code from §1 (`createOpenAICompatible({ name: 'llm', baseURL: env.LL_AI_BASE_URL, apiKey: env.LL_AI_API_KEY })`, `export const chatModel = provider(env.LL_AI_CHAT_MODEL)`), with `env` imported from S1's `config/env.ts`. If `env` does not expose the three `LL_AI_*` keys → `contract:` request to S1, do not edit env.ts.
- Structured output: check whether the provider supports it: `grep -n supportsStructuredOutputs node_modules/@ai-sdk/openai-compatible/dist/index.d.ts`. If present, pass `supportsStructuredOutputs: true` in the settings. If NIM then returns HTTP 400 for `response_format`, set it to `false` (every system prompt in this file also lists the JSON keys, so the model still knows the shape).
- Export two helpers that every AI file uses:
```ts
export async function structured<T>(args: { schema: z.ZodType<T>; system: string; prompt: string }): Promise<T>
// generateObject({ model: chatModel, schema, system, prompt: maskPii(prompt), temperature: 0, maxRetries: 1 });
// on failure retry ONCE; second failure → throw new AppError(503, 'AI_UNAVAILABLE', 'The AI service is unavailable. Please try again.')
export async function plainText(args: { system: string; prompt: string; temperature?: number }): Promise<string>
// generateText({ model: chatModel, system, prompt: maskPii(prompt), temperature: args.temperature ?? 0.2, maxRetries: 1 }).text.trim()
// on failure → throw AppError(503, 'AI_UNAVAILABLE', ...)
```
Use S1's `AppError` constructor **exactly as written in `common/errors.ts`** (read it; the argument order above is only illustrative).
- Log every call with `logger.info({ kind: 'llm', ms }, 'llm call')` — never log the prompt text unmasked (it is already masked by `maskPii`).

### 1.2 `backend/src/ai/masking/piiMasker.ts` + `piiMasker.test.ts` (M2-8)
```ts
export function maskPii(text: string): string
export function maskObject<T>(value: T): T     // deep copy; masks every string; integers with ≥ 9 digits become masked strings; never mutates input
```
Apply in this order (order matters — Aadhaar before account numbers):
1. PAN `/\b[A-Z]{5}([0-9]{4})[A-Z]\b/g` → `XXXXX$1X` (e.g. `ABCDE1234F` → `XXXXX1234X`)
2. Aadhaar `/\b\d{4}[ -]?\d{4}[ -]?(\d{4})\b/g` → `XXXX-XXXX-$1` (e.g. `1234 5678 9012` → `XXXX-XXXX-9012`)
3. Account numbers `/\b\d{9,18}\b/g` → `'X'.repeat(len - 4) + last4` (e.g. `50100123456789` → `XXXXXXXXXX6789`)

Test cases (all must pass, write them as a table-driven `it.each`):
| input | expected |
|---|---|
| `My PAN is ABCDE1234F` | `My PAN is XXXXX1234X` |
| `Aadhaar 1234 5678 9012` | `Aadhaar XXXX-XXXX-9012` |
| `1234-5678-9012` | `XXXX-XXXX-9012` |
| `123456789012` | `XXXX-XXXX-9012` |
| `Acct 50100123456789` | `Acct XXXXXXXXXX6789` |
| `ref 123456789` | `ref XXXXX6789` |
| `call 9876543210` | `call XXXXXX3210` (documented over-masking of phone numbers — Decisions.md #13) |
| `Loan 500000 at 11% for 60 months` | unchanged |
| `12345678` | unchanged (8 digits) |

Plus one `maskObject` test: input `{ a: { pan: 'ABCDE1234F' }, list: ['1234 5678 9012'], n: 123456789012, ok: 5 }` → `{ a: { pan: 'XXXXX1234X' }, list: ['XXXX-XXXX-9012'], n: 'XXXX-XXXX-9012', ok: 5 }`, and the original object is unchanged.

**Logger wiring:** open S1's `backend/src/common/logger.ts`. Rules.md says logs are masked with `maskPii`. Do whichever S1 documented there:
- if S1's logger imports `maskPii` from `../ai/masking/piiMasker.js` → just make sure your export name and signature are exactly `maskPii(text: string): string`;
- if S1 exposes a hook (e.g. `setLogMasker(fn)`) → call it once in `ai/index.ts` with `maskPii`;
- if neither exists → `contract:` request to S1 ("logger must pass every string through `maskPii`"). Do not edit logger.ts.

Acceptance:
```bash
cd backend && npx vitest run src/ai/masking   # expect: all tests passed (10)
```
**Commit:** `M2-8: PII masker for prompts, logs and audit`

### 1.3 Knowledge documents in `db/knowledge/` (M2-K1..K9, B-6)
Metadata for every file lives in **`db/knowledge/manifest.json`** (one mechanism for md/csv/json/pdf; this is our "front matter"). The ingest CLI ingests exactly the files listed there, nothing else. All content is synthetic — put the line `Synthetic document for the LoanLens AI hackathon demo. Not real bank policy.` at the top of every `.md` (below the `#` title).

`db/knowledge/manifest.json` — exactly these entries:
```json
[
  { "file": "vehicle-loan-terms-v2025.1.md", "documentKey": "VEHICLE-TNC", "title": "Vehicle Loan Terms and Conditions", "version": "2025.1", "effectiveDate": "2025-04-01", "loanType": "VEHICLE", "documentType": "TERMS_AND_CONDITIONS", "audience": "CUSTOMER", "customerSegment": "ALL" },
  { "file": "vehicle-loan-terms-v2026.3.md", "documentKey": "VEHICLE-TNC", "title": "Vehicle Loan Terms and Conditions", "version": "2026.3", "effectiveDate": "2026-07-01", "loanType": "VEHICLE", "documentType": "TERMS_AND_CONDITIONS", "audience": "CUSTOMER", "customerSegment": "ALL" },
  { "file": "personal-loan-terms-v2026.1.md", "documentKey": "PERSONAL-TNC", "title": "Personal Loan Terms and Conditions", "version": "2026.1", "effectiveDate": "2026-01-01", "loanType": "PERSONAL", "documentType": "TERMS_AND_CONDITIONS", "audience": "CUSTOMER", "customerSegment": "ALL" },
  { "file": "general-loan-terms-v2026.1.md", "documentKey": "GENERAL-TNC", "title": "General Loan Terms and Conditions", "version": "2026.1", "effectiveDate": "2026-01-01", "loanType": "ALL", "documentType": "TERMS_AND_CONDITIONS", "audience": "CUSTOMER", "customerSegment": "ALL" },
  { "file": "education-loan-terms-v2026.1.json", "documentKey": "EDUCATION-TNC", "title": "Education Loan Terms and Conditions", "version": "2026.1", "effectiveDate": "2026-01-01", "loanType": "EDUCATION", "documentType": "TERMS_AND_CONDITIONS", "audience": "CUSTOMER", "customerSegment": "STUDENT" },
  { "file": "rate-fee-schedule-v2026.2.csv", "documentKey": "RATE-FEE-SCHEDULE", "title": "Interest Rate and Fee Schedule", "version": "2026.2", "effectiveDate": "2026-04-01", "loanType": "ALL", "documentType": "RATE_FEE_SCHEDULE", "audience": "CUSTOMER", "customerSegment": "ALL" },
  { "file": "credit-policy-v2026.2.md", "documentKey": "CREDIT-POLICY", "title": "Credit Policy and Eligibility Criteria", "version": "2026.2", "effectiveDate": "2026-04-01", "loanType": "ALL", "documentType": "CREDIT_POLICY", "audience": "CUSTOMER", "customerSegment": "ALL" },
  { "file": "kyc-document-checklist-v2026.1.md", "documentKey": "KYC-CHECKLIST", "title": "KYC and Document Checklist", "version": "2026.1", "effectiveDate": "2026-01-01", "loanType": "ALL", "documentType": "KYC_CHECKLIST", "audience": "CUSTOMER", "customerSegment": "ALL" },
  { "file": "prepayment-foreclosure-policy-v2026.1.md", "documentKey": "PREPAYMENT-POLICY", "title": "Prepayment and Foreclosure Policy", "version": "2026.1", "effectiveDate": "2026-01-01", "loanType": "ALL", "documentType": "PREPAYMENT_POLICY", "audience": "CUSTOMER", "customerSegment": "ALL" },
  { "file": "grievance-redressal-v2026.1.md", "documentKey": "GRIEVANCE", "title": "Grievance Redressal Procedure", "version": "2026.1", "effectiveDate": "2026-01-01", "loanType": "ALL", "documentType": "GRIEVANCE", "audience": "CUSTOMER", "customerSegment": "ALL" },
  { "file": "regulatory-circular-summary-v2026.1.pdf", "documentKey": "REG-CIRCULAR", "title": "Regulatory Circular Summary", "version": "2026.1", "effectiveDate": "2026-02-01", "loanType": "ALL", "documentType": "REGULATORY_CIRCULAR", "audience": "CUSTOMER", "customerSegment": "ALL" },
  { "file": "loan-officer-playbook-v2026.1.md", "documentKey": "OFFICER-PLAYBOOK", "title": "Loan Officer Playbook", "version": "2026.1", "effectiveDate": "2026-01-01", "loanType": "ALL", "documentType": "OFFICER_PLAYBOOK", "audience": "INTERNAL", "customerSegment": "ALL" }
]
```
Coverage: K1 terms (vehicle ×2, personal, general, education JSON) · K2 rate/fee CSV · K3 credit policy · K4 KYC checklist · K5 prepayment policy · K6 grievance · K7 regulatory circular (PDF) · K8 officer playbook (INTERNAL) · K9 vehicle terms in two versions (same `documentKey` `VEHICLE-TNC`). `documentKey` is required on every entry (`/^[A-Z0-9]+(-[A-Z0-9]+)*$/`); a new key = a new policy, the same key = a new version of it.

**Demo-only file, NOT in the manifest:** `db/knowledge/demo/vehicle-tnc-v2026.4.md` — used by the policy-admin demo (step 1.11) to upload a new version through the API. Identical to `vehicle-loan-terms-v2026.3.md` except: header line `Version 2026.4 · Effective from the date set at upload · Applies to Kestrel New Car Loan (VL-201) and Kestrel Pre-Owned Car Loan (VL-204)`, and the first two bullets of `## Foreclosure and Part-Prepayment` become "Foreclosure is allowed after 3 EMIs have been paid." / "Foreclosure charge: 1% of the outstanding principal." (part-prepayment bullet unchanged). Upload metadata: `documentKey VEHICLE-TNC`, `version 2026.4`, `effectiveDate` = today, `changeNote "Foreclosure lock-in reduced to 3 EMIs"`, other fields as v2026.3.

Write each file with **exactly these headings** and **these facts** (you may add one or two plain sentences of context per section; never change a number). Where a fact overlaps S1's seed (rates, fees, tenures), the seed values in §1 are used here; if S1's real seed differs later, update the KB document, not the seed.

**`vehicle-loan-terms-v2026.3.md`** (the brief's expected source — section name must be exactly `Foreclosure and Part-Prepayment`)
```markdown
# Vehicle Loan Terms and Conditions
Version 2026.3 · Effective 2026-07-01 · Applies to Kestrel New Car Loan (VL-201) and Kestrel Pre-Owned Car Loan (VL-204)
## Eligibility
- Age 21 to 65 years at loan maturity. Minimum net monthly income ₹25,000. Minimum credit score 650.
- Pre-owned cars must be no more than 8 years old at loan maturity.
## Interest Rate and Tenure
- New car loans: 9.25% to 12.0% per annum, tenure 12 to 84 months, loan amount ₹1,00,000 to ₹50,00,000.
- Pre-owned car loans: 11.0% to 14.0% per annum, tenure 12 to 84 months, loan amount ₹1,00,000 to ₹25,00,000.
## Processing Fee
- 1.5% of the loan amount, minimum ₹1,000, maximum ₹7,500, plus GST.
## Foreclosure and Part-Prepayment
- Foreclosure is allowed after 6 EMIs have been paid.
- Foreclosure charge: 2% of the outstanding principal.
- Part-prepayment is allowed after 6 EMIs, up to 25% of the outstanding principal once per financial year, with no charge.
## Hypothecation and Insurance
- The vehicle is hypothecated to Kestrel Bank until the loan is closed. Comprehensive insurance must be kept valid for the full tenure.
## Late Payment
- Penal charge of 2% per month on the overdue EMI amount.
```
**`vehicle-loan-terms-v2025.1.md`** — same headings, title, and structure; header line `Version 2025.1 · Effective 2025-04-01`; differences: pre-owned rate 10.5% to 13.5%; **Foreclosure and Part-Prepayment:** "Foreclosure is allowed after 12 EMIs have been paid." / "Foreclosure charge: 4% of the outstanding principal." / "Part-prepayment is allowed after 12 EMIs with a 2% charge on the amount prepaid."

**`personal-loan-terms-v2026.1.md`**
- `## Eligibility` — PL-101 (salaried): min net monthly income ₹25,000, min credit score 700. PL-102 (self-employed): min monthly income ₹40,000, min credit score 720, business vintage 3 years. Total EMIs including this loan must not exceed 50% of net monthly income.
- `## Interest Rate and Tenure` — PL-101: indicative rate 12.0% per annum (range 11.5%–18.0%), tenure 12 to 60 months, amount ₹50,000 to ₹25,00,000. PL-102: indicative 14.0% (13.0%–20.0%), tenure 12 to 48 months, amount ₹1,00,000 to ₹15,00,000.
- `## Processing Fee` — "The processing fee is 1.5% of the loan amount, subject to a minimum of ₹2,500 and a maximum of ₹10,000, plus GST at 18%." "The fee is deducted from the disbursed amount and is non-refundable."
- `### Processing Fee Illustrations` — a markdown table, verbatim:
  ```
  | Loan amount | Processing fee (before GST) |
  |---|---|
  | ₹1,00,000 | ₹2,500 (minimum applies) |
  | ₹3,00,000 | ₹4,500 |
  | ₹5,00,000 | ₹7,500 |
  | ₹10,00,000 | ₹10,000 (maximum applies) |
  ```
- `## Foreclosure and Part-Prepayment` — foreclosure allowed after 12 EMIs; charge 3% of the outstanding principal; part-prepayment not allowed.
- `## Late Payment` — penal charge 2% per month on the overdue EMI.
- Do **not** mention fee waivers anywhere in customer documents.

**`general-loan-terms-v2026.1.md`**
- `## Disbursal Timelines` — "Personal loans and vehicle loans are disbursed within 2–3 working days after approval and signing of the loan agreement." "Home loans are disbursed within 7–10 working days after approval, once the legal and technical verification of the property is complete." "Education loans are paid directly to the institution within 5–7 working days after approval, as per the fee schedule."
- `## Application Status Stages` — Draft, Submitted, Under Verification, Under Review, Approved or Rejected, Disbursed; one sentence each.
- `## Key Fact Statement` — every borrower receives a Key Fact Statement with the interest rate, all fees and the total cost before signing.
- `## Final Decision` — "Every credit decision is made by a Kestrel Bank credit analyst. Automated tools only prepare recommendations."

**`education-loan-terms-v2026.1.json`** — one object, top-level keys = sections:
```json
{
  "Eligibility": { "applicant": "Indian student admitted to a recognised course in India or abroad", "coApplicant": "Parent or guardian is mandatory", "coApplicantMinCreditScore": 650 },
  "Interest Rate and Tenure": { "EL-401 India": "10.5% to 12.5% per annum, tenure 12 to 120 months, amount ₹50,000 to ₹20,00,000", "EL-402 Abroad": "11.5% to 13.5% per annum, tenure 12 to 180 months, amount ₹5,00,000 to ₹75,00,000" },
  "Moratorium": "Course duration plus 12 months; simple interest is charged during the moratorium.",
  "Collateral": "No collateral up to ₹7,50,000; tangible collateral required above ₹7,50,000.",
  "Processing Fee": "1.0% of the loan amount, minimum ₹1,000; waived for loans up to ₹4,00,000.",
  "Foreclosure and Part-Prepayment": "Allowed at any time with no charge."
}
```

**`rate-fee-schedule-v2026.2.csv`** — header and one row per product (8 rows; values from the stub table in step S.1). Quote every field that contains a comma:
```csv
section,product_id,product_name,loan_type,interest_rate_range,indicative_rate,tenure_months,amount_range,processing_fee,foreclosure_charge
Personal Loans,PL-101,Kestrel Personal Loan – Salaried,PERSONAL,11.5% to 18.0%,12.0%,12 to 60,"₹50,000 to ₹25,00,000","1.5% (min ₹2,500, max ₹10,000) + GST",3% of outstanding principal after 12 EMIs
```
(continue for PL-102, HL-301, HL-302, VL-201, VL-204, EL-401, EL-402; `section` is `Personal Loans` / `Home Loans` / `Vehicle Loans` / `Education Loans`; vehicle foreclosure = `2% of outstanding principal after 6 EMIs`; home = `Nil on floating rate; 2% within 3 years on fixed rate`; education = `Nil`.)

**`credit-policy-v2026.2.md`**
- `## Credit Score Requirements` — "Credit scores range from 300 to 900." "Home loan: minimum credit score 700 for salaried applicants and 720 for self-employed applicants." "Personal loan: minimum 700 for salaried and 720 for self-employed applicants." "Vehicle loan: minimum 650." "Education loan: minimum 650 for the co-applicant."
- `## Income-to-Obligation Ratio` — "Total monthly EMIs, including the new loan, must not exceed 50% of net monthly income."
- `## Borderline and High-Value Applications` — "An obligation ratio between 45% and 55%, or a credit score between 640 and 680, is borderline." "Applications of ₹10,00,000 or more are high-value." "Borderline, high-value and policy-exception applications are always reviewed by a credit analyst."
- `## Policy Exceptions` — "A loan amount outside the product's minimum or maximum, a tenure outside the product range, or a customer segment not eligible for the product is a policy exception. Only a credit analyst can approve an exception, with a written reason."
- `## Factors Never Used in Decisions` — "Gender, religion, caste and marital status are never used in any credit decision."

**`kyc-document-checklist-v2026.1.md`**
- `## Identity Proof` — PAN card (mandatory) plus one of Aadhaar, passport, voter ID or driving licence.
- `## Address Proof` — Aadhaar, passport, utility bill not older than 3 months, or registered rent agreement.
- `## Income Proof — Salaried Applicants` — last 3 months' salary slips, last 6 months' bank statement showing salary credits, Form 16 for the latest year.
- `## Home Loan — Self-Employed Applicants` — exactly these bullets: Income Tax Returns for the last 2 years with computation of income; audited profit and loss account and balance sheet for the last 2 years; GST returns for the last 12 months (where GST registration applies); proof of business existence for at least 3 years (GST registration, Shop and Establishment certificate or trade licence); business and personal bank statements for the last 12 months; KYC of the applicant and of the business entity (identity proof, address proof, business PAN); property documents (sale agreement, title deeds, approved building plan, and NOC from the builder or society).
- `## Home Loan — Salaried Applicants` — salaried income proof above plus property documents.
- `## Education Loan — Students` — admission letter, fee schedule, last mark sheets, co-applicant KYC and income proof.

**`prepayment-foreclosure-policy-v2026.1.md`**
- `## Home Loans` — floating-rate home loans to individuals: no foreclosure or part-prepayment charges; fixed-rate: 2% of outstanding principal if closed within 3 years, nil after 3 years.
- `## Education Loans` — no charges at any time.
- `## Personal Loans` — foreclosure after 12 EMIs, 3% of outstanding principal (same as Personal Loan Terms and Conditions).
- `## Vehicle Loans` — "Foreclosure of vehicle loans is governed by the Vehicle Loan Terms and Conditions in force." (no numbers here on purpose)
- `## How to Request Foreclosure` — request a foreclosure statement in the app or at a branch; it is valid for 7 days; the closure letter and NOC are issued within 7 working days of full payment.

**`grievance-redressal-v2026.1.md`**
- `## Level 1 — Branch or Call Centre` — call 1800-000-5353 (fictional) or visit any branch; acknowledged within 2 working days; resolved within 7 working days.
- `## Level 2 — Nodal Officer` — if unresolved after 7 working days, email nodal.officer@kestrelbank.example; resolved within 15 working days.
- `## Level 3 — Principal Nodal Officer` — principal.nodal@kestrelbank.example; final bank response within 30 days of the original complaint.
- `## Regulator` — if not resolved within 30 days or the customer is unsatisfied, the customer may approach the RBI Integrated Ombudsman.

**`regulatory-circular-summary-v2026.1.pdf`** — write the source as `db/knowledge/source/regulatory-circular-summary-v2026.1.md` with **numbered** headings (the PDF chunker detects them), every line shorter than 95 characters:
```markdown
# Regulatory Circular Summary
Synthetic, illustrative summary for the LoanLens AI hackathon demo. Not legal text.
## 1. Purpose
Summarises regulatory expectations Kestrel Bank follows for retail loans.
## 2. Key Fact Statement
A Key Fact Statement with all-in cost must be given to the borrower before the loan agreement is signed.
## 3. Foreclosure on Floating Rate Loans
No foreclosure or prepayment charges on floating rate term loans to individuals for non-business purposes.
## 4. Reasons for Rejection
Reasons for rejecting a loan application must be communicated to the applicant in writing.
## 5. Digital Lending Disbursal
Loan amounts are disbursed directly into the borrower's own bank account.
## 6. Penal Charges
Penal charges are not added to the interest rate and are not capitalised.
```
Generate the PDF with the dependency-free script from step 1.6 (`makePdf.ts`):
```bash
cd backend && npx tsx src/ai/rag/makePdf.ts ../db/knowledge/source/regulatory-circular-summary-v2026.1.md ../db/knowledge/regulatory-circular-summary-v2026.1.pdf
pdftotext ../db/knowledge/regulatory-circular-summary-v2026.1.pdf - | head -5   # optional check if poppler is installed; expect the title and "1. Purpose"
```
If you cannot produce a PDF for any reason, point the manifest entry at the `.md` source instead and add "PDF ingestion not demonstrated end-to-end" to Known limitations. Do not pretend.

**`loan-officer-playbook-v2026.1.md`** (INTERNAL — must never reach a customer)
- `## Processing Fee Waivers` — "Officers may waive up to 50% of the processing fee for salaried customers with a credit score of 780 or above." "Waivers above 50% need branch manager approval." "Never promise a waiver before the credit check is complete."
- `## Handling Borderline Applications` — obligation ratio 45–55% or score 640–680: route to a credit analyst with a note; suggest a longer tenure or a co-applicant.
- `## Requesting Missing Documents` — ask once, in a single message that lists every missing document.
- `## What Not to Disclose` — never share internal scorecards, waiver limits or analyst notes with customers.

**Commit:** `M2-K1: synthetic knowledge base documents and manifest` (body lists K1..K9)

### 1.4 `backend/src/ai/rag/chunker.ts` (M2-2)
```ts
export interface Chunk { section: string; content: string; metadata: { headingPath: string[]; part: number } }
export function chunkMarkdown(text: string, docTitle: string): Chunk[]
export function chunkPdfText(text: string, docTitle: string): Chunk[]
export function chunkCsv(text: string, docTitle: string): Chunk[]
export function chunkJson(text: string, docTitle: string): Chunk[]
export function splitLong(text: string, max = 800, overlap = 100): string[]
```
Rules:
- **Markdown:** walk lines; `#` is the document title (not a section); every `##` or `###` line starts a new section. `section` = the heading text of the deepest heading (e.g. `Foreclosure and Part-Prepayment`, **not** the full path); `metadata.headingPath` = `['Foreclosure and Part-Prepayment']` or `['Processing Fee','Processing Fee Illustrations']`. Text before the first `##` goes to section = `docTitle`. Skip sections whose body is empty after trim.
- **PDF text:** a line is a heading if it matches `/^\d+(\.\d+)*\.?\s+[A-Z].{2,80}$/` (numbered, like `1. Purpose` or `1.2 Scope`) or `/^[A-Z][A-Z0-9 &,'()\/-]{3,79}$/` (ALL CAPS). `section` = heading text with the leading number removed (`/^\d+(\.\d+)*\.?\s+/`). Text before the first heading → section = `docTitle`.
- **CSV:** parse with `csv-parse/sync`. If a column named `section` exists, group rows by its value (section = that value); otherwise groups of 5 rows, section = `Rows 1–5`, `Rows 6–10`, …. Each chunk's content = the header line repeated at the top, then one line per row rendered as `col: value; col: value; …`.
- **JSON:** one chunk group per top-level key; section = the key; content = the value flattened to `path: value` lines (nested keys joined with `.`; arrays as `path[0]: value`).
- **Size:** if a section's content is longer than 800 characters, `splitLong` it into windows of ≤ 800 chars with 100 chars overlap, cutting at the last whitespace before the limit; every piece keeps the same `section` and `headingPath`, with `part` = 1, 2, ….
- Tests in `chunker.test.ts`: (a) the vehicle 2026.3 markdown yields a chunk with `section === 'Foreclosure and Part-Prepayment'` whose content contains `after 6 EMIs`; (b) `splitLong('a '.repeat(1000))` returns pieces all ≤ 800 chars; (c) CSV with `section` column groups by it and repeats the header; (d) JSON produces one section per top-level key; (e) PDF text `"Regulatory Circular Summary\n1. Purpose\nText"` → section `Purpose`.

**Commit:** `M2-2: section-aware chunker for md/pdf/csv/json`

### 1.5 `backend/src/ai/rag/embeddings.ts` (M2-3)
Embeddings are a Gemini API call (no local model, nothing to download or cache). `LL_EMBED_API_KEY`, `LL_EMBED_MODEL`, `LL_EMBED_DIMENSIONS` come from S1's `config/env.ts`; if they are missing → `contract:` request to S1, do not edit env.ts.
```ts
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { embed, embedMany } from 'ai';
import { env } from '../../config/env.js';          // match S1's import style
import { AppError } from '../../common/errors.js';  // use S1's constructor exactly as written

const google = createGoogleGenerativeAI({ apiKey: env.LL_EMBED_API_KEY });
const model = google.textEmbeddingModel(env.LL_EMBED_MODEL); // 'gemini-embedding-001'
export const EMBEDDING_DIM = 768;
if (env.LL_EMBED_DIMENSIONS !== EMBEDDING_DIM) throw new Error(`LL_EMBED_DIMENSIONS must be ${EMBEDDING_DIM} to match vector(${EMBEDDING_DIM})`);
const opts = (taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY') =>
  ({ google: { outputDimensionality: EMBEDDING_DIM, taskType } });

// Gemini's truncated 768-dim output is not unit length; we use cosine distance <=>, so normalise before storing and before querying.
export function normalize(v: number[]): number[] {
  if (v.length !== EMBEDDING_DIM) throw new Error(`embedding has ${v.length} dims, expected ${EMBEDDING_DIM}`);
  const n = Math.hypot(...v);
  if (!n) throw new Error('zero embedding');
  return v.map((x) => x / n);
}

const is429 = (e: unknown) => (e as { statusCode?: number })?.statusCode === 429 || /429|RESOURCE_EXHAUSTED/.test(String(e));
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try { return await fn(); }
  catch (e) {
    if (!is429(e)) throw e;
    await new Promise((r) => setTimeout(r, 2000));   // free-tier rate limit: wait 2 s, retry once
    return fn();
  }
}

/** Documents (ingest): batches of ≤ 100. Errors propagate so ingest fails loudly. */
export async function embedDocuments(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 100) {
    const values = texts.slice(i, i + 100);
    const { embeddings } = await withRetry(() =>
      embedMany({ model, values, maxRetries: 0, providerOptions: opts('RETRIEVAL_DOCUMENT') }));
    out.push(...embeddings.map(normalize));
  }
  return out;
}

/** Query (retrieval). Any failure → 503 AI_UNAVAILABLE: never answer without retrieval. */
export async function embedQuery(text: string): Promise<number[]> {
  try {
    const { embedding } = await withRetry(() =>
      embed({ model, value: text, maxRetries: 0, providerOptions: opts('RETRIEVAL_QUERY') }));
    return normalize(embedding);
  } catch (e) {
    logger.error({ err: e }, 'embedding failed');
    throw new AppError(503, 'AI_UNAVAILABLE', 'The AI service is unavailable. Please try again.');
  }
}
```
(`maxRetries: 0` turns off the SDK's own retries so the "one retry after 2 s" rule is the only one. Import `logger` from S1's `common/logger.ts`.)

**`embeddings.test.ts`** (unit, never calls the API — mock `ai`):
```ts
vi.mock('ai', () => ({
  embed: vi.fn(async () => ({ embedding: Array(768).fill(2) })),
  embedMany: vi.fn(async ({ values }: { values: string[] }) => ({ embeddings: values.map(() => Array(768).fill(2)) })),
}));
```
Tests: (a) `embedDocuments` of 250 texts calls `embedMany` 3 times (100/100/50) with `taskType: 'RETRIEVAL_DOCUMENT'` and `outputDimensionality: 768`, and every returned vector has length 768 and norm ≈ 1 (`toBeCloseTo(1, 6)`); (b) `embedQuery` passes `taskType: 'RETRIEVAL_QUERY'` and returns a unit vector; (c) `embed` rejecting once with `{ statusCode: 429 }` then resolving → `embedQuery` succeeds and `embed` was called twice (use `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync(2000)`); (d) `embed` rejecting with a non-429 error → `embedQuery` rejects with code `AI_UNAVAILABLE`; (e) a 767-length vector → throws. Set `process.env.LL_EMBED_API_KEY = 'test'` in `backend/vitest.config.ts` `test.env` via a `contract:` request to S1 if env parsing fails in tests. Any other unit test that imports code reaching `embeddings.ts` (e.g. `policyAssistant`) mocks `../rag/embeddings.js` (or `ai`) the same way — unit tests never call the Gemini API.

Acceptance:
```bash
cd backend && npx vitest run src/ai/rag/embeddings.test.ts   # all green, no network
npx tsx -e "import('./src/ai/rag/embeddings.ts').then(async m => { const v = await m.embedQuery('foreclosure charges'); console.log(v.length, Math.hypot(...v).toFixed(4)); })"
# expect: 768 1.0000   (needs internet + LL_EMBED_API_KEY)
```
Troubleshooting:
- Startup fails with `Invalid environment: LL_EMBED_API_KEY: ...` → put a Gemini key from aistudio.google.com in the root `.env` (needed even if chat uses NVIDIA).
- `429` / `RESOURCE_EXHAUSTED` (free-tier rate limit) → the code already waits 2 s and retries once; if ingest still fails, wait a minute and re-run `npm run ingest` (it is idempotent). Do not lower batch size below what is needed; 10 docs fit in a few calls.
- `400` mentioning `outputDimensionality` or the model name → check `LL_EMBED_MODEL=gemini-embedding-001` and `LL_EMBED_DIMENSIONS=768`.
- Retrieval distances all near 1 → vectors were stored or queried without `normalize`; re-ingest after fixing.

### 1.6 `backend/src/ai/rag/ingest.ts`, `ingestCli.ts`, `makePdf.ts` (M2-1, M2-5)
**PDF parsing — check the installed version first:** `node -p "require('./node_modules/pdf-parse/package.json').version"` (run in `backend/`).
- `1.x` → `import pdfParse from 'pdf-parse/lib/pdf-parse.js'` (importing the package root runs a debug block that reads a test file and crashes under ESM) → `(await pdfParse(buffer)).text`.
- `2.x` → `import { PDFParse } from 'pdf-parse'` → `(await new PDFParse({ data: buffer }).getText()).text`.

`ingest.ts` exports:
```ts
export const KbMetaSchema = z.object({
  documentKey: z.string().regex(/^[A-Z0-9]+(-[A-Z0-9]+)*$/),
  title: z.string().min(3), version: z.string().min(1),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  loanType: z.enum(['PERSONAL','HOME','VEHICLE','EDUCATION','ALL']),
  documentType: z.enum(['TERMS_AND_CONDITIONS','RATE_FEE_SCHEDULE','CREDIT_POLICY','KYC_CHECKLIST','PREPAYMENT_POLICY','GRIEVANCE','REGULATORY_CIRCULAR','OFFICER_PLAYBOOK']),
  audience: z.enum(['CUSTOMER','INTERNAL']),
  customerSegment: z.enum(['SALARIED','SELF_EMPLOYED','STUDENT','ALL']).default('ALL'),
});
export type KbMeta = z.infer<typeof KbMetaSchema>;
export async function ingestFile(args: { buffer: Buffer; fileName: string; meta: KbMeta;
  status: 'DRAFT' | 'PUBLISHED'; createdBy: string; changeNote: string }): Promise<KnowledgeDocumentDto>
export async function ingestAll(): Promise<KnowledgeDocumentDto[]>          // reads db/knowledge/manifest.json
export async function ensureKnowledgeBase(): Promise<void>                  // if kb_document is empty → ingestAll()
export async function listKnowledgeDocuments(today = todayIso()): Promise<KnowledgeDocumentDto[]>   // versions IN FORCE only
export function toKnowledgeDocumentDto(row: KbDocument & { _count: { chunks: number } }): KnowledgeDocumentDto
```
`KnowledgeDocumentDto` = openapi `KnowledgeDocument`: `{ documentId, documentKey, title, version, effectiveDate (YYYY-MM-DD), loanType, documentType, audience, customerSegment, status, chunkCount, ingestedAt (ISO) }`. There is **no** `isLatest` field.

`ingestFile` logic (in this order):
1. If a `KbDocument` with the same `documentKey` + `version` exists → throw `AppError(409, 'INVALID_STATE', \`Version ${version} of ${documentKey} already exists; upload a new version number\`)`. Check this first so a duplicate never costs an embedding call.
2. Pick the parser by extension (`.md`, `.pdf`, `.csv`, `.json`; anything else → 400 `VALIDATION_FAILED`).
3. Chunk with the matching chunker; mask every chunk's `content` with `maskPii`.
4. Embed `"${title} | ${headingPath.join(' > ')}\n${content}"` for each chunk with `embedDocuments(texts)` (one call per file; it batches ≤ 100 and normalises; the prefix improves retrieval; store only `content`). Do this **before** opening the transaction so a slow or failed API call never holds a DB transaction open.
5. In one `prisma.$transaction(async (tx) => …)`: create the `KbDocument` with `{ ...meta, effectiveDate: new Date(meta.effectiveDate), status, changeNote, createdBy, sourceFile: fileName }` plus, when `status === 'PUBLISHED'`, `publishedBy: createdBy, publishedAt: new Date()`; insert each chunk with raw SQL (`i` = chunk index, so preview keeps document order):
   ```ts
   await tx.$executeRaw`INSERT INTO kb_chunk (id, document_id, ordinal, section, content, metadata, embedding)
     VALUES (${randomUUID()}, ${doc.id}, ${i}, ${c.section}, ${c.content}, ${JSON.stringify(c.metadata)}::jsonb, ${pgvector.toSql(vec)}::vector(768))`;
   ```
   A Prisma unique violation (`P2002`, two uploads racing) → the same 409 as step 1. Never delete or overwrite an existing version.
6. Return the DTO (with `chunkCount`). Nothing else is recomputed: which version is served is decided at query time (step 1.7).

`ingestAll` resolves the folder as `fileURLToPath(new URL('../../../../db/knowledge/', import.meta.url))`, reads `manifest.json`, validates each entry with `KbMetaSchema.extend({ file: z.string() })`, and for each entry in order: if `(documentKey, version)` already exists → log `skipped <documentKey> v<version> (exists)` and continue (**idempotent**, and a version an admin retired stays retired); else `ingestFile({ …, status: 'PUBLISHED', createdBy: 'system', changeNote: 'Initial load' })` and log `ingested <documentKey> v<version>: <n> chunks`. Files under `db/knowledge/demo/` are never ingested by this command.

`listKnowledgeDocuments` = `prisma.kbDocument.findMany({ where: { id: { in: await inForceIds(today) } }, include: { _count: { select: { chunks: true } } } })` mapped with `toKnowledgeDocumentDto`, sorted by title.

`ingestCli.ts`: `await ingestAll(); await prisma.$disconnect();` and prints a table of documentKey/version/status/servingState/chunkCount (servingState from `servingStateOf`, step 1.11). Run it with `npx tsx src/ai/rag/ingestCli.ts`. Ask S1 (via `contract:` PR) to add the npm script `"ingest": "tsx src/ai/rag/ingestCli.ts"`; until then use the `npx tsx` form.

`makePdf.ts` (dependency-free, text-only PDF writer used only to produce the KB PDF; tested by hand: the output reads back correctly with `pdftotext`):
```ts
import { readFileSync, writeFileSync } from 'node:fs';
const [src, out] = process.argv.slice(2);
if (!src || !out) throw new Error('usage: npx tsx src/ai/rag/makePdf.ts <in.md> <out.pdf>');
// Helvetica only covers ASCII: ₹ → "Rs. ", other non-ASCII → "-"
const esc = (s: string) => s.replace(/₹/g, 'Rs. ').replace(/[^\x20-\x7E]/g, '-')
  .replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
const lines = readFileSync(src, 'utf8').split('\n').map((l) => l.replace(/^#+\s*/, '').replace(/\*\*/g, ''));
const perPage = 48; const pages: string[][] = [];
for (let i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage));
const objs: string[] = []; const add = (s: string) => (objs.push(s), objs.length);
const catalog = add(''), pagesObj = add(''), font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
const kids: number[] = [];
for (const p of pages) {
  const body = `BT /F1 10 Tf 14 TL 50 800 Td ${p.map((l) => `(${esc(l)}) '`).join(' ')} ET`;
  const content = add(`<< /Length ${Buffer.byteLength(body)} >>\nstream\n${body}\nendstream`);
  kids.push(add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${content} 0 R >>`));
}
objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
objs[pagesObj - 1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`;
let pdf = '%PDF-1.4\n';
const offsets = objs.map((o, i) => { const off = Buffer.byteLength(pdf); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; return off; });
const xref = Buffer.byteLength(pdf);
pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
pdf += `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
writeFileSync(out, pdf, 'latin1');
console.log(`wrote ${out} (${kids.length} page(s))`);
```
Acceptance:
```bash
cd backend && npx tsx src/ai/rag/ingestCli.ts
# expect 12 lines, all status PUBLISHED; "VEHICLE-TNC 2025.1 SUPERSEDED", "VEHICLE-TNC 2026.3 ACTIVE"; every chunkCount ≥ 1
npx tsx src/ai/rag/ingestCli.ts   # run twice: 12 "skipped … (exists)" lines, same 12 rows, no duplicates (idempotent)
psql "$DATABASE_URL" -c "select document_key, version, status, created_by, change_note, (select count(*) from kb_chunk c where c.document_id=d.id) n from kb_document d order by document_key, version;"
# expect created_by system, change_note "Initial load" on every row
```
**Commit:** `M2-1: ingestion for md/pdf/csv/json with documentKey versions`

### 1.7 `backend/src/ai/rag/retriever.ts` (M2-4, M2-5, M2-10)
```ts
export type Audience = 'CUSTOMER' | 'INTERNAL';
export interface RetrieveFilters { loanType?: string; customerSegment?: string; documentType?: string }
export interface RetrievedChunk { id: string; section: string; content: string; title: string; version: string;
  effectiveDate: string /* YYYY-MM-DD */; audience: Audience; loanType: string; distance: number }
export const MAX_DISTANCE = 0.6;   // cosine distance; tune with the 5 brief questions (see below) and record the final value
export function allowedAudiences(a: Audience): Audience[]   // 'CUSTOMER' → ['CUSTOMER']; 'INTERNAL' → ['CUSTOMER','INTERNAL']
export interface RetrieveOptions { onlyDocumentId?: string; today?: string /* YYYY-MM-DD, default todayIso() */ }
export async function retrieve(question: string, audience: Audience, filters: RetrieveFilters = {}, k = 5, opts: RetrieveOptions = {}): Promise<RetrievedChunk[]>
export const todayIso = (now: Date = new Date()): string => now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
export const inForceCte = (today: string) => Prisma.sql`in_force AS (
  SELECT DISTINCT ON (document_key) id FROM kb_document
  WHERE status = 'PUBLISHED' AND effective_date <= ${today}::date
  ORDER BY document_key, effective_date DESC, published_at DESC)`;   // the ONE definition of "version in force" (Integration_Contracts §8a)
export async function inForceIds(today = todayIso()): Promise<string[]>  // prisma.$queryRaw`WITH ${inForceCte(today)} SELECT id FROM in_force` → ids
```
"Version in force" = for each `documentKey`, the PUBLISHED row with the highest `effectiveDate ≤ today` (tie → latest `publishedAt`). It is computed on every query, so a future-dated version starts serving on its date with no cron, and retiring the active version instantly re-activates the previous published one. `inForceCte` is the only place this rule is written; `inForceIds`, `listKnowledgeDocuments` and the admin `servingState` all reuse it.

SQL (use `Prisma.sql`, `Prisma.join`, `Prisma.empty` from `@prisma/client`; ignore a filter whose value is undefined or `'ALL'`). Run inside a transaction so the HNSW search looks at enough candidates before the WHERE filter removes non-served versions / internal docs:
```ts
const v = pgvector.toSql(await embedQuery(question));   // normalised 768-dim; failure → 503 AI_UNAVAILABLE
const today = opts.today ?? todayIso();
// test-ask (admin): search ONLY this version, whatever its status; no in_force, no audience/loanType/segment/documentType filter
const scope = opts.onlyDocumentId
  ? Prisma.sql`WHERE d.id = ${opts.onlyDocumentId}`
  : Prisma.sql`JOIN in_force inf ON inf.id = d.id
    WHERE d.audience::text IN (${Prisma.join(allowedAudiences(audience))})
      ${f.loanType ? Prisma.sql`AND d.loan_type::text IN (${f.loanType}, 'ALL')` : Prisma.empty}
      ${f.customerSegment ? Prisma.sql`AND d.customer_segment::text IN (${f.customerSegment}, 'ALL')` : Prisma.empty}
      ${f.documentType ? Prisma.sql`AND d.document_type::text = ${f.documentType}` : Prisma.empty}`;
const rows = await prisma.$transaction(async (tx) => {
  await tx.$executeRaw`SET LOCAL hnsw.ef_search = 200`;
  return tx.$queryRaw<RawRow[]>`
    WITH ${inForceCte(today)}
    SELECT c.id, c.section, c.content, d.title, d.version,
           to_char(d.effective_date, 'YYYY-MM-DD') AS "effectiveDate",
           d.audience::text AS audience, d.loan_type::text AS "loanType",
           (c.embedding <=> ${v}::vector(768)) AS distance
    FROM kb_chunk c JOIN kb_document d ON d.id = c.document_id
    ${scope}
    ORDER BY c.embedding <=> ${v}::vector(768)
    LIMIT ${k}`;
});
```
Return rows with `distance` as `Number(distance)`. Callers treat rows with `distance > MAX_DISTANCE` as "not found". (`ef_search = 200` is larger than the whole demo KB, so a single-document test-ask still finds that document's chunks.)

**Tuning MAX_DISTANCE:** after ingest, write a throwaway script (do not commit) that prints the top-3 distances for the 5 brief questions, the playbook question and "What is the capital of France?". Pick a value just above the worst *relevant* top-1 distance and below the off-topic top-1. Put the chosen value in the constant and record the measured distances in `docs/TEST_PROMPTS.md` ("Retrieval threshold" section).

**`retriever.test.ts`** (needs Postgres running + ingest done; `beforeAll(() => ingestAll(), 180_000)`; it is idempotent). Tests 1 and 2 pin `today: '2026-08-01'` so a demo v2026.4 published on the same DB (step 1.11) cannot change the result:
1. `retrieve('Can I foreclose my vehicle loan after six months, and are there any charges?', 'CUSTOMER', {}, 5, { today: '2026-08-01' })` → at least one row has `title === 'Vehicle Loan Terms and Conditions'` and `version === '2026.3'`; **no** row has `version === '2025.1'`.
2. `inForceIds('2026-08-01')` contains the id of `VEHICLE-TNC` `2026.3` and not the id of `VEHICLE-TNC` `2025.1`.
3. `retrieve('What processing fee waiver can loan officers offer to salaried customers with high credit scores?', 'CUSTOMER')` → no row with `audience === 'INTERNAL'`; same question with `'INTERNAL'` → some row has `title === 'Loan Officer Playbook'`.
4. With filter `{ loanType: 'HOME' }`, no row has `loanType` other than `HOME` or `ALL`.

**Versioning fixtures** (same file, own `describe`): in `beforeAll`, delete leftovers (`prisma.kbDocument.deleteMany({ where: { documentKey: 'TEST-ZORBLAX' } })`) then `ingestFile` three versions of a synthetic markdown policy, `documentKey 'TEST-ZORBLAX'`, title `Zorblax Card Terms`, `loanType ALL`, `documentType TERMS_AND_CONDITIONS`, `audience CUSTOMER`, `createdBy 'test'`, `changeNote 'test fixture'`, each with one section `## Annual Fee` reading "The Zorblax card annual fee is ₹111." / "₹222." / "₹333.":
| version | status | effectiveDate |
|---|---|---|
| `1.0` | PUBLISHED | `2026-01-01` |
| `2.0` | DRAFT | `2026-02-01` |
| `3.0` | PUBLISHED | `2026-11-01` |
`afterAll` deletes `documentKey 'TEST-ZORBLAX'` again. Let `served(today) = (await retrieve('What is the Zorblax card annual fee?', 'CUSTOMER', {}, 5, { today })).filter((r) => r.title === 'Zorblax Card Terms').map((r) => r.version)`.
5. **DRAFT never served:** `served('2026-10-23')` contains `'1.0'` and not `'2.0'` (also not `'2.0'` for any `today`, e.g. `'2026-12-31'`).
6. **SCHEDULED not served before its date:** `served('2026-10-31')` contains `'1.0'` and not `'3.0'`; `served('2026-11-01')` contains `'3.0'` and not `'1.0'`.
7. **Retire active → previous comes back:** `prisma.kbDocument.update({ where: { documentKey_version: { documentKey: 'TEST-ZORBLAX', version: '3.0' } }, data: { status: 'RETIRED', retiredAt: new Date(), retiredReason: 'test rollback' } })`; then `served('2026-11-01')` contains `'1.0'` and not `'3.0'`.
8. **test-ask scope:** `retrieve('What is the Zorblax card annual fee?', 'CUSTOMER', {}, 5, { onlyDocumentId: <id of 2.0> })` returns only rows of version `2.0` (a DRAFT is searchable for test-ask, nothing else).
Set `{ timeout: 180_000 }` on both describes (ingest calls the Gemini API). This is an integration test: it needs Postgres, internet and `LL_EMBED_API_KEY`; skip it with `describe.skipIf(!process.env.LL_EMBED_API_KEY || process.env.LL_EMBED_API_KEY === 'test')` so `npm test` stays green without network access, and run it for real before the PR.

**Commit:** `M2-5: metadata-filtered pgvector retrieval over versions in force`

### 1.8 `backend/src/ai/rag/schemas.ts` + `policyAssistant.ts` (M2-6, M2-7, M2-9)
`schemas.ts` (copied field-for-field from openapi `PolicyAnswer`):
```ts
export const PolicyAnswerSchema = z.object({
  answer: z.string(),
  confidence: z.enum(['HIGH','MEDIUM','LOW']),
  sources: z.array(z.object({ document: z.string(), section: z.string(), version: z.string(), effectiveDate: z.string() })),
  followUpRequired: z.boolean(),
});
export type PolicyAnswer = z.infer<typeof PolicyAnswerSchema>;
export const PolicyAskBodySchema = z.object({
  question: z.string().trim().min(3).max(1000),
  loanType: z.enum(['PERSONAL','HOME','VEHICLE','EDUCATION','ALL']).optional(),
  customerSegment: z.enum(['SALARIED','SELF_EMPLOYED','STUDENT','ALL']).optional(),
});
export const SAFE_ANSWER: PolicyAnswer = {
  answer: "I couldn't find this in Kestrel Bank's approved documents. Please contact your loan officer or the call centre.",
  confidence: 'LOW', sources: [], followUpRequired: true,
};
const GroundedSchema = z.object({   // what the LLM returns — it never writes sources
  answer: z.string(), confidence: z.enum(['HIGH','MEDIUM','LOW']),
  usedChunkIds: z.array(z.string()), followUpRequired: z.boolean(),
});
```
`policyAssistant.ts`:
```ts
export async function askPolicy(question: string, filters: RetrieveFilters, audience: Audience, opts: RetrieveOptions = {}): Promise<PolicyAnswer>
```
(`opts` is passed straight to `retrieve(q, audience, filters, 5, opts)`; only the admin test-ask sets `opts.onlyDocumentId`. `/api/policy/ask` and `search_policy` never pass it.)
(`audience` is the single `Audience` from Integration_Contracts §6; `'INTERNAL'` means "staff: may see CUSTOMER and INTERNAL documents".) Logic:
1. `const q = maskPii(question)`.
2. `const chunks = (await retrieve(q, audience, filters, 5, opts)).filter((c) => c.distance <= MAX_DISTANCE)`.
3. If `chunks.length === 0` → return `SAFE_ANSWER` **without calling the LLM**.
4. Label chunks `C1..Cn`. Build the prompt:
   ```
   Context:
   [C1] (Vehicle Loan Terms and Conditions › Foreclosure and Part-Prepayment, version 2026.3, effective 2026-07-01)
   <content>

   [C2] (...)
   <content>

   Question: <q>
   ```
5. `structured({ schema: GroundedSchema, system: POLICY_SYSTEM_PROMPT, prompt })` with this system prompt **verbatim**:
   ```
   You are Kestrel Bank's lending policy assistant.
   Answer the question using ONLY the numbered context passages. Each passage starts with an id such as [C1].
   Rules:
   1. Use only facts written in the context. Never use outside or general knowledge, even if you believe you know the answer.
   2. Quote figures (percentages, rupee amounts, days, months, EMIs, credit scores) exactly as written in the context. Do not calculate, convert or round any number. If the exact figure asked for is not written in the context, state the rule that is written instead.
   3. If the context does not contain the answer, set "answer" to "NOT_FOUND", "confidence" to "LOW", "usedChunkIds" to [] and "followUpRequired" to true.
   4. "usedChunkIds" lists the id of every passage you used, for example ["C1","C3"].
   5. Write 1 to 3 short sentences in plain language a customer can understand. No markdown, no legal jargon.
   6. Never include personal data such as PAN, Aadhaar or account numbers.
   7. confidence is "HIGH" when one passage states the answer directly, "MEDIUM" when you combined passages or the passage only partly answers, otherwise "LOW".
   8. followUpRequired is true when the customer must contact the bank or give more information to get a complete answer, otherwise false.
   Return only a JSON object with exactly these keys: answer (string), confidence ("HIGH" | "MEDIUM" | "LOW"), usedChunkIds (array of strings), followUpRequired (boolean).
   ```
6. In **code**: keep only `usedChunkIds` that exist in the labelled set. If the answer is `NOT_FOUND` or no valid id remains → return `SAFE_ANSWER`.
7. Build `sources` in code from the used chunks: `{ document: title, section, version, effectiveDate }` (YYYY-MM-DD), de-duplicated by `document+section+version`, in the order of the ids. The LLM never writes sources.
8. If `confidence === 'LOW'` force `followUpRequired = true`. Return `PolicyAnswerSchema.parse(result)`.
9. Log `{ audience, chunkIds, topDistance }` (no question text unless masked).

### 1.9 `backend/src/ai/rag/router.ts` + `ai/index.ts` (M2-1, M2-9, M2-10)
Read S1's `app.ts` to see where `aiRouter` is mounted (expected `app.use('/api', aiRouter)`) and read `common/auth.ts` for `requireAuth`, `requireRole(...)` and the shape of `req.user` (expected `{ username, role, customerId }`). Use S1's async-error helper if one exists (`wrap()` or `express-async-errors`). Routers contain no logic — parse, call the service, send.

| Method + path | Roles | Body / params (zod) | Response |
|---|---|---|---|
| `POST /api/policy/ask` | any authenticated | `PolicyAskBodySchema` | 200 `PolicyAnswer`; audience = `req.user.role === 'CUSTOMER' ? 'CUSTOMER' : 'INTERNAL'` — **never from the body** |
| `GET /api/knowledge/documents` | LOAN_OFFICER, CREDIT_ANALYST, POLICY_ADMIN | — | 200 `KnowledgeDocument[]` = `listKnowledgeDocuments()` (versions **in force** only), sorted by title |

There is **no** `POST /api/knowledge/documents` and no upload route for LOAN_OFFICER / CREDIT_ANALYST. Policies are created only through `/api/admin/policies` (step 1.11, POLICY_ADMIN).

`ai/index.ts`: `export const aiRouter = Router();` mount the policy/knowledge router, the policy-admin router at `aiRouter.use('/admin/policies', policyAdminRouter)` (step 1.11), and later advisor, workflow, audit routers so the final paths are exactly the ones in `openapi.yaml`. Also, outside tests, start the KB seed in the background: `if (process.env.NODE_ENV !== 'test') void ensureKnowledgeBase().catch((e) => logger.error({ err: e }, 'kb seed failed'));` (docs/ASSUMPTIONS.md already says the KB is seeded at startup).

Errors: zod errors → S1's errorHandler returns 400 `VALIDATION_FAILED`; missing role → 403 `FORBIDDEN` (S1's `requireRole`); LLM failure → 503 `AI_UNAVAILABLE` (from `structured()`).

### 1.10 Phase 1 acceptance (run, then paste real outputs into `docs/TEST_PROMPTS.md`)
```bash
docker compose up -d && cd backend && npx prisma migrate dev && npm run seed && npx tsx src/ai/rag/ingestCli.ts && npm test && npm run dev
# new terminal:
login() { curl -s -X POST localhost:8080/api/auth/login -H 'content-type: application/json' -d "{\"username\":\"$1\",\"password\":\"password\"}" | jq -r .token; }
T=$(login priya.sharma); O=$(login officer.kumar)
ask() { curl -s -X POST localhost:8080/api/policy/ask -H "authorization: Bearer $1" -H 'content-type: application/json' -d "{\"question\":\"$2\"}" | jq; }
ask $T "What documents do I need for a home loan if I am self-employed?"
ask $T "What is the processing fee for a personal loan of ₹3 lakh?"
ask $T "Can I foreclose my vehicle loan after six months, and are there any charges?"
ask $T "What is the minimum credit score required for a home loan?"
ask $T "How long does disbursal take after approval?"
ask $T "What is the capital of France?"
ask $T "What processing fee waiver can loan officers offer to salaried customers with high credit scores?"
ask $O "What processing fee waiver can loan officers offer to salaried customers with high credit scores?"
```
Expected (check each; wording may vary, facts and sources may not):
| # | Must contain in `answer` | `sources` must include |
|---|---|---|
| Q1 | ITR for 2 years, audited P&L and balance sheet, GST returns, 12 months' bank statements, property documents | `KYC and Document Checklist` / `Home Loan — Self-Employed Applicants` / `2026.1` |
| Q2 | `₹4,500` (or `4,500`) and `GST`; no other computed amount | `Personal Loan Terms and Conditions` / `Processing Fee Illustrations` or `Processing Fee` / `2026.1` |
| Q3 | `6 EMIs` and `2%` of outstanding principal; confidence `HIGH` | `Vehicle Loan Terms and Conditions` / `Foreclosure and Part-Prepayment` / `2026.3` / `2026-07-01`; **never** `2025.1` |
| Q4 | `700` (salaried) and `720` (self-employed) | `Credit Policy and Eligibility Criteria` / `Credit Score Requirements` / `2026.2` |
| Q5 | `2–3 working days` (personal/vehicle) and `7–10 working days` (home) | `General Loan Terms and Conditions` / `Disbursal Timelines` / `2026.1` |
| off-topic | exactly `SAFE_ANSWER` (`confidence` LOW, `sources` [], `followUpRequired` true) | — |
| playbook as customer | exactly `SAFE_ANSWER`, or at minimum: no `Loan Officer Playbook` source and no "50%" in the answer | never `Loan Officer Playbook` |
| playbook as officer | "up to 50%" and "780" | `Loan Officer Playbook` / `Processing Fee Waivers` / `2026.1` |

If a question fails: first check the retrieved chunks and distances (log them), then the KB text, then MAX_DISTANCE. Never "fix" an answer by adding facts to the prompt.

**Commits:** `M2-6: grounded policy answers with code-built sources`, `M2-7: safe not-found response`, `M2-10: role-derived audience filter`. Tick M2-1..M2-10, M2-K1..K9, M2-Q1..Q5 in `REQUIREMENTS.md` with file paths.

### 1.11 Policy admin: `ai/rag/policyAdminService.ts` + `ai/rag/policyAdminRouter.ts` (X-1, ADR-18)
Rules are Integration_Contracts §8a (canonical). Lifecycle `DRAFT → PUBLISHED → RETIRED`, only `POLICY_ADMIN`, published rows immutable, version in force computed at query time (`inForceCte`, step 1.7).

**Audit helper** — add to `backend/src/ai/audit/auditService.ts` now (create the file if step 3.2 is not done yet; 3.2 adds the rest of the file):
```ts
export async function recordPolicyEvent(e: { actor: string; eventType: 'POLICY_DRAFTED' | 'POLICY_PUBLISHED' | 'POLICY_RETIRED';
  documentKey: string; version: string; changeNote?: string; reason?: string; status: PolicyStatus }): Promise<string>   // returns auditTrailId
```
- One trail per policy: find the `AgentRun` with `applicationId = documentKey` and `auditTrailId` starting with `AUD-POL-`; if none, create it with id `` `AUD-POL-${String(randomInt(0, 100000)).padStart(5, '0')}` `` (retry on unique conflict). So `GET /api/audit/AUD-POL-NNNNN` shows the full governance history of that policy.
- In one transaction: `sequence = (max sequence of that trail ?? 0) + 1`; create `AuditEvent { agent: e.actor /* username */, eventType: e.eventType, toolName: null, input: maskObject({ documentKey, version, changeNote } or { documentKey, version, reason }), output: maskObject({ status }), durationMs: 0 }`.

**`policyAdminService.ts`** (all `today` params default to `todayIso()`):
```ts
export type ServingState = 'ACTIVE' | 'SCHEDULED' | 'SUPERSEDED' | 'DRAFT' | 'RETIRED';
export function servingStateOf(row: { id: string; status: PolicyStatus; effectiveDate: Date }, activeIds: Set<string>, today: string): ServingState
export async function listLibrary(today?: string): Promise<PolicyLibraryItem[]>
export async function listVersions(documentKey: string, today?: string): Promise<PolicyVersionDto[]>
export async function uploadDraft(args: { buffer: Buffer; fileName: string; meta: KbMeta; changeNote: string; actor: string }): Promise<PolicyVersionDto>
export async function previewVersion(documentId: string): Promise<{ section: string; content: string }[]>
export async function testAsk(documentId: string, question: string): Promise<PolicyAnswer>
export async function publishVersion(documentId: string, actor: string, today?: string): Promise<PolicyVersionDto>
export async function retireVersion(documentId: string, reason: string, actor: string, today?: string): Promise<PolicyVersionDto>
```
- `servingStateOf`: `DRAFT` → `'DRAFT'`; `RETIRED` → `'RETIRED'`; PUBLISHED and `activeIds.has(id)` → `'ACTIVE'`; PUBLISHED with `effectiveDate` (YYYY-MM-DD) `> today` → `'SCHEDULED'`; any other PUBLISHED → `'SUPERSEDED'`. `activeIds = new Set(await inForceIds(today))` — never re-implement the in-force rule.
- `PolicyVersionDto` = openapi `PolicyVersion` = `toKnowledgeDocumentDto(row)` + `{ changeNote, createdBy, publishedBy, publishedAt, retiredAt, retiredReason, servingState }` (dates ISO, nulls kept).
- `listLibrary`: all rows (with chunk counts) grouped by `documentKey`, one `PolicyLibraryItem` per key sorted by title: `title`/`documentType`/`audience` from the newest version; `activeVersion`/`activeEffectiveDate` from the ACTIVE row (else null); `scheduledVersion`/`scheduledEffectiveDate` from the SCHEDULED row with the earliest effectiveDate (else null); `draftCount` = DRAFT rows; `totalVersions` = all rows.
- `listVersions`: rows of that key, newest first (`effectiveDate desc, ingestedAt desc`); none → 404 `NOT_FOUND`.
- `uploadDraft`: `ingestFile({ buffer, fileName, meta, status: 'DRAFT', createdBy: actor, changeNote })` (reuses chunker + `embedDocuments` + the 409 duplicate check on `(documentKey, version)`), then `recordPolicyEvent({ actor, eventType: 'POLICY_DRAFTED', documentKey, version, changeNote, status: 'DRAFT' })`; return the version DTO.
- `previewVersion`: 404 if the document does not exist; else its chunks `orderBy: { ordinal: 'asc' }` as `{ section, content }`.
- `testAsk`: 404 if the document does not exist; else `askPolicy(maskPii(question), {}, 'INTERNAL', { onlyDocumentId: documentId })` (staff audience, this version only, works for DRAFT). Writes no audit event and changes nothing.
- `publishVersion`: 404 if missing; `status !== 'DRAFT'` → 409 `INVALID_STATE` `` `Only DRAFT versions can be published (current: ${status})` ``; else update `{ status: 'PUBLISHED', publishedBy: actor, publishedAt: new Date() }` with `where: { id, status: 'DRAFT' }` (`updateMany`; count 0 → same 409, guards a double click), `recordPolicyEvent(POLICY_PUBLISHED, changeNote = the row's changeNote)`, return the DTO (its `servingState` is `ACTIVE` if effectiveDate ≤ today, `SCHEDULED` if later).
- `retireVersion`: `reason.trim().length < 5` → 400 `VALIDATION_FAILED` `Retire reason is required (min 5 characters)`; 404 if missing; `status !== 'PUBLISHED'` → 409 `INVALID_STATE` `` `Only PUBLISHED versions can be retired (current: ${status})` ``; else update `{ status: 'RETIRED', retiredAt: new Date(), retiredReason: reason.trim() }` (same `updateMany` guard), `recordPolicyEvent(POLICY_RETIRED, reason)`, return the DTO. No other row changes: the previous published version becomes ACTIVE by the query-time rule.
- Content and chunks of an existing version are never updated or deleted by any function here.

**`policyAdminRouter.ts`** — `router.use(requireAuth, requireRole('POLICY_ADMIN'))` (use S1's helpers exactly as written), mounted in `ai/index.ts` as `aiRouter.use('/admin/policies', policyAdminRouter)`. Actor = `req.user.username`. Routers contain no logic.
| Method + path | Body / params (zod) | Response |
|---|---|---|
| `GET /api/admin/policies` | — | 200 `PolicyLibraryItem[]` |
| `POST /api/admin/policies` | multipart: `file` + `KbMetaSchema.extend({ changeNote: z.string().trim().min(5) })` fields; multer `memoryStorage`, `limits.fileSize` 5 MB, extensions `.pdf .md .csv .json` (else 400 `VALIDATION_FAILED`) | 201 `PolicyVersion` (DRAFT); 409 duplicate version |
| `GET /api/admin/policies/:documentKey/versions` | `documentKey` = KbMetaSchema's regex | 200 `PolicyVersion[]`; 404 |
| `GET /api/admin/policies/versions/:documentId/preview` | `documentId` uuid | 200 `{ section, content }[]`; 404 |
| `POST /api/admin/policies/versions/:documentId/test-ask` | `{ question: z.string().trim().min(3).max(1000) }` | 200 `PolicyAnswer`; 404 |
| `POST /api/admin/policies/versions/:documentId/publish` | — | 200 `PolicyVersion`; 409 `INVALID_STATE` |
| `POST /api/admin/policies/versions/:documentId/retire` | `{ reason: z.string().trim().min(5) }` | 200 `PolicyVersion`; 400; 409 `INVALID_STATE` |
Every other role gets 403 `FORBIDDEN` on all of these (S1's `requireRole`).

**`policyAdminService.test.ts`** (needs Postgres; no network: `vi.mock('./embeddings.js', () => ({ embedDocuments: vi.fn(async (t: string[]) => t.map(() => Array(768).fill(1 / Math.sqrt(768)))), embedQuery: vi.fn() }))`; `vi.mock('../audit/auditService.js', () => ({ recordPolicyEvent: vi.fn(async () => 'AUD-POL-00001') }))`; use `documentKey 'TEST-ADMIN'`, delete it in `beforeEach` and `afterAll`; a tiny markdown buffer with one `##` section):
1. **Publish only from DRAFT:** `uploadDraft` v`1.0` → `status 'DRAFT'`, `servingState 'DRAFT'`; `publishVersion` → `status 'PUBLISHED'`, `publishedBy 'admin.rao'`, `publishedAt` set; a second `publishVersion` on the same id rejects with status 409 / code `INVALID_STATE`; `publishVersion` on a RETIRED row also rejects 409.
2. **Retire requires reason:** on a PUBLISHED row, `retireVersion(id, '', 'admin.rao')` and `retireVersion(id, 'abc', …)` reject with 400 `VALIDATION_FAILED` and the row stays PUBLISHED; `retireVersion(id, 'Wrong charge published', …)` → `status 'RETIRED'`, `retiredReason` set; retiring a DRAFT → 409 `INVALID_STATE`.
3. **Duplicate version → 409:** a second `uploadDraft` with the same `documentKey` + `version` rejects with 409 `INVALID_STATE`, `embedDocuments` was called only once, and there is still exactly one row.
4. **Audit event written:** after upload → publish → retire, `recordPolicyEvent` was called three times with `expect.objectContaining({ actor: 'admin.rao', eventType: 'POLICY_DRAFTED' | 'POLICY_PUBLISHED' | 'POLICY_RETIRED', documentKey: 'TEST-ADMIN', version: '1.0' })` in that order; the RETIRED call carries `reason`, the others `changeNote`.
5. **servingState:** upload + publish v`1.0` effective `2026-01-01` and v`2.0` effective `2026-11-01`; `listVersions('TEST-ADMIN', '2026-10-23')` → 2.0 `SCHEDULED`, 1.0 `ACTIVE`; with `'2026-11-01'` → 2.0 `ACTIVE`, 1.0 `SUPERSEDED`.
Skip the file with `describe.skipIf(!process.env.DATABASE_URL)` if S1's test env has no database.

**Acceptance (live, as `admin.rao`; server running, phase-1 setup done):**
```bash
A=$(login admin.rao); T=$(login priya.sharma); O=$(login officer.kumar)
H='content-type: application/json'; TODAY=$(date +%F); LATER=$(date -d '+30 days' +%F)
FQ="Can I foreclose my vehicle loan after six months, and are there any charges?"
cask() { curl -s -X POST localhost:8080/api/policy/ask -H "authorization: Bearer $T" -H "$H" -d "{\"question\":\"$FQ\"}" | jq -c '{answer, v: [.sources[].version]}'; }
curl -s localhost:8080/api/admin/policies -H "authorization: Bearer $A" | jq -c '.[] | select(.documentKey=="VEHICLE-TNC")'
# expect activeVersion "2026.3", scheduledVersion null, draftCount 0, totalVersions 2
# 1. upload v2026.4 as DRAFT
up() { curl -s -X POST localhost:8080/api/admin/policies -H "authorization: Bearer $A" \
  -F file=@../db/knowledge/demo/vehicle-tnc-v2026.4.md -F documentKey=VEHICLE-TNC -F "title=Vehicle Loan Terms and Conditions" \
  -F version=$1 -F effectiveDate=$2 -F loanType=VEHICLE -F documentType=TERMS_AND_CONDITIONS -F audience=CUSTOMER -F customerSegment=ALL \
  -F "changeNote=$3"; }
ID=$(up 2026.4 $TODAY "Foreclosure lock-in reduced to 3 EMIs" | tee /dev/stderr | jq -r .documentId)   # 201, status DRAFT, servingState DRAFT
up 2026.4 $TODAY "Foreclosure lock-in reduced to 3 EMIs" | jq -c '{status,code}'                        # 409 INVALID_STATE (duplicate version)
cask                                                                                                     # still v2026.3: 6 EMIs, 2%  (DRAFT not served)
# 2. preview + test-ask the draft
curl -s localhost:8080/api/admin/policies/versions/$ID/preview -H "authorization: Bearer $A" | jq -r '.[].section'   # document order; includes "Foreclosure and Part-Prepayment"
curl -s -X POST localhost:8080/api/admin/policies/versions/$ID/test-ask -H "authorization: Bearer $A" -H "$H" -d "{\"question\":\"$FQ\"}" | jq -c '{answer, v: [.sources[].version]}'
# expect "3 EMIs" and "1%", sources version ["2026.4"]
# 3. publish → live immediately
curl -s -X POST localhost:8080/api/admin/policies/versions/$ID/publish -H "authorization: Bearer $A" | jq -c '{status,servingState,publishedBy}'   # PUBLISHED ACTIVE admin.rao
cask                                                                                                     # "3 EMIs", "1%", v ["2026.4"]
curl -s localhost:8080/api/admin/policies/VEHICLE-TNC/versions -H "authorization: Bearer $A" | jq -c '.[] | {version,status,servingState}'
# expect 2026.4 ACTIVE, 2026.3 SUPERSEDED, 2025.1 SUPERSEDED
# 4. retire → instant rollback
curl -s -X POST localhost:8080/api/admin/policies/versions/$ID/retire -H "authorization: Bearer $A" -H "$H" -d '{"reason":""}' | jq -c '{status,code}'   # 400 VALIDATION_FAILED
curl -s -X POST localhost:8080/api/admin/policies/versions/$ID/retire -H "authorization: Bearer $A" -H "$H" -d '{"reason":"Published before legal sign-off"}' | jq -c '{status,servingState,retiredReason}'   # RETIRED RETIRED
cask                                                                                                     # back to "6 EMIs", "2%", v ["2026.3"]
# 5. scheduled publish (future date): stored, not served yet
ID5=$(up 2026.5 $LATER "Foreclosure lock-in reduced to 3 EMIs from next month" | jq -r .documentId)
curl -s -X POST localhost:8080/api/admin/policies/versions/$ID5/publish -H "authorization: Bearer $A" | jq -c '{version,status,servingState,effectiveDate}'   # 2026.5 PUBLISHED SCHEDULED $LATER
cask                                                                                                     # still v ["2026.3"]
curl -s localhost:8080/api/admin/policies -H "authorization: Bearer $A" | jq -c '.[] | select(.documentKey=="VEHICLE-TNC") | {activeVersion,scheduledVersion,totalVersions}'   # "2026.3" "2026.5" 4
# 6. permissions + audit
curl -s -o /dev/null -w '%{http_code}\n' localhost:8080/api/admin/policies -H "authorization: Bearer $O"   # 403 (officer)
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:8080/api/knowledge/documents -H "authorization: Bearer $O"   # 404 (no upload route for staff; GET only)
psql "$DATABASE_URL" -c "select e.sequence, e.agent, e.event_type, e.input_json from audit_event e join agent_run r using (audit_trail_id) where r.application_id='VEHICLE-TNC' order by e.sequence;"
# expect agent admin.rao: POLICY_DRAFTED 2026.4, POLICY_PUBLISHED 2026.4, POLICY_RETIRED 2026.4 (with reason), POLICY_DRAFTED 2026.5, POLICY_PUBLISHED 2026.5; trail id AUD-POL-NNNNN
```
The 2026.5 upload reuses the demo file on purpose (version metadata, not file text, is what answers cite). To rerun the demo on the same DB, use new version numbers or reset the KB (`TRUNCATE kb_document CASCADE` + ingest). Paste the real outputs into `docs/TEST_PROMPTS.md` → "Policy governance".

**Commits:** `X-1: policy admin draft, preview, test-ask, publish, retire`, `X-1: POLICY_* audit events`. Tick X-1 in `REQUIREMENTS.md` with file paths.

---

## 4. Phase 2 — AI Loan Advisor (M1-10..M1-16)

### 2.1 `backend/src/ai/advisor/schemas.ts`
Copied field-for-field from openapi `AdvisorResponse` (brief Module 1):
```ts
export const AdvisorRecommendationSchema = z.object({
  productId: z.string(), productName: z.string(), indicativeInterestRate: z.number(),
  tenureMonths: z.number().int(), estimatedEmi: z.number().int(), reason: z.string(),
  eligibilityIndicator: z.enum(['LIKELY_ELIGIBLE','BORDERLINE','UNLIKELY_ELIGIBLE','UNKNOWN']),
});
export const AdvisorResponseSchema = z.object({
  interpretedRequirement: z.string(),
  loanAmount: z.number().int().nullable(), monthlyIncome: z.number().int().nullable(), maxPreferredEmi: z.number().int().nullable(),
  currency: z.literal('INR'),
  recommendations: z.array(AdvisorRecommendationSchema),
  disclaimer: z.literal('Indicative only. Final approval is subject to credit assessment.'),
  clarifyingQuestion: z.string().nullable(),
  conversationId: z.string(),
});
export const AdvisorChatBodySchema = z.object({ message: z.string().trim().min(2).max(2000), conversationId: z.string().max(64).nullable().optional() });
export const DISCLAIMER = 'Indicative only. Final approval is subject to credit assessment.';
```

### 2.2 `backend/src/ai/advisor/advisorService.ts`
```ts
export async function advisorChat(message: string, conversationId: string | null, user: AuthUser): Promise<AdvisorResponse>
```
(`AuthUser` = the `req.user` type exported by S1's `common/auth.ts`.)

**Step 1 — LLM extraction** (`structured()`), schema:
```ts
const ExtractionSchema = z.object({
  interpretedRequirement: z.string(),
  loanAmount: z.number().nullable(),
  monthlyIncome: z.number().nullable(),
  annualIncome: z.number().nullable(),
  maxPreferredEmi: z.number().nullable(),
  purpose: z.string().nullable(),
  loanTypeGuess: z.enum(['PERSONAL','HOME','VEHICLE','EDUCATION']).nullable(),
  clarifyingQuestion: z.string().nullable(),
});
```
System prompt **verbatim**:
```
You extract loan requirements for Kestrel Bank's AI loan advisor. You do NOT recommend products and you do NOT calculate EMIs, ratios or eligibility.
Read the customer's message (and the "Known so far" facts if present) and return a JSON object with exactly these keys:
- interpretedRequirement: one short sentence restating the need, for example "Used car loan of 5 lakh with EMI below 12,000".
- loanAmount: the amount the customer wants to borrow, in whole rupees, or null.
- monthlyIncome: monthly income in whole rupees if the customer states a monthly figure, else null.
- annualIncome: yearly income in whole rupees if the customer states a yearly figure, else null. Never convert yearly to monthly yourself.
- maxPreferredEmi: the highest monthly EMI the customer wants, in whole rupees, or null.
- purpose: what the loan is for, in a few words of the customer's own language (for example "used car"), or null.
- loanTypeGuess: VEHICLE for cars, bikes, two-wheelers; HOME for buying, building or renovating a house or flat; EDUCATION for studies, college or course fees; PERSONAL for weddings, medical bills, travel, debt consolidation or other personal needs; null if unclear.
- clarifyingQuestion: if loanAmount is null OR purpose is null, ask exactly ONE short, friendly question that asks only for the missing item(s); otherwise null.
Write Indian amounts as plain integers: "5 lakh" = 500000, "5L" = 500000, "1.5 lakh" = 150000, "1 crore" = 10000000, "60k" = 60000, "₹60,000" = 60000, "12,000" = 12000.
Never invent a value that is not in the message or the known facts. Use null when unsure.
```
Prompt = `Known so far: <JSON of previous merged extraction or "nothing">\nCustomer message: <maskPii(message)>`.

**Step 2 — code only** (no LLM):
1. Conversation memory: module-level `Map<string, Extraction>`; `conversationId = conversationId ?? 'CONV-' + randomUUID().slice(0, 8)`; merge = previous values overwritten by every **non-null** new value. `// shortcut: in-memory, lost on restart, capped at 500 entries; move to DB if multi-instance.`
2. `monthlyIncome = Math.round(merged.monthlyIncome ?? (merged.annualIncome != null ? merged.annualIncome / 12 : NaN))` → `null` if not finite. `loanAmount`, `maxPreferredEmi` → `Math.round` or `null`.
3. If `loanAmount == null || merged.purpose == null || merged.loanTypeGuess == null` → return with `recommendations: []` and `clarifyingQuestion = extraction.clarifyingQuestion ?? fallback`, where fallback is:
   - both missing: `"How much would you like to borrow, and what is the loan for (for example a used car, a home, education or personal needs)?"`
   - amount missing: `"How much would you like to borrow?"`
   - purpose/type missing: `"What is the loan for (for example a used car, a home, education or personal needs)?"`
4. `customer = user.role === 'CUSTOMER' && user.customerId ? await getCustomer(user.customerId) : null`; `obligations = customer?.existingMonthlyObligations ?? 0`.
5. Candidate products = `listProducts()` where `loanType === loanTypeGuess`, `minAmount ≤ loanAmount ≤ maxAmount`, and (if `customer`) `eligibilityCriteria.allowedSegments` includes `customer.segment`.
6. **Purpose keyword filter:** groups `USED = ['used','pre-owned','preowned','second-hand','second hand']`, `NEW = ['new']`. If the purpose (lowercased) contains a word of a group and at least one candidate's `name + ' ' + description` (lowercased) contains a word of the same group, keep only those candidates. (So "used car" keeps only VL-204.)
7. No candidates → `recommendations: []`, `clarifyingQuestion = "None of our <vehicle|home|personal|education> loans cover ₹<amount formatted en-IN>. Would you like to try a different amount?"`.
8. For each candidate: `rate = Number(product.indicativeRate ?? product.minInterestRate)`; `limit = eligibilityCriteria.maxObligationRatioPercent`; tenure grid = multiples of 12 from `ceil(minTenureMonths / 12) * 12` up to `maxTenureMonths` (if empty, `[maxTenureMonths]`).
   - `fits(emi)` = `maxPreferredEmi != null ? emi <= maxPreferredEmi : monthlyIncome != null ? obligationRatioPct(monthlyIncome, obligations, emi) <= limit : true`.
   - If `maxPreferredEmi == null && monthlyIncome == null`: tenure = largest grid value ≤ 60 (else the smallest grid value); `fitsPreference = true`.
   - Else: tenure = **shortest** grid value with `fits(calculateEmi(loanAmount, rate, t))`; if none fits, tenure = longest grid value and `fitsPreference = false`.
   - `estimatedEmi = calculateEmi(loanAmount, rate, tenure)` — from `coreBridge` (S1's `loanMath.ts`). Never compute EMI anywhere else.
   - Eligibility: `monthlyIncome == null` → `UNKNOWN`; else `ratio = obligationRatioPct(monthlyIncome, obligations, estimatedEmi)`; `monthlyIncome < minMonthlyIncome` → `UNLIKELY_ELIGIBLE`; `ratio <= limit` → `LIKELY_ELIGIBLE`; `ratio <= limit + 5` → `BORDERLINE`; else `UNLIKELY_ELIGIBLE`.
   - `pctOfIncome = monthlyIncome != null ? Math.round(obligationRatioPct(monthlyIncome, 0, estimatedEmi)) : null`.
9. Sort: `fitsPreference` first, then `estimatedEmi` ascending; keep the top 3.

Worked check for the brief query (VL-204, rate 11.0, grid 12…84): 12 → 44191, 24 → 23304, 36 → 16369, 48 → **12923 (> 12000)**, 60 → **10871 (≤ 12000)** ⇒ tenure **60**, EMI **10871**, pctOfIncome **18**, ratio 18.1 % (staff caller) or (8000 + 10871) / 60000 = 31.5 % (Priya) ⇒ **LIKELY_ELIGIBLE** either way.

**Step 3 — LLM writes only the `reason` text** (`structured()`), schema `z.object({ reasons: z.array(z.object({ productId: z.string(), reason: z.string() })) })`, system prompt **verbatim**:
```
You write the "reason" text for loan recommendations shown to a customer.
For each item write ONE plain-language sentence of at most 20 words explaining why this tenure suits the customer.
Use only the numbers given in the item, exactly as written. Do not calculate, round or add any other number. Do not promise approval.
Return only a JSON object: {"reasons":[{"productId": string, "reason": string}]} with one entry per item and the same productIds.
```
Prompt = JSON array of `{ productId, productName, tenureMonths, estimatedEmi, indicativeInterestRate, maxPreferredEmi, pctOfIncome, fitsPreference, eligibilityIndicator }`.
**Number guard (code):** extract every number from the reason with `/\d[\d,]*(\.\d+)?/g`, strip commas, and require each to equal one of `{tenureMonths, estimatedEmi, indicativeInterestRate, maxPreferredEmi, pctOfIncome, loanAmount, monthlyIncome}`; also reject reasons over 200 chars or containing "approved"/"guarantee". Put this helper in `backend/src/ai/common/numberGuard.ts` (`onlyKnownNumbers(text, allowed: (number|null)[]): boolean`) with a 3-case test. If the guard fails, the LLM call fails, or a productId is missing → use the **deterministic fallback**:
- fits and `pctOfIncome != null`: `` `${tenure}-month tenure keeps EMI within the limit (about ${pctOfIncome}% of income)` `` ← exactly the brief's sentence for VL-204
- fits, no income, has maxPreferredEmi: `` `${tenure}-month tenure keeps EMI within your preferred limit` ``
- fits, no income, no maxPreferredEmi: `` `${tenure}-month tenure at the ${rate}% indicative rate keeps the EMI manageable` ``
- not fits: `` `Even at the longest tenure of ${tenure} months the EMI is above your preferred limit` ``

**Step 4 — response:** `{ interpretedRequirement: extraction.interpretedRequirement || \`${purpose} loan of ₹${loanAmount}\`, loanAmount, monthlyIncome, maxPreferredEmi, currency: 'INR', recommendations, disclaimer: DISCLAIMER, clarifyingQuestion: null, conversationId }` → `AdvisorResponseSchema.parse(...)` before returning.

### 2.3 `backend/src/ai/advisor/router.ts`
`POST /api/advisor/chat`, any authenticated role, body `AdvisorChatBodySchema`, returns 200 `AdvisorResponse`. Mount in `ai/index.ts`.

### 2.4 `backend/src/ai/advisor/advisorService.test.ts` (LLM mocked)
```ts
vi.mock('../coreBridge.js', async () => await import('../stub/core.js'));
vi.mock('../config/llm.js', () => ({ structured: vi.fn(), plainText: vi.fn() }));
```
1. `structured` resolves first with `{ interpretedRequirement: 'Used car loan of 5 lakh with EMI below 12,000', loanAmount: 500000, monthlyIncome: 60000, annualIncome: null, maxPreferredEmi: 12000, purpose: 'used car', loanTypeGuess: 'VEHICLE', clarifyingQuestion: null }`, then **rejects** (reason step) → expect `recommendations` length 1 with `{ productId: 'VL-204', productName: 'Kestrel Pre-Owned Car Loan', indicativeInterestRate: 11, tenureMonths: 60, estimatedEmi: 10871, reason: '60-month tenure keeps EMI within the limit (about 18% of income)', eligibilityIndicator: 'LIKELY_ELIGIBLE' }`, `currency 'INR'`, the exact disclaimer, `clarifyingQuestion: null`.
2. "I want a loan" → extraction all null with `clarifyingQuestion: 'How much would you like to borrow, and what is the loan for?'` → `recommendations: []`, `clarifyingQuestion` equals that string.
3. Number guard: reason step resolves with `'60-month tenure, EMI about 11,500'` → the reason falls back to the template (11500 is not a known number).

### 2.5 Phase 2 acceptance
```bash
curl -s -X POST localhost:8080/api/advisor/chat -H "authorization: Bearer $T" -H 'content-type: application/json' \
  -d '{"message":"I need ₹5 lakh for a used car. I earn ₹60,000 per month and want an EMI below ₹12,000."}' | jq
# expect: loanAmount 500000, monthlyIncome 60000, maxPreferredEmi 12000, currency "INR",
#         recommendations[0] = VL-204 / "Kestrel Pre-Owned Car Loan" / 11 / 60 / 10871 / LIKELY_ELIGIBLE,
#         disclaimer "Indicative only. Final approval is subject to credit assessment.", clarifyingQuestion null
curl -s -X POST localhost:8080/api/advisor/chat -H "authorization: Bearer $T" -H 'content-type: application/json' -d '{"message":"I want a loan"}' | jq
# expect: recommendations [], clarifyingQuestion non-null; then answer it with the returned conversationId:
curl -s -X POST localhost:8080/api/advisor/chat -H "authorization: Bearer $T" -H 'content-type: application/json' \
  -d '{"message":"5 lakh for a used car, I earn 60k a month","conversationId":"<id from previous>"}' | jq   # expect VL-204 recommendations
```
**Commits:** `M1-11: advisor extraction with structured output`, `M1-12: product and tenure selection in code`, `M1-14: clarifying question and conversation memory`. Tick M1-10..M1-16.

---

## 5. Phase 3 — Agentic workflow (M3-1..M3-14, G-1..G-4)

### 3.0 Integrate with S1 first (once S1's core services are on `main`)
```bash
git checkout main && git pull && git checkout feat/s2-ai && git rebase main
```
1. Rewrite `src/ai/coreBridge.ts` to call S1's real functions and map into the `Ai*` interfaces (step S.2). Only this file changes.
2. Move the stub out of the runtime path, keep it as the test fake:
   ```bash
   git mv src/ai/stub/core.ts src/ai/testing/fakeCore.ts
   grep -rl "stub/core.js" src/ai | xargs sed -i 's#\.\./stub/core\.js#../testing/fakeCore.js#g'
   grep -rn "stub/core\|testing/fakeCore" src/ai --include=*.ts | grep -v "\.test\.ts"   # expect: no output (runtime never imports the fake)
   ```
3. `npx tsc --noEmit && npm test` → zero errors. Fix field-name mismatches **inside `coreBridge.ts` only**.
4. Re-run the Phase 1 and Phase 2 curls against the real seed.
**Commit:** `M3-8: switch coreBridge to S1 core services`

### 3.1 `backend/src/ai/agents/types.ts`
```ts
export type AgentName = 'DocumentVerificationAgent' | 'CreditAssessmentAgent' | 'ComplianceAgent' | 'CustomerCommunicationAgent' | 'OrchestratorAgent';
export type CheckResult = 'PASS' | 'FAIL' | 'INCOMPLETE' | 'EXCEPTION';
export interface AgentCheck { agent: AgentName; result: CheckResult; detail: string }          // exactly the brief's checks[] item
export interface AgentCheckInternal extends AgentCheck {                                        // facts never leave the server
  facts?: { creditScore?: number; band?: string; ratioPct?: number; missingDocuments?: string[]; exceptions?: string[] } }
export interface AgentCustomer { customerId: string; fullName: string; segment: CustomerSegment; employmentType: string;
  monthlyIncome: number; existingMonthlyObligations: number; location: string; kycStatus: 'VERIFIED' | 'PENDING' | 'FAILED' }
export function toAgentCustomer(c: Record<string, unknown>): AgentCustomer   // explicit field-by-field pick (G-1): anything else (gender, religion, caste, marital status, dateOfBirth…) is dropped
export interface AuditInput { agent: AgentName; eventType: AuditEventType; toolName?: string | null;
  input?: Record<string, unknown>; output?: Record<string, unknown>; durationMs?: number }
export interface AuditWriter { auditTrailId: string; record(e: AuditInput): Promise<void> }
export interface AgentContext { application: AiApplication; customer: AgentCustomer; documents: AiDocument[];
  product: AiProduct; audit: AuditWriter; options: { demoPermissionViolation: boolean } }
```
Decision inputs are only: documents, income, obligations, credit score, KYC, product rules, requested amount/tenure (Integration_Contracts §7, G-1).

### 3.2 `backend/src/ai/audit/auditService.ts` + `router.ts` (M3-12)
```ts
export async function createTrail(applicationId: string): Promise<AuditWriter>
export async function completeTrail(auditTrailId: string, recommendation: AgentRecommendation): Promise<void>
export async function getAuditTrail(auditTrailId: string): Promise<AuditTrailDto>                 // 404 NOT_FOUND if unknown
export async function getLatestRecommendation(applicationId: string): Promise<AgentRecommendation> // 404 NOT_FOUND if none; S1 may import this for LoanApplication.latestRecommendation
```
- Trail id: S1's `newId('AUD')` from `common/ids.ts` if it returns `AUD-YYYY-NNNNN`; otherwise generate `` `AUD-${new Date().getUTCFullYear()}-${String(randomInt(0, 100000)).padStart(5, '0')}` `` and retry on unique conflict. Expected shape `/^AUD-\d{4}-\d{5}$/` (e.g. `AUD-2026-77301`).
- `createTrail` inserts the `AgentRun` row (`startedAt` now) and returns a writer whose `record()` keeps a per-trail `sequence` counter starting at 1 and writes `AuditEvent` with `input: maskObject(e.input ?? {})`, `output: maskObject(e.output ?? {})`, `durationMs: e.durationMs ?? 0`, `timestamp: new Date()`.
- `completeTrail` sets `completedAt` and `recommendation`.
- `AuditTrailDto` = openapi `AuditTrail`: `{ auditTrailId, applicationId, startedAt, completedAt, events: [{ sequence, timestamp, agent, eventType, toolName, input, output, durationMs }] }` ordered by `sequence`.
- `recordPolicyEvent` (policy trails `AUD-POL-NNNNN`) was added in step 1.11; keep it in this file.
- `GET /api/audit/:auditTrailId` — LOAN_OFFICER, CREDIT_ANALYST, POLICY_ADMIN; param zod `/^AUD-(\d{4}|POL)-\d{5}$/`. POLICY_ADMIN may read only `AUD-POL-*` trails (else 403 `FORBIDDEN`), per the Integration_Contracts §2 matrix.

### 3.3 `backend/src/ai/tools/mockTools.ts` (M3-8)
Each tool has a zod `inputSchema` and a plain `run(input)` function, collected in `TOOL_SPECS: Record<ToolName, { description: string; inputSchema: z.ZodTypeAny; run: (input: any) => Promise<unknown> }>`; also export the AI SDK objects `getCreditScore = tool({ description, inputSchema, execute: run })` etc. (camelCase export, snake_case name — Integration_Contracts §1).

| tool | input | behaviour (deterministic) | output |
|---|---|---|---|
| `get_credit_score` | `{ customerId }` | `SCORES = { 'CUST-1001': 742, 'CUST-1002': 668, 'CUST-1003': 705 }`, unknown → 650. Band: `lo = Math.floor(score / 40) * 40` → `` `${lo}-${lo + 40}` `` (742 → `720-760`, 668 → `640-680`, 705 → `680-720`) | `{ score, band }` |
| `verify_income` | `{ customerId, declaredIncome }` | `RECORDS = { 'CUST-1001': { verifiedIncome: 60000, nameMatch: true, addressMatch: true, panOnRecord: 'ABCPS1234K' }, 'CUST-1002': { 95000, true, true, 'BCDRV5678L' }, 'CUST-1003': { 10000, true, true, 'CDEAI9012M' } }`, unknown → `{ verifiedIncome: declaredIncome, true, true, panOnRecord: null }`. `verified = Math.abs(declaredIncome - verifiedIncome) / verifiedIncome <= 0.2` (PANs are synthetic; they exist so the audit trail shows masking `XXXXX1234X`) | `{ verified, verifiedIncome, nameMatch, addressMatch, panOnRecord }` |
| `get_kyc_status` | `{ customerId }` | `(await getCustomer(customerId)).kycStatus` | `{ status }` |
| `update_application` | `{ applicationId, status: z.string(), note }` | if `status` is not `UNDER_VERIFICATION` or `UNDER_REVIEW` → `throw new AgentPermissionDeniedError('OrchestratorAgent', 'update_application', \`status ${status} is not allowed for agents (G-2)\`)`; else `await transition(applicationId, status, 'OrchestratorAgent', note)`. `status` is `z.string()` on purpose so an illegal target reaches this check and gets logged, instead of failing zod silently. | `{ ok: true }` |
| `search_policy` | `{ question, filters?: { loanType?, customerSegment?, documentType? } }` | `askPolicy(question, filters ?? {}, 'INTERNAL')` | `PolicyAnswer` |

### 3.4 `backend/src/ai/tools/permissionGuard.ts` (M3-11, G-4)
```ts
export const TOOL_PERMISSIONS: Record<ToolName, AgentName[]> = {      // copied from Integration_Contracts §7
  get_credit_score:   ['CreditAssessmentAgent'],
  verify_income:      ['DocumentVerificationAgent', 'CreditAssessmentAgent'],
  get_kyc_status:     ['ComplianceAgent'],
  update_application: ['OrchestratorAgent'],
  search_policy:      ['ComplianceAgent'],
};
export class AgentPermissionDeniedError extends Error { constructor(public agent: AgentName, public tool: string, reason?: string) }
export function isAllowed(agent: AgentName, tool: ToolName): boolean
export async function invokeTool<T = unknown>(agent: AgentName, tool: ToolName, input: unknown, audit: AuditWriter): Promise<T>
export function guardedTools(agent: AgentName, audit: AuditWriter): ToolSet   // only the allowed tools, each tool({ description, inputSchema, execute: (i) => invokeTool(agent, name, i, audit) })
```
`invokeTool` logic:
1. Not allowed → `audit.record({ agent, eventType: 'PERMISSION_DENIED', toolName: tool, input: { agent, tool, input }, output: { error: \`${agent} is not permitted to call ${tool}\` } })`, `logger.warn(...)`, throw `AgentPermissionDeniedError`.
2. Parse `input` with the tool's `inputSchema`.
3. `record TOOL_CALL` (input) → `run` → `record TOOL_RESULT` (output, `durationMs`).
4. If `run` throws `AgentPermissionDeniedError` (e.g. `update_application` to `APPROVED`) → `record PERMISSION_DENIED` with the reason, rethrow. Any other error → `record TOOL_RESULT` with `{ error: message }`, rethrow.

The workflow invokes tools from code through this guard (Decisions.md #8: explicit, auditable sequence that survives flaky tool-calling on NIM). `guardedTools()` is the same guard packaged for an LLM tool loop (`generateText({ tools: guardedTools(...), stopWhen: stepCountIs(3) })`) and is unit-tested; say exactly that in GUARDRAILS.md — do not claim the LLM drives the tools.

`permissionGuard.test.ts` (no DB: use an in-memory writer `{ auditTrailId: 'AUD-2026-00000', record: async (e) => { events.push(e) } }`; `vi.mock('../coreBridge.js', async () => await import('../stub/core.js'))`; `vi.mock('../rag/policyAssistant.js', …)`; call `resetStub()` in `beforeEach`):
1. `isAllowed` matches the table for all 5 tools × 5 agents (loop over an expected map).
2. `invokeTool('CustomerCommunicationAgent', 'get_credit_score', { customerId: 'CUST-1001' }, audit)` rejects with `AgentPermissionDeniedError`; `events` has one `PERMISSION_DENIED` with `toolName 'get_credit_score'` and **no** `TOOL_CALL`.
3. `invokeTool('OrchestratorAgent', 'update_application', { applicationId: 'LA-2026-00418', status: 'APPROVED', note: 'x' }, audit)` rejects with `AgentPermissionDeniedError`; a `PERMISSION_DENIED` event exists; `(await getApplication('LA-2026-00418')).status === 'SUBMITTED'`.
4. `invokeTool('CreditAssessmentAgent', 'get_credit_score', { customerId: 'CUST-1001' }, audit)` resolves `{ score: 742, band: '720-760' }`; events are `TOOL_CALL` then `TOOL_RESULT`.
5. `Object.keys(guardedTools('ComplianceAgent', audit)).sort()` equals `['get_kyc_status', 'search_policy']`; `guardedTools('CustomerCommunicationAgent', audit)` is `{}`.
6. `await guardedTools('CreditAssessmentAgent', audit).get_credit_score.execute!({ customerId: 'CUST-1001' }, { toolCallId: 't1', messages: [] })` returns score 742 and records `TOOL_CALL`.

### 3.5 The agents (`backend/src/ai/agents/`)
Each file exports `run<Name>Agent(ctx: AgentContext): Promise<AgentCheckInternal>` (Integration_Contracts §1/§7). **Doc, Credit and Compliance `detail` strings are deterministic templates**, because the brief fixes their format and numbers; the LLM writes customer-facing text only (Communication agent, advisor reasons, policy answers). Format rupees with `toLocaleString('en-IN')`.

**`documentVerificationAgent.ts` — DocumentVerificationAgent (M3-2)**
- Required: `[['IDENTITY','Identity proof'], ['ADDRESS','Address proof'], ['INCOME','Income proof']]`; `missing` = labels whose type is absent from `ctx.documents` (in that order).
- `inc = invokeTool('DocumentVerificationAgent', 'verify_income', { customerId, declaredIncome: application.monthlyIncome })`.
- Mismatches: `!inc.nameMatch` → `Name does not match bank records`; `!inc.addressMatch` → `Address does not match bank records`; `!inc.verified` → `` `Declared income ₹${declared} does not match verified income ₹${verifiedIncome}` ``.
- Missing sentence: 1 → `` `${a} is missing` ``; 2 → `` `${a} and ${b} are missing` ``; 3 → `` `${a}, ${b} and ${c} are missing` ``.
- Result: mismatches → `FAIL`, detail = mismatches joined with `; ` (+ `; ` + missing sentence if any); else missing → `INCOMPLETE`, detail = missing sentence; else `PASS`, `All required documents are present and match bank records`. `facts.missingDocuments = missing`.
- LA-2026-00418 → `INCOMPLETE`, `Address proof is missing`, missingDocuments `['Address proof']`.

**`creditAssessmentAgent.ts` — CreditAssessmentAgent (M3-3, M3-9)**
- `s = invokeTool(…, 'get_credit_score', { customerId })`; `inc = invokeTool(…, 'verify_income', { customerId, declaredIncome: application.monthlyIncome })`.
- `rate = Number(product.indicativeRate ?? product.minInterestRate)`; `emi = calculateEmi(application.requestedAmount, rate, application.tenureMonths)`; `ratio = obligationRatioPct(inc.verifiedIncome, application.existingMonthlyObligations, emi)`; `shown = Math.round(ratio)`; `limit = eligibilityCriteria.maxObligationRatioPercent`.
- Rules: `ratio <= limit`, `s.score >= minCreditScore`, `inc.verifiedIncome >= minMonthlyIncome`. All true → `PASS`, else `FAIL`.
- Detail: `` `Obligation ratio is ${shown}% (limit ${limit}%); credit score band is ${s.band}` `` and, for FAIL, append `; credit score below product minimum ${minCreditScore}` and/or `; income below product minimum ₹${minMonthlyIncome}` and/or `; obligation ratio above limit`.
- `facts = { creditScore: s.score, band: s.band, ratioPct: ratio }`.
- LA-2026-00418: EMI(500000, 12, 48) = 13167; (8000 + 13167) / 60000 = 35.28 % → **`PASS`**, **`Obligation ratio is 35% (limit 50%); credit score band is 720-760`**.

**`complianceAgent.ts` — ComplianceAgent (M3-4)**
- `kyc = invokeTool('ComplianceAgent', 'get_kyc_status', { customerId })`.
- Exceptions (code): `requestedAmount` outside `[minAmount, maxAmount]` → `` `Requested amount ₹${a} is outside the product range ₹${min}–₹${max}` ``; `tenureMonths` outside the product range → `` `Tenure ${t} months is outside the product range ${minT}–${maxT} months` ``; `customer.segment` not in `allowedSegments` → `` `Customer segment ${seg} is not eligible for ${productId}` ``.
- RAG (always, in `try/catch`): `p = invokeTool('ComplianceAgent', 'search_policy', { question: 'What is the policy for loan applications with policy exceptions?', filters: { documentType: 'CREDIT_POLICY' } })`; `policyRef = p.sources[0] ? \`${p.sources[0].document} › ${p.sources[0].section} (v${p.sources[0].version})\` : null`. If it throws (e.g. AI unavailable), continue with `policyRef = null` (the guard already logged the failed call).
- Result: `kyc.status !== 'VERIFIED'` or exceptions → `EXCEPTION`, detail = parts joined with `; ` (`KYC status is PENDING`, exceptions…) + (policyRef ? `` ` — see ${policyRef}` `` : ''); else `PASS`, **`KYC status verified`**. `facts.exceptions = exceptions`.

**`customerCommunicationAgent.ts` — CustomerCommunicationAgent (M3-5)**
Returns `{ customerMessage: string; check: AgentCheckInternal | null }` (it adds no check in a normal run, so `checks[]` has the brief's three items).
- Facts for the LLM: `{ missingDocuments, nextStep: missing.length ? 'UPLOAD_DOCUMENTS' : 'UNDER_REVIEW' }` — nothing else (no score, ratio, band, recommendation).
- `plainText()` with this system prompt **verbatim**:
  ```
  You write short messages from Kestrel Bank to a loan applicant.
  Write at most 2 short sentences in plain, polite English.
  Say only what the customer needs to do next or what the current status is, based on the facts given.
  Never mention credit scores, score bands, obligation ratios, risk bands, internal policies, agents, or whether the loan is likely to be approved or rejected.
  Never include personal data such as PAN, Aadhaar or account numbers. Return only the message text.
  ```
- Record `LLM_CALL` (input = facts) and `LLM_RESULT` (output = `{ text, usedFallback }`).
- Guard: reject the LLM text if it is longer than 300 chars, has more than 2 sentences, or matches `/\d{3}|score|ratio|risk|band|approv|reject|internal|agent/i` → use the fallback.
- Fallback: missing docs → `` `Please upload a valid ${list} to continue your application.` `` where `list` = labels with lowercase first letter joined like the missing sentence (`address proof`; `identity proof and address proof`) → for LA-2026-00418: **`Please upload a valid address proof to continue your application.`**; none missing → `Your application is now with our credit team for review. We will update you here once a decision is made.`
- **Demo hook (G-4):** if `ctx.options.demoPermissionViolation`, first try `invokeTool('CustomerCommunicationAgent', 'get_credit_score', { customerId }, audit)`; catch `AgentPermissionDeniedError` → `check = { agent: 'CustomerCommunicationAgent', result: 'EXCEPTION', detail: 'Refused: CustomerCommunicationAgent is not permitted to call get_credit_score' }`; continue normally.

**`orchestrator.ts` — OrchestratorAgent (M3-6, M3-10, G-2)**
```ts
export async function runWorkflow(applicationId: string, user: AuthUser, opts: { demoPermissionViolation?: boolean } = {}): Promise<AgentRecommendation>
```
1. `app = await getApplication(applicationId)`; status not `SUBMITTED` or `UNDER_VERIFICATION` → `AppError(409, 'INVALID_STATE', \`Workflow can only run on SUBMITTED or UNDER_VERIFICATION applications (current: ${app.status})\`)`. Product missing → 409 `INVALID_STATE` `Application has no product`.
2. `audit = await createTrail(applicationId)`; `record AGENT_START` (Orchestrator, input `{ applicationId, requestedBy: user.username }`).
3. If `SUBMITTED` → `invokeTool('OrchestratorAgent', 'update_application', { applicationId, status: 'UNDER_VERIFICATION', note: 'Agent workflow started' })`.
4. Build `ctx` with `customer: toAgentCustomer(await getCustomer(app.customerId))`, `documents`, `product`, `audit`, `options: { demoPermissionViolation: !!opts.demoPermissionViolation }`.
5. Run **in order** Doc → Credit → Compliance → Communication, each through `runAgent(name, audit, fn)`: records `AGENT_START`, runs, records `AGENT_END` (`{ result, detail }`, durationMs); if the agent throws `AgentPermissionDeniedError` → `EXCEPTION` `` `Refused: ${agent} is not permitted to call ${tool}` ``; any other error → `EXCEPTION` `` `Agent error: ${message}` `` (logged), and the run continues.
6. `checks = [doc, credit, compliance]` + the Communication `check` if not null.
7. Recommendation (first match): any `INCOMPLETE` → `REQUEST_ADDITIONAL_DOCUMENTS`; any `FAIL` → `RECOMMEND_REJECT`; any `EXCEPTION` → `REFER_TO_HUMAN`; else `RECOMMEND_APPROVE`.
8. Risk band from credit facts: missing score or ratio → `MEDIUM`; `score < 680 || ratio > 50` → `HIGH`; `score >= 750 && ratio <= 35` → `LOW`; else `MEDIUM`. (Priya: 742, 35.28 → **MEDIUM**.)
9. HITL (Integration_Contracts §7): reasons = any check ≠ PASS → `` `Check not passed: ${agent} ${result}` ``; `requestedAmount >= 1000000` → `High-value application (₹10,00,000 or more)`; `45 <= ratio <= 55` → `Borderline obligation ratio (45–55%)`; `640 <= score <= 680` → `Borderline credit score (640–680)`; always last: `Standard policy: every final credit decision is made by a Credit Analyst`. `requiresHumanApproval = true` **always**. `record HUMAN_REQUIRED` (output `{ reasons }`).
10. `invokeTool('OrchestratorAgent', 'update_application', { applicationId, status: 'UNDER_REVIEW', note: \`${recommendation}: ${checks.map((c) => \`${c.agent} ${c.result}\`).join(', ')}\` })`.
11. Result = `AgentRecommendationSchema.parse({ applicationId, recommendation, riskBand, checks: checks.map(({ agent, result, detail }) => ({ agent, result, detail })), missingDocuments: doc.facts?.missingDocuments ?? [], customerMessage, requiresHumanApproval: true, auditTrailId: audit.auditTrailId })`; `record AGENT_END` (Orchestrator); `completeTrail(...)`; return.

`schemas.ts` holds `AgentRecommendationSchema` copied field-for-field from openapi (`applicationId`, `recommendation` enum, `riskBand` enum, `checks[]` `{agent enum, result enum, detail}`, `missingDocuments` string[], `customerMessage`, `requiresHumanApproval` boolean, `auditTrailId`).

**Never** in `src/ai`: an import of S1's decision route/service, the strings `'APPROVED'`/`'REJECTED'`/`'DISBURSED'` outside `stub/core.ts`/`testing/fakeCore.ts` and the `update_application` refusal message, or any call to `/decision`. Check before every commit:
```bash
grep -rnE "decision|'APPROVED'|'REJECTED'|'DISBURSED'" src/ai --include=*.ts | grep -vE "stub/core|testing/fakeCore|\.test\.ts"   # expect: no output
```

### 3.6 `backend/src/ai/agents/router.ts`
| Method + path | Roles | Validation | Response |
|---|---|---|---|
| `POST /api/workflow/applications/:applicationId/run` | LOAN_OFFICER, CREDIT_ANALYST | params `applicationId` `/^LA-\d{4}-\d{5}$/`; query `demoPermissionViolation: z.enum(['true','false']).optional()` (route is staff-only, so the demo hook is staff-only) | 200 `AgentRecommendation`; 409 `INVALID_STATE` |
| `GET /api/workflow/applications/:applicationId/recommendation` | LOAN_OFFICER, CREDIT_ANALYST | same param | 200 `AgentRecommendation` (latest `AgentRun` with a recommendation); 404 |
| `GET /api/audit/:auditTrailId` | LOAN_OFFICER, CREDIT_ANALYST, POLICY_ADMIN (`AUD-POL-*` only) | `AUD-YYYY-NNNNN` or `AUD-POL-NNNNN` (regex in §3.2) | 200 `AuditTrail`; 403; 404 |

### 3.7 `backend/src/ai/agents/orchestrator.test.ts` (LLM mocked, no DB)
```ts
const { events } = vi.hoisted(() => ({ events: [] as any[] }));
vi.mock('../coreBridge.js', async () => await import('../stub/core.js'));          // ../testing/fakeCore.js after step 3.0
vi.mock('../config/llm.js', () => ({ structured: vi.fn().mockRejectedValue(new Error('LLM down')), plainText: vi.fn().mockRejectedValue(new Error('LLM down')) }));
vi.mock('../rag/policyAssistant.js', () => ({ askPolicy: vi.fn().mockResolvedValue({ answer: 'Only a credit analyst can approve an exception.', confidence: 'HIGH',
  sources: [{ document: 'Credit Policy and Eligibility Criteria', section: 'Policy Exceptions', version: '2026.2', effectiveDate: '2026-04-01' }], followUpRequired: false }) }));
vi.mock('../audit/auditService.js', () => ({
  createTrail: vi.fn(async () => ({ auditTrailId: 'AUD-2026-77301', record: async (e: any) => { events.push(e); } })),
  completeTrail: vi.fn(async () => {}),
}));
beforeEach(() => { events.length = 0; resetStub(); });
```
Test 1 — `runWorkflow('LA-2026-00418', officer)`:
- `recommendation === 'REQUEST_ADDITIONAL_DOCUMENTS'`, `riskBand === 'MEDIUM'`, `requiresHumanApproval === true`, `auditTrailId` matches `/^AUD-/`
- `checks` deep-equals `[{ agent: 'DocumentVerificationAgent', result: 'INCOMPLETE', detail: 'Address proof is missing' }, { agent: 'CreditAssessmentAgent', result: 'PASS', detail: 'Obligation ratio is 35% (limit 50%); credit score band is 720-760' }, { agent: 'ComplianceAgent', result: 'PASS', detail: 'KYC status verified' }]`
- `missingDocuments` equals `['Address proof']`; `customerMessage === 'Please upload a valid address proof to continue your application.'` (LLM mocked down → fallback)
- `events` contains `HUMAN_REQUIRED`, ≥ 6 `TOOL_CALL`, zero `PERMISSION_DENIED`; stub application status is `UNDER_REVIEW`.
Test 2 — `{ demoPermissionViolation: true }`: 4 checks, the 4th `{ agent: 'CustomerCommunicationAgent', result: 'EXCEPTION', detail: 'Refused: CustomerCommunicationAgent is not permitted to call get_credit_score' }`; exactly one `PERMISSION_DENIED` event; recommendation still `REQUEST_ADDITIONAL_DOCUMENTS`.
Test 3 — call `runWorkflow('LA-2026-00418', officer)` twice in the same test: the second call rejects with status 409 `INVALID_STATE` (status is now `UNDER_REVIEW`).
Test 4 — `toAgentCustomer({ ...priya, gender: 'F', religion: 'X', maritalStatus: 'single' })` has none of those keys (G-1).

### 3.8 Phase 3 acceptance (live, real LLM)
```bash
O=$(login officer.kumar); T=$(login priya.sharma)
curl -s -X POST localhost:8080/api/workflow/applications/LA-2026-00418/run -H "authorization: Bearer $O" | tee /tmp/rec.json | jq
# expect: recommendation REQUEST_ADDITIONAL_DOCUMENTS · riskBand MEDIUM · 3 checks:
#   DocumentVerificationAgent INCOMPLETE "Address proof is missing"
#   CreditAssessmentAgent PASS "Obligation ratio is 35% (limit 50%); credit score band is 720-760"
#   ComplianceAgent PASS "KYC status verified"
# missingDocuments ["Address proof"] · customerMessage asks for address proof · requiresHumanApproval true · auditTrailId AUD-2026-NNNNN
AUD=$(jq -r .auditTrailId /tmp/rec.json)
curl -s localhost:8080/api/audit/$AUD -H "authorization: Bearer $O" | jq '[.events[].eventType] | group_by(.) | map({(.[0]): length}) | add'
# expect: TOOL_CALL 7, TOOL_RESULT 7, HUMAN_REQUIRED 1, AGENT_START ≥ 5, AGENT_END ≥ 5, PERMISSION_DENIED absent
curl -s localhost:8080/api/audit/$AUD -H "authorization: Bearer $O" | grep -c 'XXXXX1234X'   # ≥ 1 (masked PAN)
curl -s localhost:8080/api/audit/$AUD -H "authorization: Bearer $O" | grep -c 'ABCPS1234K'   # 0
curl -s localhost:8080/api/workflow/applications/LA-2026-00418/recommendation -H "authorization: Bearer $O" | jq .recommendation   # "REQUEST_ADDITIONAL_DOCUMENTS"
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:8080/api/workflow/applications/LA-2026-00418/run -H "authorization: Bearer $O"   # 409 (now UNDER_REVIEW)
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:8080/api/workflow/applications/LA-2026-00418/run -H "authorization: Bearer $T"   # 403 (customer)
# reset the seed the way S1's docs/SETUP.md says (e.g. npm run seed), then the G-4 demo:
curl -s -X POST "localhost:8080/api/workflow/applications/LA-2026-00418/run?demoPermissionViolation=true" -H "authorization: Bearer $O" | jq '.checks[3]'
# expect: CustomerCommunicationAgent EXCEPTION "Refused: CustomerCommunicationAgent is not permitted to call get_credit_score"; its audit trail has 1 PERMISSION_DENIED
```
Seven `TOOL_CALL`s = update_application (→ UNDER_VERIFICATION), verify_income (Doc), get_credit_score + verify_income (Credit), get_kyc_status + search_policy (Compliance), update_application (→ UNDER_REVIEW). If your count differs, explain why in the PR, don't change the expectation silently.

**Commits:** `M3-12: masked append-only audit trail`, `M3-11: tool permission guard with refusal logging`, `M3-2: document verification agent`, `M3-3: credit assessment agent`, `M3-4: compliance agent with RAG`, `M3-5: customer communication agent`, `M3-6: orchestrator with HITL`, `M3-14: workflow routes and scenario test`. Tick M3-1..M3-14 and G-1..G-4.

---

## 6. Phase 4 — Docs (D-8, D-9)

### 4.1 `docs/GUARDRAILS.md`
Sections:
1. **Guardrail → enforcement → proof** table, one row each:
| Guardrail | Enforced in (file → function) | Proven by |
|---|---|---|
| G-1 no protected attributes | `ai/agents/types.ts → toAgentCustomer` (explicit pick); `CustomerProfile` has no such fields | `orchestrator.test.ts` test 4 |
| G-2 agents only recommend | `ai/tools/mockTools.ts → update_application` allowlist; no decision import (grep in §3.5) | `permissionGuard.test.ts` test 3 |
| G-3 plain-language reason | check `detail` templates; advisor `reason` + fallback; `customerMessage` | `orchestrator.test.ts` test 1, `advisorService.test.ts` |
| G-4 refuse + log | `ai/tools/permissionGuard.ts → invokeTool` | `permissionGuard.test.ts` tests 2–3; live demo hook |
| Numbers in code | `coreBridge → calculateEmi / obligationRatioPct`; `common/numberGuard.ts` | `advisorService.test.ts` tests 1, 3 |
| RAG only from documents | `retriever.ts → MAX_DISTANCE`; `policyAssistant.ts` SAFE_ANSWER + code-built sources | `retriever.test.ts`; off-topic prompt in TEST_PROMPTS |
| Audience filter | `rag/router.ts` role → audience; `retriever.ts → allowedAudiences` | `retriever.test.ts` test 3 |
| Policy governance (only POLICY_ADMIN changes policies; only the version in force is served; every change audited) | `rag/policyAdminRouter.ts → requireRole('POLICY_ADMIN')`; `retriever.ts → inForceCte` (PUBLISHED, highest effectiveDate ≤ today); `policyAdminService.ts` publish/retire state checks; `auditService.recordPolicyEvent` | `retriever.test.ts` tests 5–8 (DRAFT never served, SCHEDULED waits for its date, retire rolls back); `policyAdminService.test.ts` 1–5; live demo step 1.11 (403 for officer) |
| PII masking | `masking/piiMasker.ts`; `config/llm.ts` masks prompts; `auditService.record` masks payloads; S1 logger | `piiMasker.test.ts`; audit grep `XXXXX1234X` |
| HITL | `orchestrator.ts` step 9 (`requiresHumanApproval` always true, `HUMAN_REQUIRED` event) | `orchestrator.test.ts` test 1 |
2. **Responsible-AI decisions** (3–7 bullets: deterministic routing over autonomous loops, LLM only for wording, synthetic data, analyst always decides, tool calls from code through the guard and `guardedTools()` ready for LLM loops, a bank official (POLICY_ADMIN) reviews and test-asks a draft before it can reach customers and can roll back instantly — ADR-18).
3. **Known limitations** (only true ones, e.g.: search and ingest need internet + a Gemini key (`LL_EMBED_API_KEY`, second key if chat uses NVIDIA) and are subject to Gemini free-tier rate limits; threshold tuned on 7 prompts; mock bureau/KYC; regex masking over-masks 9–18 digit numbers such as phone numbers; in-memory advisor memory; HNSW index invisible to Prisma; policy publishing is single-admin (no maker-checker second approval) and has no side-by-side version diff — both roadmap per Integration_Contracts §8a; "today" for scheduled policies is the Asia/Kolkata calendar date; NIM tool/JSON flakiness → Gemini fallback).

### 4.2 `docs/TEST_PROMPTS.md`
For every demo prompt: the exact request (curl or UI text), the role used, and the **actual output pasted after you ran it** (trim long JSON to the brief's fields). Never write an expected output as if it were observed. Sections: Advisor (brief query, "I want a loan" + follow-up), Policy (Q1–Q5, off-topic, playbook as customer, playbook as officer), Policy governance (as `admin.rao`, step 1.11: library before; upload v2026.4 DRAFT; duplicate upload 409; customer foreclosure question still cites 2026.3; preview sections; test-ask cites 2026.4; publish → ACTIVE; customer question now "3 EMIs, 1%" citing 2026.4; version history; retire without reason 400; retire with reason → customer question cites 2026.3 again; future-dated 2026.5 publish → SCHEDULED and customer still gets 2026.3; officer 403 on `/api/admin/policies`; the `POLICY_*` audit rows), Workflow (normal run, demo permission violation, 409, 403), Audit (event-type counts, masked PAN), Retrieval threshold (measured distances table + final `MAX_DISTANCE`), and the model used (`LL_AI_CHAT_MODEL`).

### 4.3 LLM fallback
If NIM structured output or JSON is unreliable (schema errors, 400 on `response_format`, slow > 20 s): switch `.env` to the Gemini lines in §1, restart, re-run the acceptance blocks, and note the switch in TEST_PROMPTS.md. No code change.

**Commits:** `D-9: guardrails, responsible-AI note and known limitations`, `D-8: test prompts with observed outputs`.

---

## 7. Before you open the PR (each phase)
- [ ] `git diff --name-only main...HEAD` lists only files you own (§0). Nothing under `core/`, `common/`, `config/`, `frontend/`, no `package.json`, nothing above the S2 marker in `schema.prisma`.
- [ ] `npx tsc --noEmit` → 0 errors; `npm test` → all green (paste the summary line in the PR).
- [ ] The decision grep in §3.5 prints nothing.
- [ ] `grep -rn "console.log" src/ai | grep -v Cli.ts | grep -v makePdf.ts` → nothing.
- [ ] `grep -rniE "isLatest|is_latest" src/ai prisma/schema.prisma` → nothing; `grep -rn "kbDocument\.\(update\|delete\)" src/ai --include=*.ts | grep -vE "policyAdminService|\.test\.ts"` → nothing (only the admin service changes policy status).
- [ ] Every response passes its zod schema (`PolicyAnswerSchema`, `AdvisorResponseSchema`, `AgentRecommendationSchema`) before it is sent.
- [ ] The phase's acceptance block was run and outputs are pasted in `docs/TEST_PROMPTS.md`.
- [ ] `REQUIREMENTS.md` boxes ticked only for things you ran, each with the proving file path.
- [ ] New assumptions appended to `docs/ASSUMPTIONS.md` (one line: what, why).
- [ ] Any needed change to an S1/shared file is written up as a `contract:` request, not made.
- [ ] PR: `gh pr create --base main --title "S2 phase N: <topic>" --body "REQ IDs: … Verified: <commands + results>"`.

## 8. Full verification block (end of Phase 3, on `main` after merge)
```bash
docker compose up -d
cd backend && npx prisma migrate deploy && npm run seed && npx tsx src/ai/rag/ingestCli.ts && npm test && npm run dev &
sleep 8
login() { curl -s -X POST localhost:8080/api/auth/login -H 'content-type: application/json' -d "{\"username\":\"$1\",\"password\":\"password\"}" | jq -r .token; }
T=$(login priya.sharma); O=$(login officer.kumar)
H='content-type: application/json'
# M1 advisor → VL-204 / 60 / 10871 / LIKELY_ELIGIBLE / clarifyingQuestion null
curl -s -X POST localhost:8080/api/advisor/chat -H "authorization: Bearer $T" -H "$H" -d '{"message":"I need ₹5 lakh for a used car. I earn ₹60,000 per month and want an EMI below ₹12,000."}' | jq '{loanAmount,monthlyIncome,maxPreferredEmi,currency,r:.recommendations[0],disclaimer,clarifyingQuestion}'
# M1 clarifying → recommendations [] and clarifyingQuestion non-null
curl -s -X POST localhost:8080/api/advisor/chat -H "authorization: Bearer $T" -H "$H" -d '{"message":"I want a loan"}' | jq '{recommendations,clarifyingQuestion}'
# M2 five questions → answer + sources[{document,section,version,effectiveDate}]
for q in "What documents do I need for a home loan if I am self-employed?" "What is the processing fee for a personal loan of ₹3 lakh?" "Can I foreclose my vehicle loan after six months, and are there any charges?" "What is the minimum credit score required for a home loan?" "How long does disbursal take after approval?"; do
  curl -s -X POST localhost:8080/api/policy/ask -H "authorization: Bearer $T" -H "$H" -d "{\"question\":\"$q\"}" | jq -c '{answer,confidence,sources,followUpRequired}'; done
# Q3 must show version "2026.3", effectiveDate "2026-07-01"
# M2 safe + audience
curl -s -X POST localhost:8080/api/policy/ask -H "authorization: Bearer $T" -H "$H" -d '{"question":"What is the capital of France?"}' | jq -c .        # SAFE_ANSWER
curl -s -X POST localhost:8080/api/policy/ask -H "authorization: Bearer $T" -H "$H" -d '{"question":"What processing fee waiver can loan officers offer to salaried customers with high credit scores?"}' | jq -c .sources   # no Loan Officer Playbook
curl -s -X POST localhost:8080/api/policy/ask -H "authorization: Bearer $O" -H "$H" -d '{"question":"What processing fee waiver can loan officers offer to salaried customers with high credit scores?"}' | jq -c .sources   # Loan Officer Playbook
curl -s localhost:8080/api/knowledge/documents -H "authorization: Bearer $O" | jq 'length'   # 11 (versions in force: VEHICLE-TNC counts once, 2026.3)
curl -s -o /dev/null -w '%{http_code}\n' localhost:8080/api/knowledge/documents -H "authorization: Bearer $T"   # 403
# Policy governance → run the step 1.11 acceptance block as admin.rao (draft → preview → test-ask → publish → retire → scheduled)
A=$(login admin.rao); curl -s -o /dev/null -w '%{http_code}\n' localhost:8080/api/admin/policies -H "authorization: Bearer $A"   # 200
curl -s -o /dev/null -w '%{http_code}\n' localhost:8080/api/admin/policies -H "authorization: Bearer $O"   # 403
# M3 workflow → brief shape, REQUEST_ADDITIONAL_DOCUMENTS, ["Address proof"], requiresHumanApproval true
curl -s -X POST localhost:8080/api/workflow/applications/LA-2026-00418/run -H "authorization: Bearer $O" | tee /tmp/rec.json | jq
curl -s localhost:8080/api/audit/$(jq -r .auditTrailId /tmp/rec.json) -H "authorization: Bearer $O" | jq '.events | length'   # ≥ 20
```
Every line's expected value is in the comment next to it. If any line does not match, the phase is not done.
