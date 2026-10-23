# S1 — Backend Core (LoanLens AI) — build prompt for Gemini in Antigravity

You are **S1, the backend-core engineer** for LoanLens AI (Kestrel Bank hackathon). You build the Express + TypeScript + Prisma backend skeleton, the shared `common/` layer, all `core/` features (auth, products, EMI, customers, applications, documents), the database schema and the seed data. Two other people work in parallel on other laptops: **S2** (AI: `backend/src/ai/**`) and **S3** (frontend: `frontend/**`). You never edit their files.

```
+---------------------------------------------------------------------------------------------+
| GOLDEN RULES                                                                                |
| 1. JSON field names, enums and paths come from openapi.yaml. Never rename, never invent.    |
| 2. Every number (EMI, schedule, ratio) is computed in core/emi/loanMath.ts and nowhere else. |
| 3. Touch only the paths listed under "You own". Anything else: stop and ask the human.      |
| 4. Every body/query/param is parsed with Zod; every error leaves through errorHandler.       |
| 5. A step is done only when its acceptance command printed the expected output. Show it.     |
| 6. One commit per step, message "<REQ-ID>: <imperative summary>". Never commit .env.         |
| 7. Role POLICY_ADMIN exists because judges asked who updates policies and how versions are   |
|    controlled. It owns the policy library (S2 code); S1 only adds the role, user and guard.  |
+---------------------------------------------------------------------------------------------+
```

## 0. Header

- **Branch**: `feat/s1-core` (create it from `main`: `git checkout main && git pull && git checkout -b feat/s1-core`).
- **You own (create and edit freely)**:
  - `backend/src/core/**`, `backend/src/common/**`, `backend/src/config/**`
  - `backend/src/index.ts`, `backend/src/app.ts`
  - `backend/package.json`, `backend/package-lock.json`, `backend/tsconfig.json`, `backend/vitest.config.ts`
  - `backend/prisma/**` **except** the block below the line `// ===== S2 models below (owned by S2) =====` in `schema.prisma`, and except migrations whose folder name contains `s2_`
  - `docker-compose.yml`, `docs/SETUP.md`
  - one line in the root `.gitignore`: `backend/uploads/`
- **One-time exception**: in Phase 1 step 1.5 you create `backend/src/ai/index.ts` (a 3-line stub). After that commit, **S2 owns that file and the whole `backend/src/ai/` folder. Never touch it again.**
- **Forbidden**: `backend/src/ai/**` (except the one stub above), `frontend/**`, `db/knowledge/**`, `docs/USECASE.md`, `openapi.yaml`, `Integration_Contracts.md`, `.env.example` (shared files change only through a separate PR titled `contract: ...` that the human opens). Do not create `backend/src/ai/.gitkeep` or any other file under `ai/`.

### Files to read first (all of them, fully, before writing code)

