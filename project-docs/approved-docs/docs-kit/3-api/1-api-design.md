# API Design

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | LBM ERP Rewrite |
| API Style | REST |
| Version | 1.0 |
| Status | Approved |
| Author | Claude Code (docs-kit generation) |
| Created Date | 2026-08-17 |
| Last Updated | 2026-08-17 |
| Approved By | Claude Code review (`4-document-review/1-document-review.md`, 2026-08-17) |

---

# 1. Executive Summary

One public REST API surface (`/api/v1/...`) consumed identically by the Next.js frontend, third-party
integrations, and internal system-to-system calls — no privileged internal-only API.
[Source: `1-project/4-tech-stack.md` §5] JWT (access+refresh) authenticates users; hashed/scoped/
rate-limited API keys authenticate third-party/system callers, through the same endpoints and Guards.
[Source: `decisions-log.md` ADR-006] Every tenant is reached at its own subdomain
(`<tenant>.omnna-lbm.live`), which resolves the request to that tenant's own database connection before
any endpoint logic runs. [Source: `decisions-log.md` ADR-056]

---

# 2. API Overview

## API Type

REST

## Base URL

```
https://<tenant-subdomain>.omnna-lbm.live/api/v1
```

Example: `https://wbc.omnna-lbm.live/api/v1/sales-orders`. The subdomain is not a path prefix
convenience — it is how the request resolves to the correct physical tenant database.
[Source: `decisions-log.md` ADR-056]

## Protocol

HTTPS only.

## Data Format

JSON.

## Character Encoding

UTF-8.

---

# 3. API Design Principles

- Resource-oriented endpoints, plural nouns, no verbs in the path.
- Stateless communication — every request carries its own auth (JWT or API key), no server-side
  session state.
- Standard HTTP methods and status codes (§7, §10).
- Consistent response envelope (`5-response-standards.md`).
- Versioned from day one (`/api/v1/...`). [Source: `1-project/4-tech-stack.md` §5]
- Idempotent where applicable (`PUT`, `DELETE`).
- Secure by default — every write endpoint gated by a server-side Guard, no exceptions.
  [Source: `decisions-log.md` ADR-006]

---

# 4. Authentication & Authorization

Full detail in `2-authentication.md` and `3-authorization.md`. Summary:

- **Authentication**: JWT (access + refresh token pair) for interactive users; hashed/scoped/
  rate-limited API keys for third-party/system callers — same endpoints, same Guards, no separate
  internal-only surface. [Source: `1-project/4-tech-stack.md` §6]
- **Authorization**: Role-Based Access Control (RBAC), per the tenant-configurable starter role catalog
  (ADR-002), plus Super Admin as a distinct, separately-scoped axis for platform support access
  (ADR-057) — never assigned to a tenant's own business users.

---

# 5. API Resources

| Resource | Description |
|----------|-------------|
| Auth | Login, token refresh, logout, password reset, 2FA |
| Users | Identity, roles, permissions, time-clock |
| Locations | Branches, quantity-on-hand |
| Products | Catalog, variants, categories |
| Vendors | Suppliers, line codes |
| Sales Orders | Order capture, quotes, fulfillment |
| Search Line Items | Materialized SalesOrder line read-model (system-generated, no manual create/edit — ADR-112) |
| Purchase Orders | PO lifecycle, receiving, reconciliation |
| Purchase Line Items | Materialized PurchaseOrder line read-model (system-generated, no manual edit — ADR-121) |
| Sales History | Per-product/location weekly accumulator (system-generated) |
| Purchase History | Per-product/location weekly accumulator (system-generated) |
| Pricing | Unified plans, price sheets, promotions (ADR-029) |
| UOM | Categories, units, conversions |
| Accounts | Customer/company hub, billing, credit |
| Account Statements | Statement generation/delivery |
| Settings | Configuration, split by category (ADR-048) |
| Audit Log | Read-only, role-gated (ADR-068) |

---

# 6. Endpoint Standards

```
GET    /sales-orders
GET    /sales-orders/{id}
POST   /sales-orders
PATCH  /sales-orders/{id}
DELETE /sales-orders/{id}
```

Guidelines:
- Plural resource names, lowercase, hyphenated for multi-word resources (`purchase-orders`, not
  `purchaseOrders` or `purchase_orders`).
- Nouns, not verbs — an action that doesn't fit CRUD (e.g. "finalize" a sales order) is a sub-resource
  or a `POST` to an action endpoint (`POST /sales-orders/{id}/finalize`), not a new top-level verb
  endpoint.
