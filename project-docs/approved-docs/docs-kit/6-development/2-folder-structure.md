# Folder Structure

> **Purpose**
>
> This document defines the standard project directory structure, folder organization, naming
> conventions, ownership, and responsibilities for the LBM ERP Rewrite codebase. It ensures
> consistency, maintainability, scalability, and easier navigation for developers and AI coding
> assistants.

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | LBM ERP Rewrite |
| Repository Type | Monorepo (pnpm workspace, ADR-013) |
| Primary Languages | TypeScript (backend: NestJS, frontend: Next.js) |
| Version | 1.0 |
| Status | Draft |
| Author | Claude Code (docs-kit generation) |
| Created Date | 2026-08-17 |
| Last Updated | 2026-08-17 |

---

# 1. Executive Summary

One pnpm workspace monorepo (ADR-013) holds both applications — a NestJS backend and a Next.js
frontend — plus the shared Prisma schema, this documentation kit, and cross-app tests. Backend
module boundaries mirror the 15 MVP modules (`claude-docs/analysis/module-list.md`) 1:1, and the
frontend's route/component structure mirrors the same boundaries (already established in
`4-ui/8-frontend-development-standards.md` §4) — so a developer or AI assistant navigating either
app finds the same module vocabulary in both places.

- **Repository organization**: monorepo, one Git history, two deployable apps (`backend/`,
  `frontend/`) plus shared config.
- **Separation of responsibilities**: NestJS's own Modules/Guards/ValidationPipes structure
  (`1-project/4-tech-stack.md` §2) enforces backend separation; the frontend's `app/`/`components/`/
  `hooks/`/`stores`/`lib` split (already locked in `4-ui/8-frontend-development-standards.md` §4)
  enforces frontend separation.
- **Modular architecture**: both apps organize primarily around the same 15 (soon 16+) business
  modules, not by technical layer alone.
- **Scalability strategy**: adding a module (e.g. ProductTracking once scheduled) means adding one
  new folder in each app following the existing pattern — additive, not restructuring.
- **AI-friendly directory structure**: predictable, one-folder-per-module convention in both apps
  means an AI assistant generating a new module's code can infer exactly where every file belongs
  without re-deriving the structure each time.

---

# 2. Objectives

The folder structure:

- Is easy to understand — one module-boundary vocabulary shared across backend, frontend, and
  documentation (`5-modules/<module-slug>/`).
- Promotes separation of concerns — NestJS layered architecture (Controller → Service → Repository/
  Prisma) and the frontend's presentation/data/state split (§ existing `4-ui/8-...md`).
- Supports modular development — each of the 15 modules can be worked on largely independently once
  its shared dependencies (Users, Products, Location — the modules many others depend on) are
  stable.
- Improves discoverability — a file's location tells you what it is before you open it.
- Reduces duplicate code — shared logic lives in each app's own `common`/`shared`/`lib` layer, never
  copy-pasted per module.
- Scales as the project grows — the structure already accounts for modules beyond the MVP-18
  (`1-project/4-tech-stack.md` §12: "growth to modules beyond the MVP-18 is additive").

---

# 3. Design Principles

- **Feature-based organization** — the primary organizing axis in both apps is the business module
  (Sales Orders, Accounts, Products, etc.), not a purely technical layer split.
- **Clear separation of frontend, backend, and documentation** — `frontend/`, `backend/`, `docs/` at
  the workspace root, never intermixed.
- **Consistent naming conventions** (§13) — kebab-case module-slug folders everywhere, matching
  `claude-docs/analysis/module-list.md`'s own slugs.
- **Modular architecture** — NestJS `@Module()` boundaries in the backend; route-group + component
  folders in the frontend.
- **Reusable shared libraries** — `backend/src/common/` and `frontend/src/lib`+`components/shared/`
  hold cross-module code.
- **Minimal folder nesting** — a module's own folder rarely nests more than 2-3 levels deep beyond
  its root (e.g. `sales-orders/dto/`, not `sales-orders/dto/create/nested/deeper/`).

---

# 4. Repository Structure

