# S3 — Frontend (LoanLens AI) — build prompt for Gemini in Antigravity

You are **S3, the frontend engineer** for LoanLens AI (Kestrel Bank hackathon). You build the whole React app in `frontend/`: every screen for the four roles (Customer, Loan Officer, Credit Analyst, Policy Admin), against the API contract in `openapi.yaml`, using MSW mocks until the real backend (S1 core + S2 AI) is merged. Two other people work in parallel on other laptops; you never edit `backend/` or `db/`.

```
+---------------------------------------------------------------------------------------------+
| GOLDEN RULES                                                                                |
| 1. Types and field names are copied verbatim from openapi.yaml. Never rename, never invent. |
| 2. The browser never computes money. EMI, totals, ratios: display what the API returns.     |
| 3. Touch only frontend/**, Design.md, Component_Change_Manual.md. Anything else: ask first. |
| 4. Every page has loading, empty and error states, labels on every input, visible focus.    |
| 5. A step is done only when its acceptance command printed the expected output. Show it.    |
| 6. One commit per step, message "<REQ-ID>: <imperative summary>". Never commit .env.        |
+---------------------------------------------------------------------------------------------+
```

## 0. Header

- **Branch**: `feat/s3-frontend` (`git checkout main && git pull && git checkout -b feat/s3-frontend`).
- **You own**: `frontend/**`, `Design.md`, `Component_Change_Manual.md`.
- **Forbidden**: `backend/**`, `db/**`, `docs/USECASE.md`, `openapi.yaml`, `Integration_Contracts.md`, `.env.example` (shared files change only via a separate PR titled `contract: ...` opened by the human). Never commit `.env`.

### Files to read first (fully, before writing code)

| File | Why |
|---|---|
| `docs/USECASE.md` | The brief. It wins over every other file. The three sample JSONs are your fixtures. |
| `CLAUDE.md` | Rules and the 8 guardrails (esp. 2: AI only recommends; 5: no numbers by LLM or browser). |
| `REQUIREMENTS.md` | Requirement IDs for commits; M1-1..M1-9 are mostly yours. |
| `Integration_Contracts.md` | §1 naming, §2 users + permission matrix (4 roles), §3 error envelope, §5 statuses, §8a policy versioning (DRAFT → PUBLISHED → RETIRED, version in force), §9 MSW. |
| `openapi.yaml` | Every endpoint, schema and enum. `src/api/types.ts` mirrors it field for field. |
| `Design.md` | Colours, type scale, component specs, responsive table, a11y, INR rule. |
| `Component_Change_Manual.md` | The judge live-change guide you keep in sync with real paths. |
| `Team_Work_Split.md`, `Rules.md`, `Phases.md` | Ownership, coding rules, merge points. |
| `Flow.md` §1–§2 | Route/page/hook overview (where it differs from this prompt, this prompt wins). |
| `Demo_Runbook.md` | What the demo clicks through — your screens must support it. |

### Guardrails / do-not list

- No `tailwind.config.*` file. Tailwind **v4**: `@tailwindcss/vite` plugin + CSS-first `@theme` in `frontend/src/styles/tokens.css`.
- No raw hex colours in components; only token classes (`bg-primary`, `text-danger`, `border-border`).
- No EMI/interest/total/ratio maths in `src/` outside `src/mocks/`. Check: `grep -rnE "Math\.pow|\*\*" src --include=*.ts --include=*.tsx | grep -v "src/mocks/"` → empty.
- No `any`, no `// @ts-ignore`.
- No libraries beyond the install list in step 1.1.
- Mocks never shown as real: a visible **MOCK DATA** badge whenever mocks are on; `VITE_USE_MOCKS=false` for the demo.
- The UI hides what a role cannot do, but never assumes the backend allows it — always render the API's error envelope.
- No "approve/reject" control anywhere except the Credit Analyst's DecisionForm. AI output is always labelled with an amber `AI` tag and a disclaimer.
- No policy upload/publish/retire control anywhere except the POLICY_ADMIN console under `/admin/policies`. Staff see policies read-only; customers never see the library.

---

## Phase 1 — Shell, catalogue, EMI (merge point P1)

### Step 1.1 — Scaffold

Run from the repo root:

```bash
npm create vite@latest frontend -- --template react-ts
# if it asks "Install with npm and start now?" answer No
cd frontend
npm install
npm install -D vite@^6 @vitejs/plugin-react@^4          # pin Vite 6 if the template chose a newer major
npm install react@^19 react-dom@^19 react-router@^7 @tanstack/react-query@^5 lucide-react @fontsource-variable/inter
npm install -D tailwindcss@^4 @tailwindcss/vite@^4 msw@^2 vitest@^3 jsdom @testing-library/react@^16 @testing-library/dom @testing-library/jest-dom @testing-library/user-event
npx msw init public --save
```

Delete the template's `src/App.css`, `src/index.css`, `src/assets/`, and the demo content of `src/App.tsx` (delete `App.tsx` entirely; `main.tsx` mounts the router).

Replace `frontend/vite.config.ts` with:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  envDir: '..',                       // read the single repo-root .env (VITE_API_BASE_URL, VITE_USE_MOCKS)
  server: { port: 5173, strictPort: true },
  test: { environment: 'jsdom', setupFiles: ['./src/test/setup.ts'], css: false },
});
```

Add to `package.json` scripts: `"test": "vitest run"` (keep `dev`, `build`, `preview`, `lint` from the template). In `tsconfig.app.json` keep `"strict": true`.

Env: in your **local** repo-root `.env` (never committed) add `VITE_USE_MOCKS=true`. Mocks are on **only** when the value is exactly the string `true`. Ask the human to open a `contract:` PR adding `VITE_USE_MOCKS=false` to `.env.example`.

**Acceptance**: `cd frontend && npm run build` → exit 0. `npm run dev` → `Local: http://localhost:5173/`.
**Commit**: `M1-9: scaffold Vite React TS app with Tailwind v4, MSW, Vitest`

### Step 1.2 — Design tokens: `frontend/src/styles/tokens.css`

Create exactly (values from `Design.md` §2–§4, converted to hex):

```css
@import "tailwindcss";

/* Dark mode = data-theme="dark" on <html> (Design.md §2). */
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));

@theme {
  --font-sans: "Inter Variable", system-ui, -apple-system, "Segoe UI", sans-serif;

  /* brand */
  --color-primary: #0D5E61;        /* deep teal: buttons, links, active nav */
  --color-primary-hover: #0A4C4E;
  --color-primary-soft: #E2F1F0;   /* tinted backgrounds, selected rows */
  --color-accent: #D97706;         /* amber: AI tag, source chips, focus ring */
  --color-accent-soft: #FEF3C7;

  /* semantic */
  --color-success: #15803D;
  --color-success-soft: #DCFCE7;
  --color-warn: #B45309;
  --color-warn-soft: #FEF3C7;
  --color-danger: #B91C1C;
  --color-danger-soft: #FEE2E2;
  --color-info: #1D4ED8;
  --color-info-soft: #DBEAFE;

  /* neutrals */
  --color-n0: #FFFFFF;
  --color-n50: #F8FAFA;
  --color-n100: #F1F5F5;
  --color-n200: #E2E8E8;
  --color-n300: #CBD5D5;
  --color-n400: #94A3A3;
  --color-n500: #647474;
  --color-n600: #475555;
  --color-n700: #334141;
  --color-n800: #1E2929;
  --color-n900: #0F1717;

  /* roles: bg-bg, bg-surface, bg-surface-2, border-border, text-fg, text-muted */
  --color-bg: #F8FAFA;
  --color-surface: #FFFFFF;
  --color-surface-2: #F1F5F5;
  --color-border: #E2E8E8;
  --color-fg: #0F1717;
  --color-muted: #647474;

  /* type scale: text-display, text-h1, text-h2, text-h3, text-body (text-sm / text-xs are Tailwind defaults) */
  --text-display: 2.25rem;
  --text-display--line-height: 1.15;
  --text-h1: 1.75rem;
  --text-h1--line-height: 1.2;
  --text-h2: 1.375rem;
  --text-h2--line-height: 1.25;
  --text-h3: 1.125rem;
  --text-h3--line-height: 1.3;
  --text-body: 1rem;
  --text-body--line-height: 1.5;

  /* radius: rounded-sm (inputs, chips), rounded-md (buttons, cards), rounded-lg (modals, chat), rounded-full (badges) */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;

  /* shadow */
  --shadow-card: 0 1px 2px rgb(15 23 23 / 0.06), 0 1px 3px rgb(15 23 23 / 0.10);
  --shadow-pop: 0 8px 24px rgb(15 23 23 / 0.14);
}

:root[data-theme="dark"] {
  --color-primary: #38B2AC;
  --color-primary-hover: #5EC8C2;
  --color-primary-soft: #133637;
  --color-accent: #FBBF24;
  --color-accent-soft: #452E0A;
  --color-success: #4ADE80;
  --color-success-soft: #0C321C;
  --color-warn: #FBBF24;
  --color-warn-soft: #452E0A;
  --color-danger: #F87171;
  --color-danger-soft: #451414;
  --color-info: #60A5FA;
  --color-info-soft: #172554;
  --color-bg: #0F1717;
  --color-surface: #1E2929;
  --color-surface-2: #334141;
  --color-border: #334141;
  --color-fg: #F8FAFA;
  --color-muted: #94A3A3;
  --shadow-card: none;
  --shadow-pop: none;
  color-scheme: dark;
}

/* Shared focus ring (Design.md §8): add class "focus-ring" to every interactive element. */
@utility focus-ring {
  @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2;
}

@layer base {
  body {
    @apply bg-bg text-fg font-sans text-body antialiased;
  }
}
```

**Acceptance**: `npm run build` → exit 0; temporarily render `<button className="bg-primary text-white rounded-md shadow-card focus-ring px-4 py-2">Test</button>` and confirm teal button + amber focus ring on Tab.
**Commit**: `M1-9: Tailwind v4 @theme design tokens`

### Step 1.3 — Folder tree (create these; empty files are filled in later steps)

```
frontend/
  index.html                         # <title>LoanLens · Kestrel Bank</title>, <html lang="en">
  vite.config.ts
  public/mockServiceWorker.js        # generated by msw init
  src/
    main.tsx                         # fonts + tokens.css, MSW toggle, QueryClientProvider, AuthProvider, RouterProvider
    styles/tokens.css
    test/setup.ts                    # jest-dom + MSW node server lifecycle
    lib/formatInr.ts                 # formatInr, formatPercent
    lib/formatInr.test.ts
    lib/formatDate.ts                # formatDate (DD MMM YYYY), formatDateTime
    auth/AuthContext.tsx             # AuthContext, AuthProvider, useAuth
    auth/roleHome.ts                 # roleHome(role)
    api/client.ts                    # API_BASE, ApiError, api<T>(), readStoredAuth()
    api/types.ts                     # every openapi schema/enum
    api/hooks/auth.ts                # useLogin, useMe
    api/hooks/products.ts            # useProducts, useProduct, useCompareProducts
    api/hooks/emi.ts                 # useEmi
    api/hooks/customers.ts           # useProfile, useUpdateProfile
    api/hooks/applications.ts        # useApplications, useApplication, useCreateDraft, useSaveDraft, useSubmitApplication, useDecision
    api/hooks/documents.ts           # useDocuments, useUploadDocument
    api/hooks/advisor.ts             # useAdvisorChat
    api/hooks/policy.ts              # usePolicyAsk
    api/hooks/knowledge.ts           # useKnowledgeDocuments (read-only: policies in force)
    api/hooks/policyAdmin.ts         # usePolicyLibrary, usePolicyVersions, usePolicyPreview, useUploadPolicyDraft, useTestAsk, usePublishPolicy, useRetirePolicy
    api/hooks/workflow.ts            # useRunWorkflow, useRecommendation
    api/hooks/audit.ts               # useAuditTrail
    mocks/fixtures.ts                # all fixture data
    mocks/handlers.ts                # one MSW handler per endpoint + resetMockState()
    mocks/browser.ts                 # setupWorker(...handlers)
    mocks/server.ts                  # setupServer(...handlers) for Vitest
    routes/router.tsx                # createBrowserRouter route table
    routes/RoleGuard.tsx
    routes/RoleGuard.test.tsx
    routes/nav.ts                    # navByRole
    layouts/AppLayout.tsx            # top bar, nav, theme toggle, RoleBadge, MockBadge, skip link, <Outlet/>
    pages/LoginPage.tsx
    pages/CataloguePage.tsx
    pages/ProductDetailPage.tsx
    pages/ComparePage.tsx
    pages/EmiPage.tsx
    pages/AdvisorPage.tsx
    pages/PolicyPage.tsx
    pages/ProfilePage.tsx
    pages/MyApplicationsPage.tsx
    pages/ApplicationWizardPage.tsx
    pages/ApplicationWizard.test.tsx
    pages/StatusTrackerPage.tsx
    pages/OfficerQueuePage.tsx
    pages/AnalystReviewPage.tsx
    pages/KnowledgePage.tsx          # read-only "Policies in force" (LOAN_OFFICER, CREDIT_ANALYST)
    pages/PolicyLibraryPage.tsx      # POLICY_ADMIN
    pages/PolicyUploadPage.tsx       # POLICY_ADMIN
    pages/PolicyDetailPage.tsx       # POLICY_ADMIN
    pages/PolicyDetailPage.test.tsx
    pages/ForbiddenPage.tsx
    pages/NotFoundPage.tsx
    components/ui/Button.tsx Card.tsx Money.tsx Badge.tsx RoleBadge.tsx AiTag.tsx Field.tsx ErrorAlert.tsx Skeleton.tsx EmptyState.tsx MockBadge.tsx
    components/products/ProductCard.tsx CatalogueFilters.tsx CompareTable.tsx
    components/emi/EmiCalculator.tsx EmiTable.tsx
    components/chat/ChatPanel.tsx SourceChip.tsx ConfidenceBadge.tsx
    components/advisor/RecommendationCard.tsx
    components/applications/FormStepper.tsx FileDropzone.tsx StatusTimeline.tsx StatusBadge.tsx
    components/applications/steps/StepProduct.tsx StepEmployment.tsx StepDocuments.tsx StepReview.tsx
    components/review/AgentChecksTable.tsx AuditTrailViewer.tsx DecisionForm.tsx
    components/knowledge/KnowledgeTable.tsx
    components/policy-admin/PolicyLibraryTable.tsx PolicyVersionTimeline.tsx ServingStateBadge.tsx PolicyUploadForm.tsx PolicyPreview.tsx TestAskPanel.tsx PublishDialog.tsx RetireDialog.tsx
```

