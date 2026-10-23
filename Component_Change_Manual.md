# Component Change Manual — LoanLens AI frontend

**Purpose**: let a judge (or teammate) change any visible thing in 30–60 seconds during the live demo.

> **STATUS: no frontend code exists yet (2026-10-23).** Every path is the *planned* path from `Team_Work_Split.md` / `Integration_Contracts.md` §1. Every "line" is `TODO`. **S3 must refresh every path, anchor and line number at the end of each phase (1, 2, 3) and re-verify each cheatsheet entry with `npm run dev` before the demo.** Until then, navigate with the `grep -n` command given per component, never by line number.

Conventions used below:
- Repo-relative paths; frontend root is `frontend/`.
- Tokens live in one file: the Tailwind v4 `@theme` block in `frontend/src/styles/tokens.css` (there is no `tailwind.config.*`). Every `--color-*`, `--text-*`, `--radius-*`, `--shadow-*` there becomes a Tailwind class automatically. Change a colour/radius/shadow/font **once** in `tokens.css`; every component picks it up.
- Anchor = a stable string to grep for (component name, prop, or CSS variable). If grep returns nothing, the file was renamed — check `git log --stat -- frontend/src` and update this manual.
- Verify = `cd frontend && npm run dev` (Vite hot-reloads; keep the browser open at the screen named).

---

## 0. Global styling sources

| What | File | Anchor | Notes |
|---|---|---|---|
| Colour tokens (light) | `frontend/src/styles/tokens.css` | `@theme {` → `--color-primary:` | hex values, see `Design.md` §2 |
| Colour tokens (dark) | `frontend/src/styles/tokens.css` | `:root[data-theme="dark"]` | overrides the same variables |
| Font | `frontend/src/main.tsx` (import) + `frontend/src/styles/tokens.css` (`--font-sans:`) | `@fontsource-variable/inter`, `--font-sans` | swap the import and the `--font-sans` value |
| Type scale | `frontend/src/styles/tokens.css` | `--text-h1:` | keys `--text-display, --text-h1, --text-h2, --text-h3, --text-body` |
| Radius / shadow | `frontend/src/styles/tokens.css` | `--radius-md`, `--shadow-card` | |
| Focus ring | `frontend/src/styles/tokens.css` | `@utility focus-ring` | class `focus-ring` on interactive elements |
| INR formatting | `frontend/src/lib/formatInr.ts` | `formatInr` | `TODO(after S3 phase 1)` |
| API base + mocks toggle | repo-root `.env` (Vite `envDir: '..'`) / `frontend/src/api/client.ts` | `VITE_API_BASE_URL`, `VITE_USE_MOCKS` | mocks in `frontend/src/mocks/handlers.ts` |
| Routes | `frontend/src/routes/router.tsx` | `createBrowserRouter` | |

---

## 1. AppLayout / Nav
- **Path**: `frontend/src/layouts/AppLayout.tsx`, nav items `frontend/src/routes/nav.ts` — `TODO(after S3 phase 1)`
- **Purpose**: top bar, role-aware nav links, theme toggle, RoleBadge, `<Outlet/>`.
- **Parent / children**: parent = router root (inside `RoleGuard`); children = nav links from `navByRole`, `RoleBadge`, theme toggle, `MockBadge`, page via `<Outlet/>`.
- **Props**: none (reads auth from `useAuth()`).
- **State**: `theme` (`localStorage` `ll-theme`), `drawerOpen` (mobile).
- **Functions**: `navByRole[role]` (in `routes/nav.ts`) is the link list; `toggleTheme()`.
- **Styling**: `bg-surface border-b border-border`; brand text `text-primary font-semibold`.
- **API**: `GET /api/auth/me` (via `useAuth`).
- **How to change**: nav label → edit the `label:` string in `navByRole`; nav order → reorder array; brand name → `Kestrel Bank` string; layout width → `max-w-[1200px]`; hide side nav → delete the `lg:` block.
- **Navigate**: `grep -n "navByRole" frontend/src/routes/nav.ts`
- **Verify**: `npm run dev` → any page after login; check at 375 (hamburger) and 1280.

