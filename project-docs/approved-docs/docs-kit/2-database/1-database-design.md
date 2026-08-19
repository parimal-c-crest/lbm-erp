# Database Design

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

Relational PostgreSQL design, one physically separate database per tenant. Normalized (3NF) schema,
dual-key identity (internal `bigint` primary key + external `UUID`), uniform soft-delete and audit
columns, no dynamic-field/EAV mechanism anywhere
(closing a confirmed legacy pattern). Major entities group into 15 MVP business domains (SalesOrder,
Accounts, Users, Location, Products, Vendors, SearchLineItem, Settings, SalesHistory, PurchaseOrder,
PurchaseLineItem, PurchaseHistory, Pricing, UOM, AccountStatement) plus cross-cutting platform tables
(audit trail, tenant registry — the latter lives only in `skeleton`, not in tenant databases).
[Source: `claude-docs/analysis/module-list.md`, `decisions-log.md` ADR-056]

---

# 2. Database Overview

## Database Engine

PostgreSQL, latest stable major version at implementation start. [Source: `1-project/4-tech-stack.md`,
`decisions-log.md` ADR-020]

## Architecture

- Relational, normalized schema (3NF)
- **Database-per-tenant** — one physical PostgreSQL database per tenant, not one shared schema with a
  tenant-scoping column. [Source: `decisions-log.md` ADR-056, supersedes ADR-004]
