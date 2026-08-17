# API Development Standards

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | LBM ERP Rewrite |
| API Framework | NestJS |
| API Style | REST |
| Version | 1.0 |
| Status | Approved |
| Author | Claude Code (docs-kit generation) |
| Created Date | 2026-08-17 |
| Last Updated | 2026-08-17 |
| Approved By | Claude Code review (`4-document-review/1-document-review.md`, 2026-08-17) |

---

# 1. Executive Summary

NestJS's enforced structure (Modules, Guards, ValidationPipes) is chosen specifically to prevent the
legacy system's core failure mode — inconsistent, convention-only security practice — structurally
rather than relying on developer discipline. [Source: `1-project/4-tech-stack.md` §2] This document
translates that structure into concrete layer responsibilities, naming, and review standards.

---

# 2. Development Principles

- RESTful, resource-oriented design (`1-api-design.md` §3/§6).
- Stateless communication.
- Single Responsibility per class (controller/service/repository, §5).
- DRY — no duplicate formula/logic implementation. [Source: `decisions-log.md` ADR-030]
- Secure by default — every write Guard-enforced, no exceptions. [Source: `decisions-log.md` ADR-006]
- Dependency injection (NestJS-native) over manual instantiation.

---

# 3. Project Structure

```
backend/
├── src/
│   ├── modules/
│   │   ├── sales-order/
│   │   │   ├── sales-order.controller.ts
│   │   │   ├── sales-order.service.ts
│   │   │   ├── sales-order.repository.ts
│   │   │   ├── dto/
│   │   │   └── sales-order.module.ts
│   │   ├── products/
│   │   ├── ... (one folder per module, mirroring the 15 MVP modules 1:1)
│   ├── common/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── filters/
│   │   └── decorators/
│   ├── tenancy/                  (subdomain resolution, per-tenant Prisma client, ADR-056)
│   └── audit/                    (project-wide audit-trail module, ADR-068)
├── prisma/
└── test/
```

Module folder structure mirrors the Stage 2 module boundaries 1:1, so growth beyond the MVP-15 is
additive. [Source: `1-project/4-tech-stack.md` §12]

---

# 4. API Naming Standards

## Endpoints

```
GET    /sales-orders
POST   /sales-orders
GET    /sales-orders/{id}
PATCH  /sales-orders/{id}
DELETE /sales-orders/{id}
POST   /sales-orders/{id}/finalize
```

Guidelines: plural nouns, lowercase, hyphenated, no verbs except as an explicit sub-resource action
(`1-api-design.md` §6).

## Controller Naming

```
SalesOrderController
ProductController
PurchaseOrderController
```

## Service Naming

```
SalesOrderService
PricingService
UomConversionService
```

## Repository Naming

```
SalesOrderRepository
ProductRepository
```

---

# 5. Layer Responsibilities

