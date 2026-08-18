# UI Specification — UOM

# Document Information

| Field | Value |
|--------|-------|
| Module | UOM |
| Version | 1.0 |
| Status | Draft |
| Author | Claude Code (docs-kit generation) |
| Last Updated | 2026-08-18 |

---

# 1. Overview

**Purpose**: define UOM's own admin screens (Category, Type, Functional Role, Group management).

**Scope**: pure configuration/CRUD screens — UOM has no customer-facing screen and no
transactional-entry screen of its own (unit selectors on SalesOrder/PurchaseOrder line items are
those modules' own UI, consuming UOM's data — `1-module.md` §3 Out of scope).

**Target users**: Admin role only (`7-permissions.md`).

**References to project UI standards**: `4-ui/3-design-system.md` (tokens/components),
`4-ui/4-component-standards.md` (DataTable, Dialog, Sheet, Form primitives).

**No module-specific visual reference exists.** `sot-docs/design/design-source.md` provides only a
project-wide style/token reference (the Stitch mockup) — it contains no UOM-specific screenshot or
mockup to walk literally (confirmed by grepping `design-source.md` for "UOM": no match). Per
`05-modules/modules.md` step 6a, this document is therefore built from the project's shared
component library and the legacy functional description (`screens-and-user-flows.md`), not from a
literal screen-by-screen visual walkthrough — there is nothing UOM-specific to walk.

---

# 2. Screen Inventory

| Screen | Purpose |
|----------|---------|
| Category List/Edit | Manage UOM Categories (FR-001) |
| Type List/Edit | Manage UOM Types (FR-002) |
| Functional Role List/Edit | Manage UOM Functional Roles (FR-003) |
| Group List | Browse UOM Groups (FR-004) |
| Group Detail/Edit | The central screen — Base Type, Category, Role Assignments, Conversion
Factors, Picking Hierarchy, all together (FR-004 through FR-008) |
| Conversion Factor History (panel within Group Detail) | View effective-dated rate history for a
(Group, Type) pair (FR-007) |
| Import/Export dialog | Bulk import/export UOM Group data (FR-011) |

Legacy's separate "Manage UOM Qty Pricing" and "Orgill UOM reference" screens are **not** carried
forward — the former is superseded by Pricing's own live-resolution UI (`1-module.md` §3 Out of
scope), the latter is an unrelated vendor-catalog reference outside this module's domain.

---

# 3. Navigation

**Entry points**: Settings → System Configuration → Unit of Measure (per `1-module.md` §10's
flagged Assumption — placement under Settings/System Configuration mirrors ADR-095's own
per-module role-mapping screens, but is not independently locked by any ADR; confirm during review).

**Navigation paths**: Unit of Measure landing → tabs or sub-nav for Categories / Types / Functional
Roles / Groups, consistent with the tabbed-sub-section pattern used elsewhere in Settings.

**Breadcrumbs**: `Settings / Unit of Measure / [Categories|Types|Functional Roles|Groups]`, and
`Settings / Unit of Measure / Groups / {Group name}` on the Group Detail screen.

**Back navigation**: standard browser/app back returns to the Group List from Group Detail, and to
the Unit of Measure landing from any sub-section list.

**Related screens**: Products' own product-edit screen displays (read-only, from this module's
perspective) the assigned Group's Role Assignments when rendering unit-dropdown options — that
screen belongs to Products' own `9-ui.md`, not this document.

---

# 4. Screen Specifications

## Category List/Edit

**Purpose**: browse, create, rename, and soft-delete UOM Categories.

**Layout**: standard `DataTable` (project component standard) with an inline "Add Category" action
opening a small `Dialog` (per `4-ui/4-component-standards.md` §Overlay Components) with Name and
Sort Order fields.

**Displayed columns**: Name, Sort Order, Created At.

**Filters**: search by name.

**Sorting**: by Name or Sort Order (default: Sort Order ascending).

**Pagination**: standard `DataTable` pagination (`3-api/4-query-standards.md`-backed).

**Available actions**: Add, Edit (opens the same Dialog pre-filled), Delete (soft-delete, with a
confirmation Dialog; blocked with an inline error if BR-014's in-use guard rejects it — see §10 UI
States).

**Permissions**: Admin only (§7-permissions.md).

**Empty state**: "No Categories yet — add one to start organizing UOM Groups." with an Add action.

**Loading state**: standard `DataTable` skeleton rows.

**Error state**: standard project-wide inline error banner on load failure.

---

## Type List/Edit

