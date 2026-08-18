# UOM — Field Extraction: Workflow / Lifecycle

**Origin: 1 (extracted-from-existing-system)** — adapted from the existing UOM legacy blueprint at
`project-docs/sot-docs/raw/2-module-specs/UOM/workflows.md`.

## Applicability — per-entity assessment (this module has no single unified lifecycle)

None of the seven UOM entities (`UOMCategory`, `UOMType`, `UOMGroup`, `UOMFunctionalRole`,
`UOMRoleAssignment`, `UOMConversionFactor`, `UOMTypeFactorHistory`, `UOMPickingHierarchy` — eight,
correcting the count) carries a multi-state status field or an approval workflow. Legacy confirmed
this explicitly ("no status or lifecycle model exists" — `workflows.md` §Applicability in the source
blueprint), and nothing in decisions-log.md's UOM-related ADRs introduces one. This document states
that explicitly rather than omitting the file, per this task's instruction, and documents the one
real piece of lifecycle behavior that does exist: the **soft-delete guard state**, now tightened
from an application-level check to a database-enforced constraint (UOM-RULE-014), plus the
**Group-setup sequencing** implied by UOM-RULE-002/003 (Base Type must exist before other role
assignments/conversion factors are meaningful).

## Entity: `UOMCategory`, `UOMType`, `UOMFunctionalRole`, `UOMGroup`

### States

| State | Meaning |
|---|---|
| Active (`is_deleted = false`) | Row is live and usable by any consumer through UOM's service (UOM-RULE-015). |
| Soft-deleted (`is_deleted = true`) | Row is hidden from normal use; not physically removed. |

### Transitions

