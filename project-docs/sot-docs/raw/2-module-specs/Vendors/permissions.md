# Vendors — Permissions

> This file has no content in any of the other 17 modules specified before this template existed —
> permissions is net-new extraction work per module, not a reformatting exercise (see
> `_deviations-from-original-template.md`). What follows is a genuine but thin extraction: the source
> blueprint material was not framed around permissions, so this file reconstructs what it can from direct
> code (`isPermitted(` call sites in `modules/Vendors/*.php`) plus one explicit negative finding already on
> record in the source material. Nothing below is invented past what these two sources support.

## Applicability

Applies, narrowly. Vendors has **no Vendors-specific role or permission concept** beyond the generic
module-level CRUD permission checks every entity in the underlying CRM framework gets
(`docs_from_blueprint/module/Vendors/08-screens-and-user-flows.md` §8.3: "none of the [48] rules document a
confirmed role/permission gate specific to Vendors beyond the standard module-permission checks every CRM
entity has ... no analogous Vendors-specific role restriction was surfaced by any pass" — in explicit
contrast to SalesOrder's own role-gated return/tax-editing findings). This file documents that generic
permission surface plus the module's genuine ownership/scoping defects, since the deviations addendum
treats those as directly relevant to permissions even where the source material doesn't frame them as a
role check.

## Roles

No Vendors-specific roles are defined or referenced anywhere in the module's own code or in any source
blueprint pass. Access is governed entirely by the underlying CRM framework's generic role/profile
permission system (assigning module-level Create/Read/Edit/Delete/Export capability per role) — the same
mechanism every module in this CRM fork uses, not something Vendors itself configures or extends.

## Permission Matrix

Grepping `modules/Vendors/*.php` for `isPermitted(` (Legacy Trace: `d:/wamp64_www/lbm-integer/modules/Vendors/`)
finds four call sites, confirming which actions are gated and which are not:

| Action | Confirmed gate | Legacy Trace |
|---|---|---|
| Read / List | Generic module-level `EditView` permission is checked to decide whether the edit link/action is offered on the detail view; no separate read-gate call site was found — list/detail rendering itself relies on the framework's generic module-access check, not traced to a Vendors-specific `isPermitted(` call. | `DetailView.php:181` (`EDIT_PERMISSION` assignment, gates UI affordance only) |
| Create | No `isPermitted(` call found gating vendor creation specifically — relies on the framework's generic module-level Create permission (Save.php itself performs no permission check of its own; see `business-rules-and-validation.md` VEN-RULE-001, VEN-RULE-014). | Not found in `Save.php` |
| Update | `isPermitted("Vendors", "VendorEditView", $_REQUEST['record'])` gates the edit action from the detail view. A second, generic `isPermitted($currentModule, 'EditView', ...)` call assigns a template variable controlling whether edit affordances render. **Neither `Save.php` (full-form save) nor `DetailViewAjax.php` (inline-edit endpoint) itself calls `isPermitted(` before performing the write** — both writes rely entirely on whatever permission check happens further up the request-dispatch chain (not traced in this pass). | `DetailView.php:156`, `DetailView.php:181` |
| Delete | `isPermitted("Vendors", "DeleteVendor", $_REQUEST['record'])` gates the delete action from the detail view; `isPermitted('Vendors', 'DeleteVendor', '')` gates it from the list view. `Delete.php` itself performs no `isPermitted(` call — same reliance on upstream dispatch-chain enforcement as Update. | `DetailView.php:158`, `ListView.php:151` |

**Open item, consistent with `risks-and-open-questions.md` VEN-OQ-022**: whether any of the confirmed
`isPermitted(` gates above sit in front of the actual save/delete request handlers (`Save.php`,
`DetailViewAjax.php`, `Delete.php`), or only gate whether a UI link/button is rendered, was not traced end
to end in this pass — the four call sites found are all in `DetailView.php`/`ListView.php` (view-rendering
files), not in the handler files themselves. This is the same limitation the source risk-verification pass
flagged for every confirmed SQL-injection finding in this module: query construction is confirmed
vulnerable at the handler level regardless of what UI-level permission gating exists in front of it.

## Ownership / Record-Level Rules

No tenant-scoped or per-user "only see your own records" concept applies to Vendors — vendor records are
shared organization-wide master data, not user-owned. No state-dependent permission (e.g. "can't edit once
Finalized") applies either, since Vendors has no Active/Inactive or approval-style status field at all (see
`workflows.md` §Applicability).

The module does, however, have two **confirmed authorization/ownership-boundary defects** that are directly
relevant here even though the source material never frames them as a "permission" finding:

- **Line Code Description cross-vendor write (VEN-RISK-001 / VEN-RULE-025)**: the update that changes a
  vendor's line-code description has no vendor-scoping in its `WHERE` clause at all, so a user with
  legitimate edit permission on their own assigned vendor's line-code screen silently overwrites the same
  description for every *other* vendor sharing that line-code number — including vendors the editing user
  may have no assigned access to. This is a scoping/authorization-boundary failure, not merely a data-model
  bug: the write crosses an ownership boundary the UI implies exists (a per-vendor edit screen) but the
  underlying command does not enforce.
- **Physical-address cross-vendor edit (VEN-RULE-033)**: the physical-address update endpoint has no check
  that the submitted address id actually belongs to the vendor implied by the current UI context — it
  matches purely on the address id. Any caller who can guess/enumerate another vendor's address id can edit
  it through this endpoint, an IDOR-shaped gap: correct module-level Edit permission is necessary but not
  sufficient, since the endpoint does not re-verify that the specific address row belongs to a vendor the
  caller is scoped to.

Both are documented in full in `risks-and-open-questions.md` (VEN-RISK-001, VEN-RISK-018) and
`business-rules-and-validation.md` (VEN-RULE-025, VEN-RULE-033); repeated here because they are, in effect,
this module's only real record-level ownership findings — the source material never surfaced a positive
"users only see their own vendors" rule, only these two confirmed negative findings where an ownership
boundary the UI implies is not actually enforced by the underlying write.
