# UOM — Outputs

## Applicability

UOM produces no PDF, CSV export, or formal document output specific to its own domain — unlike most
modules in this docs-kit. Its "outputs" are two interactive management screens (below) plus the derived
pricing cache consumed by other modules' own outputs (e.g. a purchase order or pick ticket rendering a
UOM-converted quantity, which is that consuming module's output, not this one's). (Source:
`docs_from_blueprint/module/UOM/06-outputs.md` §6.4.)

Source: `blueprint/module/Products/00-pass0-inventory.md` (file inventory), cross-checked against this
session's direct reads.

| Output | Purpose | Trigger | Required Data | Audience | Total-Source (if applicable) |
|---|---|---|---|---|---|
| UOM Group listview (`modules/Products/uom_grouplist.php`, 262 lines) | Server-paginated datatable listing UOM Groups, with basic/advanced search across group name, category, and every one of the eleven role-specific UOM-type columns. Interactive management screen, not a document/export. | Catalog administrator navigates to UOM Group management | `lbm_uom_group` rows joined against `lbm_uom_category`/`lbm_uom_type` | Catalog administrator | N/A |
| "Manage UOM Qty Pricing" grid (`modules/Products/manage_uomqtypricing.php` page shell + `uomqtypricing_ajax_action.php`, 618 lines) | Per-UOM pricing grid across products, covering the M1-M10/CM/WAC/FIFO/FC/AC1-3 price tiers per UOM. Can write UOM-derived prices back to the product's base price fields. | Pricing administrator opens the grid; `getUOMpricingListViewEntries` regenerates the `lbm_applied_uom_pricing` cache via `saveUOMpricing()` if missing | `lbm_applied_uom_pricing` cache (regenerated on demand), product price-tier fields | Pricing administrator | See write-direction/concurrency note in `calculations.md` |

## A related but out-of-scope reference listing

`modules/Products/Orgilluomlist.php` (24 lines) renders a read-only Orgill-catalog UOM reference listing
against a **separate, unrelated** table, `lbm_orgill_uom` — a vendor-catalog cross-check, not part of
this module's category/group/type conversion chain. Noted here explicitly so the two different "UOM"
concepts in the codebase (this module's conversion model, and Orgill's vendor-specific reference data)
aren't conflated by a future reader.
