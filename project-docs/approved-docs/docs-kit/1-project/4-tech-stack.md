# Tech Stack

---

# Document Information

| Property | Value |
|----------|-------|
| Project Name | LBM ERP Rewrite |
| Version | 1.0 |
| Status | Approved |
| Owner | *(unassigned — see `decisions-log.md` ADR-021)* |
| Last Updated | 2026-08-17 |
| Approved By | Claude Code review (`4-document-review/1-document-review.md`, 2026-08-17) |

---

# 1. Technology Overview

[Source: `sot-docs/raw/3-tech-stack-decision/tech-stack.md` — treated as authoritative per
`sot-docs/index.md` Conflicts §1; `1-business-requirements/tech-stack.md`, `project-charter.md`, and
`assumptions-and-constraints.md` restate the same decision.]

| Layer | Technology |
|--------|------------|
| Frontend | Next.js (React, TypeScript), standard server mode |
| Backend | Node.js + NestJS (TypeScript) |
| Database | PostgreSQL, via Prisma |
| API | REST, API-first, versioned (`/api/v1/...`), OpenAPI/Swagger docs |
| Authentication | JWT (access + refresh) for users; hashed/scoped/rate-limited API keys for third-party/system access — same endpoints, same Guards |
| Cache / Queue | Redis + BullMQ |
| Storage | AWS S3 [ADR-011] |
| Hosting | AWS (default, kept portable, not a hard vendor-lock) [ADR-071] |
| Multi-tenancy | Database-per-tenant — one physical PostgreSQL database per tenant, subdomain-routed from one shared codebase [ADR-056, supersedes ADR-004] |

---

# 2. Backend Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Runtime | Node.js | Latest Active LTS at implementation start [ADR-020] |
| Framework | NestJS | Latest stable at implementation start [ADR-020] |
| Package Manager | pnpm | Latest stable [ADR-013/020] |
| ORM | Prisma | Latest stable at implementation start [ADR-020] |
| Queue | BullMQ | Latest stable at implementation start [ADR-020] |
| Auth | JWT (access+refresh) + API keys | — |

Chosen specifically because NestJS's enforced structure (Modules, Guards, ValidationPipes) prevents
the legacy system's core failure mode — inconsistent, convention-only security practice — structurally
rather than relying on developer discipline. [Source: `1-business-requirements/tech-stack.md`]

---

# 3. Frontend Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Framework | Next.js (React, TypeScript) | Latest stable at implementation start [ADR-020] |
| Rendering mode | Standard server mode (SSR) | — |
| State Management | Zustand (client state) + TanStack Query (server state/caching) [ADR-026] |
| HTTP Client | TanStack Query's built-in fetch wrapper (no separate client library needed) |
| CSS Framework | Tailwind CSS + shadcn/ui [ADR-025] |

Static export was considered and rejected: it would give up server-side data fetching and auth
middleware for no benefit, since there's no SEO/anonymous-page need (everything is behind login).
[Source: `3-tech-stack-decision/tech-stack.md`]

---

# 4. Database

| Component | Technology |
|-----------|------------|
| Database | PostgreSQL — one physical database per tenant |
| ORM | Prisma, with a per-tenant dynamic datasource resolved at request time from the inbound subdomain (not a single fixed `DATABASE_URL`) [Source: `decisions-log.md` ADR-056] |
| Multi-tenancy | Database-per-tenant, subdomain-routed (e.g. `wbc.omnna-lbm.live`) [Source: `decisions-log.md` ADR-056, supersedes ADR-004] |
| Tenant scoping column | None — `tenant_id` dropped project-wide; isolation is physical (separate database), not row-level [Source: `decisions-log.md` ADR-073] |
| Schema-template database | `skeleton.omnna-lbm.live` — new-tenant provisioning source (cloned wholesale, schema + default/seed data) and migration-registry member [Source: `decisions-log.md` ADR-056] |
| Migration mechanism | Prisma Migrate, run in a sequential fanout loop — skeleton first, then every tenant database in turn; one failure halts before touching the rest [Source: `decisions-log.md` ADR-056 — exact orchestration script still to be designed] |
| Backup / disaster recovery | Delegated to the hosting provider's native capability (AWS RDS automated backups/PITR), not custom-built [Source: `decisions-log.md` ADR-070] |

