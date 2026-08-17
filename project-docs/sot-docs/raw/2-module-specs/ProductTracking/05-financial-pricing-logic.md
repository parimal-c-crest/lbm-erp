# ProductTracking — Financial / Pricing Logic

Part of the ProductTracking tech-agnostic module spec. Source:
`blueprint/module/ProductTracking/04-financial-pricing.md` (Doc1 Pass 4), cross-checked against Pass 7's
re-verification pass, ultimately derived from `blueprint/module/ProductTracking/`.

**This module has no pricing pipeline of any kind — stated explicitly, not glossed over.** No sell-
price/tax/discount calculation exists anywhere in this module's own files; the Sell Price field is
confirmed always empty on live data (this module's entities-and-fields documentation). What
ProductTracking *does* have is a real, non-trivial **costing** pipeline — a multi-branch resolution of
unit/extended cost figures computed on every single row, executed inside the module's own save hook, not
merely copied from a caller's already-computed value.

## 5.1 Overview — a real costing pipeline, no pricing pipeline

**Direct statement of the finding**: ProductTracking has no sell-price/discount/tax calculation pipeline
of any kind. What it computes, on every save, is a **cost snapshot**: four distinct cost figures (unit
cost, net cost, accounting cost, accounting net cost), each resolved by a different (and not always
consistent) rule, plus the row's own net-quantity-change figure. This is real arithmetic executed inside
the module's own save hook — this module's costing logic is self-contained, not borrowed from a
different module's own file the way some sibling modules' calculation surfaces are (Pass 4 §1).

## 5.2 Net Effect — the only pure-quantity formula

**Formula**: `Net Effect = New Qty − Prev Qty`. Computed unconditionally on every save, discarding
whatever value (if any) the caller submitted. **No division operator appears anywhere in this module's
own save-hook arithmetic** — a genuine, confirmed structural difference from sibling modules whose
margin-percent calculations carry a division-by-zero risk class; that risk class does not apply to this
module's own file (Pass 4 §2, §5 Finding 3).

## 5.3 Cost basis resolution — four cost figures, three independently-branched formulas

### 5.3.1 Cost — always Average Landed Cost, never basis-aware

**Formula**: `Cost = Average Landed Cost` — always, regardless of the location's own configured
GP-basis setting. Confirmed unconditional assignment, no branch (Pass 4 §3.1).

### 5.3.2 Net Cost — also always Average Landed Cost, matching Cost but diverging from Accounting Net Cost

**Formula**: `Net Cost = Average Landed Cost × Net Effect`. This formula is hardcoded with no branch at
all — it does not consult the GP-basis setting that governs Accounting Net Cost (§5.3.4 below). On a
location configured for a non-default cost accounting basis, `Net Cost` and `Accounting Net Cost` are
computed from **two different cost-basis fields on the same row, in the same save** — a real, confirmed
formula divergence, not a hypothetical one (Pass 4 §3.2, §5 Finding 1).

### 5.3.3 Accounting Cost — a direct pass-through, not a computation

**Formula**: `Accounting Cost = <caller-supplied per-unit cost value>` (verbatim, whatever the caller
supplied) — no multiplication, no basis resolution. Only set if the caller populated that value at all;
otherwise the column is left unchanged by this save. The value is spliced directly into the write
statement with no numeric cast or escaping (this module's business-rules documentation, PT-VAL-007; see
also §5.5 below) (Pass 4 §3.3).

### 5.3.4 Accounting Net Cost — the module's most-branched formula, three independent override layers

**Formula (base case, no override)**: `Accounting Net Cost = CostBasisField(GP-basis setting) × Net
Effect`, where CostBasisField maps to one of four distinct location-level cost columns depending on the
GP-basis setting's value (including a default/unset case). **Note**: the GP-basis setting's own
"Average Landed Cost" literal value maps to a *different* location field than the one `Cost`/`Net Cost`
hardcode as their own default — meaning even the module's own "default" cost-basis field and its own
explicitly-named "Average Landed Cost" setting value point at two distinct location-level cost columns,
whose exact business-meaning difference was never resolved (Pass 4 §3.4, Open Question 1).

**Override layer 2** (Receiving events with a known PO cost): replaces the entire GP-basis calculation
with `Purchase Order Cost × Net Effect`.

**Override layer 3** (Product-Cut-originated rows): replaces it again with `WAC × Net Effect`.

Layers 2 and 3 are mutually exclusive in the code as written (each is a separate conditional, not an
`elseif`), but their trigger conditions are not shown to be mutually exclusive by any guard in the save
hook — if a caller somehow satisfied both conditions simultaneously, layer 3 would silently win since it
executes last. Not observed happening on live data in the blueprint's own investigation, but the code
shape permits it (Pass 4 §3.4, §5 Finding 2).

### 5.3.5 Bin/Zone/Shelf — WMS-aware location resolution, riding in the same write as the cost figures

Not a numeric calculation — a location lookup, branched on whether the location is WMS-enabled. Included
here because it executes as part of the same atomic write as the four cost figures above (this module's
business-rules documentation, PT-VAL-010).

## 5.4 M2 — a cross-field resync, not a computation

**Formula**: `M2 = <a product custom column's value>` (a plain copy, parameterized safely) — the
business meaning of the source column/"M2" itself was never identified in the blueprint.

## 5.5 Reconciliation findings

1. **`Net Cost` and `Accounting Net Cost` genuinely diverge in cost basis on any location not configured
   for the default cost basis.** `Net Cost` is hardcoded to one location field (§5.3.2); `Accounting Net
   Cost` branches across four fields per the GP-basis setting (§5.3.4). On a non-default-basis location,
   the same save writes two "net cost" figures computed from two different underlying cost columns —
   confirmed by direct formula comparison, not inferred (Pass 4 §5 Finding 1).
2. **`Accounting Net Cost`'s three override layers have no confirmed mutual-exclusivity guard** (§5.3.4)
   — not observed conflicting on live data, but the code shape permits it (Pass 4 §5 Finding 2).
3. **No division-by-zero risk exists anywhere in this module's own costing arithmetic** — every formula
   above is multiplication or a direct copy; the save hook contains zero division operators. This is a
   genuine, confirmed structural difference from sibling modules whose own financial-logic findings are
   dominated by division-by-zero risk (Pass 4 §5 Finding 3).
4. **Accounting Cost and (via override layers 2/3) Accounting Net Cost are populated from
   caller-supplied values spliced directly into SQL text with no escaping or numeric cast** — a
   financial-calculation-adjacent security finding, fully characterized as one of this module's four
   confirmed Critical SQL injections in this module's business-rules and risks-and-open-questions
   documentation (Pass 4 §5 Finding 4; Pass 7 §1.3).

## 5.6 Server-side recomputation requirement for a new implementation

Per the module's governing architectural requirement R2 (this module's entities-and-fields
documentation):

- **Exactly one cost-basis resolution service should compute the unit cost, net cost, accounting cost,
  and accounting net cost figures**, implementing the override precedence as an explicit, ordered branch
  (Product-Cut-override → Receiving-override → GP-basis-branch → default) rather than three
  independently-triggered SQL-fragment overwrites. **Net Cost should be derived from the same resolved
  cost basis Accounting Net Cost uses** — both fields computed from one resolved value, not two
  independently-hardcoded columns, closing §5.5 Finding 1 by construction.
- **The three override layers' precedence should be made an explicit, ordered decision, not left as
  three independently-triggered `if` blocks with no guard against a caller satisfying more than one
  condition at once** — closing §5.5 Finding 2 by construction.
- **All caller-supplied cost values must reach the write layer only through a parameterized query
  builder**, never string-concatenated into SQL text — closing §5.5 Finding 4 (one of the module's four
  confirmed Critical SQL injections) by construction, per the module's own security-by-construction
  requirement (R3).
- **No calculation should be invented for `.sellprice`** (confirmed dead on all 15,013 live rows) without
  first confirming with a subject-matter expert what, if anything, it was ever meant to represent — the
  same "don't build a feature around a confirmed-dead column" principle this specification's other
  modules apply to their own equivalent findings.
