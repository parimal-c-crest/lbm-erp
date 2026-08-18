# Business Rules — UOM

> **Purpose**
>
> This document presents UOM's business rules in the project's standard module-deliverable format
> (`BR-###`), organized by category, decision tables, and traceability. The authoritative rule
> catalog with full source citation, Confidence tags, and sourcing rigor notes is
> `module-field-extraction/uom/business-rules.md` (`UOM-RULE-001` through `021`) — this document
> maps that catalog into the template's required shape rather than re-deriving it. Every `BR-###`
> below cites its source `UOM-RULE-###`.
>
> **Amendment (ADR-190)**: BR-020 was added after this document's original review/approval pass, to
> transcribe ADR-190 (Group-level immutability/delete lock once transaction-referenced). This is a
> targeted amendment, not a re-review of the rest of the document.
>
> **Amendment (ADR-191)**: BR-001 was amended after this document's original review/approval pass, to
> state case-insensitive Group Name uniqueness and its explicit application on rename (not just
> create), per ADR-191. This is a targeted amendment, not a re-review of the rest of the document.
>
> **Amendment (ADR-192)**: BR-013 and BR-014 were amended, and BR-021 added, after the ADR-190/191
> amendment passes above, to resolve the four remaining Non-blocking field-extraction questions
> (`category_id` on Type, Base-Type role-resolution fallback, the picking-hierarchy indicator becoming
> computed, and the `UOMFunctionalRole` delete guard being confirmed). This is a targeted amendment,
> not a re-review of the rest of the document.

---

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

**Purpose**: define, in implementation-ready form, every business rule governing UOM's Category/
Type/Functional Role/Group/Role Assignment/Conversion Factor/Factor History/Picking Hierarchy
entities and the conversion service.

**Business objectives**: no UOM Group can be saved into a state that would fail at transaction time
(UOM-RULE-002/019); no consuming module can bypass UOM's own service (UOM-RULE-015); no in-use
reference record can be deleted out from under its consumers (UOM-RULE-014).

**Scope**: this module's own entities and its conversion service. Does not restate Pricing's own
resolution-order rules (decisions-log.md:541-544) beyond the one point where UOM's own delete
operation must trigger a Pricing-side cascade (BR-016 below).

---

# 2. Rule Categories

- **Data lifecycle** — BR-001, BR-002, BR-006, BR-010, BR-014, BR-016, BR-020
- **Workflow** — BR-002 (Group-setup sequencing, see `module-field-extraction/uom/workflow.md`)
- **Calculations** — BR-003, BR-004, BR-007, BR-008, BR-009
- **Data integrity / uniqueness** — BR-001, BR-006, BR-011, BR-012
- **Architecture / module boundary** — BR-015, BR-017, BR-018
- **Configuration completeness** — BR-019

---

# 3. Business Rules

## BR-001 — UOM Group name must be unique

**Title**: Group name uniqueness

**Description**: A UOM Group's name must be unique within the tenant's own database. The comparison
is **case-insensitive** — "Test" and "test" are the same name. The check runs on **both** Group
create and Group rename (every write to Name, not just initial creation), since Group Name stays
editable indefinitely even on an otherwise transaction-locked Group (BR-020 / ADR-190).

**Business Rationale**: prevents ambiguous references when a Group is selected by name in any admin
screen or API — including the "Feet" vs. "feet" style confusion a case-sensitive check would
silently allow. Since Name remains editable on a locked Group (BR-020), a rename must be checked for
duplicates the same as a create, or a duplicate could be introduced after the fact.

**Trigger**: Group create or rename.

**Conditions**: submitted name, compared case-insensitively, matches an existing, non-deleted Group's
name (a different Group — renaming a Group's Name to its own current name in a different casing is
not a duplicate of a different Group, and is allowed).

**Expected Outcome**: save rejected.

**Exceptions**: none.

**Related Requirements**: FR-004.

**Source**: `module-field-extraction/uom/business-rules.md` UOM-RULE-001 (Confirmed — legacy
behavior for the underlying uniqueness rule; case-insensitivity and the create-and-rename trigger are
Confirmed per **ADR-191**, resolving what was originally Non-blocking open question
UOM-FX-OQ-008).

