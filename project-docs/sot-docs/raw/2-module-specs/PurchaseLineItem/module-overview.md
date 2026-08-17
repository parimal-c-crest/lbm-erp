# PurchaseLineItem — Module Overview

> Origin: derived from `docs_from_blueprint/module/PurchaseLineItem/01-module-overview.md`, itself
> consolidated from `blueprint/module/PurchaseLineItem/00-README.md` and `00-pass0-inventory.md`
> (legacy-codebase extraction, not a BRD derivation). Nothing below is invented; all citations trace to
> those source documents.

## Purpose

PurchaseLineItem is a per-purchase-order-line **snapshot table**, denormalized off PurchaseOrder's own
line items — one row per received/finalized PO line, indexed so it can be searched, listed, and exported
independently of walking the parent PurchaseOrder's own line-item structure. It is confirmed to be **the
PurchaseOrder-side analog of SearchLineItem** — the same structural role SearchLineItem plays for
SalesOrder, but on the purchasing side. A Purchase Line Item captures, at the moment a PO line is
committed: the vendor, the parent PO number, the transaction type (normal purchase vs. return), the
line-committed date (labeled "PO Date" but not the PO's own header date — see `entities-and-fields.md`
§5 finding 3), the product/line-code purchased, purchased quantity/cost/core-cost and their extensions
(cost × qty), the receiving location, and an ASN (Advance Shipment Notice) number if the line was matched
to one.

**This module is fundamentally not an independently-authored business entity.** Standard vtiger CRUD
scaffolding (EditView, Save, DetailView, ListView, QuickCreate) is present, but no confirmed user-facing
write path was found anywhere in the codebase that reaches it. The module's 1,100 live rows are all
written by **six independent code paths** spread across three other modules (PurchaseOrder, Receiving,
POReconciliation) plus one shared helper function — a wider writer set than SearchLineItem's own single
dominant writer (SalesOrder's finalize routine).

Unlike SalesOrder, which serves several distinct business flows through one shared entity,
PurchaseLineItem serves a single, narrow purpose: providing a stable, query-optimized,
independently-searchable record of committed purchase lines, for consumption by reporting and
forecasting — not for direct authoring by an end user. The row-creation trigger is a **PO-status
transition** on the parent PurchaseOrder (to Finalized, Completely/Partially Reconciled, Order
Partially/Fully Received, or Fully Processed RGN) or a Receiving-flow buyout/append event. Two narrow
post-creation update paths exist beyond initial row creation — an ASN-number backfill and an idempotent
vendor-number re-derivation that runs on every save — but no general resync mechanism exists for the
row's other fields after initial write. The record is, in the source blueprint's own framing, "mostly
frozen after creation."

## Actors

- **Purchasing/receiving staff** — indirectly, through PurchaseOrder's finalize action, Receiving's
  append flow, or POReconciliation's cost-variance correction. These actions actually create/update
  PurchaseLineItem rows; no user directly authors a PurchaseLineItem record through this module's own UI
  (no confirmed live path).
- **Reporting/accounting/management staff** — the actual consumers of this module's data, via five
  `Customreport`-module reports (accrued-purchase-cost, linecode/subline-by-vendor, vendor-backorder,
  reconciled-by-user/date, core/warranty/defect QuickBooks-push context) and the generic ListView CSV
  export.
- **Forecasting system/process** — a daily cron reads PO-date/receipt-date data from this table as an
  input to lead-time/demand-forecasting calculations.
- **System/integration processes** — the ASN-matching flow (backfills the ASN number field), and the
  internal vendor-number-lookup step that runs on every save.

## Scope within this module

**In scope**: the one real entity's field catalog and its two satellite tables (one structurally live but
functionally inert, one genuinely ambiguous), the module's read/search/export surface (ListView,
DetailView, generic CSV export — the module's only output), and its interfaces to PurchaseOrder (its
dominant writer), Receiving and POReconciliation (its other writers), and the read-only
Customreport/Forecasting/Location consumers that depend on this table's data.

**Out of scope**:
- Redesigning PurchaseOrder's own status-transition/reconciliation engine — that engine *triggers*
  PurchaseLineItem's dominant writer, but is documented in full in PurchaseOrder's own module spec, not
  here.
- PurchaseOrder's own live-editing staging tables (`lbm_po_inventoryproductrel`, `lbm_iframepodetails`,
  `vtiger_temppodetails`) — a distinct, PurchaseOrder-owned concern. PurchaseLineItem is specifically the
  **committed, post-finalize snapshot**, not the live-editing working table.
- The shared `vtiger_sotransaction` transaction-code table, reused verbatim from SalesOrder — not
  redesigned as a PurchaseLineItem-owned concept.
- `CallRelatedList.php`/`updateRelations.php` — confirmed verbatim Campaigns-pattern leftovers with no
  PurchaseLineItem-specific logic, not carried forward at all.
- The Customreport-module consumers' own report logic — this document's boundary is the read-query
  interface they consume, not their own report layouts/formats.
- Deployment/rollout sequencing and selecting an implementation technology stack (explicitly deferred).

## Origin

**Extracted-from-legacy.** Source system: the legacy LBM (Fuse5) vtiger 5.0.4 fork, module directory
`modules/PurchaseLineItem/`. Consolidated from the 11-file business blueprint at
`blueprint/module/PurchaseLineItem/` via `docs_from_blueprint/module/PurchaseLineItem/`
(`00-README.md` through `10-build-guidance.md`). This is the eleventh module processed under this
documentation-extraction method, following the SalesOrder pilot. Every claim traces back to the original
blueprint; ambiguity found there (unclear field meanings, unconfirmed reachability, "flagged for SME
confirmation" findings) is preserved as ambiguity here rather than resolved into an invented answer.

## Dependencies

- **PurchaseOrder** — the dominant writer (four of the six writer paths: primary finalize-time writer,
  append-line writer, reverse-return-PO writer, plus a narrow ASN-number backfill update). PO-status
  transitions are the entity's row-creation trigger.
- **Receiving** — one writer path (line-append flow, via a shared helper function).
- **POReconciliation** — one writer path (cost-variance-correction update; the only writer that both reads
  and writes an existing row).
- **Vendors** — referenced via vendor id and a denormalized, save-time-re-derived vendor number.
- **Products** — referenced via product number and product id.
- **Location** — referenced via a display-name text field (not a real foreign key in the legacy schema).
- **Customreport, Forecasting, Location, Products** — read-only downstream consumers (see
  `integrations.md`).
