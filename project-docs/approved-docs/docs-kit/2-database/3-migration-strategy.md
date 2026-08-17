# Migration Strategy

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | LBM ERP Rewrite |
| Database | PostgreSQL |
| Migration Tool | Prisma Migrate |
| Version | 1.0 |
| Status | Approved |
| Author | Claude Code (docs-kit generation) |
| Created Date | 2026-08-17 |
| Last Updated | 2026-08-17 |
| Approved By | Claude Code review (`4-document-review/1-document-review.md`, 2026-08-17) |

---

# 1. Executive Summary

Prisma Migrate, run in a **sequential fanout loop across every tenant database** — the defining
difference from a single-database project. Every migration applies to `skeleton` first, then to every
real tenant database in turn; one failure halts the run before touching the rest, so tenants never end
up on divergent schema versions. New-tenant provisioning clones `skeleton`'s current state rather than
replaying full migration history from zero. [Source: `decisions-log.md` ADR-056]

---

# 2. Migration Objectives

- Keep every tenant database's schema in lockstep — schema drift between tenants is not acceptable.
  [Source: `decisions-log.md` ADR-056]
- Support automated, repeatable deployments (no manual production schema changes).
- Ensure safe schema evolution with rollback capability.
- Preserve existing tenant data through every migration.
- Keep `skeleton` always reflecting current expected schema, so it stays valid as the next new-tenant
  clone source. [Source: `decisions-log.md` ADR-056]

---

# 3. Migration Tool

| Item | Value |
|------|-------|
| Framework | NestJS |
| ORM | Prisma |
| Migration Tool | Prisma Migrate |
| Version | Latest stable at implementation start [Source: `decisions-log.md` ADR-020] |

---

# 4. Migration Principles

- One logical schema change per migration.
- Every migration must be reversible where feasible; where a migration is genuinely irreversible (e.g.
  a destructive column drop), that is stated explicitly in the migration itself, not discovered at
  rollback time.
- Never modify an executed migration — write a new one instead.
- Migrations are deterministic and re-runnable against `skeleton` as the canonical source of truth.
- No manual database changes outside the migration framework, in any environment, including Local.

---

# 5. Migration Workflow

1. Create migration locally against a developer's own database (schema authored in Prisma schema
   file, `prisma migrate dev` generates the SQL).
2. Review migration (code review, same as any other change — per `6-development/4-git-workflow.md`).
3. Execute against `skeleton` first.
4. Validate against `skeleton`.
5. Commit to repository.
6. Deploy: fan out to every real tenant database, staged by tenant type (testing → demo → live), via
   the skeleton-hosted control panel. [Source: `decisions-log.md` ADR-056]
7. Post-deployment `prisma migrate status` check per tenant (BullMQ job) as a drift-detection pass.
   [Source: `decisions-log.md` ADR-056]

---

# 6. Migration Types

| Type | Description |
|------|--------------|
| Schema Migration | Create or modify database objects — the majority of migrations in this project |
| Data Migration | Transform existing data (e.g. a one-time backfill) |
| Seed Migration | Insert default/seed data into `skeleton` only (new tenants inherit it automatically via the clone-on-provision flow — not a separate per-tenant seed step) [Source: `decisions-log.md` ADR-056] |
| Reference Data Migration | Populate lookup tables (e.g. default role catalog, UOM base units) |
| Hotfix Migration | Emergency production fix — still goes through the same fanout mechanism, staged by tenant type, never applied directly to a single tenant out-of-band |

---

# 7. Versioning Strategy

Prisma Migrate's own timestamp-based migration folder naming (its native convention, not a custom
scheme):

```
20260817120000_create_users_table
20260817133000_add_status_to_sales_orders
```

---

# 8. Naming Conventions

Migration folder names — Prisma Migrate default, descriptive, snake_case:

```
create_users_table
create_roles_table
add_status_to_purchase_orders
drop_tenant_id_column
```