---

## BR-002 — A UOM Group's Base Type must be assigned at creation

**Title**: Base Type required

**Description**: A UOM Group cannot be saved without a Base Type.

**Business Rationale**: every conversion pivots through the Base Type (BR-008) — a Group with no
Base Type has nothing to convert against.

**Trigger**: Group create or update.

**Conditions**: `base_type_id` is null/unset.

**Expected Outcome**: save rejected.

**Exceptions**: none.

**Related Requirements**: FR-004.

**Source**: UOM-RULE-002 (Confirmed, ADR-096).

---

## BR-003 — Base Type must be the smallest unit in its group

**Title**: Base-is-smallest-unit invariant

**Description**: The Base Type's factor relative to itself is 1; every other Type's factor relative
to Base is a whole number ≥ 1.

**Business Rationale**: avoids fractional-factor data-entry errors (ADR-096).

**Trigger**: Group setup; Conversion Factor create.

**Conditions**: a submitted `units_per_base` is not a positive whole number.

**Expected Outcome**: rejected.

**Exceptions**: none confirmed.

**Related Requirements**: FR-004, FR-006.

**Source**: UOM-RULE-003 (Confirmed for intent; enforcement mechanism Underspecified — see
`open-questions.md`, Non-blocking; this document validates the whole-number constraint on every
submitted factor as the concrete implementable check).

---

## BR-004 — Conversion factor is a single whole-number-or-greater ratio, one documented direction

**Title**: Conversion factor shape

**Description**: `units_per_base` states how many units of the non-Base Type equal one Base unit.

**Business Rationale**: replaces legacy's undocumented-direction two-column pair, closing a
confirmed source of formula-direction bugs (`entities-and-fields.md` §Problem 2 in the legacy
blueprint).

**Trigger**: Conversion Factor create/update.

**Conditions**: value must be > 0 and a whole number (BR-003).

**Expected Outcome**: valid values persisted; invalid rejected.

**Exceptions**: none.

**Related Requirements**: FR-006.

**Source**: UOM-RULE-004 (Confirmed, ADR-096).

---

## BR-005 — A non-Base Type needs an explicit conversion factor row to be usable

**Title**: Conversion-factor existence precondition

**Description**: A non-Base Type cannot be used in any conversion until a Conversion Factor row
exists for its (Group, Type) pair.

**Business Rationale**: prevents an undefined conversion from ever being attempted.

**Trigger**: Any conversion attempt for a non-Base Type.

**Conditions**: no Conversion Factor row exists for the (Group, Type).

**Expected Outcome**: **structurally prevented** — see BR-019, which makes this state unreachable by
validating completeness at Group-save time rather than handling it at conversion time.

**Exceptions**: none — this is now a precondition guaranteed by BR-019, not a runtime branch.

**Related Requirements**: FR-006, FR-009.

**Source**: UOM-RULE-005, resolved by UOM-RULE-019 (both Confirmed — see `open-questions.md`,
originally Blocking UOM-FX-OQ-003, resolved with the developer this session).

---

## BR-006 — Conversion factor uniqueness: one row per (Group, Type)

**Title**: Conversion factor uniqueness

**Description**: at most one Conversion Factor row per (Group, Type) pair.

**Business Rationale**: two conflicting factors for the same pair would make "the" conversion factor
ambiguous.

**Trigger**: Conversion Factor create.

**Conditions**: a row for this (Group, Type) already exists.

**Expected Outcome**: rejected.

**Exceptions**: none.

**Related Requirements**: FR-006.

