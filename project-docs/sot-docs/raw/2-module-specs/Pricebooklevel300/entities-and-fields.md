# Pricebooklevel300 — Entities & Fields

> Every entity, every field, individually. No grouping/summarizing — that's how fields get lost.
> Legacy table/column names are a first-class column in the field catalog below, not an optional
> footnote — this project's whole documentation discipline rests on every claim being traceable to
> a specific source, and a footnote is too easy to skip. See
> `_deviations-from-original-template.md` in this folder.

> **Governing architectural requirements (R1-R5).** The source blueprint's own schema-drift findings and
> implementation plan imply five forward-looking requirements for a new implementation (not merely observations
> about the legacy system), preserved here because they shape how the field catalog below should be read:
>
> - **R1 — Rule-to-plan relationship must be id-based, not name-based.** The legacy rule row links to its
>   owning plan by matching a text column (`pricebookname`) against the plan header's own name column — the
>   plan header's own primary key plays no role at all in the live pricing-match query. Renaming a plan without
>   a cascade-update to every one of its rule rows silently orphans those rules; no cascade-rename code path
>   was found anywhere (`docs_from_blueprint/module/Pricebooklevel300/02-entities-and-fields.md` §1 R1).
> - **R2 — The account-to-plan assignment relationship must be an explicit, normalized relationship, not a
>   pipe-delimited text column.** `vtiger_accountscf.cf_986` stores a single ` |##| `-separated string per
>   account, with no normalized join table, and is confirmed shared/undifferentiated across all three pricebook
>   tiers. **Proposed, not unilaterally finalized by this module's own blueprint** — pending a future
>   cross-sibling consolidation pass (§1 R2).
> - **R3 — Every stated business rule must actually be enforced at every point it can be violated.** The
>   legacy plan-header delete has no usage guard of any kind (§1 R3).
> - **R4 — No raw, unparameterized query construction may be reachable from caller input, anywhere** — 12
>   confirmed SQL-injection points across 6 files exist in the legacy write surface today (§1 R4).
> - **R5 — Every business entity is scoped to a tenant** — consistent with every other module in this series
>   (§1 R5).

## Entity List

