# PurchaseOrder — Build Guidance

> Guidance for Stage 4, stated stack-neutrally.

Source: `docs_from_blueprint/module/PurchaseOrder/10-build-guidance.md`, itself traced to
`blueprint/module/PurchaseOrder/09-implementation-plan.md` and
`10-deployment-cutover-outline.md`. This section is guidance for however a downstream process
structures its own implementation-plan and testing documentation — it is not itself an
implementation plan, a schema migration script, or an API specification.

## Domain Model (rewrite target — tables to design fresh, not port 1:1)

1. **PurchaseOrder (header)** — consolidates the header, custom-field, and both address-block tables
   into one entity with an embedded/normalized address value object, eliminating the `cf_NNNN`
   custom-field indirection entirely (Requirement R1, entities-and-fields.md).
2. **PurchaseOrderLine** — a single authoritative line-item table replacing the current three-way
   split (two staging tables plus one committed table), with a `draft`/`committed`-style state field
   rather than physically different tables — closing Open Question PO-OQ-001 by design rather than by
   further legacy investigation (Requirement R2).
3. **PurchaseOrderStatusHistory** — a direct functional port of the legacy status-history table's
   intent, but written **only on actual transitions**, not on every save regardless of whether status
   changed (the confirmed legacy behavior — see workflows.md).
4. **PurchaseOrderReconciliation + PurchaseOrderReconciliationLine** — a direct functional port,
   keeping the variance-tracking and COA-mapping columns (accounting integration is a core
   requirement, not incidental).
5. **PurchaseOrderTemplate** — a port with the serialized template-data blob replaced by properly
   normalized template line rows, and a genuine unique constraint on (template name, owner scope) to
   resolve Open Question PO-OQ-004.
