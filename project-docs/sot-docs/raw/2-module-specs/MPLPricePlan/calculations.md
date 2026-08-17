# MPLPricePlan — Calculations

> Keep this file even if this module has no computed/derived logic — state that explicitly below
> rather than deleting the file. A missing file can't be told apart from "nobody got to it yet"; an
> explicit "no calculation logic exists in this module" statement can't be. See
> `_deviations-from-original-template.md` in this folder for why.

Source: `docs_from_blueprint/module/MPLPricePlan/05-financial-pricing-logic.md`. Per the task brief that
produced the source blueprint, this pass was flagged as **the most important document for this module** —
that emphasis is preserved here.

## Applicability

This module has real, load-bearing calculation logic — this file applies. **However, the calculation
itself is not performed by this module's own files.** The real computation lives in a shared
pricing-computation function, called from the sales/quote line-item pricing flow, not from anything under
this module's own files. This module's own files perform the *authoring* side of the calculation's inputs
(which cost basis, which formula, which operand, per pricing level, per location); the *evaluation* of
those inputs against a specific sale happens entirely outside this module. This is documented here anyway
because it is the calculation MPLPricePlan exists to configure, and because the confirmed defects in it
(divide-by-zero, silent drops) are the module's own highest-severity non-injection findings.

**The single most important finding, carried forward from the entity and status documentation**: of the
two sub-systems this module maintains — (a) the plan header plus per-location Take/Formula/Value grid,
and (b) the Rule sub-entity (date-ranged, linecode/subline/division/product-scoped) — **only (a) is ever
read by the live pricing-computation path.** There is no rule-precedence or rule-ordering logic to
document for the Rule sub-entity, because that sub-entity is never consulted at pricing time at all.

## Calculation Pipeline

### Stage 1 — Precedence chain: which pricing mechanism applies to a given sale line

Evaluated fresh for every priced sale line, not cached or precomputed onto the product record itself.

1. **Resolve the customer's assigned pricing level.** The account's own assigned pricing level is read,
   then overridden (if a match exists) by an account/job-level "MPL Exception" override, then overridden
   again by a line-level override if present. All three steps are outside this module's own files.
2. If no pricing level resolves at all, no MPL Price Plan pricing is attempted for this line at all.
3. If the product is a non-stock/"fasterbid" product, the pipeline short-circuits to a cost basis with no
   MPL Price Plan or Take/Formula/Value evaluation at all.
4. Else, if the sale line is flagged as product-group-priced and has a product-group reference, a
   product-group-level override grid is used instead — the same Take/Formula/Value shape, but entirely
   outside this module's own tables; this module's own plan/location grid is bypassed for this line if
   this branch is taken.
