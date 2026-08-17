# PurchaseHistory — Screens & User Flows

> Views, fields, interactions, states. No component library or framework assumption.

Source: `docs_from_blueprint/module/PurchaseHistory/08-screens-and-user-flows.md`.

**A note on method**: the source blueprint does not document UI screens directly — that level of detail is
explicitly out of scope for the blueprint-extraction passes, which catalog entry points/functions/data, not
screen layouts. This section infers the implied screen/interaction structure from the entities, rules,
status model, and outputs that the blueprint does document. Where the blueprint's own structural inventory
explicitly names a screen-shaped file, that citation is used directly; everywhere else, the structure below
is inferred, not separately confirmed.

**A thin, mostly-read-only UI surface, consistent with the module's own accumulator-by-external-writer
shape.** Because the module's own real write logic lives entirely in the sibling PurchaseOrder module, and
because its own entity carries no domain-specific status field, the implied UI surface for PurchaseHistory
itself is thin relative to a transactional module like SalesOrder: primarily a read/browse/export surface
over a system-populated aggregate, plus one narrow manual-correction interaction. The blueprint's own
structural inventory confirms the module has standard List/Detail/Edit view controller files present (the
generic vtiger scaffolding every module carries), but no module-specific client-side logic of any kind — the
module's own client-side script file is confirmed genuinely empty.

## Screen Inventory

| Screen | Purpose |
|---|---|
| List view | A filterable, sortable grid of purchase-activity-aggregate rows (product number, line code, week, year, location, buy quantity, return quantity, total activity), with an export-to-CSV action. Sort-order/order-by state persists correctly across requests for this module, unlike a confirmed session-key-mismatch defect in SalesHistory's own equivalent list view (rule PH-RULE-010). |
| Detail view (read-only) | Displays a single aggregate row's own field set. |
| Edit view | The module's own generic create/edit screen. Per this module's own confirmed validation posture (rules PH-RULE-001/004), this screen carries no field-presence enforcement of any kind at the point the source blueprint traced — any legitimate new implementation should treat this as a gap to close deliberately, not an assumption to carry forward silently. |

## Flows

- **Browse/export flow**: entry point is the list view. Steps: user filters/sorts the grid, optionally
  invokes the "Export" action to download the current filtered/searched row set as CSV (see `outputs.md`).
  No decision points beyond filter/sort selection. Exit/success state: CSV download or continued browsing.
- **Manual-correction flow**: entry point is the detail view's inline-edit interaction — a lightweight,
  ajax-driven single-field correction without navigating to the full edit screen. In the legacy system this
  endpoint accepts any field name with no allow-list and performs no recompute of the derived total (rule
  PH-RULE-013) — a new implementation should narrow this to an explicit, named correction action that always
  triggers a recompute (see `calculations.md`). Exit state: the edited field is saved; `total_activity` may
  become silently inconsistent with `buy_qty`/`return_qty` in the legacy system.
- **Delete flow**: entry point is the list view or detail view delete action. Guard: record identifier must
  be present (rules PH-RULE-011/012). Side effect: soft-delete; row excluded from future accumulator
  lookups and from the export's active-rows filter. Confirmed present and functional in the legacy system,
  though never observed exercised on the source data snapshot (0 of 644 rows soft-deleted).
- **Accumulator write flow (not user-initiated within this module)**: the aggregate row's own key
  fields/counters are populated and updated entirely by PurchaseOrder-side events (finalize, line-append,
  reverse-RGN) — no PurchaseHistory screen or user action triggers this flow directly; see `integrations.md`.

## States

- **Row-level state**: whether a row is active or soft-deleted — no other domain-specific state exists for
  this entity (see `workflows.md`).
- **Validation/error states**: the legacy system's own thin validation surface means few, if any,
  hard-blocked states are currently surfaced to the user on this module's own write paths — a new
  implementation's own validation-layer design should treat this as an open design question (what
  required-field enforcement *should* exist, since none was confirmed to exist today), not an assumption
  that the current absence of enforcement reflects a deliberate business decision.
- **Consistency state**: whether the displayed `total_activity` value is currently consistent with the
  displayed buy/return counters — under the legacy system's own inline-edit endpoint, these can silently
  diverge; a new implementation should make this divergence structurally impossible rather than surface it
  as a state to detect.

(`docs_from_blueprint/module/PurchaseHistory/08-screens-and-user-flows.md` §8.1-8.4)