**Source**: UOM-RULE-006 (Inferred — necessary consequence of BR-004's single-ratio-per-pair design).

---

## BR-007 — Conversions always stay fractional/decimal — no whole-number-rounding mode

**Title**: No rounding-mode config

**Description**: neither conversion direction ever forces a whole-number result; no per-deployment
config flag changes this.

**Business Rationale**: closes legacy's confirmed rounding-mode divergence (UOM-RISK-005).

**Trigger**: every conversion computation.

**Conditions**: n/a (always applies).

**Expected Outcome**: fractional/decimal result, always.

**Exceptions**: none.

**Related Requirements**: FR-009.

**Source**: UOM-RULE-007 (Confirmed, ADR-161).

---

## BR-008 — Base-unit-pivot conversion

**Title**: Base-unit-pivot conversion

**Description**: converting between any two non-Base Types always routes source → Base → target,
never a stored direct pairwise factor.

**Business Rationale**: matches standard ERP practice and legacy's own schema shape (ADR-096).

**Trigger**: every conversion computation.

**Conditions**: n/a.

**Expected Outcome**: pivot-through-Base result.

**Exceptions**: none.

**Related Requirements**: FR-009.

**Source**: UOM-RULE-008 (Confirmed, ADR-096).

---

## BR-009 — Conversion-rate history is versioned at change time, keyed (Group, Type)

**Title**: Factor-history versioning

**Description**: when a Conversion Factor's `units_per_base` changes, a history row is written for
that (Group, Type) pair, capturing the prior rate and its effective date range. A transaction line
stores only the finalize date and Type reference, never a duplicated rate.

**Business Rationale**: avoids the storage burden of a per-line rate snapshot at this project's
transaction volume (millions of lines), while preserving historical accuracy.

**Trigger**: Conversion Factor value change; any historical read/report by finalize date.

**Conditions**: n/a.

**Expected Outcome**: correct historical rate resolved by (Group, Type, as-of-date) lookup.

**Exceptions**: none.

**Related Requirements**: FR-006, FR-007.

**Source**: UOM-RULE-009 (Confirmed — key shape (Group, Type) resolved with the developer this
session; see the Amendment appended under ADR-096 in `decisions-log.md`).

---

## BR-010 — UOM Functional Roles, Categories, Types, and Groups are freely admin-manageable

**Title**: Free admin management

**Description**: an admin can add, rename, or soft-delete any of these four entities — none is a
hardcoded/fixed enum.

**Business Rationale**: same "add/rename freely" pattern already used for roles/themes elsewhere in
the project (ADR-094).

**Trigger**: any create/rename/delete on these four entities.

**Conditions**: n/a.

**Expected Outcome**: allowed, subject only to BR-001/BR-014's own constraints.

**Exceptions**: none.

**Related Requirements**: FR-001, FR-002, FR-003, FR-004.

**Source**: UOM-RULE-010 (Confirmed, ADR-094).

---

## BR-011 — Role Assignment uniqueness: one Type per (Group, Functional Role)

**Title**: Role Assignment uniqueness

**Description**: at most one Role Assignment row per (Group, Functional Role) pair.

**Business Rationale**: a Group cannot assign two different Types to the same role simultaneously.

**Trigger**: Role Assignment create/update.

**Conditions**: a row for this (Group, Role) already exists.

**Expected Outcome**: rejected.

**Exceptions**: none.

**Related Requirements**: FR-005.

**Source**: UOM-RULE-011 (Inferred, direct consequence of ADR-094's stated model).

---

## BR-012 — Picking Hierarchy uniqueness

**Title**: Picking Hierarchy uniqueness

**Description**: one row per (Group, Type) and one row per (Group, Sort Order) — no duplicate Type
and no duplicate position within a Group's sequence.

**Business Rationale**: closes a confirmed legacy gap (no uniqueness constraint existed at all).

**Trigger**: Picking Hierarchy row create/update/reorder.

**Conditions**: a row already exists for this Type or this Sort Order within the Group.

**Expected Outcome**: rejected.

**Exceptions**: none.

**Related Requirements**: FR-008.

**Source**: UOM-RULE-012 (Inferred, blueprint-sourced schema-integrity fix).

---

## BR-013 — "Uses Picking Hierarchy" is a computed value, not a stored/editable flag

**Title**: Picking-hierarchy indicator is derived

**Description**: "Uses Picking Hierarchy" is **not** a persisted Group field. It is computed at
read/resolution time: true if at least one Picking Hierarchy row exists for the Group, false
otherwise. There is no independent flag to set, toggle, or validate for consistency against row
presence.

**Business Rationale**: removes the flag/row-presence inconsistency structurally (formerly a UX-
visible risk: flag says "yes" but nothing to show, or rows exist but are hidden because a stale flag
says "no") — the same reasoning ADR-190 applied to the conversion-factor gap.

**Trigger**: any read of a Group's picking-hierarchy usage status (computed on demand, not a write
event).

**Conditions**: n/a — always computed from current row existence.

**Expected Outcome**: the indicator always reflects live Picking Hierarchy row presence for the
Group; adding the first row flips it true, removing the last row flips it false, with no separate
write required.

**Exceptions**: none.

**Related Requirements**: FR-008.

**Source**: UOM-RULE-013 (Confirmed, **ADR-192** — resolves `open-questions.md` UOM-FX-OQ-005,
previously Non-blocking/Underspecified).

---

## BR-014 — Deleting a Type/Category/Functional Role/Group in use is blocked

**Title**: In-use delete guard

**Description**: a Type, Category, Functional Role, or Group currently referenced by any dependent
row cannot be deleted — enforced as a database-level `RESTRICT` constraint, not an application-level
pre-check.

**Business Rationale**: closes legacy's unconfirmed-coverage gap (UOM-RISK-006) by construction —
a `RESTRICT` constraint cannot miss a reference point the way an ad hoc check could.

**Trigger**: delete attempt on `UOMType`, `UOMCategory`, `UOMFunctionalRole`, or `UOMGroup`.

**Conditions**: any dependent row references the record being deleted.

**Expected Outcome**: delete rejected.

**Exceptions**: none.

**Related Requirements**: FR-001 through FR-005.

**Source**: UOM-RULE-014 (Confirmed for Type/Category intent; **Confirmed, not merely Inferred, for
the `UOMFunctionalRole` extension as of ADR-192** — resolves `open-questions.md` UOM-FX-OQ-007,
previously Non-blocking). **Group deletion specifically is now governed by BR-020** (ADR-190,
`open-questions.md` UOM-FX-OQ-006, Resolved) — a stricter, independently-stated rule superseding the
extension this rule originally floated for `UOMGroup`.

---

## BR-015 — Every module resolves UOM exclusively through UOM's own service

**Title**: Module boundary enforcement

**Description**: no other module may read UOM's tables via a direct join or reimplement the
conversion arithmetic.

**Business Rationale**: closes legacy's confirmed 46+-file direct-access pattern and the confirmed
independent SQL reimplementation drift risk (UOM-RISK-003).

**Trigger**: architectural — applies to every consuming module's own design.

**Conditions**: n/a.

**Expected Outcome**: all access via UOM's service/API.

**Exceptions**: none.

**Related Requirements**: all FR items (this rule governs how every FR is consumed externally).

**Source**: UOM-RULE-015 (Confirmed, ADR-053).

---

## BR-016 — UOM Type deletion cascades a fixed-price override deletion in Pricing

**Title**: Cross-module delete cascade

**Description**: deleting a UOM Type (per BR-014's guard — meaning it's not in active UOM-side use)
also deletes any Pricing-rule fixed-price override keyed to that Type; Pricing for that unit reverts
to Base-derived resolution.

**Business Rationale**: prevents an orphaned Pricing record referencing a deleted UOM Type.

**Trigger**: UOM Type deletion.

**Conditions**: a Pricing fixed-price override exists for the deleted Type.

**Expected Outcome**: cascading delete in Pricing's own data.

**Exceptions**: none — auto-remediation, not a block.

**Related Requirements**: FR-002.

**Source**: UOM-RULE-016 (Confirmed, decisions-log.md:554 / ADR-029 pricing block).

---

## BR-017 — Real server-side authorization required on every UOM write/delete operation

**Title**: Server-side authorization

**Description**: every UOM write/delete endpoint is gated by a real server-side Guard, never a
UI-layer-only flag.

**Business Rationale**: closes legacy's confirmed permission-enforcement gap (UOM-RISK-008).

**Trigger**: every UOM write endpoint.

**Conditions**: caller lacks the required role.

**Expected Outcome**: request rejected at the endpoint.

**Exceptions**: none.

**Related Requirements**: all FR items with a write side-effect.

**Source**: UOM-RULE-017 (Confirmed, ADR-006).

---

## BR-018 — All UOM writes must use parameterized queries — no string-concatenated SQL

**Title**: Parameterized queries only

**Description**: no UOM write path may build SQL by string-concatenating client-submitted values.

**Business Rationale**: closes legacy's two confirmed SQL injections (UOM-RISK-001/002).

**Trigger**: every UOM write operation.

**Conditions**: n/a.

**Expected Outcome**: Prisma/parameterized access only.

**Exceptions**: none.

**Related Requirements**: all FR items with a write side-effect.

**Source**: UOM-RULE-018 (Confirmed, standing tech-stack decision).

---

## BR-019 — A UOM Group save is rejected if any role-assigned Type lacks a conversion factor

**Title**: Group-save completeness validation

**Description**: when a Group is saved, every role-assigned, non-Base Type must already have (or be
submitted with) a Conversion Factor row — otherwise the entire save is rejected.

**Business Rationale**: developer-chosen resolution to what was originally an open question about
transaction-time behavior on a missing factor (UOM-FX-OQ-003) — prevention instead of a
reject/fallback decision at conversion time, making the missing-factor state structurally
unreachable.

**Trigger**: Group create or update (whenever Role Assignments or Conversion Factors change as part
of that save).

**Conditions**: a Role Assignment's Type is not the Group's Base Type and has no Conversion Factor
row.

**Expected Outcome**: save rejected, naming the offending Type/Role.

**Exceptions**: none — Base Type role assignments are exempt (implicit factor of 1, BR-003).

**Related Requirements**: FR-004, FR-005, FR-006.

**Source**: UOM-RULE-019 (Confirmed, developer decision this session).

---

## BR-020 — A UOM Group becomes fully locked and undeletable once referenced by any transaction, with Group Name the sole exception

**Title**: Transaction-referenced Group lock

**Description**: once a Group is referenced by any transaction (a SalesOrder line, PurchaseOrder
line, receiving record, or any other transactional consumer — first reference triggers the lock, not
mere assignment to a Product), every field on the Group becomes read-only **except Group Name**,
which stays editable indefinitely (references are by ID, not name). Locked once
transaction-referenced: Category, Sort Order, all eleven role-Type assignments (Role Assignment
rows), Base Type, Conversion Factors, and Picking Hierarchy rows. Delete is blocked outright, with
no exception, once referenced.

**Business Rationale**: prevents silently corrupting the meaning of every past transaction that
referenced the Group — editing a locked field or deleting a used Group after the fact would change
what already-recorded transactions mean without those transactions changing. If a genuinely
different conversion is needed later (e.g. a supplier repackages a unit), the correct path is
creating a **new** Group, not editing a locked one.

**Trigger**: any update attempt on a locked field, or any delete attempt, against a Group with at
least one transactional reference.

**Conditions**: the Group is referenced by at least one transaction row (any consuming module).

**Expected Outcome**: locked-field update rejected; delete rejected. Name-only update: allowed.
Any-field update on a Group with zero transactional references: allowed (BR-014 still applies for
its own dependent-reference delete guard on an unused Group referencing a deleted Type/Category/
Role, not this rule).

**Exceptions**: Group Name update — always allowed, used or unused Group alike.

**Related Requirements**: FR-004, FR-005, FR-006, FR-008.

**Source**: UOM-RULE-020 (Confirmed, ADR-190 — closes `open-questions.md` UOM-FX-OQ-006, extends
BR-014's pattern to the Group entity itself).

---

## BR-021 — A Functional Role with no explicit Type assignment falls back to the Group's Base Type

**Title**: Base-Type role-resolution fallback

**Description**: when a consumer resolves "which Type fulfills Functional Role X for Group G" and
finds no Role Assignment row for that (Group, Role) pair, the resolution falls back to the Group's
own Base Type rather than blocking the operation or returning an empty/null result.

**Business Rationale**: lets a Group be usable (assignable to a Product, usable on a transaction
line) with fewer than all Functional Roles populated — e.g. only Base and Selling — without forcing
every admin-defined role to be explicitly assigned before the Group is usable.

**Trigger**: any role-to-Type resolution lookup, by any consuming module, where the Group has no
explicit Role Assignment for the requested Functional Role.

**Conditions**: no Role Assignment row exists for the (Group, Functional Role) pair being resolved.

**Expected Outcome**: resolution returns the Group's Base Type as the Type fulfilling that role,
never a null/empty result and never a rejected operation.

**Exceptions**: none.

**Related Requirements**: FR-005, FR-009.

**Source**: UOM-RULE-021 (Confirmed, **ADR-192** — resolves `open-questions.md` UOM-FX-OQ-004,
previously Non-blocking).

---

# 4. Decision Tables

| Condition | Result |
|-----------|--------|
| Group has no Base Type | Save rejected (BR-002) |
| Role-assigned Type = Base Type | No Conversion Factor required (implicit factor 1) |
| Role-assigned Type ≠ Base Type, no Conversion Factor exists | Save rejected (BR-019) |
| Role-assigned Type ≠ Base Type, Conversion Factor exists | Save allowed |
| Duplicate Group name (case-insensitive, create or rename) | Save rejected (BR-001) |
| Delete Type/Category/Role/Group with an active dependent reference | Delete rejected (BR-014) |
| Delete Type with a Pricing fixed-price override, not otherwise in use | Delete allowed; override cascades deleted (BR-016) |
| Conversion Factor value changes | New `UOMTypeFactorHistory` row written (BR-009) |
| Write request without required role | Request rejected at endpoint (BR-017) |
| Group has ≥1 transactional reference, non-Name field edited | Update rejected (BR-020) |
| Group has ≥1 transactional reference, Name edited | Update allowed (BR-020) |
| Group has ≥1 transactional reference, delete attempted | Delete rejected (BR-020) |
| Group has 0 transactional references | All fields editable; delete allowed subject to BR-014 |
| Picking Hierarchy row added/removed for a Group | "Uses Picking Hierarchy" indicator recomputed automatically, no separate write (BR-013) |
| Functional Role has no Role Assignment for a Group | Resolution falls back to the Group's Base Type (BR-021) |
| Delete `UOMFunctionalRole` still referenced by a Role Assignment | Delete rejected (BR-014) |

---

# 5. Calculations

- **Conversion (qty or price, either direction)**: base-unit-pivot, always fractional — BR-007,
  BR-008. Full formula detail: `module-field-extraction/uom/business-rules.md` UOM-RULE-007/008 and
  legacy's `calculations.md` (superseded formula table — the rewrite drops the whole-number-rounding
  branch entirely per ADR-161).
- **No Tax/Discount/Commission/Shipping/Totals calculations** — out of this module's scope (owned by
  Pricing, SalesOrder, PurchaseOrder respectively).