One component per file, PascalCase file = component name, props interface `<Name>Props`.

### Step 1.4 — `src/api/types.ts` (verbatim from openapi.yaml)

Create exactly this (do not rename anything; these mirror `components.schemas`):

```ts
// Mirrors openapi.yaml components.schemas. Field names are VERBATIM from the brief. Do not rename.
export type Role = 'CUSTOMER' | 'LOAN_OFFICER' | 'CREDIT_ANALYST' | 'POLICY_ADMIN';
export type PolicyStatus = 'DRAFT' | 'PUBLISHED' | 'RETIRED';
export type LoanType = 'PERSONAL' | 'HOME' | 'VEHICLE' | 'EDUCATION';
export type LoanTypeOrAll = LoanType | 'ALL';
export type CustomerSegment = 'SALARIED' | 'SELF_EMPLOYED' | 'STUDENT';
export type CustomerSegmentOrAll = CustomerSegment | 'ALL';
export type ApplicationStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_VERIFICATION' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'DISBURSED';
export type DocumentType = 'IDENTITY' | 'ADDRESS' | 'INCOME';
export type KnowledgeDocumentType = 'TERMS_AND_CONDITIONS' | 'RATE_FEE_SCHEDULE' | 'CREDIT_POLICY' | 'KYC_CHECKLIST' | 'PREPAYMENT_POLICY' | 'GRIEVANCE' | 'REGULATORY_CIRCULAR' | 'OFFICER_PLAYBOOK';
export type Audience = 'CUSTOMER' | 'INTERNAL';
export type EligibilityIndicator = 'LIKELY_ELIGIBLE' | 'BORDERLINE' | 'UNLIKELY_ELIGIBLE' | 'UNKNOWN';
export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type RiskBand = 'LOW' | 'MEDIUM' | 'HIGH';
export type Recommendation = 'RECOMMEND_APPROVE' | 'RECOMMEND_REJECT' | 'REQUEST_ADDITIONAL_DOCUMENTS' | 'REFER_TO_HUMAN';
export type CheckResult = 'PASS' | 'FAIL' | 'INCOMPLETE' | 'EXCEPTION';
export type KycStatus = 'VERIFIED' | 'PENDING' | 'FAILED';
export type AgentName = 'DocumentVerificationAgent' | 'CreditAssessmentAgent' | 'ComplianceAgent' | 'CustomerCommunicationAgent' | 'OrchestratorAgent';
export type AuditEventType = 'AGENT_START' | 'TOOL_CALL' | 'TOOL_RESULT' | 'LLM_CALL' | 'LLM_RESULT' | 'PERMISSION_DENIED' | 'AGENT_END' | 'HUMAN_REQUIRED' | 'POLICY_DRAFTED' | 'POLICY_PUBLISHED' | 'POLICY_RETIRED';
export type ProductSort = 'rate_asc' | 'rate_desc' | 'amount_asc' | 'amount_desc' | 'tenure_asc' | 'tenure_desc' | 'name';

export interface ErrorResponse { status: number; code: string; message: string; details?: { field?: string; issue?: string }[]; timestamp: string; path?: string }

export interface LoginRequest { username: string; password: string }
export interface LoginResponse { token: string; role: Role; customerId: string | null; displayName: string }
export interface Me { username: string; role: Role; customerId: string | null }

export interface EligibilityCriteria { minMonthlyIncome?: number; minCreditScore?: number; maxObligationRatioPercent?: number; allowedSegments?: CustomerSegment[]; minAgeYears?: number; maxAgeYears?: number }
export interface LoanProduct {
  productId: string; name: string; loanType: LoanType; description?: string;
  minInterestRate: number; maxInterestRate: number; minTenureMonths: number; maxTenureMonths: number;
  minAmount: number; maxAmount: number; processingFeePercent: number; processingFeeMin?: number;
  eligibilityCriteria: EligibilityCriteria;
}
export interface ProductQuery { q?: string; loanType?: LoanType; segment?: CustomerSegment; minAmount?: number; maxAmount?: number; sort?: ProductSort }

export interface EmiRequest { principal: number; annualRate: number; tenureMonths: number }
export interface ScheduleRow { month: number; openingBalance: number; emi: number; principalComponent: number; interestComponent: number; closingBalance: number }
export interface EmiResult { principal: number; annualRate: number; tenureMonths: number; emi: number; totalInterest: number; totalPayment: number; schedule: ScheduleRow[] }

export interface CustomerProfile {
  customerId: string; fullName: string; email: string; phone: string; segment: CustomerSegment; employmentType: string;
  monthlyIncome: number; existingMonthlyObligations: number; location: string; kycStatus: KycStatus; dateOfBirth: string;
}
export interface CustomerProfileUpdate { employmentType?: string; segment?: CustomerSegment; monthlyIncome?: number; existingMonthlyObligations?: number; location?: string }

export interface LoanApplicationDraft {
  productId?: string; requestedAmount?: number; tenureMonths?: number; purpose?: string;
  employmentType?: string; monthlyIncome?: number; existingMonthlyObligations?: number; currentStep?: number;
}
export interface TimelineEvent { status: ApplicationStatus; at: string; by: string; note: string }
export interface LoanApplication extends LoanApplicationDraft {
  applicationId: string; customerId: string; status: ApplicationStatus; createdAt: string; updatedAt: string;
  estimatedEmi: number | null; timeline: TimelineEvent[]; latestRecommendation?: AgentRecommendation | null;
}
export interface ApplicationDocument { documentId: string; applicationId: string; documentType: DocumentType; fileName: string; contentType: string; sizeBytes: number; uploadedAt: string }
export interface DecisionRequest { decision: 'APPROVED' | 'REJECTED'; reason: string }

export interface AdvisorRequest { message: string; conversationId?: string | null }
export interface AdvisorRecommendation {
  productId: string; productName: string; indicativeInterestRate: number; tenureMonths: number;
  estimatedEmi: number; reason: string; eligibilityIndicator: EligibilityIndicator;
}
export interface AdvisorResponse {
  interpretedRequirement: string; loanAmount?: number | null; monthlyIncome?: number | null; maxPreferredEmi?: number | null;
  currency: string; recommendations: AdvisorRecommendation[]; disclaimer: string; clarifyingQuestion: string | null; conversationId?: string;
}

export interface KnowledgeDocument {
  documentId: string; title: string; version: string; effectiveDate: string; loanType: LoanTypeOrAll;
  documentType: KnowledgeDocumentType; audience: Audience; customerSegment?: CustomerSegmentOrAll;
  chunkCount: number; documentKey: string; status: PolicyStatus; ingestedAt: string;
}
export interface PolicyVersion extends KnowledgeDocument {
  changeNote: string; createdBy: string; publishedBy: string | null; publishedAt: string | null;
  retiredAt: string | null; retiredReason: string | null;
  servingState: 'ACTIVE' | 'SCHEDULED' | 'SUPERSEDED' | 'DRAFT' | 'RETIRED';   // computed by the server at read time
}
export interface PolicyLibraryItem {
  documentKey: string; title: string; documentType: KnowledgeDocumentType; audience: Audience;
  activeVersion: string | null; activeEffectiveDate: string | null;
  scheduledVersion: string | null; scheduledEffectiveDate: string | null;
  draftCount: number; totalVersions: number;
}
// multipart body of POST /api/admin/policies (field names verbatim from openapi)
export interface PolicyDraftUpload {
  file: File; documentKey: string; title: string; version: string; effectiveDate: string; loanType: LoanTypeOrAll;
  documentType: KnowledgeDocumentType; audience: Audience; customerSegment?: CustomerSegmentOrAll; changeNote: string;
}
// one item of the inline response of GET /api/admin/policies/versions/{documentId}/preview
export interface PolicyPreviewSection { section: string; content: string }
export interface PolicyAskRequest { question: string; loanType?: LoanTypeOrAll; customerSegment?: CustomerSegmentOrAll }
export interface PolicySource { document: string; section: string; version: string; effectiveDate: string }
export interface PolicyAnswer { answer: string; confidence: Confidence; sources: PolicySource[]; followUpRequired: boolean }

export interface AgentCheck { agent: AgentName; result: CheckResult; detail: string }
export interface AgentRecommendation {
  applicationId: string; recommendation: Recommendation; riskBand: RiskBand; checks: AgentCheck[];
  missingDocuments: string[]; customerMessage: string; requiresHumanApproval: boolean; auditTrailId: string;
}
export interface AuditEvent {
  sequence: number; timestamp: string; agent: string; eventType: AuditEventType; toolName?: string | null;
  input?: Record<string, unknown>; output?: Record<string, unknown>; durationMs?: number;
}
export interface AuditTrail { auditTrailId: string; applicationId: string; startedAt: string; completedAt: string; events: AuditEvent[] }
```

**Acceptance**: `npx tsc -p tsconfig.app.json --noEmit` → exit 0.
**Commit**: `M1-15: frontend types mirrored from openapi.yaml`

### Step 1.5 — `src/api/client.ts` + hooks

`client.ts`:

```ts
import type { ErrorResponse } from './types';

export const API_BASE: string = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';
export const AUTH_STORAGE_KEY = 'll-auth';
export const USE_MOCKS: boolean = import.meta.env.VITE_USE_MOCKS === 'true';

export class ApiError extends Error {
  constructor(public readonly body: ErrorResponse) { super(body.message); }
  get status(): number { return this.body.status; }
  get code(): string { return this.body.code; }
}

export function readStoredAuth<T>(): T | null {
  try { const raw = localStorage.getItem(AUTH_STORAGE_KEY); return raw ? (JSON.parse(raw) as T) : null; } catch { return null; }
}

interface RequestOptions { method?: 'GET' | 'POST' | 'PUT'; body?: unknown; form?: FormData; query?: Record<string, string | number | boolean | undefined> }

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const url = new URL(API_BASE + path);
  for (const [k, v] of Object.entries(opts.query ?? {})) if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
  const token = readStoredAuth<{ token: string }>()?.token;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  let res: Response;
  try {
    res = await fetch(url, { method: opts.method ?? 'GET', headers, body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined) });
  } catch {
    throw new ApiError({ status: 0, code: 'NETWORK', message: 'Cannot reach the LoanLens API. Is the backend running?', timestamp: new Date().toISOString() });
  }
  if (res.status === 401 && token) window.dispatchEvent(new Event('ll:unauthorized'));
  const text = await res.text();
  const data: unknown = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError((data as ErrorResponse | null) ?? { status: res.status, code: 'INTERNAL', message: res.statusText, timestamp: new Date().toISOString() });
  return data as T;
}
```

Add `src/vite-env.d.ts` typing: `interface ImportMetaEnv { readonly VITE_API_BASE_URL?: string; readonly VITE_USE_MOCKS?: string }`.

Hooks — one per endpoint, TanStack Query 5, exact names and query keys:

