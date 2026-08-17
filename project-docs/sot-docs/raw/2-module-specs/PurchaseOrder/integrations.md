# PurchaseOrder — Cross-Module & Integration Touchpoints

Source: `docs_from_blueprint/module/PurchaseOrder/07-cross-module-integrations.md`, itself traced to
`blueprint/module/PurchaseOrder/06-cross-module-integrations.md`.

PurchaseOrder is confirmed to be a genuine **hub module**: it both reads from and writes into
Vendors, SalesOrder, StoreTransfer, and Location, while acting as the **outbound trigger** for
QuickBooks and three EDI vendor networks, and a **read-only consumer** of SalesHistory/reporting and
Products/image data. Described here as capability/data-contract needs, not as any specific
integration protocol or technology.

## Related Modules

| Module | What This Module Reads | What This Module Writes/Triggers | Direction | Sync/Async |
|---|---|---|---|---|
| Vendors | Tax-exemption/authority code, vendor line-code aliases, default currency/price-sheet cost, cost-basis preference, EDI capability. | PPD type/amount written directly into a Vendors-module table (`vtiger_vendorcf`, via `setPPDValues.php`) — see "The Vendors write path in detail" below. | Bidirectional, dominated by reads, with one confirmed unguarded write | Sync |
| StoreTransfer | Pending transfer relationship row (existence check). | When a PO's status becomes `Finalized` or `Fully Processed RGN`, and a pending transfer relationship row exists, the PO automatically creates a Store Transfer. | Outbound — PurchaseOrder is the trigger/source side, StoreTransfer is the consumer | Sync, inline within the save path |
| SalesOrder | Cross-reference table linking a PO number back to a SalesOrder (buyout-PO linkage); direct references from committed Line Items back to specific SalesOrder lines (BOPO/RGN); Door/NS-specific SO↔PO linkage table; shared edit-lock table. | Cross-reference table kept in sync whenever a PO number changes; `Save.php` deletes the current user's edit-lock rows on save. | Bidirectional | Sync. A separate maintenance script reads the same lock table with an unparameterized query (risk PO-RISK-011) |
| QuickBooks | Tenant's configured accounting method (gate). | RGN-return financial postings (normal/core/defect/warranty return amounts, split by transaction-code values) computed and pushed to the QuickBooks integration layer, including resolving the PO's currency exchange rate at time of return. Reconciliation also carries QB linkage directly on its own table (transaction id, edit-sequence). | Outbound | Sync (per live script); one RGN-to-QB push script is a **disabled one-off batch script** (hardcoded PO-number list, unconditional early exit before any real logic runs) — dead code kept in the tree, flagged for exclusion in the rewrite (risk PO-RISK-015) |
| EDI vendor networks (DoItBest / EJD / Orgill) + Acconex/WMS | Vendor-EDI-capability lookups (gates whether the EDI submit UI is shown); a previously-obtained confirmation-id field on the PO header for Acconex. | A single dispatch point branches to three vendor-specific push methods (living inside the main PO entity class, not the ajax layer), plus a separate Acconex/WMS submission. Vendor-availability responses (cost/qty confirmation) are written back into the staging table, consumed later by the EP-pricing-sync guard. A vendor-specific (Emery/EJD) invoice-matching workflow exists with its own log table. | Bidirectional (submit outbound; availability/confirmation responses inbound) | Sync. EDI is also framed as an output channel (outputs.md); only `Finalized`, non-RGN POs may submit (PO-RULE-008) |
| SalesHistory / analytics | Historical sales data rendered from the PO product screen to help a buyer decide reorder quantities, pulling location lists and reporting data via a shared reporting-utilities layer; a companion file supplies graph-rendering options for the same view. | (none — read-only) | Read-only, PurchaseOrder → SalesHistory | Sync. The largest single ajax file in the module by line count |
| WMS / ASN (Advance Shipment Notice) | Inbound ASN data. | ASN effectively behaves like a PO type for receiving purposes, sharing the same status-transition engine as the rest of the module. | Inbound (ASN) / bidirectional (DC data) | Sync. A Do-It-Best DC order-confirmation/DC-post-data pair and a missing-ASN cleanup script round out this integration; shares the receiving state machine rather than being a separate one |
| Products | Product id, stripped product code, barcode, line code (line-item references); product images/detail popups. | Cost overrides write back into a Products/Location-adjacent table for LIFO tracking and UOM pricing sync (see calculations.md §3). | Bidirectional, dominated by reads, with a confirmed cost/LIFO write | Sync. Read-only reach for images/detail; the LIFO/UOM write is functionally part of the cost pipeline, not a separate Products-mutation concern |
| Location | Distribution-center check for receiving-logic routing; order-point/min-max data for the pre-edit "order to min/max" flow. | A PO-adjacent screen writes location-level min/max/order-point fields directly (unparameterized — risk PO-RISK-008). | Bidirectional | Sync. The pre-edit "order to min/max" flow is fundamentally a Location-driven reorder calculation surfaced through PurchaseOrder |

