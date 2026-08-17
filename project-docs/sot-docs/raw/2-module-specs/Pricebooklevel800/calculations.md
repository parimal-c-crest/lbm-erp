# Pricebooklevel800 — Calculations

> Keep this file even if this module has no computed/derived logic — state that explicitly below
> rather than deleting the file. A missing file can't be told apart from "nobody got to it yet";
> an explicit "no calculation logic exists in this module" statement can't be. See
> `_deviations-from-original-template.md` in this folder for why.

Source: `docs_from_blueprint/module/Pricebooklevel800/05-financial-pricing-logic.md`, ultimately
derived from `blueprint/module/Pricebooklevel800/04-financial-pricing.md` (Doc1 §04). **This is the
module's single most important document** — the source blueprint itself calls this pass "the
module's most important document."

## Applicability

This module clearly has computed/derived logic: a specificity-scored rule-matching pricing pipeline
(the function informally called "500 Level" pricing internally, `find500LevelSalesPricesByParams()`)
that resolves the sell/list price for a product given a customer Account's price-book assignment.
This is genuine, live, actively-consumed pricing logic — called both from within the wider
inventory/pricing utility layer's own main sell-price computation routine and directly from
SalesOrder's own line-item pricing ajax endpoint, invoked live every time a sales-order line item's
price is (re)computed in the UI — not a dormant sub-system.

