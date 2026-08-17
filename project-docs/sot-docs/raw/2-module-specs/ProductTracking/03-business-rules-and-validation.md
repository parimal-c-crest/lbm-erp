# ProductTracking — Business Rules & Validation

Part of the ProductTracking tech-agnostic module spec. Source:
`blueprint/module/ProductTracking/02-validation-rules.md` (Doc1 Pass 2), cross-checked against Pass 7's
re-verification pass, ultimately derived from `blueprint/module/ProductTracking/`.

The blueprint catalogs **21 numbered business/validation rules** (PT-VAL-001 through PT-VAL-021). Like
every other module carried through this series so far, this module has **no `ERR_`-style rejection
strings and no duplicate/uniqueness checks** anywhere in its own files — its "validation" is almost
entirely server-side re-computation of derived fields, not rejection of bad input. Rule IDs are
preserved below for traceability. Each rule is condensed to **statement / trigger / scope / severity**;
the original file:line legacy citations are dropped from this document but remain fully available in
`blueprint/module/ProductTracking/02-validation-rules.md` if ever needed to re-verify a rule against the
legacy source.

**Severity legend**: *Hard block* = the operation is refused/rejected entirely; *Hard override* = a
submitted value is unconditionally discarded and replaced by a computed one; *Conditional calc/side
effect* = a branch that runs (or not) depending on input, never a rejection; *Not a block* = documents an
absence-of-guard finding or a structural observation; *Critical (security)* = a confirmed, unmitigated
SQL injection.

**Headline finding — three of the module's four confirmed, unmitigated SQL injections are documented in
this module's own files** (the fourth lives in a shared writer function outside the module — see this
module's cross-module-integrations documentation). Detailed in PT-VAL-009, PT-VAL-019, and PT-VAL-021
below.

## 3.1 Save.php absent-guard rules (PT-VAL-001 to 002) — 2 rules

Governs the module's own generic save entry point. Headline finding: this file performs **zero
validation of any field** — the only other content is a dead currency-conversion block for 5 fields
that do not exist on this entity at all, a Campaigns-module copy-paste leftover.

| ID | Statement | Trigger | Scope | Severity |
|---|---|---|---|---|
| PT-VAL-001 | No presence/emptiness check exists anywhere in this file for any field before the save runs — every submitted value is loaded and saved as-is. | Every POST to this endpoint | N/A — absence-of-guard finding | None are hard blocks |
| PT-VAL-002 | A block converts five request keys (`expectedrevenue`, `budgetcost`, `actualcost`, `actualroi`, `expectedroi`) to dollar amounts and assigns them into the field map — **none of these 5 keys exist among this entity's 35 physical columns**, so the block is dead: it either silently no-ops (the real EditView form has no such fields) or, if ever reached via a hand-crafted request, writes into field-map entries the entity's own save logic never reads. | Never legitimately triggered — a Campaigns-module (Opportunity-style) copy-paste leftover | N/A | Dead code, not a live rule |

## 3.2 Entity save hook — cost/QoH computation rules (PT-VAL-003 to 013) — 11 rules

**Headline finding**: the entity's own save hook contains **no hard validation** — every branch is a
conditional side-effect (a derived-field computation or a conditional QuickBooks push), never an abort.
Unlike a module whose save hook is empty, this hook does real, non-trivial work on every save (cost/QoH
bookkeeping), it just never rejects.

