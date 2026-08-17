# 2-database

> **Purpose**
>
> Defines the global database architecture and standards that apply across the entire project. Individual modules reference these standards but document their own table-level detail in `5-modules/<module>/4-schema.md`.

Templates live in `templates/`. Requires `1-project/` to be filled in first.

## Contents

| # | File | Covers |
|---|---|---|
| 1 | `templates/1-database-design.md` | Logical and physical database design — architecture, entities, relationships, indexing strategy, constraints. |
| 2 | `templates/2-erd.md` | High-level Entity Relationship Diagram — entities, relationships, cardinality. Table-level detail belongs in each module's `schema.md`. |
| 3 | `templates/3-migration-strategy.md` | How schema changes are created, reviewed, and deployed safely across environments. |
| 4 | `templates/4-database-standards.md` | Naming conventions, data integrity, and consistency rules developers and AI tools must follow. |

## Note

This folder sets the rules; it does not contain any single module's actual tables. For a specific feature's schema, see `5-modules/<module-name>/4-schema.md`.