```text
lbm-erp-rewrite/
│
├── backend/              # NestJS application (§5)
├── frontend/               # Next.js application (§6, already detailed in `4-ui/8-frontend-development-standards.md` §4)
├── prisma/                  # Shared Prisma schema + migrations (ADR-056 per-tenant dynamic datasource)
├── docs/                     # project-docs/ — this documentation kit (§7)
├── scripts/                   # Cross-app automation (§11)
├── tests/                       # Cross-app / E2E test suites (§12)
├── .github/                       # CI/CD workflow definitions (`6-development/9-ci-cd.md`)
├── pnpm-workspace.yaml
├── .env.example
├── README.md
└── LICENSE
```

Purpose of each top-level directory:

- **`backend/`** — the NestJS API server; owns all business logic, database access (via Prisma),
  and authentication/authorization enforcement (the real security boundary,
  `4-ui/1-navigation.md` §19).
- **`frontend/`** — the Next.js application; owns presentation and client-side interaction only, no
  business logic (`4-ui/8-frontend-development-standards.md` §6/§18).
- **`prisma/`** — the single source of truth for the database schema, shared by the backend at
  runtime; migrations here drive both the per-tenant fanout (production/staging) and local
  development database setup (`6-development/1-development-environment.md` §11).
- **`docs/`** — this project's own documentation kit (`project-docs/` in the current repository
  layout — the folder name here matches whatever the actual repository root-relative path is once
  code is scaffolded).
- **`scripts/`** — automation that spans both apps (e.g. a combined lint+typecheck+test pre-push
  check, per `6-development/1-development-environment.md` §17).
- **`tests/`** — Playwright E2E suites that exercise the full stack (backend + frontend together);
  each app's own unit/integration tests live inside that app's own folder (§5/§6), not here.
- **`.github/`** — GitHub Actions workflow YAML (`6-development/9-ci-cd.md`, this same batch).
- No `docker/`/`infrastructure/` top-level folder — Docker is explicitly not used in this project
  (`6-development/1-development-environment.md` §10, `6-development/8-containerization.md`).

---

# 5. Backend Structure

NestJS's own convention, module-boundary-first, mirroring the 15 MVP modules:

```text
backend/
│
├── src/
│   ├── main.ts                    # Application bootstrap
│   ├── app.module.ts              # Root module, imports every feature module
│   │
│   ├── common/                     # Cross-module shared code
│   │   ├── decorators/
│   │   ├── filters/                 # Global exception filters (`3-api/6-error-handling.md`)
│   │   ├── guards/                   # Shared Guards (JWT auth, role-based — `3-api/3-authorization.md`)
│   │   ├── interceptors/
│   │   ├── pipes/                     # Shared ValidationPipes
│   │   └── utils/
│   │
│   ├── config/                      # Environment/config module (reads `.env`, per `6-development/1-development-environment.md` §9)
│   │
│   ├── prisma/                       # Prisma service/module (per-tenant dynamic datasource resolution, ADR-056)
│   │
│   ├── auth/                          # Authentication module (JWT issuance/refresh, API key validation — `3-api/2-authentication.md`)
│   │
│   ├── sales-orders/                   # One folder per MVP module — see Module Organization (§15) for the standard internal shape
│   ├── accounts/
│   ├── users/
│   ├── location/
│   ├── products/
│   ├── vendors/
│   ├── search-line-item/
│   ├── settings/
│   ├── sales-history/
│   ├── purchase-orders/
│   ├── purchase-line-item/
│   ├── purchase-history/
│   ├── pricing/
│   ├── uom/
│   └── account-statement/
│
└── test/                            # Backend-specific unit/integration tests (mirrors `src/` structure)
```

For each module folder (§15 details the standard internal shape):

- **Purpose**: owns one MVP module's business logic, matching
  `claude-docs/analysis/module-list.md`'s scope exactly.
- **Ownership**: one module folder, one clear owner in `claude-docs/analysis/module-list.md`'s
  sense — no module's logic leaks into another's folder.
