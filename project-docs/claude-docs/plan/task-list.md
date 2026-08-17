# Task List

Real tasks exist only for epics whose source docs are already approved: **EPIC-001** (Environment
Setup) and **EPIC-003** (App Shell/Chrome). Every module epic (UI Design + Backend/API, all 15
modules) and **EPIC-002** (Platform Administration — FEAT-015 has no detailed doc yet, per
`1-project/3-feature-breakdown.md` §10's own note that it "generates its own documentation outside
the per-module `5-modules/` JIT cycle when scheduled") carry:

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
| T-003 | Scaffold NestJS backend app | `6-development/2-folder-structure.md` §5, `1-development-environment.md` §7 | T-002 | M | `backend/` | Available | |
| T-004 | Scaffold Next.js frontend app | `6-development/2-folder-structure.md` §6, `4-ui/8-frontend-development-standards.md` §4 | T-002 | M | `frontend/` | Available | |
| T-005 | Initialize Prisma schema + local dev PostgreSQL database | `6-development/1-development-environment.md` §11, `2-database/1-database-design.md` | T-003 | M | `prisma/schema.prisma`, `backend/src/prisma/` | Available | |
| T-006 | Configure environment variable templates (`.env.example`) | `6-development/1-development-environment.md` §9 | T-003, T-004 | S | `backend/.env.example`, `frontend/.env.local.example` | Available | |
| T-007 | Configure ESLint + Prettier + TypeScript strict mode (both apps) | `6-development/3-coding-standards.md` §6/§18, `1-development-environment.md` §14 (ADR-019) | T-002 | M | root `.eslintrc`/`eslint.config.js`, `.prettierrc`, `tsconfig.json` (root + per-app) | Available | |
| T-008 | Wire Tailwind CSS + shadcn/ui + design tokens into frontend | `4-ui/3-design-system.md` §4, `4-ui/8-frontend-development-standards.md` §11 (ADR-025) | T-004 | M | `frontend/tailwind.config.ts`, `frontend/src/styles/` | Available | |
| T-009 | Set up GitHub Actions CI pipeline (lint/typecheck/test/build gates) | `6-development/9-ci-cd.md` §5/§6/§9/§11 (ADR-181) | T-001, T-007 | M | `.github/workflows/ci.yml` | Available | |
| T-010 | Configure `main` branch protection rules | `6-development/4-git-workflow.md` §13 | T-001 | S | GitHub repo settings (no code footprint) | Available | |
| T-011 | Scaffold authentication (JWT strategy, Guards skeleton) | `3-api/2-authentication.md`, `3-api/3-authorization.md` | T-003, T-005 | M | `backend/src/auth/`, `backend/src/common/guards/` | Available | |
| T-012 | Verify full local dev loop (backend + frontend + Postgres + Redis running together) | `6-development/1-development-environment.md` §12/§21 | T-005, T-006, T-008, T-011 | S | *(verification task, no new footprint)* | Available | |

---

## EPIC-003 — App Shell / Chrome (Milestone 2)

Cross-epic dependency: every task below also depends on **EPIC-001 being Done** (needs the
scaffolded frontend app + design tokens wired, T-004/T-008) — not restated per row below.

| ID | Task | Source Reference | Dependencies | Estimate | File/Folder Footprint | Status | Assigned To |
|----|------|-------------------|---------------|----------|--------------------------|--------|-------------|
| T-013 | Build responsive sidebar navigation shell (desktop/tablet/mobile) | `4-ui/1-navigation.md` §3/§12, `4-ui/6-responsive-design.md` §6/§12 | EPIC-001 Done | L | `frontend/src/components/shared/Sidebar*`, `frontend/src/app/(dashboard)/layout.tsx` | Available | |
| T-014 | Build top bar (search, branch switcher, notifications, quick actions, user menu) | `4-ui/1-navigation.md` §4, `4-ui/2-user-flows.md` §7 walkthrough | T-013 | M | `frontend/src/components/shared/TopBar*` | Available | |
| T-015 | Build breadcrumb component | `4-ui/1-navigation.md` §8 | T-013 | S | `frontend/src/components/shared/Breadcrumb.tsx` | Available | |
| T-016 | Build login screen (mock auth flow for this milestone) | `4-ui/2-user-flows.md` §6, `4-ui/5-form-standards.md` | EPIC-001 Done | M | `frontend/src/app/(auth)/login/page.tsx` | Available | |
| T-017 | Build session-expired / 403 / 404 error screens | `4-ui/2-user-flows.md` §5/§11, `4-ui/1-navigation.md` §15 | T-013 | S | `frontend/src/app/error.tsx`, `not-found.tsx`, session-expired page | Available | |
| T-018 | Build Quick Actions slide-in panel + FAB trigger | `4-ui/4-component-standards.md` §4 Overlay Components, `4-ui/2-user-flows.md` §7 walkthrough | T-014 | M | `frontend/src/components/shared/QuickActionsPanel.tsx` | Available | |
| T-019 | Wire mock role-based menu visibility (role→menu matrix) | `4-ui/1-navigation.md` §10 | T-013, T-014 | S | `frontend/src/config/role-menu-map.ts` | Available | |
| T-020 | Build Dashboard shell layout (KPI row / analytics row / operations row grid, mock data) | `4-ui/2-user-flows.md` §7 full walkthrough, `4-ui/3-design-system.md` §6 | T-013, T-014, T-015, T-021 | L | `frontend/src/app/(dashboard)/dashboard/page.tsx` | Available | |
| T-021 | Seed realistic mock/demo dataset for Dashboard + shell (domain-realistic values, not placeholder strings) | `6-implementation-plan/1-implementation-plan.md` §3 demo-data realism requirement; `1-project/1-project-overview.md` domain | EPIC-001 Done | M | `frontend/src/lib/mock-data/` | Available | |

---

# Revision History

| Date | Change |
|------|--------|
| 2026-08-17 | Initial creation — 12 tasks (EPIC-001) + 9 tasks (EPIC-003); every other epic TBD pending JIT module docs. |
