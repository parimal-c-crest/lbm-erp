# SearchLineItem — Permissions

> This module is a confirmed vestigial-CRUD read-model — its real writer is SalesOrder's own finalize
> routine, not this module's own Save.php/EditView path (see `module-overview.md`, `workflows.md`).
> This file therefore documents who can **view** this module's data honestly, rather than inventing a
> full CRUD permission matrix for a save path that isn't actually exercised in practice. Source: a
> direct Grep of `modules/SearchLineItem/` for `isPermitted(`, cross-checked against
> `blueprint/module/SearchLineItem/02-validation-rules.md` and `06-cross-module-integrations.md` for
> role mentions. No named custom roles were found anywhere in this module's own files — permissions run
> entirely through the legacy platform's generic profile-based module/action permission model
> (`isPermitted($module, $action, $record)`), not a SearchLineItem-specific role scheme.

## Applicability

Applicable, but genuinely thin. Only two of this module's screens carry a confirmed `isPermitted()`
gate — `DetailView.php` and `ListView.php`, both checking the generic `EditView` and `Delete`
module-level permissions to decide whether to show Edit/Delete controls. **No permission check of any
kind was found on this module's live write paths**: the inline-edit ajax endpoint and the alert-dismiss
ajax endpoint (the module's two genuinely-exercised write surfaces per `business-rules-and-validation.md`
SLI-RULE-014) carry no `isPermitted()` call at all — only implicit session authentication. The oversale
bulk-reset script (see `workflows.md`) has no CSRF/permission check visible in its own file either. This
gap is documented as a finding, not resolved by inventing a permission model the code does not have —
see Open Item below and `risks-and-open-questions.md` SLI-OQ-010.

## Roles

No SearchLineItem-specific roles exist. Access is governed by the legacy platform's generic,
profile-based module/action permission model — the same `isPermitted('SearchLineItem', <action>,
<record>)` mechanism every other legacy module uses, evaluated against whatever profile a user's
assigned role carries. This module does not define or check for any named role of its own (e.g. no
"SearchLineItem Administrator" or similar). Two generic actor categories are relevant here, both already
named in `module-overview.md`:

- **Counter/sales/operations staff** — the primary users of the module's search/list/export surface and
  the alert worklists; gated by whatever profile permissions their assigned role carries for the
  `SearchLineItem` module.
