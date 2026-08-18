# Data Dictionary — UOM

# Document Information

| Field | Value |
|--------|-------|
| Module | UOM |
| Version | 1.0 |
| Status | Draft |
| Author | Claude Code (docs-kit generation) |
| Last Updated | 2026-08-18 |

---

# 1. Overview

**Business purpose**: govern the business meaning, ownership, and lifecycle of every UOM data
element — the fields `4-schema.md` implements physically.

**Scope**: `UOMCategory`, `UOMType`, `UOMFunctionalRole`, `UOMGroup`, `UOMRoleAssignment`,
`UOMConversionFactor`, `UOMTypeFactorHistory`, `UOMPickingHierarchy`.

**Naming conventions**: business names in this document map to `snake_case` schema columns per
`2-database/4-database-standards.md` — e.g. "Base Type" → `base_type_id`.

---

# 2. Entity Definitions

## UOMCategory

**Description**: the category grouping a UOM Group belongs to (e.g. Length, Volume, Each).

**Business Purpose**: lets an administrator organize UOM Groups by physical dimension.

**Owner**: Catalog administrator (business); UOM module (system).

**Lifecycle**: created freely (ADR-094); renamed freely; soft-deleted, blocked while any Group
references it (BR-014).

## UOMType

**Description**: an individual unit type (e.g. Each, Case, Pallet).

**Business Purpose**: the atomic unit a Group's roles and conversions are built from.

**Owner**: Catalog administrator; UOM module.

**Lifecycle**: created/renamed freely; soft-deleted, blocked while referenced by any Group's Base
Type, Role Assignment, Conversion Factor, or Picking Hierarchy row (BR-014).

## UOMFunctionalRole

**Description**: a named functional role (Selling, Pricing, Stocking, etc.) a Group assigns a Type
to.

**Business Purpose**: lets a consuming module ask "which Type governs this role for this product's
Group" without a hardcoded mapping.

**Owner**: Catalog administrator; UOM module.

**Lifecycle**: created/renamed freely (ADR-094); soft-deleted, blocked while referenced by any Role
Assignment (BR-014, extended per `open-questions.md` UOM-FX-OQ-007).

## UOMGroup

**Description**: a product-assignable bundle naming a Category, a required Base Type, and whether it
uses a picking hierarchy.

**Business Purpose**: the entity a Product is actually assigned to (optionally, ADR-040) — the
central configuration unit of this module.

**Owner**: Catalog administrator; UOM module.

**Lifecycle**: created only with a Base Type (BR-002); updated freely subject to BR-019's
completeness validation — until transaction-referenced, after which every field except Name
locks and delete is blocked outright (BR-020, ADR-190, `open-questions.md` UOM-FX-OQ-006,
Resolved). Independently, delete is also blocked while a Product references it, even pre-transaction.

## UOMRoleAssignment

**Description**: which Type fulfills which Functional Role for a Group.

**Business Purpose**: the normalized replacement for legacy's eleven hardcoded FK columns
(ADR-094).

**Owner**: Catalog administrator (via Group edit); UOM module.

**Lifecycle**: created/updated as part of a Group save; hard-deleted (pure child record, no
independent references — `workflow.md`).

## UOMConversionFactor

**Description**: how many units of a non-Base Type equal one Base unit.

**Business Purpose**: the arithmetic input every conversion computation reads.

**Owner**: Catalog administrator (via Group edit); UOM module.

**Lifecycle**: created/updated as part of a Group save, validated complete at that point (BR-019);
a value change writes a `UOMTypeFactorHistory` row (BR-009); hard-deleted (pure child record).

## UOMTypeFactorHistory

**Description**: the effective-dated history of a Conversion Factor's rate.

**Business Purpose**: lets a historical report resolve the rate that was actually in force on a past
transaction's finalize date, without storing a duplicate rate on every transaction line (ADR-096).

**Owner**: system-generated only — never directly administrator-editable.

**Lifecycle**: append-only; a row is written automatically whenever a Conversion Factor's value
changes; never updated or deleted.

## UOMPickingHierarchy

**Description**: the ordered sequence of Types used to break a pick quantity into whole units, per
Group.

