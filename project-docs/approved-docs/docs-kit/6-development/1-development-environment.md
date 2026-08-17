# Development Environment

> **Purpose**
>
> This document defines the standard development environment, required software, tooling,
> installation procedures, configuration guidelines, and development workflow for the LBM ERP
> Rewrite. It ensures every developer and AI coding assistant works in a consistent, reproducible
> environment, minimizing setup issues and improving productivity.

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | LBM ERP Rewrite |
| Development Platforms | Windows / macOS / Linux |
| Environment Type | Local Development (native processes — no Docker, see §10) |
| Version | 1.0 |
| Status | Draft |
| Author | Claude Code (docs-kit generation) |
| Created Date | 2026-08-17 |
| Last Updated | 2026-08-17 |

---

# 1. Executive Summary

The development environment runs entirely as native local processes — Node.js (NestJS backend +
Next.js frontend, pnpm workspace monorepo), PostgreSQL, and Redis — deliberately **without Docker**
(`1-project/4-tech-stack.md` §14, ADR-005-adjacent stack decision: "plain Node processes, managed or
self-hosted Postgres and Redis... runs on any mainstream host" specifically so hosting isn't a
blocking dependency for the rest of the stack). This is a stated architectural choice, not an
unresolved gap — see §10 for the full rationale.

- **Development philosophy**: minimal moving parts, native tooling, reproducible via lockfiles
  (`pnpm-lock.yaml`) and a documented version floor (§3/§5) rather than container images.
- **Supported operating systems**: Windows, macOS, Linux — all first-class, since nothing in the
  stack (Node, pnpm, PostgreSQL, Redis) is platform-restricted.
- **Required software**: Node.js (LTS), pnpm, PostgreSQL, Redis, Git (§5).
- **Containerization strategy**: none for local development or the target deployment shape
  (§10) — `6-development/8-containerization.md` documents this exclusion in full rather than a
  Docker setup.
- **Local development workflow**: clone → install (pnpm workspace) → configure `.env` → migrate
  (Prisma) → run both apps (§13).

---

# 2. Objectives

The development environment:

- Is easy to install — no container runtime prerequisite, just Node/pnpm/Postgres/Redis (§5).
- Is reproducible — pnpm lockfile pins exact dependency versions across every developer's machine.
- Minimizes "works on my machine" issues via a documented minimum-version floor (§3) and a shared
  `.env.example` (§9).
- Supports AI-assisted development — Claude Code is itself a listed development tool
  (`1-project/4-tech-stack.md` §9); this document is written to be equally followable by a human
  developer or an AI coding assistant setting up the same environment.
- Matches production as closely as practical without requiring Docker — the same Node/pnpm/
  PostgreSQL/Redis stack runs in both environments, just self-hosted/managed differently
  (§10, `6-development/7-deployment-strategy.md` — late wave, deferred).
- Is easy to update — dependency updates flow through the standard pnpm workspace update commands,
  no image-rebuild step.

---

# 3. Supported Platforms

| Platform | Supported | Notes |
|----------|-----------|------|
| Windows | ✓ | Native (PowerShell/cmd) or WSL2 — both work since nothing in the stack requires POSIX-only tooling. |
| macOS | ✓ | Native, Homebrew for PostgreSQL/Redis local install. |
| Linux | ✓ | Native, primary target for any self-hosted deployment environment. |
| WSL2 | ✓ | Supported as a Windows developer's preference, not required — native Windows works equally well given no Docker dependency. |

---

# 4. Minimum Hardware Requirements

| Resource | Minimum | Recommended |
|----------|----------|-------------|
| CPU | 2 cores | 4+ cores |
| Memory | 8 GB | 16 GB (comfortable running Next.js dev server + NestJS dev server + local PostgreSQL + Redis simultaneously) |
| Disk Space | 10 GB free | 20 GB free (node_modules across a pnpm workspace, plus local Postgres data) |
| Internet | Required for initial dependency install and package registry access | Broadband (large initial `pnpm install` across both apps) |

No GPU or specialized hardware required — no ML/heavy-compute local tooling in this stack.

---

# 5. Required Software

| Software | Version | Required |
|----------|---------|----------|
| Git | Current stable | ✓ |
| Node.js | Latest Active LTS at implementation start [`1-project/4-tech-stack.md` §14, ADR-020] | ✓ |
| pnpm | Latest stable [ADR-013] | ✓ |
| PostgreSQL | Latest stable major version at implementation start [ADR-020] | ✓ |
| Redis | Latest stable (cache + BullMQ, `1-project/4-tech-stack.md` §8/§14) | ✓ |
| IDE | Any TypeScript-aware editor (VS Code recommended for the ESLint/Prettier/Prisma extension
ecosystem) | ✓ |
| Docker | **Not used** — explicitly excluded (§10) | ✗ |
| Python / Java | Not part of this stack | ✗ |

