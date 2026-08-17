# SearchLineItem — Calculations

> Keep this file even if this module has no computed/derived logic — state that explicitly below
> rather than deleting the file. A missing file can't be told apart from "nobody got to it yet";
> an explicit "no calculation logic exists in this module" statement can't be. See
> `_deviations-from-original-template.md` in this folder for why.

Source: `docs_from_blueprint/module/SearchLineItem/05-financial-pricing-logic.md`
(`blueprint/module/SearchLineItem/04-financial-pricing.md`, Doc1 Pass 4, cross-checked against Pass 6/7).

## Applicability

Applicable, but genuinely thin — stated explicitly, not glossed over. SearchLineItem is a read-model
over already-finalized SalesOrder line data; it is not expected to carry a calculation pipeline of its
own comparable to SalesOrder's order-total engine, and it does not. **This module performs almost no
arithmetic in its own files.** Its two live write surfaces are: (1) the finalize-time snapshot write,
where a meaningful subset of fields (Extended Sellprice, Extended Product Cost, Extended Coresell,
Margin Dollars, Margin Percentage) are genuinely computed — but the computation is authored and executed
entirely inside SalesOrder's own finalize routine, which reaches into the SearchLineItem row and sets
its fields directly; and (2) the module's own inline-edit ajax path, which **does** contain real
division arithmetic inside the module's own files — its only self-contained calculation, and exactly the
unguarded division documented in `business-rules-and-validation.md` SLI-RULE-011/012.

**Direct statement of the finding**: SearchLineItem does not compute anything in its own module beyond
one narrow ajax-triggered division per special-cased field. The margin dollar/margin percent figures it
carries are genuinely computed values, not copies — but the computation is authored and executed
entirely inside SalesOrder's finalize routine. SearchLineItem is a **write target for SalesOrder's
computation**, not an independent calculation engine.

## Calculation Pipeline

### Stage 1 — Finalize-time formulas (SalesOrder's computation, persisted only on SearchLineItem)

Recorded here because SearchLineItem is the sole place their *output* is persisted — not because a new
SearchLineItem implementation needs to re-author them (that belongs to SalesOrder's own specification,
which this module's cross-module integration boundary respects).

- **Extended Sellprice** = (sell price × ship quantity) − a rounding/docket-difference correction.
- **Extended Product Cost** = unit cost × ship quantity, where unit cost is either an average-landed-
  cost figure, a buyout/manual-override cost, or a manually-entered COGS override, depending on which of
  several mutually-exclusive branches applies (core-charge line, buyout line, standard sale/return line,
  or a manual-cost/backorder-carry-forward override).
- **Margin Dollars and Margin Percentage** — genuinely computed, branched by transaction code:
  - *Core-charge-type lines*: Margin Dollars = core price − core cost (forced to zero for accounts whose
    core-tracking type is "Count"); Margin Percentage = ((core price − core cost) / core price) × 100,
    sign-negated for the return-type variant of this branch.
  - *Buyout lines*: Margin Dollars = sell price + core price − buyout cost − core cost (sell price −
    buyout cost, if "Count"); Margin Percentage analogous, with the divisor being sell price + core
    price.
  - *Default (regular sale/return) lines*: same shape as the buyout branch, but unit cost is the
    average-landed-cost figure (or a manual-override/backorder-carried-forward cost, an edge-case
    override preserved from the legacy system); Margin Percentage is sign-negated for return-type codes.
  - This margin computation is treated as authoritative by at least one other cross-module consumer (a
    rebate/promotion-tracking data structure reads the freshly-computed Margin Dollars value immediately
    after it is set) — confirming it is not a throwaway figure.
- **Inputs**: sale price, core price, buyout cost, average-landed-cost — the actual derivation of these
  upstream inputs happens further upstream in SalesOrder's own pricing flow, explicitly out of this
  SearchLineItem-scoped spec's budget.
- **Output**: `extsellprice`, `extproductcost`, `extcoresell`, `margindollars`, `marginpercent` on the
  new SearchLineItem row.
- **Rounding behavior**: not documented beyond the "rounding/docket-difference correction" on Extended
  Sellprice; no further rounding rule was traced.

### Stage 2 — The module's one self-contained calculation: inline-edit divisions

Two special-cased inline-edit fields, both live and load-bearing, each contain one unguarded division:

**2a. Extended Product Cost edit → Margin Dollars / Margin Percentage recompute.**
- Inputs: the row's current Extended Sellprice (already loaded, not re-read from stored parent context),
  and the newly submitted Extended Product Cost.
- Formula: Margin Dollars = `extended sell price − extended cost`; Margin Percentage =
  `(extended sell price − extended cost) / extended sell price × 100`.
- Output: Margin Dollars, Margin Percentage.
- **Division-by-zero condition and confirmed effect**: if the row's extended sell price is zero (or
  unset), the percentage division divides by zero. Under this database's actual (non-strict)
  configuration, the target column is decimal-typed, so a non-finite division result is **silently
  coerced to zero** rather than persisting as a visibly-broken value — arguably a *worse* outcome than
  an obviously wrong value, since a silent zero is more easily mistaken for a legitimately-zero margin by
  downstream reporting. Margin Dollars itself is unaffected (plain subtraction, always finite) — only
  Margin Percentage corrupts.
- **Live-data grounding**: 38 of 7,074 rows have Extended Sellprice at zero/unset at blueprint time.