- **Dual-key identity everywhere** — an internal `bigint` auto-increment primary key (`id`) that
  every foreign key references, plus an external `UUID` (`public_id`) that is the only identity
  ever exposed via API/URL/frontend. Closes the same legacy IDOR/enumeration class of finding
  (guessable auto-increment IDs) ADR-005 originally closed, while giving joins/indexes bigint-level
  performance and developers a small, typeable id for debugging. [Source: `decisions-log.md`
  ADR-200, supersedes ADR-005's single-UUID-PK rule]
- Soft delete on every table (`is_deleted`/`deleted_at`) — no hard deletes. [Source: `decisions-log.md`
  ADR-005]
- Uniform audit columns on every table (`created_at`/`updated_at`/`created_by`/`updated_by`), plus a
  separate project-wide audit-trail log for full read/write activity capture (not the same mechanism
  as the per-row audit columns). [Source: `decisions-log.md` ADR-005, ADR-068]
- No `tenant_id` column anywhere — isolation is physical (separate database per tenant), not row-level.
  [Source: `decisions-log.md` ADR-073]
- No dynamic-field/EAV mechanism — closes the legacy pattern found in SalesOrder, Products, and others.
  [Source: `1-project/2-requirements.md` §4 Maintainability]

---

# 3. Design Principles

- Third Normal Form (3NF) as the default; a documented, deliberate denormalization (e.g. a materialized
  read-model like SearchLineItem/PurchaseLineItem) is called out explicitly where it exists, not
  silently introduced.
- No duplicate formula/logic implementation — where a value is derived, it is computed once, in one
  place, not recomputed inconsistently by multiple writers. [Source: `decisions-log.md` ADR-030]
- Foreign key integrity enforced at the database level, not just application code.
- Soft delete uniform across every table — no per-module variation (the legacy system's inconsistency
  here, e.g. SalesHistory genuinely soft-deletes while Vendors has none, is closed by construction).
  [Source: `decisions-log.md` ADR-005]
- Dual-key identity (internal `bigint` PK + external `UUID`), consistent naming
  (`4-database-standards.md`, **ADR-200**).
- Physical tenant isolation instead of a shared-schema tenant-scoping column. [Source: `decisions-log.md`
  ADR-056, ADR-073]
- Append-only event tables plus an optimistic-lock `version` column wherever a derived/accumulated
  total has multiple historical writers (e.g. SalesHistory's, PurchaseHistory's activity counters) —
  the "single authoritative aggregator" pattern, not a new invention here but the standard approach
  everywhere the same shape recurs. [Source: `decisions-log.md` ADR-005, `SalesHistory/calculations.md`]

---

# 4. Entity Overview

High-level major entities per module domain. Full field-level catalogs are generated per module in
`5-modules/<slug>/4-schema.md` at that module's own JIT cycle — this table is an orientation map, not
the authoritative field list.

| Domain (Module) | Major Entities |
|---|---|
| SalesOrder | `sales_orders`, `sales_order_line_items` |
| Accounts | `accounts`, `account_contacts`, `payment_methods` |
| Users | `users`, `roles`, `permissions`, `role_permissions`, `time_clock_punches` |
| Location | `locations`, `product_locations` (quantity-on-hand) |
| Products | `products`, `product_variants`, `categories` |
| Vendors | `vendors`, `vendor_line_codes` |
| SearchLineItem | `search_line_items` (materialized read-model, SalesOrder is sole writer) |
| Settings | Split by category per ADR-048 — no single catch-all table (e.g. `settings_integrations`, `settings_currencies`, `settings_vdp_tiers`) |
| SalesHistory | `sales_history`, `sales_history_events` |
| PurchaseOrder | `purchase_orders` |
| PurchaseLineItem | `purchase_line_items` (materialized read-model, 6 writer call sites) |
| PurchaseHistory | `purchase_history`, `purchase_history_events` |
| Pricing (unified) | `pricing_plans`, `price_sheets`, `promotions`, `pricing_rules` |
| UOM | `uom_categories`, `uom_units`, `uom_conversions` |
| AccountStatement | `account_statements` |
| *(cross-cutting, every tenant database)* | `audit_log`, `audit_deletion_log` |
| *(`skeleton` database only, not per-tenant)* | `tenant_registry` — lives in skeleton, not replicated to individual tenant databases [Source: `decisions-log.md` ADR-056] |

[Source: `claude-docs/analysis/module-list.md`, `decisions-log.md` ADR-029 (Pricing unification),
ADR-048 (Settings split), ADR-068 (audit trail)]

---

# 5. Entity Relationships

High-level cross-domain relationships (full per-module relationships live in each module's own
`4-schema.md`):

| Parent Entity | Child Entity | Relationship |
|---|---|---|
| `roles` | `users` | One-to-Many |
| `locations` | `product_locations` | One-to-Many |
| `products` | `product_locations` | One-to-Many |
| `categories` | `products` | One-to-Many |
| `accounts` | `sales_orders` | One-to-Many |
| `sales_orders` | `sales_order_line_items` | One-to-Many |
| `products` | `sales_order_line_items` | One-to-Many |
| `sales_orders` | `search_line_items` | One-to-Many (materialized on finalize) |
| `vendors` | `purchase_orders` | One-to-Many |
| `purchase_orders` | `purchase_line_items` | One-to-Many (materialized on finalize) |
| `sales_orders` / `purchase_orders` | `sales_history` / `purchase_history` | One-to-Many (accumulator rows, written as a finalize side effect) |
| `pricing_plans` / `price_sheets` / `promotions` | `pricing_rules` | One-to-Many (all three feed the one unified precedence engine) |
| `uom_categories` | `uom_units` | One-to-Many |
| `accounts` | `account_statements` | One-to-Many |

---

# 6. Database Schema Overview

## Security
- `users`, `roles`, `permissions`, `role_permissions`

## Master Data
- `products`, `product_variants`, `categories`, `locations`, `vendors`, `vendor_line_codes`, `accounts`,
  `uom_categories`, `uom_units`, `uom_conversions`

## Transactions
- `sales_orders`, `sales_order_line_items`, `purchase_orders`, `search_line_items`,
  `purchase_line_items`, `account_statements`, `payment_methods`

## Reference / Pricing
- `pricing_plans`, `price_sheets`, `promotions`, `pricing_rules`

## Accumulators
- `sales_history`, `sales_history_events`, `purchase_history`, `purchase_history_events`,
  `product_locations` (quantity-on-hand ground truth)

## Configuration
- Settings tables, split by category per ADR-048

## Audit
- `audit_log`, `audit_deletion_log`

---

# 7. Naming Conventions

Full naming conventions live in `4-database-standards.md` — not restated here to avoid two documents
diverging. Summary: `snake_case`, plural table names, dual-key identity (`id` BIGINT primary key +
`public_id` UUID external identity, **ADR-200**), `<entity>_id` foreign keys typed BIGINT
referencing the related table's `id`.

---

# 8. Standard Columns

Every table includes, in addition to its business fields:

| Column | Type | Description |
|----------|------|-------------|
| `id` | BIGINT, `GENERATED ALWAYS AS IDENTITY` | Real primary key; every FK references this, never `public_id` (**ADR-200**) |
| `public_id` | UUID, unique (not primary) | The only identity exposed via API/URL/frontend (**ADR-200**) |
| `created_at` | `timestamptz` | Record creation time |
| `updated_at` | `timestamptz` | Last update time |
| `created_by` | BIGINT | FK to `users.id` |
| `updated_by` | BIGINT | FK to `users.id` |
| `is_deleted` | boolean, default `false` | Soft-delete flag |
| `deleted_at` | `timestamptz`, nullable | Soft-delete timestamp |

No `tenant_id` column — isolation is physical (separate database per tenant), not row-level.
[Source: `decisions-log.md` ADR-005, ADR-073]

Where a table is a derived/accumulated total with multiple historical writers (SalesHistory,
PurchaseHistory), it additionally gets a `version` optimistic-lock column and a companion append-only
`<entity>_events` table recording every contributing write. [Source: `decisions-log.md` ADR-005]

---

# 9. Constraints

- Primary keys: `id` (BIGINT), every table, per **ADR-200**; `public_id` (UUID) is a separate
  unique, non-primary column.
- Foreign keys: enforced at the database level, referencing the related table's `id`
  (never `public_id`), `ON DELETE RESTRICT` by default (soft-delete makes hard cascade deletes rare
  — see `4-database-standards.md` §8 for the specific relationship rules).
- Unique constraints: naturally scoped per-database now (no `(tenant_id, ...)` composite needed — see
  ADR-073).
- `CHECK` constraints: used wherever a legacy module's field-level validation was confirmed
  documented-but-unenforced (e.g. required fields not actually enforced at save time) — closing that
  class of finding at the schema level, not just in application code. [Source: `1-project/2-requirements.md`
  §8 Validation Requirements]
- `NOT NULL` on every column without a confirmed legitimate nullable case.

---

# 10. Indexing Strategy

- Every primary key and foreign key indexed.
- Frequently searched columns (e.g. product SKU/name) get a full-text/trigram index — backs the shared
  product-search architecture. [Source: `decisions-log.md` ADR-093]
- Unique indexes wherever a business key must be unique (e.g. Products' SKU, per ADR-092).
- Composite indexes only where a genuine multi-column query pattern justifies one — not applied
  speculatively.
- Cursor-based pagination (not offset/page-number) on every list endpoint expected to run at real
  legacy scale (~2M products × 15 locations) — offset pagination degrades badly at that size.
  [Source: `decisions-log.md` ADR-093]

---

# 11. Data Integrity

- Referential integrity enforced by real foreign keys, not application-level convention.
- Soft-delete is the uniform deletion policy — a "deleted" parent row does not orphan children; the
  application layer excludes soft-deleted rows by default (see `4-database-standards.md` §13).
- Concurrent-edit protection for editable records is enforced at the application layer (Redis TTL-based
  lock, not a database-level lock) — out of this document's scope, but relevant context: schema-level
  `version` columns exist only for the multi-writer-accumulator case above, not as a general
  optimistic-lock mechanism for every table. [Source: `decisions-log.md` ADR-079/080/084]
- Every field documented as "required" in a module's legacy field catalog is genuinely enforced at the
  database level (`NOT NULL`/`CHECK`), not just at the UI layer. [Source: `1-project/2-requirements.md`
  §8]

---

# 12. Performance Considerations

- Index optimization per §10.
- Cursor-based pagination for large lists (products, search results). [Source: `decisions-log.md`
  ADR-093]
- Connection pooling — required given the database-per-tenant model routes each request to a
  dynamically-resolved tenant connection at request time; pool sizing is a per-tenant-database concern,
  not one shared pool. [Source: `decisions-log.md` ADR-056]
- Partitioning: not applied by default; revisit per-table only if a specific table's real row volume
  (e.g. `audit_log`, `product_locations` at 72,104+ rows today) shows it's needed at implementation
  time — not decided speculatively here.

---

# 13. Security Considerations

- Least-privilege database roles/credentials per environment.
- Passwords hashed with bcrypt, never stored plaintext. [Source: `decisions-log.md` ADR-014]
- No plaintext credential/secret storage anywhere in the schema — closes the legacy AWS/payment-gateway
  plaintext findings. Settings' credential fields are encrypted at rest, not merely access-controlled.
  [Source: `Settings/risks-and-open-questions.md`]
- Sensitive fields (payment tokens) never store raw card data — CardConnect tokenized vault only.
  [Source: `decisions-log.md` ADR-007/008]
- Every read and write is captured in the project-wide audit trail (`audit_log`), role-gated for
  viewing. [Source: `decisions-log.md` ADR-068]

---

# 14. Backup & Recovery

Delegated entirely to the hosting provider's native capability (AWS RDS automated backups /
point-in-time recovery) — not a custom-built application-level backup system. This is an explicit
requirement on the hosting choice (AWS, ADR-071), not an optional nicety, given the project's own
originating incident was a real production data-loss event. [Source: `decisions-log.md` ADR-070]

---

# 15. Migration Strategy

Full detail in `3-migration-strategy.md`. Summary: Prisma Migrate, run in a sequential fanout loop —
`skeleton` database first, then every real tenant database in turn; one failure halts before touching
the rest. New-tenant provisioning clones `skeleton`'s current state rather than replaying migration
history from zero. [Source: `decisions-log.md` ADR-056]

---

# 16. Assumptions

- Every module's detailed field-level schema is generated at that module's own JIT `4-schema.md` cycle,
  consistent with the standard columns/conventions locked here — not re-decided per module.
- Settings' per-category table split (ADR-048) is finalized at Settings' own JIT cycle; this document
  states the principle (no single catch-all table), not the final category list.

---

# 17. Constraints

- PostgreSQL only, one database per tenant (not a single shared database). [Source: `decisions-log.md`
  ADR-056]
- UTF-8 encoding, UTC-stored timestamps (`timestamptz`).
- Maximum database size / specific performance targets: not specified in the SoT beyond the ~2M-product
  scale reference informing indexing/pagination decisions (ADR-093).

---

# 18. Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Database-per-tenant migration-fanout orchestration not yet designed | A bad migration could reach every tenant database before being caught | Recommended shape (Prisma Migrate fanout, staged by tenant type) captured in ADR-056; exact script is `3-migration-strategy.md`'s own responsibility to finalize |
| No partitioning strategy decided upfront for high-volume tables (`audit_log`, `product_locations`) | Possible performance degradation at real scale before a fix ships | Deliberately deferred, not ignored — revisit per-table once real volume is observed, not guessed now |
| Settings' final per-category table split not yet finalized | `5-modules/settings/4-schema.md` could diverge from this document's placeholder category examples | Resolved at Settings' own JIT cycle against ADR-048's stated principle |

---

# 19. Related Documents

`1-project/1-project-overview.md`, `1-project/2-requirements.md`, `1-project/3-feature-breakdown.md`,
`1-project/4-tech-stack.md`, `2-erd.md`, `3-migration-strategy.md`, `4-database-standards.md`,
`claude-docs/analysis/module-list.md`, `claude-docs/gap-analysis/decisions-log.md`

---

# 20. Revision History

| Version | Date | Author | Description |
|----------|------|--------|-------------|
| 1.0 | 2026-08-17 | Claude Code | Initial draft |
| 1.1 | 2026-08-19 | Claude Code | ADR-200: dual-key identity — `id` (internal `bigint`, real PK) + `public_id` (external `UUID`, only identity ever exposed) — replaces the single-UUID-PK rule, project-wide. |

---

# Approval

| Role | Name | Status | Date |
|------|------|--------|------|
| Solution Architect | *(pending)* | | |
| Database Architect | *(pending)* | | |
| Technical Lead | *(pending)* | | |

---

# AI Generation Notes

Project-wide database architecture and standards only — no single module's full table-level schema
lives here (those generate at each module's own JIT `4-schema.md` cycle). Every design decision traces
to a SoT source, an approved `1-project/` document, or a locked `decisions-log.md` ADR; no open
`[NEEDS INPUT]` markers remain.