- **Allowed dependencies**: a module may depend on `common/`, `prisma/`, `config/`, and `auth/`
  freely; cross-module dependencies (e.g. SalesOrder depending on Products for catalog data) go
  through that other module's exported service/interface, never by reaching into its internal
  files directly.

`common/`, `config/`, `prisma/`, and `auth/` are the backend's shared-library layer (§8).

---

# 6. Frontend Structure

Already fully specified in `4-ui/8-frontend-development-standards.md` §4 — restated here for this
document's own completeness rather than re-derived:

```text
frontend/
│
├── src/
│   ├── app/                    # Next.js App Router routes (route groups: (auth), (dashboard)/<module-slug>/)
│   ├── components/
│   │   ├── ui/                  # shadcn/ui primitives
│   │   └── shared/                # Composed, project-specific reusable components
│   ├── hooks/                      # TanStack Query hooks, one set per module
│   ├── stores/                      # Zustand stores (client-only state)
│   ├── lib/                          # API client, utilities, shared `zod` schemas
│   ├── types/                         # Shared TypeScript types
│   ├── config/                         # Route table, role-to-menu map (`4-ui/1-navigation.md` §10)
│   └── styles/                          # Tailwind config, design tokens (`4-ui/3-design-system.md` §4)
│
├── public/                          # Static assets (§9)
└── test/                             # Frontend-specific component/unit tests
```

Responsibilities per folder: see `4-ui/8-frontend-development-standards.md` §4 in full — not
duplicated here to avoid the two documents drifting out of sync; this document only restates the
tree shape for repository-structure completeness.

---

# 7. Documentation Structure

This project's own `project-docs/` tree, already established and in active use (not a template
example — this is the real, current structure):

```text
project-docs/
│
├── docs-templates/          # Fixed, project-agnostic blueprint library — never written into
├── approved-docs/
│   └── docs-kit/              # Real deliverables: 1-project, 2-database, 3-api, 4-ui, 5-modules, 6-development, 7-cross-cutting
├── claude-docs/                 # Working area: analysis, gap-analysis, drafts, plan, tasks, sprints, incidents
├── sot-docs/                       # Source of Truth: raw, archive, index.md, changelog.md
└── prompts/                          # The prompt-file workflow driving this entire docs-kit process
```

Full description of each area and the draft→review→promote flow: this project's own root
`CLAUDE.md` — not restated here.

---

# 8. Shared Libraries

Backend

```text
backend/src/common/    # cross-module utilities, Guards, filters, decorators (§5)
```

Purpose: code more than one module needs (e.g. the JWT auth Guard, the standard API response
envelope wrapper). Ownership: no single module owns `common/` — changes require the same review
rigor as any shared/cross-cutting change. Dependency rules: `common/` never depends on a specific
feature module (§14) — dependencies flow one direction only.

Frontend

```text
frontend/src/lib/            # API client, utilities, shared zod schemas
frontend/src/components/shared/  # Composed, reusable UI components (`4-ui/4-component-standards.md`)
```

Same ownership/dependency rules as the backend's `common/` — shared code never depends on a specific
module's route or component.

No separate top-level `shared/`/`packages/` monorepo package is introduced — with only two apps in
this workspace, per-app shared folders (`backend/src/common/`, `frontend/src/lib`) are sufficient;
a promoted shared package would only be justified if a third consumer (e.g. a future mobile app)
appeared `[Assumption: this document]`.

---

# 9. Asset Organization

- **Images**: `frontend/public/images/` — served directly by Next.js's static file handling;
  content images inside components use `next/image` (`4-ui/3-design-system.md` §9).
- **Icons**: not stored as static assets — lucide-react (ADR-178) ships as an npm package, icons are
  imported as React components, not image files.
- **Fonts**: not stored as static assets either — `next/font` self-hosts and optimizes the type
  pairing (Space Grotesk/Inter/JetBrains Mono, `4-ui/3-design-system.md` §4) at build time
  (`4-ui/6-responsive-design.md` §15), no manual font-file management.