- No deeply nested resources beyond one level (`/sales-orders/{id}/line-items`, not
  `/accounts/{id}/sales-orders/{id}/line-items/{id}`).
- System-generated, read-only resources (SearchLineItem, PurchaseLineItem, SalesHistory,
  PurchaseHistory) expose `GET` only — no `POST`/`PATCH`/`DELETE`, closing the legacy pattern where
  these were nominally editable with no real business justification. [Source: `decisions-log.md`
  ADR-112, ADR-121]

---

# 7. HTTP Methods

| Method | Purpose |
|---------|----------|
| GET | Retrieve data |
| POST | Create a resource, or trigger a non-CRUD action (e.g. finalize) |
| PATCH | Partial update (preferred over `PUT` — most updates are partial in this domain) |
| DELETE | Soft-delete a resource (never a hard delete — `1-database-design.md` §8) |

`PUT` is not used — every update in this domain is naturally partial (e.g. updating one line item on an
order), so `PATCH` is the standard, not `PUT` replace-whole-resource semantics.

---

# 8. Request Standards

```
Authorization: Bearer <jwt-access-token>          (users)
Authorization: Bearer <api-key>                    (third-party/system)
Content-Type: application/json
Accept: application/json
```

- Headers: `Authorization` required on every endpoint except `POST /auth/login` and
  `POST /auth/forgot-password`.
- Query parameters: pagination/filtering/sorting/search (§12).
- Path parameters: resource `id` (UUID).
- Request body: JSON, validated server-side via NestJS `ValidationPipe`/DTOs before reaching any
  business logic — never trusted as-is.

---

# 9. Response Standards

Full detail in `5-response-standards.md`. Summary:

## Success Response

```json
{
  "success": true,
  "message": "Sales order created successfully.",
  "data": {},
  "meta": {}
}
```

## Error Response

```json
{
  "success": false,
  "message": "Validation failed.",
  "error_code": "VALIDATION_ERROR",
  "errors": []
}
```

---

# 10. HTTP Status Codes

| Status | Meaning |
|---------|----------|
| 200 | OK |
| 201 | Created |
| 202 | Accepted (async job queued — e.g. a large export, ADR-098) |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict (e.g. concurrent-edit lock held by another user, ADR-079/080/084) |
| 422 | Validation Error |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

---

# 11. Validation Standards

- Every field documented as "required" in a module's business-rules catalog is genuinely enforced
  server-side (NestJS `ValidationPipe`/`class-validator`), never client-side-only — closes the legacy
  pattern of documented-but-unenforced required fields. [Source: `1-project/2-requirements.md` §8]
- Type/range validation on every numeric field, especially accumulator/delta fields (closes the legacy
  silent-type-coercion pattern, SalesHistory SLH-RULE-004).
- Enum fields validated against the actual current value set (e.g. PurchaseOrder's status enum,
  ADR-142) — never a free string accepted and only checked at read time.
- File validation (uploads) checks MIME type and size before accepting, never trusting a client-sent
  extension alone.

---

# 12. Pagination, Filtering & Sorting

**Cursor-based pagination**, not offset/page-number — required at the confirmed legacy scale (~2M
products × 15 locations); offset pagination degrades badly at that size. [Source: `decisions-log.md`
ADR-093]

```
?cursor=<opaque-cursor>
&limit=20
```

Filtering:
```
?status=active
```

Sorting:
```
?sort=name
?sort=-created_at
```

Searching (product/line-item search specifically uses the shared search architecture, not a generic
`?search=` filter — see `decisions-log.md` ADR-093):
```
?search=keyword
```

Export scope (bulk import/export endpoints, per ADR-098) is itself a query parameter, not a separate
endpoint per scope:
```
?export_scope=current_page | filtered | all
```

---

# 13. Versioning Strategy

Full detail in `8-api-versioning.md`. URI versioning, `/api/v1/...`, from day one.
[Source: `1-project/4-tech-stack.md` §5]

---

# 14. Error Handling

Full detail in `6-error-handling.md`. Summary: validation, authentication, authorization, business,
and system errors are distinct categories, each mapped to a stable HTTP status and `error_code`, never
exposing internal implementation detail (stack traces, SQL) to the client.

---

# 15. Rate Limiting