## 2. RoleGuard
- **Path**: `frontend/src/routes/RoleGuard.tsx` — `TODO(after S3 phase 1)`; test `frontend/src/routes/RoleGuard.test.tsx`.
- **Purpose**: wraps a route; redirects to `/login` if no token, to `/forbidden` if role not in `allow`.
- **Parent / children**: used inside `routes/router.tsx` route elements; renders `<Outlet/>`.
- **Props**: `allow: Role[]`.
- **State**: none (reads `useAuth()`).
- **Functions**: none exported besides component.
- **Styling**: none.
- **API**: none directly.
- **How to change**: allow another role on a route → edit the `allow={[...]}` array in `routes/router.tsx`; change the forbidden page → `frontend/src/pages/ForbiddenPage.tsx`.
- **Navigate**: `grep -n "allow=" frontend/src/routes/router.tsx`
- **Verify**: log in as `priya.sharma`, visit `/officer/queue` → forbidden page; run `npx vitest run RoleGuard`.

## 3. LoginPage
- **Path**: `frontend/src/pages/LoginPage.tsx` — `TODO(after S3 phase 1)`
- **Purpose**: username/password form → `POST /api/auth/login`, stores token, routes by role.
- **Parent / children**: router; children = `Button`, `Card`, `Field`, `ErrorAlert`.
- **Props**: none.
- **State**: `username`, `password`, mutation state (`useLogin`).
- **Functions**: `onSubmit`, demo-user quick buttons; landing via `roleHome(role)` in `frontend/src/auth/roleHome.ts` (`/products`, `/officer/queue`, `/officer/queue`, `/admin/policies`).
- **Styling**: centred `Card` max-w 400; brand header; demo-users hint list below the form (`text-xs text-muted`).
- **API**: `POST /api/auth/login` (`frontend/src/api/hooks/auth.ts`, `useLogin`).
- **How to change**: remove the demo-users quick buttons → delete the block under the `Demo users` heading; change where a role lands → `roleHome`.
- **Navigate**: `grep -n "roleHome" frontend/src/auth/roleHome.ts` · `grep -n "Demo users" frontend/src/pages/LoginPage.tsx`
- **Verify**: `/login`, log in as each of the 6 seeded users (incl. `admin.rao` → `/admin/policies`).

## 4. CataloguePage
- **Path**: `frontend/src/pages/CataloguePage.tsx` — `TODO(after S3 phase 1)`
- **Purpose**: search, filter (loanType, segment, amount), sort, compare-selection; grid of `ProductCard`.
- **Parent / children**: router; children = `CatalogueFilters`, `ProductCard`, `Button` (Compare N).
- **Props**: none.
- **State**: URL search params (`q, loanType, segment, minAmount, maxAmount, sort`), `selectedIds: string[]` (max 4).
- **Functions**: `useProducts(params)`, `toggleSelect(id)`, `goCompare()` → `/compare?ids=`.
- **Styling**: grid `grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4`.
- **API**: `GET /api/products`.
- **How to change**: columns at desktop → `xl:grid-cols-3`; default sort → the `sort` default in `useSearchParams`; max compare → `MAX_COMPARE` const.
- **Navigate**: `grep -n "MAX_COMPARE\|grid-cols" frontend/src/pages/CataloguePage.tsx`
- **Verify**: `/products`; type "car" in search, change sort, tick 2 cards, click Compare.

## 5. ProductCard
- **Path**: `frontend/src/components/products/ProductCard.tsx` — `TODO(after S3 phase 1)`
- **Purpose**: one product summary + compare checkbox + CTA.
- **Parent / children**: `CataloguePage`; children = `Card`, `Money`, `Button`.
- **Props**: `product: LoanProduct`, `selected: boolean`, `onToggle(id)`, `disableSelect: boolean`.
- **State**: none.
- **Functions**: none.
- **Styling**: `Card`; loan-type pill `bg-surface-2 text-xs`; fact grid `grid-cols-2 gap-2 text-sm`.
- **API**: none (data from parent).
- **How to change**: add a fact (e.g. min credit score) → add a `<Fact label= value=/>` row inside the grid; CTA label → the `Button` children string; card shadow → `--shadow-card` in tokens.
- **Navigate**: `grep -n "ProductCardProps" frontend/src/components/products/ProductCard.tsx`
- **Verify**: `/products`.

