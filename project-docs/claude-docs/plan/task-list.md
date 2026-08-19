# Task List

Real tasks exist for: **EPIC-001** (Environment Setup), **EPIC-003** (App Shell/Chrome), **EPIC-002**
(Platform Administration, own design doc), **EPIC-004/EPIC-005** (Users — the first module whose
`docs-kit/5-modules/users/` JIT set is approved), **EPIC-010/EPIC-011** (UOM — the second module
whose `docs-kit/5-modules/uom/` JIT set is approved, incl. the ADR-190/191/192 amendment rounds), and
now **EPIC-006/EPIC-007** (Location — the third module whose `docs-kit/5-modules/location/` JIT set is
approved, incl. the ADR-198 amendment round). Every other module epic (UI Design + Backend/API, 12
remaining modules) carries:

> **Task list: TBD — awaiting just-in-time module documentation.**

Status values: `Available` / `Claimed` / `In Progress` / `Blocked` / `Done` / `Cancelled`, starting
`Available`. **Assigned To**: empty (solo developer + AI-assisted development currently — see
`6-development/4-git-workflow.md` §11's staffing note).

---

## EPIC-001 — Environment Setup (Milestone 1)

| ID | Task | Source Reference | Dependencies | Estimate | File/Folder Footprint | Status | Assigned To |
|----|------|-------------------|---------------|----------|--------------------------|--------|-------------|
| T-001 | Initialize Git repository, connect GitHub remote, base `.gitignore`/README | `6-development/4-git-workflow.md` §4/§6, `2-folder-structure.md` §17 | — | S | repo root, `.gitignore`, `README.md` | Done | |
| T-002 | Set up pnpm workspace (`pnpm-workspace.yaml`, root `package.json`) | `6-development/2-folder-structure.md` §4/§10, `1-development-environment.md` §7/§8 (ADR-013) | T-001 | S | `pnpm-workspace.yaml`, root `package.json` | Done | |
| T-003 | Scaffold NestJS backend app | `6-development/2-folder-structure.md` §5, `1-development-environment.md` §7 | T-002 | M | `backend/` | Done | |
| T-004 | Scaffold Next.js frontend app | `6-development/2-folder-structure.md` §6, `4-ui/8-frontend-development-standards.md` §4 | T-002 | M | `frontend/` | Done | |
| T-005 | Initialize Prisma schema + local dev PostgreSQL database | `6-development/1-development-environment.md` §11, `2-database/1-database-design.md` | T-003 | M | `prisma/schema.prisma`, `backend/src/prisma/` | Done | |
| T-006 | Configure environment variable templates (`.env.example`) | `6-development/1-development-environment.md` §9 | T-003, T-004 | S | `backend/.env.example`, `frontend/.env.local.example` | Done | |
| T-007 | Configure ESLint + Prettier + TypeScript strict mode (both apps) | `6-development/3-coding-standards.md` §6/§18, `1-development-environment.md` §14 (ADR-019) | T-002 | M | root `.eslintrc`/`eslint.config.js`, `.prettierrc`, `tsconfig.json` (root + per-app) | Done | |
| T-008 | Wire Tailwind CSS + shadcn/ui + design tokens into frontend | `4-ui/3-design-system.md` §4, `4-ui/8-frontend-development-standards.md` §11 (ADR-025) | T-004 | M | `frontend/tailwind.config.ts`, `frontend/src/styles/` | Done | |
| T-009 | Set up GitHub Actions CI pipeline (lint/typecheck/test/build gates) | `6-development/9-ci-cd.md` §5/§6/§9/§11 (ADR-181) | T-001, T-007 | M | `.github/workflows/ci.yml` | Done | |
| T-010 | Configure `main` branch protection rules | `6-development/4-git-workflow.md` §13 | T-001 | S | GitHub repo settings (no code footprint) | Done | |
| T-011 | Scaffold authentication (JWT strategy, Guards skeleton) | `3-api/2-authentication.md`, `3-api/3-authorization.md` | T-003, T-005 | M | `backend/src/auth/`, `backend/src/common/guards/` | Done | |
| T-012 | Verify full local dev loop (backend + frontend + Postgres + Redis running together) | `6-development/1-development-environment.md` §12/§21 | T-005, T-006, T-008, T-011 | S | *(verification task, no new footprint)* | Done | |

> **T-012 note**: Postgres connectivity, backend dev server (`pnpm --filter backend run start:dev`,
> port 3000), and frontend dev server (`pnpm --filter frontend run dev`, port 3001 — 3000 already
> taken) all verified working together on 2026-08-17. Redis: Memurai (Windows service) failed to
> install on this machine — a broken LocalSystem temp folder blocked the MSI installer, a
> machine-level issue outside this project's scope. Developer runs Redis via Docker instead: a
> dedicated `lbm-erp-redis` container (`redis:7-alpine`) on host port `6380` (port `6379` already
> used by an unrelated project's container on this machine) — `docker run -d --name lbm-erp-redis
> -p 6380:6379 --restart unless-stopped redis:7-alpine`. Verified via `redis-cli ping` → `PONG` and
> `Test-NetConnection -Port 6380` → reachable from Windows. This machine's local `backend/.env`
> (git-ignored) points `REDIS_URL` at `redis://localhost:6380`; `backend/.env.example` stays at the
> conventional `6379` default since the port conflict is specific to this machine, not the project.

---

## EPIC-003 — App Shell / Chrome (Milestone 2)

Cross-epic dependency: every task below also depends on **EPIC-001 being Done** (needs the
scaffolded frontend app + design tokens wired, T-004/T-008) — not restated per row below.

| ID | Task | Source Reference | Dependencies | Estimate | File/Folder Footprint | Status | Assigned To |
|----|------|-------------------|---------------|----------|--------------------------|--------|-------------|
| T-013 | Build responsive sidebar navigation shell (desktop/tablet/mobile) | `4-ui/1-navigation.md` §3/§12, `4-ui/6-responsive-design.md` §6/§12 | EPIC-001 Done | L | `frontend/src/components/shared/Sidebar*`, `frontend/src/app/(dashboard)/layout.tsx` | Done | |
| T-014 | Build top bar (search, branch switcher, notifications, quick actions, user menu) | `4-ui/1-navigation.md` §4, `4-ui/2-user-flows.md` §7 walkthrough | T-013 | M | `frontend/src/components/shared/TopBar*`, `frontend/src/components/ui/dropdown-menu.tsx` | Done | |
| T-015 | Build breadcrumb component | `4-ui/1-navigation.md` §8 | T-013 | S | `frontend/src/components/shared/Breadcrumb.tsx` | Done | |
| T-016 | Build login screen (mock auth flow for this milestone) | `4-ui/2-user-flows.md` §6, `4-ui/5-form-standards.md` | EPIC-001 Done | M | `frontend/src/app/(auth)/login/page.tsx`, `frontend/src/app/(auth)/layout.tsx`, `frontend/src/components/ui/form-field.tsx` | Done | |
| T-017 | Build session-expired / 403 / 404 error screens | `4-ui/2-user-flows.md` §5/§11, `4-ui/1-navigation.md` §15 | T-013 | S | `frontend/src/app/error.tsx`, `not-found.tsx`, `(auth)/session-expired/page.tsx`, `(dashboard)/403/page.tsx` | Done | |
| T-018 | Build Quick Actions slide-in panel + FAB trigger | `4-ui/4-component-standards.md` §4 Overlay Components, `4-ui/2-user-flows.md` §7 walkthrough | T-014 | M | `frontend/src/components/shared/QuickActionsPanel.tsx`, `frontend/src/components/ui/sheet.tsx` | Done | |
| T-019 | Wire mock role-based menu visibility (role→menu matrix) | `4-ui/1-navigation.md` §10 | T-013, T-014 | S | `frontend/src/config/role-menu-map.ts` | Done | |
| T-020 | Build Dashboard shell layout (KPI row / analytics row / operations row grid, mock data) | `4-ui/2-user-flows.md` §7 full walkthrough, `4-ui/3-design-system.md` §6 | T-013, T-014, T-015, T-021 | L | `frontend/src/app/(dashboard)/dashboard/page.tsx`, `frontend/src/components/shared/dashboard/`, `frontend/src/components/ui/badge.tsx` | Done | |
| T-021 | Seed realistic mock/demo dataset for Dashboard + shell (domain-realistic values, not placeholder strings) | `6-implementation-plan/1-implementation-plan.md` §3 demo-data realism requirement; `1-project/1-project-overview.md` domain | EPIC-001 Done | M | `frontend/src/lib/mock-data/` | Done | |

---

## EPIC-002 — Platform Administration / Skeleton Control Panel (Milestone 1)

Design doc: `epic-002-platform-administration/1-design.md` (ADR-182–185). Not one of the 15 MVP
modules — cross-tenant infrastructure, needed before any real tenant work in M3+.

| ID | Task | Source Reference | Dependencies | Estimate | File/Folder Footprint | Status | Assigned To |
|----|------|-------------------|---------------|----------|--------------------------|--------|-------------|
| T-022 | Add `TenantRegistry` + minimal bootstrap `User` Prisma models; local skeleton/tenant DB topology | Design doc §2/§4, ADR-183/184/185 | T-005 | M | `prisma/schema.prisma`, `backend/.env`, `backend/.env.example` | Done | |
| T-023 | Build tenant-resolution middleware + per-tenant cached `PrismaClient` (subdomain → `@prisma/adapter-pg`) | Design doc §3, ADR-183 | T-022 | L | `backend/src/tenant/` | Done | |
| T-024 | Build tenant provisioning flow (empty `CREATE DATABASE` + migration replay — not `TEMPLATE` clone, see task-list note below; registry insert, bootstrap Super Admin user) | Design doc §5 | T-022, T-023 | M | `backend/src/tenant/provisioning/` | Done | |
| T-025 | Build migration fanout script (skeleton first, staged by type, sequential, halt-on-failure) | Design doc §6, ADR-056 | T-022 | M | `backend/scripts/migrate-fanout.ts` | Done | |
| T-026 | Build cron/job management backend (BullMQ repeatable jobs, per-tenant offset, run history) | Design doc §7, ADR-059 | T-022, T-023 | L | `backend/src/jobs/` | Done | |
| T-027 | Build skeleton control panel UI (tenant list/create, migration trigger, cron management screens) | Design doc §8 | T-024, T-025, T-026 | L | `frontend/src/app/skeleton/`, `backend/src/tenant/migrate-fanout.ts`, `backend/scripts/issue-dev-token.ts` | Done | |
| T-028 | Verify end-to-end: provision a real 2nd local tenant, run migration fanout against it, confirm cron panel | Design doc §9 | T-024, T-025, T-026, T-027 | S | *(verification task, no new footprint)* | Done | |

> **T-024 note**: `CREATE DATABASE ... TEMPLATE` requires zero active connections to the source
> database (skeleton) at the moment of cloning — impossible in practice, since `PrismaService`
> keeps a persistent connected pool to skeleton for the app's own lifetime. Implemented instead as
> empty `CREATE DATABASE` + `prisma migrate deploy` replay against the new database — same end
> result (every tenant shares skeleton's exact schema, ADR-056), sidesteps the connection
> restriction entirely, and is fast enough at this schema size that TEMPLATE cloning's speed
> advantage doesn't matter yet. Verified via a real Postgres e2e test
> (`backend/test/tenant-provisioning.e2e-spec.ts`) — provisions an actual tenant database, checks
> the bootstrap Super Admin row, and cleans up after itself.

> **T-026 note**: Design doc §2 didn't originally specify the job-scheduling schema — added
> `JobDefinition`/`JobSchedule`/`JobRun` (skeleton-only, same convention as `TenantRegistry`) as a
> mechanical extension of the already-approved §7 scope, not a new architecture decision. Daily
> `baseHour`/`baseMinute` fields used instead of raw cron-string offsetting (simpler/safer to
> stagger, matches ADR-059's own "1:00am / 1:15am" example exactly). Modern BullMQ (v6) replaced
> the old repeatable-jobs API with Job Schedulers (`upsertJobScheduler`/`getJobSchedulers`/
> `removeJobScheduler`) — used that instead of the deprecated API. Verified via a real Postgres +
> Redis e2e test (`backend/test/job-scheduling.e2e-spec.ts`) — registers a staggered schedule,
> confirms the exact computed cron pattern, fires a job and confirms run-history gets recorded, and
> confirms disabling a schedule removes it from BullMQ.

---

## EPIC-004 — Users — UI Design (Milestone 2)

Source: `docs-kit/5-modules/users/9-ui.md` (22 screens, 5 clusters), `4-ui/1-navigation.md` §6.
Mock/static data only — real backend wired in EPIC-005. Cross-epic dependency: every task below also
depends on **EPIC-003 being Done** (needs Sidebar/TopBar/Breadcrumb/Sheet/Badge primitives,
T-013–T-021) — not restated per row.

| ID | Task | Source Reference | Dependencies | Estimate | File/Folder Footprint | Status | Assigned To |
|----|------|-------------------|---------------|----------|--------------------------|--------|-------------|
| T-029 | User List + Detail + Create/Edit screens (mock data) | `9-ui.md` §4 User List/Create/Edit | EPIC-003 Done | L | `frontend/src/app/(dashboard)/users/page.tsx`, `[id]/page.tsx`, `new/page.tsx`, `[id]/edit/page.tsx` | Done | |
| T-030 | Shared `TransferTargetPicker` delete-confirmation component; wire to User delete | `9-ui.md` §4 Delete confirmation, §6; `3-business-rules.md` BR-001 | T-029 | M | `frontend/src/components/shared/TransferTargetPicker.tsx` | Done | |
| T-031 | Role administration screen: hierarchy tree picker, drag-and-drop reparent, Create/Edit form, per-role 2FA toggle (mock) | `9-ui.md` §4 Role administration | T-030 | L | `frontend/src/app/(dashboard)/users/roles/`, `frontend/src/components/shared/RoleTree.tsx` | Done | |
| T-032 | Profile administration: `RoleProfileGrid` permission grid (desktop/tablet) + mobile module-list → `Sheet` drill-in (`ModulePermissionSheet`) (mock) | `9-ui.md` §4 Profile/Group administration, §6, §8 | T-018, T-030 | L | `frontend/src/app/(dashboard)/users/profiles/`, `frontend/src/components/shared/RoleProfileGrid.tsx`, `ModulePermissionSheet.tsx` | Done | |
| T-033 | Group administration: List/Create/Edit, member picker (Users/Roles/Roles-and-Subordinates) (mock) | `9-ui.md` §4 Profile/Group administration | T-030 | M | `frontend/src/app/(dashboard)/users/groups/` | Done | |
| T-034 | Change Password modal (self-service + admin-reset variants) (mock) | `9-ui.md` §4 Change Password | EPIC-003 Done | S | `frontend/src/components/shared/ChangePasswordModal.tsx` | Done | |
| T-035 | 2FA verification-code entry screen + barcode-login fallback (login sub-states) (mock) | `9-ui.md` §2, §4; `1-module.md` §14 | T-016 | M | `frontend/src/app/(auth)/login/` (sub-states) | Done | |
| T-036 | Time Clock widget: clock-in/out button/barcode scan, elapsed time, task-annotation prompt (mock) | `9-ui.md` §4 Time Clock widget, §9 (aria-live) | EPIC-003 Done | M | `frontend/src/components/shared/TimeClockWidget.tsx` | Done | |
| T-037 | Time-Card override screen (admin/manager correction) (mock) | `9-ui.md` §2 Time-Card override | T-036 | M | `frontend/src/app/(dashboard)/users/timeclock/override/page.tsx` | Done | |
| T-038 | Personal Day/Time Off submission (2 form shapes) + admin Personal-Days listing (mock) | `9-ui.md` §2 Personal Day/Personal-Days listing | EPIC-003 Done | M | `frontend/src/app/(dashboard)/users/personal-days/` | Done | |
| T-039 | Payroll Report screen: date-range selector, per-hours-type table, "Needs Resolution" unclosed-punch badge, no export action | `9-ui.md` §4 Payroll Report (ADR-037, ADR-078) | T-036 | M | `frontend/src/app/(dashboard)/users/payroll/page.tsx` | Done | |
| T-040 | QuickBooks sync status screen (per-user, revived integration) (mock) | `9-ui.md` §2 QuickBooks sync status (ADR-074) | T-029 | S | `frontend/src/app/(dashboard)/users/quickbooks/page.tsx` | Done | |
| T-041 | CSV Import wizard: Upload → Column Mapping → Validate/Process, per-row exclusion reasons (mock) | `9-ui.md` §4 CSV Import wizard | T-029 | M | `frontend/src/app/(dashboard)/users/import/` | Done | |
| T-042 | Mass Update screen (Admin-only field/value picker) (mock) | `9-ui.md` §2 Mass Update | T-029 | S | `frontend/src/app/(dashboard)/users/mass-update/page.tsx` | Done | |
| T-043 | Self-service Mail Account + notification-preference screen | `9-ui.md` §2 Mail Account administration; `2-functional-specification.md` FR-012 | EPIC-003 Done | S | `frontend/src/app/(dashboard)/settings/mail-account/page.tsx` | Done | |
| T-044 | Barcode Label print screen (label-layout parameters) (mock) | `9-ui.md` §2 Barcode Label print | T-029 | S | `frontend/src/app/(dashboard)/users/barcode-labels/page.tsx` | Done | |
| T-045 | Seed realistic mock/demo dataset — Users (5 seeded roles + hierarchy, profiles/permission grid, groups, time-clock history incl. one deliberately unclosed punch, personal days, payroll periods; domain-realistic names, not placeholder strings) | `6-implementation-plan/1-implementation-plan.md` §3 demo-data requirement; `1-module.md` domain | T-021 | M | `frontend/src/lib/mock-data/users.ts` | Done | |

> **Not built in this epic (approved scope exclusions, not omissions)**: Sharing Rule administration
> (ADR-081, dropped project-wide), payroll CSV/ZIP export (ADR-078, deferred past MVP), a Notification
> Scheduler / Word Template screen (ADR-188 — backend/API-only in this MVP, no UI).

---

## EPIC-005 — Users — Backend/API (Milestone 3)

Source: `docs-kit/5-modules/users/4-schema.md`, `8-api.md`, `3-business-rules.md`,
`10-implementation-plan.md`. Wires real backend onto the Milestone 2 UI above (EPIC-004) — replaces
each screen's mock data with real API calls. Cross-epic dependency: every task below also depends on
**EPIC-004's corresponding screen being Done** (already listed per task) and on **T-005/T-011**
(Prisma init, auth scaffold) — not restated per row beyond the specific screen it wires.

| ID | Task | Source Reference | Dependencies | Estimate | File/Folder Footprint | Status | Assigned To |
|----|------|-------------------|---------------|----------|--------------------------|--------|-------------|
| T-046 | Users schema migration — all entities (`4-schema.md` §2-§8: User extensions, HR/Preference/Notification-pref children, Role hierarchy, Profile + 3 permission tables, Group + membership, TimeClock + ClockInTaskDetail, PersonalDay/Holiday, LoginHistory, MailAccount, QuickBooksSyncPointer, NotificationScheduler, WordTemplate) + seed ADR-002's 5 roles + default Profile template | `4-schema.md` full; `10-implementation-plan.md` Phase 2 | T-005 | M | `prisma/schema.prisma`, `backend/prisma/seed.ts` | Done* | |
| T-047 | Shared `EntityIdentifier` value object + delete-family validation boundary (ADR-154, closes USR-RISK-001), applied to User/Role/Profile/Group delete commands | `10-implementation-plan.md` Phase 4; `3-business-rules.md` BR-001 | T-046 | S | `backend/src/common/value-objects/entity-identifier.ts` | Done | |
| T-048 | Authentication backend — login by Username (not Email, ADR-187), logout, JWT issue (`3-api/2-authentication.md`), IP-restriction, DB-backed lockout (ADR-155: 5 attempts/15-min), Inactive-status gate | `8-api.md` `/auth/login`, `/auth/logout`; `10-implementation-plan.md` Phase 3 | T-011, T-046 | M | `backend/src/auth/` | Done* | |
| T-049 | Per-role 2FA backend (ADR-075): `role_two_factor_requirements` config endpoint, login 2FA sub-flow (send/verify code, 15-min window), conditional-required-Email enforcement | `8-api.md` `/auth/2fa/verify`, `/roles/{id}/two-factor-requirement`; `2-functional-specification.md` FR-006 | T-048 | M | `backend/src/auth/two-factor/` | Done* | |
| T-050 | Permission read model — Role→Profile→module/field/action resolution, real per-request resolve + invalidation on role/profile change (no file cache, closes USR-RISK-015) | `2-functional-specification.md` §10; `10-implementation-plan.md` Phase 3 | T-046, T-048 | L | `backend/src/users/permissions/` | Done | |
| T-051 | User CRUD backend (create/edit/delete w/ transfer-target, CSV import, mass-update, duplicate email/username invariant ADR-157) — wire to T-029, T-030, T-041, T-042 | `8-api.md` `/users*`; `2-functional-specification.md` FR-002 | T-047, T-050, T-029, T-030, T-041, T-042 | L | `backend/src/users/users.controller.ts`, `users.service.ts` | Done* | |
| T-052 | Role CRUD + hierarchy reparent (depth recompute) + Profile CRUD (consolidated save path ADR-134, explicit-deny-by-default ADR-156) — wire to T-031, T-032 | `8-api.md` `/roles*`, `/profiles*`; FR-003, FR-005 | T-047, T-050, T-031, T-032 | L | `backend/src/users/roles/`, `backend/src/users/profiles/` | Done | |
| T-053 | Group CRUD backend — wire to T-033 | `8-api.md` `/groups*`; FR-004 | T-047, T-033 | S | `backend/src/users/groups/` | Done | |
| T-054 | Change Password backend (self-service + admin-reset collapsed to one command, ADR-155 complexity check) — wire to T-034 | `8-api.md` `/users/me/password`, `/users/{id}/password-reset`; FR-007 | T-048, T-034 | S | `backend/src/auth/` (or `backend/src/users/`) | Done | |
| T-055 | Time Clock backend — clock-in/out state machine, `labor_status` task annotation (ADR-077), auto-clock-out safety-net job, admin override endpoint — wire to T-036, T-037 | `8-api.md` `/timeclock/*`; `3-business-rules.md` §6 state machine | T-046, T-036, T-037 | L | `backend/src/users/timeclock/` | Done | |
| T-056 | Payroll pipeline — hours/overtime calculator (flat US 1.5x/40hr, ADR-036), unclosed-punch flagging (ADR-037), Personal-Day→hours-classification bridge — wire to T-039 | `8-api.md` `/payroll/report`; FR-009 | T-055, T-039 | M | `backend/src/users/payroll/` | Done | |
| T-057 | Personal Days & Holidays backend (submit + admin holiday catalog/assignment, real FK closes USR-RISK-004) — wire to T-038 | `8-api.md` `/personal-days`, `/holidays`; FR-010 | T-046, T-038 | M | `backend/src/users/personal-days/`, `backend/src/users/holidays/` | Done | |
| T-058 | Login History audit backend (append-only, read-only) — wire to admin view | `8-api.md` `/login-history`; FR-011 | T-048 | S | `backend/src/users/login-history/` | Done | |
| T-059 | QuickBooks employee sync backend — revived, async via BullMQ (ADR-074) — wire to T-040 | `8-api.md` `/quickbooks-sync/status`; FR-013 | T-046, T-040 | M | `backend/src/users/quickbooks/` | Done | |
| T-060 | Mail Account / Notification Scheduler / Word Template backend (minimal CRUD per `4-schema.md` — see traceability note below) — wire Mail Account to T-043 | `4-schema.md` MailAccount/NotificationScheduler/WordTemplate entities; `10-implementation-plan.md` Phase 9 | T-046, T-043 | M | `backend/src/users/mail-accounts/`, `notification-schedulers/`, `word-templates/` | Done | |
| T-061 | Barcode label output generation (label-layout parameters) — wire to T-044 | `2-functional-specification.md` §6 Outputs; `9-ui.md` §2 Barcode Label print | T-046, T-044 | S | `backend/src/users/barcode-labels/` | Done | |
| T-062 | Seed realistic backend demo/test data — Users (roles, profiles, sample users per role, time-clock history incl. an unclosed punch, payroll periods; extends T-045's dataset server-side, not a second inconsistent one) | `6-implementation-plan/1-implementation-plan.md` §3 demo-data requirement | T-046, T-045 | S | `backend/prisma/seed.ts` | Done | |
| T-063 | Concurrent time-card-override lock (ADR-079/080/084 standing Redis-TTL, heartbeat-renewed lock) applied to the timeclock override endpoint — first implementation of this project-wide shared lock utility | `2-functional-specification.md` §11 Concurrent updates | T-055 | M | `backend/src/common/locks/`, `backend/src/users/timeclock/` | Done | |
| T-064 | Full Users module test suite (`11-testing.md` full traceability) + OpenAPI docs for this module's endpoint set | `11-testing.md`; `6-development/9-ci-cd.md` | T-047–T-063 | M | `backend/test/users*.e2e-spec.ts`, `backend/src/users/**/*.spec.ts` | Done | |

> **Traceability completeness check (step 4a)**: every entity in `4-schema.md` maps to a task above
> (T-046 covers schema creation for all of them). Every endpoint in `8-api.md`'s API Summary maps to
> a task. Every FR (FR-001–FR-013) and every risk mitigation in `10-implementation-plan.md`'s
> Security-by-Construction section maps to a task. **One gap found and resolved with the developer,
> not silently assumed**: `NotificationScheduler`/`WordTemplate` had schema entities and a backend
> mention (Phase 9) but no `8-api.md` endpoint and no `9-ui.md` screen. Resolved as **ADR-188**:
> backend/API-only, no dedicated UI in this MVP. T-060 builds minimal CRUD for both per schema; only
> Mail Account gets a UI task (T-043).

> **T-046–T-054 completion notes (`*` marked above)** — see `tasks/T-046-through-T-054-todos.md`
> for the full writeup, verified via a real e2e suite (`backend/test/users-auth.e2e-spec.ts`, 6
> tests) plus the full pre-existing backend suite (4 suites / 13 tests, no regressions):
> - **T-046**: migration applied to both local databases; role/profile *seeding* deferred to its
>   own dedicated task, T-062, not silently skipped.
> - **T-048**: no IP-restriction check — no org-settings table exists yet to gate it against.
> - **T-049**: 2FA codes held in an in-memory `Map`, not Redis (ADR-031's own async convention)
>   — a restart loses in-flight codes, flagged as a known dev-only limitation.
> - **T-051**: CSV import (T-041) and mass-update (T-042) backend endpoints not built — only
>   create/edit/delete/duplicate-check. T-055 onward (Time Clock, Payroll, Personal Days, Login
>   History detail, QuickBooks, Mail/Notification/WordTemplate, Barcode, concurrency lock, full
>   test suite) are **not built** — still `Available`, not overstated as Done.

---

## EPIC-010 — UOM — UI Design (Milestone 2)

Source: `docs-kit/5-modules/uom/9-ui.md` (7 screens, all Admin-only pure-CRUD/config), `4-ui/1-
navigation.md`. Mock/static data only — real backend wired in EPIC-011. Cross-epic dependency:
every task below also depends on **EPIC-003 being Done** (Sidebar/TopBar/Sheet/DataTable/Dialog
primitives) — not restated per row. Navigation placement follows `1-module.md` §10's flagged
Assumption (Settings → System Configuration → Unit of Measure, mirroring ADR-095's own per-module
role-mapping screens) — not independently locked by any ADR; confirm during the module's design
review.

| ID | Task | Source Reference | Dependencies | Estimate | File/Folder Footprint | Status | Assigned To |
|----|------|-------------------|---------------|----------|--------------------------|--------|-------------|
| T-065 | Category List/Edit screen — DataTable + Add/Edit Dialog (Name, Sort Order), soft-delete with BR-014 in-use-guard error surfacing (mock data) | `9-ui.md` §4 Category List/Edit | EPIC-003 Done | S | `frontend/src/app/(dashboard)/settings/uom/categories/page.tsx` | Done | |
| T-066 | Type List/Edit screen — same pattern as Category, plus an optional Category picker dropdown (ADR-192) (mock data) | `9-ui.md` §4 Type List/Edit | T-065 | S | `frontend/src/app/(dashboard)/settings/uom/types/page.tsx` | Done | |
| T-067 | Functional Role List/Edit screen — same pattern as Category, pre-populated with the 11 seeded starter roles (rename/delete-able like any row, ADR-094), delete-in-use guard confirmed (ADR-192) (mock data) | `9-ui.md` §4 Functional Role List/Edit; `5-data-dictionary.md` §5 | EPIC-003 Done | S | `frontend/src/app/(dashboard)/settings/uom/functional-roles/page.tsx` | Done | |
| T-068 | Group List screen — Name/Category/Base Type/computed "Uses Picking Hierarchy" badge/Role-count columns, Category filter, Add/Open/Delete actions (mock data) | `9-ui.md` §4 Group List | T-065, T-066 | M | `frontend/src/app/(dashboard)/settings/uom/groups/page.tsx` | Done | |
| T-069 | Group Detail/Edit screen — header (Name, Category, Base Type, read-only computed Picking-Hierarchy indicator) + Role Assignments section (Type dropdown per Functional Role, Base-Type "(default)" fallback label per BR-021) + Conversion Factors section (whole-number `units_per_base` input, inline "factor required" indicator surfacing BR-019 before submit) + Picking Hierarchy drag-reorder section with keyboard-accessible reorder affordance + locked-state banner/all-fields-except-Name-disabled/disabled-Delete for a mocked transaction-referenced Group (BR-020/ADR-190), atomic single-save mental model (mock data) | `9-ui.md` §4 Group Detail/Edit | T-066, T-067, T-068 | L | `frontend/src/app/(dashboard)/settings/uom/groups/[id]/page.tsx`, `.../groups/new/page.tsx`, `frontend/src/components/shared/PickingHierarchyList.tsx` | Done | |
| T-070 | Conversion Factor History panel (Sheet, opened via "View History" next to a Conversion Factor row) — Rate/Effective From/Effective To (or "Current"), read-only, empty state (mock data) | `9-ui.md` §4 Conversion Factor History panel | T-069 | S | `frontend/src/components/shared/ConversionFactorHistorySheet.tsx` | Done | |
| T-071 | Import/Export dialog wiring for UOM Groups — reuses the shared project-wide import/export component (upload + column-mapping for import, format/scope selection for export), per-row validation-result display (mock data) | `9-ui.md` §4 Import/Export dialog; FR-011 | T-068 | S | `frontend/src/app/(dashboard)/settings/uom/groups/` (dialog wiring) | Done | |
| T-072 | Seed realistic mock/demo dataset — UOM (Categories: Length, Volume, Weight, Each; Types spanning real lumber-yard units — Each, Foot, Board Foot, Linear Foot, Case, Pallet, Bundle, Sheet, Pound, Ton, Inner-Pack, Outer-Pack; Groups a real building-materials distributor would use — e.g. "Dimensional Lumber", "Plywood/OSB Sheets", "Loose Fasteners", "Bagged Concrete Mix", "Rebar Bundles" — each with Role Assignments and Conversion Factors, one Group with a full Picking Hierarchy, one Group flagged transaction-referenced/locked so the locked-state UI has real data to render against; domain-realistic names, not placeholder strings) | `6-implementation-plan/1-implementation-plan.md` §3 demo-data requirement; `1-module.md` domain | EPIC-003 Done | M | `frontend/src/lib/mock-data/uom.ts` | Done | |

> **Not built in this epic (approved scope exclusions, not omissions)**: legacy's "Manage UOM Qty
> Pricing" screen (superseded entirely by Pricing's own live-resolution design, ADR-029 — its
> underlying `lbm_applied_uom_pricing` cache is dropped project-wide) and the "Orgill UOM reference"
> screen (unrelated vendor-catalog table, out of this module's domain) — both per `1-module.md` §3
> Out of scope and `9-ui.md` §2's explicit note.

---

## EPIC-011 — UOM — Backend/API (Milestone 3)

Source: `docs-kit/5-modules/uom/4-schema.md`, `8-api.md`, `3-business-rules.md`,
`6-validation.md`, `7-permissions.md`, `10-implementation-plan.md`. Wires real backend onto the
Milestone 2 UI above (EPIC-010) — replaces each screen's mock data with real API calls. Cross-epic
dependency: every task below also depends on **EPIC-010's corresponding screen being Done** (listed
per task) and on **T-005** (Prisma init) — not restated per row beyond the specific screen it wires.
No cross-module Backend/API dependency blocks UOM within M3 — Users, Location, Products, UOM have no
dependency among themselves (`plan/dependencies.md`).

| ID | Task | Source Reference | Dependencies | Estimate | File/Folder Footprint | Status | Assigned To |
|----|------|-------------------|---------------|----------|--------------------------|--------|-------------|
| T-073 | UOM schema migration — all 8 entities (`4-schema.md` §4: Category, Type, Functional Role, Group, Role Assignment, Conversion Factor, Factor History, Picking Hierarchy) incl. the case-insensitive functional unique index on `uom_groups (lower(name))` (BR-001/ADR-191), `RESTRICT`/`CASCADE` FKs per §8, whole-number `CHECK` constraint on `units_per_base` (BR-003/004) + seed the 11 starter Functional Roles (`5-data-dictionary.md` §5, ADR-094) | `4-schema.md` full; `10-implementation-plan.md` Phase 1 | T-005 | M | `prisma/schema.prisma` (UOM models), `backend/prisma/seed.ts` | Done | |
| T-074 | Category/Type/Functional Role CRUD backend — `UomCategoryService`/`UomTypeService`/`UomFunctionalRoleService`, in-use `RESTRICT` delete guard surfaced as a clear "still in use" error (BR-014/VR-015/VR-020), Type's optional `categoryId` (ADR-192), Type-delete → Pricing fixed-price-override cascade via Pricing's own API, never a direct write (BR-016/ADR-053) — wire to T-065, T-066, T-067 | `8-api.md` `/uom/categories*`, `/uom/types*`, `/uom/functional-roles*`; FR-001, FR-002, FR-003 | T-073, T-065, T-066, T-067 | L | `backend/src/uom/categories/`, `backend/src/uom/types/`, `backend/src/uom/functional-roles/` | Done | |
| T-075 | UOM Group backend — `UomGroupService` atomic Group + Role Assignments + Conversion Factors save, Group-save completeness validation (BR-019/VR-010) naming every offending Type/Role, case-insensitive name uniqueness on create **and** rename (BR-001/VR-019), Base-Type-required (BR-002), transaction-reference lock check (BR-020/VR-018 — an `isGroupLocked(groupId)` service call queried before any locked-field commit, `GROUP_LOCKED` 409 naming every rejected field) — wire to T-068, T-069 | `8-api.md` `/uom/groups*`; FR-004, FR-005, FR-006 | T-073, T-074, T-068, T-069 | L | `backend/src/uom/groups/` | Done | |
| T-076 | Conversion Factor History backend — `UomHistoryService`, write-on-change (BR-009) inside the same transaction as a Conversion Factor value change, effective-dated lookup endpoint with optional `asOfDate` — wire to T-070 | `8-api.md` `/uom/groups/{id}/conversion-factors/{typeId}/history`; FR-007 | T-075, T-070 | M | `backend/src/uom/history/` | Done | |
| T-077 | Picking Hierarchy backend — CRUD rows within the Group-save transaction (BR-012 uniqueness on Type and on Sort Order per Group), computed `usesPickingHierarchy` read projection (BR-013/ADR-192, no stored column, `EXISTS`/`COUNT` at read time), single batched pick-unit-breakdown query — not N per-Type calls (FR-010, NFR `1-module.md` §13) — wire to T-069's Picking Hierarchy section | `8-api.md` `/uom/groups/{id}/pick-breakdown`; FR-008, FR-010 | T-075, T-069 | M | `backend/src/uom/picking-hierarchy/` | Done | |
| T-078 | Conversion service backend — `UomConversionService` base-unit-pivot arithmetic (qty and price, either direction, always fractional, never whole-number-rounded — BR-005, BR-007, BR-008), `POST /uom/conversions/resolve` | `8-api.md` `/uom/conversions/resolve`; FR-009 | T-075 | L | `backend/src/uom/conversion/` | Done | |
| T-079 | Role-resolution endpoint — `GET /uom/groups/{id}/roles/{roleId}/resolve`, Base-Type fallback when no explicit Role Assignment exists (BR-021/ADR-192), response distinguishes `"explicit"` vs `"base_type_fallback"` | `8-api.md` `/uom/groups/{id}/roles/{roleId}/resolve`; FR-005, FR-009 | T-075 | S | `backend/src/uom/groups/` (resolve handler) | Done | |
| T-080 | Bulk Import/Export backend — `POST /uom/groups/import` (per-row validation identical to an interactive Group save incl. BR-019's completeness check, VR-017), `GET /uom/groups/export`, standard project-wide background-job pattern (ADR-098) — wire to T-071 | `8-api.md` `/uom/groups/import`, `/uom/groups/export`; FR-011 | T-075, T-071 | M | `backend/src/uom/import-export/` | Done | |
| T-081 | Seed realistic backend demo/test data — UOM (extends T-072's dataset server-side into the real `demo` tenant database: Categories, Types, Functional Roles, Groups with Role Assignments/Conversion Factors, one Group with a full Picking Hierarchy, one Group given a real transactional reference so BR-020's locked-state has real data to render against — not a second, inconsistent dataset) | `6-implementation-plan/1-implementation-plan.md` §3 demo-data requirement | T-073, T-072 | S | `backend/scripts/seed-uom-demo-data.ts` | Done | |
| T-082 | Full UOM module test suite (`11-testing.md` full BR/VR traceability — TC-001 through the Cross-Module Data Flow tests TC-016, TC-020–TC-023) + OpenAPI docs tags for this module's endpoint set | `11-testing.md`; `6-development/9-ci-cd.md` | T-074, T-075, T-076, T-077, T-078, T-079, T-080 | M | `backend/test/uom*.e2e-spec.ts`, `backend/src/uom/**/*.spec.ts` | Done | |

> **Traceability completeness check (step 4a)**: every entity in `4-schema.md` §3/§4 (8 tables) maps
> to T-073 (migration) plus its owning service task (T-074 Category/Type/Role, T-075 Group/Role
> Assignment/Conversion Factor, T-076 Factor History, T-077 Picking Hierarchy). Every endpoint in
> `8-api.md` §2's API Summary (23 endpoints) maps to a task: Category/Type/Functional Role CRUD (12)
> → T-074; Group list/detail/create/update/delete (5) → T-075; Factor History (1) → T-076;
> pick-breakdown (1) → T-077; conversions/resolve (1) → T-078; role resolve (1) → T-079;
> import/export (2) → T-080. Every rule in `3-business-rules.md` (BR-001 through BR-021) maps to a
> task per the Source Reference column above; BR-015 (module-boundary enforcement) and BR-017/018
> (server-side auth, parameterized queries) are architectural constraints applied across every task
> rather than owned by one, not an omission. Every screen/element in `9-ui.md` §2 (7 screens) maps to
> its EPIC-010 counterpart, which this epic's tasks wire onto 1:1. **No gap found**: unlike Users'
> JIT pass, no schema entity, endpoint, business rule, or UI element in UOM's approved doc set lacked
> an owning task. The one item confirmed out of scope and *not* ticketed here — legacy's
> `lbm_applied_uom_pricing` write-back cache and its "Manage UOM Qty Pricing" screen — is a stated
> scope decision (`1-module.md` §3, ADR-029), not a silent omission; see the EPIC-010 exclusions note
> above.

---

## EPIC-006 — Location — UI Design (Milestone 2)

Source: `docs-kit/5-modules/location/9-ui.md` (5 screens/fragments — Branch List, Add-Location
Wizard, Branch Detail/Edit, Lost Sale Log Report, Cost Detail tooltip). Mock/static data only — real
backend wired in EPIC-007. Cross-epic dependency: every task below also depends on **EPIC-003 being
Done** (needs DataTable/Stepper/Switch/AlertDialog/Tooltip primitives) — not restated per row. Per
`1-module.md` §3/§10 and `9-ui.md` §1/§2, Product-at-Location data (QoH, bin, cost, reorder/forecast)
has **no standalone screen of its own** here — it renders entirely inside Products' own product-edit
screen, so no task below builds it; see the scope-exclusion note after the table.

| ID | Task | Source Reference | Dependencies | Estimate | File/Folder Footprint | Status | Assigned To |
|----|------|-------------------|---------------|----------|--------------------------|--------|-------------|
| T-083 | Branch List screen — `DataTable` (Name, Status badge, City/State, Timezone, SO Number Prefix), name search, Status filter (defaults to showing both), Super-Admin-only "Add Location" action, icon-only Open action (ADR-193, no Delete — ADR-197), empty/loading/error states (mock data) | `9-ui.md` §4 Branch List | EPIC-003 Done | M | `frontend/src/app/(dashboard)/settings/locations/page.tsx` | Done | |
| T-084 | Add-Location Wizard — 3-step `Stepper` (Identity & Requirements required; Clone from Existing optional w/ reference-location `Select` + pricing/tax/print checkboxes; Integration Config optional/deferrable), bordered-card sections per ADR-194, step-1-blocks-Next validation, Save → toast → redirect to Branch Detail (mock data) | `9-ui.md` §4 Add-Location Wizard; FR-001, ADR-055 | T-083 | L | `frontend/src/app/(dashboard)/settings/locations/new/page.tsx`, `frontend/src/components/shared/AddLocationWizard.tsx` | Done | |
| T-085 | Branch Detail/Edit screen — page header w/ Active/Inactive `Switch` + `AlertDialog` confirmation (Inactive direction only), sectioned/tabbed content (Identity & Numbering, Addresses, Tax, POS & Print, Email, WMS, Store-Transfer Config, masked Integration Credentials, GL Accounting Configuration tab per FR-011), bordered-card sections (ADR-194), no Delete button anywhere (ADR-197), concurrent-edit-lock banner/read-only state (mock data) | `9-ui.md` §4 Branch Detail/Edit | T-083 | L | `frontend/src/app/(dashboard)/settings/locations/[id]/page.tsx` | Done | |
| T-086 | Lost Sale Log Report routed page — weekly grid (Product, Branch, Lost-Sale Qty/Reason, inline-editable Reorder Level/Alert/Cost/Track-SH/Lost-Sale Factor, icon-only Dismiss per ADR-193), current-week default + read-only week-picker, save-on-blur inline edits, empty/loading/error states (mock data) | `9-ui.md` §4 Lost Sale Log Report | EPIC-003 Done | M | `frontend/src/app/(dashboard)/settings/locations/lost-sales/page.tsx` | Done | |
| T-087 | Seed realistic mock/demo dataset — Location (7 branches with real building-materials-distributor names/addresses/tax rates/prefixes — e.g. "Riverside Lumber & Supply", "Northgate Building Materials" — mixed Active/Inactive status, a current-week Lost Sale Log dataset with real product/reason rows, one branch given a mocked concurrent-edit-lock state so T-085's locked banner has real data to render against; domain-realistic names, not placeholder strings) | `6-implementation-plan/1-implementation-plan.md` §3 demo-data requirement; `1-module.md` domain | EPIC-003 Done | M | `frontend/src/lib/mock-data/locations.ts` | Done | |

> **Not built in this epic (approved scope exclusions, not omissions)**: a standalone Product-at-
> Location list/detail/edit screen — that data's UI lives entirely inside Products' own `9-ui.md`
> (not yet JIT'd), per `1-module.md` §3/§10 and `9-ui.md` §1/§2. The **Cost Detail tooltip** fragment
> (`9-ui.md` §4) is documented in Location's own `9-ui.md` because the API/data it displays is
> Location-owned, but it renders inside Products' product-edit page — its frontend build task belongs
> to Products' own future UI-Design epic (EPIC-008), not this one; not ticketed here to avoid
> duplicating a component build across two epics. Role-Location Assignment and User-Location Tracking
> screens are **Not Applicable — owned by the Users module** (already built/out of this module's
> scope). Location Group has no screen of its own (generic CRM infra, not rebuilt).

---

## EPIC-007 — Location — Backend/API (Milestone 3)

Source: `docs-kit/5-modules/location/4-schema.md`, `8-api.md`, `3-business-rules.md`,
`7-permissions.md`, `10-implementation-plan.md`. Wires real backend onto the Milestone 2 UI above
(EPIC-006) — replaces each screen's mock data with real API calls. Cross-epic dependency: every task
below also depends on **T-005** (Prisma init) — not restated per row beyond the specific screen it
wires. No cross-module Backend/API dependency blocks Location within M3 — Users, Location, Products,
UOM have no dependency among themselves (`plan/dependencies.md`), **except** Phase 6's kit-quantity
propagation (T-092 below), which needs Products' own Kit Component interface — Products has not been
through its own JIT cycle yet, so T-092 builds and unit-tests Location's side of that contract against
a stub now, and only fully integration-tests once Products' own Backend/API epic (EPIC-009) lands
(matches `10-implementation-plan.md`'s own stated Risk).

| ID | Task | Source Reference | Dependencies | Estimate | File/Folder Footprint | Status | Assigned To |
|----|------|-------------------|---------------|----------|--------------------------|--------|-------------|
| T-088 | Location schema migration — all 5 entities (`4-schema.md` §4: `locations` incl. encrypted-at-rest credential families R6, `location_accounting_configs` + `location_gl_account_mappings` child table R7/ADR-198 item 6, `products_at_location` incl. its own first-class surrogate `id` R1, every quantity-family `CHECK (... >= 0)` constraint BR-003/BR-025, nullable cost family BR-023, `location_pass_on_field_configs`), case-insensitive unique index on `locations (lower(name))` (ADR-198 item 5) | `4-schema.md` full; `10-implementation-plan.md` Phase 2 | T-005 | L | `prisma/schema.prisma` (Location models) | Available | |
| T-089 | Product-at-Location core backend — read endpoint w/ lazy-existence sentinel (`{ exists: false }`, ADR-055/BR-022) and null-cost "not yet stocked here" sentinel (BR-023), the **single shared** QoH-write command (`POST .../adjust-qoh`, manual/kit/wms contexts, BR-001–BR-003), non-negative invariant enforced at the application layer first (ADR-038), reason-for-change audit capture, QoH-changed event publication (for WMS), project-wide concurrent-edit lock (ADR-084, reusing T-063's `ConcurrencyLockService`) wired to branch + Product-at-Location edits — wire to T-085's locked-state banner | `8-api.md` `/locations/{id}/products-at-location/{productId}`, `.../adjust-qoh`; FR-004; BR-001, BR-002, BR-003, BR-006, BR-022, BR-023 | T-088, T-085 | L | `backend/src/locations/products-at-location/` | Available | |
| T-090 | Security hardening — parameterized-queries-only / no dynamic column-name construction across every Location write path (BR-026, closes all six confirmed legacy SQL-injection points), real NestJS `RolesGuard`+`JwtAuthGuard` on every write endpoint per `7-permissions.md` §8's authorization table | `3-business-rules.md` BR-026; `7-permissions.md` §8; `10-implementation-plan.md` Phase 4 | T-088, T-089 | M | `backend/src/locations/**` (guards + query layer, cross-cutting) | Available | |
| T-091 | Branch CRUD backend — create (Add-Location wizard, Super-Admin-gated, FR-001), edit (FR-002), status toggle w/ BR-021 enforcement (blocks new SO/PO creation + picker exclusion, immediate no-propagation-delay), reference-location snapshot-copy (pricing/tax/print, ADR-055), GL Accounting Configuration read/update (FR-011, R7) — wire to T-083, T-084, T-085 | `8-api.md` `/locations*`, `/locations/{id}/status`, `/locations/{id}/accounting-config`; FR-001, FR-002, FR-003, FR-011 | T-090, T-083, T-084, T-085 | L | `backend/src/locations/locations.controller.ts`, `locations.service.ts`, `backend/src/locations/accounting-config/` | Available | |
| T-092 | Part-supersession backend — merge service triggered only from reloaded post-save state (BR-004), three-way independent combine options for sales-history/QoH (BR-010), atomic quantity/cost move via the confirmed "true blend" WAC formula (BR-011/ADR-198 item 1), open-order review flagging against SalesOrder/PurchaseOrder (BR-012, non-blocking), kit-quantity-as-computed service (BR-009/R3) against Products' Kit Component interface **stub** (full integration deferred to Products' own JIT cycle, see epic note above) | `8-api.md` `/locations/{id}/products-at-location/{productId}/supersede`; FR-005, FR-006; BR-004, BR-008, BR-009, BR-010, BR-011, BR-012; `10-implementation-plan.md` Phase 6 | T-089, T-090 | L | `backend/src/locations/supersession/` | Available | |
| T-093 | Demand/lead-time/reorder-point calculation pipeline — Avg Daily Demand w/ nonzero clamp (BR-013), Avg Days Between Sales/Avg & High Qty Sold w/ corrected actual-count divisor (BR-014/ADR-150), Projected Next Use Date fresh formula (BR-015/ADR-198 item 2), Avg Lead Time w/ 14-day no-history fallback (BR-016/ADR-198 item 3), Projected Next Order/Receipt Date preserved exactly as legacy incl. the blackout-only-not-weekend walk (BR-017), fresh Reorder Point/Reorder Quantity formula (BR-018/ADR-196, confirmed Safety Stock method ADR-198 item 4), unconditional recompute on every save w/ freeze-date opt-out (BR-005) — calls UOM's conversion service for any needed conversion (BR-024) | `8-api.md` (recompute runs inside the Product-at-Location save path); FR-007; BR-005, BR-013–BR-018, BR-024; `10-implementation-plan.md` Phase 7 | T-089 | L | `backend/src/locations/reorder-calc/` | Available | |
| T-094 | Lost-sale/false-loss pipeline + Location Accounting/Pass-On config backend — accumulate-then-promote pipeline w/ once-per-event factor fix (BR-019/ADR-149), false-loss accumulate-then-promote opposite-sign pipeline (BR-020), scheduled BullMQ promotion cron, Lost Sale Log Report grid read + inline-edit + dismiss endpoints, page-view-triggered admin notification email (ADR-151), Location Pass-On Field Configuration CRUD validated against the real `products_at_location` column set (BR-007) — wire to T-086 | `8-api.md` `/locations/{id}/lost-sale-log*`, `/sales-orders/{soId}/lines/{lineId}/record-lost-sale`, `.../flag-disqualified-sale`, `/products/{productId}/pass-on-field-config`; FR-008, FR-009, FR-010, FR-012; BR-007, BR-019, BR-020 | T-089, T-090, T-086 | M | `backend/src/locations/lost-sale-log/`, `backend/src/locations/pass-on-config/` | Available | |
| T-095 | Cross-module integrations & outputs — supersession domain-event publication (consumed by Forecasting/vendor-line-code/export/autocomplete/B2B-catalog, idempotent-double-delivery safe), WMS's QoH-changed event subscription contract (replaces legacy's direct-table write), Cost Detail tooltip endpoint (field-name validated against the known cost-audit-tracked set, closes the dynamic-column-name injection pattern on this exact endpoint family, BR-026) | `8-api.md` `/locations/{id}/products-at-location/{productId}/cost-detail`; `1-module.md` §11/§12; `10-implementation-plan.md` Phase 9 | T-089, T-092 | M | `backend/src/locations/events/`, `backend/src/locations/cost-detail/` | Available | |
| T-096 | Seed realistic backend demo/test data — Location (extends T-087's dataset server-side into the real `demo` tenant database: 7 branches, lazily-materialized Product-at-Location rows across a realistic subset of Products' seeded catalog once available, a real current-week Lost Sale Log dataset, one branch's Product-at-Location row given a real part-supersession history — not a second, inconsistent dataset) | `6-implementation-plan/1-implementation-plan.md` §3 demo-data requirement | T-088, T-087 | S | `backend/scripts/seed-location-demo-data.ts` | Available | |
| T-097 | Full Location module test suite (`11-testing.md` full BR traceability incl. the 6 negative SQL-injection-regression tests, the non-negative-QoH boundary/concurrency tests, the golden-output formula tests for BR-014/BR-017/BR-018) + OpenAPI docs tags for this module's endpoint set | `11-testing.md`; `6-development/9-ci-cd.md` | T-091, T-092, T-093, T-094, T-095 | M | `backend/test/locations*.e2e-spec.ts`, `backend/src/locations/**/*.spec.ts` | Available | |

> **Traceability completeness check (step 4a)**: every entity in `4-schema.md` §3/§4 (5 tables) maps
> to T-088 (migration) plus its owning service task (T-089 Product-at-Location core, T-091 Branch/
> Accounting Config, T-092 supersession fields, T-094 Pass-On Config). Every endpoint in `8-api.md`
> §2's API Summary (19 endpoints) maps to a task: branch CRUD + status + accounting-config (7) →
> T-091; Product-at-Location read + adjust-qoh (2) → T-089; supersede (1) → T-092; pass-on-field-config
> read/update (2) → T-094; lost-sale-log read/inline-edit/dismiss + record-lost-sale/flag-disqualified
> (5) → T-094; cost-detail (1) → T-095; the demand/reorder calculation fields have no dedicated
> endpoint of their own — they recompute inside T-089's Product-at-Location save path per BR-005, owned
> by T-093. Every rule in `3-business-rules.md` (BR-001 through BR-026) maps to a task per the Source
> Reference column above. Every screen/element in `9-ui.md` §2 (5 screens/fragments) maps to its
> EPIC-006 counterpart, which this epic's tasks wire onto 1:1, **except** the Cost Detail tooltip's
> own frontend build (its API is T-095, but its UI lives in Products' future EPIC-008, per the
> EPIC-006 scope-exclusion note) and the standalone Product-at-Location screen (never designed at all,
> by confirmed scope decision — `1-module.md` §3/§10). **One confirmed cross-module gap, not silently
> assumed**: `1-module.md` §11 and `10-implementation-plan.md` both flag that Phase 6's kit-propagation
> (T-092) cannot fully integration-test until Products' own Kit Component interface exists (Products
> has not been JIT'd yet) — T-092 builds and unit-tests Location's own side of the contract against a
> stub now, full integration is a confirmed follow-up once Products' Backend/API epic (EPIC-009) lands,
> tracked as a cross-epic dependency in `dependencies.md`, not silently deferred without a record.

---

# Revision History

| Date | Change |
|------|--------|
| 2026-08-17 | Initial creation — 12 tasks (EPIC-001) + 9 tasks (EPIC-003); every other epic TBD pending JIT module docs. |
| 2026-08-17 | Added 7 tasks (EPIC-002, T-022–T-028) after design pass (ADR-182–185). |
| 2026-08-18 | Added 36 tasks (EPIC-004 T-029–T-045, EPIC-005 T-046–T-064) — Users module's first real task list, derived from its approved `docs-kit/5-modules/users/` JIT documentation set. Traceability check flagged one genuine gap: Notification Scheduler/Word Template have schema+plan mentions but no API/UI doc coverage — routed to the developer, not silently resolved either way. |
| 2026-08-18 | T-046–T-054 Done (RBAC foundation: schema migration, EntityIdentifier, auth/login/2FA/lockout, permission read model, User/Role/Profile/Group CRUD, change password) — real e2e-tested, no regressions in the pre-existing suite. T-055 onward remain `Available`. See `tasks/T-046-through-T-054-todos.md`. |
| 2026-08-18 | T-029 (User List/Detail/Create/Edit, mock data) Done — see `tasks/T-029-todos.md`. |
| 2026-08-18 | T-055 Done (Time Clock backend: clock-in/out state machine w/ open-punch guard, admin override w/ clock-out-before-clock-in validation, auto-clock-out safety-net BullMQ sweep flagging stale open punches `unclosed_needs_resolution` per ADR-037) — TDD'd against real skeleton Postgres, 9 new e2e tests, full suite 6/26 green, typecheck+lint clean. See `tasks/T-055-todos.md`. |
| 2026-08-18 | T-056 Done (Payroll pipeline: shared elapsed-time calculator, per-hours-type buckets, weekly-overtime 1.5x/40hr per ADR-036, Personal-Day→hours-classification bridge closing the legacy "confirmed disconnected" gap, unclosed-punch row flagging per ADR-037) — TDD'd, 5 new e2e tests. Also fixed a real test-infra bug found running the full suite: parallel Jest workers hitting the same shared skeleton Postgres caused unique-constraint collisions and WASM-engine contention (`test:e2e` now runs `--runInBand`). Full suite 7/31 green, typecheck+lint clean. See `tasks/T-056-todos.md`. |
| 2026-08-18 | T-057 Done (Personal Days: submission bridges into real per-day `TimeClockRecord`s per `8-api.md`/FR-010, corrected T-056's earlier live-join approach before it could double-count; Holidays: catalog + per-user assignment). Found `Holiday`/`HolidayAssignment` was documented in `4-schema.md` §3 but never given column-level detail or migrated in T-046 — added as this task's own minimal design and migrated both databases, flagged as raid-log R-005 for developer confirmation rather than silently decided. TDD'd, 6 new e2e tests, full suite 9/37 green, typecheck+lint clean. See `tasks/T-057-todos.md`. |
| 2026-08-18 | T-058 Done (Login History: read-only `GET /login-history`, Admin-only, filterable by username/date range — rows already written by `AuthService` since T-048). TDD'd, 2 new e2e tests, full suite 10/39 green, typecheck+lint clean. |
| 2026-08-18 | T-059 Done (QuickBooks employee sync: real-time enqueue on User create/update wired into `UsersService`, async BullMQ worker resolves its own tenant client — no request context in a queue worker — upserts `quickbooks_sync_pointers`, `GET /quickbooks-sync/status` Admin-only). Known limitation flagged in code comment: no real QuickBooks API credentials/sandbox exist in this environment, external call is stubbed (same class of gap as T-049's 2FA email delivery) — the trigger/queue/pointer-update/status-read mechanism is all real. TDD'd, 3 new e2e tests, full suite 11/42 green, typecheck+lint clean. |
| 2026-08-18 | T-060 Done (Mail Account: self-service `GET/PUT /users/me/mail-account`, 1:1 upsert, wired to T-043's screen; Notification Scheduler + Word Template: minimal Admin CRUD, ADR-188 backend-only). No REST contract existed in `8-api.md` for any of the three — this task designed the shape itself, matching the project's existing self-service/simple-CRUD conventions. Found and flagged raid-log R-006: `UserNotificationPreference` has a real schema table and a T-043 frontend screen but no backend task anywhere in T-046–T-064 — out of this task's scope, not fixed, just flagged before it's forgotten. Also fixed a real test flake found under full-suite load: a QuickBooks-sync test polling for a live BullMQ worker was racy across 14 sequentially-instantiated test apps sharing one Redis — rewritten to assert the real enqueue (via `queue.getJobs()`) and the real processor logic (direct invocation against real DB) separately, no worker-timing dependency. TDD'd, 5 new e2e tests, full suite 14/48 green, typecheck+lint clean. |
| 2026-08-18 | T-061 Done (Barcode Label Print: `GET /barcode-labels/{userId}?size=` Admin-only, returns name/role/barcode-value/label-dimensions). Confirmed via the frontend preview that the barcode encodes the user's own `username` — no separate stored barcode column needed or exists, closing what looked like a possible schema gap before it became one. Cloud-print delivery (optional, `1-module.md` §11) not built — no credentials in this environment, same class of stub as T-049/T-059. No `8-api.md` contract existed for this screen either — this task designed the shape. TDD'd, 3 new e2e tests, full suite 15/51 green, typecheck+lint clean. |
| 2026-08-18 | T-062 Done — `backend/scripts/seed-users-demo-data.ts` (not `backend/prisma/seed.ts`, which doesn't exist as a directory in this project; flagged in-file, matches the existing `seed-tenant-registry.ts` convention instead). Seeds the real `demo` tenant database (`lbm_erp_dev`) extending the frontend mock fixture server-side — same 14 users/5 roles/names/statuses/locations, 2 profiles with full permission grants, groups, time-clock history including the one deliberately unclosed punch (ADR-037), and a Personal-Day submission bridged into real `TimeClockRecord`s via the same mechanism T-057 built. Idempotent (safe to re-run), verified by running it twice and a direct row-count check against the real database. |
| 2026-08-18 | Added 18 tasks (EPIC-010 T-065–T-072, EPIC-011 T-073–T-082) — UOM's first real task list, derived from its approved `docs-kit/5-modules/uom/` JIT documentation set (incl. the ADR-190/191/192 amendment rounds already folded into the source docs). Traceability check found **no gap**: every schema entity, `8-api.md` endpoint, `3-business-rules.md` BR-###, and `9-ui.md` screen maps to an owning task; the one confirmed-out-of-scope item (legacy's `lbm_applied_uom_pricing` write-back cache / "Manage UOM Qty Pricing" screen, superseded by Pricing's live-resolution design per ADR-029) was cross-checked against `sot-docs/archive/2-module-specs/UOM/` and correctly left unticketed. All 18 tasks start `Available`. |
| 2026-08-18 | T-063 Done — `backend/src/common/locks/` (`ConcurrencyLockService`, its own plain `ioredis` connection separate from BullMQ's, added `ioredis` as an explicit direct dependency). First implementation of the project-wide standing concurrent-edit lock (ADR-079/080/084): Redis `SET NX PX` to acquire, Lua-script compare-and-extend for heartbeat, Lua-script compare-and-delete for release — atomic, so only the actual holder can renew/release. Applied to `POST /timeclock/override`: new `override/:recordId/lock` (acquire, blocks a second user with "Currently being edited by {name}, locked for you" resolved fresh from the User table, never a stale cached name), `.../lock/heartbeat`, `DELETE .../lock`; the override save itself now requires holding the lock (409 otherwise) and releases it instantly on success, matching ADR-079's "releases the moment the editor leaves edit mode." Domain-agnostic by design — every future module reuses this exact class. TDD'd, 6 new e2e tests, updated 2 pre-existing override tests to acquire the lock first (real behavior change, not a regression). Full suite 16/57 green, typecheck+lint clean. |
| 2026-08-18 | **T-064 Done — EPIC-005 (Users Backend/API) fully complete, all 19 tasks (T-046–T-064) Done.** Traceability pass against `11-testing.md` §12 Security Tests found 4 named Critical/High tests with zero coverage anywhere in this session's work (grepped every prior spec file first) — added `users-security.e2e-spec.ts` closing the module's own highest-priority worked example (empty/malformed-id delete rejection, BR-001/USR-RISK-001), last-remaining-Admin delete protection, duplicate-username rejection, and an end-to-end SQL-injection-shaped-input test proving Prisma's parameterization holds through the real HTTP path. All 4 passed immediately (real existing guarantees, not new behavior) — a coverage gap closed, not a bug fix. OpenAPI docs: added `@nestjs/swagger` + its compiler plugin (auto-infers DTO schemas from existing `class-validator` decorators, no hand-duplicated `@ApiProperty`), wired `SwaggerModule` at `/api/docs`, tagged all 14 Users-module controllers. Verified live: booted the real server, confirmed all 40 documented endpoints and correct per-controller tag grouping via `/api/docs-json`. Full suite **17 suites / 61 tests, all passing**, typecheck+lint clean. |
| 2026-08-19 | Added 15 tasks (EPIC-006 T-083–T-087, EPIC-007 T-088–T-097) — Location's first real task list, derived from its approved `docs-kit/5-modules/location/` JIT documentation set (incl. the ADR-198 amendment round), module-scoped re-run of `6-implementation-plan/1-implementation-plan.md` steps 2-6/8. Traceability check found **no gap** in Location's own scope: every schema entity (5 tables), `8-api.md` endpoint (19), `3-business-rules.md` rule (BR-001–BR-026), and `9-ui.md` screen/fragment maps to an owning task. Two confirmed scope items, not silent omissions: the standalone Product-at-Location screen was never designed at all in `9-ui.md` (owned by Products' own future UI, `1-module.md` §3/§10), and the Cost Detail tooltip's frontend build is deferred to Products' own future UI-Design epic (EPIC-008) since it renders inside Products' page, even though its API (T-095) is built here. One confirmed cross-module dependency flagged, not silently deferred: T-092's kit-quantity propagation needs Products' own Kit Component interface (Products not yet JIT'd) — Location's side of the contract is built and unit-tested against a stub now, full integration tracked as a follow-up once Products' Backend/API epic (EPIC-009) lands. All 15 tasks start `Available`. |
