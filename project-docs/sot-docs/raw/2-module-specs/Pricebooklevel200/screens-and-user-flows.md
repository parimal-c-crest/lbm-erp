# Pricebooklevel200 — Screens & User Flows

> Views, fields, interactions, states. No component library or framework assumption.

Source: `docs_from_blueprint/module/Pricebooklevel200/08-screens-and-user-flows.md`, inferred (not directly
documented by the source blueprint's own extraction passes, which cataloged entry points/functions, not screen
layouts) from `blueprint/module/Pricebooklevel200/00-pass0-inventory.md`, `01-entities-fields.md`,
`02-validation-rules.md`, `03-status-lifecycle.md`, `04-financial-pricing.md`, `05-outputs-documents.md`, and
`06-cross-module-integrations.md` — expressed as views/fields/interactions/states rather than any specific UI
framework or component library, matching the inference method the `SalesOrder` pilot module's own equivalent
document established.

## Screen Inventory

| Screen | Purpose |
|---|---|
| List view | A filterable, paginated, sortable grid of price sheets, with an export-to-file action (`outputs.md` — CSV Export). |
| Detail view (read-only) | Displays a price sheet's header fields, its rule-list grid, and (implied by the module's own account-apply flow) which accounts it is currently assigned to. |
| Edit/create view | The full create/edit screen for a price sheet's header fields: name, description, effective dates, active/inactive status, master-account scoping, job scoping, item-specific/price-off configuration, and display-fields configuration (see `entities-and-fields.md` §Price Sheet header). |
| Rule-list grid | The module's real, primary working surface: a paginated grid of a price sheet's own rules, each showing its 7 scope-dimension values (resolved to human-readable labels), net price, and GP figures, with inline add/edit/delete of individual rule rows (`outputs.md` Output "Rule-list grid"; rules PBL200-RULE-007/008/019/020 describe the inline-edit posting mechanism). |
| GP color-code settings screen/popup | A dedicated interaction for viewing/editing the fixed 5-level GP%-range-to-color mapping, with a "keep the 5 ranges contiguous and sum to 100%" cascading-recalculation behavior confirmed as real, working business logic (rules PBL200-RULE-025 to 028). |
| "Apply to accounts" picker screen | A dedicated screen for assigning one or more price sheets to one or more accounts, partitioning accounts into "already has this sheet" vs. "does not" (rules PBL200-RULE-029 to 033). |
| Second, independently-reachable account-assignment popup | Materially different (overwrite/clear, rather than append/diff) semantics than the picker screen above — a confirmed data-integrity risk when both are used against the same account (rule PBL200-RULE-035). |
| "Duplicate rule to another price book" affordance | Implied by the module's own file naming and UI strings, but **confirmed non-functional**: the underlying feature references a module/table that no longer exists (rules PBL200-RULE-015/016/023/024). A new implementation should not assume this affordance currently works, if it is still exposed in the legacy UI at all. |
| "Copy this price sheet to accounts" action | Clones a price sheet (and all its rules) into new, per-target-account sheets — confirmed one of the module's own cleanest, most-correctly-implemented write paths (rule PBL200-RULE-040). |
| Job-integration flow | A job-scoped variant of price-sheet creation, reachable from a job-record context, optionally auto-seeding the new sheet's rules from an existing sales order's own line items (`integrations.md`). |
| "Email this price sheet" action | A client-side trigger for emailing the Master Price Sheet PDF to a customer; its own server-side handler was not located as a distinct file in this module's own directory in the source blueprint. |
| Document generation/print actions | The Master Price Sheet PDF print/email action and the CSV export action, both read-only against the sheet's current server-stored state. |

## Flows

<!-- Per flow: entry point, steps, decision points, exit/success state -->

**Price sheet create/edit flow**: entry from list view "New" or detail-view "Edit" → header fields (name,
description, dates, status, master account, job, item-specific/price-off, display-fields) → save. Decision
point: whether the sheet is item-specific (drives whether the location-base-price fallback is even reachable at
pricing time, see `calculations.md`). Exit: saved header row; no client-visible confirmation of the (currently
unimplemented) duplicate-name check (rule PBL200-RULE-018).

