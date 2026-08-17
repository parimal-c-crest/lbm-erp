# Pricebooklevel300 — Calculations

> Keep this file even if this module has no computed/derived logic — state that explicitly below
> rather than deleting the file. A missing file can't be told apart from "nobody got to it yet";
> an explicit "no calculation logic exists in this module" statement can't be. See
> `_deviations-from-original-template.md` in this folder for why.

## Applicability

**Applies.** Unlike the sibling `MPLPricePlan` module's own dormant Rule sub-entity (confirmed zero live
pricing-engine consumers), Pricebooklevel300's own rule data is genuinely, actively read by the live
pricing-computation path — confirmed by direct trace through the shared sales-pricing engine's own dedicated
function for this tier, called from the sales/quote line-item pricing flow with the account's resolved
plan-name (`docs_from_blueprint/module/Pricebooklevel300/05-financial-pricing-logic.md` §5.1). This function
dispatches to **one of three structurally different matching/formula branches** depending on the plan header's
own type discriminator, evaluated fresh for every priced sale line.

## Calculation Pipeline

1. **Load the plan header**, matched by plan name (not plan id, per the name-based FK — see
   `entities-and-fields.md` R1). If no live, non-deleted plan matches the account's resolved plan code, no
   pricing is applied at all for this line from this module (§5.1).

2. **Branch dispatch**, based on the plan header's own type discriminator:
   - **Branch A — `mixmatch`** (only reached when the sale carries multiple mix-match-eligible product lines).
   - **Branch B — `Combined Quantity Discount`** (only reached when not mix-match, and the sale is not a
     specific excluded channel).
   - **Branch C — `default`** (the module's most common live case; all 6 live plans on the blueprint's own dev
     snapshot are `default`).

3. **Branch A (`mixmatch`) — matching**: every candidate line is matched against the rule table, scoped by the
   rule's own product/sale-context dimensions plus date window (a wildcard on any dimension matches
   everything), specificity-ranked so more-specific rules win ties. The bundle only "activates" once the count
   of distinct matched rule ids across every candidate line reaches the plan's own total live rule count — i.e.
   mix-match pricing requires the entire eligible line set to collectively satisfy every one of the plan's
   rules before *any* of them gets mix-match pricing (§5.1).

   **Branch A formula**:

   | Condition | Formula | Rounding | Notes |
   |---|---|---|---|
   | `times` set, OR every adjustment field is at its zero default | `saleprice = basicprice × times` | Not applicable (no rounding step in this case) | A rule with every adjustment field left at its default is treated as a no-op `×1`-shaped "times" rule, not an error. |
   | `add-subtract` set | `saleprice = basicprice + add-subtract` | **No penny-rounding applied in this branch's own add-subtract case** (contrast Branch C, which does round here) | — |
   | `net-price` set | `saleprice = netprice` (basicprice ignored entirely) | Not applicable | Same "operand is the final price" shape as the `MPLPricePlan` sibling module's own Net Price formula. |
   | `discount` set | `saleprice = basicprice − (basicprice × discount / 100)` | Not applicable | A percent-off-of-basicprice discount. |

   `basicprice` resolution: if the matched rule's price level is the plan's own special "SP" level,
   `basicprice` is the minimum sales price across every already-priced rule for the product (a shared, opaque
   sub-mechanism not traced line-by-line by the source blueprint); otherwise `basicprice` is resolved from the
   named price level. If the rule carries no price level at all, the account's own default price-level field is
   used instead (§5.2.1).

4. **Branch B (`Combined Quantity Discount`) — matching and formula**: the running order quantity across every
   eligible line is summed; if it meets or exceeds the plan's own configured threshold, every eligible line is
   priced via a separate aggregate-discount rule lookup, keyed on the aggregate line set rather than
   individual-line specificity. No `times`/`add-subtract`/`net-price`/`discount` field-based formula exists at
   all in this branch. Instead: if the plan's own mode switch is set to "pricefield," `saleprice` is resolved
   directly from the plan's own selected price-level field, with no adjustment operation applied to it at all.
   **If the mode switch is the column's own DB default (`discount`) instead, no `saleprice` is ever assigned in
   this branch** — the pricing step is silently skipped entirely for every product. This is a confirmed
   structural gap: a `Combined Quantity Discount`-typed plan left at its own default mode setting has no code
   path in the traced pricing function that ever computes a discounted price for it — the aggregate-quantity
   threshold check can fire, but produces no priced output (§5.1, §5.2.3).

