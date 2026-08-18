# EPIC-002 — Platform Administration (Skeleton Control Panel) — Design

> Working draft. Generated outside the per-module `5-modules/` JIT cycle
> (`1-project/3-feature-breakdown.md` §10 note) — this epic has no module slug. References
> ADR-056/057/058/059 (already locked) plus ADR-182 through ADR-185 (this design pass).

---

## 1. Scope (ADR-182)

Exactly 4 capabilities, matching `task-list.md`/`3-feature-breakdown.md` FEAT-015:

1. Tenant provisioning
2. Migration fanout
3. Super Admin accounts
4. Cron/job management

Explicitly **not** in scope here (deferred, own future epic): Update Manager (ADR-060), maintenance
mode/lock (ADR-061/062), pre-deploy backup (ADR-065), live-to-testing clone (ADR-066).

---

## 2. Data model

### `TenantRegistry` — skeleton database only

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `subdomain` | string, unique | e.g. `wbc`, `skeleton` |
| `database_url` | string | full Postgres connection string |
| `type` | enum: `live` \| `demo` \| `testing` | ADR-056 |
| `runtime_mode` | enum: `live` \| `sandbox` | ADR-058 |
| `created_at` | timestamptz | |

### `User` — every tenant database, incl. skeleton (ADR-185)

Minimal bootstrap shape; Users module (M3) extends this table, doesn't replace it.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK, ADR-005 |
| `email` | string, unique | |
| `password_hash` | string | bcrypt, ADR-014 |
| `role` | string | starter catalog, ADR-002/057 |
| `is_super_admin` | boolean | ADR-057 |
| `created_at` / `updated_at` | timestamptz | ADR-005 |
| `created_by` / `updated_by` | UUID, FK to `User`, nullable | self-referential on bootstrap row |
| `is_deleted` / `deleted_at` | boolean / timestamptz, nullable | ADR-005 |

No `tenant_id` (ADR-073) — isolation is physical (separate database).

---

## 3. Tenant resolution (ADR-183)

```
Request → Host header → subdomain extracted
        → TenantRegistry lookup (skeleton DB, always-connected)
        → cached PrismaClient for that tenant (via @prisma/adapter-pg + pg.Pool)
        → attached to request context (AsyncLocalStorage)
        → downstream services read tenant client from context, not a global PrismaService
```

Replaces `backend/src/prisma/prisma.service.ts`'s current single-static-URL client.

---

## 4. Local dev topology (ADR-184)

| Database | Role |
|---|---|
| `lbm_erp_skeleton` | Skeleton — `TenantRegistry` + clone-source schema/seed data |
| `lbm_erp_dev` | First example/demo tenant (repurposed from T-005, was empty) |
| *(a 2nd tenant DB, created via real provisioning during this epic's own verification)* | Proves the flow end-to-end |

---

## 5. Provisioning flow

```
Super Admin submits { subdomain, type } from control panel
   → CREATE DATABASE ... TEMPLATE (clone skeleton's current schema + seed data)
   → insert TenantRegistry row
   → insert bootstrap User row (Super Admin) into the new tenant database
```

---

## 6. Migration fanout (ADR-056's own stated mechanism)

```
for tenant in TenantRegistry (skeleton first, then filtered by type: testing → demo → live):
    run `prisma migrate deploy` against tenant.database_url
    on failure: halt, don't touch remaining tenants
```

Staged-by-type rollout from the control panel (testing tenants first, then demo, then live) is the
standard path, not an edge case (ADR-056).

---

## 7. Cron/job management (ADR-059)

- Job list: name, master enable/disable, per-tenant enable/disable.
- Per-tenant schedule offset (staggering — avoids every tenant's heavy job firing simultaneously).
- Run history: timestamp, status, duration — filterable by job/tenant/date/status.
- Timezone reference: tenant's primary/default Location's Timezone field (ADR-059).
- Mechanism: BullMQ repeatable jobs, per-tenant delay/offset baked into schedule config.
- Access: skeleton's own Super Admin only (ADR-059) — no tenant-level Super Admin can manage cron.

---

## 8. Control panel UI

- Gated: `subdomain === 'skeleton'` **and** `is_super_admin === true`.
- Same Next.js/NestJS codebase as tenant-facing app — not a separate deployable.
- Screens: Tenant list/create (§5), Migration fanout trigger (§6), Cron management (§7).

---

## 9. Open items for implementation-time (not blocking this design)

- Exact `CREATE DATABASE ... TEMPLATE` mechanics depend on final hosting choice (AWS RDS support for
  template cloning within one instance, ADR-071) — local dev uses plain Postgres `CREATE DATABASE
  ... TEMPLATE`, which works identically.
- BullMQ job definitions themselves (which jobs exist, their actual work) are per-consuming-module
  concerns, not this epic's — this epic only builds the management panel/scheduling infrastructure.