## 6. CompareTable
- **Path**: `frontend/src/components/products/CompareTable.tsx`, page `frontend/src/pages/ComparePage.tsx` — `TODO(after S3 phase 1)`
- **Purpose**: side-by-side attributes for 2–4 products; highlights best per row.
- **Parent / children**: `ComparePage`; children = `Money`.
- **Props**: `products: LoanProduct[]`.
- **State**: none.
- **Functions**: `ROWS` array of `{ label, get(product), best?: 'min' | 'max' }`.
- **Styling**: `<table>` with `sticky left-0` first column; best cell `bg-success-soft`.
- **API**: `GET /api/products/compare?ids=` in `ComparePage`.
- **How to change**: add/remove a row → edit `ROWS`; change highlight colour → `bg-success-soft` class; stop highlighting → remove `best` keys.
- **Navigate**: `grep -n "const ROWS" frontend/src/components/products/CompareTable.tsx`
- **Verify**: `/compare?ids=PL-101,VL-204` (ids from seed).

## 7. EmiCalculator + EmiTable
- **Path**: `frontend/src/components/emi/EmiCalculator.tsx`, `frontend/src/components/emi/EmiTable.tsx`; used in `frontend/src/pages/ProductDetailPage.tsx` and `frontend/src/pages/EmiPage.tsx` — `TODO(after S3 phase 1)`
- **Purpose**: inputs → `POST /api/emi/calculate` → hero EMI + amortization table. **No EMI maths in the browser.**
- **Parent / children**: `ProductDetailPage` (prefilled from product) / `EmiPage` (free); children = `Money`, `EmiTable`, `Button` (Download CSV).
- **Props**: `EmiCalculator { defaultPrincipal?, defaultRate?, defaultTenure?, rateBounds?, tenureBounds? }`; `EmiTable { schedule: EmiResult['schedule'] }`.
- **State**: `principal`, `annualRate`, `tenureMonths` (debounced 300ms) → `useEmi(input)` query.
- **Functions**: `toCsv(schedule)` (formatting only), `useEmi` in `frontend/src/api/hooks/emi.ts`.
- **Styling**: hero `text-display font-bold tabular-nums`; table `text-sm tabular-nums`, numeric cells `text-right`.
- **API**: `POST /api/emi/calculate`.
- **How to change**: add a column (e.g. cumulative interest) → add an entry to the `COLUMNS` array in `EmiTable.tsx` (`{ key, label, align, render }`); hide a column on mobile → add `hidden md:table-cell`; debounce → `DEBOUNCE_MS`; hero size → `text-display` → `text-h1`.
- **Navigate**: `grep -n "const COLUMNS" frontend/src/components/emi/EmiTable.tsx` · `grep -n "DEBOUNCE_MS" frontend/src/components/emi/EmiCalculator.tsx`
- **Verify**: `/products/VL-204` → set 5,00,000 / 11.0 / 60 → EMI shows `₹10,871`, 60 rows.

## 8. AdvisorChat
- **Path**: `frontend/src/pages/AdvisorPage.tsx`, `frontend/src/components/chat/ChatPanel.tsx`, `frontend/src/components/advisor/RecommendationCard.tsx` — `TODO(after S3 phase 2)`
- **Purpose**: free-text → `POST /api/advisor/chat` → renders `AdvisorResponse` (extracted chips, recommendation cards, or `clarifyingQuestion`).
- **Parent / children**: `AdvisorPage` → `ChatPanel` → `AdvisorMessage` → `RecommendationCard[]`.
- **Props**: `ChatPanel { messages, onSend, pending, renderAssistant(msg), disclaimer, placeholder }`; `RecommendationCard { rec: AdvisorResponse['recommendations'][number], onApply(productId) }`.
- **State**: `messages: ChatMessage[]`, `conversationId` (from response), mutation `useAdvisorChat`.
- **Functions**: `onSend(text)`, `onApply(productId)` → `/applications/new?productId=`.
- **Styling**: bubbles `bg-primary text-white` (user) / `bg-surface-2` (assistant); eligibility badge colours by `ELIGIBILITY_STYLE` map.
- **API**: `POST /api/advisor/chat` (`frontend/src/api/hooks/advisor.ts`).
- **How to change**: bubble colour → `USER_BUBBLE` / `ASSISTANT_BUBBLE` class consts in `ChatPanel.tsx`; disclaimer text → `disclaimer` prop in `AdvisorPage.tsx`; badge colours → `ELIGIBILITY_STYLE` in `RecommendationCard.tsx`; hide extracted chips → remove `<ExtractedChips/>`.
- **Navigate**: `grep -n "USER_BUBBLE" frontend/src/components/chat/ChatPanel.tsx` · `grep -n "ELIGIBILITY_STYLE" frontend/src/components/advisor/RecommendationCard.tsx`
- **Verify**: `/advisor`, send the brief's used-car query.

