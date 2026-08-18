# Task List

Real tasks exist for: **EPIC-001** (Environment Setup), **EPIC-003** (App Shell/Chrome), **EPIC-002**
(Platform Administration, own design doc), and now **EPIC-004/EPIC-005** (Users — the first module
whose `docs-kit/5-modules/users/` JIT set is approved). Every other module epic (UI Design +
Backend/API, 14 remaining modules) carries:

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
| T-055 | Time Clock backend — clock-in/out state machine, `labor_status` task annotation (ADR-077), auto-clock-out safety-net job, admin override endpoint — wire to T-036, T-037 | `8-api.md` `/timeclock/*`; `3-business-rules.md` §6 state machine | T-046, T-036, T-037 | L | `backend/src/users/timeclock/` | Available | |
| T-056 | Payroll pipeline — hours/overtime calculator (flat US 1.5x/40hr, ADR-036), unclosed-punch flagging (ADR-037), Personal-Day→hours-classification bridge — wire to T-039 | `8-api.md` `/payroll/report`; FR-009 | T-055, T-039 | M | `backend/src/users/payroll/` | Available | |
| T-057 | Personal Days & Holidays backend (submit + admin holiday catalog/assignment, real FK closes USR-RISK-004) — wire to T-038 | `8-api.md` `/personal-days`, `/holidays`; FR-010 | T-046, T-038 | M | `backend/src/users/personal-days/`, `backend/src/users/holidays/` | Available | |
| T-058 | Login History audit backend (append-only, read-only) — wire to admin view | `8-api.md` `/login-history`; FR-011 | T-048 | S | `backend/src/users/login-history/` | Available | |
| T-059 | QuickBooks employee sync backend — revived, async via BullMQ (ADR-074) — wire to T-040 | `8-api.md` `/quickbooks-sync/status`; FR-013 | T-046, T-040 | M | `backend/src/users/quickbooks/` | Available | |
| T-060 | Mail Account / Notification Scheduler / Word Template backend (minimal CRUD per `4-schema.md` — see traceability note below) — wire Mail Account to T-043 | `4-schema.md` MailAccount/NotificationScheduler/WordTemplate entities; `10-implementation-plan.md` Phase 9 | T-046, T-043 | M | `backend/src/users/mail-accounts/`, `notification-schedulers/`, `word-templates/` | Available | |
| T-061 | Barcode label output generation (label-layout parameters) — wire to T-044 | `2-functional-specification.md` §6 Outputs; `9-ui.md` §2 Barcode Label print | T-046, T-044 | S | `backend/src/users/barcode-labels/` | Available | |
| T-062 | Seed realistic backend demo/test data — Users (roles, profiles, sample users per role, time-clock history incl. an unclosed punch, payroll periods; extends T-045's dataset server-side, not a second inconsistent one) | `6-implementation-plan/1-implementation-plan.md` §3 demo-data requirement | T-046, T-045 | S | `backend/prisma/seed.ts` | Available | |
| T-063 | Concurrent time-card-override lock (ADR-079/080/084 standing Redis-TTL, heartbeat-renewed lock) applied to the timeclock override endpoint — first implementation of this project-wide shared lock utility | `2-functional-specification.md` §11 Concurrent updates | T-055 | M | `backend/src/common/locks/`, `backend/src/users/timeclock/` | Available | |
| T-064 | Full Users module test suite (`11-testing.md` full traceability) + OpenAPI docs for this module's endpoint set | `11-testing.md`; `6-development/9-ci-cd.md` | T-047–T-063 | M | `backend/test/users*.e2e-spec.ts`, `backend/src/users/**/*.spec.ts` | Available | |

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

# Revision History

| Date | Change |
|------|--------|
| 2026-08-17 | Initial creation — 12 tasks (EPIC-001) + 9 tasks (EPIC-003); every other epic TBD pending JIT module docs. |
| 2026-08-17 | Added 7 tasks (EPIC-002, T-022–T-028) after design pass (ADR-182–185). |
| 2026-08-18 | Added 36 tasks (EPIC-004 T-029–T-045, EPIC-005 T-046–T-064) — Users module's first real task list, derived from its approved `docs-kit/5-modules/users/` JIT documentation set. Traceability check flagged one genuine gap: Notification Scheduler/Word Template have schema+plan mentions but no API/UI doc coverage — routed to the developer, not silently resolved either way. |
| 2026-08-18 | T-046–T-054 Done (RBAC foundation: schema migration, EntityIdentifier, auth/login/2FA/lockout, permission read model, User/Role/Profile/Group CRUD, change password) — real e2e-tested, no regressions in the pre-existing suite. T-055 onward remain `Available`. See `tasks/T-046-through-T-054-todos.md`. |
| 2026-08-18 | T-029 (User List/Detail/Create/Edit, mock data) Done — see `tasks/T-029-todos.md`. |
