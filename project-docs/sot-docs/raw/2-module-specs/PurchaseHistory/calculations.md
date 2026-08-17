# PurchaseHistory — Calculations

> Keep this file even if this module has no computed/derived logic — state that explicitly below
> rather than deleting the file. A missing file can't be told apart from "nobody got to it yet";
> an explicit "no calculation logic exists in this module" statement can't be. See
> `_deviations-from-original-template.md` in this folder for why.

Source: `docs_from_blueprint/module/PurchaseHistory/05-financial-pricing-logic.md`, itself traced to
`blueprint/module/PurchaseHistory/04-financial-pricing.md`.

## Applicability

This module has one computed/derived field, `total_activity`. It has **no money-valued (price/cost/margin)
fields at all** — everything in this module's own calculation scope is pure quantity arithmetic
(addition/subtraction), not currency arithmetic.

## Calculation Pipeline

**The one calculated field — and the cleanest cross-writer formula-agreement finding in the module series so
far.** Unlike SalesHistory's own confirmed three-way divergence across its equivalent field's multiple
writers, this module's three confirmed live runtime writers (all inside the sibling PurchaseOrder module)
compute the identical formula, byte-for-byte:

```
total_activity = buy_qty − return_qty
```

Net purchase activity = quantity purchased minus quantity returned, for a given (product number, line code,
week, year, location) bucket — the two-counter purchase-side equivalent of SalesHistory's own six-term
formula, with no `abs()` wrapping anywhere in any of the three live writers' own restatements.

**Inputs**: `buy_qty`, `return_qty` (both cumulative counters on the aggregate row).
**Formula**: `total_activity = buy_qty − return_qty`.
**Output**: `total_activity` (persisted on the same row).
**Rounding behavior**: none documented — pure integer/quantity subtraction, no fractional rounding rule
found in the source blueprint.

**The three live writers — a genuinely uniform accumulate-delta pattern, not three independent
restatements.** All three confirmed writers branch on the purchase-order line's own transaction code: a
purchase-type code adds the line's quantity to the buy counter; a set of return-type codes add it to the
return counter instead. `total_activity` is always freshly recomputed from the two just-updated counters, in
every one of the three writers. Unlike SalesHistory's own new-row branch (confirmed structurally incomplete
relative to its own canonical formula), PurchaseHistory's three writers' own new-row branches are fully
consistent with the same two-term formula their own existing-row branches use — no new-row-vs-existing-row
formula divergence anywhere in this module's confirmed writer set. Two of the three confirmed writers are, in
fact, near-verbatim duplicate implementations of the same function under two different names/files — flagged
as a latent maintenance/drift risk even though no divergence has yet occurred.

**A narrow, migration-script-only divergence — not a live-runtime risk.** One historical, one-off
migration/backfill utility (`db_utilities/load_data_ph.php`) restates the same formula with a narrow
divergence: it wraps the return-quantity term in an absolute-value operation before subtracting, where the
three live runtime writers subtract the raw, unwrapped value. For any row where the return-quantity counter
is stored as a negative value (nothing in the schema constrains it to be non-negative), this migration
script's own recompute and the three live writers' own recompute would produce different results for the
identical stored counter pair. This is a migration/one-off-utility-only divergence, not a live-runtime
multi-writer race — flagged for a migration-audit track, not counted among this module's live-runtime risk
findings.

**No division-by-zero risk exists anywhere in this module's calculation surface** — the formula is pure
addition/subtraction; there is no divisor anywhere in any of the three confirmed writers' own computation,
nor in the migration script's own balancing statement.

## Server-Side Recomputation Requirement

Any value derived by this pipeline must be recomputed server-side at every consuming step, never accepted as
caller-supplied input. This is the standard fix for the "client-trusted total" class of risk, and it is
already a confirmed gap in the legacy system: the legacy `DetailViewAjax.php` inline-edit endpoint can
overwrite `total_activity` directly with no recompute, silently desynchronizing it from `buy_qty −
return_qty` until the next PurchaseOrder-side accumulator write happens to touch the same key (rule
PH-RULE-013).

For a new implementation:
- The new canonical formula preserves the legacy formula's exact shape unchanged — the formula is already
  uniform across all three legacy writers, so there is no "pick a winner" reconciliation decision to make.
- One authoritative service should be the only code that reads the current aggregate row for a key, applies
  a delta, and recomputes `total_activity` — called by every event type (the accumulate-delta events from
  the three legacy call sites' successors, and the manual-correction event) — closing off the exact drift
  mechanism (copy the accumulate-delta function into a new file whenever a new purchase-order-side flow
  needs it) that this codebase's own historical practice already demonstrates it is prone to (the two
  near-verbatim duplicate functions found among this module's own three confirmed writers).
- A manual correction should always trigger a full recompute of `total_activity`, regardless of which field
  was corrected — closing the confirmed desynchronization gap the legacy system's own inline-edit endpoint
  has today.
- The transaction-code-to-counter mapping the three legacy writers already agree on should be preserved
  exactly, but the new command layer's transaction-code parameter should be a strictly-typed enumeration
  with an explicit rejection for any unrecognized value — closing the legacy system's own confirmed gap
  (none of the three writers' own branching carries a final catch-all case) by construction.

## Open items

- Whether the migration script's own divergent formula has ever actually produced a different result than
  the three live writers' own formula would compute for the same row — requires either a live negative-value
  row or a controlled reproduction, not confirmed in the source blueprint.
- Whether the return-quantity counter is ever legitimately negative in this business domain — not resolved
  from static reading alone.
- What happens on an unrecognized transaction-code value at any of the three confirmed writer call sites —
  not traced to its ultimate save-time effect in the source blueprint.

(`docs_from_blueprint/module/PurchaseHistory/05-financial-pricing-logic.md` §5.1-5.6)