5. **Branch C (`default`) — matching**: a two-stage lookup — first tries the "Bulk discount" rule type with a
   most-specific single-match; if nothing is found, falls back to a broader scan with no type restriction. For
   each matched rule, a coupon check gates the rule's own formula application entirely (see step 6 below)
   (§5.1).

   **Branch C formula**:

   | Condition | Formula | Rounding | Notes |
   |---|---|---|---|
   | `times` set, OR `add-subtract`/`net-price`/`times` are all at their zero default | `saleprice = basicprice × times` | Penny-rounded if the rule carries a rounding rule | Same "all-zero defaults to times" fallback as Branch A, **but this branch's own zero-check does not include the `discount` field at all** — a genuine inconsistency between the two branches' own fallback conditions (see finding below). |
   | `add-subtract` set | `saleprice = basicprice + add-subtract` | Penny-rounded if applicable | Unlike Branch A, this branch DOES apply penny-rounding to the add-subtract result. |
   | `net-price` set | `saleprice = netprice` | Penny-rounded if applicable, **then additionally unit-of-measure-converted** if the product carries UOM data | The only one of the branches whose net-price case performs an explicit UOM conversion. |
   | *(no `discount` case exists in this branch's own formula chain at all)* | — | — | **A confirmed cross-branch inconsistency**: the same rule row, matched by Branch C rather than Branch A, falls into the first "times" fallback (`basicprice × 0 = 0`), producing a **silent zero price** rather than the percent-off computation Branch A would apply to the identical row. |

   `basicprice` resolution mirrors Branch A's own price-level logic, but Branch C additionally tries a
   **cross-module bridge first**: a lookup into the sibling `MPLPricePlan` module's own per-level, per-location
   product price data, falling back to the named-price-level lookup only if that bridge returns empty/zero.
   This is a genuine, confirmed cross-module pricing dependency — Pricebooklevel300's own `default`-branch
   pricing can be silently influenced by `MPLPricePlan`'s own data, a relationship not present in Branch A or B
   at all (§5.2.2).

6. **Coupon gate (Branch C only)**: for a matched rule, a coupon-existence check gates the rule's own
   price/formula computation entirely — **if a live, non-expired coupon exists for that specific rule, this
   branch's own price computation for that rule is skipped in full, with no fallback price set.** This module's
   own files contain no code path anywhere that computes or applies a coupon's own discount value (coupon
   amount / discount basis) as a sale-line price — the coupon's own `Coupon Amount`/`Based On` fields are
   captured by the coupon-entry UI but the source blueprint's own pricing-engine trace found **no consumer of
   either column for price computation anywhere in the traced path**. In practical terms: a rule with a live,
   attached coupon is priced by this function as **nothing at all** — no price entry is produced for that rule
   on that iteration — not as the coupon's own discount amount (§5.4).

   **This is stated here as an explicit, unresolved architectural gap, not a bug fixed or a design decision
   already made.** Whether a coupon's discount value ever reaches a customer's actual paid price through some
   code path entirely outside this module's own directory (e.g. a checkout/cart-level "enter coupon code"
   flow), or whether the coupon subsystem never affects a computed price anywhere in the traced system, is not
   resolved by this document — it is preserved as open, per the source blueprint's own explicit framing (§5.4;
   carried forward to `risks-and-open-questions.md`).

7. **Precedence** (§5.3):
   - **Between plans**: exactly one plan is evaluated per pricing call — there is no multi-plan blending within
     the pricing function itself. If an account is assigned multiple plan names, whichever single plan name is
     resolved upstream is the only one evaluated for that sale line (resolution mechanism itself is an open
     question — see `integrations.md`).
   - **Within a matched rule set (Branch C, the module's most common path)**: rules of the "Bulk discount" type
     are tried first, most-specific-match wins; only if no such rule matches does the function fall back to a
     broader, untyped scan — i.e. an account-number-specific rule always outranks a wildcard-account rule, and
     among equally account-specific rules, the one matching the most non-wildcard scope dimensions wins.

8. **Weighted-average GP% recompute (display arithmetic, not part of the sale-price path)**: whenever a rule's
   pricing fields change on the everyday save path, a shared function recomputes the entire plan's
   weighted-average GP% across every one of its live rule rows — display/reporting arithmetic, presumably
   surfaced somewhere in the UI (not traced to a specific display location by the source blueprint), **not**
   part of the live sale-price computation path documented in steps 1-7 above (§5.6). This is the only other
   piece of real arithmetic this module performs outside the pricing engine itself.

## Live Formula-Completeness Gaps (beyond the coupon-gate finding)

1. **Branch A / Branch C formula-fallback inconsistency**: the same rule row, evaluated once via Branch A
   (mix-match) and once via Branch C (default), can yield a genuinely different computed price. Branch A
   includes a working `discount` case; Branch C's equivalent case is entirely absent, silently falling through
   to a zero-price result instead.
2. **Branch B's default configuration never computes a price**: the aggregate-quantity threshold-check
   machinery is fully present and can fire, but the pricing half of a `Combined Quantity Discount`-typed plan
   is only functional when that same plan is *also* configured to the plan's own non-default mode — the
   column's own DB default is the *non-working* configuration.
3. **No numeric-range validation exists anywhere in the everyday save path** for the discount/GP%/markup
   fields — the same "GP% divide-by-zero at value=100" risk the `MPLPricePlan` sibling module found in its own
   module is structurally present here too, though the source blueprint did not find a confirmed live row
   carrying that exact value on its own dev snapshot.
4. **The "SP" special price-level case (used by both Branch A and Branch C) is shared, opaque logic** not
   traced line-by-line by the source blueprint — any defect within it would affect every `default`/`mixmatch`
   plan using that price level simultaneously.

(`05-financial-pricing-logic.md` §5.5)

## Server-Side Recomputation Requirement

Unlike the `SalesOrder` pilot module's own headline finding (a client-trusted final total written with no
server-side recomputation), the source blueprint found **no analogous "accepts a computed price as direct
input" defect in this module's own pricing path** — every price this module's own pricing function produces is
computed fresh, server-side, from the rule/plan data at match time, and a new implementation should preserve
this property exactly (`05-financial-pricing-logic.md` §5.7). The financial risks documented in this module are
of a different shape entirely: **formula-completeness gaps that silently produce a zero or unset price**
(above), and **the coupon-discount dead-end** (step 6 above) — both silent (no error, no log), rather than a
trust boundary being crossed on an already-computed value. Any value derived by this pipeline must still be
recomputed server-side at every consuming step, never accepted as caller-supplied input — the standard fix for
the "client-trusted total" class of risk applies here as a preventative requirement even though no legacy
instance of that specific defect was found.
