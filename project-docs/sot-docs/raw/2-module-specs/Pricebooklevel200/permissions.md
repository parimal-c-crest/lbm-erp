# Pricebooklevel200 — Permissions

Genuine extraction for this module spec — no equivalent document exists for any of the eighteen modules built
before this template (`_deviations-from-original-template.md`). Grounded in: (a) role/actor mentions across the
underlying blueprint (`blueprint/module/Pricebooklevel200/02-validation-rules.md`,
`06-cross-module-integrations.md`, `07-risk-findings.md`, `00-README.md`), and (b) a direct grep of
`modules/Pricebooklevel200/` for `isPermitted(` calls against the live legacy codebase (repo commit
`17d7e925d2`), cross-checked against the file that is confirmed to have none.

## Roles

The legacy system implements permissions via vtiger's own generic, profile-based CRUD action gate
(`isPermitted($module, $action, $recordId)`), not module-specific named roles — permission is a function of
which actions a user's assigned profile grants for the `Pricebooklevel200` module, not a role label baked into
this module's own code. The actors who interact with this module, per `module-overview.md` §Actors, are:

- **Sales/pricing administrator** — creates and edits price sheets, authors pricing rules, assigns sheets to
  accounts, configures GP color-code settings. Requires Create/Edit/Delete-level profile permission on
  `Pricebooklevel200`.
- **Sales rep / counter staff** — reviews a price sheet, prints or emails the Master Price Sheet PDF to a
  customer. Requires at minimum Read-level (detail-view) profile permission on `Pricebooklevel200`.
- **Customer** — not a system actor with credentials of their own; receives the Master Price Sheet PDF as an
  external document, never interacts with the module's own screens or permission gate directly.
- **SalesOrder/Quotes pricing flow (system/integration process)** — the live consumer of this module's
  pricing-resolution mechanism at sale-line pricing time; runs as part of the pricing-computation function
  (`InventoryUtils.php::find_MA_MPS_SalesPricesByParams()`), not itself gated by `Pricebooklevel200`'s own
  permission checks (it is a read of already-saved data, not a user-facing action against this module).
- **Jobs subsystem (system/integration process)** — reads/writes the job-linkage relationship at save time,
  under whatever permission context the job-scoped save action itself runs.

## Permission Matrix

