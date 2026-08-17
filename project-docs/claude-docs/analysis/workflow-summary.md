# Workflow Summary

Main end-to-end workflows reconstructed from each module's `workflows.md` and `screens-and-user-flows.md`.
Numbered steps in plain language, not diagrams. Every workflow below is traceable to the cited source.

## 1. Order-to-cash (core sales flow)

*Sources: `SalesOrder/workflows.md`, `screens-and-user-flows.md`, `Accounts/workflows.md`,
`SalesHistory/workflows.md`, `AccountStatement/outputs.md`.*

1. Counter/sales staff create a Sales Order (standard flow or the faster "Quick SO" AJAX flow) —
   select account/contact, location, order classification (plain order / quote / contract), delivery
   preference; add line items via product lookup, barcode scan, or historical-quote copy.
2. Coupons, manual price overrides, or docket/contract-amount rounding applied as needed; deposit
   details entered.
3. Order saved as Pending (or a quote/contract-flavored sub-status). A credit-hold interrupt can force
   the order into an approval-hold sub-status if the account is over its limit or past due.
4. If a line item can't be fulfilled directly, a backorder/buyout/stock-transfer resolution runs —
   buy out from a vendor (triggers PurchaseOrder), transfer from another location, or backorder.
5. Order finalized: cost/margin resolved per line (FIFO/LIFO/buyout/manual-override), totals
   recomputed, invoice metadata written, pushed to accounting sync / delivery-dispatch / document-
   management / loyalty-platform integrations, ten possible print/PDF outputs become available.
6. SalesOrder's finalize routine writes sell/return activity into SalesHistory as a side effect
   (one of SalesHistory's four independent writers).
7. Deposits/ROA funds applied against the order; accounts-receivable activity flows into Accounts'
   balance/aging and, periodically, into an AccountStatement generation/delivery cycle (single, quick,
   batch, or archived statement; delivered via print/email/fax).

**Open item carried into gap analysis**: no rule anywhere in the legacy code confirms account, order
number, location, or deposit amount as genuinely required at save time, despite being documented as
required fields — the single highest-priority unresolved question in the SalesOrder blueprint.

## 2. Procure-to-pay (core purchasing flow)

*Sources: `PurchaseOrder/workflows.md`, `screens-and-user-flows.md`, `PurchaseLineItem/module-overview.md`,
`PurchaseHistory/module-overview.md`, `Vendors/integrations.md`.*

1. A PurchaseOrder is created directly, or generated from a SalesOrder buyout/backorder resolution, or
   built from a suggested-PO flow (PrePOEditView).
2. PO moves through an 8-value status pipeline: Approved → Finalized → Order Partially/Completely
   Received → Order Completely Cancelled → Partially/Completely Reconciled → Fully Processed RGN
   (return-goods-notification).
3. On finalize/line-append, PurchaseLineItem records a committed snapshot of each line (one of 6
   confirmed writer call sites across PurchaseOrder, Receiving, and POReconciliation).
4. Receiving updates on-hand quantity at Location; reconciliation compares received vs. invoiced
   quantities, computing a VAT-bucket variance.
5. PurchaseHistory accumulates buy/return counters per product/line-code/week/location as a side
   effect of the same PurchaseOrder finalize/receive/RGN events.
6. Vendor freight (PPD) values are written back to Vendors — three separate legacy code paths do this,
   only one confirmed correct.
7. QuickBooks/EDI sync and forecast/auto-reorder processing run against the finalized PO data.

## 3. Pricing resolution (applies to every order/line)

*Sources: `MPLPricePlan/calculations.md`, `Pricebooklevel200/calculations.md`,
`Pricebooklevel300/calculations.md`, `Pricebooklevel800/calculations.md`, `Products/calculations.md`.*

1. For a given product/account/location, up to four pricing mechanisms may apply: MPLPricePlan (named
   plan, rarely used — 99.9% of assignments use "no plan"), Pricebooklevel200 (the real primary
   pricing path, specificity-scored rule matching), Pricebooklevel300 (adds a coupon layer),
   Pricebooklevel800 (currently non-functional for most products — header table has 0 rows).
2. Cross-tier precedence between the three Pricebooklevel tiers is **not resolved** anywhere in the
   SoT — flagged as an open cross-module dependency in multiple module specs.
3. Resolved price feeds into the SalesOrder line-pricing pipeline (sell-price resolution → coupon/
   promotion discount → per-line tax → order-level rounding correction → extended total → subtotal →
   total → deposit/credit netting).

## 4. Unit-of-measure conversion (cross-cutting utility)

*Source: `UOM/integrations.md`, `calculations.md`.*

1. Any module needing to convert between a product's base unit and a display/sale unit is meant to
   call one shared UOM conversion function.
2. In practice, 46+ files across a dozen-plus modules bypass this and read/compute the conversion
   directly against UOM's own tables — including one independent SQL reimplementation of the formula,
   a confirmed drift risk.

## 5. Inventory accumulator flows (SalesHistory / PurchaseHistory)

*Sources: `SalesHistory/workflows.md`, `calculations.md`, `PurchaseHistory/workflows.md`.*

1. Both are pure rolling accumulators, not workflow-bearing entities — no domain-specific status field
   exists on either.
2. A row is created on first write for a (product, line-code, week, year, location) key; subsequent
   writes for the same key read-modify-write (add a delta), except a manual "correction" interaction
   that overwrites a single field directly and recomputes the derived total.
3. SalesHistory has four independent writers (its own save form, SalesOrder finalize, Location's
   weekly lost-sale cron, one-off migration scripts) — three confirmed to compute the derived total
   differently, with no locking. PurchaseHistory's three writers (all inside PurchaseOrder) agree.

## 6. Identity, access, and payroll (Users module)

*Source: `Users/workflows.md`.*

1. Users authenticate; role/profile/group assignments (checked by ~126 other modules) gate access.
2. Time-clock punches accumulate toward a payroll pipeline (hours worked, overtime via two divergent
   formulas, pay-period aggregation) — live data shows 96% of punches remain open, silently excluded
   from totals.
3. No persistent login-lockout mechanism exists; the module's own admin actions (create/edit/delete
   Role/User/Profile/Group) are gated only by a simple `is_admin` check, not the Role/Profile system
   the module implements for everything else.

## Ambiguities carried to gap analysis

- No single end-to-end diagram or document in the SoT ties these six flows together — this summary is
  synthesized from per-module `workflows.md`/`integrations.md` files, not a single source document.
- Cross-tier pricing precedence (workflow 3, step 2) is a genuine open design question, not merely an
  undocumented detail.
- Whether/how the ~75-93 modules outside the MVP-18 connect to these six core flows is unknown — no
  SoT material exists for them yet.
