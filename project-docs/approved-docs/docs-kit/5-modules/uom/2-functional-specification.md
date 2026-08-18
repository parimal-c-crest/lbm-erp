# Functional Specification — UOM

> **Purpose**
>
> This document translates UOM's approved business requirements (`1-module.md`,
> `module-field-extraction/uom/*`) into detailed system behavior.

---

# Document Information

| Field | Value |
|--------|-------|
| Module | UOM |
| Version | 1.0 |
| Status | Draft |

---

# 1. Overview

**Purpose**: define UOM's system behavior precisely enough to implement without re-reading the
legacy source.

**Scope**: Category/Type/Functional Role/Group/Role Assignment/Conversion Factor/Factor History/
Picking Hierarchy CRUD; the conversion query; the pick-breakdown query.

**References to Module Specification**: `1-module.md` §3 (Module Overview), §6 (Functional
Requirements FR-001 through FR-011).

---

# 2. Functional Scope

**Implemented Features**: all of FR-001 through FR-011 (`1-module.md` §6).

**Excluded Features**: legacy's "Manage UOM Qty Pricing" write-back screen (superseded by Pricing's
live resolution, ADR-029 — see `1-module.md` §3 Out of scope); the Orgill vendor-catalog reference
listing (`lbm_orgill_uom`, unrelated table).

**Dependencies**: none inbound within M3; see `1-module.md` §11 for the full outbound consumer list.

---

# 3. Feature Specifications

## FR-001 — Manage UOM Category

### Description
Create, rename, and soft-delete a UOM Category. [Source: `module-field-extraction/uom/
entities-and-fields.md` `UOMCategory`]

### Trigger
Administrator action on the Category management screen (`9-ui.md` §4).

### Preconditions
Administrator is authenticated and authorized (UOM-RULE-017).

### Main Flow
1. Administrator submits Category name (+ optional sort order).
2. System validates required fields.
3. System persists the Category.

### Alternate Flow
Administrator renames an existing Category — same validation, updates in place.

### Exception Flow
Administrator attempts to delete a Category referenced by an active `UOMGroup.category_id` — delete
rejected (UOM-RULE-014, database `RESTRICT`).

### Post Conditions
Category is available for `UOMGroup.category_id` assignment.

---

## FR-002 — Manage UOM Type

### Description
Create, rename, and soft-delete a UOM Type. [Source: `module-field-extraction/uom/
entities-and-fields.md` `UOMType`]

### Trigger
Administrator action on the Type management screen.

### Preconditions
Authenticated, authorized (UOM-RULE-017).

### Main Flow
1. Administrator submits Type name (+ optional sort order).
2. System validates and persists.

### Alternate Flow
Rename — same validation, updates in place.

### Exception Flow
Delete attempted while the Type is referenced by any `UOMGroup.base_type_id`, `UOMRoleAssignment`,
`UOMConversionFactor`, or `UOMPickingHierarchy` row — rejected (UOM-RULE-014).

### Post Conditions
Type is available for Role Assignment, Conversion Factor, and Picking Hierarchy use.

---

## FR-003 — Manage UOM Functional Role

### Description
Create, rename, and soft-delete a UOM Functional Role — freely admin-manageable, not a fixed set of
exactly eleven (ADR-094). [Source: `module-field-extraction/uom/entities-and-fields.md`
`UOMFunctionalRole`]

### Trigger
Administrator action on the Functional Role management screen.

### Preconditions
Authenticated, authorized.

### Main Flow
1. Administrator submits Role name (+ optional sort order).
2. System validates and persists.

### Alternate Flow
Rename.

### Exception Flow
Delete attempted while referenced by any `UOMRoleAssignment.role_id` — rejected. [`open-questions.md`
UOM-FX-OQ-007 — this guard is an extension of UOM-RULE-014's pattern, Non-blocking, not an
independently-sourced legacy rule since this entity has no legacy precedent.]

### Post Conditions
Role is available for Role Assignment.

---

## FR-004 — Manage UOM Group

### Description
Create/update/soft-delete a UOM Group, including its required Base Type. [Source: UOM-RULE-002,
UOM-RULE-003]