---

# 6. State Transition Rules

UOM's entities have no multi-state status/lifecycle model — only Active/Soft-deleted, guarded by
BR-014. See `module-field-extraction/uom/workflow.md` for the full explicit statement of this
("No status or lifecycle model exists" — carried forward, not silently assumed away) and the
Group-setup sequencing (Category/Type/Role → Group+Base Type → Role Assignment → Conversion Factor
→ optional Picking Hierarchy), which is a creation-order dependency, not a state machine.

**Allowed transitions**: Active → Soft-deleted (guarded, BR-014).

**Restricted transitions**: Soft-deleted → Active (no restore path confirmed in any source — carried
forward as a gap, not resolved here).

---

# 7. Workflow Rules

No approval workflow, escalation, or auto-assignment applies to UOM's entities (pure reference-data
CRUD). Background processing is limited to FR-011's bulk import/export (ADR-098's standard pattern).
No UOM-specific notification rule was identified in any source.

---

# 8. Exception Rules

**Duplicate records**: BR-001, BR-006, BR-011, BR-012.

**Expired records**: n/a — no expiry concept on any UOM entity; `UOMTypeFactorHistory`'s
`effective_to` marks a rate's own historical end, not an entity's expiry.

**Invalid states**: BR-002 (no Base Type), BR-019 (incomplete role/factor coverage).