(No separate "migration class" naming — Prisma Migrate generates plain SQL migration files, not
class-based migrations like an ORM such as Laravel's.)

---

# 9. Rollback Strategy

- Reverse schema changes via a new forward migration where the change is safely reversible (e.g. adding
  a column back after a drop, re-widening a narrowed type) — Prisma Migrate does not auto-generate
  "down" migrations, so a rollback is itself an authored, reviewed migration.
- Preserve production data as the default priority — a migration that would lose data on rollback
  states this explicitly before it's approved.
- A failed fanout run halts before reaching remaining tenants (§1) — the tenants already migrated are
  rolled back via a new corrective migration, not by attempting to "undo" Prisma's applied migration
  state directly on each already-updated tenant database.
- Validate against `skeleton` and at least one staged/testing-type tenant before any rollback touches a
  live tenant.

---

# 10. Seed Data Strategy

Seed data lives in `skeleton` only — every new tenant inherits it automatically because provisioning
clones `skeleton` wholesale (schema **and** data), not a schema-only copy. [Source: `decisions-log.md`
ADR-056]

- Default role catalog (ADR-002's starter roles)
- Default Settings values (e.g. protected "System" theme, ADR-064)
- Default picklists/config values
- UOM base units and standard conversions

---

# 11. Environment Strategy

Five environments exist: Local, DS (Dev Server), SS (Staging Server), Pre-SS (Pre-Staging), Production.
[Source: `decisions-log.md` ADR-069]

| Environment | Migration Policy |
|-------------|------------------|
| Local | Developer runs `prisma migrate dev` against their own local database(s); not fanned out |
| DS | Fanned out to DS's own tenant set (isolated from other environments, ADR-069) |
| SS | Fanned out to SS's own tenant set |
| Pre-SS | Fanned out to Pre-SS's own tenant set, last gate before Production |
| Production | Fanned out via the staged tenant-type rollout (testing → demo → live) through the skeleton control panel, never applied directly per-tenant |

---

# 12. Deployment Strategy

1. Migration applied to `skeleton` first (deployment order — see §1).
2. AWS RDS automated backup/PITR is the safety net, not a custom pre-migration backup step — delegated
   to the hosting provider. [Source: `decisions-log.md` ADR-070]
3. Fanout to real tenant databases, staged by type via the control panel (testing, then demo, then
   live) — de-risks a bad migration by surfacing it against non-live tenants first.
   [Source: `decisions-log.md` ADR-056]
4. Post-deployment `prisma migrate status` verification per tenant.
5. Periodic drift-detection check (BullMQ job) beyond the immediate post-deploy verification.
   [Source: `decisions-log.md` ADR-056]

---

# 13. Validation Checklist

Before executing a fanout run, verify:

- Migration reviewed.
- Rollback approach identified (new corrective migration, per §9).
- Tested against `skeleton` and at least one testing-type tenant.
- AWS RDS backup/PITR confirmed available for the target environment (delegated safety net, not a
  manual step — verify it's actually configured, don't assume).
- No unexpected data loss expected — explicitly called out if a migration is destructive.
- Dependencies identified (does this migration depend on a prior one already having fanned out fully?).

---

# 14. Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Fanout script itself not yet built | Cannot safely deploy any real migration to multiple tenants without it | Recommended shape captured (ADR-056); building the actual orchestration script is a `6-development/` implementation task, tracked as a blocker before that category's late-wave work depends on it |
| A migration reaches a live tenant before a defect is caught | Data corruption/downtime on real tenant data | Staged rollout by tenant type (testing → demo → live) is the standard path, not an edge case [Source: `decisions-log.md` ADR-056] |
| Long-running migration locks tables on a high-volume tenant | Temporary unavailability during deploy | Schedule fanout during low-traffic windows per tenant; keep migrations small (§15) |
| Schema drift between tenants if a fanout run partially fails | Divergent behavior/bugs specific to one tenant | Sequential fanout halts on first failure (§1); periodic `prisma migrate status` drift check (§12) |

---

# 15. Best Practices

- Keep migrations small — one logical change each.
- Avoid combining unrelated schema changes in one migration.
- Test every migration against `skeleton` and at least one non-live tenant before fanning out further.
- Review the generated SQL before execution, not just the Prisma schema diff.
- Never edit an already-executed migration.
- Document any migration whose rollback is genuinely destructive.
- Keep seed data (in `skeleton`) separate from schema migrations.

---

# 16. Assumptions

- The exact fanout orchestration script (sequential runner, per-tenant failure handling, drift-check
  scheduling) is designed in `6-development/`, not fully specified here — this document states the
  required behavior, not the implementation.
- Tenant count at any given time is read from `skeleton.tenant_registry`, filtered by type for staged
  rollout — the registry itself is `6-development/`'s and this module's own implementation detail.

---

# 17. Constraints

- PostgreSQL only.
- Version-controlled migrations only — no manual production schema changes.
- Every migration must be safe to run against `skeleton` and every real tenant database, in sequence,
  without per-tenant customization (a genuinely tenant-specific schema is out of scope — the model
  keeps schema identical across tenants, only data differs). [Source: `decisions-log.md` ADR-056]

---

# 18. Related Documents

`1-database-design.md`, `2-erd.md`, `4-database-standards.md`, `1-project/4-tech-stack.md`,
`claude-docs/gap-analysis/decisions-log.md` (ADR-056, ADR-070)

---

# 19. Revision History

| Version | Date | Author | Description |
|----------|------|--------|-------------|
| 1.0 | 2026-08-17 | Claude Code | Initial draft |

---

# Approval

| Role | Name | Status | Date |
|------|------|--------|------|
| Database Architect | *(pending)* | | |
| Technical Lead | *(pending)* | | |
| DevOps Engineer | *(pending)* | | |

---

# AI Generation Notes

Migration tool is Prisma Migrate per `1-project/4-tech-stack.md`; every engine/tool-specific detail
(versioning scheme, seed strategy, rollback approach) is adapted to Prisma Migrate specifically, not
copied from the template's generic Laravel-style example. The database-per-tenant fanout requirement is
this document's defining departure from a standard single-database migration strategy. No open
`[NEEDS INPUT]` markers remain — the fanout orchestration script itself is correctly scoped as a
`6-development/` implementation detail, not a gap in this document.
