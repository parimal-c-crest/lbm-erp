# PurchaseHistory — Workflows

> Keep this file even if this module has no lifecycle/state behavior — state that explicitly below
> rather than deleting the file. See `_deviations-from-original-template.md` in this folder.

Source: `docs_from_blueprint/module/PurchaseHistory/04-status-workflow.md`, itself traced to
`blueprint/module/PurchaseHistory/03-status-lifecycle.md`.

## Applicability

**No domain-specific status/workflow field exists.** Unlike SalesOrder (whose status model spans several
files), PurchaseHistory has no domain-specific status, alert, or lifecycle-state field of any kind — a full
schema check against the source system found zero matching columns of that shape. The only boolean/enum-shaped
field on this entity at all is the generic soft-delete flag every module in the source system carries.
PurchaseHistory has no domain-specific state machine of its own — like SalesHistory, it is a pure rolling
numeric aggregate, not a workflow-bearing entity. The rest of this file documents the soft-delete flag's own
behavior and the row's accumulate-only lifecycle, since those are the only state-shaped facts that exist for
this entity.

## States

| State | Meaning |
|---|---|
| Not deleted | Active aggregate row, eligible for accumulator writes and included in the export's active-rows filter. 644 of 644 rows (100%) on the source dev snapshot. |
| Deleted | Soft-deleted via the shared delete framework. 0 of 644 rows (0%) on the source dev snapshot — the delete code path is confirmed present and functional, but never observed exercised on this snapshot. |

## Transitions

| From | To | Trigger | Guard Condition | Side Effects |
|---|---|---|---|---|
| *(row created)* | Deleted | User-initiated delete, routed through the shared soft-delete framework helper | Record identifier must be present in the request; no further guard exists in the delete entry point itself | Soft-delete flag set; row excluded from the export query's own active-rows filter and from every PurchaseOrder-side writer's own existing-row lookup going forward |
| Deleted | Not deleted | *(no reverse/undelete transition found anywhere in the module's own files)* | N/A | N/A |

**Note on the accumulator writers' interaction with the soft-delete flag**: all three confirmed
PurchaseOrder-side accumulator writers explicitly exclude soft-deleted rows from their own existing-row
lookup — once a row is soft-deleted, the next accumulator write for that same key will not find it and will
instead create a **new** row with fresh (non-accumulated) starting values, rather than resurrecting or
accumulating onto the deleted row.

**Record lifecycle (accumulator by writer-side convention, not by this module's own files)**:
1. **First write for a key**: any of the three confirmed PurchaseOrder-side writers' "not found" branch sets
   the buy/return counters directly from the qualifying purchase-order line's own quantity, then computes
   `total_activity`.
2. **Every subsequent write for the same key**: the existing row's stored counters are read, the incoming
   delta is added on top (buy counter for a purchase-type code, return counter for a return-type code), and
   `total_activity` is recomputed — a genuine read-modify-write accumulator pattern, implemented entirely in
   the sibling PurchaseOrder module's own files, never in this module's own files.
3. **The module's own inline-edit endpoint behaves differently from both of the above**: it does not add a
   delta and does not recompute `total_activity` at all — it directly overwrites whichever single field was
   edited, with no downstream consistency check (PH-RULE-013).

**No "close out the week" or "finalize the bucket" transition exists.** No code path anywhere marks a row as
closed/final once its week/year passes; a row for a past week remains just as writable as a row for the
current week, indefinitely. All three confirmed writers key their existing-row lookup on the system clock's
own current-week/current-year value — a backdated correction would still be bucketed into whatever week is
calendar-current at save time, not the week the underlying business event conceptually occurred in (flagged
as an open question).

## State Diagram

```
(row created, key-first-write) --> [Not deleted]
[Not deleted] --(soft-delete, record id present)--> [Deleted]
[Deleted] --(no reverse transition found)--> (none)

Note: a subsequent accumulator write for a key whose prior row is [Deleted]
does not resurrect that row -- it creates a brand-new [Not deleted] row instead.
```

(`docs_from_blueprint/module/PurchaseHistory/04-status-workflow.md` §4.1-4.3)