Every module's proposed normalized schema (per its own `entities-and-fields.md`) assumes `CHECK`
constraints and composite/partial unique constraints the legacy MySQL-based system never had — Postgres
is what makes that schema enforceable at the database level instead of application-code convention.
Uniqueness constraints are naturally per-database now, not `(tenant_id, ...)`-scoped.
[Source: `1-business-requirements/tech-stack.md`, `decisions-log.md` ADR-073]

---

# 5. API Standards

| Item | Standard |
|------|----------|
| Architecture | REST, API-first — one public surface, frontend is one consumer among several, not privileged |
| Data Format | JSON |
| Authentication | JWT (users) / API key (third-party, system-to-system) — same endpoints, same Guards |
| Versioning | `/api/v1/...` from day one |
| Documentation | OpenAPI/Swagger, generated from NestJS decorators |

> Detailed API conventions generate in `3-api/1-api-design.md` et al.

---

# 6. Authentication

| Feature | Technology |
|----------|------------|
| Login | JWT-based |
| Session | Access + refresh token pair |
| Authorization | RBAC per `decisions-log.md` ADR-002/006 — server-side Guards on every write endpoint |
| Password Hashing | bcrypt [Source: `decisions-log.md` ADR-014] |
| API Keys | Hashed at rest, scoped, rate-limited — replaces legacy's plaintext "External API Credentials"/"F5 API Keys" fields [Source: `3-tech-stack-decision/tech-stack.md`] |
| Platform support access | Super Admin accounts, one per tenant, scoped to that tenant's own database (a physical guarantee under database-per-tenant); standing or time-limited/auto-expiring per account; every action audited with no carve-out [Source: `decisions-log.md` ADR-057] |

---

# 7. File Storage

| Purpose | Technology |
|----------|------------|
| Documents, PDFs, images | AWS S3 [Source: `decisions-log.md` ADR-011] |

---

# 8. Background Processing

| Feature | Technology |
|----------|------------|
| Queue | BullMQ |
| Cache | Redis |

Replaces the legacy system's pile of standalone cron PHP scripts (`BillingCycleCron.php`,
`accountPastDueCron.php`, and similar) with one structured, in-application job-scheduling mechanism.
[Source: `3-tech-stack-decision/tech-stack.md`]

Managed from a skeleton-hosted control panel with staggered per-tenant scheduling, alongside migration
fanout and tenant provisioning. [Source: `decisions-log.md` ADR-059]

---

# 9. Development Tools

| Tool | Purpose |
|------|---------|
| Claude Code | AI-assisted development, drives this docs-kit |
| Git | Version control |
| pnpm | Package manager [Source: `decisions-log.md` ADR-013] |
| Postman | API testing tool [Source: `decisions-log.md` ADR-018] |

---

# 10. Testing Tools

| Tool | Purpose |
|------|---------|
| Jest | Backend (NestJS native default) and frontend (Next.js/React) unit/integration tests [Source: `decisions-log.md` ADR-015] |
| Playwright | End-to-end tests [Source: `decisions-log.md` ADR-027] |

Every module's own `build-guidance.md` specifies a *strategy* (rule-ID-traceable tests, golden-output
tests for pricing pipelines, state-transition tests, security regression tests) — see
`6-development/6-testing-strategy.md` (late wave, deferred) for the full concrete implementation.

---

# 11. Coding Standards

ESLint + Prettier across both NestJS and Next.js. [Source: `decisions-log.md` ADR-019] Full detail in
**`6-development/3-coding-standards.md`** (early wave, generates in this same upfront batch).

---

# 12. Directory Structure

High-level only — detailed folder conventions generate in `6-development/2-folder-structure.md`.

```text
frontend/    (Next.js)
backend/     (NestJS)
prisma/      (schema, migrations)
docs/        (project-docs/)
tests/
```

Module folder structure mirrors the Stage 2 module boundaries 1:1 in the frontend, so growth to
modules beyond the MVP-18 is additive. [Source: `3-tech-stack-decision/tech-stack.md`]

---

# 13. Browser Support

| Browser | Supported |
|----------|-----------|
| Chrome | ✔ latest 2 versions |
| Edge | ✔ latest 2 versions |
| Firefox | ✔ latest 2 versions |
| Safari | ✔ latest 2 versions |