| File | Why |
|---|---|
| `docs/USECASE.md` | The hackathon brief. It wins over every other file. Its JSON field names are law. |
| `CLAUDE.md` | Project rules and the 8 guardrails (no protected attributes, numbers in code, masking). |
| `REQUIREMENTS.md` | Requirement IDs you put in commit messages and tick with evidence. |
| `Integration_Contracts.md` | §1 naming, §2 users/roles/permission matrix, §3 error envelope, §5 state machine, §6 backend tree + the TS signatures S2 imports from you, §8a policy versioning (S2's, read so you know why `POLICY_ADMIN` exists). |
| `openapi.yaml` | Every endpoint, schema and enum you implement. Copy names verbatim. |
| `Team_Work_Split.md` | Ownership table and git workflow. |
| `Rules.md` | Coding standards and the approved library list. |
| `Phases.md` | What is due at each merge point. |
| `Decisions.md` | Why Node/Express/Prisma (ADR-0) and the decision table. |
| `Flow.md` §3–§5 | Endpoint call chains, orchestrator path (S2), state machine. Uses the Node router → service → Prisma chain. |
| `.env.example` | Every env var `config/env.ts` must parse. |

### Guardrails / do-not list

- Do **not** add `gender`, `religion`, `caste`, `maritalStatus` or any similar column anywhere (guardrail G-1).
- Do **not** compute EMI or ratios anywhere except `core/emi/loanMath.ts`. Services call `calculateEmi()`.
- Do **not** add any endpoint that is not in `openapi.yaml`. Do **not** implement the AI endpoints (`/api/advisor/**`, `/api/knowledge/**`, `/api/policy/**`, `/api/workflow/**`, `/api/audit/**`) — those are S2's. S2 also implements the staff-only `?demoPermissionViolation=true` flag on the workflow run endpoint; you do nothing for it.
- Do **not** implement `GET /api/knowledge/documents` or any `/api/admin/policies/**` endpoint, and do not add policy/KB tables — S2 owns them under `src/ai/`. Only `POLICY_ADMIN` changes policies (via `/api/admin/policies`); LOAN_OFFICER / CREDIT_ANALYST can only list policies in force and ask. Your part is that the `POLICY_ADMIN` role exists in Prisma, `admin.rao` is seeded, and `requireRole('POLICY_ADMIN')` works when S2 uses it.
- Do **not** add libraries outside this prompt's dependency list.
- Do **not** use `any`. Strict TypeScript.
- Do **not** put logic in routers. Router = parse input, call service, send JSON.
- Do **not** log tokens, passwords or request bodies.
- Do **not** commit `.env`, `backend/uploads/*`, `node_modules`.
- Relative imports are **extensionless** (`import { env } from '../config/env'`). `tsx` and Vitest resolve them; we never emit JS with `tsc`.

---

## Phase 1 — Skeleton (merge point P1)

### Step 1.1 — `docker-compose.yml` (repo root)

**Goal**: Postgres 16 with pgvector.

Create exactly:

```yaml
services:
  db:
    image: pgvector/pgvector:pg16
    container_name: loanlens-db
    environment:
      POSTGRES_DB: loanlens
      POSTGRES_USER: loanlens
      POSTGRES_PASSWORD: loanlens
    ports:
      - "5432:5432"
    volumes:
      - loanlens_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U loanlens -d loanlens"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  loanlens_pgdata:
```

Also append `backend/uploads/` as a new line at the end of the root `.gitignore`.

**Acceptance**:
```bash
cp -n .env.example .env
docker compose up -d --wait
docker compose ps        # expect: loanlens-db ... (healthy)
```
**Commit**: `D-1: docker compose for postgres 16 + pgvector`

### Step 1.2 — `backend/package.json`, `tsconfig.json`, `vitest.config.ts`, install

**Goal**: one package for S1 **and** S2. S2 never edits `package.json`, so S2's libraries go in now.

Create `backend/package.json`:

```json
{
  "name": "loanlens-backend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22" },
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc --noEmit",
    "start": "tsx src/index.ts",
    "test": "vitest run",
    "seed": "tsx prisma/seed.ts",
    "ingest": "tsx src/ai/rag/ingest.ts",
    "prisma": "node --env-file=../.env node_modules/prisma/build/index.js",
    "db:migrate": "npm run prisma -- migrate dev",
    "db:reset": "npm run prisma -- migrate reset --force"
  },
  "prisma": { "seed": "tsx prisma/seed.ts" },
  "dependencies": {
    "@ai-sdk/google": "^2.0.0",
    "@ai-sdk/openai-compatible": "^1.0.0",
    "@prisma/client": "^6.2.1",
    "ai": "^5.0.0",
    "cors": "^2.8.5",
    "csv-parse": "^5.6.0",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "jsonwebtoken": "^9.0.2",
    "multer": "^2.0.2",
    "pdf-parse": "^1.1.1",
    "pgvector": "^0.2.0",
    "pino": "^9.6.0",
    "pino-pretty": "^13.0.0",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/multer": "^1.4.12",
    "@types/node": "^22.10.0",
    "@types/pdf-parse": "^1.1.4",
    "@types/supertest": "^6.0.2",
    "prisma": "^6.2.1",
    "supertest": "^7.0.0",
    "tsx": "^4.19.2",
    "typescript": "^5.7.3",
    "vitest": "^3.0.0"
  }
}
```

Why the `prisma` script: the Prisma CLI only reads `backend/.env`, but our single `.env` lives at the repo root. `node --env-file=../.env` loads it. Always run Prisma as `npm run prisma -- <args>` (never bare `npx prisma migrate ...`). If `npm install` reports that a version does not exist, use the newest version **within the same major** — never change a major version.

Create `backend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "forceConsistentCasingInFileNames": true,
    "types": ["node"]
  },
  "include": ["src", "prisma", "vitest.config.ts"]
}
```

Create `backend/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'node', fileParallelism: false, testTimeout: 20000 },
});
```

**Acceptance**:
```bash
cd backend && npm install     # expect: no ERR!; "added N packages"
npx tsc --version             # expect: Version 5.x
```
**Commit**: `D-7: backend package, tsconfig, vitest config`

### Step 1.3 — `backend/src/config/env.ts`

**Goal**: one typed `env` object, parsed once from the repo-root `.env`.

Requirements:
- `import { config } from 'dotenv'`; call `config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) })` (from `backend/src/config/` three levels up is the repo root).
- Zod schema (every var in `.env.example` that the backend uses):

| Var | Zod | Default |
|---|---|---|
| `DATABASE_URL` | `z.string().url()` | none (required) |
| `LL_JWT_SECRET` | `z.string().min(8)` | `'dev-only-change-me'` |
| `LL_SERVER_PORT` | `z.coerce.number().int().positive()` | `8080` |
| `LL_AI_BASE_URL` | `z.string().url()` | `'https://integrate.api.nvidia.com/v1'` |
| `LL_AI_API_KEY` | `z.string()` | `''` (S2 returns `AI_UNAVAILABLE` if empty) |
| `LL_AI_CHAT_MODEL` | `z.string()` | `'meta/llama-3.1-70b-instruct'` |
| `LL_EMBED_API_KEY` | `z.string().min(1, 'LL_EMBED_API_KEY is required: a Gemini key from aistudio.google.com (needed for embeddings even if chat uses NVIDIA)')` | none (required) |
| `LL_EMBED_MODEL` | `z.string()` | `'gemini-embedding-001'` |
| `LL_EMBED_DIMENSIONS` | `z.coerce.number().int().positive()` | `768` |
| `NODE_ENV` | `z.enum(['development','test','production'])` | `'development'` |

- Use `safeParse`; on failure throw `new Error('Invalid environment: ' + <list of "VAR: message">)` so the cause is obvious.
- Export `env` and `type Env = z.infer<typeof EnvSchema>`.

**Acceptance**: `cd backend && npx tsx -e "import('./src/config/env').then(m => console.log(m.env.LL_SERVER_PORT))"` → prints `8080`.
**Commit**: `D-6: zod-parsed env config`

### Step 1.4 — `backend/src/common/*`

Create these five files.

**`common/prisma.ts`**: `import '../config/env'` first (so `DATABASE_URL` is loaded), then `export const prisma = new PrismaClient();` (single instance).

**`common/errors.ts`** — exports `AppError`, `asyncHandler`, `notFound`, `errorHandler`:

```ts
export type ErrorCode = 'VALIDATION_FAILED' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'INVALID_STATE' | 'AI_UNAVAILABLE' | 'INTERNAL';
export interface ErrorDetail { field: string; issue: string }
export class AppError extends Error {
  constructor(public status: number, public code: ErrorCode, message: string, public details: ErrorDetail[] = []) { super(message); }
}
// Express 4 does not catch rejected promises: wrap every async handler.
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => { fn(req, res, next).catch(next); };
```

`errorHandler(err, req, res, _next)` builds **exactly** this envelope (Integration_Contracts §3) and sends it with `res.status(status).json(...)`:

```json
{ "status": 400, "code": "VALIDATION_FAILED", "message": "...", "details": [{ "field": "requestedAmount", "issue": "..." }],
  "timestamp": "2026-10-23T10:00:00.000Z", "path": "/api/applications" }
```

Mapping (in this order):

| Error | status | code | message | details |
|---|---|---|---|---|
| `AppError` | `err.status` | `err.code` | `err.message` | `err.details` |
| `ZodError` | 400 | `VALIDATION_FAILED` | `'Request validation failed'` | `err.issues.map(i => ({ field: i.path.join('.'), issue: i.message }))` |
| `multer.MulterError` | 400 | `VALIDATION_FAILED` | `err.message` | `[{ field: err.field ?? 'file', issue: err.code }]` |
| JSON body parse error (`err.type === 'entity.parse.failed'`) | 400 | `VALIDATION_FAILED` | `'Malformed JSON body'` | `[]` |
| `Prisma.PrismaClientKnownRequestError` with `code === 'P2025'` | 404 | `NOT_FOUND` | `'Record not found'` | `[]` |
| anything else | 500 | `INTERNAL` | `'Unexpected server error'` | `[]` (log the real error with `logger.error({ err })`; never send the stack) |

`timestamp` = `new Date().toISOString()`, `path` = `req.originalUrl`. `notFound` = middleware that calls `next(new AppError(404, 'NOT_FOUND', \`Route ${req.method} ${req.originalUrl} not found\`))`.

**`common/logger.ts`** — pino with a masking hook S2 plugs into. S1 cannot import from `ai/`, so the masker is injected:

```ts
import pino from 'pino';
import { env } from '../config/env';

let masker: (text: string) => string = (text) => text;
/** S2 calls setMasker(maskPii) once, from backend/src/ai/index.ts. Until then logs are unmasked. */
export function setMasker(fn: (text: string) => string): void { masker = fn; }

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : 'info',
  transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
  formatters: { log: (obj) => JSON.parse(masker(JSON.stringify(obj))) as Record<string, unknown> },
  hooks: {
    logMethod(args, method) {
      method.apply(this, args.map((a) => (typeof a === 'string' ? masker(a) : a)) as typeof args);
    },
  },
});
```

**`common/auth.ts`** — exports `AuthUser`, `signToken`, `requireAuth`, `requireRole`, `currentUser`:

```ts
import type { Role } from '@prisma/client';
export interface AuthUser { username: string; role: Role; customerId: string | null }
declare global { namespace Express { interface Request { user?: AuthUser } } }
```
- `signToken(user: AuthUser): string` → `jwt.sign({ sub: user.username, role: user.role, customerId: user.customerId }, env.LL_JWT_SECRET, { algorithm: 'HS256', expiresIn: '8h' })`.
- `requireAuth`: reads `Authorization: Bearer <token>`; `jwt.verify(token, env.LL_JWT_SECRET, { algorithms: ['HS256'] })`; sets `req.user = { username: payload.sub, role, customerId }`; missing/invalid/expired → `next(new AppError(401, 'UNAUTHORIZED', 'Missing or invalid token'))`.
- `requireRole(...roles: Role[])`: if `!req.user` → 401; if role not in `roles` → `next(new AppError(403, 'FORBIDDEN', \`Role ${req.user.role} is not allowed to perform this action\`))`.
- `currentUser(req): AuthUser` → returns `req.user` or throws the 401 AppError.
- `requireRole` is generic over the Prisma `Role` enum, so `requireRole('POLICY_ADMIN')` works with no extra code. S2 uses it on `/api/admin/policies/**` and `requireRole('LOAN_OFFICER','CREDIT_ANALYST','POLICY_ADMIN')` on `GET /api/knowledge/documents`; you do not build those routes.
- Permission matrix (Integration_Contracts §2, copied verbatim; backend enforces, frontend hides):

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

  Rows you implement: products/EMI (public), own applications + upload, list all applications, decision. The rest are S2's.

**`common/ids.ts`**:
```ts
export type IdPrefix = 'LA' | 'AUD' | 'DOC' | 'CUST';
// shortcut: random 5-digit suffix, collisions possible after ~thousands of ids; switch to a DB sequence if that ever matters.
export function newId(prefix: IdPrefix): string {
  return `${prefix}-${new Date().getUTCFullYear()}-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;
}
```

**Acceptance**: `cd backend && npm run build` → no output, exit code 0 (Prisma `Role` import will fail until step 1.6 — if so, finish step 1.6 then re-run).
**Commit**: `D-6: common errors envelope, logger with masker hook, jwt auth, ids`

### Step 1.5 — `app.ts`, `index.ts`, and the one-time `ai/index.ts` stub

**`backend/src/ai/index.ts`** (create once, exactly this, then never touch it again — S2 owns it from the next commit):

```ts
import { Router } from 'express';