### Trigger
Administrator action on the Group management screen (the central UOM screen, per legacy's
`screens-and-user-flows.md`).

### Preconditions
Authenticated, authorized. Base Type must already exist as a `UOMType`.

### Main Flow
1. Administrator names the Group, optionally assigns a Category.
2. Administrator assigns the Base Type (required — UOM-RULE-002).
3. System validates the Base Type is consistent with UOM-RULE-003's smallest-unit intent (see
   `3-business-rules.md` UOM-RULE-003 for the Confidence note on the exact enforcement mechanism).
4. System persists the Group. (Whether the Group "uses" a picking hierarchy is computed from
   Picking Hierarchy row existence, not a field the administrator sets here — ADR-192/BR-013.)

### Alternate Flow
Update an existing Group — name, Category, Base Type, or picking-hierarchy flag change; Base Type
change is only permitted if no existing Conversion Factor row would become inconsistent (see Open
Questions).

### Exception Flow
- Duplicate Group name — rejected (UOM-RULE-001).
- No Base Type assigned — rejected (UOM-RULE-002).
- Delete attempted on a Group referenced by any transaction — rejected, no exception (BR-020,
  ADR-190, `open-questions.md` UOM-FX-OQ-006, Resolved).
- Delete attempted while `Products.uom_group_id` references this Group but the Group has never been
  transaction-referenced — still rejected under the same guard pattern, owned jointly with Products'
  own FK.

### Post Conditions
Group is available for Role Assignment, Conversion Factor, and Picking Hierarchy configuration, and
(via Products) assignable to a product.

---

## FR-005 — Manage Role Assignments for a Group

### Description
Assign which UOM Type fulfills which Functional Role for a Group — one row per (Group, Role) pair
(UOM-RULE-011), normalizing legacy's eleven flat FK columns (ADR-094).

### Trigger
Administrator edits a Group's role-assignment section.

### Preconditions
Group and target Type both exist.

### Main Flow
1. Administrator selects a Functional Role and a Type for the Group.
2. System validates uniqueness (one Type per Role per Group — UOM-RULE-011).
3. System persists the assignment as part of the Group save (see FR-006 — this is where
   UOM-RULE-019's completeness check runs).

### Alternate Flow
Reassign an existing Role to a different Type.

### Exception Flow
Two Types submitted for the same Role in one save — rejected (UOM-RULE-011).

### Post Conditions
Consuming modules can resolve this Role's Type via UOM's service (ADR-053).

---

## FR-006 — Manage Conversion Factors for a Group (with save-time completeness validation)

### Description
Define the whole-number-or-greater conversion factor (`units_per_base`) between a non-Base Type and
the Group's Base Type (UOM-RULE-004). At Group-save time, the system validates that every
role-assigned, non-Base Type already has a Conversion Factor — rejecting the save otherwise
(UOM-RULE-019, resolving what was originally Blocking open question UOM-FX-OQ-003).

### Trigger
Administrator edits a Group's conversion-factor section, or saves the Group after changing Role
Assignments.

### Preconditions
Group and target (non-Base) Type both exist.

### Main Flow
1. Administrator enters `units_per_base` for a (Group, Type) pair.
2. System validates the value is a positive whole number (UOM-RULE-003/004).
3. On Group save, system checks every role-assigned, non-Base Type has a Conversion Factor row
   (submitted in this save or already existing) — UOM-RULE-019.
4. If a prior Conversion Factor value existed and changed, system writes a `UOMTypeFactorHistory`
   row for the outgoing rate (UOM-RULE-009).
5. System persists the Group, Role Assignments, and Conversion Factors together, atomically.

### Alternate Flow
Update an existing factor's value — triggers step 4 above.

### Exception Flow
- Any role-assigned, non-Base Type has no Conversion Factor at save time — **entire Group save
  rejected**, naming the Type/Role that's missing a factor (UOM-RULE-019).
- Duplicate Conversion Factor row for the same (Group, Type) — rejected (UOM-RULE-006).
- Non-whole-number or non-positive value submitted — rejected (UOM-RULE-004).

### Post Conditions
Every Type reachable through this Group's Role Assignments has a usable conversion factor — the
conversion service can never encounter a role-assigned Type with no factor (this is the structural
guarantee UOM-RULE-019 exists to provide).

---

## FR-007 — View Conversion-Factor History

### Description
Read the effective-dated history of a (Group, Type) pair's conversion factor. [Source: ADR-096
Amendment; `module-field-extraction/uom/entities-and-fields.md` `UOMTypeFactorHistory`]

