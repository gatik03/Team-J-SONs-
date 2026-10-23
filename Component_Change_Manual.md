# Component change manual — LoanLens AI

Use these current paths to make focused live-demo changes. Frontend paths are relative to `frontend/`; backend paths are relative to `backend/`. Vite hot reloads frontend changes while `npm run dev` is running.

## Global design and app shell

| Change | Source | What to edit |
|---|---|---|
| Colors, typography, radii, shadows, dark theme | `src/styles/tokens.css` | Edit the CSS custom properties in `@theme` and `:root[data-theme="dark"]`. `Design.md` documents the normative palette and type scale. |
| Layout, navigation, responsive behavior, page-specific styling | `src/styles/app.css` | Current app styling is custom CSS here; this is the source for `.sidebar`, `.workspace`, `.mobile-menu`, page layouts, and breakpoints. |
| Role-aware shell, mobile drawer, theme toggle, sign-out | `src/layouts/AppLayout.tsx` | Sidebar navigation lists, drawer open/close behavior, topbar actions, workspace footer. Nav items are currently defined in this file. |
| Route tree and role access | `src/routes/router.tsx`, `src/routes/RoleGuard.tsx` | Change route elements or allowed roles in the nested route groups. Backend authorization remains authoritative. |
| Auth state and login | `src/auth/AuthContext.tsx`, `src/pages/LoginPage.tsx` | Auth persistence/session actions and login screen respectively. |
| API base URL and mock switch | repository root `.env`, `src/api/client.ts` | `VITE_API_BASE_URL`, `VITE_USE_MOCKS`; mocks are under `src/mocks/`. Current live setup uses mocks off and API port 8080. |

## Feature entry points

| Screen / behavior | Page | Main components / API hooks |
|---|---|---|
| Product discovery and filters | `src/pages/CataloguePage.tsx` | `src/components/products/CatalogueFilters.tsx`, `ProductCard.tsx`; `src/api/hooks/products.ts` |
| Product detail and EMI | `src/pages/ProductDetailPage.tsx`, `src/pages/EmiPage.tsx` | `src/components/emi/EmiCalculator.tsx`, `EmiTable.tsx`; `src/api/hooks/emi.ts` |
| Product comparison | `src/pages/ComparePage.tsx` | `src/components/products/CompareTable.tsx`; products hooks |
| AI loan advisor | `src/pages/AdvisorPage.tsx` | `src/components/chat/ChatPanel.tsx`, `src/components/advisor/RecommendationCard.tsx`; `src/api/hooks/advisor.ts` |
| Policy Q&A and knowledge | `src/pages/PolicyPage.tsx`, `src/pages/KnowledgePage.tsx` | `src/components/chat/SourceChip.tsx`, `ConfidenceBadge.tsx`, `src/components/knowledge/KnowledgeTable.tsx`; policy/knowledge hooks |
| Application draft, documents, submit | `src/pages/ApplicationWizardPage.tsx` | `src/components/applications/FormStepper.tsx`, `steps/`, `FileDropzone.tsx`; applications/documents hooks |
| Customer applications and status | `src/pages/MyApplicationsPage.tsx`, `src/pages/StatusTrackerPage.tsx` | `src/components/applications/StatusTimeline.tsx`, `StatusBadge.tsx` |
| Officer queue | `src/pages/OfficerQueuePage.tsx` | workflow/application hooks |
| Analyst review, recommendation, audit, decision | `src/pages/AnalystReviewPage.tsx` | `src/components/review/AgentChecksTable.tsx`, `AuditTrailViewer.tsx`, `DecisionForm.tsx`; audit/workflow hooks |
| Admin policy versions | `src/pages/PolicyLibraryPage.tsx`, `PolicyDetailPage.tsx`, `PolicyUploadPage.tsx` | `src/components/policy-admin/`; policy-admin hooks |
| Shared controls | — | `src/components/ui/` (Button, Card, Field, Badge, Money, alerts, loading and role/mock badges) |

## API and backend integration

The browser API client is `frontend/src/api/client.ts`; typed endpoints and feature hooks live in `frontend/src/api/`. Keep backend request/response contracts aligned with `frontend/src/api/types.ts` and the backend route handlers. The Node Express + Prisma API is under `backend/src`; AI integration reaches core services through `backend/src/ai/coreBridge.ts` (real integration), with test stubs under `backend/src/ai/stub/`.

## Quick verification

1. Start the backend and frontend with the repository's configured services and environment.
2. Open `http://localhost:5173` and use the intended role account.
3. Check both desktop and mobile when changing shared layout or navigation. The mobile menu is an off-canvas drawer; selecting a route closes it.
4. Check the browser console and network response for the touched flow. Existing scenario evidence is in `docs/evidence/browser-qa.json` and screenshots in `docs/evidence/`.

Existing focused tests are adjacent to features (for example `src/pages/ApplicationWizard.test.tsx`, `src/pages/PolicyDetailPage.test.tsx`, and `src/routes/RoleGuard.test.tsx`). Use the package scripts in `frontend/package.json` for the current test commands; this manual does not claim new checks were run.
