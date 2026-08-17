# SalesOrder — Cross-Module & Integration Touchpoints

Source: `docs_from_blueprint/module/SalesOrder/07-cross-module-integrations.md`, ultimately derived
from `blueprint/module/SalesOrder/06-cross-module-integrations.md`. The module's interface boundary
spans six related business capabilities and five external systems. Described here as
capability/data-contract needs — what crosses each boundary and in which direction — not as any
specific integration protocol or technology.

## Related Modules

| Module | What This Module Reads | What This Module Writes/Triggers | Direction | Sync/Async |
|---|---|---|---|---|
| Products / Inventory | Product/location cost basis, quantity-on-hand, quantity-allocated, kit/tax classification flags. | Quantity-on-hand and quantity-allocated are adjusted, weighted-average cost is recalculated and written, a sales/history record is maintained. | Bidirectional, dominated by writes from this module into Products/Inventory. | Synchronous — all writes happen inline, within the same finalize operation; no queued/deferred write path was found. |
| Accounts | Credit limit, a "disallow deposits" policy flag, and A/R type (which gates credit application). | A denormalized prior-balance snapshot is written onto the order; a "first sale" date/reference is written back to the account exactly once (idempotent, SO-RULE-080). | Bidirectional — continuous reads of account policy, narrow idempotent writes back. | Synchronous. No general account-record mutation originates from this module. |
| PurchaseOrder | Buyout-PO cost, matched by product and quantity. | This module also **creates/updates buyout purchase orders** by driving the PurchaseOrder capability's own save path, and reads cost data back from it. | Bidirectional. | Synchronous. A back-reference write (linking a buyout PO back to its originating order) exists in the legacy code but is disabled (commented out) — buyout POs never get this back-reference populated today; flagged as a known defect to fix (see risks-and-open-questions.md, Low risk). |
| Invoice | — | **No live path was found where this module creates an Invoice-capability record.** Finalizing an order only writes invoice-number/invoice-date fields onto the order's own record. | Reverse-only: the Invoice capability, when its own save path detects a linked order, writes a status value back onto this module's order. | Synchronous. Whether a true Invoice-capability record is ever created for a finalized order anywhere in the wider system was not confirmed — flagged open. A new implementation should not invent an Invoice-creation flow that doesn't demonstrably exist today. |
| StoreTransfer / Warehouse Management | Backorder/buyout resolution rows link to stock-transfer identifiers; warehouse tote/pick-list presence is checked. | This module **creates stock-transfer records** (user-triggered, not automatic on every save) and reduces warehouse pick-list quantities at pick/finalize/return time. A back-reference write (linking a stock transfer back to its originating order) is live and working (unlike the equivalent PurchaseOrder back-reference). | Bidirectional. | Synchronous, all inline. |
| Quotes | A quote reference, read at conversion time (the actual line-item/pricing copy at conversion is a generic platform mechanism, not module-specific code, and was not independently re-traced). | This module writes a "stage = Accepted" flip back to the linked quote **on every save where a quote link exists**, not only at conversion/finalize time. | Bidirectional — quote-to-order conversion inbound (platform mechanism); stage-flip outbound (module-specific, confirmed live). | Synchronous. |

## External Systems

| System | What Crosses the Boundary | Direction | Trigger | Sync/Async |
|---|---|---|---|---|
| Accounting system sync | Invoice/credit-memo header and line-item data (totals, cost, core, freight, labor, account, template), keyed by transaction/edit-sequence identifiers. | Outbound request; inbound acknowledgment/id-sync. | Finalize (and related credit-memo actions). | Asynchronous — a durable queue is written to, consumed later by an external client polling a separate integration surface. One narrow exception: a "real time" payment-push configuration option sends the payment leg synchronously. |
| Delivery-dispatch system (EliteExtra) | Order/invoice header and line items (customer, ship-to/bill-to address, delivery preference, COD flag, buyout pickup vendor address, notes, total). | Outbound only. | Post-save, gated by SO-RULE-009/SO-RULE-010 (delivery-push settings and account delivery-method config). | Synchronous, via two parallel mechanisms in the legacy system (an older file-transfer-based push and a newer inline API push). |
| Document-management system | Order header identifying data as a structured push; invoice/statement documents pushed via a separate command-line loader mechanism with site credentials. | Outbound only. | Finalize, gated by SO-RULE-076/SO-RULE-077. | Synchronous — both the structured-data push and the document-loader push are inline, blocking calls within the finalize request. The document-loader path in particular is flagged as a reliability concern for a new implementation (a blocking external-process call embedded in a critical business transaction). |
| Loyalty/coupon platform | (a) Coupon validation and redemption during pricing (SO-RULE-109/SO-RULE-110); (b) a full completed-order transaction (line items, totals, tax, customer identity) pushed at finalize. | Bidirectional — coupon pull/validate is two-way; the completed-transaction push is outbound only. | Coupon entry (pricing); finalize (transaction push). | Synchronous, inline, during finalize. |
| Internal delivery-log consumer | Buyout line-item pickup/delivery metadata (vendor, PO, delivery status, job name, target delivery time). | Outbound to an internal record only — **no confirmed external system was found consuming this data** in the source blueprint; if a genuine external consumer exists, it must poll/read independently. | SO-RULE-073/SO-RULE-074 (buyout-delivery log creation). | Not applicable — no outbound external call was found in this specific path. |

## Known Open Items

- The accounting-sync queue's exact consumption cadence and failure/retry handling were not
  confirmed.
- The internal delivery-log consumer's real-world external identity is unconfirmed — it may be purely
  internal, or an external consumer may exist entirely outside the traced code.
- The document-management integration's full business-facing name was never found spelled out in the
  traced code, only inferable from internal naming — recommend subject-matter-expert confirmation.
- A buyout-PO-related outbound call to what appears to be a third-party "return goods notification"
  endpoint was identified but its target system/business purpose was not independently confirmed.
- The dead PurchaseOrder back-reference write means buyout POs never get linked back to their
  originating order via that specific mechanism — carried forward as a known defect, not fixed in the
  source blueprint.
- The Quote-to-order conversion path itself (the inbound data-copy side, not the outbound stage-flip
  already confirmed) was attributed to a generic platform mechanism by convention, not independently
  traced.
- Whether a genuine Invoice-capability record is ever created for a finalized order anywhere in the
  wider system was not located.
