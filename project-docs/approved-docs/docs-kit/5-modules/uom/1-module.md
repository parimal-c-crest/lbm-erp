# Module Specification — UOM

# Document Information

| Field | Value |
|---|---|
| Module Name | UOM (Unit of Measure) |
| Version | 1.0 |
| Status | Draft |
| Owner | Developer (solo, AI-assisted) |
| Priority | High — M3 foundation module; SalesOrder, PurchaseOrder, Receiving, StoreTransfer, Manufacturing, Kits, SalesHistory, Products, and Pricing all depend on it |

---

# 1. Executive Summary

**Purpose**: UOM defines the units a product can be bought, sold, stocked, priced, picked, and
reported in, and provides the conversion arithmetic to move a quantity or a price between any of
those units and the product's Base unit. [Source: `sot-docs/raw/2-module-specs/UOM/module-overview.md`
§Purpose]

**Business objective**: give every transactional module one authoritative, exclusively-owned
service for unit conversion and configuration, closing legacy's confirmed 46+-file direct-table-
access pattern and an already-drifted independent SQL reimplementation of the conversion formula
[Source: `module-field-extraction/uom/entities-and-fields.md` §Cross-module field dependencies;
ADR-053].

**Scope**: definition and CRUD of UOM Categories, Types, Functional Roles, and Groups (including
each Group's role-specific type assignments); the per-Group, per-Type conversion factor and its
effective-date history; the per-Group picking-unit hierarchy; the canonical base-unit-pivot
conversion arithmetic for both quantity and price. Out of scope: the Product entity's own
`uom_group_id` assignment (owned by Products); any specific transactional use of a conversion
result (owned by the consuming module); Pricing's fixed-price-override records (owned by Pricing,
though a UOM Type delete cascades into them — UOM-RULE-016).
[Source: `sot-docs/raw/2-module-specs/UOM/module-overview.md` §Scope within this module]

---

# 2. Business Context

**Problem statement**: legacy never gave UOM its own module boundary — its files live inside
Products and a shared utility file, with no enforced interface. A dozen-plus modules issue their own
direct SQL joins against the raw UOM tables, and one report (`InventoryQtyByUOMTypeName.php`)
reimplements the conversion formula independently in SQL, already free to drift from the canonical
PHP primitive. Two confirmed SQL injections sit in the module's most-used write path
(`save_uom_group()`) with no server-side permission check gating them. [Source:
`sot-docs/raw/2-module-specs/UOM/risks-and-open-questions.md` UOM-RISK-001/002/003/008]

**Business value**: closing this module boundary removes a live security exposure (unauthenticated/
wrong-role SQL injection on the group-save path) and a live data-integrity exposure (a second,
independently-maintained copy of the conversion arithmetic that can silently diverge from the
canonical one) that touch every downstream transaction — a wrong unit conversion or a wrong price
resolution propagates directly into every order, purchase, and inventory count.

**Dependencies**: none inbound at the Backend/API level within M3 (Users, Location, Products, UOM
have no cross-dependency among themselves — `plan/dependencies.md`). Outbound: Products (header
FK), SalesOrder, PurchaseOrder, Receiving, StoreTransfer, Manufacturing (BOM), Kits, SalesHistory,
Settings, and Pricing all consume UOM's service — see §11.

---

# 3. Module Overview

**Description**: a UOM Group is a product-assignable bundle naming, for each of an admin-definable
set of Functional Roles (Selling, Pricing, Stocking, Physical Inventory, Picking, Purchase,
Purchase-Cost, Receiving, Reporting, Inner-Pack, Outer-Pack — seeded starter set, ADR-094), which
UOM Type governs that role. A UOM Type belongs to a UOM Category. A separate record captures the
actual conversion factor between each non-Base Type and the Group's Base Type, with a small history
table preserving effective-dated rate changes (ADR-096). A further record captures the ordered
sequence of Types used when breaking a pick quantity down into whole units. [Source:
`sot-docs/raw/2-module-specs/UOM/module-overview.md` §Purpose; `module-field-extraction/uom/
entities-and-fields.md`]

**Responsibilities**: own and expose, as the sole authorized access path (ADR-053 / UOM-RULE-015):
Category/Type/Functional-Role/Group CRUD; Role Assignment CRUD; Conversion Factor CRUD (with
Group-save-time completeness validation, UOM-RULE-019); Conversion-Factor history; Picking-Hierarchy
CRUD; the base-unit-pivot conversion query (qty and price, both directions); a pick-unit-breakdown
query.

