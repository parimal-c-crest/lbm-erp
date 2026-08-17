# Settings — Calculations

> Keep this file even if this module has no computed/derived logic — state that explicitly below
> rather than deleting the file. A missing file can't be told apart from "nobody got to it yet";
> an explicit "no calculation logic exists in this module" statement can't be. See
> `_deviations-from-original-template.md` in this folder for why.

Source: `docs_from_blueprint/module/Settings/05-financial-pricing-logic.md`, itself sourced from
`blueprint/module/Settings/04-financial-pricing.md` ("Pass 4 — Settings Calculation Pipeline").

## Applicability

Partially applicable, in an unusual shape. Settings has no pricing engine of its own the way
SalesOrder/Products/Accounts do — it is a system-configuration backbone. The source traced six areas
flagged as calculation-shaped by earlier passes, not a full re-derivation of every dollar-shaped field
in the module:

| Area | Verdict | Where the real math (if any) lives |
|---|---|---|
| 1. VDP tier system | **Real calculation exists**, but not where expected — see below | A monthly rebate report, not live Sales Order pricing |
| 2. Tax config | **Pure configuration** — no rate-application math in Settings | Tax-dollar computation lives in SalesOrder, not documented here |
| 3. Currency conversion | **Real calculation exists**, genuinely triggered by a Settings save | A cross-module function in the PurchaseOrder module |
| 4. Commission tiers | **Pure configuration** — a color-lookup band table, no commission formula anywhere | N/A — the one consumer found is display-only |
| 5. Alternate costs mechanism | **Pure schema/config mechanism** — dynamic custom-field creation, no cost formula | N/A |
| 6. Payroll/holiday | **No Settings-side save path at all** | Clock-in/out write path lives in the Users module |

Two of the six areas turned out to have genuine arithmetic — but in both cases the formula itself
lives **outside** Settings, in a file Settings' save action reaches into (currency) or that
independently reads a Settings-owned table (VDP). Because two areas genuinely compute something, this
file documents those pipelines below rather than declaring blanket non-applicability.

## Calculation Pipeline

### 1. VDP tier system — a monthly volume rebate, not a per-line sale price

The only place in the entire codebase that reads a VDP tier's discount-percent column and does
arithmetic with it is a report function (`monthlyvolumediscount.php::getvolumediscountpercent()`).

**Inputs**: an account's net purchase dollar volume for a period; the account's assigned VDP plan (via
a membership check against a comma-separated account-id list); the plan's tier rows.

**Formula (tier lookup)**: find the single tier row whose price band contains the account's net-sales
dollar amount — `minprice <= net_sales <= maxprice`, with a literal string fallback
(`maxprice = 'INFINITE'`) handling the top, unbounded tier whose maximum is never a real number. This
is a genuine, non-trivial tiered/bracketed discount-rate lookup, functionally identical in shape to a
tax-bracket or shipping-rate-table lookup.

**Formula (rebate amount)**:
```
volume_disc_amount = (netpurchasesubdisc × volume_disc_percentage) / 100
payment_due_after_discount = net_sales − volume_disc_amount
```
where `netpurchasesubdisc` is itself:
```
netpurchasesubdisc = net_sales − (less_cores + less_misc_charge + less_tax) − less_sale_net_item
```
— a "gross sales minus cores minus non-merchandise/misc charges minus tax minus VDP net-item-exempt
sales" waterfall.

**Output**: a monthly volume-rebate percentage and dollar amount, styled as an accounts-receivable
statement artifact (the report's own field labels are "Statement Balance", "Less Discount", "Payment
Due After Discount"), **not** a live sales-order line-price adjustment. It is not consulted anywhere in
the SalesOrder finalize/pricing path — a repo-wide search for the VDP tier table found exactly five
files: this report and the four Settings-side tier CRUD files, nothing in SalesOrder.

**What VDP actually does at Sales Order finalize time is a different, non-tiered mechanism**:
SalesOrder's finalize code consults only the account-assignment check (is this account on *any* VDP
plan at all) and the net-item-exception rules (per-linecode/subline/product boolean flags for whether
core charges, sell-price overrides, or promotions apply) — never the tier min/max/discount-percent
bands. No arithmetic happens in this SO-time path.

