# Location — Permissions

> This file has no blueprint counterpart — none of the 12 source blueprint documents catalogue
> permissions. This is genuine net-new extraction against `modules/Location/*.php` (grep for
> `isPermitted(`/role-check patterns) plus the entities/rules/integrations already documented
> elsewhere in this module's own specification. It is intentionally thin: the legacy module's own
> code contains almost no explicit permission or ownership enforcement, and that absence is itself
> the finding — not a gap in this document's own research.

## Method

Grepped every `.php` file in `modules/Location/` for `isPermitted(`, `getPermission`, `is_admin`,
`role`, and `owner`; cross-checked against `entities-and-fields.md` (Role-Location Assignment entity)
and `integrations.md` (Users — role/branch scoping row) for any role/ownership mention already
surfaced by the blueprint passes.

## Roles

No Location-specific role concept exists. The only role-shaped construct that touches this module's
domain is **Role-Location Assignment** (`vtiger_role_locations`) — which CRM security roles are
permitted at which branches, plus two per-role/per-branch POS session-timeout settings (inactivity
logoff, auto clock-out). It is:

- Entirely owned and managed by `modules/Settings/StoreProfile.php`, a Settings-area admin screen —
  **not** by any file in `modules/Location/*.php`.
- **Confirmed never read anywhere in `modules/Location/*.php`.** A grep of every file in this
  module's own directory for `isPermitted`/role/owner patterns found zero references to
  `vtiger_role_locations`. This module's own code does not consult it — the assignment exists as
  admin-configured data, but Location's own controllers and ajax endpoints do not enforce it. See
  `entities-and-fields.md` (Role-Location Assignment entity) and `integrations.md` (Users row) for the
  same finding from the entity/integration side.
- Out of scope for this module's own redesign (`module-overview.md` Scope) — carried forward here
  only as an honest statement of what does and doesn't gate access today.

Beyond that, this module relies entirely on the platform's generic CRM permission model
(`isPermitted($module, $action, $recordId)`), applied inconsistently across the module's own files —
see Permission Matrix below.

## Permission Matrix

| Action | Standard CRM role check (`isPermitted`) | Enforcement site |
|---|---|---|
| Create (Branch) | Not directly checked in any read file — `Save.php` (the entity save entry point, LOC-RULE-001/002) performs no `isPermitted` call of its own. | None found |
| Read/List (Branch) | Implicit via the standard list-view rendering pipeline; no explicit `isPermitted('Location','DetailView',...)` call found in `ListView.php` itself. | Not confirmed |
| Update (Branch) | `isPermitted($currentModule, 'EditView', $_REQUEST[record])` — a **live** check, used only to control whether the detail view's edit link/UI is shown (`DetailView.php:143`). Does **not** gate the actual `Save.php` write path itself — no equivalent check was found there. | `DetailView.php:143` (UI-visibility only) |
| Update (Branch, list-view "Change Owner" bulk action) | `isPermitted('Location', 'EditView', '')` gates whether the "Change Owner" bulk-action button is shown. | `ListView.php` |
| Delete (Branch) | `isPermitted('Location', 'Delete', '')` gates whether the "Mass Delete" bulk-action button is shown in the list view. `Delete.php` itself (the actual delete entry point, LOC-RULE-022) performs no `isPermitted` call of its own — it only checks that a record id is present, per `business-rules-and-validation.md`. | `ListView.php` (UI-visibility only); actual delete path unchecked in `Delete.php` |
| Update (Branch, detail-view dead code) | Two commented-out `isPermitted("Location","EditView"/"Delete",...)` calls exist in both `DetailView.php` and `DisplayLocationFile.php` — dead code, not enforced. | None (inert) |
| Read/Update (Product-at-Location, embedded panel) | `isPermitted('Products', 'EditView', $_REQUEST[record])` — the **one** live permission check found gating the Product-at-Location Edit panel, and it checks **Products-module** permission, not a Location-specific one, since the panel is embedded inside Products' own detail view. | `DisplayLocationFile.php:301` |
| Write QoH (manual/kit ajax adjustment) | **No `isPermitted` call, role check, or ownership check of any kind found.** Grepped `updateLocationQoHAjax.php`, `updateqohkits.php`, `updatelocationkitqty.php` — zero hits. | **None found** |
| Save (entity save entry point, `Save.php`) | **No `isPermitted` call found.** | **None found** |
| Delete (entity delete entry point, `Delete.php`) | **No `isPermitted` call found** — only the record-id presence check (LOC-RULE-022). Whether the generic delete/permission-check helper this endpoint calls performs its own internal check was never confirmed (`risks-and-open-questions.md` LOC-OQ-010). | Unconfirmed — delegated to an unread helper function |
| Lost Sale Log Report — view / inline edits / alert dismiss | **No `isPermitted` call found** in `LostSaleLogReport.php` or `LostSaleLogReportRemoveAlert.php`. This is also the screen carrying the Critical SQL-injection finding LOC-RISK-004 — reachable by "any staff user with access to the home-page report portlet, not an admin-only surface," per `risks-and-open-questions.md`. | **None found** |
| Cost Detail tooltip (`CostDetailAjax.php`) | **No `isPermitted` call found.** | **None found** |
| Field-level ajax save (`DetailViewAjax.php`, 50+ field-routing branches) | **No `isPermitted` call found** beyond the session/location-consistency probe (LOC-RULE-029), which is a stale-tab guard, not a permission check. | **None found** |

