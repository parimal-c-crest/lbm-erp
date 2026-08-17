# SalesOrder — Permissions

> No existing content anywhere else in this module's spec covers permissions — this file is genuine,
> fresh extraction, not a reformatting of prior work. Extracted from `blueprint/module/SalesOrder/
> 02-validation-rules.md` and `06-cross-module-integrations.md` (role/permission mentions), plus a
> direct grep of `modules/SalesOrder/*.php` and `include/utils/*.php` for `isPermitted(`,
> `getUserPrivileges`, and role-check patterns. This is a thin, honest account of what live code
> actually shows — not a fabricated detailed matrix.

## Roles

The legacy system does not define SalesOrder-specific named roles (e.g. no "SalesOrder Manager" /
"SalesOrder Clerk" role concept was found). Access control instead runs through two independent
mechanisms, both confirmed live in `modules/SalesOrder/*.php` and `include/utils/ListViewUtils.php`:

1. **The standard vtiger CRM role-privilege framework** — generic `isPermitted('SalesOrder', <action>,
   [record])` checks, where `<action>` is one of the framework's standard action names (`EditView`,
   `Delete`, `DetailView`). These gate button/link visibility for edit and delete against whatever
   role-privilege configuration is assigned to the logged-in user's role — the same mechanism every
   other vtiger-derived module in this codebase uses, not something SalesOrder defines itself.
2. **Two module-specific, setting-driven role gates**, confirmed in
   `blueprint/module/SalesOrder/02-validation-rules.md` (SO-RULE-106, SO-RULE-108 in
   business-rules-and-validation.md) and cross-referenced in `06-cross-module-integrations.md`:
   - `STOPROLESORETURN` / `STOPROLESORETURNSALE` — settings that, per the requesting user's role, set
     `allowusertoreturn` / `allowusertosaleandreturn` flags gating "Return" transaction-code entry on
     the Quick SO screen.
   - `POSROLE_LOCKTAXFORROLE` — a setting that, per role, returns a `LOCKTAXFORROLE` flag locking tax
     fields from edit.
   - `RESTRICT_USER_TO_FINALIZE_ST` (SO-RULE-107) — a setting that, per role, skips the store-transfer
     finalize sub-step entirely during finalize if the role isn't in the allowed list. This one is
     **server-side enforced** (the sub-step is genuinely skipped, not just UI-hidden) — confirmed at
     `QuickSalesOrderUtils.php:4450-4461`, consumed at `6249-6252`.

**Confirmed live `isPermitted('SalesOrder', ...)` call sites** (standard framework, action-level, not
role-specific):
- `modules/SalesOrder/DetailView.php` — `EditView` and `Delete` gates for showing the edit/delete
  buttons.
- `modules/SalesOrder/ListView.php` — `EditView` and `Delete` gates for list-row action links.
- `modules/SalesOrder/PopUpDetailView.php`, `modules/SalesOrder/accDispDetails.php` — same
  `EditView`/`Delete` pattern in popup/account-display contexts.
- `include/utils/ListViewUtils.php:4295` — `EditView` gate reused generically across list views.

No `isPermitted('SalesOrder', 'Create', ...)` call was found in the grepped files — create-time
gating, if any, was not located in this pass.

## Permission Matrix

The legacy system's actual gates are generic CRUD-shaped (`EditView` / `Delete` / `DetailView`), not
a named-role matrix. No SalesOrder-specific "Role A / Role B / Role C" breakdown exists in the source
material — filling one in here would be fabrication. What is confirmed:

| Action | Enforcement Found |
|---|---|
| Create | No SalesOrder-specific `isPermitted` gate located in the grepped entry points (`EditView.php`, `CreateQuickSalesOrder.php`). Access is presumably governed by the standard vtiger module-level create permission, not independently confirmed in this pass. |
| Read | Standard vtiger role-privilege framework (`isPermitted('SalesOrder', 'DetailView', ...)`), same mechanism as every other vtiger-derived module. |
| Update | Standard vtiger role-privilege framework (`isPermitted('SalesOrder', 'EditView', ...)`), **plus** the Finished-status lock below — Update is additionally blocked once the order reaches Finished status, independent of role. |
| Delete | Standard vtiger role-privilege framework (`isPermitted('SalesOrder', 'Delete', ...)`), **plus** the Finished-status lock below — the Delete button/action is suppressed once the order reaches Finished status, independent of role. |

Two settings-driven, role-scoped sub-permissions exist within Update (not full CRUD-level gates,
narrower in scope):
- Entering a "Return" transaction-code line item on the Quick SO screen — UI-flag only, server-side
  enforcement unconfirmed (SO-RULE-106).
- Editing tax fields on delivery-method change — UI-flag only, server-side enforcement unconfirmed
  (SO-RULE-108).
- Running the store-transfer finalize sub-step — genuinely server-side enforced (SO-RULE-107).

## Ownership / Record-Level Rules

**Confirmed state-dependent permission: an order cannot be edited or deleted once its primary status
reaches Finished.** This is the "can't edit once Finalized" restriction flagged as likely in the task
brief, and it is confirmed live in multiple places:

- `modules/SalesOrder/DetailView.php:1984` — the Delete button is shown only if
  `$focus->column_fields['sostatus'] != 'Finished'` **and** the user has `Delete` permission — both
  conditions required.
- `modules/SalesOrder/DetailView.php:1412` — record-context UI branches on
  `$focus->column_fields['sostatus'] != 'Finished'`.
- `modules/SalesOrder/EditView.php:3454` — a `$soStatusRow['sostatus'] != 'Finished'` check gates
  behavior on the edit screen.
- `QuickSalesOrderUtils.php` (SO-RULE-096, business-rules-and-validation.md) — an order already in
  Finished status is rejected outright ("already finalized" response) if a save is attempted through
  the Quick SO edit flow, rather than silently writing changes.

This is a **hard block enforced server-side for the Quick SO path** (SO-RULE-096) and a **UI-level
suppression for the standard DetailView path** (the Delete button/edit affordance is hidden, but
whether the standard EditView's own save handler independently rejects a Finished-order save was not
confirmed in this pass — flagged open, consistent with risks-and-open-questions.md's broader finding
that no confirmed server-side required-field/state enforcement exists uniformly across all save
entry points).

**No tenant-scoping or "user only sees their own records" ownership rule was found** in the grepped
material — SalesOrder records appear to be visible per the standard vtiger role/sharing-privilege
model (group/role-based record sharing), not filtered to records the current user personally created.
This module's data model does carry a tenant reference per R5 (entities-and-fields.md), but that is a
platform-level multi-tenancy concern, not a record-ownership rule within a tenant, and was not
independently re-confirmed against SalesOrder-specific code in this permissions pass.

## Known Gaps

- No SalesOrder-specific named-role definitions exist to document — the module rides on the generic
  vtiger role-privilege framework plus a handful of module-specific settings-driven flags. A fuller
  permission matrix would require confirming what the generic framework's underlying
  privilege-assignment UI actually exposes for this module, which was out of scope for this grep-only
  pass.
- Create-action enforcement was not located in the grepped files — not confirmed present or absent.
- Whether the standard (non-Quick) EditView save path independently enforces the Finished-status edit
  lock server-side, or relies solely on the Delete-button/UI suppression, was not confirmed.
- SO-RULE-106/SO-RULE-108's role-scoped Return/tax-edit restrictions were confirmed only as UI-level
  flags — server-side enforcement was not traced anywhere in this pass, consistent with the same open
  item already flagged in risks-and-open-questions.md and business-rules-and-validation.md.