- **100 requests/minute** per authenticated user.
- **300 requests/minute** per API key (third-party/system callers — a higher ceiling since one
  integration often represents many end users' worth of traffic).
- Exceeding the threshold returns HTTP 429.

[Source: `decisions-log.md` ADR-175]

---

# 16. Security Standards

- HTTPS only, no exceptions.
- JWT authentication (users) / hashed API keys (third-party), same Guards.
  [Source: `1-project/4-tech-stack.md` §6]
- Password hashing: bcrypt. [Source: `decisions-log.md` ADR-014]
- Input validation on every endpoint (§11).
- Parameterized queries only — no raw string-interpolated SQL anywhere, closing the legacy system's
  confirmed SQL-injection pattern found in every audited module. [Source: `decisions-log.md` ADR-006]
- XSS protection: output encoding on any rendered field (frontend responsibility, but API never returns
  unescaped user input into an HTML-rendering context by convention).
- CORS policy: locked to the project's own frontend origin(s) (per-tenant subdomain) only — no
  third-party allowlist. Third-party/system access is via API key, server-to-server, which is outside
  CORS's scope entirely (a browser-only mechanism). [Source: `decisions-log.md` ADR-176]

---

# 17. Performance Standards

- Cursor-based pagination for all collection endpoints at scale. [Source: `decisions-log.md` ADR-093]
- Response compression (gzip) — standard technical default, not a business decision requiring
  developer input.
- Caching: Redis, for frequent/repeated searches specifically (ADR-093); general response caching is
  evaluated per-endpoint as each module's own JIT `8-api.md` is generated.
- Database query optimization per `2-database/`'s indexing strategy.
- Asynchronous processing (BullMQ) for any outbound integration with no confirmed synchronous
  requirement. [Source: `decisions-log.md` ADR-031]

---

# 18. API Documentation

- OpenAPI/Swagger, generated from NestJS decorators — `9-openapi.yaml` in this batch is the initial
  hand-authored baseline; the real implementation generates it from code annotations, kept in sync.
  [Source: `1-project/4-tech-stack.md` §5]
- Postman collection (`10-postman-collection.json`), mirrors the OpenAPI spec's endpoint set exactly.
- Example requests/responses included per endpoint at each module's own JIT `8-api.md` stage.

---

# 19. Monitoring & Logging

- Every request logged (method, endpoint, status, latency).
- Every create/update/delete action, every login, and every read/view access captured in the
  project-wide audit trail — not just writes. [Source: `decisions-log.md` ADR-068]
- Error logging per `6-error-handling.md` §14.
- API usage metrics tracked per tenant (given the database-per-tenant model, per-tenant load is a
  natural monitoring boundary). [Source: `decisions-log.md` ADR-056]

---

# 20. Assumptions

- Response compression and general endpoint-level caching decisions are treated as standard technical
  defaults, not requiring developer sign-off individually — only project-wide security/business-facing
  policies (rate limits, CORS) are flagged for input.
- Detailed per-endpoint request/response schemas for each of the 15 modules generate at that module's
  own JIT `8-api.md` cycle; this document defines the shared contract they all follow.

---

# 21. Constraints

- REST APIs only, JSON payloads only, HTTPS required.
- UTF-8 encoding.
- Authentication mandatory on every endpoint except login/password-reset-request.
- One shared endpoint set for frontend, third-party, and internal callers — no privileged internal-only
  API. [Source: `1-project/4-tech-stack.md` §5]

---

# 22. Related Documents

`1-project/2-requirements.md`, `1-project/4-tech-stack.md`, `2-database/1-database-design.md`,
`2-authentication.md`, `3-authorization.md`, `4-query-standards.md`, `5-response-standards.md`,
`6-error-handling.md`, `7-api-development-standards.md`, `8-api-versioning.md`, `9-openapi.yaml`,
`10-postman-collection.json`

---

# 23. Revision History

| Version | Date | Author | Description |
|----------|------|--------|-------------|
| 1.0 | 2026-08-17 | Claude Code | Initial draft |

---

# Approval

| Role | Name | Status | Date |
|------|------|--------|------|
| Solution Architect | *(pending)* | | |
| Technical Lead | *(pending)* | | |
| API Lead | *(pending)* | | |

---

# AI Generation Notes

Project-wide API architecture only — module-specific endpoints generate per module in
`5-modules/<slug>/8-api.md` at JIT time. Rate-limit thresholds (§15) and CORS origin policy (§16) were
flagged as genuinely open, resolved with the developer this session, and are now stated directly
(ADR-175/176). No open `[NEEDS INPUT]` markers remain.