5. Else (the normal path — most lines): the product's assigned plan for the current location is resolved
   (the product/location assignment relationship, default "no plan assigned"), joined to this module's own
   plan-header and per-location-grid tables:
   - **5a.** If a matching grid row is found for this exact location → this module's own grid is used.
   - **5b.** Else (no plan assigned, or no per-location grid row for this specific location — the
     **overwhelmingly common case** on the source blueprint's live data) → fall back to a legacy,
     per-product-per-location flat-pricing table, populated by a Products-module bulk-update tool,
     entirely outside this module.
6. Regardless of which of steps 3/4/5a/5b supplied the grid: if the product is being sold in a non-base
   unit of measure and a "special MPL" override exists for that exact UOM, that override **replaces the
   entire resolved grid** for this evaluation.
7. Within whichever grid won: the entry whose pricing level matches step 1's resolved level is found —
   see Stage 2 for the formula applied to it.

There is no scenario in the traced code where two MPLPricePlan-owned grids could both apply to the same
line and need tie-breaking, because only one plan can ever be assigned per (product, location) at a time.

### Stage 2 — Formula: Take/Formula/Value, evaluated once the grid and pricing level are resolved

**Inputs**: for the pricing-level entry matched in Stage 1 step 7, its `take`/`formula`/`value` triple.

**`take` — resolves the cost/price basis.** `take` selects which of the product's several stored
cost/price fields (weighted-average cost, a "CM" cost, market price, or one of 10 numbered alternate price
points) becomes the starting basic price — the actual resolution logic for this step is outside this
module's own files and was not traced. Two special-case overrides were confirmed: if the line is
product-group-priced, the basic price instead comes from the product-group data's own weighted-average-cost
or current-market fields; if the line carries an explicit quote-repricing directive, the basic price is
forced to that specific basis regardless of the grid's own `take` value.

**`formula`/`value` — six operations, applied to the basic price**:

| Formula | Computation |
|---|---|
| Times | `salesprice = basicprice × value` — if `value` is `0`, it is **silently coerced to `1`**, i.e. a `Times` rule with a `0` operand becomes a no-op multiplier, not a zero price. |
| Add | `salesprice = basicprice + value` (the operand is first converted between base and selling unit-of-measure if the product has a UOM group). |
| Subtract | `salesprice = basicprice − value` (same UOM-conversion treatment). |
| GP% (gross-profit percent) | `timesVal = 1 − (value / 100)`; `salesprice = basicprice / timesVal` — a standard price-from-cost-and-margin-percent formula. **No zero-denominator guard exists**: a `value` of exactly `100` makes `timesVal` exactly `0`, a live divide-by-zero (see Known Defects below). |
| MU% (markup percent) | `timesVal = 1 + (value / 100)`; `salesprice = basicprice × timesVal`. |
| Net Price | `salesprice = value` directly — `basicprice` is **ignored entirely**; the plan's operand *is* the final price, before UOM conversion/penny-rounding. |

**Any `formula` value outside this fixed set of six is silently ignored** — none of the recognized
branches match, no sales price is ever set for that iteration, and (per the zero-price-suppression finding
below) the line is then dropped from the priced-products result entirely with no error surfaced. Because
the plan-save flow (MPL-RULE-014 in `business-rules-and-validation.md`) accepts any string for `formula`
with no allow-list validation, a malformed or corrupted `formula` value silently produces no price at all
for that pricing level — not a rejected save, and not a fallback price.

**UOM conversion (Add/Subtract/Net Price only)**: for a product sold in a non-base unit of measure, the
plan's `value` operand is converted between base and selling UOM before being applied to the
Add/Subtract/Net Price formulas — the exact conversion math is outside this module's own files and was
not traced. This conversion step only fires for those three formulas; `Times`/`GP%`/`MU%` operands are
unitless ratios and are applied directly with no conversion step.

**Rounding behavior — penny rounding, applied last**: a penny-rounding function (rounding algorithm itself
outside this module's own files, not traced) is applied to the computed sales price as the final step, if
a rounding value is available. Two possible sources, in the order checked: (1) a per-pricing-level
rounding value embedded directly in the grid entry itself (only present if the grid was hand-built with
that key — not a field the plan-save UI itself writes); else (2) the plan header's own default
penny-rounding field — only applied on the Stage 1 step-5a "this module's own plan" path, since neither
the product-group nor the legacy-fallback path has a plan header row in scope at all.

**Output**: a computed sales price for the matched pricing-level entry, or (per the zero-price-suppression
rule below) no price at all.

### Stage 3 — Zero-price suppression

**Any line whose computed sales price evaluates to exactly `0` (including a `0` produced by an
unrecognized `formula` falling through with no price ever set) is silently dropped from the
priced-products result**, not flagged as an error or surfaced as a genuine zero-price line. This is the
same "silently drop rather than surface" pattern that makes the unrecognized-`formula` gap invisible to
the end user — a merchandiser who saves a plan with a typo'd formula string sees no error at save time
(MPL-RULE-014) and no error at pricing time (here); the affected product simply never gets a price from
this plan.

## Known Defects (carried forward from the source blueprint, not resolved here)

- **Live divide-by-zero risk — `GP%` at `value = 100`.** Confirmed, live-data-groundable formula defect: a
  plan's `GP%` operand of exactly `100` produces a division by zero with no guard clause of any kind
  before the division. A `100%` gross-profit-percent value is a mathematically valid *input* (data-entry
  mistake, or a merchandiser testing) but produces a division by zero. Per Stage 3, the resulting
  infinite/undefined result would not be caught by the zero-price suppression check (an infinite or
  undefined value is not equal to `0`), so it would flow forward into whatever consumes the
  priced-products result next. **Live-data grounding**: none of the 34 live grid rows sampled in the
  source blueprint happened to carry a `GP%` value of exactly `100` on its dev snapshot — a live code
  defect with no currently-triggering live row on that snapshot, one save-time typo away from firing.
- **No margin/GP recompute or independent calculation exists anywhere else in the module's own files** —
  this module's own files handle `take`/`formula`/`value` purely as opaque strings being read from or
  written to the grid data; they display the fixed option lists for the UI's own dropdowns, but never
  evaluate a rule against a price the way the shared pricing engine does.

## Server-Side Recomputation Requirement

Any value derived by this pipeline must be recomputed server-side at every consuming step, never accepted
as caller-supplied input. This is the standard fix for the "client-trusted total" class of risk, and is
consistent with the legacy system's own shape: this module's own files never trust a client-computed
price — the plan-save flow persists only the *inputs* (take/formula/value), and the shared pricing engine
computes the actual price fresh, server-side, at every priced sale line, not cached or precomputed onto
the product record itself.

Given the confirmed formula defects above and the shared-utility function's current un-unit-tested,
in-line implementation, a new implementation should give this module's traced calculation logic a
first-class, independently-testable home rather than reproducing it in-line inside a shared utility
function:

- **The six-formula switch should be reproduced exactly**, but should **reject** an unrecognized `formula`
  string with an explicit, typed error rather than silently producing no price.
- **The `GP%` division should be explicitly guarded** (`value != 100`) and should return an explicit,
  typed division-by-zero result rather than computing an infinite/undefined value.
- **A legitimately-zero computed price should be returned as an explicit, distinct result** from an
  invalid-formula result, rather than being silently dropped with no signal at all — the caller decides
  whether a legitimate zero price is acceptable for that context, the calculation logic itself should no
  longer make that call by omission.
- **`formula`/`take` should be validated against an explicit allow-list, and `value` for
  numeric-format/range sanity, at save time** — not only at compute time — so a malformed plan grid is
  rejected at authoring time, before it can ever reach a live sale line (closing MPL-RULE-014's "any
  string accepted" gap).
- **The upstream contracts this module's own calculation logic depends on** (pricing-level resolution,
  cost-basis resolution, UOM conversion, penny-rounding) should be modeled as explicit interfaces this
  module's own calculation service calls, not redesigned here — their internals were not traced in the
  source blueprint and remain genuinely external dependencies.

## Open Items

- **The cost/price-basis resolution logic** a plan's `take` value selects from — not traced; out of the
  source blueprint's module-scoped budget.
- **The exact UOM-conversion math** — not traced; needed to fully verify the Add/Subtract/Net Price
  formulas' behavior for non-base-UOM sales.
- **The exact penny-rounding algorithm** — not traced; the rounding-rule string format itself and its
  interpretation are both open.
- **The account/job-level pricing-level override resolution logic** — not traced; this determines which
  pricing level (and therefore which row of a plan's grid) a given sale actually resolves against,
  upstream of anything this module's own files control.
- **Whether any live production tenant (as opposed to the source blueprint's dev snapshot) has ever saved
  a `GP%` value of `100` or an unrecognized `formula` string** — not testable without access to a broader
  live/production dataset.
- **Whether the Rule sub-entity's apparent lack of a pricing-engine consumer reflects a removed feature, a
  planned-but-never-built one, or a search gap** — the source blueprint's repo-wide search for the Rule
  sub-entity's own table name was treated as comprehensive, but it remains worth a subject-matter-expert
  check before this ambiguity is resolved either way (see `risks-and-open-questions.md`).
