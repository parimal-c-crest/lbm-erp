# Requirements — LBM ERP Rewrite

These are business-level functional requirements, organized by module, pulled from each module's own
tech-agnostic specification. They describe what each module has to do, not how — implementation-level
detail (the full numbered rule catalogs, field-by-field schemas) lives in
`docs_from_blueprint/module/<Name>/` for whoever picks this up next.

## Cross-cutting requirement: closed-by-construction security

This applies to every module below and is called out once here rather than repeated seventeen times.
Every module we've blueprinted so far has at least one confirmed, live SQL injection, and the pattern
isn't isolated bad code in a few places — it's the absence of a consistent data-access discipline
across the whole system. The rewrite's data-access layer must make unescaped/unparameterized queries
structurally unavailable to ordinary business logic, not merely discouraged by code review. This is not
a nice-to-have; it's the single requirement the business case rests on most heavily.

## SalesOrder

Must support plain sales orders, quotes, service contracts, and a faster condensed order-entry flow,
plus buyout/backorder/transfer order types. Order totals must be recomputed server-side, not trusted
from client submission — closing the confirmed client-trusted-total defect. Must generate ten
distinct document/output types (invoice, pick ticket, packing slip, work order, worksheet, order
acknowledgement, cost report, quote, plus two legacy generators that may be dead and need confirming).

## Accounts

Must maintain customer account master data, credit limits, and B2B portal access. Authentication must
never compare credentials in plaintext or build queries by string concatenation — this closes a
confirmed, currently-live defect, not a hypothetical one. Statement-related functionality is specified
separately under Account Statement, below.

## Users

Must maintain internal user accounts, roles, permissions, and time-clock data. Role deletion must not
be able to cause the kind of data loss traced back to this module's `deleteRole()` logic in a prior
incident — this requirement exists because of a real, already-occurred failure, not a theoretical one.

## Location

Must track quantity-on-hand per product per location and must never allow it to go negative — this
closes a confirmed gap that exists across four independent write paths in the legacy system today.

## Products

Must maintain the product catalog, including classification, pricing inputs, and barcode data. Barcode
uniqueness must be enforced — it isn't today. The Weighted Average Cost calculation must use the
corrected formula (the legacy version silently drops half its intended input blend) pending sign-off
from whoever owns pricing policy. Whether the legacy Door Configuration subsystem is in scope at all is
an open product-owner decision, not assumed either way.

## Vendors

Must maintain vendor master data and line-code pricing agreements, with each vendor's data genuinely
independent — the legacy system currently allows one vendor's edit to silently overwrite another
vendor's data when they share a line code, and that must not carry forward.

## SearchLineItem

Functions as a read-model over data SalesOrder's finalize routine actually owns. The rewrite should
model this honestly as a derived/read view rather than reproducing a nominally-independent save path
that, in the legacy system, isn't actually exercised.

## Settings

Must manage org-wide configuration, tax setup, company profile, and third-party integration
credentials. Credentials must be stored encrypted, never in plaintext — this is the single highest-
priority closure in the entire MVP set, given the current system's confirmed plaintext storage of AWS
and payment-gateway credentials.

## SalesHistory

Must maintain a historical sales rollup used for reporting and reorder decisions, computed by exactly
one owned process — not four independently-drifting writers computing the same figure differently, as
in the legacy system today.

## PurchaseOrder

Must support purchase order creation, a real multi-field status lifecycle (not a picklist that's
supposed to govern valid values but currently sits empty), and vendor-cost tracking. Must never
construct a SQL column identifier from request input under any circumstance — this closes a confirmed
defect reachable from a routine PO edit.

## PurchaseLineItem

Functions as a read-model over data PurchaseOrder's own writers actually own, similar to
SearchLineItem — should be modeled as such rather than as an independently-writable table set.

## PurchaseHistory

Functions as a read-model over PurchaseOrder-side writers. Notably, the legacy system's three real
writers already agree on their formula byte-for-byte — this is one requirement the rewrite mostly needs
to preserve rather than fix.

## MPLPricePlan

Must support authoring master pricing rules, without a mechanism that can reach into and delete data
belonging to an unrelated pricing module — this closes a confirmed cross-module boundary violation in
the legacy system.

## Pricebooklevel200 / 300 / 800

Must each support a tiered, customer-specific pricing-rule engine, with pricing rules owned by a real,
enforced relationship rather than a name-matched join to a nominally separate sibling module. Must
resolve, as one shared decision across all three tiers, which pricing tier takes precedence when more
than one could apply to the same account — currently unresolved and flagged as a hard blocker before
cutover.

## UOM (Unit of Measure)

Must provide one canonical service for unit-of-measure configuration and quantity/price conversion,
consumed by every module that currently reaches directly into its data (order entry, purchasing,
receiving, warehouse allocation, manufacturing, kits, and reporting) — closing the drift risk that's
already materialized as at least one independent, diverging copy of the conversion formula.

## Account Statement

Must generate, archive, and deliver customer billing statements (single-account, batch, and archived
retrieval, across print/email/fax channels) from one shared calculation path — specifically resolving
the confirmed disagreement between the manual/batch finance-charge calculation and the automated
cron-path calculation, which currently produce materially different charge amounts for the same
account under certain payment terms.
