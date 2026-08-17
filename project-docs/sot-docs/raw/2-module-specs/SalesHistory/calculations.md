# SalesHistory — Calculations

> Keep this file even if this module has no computed/derived logic — state that explicitly below
> rather than deleting the file. A missing file can't be told apart from "nobody got to it yet";
> an explicit "no calculation logic exists in this module" statement can't be. See
> `_deviations-from-original-template.md` in this folder for why.

Source: `docs_from_blueprint/module/SalesHistory/05-financial-pricing-logic.md`, cross-referenced
against `06-outputs.md` and `07-cross-module-integrations.md` for the writer-by-writer formula
comparison and locking finding.

## Applicability

This module has computed/derived logic — do not skip. Unlike a typical "financial/pricing" module,
SalesHistory carries **no price/cost/margin-typed field anywhere in its schema**. "Financial/pricing"
for this module means pure quantity-activity accounting — the derived `total_activity` figure — not
currency arithmetic. This is nonetheless the single most consequential topic in this module's spec,
because `total_activity` is written by **four independent code paths that do not agree with each
other**, and the divergence is the module's most severe finding overall.

## Calculation Pipeline

`total_activity` is the module's one and only calculated field, computed **independently, by formula,
in at least four separate code locations**: this module's own two save paths (which share one
formula), SalesOrder's finalize routine, Location's weekly per-tenant cron, and a family of one-off
`db_utilities/` migration/balancing scripts. **Three of these four restatements were directly compared
and confirmed not to agree with each other.** No locking or transaction-isolation mechanism exists
across any of the confirmed writers, and one of them is asynchronous.

### The canonical formula, as this module's own code intends it

Both of this module's own write paths (the Save-form accumulator and the DetailView inline-edit
correction) compute:

```
total_activity = sell_qty + lost_sale_qty + transfer_out_qty
                   − |return_qty| − |transfer_in_qty| − |false_loss_qty|
```

Net activity = everything that moved product out the door in the business's favor (sales, recorded
lost sales, and **raw, unsigned** transfers-out) minus everything that reduced it (returns,
transfers-in, and a false-loss adjustment — the latter two explicitly taken as absolute values before
subtracting, per an explicit change-request comment bracketing every reference to this term). Every
input is either a stored existing value or a directly-visible submitted value — no hedged inputs.
Rounding: not applicable — pure integer/whole-quantity addition/subtraction/absolute-value, no
division anywhere in any of the three directly-confirmed writers' own formula code.

### Writer-by-writer formula comparison — the confirmed three-way divergence

**Writer 1 — SalesHistory's own module (Save-form accumulator + DetailView correction)**
- Formula: as above — `transfer_out_qty` added **raw, unwrapped**.
- Write semantic: the Save-form path accumulates (existing value + incoming delta, for all six
  counters); the DetailView correction path overwrites one field directly, then recomputes the total
  from whatever is currently loaded.
- Confidence: Confirmed, by direct read of both files.

**Writer 2 — SalesOrder's finalize routine**
- Formula (existing-row branch): `total_activity = sell_qty + lost_sale_qty + |transfer_out_qty| −
  |return_qty| − |transfer_in_qty| − |false_loss_qty|` — **wraps `transfer_out_qty` in absolute value**,
  diverging from Writer 1's raw/unwrapped term.
- Formula (new-row branch): `total_activity = sell_qty − return_qty` — a **structurally incomplete**
  restatement that omits `lost_sale_qty`, `transfer_out_qty`, `transfer_in_qty`, and `false_loss_qty`
  entirely, even though all four are declared not-nullable on the physical table.
- Write semantic: accumulates on the existing-row branch; direct field assignment on the new-row
  branch (no prior row exists).
- Reachability/input provenance: key fields for this writer's own existing-row lookup are sourced from
  stored product custom-field values at SO-finalize time — a second-order provenance distinct from
  Writer 1's directly request-supplied key fields.
- Confidence: Confirmed, by direct read.