### Trigger
A consuming module (typically SalesHistory, or SalesOrder/PurchaseOrder displaying a historical
line) requests the rate effective on a specific date; or an administrator views a Group's factor
history for audit purposes.

### Preconditions
At least one history row exists for the (Group, Type) pair (written automatically whenever a factor
changes — UOM-RULE-009).

### Main Flow
1. Caller requests the effective rate for (Group, Type, as-of-date).
2. System looks up the `UOMTypeFactorHistory` row whose effective range covers that date.
3. System returns the rate.

### Alternate Flow
No `as-of-date` given — system returns the current `UOMConversionFactor.units_per_base` directly
(no history lookup needed for "now").

### Exception Flow
No history row covers the requested date (e.g. a date before the Group/factor existed) — returns a
clear "no effective rate for this date" error, not a silent default.

### Post Conditions
None (read-only).

---

## FR-008 — Manage Picking Hierarchy for a Group

### Description
Define the ordered sequence of Types used to break a pick quantity into whole units, per Group.
[Source: `module-field-extraction/uom/entities-and-fields.md` `UOMPickingHierarchy`]

### Trigger
Administrator edits a Group's picking-hierarchy section (always available; the "uses picking
hierarchy" indicator is computed from row existence, not a gate on whether the section is shown —
ADR-192/BR-013).

### Preconditions
Group exists; Types being sequenced already exist and are reachable through the Group (Role
Assignment or Conversion Factor).

### Main Flow
1. Administrator adds Types to the sequence, in order.
2. System validates uniqueness: one row per (Group, Type) and one per (Group, Sort Order)
   (UOM-RULE-012).
3. System persists.

### Alternate Flow
Reorder existing rows.

### Exception Flow
Duplicate Type or duplicate sort position within the same Group — rejected (UOM-RULE-012).

### Post Conditions
SalesOrder's WMS allocation (and any other pick-breakdown consumer) can request the full ordered
sequence in one call (FR-010).

---

## FR-009 — Resolve a Conversion

### Description
The canonical conversion query — base_to_uom / uom_to_base, qty or price, base-unit-pivot
(UOM-RULE-008), always fractional (UOM-RULE-007). [Source: `module-field-extraction/uom/
business-rules.md` UOM-RULE-007/008]

### Trigger
Any consuming module needs to convert a value between a Group's Base unit and another unit in that
Group.

### Preconditions
The target Type has a Conversion Factor for the Group (guaranteed reachable-Types always do, per
UOM-RULE-019) or is the Base Type itself (implicit factor of 1).

### Main Flow
1. Caller specifies Group, Type, direction (base_to_uom / uom_to_base), kind (qty / price), value.
2. System looks up the Conversion Factor (or Base-Type implicit 1).
3. System applies the base-unit-pivot formula, no whole-number rounding (UOM-RULE-007/008).
4. System returns the converted value.

### Alternate Flow
Caller requests the rate effective on a past date instead of the current rate — delegates to FR-007.

### Exception Flow
Type not reachable through the Group at all (no Role Assignment, no Conversion Factor, not Base) —
rejected with a clear error. This is a different situation from "missing factor," which UOM-RULE-019
prevents; this is "the caller asked about a Type this Group doesn't use at all."

### Post Conditions
None (read-only / computed).

---

## FR-010 — Resolve a Pick-Unit Breakdown

### Description
Return a Group's full ordered picking-hierarchy sequence in one call — the replacement for legacy's
direct three-table join in `wmsSalesOrderAllocation.php:1312-1321` (`build-guidance.md`).

