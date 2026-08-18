# Module Testing — UOM

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

**Purpose**: complete test specification for UOM, traceable from `3-business-rules.md`'s BR-###
catalog and `6-validation.md`'s VR-### catalog to executable test cases.

**Scope**: all UOM entities, the conversion service, and the pick-breakdown query.

**References**: `1-module.md`, `3-business-rules.md`, `4-schema.md`, `6-validation.md`, `8-api.md`,
`9-ui.md`, project `6-development/` Testing Strategy.

---

# 2. Test Scope

**Included Features**: FR-001 through FR-011 (`2-functional-specification.md` §14 Traceability).

**Excluded Features**: legacy's "Manage UOM Qty Pricing" write-back behavior and the Orgill
reference listing — not carried forward (`1-module.md` §3).

**Dependencies**: Products (for the `uom_group_id` FK-orphaning test, TC-020 below), Pricing (for
the Type-delete cascade test, TC-016).

**Cross-Module Data Flow**:

| This module... | Field | Producing/Consuming Module | Test |
|---|---|---|---|
| Consumes | `Products.uom_group_id` (to know whether a Group is "in use" for delete-guard purposes) | Products (producer) | TC-020 |
| Produces | `UOMGroup.base_type_id`, `UOMRoleAssignment.type_id`, `UOMConversionFactor.units_per_base` | SalesOrder, PurchaseOrder (consumers, via `POST /uom/conversions/resolve`) | TC-021 |
| Produces | `UOMPickingHierarchy` ordered sequence | SalesOrder's WMS allocation (consumer, via `GET /uom/groups/{id}/pick-breakdown`) | TC-022 |
| Produces | `UOMTypeFactorHistory` effective-dated rate | SalesHistory (consumer, via the history endpoint) | TC-023 |
| Consumes/Triggers | Pricing fixed-price-override deletion | Pricing (consumer of UOM's Type-delete event) | TC-016 |

Each row above has at least one test below (Functional Tests §4 or Regression Checklist §13) that
exercises the real chain end-to-end — creating the data in the producing module and confirming it's
usable in the consuming module — not just each module's own isolated tests.

---

# 3. Traceability Matrix

| Requirement | Business Rule | Validation | Permission | Test Case |
|-------------|---------------|------------|------------|-----------|
| FR-001 | BR-010, BR-014 | VR-001, VR-015 | Admin-only | TC-001, TC-002 |
| FR-002 | BR-010, BR-014, BR-016 | VR-001, VR-015 | Admin-only | TC-003, TC-016, TC-032, TC-033 |
| FR-003 | BR-010, BR-014 | VR-001, VR-015, VR-020 | Admin-only | TC-004, TC-035, TC-036 |
| FR-004 | BR-001, BR-002, BR-003, BR-020 | VR-001, VR-003, VR-011, VR-018, VR-019 | Admin-only | TC-005, TC-006, TC-007, TC-024, TC-025, TC-026, TC-027, TC-028, TC-029, TC-030, TC-031 |
| FR-005 | BR-011, BR-020, BR-021 | VR-008, VR-018 | Admin-only | TC-008, TC-024, TC-026, TC-034 |
| FR-006 | BR-004, BR-005, BR-006, BR-019, BR-020 | VR-010, VR-011, VR-018 | Admin-only | TC-009, TC-010, TC-011, TC-024, TC-026 |
| FR-007 | BR-009 | — | Any authenticated | TC-012, TC-023 |
| FR-008 | BR-012, BR-013, BR-020 | VR-014, VR-018 | Admin-only | TC-013, TC-014, TC-024, TC-026 |
| FR-009 | BR-007, BR-008, BR-021 | — | Any authenticated | TC-015, TC-021, TC-034 |
| FR-010 | — | — | Any authenticated | TC-022 |
| FR-011 | BR-019 (via VR-017) | VR-017 | Admin-only | TC-017 |
| — | BR-015 (module boundary) | — | — | TC-018 (architecture-level, see §12) |
| — | BR-017, BR-018 | — | — | TC-019 |

---

# 4. Functional Tests

## TC-001

**Title**: Create a UOM Category

**Requirement**: FR-001

**Preconditions**: authenticated as Admin.

**Steps**: POST `/uom/categories` with a valid name.

**Expected Result**: 201, Category persisted, appears in `GET /uom/categories`.

**Priority**: High.

---

## TC-002

**Title**: Delete a UOM Category referenced by a Group is rejected

**Requirement**: FR-001

**Preconditions**: a Category exists and is referenced by an active `UOMGroup.category_id`.

**Steps**: DELETE `/uom/categories/{id}`.

**Expected Result**: 409, error names the referencing Group; Category remains active (BR-014).

**Priority**: High.

---

## TC-003

**Title**: Create a UOM Type

**Requirement**: FR-002

**Steps**: POST `/uom/types` with a valid name.

**Expected Result**: 201.

**Priority**: High.

---

## TC-004

**Title**: Create a UOM Functional Role

**Requirement**: FR-003

**Steps**: POST `/uom/functional-roles` with a valid name.

**Expected Result**: 201.

**Priority**: Medium.

---

## TC-005

**Title**: Create a UOM Group without a Base Type is rejected

**Requirement**: FR-004

**Steps**: POST `/uom/groups` omitting `baseTypeId`.

**Expected Result**: 400, error names `baseTypeId` as required (BR-002).

**Priority**: High.

---

## TC-006

**Title**: Create a UOM Group with a duplicate name is rejected

**Requirement**: FR-004

**Preconditions**: a Group named "Lumber" already exists.

**Steps**: POST `/uom/groups` with `name: "Lumber"`.

**Expected Result**: 409 (BR-001).

**Priority**: High.

---

## TC-007

**Title**: Create a Conversion Factor with a non-whole-number value is rejected

**Requirement**: FR-004, FR-006

**Steps**: POST `/uom/groups` with a `conversionFactors` entry `unitsPerBase: 2.5`.

**Expected Result**: 400 (BR-003/BR-004).

**Priority**: High.

---

## TC-008

**Title**: Duplicate Role Assignment for the same (Group, Role) is rejected

**Requirement**: FR-005

**Steps**: PATCH `/uom/groups/{id}` submitting two `roleAssignments` entries with the same `roleId`.

**Expected Result**: 400/409 (BR-011).

**Priority**: High.

---

## TC-009

**Title**: Group save succeeds when every role-assigned Type has a factor

**Requirement**: FR-006

**Preconditions**: Group has Base Type = Foot; Role Assignment: Selling → Case.

**Steps**: POST `/uom/groups` including `conversionFactors: [{ typeId: caseId, unitsPerBase: 12 }]`.

**Expected Result**: 201, Group created with the Role Assignment and Conversion Factor both
persisted (BR-019 satisfied).

**Priority**: High.

---

## TC-010

**Title**: Group save is rejected when a role-assigned Type lacks a factor

**Requirement**: FR-006

**Preconditions**: Group has Base Type = Foot; Role Assignment: Selling → Case, submitted with no
`conversionFactors` entry for Case.

**Steps**: POST `/uom/groups`.

**Expected Result**: 409, error names the Selling role and Case type as missing a conversion factor
(BR-019). No partial row (neither the Group, nor the Role Assignment, nor any Conversion Factor) is
persisted — the save is fully atomic.

**Priority**: **Critical** — this is the module's signature validation rule, resolving what was
originally a Blocking open question (UOM-FX-OQ-003).

---

## TC-011

**Title**: Duplicate Conversion Factor for the same (Group, Type) is rejected

**Requirement**: FR-006

**Steps**: PATCH `/uom/groups/{id}` submitting two `conversionFactors` entries for the same `typeId`.

**Expected Result**: 400/409 (BR-006).

**Priority**: Medium.

---

## TC-012

**Title**: Conversion Factor change writes a history row

**Requirement**: FR-007

**Preconditions**: Group+Type has an existing Conversion Factor of 10.

**Steps**: PATCH `/uom/groups/{id}` changing the factor to 12.

**Expected Result**: `UOMTypeFactorHistory` gains a new row for (Group, Type) with `rate: 10`,
`effective_to` set to today; the live `UOMConversionFactor.units_per_base` is now 12 (BR-009).

**Priority**: High.

---

## TC-013

**Title**: Duplicate Picking Hierarchy sort position is rejected

**Requirement**: FR-008

**Steps**: PATCH `/uom/groups/{id}` submitting two `pickingHierarchy` entries with the same
`sortOrder`.

**Expected Result**: 400/409 (BR-012).

**Priority**: Medium.

---

## TC-014

**Title**: "Uses Picking Hierarchy" indicator reflects row add/remove automatically, with no separate
flag write

**Requirement**: FR-008

**Preconditions**: a Group exists with zero `UOMPickingHierarchy` rows.

**Steps**:
1. GET `/uom/groups/{id}` — confirm `usesPickingHierarchy: false`.
2. Add a `UOMPickingHierarchy` row for the Group (e.g. via `PATCH /uom/groups/{id}` with a
   `pickingHierarchy` entry).
3. GET `/uom/groups/{id}` — confirm `usesPickingHierarchy: true`, with no separate write to any flag
   field in step 2's request.
4. Remove that same row.
5. GET `/uom/groups/{id}` — confirm `usesPickingHierarchy: false` again.

**Expected Result**: the indicator always matches current row existence, computed at read time —
there is no independent flag that could ever disagree with it, and no client-supplied
`usesPickingHierarchy` value is ever persisted or required (BR-013, ADR-192, resolving what was
originally an exploratory, Non-blocking, Underspecified test — UOM-FX-OQ-005 — now a confirmed
resolution, not a pin-down-whatever-gets-built test).

**Priority**: High — this is now the module's confirmed behavior, not an exploratory placeholder.

---

## TC-015

**Title**: Base-unit-pivot conversion, qty, base_to_uom

**Requirement**: FR-009

**Preconditions**: Group Base = Each, Type = Case, `unitsPerBase = 12`.

**Steps**: POST `/uom/conversions/resolve` with `{ direction: "base_to_uom", kind: "qty", value: 24
}`.

**Expected Result**: `result: 2` (24 Each ÷ 12 = 2 Case) — fractional-capable, no rounding (BR-007).

**Priority**: Critical.

---

## TC-016

**Title**: UOM Type deletion cascades a Pricing fixed-price-override deletion

**Requirement**: FR-002

**Preconditions**: a UOM Type has a Pricing fixed-price override and is not otherwise referenced by
any UOM Group/Role Assignment/Conversion Factor/Picking Hierarchy row.

**Steps**: DELETE `/uom/types/{id}`.

**Expected Result**: 204, Type soft-deleted; Pricing's fixed-price override for this Type is also
deleted (verified via Pricing's own API, not a direct database check — BR-016). This is the
end-to-end cross-module test named in §2's Cross-Module Data Flow table.

**Priority**: High.

---

## TC-017

**Title**: Bulk import rejects a row that fails Group-save completeness validation

**Requirement**: FR-011

**Steps**: POST `/uom/groups/import` with a CSV row describing a Group whose Selling role points at
a Type with no factor.

**Expected Result**: import job completes with that row flagged as failed, naming BR-019's violation
— not silently skipped, not imported incomplete (VR-017).

**Priority**: High.

---

## TC-024

**Title**: Every field of an unused Group can be edited

**Requirement**: FR-004, FR-005, FR-006, FR-008

**Preconditions**: a Group exists (Base Type, Category, Role Assignments, Conversion Factors,
Picking Hierarchy all set) and has **zero** transactional references.

**Steps**: PATCH `/uom/groups/{id}` changing Name, Category, Base Type (to a Type already covered by
a factor), a Role Assignment's Type, a Conversion Factor's `unitsPerBase`, and reordering the Picking
Hierarchy — all in one request.

**Expected Result**: 200, every submitted field updated as requested (BR-020's lock does not apply —
no transactional reference exists).

**Priority**: High.

---

## TC-025

**Title**: Editing only Name on a used Group succeeds

**Requirement**: FR-004

**Preconditions**: a Group exists and has at least one transactional reference (e.g. a SalesOrder
line references it).

**Steps**: PATCH `/uom/groups/{id}` with body `{ name: "New Name" }` only.

**Expected Result**: 200, `name` updated; every other field unchanged (BR-020's Name exception).

**Priority**: Critical.

---

## TC-026

**Title**: Editing any other field on a used Group is rejected

**Requirement**: FR-004, FR-005, FR-006, FR-008

**Preconditions**: same as TC-025 — a Group with at least one transactional reference.

**Steps**: PATCH `/uom/groups/{id}` with body changing `categoryId` only (repeat variants for Base
Type, a Role Assignment's Type, a Conversion Factor's `unitsPerBase`, and a Picking Hierarchy row —
each its own test run).

**Expected Result**: 409 `GROUP_LOCKED` for every variant; the error names the rejected field(s);
no field is updated, including any fields submitted alongside a `name` change in the same request —
a request that mixes a locked-field change with a Name change is rejected in full, not
partially applied (BR-020).

**Priority**: Critical.

---

## TC-027

**Title**: Deleting a used Group is rejected

**Requirement**: FR-004

**Preconditions**: a Group exists and has at least one transactional reference.

**Steps**: DELETE `/uom/groups/{id}`.

**Expected Result**: 409 `GROUP_LOCKED`; Group remains active and unchanged (BR-020) — this holds
even if the Group is not, or is no longer, referenced by any Product's `uom_group_id` (BR-020's
lock is independent of Product assignment).

**Priority**: Critical.

---

## TC-028

**Title**: Deleting an unused Group still succeeds

**Requirement**: FR-004

**Preconditions**: a Group exists with **zero** transactional references (this must hold whether or
not a Product currently references the Group via `uom_group_id` — BR-020 does not introduce a new
guard on that path).

**Steps**: DELETE `/uom/groups/{id}`.

**Expected Result**: 204, Group soft-deleted — confirms BR-020's lock is scoped to transactional
reference and does not regress the still-valid unused-Group delete path.

**Priority**: High — this is the explicit non-regression case for BR-020's introduction.

---

## TC-029

**Title**: Create a UOM Group with a case-variant duplicate name is rejected

**Requirement**: FR-004

**Preconditions**: a Group named "Lumber" already exists.

**Steps**: POST `/uom/groups` with `name: "LUMBER"` (or any other case variant, e.g. "lumber",
"LuMbEr").

**Expected Result**: 409 `GROUP_NAME_DUPLICATE` (or equivalent) — rejected as a duplicate of
"Lumber" despite the differing case (BR-001/VR-019, ADR-191). This extends TC-006's exact-case
duplicate test to the case-insensitive comparison.

**Priority**: High.

---

## TC-030

**Title**: Rename a UOM Group to a case-variant duplicate of another Group's name is rejected

**Requirement**: FR-004

**Preconditions**: two Groups exist — "Lumber" and "Hardware" — both unused (zero transactional
references).

**Steps**: PATCH `/uom/groups/{hardwareId}` with `{ name: "LUMBER" }`.

**Expected Result**: 409 `GROUP_NAME_DUPLICATE` — rejected, "Hardware" is not renamed (BR-001/VR-019,
ADR-191). Confirms the uniqueness check runs on rename, not only on create.

**Priority**: Critical — this is the core new behavior ADR-191 introduces (uniqueness check timing
extended from create-only to create-and-rename).

---

## TC-031

**Title**: Renaming a used/locked Group's Name to a case-variant duplicate of a different Group is
still rejected; renaming it to its own name in a different casing is allowed

**Requirement**: FR-004

**Preconditions**: Group A ("Lumber") has at least one transactional reference (locked per
BR-020/VR-018, Name still editable); Group B ("Hardware") exists, any lock state.

**Steps**:
1. PATCH `/uom/groups/{groupAId}` with `{ name: "HARDWARE" }` (a case-variant duplicate of Group B's
   name).
2. PATCH `/uom/groups/{groupAId}` with `{ name: "LUMBER" }` (a case-variant of Group A's **own**
   current name, not a duplicate of any *different* Group).

**Expected Result**:
- Step 1: 409 `GROUP_NAME_DUPLICATE` — rejected. Both BR-020/VR-018 (which would otherwise allow this
  as a Name-only edit on a locked Group) and BR-001/VR-019 (uniqueness) are independent checks; the
  uniqueness check still fires and blocks the rename even though the lock check alone would have
  allowed it.
- Step 2: 200 — allowed. This is **not** a duplicate of a different Group (it's the same Group's own
  name, differently cased), so VR-019 does not fire; VR-018 allows it as a Name-only edit on a locked
  Group. Confirms the edge case explicitly: a used Group can freely re-case its own name.

**Priority**: Critical — this is the edge case where BR-020's lock exception and BR-001's uniqueness
check interact, and the one most likely to be implemented incorrectly (e.g. by naively rejecting any
rename that "matches an existing name" without excluding the Group's own current row).

---

## TC-032

**Title**: Create a UOM Type with a Category

**Requirement**: FR-002

**Steps**: POST `/uom/types` with `{ name: "Feet", categoryId: <lengthCategoryId> }`.

**Expected Result**: 201, Type persisted with `categoryId` set to the submitted value (BR-010,
ADR-192 — resolves UOM-FX-OQ-001).

**Priority**: Medium.

---

## TC-033

**Title**: Create a UOM Type without a Category

**Requirement**: FR-002

**Steps**: POST `/uom/types` with `{ name: "Each" }` — `categoryId` omitted.

**Expected Result**: 201, Type persisted with `categoryId: null` — not required, no validation error
(BR-010, ADR-192 — confirms `category_id` is optional, not mandatory).

**Priority**: Medium.

---

## TC-034

**Title**: A Group role with no explicit assignment resolves to the Group's Base Type

**Requirement**: FR-005, FR-009

**Preconditions**: a Group has Base Type = Each; no `UOMRoleAssignment` row exists for the
"Purchase-Cost" Functional Role on this Group.

**Steps**: GET `/uom/groups/{id}/roles/{purchaseCostRoleId}/resolve`.

**Expected Result**: 200, `{ typeId: <eachTypeId>, resolution: "base_type_fallback" }` — the Group's
own Base Type is returned as the resolved Type for the unassigned role, not a null/empty result and
not a rejected request (BR-021, ADR-192 — resolves UOM-FX-OQ-004). A second test variant with an
explicit Role Assignment present for a different role on the same Group confirms
`resolution: "explicit"` and the assigned Type, not the Base Type, is returned for that role.

**Priority**: Critical — this is the module's confirmed resolution-time fallback behavior, exercised
by every consuming module's own role-to-Type lookups.

---

## TC-035

**Title**: Deleting a Functional Role still referenced by a Role Assignment is rejected

**Requirement**: FR-003

**Preconditions**: a `UOMFunctionalRole` is referenced by at least one active `UOMRoleAssignment` row.

**Steps**: DELETE `/uom/functional-roles/{id}`.

**Expected Result**: 409, error names the referencing Group/Role Assignment; the Functional Role
remains active (BR-014, confirmed via ADR-192 — resolves UOM-FX-OQ-007). This is the
`UOMFunctionalRole` analog of TC-002 (Category) and its Type equivalent.

**Priority**: High.

---

## TC-036

**Title**: Deleting an unreferenced Functional Role succeeds

**Requirement**: FR-003

**Preconditions**: a `UOMFunctionalRole` exists with **zero** `UOMRoleAssignment` rows referencing it.

**Steps**: DELETE `/uom/functional-roles/{id}`.

**Expected Result**: 204, Functional Role soft-deleted — confirms BR-014's in-use guard is scoped to
actual reference and does not regress the still-valid unreferenced-Role delete path (the explicit
non-regression counterpart to TC-035).

**Priority**: Medium.

---

# 5. Validation Tests

**Required Fields**: TC-005 (Base Type), plus analogous tests for Category/Type/Functional Role/
Group `name`.

**Formats**: max-length on `name` fields (255 chars).

**Ranges**: `units_per_base > 0` and whole-number (TC-007).

**Cross-field**: TC-008 (Role Assignment uniqueness), TC-011 (Conversion Factor uniqueness), TC-013
(Picking Hierarchy uniqueness).

**Business validation**: TC-006 (duplicate Group name), TC-010 (Group-save completeness), TC-002
(in-use delete guard), TC-025/TC-026/TC-027/TC-028 (VR-018 transaction-reference lock — Name-only
edit allowed, other-field edit rejected, delete rejected once used, delete still allowed while
unused), TC-029/TC-030/TC-031 (VR-019 case-insensitive Group Name uniqueness — duplicate on create,
duplicate on rename, and the locked-Group-rename interaction with VR-018), TC-035/TC-036 (VR-020
Functional Role in-use delete guard — rejected while referenced, allowed once unreferenced).

---

# 6. Permission Tests

**Admin**: can perform every action in §3 Permission Matrix (`7-permissions.md`).

**Counter/Sales Staff, Warehouse/Fulfillment Staff, Accounting/Management, Purchasing Staff**: can
call `POST /uom/conversions/resolve` and `GET /uom/groups/{id}/pick-breakdown` (read-only, via their
own module's authenticated session); cannot reach any UOM admin write endpoint (403).

**B2B Customer**: cannot reach any UOM endpoint directly (403 or 404, per project-wide convention for
unauthorized-role-vs-nonexistent-resource error shape).

**Ownership**: not applicable — no per-user ownership model exists (`7-permissions.md` §4).

---

# 7. API Tests

**GET**: list/detail endpoints return correct pagination, filtering, and nested-detail shape
(`8-api.md` §3).

**POST**: TC-001, TC-003, TC-004, TC-009 (all succeed); TC-005, TC-006, TC-007, TC-010 (all
correctly rejected).

**PUT/PATCH**: TC-012 (factor change + history write); TC-024 (unused Group, all fields); TC-025
(used Group, Name-only, allowed); TC-026 (used Group, other field, rejected — `GROUP_LOCKED`); TC-030
(rename to case-variant duplicate, rejected); TC-031 (locked-Group rename — duplicate-of-other
rejected, re-case-of-own allowed).

**DELETE**: TC-002, TC-016, TC-027 (used Group, rejected — `GROUP_LOCKED`), TC-028 (unused Group,
allowed), TC-035 (referenced Functional Role, rejected), TC-036 (unreferenced Functional Role,
allowed).

**GET (role resolution)**: TC-034 — `GET /uom/groups/{id}/roles/{roleId}/resolve` returns the
Base-Type fallback when no explicit assignment exists, and the explicit assignment otherwise.

**Errors**: every 400/403/404/409 case above returns the project-wide standard error envelope
(`3-api/6-error-handling.md`) with a UOM-specific, field-naming message (not a generic message).

**Pagination**: standard `DataTable`-backing pagination test on `GET /uom/groups` and
`GET /uom/categories`.

**Filtering**: Category filter on `GET /uom/groups`; name search on every list endpoint.

---

# 8. UI Tests

**List**: Category/Type/Functional Role/Group List screens render, search, sort, paginate correctly
(`9-ui.md` §4).

**Create**: Group Detail create flow, including the inline BR-019 completeness indicator appearing
before submit when a role-assigned Type has no factor yet.

**Edit**: Group Detail edit flow, including the Conversion Factor History panel opening correctly
for a Type with prior rate changes (TC-012's UI-facing counterpart). Locked-state UI (`9-ui.md`
§4 Group Detail/Edit): a used Group's detail screen shows the informational lock banner, every field
except Name renders disabled with a tooltip, and Delete renders disabled — the UI-facing counterpart
to TC-025/TC-026/TC-027. An unused Group's detail screen shows no banner and every field enabled —
the UI-facing counterpart to TC-024/TC-028.

**Delete**: confirmation Dialog flow on Category/Type/Functional Role/Group delete, including the
blocked-state message when BR-014's guard fires, and the disabled-Delete-button state (with
tooltip) when BR-020's transaction-reference lock applies to a Group.

**Search**: name search across all four List screens.

**Filtering**: Category filter on Group List.

**Responsive**: Group Detail's multi-section layout collapses correctly below the tablet breakpoint
(`9-ui.md` §8).

**Accessibility**: Picking Hierarchy reorder is keyboard-operable, not drag-only (`9-ui.md` §9).

---

# 9. Business Rule Tests

One test per Business Rule (`3-business-rules.md`):

| Rule | Test Case |
|---|---|
| BR-001 | TC-006, TC-029, TC-030, TC-031 |
| BR-002 | TC-005 |
| BR-003 | TC-007 |
| BR-004 | TC-007 |
| BR-005 | TC-010 (structurally prevented — see BR-005's own note) |
| BR-006 | TC-011 |
| BR-007 | TC-015 |
| BR-008 | TC-015 (pivot-through-Base is inherent to the formula tested) |
| BR-009 | TC-012 |
| BR-010 | TC-001, TC-003, TC-004 (freely creatable) |
| BR-011 | TC-008 |
| BR-012 | TC-013 |
| BR-013 | TC-014 (confirmed computed-value behavior, ADR-192) |
| BR-014 | TC-002, TC-035, TC-036 |
| BR-015 | TC-018 |
| BR-016 | TC-016 |
| BR-017 | TC-019 |
| BR-018 | TC-019 |
| BR-019 | TC-010 |
| BR-020 | TC-024, TC-025, TC-026, TC-027, TC-028 |
| BR-021 | TC-034 |

---

# 10. Edge Cases

**Duplicate**: TC-006, TC-008, TC-011, TC-013, TC-029 (case-variant, create), TC-030 (case-variant,
rename), TC-031 (case-variant rename on a locked Group vs. re-casing one's own name).

**Deletion while referenced vs. unreferenced**: TC-002/TC-016 (Category/Type) and TC-035/TC-036
(Functional Role, ADR-192) — each entity's in-use guard is tested both blocked (referenced) and
allowed (unreferenced), not just the blocked path.

**Resolution fallback**: TC-034 — a Group role with no explicit assignment resolves to the Base Type
rather than erroring, and this must not be confused with the genuinely-unreachable-Type error case
covered by `POST /uom/conversions/resolve`'s own 400 (`8-api.md`).

**Concurrency**: two administrators saving the same Group simultaneously — standard
optimistic-concurrency test per project-wide convention (`2-functional-specification.md` §11).

**Large Data**: pick-breakdown query (TC-022) returns correctly for a Group with a long picking
sequence, in one call (not N).

**Timeout / Network Failure**: standard project-wide tests, no UOM-specific variant.

---

# 11. Performance Tests

**Large datasets**: not a significant concern for this module's own reference-data volumes (small,
admin-managed).

**Bulk import**: TC-017 at realistic Group-count volume (per the project's standard import
performance benchmark, no UOM-specific number given in any source).

**Search**: name search response time on Group List, per project-wide standard.

**Pagination**: standard.

---

# 12. Security Tests

**Unauthorized access**: TC-019 confirms every UOM write endpoint rejects a caller without the
Admin role — this is the concrete regression test for UOM-RISK-008's closure.

**Permission escalation**: a non-Admin cannot elevate via any UOM endpoint (no ownership/escalation
path exists to test beyond the role check itself).

**Input validation**: SQL-injection regression test reproducing the exact unescaped-field shapes
documented in legacy's UOM-RISK-001/002, asserting rejection (this is Prisma's parameterized-query
behavior by construction — the test exists to confirm no future code path reintroduces raw string
concatenation, per `build-guidance.md`'s stated test-strategy pointer).

**Sensitive data exposure**: not applicable — no UOM entity carries Confidential/Restricted data
(`5-data-dictionary.md` §8).

**Module boundary (TC-018)**: a static-analysis/architecture-review test (or lint rule, if
feasible) confirming no other module's code imports/queries UOM's Prisma models directly — the
concrete regression test for BR-015/ADR-053's exclusivity principle and the historical
UOM-RISK-003 drift risk it closes.

---

# 13. Regression Checklist

- Group save atomicity (Group + Role Assignments + Conversion Factors succeed or fail together —
  TC-009/TC-010).
- Delete-in-use guards across all four entity types (TC-002 and its Type/Role/Group analogs).
- Conversion formula parity — a golden-output test suite run against the canonical service (TC-015
  and its price/uom_to_base counterparts), closing UOM-RISK-003 by verified test, not just by
  construction.
- Cross-module chains from §2's table: TC-016 (Pricing cascade), TC-021 (SalesOrder/PurchaseOrder
  conversion consumption), TC-022 (SalesOrder WMS pick-breakdown consumption), TC-023 (SalesHistory
  historical-rate consumption), TC-020 (Products Group-reference delete guard).
- Group transaction-reference lock (BR-020, ADR-190): TC-024 (unused Group, all fields editable),
  TC-025 (used Group, Name-only edit allowed), TC-026 (used Group, any other field edit rejected),
  TC-027 (used Group delete rejected), TC-028 (unused Group delete still succeeds — the explicit
  non-regression check for the still-valid unused-Group delete path).
- Group Name uniqueness, case-insensitive, create and rename (BR-001, ADR-191): TC-029 (create with
  case-variant duplicate rejected), TC-030 (rename to case-variant duplicate rejected), TC-031
  (locked-Group rename to a different Group's case-variant name still rejected; locked-Group rename
  to its own name in different casing allowed — the BR-001/BR-020 interaction edge case).
- Four ADR-192 resolutions (`open-questions.md` UOM-FX-OQ-001/004/005/007): TC-032/TC-033 (Type
  Category is optional — with and without), TC-034 (unassigned role resolves to Base Type, not an
  error), TC-014 (picking-hierarchy indicator computed from row presence, no separate flag write),
  TC-035/TC-036 (Functional Role in-use delete guard, confirmed — blocked while referenced, allowed
  once unreferenced).

---

# 14. Test Data

**Required seed data**: `uom_functional_roles` starter set (`5-data-dictionary.md` §5); at least one
fully-valid UOM Group (Base + one non-Base Type with a factor) for conversion-service tests to run
against without first constructing one per test.

**Reference data**: none beyond the above — this module has no country/currency/status reference
data of its own.

---

# 15. Related Documents

Module: `1-module.md` · Functional Specification: `2-functional-specification.md` · Business Rules:
`3-business-rules.md` · Validation: `6-validation.md` · Permissions: `7-permissions.md` · API:
`8-api.md` · UI: `9-ui.md` · [Project Testing Strategy](../../../../approved-docs/docs-kit/
6-development/6-testing-strategy.md)

---

# Revision History

| Date | Change |
|---|---|
| 2026-08-18 | Initial draft. |
| 2026-08-18 | Amendment (ADR-190): added TC-024 through TC-028 for BR-020's Group transaction-reference lock. |
| 2026-08-18 | Amendment (ADR-191): added TC-029 through TC-031 for BR-001/VR-019's case-insensitive Group Name uniqueness, checked on create and rename. |
| 2026-08-18 | Amendment (ADR-192): amended TC-014 from an exploratory Non-blocking placeholder to a confirmed test of BR-013's computed picking-hierarchy indicator; added TC-032 through TC-036 for `UOMType.category_id` (with/without), BR-021's Base-Type role-resolution fallback, and the confirmed Functional Role in-use delete guard (blocked/allowed). |

---

# Approval

Pending review per `4-document-review/1-document-review.md`.

---

# AI Generation Notes

Every test case traces to a Functional Requirement, Business Rule, or Validation Rule ID. TC-014 is
deliberately written as an exploratory/pin-down test rather than asserting a specific expected
result, since BR-013's severity is genuinely Underspecified as of this draft — asserting a specific
outcome here would silently resolve an open question this document is not authorized to resolve.
Cross-module chain tests (TC-016, TC-020 through TC-023) are named explicitly per the template's own
§2 instruction, each exercising the real producing→consuming chain rather than only each module's
isolated behavior.

**Amendment (ADR-190)**: TC-024 through TC-028 were added after this document's original review/
approval pass, to transcribe ADR-190/BR-020's test coverage requirement — explicitly covering the
five states the developer named (unused-Group full edit, used-Group Name-only edit, used-Group
other-field edit, used-Group delete, unused-Group delete) so the still-valid unused-Group delete
path (TC-028) is verified as a non-regression, not accidentally swept into the new lock. This is a
targeted amendment, not a re-review of the rest of the document.

**Amendment (ADR-191)**: TC-029 through TC-031 were added after this document's original review/
approval pass, to transcribe ADR-191/BR-001/VR-019's case-insensitive Group Name uniqueness check
applying on both create and rename. TC-031 specifically pins down the edge case the ADR-191 task
called out explicitly: the uniqueness check and the ADR-190 transaction-reference lock's Name
exception are independent checks that both apply to a used Group's rename, and a Group renaming
itself to its own current name in a different casing is not a duplicate of a *different* Group and
must remain allowed. This is a targeted amendment, not a re-review of the rest of the document.

**Amendment (ADR-192)**: TC-014 was rewritten from an exploratory placeholder (BR-013 was previously
Underspecified/Non-blocking, so this document deliberately did not assert a specific expected result)
into a confirmed regression test, now that ADR-192 resolves the picking-hierarchy indicator as a
computed value. TC-032 through TC-036 were added to cover the remaining three ADR-192 resolutions:
`UOMType.category_id` being optional (TC-032/TC-033), the Base-Type role-resolution fallback
(TC-034), and the Functional Role in-use delete guard now being a confirmed rule rather than an
unconfirmed extension (TC-035/TC-036). This is a targeted amendment, not a re-review of the rest of
the document.
