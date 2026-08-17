# Pricebooklevel800 — Permissions

> `permissions.md` has no content anywhere yet for any of the modules blueprinted so far in this
> series — this is net-new extraction work, not a reformatting exercise. See
> `_deviations-from-original-template.md` in the template folder. Sourced by direct inspection of
> `modules/Pricebooklevel800/*.php` for this module (grep for `isPermitted(`), cross-checked against
> `blueprint/module/Pricebooklevel800/02-validation-rules.md` and
> `06-cross-module-integrations.md`, neither of which mentions any role/profile name — this module's
> blueprint passes did not characterize authorization at all, so everything below is drawn directly
> from the legacy source files, not from the blueprint documents.

## Applicability

This module has authorization checks, but they are minimal and generic — the platform's own
vtiger-standard `isPermitted($module, $action, $record)` call, invoked at exactly two points, both in
UI-rendering files rather than in any of the write-performing action files themselves.

## What is actually checked, file by file

| File | Check | Action string | Record scoping |
|---|---|---|---|
| `DetailView.php` (line 42) | `isPermitted("Pricebooklevel800", "EditView", $_REQUEST['record'])` — gates whether the Smarty template renders an Edit/Duplicate affordance. | `EditView` | Record id passed, but this is a generic vtiger profile/role action-permission check (module + action), not a record-owner check — Pricebooklevel800 headers carry no owner-scoping business rule of their own (see Ownership below). |
| `DetailView.php` (line 45) | `isPermitted("Pricebooklevel800", "Delete", $_REQUEST['record'])` — gates whether the Smarty template renders a Delete affordance. | `Delete` | Same as above. |
| `DetailView.php` (line 99) | `isPermitted($currentModule, 'EditView', $_REQUEST[record])` — a second, redundant check assigned to `EDIT_PERMISSION` for template use. | `EditView` | Same as above. |
| `ListView.php` (line 106) | `isPermitted('Pricebooklevel800', 'Delete', '')` — gates whether the mass-delete button renders on the list toolbar. | `Delete` | No record id passed (module-level check only). |
| `ListView.php` (line 110) | `isPermitted('Pricebooklevel800', 'EditView', '')` — gates whether the "Change Owner" mass-action renders on the list toolbar. | `EditView` | No record id passed (module-level check only). |

**In every case, this is a generic, platform-standard module/action profile-permission check** — the
same mechanism every vtiger module gets by default from the framework, not a bespoke authorization
rule this module's own developers wrote. None of the checks distinguish "is this specifically a
pricing/merchandising-administrator role" from any other role that happens to have `EditView`/`Delete`
permission on the `Pricebooklevel800` module tab; no role name is referenced anywhere in this module's
own code.

## Confirmed gap: the write-performing action files have no in-file authorization check at all

A repo-wide grep for `isPermitted(`/`permission`/`checkAccess` across every file in
`modules/Pricebooklevel800/` returns matches **only** in `DetailView.php` and `ListView.php` (both
UI-rendering files, both gating template affordances, not data writes). **Zero matches** were found
in any of the following action-performing files:

- `Save.php` — the header create/edit save flow, and the confirmed source of Critical Finding
  PBL800-RISK-001 (`risks-and-open-questions.md`) — the unbounded, allow-list-free rule-field
  mass-assignment injection.
- `Delete.php` — the standard (unconditional) delete path.
- `PriceBook800ApplyToAllAccounts.php` — the Apply-to-Accounts bulk-write flow, and the confirmed
  source of Critical Finding PBL800-RISK-004 — the account-list/price-book-list injection that can
  redirect which price book a chosen set of customer Accounts is assigned to.
- `massDefaultRule.php` — the "set as default" mass-action, which mutates the global
  `vtiger_field.fielddefault` value for the Accounts assignment field, and the confirmed source of
  Critical Finding PBL800-RISK-003.
- `displayRules.php`, `duplicatePBRule.php`, `productForRule.php`, `SavePriceBook800UpdatesToSelected
  Account.php`, `ExportRecords.php`, `CheckDuplicateBookName.php`, `Pricebooklevel800Ajax.php`,
  `EditView.php`.

**This is a genuine adjacent authorization gap, not merely a stylistic observation**: the two files
carrying this module's most consequential, blast-radius-widest defects
(`PriceBook800ApplyToAllAccounts.php` — an unauthorized pricing-tier reassignment across Accounts;
`massDefaultRule.php` — a global, forward-looking field-metadata mutation affecting every future
Account) have **no additional authorization check of their own** beyond whatever the generic
platform-level module/action dispatcher enforces before routing a request to them. This module's own
code provides no second line of defense — if the platform dispatcher's own tab/action permission
check is misconfigured, bypassed, or simply grants broader access than intended for the acting
session, there is nothing inside these specific files that would independently re-verify the caller
is authorized for this specific, highly consequential operation. This mirrors, and compounds, the
confirmed unescaped-SQL injection findings in the same files (`risks-and-open-questions.md`
PBL800-RISK-001/003/004): an attacker who can reach these action names with almost any authenticated
session shape is not additionally challenged by any record-level, role-name, or business-context
check specific to "should this session be allowed to reassign pricing tiers / mutate the global
default" — the only gate is the same generic tab-permission check that every other module's every
other action also relies on.

