# Location — Calculations

> Keep this file even if this module has no computed/derived logic — state that explicitly below
> rather than deleting the file. A missing file can't be told apart from "nobody got to it yet";
> an explicit "no calculation logic exists in this module" statement can't be. See
> `_deviations-from-original-template.md` in this folder for why.

Source: `blueprint/module/Location/04-financial-pricing.md` via
`docs_from_blueprint/module/Location/05-financial-pricing-logic.md`.

## Applicability

Applies. Location has no order-total-style "pricing pipeline" of its own the way SalesOrder does, but
it owns a real demand-forecasting, reorder, lost-sale, and supersession-merge **calculation library**
built on its formula-field engine — four loosely-related calculation surfaces:

1. Demand/lead-time formula fields — recomputed synchronously on every Location save.
2. Reorder point / reorder quantity — **not actually computed inside this module**; Location stores
   the output field and eligibility flag, and supplies the demand-forecast inputs a separate module's
   report/cron consumes.
3. Lost-sale and false-loss ("Disqualified Sale") tracking — accumulate-then-promote, not detection.
4. Part-supersession merge arithmetic — already catalogued as rules LOC-RULE-024-026; this file adds
   the arithmetic.

**No gross-profit/margin/inventory-valuation calculation exists anywhere in this module.** QoH is a
pure quantity number here; every dollar figure it feeds (cost-of-goods, inventory valuation, margin)
is computed elsewhere, with this module supplying only the raw quantity and cost fields as read-only
inputs.

## Calculation Pipeline

Recomputed as one orchestrated pass on every Location save (the same eight formula fields, one call
site).

1. **Average Daily Demand**
   - Inputs: sale-history activity over a trailing lookback window (default 26 weeks, configurable
     per product/branch).
   - Formula: total sale-history activity in the window, divided by the window length in weeks,
     divided by 7.
   - Rounding/floor: floored at a small nonzero minimum when the raw result would otherwise round
     away to exactly zero (a deliberate "keep it nonzero" clamp, confirmed).
   - Note: the query's lookback window is confirmed slightly wider than the configured week-count on
     its upper bound — inferred as intentional slack to catch same-week sales-history rows whose
     end-date hasn't rolled over yet, not independently re-confirmed against the sales-history
     row-generation cadence.

2. **Average Days Between Sales**
   - Inputs: the last N sale-history dates (N defaults to 6, configurable).
   - Formula: sum the gaps between consecutive sales, divide by the **configured** N — not the actual
     number of rows found.
   - Confirmed bias: a product/branch with sparse sales history has its average silently deflated
     toward zero rather than computed from the transactions that actually exist. Flagged for
     subject-matter-expert statistical sign-off, not silently corrected, in `build-guidance.md`.

3. **Average / High Quantity Sold**
   - Average Quantity Sold shares the identical "divide by the configured N, not rows found" bias
     above, with no floor/zero-guard at all.
   - High Quantity Sold is a true maximum over the same lookback window with no averaging bias.

4. **Projected Next Use Date**
   - Delegated to a database-level stored calculation, not independently re-derivable from
     application code. A dead (commented-out) prior application-level version shows the formula's
     intended shape: last sold date plus (average days between times a projection factor), walked
     forward to the next date outside a configured forecast-blackout window — inferred from dead
     code, not confirmed against the live calculation's actual body.

5. **Average Lead Time**
   - Inputs: the last N PO-receipt and Store-Transfer-receipt event pairs (N defaults to 6,
     configurable).
   - Formula: sum the gap between order and receipt, divide by the **actual** number of events found
     — this formula does **not** share the sparse-history bias the sibling functions above have (an
     inconsistency across formula functions in the same calculation library).
   - Fallback: when no receipt history exists at all, a hard-coded fallback value is used — a
     magic-number default, not a computed value.

6. **Projected Next Order / Next Receipt Date**
   - Inputs: Last PO Number, Average Lead Time.
   - Formula: walked forward via a "next working day" helper that, despite its name, does not check
     day-of-week at all — it decrements its remaining margin only on days that fall inside the
     product's configured Forecast Blackout window, never on weekends, despite computing (and
     discarding) a day-of-week value on every iteration. A confirmed name/behavior mismatch, not a bug
     per se — the function skips *blackout* days, not *weekend* days.

