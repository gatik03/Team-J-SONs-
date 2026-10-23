# Integration Contracts — LoanLens AI

Shared rules every session (S1 core, S2 AI, S3 frontend) builds against. `openapi.yaml` is the executable form of this file; if they disagree, fix `openapi.yaml` via PR and tell the others in the PR title.

## 1. Naming conventions

| Thing | Convention | Example |
|---|---|---|
| JSON fields | camelCase; brief's field names verbatim | `estimatedEmi`, `requiresHumanApproval` |
| Backend folders | `backend/src/<layer>/<feature>/` with `router.ts`, `service.ts`, `schemas.ts` (zod) | `backend/src/core/product/router.ts` |
| Backend files / functions | camelCase files and functions; one exported router per feature | `loanMath.ts` → `calculateEmi()` |
| Prisma models | PascalCase model, `@@map("snake_case")` table, `@map` columns | `model LoanApplication { @@map("loan_application") }` |
| Zod schemas | `<Thing>Schema`, inferred type `<Thing>` | `AdvisorResponseSchema` / `AdvisorResponse` |
| Agents | `<name>Agent.ts` exporting `run<Name>Agent()`; `agent` string in output matches brief | `documentVerificationAgent.ts` → `"DocumentVerificationAgent"` |
| Tools (AI SDK `tool()`) | snake_case tool name, camelCase export | `get_credit_score` / `getCreditScore` |
| DB tables / columns | snake_case, singular table names | `loan_application.requested_amount` |
| IDs | prefixed strings, generated in code | `LA-2026-00418`, `AUD-2026-77301`, `CUST-1001`, `VL-204` |
| Enums | UPPER_SNAKE, values in `openapi.yaml` | `UNDER_VERIFICATION` |
| Env vars | `LL_` prefix; frontend `VITE_` | `LL_AI_API_KEY` |
| React components | PascalCase file = component, one per file, `src/components/<Area>/` | `src/components/products/ProductCard.tsx` |
| React hooks / API fns | `useXxx` / `fetchXxx` in `src/api/` | `useProducts`, `fetchEmi` |
| Routes | kebab-case | `/applications/:applicationId/status` |
| Branches | `feat/s1-core`, `feat/s2-ai`, `feat/s3-frontend`, hotfix `fix/<topic>` | |
| Commits | `<REQ-ID>: <imperative summary>` | `M2-5: latest-effective-version retrieval` |
| Tests | `<file>.test.ts` next to the file (Vitest), FE `Xxx.test.tsx` | `loanMath.test.ts` |

Money: integer rupees in JSON (`500000`), never floats. Rates: percent as number (`11.0`). Dates: ISO `YYYY-MM-DD`; timestamps ISO-8601 UTC.

## 2. Auth and roles

- `POST /api/auth/login` returns `{ token, role, customerId, displayName }`. Token is a signed JWT (HS256 via `jsonwebtoken`, secret from `LL_JWT_SECRET`, default dev value OK). Frontend sends `Authorization: Bearer <token>`.
- Roles: `CUSTOMER`, `LOAN_OFFICER`, `CREDIT_ANALYST`, `POLICY_ADMIN` (bank official who owns the policy library). Seeded users (password `password` for all):

| username | role | customerId |
|---|---|---|
| `priya.sharma` | CUSTOMER (Salaried) | CUST-1001 |
| `rahul.verma` | CUSTOMER (Self-employed) | CUST-1002 |
| `ananya.iyer` | CUSTOMER (Student) | CUST-1003 |
| `officer.kumar` | LOAN_OFFICER | null |
| `analyst.mehta` | CREDIT_ANALYST | null |
| `admin.rao` | POLICY_ADMIN | null |

- Permission matrix (backend enforces; frontend hides):

| Action | CUSTOMER | LOAN_OFFICER | CREDIT_ANALYST | POLICY_ADMIN |
|---|---|---|---|---|
| products, EMI, advisor | ✔ | ✔ | ✔ | ✔ |
| own applications CRUD + upload | ✔ | — | — | — |
| list all applications | — | ✔ | ✔ | — |
| list policies in force (`GET /api/knowledge/documents`) | — | ✔ | ✔ | ✔ |
| **policy admin: draft, preview, test-ask, publish, retire** (`/api/admin/policies/**`) | — | — | — | ✔ **only** |
| policy ask | ✔ (sees CUSTOMER docs) | ✔ (sees CUSTOMER + INTERNAL) | ✔ (sees CUSTOMER + INTERNAL) | ✔ (sees CUSTOMER + INTERNAL) |
| run workflow | — | ✔ | ✔ | — |
| view audit trail | — | ✔ | ✔ | ✔ (policy events) |
| **decision (approve/reject)** | — | — | ✔ **human only** | — |