[Source: `decisions-log.md` ADR-016]

---

# 14. Environment Requirements

| Component | Requirement |
|-----------|-------------|
| Node.js | Latest Active LTS at implementation start [ADR-020] |
| PostgreSQL | Latest stable major version at implementation start [ADR-020] |
| Redis | Required (cache + BullMQ) |
| Docker | **Explicitly not used** — the rest of the stack (plain Node processes, managed or self-hosted Postgres and Redis) runs on any mainstream host without it [Source: `3-tech-stack-decision/tech-stack.md`, "Explicitly Deferred Decisions"] |

---

# 15. Third-Party Services

| Service | Status |
|----------|--------|
| CardConnect | Payment gateway, retained from legacy — tokenized vault, no raw card data server-side [Source: `decisions-log.md` ADR-007/008] |
| QuickBooks | Accounting sync — rebuilt, scope expanded beyond legacy (exact entity list open) [Source: `decisions-log.md` ADR-009, ADR-023] |
| EDI networks | Vendor/purchasing integration, carried forward from legacy |
| EliteExtra | Delivery-dispatch, retained from legacy [Source: `decisions-log.md` ADR-010] |
| AWS S3 | File storage [Source: `decisions-log.md` ADR-011] |

---

# 16. Package Guidelines

| Need | Package | Notes |
|------|---------|-------|
| Backend validation | `class-validator` + `class-transformer` | NestJS-native DTO/Guard integration |
| Date/time | `date-fns` | Lighter, tree-shakeable vs. Moment/Luxon |
| Frontend forms | `react-hook-form` + `zod` | Schema shape shared with backend DTO validation |
| PDF generation | `pdf-lib` | Chosen over Puppeteer/headless-Chromium specifically to avoid running a browser process server-side just to render printed documents — smaller attack surface, lighter footprint |
| CSV import/export | `papaparse` (frontend) + `csv-parse`/`csv-stringify` (backend) | Backs the standard bulk import/export pattern, ADR-098 |
| Password hashing | bcrypt | Already locked, ADR-014 — restated here for completeness |

[Source: `decisions-log.md` ADR-174]

---

# 17. Upgrade Policy

Technology versions should only be upgraded when security updates are required, an LTS version is
released, existing packages remain compatible, and regression testing is completed. *(Standard
policy — no project-specific deviation stated in the SoT.)*

---

# 18. Related Documents

| Document | Purpose |
|----------|---------|
| Project Overview | High-level project summary |
| API Design | API conventions (`3-api/`) |
| Database Standards | Database conventions (`2-database/`) |
| Coding Standards | Development guidelines (`6-development/`) |
| Threat Model | Security requirements (`7-cross-cutting/`) |

---

# 19. Revision History

| Version | Date | Author | Description |
|----------|------|--------|-------------|
| 1.0 | 2026-08-16 | Claude Code | Initial draft, restating `3-tech-stack-decision/tech-stack.md` into this template's shape |
| 1.1 | 2026-08-17 | Claude Code | Multi-tenancy flipped to database-per-tenant (ADR-056, supersedes ADR-004), `tenant_id` dropped (ADR-073), hosting resolved to AWS-default (ADR-071), backup/DR delegated to hosting provider (ADR-070), Super Admin (ADR-057) and skeleton cron control panel (ADR-059) added |
| 1.2 | 2026-08-17 | Claude Code | Resolved remaining open `[NEEDS INPUT]`: Package Guidelines locked (ADR-174) |

---

# Notes

- This document is the official reference for all project technologies once approved.
- Version pins, password-hashing, file storage, package manager, test framework (unit/integration +
  E2E), lint/format, API testing tool, browser support, UI/UX direction, CSS framework, state
  management, NFR numeric targets, multi-tenancy model, hosting, and cross-module package choices are
  now resolved (ADR-013 through ADR-028, ADR-056/070/071/073/174) — see `decisions-log.md`. No open
  `[NEEDS INPUT]` markers remain in this document. Remaining open item outside this document's scope:
  the exact migration-fanout orchestration script for database-per-tenant deploys (recommended shape
  captured in ADR-056, not yet built) — tracked in `1-project-overview.md`/`2-requirements.md`, not
  guessed here.
- Any changes to the technology stack require updating `decisions-log.md` (the authoritative source
  this document restates), not just this file.