**Out of scope**: the Product entity itself and its `uom_group_id` assignment (Products' own field);
any specific transactional use of a conversion result (an order line's quantity, a PO's cost
extension, a pick list) — those are consumers applying UOM's output, not part of UOM's own domain;
`lbm_orgill_uom`, a separate vendor-catalog reference table unrelated to this module's conversion
model [Source: `module-overview.md` §Scope within this module]; the legacy "Manage UOM Qty Pricing"
screen's own write-back-to-base-price behavior — superseded entirely by Pricing's live-resolution
design (ADR-029; see `module-field-extraction/uom/entities-and-fields.md` §"Entity dropped from the
rewrite").

---

# 4. Actors

**Administrator** (Catalog administrator, per legacy's terminology — not a distinct confirmed
permission role in legacy, see `7-permissions.md`) — defines UOM Categories, Types, Functional
Roles, and Groups; assigns conversion factors and picking hierarchies. [Source:
`sot-docs/raw/2-module-specs/UOM/module-overview.md` §Actors]

**Every downstream transactional module** (Products, SalesOrder, PurchaseOrder, Receiving,
StoreTransfer, Manufacturing, Kits, SalesHistory, Settings, Pricing) — reads UOM configuration and
the conversion service as part of its own workflows, exclusively through UOM's service (ADR-053).
[Source: `module-overview.md` §Actors, revised for the rewrite's exclusive-service model]

**System** — the conversion service itself, invoked synchronously by every consuming module; the
Group-save validation (UOM-RULE-019) and delete-in-use guards (UOM-RULE-014) run as part of the
system's own write path, not a separate background actor.

No "Pricing administrator" actor is carried forward for this module specifically — legacy's "Manage
UOM Qty Pricing" screen and its write-back behavior are not part of the rewrite (see §3 Out of
scope); pricing-rule administration is Pricing's own actor/screen, out of this module's scope.

---

# 5. Goals

**Business goals**: one authoritative UOM service, no direct table access anywhere in the codebase
(ADR-053); no possibility of a diverged second copy of the conversion formula (closes UOM-RISK-003);
real server-side authorization on every write (closes UOM-RISK-008); no SQL injection surface
(closes UOM-RISK-001/002).

**User goals**: an administrator can freely define and rename Categories/Types/Roles/Groups without
a code change (ADR-094); a Group cannot be saved into an inconsistent state (missing Base Type,
missing conversion factor for a role-assigned Type) — errors surface at configuration time, not at
transaction time (UOM-RULE-002, UOM-RULE-019).

**Success metrics**: zero direct-table-access call sites outside UOM's own service boundary (closes
the legacy 46+-file pattern); zero SQL-injection findings in a security review of UOM's write paths;
100% of UOM-RULE-001 through 019 covered by an automated test (`11-testing.md`).

---

# 6. Functional Requirements

Organized by feature — full detail in `2-functional-specification.md`.

- **FR-001** Manage UOM Category (create/rename/soft-delete)
- **FR-002** Manage UOM Type (create/rename/soft-delete)
- **FR-003** Manage UOM Functional Role (create/rename/soft-delete)
- **FR-004** Manage UOM Group (create/update/soft-delete), including Base Type assignment
- **FR-005** Manage Role Assignments for a Group
- **FR-006** Manage Conversion Factors for a Group (with save-time completeness validation)
- **FR-007** View Conversion-Factor history for a Group+Type pair
- **FR-008** Manage Picking Hierarchy for a Group
- **FR-009** Resolve a conversion (qty or price, either direction) for a Group+Type
- **FR-010** Resolve a pick-unit breakdown for a Group
- **FR-011** Import/export UOM Group bulk data (ADR-098)

---

# 7. User Stories

- As an **administrator**, I want to define a UOM Category so that I can organize UOM Types by
  physical dimension (Length, Volume, Each). [Source: `module-overview.md` §Actors]
- As an **administrator**, I want to create a UOM Group and assign a Base Type before anything else,
  so that every other Type I add has a well-defined conversion target. [UOM-RULE-002]
- As an **administrator**, I want the system to reject saving a Group if I've assigned a role to a
  Type that has no conversion factor yet, so that I can't accidentally leave a Group in a broken
  state that would fail at transaction time. [UOM-RULE-019]
- As **SalesOrder** (a consuming module), I want to ask UOM for the conversion factor and current
  role assignments for a product's Group, so that I never have to read UOM's tables directly or
  reimplement the conversion formula myself. [ADR-053, UOM-RULE-015]
- As **SalesHistory** (a consuming module), I want to ask UOM for the conversion rate that was
  effective on a specific past date, so that a historical report reflects the rate at the time of
  the transaction, not today's rate. [ADR-096, UOM-RULE-009]

---

# 8. Acceptance Criteria

- **Given** a UOM Group with no Base Type assigned, **when** an administrator attempts to save it,
  **then** the save is rejected with a validation error naming the missing Base Type. [UOM-RULE-002]
- **Given** a UOM Group whose Selling role is assigned to a Type with no conversion factor defined,
  **when** an administrator attempts to save the Group, **then** the save is rejected, naming the
  Type and role that lacks a factor. [UOM-RULE-019]
- **Given** a UOM Type currently referenced by an active Group's role assignment, **when** an
  administrator attempts to delete that Type, **then** the delete is rejected (database-enforced
  `RESTRICT`). [UOM-RULE-014]
- **Given** a conversion factor changes for a Group+Type pair, **when** the change is saved,
  **then** a new `UOMTypeFactorHistory` row is written for that (Group, Type) recording the prior
  rate's effective end date, and the new rate's effective start date. [UOM-RULE-009, ADR-096
  Amendment]
- **Given** a caller submits a write request to any UOM endpoint without the required role,
  **when** the request reaches the server, **then** it is rejected at the endpoint itself (not only
  hidden in the UI). [UOM-RULE-017]

---

# 9. Business Process

High-level workflow (full detail in `module-field-extraction/uom/workflow.md` and
`2-functional-specification.md` §4):

1. Administrator defines Categories, Types, and Functional Roles (independently of any Group).
2. Administrator creates a Group, assigning its Base Type (required at save).
3. Administrator assigns Role Assignments for the Group (which Type fulfills which Role).
4. Administrator defines Conversion Factors for every non-Base Type reachable through a Role
   Assignment — enforced at Group-save time (UOM-RULE-019), not deferred.
5. Optionally, administrator enables and configures a Picking Hierarchy for the Group.
6. Products assigns the Group to a product (Products' own responsibility, ADR-040 — optional FK).
7. Consuming modules resolve conversions/role assignments through UOM's service at transaction time
   — never via direct table access (ADR-053).

---

# 10. Module Navigation

Reference `9-ui.md` for the full screen inventory. UOM's own admin screens (Category, Type,
Functional Role, Group management) live under Settings' System Configuration navigation area,
consistent with how legacy routed UOM's screens through Products' own navigation (`uom_manage.php`)
— the rewrite instead gives UOM its own dedicated navigation entry, since it is now its own bounded
module rather than files living inside Products (see `module-overview.md` §Origin). [Assumption:
navigation placement under Settings/System Configuration follows the same pattern as ADR-095's
per-module role-mapping screens, which are explicitly placed there — flagged in this document's
Open Questions for developer confirmation, since no ADR explicitly places UOM's own CRUD screens.]

---

# 11. Dependencies

**Modules** (outbound — consumers of UOM's service, per `module-field-extraction/uom/
entities-and-fields.md` §Cross-module field dependencies):
- **Products** — `UOMGroup.id` as an optional FK target; reads Role Assignments for UI rendering.
- **Settings** — owns the per-module Functional-Role-to-field mapping (ADR-095); reads
  `UOMFunctionalRole` list.
- **SalesOrder / PurchaseOrder** — resolve Qty/Sell-Price/Cost units per ADR-095/097; use the
  conversion service and factor history.
- **Receiving** — resolves the Receiving-role unit and converts to Base for inventory posting.
- **StoreTransfer** — resolves the transfer-quantity unit, Inner/Outer-Pack roles, and picking
  hierarchy.
- **Manufacturing (BOM) / Kits** — convert component quantities to a common Base unit.
- **SalesHistory** — resolves historical conversion rates via factor history.
- **Pricing** — derives a Base-unit price to a specific unit via the conversion service when no
  fixed-price override exists (ADR-029 pricing block); UOM Type deletion cascades a fixed-price
  override deletion (UOM-RULE-016).

**External systems**: none confirmed — UOM's integration surface is entirely intra-codebase.
[Source: `sot-docs/raw/2-module-specs/UOM/integrations.md` §External Systems]

**Shared services**: this project's standing NestJS Guard/ValidationPipe pattern (ADR-006); Prisma
as the parameterized-query ORM (tech-stack.md, closing UOM-RISK-001/002 by construction).

---

# 12. Events

**Triggers**: Group save (validates role-assignment/conversion-factor completeness, UOM-RULE-019);
conversion-factor change (writes a history row, UOM-RULE-009); Type/Category/Role/Group delete
(runs the in-use `RESTRICT` guard, UOM-RULE-014); Type delete (cascades a Pricing fixed-price-
override deletion, UOM-RULE-016).

**Notifications**: none confirmed as a UOM-specific requirement in the source material.

**Background jobs**: none confirmed as UOM-specific. Bulk import/export of UOM Group data (ADR-098)
follows the project's standard background-job import/export pattern, same as every other module
with bulk/tabular data — no UOM-specific job logic beyond that standard mechanism.

---

# 13. Non-Functional Requirements

**Performance**: the conversion service is called synchronously, potentially many times per
transaction line across every consuming module (`integrations.md`'s confirmed 46+ legacy call
sites) — must support the pick-unit-breakdown query as a single batched call (not N sequential
factor lookups), per `build-guidance.md`'s stated recommendation, closing the specific inefficiency
risk a naive per-unit API would reintroduce for WMS allocation.

**Availability**: no UOM-specific SLA beyond the project-wide standard (not itemized in any SoT
source for this module specifically).

**Security**: parameterized queries only (UOM-RULE-018); real server-side Guards on every write
(UOM-RULE-017) — see `7-permissions.md`.

**Accessibility**: UOM's own admin screens follow `4-ui/7-accessibility.md` project-wide standard;
no module-specific exception identified.

**Localization**: not addressed in any UOM source material — carried as a Non-blocking open item
(follows whatever project-wide localization decision applies, none UOM-specific).

---

# 14. Assumptions

- UOM's own admin CRUD screens are placed under Settings' System Configuration navigation area
  (§10) — flagged for developer confirmation, not independently locked by any ADR.
- `UOMType.category_id` is **not** added in this rewrite (legacy's category-agnostic shape is
  preserved) — per `module-field-extraction/uom/open-questions.md` UOM-FX-OQ-001, Non-blocking,
  reversible later without data loss if a category-scoping requirement emerges.
- `UOMFunctionalRole` and `UOMGroup` deletion are guarded by the same `RESTRICT` in-use pattern as
  `UOMType`/`UOMCategory` (UOM-RULE-014's pattern, extended). `UOMGroup`'s guard is now confirmed —
  ADR-190/UOM-RULE-020 (`open-questions.md` UOM-FX-OQ-006, Resolved). `UOMFunctionalRole`'s guard
  remains `open-questions.md` UOM-FX-OQ-007, Non-blocking.

---

# 15. Constraints

- No tenant column on any UOM table — database-per-tenant (ADR-056) makes this structural, not a
  choice this module makes independently.
- Base Type's conversion factor relative to itself is implicitly 1 — never a stored
  `UOMConversionFactor` row (only non-Base Types get factor rows, per UOM-RULE-004/005).
- Every consuming module must go through UOM's service — this module cannot itself enforce that
  other modules' code complies; it is an architecture-review-level constraint (UOM-RULE-015), not a
  runtime one.

---

# 16. Risks

Carried forward from `module-field-extraction/uom/open-questions.md` §Risk Register (dispositions
summarized; full detail there):
- **UOM-RISK-004/007** (concurrency/cache-staleness) — structurally resolved, no cache exists in the
  rewrite.
- **UOM-RISK-006** — addressed by design via database-enforced `RESTRICT` (UOM-RULE-014).
- Remaining Non-blocking open items (UOM-FX-OQ-001, 004, 005, 006, 007, 008) — see
  `module-field-extraction/uom/open-questions.md`; none block this module's build.

---

# 17. Related Documents

- Schema: `4-schema.md`
- API: `8-api.md`
- Permissions: `7-permissions.md`
- Validation: `6-validation.md`
- Business Rules: `3-business-rules.md`
- UI: `9-ui.md`
- Testing: `11-testing.md`
- Field extraction (fact base this module's docs are drawn from):
  `project-docs/claude-docs/analysis/module-field-extraction/uom/`

---

# Revision History

| Date | Change |
|---|---|
| 2026-08-18 | Initial draft, generated per `05-modules/modules.md` step 1, from `module-field-extraction/uom/*` and `decisions-log.md`. |

---

# Approval

Pending review per `4-document-review/1-document-review.md`, scoped to `5-modules/uom`.

---

# AI Generation Notes

Drafted from: `sot-docs/raw/2-module-specs/UOM/*` (all 11 files), `module-field-extraction/uom/*`
(all 4 files, post-amendment), `decisions-log.md` (ADR-029, 040, 053, 056, 094–098, 161, and the
ADR-096 Amendment), and `approved-docs/docs-kit/5-modules/users/1-module.md` for structural/tone
consistency with the one other already-drafted module. No content in this document was invented
beyond what those sources support; two items (§10 navigation placement, §14 first bullet) are
explicitly flagged `[Assumption]`/for confirmation rather than stated as settled fact.
