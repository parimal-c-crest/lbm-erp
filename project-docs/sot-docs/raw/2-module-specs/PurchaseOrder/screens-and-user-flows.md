# PurchaseOrder — Screens & User Flows

> Views, fields, interactions, states. No component library or framework assumption.

Source: `docs_from_blueprint/module/PurchaseOrder/08-screens-and-user-flows.md`, itself traced to
`blueprint/module/PurchaseOrder/00-pass0-inventory.md` (functional-area file groupings, not
screen-by-screen documentation).

**Inference note (carried forward)**: as with the SalesOrder spec's equivalent file, the blueprint
does not document UI screens directly — the source passes catalogue entry points, functions, and
files, not screen layouts. This section **infers** the implied screen/interaction structure from the
entities, rules, status model, and outputs the blueprint does document. Every inference below is
anchored to a specific functional-area grouping or rule/entity citation; nothing here asserts a
screen exists beyond what the underlying file inventory and rule catalog support. §5 below flags
where this inference confidence is explicitly lower than the equivalent SalesOrder file.

## Two build paths converging on one PO record

The file inventory's functional-area groupings (`00-pass0-inventory.md`, groups A–K) imply at least
two distinct ways a PO comes into being, both driving the same header/line-item entities:

- **Direct create/edit** — the standard `EditView`/`DetailView`/`Save` controllers (group A), a
  fuller, more traditional create/edit screen plus a separate read-only detail view.
- **Suggested-PO / order-to-min-max build** — a dedicated "pre-edit" screen (`PrePOEditView.php`,
  group A) that builds a suggested PO from order-point/forecast logic (group H) before the user ever
  reaches the standard edit screen — inferring an intermediate "build the line items first, then edit
  the PO" flow distinct from SalesOrder's single-path create screen.

A new implementation should treat these as **two different entry paths into one shared PO-editing
capability**, mirroring the SalesOrder spec's own recommendation not to duplicate business logic
across parallel client experiences — the same principle applies here even though the PurchaseOrder
blueprint did not itself use the term "Quick" for its second path.

## Screen Inventory