**Rounding behavior**: not documented at the two-decimal level beyond the formula shapes above; the
rebate amount arithmetic is straightforward division/multiplication with no explicit rounding call
noted in the source.

**Confirmed calculation bug**: when a new tier is created above an existing top tier, the existing top
tier's maximum price is recomputed from **its own minimum price** rather than from any value related to
where the new tier will actually begin — because the old top tier's maximum was the literal string
`"INFINITE"` (not numeric), the code falls back to a formula that collapses the previous top tier's
price band from an unbounded range down to a one-cent-wide sliver. Every account previously in that top
tier, with net sales above the new tier's minimum, now falls into the newly created tier instead — and
that new tier is inserted with **no discount-percent value supplied at all**, defaulting to zero. **Net
effect: creating a new VDP tier level silently zeroes out the volume-discount percentage for every
account whose net sales exceed the old top tier's minimum**, until an operator manually notices and
backfills the new tier's percentage — a real, business-significant calculation-correctness bug (see
`risks-and-open-questions.md` R3), not a cosmetic one.

By contrast, the tier-*edit* cascade logic (re-shuffling every tier above an edited one) explicitly
preserves each tier's existing width — a materially more careful piece of arithmetic than the
tier-*creation* logic, which makes no attempt to preserve the old top tier's width at all. This is an
internal inconsistency between two save paths for the same entity.

### 2. Currency conversion — Settings triggers a real, confirmed cross-module cost recompute

Settings' own currency-save action performs no conversion math itself — it simply persists the
submitted conversion rate verbatim. But its very next line calls into a function defined in a
different module entirely (PurchaseOrder), reached via a direct include.

**Inputs**: the currency code being edited; the new conversion rate; every vendor whose configured
default currency matches the currency being edited; each such vendor's "equivalent parts"
(cross-reference/interchange cost records) with a positive current cost.

**Formula (mass retroactive cost recompute)**:
```
epvendorcost   = ROUND(epcurrentcost / exchange_rate, 2)
epbasecorecost = ROUND(epcorecost   / exchange_rate,  2)
```

**Output**: every affected vendor's every equivalent-part row has its vendor cost and core cost
retroactively divided by the new exchange rate, in the same request, with **no confirmation step, no
dry-run, and no audit-log row written** (unlike a similarly-shaped cost-change-logging mechanism found
elsewhere in Settings for weighted-average cost).

**Rounding behavior**: explicit `ROUND(..., 2)` to two decimal places on both outputs.

**Trigger scope**: this recompute runs as a mass update across every affected vendor's every
equivalent-part row, triggered synchronously by a single Settings-page currency-rate save — and it
fires on **every** currency save, even one that only changed an unrelated field like currency status,
since the currency code and rate are read from the request regardless of which fields the operator
actually intended to change (see `risks-and-open-questions.md` R4).

**A second, independently-triggered conversion calculation** exists in the same source file
(reachable directly as a request handler, not only via the currency-save call), applying the same
divide/multiply-by-exchange-rate concept — bidirectionally, depending on which currency a purchase
order's price sheet is denominated in — to individual purchase-order line items when a PO's own
exchange rate changes after line items already exist. This confirms the currency-conversion arithmetic
is a real, reused pattern in the codebase, not a one-off — but it is **duplicated, not shared**, within
a single file: two independently-triggered formulas over the same underlying divide/multiply-by-
exchange-rate concept, in the same source file.

**Answering the module's currency question directly**: currency conversion rate is not "just a stored
config value" — saving a new rate via Settings **immediately and synchronously retroactively
recomputes** every matching vendor's equivalent-parts cost fields for the entire organization, with no
batching/confirmation and no per-row audit trail. This is the single most consequential piece of live
arithmetic found anywhere in this module.

## Server-Side Recomputation Requirement

Both calculation pipelines above are already server-side-only in the legacy system (no caller-supplied
total is accepted for either the VDP rebate or the currency-conversion recompute) — the legacy risk is
not "client-trusted total," it is the opposite class of problem: **unbounded, unconfirmed, unaudited
server-side mass mutation triggered as an unannounced side effect of an unrelated save**. Any value
derived by either pipeline must continue to be recomputed server-side at every consuming step (never
accepted as caller-supplied input), and in addition — per `build-guidance.md` D6/D7 — the new design
should make each mutation an explicit, confirmable, audited action rather than a silent side effect of
a same-request save that also touches unrelated fields.

