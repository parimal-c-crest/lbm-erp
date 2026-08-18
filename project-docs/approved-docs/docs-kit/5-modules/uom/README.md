# 5-modules/uom

> **Purpose**
>
> Full business specification for the UOM (Unit of Measure) module — the M3 foundation module that
> defines the units a product can be bought, sold, stocked, priced, picked, and reported in, and
> exclusively owns the conversion arithmetic that moves a quantity or price between any of those
> units and a product's Base unit. Every transactional module (SalesOrder, PurchaseOrder, Receiving,
> StoreTransfer, Manufacturing, Kits, SalesHistory, Settings, Pricing) consumes UOM's service rather
> than reading its tables directly (ADR-053).

## Contents

| # | File | Covers |
|---|---|---|
| 1 | `1-module.md` | Business specification — purpose, actors, requirements, dependencies, risks. Start here. |
| 2 | `2-functional-specification.md` | System behavior per feature (FR-001–FR-011). |
| 3 | `3-business-rules.md` | The 19-rule catalog (BR-001–019), decision tables, calculations, state transitions. |
| 4 | `4-schema.md` | PostgreSQL schema (Prisma) — 8 entities, tables, relationships, constraints. |
| 5 | `5-data-dictionary.md` | Business meaning, ownership, lifecycle of every data element. |
| 6 | `6-validation.md` | Field/cross-field/business/import/API validation rules (VR-001–017). |
| 7 | `7-permissions.md` | Who can manage UOM's own data — Admin-only CRUD, role-based read access to the conversion service. |
| 8 | `8-api.md` | REST contract — `/api/v1/uom/*` endpoints, DTOs, auth requirements. |
| 9 | `9-ui.md` | Screens, forms, components, interactions, states. |
| 10 | `10-implementation-plan.md` | Build phases (schema → backend → frontend → testing → docs). |
| 11 | `11-testing.md` | Test specification with full traceability, including cross-module chain tests. |

## Source material

- Legacy blueprint: `project-docs/sot-docs/raw/2-module-specs/UOM/`
- Field-extraction adaptation: `project-docs/claude-docs/analysis/module-field-extraction/uom/`
  (`entities-and-fields.md`, `business-rules.md`, `workflow.md`, `open-questions.md`)
- Governing ADRs: ADR-002, ADR-006, ADR-029 (pricing block), ADR-040, ADR-053, ADR-056, ADR-094
  through ADR-098, ADR-161 — `decisions-log.md`. ADR-096 carries a same-session Amendment resolving
  `UOMTypeFactorHistory`'s key shape to (Group, Type).

## Review note

All 11 documents were reviewed together on 2026-08-18 and approved as drafted — no rejections, no
in-review corrections required (unlike the Users module's first pass). Every cross-cutting statement
(role names, ID conventions, module-boundary rule) was checked against `decisions-log.md` and found
to match exactly, not restate or diverge. The two items originally flagged Blocking in
`open-questions.md` (`UOMTypeFactorHistory`'s key shape; missing-conversion-factor behavior) were
already resolved with the developer before this batch was drafted, and are reflected consistently
across all 11 documents (see `3-business-rules.md` BR-019 and `4-schema.md` §3
`UOMTypeFactorHistory`). Several Non-blocking open items remain deliberately open across the batch
(`UOMType.category_id`, `UOMFunctionalRole`/`UOMGroup` delete-guard extension, picking-hierarchy
flag/row consistency, Group-name case-sensitivity) — each is flagged consistently wherever it
surfaces (schema, business rules, validation, testing) rather than silently resolved in one document
and ignored in another. See `review-log.md` for the full review record.
