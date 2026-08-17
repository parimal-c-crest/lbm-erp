# Responsive Design

> **Purpose**
>
> This document defines the responsive design standards, breakpoints, layout behavior, adaptive UI
> guidelines, and device-specific considerations for the LBM ERP Rewrite. It ensures a consistent,
> accessible, and optimized user experience across desktops, laptops, tablets, and mobile devices.

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | LBM ERP Rewrite |
| Supported Platforms | Web |
| Responsive Framework | Tailwind CSS default breakpoint scale (ADR-025) |
| Version | 1.0 |
| Status | Draft |
| Author | Claude Code (docs-kit generation) |
| Created Date | 2026-08-17 |
| Last Updated | 2026-08-17 |

---

# 1. Executive Summary

Responsive behavior is mandatory and non-negotiable per `ui-ux-design-requirements.md` and ADR-024:
"the same application must work properly on desktop, mobile, and tablet... rather than separate
desktop/mobile applications," with an explicit instruction to avoid fixed-width layouts. This
directly overrides the fixed, non-collapsing sidebar found in the reviewed Stitch mockup — corrected
here and in `4-ui/1-navigation.md` per ADR-177.

- **Responsive philosophy**: one codebase, fluid layouts/grids/flexbox, standard Tailwind
  breakpoints — never a separate mobile app or a fixed desktop-only layout.
- **Supported devices**: mobile, tablet, and desktop browsers (§4) — no native app targets in MVP.
- **Layout adaptability**: sidebar navigation collapses progressively (expanded → icon-only →
  drawer); tables adapt via horizontal scroll or card view depending on breakpoint (§11); forms
  collapse from multi-column to single-column (§10).
- **Approach**: **desktop-first** (ADR-024 explicit instruction: "Desktop-first for ERP workflows,
  while maintaining full mobile/tablet usability") — base styles target desktop, with adaptations
  applied downward through breakpoints, not the reverse. This is a deliberate deviation from this
  template's default mobile-first recommendation (§21), justified because the primary users
  (Counter/Sales Staff, Warehouse/Fulfillment Staff, Accounting/Management, Purchasing Staff, Admin)
  do their daily-volume work at a desk; mobile/tablet use is real but secondary.
- **Accessibility considerations**: zoom to 200%, reduced-motion, and keyboard support maintained at
  every breakpoint (§16).

---

# 2. Objectives

Responsive design:

- Supports every device in §4 with one shared codebase.
- Provides a consistent experience — same features reachable at every breakpoint, never a
  breakpoint-gated feature removal.
- Minimizes horizontal scrolling — the page body itself never scrolls horizontally; only deliberately
  scrollable regions (wide tables, §11) do.
- Optimizes readability — type scale and spacing adapt per `4-ui/3-design-system.md` §12.
- Maintains usability on touch devices — 44x44px minimum targets (§14).
- Improves performance across screen sizes — smaller viewports don't pay for desktop-only assets
  (§15).

---

# 3. Responsive Design Principles

Every screen is:

- Responsive — works unmodified across all breakpoints (§5).
- Flexible — Tailwind flexbox/grid utilities, no fixed pixel widths on layout containers.
- Accessible — WCAG 2.2 AA maintained at every breakpoint (§16).
- Performance optimized — lazy loading, code splitting (§15).
- Touch friendly — 44x44px targets, swipe support where natural (§14).
- Content-first — the ERP's information density (`ui-ux-design-requirements.md`: "avoid
  unnecessarily dense screens, while still supporting the information density expected in an ERP")
  drives layout decisions, not a generic template.
- Consistent — one breakpoint set (§5), used everywhere, no module defines its own.
- Scalable — new modules (ProductTracking, StoreTransfer) inherit this same responsive system
  without a redesign.

---

# 4. Supported Devices

| Device | Screen Width |
|---------|--------------|
| Mobile | 320px – 767px |
| Tablet | 768px – 1023px |
| Small Laptop | 1024px – 1279px |
| Desktop | 1280px – 1535px |
| Large Monitor | ≥1536px |

No native mobile app is in scope — mobile/tablet support means the responsive web application
rendered in a mobile/tablet browser, consistent with `1-project/4-tech-stack.md`'s Next.js/web
decision.

---

# 5. Breakpoint Standards

Tailwind CSS's default breakpoint scale (ADR-025) — reused as-is rather than a custom scale, to
avoid fighting the framework's own responsive utilities:

| Breakpoint | Width |
|------------|-------|
| (base, no prefix) | <640px |
| SM | ≥640px |
| MD | ≥768px |
| LG | ≥1024px |
| XL | ≥1280px |
| 2XL | ≥1536px |

```
base : <640px   (mobile)
sm   : ≥640px   (large mobile / small tablet transition)
md   : ≥768px   (tablet)
lg   : ≥1024px  (small laptop / tablet-landscape upper bound)
xl   : ≥1280px  (desktop)
2xl  : ≥1536px  (large monitor)
```

This project's three functional zones (§4 of `4-ui/1-navigation.md` §12, `4-ui/3-design-system.md`
§12) map onto these Tailwind breakpoints as: **Mobile** = base, **Tablet** = `md`, **Desktop** =
`lg` and above.

