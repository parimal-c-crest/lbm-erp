# UOM — Cross-Module & Integration Touchpoints

This is the core rationale for this module's existence. Source: this session's direct grep/read of the
codebase (not a blueprint pass — no existing blueprint cross-module-integrations file covers UOM as its
own subject). `vtiger_productcf.uomgroup_id` appears in 123 files across `modules/`; the raw `lbm_uom_*`
table names appear directly (not through the shared conversion function) in 46+ files outside
`modules/Products/`. (Source: `docs_from_blueprint/module/UOM/07-cross-module-integrations.md`, kept
fully intact — this is the most important file in this module's spec.)

## The problem: no enforced boundary today

A clean bounded-context boundary would mean every consumer reaches UOM data and conversion results
through one shared interface — the `conversion_base_or_uom_for_qty_sellprice*()` function family
documented in `calculations.md`. That is not what's found. A dozen-plus modules instead issue their
**own direct SQL joins** against `lbm_uom_group`, `lbm_uom_type`, `lbm_uom_type_qty`, and
`lbm_uom_picking_hierarchy`, and at least one reimplements the conversion arithmetic itself rather than
calling the shared primitive. This is tight, uncontrolled coupling, not encapsulation — and it is the
single biggest reason this domain needs its own explicit module boundary in a rewrite, rather than
staying implicit inside Products.

## Related Modules

| Module | What This Module Reads | What This Module Writes/Triggers | Direction | Sync/Async |
|---|---|---|---|---|
| Products | `lbm_uom_group`, `lbm_uom_type`, `lbm_uom_category`, `lbm_uom_type_qty`, `lbm_uom_picking_hierarchy` — UOM's own files physically live inside this module | UOM CRUD, conversion-factor CRUD, picking-hierarchy CRUD, `lbm_applied_uom_pricing` cache | Bidirectional (UOM is hosted inside Products) | Sync |
| SalesOrder | `lbm_uom_picking_hierarchy`, `lbm_uom_type`, `lbm_uom_type_qty` — direct join in `wmsSalesOrderAllocation.php:1312-1321` to resolve the pick-unit hierarchy for warehouse-management allocation:<br>`select ph.uomtypeid, ut.uomtype, utq.qty, utq.baseqty from lbm_uom_picking_hierarchy ph inner join lbm_uom_type ut on ut.uomtypeid = ph.uomtypeid inner join lbm_uom_type_qty utq on utq.uomgroupid = ph.uomgroupid and utq.uomtypeid = ph.uomtypeid` | None confirmed | UOM → SalesOrder (read-only) | Sync |
| PurchaseOrder | `lbm_uom_*` tables — direct table access confirmed in `SaveNewRow.php`, `DetailViewAjax.php`, `PurchaseOrder.php` | None confirmed | UOM → PurchaseOrder (read-only) | Sync |
| Receiving / ReceivingST | `lbm_uom_*` tables — direct table access confirmed | None confirmed | UOM → Receiving (read-only) | Sync |
| StoreTransfer | `lbm_uom_group`/`lbm_uom_type_qty` — direct `LEFT JOIN` in `fetchLocationProductDetails.php:57-80` for base/inner/outer UOM resolution | None confirmed | UOM → StoreTransfer (read-only) | Sync |
| Manufacturing (BOM) | `lbm_uom_*` tables — direct table access confirmed | None confirmed | UOM → Manufacturing (read-only) | Sync |
| Kits | `lbm_uom_*` tables — direct table access confirmed | None confirmed | UOM → Kits (read-only) | Sync |
| SalesHistory | `lbm_uom_*` tables — `ListView.php` touches UOM tables directly | None confirmed | UOM → SalesHistory (read-only) | Sync |
| Import | `lbm_uom_*` tables — `modules/Import/ImportSave.php` touches UOM tables directly | Possibly writes UOM-linked product data during import (not independently traced) | UOM ↔ Import | Sync |
| Settings | `lbm_uom_*` tables — `modules/Settings/productCatalog.php` touches UOM tables directly | None confirmed | UOM → Settings (read-only) | Sync |
| CustomImport | `lbm_uom_*` tables — `modules/CustomImport/uomqtypricing_customImportsave.php` touches UOM tables directly | Likely writes UOM qty-pricing data during custom import (not independently traced) | UOM ↔ CustomImport | Sync |
| Customreport | `lbm_uom_type`/`lbm_uom_group`/`lbm_uom_type_qty` — a dozen-plus report files, most notably `modules/Customreport/InventoryQtyByUOMTypeName.php:29-63`, which not only joins these tables directly but **reimplements the conversion formula inline in SQL** (`ROUND((qty * (lbm_uom_type_qty.qty/lbm_uom_type_qty.baseqty)),4)`) — a second, independent copy of the arithmetic documented in `calculations.md`, free to drift from the canonical PHP primitive | None confirmed | UOM → Customreport (read-only) | Sync |

## External Systems

None confirmed. No external-system integration specific to UOM's own domain was found in this session's
research — UOM's integration surface is entirely intra-codebase (see Related Modules above).

| System | What Crosses the Boundary | Direction | Trigger | Sync/Async |
|---|---|---|---|---|
| — | — | — | — | — |

## Consistent with, and now concretely confirmed by, the Products blueprint's own general observation

`blueprint/module/Products/06-cross-module-integrations.md:48-61` (§1.0) already noted, at a general
level: "every transactional module that builds a line item...joins against productid/productcode...to
pull description, price levels, tax class, UOM group...as a byproduct of building that line item." This
session's direct-access survey concretely confirms and extends that observation specifically for UOM —
naming the actual files and, in one case, a duplicated formula, rather than describing the pattern only
generally.

## What this means for a rewrite

The rewrite should not repeat this pattern. A UOM service (owning the entities in
`entities-and-fields.md` and exposing the conversion arithmetic in `calculations.md`) should be the
*only* path any other module uses to resolve a UOM conversion or read UOM configuration — see
`build-guidance.md` for the specific migration recommendation, including the full list of current
direct-access call sites above that would need to become API consumers instead.
