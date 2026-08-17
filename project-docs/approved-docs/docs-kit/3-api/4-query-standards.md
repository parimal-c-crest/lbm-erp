# Query Standards

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | LBM ERP Rewrite |
| Database | PostgreSQL |
| ORM / Query Builder | Prisma |
| Version | 1.0 |
| Status | Approved |
| Author | Claude Code (docs-kit generation) |
| Created Date | 2026-08-17 |
| Last Updated | 2026-08-17 |
| Approved By | Claude Code review (`4-document-review/1-document-review.md`, 2026-08-17) |

---

# 1. Executive Summary

Prisma-mediated query conventions for a database-per-tenant PostgreSQL backend: every query executes
against the tenant database resolved from the inbound subdomain, never a fixed connection string.
[Source: `decisions-log.md` ADR-056] Parameterization is structural (Prisma never string-interpolates
SQL), directly closing the legacy system's confirmed SQL-injection pattern in every audited module.
[Source: `decisions-log.md` ADR-006]

---

# 2. Objectives

- Consistent query patterns across all 15 modules' repositories.
- Reduce database load via cursor-based pagination and targeted column selection.
- Structurally prevent SQL injection (Prisma's parameterized query builder, not string concatenation).
- Simplify debugging via Prisma's typed query API over raw SQL, except where raw SQL is explicitly
  justified.

---

# 3. Query Design Principles

- Keep queries simple — one Prisma call per logical data need, not a hand-assembled multi-step chain
  where a single `include`/`select` would do.
- Retrieve only required columns (`select`), never the whole row by default for list endpoints.
- Prefer Prisma's typed query builder over raw SQL; raw SQL only for a confirmed performance need
  (e.g. a full-text/trigram search query, ADR-093) or a query shape Prisma genuinely can't express.
- Write deterministic queries — explicit `orderBy`, never rely on unspecified row order.
- No duplicate query logic across repositories — one authoritative query per data need, reused.
  [Source: `decisions-log.md` ADR-030]

---

# 4. Query Naming Standards

Repository method naming, matching NestJS/Prisma-repository convention:

```
findSalesOrderById()
findActiveProducts()
getAccountStatements()
updateProductLocationQuantity()
softDeleteVendor()
```

- Meaningful names, no abbreviations.
- `find`/`get` for reads, `create`/`update`/`softDelete` for writes — never `delete` alone (soft delete
  is the uniform policy, `2-database/4-database-standards.md` §13).

---

# 5. SELECT Standards

- Never fetch the full row when only a few columns are needed — Prisma `select`, not the default
  full-model fetch, on any list endpoint.
- Always filter `is_deleted: false` unless the caller explicitly requests deleted records (e.g. an
  audit/history view).
- Use `LIMIT`/cursor bounds for every paginated result (§9).

```typescript
prisma.salesOrder.findMany({
  select: { id: true, accountId: true, status: true, createdAt: true },
  where: { isDeleted: false, status: 'ACTIVE' },
});
```

---

# 6. JOIN Standards

Preferred order (Prisma `include`/relation queries, not raw SQL joins, in the standard case):

- Direct relation `include` (Prisma-native) for the common case.
- Raw SQL `JOIN` only where Prisma's relation query genuinely can't express the needed shape or a
  confirmed performance profile requires it.

Guidelines:
- Join on indexed foreign key columns (every FK is indexed, `2-database/1-database-design.md` §10).
- Avoid unnecessary `include` depth — fetch only the related data the endpoint actually returns.
- Limit join/include depth to what one endpoint genuinely needs, not a maximal eager-load by default.

---

# 7. Filtering Standards

- Filter as early as possible — in the `where` clause, not in application code after fetching.
- Use indexed columns for filters wherever the access pattern justifies an index
  (`2-database/1-database-design.md` §10).
- Always exclude soft-deleted rows by default (§5).

```typescript
where: { status: 'ACTIVE', isDeleted: false }
```

---

# 8. Sorting Standards

- Always specify `orderBy` explicitly when order matters to the caller — never rely on insertion order.
- Sort on indexed columns where possible (`created_at`, `id`).
- Avoid sorting a large unfiltered dataset — combine with a `where` filter or cursor bound.

```typescript
orderBy: { createdAt: 'desc' }
```

---

# 9. Pagination Standards

**Cursor-based (keyset) pagination is the standard for every collection endpoint** — required at the
confirmed legacy scale (~2M products × 15 locations); offset pagination degrades badly at that size.
[Source: `decisions-log.md` ADR-093]

```typescript
prisma.product.findMany({
  take: 20,
  skip: cursor ? 1 : 0,
  cursor: cursor ? { id: cursor } : undefined,
  orderBy: { id: 'asc' },
});
```

Offset pagination (`?page=`/`?page_size=`) is not used project-wide, closing the legacy pattern that
caused the confirmed slow-list-page findings (Products list, product autocomplete).

---

# 10. Aggregation Standards

- `count`/`sum`/`avg`/`min`/`max` via Prisma's aggregate API, not manual application-side reduction over
  a fetched dataset.
- Aggregate only the required data — filter first, aggregate second.
- SalesHistory/PurchaseHistory accumulator totals are computed by the single authoritative aggregator
  service, never recomputed ad hoc by a consuming query. [Source: `decisions-log.md` ADR-030,
  ADR-119]

---

# 11. Transaction Standards

Use Prisma's `$transaction` for:
- Multi-step writes (e.g. SalesOrder finalize: order status change + SalesHistory event write +
  ProductTracking event write).
- Any operation touching a multi-writer accumulator's `<entity>_events` append-only table plus its
  parent aggregate row together (`2-database/1-database-design.md` §8).
- Concurrent-edit lock acquire/release paired with the actual write it protects.

Guidelines: keep transactions short (no external/network calls inside a transaction — those go through
the async job pattern instead, ADR-031); roll back fully on any step's failure.

---

# 12. Parameterization Standards

Structural, not a convention to remember — Prisma's query builder never accepts raw string
interpolation for values. Where raw SQL is genuinely used (§6), it must use Prisma's tagged-template
`$queryRaw` (parameterized) — never `$executeRawUnsafe`/string concatenation with user input.

Preferred:
```typescript
prisma.$queryRaw`SELECT * FROM products WHERE sku = ${sku}`;
```

Never:
```typescript
prisma.$executeRawUnsafe(`SELECT * FROM products WHERE sku = '${sku}'`);
```

This is the direct, structural closure of the legacy system's confirmed SQL-injection pattern (every
audited module had at least one live site). [Source: `decisions-log.md` ADR-006]