**Business Purpose**: feeds warehouse pick-list allocation (e.g. SalesOrder's WMS allocation).

**Owner**: Catalog administrator (via Group edit — whether this section is shown/used is a computed
value, true when at least one Picking Hierarchy row exists for the Group, per ADR-192/UOM-RULE-013;
not a stored flag the administrator sets independently); UOM module.

**Lifecycle**: created/updated/reordered; hard-deleted (pure child record).

---

# 3. Field Definitions

| Field | Description | Business Purpose | Example |
|--------|-------------|------------------|----------|
| `UOMCategory.name` | The category's display name | Organizes Groups by physical dimension | "Volume" |
| `UOMCategory.sort_order` | Display/sequencing order | Controls listview ordering | `10` |
| `UOMType.name` | The unit type's display name | Identifies the atomic unit | "Case" |
| `UOMType.category_id` | Which Category this Type belongs to (optional, ADR-192) | Lets a Type declare its Category without requiring one | reference to "Length", or blank |
| `UOMFunctionalRole.name` | The role's display name | Identifies what a Type is being used for | "Selling" |
| `UOMGroup.name` | The Group's display name | Identifies the bundle a Product is assigned to | "Lumber — Board Feet" |
| `UOMGroup.category_id` | Which Category this Group belongs to | Optional organizational grouping | reference to "Length" |
| `UOMGroup.base_type_id` | The Group's pivot unit | Every conversion routes through this Type | reference to "Foot" |
| `UOMRoleAssignment.role_id` | Which Functional Role this row fulfills | Ties a Type to a specific business use | reference to "Selling" |
| `UOMRoleAssignment.type_id` | Which Type fulfills the role | The actual unit used for that role | reference to "Each" |
| `UOMConversionFactor.units_per_base` | How many units of this Type equal one Base unit | The core conversion arithmetic input | `12` (12 Each = 1 Case) |
| `UOMTypeFactorHistory.rate` | The historical `units_per_base` value | Preserves what the rate was on a past date | `10` (prior to a factor change) |
| `UOMTypeFactorHistory.effective_from` / `.effective_to` | The date range this rate applied | Answers "what rate applied on date X" | `2025-01-01` / `2025-06-30` |
| `UOMPickingHierarchy.sort_order` | The position of this Type in the pick-breakdown sequence | Determines pick-ticket unit-breakdown order | `1` (largest unit first) |

(Standard audit columns — `id`, `created_at`, `updated_at`, `created_by`, `updated_by`, `is_deleted`,
`deleted_at` — are not repeated per-entity here; see `4-schema.md` §4 for their exact typing, and
`entities-and-fields.md`'s field cross-check note that these are intentionally standalone,
non-rule-referenced fields.)

---

# 4. Enumerations

UOM has **no fixed/hardcoded enum fields** — this is a deliberate design property, not an omission.
`UOMCategory`, `UOMType`, and `UOMFunctionalRole` are each freely admin-manageable data (ADR-094),
not a lookup with a closed value list. The only boolean-shaped stored field is the standard
`is_deleted` soft-delete flag — not a multi-value enum. (The Group's picking-hierarchy indicator is
computed, not stored — see §6.)

---

# 5. Reference Data

**Seeded starter data** (per ADR-094 — "a sensible starter set can still ship in skeleton"):
- `UOMFunctionalRole`: Selling, Pricing, Stocking, Physical Inventory, Picking, Purchase,
  Purchase-Cost, Receiving, Reporting, Inner-Pack, Outer-Pack (Inferred as the sensible starter set
  — carried from legacy's eleven hardcoded role names, not independently re-confirmed as the exact
  intended seed list; see `module-field-extraction/uom/entities-and-fields.md` `UOMFunctionalRole`).
- `UOMCategory`/`UOMType`/`UOMGroup`: no specific starter set confirmed in any source — left to the
  administrator or a future data-migration/seed script, not invented here.

Countries/Currencies/Statuses: not applicable to this module.

---

# 6. Default Values

- The Group's picking-hierarchy indicator is computed (true when at least one
  `UOMPickingHierarchy` row exists for the Group), not a stored field — there is no default to
  set, per ADR-192/UOM-RULE-013.
- `is_deleted` defaults to `false` on every entity.
- No other field carries a business-meaningful default — `UOMGroup.category_id`,
  `UOMType.category_id`, and `UOMGroup.base_type_id` intentionally have **no** default (Category is
  genuinely optional on both Group and Type; Base Type is required with no sensible default, per
  BR-002 — an administrator must choose
  explicitly).

---

# 7. Data Ownership

**Business Owner**: Catalog administrator role (legacy's own terminology; not a confirmed distinct
permission role — see `7-permissions.md`).

**System Owner**: UOM module's own service — the sole authorized write path (BR-015/ADR-053).

**Source**: administrator-entered for Category/Type/Functional Role/Group/Role Assignment/
Conversion Factor/Picking Hierarchy; system-generated for `UOMTypeFactorHistory` (never directly
editable).

---

# 8. Data Classification

All UOM data is **Internal** — configuration/reference data, not customer PII, not financial-account
data, not a credential. No field in this module carries a Confidential or Restricted classification.

---

# 9. Data Lifecycle

**Creation**: per §2 above, per entity.

**Modification**: Category/Type/Functional Role/Group names and sort orders freely editable; Group's
Base Type editable subject to not breaking existing Conversion Factor consistency (see
`2-functional-specification.md` FR-004 Alternate Flow); Conversion Factor values editable, each
change writing a history row (BR-009).

**Archival**: none beyond soft-delete — no separate archival tier exists for this module's small
reference-data volumes.

**Deletion**: soft-delete only for Category/Type/Functional Role/Group, guarded by BR-014; hard
delete for the pure child records (Role Assignment, Conversion Factor, Picking Hierarchy row) —
`UOMTypeFactorHistory` is never deleted (append-only, BR-009).

**Retention**: `UOMTypeFactorHistory` is retained indefinitely — its entire purpose is historical
reporting accuracy (ADR-096); no retention/purge policy applies.

---

# 10. Related Documents

Schema: `4-schema.md` · Validation: `6-validation.md` · Business Rules: `3-business-rules.md` · API:
`8-api.md` · UI: `9-ui.md`

---

# Revision History

| Date | Change |
|---|---|
| 2026-08-18 | Initial draft. |

---

# Approval

Pending review per `4-document-review/1-document-review.md`.

---

# AI Generation Notes

Drafted from `module-field-extraction/uom/entities-and-fields.md` (post-amendment) and
`4-schema.md` (this module). No enumerations were invented — §4 states explicitly that none exist,
per the field-extraction's own "don't invent a plausible-sounding enum value list" guardrail.