**2b. Extended Original Product Cost edit → Original Product Cost recompute, bypasses the entity save.**
- Inputs: the newly submitted Extended Original Product Cost, and the row's Shipped Qty.
- Formula: `Original Product Cost = Extended Original Product Cost ÷ Shipped Qty` — the inverse of Stage
  1's extension arithmetic, for the pre-supersession "original" cost field.
- Output: Original Product Cost.
- **Division-by-zero condition and confirmed effect**: if Shipped Qty is zero or unset, this division
  also divides by zero. Unlike 2a, this result is bound directly as a query parameter to a direct
  database write, not passed through any formatting step — and per the same DB-grounded finding, the
  write succeeds with the target column silently set to zero rather than erroring or leaving the column
  unchanged. **This write also bypasses the entity's normal save mechanism entirely** — it runs
  unconditionally and immediately, before the same request's normal save call — meaning a bad divide is
  written to the table immediately, with no transactional tie to the save that follows it.
- **Live-data grounding**: 31 of 7,074 rows have Shipped Qty at zero/unset at blueprint time.

**2c. Neither branch validates the submitted value is numeric.** Both special-cased edits cast the
submitted value with a silent numeric coercion rather than validating it — a malformed (non-numeric)
submission for either field silently becomes zero rather than being rejected, compounding the
division-by-zero risk with a second, independent bad-input route (SLI-RULE-013).

### Fields confirmed vestigial, not computed despite being catalogued as derived

**Total Before** and **Total After** are described in the module's own field catalog as system-derived
line totals ("before/after some adjustment"), but the blueprint's calculation-focused pass discovered
both are **hardcoded to an empty string on every finalize-time write** — never actually computed by any
traced code path. A new implementation should not build a calculation for these two fields without first
confirming with a subject-matter expert what they were originally intended to compute; the blueprint
found no evidence of an intended formula anywhere across its eight analysis passes.

### No margin/GP recompute exists anywhere else in the module's own files

The module's entity class and its shared search-utility library were checked for any margin/gross-profit
arithmetic; every reference found in either file is a column-name reference (sort fields, search-field
labels, listview column mappings), never an arithmetic expression. The module's shared search/listview
infrastructure treats Margin Dollars/Margin Percentage purely as opaque, pre-computed, sortable/
searchable/exportable columns.

### A confirmed formula-level divergence between two independent writers of the same fields

**The single most consequential financial-logic finding in this module's blueprint.** Beyond
SalesOrder's finalize routine, a second, genuinely independent process — a scheduled batch script that
backfills buyout-line costs once they become known after finalize — recomputes the same Extended
Sellprice/Extended Product Cost/Extended Coresell/Margin Dollars/Margin Percentage field set using its
own independent restatement of the formula, rather than calling the same formula finalize itself used.

Three concrete divergences (not merely a hypothetical race) were confirmed:
1. **The extension basis differs** — the batch script explicitly extends its margin-dollar figure by
   multiplying by ship quantity; finalize's own buyout-branch formula does not structurally mirror that
   same explicit extension step (whether this is a bug, or whether finalize's inputs are already an
   extended value by the time they reach the formula, was not fully resolved).
2. **The batch script never branches on the account's core-tracking type**, unlike finalize's formula,
   which has a distinct, cheaper calculation path for "Count"-type accounts.
3. **The batch script recomputes from the row's *current* stored price/cost columns, not the original
   finalize-time inputs** — if any of those columns were edited by any other path (including the
   module's own inline-edit endpoint) between finalize and the batch script's same-day run, the recompute
   silently incorporates that edit into a formula the original finalize computation never saw applied to
   those specific input values.

The two writers are time-sequenced (finalize first, batch backfill same day), so they do not race in the
classic concurrent-write sense, but the batch script's independent restatement is demonstrably not
equivalent to finalize's own branched formula for at least the "Count"-coretype case and the
extension-basis question. A related, separately-owned tax-dollar recompute script and a fourth
Customer-PO-sync writer are disjoint field sets and do not add to this conflict — **only two writers
genuinely conflict on the same field set**, a correction the blueprint itself made mid-series after an
earlier pass initially (and incorrectly) framed this as a four-way conflict.

## Server-Side Recomputation Requirement

Any value derived by this pipeline must be recomputed server-side at every consuming step, never
accepted as caller-supplied input. This is the standard fix for the "client-trusted total" class of
risk. Concretely, per the module's governing architectural requirement R2 (a single authoritative
calculation service):

- **Exactly one calculation service should compute Extended Sellprice/Extended Product Cost/Extended
  Coresell/Margin Dollars/Margin Percentage**, branching on transaction code and account core-type
  exactly as documented in Stage 1 above (the fuller, correctly-branched version — not the batch
  script's incomplete restatement). Both the finalize-time write and any later same-day cost-backfill
  process should call this one service, not maintain independent formula restatements. This closes the
  confirmed divergence above by construction.
- **Both division-by-zero risks (Stage 2) should be closed with explicit guard clauses that reject the
  edit, not silently coerce to zero.** The legacy system's confirmed behavior (silent zero) is a worse
  outcome than an obviously-broken value, since it is more likely to be mistaken for a legitimate figure
  by downstream reporting — a new implementation should surface a real validation error instead.
- **Original Product Cost's write should no longer bypass the normal save/aggregate boundary.** Both
  special-cased inline-edit fields should be written through the same command/aggregate boundary as
  every other field, closing the "unconditional pre-save side-effect write with no transactional tie to
  the entity save that follows it" risk by construction.
- **No calculation should be invented for Total Before/Total After** without first confirming with a
  subject-matter expert what they were originally meant to compute — there is no evidence anywhere in
  the blueprint of what that calculation should be.
