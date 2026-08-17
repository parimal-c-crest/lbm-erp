# Pricebooklevel300 — Workflows

> Keep this file even if this module has no lifecycle/state behavior — state that explicitly below
> rather than deleting the file. See `_deviations-from-original-template.md` in this folder.

## Applicability

**Applies partially.** Unlike `SalesOrder`'s overloaded primary-status/fulfillment-sub-status pipeline,
**Pricebooklevel300 has no plan-level "active/inactive"/"draft/published" business-status field of any kind,
and no rule-level or coupon-level state machine beyond a plain soft-delete flag** — a direct schema check
against the plan header's own field catalog confirmed the absence of any `status`/`active`/`enabled`-shaped
column beyond `deleted` itself. This is stated explicitly per this document's own instruction, rather than
presenting the entities' soft-delete transitions as if they were a genuine status workflow: **this file
documents four independent delete/soft-delete lifecycles and two independently-evaluated date gates, not a
status state machine** (`docs_from_blueprint/module/Pricebooklevel300/04-status-workflow.md` §4.1).

## States

| State | Meaning |
|---|---|
| Sales & Promotions Book — Active | 6 of 6 plan-header rows on the blueprint's own dev snapshot (100%). |
| Sales & Promotions Book — Soft-deleted | 0 live rows on the dev snapshot. No "undelete"/"restore" action exists anywhere in the source blueprint's own repo-wide search. |
| Level300 Rule — Active | 20 of 20 rule rows (100%). |
| Level300 Rule — Soft-deleted | 0 live rows. The soft-delete flag is never writable from anywhere under this module's own files — rule deletion is owned entirely by the sibling `Level300rules` module. |
| Level300 Rule Type — (no delete/active state at all) | No soft-delete column and no "active"/"inactive" concept exists; its only mutable state is a re-orderable priority integer. A type either exists in the table or does not. |
| Coupon — Active | 8 of 16 rows on the blueprint's own `generatefrom='rule300'` slice (50%) — a materially different live/dead ratio than the plan header or rule entities. |
| Coupon — Soft-deleted | 8 of 16 rows (50%), consistent with coupons being a more frequently-churned, expiry-driven entity than a plan or a pricing rule. |
| Coupon — Expired (not itself a delete state) | The coupon's own expiry-date lifecycle IS a genuinely evaluated gate — an expired-but-not-deleted coupon is treated as functionally inactive by every consumer the source blueprint traced, even though its own soft-delete flag remains unset. |

(`04-status-workflow.md` §4.2-4.6)

## Transitions

