# Schema — UOM

# Document Information

| Field | Value |
|--------|-------|
| Module | UOM |
| Version | 1.0 |
| Status | Draft |
| Database | PostgreSQL |
| Author | Claude Code (docs-kit generation) |
| Last Updated | 2026-08-18 |

---

# 1. Overview

**Purpose of the schema**: persist UOM's admin-manageable reference-data hierarchy (Category, Type,
Functional Role, Group, Role Assignment) and the conversion arithmetic's own data (Conversion
Factor, Factor History, Picking Hierarchy) — the single source of truth every other module's own
schema references via UOM's service, never a direct join (ADR-053 / BR-015).

**High-level entities**: `uom_categories`, `uom_types`, `uom_functional_roles`, `uom_groups`,
`uom_role_assignments`, `uom_conversion_factors`, `uom_type_factor_history`,
`uom_picking_hierarchy`.

**Design principles**: follows `2-database/4-database-standards.md` exactly — UUID primary keys,
`snake_case` plural table names, standard audit columns, database-per-tenant (ADR-056, no
`tenant_id` column, per ADR-073's project-wide drop), real enforced FKs with `RESTRICT` on delete
while a dependent row exists (closing UOM-RISK-006 by construction, per BR-014). This schema
implements `module-field-extraction/uom/entities-and-fields.md`'s target model directly — legacy's
eleven flat FK columns on `lbm_uom_group` are normalized into `uom_role_assignments` (ADR-094);
legacy's ambiguous `baseqty`/`qty` pair collapses into `uom_conversion_factors.units_per_base`
(ADR-096); `uom_type_factor_history` is new (ADR-096, keyed (Group, Type) per the Amendment appended
under ADR-096 in `decisions-log.md`).

---

# 2. Entity Relationship Diagram

```
uom_categories ──1:N── uom_types (category_id, optional FK — confirmed, ADR-192 / UOM-FX-OQ-001)
uom_categories ──1:N── uom_groups (category_id, optional)
uom_types ──1:1── uom_groups (base_type_id, required)
uom_groups ──1:N── uom_role_assignments ──N:1── uom_functional_roles
uom_role_assignments ──N:1── uom_types
uom_groups ──1:N── uom_conversion_factors ──N:1── uom_types
uom_conversion_factors ──1:N── uom_type_factor_history (keyed group_id + type_id)
uom_groups ──1:N── uom_picking_hierarchy ──N:1── uom_types
```

"Uses Picking Hierarchy" is **not** a column anywhere in this diagram — per ADR-192 it is a computed
value derived from `uom_picking_hierarchy` row existence for a Group, not a stored relationship. See
§9's "Computed Picking-Hierarchy Indicator" note.

---

# 3. Entities

## UOMCategory

**Purpose**: the category grouping a UOM Group belongs to (e.g. Length, Volume, Each); freely
admin-manageable (ADR-094).

**Relationships**: one Category → many Types (`uom_types.category_id`, optional — confirmed ADR-192);
one Category → many Groups.

## UOMType

**Purpose**: an individual unit type (e.g. Each, Case, Pallet); freely admin-manageable.

**Relationships**: referenced by `uom_groups.base_type_id`, `uom_role_assignments.type_id`,
`uom_conversion_factors.type_id`, `uom_picking_hierarchy.type_id`.

## UOMFunctionalRole

**Purpose**: a named functional role (Selling, Pricing, Stocking, etc.) a Group can assign a Type
to; freely admin-manageable, new entity (ADR-094) replacing legacy's hardcoded eleven column names.

**Relationships**: referenced by `uom_role_assignments.role_id`.

## UOMGroup

**Purpose**: a product-assignable bundle naming its Category and required Base Type. Its
picking-hierarchy usage status is a computed value (ADR-192), not a stored field — see §9.

**Relationships**: one Group → many Role Assignments, Conversion Factors, Picking Hierarchy rows;
referenced by Products' own `uom_group_id` (owned by Products, not modeled here).

## UOMRoleAssignment

**Purpose**: which Type fulfills which Functional Role for a Group — new entity (ADR-094),
normalizing legacy's eleven flat FK columns.

**Relationships**: N:1 to Group, Functional Role, and Type.

## UOMConversionFactor

**Purpose**: the whole-number-or-greater conversion factor between a non-Base Type and the Group's
Base Type.

**Relationships**: N:1 to Group and Type; 1:N to Factor History.

## UOMTypeFactorHistory

**Purpose**: effective-dated history of a Conversion Factor's rate — new entity (ADR-096, keyed
(Group, Type) per the ADR-096 Amendment).