## 9. PolicyChat + SourceChip
- **Path**: `frontend/src/pages/PolicyPage.tsx`, `frontend/src/components/chat/SourceChip.tsx`, `frontend/src/components/chat/ConfidenceBadge.tsx` — `TODO(after S3 phase 2)`
- **Purpose**: question (+ optional loanType/segment filters) → `POST /api/policy/ask` → answer + `SourceChip`s + `ConfidenceBadge`; `followUpRequired` renders a hint.
- **Parent / children**: `PolicyPage` → `ChatPanel` → `PolicyMessage` → `SourceChip[]`, `ConfidenceBadge`.
- **Props**: `SourceChip { source: PolicyAnswer['sources'][number] }`; `ConfidenceBadge { level: 'HIGH' | 'MEDIUM' | 'LOW' }`.
- **State**: `messages`, `filters { loanType, customerSegment }`, mutation `usePolicyAsk`.
- **Functions**: `onSend`, `setFilters`.
- **Styling**: chip `bg-accent-soft text-xs rounded-sm`; confidence map `CONFIDENCE_STYLE`.
- **API**: `POST /api/policy/ask` (`frontend/src/api/hooks/policy.ts`).
- **How to change**: chip format (`document · section · vX · effective DD MMM YYYY`) → the template string in `SourceChip.tsx`; confidence colours → `CONFIDENCE_STYLE`; filters off → remove `<PolicyFilters/>`.
- **Navigate**: `grep -n "CONFIDENCE_STYLE" frontend/src/components/chat/ConfidenceBadge.tsx` · `grep -n "SourceChipProps" frontend/src/components/chat/SourceChip.tsx`
- **Verify**: `/policy`, ask the foreclosure question → chip shows `v2026.3 · effective 01 Jul 2026`.

## 10. ApplicationWizard + FormStepper
- **Path**: `frontend/src/pages/ApplicationWizardPage.tsx`, `frontend/src/components/applications/FormStepper.tsx`, steps `frontend/src/components/applications/steps/{StepProduct,StepEmployment,StepDocuments,StepReview}.tsx`, `frontend/src/components/applications/FileDropzone.tsx`; test `frontend/src/pages/ApplicationWizard.test.tsx` — `TODO(after S3 phase 2)`
- **Purpose**: 4-step form with Save draft, uploads, review, Submit.
- **Parent / children**: router → `ApplicationWizardPage` → `FormStepper`, `StepN`, `FileDropzone×3`, `Button`.
- **Props**: `FormStepper { steps: string[], current: number, completed: number[], onJump(i) }`; `FileDropzone { applicationId, documentType, existing?: ApplicationDocument, onUploaded }`.
- **State**: `draft: LoanApplicationDraft`, `applicationId` (created on first Save/Next, then the URL becomes `/applications/:applicationId/edit`), `step` (resumes from `currentStep`), `documents[]`.
- **Functions**: `saveDraft()` (`useCreateDraft` → `POST /api/applications` the first time, then `useSaveDraft` → `PUT /api/applications/{id}` on every step), `next()`, `back()`, `submit()` (`POST .../submit`), `upload(file, type)` (`POST .../documents` multipart).
- **Styling**: stepper `md:flex-row` horizontal, compact progress on mobile; dropzone `border-dashed border-n300 hover:bg-primary-soft`.
- **API**: `/api/applications`, `/api/applications/{id}`, `/submit`, `/documents`.
- **How to change**: step names → `STEPS` array; accept types/size → `ACCEPT`, `MAX_BYTES` in `FileDropzone.tsx`; stepper orientation → the `md:flex-row` class.
- **Navigate**: `grep -n "const STEPS" frontend/src/pages/ApplicationWizardPage.tsx` · `grep -n "MAX_BYTES" frontend/src/components/applications/FileDropzone.tsx`
- **Verify**: `/applications/new?productId=PL-101`; Next → URL becomes `/applications/<id>/edit`; Save draft on step 2, reload, draft restored at step 2; upload identity + income only, submit. Resume demo: `/applications/LA-2026-00420/edit` opens at step 2.

