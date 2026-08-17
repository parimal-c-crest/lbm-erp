# Products — Permissions

> Net-new extraction (no prior digest exists for this file — see
> `2-module-spec-template/_deviations-from-original-template.md`). Evidence below is cited to either a
> live legacy PHP file:line or a blueprint document section. Where no evidence was located, the cell is
> left blank/marked "no evidence found" rather than filled in by inference.

## Roles

No fixed, named "role" catalog is defined *inside* the Products module itself. Two separate
role-related mechanisms were found in the legacy code, both of which resolve against
**admin-configured role lists**, not a hardcoded enum:

- **vtiger profile/role permission matrix** — every core CRUD action (`EditView`, `Delete`, `index`)
  is gated through the standard vtiger `isPermitted(module, action, record)` call, e.g.
  `isPermitted("Products", "EditView", $_REQUEST['record'])` and
  `isPermitted("Products", "Delete", $_REQUEST['record'])`
  (`modules/Products/DetailView.php:180,182`, also `ProductDetailView.php`, `ListView.php:244,694`).
  This is the standard vtiger profile/role-to-permission assignment system — which named roles map to
  which permissions is configured in the profile admin screens, not enumerated in the Products module
  code itself, so the actual role names could not be extracted from this pass.
- **Admin flag** (`$_SESSION['IS_ADMIN']`) — checked directly at several points (e.g.
  `modules/Products/DetailView.php:15,447,477,530,562,587`; `EditView.php:200,500`;
  `ListView.php:655`; `importPartcsvStep1.php:34`) to grant a superset of behavior (e.g. CSV import is
  blocked outright for non-admins: `importPartcsvStep1.php:34` — `if ($current_user->is_admin != 'on')`).
- **Support-field-configured role allow-lists** — several *feature-level* (not simple CRUD) gates are
  each driven by an admin-editable, comma-separated list of role names stored in a system "supported
  field," compared against the current user's role at render time. Found instances, all in
  `modules/Products/DetailView.php` / `EditView.php`:
  - `POSROLE_USERROLEPRODDEFAULTACCESS` — controls whether the current user's role gets
    location-scoped vs. all-location line-code data (`EditView.php:495-499`, `DetailView.php:585-587`).
  - `RESTRICTALLOWLABELS` — controls whether the "print label" button is shown, by role
    (`ListView.php:670-680`, `DetailView.php` ~540-548).
  - `ENABLE_SPECIAL_MPL_SECTION` — controls visibility of the Special MPL section, by role
    (`ListView.php:684-694`).
  - `PRODSTATUSPASSPROT` / `PRODSTATUSPASSPROTSUBFIELD` — see Ownership / Record-Level Rules below
    (Part Status is state/role-gated behind a password prompt for listed roles).

Per `docs_from_blueprint/module/Products/01-module-overview.md` §1.4 ("Actors"), the actor/persona
categories named there — catalog/merchandising staff, pricing/purchasing staff, warehouse/receiving
staff, inventory/management staff, administrators/system operators, system/integration processes — are
a **business-actor description, not a verified permission catalog**. No code-level evidence was found
mapping any of these named actor categories to specific permission grants; they are listed here only as
context for who plausibly holds which vtiger role, not as confirmed roles in the Permission Matrix
below.

**Gap, stated explicitly**: no evidence was found of a documented, fixed list of role *names* (e.g.
"Catalog Manager," "Warehouse Clerk") anywhere in the Products module code or blueprint docs — role
names live in per-tenant admin configuration outside this module's own source, so the Permission Matrix
below is expressed as **permission mechanisms found**, not named roles A/B/C from the template's
placeholder shape.

## Permission Matrix

