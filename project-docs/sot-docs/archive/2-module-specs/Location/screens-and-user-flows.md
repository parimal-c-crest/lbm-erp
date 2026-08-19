# Location — Screens & User Flows

> Views, fields, interactions, states. No component library or framework assumption.

Source: `blueprint/module/Location/08-screens-and-user-flows.md` (which is itself an inferred-not-
extracted section — the source blueprint's own structural passes did not document UI screens directly,
that level of detail was explicitly out of scope) via
`docs_from_blueprint/module/Location/08-screens-and-user-flows.md`. The screen/interaction structure
below is inferred from the entities, rules, status model, and outputs documented elsewhere in this
module's own specification, expressed as views/fields/interactions/states rather than any specific UI
framework — the same inference approach the SalesOrder pilot used as its model.

## Two very different screen shapes for the module's two entities

- **The Branch/Store header has its own full, independently-routable CRUD screen set** — a standard
  list view, detail view, and edit/create view, the same shape any standard business entity has. A
  small, low-cardinality entity (7 live rows) — its screens are administrative, not high-traffic
  operational surfaces.
- **The Product-at-Location entity has no independently-routable screen set of its own at all.** Its
  entire read/edit surface is reachable only as an embedded panel inside the Products module's own
  detail/edit screens — no independently navigable URL exists for "this product's detail at this
  branch," mirroring the entity's own lack of independent identity (see R1 in `entities-and-fields.md`).

## Screen Inventory

| Screen | Purpose |
|---|---|
| Branch list view | A filterable, sortable grid of branches. |
| Branch detail view (read-only) | Standard entity CRUD detail screen for the branch header — identity, document-numbering prefixes, addresses, tax configuration, POS/register settings, WMS configuration, integration credentials. |
| Branch edit/create view | Standard entity CRUD edit screen for the same field set. |
| Product-at-Location Display panel (embedded) | The read-only "Location Details" block on the Products module's own detail view, showing QoH, reorder settings, cost/pricing figures, bin/zone location, and lot-number info for whichever branch is currently selected, with a branch-switcher control that re-fetches the panel via ajax. |
| Product-at-Location Edit panel (embedded) | The editable counterpart, embedded the same way, including the "pass values to other locations" checkbox mechanism gated by the Location Pass-On Field Configuration entity. |
| QoH-change confirmation screen | A dedicated interaction, invoked before a manual QoH adjustment actually writes, showing the previous quantity and prompting for a reason for the change. |
| Kit QoH-change confirmation screen | A structurally near-identical variant of the above that wires to the endpoint documented (LOC-RULE-013-017) as performing no actual kit-component propagation — a UI/backend mismatch worth flagging explicitly to any team building against this spec, since the screen's own presentation implies kit-aware behavior the endpoint it calls does not provide. |
| Lost Sale Log Report (modal/grid) | A home-page-reachable report screen with inline-edit controls for reorder level, reorder-alert flag, cost, "track sales history" flag, and lost-sale factor, plus a per-row alert-dismiss action. |
| Cost Detail tooltip | A small hover/tooltip fragment on the Products-page Location panel, showing either a configured QoH tooltip or a "last changed on/by" audit string for other tracked fields. |

## Flows

- **Branch CRUD flow** — entry point: Branch list view. Steps: select/create a branch → edit form
  (see `entities-and-fields.md` for the full field set) → save (LOC-RULE-001-006 govern the save entry
  point and entity save hook). Decision point: if Part Superseded transitions on the loaded
  Product-at-Location context during a save cascade, the supersession merge fires (see below) — this
  does not apply to the branch header itself, which has no lifecycle field (`workflows.md`). Exit/
  success: record saved, formula fields recomputed unconditionally on every save regardless of what
  actually changed (LOC-RULE-006).
- **Manual QoH adjustment flow** — entry point: the QoH field on the Product-at-Location Edit panel or
  the Lost Sale Log Report's inline controls. Steps: user submits a new quantity → session/location
  consistency check (LOC-RULE-011) → if consistent, the QoH-change confirmation screen renders,
  showing the previous quantity and prompting for a reason → user confirms → the core write executes
  (LOC-RULE-007-010). Decision points: superseded-merge branch vs. normal branch (different no-op-guard
  behavior, LOC-RULE-008/009); WMS-context vs. standard context (WMS-context additionally writes
  directly into WMS-owned tables via the injection-vulnerable path, LOC-RULE-010). Exit/success: QoH
  updated, audit-trail/tooltip entry written (except on the injection-vulnerable WMS direct-write path,
  which bypasses the audit table). **No exit state exists today for "this adjustment would drive QoH
  negative"** — see States below.
- **Kit QoH adjustment flow** — entry point: the kit-labeled confirmation screen (session-consistency
  guard explicitly bypassed for the Sales Order detail page's kit-QoH-change caller, LOC-RULE-012).
  Steps: user submits a new quantity → delta computed against a client-supplied "previous value"
  parameter (LOC-RULE-014) → write executes against the single product/location row only — **no
  kit-component cascade occurs despite the screen's own kit-aware presentation** (LOC-RULE-015). Exit:
  identical single-row write outcome to the plain-product flow, contradicting the flow's own name.
- **Part-supersession entry flow** — entry point: entering a superseding product number on a
  Product-at-Location Edit panel (or the branch header context supersession initiates from, per the
  source blueprint's own framing as "Products-module-initiated"). Steps: user enters superseding
  product number, selects combine-sales-history option, combine-QoH option, and transfer-price-and-cost
  flag → save triggers the entity save hook, which re-reads the just-saved state and, if superseded,
  runs the merge cascade (LOC-RULE-005) → cascade applies the selected combine options
  (LOC-RULE-018-021, LOC-RULE-024-026). Decision points: the three combine-option values (merge both /
  remove old / leave separate) for both sales-history and QoH independently; the transfer-price-and-cost
  flag independently gates the cost/pricing overwrite. Exit: no reverse transition exists — this is a
  one-way flow (`workflows.md`).
- **Lost-sale recording flow** — entry point: SalesOrder/point-of-sale, not this module's own UI (see
  `integrations.md`). Not further detailed here since the triggering screen is out of this module's
  own scope; the accumulate-then-promote arithmetic itself is documented in `calculations.md` §8.

## States

- **Loading / not-found / deleted** — Branch record load surfaces a "record deleted" message with a
  "go back" link (LOC-RULE-003) or a "record not found" message (LOC-RULE-004) as distinct states, not
  a generic failure.
- **Read-only** — the Product-at-Location Display panel is a pure read surface with no save action;
  distinct from the Edit panel, which is the same data made writable.
- **No-permission** — see `permissions.md`; this module's own screens have almost no explicit
  permission-gated UI state beyond the list-view mass-delete/change-owner buttons and one commented-out
  (dead) permission check on the branch detail view.
- **Validation/error states** — hard-blocked actions should surface clear, specific error messaging
  tied to the blocking rule (missing product/branch id on save, a deleted/not-found record on load)
  rather than a generic failure.
- **The single most important state a new implementation must surface that the legacy system does
  not**: a rejected QoH adjustment that would drive the quantity negative. The legacy system has no
  such rejection state at all (see R2 in `entities-and-fields.md` and `risks-and-open-questions.md`),
  so this state has no legacy UI precedent to draw from and needs to be designed fresh.
- **Reason-for-change capture** — the QoH-adjustment confirmation screen's reason prompt is the legacy
  system's only structured capture of *why* a quantity changed. A new implementation's audit trail (R1
  in `entities-and-fields.md`) should generalize this captured reason across every QoH write path, not
  just the one screen that happens to prompt for it today.