| Hook | Kind | Endpoint | Query key / invalidates |
|---|---|---|---|
| `useLogin()` | mutation | `POST /api/auth/login` | — |
| `useMe()` | query | `GET /api/auth/me` | `['me']` |
| `useProducts(query: ProductQuery)` | query | `GET /api/products` | `['products', query]` |
| `useProduct(productId)` | query | `GET /api/products/{productId}` | `['product', productId]` |
| `useCompareProducts(ids: string[])` | query, enabled when 2–4 ids | `GET /api/products/compare?ids=a,b` | `['compare', ids]` |
| `useEmi(input: EmiRequest \| null)` | query (POST under the hood), enabled when input non-null | `POST /api/emi/calculate` | `['emi', input]`, `placeholderData: keepPreviousData` |
| `useProfile()` | query | `GET /api/customers/me` | `['profile']` |
| `useUpdateProfile()` | mutation | `PUT /api/customers/me` | invalidates `['profile']` |
| `useApplications(status?: ApplicationStatus)` | query | `GET /api/applications` | `['applications', status]` |
| `useApplication(id)` | query | `GET /api/applications/{id}` | `['application', id]` |
| `useCreateDraft()` | mutation | `POST /api/applications` | invalidates `['applications']` |
| `useSaveDraft(id)` | mutation | `PUT /api/applications/{id}` | sets `['application', id]` from response |
| `useSubmitApplication(id)` | mutation | `POST /api/applications/{id}/submit` | invalidates `['application', id]`, `['applications']` |
| `useDecision(id)` | mutation | `POST /api/applications/{id}/decision` | invalidates `['application', id]`, `['applications']` |
| `useDocuments(id)` | query | `GET /api/applications/{id}/documents` | `['documents', id]` |
| `useUploadDocument(id)` | mutation `{ documentType, file }` → FormData | `POST /api/applications/{id}/documents` | invalidates `['documents', id]` |
| `useAdvisorChat()` | mutation | `POST /api/advisor/chat` | — |
| `usePolicyAsk()` | mutation | `POST /api/policy/ask` | — |
| `useKnowledgeDocuments()` | query (read-only, versions in force) | `GET /api/knowledge/documents` | `['knowledge']` |
| `usePolicyLibrary()` | query | `GET /api/admin/policies` | `['policyLibrary']` |
| `usePolicyVersions(documentKey?)` | query, enabled when defined | `GET /api/admin/policies/{documentKey}/versions` | `['policyVersions', documentKey]` |
| `usePolicyPreview(documentId?)` | query, enabled when defined | `GET /api/admin/policies/versions/{documentId}/preview` | `['policyPreview', documentId]` |
| `useUploadPolicyDraft()` | mutation `PolicyDraftUpload` → FormData (field names exactly as openapi; omit `customerSegment` when empty) | `POST /api/admin/policies` | invalidates `['policyLibrary']`, `['policyVersions']` |
| `useTestAsk(documentId)` | mutation `{ question: string }` → `PolicyAnswer` | `POST /api/admin/policies/versions/{documentId}/test-ask` | — |
| `usePublishPolicy()` | mutation `documentId: string` → `PolicyVersion` | `POST /api/admin/policies/versions/{documentId}/publish` | invalidates `['policyLibrary']`, `['policyVersions']`, `['knowledge']` |
| `useRetirePolicy()` | mutation `{ documentId: string; reason: string }` → `PolicyVersion` | `POST /api/admin/policies/versions/{documentId}/retire` (body `{ reason }`) | invalidates `['policyLibrary']`, `['policyVersions']`, `['knowledge']` |
| `useRunWorkflow(id)` | mutation `{ demoPermissionViolation: boolean }` | `POST /api/workflow/applications/{id}/run` (+ `?demoPermissionViolation=true` when true) | invalidates `['application', id]`, `['recommendation', id]`, `['applications']` |
| `useRecommendation(id)` | query; a 404 `ApiError` resolves to `null` (no run yet) | `GET /api/workflow/applications/{id}/recommendation` | `['recommendation', id]` |
| `useAuditTrail(auditTrailId?)` | query, enabled when defined | `GET /api/audit/{auditTrailId}` | `['audit', auditTrailId]` |

`?demoPermissionViolation=true` is a staff-only demo flag implemented by S2 (it makes the orchestrator attempt one forbidden tool call so a `PERMISSION_DENIED` event and an `EXCEPTION` check appear). It is not yet in `openapi.yaml`; S2 adds it via a `contract:` PR.

QueryClient defaults (in `main.tsx`): `retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 1`, `refetchOnWindowFocus: false`.

**Commit**: `M1-8: typed API client and one TanStack Query hook per endpoint`

### Step 1.6 — MSW mocks (`src/mocks/*`) + MOCK DATA badge