## Ownership / Record-Level Rules

- **Branch (Location) records** use the standard platform CRM ownership fields (`Assigned To` /
  `smownerid`, plus Group assignment via the generic Location Group entity) — see
  `entities-and-fields.md`. No Location-specific ownership rule (e.g. "a user only sees their assigned
  branch") was found enforced anywhere in this module's own code; ownership is generic CRM
  record-sharing infrastructure, not a Location-domain business rule.
- **Product-at-Location rows have no ownership concept of their own at all** — consistent with having
  no independent CRM entity/identity (`entities-and-fields.md` R1), they carry no `smownerid` and no
  group assignment. Whatever visibility a user has to a Product-at-Location row is entirely a function
  of whatever permission gate the *Products*-module screen embedding the panel applies
  (`isPermitted('Products', 'EditView', ...)`, per `DisplayLocationFile.php:301`) — Location itself
  asserts no independent record-level rule.
- **No branch-scoping enforcement was found in Location's own code.** Despite Role-Location Assignment
  existing specifically to answer "which roles can access which branches," and despite this module
  owning quantity-on-hand across multiple sites, **no file in `modules/Location/*.php` reads
  `vtiger_role_locations` to scope a user's access to a specific branch's data** — not on QoH writes,
  not on branch CRUD, not on the Lost Sale Log Report. If branch-level access scoping happens at all
  today, it happens somewhere outside this module's own files (session/login-time branch selection in
  the Users module is the closest related mechanism found — see `integrations.md`), not as an
  enforced check inside Location's own controllers.
- **No state-dependent permission was found** (e.g. "can't edit once Part Superseded"). The
  part-supersession transition (`workflows.md`) has no permission gate distinct from whatever generic
  `EditView` check already applies to the surrounding save.

## Known Gaps

- **This is a thin, honest permissions surface, not a complete one.** The legacy module's own code
  enforces almost nothing explicitly — the handful of live `isPermitted` calls found gate UI-button
  visibility (mass-delete, change-owner, edit-link display), not the underlying write endpoints
  themselves. Every QoH-write path, the entity save/delete entry points, and the Lost Sale Log
  Report's actions have **zero** explicit permission checks in the files read for this extraction.
  This absence is itself the most load-bearing finding in this file, not a research shortfall — it is
  consistent with, and compounds, the SQL-injection findings in `risks-and-open-questions.md`
  (LOC-OQ-001 asks the same question from the security-vulnerability angle: whether any of those
  endpoints have an access-control layer above the request-dispatch level this extraction didn't find).
- **Whether the generic delete/permission-check helper `Delete.php` calls performs its own internal
  role/ownership check was never confirmed** — its own body was out of scope for this extraction pass,
  the same open item already flagged as LOC-OQ-010.
- **Whether any access-control layer exists above the ajax-dispatch level generally** (a
  framework-level filter, a session-role gate applied before a request reaches any of these files) was
  not traced — this extraction only covers explicit `isPermitted`/role/owner references inside
  `modules/Location/*.php` itself, per the task's own instruction; a fuller access-control audit would
  need to trace the request-routing layer this module's files sit behind.
