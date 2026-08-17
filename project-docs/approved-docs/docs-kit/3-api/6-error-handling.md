# Error Handling

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | LBM ERP Rewrite |
| API Standard | REST |
| Error Format | JSON |
| Version | 1.0 |
| Status | Approved |
| Author | Claude Code (docs-kit generation) |
| Created Date | 2026-08-17 |
| Last Updated | 2026-08-17 |
| Approved By | Claude Code review (`4-document-review/1-document-review.md`, 2026-08-17) |

---

# 1. Executive Summary

Centralized NestJS exception handling converts every error — validation, auth, business-rule, external
integration, or unexpected system failure — into the same predictable JSON shape
(`5-response-standards.md`), never exposing internal implementation detail. Business-rule errors get
their own category, separate from system errors, closing the legacy pattern where failures were often
silent or inconsistently surfaced.

---

# 2. Objectives

- Consistent API responses across all 15 modules.
- Never expose stack traces, SQL, or secrets to a client.
- Simplify debugging via structured, correlated logging (§14).
- Centralized handling — one NestJS exception filter, not per-controller ad hoc try/catch.
- Improve reliability by distinguishing retryable (transient) from non-retryable failures (§16).

---

# 3. Error Handling Principles

- Meaningful, actionable error messages.
- Standard HTTP status codes (§6).
- Never expose stack traces to the client.
- Log every unexpected error, always.
- Validate requests before they reach business logic (`1-api-design.md` §11).
- Separate business-rule errors from system errors, both in status code and `error_code`.
- Consistent response shape across every endpoint (`5-response-standards.md`).

---

# 4. Error Categories

| Category | Description |
|----------|-------------|
| Validation Errors | Invalid/missing request input |
| Authentication Errors | Identity verification failures (`2-authentication.md` §14) |
| Authorization Errors | Permission denied (`3-authorization.md` §15) |
| Business Rule Errors | A confirmed business invariant violated (e.g. finalize on an already-finalized order) |
| Resource Errors | Not found / already exists / conflict |
| Concurrency Errors | Concurrent-edit lock held by another user (ADR-079/080/084) |
| External Service Errors | CardConnect, QuickBooks, EliteExtra, EDI failures |
| System Errors | Unexpected internal application failure |
| Database Errors | Connection/execution failure against the resolved tenant database |

---

# 5. Standard Error Response

```json
{
    "success": false,
    "message": "Sales order cannot be finalized — it has already been finalized.",
    "error_code": "SALES_ORDER_ALREADY_FINALIZED",
    "errors": [],
    "request_id": "abc123",
    "timestamp": "2026-08-17T10:30:00Z"
}
```

---

# 6. HTTP Status Code Standards

| HTTP Status | Usage |
|--------------|------|
| 400 | Bad Request — malformed request itself, not a field-level validation failure |
| 401 | Unauthorized — not authenticated, or authentication failed |
| 403 | Forbidden — authenticated, insufficient permission |
| 404 | Resource Not Found (including a soft-deleted, non-includeDeleted-requested resource) |
| 405 | Method Not Allowed |
| 409 | Conflict — duplicate, business-state conflict, or concurrent-edit lock |
| 410 | Gone — resource permanently unavailable (rare; soft-delete uses 404, not 410) |
| 415 | Unsupported Media Type |
| 422 | Validation Failed |
| 423 | Locked — account lockout (ADR-155) |
| 429 | Too Many Requests |
| 500 | Internal Server Error |
| 502 | Bad Gateway — an external integration (CardConnect, QuickBooks, etc.) returned an unexpected failure |
| 503 | Service Unavailable |
| 504 | Gateway Timeout — an external integration timed out |

---

# 7. Validation Errors

```json
{
    "errors": [
        {
            "field": "quantity",
            "code": "MIN_VALUE",
            "message": "Quantity must be zero or greater."
        }
    ]
}
```

Matches the required-field/type/range enforcement in `1-api-design.md` §11 — every field documented as
required in a module's business-rules catalog produces a validation error here if omitted, not a silent
accept.

---

# 8. Authentication Errors

| Error | HTTP Status |
|--------|-------------|
| Invalid Credentials | 401 |
| Token Expired | 401 |
| Invalid Token | 401 |
| Missing Token | 401 |
| Account Locked | 423 |
| 2FA Required | 401 (distinct `error_code`) |

Full detail: `2-authentication.md` §14.

---

# 9. Authorization Errors

| Error | HTTP Status |
|--------|-------------|
| Permission Denied | 403 |
| Access Restricted (ownership rule) | 403 |
| Insufficient Privileges | 403 |
| Role Not Allowed | 403 |

Full detail: `3-authorization.md` §15.

---

# 10. Business Rule Errors

Examples specific to this project:

- Sales order already finalized (ADR-141 confirms finalize waits for real completion — a re-attempt on
  an already-finalized order is a business error, not a retry-safe transient one).
- Purchase order status transition invalid (ADR-142's real validated enum — an out-of-sequence
  transition is rejected, not silently coerced).
