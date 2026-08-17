# Pricebooklevel300 — Permissions

> **Method and sources.** Neither `docs_from_blueprint/module/Pricebooklevel300/` nor
> `blueprint/module/Pricebooklevel300/` contains a dedicated permissions file — this is genuine, net-new
> extraction, not a reformatting of existing content, consistent with the standing note that permissions.md has
> no content anywhere yet for any of the existing modules (`2-module-spec-template/_deviations-from-original-template.md`
> "What this means for the existing 18 modules"). This file is built from: (1) a grep for `isPermitted(` scoped
> to `modules/Pricebooklevel300/`; (2) `blueprint/module/Pricebooklevel300/02-validation-rules.md` (Pass 2, the
> module's full validation/injection catalog); (3) `blueprint/module/Pricebooklevel300/06-cross-module-integrations.md`
> (no role/permission-differentiation content found there beyond a single unrelated use of the word "role" —
> "its role as an internal pricing/promotion-rule authoring tool," §7.3).

## Roles

**No differentiated custom roles were found anywhere in this module's own files.** The `isPermitted(` grep
against `modules/Pricebooklevel300/` returns exactly five call sites, all checking the standard vtiger
module/action-level permission model (module name, action name, optional record id) — there is no
module-specific role name, no custom permission tier, and no role-conditional business logic found anywhere
under this module's own directory:

| File | Call | What it gates |
|---|---|---|
| `DetailView.php:49` | `isPermitted("Pricebooklevel300","EditView",$_REQUEST['record'])` | Whether the "Edit" action is offered/allowed on a specific plan's detail view. |
| `DetailView.php:52` | `isPermitted("Pricebooklevel300","Delete",$_REQUEST['record'])` | Whether the "Delete" action is offered/allowed on a specific plan's detail view. |
| `DetailView.php:107` | `isPermitted($currentModule,'EditView',$_REQUEST[record])` | Same edit-permission check, assigned to the Smarty template as `EDIT_PERMISSION` for display-layer gating. |
| `ListView.php:102` | `isPermitted('Pricebooklevel300','Delete','')` | Whether the ListView's own mass-delete action is offered. |
| `ListView.php:106` | `isPermitted('Pricebooklevel300','EditView','')` | Whether the ListView's own mass-edit/mass-change-owner action is offered. |

This is the standard vtiger 5.0.4 CRM permission model applied at the module+action level — whatever set of
CRM profiles/roles a given tenant has configured determines who passes these checks, but **this module's own
code does not itself define, enumerate, or differentiate any named role** (e.g. there is no
"merchandiser"-vs-"admin" branch anywhere in this module's own files). The **actors** named in
`module-overview.md` (Merchandising/pricing administrator) describe who is expected to use this module in
practice, not a role this module's own code enforces by name.

**Critically, several of this module's own most consequential write paths perform NO permission check of any
kind at all** — not merely "checked against a broad role," but literally absent from the file:

- `Save.php` (the everyday plan-header and per-rule save path) contains no `isPermitted(` call anywhere in the
  file — session authentication alone (whatever the surrounding framework enforces upstream) is the only gate
  found.
- `Delete.php` itself contains no `isPermitted(` call — the permission check for delete happens only in
  `DetailView.php`/`ListView.php` at the point the delete *link* is rendered, not at the point the delete
  *action* actually executes; whether `Delete.php` is independently reachable by direct URL bypassing the
  rendered-link check was not traced by the source blueprint (`docs_from_blueprint/module/Pricebooklevel300/03-business-rules-and-validation.md`
  §3.3, PBL300-RULE-012).
- The account-apply flow (`PriceBook300ApplyToAllAccounts.php`/`SavePriceBook300UpdatesToSelectedAccount.php`),
  the coupon subsystem (`addcoupons.php`/`addmixmatchcoupons.php`/`savecoupons.php`), the rule-duplication
  feature (`duplicatePBRule.php`), and the rule-type priority reorder (`updaterulestypes.php`) contain **no
  `isPermitted(` call anywhere** — every one of these ajax/action endpoints relies entirely on session
  authentication, with no module- or action-scoped permission check found in the file itself.

## Permission Matrix

**No differentiated roles exist for this module to build a real matrix against** (per the finding above) — the
template's Role A/B/C columns are collapsed into a single column describing what the standard vtiger
module/action permission check (where present) actually gates, since renaming them to invented role names
would misrepresent the evidence.

| Action | Standard vtiger module/action permission (`isPermitted`) |
|---|---|
| Create | **Not gated by any `isPermitted(` call found in `Save.php`** — the plan/rule create path relies on session authentication only. |
| Read | Not directly gated by an `isPermitted(` call in the files this pass reached; standard CRM record-visibility/sharing rules (not traced under this module's own files) would apply at the framework level. |
| Update | Gated at the **link-rendering** level only (`DetailView.php`/`ListView.php` `EditView` checks, above) — the actual save action in `Save.php` performs no independent permission check of its own. |
| Delete | Gated at the **link-rendering** level only (`DetailView.php`/`ListView.php` `Delete` checks, above) — `Delete.php` itself performs no independent permission check of its own before calling the injectable soft-delete (`business-rules-and-validation.md` PBL300-RULE-002/012). |

## Ownership / Record-Level Rules

- **No user-scoped ("only see your own records") restriction was found anywhere in this module's own files** —
  every list/detail/rule-list query traced by the source blueprint scopes by `deleted='0'` and, where
  applicable, by plan name/rule id, never by `smownerid`/created-by-user.
- **Tenant scoping**: the source blueprint's own governing requirement (R5, `entities-and-fields.md`) states
  every business entity in a new implementation must be explicitly tenant-scoped — but does **not** confirm the
  legacy system's own current tenant-isolation mechanism for this module specifically (multi-tenancy is
  handled at a platform level not re-derived by this module's own directory-scoped blueprint pass).
- **No state-dependent permission was found** — e.g. there is no "can't edit once Finalized" rule, because this
  module has no such lifecycle state at all (`workflows.md` — plan/rule/coupon each have only
  active/soft-deleted, no intermediate business status).

### Critical finding: `DetailViewAjax.php` — arbitrary field write on a foreign module record, with no allow-list

**This module's single highest-severity permissions-relevant finding.** `DetailViewAjax.php`
(`modules/Pricebooklevel300/DetailViewAjax.php`, 46 lines) is a wholesale, unadapted copy-paste of a
`Campaigns`-module inline-edit endpoint, never adapted to this module at all
(`docs_from_blueprint/module/Pricebooklevel300/03-business-rules-and-validation.md` §3.4, PBL300-RULE-014;
`09-risks-and-open-questions.md` §9.1, Critical finding 1). On `ajxaction=DETAILVIEW`, the endpoint:

1. Instantiates `Campaigns()` — an **entirely different module's entity class** than the one this ajax route
   nominally belongs to.
2. Loads a record via `retrieve_entity_info($_REQUEST["recordid"], "Campaigns")` — the record id is fully
   caller-supplied.
3. Sets `$modObj->column_fields[$fieldname] = $fieldvalue`, where both `$fieldname` (`$_REQUEST["fldName"]`)
   and `$fieldvalue` (`$_REQUEST["fieldValue"]`) are caller-supplied, **with no allow-list on which column can
   be targeted** — any field on the `Campaigns` entity's column-field map can be set, not a pre-approved subset.
4. Calls `$modObj->save("Campaigns")`, persisting the caller-chosen field/value pair against the *other*
   module's own record.

**This is fundamentally an authorization gap, not merely a data-integrity defect**: the endpoint sits under
`Pricebooklevel300`'s own ajax route, so whatever permission model a caller might expect to be checked (this
module's own `EditView`/`Delete` checks, documented above) is never actually consulted — no permission check of
any kind beyond session authentication was found in this file, and even if one existed, it would be checking
the *wrong* module's own permission for an edit actually landing against `Campaigns`. **No caller was found
anywhere in this module's own UI** — the endpoint is reachable only by direct URL/ajax construction, which
narrows but does not eliminate its real-world exposure to any authenticated user who can construct the request.
This is a **wholesale copy-paste of the same defect pattern found in the `Campaigns` module itself** (source:
`03-business-rules-and-validation.md` §3.4; ranked the module's single most severe finding by blast radius in
`09-risks-and-open-questions.md` §9.1, ahead of every one of the module's own confirmed SQL-injection findings,
"because its blast radius per successful request is broader than any single injection point in this module's
own register (an arbitrary-column write, not a scoped delete or a read)").

**A new implementation's own security posture should treat "no code path reachable under this module's own
routes may ever write to another module's entity" as a structural invariant**, not merely a fix for this one
instance (`09-risks-and-open-questions.md` §9.4, finding 2). This finding is also carried in
`risks-and-open-questions.md` as `PBL300-RISK-001`, per its normal risk-register mapping — documented in both
files because it is simultaneously a data-integrity risk and, as framed here, an authorization defect: an
arbitrary field write with no column allow-list and no module-scoped permission check is, by definition, a
failure of the access-control layer, not only a code-quality one.
