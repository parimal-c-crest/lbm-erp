# Accessibility Standards

> **Purpose**
>
> This document defines the accessibility standards, usability requirements, and inclusive design
> principles for the LBM ERP Rewrite. It ensures that all users, including those with visual,
> auditory, cognitive, and motor disabilities, can effectively access and interact with the system
> while complying with recognized accessibility standards.

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | LBM ERP Rewrite |
| Accessibility Standard | WCAG 2.2 AA |
| Supported Platforms | Web |
| Version | 1.0 |
| Status | Draft |
| Author | Claude Code (docs-kit generation) |
| Created Date | 2026-08-17 |
| Last Updated | 2026-08-17 |

---

# 1. Executive Summary

Accessibility is a build requirement, not a post-hoc audit item, consistent with
`ui-ux-design-requirements.md`'s explicit instruction: "UI prioritizes accessibility, readability,
keyboard navigation, and clear visual hierarchy." Every prior `4-ui/` document in this set already
bakes accessibility requirements into its own scope (`4-ui/1-navigation.md` §13,
`4-ui/3-design-system.md` §13, `4-ui/4-component-standards.md` §8, `4-ui/5-form-standards.md` §16,
`4-ui/6-responsive-design.md` §16); this document is the consolidated, single reference for all of
it, so accessibility isn't scattered across six documents with no canonical source.

- **Accessibility goals**: every feature usable by keyboard, screen reader, and touch, at every
  breakpoint, without exception.
- **Compliance target**: WCAG 2.2 AA (§4).
- **Inclusive design philosophy**: built on shadcn/ui primitives (Radix UI), which ship correct
  ARIA/keyboard behavior by default (`4-ui/4-component-standards.md` §8) — accessibility is
  structural, not retrofitted.
- **Supported assistive technologies**: NVDA, JAWS, VoiceOver, TalkBack (§6).
- **Testing strategy**: automated + manual, at every breakpoint (§16, §13).

---

# 2. Objectives

Accessibility standards:

- Ensure equal access for all six catalog roles' users, regardless of ability.
- Meet WCAG 2.2 AA as a floor, not a target ceiling.
- Improve usability for every user, not just assistive-technology users (e.g. clear focus states
  help mouse users too).
- Support the assistive technologies in §6.
- Reduce accessibility barriers proactively — built into `4-ui/3-design-system.md` tokens and
  `4-ui/4-component-standards.md` primitives, not audited-in after the fact.
- Provide consistent interactions — the same keyboard/screen-reader pattern for the same component
  type, everywhere in the application.

---

# 3. Accessibility Principles

