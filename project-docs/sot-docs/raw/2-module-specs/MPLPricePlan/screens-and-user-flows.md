# MPLPricePlan — Screens & User Flows

> Views, fields, interactions, states. No component library or framework assumption.

Source: `docs_from_blueprint/module/MPLPricePlan/08-screens-and-user-flows.md`. Like the SalesOrder
pilot's equivalent file, the source blueprint does not document UI screens directly (that level of detail
was explicitly out of scope for the source blueprint passes). This file **infers** the implied
screen/interaction structure from the entities, rules, status model, and outputs the blueprint does
document. Every inference below is traceable to a specific finding in one of those areas — nothing here
introduces a screen, field, or interaction the blueprint did not already establish the existence of.

**One client experience, two structurally distinct authoring surfaces**: this module exposes one client
experience with two structurally distinct authoring surfaces loaded into the same edit screen — the
per-location pricing-level formula grid (the module's real, live-consumed output) and the Rule Section (a
real, UI-maintained authoring surface with no confirmed live pricing-engine consumer). A new
implementation should preserve this distinction visibly to the user — not necessarily by removing the Rule
Section, but by not implying through screen layout that both surfaces have equal effect on a product's
actual price, given the confirmed finding that only one does.

## Screen Inventory

| Screen | Purpose |
|---|---|
| List view | A filterable/sortable grid of plans (name, description, penny-round default, etc.), with an export action. The export action is confirmed non-functional in the legacy system today (see `outputs.md`). |
| Edit/create view (plan header) | The plan's own header fields: name, description, default penny-rounding rule, UOM-type basis. |
| Pricing-level grid fragment | The per-location Take/Formula/Value grid for the pricing levels a plan is configured against, with a location switcher and a "copy to other locations" interaction governed by the location-uniformity toggle (see `workflows.md`). |
| Rule Section fragment | The Rule List (add/delete rule rows, each with a date range and linecode/subline/division/product scope-selection controls) — see the caveat above about this surface's confirmed lack of pricing effect. |

**No read-only detail view exists** — the legacy system's own detail-view slot is only a redirect to the
edit screen; every "view" of a plan is functionally an edit session. A new implementation should decide
deliberately whether to keep this shape (no separate read-only view) or introduce one, rather than
silently perpetuating an accidental absence.

## Flows

### Flow: Create/edit a plan header

- **Entry point**: List view "New" action, or selecting an existing plan from the List view (which redirects
  into the edit screen — there is no separate read-only detail view).
- **Steps**: enter/edit name (required), description, default penny-rounding rule, UOM-type basis; save.
- **Decision points**: none beyond whatever generic entity-save framework enforces on name presence (see
  MPL-RULE-005 in `business-rules-and-validation.md`, which found no explicit save-time check in this
  module's own files).
- **Exit/success state**: plan saved, redirected per the module's own (partially dead-code) return-navigation
  logic (MPL-RULE-017).

### Flow: Configure the pricing grid for a location

- **Entry point**: the plan edit screen's pricing-level grid fragment.
- **Steps**: select a location (switcher); for each pricing level, choose Take (cost basis), Formula (one
  of six operations), and enter Value (operand); optionally check "copy to other locations" (only
  meaningful/opt-in when the location-uniformity toggle is on — see `workflows.md`); save.
- **Decision points**: the location-uniformity toggle governs whether saving silently overwrites every
  other tenant location's grid for this plan (default "off" = uniform-copy) or only the current location's
  row (toggle "on").
- **Exit/success state**: grid row(s) saved. No validation exists today on Take/Formula/Value at save
  time (MPL-RULE-014) — a malformed entry is accepted silently and can produce a silently-unpriced product
  at pricing time (see `calculations.md`).

### Flow: Manage the Rule Section

- **Entry point**: the plan edit screen's Rule Section fragment.
- **Steps**: "Add Rule Row" (blank row keyed to the current plan); set start/end date; select
  linecode/subline/division/product scope; delete a rule row (individually or in bulk).
- **Decision points**: none — the delete action has no ownership/cascade guard (see `workflows.md`).
- **Exit/success state**: rule row and its scope selections persisted, but — per `calculations.md` — with
  no confirmed effect on any priced sale line.

### Flow: Delete a plan

- **Entry point**: the plan-delete action (ajax task, not the standard vtiger delete-action slot, which is
  an inert stub — MPL-RULE-018).
- **Steps**: user triggers delete for a specific plan.
- **Decision points**: **guarded** — the plan may only be soft-deleted if no live product/location
  assignment currently references it (MPL-RULE-023). This is the module's one genuinely disciplined
  guard.
- **Exit/success state**: on success, the plan is marked deleted (no un-delete path exists). On failure, an
  error names the plan and states it is in use.

### Flow: Assign a plan to a product (cross-module, surfaced on the Products side, not this module's own screens)

- **Entry point**: the Products module's own product save/edit screen.
- **Steps**: selecting a plan (or "no plan assigned") for a product, per location.
- **Decision points**: none within this module — this is where the product+location→plan relationship is
  actually set; MPLPricePlan's own screens never write this relationship themselves (see
  `integrations.md`).
