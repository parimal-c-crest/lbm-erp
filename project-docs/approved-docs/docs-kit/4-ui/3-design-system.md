# Design System

> **Purpose**
>
> This document defines the LBM ERP Rewrite's visual language, design principles, design tokens,
> reusable UI foundations, and consistency rules. It serves as the single source of truth for
> designers, developers, and AI assistants to create a unified user experience across the entire
> application.

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | LBM ERP Rewrite |
| Design Framework | Tailwind CSS + shadcn/ui (ADR-025) |
| UI Framework | Next.js (React, TypeScript) |
| Version | 1.0 |
| Status | Draft |
| Author | Claude Code (docs-kit generation) |
| Created Date | 2026-08-17 |
| Last Updated | 2026-08-17 |

---

# 1. Executive Summary

This design system implements the locked UI/UX direction (ADR-024: modern, clean, professional,
minimal, industry-standard — not a custom/branded visual identity) and CSS framework (ADR-025:
Tailwind CSS + shadcn/ui) using concrete token values derived from the reviewed Stitch AI mockup
(`sot-docs/design/screenshots/stitch_lbm_design/DESIGN.md`), per the `design-source.md` "Screenshots"
selection and ADR-177. Per ADR-177, only the mockup's tokens (color palette, type pairing, spacing/
radius scale, component look-and-feel) are reused — its layout implementation (fixed-width sidebar,
non-responsive table) is explicitly rejected and rebuilt fresh in `4-ui/1-navigation.md` and
`4-ui/6-responsive-design.md`.

- **Design philosophy**: a cool-toned, high-precision "SaaS/enterprise" visual language — clean
  geometric structure, hairline borders, generous rounded corners, restrained use of color reserved
  for functional roles (status, primary actions), never decorative.
- **Consistency goals**: one token set, consumed everywhere via Tailwind config — no module
  hand-rolls its own colors, spacing, or type.
- **Reusable UI principles**: build on shadcn/ui's unstyled-by-default component primitives
  (ADR-025), themed via this token set — never a bespoke one-off component where a shadcn primitive
  covers the need.
- **Accessibility objectives**: WCAG 2.2 AA minimum contrast (4.5:1 body text, 3:1 large
  text/UI components), full keyboard/screen-reader support (§13).
- **Scalability strategy**: tokens support the ADR-064 tenant-theming model (§14) without a second
  styling system — a tenant "theme" is just a saved set of these same token values.

---

# 2. Objectives

The Design System:

- Creates a consistent user experience across all 15 modules and their `5-modules/<module>/9-ui.md`
  screens.
- Reduces UI inconsistencies — one token source, no hard-coded hex/px values in component code.
- Improves development speed — shadcn/ui primitives + Tailwind utilities, no bespoke CSS framework.
- Encourages component reuse via `4-ui/4-component-standards.md`.
- Simplifies maintenance — a token change propagates via Tailwind config, not a find-and-replace.
- Supports accessibility standards as a first-class requirement, not an afterthought (§13).
- Enables AI-assisted UI generation — every module's JIT-generated `9-ui.md` references this same
  token set rather than re-deriving one.

---

# 3. Design Principles