| Screen | Purpose |
|---|---|
| List view | A filterable, sortable grid of POs (`ListView.php`), plus a "Top N PO" dashboard widget (`ListTopPurchaseOrder.php`). |
| Detail view (read-only) | Displays the PO header, line items, addresses, and (per `DetailView.php`'s confirmed load of payment data) linked payments; ajax endpoints back live core-price/converted-core-price updates from this view. |
| Pre-edit / suggested-PO build screen | The order-to-min/max and suggested-PO-building screen (`PrePOEditView.php`), gated by PO-RULE-004 (PO Type must be selected) and PO-RULE-005 (at least one Order Point/Manufacturer/Line Code/Sub-line/Product Division must be selected) before generating a suggested PO. |
| Edit view (standard) | The full create/edit screen: header fields (vendor, ship-to location, subject, PO type, dates), a line-item entry/grid block (backed by the staging table while open), pricing/currency block, address block. |
| Receiving screen | A dedicated interaction for processing receive/cancel/backorder actions against selected line items (PO-RULE-015/016 both gate this screen: at least one PO, and at least one line item, must be selected before it proceeds), driving the status-transition engine. |
| Reconciliation screen | A dedicated interaction for comparing receiving-side vs. invoice-side amounts and posting variances (`POReconciliation.php`), including the region-specific VAT/COA fields. |
| RGN (Return Goods Notice) screen(s) | A distinct interaction for the RGN/reverse-RGN sub-flow, gated by PO-RULE-018 (selected SO line qty must exactly match) and PO-RULE-019 (the linked SalesOrder must not be open for edit elsewhere — an application-level optimistic-lock check). |
| Template save/load screen | A dedicated interaction for saving, loading, and deleting PO templates (PO-RULE-020 through 023), including the role-gated PO-Type-in-template restriction. |
| Merge screen | A dedicated interaction for merging duplicate/pending POs (PO-RULE-025/026), blocked while any target PO is actively being edited. |
| Document generation/print/EDI-submit actions | One action per output type (see outputs.md), plus the three EDI vendor-network submissions and the Acconex/WMS submission, gated by the `Finalized`-only, non-RGN rule (PO-RULE-008). |
| CSV import wizard | A three-step screen sequence (upload → column-mapping/validation → commit), per the file inventory's Import/Export grouping. |

## Flows

- **Direct create/edit**: entry via List view "New" action or Detail view "Edit" action → Edit view
  (standard) → header + line-item entry → save → `Approved` status (see workflows.md). Decision
  points: vendor selection gate (PO-RULE-001), PO number uniqueness check (PO-RULE-006), line-item
  addition gate (PO-RULE-009). Exit/success state: PO saved in `Approved` status, editable.
- **Suggested-PO / order-to-min-max build**: entry via Pre-edit screen → PO Type selection
  (PO-RULE-004) → Order Point/Manufacturer/Line Code/Sub-line/Product Division selection
  (PO-RULE-005) → suggested line items generated from forecast/order-point logic → hands off into the
  standard Edit view for finishing/save. Exit/success state: same as direct create/edit, once handed
  off.
- **Receiving**: entry via List view PO selection (PO-RULE-015) → Receiving screen → line-item
  selection (PO-RULE-016) → receive/cancel/backorder action → status-transition engine recalculates
  `postatus` (see workflows.md transition table) and, on entry into `Order Partially Received`,
  triggers the `update_prod_stock` inventory side effect. Exit/success state: updated `postatus`,
  updated line-item received/backordered/cancelled quantities.
- **Reconciliation**: entry via Reconciliation screen, restricted to POs matching the eligibility
  query (`postatus IN ('Order Partially Received','Finalized','Partially Reconciled')` general, or
  `postatus IN ('Fully Processed RGN','Partially Reconciled')` RGN-side) → variance entry per line
  and header → COA code selection for GL posting → save creates/appends reconciliation header and
  line rows. Exit/success state: `postatus` pushed toward `Completely Reconciled` once every line's
  variance is resolved.
- **RGN / reverse-RGN**: entry via RGN screen → RGN cancel-item selection with exact-quantity
  matching (PO-RULE-018) against a SalesOrder not open for edit elsewhere (PO-RULE-019) → RGN
  processing computes new status (see workflows.md RGN transition rows) → optional reverse-RGN
  creation (`CreateReverseRGN.php`) sets `reverse_rgn_po`/`rgnpoprocess`. Exit/success state:
  `po_rgn_status` set to `Submitted`, `postatus` updated per RGN outcome.
- **Template save/load**: entry via Template screen → template name entry (PO-RULE-020, required) →
  save; or template selection (PO-RULE-021, required before load/delete) → load/delete. Role-gated:
  PO-Type-in-template usage restricted by role (PO-RULE-023). Exit/success state: template
  persisted/loaded/deleted.
- **Merge**: entry via Merge screen → at least one PO selected (PO-RULE-026) → merge blocked if any
  target PO is actively being edited (PO-RULE-025) → merge proceeds. Exit/success state: merged PO
  record(s).
- **Document generation/print/EDI-submit**: entry via Detail view or List view action → dispatcher
  branches on requested action (print/view/email) or EDI vendor-network target → for EDI, gated to
  `Finalized`, non-RGN POs only (PO-RULE-008). Exit/success state: document rendered/emailed, or EDI
  submission dispatched to the vendor-specific push method.
- **CSV import wizard**: entry via Import action → step 1 upload → step 2 column-mapping/validation
  → step 3 commit (row-by-row write into staging/line-item tables). Exit/success state: PO(s) created
  or updated from imported rows.

## Key Fields and Interactions Surfaced Across the Flows

- **Header fields**: vendor selection, ship-to location, subject, PO type, due/ETA dates, terms,
  comments.
- **Line-item interactions**: add by product lookup (gated by PO-RULE-009); vendor-line-code entry
  with duplicate-vendor-assignment checking (PO-RULE-013); kit-membership handling; barcode scanning;
  per-line freight/duty/discount allocation display, mirroring the header-level distribution flags.
- **Pricing/currency interactions**: manual cost override (`UpdateCost.php`), vendor-currency
  application, PPD (prepaid-discount) entry (PO-RULE-014, numeric-only, confirmed client-side-only
  enforcement).
- **Receiving interactions**: select-and-receive, select-and-cancel, backorder resolution, each
  driving the status-transition engine's outstanding-quantity check.
- **Reconciliation interactions**: variance entry/review against receiving-side vs. invoice-side
  amounts, per-line and header-level, with COA code selection for GL posting.
- **RGN interactions**: RGN cancel-item selection with exact-quantity matching, reverse-RGN creation.
- **Role-gated interactions**: PO-Type-in-template usage is intended to be role-restricted
  (PO-RULE-023) — enforcement confirmed only client-side in the source blueprint; a new
  implementation should treat server-side enforcement of this restriction as a requirement, not an
  assumption already satisfied, mirroring the same conclusion reached in the SalesOrder spec for its
  own role-gated interactions.

## States

- **PO-level state**: `postatus` (primary lifecycle), `po_rgn_status` (RGN sub-flow marker),
  `reconciled` (delete/edit-protection guard) — all three should be visible/filterable in the list and
  detail views.
- **Line-item-level state**: received/backordered/cancelled/reconciled quantities, RGN status,
  warranty-resolution state, kit-membership indicator.
- **Validation/error states**: hard-blocked actions should surface clear, specific error messaging
  tied to the blocking rule (e.g., vendor not selected, duplicate PO number, template name already in
  use, RGN line-quantity mismatch) rather than a generic failure — the same principle the SalesOrder
  spec states for its own rule catalog.
- **Delete-eligibility state**: per PO-RULE-017, whether a PO is currently eligible for deletion
  (`reconciled='0'` and `postatus` outside the six "committed" values) is a distinct, user-visible
  state that should be surfaced directly on the detail/list view rather than only discovered by
  attempting the delete action and receiving a rejection.
- **EDI-submission-eligibility state**: whether a PO is currently eligible for EDI submission
  (`Finalized` status, non-RGN number) should likewise be surfaced as a visible state ahead of the
  submit action, not only enforced as a post-hoc rejection.

## Note on Inference Confidence

Unlike SalesOrder's screens file, which drew on a blueprint that explicitly named "standard" and
"Quick SO" as two documented client experiences, this file's two-entry-path framing (§"Two build
paths converging on one PO record") is **inferred** from the file-inventory's functional grouping
and the pre-edit screen's existence, not from an explicit statement in the source blueprint that
these are formally two parallel UIs. This inference is flagged here rather than presented with
SalesOrder-level confidence.
