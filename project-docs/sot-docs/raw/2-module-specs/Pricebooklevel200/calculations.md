# Pricebooklevel200 — Calculations

> Keep this file even if this module has no computed/derived logic — state that explicitly below
> rather than deleting the file. A missing file can't be told apart from "nobody got to it yet";
> an explicit "no calculation logic exists in this module" statement can't be. See
> `_deviations-from-original-template.md` in this folder for why.

Source: `docs_from_blueprint/module/Pricebooklevel200/05-financial-pricing-logic.md`, itself transcribed from
`blueprint/module/Pricebooklevel200/04-financial-pricing.md` ("Pass 4") — the source blueprint's own most
important document, per its task brief.

## Applicability

Applicable — this is the module's most important logic. **This module's rule mechanism is genuinely
live-consumed, not dormant.** A structurally similar rule mechanism in the sibling `MPLPricePlan` module was
found, across four independent analysis passes, to have zero confirmed live consumers. Pricebooklevel200's own
rule mechanism (scoped by 7 product dimensions) is, by direct trace of the live pricing-computation function,
**the real, live, primary pricing-resolution path** for any account whose price-sheet assignment resolves to a
Pricebooklevel200 sheet.

The module's own files perform almost no independent arithmetic — the real computation lives in a shared
pricing-utility function outside this module's own files (a common architectural shape across the pricing
modules in this documentation series). But this module's own files do author the real inputs to that
computation: which of the 7 scope dimensions are set on a given rule, and what net-price/GP value each rule
carries.

## Calculation Pipeline

Traced directly from the live pricing-computation function's own body
(`include/utils/InventoryUtils.php::find_MA_MPS_SalesPricesByParams()`).

1. **Resolve the account's applicable price-sheet id.** This step is resolved entirely by the caller, outside
   this module's own files — the same "resolved upstream" boundary drawn for the sibling `MPLPricePlan`
   module's own equivalent step. Not traced further in the source blueprint.
2. **Look up that sheet's header row**, requiring the sheet be non-soft-deleted **and** `mps_status = Active`
   (see `workflows.md`). If no matching Active header row is found, the specificity-scored match in step 4
   below can never match anything.
3. **If the sheet is configured "not item-specific"**: pre-resolve a fallback "location base price" for this
   product/location at the sheet's own configured price level — used later in step 5 if a matched rule's own
   net price is literally zero. (The internal resolution logic of this fallback-price lookup was not traced to
   completion in the source blueprint — see Open Questions below.)
4. **The specificity-scored match — the module's real rule-precedence mechanism.** Select every candidate rule
   row where **each** of the 7 scope dimensions (line code, subline, product division, product, brand, color,
   manufacturer) either matches the product's own value on that dimension **or** is empty on the rule (empty =
   "matches any"), **and** at least one dimension is non-empty on the rule (a fully-wildcard rule is excluded),
   **and** the rule belongs to the resolved sheet. Score each candidate row by a count of its own non-empty
   dimensions (0-7). Order by that count descending, with several further tie-breaker columns as secondary sort
   keys; take the single highest-scoring row. **The single most-specific matching rule wins** — a rule scoped
   to a specific product always outranks one scoped only to a line code, regardless of creation order. This is
   deliberate, working precedence logic, not an accident of query ordering.
5. **Fallback**: if no scored rule matched at all (not merely a rule scoring zero, but zero rows returned), a
   second, narrower query matches **only** on an exact line-code (subline/division/product all required
   empty) for the same sheet. A third, even narrower fallback tier (matching a partial/wildcarded line-code
   prefix) is present in the code but **fully commented out — confirmed not live**.
6. Whichever rule (if any) is found by step 4 or step 5: apply the pricing formula below against it.

**Direct answer to the "rule precedence/ordering" question this document set exists to answer**: this module
**does** have a genuine within-sheet rule-precedence mechanism, and it is a specificity score, not a simple
first-match or most-recently-created-rule rule.

### The formula — net price / GP fallback, evaluated once a rule is matched

Traced from the pricing-computation function's own body, within a loop structured to run at most once per call
despite its own iterating shape — a structural leftover, not a real multi-rule iteration.

**Primary path — Net Price used directly.** If the matched rule's own Net Price is non-zero, it is used
**directly as the sale price** — no Take/Formula/Value indirection of any kind, a materially simpler model than
the `MPLPricePlan` sibling module's own six-operation formula grid. The rule's own GP figures are **not** read
in this primary path at all — they appear to be informational/audit figures displayed elsewhere, not inputs to
the live price computation itself, unless the fallback below fires.

**Fallback formula — structurally identical in shape to the `MPLPricePlan` sibling module's own GP% operation.**
When the sheet is configured "not item-specific" **and** the matched rule's own Net Price is literally zero
**and** the rule carries a non-empty GP value, the price is instead computed as:

```
netPrice = mpsNetPrice / (1 - mpsGp / 100)
```

where `mpsNetPrice` is the pre-resolved location-base-price at the sheet's own configured price level (pipeline
step 3 above). This is the exact same "price-from-margin-percent" formula shape documented for the sibling
`MPLPricePlan` module's own `GP%` operation, independently re-implemented here with different variable naming
and **no formula-selector concept of any kind** — the operation is simply always this one shape whenever the
fallback condition fires, not one of several selectable operations.