**Relationships**: N:1 to Group and Type (same pair as the Conversion Factor it tracks).

## UOMPickingHierarchy

**Purpose**: the ordered sequence of Types used to break a pick quantity into whole units, per
Group.

**Relationships**: N:1 to Group and Type.

---

# 4. Table Definitions

## uom_categories

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | UUID | No | `gen_random_uuid()` |
| name | VARCHAR(255) | No | — |
| sort_order | INTEGER | Yes | — |
| is_deleted | BOOLEAN | No | `false` |
| deleted_at | TIMESTAMPTZ | Yes | — |
| created_at | TIMESTAMPTZ | No | `now()` |
| updated_at | TIMESTAMPTZ | No | `now()` |
| created_by | UUID | Yes | — |
| updated_by | UUID | Yes | — |

**Primary Key**: `id`. **Foreign Keys**: `created_by`/`updated_by` → `users.id`. **Indexes**: unique
on `name` where `is_deleted = false`. **Constraints**: `name` NOT NULL.

## uom_types

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | UUID | No | `gen_random_uuid()` |
| name | VARCHAR(255) | No | — |
| category_id | UUID | Yes | — |
| sort_order | INTEGER | Yes | — |
| is_deleted | BOOLEAN | No | `false` |
| deleted_at | TIMESTAMPTZ | Yes | — |
| created_at | TIMESTAMPTZ | No | `now()` |
| updated_at | TIMESTAMPTZ | No | `now()` |
| created_by | UUID | Yes | — |
| updated_by | UUID | Yes | — |

**Primary Key**: `id`. **Foreign Keys**: `category_id` → `uom_categories.id` (`ON DELETE RESTRICT`
if populated — the column itself is confirmed optional per **ADR-192**/UOM-FX-OQ-001, not a
Non-blocking open item any longer); `created_by`/`updated_by` → `users.id`. **Indexes**: unique on
`name` where `is_deleted = false`. **Constraints**: `name` NOT NULL.

## uom_functional_roles

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | UUID | No | `gen_random_uuid()` |
| name | VARCHAR(255) | No | — |
| sort_order | INTEGER | Yes | — |
| is_deleted | BOOLEAN | No | `false` |
| deleted_at | TIMESTAMPTZ | Yes | — |
| created_at | TIMESTAMPTZ | No | `now()` |
| updated_at | TIMESTAMPTZ | No | `now()` |
| created_by | UUID | Yes | — |
| updated_by | UUID | Yes | — |

**Primary Key**: `id`. **Foreign Keys**: `created_by`/`updated_by` → `users.id`. **Indexes**: unique
on `name` where `is_deleted = false`. **Constraints**: `name` NOT NULL. Seed data: the eleven
legacy-derived role names (Selling, Pricing, Stocking, Physical Inventory, Picking, Purchase,
Purchase-Cost, Receiving, Reporting, Inner-Pack, Outer-Pack) as an initial starter set (ADR-094).

## uom_groups

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | UUID | No | `gen_random_uuid()` |
| name | VARCHAR(255) | No | — |
| category_id | UUID | Yes | — |
| base_type_id | UUID | **No** | — |
| is_deleted | BOOLEAN | No | `false` |
| deleted_at | TIMESTAMPTZ | Yes | — |
| created_at | TIMESTAMPTZ | No | `now()` |
| updated_at | TIMESTAMPTZ | No | `now()` |
| created_by | UUID | Yes | — |
| updated_by | UUID | Yes | — |

> **Removed column — `uses_picking_hierarchy` (ADR-192 / UOM-FX-OQ-005)**: this table previously
> carried a stored `BOOLEAN` column here. It is removed — "Uses Picking Hierarchy" is now a
> **computed** value at the query/service layer, not persisted. See §9's "Computed Picking-Hierarchy
> Indicator" note for the conceptual query.

