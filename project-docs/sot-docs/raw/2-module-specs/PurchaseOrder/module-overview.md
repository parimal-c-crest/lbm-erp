# PurchaseOrder — Module Overview

## Purpose

PurchaseOrder is a large hub module of the vtiger-5.0.4-derived multi-tenant ERP ("lbm-integer"),
verified at 129 files under `modules/PurchaseOrder/` plus 3 Smarty templates (132 total),
40,141 lines of PHP/JS. A Purchase Order represents an order for products placed with a vendor: it
captures what is being ordered (line items with cost/currency/UOM detail), from which vendor and to
which ship-to location, tracks its lifecycle from creation through receiving, cancellation, and
reconciliation, drives generation of PO documents across three separate PDF-rendering engines, and
integrates outbound to three EDI vendor networks (DoItBest, EJD, Orgill), a separate Acconex/WMS
integration, and QuickBooks accounting. The module's functional surface spans PO creation/editing;
line-item and staging management (line items pass through staging tables while a PO is open for
edit before commit); cost/pricing/currency (cost overrides, LIFO cost-history tracking,
Equivalent-Part cost sync, multi-currency conversion, prepaid-discount/PPD handling); receiving,
cancellation, and backorder handling (the core status-transition engine); reconciliation
(receiving-side vs. invoice-side variance posting, including region-specific Irish/UK VAT handling);
RGN (Return Goods Notice) / reverse-RGN return flows; EDI and WMS integrations; QuickBooks accounting
push; automatic Store Transfer generation; forecast/order-point-driven auto-reordering (the largest
single functional area by line count — `processForecastLineCode.php` alone is 1,070 lines); PO
templates and scheduled/recurring POs; and multi-format document/PDF generation plus CSV
import/export. (Source: `docs_from_blueprint/module/PurchaseOrder/01-module-overview.md` §1.1–1.2,
citing `blueprint/module/PurchaseOrder/00-README.md` "Summary" and `00-pass0-inventory.md` "Scope
note".)

## Actors

- **Buyer / purchasing staff** — create and edit POs (standard and pre-edit/suggested-PO flows),
  build suggested POs from order-point/forecast logic, apply cost overrides, manage templates.
- **Vendor** — recipient of the PO document (print/email/EDI); source of vendor-specific cost basis,
  PPD terms, currency, and EDI capability configuration.
- **Warehouse / receiving staff** — process receiving, cancellation, and backorder actions that drive
  the status-transition engine.
- **Reconciliation / accounting staff** — reconcile receiving-side vs. invoice-side amounts, own the
  chart-of-accounts (COA) mapping and region-specific VAT handling, and the QuickBooks push.
- **System/integration processes** — the three EDI vendor-network adapters (DoItBest, EJD, Orgill),
  the Acconex/WMS integration, the QuickBooks push, the scheduled-PO cron
  (`fuse5_scheduled_po_templates`), and the forecast/order-point auto-reorder engine.
- **SalesOrder module (cross-module actor)** — source/consumer of the BOPO (buyout-PO) and RGN
  cross-linkage that ties specific PO lines back to originating SalesOrder lines.

(Source: `docs_from_blueprint/module/PurchaseOrder/01-module-overview.md` §1.4, citing
`06-cross-module-integrations.md` "Vendors"/"SalesOrder".)

## Scope within this module

**In scope**: PO creation/editing, line-item cost/currency/UOM management, receiving/
cancellation/backorder handling, reconciliation, RGN/reverse-RGN return flows, the three EDI
vendor-network integrations plus Acconex/WMS, QuickBooks accounting push, store-transfer generation,
forecast/order-point-driven auto-reordering, PO templates and scheduled/recurring POs, multi-format
document/PDF generation and CSV import/export, and this module's interfaces to Vendors, SalesOrder,
StoreTransfer, Location, Products, QuickBooks, and SalesHistory.

**Out of scope**:
- Generic record-sharing/CRM-framework plumbing inherited from the underlying vtiger platform — not
  business-specific to PurchaseOrder.
- The other ~124 modules of the wider ERP (PurchaseOrder is the second module processed under this
  method, following the SalesOrder pilot).
- Deployment/cutover sequencing across the wider system in full operational detail — covered at
  outline depth only, in build-guidance.md §10.6 below.
- Selecting an implementation technology stack (explicitly deferred, consistent with the SalesOrder
  pilot's own scope decision).

(Source: `docs_from_blueprint/module/PurchaseOrder/01-module-overview.md` §1.3, citing
`blueprint/module/PurchaseOrder/00-README.md` document index and `00-pass0-inventory.md`
functional-area grouping.)

## Origin

**Extracted-from-legacy.** This spec is derived from `docs_from_blueprint/module/PurchaseOrder/`
(10 topic files + README), which itself reorganizes and lightly re-edits the 12-file PurchaseOrder
Business Blueprint at `blueprint/module/PurchaseOrder/` (`00-README.md` through
`10-deployment-cutover-outline.md`). Every claim in the blueprint traces to source-code citations
(file:line) or live-database observations (row counts, `DESCRIBE` output) gathered against the
`lbm-local-integer` legacy codebase and dev database; nothing in this chain invents new facts.
Ambiguity found in the blueprint (unresolved open questions, "not fully traced" notes, unconfirmed
table overlaps) is preserved as ambiguity through this spec rather than resolved into an invented,
false-confident answer. Permissions content in `permissions.md` is a genuine net-new extraction
against the live `modules/PurchaseOrder/` source tree (grep for `isPermitted(`), not carried forward
from the blueprint, since the blueprint did not itself catalogue permissions.

## Dependencies

Per the cross-module integration analysis (`integrations.md` below, sourced from
`docs_from_blueprint/module/PurchaseOrder/07-cross-module-integrations.md`), PurchaseOrder is a
genuine hub module with dependencies on:

- **Vendors** — reads tax-exemption/authority code, vendor line-code aliases, default
  currency/price-sheet cost, cost-basis preference, EDI capability; writes PPD type/amount directly
  into a Vendors-module table (a confirmed cross-module boundary violation, see integrations.md and
  risks-and-open-questions.md).
- **SalesOrder** — bidirectional BOPO/RGN/Door-NS linkage, and a shared SO/PO edit-lock table.
- **StoreTransfer** — outbound trigger: a finalized PO with a pending transfer relationship
  automatically creates a Store Transfer.
- **Location** — bidirectional; a pre-edit "order to min/max" flow is a Location-driven reorder
  calculation surfaced through PurchaseOrder.
- **Products** — bidirectional, dominated by reads (line-item product references, images/detail
  popups), with a confirmed cost/LIFO write into a Products/Location-adjacent table.
- **QuickBooks** — outbound trigger for RGN-return financial postings and reconciliation linkage.
- **EDI vendor networks (DoItBest, EJD, Orgill) + Acconex/WMS** — bidirectional outbound
  submission / inbound availability-confirmation.
- **SalesHistory / analytics** — read-only consumer, for reorder-quantity decision support.
