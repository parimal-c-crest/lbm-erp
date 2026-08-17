# MPLPricePlan — Permissions

This file is a genuine extraction, not a reformatting of an existing document — `permissions.md` has no
content anywhere in this documentation series yet (per `_deviations-from-original-template.md`). Sources:
a targeted read of `modules/MPLPricePlan/ListView.php` (the only file in this module found to call
`isPermitted()`), cross-checked against `blueprint/module/MPLPricePlan/02-validation-rules.md` (rule
MPL-VAL-019/MPL-RULE-019) and `blueprint/module/MPLPricePlan/06-cross-module-integrations.md` §1.6 for the
`DeleteRule.php` finding. A repo-wide grep of `modules/MPLPricePlan/` for `isPermitted(`,
`getUserPrivileges`, and `permission` found matches in exactly one file.

## Roles

The legacy system uses vtiger's standard role/profile-based permission model (roles inherited from a
profile's module-action grants), applied generically across all modules. No MPLPricePlan-specific role was
found — the module does not define its own custom role or profile beyond whatever standard vtiger
role/profile a tenant has configured with access to the `MPLPricePlan` module and its `Delete`/`EditView`
actions. This document does not invent role names beyond what the code checks for: the two action-level
permission gates found (below) are keyed to the standard vtiger action names `Delete` and `EditView`, not
to any named business role.

## Permission Matrix

**Confirmed gates found** — only two, both in `ListView.php`, both gating a **list-view mass-action UI
element**, not the underlying operation itself:

| Action | Gate found | Where |
|---|---|---|
| Show "Mass Delete" button on the ListView | `isPermitted('MPLPricePlan','Delete','') == 'yes'` | `modules/MPLPricePlan/ListView.php:105` |
| Show "Change Owner" button on the ListView | `isPermitted('MPLPricePlan','EditView','') == 'yes'` | `modules/MPLPricePlan/ListView.php:109` |