---

# 6. Repository Setup

```bash
git clone <repository-url>

cd lbm-erp-rewrite

git checkout develop
```

Branch strategy, commit conventions, and full Git workflow are documented in
`6-development/4-git-workflow.md` (this same early wave) — this section covers only the initial
clone/checkout, not ongoing branching discipline.

Git configuration: standard `user.name`/`user.email` set per developer; no project-specific Git
hooks are mandated beyond what `6-development/4-git-workflow.md` documents (e.g. lint-staged
pre-commit, if adopted there).

---

# 7. Project Structure

pnpm workspace monorepo (ADR-013), high-level shape restated from `1-project/4-tech-stack.md` §12 —
full directory conventions in `6-development/2-folder-structure.md` (this same batch):

```text
lbm-erp-rewrite/
│
├── backend/          # NestJS application
├── frontend/          # Next.js application
├── prisma/            # Shared Prisma schema + migrations (per-tenant dynamic datasource, ADR-056)
├── docs/               # project-docs/ (this documentation kit)
├── tests/               # Cross-app / E2E test suites (Playwright, ADR-027)
├── pnpm-workspace.yaml
├── .env.example
└── README.md
```

---

# 8. Dependency Installation

Backend

```bash
cd backend
pnpm install
```

Frontend

```bash
cd frontend
pnpm install
```

Development tools (workspace root — installs both apps' dependencies via pnpm workspace linking,
run once from the repository root instead of per-app)

```bash
pnpm install
```

Both apps share one lockfile (`pnpm-lock.yaml`) at the workspace root per ADR-013's pnpm workspace
convention — per-app `pnpm install` above is for isolated app development; the root-level install is
the standard onboarding step (§21).

---

# 9. Environment Configuration

```
.env               # Shared/root-level variables (if any)
backend/.env        # NestJS-specific (DATABASE_URL pattern, JWT secrets, Redis connection, AWS S3 keys)
frontend/.env.local  # Next.js-specific (NEXT_PUBLIC_API_URL, any client-safe config)
```

Required variables (backend, illustrative — exact names finalized when `backend/.env.example` is
authored during implementation):

- `DATABASE_URL` — per ADR-056's database-per-tenant model, this is resolved dynamically per
  request from the inbound subdomain in production; for local development, a single local
  PostgreSQL database (e.g. the skeleton/template database, ADR-056) is used as the default
  connection target.
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — per `3-api/2-authentication.md`.
- `REDIS_URL` — local Redis instance connection string.
- `AWS_S3_*` — bucket/region/credentials for file storage (`1-project/4-tech-stack.md` §7); local
  development may point at a real dev-tier S3 bucket or a local S3-compatible service (exact choice
  deferred to implementation, not a documentation-stage decision).

Required variables (frontend):

- `NEXT_PUBLIC_API_URL` — backend API base URL (`http://localhost:<port>/api/v1` locally).

Secrets management: never committed to source control (§18); `.env.example` files (checked in, no
real values) document every required key's *name*, with real values distributed out-of-band per
developer.

Default values: local development defaults point at localhost services (`localhost:5432` Postgres,
`localhost:6379` Redis) — no shared/remote dev database required for basic local work.

Environment-specific overrides: `.env.development`/`.env.production`-style overrides follow
Next.js's and NestJS's own standard config-loading conventions — no custom environment-resolution
layer beyond what those frameworks already provide.

---

# 10. Docker Development

**Not applicable — Docker is explicitly not used in this project**, for either local development or
production hosting.

[Source: `sot-docs/raw/3-tech-stack-decision/tech-stack.md`, "Explicitly Deferred Decisions": "the
rest of this stack (plain Node processes, managed or self-hosted Postgres and Redis, no Docker) runs
on any mainstream host, so this isn't a blocking dependency"; restated in
`1-project/4-tech-stack.md` §14: "Docker | **Explicitly not used**".]