## 3. Error envelope (every endpoint, every error)

```json
{ "status": 400, "code": "VALIDATION_FAILED", "message": "requestedAmount must be ≥ 1",
  "details": [{ "field": "requestedAmount", "issue": "must be greater than 0" }],
  "timestamp": "2026-10-23T10:00:00Z", "path": "/api/applications" }
```

Codes: `VALIDATION_FAILED` 400, `UNAUTHORIZED` 401, `FORBIDDEN` 403, `NOT_FOUND` 404, `INVALID_STATE` 409, `AI_UNAVAILABLE` 503, `INTERNAL` 500. Implemented once in `backend/src/common/errors.ts` (`AppError` class + Express `errorHandler` middleware; zod errors map to `VALIDATION_FAILED`).

## 4. The three brief JSON shapes (verbatim, do not rename)

See `openapi.yaml` → `AdvisorResponse`, `PolicyAnswer`, `AgentRecommendation`. Backend zod schemas in `backend/src/ai/**/schemas.ts` and frontend types in `frontend/src/api/types.ts` are hand-copied from there and must match field-for-field. The zod schema is also what `generateObject` hands to the LLM, so the model cannot drift from the brief.

## 5. State machine (S1 owns, S2 transitions via `ApplicationService`)

```
DRAFT --submit--> SUBMITTED --workflow run--> UNDER_VERIFICATION --agents done--> UNDER_REVIEW
UNDER_REVIEW --analyst decision--> APPROVED | REJECTED
APPROVED --simulate disburse--> DISBURSED
```
Every transition appends a `status_event` row (`status, at, by, note`) which is the timeline. Transitions go through one function: `core/application/service.ts → transition()`.

## 6. S2 ↔ S1 internal interfaces (TypeScript, same `backend/` package)

Backend layout (S1 creates the skeleton; S2 fills `ai/`):

```
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
    ai/rag/              chunker.ts embeddings.ts ingest.ts retriever.ts policyAssistant.ts router.ts schemas.ts
    ai/advisor/          advisorService.ts router.ts schemas.ts
    ai/agents/           types.ts documentVerificationAgent.ts creditAssessmentAgent.ts complianceAgent.ts customerCommunicationAgent.ts orchestrator.ts router.ts schemas.ts
    ai/tools/            mockTools.ts permissionGuard.ts
    ai/audit/            auditService.ts router.ts
    ai/masking/          piiMasker.ts piiMasker.test.ts
```

```ts
// S1 provides, S2 consumes (import from core/**)
export async function getApplication(applicationId: string): Promise<LoanApplicationWithDocs>;
export async function transition(applicationId: string, to: ApplicationStatus, by: string, note: string): Promise<LoanApplication>;
export async function listDocuments(applicationId: string): Promise<ApplicationDocument[]>;
export async function listProducts(): Promise<LoanProduct[]>;
export async function getProduct(productId: string): Promise<LoanProduct | null>;
export async function getCustomer(customerId: string): Promise<CustomerProfile>;

// S1 provides, everyone uses — the ONLY place numbers are computed (core/emi/loanMath.ts)
export function calculateEmi(principal: number, annualRatePct: number, months: number): number;        // Math.round
export function amortization(principal: number, annualRatePct: number, months: number): ScheduleRow[];
export function obligationRatioPct(monthlyIncome: number, existingObligations: number, proposedEmi: number): number;

// S2 provides, S1/S3 consume via REST only
export async function advisorChat(message: string, conversationId: string | null, user: AuthUser): Promise<AdvisorResponse>;
export async function askPolicy(question: string, filters: PolicyFilters, audience: Audience): Promise<PolicyAnswer>;
export async function runWorkflow(applicationId: string, user: AuthUser): Promise<AgentRecommendation>;
```

Formula: `emi = P * r * (1+r)^n / ((1+r)^n - 1)` with `r = annualRatePct/1200`; `calculateEmi(500000, 11, 60)` must equal **10871**.

## 7. Agent / tool contract (S2)

