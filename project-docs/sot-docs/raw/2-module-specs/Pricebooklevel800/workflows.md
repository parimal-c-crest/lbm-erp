# Pricebooklevel800 — Workflows

> Keep this file even if this module has no lifecycle/state behavior — state that explicitly below
> rather than deleting the file. See `_deviations-from-original-template.md` in this folder.

Source: `docs_from_blueprint/module/Pricebooklevel800/04-status-workflow.md`, ultimately derived
from `blueprint/module/Pricebooklevel800/03-status-lifecycle.md` (Doc1 §03).

## Applicability

**Unlike SalesOrder, this module has no formal status/sub-status enumeration on its header entity at
all** — there is no "Active"/"Inactive" (or similar) status column on the price-book header table,
confirmed directly against the live schema. The only lifecycle signal on the header entity is the
standard soft-delete flag (§States/§Transitions below). This is stated explicitly, per this
consolidation's own instruction, rather than left implicit: **a state-machine diagram of the kind
SalesOrder's spec provides does not apply to this module's header entity**, because the underlying
legacy system never built one.

That said, the module does carry two other, narrower state-shaped concepts documented below in their
own right: a two-path soft-delete lifecycle, and a completely separate single-exclusive "system
default" flag with an external side effect. A third, per-row boolean toggle of unconfirmed live
effect rounds out the module's state-shaped fields.

## States

| State | Meaning |
|---|---|
| Not Deleted | The header's normal, live state. No dedicated column value — represented by `deleted = 0`. |
| Deleted | Soft-deleted; `deleted = 1`. No "reactivate"/"undelete" interaction found anywhere in this module — once soft-deleted via either delete path, a price book has no in-app path back to not-deleted (matching the standing convention seen across every module blueprinted in this series). |
| Is System Default | A second, independent, single-exclusive header-level flag (not a lifecycle state of an individual header, but a system-wide "which one row is THE default" condition) — see Transitions below. |
| Auto-Update from PCB: On / Off | A per-row boolean toggle of unconfirmed live effect (§4.4 below and Known Gaps). |

**Rule-row (Level800rules) lifecycle** — briefly, as it touches this module's own code:
- **Create**: via the sibling module's own real entity-save method (invoked from this module's
  duplicate-rule flow), or presumably via the sibling module's own standard create screen (out of
  this module's own scope).
- **Update**: this module's own header-save flow's per-rule raw update loop unconditionally resets
  the "dirty flag" column (Updated) to "not updated" on every save (see rule PBL800-RULE-009 in
  `business-rules-and-validation.md`) — the column's own name suggests it was meant to function as a
  dirty/pending flag, but this module's own write path always clears it rather than setting it,
  making it a write-only column from this module's own perspective (no code anywhere in this
  module's files reads it back for any conditional purpose).
- **Delete**: no delete path for individual rule rows was found within this module's own files at
  all — the client-side "mass-delete rules" action calls directly into the sibling module's own ajax
  dispatcher, i.e. rule deletion is entirely delegated out of this module's own code scope.

**No effective-dating / time-boxed rules**: unlike a plan-and-effective-date pattern seen in some
sibling pricing modules, `Level800rules` has no date-range columns of any kind — no
effective-from/effective-to, no created-vs-expires distinction beyond the plain created/modified
audit pair. A rule is either live (not deleted) or not; there is no time-boxed activation concept
anywhere in this module's pricing-rule data model.

## Transitions