- **Exit/success state**: the assignment is written to the Location module's own extension table.

## States

- **Loading/empty/error states**: not documented at this level of detail in the source blueprint (out of
  scope for the blueprint's own passes); not fabricated here.
- **Plan-level state**: active vs. soft-deleted — no intermediate draft/published/suspended state exists
  in the legacy system; whether a plan is currently in use is computed on demand at delete time, not a
  stored, always-visible attribute — a new implementation should consider surfacing "in use" as a visible
  list/detail attribute rather than only a delete-time computation, since the underlying guard-check logic
  already computes it.
- **Rule-row-level state**: active vs. soft-deleted, with no ownership/cascade guard on the delete action
  in the legacy system — a new implementation's screen-level delete confirmation should reflect the
  ownership/cascade guard `workflows.md` recommends adding.
- **Validation/error states**: hard-blocked actions should surface clear, specific error messaging tied to
  the blocking rule (e.g., "this plan is in use and cannot be deleted," naming the plan) rather than a
  generic failure — the legacy system's own plan-delete guard already does this; a new implementation
  should extend the same standard to the currently-unguarded rule-delete action and to the
  currently-unvalidated Take/Formula/Value grid fields, which today accept malformed values silently.
- **Computed-result states**: a new implementation's calculation surface (wherever a computed price is
  shown back to a merchandiser, if anywhere in this module's own screens) should be able to represent an
  explicit invalid-formula or division-by-zero result distinctly from a legitimate zero price — the legacy
  system silently drops both cases with no error state at all, a gap a new implementation's screen-level
  design should not reproduce.
- **No-permission state**: not separately documented in the source blueprint for this module's own
  screens beyond the standard vtiger `isPermitted()` gates on the List view's mass-action buttons — see
  `permissions.md` for what is and is not gated.

## Key fields and interactions surfaced across the flows

- **Plan header fields**: name (required), description, default penny-rounding rule, UOM-type basis.
- **Pricing-grid interactions**: per-pricing-level Take (cost-basis) selection, Formula (one of six
  operations) selection, Value (operand) entry; location switching; the "copy to other locations" action,
  which — per the location-uniformity toggle's default state — silently affects every tenant location
  unless the tenant has opted into per-location grids.
- **Rule Section interactions**: add a blank rule row; set its start/end date; select its
  linecode/subline/division/product scope; delete a rule row (individually or in bulk). The date-range
  fields are captured and displayed but confirmed unconsumed by any pricing computation — a new
  implementation's screen should not visually imply these fields currently gate anything.
- **Assignment interaction (cross-module, surfaced on the Products side, not this module's own screens)**:
  selecting a plan (or "no plan assigned") for a product, per location.
