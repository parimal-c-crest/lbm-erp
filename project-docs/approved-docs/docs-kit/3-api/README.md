# 3-api

> **Purpose**
>
> Defines the global API architecture and conventions every endpoint in the project must follow — design principles, security, request/response shape, versioning, and error handling. Module-specific endpoints are documented separately in `5-modules/<module>/8-api.md`.

## Contents

| # | File | Covers |
|---|---|---|
| 1 | `1-api-design.md` | Overall API architecture, design principles, and integration approach. Start here. |
| 2 | `2-authentication.md` | How users authenticate — identity verification, session/token management. |
| 3 | `3-authorization.md` | How authenticated users are granted access — roles, permissions, policies, ownership rules. |
| 4 | `4-query-standards.md` | Standards for writing, optimizing, and maintaining database queries used by the API layer. |
| 5 | `5-response-standards.md` | Standard structure and conventions for all API responses. |
| 6 | `6-error-handling.md` | Consistent, predictable, secure error response conventions. |
| 7 | `7-api-development-standards.md` | Coding conventions and implementation guidelines for building REST APIs. |
| 8 | `8-api-versioning.md` | Versioning strategy, lifecycle management, compatibility, and deprecation. |
| — | `9-openapi.yaml` | Generated OpenAPI/Swagger specification — real resources, not the template's generic example. |
| — | `10-postman-collection.json` | Generated Postman collection, mirrors `9-openapi.yaml`'s endpoint set exactly. |

All 10 approved 2026-08-17 (v1.0). Rate limiting (ADR-175) and CORS policy (ADR-176) were resolved with
the developer during this batch's review. See `project-docs/claude-docs/gap-analysis/review-log.md` for
verdicts and `project-docs/claude-docs/gap-analysis/decisions-log.md` for every cited decision.

## Note

Files 9 and 10 stay in sync with `1-api-design.md` and each module's own `8-api.md` as those generate —
they are living artifacts, not one-time output.