| Layer | Responsibility |
|--------|----------------|
| Controller | HTTP request/response handling only — no business logic |
| Service | Business logic, orchestration (e.g. finalize's multi-table transaction) |
| Repository | Prisma-mediated database access only |
| DTO/Validator | Request validation (`class-validator`/`class-transformer`, `1-project/4-tech-stack.md` §16) |
| Guard | Authentication + authorization enforcement, per route |
| Interceptor | Cross-cutting concerns: response envelope shaping, audit-log write, request-id injection |

---

# 6. Request Processing Flow

```
Client
  │
  ▼
Subdomain resolution (tenant database connection)   [ADR-056]
  │
  ▼
Route
  │
  ▼
Authentication Guard (JWT / API key)
  │
  ▼
Authorization Guard (role/permission)
  │
  ▼
Concurrent-edit lock check (writes to editable records only)   [ADR-079/080/084]
  │
  ▼
Validation (DTO/ValidationPipe)
  │
  ▼
Controller
  │
  ▼
Service (business logic)
  │
  ▼
Repository (Prisma)
  │
  ▼
Tenant Database
```

---

# 7. Validation Standards

- Validate every input via `class-validator` DTOs — never trust client input.
- Validate before any business logic executes.
- Reuse shared validators (e.g. a UUID-format validator, a NUMERIC-quantity validator) across modules,
  not redefined per module.
- Return the standard validation-error shape (`5-response-standards.md` §6).

---

# 8. Business Logic Standards

- Lives in services, never in controllers.
- Reusable and unit-testable independent of the HTTP layer.
- No direct Prisma calls from a service — always through its repository.
- No duplicate business-rule implementation across services (e.g. a total-calculation formula lives in
  exactly one service, called by every consumer). [Source: `decisions-log.md` ADR-030]

---

# 9. Database Access Standards

- Repositories only, never a raw Prisma call from a controller or service directly.
- Parameterized queries structurally (`4-query-standards.md` §12).
- Transactions (`$transaction`) for multi-step writes (`4-query-standards.md` §11).
- No business logic inside a repository — data access only.

---

# 10. Response Standards

Per `5-response-standards.md`: one consistent JSON envelope, returned via a shared NestJS response
interceptor — not assembled ad hoc per controller method.

---

# 11. Exception Handling

Per `6-error-handling.md`: one centralized NestJS exception filter. Domain exceptions thrown from
services, caught and shaped once, not handled per-controller.

---

# 12. Logging Standards

Logged via the shared audit-trail module (`audit/`), not a bespoke per-module logger:

- Every API request (method, endpoint, status, latency, tenant, `request_id`)
- Authentication/authorization failures
- Business exceptions
- Database failures
- External service failures

[Source: `decisions-log.md` ADR-068]

---

# 13. Security Standards

- HTTPS required.
- Every input validated (§7).
- Every route authenticated + authorized (Guards, §6).
- Parameterized queries only, structurally preventing SQL injection.
- Rate limiting: 100 req/min per user, 300 req/min per API key — see `1-api-design.md` §15.
  [Source: `decisions-log.md` ADR-175]
- Sensitive data masked in logs (passwords, tokens, payment data never logged in plaintext).

---

# 14. Performance Standards

- Cursor-based pagination for every collection endpoint (`4-query-standards.md` §9).
- Database indexing per `2-database/1-database-design.md` §10.
- Query optimization reviewed for any endpoint touching a high-volume table.
- Response compression (gzip).
- Response caching: Redis, for confirmed hot paths (product search, ADR-093) — not applied blanket.
- Async processing (BullMQ) for non-blocking external calls. [Source: `decisions-log.md` ADR-031]
- Batch processing for bulk import/export (ADR-098).

---

# 15. Documentation Standards

Every endpoint documented with: purpose, request shape, response shape, parameters, validation rules,
error responses, authentication requirement, and an example — via NestJS decorators generating
`9-openapi.yaml`, kept in sync as the source of truth once implementation starts.
[Source: `1-project/4-tech-stack.md` §5]

---

# 16. Testing Standards

Per module's own `build-guidance.md` (JIT) plus this project-wide baseline:

- Unit tests (services, business logic).
- Integration tests (controller → service → repository → test database).
- Validation tests (DTO edge cases).
- Authentication/authorization tests (every Guard).
- Error-handling tests (every mapped exception → correct status/error_code).
- Rule-ID-traceable tests for anything tied to a numbered business rule.
- Golden-output tests for the pricing pipeline specifically (multi-source precedence, ADR-029).

[Source: `1-project/4-tech-stack.md` §10]

---

# 17. Version Control Standards

Full detail: `8-api-versioning.md`. Every endpoint versioned (`/api/v1/...`), backward compatibility
maintained within a version, changes logged.

---

# 18. Code Review Checklist

- RESTful endpoint design, correct HTTP method/status.
- Naming conventions (§4).
- Validation present and correct (§7).
- Authorization enforced, not assumed.
- Error handling matches `6-error-handling.md`.
- Logging present for the relevant events (§12).
- Performance: no N+1, correct pagination.
- OpenAPI documentation present/updated.
- Tests present per §16.
- No raw SQL without stated justification (`4-query-standards.md` §6).

---

# 19. Best Practices

- Thin controllers, focused services, data-only repositories (§5).
- No duplicated logic (ADR-030).
- Dependency injection over manual instantiation.
- Reusable, composable Guards/Interceptors/Pipes.
- Stateless throughout.
- Follow this document's conventions consistently across all 15 modules' JIT implementation.

---

# 20. Assumptions

- Per-module controller/service/repository detail (exact method signatures) is generated per module at
  JIT `8-api.md` time, following the layer/naming conventions locked here.

---

# 21. Constraints

- REST APIs only, JSON payloads.
- HTTPS mandatory.
- Authentication required on every endpoint except login/password-reset-request.
- Standard response format mandatory (`5-response-standards.md`).

---

# 22. Related Documents

`1-api-design.md`, `2-authentication.md`, `3-authorization.md`, `4-query-standards.md`,
`5-response-standards.md`, `6-error-handling.md`, `1-project/4-tech-stack.md`

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

NestJS-specific layered architecture (Controller/Service/Repository/Guard/Interceptor), not the
template's generic framework-agnostic example. Rate limiting resolved (ADR-175), consistent with
`1-api-design.md` §15. Module-specific implementation detail correctly deferred to each module's own
JIT `8-api.md`. No open `[NEEDS INPUT]` markers remain.