## External Systems

| System | What Crosses the Boundary | Direction | Trigger | Sync/Async |
|---|---|---|---|---|
| QuickBooks (accounting) | RGN-return financial postings; reconciliation transaction id/edit-sequence linkage | Outbound | RGN return processed; reconciliation created/updated | Sync (per live script) |
| DoItBest EDI network | PO submission; order-confirmation/DC-post data inbound | Bidirectional | Manual EDI submit (`Finalized`, non-RGN only) | Sync |
| EJD EDI network | PO submission; invoice-matching data inbound (own log table) | Bidirectional | Manual EDI submit; Emery/EJD invoice-matching workflow | Sync |
| Orgill EDI network | PO submission | Outbound (submit); availability/confirmation inbound per the shared dispatch pattern | Manual EDI submit | Sync |
| Acconex / WMS | Order confirmation number/status | Bidirectional | PO submission to Acconex; confirmation received back | Sync |

## The Vendors write path in detail

`setPPDValues.php` writes PPD type/amount directly into `vtiger_vendorcf` **from the PurchaseOrder
module**, with zero bind parameters on all four of its SQL statements — the confirmed cross-module
SQL-injection vector already flagged from the Vendors blueprint's own side. From this module's own
side, the finding is framed as worse than a read-only reach-in: it is an unauthenticated-shaped
write endpoint — no `isPermitted()` call and no session/CSRF check were found anywhere in
`modules/PurchaseOrder/setPPDValues.php` (confirmed directly against the live source for this spec;
see permissions.md) — that mutates another module's entity data. Full severity/exploit detail is
carried under risk PO-RISK-002 (risks-and-open-questions.md); the corresponding forward-looking
requirement (vendor-owned fields must be read via a service call, never written directly) is
Requirement R4 (entities-and-fields.md).

## Open Items

- The delivery-log popup template's controlling controller was not conclusively traced — its data
  source is presumably one of the DIB-integration ajax files, but this was not confirmed
  (PO-OQ-003).
- Whether `vtiger_temppodetails` (the older staging table) overlaps with cross-module import flows
  beyond what was traced was not fully resolved (PO-OQ-001).
- The authoritative `transcode` enum — referenced both in the financial pipeline and in RGN
  cancel-item processing — was not resolved from PurchaseOrder's own files alone; the source
  blueprint recommends cross-referencing Products' blueprint as a first step (this recommendation
  itself is preserved as an open item here, not acted on in this consolidation pass since it requires
  reading a different module's blueprint) (PO-OQ-005).
- The StoreTransfer and SalesOrder writes identified in this pass are, per the source blueprint's own
  summary judgment, "all either parameterized or at least keyed through the module's own entity class
  methods" — i.e. the Vendors write path (`setPPDValues.php`) is called out as the **only** case in
  this integration pass where a genuinely unguarded cross-module write was found. This comparative
  judgment is preserved here rather than independently re-verified line-by-line for every
  StoreTransfer/SalesOrder write path.
