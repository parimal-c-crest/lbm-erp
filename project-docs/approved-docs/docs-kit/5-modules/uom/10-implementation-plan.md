# Implementation Plan — UOM

> **Purpose**
>
> Converts UOM's approved module specification into an executable development plan. Living document
> — updated as implementation progresses.

---

# Module

UOM (Unit of Measure)

---

# Status

Planning

---

# Dependencies

Schema: `4-schema.md` · API: `8-api.md` · Permissions: `7-permissions.md` · Validation:
`6-validation.md`

No cross-module Backend/API dependency blocks UOM within M3 (Users, Location, Products, UOM are
scheduled together with no dependency among themselves — `plan/dependencies.md`). UOM's own
UI-Design epic must precede its Backend/API epic (`UI_UOM --> BE_UOM`, same file).

---

# Task Breakdown

## Phase 1

Database

- Create migration for `uom_categories`, `uom_types`, `uom_functional_roles`, `uom_groups`,
  `uom_role_assignments`, `uom_conversion_factors`, `uom_type_factor_history`,
  `uom_picking_hierarchy` (`4-schema.md` §4).
- Create indexes: all unique constraints in `4-schema.md` §6, plus the
  `uom_type_factor_history (group_id, type_id, effective_from)` performance index (§7).
- Seed data: `uom_functional_roles` starter set (`5-data-dictionary.md` §5).

---

## Phase 2

Backend

- Models: Prisma schema entries for all 8 tables.
- Services: `UomCategoryService`, `UomTypeService`, `UomFunctionalRoleService`, `UomGroupService`
  (owns the atomic Group+RoleAssignments+ConversionFactors save and BR-019's completeness
  validation), `UomConversionService` (base-unit-pivot arithmetic, BR-007/008), `UomHistoryService`
  (BR-009's history-write-on-change and effective-date lookup).
- Controllers: one per resource group per `8-api.md` §3.
- Policies/Guards: `RolesGuard` (Admin-only on write endpoints, per `7-permissions.md` §8);
  authenticated-only on the conversion/pick-breakdown read endpoints.
- Cross-cutting: implement BR-014's delete guards as real Prisma/PostgreSQL `RESTRICT` FKs (not
  application pre-checks alone); implement BR-016's Type-delete → Pricing-override-delete cascade as
  a service-layer call into Pricing's own delete API (never a direct table write into Pricing's
  schema — ADR-053's exclusivity principle applies symmetrically).

---

## Phase 3

Frontend

- Category/Type/Functional Role List+Dialog screens (`9-ui.md` §4).
- Group List screen.
- Group Detail/Edit screen — the highest-complexity frontend task in this module, given the atomic
  multi-section save and BR-019's inline completeness indicator (`9-ui.md` §4 Group Detail/Edit).
- Conversion Factor History panel.
- Import/Export dialog wiring (reusing the shared project-wide import/export component, FR-011).

---

## Phase 4

Testing

Unit Tests — one per `BR-###`/`VR-###` (`11-testing.md` §9).

Integration Tests — Group save atomicity (including BR-019's rejection path); delete-guard
`RESTRICT` behavior; conversion arithmetic golden-output tests (closing legacy's UOM-RISK-003 drift
risk by construction, verified by test).

UI Tests — Group Detail's inline completeness indicator and consolidated error banner; Picking
Hierarchy drag-reorder (keyboard-accessible per §9 Accessibility).

---

## Phase 5

Documentation

API — OpenAPI spec generation from NestJS decorators (`3-api/`'s standard pipeline), no manual step
beyond what `8-api.md` already specifies.

Release Notes — not applicable at this stage (pre-release).

---

# Checklist

- [ ] Schema (`4-schema.md`) migrated
- [ ] Validation (`6-validation.md`) implemented, VR-001 through VR-017
- [ ] API (`8-api.md`) implemented, all endpoints
- [ ] UI (`9-ui.md`) implemented, all screens
- [ ] Tests (`11-testing.md`) passing, one per BR-### at minimum

---

# Risks

Carried from `1-module.md` §16 / `module-field-extraction/uom/open-questions.md`: the Non-blocking
open items (UOM-FX-OQ-001, 004, 005, 006, 007, 008) should be resolved or explicitly deferred with a
stated default before or during this implementation, not discovered mid-build. None are expected to
require a schema rework if resolved differently than this document's stated defaults, **except**
UOM-FX-OQ-001 (`UOMType.category_id`) — adding that column later is additive and low-risk, so this
is not a blocking implementation risk either.

---

# AI Generation Notes

Task breakdown maps directly onto `4-schema.md`, `8-api.md`, `9-ui.md`, and `11-testing.md` — no
task was invented without a corresponding spec section. Phase 2's cross-cutting bullet on BR-016
explicitly calls out that the Pricing-cascade must go through Pricing's own API, not a direct write,
since ADR-053's "exclusive service" principle logically applies to every module's own data the same
way it applies to UOM's.
