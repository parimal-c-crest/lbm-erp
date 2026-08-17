# UOM — Entities & Fields

> Every entity, every field, individually. No grouping/summarizing — that's how fields get lost.
> Legacy table/column names are a first-class column in the field catalog below, not an optional
> footnote. See `_deviations-from-original-template.md` in this folder.

Source: `blueprint/module/Products/01-entities-fields.md` §2.16 (live-DB-verified during the Products
blueprint's own Pass 1), cross-checked against the live INSERT/UPDATE statements in
`include/utils/commonfunctions.php` during this session's own research.

## Entity relationship shape — correcting the intuitive linear-chain assumption

The natural first guess is a strict chain: Category → Group → Type → Type Qty → Picking Hierarchy. That
is not the actual shape. `lbm_uom_category` and `lbm_uom_group` each hold **independent** references —
a `lbm_uom_type` row is not itself scoped to a category at the row level, and is reused across
categories/groups. The real topology:

```
lbm_uom_category                    lbm_uom_type
  (uomcategoryid, name)               (uomtypeid, name — category-agnostic)
        ^                                    ^
        | uomcategoryid (FK)                 | 11 separate role-specific FK slots
        |                                    |
                  lbm_uom_group
        (uomgroupid, groupname, uomcategoryid,
         base/selling/pricing/stocking/pi/picking/
         purchase/purchasecost/receiving/reporting/
         inner/outer_uomtypeid, picking_hierarchy flag)
                    |         |
   (uomgroupid,uomtypeid)   (uomgroupid,uomtypeid)
        |                         |
lbm_uom_type_qty          lbm_uom_picking_hierarchy
  (baseqty, qty —            (sortorderid — pick-unit
   conversion factor)         breakdown order)
```

`lbm_uom_type_qty` and `lbm_uom_picking_hierarchy` are both keyed on the `(uomgroupid, uomtypeid)` pair
directly — they are not chained off each other, they're each a separate child of the group+type
combination.

## Entity List

| Entity | Purpose |
|---|---|
| `lbm_uom_category` | The category grouping a UOM Group belongs to (e.g. Length, Volume, Each). |
| `lbm_uom_type` | An individual, category-agnostic unit type (e.g. Each, Case, Pallet). |
| `lbm_uom_group` | A product-assignable bundle naming which UOM Type governs each of eleven functional roles. |
| `lbm_uom_type_qty` | The conversion factor between a group's base type and one other type used by that group. |
| `lbm_uom_picking_hierarchy` | The ordered sequence of unit types used when breaking a pick quantity into whole units, per group. |
| `lbm_applied_uom_pricing` | Derived/cached per-product JSON of UOM-derived prices — not a source-of-truth entity. |

## Field Catalog

### `lbm_uom_category`

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| UOM Category ID | Primary key | identifier | Yes | auto_increment | Blueprint-sourced | `.uomcategoryid` |
| UOM Category Name | The category grouping (e.g. Length, Volume, Each) | text | Yes | NULL | Blueprint-sourced | `.uomcategoryname` |
| Sort Order | Display/sequencing order (family pattern) | text | No | — | Blueprint-sourced | `.sortorderid` |
| User ID | Editing user (audit, not a tenant) | reference | No | — | Blueprint-sourced | `.userid` |
| Deleted | Soft-delete flag | boolean | No | 0 | Blueprint-sourced | `.deleted` |

(Common soft-delete/audit columns per the family pattern documented in
`blueprint/module/Products/01-entities-fields.md` §2.18.)

### `lbm_uom_type`

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| UOM Type ID | Primary key | identifier | Yes | auto_increment | Blueprint-sourced | `.uomtypeid` |
| UOM Type | An individual unit type (e.g. Each, Case, Pallet) | text | Yes | NULL | Blueprint-sourced | `.uomtype` |

### `lbm_uom_group`

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| UOM Group ID | Primary key | identifier | Yes | auto_increment | Blueprint-sourced | `.uomgroupid` |
| Group Name | The name a product-assignable UOM bundle is known by | text | Yes | NULL | Blueprint-sourced | `.groupname` |
| UOM Category | The category this group belongs to | reference(lbm_uom_category) | No | 0 | Blueprint-sourced | `.uomcategoryid` |
| Base UOM Type | The unit all conversions are ultimately expressed relative to | reference(lbm_uom_type) | No | 0 | Blueprint-sourced | `.base_uomtypeid` |
| Selling UOM Type | The unit used when this product is sold | reference(lbm_uom_type) | No | 0 | Blueprint-sourced | `.selling_uomtypeid` |
| Pricing UOM Type | The unit price is expressed in | reference(lbm_uom_type) | No | 0 | Blueprint-sourced | `.pricing_uomtypeid` |
| Stocking UOM Type | The unit inventory is stocked/counted in | reference(lbm_uom_type) | No | 0 | Blueprint-sourced | `.stocking_uomtypeid` |
| PI UOM Type | The unit used during physical inventory counts | reference(lbm_uom_type) | No | 0 | Blueprint-sourced | `.pi_uomtypeid` |
| Picking UOM Type | The unit used when picking for fulfillment | reference(lbm_uom_type) | No | 0 | Blueprint-sourced | `.picking_uomtypeid` |
| Purchase UOM Type | The unit this product is purchased in | reference(lbm_uom_type) | No | 0 | Blueprint-sourced | `.purchase_uomtypeid` |
| Purchase-Cost UOM Type | The unit purchase cost is expressed in | reference(lbm_uom_type) | No | 0 | Blueprint-sourced | `.purchasecost_uomtypeid` |
| Receiving UOM Type | The unit used when receiving | reference(lbm_uom_type) | No | 0 | Blueprint-sourced | `.receiving_uomtypeid` |
| Reporting UOM Type | The unit used for reporting | reference(lbm_uom_type) | No | 0 | Blueprint-sourced | `.reporting_uomtypeid` |
| Inner UOM Type | The inner-pack unit | reference(lbm_uom_type) | No | 0 | Blueprint-sourced | `.inner_uomtypeid` |
| Outer UOM Type | The outer-pack unit | reference(lbm_uom_type) | No | 0 | Blueprint-sourced | `.outer_uomtypeid` |
| Picking Hierarchy (flag) | Whether this group uses a defined picking-unit breakdown sequence | boolean(enum) | No | No | Blueprint-sourced | `.picking_hierarchy` |

Eleven independent role-specific type assignments per group — a product's UOM behavior in each of these
eleven functional contexts is governed by whichever type this group names for that role, and a group can
name a different type for each. (Source: `docs_from_blueprint/module/UOM/02-entities-and-fields.md`
§2.4.)

### `lbm_uom_type_qty`

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| UOM Group | The group this conversion factor applies to | reference(lbm_uom_group) | No | NULL | Blueprint-sourced | `.uomgroupid` |
| UOM Type | The type this conversion factor applies to | reference(lbm_uom_type) | No | NULL | Blueprint-sourced | `.uomtypeid` |
| Base Qty | The base-unit side of the conversion ratio | text (integer) | No | 0 | Blueprint-sourced | `.baseqty` |
| Qty | The UOM-unit side of the conversion ratio — how many base units equal one unit of this type | text (number) | No | 0 | Blueprint-sourced | `.qty` |

One row per (group, type) pair that needs an explicit conversion factor to the group's base type.

### `lbm_uom_picking_hierarchy`

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Picking Hierarchy ID | Primary key | identifier | Yes | auto_increment | Blueprint-sourced | `.uompickhierarchyid` |
| UOM Type | The unit type at this step of the pick breakdown | reference(lbm_uom_type) | Yes | NULL | Blueprint-sourced | `.uomtypeid` |
| UOM Group | The group this pick sequence belongs to | reference(lbm_uom_group) | No | 0 | Blueprint-sourced | `.uomgroupid` |
| Sort Order ID | The position of this type within the group's pick-unit breakdown sequence | text (integer) | No | 0 | Blueprint-sourced | `.sortorderid` |

### `lbm_applied_uom_pricing` (derived cache, session-sourced)

Not part of the blueprint's original field catalog — confirmed via this session's direct read of
`include/utils/commonfunctions.php`. A per-product JSON cache of UOM-derived prices, invalidated inside
`save_uom_group()` (`commonfunctions.php:3987-3990`) whenever a group's configuration changes, and
regenerated on demand by `saveUOMpricing()` when `uomQtyListView.php` finds the cache missing. This is a
performance/derived artifact, not a source-of-truth entity — its correctness depends entirely on the
invalidation logic firing on every relevant write, which was not independently verified as complete in
this session (flagged as an open question in `risks-and-open-questions.md`, not asserted either way).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Product | The product this cached pricing applies to | reference(Product) | Yes | — | Session-sourced | `.productid` |
| Cached pricing payload | UOM-derived price data, regenerated on demand | array | No | — | Session-sourced | JSON payload, no individually itemized columns confirmed in this session |

## Header linkage (owned by Products, not by UOM)

`vtiger_productcf.uomgroup_id` is the single FK from a Product to `lbm_uom_group.uomgroupid`. A product
also separately carries a free-text/legacy `vtiger_productcf.uom` display code, distinct from the group
assignment (`blueprint/module/Products/01-entities-fields.md:201,209`). This field belongs to Products'
own entity spec (`docs_from_blueprint/module/Products/02-entities-and-fields.md`) — UOM is the target of
this reference, not its owner.

## Tenant scoping — open question, not an assumption

None of `lbm_uom_category`, `lbm_uom_group`, `lbm_uom_type`, `lbm_uom_type_qty`, or
`lbm_uom_picking_hierarchy` carries a tenant/company/multi-tenant discriminator column (no `mtid`,
`company_id`, or equivalent) — confirmed against the live INSERT/UPDATE statements in
`commonfunctions.php:3873-3995` during this session. Only `deleted`, `userid` (the editing user, not a
tenant), `sortorderid`, and `createdtime` are present. Consistent with this codebase's broader
single-schema-per-deployment pattern, where multi-tenancy (if present at all) is enforced at the
database/deployment level rather than via row-level tenant columns — but this was not independently
confirmed for UOM specifically, and is carried forward as an open question in
`risks-and-open-questions.md` rather than resolved either way.

## Recommended rewrite schema — this session's own design proposal, not a blueprint finding

Everything above documents what exists today. This section is different in kind: a proposed replacement
schema, reasoned from the specific structural problems the legacy shape causes (each cited back to where
it's documented elsewhere in this module's spec). Table/column names below are tech-agnostic
placeholders, not a commitment to any specific naming convention.

**Problems this design fixes, one by one:**

1. **The group row's eleven flat, nullable FK columns are rigid and sparse.** Adding a twelfth role
   (e.g. a future "display" or "web-catalog" UOM) means an `ALTER TABLE`; an unpopulated role silently
   defaults to `0` rather than being cleanly absent. **Fix**: normalize the eleven role assignments into
   their own table, one row per (group, role) pair that's actually populated.
2. **The conversion factor is a two-column `baseqty`/`qty` pair with no documented canonical direction**,
   which is exactly the kind of ambiguous representation that let the `$global_qty_base_integer_sub`
   rounding-mode divergence and the independent SQL-formula copy both happen without either being an
   obvious contract violation (`calculations.md`). **Fix**: a single signed ratio column with one
   explicitly documented direction.
3. **`uom_type` is not scoped to a category at the row level**, even though every real type (Each, Case,
   Pallet) semantically belongs to exactly one category — the current shape lets a type be attached to a
   group whose category doesn't match the type's intended category, with nothing to catch the mismatch.
   **Fix**: give `uom_type` its own `category_id`, and validate a group's role assignments against its
   own category.
4. **No tenant/company column anywhere.** **Fix**: add it explicitly, resolving the open question rather
   than leaving it implicit.
5. **No confirmed unique constraints** — nothing stops two picking-hierarchy rows for the same group
   claiming the same sort position, or duplicate category/type/group names within a tenant. **Fix**:
   explicit unique constraints throughout.
6. **`lbm_applied_uom_pricing` is a raw, unversioned JSON cache whose invalidation completeness was
   never confirmed.** **Fix**: either drop it from the source-of-truth schema entirely (recompute on
   read, cache at the application/service layer) or, if a persisted cache is still wanted, make staleness
   detectable rather than merely "invalidated or not."

**Proposed tables:**

- **`uom_category`** — `id` (PK), `tenant_id`, `name` (unique per tenant), `sort_order`, standard audit
  columns (`created_at`/`updated_at`/`created_by`/`updated_by`), `is_deleted`/`deleted_at`.
- **`uom_type`** — `id` (PK), `tenant_id`, `category_id` (FK → `uom_category`, required — new, closes
  problem 3), `name` (unique per tenant+category), `sort_order`, audit/soft-delete columns.
- **`uom_group`** — `id` (PK), `tenant_id`, `name` (unique per tenant), `category_id` (FK →
  `uom_category`), `base_type_id` (FK → `uom_type`, **required, not nullable** — the legacy default of
  `0`/unassigned for a group's base type is not carried forward), `uses_picking_hierarchy` (boolean),
  audit/soft-delete columns. The eleven role columns are gone from this table entirely.
- **`uom_group_role_assignment`** (new — replaces the eleven flat columns, closes problem 1) — `id`
  (PK), `group_id` (FK → `uom_group`), `role_code` (one of: selling, pricing, stocking,
  physical_inventory, picking, purchase, purchase_cost, receiving, reporting, inner_pack, outer_pack —
  kept as a small lookup/enum table rather than a hardcoded column list, so a new role is a data insert,
  not a migration), `type_id` (FK → `uom_type`, required), unique on (`group_id`, `role_code`) so each
  role has exactly one assignment per group, audit columns.
- **`uom_conversion_factor`** (replaces `lbm_uom_type_qty`, closes problem 2) — `id` (PK), `group_id`
  (FK → `uom_group`), `type_id` (FK → `uom_type`), `units_per_base` (decimal, required, > 0 — "one base
  unit equals this many units of this type," one column, one documented direction, no baseqty/qty pair
  for a caller to get backwards), unique on (`group_id`, `type_id`), audit columns.
- **`uom_picking_hierarchy`** (tightened, closes problem 5) — `id` (PK), `group_id` (FK → `uom_group`),
  `type_id` (FK → `uom_type`), `sort_order` (integer, required), unique on (`group_id`, `type_id`) AND
  unique on (`group_id`, `sort_order`) — both duplicate-type and duplicate-position are now structurally
  impossible, not just conventionally avoided.

**On the pricing cache** (closes problem 6): recommend NOT carrying `lbm_applied_uom_pricing` forward as
a raw table in the new schema. If a persisted cache is still wanted for performance, make it an
explicitly versioned artifact — e.g. `uom_pricing_cache(product_id, group_id, computed_at,
source_version_hash)` — so staleness is detectable by comparing the hash against the current
group/conversion-factor state, rather than relying on every write path remembering to invalidate it.

**Referential integrity**: every FK above should be a real, enforced database constraint (the legacy
schema's cross-module UOM joins were confirmed to work only by convention, with the in-use delete-guard
itself using an unescaped identifier — `risks-and-open-questions.md` item UOM-RISK-002). Recommend
`RESTRICT` on delete for `uom_category`/`uom_type` while any dependent row exists, replacing the legacy's
application-level (and partially unescaped) in-use check with a database-level guarantee.

## Known Gaps

- `lbm_applied_uom_pricing`'s exact column list beyond `productid` was not individually itemized in this
  session — it is read/written as a JSON payload rather than a set of confirmed discrete columns.
- Tenant-scoping status is an open question, not a confirmed gap or a confirmed absence-by-design (see
  above and `risks-and-open-questions.md`).
