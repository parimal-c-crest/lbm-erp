# SalesOrder — Outputs

> Keep this file even if this module produces no documents/reports/exports — state that explicitly
> below rather than deleting the file. See `_deviations-from-original-template.md` in this folder.

Source: `docs_from_blueprint/module/SalesOrder/06-outputs.md`, ultimately derived from
`blueprint/module/SalesOrder/05-outputs-pdf.md`.

## Applicability

This module produces documents/reports/exports. The module must support **ten distinct
output/document types**. Seven of them share a common data-gathering and rendering foundation in the
legacy system (the same order/line-item/address/payment data assembled once, then rendered
differently per document type) — this "one shared rendering capability, parameterized by document
type" architecture is itself a useful design insight worth preserving in a new implementation,
independent of whatever specific rendering technology is chosen. All ten below are described as
capabilities the system must support, not as any particular document-generation library.

| Output | Purpose | Trigger | Required Data | Audience | Total-Source (if applicable) |
|---|---|---|---|---|---|
| Invoice / Sales Receipt | The customer-facing bill/receipt for a finalized order — the definitive record of what was sold, at what price, and what's owed or paid. | Print/reprint action on a finalized order (the legacy system retries briefly if the order isn't yet finalized at print time, since printing is expected to happen right after finalize). | Order number, all order totals, line items (product/qty/price/tax), billing and shipping address, account, payment method(s), terms & conditions, customer PO number. | Customer | Reads the stored, already-finalized total — per R3, must read an already server-computed, already-verified total, never a value ever accepted as direct caller input. |
| Pick Ticket | Warehouse fulfillment document listing what to physically pull from stock — the internal counterpart to the invoice. | Print action during or after order entry, before or at finalize (may still be a working order). A configurable toggle can redirect this to print an Invoice instead. | Line items (product, order/ship quantity, location/bin, kit contents), order number, delivery preference, pick-ticket comments, truck/load type. | Internal (warehouse/fulfillment staff) | Not primarily a totals document; if totals shown, same total-source requirement applies. |
| Packing Slip | Shipment manifest accompanying physical goods — confirms shipment contents, typically without pricing. | Print action tied to shipping/delivery preparation. | Line items (product, ship quantity), shipping address, order number, carrier, tracking number. | Accompanies shipment (shipping-facing, not primarily a financial document) | Not applicable — no pricing shown. |
| Work Order | Internal document directing technicians on service/install work to perform — distinct from a product pick ticket. | Print action for orders flagged with service/install content. Subject to the same redirect toggle as the pick ticket. | Service/labor line items, technician, duration, install/target dates, description of work. | Internal (technicians/install crew) | Not applicable — not a totals document. |
| Worksheet | An internal working-document variant of the order printout; its precise distinguishing content versus the pick ticket/invoice was not independently confirmed in the source blueprint (flagged open). | Print action selecting the Worksheet print type. | Same base data set as the Invoice. | Internal | Same total-source requirement as Invoice — read only the server-computed, persisted total. |
| Order Acknowledgement | Confirms order details back to the customer (product, price, delivery terms) before/at fulfillment — the "we received and will fulfill this order as follows" document. | Print action explicitly routing through invoice-style rendering. | Line items, order total/subtotal, billing/shipping address, delivery preference, terms & conditions. | Customer | Same total-source requirement as Invoice. |
| Cost Report | Internal margin/cost-visibility document — cost basis alongside sell price, for management/accounting review. **The only one of the ten outputs that is inherently sensitive; cost data must never reach any customer-facing variant.** | Print action selecting the cost-report variant. | Line items (cost price, overridden cost, sale price, margin), order number, location. Whether it displays live current cost fields or the finalize-time computed margin was not confirmed in the source blueprint (flagged open). | Internal (management/accounting) — never customer-facing | Cost/margin fields, not order grand total — same "always server-computed" principle applies to whichever value it reads. |
| Quote ("Quote It") | Customer-facing price quote generated from an in-progress (not-yet-finalized) order. | Print action while the order is being worked as a quote. **Printing this document is itself a side-effecting status transition**, not a read-only action — if the order is classified as a contract, it routes as a Contract print instead. | Line items, order total, billing/shipping address, COD flag, quote expiration date, location classification. | Customer | Same total-source requirement — the working (Path A, always-live-recomputed) total, per calculations.md. |
| Legacy generic order document | An older, structurally independent order-to-document renderer, functionally overlapping with the Invoice but through a completely separate code path, using generic order-line association data rather than the module's own line-item mechanism, and computing its own total independently rather than reading the order's stored total. Likely legacy/superseded; not confirmed reachable from any current interaction in the source blueprint. | Direct request; forces a file-download rather than an inline view. No order-status gate was found, unlike the Invoice. | Account/contact, billing/shipping address, line items (via a generic association mechanism), terms & conditions, description, organization/company letterhead info. | Customer (by document shape) — but likely dead | **Violates R3 as documented**: computes its own total independently rather than reading the server-computed total. Not to be reproduced in a new implementation; resolve liveness (see Known Open Items) before deciding whether to port at all. |
| Legacy quote/invoice conversion view | A legacy generic display originally used to show a quote/order being converted into an invoice record for editing before save — not clearly a print/document output at all despite its naming. Uses deprecated data-access patterns, a strong (unconfirmed) signal of dead code. | Request with a specific conversion-mode parameter, or a plain invoice edit/new-record view. | Account, billing/shipping address (from a *different* module's address tables, not this module's own), line items via the same generic association mechanism as the legacy generic order document. | Ambiguous — likely an internal edit view, not confirmed customer-facing | Not applicable — not confirmed to be a totals-displaying output at all. |

## Total-Source Requirement For All Outputs

Per R3 (entities-and-fields.md) and the server-side recomputation requirement in calculations.md:
**every output must read an already server-computed, already-verified total — none should read or
trust a value that was ever accepted as direct caller input.** The legacy system's confirmed practice
for outputs 1-8 above (reading a stored total with zero recomputation anywhere between finalize and
print) is the print-layer manifestation of the module's Critical Risk #2 (risks-and-open-questions.md).
A new implementation closes it not by adding a recompute step at print time, but by making it
structurally impossible for an unverified total to ever reach the stored, printable state in the
first place.

## Known Open Items

- Whether the two legacy/standalone generators (Legacy generic order document, Legacy quote/invoice
  conversion view) are reachable from any current user interaction at all, or are fully dead code, was
  not confirmed — recommend resolving before deciding whether to port them into a new implementation.
- The Worksheet output's distinguishing content versus the Invoice/Pick Ticket was not traced into the
  rendering-template layer.
- The Cost Report's cost-field freshness (live current cost vs. finalize-time computed margin) was not
  confirmed.
- The business rationale for the pick-ticket/work-order/cost-report "print an Invoice instead" redirect
  toggle was not traced.
- Whether the Quote output's side-effecting print is safe to repeat/reprint (idempotent) was not
  confirmed in the source blueprint — directly relevant to this module's status-machine design
  (workflows.md), which requires this to be resolved by explicit design rather than left to accident in
  a new implementation.
