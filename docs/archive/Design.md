> Historical development reference. Current submission guide: [SUBMISSION.md](../SUBMISSION.md). Statements about planned or pending work reflect an earlier stage.

---
name: LoanLens AI — Kestrel Bank
description: A calm, role-aware loan application and servicing workspace.
colors:
  primary: "#0D5E61"
  primary-hover: "#0A4C4E"
  primary-soft: "#E2F1F0"
  accent: "#D97706"
  accent-soft: "#FEF3C7"
  success: "#15803D"
  success-soft: "#DCFCE7"
  warn: "#B45309"
  danger: "#B91C1C"
  info: "#1D4ED8"
  bg: "#F8FAFA"
  surface: "#FFFFFF"
  surface-2: "#F1F5F5"
  border: "#E2E8E8"
  fg: "#0F1717"
  muted: "#647474"
typography:
  body:
    fontFamily: "Inter Variable, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  title:
    fontFamily: "Inter Variable, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 650
    lineHeight: 1.2
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "7px"
    padding: "11px 17px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.fg}"
    rounded: "10px"
    padding: "16px"
---

# Design System: LoanLens AI — Kestrel Bank

## Overview

**Creative North Star: “The Steady Banking Workspace”**

LoanLens presents a bank-first experience: calm, legible, and direct. Deep teal anchors navigation and primary actions, while cool near-white surfaces give dense product, application, and review information room to breathe. AI assistance shares the same visual language as ordinary banking tasks; amber identifies AI-related information without competing with decisions or financial figures.

The interface serves customers and staff through one role-aware workspace. Desktop uses a persistent left rail; small screens reclaim the full canvas and open that navigation as a drawer. The current implementation uses CSS custom properties from `frontend/src/styles/tokens.css` and app-specific layout rules in `frontend/src/styles/app.css`.

**Key Characteristics:**
- Deep teal actions over cool, light neutral surfaces.
- Inter typography with readable compact labels and tabular financial values.
- Clear role, workflow, and AI state cues; color is paired with text or icons.

## Colors

The palette centers on deep teal, a restrained amber marker, semantic status colors, and cool slate neutrals. Values in the frontmatter and `frontend/src/styles/tokens.css` are authoritative; dark theme overrides are defined in that stylesheet.

### Primary
- **Deep Teal** (`{colors.primary}`): brand marks, primary actions, active navigation, and important links.
- **Soft Teal** (`{colors.primary-soft}`): selected states and supporting tinted surfaces.

### Secondary
- **Signal Amber** (`{colors.accent}`): AI markers, source and confidence cues, and visible focus indication. Keep it secondary to primary actions.

### Tertiary
- **Status Blue** (`{colors.info}`): informational states and neutral workflow guidance.
- **Success Green** (`{colors.success}`): successful checks and completed states.
- **Warning Ochre** (`{colors.warn}`): attention states.
- **Danger Red** (`{colors.danger}`): errors and destructive actions.

### Neutral
- **Cool Canvas** (`{colors.bg}`): application background.
- **White Surface** (`{colors.surface}`): navigation and primary content surfaces.
- **Mist Surface** (`{colors.surface-2}`): secondary panels and hover surfaces.
- **Cool Border** (`{colors.border}`): separators and field/card outlines.
- **Ink** (`{colors.fg}`): primary text.
- **Muted Slate** (`{colors.muted}`): supporting text.

**The Meaningful Color Rule.** Never communicate a status through color alone; retain its label, icon, or both.

## Typography

**Display Font:** Inter Variable (with system UI and sans-serif fallbacks)
**Body Font:** Inter Variable (with system UI and sans-serif fallbacks)

**Character:** Neutral and compact, with clear hierarchy for operational data. Financial values use tabular numerals so columns remain easy to scan.

### Hierarchy
- **Display** (700, 2.25rem, 1.15): prominent calculated values where the page calls for a financial result.
- **Headline** (650, 1.75rem, 1.2): page headings; the shell's page title is 28px.
- **Title** (650, 1.375rem, 1.25): section headings.
- **Body** (400, 1rem, 1.5): general content; dense app copy often uses smaller sizes where the stylesheet specifies them.
- **Label** (500–650, typically 9–12px): navigation, metadata, status labels, and table context.

### Named Rules
**The Financial Alignment Rule.** Use tabular numerals for monetary amounts and numeric table columns.

## Layout

The desktop workspace pairs a fixed 244px sidebar with a flexible content area. At widths up to 1100px the sidebar narrows; at 767px and below it moves off-canvas and the topbar exposes a menu button. The drawer overlays the page, has a backdrop, and closes when a navigation link is selected. Main content has a 1440px maximum width and responsive gutters (18px on small screens, 27px at medium widths, 40–48px on wide screens). Tables may scroll within the content area on narrow viewports; avoid page-level horizontal overflow.

## Elevation & Depth

Light theme uses subtle card and popover shadows from `--shadow-card` and `--shadow-pop`; borders and surface tones provide most separation. Dark theme removes those shadows and relies on tonal surfaces and borders. The mobile drawer adds a stronger shadow and backdrop to signal its overlay state.

## Shapes

The form language uses compact, gently rounded controls: 6px small radii, 10px medium radii, and 16px large radii in the token scale. The current app stylesheet also uses 7px control/navigation corners, 11–12px feature-panel corners, and circular avatars. Borders are thin and cool; preserve clear focus outlines on interactive controls.

## Components

### Buttons
- **Character:** Compact, clear actions that fit operational workflows.
- **Primary:** Deep teal fill, white text, 7px radius, and 11px by 17px padding (`.btn` in `frontend/src/styles/app.css`).
- **Secondary:** Surface fill with a 1px border and teal text (`.btn.secondary`).
- **Focus:** Keep the global visible focus treatment in `app.css`.

### Cards / Containers
- **Corner Style:** Usually 10px in the shared token scale; feature panels may use 12px.
- **Background:** White primary surfaces and cool mist secondary surfaces.
- **Shadow Strategy:** Subtle in light theme; dark theme uses border and tonal contrast.
- **Padding:** Follow the surrounding feature layout; the stylesheet uses responsive page and panel spacing.

### Inputs / Fields
- **Style:** White surface, cool border, dark text, 7px radius, compact 11px by 12px padding in the login form.
- **Focus:** Visible 2px accent outline with a 3px offset, applied globally to `:focus-visible`.

### Navigation
- **Desktop:** Fixed left sidebar with compact muted links; active destination uses teal text and a soft teal surface.
- **Mobile:** Menu button opens an off-canvas sidebar drawer with backdrop; route selection closes it. The menu exposes `aria-expanded` and `aria-controls`.

### Status and AI markers
- Badges pair a short label with semantic foreground/background colors. Amber marks AI or attention-related content; reserve red for danger and green for success.

## Do's and Don'ts

### Do:
- **Do** use `frontend/src/styles/tokens.css` as the source for palette, type scale, radii, shadows, and dark-theme values.
- **Do** keep app layout and responsive refinements in `frontend/src/styles/app.css`.
- **Do** preserve the responsive sidebar drawer and its close-on-navigation behavior.
- **Do** pair semantic color with text or an icon and retain visible keyboard focus.

### Don't:
- **Don't** introduce a competing palette or font without an intentional design-system change.
- **Don't** use amber as the default primary action color.
- **Don't** let narrow screens overflow horizontally at the page level.
- **Don't** describe planned paths or unverified accessibility properties as implemented facts.
