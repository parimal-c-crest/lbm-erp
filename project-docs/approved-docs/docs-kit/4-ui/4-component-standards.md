# Component Standards

> **Purpose**
>
> This document defines the standards, behavior, appearance, accessibility, and implementation
> guidelines for all reusable UI components used throughout the LBM ERP Rewrite. It ensures a
> consistent, maintainable, and scalable user interface while enabling developers, designers, and AI
> assistants to reuse components instead of creating new ones.

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | LBM ERP Rewrite |
| UI Framework | Next.js (React, TypeScript) |
| Component Library | shadcn/ui (built on Radix UI primitives) + Tailwind CSS (ADR-025) |
| Version | 1.0 |
| Status | Draft |
| Author | Claude Code (docs-kit generation) |
| Created Date | 2026-08-17 |
| Last Updated | 2026-08-17 |

---

# 1. Executive Summary

Components are built on shadcn/ui primitives (accessible-by-default, unstyled, copied into the
codebase rather than installed as an opaque dependency — the standard shadcn/ui model) and themed
exclusively through the token set in `4-ui/3-design-system.md`. No component introduces a color,
spacing, or radius value outside that token set.

- **Component philosophy**: compose from shadcn/ui primitives first; a genuinely new primitive is
  the exception, not the default (`4-ui/3-design-system.md` §16 governance).
- **Reusability goals**: one implementation per component category (§4) shared across all 15
  modules — no per-module Button/Table/Modal variant.
- **Accessibility objectives**: inherited from Radix UI's built-in ARIA/keyboard handling (§8) — a
  component must not strip or override this.
- **Consistency principles**: identical states (§7), naming (§5), and theming (§12) across every
  component.
- **Design system integration**: every visual property traces to `4-ui/3-design-system.md` §4
  tokens.

---

# 2. Objectives

The component library:

- Maximizes reuse across all 15 modules and every future `5-modules/<module>/9-ui.md` screen.
- Maintains visual consistency by construction (shared tokens, shared primitives).
- Reduces duplicate development — no module rebuilds Table, Modal, or Form controls from scratch.
- Improves maintainability — a fix/update to a shadcn/ui primitive propagates everywhere it's used.
- Supports accessibility as a default property of every component (§8), not an added feature.
- Simplifies AI-generated UI implementation — module JIT generation references this document's
  component catalog by name instead of re-describing components.

---

# 3. Component Design Principles

Every component is:

- Reusable — no module-specific one-off duplicating an existing component.
- Configurable — via typed props, never via copy-pasted variants.
- Accessible — Radix UI ARIA/keyboard behavior preserved (§8).
- Responsive — works unmodified across desktop/tablet/mobile (§9).
- Stateless where possible — presentational components receive state via props; business/data state
  lives in the consuming page/route, not the component itself.
- Predictable — same props always produce the same rendered state.
- Easy to test — no hidden side effects, testable via props/events alone.
- Consistent — matches `4-ui/3-design-system.md` tokens exactly.

---

# 4. Component Categories

## Layout Components

- **Container** — max-width wrapper per `4-ui/3-design-system.md` §5 grid (`1400px` dashboard,
  `1200px` marketing-style pages, `680-800px` article/focus width).
- **Grid / Row / Column** — Tailwind's 12-column grid utilities, per the responsive breakpoints in
  `4-ui/6-responsive-design.md`.
- **Card** — Large radius (32px), Surface background, Medium shadow (`4-ui/3-design-system.md` §4),
  used for every dashboard widget, list-page summary block, and detail-page section.
- **Panel** — Card variant without elevation, used for nested/grouped content within a Card.
- **Divider** — 1px hairline, Border token color.
- **Spacer** — utility-only (Tailwind spacing scale), no dedicated component.

## Navigation Components

- **Sidebar** — `4-ui/1-navigation.md` §3-§4; collapsible per `4-ui/6-responsive-design.md`.
- **Top Navigation (Top Bar)** — global search, branch switcher, notifications, quick actions, user
  menu (`4-ui/1-navigation.md` §4).
- **Breadcrumb** — `4-ui/1-navigation.md` §8; shadcn/ui `Breadcrumb` primitive.
- **Tabs** — shadcn/ui `Tabs`; used for detail-page secondary navigation
  (`4-ui/1-navigation.md` §4).
- **Pagination** — shadcn/ui `Pagination`; every data table (§ Data Display below) paginates by
  default, no unbounded list rendering.
- **Stepper** — used for the Sales Order/Purchase Order multi-step creation wizard
  (`4-ui/2-user-flows.md` §13).