- **SalesOrder's finalize process** — a system/integration process, not a permission-checked human
  actor; it writes SearchLineItem rows directly via SalesOrder's own code path, bypassing this module's
  own permission gates entirely (there is nothing for `isPermitted()` to check, since no user request
  reaches this module's own Save.php on that path).

## Permission Matrix

| Action | Confirmed gate | Source |
|---|---|---|
| View (List) | List view itself has no confirmed `isPermitted()` gate on rendering the grid; `ListView.php` only checks `isPermitted('SearchLineItem', 'EditView', '')` and `isPermitted('SearchLineItem', 'Delete', '')` to decide whether to show Edit/Delete action controls on each row. | `modules/SearchLineItem/ListView.php:160,164` |
| View (Detail) | Not independently confirmed gated in this pass; `DetailView.php` checks `EditView`/`Delete` permissions (below) to decide which action controls to render, implying the page itself is reachable once a user has any access to the module. | `modules/SearchLineItem/DetailView.php:109,112,169` |
| Create | **Not exercised in practice** — the module's own Save.php/EditView CRUD path is confirmed vestigial (see `module-overview.md`); the real writer, SalesOrder's finalize routine, does not go through this module's permission-checked UI path at all. No meaningful "who can create" answer exists for this module's own surface — see `business-rules-and-validation.md` SLI-RULE-001–005. | `docs_from_blueprint/.../01-module-overview.md` §1.1 |
| Update (record edit) | `DetailView.php` checks `isPermitted('SearchLineItem', 'EditView', $_REQUEST['record'])` to decide whether to show the Edit control and sets an `EDIT_PERMISSION` template flag from the same check. This gates the vestigial generic edit form's visibility, not the module's actual live write surfaces. | `modules/SearchLineItem/DetailView.php:109,169` |
| Update (inline-edit ajax) | **No permission check found.** The module's one genuinely live, frequently-exercised field-edit path (Extended Product Cost / Extended Original Product Cost) has no `isPermitted()` call in its own file — only an implicit session-authentication requirement. | `business-rules-and-validation.md` SLI-RULE-009–013 |
| Delete | `DetailView.php` and `ListView.php` both check `isPermitted('SearchLineItem', 'Delete', ...)` before showing the Delete control. `Delete.php` itself performs no permission check of its own beyond the record-id presence guard (SLI-RULE-006) — the UI-level gate is the only confirmed enforcement point. | `modules/SearchLineItem/DetailView.php:112`; `modules/SearchLineItem/ListView.php:160`; `business-rules-and-validation.md` SLI-RULE-006–008 |
| Alert-dismiss (supersede/return worklist) | **No permission check found** beyond session authentication — confirmed as this module's single most significant security-adjacent finding alongside the SQL injection on the same endpoint. | `business-rules-and-validation.md` SLI-RULE-014; `risks-and-open-questions.md` SLI-RISK-001 |
| Alert-dismiss (oversale bulk-reset script) | **No CSRF/permission check visible** in the script's own 5-line file, and no `require_once` of any auth/session-boot scaffolding beyond the database layer. Whether this script is even reachable at all is a separate, unresolved question (see `workflows.md`). | `blueprint/module/SearchLineItem/06-cross-module-integrations.md` (oversale-reset script finding) |
| Export (CSV) | Governed by the module's own `search_fields`/permitted-fields machinery via `SearchUtils.php`'s field-visibility checks (`getFieldVisibilityPermission`), not a distinct `isPermitted()` action gate specific to export. Not independently confirmed as a separate "export" permission action. | `modules/SearchLineItem/SearchUtils.php:139,530` |

**Field-level visibility.** `SearchUtils.php` (the shared search-utility library backing this module's
list/search machinery) checks `getFieldVisibilityPermission()` for specific cross-module fields it joins
against (Contacts' `firstname`, Calendar's `taskstatus`/`eventstatus`) and a generic
`$profileGlobalPermission`/`$is_admin` check gating which searchable fields are exposed to a given user's
profile. This is inherited shared-infrastructure behavior, not a SearchLineItem-specific field
permission scheme.

## Ownership / Record-Level Rules

- **No tenant-scoping or record-ownership check was found in this module's own files.** The blueprint's
  governing architectural requirement R5 (every business entity is scoped to a tenant) is asserted as a
  forward-looking requirement for the new implementation precisely *because* it was not independently
  confirmed as already enforced at this module's own level in the legacy system — see
  `entities-and-fields.md` §0.
- **No state-dependent permission was found** (e.g. no "can't edit once dismissed" or similar gate tied
  to the two alert flags' states) — the alert-dismiss action's only guard is that the submitted id-list
  is non-empty, not that the target row is in any particular state (SLI-RULE-015).
- **Does a user only see their own records?** Not confirmed either way in this pass — no owner-scoped
  (`smownerid`-style) filter was found in the module's own query-building code, consistent with this
  module having no `vtiger_crmentity` join at all (see `entities-and-fields.md` §"Audit / system").

## Open Item

**Whether the missing permission check on the alert-dismiss action is intentional design or a genuine
gap is the module's single highest-priority unresolved question** (`risks-and-open-questions.md`
SLI-OQ-010) — not resolvable from static analysis alone, flagged for subject-matter-expert confirmation.
It is distinct from, and does not need resolving before, fixing the confirmed SQL injection on the same
endpoint (SLI-RISK-001), which is a defect regardless of the permission-model answer.