## Tax config, Commission tiers, Alternate costs, Payroll — confirmed no calculation surface

- **Tax config**: the percentage/label update functions are bare conditional column writers — they
  store a percentage value exactly as submitted, with no computation, range check, or derivation from
  any other value. Adding a new tax type performs a duplicate-label check and then a **schema
  mutation, not a calculation**: it widens the production tables each SalesOrder line item's tax
  breakdown is stored in by adding a new decimal column — this does not itself compute any tax amount.
  A separate "Max Tax by State" mechanism persists a state's tax-cap threshold values verbatim, with a
  duplicate-state-name guard but no numeric-range validation and no computation. Settings computes
  nothing tax-wise; the actual per-line tax-dollar computation and (if it exists) the max-tax-cap
  application both live in SalesOrder.
- **Commission tiers**: the save action persists exactly 15 submitted values (5 levels × min/max/color)
  via an unconditional delete-then-insert — no computation of any kind, just a min/max percent-band
  definition paired with a display color. The one confirmed consumer (SalesOrder's edit-view page)
  selects the whole table and hands it to the front-end as a JSON blob, presumably consumed by
  client-side script purely to **color-code an already-computed** commission or gross-profit percentage
  value. No commission percentage or dollar amount is computed from this table anywhere.
- **Alternate costs mechanism**: the core job is dynamic custom-field provisioning (drop/create custom
  columns plus matching metadata-table inserts) — the same dynamic-column-generation pattern found
  elsewhere in this module's Custom Fields area. The only numeric arithmetic in the entire file is
  display-sequence reordering (UI-ordering math for where newly created fields display), unrelated to
  computing a cost value. The resulting fields are plain decimal value slots, populated by direct user
  entry elsewhere.
- **Payroll/holiday**: the payroll time-tracking screens are pure GET-side report shells (a user
  picker plus a date range, rendered to a template) with no save operation and no computation of any
  kind — hours are not summed, rates are not applied, nothing payroll-shaped is calculated anywhere in
  Settings.

## Reconciliation findings

1. VDP tier bands feed a monthly volume-rebate report, not live Sales Order pricing — an earlier pass's
   implicit assumption (and the module's own naming) suggested the tier system prices individual sales;
   the one confirmed live consumer is a period-end statement calculation instead.
2. Creating a new VDP tier silently zeroes out the volume-discount percentage for every account
   previously in the top tier — a calculation-correctness bug with a directly traceable business impact
   on the rebate formula.
3. Saving a new currency conversion rate triggers an immediate, unbounded, unaudited mass recompute of
   vendor equivalent-parts cost fields — the single most consequential live calculation found in this
   module, living entirely outside Settings' own code, reached only via a cross-module function call.
4. Four of the six candidate areas are confirmed pure configuration with zero calculation surface: Tax
   Config, Commission Tiers, Alternate Costs, and Payroll/Holiday.
5. The currency-conversion divide/multiply formula is duplicated, not shared, within a single source
   file — the same "duplicated-not-shared" risk class documented elsewhere in this blueprint series for
   other modules' own domains, here inside one file rather than across two.

## Open Questions

- Whether the "Max Tax by State" cap is actually compared against a computed tax total anywhere in
  SalesOrder — the related supported-field toggle's name strongly implies a per-SO cap-enforcement
  comparison exists somewhere, but this was not located within Settings' own scope.
- Whether a commission percentage or dollar amount is computed anywhere in the codebase independently
  of the color-banding commission-tier table — confirmed absent within this investigation's grep scope,
  but a broader search for a commission-calculation formula unconnected to that specific table was not
  run.
- Whether `vtiger_altcost_fields`'s absence from the live dev database also holds on production tenants
  — if the table exists in production, the Alternate Costs feature may be fully functional there
  despite appearing broken on the dev snapshot examined.
- Whether the currency-conversion file's two formulas are ever both triggered by the same user action,
  and in what order — a race or double-application scenario (the PO-line recompute plus the org-wide
  equivalent-parts recompute from the same rate edit) cannot be ruled out from the scope examined.