- **Consistency** — one design system, no per-module deviation.
- **Simplicity** — minimal, industry-standard (ADR-024) — no decorative complexity.
- **Clarity** — functional color usage only; hierarchy through type scale and spacing, not noise.
- **Accessibility** — WCAG 2.2 AA is a floor, not a target (§13).
- **Efficiency** — dense enough for ERP data, never cramped (`ui-ux-design-requirements.md`:
  "avoid unnecessarily dense screens, while still supporting the information density expected in an
  ERP").
- **Responsiveness** — every token and pattern in this document works unmodified across
  desktop/tablet/mobile (`4-ui/6-responsive-design.md`).
- **Predictability** — the same token always means the same thing, in every module.
- **Scalability** — tenant custom themes (§14) reuse this exact token structure, not a parallel one.

---

# 4. Design Tokens

Values below are sourced directly from the reviewed mockup's `DESIGN.md` (front-matter + prose),
reused per ADR-177 as the project's actual token set — not placeholders.

## Colors

Functional/semantic layer (what components consume):

| Token | Usage | Value |
|--------|-------|-------|
| Primary | Brand color — structural branding, active states, primary navigation, links | `#2563EB` |
| Primary (surface-tint variant) | Slightly deeper primary used in the MD3-style tonal system | `#004AC6` |
| Secondary | High-conversion CTAs only (e.g. "Export Report," primary form submit) | `#F97316` |
| Tertiary | Intelligence/specialized-tag features (e.g. AI-assisted fields, specialized badges) | `#7C3AED` |
| Success | Success messages, completed states | `#10B981` |
| Warning | Warning messages, pending/late states | `#F59E0B` |
| Danger / Error | Errors, destructive actions, critical alerts | `#DC2626` (component-level error token: `#BA1A1A`) |
| Info | Informational messages/toasts | `#2563EB` (reuses Primary — `[Assumption: this document, developer-confirmed]`) |
| Background | Page canvas | `#F8FAFC` (light) |
| Surface | Cards & panels | `#FFFFFF` |
| Surface Container (low/DEFAULT/high/highest) | Layered surface backgrounds for nested containers | `#F0F3FF` / `#E7EEFF` / `#DEE8FF` / `#D8E3FB` |
| Border / Outline | Hairline borders, dividers | `#E2E8F0` (component-level: `#C3C6D7` outline-variant) |
| Text Primary | Main text | `#1E293B` (component-level `on-surface`: `#111C2D`) |
| Text Secondary | Secondary/muted text | `#434655` (`on-surface-variant`) |
| Inverse Surface | Dark-tinted surfaces (tooltips, inverse-emphasis chips) | `#263143` |
| Inverse On-Surface | Text/icons on Inverse Surface | `#ECF1FF` |

Full MD3-derived token set (for shadcn/ui theme wiring, exact values from the mockup's Tailwind
config) is preserved verbatim in Appendix-equivalent form at
`sot-docs/design/screenshots/stitch_lbm_design/DESIGN.md` — this table is the semantic subset every
document and module references; implementers wire the complete set into `tailwind.config` /
shadcn `globals.css` CSS variables directly from that source file.

---

## Typography

Three-typeface pairing (from mockup DESIGN.md, reused verbatim):

| Token | Usage | Family | Size | Weight | Line Height |
|--------|-------|--------|------|--------|-------------|
| Display Hero | Marketing/landing hero only (not used inside the authenticated ERP shell) | Space Grotesk | 64px (32px mobile) | 700 | 72px (40px mobile) |
| Heading 1 | Page titles (e.g. "Enterprise Dashboard") | Space Grotesk | 32px | 700 | 40px |
| Heading 2 | Section/card titles | Space Grotesk | 24px | 600 | 32px |
| Body (Lead) | Intro/lead paragraphs | Inter | 18px | 400 | 28px |
| Body | Default body text, table cells, form labels | Inter | 16px | 400 | 24px |
| Caption | Secondary/meta text (timestamps, helper text) | Inter | 12-14px (Tailwind `text-xs`/`text-sm`) | 400 | 1.4x |
| Label (Mono) | Metadata, status badges, technical labels, overline headers | JetBrains Mono | 12px | 500 | 16px |
| Button | Button label text | Inter | 14-16px | 600 | 1x |

Headlines use tight line-heights (1.1-1.25x) and negative tracking (-0.01em to -0.02em) for impact.
Body copy uses generous leading (1.5-1.7x) for legibility in information-dense ERP views.

---

## Spacing Scale

8px baseline rhythm (from mockup DESIGN.md):

| Token | Value |
|--------|------|
| XS | 4px (0.25rem) |
| SM | 8px (0.5rem) |
| MD | 16px (1rem) |
| LG | 24px (1.5rem) |
| XL | 32px (2rem) |
| 2XL | 48px (3rem) |
| 3XL | 64px (4rem) |
| Margin (mobile) | 16px (1rem) |
| Margin (desktop) | 32px (2rem) |
| Gutter | 16px (1rem) |

---

## Border Radius

| Token | Value | Applied to |
|--------|------|------------|
| Small | 8px (0.5rem) | Chips, small widgets, badges |
| Medium (DEFAULT) | 16px (1rem) | Buttons, inputs |
| Large | 32px (2rem) | Cards, primary containers |
| XL | 48px (3rem) | Floating navbars only (detached, "object-like" treatment) |
| Pill | 9999px | Status badges, tags, chips |

---

## Shadows

Ambient, extra-diffused, used sparingly (per mockup DESIGN.md §Elevation & Depth):

| Token | Usage | Value |
|--------|-------|-------|
| Small | Resting state, subtle separation (list rows, low-emphasis cards) | `0 1px 2px 0 rgba(0,0,0,0.03)` |
| Medium | Default card elevation | `0 4px 6px -1px rgba(0,0,0,0.05)` |
| Large | Hover-elevated cards, popovers | `0 10px 15px -3px rgba(0,0,0,0.08)` |
| Glass | Modals, navigation bars — frosted-glass overlay | `backdrop-filter: blur(12px) saturate(180%)` + `1px` semi-transparent border |

---

## Z-Index Scale

Standard layering convention (no SoT-specified values; engineering default, not a design decision):

| Layer | Value |
|--------|------|
| Dropdown | 100 |
| Sticky Header | 400 |
| Sidebar (mobile drawer) | 500 |
| Modal | 1000 |
| Toast | 1100 |
| Tooltip | 1200 |

---

# 5. Grid System

12-column fluid grid, 8px baseline rhythm (from mockup DESIGN.md):

- **Desktop**: max-width `1200px` (marketing/rare in this app) or `1400px` (dashboard/ERP screens),
  12 columns, `24px` gutters.
- **Tablet**: reduces to a denser column count per `4-ui/6-responsive-design.md` breakpoints;
  gutters step down to `16px`.
- **Mobile**: single column, `16px` side margins.
- **Article/Focus width** (rare in this ERP — e.g. a single long-form settings page): `680px-800px`
  centered.

---

# 6. Layout Standards

- **Dashboard**: KPI card row → analytics row (charts) → operations row (tables) → supplementary
  rows (activity/summary/insights), per the walkthrough in `4-ui/2-user-flows.md` §7. Role-scoped
  content, same layout shell for every role.
- **List Page**: page header (title + primary action) → search/filter bar → data table (responsive
  per `4-ui/6-responsive-design.md`) → pagination.
- **Detail Page**: page header (title + breadcrumb + contextual actions) → tabbed or sectioned
  content (per module).
- **Form Page**: page header → multi-column (desktop) / single-column (mobile) form
  (`4-ui/5-form-standards.md`) → sticky/fixed action bar (Save/Cancel).
- **Wizard**: used for Sales Order/Purchase Order multi-step creation (`4-ui/2-user-flows.md` §13) —
  step indicator, single-step content area, persistent Previous/Next/Save Draft/Cancel bar.
- **Modal**: glass-effect overlay (§4 Shadows: Glass token), used for confirmations and short forms
  only — never a full CRUD form (those get their own route/page).
- **Settings Page**: sectioned single-column layout, grouped by domain (matches
  `4-ui/1-navigation.md` §6 Settings sub-structure).

---

# 7. Iconography

- **Icon library**: [lucide-react](https://lucide.dev) — shadcn/ui's standard companion icon set
  (SVG-based, tree-shakeable, no external font/network dependency). Chosen over the reviewed
  mockup's Google Material Symbols Outlined specifically to avoid an external Google Fonts
  dependency shadcn/ui otherwise doesn't need (developer-confirmed).
- **Icon sizes**: 16px (inline/label), 20px (default UI/buttons), 24px (nav/section headers), 32px+
  (empty-state/illustration-adjacent use only).
- **Filled vs outlined**: lucide-react ships outlined/stroke icons only — the mockup's
  filled-vs-outlined distinction (used there to mark "active" nav items) is instead expressed via
  color/weight (active = Primary color + bold label) per `4-ui/1-navigation.md` §14.
- **Action icons**: `Plus` (create), `Pencil` (edit), `Trash2` (delete), `Download` (export),
  `Filter` (filter), `Search` (search).
- **Navigation icons**: mapped conceptually from the mockup's Material Symbols per module — e.g.
  `LayoutDashboard` (Dashboard), `Users` (Users), `Landmark`/`Building2` (Accounts), `Receipt`
  (Sales Orders), `Package` (Products), `ShoppingCart` (Purchase Orders), `Warehouse`/`Building`
  (Vendors), `MapPin` (Location), `Tag` (Pricing), `Settings` (Settings).
- **Status icons**: `CheckCircle2` (success), `AlertTriangle` (warning), `XCircle` (error/danger),
  `Info` (info).

---

# 8. Illustration Standards

No custom illustration set is in scope (ADR-024: industry-standard, not a custom brand identity).
Empty/error states use an icon (lucide-react, §7) + message + optional action — never a bespoke
illustration.

## Empty & Error State Patterns

| State | Message pattern | Primary action shown? | Example |
|---|---|---|---|
| No data yet (never had any) | "No [resource] yet — [create prompt]" | Yes — Create action | "No sales orders yet — create your first one" |
| No results (filtered/searched to empty) | "No results match your [search/filters]" | Yes — Clear filters | "No results match your filters" |
| Load failed (network/server error) | "Couldn't load [resource] — try again" | Yes — Retry | "Couldn't load purchase orders — retry" |
| Permission denied | "You don't have access to this" | No (Return to Dashboard link instead, per `4-ui/1-navigation.md` §15) | "You don't have access to this" |
| Partial/degraded data | "Some data couldn't load — showing what's available" | Yes — Retry (scoped to the failed portion only) | "Some line items couldn't load — showing what's available" |

---

# 9. Image Standards

- **Formats**: WebP with a JPEG/PNG fallback for user-uploaded content (e.g. product images,
  vendor logos, if any module requires them — none confirmed in MVP scope from `module-list.md`).
- **Responsive images**: Next.js `<Image>` component (automatic responsive `srcset`), never a raw
  `<img>` for anything larger than an icon/avatar.
- **Aspect ratios**: 1:1 for avatars/logos, 16:9 for any future dashboard imagery.
- **Compression**: handled by Next.js Image Optimization at build/request time — no manual
  pre-compression step required.
- **Lazy loading**: default-on for all below-the-fold images (Next.js `<Image>` default).
- **Placeholders**: blur-up placeholder (Next.js `placeholder="blur"`) for user-uploaded images;
  a neutral icon placeholder (§7) for missing/broken images.

---

# 10. Motion & Animation

- **Hover**: subtle lift + shadow intensification on cards (Small → Medium shadow token, §4),
  `150ms ease` — matches the mockup's `hover:shadow-lg transition-shadow` pattern.
- **Focus**: instant (no transition delay) — focus rings must never be animated in a way that
  delays visibility.
- **Loading**: skeleton shimmer (`4-ui/4-component-standards.md`), `1.5s` loop.
- **Modal**: fade + slight scale-in, `200ms ease-out`.
- **Page transition**: none beyond Next.js's default route transition — no custom page-transition
  animation (keeps navigation feeling instant, per `4-ui/1-navigation.md` §16 performance goals).
- **Expand/Collapse**: `200ms ease` height/opacity transition (sidebar collapse, accordion sections).
- **Toast notification**: slide-in + fade, `250ms ease-out`; auto-dismiss fade-out at `200ms`.

Guidelines

- Keep animations subtle — never decorative motion without a functional purpose (state change,
  spatial relationship).
- Respect `prefers-reduced-motion` — all transitions above collapse to instant/near-instant when set.
- Maintain consistent durations across the app — reuse the exact values above, don't introduce new
  timings per component.

---

# 11. State Standards

Every interactive component (shadcn/ui primitives, themed via these tokens) supports:

- **Default** — Surface/Border tokens, Text Primary.
- **Hover** — Small→Medium shadow step (cards), background shifts to next Surface Container step
  (buttons/menu items).
- **Focus** — visible focus ring, Primary color, 2px offset — never suppressed (`4-ui/7-accessibility.md`).
- **Active** — pressed/selected visual (slight scale-down `active:scale-95` on buttons, per mockup
  pattern).
- **Disabled** — 40% opacity, no hover/focus affordance, `cursor: not-allowed`.
- **Loading** — skeleton state or inline spinner (`4-ui/4-component-standards.md`); never a blank
  element.
- **Error** — Danger/Error token border + inline message (`4-ui/5-form-standards.md`).
- **Success** — Success token, typically a transient confirmation state (checkmark/toast).
- **Selected** — Primary-tinted background (`Surface Container High`) + `aria-selected="true"`.

---

# 12. Responsive Design Tokens

Full breakpoint/behavior detail lives in `4-ui/6-responsive-design.md`; token-level summary:

Desktop (≥1024px)

- Full type scale (§4 Typography) at stated sizes.
- Full spacing scale, `24px` grid gutters.

Tablet (≥768px, <1024px)

- Type scale unchanged; Heading 1 may step down one size on narrower tablet widths where content
  density requires it.
- Grid gutters step to `16px`.

Mobile (<768px)

- Display Hero/Heading 1 use their mobile-specific sizes (§4 Typography table).
- Spacing compresses to Mobile margin token (`16px`) at the page edge; internal component spacing
  (card padding, etc.) stays on the same 8px scale, just at smaller step values (e.g. card padding
  `16px` instead of `24px`).
- Grid collapses to single column.
- Navigation changes per `4-ui/1-navigation.md` §12 (sidebar → drawer).

---

# 13. Accessibility Standards

Design complies with:

- **WCAG 2.2 AA** — 4.5:1 minimum contrast for body text, 3:1 for large text (≥24px or ≥19px bold)
  and UI component boundaries. Every color pair in §4 was chosen from the mockup's MD3-derived
  palette specifically because it was authored to this contrast floor (mockup DESIGN.md: "high WCAG
  contrast (4.5:1 minimum for body, 3:1 for large text)").
- **Color contrast**: verified per pairing at implementation time — never assumed from a token name
  alone.
- **Focus visibility**: always visible, Primary-colored ring, never removed without a replacement
  (§11).
- **Keyboard navigation**: every interactive element in this token/component system is reachable and
  operable via keyboard alone.
- **Screen reader compatibility**: shadcn/ui primitives (built on Radix UI) ship correct ARIA
  roles/states by default — components must not override or strip them.
- **Touch target sizing**: minimum 44x44px on touch surfaces (tablet/mobile), matching
  `ui-ux-design-requirements.md`'s "touch targets sufficiently large" requirement.

---

# 14. Theme Support

Per ADR-064 (tenant color-theme override), theming in this project is **not** a Light/Dark toggle —
it is a System theme vs. tenant-editable Custom theme model:

- **System theme** — the token values in §4 of this document, shipped as the default, read-only
  theme, auto-applied to every new tenant at creation (ADR-055/056 provisioning). Always available
  as a safe fallback; tenants can select/re-apply it but not edit or delete it.
- **Custom theme(s)** — a tenant Admin can create/edit their own named theme(s), but the editable
  scope is bounded (ADR-064): color-token values only (e.g. Primary/Secondary button color, table
  accent color) — never layout, typography, spacing, or component structure. The System theme's
  fixed layout/type/spacing tokens (§4 Typography, Spacing, Border Radius, Grid) apply universally
  regardless of which color theme a tenant has active.
- **High Contrast**: not in MVP scope — no SoT source requests it; the System theme's WCAG AA
  contrast floor (§13) is the accessibility guarantee, not a separate high-contrast mode
  `[Assumption: this document]`.
- **Theme switching**: tenant-scoped, not per-user/per-session — a tenant Admin sets the active
  theme for their whole tenant (consistent with ADR-064's tenant Admin ownership).
- **Color token mapping**: a "theme" is a saved set of the exact same color tokens defined in §4 —
  no parallel token schema.
- **Logo variations**: not addressed by ADR-064 or any other located ADR. *Forward reference, not a
  gap in this document* — whether tenant logo upload is in MVP scope is deferred to Settings
  module's own JIT generation.

---

# 15. Internationalization Considerations

No SoT source requests multi-language support; `1-project/2-requirements.md` and `ui-ux-design-
requirements.md` are silent on i18n. This design system is built English-only, single-locale
(`en-US` date/number formatting) for MVP `[Assumption: this document]`:

- **RTL languages**: not supported in MVP; Tailwind's logical-property utilities are used where
  trivial (e.g. `ms-*`/`me-*` over `ml-*`/`mr-*`) so a future RTL pass isn't a full rewrite, but this
  is a low-cost hedge, not a stated requirement.
- **Long translations**: not a current concern (English-only).
- **Variable text lengths**: components still truncate gracefully (ellipsis + tooltip) as a general
  robustness practice, independent of i18n.
- **Locale-specific typography**: not applicable (single locale).
- **Date & number formatting**: `en-US` conventions (MM/DD/YYYY, `$1,234.56`) throughout, matching
  every dollar figure shown in the reviewed mockup.

---

# 16. Design Governance

- **Component approval process**: new components must be composed from existing shadcn/ui
  primitives + this token set first; a genuinely new primitive requires Solution Architect sign-off
  before addition to `4-ui/4-component-standards.md`.
- **Design review process**: this document set (`4-ui/`) goes through
  `4-document-review/1-document-review.md` before promotion to `approved-docs/docs-kit/4-ui/`, same
  as every other category.
- **Version management**: token changes bump this document's Version field (§Document Information)
  and are logged in §21 Revision History.
- **Contribution guidelines**: module-level UI (`5-modules/<module>/9-ui.md`) may propose new
  patterns but must justify why an existing `4-ui/` pattern doesn't fit before introducing one.
- **Deprecation policy**: a token/component is never silently removed — mark deprecated in this
  document with a migration note, remove only after all consuming modules are confirmed updated.

---

# 17. Best Practices

- Reuse existing patterns from this document and `4-ui/4-component-standards.md` before creating new
  ones.
- Avoid custom styling without Solution Architect approval (§16).
- Use design tokens instead of hard-coded values — no raw hex/px in component code.
- Keep interfaces simple — matches ADR-024's minimal direction.
- Maintain visual hierarchy via the type scale (§4) and spacing scale (§4), not font-size/color
  improvisation.
- Prioritize accessibility (§13) as a build requirement, not a post-hoc audit item.
- Design for responsiveness first (§12, `4-ui/6-responsive-design.md`).
- Keep components consistent across all 15 modules — one `4-component-standards.md`, no per-module
  variants.

---

# 18. Assumptions

- Info status color reuses Primary (`#2563EB`) rather than introducing a new hue — developer-
  confirmed during this document's generation round.
- Icon library is lucide-react rather than the mockup's Material Symbols Outlined — developer-
  confirmed during this document's generation round, to stay dependency-free of an external Google
  Fonts icon service and match shadcn/ui's standard companion set.
- High-contrast mode and full internationalization/RTL support are assumed out of MVP scope — no SoT
  source requests either `[Assumption: this document]`.
- Tenant logo variation/upload is unresolved by any located ADR — flagged as a forward reference in
  §14 to Settings module's own JIT generation, not assumed either way.

---

# 19. Constraints

- All UI must use the design tokens in §4 — no hard-coded values.
- Custom components require Solution Architect approval (§16).
- WCAG 2.2 AA accessibility compliance is mandatory (§13).
- Responsive layouts required across desktop/tablet/mobile (§12, `4-ui/6-responsive-design.md`).
- Tenant theme support (System + Custom color themes, ADR-064) must be maintained — any new
  component must be themeable via the same token layer, not hard-coded to the System theme's values.

---

# 20. Related Documents

- `4-ui/1-navigation.md`
- `4-ui/2-user-flows.md`
- `4-ui/4-component-standards.md`
- `4-ui/5-form-standards.md`
- `4-ui/6-responsive-design.md`
- `4-ui/7-accessibility.md`
- `4-ui/8-frontend-development-standards.md`
- `sot-docs/raw/1-business-requirements/ui-ux-design-requirements.md`
- `sot-docs/design/design-source.md`
- `sot-docs/design/screenshots/stitch_lbm_design/DESIGN.md` (full token source)
- `decisions-log.md` (ADR-024, ADR-025, ADR-055, ADR-056, ADR-064, ADR-101, ADR-177)

---

# 21. Revision History

| Version | Date | Author | Description |
|----------|------|--------|-------------|
| 1.0 | 2026-08-17 | Claude Code (docs-kit generation) | Initial Draft |

---

# Approval

| Role | Name | Status | Date |
|------|------|--------|------|
| UI/UX Designer | | Pending | |
| Design Lead | | Pending | |
| Solution Architect | | Pending | |

---

# AI Generation Notes

- Follows ADR-024 (UI/UX direction) and ADR-025 (Tailwind + shadcn/ui) exactly.
- Design tokens sourced directly from the reviewed Stitch mockup's `DESIGN.md`, per `design-
  source.md`'s "Screenshots" selection and ADR-177 — not generic defaults, since a real visual
  reference exists.
- Establishes a scalable visual language for all 15 modules, compatible with the ADR-064 tenant
  color-theming model without a second styling system.
- Consistency maintained across typography, colors, spacing, icons, and layouts (§4-§9).
- Accessibility, responsiveness, and maintainability treated as first-class (§12, §13, §16).
- Reused the mockup's existing visual patterns before introducing anything new; the two genuine
  deviations (icon library, Info color) were developer-confirmed rather than silently assumed.
- Kept framework-level only — component-specific behavior deferred to `4-component-standards.md`,
  page-specific layouts to `5-modules/<module>/9-ui.md`.