7. **Reorder point / reorder quantity** — **not computed inside this module.** The live computation
   lives in a report/batch tool owned by a different module (Customreport), which reads Location's
   Reorder eligibility flag, Primary Supplier, Days Inventory, plus request-supplied filters as
   inputs, and, on a cron-driven run, writes the result back into Location's own table onto whichever
   field the requesting form selected — not a fixed target column. The actual reorder-point/
   reorder-quantity arithmetic itself was never traced past the calculating module's own
   request-parameter-parsing header — a confirmed gap, flagged in `risks-and-open-questions.md`.

8. **Lost-sale pipeline** (accumulate then promote)
   - Accumulate: a manual, counter-person-triggered event (a point-of-sale/order-entry "record this
     as a lost sale" action submitting product, account, quantity, reason). The accumulator write
     reads the current accumulated lost-sale quantity, adds the new quantity, then (if a configured
     lost-sale factor is set) multiplies the whole running total by that factor again on every single
     event, not just the newly-added quantity portion. For any factor other than 1, repeated events on
     the same product/branch compound the factor multiplicatively across calls (e.g. two events of
     quantity 1 each with a factor of 1.5 yield 3.75, not 3). Confirmed by direct read of the
     arithmetic, flagged as a likely unintended compounding bug, not verified against a live repro.
   - Promote: a scheduled cron (LOC-RULE-027) folds lost-sale log rows where the accumulated figure is
     strictly positive into the sales-history activity figure Average Daily Demand reads — a lost sale
     is treated as a positive contribution to demand (added, not subtracted).

9. **False-loss ("Disqualified Sale") pipeline** (accumulate then promote, opposite sign)
   - Accumulate: a counter-person checkbox on the Sales Order line-item entry screen ("DS" —
     "Disqualified Sale: Do not count toward sales history"). At order finalize, if checked, the
     shipped quantity is accumulated (not overwritten) into the product/branch's false-loss figure.
   - Promote: structurally parallel to lost-sale promotion, but sales-history's `totalactivity` figure
     **subtracts** the accumulated false-loss quantity, while "sell quantity" (written at finalize,
     independently of the DS flag) already includes the disqualified line's quantity — so a
     disqualified sale's quantity is present in raw sell-quantity reporting but excluded from the
     demand signal every forecast/reorder calculation reads.
   - Known bug, re-verified inert: the false-loss promotion function's own bookkeeping write targets a
     table name that was never created (LOC-RULE-028) — confirmed genuinely inert, since the real
     false-loss values are already written to sales history before this line runs and nothing
     downstream ever re-reads the flag it fails to set.

10. **Part-supersession merge arithmetic** (LOC-RULE-024-026)
    - Quantity merge ("merge both"): for each branch where the superseded product has a row, the
      superseding row's QoH is increased by the superseded row's QoH (raw additive write, no cap, no
      floor), and the superseded row's QoH is reset to zero. **No statement reads, writes, or
      references any cost field** — no weighted-average recomputation, no cost-basis blending.
    - Quantity discard ("remove old"): superseded product's QoH is zeroed at every branch with no
      merge into anything.
    - Cost/pricing transfer: a **separate** function, gated on a *different*, independently-settable
      per-branch flag than the one gating the quantity merge. Every cost/margin field it touches is a
      **direct overwrite** from the superseded product onto the superseding product — not a merge or
      blend; the superseding product's prior value is discarded.
    - Conclusion: **there is no configuration state in which the resulting
      on-hand-quantity-times-weighted-average-cost figure is guaranteed to reflect a coherent,
      reconciled cost basis after a supersession event.** Flagged for subject-matter-expert sign-off
      in `build-guidance.md` (Decision D4).

## Server-Side Recomputation Requirement

Every formula field in the pipeline above (Average Daily Demand, Days Inventory, Avg Lead Time, Avg
Days Between Sales, Avg/High Qty Sold, Projected Next Use/Order/Receipt Date, Total Available) must be
recomputed server-side on every triggering save/event, never accepted as caller-supplied input — this
already matches the legacy system's own orchestration (recomputed as one server-side pass on every
Location save), so this requirement carries the existing behavior forward rather than changing it. The
one field the legacy system does trust as an *external* write-back (the reorder-point suggestion
Customreport writes onto Location's own table) is flagged in `build-guidance.md` (Decision D6) to be
brought inside this module's own boundary specifically because that external write-back is a
bounded-context violation, not because server-side recomputation itself is in question.