Whether the generic platform dispatcher itself performs a deeper, action-specific permission check
before ever reaching these files (e.g. validating the `action=` query parameter against a
per-role action-permission table before `index.php` even includes the target file) was **not traced**
within this module's own file set — this is exactly the same category of unresolved question the
blueprint raises for the Campaigns-leftover access-control-bypass risk (`risks-and-open-questions.md`
PBL800-RISK-006 / PBL800-OQ-005), and is flagged here as an open question rather than assumed either
way.

## Roles

No role name (e.g. "Administrator," "Pricing Manager") is referenced anywhere in this module's own
code — the `Actors` documented in `module-overview.md` (Customer, Pricing/merchandising administrator,
Counter/sales staff, System/integration processes) are business-context roles inferred from what each
actor does with the module, not literal vtiger role/profile names found in the source. The module
relies entirely on the platform's generic module/action profile-permission system (`isPermitted()`)
rather than declaring or checking any module-specific role of its own.

## Permission Matrix

| Action | Generic profile permission checked? | Enforced where | Enforced how |
|---|---|---|---|
| Create (header) | No | — | `Save.php`'s create branch has no `isPermitted()` call of its own; reachable by any session that can reach the URL, subject only to whatever the platform dispatcher enforces before routing the request (unconfirmed, see above). |
| Read (header, list/detail) | Indirectly | `ListView.php` / `DetailView.php` render, generic vtiger list/detail access | Standard vtiger module-tab visibility; not itself an explicit `isPermitted()` call in this module's own files for the base read/list operation. |
| Update (header) | Partially — UI affordance only | `DetailView.php` (renders Edit/Duplicate button conditionally) | `EditView` action check gates only whether the **button is shown**; `Save.php` itself performs no corresponding server-side check, so a direct request to `Save.php` bypasses this gate entirely. |
| Delete (header, unconditional path) | Partially — UI affordance only | `ListView.php` (renders mass-delete button conditionally) | `Delete` action check gates only whether the **button is shown**; `Delete.php` itself performs no corresponding server-side check. |
| Delete (header, guarded ajax path) | No | — | The ajax delete-guard path (`business-rules-and-validation.md` PBL800-RULE-007) checks Account-usage, not permission — no `isPermitted()` call found in this path. |
| Apply-to-Accounts bulk assign/un-assign | No | — | `PriceBook800ApplyToAllAccounts.php` has no `isPermitted()` call of its own. |
| Set as Default (mass-action) | No | — | `massDefaultRule.php` has no `isPermitted()` call of its own. |
| Rule create/edit (Level800rules, via this module) | No | — | The header save flow's per-rule update loop (`Save.php`) has no `isPermitted()` call of its own; per PBL800-RULE-010, only the duplicate-rule path is subject to whatever validation the sibling module's own entity-save enforces, and that is data validation, not authorization. |

## Ownership / Record-Level Rules

- **No tenant-scoping or record-ownership check specific to this module was found** in any file —
  the standard vtiger `smcreatorid`/`smownerid` audit columns exist on both the header and rule
  tables (`entities-and-fields.md`), but no code in this module's own files was found reading them to
  restrict which users can see or act on a given price book based on who created/owns it. Whatever
  ownership-based visibility exists is, at most, whatever the generic platform-core sharing/ownership
  layer provides by default — not confirmed or traced within this module's own scope.
- **No state-dependent permission** (e.g. "can't edit once X") exists — per `workflows.md`, this
  module's header entity has no formal status field, so there is no analogue to SalesOrder's
  "cannot edit/delete once Finished" business rule anywhere in this module.
- **The delete-usage guard** (blocking deletion of a price book while any Account is still assigned
  to it, PBL800-RULE-007) is a data-integrity guard, not an authorization/permission rule — it does
  not vary by who the acting user is, only by whether the record is currently referenced elsewhere.

## Open Questions

- Whether the generic platform dispatcher performs any deeper permission check before routing a
  request to the action-performing files listed above (Save/Delete/PriceBook800ApplyToAllAccounts/
  massDefaultRule/etc.) is unconfirmed within this module's own scope — see "Confirmed gap" above.
  This directly affects the actual, real-world exploitability of PBL800-RISK-001/003/004
  (`risks-and-open-questions.md`): if the dispatcher enforces nothing beyond basic session
  authentication for these action names, those Critical injection findings are reachable by any
  authenticated user, not just an administrator-role user.
- Whether any role in the live system is actually configured with `EditView`/`Delete` permission on
  the `Pricebooklevel800` module tab **without** also being a genuine pricing/merchandising
  administrator was not checked — this module's spec cannot confirm the real-world population of
  users who can reach these screens, only what the code itself gates.