`fixtures.ts` exports these constants (copy values exactly — they match S1's seed and the brief):

```ts
export const products: LoanProduct[] = [
  { productId: 'PL-101', name: 'Kestrel Personal Loan (Salaried)', loanType: 'PERSONAL', description: 'Unsecured personal loan for salaried customers with quick disbursal.', minInterestRate: 10.99, maxInterestRate: 16.0, minTenureMonths: 12, maxTenureMonths: 60, minAmount: 50000, maxAmount: 2500000, processingFeePercent: 1.5, processingFeeMin: 2500, eligibilityCriteria: { minMonthlyIncome: 25000, minCreditScore: 700, maxObligationRatioPercent: 50, allowedSegments: ['SALARIED'], minAgeYears: 21, maxAgeYears: 58 } },
  { productId: 'PL-102', name: 'Kestrel Flexi Personal Loan', loanType: 'PERSONAL', description: 'Personal loan for self-employed professionals and business owners.', minInterestRate: 12.5, maxInterestRate: 18.0, minTenureMonths: 12, maxTenureMonths: 48, minAmount: 50000, maxAmount: 1500000, processingFeePercent: 2.0, processingFeeMin: 2500, eligibilityCriteria: { minMonthlyIncome: 35000, minCreditScore: 720, maxObligationRatioPercent: 45, allowedSegments: ['SELF_EMPLOYED', 'SALARIED'], minAgeYears: 25, maxAgeYears: 65 } },
  { productId: 'HL-301', name: 'Kestrel Home Loan', loanType: 'HOME', description: 'Home purchase or construction loan with tenure up to 30 years.', minInterestRate: 8.5, maxInterestRate: 9.75, minTenureMonths: 60, maxTenureMonths: 360, minAmount: 500000, maxAmount: 50000000, processingFeePercent: 0.5, processingFeeMin: 5000, eligibilityCriteria: { minMonthlyIncome: 30000, minCreditScore: 700, maxObligationRatioPercent: 50, allowedSegments: ['SALARIED', 'SELF_EMPLOYED'], minAgeYears: 23, maxAgeYears: 65 } },
  { productId: 'HL-302', name: 'Kestrel Home Improvement Loan', loanType: 'HOME', description: 'Renovation and repair loan for an existing home.', minInterestRate: 9.25, maxInterestRate: 11.0, minTenureMonths: 12, maxTenureMonths: 180, minAmount: 100000, maxAmount: 5000000, processingFeePercent: 0.75, processingFeeMin: 3000, eligibilityCriteria: { minMonthlyIncome: 25000, minCreditScore: 700, maxObligationRatioPercent: 50, allowedSegments: ['SALARIED', 'SELF_EMPLOYED'], minAgeYears: 23, maxAgeYears: 65 } },
  { productId: 'VL-201', name: 'Kestrel New Car Loan', loanType: 'VEHICLE', description: 'Finance up to 90% of the on-road price of a new car.', minInterestRate: 8.75, maxInterestRate: 11.5, minTenureMonths: 12, maxTenureMonths: 84, minAmount: 100000, maxAmount: 5000000, processingFeePercent: 1.0, processingFeeMin: 1500, eligibilityCriteria: { minMonthlyIncome: 20000, minCreditScore: 680, maxObligationRatioPercent: 50, allowedSegments: ['SALARIED', 'SELF_EMPLOYED'], minAgeYears: 21, maxAgeYears: 65 } },
  { productId: 'VL-204', name: 'Kestrel Pre-Owned Car Loan', loanType: 'VEHICLE', description: 'Loan for used cars up to 8 years old at the end of the tenure.', minInterestRate: 10.5, maxInterestRate: 13.0, minTenureMonths: 12, maxTenureMonths: 84, minAmount: 100000, maxAmount: 2500000, processingFeePercent: 1.5, processingFeeMin: 1000, eligibilityCriteria: { minMonthlyIncome: 25000, minCreditScore: 650, maxObligationRatioPercent: 50, allowedSegments: ['SALARIED', 'SELF_EMPLOYED'], minAgeYears: 21, maxAgeYears: 60 } },
  { productId: 'EL-401', name: 'Kestrel Scholar Education Loan', loanType: 'EDUCATION', description: 'Education loan for studies in India with a co-applicant.', minInterestRate: 9.0, maxInterestRate: 11.5, minTenureMonths: 12, maxTenureMonths: 120, minAmount: 50000, maxAmount: 2000000, processingFeePercent: 0.5, processingFeeMin: 1000, eligibilityCriteria: { minMonthlyIncome: 0, minCreditScore: 650, maxObligationRatioPercent: 50, allowedSegments: ['STUDENT'], minAgeYears: 18, maxAgeYears: 35 } },
  { productId: 'EL-402', name: 'Kestrel Global Education Loan', loanType: 'EDUCATION', description: 'Education loan for studies abroad, covering tuition and living costs.', minInterestRate: 10.5, maxInterestRate: 13.0, minTenureMonths: 24, maxTenureMonths: 180, minAmount: 500000, maxAmount: 7500000, processingFeePercent: 1.0, processingFeeMin: 5000, eligibilityCriteria: { minMonthlyIncome: 0, minCreditScore: 680, maxObligationRatioPercent: 50, allowedSegments: ['STUDENT'], minAgeYears: 18, maxAgeYears: 35 } },
];

export const users = {
  'priya.sharma':  { role: 'CUSTOMER', customerId: 'CUST-1001', displayName: 'Priya Sharma' },
  'rahul.verma':   { role: 'CUSTOMER', customerId: 'CUST-1002', displayName: 'Rahul Verma' },
  'ananya.iyer':   { role: 'CUSTOMER', customerId: 'CUST-1003', displayName: 'Ananya Iyer' },
  'officer.kumar': { role: 'LOAN_OFFICER', customerId: null, displayName: 'Arjun Kumar' },
  'analyst.mehta': { role: 'CREDIT_ANALYST', customerId: null, displayName: 'Neha Mehta' },
  'admin.rao':     { role: 'POLICY_ADMIN', customerId: null, displayName: 'Admin Rao' },
} as const;   // password for all: "password"

export const profiles: Record<string, CustomerProfile> = {
  'CUST-1001': { customerId: 'CUST-1001', fullName: 'Priya Sharma', email: 'priya.sharma@example.com', phone: '+91-98200-11001', segment: 'SALARIED', employmentType: 'Private sector salaried', monthlyIncome: 60000, existingMonthlyObligations: 8000, location: 'Pune', kycStatus: 'VERIFIED', dateOfBirth: '1994-03-14' },
  'CUST-1002': { customerId: 'CUST-1002', fullName: 'Rahul Verma', email: 'rahul.verma@example.com', phone: '+91-98290-11002', segment: 'SELF_EMPLOYED', employmentType: 'Self-employed retail business owner', monthlyIncome: 95000, existingMonthlyObligations: 22000, location: 'Jaipur', kycStatus: 'VERIFIED', dateOfBirth: '1988-07-02' },
  'CUST-1003': { customerId: 'CUST-1003', fullName: 'Ananya Iyer', email: 'ananya.iyer@example.com', phone: '+91-98400-11003', segment: 'STUDENT', employmentType: 'Full-time postgraduate student', monthlyIncome: 0, existingMonthlyObligations: 0, location: 'Chennai', kycStatus: 'PENDING', dateOfBirth: '2003-11-21' },
};

export const applications: LoanApplication[] = [
  { applicationId: 'LA-2026-00418', customerId: 'CUST-1001', productId: 'PL-101', requestedAmount: 500000, tenureMonths: 48, purpose: 'Home renovation and furnishing', employmentType: 'Private sector salaried', monthlyIncome: 60000, existingMonthlyObligations: 8000, currentStep: 4, status: 'SUBMITTED', estimatedEmi: 13167, createdAt: '2026-10-20T09:15:00.000Z', updatedAt: '2026-10-21T10:30:00.000Z', latestRecommendation: null,
    timeline: [ { status: 'DRAFT', at: '2026-10-20T09:15:00.000Z', by: 'priya.sharma', note: 'Draft created' }, { status: 'SUBMITTED', at: '2026-10-21T10:30:00.000Z', by: 'priya.sharma', note: 'Submitted by customer' } ] },
  { applicationId: 'LA-2026-00420', customerId: 'CUST-1001', productId: 'VL-204', requestedAmount: 500000, tenureMonths: 60, purpose: 'Used car purchase', currentStep: 2, status: 'DRAFT', estimatedEmi: 10871, createdAt: '2026-10-22T14:05:00.000Z', updatedAt: '2026-10-22T14:05:00.000Z', latestRecommendation: null,
    timeline: [ { status: 'DRAFT', at: '2026-10-22T14:05:00.000Z', by: 'priya.sharma', note: 'Draft created' } ] },
];

export const documents: ApplicationDocument[] = [
  { documentId: 'DOC-2026-00001', applicationId: 'LA-2026-00418', documentType: 'IDENTITY', fileName: 'pan-card.pdf', contentType: 'application/pdf', sizeBytes: 182344, uploadedAt: '2026-10-21T10:18:00.000Z' },
  { documentId: 'DOC-2026-00002', applicationId: 'LA-2026-00418', documentType: 'INCOME', fileName: 'salary-slips-jul-sep-2026.pdf', contentType: 'application/pdf', sizeBytes: 412880, uploadedAt: '2026-10-21T10:20:00.000Z' },
  { documentId: 'DOC-2026-00003', applicationId: 'LA-2026-00418', documentType: 'INCOME', fileName: 'bank-statement-apr-sep-2026.pdf', contentType: 'application/pdf', sizeBytes: 905112, uploadedAt: '2026-10-21T10:22:00.000Z' },
];

// Brief Module 1 Expected Response — VERBATIM.
export const advisorSample: AdvisorResponse = {
  interpretedRequirement: 'Used car loan of 5 lakh with EMI below 12,000',
  loanAmount: 500000, monthlyIncome: 60000, maxPreferredEmi: 12000, currency: 'INR',
  recommendations: [ { productId: 'VL-204', productName: 'Kestrel Pre-Owned Car Loan', indicativeInterestRate: 11.0, tenureMonths: 60, estimatedEmi: 10871, reason: '60-month tenure keeps EMI within the limit (about 18% of income)', eligibilityIndicator: 'LIKELY_ELIGIBLE' } ],
  disclaimer: 'Indicative only. Final approval is subject to credit assessment.',
  clarifyingQuestion: null, conversationId: 'CONV-MOCK-1',
};
export const advisorClarify: AdvisorResponse = {
  interpretedRequirement: 'Loan request without amount, purpose or income',
  loanAmount: null, monthlyIncome: null, maxPreferredEmi: null, currency: 'INR', recommendations: [],
  disclaimer: 'Indicative only. Final approval is subject to credit assessment.',
  clarifyingQuestion: 'How much do you need, what is it for, and what is your monthly income?', conversationId: 'CONV-MOCK-1',
};

// Brief Module 2 Expected Output — VERBATIM.
export const policySample: PolicyAnswer = {
  answer: 'Foreclosure is allowed after 6 EMIs, with a 2% charge on the outstanding principal.',
  confidence: 'HIGH',
  sources: [ { document: 'Vehicle Loan Terms and Conditions', section: 'Foreclosure and Part-Prepayment', version: '2026.3', effectiveDate: '2026-07-01' } ],
  followUpRequired: false,
};
export const policyNotFound: PolicyAnswer = {
  answer: "I could not find this in Kestrel Bank's approved documents. Please contact your branch or a loan officer.",
  confidence: 'LOW', sources: [], followUpRequired: true,
};
// Foreclosure answer text per VEHICLE-TNC version (policy-versioning demo). v2026.3 = the brief's answer.
export const foreclosureAnswers: Record<string, string> = {
  '2026.3': policySample.answer,
  '2026.4': 'Foreclosure is allowed after 3 EMIs, with a 1% charge on the outstanding principal.',
};

// Brief Module 3 Expected Output — VERBATIM.
export const workflowSample: AgentRecommendation = {
  applicationId: 'LA-2026-00418', recommendation: 'REQUEST_ADDITIONAL_DOCUMENTS', riskBand: 'MEDIUM',
  checks: [
    { agent: 'DocumentVerificationAgent', result: 'INCOMPLETE', detail: 'Address proof is missing' },
    { agent: 'CreditAssessmentAgent', result: 'PASS', detail: 'Obligation ratio is 38% (limit 50%); credit score band is 720-760' },
    { agent: 'ComplianceAgent', result: 'PASS', detail: 'KYC status verified' },
  ],
  missingDocuments: ['Address proof'],
  customerMessage: 'Please upload a valid address proof to continue your application.',
  requiresHumanApproval: true, auditTrailId: 'AUD-2026-77301',
};
// Demo variant returned when ?demoPermissionViolation=true.
export const workflowDenied: AgentRecommendation = {
  ...workflowSample,
  checks: [ workflowSample.checks[0], workflowSample.checks[1], { agent: 'ComplianceAgent', result: 'EXCEPTION', detail: 'Refused: ComplianceAgent is not permitted to call get_credit_score' } ],
  auditTrailId: 'AUD-2026-77302',
};
```

Also in `fixtures.ts`:
- `auditTrails: Record<string, AuditTrail>` with `AUD-2026-77301` (applicationId `LA-2026-00418`, startedAt `2026-10-23T10:00:00.000Z`, completedAt `2026-10-23T10:00:14.000Z`) and 14 events in this order (sequence 1..14, timestamps one second apart, durationMs 5–900): `AGENT_START OrchestratorAgent`; `TOOL_CALL OrchestratorAgent update_application {applicationId, status:'UNDER_VERIFICATION'}`; `TOOL_RESULT OrchestratorAgent update_application {ok:true}`; `AGENT_START DocumentVerificationAgent`; `TOOL_CALL DocumentVerificationAgent verify_income {customerId:'CUST-1001', declaredIncome:60000}`; `TOOL_RESULT ... {verified:true, verifiedIncome:60000}`; `AGENT_END DocumentVerificationAgent {result:'INCOMPLETE', detail:'Address proof is missing'}`; `TOOL_CALL CreditAssessmentAgent get_credit_score {customerId:'CUST-1001'}`; `TOOL_RESULT ... {score:735, band:'720-760'}`; `AGENT_END CreditAssessmentAgent {result:'PASS'}`; `TOOL_CALL ComplianceAgent get_kyc_status {customerId:'CUST-1001', kycRef:'PAN XXXXX1234X'}`; `TOOL_RESULT ... {status:'VERIFIED'}`; `HUMAN_REQUIRED OrchestratorAgent {reason:'Missing documents; final decision is always human'}`; `TOOL_CALL OrchestratorAgent update_application {status:'UNDER_REVIEW'}`. `AUD-2026-77302` = the same plus a `PERMISSION_DENIED ComplianceAgent get_credit_score {reason:'ComplianceAgent is not permitted to call get_credit_score'}` event inserted after the KYC result (resequence).
- `policyVersions: Omit<PolicyVersion, 'servingState'>[]` (stored rows; `servingState` is computed by the handlers, never stored), all `status: 'PUBLISHED'`, `createdBy`/`publishedBy` `'system'`, `publishedAt` = `ingestedAt` = `2026-10-22T08:00:00.000Z`, `retiredAt`/`retiredReason` `null`:
  - `KB-001` documentKey `VEHICLE-TNC` `Vehicle Loan Terms and Conditions` v`2026.3` `2026-07-01` VEHICLE TERMS_AND_CONDITIONS CUSTOMER ALL chunkCount 9, changeNote `Foreclosure charge revised to 2% after 6 EMIs`
  - `KB-002` `VEHICLE-TNC` same title v`2025.1` `2025-04-01` chunkCount 8, changeNote `Initial version`
  - `KB-003` `PERSONAL-RATES` `Personal Loan Rate and Fee Schedule` v`2026.1` `2026-04-01` PERSONAL RATE_FEE_SCHEDULE CUSTOMER ALL 4, changeNote `Initial version`
  - `KB-004` `OFFICER-PLAYBOOK` `Loan Officer Playbook` v`2026.2` `2026-06-15` ALL OFFICER_PLAYBOOK INTERNAL ALL 6, changeNote `Initial version`
  So in mock mode VEHICLE-TNC shows v2026.3 ACTIVE and v2025.1 SUPERSEDED.
- `previewSections: Record<string, PolicyPreviewSection[]>` keyed by VEHICLE-TNC version: `'2026.3'` → `Eligibility` ("Salaried and self-employed applicants aged 21–65."), `Foreclosure and Part-Prepayment` ("Foreclosure is allowed after 6 EMIs. A charge of 2% applies on the outstanding principal."), `Late Payment` ("A late payment charge of 2% per month applies on the overdue EMI."); `'2026.4'` → the same three sections with the foreclosure text "Foreclosure is allowed after 3 EMIs. A charge of 1% applies on the outstanding principal." Any other version → `[{ section: 'Overview', content: '<title> v<version> (mock preview).' }]`.

`handlers.ts`: `const base = API_BASE` (import from `../api/client`). In-memory state cloned from fixtures with `structuredClone`; export `resetMockState()`. Token = `mock.<username>`; read the user from the `Authorization` header; missing → 401 envelope. Every error response uses the §3 envelope `{ status, code, message, details: [], timestamp, path }`. One handler per openapi endpoint, **compare before `:productId`**:

| Handler | Mock behaviour |
|---|---|
| `POST /api/auth/login` | known username + `password` → `{ token: 'mock.<username>', role, customerId, displayName }`; else 401 `UNAUTHORIZED` |
| `GET /api/auth/me` | `{ username, role, customerId }` |
| `GET /api/products/compare` | split `ids`; 2–4 else 400 `VALIDATION_FAILED`; return in order |
| `GET /api/products/:productId` | product or 404 |
| `GET /api/products` | filter by `q` (name/id/description), `loanType`, `segment`; sort `rate_asc`/`rate_desc`/`name`; else by productId |
| `POST /api/emi/calculate` | `// MOCK ONLY — mirrors backend loanMath.ts; app code never computes money.` Implement the formula `emi = round(P*r*(1+r)^n/((1+r)^n-1))`, `r = rate/1200`, plus schedule (last row closes to 0). 500000/11/60 must give 10871. |
| `GET/PUT /api/customers/me` | CUSTOMER only (else 403); PUT merges body |
| `GET /api/applications` | CUSTOMER → own; staff → all; `?status=` filter |
| `POST /api/applications` | new `LA-2026-0xxxx` id (counter from 00500), DRAFT, timeline `[DRAFT]`, 201 |
| `GET /api/applications/:id` | 404 if absent |
| `PUT /api/applications/:id` | 409 `INVALID_STATE` unless DRAFT; merge body; `estimatedEmi` = value from the EMI mock helper when product+amount+tenure are set (mock uses `minInterestRate`; the real backend uses an internal indicative rate, so real numbers can differ slightly) |
| `POST /api/applications/:id/submit` | require productId, requestedAmount, tenureMonths, purpose, employmentType, monthlyIncome, existingMonthlyObligations (400 with `details[]`); → SUBMITTED + timeline event |
| `POST /api/applications/:id/decision` | non-analyst → 403 `FORBIDDEN`; not UNDER_REVIEW → 409; reason < 10 → 400; else status = decision + timeline |
| `GET/POST /api/applications/:id/documents` | list by id; POST reads `formData()` → new doc (201) |
| `POST /api/advisor/chat` | message matching `/car|lakh/i` → `advisorSample`, else `advisorClarify` |
| `GET /api/knowledge/documents` | CUSTOMER → 403; the stored rows whose servingState is ACTIVE (read-only; there is no POST any more) |
| `POST /api/policy/ask` | question matching `/foreclos/i` → `foreclosureAnswer(v)` where `v` = the ACTIVE `VEHICLE-TNC` row (none → `policyNotFound`); else `policyNotFound` |
| `GET /api/admin/policies` | one `PolicyLibraryItem` per documentKey: `title`/`documentType`/`audience` from its newest row, `activeVersion`/`activeEffectiveDate` from the ACTIVE row, `scheduledVersion`/`scheduledEffectiveDate` from the earliest SCHEDULED row (else `null`), `draftCount` = DRAFT rows, `totalVersions` = all rows |
| `GET /api/admin/policies/:documentKey/versions` | rows of that key with `servingState`, newest first (effectiveDate desc, then ingestedAt desc); unknown key → 404 |
| `POST /api/admin/policies` | read `formData()`; missing required field (`file, documentKey, title, version, effectiveDate, loanType, documentType, audience, changeNote`), documentKey not matching `/^[A-Z0-9]+(-[A-Z0-9]+)*$/`, or changeNote < 5 chars → 400 `VALIDATION_FAILED` with `details[]`; `(documentKey, version)` already exists → 409 `INVALID_STATE`; else new row `KB-1xx` (counter from 101), `status: 'DRAFT'`, `chunkCount: 9`, `createdBy` = caller, publish/retire fields `null`, `ingestedAt` = now → 201 with `servingState` |
| `GET /api/admin/policies/versions/:documentId/preview` | VEHICLE-TNC → `previewSections[version]`; other keys → the generic Overview section; unknown id → 404 |
| `POST /api/admin/policies/versions/:documentId/test-ask` | searches THIS row only (any status, incl. DRAFT): VEHICLE-TNC + `/foreclos/i` → `foreclosureAnswer(row)`; else `policyNotFound` |
| `POST /api/admin/policies/versions/:documentId/publish` | status ≠ DRAFT → 409 `INVALID_STATE`; else `status: 'PUBLISHED'`, `publishedBy` = caller, `publishedAt` = now → 200 with recomputed `servingState` |
| `POST /api/admin/policies/versions/:documentId/retire` | `reason` < 5 chars → 400; status ≠ PUBLISHED → 409 `INVALID_STATE`; else `status: 'RETIRED'`, `retiredAt` = now, `retiredReason` = reason → 200 |

Every `/api/admin/**` handler: caller role ≠ `POLICY_ADMIN` → 403 `FORBIDDEN`. Mock-only helpers in `handlers.ts` (they mirror Integration_Contracts.md §8a; app code never decides serving state):
- `servingState(row, rows, today)`: DRAFT → `DRAFT`; RETIRED → `RETIRED`; PUBLISHED with `effectiveDate > today` → `SCHEDULED`; the PUBLISHED row of its documentKey with the highest `effectiveDate ≤ today` (tie → latest `publishedAt`) → `ACTIVE`; other PUBLISHED → `SUPERSEDED`. `today = new Date().toISOString().slice(0, 10)`.
- `foreclosureAnswer(row)`: `{ ...policySample, answer: foreclosureAnswers[row.version] ?? policySample.answer, sources: [{ ...policySample.sources[0], version: row.version, effectiveDate: row.effectiveDate }] }`.

Stateful demo flow this must support (in-memory, reset by `resetMockState()`): upload VEHICLE-TNC v2026.4 → DRAFT; publish with effectiveDate ≤ today → v2026.4 ACTIVE, v2026.3 SUPERSEDED, `/api/policy/ask` foreclosure answer = "after 3 EMIs, 1%" citing v2026.4; retire v2026.4 → v2026.3 ACTIVE again and the answer is back to "after 6 EMIs, 2%" citing v2026.3. Publish with a future date → SCHEDULED, the answer does not change.
| `POST /api/workflow/applications/:id/run` | CUSTOMER → 403; status ≠ SUBMITTED → 409 `INVALID_STATE`; `demoPermissionViolation=true` → `workflowDenied` else `workflowSample` (with `applicationId` = id); move app to UNDER_REVIEW with timeline events UNDER_VERIFICATION (by `OrchestratorAgent`) and UNDER_REVIEW; remember the result |
| `GET /api/workflow/applications/:id/recommendation` | remembered result or 404 |
| `GET /api/audit/:auditTrailId` | trail or 404 |

`browser.ts`: `export const worker = setupWorker(...handlers)`. `server.ts`: `export const server = setupServer(...handlers)`.

`main.tsx`:
```tsx
import '@fontsource-variable/inter';
import './styles/tokens.css';
import { USE_MOCKS } from './api/client';
async function start() {
  if (USE_MOCKS) { const { worker } = await import('./mocks/browser'); await worker.start({ onUnhandledRequest: 'bypass' }); }
  createRoot(document.getElementById('root')!).render(<StrictMode><QueryClientProvider client={queryClient}><AuthProvider><RouterProvider router={router} /></AuthProvider></QueryClientProvider></StrictMode>);
}
void start();
```
Mocks are lazy-imported so they never ship in a `VITE_USE_MOCKS=false` build.

`components/ui/MockBadge.tsx`: when `USE_MOCKS`, a fixed bottom-left pill `MOCK DATA` (`bg-warn text-white text-xs font-semibold rounded-full px-3 py-1`, `role="status"`); renders nothing otherwise. Shown on every page including Login.

`src/test/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from '../mocks/server';
import { resetMockState } from '../mocks/handlers';
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => { cleanup(); server.resetHandlers(); resetMockState(); localStorage.clear(); });
afterAll(() => server.close());
```

**Acceptance**: `npm run dev` with `VITE_USE_MOCKS=true` → browser console shows `[MSW] Mocking enabled.`; the MOCK DATA pill is visible.
**Commit**: `M1-9: MSW handlers for every endpoint with brief sample fixtures`

### Step 1.7 — Formatting helpers + UI primitives

`lib/formatInr.ts`:
```ts
const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
export function formatInr(value: number): string { return inr.format(value); }               // 500000 → ₹5,00,000
export function formatPercent(value: number): string { return `${value.toFixed(1)}%`; }        // 11 → 11.0%
```
`lib/formatInr.test.ts`: `formatInr(500000) === '₹5,00,000'`, `formatInr(10871) === '₹10,871'`, `formatInr(10000000) === '₹1,00,00,000'`, `formatInr(0) === '₹0'`, `formatPercent(11) === '11.0%'`.

`lib/formatDate.ts`: `formatDate('2026-07-01') === '01 Jul 2026'` (`en-GB`, `day: '2-digit', month: 'short', year: 'numeric'`, `timeZone: 'UTC'`); `formatDateTime(iso)` adds `HH:mm`.

UI primitives (Design.md §5): `Button` (variants primary/secondary/ghost/danger/link, sizes sm/md/lg, `loading` → spinner + `aria-busy`, always `focus-ring`), `Card` (title, actions, footer), `Money` (only renderer of rupees, `tabular-nums`, uses `formatInr`), `Badge` (tone: neutral/success/warn/danger/info/accent; always shows text), `RoleBadge`, `AiTag` (amber `AI` pill), `Field` (label + input/select/textarea via children, `htmlFor`, error text with `aria-describedby` + `aria-invalid`), `ErrorAlert` (renders `ApiError` message + code in `bg-danger-soft`, `role="alert"`), `Skeleton`, `EmptyState` (icon + sentence + action).

**Acceptance**: `npx vitest run src/lib` → 1 file passed.
**Commit**: `M1-9: INR formatting and UI primitives`

### Step 1.8 — Auth, routing, RoleGuard, layout, Login

`auth/AuthContext.tsx`:
```ts
export interface AuthUser { username: string; role: Role; customerId: string | null; displayName: string; token: string }
export interface AuthValue { user: AuthUser | null; login: (res: LoginResponse, username: string) => void; logout: () => void }
export const AuthContext = createContext<AuthValue | null>(null);
export function useAuth(): AuthValue   // throws if used outside the provider
```
`AuthProvider` initialises from `readStoredAuth<AuthUser>()`; `login` stores `{...res, username}` under `ll-auth` (wrap `localStorage.setItem/removeItem` in try/catch), `logout` removes it and clears the query cache; it listens for the `ll:unauthorized` window event and calls `logout()`.

`auth/roleHome.ts`: `CUSTOMER → '/products'`, `LOAN_OFFICER → '/officer/queue'`, `CREDIT_ANALYST → '/officer/queue'`, `POLICY_ADMIN → '/admin/policies'`.

`routes/RoleGuard.tsx`: props `{ allow: Role[] }`. No user → `<Navigate to="/login" replace state={{ from: location.pathname }} />`. Role not in `allow` → `<Navigate to="/forbidden" replace />`. Else `<Outlet />`.

**Route table** (`routes/router.tsx`, `createBrowserRouter` from `react-router`):

| Path | Page | Allowed roles |
|---|---|---|
| `/login` | `LoginPage` | public |
| `/` | redirect to `roleHome(user.role)` | all 4 |
| `/products` | `CataloguePage` | CUSTOMER, LOAN_OFFICER, CREDIT_ANALYST |
| `/products/:productId` | `ProductDetailPage` | CUSTOMER, LOAN_OFFICER, CREDIT_ANALYST |
| `/compare` (`?ids=a,b`) | `ComparePage` | CUSTOMER, LOAN_OFFICER, CREDIT_ANALYST |
| `/emi` | `EmiPage` | CUSTOMER, LOAN_OFFICER, CREDIT_ANALYST |
| `/advisor` | `AdvisorPage` | CUSTOMER, LOAN_OFFICER, CREDIT_ANALYST |
| `/policy` | `PolicyPage` | all 4 |
| `/profile` | `ProfilePage` | CUSTOMER |
| `/applications` | `MyApplicationsPage` | CUSTOMER |
| `/applications/new` | `ApplicationWizardPage` | CUSTOMER |
| `/applications/:applicationId/edit` | `ApplicationWizardPage` | CUSTOMER |
| `/applications/:applicationId/status` | `StatusTrackerPage` | CUSTOMER, LOAN_OFFICER, CREDIT_ANALYST (backend enforces ownership) |
| `/officer/queue` | `OfficerQueuePage` | LOAN_OFFICER, CREDIT_ANALYST |
| `/analyst/review/:applicationId` | `AnalystReviewPage` | LOAN_OFFICER (view + run), CREDIT_ANALYST (view + run + decide) |
| `/knowledge` | `KnowledgePage` (read-only "Policies in force") | LOAN_OFFICER, CREDIT_ANALYST |
| `/admin/policies` | `PolicyLibraryPage` | POLICY_ADMIN |
| `/admin/policies/new` (optional `?documentKey=`) | `PolicyUploadPage` | POLICY_ADMIN |
| `/admin/policies/:documentKey` | `PolicyDetailPage` | POLICY_ADMIN |
| `/forbidden` | `ForbiddenPage` | all 4 |
| `*` | `NotFoundPage` | public |

POLICY_ADMIN sees only `/admin/policies/**` and `/policy` (plus `/` and `/forbidden`); every other route sends them to `/forbidden`. Declare `/admin/policies/new` before `/admin/policies/:documentKey`.

Structure: `/login` and `*` at top level; everything else under `<RoleGuard allow={['CUSTOMER','LOAN_OFFICER','CREDIT_ANALYST','POLICY_ADMIN']} />` → `<AppLayout />` → children (`/`, `/policy`, `/forbidden`), with nested groups `<RoleGuard allow={['CUSTOMER','LOAN_OFFICER','CREDIT_ANALYST']} />` (products, compare, EMI, advisor, status tracker), `<RoleGuard allow={['CUSTOMER']} />`, `<RoleGuard allow={['LOAN_OFFICER','CREDIT_ANALYST']} />` (queue, review, knowledge) and `<RoleGuard allow={['POLICY_ADMIN']} />` (`/admin/policies/**`). Write the `allow={[...]}` arrays literally in `router.tsx` (the change manual greps for `allow=`).

`routes/nav.ts` — `navByRole: Record<Role, { label: string; to: string }[]>`:
- CUSTOMER: Products `/products`, EMI calculator `/emi`, Advisor `/advisor`, Policy assistant `/policy`, My applications `/applications`, Profile `/profile`
- LOAN_OFFICER: Queue `/officer/queue`, Policy assistant `/policy`, Policies in force `/knowledge`, Products `/products`
- CREDIT_ANALYST: Review queue `/officer/queue`, Policy assistant `/policy`, Policies in force `/knowledge`, Products `/products`
- POLICY_ADMIN: Policy library `/admin/policies`, Policy assistant `/policy`

`layouts/AppLayout.tsx`: skip link "Skip to content" (first focusable, → `#main`); top bar `bg-surface border-b border-border`: brand "Kestrel Bank · LoanLens" (`text-primary font-semibold`), `NavLink`s from `navByRole[user.role]` (active = `text-primary border-b-2 border-primary`), theme toggle button (sets `document.documentElement.dataset.theme`, persists `ll-theme` in localStorage with try/catch, default from `prefers-color-scheme`), `RoleBadge` + displayName, Logout button. Below `md`: a hamburger button (`aria-expanded`, `aria-controls`) opens a vertical drawer with the same links. `<main id="main" className="mx-auto max-w-[1200px] px-4 md:px-6 xl:px-8 py-6">` + `<Outlet />`. `MockBadge`.

`LoginPage`: centred `Card` max-w-[400px]; `Field`s Username / Password (type password), Sign in (`useLogin`); on success `login(res, username)` then navigate to `state.from` or `roleHome(role)`; error → `ErrorAlert`. Below: "Demo users" — six buttons (`priya.sharma` Customer · Salaried, `rahul.verma` Customer · Self-employed, `ananya.iyer` Customer · Student, `officer.kumar` Loan Officer, `analyst.mehta` Credit Analyst, `admin.rao` Policy Admin); clicking one logs in immediately with password `password`. Note under them: "Simulated sign-in. All demo passwords are `password`."

`ForbiddenPage`: "You don't have permission for this page." + link to role home. `NotFoundPage`: "Page not found." + link home.

`routes/RoleGuard.test.tsx` (MemoryRouter + `AuthContext.Provider` with a fixed value):
1. no user at `/officer/queue` → renders the `/login` route text "Login page".
2. CUSTOMER at `/officer/queue` (allow LOAN_OFFICER, CREDIT_ANALYST) → renders "Forbidden page".
3. LOAN_OFFICER at `/officer/queue` → renders "Queue content".
4. CUSTOMER at `/admin/policies` (allow POLICY_ADMIN) → renders "Forbidden page".
5. POLICY_ADMIN at `/analyst/review/LA-2026-00418` (allow LOAN_OFFICER, CREDIT_ANALYST) → renders "Forbidden page"; POLICY_ADMIN at `/admin/policies` → renders "Library content".

**Acceptance**: `npx vitest run src/routes` → 5 tests pass. `npm run dev` → log in with each of the 6 demo buttons; nav differs per role; Priya visiting `/officer/queue` or `/admin/policies` lands on `/forbidden`; `admin.rao` lands on `/admin/policies` and visiting `/products` lands on `/forbidden`.
**Commit**: `M1-8: role-based routing, RoleGuard, nav per role and login`

### Step 1.9 — Catalogue, ProductCard, Compare

`CataloguePage` (`useProducts`): `<h1>` "Loan products". `CatalogueFilters`: search input (label "Search products"), loanType select (All, Personal, Home, Vehicle, Education), segment select (All, Salaried, Self-employed, Student), min/max amount number inputs, sort select (Lowest rate `rate_asc`, Highest rate `rate_desc`, Lowest amount `amount_asc`, Highest amount `amount_desc`, Shortest tenure `tenure_asc`, Longest tenure `tenure_desc`, Name `name`). All filters live in the URL search params. Grid `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4` of `ProductCard`. `const MAX_COMPARE = 4`; selected ids in state; sticky bar "Compare (n)" button enabled for 2–4 → `/compare?ids=a,b`. States: skeleton cards; empty "No products match. Clear filters." with a button; `ErrorAlert`.

`ProductCard` (props `product, selected, onToggle(id), disableSelect`): loan-type pill, name (`text-h3`), `productId` (`text-xs text-muted`); 2×2 facts: rate `10.5% – 13.0% p.a.`, tenure `12 – 84 months`, amount `₹1,00,000 – ₹25,00,000` (Money), processing fee `1.5% (min ₹1,000)`; footer: "Compare" checkbox with label (disabled with `title="You can compare up to 4 products"` when 4 selected and this one isn't) + "View & calculate EMI" secondary link to `/products/:productId`.

`ComparePage` (`useCompareProducts(ids from ?ids)`): fewer than 2 ids → EmptyState "Pick 2 to 4 products in the catalogue." `CompareTable` (props `products`): products as columns, `const ROWS` = rate range, tenure, amount, processing fee, min income, min credit score, max obligation ratio, allowed segments. Rows with `best: 'min'` (rate via `minInterestRate`, fee via `processingFeePercent`) highlight the lowest cell `bg-success-soft` + "Best" tag (comparison only, no arithmetic). First column `sticky left-0 bg-surface`; table inside `overflow-x-auto`.

**Acceptance**: `/products` shows 8 cards; Vehicle + Lowest rate shows VL-201 then VL-204; tick PL-101 and PL-102 → Compare → side-by-side table.
**Commit**: `M1-2: catalogue with search, filter, sort and compare`

### Step 1.10 — Product detail + EMI calculator + EMI page

`EmiCalculator` (props `defaultPrincipal?, defaultRate?, defaultTenure?, rateBounds?: [number, number], tenureBounds?: [number, number]`): inputs Principal (number, digits only, `₹` prefix, formatted mirror below via `formatInr`), Annual rate % (range + number, step 0.1, bounded by `rateBounds` or 0–30), Tenure months (range + number, bounded by `tenureBounds` or 1–360). `const DEBOUNCE_MS = 300`; debounced values → `useEmi({ principal, annualRate, tenureMonths })`. Hero: EMI as `Money` in `text-display font-bold`; beside it total interest and total payment (`text-h3`), all from the response. Inputs left / result right at `md`, stacked on mobile. Under the result: `<details>` "Amortization schedule (N months)" containing `EmiTable`. Invalid input → inline field error, no request.

`EmiTable` (props `schedule: ScheduleRow[]`): `const COLUMNS` = Month | Opening balance | EMI | Principal | Interest | Closing balance; numbers right-aligned `tabular-nums` via `Money`; Opening balance column `hidden md:table-cell`; sticky header; scroll inside its card. "Download CSV" button builds CSV from the API rows (formatting only).

`ProductDetailPage` (`useProduct`): name, id, description, facts, eligibility list; `EmiCalculator` with defaults principal `min(500000, maxAmount)` clamped to `minAmount`, rate `minInterestRate`, tenure `min(60, maxTenureMonths)` clamped to `minTenureMonths`, bounds from the product (choosing a default is not money maths). CUSTOMER sees "Apply for this loan" → `/applications/new?productId=<id>`. 404 → "Product not found".

`EmiPage`: `<h1>` "EMI calculator" + `EmiCalculator` with defaults 500000 / 11 / 60.

**Acceptance**: `/products/VL-204` → set ₹5,00,000 / 11.0 / 60 → EMI `₹10,871`; schedule has 60 rows and the last closing balance is `₹0`. Width 375 px: no horizontal page scroll.
**Commit**: `M1-3: EMI calculator with amortization table (numbers from API)`

### Phase 1 PR checklist
- [ ] `npm test` (formatInr, RoleGuard) and `npm run build` pass.
- [ ] Every Phase 1 screen works with mocks at 375 / 768 / 1280.
- [ ] Money grep (guardrails list) is empty outside `src/mocks/`.
- [ ] Update `Component_Change_Manual.md` sections 0–7 paths (they already match this tree — fix any drift).
- [ ] PR: `gh pr create --base main --title "S3 phase 1: shell, auth, catalogue, EMI" --body "REQ IDs: M1-1, M1-2, M1-3, M1-8, M1-9. Verified: <commands + screenshots>"`.

---

## Phase 2 — AI chats, profile, wizard, tracker (merge point P2)

### Step 2.1 — ChatPanel + AdvisorPage

`ChatPanel` (props `messages, onSend(text), pending, renderAssistant(msg), disclaimer, placeholder, suggestions?: string[]`): message list `role="log" aria-live="polite"`; `const USER_BUBBLE = 'bg-primary text-white'`, `const ASSISTANT_BUBBLE = 'bg-surface-2 text-fg'`; user right, assistant left, `rounded-lg`, max-w 80% / 640px; assistant header row = `AiTag` + time. Composer: `<label>` "Message" (visually hidden ok), textarea (Enter sends, Shift+Enter newline), "Send" button with text; disabled + typing bubble while pending. Suggestion chips above the composer. Disclaimer line `text-xs text-muted` under the list. Error: `AI_UNAVAILABLE` (503) → bubble "The AI service is unavailable. Try again in a moment." + Retry button that resends; other errors → `ErrorAlert` in the bubble.

`AdvisorPage` (`useAdvisorChat`): keeps `conversationId` from the last response and sends it back. Suggestion: the brief's query `I need ₹5 lakh for a used car. I earn ₹60,000 per month and want an EMI below ₹12,000.` Assistant render of `AdvisorResponse`:
- If `clarifyingQuestion` is non-null → it is the bubble text (no cards).
- Else: "Understood: *interpretedRequirement*" + chips Amount / Income / Max EMI (`Money`, or "—" when null) + one `RecommendationCard` per item.
- Always the `disclaimer` from the response.

`RecommendationCard` (props `rec: AdvisorRecommendation, onApply?(productId)`): productName + productId, `indicativeInterestRate` (`formatPercent`), `tenureMonths` months, `estimatedEmi` (`Money`, `text-h3`), `reason` sentence, eligibility `Badge` via `const ELIGIBILITY_STYLE` (LIKELY_ELIGIBLE success, BORDERLINE warn, UNLIKELY_ELIGIBLE danger, UNKNOWN neutral) with the words spelled out. CUSTOMER sees "Apply with this product" → `/applications/new?productId=<id>`.

**Acceptance**: `/advisor`, send the suggestion → card VL-204 · 11.0% · 60 months · ₹10,871 · LIKELY_ELIGIBLE + disclaimer. Send "I want a loan" → clarifying question bubble.
**Commit**: `M1-15: AI loan advisor chat rendering the brief's response`

### Step 2.2 — PolicyPage

`PolicyPage` (`usePolicyAsk`): optional filters above the chat — loanType select (All + 4) and customerSegment select (All + 3), sent as `loanType` / `customerSegment` (omit when "All" is not chosen by the user; send `ALL` only if selected). Suggestions = the brief's 5 questions verbatim:
1. `What documents do I need for a home loan if I am self-employed?`
2. `What is the processing fee for a personal loan of ₹3 lakh?`
3. `Can I foreclose my vehicle loan after six months, and are there any charges?`
4. `What is the minimum credit score required for a home loan?`
5. `How long does disbursal take after approval?`

Assistant render of `PolicyAnswer`: `answer` text; footer `ConfidenceBadge` (`const CONFIDENCE_STYLE`: HIGH success, MEDIUM warn, LOW danger; text "Confidence: HIGH") and one `SourceChip` per source: `document · section · v<version> · effective <formatDate(effectiveDate)>`, e.g. `Vehicle Loan Terms and Conditions · Foreclosure and Part-Prepayment · v2026.3 · effective 01 Jul 2026` (`bg-accent-soft text-xs rounded-sm`; the version + date part never truncates, the document/section part may, with the full text in `title`). The same `SourceChip` is reused by the admin `TestAskPanel`. `sources.length === 0` → "No approved source found." `followUpRequired` → info notice "Please confirm with a Kestrel Bank officer before acting on this." Disclaimer: "Answers come only from Kestrel Bank approved documents." The audience filter is set by the backend from your role — never send it.

**Acceptance**: ask question 3 → answer + HIGH + chip `Vehicle Loan Terms and Conditions · Foreclosure and Part-Prepayment · v2026.3 · effective 01 Jul 2026`.
**Commit**: `M2-9: policy assistant chat with sources, version and confidence`

### Step 2.3 — ProfilePage

`useProfile` + `useUpdateProfile`. Read-only: fullName, email, phone, dateOfBirth (`formatDate`), kycStatus badge. Editable form: Employment type (text), Segment (select), Monthly income (₹, integer ≥ 0), Existing monthly obligations (₹, integer ≥ 0), Location — "Save profile" → PUT; show "Profile saved" (`aria-live="polite"`); map `details[]` to field errors. No gender/religion/caste/marital fields — ever.
**Commit**: `M1-4: customer profile view and edit`

### Step 2.4 — ApplicationWizardPage (+ test)

Routes `/applications/new` (optional `?productId=`) and `/applications/:applicationId/edit`. `const STEPS = ['Product & amount', 'Employment & income', 'Documents', 'Review & submit']`.

- **Resume**: on `/edit`, `useApplication(id)` → form state from the response; start at `currentStep`. If status ≠ DRAFT → redirect to `/applications/:id/status`.
- **New**: no id yet. The first "Save draft" or "Next" calls `useCreateDraft` (POST with the fields so far + `currentStep`), then `navigate('/applications/<id>/edit', { replace: true })`. Never create a draft on mount.
- **Save draft on every step**: "Save draft" button on each step and every Next/Back call `useSaveDraft(id)` (PUT) with the full current draft and `currentStep` = the step being shown next. Show "Draft saved at HH:mm" (`aria-live="polite"`).
- `FormStepper` (props `steps, current, completed, onJump(i)`): `<ol>`, completed steps are buttons, `aria-current="step"`; horizontal `md:flex-row`, on mobile "Step 2 of 4" + progress bar.
- Step 1 `StepProduct`: product select (from `useProducts({})`), Requested amount (₹), Tenure (months), Purpose; hint under amount/tenure with the product's ranges.
- Step 2 `StepEmployment`: Employment type, Monthly income, Existing monthly obligations — prefilled from `useProfile()` when empty.
- Step 3 `StepDocuments`: three `FileDropzone`s (IDENTITY "Identity proof", ADDRESS "Address proof", INCOME "Income proof") using `useDocuments` / `useUploadDocument`. `FileDropzone` (props `applicationId, documentType, existing?, onUploaded`): label + file input (`accept=".pdf,.jpg,.jpeg,.png"`) + drag-drop area `border-dashed border-n300 hover:bg-primary-soft`; `const ACCEPT = ['application/pdf','image/jpeg','image/png']`, `const MAX_BYTES = 5 * 1024 * 1024` client-side check (server re-validates); shows uploaded fileName, size, uploadedAt, "Replace". Missing type → warn hint "Not uploaded yet" — never blocks Save or Submit (the brief's scenario submits without address proof).
- Step 4 `StepReview`: every field, uploaded documents, **`estimatedEmi` from the saved application** (`Money`; "Calculated after you save" when null); warn notice when a proof is missing ("Your application can be submitted; the bank may ask for it later."). "Submit application" → `useSubmitApplication` → navigate to `/applications/:id/status`. 400 `details[]` → list each `field: issue` and jump to the step containing the first field.

`pages/ApplicationWizard.test.tsx`:
1. Render at `/applications/LA-2026-00420/edit` (QueryClientProvider with `retry: false`, `AuthContext.Provider` for priya, `MemoryRouter` + `Routes` with the wizard route). Expect the "Employment & income" step to be current (`currentStep` 2 from the fixture).
2. Override PUT with `server.use(http.put(\`${API_BASE}/api/applications/:id\`, async ({ request, params }) => { captured = { id: params.id, body: await request.json() }; return HttpResponse.json({ ...fixtureDraft, ...captured.body }); }))`; click "Save draft"; `await waitFor(() => expect(captured?.id).toBe('LA-2026-00420'))` and `expect(captured.body.currentStep).toBe(2)`.

**Acceptance**: `npx vitest run src/pages` → pass. Manual: `/applications/new?productId=PL-101` → fill step 1 → Next → URL becomes `/applications/LA-2026-005xx/edit` → reload → resumes at step 2 → upload identity + income only → submit → status page shows SUBMITTED.
**Commit**: `M1-5: four-step application wizard with save-as-draft and uploads`

### Step 2.5 — MyApplicationsPage + StatusTrackerPage

`MyApplicationsPage` (`useApplications()`): rows/cards with applicationId, product, `Money` amount, `StatusBadge`, updated date; DRAFT → "Continue" `/applications/:id/edit`; other → "Track" `/applications/:id/status`. Empty: "You have no applications yet. Start one." → `/products`. Button "New application" → `/applications/new`.

`StatusBadge` (props `status`): `const STATUS_STYLE` map, human label (`Under Verification`).

`StatusTrackerPage` (`useApplication(id)`, `useRecommendation(id)`): summary (product, amount, tenure, estimatedEmi from API) + `StatusTimeline` (props `status, timeline`): `<ol>` vertical stepper over `const STATUS_ORDER = ['DRAFT','SUBMITTED','UNDER_VERIFICATION','UNDER_REVIEW','APPROVED','DISBURSED']` with REJECTED replacing APPROVED/DISBURSED when the status is REJECTED; reached steps `bg-primary`, current step `ring-2 ring-primary motion-safe:animate-pulse` + `aria-current="step"`, future `bg-n300`; each reached step shows `at` (`formatDateTime`), `by`, `note` from `timeline`. If a recommendation exists: card "Next steps" with `customerMessage` and `missingDocuments` list (customer view — no checks or risk band).

**Acceptance**: `/applications/LA-2026-00418/status` → DRAFT and SUBMITTED reached, SUBMITTED current.
**Commit**: `M1-7: application list and status tracker timeline`

### Phase 2 PR checklist
- [ ] `npm test` (formatInr, RoleGuard, ApplicationWizard) and `npm run build` pass.
- [ ] Brief advisor query and foreclosure question render exactly the brief's values (mocks).
- [ ] Chat panels have `role="log" aria-live="polite"`; every input has a label.
- [ ] Update `Component_Change_Manual.md` sections 8–11.
- [ ] PR: `S3 phase 2: advisor, policy, profile, wizard, tracker` with REQ IDs M1-4..M1-7, M1-15, M2-9.

---

## Phase 3 — Staff screens + integration (merge point P3)

### Step 3.1 — OfficerQueuePage

`useApplications(statusFilter)`. Status select: "All submitted" (default = every status except DRAFT, filtered client-side), or one status. Table `const QUEUE_COLUMNS` = Application | Customer | Product | Amount (`Money`) | Status (`StatusBadge`) | Updated | Actions. Row actions: "Run AI pre-screen" (only when SUBMITTED) → `useRunWorkflow(id).mutate({ demoPermissionViolation })` → on success navigate to `/analyst/review/:id`; "Open review" link for every row. Above the table a checkbox **"Demo: show permission refusal"** (unchecked by default, `text-xs`, with help text "Makes the orchestrator attempt one forbidden tool call so the refusal is logged") — when checked, the run request carries `?demoPermissionViolation=true`. 409 → `ErrorAlert` ("Application is not in a runnable status"). Empty: "No submitted applications."
**Commit**: `M3-6: officer queue with AI pre-screen run`

### Step 3.2 — AnalystReviewPage

Loads `useApplication(id)`, `useDocuments(id)`, `useRecommendation(id)`, `useAuditTrail(rec?.auditTrailId)`.
- Header: application summary (customer, product, `Money` amount, tenure, `estimatedEmi`), `StatusBadge`, uploaded documents list, `StatusTimeline`.
- No recommendation yet → EmptyState "No AI pre-screen yet." + "Run AI pre-screen" (when SUBMITTED; same demo checkbox).
- `AgentChecksTable` (props `rec`): recommendation as large pill (REQUEST_ADDITIONAL_DOCUMENTS warn, RECOMMEND_APPROVE success, RECOMMEND_REJECT danger, REFER_TO_HUMAN info), `riskBand` chip, `missingDocuments` bullets, `customerMessage` in a quote block "Drafted customer message", then table Agent | Result | Detail with `const RESULT_STYLE` (PASS success, FAIL danger, INCOMPLETE warn, EXCEPTION danger + alert icon + `font-semibold`). Each row has the `AiTag`.
- `requiresHumanApproval` → banner with lock icon: "Human decision required — the AI only recommends. The final decision is yours." (role `status`).
- `AuditTrailViewer` (props `trail`): events sorted by `sequence`: `# | Time | Agent | Event | Tool | Duration`; `const EVENT_STYLE` (TOOL_CALL/TOOL_RESULT info, LLM_CALL/LLM_RESULT neutral, PERMISSION_DENIED row `bg-danger-soft` + danger badge, HUMAN_REQUIRED `bg-accent-soft`, POLICY_DRAFTED/POLICY_PUBLISHED/POLICY_RETIRED neutral); each row has `<details>` with `input`/`output` pretty JSON in `<pre class="text-xs">` (render masked values as-is). Filter chips per eventType + toggle "Show PERMISSION_DENIED only". Empty: "No events recorded."
- `DecisionForm` (props `applicationId, onDecided`) — **CREDIT_ANALYST only** (LOAN_OFFICER sees "Only a Credit Analyst can record the decision."); enabled only when status is UNDER_REVIEW (else note why). Radio Approve / Reject, textarea "Reason (required, at least 10 characters)" with `const MIN_REASON = 10` (matches openapi `minLength: 10`), buttons "Approve" (primary) or "Reject" (danger) per choice → `useDecision` → timeline refreshes; 403/409/400 → `ErrorAlert`. Layout: stacked at 375, two columns at 768, checks + trail side by side with the decision panel `xl:sticky xl:top-20` at 1280.

**Acceptance (mocks)**: as officer, Run on LA-2026-00418 → review shows REQUEST_ADDITIONAL_DOCUMENTS, MEDIUM, 3 checks, "Address proof", the customer message and the human-decision banner; trail has 14 events. With the demo checkbox → ComplianceAgent EXCEPTION and a red PERMISSION_DENIED row. As analyst on an UNDER_REVIEW app: Approve with a 10+ char reason → status APPROVED in the timeline.
**Commit**: `M3-13: analyst review with agent checks, audit trail and human decision`

### Step 3.3 — KnowledgePage (read-only "Policies in force" for staff)

The old staff upload form is **gone**: only POLICY_ADMIN changes policies (step 3.4). `KnowledgePage` (`useKnowledgeDocuments`, LOAN_OFFICER / CREDIT_ANALYST): `<h1>` "Policies in force" + note "Managed by the Policy Admin. These are the versions the policy assistant serves today." `KnowledgeTable` (props `docs: KnowledgeDocument[]`): `const KNOWLEDGE_COLUMNS` = Title | Policy key (`documentKey`) | Version | Effective (`formatDate`) | Loan type | Type (readable `KnowledgeDocumentType` label) | Audience | Segment | Chunks — sorted by title. No upload, publish or retire control. Empty: "No policies in force." Table scrolls inside its card.
**Commit**: `M2-5: read-only list of policies in force for staff`

### Step 3.4 — Policy admin console (POLICY_ADMIN)

Implements Integration_Contracts.md §8a. The browser never decides what is in force: it renders `servingState` and `PolicyLibraryItem` from the API. The only client-side date logic is the dialog wording (`effectiveDate > todayIso()`, string compare of ISO dates); add `todayIso()` (local `YYYY-MM-DD`) to `lib/formatDate.ts`.

Shared: success toast = page-level `role="status" aria-live="polite"` pill `bg-success-soft text-success text-sm rounded-full px-3 py-1`, fixed top-right, auto-hides after 4 s (no toast library). Errors render the envelope via `ErrorAlert` (inside the dialog when the dialog made the call). Readable labels for `KnowledgeDocumentType` live in one `const DOCUMENT_TYPE_LABEL` in `PolicyLibraryTable.tsx`, imported by the other policy-admin components and `KnowledgeTable`.

`ServingStateBadge` (props `state: PolicyVersion['servingState']`): `const SERVING_STYLE` = ACTIVE `bg-success-soft text-success` "Active"; SCHEDULED `bg-warn-soft text-warn` "Scheduled"; DRAFT `bg-n200 text-n700` "Draft"; SUPERSEDED `bg-surface-2 text-muted` "Superseded"; RETIRED `bg-danger-soft text-danger line-through` "Retired". Pill `rounded-full text-xs font-semibold px-2`; always shows the word.

`PolicyLibraryPage` (`usePolicyLibrary`): `<h1>` "Policy library" + primary Button "New policy" → `/admin/policies/new`. `PolicyLibraryTable` (props `items: PolicyLibraryItem[]`): `const LIBRARY_COLUMNS` = Policy (title as link → `/admin/policies/:documentKey`, `documentKey` below in `text-xs text-muted`) | Type | Audience (`Badge`: CUSTOMER info "Customer", INTERNAL neutral "Internal") | Active (`ServingStateBadge` ACTIVE + `v<activeVersion>` + `formatDate(activeEffectiveDate)`; null → "None in force" `text-danger`) | Scheduled (`ServingStateBadge` SCHEDULED + version + date; null → "—") | Drafts (`draftCount`; > 0 → neutral badge) | Versions (`totalVersions`) | Actions ("Upload new version" secondary `sm` → `/admin/policies/new?documentKey=<key>`). Table inside `overflow-x-auto`. States: skeleton rows; empty EmptyState "No policies yet. Upload the first one." + "New policy"; `ErrorAlert`.

`PolicyUploadPage` (`usePolicyLibrary` for existing keys, `useUploadPolicyDraft`): `<h1>` "Upload policy version". `PolicyUploadForm` (props `library: PolicyLibraryItem[], defaultDocumentKey?: string, onCreated(v: PolicyVersion)`), `?documentKey=` → `defaultDocumentKey`. Fields (all `Field` + label, required unless noted):
- Policy key — `<input list="policy-keys">` + `<datalist>` of existing `documentKey`s (pick existing or type a new one). `const DOCUMENT_KEY_PATTERN = /^[A-Z0-9]+(-[A-Z0-9]+)*$/`; error "Use UPPERCASE letters, digits and single hyphens, e.g. VEHICLE-TNC". Existing key → prefill Title, Document type, Audience from the library row (still editable) + hint "Adds a new version to <title> (active v<activeVersion>)"; new key → hint "Creates a new policy".
- Title; Version (placeholder `2026.4`); Effective date (`type="date"`, hint "A future date publishes as SCHEDULED: it starts serving automatically on that date."); Loan type (`PERSONAL|HOME|VEHICLE|EDUCATION|ALL`); Document type (8 values, readable labels); Audience (`CUSTOMER|INTERNAL`); Customer segment (optional, default ALL).
- Change note — textarea "What changed (shown in version history)", `const MIN_CHANGE_NOTE = 5` (openapi `minLength: 5`).
- File — dropzone styled like `FileDropzone` (`border-dashed border-n300 hover:bg-primary-soft`) with a labelled file input, `const ACCEPT = '.pdf,.md,.csv,.json'`, `const MAX_BYTES = 5 * 1024 * 1024` (client check; server re-validates); shows fileName + size.
- Submit "Upload as draft" → `useUploadPolicyDraft` → `onCreated` → toast "Draft v<version> created. Preview and test it before publishing." → navigate to `/admin/policies/<documentKey>?version=<documentId>`. 400 `details[]` → field errors; 409 → `ErrorAlert` (version already exists).

`PolicyDetailPage` (`usePolicyVersions(documentKey)`): header = title + `documentKey` + secondary "Upload new version" → `/admin/policies/new?documentKey=<key>`. Two columns at `md` (timeline `md:w-1/3`, selected version right), stacked at 375. Selected version = `?version=<documentId>` search param, default the newest DRAFT, else ACTIVE, else the first row. Unknown key (404) → "Policy not found".
- `PolicyVersionTimeline` (props `versions: PolicyVersion[], selectedId: string, onSelect(documentId)`): `<ol>` in API order (newest first); each item is a button (`aria-current="true"` + `bg-primary-soft` when selected, `focus-ring`) showing `v<version>` (RETIRED → `line-through text-muted`), `ServingStateBadge`, "Effective <formatDate>", "Uploaded by <createdBy> · <formatDateTime(ingestedAt)>", "Published by <publishedBy> · <formatDateTime(publishedAt)>" when set, "Retired <formatDateTime(retiredAt)>: <retiredReason>" when set, and `changeNote` in `text-sm`.
- Selected version panel: `v<version>` + `ServingStateBadge` + actions: **"Publish"** (primary) only when `status === 'DRAFT'`; **"Retire"** (secondary) only when `status === 'PUBLISHED'`; RETIRED → note "Retired versions stay for audit and cannot be republished. Upload a new version instead." Below: `PolicyPreview` then `TestAskPanel`.
- `PolicyPreview` (props `documentId: string`, `usePolicyPreview`): heading "Preview — N sections, as chunked for the assistant"; each `PolicyPreviewSection` is a `<details>` (first one open) with `<summary>` = `section` and `content` in `whitespace-pre-wrap text-sm`. Skeleton / empty "No sections were extracted from this file." / `ErrorAlert`.
- `TestAskPanel` (props `version: PolicyVersion`, `useTestAsk(version.documentId)`): label "Test question", input + "Ask this version" button, suggestion chip = brief question 3 (`Can I foreclose my vehicle loan after six months, and are there any charges?`). Helper text "Searches only v<version> (<servingState>). Customers do not see this answer." Result renders the `PolicyAnswer` like PolicyPage: `AiTag`, `answer`, `ConfidenceBadge`, one `SourceChip` per source, `followUpRequired` notice. Result clears when the selected version changes. Works on DRAFT.
- `PublishDialog` (props `version: PolicyVersion, versions: PolicyVersion[], open, onClose, onPublished(v: PolicyVersion)`): native `<dialog>` opened with `showModal()` (focus trap, Esc closes), `rounded-lg shadow-pop`. Title "Publish v<version>?". Body: `effectiveDate > todayIso()` → "v<version> will be SCHEDULED. It starts serving automatically on <formatDate>. v<active> stays active until then."; else → "v<version> becomes ACTIVE now (effective <formatDate>) and replaces v<active> in the policy assistant." (no ACTIVE row → "…and becomes the first version in force."). Always: "Published versions cannot be edited; a change is a new version." Buttons Cancel / primary "Publish v<version>" → `usePublishPolicy` → close + toast "v<version> published — now <servingState from the response>".
- `RetireDialog` (props `version: PolicyVersion, versions: PolicyVersion[], open, onClose, onRetired(v: PolicyVersion)`): same `<dialog>`. Textarea "Reason (required, at least 5 characters)", `const MIN_RETIRE_REASON = 5` (openapi `minLength: 5`); confirm disabled until trimmed length ≥ 5. Consequence line: retiring the ACTIVE version → "v<prev> becomes active again." where prev = the SUPERSEDED row with the highest `effectiveDate` (none → "No version of this policy will be in force; the assistant stops citing it."); retiring SCHEDULED → "It will not start serving. v<active> stays active."; retiring SUPERSEDED → "The active version does not change." Buttons Cancel / danger "Retire v<version>" (the only danger button besides Reject) → `useRetirePolicy` → close + toast "v<version> retired". 400/409 → `ErrorAlert` in the dialog.

`src/test/setup.ts`: jsdom lacks `<dialog>` methods — add `HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.open = true; }; HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.open = false; };`.

`pages/PolicyDetailPage.test.tsx` (QueryClientProvider `retry: false`, `AuthContext.Provider` for `admin.rao`, `MemoryRouter` + `Routes` with `/admin/policies/:documentKey`):
1. At `/admin/policies/VEHICLE-TNC?version=KB-001` (ACTIVE v2026.3): "Retire" button present, no "Publish" button.
2. `server.use(http.get(\`${API_BASE}/api/admin/policies/:documentKey/versions\`, …))` returning the two VEHICLE-TNC fixture rows (with `servingState` ACTIVE / SUPERSEDED) plus a DRAFT v2026.4 (`documentId: 'KB-101'`); at `?version=KB-101`: "Publish" present, no "Retire".
3. At `?version=KB-001`, click "Retire" → the dialog's "Retire v2026.3" button is disabled; type `abc` → still disabled; type `Wrong foreclosure terms` → enabled; override retire with `server.use(http.post(…/retire, async ({ request }) => { captured = await request.json(); … }))`, click → `await waitFor(() => expect(captured?.reason).toBe('Wrong foreclosure terms'))`.

**Acceptance (mocks, no page reload — mock state is in memory)**: log in `admin.rao` → lands on `/admin/policies`; VEHICLE-TNC row shows Active v2026.3 · 01 Jul 2026, 2 versions → "Upload new version" → key prefilled `VEHICLE-TNC`; version `2026.4`, effective date = today, change note "Foreclosure lock-in reduced from 6 to 3 EMIs", any `.md` file → detail page, v2026.4 DRAFT selected → Preview shows "after 3 EMIs" → Test ask question 3 → "after 3 EMIs, with a 1% charge", chip `v2026.4` → Publish (dialog says "becomes ACTIVE now … replaces v2026.3") → timeline: v2026.4 Active, v2026.3 Superseded, v2025.1 Superseded. Log out, `priya.sharma` → `/policy` question 3 → "after 3 EMIs … 1%" with chip `v2026.4 · effective <today>`. Back as `admin.rao` → Retire v2026.4 (dialog says "v2026.3 becomes active again"), reason "Wrong lock-in period" → v2026.4 Retired (struck through), v2026.3 Active. `priya.sharma` asks again → "after 6 EMIs … 2%" with chip `v2026.3 · effective 01 Jul 2026`. `npx vitest run src/pages` → pass.
**Commit**: `M2-1: policy admin console with draft, preview, test-ask, publish and retire`

### Step 3.5 — Responsive + accessibility pass

At 375 / 768 / 1280 check every page against Design.md §7: catalogue 1/2/3 columns; CompareTable, PolicyLibraryTable and KnowledgeTable scroll inside their card; PolicyDetailPage timeline stacks above the version panel at 375; CompareTable horizontal scroll with sticky first column; EmiTable hides Opening balance at 375; chat full height at 375, 640 px at 768, 720 px at 1280; stepper compact at 375; nav hamburger at 375; **no horizontal page scroll anywhere** (tables scroll inside their card). A11y (Design.md §8): every input labelled; `focus-ring` on every interactive element; skip link works; chat logs `aria-live="polite"`; stepper and timeline use `aria-current="step"`; Tab reaches every control; `prefers-reduced-motion` disables pulse/typing animation (`motion-safe:`). Colour is never the only signal (badges carry words).
**Commit**: `M1-9: responsive and accessibility pass`

### Step 3.6 — Switch mocks off, run the brief scenarios and the policy-versioning demo end to end

With S1 + S2 merged on `main` and the backend running (`docs/SETUP.md`), set `VITE_USE_MOCKS=false` in your local `.env`, restart `npm run dev`, confirm the MOCK DATA badge is gone.

1. **Advisor scenario (Module 1)**: log in as `priya.sharma` → Advisor → send the brief's used-car query → card VL-204, 11.0 %, 60 months, ₹10,871, LIKELY_ELIGIBLE, disclaimer.
2. **Application scenario (Module 3)**: (`npm run seed` in backend first) log in as `officer.kumar` → Queue → LA-2026-00418 → Run AI pre-screen → REQUEST_ADDITIONAL_DOCUMENTS, missing "Address proof", requiresHumanApproval banner, audit trail visible; re-seed, tick "Demo: show permission refusal", run again → PERMISSION_DENIED row. Log in as `analyst.mehta` → review page → Approve/Reject with a reason → timeline updates. Priya's status page shows the customer message.
3. Policy: ask all 5 brief questions; each shows sources with version and effective date.
4. **Policy versioning (judge feedback)**: (`npm run ingest` in backend first) log in as `admin.rao` → Policy library → VEHICLE-TNC → "Upload new version" → v`2026.4`, effective today, change note, a vehicle T&C v2026.4 file whose foreclosure section says 3 EMIs / 1% (ask S2 for it; S2 owns `db/knowledge/`) → DRAFT → Preview → Test ask question 3 → answer cites v2026.4 → Publish → v2026.4 Active, v2026.3 Superseded. Log in as `priya.sharma` → Policy assistant question 3 → answer + chip cite `v2026.4`. Back as `admin.rao` → Retire v2026.4 with a reason → v2026.3 Active. Priya asks again → chip `v2026.3 · effective 01 Jul 2026`.

Any field/status mismatch: fix your side if the API matches `openapi.yaml`; otherwise post the exact request/response to S1 or S2 in chat.
**Commit**: `D-4: end-to-end against real API with mocks off`

### Step 3.7 — Fill `Component_Change_Manual.md`

For every section and every cheatsheet row: confirm the path exists, replace `TODO(after S3 phase N)` with nothing, and replace every `(line TODO)` with the real line number from `grep -n "<anchor>" <file>` (e.g. `grep -n "\-\-color-primary:" frontend/src/styles/tokens.css`). Then perform each of the 10 cheatsheet edits once with `npm run dev` running, confirm the visible change, and revert with `git checkout -- <file>`.
**Commit**: `D-4: component change manual with real paths and line numbers`

### Phase 3 PR checklist
- [ ] Both brief scenarios and the policy-versioning demo (step 3.6 item 4) pass with `VITE_USE_MOCKS=false`; screenshots in the PR.
- [ ] `npm test` (formatInr, RoleGuard ×5, ApplicationWizard, PolicyDetailPage), `npm run build` green; money grep empty outside `src/mocks/`.
- [ ] Component_Change_Manual has no `TODO` left (sections 0–14); all 10 cheatsheet rows re-tested.
- [ ] PR: `S3 phase 3: staff screens, policy admin, integration, change manual` with REQ IDs M1-8, M1-9, M2-1, M2-5, M3-10, M3-12, M3-13, D-4.

---

## Rules for every page (reference)

- **Data**: only through the hooks in `src/api/hooks/`. Never `fetch` in a component.
- **States**: loading = `Skeleton` matching the layout (spinner only inside buttons); empty = `EmptyState` with one action; error = `ErrorAlert` with the envelope's `message` and `code`; forms map `details[]` to field errors; 401 → login; 403 → message or `/forbidden`.
- **Numbers**: rupees only via `Money`; rates via `formatPercent`; dates via `formatDate`/`formatDateTime`. No arithmetic on money.
- **Responsive**: test 375 / 768 / 1280; gutters 16 / 24 / 32 px; no fixed heights on content.
- **A11y**: `<label htmlFor>` on every input, `focus-ring`, keyboard-only usable, `aria-live="polite"` on chats and save notices.

---

## Before you open the PR

- [ ] Every type in `src/api/types.ts` still matches `openapi.yaml` field for field (re-diff after pulling `main`).
- [ ] Every acceptance step of this phase was run; outputs/screenshots in the PR body.
- [ ] `npm test` and `npm run build` pass; no `any`, no `@ts-ignore`, no `tailwind.config.*`.
- [ ] No money arithmetic outside `src/mocks/` (grep is empty); every rupee renders through `Money`.
- [ ] Every page has loading, empty and error states; checked at 375 / 768 / 1280; no horizontal page scroll.
- [ ] Every input has a label; Tab order works; focus ring visible.
- [ ] MOCK DATA badge appears only with `VITE_USE_MOCKS=true`.
- [ ] `Design.md` / `Component_Change_Manual.md` updated for anything renamed or moved.
- [ ] `git diff --stat main` shows only `frontend/**`, `Design.md`, `Component_Change_Manual.md`; `.env` not staged.
- [ ] Commits are `<REQ-ID>: <summary>`; `git pull --rebase origin main` done right before pushing.