| Action | Admin (`IS_ADMIN=yes`) | Role granted `Products`/`EditView`/`Delete` via profile | Role NOT granted (or `IS_ADMIN=no` with no grant) |
|---|---|---|---|
| Create | Evidence of admin-only creation gate not found; Products entity create runs through the standard `save_module()` path (`modules/Products/Products.php`) with no located `isPermitted(...,'CreateView',...)` or `is_admin` check gating product creation itself. **No cell filled** — no direct evidence located either way for Create specifically. | Same — no direct `isPermitted` check on Create found in `Save.php`/`Products.php`. | Same — no evidence found. |
| Read | — | `isPermitted($currentModule, 'EditView', ...)` / `isPermitted('Products','index',...)`-style checks gate related-list and cross-reference visibility (e.g. `DetailView.php:36,43,46`), but the base detail/list view render itself was not confirmed gated by a located `isPermitted('Products','index',...)` call. | — |
| Update | Admin bypasses the `POSROLE_USERROLEPRODDEFAULTACCESS` location/line-code restriction entirely (`EditView.php:500`, `DetailView.php:587`) — sees all-location data unconditionally. | `isPermitted("Products", "EditView", $_REQUEST['record']) == 'yes'` gates the `EDIT_DUPLICATE`/`EDIT_PERMISSION` flags exposed to the view (`DetailView.php:180,214`; `ProductDetailView.php`). | Denied edit permission per profile config; template still renders read-only per the `EDIT_PERMISSION` flag (enforcement of the flag at the UI/action layer was not traced further in this pass). |
| Delete | Admin bypass as above where applicable. | `isPermitted("Products", "Delete", $_REQUEST['record']) == 'yes'` gates `DELETE`/`product_del_permission` flags (`DetailView.php:182`; `ListView.php:244,694`). `Delete.php` itself (the actual delete endpoint) has **no `isPermitted`/`IS_ADMIN` check at all** — grep of `modules/Products/Delete.php` found zero permission-related calls; the only gates present are record-id presence (PROD-VAL-039) and the `isFuse5SystemProduct()` exemption (PROD-VAL-040), both content-based, not permission-based. | Denied per UI flag; **not confirmed server-side-enforced** since `Delete.php` itself carries no permission check found in this pass — flagged as an open question, not asserted as a gap (the check may happen further upstream, e.g. in a dispatcher, which was outside this pass's read scope). |
| Mass-Update | No `isPermitted`/`IS_ADMIN`/role check of any kind found in `modules/Products/UpdateMassProduct.php` (form/UI) or `modules/Products/UpdateMassProductCriteria.php` (apply engine) — grep for `isPermitted`, `permission`, `IS_ADMIN`, `is_admin` against both files returned **zero matches**. | Same — zero matches found for either file. | Same — no permission gate of any kind located for the mass-update apply path in either file. **This is a confirmed absence of evidence, not confirmed-absent code elsewhere** — it is possible an outer dispatcher/router applies a check before these files are reached, but that dispatcher was not located in this pass's read scope (per `blueprint/module/Products/02-validation-rules.md`'s own review of these same two files, which likewise documents no confirmation-step/permission gate in the apply path). |

## Ownership / Record-Level Rules

- **Multi-tenant scoping**: this is a confirmed multi-tenant platform. `entities-and-fields.md`'s
  "Governing architectural requirements" §0 states **R6 — Every business entity is scoped to a
  tenant**, established at the platform level and carried forward as an explicit requirement: every
  Products entity (and every uniqueness constraint — product number, barcode-per-type,
  serial-number-per-product, classification-axis name, etc.) is scoped per-tenant, not global. No
  Products-module-specific tenant-scoping code was independently traced in this pass beyond citing R6;
  tenant isolation is treated in the blueprint as a platform-level requirement, not a Products-specific
  business rule.