**Live divide-by-zero risk — the same defect shape as the sibling `MPLPricePlan` module's own `GP%` finding.**
The GP value reaching exactly `100` makes the divisor `(1 - 100/100)` equal zero, producing a divide-by-zero
with **no guard clause of any kind** before the division. Live-data grounding: the source blueprint
spot-checked all 187 live rule rows' own GP column — no row on that dev snapshot carries a value of exactly
`100.000`, so this is (like the `MPLPricePlan` sibling module's own equivalent finding) a live code defect with
no currently-triggering live row, not an actively-firing bug today. This fallback path only fires under a
compound condition — narrower exposure than the `MPLPricePlan` sibling module's own every-formula-row exposure,
but present via the identical arithmetic shape. No numeric-range validation on the GP value is performed at
save time anywhere in the module's own save actions, so this remains one save-time value away from firing.

**Unit-of-measure conversion — applied whenever the product carries UOM data, regardless of which
price-resolution path fired.** If the product carries unit-of-measure conversion data, the resolved sale price
is converted through a base-quantity/quantity ratio (twice — once to derive a per-selling-unit price, once to
derive the canonical per-base-unit price actually stored) and, if UOM-type metadata is present, additionally
run through a shared UOM-conversion function (internal logic not traced to completion — see Open Questions
below) to populate a per-UOM sell-price map for every unit the product supports. This conversion step is
unconditional — it does not distinguish between the direct-Net-Price path and the computed-from-GP path; both
feed into the same UOM-conversion block.

**No penny-rounding step found in the live pricing path.** Unlike the `MPLPricePlan` sibling module's own
dedicated penny-rounding step, the full trace of this module's own pricing-computation function found **no
call to any penny-rounding helper** — the computed sale price is formatted to 4 decimal places, but never
passed through a rounding-to-a-configured-cent-increment function. **Both of the module's own penny-rounding
fields (the header's own Default Penny Round Up field, and each rule's own Default Penny Round field) are, per
this trace, unconsumed by the live pricing computation** — the same "captured, not confirmed consumed" shape
flagged elsewhere in this spec for other fields, now confirmed to extend to the penny-round mechanism as well.

**Zero-price suppression — identical pattern to the sibling `MPLPricePlan` module's own equivalent finding.**
Any priced line whose computed sale price evaluates to exactly zero — including the case where no rule
condition above fires at all, leaving the price effectively unset — is **silently dropped from the
priced-products result, with no error surfaced**. This is the same "silently drop rather than flag" pattern
documented for the sibling `MPLPricePlan` module's own equivalent finding.

**The tier tag — confirms a shared multi-tier pricing decision surface with the sibling modules.** The
pricing-computation function unconditionally tags every price it contributes with a literal `"200Level"` string
identifier. This strongly implies the function's own caller (not traced to completion in the source blueprint)
also calls structurally parallel `300Level`/`800Level`-tagged sibling functions for the
`Pricebooklevel300`/`Pricebooklevel800` modules, and that all three feed into the **same** shared
pricing-decision result set. This is the clearest confirmation found in the source blueprint of the three
sibling modules sharing not just code shape, but a **live, joint consumption point** — which of the three
tiers' functions runs last (or first) may overwrite or be overwritten by the others' own contributions, an
ordering/precedence question this module's own blueprint cannot resolve alone. Carried forward as an open
cross-sibling question in `integrations.md`.

## Server-Side Recomputation Requirement

Any value derived by this pipeline must be recomputed server-side at every consuming step, never accepted as
caller-supplied input. This is the standard fix for the "client-trusted total" class of risk.

Per the source blueprint's own implementation-plan recommendation: a new implementation's pricing service
should reproduce the exact 7-dimension specificity scoring as a **named, independently-testable function**, not
an inline query-ordering expression, so the precedence logic itself becomes reviewable and testable independent
of the query that fetches candidate rows. The GP-based fallback's division should be **explicitly guarded**
against the `mpsGp = 100` case, returning a typed divide-by-zero result rather than computing an undefined
value. A resolution should never be **silently dropped**: a rule that legitimately resolves to a zero price
should be distinguishable from "no rule matched at all." This spec preserves these as forward-looking
requirements consistent with the source blueprint's own decisions, without inventing implementation detail the
source blueprint did not itself specify.

## What this document does not resolve

Consistent with the ambiguity-preservation principle governing this whole spec, the following are carried
forward as genuinely open, not resolved (see `risks-and-open-questions.md`):

- Whether `mps_end_date`'s lack of a pricing-time gate is intentional design (the field is purely
  informational) or a genuine missing-enforcement defect — not resolvable from code alone.
- Whether any live production tenant has ever saved a GP value of exactly `100` — not testable against the
  source blueprint's own dev-only snapshot.
- The full caller chain of the pricing-computation function within the SalesOrder/Quotes pricing flow, and —
  critically — whether/how it is called alongside the structurally parallel sibling-tier functions writing into
  the same shared pricing-decision result set — the single most important open question for the cross-sibling
  consolidation pass, carried forward in `integrations.md`.

## Open questions (upstream dependencies not traced to completion)

- The internal resolution logic of the "location base price" / "price dropdown" lookups the GP-based fallback
  formula depends on (pipeline step 3).
- The exact math of the shared unit-of-measure conversion function.
- The exact rounding behavior of the shared cost-rounding function referenced in the GP-based fallback formula.