6. **PurchaseOrderStatus (enum)** — a real, populated, DB-or-code-enforced enum, closing the
   PO-RISK-019 gap where the legacy picklist master table is empty. The 8 observed live values become
   the enum's initial member set: `Approved`, `Finalized`, `Order Partially Received`, `Order
   Received in Full`, `Order Completely Cancelled`, `Partially Reconciled`, `Completely Reconciled`,
   `Fully Processed RGN` (Requirement R3).
7. **PO-to-SalesOrder linkage (BOPO/RGN)** — a proper join table replacing the legacy pattern of
   matching a human-readable PO-number string against a buyout-number column (a foreign-key-by-string
   pattern that is itself a design smell not worth carrying forward).

## Rule-to-Enforcement-Layer Mapping Approach

Each of the 26 catalogued business/validation rules (business-rules-and-validation.md) should be
enforced at the most appropriate layer, rather than uniformly at one layer.

| Rule group | Rule IDs | Rule count | Suggested primary layer |
|---|---|---|---|
| Header-required-fields | PO-RULE-001–005 | 5 | Data-layer constraint (002/003, already DB-enforced today) + application-level orchestration (001/004/005, currently client-only — server-side mirror required, per risks-and-open-questions.md "Highest-Priority Unresolved Question") |
| PO-number | PO-RULE-006–008 | 3 | Domain invariant (a single unique-indexed number, D-1 below) + application-level (007 rename guard, 008 EDI-eligibility gate — folds into the status service, D-2) |
| Line-item | PO-RULE-009–014 | 6 | Application-level orchestration (currently entirely client-side; server-side mirrors required before treating any of these as genuinely enforced) |
| Receiving/cancellation | PO-RULE-015–019 | 5 | Domain invariant (017, the delete guard — already server-side today, fold into the status service) + application-level (015/016/018/019, currently client-side) |
| Template | PO-RULE-020–023 | 4 | Data-layer constraint (022, once the uniqueness gap is resolved per PO-OQ-004) + application-level (020/021/023) |
| Forecast/scheduling | PO-RULE-024 | 1 | Application-level orchestration |
| Merge/duplicate | PO-RULE-025–026 | 2 | Application-level orchestration |

**Total: 26 of 26 rules mapped, none omitted.** Unlike the SalesOrder rule catalog (where most rules
already had a confirmed server-side counterpart to preserve), the majority of PurchaseOrder's rules
are currently client-side-only — the mapping above is therefore also, implicitly, a checklist of
which rules need a genuinely new server-side implementation, not merely a relocation of existing
server logic.

## Key Design Decisions

- **D-1 — Separate the human-facing PO number from the primary key, but make it a real
  unique-indexed column** with a single DB-level uniqueness constraint (or a dedicated
  number-sequence service), not the legacy pattern of checking uniqueness against three separate
  non-atomic queries across two other modules' tables (PO-RULE-006) — a race condition waiting to
  happen under concurrent PO creation.
- **D-2 — Model the status machine explicitly as a state-transition table/enum with guarded
  transitions**, owned by a single status service, not scattered string-literal comparisons spread
  across at least five files today. This single service should own every status-dependent guard (the
  delete-block list, EDI-eligibility, receiving-eligibility) as one source of truth. See
  Requirement R3, workflows.md.
- **D-3 — Consolidate the line-item cost/currency/UOM conversion pipeline into a single pure
  calculation service**, replacing the current scatter across five files that each independently
  read+write overlapping subsets of the same line-item cost fields with duplicated per-line
  freight/duty distribution math. This directly closes PO-RISK-001 (the column-name injection lives
  in exactly this scatter) and reduces the "5 different files can each independently corrupt a
  line's cost" surface area.
- **D-4 — Vendor-owned fields must be read via a Vendors-module service/API call, never written
  directly from PurchaseOrder code.** The direct architectural fix for PO-RISK-002 — the rewrite's
  module boundary must make "PurchaseOrder writes into Vendors' table" structurally impossible, not
  just better-escaped. See Requirement R4.
- **D-5 — EDI/Acconex/QuickBooks push should be event-driven** (status transition → outbound queue →
  adapter), not synchronous inline calls from the save/submit endpoints. The legacy synchronous
  pattern couples the save transaction directly to three vendor-network HTTP calls and a QuickBooks
  push — both a reliability risk (a slow/failed vendor API blocks the PO save) and the reason a
  disabled hack script (PO-RISK-015) exists at all; an event/queue model makes manual backfill
  scripts unnecessary.
- **D-6 — All financial write endpoints must use parameterized queries / an ORM exclusively — no raw
  string SQL concatenation anywhere**, given this module's 14-finding/27-statement SQLi count is
  concentrated almost entirely in exactly these endpoints (Requirement R5).
- **D-7 — Reconciliation's region-specific tax columns (VAT buckets, QuickBooks-profile field) should
  move to a locale/region configuration layer**, since the current schema hardcodes Irish/UK VAT
  rates as named columns — a design that doesn't scale to additional tax regions without a schema
  migration each time.

## Suggested Build Sequencing

1. **Phase 1 — Core header + line-item CRUD**: the header entity, a single PurchaseOrderLine table
   (collapsing the 3-table legacy split per D-2/R2 above), basic list/detail/edit views. No EDI, no
   reconciliation, no forecast yet.
2. **Phase 2 — Status machine + receiving**: implement the status service (D-2), port the
   receive/cancel/backorder logic, wire the delete guard (PO-RULE-017) and the receiving-triggered
   stock-update side effect (`update_prod_stock`).
3. **Phase 3 — Cost/pricing/currency pipeline**: the consolidated calculation service (D-3), covering
   everything in calculations.md — cost override, EP sync, currency conversion, freight/duty
   distribution — with parameterized queries from day one (D-6).
4. **Phase 4 — Reconciliation**: port the reconciliation domain model, keeping the variance/COA
   structure but generalizing the region-specific tax columns (D-7).
5. **Phase 5 — RGN / reverse-RGN sub-flow**: layered on top of the Phase 2 status machine rather than
   as parallel status-string checks.
6. **Phase 6 — Templates + scheduled/recurring PO**: with the uniqueness fix (PO-OQ-004/D-1 pattern).
7. **Phase 7 — Outputs**: consolidate the three legacy PDF engines into one rewrite-side pipeline;
   import/export CSV.
8. **Phase 8 — Cross-module integrations**: StoreTransfer trigger, SalesOrder/BOPO linkage, EDI
   adapters (event-driven per D-5), QuickBooks push (event-driven), SalesHistory read integration.
9. **Phase 9 — Forecast/order-point/auto-reorder**: the largest remaining functional chunk (the
   forecast-line-code processor alone is 1,070 lines) — deliberately sequenced last since it is the
   most self-contained functional area and depends on the core PO-creation pipeline (Phase 1) being
   stable first.

Each phase should close with a security pass re-verifying no raw-SQL-concatenation pattern was
reintroduced, given how pervasive the pattern was in the legacy code.

## Security Remediation Urgency

Given `CalcTotal.php` (PO-RISK-001) is exercised on essentially every routine PO edit and carries no
authorization gate at all, and `setPPDValues.php` (PO-RISK-002) allows a PurchaseOrder-surface
request to corrupt Vendors-module data, these two findings warrant an **out-of-band hotfix on the
legacy codebase** (parameterize the value-position concatenations, add an allow-list for the
update-target column name, add an authorization check) independent of and prior to the rewrite
shipping — the same urgency posture recommended for the Vendors module's own blueprint. **The
rewrite itself must not merely port the legacy queries** — every financial/cost-mutation endpoint
identified in risks-and-open-questions.md must be re-implemented with parameterized queries/ORM from
the start (D-6), not migrated as-is and "fixed later."

## Cutover Phasing (outline depth, per source)

Kept brief here consistent with this document's own stated non-goal of being a deployment plan:

1. **Shadow-write period** — the new system runs alongside legacy on a read-only mirror, validating
   the new status machine and cost pipeline against real transaction volume before any write traffic
   cuts over.
2. **New-PO-creation cutover first** — newly-created POs route through the rewrite while existing
   open POs continue in legacy until they naturally reach a closed state, avoiding the need to
   migrate mid-flight PO state (partial receiving, open reconciliation) during the cutover window.
3. **EDI/QuickBooks adapter cutover** — each of the three EDI networks plus Acconex/WMS cuts over
   independently, since the legacy dispatch pattern already treats them as independent branches.
4. **Legacy-open-PO drain** — once legacy-open POs drop to near-zero, migrate the remaining open POs'
   current state (header + committed line items only, not the staging tables — scratch data with no
   long-term meaning per PO-OQ-001) and decommission legacy write access.
5. **Reporting/SalesHistory read-path cutover last** — read-only and lowest-risk, deferred until the
   transactional paths are stable.

## Test/Verification Strategy Pointer

- **Rule-ID-traceable tests**: name or tag each test after its PO-RULE-### rule ID
  (business-rules-and-validation.md), mirroring the SalesOrder spec's own recommendation, so coverage
  against the business/validation rule catalog is mechanically auditable.
- **Server-side-enforcement gap tests**: given the majority of the 26 rules have confirmed
  client-side-only enforcement today, an explicit test suite proving the new server-side mirror
  actually rejects each previously-client-only-enforced case is the single most valuable new test
  category this module needs that SalesOrder's own guidance did not have to emphasize as heavily.
- **State-transition tests** covering every transition in workflows.md, including the delete-guard
  status list and the EDI-eligibility gate.
- **Security regression tests**: one dedicated, explicitly-named test per confirmed SQL-injection
  finding in risks-and-open-questions.md, asserting the specific legacy failure mode (especially
  PO-RISK-001's column-name injection, which requires an allow-list test, not merely a
  parameterization test) is structurally impossible to reproduce. A dedicated test should also assert
  the new authorization gate on the CalcTotal-equivalent endpoint, since the legacy file has none.
- **Migration/data-integrity audit scripts** — run against the legacy system's live data to quantify
  how many records fall into the module's documented anomalous buckets (the empty `vtiger_postatus`
  picklist's implications, PO-RISK-019) before any migration decision is made about how to handle
  them.