- **Location scoping (a real, Products-specific record-level restriction, distinct from tenant
  scoping)**: the `POSROLE_USERROLEPRODDEFAULTACCESS` support field, when `ON` and the current
  non-admin user's role is in the configured allow-list, restricts which location-scoped line-code data
  the user's edit/detail view exposes — `NOTALLOWROLEEDITLOCINFO`, `ALLOWROLEALLLOCINFO`,
  `NOTALLOWROLEEDITPRODANDOTHERLOCINFO`, and `ALLOWROLETOSEECURLOCINFONOTOTHLOCINFO` are all
  loaded as related support fields at `modules/Products/EditView.php:485-499`, though only the first
  flag's branching logic was directly traced in this pass; the other three names strongly suggest
  additional per-role, per-location edit/view restrictions exist but their branch logic was not read in
  full. **Flagged as a real mechanism with only partial coverage in this pass — a follow-up read of
  `EditView.php`'s and `DetailView.php`'s full use of these four flags is recommended before treating
  location-scoping as fully characterized.**

- **State-dependent permission — Part Status password protection**: when the `PRODSTATUSPASSPROT`
  support field is `ON`, the current user's role (or, for an admin, `$admin_rolename`) is checked
  against a configured role list (`PRODSTATUSPASSPROTSUBFIELD`); if the role is in that list, the
  `PRODSTATUSPASSPROT` flag sent to the view is `'yes'`, which (per the flag's name and the surrounding
  label/print-permission pattern in the same file) causes the UI to prompt for a password before
  allowing the corresponding action — `modules/Products/DetailView.php:551-579`. **This is confirmed
  UI-flag-level evidence only**: the actual password-prompt enforcement and exactly which action it
  gates (changing Part Status specifically, vs. some other guarded action rendered nearby) was not
  traced past this flag-assignment code in this pass, so the precise scope of this state-dependent rule
  is a partial, not full, confirmation. Beyond this password-prompt mechanism, no other Part-Status-value-dependent
  permission rule (e.g. "cannot edit once Part Status = Discontinued") was located; `Products.php:80-84`
  shows Part Status is force-defaulted to "Active" on create with no corresponding check elsewhere in
  `Save.php`/`Products.php` that blocks edits based on Part Status's current value.

- **Mass-update blast-radius / permission connection (confirmed)**: `blueprint/module/Products/02-validation-rules.md`
  documents that `UpdateMassProductCriteria.php` (the actual mass-update apply engine, as distinct from
  the picker-UI-only `UpdateMassProduct.php`) builds its target-row `WHERE` and `SET` clauses almost
  entirely from raw, unparameterized `$_REQUEST` values, supports an "all Line Codes" (effectively
  "everything") scope mode, and has **"no confirmation limit, batch-size cap, or 'you are about to
  update N products, confirm?' server-side checkpoint... anywhere in the apply path"** (validation-rules
  doc, "Unconfirmed/flagged for follow-up" note under the mass-update section). This is corroborated by
  `docs_from_blueprint/module/Products/09-risks-and-open-questions.md` item 8: **"The mass-update apply
  path has no count-confirmation, dry-run, or batch-size cap... reachable by the same save action every
  warehouse/receiving user performs routinely"** (paraphrasing the analogous Critical-finding-#2
  framing) and item 1, which independently confirms the mass-update field list is an unwhitelisted,
  SQL-injectable surface. **This pass's own direct grep of `UpdateMassProduct.php` and
  `UpdateMassProductCriteria.php` found zero `isPermitted`/`IS_ADMIN`/role-check calls of any kind in
  either file** — i.e. whatever role-based gate exists (if any) to reach the mass-update screen at all
  was not located inside these two files. Taken together: an ungated-in-these-files, uncapped,
  no-dry-run, arbitrary-column mass-write capability is exactly the kind of action a permission/authorization
  model should gate on a specific, auditable permission (e.g. a "Mass Update Products" grant distinct
  from ordinary `EditView`) — and this pass found no evidence that such a distinct gate exists today.
  This is stated as an observation grounded in the absence of any located check, not as a
  recommendation invented without evidence, and not as proof no such gate exists anywhere in the
  system (an outer dispatcher/menu-visibility check outside `modules/Products/` was not ruled out).
