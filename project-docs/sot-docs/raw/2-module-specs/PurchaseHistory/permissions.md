# PurchaseHistory — Permissions

> Net-new extraction — `permissions.md` has no content in any of the 18 modules blueprinted before this
> template existed, per `_deviations-from-original-template.md`. This is a thin, genuinely-extracted
> account of what the legacy code actually checks, not a fabricated role model.

Source: direct grep of `modules/PurchaseHistory/*.php` for `isPermitted(`/`Permission`, cross-checked
against `blueprint/module/PurchaseHistory/02-validation-rules.md` and
`blueprint/module/PurchaseHistory/06-cross-module-integrations.md` for any role mentions (none found beyond
the generic `DeleteEntity()` framework boundary noted below).

## Roles

The legacy system's own permission checks for this module do not name specific roles/profiles in the module's
own files — they delegate entirely to the shared `isPermitted($module, $action, $recordId)` framework
function, which resolves against whatever profile/role is assigned to the current user elsewhere in the
platform (out of this module's own scope; not re-derived here). No PurchaseHistory-specific role (e.g. a
"Purchasing Clerk" vs. "Purchasing Manager" distinction) is defined anywhere in this module's own code —
only the generic module-level `EditView` and `Delete` action permissions are checked.

## Permission Matrix

**Confirmed checks found in the module's own files** — all gate whether a UI action (an Edit or Delete link)
is *displayed*, not whether the underlying save/delete operation is *executed*:

| Action | Where Checked | What It Gates |
|---|---|---|
| Read (list) | Not explicitly checked in `ListView.php`/`DetailView.php` beyond the platform's own module-access gate (out of this module's own scope) | List/detail rendering |
| Create/Update | `isPermitted('PurchaseHistory', 'EditView', ...)` — `ListView.php:138` (list-row edit link), `DetailView.php:43` and `:100` (detail-view edit link/flag) | Whether the Edit link/action is shown to the user |
| Delete | `isPermitted('PurchaseHistory', 'Delete', ...)` — `ListView.php:134` (list-row delete link), `DetailView.php:46` (detail-view delete link) | Whether the Delete link/action is shown to the user |

**A confirmed gap, stated explicitly rather than glossed over**: `Save.php`, `Delete.php`, and
`DetailViewAjax.php` — the three files that actually perform the write/delete/inline-edit operations — carry
**no `isPermitted()` call of their own** (confirmed by direct grep of each file individually). Permission
checks found in this module's own code exist only in the display layer (`ListView.php`, `DetailView.php`),
gating whether a link is shown, not whether the underlying action-processing endpoint accepts the request.
Whether a deeper, shared framework-level gate (e.g. a dispatcher-level permission check applied to every
`action=Save`/`action=Delete` request before it reaches the module's own file) exists outside this module's
own files was not traced in the source blueprint — this is the same shared-framework boundary the blueprint
draws around `DeleteEntity()`'s own internal permission/integrity checks (`blueprint/module/PurchaseHistory/
06-cross-module-integrations.md` §3, Open Question 4). This spec does not assume such a gate exists; it is
recorded as an open question below rather than resolved either way.

| Action | Role A | Role B | Role C |
|---|---|---|---|

**No role-differentiated matrix exists to fill in.** The confirmed checks above are binary
(permitted/not-permitted per the platform's own opaque role-resolution), not multi-role tiers this module's
own code distinguishes between — filling in hypothetical "Role A/B/C" columns here would fabricate a
distinction the source code does not make.

## Ownership / Record-Level Rules

- **No tenant-scoping, ownership-scoping, or state-dependent permission rule was found in this module's own
  files.** `DetailView.php`'s and `ListView.php`'s own `isPermitted()` calls pass either an empty string or
  the record id, but the source blueprint's own validation-rules pass did not find this module's own code
  performing any additional "is this my own record" or "is this record in a state that permits editing"
  check beyond the generic `isPermitted()` result itself.
- **The write path itself (Save.php/Delete.php/DetailViewAjax.php) has no confirmed record-level ownership
  check of its own** — consistent with the broader finding elsewhere in this module's spec that the module's
  own write surface has essentially no validation gate beyond record-identifier presence
  (`business-rules-and-validation.md` PH-RULE-001, PH-RULE-011).
- **This module is expected to be tenant-scoped at the platform level** (requirement R4 in
  `entities-and-fields.md`), but no tenant column exists in the legacy schema today, so no legacy tenant-scoped
  permission check could exist to find.
- **For the recommended rewrite (see `entities-and-fields.md` §5)**: since PurchaseHistory becomes a
  read-only consumer of a table owned by PurchaseOrder's aggregator service, the permission model for a new
  implementation should reflect that split explicitly — **view/export permissions belong to PurchaseHistory**
  (who may browse/export the aggregate), while **write ownership belongs to PurchaseOrder** (whose aggregator
  service is the only code permitted to create/update/correct rows). This is a design recommendation for the
  new implementation, not a legacy finding — the legacy system does not draw this distinction today, since
  its own `Save.php`/`DetailViewAjax.php` still nominally expose a write surface even though nothing
  legitimately calls it.

## Open Questions

- Does a shared, dispatcher-level permission gate exist outside this module's own files that actually
  enforces `isPermitted()` before `Save.php`/`Delete.php`/`DetailViewAjax.php` execute, or are those three
  files reachable by any authenticated user regardless of their EditView/Delete permission once they know the
  URL? Not traced in the source blueprint — the same shared-framework boundary drawn around `DeleteEntity()`'s
  own internal checks.
- What specific roles/profiles in the platform's own role hierarchy are typically granted `EditView`/`Delete`
  permission for this module in practice? Not determinable from static code reading — would require the
  platform's own role/profile configuration data, which is outside this module's own code.

This is intentionally a thin permissions.md — it reports what the legacy code actually checks and honestly
flags what it doesn't, rather than inventing a role model or a coverage claim the source doesn't support.
