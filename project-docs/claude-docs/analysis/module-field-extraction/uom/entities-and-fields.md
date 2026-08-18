# UOM — Field Extraction: Entities & Fields

**Origin: 1 (extracted-from-existing-system)** — adapted from the existing UOM legacy blueprint at
`project-docs/sot-docs/raw/2-module-specs/UOM/`, itself a mix of blueprint-sourced and
session-sourced material (see that folder's `module-overview.md` § Origin).

> Every field individually listed — no grouping/summarizing. This document models the **rewrite
> target schema** (post cross-cutting decisions), not a direct port of the legacy tables. Legacy
> table/column names are carried as a `Legacy Trace` column for continuity. Where a field's shape
> is fixed by a decision already locked in `decisions-log.md`, that ADR is cited and **not
> re-argued**; where the legacy blueprint's own "Recommended rewrite schema" section proposed
> something that decisions-log never actually confirmed, that gap is called out explicitly rather
> than silently adopted as decided.

## Locked cross-cutting decisions this document does not re-decide

- **ADR-056** (supersedes ADR-004) — database-per-tenant. No `tenant_id`/`mtid`/`company_id`
  column on any UOM entity below — resolves legacy's UOM-OQ-001 (tenant-scoping open question) by
  making it moot: tenant scoping is a physical database boundary, not a row-level column.
- **ADR-040** — every quantity-typed field is decimal (default precision up to 4 places), never
  integer; UOM Group assignment on a Product is optional (nullable FK), not mandatory.
- **ADR-053** — UOM owns its entities and conversion logic exclusively; every other module reads
  through UOM's own service, never a direct table join. This is why every "governs" relationship
  below is expressed as a service dependency in the Cross-Module section, not a suggestion that
  another module may query these tables itself.
- **ADR-094** — the whole UOM hierarchy (Category, Group, **Functional Role**, Type) is freely
  admin-manageable data, not a fixed/hardcoded set at any level. Legacy's eleven flat FK columns on
  `lbm_uom_group` (one per hardcoded role) are normalized into a single `uom_role_assignment` join
  table, because roles themselves are now admin-definable data, not a fixed set of exactly eleven
  named columns.
- **ADR-096** — base-unit-pivot conversion; **Base is always the group's smallest unit**, validated
  at Group setup, so every other unit's factor relative to Base is a clean whole number (≥1); Base
  unit quantities stay decimal-capable; conversion-rate history is versioned in a dedicated
  factor-history table, not duplicated per transaction line. **Amended this session**: the history
  table's key is (Group, Type) together, not Type alone — see `UOMTypeFactorHistory` below and the
  Amendment note appended under ADR-096 in `decisions-log.md`.
- **UOM-RULE-019 (new this session)** — a `UOMGroup` save is rejected if any role-assigned,
  non-Base Type lacks a `UOMConversionFactor` row — prevention at Group-save time, closing what
  legacy left unconfirmed (does a missing factor error gracefully or fail silently at conversion
  time) by making the missing-factor state unreachable. See `business-rules.md`.
- **ADR-161** — conversions always stay fractional/decimal; no whole-number-rounding config flag
  (closes legacy's `$global_qty_base_integer_sub` divergence, UOM-RISK-005).
- **ADR-029 pricing block (decisions-log.md:537-557)** — prices are resolved **live**, never
  pre-materialized per product. This directly means `lbm_applied_uom_pricing` (legacy's cached
  pricing JSON) is **not carried forward** as a UOM entity in the rewrite — see "Entity dropped"
  note below.

## Entity relationship shape (rewrite target)

```
UOMCategory                         UOMType
  (id, name, sort_order)              (id, name, sort_order,
        ^                                category_id [optional FK,
        | category_id (FK, optional —      ADR-192 / UOM-FX-OQ-001])
        |   both a Group's own              ^
        |   category_id and a Type's        | type_id (FK, from role
        |   own category_id reference       |   assignment / conversion factor /
        |   this independently)             |   picking-hierarchy rows)
                  UOMGroup
        (id, name, category_id,
         base_type_id [required])
         — "Uses Picking Hierarchy" is
         NOT a stored field (ADR-192 /
         UOM-FX-OQ-005) — computed from
         UOMPickingHierarchy row presence
           |            |             |
   UOMRoleAssignment  UOMConversionFactor  UOMPickingHierarchy
   (group_id,          (group_id, type_id,   (group_id, type_id,
    role_id,            units_per_base)        sort_order)
    type_id)                  |
        |              UOMTypeFactorHistory
   UOMFunctionalRole    (group_id, type_id, rate,
   (id, name,            effective_from, effective_to)
    sort_order)
```

`UOMRoleAssignment`, `UOMConversionFactor`, and `UOMPickingHierarchy` are each independent children
of the group+type combination — not chained off each other — same non-linear topology the legacy
blueprint already corrected the intuitive assumption on (`entities-and-fields.md` §"Entity
relationship shape" in the source blueprint).

## Entity List

| Entity | Purpose | Legacy Table |
|---|---|---|
| `UOMCategory` | The category grouping a UOM Group belongs to (e.g. Length, Volume, Each) — freely admin-manageable (ADR-094). | `lbm_uom_category` |
| `UOMType` | An individual unit type (e.g. Each, Case, Pallet) — freely admin-manageable (ADR-094). | `lbm_uom_type` |
| `UOMGroup` | A product-assignable bundle naming its Category, Base Type, and picking-hierarchy usage flag. | `lbm_uom_group` (role columns removed — see `UOMRoleAssignment`) |
| `UOMFunctionalRole` | **New entity (ADR-094).** A named functional role (e.g. Selling, Pricing, Stocking) a Group can assign a Type to — freely admin-manageable, not a fixed set of exactly eleven. | No legacy table — legacy hardcoded these as eleven column names on `lbm_uom_group` |
| `UOMRoleAssignment` | **New entity (ADR-094), replaces legacy's eleven FK columns.** One row per (Group, Role, Type) — which Type fulfills a given Role for a given Group. | Normalizes `lbm_uom_group`'s eleven `*_uomtypeid` columns |
| `UOMConversionFactor` | The conversion factor between a group's Base type and one other type used by that group. | `lbm_uom_type_qty` |
| `UOMTypeFactorHistory` | **New entity (ADR-096).** Versioned history of a conversion factor's effective rate over time, looked up by effective date rather than duplicated per transaction line. | No legacy equivalent — legacy copied the rate onto every finalized transaction line instead |
| `UOMPickingHierarchy` | The ordered sequence of unit types used when breaking a pick quantity into whole units, per group. | `lbm_uom_picking_hierarchy` |

### Entity dropped from the rewrite: `lbm_applied_uom_pricing`

Legacy's per-product cached UOM-pricing JSON is **not** carried forward as a UOM entity.
Per the pricing-resolution design locked in decisions-log.md:537-557 (part of the unified Pricing
module, ADR-029), prices are computed live from pricing rules (which may carry a fixed price for a
specific unit, falling back to the Base unit's price via UOM's conversion service) — never
pre-materialized or cached per product. This also structurally resolves two of the legacy risks
that existed only because the cache and its two write directions existed: **UOM-RISK-004**
(no concurrency protection between the two price-write directions) and **UOM-RISK-007** (cache
invalidation completeness) — there is no cache to go stale and no second write direction to
conflict with, because "Manage UOM Qty Pricing"-style editing is now Pricing-module rule
management, not a write-back onto product price fields. See `open-questions.md` for how these two
former risks are dispositioned.

## Field Catalog

### `UOMCategory` (was `lbm_uom_category`)

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Confidence | Legacy Trace |
|---|---|---|---|---|---|---|---|
| ID | Primary key | identifier | Yes | auto | System-set | Confirmed | `.uomcategoryid` |
| Name | The category grouping (e.g. Length, Volume, Each); freely admin-manageable (ADR-094) | text | Yes | NULL | User-entered | Confirmed | `.uomcategoryname` |
| Sort Order | Display/sequencing order | integer | No | — | User-entered | Confirmed | `.sortorderid` |
| Is Deleted | Soft-delete flag | boolean | No | false | System-set | Confirmed | `.deleted` |
| Created At / Updated At / Created By / Updated By | Standard audit columns | datetime / datetime / reference(User) / reference(User) | No | — | System-set | Confirmed | `.userid` (legacy only tracked one editing-user field; audit trail here follows this project's standard column set) |

### `UOMType` (was `lbm_uom_type`)

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Confidence | Legacy Trace |
|---|---|---|---|---|---|---|---|
| ID | Primary key | identifier | Yes | auto | System-set | Confirmed | `.uomtypeid` |
| Name | An individual unit type (e.g. Each, Case, Pallet); freely admin-manageable (ADR-094) | text | Yes | NULL | User-entered | Confirmed | `.uomtype` |
| Category | Which Category this Type belongs to (e.g. "Feet" → "Length") | reference(UOMCategory) | No — **optional**, resolved this session (ADR-192, closes UOM-FX-OQ-001) | NULL | User-entered | Confirmed (ADR-192) | Legacy has no such column (`uomtype` is category-agnostic); the legacy blueprint's own "Recommended rewrite schema" proposed adding this as a **required** field, but the developer confirmed only an optional FK — a Type may opt in without being forced to declare one |
| Sort Order | Display/sequencing order | integer | No | — | User-entered | Inferred (family pattern) | Not itemized on `lbm_uom_type` in the source blueprint's field catalog, but the same family pattern applies to every other admin-managed list in this module |
| Is Deleted | Soft-delete flag | boolean | No | false | System-set | Confirmed | (soft-delete gating confirmed via `delete_uom()`, no explicit column in blueprint's Type field row but consistent with the family pattern) |
| Created At / Updated At / Created By / Updated By | Standard audit columns | datetime / datetime / reference(User) / reference(User) | No | — | System-set | Inferred (family pattern) | — |

### `UOMGroup` (was `lbm_uom_group`)

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Confidence | Legacy Trace |
|---|---|---|---|---|---|---|---|
| ID | Primary key | identifier | Yes | auto | System-set | Confirmed | `.uomgroupid` |
| Name | The name a product-assignable UOM bundle is known by; freely admin-manageable | text | Yes | NULL | User-entered | Confirmed | `.groupname` |
| Category | The category this group belongs to | reference(UOMCategory) | No | — | User-entered | Confirmed | `.uomcategoryid` (legacy default `0`/unassigned; rewrite treats an unassigned category as a genuine null, not a `0` sentinel) |
| Base Type | The unit all conversions for this group are pivoted through; **must be the group's smallest unit** (ADR-096, validated at setup) | reference(UOMType) | **Yes — required, not nullable** (ADR-096 + blueprint's own schema-integrity fix) | — | User-entered | Confirmed (ADR-096) | `.base_uomtypeid` (legacy default `0`/unassigned — rewrite closes this) |
| Is Deleted | Soft-delete flag | boolean | No | false | System-set | Confirmed | `.deleted` |
| Created At / Updated At / Created By / Updated By | Standard audit columns | datetime / datetime / reference(User) / reference(User) | No | — | System-set | Confirmed | `.userid` |

> **Removed field — "Uses Picking Hierarchy" (ADR-192 / UOM-FX-OQ-005)**: this row previously listed
> `uses_picking_hierarchy` (boolean, `.picking_hierarchy`) as a persisted, independently-editable
> `UOMGroup` field. Resolved this session: it is **not** a stored column at all — it is a **computed
> value**, true if at least one `UOMPickingHierarchy` row exists for the Group, false otherwise. This
> removes the flag/row-presence inconsistency (formerly UOM-RULE-013 / UOM-FX-OQ-005) structurally,
> the same pattern ADR-190 used for the conversion-factor gap. See `business-rules.md`'s amended
> UOM-RULE-013 in this folder for the computed-value statement.

The eleven legacy role-specific FK columns (`selling_uomtypeid`, `pricing_uomtypeid`,
`stocking_uomtypeid`, `pi_uomtypeid`, `picking_uomtypeid`, `purchase_uomtypeid`,
`purchasecost_uomtypeid`, `receiving_uomtypeid`, `reporting_uomtypeid`, `inner_uomtypeid`,
`outer_uomtypeid`) are **not** fields on `UOMGroup` in the rewrite — they are rows in
`UOMRoleAssignment` below (ADR-094).

> **Lock condition (UOM-RULE-020 / ADR-190)**: the field table above lists `UOMGroup`'s fields as
> generally User-entered/editable, but that is only true until the Group is referenced by any
> transaction. Once transaction-referenced, every field except **Name** becomes locked (read-only)
> and the Group becomes undeletable — this includes Category and Base Type above, plus every
> `UOMRoleAssignment`, `UOMConversionFactor`, and `UOMPickingHierarchy` row belonging to the Group.
> Name remains editable indefinitely, since references are by ID. See `business-rules.md`
> UOM-RULE-020 in this folder for the full statement; this note exists so a reader of this table
> alone doesn't assume unconditional editability.

### `UOMFunctionalRole` (new entity, ADR-094 — no legacy table)

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Confidence | Legacy Trace |
|---|---|---|---|---|---|---|---|
| ID | Primary key | identifier | Yes | auto | System-set | Confirmed | none — new entity |
| Name | The functional role's name (e.g. Selling, Pricing, Stocking, Physical Inventory, Picking, Purchase, Purchase-Cost, Receiving, Reporting, Inner-Pack, Outer-Pack); freely admin-manageable | text | Yes | NULL | User-entered | Confirmed (ADR-094 decision; the eleven names themselves are Inferred — carried from legacy's eleven hardcoded column names as the sensible seeded starter set, not independently re-confirmed as the exact intended seed list) | Derived from `lbm_uom_group`'s eleven role column names |
| Sort Order | Display/sequencing order | integer | No | — | User-entered | Inferred (family pattern) | none |
| Is Deleted | Soft-delete flag | boolean | No | false | System-set | Inferred (family pattern) | none |
| Created At / Updated At / Created By / Updated By | Standard audit columns | datetime / datetime / reference(User) / reference(User) | No | — | System-set | Inferred (family pattern) | none |

### `UOMRoleAssignment` (new entity, ADR-094 — replaces `lbm_uom_group`'s eleven FK columns)

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Confidence | Legacy Trace |
|---|---|---|---|---|---|---|---|
| ID | Primary key | identifier | Yes | auto | System-set | Confirmed | none — new entity |
| Group | The UOM Group this role assignment belongs to | reference(UOMGroup) | Yes | — | System-set (from context) | Confirmed | Normalizes `lbm_uom_group.uomgroupid` |
| Functional Role | Which role is being fulfilled (Selling, Pricing, etc.) | reference(UOMFunctionalRole) | Yes | — | User-entered | Confirmed (ADR-094) | Normalizes the eleven `*_uomtypeid` column *names* |
| Type | Which UOM Type fulfills this role for this group | reference(UOMType) | Yes | — | User-entered | Confirmed (ADR-094) | Normalizes the eleven `*_uomtypeid` column *values* |
| Created At / Updated At / Created By / Updated By | Standard audit columns | datetime / datetime / reference(User) / reference(User) | No | — | System-set | Inferred (family pattern) | `.userid` |

Unique constraint: one row per (Group, Functional Role) — a group cannot assign two different types
to the same role simultaneously. **Inferred** from ADR-094's stated intent ("one row per (UOM Group,
Functional Role, UOM Type)") and the legacy shape it replaces (one type per role slot); not an
explicit standalone ADR sentence, but a direct consequence of the model ADR-094 describes.

### `UOMConversionFactor` (was `lbm_uom_type_qty`)

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Confidence | Legacy Trace |
|---|---|---|---|---|---|---|---|
| ID | Primary key | identifier | Yes | auto | System-set | Inferred (legacy has no PK on this table — composite-keyed; rewrite gives it a surrogate key per this project's standard) | none — legacy table has no dedicated ID column |
| Group | The group this conversion factor applies to | reference(UOMGroup) | Yes | — | System-set (from context) | Confirmed | `.uomgroupid` |
| Type | The (non-Base) type this conversion factor applies to | reference(UOMType) | Yes | — | User-entered | Confirmed | `.uomtypeid` |
| Units Per Base | How many units of this Type equal one Base unit; **must be a whole number ≥ 1** since Base is always the group's smallest unit (ADR-096) | decimal | Yes | — | User-entered | Confirmed (ADR-096 collapses legacy's ambiguous two-column `baseqty`/`qty` pair into one column, one documented direction) | Replaces `.baseqty` and `.qty` (legacy's two-column, undocumented-direction pair) |
| Created At / Updated At / Created By / Updated By | Standard audit columns | datetime / datetime / reference(User) / reference(User) | No | — | System-set | Inferred (family pattern) | none confirmed on legacy table |

Unique constraint: one row per (Group, Type) — closes legacy's unconfirmed-uniqueness gap
(blueprint's own "Recommended rewrite schema" §Known Gaps).

### `UOMTypeFactorHistory` (new entity, ADR-096 — no legacy equivalent)

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Confidence | Legacy Trace |
|---|---|---|---|---|---|---|---|
| ID | Primary key | identifier | Yes | auto | System-set | Confirmed | none — new entity |
| Group | The UOM Group whose conversion factor this history row is tracking | reference(UOMGroup) | Yes | — | System-set (from context) | Confirmed — **resolved with the developer this session**: the key is (Group, Type) together, matching `UOMConversionFactor`'s own key, not Type alone. This was originally flagged Underspecified/Blocking (UOM-FX-OQ-002) because ADR-096's Decision text read as Type-level-only while its Consequences line's column list named only `uom_type_id`. Now resolved; a short Amendment note has been appended under ADR-096 in `decisions-log.md` recording this, without rewriting ADR-096's original text. | ADR-096 Amendment (this session) |
| Type | The UOM Type whose conversion factor this history row is tracking | reference(UOMType) | Yes | — | System-set (from context) | Confirmed (same resolution as Group, above) | ADR-096 Consequences: "adds the factor-history table (uom_type_id, rate, effective_from, effective_to)" — the (Group, Type) pairing sharpens this, per the Amendment |
| Rate | The effective conversion rate (Units Per Base) during this date range | decimal | Yes | — | System-set (snapshot of `UOMConversionFactor.units_per_base` at the moment it changed) | Confirmed | none |
| Effective From | The date this rate became effective | date | Yes | — | System-set | Confirmed | none |
| Effective To | The date this rate stopped being effective (null = still current) | date | No | NULL | System-set | Confirmed | none |
| Created At | When this history row was written | datetime | No | — | System-set | Inferred (standard audit column) | none |

A new row is written only when a factor actually changes (ADR-096: "a rare event") — not on every
read or every transaction. Unique constraint: at most one row per (Group, Type) with `Effective To`
null (i.e., only one "currently effective" row per Group+Type pair at a time) — Inferred, a
necessary consequence of the history table's own purpose, not an independently stated ADR sentence.

### `UOMPickingHierarchy` (was `lbm_uom_picking_hierarchy`)

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Confidence | Legacy Trace |
|---|---|---|---|---|---|---|---|
| ID | Primary key | identifier | Yes | auto | System-set | Confirmed | `.uompickhierarchyid` |
| Type | The unit type at this step of the pick breakdown | reference(UOMType) | Yes | NULL | User-entered | Confirmed | `.uomtypeid` |
| Group | The group this pick sequence belongs to | reference(UOMGroup) | Yes | — | System-set (from context) | Confirmed (legacy allowed default `0`/unassigned; rewrite requires it since an orphaned pick-hierarchy row with no group is meaningless) | `.uomgroupid` |
| Sort Order | The position of this type within the group's pick-unit breakdown sequence | integer | Yes | — | User-entered | Confirmed | `.sortorderid` |
| Is Deleted | Soft-delete flag | boolean | No | false | System-set | Confirmed | `.deleted` |
| Created At / Updated At / Created By / Updated By | Standard audit columns | datetime / datetime / reference(User) / reference(User) | No | — | System-set | Inferred (family pattern) | `.userid` |

Unique constraints: one row per (Group, Type) **and** one row per (Group, Sort Order) — both
duplicate-type and duplicate-position become structurally impossible (blueprint's own schema-fix
recommendation, carried forward as it closes a confirmed gap and is not contradicted by any ADR).

## Header linkage (owned by Products, not by UOM)

A Product carries a single, **optional** FK to `UOMGroup` (ADR-040: "UOM group on a Product is
optional... nullable, not required"). This field belongs to Products' own entity spec, not UOM's —
UOM is the target of the reference, not its owner. Legacy additionally carried a free-text
`vtiger_productcf.uom` display code separate from the group assignment
(`blueprint/module/Products/01-entities-fields.md:201,209`, cited via the UOM legacy blueprint's own
entities-and-fields.md) — whether that free-text display code is carried forward at all is a
Products-module question, out of scope here, noted only so the field isn't silently lost between
modules' extractions.

## Cross-module field dependencies (named at the field level, per ADR-053 — service calls, never direct table reads)

- **Products** — needs `UOMGroup.id` as the FK target for its own (optional) `uom_group_id` field
  (ADR-040), and reads the full `UOMRoleAssignment` set for a product's assigned group (to render
  available unit choices on the product edit screen).
- **Settings** — owns the per-consuming-module admin configuration of "which Functional Role feeds
  which field" (ADR-095: SalesOrder Qty/Sell-Price, PurchaseOrder Qty/Cost, Store Transfer Qty).
  Needs the full `UOMFunctionalRole.id`/`Name` list to populate that mapping screen's role choices.
- **SalesOrder** — needs, per line item: the product's `UOMGroup.id`; the `UOMRoleAssignment.type_id`
  for whichever role Settings has mapped to Qty and to Sell Price (ADR-095); `UOMConversionFactor
.units_per_base` for the unit currently selected on the line, to convert the entered quantity to
  the group's Base unit for storage (ADR-096); `UOMGroup.base_type_id` as the pivot target; and, for
  historical display/reporting of an already-finalized line, `UOMTypeFactorHistory` looked up by the
  line's finalize date (ADR-096 — no duplicated rate stored on the line itself). Per-line unit
  override (ADR-097) additionally needs the full list of `UOMType`s available in the product's group
  (i.e., every type with either a `UOMRoleAssignment` or a `UOMConversionFactor` row for that group).
  Also needs `UOMPickingHierarchy` (ordered `type_id`/`sort_order` rows for the group) for warehouse
  pick-list allocation — legacy's confirmed direct join in `wmsSalesOrderAllocation.php:1312-1321`.
- **PurchaseOrder** — same shape as SalesOrder, but Cost in place of Sell Price (ADR-095): needs
  `UOMRoleAssignment.type_id` for the Qty-mapped and Cost-mapped roles, `UOMConversionFactor
.units_per_base`, `UOMGroup.base_type_id`, and `UOMTypeFactorHistory` for historical lines.
- **Receiving** — needs the same `UOMRoleAssignment` (Receiving role per legacy's role name, or
  whichever role a rewrite maps it to) and `UOMConversionFactor.units_per_base` to record a received
  quantity in the group's receiving unit and convert it to Base for inventory posting.
- **StoreTransfer** — needs `UOMRoleAssignment.type_id` for whichever role Settings maps to the
  transfer-quantity field (ADR-095), `UOMConversionFactor.units_per_base`, and — per legacy's
  confirmed direct join in `fetchLocationProductDetails.php:57-80` for base/inner/outer UOM
  resolution — the role assignments for whichever roles a rewrite designates Inner-Pack/Outer-Pack,
  plus `UOMPickingHierarchy` if StoreTransfer's own pick/pack flow uses a breakdown sequence.
- **Manufacturing (BOM)** — needs `UOMConversionFactor.units_per_base` (and `UOMGroup.base_type_id`)
  for every component's UOM Group, to convert each component's quantity into a common Base unit
  during BOM explosion/costing.
- **Kits** — same as Manufacturing: needs `UOMConversionFactor.units_per_base` and
  `UOMGroup.base_type_id` to sum component quantities in a common base unit.
- **SalesHistory** — needs `UOMGroup.base_type_id`, `UOMConversionFactor.units_per_base`, and —
  critically, per ADR-096's storage-saving design — `UOMTypeFactorHistory` (rate effective on the
  original transaction's finalize date) to display/report a historical quantity or price correctly,
  since the historical line itself stores no duplicated rate.
- **Pricing** (unified module, ADR-029) — a winning pricing rule's fixed-price override, if any, is
  keyed to a specific `UOMType.id`; if none exists for the resolved unit, Pricing derives the price
  from the Base unit's price using `UOMConversionFactor.units_per_base` via UOM's own conversion
  service (never computing it itself — ADR-053). Also: **UOM Type deletion is a UOM-owned operation
  that cascades into Pricing** — decisions-log.md:554 states any fixed-price override tied to a
  deleted unit is deleted along with it, a write UOM's delete operation must trigger in Pricing's
  data, not merely notify about.

## Field cross-check (per the field-extraction guardrail)

Every field cataloged above is referenced by at least one rule in `business-rules.md` or one
cross-module dependency above, **except**: audit columns (`Created At`/`Updated At`/`Created
By`/`Updated By`) and `Is Deleted`, which are standalone by design (system/audit fields, not
touched by business rules) — a conscious note, not an omission. Conversely, every field referenced
in `business-rules.md`, `workflow.md`, or the legacy screens-and-user-flows.md source resolves to a
cataloged field here; none were found referenced elsewhere without a catalog entry.

## Coverage Statement

**Read in full**: all ten files in `project-docs/sot-docs/raw/2-module-specs/UOM/`
(`module-overview.md`, `entities-and-fields.md`, `business-rules-and-validation.md`,
`calculations.md`, `workflows.md`, `integrations.md`, `permissions.md`, `outputs.md`,
`screens-and-user-flows.md`, `build-guidance.md`) plus `risks-and-open-questions.md`. Also read, in
full: `project-docs/prompts/3-document-generate/05-modules/0-field-extraction.md` (this extraction's
governing process). Grepped `project-docs/claude-docs/gap-analysis/decisions-log.md` for "UOM" and
read every matched ADR in full context (ADR-004 [superseded], ADR-005 [tenant_id column later
dropped by ADR-073], ADR-029's pricing-resolution block, ADR-040, ADR-053, ADR-056, ADR-094 through
ADR-098, ADR-161), plus the ADR-054 note ("no module-specific decisions needed" milestone marker)
confirming module-by-module review completion.

**Not read**: the live legacy PHP source (`commonfunctions.php`, `uom_ajax_action.php`, etc.) or any
live legacy database — per this task's explicit instruction, this extraction adapts the existing
blueprint's own file:line citations rather than re-reading the legacy system directly. No other
`decisions-log.md` ADRs outside the "UOM" grep hits were individually opened (the file is ~4,000
lines; only the matched sections and their immediate surrounding context were read). Other modules'
own field-extraction documents (Products, SalesOrder, PurchaseOrder, etc.) do not yet exist in
`project-docs/claude-docs/analysis/module-field-extraction/` as of this writing, so cross-module
dependencies above are stated from this module's side only, based on the legacy blueprint's
`integrations.md` survey and the relevant ADRs — not cross-verified against those other modules' own
not-yet-written field catalogs.
