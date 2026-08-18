# T-073 — UOM schema migration

Status: 5/5 complete

- [x] Add 8 UOM models to `prisma/schema.prisma` per `4-schema.md` §4 exactly (columns, FKs, RESTRICT/CASCADE, indexes, CHECK constraint on `units_per_base`)
- [x] Case-insensitive functional unique index on `uom_groups (lower(name))` where `is_deleted=false` (hand-written migration SQL — Prisma has no native functional/partial index syntax)
- [x] Generate migration, apply to skeleton DB (`prisma migrate deploy`) — avoided `migrate dev` due to pre-existing unrelated `holidays` drift that would trigger a destructive reset prompt
- [x] Seed the 11 starter Functional Roles (ADR-094) via the migration's own INSERT (skeleton + fanned out to `wbc`/`demo` tenants via `migrate:fanout`)
- [x] Verify `prisma generate` succeeds and client types are available