| From | To | Trigger | Guard Condition | Side Effects |
|---|---|---|---|---|
| Active | Soft-deleted (`UOMType`) | Delete request via UOM's own service | Database-enforced `RESTRICT`: no `UOMGroup.base_type_id`, `UOMRoleAssignment.type_id`, `UOMConversionFactor.type_id`, or `UOMPickingHierarchy.type_id` row references this type (UOM-RULE-014) | `is_deleted` set true, `updated_by`/`updated_at` stamped; cascades a Pricing fixed-price-override deletion for this type if one exists (UOM-RULE-016) |
| Active | Soft-deleted (`UOMCategory`) | Delete request via UOM's own service | Database-enforced `RESTRICT`: no `UOMGroup.category_id` row references this category (UOM-RULE-014) | `is_deleted` set true, audit columns stamped |
| Active | Soft-deleted (`UOMFunctionalRole`) | Delete request via UOM's own service | Database-enforced `RESTRICT`: no `UOMRoleAssignment.role_id` row references this role (UOM-RULE-014, extended to this new entity — **Confirmed** by **ADR-192** / UOM-FX-OQ-007 this session; no longer an unconfirmed Inferred extension) | `is_deleted` set true, audit columns stamped |
| Active | Soft-deleted (`UOMGroup`) | Delete request via UOM's own service | No in-use guard was confirmed for Group deletion itself in either the legacy source or any ADR — a Group is the "leaf" of the reference chain from Products' perspective (a Product's `uom_group_id` references a Group), so deleting an in-use Group would orphan that Product reference. **Underspecified** — carried to `open-questions.md`. | `is_deleted` set true, audit columns stamped; cascade behavior toward Products' `uom_group_id` references is undetermined |

No reverse (restore) transition was confirmed in the legacy source, and none is introduced by any
ADR — same gap carried forward, not silently resolved (legacy: "No 'restore' UI path was confirmed
in this session's research beyond what `add_uom()`/`update_uom()` implement").

## Entity: `UOMRoleAssignment`, `UOMConversionFactor`, `UOMPickingHierarchy`

These are pure child/join records of a `UOMGroup` — no independent lifecycle beyond ordinary
create/update/delete, each individually unique-constrained (UOM-RULE-006, 011, 012). Deleting one of
these rows does not soft-delete — since these are pure join/factor records with no downstream
references of their own (nothing references a `UOMRoleAssignment` or `UOMConversionFactor` row by
ID), a hard delete is the more natural fit, though this is this document's own reasoning, not an
explicit ADR statement — flagged Non-blocking in `open-questions.md`.

## Entity: `UOMTypeFactorHistory`

Append-only — a new row is written whenever a `UOMConversionFactor.units_per_base` value changes
(UOM-RULE-009); existing rows are never updated or deleted (that would defeat the purpose of a rate
history). No delete/soft-delete transition applies to this entity.

## Group-setup sequencing (the closest thing to a "workflow" this module has)

Not a state machine, but a real create-time ordering constraint worth documenting as lifecycle
behavior:

1. **Category** created first (optional — a Group may have no Category, per the field catalog's
   "No" required flag on `UOMGroup.category_id`).
2. **Types** created (freely, admin-manageable, ADR-094) — independent of Group/Category.
3. **Group** created — **must** name a Base Type at this step (UOM-RULE-002); the Base Type must be
   the group's smallest unit (UOM-RULE-003).
4. **Functional Roles** — either pre-seeded (starter set) or admin-created independently of any
   specific Group (ADR-094).
5. **Role Assignments** — created for the Group, one per (Group, Functional Role) pair actually
   populated (UOM-RULE-011). Whether a Group is usable (assignable to a Product, usable in a
   transaction) with fewer than all roles populated — e.g. only Base and Selling — was never
   resolved by legacy or any ADR (legacy's own open question, restated in `open-questions.md`).
6. **Conversion Factors** — created for every non-Base Type the Group actually uses in any role or
   picking-hierarchy position (UOM-RULE-005/006).
7. **Picking Hierarchy rows** (optional, created last if the Group uses a picking breakdown) —
   referencing Types already known to the Group. **Note (ADR-192 / UOM-FX-OQ-005)**: there is no
   longer a separate `uses_picking_hierarchy` flag to set beforehand — "uses picking hierarchy" is a
   computed value (true once step 7's rows exist, false otherwise), not a precondition field checked
   before this step.

This sequence is inferred from the legacy screens-and-user-flows.md's own description of the Group
edit form's load order ("loads available UOM Types, the group's existing detail... and type-quantity
conversion factors... reorders the base-UOM row to display first, and loads picking-hierarchy data
when the picking-hierarchy flag is set") and from the schema-level dependencies each entity has on
the ones before it (a Role Assignment cannot reference a Group that doesn't exist yet, etc.) — it is
not itself a separately enforced state machine, just the natural order the required-field/FK
dependencies impose.

## State Diagram

```
[Type/Category/Role created] --(independent of any Group)--> [Active]

[Group created, Base Type required] --> [Active, Base assigned]
        |
        | (Role Assignments / Conversion Factors / Picking Hierarchy added incrementally,
        |  each independently unique-constrained — UOM-RULE-006/011/012)
        v
[Active, fully configured for whichever roles were assigned]

[Active] --delete (RESTRICT-guarded)--> [Soft-deleted]
   ^ guarded by in-use checks across all four reference points (UOM-RULE-014);
     no reverse/restore transition confirmed
```

## Coverage Statement

**Read in full**: `project-docs/sot-docs/raw/2-module-specs/UOM/workflows.md`,
`screens-and-user-flows.md`, `entities-and-fields.md`, and `risks-and-open-questions.md` (all in the
UOM legacy blueprint folder) — reused from the same full-folder reading pass documented in this
folder's `entities-and-fields.md` Coverage Statement. Cross-referenced against ADR-094 and ADR-096
(already read in full per the same pass).

**Not read**: legacy live PHP source (`add_uom()`/`update_uom()`/`delete_uom()` implementations
themselves) — this document relies on the legacy blueprint's own file:line citations for those
functions' behavior, not a fresh read of the functions. The Group-deletion cascade question (does
deleting a Group orphan a Product's `uom_group_id`?) was not traced into Products' own schema/rules,
since Products' own field-extraction has not yet been produced — flagged as an open item rather than
guessed at.
