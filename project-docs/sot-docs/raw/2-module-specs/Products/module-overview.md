# Products — Module Overview

> Copy this whole `2-module-spec-template/` folder per module, rename, fill in. Stay tech-agnostic
> throughout — no framework/database/language references anywhere in Stage 2.

## Purpose

Products is the ERP's SKU/part catalog master — the central definition of every sellable/purchasable
item: its identity, classification, pricing schedules, unit-of-measure conversions,
inventory-tracking behavior (lot/serial/barcode), and relationships to other parts (kits, variants,
alternates, superseded chains). It is the largest module blueprinted so far in this initiative (209
top-level source files), and every transactional module that builds a line item — SalesOrder,
PurchaseOrder, Quotes, StoreTransfer, Manufacturing/BOM, POS, WMS pick/pack, and the e-commerce
storefront — joins directly against Products' identity/price/tax/UOM data on every line item it
builds, giving pricing, barcode, and inventory-correctness defects here the widest blast radius of
any module blueprinted to date. (Source: `01-module-overview.md` §1.1–§1.2)

## Actors

- **Catalog/merchandising staff** — create and maintain product records (identity, classification,
  pricing, UOM assignment, e-commerce flags); run mass-updates and CSV imports; manage Product
  Defaults Rules.
- **Pricing/purchasing staff** — manage the MPL pricing mechanisms (JSON-blob records, Price Plans
  and their rules, scheduled value updates), the AUPF and Auto-Update-Subline rule engines, and
  Product Group/assortment pricing; review GP/margin figures.
- **Warehouse/receiving staff** — scan/manage barcodes, lot numbers, and serial numbers; trigger
  Global-WAC recalculation implicitly via ordinary cost-field edits; print product labels
  (Avery sheet and ZPL/EPL thermal formats); consume Products' catalog data from other modules'
  outputs (e.g. Pick Ticket).
- **Inventory/management staff** — review the Physical Inventory (PI) count variance report, the
  Core/Warranty quantity-change report, and the nightly inventory-value snapshot; investigate
  quantity-on-hand history via Product Tracking.
- **Administrators/system operators** — configure supported-field toggles (e.g. Global vs.
  per-location WAC calculation mode, PrintNode settings), manage the Price-Code-Book/Rank-Group
  mapping chain's dedicated screens, and manage vendor-linecode master data (hosted inside Products'
  own field-management dispatcher despite the module-name implication otherwise).
- **System/integration processes** — Fuse5Connect (a confirmed-live, actively-used inbound
  product-provisioning API that creates/updates products through the same save path a manual UI
  edit uses), the e-commerce catalog push (BigCommerce-family, outbound), the AUPF/Auto-Update-
  Subline daily cron pools, and the nightly inventory-snapshot cron.
- **Every downstream transactional module** (SalesOrder, PurchaseOrder, Quotes, StoreTransfer,
  Manufacturing/BOM, POS, WMS pick/pack) — a structural "consumer" role, not a human actor: each
  reads Products' identity/price/tax/UOM data as ground truth for every line item it builds.

(Source: `01-module-overview.md` §1.4)

## Scope within this module

**In scope** (per source §1.3): the SKU/part catalog header and its combined header/extension fields
(identity, classification, base pricing, tax class, dimensions, e-commerce flags); the seven Master
Reference Data classification axes (Brand, Color, Division, Linecode, Manufacturer, Profile,
Subline); the UOM Group/Type/conversion framework's Products-side assignment fields only (the full
UOM schema is out of scope here — see Dependencies below); the MPL/MPS/Price-Plan pricing-resolution
pipeline; GP/margin calculation; Global-WAC recalculation; barcode (base/inner/outer plus
additional-barcode) management; lot/serial number tracking; part-supersession (the Products-side
trigger only); variant lifecycle; Product Group/assortment; Product Tracking (QoH change-history
audit trail); the AUPF and Auto-Update-Subline rule engines; the Price-Code-Book/Rank-Group mapping
relationship (as a bounded-context boundary decision, not full ownership); Product Defaults Rules;
Product/Line-Code Cross-Reference Mapping; mass-update; CSV import; label printing (Avery/ZPL); and
this module's interfaces to SalesOrder, PurchaseOrder, Location, PriceBooks, Kits, VendorLinecode,
WMS (via Location), e-commerce (BigCommerce-family), Fuse5Connect, and QuickBooks.

**Out of scope** (per source §1.3):
- Re-designing SalesOrder, PurchaseOrder, Location, Quotes, WMS, Kits, PriceBooks, or
  Manufacturing/BOM in full — this module establishes Products' own domain model and its
  *interfaces* to those modules, not their internals.
- **Door Configuration subsystem** (12 tables, ~2,600-line dispatcher) — explicitly deferred pending
  a product-owner scope confirmation of whether door-hardware configurator sales are in scope for
  the rewrite at all; catalogued only at table-purpose depth in the source, not designed at any
  depth here.
- **Part-supersession's actual QoH/cost merge logic** — the Product entity itself has no lifecycle
  transition tied to supersession; the real, multiply-enforced transition lives on Location's own
  table and belongs to Location's own specification. This module designs only the Products-side
  trigger.
- Deployment/rollout sequencing against the rest of the codebase.
- Selecting an implementation technology stack (explicitly deferred).
- "Fixing" every documented legacy behavior. Legitimate business logic — even logic with confirmed
  quirks — is carried forward faithfully where no evidence of an actual defect was found, and
  flagged for SME sign-off (not silently "fixed") where a genuine but ambiguous business question was
  found. Only confirmed structural defects (barcode uniqueness, the lot/serial enforcement
  asymmetry's one genuine gap, the Global-WAC hardcoded-zero term, the AUPF/subline empty-scope
  design fragility, the dead Price-Code-Book/Rank-Group inline write path, and 11 confirmed SQL
  injections) get an explicit architectural correction — see `risks-and-open-questions.md` and
  `business-rules-and-validation.md`.

## Origin

Extracted-from-legacy. This file is derived from `docs_from_blueprint/module/Products/01-module-overview.md`,
itself reorganized from the original 12-file Products Business Blueprint at
`blueprint/module/Products/` (Pass 0 structural function inventory plus the module-overview pass).
Products is the fifth module blueprinted in a wider 126-module documentation/modernization
initiative, following the SalesOrder pilot's method; every claim traces back to the original
blueprint's file/section citations, and ambiguity found there (unclear field meanings, unconfirmed
code paths, "likely dead" findings, "flagged for SME sign-off" design decisions) is preserved as
ambiguity here rather than resolved into an invented answer. (Source: `00-README.md`)

## Dependencies

Per source §1.2–§1.3 and `07-cross-module-integrations.md` (see this module's own `integrations.md`
for the full table): SalesOrder, PurchaseOrder, Location (including WMS, which sits behind Location),
PriceBooks, Kits (Products participates read-only; Kits owns kit composition), VendorLinecode
(vendor-linecode master data is hosted inside Products' own field-management dispatcher despite the
module-name implication otherwise), Accounts (jointly owns the Product/Customer Cross-Reference
Mapping entity), and UOM (Products assigns a UOM Group to each product but does not own the UOM
Category/Group/Type/conversion schema itself — that is UOM's own module, specified separately; see
`entities-and-fields.md`'s UOM pointer note and `integrations.md`). External systems: e-commerce
(BigCommerce-family, outbound catalog push), Fuse5Connect (inbound product-provisioning API), and
QuickBooks.
