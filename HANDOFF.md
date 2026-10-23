# S3 Frontend Handoff

## 1. What is Finished and Working

### Foundation & Infrastructure
- **Vite + React 19 + TypeScript + Tailwind CSS v4**: Scaffolded with `@tailwindcss/vite` and CSS token definitions in `frontend/src/styles/tokens.css` (supporting light/dark theme).
- **API Typing & Client**:
  - `frontend/src/api/types.ts` mirrors the schemas and enums from `openapi.yaml`.
  - `frontend/src/api/client.ts` implements the unified HTTP client with `ApiError` envelope parsing and bearer auth injection.
- **MSW Mock Service Worker**:
  - `frontend/src/mocks/` (`fixtures.ts`, `handlers.ts`, `browser.ts`, `server.ts`) implements in-memory mocks for all required API endpoints.
  - Browser worker integration initialized via `frontend/public/mockServiceWorker.js`.
- **Formatting Utilities**:
  - Currency and percentage formatting in `frontend/src/lib/formatInr.ts` (tested in `frontend/src/lib/formatInr.test.ts`).
  - Date/time formatting in `frontend/src/lib/formatDate.ts`.
- **Core UI Components**:
  - Standard primitives in `frontend/src/components/ui/` (`Button`, `Card`, `Badge`, `Money`, `Field`, `EmptyState`, `ErrorAlert`, `Skeleton`, `AiTag`, `RoleBadge`, `MockBadge`).

### Authentication & Routing
- `frontend/src/auth/AuthContext.tsx` handles authentication state, local storage persistence, and role switching.
- `frontend/src/routes/RoleGuard.tsx` enforces role-based access control (tested in `frontend/src/routes/RoleGuard.test.tsx`).
- `frontend/src/routes/router.tsx` defines the client route tree for all user personas.
- `frontend/src/pages/LoginPage.tsx` supports credentialed login and one-click quick switch across all four roles:
  - `CUSTOMER` (`ananya`)
  - `LOAN_OFFICER` (`vikram`)
  - `CREDIT_ANALYST` (`priya`)
  - `POLICY_ADMIN` (`aditi`)

### Customer Portal
- **Product Discovery & Comparison**:
  - `frontend/src/pages/CataloguePage.tsx` with filtering by category and amount range.
  - `frontend/src/pages/ProductDetailPage.tsx` showing product specifications and embedded EMI calculator.
  - `frontend/src/pages/ComparePage.tsx` with comparative attribute tables.
  - `frontend/src/pages/EmiPage.tsx` with repayment schedule breakdown.
- **AI Loan Advisor**:
  - `frontend/src/pages/AdvisorPage.tsx` with interactive chat panel, recommendation cards, confidence badges, and source citations.
- **Customer Policy Query**:
  - `frontend/src/pages/PolicyPage.tsx` providing conversational Q&A against active policy guidelines.
- **Profile Management**:
  - `frontend/src/pages/ProfilePage.tsx` viewing and updating profile attributes.
- **Loan Application Wizard**:
  - `frontend/src/pages/ApplicationWizardPage.tsx` multi-step application workflow (Product Selection, Employment & Income, Document Upload, Review & Submit) with draft auto-save and resumption (tested in `frontend/src/pages/ApplicationWizard.test.tsx`).
- **Application Tracking**:
  - `frontend/src/pages/MyApplicationsPage.tsx` list of customer applications.
  - `frontend/src/pages/StatusTrackerPage.tsx` with status progression timeline.

### Staff Consoles
- **Loan Officer Queue**:
  - `frontend/src/pages/OfficerQueuePage.tsx` with queue filtering and SLA indicators.
- **Credit Analyst Review**:
  - `frontend/src/pages/AnalystReviewPage.tsx` with automated checks breakdown (`AgentChecksTable`), audit log inspection (`AuditTrailViewer`), and human-in-the-loop decisioning (`DecisionForm`).
- **Staff Knowledge Base**:
  - `frontend/src/pages/KnowledgePage.tsx` displaying active policies in force.
- **Policy Admin Console**:
  - `frontend/src/pages/PolicyLibraryPage.tsx` with policy listings and version history.
  - `frontend/src/pages/PolicyDetailPage.tsx` featuring version timeline, markdown preview, test query panel, and publish/retire modal dialogs (tested in `frontend/src/pages/PolicyDetailPage.test.tsx`).
  - `frontend/src/pages/PolicyUploadPage.tsx` for drafting new policy versions.

### Unit & Component Tests
- Vitest test suite currently passes all 4 test files (12 tests passed):
  - `src/lib/formatInr.test.ts`
  - `src/routes/RoleGuard.test.tsx`
  - `src/pages/ApplicationWizard.test.tsx`
  - `src/pages/PolicyDetailPage.test.tsx`

---

## 2. What is Half-Done or Broken

### TypeScript Build Failure
- **File**: `frontend/src/components/emi/EmiTable.tsx`
- **Location**: Line 58, Column 37
- **Exact Error**:
  ```
  src/components/emi/EmiTable.tsx:58:37 - error TS6133: 'i' is declared but its value is never read.

  58     const rows = schedule.map((row, i) =>
                                         ~

  Found 1 error.
  ```
  *(Per handoff instructions, this was recorded as-is without fixing).*

### Live Backend Integration
- The frontend has only been run and verified against MSW mock endpoints; full integration against real Spring Boot (S1) and FastAPI AI agent (S2) backends is not yet validated.

---

## 3. What is Not Started (from S3 Spec: `docs/prompts/S3_frontend.md` / `prompts/S3_frontend.md`)

- **Step 3.6 — Real Backend Integration & Live Scenario Testing**:
  - Toggling `VITE_USE_MOCKS=false` against the merged backend services.
  - Running end-to-end verification of the 3 brief scenarios (Salaried, Self-Employed, Low Credit) and the policy versioning workflow against the live backend.
- **Step 3.7 — Judge Live-Change Verification Walkthrough**:
  - Verification of live component changes documented in `Component_Change_Manual.md`.
- **Comprehensive Accessibility / Screen-Reader Audits**:
  - Automated Axe / Lighthouse audit passes on the production bundle.
- **End-to-End Browser Automation**:
  - Playwright / Cypress integration tests.

---

## 4. How to Run the Frontend and Mock Status

### How to Run
From the repository root:
```bash
cd frontend
npm install
npm run dev
```
The development server starts at `http://localhost:5173/`.

To run the unit and component tests:
```bash
cd frontend
npm test
```

### Mock State
- **Currently Uses Mocks**: **YES** (MSW is active).
- Configuration: Set in repo-root `.env`:
  ```env
  VITE_USE_MOCKS=true
  VITE_API_BASE_URL=http://localhost:8080
  ```
- Visual indicator: A visible amber badge (`MOCK DATA`) is rendered in the top application navigation bar when mocks are active.
- To switch to real backend: Update `.env` to `VITE_USE_MOCKS=false`.

---

## 5. Result of `npm run build`

Command executed:
```bash
npm run build
```
(in directory `frontend/`)

Exit Code: `2`

Output:
```
> frontend@0.0.0 build
> tsc -b && vite build

src/components/emi/EmiTable.tsx:58:37 - error TS6133: 'i' is declared but its value is never read.

58     const rows = schedule.map((row, i) =>
                                       ~


Found 1 error.
```