| ID | Statement | Trigger | Scope | Severity |
|---|---|---|---|---|
| PT-VAL-003 | Net Effect is unconditionally recomputed server-side as `New Qty − Prev Qty` on every save, regardless of whatever value (if any) was submitted for it — the submitted value, if any, is discarded. | Every save | Net Effect | Hard override |
| PT-VAL-004 | Created Time and the creating-user id are unconditionally re-stamped to the current server time and session user on every save (not just create), via the same write as PT-VAL-003. | Every save, including inline-edit updates | Created Time, creating-user id | Hard override |
| PT-VAL-005 | The cost basis used for Accounting Net Cost is selected by a location-level GP-basis support setting: one setting value maps to one location field, a second maps to another, a third to a third, and any other value (including unset) maps to a fourth field (Average Landed Cost). | Every save | Accounting Net Cost | Conditional calc (4-way branch) |
| PT-VAL-006 | Net Cost is **always** computed from Average Landed Cost regardless of the GP-basis setting governing PT-VAL-005 — diverges from Accounting Net Cost's basis-aware resolution on every save where the setting is not the Average-Landed-Cost value. | Every save | Net Cost | Not a block — a real formula divergence (see this module's financial/pricing-logic documentation) |
| PT-VAL-007 | Accounting Cost is set only if the caller supplied a per-unit cost value; otherwise the column is left unchanged by this save. | Every save where the caller populated that value | Accounting Cost | Conditional (skip if absent) |
| PT-VAL-008 | If Change Type is `'Receiving'` **and** the caller supplied a purchase-order cost, Accounting Net Cost is overridden to `purchase order cost × Net Effect`, superseding PT-VAL-005's GP-basis-driven value entirely. | Every save with `change_type='Receiving'` and a supplied PO cost | Change Type, Purchase Order Cost, Accounting Net Cost | Hard override (2nd override layer) |
| PT-VAL-009 | If a Product-Cut-origin flag is set, Accounting Net Cost is overridden a **third** way, to `WAC × Net Effect` — superseding both PT-VAL-005 and PT-VAL-008. **None of the caller-supplied cost values feeding this branch or PT-VAL-007/PT-VAL-008 is escaped, cast to numeric, or bound as a query parameter before being string-concatenated directly into the dynamic write statement.** | Every save originating from a Product-Cut create flow | Product-Cut flag, WAC, Accounting Net Cost | **Critical (security) — confirmed, unmitigated SQL injection, directly reachable through the inline-edit endpoint's mass-assignment gap (see §3.4)** |
| PT-VAL-010 | Bin/Zone/Shelf resolution branches on whether the location is WMS-enabled: non-WMS locations copy directly from the location's own configured bin/zone/shelf columns in the same write; WMS-enabled locations run a separate lookup, sort by a ranking sequence, and take the first-ranked bin/zone/shelf, with the resulting string values interpolated directly into the SQL fragment rather than bound as parameters. | Every save | Bin, Zone, Shelf | Conditional calc (2-way branch); unparameterized but **second-order** — the interpolated values originate from a DB lookup, not directly from request input, the same Low/Informational treatment given to the analogous finding in prior modules of this series |
| PT-VAL-011 | M2 is resynced on every save from a product custom column, looked up by product number via a bound (safely parameterized) query parameter. | Every save | M2 | Conditional recompute, parameterized safely |
| PT-VAL-012 | A cross-module Big-Com product check is invoked only when Change Type is **not** `'Receiving'` and **not** `'Product mass update'`. | Every save except those two change types | Change Type, Product Number | Conditional side-effect — internals of the cross-module function not read in the blueprint's own module-scoped pass |
| PT-VAL-013 | The QuickBooks push fires only if the caller set Push To Quick Book to `'Yes'`; within that, a second branch distinguishes four specific `change_type` values (adding tax/amount params sourced from session or raw request state) from every other change type (a simpler param set). Of the 4 named `change_type` values, only 2 have any live rows on the blueprint's own dev snapshot; the other 2 have zero — the branch's finer-grained logic is largely unexercised on this tenant's data, not asserted dead system-wide. | Every save with Push To Quick Book `= 'Yes'` | Push To Quick Book, Change Type | Conditional side-effect (2-level branch) |

## 3.3 Delete lifecycle rules (PT-VAL-014 to 015) — 2 rules

| ID | Statement | Trigger | Scope | Severity |
|---|---|---|---|---|
| PT-VAL-014 | Delete aborts if the record id is not set. | Every delete | ProductTracking record id | Hard block |
| PT-VAL-015 | Once the presence check passes, delete is delegated unconditionally to the generic shared delete helper — no existence check, no referencing-data integrity check, no permission check performed in this file itself; the shared helper's own internals were not re-read in the blueprint (a shared-framework boundary drawn consistently across this series). | Every delete with a non-empty record id | ProductTracking row | Unconfirmed whether the shared helper itself enforces anything further |

## 3.4 Inline-edit ajax rules (PT-VAL-016 to 018) — 3 rules

**Headline finding**: the same "presence-checked but no field allow-list" shape found across this
series' equivalent endpoints, but here the consequence is sharper: because saving through this endpoint
re-invokes the **entire** cost/QuickBooks-push pipeline (§3.2), an inline edit to *any* single field
silently re-triggers all of it — including, if the caller targets the right field name, PT-VAL-009's
unescaped SQL splice directly.