This is a deliberate portability decision — the stack (plain Node processes + managed/self-hosted
PostgreSQL/Redis) is chosen specifically to avoid a container-runtime dependency, keeping hosting
provider choice fully open (hosting itself resolved to AWS-default per ADR-071, but the stack
doesn't require it). `6-development/8-containerization.md` (this same early wave) documents this
exclusion as its own "Not Applicable" entry rather than a Docker setup guide.

---

# 11. Database Setup

Per ADR-056 (database-per-tenant, PostgreSQL):

- **Database creation**: local development creates one PostgreSQL database matching the "skeleton"
  template-database role (`skeleton.omnna-lbm.live` in production naming, `lbm_erp_dev` or
  equivalent locally) — Prisma Migrate then applies the schema to it.
- **Migrations**: `pnpm prisma migrate dev` (Prisma Migrate, per `1-project/4-tech-stack.md` §4) —
  applies pending migrations and regenerates the Prisma Client.
- **Seed data**: `pnpm prisma db seed` (Prisma's standard seed-script convention) — seeds
  development-representative data; exact seed dataset content is an implementation-time decision,
  not specified here.
- **Reset process**: `pnpm prisma migrate reset` — drops and recreates the local database from
  scratch, reapplies all migrations, reruns the seed script.
- **Test database**: a separate local PostgreSQL database (e.g. `lbm_erp_test`) used by the test
  suite (`6-development/6-testing-strategy.md`, late wave) to avoid polluting development data.

```bash
createdb lbm_erp_dev
pnpm prisma migrate dev
pnpm prisma db seed
```

The full per-tenant migration-fanout mechanism (skeleton database first, then every tenant database
in sequence, ADR-056) is a **production/staging deployment concern**, not a local-development one —
local development only ever runs against the single local database above. Full fanout-script detail
is tracked as still-to-be-designed per `1-project/4-tech-stack.md` §271-281's own note, not
guessed here.

---

# 12. Running the Application

Backend

```bash
cd backend
pnpm run start:dev
```

Frontend

```bash
cd frontend
pnpm run dev
```

Full stack (from the workspace root, running both concurrently — exact script name/tooling, e.g. a
root `pnpm dev` using `concurrently` or pnpm's own `--parallel` workspace filter, is an
implementation-time convenience choice, not specified further here)

```bash
pnpm --parallel --filter backend --filter frontend run dev
```

---

# 13. Development Workflow

```
Pull latest code
        ↓
pnpm install (pick up any new/updated dependencies)
        ↓
pnpm prisma migrate dev (pick up any new migrations)
        ↓
Start backend + frontend (§12)
        ↓
Develop
        ↓
Run tests (`6-development/6-testing-strategy.md`, late wave)
        ↓
Lint/format check (§14)
        ↓
Commit (`6-development/4-git-workflow.md`)
```

---

# 14. Code Quality Tools

Per `1-project/4-tech-stack.md` §11 (ADR-019):

- **Formatter**: Prettier.
- **Linter**: ESLint — configured for both the NestJS backend and Next.js frontend (shared base
  config at the workspace root, app-specific overrides where a framework's own linting plugin
  requires them, e.g. `eslint-plugin-react-hooks` for the frontend).
- **Static analysis / Type checker**: TypeScript compiler (`tsc --noEmit`) — strict mode across both
  apps (`4-ui/8-frontend-development-standards.md` §21 already commits the frontend to this; the
  backend follows the same discipline).
- **Dependency checker**: `pnpm audit` — run as part of the standard workflow, not a separate tool.

Installation: bundled as workspace devDependencies (`pnpm install` at the root, §8).

Configuration: `.eslintrc`/`eslint.config.js` and `.prettierrc` at the workspace root, full
convention detail in `6-development/3-coding-standards.md` (this same batch) — not duplicated here.

Execution commands:

```bash
pnpm run lint
pnpm run format
pnpm run typecheck
```

---

# 15. Debugging

- **IDE debugger**: VS Code's built-in Node.js debugger (launch config targeting
  `backend/src/main.ts` for the NestJS process) and browser DevTools' React/Next.js source-map
  support for the frontend.
- **Browser DevTools**: React DevTools extension, Network tab for API request inspection.
- **API debugging**: Postman (`1-project/4-tech-stack.md` §9, ADR-018) against the locally running
  backend; OpenAPI/Swagger UI (auto-generated, `3-api/`) for interactive endpoint exploration.
- **Database inspection**: Prisma Studio (`pnpm prisma studio`) — visual local database browser,
  bundled with Prisma per the already-locked ORM choice.
- **Logging**: NestJS's built-in Logger for backend console output during local development; full
  structured/production logging strategy is a deployment-stage concern
  (`6-development/7-deployment-strategy.md`, late wave), not this document's scope.

Full debugging workflows and common-issue playbooks live in `6-development/10-debugging-guide.md`
(late wave, deferred) — this section covers only tool setup, not debugging procedure.

---

# 16. Testing Environment

- **Unit tests / Integration tests**: Jest (`1-project/4-tech-stack.md` §10, ADR-015) — run against
  the local/test database (§11).
- **End-to-end tests**: Playwright (ADR-027) — runs against a locally running full stack (backend +
  frontend + test database).
- **Test databases**: a dedicated local PostgreSQL database (§11), never the development database,
  to keep test runs deterministic and non-destructive to a developer's working dev data.
- **Test fixtures**: seeded via Prisma's seed mechanism (§11) scoped to test-specific fixture data,
  or per-test setup/teardown within Jest/Playwright itself — exact fixture strategy detailed in
  `6-development/6-testing-strategy.md` (late wave).

---

# 17. Development Utilities

- **Task runner**: pnpm's own `package.json` scripts (workspace-root and per-app) — no separate
  Makefile/task-runner tool introduced, since pnpm scripts already cover this project's needs
  without an extra dependency.
- **Shell scripts**: reserved for genuinely cross-cutting operations that don't fit a single
  package.json script (e.g. a combined lint+typecheck+test pre-push check) — kept in a `scripts/`
  directory at the workspace root if/when one is needed.
- **CLI commands**: Prisma CLI (`pnpm prisma ...`, §11/§15), NestJS CLI (`pnpm nest ...`, scaffolding
  new modules/controllers/services consistent with `6-development/2-folder-structure.md`), Next.js
  CLI (`pnpm next ...`, bundled via `pnpm run dev`/`build`).
- **Local tooling**: no additional local tooling required beyond what's listed in §5.

---

# 18. Security Guidelines

Developers:

- Never commit secrets — `.env`/`.env.local` files are git-ignored; only `.env.example` (no real
  values) is committed.
- Use environment variables for all configuration/secrets (§9) — no hard-coded credentials anywhere
  in source.
- Rotate credentials per the project's standard practice once implementation begins (exact rotation
  cadence is an operational, not documentation-stage, decision).