Every interface follows POUR (WCAG's own framework) plus this project's own emphasis:

- **Perceivable** — sufficient contrast (§7), text alternatives (§11), never color-only signaling.
- **Operable** — full keyboard operability (§5), no traps, adequate touch targets.
- **Understandable** — clear labels/instructions (§9), consistent navigation
  (`4-ui/1-navigation.md`), predictable error handling (§15).
- **Robust** — semantic HTML + correct ARIA works across current assistive-technology versions
  (§6).
- **Inclusive** — designed for the full range of the six catalog roles' users from the start, not
  retrofitted for one.
- **Consistent** — one accessibility pattern per component type (§10), reused everywhere.
- **Responsive** — accessibility holds at every breakpoint (§13, `4-ui/6-responsive-design.md` §16).
- **User-friendly** — accessibility improvements read as good UX for everyone, not a separate
  "accessibility mode."

---

# 4. Compliance Standard

**WCAG 2.2 AA** — locked target, matching `4-ui/3-design-system.md` §13's contrast commitments and
this document's own scope.

Applicable guidelines: all WCAG 2.2 Level A and AA success criteria, with particular emphasis in
this ERP context on 1.4.3 (Contrast Minimum), 1.4.4 (Resize Text), 2.1.1/2.1.2 (Keyboard/No
Keyboard Trap), 2.4.3 (Focus Order), 2.4.7 (Focus Visible), 3.3.1/3.3.2 (Error Identification/
Labels), and 4.1.2 (Name, Role, Value).

Compliance exceptions: none identified in any SoT source as of this document's generation.

Legal requirements: not specified by any SoT source (no stated jurisdiction-specific mandate, e.g.
ADA/Section 508) — WCAG 2.2 AA is adopted as the professional-standard target regardless
`[Assumption: this document]`.

---

# 5. Keyboard Accessibility

Every feature is fully operable using only the keyboard.

Requirements

- Logical tab order matching visual/DOM order (`4-ui/1-navigation.md` §13,
  `4-ui/5-form-standards.md` §16).
- Visible focus indicators — Primary-colored ring, never suppressed without a replacement
  (`4-ui/3-design-system.md` §11).
- Keyboard shortcuts: none required by any SoT source for MVP; the global search (top bar) may
  support a standard `/` or `Ctrl/Cmd+K` focus shortcut as a convenience enhancement, not a scope
  requirement `[Assumption: this document]`.
- No keyboard traps — every Dialog/Drawer/Popover releases focus correctly on close
  (`4-ui/4-component-standards.md` §8), inherited from Radix UI's focus-trap implementation.
- Accessible modal navigation — focus moves into the modal on open, is trapped within it while open,
  and returns to the triggering element on close.
- Skip navigation links — "Skip to main content" precedes the sidebar in tab order
  (`4-ui/2-user-flows.md` §16).

---

# 6. Screen Reader Support

Compatibility ensured with:

- NVDA (Windows, primary target given the developer's Windows environment and likely staff desktop
  environment).
- JAWS.
- VoiceOver (macOS/iOS).
- TalkBack (Android) — for the mobile-web experience.

Requirements

- Semantic HTML first — `<nav>`, `<main>`, `<table>`, `<button>`, `<form>` used natively wherever
  they fit, before reaching for ARIA (§18).
- Proper heading hierarchy — one `<h1>` per page (page title), `<h2>` for major sections, no skipped
  levels.
- ARIA labels on every icon-only control and composite widget, per
  `4-ui/4-component-standards.md` §8.
- Landmark regions — `<nav aria-label="Primary">` (sidebar), `<nav aria-label="Breadcrumb">`,
  `<main>` (page content), `<header>` (top bar).
- Descriptive button labels — never a bare icon with no accessible name (e.g. the delete IconButton
  carries `aria-label="Delete [record type]"`, not just a trash icon).
- Accessible form labels — every input programmatically associated with its `<label>`
  (`4-ui/5-form-standards.md` §16).

---

# 7. Color & Contrast Standards

Requirements

- Minimum WCAG contrast ratios: **4.5:1** for body text and UI component boundaries, **3:1** for
  large text (≥24px, or ≥19px bold) — matches the mockup DESIGN.md's own stated target, reused as
  this project's actual token set (`4-ui/3-design-system.md` §4/§13).
- Never rely on color alone — every status (Success/Warning/Danger/Info) pairs its color with an
  icon and/or text label (e.g. a status badge shows both the tint and the word "Shipped," not just a
  colored dot).
- High contrast mode: no separate `forced-colors` stylesheet pass is in MVP scope
  (`4-ui/6-responsive-design.md` §22) — the WCAG AA contrast floor built into every token is the
  accessibility guarantee.
- Clear error/success indicators — Danger/Success tokens plus icon plus text, never tint alone
  (`4-ui/3-design-system.md` §11).
- Accessible charts and graphs — the Dashboard's Sales Trend, Order Status, and P&L charts
  (`4-ui/2-user-flows.md` §7) each pair their visual encoding with a text/numeric label (bar values,
  donut legend percentages, progress-bar dollar figures) so the data isn't color-encoding-only;
  chart implementation additionally provides a text-table equivalent or `aria-label` summary for
  screen-reader users, per WCAG 1.1.1.

Approved contrast ratios: 4.5:1 (body/UI), 3:1 (large text) — no exceptions.

---

# 8. Typography Standards

Requirements

- Readable fonts — Inter (body) chosen specifically for legibility at data-dense sizes; Space
  Grotesk (headings) and JetBrains Mono (labels) reserved for their specific roles, never used for
  body copy (`4-ui/3-design-system.md` §4).
- Scalable text — relative units (rem) throughout, so browser text-size settings and zoom work
  correctly (`4-ui/6-responsive-design.md` §16).
- Responsive font sizing per `4-ui/6-responsive-design.md` §8 — body text never shrinks below 16px
  at any breakpoint.
- Adequate line spacing — 1.5-1.7x for body copy per `4-ui/3-design-system.md` §4 (mockup-sourced,
  chosen for legibility in information-dense ERP views).
- Adequate paragraph spacing — matches the Spacing Scale (`4-ui/3-design-system.md` §4).
- Avoid all-uppercase paragraphs — uppercase is reserved for short labels only (badges, overline
  headers, JetBrains Mono metadata labels), never body/paragraph text, both for legibility and
  because some screen readers alter pronunciation of all-caps text.

---

# 9. Forms Accessibility

Full detail in `4-ui/5-form-standards.md` §16; consolidated here:

Forms support:

- Associated labels — every input linked to its `<label>` via `for`/`id` or wrapping.
- Required field indicators — trailing asterisk + `aria-required="true"`
  (`4-ui/5-form-standards.md` §6/§9).
- Accessible error messages — `aria-describedby` linkage, `aria-live="polite"` announcement on
  submit failure (`4-ui/5-form-standards.md` §16).
- Keyboard navigation — full tab/arrow-key support per component type.
- Autofocus on validation errors — focus moves to the first invalid field after a failed submit
  (`4-ui/5-form-standards.md` §21).
- ARIA descriptions — help text linked via `aria-describedby` alongside error messages when both
  exist (error takes the primary description slot once present,
  `4-ui/5-form-standards.md` §6).
- Input purpose (`autocomplete` attribute) — standard HTML autocomplete tokens (`name`, `email`,
  `tel`, `street-address`, etc.) set on every applicable field, both for accessibility and browser
  autofill UX.

---

# 10. Interactive Components

All interactive elements (`4-ui/4-component-standards.md` §4 catalog) support:

- Keyboard interaction — per component type's standard pattern (Radix UI default behavior).
- Visible focus (`4-ui/3-design-system.md` §11).
- Screen reader compatibility — correct role/name/value exposed.
- Appropriate ARIA roles — native HTML role where possible, explicit ARIA role only where no native
  element fits (§18).
- Accessible names — every control has a programmatically determinable name (visible label, or
  `aria-label`/`aria-labelledby` for icon-only controls).
- Disabled state indication — both visual (`4-ui/3-design-system.md` §11, 40% opacity) and
  programmatic (`aria-disabled`/native `disabled` attribute).

Examples

- **Buttons** — native `<button>`, never a `<div onClick>`.
- **Dropdowns/Select/Combobox** — Radix UI `Select`/`Command` composite-widget keyboard pattern
  (Arrow keys navigate options, Enter selects, Escape closes).
- **Modals/Dialogs** — focus trap, `role="dialog"`, `aria-modal="true"`, labelled by its heading.
- **Tabs** — Radix UI `Tabs` — Arrow-key navigation between tabs, `role="tablist"`/`"tab"`/`"tabpanel"`.
- **Accordions** — `aria-expanded` on the trigger, content region linked via `aria-controls`.
- **Menus** (Dropdown Menu, Context Menu) — Arrow-key navigation, `role="menu"`/`"menuitem"`.
- **Date Pickers** — Radix UI `Calendar` — Arrow-key date navigation, announced date on focus.

---

# 11. Images & Media

Images include:

- Meaningful `alt` text for every content-bearing image (e.g. a vendor logo: `alt="[Vendor Name]
  logo"`).
- Decorative image handling — purely decorative images (background textures, if any) use `alt=""`
  so screen readers skip them, never a missing `alt` attribute.
- Responsive images per `4-ui/6-responsive-design.md` §13.

Video: not in MVP scope (`4-ui/6-responsive-design.md` §13) — if ever introduced, captions and
transcripts would be required per WCAG 1.2.2/1.2.3 `[Assumption: this document]`.

Audio: not in MVP scope — no audio content identified in any SoT source.

---

# 12. Navigation Accessibility

Navigation provides (full detail `4-ui/1-navigation.md` §13):

- Skip to content link (§5).
- Landmark regions (§6).
- Breadcrumb support — `<nav aria-label="Breadcrumb">` with an ordered list
  (`4-ui/1-navigation.md` §8).
- Accessible menus — sidebar and top-bar dropdowns follow the Interactive Components patterns (§10).
- Keyboard navigation throughout (§5).
- Current page indication — `aria-current="page"` on the active sidebar item and final breadcrumb
  segment (`4-ui/1-navigation.md` §13).

---

# 13. Responsive Accessibility

Accessibility is maintained across:

- Desktop, Tablet, Mobile — the same accessible structure/semantics at every breakpoint
  (`4-ui/6-responsive-design.md` §16), only the visual layout changes.
- Orientation changes — no orientation-specific accessibility regression
  (`4-ui/6-responsive-design.md` §17).
- Browser zoom — up to 200% without content/functionality loss (§7, WCAG 1.4.4).
- Touch devices — 44x44px minimum targets maintained everywhere touch is available
  (`4-ui/6-responsive-design.md` §14).

---

# 14. Motion & Animation

Animations (full detail `4-ui/3-design-system.md` §10):

- Are optional/subtle — never required to understand or complete a task.
- Respect `prefers-reduced-motion` — every transition in `4-ui/3-design-system.md` §10 collapses to
  instant/near-instant when set.
- Avoid flashing content — no animation flashes more than 3 times per second (WCAG 2.3.1), relevant
  to alert/notification treatments (`4-ui/2-user-flows.md` §12) which use color/icon emphasis
  instead of flashing.
- Avoid motion-triggered discomfort — no parallax or large-scale motion effects anywhere in this
  minimal, industry-standard design direction (ADR-024).
- Maintain usability without animation — every animated state (loading, transition) has a
  functionally equivalent static end-state, so a reduced-motion user loses only the transition, not
  the information.

---

# 15. Error Handling Accessibility

Error messages (full detail `4-ui/5-form-standards.md` §11, `4-ui/2-user-flows.md` §11):

- Announced to screen readers via `aria-live="polite"` on submission failure.
- Clearly identify the affected field via `aria-describedby` linkage.
- Explain corrective action, not just that an error exists.
- Remain visible until resolved — an error message doesn't auto-dismiss while its field is still
  invalid.
- Avoid relying only on color — Danger token color is always paired with an icon and text message
  (§7).

---

# 16. Accessibility Testing

### Automated Testing

- `axe-core` (via `@axe-core/react` in development, and CI integration) — primary automated check,
  matching the tooling reference already flagged as pending confirmation in
  `4-ui/4-component-standards.md` §15.
- Lighthouse accessibility audit — run against key pages (Dashboard, a representative List page, a
  representative Create form) as part of CI or pre-release checks.
- WAVE — available as a supplementary manual-spot-check browser extension, not a CI-blocking gate.

### Manual Testing

- Keyboard-only testing — every flow in `4-ui/2-user-flows.md` walked without a mouse.
- Screen reader testing — NVDA (primary), spot-checked with VoiceOver, before each major release.
- Zoom testing — 200% browser zoom on key pages.
- High contrast mode: spot-checked against OS-level forced-colors mode even though no dedicated
  stylesheet pass is built for it (§7), to confirm the WCAG-AA-by-default tokens don't break
  outright.
- Mobile accessibility — TalkBack/VoiceOver spot-check on the responsive mobile layout.

---

# 17. Accessibility Review Checklist

- Keyboard navigation verified for every new screen/flow.
- Focus visibility confirmed (never suppressed without replacement).
- Screen reader compatibility spot-checked (NVDA minimum).
- Color contrast verified against §7's ratios for every new color usage.
- Form accessibility verified per §9.
- Heading hierarchy correct (one `<h1>`, no skipped levels).
- Alt text present and meaningful for every content image (§11).
- Responsive accessibility confirmed at all three breakpoints (§13).
- ARIA usage correct and minimal — native HTML preferred (§18).
- Error announcements verified (`aria-live`, §15).

---

# 18. Best Practices

- Use semantic HTML first (`<button>`, `<nav>`, `<table>`, `<form>`) — this is the single biggest
  accessibility lever and the cheapest to get right.
- Prefer native HTML controls over custom-built equivalents wherever one exists.
- Minimize ARIA usage where native elements already convey the needed semantics — ARIA fills gaps,
  it doesn't replace correct HTML.
- Maintain heading hierarchy (§6).
- Provide descriptive link/button text — never bare "Click here" or an unlabeled icon.
- Keep focus indicators visible always (§5, `4-ui/3-design-system.md` §11).
- Test with real assistive technologies (§16), not automated tooling alone — automated checks catch
  roughly a third of real WCAG issues; manual testing is not optional.
- Design for accessibility from the start — built into `4-ui/3-design-system.md` tokens and
  `4-ui/4-component-standards.md` primitives, never a separate late-stage audit pass.

---

# 19. Assumptions

- No jurisdiction-specific legal accessibility mandate (e.g. ADA/Section 508) is stated in any SoT
  source — WCAG 2.2 AA is adopted as the professional-standard target regardless
  `[Assumption: this document]`.
- No global keyboard-shortcut requirement beyond an optional search-focus convenience shortcut
  `[Assumption: this document]`.
- No dedicated `forced-colors`/high-contrast stylesheet pass is required beyond the WCAG AA contrast
  floor already in every token `[Assumption: this document]`.

---

# 20. Constraints

- WCAG 2.2 AA compliance is required across the entire application.
- Keyboard accessibility is mandatory — no feature keyboard-inaccessible in any module.
- Screen reader compatibility is required (NVDA/JAWS/VoiceOver/TalkBack, §6).
- Accessible forms are mandatory (§9, `4-ui/5-form-standards.md`).
- Responsive accessibility is required at every breakpoint (§13).

---

# 21. Related Documents

- `4-ui/1-navigation.md`
- `4-ui/2-user-flows.md`
- `4-ui/3-design-system.md`
- `4-ui/4-component-standards.md`
- `4-ui/5-form-standards.md`
- `4-ui/6-responsive-design.md`
- `4-ui/8-frontend-development-standards.md`
- `sot-docs/raw/1-business-requirements/ui-ux-design-requirements.md`
- `decisions-log.md` (ADR-024, ADR-025)

---

# 22. Revision History

| Version | Date | Author | Description |
|----------|------|--------|-------------|
| 1.0 | 2026-08-17 | Claude Code (docs-kit generation) | Initial Draft |

---

# Approval

| Role | Name | Status | Date |
|------|------|--------|------|
| UI/UX Designer | | Pending | |
| Accessibility Reviewer | | Pending | |
| Frontend Lead | | Pending | |

---

# AI Generation Notes

- Follows WCAG 2.2 AA as the locked accessibility target (§4).
- Designs interfaces fully usable with keyboards, screen readers, and touch devices throughout
  (§5, §6, §13).
- Prefers semantic HTML over excessive ARIA usage (§18).
- Integrates accessibility into navigation, forms, components, and responsive layouts by
  consolidating (not duplicating) each of those documents' own accessibility sections.
- Includes both automated and manual accessibility testing requirements (§16).
- Treats accessibility as a mandatory quality requirement throughout — never flagged as optional
  anywhere in this document set.
- Framework-level only — module-specific accessibility considerations belong in each module's own
  `5-modules/<module>/9-ui.md`.
