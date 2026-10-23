# Design.md — LoanLens AI (Kestrel Bank) frontend design system

Owner: S3 frontend. Status: **spec only — no frontend code exists yet.** Every path below is the planned location; S3 phase 1 creates `frontend/src/styles/tokens.css` from this file. Tailwind **v4**: the `@tailwindcss/vite` plugin plus a CSS-first `@theme` block in `tokens.css`; there is **no** `tailwind.config.*` file. When they diverge, the code wins and this file is updated in the same PR.

## 1. Brand direction

Kestrel Bank is a large, established Indian retail bank (12M customers, branches + app + call centre). The UI must read as **a bank first, an AI product second**:

- Trustworthy and calm: deep teal primary, lots of white, generous whitespace, strong tabular numbers. Money is the hero, not the chatbot.
- Modern but not trendy: no purple gradients, no glowing "AI sparkle" blobs, no glassmorphism, no animated backgrounds. AI features get the same visual language as the rest, plus a small amber "AI" tag so nobody confuses an LLM answer with a bank statement.
- Indian context: ₹ with Indian digit grouping everywhere (see §9), Inter (supports Devanagari glyphs if labels are ever localised), date format `DD MMM YYYY` on screen, ISO in API.
- Honest about AI: every LLM-derived screen shows a disclaimer line and sources; the human decision button is visually the most important control on the analyst page.

Tone of copy: short, plain English, second person ("You can foreclose after 6 EMIs"), no exclamation marks.

## 2. Colour tokens

Defined once in `frontend/src/styles/tokens.css` inside Tailwind v4's `@theme` block. Every `--color-*` token becomes a utility automatically (`bg-primary`, `text-danger`, `border-border`, `bg-surface-2`, `text-muted`). Components use these classes, never raw hex. Values below are the hex form of the original RGB triplets.

```css
/* frontend/src/styles/tokens.css */
@import "tailwindcss";

/* Dark mode = data-theme="dark" on <html> */
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));

@theme {
  --font-sans: "Inter Variable", system-ui, -apple-system, "Segoe UI", sans-serif;

  /* brand */
  --color-primary: #0D5E61;        /* deep teal: buttons, links, active nav */
  --color-primary-hover: #0A4C4E;
  --color-primary-soft: #E2F1F0;   /* tinted backgrounds, selected rows */
  --color-accent: #D97706;         /* amber: AI tag, highlights, focus ring */
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

  /* neutrals (slate-ish, slightly cool) */
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
  --color-bg: #F8FAFA;          /* n50 */
  --color-surface: #FFFFFF;     /* n0 */
  --color-surface-2: #F1F5F5;   /* n100 */
  --color-border: #E2E8E8;      /* n200 */
  --color-fg: #0F1717;          /* n900, body text */
  --color-muted: #647474;       /* n500, secondary text */

  /* type scale (see §3) */
  --text-display: 2.25rem;  --text-display--line-height: 1.15;
  --text-h1: 1.75rem;       --text-h1--line-height: 1.2;
  --text-h2: 1.375rem;      --text-h2--line-height: 1.25;
  --text-h3: 1.125rem;      --text-h3--line-height: 1.3;
  --text-body: 1rem;        --text-body--line-height: 1.5;

  /* radius and shadow (see §4) */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --shadow-card: 0 1px 2px rgb(15 23 23 / 0.06), 0 1px 3px rgb(15 23 23 / 0.10);
  --shadow-pop: 0 8px 24px rgb(15 23 23 / 0.14);
}

:root[data-theme="dark"] {
  --color-primary: #38B2AC;        /* lighter teal so contrast on dark holds >= 4.5:1 */
  --color-primary-hover: #5EC8C2;
  --color-primary-soft: #133637;
  --color-accent: #FBBF24;
  --color-accent-soft: #452E0A;
  --color-success: #4ADE80;  --color-success-soft: #0C321C;
  --color-warn: #FBBF24;     --color-warn-soft: #452E0A;
  --color-danger: #F87171;   --color-danger-soft: #451414;
  --color-info: #60A5FA;     --color-info-soft: #172554;
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

@utility focus-ring {
  @apply focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2;
}

@layer base {
  body { @apply bg-bg text-fg font-sans text-body antialiased; }
}
```