- Each agent is `run<Name>Agent(ctx: AgentContext): Promise<AgentCheck>` returning `{agent, result, detail}` exactly as in `checks[]`. `AgentContext = { application, customer, documents, product, audit: AuditWriter }`.
- Tools are Vercel AI SDK `tool({ description, inputSchema: z.object(...), execute })` objects exported from `ai/tools/mockTools.ts`:

| tool | input | output | allowed agents |
|---|---|---|---|
| `get_credit_score` | customerId | `{score:300..900, band:"720-760"}` | CreditAssessmentAgent |
| `verify_income` | customerId, declaredIncome | `{verified:boolean, verifiedIncome}` | DocumentVerificationAgent, CreditAssessmentAgent |
| `get_kyc_status` | customerId | `{status:VERIFIED|PENDING|FAILED}` | ComplianceAgent |
| `update_application` | applicationId, status, note | `{ok}` | OrchestratorAgent only |
| `search_policy` | question, filters | `PolicyAnswer` | ComplianceAgent |

- `ai/tools/permissionGuard.ts → guardedTools(agentName)` wraps each tool's `execute`; a call not in this table throws `AgentPermissionDeniedError`, writes a `PERMISSION_DENIED` audit event, and the agent result becomes `EXCEPTION` (guardrail G-4).
- Agents never call `/decision`; `update_application` can only move to `UNDER_VERIFICATION` / `UNDER_REVIEW` (guardrail G-2).
- Decision inputs are only: documents, income, obligations, credit score, KYC, product rules, requested amount/tenure (guardrail G-1).
- `requiresHumanApproval = true` when: any check ≠ PASS, OR requestedAmount ≥ 1,000,000, OR obligationRatio in 45–55 %, OR creditScore in 640–680, OR any policy exception. Always true in this hackathon build (final decision is always human).

## 8. Audit event (S2 writes, S3 renders)

`audit_event(audit_trail_id, sequence, timestamp, agent, event_type, tool_name, input_json, output_json, duration_ms)`; `input_json`/`output_json` pass through `maskPii()` (`ai/masking/piiMasker.ts`) before persistence. Masks: PAN `[A-Z]{5}[0-9]{4}[A-Z]` → `XXXXX1234X`, Aadhaar 12 digits → `XXXX-XXXX-1234`, account numbers 9–18 digits → last 4 only. The same `maskPii()` runs in the pino logger (`common/logger.ts` serializer) so logs are masked too (M2-8).

## 8a. Policy versioning (judge feedback)

- Each `kb_document` row is one **version**. Versions of the same policy share `documentKey` (e.g. `VEHICLE-TNC`); `(documentKey, version)` is unique.
- Lifecycle: `DRAFT → PUBLISHED → RETIRED`. Only `POLICY_ADMIN` moves it. PUBLISHED rows are immutable; a change is always a new version.
- **Version in force** (computed at query time, no cron): for each `documentKey`, the PUBLISHED row with the highest `effectiveDate ≤ today`. A PUBLISHED row with a future date is **SCHEDULED** and starts serving automatically on that date. Retiring the active version instantly re-activates the previous published one (rollback).
- The retriever searches only chunks of versions in force (plus audience/loanType/segment filters). DRAFT, RETIRED, SCHEDULED and superseded versions are never served to `/api/policy/ask`.
- `test-ask` searches only the chosen version's chunks, so an admin can verify a DRAFT before publishing.
- Every admin action writes an audit event `POLICY_DRAFTED | POLICY_PUBLISHED | POLICY_RETIRED` (actor, documentKey, version, changeNote/reason).
- Seed: `npm run ingest` loads `db/knowledge/` as PUBLISHED versions by `system` (vehicle T&C ships as v2025.1 and v2026.3 to show history).
- Out of scope (roadmap): maker-checker second approval, side-by-side version diff.

## 9. Frontend mocks until backend lands (S3)

S3 uses MSW handlers in `frontend/src/mocks/handlers.ts` that return the `example` values from `openapi.yaml` for every endpoint. Switch with `VITE_USE_MOCKS=true|false`. Mocks are deleted from the demo build, never shown to judges as real.

## 10. Shared files — change protocol

`openapi.yaml`, `Integration_Contracts.md`, `docker-compose.yml`, `.env.example`, `backend/package.json`, `backend/prisma/schema.prisma`, `frontend/package.json`: change only in a PR titled `contract: <what>`; post the PR link in the team chat; other sessions pull `main` before touching dependent code.