- Keep dependencies updated — `pnpm audit` (§14) run regularly, dependency updates reviewed like any
  other code change.
- Use secure local configurations — local `.env` values for third-party services (CardConnect,
  QuickBooks, AWS S3, `1-project/4-tech-stack.md` §15) point at sandbox/test credentials, never
  production credentials, on a developer's local machine.

---

# 19. Troubleshooting

| Problem | Cause | Solution |
|----------|-------|----------|
| `pnpm install` fails with a workspace-resolution error | `pnpm-workspace.yaml` out of sync with a newly added app/package, or a stale lockfile | Run `pnpm install` from the workspace root (not a subdirectory); if still failing, delete `node_modules` across the workspace and reinstall |
| Backend can't connect to PostgreSQL | Local PostgreSQL service not running, or `DATABASE_URL` in `backend/.env` doesn't match the local database name/port | Confirm PostgreSQL is running locally (`pg_isready` or platform-equivalent) and `.env` matches §11's setup |
| Prisma Client out of date after pulling new migrations | `pnpm prisma migrate dev` wasn't re-run after pulling | Re-run `pnpm prisma migrate dev` (§11/§13) — regenerates the client alongside applying migrations |
| Frontend can't reach the backend API | `NEXT_PUBLIC_API_URL` unset/misconfigured, or backend dev server not running | Confirm `frontend/.env.local`'s `NEXT_PUBLIC_API_URL` matches the backend's actual local port and that `pnpm run start:dev` is running |

---

# 20. Maintenance

- **Updating dependencies**: `pnpm update` (workspace-aware) — reviewed and tested before merging,
  never blindly bulk-updated.
- **Updating Docker images**: not applicable (§10).
- **Updating local tools**: Node.js/pnpm version bumps follow `1-project/4-tech-stack.md` §17's
  upgrade policy (security updates, LTS releases, compatibility, regression-tested).