Dark mode: `data-theme` attribute on `<html>`, toggled in `AppLayout`, persisted in `localStorage` key `ll-theme`, defaults to `prefers-color-scheme`. The `dark:` variant is defined by the `@custom-variant dark` line above (Tailwind v4 has no `darkMode` config key).

Usage rules:
- Primary is for one action per view. Secondary actions are outline/ghost.
- Amber accent is reserved for AI markers (AI tag, confidence badge, source chips) and the focus ring. Do not use amber for buttons except on a dark hero.
- Semantic colours are never the only signal — pair with an icon or text (`PASS`, `FAIL`).

## 3. Typography

- Font: **Inter** (self-hosted via `@fontsource-variable/inter`, imported in `frontend/src/main.tsx`; no Google Fonts call at demo time → works offline). Family set once as `--font-sans` in the `@theme` block (§2). Fallback `system-ui, -apple-system, "Segoe UI", sans-serif`.
- Money and any numeric column: `font-variant-numeric: tabular-nums` (Tailwind `tabular-nums`). Applied by the `Money` component and on every `<td>` in `EmiTable` / `CompareTable`.
- Type scale (rem, line-height) — defined in `@theme` as `--text-display`, `--text-h1`, `--text-h2`, `--text-h3`, `--text-body` (each with a `--line-height` companion); `text-sm` / `text-xs` are Tailwind defaults:

| Token | Size | LH | Use |
|---|---|---|---|
| `text-display` | 2.25rem / 36px | 1.15 | Page hero number (EMI result) |
| `text-h1` | 1.75rem / 28px | 1.2 | Page title |
| `text-h2` | 1.375rem / 22px | 1.25 | Section / card title |
| `text-h3` | 1.125rem / 18px | 1.3 | Sub-section |
| `text-body` | 1rem / 16px | 1.5 | Default |
| `text-sm` | 0.875rem / 14px | 1.45 | Table cells, labels, chips |
| `text-xs` | 0.75rem / 12px | 1.4 | Meta, timestamps, badges |

Weights: 400 body, 500 labels/nav, 600 headings and money, 700 only for the hero EMI number. Headings use `tracking-tight`.

## 4. Spacing, radius, shadow

- Spacing: Tailwind default 4px scale. Page gutter 16px (375), 24px (768), 32px (1280). Card padding 16/20/24. Vertical rhythm between sections 32px.
- Radius (in `@theme`, used as `rounded-sm` / `rounded-md` / `rounded-lg` / `rounded-full`): `--radius-sm: 6px` (inputs, chips), `--radius-md: 10px` (buttons, cards), `--radius-lg: 16px` (modals, chat panel), `rounded-full` (badges, avatar).
- Shadow (in `@theme`, used as `shadow-card` / `shadow-pop`; light): `--shadow-card: 0 1px 2px rgb(15 23 23 / .06), 0 1px 3px rgb(15 23 23 / .10)`; `--shadow-pop: 0 8px 24px rgb(15 23 23 / .14)`. Dark mode: shadows off, 1px `--border` instead.
- Borders: 1px `--border` on cards and tables; no double borders (card inside card uses `surface-2` background, no border).

## 5. Component specs

All components live in `frontend/src/components/<area>/<Name>.tsx`; shared primitives in `frontend/src/components/ui/`. Props are TypeScript interfaces named `<Name>Props`. Every component is keyboard-operable and has a visible focus ring (§8).

### Button (`ui/Button.tsx`)
- Variants: `primary` (bg primary, text white), `secondary` (border primary, text primary), `ghost` (no border, text primary), `danger` (bg danger, text white; used only for Reject), `link`.
- Sizes: `sm` 32px, `md` 40px (default), `lg` 48px. Min touch target 40px on mobile.
- States: hover (primary-hover), focus-visible ring, disabled (opacity 50 + `cursor-not-allowed`), loading (spinner replaces label, width preserved, `aria-busy`).
- Props: `variant, size, loading, disabled, leftIcon, type, onClick, children`.