| ID | Statement | Trigger | Scope | Severity |
|---|---|---|---|---|
| PT-VAL-016 | The field-save logic runs only if the record id is non-empty; otherwise a silent-failure response is returned and nothing is written. | Every inline field edit | ProductTracking record id | Hard block (silent-failure response) |
| PT-VAL-017 | The submitted field value is assigned directly to the field map with **no allow-list of editable field names, no type/format check, and no bounds check** — any field name/value pair the caller supplies is accepted. | Every inline field edit | Any ProductTracking field | None are hard blocks |
| PT-VAL-018 | Because saving through this endpoint re-runs the entity save hook in full, an inline edit to an unrelated field silently re-triggers PT-VAL-003 through PT-VAL-013 on the same row — including a possible QuickBooks push if `push_to_qb` already happens to be `'Yes'` on that row, and including PT-VAL-009's unescaped cost-field splice **if the caller sets the field name directly to one of the cost-basis field keys via this endpoint**, since PT-VAL-017's mass-assignment gap places no restriction on which column name is targeted. | Every inline field edit | Multiple downstream fields, plus a potential QB push and the injection surface named in PT-VAL-009 | **High — chains PT-VAL-017's mass-assignment gap directly into PT-VAL-009's confirmed unescaped SQL splice, making it request-reachable using nothing more than an existing record id and the module's own everyday inline-edit endpoint shape** |

## 3.5 ListView / search surface rules (PT-VAL-019 to 020) — 2 rules

| ID | Statement | Trigger | Scope | Severity |
|---|---|---|---|---|
| PT-VAL-019 | When a specific request flag (`from=pricingavail`) is present, the entire computed list-filter clause is **discarded and replaced** with a raw product-number comparison built directly from an unescaped, uncast, unbound request parameter, before being executed with an empty bind-array argument — the injected value is already baked into the query text before execution. | Every ListView request with `from=pricingavail` — an ordinary GET request to the module's own default entry point, gated only by the standard session-authentication check every module in this codebase shares, with no additional permission check specific to this branch | Product Number, and (via the injection) potentially any data reachable from this database connection | **Critical (security) — confirmed, unmitigated SQL injection, reachable via the module's own everyday ListView entry point** |
| PT-VAL-020 | Every non-`pricingavail` request builds its filter clause via the shared framework's generic where-condition builder — internals not re-read in the blueprint's own module-scoped pass, the same boundary drawn consistently across this series for shared vtiger-core query builders. | Every ordinary ListView request | N/A | Unconfirmed — out of the blueprint's own module-scoped budget |

## 3.6 Product-variant detail popup rule (PT-VAL-021) — 1 rule

| ID | Statement | Trigger | Scope | Severity |
|---|---|---|---|---|
| PT-VAL-021 | A request parameter identifying the tracking row is concatenated directly, with **no escaping, no type cast, and no validation of any kind**, into a raw SQL string, executed with **no bind-array argument at all**. | Every "view variant detail" popup click, reached through a generic ajax dispatcher shared with the module's other ajax endpoints, gated only by standard session authentication | A three-table join, and (via the injection) potentially any data reachable from this database connection | **Critical (security) — confirmed, unmitigated SQL injection** |

## 3.7 Rule catalog notes

- The full rule catalog with legacy-source file:line citations is preserved at
  `blueprint/module/ProductTracking/02-validation-rules.md` for traceability if a claim above ever needs
  re-verification against the original source.
- A recommended enforcement-layer mapping for all 21 rules exists as part of this module's own
  build-guidance documentation.
- A fourth confirmed Critical SQL injection — in the shared writer function `ptcommonentry()`'s own WAC
  lookup, reachable from the external mobile-scanner webservice — lives outside this module's own files
  and is documented in this module's cross-module-integrations and risks-and-open-questions
  documentation rather than as a numbered PT-VAL rule, since it is not part of this module's own
  02-validation-rules.md rule set.
- Beyond the four confirmed Critical injections (three in this file, one in the shared writer function),
  the blueprint's risk-re-verification pass found no fifth directly-request-reachable injection, zero
  wrong-entity-class instantiations anywhere in the module, and one table-alias anomaly (a listview
  column reference to a table alias with no corresponding join) flagged as an unresolved Open Question
  rather than a confirmed defect — not restated here.