---

# 6. Layout Adaptation

Desktop (`lg` and above)

- Multi-column layout (dashboard grid, two-column forms).
- Persistent, expanded sidebar (`4-ui/1-navigation.md` §12).
- Full top navigation (search, branch switcher, notifications, quick actions, user menu).

Tablet (`md`)

- Reduced columns — dashboard grid drops to fewer simultaneous columns; forms may still be
  two-column where field widths allow (§10).
- Collapsible, icon-only-by-default sidebar (`4-ui/1-navigation.md` §12).

Mobile (base)

- Single-column layout throughout.
- Drawer navigation, hamburger-triggered (`4-ui/1-navigation.md` §12).
- Stacked content — every multi-column grid/section collapses to a single vertical stack.

---

# 7. Grid System

12-column fluid grid (`4-ui/3-design-system.md` §5):

| Device | Columns | Gutter | Container Width | Margins |
|---------|----------|--------|------------------|---------|
| Mobile | 4 (effectively single-column content, 4-col grid for fine alignment) | 16px | Fluid (100% − margins) | 16px |
| Tablet | 8 | 16px | Fluid (100% − margins) | 24px |
| Desktop | 12 | 24px | Max `1400px` (dashboard/ERP) or `1200px` (rare marketing-style page) | 32px |

Auto layout behavior: columns reflow via CSS Grid/Flexbox `wrap`, never via a fixed pixel
`min-width` on individual grid items that would force horizontal overflow.

---

# 8. Typography Scaling

Per `4-ui/3-design-system.md` §4/§12:

| Element | Desktop | Tablet | Mobile |
|----------|----------|---------|---------|
| Display Hero | 64px / 72px line-height | 48px / 56px (interpolated step) | 32px / 40px |
| H1 | 32px / 40px | 32px / 40px (unchanged) | 28px / 36px (steps down if content density requires) |
| H2 | 24px / 32px | 24px / 32px (unchanged) | 20px / 28px |
| Body | 16px / 24px | 16px / 24px (unchanged) | 16px / 24px (never shrunk below 16px — avoids
mobile-Safari auto-zoom-on-focus and preserves the requirement doc's readability mandate) |
| Caption | 12-14px | 12-14px | 12-14px (unchanged) |

Guidelines

- Readability is preserved at every step — body text never drops below 16px.
- Scaling is avoided where content density doesn't force it (Body/Caption stay constant across
  breakpoints; only Display Hero/H1/H2 step down, and only where a real layout constraint requires
  it).
- Visual hierarchy (heading vs. body vs. caption contrast) is preserved at every breakpoint — a
  scaled-down H1 is still clearly larger/bolder than Body at that same breakpoint.

---

# 9. Responsive Components

| Component | Desktop | Tablet | Mobile |
|---|---|---|---|
| Navigation (Sidebar/Top Bar) | Expanded sidebar + full top bar | Icon-only collapsible sidebar + full top bar (search may collapse to icon) | Hidden sidebar (drawer on trigger) + condensed top bar (`4-ui/1-navigation.md` §12) |
| Cards | Grid-arranged (e.g. 6-across KPI row) | Grid-arranged, fewer per row (e.g. 2-3-across) | Single column, stacked |
| Forms | Two-column where paired (§10) | Adaptive — two-column if width allows, else single | Single-column, full-width inputs |
| Tables | Full data table, all columns | Horizontal scroll within a bounded container, or reduced columns (§11) | Card-view (§11) |
| Modals | Centered, fixed max-width | Centered, fixed max-width (narrower) | Full-width, near-full-height sheet-style |
| Buttons | Standard size, inline groups | Standard size | Full-width within their container where they're the primary action; 44x44px floor always |
| Tabs | Horizontal tab row | Horizontal tab row (scrollable if it overflows) | Horizontal scrollable tab row, or a Select-style dropdown if more than ~4 tabs |
| Dialogs (AlertDialog/confirmation) | Centered, fixed max-width | Centered, fixed max-width | Full-width near bottom-anchored sheet |
| Charts (Sales Trend, Order Status, P&L) | Full detail, all data labels shown | Full detail, labels may abbreviate | Simplified — fewer x-axis labels, legend moves below chart, per standard responsive-charting practice |
| Lists (Activity Timeline, Alerts) | Fixed-width panel/card | Fixed-width panel/card | Full-width, stacked |

