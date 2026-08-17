# PurchaseLineItem — Permissions

> Unlike the other files in this spec, this file has no direct 1:1 source in
> `docs_from_blueprint/module/PurchaseLineItem/` — permissions were not a dedicated topic in the source
> blueprint. This is genuine extraction work: derived from `blueprint/module/PurchaseLineItem/
> 02-validation-rules.md` and `06-cross-module-integrations.md` (no role-specific findings in either) plus
> a direct grep of `modules/PurchaseLineItem/` for `isPermitted(` calls, cross-checked against the actual
> PHP source. Kept deliberately thin — see Applicability below. Same pattern as SearchLineItem/
> PurchaseHistory: the read-model reality is stated honestly rather than padded with an invented role
> matrix.

## Applicability

**Genuinely thin, by design, not by omission.** PurchaseLineItem is a confirmed vestigial read-model (see
`module-overview.md`, `screens-and-user-flows.md` §"A read-model with a vestigial, largely non-functional
write surface"): six independent real writers live in PurchaseOrder, Receiving, and POReconciliation; this
module's own `Save.php`/`EditView.php` write path has no confirmed live UI caller anywhere in the
codebase, and its one other write endpoint (`DetailViewAjax.php`) is confirmed broken (see
`business-rules-and-validation.md` PLI-RULE-010 — it never actually reaches a PurchaseLineItem row). The
question this file can honestly answer is **who can VIEW this module's data** through its own list/detail
views. The question of **who can WRITE purchase-line data** is not a PurchaseLineItem question at all — it
belongs entirely to PurchaseOrder (and secondarily Receiving/POReconciliation), whose own module specs are
the correct place to document create/edit/delete permissions for the events that actually produce these
rows.

### What was found in the legacy code

A direct grep of `modules/PurchaseLineItem/` for `isPermitted(` found four call sites, all gating
UI-affordance visibility, not actually blocking a data operation at the point where it runs:

- `DetailView.php:47` — `isPermitted("PurchaseLineItem", "EditView", $_REQUEST['record'])` — gates whether
  the Detail View's Edit/Duplicate button is rendered.
- `DetailView.php:50` — `isPermitted("PurchaseLineItem", "Delete", $_REQUEST['record'])` — gates whether
  the Detail View's Delete button is rendered.
- `DetailView.php:111` — `isPermitted($currentModule, 'EditView', $_REQUEST[record])` — assigned to the
  smarty template as an `EDIT_PERMISSION` flag, for the same inline-edit affordance that
  PLI-RULE-010/PLI-RISK-002 documents as broken (wrong entity class).
- `ListView.php:126` / `ListView.php:130` — `isPermitted('PurchaseLineItem', 'Delete', '')` /
  `isPermitted('PurchaseLineItem', 'EditView', '')` — gate whether the List View's bulk Delete/Edit action
  controls are rendered.

All four calls route through the shared, generic vtiger permission-checking function (module name +
action name + optional record id), the same mechanism used across every other module in this codebase.
No PurchaseLineItem-specific role, profile, or permission-matrix logic exists anywhere in the module's own
files — no role name is ever referenced by name in `modules/PurchaseLineItem/`. The underlying
role/profile permission model itself (how a profile is assigned "EditView"/"Delete" rights for a module in
the first place) lives entirely in the shared vtiger permission framework, out of this module's own scope,
and was not independently re-derived in the source blueprint or in this extraction pass.

**This means the permission checks found are UI-affordance gates on a write surface that, per the risk
register, either has no confirmed live caller (`Save.php`/`EditView.php`) or is confirmed broken
(`DetailViewAjax.php`, per PLI-RISK-002)** — a real permission check protecting a door that, in the create/
edit case, no confirmed user opens, and in the inline-edit case, doesn't actually lead anywhere near a
PurchaseLineItem row even when opened.

## Roles

No PurchaseLineItem-specific roles exist. Access is governed entirely by the shared, generic vtiger
profile/role permission system (module name + action, e.g. "EditView", "Delete") — the same framework
every other module in this codebase uses. No role name specific to purchasing/receiving/reporting staff
was found referenced anywhere in this module's own files.

## Permission Matrix

| Action | Legacy gate found | Notes |
|---|---|---|
| View (List/Detail) | No explicit `isPermitted()` gate found in `ListView.php`/`DetailView.php` for the view action itself — access control for reaching the view at all is presumed to be enforced upstream by the shared module-access/routing layer, not independently re-derived in this module's own files. | The genuinely live capability — this is what the module's actual read-model consumers (reporting/accounting/management staff, per `module-overview.md`) use. |
| Create | No confirmed live UI path reaches `Save.php` at all (per `business-rules-and-validation.md` PLI-RULE-001/PLI-RULE-003). No `isPermitted("PurchaseLineItem", "EditView", ...)`-gated create affordance was found wired to a working save. | Not a real question for this module — the real create-permission question belongs to PurchaseOrder/Receiving, whose own actions actually produce these rows. |
| Update (form-based) | `isPermitted("PurchaseLineItem", "EditView", ...)` gates the Edit button's visibility on Detail View, but the underlying save path has no confirmed live caller. | Same caveat as Create — the button can be gated, but nothing confirmed reaches the save behind it. |
| Update (inline-edit) | `isPermitted($currentModule, 'EditView', ...)` gates the `EDIT_PERMISSION` flag consumed by the inline-edit affordance, but the endpoint behind it (`DetailViewAjax.php`) is confirmed to instantiate the wrong entity class (PLI-RULE-010) — the permission check, even when it passes, protects an operation that never reaches a PurchaseLineItem row. | The permission gate is real; what it gates is broken. Not this file's finding to fix — see `business-rules-and-validation.md`/`risks-and-open-questions.md`. |
| Delete | `isPermitted("PurchaseLineItem", "Delete", ...)` gates both the Detail View and List View delete affordances; the delete itself, once triggered, is confirmed to route through the generic, shared, parameterized `DeleteEntity()` helper (PLI-RULE-008) — a genuinely live, working path. | The one write-adjacent action in this module with both a real permission gate and a confirmed-working implementation behind it. |

## Ownership / Record-Level Rules

No PurchaseLineItem-specific ownership or record-level (tenant-scoped, "own records only",
state-dependent) permission logic was found in the module's own files beyond the generic `smownerid` /
`smcreatorid` audit columns present on every row (see `entities-and-fields.md`). Whether the shared vtiger
permission framework applies any record-ownership filtering on top of the module-level
`isPermitted()` checks above (e.g. restricting List View results to a user's own records, or applying
sharing rules) was not independently re-derived in the source blueprint or in this extraction pass — this
is shared-framework behavior, out of this module's own scope, the same boundary drawn throughout this
documentation series (see `_deviations-from-original-template.md` for the discipline governing this).

## Open Questions

- Whether the shared vtiger role/profile framework applies any record-level sharing rules on top of the
  module-level checks documented above — not independently re-derived here.
- Whether any role is actually granted "EditView"/"Delete" rights on the PurchaseLineItem module in the
  live system's profile configuration (as opposed to the code-level gate existing) — profile/role
  configuration data was not queried in this extraction pass.
- Given the write-side reality documented in `risks-and-open-questions.md` (PLI-RISK-002), whether a new
  implementation should even expose a form-based Create/Update permission for this module at all, versus
  making the module read-only-by-permission-model entirely and relegating all write permissioning to
  PurchaseOrder/Receiving/POReconciliation's own specs — flagged as a design decision, not resolved here.
