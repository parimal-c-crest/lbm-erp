# Vendors — Calculations

> Keep this file even if this module has no computed/derived logic — state that explicitly below
> rather than deleting the file. A missing file can't be told apart from "nobody got to it yet";
> an explicit "no calculation logic exists in this module" statement can't be. See
> `_deviations-from-original-template.md` in this folder for why.

Source: `docs_from_blueprint/module/Vendors/05-financial-pricing-logic.md`, itself derived from
`blueprint/module/Vendors/04-financial-pricing.md`, extended by `06-cross-module-integrations.md` and
`07-risk-findings.md`.

## Applicability

Applies, narrowly. Vendors performs almost no arithmetic of its own — no GP/margin/cost-computation of any
kind exists anywhere in this module. Four narrow items make up its entire calculation surface, documented
below: (1) a Freight PPD dollars↔units type-coercion block (not really "computed" data, but the closest
thing this module has to a calculation, and materially bug-affected); (2) the Vendor Line Code
markup/square-footage pricing arithmetic, which is genuine calculation but happens entirely in SalesOrder,
not Vendors; (3) the "Pull Cost Price From" cost-source selector, a pure configuration lookup with no
arithmetic; (4) Vendor Conversion Rule, confirmed pure identity mapping with no pricing math. Every
dollar-shaped value this module touches is either a plain configuration field consumed as-is by another
module's calculation, or a pricing *parameter* whose actual arithmetic lives entirely in SalesOrder.

## Calculation Pipeline

### 1. Freight PPD Amount — dollars↔units coercion (type coercion, not a business formula)

**Intended behavior**: Freight PPD Amount and 2nd Freight PPD Amount are meant to be stored as a decimal
dollar figure when the vendor's "Freight PPD Based on" is configured as "Dollars," and as a whole-unit
count when configured as any other basis.

**Three independently-behaving write paths across two modules, only one correct**:
- **Full-form save (Vendors)**: reads "Freight PPD Based On" through an undefined variable — always
  evaluates to null, so the Dollars-branch (decimal coercion) is structurally unreachable and the
  whole-unit branch always runs. Result: a Dollars-basis vendor entering `1500.75` gets it saved as `1500`
  — cents silently truncated, on every save via the full Edit form.
- **Inline DetailView edit (Vendors)**: reads the correctly-named request field — correctly applies decimal
  coercion for Dollars-basis vendors. The one path of the three that is correct.
- **PurchaseOrder module's direct write** (`setPPDValues.php`, a different module entirely): writes the
  submitted amount and basis values verbatim, with **zero coercion of any kind**; independently confirmed
  SQL-injectable; never notifies QuickBooks of the change.
- Whether `2nd Freight PPD Amount` shares the full-form save's always-whole-unit-coercion bug without also
  having the inline-edit path's escape hatch is not confirmed for that specific field — open question.

**Output**: the persisted Freight PPD Amount value. **Rounding behavior**: intended is 2-decimal-place
currency rounding for Dollars-basis vendors; actual behavior differs by write path (see above) — this is
itself the finding, not an incidental detail.

### 2. Vendor Line Code markup/square-footage pricing (arithmetic owned by SalesOrder, not Vendors)

Vendors (and the record's actual owning module, `VendorLinecode`) supply the *values*; the arithmetic
itself is client-side JavaScript inside SalesOrder's Non-Stock-Code (NSCode) line-entry calculator, not
Vendors. Documented here because the input fields live in this module's field catalog.

**Markup-adder formula** (confirmed):
```
costWithAdder = cost + (cost * adder_per / 100)
```
`adder_per` is a **percentage markup applied to a product's cost** — not a flat per-unit dollar adder
despite an earlier field-catalog description; corrected once the actual consuming formula was traced.
`costWithAdder` then feeds a GP%-to-price back-solve and a GP% computation from a given quantity/extended
price, both in the same client-side calculator.

**Square-footage price formula** (confirmed), gated by the line code's "Use Sq Ft Calculation" flag:
```
totalSqFt  = (width * height / 144) * quantity     [144 = 12x12, sq-in-to-sq-ft conversion]
sqFtPrice  = pricePerSqFt * totalSqFt
```

**Whether the server independently re-verifies `costWithAdder`, or always trusts the client-submitted
figure, is an open item** — the server-side code was found to receive `costWithAdder` as an
already-computed request parameter, not confirmed to independently re-derive it.

### 3. "Pull Cost Price From" (cost-source selector) — confirmed a pure lookup, no computation

A vendor-level enum names *which* of a Product's own cost fields another module should read — Vendors
performs no arithmetic on cost itself. Confirmed to have **three independently-maintained implementations**
across the codebase (a switch statement, an array lookup, and a differently-signed implementation inside
one specific PO-line-build path), each a pure enum→column-name lookup, no cost math inside any of them.
Consumed by internal Purchase-Order/SalesOrder pricing and the external-facing B2B customer catalog's
product-list builder.

### 4. Vendor Conversion Rule — confirmed pure identity mapping, no pricing math

The CSV import and delete paths contain no numeric/pricing computation of any kind — a straight
manufacturer-number-to-line-code identity substitution, gated by the owning vendor's "Apply Conversion"
flag, with no markup, cost, or price field touched anywhere in the read/write path.

## Server-Side Recomputation Requirement

Any value derived by this pipeline must be recomputed server-side at every consuming step, never accepted
as caller-supplied input. This is the standard fix for the "client-trusted total" class of risk, and it is
directly relevant here on two specific points already flagged as open items above:

- **`costWithAdder`** (§2): confirmed, in the legacy system, to be received by server-side code as an
  already-computed request parameter, with no confirmation that the server independently re-derives the
  multiplication itself. A rewrite must recompute `costWithAdder` server-side from `cost` and `adder_per`
  at every point it is consumed, not trust the client-submitted figure.
- **Freight PPD Amount coercion** (§1): the correct dollars-vs-units coercion logic must live in exactly
  one authoritative, server-side write path that every caller — including a Purchase-Order-module screen —
  is routed through, rather than three independently-behaving write paths each re-implementing (or failing
  to implement) the same coercion rule.
- **GL account fields** (COGS/Income GL Account on Vendor Line Code): no confirmed live consumer found for
  any automatic GL-posting purpose in the legacy system — flagged in `entities-and-fields.md`'s Known Gaps,
  not itself a recomputation concern, but noted here since it sits adjacent to this module's one other
  money-shaped field cluster.
