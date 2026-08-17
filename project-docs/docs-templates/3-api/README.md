# 3-api

> **Purpose**
>
> Defines the global API architecture and conventions every endpoint in the project must follow — design principles, security, request/response shape, versioning, and error handling. Module-specific endpoints are documented separately in `5-modules/<module>/8-api.md`.

Templates live in `templates/`. Requires `1-project/` and `2-database/` to be filled in first.

## Contents

| # | File | Covers |
|---|---|---|
| 1 | `templates/1-api-design.md` | Overall API architecture, design principles, and integration approach. Start here. |
| 2 | `templates/2-authentication.md` | How users authenticate — identity verification, session/token management. |
| 3 | `templates/3-authorization.md` | How authenticated users are granted access — roles, permissions, policies, ownership rules. |
| 4 | `templates/4-query-standards.md` | Standards for writing, optimizing, and maintaining database queries used by the API layer. |
| 5 | `templates/5-response-standards.md` | Standard structure and conventions for all API responses. |
| 6 | `templates/6-error-handling.md` | Consistent, predictable, secure error response conventions. |
| 7 | `templates/7-api-development-standards.md` | Coding conventions and implementation guidelines for building REST APIs. |
| 8 | `templates/8-api-versioning.md` | Versioning strategy, lifecycle management, compatibility, and deprecation. |
| — | `templates/9-openapi.yaml` | Generated OpenAPI/Swagger specification (not a written doc — output artifact). |
| — | `templates/10-postman-collection.json` | Generated Postman collection for manual/exploratory API testing (output artifact). |

## Note

Files 9 and 10 are machine-generated artifacts, not documents to fill in manually — they should be produced from `1-api-design.md` and the module-level `8-api.md` files once endpoints are defined.