| Entity | Purpose |
|---|---|
| Sales & Promotions Book (plan header) | The named, account-assignable pricing/discount plan — its own default pricing level/times/GP%/penny-round, its type discriminator, and its discount-vs-pricefield mode. |
| Level300 Rule | A scoped discount/pricing rule attached to a plan by name; carries its own product/sale-context scope, date window, and six pricing-adjustment expressions. |
| Level300 Rule Type | A small reference/priority catalog for categorizing rules (one live value, "Bulk discount," on the blueprint's own dev snapshot). |
| Coupon (this module's slice of a shared table) | A coupon code, discount basis/amount, comments, and expiry, attached to a specific rule; not exclusively owned by this module — backed by a table shared with at least one other feature, discriminated by a `generatefrom` column. |
| Account-Plan Assignment (cross-module, shared) | A single pipe-delimited text column on the Account entity recording which plan name(s) — from any of the three pricebook tiers — are assigned to that account. Not owned by this module — owned by Accounts, written to by this module (and its two sibling tiers). |

(`docs_from_blueprint/module/Pricebooklevel300/02-entities-and-fields.md` §2)

**Relationship summary**: A Sales & Promotions Book plan has zero or more Level300 Rules, matched to it **by
name** (`pricebookname`), not by the plan's own primary key (see R1 above). Each rule optionally references a
Level300 Rule Type, and zero or more Coupons may be attached to a specific rule. An Account is assigned zero or
more plans (from any of the three pricebook tiers, undifferentiated) via the shared pipe-delimited assignment
column; the exact mechanism by which that multi-plan, multi-tier list resolves down to the single plan actually
used to price a given sale line was **not traced end-to-end** by the source blueprint — carried forward as an
open question. Despite the near-identical naming, `Level300rules` is a **separate module** from
Pricebooklevel300 — this module's own client-side JS delegates the Level300 Rule's delete lifecycle and the
plan's own default-start/end-date reset/update actions to `Level300rules`'s own ajax handler; this module's own
files contain **no dedicated rule-delete endpoint at all** (§2).

## Field Catalog

**Scope and method.** Every field below is transcribed from `blueprint/module/Pricebooklevel300/
01-entities-fields.md` §2 (the blueprint's own field-by-field pass against the live schema, DB-verified) —
nothing here is invented, and nothing that source individually catalogued is dropped. Legacy Trace preserves
the physical table/column name for every field, consistent with this document set's citation discipline.

### Sales & Promotions Book (plan header)

Backed by `vtiger_pricebooklevel300` (20 physical columns; 8 have CRM field labels, 12 do not).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Price Book ID | Primary key | identifier | Yes | auto_increment | system-set | `vtiger_pricebooklevel300.pricebooklevelid` |
| Price Book Name | The plan's display name AND the join key every rule row is matched against (a name-based FK — see R1) | text | Yes (mandatory) | NULL | user-entered | `vtiger_pricebooklevel300.pricebookname` |
| Price Book Description | Free-text description | text | No | NULL | user-entered | `vtiger_pricebooklevel300.pricebooklevel_desc` |
| Price Plan Type | Discriminates which of three pricing-computation branches this plan's rules are evaluated against: `default`, `mixmatch`, or `Combined Quantity Discount` — only `default`/`mixmatch` observed as live data | enum(text) | No | NULL, treated as `default` when blank | user-entered | `vtiger_pricebooklevel300.price_plan_type` |
| Combined Quantity | The aggregate order-quantity threshold a `Combined Quantity Discount`-typed plan requires before its rule(s) apply | integer/count | No | NULL | user-entered | `vtiger_pricebooklevel300` (Combined Quantity column) |
| Discount Percentage | A plan-level discount percentage — usage/precedence relative to a rule's own `discount` field was not traced | money(%) | No | NULL | user-entered | `vtiger_pricebooklevel300` (Discount Percentage column) |
| Discount / Pricefield Mode | Whether the plan operates on a `discount` basis or a `pricefield` basis — this switch materially changes whether a `Combined Quantity Discount`-typed plan's pricing branch produces any price at all | enum(`discount`/`pricefield`) | Yes (the only mandatory field beyond the name) | `discount` | user-entered | `vtiger_pricebooklevel300` (Discount/Pricefield Mode column) |
| Price Field | Which specific price field a `pricefield`-mode plan targets | enum(text) | No | NULL | user-entered | `vtiger_pricebooklevel300` (Price Field column) |
| Price Level (default) | The plan-wide default pricing-level code applied when a rule doesn't override it | enum(text) | Yes (NOT NULL, no default) | none | user-entered | `vtiger_pricebooklevel300.pricelevel` |
| Times (default) | A plan-wide default multiplier | money(ratio) | Yes (NOT NULL) | none | user-entered | `vtiger_pricebooklevel300.times` |
| Penny Round (default) | A plan-wide default penny-rounding rule string | text (picklist-shaped) | No | NULL | user-entered | `vtiger_pricebooklevel300.penny_round` |
| GP% (default) | A plan-wide default gross-profit-percent | money(%) | Yes (NOT NULL) | none | user-entered | `vtiger_pricebooklevel300` (GP% default column) |
| Based On | Whether the plan's default basis is `discount` or `markup` | enum(`discount`/`markup`) | Yes (NOT NULL) | `discount` | user-entered | `vtiger_pricebooklevel300` (Based On column) |
| Default Start Date | A plan-wide default rule effective-start date — captured and displayed, but no gating consumer was found anywhere in the source blueprint's traced code (contrast the rule-level dates, and coupon expiry, which ARE gated) | date | No | NULL | user-entered | `vtiger_pricebooklevel300.def_start_date` |
| Default End Date | A plan-wide default rule effective-end date — same "captured, not gated" status as Default Start Date | date | No | NULL | user-entered | `vtiger_pricebooklevel300.def_end_date` |
| Sell Lowest Sellprice Item at 0.00 Sellprice | A checkbox-shaped business rule flag — its full semantics beyond its own label were not traced | boolean(enum) | No | `0` | user-entered | `vtiger_pricebooklevel300` (Sell Lowest Sellprice Item column) |
| Is Deleted | Soft-delete flag — writable, but **with no usage guard of any kind** before the delete (R3) | boolean(int) | Yes | `0` | system-set | `vtiger_pricebooklevel300.deleted` |
| Created Time | Row-creation timestamp | datetime | No | NULL | system-set | `vtiger_pricebooklevel300` (Created Time column) |
| Modified Time | Last-modified timestamp | datetime | No | NULL | system-set | `vtiger_pricebooklevel300` (Modified Time column) |
| Created By / Owner | FK to the creating/owning user (both set to the same session user at create time) | reference (×2) | No | `0` | system-set | `vtiger_pricebooklevel300` (Created By / Owner columns) |

(`docs_from_blueprint/module/Pricebooklevel300/02-entities-and-fields.md` §3.1)

### Level300 Rule

Backed by `vtiger_level300rules` (30 physical columns, not CRM-registered — a pure junction/detail table).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Rule ID | Primary key | identifier | Yes | auto_increment | system-set | `vtiger_level300rules.ruleid` |
| Price Book Name | The **name-based** FK to the owning plan header (see R1) | text (FK-by-value) | Yes (NOT NULL) | none | system-set (copied from the plan's own name at rule-creation time) | `vtiger_level300rules.pricebookname` |
| Account Number | An optional account-number scoping value, used as a precedence tie-breaker, not itself a hard match filter | text | Yes (NOT NULL) | none | user-entered | `vtiger_level300rules` (Account Number column) |
| Start Date / End Date | The rule's effective-date window — **confirmed actively evaluated** by the live pricing match (`BETWEEN startdate AND enddate`, or both NULL) | date (×2) | No | NULL | user-entered | `vtiger_level300rules.startdate` / `vtiger_level300rules.enddate` |
| Linecode / Subline / Product Division / Product ID / Price Code / Sales Rank | The rule's product/sale-context scope — each column, if non-empty, narrows which sale lines this rule can match; if empty, that dimension is a wildcard | reference/enum (×6) | Yes (NOT NULL on each, `''`/`0` used as the wildcard sentinel) | `0`/`''` | user-entered | `vtiger_level300rules` (linecode/subline/productdivision/productid/pricecode/salesrank columns) |
| Quantity / Operator | An order-quantity threshold and a comparison operator (`=`/`<=`/`>=` observed) gating whether this rule applies at a given order quantity | integer + enum(text) | Yes (NOT NULL) | `NULL`/`'='` | user-entered | `vtiger_level300rules` (Quantity / Operator columns) |
| Price Level | Which pricing-level code this rule's adjustment is expressed against | enum(text) | Yes (NOT NULL) | none | user-entered | `vtiger_level300rules` (Price Level column) |
| Times / Add-Subtract / Net Price / Discount / GP% / MU% | Six independent, apparently-mutually-exclusive-in-practice pricing-adjustment expressions, including a confirmed cross-branch formula gap in `discount`'s own handling | money/ratio (×6) | Yes (NOT NULL on each) | `0`/`0.00` | user-entered | `vtiger_level300rules` (times/addsubtract/netprice/discount/gp/mu columns) |
| Type ID | FK to Level300 Rule Type | reference | Yes (NOT NULL) | none | user-entered | `vtiger_level300rules.typeid` |
| Comments | Free-text notes on the rule | text | Yes (NOT NULL, but can be empty-string) | none | user-entered | `vtiger_level300rules` (Comments column) |
| Penny Round | A per-rule penny-rounding override | text (picklist-shaped) | No | NULL | user-entered | `vtiger_level300rules` (Penny Round column) |
| Last 12 Months Ship Count / Sales Price / Product Cost | Rolling trailing-12-month aggregates consumed by the plan's own weighted-average GP% recompute whenever a rule's pricing fields change | integer / money (×3) | Yes (NOT NULL) | `0`/`0.00` | system-computed — **the process that populates these columns was not found anywhere under this module's own files; likely a scheduled/batch process elsewhere in the wider system, out of the source blueprint's own scope** | `vtiger_level300rules` (Last 12 Months Ship Count / Sales Price / Product Cost columns) |
| Is Deleted | Soft-delete flag — **not writable from anywhere under this module's own files at all**; the delete lifecycle for this entity is owned by the sibling `Level300rules` module | boolean(int) | Yes | `0` | system-set | `vtiger_level300rules.deleted` |
| Created Time / Modified Time / Created By / Owner | Standard system audit columns, same shape as the plan header | datetime/reference | mixed | mixed | system-set | `vtiger_level300rules` (standard audit columns) |

(`02-entities-and-fields.md` §3.2)

### Level300 Rule Type

Backed by `vtiger_level300rules_types` — a thin reference table, one live row on the blueprint's own dev
snapshot (`id=1, name="Bulk discount", priority=1`).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Type ID | Primary key | identifier | Yes | auto_increment | system-set | `vtiger_level300rules_types.id` |
| Name | Display name of the rule type | text | Yes | none | user/system-entered | `vtiger_level300rules_types.name` |
| Priority | Display/sort-order value, re-sequenced by a dedicated reorder action | integer | Yes | none | user-reordered | `vtiger_level300rules_types.priority` |

(`02-entities-and-fields.md` §3.3)

### Coupon (this module's `generatefrom='rule300'` slice of a shared table)

Backed by a shared coupon table (`fuse5_coupons`), of which this module's own slice — every row with
`generatefrom='rule300'` — is 16 of the table's 17 total rows on the blueprint's own dev snapshot (14 columns
individually catalogued). **This entity is not exclusively owned by this module** — the underlying table, its
`sligroupid` reference, and a further `generatedfrom` variant used by a different feature belong to a different
bounded context entirely.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Coupon ID | Primary key | identifier | Yes | auto_increment | system-set | `fuse5_coupons.id` |
| Coupon Code | The user-facing coupon code string | text | No (nullable) | NULL | user-entered | `fuse5_coupons.couponcode` |
| Based On | A discount-basis discriminator for the coupon — every sampled live row shows NULL for this column on the blueprint's own dev snapshot; usage pattern not resolvable from that evidence alone | enum(text) | No | NULL | user-entered | `fuse5_coupons.based_on` |
| Coupon Amount | The discount amount the coupon grants — every sampled live row also shows NULL; whether this is genuinely unused in practice or simply unpopulated on this particular snapshot was not resolvable | money | No | NULL | user-entered | `fuse5_coupons.coupon_amount` |
| Generate From | Discriminates which module/feature owns this coupon row — `'rule300'` is this module's own value | enum(text) | No | NULL | system-set | `fuse5_coupons.generatefrom` |
| User ID | FK to the creating user | reference | No | NULL | system-set | `fuse5_coupons.userid` |
| Rule ID | FK to the owning Level300 Rule row | reference | No | NULL | system-set | `fuse5_coupons.ruleid` |
| Mix-Match Rule | Flags whether this coupon was created via the mix-match ("Add Mix-Match Coupon") flow vs. the standard flow | enum(`Y`/`N`) | Yes | `N` | system-set | `fuse5_coupons` (Mix-Match Rule column) |
| SLI Group ID | FK to a "line-item group" concept referenced only by a *different* `generatefrom` value's own code path — this module's own `'rule300'` path never populates this column | reference | No | NULL | conditional (out of this module's own scope) | `fuse5_coupons.sligroupid` |
| Comments | Free-text notes | text | No | NULL | user-entered | `fuse5_coupons.comments` |
| Expire Date | The coupon's expiry date; a sentinel value is used throughout this module's own queries to mean "never expires" — **confirmed a genuinely evaluated gate** by every read path the source blueprint traced | date | Yes (NOT NULL, sentinel-defaulted) | sentinel value ("never expires") | user-entered | `fuse5_coupons.expire_date` |
| Created Time / Modified Time | Standard audit columns | datetime | mixed | mixed | system-set | `fuse5_coupons` (standard audit columns) |
| Is Deleted | Soft-delete flag — writable, with **no ownership/ordering guard of any kind** on delete beyond matching the coupon's own id and rule id | enum(`0`/`1`) | No | `'0'` | system-set | `fuse5_coupons.deleted` |

(`02-entities-and-fields.md` §3.4)

### Account-Plan Assignment (cross-module column, not owned by this entity catalog)

A single column on the Account entity, not itself part of this module's own tables — documented here only
because this module writes to it and its structure directly shapes this module's own account-apply behavior.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Assigned Plan Names | A single text value holding a delimiter-separated list of plan names assigned to this account — **confirmed shared, undifferentiated, across all three pricebook tiers**, i.e. the same value can carry plan names belonging to level 200, level 300, and level 800 simultaneously with no way to tell which tier a given name belongs to from the column's own content alone | delimited-list | No | none | system-set (via the account-apply flow of any of the three pricebook tier modules) | `vtiger_accountscf.cf_986` |

(`02-entities-and-fields.md` §3.5)

## Known Gaps

- **The rule-to-plan foreign key is name-based, not id-based** (R1) — the live pricing-match query joins
  exclusively on the plan's name column, never on its own primary key. Renaming a plan's name without a
  corresponding cascade-update to every one of its own rule rows silently orphans those rules from
  pricing-match eligibility; no cascade-rename code path was found anywhere in the source blueprint's own
  search.
- **The account-plan assignment column is a single pipe-delimited text field, not a normalized join table, and
  is confirmed shared/undifferentiated across all three pricebook tiers** (R2) — every add/remove operation
  must explode, dedupe, and re-implode this string; the underlying many-to-many relationship it represents has
  no schema-level tier distinction at all.
- **Two dead schema declarations exist on the plan header's own entity class**: one declared table-index key
  does not match the live table's actual name, and one declared "group relation" table does not exist in the
  live database at all — likely a copy-paste artifact from the `Pricebooklevel200` sibling module's own entity
  class, whose equivalent group-relation table genuinely does exist. Neither is confirmed to have an observable
  runtime effect — flagged as an open question, not resolved.
- **The custom-field extension table for the plan header is declared but carries no real custom-field columns
  at all** — functionally, this module has no Studio-managed custom-field surface today.
- **What populates the rule's own trailing-12-month aggregate columns** (`Last 12 Months Ship Count`/`Sales
  Price`/`Product Cost`) was not confirmed — read by the plan's own weighted-average GP% recompute, but not
  written by any file under this module's own directory; likely a scheduled/batch process elsewhere in the
  wider system, out of the source blueprint's own scope to locate.
- **The full valid-value set for the plan's own type discriminator** (`default`/`mixmatch`/`Combined Quantity
  Discount`) is confirmed only by the pricing engine's own code-level comparison logic — the blueprint's own
  live dev-snapshot data shows only `default`/`mixmatch` values in practice; whether `Combined Quantity
  Discount` is ever actually used on live production data was not confirmed.
- **The `Coupon Amount`/`Based On` fields' actual live usage pattern is unconfirmed** — every sampled live
  coupon row shows NULL for both, despite the coupon-entry UI presumably collecting them; whether this is
  simply old/never-populated data, or these fields are effectively unused in practice, was not resolvable from
  the source blueprint's own evidence.

(`02-entities-and-fields.md` §4)

## Normalized-Schema Addendum (§5 — proposal, not a blueprint finding)

The source document's own §5 is a proposed replacement schema for a future rewrite, reasoned from the specific
structural problems documented above — **this session's own design proposal, not a blueprint finding**, and
preserved here intact rather than summarized away, per the instruction not to lose the "Level300rules folded
in" decision or the coupon dead-end finding.

**Level300rules folded in.** The proposal folds the rule-delete lifecycle currently owned by the separate
`Level300rules` module into this module's own bounded context going forward: the proposed `price_rule` table
carries a real, required `plan_id` foreign key, and a new implementation's own plan-delete command performs a
real precondition check (no live rule or account assignment may reference the plan) rather than leaving that
lifecycle split across two modules with no clear ownership boundary, as legacy does today (`02-entities-and-fields.md`
§5, problems 1 and 4; `10-build-guidance.md` §10.2 phase 4 — "consolidated, not duplicated the way the legacy
system's own two rule-list rendering surfaces were").

**The coupon dead-end.** The coupon subsystem has no traced consumer of its own discount value anywhere in the
live pricing path — a live, non-expired coupon on a matched rule causes that rule's own price computation to
be skipped entirely, with nothing substituted, and no code path anywhere in this module's own files was found
reading the coupon's `Coupon Amount`/`Based On` columns for price computation. Today's schema has no column,
table, or record anywhere that could even express "this coupon's discount was applied to this priced line," so
the question "does a coupon ever affect a customer's price" cannot be answered by inspecting data, only by
re-reading code. The proposal frames this as **two outcomes an actual business decision must choose between —
this session cannot pick one on its own**:
- **If coupons are meant to affect price**: add an explicit `price_rule_coupon_application(id, rule_id,
  coupon_id, sale_line_reference, discount_amount_applied, applied_at)` record, written whenever a
  coupon-gated rule is encountered, plus a required, non-nullable `rule_id` FK and required
  `discount_basis`/`discount_amount` pair on the coupon's own replacement table (`price_rule_coupon`) — a
  coupon that can't state its own discount basis and amount can no longer exist in the new schema.
- **If coupons are instead being deliberately descoped from this tier**, that must be stated explicitly by
  whoever owns that decision, and `price_rule_coupon`/`price_rule_coupon_application` dropped from the schema
  entirely — this design does not carry the current broken skip-with-no-substitute behavior forward silently
  under either outcome.

**Other problems the proposal fixes** (full list, `02-entities-and-fields.md` §5): the plan-delete's guardless
delete (R3); raw/unparameterized query construction including the dynamically-derived bulk-update field name
(R4, closed at the schema layer via a `rule_field` allow-list lookup table); sparse sentinel-valued (`0`/`''`)
"wildcard" scope columns on the rule, replaced with genuinely nullable reference columns; the rule's own
formula fields having no declared mutual-exclusivity and a confirmed inconsistency between the mix-match and
default pricing branches, closed by a new required `formula_mode` enum; the "Combined Quantity Discount" plan
type's own column default silently producing no price, closed by making `discount_pricefield_mode` NOT NULL
with no default; the rule's trailing-12-month aggregate columns being read but written by an unidentified
external process, moved into a separate `rule_rolling_metrics` table with an explicit `source_system` column;
the two dead schema declarations and the empty custom-field extension table, dropped entirely; and the absence
of any tenant/company column, closed by an explicit `tenant_id` on every proposed table (R5).

**Proposed tables** (placeholders, not a naming-convention commitment): `price_plan`, `price_rule`,
`rule_rolling_metrics` (new), `rule_type`, `rule_field` (new), `account_price_plan` (new, **pending
cross-sibling ratification** — the same R2 caveat above), `price_rule_coupon`, `price_rule_coupon_application`
(new). Every FK should be a real, enforced database constraint, with `RESTRICT` on delete for `price_plan`
while any non-deleted `price_rule` references it, and `RESTRICT` on delete for `price_rule` while any
`price_rule_coupon` references it.

(`02-entities-and-fields.md` §5, in full)
