# Changelog

All notable changes to this project are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/); versioning is tied to milestone number
(`v{milestone}.0.0` for a milestone's first release, `v{milestone}.{minor}.{patch}` for later
fixes/enhancements within it) per `10-release/1-release.md`'s default scheme.

## [v1.0.0] — 2026-08-18 — M1: Environment Setup

First release. Local-dev-only — no staging/production environment exists yet (see RAID R-002); this
release covers everything short of a real deploy.

### Added — EPIC-001, Environment Setup

- Git repository, GitHub remote, base `.gitignore`/README (T-001).
- pnpm workspace monorepo (T-002).
- NestJS backend scaffold (T-003) and Next.js frontend scaffold (T-004).
- Prisma schema + local dev PostgreSQL (T-005).
- Environment variable templates, both apps (T-006).
- ESLint + Prettier + TypeScript strict mode, both apps (T-007).
- Tailwind CSS + shadcn/ui + design tokens wired into frontend (T-008).
- GitHub Actions CI pipeline — lint/typecheck/test/build gates (T-009).
- `main` branch protection rules (T-010).
- JWT auth scaffold — strategy, Guards skeleton (T-011).
- Full local dev loop verified end-to-end (T-012).

### Added — EPIC-002, Platform Administration (Skeleton Control Panel)

- `TenantRegistry`/tenant DB topology, local skeleton + tenant database setup (T-022).
- Tenant-resolution middleware, per-tenant Prisma client, `AsyncLocalStorage`-based context (T-023).
- Tenant provisioning — `POST /skeleton/tenants`, real `CREATE DATABASE` + migration + bootstrap
  Super Admin (T-024).
- Migration fanout — staged testing → demo → live, halt-on-failure, both CLI script and (added
  during T-027) an HTTP endpoint the control panel actually calls (T-025).
- Cron/job management backend — BullMQ repeatable jobs, per-tenant offset, run history (T-026).
- Skeleton control panel UI — tenant list/create, migration trigger, cron management screens
  (T-027). Also added along the way: `GET /skeleton/tenants` (list endpoint the design doc never
  specced), a dev-only JWT issuer script (real login doesn't exist until the Users module), and
  `app.enableCors()` (ADR-176's policy was locked but never wired up).
- Verified end-to-end against a real second local tenant, real migration fanout, real cron panel
  data (T-028).

### Added — EPIC-003, App Shell / Chrome (M2's first epic, shipped alongside this release)

- Responsive sidebar navigation shell — desktop/tablet/mobile (T-013).
- Top bar — search, branch switcher, notifications, quick create, user menu (T-014).
- Breadcrumb component (T-015).
- Login screen — mock auth flow, `react-hook-form` + `zod` (first use of the locked ADR-174 stack)
  (T-016).
- Session-expired / 403 / 404 / generic error screens (T-017).
- Quick Actions slide-in panel + FAB trigger (T-018).
- Mock role-based sidebar menu visibility (T-019).
- Realistic mock/demo dataset for the Dashboard (T-021).
- Dashboard shell — KPI row, hand-built Sales Trend + Order Status charts, P&L overview, recent
  orders, low inventory, customer activity, warehouse summary, top products/customers/territory
  (T-020).

### Fixed

- `GET /skeleton/tenants` leaking Postgres credentials (`databaseUrl`) in its response — closed
  before shipping.
- Dashboard chart categorical palette failed a chart-specific dark-mode legibility check — added a
  dark-mode-only override.

### Known gaps (tracked, not blocking)

- No real deploy/production verification — RAID R-002.
- `/api/v1` prefix documented in `frontend/.env.local.example` but not implemented in
  `backend/src/main.ts` — TD-001.