**Rule-row edit flow**: entry from the rule-list grid on a price sheet's detail view → inline add/edit of a
rule row's 7 scope dimensions, net price, GP → posts to either the main save action's rule-update block or the
second, independently-reachable ajax endpoint (rules PBL200-RULE-007/008/019/020 — both mechanisms are
unvalidated/unparameterized). Exit: rule row persisted; GP-recalculation helper re-invoked if net price changed
(rule PBL200-RULE-009).

**GP color-code settings flow**: entry from a dedicated popup → edit one level's own upper bound → cascading
recalculation of every higher-numbered level's own bounds to keep the 5 ranges contiguous (rule
PBL200-RULE-028, a real working guard) → save (rules PBL200-RULE-025/027, fully parameterized).

**Account-assignment flow (two divergent paths)**: (a) "Apply to accounts" picker — partitions accounts into
already-assigned/not-assigned, add/remove with append/diff semantics (rules PBL200-RULE-029 to 033); (b) a
second, independently-reachable popup with overwrite/clear semantics (rule PBL200-RULE-034/035). Using both
against the same account is a confirmed data-integrity risk (rule PBL200-RULE-035) — a new implementation
should present this as one consistent interaction, not two.

**Delete flow**: entry from list view or detail view "Delete" → standard delete action → **confirmed to target
the wrong entity in the legacy system** (rule PBL200-RULE-014), most likely meaning price sheets cannot
actually be deleted through this action at all today. A new implementation's delete interaction should present
a real, working delete, guarded against deleting a sheet still assigned to any account.

**Job-scoped creation/seed flow**: entry from a job record → job-scoped price-sheet create/reuse check
(rule PBL200-RULE-036) → optional auto-seed of the new sheet's rules from an existing sales order's own line
items (rule PBL200-RULE-038, a 6-table join spanning three modules).

## States

<!-- Loading, empty, error, no-permission, read-only, etc — per screen if they differ -->

- **Sheet-level state**: active/inactive status (a real, live pricing gate, see `workflows.md`), effective
  start/end dates (captured but not confirmed enforced as a pricing gate), soft-delete state.
- **Rule-level state**: which of the 7 scope dimensions are populated (drives the specificity score a rule
  competes on at pricing time, see `calculations.md`), soft-delete state (legacy deletion is bulk, by parent
  sheet, not per-rule).
- **Pricing-resolution state, surfaced indirectly through the sale-line pricing flow rather than this module's
  own screens**: whether a line's price came from a directly-set net price, the GP-based fallback formula, or
  no match at all — the source blueprint confirms the legacy system currently drops a zero-resolved price
  silently rather than distinguishing "resolved to zero" from "no rule matched" (see `calculations.md`); a new
  implementation's own screens (wherever pricing-resolution outcomes are surfaced, e.g. a sale-line
  pricing-detail view) should make this distinction visible rather than repeating the silent-drop behavior.
- **Validation/error states**: hard-blocked actions should surface clear, specific error messaging tied to the
  blocking rule — the legacy system's own "duplicate name" check is confirmed unimplemented despite its own
  naming (rule PBL200-RULE-018), a gap a new implementation should close with a real, working check rather than
  silently carrying the legacy no-op forward.
- **No-permission state**: the wrong-entity-class ajax endpoint (`DetailViewAjax.php`) is reachable with **no
  permission check of its own** (see `permissions.md`) — a new implementation's equivalent inline-edit surface,
  if any legitimate one exists, must gate on the correct module's own permissions, not silently omit the check.

## A note on the module's own confirmed-dead/wrong-class affordances

Per `business-rules-and-validation.md` and `risks-and-open-questions.md`, several of the legacy UI affordances
this module exposes do not work as their own naming/labeling implies (the delete action, the "duplicate rule"
feature, the "check duplicate name" endpoint) or reach into an unrelated module's data entirely (the
Campaigns-leftover files, see `integrations.md`). This spec does not assume any of these current UI affordances
should be reproduced as-is in a new implementation's own screen design — each is carried forward elsewhere in
this spec as a specific, cited finding, for a deliberate build-vs-drop decision rather than a silent
carry-forward.