- **Menu / Dropdown Menu** — shadcn/ui `DropdownMenu`; used for the branch switcher, user menu, and
  row-level contextual actions in data tables.

## Form Components

Full behavior/validation rules in `4-ui/5-form-standards.md`; components themselves are shadcn/ui
primitives:

- Text Input, Textarea, Password Field, Number Input — shadcn/ui `Input`/`Textarea` variants.
- Date Picker, Time Picker — shadcn/ui `Calendar` + `Popover` composition.
- Select, Multi Select — shadcn/ui `Select` / `Combobox` (Command + Popover composition).
- Checkbox, Radio Button, Toggle Switch — shadcn/ui `Checkbox`/`RadioGroup`/`Switch`.
- File Upload — custom composition over a native file input (no direct shadcn/ui primitive);
  drag-and-drop + click-to-browse, per `4-ui/5-form-standards.md`.
- **Form Section** — a multi-section create/edit form (e.g. Header / Role Assignments / Password)
  renders each section as a bordered card: `fieldset` (or equivalent) styled
  `border-border bg-card rounded-lg border p-6`, `legend` as the section title — project-wide
  convention (ADR-194), not left to each module's own layout choice.

## Action Components

- **Button** — shadcn/ui `Button`; variants: Primary (filled, Primary token), Secondary (outlined,
  2px Primary border), Ghost (no border/background, hover tint), Destructive (Danger token, for
  delete/cancel-irreversible actions).
- **Icon Button** — `Button` with `icon` variant, 44x44px minimum touch target (§8).
- **Floating Action Button (FAB)** — used for the Quick Actions trigger only
  (`4-ui/1-navigation.md` §4), fixed bottom-right, Primary token, circular (Pill radius).
- **Split Button** — Button + adjacent `DropdownMenu` trigger, used where a primary action has
  secondary variants (e.g. "Create Order ▾" → Order / Quote / Service Contract / Quick SO).
- **Link Button** — text-only, Primary-colored, underline on hover — used for "View All," "Cancel"
  in-context actions.

## Data Display Components

- **Table** — shadcn/ui `Table`, responsive per `4-ui/6-responsive-design.md` (horizontal scroll or
  card-view fallback on mobile — never the mockup's plain non-responsive `<table>`, corrected per
  ADR-177). **Row actions** (Edit/Open, Delete, and any future per-row action) render icon-only with
  a Tooltip naming the action — no visible text label on the button itself — project-wide convention
  (ADR-193), implemented once as `frontend/src/components/shared/RowActions.tsx` and reused by every
  module's list screen rather than each module hand-rolling its own action buttons. Each icon button
  also carries an `aria-label` matching the tooltip text (§8) — the tooltip alone doesn't satisfy
  screen-reader accessible-name requirements.
- **Data Grid** — reserved for genuinely dense, sortable/filterable multi-column views (e.g. Sales
  Order line items); built as an extended `Table` with column-header sort, not a separate library.
- **List** — simple vertical item list (e.g. Active Alerts feed, Customer Activity timeline items
  from the reviewed mockup walkthrough, `4-ui/2-user-flows.md` §7).
- **Card** — see Layout Components above (dual-purpose: layout container and data-display unit,
  e.g. a KPI card).
- **Timeline** — vertical connector-line pattern (per the mockup's Customer Activity timeline,
  `4-ui/2-user-flows.md` §7), each entry: icon + text + relative timestamp.
- **Badge** — Pill radius, JetBrains Mono label text, semi-transparent tint of its semantic color
  (Success/Warning/Danger/Info/Primary), uppercase — matches mockup status-badge pattern (Picking/
  Shipped/Pending/Draft).
