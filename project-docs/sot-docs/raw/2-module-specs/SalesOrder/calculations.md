# SalesOrder — Calculations

> Keep this file even if this module has no computed/derived logic — state that explicitly below
> rather than deleting the file. A missing file can't be told apart from "nobody got to it yet";
> an explicit "no calculation logic exists in this module" statement can't be. See
> `_deviations-from-original-template.md` in this folder for why.

## Applicability

This module clearly has computed/derived logic: an order-total pricing pipeline covering line
pricing, coupon/promotion discounts, per-line tax, order-level rounding correction, subtotal/total
aggregation, deposit/credit netting, plus finalize-time cost/margin resolution. Source:
`docs_from_blueprint/module/SalesOrder/05-financial-pricing-logic.md`, ultimately derived from
`blueprint/module/SalesOrder/`.

**Governing finding carried forward as-is (do not treat as resolved):** the legacy system computes
an order's final total via two structurally different mechanisms for what is meant to be the same
number, and this is the blueprint's most severe finding (Critical Risk #2) — these two mechanisms
can disagree with no reconciliation step anywhere between them:
- **Path A — live working-total recalculation.** While an order is still in a working (Pending)
  state, every line-item add/edit/tax-change/coupon/rounding action triggers a full recomputation
  of the order's totals freshly from the current line-item and header data. This is the legacy
  system's live, always-correct-by-construction total display.
- **Path B — finalize-time total write.** At the moment an order is finalized, the total is
  instead written verbatim from a value submitted by the finalize request itself, with no
  arithmetic and no cross-check against the order's actual line items at that point in the traced
  code. Whatever the client's last computed total was — potentially stale, potentially altered —
  becomes the permanent, locked total, and every subsequent printed output (all ten document
  types) reads that same stored, unverified value with no recomputation anywhere between finalize
  and print.

The pipeline documented below is Path A's shape — the correct-by-construction path — since it is
the one the source documents in full formula detail. See "Server-Side Recomputation Requirement"
below for how a new implementation must apply this pipeline at finalize time as well, closing
Path B's gap rather than reproducing it.

## Calculation Pipeline

Ordered stages, as documented (Path A shape):

1. **Resolve line sell price.**
   - Inputs: manual entry, a min-price-list lookup, or a gross-profit/markup-derived value.
   - Formula: whichever of the three sources applies for the line (not further specified in the
     source).
   - Output: the line's sell price.

2. **Apply per-line coupon/promotion discount.**
   - Inputs: a discount ratio computed by the calling context — the exact origin of this ratio was
     never traced in the source blueprint (flagged open; preserve as unresolved).
   - Formula: the discount ratio redistributes the line's extended price, applied only across
     eligible sale lines (not service/labor lines, buyout lines, or return lines), using a
     last-line "penny-plug" pattern (see rounding note below).
   - Output: discounted extended line price.

3. **Compute per-line tax.**
   - Inputs: sell price × quantity × up to three tax rate components (e.g. state/local/an
     additional jurisdiction-specific rate).
   - Formula: each of the up to three tax-rate components is applied to the line's extended sell
     price and rounded to the cent independently, before summing — not summed first and rounded
     once. This is an intentional, documented penny-rounding correction, used identically in both
     the live working-total calculation and (independently re-implemented) in the finalize-time
     tax block.
   - Output: per-line tax total.
   - Rounding: round each of the up to three components to the cent, then sum. Preserve this
     rounding order exactly in any reimplementation — simplifying to "sum then round" will visibly
     shift totals by pennies across the existing order base.

