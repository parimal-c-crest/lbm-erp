# Form Standards

> **Purpose**
>
> This document defines the standards, conventions, validation rules, layout guidelines,
> accessibility requirements, and user experience principles for all forms within the LBM ERP
> Rewrite. It ensures every form is consistent, intuitive, secure, accessible, and easy to maintain
> across all modules.

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | LBM ERP Rewrite |
| UI Framework | Next.js (React, TypeScript) |
| Validation Framework | `react-hook-form` + `zod` (frontend, ADR-174) / `class-validator` +
`class-transformer` (backend DTO, ADR-174) — shared schema shape |
| Version | 1.0 |
| Status | Draft |
| Author | Claude Code (docs-kit generation) |
| Created Date | 2026-08-17 |
| Last Updated | 2026-08-17 |

---

# 1. Executive Summary

Forms are the primary data-entry surface for an ERP with 209+ business rules in its largest single
module (Products, per `claude-docs/analysis/module-list.md`) — correctness and clarity matter more
here than anywhere else in the UI. Every form uses `react-hook-form` for state/validation
orchestration and `zod` for schema definition, mirroring the same validation shape the NestJS
backend enforces via `class-validator` (ADR-174) — client-side validation is a UX convenience,
never the security boundary (consistent with `4-ui/1-navigation.md` §19's server-Guard principle).

- **Form design philosophy**: minimal required input, business terminology throughout, inline
  validation that never blocks the user from seeing what they already entered.
- **UX goals**: multi-column desktop, single-column mobile (`ui-ux-design-requirements.md`), no
  form ever loses entered data on a validation failure.
- **Validation strategy**: shared `zod` schema on the client mirrors the backend DTO shape;
  server-side is authoritative, client-side is immediate feedback.
- **Accessibility objectives**: every field independently operable and understandable via keyboard
  and screen reader (§16).
- **Consistency principles**: one field-layout pattern (§6), one error-message voice (§11), one
  button-order convention (§13) — reused across every module's forms.

---

# 2. Objectives

Form standards:

- Ensure a consistent user experience across all 15 modules' create/edit forms.
- Reduce user errors via inline validation and clear labeling (§7, §10).
- Improve data quality — validation enforces the same business rules server and client agree on.
- Simplify development — one shared `zod`-schema-to-form pattern, not a bespoke approach per module.
- Support accessibility as a default property (§16).
- Enable reusable form components, built on `4-ui/4-component-standards.md`'s Form Components
  category.

---

# 3. Form Design Principles

Every form is:

- Simple — no field appears unless a business rule or workflow genuinely requires it.
- Clear — business terminology (§7), never internal/database field names.
- Consistent — same layout, validation timing, and button order across modules.
- Accessible — WCAG 2.2 AA (§16, `4-ui/3-design-system.md` §13).
- Responsive — multi-column desktop → single-column mobile (§17).
- Secure — client validation is convenience only; server validation is authoritative (§18).
- Efficient — minimal required fields, sensible defaults, autofocus on the first field/first error.
- Easy to complete — logical field grouping, progressive disclosure for advanced/rare fields.

---

# 4. Form Types

- **Create Form** — Sales Order, Purchase Order, Account, Product, Vendor, Location, Pricing Rule,
  User.
- **Edit Form** — same shape as Create, pre-populated, per `4-ui/2-user-flows.md` §8.
- **View Form** — read-only field layout (detail screens presented in form-like structure for
  scannability, e.g. an Account's Billing tab) — uses Read-only state (§14), not a disabled form.
- **Search Form** — inline in list-page header, per `4-ui/1-navigation.md` §11.
- **Filter Form** — collapsible panel/drawer off the list page, module-specific filter fields.
- **Login Form** — email/username + password, per `4-ui/2-user-flows.md` §6.
- **Registration Form**: not applicable — users are provisioned by an Admin (Users module), there is
  no self-service registration flow in this internal ERP `[Assumption: this document]`.
- **Multi-step Wizard** — Sales Order / Purchase Order creation (`4-ui/2-user-flows.md` §13).
- **Settings Form** — sectioned single-column, per `4-ui/3-design-system.md` §6 Settings Page
  layout.

---

# 5. Form Layout Standards

### Single Column

Used for:

- Mobile (all forms, `ui-ux-design-requirements.md` mandate).
- Login/password-reset (short, focused forms — single column regardless of viewport).
- User profile / narrow settings sections.

### Two Column

Used for:

- Desktop, tablet-landscape.
- Business/ERP data-entry forms with related-field pairs (e.g. City / State, Unit Price / Quantity).

Guidelines

- Logical grouping — related fields (e.g. billing address block) stay visually grouped, never split
  across columns mid-group.
- Consistent spacing — `4-ui/3-design-system.md` §4 Spacing Scale (`MD`/16px between fields within a
  group, `XL`/32px between groups).
- Clear section headings — Heading 2 token, per `4-ui/3-design-system.md` §4 Typography, for each
  logical section (e.g. "Billing Information," "Line Items").
- Responsive — two-column collapses to single-column at the `4-ui/6-responsive-design.md` mobile
  breakpoint, never mid-tablet (avoids a jarring reflow at an awkward width).

---

# 6. Field Layout Standards

- **Label position**: above the input (not inline/floating-label) — clearer at the information
  density an ERP form requires, and avoids floating-label's known accessibility/legibility issues.
- **Required indicator**: a trailing asterisk (`*`) after the label, plus `aria-required="true"` on
  the input — never color alone.
- **Help text placement**: below the label, above the input, when it's genuinely instructional; the
  standing per-field help icon (ADR-101) sits inline next to the label for reference documentation,
  which is a separate concern from a help-text hint.
- **Validation message placement**: directly below the input, replacing help text when both would
  otherwise show (validation takes priority once a field has an error).
- **Input spacing**: `MD` (16px) vertical gap between stacked fields.
- **Section spacing**: `XL` (32px) between field groups/sections.

```
Label *  [help icon]

Input Field

Helper text (if applicable)

Validation message (replaces helper text once the field has an error)
```

---

# 7. Field Naming Standards

Labels:

- Are concise.
- Use business terminology sourced from each module's own field documentation, not database column
  names (e.g. "Ship Date," never `ship_dt`).
- Avoid abbreviations.
- Are sentence case.
- Match business documentation exactly, including each module's own `5-modules/<module>/` naming
  once generated — a form label is never invented independently of that source.

Examples

✓ Customer Name
✓ Ship Date
✓ Unit Price

✗ CustName
✗ ShipDt
✗ UPrice

---

# 8. Input Component Standards

Built on `4-ui/4-component-standards.md`'s Form Components (shadcn/ui primitives):

### Text Input / Text Area
Purpose: free-text fields (names, addresses, notes). Validation: `zod` string schema (min/max
length, format regex where applicable). Default: empty string, never `null` in the form's internal
state. Accessibility: `aria-required`, `aria-invalid`, `aria-describedby` wired automatically by the
shared form-field wrapper component. Responsive: full-width within its column at every breakpoint.

### Password
Purpose: login/password-change only. Validation: min-length + complexity rule sourced from the
Users module's own auth rules (JIT, not yet extracted). Default: empty. Masked by default with a
visibility-toggle icon button.

### Number / Currency
Purpose: quantities, prices, monetary totals. Validation: `zod` number schema with min/max/step per
field's business rule. Currency fields display with the `en-US` formatting convention
(`4-ui/3-design-system.md` §15) and store as a decimal, never a floating-point-rounded value.
Default: `0` or empty depending on whether zero is a valid business value for that field (decided
per field, not a blanket rule).

### Date Picker / Time Picker / Date & Time
Purpose: dates (ship date, order date), where time-of-day matters (e.g. delivery windows).
Validation: valid date range per field's business rule (e.g. Ship Date cannot precede Order Date —
cross-field validation, §10). Default: empty unless a field's business rule defines a sensible
default (e.g. Order Date defaults to today). Uses shadcn/ui `Calendar` + `Popover`.

### Checkbox / Radio Button / Toggle
Purpose: boolean/single-choice-from-small-set fields. Toggle used specifically for binary
settings-style fields (e.g. "Push to QuickBooks," per ProductTracking's ADR-168 boolean-never-blank
rule) where an on/off switch reads more clearly than a checkbox.

### Select / Multi Select / Autocomplete
Purpose: choice from a defined or looked-up set (e.g. Location, Vendor). Autocomplete (shadcn/ui
`Combobox`) used once a lookup list exceeds ~15-20 items (e.g. Products, Accounts) — plain `Select`
below that threshold. Validation: value must exist in the current lookup set (referential integrity
check, mirrored server-side).

### File Upload / Image Upload
Purpose: attachments (e.g. a Purchase Order's supporting document, if any module requires it — not
yet confirmed for MVP scope beyond what's in `module-list.md`). Validation: file type allowlist,
size limit (§18). Not required by any confirmed MVP field as of this document's generation —
included here as a standard, ready-to-use pattern for when a module's JIT generation needs it.

### Rich Text Editor
Not currently required by any confirmed module field; deferred until a module's JIT generation
identifies a genuine need `[Assumption: this document]`.

---

# 9. Required Fields

- Clearly identified via the trailing asterisk convention (§6).
- Kept minimal — a field is required only where the underlying business rule (module-level, JIT)
  genuinely requires it, never by default.
- Indicator is consistent everywhere — no module uses a different required-field convention.

```
Customer Name *
```

---

# 10. Validation Standards

Validation includes:

- **Required** — `zod` `.min(1)`/non-optional schema entry.
- **Format** — regex/refined `zod` types (email, phone, SKU pattern, etc.), sourced from each
  module's own business-rules documentation once generated.
- **Length** — `zod` min/max on string fields.
- **Range** — `zod` min/max on numeric/date fields.
- **Business rules** — module-specific `zod` `.refine()`/`.superRefine()` logic, mirroring the
  server's `class-validator` custom validators (ADR-174) so both layers agree by construction, not
  by manual synchronization.
- **Duplicate checks** — async validation (debounced, §19) against the backend for fields requiring
  uniqueness (e.g. SKU, username).
- **Cross-field validation** — `zod` `.superRefine()` for rules spanning multiple fields (e.g. Ship
  Date ≥ Order Date).

Validation timing

- **On blur** — default for most fields; avoids error noise while the user is still typing.
- **On submit** — final, complete validation pass before the request is sent.
- **Real-time** — used only for async uniqueness checks (debounced) and password-strength meters;
  never for simple required/format checks, to avoid premature error flashing.

---

# 11. Error Message Standards

Error messages:

- Are clear and specific to the field.
- Explain the problem, not just that one exists.
- Suggest corrective action where the fix isn't obvious from the message alone.
- Use consistent wording across every module (a shared message-template set per validation type,
  not freehand text per field).
- Appear near the affected field (§6 — directly below the input).

Examples

✓ "Email address is required."
✓ "Unit Price must be greater than 0."
✓ "Ship Date cannot be earlier than Order Date."

✗ "Invalid input." (not specific)
✗ "Error 400." (exposes implementation detail, not user-facing)

---

# 12. Success Feedback

Examples

- "Sales order saved successfully."
- "Product updated successfully."
- "Vendor created successfully."
- "Settings saved successfully."

Guidelines

- Immediate feedback — toast notification (`4-ui/2-user-flows.md` §12) fires on successful
  save/update, not a delayed batch confirmation.
- Non-intrusive — auto-dismissing toast, never a blocking modal for a routine success.
- Clear next action — after Create, the user lands on the new record's Detail screen
  (`4-ui/2-user-flows.md` §8), which itself is the "next action" (no separate "what now?" prompt
  needed).

---

# 13. Form Actions

Standard actions, in fixed left-to-right/top-to-bottom order (never reordered per module):

- Cancel / Back (leftmost, lowest visual weight — Ghost button)
- Save Draft (where applicable, e.g. Sales/Purchase Order wizard)
- Save & New (secondary weight — Secondary button)
- Save / Update / Submit (rightmost, highest visual weight — Primary button)

Delete is never placed alongside Save actions — it lives in the record's own contextual-actions
menu on the Detail screen (`4-ui/1-navigation.md` §4), guarded by a confirmation dialog
(`4-ui/2-user-flows.md` §8), to prevent an accidental adjacent-click delete.

Reset (clear-the-form-back-to-defaults) is not included as a standard action — it more often causes
accidental data loss than helps; a user who wants to start over uses Cancel/Back
`[Assumption: this document]`.

---

# 14. Form States

Every form supports:

- **Empty** — Create form on first load, no data entered.
- **Draft** — partially completed, explicitly saved as draft (Sales/Purchase Order wizard only;
  most CRUD forms have no draft concept — they're either unsaved or saved).
- **Editing** — active user input.
- **Read-only** — View Form (§4), fields rendered without input chrome, still selectable/copyable.
- **Disabled** — field or whole form not currently actionable (e.g. a field locked by another
  field's value, or the whole form while a save is in flight — see Saving below).
- **Loading** — initial data fetch for Edit/View forms (skeleton, `4-ui/4-component-standards.md`
  §Feedback Components).
- **Saving** — submit in flight; Save button shows its Loading state (§7 of
  `4-ui/3-design-system.md`), form fields disabled to prevent a duplicate submit.
- **Validation Error** — one or more fields failed validation; error summary optionally shown at
  the top of long forms in addition to inline messages.
- **Success** — brief post-save state before navigation to Detail (§12).

---

# 15. Multi-Step Forms

Applies to Sales Order / Purchase Order creation (`4-ui/2-user-flows.md` §13):

- **Step indicator**: horizontal stepper (`4-ui/4-component-standards.md` Navigation Components),
  shows all steps, current step highlighted, completed steps checked.
- **Previous / Next**: standard navigation between steps; Next is disabled until the current step's
  required fields validate.
- **Save Draft**: available at every step (order/PO draft lifecycle, `4-ui/1-navigation.md` §7).
- **Review**: final step before Submit — read-only summary of every prior step's entered data.
- **Submit**: only enabled from the Review step.
- **Progress tracking**: step indicator state persists if the user navigates away and returns via
  Save Draft (`4-ui/2-user-flows.md` §9 state-persistence principle).

---

# 16. Accessibility Standards

Forms support:

- Full keyboard navigation — logical tab order matching visual layout (§5/§6), including within
  two-column layouts (top-to-bottom within a column before moving to the next, not row-by-row
  across columns, unless the two columns are a genuinely paired field like City/State).
- Screen reader support — every field's label, help text, and error programmatically associated
  (`aria-describedby`, `aria-labelledby`).
- ARIA labels on every input, including icon-only actions (e.g. password visibility toggle).
- Visible focus indicators (`4-ui/3-design-system.md` §11), never suppressed.
- Accessible error messages — announced via `aria-live="polite"` region on submit failure, so a
  screen reader user is told validation failed without needing to re-scan the form.
- Touch-friendly controls — 44x44px minimum touch target (`4-ui/4-component-standards.md` §8),
  applies to every input, checkbox, radio, and button.

---

# 17. Responsive Behavior

Desktop

- Two-column layout where field pairing supports it (§5).

Tablet

- Reduced spacing (`4-ui/3-design-system.md` §12) — gutters step from 24px to 16px.
- Adaptive — two-column layout may collapse to single-column earlier than desktop if a tablet's
  portrait width can't comfortably fit two columns for a given form's field widths.

Mobile

- Single-column layout, always (§5).
- Larger touch targets — enforced floor, not just "roomier" (§16).
- Sticky action buttons — the Save/Cancel action bar (§13) sticks to the viewport bottom on mobile
  so it's always reachable without scrolling back up a long form.

---

# 18. Security Guidelines

Forms:

- Validate on both client (`react-hook-form` + `zod`) and server (`class-validator`) — client-side
  is UX convenience only (§10, `4-ui/1-navigation.md` §19).
- Are protected from CSRF via the API's existing auth model (JWT bearer tokens, not cookie-session
  based — per `3-api/2-authentication.md` — which structurally avoids classic CSRF rather than
  requiring a separate CSRF token).
- Sanitize input server-side before persistence (backend responsibility, `class-transformer`/
  business-logic layer) — the form layer's job is correct typed data, not sanitization itself.
- Prevent XSS by never rendering user-submitted form data as raw HTML — React's default escaping
  covers this; any field that must support rich text (§8 Rich Text Editor, if ever added) requires
  an explicit sanitization step before render.
- Validate uploaded files — type allowlist and size limit enforced both client-side (immediate
  rejection) and server-side (authoritative).
- Limit upload size — exact limit deferred to the owning module's JIT generation once a file-upload
  field is actually confirmed in scope (*forward reference, not a gap in this document*).
- Never trust client-side validation alone for any field that affects a financial or inventory
  outcome (pricing, quantities, statuses) — server validation is the actual gate.

---

# 19. Performance Guidelines

- Lazy-load large lookup data — Autocomplete/Combobox options (§8) fetched on-demand/paginated
  server-side for large sets (Products, Accounts), never loaded as one giant client-side array.
- Debounce search fields and async uniqueness checks (§10) — 300ms standard debounce.
- Cache dropdown values where appropriate — stable, rarely-changing lookups (e.g. Location list)
  cached for the session; volatile lookups (e.g. current stock) always fetched fresh.
- Avoid unnecessary validation requests — async checks fire only on the specific field that needs
  them, not the whole form on every keystroke.
- Optimize large forms — the Sales/Purchase Order wizard's per-step field set (§15) is one
  performance technique already built in: only the current step's fields are mounted/validated at
  once, not the entire multi-step form.

---

# 20. Review Checklist

- Labels are clear and match business terminology (§7).
- Required fields identified consistently (§9).
- Validation implemented client- and server-side (§10, §18).
- Error messages documented and follow the standard voice (§11).
- Responsive layout verified at all three breakpoints (§17).
- Accessibility tested — keyboard, screen reader, contrast (§16).
- Security validation included — server-authoritative, file-upload limits set (§18).
- Actions consistent with §13's fixed order.
- Business rules implemented — sourced from the owning module's own documentation, not invented at
  the form layer.

---

# 21. Best Practices

- Keep forms as short as possible — only business-required fields (§9).
- Group related fields (§5, §6).
- Minimize required inputs.
- Use the appropriate input control for the data type (§8) — never a free-text field for something
  that should be a Select/Date Picker.
- Display inline validation (§10, §11).
- Preserve entered data after validation errors — a failed submit never clears the form.
- Autofocus the first field on Create; autofocus the first invalid field after a failed validation
  pass.
- Maintain consistent button placement and order (§13).
- Reuse approved form components from `4-ui/4-component-standards.md` — no bespoke input control
  built at the form/module level.

---

# 22. Assumptions

- No self-service registration form exists — Admin provisions users (`[Assumption: this document]`,
  consistent with the Users role catalog's Admin-only "Users/role management" scope).
- Reset (clear-form) is intentionally excluded from standard Form Actions — accidental-data-loss
  risk outweighs its convenience `[Assumption: this document]`.
- Rich Text Editor and File/Image Upload are documented as available patterns but not required by
  any currently-confirmed MVP field `[Assumption: this document]`.
- Exact file-upload size limits are deferred to per-module JIT generation (*forward reference, not a
  gap in this document*).

---

# 23. Constraints

- All forms must follow `4-ui/3-design-system.md` tokens and `4-ui/4-component-standards.md`
  components.
- Client and server validation are both mandatory (§18) — server is authoritative.
- Accessibility compliance (§16) is required, WCAG 2.2 AA floor.
- Responsive layouts are mandatory (§17).
- Standard reusable form components (`4-ui/4-component-standards.md`) must be used — no bespoke
  input implementations.

---

# 24. Related Documents

- `4-ui/3-design-system.md`
- `4-ui/4-component-standards.md`
- `4-ui/6-responsive-design.md`
- `4-ui/7-accessibility.md`
- `3-api/1-api-design.md` / DTO validation conventions
- `decisions-log.md` (ADR-101, ADR-168, ADR-174)

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
| Product Owner | | Pending | |

---

# AI Generation Notes

- Follows `4-ui/3-design-system.md`, `4-ui/4-component-standards.md`, and the locked validation
  stack (`react-hook-form` + `zod` client / `class-validator` server, ADR-174).
- Recommends reusable, accessible, responsive form components sourced from
  `4-ui/4-component-standards.md`'s Form Components category — no new components introduced here.
- Defines validation, layout, feedback, and security standards applicable to every form.
- Client-side and server-side validation kept consistent by construction (shared schema shape,
  ADR-174), not by manual synchronization discipline.
- Minimizes user effort while maximizing data quality (§3, §9, §21).
- Reuses existing components/patterns; the two out-of-scope input types (Rich Text Editor, File/
  Image Upload beyond the standard pattern) are documented but not built until a module needs them.
- Kept framework-level — module-specific field sets/business rules belong in each module's own
  `5-modules/<module>/9-ui.md`, generated JIT.