- **Cleaning caches**: `pnpm store prune` (pnpm's content-addressable store cleanup), Next.js
  `.next/` cache cleared via `rm -rf frontend/.next` when a stale-build issue is suspected.
- **Resetting development environment**: `pnpm prisma migrate reset` (§11) for the database; a full
  environment reset otherwise means reinstalling dependencies (§8) — no container image to
  rebuild/discard, consistent with §10.

---

# 21. Onboarding Checklist

New developers verify:

- Repository cloned (§6).
- Dependencies installed — workspace-root `pnpm install` (§8).
- Environment variables configured — `.env`/`.env.local` populated from `.env.example` (§9).
- Local PostgreSQL and Redis running.
- Database initialized — migrations applied, seed data loaded (§11).
- Application starts successfully — both backend and frontend dev servers running (§12).
- Tests pass — `pnpm test` at the workspace root (or per-app).
- Linting/type-checking passes — `pnpm run lint` / `pnpm run typecheck` (§14).
- Documentation reviewed — this document, `1-project/`, and the relevant `3-api/`/`4-ui/`/
  `2-database/` documents for whatever area they're starting on.

---

# 22. Best Practices

- Keep local environments close to production within the constraints of the no-Docker decision (§10)
  — same Node/pnpm/PostgreSQL/Redis versions locally as targeted in production.
- Use version-controlled configuration templates (`.env.example`, §9) — never a shared "here's my
  .env" file passed around informally.
- Automate setup where possible — a single root-level `pnpm install` + documented migration/seed
  commands (§8/§11) rather than a long manual checklist beyond what's already in §21.
- Keep tooling versions consistent — Node/pnpm version floor documented (§5), enforced via
  `engines` field in `package.json` where practical.
- Document every required dependency — §5 is the single source of truth, not scattered across
  READMEs.
- Containers are not used (§10) — this is intentional, not a gap to fill in later.
- Verify the environment before starting development — the onboarding checklist (§21) doubles as a
  pre-work sanity check after any environment change (new dependency, new migration).

---

# 23. Assumptions

- Exact seed-data content and test-database naming convention are implementation-time details, not
  specified further than the pattern shown in §11 `[Assumption: this document]`.
- Root-level "run both apps" convenience script (§12) uses pnpm's own parallel-workspace-filter
  execution rather than introducing a dedicated task-runner dependency (e.g. `concurrently`,
  `turbo`) — a reasonable default given the stack's otherwise minimal-dependency direction, not a
  locked ADR `[Assumption: this document]`.
- Local/test PostgreSQL database naming (`lbm_erp_dev`/`lbm_erp_test`) is illustrative, not a locked
  convention — actual naming decided at implementation time `[Assumption: this document]`.

---

# 24. Constraints

- Approved software versions must be used (§5) — Node LTS, pnpm latest stable, PostgreSQL/Redis
  latest stable, per `1-project/4-tech-stack.md` §14/ADR-020.
- **No Docker** — local environment must run as native processes (§10); this is a constraint in the
  positive sense (a deliberate exclusion), not a missing capability.
- Environment variables required before startup (§9) — no hard-coded fallback secrets.
- Secrets must never be stored in source control (§18).

---

# 25. Related Documents

- `1-project/4-tech-stack.md`
- `1-project/1-project-overview.md`
- `2-database/1-database-design.md`
- `3-api/7-api-development-standards.md`
- `4-ui/8-frontend-development-standards.md`
- `6-development/2-folder-structure.md`
- `6-development/3-coding-standards.md`
- `6-development/4-git-workflow.md`
- `6-development/8-containerization.md`
- `6-development/9-ci-cd.md`
- `decisions-log.md` (ADR-013, ADR-014, ADR-015, ADR-018, ADR-019, ADR-020, ADR-027, ADR-056, ADR-070, ADR-071)

---

# 26. Revision History

| Version | Date | Author | Description |
|----------|------|--------|-------------|
| 1.0 | 2026-08-17 | Claude Code (docs-kit generation) | Initial Draft |

---

# Approval

| Role | Name | Status | Date |
|------|------|--------|------|
| Solution Architect | | Pending | |
| Technical Lead | | Pending | |
| DevOps Engineer | | Pending | |

---

# AI Generation Notes

- Follows `1-project/4-tech-stack.md` exactly — every tool/version choice here traces to an already-
  locked ADR, no new stack decisions introduced.
- Specifies all required development tools, versions, and installation procedures for a pnpm
  workspace monorepo (ADR-013) spanning NestJS (backend) and Next.js (frontend).
- Documents reproducible environment setup for Windows, macOS, and Linux — no containerized
  development path, since Docker is explicitly excluded from this project's stack (§10).
- Keeps environment configuration secure via environment variables and a checked-in
  `.env.example` template, never real secrets in source control.
- Includes onboarding (§21), troubleshooting (§19), and maintenance (§20) procedures.
- Consistent with `6-development/2-folder-structure.md`, `3-coding-standards.md`,
  `4-git-workflow.md`, `8-containerization.md`, and `9-ci-cd.md` (this same early-wave batch).
- Framework-specific installation commands (pnpm/NestJS/Next.js/Prisma) used directly rather than
  kept generic, since the stack is already fully locked project-wide.