**Concurrency**: no UOM-specific concurrency rule beyond the project-wide standard (the legacy
two-write-direction pricing conflict, UOM-RISK-004, does not exist in the rewrite — see
`1-module.md` §16).

---

# 9. External Dependencies

**Third-party systems**: none.

**Scheduled jobs**: none UOM-specific beyond FR-011's standard bulk import/export job.

**Queues**: FR-011's import/export job only.

**Webhooks**: none.

---

# 10. Assumptions

See `1-module.md` §14.

---

# 11. Constraints

See `1-module.md` §15.

---

# 12. Traceability

| Rule | Requirement | API | Test |
|------|-------------|-----|------|
| BR-001 | FR-004 | `8-api.md` Group endpoints | `11-testing.md` TC (BR-001) |
| BR-002 | FR-004 | `8-api.md` Group endpoints | `11-testing.md` TC (BR-002) |
| BR-003 | FR-004, FR-006 | `8-api.md` Conversion Factor endpoints | `11-testing.md` TC (BR-003) |
| BR-004 | FR-006 | `8-api.md` Conversion Factor endpoints | `11-testing.md` TC (BR-004) |
| BR-005 | FR-006, FR-009 | `8-api.md` Conversion endpoints | `11-testing.md` TC (BR-005) |
| BR-006 | FR-006 | `8-api.md` Conversion Factor endpoints | `11-testing.md` TC (BR-006) |
| BR-007 | FR-009 | `8-api.md` Conversion endpoint | `11-testing.md` TC (BR-007) |
| BR-008 | FR-009 | `8-api.md` Conversion endpoint | `11-testing.md` TC (BR-008) |
| BR-009 | FR-006, FR-007 | `8-api.md` Factor History endpoint | `11-testing.md` TC (BR-009) |
| BR-010 | FR-001–FR-004 | `8-api.md` all CRUD endpoints | `11-testing.md` TC (BR-010) |
| BR-011 | FR-005 | `8-api.md` Role Assignment endpoints | `11-testing.md` TC (BR-011) |
| BR-012 | FR-008 | `8-api.md` Picking Hierarchy endpoints | `11-testing.md` TC (BR-012) |
| BR-013 | FR-008 | `8-api.md` Group read/Picking Hierarchy endpoints | `11-testing.md` TC (BR-013) |
| BR-014 | FR-001–FR-004 | `8-api.md` delete endpoints | `11-testing.md` TC (BR-014) |
| BR-015 | all | `8-api.md` (module boundary) | `11-testing.md` TC (BR-015) |
| BR-016 | FR-002 | `8-api.md` Type delete endpoint | `11-testing.md` TC (BR-016) |
| BR-017 | all writes | `7-permissions.md` | `11-testing.md` TC (BR-017) |
| BR-018 | all writes | n/a (implementation-layer) | `11-testing.md` TC (BR-018) |
| BR-019 | FR-004–FR-006 | `8-api.md` Group endpoints | `11-testing.md` TC (BR-019) |
| BR-020 | FR-004, FR-005, FR-006, FR-008 | `8-api.md` Group update/delete endpoints | `11-testing.md` TC (BR-020) |
| BR-021 | FR-005, FR-009 | `8-api.md` role-resolution endpoint | `11-testing.md` TC (BR-021) |

---

# 13. Related Documents

Module: `1-module.md` · Functional Specification: `2-functional-specification.md` · Validation:
`6-validation.md` · Permissions: `7-permissions.md` · API: `8-api.md` · UI: `9-ui.md` · Testing:
`11-testing.md`

---

# AI Generation Notes

This document is a template-shaped restatement of `module-field-extraction/uom/business-rules.md`
(`UOM-RULE-001` through `021`, post-amendment) — every `BR-###` cites its source `UOM-RULE-###` and
carries forward the same Confidence/severity nuance rather than flattening it into false certainty.
No rule here was re-derived independently of that fact base. BR-020 was added in a later amendment
pass (ADR-190) after this document's original approval; BR-001 was amended in a further later
amendment pass (ADR-191) for case-insensitive, create-and-rename uniqueness checking. BR-013 and
BR-014 were amended, and BR-021 added, in a third amendment pass (ADR-192) closing the four
remaining Non-blocking field-extraction questions. None of these amendments were part of the
original review.