// Owned by S2. S1 created this stub once so app.ts can mount it. S2 replaces the body (and calls setMasker there).
export const aiRouter = Router();
```

**`backend/src/app.ts`** — `export function createApp(): Express`:
1. `app.use(cors({ origin: 'http://localhost:5173' }))`
2. `app.use(express.json({ limit: '1mb' }))`
3. Core routers (added in later steps; mount each as its step lands):
   - `app.use('/api/auth', authRouter)` (step 1.9)
   - `app.use('/api/products', productRouter)` (2.1)
   - `app.use('/api/emi', emiRouter)` (1.8)
   - `app.use('/api/customers', customerRouter)` (2.2)
   - `app.use('/api/applications', applicationRouter)` (2.4; it nests the documents router)
4. `app.use('/api', aiRouter)` — the **only** line that connects S2's code. `import { aiRouter } from './ai/index'`.
5. `app.use(notFound)`, then `app.use(errorHandler)` — always last.

Tests import `createApp()`; only `index.ts` listens.

**`backend/src/index.ts`**: `createApp().listen(env.LL_SERVER_PORT, () => logger.info(\`LoanLens API on http://localhost:${env.LL_SERVER_PORT}\`))`.

**Acceptance**:
```bash
cd backend && npm run dev          # expect log: LoanLens API on http://localhost:8080
curl -s localhost:8080/api/nope    # expect: {"status":404,"code":"NOT_FOUND","message":"Route GET /api/nope not found","details":[],"timestamp":"...","path":"/api/nope"}
```
**Commit**: `D-7: express app factory, server entry, ai router mount point`

### Step 1.6 — Prisma schema + first migration (with pgvector)

Create `backend/prisma/schema.prisma` **exactly** (field names are camelCase, tables/columns snake_case):

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  CUSTOMER
  LOAN_OFFICER
  CREDIT_ANALYST
  POLICY_ADMIN
}

enum LoanType {
  PERSONAL
  HOME
  VEHICLE
  EDUCATION
}

enum CustomerSegment {
  SALARIED
  SELF_EMPLOYED
  STUDENT
}

enum KycStatus {
  VERIFIED
  PENDING
  FAILED
}

enum ApplicationStatus {
  DRAFT
  SUBMITTED
  UNDER_VERIFICATION
  UNDER_REVIEW
  APPROVED
  REJECTED
  DISBURSED
}

enum DocumentType {
  IDENTITY
  ADDRESS
  INCOME
}

/// Simulated auth (brief: auth "already exists and can be simulated"). Every demo user's password is "password"; no password column.
model AppUser {
  username    String    @id
  role        Role
  displayName String    @map("display_name")
  customerId  String?   @unique @map("customer_id")
  customer    Customer? @relation(fields: [customerId], references: [customerId])

  @@map("app_user")
}

/// Guardrail G-1: deliberately NO gender, religion, caste or marital-status columns. Protected attributes are never stored, so no decision path can use them.
model Customer {
  customerId                 String            @id @map("customer_id")
  fullName                   String            @map("full_name")
  email                      String
  phone                      String
  segment                    CustomerSegment
  employmentType             String            @map("employment_type")
  monthlyIncome              Int               @map("monthly_income")
  existingMonthlyObligations Int               @map("existing_monthly_obligations")
  location                   String
  kycStatus                  KycStatus         @map("kyc_status")
  dateOfBirth                DateTime          @map("date_of_birth") @db.Date
  /// Fake PAN/Aadhaar text, internal only, never returned by the API. Exists so S2 can demonstrate PII masking in prompts/logs (M2-8).
  kycRef                     String?           @map("kyc_ref")
  user                       AppUser?
  applications               LoanApplication[]

  @@map("customer")
}

model LoanProduct {
  productId            String            @id @map("product_id")
  name                 String
  loanType             LoanType          @map("loan_type")
  description          String
  minInterestRate      Float             @map("min_interest_rate")
  maxInterestRate      Float             @map("max_interest_rate")
  /// Internal (not in openapi LoanProduct): rate used for indicative EMIs by the advisor and application.estimatedEmi.
  indicativeRate       Float             @map("indicative_rate")
  minTenureMonths      Int               @map("min_tenure_months")
  maxTenureMonths      Int               @map("max_tenure_months")
  minAmount            Int               @map("min_amount")
  maxAmount            Int               @map("max_amount")
  processingFeePercent Float             @map("processing_fee_percent")
  processingFeeMin     Int               @map("processing_fee_min")
  /// Internal (not in openapi LoanProduct): fee cap, null = no cap.
  processingFeeMax     Int?              @map("processing_fee_max")
  /// Shape = openapi LoanProduct.eligibilityCriteria {minMonthlyIncome, minCreditScore, maxObligationRatioPercent, allowedSegments, minAgeYears, maxAgeYears}
  eligibility          Json
  applications         LoanApplication[]

  @@map("loan_product")
}

model LoanApplication {
  applicationId              String                @id @map("application_id")
  customerId                 String                @map("customer_id")
  customer                   Customer              @relation(fields: [customerId], references: [customerId])
  productId                  String?               @map("product_id")
  product                    LoanProduct?          @relation(fields: [productId], references: [productId])
  requestedAmount            Int?                  @map("requested_amount")
  tenureMonths               Int?                  @map("tenure_months")
  purpose                    String?
  employmentType             String?               @map("employment_type")
  monthlyIncome              Int?                  @map("monthly_income")
  existingMonthlyObligations Int?                  @map("existing_monthly_obligations")
  currentStep                Int                   @default(1) @map("current_step")
  status                     ApplicationStatus     @default(DRAFT)
  estimatedEmi               Int?                  @map("estimated_emi")
  createdAt                  DateTime              @default(now()) @map("created_at")
  updatedAt                  DateTime              @updatedAt @map("updated_at")
  events                     StatusEvent[]
  documents                  ApplicationDocument[]

  @@index([customerId])
  @@index([status])
  @@map("loan_application")
}

/// The application timeline. Appended on every transition (Integration_Contracts §5). `actor` is exposed as `by` in JSON.
model StatusEvent {
  id            Int               @id @default(autoincrement())
  applicationId String            @map("application_id")
  application   LoanApplication   @relation(fields: [applicationId], references: [applicationId], onDelete: Cascade)
  status        ApplicationStatus
  at            DateTime          @default(now())
  actor         String
  note          String            @default("")

  @@index([applicationId])
  @@map("status_event")
}

model ApplicationDocument {
  documentId    String          @id @map("document_id")
  applicationId String          @map("application_id")
  application   LoanApplication @relation(fields: [applicationId], references: [applicationId], onDelete: Cascade)
  documentType  DocumentType    @map("document_type")
  fileName      String          @map("file_name")
  storedPath    String          @map("stored_path")
  contentType   String          @map("content_type")
  sizeBytes     Int             @map("size_bytes")
  uploadedAt    DateTime        @default(now()) @map("uploaded_at")

  @@index([applicationId])
  @@map("application_document")
}

// ===== S2 models below (owned by S2) =====
// S2 appends KbDocument, KbChunk, AgentRun, AuditEvent here and migrates with `npm run db:migrate -- --name s2_<topic>`.
// Rule for S2: store applicationId / customerId as plain String columns with NO @relation to the S1 models above
// (a relation would force a back-relation field into S1's models). S1 never edits below this line.
// For reference only (S1 adds none of this): S2's KbDocument is one row per policy VERSION with documentKey,
// status (DRAFT|PUBLISHED|RETIRED), changeNote, createdBy, publishedBy, publishedAt, retiredAt, retiredReason,
// @@unique([documentKey, version]) and no isLatest flag (Integration_Contracts §8a).
```

Create the first migration with the pgvector extension (Prisma cannot write `CREATE EXTENSION` by itself):

```bash
cd backend
npm run prisma -- migrate dev --name init --create-only
# open prisma/migrations/<timestamp>_init/migration.sql and insert as the very first line:
#   CREATE EXTENSION IF NOT EXISTS vector;
npm run db:migrate            # applies it and runs prisma generate
```

**Acceptance**:
```bash
docker compose exec db psql -U loanlens -d loanlens -c '\dx'   # expect a row: vector
docker compose exec db psql -U loanlens -d loanlens -c '\dt'   # expect: app_user, application_document, customer, loan_application, loan_product, status_event, _prisma_migrations
cd backend && npm run build                                    # exit 0
```
**Commit**: `D-5: prisma schema, init migration with pgvector extension`

### Step 1.7 — `core/emi/loanMath.ts` + `loanMath.test.ts`

The **only** place money is computed (M3-9, guardrail 5). Exact exports:

```ts
export interface ScheduleRow { month: number; openingBalance: number; emi: number; principalComponent: number; interestComponent: number; closingBalance: number }
export interface EmiResult { principal: number; annualRate: number; tenureMonths: number; emi: number; totalInterest: number; totalPayment: number; schedule: ScheduleRow[] }

export function calculateEmi(principal: number, annualRatePct: number, months: number): number;
export function amortization(principal: number, annualRatePct: number, months: number): ScheduleRow[];
export function emiResult(principal: number, annualRatePct: number, months: number): EmiResult;
export function obligationRatioPct(monthlyIncome: number, existingObligations: number, proposedEmi: number): number;
```

Rules:
- `r = annualRatePct / 1200`. If `r === 0`: `emi = Math.round(principal / months)`. Else `emi = Math.round(principal * r * (1 + r) ** months / ((1 + r) ** months - 1))`.
- `amortization`: `balance = principal`; for `month = 1..months`: `interest = Math.round(balance * r)`; `principalPart = month === months ? balance : Math.min(emi - interest, balance)`; `rowEmi = principalPart + interest` (last row absorbs rounding); `closing = balance - principalPart`; push row; `balance = closing`. Last row's `closingBalance` is always `0`.
- `emiResult`: `totalInterest = sum(interestComponent)`, `totalPayment = principal + totalInterest`, `emi = calculateEmi(...)`.
- `obligationRatioPct = Math.round((existingObligations + proposedEmi) / monthlyIncome * 100)`; if `monthlyIncome <= 0` return `100` (comment: no income means fully obligated).
- Throw `AppError(400, 'VALIDATION_FAILED', ...)` if `principal < 1`, `months < 1` or `annualRatePct < 0`.

`core/emi/loanMath.test.ts` (Vitest) must assert:
- `calculateEmi(500000, 11, 60) === 10871` (the brief's number)
- `calculateEmi(500000, 12, 48) === 13167`
- `calculateEmi(120000, 0, 12) === 10000`
- `amortization(500000, 11, 60)` has 60 rows, last `closingBalance === 0`, sum of `principalComponent === 500000`, first row `interestComponent === 4583`
- `obligationRatioPct(60000, 8000, 10871) === 31` and `obligationRatioPct(0, 0, 1000) === 100`

**Acceptance**: `cd backend && npx vitest run src/core/emi` → `Test Files 1 passed`, all assertions pass.
**Commit**: `M3-9: deterministic EMI, amortization and obligation ratio in loanMath`

### Step 1.8 — `POST /api/emi/calculate`

`core/emi/router.ts` (no service — pure function). Public (no auth; openapi `security: []`).
Zod `EmiRequestSchema = z.object({ principal: z.number().int().min(1), annualRate: z.number().min(0), tenureMonths: z.number().int().min(1).max(360) })`. Response = `emiResult(principal, annualRate, tenureMonths)` (openapi `EmiResult`). Mount in `app.ts`.

**Acceptance**:
```bash
curl -s -X POST localhost:8080/api/emi/calculate -H 'content-type: application/json' -d '{"principal":500000,"annualRate":11.0,"tenureMonths":60}' | grep -o '"emi":10871' | head -1
# expect: "emi":10871
curl -s -X POST localhost:8080/api/emi/calculate -H 'content-type: application/json' -d '{"principal":0,"annualRate":11,"tenureMonths":60}'
# expect: {"status":400,"code":"VALIDATION_FAILED",...,"details":[{"field":"principal",...}]...}
```
**Commit**: `M1-3: EMI calculator endpoint with amortization schedule`

### Step 1.9 — Seed (`backend/prisma/seed.ts`)

**Goal**: idempotent synthetic data (B-7, D-8). Re-running `npm run seed` resets the two demo applications to their starting state.

Rules: import `prisma` from `../src/common/prisma` and `calculateEmi` from `../src/core/emi/loanMath`. Upsert products, customers, users (customers **before** users). For the two applications: `deleteMany` their `statusEvent` and `applicationDocument` rows, `upsert` the application (create and update with the same data), then create events and documents. Print `Seeded: 8 products, 3 customers, 6 users, 2 applications`. End with `await prisma.$disconnect()`.

**Products (exact values; `eligibility` is the JSON column):**

```ts
const products: Prisma.LoanProductCreateInput[] = [   // import { Prisma } from "@prisma/client"
  { productId: 'PL-101', name: 'Kestrel Personal Loan (Salaried)', loanType: 'PERSONAL',
    description: 'Unsecured personal loan for salaried customers with quick disbursal.',
    minInterestRate: 10.99, maxInterestRate: 16.0, indicativeRate: 12.0, minTenureMonths: 12, maxTenureMonths: 60,
    minAmount: 50000, maxAmount: 2500000, processingFeePercent: 1.5, processingFeeMin: 2500, processingFeeMax: 10000,
    eligibility: { minMonthlyIncome: 25000, minCreditScore: 700, maxObligationRatioPercent: 50, allowedSegments: ['SALARIED'], minAgeYears: 21, maxAgeYears: 58 } },
  { productId: 'PL-102', name: 'Kestrel Flexi Personal Loan', loanType: 'PERSONAL',
    description: 'Personal loan for self-employed professionals and business owners.',
    minInterestRate: 12.5, maxInterestRate: 18.0, indicativeRate: 14.0, minTenureMonths: 12, maxTenureMonths: 48,
    minAmount: 50000, maxAmount: 1500000, processingFeePercent: 2.0, processingFeeMin: 2500, processingFeeMax: 15000,
    eligibility: { minMonthlyIncome: 35000, minCreditScore: 720, maxObligationRatioPercent: 45, allowedSegments: ['SELF_EMPLOYED', 'SALARIED'], minAgeYears: 25, maxAgeYears: 65 } },
  { productId: 'HL-301', name: 'Kestrel Home Loan', loanType: 'HOME',
    description: 'Home purchase or construction loan with tenure up to 30 years.',
    minInterestRate: 8.5, maxInterestRate: 9.75, indicativeRate: 8.75, minTenureMonths: 60, maxTenureMonths: 360,
    minAmount: 500000, maxAmount: 50000000, processingFeePercent: 0.5, processingFeeMin: 5000, processingFeeMax: 25000,
    eligibility: { minMonthlyIncome: 30000, minCreditScore: 700, maxObligationRatioPercent: 50, allowedSegments: ['SALARIED', 'SELF_EMPLOYED'], minAgeYears: 23, maxAgeYears: 65 } },
  { productId: 'HL-302', name: 'Kestrel Home Improvement Loan', loanType: 'HOME',
    description: 'Renovation and repair loan for an existing home.',
    minInterestRate: 9.25, maxInterestRate: 11.0, indicativeRate: 9.75, minTenureMonths: 12, maxTenureMonths: 180,
    minAmount: 100000, maxAmount: 5000000, processingFeePercent: 0.75, processingFeeMin: 3000, processingFeeMax: null,
    eligibility: { minMonthlyIncome: 25000, minCreditScore: 700, maxObligationRatioPercent: 50, allowedSegments: ['SALARIED', 'SELF_EMPLOYED'], minAgeYears: 23, maxAgeYears: 65 } },
  { productId: 'VL-201', name: 'Kestrel New Car Loan', loanType: 'VEHICLE',
    description: 'Finance up to 90% of the on-road price of a new car.',
    minInterestRate: 8.75, maxInterestRate: 11.5, indicativeRate: 9.25, minTenureMonths: 12, maxTenureMonths: 84,
    minAmount: 100000, maxAmount: 5000000, processingFeePercent: 1.0, processingFeeMin: 1500, processingFeeMax: null,
    eligibility: { minMonthlyIncome: 20000, minCreditScore: 680, maxObligationRatioPercent: 50, allowedSegments: ['SALARIED', 'SELF_EMPLOYED'], minAgeYears: 21, maxAgeYears: 65 } },
  { productId: 'VL-204', name: 'Kestrel Pre-Owned Car Loan', loanType: 'VEHICLE',
    description: 'Loan for used cars up to 8 years old at the end of the tenure.',
    minInterestRate: 10.5, maxInterestRate: 13.0, indicativeRate: 11.0, minTenureMonths: 12, maxTenureMonths: 84,
    minAmount: 100000, maxAmount: 2500000, processingFeePercent: 1.5, processingFeeMin: 1000, processingFeeMax: null,
    eligibility: { minMonthlyIncome: 25000, minCreditScore: 650, maxObligationRatioPercent: 50, allowedSegments: ['SALARIED', 'SELF_EMPLOYED'], minAgeYears: 21, maxAgeYears: 60 } },
  { productId: 'EL-401', name: 'Kestrel Scholar Education Loan', loanType: 'EDUCATION',
    description: 'Education loan for studies in India with a co-applicant.',
    minInterestRate: 9.0, maxInterestRate: 11.5, indicativeRate: 9.5, minTenureMonths: 12, maxTenureMonths: 120,
    minAmount: 50000, maxAmount: 2000000, processingFeePercent: 0.5, processingFeeMin: 1000, processingFeeMax: null,
    eligibility: { minMonthlyIncome: 0, minCreditScore: 650, maxObligationRatioPercent: 50, allowedSegments: ['STUDENT'], minAgeYears: 18, maxAgeYears: 35 } },
  { productId: 'EL-402', name: 'Kestrel Global Education Loan', loanType: 'EDUCATION',
    description: 'Education loan for studies abroad, covering tuition and living costs.',
    minInterestRate: 10.5, maxInterestRate: 13.0, indicativeRate: 11.5, minTenureMonths: 24, maxTenureMonths: 180,
    minAmount: 500000, maxAmount: 7500000, processingFeePercent: 1.0, processingFeeMin: 5000, processingFeeMax: null,
    eligibility: { minMonthlyIncome: 0, minCreditScore: 680, maxObligationRatioPercent: 50, allowedSegments: ['STUDENT'], minAgeYears: 18, maxAgeYears: 35 } },
];
```

(Values are synthetic. If S2's knowledge documents quote a fee or score, they must match this table — tell S2 if you change it.)

**Customers:**

| customerId | fullName | email | phone | segment | employmentType | monthlyIncome | existingMonthlyObligations | location | kycStatus | dateOfBirth | kycRef (fake, internal) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CUST-1001 | Priya Sharma | priya.sharma@example.com | +91-98200-11001 | SALARIED | Private sector salaried | 60000 | 8000 | Pune | VERIFIED | 1994-03-14 | `PAN ABCDE1234F; Aadhaar 2345 6789 0123; A/c 001234567890` |
| CUST-1002 | Rahul Verma | rahul.verma@example.com | +91-98290-11002 | SELF_EMPLOYED | Self-employed retail business owner | 95000 | 22000 | Jaipur | VERIFIED | 1988-07-02 | `PAN FGHIJ5678K; Aadhaar 3456 7890 1234` |
| CUST-1003 | Ananya Iyer | ananya.iyer@example.com | +91-98400-11003 | STUDENT | Full-time postgraduate student | 0 | 0 | Chennai | PENDING | 2003-11-21 | `PAN KLMNO9012P; Aadhaar 4567 8901 2345` |

**Users** (Integration_Contracts §2; password for all is `password`, checked in code — simulated auth):

| username | role | customerId | displayName |
|---|---|---|---|
| priya.sharma | CUSTOMER | CUST-1001 | Priya Sharma |
| rahul.verma | CUSTOMER | CUST-1002 | Rahul Verma |
| ananya.iyer | CUSTOMER | CUST-1003 | Ananya Iyer |
| officer.kumar | LOAN_OFFICER | null | Arjun Kumar |
| analyst.mehta | CREDIT_ANALYST | null | Neha Mehta |
| admin.rao | POLICY_ADMIN | null | Admin Rao |

**Application `LA-2026-00418`** (the brief's Module 3 scenario):
- customerId `CUST-1001`, productId `PL-101`, requestedAmount `500000`, tenureMonths `48`, purpose `Home renovation and furnishing`, employmentType `Private sector salaried`, monthlyIncome `60000`, existingMonthlyObligations `8000`, currentStep `4`, status `SUBMITTED`, estimatedEmi `calculateEmi(500000, 12.0, 48)` (= 13167, computed, not typed), createdAt `2026-10-20T09:15:00Z`.
- statusEvents: `{DRAFT, at 2026-10-20T09:15:00Z, actor 'priya.sharma', note 'Draft created'}`, `{SUBMITTED, at 2026-10-21T10:30:00Z, actor 'priya.sharma', note 'Submitted by customer'}`.
- documents (no ADDRESS — that is the scenario):
  - `DOC-2026-00001` IDENTITY `pan-card.pdf` application/pdf 182344 bytes, uploadedAt `2026-10-21T10:18:00Z`
  - `DOC-2026-00002` INCOME `salary-slips-jul-sep-2026.pdf` application/pdf 412880 bytes, uploadedAt `2026-10-21T10:20:00Z`
  - `DOC-2026-00003` INCOME `bank-statement-apr-sep-2026.pdf` application/pdf 905112 bytes, uploadedAt `2026-10-21T10:22:00Z`
  - `storedPath` = `seed/<fileName>` (placeholder; no file is served, the agents only check document types).
  - The IDENTITY document is required so that the only missing proof is the address, matching the brief's `missingDocuments: ["Address proof"]`.

**Application `LA-2026-00420`** (resume-a-draft demo):
- customerId `CUST-1001`, productId `VL-204`, requestedAmount `500000`, tenureMonths `60`, purpose `Used car purchase`, other fields null, currentStep `2`, status `DRAFT`, estimatedEmi `calculateEmi(500000, 11.0, 60)` (= 10871), createdAt `2026-10-22T14:05:00Z`.
- statusEvents: `{DRAFT, at 2026-10-22T14:05:00Z, actor 'priya.sharma', note 'Draft created'}`. No documents.

**Acceptance**:
```bash
cd backend && npm run seed     # expect: Seeded: 8 products, 3 customers, 6 users, 2 applications
npm run seed                   # second run: same output, no unique-constraint error
docker compose exec db psql -U loanlens -d loanlens -c "select application_id,status,estimated_emi from loan_application order by 1"
# expect: LA-2026-00418 | SUBMITTED | 13167   and   LA-2026-00420 | DRAFT | 10871
```
**Commit**: `D-8: idempotent seed with 8 products, 6 users, LA-2026-00418`

### Step 1.10 — Auth routes (`core/auth/router.ts`, `service.ts`, `schemas.ts`)

- `POST /api/auth/login` (public). `LoginSchema = z.object({ username: z.string().min(1), password: z.string().min(1) })`. Service: find `AppUser` by username; if none or `password !== 'password'` → `AppError(401, 'UNAUTHORIZED', 'Invalid username or password')` (same message for both, no user enumeration). Return `{ token: signToken({ username, role, customerId }), role, customerId, displayName }`.
- `GET /api/auth/me` (`requireAuth`) → `{ username, role, customerId }` from `req.user`.

**Acceptance**:
```bash
curl -s -X POST localhost:8080/api/auth/login -H 'content-type: application/json' -d '{"username":"priya.sharma","password":"password"}'
# expect: {"token":"eyJ...","role":"CUSTOMER","customerId":"CUST-1001","displayName":"Priya Sharma"}
curl -s -X POST localhost:8080/api/auth/login -H 'content-type: application/json' -d '{"username":"priya.sharma","password":"nope"}'
# expect: {"status":401,"code":"UNAUTHORIZED",...}
T=$(curl -s -X POST localhost:8080/api/auth/login -H 'content-type: application/json' -d '{"username":"priya.sharma","password":"password"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')
curl -s localhost:8080/api/auth/me -H "authorization: Bearer $T"
# expect: {"username":"priya.sharma","role":"CUSTOMER","customerId":"CUST-1001"}
curl -s -X POST localhost:8080/api/auth/login -H 'content-type: application/json' -d '{"username":"admin.rao","password":"password"}'
# expect: {"token":"eyJ...","role":"POLICY_ADMIN","customerId":null,"displayName":"Admin Rao"}
```
**Commit**: `M1-4: simulated JWT login and /api/auth/me`

### Phase 1 PR checklist

- [ ] `docker compose up -d --wait` healthy; `npm run db:migrate` clean; `\dx` shows `vector`.
- [ ] `npm run seed` twice without error.
- [ ] `npm test` green (loanMath).
- [ ] `npm run build` (typecheck) exit 0.
- [ ] EMI curl returns `"emi":10871`; login returns token; unknown route returns the §3 envelope.
- [ ] `backend/src/ai/index.ts` is the 3-line stub and nothing else exists under `ai/`.
- [ ] Open PR: `gh pr create --base main --title "S1 phase 1: skeleton, schema, auth, EMI, seed" --body "REQ IDs: M1-3, M1-4, M3-9, D-5, D-6, D-8. Verified: <paste acceptance outputs>"`. Tell S2 in chat: "S1 phase 1 merged: loanMath, schema, common/*, ai/index.ts is yours now."

---

## Phase 2 — Core features (merge point P2)

### Shared DTO rules (apply to every Phase 2 step)

- Responses use the openapi schemas **verbatim**. Map Prisma rows through one mapper per entity in that feature's `service.ts`: `toLoanProduct`, `toCustomerProfile`, `toLoanApplication`, `toApplicationDocument`.
- Dates: `dateOfBirth` → `YYYY-MM-DD`; timestamps → `toISOString()`.
- `LoanProduct` JSON: `productId, name, loanType, description, minInterestRate, maxInterestRate, minTenureMonths, maxTenureMonths, minAmount, maxAmount, processingFeePercent, processingFeeMin, eligibilityCriteria` (`eligibilityCriteria` = the `eligibility` JSON column). **`indicativeRate` and `processingFeeMax` are internal — never in HTTP responses.** Internally the service type is `LoanProductRecord = LoanProduct & { indicativeRate: number; processingFeeMax: number | null }`.
- `CustomerProfile` JSON: `customerId, fullName, email, phone, segment, employmentType, monthlyIncome, existingMonthlyObligations, location, kycStatus, dateOfBirth`. **`kycRef` is never in HTTP responses.**
- `LoanApplication` JSON: draft fields (`productId, requestedAmount, tenureMonths, purpose, employmentType, monthlyIncome, existingMonthlyObligations, currentStep` — omit a field when its column is null) plus `applicationId, customerId, status, createdAt, updatedAt, estimatedEmi` (null allowed), `timeline` (events ordered by `at` ascending, each `{ status, at, by: actor, note }`), `latestRecommendation: null` (S2 owns recommendations; clients read them from `GET /api/workflow/applications/{id}/recommendation`).
- `ApplicationDocument` JSON: `documentId, applicationId, documentType, fileName, contentType, sizeBytes, uploadedAt` (never `storedPath`).
- Staff = `LOAN_OFFICER` or `CREDIT_ANALYST`. `POLICY_ADMIN` is **not** staff for applications: every `/api/applications/**` and `/api/customers/**` route returns 403 `FORBIDDEN` for it (matrix rows "own applications" and "list all applications" are — for POLICY_ADMIN).

### Step 2.1 — Products (`core/product/{router,service,schemas}.ts`)

All three endpoints are public (openapi `security: []`). **Register `/compare` before `/:productId`** or Express will treat "compare" as an id.

- `GET /api/products` — `ProductQuerySchema = z.object({ q: z.string().trim().optional(), loanType: z.nativeEnum(LoanType).optional(), segment: z.nativeEnum(CustomerSegment).optional(), minAmount: z.coerce.number().int().min(0).optional(), maxAmount: z.coerce.number().int().min(0).optional(), sort: z.enum(['rate_asc','rate_desc','amount_asc','amount_desc','tenure_asc','tenure_desc','name']).optional() })`. Service loads all products (`where: loanType` if given), then filters in code (8 rows):
  - `q`: case-insensitive substring of `name`, `productId` or `description`.
  - `segment`: `eligibility.allowedSegments` includes it.
  - `minAmount`: keep products with `maxAmount >= minAmount`; `maxAmount`: keep products with `minAmount <= maxAmount`.
  - sort: `rate_asc/desc` by `minInterestRate`; `amount_asc` by `minAmount` asc; `amount_desc` by `maxAmount` desc; `tenure_asc` by `minTenureMonths` asc; `tenure_desc` by `maxTenureMonths` desc; `name` by `name` asc; default `productId` asc.
- `GET /api/products/compare?ids=PL-101,PL-102` — `CompareQuerySchema = z.object({ ids: z.string() }).transform(...)` splitting on `,`, trimming, de-duplicating; refine `2 <= length <= 4` with message `ids must list 2 to 4 product IDs` (→ 400 `VALIDATION_FAILED`). Any unknown id → `AppError(404, 'NOT_FOUND', 'Product <id> not found')`. Return in requested order.
- `GET /api/products/:productId` → product or 404 `NOT_FOUND`.
- Exports for S2 (Integration_Contracts §6): `listProducts(): Promise<LoanProductRecord[]>` (all, by productId) and `getProduct(productId: string): Promise<LoanProductRecord | null>`.

**Acceptance**:
```bash
curl -s localhost:8080/api/products | node -pe 'JSON.parse(require("fs").readFileSync(0)).length'                      # 8
curl -s "localhost:8080/api/products?loanType=VEHICLE&sort=rate_asc" | node -pe 'JSON.parse(require("fs").readFileSync(0)).map(p=>p.productId).join()'   # VL-201,VL-204
curl -s "localhost:8080/api/products?segment=STUDENT" | node -pe 'JSON.parse(require("fs").readFileSync(0)).map(p=>p.productId).join()'                # EL-401,EL-402
curl -s "localhost:8080/api/products/compare?ids=PL-101,PL-102" | node -pe 'JSON.parse(require("fs").readFileSync(0)).map(p=>p.productId).join()'   # PL-101,PL-102
curl -s "localhost:8080/api/products/compare?ids=PL-101"        # 400 VALIDATION_FAILED
curl -s localhost:8080/api/products/VL-204 | grep -c indicativeRate   # 0  (internal field not leaked)
curl -s localhost:8080/api/products/XX-999                      # 404 NOT_FOUND
```
**Commit**: `M1-2: product search, filter, sort and compare`

### Step 2.2 — Customer profile (`core/customer/*`)

- Both routes: `requireAuth, requireRole('CUSTOMER')`; customerId comes from the token, never from the request.
- `GET /api/customers/me` → `CustomerProfile`.
- `PUT /api/customers/me` — `CustomerProfileUpdateSchema = z.object({ employmentType: z.string().trim().min(1).optional(), segment: z.nativeEnum(CustomerSegment).optional(), monthlyIncome: z.number().int().min(0).optional(), existingMonthlyObligations: z.number().int().min(0).optional(), location: z.string().trim().min(1).optional() }).strict()` (`.strict()` rejects unknown keys, e.g. any attempt to send `gender`). Returns the updated `CustomerProfile`.
- Export for S2: `getCustomer(customerId: string): Promise<CustomerRecord>` where `CustomerRecord = CustomerProfile & { kycRef: string | null }` (internal; S2 masks `kycRef` before any prompt or log). Throws 404 `NOT_FOUND` if absent.

**Acceptance**:
```bash
curl -s localhost:8080/api/customers/me -H "authorization: Bearer $T"   # monthlyIncome 60000, existingMonthlyObligations 8000, kycStatus VERIFIED; no kycRef
curl -s -X PUT localhost:8080/api/customers/me -H "authorization: Bearer $T" -H 'content-type: application/json' -d '{"monthlyIncome":62000}'   # monthlyIncome 62000
curl -s -X PUT localhost:8080/api/customers/me -H "authorization: Bearer $T" -H 'content-type: application/json' -d '{"gender":"F"}'          # 400 VALIDATION_FAILED
npm run seed   # restore 60000
```
**Commit**: `M1-4: customer profile get and update`

### Step 2.3 — State machine (`core/application/stateMachine.ts` + test)

```ts
import { ApplicationStatus } from '@prisma/client';
export const ALLOWED_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['UNDER_VERIFICATION'],
  UNDER_VERIFICATION: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: ['DISBURSED'],
  REJECTED: [],
  DISBURSED: [],
};
export function canTransition(from: ApplicationStatus, to: ApplicationStatus): boolean;
export function assertTransition(from: ApplicationStatus, to: ApplicationStatus): void; // throws AppError(409, 'INVALID_STATE', `Cannot move application from ${from} to ${to}`)
```

`stateMachine.test.ts` asserts: DRAFT→SUBMITTED ok; SUBMITTED→UNDER_VERIFICATION ok; UNDER_REVIEW→APPROVED ok; UNDER_REVIEW→REJECTED ok; APPROVED→DISBURSED ok; DRAFT→APPROVED throws with `code === 'INVALID_STATE'` and `status === 409`; SUBMITTED→APPROVED throws; REJECTED→DISBURSED throws.

**Acceptance**: `npx vitest run src/core/application/stateMachine` → all pass.
**Commit**: `B-4: application state machine with allowed transitions`

### Step 2.4 — Application service + routes (`core/application/{service,router,schemas}.ts`)

**Service exports for S2 — exact signatures (Integration_Contracts §6):**

```ts
export type LoanApplicationWithDocs = LoanApplicationDto & { documents: ApplicationDocumentDto[] };
export async function getApplication(applicationId: string): Promise<LoanApplicationWithDocs>;   // 404 NOT_FOUND if absent; no auth check (S2 is trusted server code)
export async function transition(applicationId: string, to: ApplicationStatus, by: string, note: string): Promise<LoanApplicationDto>;
export async function listDocuments(applicationId: string): Promise<ApplicationDocumentDto[]>;
```
`LoanApplicationDto` / `ApplicationDocumentDto` are the openapi JSON shapes from "Shared DTO rules", declared as TS interfaces in `core/application/schemas.ts`. `transition()` loads the row, calls `assertTransition(current, to)`, then in one `prisma.$transaction` updates `status` and creates a `StatusEvent { status: to, actor: by, note }`, and returns the mapped DTO. **Every status change in the codebase goes through `transition()`** — including submit and decision below.

Also create `backend/src/core/index.ts` re-exporting, for S2's convenience, exactly: `getApplication, transition, listDocuments, LoanApplicationWithDocs` (application), `listProducts, getProduct, LoanProductRecord` (product), `getCustomer, CustomerRecord` (customer), `calculateEmi, amortization, obligationRatioPct, ScheduleRow` (emi). S2 imports from `../../core` (or the feature file directly).

**Zod (`schemas.ts`):**
```ts
export const LoanApplicationDraftSchema = z.object({
  productId: z.string().min(1).optional(),
  requestedAmount: z.number().int().min(1).optional(),
  tenureMonths: z.number().int().min(1).optional(),
  purpose: z.string().trim().optional(),
  employmentType: z.string().trim().optional(),
  monthlyIncome: z.number().int().min(0).optional(),
  existingMonthlyObligations: z.number().int().min(0).optional(),
  currentStep: z.number().int().min(1).max(4).optional(),
}).strict();
export const DecisionSchema = z.object({ decision: z.enum(['APPROVED', 'REJECTED']), reason: z.string().trim().min(10, 'reason must be at least 10 characters') });
export const ApplicationListQuerySchema = z.object({ status: z.nativeEnum(ApplicationStatus).optional() });
```

**Routes** (all `requireAuth`; wrap handlers in `asyncHandler`):

| Method + path | Roles | Behaviour |
|---|---|---|
| `GET /api/applications` | CUSTOMER or staff (POLICY_ADMIN → 403) | CUSTOMER → own (`customerId` from token); staff → all. Optional `?status=`. Order `updatedAt desc`. |
| `POST /api/applications` | CUSTOMER | Parse draft; if `productId` given it must exist (else 400 `VALIDATION_FAILED`, field `productId`). Create with `applicationId = newId('LA')`, status DRAFT, `currentStep` default 1, + StatusEvent `{DRAFT, actor username, note 'Draft created'}`. Recompute `estimatedEmi` (rule below). **201** + DTO. |
| `GET /api/applications/:applicationId` | owner CUSTOMER or staff | 404 if absent; CUSTOMER not owner → 403 `FORBIDDEN`. |
| `PUT /api/applications/:applicationId` | CUSTOMER owner | Save draft at any step. Status must be DRAFT, else 409 `INVALID_STATE`. Merge only provided fields. Recompute `estimatedEmi`. 200 + DTO. |
| `POST /api/applications/:applicationId/submit` | CUSTOMER owner | See submit rules below. 200 + DTO. |
| `POST /api/applications/:applicationId/decision` | **CREDIT_ANALYST only** (`requireRole('CREDIT_ANALYST')` before anything else) | Parse `DecisionSchema`; `transition(id, decision, username, reason)` — from anything but UNDER_REVIEW the state machine throws 409. 200 + DTO. Agents have no code path to this route (G-2). |

**estimatedEmi rule**: when `productId`, `requestedAmount` and `tenureMonths` are all set → `calculateEmi(requestedAmount, product.indicativeRate, tenureMonths)`; otherwise `null`.

**Submit rules** (DRAFT → SUBMITTED):
1. Owner + status DRAFT (else 409 via `transition`).
2. Required (collect all failures into `details[]`, one 400 `VALIDATION_FAILED` "Application is incomplete"): `productId`, `requestedAmount`, `tenureMonths`, `purpose` (non-empty), `employmentType` (non-empty), `monthlyIncome`, `existingMonthlyObligations` — issue text `is required to submit`.
3. Product rules: `requestedAmount` within `[minAmount, maxAmount]` and `tenureMonths` within `[minTenureMonths, maxTenureMonths]` (issue text e.g. `must be between 50000 and 2500000 for PL-101`).
4. **Documents are NOT required to submit.** The brief's scenario submits without address proof; the Document Verification Agent (S2) flags it. Do not block submit on missing IDENTITY/ADDRESS/INCOME.
5. Recompute `estimatedEmi`, set `currentStep = 4`, then `transition(id, 'SUBMITTED', username, 'Submitted by customer')`.

**Acceptance**:
```bash
C=$(curl -s -X POST localhost:8080/api/applications -H "authorization: Bearer $T" -H 'content-type: application/json' -d '{"productId":"VL-204","requestedAmount":500000,"currentStep":1}')
echo "$C"                                   # 201 body: status DRAFT, timeline [DRAFT], no estimatedEmi value yet (null)
ID=$(echo "$C" | node -pe 'JSON.parse(require("fs").readFileSync(0)).applicationId')
curl -s -X PUT localhost:8080/api/applications/$ID -H "authorization: Bearer $T" -H 'content-type: application/json' -d '{"tenureMonths":60,"currentStep":2}'   # estimatedEmi 10871, currentStep 2
curl -s -X POST localhost:8080/api/applications/$ID/submit -H "authorization: Bearer $T"     # 400 VALIDATION_FAILED, details list purpose, employmentType, monthlyIncome, existingMonthlyObligations
curl -s -X PUT localhost:8080/api/applications/$ID -H "authorization: Bearer $T" -H 'content-type: application/json' -d '{"purpose":"Used car","employmentType":"Private sector salaried","monthlyIncome":60000,"existingMonthlyObligations":8000,"currentStep":4}'
curl -s -X POST localhost:8080/api/applications/$ID/submit -H "authorization: Bearer $T"     # status SUBMITTED, timeline DRAFT,SUBMITTED
curl -s -X PUT localhost:8080/api/applications/$ID -H "authorization: Bearer $T" -H 'content-type: application/json' -d '{"tenureMonths":48}'   # 409 INVALID_STATE
A=$(curl -s -X POST localhost:8080/api/auth/login -H 'content-type: application/json' -d '{"username":"analyst.mehta","password":"password"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')
O=$(curl -s -X POST localhost:8080/api/auth/login -H 'content-type: application/json' -d '{"username":"officer.kumar","password":"password"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')
curl -s -X POST localhost:8080/api/applications/LA-2026-00418/decision -H "authorization: Bearer $O" -H 'content-type: application/json' -d '{"decision":"APPROVED","reason":"Looks fine to me"}'   # 403 FORBIDDEN
curl -s -X POST localhost:8080/api/applications/LA-2026-00418/decision -H "authorization: Bearer $A" -H 'content-type: application/json' -d '{"decision":"APPROVED","reason":"Looks fine to me"}'   # 409 INVALID_STATE (still SUBMITTED)
curl -s -X POST localhost:8080/api/applications/LA-2026-00418/decision -H "authorization: Bearer $A" -H 'content-type: application/json' -d '{"decision":"APPROVED","reason":"short"}'               # 400 VALIDATION_FAILED (reason)
curl -s localhost:8080/api/applications -H "authorization: Bearer $O" | node -pe 'JSON.parse(require("fs").readFileSync(0)).length'   # >= 3 (staff see all)
npm run seed   # reset demo data
```
**Commit**: `M1-5: multi-step application with save-as-draft, submit and analyst decision`

### Step 2.5 — Documents (`core/document/{router,service}.ts`)

Mount inside the application router: `router.use('/:applicationId/documents', documentRouter)` with `Router({ mergeParams: true })`.

- Upload dir: `UPLOAD_DIR = fileURLToPath(new URL('../../../uploads/', import.meta.url))` (= `backend/uploads/`); `fs.mkdirSync(UPLOAD_DIR, { recursive: true })` at module load.
- `multer({ storage: multer.diskStorage({ destination: UPLOAD_DIR, filename: (_req, file, cb) => cb(null, randomUUID() + path.extname(file.originalname).toLowerCase()) }), limits: { fileSize: 5 * 1024 * 1024, files: 1 }, fileFilter })`. `fileFilter` accepts only `application/pdf`, `image/jpeg`, `image/png`; otherwise `cb(new AppError(400, 'VALIDATION_FAILED', 'Only PDF, JPG or PNG files are allowed', [{ field: 'file', issue: 'unsupported type' }]))`.
- `GET /api/applications/:applicationId/documents` — owner CUSTOMER or staff → `listDocuments(id)` ordered by `uploadedAt`.
- `POST /api/applications/:applicationId/documents` — `requireRole('CUSTOMER')`, owner check, status in `DRAFT | SUBMITTED | UNDER_VERIFICATION | UNDER_REVIEW` else 409 `INVALID_STATE` (customers may answer a "please upload address proof" request), then `upload.single('file')`, then `z.object({ documentType: z.nativeEnum(DocumentType) }).parse(req.body)`; no file → 400 `VALIDATION_FAILED` field `file`. Create row with `documentId = newId('DOC')`, `fileName = originalname`, `storedPath` = generated name, `contentType`, `sizeBytes`. **201** + DTO.
- Do the owner/status check **before** multer writes the file (run a small `asyncHandler` middleware first).

**Acceptance**:
```bash
printf '%%PDF-1.4\n%%demo\n' > /tmp/addr.pdf
curl -s -X POST localhost:8080/api/applications/LA-2026-00418/documents -H "authorization: Bearer $T" -F documentType=ADDRESS -F 'file=@/tmp/addr.pdf;type=application/pdf'   # 201, documentType ADDRESS
curl -s localhost:8080/api/applications/LA-2026-00418/documents -H "authorization: Bearer $O" | node -pe 'JSON.parse(require("fs").readFileSync(0)).map(d=>d.documentType).join()'   # IDENTITY,INCOME,INCOME,ADDRESS
echo hi > /tmp/x.txt; curl -s -X POST localhost:8080/api/applications/LA-2026-00418/documents -H "authorization: Bearer $T" -F documentType=ADDRESS -F 'file=@/tmp/x.txt;type=text/plain'   # 400 VALIDATION_FAILED
npm run seed   # remove the ADDRESS doc again so the demo scenario stays intact
```
**Commit**: `M1-6: document upload (identity, address, income) with type and size checks`

### Step 2.6 — Route tests (supertest)

Both need `docker compose up -d` and `npm run seed` first.

`src/core/product/router.test.ts`:
- `GET /api/products` → 200, length 8.
- `GET /api/products?loanType=VEHICLE&sort=rate_asc` → ids `['VL-201','VL-204']`.
- `GET /api/products/compare?ids=PL-101` → 400, `body.code === 'VALIDATION_FAILED'`, `body.timestamp` and `body.path` defined.
- `afterAll(() => prisma.$disconnect())`.

`src/core/application/router.test.ts`:
- Token via `signToken({ username: 'officer.kumar', role: 'LOAN_OFFICER', customerId: null })`.
- `POST /api/applications/LA-2026-00418/decision` with `{ decision: 'APPROVED', reason: 'Looks fine to me' }` → **403**, `body.code === 'FORBIDDEN'`.
- Same request with no token → 401 `UNAUTHORIZED`.
- Same request with `signToken({ username: 'admin.rao', role: 'POLICY_ADMIN', customerId: null })` → **403**, `body.code === 'FORBIDDEN'` (policy admins never decide loans).
- `requireRole('POLICY_ADMIN')` guard check (no real admin route exists in S1): in the same test file build a throwaway app — `const g = express(); g.get('/guarded', requireAuth, requireRole('POLICY_ADMIN'), (_req, res) => { res.json({ ok: true }); }); g.use(errorHandler);` — then CUSTOMER token (`priya.sharma`, `CUST-1001`) → **403** `FORBIDDEN`; POLICY_ADMIN token → **200** `{ ok: true }`. Do not add `/guarded` to `createApp()`.

**Acceptance**: `cd backend && npm test` → `Test Files 4 passed` (loanMath, stateMachine, product router, application router).
**Commit**: `D-6: route tests for products, analyst-only decision and POLICY_ADMIN guard`

### Phase 2 PR checklist

- [ ] Every Phase 2 acceptance block re-run after `npm run seed`; outputs pasted in the PR body.
- [ ] `npm test` and `npm run build` green.
- [ ] `grep -rn "Math.pow\|\*\* " src --include=*.ts | grep -v loanMath` → empty (no money maths outside loanMath).
- [ ] `grep -rni "gender\|religion\|caste\|marital" prisma src` → only the G-1 comment.
- [ ] No response contains `indicativeRate`, `processingFeeMax`, `kycRef` or `storedPath`.
- [ ] `backend/src/core/index.ts` exports the §6 functions; tell S2 in chat it can delete its `ai/stub/` once merged.
- [ ] PR: `gh pr create --base main --title "S1 phase 2: products, profile, applications, documents" --body "REQ IDs: M1-1, M1-2, M1-4, M1-5, M1-6, M1-7, M1-8, B-1..B-5, D-6. Verified: <outputs>"`.

---

## Phase 3 — Integrate (merge point P3)

### Step 3.1 — Run with S2 merged

```bash
git checkout main && git pull && git checkout feat/s1-core && git rebase main
cd backend && npm install && npm run db:migrate && npm run seed && npm run ingest && npm test && npm run dev
```
Expect: S2's migrations (`*_s2_*`) apply on top of `init`; all tests (yours + S2's) pass; server starts. Then run the full verify script below. Fix bugs **only in your files**; for bugs in `ai/**` write the failing curl + output in the team chat for S2.

### Step 3.2 — `docs/SETUP.md` (final)

Replace the file with: prerequisites (Git, Docker, Node 22, NIM or Gemini key); exact command sequence:
```bash
git clone <repo> && cd <repo>
cp .env.example .env            # set LL_AI_API_KEY (+ base URL/model lines for Gemini) and LL_EMBED_API_KEY (Gemini)
docker compose up -d --wait
cd backend && npm install
npm run db:migrate              # applies init + S2 migrations
npm run seed                    # 8 products, 3 customers, 6 users, 2 applications (re-run any time to reset the demo)
npm run ingest                  # S2: embeds db/knowledge/* via the Gemini API (needs internet + LL_EMBED_API_KEY)
npm run dev                     # http://localhost:8080
cd ../frontend && npm install && npm run dev   # http://localhost:5173
```
plus: the 6 demo users table incl. `admin.rao` (POLICY_ADMIN) (password `password`), a token one-liner (`T=$(curl ... | node -pe ...)`), reset (`npm run seed`; full reset `docker compose down -v`), troubleshooting (port 5432 busy → stop local Postgres; `P1001` → DB not up; `Invalid environment` → check `.env`).
**Commit**: `D-3: setup instructions`

### Step 3.3 — Clean-clone check

```bash
cd /tmp && rm -rf ll-check && git clone <repo-url> ll-check && cd ll-check
cp .env.example .env && docker compose down -v 2>/dev/null; docker compose up -d --wait
# follow docs/SETUP.md literally, top to bottom
```
Expect every command to succeed with no manual fix. If anything needed a fix, update `SETUP.md` and repeat. Tick D-1, D-3 in `REQUIREMENTS.md` with the evidence path.
**Commit**: `D-3: verified setup on a clean clone`

### Phase 3 PR checklist
- [ ] Clean-clone run succeeded; the full verify script passes on `main` + your branch.
- [ ] REQUIREMENTS.md boxes for your IDs ticked with file paths (`→ backend/src/core/emi/loanMath.ts, loanMath.test.ts`).
- [ ] PR: `S1 phase 3: integration fixes + SETUP`.

### If you finish early (in this order; do NOT take over S2's endpoints)
1. Pull S2's branch locally (`git fetch && git checkout feat/s2-ai`), run `npm test` and the verify script below plus Phases.md P3 curls; report failures to S2 with the exact command and output.
2. Polish `docs/SETUP.md` until a teammate follows it without asking a question.
3. Help S3 switch off mocks: sit with S3 while they set `VITE_USE_MOCKS=false`, run both brief scenarios, and fix any core-API mismatch on your side (field name, status code, CORS) the same hour.

---

## How to verify everything (run from repo root with the server up and a fresh `npm run seed`)

```bash
J='JSON.parse(require("fs").readFileSync(0))'
login() { curl -s -X POST localhost:8080/api/auth/login -H 'content-type: application/json' -d "{\"username\":\"$1\",\"password\":\"password\"}" | node -pe "$J.token"; }
T=$(login priya.sharma); O=$(login officer.kumar); A=$(login analyst.mehta); P=$(login admin.rao)

curl -s localhost:8080/api/products | node -pe "$J.length"                                                    # 8
curl -s "localhost:8080/api/products?loanType=VEHICLE&sort=rate_asc" | node -pe "$J.map(p=>p.productId).join()"   # VL-201,VL-204
curl -s localhost:8080/api/products/VL-204 | node -pe "const p=$J; [p.name,p.minInterestRate,p.maxInterestRate].join('|')"   # Kestrel Pre-Owned Car Loan|10.5|13
curl -s -X POST localhost:8080/api/emi/calculate -H 'content-type: application/json' -d '{"principal":500000,"annualRate":11.0,"tenureMonths":60}' | node -pe "const r=$J; [r.emi, r.schedule.length, r.schedule.at(-1).closingBalance].join()"   # 10871,60,0
curl -s localhost:8080/api/auth/me -H "authorization: Bearer $T" | node -pe "$J.role"                        # CUSTOMER
curl -s localhost:8080/api/customers/me -H "authorization: Bearer $T" | node -pe "const c=$J; [c.monthlyIncome,c.existingMonthlyObligations,c.kycStatus,'kycRef' in c].join()"   # 60000,8000,VERIFIED,false
curl -s localhost:8080/api/applications/LA-2026-00418 -H "authorization: Bearer $T" | node -pe "const a=$J; [a.status,a.estimatedEmi,a.timeline.length].join()"   # SUBMITTED,13167,2
curl -s localhost:8080/api/applications/LA-2026-00418/documents -H "authorization: Bearer $O" | node -pe "$J.map(d=>d.documentType).join()"   # IDENTITY,INCOME,INCOME
curl -s -o /dev/null -w '%{http_code}\n' localhost:8080/api/applications -H "authorization: Bearer $(login rahul.verma)"   # 200 (own list, empty)
curl -s -o /dev/null -w '%{http_code}\n' localhost:8080/api/customers/me -H "authorization: Bearer $O"                  # 403
curl -s -X POST localhost:8080/api/applications/LA-2026-00418/decision -H "authorization: Bearer $O" -H 'content-type: application/json' -d '{"decision":"APPROVED","reason":"Looks fine to me"}' | node -pe "$J.code"   # FORBIDDEN
curl -s -X POST localhost:8080/api/applications/LA-2026-00418/decision -H "authorization: Bearer $A" -H 'content-type: application/json' -d '{"decision":"APPROVED","reason":"Looks fine to me"}' | node -pe "$J.code"   # INVALID_STATE
curl -s localhost:8080/api/auth/me -H "authorization: Bearer $P" | node -pe "$J.role"                        # POLICY_ADMIN
curl -s -X POST localhost:8080/api/applications/LA-2026-00418/decision -H "authorization: Bearer $P" -H 'content-type: application/json' -d '{"decision":"APPROVED","reason":"Looks fine to me"}' | node -pe "$J.code"   # FORBIDDEN
curl -s -o /dev/null -w '%{http_code}\n' localhost:8080/api/applications -H "authorization: Bearer $P"                 # 403
curl -s localhost:8080/api/nope | node -pe "const e=$J; [e.status,e.code,!!e.timestamp,e.path].join()"     # 404,NOT_FOUND,true,/api/nope
```

---

## Before you open the PR

- [ ] I re-read `openapi.yaml` for every endpoint I touched; every field name, enum and status code matches.
- [ ] Every acceptance command in this phase was run and its output is pasted in the PR body.
- [ ] `npm test` and `npm run build` pass; no `any`, no `// @ts-ignore`.
- [ ] Every route parses input with Zod and errors leave through `errorHandler` in the §3 envelope.
- [ ] Money/ratio maths only in `core/emi/loanMath.ts`.
- [ ] No protected-attribute fields; `kycRef`, `indicativeRate`, `processingFeeMax`, `storedPath` never in responses.
- [ ] `git diff --stat main` shows only paths I own (plus the one-time `ai/index.ts` stub in Phase 1 and the `.gitignore` line).
- [ ] `.env` and `backend/uploads/*` are not staged.
- [ ] Commits are `<REQ-ID>: <summary>`; REQUIREMENTS.md boxes ticked with evidence.
- [ ] `git pull --rebase origin main` done right before pushing.