## 11. StatusTimeline
- **Path**: `frontend/src/components/applications/StatusTimeline.tsx`, page `frontend/src/pages/StatusTrackerPage.tsx` — `TODO(after S3 phase 2)`
- **Purpose**: vertical stepper over the 7 statuses with timeline events.
- **Parent / children**: `StatusTrackerPage`, also embedded in `AnalystReviewPage`.
- **Props**: `status: ApplicationStatus`, `timeline: LoanApplication['timeline']`.
- **State**: none.
- **Functions**: `STATUS_ORDER` const; `STATUS_STYLE` map (colour per status); `humanise(status)`.
- **Styling**: reached dots `bg-primary`, current `ring-2 ring-primary animate-pulse`, REJECTED `bg-danger`.
- **API**: `GET /api/applications/{id}`.
- **How to change**: a status colour → `STATUS_STYLE[APPROVED]`; label text → `humanise` map; horizontal layout → swap `flex-col` for `md:flex-row` on the `<ol>`.
- **Navigate**: `grep -n "STATUS_STYLE" frontend/src/components/applications/StatusTimeline.tsx`
- **Verify**: `/applications/LA-2026-00418/status`.

## 12. OfficerQueue
- **Path**: `frontend/src/pages/OfficerQueuePage.tsx` — `TODO(after S3 phase 3)`
- **Purpose**: list all non-draft applications (filter by status), "Run AI pre-screen" per SUBMITTED row, link to review, and the "Demo: show permission refusal" checkbox (adds `?demoPermissionViolation=true` to the run call).
- **Parent / children**: router; children = `StatusBadge`, `Money`, `Button`.
- **Props**: none.
- **State**: `statusFilter`, `demoPermissionViolation` (checkbox, default off), `useApplications(status)`, mutation `useRunWorkflow(applicationId)`.
- **Functions**: `runWorkflow(id)` → `POST /api/workflow/applications/{id}/run`, then navigates to `/analyst/review/:id` (officer sees read-only review).
- **Styling**: table `text-sm`; row hover `bg-surface-2`.
- **API**: `GET /api/applications`, `POST /api/workflow/.../run`.
- **How to change**: columns → `QUEUE_COLUMNS`; default filter → `statusFilter` initial value; button label → `Run AI pre-screen` string; demo checkbox label → `Demo: show permission refusal`.
- **Navigate**: `grep -n "QUEUE_COLUMNS" frontend/src/pages/OfficerQueuePage.tsx`
- **Verify**: login `officer.kumar` → `/officer/queue` → Run AI pre-screen on LA-2026-00418 (re-seed and tick the demo checkbox to see a PERMISSION_DENIED event).

## 13. AnalystReview + AgentChecksTable + AuditTrailViewer
- **Path**: `frontend/src/pages/AnalystReviewPage.tsx`, `frontend/src/components/review/AgentChecksTable.tsx`, `frontend/src/components/review/AuditTrailViewer.tsx`, `frontend/src/components/review/DecisionForm.tsx` — `TODO(after S3 phase 3)`
- **Purpose**: show `AgentRecommendation`, the audit trail, and the human decision form (CREDIT_ANALYST only; hidden for officer).
- **Parent / children**: router → `AnalystReviewPage` → `AgentChecksTable`, `AuditTrailViewer`, `StatusTimeline`, `DecisionForm`.
- **Props**: `AgentChecksTable { rec: AgentRecommendation }`; `AuditTrailViewer { trail: AuditTrail }`; `DecisionForm { applicationId, onDecided }`.
- **State**: `useRecommendation(id)`, `useAuditTrail(auditTrailId)`, `eventTypeFilter`, decision form `{decision, reason}` (reason min 10 chars).
- **Functions**: `RESULT_STYLE` (PASS/FAIL/INCOMPLETE/EXCEPTION), `EVENT_STYLE` (eventType → classes), `decide()` → `POST /api/applications/{id}/decision`.
- **Styling**: `PERMISSION_DENIED` rows `bg-danger-soft`; EXCEPTION badge `font-semibold`; decision panel `xl:sticky xl:top-20`.
- **API**: `GET /api/workflow/applications/{id}/recommendation`, `GET /api/audit/{auditTrailId}`, `POST /api/applications/{id}/decision`.
- **How to change**: check colours → `RESULT_STYLE`; event colours → `EVENT_STYLE`; hide input/output JSON → remove the `<details>` block; min reason length → `MIN_REASON` (keep in sync with `openapi.yaml` `minLength: 10`).
- **Navigate**: `grep -n "RESULT_STYLE" frontend/src/components/review/AgentChecksTable.tsx` · `grep -n "EVENT_STYLE" frontend/src/components/review/AuditTrailViewer.tsx` · `grep -n "MIN_REASON" frontend/src/components/review/DecisionForm.tsx`
- **Verify**: login `analyst.mehta` → `/analyst/review/LA-2026-00418`; toggle "PERMISSION_DENIED only"; approve with a reason → timeline updates.

