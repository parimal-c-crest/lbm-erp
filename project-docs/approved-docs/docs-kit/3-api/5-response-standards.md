# Response Standards

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | LBM ERP Rewrite |
| API Standard | REST |
| Response Format | JSON |
| Version | 1.0 |
| Status | Approved |
| Author | Claude Code (docs-kit generation) |
| Created Date | 2026-08-17 |
| Last Updated | 2026-08-17 |
| Approved By | Claude Code review (`4-document-review/1-document-review.md`, 2026-08-17) |

---

# 1. Executive Summary

One consistent JSON response envelope for every endpoint (success and error), so the Next.js frontend,
third-party integrations, and internal callers all parse responses identically — consistent with the
project's "one public API surface, no privileged consumer" principle.
[Source: `1-project/4-tech-stack.md` §5]

---

# 2. Response Design Principles

- Consistent structure across every endpoint, no per-module variation.
- Machine-readable (`success` boolean, stable `error_code`s) and human-readable (`message`).
- Predictable — same shape for every 2xx, same shape for every 4xx/5xx.
- Backward compatible within a version (`8-api-versioning.md`).
- Never leaks internal implementation detail (§15).
- Minimal but informative — no unrequested nested data.

---

# 3. Standard Response Structure

## Success Response

```json
{
    "success": true,
    "message": "Sales order created successfully.",
    "data": {},
    "meta": {},
    "timestamp": "2026-08-17T10:30:00Z"
}
```

## Error Response

```json
{
    "success": false,
    "message": "Validation failed.",
    "error_code": "VALIDATION_ERROR",
    "errors": [],
    "timestamp": "2026-08-17T10:30:00Z"
}
```

---

# 4. Success Responses

| Operation | HTTP Status |
|-----------|-------------|
| Read | 200 |
| Create | 201 |
| Update | 200 |
| Soft Delete | 204 |
| Async job accepted (bulk import/export, ADR-098) | 202 |

