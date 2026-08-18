# UOM — Module Overview

## Purpose

UOM (Unit of Measure) defines the units a product can be bought, sold, stocked, priced, picked, and
reported in, and provides the conversion arithmetic to move a quantity or a price between any of those
units and the product's base unit. It answers two questions for the rest of the system: "how many base
units does this UOM quantity represent?" and "what price should this UOM quantity carry, given the
base-unit price?" A product is assigned one UOM Group, and that group names, for eleven distinct
functional roles (base, selling, pricing, stocking, physical-inventory-count, picking, purchase,
purchase-cost, receiving, reporting, inner-pack, outer-pack), which UOM Type governs that role. A
separate table records the actual conversion factor between each type and the group's base type, and
another records the ordered sequence of unit types used when breaking a pick quantity down into whole
units. (Source: `docs_from_blueprint/module/UOM/01-module-overview.md` §1.1–1.2.)

## Actors

- **Catalog administrator** — defines UOM Categories, Types, and Groups; assigns conversion factors and
  picking hierarchies. (Source: file inventory in `blueprint/module/Products/00-pass0-inventory.md`,
  screens `uom_category.php`, `uom_type.php`, `uom_group.php`, `uom_manage.php`.)
- **Pricing administrator** — manages the "Manage UOM Qty Pricing" screen, which can write UOM-derived
  prices back to the product's base price fields — the inverse of the default base-to-UOM cascade
  (session research; see `calculations.md`).
- **Every downstream transactional module** (order entry, purchasing, receiving, warehouse allocation,
  manufacturing, kits, reporting) — reads UOM group/type/conversion data as part of its own workflows;
  several read the raw tables directly rather than through a shared interface (session research; see
  `integrations.md`).

## Scope within this module

**In scope:**
- Definition and CRUD of UOM Categories, UOM Types, and UOM Groups (including each group's eleven
  role-specific type assignments).
- The per-group, per-type conversion factor (`lbm_uom_type_qty`).
- The per-group picking-unit hierarchy (`lbm_uom_picking_hierarchy`).
- The canonical conversion arithmetic: base-to-UOM and UOM-to-base, for both quantity and price.
- The cached per-product applied-UOM-pricing artifact (`lbm_applied_uom_pricing`) and its invalidation.

**Out of scope (owned by consumers, not by UOM):**
- The Product entity itself and its `uomgroup_id` assignment — UOM is assigned to a product, not the
  other way around; the Product module owns that assignment field.
- Any specific transactional use of a conversion result (an order line item's quantity, a purchase
  order's cost extension, a warehouse pick list) — those are consumers applying UOM's output, not part
  of UOM's own domain.
- `lbm_orgill_uom`, a separate vendor-catalog reference table touched by `Orgilluomlist.php` — related
  in name only; not part of the category/group/type conversion model (see `outputs.md`).

(Source: `docs_from_blueprint/module/UOM/01-module-overview.md` §1.3.)

## Origin

Extracted from within Products' blueprint plus direct code research — no independent blueprint pipeline
exists for this module, see docs_from_blueprint/module/UOM/00-README.md.

UOM is not a separate legacy vtiger module (no `vtiger_tab` entry) — its files live inside
`modules/Products/` and inside `include/utils/commonfunctions.php`, a shared, non-module-specific file
used across the whole codebase. It has no `blueprint/module/UOM/` folder and never went through the
nine-pass Doc1/Doc2/Doc3 blueprint pipeline the way every other module in this docs-kit did. This spec's
sourcing is a deliberate mix of two rigor levels, kept separated throughout the folder:
- **Blueprint-sourced** (same rigor as every other module): the entity/field catalog and file inventory,
  drawn from `blueprint/module/Products/01-entities-fields.md` §2.16 and
  `blueprint/module/Products/00-pass0-inventory.md`.
- **Session-sourced** (this consolidation session's own direct code reads, not from a blueprint pass):
  the conversion-formula detail, the cross-module direct-table-access survey, and two confirmed SQL
  injections.

Where something wasn't independently verified with the same rigor as a full blueprint pass — most
notably, there is no formal numbered validation-rule catalog (no `UOM-VAL-###` series) the way every
blueprint-sourced module has — that gap is stated as a gap in `business-rules-and-validation.md`, not
filled in with an invented rule catalog. See `docs_from_blueprint/module/UOM/00-README.md` for the full
sourcing disclosure.

## Dependencies

- **Products** — the module UOM's files physically live inside; a Product carries the single FK
  (`vtiger_productcf.uomgroup_id`) that assigns a UOM Group to it. UOM is the target of that reference,
  not the owner of the Product entity.
- **SalesOrder, PurchaseOrder, Receiving/ReceivingST, StoreTransfer, Manufacturing (BOM), Kits,
  SalesHistory, Import, Settings, CustomImport, Customreport** — all read UOM configuration and/or the
  conversion arithmetic; most via direct SQL joins against the `lbm_uom_*` tables rather than a shared
  interface. See `integrations.md` for the full confirmed file-level survey.