## 14. Policy admin console (POLICY_ADMIN)
- **Path**: pages `frontend/src/pages/PolicyLibraryPage.tsx`, `frontend/src/pages/PolicyUploadPage.tsx`, `frontend/src/pages/PolicyDetailPage.tsx` (test `frontend/src/pages/PolicyDetailPage.test.tsx`); components `frontend/src/components/policy-admin/{PolicyLibraryTable,PolicyVersionTimeline,ServingStateBadge,PolicyUploadForm,PolicyPreview,TestAskPanel,PublishDialog,RetireDialog}.tsx`; hooks `frontend/src/api/hooks/policyAdmin.ts` — `TODO(after S3 phase 3)`
- **Purpose**: the bank official's policy library: upload a new version as DRAFT, preview its chunks, test-ask it, publish (ACTIVE now or SCHEDULED for a future effective date) and retire (rollback to the previous version). Rules: `Integration_Contracts.md` §8a.
- **Parent / children**: router (`<RoleGuard allow={['POLICY_ADMIN']} />`) → `PolicyLibraryPage` → `PolicyLibraryTable` → `ServingStateBadge`; `PolicyUploadPage` → `PolicyUploadForm`; `PolicyDetailPage` → `PolicyVersionTimeline`, `PolicyPreview`, `TestAskPanel` (→ `SourceChip`, `ConfidenceBadge`), `PublishDialog`, `RetireDialog`.
- **Props**: `PolicyLibraryTable { items: PolicyLibraryItem[] }`; `ServingStateBadge { state: PolicyVersion['servingState'] }`; `PolicyUploadForm { library, defaultDocumentKey?, onCreated(v) }`; `PolicyVersionTimeline { versions, selectedId, onSelect(documentId) }`; `PolicyPreview { documentId }`; `TestAskPanel { version }`; `PublishDialog { version, versions, open, onClose, onPublished(v) }`; `RetireDialog { version, versions, open, onClose, onRetired(v) }`.
- **State**: selected version = `?version=<documentId>` search param; dialog `open` flags; reason text; toast message.
- **Functions**: `SERVING_STYLE` (servingState → classes), `LIBRARY_COLUMNS`, `DOCUMENT_TYPE_LABEL`, `DOCUMENT_KEY_PATTERN`, `MIN_CHANGE_NOTE`, `MIN_RETIRE_REASON`, `ACCEPT` / `MAX_BYTES` (upload), `todayIso()` in `frontend/src/lib/formatDate.ts` (dialog wording only).
- **Styling**: ACTIVE `bg-success-soft text-success`, SCHEDULED `bg-warn-soft text-warn`, DRAFT `bg-n200 text-n700`, SUPERSEDED `bg-surface-2 text-muted`, RETIRED `bg-danger-soft text-danger line-through`; dialogs native `<dialog>` `rounded-lg shadow-pop`.
- **API**: `GET/POST /api/admin/policies`, `GET /api/admin/policies/{documentKey}/versions`, `GET .../versions/{documentId}/preview`, `POST .../test-ask`, `POST .../publish`, `POST .../retire`; mocks in `frontend/src/mocks/handlers.ts` (`servingState`, `foreclosureAnswer`).
- **How to change**: badge colour → `SERVING_STYLE`; library columns → `LIBRARY_COLUMNS`; key format → `DOCUMENT_KEY_PATTERN` (keep in sync with the backend); reason length → `MIN_RETIRE_REASON` (keep in sync with `openapi.yaml` `minLength: 5`); accepted files → `ACCEPT` / `MAX_BYTES` in `PolicyUploadForm.tsx`; dialog wording → the strings in `PublishDialog.tsx` / `RetireDialog.tsx`.
- **Navigate**: `grep -n "SERVING_STYLE" frontend/src/components/policy-admin/ServingStateBadge.tsx` (line TODO) · `grep -n "LIBRARY_COLUMNS" frontend/src/components/policy-admin/PolicyLibraryTable.tsx` (line TODO) · `grep -n "DOCUMENT_KEY_PATTERN" frontend/src/components/policy-admin/PolicyUploadForm.tsx` (line TODO) · `grep -n "PolicyVersionTimelineProps" frontend/src/components/policy-admin/PolicyVersionTimeline.tsx` (line TODO) · `grep -n "PolicyPreviewProps" frontend/src/components/policy-admin/PolicyPreview.tsx` (line TODO) · `grep -n "TestAskPanelProps" frontend/src/components/policy-admin/TestAskPanel.tsx` (line TODO) · `grep -n "todayIso" frontend/src/components/policy-admin/PublishDialog.tsx` (line TODO) · `grep -n "MIN_RETIRE_REASON" frontend/src/components/policy-admin/RetireDialog.tsx` (line TODO)
- **Verify**: login `admin.rao` → `/admin/policies` → VEHICLE-TNC → upload v2026.4 (effective today) → Preview + Test ask → Publish → v2026.4 Active; `priya.sharma` asks the foreclosure question → chip `v2026.4`; retire v2026.4 → chip back to `v2026.3`. `npx vitest run PolicyDetailPage`.