---

# 10. Form Responsiveness

Guidelines (full detail in `4-ui/5-form-standards.md` §5/§17):

Desktop

- Multi-column forms where fields pair logically (e.g. City/State, Unit Price/Quantity).

Tablet

- Adaptive spacing — gutters step down; two-column retained only where field-pair widths
  comfortably fit.

Mobile

- Single-column forms, always.
- Full-width inputs.
- Larger touch targets (44x44px floor, §14).
- Sticky action bar (Save/Cancel) anchored to the viewport bottom.

---

# 11. Table Responsiveness

**Decision**: dense ERP tables (Sales Orders, Purchase Orders, Products, Accounts, Vendors lists)
use a **breakpoint-dependent strategy**, not a single approach for all screen sizes:

- **Desktop (`lg`+)**: full data table, all columns visible.
- **Tablet (`md`)**: horizontal scroll within a bounded container (never an unscrollable overflow,
  the gap found in the reviewed mockup per ADR-177) — the table itself isn't restructured, it simply
  scrolls within its card; sticky first column (the record identifier, e.g. Order #) stays pinned
  while scrolling.
- **Mobile (base)**: card layout — each row becomes a stacked card showing the record's 2-3 most
  important fields prominently (e.g. Order #, Customer, Status for Sales Orders) with the remainder
  available on tap/expand, rather than either a cramped horizontal scroll or column hiding that
  would lose data silently.

This mirrors the options `ui-ux-design-requirements.md` explicitly names ("horizontal scrolling,
column prioritization, or card/list views") — using horizontal scroll at the tablet breakpoint
(where most columns still reasonably fit with scroll) and card view at the mobile breakpoint (where
they don't) rather than picking only one strategy for every screen size.

Column hiding/prioritization is used as a secondary technique at tablet width for tables with
unusually many columns (e.g. a future Product Tracking audit-log view) — lower-priority columns
drop before resorting to a card layout, keeping the tabular structure as long as it's genuinely
usable.

---

# 12. Navigation Responsiveness

Desktop

- Sidebar (expanded).
- Top navigation (full).

Tablet

- Collapsible sidebar (icon-only default, expandable).

Mobile

- Drawer menu (hamburger-triggered).
- Bottom navigation: not used — 10 top-level modules don't fit a bottom bar without reintroducing an
  overflow/drawer pattern (`4-ui/1-navigation.md` §12 rationale, repeated here for this document's
  own completeness).
- Hamburger menu trigger in the condensed mobile top bar.

---

# 13. Image & Media Responsiveness

Images:

- Scale proportionally — Next.js `<Image>` responsive `srcset` (`4-ui/3-design-system.md` §9).
- Use responsive formats — WebP with fallback.
- Maintain aspect ratio — explicit `width`/`height` (or `aspect-ratio` CSS) to avoid layout shift.
- Support lazy loading — default-on for below-the-fold images.
- Avoid oversized assets — served at the display size needed for the current breakpoint, not a
  single largest-possible asset everywhere.

Video: not currently required by any confirmed MVP feature (`module-list.md`) — no video content
identified. If ever added, standard responsive/aspect-ratio-preserving embedding applies
`[Assumption: this document]`.

---

# 14. Touch Interaction Standards

Interactive elements support:

- Minimum touch target size — 44x44px floor (`4-ui/4-component-standards.md` §8), applied at
  tablet/mobile regardless of visual density elsewhere.
- Swipe gestures — drawer dismiss (§6), Quick Actions slide-in panel dismiss
  (`4-ui/4-component-standards.md` §4 Overlay Components).
- Drag and drop — not required by any confirmed MVP feature; file upload (where eventually used,
  `4-ui/5-form-standards.md` §8) supports drag-and-drop as a convenience alongside click-to-browse,
  not a touch-specific requirement.
- Touch feedback — visible pressed/active state on tap (`4-ui/3-design-system.md` §11 Active state).
- Gesture accessibility — every swipe/drag interaction has a non-gesture equivalent (e.g. a visible
  close button alongside swipe-to-dismiss) — gestures are never the only way to perform an action.

---

# 15. Performance Guidelines

Responsive pages:

- Load optimized assets — Next.js Image Optimization serves the right size per breakpoint
  (§13).
- Lazy-load images and below-the-fold dashboard widgets
  (`4-ui/2-user-flows.md` §17).
- Reduce JavaScript payload — route-based code splitting per module
  (`4-ui/1-navigation.md` §16), no mobile-specific bundle needed since it's the same responsive
  codebase, just less DOM actually rendered/visible at smaller breakpoints.
- Optimize CSS — Tailwind's build-time purge keeps shipped CSS to only the utility classes actually
  used.
- Minimize layout shifts — explicit image dimensions (§13), skeleton loaders matching final content
  dimensions (`4-ui/4-component-standards.md` §Feedback Components), no late-loading web fonts that
  cause a visible reflow (`font-display: swap` with matched fallback metrics).
- Avoid blocking resources — no render-blocking synchronous scripts; the type-pairing fonts
  (`4-ui/3-design-system.md` §4 Typography) load via `next/font` for automatic self-hosting and
  optimal loading strategy, avoiding the external Google Fonts network round-trip the reviewed
  mockup's raw `<link>` tags relied on.

---

# 16. Accessibility Considerations

Responsive layouts support:

- Keyboard navigation at every breakpoint (`4-ui/1-navigation.md` §13, `4-ui/7-accessibility.md`).
- Screen readers — landmark structure and content order stay logical regardless of visual
  breakpoint reflow.
- Zoom up to 200% without loss of content or functionality (WCAG 2.2 AA 1.4.4) — layouts use
  relative units (rem/%) so browser zoom doesn't break the grid.
- High contrast: covered via the WCAG AA contrast floor built into every color token
  (`4-ui/3-design-system.md` §13) — no separate forced-colors-mode-specific overrides identified as
  required in MVP scope `[Assumption: this document]`.
- Orientation changes — layouts respond to width, not a locked orientation; a tablet rotated to
  portrait mid-session reflows using the same breakpoint logic (§5), no orientation-lock anywhere.
- Reduced motion preferences — every animation in `4-ui/3-design-system.md` §10 respects
  `prefers-reduced-motion`.

---

# 17. Orientation Support

- **Portrait**: fully supported on mobile and tablet — this is the primary orientation assumed for
  those devices' breakpoint ranges (§4).
- **Landscape**: fully supported — a landscape tablet naturally lands in or above the `lg` breakpoint
  width range in many cases and simply renders that breakpoint's layout; a landscape phone stays
  within `base`/`sm` and gets the mobile layout, just wider. No orientation-specific layout branch is
  needed beyond the existing width-based breakpoints (§5) — width, not a device-orientation media
  query, is the single source of truth for layout decisions.

---

# 18. Offline & Low Bandwidth Considerations

Not applicable — no offline mode is requested in any SoT source, and the JWT session-authenticated
model (`3-api/2-authentication.md`) assumes an active connection, consistent with
`4-ui/2-user-flows.md` §15 `[Assumption: this document]`. Standard progressive-enhancement practices
(lazy loading, §15) apply regardless, but no offline-specific caching/service-worker strategy is in
scope for MVP.

---

# 19. Testing Strategy

Responsive testing covers:

- Desktop browsers (current-version Chrome/Edge/Firefox/Safari — exact support matrix deferred to
  `4-ui/8-frontend-development-standards.md`).
- Tablet devices (real-device spot checks at minimum, given ERP data-density concerns).
- Mobile devices.
- Different resolutions within each device class (§4 device-width ranges, not a single fixed test
  width per class).
- Orientation changes (§17).
- Browser zoom (up to 200%, §16).
- Touch interactions (§14).

Testing tools

- Browser DevTools responsive-mode for rapid breakpoint iteration during development.
- Real devices for final verification of touch/gesture behavior DevTools can't fully simulate.
- Automated visual regression: tooling choice not yet confirmed. *Forward reference, not a gap in
  this document* — resolved in `4-ui/8-frontend-development-standards.md`, which itself defers final
  tool selection to `6-development/` (consistent with `4-ui/4-component-standards.md` §15's same
  item).
- Cross-browser testing per the support matrix once confirmed in
  `4-ui/8-frontend-development-standards.md`.

---

# 20. Review Checklist

- Layout adapts correctly at every breakpoint in §5.
- No horizontal scrolling on the page body — only deliberately scrollable regions (§11 tables).
- Typography remains readable — body text never below 16px (§8).
- Images scale correctly, no layout shift (§13, §15).
- Navigation works on all devices (§12).
- Forms are usable single-column on mobile, appropriately multi-column above (§10).
- Tables remain accessible via the breakpoint-dependent strategy in §11 — no silent data loss.
- Touch targets are adequate (44x44px floor, §14).
- Performance is acceptable — no unnecessary payload for smaller viewports (§15).

---

# 21. Best Practices

- This project is **desktop-first**, not mobile-first (§1) — a deliberate, ADR-024-driven deviation
  from this template's usual mobile-first default; documented explicitly so the deviation is never
  mistaken for an oversight.
- Use flexible layouts (Flexbox/Grid) throughout.
- Avoid fixed widths on layout containers — max-widths and relative units only (§7).
- Prefer relative units (%, rem) over fixed px for anything that should scale with breakpoint/zoom.
- Optimize media assets (§13, §15).
- Test on real devices for tablet/mobile, not DevTools alone (§19).
- Maintain consistent spacing per `4-ui/3-design-system.md` §4/§12 — no ad hoc per-breakpoint
  spacing values outside that scale.
- Keep interactions touch-friendly at every breakpoint where touch is plausible (tablet, mobile, and
  touch-enabled laptops) — not just below the mobile breakpoint.

---

# 22. Assumptions

- Video/media embedding beyond static images is out of MVP scope — no SoT source requests it
  `[Assumption: this document]`.
- Offline/low-bandwidth support is out of MVP scope, consistent with the JWT session-authenticated
  model `[Assumption: this document]`.
- A dedicated `forced-colors`/high-contrast-mode-specific style pass beyond the WCAG AA contrast
  floor already built into the token set is out of MVP scope
  `[Assumption: this document]`.
- Visual regression testing tooling is not yet confirmed — forward reference to
  `4-ui/8-frontend-development-standards.md`, which itself defers final tool selection to
  `6-development/`.

---

# 23. Constraints

- Responsive design is mandatory (ADR-024, `ui-ux-design-requirements.md`) — no fixed-width layouts.
- All supported browsers (§19, once confirmed) must render correctly at every breakpoint.
- Accessibility compliance is required at every breakpoint (§16).
- No horizontal scrolling for standard pages — only the deliberate table-scroll pattern in §11.
- Responsive behavior must use the approved Tailwind breakpoint scale (§5) — no module introduces
  its own custom breakpoint.

---

# 24. Related Documents

- `4-ui/1-navigation.md`
- `4-ui/3-design-system.md`
- `4-ui/4-component-standards.md`
- `4-ui/5-form-standards.md`
- `4-ui/7-accessibility.md`
- `4-ui/8-frontend-development-standards.md`
- `sot-docs/raw/1-business-requirements/ui-ux-design-requirements.md`
- `decisions-log.md` (ADR-024, ADR-025, ADR-177)

---

# 25. Revision History

| Version | Date | Author | Description |
|----------|------|--------|-------------|
| 1.0 | 2026-08-17 | Claude Code (docs-kit generation) | Initial Draft |

---

# Approval

| Role | Name | Status | Date |
|------|------|--------|------|
| UI/UX Designer | | Pending | |
| Frontend Lead | | Pending | |
| Solution Architect | | Pending | |

---

# AI Generation Notes

- Follows `4-ui/3-design-system.md`, `4-ui/1-navigation.md`, and `4-ui/4-component-standards.md`.
- Defines responsive behavior for layouts, navigation, forms, tables, and reusable components (§6,
  §9, §10, §11, §12).
- Specifies the standard Tailwind breakpoint scale (§5) and adaptive layouts for all supported
  devices (§4, §6).
- Keeps accessibility, touch usability, and performance as priorities at every screen size (§14,
  §15, §16).
- Deliberately **desktop-first** rather than mobile-first, per ADR-024's explicit instruction —
  called out clearly rather than silently deviating from this template's usual guidance.
- Framework-level only — page-specific responsive behavior belongs in each module's own
  `5-modules/<module>/9-ui.md`.
