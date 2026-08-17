# PurchaseOrder — Calculations

Source: `docs_from_blueprint/module/PurchaseOrder/05-financial-pricing-logic.md`, itself traced to
`blueprint/module/PurchaseOrder/04-financial-pricing.md`.

## Applicability

Applies in full. PurchaseOrder has a substantial cost/pricing/currency calculation pipeline.

## Calculation Pipeline

### 1. Header total composition

The Purchase Order header holds **pre-computed totals rather than deriving them at read time**: Sub
Total, Grand Total, Outstanding Total, Discount Percent/Amount, S&H Amount, Surcharge
Percent/Amount, Small Order Charge, three separate freight-vendor buckets (each with its own
vendor/status pair), Duty, Other Charges, Excise Duty, Sales Commission, plus three separate tax
buckets (`po_tax1/2/3` + a tax code + a tax total). Distribution of order-level charges down to line
items is gated per-charge by header-level flags (`check_s_h`, `check_surcharge`,
`check_order_charge`) and mirrored line-item flags (`check_polineitem_s_h`,
`check_polineitem_surcharge`, `check_polineitem_order_charge`) on the committed Line Item table.

### 2. Line-item cost aggregation (`CalcTotal.php`)

**Inputs**: the staging line-item table (`lbm_iframepodetails`), filtered by PO number.

**Formula** (reproduced from source as the query is directly relevant to the security finding
below):

```sql
SELECT if(transcode != 7, SUM(if(defaultqty IS NOT NULL AND defaultqty > 0, defaultqty * defaultcostprice, costprice * qty)), 0) AS costextprice,
       SUM(corepricevalue * if(defaultqty IS NOT NULL AND defaultqty > 0, defaultqty, qty)) AS coreextprice,
       SUM(qty) AS totalqty,
       SUM(polineitemfreight1 * qty) AS totpofreight1, SUM(polineitemfreight2 * qty) AS totpofreight2, SUM(polineitemfreight3 * qty) AS totpofreight3,
       SUM(polineitemduty * qty) AS totpoduty
FROM lbm_iframepodetails WHERE ponumber = '$ponumber' GROUP BY ponumber
```

**Output**: cost-extended-price, core-extended-price, total quantity, three freight totals, duty
total — fed back into the header totals.

