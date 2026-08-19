# Database Standards

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | LBM ERP Rewrite |
| Database | PostgreSQL |
| Version | 1.0 |
| Status | Approved |
| Author | Claude Code (docs-kit generation) |
| Created Date | 2026-08-17 |
| Last Updated | 2026-08-17 |
| Approved By | Claude Code review (`4-document-review/1-document-review.md`, 2026-08-17) |

---

# 1. Executive Summary

Naming, typing, and integrity conventions every module's own `4-schema.md` must follow, so 15+ modules
generated independently at JIT time stay consistent instead of each reinventing its own convention —
directly closing the legacy system's own "every module does it differently" pattern (e.g. inconsistent
soft-delete enforcement, no shared audit-column set). [Source: `decisions-log.md` ADR-005]

---

# 2. Design Principles

- Normalize to Third Normal Form (3NF) by default; deliberate denormalization (materialized read-models
  like SearchLineItem/PurchaseLineItem) is called out explicitly, not silent.
- Avoid redundant data — no duplicate formula/logic implementation across tables/modules.
  [Source: `decisions-log.md` ADR-030]
- Maintain referential integrity via real foreign keys.
- **Dual-key identity, every table**: an internal `bigint` auto-increment primary key (`id`) that
  every foreign key references, plus an external `UUID` (`public_id`) that is the only identity
  ever exposed via API/URL/frontend — closes the legacy IDOR/enumeration class of finding exactly
  as ADR-005 originally did, while `id` gives join/index performance and developer-debugging
  ergonomics a single UUID-only PK doesn't. [Source: `decisions-log.md` ADR-200, supersedes
  ADR-005's single-UUID-PK rule]
- Soft delete uniform across every table.
- Full audit trail (both per-row audit columns and the separate project-wide `audit_log`).
  [Source: `decisions-log.md` ADR-005, ADR-068]
- Optimize for readability and maintainability over cleverness.

---

# 3. Naming Conventions

## Tables

`snake_case`, plural nouns, meaningful names — no abbreviations unless already standardized elsewhere
in this project's own vocabulary (e.g. `uom`, not a novel abbreviation).

```
sales_orders
purchase_order_line_items
account_statements
uom_conversions
```

## Columns

`snake_case`, descriptive, no abbreviations unless standardized:

```
first_name
last_name
created_at
updated_at
deleted_at
status
```

## Primary Keys

