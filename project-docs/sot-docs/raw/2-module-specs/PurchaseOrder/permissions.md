# PurchaseOrder — Permissions

> Genuine net-new extraction for this spec. The source blueprint
> (`docs_from_blueprint/module/PurchaseOrder/`, `blueprint/module/PurchaseOrder/`) does not catalogue
> permissions at all — this file is built directly against the live `modules/PurchaseOrder/` source
> tree (`grep -n "isPermitted(" modules/PurchaseOrder/*.php`) plus the one role mention surfaced in
> the validation-rules blueprint pass (`blueprint/module/PurchaseOrder/02-validation-rules.md`,
> PO-VAL-023 / PO-RULE-023). This is deliberately a thin, honest extraction, not a reconstructed full
> permission model the source evidence doesn't support.

## Applicability

Applies partially. The legacy vtiger platform has a generic role/profile permission framework
(`isPermitted()`), and PurchaseOrder's own code calls into it in a handful of places — but the module
does **not** implement a PurchaseOrder-specific permission model beyond the generic
module-action-record triple vtiger provides everywhere. No PurchaseOrder-specific role definitions,
custom permission types, or record-ownership rules beyond the generic framework were found in the
files read for this pass.

## Roles

No PurchaseOrder-specific roles are defined in the module itself. Permission checks route through
the generic vtiger role/profile framework (`isPermitted($module, $action, $recordId)`), which is
configured platform-wide, not per-module. The only PurchaseOrder-specific role reference found is the
client-side-only restriction in PO-RULE-023 (business-rules-and-validation.md): "a user cannot use a
saved PO Type in a template unless their role is authorized for it"
(`PurchaseOrder.js:265`, `'Your Role is not autorized for saved PO Type in template...'`) — which
role(s) qualify is not resolved from the client-side check alone; no server-side enforcement of this
restriction was found.

## Permission Matrix

Confirmed `isPermitted()` call sites found directly in `modules/PurchaseOrder/*.php` (grep, this
pass):

| File:Line | Module Checked | Action Checked | Scope |
|---|---|---|---|
| `ListView.php:217` | PurchaseOrder | Delete | List-view row action visibility |
| `ListView.php:221` | PurchaseOrder | EditView | List-view row action visibility |
| `DetailView.php:194` | PurchaseOrder | EditView | Gates the Edit action on a specific record (`$_REQUEST['record']`) |
| `DetailView.php:199` | PurchaseOrder | Delete | Gates the Delete action on a specific record (`$_REQUEST['record']`) |
| `DetailView.php:217` | (current module, dynamic) | EditView | Assigned to the Smarty template as `EDIT_PERMISSION`, drives detail-view edit affordance |
| `EditView.php:511` | Products | EditView | Cross-module check — gates a Products-related affordance surfaced on the PO edit screen |
| `PrePOEditView.php:872` | Kits | ListView | Cross-module check — gates kit-related visibility on the pre-edit/suggested-PO screen |
| `PrePOEditView.php:896` | Products | EditView | Cross-module check — gates a Products-related affordance on the pre-edit screen |
| `POlineItems.php:434` | Products | EditView | Cross-module check — gates a Products-related affordance in the line-items ajax handler |
| `showSalesHistory.php:215` | Products | EditView | Cross-module check — gates a Products-related affordance on the SalesHistory-read screen |

| Action | PurchaseOrder record actions (generic role/profile) |
|---|---|
| Create | Not gated by an explicit `isPermitted()` call found in `Save.php` (the module's single create/edit mutation point) — no confirmed permission check on PO creation itself. |
| Read | Not gated by an explicit `isPermitted()` call found in `DetailView.php`'s own record load (the `EditView`/`Delete` checks at lines 194/199 gate *actions available from* the detail view, not the read itself). |
| Update | `DetailView.php:194`, `ListView.php:221` (both `EditView` action, record-scoped on Detail view). No confirmed check in `Save.php` itself. |
| Delete | `DetailView.php:199`, `ListView.php:217` (both `Delete` action, record-scoped on Detail view). `Delete.php` itself (the actual delete endpoint) was not found to contain an `isPermitted()` call in this pass — its only confirmed guard is the status-based PO-RULE-017 block, not an authorization check. |

**Confirmed gap adjacent to the module's worst security finding**: direct reads of
`modules/PurchaseOrder/CalcTotal.php` (host of PO-RISK-001, the Critical SQL-injection where the
column name itself is built from raw request input) and `modules/PurchaseOrder/setPPDValues.php`
(host of PO-RISK-002, the unparameterized cross-module write into Vendors) for this pass found **no
`isPermitted()` call, and no other session/role/CSRF check, in either file**. Both are reachable ajax
endpoints hit on routine PO operations (a line-item total update, a PPD value change) with no
authorization gate found at all — not merely a SQL-injection risk but an access-control gap on the
same endpoints. This is a genuine finding of this extraction pass, not carried forward from the
blueprint (which did not check for authorization gates). See risks-and-open-questions.md
PO-RISK-001/PO-RISK-002 and integrations.md "The Vendors write path in detail" for the corresponding
security framing.

## Ownership / Record-Level Rules

No PurchaseOrder-specific record-ownership or tenant-scoping rule beyond the generic vtiger
role/profile/sharing-rule framework was found in the files read for this pass. The one confirmed
state-dependent restriction is PO-RULE-017 (business-rules-and-validation.md): a PO cannot be deleted
once it has reached a "committed" status (`reconciled='0' AND postatus IN (...)`) — this is a status
guard, not a permission/ownership rule, and is enforced server-side in `Delete.php:14` independent of
any `isPermitted()` check.

## Known Gaps

- **This file's scope is limited to what `isPermitted()` grep hits and the one PO-RULE-023 role
  mention actually show.** No claim is made here about the full vtiger role/profile configuration
  (which roles exist, what module-action grants each role/profile has) — that configuration lives in
  platform-wide tables (`vtiger_role`, `vtiger_profile2field`, etc.) outside this module's own code
  and was not read for this pass.
- **`Save.php` (PO create/edit) and `Delete.php` (PO delete) were not found to contain their own
  `isPermitted()` calls** in this pass — `Delete.php`'s only confirmed guard is the PO-RULE-017
  status check, not an authorization check; whether an authorization check happens further upstream
  (e.g. at a router/dispatch layer not read in this pass) was not confirmed either way.
- **`CalcTotal.php` and `setPPDValues.php` — the two files hosting the module's Critical
  SQL-injection findings — have no authorization gate found at all**, per the direct check performed
  for this pass. This is flagged as a security/permissions cross-cutting gap, not resolved here.
- **PO-RULE-023's role-authorization for PO-Type-in-template usage** is confirmed client-side only
  (`PurchaseOrder.js:265`); which specific role(s) are authorized, and whether any server-side mirror
  exists, was not resolved in this pass.