**Governing finding carried forward as-is (do not treat as resolved):** because the header table
(`entities-and-fields.md` §4) has 0 live rows, **every** call to this pipeline for any of the 932
accounts carrying a non-"LP"/non-blank price-book assignment fails at the very first step (see stage
1 below) — the caller then receives a failure result, which downstream number-formatting logic
coerces into a display value of `"0.0000"`. Whether a separate fallback elsewhere in the broader
pricing waterfall (outside this module's own scope) catches this failure/zero result is **not
confirmed** within this module's own file set — flagged as the single highest-priority open question
in this module's whole blueprint (see `risks-and-open-questions.md`), since it directly determines
whether this is a live, customer-facing pricing bug today or a latent one masked by some downstream
guard not traced in this blueprint. This ambiguity is preserved here, not resolved into a
confident-sounding answer either way.

## Where this module's data is actually consumed for pricing

The SalesOrder-side endpoint reads the Account's price-book assignment value and branches:
- `"LP"` → falls straight through to the product's own List Price lookup — **this module's data is
  bypassed entirely** for accounts flagged `"LP"`, a sentinel meaning "use the product's own List
  Price, no tier override."
- Any other non-empty value → routes into this module's rule-matching pipeline (below).
- Empty → also falls through to the product's own List Price lookup.

## Calculation Pipeline

Ordered stages, given a product and an Account's price-book assignment value:

1. **Header lookup** — select the header row's rounding-rule and floor-guard settings by matching
   the Account's assigned price-book name against the header table's own Price Book Name column,
   filtered to non-deleted rows. Cached per-request (a global, request-scoped cache, meaning only the
   *first* price-book name looked up in a given request benefits from caching — a request pricing
   products for accounts on two different price books would only cache the first one).

   **If no matching header row exists, the function returns a failure result immediately** — i.e.,
   before any rule-matching logic runs at all. This is the exact mechanism behind the confirmed live
   defect below.

2. **Rule scoring/match** (assuming stage 1 succeeds) — query the sibling rule table for rules
   matching the product's line code/subline/division/product id/price code (each column either
   equals the product's value **or is blank on the rule**, i.e. blank = wildcard) and the account's
   resolved sales rank, scoped to the matching price-book name. Compute a specificity count (number
   of non-blank scoping columns used by each candidate rule, out of line code/subline/division/
   product id/sales rank/price code/PC-range) and order candidates by that count descending — **most
   specific rule wins**, a genuine specificity-based precedence system. Ties within the same
   specificity count are broken by product id/division/subline/line code column value, descending —
   an arbitrary (not business-meaningful) tiebreak, since it sorts by raw column value rather than a
   defined priority rank.

3. **Price-code range filter loop** — iterate the ordered candidate rules; for each, resolve a basic
   price (either a price-level lookup if the rule's Price Level is set and isn't the raw sell-price
   sentinel, else the raw sell price passed in) and, if the rule declares a PC $ Range (e.g. "10 to
   50" or "10 to INFINITE"), check whether the basic price falls in that range — skipping
   non-matching rules even if they were the highest-specificity match, falling through to the
   next-best rule. The first rule that either has no range or whose range contains the basic price
   wins.

4. **Result** — on match, record the matched rule's id, the price-book name, the effective rounding
   rule (falling back to the header's own default if the rule doesn't specify one), the floor-guard
   setting, and a rule-type marker into a shared accumulator consumed by later blocks in the broader
   sell-price computation pass — that later price-formula application belongs to the wider pricing
   engine's own scope, out of this module's own scope to fully re-derive, but the specificity-match/
   range-filter logic documented above **is** this module's own contribution to that pipeline.

5. **Floor-guard (`listprice_lower_than_sellprice`)** — a header-level flag, not a per-rule pricing
   operation. The SalesOrder-side consumer reads it back (via the shared accumulator) and, if
   **not** set to allow it, forces the computed List Price up to match the computed Sell Price
   whenever List Price would otherwise be lower — i.e. by default, the computed List Price is never
   allowed to display *below* the computed Sell Price; enabling the flag on a given price book
   explicitly permits List Price to show as the lower of the two. This is a display/comparison guard
   on the final computed values, not a pricing formula in its own right.

**Precedence summary (this module's slice of the overall sell-price waterfall):**

```
Account price-book assignment (e.g. "LP", "M3", "500", or blank)
    |
    +-- "LP" or blank --> product's own List Price lookup (this module's data never consulted)
    |
    +-- any other value --> rule-matching pipeline
                                 |
                                 +-- header lookup by price-book name
                                 |     (FAILS for every value in the current dataset — 0 live header rows)
                                 |
                                 +-- rule-table candidate match, ordered by scoping specificity
                                 |     (line code/subline/division/product id/sales rank/price code/PC range)
                                 |
                                 +-- price-code range filter against the resolved basic price
                                 |
                                 +-- floor-guard applied to the final value
```

## Root cause: a correctly-written cascade-delete function that is never called

A generic, tier-aware helper exists in the codebase that, given a header id, resolves the header's
price-book name and soft-deletes every sibling-rule-table row sharing that name — i.e. this is the
**correct, already-written cascade-delete logic** that *should* run whenever a price-book header is
deleted, covering exactly the orphaning gap documented in `entities-and-fields.md` §4 (neither of the
module's two delete paths cascades on its own).

**A repo-wide search confirms zero call sites for this function anywhere in the live code** (the only
other hit is an unrelated documentation-tooling index, not a real caller) — this function is dead
code, never wired into either of this module's own delete paths. This is a strong, direct explanation
for the module's headline finding: "0 header rows, 8 live orphaned rule rows, 932 live orphaned
account assignments" — the cascade-delete logic was written, presumably in response to exactly this
kind of orphan risk, but never actually connected to the delete flow that would have used it.

**This function is confirmed shared, identically, across all three sibling pricing tiers** — the same
dead-code status is therefore a defect shared identically across `Pricebooklevel200`,
`Pricebooklevel300`, and `Pricebooklevel800` alike.

## "System Default" flag — no observed pricing effect

No code path in this module reads the "system default" flag back for pricing purposes; its only
observable downstream effect is the field-metadata propagation to future Accounts' assignment-
picklist default value, not to any in-flight pricing computation.

## `times` (header) vs. `times` (rule) — two different multipliers, same concept name across two tables

- The header-level default multiplier is written only via the header save flow's own request key; no
  code path in this module or in the broader pricing engine was found reading this specific column
  back for computation — it appears to function only as a **default value proposed to the authoring
  UI** when creating new rules for this book (inferred from its name and the rule-level "Times"
  column sharing the same concept; not directly traced to a UI pre-fill site within this module's own
  files, flagged as an open question).
- The rule-level multiplier **is** a real scoring input to the broader caller context the pipeline
  hands off to, though not directly read within the pipeline stages documented above — full
  downstream formula application is the wider pricing engine's own scope, outside this module.

## Server-Side Recomputation Requirement

Any value derived by this pipeline must be recomputed server-side at every consuming step, never
accepted as caller-supplied input — this is the standard fix for the "client-trusted total" class of
risk, and applies with particular force here because the confirmed live defect above (every
non-"LP" lookup currently failing) means a naive client-trusted fallback would be an especially easy
place for a stale or attacker-supplied price to slip through undetected. Per `build-guidance.md`, a
new implementation's pricing service must be independently unit-testable and re-derive the
specificity-scoring/range-filter result fresh on every call, not cache or accept a previously-computed
price as input.

## Financial/pricing open items

- Whether a downstream fallback in the broader pricing waterfall catches the failure/zero result from
  the confirmed no-op condition above — the single highest-priority open question in this module's
  whole blueprint.
- Whether `autoupdatefrompcb`/`createdfrom='PCB'` drives any live process.
- Whether the header-level Times default multiplier is ever read for anything beyond a UI pre-fill.
- Whether `"M3"`/`"500"` correspond to live header rows in the sibling tiers' own header tables —
  directly relevant to whether the 932 accounts are simply orphaned or reference a different tier.
