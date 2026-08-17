# API Versioning

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | LBM ERP Rewrite |
| Versioning Strategy | URI |
| Current API Version | v1 |
| Status | Approved |
| Author | Claude Code (docs-kit generation) |
| Created Date | 2026-08-17 |
| Last Updated | 2026-08-17 |
| Approved By | Claude Code review (`4-document-review/1-document-review.md`, 2026-08-17) |

---

# 1. Executive Summary

URI versioning (`/api/v1/...`) from day one, locked in the tech stack decision.
[Source: `1-project/4-tech-stack.md` §5] Additive, backward-compatible changes are the default path;
a new major version is reserved for genuine breaking changes, not routine module rollout (each of the
15 modules ships within `v1` as it's JIT-built, not as its own version bump).

---

# 2. Objectives

- Maintain backward compatibility as modules roll out incrementally under the JIT model.
- Enable safe API evolution across a project that ships module-by-module over many sprints.
- Minimize client disruption for the Next.js frontend, third-party integrations, and system-to-system
  callers alike (one shared surface, `1-project/4-tech-stack.md` §5).
- Support a predictable deprecation path if a future major version is ever needed.

---

# 3. Versioning Principles

- Version only when necessary — adding a new module's endpoints under `v1` is not a version bump, it's
  normal incremental delivery.
- Prefer additive changes (new optional fields, new endpoints) over breaking ones.
- Maintain backward compatibility within `v1` for as long as the milestone/module structure keeps
  building on it.
- Deprecate before removing, with clear communication.

---

# 4. Versioning Strategy

## URI Versioning (chosen)

```
https://<tenant-subdomain>.omnna-lbm.live/api/v1/sales-orders
```

Chosen because it's explicit, cache-friendly, and requires no header-parsing convention for API-key
consumers (third-party integrations) — matches the tech-stack decision directly.
[Source: `1-project/4-tech-stack.md` §5]

Alternatives (header-based, content-negotiation, query-parameter versioning) were not selected — no
project requirement favors them over the simpler, already-locked URI approach.

---

# 5. Version Numbering

| Version | Meaning |
|----------|---------|
| v1 | Current — covers all 15 MVP modules plus ProductTracking/future additions as they're built, incrementally, without a version bump |
| v2 | Reserved for a genuine future breaking change — none confirmed or planned |

Guidelines: major versions introduce breaking changes only; a new module's entire endpoint set is a
minor, additive change within `v1`, not a major-version event; internal implementation changes never
affect the API version.

---

# 6. Breaking Changes Policy

A breaking change is any of:

- Removing an endpoint or field a client depends on.
- Renaming an endpoint or a response field.
- Changing a field's type or semantics (e.g. a status enum's allowed values shrinking).
- Changing authentication/authorization requirements on an existing endpoint.
- Changing a required request parameter.

Any of the above requires a new major version (`v2`) — never a silent change within `v1`.

---

# 7. Non-Breaking Changes

- Adding a new module's endpoints (the normal, expected pattern under the JIT build model).
- Adding optional request fields.
- Adding response fields (additive).
- Adding optional query parameters.
- Extending `meta` metadata.
- Bug fixes that don't change the documented contract.

These ship within `v1` without a version bump.

---

# 8. Backward Compatibility

- Existing clients continue working as each new module's endpoints are added under `v1`.
- Response envelope (`5-response-standards.md`) stays stable across the whole `v1` lifecycle.
- No response format change without a major version bump.

---

# 9. API Lifecycle

```
Development (per-module JIT build)
        ↓
Internal Testing (staged tenant-type rollout, ADR-056)
        ↓
General Availability (v1, incrementally growing per module)
        ↓
Maintenance (post-launch, per module epic Complete)
        ↓
Deprecated (only if/when a v2 is ever introduced)
        ↓
Retired
```

Unlike a typical single-release API, this project's `v1` grows module-by-module across many sprints
rather than shipping complete on day one — the lifecycle above reflects that incremental reality, not a
single all-at-once GA.

---

# 10. Deprecation Policy

No `v2` is planned or scheduled — this section states the policy that would apply if one is ever needed,
not a concrete timeline:

- Advance notice period before any endpoint/field removal.
- Documentation updated (module's own `8-api.md`) with the deprecation notice.
- Migration guide provided for any breaking change.
- Explicit sunset date communicated, not an indefinite "deprecated" limbo.

---

# 11. Client Migration Strategy

Not currently applicable (single version, `v1`, still growing incrementally) — this section will be
filled in with concrete migration guidance only if/when a `v2` is actually scheduled, not speculatively
now.

---

# 12. Version Documentation

Every module's own JIT `8-api.md` documents: the endpoints it adds, any fields it deprecates (rare
under the incremental-growth model), and references back to this document's versioning policy —
`9-openapi.yaml` and `10-postman-collection.json` are the living, machine-readable record of the
current `v1` surface.

---

# 13. Version Discovery

- URI (`/api/v1/...`) is the primary discovery mechanism.
- `9-openapi.yaml` and the Swagger UI generated from NestJS decorators are the authoritative live
  documentation. [Source: `1-project/4-tech-stack.md` §5]

---

# 14. Version Support Policy

| Version | Status | Support End Date |
|----------|--------|------------------|
| v1 | Current | N/A — no end date, actively growing |
| v2 | Not planned | N/A |

---

# 15. Testing Strategy

- Regression testing on every module addition, to confirm existing `v1` endpoints remain unaffected.
- Contract testing against `9-openapi.yaml` (spec stays in sync with actual behavior).
- Integration/E2E testing per module's own `build-guidance.md`. [Source: `1-project/4-tech-stack.md`
  §10]

---

# 16. Monitoring

- Request volume per endpoint/module, correlated via `request_id` (`5-response-standards.md` §19).
- Error rate per endpoint.
- No deprecated-version-usage tracking needed yet (no `v2` exists to migrate toward).

---

# 17. Best Practices

- Keep `v1` stable — additive growth, not silent breaking changes.
- Avoid unnecessary version increments; a new version is a last resort, not a routine tool.
- Document every module's endpoint additions as they ship.
- Communicate any future breaking change early and with a real sunset date.

---

# 18. Assumptions

- No `v2` is anticipated within this project's current MVP-15 + confirmed-future-additions
  (ProductTracking, StoreTransfer) scope — this document's breaking-change/deprecation sections are
  the standing policy, not evidence a version bump is expected soon.

---

# 19. Constraints

- URI versioning is mandatory (`/api/v1/...`).
- Only `v1` currently exists; a future version is not currently supported infrastructure.
- Breaking changes require a new major version, no exceptions.

---

# 20. Related Documents

`1-api-design.md`, `7-api-development-standards.md`, `5-response-standards.md`, `6-error-handling.md`,
`1-project/4-tech-stack.md`, `9-openapi.yaml`

---

# 21. Revision History

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

URI versioning selected and justified against the locked tech-stack decision, not asserted without
reason. Lifecycle (§9) and migration strategy (§11) adapted to this project's real incremental,
JIT-module-by-module build model rather than the template's generic single-release-then-v2 assumption.
No open `[NEEDS INPUT]` markers.
