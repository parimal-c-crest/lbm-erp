# Module List

**15 target modules** (down from 18 blueprinted legacy modules) — the legacy system's 4 separate
pricing mechanisms (MPLPricePlan, Pricebooklevel200/300/800) are unified into one `pricing` module
per `decisions-log.md` ADR-029, so 18 blueprinted legacy modules → 15 modules to actually build.
Future `approved-docs/docs-kit/5-modules/<slug>/` folder name given per module. Provenance noted
where it differs from the standard 9-pass blueprint (UOM, AccountStatement — see `sot-docs/index.md`).

---

### SalesOrder — slug: `sales-order`
Core order-capture-through-fulfillment module. Captures line items, pricing (tax/discounts/deposits/
coupons), tracks lifecycle from draft/quote through fulfillment to invoiced, drives 10 printed/PDF
outputs. Covers plain orders, quotes, service contracts, and a faster "Quick SO" AJAX flow over the
same entities. Pilot module for the whole documentation initiative.
*Sources: `raw/2-module-specs/SalesOrder/*` (all 11 files).*

### Accounts — slug: `accounts`
Customer/company hub: identity/hierarchy, billing/credit, statement generation/delivery, stored
payment methods, B2B storefront access, SPA/MPL pricing exceptions. 112 business rules, largely
auto-fills/overrides rather than true server-side hard blocks.
*Sources: `raw/2-module-specs/Accounts/*` (all 11 files).*

### Users — slug: `users`
Identity/RBAC backbone: auth, roles/profiles/groups, sharing rules, time-clock/payroll, plus a long
tail of personal-productivity features. ~126 other modules depend on it for permission checks. Root
cause of a confirmed real data-loss incident.
*Sources: `raw/2-module-specs/Users/*` (all 11 files).*

### Location — slug: `location`
Branch/store header plus product-at-location quantity-on-hand ground truth every transactional module
joins against. Two entities sharing one module (Branch: 7 rows; Product-at-Location: 72,104 rows).
*Sources: `raw/2-module-specs/Location/*` (all 11 files).*

### Products — slug: `products`
Catalog master — identity, pricing, tax, UOM data every line-item-building module depends on. Largest
module in the series (209 source files), widest blast radius of any single module.
*Sources: `raw/2-module-specs/Products/*` (all 11 files).*

### Vendors — slug: `vendors`
Supplier master: identity/contact/GL/freight config plus the shared vendor line-code purchasing
taxonomy consumed by Products and SalesOrder. Highest Critical-finding *density* in the series.
*Sources: `raw/2-module-specs/Vendors/*` (all 11 files).*

### SearchLineItem — slug: `search-line-item`
Materialized read-model snapshot of finalized SalesOrder lines (7,074 live rows) — SalesOrder is the
sole writer; consumed by a Ford EDI export and a mobile-scanner integration.
*Sources: `raw/2-module-specs/SearchLineItem/*` (all 11 files).*

### Settings — slug: `settings`
Multi-domain configuration/integration hub — 236 source files, no single owned entity, 209 business
rules, ~47 confirmed SQL injection sites. Includes payment-gateway/AWS S3 credential storage (worst
credential-handling finding in the corpus) and the QuickBooks/EDI integration configuration surface.
*Sources: `raw/2-module-specs/Settings/*` (all 11 files).*

### SalesHistory — slug: `sales-history`
Per-product/line-code/week/location rolling sales-activity accumulator (sell/return/lost-sale/
transfer/false-loss counters). Second module blueprinted (small, 21 files) but genuinely
multi-writer: 4 independent code paths write to it, 3 confirmed to disagree on its one derived
formula.
*Sources: `raw/2-module-specs/SalesHistory/*` (all 11 files).*

### PurchaseOrder — slug: `purchase-order`
Hub module spanning PO creation, receiving/reconciliation, return-goods-notification, EDI/
QuickBooks integration, forecast/auto-reorder, templates, PDF/CSV output. 129 files, 40,141 lines —
the purchasing-side counterpart to SalesOrder.
*Sources: `raw/2-module-specs/PurchaseOrder/*` (all 11 files).*

### PurchaseLineItem — slug: `purchase-line-item`
Purchase-side analog of SearchLineItem — committed, post-finalize line-item snapshot written by 6
code paths across 3 modules (PurchaseOrder, Receiving, POReconciliation). Cleanest field-coverage of
any module in the series (no true orphan fields).
*Sources: `raw/2-module-specs/PurchaseLineItem/*` (all 11 files).*