Same layout/interaction pattern as Category List/Edit, for `UOMType`. Delete blocked-state message
names the specific Group/Role/Factor/Hierarchy reference type when the in-use guard fires (per
`7-permissions.md`'s VR-015/BR-014 error surfacing convention), not a generic "in use" message.

**Category picker (ADR-192)**: the Type create/edit Dialog gains an **optional** Category dropdown
(listing every non-deleted `UOMCategory`, plus a "None" option) alongside Name and Sort Order. Since
`UOMType.category_id` is optional (BR-010/`4-schema.md`), the dropdown defaults to unselected/"None"
and leaving it unselected is a valid save, not a validation error.

---

## Functional Role List/Edit

Same layout/interaction pattern, for `UOMFunctionalRole`. Seeded starter rows (Selling, Pricing,
Stocking, Physical Inventory, Picking, Purchase, Purchase-Cost, Receiving, Reporting, Inner-Pack,
Outer-Pack — `5-data-dictionary.md` §5) appear pre-populated but remain fully rename/delete-able
like any other row (ADR-094 — nothing is hardcoded/protected).

**Delete-in-use guard (ADR-192, BR-014)**: deleting a Functional Role still referenced by any Role
Assignment is blocked exactly the same way as Category/Type — the same disabled/blocked Delete
affordance with an inline error naming which Groups' Role Assignments still reference it, per
`7-permissions.md`'s VR-020/BR-014 error-surfacing convention. This confirms, rather than changes,
this screen's existing behavior — previously only an unconfirmed extension of the Type/Category
pattern.

---

## Group List

**Purpose**: browse UOM Groups.

**Layout**: standard `DataTable`.

**Displayed columns**: Name, Category, Base Type, Uses Picking Hierarchy (badge/icon — **computed,
read-only**, per ADR-192/BR-013: derived from Picking Hierarchy row presence, not a stored flag),
Role count (e.g. "6/11 roles assigned").

**Filters**: search by name; filter by Category.

**Sorting**: by Name (default).

**Pagination**: standard.

**Available actions**: Add (navigates to Group Detail in create mode), Open (navigates to Group
Detail), Delete (soft-delete, confirmation Dialog; blocked if a Product still references the Group
— `open-questions.md` UOM-FX-OQ-006), Import/Export (opens the Import/Export dialog, FR-011).

**Permissions**: Admin only.

**Empty state**: "No UOM Groups yet — add one to start assigning units to products."

**Loading / Error state**: standard.

---

## Group Detail/Edit

**Purpose**: the central screen — configure a Group's Base Type, Category, Role Assignments,
Conversion Factors, and (if enabled) Picking Hierarchy, together, in one atomic save (`8-api.md`
POST/PATCH `/uom/groups`).

**Layout**: a form-header section (Name, Category, Base Type, and a **read-only, computed** "Uses
Picking Hierarchy" indicator — **not** a toggle, per ADR-192/BR-013) above a tabbed or sectioned
body: **Role Assignments** (one row per Functional Role, with a Type dropdown listing every
non-deleted `UOMType`; a Role with no explicit assignment displays the Group's Base Type as its
resolved value with a subtle "(default)" label, reflecting BR-021's fallback rather than showing an
empty/unset row), **Conversion Factors** (one row per non-Base Type currently reachable via a Role
Assignment, with a numeric `units_per_base` input and, if not yet defined, an inline "factor
required" indicator — surfacing BR-019 to the administrator *before* they attempt to save, not only
as a post-submit error), **Picking Hierarchy** (an ordered, drag-reorderable list of Types, shown
whenever the section is expanded — **not gated behind a toggle any more**, since "uses picking
hierarchy" is now simply "has at least one row here," per ADR-192/BR-013).

**Displayed fields**: per `5-data-dictionary.md` §3 (all UOM Group, Role Assignment, and Conversion
Factor fields).

**Validation references**: VR-001 through VR-013 (`6-validation.md`) — inline field-level errors on
blur/change where possible (name uniqueness, factor whole-number/positive check), and a single
consolidated error banner on submit if BR-019's Group-save completeness check fails, naming every
Role/Type still missing a factor (not just the first one found). VR-018 (transaction-reference lock)
is surfaced proactively via the locked-state UI described below, not only as a submit-time error.

**Default values**: no default applies to "Uses Picking Hierarchy" — it is a computed indicator, not
a field with a default (ADR-192/BR-013; supersedes this document's earlier text, which described it
as a toggle defaulting to off).

**Buttons**: Save, Cancel, Delete (Delete only visible in edit mode, not create mode; disabled — not
hidden — once the Group is locked, see below).

**Success flow**: Save succeeds → toast confirmation → remain on Group Detail with the saved state
reflected (not a redirect to the list, since further Role Assignment/Conversion Factor edits are a
common next action).

**Failure flow**: validation errors shown inline (field-level) and, for BR-019's completeness check
specifically, as a consolidated banner listing every offending Role/Type — the administrator should
not have to save repeatedly to discover each missing factor one at a time.

**Locked state (BR-020/ADR-190)**: when the Group's detail response indicates at least one
transactional reference exists, the screen enters a visibly locked state — not a silent
submit-time rejection:

- An informational banner appears at the top of the form: *"This UOM Group is in use on one or more
  transactions and can no longer be edited, except its name. To use a different conversion, create a
  new Group instead."*
- Every field except **Name** — Category, Base Type, every Role Assignment row's Type dropdown, every
  Conversion Factor row's `units_per_base` input, and the entire Picking Hierarchy section (including
  drag-reorder) — renders **disabled** (grayed out, not merely read-only text), each with a tooltip on
  hover/focus repeating the same "locked because in use" reasoning. The Name field remains fully
  enabled and editable. The "Uses Picking Hierarchy" indicator is unaffected by lock state either
  way, since it was never an editable field to begin with (ADR-192/BR-013) — it keeps displaying
  whatever it computes to.
- The **Delete** button renders disabled with the same tooltip reasoning, rather than being hidden —
  an administrator who reaches this screen should see *why* delete isn't available, not have the
  option disappear without explanation.
- This locked state is computed from the same data the `GET /uom/groups/{id}` response already
  returns for rendering the rest of the screen (`8-api.md`) — no extra round-trip is needed; the
  screen does not need to speculatively attempt a write to discover the lock. If a save is
  nonetheless attempted with a locked field changed (e.g. a stale client state, or a non-UI API
  caller), the server's `GROUP_LOCKED` 409 (`8-api.md`) is still the authoritative enforcement point
  — the UI disabling is a UX affordance, not a substitute for server-side validation (VR-018).
- A Group with **zero** transactional references shows no banner and every field fully enabled,
  including on an otherwise-populated Group (e.g. one already assigned to a Product but never used
  on a transaction line) — the lock is keyed to transactional reference, not to Product assignment.

---

## Conversion Factor History (panel within Group Detail)

**Purpose**: view the effective-dated rate history for a (Group, Type) pair (FR-007), read-only.

**Layout**: a small expandable panel or side-sheet (`Sheet` component) opened from a "View History"
action next to a Conversion Factor row.

**Displayed fields**: Rate, Effective From, Effective To (or "Current" if null) — per
`5-data-dictionary.md`'s `UOMTypeFactorHistory` fields.

**Interactions**: read-only list, no edit affordance (`UOMTypeFactorHistory` is system-generated
only — `5-data-dictionary.md` §2).

**Empty state**: "No prior rate changes recorded for this unit." (i.e., the current factor has never
changed since it was first set).

---

## Import/Export dialog

**Purpose**: bulk import/export UOM Group data (FR-011, ADR-098's standard pattern).

**Layout**: standard project-wide import/export `Dialog` pattern (file upload + column-mapping step
for import; format/scope selection for export) — reused as-is from the shared component, no
UOM-specific layout deviation.

**Interactions**: import shows per-row validation results (including BR-019 completeness failures)
once the background job completes, consistent with the standard project-wide import-job UX pattern.

---

# 5. Forms

Reference `4-ui/5-form-standards.md` for field layout, label placement, and error-display
convention. Module-specific behavior: the Conversion Factor input enforces whole-number-only input
at the client (BR-003/004) as an immediate UX affordance, in addition to (never instead of) the
server-side check (VR-011).

---

# 6. UI Components

**Module-specific components**: none — every UOM screen is built entirely from shared components
(`DataTable`, `Dialog`, `Sheet`, standard `Form` primitives, drag-reorder list for Picking
Hierarchy — reusing whatever shared drag-reorder pattern the project already uses elsewhere, not a
UOM-specific one). No bespoke chart/card is needed for this module.

**Reusable widgets**: the "Role Assignment row with a factor-required inline indicator" pattern in
Group Detail is itself a candidate for a shared "child-record completeness checklist" pattern if
another module later needs something similar — noted here for future component-standards
consideration, not built as a formally named reusable component in this pass.

---

# 7. User Interactions

**Search**: name search on every List screen.

**Filtering**: Category filter on Group List.

**Sorting**: per §4 above, per screen.

**Bulk Actions**: none beyond Import/Export (FR-011) — no multi-select bulk-delete was identified as
a requirement in any source.

**Import / Export**: FR-011.

**Drag & Drop**: Picking Hierarchy row reordering (Group Detail).

**Keyboard shortcuts**: standard project-wide only (no UOM-specific shortcut).

---

# 8. Responsive Behavior

Reference `4-ui/6-responsive-design.md`. Module exception: the Group Detail screen's multi-section
layout (header + Role Assignments + Conversion Factors + Picking Hierarchy) collapses to a
single-column, sectioned-accordion layout below the project's tablet breakpoint, consistent with the
project-wide "no fixed-width sidebar, no non-responsive table" rejection of the Stitch mockup's raw
layout (`design-source.md` — its tokens are reused, its layout is not).

---

# 9. Accessibility

Reference `4-ui/7-accessibility.md` (WCAG 2.2 AA floor). Module-specific requirement: the Picking
Hierarchy drag-reorder list must have a keyboard-accessible reorder affordance (up/down buttons or
equivalent), not drag-only — standard project-wide accessibility requirement for any drag-and-drop
interaction, restated here since Picking Hierarchy is this module's own instance of that pattern.

---

# 10. UI States

**Loading**: `DataTable` skeleton rows on every List screen; Group Detail shows a skeleton form
while its nested Role Assignment/Conversion Factor/Picking Hierarchy data loads.

**Empty**: per §4, per screen.

**No Permission**: a non-Admin reaching any UOM admin screen sees a read-only, disabled state with
an explanatory banner — never a silent redirect that hides *why* actions are unavailable (the
server-side Guard is still the actual enforcement, per `7-permissions.md` §9).

**Validation Errors**: inline field-level, plus BR-019's consolidated completeness-error banner on
Group Detail (§4 Group Detail/Edit).

**Network Errors**: standard project-wide inline error banner with retry.

**Read Only**: Conversion Factor History panel (§4) is read-only by design, not a permission state.

**Disabled**: Conversion Factor rows for the Base Type itself never show a factor input (implicit
factor of 1, BR-003) — the row is present for context but the input is disabled/hidden, not an empty
editable field.

**Archived**: not applicable — soft-deleted records are excluded from every list/dropdown, not shown
in an "archived" filtered view (no such view was identified as a requirement).

---

# 11. Notifications

**Success**: toast on Save/Delete/Import success.

**Warning**: none UOM-specific beyond validation warnings already covered under Validation Errors.

**Error**: toast + inline banner on Save/Delete failure, per §10.

**Confirmation dialogs**: Delete (Category/Type/Functional Role/Group) requires a confirmation
Dialog before submitting, standard project-wide pattern.

**Toast messages**: standard project-wide toast component/timing (`4-ui/3-design-system.md`).

---

# 12. Related Documents

Functional Specification: `2-functional-specification.md` · Validation: `6-validation.md` ·
Permissions: `7-permissions.md` · API: `8-api.md` · Project UI Standards: `4-ui/`

---

# Revision History

| Date | Change |
|---|---|
| 2026-08-18 | Initial draft. |
| 2026-08-18 | Amendment (ADR-190): added Group Detail's locked-state behavior (banner, disabled fields except Name, disabled Delete) for BR-020. |
| 2026-08-18 | Amendment (ADR-192): added an optional Category picker to Type List/Edit; confirmed the Functional Role delete-in-use guard; changed Group List/Group Detail's "Uses Picking Hierarchy" from an editable toggle/badge to a read-only computed indicator, and removed the Picking Hierarchy section's gating on that toggle; added the Base-Type fallback "(default)" display for unassigned Role Assignment rows. |

---

# Approval

Pending review per `4-document-review/1-document-review.md`.

---

# AI Generation Notes

No UOM-specific visual reference exists in `sot-docs/design/` (confirmed by grep, per §1) — this
document is built from `4-ui/3-design-system.md`/`4-component-standards.md`'s shared component
library and the legacy `screens-and-user-flows.md`'s functional description, not a literal
screen-walkthrough per the 6a instruction's own stated trigger condition ("if a visual reference
exists"). The Group Detail screen's design deliberately surfaces BR-019's completeness requirement
as an inline, before-submit indicator (not only a post-submit error), since that's the module's
signature validation rule and a good UX should make it visible before the administrator hits Save.

**Amendment (ADR-190)**: the Group Detail locked-state description was added after this document's
original review/approval pass, to transcribe ADR-190/BR-020 — locked fields must be visibly disabled
with an explanatory message, not just rejected on submit, per the developer's explicit instruction.
This is a targeted amendment, not a re-review of the rest of the document.

**Amendment (ADR-192)**: Type List/Edit gained an optional Category picker; Functional Role List/Edit
gained an explicit confirmed-delete-guard note; Group List and Group Detail's "Uses Picking
Hierarchy" changed from an editable toggle to a read-only computed indicator, and the Picking
Hierarchy section is no longer gated behind that toggle; Group Detail's Role Assignment rows now show
a "(default)" label when displaying a Base-Type fallback rather than an empty row. This is a targeted
amendment, not a re-review of the rest of the document.