**Primary Key**: `id`. **Foreign Keys**: `category_id` → `uom_categories.id` (`ON DELETE RESTRICT`);
`base_type_id` → `uom_types.id` (`ON DELETE RESTRICT`, NOT NULL per BR-002); `created_by`/
`updated_by` → `users.id`. **Indexes**: unique **functional** index on `lower(name)` where
`is_deleted = false` (**not** a plain unique constraint on the raw `name` column — Group Name
uniqueness is case-insensitive per BR-001/ADR-191, so the index must normalize case; e.g.
`CREATE UNIQUE INDEX ON uom_groups (lower(name)) WHERE is_deleted = false`). **Constraints**:
`base_type_id` NOT NULL (BR-002).

## uom_role_assignments

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | UUID | No | `gen_random_uuid()` |
| group_id | UUID | No | — |
| role_id | UUID | No | — |
| type_id | UUID | No | — |
| created_at | TIMESTAMPTZ | No | `now()` |
| updated_at | TIMESTAMPTZ | No | `now()` |
| created_by | UUID | Yes | — |
| updated_by | UUID | Yes | — |

**Primary Key**: `id`. **Foreign Keys**: `group_id` → `uom_groups.id` (`ON DELETE CASCADE` — a pure
child of the Group, per `module-field-extraction/uom/workflow.md`); `role_id` →
`uom_functional_roles.id` (`ON DELETE RESTRICT`); `type_id` → `uom_types.id` (`ON DELETE RESTRICT`).
**Indexes**: unique on (`group_id`, `role_id`) (BR-011).

## uom_conversion_factors

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | UUID | No | `gen_random_uuid()` |
| group_id | UUID | No | — |
| type_id | UUID | No | — |
| units_per_base | DECIMAL(18,4) | No | — |
| created_at | TIMESTAMPTZ | No | `now()` |
| updated_at | TIMESTAMPTZ | No | `now()` |
| created_by | UUID | Yes | — |
| updated_by | UUID | Yes | — |

**Primary Key**: `id`. **Foreign Keys**: `group_id` → `uom_groups.id` (`ON DELETE CASCADE`);
`type_id` → `uom_types.id` (`ON DELETE RESTRICT`). **Indexes**: unique on (`group_id`, `type_id`)
(BR-006). **Constraints**: `units_per_base > 0` AND `units_per_base` is a whole number (`CHECK
(units_per_base = FLOOR(units_per_base))`) — BR-003/BR-004.

## uom_type_factor_history

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | UUID | No | `gen_random_uuid()` |
| group_id | UUID | No | — |
| type_id | UUID | No | — |
| rate | DECIMAL(18,4) | No | — |
| effective_from | DATE | No | — |
| effective_to | DATE | Yes | — |
| created_at | TIMESTAMPTZ | No | `now()` |

**Primary Key**: `id`. **Foreign Keys**: `group_id` → `uom_groups.id` (`ON DELETE CASCADE`);
`type_id` → `uom_types.id` (`ON DELETE RESTRICT`). **Indexes**: index on (`group_id`, `type_id`,
`effective_from`); partial unique index on (`group_id`, `type_id`) where `effective_to IS NULL`
(at most one "currently effective" row per pair — Inferred, see
`module-field-extraction/uom/entities-and-fields.md` `UOMTypeFactorHistory` field note).
**Constraints**: `effective_to IS NULL OR effective_to >= effective_from`. Append-only — no
`updated_at`/`updated_by` (BR-009, `workflow.md`: "existing rows are never updated or deleted").

## uom_picking_hierarchy

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | UUID | No | `gen_random_uuid()` |
| group_id | UUID | No | — |
| type_id | UUID | No | — |
| sort_order | INTEGER | No | — |
| is_deleted | BOOLEAN | No | `false` |
| deleted_at | TIMESTAMPTZ | Yes | — |
| created_at | TIMESTAMPTZ | No | `now()` |
| updated_at | TIMESTAMPTZ | No | `now()` |
| created_by | UUID | Yes | — |
| updated_by | UUID | Yes | — |

