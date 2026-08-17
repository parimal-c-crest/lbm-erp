# 5-modules

> **Purpose**
>
> Contains the documentation for each individual business feature (module) — e.g. `authentication`, `users`, `products`, `orders`. Each module is documented as a self-contained unit using the standard 11-document set defined in `templates/`, so an AI tool or developer can implement one feature without needing to read the whole project.

Templates live in `templates/`. Requires `1-project/`, `2-database/`, `3-api/`, and `4-ui/` to be filled in first — modules reference those global standards rather than repeating them.

## Contents

| # | File | Covers |
|---|---|---|
| 1 | `templates/1-module.md` | Module overview — objectives, scope, actors, dependencies, business process. |
| 2 | `templates/2-functional-specification.md` | Detailed functional requirements, workflows, and acceptance criteria. |
| 3 | `templates/3-business-rules.md` | Business logic, constraints, calculations, operational rules. |
| 4 | `templates/4-schema.md` | Module-specific database schema, relationships, indexes. |
| 5 | `templates/5-data-dictionary.md` | Field definitions, data types, defaults, constraints. |
| 6 | `templates/6-validation.md` | Client-side, server-side, and business validation rules. |
| 7 | `templates/7-permissions.md` | Roles, permissions, authorization matrix, access rules. |
| 8 | `templates/8-api.md` | Module-specific REST endpoints, requests, responses, errors. |
| 9 | `templates/9-ui.md` | Screens, fields, user interactions, and UI behavior for this module. |
| 10 | `templates/10-implementation-plan.md` | Development tasks, milestones, dependencies, build sequence. |
| 11 | `templates/11-testing.md` | Test scenarios, acceptance tests, edge cases, regression tests. |

## Creating a New Module

1. Copy `templates/` into a new folder named after the module (lowercase, kebab-case — e.g. `orders/`, `sales-order/`).
2. Fill in the 11 documents **in the numbered order** — later documents may reference earlier ones, not the reverse.
3. Keep naming, API, database, and UI conventions consistent with the global standards in `1-project/`, `2-database/`, `3-api/`, and `4-ui/`.
4. Get the documentation reviewed/approved before implementation begins.
5. Keep the module's docs in sync with the code as it evolves.

## Module Independence

A developer or AI tool should be able to implement a module by reading only:
- The global standards (`1-project`, `2-database`, `3-api`, `4-ui`)
- This module's own 11 documents

— without needing to inspect other modules.
