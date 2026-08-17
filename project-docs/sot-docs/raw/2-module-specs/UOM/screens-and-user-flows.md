# UOM — Screens & User Flows

> Views, fields, interactions, states. No component library or framework assumption.

This file is inferred, not directly documented — the blueprint doesn't document UI screens directly, the
same scope boundary every other module's `screens-and-user-flows.md` in this series draws. This section
infers the implied screen/interaction structure from the file inventory in
`blueprint/module/Products/00-pass0-inventory.md` and this session's own reads, expressed as
views/fields/interactions/states rather than any specific UI framework or component library. (Source:
`docs_from_blueprint/module/UOM/08-screens-and-user-flows.md`.)

## Screen Inventory

| Screen | Purpose |
|---|---|
| UOM Category management (`uom_category.php`, 33 lines) | List-and-edit screen for UOM Categories: category name, sort order, delete (soft). |
| UOM Type management (`uom_type.php`, 34 lines) | List-and-edit screen for UOM Types: type name, sort order, delete (soft, guarded by the in-use check documented in `workflows.md`). |
| UOM Group management — the central screen (`uom_group.php`, 83 lines + `uom_grouplist.php`, 262 lines) | The screen where all eleven role-specific type assignments and their conversion factors are configured together for one group. |
| UOM management landing page (`uom_manage.php`, 32 lines) | Computes add/edit/delete permission flags before routing into the category/type/group screens above. |
| Manage UOM Qty Pricing (`manage_uomqtypricing.php` shell + `uomqtypricing_ajax_action.php`, 618 lines) | Per-UOM pricing grid across products; lets a pricing administrator view and edit UOM-level derived prices. |
| Orgill UOM reference (`Orgilluomlist.php`, 24 lines) | Read-only reference listing against the separate `lbm_orgill_uom` table — adjacent, out of core scope (see `outputs.md`). |

## Flows

### UOM Category management
Entry point: `uom_category.php`, rendered via `get_uom_category()`. Shared CRUD dispatcher:
`uom_ajax_action.php` (40 lines), routes on `$_REQUEST['task']` for add/update/delete/savesortorder.
Steps: administrator views category list → adds/edits a category name → optionally deletes (soft,
guarded by the in-use check on `lbm_uom_group.uomcategoryid`, see `workflows.md`). No decision points
beyond the delete guard. Exit/success state: list reflects the updated category set.

### UOM Type management
Entry point: `uom_type.php`, rendered via `get_uom_type()`, same `uom_ajax_action.php` dispatcher. Steps:
administrator views type list → adds/edits a type name → optionally deletes (soft, guarded by the
in-use check on `lbm_uom_group`'s eleven role FK slots — coverage not independently confirmed complete,
see `workflows.md`). Exit/success state: list reflects the updated type set.

### UOM Group management
Entry point: `uom_manage.php` → `uom_group.php` (edit) / `uom_grouplist.php` (list). Steps: the group
edit form loads available UOM Types, the group's existing detail (`get_uom_detail`) and type-quantity
conversion factors (`get_uomtype_qty`), reorders the base-UOM row to display first, and loads
picking-hierarchy data when the picking-hierarchy flag is set → administrator assigns/edits the eleven
role-specific type slots and their conversion factors → saves via `save_uom_group()`
(`uom_ajax_action.php` task `save_uom_group`). Decision point: whether `picking_hierarchy` is set to
"Yes," which determines whether picking-hierarchy rows are loaded/editable. Exit/success state: group
list reflects the saved configuration; `lbm_applied_uom_pricing` cache entries for affected products are
invalidated (see `calculations.md`).

### Manage UOM Qty Pricing
Entry point: `manage_uomqtypricing.php` → `uomqtypricing_ajax_action.php`. Steps: pricing administrator
opens the grid → cache (`lbm_applied_uom_pricing`) is regenerated on demand if missing → administrator
edits a UOM-level derived price → write cascades back to the product's base price fields, the inverse of
the ordinary product-edit-form cascade (`calculations.md`). This inversion is a genuine
two-screens-different-directions interaction pattern, worth flagging explicitly to a rewrite's UX design
rather than assuming both screens work the same way.

## States

- **Loading**: `lbm_applied_uom_pricing` cache regeneration on the pricing grid when the cache is
  missing — not confirmed whether this is a blocking or asynchronous load in this session's research.
- **No-permission**: `uom_manage.php` computes `$add_edit_per`/`$del_per` flags via `isPermitted()`
  against the Products module's EditView/Delete permissions at page-load time, but this check is **not**
  re-enforced inside `uom_ajax_action.php`'s actual save/delete dispatch — see `permissions.md` for the
  full finding.
- **Read-only**: Orgill UOM reference screen is read-only by design (see `outputs.md`).
- Empty and error states were not independently confirmed in this session's research for any UOM screen.
