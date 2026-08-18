# 5-modules/users

> **Purpose**
>
> Full business specification for the Users module — the ERP's identity/RBAC backbone
> (authentication, role/profile/permission management, time clock/payroll, personal days/holidays,
> and a set of smaller self-contained features). Gates every other module's authorization behavior;
> built first in M3.

## Contents

| # | File | Covers |
|---|---|---|
| 1 | `1-module.md` | Business specification — purpose, actors, requirements, dependencies, risks. Start here. |
| 2 | `2-functional-specification.md` | System behavior per feature (FR-001–FR-013). |
| 3 | `3-business-rules.md` | The 66-rule catalog's new-system disposition, decision tables, calculations, state machine. |
| 4 | `4-schema.md` | PostgreSQL schema (Prisma) — entities, tables, relationships, constraints. |
| 5 | `5-data-dictionary.md` | Business meaning, ownership, lifecycle of every data element. |
| 6 | `6-validation.md` | Field/cross-field/business/import/API validation rules. |
| 7 | `7-permissions.md` | Who can manage this module's own data (Users/Roles/Profiles/Groups). |
| 8 | `8-api.md` | REST contract — endpoints, DTOs, auth requirements. |
| 9 | `9-ui.md` | Screens, forms, components, interactions, states. |
| 10 | `10-implementation-plan.md` | Build phases, rule-to-enforcement mapping, security-by-construction mitigations. |
| 11 | `11-testing.md` | Test specification with full traceability. |

## Source material

- Legacy blueprint (eight-pass extraction against the live legacy system):
  `project-docs/sot-docs/raw/2-module-specs/Users/`
- Field-extraction adaptation (formally adopts the blueprint as this module's field-extraction
  pass): `project-docs/claude-docs/analysis/module-field-extraction/users/`
- Governing ADRs: ADR-002, ADR-005/073, ADR-006, ADR-014, ADR-036/037, ADR-057, ADR-074–078,
  ADR-081, ADR-134, ADR-154–157, ADR-174, ADR-185–187 — `decisions-log.md`.

## Review note

v1.0 of this document set was drafted without first checking `decisions-log.md` for module-specific
ADRs already covering Users (14 existed, unchecked). The review pass that promoted these documents
(2026-08-18) found and corrected 7 real conflicts — most significantly, an entire Sharing Rule
subsystem was designed and documented (schema, permissions, API, UI, tests) for a feature ADR-081
had already decided to drop entirely. See each document's own Revision History for its specific
corrections, and `review-log.md` for the full review record.