- **Avatar** — circular, initials fallback (matches mockup's "FA" pattern) when no image is set.
- **Tooltip** — shadcn/ui `Tooltip`; used for the standing field-level help-icon pattern (ADR-101)
  on every form field, every module, and for every icon-only list row action's label (ADR-193). A
  single `TooltipProvider` wraps the dashboard layout (`frontend/src/app/(dashboard)/layout.tsx`) so
  individual usages don't each need their own provider.
- **Accordion** — shadcn/ui `Accordion`; used for collapsible settings sections and FAQ-style help
  content.
- **Tree View** — not currently required by any confirmed module's data shape; deferred until a
  module's JIT generation identifies a genuine hierarchical-navigation need
  `[Assumption: this document]`.

## Feedback Components

- **Alert** — inline, non-dismissible-by-default banner (e.g. "Some line items couldn't load,"
  `4-ui/3-design-system.md` §8).
- **Toast** — shadcn/ui `Toast` (via `sonner` or equivalent); Success/Warning/Error/Info variants
  per `4-ui/2-user-flows.md` §12.
- **Snackbar**: not used as a separate component — Toast covers this role; avoids maintaining two
  overlapping transient-notification patterns.
- **Progress Bar** — used for P&L-style stat bars (mockup pattern) and multi-step wizard progress.
- **Spinner** — inline loading indicator for small/async actions (button loading state, §7).
- **Skeleton Loader** — shadcn/ui `Skeleton`; default loading treatment for every network-bound
  view (`4-ui/2-user-flows.md` §17) — never a blank screen during fetch.
- **Empty State** — icon + message + optional action, per `4-ui/3-design-system.md` §8 patterns.
- **Confirmation Dialog** — shadcn/ui `AlertDialog`; required before any destructive action
  (`4-ui/2-user-flows.md` §8 Delete flow).

## Overlay Components

- **Modal** — shadcn/ui `Dialog`, Glass shadow/backdrop-blur treatment (`4-ui/3-design-system.md`
  §4); short forms/confirmations only, never a full CRUD form.
- **Drawer** — shadcn/ui `Sheet`; used for the mobile navigation drawer (`4-ui/1-navigation.md`
  §12) and the Quick Actions slide-in panel (mockup pattern, right-side).
- **Popover** — shadcn/ui `Popover`; used for Date Picker, Combobox, and the branch-switcher
  dropdown content.
- **Context Menu** — shadcn/ui `ContextMenu`; used sparingly, for table-row right-click actions
  where a visible action button would otherwise crowd a dense row.
- **Dialog** — see Modal above; shadcn/ui uses `Dialog` as the base primitive name.

---

# 5. Component Naming Standards

```
PrimaryButton      → use shadcn/ui's own `Button` with variant="default", not a separate component
StatusBadge
DataTable
SalesOrderCard
KpiCard
LoadingSpinner
EmptyState
```

Guidelines

- PascalCase for every component.
- Meaningful, domain-specific names for composed components (`KpiCard`, not `Card2`); generic shadcn
  primitives keep their upstream names (`Button`, `Dialog`, `Select`) rather than being renamed.
- One component per file.
- File name matches component name exactly (`KpiCard.tsx` exports `KpiCard`).

---

# 6. Component API Standards

Every component defines: Props, Events (via callback props, e.g. `onSubmit`), Children/Slots where
composition is needed, explicit default values, and validation rules (form components only,
`4-ui/5-form-standards.md`).

Example — `KpiCard`:

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| label | string | Yes | | KPI label (e.g. "Today's Sales") |
| value | string \| number | Yes | | Displayed value |
| icon | LucideIcon | No | — | Icon shown top-left of the card |
| trend | { direction: 'up' \| 'down', value: string } | No | — | Trend badge (e.g. "+12.5%") |
| variant | 'default' \| 'critical' | No | 'default' | 'critical' applies the Danger-tinted card
treatment (mockup's Low Stock Items pattern) |
| loading | boolean | No | false | Renders Skeleton in place of value |

Example — `Button` (shadcn/ui, documented for reference):

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| variant | 'default' \| 'secondary' \| 'ghost' \| 'destructive' | No | 'default' | Visual style, per §4 Action Components |
| size | 'sm' \| 'default' \| 'lg' \| 'icon' | No | 'default' | Touch target sizing per §8 |
| disabled | boolean | No | false | Disable interaction |
| loading | boolean | No | false | Shows inline Spinner, disables interaction |

---

# 7. Component States

Every interactive component supports (full token mapping in `4-ui/3-design-system.md` §11):

- Default, Hover, Focus, Active, Disabled, Loading, Error, Success, Selected, Read-only.

Read-only differs from Disabled: a read-only field is visually legible (full-opacity text) and
selectable/copyable but not editable — used on detail-view fields shown in a form-like layout;
Disabled additionally signals "not currently actionable" (40% opacity, per
`4-ui/3-design-system.md` §11).

---

# 8. Accessibility Standards

Every component:

- Supports full keyboard navigation (Tab/Shift+Tab, Enter/Space activation, Arrow-key navigation
  within composite widgets like `Select`/`Menu`/`Tabs` — inherited from Radix UI).
- Works with screen readers — correct role, name, and state exposed via Radix UI's built-in ARIA
  wiring; never stripped by a custom wrapper.
- Carries proper ARIA attributes (`aria-label`, `aria-describedby`, `aria-expanded`,
  `aria-selected`, `aria-current` as applicable per component).
- Manages focus correctly — dialogs/drawers trap focus while open, return focus to the trigger on
  close (`4-ui/1-navigation.md` §13).
- Meets color contrast requirements (`4-ui/3-design-system.md` §13, WCAG 2.2 AA).
- Meets touch accessibility — minimum 44x44px touch target on any tappable control.
- Maintains logical tab order matching visual/DOM order.

---

# 9. Responsive Behavior

Desktop

- Full component sizing/spacing per `4-ui/3-design-system.md` §4.
- Table renders as a full data table.

Tablet

- Components retain desktop sizing; Table may drop lower-priority columns
  (`4-ui/6-responsive-design.md`).
- Dialog/Sheet width narrows to fit viewport with margin.

Mobile

- Table switches to card-view or gains horizontal scroll (module-dependent, decided per
  `4-ui/6-responsive-design.md`'s table-responsiveness rules — never left as an unscrollable
  overflow, correcting the reviewed mockup's plain-table gap per ADR-177).
- Touch-friendly control sizing enforced (§8) — no control shrinks below the 44x44px floor
  regardless of visual density elsewhere.
- Form components stack single-column (`4-ui/5-form-standards.md`).

---

# 10. Validation Standards

Applicable to form components — full detail in `4-ui/5-form-standards.md`; component-level summary:

- Required fields marked visually (asterisk + `aria-required="true"`) and validated both
  client-side (immediate) and server-side (authoritative).
- Validation messages appear inline, below the field, associated via `aria-describedby`.
- Error display uses the Danger/Error token border + icon + message (`4-ui/3-design-system.md` §4).
- Inline validation fires on blur (not on every keystroke, to avoid premature error noise) except
  for fields with an async uniqueness check (e.g. SKU/username), which debounce on input.
- Success indicators are subtle (a green check on blur for a validated field) — never a celebratory
  animation; ERP data entry favors quiet confirmation over decoration.

---

# 11. Component Events

| Event | Trigger | Payload |
|--------|----------|---------|
| onClick | Button/IconButton/Card clicked | Native MouseEvent |
| onChange | Form field value changed | New value (typed per field) |
| onSubmit | Form submitted | Validated form data object |
| onOpenChange | Dialog/Drawer/Popover open state toggled | boolean (open/closed) |
| onSelect | Select/Combobox/Menu item chosen | Selected value/id |
| onSort | Table column header clicked | { column, direction } |
| onPageChange | Pagination control used | New page number |

---

# 12. Theming Standards

Components support the ADR-064 tenant-theming model (`4-ui/3-design-system.md` §14) — System theme
plus tenant-editable Custom color themes:

- Every component consumes color via CSS variables (shadcn/ui's standard `--primary`,
  `--secondary`, etc. pattern) mapped to `4-ui/3-design-system.md` §4 tokens — never a hard-coded
  hex value in component code, so a tenant theme swap requires no component changes.
- Brand Customization is scoped exactly per ADR-064: color tokens only, never typography/spacing/
  radius — those stay fixed regardless of active theme.
- "Dark Theme" and "High Contrast" as separate toggles are not part of this project's theming model
  (§14 of `4-ui/3-design-system.md` — tenant color themes replace that pattern); components are not
  built with a separate dark-mode class variant.

---

# 13. Performance Guidelines

Components:

- Stay lightweight — presentational components avoid unnecessary computation; derived values are
  memoized only where a profiling need is shown, not preemptively.
- Avoid unnecessary re-rendering — list/table row components are pure/memoized so a single row's
  state change doesn't re-render the full table.
- Lazy-load where appropriate — Dialog/Drawer/Sheet content mounts only when opened.
- Support virtualization for large datasets — any table/list rendering >200 rows (e.g. Products,
  which `module-list.md` notes is the largest module) uses row virtualization rather than rendering
  the full set.
- Minimize DOM complexity — compose from shadcn/ui primitives rather than deeply nested custom
  markup.

---

# 14. Documentation Requirements

Each reusable component includes, in its own file-level doc comment or Storybook-equivalent entry:

- Purpose (one sentence).
- Usage example (a minimal working snippet).
- Full Props table (§6 format).
- Events (§11 format, where applicable).
- Accessibility notes (any deviation from or addition to §8's defaults).
- Responsive behavior notes (any deviation from §9's defaults).
- Known limitations (e.g. "Table virtualization not yet wired for the Data Grid variant").

Screenshots are not required per-component in this MVP (no visual regression tooling confirmed in
scope) — deferred to `4-ui/8-frontend-development-standards.md`'s testing tooling decision.

---

# 15. Testing Standards

Each reusable component has:

- Unit tests (props → rendered output/behavior).
- Accessibility tests (automated, e.g. `axe-core` integration — confirmed tooling choice deferred to
  `4-ui/8-frontend-development-standards.md`).
- Responsive tests (rendered correctly at each `4-ui/6-responsive-design.md` breakpoint).
- Interaction tests (click/keyboard/focus behavior).
- Visual regression tests: not confirmed in MVP tooling scope. *Forward reference, not a gap in this
  document* — exact tool resolved in `4-ui/8-frontend-development-standards.md`, which itself
  defers final tool selection to `6-development/`.
- Snapshot tests: used sparingly (only for stable, low-churn components) to avoid brittle-snapshot
  churn on every token tweak.

---

# 16. Component Lifecycle

```
Initialize (props received)
      ↓
Render
      ↓
User Interaction
      ↓
State Update (local or via parent callback)
      ↓
Re-render
      ↓
Unmount / Destroy
```

Server Components (Next.js App Router) skip the interaction/state-update loop entirely for
non-interactive display components — only Client Components (`"use client"`, interactive
components) follow the full lifecycle above.

---

# 17. Versioning & Deprecation

- Component version tracked implicitly via this document's Revision History (§22) — no separate
  per-component semver in MVP (single-application consumer, not a published package).
- Breaking changes to a shared component are called out in this document's revision entry and
  require updating every consuming module in the same change, not a staged rollout.
- Deprecation notice: a component marked deprecated here stays functional but is flagged
  "Deprecated — use `<Replacement>`" in its doc comment (§14) until all consumers migrate.
- Migration guide: included in the deprecation entry when the replacement isn't a drop-in API match.
- Replacement component named explicitly, never "see design system" without a specific pointer.

---

# 18. Best Practices

- Reuse existing components (§4) before creating new ones.
- Keep each component focused on one responsibility — a `SalesOrderCard` displays, it doesn't also
  fetch its own data.
- Prefer composition over inheritance/prop-explosion — a complex variant is composed from smaller
  primitives, not a single component with 20 conditional props.
- Avoid business logic inside components — validation *rules* live in
  `4-ui/5-form-standards.md`/module business-rules documents; components only render/enforce them.
- Keep props simple and well documented (§6, §14).
- Follow `4-ui/3-design-system.md` for every visual property.
- Ensure accessibility by default (§8) — not bolted on after the fact.
- Maintain consistent naming (§5) and behavior across every module.

---

# 19. Assumptions

- Tree View is deferred until a module's JIT generation identifies a genuine need
  `[Assumption: this document]`.
- Visual regression testing tooling is not yet confirmed — forward reference to
  `4-ui/8-frontend-development-standards.md`, which itself defers final tool selection to
  `6-development/`.
- No published/versioned component package — components live inside the single Next.js application,
  not a separately versioned library `[Assumption: this document]`.

---

# 20. Constraints

- All UI must use these approved reusable components; a new component requires the approval process
  in §16 of `4-ui/3-design-system.md`.
- Accessibility compliance (§8) is mandatory, inherited from Radix UI, never stripped.
- Components must support responsive layouts (§9).
- Design tokens (`4-ui/3-design-system.md` §4) must be used for all styling — no hard-coded values.

---

# 21. Related Documents

- `4-ui/3-design-system.md`
- `4-ui/1-navigation.md`
- `4-ui/2-user-flows.md`
- `4-ui/5-form-standards.md`
- `4-ui/6-responsive-design.md`
- `4-ui/7-accessibility.md`
- `4-ui/8-frontend-development-standards.md`
- `decisions-log.md` (ADR-025, ADR-064, ADR-101, ADR-177)

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
| Frontend Lead | | Pending | |
| Solution Architect | | Pending | |

---

# AI Generation Notes

- Follows `4-ui/3-design-system.md` and shadcn/ui's own component model exactly.
- Defines component standards in terms of shadcn/ui primitives (framework-specific, matching the
  locked ADR-025 stack, rather than framework-agnostic — appropriate here since the frontend
  framework is already locked, unlike a generic template context).
- Specifies component APIs, states, accessibility, responsiveness, and the ADR-064 theming model.
- Encourages reuse over new components (§4, §18).
- Keeps business logic outside UI components (§18).
- Every component documented, testable, and consistent with `4-ui/3-design-system.md`.
- Does not include page-specific layouts or module-specific implementations — those belong in
  `4-ui/3-design-system.md` §6 Layout Standards and each module's own `5-modules/<module>/9-ui.md`.