**Key business rule embedded here**: `transcode == 7` lines are excluded from cost-extended-price —
`transcode` 7 appears elsewhere as a special line type, plausibly "waste"/"non-cost" given a
dedicated `RemoveWastePODetails.php` file exists in the module, though this is not independently
confirmed (see Open Items below, and entities-and-fields.md's `transcode` open item). Freight and
duty are extended **per unit × quantity** — i.e. `polineitemfreight1/2/3` and `polineitemduty` on
the line-item table are **unit rates, not line totals**, and are redistributed proportionally back
down to each line whenever the header-level `pofreight1/2/3`/`poduty` changes, via a redistribution
loop that computes a per-line percentage share and writes it back to the staging table.

**Confirmed Critical defect (the module's worst finding)**: the same block that performs this
aggregation also builds `UPDATE ... SET {$_REQUEST['updateExtParam']} = ...` where **the SQL column
name itself** is constructed directly from raw `$_REQUEST['updateExtParam']` with no allow-list —
full exploit framing carried under risk PO-RISK-001 (risks-and-open-questions.md). This is
functionally part of the cost-calculation pipeline documented here, not merely a security footnote —
an attacker exercising this path can corrupt any column of a live financial staging table on
essentially every routine PO edit.

### 3. Cost-source resolution (`UpdateCost.php`)

When a user overrides a line's cost from the PO screen:

1. The code first resolves **which vendor-specific cost basis** to treat as canonical by reading the
   vendor's `cf_1663` custom field (values `CURRENT COST`, `ALTERNATE COST 1/2/3`), mapping it to a
   product cost column (`cf_874`, `cf_1187`, `cf_1189`, `cf_1191` respectively, on
   `vtiger_locationcf`).
2. If the vendor's basis is the plain "Current Cost" (`cf_874`) **and** the tenant's configured
   inventory-dollars method is `LIFO`, a LIFO cost-history snapshot is recorded (via
   `saveLifoTrackerInformation()`) **before** the cost is overwritten — meaning **a cost change on a
   PO can retroactively affect LIFO inventory valuation tracking, not just this PO's line price.**
   This is a cross-cutting effect worth preserving deliberately in any reimplementation, not an
   accidental side effect to drop.
3. The new cost is also propagated into per-UOM (unit-of-measure) pricing (`update_uom_pricingdata_
   fields()`, `get_UOM_pricing_data()`, `conversion_base_or_uom_for_qty_sellprice()`), and separately
   updates an Equivalent-Part's `epcurrentcost` when the override is scoped to an EP rather than the
   primary product.

**Confirmed security concern**: the location-cost UPDATE, the equivalent-parts UPDATE, and the final
committed/staging line-item UPDATEs in this file all build raw string SQL with `$_REQUEST` values
concatenated in — five separate statements across five different tables reachable from one
cost-override endpoint (risk PO-RISK-004). Given this file also drives LIFO-tracker snapshots and
UOM pricing sync, a successful injection here has knock-on effects into inventory valuation, not
just the one PO being edited.

### 4. EP (Equivalent Part) pricing sync (`getEPprice.php`)

**Inputs**: a comma-separated list of Equivalent-Part ids.

**Formula**: pulls `epcurrentcost`/`epvendorcost` from the equivalent-parts table and pushes the
current cost into the matching staging-table row (matched by line number), but **only** when the
line's cached EDI-availability detail indicates the line hasn't been vendor-confirmed yet.

**Confirmed correctness bug, distinct from but co-located with a security bug**: the UPDATE
statement contains two `WHERE` clauses in sequence —

```sql
UPDATE lbm_iframepodetails SET costprice = '...' WHERE ponumber = '$ponumber' AND linenum = '...'
    WHERE `ediextradetail` LIKE '%::%' OR ...
```

A second `WHERE` after the first is a MySQL syntax error; as written, this query would either fail at
execution, or — if the database wrapper silently tolerates/truncates it — behave as an
**unconditional update matching only the first `WHERE`**, meaning it would never respect the
EDI-detail guard it was apparently meant to enforce. Either outcome is wrong. Flagged for
verification with `EXPLAIN`/execution before any reimplementation assumes this guard actually works
today. The same statement's `$ponumber` is also concatenated unescaped — the security angle of the
identical line is tracked separately under risk PO-RISK-006.

### 5. Currency handling

- **`setVendorCurrency.php`** resolves a vendor's default currency and price-sheet cost from
  `vtiger_vendorcf`, then fetches the live currency symbol/conversion rate, returned to the client
  for the PO edit screen to apply to line pricing.
- **`updatecurrencyrate.php`** supports **three independent currency-rate-update paths**:
  1. A global currency-list-view edit, which parameterizes correctly.
  2. An ad-hoc rate override keyed by a currency code parsed out of a client-supplied delimited
     string — **not parameterized**, raw concatenation into the `WHERE` clause (risk PO-RISK-012).
  3. A per-PO recompute of every staging line's cost/core-price fields (native and converted), when a
     PO's currency rate changes mid-edit, recalculating each converted value as
     `old_value / old_rate * new_rate` — both the old and new exchange rates arrive from the client,
     `floatval()`-cast before use. This path is comparatively safer than path 2 because of the
     explicit numeric cast, but still trusts the client for the actual rate rather than re-deriving it
     server-side from the currency table.

  The fact that path 1 in the same file parameterizes correctly while path 2 does not is called out
  explicitly under risk PO-RISK-012 as evidence the fix pattern was already known and simply not
  applied consistently.

### 6. PPD (Prepaid Discount) handling (`setPPDValues.php`)

Reads/writes the vendor's PPD type and PPD amount fields — **on `vtiger_vendorcf`, a Vendors-module
table, not on any PurchaseOrder table at all** — keyed by vendor id from the request, with **zero
bind parameters on any of its four SQL statements**. Functionally part of the PO cost pipeline (the
header's PPD % field, this section's cost calculations, and the vendor-level PPD % all feed the same
discount-at-receiving logic used by reconciliation's discount-amount/discount-COA fields), but a
cross-module write with no parameterization at all — full severity/exploit framing carried under
risk PO-RISK-002, and the direct motivation for Requirement R4 (entities-and-fields.md) that
vendor-owned fields must be read via a service call, never written directly, in a new
implementation.

### 7. Freight/Duty/Surcharge distribution flags

Both header (`check_s_h`, `check_surcharge`, `check_order_charge`) and line
(`check_polineitem_s_h`, `check_polineitem_surcharge`, `check_polineitem_order_charge`) `Y`/`N` flags
gate whether S&H, surcharge, and small-order-charge amounts get algebraically distributed across
line items proportional to cost/quantity, versus staying only at header level. Two dedicated ajax
setters, `updateFreight.php` and `updateTax.php`, handle the header freight/tax fields with simple
parameterized or near-parameterized updates — **not flagged as a security risk** in the source
blueprint's risk pass, in contrast to most of the rest of this pipeline.

### 8. Reconciliation-side financials

Reconciliation compares receiving-side vs. invoice-side amounts per line (e.g. bill cost vs. invoice
bill cost, core-ship vs. invoice core-ship, total cost vs. invoice total cost) and **stores the
deltas directly** (product variance, core variance, other variance) rather than recomputing them at
read time. Header-level totals mirror this (product/core/other/freight variance totals, cost
variance amount, quantity variance amount), each with a paired chart-of-accounts (COA) string column
for GL posting — the schema encodes accounting-integration intent directly into the reconciliation
table rather than through a separate GL-mapping table. Irish/UK VAT rate buckets (fixed columns for
23%/13.5%/0% rates) and a QuickBooks-profile field indicate multi-region tax handling coupled to a
specific QuickBooks profile — a locale-specific design choice flagged for generalization in a new
implementation (build-guidance.md Design Decision D-7 — move region-specific tax handling to a
locale/region configuration layer rather than fixed named columns).

**Rounding behavior**: not documented in the source blueprint for any step of this pipeline — not
asserted here.

## Server-Side Recomputation Requirement

Any value derived by this pipeline must be recomputed server-side at every consuming step, never
accepted as caller-supplied input. This is the standard fix for the "client-trusted total" class of
risk, and is directly motivated by the confirmed findings above: `updatecurrencyrate.php` path 3
already trusts client-supplied exchange rates (numeric-cast but not re-derived server-side), and the
`CalcTotal.php`/`UpdateCost.php` findings (risks PO-RISK-001, PO-RISK-004) show the cost pipeline's
existing write endpoints accept raw request values with no server-side re-derivation or
parameterization at all. A new implementation's cost/pricing/currency service must own every
computation itself, treating client-submitted totals/rates as display hints at most, never as
write-authoritative input.

## Open Items

- Whether `transcode == 7` genuinely means "waste"/"non-cost" is inferred only from the co-located
  file name (`RemoveWastePODetails.php`), not independently confirmed against an authoritative
  transcode lookup table — carried forward as the same open item noted elsewhere in this module's
  spec (Open Question PO-OQ-005).
- The `getEPprice.php` double-`WHERE` statement's actual runtime behavior (hard failure vs. silent
  unconditional update) was not confirmed by execution in this pass — flagged for verification before
  any reimplementation assumes the EDI-detail guard is currently effective.
- Whether the three-way currency-rate-update path split (§5 above) reflects a deliberate design
  (global vs. ad-hoc vs. per-PO recompute) or accreted inconsistently over time was not traced beyond
  what each path's code shows.
- Rounding behavior for any calculation step above is not documented in the source and is not
  invented here.
