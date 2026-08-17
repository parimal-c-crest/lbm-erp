# PurchaseLineItem — Calculations

> Keep this file even if this module has no computed/derived logic — state that explicitly below
> rather than deleting the file. A missing file can't be told apart from "nobody got to it yet";
> an explicit "no calculation logic exists in this module" statement can't be. See
> `_deviations-from-original-template.md` in this folder for why.
>
> Source: `docs_from_blueprint/module/PurchaseLineItem/05-financial-pricing-logic.md`, itself traced to
> `blueprint/module/PurchaseLineItem/04-financial-pricing.md`.

## Applicability

**Applicable, but narrowly.** PurchaseLineItem's own files perform zero arithmetic of any kind — the
module's own inline-edit endpoint performs no calculation at all, and (per `business-rules-and-validation.md`
PLI-RULE-010) does not even reach a real Purchase Line Item row in the first place. The entity's own
save-hook logic computes nothing beyond looking up an existing vendor-number value; it performs no
multiplication, division, or margin calculation of any kind.

**All of this module's real arithmetic — the purchased-cost extension and the core-cost extension, `unit
cost × quantity` — is computed independently by each of six confirmed writers**, none of which call a
shared calculation function. This is the module's headline calculation finding, documented in full below.

**No margin, gross-profit, or markup calculation exists anywhere in this module.** A full sweep of the
module's own files for margin/profit/markup-shaped logic returns zero matches — this module carries
purchased cost and its extension only, never a sell-side comparison. Whether margin/gross-profit
calculations that *consume* this data exist elsewhere in the codebase (e.g. in PurchaseOrder's own
reconciliation/costing flows) was not confirmed in the source blueprint (see Open Questions).

**No division exists anywhere in this module — no divide-by-zero risk class applies here.** Unlike some
sibling modules, a full sweep of every arithmetic expression across all six writer sites and this module's
own files finds zero division operations of any kind — every formula in this module is multiplication only
(cost × quantity).

## Calculation Pipeline

### The six independent restatements of the same extension formula

All six writers compute the identical formula shape — `extension = unit value × quantity` — but with
genuinely different decimal-precision choices and, in one case, a genuinely different calculation shape:

| Writer | Cost-field precision | Extension-field precision | Notes |
|---|---|---|---|
| PurchaseOrder's primary finalize-time writer | 4 decimal places | 3 decimal places | The primary writer, triggered at PO-status transition. Also carries a UOM-driven quantity-basis branch — see below. |
| PurchaseOrder's append-line writer | 3 decimal places | 3 decimal places | Fires when additional lines are appended to an in-flight PO. |
| PurchaseOrder's reverse-return-PO writer | 3 decimal places | 3 decimal places | A near-duplicate of the append-line writer's own formula, not shared with it. |
| The shared cost-extension helper function | 3 decimal places | 3 decimal places | The one writer that is a genuinely reusable, shared function rather than an inline restatement — but it is reachable from exactly one call site, so it functions as a sixth restatement in practice, not a de-duplication across all six. |
| Receiving's line-append flow | N/A (passes raw values through to the shared helper above, which applies the formatting) | — | Calls the shared helper immediately above. |
| POReconciliation's cost-variance-correction update | No explicit rounding at all — the raw computed value is bound directly as the update parameter, with precision left to the database column's own storage-type truncation/rounding, not explicitly formatted by application code the way every other writer explicitly rounds before the value ever reaches the database | — | The one writer that both reads the existing row and writes it back, matched by PO number + line code + product number rather than the row's own identifier. Found during cross-module investigation, not in the initial writer sweep. |

**The one genuine formula-*shape* divergence, not merely a precision difference**: the primary
finalize-time writer's own cost fields carry one more decimal place of precision than every other
writer's, and its own cost extension is computed at that higher intermediate precision before being
rounded down to the lower, standard precision for storage — while every other writer computes and stores
at a uniform precision throughout. For a row where this precision difference crosses a rounding boundary,
the same underlying cost-times-quantity pair could persist an extension value that differs by a fraction
of a cent depending on which of the six writers touched it — a real, confirmed formula-divergence risk,
narrow in practical dollar impact given the sub-cent scale, but structurally the same class of risk
SearchLineItem's own blueprint documented for its own multi-writer fields.

The reconciliation writer's own divergence is of a different kind than the other five's precision choices:
it skips explicit rounding entirely, relying on whatever implicit rounding the database column's own
storage type applies. Whether that implicit rounding produces an identical result to the other writers'
explicit rounding for the same inputs was not tested in the source blueprint (Open Question).

### The primary writer's alternate quantity basis for unit-of-measure-driven lines

For lines using a non-default purchasing unit of measure, the primary finalize-time writer **overwrites**
the quantity, cost, and cost-extension fields with unit-of-measure-adjusted values, computed *after* the
standard-basis assignment earlier in the same function — the unit-of-measure-adjusted values win for these
lines. Critically, **the core-cost extension is not recomputed in this branch** — it retains whatever
value the standard-basis assignment produced moments earlier.

This means a unit-of-measure-driven line's purchased-cost extension and core-cost extension can end up
computed on **two different quantity bases within the same row** — the unit-of-measure-adjusted quantity
for the purchased-cost extension, the original quantity for the core-cost extension. This is a real,
confirmed intra-row inconsistency, not merely a cross-writer one: it doesn't require two different writers
to touch the row, only one unit-of-measure-driven write from this specific writer. No other writer has an
equivalent branch. The upstream logic that populates the unit-of-measure-adjusted values in the first
place was not traced further in the source blueprint — flagged as belonging to a unit-of-measure-focused
pass on PurchaseOrder/Products.

### The total-square-footage field — a conditional pass-through, not a calculation

One field on this entity (total square footage represented by the line, for square-foot-priced non-stock
products) is not a computation at all — it is a conditional copy of an already-computed upstream value,
gated on the product being flagged non-stock. The primary finalize-time writer is the only one of the six
writers that touches this column at all; the other five leave it at its schema default.

## Server-Side Recomputation Requirement

Any value derived by this pipeline must be recomputed server-side at every consuming step, never accepted
as caller-supplied input. This is the standard fix for the "client-trusted total" class of risk, and here
it takes a specific, stronger form: the **6-writer computed-column redesign**, restated here in full
because it is one of this module's three headline design decisions (the others being the collapsed
group-relation tables and the LoadList.php PK-naming fix — see `entities-and-fields.md`):

- **No writer may independently restate the `cost × quantity` extension formula.** The only way either
  extension field's value is produced is by calling one shared calculation function, regardless of which
  of the module's six legacy trigger points originates the write.
- **The function accepts exactly one quantity basis per call.** This closes the intra-row
  dual-quantity-basis bug (above) by construction — there is no code shape in which the two extension
  fields on one row could be computed from two different quantities, since the function signature only
  accepts one.
- **A single, explicit, always-applied rounding policy replaces the six writers' own differing choices.**
  The source blueprint's own recommendation is to standardize on the lower, 3-decimal-place precision that
  five of the six legacy writers already use, treating the primary writer's own 4-decimal-place cost
  fields as the legacy outlier to reconcile toward, not the new standard.
- **At the schema level, the extension columns are not writable inputs at all** — they are
  database-computed (generated/derived) from the stored `purchased_cost`/`core_cost`/`purchased_qty`
  columns (see `entities-and-fields.md`'s recommended rewrite schema), so a seventh writer added later
  structurally cannot restate the formula independently, because there is no column for it to write to.
  This is the schema-level backstop for the same application-layer decision above — the two work together,
  not as alternatives.
- **The six *event sources* (PO finalize, PO append, PO reverse, Receiving append, ASN backfill,
  POReconciliation correction) are not collapsed into one** — that would contradict the module's own
  multi-writer business reality (R1 in `entities-and-fields.md`) — but they are collapsed to **one
  calculation path**: every event source calls the same projection function, and that function is the only
  code permitted to write `purchased_cost`/`purchased_qty`. POReconciliation's read-then-write correction
  remains a legitimate second call into that same function, not a seventh independent formula restatement.
- **Historical data reconciliation is an explicit, open decision, not a default.** Migrating existing rows
  whose values were produced by more than one of the six legacy writers' own divergent formulas requires an
  explicit choice — re-derive every historical row through the new shared calculation (most consistent, but
  requires each row's original per-writer inputs to still be reconstructable) versus carrying forward
  whichever value is currently on disk (safer if inputs can't be reliably reconstructed, but perpetuates
  the legacy divergence). This is flagged as a migration-blocking open question in the source blueprint,
  not resolved here.

## Open Questions

- Whether the precision and unit-of-measure-basis divergences documented above have ever produced a
  user-visible or report-visible discrepancy on a live row — the preconditions are confirmed to exist in
  the code; whether any specific live row has actually been touched by more than one writer (making the
  divergence observable) was not queried in the source blueprint.
- The upstream derivation of this module's own cost inputs (from PurchaseOrder-owned staging data) is
  itself not re-traced to its own origin here — belongs to a PurchaseOrder-pricing-focused investigation,
  per that module's own spec.
- Whether any downstream reporting module computes a margin/gross-profit figure by comparing this module's
  cost data against sell-side data from elsewhere in the system — not traced in the source blueprint.
- Whether the reconciliation writer's implicit database-column rounding produces an identical result to
  the other five writers' explicit application-level rounding for the same inputs — not tested in the
  source blueprint.
- Which historical-data-migration approach (re-derive vs. carry-forward) should be taken for rows touched
  by more than one legacy writer — flagged as migration-blocking, not resolved here.
