# Query Standards

> **Purpose**
>
> This document defines the standards and best practices for writing, optimizing, and maintaining database queries throughout the project. It ensures consistency, readability, security, performance, and maintainability across all SQL statements used by the application.

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | |
| Database | PostgreSQL |
| ORM / Query Builder | |
| Version | |
| Status | Draft / Review / Approved |
| Author | |
| Created Date | |
| Last Updated | |

---

# 1. Executive Summary

Provide a high-level overview of the project's database query standards.

Include:

- Query consistency
- Performance optimization
- Security
- Maintainability
- Coding conventions

---

# 2. Objectives

The query standards aim to:

- Improve query readability.
- Maintain consistent coding practices.
- Reduce database load.
- Improve application performance.
- Prevent security vulnerabilities.
- Simplify debugging and maintenance.

---

# 3. Query Design Principles

All queries should follow these principles.

- Keep queries simple.
- Retrieve only required columns.
- Prefer readable SQL over clever SQL.
- Write deterministic queries.
- Avoid duplicate logic.
- Optimize for maintainability.
- Follow database normalization principles.

---

# 4. Query Naming Standards

When naming reusable queries, views, procedures, or repository methods:

Examples

```
findUserById()

findActiveProducts()

getCustomerOrders()

updateInventory()

deleteExpiredSessions()
```

Naming Rules

- Use meaningful names.
- Follow project naming conventions.
- Avoid abbreviations.
- Clearly describe intent.

---

# 5. SELECT Standards

Guidelines

- Never use `SELECT *` in production.
- Select only required columns.
- Always specify table aliases when joining.
- Apply filtering whenever possible.
- Use LIMIT for paginated results.

Example

```sql
SELECT
    id,
    first_name,
    last_name,
    email
FROM users
WHERE status = 'ACTIVE';
```

---

# 6. JOIN Standards

Use joins appropriately.

Preferred order

- INNER JOIN
- LEFT JOIN
- RIGHT JOIN (only if necessary)
- FULL JOIN (rarely)

Guidelines

- Join using indexed columns.
- Avoid unnecessary joins.
- Limit join depth.
- Alias tables consistently.

---

# 7. Filtering Standards

Guidelines

- Filter as early as possible.
- Use indexed columns.
- Avoid unnecessary OR conditions.
- Prefer EXISTS over IN for large datasets when appropriate.

Example

```sql
WHERE status = 'ACTIVE'
AND deleted_at IS NULL
```

---

# 8. Sorting Standards

Guidelines

- Always specify ORDER BY when ordering matters.
- Sort using indexed columns when possible.
- Avoid sorting large unfiltered datasets.

Example

```sql
ORDER BY created_at DESC
```

---

# 9. Pagination Standards

Recommended approach

Offset Pagination

```sql
LIMIT 20 OFFSET 40
```

Keyset Pagination (Preferred for large datasets)

```sql
WHERE id > :last_id
ORDER BY id
LIMIT 20
```

---

# 10. Aggregation Standards

Examples

- COUNT
- SUM
- AVG
- MIN
- MAX

Guidelines

- Aggregate only required data.
- Use GROUP BY carefully.
- Avoid unnecessary aggregate calculations.

---

# 11. Transaction Standards

Use transactions for:

- Multi-step updates
- Financial operations
- Inventory updates
- Critical business operations

Guidelines

- Keep transactions short.
- Avoid long-running transactions.
- Roll back on failure.

---

# 12. Parameterization Standards

Never concatenate SQL.

Preferred

```sql
SELECT *
FROM users
WHERE email = :email;
```

Avoid

```sql
SELECT *
FROM users
WHERE email = '" + email + "'";
```

---

# 13. Performance Standards

Guidelines

- Retrieve only required columns.
- Avoid full table scans.
- Optimize joins.
- Use indexes efficiently.
- Batch updates where possible.
- Minimize repeated queries.

---

# 14. Index Usage Guidelines

Queries should:

- Utilize indexed columns.
- Avoid functions on indexed fields.
- Avoid wildcard searches at the beginning of strings.
- Analyze execution plans for slow queries.

---

# 15. Security Standards

Queries must:

- Use parameterized statements.
- Prevent SQL injection.
- Validate user input.
- Enforce authorization before execution.
- Never expose sensitive information.

---

# 16. Soft Delete Standards

Queries should exclude soft-deleted records unless explicitly required.

Example

```sql
WHERE deleted_at IS NULL
```

---

# 17. Audit Query Standards

Audit queries should:

- Record user activity.
- Capture timestamps.
- Store user identifiers.
- Avoid modifying audit history.

---

# 18. ORM / Query Builder Standards

If using an ORM or query builder:

- Prefer ORM for standard CRUD.
- Use raw SQL only when justified.
- Keep repository methods focused.
- Avoid embedding SQL throughout the application.
- Document complex queries.

---

# 19. Query Review Checklist

Before approving a query, verify:

- Only required columns selected.
- Uses parameterized inputs.
- Uses indexes efficiently.
- Filters applied correctly.
- No unnecessary joins.
- Pagination implemented where appropriate.
- Authorization enforced.
- Performance reviewed.
- Query documented if complex.

---

# 20. Common Anti-Patterns

Avoid:

- SELECT *
- N+1 queries
- Cartesian joins
- Unbounded result sets
- Long-running transactions
- Duplicate query logic
- Dynamic SQL concatenation
- Missing indexes
- Nested queries without justification

---

# 21. Assumptions

-

-

-

---

# 22. Constraints

Examples

- PostgreSQL database
- Parameterized queries mandatory
- Soft delete supported
- ORM preferred for CRUD operations
- Complex SQL requires review

---

# 23. Related Documents

- Database Design
- Database Standards
- Schema Design
- Data Dictionary
- Indexing Strategy
- Migration Strategy
- API Design
- Security Standards
- Coding Standards

---

# 24. Revision History

| Version | Date | Author | Description |
|----------|------|--------|-------------|
| 1.0 | | | Initial Draft |

---

# Approval

| Role | Name | Status | Date |
|------|------|--------|------|
| Database Architect | | | |
| Solution Architect | | | |
| Technical Lead | | | |

---

# AI Generation Notes

When generating this document, the AI should:

- Follow PostgreSQL best practices and project coding standards.
- Recommend parameterized queries for all database interactions.
- Optimize queries for readability, maintainability, and performance.
- Encourage efficient use of indexes and execution plans.
- Prefer ORM/query builder for standard CRUD operations while allowing raw SQL only for justified performance or complexity.
- Keep query standards implementation-independent where possible.
- Ensure consistency with Database Design, Database Standards, Indexing Strategy, Security Standards, and Coding Standards.