**Primary Key**: `id`. **Foreign Keys**: `group_id` → `uom_groups.id` (`ON DELETE CASCADE`);
`type_id` → `uom_types.id` (`ON DELETE RESTRICT`). **Indexes**: unique on (`group_id`, `type_id`)
and unique on (`group_id`, `sort_order`), both where `is_deleted = false` (BR-012).

---

# 5. Relationships

- **One-to-Many**: Category → Types (`category_id`, optional, confirmed ADR-192) and → Groups;
  Group → Role Assignments, Conversion Factors, Picking Hierarchy rows; Conversion Factor's (Group,
  Type) pair → Factor History rows.
- **One-to-One (enforced by unique constraint, not a schema-level 1:1)**: Group → Base Type
  (`base_type_id` is a single required FK, not a join table — a Group has exactly one Base Type).
- **Many-to-Many (via join table)**: Group ↔ Functional Role, resolved through
  `uom_role_assignments`; Group ↔ Type (as used in any non-Base role or conversion factor), resolved
  through `uom_role_assignments`/`uom_conversion_factors`/`uom_picking_hierarchy` respectively.

---

# 6. Constraints

- **Primary Keys**: UUID on every table (`2-database/4-database-standards.md`).
- **Foreign Keys**: every relationship above is a real, enforced FK — `RESTRICT` on delete for
  `uom_categories`/`uom_types`/`uom_functional_roles` while any dependent row exists (BR-014;
  `uom_functional_roles`' inclusion in this pattern is now **Confirmed** by **ADR-192**, closing what
  was previously an unconfirmed extension of the Type/Category guard);
  `CASCADE` for pure child rows of a Group (`uom_role_assignments`, `uom_conversion_factors`,
  `uom_type_factor_history`, `uom_picking_hierarchy`) — deleting a Group (itself guarded by BR-014
  against Products' own FK, per `open-questions.md` UOM-FX-OQ-006) cascades its own child rows,
  consistent with `workflow.md`'s finding that these are pure children with no independent
  references of their own.
- **Unique Constraints**: `uom_categories.name`, `uom_types.name`, `uom_functional_roles.name`
  (each scoped to `is_deleted = false`); `uom_groups` — a **case-insensitive functional unique
  index on `lower(name)`**, scoped to `is_deleted = false` (BR-001/ADR-191 — a plain unique
  constraint on the raw `name` column would not catch a case-variant duplicate); (`group_id`,
  `role_id`) on `uom_role_assignments`; (`group_id`, `type_id`) on `uom_conversion_factors`;
  (`group_id`, `type_id`) and (`group_id`, `sort_order`) on `uom_picking_hierarchy`; partial unique
  on `uom_type_factor_history` for the "currently effective" row per (group_id, type_id).
- **Check Constraints**: `uom_conversion_factors.units_per_base > 0` and whole-number (BR-003/004);
  `uom_type_factor_history.effective_to >= effective_from` when set.

---

# 7. Index Strategy

- **Performance indexes**: `uom_type_factor_history (group_id, type_id, effective_from)` — supports
  the effective-date lookup (FR-007) without a full table scan.
- **Composite indexes**: all the unique constraints above are themselves composite indexes,
  double-serving lookups (e.g. "all Role Assignments for this Group" benefits from the
  `(group_id, role_id)` unique index).
- **Unique indexes**: see §6.

---

# 8. Cascading Rules

**ON DELETE**:
- `uom_categories`/`uom_types`/`uom_functional_roles` → `RESTRICT` while referenced (BR-014).
- `uom_groups` → child rows (`uom_role_assignments`, `uom_conversion_factors`,
  `uom_type_factor_history`, `uom_picking_hierarchy`) → `CASCADE`.
- `uom_groups` itself → delete is blocked **at the application layer** once the Group has any
  transactional reference (ADR-190 / BR-020 — see §9's "Transaction-Reference Lock Check" below).
  This is stricter than, and independent of, Products' own optional `uom_group_id` FK: a Group with
  zero transactional references but a live Product assignment remains deletable/editable under this
  rule (Products' own FK behavior on that path is Products' schema's own concern, unchanged by
  ADR-190), while a Group with any transactional reference is locked regardless of whether a
  Product still points at it.

**ON UPDATE**: no cascading update behavior applies (UUID primary keys are immutable by convention,
per `2-database/4-database-standards.md`).

---

# 9. Data Integrity

**Referential Integrity**: every FK above is a real, enforced database constraint — closes legacy's
confirmed application-level-only (and partially unescaped) in-use checks (UOM-RISK-002/006) by
construction, per `build-guidance.md`'s recommendation (`module-field-extraction/uom/
business-rules.md` UOM-RULE-014).

**Consistency**: `uom_groups.base_type_id` NOT NULL (BR-002); `uom_conversion_factors.units_per_base`
CHECK constraint (BR-003/004); Group-save-time application-layer validation (BR-019 — every
role-assigned, non-Base Type must have a Conversion Factor row before the Group save transaction
commits; this specific check is a cross-row application-layer validation within the save
transaction, not expressible as a single-table CHECK constraint, since it spans
`uom_role_assignments` and `uom_conversion_factors` together).

**Normalization**: 3NF throughout — this is precisely what replaces legacy's denormalized
eleven-flat-column `lbm_uom_group` shape (ADR-094) and its ambiguous two-column conversion factor
(ADR-096).

**Transaction-Reference Lock Check (ADR-190 / BR-020)**: `uom_groups` cannot be locked purely by a
database-level FK constraint the way `uom_categories`/`uom_types`/`uom_functional_roles` are (§6/§8),
because the referencing rows live in *other modules'* schemas (SalesOrder lines, PurchaseOrder
lines, receiving records, and any other transactional consumer's own `uom_group_id`-bearing table —
not modeled in this document, owned by those modules' own `4-schema.md`). Enforcement is therefore an
**application-layer existence check**, run inside the same transaction as any Group update or delete:
before committing an update that touches a locked field (any `uom_groups` column except `name`), or
any delete of a `uom_groups` row, the write path must query every known transactional-consumer table
for at least one row whose `uom_group_id` equals the target Group's `id`. If any such row exists, the
write is rejected (422/409-class — see `6-validation.md`/`8-api.md`); a Name-only update always
proceeds regardless of this check's result. This check must be kept current as new consuming modules
add their own `uom_group_id`-bearing transaction tables — each such module's own field-extraction/
schema work is expected to register its table with this check, per BR-020/BR-015 (UOM's own service
boundary — the check itself should be exposed as part of UOM's service API, e.g. an
`isGroupLocked(groupId)` call, so consuming modules never need to know this check's own
implementation, only call it before allowing a Group-referencing write of their own where relevant).

**Case-Insensitive Group Name Uniqueness (ADR-191 / BR-001)**: `uom_groups.name` uniqueness must be
enforced case-insensitively — "Test" and "test" collide. This requires a **functional unique index
on `lower(name)`** (scoped to `is_deleted = false`), not a plain unique constraint/index on the raw
`name` column, e.g. `CREATE UNIQUE INDEX uom_groups_name_lower_key ON uom_groups (lower(name)) WHERE
is_deleted = false;`. The application layer must also run this same case-insensitive comparison on
Group **rename**, not only create, since Group Name stays editable indefinitely per ADR-190/BR-020 —
the database index alone enforces the invariant at the storage layer, but the API layer's own
pre-check (`6-validation.md`) should still surface a clean 409/422 rather than relying solely on a
raw constraint-violation error from the index.

**`uom_types.category_id` — resolved, optional (ADR-192)**: `uom_types.category_id` is modeled above
as nullable/optional, not required — this is now a **confirmed developer decision** (ADR-192,
closing UOM-FX-OQ-001), not an open modeling choice. A Type may declare which Category it belongs to
(e.g. "Feet" → "Length") but is never forced to.

**Computed Picking-Hierarchy Indicator (ADR-192 / BR-013)**: "Uses Picking Hierarchy" is not a
`uom_groups` column. It is derived at read time from `uom_picking_hierarchy` row existence for the
Group — conceptually:

```sql
SELECT EXISTS (
  SELECT 1 FROM uom_picking_hierarchy
  WHERE group_id = :group_id AND is_deleted = false
) AS uses_picking_hierarchy;
```

or, when resolving it alongside other Group fields in an API/service read, an `EXISTS` subquery or a
`COUNT(...) > 0` aggregate joined into the Group projection — either is acceptable at the
implementation layer; no column, no write path, and no separate consistency check is needed, since
the value can never disagree with row presence by construction.

**Functional Role delete guard — confirmed (ADR-192 / BR-014)**: `uom_role_assignments.role_id` →
`uom_functional_roles.id` was already modeled with `ON DELETE RESTRICT` above (§4); ADR-192 confirms
this is the intended, developer-approved behavior — not merely this document's own extension of the
Type/Category pattern. A `UOMFunctionalRole` still referenced by any `UOMRoleAssignment` row cannot
be deleted.

---

# 10. Migration Notes

**Versioning**: standard Prisma migration, additive-only for this module's first migration (no prior
UOM schema exists in the rewrite's own database — legacy's tables are a separate system, not
migrated in place per this project's fresh-rewrite approach, `open-questions.md` UOM-OQ-003
disposition).

**Backward compatibility**: n/a for the initial migration. Future changes to
`uom_functional_roles`' seed data (ADR-094's freely-admin-manageable model) must not break existing
`uom_role_assignments` rows — renaming a role is safe (FK by `id`), deleting one in use is blocked
by BR-014.

---

# 11. Related Documents

Data Dictionary: `5-data-dictionary.md` · Validation: `6-validation.md` · Business Rules:
`3-business-rules.md` · API: `8-api.md`

---

# Revision History

| Date | Change |
|---|---|
| 2026-08-18 | Initial draft. |
| 2026-08-18 | Amendment (ADR-190): added the Transaction-Reference Lock Check (§9) and updated §8's `uom_groups` delete-cascade note for BR-020's Group-level immutability/delete lock. |
| 2026-08-18 | Amendment (ADR-191): changed `uom_groups.name`'s unique index to a case-insensitive functional index on `lower(name)` (§4, §6) and added the Case-Insensitive Group Name Uniqueness note (§9) covering both create and rename. |
| 2026-08-18 | Amendment (ADR-192): confirmed `uom_types.category_id` as a resolved optional FK (§2–4, §9); removed `uom_groups.uses_picking_hierarchy` as a stored column, replaced with a computed-value note and conceptual query (§2, §4, §9); confirmed the `uom_functional_roles` in-use `RESTRICT` guard as developer-approved, not an unconfirmed extension (§6, §9). |

---

# Approval

Pending review per `4-document-review/1-document-review.md`.

---

# AI Generation Notes

Drafted from `module-field-extraction/uom/entities-and-fields.md` (post-amendment) and
`2-database/4-database-standards.md`. Every table/column/constraint traces to a specific field,
UOM-RULE, or ADR cited in this document's body. `uom_types.category_id` is modeled as optional per
ADR-192's confirmed resolution of UOM-FX-OQ-001.

**Amendment (ADR-190)**: the Transaction-Reference Lock Check in §9 and the corresponding §8 note
were added after this document's original review/approval pass, to transcribe ADR-190 (BR-020). This
is a targeted amendment, not a re-review of the rest of the document.

**Amendment (ADR-191)**: `uom_groups`' name-uniqueness index (§4, §6) was changed from a plain unique
constraint to a case-insensitive functional index on `lower(name)`, and the Case-Insensitive Group
Name Uniqueness note (§9) was added, to transcribe ADR-191 (BR-001). This is a targeted amendment,
not a re-review of the rest of the document.

**Amendment (ADR-192)**: `uom_types.category_id`'s "Known Gap" framing (§9) was replaced with a
resolved-decision note; `uom_groups.uses_picking_hierarchy` was removed as a stored column (§2, §4)
and replaced with a computed-value note and conceptual query (§9); the `uom_functional_roles`
in-use `RESTRICT` guard (already present in the table definitions, §4) was confirmed as
developer-approved rather than an unconfirmed extension (§6, §9). This is a targeted amendment, not
a re-review of the rest of the document.
