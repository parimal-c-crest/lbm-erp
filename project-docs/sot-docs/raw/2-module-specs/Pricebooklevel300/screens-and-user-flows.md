# Pricebooklevel300 — Screens & User Flows

> Views, fields, interactions, states. No component library or framework assumption.

> **Inference note.** The source blueprint does not document UI screens directly — screen layouts were
> explicitly out of scope for the extraction passes. Following the same method the `SalesOrder` pilot module's
> own screens-and-user-flows document establishes, this file **infers** the implied screen/interaction
> structure from the entities, rules, status model, and outputs the blueprint does document, expressed as
> views/fields/interactions/states rather than any specific UI framework or component library. **Nothing in
> this file is itself a blueprint finding — it is an inference built on top of findings documented elsewhere in
> this module's spec**, and is marked as such throughout
> (`docs_from_blueprint/module/Pricebooklevel300/08-screens-and-user-flows.md` §8).

## Screen Inventory

| Screen | Purpose |
|---|---|
| List view | A filterable, sortable grid of plans, with an export action. |
| Detail view (read-only) | Displays a plan's own header fields for an existing plan. |
| Edit view (plan header) | The create/edit screen for a plan's own header fields. |
| Rule-list / rule-authoring view | The module's real working surface: a grid of a plan's own scoped rules, each row editable inline, with add/remove actions for individual rules. |
| Coupon modal(s) | A dedicated interaction for viewing/adding/editing/deleting a rule's attached coupons. |
| Rule-type priority modal | A dedicated interaction for re-sequencing the rule-type catalog's display priority. |
| Mass-apply-to-accounts picker | A dedicated interaction for assigning/removing a plan to/from a selected set of Accounts. |
| Mass-duplicate-rule picker | A dedicated interaction for duplicating selected rules to one or more other plans — **inferred to be currently non-functional as coded**, per the two structurally broken SQL statements documented against this feature; a new implementation's own equivalent screen should be built against this feature's documented *intent* rather than assumed to already work end-to-end today. |

(`08-screens-and-user-flows.md` §8.2)

## Flows

**Three authoring surfaces over one bounded capability.** The blueprint's own output catalog and entity
catalog together imply three distinct authoring surfaces, all operating over the same four entities — a new
implementation should treat these as **one bounded capability with three interaction surfaces**, not three
independently maintained features, since the legacy system's own "Account Settings"-labeled duplicate
rule-list surface is a direct, confirmed consequence of having drifted into two copies of the same
rule-authoring surface rather than one (§8.1).

- **Plan authoring flow** — entry point: List view "New" action or Edit view on an existing plan. Steps:
  enter/edit name, description, type discriminator, discount-vs-pricefield mode, plan-wide default pricing
  level/times/GP%/penny-round/dates; save. Decision point: the type discriminator chosen here determines which
  of the three pricing branches (`calculations.md`) the plan's rules are evaluated against — changed at any
  time with no confirmation step. Exit/success state: plan saved, returned to Detail/List view.
- **Rule authoring flow** — entry point: opening a plan's rule-list view (or the confusingly-labeled "Account
  Settings" modal, which renders the same content). Steps: add a new scoped rule; edit a rule's own scope
  dimensions (linecode/subline/division/product/price-code/sales-rank/quantity+operator), date window, and up
  to six independent pricing-adjustment fields, inline in the grid. Decision points: which of the six
  pricing-adjustment fields is populated determines which formula branch condition matches at pricing time (see
  `calculations.md`); delete is delegated to the sibling `Level300rules` module's own ajax handler, not handled
  in this flow. Exit/success state: rule row saved/updated in the grid.
- **Rule duplication flow** — entry point: "Duplicate PB Rule" modal launcher. Steps: pick one or more target
  Sales & Promotions Book(s) from a picker dropdown, optionally apply a times-based adjustment, submit. Exit
  state: **inferred to be currently non-functional as coded** — the feature's own primary source-rule lookup
  references an undefined table alias and raises a SQL error on every execution (PBL300-RULE-017), so this
  flow's own confirmation message (which echoes a caller-supplied value unescaped) is reached only if that
  break is bypassed.
- **Coupon authoring flow** — entry point: either coupon modal launcher ("Add Coupon" / "Add Mix-Match
  Coupon"). Steps: add a coupon (standard or mix-match flavor) to a rule; edit an existing coupon's
  code/basis/amount/comments/expiry; delete a coupon. Guard: a real, working duplicate-code check on add (no
  code path exists to bypass it); no ownership/scope check on delete (any id/rule-id pair submitted is
  accepted). Exit/success state: coupon-list fragment re-rendered.
- **Rule-type priority reorder flow** — entry point: "Change Rule Types Priority" modal launcher. Steps:
  drag-reorder the rule-type catalog (currently a single live row); save. Exit state: priority values updated
  per row.
- **Account-assignment flow** — entry point: mass-apply-to-accounts picker launcher. Steps: select one or more
  accounts; apply or remove the current plan's own assignment against them. Exit state: the shared
  `cf_986` column updated on every selected account (the actual write is parameterized even though every read
  feeding it in this flow is not — see `business-rules-and-validation.md` PBL300-RULE-027 to 030).

(`08-screens-and-user-flows.md` §8.1-8.3)

## States

- **Plan-level state**: active/soft-deleted only — no intermediate lifecycle state exists, a materially simpler
  state surface than `SalesOrder`'s own overloaded status/sub-status pair.
- **Rule-level state**: active/soft-deleted, plus whether the rule's own date window is currently in effect
  (inferred display concern, since the date window IS a genuinely gated pricing input — a user editing a rule
  likely needs to see whether it is currently "live" for pricing purposes, not merely whether it is
  soft-deleted).
- **Coupon-level state**: active/soft-deleted, plus whether the coupon is currently expired (inferred display
  concern, for the same reason as the rule's own date window — expiry IS genuinely gated).
- **Validation/error states**: hard-blocked actions should surface clear, specific error messaging tied to the
  blocking rule (e.g., a duplicate plan name, a structurally invalid rule-duplication request) rather than a
  generic failure — inferred requirement, not itself a blueprint finding.
- **Coupon-gated pricing state (financial, not authoring UI)**: a rule with a live coupon attached is silently
  priced as nothing at all in the legacy system's own pricing engine — this is not a UI state the legacy
  system's own rule-authoring screens surface to the merchandiser at authoring time (no evidence of a
  warning/indicator was found in the source blueprint). **A new implementation's own rule-authoring screen
  should surface this as a visible warning at authoring time** — a merchandiser attaching a coupon to a rule
  should be told, at the point of attaching it, that doing so currently withholds that rule's own price
  computation, rather than discovering the effect only downstream at sale time. This is an inferred UX
  requirement following directly from that documented pricing gap, not a blueprint finding in its own right.

(`08-screens-and-user-flows.md` §8.4)