| From | To | Trigger | Guard Condition | Side Effects |
|---|---|---|---|---|
| Not Deleted | Deleted (unconditional path) | Standard entity delete action (invoked via the module's generic delete action) | None — no usage check, no confirmation that the price book isn't still referenced by any live rule row or any Account's assignment | None; no cascade to sibling rule rows or Account assignments |
| Not Deleted | Deleted (guarded path) | Ajax delete-guard action — the ListView's actual wired delete button | Blocks if any live Account currently has its assignment matching this price book's name (string-equality join, PBL800-RULE-007/008) | Same soft-delete write as the unconditional path, but via a separately-written, separately-parameterized statement — the two paths do not share a single code path even for the state change itself; no cascade either |
| (any row) → Is System Default cleared on all rows, then set on one row | "Set as default" mass-action | Single-row selection (client-side-only guard, PBL800-RULE-014) | 1. Clear the flag on **every** row of the header table. 2. Set the flag on exactly the one chosen row. 3. Push that row's Price Book Name into the core CRM's own field-definition default value for the Accounts assignment column — an external side effect reaching outside this module's own tables entirely |
| Auto-Update from PCB: Off ↔ On | Toggle | "PB Settings" modal, per price book | None | No confirmed downstream read anywhere in this module's own file set (see Known Gaps) |

**No cascade on delete, either path**: neither delete path touches the sibling rule table's rows
scoped to the deleted price book's name, nor clears any Account's assignment referencing it. A
deleted price book's rules remain live and any Account still assigned to it keeps that now-dangling
string assignment — this is the direct transition-level mechanism explaining the module's headline
data-integrity finding (see `entities-and-fields.md` §4): **the header rows were very likely deleted
(or otherwise removed) without any cascade cleanup ever running**, leaving the rules and account
assignments orphaned. A correctly-written cascade-delete function for exactly this scenario exists in
the codebase but is never called by either delete path (full detail in `calculations.md`).

**"System Default" flag — no code path was found that reads the flag back for any purpose other than
this same set/clear cycle** — i.e. nothing in this module's own files gates behavior on "is this the
default price book" other than the mass-action that sets it; its only observable effect elsewhere in
the system is the field-metadata propagation to future new-Account records, not any read of the flag
column itself.

**`autoupdatefrompcb`**: cross-referenced against the sibling rule table's own `createdfrom` column
(`'PB'`/`'PCB'`) — the two columns corroborate each other's apparent purpose: `createdfrom='PCB'`
marks a rule as generated by whatever external "PCB" (inferred: Product Cost Book) sync process this
toggle is meant to enable, versus `'PB'` for a hand-authored rule. No code in this module's own file
set reads this toggle to actually gate any PCB-sync behavior — the sync process itself, if live, is
not present anywhere in this module's own code; this toggle appears to configure a process that lives
entirely outside this module's own scope, unverifiable from this module's own files alone.

## State Diagram

```
[create] --> Not Deleted
Not Deleted --(unconditional delete path, no guard)--> Deleted (terminal — no undelete found)
Not Deleted --(guarded delete path, blocks if any Account still assigned)--> Deleted (terminal)

Orthogonal, single-exclusive, system-wide (not per-row lifecycle):
  "Set as default" mass-action:
    clear Is-System-Default on every row --> set Is-System-Default on chosen row
      --> external write: core CRM field-metadata default value for Accounts.cf_988

Orthogonal, per-row, unconfirmed live effect:
  Auto-Update from PCB: Off <-> On   (toggled via PB Settings modal; no confirmed reader anywhere
                                       in this module's own files)

Rule-row (Level800rules) lifecycle, delegated:
  Create: via sibling module's own entity-save (duplicate-rule flow) or its own create screen
  Update: this module's per-rule raw update loop; "Updated" dirty flag always reset to 0, never read
  Delete: delegated entirely to the sibling module's own ajax dispatcher (no path in this module)
```

**Open items carried forward from the source, unresolved:**
- Whether `autoupdatefrompcb`/`createdfrom='PCB'` drives any live process elsewhere in the codebase
  is unconfirmed.
- Whether the header-level "Times" default multiplier is ever read for anything beyond a UI pre-fill
  is unconfirmed.
- A new implementation should give the delete lifecycle **exactly one** code path with the
  usage-guard behavior always applied (closing PBL800-RULE-007's bypass), and should give the
  "system default" transition a proper transactional boundary rather than the legacy two-step "clear
  all, then set one" pattern with a separate, unrelated field-metadata write bolted on.