**Writer 3 — Location's weekly per-tenant scheduled job**
- Formula (existing-row branch, bulk update): same `|transfer_out_qty|`-wrapped variant as Writer 2 —
  agrees with Writer 2, disagrees with Writer 1.
- Formula (new-row branch): includes all six terms (unlike Writer 2's incomplete new-row branch), but
  still carries the same `|transfer_out_qty|` divergence from Writer 1.
- Write semantic — the one genuinely distinct semantic among all four writers: this writer's first bulk
  update **overwrites** `lost_sale_qty` directly from a computed value, rather than adding a delta —
  the only writer confirmed to use an overwrite semantic for one of its six input counters.
- Reachability/timing: runs on a **per-tenant weekly schedule**, independently of any live user request
  — the only confirmed **asynchronous** writer among the four.
- Confidence: Confirmed, by direct read.

**Writer 4 — one-off `db_utilities/` migration/balancing scripts**
- Formula: **not independently confirmed by a formula-level read anywhere in the source blueprint** —
  several scripts were found by search and confirmed to perform their own `total_activity`-balancing
  update statements (accumulate-style `+=` writes plus a separate balancing update for the total),
  using the same unescaped string-concatenation SQL pattern found elsewhere in this module, but the
  exact formula shape was never opened and read line-by-line. **Preserved here as an open question, not
  resolved into an assumed formula.**
- Write semantic: at least one script is confirmed to use an accumulate (`+=`-style) semantic similar
  to Writer 1's pattern, but not independently re-verified against a full read.
- Runtime nature: **not a live, ongoing runtime writer** — one-off historical migration/backfill/
  balancing tooling, relevant to a migration-audit track, not an ongoing architectural coordination
  problem.
- Confidence: Found by search, not independently read for a formula-level comparison — the
  weakest-confidence entry among the four writers.

### Reconciliation findings — the confirmed divergence, stated precisely

1. **A confirmed two-against-one split on the `transfer_out_qty` term.** Writer 1 adds it raw; Writers
   2 and 3 both wrap it in absolute value, agreeing with each other but not with Writer 1. For any row
   where `transfer_out_qty` is ever stored negative (the physical column is signed, nothing in the
   schema constrains it non-negative), the three writers would persist **different** `total_activity`
   figures for the identical set of stored counters.
2. **A separate, larger divergence: SalesOrder's new-row formula omits four of six terms entirely** —
   not merely disagreeing on one term's sign-handling, but ignoring `lost_sale_qty`/`transfer_out_qty`/
   `transfer_in_qty`/`false_loss_qty` altogether for any row this branch creates.
3. **Location's cron additionally uses a distinct write semantic** — a direct overwrite of
   `lost_sale_qty`, not an accumulate-delta — layered on top of the formula-level divergence, unique to
   this one writer among the three confirmed by direct read.
4. **No division-by-zero risk exists anywhere in this module's calculation surface** — pure addition/
   subtraction/absolute-value, no divisor anywhere in any of the three directly-confirmed writers.
5. **No locking or transaction-isolation mechanism was found in any of the four writers' own code** —
   each performs its own independent read-then-write sequence against the identical five-field key with
   no exclusive-read/lock-and-retry pattern of any kind. Because Writer 3 is asynchronous, a race
   between a cron-triggered write and a same-moment live-user or SO-finalize write for the identical key
   is **structurally possible today, not merely theoretical**. Whether this has ever produced a lost
   update in production was not tested from the source blueprint's read-only pass — flagged as an open
   question, not asserted as a confirmed live incident.

### The accumulate-vs-correct distinction

Per this module's own workflow model (`workflows.md`), the DetailView inline-edit path is a
**correction** (a direct field overwrite plus a recompute of `total_activity` from whatever is
currently loaded), not an accumulation step like Writers 1-3's own delta-based writes. A future
implementation's "one authoritative formula" design must accommodate **two different write semantics**
(accumulate-a-delta vs. overwrite-and-recompute), not merely one shared formula applied uniformly.

## Server-Side Recomputation Requirement

Any value derived by this pipeline must be recomputed server-side at every consuming step, never
accepted as caller-supplied input — this is already true of the legacy system's own writers (all four
compute `total_activity` server-side from stored/submitted counters, never accept a client-supplied
total directly), and must remain true of a new implementation. The standing risk is not "a caller
supplies a fake total" but "four different server-side services disagree on the formula" — see the
required resolution below.