**Everywhere else in this module, no `isPermitted()` call (or equivalent role/privilege check) was
found** — meaning the module's actual write/delete operations are not confirmed to independently
re-check permission at the point they execute; the two checks above only govern whether a *button is
shown* on the list view, not whether the underlying ajax/save/delete endpoint itself re-validates the
caller's role before acting. Specifically, **no `isPermitted()` call exists anywhere in `Save.php`,
`Delete.php`, `DeleteRule.php`, `RuleSection.php`, or `MPLPricePlanAjaxHandle.php`** — the module's entire
real write surface. Whatever authorization these endpoints have is limited to whatever generic
session-authentication gate the wider `index.php` dispatch layer enforces before routing to any module
action at all (i.e. "is this a logged-in user," not "is this user permitted to do this specific thing to
MPLPricePlan"). This is stated as a confirmed absence, not filled in with an invented per-action matrix,
consistent with this project's discipline against fabricating structure the source code does not have.

| Action | Confirmed gate | Notes |
|---|---|---|
| Create (plan save) | None found | `Save.php` has no `isPermitted()` call; relies on session authentication only. |
| Read (list/edit view load) | None found beyond standard module-access routing | No module-specific read gate found beyond whatever `index.php` enforces to route a request into the `MPLPricePlan` module at all. |
| Update (plan grid save, UOM/rule-scope updates via ajax) | None found | `MPLPricePlanAjaxHandle.php`'s 8 ajax tasks have no `isPermitted()` call of their own. |
| Delete (plan, via ajax `delete_mpl_price_plan` task) | None found | Governed only by the usage-count data-integrity guard (see `workflows.md`), which is a business-rule guard, not an authorization check — it does not verify the caller's role or permission, only whether the plan is currently referenced. |
| Delete (rule row, via `DeleteRule.php`) | **None found — confirmed absence, see below** | See "Confirmed authorization gap" section. |

## Confirmed authorization gap — `DeleteRule.php`

**This module has a standalone script, `modules/MPLPricePlan/DeleteRule.php` (17 lines), reachable via a
direct URL request (`index.php?module=MPLPricePlan&action=DeleteRule&ruleid=...`), that deletes a row from
`vtiger_level800rules` — a table owned by a completely unrelated module, Pricebooklevel800 — keyed by an
unescaped, unbound `$_REQUEST['ruleid']`.** This finding belongs in this file, not only in the risk
register, because its defining characteristic is a **missing authorization boundary**, independent of the
SQL-injection defect layered on top of it:

- **No permission check exists inside the file itself** beyond whatever generic session-authentication
  gate the wider system's `index.php` dispatch enforces before routing any request to any module action.
  There is no `isPermitted('MPLPricePlan', 'Delete', ...)` call, no ownership check, and — because the
  table it deletes from belongs to a *different* module (Pricebooklevel800) — even a correctly-implemented
  `isPermitted('MPLPricePlan', ...)` check would be checking permission against the **wrong module
  entirely** relative to the data actually being modified. A user with no MPLPricePlan delete permission
  at all, but any valid authenticated session, can reach this endpoint.
- **No caller of this file was found anywhere in this module's own client-side code or the wider source
  repository** — it is not linked from any button, menu, or JavaScript action in the traced UI. It is
  reachable only by direct URL construction. This does not reduce the severity of the missing
  authorization check; it means the *only* thing currently preventing exploitation is that an attacker has
  to know or guess the URL shape, not any access-control mechanism in the code.
- **The delete itself has no existence check and no ownership check** in addition to having no permission
  check — any `ruleid` value submitted, valid or not, numeric or not (given the unescaped concatenation),
  is passed straight into the `DELETE` statement.
- **Practical consequence**: any authenticated user of this system — regardless of what role or profile
  they hold, regardless of whether that role has any MPLPricePlan permission at all — can trigger a delete
  against a table belonging to an entirely different module (Pricebooklevel800), with no application-level
  authorization check of any kind standing in the way. This is a genuine permissions-relevant finding in
  its own right, not merely a data-integrity or injection finding — the absence of any per-action
  authorization check on a destructive cross-module operation is exactly the class of gap this file exists
  to surface.

**Cross-reference**: the SQL-injection and wrong-table-write dimensions of this same finding are catalogued
as MPL-RULE-019 in `business-rules-and-validation.md` and as MPL-RISK-001 (Critical) in
`risks-and-open-questions.md`. This section documents the same finding's authorization dimension
specifically, per this project's standard that a missing-permission-check finding belongs in
`permissions.md`, not only in the risk register.

**Recommended fix for a new implementation** (consistent with `build-guidance.md` decision 2 and
`entities-and-fields.md`'s recommended-schema §"Referential integrity and the cross-module delete-boundary
principle"): do not merely add an `isPermitted()` check to a reproduced version of this endpoint. The
correct fix is (a) do not reproduce this endpoint at all — its entire premise (deleting from a table this
module does not own) should not exist in the new design; the existing, correctly-scoped rule-delete ajax
task already covers legitimate rule deletion; and (b) every legitimate delete operation this module does
own (plan delete, rule delete) should have an explicit, tested authorization check — verifying the caller's
role/permission for the specific action against the specific module that owns the data — in addition to
the data-integrity guards already documented in `workflows.md`.

## Ownership / Record-Level Rules

- **Tenant-scoped**: this is a multi-tenant platform (see `entities-and-fields.md` R4); every entity is
  expected to carry a tenant reference, but no explicit tenant-boundary check was found inside this
  module's own query code — tenant scoping in the legacy system is established at the platform level, not
  independently re-verified inside `MPLPricePlan`'s own files.
- **No user-ownership model found**: unlike modules where a user only sees their own records, no field or
  check in this module's field catalog (`entities-and-fields.md`) or business rules
  (`business-rules-and-validation.md`) restricts which plans a given user can see or edit based on record
  ownership — access is governed only by module-level role/profile permission (where checked at all — see
  above), not per-record ownership.
- **No state-dependent permission found beyond the plan-delete usage guard**: the only state-dependent
  restriction confirmed anywhere in this module is the plan-delete usage guard (a plan cannot be deleted
  while any product/location assignment references it — see `workflows.md`), which is a data-integrity
  guard, not a permission/authorization rule per se (it does not vary by user role; it applies identically
  regardless of who is attempting the delete). No "can't edit once Finalized"-shaped state restriction
  exists, consistent with `workflows.md`'s finding that this module has no intermediate
  draft/published/suspended plan state at all.
