# SalesHistory — Permissions

> This file has no pre-existing content in the source blueprint (`docs_from_blueprint/module/
> SalesHistory/` documents entities/rules/workflow/calculations/outputs/integrations/screens/risks/
> build-guidance, but not permissions as its own topic). Content below is genuine extraction: a direct
> read of `modules/SalesHistory/*.php` for `isPermitted(` calls, cross-checked against
> `blueprint/module/SalesHistory/02-validation-rules.md` and `06-cross-module-integrations.md` for any
> role mentions (none found in either).

## Roles

The legacy system has no SalesHistory-specific role or profile concept — permission checks are generic
vtiger CRM action-level permissions (`isPermitted("SalesHistory", "<Action>", ...)`), resolved against
whatever profile/role a user is assigned platform-wide, not a role model this module itself defines.
No role name, profile name, or permission-tier is mentioned anywhere in
`blueprint/module/SalesHistory/02-validation-rules.md` or `06-cross-module-integrations.md`.

## Permission Matrix

| Action | Enforced server-side in this module's own files? | Where |
|---|---|---|
| Create (Save — new row) | **No** | `modules/SalesHistory/Save.php` calls no `isPermitted(` anywhere in the file. Reachable by any authenticated user who can submit the form, regardless of assigned profile/role permission. |
| Update (Save — existing row, accumulate) | **No** | Same file, same finding — the accumulate-onto-existing-row branch runs through the identical unguarded save entry point as Create. |
| Update (DetailView inline-edit correction) | Not confirmed in the ajax handler itself | The correction endpoint (`modules/SalesHistory/DetailViewAjax.php`) was not found to call `isPermitted(` in this pass; only `DetailView.php` (the page that renders the correction UI) checks `isPermitted("SalesHistory", "EditView", ...)` before showing the interaction — a UI-visibility gate, not a confirmed server-side enforcement on the ajax endpoint that actually performs the write. |
| Delete | **No** | `modules/SalesHistory/Delete.php` calls no `isPermitted(` anywhere in the file — it checks only that `$_REQUEST['record']` is set (SLH-RULE-012) before delegating to the shared `DeleteEntity()` framework helper. Whether that shared helper performs its own internal permission check was not independently re-read in this pass (the same boundary drawn around shared framework helpers throughout this series). |
| Read (List View) | Partial — UI-level only | `modules/SalesHistory/ListView.php` calls `isPermitted('SalesHistory', 'Delete', '')` and `isPermitted('SalesHistory', 'EditView', '')` to decide whether to render the Delete/Edit action buttons in the grid — this governs button visibility, not a hard block on the underlying action if reached directly. |
| Read (Detail View) | Partial — UI-level only | `modules/SalesHistory/DetailView.php` calls `isPermitted("SalesHistory", "EditView", $_REQUEST['record'])` and `isPermitted("SalesHistory", "Delete", $_REQUEST['record'])` (lines 43/46), plus assigns an `EDIT_PERMISSION` template variable (line 101) — again governs what the detail page renders/enables, not independently confirmed as a hard block on `Save.php`/`Delete.php` themselves. |
| Side-effect write (`pushProductForSalesPrevious()`) | **No** | `include/utils/productDetailUtils.php::pushProductForSalesPrevious()` — the function both of this module's own save paths call unconditionally, and the site of this module's second confirmed SQL injection (`business-rules-and-validation.md`, unnumbered finding) — contains no `isPermitted(` call of any kind. |

**Headline finding**: the module's own everyday write paths — `Save.php` (both the create and
accumulate-update branches) and `Delete.php` — perform **no server-side authorization check of any
kind**. The only `isPermitted(` calls found anywhere in the module's own directory live in
`ListView.php` and `DetailView.php`, and both govern whether to *render* an Edit/Delete control, not
whether the underlying `Save.php`/`Delete.php` endpoint itself enforces permission when reached
directly (e.g. by a crafted request bypassing the UI). This is the same pattern found in every other
module blueprinted in this series so far: **UI-level permission gating on the page that links to an
action, with no corresponding server-side enforcement on the action's own entry point** — and it
compounds directly with this module's two confirmed SQL injections (`business-rules-and-validation.md`
SLH-RULE-001 and the unnumbered finding), both reachable through the same unguarded `Save.php` entry
point. Whether the shared framework helpers this module delegates to (`DeleteEntity()` for delete, the
generic export controller for CSV export) perform their own internal permission check was not
independently re-read in this pass — the same stated boundary drawn around shared framework helpers
throughout this documentation series (see `business-rules-and-validation.md` SLH-RULE-013).

## Ownership / Record-Level Rules

- **No per-user record ownership restriction was found in any of this module's own save/delete/
  inline-edit files.** `Owner ID` is a system/audit field on the entity (`entities-and-fields.md`),
  populated system-side, not read back as a gate on who may write to a given row.
- **No tenant-scoping check was found in this module's own files** — tenant isolation, if it exists,
  is established at the platform level outside this module's own blueprinted scope (per governing
  requirement R6, `entities-and-fields.md`), not enforced by any code this module's own files were
  found to contain.
- **No state-dependent permission exists**, consistent with this module having no status/workflow
  concept (`workflows.md`) — there is no "can't edit once Finalized"-shaped rule anywhere in this
  module's code, since no finalize/lock transition exists for this entity at all.
- **Recommendation for a new implementation**: per requirement R2 (`entities-and-fields.md`, closing
  the SQL-injection findings) and the "one authoritative service" design (`calculations.md`), the same
  authoritative service that becomes the sole writer of `total_activity` is also the natural
  enforcement point for a genuine server-side permission check on every write — closing this gap by
  construction, the same way the injection and formula-divergence findings are closed, rather than
  adding a permission check to each of today's several unguarded entry points individually.
