# MPLPricePlan — Entities & Fields

> Every entity, every field, individually. No grouping/summarizing — that's how fields get lost.
> Legacy table/column names are a first-class column in the field catalog below, not an optional
> footnote — this project's whole documentation discipline rests on every claim being traceable to
> a specific source. See `_deviations-from-original-template.md` in this folder.

Source: `docs_from_blueprint/module/MPLPricePlan/02-entities-and-fields.md`; Legacy Trace values
transcribed from `blueprint/module/MPLPricePlan/01-entities-fields.md` §2.

## Governing observations carried forward as requirements

- **R1 — No custom/dynamic-field extension mechanism exists on this module, and none should be
  introduced.** Unlike every other module blueprinted in this series so far, MPLPricePlan has no `*cf`
  Studio-managed extension table — `lbm_mpl_price_plan` carries all 9 of its physical columns directly.
  **Requirement**: the new data model should preserve this — one explicit, typed field for every
  business field identified below, no generic key-value extension mechanism.
- **R2 — The plan's per-location formula grid, not the plan header's own legacy JSON column, is the
  single source of truth for the live-consumed pricing data.** The header table's own `leveljsondata`
  column is superseded by the per-location grid table's own `leveljsondata` and is read only by a
  one-time migration/backfill utility outside this module, never by the live pricing path (Schema Drift
  #1 below). **Requirement**: a new implementation's schema should not treat the header-level JSON column
  as live data.
- **R3 — The plan-assignment relationship (which plan a product uses, at which location) is a
  cross-module boundary today, not a table this module owns.** The assignment column physically lives on
  the Location module's own custom-field table (`vtiger_locationcf.cf_mplpriceplanid`), not on any
  MPLPricePlan-owned table. **Requirement**: a new implementation should make this relationship an
  explicit, first-class table within a clearly-owned bounded context, rather than leaving it an opaque
  column on a different module's extension table.
- **R4 — Every business entity is scoped to a tenant.** This is a multi-tenant platform, established at
  the platform level outside this module's own blueprinted scope, but carried forward here as an
  explicit requirement rather than silently assumed. **Requirement**: every entity below carries a
  tenant reference.

## Entity List

| Entity | Purpose |
|---|---|
| MPL Price Plan (header) | A named pricing plan a merchandiser creates once (e.g. "FIRST PLAN"), carrying a display name, description, default penny-rounding rule, and UOM-type basis. 7 live rows, one of which is a reserved sentinel (see §3.1 note). |
| MPL Price Plan Level/Location Data | One row per (plan, location) pair: the actual, live-consumed formula grid — a per-pricing-level Take/Formula/Value triple. This is the entity the live pricing engine actually reads. 34 live rows. |
| Pricing Level Names | The fixed catalog of pricing "levels" (e.g. "Retail Price," "Level-1"–"Level-5") a plan's formula grid is keyed against — shared, cross-module reference data, not owned exclusively by this module. 8 live rows. |
| MPL Price Plan Rule (+ 4 scope tables) | A date-ranged, optionally linecode/subline/division/product-scoped "rule" attached to a plan, maintained through its own "Rule Section" UI. Real, UI-maintained schema — confirmed zero live consumers in the pricing-computation path. 1 live rule row; all 4 scope-junction tables 0 live rows. |

**Relationship summary**: A plan header has zero or more Level/Location grid rows (one per location it has
been configured for) and zero or more Rule rows. A Level/Location grid row references exactly one plan and
one location. A Rule row references exactly one plan and may reference zero or more line codes, sublines,
divisions, and products via its four scope-junction tables. Pricing Level Names is shared reference data a
grid row's own pricing-level entries key against, not itself owned by this module. A product/location
combination (owned by the Location module's own extension table, not this module — see R3) references at
most one plan.

## Field Catalog

**Logical Type legend**: `money`, `date`, `datetime`, `enum`, `text`, `integer`/count, `boolean`(-ish
enum), `reference (to X)` (a link to another entity), `identifier` (a row's own primary-key-shaped id),
`json`/serialized (multi-value payload).

### MPL Price Plan (header)

Backed by `lbm_mpl_price_plan` (9 physical columns; 3 carry CRM field labels, 6 do not).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| MPL Price Plan ID | Primary key | identifier | Yes | auto_increment | system-set | `.mplpriceplanid` |
| MPL Name | The plan's display name (e.g. "FIRST PLAN") | text | Yes (mandatory field) | NULL | user-entered | `vtiger_field` 4290 "MPL Name"; `.mplname`; this module's `list_link_field` |
| MPL Description | Free-text description of the plan's purpose | text | No | NULL | user-entered | `vtiger_field` 4291 "MPL Description"; `.mpldescription` |
| Default Penny Round Up | A penny-rounding rule string for prices this plan produces (e.g. `"05/10/15/20/25/30"` rounds to the nearest of those cent values; `"NO"` disables rounding) | text (picklist-shaped) | No | NULL | user-entered | `vtiger_field` 4293 "Default Penny Round Up"; `.penny_round` — full valid-option set unconfirmed, see Known Gaps |
| UOM Type | Which of the product's 12 UOM-basis fields (base/selling/pricing/stocking/PI/picking/purchase/purchase-cost/receiving/reporting/inner/outer) this plan's formula values are expressed in | enum(text) | No | NULL | user-entered | no `vtiger_field` label; `.uom_type`; option list hardcoded in `RuleSection.php::get_uomtype_list_single_select()` |
| Created Date | Row-creation timestamp | datetime | No | NULL | system-set | `.created_date` — no `vtiger_field` label |
| Created By | The user who created the plan | reference (to User) | No | NULL | system-set | `.created_by` (FK to `vtiger_users.id`) — no `vtiger_field` label |
| Is Deleted | Soft-delete flag, set only by the usage-guarded delete operation | boolean(int) | Yes | `0` | system-set | `.deleted` — no `vtiger_field` label |
| Legacy Level JSON Data | **Superseded** plan-wide (not per-location) formula-grid data — same shape as the Level/Location entity's grid data below, but read only by a one-time migration utility, never by the live pricing path (see R2) | json/serialized | No | NULL | system-set (legacy) | `.leveljsondata` — no `vtiger_field` label; see Schema Drift #1 |

**Note — reserved sentinel row**: one of the 7 live rows (name "Custom") is a **reserved sentinel**, not a
real user-authored plan — its own description reads "Custom MPL to customize product wise, do not hard
delete from database," meaning "no named plan assigned, price this product/location individually." The
live pricing engine explicitly excludes this row from plan resolution. A new implementation should model
"no plan assigned" as an explicit null relationship, not a reserved row identity that must be excluded by
convention at every read site.

### MPL Price Plan Level/Location Data

No CRM field-label registration exists for this table — a pure junction/detail table, but genuinely live
and load-bearing.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Level/Location ID | Primary key | identifier | Yes | auto_increment | system-set | `.level_location_id` |
| Location | The branch/location this formula grid applies to | reference (to Location) | No | NULL | system-set | `.locationid` (FK to `vtiger_location`) |
| MPL Plan | The MPL Price Plan header this row belongs to | reference (to MPL Price Plan) | No | NULL | system-set | `.mpl_plan_id` (FK to `lbm_mpl_price_plan.mplpriceplanid`) |
| Level JSON Data | The actual, live-consumed formula grid: per pricing level, a `take`/`formula`/`value` triple (`take` selects the cost basis; `formula` selects the operation; `value` is the operand) | json/serialized | No | NULL | user-entered (via the plan's Edit-screen UI) | `.leveljsondata` |

### Pricing Level Names

Shared reference data, not itself exclusively owned by this module; no CRM field-label registration.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Pricing Level ID | Primary key | identifier | Yes | auto_increment | system-set | `.pricing_level_id` |
| Pricing Level Name | Display name of the level (e.g. "Retail Price," "Level-1") | text | Yes | NULL | user-entered (user-defined levels) or system-set (the two fixed system levels: "None," "Retail Price") | `.pricing_level_name` |
| Presence | Ordinal/display-order value — on every one of the 8 live rows, observed identical to Pricing Level ID; whether it is ever independently ordered was not testable beyond this one dataset | integer | Yes | NULL | system-set | `.presence` — see Known Gaps |
| Base | Whether this level is a fixed system level or a user-defined one | enum (`system`/`user`) | No | `user` | system-set | `.base` |

**Note**: the level named "None" is excluded from a plan's own formula-grid editing UI (a plan's grid is
never configured against it), and a plan's own resolved pricing level is never "None" at the point a sale
line's price is being computed.

### MPL Price Plan Rule (+ 4 scope junction tables)

**Real schema, zero confirmed live pricing-engine consumer.**

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Rule ID | Primary key | identifier | Yes | auto_increment | system-set | `.mplruleid` |
| MPL Plan | The MPL Price Plan header this rule belongs to | reference (to MPL Price Plan) | No | NULL | system-set | `.mplpriceplanid` |
| Start Date | The date this rule's scope becomes active (a `0000-00-00` legacy sentinel means unset) | date | No | unset | user-entered | `.start_date` |
| End Date | The date this rule's scope stops being active | date | No | unset | user-entered | `.end_date` |
| Created On | Row-creation timestamp | datetime | No | NULL | system-set | `.created_on` |
| Created By | The user who created the rule row | reference (to User) | No | NULL | system-set | `.created_by` (FK to `vtiger_users.id`) |
| Is Deleted | Soft-delete flag | boolean(int) | No | `0` | system-set | `.deleted` |

Four scope junction tables, structurally identical shape (own primary key, a reference back to the Rule
row, a reference to the scope dimension, created-by/created-on) — **none of the four carries its own
soft-delete flag**, meaning a hard delete-then-re-insert is the only way scope rows are ever removed in
the legacy system:

| Scope table | Scope dimension | Legacy Trace |
|---|---|---|
| Rule Linecode Scope | Product line code | `lbm_mpl_price_plan_rule_linecode.linecodeid` (FK to `lbm_product_linecode`) |
| Rule Subline Scope | Product subline | `lbm_mpl_price_plan_rule_subline.sublineid` (FK to `lbm_product_subline`) |
| Rule Division Scope | Product division | `lbm_mpl_price_plan_rule_division.divisionid` (FK to `lbm_product_division`) |
| Rule Product Scope | Individual product | `lbm_mpl_price_plan_rule_product.productid` (FK to `vtiger_products`) |

All four confirmed **0 live rows** in the source blueprint's dev snapshot, consistent with only 1 live
Rule row existing across all 7 plans.

## Known Gaps

- **`penny_round`'s full valid-option set and any intended validation rule** is not confirmed — inferred
  from live row samples (`"05/10/15/20/25/30"`, `"49/99"`, `"NO"`) rather than a confirmed picklist
  definition; the field's own UI type suggests an option table should exist, but none was located.
- **Whether Pricing Level Names' `Presence` column is ever independently ordered from its own primary
  key** — all 8 live rows show identical values; not testable further without a differently-ordered
  dataset.
- **Whether the legacy plan-header `Legacy Level JSON Data` column (§ MPL Price Plan header) is safe to
  exclude entirely from a new schema, or whether some as-yet-unfound code path still reads it** — the
  source blueprint's grep was comprehensive against the files it directly searched, but module-adjacent
  code outside that set was not exhaustively swept line by line.
- **Whether this module (the named-plan mechanism) is the intended long-term replacement for the legacy
  per-product flat-pricing mechanism it falls back to, or a narrower, permanently-coexisting feature** —
  the 99.90% sentinel-assignment rate makes this a real product-scoping question, not resolvable from
  code alone.
- **The Rule sub-entity's intended consumer** — whether a pricing-engine read path was planned but never
  built, was built and later removed, or the feature is mid-development — not resolvable from static
  code alone; flagged for subject-matter-expert confirmation.

## Schema Drift Findings (legacy-system observations, carried forward)

1. `lbm_mpl_price_plan.leveljsondata` (the header table's own JSON column) is superseded by
   `lbm_mpl_price_plan_level_location_wise.leveljsondata` (per-location) and is no longer read by the live
   pricing path — its only reader is `copyExistingMPLPriceLeveltoAllLocation.php`, a one-time migration
   script outside this module. 4 of the 7 live header rows still carry a non-NULL value — a historical
   artifact, not actively maintained.
2. The Rule sub-entity (+ 4 scope tables) has real, UI-maintained schema and zero confirmed live
   consumers — the pricing-computation function never joins against it.
3. `DeleteRule.php` targets `vtiger_level800rules`, a table owned by the unrelated Pricebooklevel800
   module, not any table this module owns (see `permissions.md` for the authorization-gap implications).
4. `MPLPricePlan::$sortby_fields = Array('abc','xyz')` — placeholder column names that do not exist on
   `lbm_mpl_price_plan`; a likely-broken sort-by-column feature.
5. The product→plan assignment column (`cf_mplpriceplanid`) lives on `vtiger_locationcf`, not on
   `vtiger_productcf` or any MPLPricePlan-owned table — a cross-module ownership boundary (see R3 above).

---

## Recommended rewrite schema — this session's own design proposal, not a blueprint finding

Everything above documents what exists today. This section is different in kind: a proposed replacement
schema, reasoned from specific structural problems already documented elsewhere in this module's own
spec. Table/column names below are tech-agnostic placeholders, not a commitment to any specific naming
convention. This section is preserved verbatim in substance from
`docs_from_blueprint/module/MPLPricePlan/02-entities-and-fields.md` §5.

**Problems this design fixes, one by one:**

1. **A rule-delete operation can reach into a completely unrelated module's live table** —
   `DeleteRule.php` deletes from `vtiger_level800rules` (the Pricebooklevel800 module's own table), via
   an unescaped, unbound `$_REQUEST['ruleid']`, with no relationship between that table and MPLPricePlan
   at all. This is a schema-boundary violation, not merely an injection: even a fix that only
   parameterized the query would leave one module's delete path physically capable of touching another
   module's data. **Fix**: give every module — including this one — its own private table set with no
   cross-module table name ever appearing in another module's data-access code; a rule-delete operation
   should be structurally incapable of naming a table it doesn't own (see the closing note on enforcement
   below).
2. **The Rule sub-entity (+ its 4 scope-junction tables) is a real, UI-maintained, currently-writable
   schema with zero confirmed consumers anywhere in the live pricing-computation path.** Carrying five
   dead-but-maintained tables forward into a new schema preserves the exact ambiguity that let this drift
   happen unnoticed — a merchandiser can author data today that silently has no effect on any price.
   **Fix**: do not carry the Rule tables forward as-is. Either the pricing-engine read path is built as a
   first-class part of the rewrite (in which case Rule becomes a real, consumed entity and is redesigned
   on its own merits, not grandfathered from the legacy shape), or it is retired outright and its data is
   not migrated. Recommend treating this as a product decision to make explicitly before the rewrite
   ships, not one to default into by simply copying the legacy tables.
3. **The 8 rule-scope raw-concatenated SQL statements and the ajax layer's 6 further injection points are
   reachable on the module's own everyday save/copy-to-locations actions** — a symptom of no field ever
   having a typed, parameter-bound contract at the point it reaches the database. **Fix**: every write
   path in the new schema is reached only through parameterized statements/an ORM layer, with no table in
   this schema ever assembled via string concatenation of caller-supplied values — a query-construction
   discipline, not a schema-shape change per se, but one the schema should make the path of least
   resistance for (e.g. no free-text "build your own WHERE clause" columns).
4. **The plan header's `Legacy Level JSON Data` column is a superseded, unversioned JSON blob** whose only
   reader is a one-time migration utility outside this module, never the live pricing path (R2 above).
   Carrying it forward duplicates the real source of truth and reintroduces the same "which JSON is
   authoritative" ambiguity. **Fix**: do not carry a header-level JSON pricing column forward at all — the
   per-location formula grid (problem-fixed table 3 below) is the only live-consumed pricing data and the
   new schema should say so structurally, not just in documentation.
5. **The reserved "Custom" sentinel plan row encodes "no plan assigned" as a magic row identity** that
   every read site must know to exclude. **Fix**: model "no plan assigned" as an explicit nullable
   relationship on the assignment table, not a row that must be filtered out by convention.
6. **The plan-assignment relationship (which plan a product uses, at which location) physically lives on
   a different module's extension table** (`vtiger_locationcf.cf_mplpriceplanid` — R3 above), making
   MPLPricePlan's own core relationship invisible from its own schema. **Fix**: make the assignment an
   explicit, first-class table owned by this module (problem-fixed table 4 below).
7. **The `GP%` formula's `value = 100` divides by zero, unguarded at every layer** — no save-time
   numeric-range validation exists today (see `business-rules-and-validation.md` and `calculations.md`).
   **Fix**: add a database-level `CHECK` constraint rejecting a stored `GP%` value of exactly `100` for
   any grid entry whose formula type is `GP%`, so the invalid state is rejected at write time rather than
   only detectable by reading application code — see the schema note below for how far a `CHECK`
   constraint alone can and can't reach.

**Proposed tables:**

- **`price_plan`** — `id` (PK), `tenant_id`, `name` (unique per tenant, required), `description`,
  `penny_round_rule` (text; recommend backing it with a small lookup/enum table once the full valid-option
  set is confirmed rather than a free-text column), `uom_basis` (enum, one of the 12 UOM-basis roles),
  audit columns (`created_at`/`created_by`/`updated_at`/`updated_by`), `is_deleted`/`deleted_at`. No
  `legacy_level_json_data` column — closes problem 4. No reserved sentinel row — closes problem 5.
- **`price_plan_location_grid`** (replaces the Level/Location Data table) — `id` (PK), `tenant_id`,
  `plan_id` (FK → `price_plan`, required), `location_id` (FK → Location, required), unique on (`plan_id`,
  `location_id`). This table remains the single source of truth for live pricing data — closes problem 4
  by construction, since there is no competing header-level column to drift from it.
- **`price_plan_grid_entry`** (new — normalizes the grid's own JSON payload out of a blob column, one row
  per pricing level within a grid) — `id` (PK), `grid_id` (FK → `price_plan_location_grid`, required),
  `pricing_level_id` (FK → `pricing_level`, required), `take_basis` (enum, required), `formula_type`
  (enum, required), `value` (decimal, required), unique on (`grid_id`, `pricing_level_id`), `CHECK
  (formula_type <> 'GP%' OR value <> 100)` — closes problem 7 at the schema layer. (Flattening the JSON
  into rows is optional relative to the problems above — a schema that keeps a JSON payload column is
  still an acceptable alternative — but is included here because it also makes the `CHECK` constraint
  expressible at all; a `CHECK` cannot reach inside an opaque JSON blob.)
- **`pricing_level`** (replaces Pricing Level Names) — `id` (PK), `tenant_id`, `name` (unique per
  tenant), `sort_order` (integer, required — resolving the "Presence" gap by making the column's intended
  semantics explicit rather than leaving it observationally identical to the primary key by happenstance
  alone), `is_system_defined` (boolean), audit columns.
- **`price_plan_assignment`** (new — closes problem 6) — `id` (PK), `tenant_id`, `product_id` (FK →
  Product, required), `location_id` (FK → Location, required), `plan_id` (FK → `price_plan`, nullable — a
  `NULL` here is the explicit, structural representation of "no plan assigned," closing problem 5 rather
  than relying on a reserved plan row), unique on (`product_id`, `location_id`), audit columns. This table
  is owned by MPLPricePlan, not by Location — it is this module's own core relationship, visible in its
  own schema for the first time.

**On the Rule sub-entity** (closes problem 2): recommend NOT migrating `MPL Price Plan Rule` or its four
scope-junction tables into the new schema in their current, unconsumed shape. If the pricing-engine read
path is built, design `price_plan_rule` and its scope tables fresh, alongside that read path, including
soft-delete on the scope tables (the legacy scope tables have none — a gap this proposal does not repeat
if the tables are rebuilt at all). If the read path is not built, the Rule tables and their one live row
are not carried forward, and any dead-code cleanup should remove `RuleSection.php` and its callers at the
same time the schema is retired, so the schema and the code that writes to it are retired together.

**Referential integrity and the cross-module delete-boundary principle** (closes problem 1): every FK
above should be a real, enforced database constraint, replacing the legacy pattern of joins that work only
by convention. Beyond FKs, the deeper fix for `DeleteRule.php`'s cross-module reach is a design principle
the schema alone cannot fully guarantee: **no module's data-access code should ever hold a raw reference
to another module's table.** A delete (or any write) operation should only ever be able to name tables
within its own module's schema/service boundary — enforced by giving each module its own schema namespace
and denying cross-schema DML grants at the database-user level, with any legitimate cross-module
interaction going through that other module's own service interface instead of a shared raw table. This is
ultimately an application/service-boundary concern more than a table-shape one, but it stems directly from
how tables were shared across modules in the legacy design, so it is recorded here as a schema-adjacent
design principle rather than left unstated.