### Card (`ui/Card.tsx`)
- `surface` background, 1px border, `radius-md`, `shadow-card`, padding per §4. Optional `title`, `actions` slot (top-right), `footer`.

### Money (`ui/Money.tsx`)
- Renders `₹5,00,000` per §9. Props: `value: number`, `muted?`. Always `tabular-nums`.

### RoleBadge (`ui/RoleBadge.tsx`)
- Pill, `text-xs`, uppercase. CUSTOMER = primary-soft/primary; LOAN_OFFICER = info-soft/info; CREDIT_ANALYST = accent-soft/warn; POLICY_ADMIN = n200/n700. Shown in nav next to display name.

### ProductCard (`products/ProductCard.tsx`)
- Header: loan type tag (PERSONAL/HOME/VEHICLE/EDUCATION, neutral pill) + product name (h3) + `productId` in `text-xs text-muted`.
- Body: 2×2 fact grid — rate range `10.5% – 13.0% p.a.`, tenure `12 – 84 months`, amount `₹1,00,000 – ₹25,00,000`, processing fee `1.5% (min ₹1,000)`.
- Footer: `Compare` checkbox (max 4 selected; disabled with tooltip when 4 reached) + `View & calculate EMI` secondary button → `/products/:productId`.
- Data: one `LoanProduct` from `GET /api/products`.

### CompareTable (`products/CompareTable.tsx`)
- Products as columns (2–4), attributes as rows: rate, tenure, amount, processing fee, min income, min credit score, max obligation ratio, allowed segments. First column sticky on mobile, horizontal scroll. Best value per row (lowest rate, lowest fee) gets `success-soft` cell background and a "Best" `text-xs` tag.
- Data: `GET /api/products/compare?ids=`.