---

# 13. Performance Standards

- Select only required columns (§5).
- Avoid full table scans — every filtered/sorted query hits an index.
- Optimize joins (§6).
- Batch updates (Prisma `updateMany`) where a bulk operation applies, rather than N individual updates.
- Minimize repeated queries — no N+1 pattern (§20).

---

# 14. Index Usage Guidelines

- Every query's `where`/`orderBy` columns are checked against `2-database/1-database-design.md` §10's
  indexing strategy at that module's own JIT `4-schema.md` stage.
- Avoid wrapping an indexed column in a function in the query (defeats the index).
- Avoid leading-wildcard `LIKE '%term'` searches — product/line-item text search uses the shared
  trigram-indexed search architecture instead (ADR-093), not ad hoc `LIKE`.
- Slow queries get their execution plan (`EXPLAIN ANALYZE`) reviewed before being accepted, not after a
  production incident.

---

# 15. Security Standards

- Parameterized queries only (§12) — structural, not optional.
- Validate all user input before it reaches a query (NestJS `ValidationPipe`, per `1-api-design.md`
  §11).
- Authorization enforced before the query executes, not after (`3-authorization.md`).
- Never expose raw query errors/SQL to the client (`6-error-handling.md` §15).

---

# 16. Soft Delete Standards

Every query excludes soft-deleted records by default:

```typescript
where: { isDeleted: false }
```

An explicit `includeDeleted` flag (permission-gated — typically Admin/audit views only) is required to
see soft-deleted rows. [Source: `2-database/4-database-standards.md` §13]

---

# 17. Audit Query Standards

- Audit-log writes are append-only — no `UPDATE`/`DELETE` Prisma call is ever issued against
  `audit_log`, only `create`. [Source: `decisions-log.md` ADR-068]
- Audit queries capture user id, timestamp, action, and affected resource on every write.
- The 2-year-retention approval-gated purge is its own explicitly-reviewed operation, never a
  general-purpose delete path reused for anything else.

---

# 18. ORM / Query Builder Standards

- Prisma is the default for all standard CRUD — repositories wrap Prisma calls, not raw SQL, for the
  common case.
- Raw SQL (`$queryRaw`) only where justified (§6, §14) — documented inline with the reason when used.
- Repository methods stay focused (one data-access concern per method, not a grab-bag).
- Complex queries (multi-table aggregates, the shared search core) are documented in that module's own
  `8-api.md`.

---

# 19. Query Review Checklist

- Only required columns selected.
- Uses Prisma's parameterized query builder (or `$queryRaw` with parameters, never
  `$executeRawUnsafe`/concatenation).
- Uses indexed columns for filter/sort.
- Soft-deleted rows excluded by default.
- Cursor-based pagination for any collection result.
- No unnecessary joins/includes.
- Authorization enforced before the query runs.
- Transaction used for any multi-step write.
- Performance reviewed for anything touching a high-volume table (`audit_log`, `product_locations`).

---

# 20. Common Anti-Patterns

Avoid:
- Fetching full rows when only a few columns are needed.
- N+1 queries (a loop issuing one query per iteration instead of one batched `findMany`/`include`).
- Offset/page-number pagination on any collection endpoint (§9).
- Unbounded result sets (every `findMany` has a `take`/cursor bound).
- Long-running transactions (§11).
- Duplicate query logic across repositories (§3, ADR-030).
- Raw string-interpolated SQL (§12).
- Missing indexes on a genuinely hot filter/sort column.

---

# 21. Assumptions

- Per-module query patterns (e.g. the exact shape of SalesOrder's finalize transaction) are documented
  in each module's own JIT `8-api.md`, following these standards — not pre-decided here.

---

# 22. Constraints

- PostgreSQL, via Prisma.
- Parameterized queries mandatory, structural (not a style guideline).
- Soft delete supported/enforced on every table.
- Prisma preferred for CRUD; raw SQL requires a stated justification.

---

# 23. Related Documents

`2-database/1-database-design.md`, `2-database/4-database-standards.md`, `1-api-design.md`,
`claude-docs/gap-analysis/decisions-log.md` (ADR-006, ADR-030, ADR-093, ADR-119)

---

# 24. Revision History

| Version | Date | Author | Description |
|----------|------|--------|-------------|
| 1.0 | 2026-08-17 | Claude Code | Initial draft |

---

# Approval

| Role | Name | Status | Date |
|------|------|--------|------|
| Database Architect | *(pending)* | | |
| Solution Architect | *(pending)* | | |
| Technical Lead | *(pending)* | | |

---

# AI Generation Notes

Query standards specific to Prisma over PostgreSQL, per `1-project/4-tech-stack.md` — not the
template's generic engine-agnostic examples. Cursor-based pagination is mandatory project-wide (not
merely "preferred," as the template's own generic wording suggests), per ADR-093's confirmed real-scale
requirement. No open `[NEEDS INPUT]` markers.
