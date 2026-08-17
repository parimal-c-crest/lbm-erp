# Products — Calculations

> Keep this file even if this module has no computed/derived logic — state that explicitly below
> rather than deleting the file. A missing file can't be told apart from "nobody got to it yet";
> an explicit "no calculation logic exists in this module" statement can't be. See
> `_deviations-from-original-template.md` in this folder for why.

## Applicability

This module **has real computed/derived logic** — applicable, not N/A. Products contains one of the
richest calculation surfaces in the legacy system: a multi-source price-resolution pipeline (MPL), a
separate mass price-update engine (AUPF), a unit-of-measure price-conversion primitive, a
weighted-average-cost recalculation (with a confirmed formula defect), and two independently-formulated
Gross Profit/margin formulas. All of it is sourced from
`docs_from_blueprint/module/Products/05-financial-pricing-logic.md` (Doc1 §04 / Doc2 §5), cited
section-by-section below. See "## Calculation Pipeline" for the eight stages and
"## Server-Side Recomputation Requirement" for the rule governing every one of them.

## Calculation Pipeline

### Stage 1 — MPL price resolution: three-way source priority (§5.1)

- **Inputs**: the requested product/location (and, if explicitly requested, a Product-Group context),
  the account/job the lookup is for.
- **Formula (business terms)**: exactly one candidate row is read, chosen by a fixed three-way
  priority — (1) a Product-Group override, if one was explicitly requested; else (2) the Price Plan the
  product's location row currently points to (the newer, structured mechanism); else (3), only if no
  Price Plan is assigned, the legacy per-product/per-location price-level record (the older JSON-style
  mechanism). A product's "current" price is a **foreign-key/existence relationship, not a temporal
  one** — none of the three branches ever consults a date range at lookup time. A separate date-range
  pair exists on the Price Plan Rule entity and is user-editable, but it governs a different, unlocated
  process (see below), not which row is read.
- **Rule-precedence accumulation, within the resolved source**: Job-level exception pricing beats
  Job-level pricing beats account-level exception pricing beats plain account-level pricing. Both
  account-level and job-level rules are evaluated and appended to one shared accumulator (not mutually
  exclusive). If any "Sales & Promotion" rule matched, the cheapest of all accumulated,
  already-rounded candidates wins (see Stage 3); otherwise the last-appended row wins by array position
  (in practice, job-level, since it is evaluated after account-level). A further account/job-level
  Exception mechanism, when present, unconditionally overwrites the accumulator afterward — **open,
  unconfirmed**: the source blueprint could not independently confirm whether this Exception mechanism
  overwrites or competes with the MPL-derived entries.
- **Output**: one resolved basis price, pre-formula.
- **Rounding**: none at this stage — rounding is applied per candidate rule, after the formula runs
  (Stage 3).
- **Not a calculation, but load-bearing context**: the Price Plan Rule entity's date-range fields are
  believed (not confirmed) to feed a separate, unlocated batch/cron **assignment-scheduling** process
  that reassigns which Price Plan a product points to — not a filter on the lookup itself (§5.2). The
  new design's decision to formalize this as an explicit assignment-scheduling service is **flagged for
  subject-matter-expert sign-off before being built** (Doc2 §2.1 Decision D5, §9).

### Stage 2 — MPL rate/markup formula: the six-formula grammar (§5.1)

- **Inputs**: the Stage 1 basis (one of ten price levels, current market, weighted-average cost, FIFO,
  or alternate costs 1–3 — a pure lookup, no arithmetic of its own), a rule-configured formula type, and
  a rule value.
- **Formula (business terms)** — one shared grammar reused verbatim across at least three otherwise-
  independent legacy pricing subsystems (the MPL rule engine, the mass "Scheduled Pricing" update
  engine, and a scheduled-value-update mechanism):
  - **Add**: basis plus the value.
  - **Subtract**: basis minus the value.
  - **Times**: basis multiplied by the value — a value of zero is coerced to 1 first.
  - **GP%**: basis divided by (1 minus value/100).
  - **MU%**: basis multiplied by (1 plus value/100).
  - **Net Price**: the value directly, ignoring the basis entirely.
- If a unit-of-measure other than the base unit is in play, Add/Subtract/Net Price values are first
  converted from UOM-scale to base-scale before the formula runs (using the Stage 5 conversion formula);
  Times/GP%/MU% need no pre-conversion since they scale the already-UOM-scaled basis directly.
- **Output**: a raw computed price per candidate rule.
- **Rounding**: none yet — see Stage 3.

### Stage 3 — Penny rounding and the "cheapest wins" tiebreak (§5.1)

- **Inputs**: each candidate rule's raw computed price (Stage 2) and its rounding-rule string.
- **Formula (business terms)**: rounding is applied **per candidate rule**, before the min-price
  comparison runs. The rounding scheme is a lookup-table-driven set of distinct transforms keyed by the
  rounding-rule string (e.g. round to `.99`, round to nearest whole number, round up) — a genuinely
  different formula per string, not one parameterized mode. Exemption: a zero-dollar price is never
  rounded under any rule. Because rounding happens before the "cheapest of all matched promotion-level
  rules" comparison (Stage 1), that comparison is over **already-rounded** prices — a rule whose raw
  price was marginally cheaper before rounding can end up not the cheapest price a customer actually
  sees. This is preserved as documented, structurally-possible (not observed live) behavior, not
  silently reordered.