### EmiCalculator + EmiTable (`emi/EmiCalculator.tsx`, `emi/EmiTable.tsx`)
- Inputs: principal (number, ₹ prefix, Indian grouping as you type), annual rate (step 0.1, bounded by the product's min/max), tenure (slider + number, months). Debounced 300ms → `POST /api/emi/calculate`. **No EMI maths in the browser** (M3-9) — the component only renders `EmiResult`.
- Result hero: EMI as `text-display` Money; beside it total interest and total payment as `text-h3`.
- EmiTable: columns `Month | Opening balance | EMI | Principal | Interest | Closing balance`, all `tabular-nums` and right-aligned except Month. Rows virtualised only if tenure > 120 (plain table otherwise). Sticky header. Footer row: totals. Download CSV button (client-side from the API payload — formatting, not calculation).

### StatusTimeline (`applications/StatusTimeline.tsx`)
- Vertical stepper for the 7 statuses in order: DRAFT → SUBMITTED → UNDER_VERIFICATION → UNDER_REVIEW → APPROVED | REJECTED → DISBURSED.
- Each step: dot + label + `at` timestamp + `by` + `note` from `LoanApplication.timeline`. Reached steps filled primary; current step pulsing ring; future steps `n300`. REJECTED renders in danger and hides DISBURSED. Labels humanised: `Under Verification`.
- `aria-current="step"` on the current status; the list is an `<ol>`.

### ChatPanel (`chat/ChatPanel.tsx`) — used by AdvisorChat and PolicyChat
- Layout: scrollable message list (flex-col, `gap-3`), composer pinned bottom (textarea auto-grow to 4 lines, Enter sends, Shift+Enter newline, send button).
- Bubbles: user = primary background, white text, right-aligned, `radius-lg` with bottom-right 4px; assistant = `surface-2`, left-aligned, bottom-left 4px. Max width 80% (mobile) / 640px.
- Assistant bubble header row: small amber `AI` tag + timestamp. Footer row (policy only): `SourceChip`s + `ConfidenceBadge`.
- `SourceChip`: `document · section · v2026.3 · effective 01 Jul 2026` in `text-xs`, `accent-soft` background; the version + effective date are always visible (never truncated) so a reader can see which policy version answered. Reused by the admin `TestAskPanel`. `ConfidenceBadge`: HIGH = success, MEDIUM = warn, LOW = danger, with the word spelled out.
- Pending state: three-dot typing indicator bubble; composer disabled with `aria-busy`.
- Message list has `aria-live="polite"` and `role="log"`; new assistant messages are announced.
- Disclaimer line under the list in `text-xs text-muted` ("Indicative only. Final approval is subject to credit assessment." for advisor; "Answers come only from Kestrel Bank approved documents." for policy).

### RecommendationCard (`advisor/RecommendationCard.tsx`)
- Rendered inside an advisor assistant bubble, one per `recommendations[]` item. Shows product name + id, `indicativeInterestRate`, `tenureMonths`, `estimatedEmi` (Money, h3), `reason` as a sentence, `eligibilityIndicator` badge: LIKELY_ELIGIBLE success, BORDERLINE warn, UNLIKELY_ELIGIBLE danger, UNKNOWN neutral. Button `Apply with this product` → wizard prefilled.
- Above the cards: a one-line "Understood: *interpretedRequirement*" with extracted chips (amount, income, max EMI) so judges see extraction. If `clarifyingQuestion` is non-null, render it as the bubble text instead of cards.

### AgentChecksTable (`review/AgentChecksTable.tsx`)
- Columns `Agent | Result | Detail`. Result cell = badge: PASS success-soft/success, FAIL danger-soft/danger, INCOMPLETE warn-soft/warn, EXCEPTION danger with an alert icon and `font-semibold` (it means a guardrail fired).
- Above the table: `recommendation` as a large pill (REQUEST_ADDITIONAL_DOCUMENTS warn, RECOMMEND_APPROVE success, RECOMMEND_REJECT danger, REFER_TO_HUMAN info), `riskBand` chip, `requiresHumanApproval` shown as "Human decision required" lock icon. `missingDocuments` as a bullet list; `customerMessage` in a quoted block labelled "Drafted customer message".

### AuditTrailViewer (`review/AuditTrailViewer.tsx`)
- Table/list of `AuditTrail.events` sorted by `sequence`: `# | time | agent | eventType | tool | duration`. Row expands (`<details>`) to show `input` / `output` JSON pretty-printed in a `<pre>` with `text-xs`. Event type colours: TOOL_CALL/TOOL_RESULT info, LLM_CALL/LLM_RESULT neutral, PERMISSION_DENIED danger-soft row background, HUMAN_REQUIRED accent-soft. Filter chips by eventType; a "Show PERMISSION_DENIED only" toggle for the demo. Masked values (`XXXXX1234X`) are rendered as-is — never unmask in the UI.

### FormStepper (`applications/FormStepper.tsx`) + ApplicationWizard
- 4 steps: 1 Product & amount, 2 Employment & income, 3 Documents, 4 Review & submit. Horizontal on ≥768, compact "Step 2 of 4" + progress bar on 375. Completed steps clickable; future steps not. `aria-current="step"`.
- Wizard persists `currentStep` and fields via `PUT /api/applications/:id` on "Save draft" and on step change. Toast "Draft saved" with timestamp.

### FileDropzone (`applications/FileDropzone.tsx`)
- One per `DocumentType` (IDENTITY, ADDRESS, INCOME). Dashed border `n300`, hover/drag-over primary-soft, accepts pdf/jpg/png ≤ 5MB (client-side check, server re-validates). Shows uploaded file name, size, uploadedAt, "Replace". A missing required proof shows a warn hint "Not uploaded yet" but does **not** block Save draft; Submit is allowed without address proof so the brief's scenario can be demonstrated (backend validation is the source of truth).

### Policy admin console (`policy-admin/*`, POLICY_ADMIN only)
Versioning rules are in `Integration_Contracts.md` §8a. The browser never decides which version is in force; it renders `servingState` from the API.

- **ServingStateBadge** (`policy-admin/ServingStateBadge.tsx`): pill `rounded-full text-xs font-semibold`, always with the word. `SERVING_STYLE`: ACTIVE success-soft/success "Active"; SCHEDULED warn-soft/warn "Scheduled" (amber); DRAFT n200/n700 "Draft" (grey); SUPERSEDED surface-2/muted "Superseded"; RETIRED danger-soft/danger + `line-through` "Retired". Props: `state: PolicyVersion['servingState']`.
- **PolicyLibraryTable** (`policy-admin/PolicyLibraryTable.tsx`): one row per `documentKey`. Columns Policy (title link + key in `text-xs text-muted`) | Type | Audience badge (CUSTOMER info, INTERNAL neutral) | Active (badge + `v2026.3` + date; none → "None in force" in danger) | Scheduled (amber badge + version + date, else "—") | Drafts | Versions | "Upload new version" (secondary sm). Scrolls inside its card. Props: `items: PolicyLibraryItem[]`. Data: `GET /api/admin/policies`.
- **PolicyUploadForm** (`policy-admin/PolicyUploadForm.tsx`): policy key (`<input list>` + `<datalist>` of existing keys; UPPERCASE-KEBAB validation), title, version, effective date (hint: "A future date publishes as SCHEDULED"), loan type, document type, audience, segment (optional), change note (required, ≥ 5 chars), file dropzone styled like `FileDropzone` (pdf/md/csv/json ≤ 5 MB). Primary "Upload as draft". Props: `library, defaultDocumentKey?, onCreated(v)`. Data: `POST /api/admin/policies` (multipart).
- **PolicyVersionTimeline** (`policy-admin/PolicyVersionTimeline.tsx`): `<ol>` newest first; each version a button (selected = `primary-soft` background + `aria-current="true"`): `v<version>`, `ServingStateBadge`, effective date, who/when uploaded, published, retired + reason, change note (`text-sm`). RETIRED versions struck through and muted. Props: `versions, selectedId, onSelect(documentId)`.
- **PolicyPreview** (`policy-admin/PolicyPreview.tsx`): heading "Preview — N sections, as chunked for the assistant"; one `<details>` per section (first open), content `whitespace-pre-wrap text-sm` on `surface-2`. Props: `documentId`. Data: `GET /api/admin/policies/versions/{documentId}/preview`.
- **TestAskPanel** (`policy-admin/TestAskPanel.tsx`): labelled question input + "Ask this version"; renders the `PolicyAnswer` exactly like the policy chat (AI tag, answer, `ConfidenceBadge`, `SourceChip`s, follow-up notice). Helper text says only this version is searched and customers do not see the answer. Props: `version: PolicyVersion`. Data: `POST .../test-ask`.
- **PublishDialog** (`policy-admin/PublishDialog.tsx`): native `<dialog>` (`showModal`, focus trap, Esc closes), `rounded-lg shadow-pop`. States the effective date and the outcome: "becomes ACTIVE now and replaces v2026.3" or "will be SCHEDULED, starts serving on 01 Nov 2026". Primary "Publish v2026.4". Props: `version, versions, open, onClose, onPublished(v)`.
- **RetireDialog** (`policy-admin/RetireDialog.tsx`): same dialog shell; required reason textarea (≥ 5 chars, confirm disabled until valid); states which version becomes active again ("v2026.3 becomes active again") or that none will be in force. Confirm is the danger button "Retire v2026.4" (the only danger button besides Reject). Props: `version, versions, open, onClose, onRetired(v)`.
- Success feedback for upload / publish / retire: a `role="status"` toast pill success-soft/success, top-right, auto-hides after 4 s. Errors: `ErrorAlert` with the envelope's message and code (inside the dialog when the dialog made the call).

## 6. Layout and navigation

- `AppLayout` (`frontend/src/layouts/AppLayout.tsx`; nav items in `frontend/src/routes/nav.ts` → `navByRole`): top bar (logo "Kestrel Bank · LoanLens", nav links, theme toggle, RoleBadge + name, Logout). Content max-width 1200px centred. Side navigation only on ≥1280 for officer/analyst; customers get top nav only.
- Nav by role (frontend hides, backend enforces):
  - CUSTOMER: Products, EMI calculator, Advisor, Policy assistant, My applications, Profile
  - LOAN_OFFICER: Queue, Policy assistant, Knowledge base, Products
  - CREDIT_ANALYST: Review queue, Policy assistant, Knowledge base, Products
- Routes (kebab-case, defined in `frontend/src/routes/router.tsx`): `/login`, `/products`, `/products/:productId`, `/compare?ids=`, `/emi`, `/advisor`, `/policy`, `/profile`, `/applications`, `/applications/new`, `/applications/:applicationId/edit`, `/applications/:applicationId/status`, `/officer/queue` (officer and analyst), `/analyst/review/:applicationId`, `/knowledge`, `/forbidden`. Role homes: CUSTOMER → `/products`; LOAN_OFFICER and CREDIT_ANALYST → `/officer/queue`.

## 7. Responsive breakpoints

Test widths: **375** (phone), **768** (tablet), **1280** (desktop). Tailwind screens: `sm: 640`, `md: 768`, `lg: 1024`, `xl: 1280`.

| Element | 375 | 768 | 1280 |
|---|---|---|---|
| Catalogue grid | 1 col | 2 col | 3 col |
| CompareTable | horizontal scroll, sticky first column | full | full |
| EmiCalculator | inputs stacked, result below | inputs left / result right | same + table full width |
| EmiTable | hide Opening balance column, 6→5 cols | all cols | all cols |
| Chat | full-height page, composer fixed bottom | centred 640px | 720px + sources panel on the right |
| FormStepper | compact progress | horizontal | horizontal |
| Analyst review | stacked: checks, trail, decision | two-column | checks + trail side by side, decision sticky right |
| Nav | hamburger drawer | top links | top links + side nav for staff |

Never use fixed heights on content; tables scroll inside their card, the page does not scroll horizontally.

## 8. Accessibility

- Contrast ≥ 4.5:1 for text, ≥ 3:1 for large text and UI borders. The token pairs listed in §2 were chosen to pass; re-check with the browser devtools contrast picker after any colour edit.
- Focus: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2` on every interactive element, via the shared `focus-ring` utility (`@utility focus-ring` in `tokens.css`).
- Every input has a `<label for>`; errors use `aria-describedby` + `aria-invalid`. Required fields marked in the label, not by colour alone.
- Chat: `role="log" aria-live="polite"`; composer `aria-label="Message"`; send button has text, not only an icon.
- Keyboard: all routes reachable by Tab; modals trap focus and close on Esc; CompareTable checkboxes operable with Space; FormStepper steps are buttons.
- Status badges carry the status word (PASS/FAIL) — colour is never the sole signal.
- Skip-to-content link as the first focusable element in `AppLayout`.
- Respect `prefers-reduced-motion`: disable the timeline pulse and typing animation.

## 9. INR formatting rule

- Integer rupees only (API sends integers). Format with Indian grouping and no decimals: `new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })` → `₹5,00,000`, `₹10,871`, `₹1,00,00,000`.
- One helper, `formatInr(n: number): string`, in `frontend/src/lib/formatInr.ts` (pass `minimumFractionDigits: 0` as well as `maximumFractionDigits: 0`); `Money` component is the only renderer. Percentages: one decimal, `11.0%`. Never show `₹500000` or `₹500,000`.
- Input fields accept digits only; a formatted mirror (`₹5,00,000`) shows under the field.

## 10. Empty, loading, error states

- Loading: skeleton blocks (`n200` pulsing) matching the final layout for cards/tables; spinner only inside buttons. Chat uses the typing bubble.
- Empty: icon + one sentence + one action. Examples: catalogue filter → "No products match. Clear filters."; My applications → "You have no applications yet. Start one."; officer queue → "No submitted applications."; audit trail → "No events recorded."
- Error: inline `danger-soft` alert with the API envelope's `message` and `code`; `details[]` mapped to field errors in forms. `AI_UNAVAILABLE` (503) in chat renders a specific bubble: "The AI service is unavailable. Try again in a moment." with a Retry button. 401 → redirect to `/login`; 403 → "You don't have permission for this" page (used in the demo to show role enforcement).
- Never show a blank screen: every page has all three states implemented before it is considered done.