- Quantity-on-hand would go negative (ADR-038's hard floor at zero).
- Account credit limit exceeded.
- Currency delete blocked — base currency, or an in-use currency without a real transfer step
  (ADR-130).

Recommended status: 409 Conflict (state-based) or 422 Unprocessable Entity (rule-based) — chosen per
the specific error's nature, not interchangeably.

---

# 11. Resource Errors

| Error | HTTP Status |
|--------|-------------|
| Record Not Found | 404 |
| Already Exists | 409 |
| Deleted Resource (explicit access attempt) | 404 (soft-delete is treated as not-found by default, `4-query-standards.md` §16) |

---

# 12. External Service Errors

| Integration | Failure Mode |
|---|---|
| CardConnect | Payment authorization failure/timeout |
| QuickBooks | Sync failure |
| EliteExtra | Dispatch creation failure |
| EDI networks | Transmission failure |

Recommended status: 502/503/504, per §6. Per ADR-031, most of these calls are async (BullMQ) with no
confirmed synchronous blocking requirement — a failure surfaces via job-status/notification, not a
direct request-cycle error response, except where a genuine synchronous need is confirmed (e.g.
CardConnect authorization during checkout).

---

# 13. Exception Handling Strategy

- Centralized NestJS exception filter converts every thrown exception (validation, domain, unexpected)
  into the standard response shape (§5).
- Domain-specific exceptions (e.g. `SalesOrderAlreadyFinalizedException`) map to a specific
  `error_code`/status pair, defined once per business rule, not inferred generically.
- Unexpected/unmapped exceptions fall through to a generic 500 response with a generic message —
  the real detail goes to the log (§14), never the client.
- User-friendly messages only in the response; full technical detail stays server-side.

---

# 14. Logging Standards

Every error logged with:

- Timestamp
- `request_id`
- User id (or "unauthenticated")
- Tenant subdomain (for correlation — not a security boundary, since isolation is already physical per
  ADR-056)
- API endpoint + HTTP method
- Exception type
- Stack trace (server-side log only, never in the response)
- Environment (Local/DS/SS/Pre-SS/Production, ADR-069)
- Correlation/request ID

---

# 15. Security Considerations

Error responses must never expose:
- SQL queries or Prisma error internals.
- Stack traces.
- Passwords, secrets, tokens, API keys.
- Internal server/infrastructure details (hostnames, tenant database connection strings).

---

# 16. Retry Guidelines

**Retry allowed** (transient):
- Network timeout to an external integration.
- 503 Service Unavailable.
- 429 Too Many Requests (after the indicated backoff).

**Retry not allowed** (non-transient — retrying won't change the outcome):
- Validation errors (422).
- Permission denied (403).
- Authentication failure (401).
- Business rule violations (409/422 category, §10) — the underlying state must change first, not the
  request.

---

# 17. Monitoring & Alerting

Trigger monitoring on:
- Database unavailable (tenant connection failure).
- Authentication failure spikes (possible credential-stuffing attempt against the lockout policy,
  ADR-155).
- External service failures (§12).
- High error rate on any endpoint.
- Migration-fanout failure (ADR-056) — distinct from a normal request-path error, but uses the same
  underlying alerting mechanism.

---

# 18. Best Practices

- One error response format, everywhere (§5).
- Stable `error_code` values across a major API version.
- Concise client-facing messages; full detail in logs only.
- Business errors kept distinct from system errors (category and status).
- Centralized exception handling (§13), never per-controller ad hoc handling.
- Log every unexpected failure.
- Document every public `error_code` in that module's own `8-api.md` at JIT time.
- Validate input before business logic runs.

---

# 19. Assumptions

- The full enumerated list of every module-specific `error_code` is generated per module at JIT
  `8-api.md` time — this document defines the categories and shared codes (§10's examples are
  illustrative of the pattern, not exhaustive), not the complete list.

---

# 20. Constraints

- JSON error responses only.
- Standard response wrapper mandatory, including for errors.
- Internal exceptions never exposed to the client.
- Centralized exception handling required — no per-controller custom error shape.

---

# 21. Related Documents

`1-api-design.md`, `5-response-standards.md`, `4-query-standards.md`,
`claude-docs/gap-analysis/decisions-log.md` (ADR-038, ADR-069, ADR-130, ADR-141, ADR-142)

---

# 22. Revision History

| Version | Date | Author | Description |
|----------|------|--------|-------------|
| 1.0 | 2026-08-17 | Claude Code | Initial draft |

---

# Approval

| Role | Name | Status | Date |
|------|------|--------|------|
| Solution Architect | *(pending)* | | |
| API Lead | *(pending)* | | |
| Technical Lead | *(pending)* | | |

---

# AI Generation Notes

Error categories and examples grounded in this project's own confirmed business rules (finalize
idempotency, quantity-on-hand floor, currency-delete protection), not the template's generic
e-commerce placeholders. No open `[NEEDS INPUT]` markers — the full module-specific error-code catalog
is correctly deferred to each module's own JIT `8-api.md`, not a gap in this document.
