# Settings — Workflows

> Keep this file even if this module has no lifecycle/state behavior — state that explicitly below
> rather than deleting the file. See `_deviations-from-original-template.md` in this folder.

Source: `docs_from_blueprint/module/Settings/04-status-workflow.md`, itself sourced from
`blueprint/module/Settings/03-status-lifecycle.md` ("Pass 3 — Settings Status/Lifecycle"), built on
Pass 2's 209-rule validation catalog and targeted live-database confirmation queries (read-only
`DESCRIBE`/`SELECT`/`GROUP BY`, no writes performed).

## Applicability

Partially applicable — with an important qualification. Settings has no single owned business entity
and therefore no one status/lifecycle to document the way SalesOrder has one central order-status
field. The source investigated **seven specific areas flagged as plausible lifecycle-shaped concepts**
(Company Profile, Role/Profile assignment, Module Manager Delete/Restore, Integration enable/disable
toggles, Backup Schedule/Audit Trail toggle, Currency Base-currency status, and VDP Tier ordering) and
reports, area by area, what was actually found rather than inventing one unifying lifecycle the source
material does not support. Of the seven areas:

- **Three have genuine, transition-table-worthy state-machine content**: Module Manager Delete/Restore
  (§ below — the module's central, most consequential finding), VDP Tier ordering, and Currency
  Base-currency reassignment.
- **Two are real but structurally thin** — a narrow create/edit/delete cycle or a plain on/off toggle,
  not a multi-state machine: Company Profile and the Audit Trail toggle.
- **One is correctly deferred to the Users module's own documentation** rather than re-derived:
  Role/Profile lifecycle, with one Settings-specific addition (an orphaned-Profile side effect).
- **One resolved to a confirmed absence of the hypothesized lifecycle**: "Backup Schedule" — no
  schedule concept exists anywhere in Settings, only an on/off kill-switch and an on-demand trigger.
  "Integration enable/disable" similarly resolved to a confirmed **absence** of a hypothesized third
  state ("configured-but-unverified"), not a discovery of one.

## States

### Module Manager Delete/Restore (the module's central state machine)

| State | Meaning | How a record gets here |
|---|---|---|
| **Active** | Not deleted; row(s) present in every backing table | Normal record creation, or a successful Restore from Soft-Deleted |
| **Soft-Deleted** | A `deleted` flag is set; row(s) still physically present in every backing table | The ordinary per-module Delete action (outside Module Manager — out of this module's own scope, but the state's reachability is presupposed by the "delete all soft-deleted records" convenience mode's own filter) |
| **Hard-Deleted (Purged)** | Row(s) physically absent from every table the module's entity registers | Module Manager's Delete action — a true physical delete run once per backing table, with **no soft-delete flag involved at all** |
| **Restore-Attempted, Still Gone** | Same as Hard-Deleted (row still physically absent), but the operator has been shown a false success message | Running Module Manager's Restore action against ids that are already Hard-Deleted |

### Currency Base-currency status

States are implicit in the transition table below (Base / not-Base per currency row; exactly one row
should be Base).

### VDP Tier ordering

States are implicit in the transition table below (sequential Level N per plan, 1 through 6 max).

### Company Profile

No active/inactive or default-profile flag exists on the profile row itself — a live schema read
confirmed the Company Profile table (`fuse5_companyprofiles`) has no status/active/default column of
any kind. A company profile has no business-level active/inactive state, and no "this is the org's
currently-active profile" pointer lives on the profile row itself.

### Integration enable/disable

Two entirely separate toggle-shaped mechanisms per integration, never cross-checked against each
other, neither alone producing more than two states:
- **Mechanism A — the credential store** (a dedicated config table per integration): saving
  credentials is inconsistently gated (see `business-rules-and-validation.md` SET-RULE-106–109) — some
  integrations require a live connectivity check before persisting (two reachable states: no
  credentials saved / credentials saved, known-good at save time); one has no connectivity check at
  all (one meaningful state: credentials saved, verification status permanently unknown); a group of
  payment gateways expose a decoupled "test connection" action whose result is never persisted.
- **Mechanism B — a separate ON/OFF feature-flag table** (`vtiger_supportedfield`), entirely
  independent of whichever credential table an integration uses, written through the module's generic,
  schema-blind fallback save path (zero validation of value domain). This write path has **no
  reference back to the credential table at all**.

**Net finding**: enabling an integration is a raw toggle, not validated against the
credential-configuration state in any way. A hypothesized third "configured-but-not-verified" state is
**architecturally absent**, not merely unobserved — no column, flag, or code path anywhere in this
module's scope could hold such a value even if the system wanted to.

### Audit Trail toggle

Exactly two states: audit logging system-wide ON or OFF, gated by a single boolean checked once per
request before any audit-trail row write is attempted.

### Backup

No schedule concept exists — investigated and found absent. "Enable Backup" is a flat on/off toggle
that rewrites a PHP configuration source file on disk in place, not a database row. The on-demand
backup trigger runs a synchronous, immediate table-by-table dump with no cron/schedule artifact found
anywhere in this module.

## Transitions

### Module Manager Delete/Restore

| From | To | Trigger | Guard Condition | Side Effects |
|---|---|---|---|---|
| Active | Soft-Deleted | Ordinary per-module Delete action (outside this module) | Not traced within this module's own scope | None confirmed within this module's scope |
| Soft-Deleted | Active | Module Manager Restore, run while the row(s) still physically exist | None — unconditional flag-flip, no re-check of any kind | Products gets both its custom-field table and its main table flag-flipped; every other module: only the shared entity-metadata table's flag is flipped — **incomplete for any module whose entity registers more than one custom-field/detail table beyond that shared table** (structurally likely, not verified per-module) |
| Soft-Deleted (or, per the blueprint's read, potentially Active too — no state filter was found gating a manually-supplied id list) | Hard-Deleted (Purged) | Module Manager Delete, any record id(s) supplied | **None** — no check that target rows are already soft-deleted, no confirmation step, no soft-delete fallback | Physical row removal across every table the module's entity registers |
| Hard-Deleted (Purged) | Hard-Deleted (Purged) — **no actual transition occurs** | Module Manager Restore, run against already-Hard-Deleted ids | The update clause structurally cannot match rows that no longer exist — not a guard that blocks the action, it is the reason the action silently does nothing | **False-positive success**: the tool reports a non-zero "records restored" count regardless of actual affected-row count — the operator is told the restore succeeded while the data remains permanently gone |

**Net finding**: unlike a normal soft-delete/restore pair (Active ⇄ Soft-Deleted, fully reversible),
Module Manager implements two independently-designed halves of what looks like one feature but isn't —
this is the tool's central designed behavior, confirmed by full reads of both actions' implementations,
not a documentation gap or edge case.

### Currency Base-currency status

| From | To | Trigger | Guard Condition | Side Effects |
|---|---|---|---|---|
| *(tenant provisioning)* | Base (one row) | One-time bulk update at tenant setup | None found | Sets exactly one row to Base |
| Base (currency A) | Base (currency B), A demoted | Organization Details / Company Profile edit-form save, base-currency selection present and different from the current Base id | The submitted selection is non-empty and differs from the current Base id — otherwise the whole reassignment block is skipped | New Base's conversion rate reset to a fixed baseline; old Base's rate left as-is; a cached session copy of the Base-currency record is refreshed |
| Any currency row (Base or non-Base) | Deleted | Currency delete action, any currency id | **None** — no Base-currency check, no reference/dependency check | None — no reassignment despite the delete-confirmation UI implying one |

**Important correction preserved from the source**: this Base-currency reassignment mechanism lives in
the Organization Details / Company Profile edit-form's **edit** branch, not a one-time provisioning
script as an earlier pass characterized it — it runs on every save of that form where the base-currency
selection differs from the current Base id, not only at tenant setup. An operator editing something
unrelated (e.g. the organization's address) would also silently reassign the Base currency if the
base-currency selection field happened to be present and different in that same form submission.

### VDP Tier ordering

| From | To | Trigger | Guard Condition | Side Effects |
|---|---|---|---|---|
| *(no tiers for this plan)* | Level 1 created | Create action, no existing tier row for the plan | None (first-tier branch has no cap check) | Relies on an unassigned variable's language-level null-coercion to produce the "correct" level/starting-price values |
| Level N exists (highest) | Level N+1 appended | Create action, existing tier row found | Current highest level is below the cap of 6 (else rejected) | Prior top tier's upper price boundary updated; new tier's boundary set to an open-ended upper bound (see `calculations.md` for the associated rebate-zeroing bug) |
| Any tier (not the lowest) | Deleted | Delete action | **None** — no referential check, no confirmation | Nearest lower tier's upper price boundary absorbs the deleted tier's range; **level sequence not renumbered**, leaving a permanent gap for every tier above the deleted one |
| Level 1 (lowest) | Deleted | Delete action | None | **No reabsorption occurs at all** (no tier below to absorb into) — the price range the deleted tier covered is orphaned |

## State Diagram

Module Manager Delete/Restore (the module's central, and only genuinely reversible-by-name-but-not-in-
practice, state machine):

```
Active ──(external module Delete)──> Soft-Deleted ──(Module Manager Restore)──> Active
Active ──(Module Manager Delete, no state check)──> Hard-Deleted (Purged)
Soft-Deleted ──(Module Manager Delete, no state check)──> Hard-Deleted (Purged)
Hard-Deleted (Purged) ──(Module Manager Restore)──> Hard-Deleted (Purged)  [reports false success]
```

## Role/Profile lifecycle — deferred to Users module

The blueprint's own instructions direct this module's own Pass 3 **not** to re-derive the Users
module's own status-lifecycle documentation of Role/Profile assignment (whether a role/profile change
takes effect immediately) — that question belongs to the Users module's own tech-agnostic spec. What
Settings' own investigation adds, specific to this module's files: the Role-edit orphan-profile bug
(see `business-rules-and-validation.md` SET-RULE-031, and `risks-and-open-questions.md` R2) is not
itself a Role-status transition, but it produces a genuine "born but never attached" terminal state —
**not for the Role, but for a Profile**. Every time an admin edits an existing role's permissions
through the Settings Role-save action, that action unconditionally runs its full create-a-new-profile
machinery, and because the branch that would wire the new profile to the actual role being edited is
dead code, that freshly-built Profile is **permanently created and never attached to any Role,
forever**. The Role being edited itself is never left in a stuck or half-created state; the risk is
entirely borne by an ever-growing, invisible population of orphaned Profile rows.

## Required resolution for a new implementation

Per the module's own bug finding (not an invented architectural requirement): a new implementation must
not reproduce Module Manager Delete and Restore as two independently maintained code paths whose
inverse relationship is only asserted by naming and UI placement. Whatever a new implementation's
equivalent of "purge a record" and "undo that purge" turn out to be, they must be built (or at minimum
tested) as a genuinely verified pair — a purge operation that a restore operation can be shown to
actually reverse. The blueprint does not prescribe a specific mechanism (soft-delete-with-real-restore,
archive-and-reinsert, or something else — see `build-guidance.md` D4 for the source's own proposed
trash/recycle-bin pattern) — but it does establish, as a hard constraint carried forward from the
legacy defect, that whatever mechanism is chosen must be demonstrably reversible, not merely named as
if it were. No other area investigated surfaced a comparable "the code must be restructured this way"
requirement — the Currency Base-currency finding and the VDP Tier finding are real bugs worth fixing
within their existing shape, not evidence the underlying design needs restructuring the way Module
Manager Delete/Restore does.

## Open Questions

- **Company Profile**: whether `vtiger_cf_defcompanyprofile` (a table the delete action also cleans
  up) is a genuinely live, still-relevant table or a stale/vestigial picklist-value table for the same
  logical field was not independently confirmed — reads as likely stale, but this is inferred, not
  verified.
- **Company Profile / Currency**: which template renders the base-currency selection field on the
  Organization Details edit form, and under what conditions it is exposed to an ordinary admin, was not
  traced — this matters for understanding how easily an admin could trigger the Base-currency
  reassignment unintentionally.
- **Module Manager**: whether the manually-supplied record-id-list delete path is restricted to
  already-soft-deleted records by some upstream search/selection screen was not resolved — the delete
  action itself performs no such filter, but the screen that populates that id list was not located.
- **Module Manager**: whether any other entry point anywhere in the codebase performs a genuine
  re-insert-based restore-from-hard-delete for any module was not searched for repo-wide.
- **VDP Tier**: the price-lookup path's fallback behavior when a price falls into the range orphaned by
  deleting the lowest tier was not traced — the gap is confirmed structurally, but whether the
  consuming price-resolution logic fails closed, falls through to a default, or errors was not
  followed.
- **VDP Tier**: whether any code outside this module renumbers VDP tier levels after a mid-sequence
  delete (e.g. a scheduled maintenance process) was not searched for repo-wide.
- **Audit Trail**: whether Settings-module access control actually restricts the audit-trail toggle to
  admin-role users could not be confirmed from this module's own files alone.