| From | To | Trigger | Guard Condition | Side Effects |
|---|---|---|---|---|
| *(row created via the standard save flow)* | Plan: Active | Plan created through the standard edit/save flow | Whatever the generic entity-save machinery enforces (unconfirmed — no presence/format check on the plan name found in this write path itself) | None beyond the entity save and the immediate header field update |
| Plan: Active | Plan: Soft-deleted | Plan delete action | **None — no usage-guard of any kind.** A plan can be deleted while rule rows still reference its name and while accounts still carry its name in their assignment list | The plan's own soft-delete flag flips; a real, working cross-module cleanup removes the deleted plan's name from every account's assignment column — but the plan's own rule rows are left orphaned, not deleted or reassigned |
| Plan: Soft-deleted | Plan: Active | *(no code path found anywhere in the source blueprint's own repo-wide search)* | N/A | N/A — confirmed absence, no "undelete"/"restore" action exists |
| *(row created)* | Rule: Active | Not itself owned by this module's own files | N/A | N/A |
| Rule: Active | Rule: Soft-deleted | A client-side mass-delete action, routed to the sibling `Level300rules` module's own ajax handler | Not traced (out of this module's own scope) | Not traced |
| Rule: Soft-deleted | Rule: Active | *(no code path found within this module's own scope)* | N/A | N/A |
| *(row created)* | Coupon: Active | Coupon-add action | A **real, working duplicate-code guard**: the shared save function first checks whether a live, non-expired coupon with the same code already exists for the same owning feature — if so, the insert is rejected rather than creating a duplicate | None beyond the insert itself |
| Coupon: Active | Coupon: Soft-deleted | Coupon-delete action | **None** — the delete update runs unconditionally on whatever id/rule-id pair is submitted, with no ownership/session check beyond those two match predicates | None beyond the flag flip |
| Coupon: Soft-deleted | Coupon: Active | *(no code path found)* | N/A | N/A — confirmed absence of any un-delete/restore path |

(`04-status-workflow.md` §4.2-4.5)

**A plan can be deleted while `Level300 Rule` rows still reference its name** — the account-side cleanup does
run, genuinely removing the plan's name from every affected account's assignment column, but the rule rows
themselves remain present, still carrying the now-deleted plan's name, simply no longer reachable through the
plan header's own UI. Whether the live pricing engine's name-keyed match could still match against these
orphaned rules if an account is later re-assigned a plan of the same (re-created) name is a genuine, unresolved
data-integrity question, carried forward to `risks-and-open-questions.md` (`04-status-workflow.md` §4.2).

**The plan's own type discriminator** (`default`/`mixmatch`/`Combined Quantity Discount`) is set once, at
plan-creation or edit time, through the same raw header update as every other header field — there is no
dedicated transition/workflow around it. A user can change a live plan's type at any time through the ordinary
edit screen, immediately altering which of the three pricing-computation branches that plan's rules are
evaluated against on the very next sale — with no confirmation step, no audit trail of the change beyond the
standard modified-timestamp column, and no validation that the submitted value is one of the three recognized
strings at all (`04-status-workflow.md` §4.6).

**The plan's own default start/end dates are captured, not gated** — contrast the rule's own `startdate`/
`enddate` window, which IS genuinely evaluated as a real gate by the live pricing-match query (confirmed at
multiple call sites in the pricing engine), and the coupon's own expiry date, which IS also genuinely gated.
The plan header's own `def_start_date`/`def_end_date` columns are captured and displayed, but no gating
consumer reading them at pricing-match time was found anywhere in this module's own files (`04-status-workflow.md`
§4.7-4.8).

## State Diagram

```
Sales & Promotions Book (plan header)
  [*] --> Active : create (save flow)
  Active --> SoftDeleted : delete (NO usage guard)
  SoftDeleted --> [*] : (no restore path exists)

Level300 Rule
  [*] --> Active : create (not owned by this module)
  Active --> SoftDeleted : mass-delete via sibling Level300rules module
  SoftDeleted --> [*] : (no restore path exists)

Level300 Rule Type
  [*] --> Exists : create (no delete/active concept at all)

Coupon
  [*] --> Active : create (duplicate-code guard enforced)
  Active --> SoftDeleted : delete (NO ownership/session guard)
  SoftDeleted --> [*] : (no restore path exists)
  Active --> Expired : expire_date reached (genuinely gated at every read path,
                        independent of the soft-delete flag)
```

## Required Consideration For A New Implementation

Because this module has no genuine multi-state workflow, a new implementation does not need to design a status
state machine for it — but it does need to close the concrete gaps the source blueprint's own status/lifecycle
pass surfaced (`04-status-workflow.md` §4.9):

1. The plan-delete operation must gain a real precondition check — no live account assignment and no live rule
   reference may exist against a plan before it can be deleted.
2. The rule-delete operation, wherever it ends up owned in a new implementation, needs its own ownership guard
   — the legacy system's own rule-delete path (owned by a different module entirely) was never traced far
   enough to confirm whether one exists there today.
3. The coupon-delete operation needs an explicit ownership/scope check — matching only on id and rule id, with
   no verification the coupon actually belongs to the plan currently being edited, is a real, if narrow, gap
   worth closing.
4. The rule's own date-window gate and the coupon's own expiry gate are both genuinely working legacy behavior
   that should be preserved exactly — these are not defects to fix, they are confirmed-correct mechanisms to
   carry forward unchanged.
5. The plan's own default dates' "captured but not gated" status should be resolved by explicit design
   decision, not left ambiguous — either give them a genuine gating consumer, or confirm they are purely
   informational/UI-convenience fields and document that decision.