| Action | Sales/pricing administrator | Sales rep / counter staff |
|---|---|---|
| Create | Yes (standard module Create permission, gated implicitly via the standard save/edit-view entry points — no dedicated Create-specific `isPermitted()` call was found distinct from EditView's own gate) | Not confirmed — depends on the user's assigned profile's own Create grant for this module; the source blueprint's file set does not document a role-to-profile mapping |
| Read | Yes | Yes |
| Update | Yes — gated by `isPermitted("Pricebooklevel200", "EditView", $_REQUEST['record'])` in `DetailView.php:42` and `ListView.php:110`, and again via `$smarty->assign("EDIT_PERMISSION", isPermitted($currentModule, 'EditView', $_REQUEST[record]))` in `DetailView.php:99` (controls whether the edit UI is even offered) | Depends on the user's assigned profile's own Edit grant |
| Delete | Yes — gated by `isPermitted("Pricebooklevel200", "Delete", $_REQUEST['record'])` in `DetailView.php:45` and `isPermitted('Pricebooklevel200', 'Delete', '')` in `ListView.php:106` (controls whether the delete UI is offered). **Note**: even when this gate passes, the delete action itself is confirmed to instantiate the wrong entity class (`Deliverylog`, not `Pricebooklevel200`) — see `business-rules-and-validation.md` rule PBL200-RULE-014 and `risks-and-open-questions.md` PBL200-RISK-001. The permission check is present and correctly scoped; the delete's own downstream behavior is the separate, confirmed defect. | Depends on the user's assigned profile's own Delete grant |

**Where permission checks were confirmed present** (`isPermitted(` grep against `modules/Pricebooklevel200/`,
repo commit `17d7e925d2`):

| File | Line | Check |
|---|---|---|
| `DetailView.php` | 42 | `isPermitted("Pricebooklevel200", "EditView", $_REQUEST['record'])` — gates the Edit link |
| `DetailView.php` | 45 | `isPermitted("Pricebooklevel200", "Delete", $_REQUEST['record'])` — gates the Delete link |
| `DetailView.php` | 99 | `isPermitted($currentModule, 'EditView', $_REQUEST[record])` — assigned to the template as `EDIT_PERMISSION` |
| `ListView.php` | 106 | `isPermitted('Pricebooklevel200', 'Delete', '')` — gates the Delete action in the listview |
| `ListView.php` | 110 | `isPermitted('Pricebooklevel200', 'EditView', '')` — gates the Edit action in the listview |

These five checks are the module's own complete `isPermitted()` footprint — no other file under
`modules/Pricebooklevel200/` (37 files total, per the source blueprint's own inventory) contains a permission
check of any kind. That absence is the module's single most important permissions-relevant finding, covered
next.

## Confirmed permission gap: `DetailViewAjax.php` has no permission check of any kind

**This is the module's own most consequential permissions finding, carried forward here explicitly rather than
left only in the risk register** (per this document's own extraction mandate).

`modules/Pricebooklevel200/DetailViewAjax.php` implements two ajax branches, reachable at
`index.php?module=Pricebooklevel200&action=DetailViewAjax&ajxaction=...`, and **contains zero `isPermitted()`
calls of any kind** — confirmed directly by reading the file's full source (repo commit `17d7e925d2`) and by
the grep sweep above returning no matches for this file.

- **`ajxaction=DETAILVIEW` branch** — reads `recordid`, `tableName`, `fldName`, and `fieldValue` directly from
  the request, `require_once('modules/Campaigns/Campaigns.php')` and instantiates `new Campaigns()` (**not**
  `Pricebooklevel200`, the module this file's own directory nominally belongs to), sets
  `$modObj->column_fields[$fieldname] = $fieldvalue` with `$fieldname` taken verbatim from the request (no
  allow-list of which field may be written), sets `$modObj->id = $crmid`, and calls `$modObj->save("Campaigns")`.
  The only gate this branch passes through before reaching the write is the standard vtiger session-auth check
  (an unauthenticated request is redirected to login before reaching this file) — there is **no**
  `isPermitted('Campaigns', ...)` check, and no check that `$crmid` is a record the requesting user has any
  legitimate relationship to. **Practical effect**: any authenticated user, regardless of their own permissions
  on the Campaigns module, and regardless of whether they hold any permission on Pricebooklevel200 beyond
  reaching this URL, can write an arbitrary field value to an arbitrary Campaigns record by direct URL
  construction — a live, reachable, unauthorized write, not merely a theoretical gap.
- **`task=getAccDetails` branch** (the file's second entry point, on the same file, same missing-permission-check
  condition) — builds a query against `vtiger_account`/`vtiger_accountscf` by raw string concatenation of
  `$_REQUEST['accnum']`, also with no permission check specific to this branch. Confirmed separately as a SQL
  injection (`business-rules-and-validation.md` rule PBL200-RULE-042); the missing-permission-check condition
  applies to this branch too, though its blast radius (read-only account lookup) is narrower than the
  `DETAILVIEW` branch's arbitrary write.

**Cross-reference**: this finding is also recorded as `business-rules-and-validation.md` rule
PBL200-RULE-041 (severity: Wrong-entity-class, arbitrary write, no permission check — Critical) and
`risks-and-open-questions.md` risk PBL200-RISK-002 (Critical). It is repeated here, in full, per this document's
own scope, rather than referenced only from the risk register — the instruction governing this spec's
extraction explicitly calls out that this finding must be covered in `permissions.md` directly, not only in the
risk register.

**A new implementation's build guidance** (see `build-guidance.md`, "Wrong-entity-class ajax dispatch" rule
group) treats this branch as **not reproduced** — the arbitrary-write capability is not carried forward at all,
rather than retrofitted with a permission check, since no legitimate Pricebooklevel200-specific purpose for
writing to Campaigns records was found anywhere in this module's own client-side code (no caller of this
specific `ajxaction=DETAILVIEW` branch was located in `Pricebooklevel200.jq.js`/`Pricebooklevel200.js`). If a
genuine inline-edit capability against this module's own data is needed, a new implementation should build it
against `Pricebooklevel200`'s own entity, gated by a correct, module-scoped permission check — not retain this
file's shape.

## Ownership / Record-Level Rules

- **Tenant scoping**: the legacy system is confirmed multi-tenant at the platform level; no per-record
  tenant-isolation logic specific to Pricebooklevel200 was independently traced in the source blueprint beyond
  the standard vtiger session/tenant boundary. Carried forward as Requirement R5 in `entities-and-fields.md` for
  the new implementation (every table explicitly `tenant_id`-scoped).
- **Ownership field**: both the Price Sheet header and Price Sheet Rule entities carry a `smownerid`
  (Owner)/`smcreatorid` (Created By) pair, per `entities-and-fields.md`, but no code path was found in the
  source blueprint that restricts read/edit/delete access based on record ownership specifically (i.e. no
  "only the owner or their manager may edit" rule was confirmed) — access is gated purely by the profile-level
  `isPermitted()` checks documented above, not by ownership.
  This is an **absence of an owner-scoped rule**, not a confirmed "no ownership restriction exists" business
  decision — not independently investigated beyond what the `isPermitted()` grep sweep surfaced.
- **State-dependent permission**: no state-dependent permission gate (e.g. "cannot edit once a sheet is
  Inactive," "cannot delete once assigned to an account") was found anywhere in the module's own files — the
  `mps_status` Active/Inactive gate (see `workflows.md`) controls pricing-engine consumption, not UI edit/delete
  permission; a sheet can be edited or (nominally) deleted regardless of its own status or account-assignment
  state. A new implementation's delete guard (verify no live account assignment still references the sheet)
  is recommended in `build-guidance.md` as a new, real guard — not a carry-forward of anything found in the
  legacy system.
- **Cross-module write with no ownership or permission check**: the `DetailViewAjax.php` finding above is, in
  effect, also an ownership-rule gap — the endpoint never checks whether the target Campaigns record has any
  relationship at all to the requesting user, the current tenant's own Pricebooklevel200 data, or any
  legitimate business context. No ownership check exists to fail; there is no check of any kind.