### PurchaseHistory — slug: `purchase-history`
Purchase-side counterpart to SalesHistory (buy/return counters only, no lost-sale/transfer). Sole
writer is PurchaseOrder via 3 call sites. Cleanest cross-writer formula agreement in the series (all 3
writers compute the total identically).
*Sources: `raw/2-module-specs/PurchaseHistory/*` (all 11 files).*

### Pricing — slug: `pricing`
**Unified module, replacing the legacy system's four separate pricing mechanisms** (MPLPricePlan,
Pricebooklevel200, Pricebooklevel300, Pricebooklevel800) per `decisions-log.md` ADR-029 — one engine,
one precedence model, one schema, instead of four separate ports with an unresolved cross-tier
precedence question. Design grounded in what each legacy mechanism actually proved out in production:
core engine generalized from Pricebooklevel200's specificity-scored rule-matching (confirmed the real,
live primary pricing path); named-plan concept from MPLPricePlan folded in as one input to the same
engine (legacy: 99.9% unused, dormant rule sub-entity); promotion/coupon layer from Pricebooklevel300
carried forward as a genuinely wired-in discount source (closing its legacy "dead-end," where a
coupon gated eligibility but never affected price); Pricebooklevel800 **not ported as live
functionality** (legacy header table confirmed 0 live rows) — documented for historical traceability
only, with a flagged confirmation step against real production data at this module's own
field-extraction stage before treating the drop as final.
*Sources: `raw/2-module-specs/MPLPricePlan/*`, `Pricebooklevel200/*`, `Pricebooklevel300/*`,
`Pricebooklevel800/*` (all 44 legacy files, as design input — not four separate module folders).*

### UOM — slug: `uom`
Unit-of-measure conversion — extracted as its own capability because it's genuinely shared logic
touching a dozen-plus modules with no real boundary in the legacy system (46+ files bypass its own
shared conversion function via direct table access). **Lower documentation rigor than the other 16
modules** — session-found, no independent Pass-7 re-verification, no formal rule catalog. No separate
legacy vtiger module/blueprint of its own; extracted from Products + session research.
*Sources: `raw/2-module-specs/UOM/*` (all 11 files).*

### AccountStatement — slug: `account-statement`
Statement generation/delivery — extracted from Accounts as its own capability because it's large and
self-contained enough to warrant one, despite living inside legacy Accounts' code. **Lower rigor than
the 16 blueprint-sourced modules** — a filtered subset of Accounts' own business-rules/risk register,
not independently re-swept.
*Sources: `raw/2-module-specs/AccountStatement/*` (all 11 files).*

---

## Confirmed future additions (not part of the 15-module MVP count)

### ProductTracking — slug: `product-tracking`
Quantity-on-hand audit log — one row per QoH-affecting event (sale, return, receiving, transfer,
adjustment, product-cut, physical count, import) across the whole ERP, plus a self-contained
cost-basis calculation on every row. Real, actively-written legacy module (15,013 live rows,
2022-06-17 through 2026-07-13) with no prior blueprint anywhere in the SoT docs — identified,
blueprinted fresh, and fully design-reviewed in one session (ADR-166 through ADR-170). Written to by
≥11 other modules plus an external mobile-scanner webservice; the first module in this project with
an endpoint reachable from outside the session-authenticated web app entirely. Not yet added to the
formal 15-module MVP build sequence — pending developer decision on where it slots in.
*Sources: `raw/2-module-specs/ProductTracking/*` (all 11 files).*

### StoreTransfer — not yet blueprinted
Full legacy module (finalize flow, pick-ticket PDFs, QuickBooks push, EDI, scheduled templates)
referenced from PurchaseOrder's and SalesOrder's own store-transfer-creation entry points. Confirmed
deferred past MVP 1 (ADR-144) — an intentional scope decision, not missed/overlooked scope. No
blueprint exists yet; design review deferred until it's scheduled.

---

## Ambiguity note

No SoT document states formal module-boundary decisions for the 93 (or 111 — see Conflicts) modules
beyond this MVP-18. Which of the remaining ~75-93 modules map to which future `5-modules/` slug is
not yet determined — **handed to gap analysis**, not guessed at here. ProductTracking and
StoreTransfer (above) are the two specific exceptions identified and resolved so far, out of that
larger unresolved set.
