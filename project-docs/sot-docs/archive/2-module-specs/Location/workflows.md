# Location — Workflows

> Keep this file even if this module has no lifecycle/state behavior — state that explicitly below
> rather than deleting the file. See `_deviations-from-original-template.md` in this folder.

Source: `blueprint/module/Location/03-status-lifecycle.md` via
`docs_from_blueprint/module/Location/04-status-workflow.md`.

## Applicability

Applies, but narrowly and asymmetrically. Location's status/lifecycle surface splits across its two
entities into two very different shapes, unlike a module with one coherent state machine:

1. **The physical Branch/Store has no lifecycle field of any kind — not merely inert, genuinely
   absent from the schema.** No Active/Inactive/Open/Closed field, picklist, or boolean flag was ever
   given to the branch header. This is a confirmed schema gap, not an under-investigated field — see
   `risks-and-open-questions.md`.
2. **The Product-at-Location composite entity has exactly one real, enforced, one-way transition:
   Part Superseded** — a genuine lifecycle-shaped field with real cascading side effects and confirmed
   enforcement across six independent consumer contexts in four other modules.

Two branch-header config toggles (Tax-Authority-Code Basis, CIPW payment-gateway enablement) were
investigated as lifecycle candidates and ruled out — both are real, confirmed, enforced settings, but
each is re-read fresh at every point of use as a flat two-way toggle, never a sequence of states.

## States

| State | Meaning |
|---|---|
| *(Branch/Store — no state field exists)* | No Active/Inactive/Open/Closed state is representable for the branch entity itself. The only exit is the standard platform-wide soft-delete flag (generic infra shared by every entity, not a Location-specific "deactivate this branch" concept, with no intermediate "temporarily closed" state). On the source blueprint's live data, no branch has ever been soft-deleted. |
| Not superseded / blank (Product-at-Location) | Normal, active product/branch row — treated as functionally equivalent by every filter examined, though this equivalence is not guaranteed against a filter written with different negation logic elsewhere in the codebase. A large minority of rows carry a blank rather than an explicit "not superseded" value (see Known Gaps below). |
| Superseded (Product-at-Location) | This product/branch row has been replaced by the product referenced in Superseding Product Number. |

## Transitions

| From | To | Trigger | Guard Condition | Side Effects |
|---|---|---|---|---|
| Not superseded / blank | Superseded | Part-supersession action, Products-module-initiated (LOC-RULE-005/018-021 in `business-rules-and-validation.md`) | Fired once per branch where the superseded product has a location row | Superseding-product pointer set (Superseding Product Number); Reorder flag simultaneously forced off in the same write, not a separate step; the QoH/sales-history/pricing merge cascade fires on the next save of that row (per the combine-option settings) |
| Superseded | *(no reverse transition)* | **None found.** A repo-wide search for a reversal pattern found only read-filter comparisons and an unrelated new-row default (for a newly created superseding product's own fresh rows, not a reversal of the superseded row). | N/A | N/A — confirmed absence, not merely unconfirmed |

## State Diagram

```
  Branch/Store — no lifecycle field exists at all:

    (branch created via Settings-area admin screen)
         |
         v
      [ no Active/Inactive/Open/Closed field anywhere in the schema ]
         |
         v
    only exit: generic platform soft-delete, not a Location business
    concept. Never used on the source blueprint's live data.


  Tax-Authority-Code Basis / CIPW enablement — real config toggles, not lifecycle:

    off <--[admin edits config, either direction, any time]--> on

    Both re-read fresh at the moment of use — real enforcement, but a
    flat two-way toggle, never a sequence.


  Part Superseded — the one real, one-way lifecycle transition:

    Not superseded / blank --[supersession action, Products-module-initiated]--> Superseded
         ^                                                                            |
         +-------------------------- NO REVERSE PATH FOUND -------------------------+
                                     (dead end -- confirmed absence)

    On transition: superseding-product pointer set, Reorder forced off,
    QoH/sales-history/pricing merge cascade fires on next save.

    Read as a scope-exclusion filter by six consumer contexts across four
    modules (Demand forecasting cron/reports, Vendor line-code/PO-suggestion
    processing, an export query, Product autocomplete [compound: superseded
    AND zero QoH], B2B catalog substitution) — see `integrations.md`.
```

## Known Gaps

- **Whether a branch can be operationally "closed" is a genuine schema gap, not merely an
  under-investigated field.** If the business ever needs to represent a temporarily-closed branch, no
  first-class mechanism exists today — a rewrite's requirements phase should ask the product owner
  directly whether this need has historically been worked around some other way.
- **CIPW's exact enforcement completeness was only spot-checked at two call sites** — both confirmed
  real, but the source blueprint did not exhaustively enumerate every UI surface (e.g. the point-of-sale
  screen itself) to confirm there is no third, inconsistent check.
- **Whether "Visible in Searches" has any enforcement site beyond the one confirmed Sales-Order/
  Purchase-Order autocomplete path was not exhaustively traced.**
- **No caller of the "check" function that independently re-runs the supersession merge cascade
  (LOC-RULE-021) was located in any pass** — if a second code path can independently fire the cascade,
  whether it ever reverses the Part Superseded flag was not fully confirmed (though no such path was
  found).
- **A large minority of Product-at-Location rows carry a blank (not explicitly "not superseded") value
  for this flag** — a blank row is not excluded by the forecasting/vendor/export filters (which require
  the literal "not superseded" string) while also not being excluded by anything checking for
  "superseded." Not confirmed to matter today, flagged for completeness.