- **Output**: the final, rounded resolved price for the winning candidate.
- **Rounding**: per the lookup-table transform above; zero-dollar prices are exempt.

### Stage 4 — AUPF (Auto-Update Price Fields) engine (§5.3)

- **Inputs**: a source field value, a per-rule "value based on UOM" flag, a multiplier, and (when UOM-
  based) the location's UOM-conversion factor.
- **Formula (business terms)** — a materially simpler, two-shape engine, **not** the six-formula MPL
  grammar, despite the rule editor's superficially similar "from level / to level" appearance:
  - If "value based on UOM" is set: target = source ÷ (the location's UOM-conversion factor, or 1 if
    blank/zero).
  - Else if the multiplier is non-zero: target = source × multiplier (a fixed ratio, e.g. 1.15 for
    +15% — not an additive delta, not a percent-sign percentage).
  - Else: no write at all — a documented no-op, not silently dropped.
- Both shapes write directly across the affected product/location rows in one mass update, scoped by
  the rule's Line Code/Subline/Report-Codes filters and an always-present positive-source-value guard.
  For cost-family target fields, the read side is additionally scoped, once per location, to one
  canonical "sequence=1" location.
- **Output**: a mass update to the target field across matched product/location rows.
- **Rounding**: not specified in the source for this stage.
- **Side effect**: every AUPF run triggers a UOM-pricing cache refresh (Stage 5).

### Stage 5 — UOM conversion pricing (§5.4)

- **Inputs**: a base or UOM price, and the product's UOM-group `base_qty`/`unit_qty` conversion values.
- **Formula (business terms)** — the single shared conversion primitive used by both the MPL engine and
  the AUPF cache refresh:
  - Base → UOM: UOM price = round(base price × (base quantity ÷ unit quantity), 2).
  - UOM → Base: base price = round(UOM price × unit quantity ÷ base quantity, 2).
  - Example: a "Case" unit where one case equals 24 base units converts a $2.00 base (per-each) price to
    a $48.00 case price (2.00 × 24/1). The ratio represents "how many base units one UOM-unit
    represents," not a separately-entered per-UOM price under ordinary operation.
- **Output**: the converted price, in the opposite unit scale.
- **Rounding**: rounded to 2 decimal places in both directions, per the formula itself.
- **Flagged coordination gap (unresolved)**: which direction runs depends on which screen triggered the
  save — the default flow is base → UOM (every UOM price auto-derives when the base price is edited via
  the ordinary product edit form); the "Manage UOM Qty Pricing" screen is the confirmed exception, where
  editing its own base-unit row inverts the write direction (base fields overwritten from the grid). No
  shared lock or version check was found in either function body — concurrent edits from both screens
  could silently overwrite each other's basis. The new design adds optimistic-concurrency protection to
  close this gap (Doc2 §5.5, risk-register item R21).
- **Field-specific guard preserved exactly**: a submitted weighted-average-cost value of zero or below
  is silently replaced with the prior stored value rather than zeroed; the cost-column write is also
  gated on the current user holding a specific role (or being the administrator account) — a check
  absent from every other field in this same write path.

### Stage 6 — Global Weighted-Average-Cost (WAC) recalculation (§5.5)

- **Inputs**: the product's existing per-location quantities and WACs, the edited location's newly
  submitted cost, and the received quantity.