### Required resolution for a new implementation (recommended redesign — preserved intact from the source blueprint)

Per governing requirement R1 (`entities-and-fields.md`) and the blueprint's own implementation-plan
reasoning: a new implementation should fund every confirmed writer's business role through **exactly
one authoritative service** that owns the `total_activity` formula, rather than allowing each writer to
independently restate it.

**Recommended canonical formula** — offered as the source blueprint's own stated decision, not an
invented resolution: **adopt the two-of-three-writers `|transfer_out_qty|`-wrapped variant** (matching
SalesOrder and Location) as the new canonical formula, on the reasoning that no writer was found with a
business justification for `transfer_out_qty` ever being legitimately negative, making the
absolute-value wrapping look more like a defensive normalization two writers independently arrived at
than an intentional difference the third deliberately omits. **This explicitly requires
subject-matter-expert sign-off before being finalized, not a settled fact** — a 2-of-3 majority is not,
on its own, strong evidence of correctness.

**Event-table + single-aggregator + optimistic-lock redesign** (the recommended architecture,
preserved intact):

1. **One authoritative aggregator service.** Every legacy writer (`saleshistory_save_form`,
   `saleshistory_detail_correction`, `salesorder_finalize`, `location_weekly_cron`) stops computing or
   writing `total_activity` itself and instead becomes a publisher of a typed event describing *what
   happened* into an append-only `sales_activity_event` table (`event_type`: `sale_accrual`,
   `return_accrual`, `transfer_out_accrual`, `transfer_in_accrual`, `lost_sale_accrual`,
   `lost_sale_overwrite`, `false_loss_accrual`, `manual_correction`; `quantity_value` — a delta for
   `*_accrual` types, an absolute value for `lost_sale_overwrite`/`manual_correction`, per the two
   write semantics above). Exactly one service reads these events, applies each through its own
   explicit, single-formula rule, and is the only writer of `sales_activity.total_activity`. This
   closes the formula divergence (Finding 1-2) by construction — there is one formula, used by every
   event type — while preserving each legacy writer's distinct business role as a labeled
   `source_writer`, and preserving the correction path's distinct overwrite-then-recompute semantic as
   its own named event type rather than folding it into the accumulate-a-delta pattern.
2. **Optimistic-lock version column.** Even a single authoritative service can still race against
   itself — the aggregator's own worker pool, a retried request, and Writer 3's own asynchronous
   schedule can all attempt to apply an event against the same aggregate key concurrently. An explicit
   `version` column on the aggregate row, bumped on every applied event, makes a stale-read write
   detectable: it is rejected and retried rather than silently overwriting a concurrent change. This
   closes the locking gap (Finding 5) without requiring every legacy writer to independently adopt
   locking discipline none of them use today.
3. **Structural closure of both SQL injections as a byproduct.** The raw existing-row lookup that both
   Critical injections (see `business-rules-and-validation.md` SLH-RULE-001 and the unnumbered finding)
   live in is eliminated entirely, replaced by the authoritative service's own parameterized-by-
   construction read/write path — closed as a byproduct of the architectural fix, not by patching two
   individual query sites.

This design is a hybrid of two possible approaches: primarily "one owner, everyone else publishes
events" (closes the formula divergence), layered with a narrow, defense-in-depth optimistic-lock slice
(closes the race-condition gap that a single owner does not, by itself, eliminate) — since the single
service is still processing events from an asynchronous source concurrently with synchronous ones.

(Source: `docs_from_blueprint/module/SalesHistory/05-financial-pricing-logic.md`, full file, plus
`02-entities-and-fields.md` §5 for the schema-level restatement of this same redesign.)