- **Videos**: not applicable — no video content in MVP scope (`4-ui/6-responsive-design.md` §13).
- **Documents**: user-facing generated documents (PDFs, statements) are generated server-side
  (`pdf-lib`, ADR-174) and stored in AWS S3 (`1-project/4-tech-stack.md` §7), never checked into the
  repository as static assets.
- **Static files**: `frontend/public/` for anything served as-is (favicon, robots.txt, manifest).

Naming/optimization: `frontend/public/` assets use kebab-case file names; images are pre-optimized
(WebP where practical) before being added to `public/`, on top of Next.js's own runtime optimization
for anything served through `next/image`.

---

# 10. Configuration Files

```text
pnpm-workspace.yaml       # pnpm workspace member declaration (ADR-013)
package.json                # Workspace-root scripts; each app also has its own
.env.example                  # Documents every required env var name (`6-development/1-development-environment.md` §9), no real values
tsconfig.json                   # Base TypeScript config, extended per app
prisma/schema.prisma              # Database schema, single source of truth
backend/nest-cli.json               # NestJS CLI config
frontend/next.config.js               # Next.js config
tailwind.config.ts                      # Tailwind + design-token wiring (`4-ui/3-design-system.md` §4)
.eslintrc / eslint.config.js              # Shared lint rules (`6-development/3-coding-standards.md`)
.prettierrc                                # Shared formatting rules
```

No `docker-compose.yml`, `Dockerfile`, `pyproject.toml`, or `requirements.txt` — outside this
project's stack (no Docker per §4/§6-development/8-containerization.md; no Python).

---

# 11. Scripts Organization

```text
scripts/
│
├── setup/          # First-time environment bootstrap helpers (beyond the standard pnpm install flow, `6-development/1-development-environment.md` §8)
├── database/         # One-off/maintenance database scripts (e.g. a future per-tenant migration-fanout orchestration script, ADR-056 — still to be designed)
├── deployment/          # Deployment-support scripts (`6-development/7-deployment-strategy.md`, late wave)
└── maintenance/            # Recurring maintenance helpers (cache clearing, dependency audits)
```

No `utilities/` catch-all subfolder — a script belongs in the most specific applicable category
above; a genuinely uncategorizable script is a signal to reconsider whether it should be a
`package.json` script instead (`6-development/1-development-environment.md` §17).

---

# 12. Testing Structure

```text
tests/                    # Cross-app E2E only (Playwright, ADR-027)
│
├── e2e/
│   ├── auth.spec.ts
│   ├── sales-orders.spec.ts
│   ├── purchase-orders.spec.ts
│   └── ...                    # One spec file per critical flow from `4-ui/2-user-flows.md`
└── fixtures/                     # Shared E2E test data/fixtures

backend/test/               # Backend unit + integration tests (Jest, ADR-015), mirrors `backend/src/` module structure
frontend/src/**/*.test.tsx     # Frontend component/unit tests, co-located per `4-ui/8-frontend-development-standards.md` §18
```

Naming: `<subject>.spec.ts` for E2E specs (Playwright convention), `<Component>.test.tsx`/
`<file>.test.ts` for co-located unit tests (Jest/React Testing Library convention). Ownership: each
module's own tests are the responsibility of whoever implements that module — full strategy detail
in `6-development/6-testing-strategy.md` (late wave, deferred until the first module reaches that
gate).

---

# 13. Naming Conventions

- kebab-case for folders — module folders match `claude-docs/analysis/module-list.md`'s slugs
  exactly (`sales-orders`, `purchase-orders`, `account-statement`, etc.).
- Lowercase file/folder names throughout, except component files (§ below).
- Meaningful, domain-specific names — no `utils2/`, `misc/`, `stuff/`.
- Avoid abbreviations — `purchase-orders/`, never `po/`.
- Feature-oriented names at the module level, technical-layer names only inside a module (`dto/`,
  `entities/`, per §15).

```
sales-orders/
purchase-line-item/
account-statement/
```

Component files (frontend) are the one PascalCase exception, per
`4-ui/8-frontend-development-standards.md` §5 (`KpiCard.tsx`, not `kpi-card.tsx`) — kept consistent
with that already-locked convention rather than restated differently here.