- ⚠️ **Confirmed defect, not normal behavior**: the legacy formula's own quantity term — intended, per
  its naming and the surrounding variable-naming pattern, to hold the edited location's *existing*
  pre-save quantity so it can be blended at its *existing* cost — is **hardcoded to literal zero**. The
  effect: the "blend the edited location's existing inventory at its old cost" half of a textbook
  weighted-average formula never executes; the legacy formula collapses to simply newly-received
  quantity × newly-entered cost (a full revaluation at the new cost, no blend). Additionally, every
  *other* location's existing quantity is revalued at the *edited* location's newly-entered cost, not
  each location's own individually-tracked cost. Whether this is an intentional "reset the whole
  chain's cost basis to the latest purchase price" design or a latent bug was **not confirmed from the
  code alone** — flagged for subject-matter-expert sign-off or change-history archaeology (Doc1 §04 §9
  Open Question 1, unresolved through the source blueprint's final risk-consolidation pass).
- **Corrected formula, per the source blueprint's own implementation plan** — stated as the formula the
  variable names imply was intended, **flagged as a possible business-behavior change requiring sign-off
  before it is built**, not silently substituted for legacy behavior:
  1. Gate: only proceed if the submitted cost differs from the edited location's current cost AND the
     system-wide WAC-calculation mode is Global (preserved exactly — no defect found here).
  2. Load every location row for the product via typed, validated location references only (closes a
     confirmed SQL-injection defect in this exact legacy code path).
  3. Compute:
     - existing inventory value at edited location = existing qty at edited location × existing WAC at
       edited location
     - newly received value = qty received × new cost submitted
     - other-locations value = SUM(other locations' qty on hand × each location's OWN WAC)
     - new blended WAC = (existing inventory value at edited location + newly received value + other-
       locations value) ÷ (existing qty at edited location + qty received + other locations' total qty)
  4. Write the new blended WAC to every location row for the product, in one transaction.
  5. Write one audit-history row per location (legacy audit-trail pattern preserved exactly — no defect
     found in the logging itself, only in the formula it logs).
  6. Publish a cost-recalculated event (replacing the legacy inline external-accounting-system push,
     itself preserved as a non-zero-difference-only gate on the event-consumer side).
- **Output**: one new blended WAC written to every location row for the product.
- **Rounding**: not specified in the source for this stage.
- **Status**: explicitly gated on subject-matter-expert sign-off before being built (Doc2 §2.1 Decision
  D7, §9) — if the legacy full-revaluation behavior is confirmed intentional, the corrected formula
  above must *not* be built, and legacy behavior should be preserved and documented as intentional
  instead.

### Stage 7 — Gross Profit / margin: single-product formula (§5.6)

- **Inputs**: sale price, and a cost basis via a two-tier fallback chain (admin-configured cost field,
  defaulting to weighted-average cost if neither configured override resolves).
- **Formula (business terms)**: GP% = ((sale price − cost basis) ÷ sale price) × 100.
- **Usage**: a live, order-blocking business rule — used by three near-identical Quick-order
  auto-finalize minimum-GP% gates, not a display-only figure.
- **Output**: a GP percentage used to allow/block order finalization.
- **Rounding**: not specified in the source for this stage.
- **Related dead code, confirmed narrowly**: one ajax endpoint whose entire purpose was "compute sale
  price, then compute GP from it" is unreachable under any input (an unconditional exit halts execution
  before the GP half runs), and even without that exit, the GP half's result variable is never assigned
  anywhere in the file — a second, independent bug. GP itself is **not** dead system-wide; this affects
  only that one endpoint.

### Stage 8 — Gross Profit / margin: batched line-item formula (§5.6)

- **Inputs**: sale price, the same two-tier cost-basis chain as Stage 7, an optional manually-changed
  cost, an optional buyout-cost mode/value, and order quantity.
- **Formula (business terms)** — a richer formula than Stage 7, with a three-tier cost-basis override
  chain:
  - Cost basis starts as the same two-tier configured-field chain as Stage 7.
  - If the line has a manually-changed cost, that value overrides the above.
  - If buyout-cost mode is active and a buyout cost is present, that value overrides both prior tiers.
  - GP% = ((sale price − cost basis) ÷ sale price) × 100.
  - If the line has a positive order quantity, an "extended price" mode applies instead: GP% = ((sale
    price − (cost basis × order quantity)) ÷ sale price) × 100 — in this branch, sale price is already
    an extended/line-total price, not a unit price.
- **Usage**: the formula actually rendering GP% on the "quick order" grid.
- **Output**: a GP percentage displayed per line item.
- **Rounding**: not specified in the source for this stage.
- **Consolidation decision**: the new design's single authoritative GP-calculation service uses this
  richer three-tier chain as the canonical shape for both Stage 7 and Stage 8 callers — a strict
  superset, since the single-product formula's existing callers never populate the second/third
  override tiers, so consolidation is not a behavior change for either existing caller. The mode
  (per-unit vs. extended-price) becomes an explicit flag replacing the implicit "line has a quantity"
  branch. The dead endpoint's original intent (a combined price-then-GP lookup) is not ported forward —
  it is covered by calling the MPL price-resolution service (Stages 1–3) and the GP-calculation service
  explicitly, as two named calls (Doc2 §2.1 Decision D6, §5.6).

## Server-Side Recomputation Requirement

Per the source blueprint's own stated requirement for this module (§5.7): **the six-formula MPL
grammar (Stage 2), the per-component-then-round penny-rounding order of operations (Stage 3), and the
corrected Global-WAC blend (Stage 6) must all be reproduced exactly against known inputs/outputs — not
"simplified" during reimplementation.** The rounding order in particular is called out as a deliberate,
documented business rule, not an accident that merely looks simplifiable.

Explicitly stated: **no total, price, or cost figure may be treated as a directly-writable input once a
calculation pipeline exists to derive it** — the same "computed, never accepted as direct input"
principle applied throughout the blueprint-consolidation series. The Global-WAC formula (Stage 6) and
the MPL-resolution formula (Stages 1–3) are the *only* paths that may ever set their respective values.
Any consumer of a price, cost, or GP/margin figure produced by this pipeline (including the outputs
documented in `outputs.md`) must treat that figure as server-recomputed at the point of use, never as a
caller-supplied value accepted at face value.

Two items in this pipeline are explicitly gated on subject-matter-expert sign-off before being built,
not resolved by this document: the corrected Global-WAC formula (Stage 6) and the MPL Price-Plan
assignment-scheduling service referenced in Stage 1.