Dual-key, every table (**ADR-200**, supersedes ADR-005's single-UUID-PK rule):

```
id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
public_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid()
```

`id` is the real primary key — every foreign key across every table references it, never
`public_id`. `public_id` is a unique (not primary) column, and the **only** identity ever returned
in an API response, accepted as a request path/body parameter, or rendered in a frontend URL —
`id` is never exposed to a client. This keeps ADR-005's IDOR/enumeration protection fully intact
while giving joins/indexes bigint-level performance and developers a small, typeable id for
debugging (SQL console, logs, verbal reference).

## Foreign Keys

`<singular_entity>_id`, typed `BIGINT`, referencing the related table's `id` (not `public_id`):

```
account_id    BIGINT REFERENCES accounts(id)
product_id    BIGINT REFERENCES products(id)
category_id   BIGINT REFERENCES categories(id)
sales_order_id     BIGINT REFERENCES sales_orders(id)
purchase_order_id  BIGINT REFERENCES purchase_orders(id)
```

**Resolving a client-supplied UUID into the FK value**: any endpoint that accepts a related
record's `public_id` (UUID) from a request — e.g. "create this Product-at-Location for
`locationId: <public_id>`" — must resolve that `public_id` to its `id` before writing the FK
column. This is a required one-extra-lookup step on every such endpoint, not an implementation
detail to skip; audit for it explicitly during each module's Backend/API build, module by module.

## Indexes

`idx_<table>_<column(s)>`:

```
idx_sales_orders_account_id
idx_products_sku
idx_audit_log_created_at
```

## Constraints

```
pk_sales_orders
fk_sales_order_line_items_sales_order
uq_products_sku
chk_sales_order_line_items_quantity_positive
```

---

# 4. Standard Columns

Every table includes, unless explicitly stated otherwise for a genuine reason (e.g. a pure junction
table may skip business-audit columns if the relationship itself carries no independent lifecycle):

| Column | Type | Description |
|----------|------|-------------|
| `id` | `BIGINT`, `GENERATED ALWAYS AS IDENTITY` | Real primary key; every FK references this, never `public_id` (**ADR-200**) |
| `public_id` | UUID, unique (not primary) | The only identity exposed via API/URL/frontend (**ADR-200**) |
| `created_at` | `timestamptz` | Record creation time |
| `updated_at` | `timestamptz` | Last modified time |
| `created_by` | BIGINT (FK → `users.id`) | Who created the record |
| `updated_by` | BIGINT (FK → `users.id`) | Who last modified the record |
| `is_deleted` | boolean, default `false` | Soft-delete flag |
| `deleted_at` | `timestamptz`, nullable | Soft-delete timestamp |

No `tenant_id` — isolation is physical, one database per tenant, not a row-level scoping column.
[Source: `decisions-log.md` ADR-073, supersedes the `tenant_id` requirement in the original ADR-005]

A table backing a multi-writer derived total additionally gets `version` (integer, optimistic lock) and
a companion `<entity>_events` append-only table. [Source: `decisions-log.md` ADR-005]

---

# 5. Data Types

| Purpose | Data Type |
|----------|-----------|
| Primary Key (`id`) | `BIGINT`, `GENERATED ALWAYS AS IDENTITY` (**ADR-200**) |
| External identity (`public_id`) / foreign keys | `UUID` for `public_id`; `BIGINT` for FK columns, referencing the related table's `id` (**ADR-200**) |
| Short text (name, SKU, status) | `VARCHAR` |
| Long text (description, notes) | `TEXT` |
| Boolean | `BOOLEAN` |
| Whole numbers (counts) | `INTEGER` |
| Money / quantity (decimal-capable everywhere, per ADR-040) | `NUMERIC` — never `FLOAT`/`REAL` for anything financial or quantity-related |
| Date only | `DATE` |
| Date & time | `TIMESTAMP WITH TIME ZONE` (`timestamptz`) — UTC-stored, never a naive timestamp |
| Structured/flexible data | `JSONB` — used sparingly, never as a substitute for real columns (closes the legacy EAV/dynamic-field pattern) |

Quantity fields are decimal-capable everywhere (`NUMERIC`), not integer-only, per the confirmed legacy
gap where fractional UOM quantities needed a workaround. [Source: `decisions-log.md` ADR-040]

---

# 6. Constraints

- **Primary Key** — every table, `id` (`BIGINT`, dual-key per **ADR-200**); `public_id` (UUID) is
  a separate unique, non-primary column.
- **Foreign Key** — enforced at the database level for every real relationship, referencing the
  related table's `id`, never its `public_id`; never left as an unenforced application-level
  convention.
- **Unique** — wherever a business key must be unique (e.g. Products' SKU, per ADR-092); naturally
  scoped per-database now, not `(tenant_id, ...)`-composite. [Source: `decisions-log.md` ADR-073]
- **NOT NULL** — on every column without a confirmed legitimate nullable case; closes the legacy pattern
  of fields documented "required" but not actually enforced.
- **CHECK** — used for confirmed business-rule invariants at the schema level (e.g. quantity-on-hand
  never negative, per ADR-038's hard floor at zero).
- **DEFAULT** — set wherever a column has a genuine default (e.g. `is_deleted DEFAULT false`).

---

# 7. Indexing Standards

- Index every primary key (automatic) and foreign key.
- Index frequently searched/filtered columns — product SKU/name get a full-text/trigram index backing
  the shared search architecture. [Source: `decisions-log.md` ADR-093]
- Unique indexes wherever a business key must be unique.
- Composite indexes only where a genuine multi-column query pattern justifies one, confirmed at that
  module's own JIT cycle — not applied speculatively project-wide.
- Avoid unnecessary indexes — every index has a write-cost; add one only against a confirmed access
  pattern.

---

# 8. Relationships

- One-to-One: used sparingly, only where a genuine 1:1 split exists (e.g. a large optional
  sub-record).
- One-to-Many: the default shape for most relationships in this schema (see `2-erd.md` §5/§7).
- Many-to-Many: via an explicit junction table (e.g. `role_permissions`), never a comma-separated or
  JSON-array foreign-key substitute.
- Foreign key constraints always enforced unless a specific, documented reason exists (e.g. a
  soft-reference into a read-model table that's intentionally allowed to reference a since-deleted
  row for historical accuracy) — the exception is the rare case, not the default.

---

# 9. Audit Standards

Every table (per-row level, §4):
- `created_at`, `updated_at`, `created_by`, `updated_by`, `is_deleted`/`deleted_at`

Project-wide (separate mechanism, not per-row columns): `audit_log` captures every create/update/delete
action, every login, and every read/view access — not just writes. Viewing the audit log itself is a
role/permission-gated, assignable grant (not hardcoded to a specific role name, since roles are
tenant-configurable). Retention: 2 years, then flagged for deletion, requiring Super Admin **or** Admin
approval (one, not both) before actual purge — never a silent automatic purge. The deletion itself is
recorded, permanently, in a separate `audit_deletion_log` table (exempt from the 2-year rule by
construction, since it records the purge of the table that rule applies to).
[Source: `decisions-log.md` ADR-068]

---

# 10. Security Standards

- Passwords: bcrypt, never plaintext. [Source: `decisions-log.md` ADR-014]
- No plaintext credential/secret storage anywhere — Settings' integration credentials are encrypted at
  rest.
- Restrict direct database access — application connects via its own least-privilege role per
  environment/tenant, no shared superuser credential in application code.
- Payment data: tokenized only (CardConnect), never raw card numbers in any table.
  [Source: `decisions-log.md` ADR-007/008]

---

# 11. Performance Standards

- Optimize indexes per §7, against confirmed access patterns.
- Avoid unnecessary joins — denormalize deliberately (as a materialized read-model) where a hot path
  genuinely needs it, rather than joining across many tables on every request.
- Cursor-based pagination for large lists, never offset/page-number pagination at the confirmed legacy
  scale (~2M products × 15 locations). [Source: `decisions-log.md` ADR-093]
- Optimize frequently executed queries as they're identified per module, not speculatively upfront.

---

# 12. Data Integrity Standards

- Enforce foreign keys at the database level.
- Prevent orphan records — soft-delete means a "deleted" parent's children remain intact and
  attributable, never orphaned by a hard cascade delete.
- Validate required data at the database level (`NOT NULL`/`CHECK`), not only in application code.
- Use transactions for multi-step operations (e.g. finalize flows that write to more than one table).
- Maintain referential integrity across every relationship in `2-erd.md`.

---

# 13. Soft Delete Standards

- Every table uses `is_deleted`/`deleted_at` — uniform, no per-module variation.
- Application queries exclude soft-deleted records by default; an explicit "include deleted" flag is
  required to see them (e.g. for audit/history views).
- No permanent (hard) deletion anywhere, with one narrow exception: the audit-trail's own 2-year
  approval-gated purge (§9), which is itself logged separately, permanently. [Source: `decisions-log.md`
  ADR-068]

---

# 14. Backup & Recovery Standards

Delegated to the hosting provider's native capability (AWS RDS automated backups / point-in-time
recovery) — not a custom application-level backup system. [Source: `decisions-log.md` ADR-070]

- Automated backups, provider-managed.
- Point-in-time recovery available per tenant database.
- Backup verification and disaster-recovery procedure: hosting-provider responsibility, evaluated
  against AWS RDS's actual capability at implementation time. [Source: `decisions-log.md` ADR-071]

---

# 15. Best Practices

- Keep schemas normalized (3NF) by default.
- Use meaningful, unabbreviated names.
- Document any deliberate denormalization (materialized read-models) explicitly in that module's own
  `4-schema.md`.
- Keep migrations small (see `3-migration-strategy.md` §15).
- Avoid duplicate data/logic — one authoritative source per derived value. [Source: `decisions-log.md`
  ADR-030]
- Use lookup tables (e.g. `uom_units`, `categories`) rather than free-text/enum-in-column where the set
  of values is genuinely open-ended or admin-manageable.
- Review every schema change before deployment (per `3-migration-strategy.md`'s workflow).

---

# 16. Assumptions

- Per-module field-level detail (exact column lists, per-field validation) is generated at each
  module's own JIT `4-schema.md` cycle, following these standards — not pre-decided here.
- Settings' exact per-category table split (ADR-048) is finalized at Settings' own JIT cycle.

---

# 17. Constraints

- PostgreSQL database only, one per tenant.
- UUID primary keys, no exceptions.
- UTF-8 encoding, UTC-stored timestamps.
- Soft delete required on every table, no exceptions beyond the audit-deletion-log carve-out (§13).

---

# 18. Related Documents

`1-project/2-requirements.md`, `1-database-design.md`, `2-erd.md`, `3-migration-strategy.md`,
`claude-docs/gap-analysis/decisions-log.md`

---

# 19. Revision History

| Version | Date | Author | Description |
|----------|------|--------|-------------|
| 1.0 | 2026-08-17 | Claude Code | Initial draft |
| 1.1 | 2026-08-19 | Claude Code | ADR-200: dual-key identity — `id` (internal `bigint`, real PK, every FK references this) + `public_id` (external `UUID`, only identity ever exposed) — replaces the single-UUID-PK rule, project-wide. Primary Keys, Foreign Keys, Standard Columns, Data Types, Constraints sections updated. |

---

# Approval

| Role | Name | Status | Date |
|------|------|--------|------|
| Database Architect | *(pending)* | | |
| Technical Lead | *(pending)* | | |
| Solution Architect | *(pending)* | | |

---

# AI Generation Notes

Standards only, technology-specific to PostgreSQL but implementation-independent (no project-specific
table definitions — those belong in each module's own `4-schema.md`). Every convention traces to
`1-database-design.md` or a locked `decisions-log.md` ADR; no open `[NEEDS INPUT]` markers remain, and
nothing here contradicts `1-database-design.md`, `2-erd.md`, or `3-migration-strategy.md`.