### Trigger
A consuming module (SalesOrder's WMS allocation, StoreTransfer's pick/pack flow) needs to break a
pick quantity into whole units.

### Preconditions
At least one `UOMPickingHierarchy` row exists for the Group (the "uses picking hierarchy" state is
computed from this, not a separate precondition to check — ADR-192/BR-013).

### Main Flow
1. Caller requests the breakdown sequence for a Group.
2. System returns the ordered (Type, sort_order, conversion factor) tuples in one response, or an
   empty sequence if the Group has no picking-hierarchy rows.

### Exception Flow
None — an empty row set is a valid, unambiguous state (no computed flag to drift out of sync with
row presence, per ADR-192's resolution of BR-013/UOM-FX-OQ-005).

### Post Conditions
None (read-only).

---

## FR-011 — Import/Export UOM Group Bulk Data

### Description
Generalized project-wide import/export capability (ADR-098), applied to UOM Group data.

### Trigger
Administrator initiates a bulk import/export from the Group listview.

### Preconditions
Authenticated, authorized.

### Main Flow
Follows the project's standard background-job import/export pattern (same mechanism used by every
other module with bulk/tabular data) — no UOM-specific import/export logic beyond validating each
row against UOM-RULE-001 through 019 the same way an interactive save would.

### Exception Flow
Any row failing Group-save validation (e.g. UOM-RULE-019's completeness check) is rejected/flagged
per the standard import job's row-level error reporting, not silently skipped.

### Post Conditions
Imported Groups are fully valid per every UOM-RULE — no bulk-import bypass of save-time validation.

---

# 4. Business Process Flow

See `module-field-extraction/uom/workflow.md` for the full state diagram and Group-setup sequencing.
Summary: Category/Type/Role creation (independent) → Group creation (Base Type required) → Role
Assignment → Conversion Factor (validated complete at Group save) → optional Picking Hierarchy →
consumption by other modules via the conversion/pick-breakdown queries.

---

# 5. System Behavior

**Create**: Category, Type, Functional Role, Group (+ Role Assignments + Conversion Factors
together), Picking Hierarchy rows.

**Update**: same entities; Group update re-runs UOM-RULE-019's completeness validation whenever Role
Assignments or Conversion Factors change as part of that save.

**Delete**: soft-delete for Category/Type/Functional Role/Group, guarded by database `RESTRICT`
in-use constraints (UOM-RULE-014); hard delete for Role Assignment/Conversion Factor/Picking
Hierarchy rows (pure child records, no independent references — `workflow.md` in
`module-field-extraction/uom/`).

**Search**: standard listview search/filter on Category/Type/Group name (per `9-ui.md`).

**Import**: FR-011.

**Export**: FR-011.

**Notifications**: none UOM-specific.

**Background Jobs**: bulk import/export only (FR-011), via the project's standard job pattern.

---

# 6. Data Processing

**Inputs**: administrator-entered Category/Type/Role/Group/factor/hierarchy data; consuming-module
conversion requests (Group, Type, direction, kind, value).

**Transformations**: base-unit-pivot conversion arithmetic (UOM-RULE-008); factor-history lookup by
effective date (FR-007).

**Outputs**: converted values (qty/price); role-assignment resolutions; pick-breakdown sequences —
all consumed by other modules, never rendered as a UOM-owned document/export (per legacy's own
`outputs.md` finding: "UOM produces no PDF, CSV export, or formal document output specific to its
own domain" beyond the two interactive management screens and, now, FR-011's bulk import/export).

---

# 7. Integrations

**External APIs**: none confirmed. [Source: `sot-docs/raw/2-module-specs/UOM/integrations.md`
§External Systems]

**Queues**: bulk import/export background job only (ADR-098's standard pattern).

**Email / SMS**: none.

**Third-party Services**: none.

---

# 8. Error Handling

**Validation Errors**: field-level (required Base Type, positive whole-number factor, unique names)
— see `6-validation.md`.

**Business Errors**: Group-save completeness rejection (UOM-RULE-019); delete-in-use rejection
(UOM-RULE-014); duplicate-name rejection (UOM-RULE-001); duplicate role-assignment/factor/
picking-hierarchy rejection (UOM-RULE-006/011/012).

**System Errors**: standard project-wide 5xx handling (`3-api/6-error-handling.md`) — no UOM-specific
system-error behavior identified.

**Recovery**: Group save is atomic (Group + Role Assignments + Conversion Factors persist together
or not at all) — no partial-save recovery state to reconcile.

---

# 9. Performance Requirements

**Maximum response time**: not itemized UOM-specifically in any SoT source; follows project-wide API
standard (`3-api/`).

**Maximum records**: none itemized; UOM's own entity counts are small (Categories/Types/Roles/Groups
are admin-managed reference data, not high-volume transactional data).

**Concurrency**: Group save is the module's own single-writer-per-Group concern; no cross-module
concurrency conflict exists in the rewrite (the two-write-direction pricing conflict, UOM-RISK-004,
is structurally resolved — see `1-module.md` §16).

**Caching**: none required by design — conversions are resolved live, matching the project-wide
"never pre-materialize a derived price" principle from ADR-029's pricing block, applied here to
conversions as well (no `lbm_applied_uom_pricing`-style cache is carried forward).

---

# 10. Security Requirements

**Authentication**: standard project-wide JWT (access+refresh) / API-key pattern (`3-api/
2-authentication.md`) — no UOM-specific exception.

**Authorization**: real server-side Guard on every write endpoint (UOM-RULE-017) — see
`7-permissions.md`.

**Audit**: standard audit columns (`created_by`/`updated_by`/`created_at`/`updated_at`) on every
UOM entity (`module-field-extraction/uom/entities-and-fields.md`).

**Encryption**: none UOM-specific — no sensitive/credential data in this module's own entities.

---

# 11. Edge Cases

**Duplicate Data**: duplicate Group name (UOM-RULE-001); duplicate Role Assignment
(UOM-RULE-011); duplicate Conversion Factor (UOM-RULE-006); duplicate Picking Hierarchy row
(UOM-RULE-012) — all rejected at save time.

**Timeouts**: not UOM-specific; project-wide standard applies.

**Network Failure**: not UOM-specific; project-wide standard applies.

**Concurrent Updates**: two administrators editing the same Group simultaneously — standard
optimistic-concurrency handling per project-wide convention (no UOM-specific mechanism beyond that
identified in any source).

**Large Data**: not a UOM-specific concern (reference-data volumes are small); the pick-breakdown
query (FR-010) is explicitly designed as a single batched call to avoid an N-query pattern under
load (`build-guidance.md`).

---

# 12. Assumptions

See `1-module.md` §14 (not restated here — same list applies).

---

# 13. Constraints

See `1-module.md` §15 (not restated here — same list applies).

---

# 14. Traceability

| Requirement | Feature |
|---|---|
| FR-001 | UOM Category CRUD |
| FR-002 | UOM Type CRUD |
| FR-003 | UOM Functional Role CRUD |
| FR-004 | UOM Group CRUD |
| FR-005 | Role Assignment management |
| FR-006 | Conversion Factor management + save-time completeness validation |
| FR-007 | Conversion-Factor history read |
| FR-008 | Picking Hierarchy management |
| FR-009 | Conversion resolution query |
| FR-010 | Pick-breakdown query |
| FR-011 | Bulk import/export |

---

# 15. Related Documents

Module: `1-module.md` · Schema: `4-schema.md` · Validation: `6-validation.md` · API: `8-api.md` ·
UI: `9-ui.md` · Permissions: `7-permissions.md` · Testing: `11-testing.md`

---

# AI Generation Notes

Drafted from `module-field-extraction/uom/*` (all four files, post-amendment) and `decisions-log.md`
(ADR-029, 040, 053, 056, 094–098, 161, ADR-096 Amendment). Every feature spec traces to a specific
UOM-RULE ID, field, or ADR — no invented behavior. FR-007's "no history row covers this date" and
FR-010's Group-flag/row-presence exception both surface pre-existing Non-blocking open items
(`open-questions.md` UOM-RULE-013) rather than resolving them silently.
