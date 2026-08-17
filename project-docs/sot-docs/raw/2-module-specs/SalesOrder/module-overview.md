# SalesOrder — Module Overview

> Copy this whole `2-module-spec-template/` folder per module, rename, fill in. Stay tech-agnostic
> throughout — no framework/database/language references anywhere in Stage 2.

## Purpose

SalesOrder is the core order-capture-through-fulfillment module of a vtiger-5.0.4-derived
multi-tenant ERP system. A Sales Order represents an order for products and/or services sold to a
customer account: it captures what is being sold (line items), to whom (account/contact,
billing/shipping address), at what price (with tax, discounts, deposits, and coupons), tracks its
lifecycle from a working draft/quote through fulfillment to a finalized, invoiced state, and drives
the generation of ten different printed/PDF business documents (customer invoice, warehouse pick
ticket, quote, etc.). The same underlying order concept serves several related but distinct
business flows that all converge on the same entities: a plain sales order, a quote (a price
proposal that may later be accepted and converted into a firm order), a service contract, and a
Quick SO (an alternate, faster, AJAX-heavy data-entry flow over the same shared capability set as
the standard order-entry screens). The module also captures buyout/backorder/stock-transfer
resolution — how a shortfall is resolved when a product isn't available to sell directly (special
order from a vendor, transfer from another location, or backorder).

## Actors

- **Customer** — the party the order is sold to; receives customer-facing outputs (invoice, order
  acknowledgement, quote).
- **Counter/sales staff** — create and edit orders, including via the faster Quick SO flow; select
  delivery preferences, apply coupons/deposits, finalize orders.
- **Warehouse/fulfillment staff** — consume internal outputs (pick ticket, packing slip, work
  order) and drive the fulfillment sub-status pipeline.
- **Accounting/management** — consume the cost report output; own the deposit/ROA and credit
  application processes; own the accounting-system sync.
- **Delivery/dispatch staff and external delivery-dispatch system** — consume delivery-preference
  and COD data pushed at save/finalize time.
- **System/integration processes** — the accounting-sync queue consumer, the loyalty/coupon
  platform, a document-management system, and an internal delivery-log consumer.

## Scope within this module

**In scope**: order capture, line-item pricing, tax calculation, deposits/ROA
(received-on-account) handling, the status/fulfillment lifecycle, order finalization, the ten
print/PDF outputs, and this module's interfaces to six related business capabilities (Products,
Accounts, PurchaseOrder, Invoice, StoreTransfer/warehouse-management, Quotes) and five external
system integrations (accounting sync, delivery dispatch, a document-management system, a
loyalty/coupon platform, and an internal delivery-log consumer).

**Out of scope**:
- Generic record-sharing/audit plumbing inherited from the underlying CRM framework — not
  business-specific to SalesOrder.
- The other ~125 modules of the wider ERP. SalesOrder is the pilot module for a 126-module-wide
  documentation/modernization initiative; the patterns established here are meant to generalize,
  but this document does not itself specify those other modules.
- Deployment/rollout sequencing across the wider system (kept at outline depth per the source
  blueprint).
- Selecting an implementation technology stack (explicitly deferred).

## Origin

Extracted-from-legacy, blueprint-sourced, see blueprint/module/SalesOrder/. This file is drawn
from `docs_from_blueprint/module/SalesOrder/01-module-overview.md`, which is itself sourced from
`docs_from_blueprint/SalesOrder.md` §1 (the original consolidated doc), ultimately derived from
`blueprint/module/SalesOrder/`. No open questions were raised specifically by this overview-level
material; open questions surfaced elsewhere in the blueprint are carried into this spec's other
files (workflows.md, calculations.md) where they apply.

## Dependencies

Drawn from the module-overview's §1.3 "In Scope" cross-module integrations list, the module
depends on / interfaces with:
- **Products** — line items reference product records for pricing, cost basis, and
  buyout/backorder resolution.
- **Accounts** — the customer/account the order is sold to; source of billing/shipping address
  and credit-hold/over-limit signals.
- **PurchaseOrder** — special-order/buyout items generate purchase orders against a vendor.
- **Invoice** — order finalization produces invoiced-order state and drives invoice output.
- **StoreTransfer / warehouse management** — stock-transfer resolution when a product is
  fulfilled from another location; drives inventory allocation/adjustment.
- **Quotes** — the quote business flow (price proposal, acceptance, conversion to a firm order)
  shares the same underlying SalesOrder entity and line items.

In addition, the module pushes data to five external system integrations noted in scope: an
accounting-sync system, a delivery-dispatch system, a document-management system, a loyalty/coupon
platform, and an internal delivery-log consumer.
