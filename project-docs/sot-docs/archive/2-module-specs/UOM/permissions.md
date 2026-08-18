# UOM — Permissions

This file has no equivalent source document in `docs_from_blueprint/module/UOM/` — per
`_deviations-from-original-template.md`, `permissions.md` fills a gap the existing 18-module docs-kit
never covered, and is genuine net-new extraction work, not a reformatting exercise. Content below is
drawn directly from this session's own code research (not a blueprint pass), reading
`include/utils/commonfunctions.php` and the `modules/Products/uom_*.php` files for permission/role
checks around `save_uom_group()` and `delete_uom()`.

## Roles

No UOM-specific role model exists. UOM has no `vtiger_tab` entry of its own (see `module-overview.md`
§Origin) and therefore no dedicated module permission block — permission is instead gated against the
**Products** module's standard vtiger permission actions, specifically `EditView` and `Delete`, at a
single page-load point:

```php
// modules/Products/uom_manage.php:25-26
$add_edit_per = isPermitted($currentModule, "EditView", "");
$del_per = isPermitted($currentModule, "Delete", "");
```

`$currentModule` resolves to `Products` here, since UOM's screens are routed through the Products
module. No separate "Catalog administrator" or "Pricing administrator" role/permission constant was
found anywhere in the UOM-related files — those actor labels used elsewhere in this spec
(`module-overview.md`) describe functional usage patterns observed in the UI, not confirmed distinct
permission roles in the codebase.

## Permission Matrix

| Action | Products: EditView permission | Products: Delete permission | No permission (unauthenticated/unpermitted) |
|---|---|---|---|
| Create (UOM Category/Type/Group, conversion factors, picking hierarchy) | Allowed — gated only by the page-load `$add_edit_per` UI flag in `uom_manage.php`; **not re-checked inside `uom_ajax_action.php`'s actual dispatch** (see Ownership / Record-Level Rules below) | N/A | UI buttons hidden, but see gap below |
| Read | No `isPermitted()` check found on any UOM listview/detail read path in this session's research | No `isPermitted()` check found | Unconfirmed — not independently traced |
| Update | Same as Create — gated by `$add_edit_per` at page-load only | N/A | UI buttons hidden, but see gap below |
| Delete | N/A | Allowed — gated only by the page-load `$del_per` UI flag in `uom_manage.php`; **not re-checked inside `uom_ajax_action.php`'s `delete_uom`/`delete_uom_group` dispatch** | UI buttons hidden, but see gap below |

## A confirmed permission-enforcement gap (session-found)

`modules/Products/uom_ajax_action.php` — the actual dispatcher for `add_uom`, `update_uom`, `delete_uom`,
`update_uom_order`, `save_uom_group`, and `delete_uom_group` — contains **no `isPermitted()` call
anywhere in the file** (confirmed by direct grep of the file). The only permission check in the entire
UOM screen area is the one shown above in `uom_manage.php`, and it runs once at page load purely to
decide whether to render the add/edit/delete UI controls — it does not gate the AJAX endpoints
themselves. This means a request submitted directly against `uom_ajax_action.php` (bypassing the
rendered UI) is not confirmed to be blocked by role, independent of whatever session-authentication
check may exist generically for the `index.php?module=Products&action=ProductsAjax` routing layer (not
independently traced in this session). This is tracked as **UOM-RISK-008** in
`risks-and-open-questions.md`.

## The two confirmed SQL injections and their relationship to permissions

Two functions reached via this same unguarded dispatch path have confirmed SQL injections (see
`risks-and-open-questions.md` UOM-RISK-001 and UOM-RISK-002 for full detail):

- **`save_uom_group()`** (`include/utils/commonfunctions.php:3873-3995`) — every field from `$param`
  (raw `$_REQUEST`, per `uom_ajax_action.php:10`: `$param_request = $_REQUEST`) is concatenated
  unescaped into `INSERT`/`UPDATE` SQL. Reached via `uom_ajax_action.php` task `save_uom_group`, which
  has no `isPermitted()` gate of its own.
- **`delete_uom()`**'s in-use check (`commonfunctions.php:3258-3264`) — the client-submitted `$id` is
  interpolated unescaped into a `WHERE` clause. Reached via `uom_ajax_action.php` task `delete`, also
  with no `isPermitted()` gate of its own.

The combination is notable: these are not merely SQL-injection bugs in isolation, but injections in code
paths whose only access control is a UI-layer flag computed on a *different* page
(`uom_manage.php`) than the one that actually executes the vulnerable query
(`uom_ajax_action.php`). Whether any generic session/CSRF check at the routing layer independently
blocks an unauthenticated or wrong-role direct request was not traced in this session — flagged as part
of UOM-RISK-008 rather than assumed either way.

## Ownership / Record-Level Rules

- No tenant-scoped or per-user ownership rule was found for any UOM entity — consistent with the
  tenant-scoping open question in `entities-and-fields.md` (no `mtid`/`company_id`/equivalent column on
  any `lbm_uom_*` table).
- No state-dependent permission (e.g. "can't edit once in use") was found — the closest analog is the
  in-use *delete* guards on UOM Type/Category (see `workflows.md`), which are data-integrity checks, not
  permission checks; they apply regardless of the acting user's role.
- `userid` on each UOM table records the last editing user for audit purposes only — it does not confer
  or restrict any ownership-based permission (any permitted user can edit any row, not just their own).
