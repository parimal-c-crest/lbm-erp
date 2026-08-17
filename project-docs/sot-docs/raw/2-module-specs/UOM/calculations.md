# UOM — Calculations

## Applicability

This module's entire purpose is computed/derived logic — the conversion arithmetic between a product's
base unit and its UOM types, for both quantity and price. This file documents that arithmetic in full.

Source: this session's direct read of `include/utils/commonfunctions.php`, cross-checked against the
formula already documented in `docs_from_blueprint/module/Products/05-financial-pricing-logic.md` §5.4
(confirmed as the actual live code, not just a paraphrase). No blueprint risk-findings pass covered this
angle independently — see the sourcing note in `docs_from_blueprint/module/UOM/00-README.md`.

## Calculation Pipeline

The whole legacy system's UOM conversion arithmetic funnels through one function family in
`include/utils/commonfunctions.php`:

- **`conversion_base_or_uom_for_qty_sellprice_uomjsonarray($conversionfor, $conversiontype, $value,
  $uomjsonarray)`** (line 6137) — looks up `baseqty`/`qty` from a per-product cached UOM JSON array
  (keyed by `applied_uom_lineitem` for quantity conversions, `applied_uom_lineitem_sellprice` for price
  conversions) and delegates to the primitive below.
- **`conversion_base_or_uom_for_qty_sellprice($conversionfor, $conversiontype, $value, $baseqty, $qty,
  $fixed_decimal=true)`** (line 6163) — the actual formulas:

| Input | Direction | Formula | Rounding |
|---|---|---|---|
| Qty | base_to_uom | `value × (qty / baseqty)` | `common_decimal_round_qty()`, or `round(...,4)` under the `$global_qty_base_integer_sub` flag |
| Qty | uom_to_base | `value × (baseqty / qty)` | Under `$global_qty_base_integer_sub`, additionally forced to a whole number — `ceil()` if positive, `floor()` if negative/zero (lines 6197-6210) |
| Sell price | base_to_uom | `value × (baseqty / qty)` — the *inverse* ratio of the qty formula, correctly, since price scales inversely to how many base units a UOM unit represents | `common_decimal_round_cost()` (lines 6230-6233) |
| Sell price | uom_to_base | `(value × qty) / baseqty` | — |

Thin convenience wrappers delegate to this primitive: `convert_qty_from_base_to_uom()` (6247),
`convert_qty_from_uom_to_base()` (6252), `convert_amount_from_base_to_uom()` (6257),
`convert_amount_from_uom_to_base()` (6262).

**Inputs**: a base-unit or UOM-unit value, plus the group's `baseqty`/`qty` conversion-factor pair for
the target type (`lbm_uom_type_qty`), read either directly or via a per-product cached JSON array.
**Output**: the converted value in the opposite unit (base or UOM), rounded per the table above.

### Rounding-mode divergence — a config-dependent, not fixed, invariant

`uom_to_base` quantity conversion is **forced to whole units** (`ceil()`/`floor()`) when the global flag
`$global_qty_base_integer_sub` is set, but left as a fractional decimal-rounded value when it isn't
(`commonfunctions.php:6193-6224`). This means the same conversion, on the same data, can be exact or
rounded depending on a global configuration setting rather than a per-product or per-UOM-type property.
A rewrite needs to decide whether this is a genuine tenant/deployment-level configuration choice worth
preserving, or legacy inconsistency worth collapsing to one behavior — flagged as an open decision in
`risks-and-open-questions.md` (UOM-RISK-005), not resolved here.

### Confirmed second, independent copy of the formula — drift risk

`modules/Customreport/InventoryQtyByUOMTypeName.php:51-54` reimplements the quantity-conversion formula
directly in SQL: `ROUND((qty * (lbm_uom_type_qty.qty/lbm_uom_type_qty.baseqty)),4)`. This is a second,
independent expression of the same arithmetic as the canonical PHP primitive above — a formula change in
one would not automatically propagate to the other. This is a genuine live drift risk today, not a
hypothetical: the two copies are already free to diverge, and there is no mechanism confirmed to prevent
that. See `risks-and-open-questions.md` (UOM-RISK-003).

### Confirmed call sites of the primitive

- `modules/Products/uomQtyListView.php::getUOMqtyListViewEntries` — per-UOM QOH/scan/on-hand rows.
- The Pricebooklevel300 MPL pricing engine's `netprice` branch calls
  `conversion_base_or_uom_for_qty_sellprice_uomjsonarray('sellprice','base_to_uom', ...)`
  (`blueprint/module/Pricebooklevel300/04-financial-pricing.md:122`) — the only one of that engine's
  three MPL formula branches that does an explicit UOM conversion.
- The AUPF (Auto-Update-Price-Fields) engine's `value_based_on_uom` mode divides by "the location's
  UOM-conversion factor" (per `docs_from_blueprint/module/Products/05-financial-pricing-logic.md` §5.3).

### Two write directions, no coordination — a real concurrency gap

Per `docs_from_blueprint/module/Products/05-financial-pricing-logic.md` (§5.4, already documented there
for Products' own base-price field, restated here because it is fundamentally a UOM-conversion problem):
the default flow is base→UOM — editing a product's base price on the ordinary edit form cascades to
derive every UOM-specific price via the primitive above. The dedicated "Manage UOM Qty Pricing" screen
inverts this direction — editing a UOM-level price there writes back to the base price fields instead.
**No shared lock or version check exists between these two write paths.** Concurrent edits through the
two different screens can silently overwrite each other with no conflict detection. See
`risks-and-open-questions.md` (UOM-RISK-004).

## Server-Side Recomputation Requirement

Any value derived by the conversion pipeline above must be recomputed server-side at every consuming
step, never accepted as caller-supplied input. This is the standard fix for the "client-trusted total"
class of risk, and applies directly here: the legacy `lbm_applied_uom_pricing` cache and the two write
directions documented above are exactly the kind of derived-value surface where a rewrite must not trust
a client-submitted UOM-converted value without recomputing it from the canonical conversion factor.