---

## Judge Live Change Cheatsheet (10 × 30–60 s)

All line numbers `TODO` — **S3: fill real numbers after phase 3 and re-test each row.** Keep `npm run dev` running; Vite hot-reloads on save.

| # | Change | File | Anchor (`grep -n`) | Exact edit | Verify |
|---|---|---|---|---|---|
| 1 | Primary colour teal → navy | `frontend/src/styles/tokens.css` | `--color-primary:` (line TODO) | `#0D5E61` → `#1E3A8A`; also `--color-primary-hover:` → `#1E40AF` (light block inside `@theme`) | Any page: buttons, active nav, user bubbles turn navy |
| 2 | Font Inter → system | `frontend/src/styles/tokens.css` | `--font-sans:` (line TODO) | delete `"Inter Variable", ` so the value starts with `system-ui` | Reload `/products`; text renders in system font |
| 3 | Button radius | `frontend/src/styles/tokens.css` | `--radius-md:` (line TODO) | `10px` → `999px` (pill) or `2px` (square) | `/login` button corners |
| 4 | Card shadow stronger | `frontend/src/styles/tokens.css` | `--shadow-card:` (line TODO) | replace value with `0 4px 12px rgb(15 23 23 / .18)` | `/products` cards |
| 5 | Page heading size | `frontend/src/styles/tokens.css` | `--text-h1:` (line TODO) | `1.75rem` → `2.25rem` | `/products` title grows |
| 6 | Add column to EmiTable | `frontend/src/components/emi/EmiTable.tsx` | `const COLUMNS` (line TODO) | append `{ key: 'cumInterest', label: 'Cum. interest', align: 'right', render: (r, i, rows) => formatInr(rows.slice(0, i + 1).reduce((s, x) => s + x.interestComponent, 0)) }` | `/products/VL-204` table shows 7 columns |
| 7 | Change a status colour | `frontend/src/components/applications/StatusTimeline.tsx` | `STATUS_STYLE` (line TODO) | `APPROVED: 'bg-success'` → `APPROVED: 'bg-info'` | `/applications/LA-2026-00418/status` after approval |
| 8 | Chat bubble colour | `frontend/src/components/chat/ChatPanel.tsx` | `USER_BUBBLE` (line TODO) | `'bg-primary text-white'` → `'bg-accent text-n900'` | `/advisor`, send any message |
| 9 | Rename nav label | `frontend/src/routes/nav.ts` | `navByRole` (line TODO) | `label: 'Advisor'` → `label: 'Loan Advisor'` | Top bar after login as customer |
| 10 | Switch catalogue breakpoint | `frontend/src/pages/CataloguePage.tsx` | `grid-cols` (line TODO) | `xl:grid-cols-3` → `md:grid-cols-3` | Resize to 768: three columns instead of two |

Rollback any change: `git checkout -- <file>` (demo branch is committed before the session starts; see `Demo_Runbook.md`).