Guidelines:
- Return meaningful `message` text, not a generic "Success."
- Return the created/updated resource in `data` where the caller would naturally need it back (e.g. a
  newly-created sales order's `id` and computed total).
- Avoid unnecessary nested data — a list endpoint doesn't eagerly include every related resource by
  default.

---

# 5. Error Responses

```json
{
    "success": false,
    "message": "Validation failed.",
    "error_code": "VALIDATION_ERROR",
    "errors": [
        {
            "field": "email",
            "code": "REQUIRED",
            "message": "Email is required."
        }
    ]
}
```

Full error taxonomy: `6-error-handling.md`.

---

# 6. Validation Error Standards

Every validation error includes field, code, and human-readable message:

```json
{
    "errors": [
        {
            "field": "password",
            "code": "MIN_LENGTH",
            "message": "Password must be at least 8 characters."
        }
    ]
}
```

Matches `2-authentication.md` §10's password-complexity rule and every other server-enforced
required-field rule (`1-api-design.md` §11).

---

# 7. HTTP Status Code Standards

| Status | Meaning | Usage |
|---------|---------|-------|
| 200 | OK | Successful request |
| 201 | Created | Resource created |
| 202 | Accepted | Async job queued (bulk import/export, ADR-098) |
| 204 | No Content | Successful soft-delete |
| 400 | Bad Request | Malformed request |
| 401 | Unauthorized | Authentication required/failed |
| 403 | Forbidden | Permission denied |
| 404 | Not Found | Resource missing or soft-deleted (excluded by default) |
| 409 | Conflict | Duplicate/conflict, or a concurrent-edit lock held by another user (ADR-079/080/084) |
| 422 | Validation Failed | Input validation |
| 423 | Locked | Account lockout (ADR-155) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected error |

---

# 8. Pagination Response

Cursor-based, matching `4-query-standards.md` §9 (never offset/page-number):

```json
{
    "success": true,
    "data": [],
    "meta": {
        "next_cursor": "eyJpZCI6IjAxOTAi...",
        "has_more": true,
        "limit": 20
    }
}
```

No `total_records`/`total_pages` field — computing a total count over a cursor-paginated, potentially
2M-row result set is exactly the cost this pagination model exists to avoid.
[Source: `decisions-log.md` ADR-093]

---

# 9. Collection Responses

- Always return an array in `data`, never `null` for an empty collection.
- Include `meta` pagination info when applicable (§8).

```json
{
    "data": []
}
```

---

# 10. Single Resource Responses

```json
{
    "data": {
        "id": "0190f1a2-...",
        "status": "ACTIVE"
    }
}
```

---

# 11. Empty Responses

- Empty collection: `{ "data": [] }`.
- No content (successful soft-delete): HTTP 204, empty body.

---

# 12. Metadata Standards

`meta` may include:

```json
{
    "meta": {
        "next_cursor": "...",
        "has_more": true,
        "api_version": "v1",
        "request_id": "..."
    }
}
```

`request_id` supports the audit trail's traceability (ADR-068) and general request logging
(`1-api-design.md` §19).

---

# 13. Date & Time Standards

- ISO 8601, UTC (`Z` suffix) — matches the database standard (`timestamptz`, `2-database/
  4-database-standards.md` §5).

```
2026-08-17T10:30:00Z
```

---

# 14. File Response Standards

- PDF outputs (statements, POs, sales-order documents): `application/pdf`, `Content-Disposition:
  attachment` or `inline` as appropriate, generated via `pdf-lib` (`1-project/4-tech-stack.md` §16).
- CSV exports (ADR-098): `text/csv`, streamed for large exports rather than buffered fully in memory;
  small exports (<~2 minutes generation time) return synchronously, larger ones route through the
  async-job pattern (§4) with a completion notification.
- Images/documents (S3-backed, ADR-011): signed URL returned in `data`, not the binary streamed through
  the API layer itself.

---

# 15. Security Considerations

Responses must never expose:
- Passwords (hashed or otherwise).
- API keys, JWT signing secrets, integration credentials.
- Internal exceptions/stack traces (`6-error-handling.md` §15).
- Raw SQL.
- Another tenant's data — structurally impossible under database-per-tenant (ADR-056), but the response
  layer still never echoes back a cross-tenant reference even inadvertently (e.g. no tenant-agnostic
  global ID that could be probed).

---

# 16. Localization

No SoT source or decision confirms multi-language UI requirement — error codes stay language-independent
regardless (§6/`6-error-handling.md`), messages are English-only for MVP 1. Not flagged as
`[NEEDS INPUT]` since it's a legitimate not-in-scope default, not a genuinely blocking gap.

---

# 17. Performance Guidelines

- Return only required fields (`4-query-standards.md` §5's `select` discipline carries through to the
  response shape).
- Compress large responses (gzip, standard technical default).
- Cursor-paginate large datasets (§8).
- Avoid deeply nested objects — a response includes what the specific endpoint's consumer needs, not a
  maximal object graph.

---

# 18. Response Versioning

- Additive changes (new optional fields) preferred over breaking ones — full detail in
  `8-api-versioning.md`.
- Deprecated fields documented in that module's own `8-api.md` before removal.
- Backward compatibility maintained within a major version.

---

# 19. Logging & Traceability

- `request_id` included in every response's `meta` and correlated in the audit trail (ADR-068) and
  error logs (`6-error-handling.md` §14).

---

# 20. Best Practices

- One response format, everywhere — no per-module variant envelope.
- Standard HTTP status codes (§7), never a custom non-standard code.
- Concise `message` text.
- Business errors (§10 category split in `6-error-handling.md`) kept separate from system errors in
  both status code and `error_code`.
- Error codes stable across a major version — a client shouldn't need to change its error-handling logic
  for a non-breaking API change.

---

# 21. Assumptions

- The specific envelope shape (`success`/`message`/`data`/`meta`/`timestamp`) is a technical convention
  decision, not a business one — adopted as the project standard without requiring separate developer
  sign-off, consistent with NestJS interceptor conventions.

---

# 22. Constraints

- JSON responses only.
- UTF-8 encoding.
- ISO 8601 UTC timestamps.
- Standard response wrapper required on every endpoint, no exceptions (including error responses).

---

# 23. Related Documents

`1-api-design.md`, `2-authentication.md`, `3-authorization.md`, `4-query-standards.md`,
`6-error-handling.md`, `9-openapi.yaml`

---

# 24. Revision History

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

One consistent envelope for the entire project, cursor-based pagination metadata (not the template's
generic offset-based `total_pages` example) per ADR-093. No open `[NEEDS INPUT]` markers — the envelope
shape itself is treated as a standard technical convention (§21), not a business decision requiring
developer input.
