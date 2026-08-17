# Database Standards

> **Purpose**
>
> This document defines the database development standards and conventions that must be followed throughout the project. It ensures consistency, maintainability, performance, data integrity, and scalability across all database objects and implementations.

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | |
| Database | PostgreSQL |
| Version | |
| Status | Draft / Review / Approved |
| Author | |
| Created Date | |
| Last Updated | |

---

# 1. Executive Summary

Provide a high-level overview of the database standards adopted for the project.

Include:

- Database design philosophy
- Naming consistency
- Performance standards
- Security standards
- Development best practices

---

# 2. Design Principles

Define the core database design principles.

Examples

- Normalize data to Third Normal Form (3NF)
- Avoid redundant data
- Maintain referential integrity
- Use UUID primary keys
- Support soft deletion
- Maintain audit history
- Optimize for readability and maintainability

---

# 3. Naming Conventions

## Tables

Examples

- snake_case
- plural nouns
- Meaningful names

Examples

```
users
products
order_items
customer_addresses
```

---

## Columns

Examples

- snake_case
- Descriptive names
- No abbreviations unless standardized

Examples

```
first_name
last_name
created_at
updated_at
deleted_at
status
```

---

## Primary Keys

Standard

```
id UUID PRIMARY KEY
```

---

## Foreign Keys

Examples

```
user_id
product_id
category_id
order_id
```

---

## Indexes

Examples

```
idx_users_email
idx_products_name
idx_orders_status
```

---

## Constraints

Examples

```
pk_users
fk_orders_customer
uq_users_email
chk_product_price
```

---

# 4. Standard Columns

Unless otherwise specified, every table should include:

| Column | Type | Description |
|----------|------|-------------|
| id | UUID | Primary Key |
| created_at | Timestamp | Record creation time |
| updated_at | Timestamp | Last modified time |
| deleted_at | Timestamp | Soft delete timestamp |
| created_by | UUID | User reference |
| updated_by | UUID | User reference |

---

# 5. Data Types

Define preferred PostgreSQL data types.

| Purpose | Data Type |
|----------|-----------|
| Primary Key | UUID |
| Name | VARCHAR |
| Description | TEXT |
| Boolean | BOOLEAN |
| Integer | INTEGER |
| Decimal | NUMERIC |
| Date | DATE |
| Date & Time | TIMESTAMP WITH TIME ZONE |
| JSON | JSONB |

---

# 6. Constraints

Apply appropriate constraints.

Examples

- Primary Key
- Foreign Key
- Unique
- NOT NULL
- CHECK
- DEFAULT

---

# 7. Indexing Standards

Guidelines for indexes.

Examples

- Index primary keys
- Index foreign keys
- Index frequently searched columns
- Avoid unnecessary indexes
- Use composite indexes only when beneficial

---

# 8. Relationships

Relationship standards.

Examples

- One-to-One
- One-to-Many
- Many-to-Many (using junction tables)

Always enforce foreign key constraints unless justified otherwise.

---

# 9. Audit Standards

Every auditable table should support:

- created_at
- updated_at
- created_by
- updated_by
- deleted_at (soft delete)

Optional

- deleted_by
- version
- audit_logs

---

# 10. Security Standards

Examples

- Store passwords using secure hashing.
- Never store plaintext passwords.
- Encrypt sensitive information where required.
- Restrict direct database access.
- Apply least-privilege principles.

---

# 11. Performance Standards

Examples

- Optimize indexes.
- Avoid unnecessary joins.
- Minimize full table scans.
- Use pagination for large datasets.
- Optimize frequently executed queries.

---

# 12. Data Integrity Standards

Examples

- Enforce foreign keys.
- Prevent orphan records.
- Validate required data.
- Use transactions for multi-step operations.
- Maintain referential integrity.

---

# 13. Soft Delete Standards

Define soft delete policy.

Examples

- Use `deleted_at`
- Exclude deleted records by default
- Avoid permanent deletion unless approved

---

# 14. Backup & Recovery Standards

Examples

- Daily backups
- Point-in-time recovery
- Backup verification
- Disaster recovery procedures

---

# 15. Best Practices

Examples

- Keep schemas normalized.
- Use meaningful names.
- Document complex structures.
- Keep migrations small.
- Avoid duplicate data.
- Use lookup tables where appropriate.
- Review database changes before deployment.

---

# 16. Assumptions

-

-

-

---

# 17. Constraints

Examples

- PostgreSQL database only
- UUID primary keys
- UTF-8 encoding
- UTC timestamps
- Soft delete required

---

# 18. Related Documents

- Project Overview
- Requirements
- Database Design
- ER Diagram
- Migration Strategy
- Schema Design
- Data Dictionary
- API Design

---

# 19. Revision History

| Version | Date | Author | Description |
|----------|------|--------|-------------|
| 1.0 | | | Initial Draft |

---

# Approval

| Role | Name | Status | Date |
|------|------|--------|------|
| Database Architect | | | |
| Technical Lead | | | |
| Solution Architect | | | |

---

# AI Generation Notes

When generating this document, the AI should:

- Follow PostgreSQL best practices and project architecture.
- Apply consistent naming conventions across all database objects.
- Recommend normalized schemas unless otherwise specified.
- Define standard columns for auditability and soft deletion.
- Encourage referential integrity and appropriate indexing.
- Keep standards technology-specific but implementation-independent.
- Ensure consistency with the Database Design, Migration Strategy, Schema Design, and Data Dictionary documents.
- Do not include project-specific table definitions; those belong in the Schema Design document.