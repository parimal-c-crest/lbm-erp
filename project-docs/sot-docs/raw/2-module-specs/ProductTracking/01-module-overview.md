# ProductTracking — Module Overview

Part of the ProductTracking tech-agnostic module spec. Source: `blueprint/module/ProductTracking/
00-README.md` and `00-pass0-inventory.md` (Doc1 Pass 0), ultimately derived from
`blueprint/module/ProductTracking/`.

## 1.1 What this module is

ProductTracking is a **quantity-on-hand (QoH) audit log** — one row per QoH-affecting event on a
product/location combination: sale, return, receiving, store transfer, manual adjustment, product-cut,
physical count, import, and more. Each row records the previous and new quantity on hand, a free-text
reason, a fixed classification of what kind of event produced it (`change_type`), who/what triggered it,
and a costing snapshot (unit cost, net cost, accounting cost, accounting net cost, WAC) computed
server-side at save time (Pass 0, Pass 1 §1).

**This module is structurally a write-target for other modules' inventory logic, not a
user-authored entity.** It carries its own generic vtiger CRUD/related-list scaffolding, but the real,
load-bearing writes come from at least 11 other modules plus 2 external-facing mobile-scanner
webservice endpoints (Pass 0; Pass 6 §1.0). Unlike a module whose own EditView/Save.php form is the real
write path, ProductTracking's own save form is present but architecturally secondary to the shared
write functions and direct entity instantiations its ≥26 confirmed callers use.

Despite this write-target shape, the table is a real, actively-growing operational asset: **15,013 live
rows** at blueprint time, spanning dates from **2022-06-17 through 2026-07-13** (the blueprint's own
snapshot date) — "an actively-written, continuously-growing operational audit log, not a thin/rarely-
exercised mechanism" (Pass 1 §1).

## 1.2 Business context

ProductTracking participates in the ERP as the **single shared audit-log surface for every
quantity-on-hand-affecting event across the application**, and as a narrow, self-contained costing
engine that runs on every row it records:

- **QoH audit trail** — every confirmed writer module (SalesOrder, Products, PurchaseOrder, Receiving,
  ReceivingST, StoreTransfer, PendingStoreTransfers, Location, PhysicalInventory, QuickEdit, ProductCut,
  Import, and more) writes a ProductTracking row whenever it changes a product's quantity on hand at a
  location, giving the system one queryable history of every such change regardless of which module
  triggered it (Pass 6 §1).
- **Self-contained cost-snapshot computation** — on every save, the module's own save hook resolves a
  cost basis per the location's configured GP-basis setting (or one of two override layers for
  Receiving- and Product-Cut-originated rows), computes the row's net quantity change, and (WMS-aware)
  resolves the bin/zone/shelf location — real, non-trivial arithmetic that lives inside this module's
  own file, not merely a passthrough of values the caller already computed (Pass 4 §1).
- **Conditional QuickBooks push** — the save hook conditionally triggers a QuickBooks cost push when the
  writer sets `push_to_qb = 'Yes'`, branching further on `change_type` for a subset of values (Pass 2
  PT-VAL-013).
- **Reporting substrate** — a 12-report custom-report family reads this module's data directly, plus one
  external module's PDF report (PurchaseOrder's receiving-variance PDF) consumes it as one input among
  others (Pass 6 §1.3, §1.4).

The module is deeply dependent on its ≥11 writer modules and 2 external-facing webservice endpoints for
its data (the write direction), and is, in turn, depended on by the 12-report custom-report family and
PurchaseOrder's own PDF report (the read direction). ProductTracking itself never writes back into any
of its writer modules' own tables.

## 1.3 Scope

**In scope**: the QoH-change audit-log entity and its field catalog, the module's read/search/export
surface (ListView, DetailView, CSV export, the product-variant detail popup), the module's one
self-contained calculation (the multi-branch cost-basis resolution computed on every save), and the
write contract every one of ProductTracking's ≥26 confirmed writer callers must satisfy.

**Out of scope** (per Doc1's own passes and Doc2's Non-Goals, `09-implementation-plan.md` §1):
- **Redesigning any of the ≥11 writer modules' own QoH-change logic in full.** This specification
  documents the **contract** those writers must publish against, not each writer's own internal
  QoH-calculation logic — that belongs to each of those modules' own specifications.
- **The mobile-scanner webservice's own authentication model.** Confirmed as a real, external-facing
  caller of the shared write path (Pass 6/7), but its own request-authentication scaffolding was never
  traced (Pass 7 Open Question 1). This specification requires the write contract to close the
  injection surface regardless of that open question, without resolving the question itself.
- **`CallRelatedList.php`/`LoadList.php`/`updateRelations.php`/`ProductTracking.js`** — confirmed
  verbatim/near-verbatim Campaigns-module copy-paste leftovers, never adapted to ProductTracking's own
  semantics, writing only into Campaigns' own relation tables. Not carried forward as ProductTracking
  logic at all (Pass 0; Pass 7 §2).
- **`.sellprice` is not carried forward as a real, computed field** — confirmed dead on all 15,013 live
  rows; every traced writer explicitly blanks it (Pass 1 Schema Drift §4.3).
- Deployment/rollout sequencing (the subject of the blueprint's own Doc3, kept at outline depth).
- Selecting an implementation technology stack (explicitly deferred).

## 1.4 Actors

- **Operations/warehouse/counter staff** — the primary users of the module's search/list/export surface
  and (rarely) the inline-edit correction path.
- **≥11 writer modules' own save/finalize routines** — the confirmed, dominant writers of ProductTracking
  rows: SalesOrder, Products, PurchaseOrder, Receiving, ReceivingST, StoreTransfer,
  PendingStoreTransfers, Location, PhysicalInventory, QuickEdit, ProductCut, and Import — system/
  integration processes from this module's own point of view, not human actors, but the module's most
  important "actor" in a data-flow sense (Pass 6 §1.2).
- **The mobile-scanner webservice** — an external-facing (device-authenticated, not web-session-
  authenticated) caller that writes ProductTracking rows via the shared `ptcommonentry()` writer
  function, sourced directly from scanner-device request payloads (Pass 6 §1.1, §2.1).
- **QuickBooks integration (indirect)** — the recipient of a conditional cost push the module's own save
  hook triggers directly (Pass 2 PT-VAL-013; Pass 6 §2.2).
- **The 12-report custom-report family's viewers** — internal staff who read ProductTracking data through
  a dedicated reporting surface outside the module itself (Pass 6 §1.3).
- **PurchaseOrder's receiving-variance PDF report (indirect, read-only)** — consumes ProductTracking data
  as one input among others for an external-facing PDF (Pass 6 §1.4).