---

# 14. Dependency Rules

Backend (NestJS layered architecture, `1-project/4-tech-stack.md` §2):

```
Controller
 ↓
Service
 ↓
Repository / Prisma
```

A Controller never calls Prisma directly; a Service never returns an HTTP-shaped response — that's
the Controller's job. `common/` sits beside this stack, depended on by any layer, depending on none
of them (§8).

Frontend (already established, `4-ui/8-frontend-development-standards.md` §3/§7):

```
Route (app/)
 ↓
Component (components/)
 ↓
Hook (hooks/, TanStack Query) / Store (stores/, Zustand)
 ↓
lib/ (API client, schemas)
```

Prohibited dependency directions: a shared layer (`common/`, `lib/`, `components/shared/`) never
imports from a specific feature module/route; one feature module's backend folder never imports
another feature module's internal files directly (§5) — only its exported service.

---

# 15. Module Organization

Standard shape every backend module follows (NestJS convention, applied consistently across all 15+
modules):

```text
sales-orders/
│
├── dto/                     # Request/response DTOs (class-validator decorated, ADR-174)
├── entities/                  # Prisma-derived types / domain entities specific to this module
├── sales-orders.controller.ts
├── sales-orders.service.ts
├── sales-orders.module.ts
└── sales-orders.controller.spec.ts / sales-orders.service.spec.ts   # Co-located unit tests
```

Standard shape every frontend module route-group follows (already established,
`4-ui/8-frontend-development-standards.md` §4):

```text
app/(dashboard)/sales-orders/
│
├── page.tsx              # List view
├── create/page.tsx
└── [id]/
    ├── page.tsx           # Detail view
    └── edit/page.tsx
```

Every module additionally has a documentation counterpart at
`docs/approved-docs/docs-kit/5-modules/<module-slug>/` (generated JIT, per
`7-sprint-planning/1-sprint-planning.md`) — the three (backend folder, frontend route group,
`5-modules/` doc set) share the exact same slug, so any one of the three tells you where to find
the other two.

---

# 16. Generated Files

- **Build output**: `backend/dist/`, `frontend/.next/` — git-ignored (§17).
- **Logs**: not written to a repository-tracked folder — local development logs to console
  (`6-development/1-development-environment.md` §15); production logging is a deployment-stage
  concern (`6-development/7-deployment-strategy.md`, late wave).
- **Temporary files**: OS/tool-specific (`node_modules/.cache/`, etc.) — git-ignored.
- **Coverage reports**: `backend/coverage/`, `frontend/coverage/` — git-ignored, CI-artifact only
  (`6-development/9-ci-cd.md`).
- **Generated API clients**: not applicable — the frontend calls the backend directly via its own
  typed API service layer (`4-ui/8-frontend-development-standards.md` §9), no separate generated-
  client-SDK step; the OpenAPI spec (`3-api/9-openapi.yaml`) remains the source of truth for the API
  shape without a code-generation pipeline built on top of it in MVP scope
  `[Assumption: this document]`.

---

# 17. Version Control Guidelines

Files to commit: all source code, `pnpm-lock.yaml`, `.env.example`, `prisma/schema.prisma` and
migrations, configuration files (§10), this documentation kit.

Files to ignore (`.gitignore`):

```
node_modules/
.next/
dist/
coverage/
.env
.env.local
*.log
.DS_Store
```

GitIgnore standards: one root-level `.gitignore` covering both apps, rather than per-app
`.gitignore` files, since the ignore patterns above apply identically to both.

Generated artifacts (§16) and local configuration files (`.env`/`.env.local`, never `.env.example`)
are never committed — full secrets discipline in
`6-development/1-development-environment.md` §18.

---

# 18. Review Checklist

- Folder names follow kebab-case (§13), matching `module-list.md` slugs exactly for module folders.
- Responsibilities clearly defined per top-level directory (§4) and per module folder (§5/§6/§15).
- No duplicate folders — one module, one backend folder, one frontend route group.
- Shared code centralized in `common/`(backend)/`lib`+`components/shared`(frontend) — §8.
- Dependencies follow the layered architecture in §14 — no Controller-to-Prisma shortcut, no
  cross-module internal-file reach-through.