4. **Apply order-level rounding correction** ("docket rounding" / "contract-amount rounding"),
   when eligible (governed by SO-VAL-111 to SO-VAL-117).
   - Inputs: the delta between the order's naturally-computed total and a target docket/contract
     amount.
   - Formula: the delta is distributed proportionally across eligible lines (weighted by each
     line's share of total sell price, net of the tax portion of that share), with a final
     "penny-plug" step that stamps any remaining sub-cent residual onto the single largest eligible
     line's rounding-correction field, so the order's total lands exactly on the target amount.
   - Output: a per-line rounding-correction value.
   - Note: this formula is implemented twice, independently, in the legacy system — once for
     docket rounding, once for contract-amount rounding. The source flags this duplication itself
     as a maintainability risk (they currently agree, but any future edit to one without the other
     would silently reintroduce a total-mismatch defect). A new implementation should implement
     this once, shared by both entry points.

5. **Compute each line's extended total.**
   - Inputs: sell price, ship quantity, that line's stored rounding correction.
   - Formula: sell price × ship quantity, rounded to cents, less that line's stored rounding
     correction.
   - Output: line extended total.

6. **Sum the order subtotal.**
   - Inputs: all line extended totals.
   - Formula: sum of all line extended totals, net of rounding corrections.
   - Output: order subtotal.

7. **Compute the order total.**
   - Inputs: order subtotal, total tax.
   - Formula: subtotal plus total tax.
   - Output: order total.
   - Rounding: rounded to cents.

8. **Net out deposits and credits.**
   - Inputs: Total, Deposit Amount, Gift Card Total Amount, COD Return Credit Amount.
   - Formula: **Final Total = Total − Deposit Amount − Gift Card Total Amount − COD Return Credit
     Amount.** This is the canonical, documented formula for the order's final total, and — per
     the server-side recomputation requirement below — should become the only formula for this
     value in a new implementation, computed at every point a total is needed rather than only
     while the order is in a working state.
   - Output: final total.

9. **Apply deposit/ROA funds** against the order.
   - Inputs: deposit/ROA funds recorded against the order.
   - Formula/guards: respects a double-application-prevention check (live-subtracting amounts
     already earmarked by other in-flight, not-yet-finalized orders against the same deposit
     source) and a hard cap at the order's total.
   - Rounding/edge behavior: excess is silently truncated in the legacy system (per SO-VAL-118/119)
     — preserved here as a documented legacy behavior, not necessarily the target behavior for a
     new implementation (source does not state a resolution).
   - Output: applied deposit amount.

10. **Persist** the computed totals.

**Finalize-time cost/margin resolution** (separate from the total pipeline above, computed per
line at finalize time via a branching set of rules fully catalogued as SO-VAL-025 through
SO-VAL-040): FIFO or LIFO lookback depending on the location's configured cost basis,
buyout-cost resolution matched against purchase-order detail records, a manual cost-override
escape hatch, and an extended-cost fallback chain for non-physical/service products. Two concrete
formulas are confirmed directly in the source:
- **Core-charge margin** = core price − core cost (forced to zero for accounts whose
  core-tracking type is "Count").
- **Buyout-line margin** = sale price + core price − buyout cost − core cost (core margin
  similarly dropped for "Count"-type accounts).

No order-level "total margin" aggregation was found anywhere in the traced calculation code —
margin appears to be computed and persisted per line only; whether a rollup exists elsewhere (e.g.
in a downstream reporting layer) was not confirmed. Preserved as unresolved.

**Freight, labor, and misc-fee accumulation**: within the finalize line-item loop, lines are
sorted into freight/labor/other buckets by line-code, not by a dedicated line-type field. The
header-level Freight, Labor, Misc Fee, and Delivery Charge fields, however, are written verbatim
from the finalize request with no server-side recomputation from the summed line-item buckets
found anywhere in the traced code — flagged as a second reconciliation gap alongside the main
total finding, not yet confirmed to have an active defect. The mandatory-recomputation requirement
below should extend to these header-level charge fields as well, not just the grand/final total.

## Server-Side Recomputation Requirement

This is the direct architectural response to the Critical risk of a client-trusted total (§5.1's
Path A/Path B divergence above), and restates the module's "totals are always computed, never
accepted as direct input" governing architectural requirement at the level of implementable
detail. **Totals must never be accepted as direct client input; they must always be recomputed
server-side.** This fixes the specific risk that a finalize request can write a stale or altered
client-submitted total verbatim, with no arithmetic or cross-check against the order's actual line
items — exactly what the legacy system's Path B does today, and exactly the gap that produced this
module's most severe (Critical) finding.

Specifically:
- **No operation may accept a total (grand total, subtotal, or final total) as a
  directly-settable input, ever, at any point in the order's lifecycle.** The only way any of
  these values changes is by re-running the calculation pipeline (above) against the order's
  current, persisted line-item, tax, and deposit state.
- **The pipeline runs at every point a total is needed**: on every line-item/coupon/rounding/
  deposit edit while the order is in a working state (this part of the legacy design — Path A's
  always-live recompute — was already correct, and should be kept); at finalize, where the legacy
  system's client-trust gap is replaced by a mandatory server-side recomputation (the actual fix);
  and implicitly at print time, since every one of the ten outputs should read an
  already-server-computed, already-correct persisted total — there should be no separate
  "recompute at print" step needed, because finalize already guarantees correctness.
- **Tax at finalize should be recomputed from the order's current persisted line-item state**, not
  from values submitted in the finalize request — closing the legacy system's confirmed practice
  of re-implementing the same tax formula independently against client-submitted, potentially-stale
  per-line values rather than calling the same shared calculation used everywhere else.
- **A finalize attempt whose client-displayed total disagrees with the server-recomputed total
  should be surfaced to the user as a validation condition requiring review before commit** — never
  a silent overwrite in either direction, and never a client-trusted write to a locked, permanent
  record.
- This requirement extends to the header-level Freight, Labor, Misc Fee, and Delivery Charge
  fields noted above, not only the grand/final total, since the source flags their current
  verbatim-write behavior as the same class of reconciliation gap.