- Generated files excluded from version control (§16/§17).
- Documentation (`5-modules/<slug>/`) stays discoverable via the same slug as its backend/frontend
  counterparts (§15).

---

# 19. Best Practices

- Organize by responsibility/module first, technical layer second (§3).
- Keep folders focused — a module folder contains that module's own code only.
- Minimize nesting — 2-3 levels beyond a module's root at most.
- Use consistent naming (§13) — no per-module naming drift.
- Separate generated and source files (§16/§17) — nothing generated is ever hand-edited.
- Centralize shared code (§8) rather than duplicating a helper across modules.
- Avoid circular dependencies (§14) — a module depending back on a module that depends on it is
  caught in code review, not structurally prevented, so this discipline matters.
- Document every top-level directory (§4) — no unexplained folder appears without a stated purpose.

---

# 20. Assumptions

- No separate generated-API-client-SDK pipeline is built on top of the OpenAPI spec in MVP —
  the frontend's own typed API service layer covers this need `[Assumption: this document]`.
- No promoted `shared/`/`packages/` monorepo package beyond per-app shared folders — would only be
  justified by a third app consumer, which doesn't exist in MVP scope
  `[Assumption: this document]`.
- Exact per-tenant migration-fanout orchestration script location (`scripts/database/`) is
  illustrative — the script itself is still to be designed per `1-project/4-tech-stack.md`'s own
  open note, not specified further here `[Assumption: this document]`.

---

# 21. Constraints

- Folder names must use kebab-case (§13), except frontend component files (PascalCase, an
  already-locked exception).
- Source code and generated files must remain separate (§16/§17) — nothing generated is
  committed.
- Shared libraries (`common/`, `lib/`, `components/shared/`) must not depend on feature modules
  (§14) — dependency direction is one-way only.
- Documentation structure (§7) must remain consistent with the live `project-docs/` tree already in
  use — this document restates it, it doesn't redefine it.

---

# 22. Related Documents

- `1-project/4-tech-stack.md`
- `2-database/1-database-design.md`
- `3-api/7-api-development-standards.md`
- `4-ui/8-frontend-development-standards.md`
- `6-development/1-development-environment.md`
- `6-development/3-coding-standards.md`
- `6-development/4-git-workflow.md`
- `6-development/9-ci-cd.md`
- `claude-docs/analysis/module-list.md`
- `decisions-log.md` (ADR-013, ADR-020, ADR-025, ADR-026, ADR-056, ADR-174, ADR-178)

---

# 23. Revision History

| Version | Date | Author | Description |
|----------|------|--------|-------------|
| 1.0 | 2026-08-17 | Claude Code (docs-kit generation) | Initial Draft |

---

# Approval

| Role | Name | Status | Date |
|------|------|--------|------|
| Solution Architect | | Pending | |
| Technical Lead | | Pending | |
| Development Lead | | Pending | |

---

# AI Generation Notes

- Follows `1-project/4-tech-stack.md` and `4-ui/8-frontend-development-standards.md` exactly — the
  frontend structure here restates rather than re-derives what's already locked there, to avoid the
  two documents drifting apart.
- Defines a scalable, modular, AI-friendly repository structure organized around the same 15
  MVP-module vocabulary used everywhere else in this docs-kit (`module-list.md`).
- Clearly describes purpose and ownership for every major directory (§4-§8).
- Establishes naming conventions (§13) and dependency rules (§14) for both apps.
- Separates source code, generated artifacts, configuration, documentation, and scripts (§4, §10,
  §11, §16, §17) — no `docker/`/`infrastructure/` folder, consistent with the project's explicit
  no-Docker decision.
- Ensures the structure supports maintainability, testing (§12), automation (§11), and future
  module expansion (§1, §15) beyond the MVP-18.
- Framework-specific (NestJS/Next.js/Prisma) rather than generic, since the stack is already fully
  locked project-wide — matching the same choice made in `4-ui/8-frontend-development-standards.md`.
