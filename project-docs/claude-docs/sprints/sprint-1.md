# Sprint 1

**Milestone**: M1 — Environment Setup
**Epic**: EPIC-001 — Environment Setup
**Status**: In Progress
**Assigned To**: *(solo developer + AI-assisted development — no per-task assignment needed)*

---

## Sprint Goal

Stand up a fully working local development environment — pnpm workspace, NestJS backend, Next.js
frontend, PostgreSQL/Prisma, ESLint/Prettier/TypeScript strict mode, GitHub Actions CI, and an
authentication scaffold — so real feature work (Sprint 2 onward, M2 UI build) can begin on solid,
verified ground.

---

## Definition of Ready — confirmed for every task below

- (a) Clear description + acceptance criteria, traceable to a specific `docs-kit/` section — see
  Source Reference column.
- (b) No open `[NEEDS INPUT]` marker in any referenced doc — all of `6-development/1-4,9`,
  `3-api/2-3`, `4-ui/3,8` are Approved with 0 open `NEEDS INPUT` per `review-log.md`.
- (c) Every dependency is scheduled earlier in this same sprint (see order below).
- (d) File/folder footprint at least roughly known — see `task-list.md`.
- (e) Not a `<Module> — Backend/API` task under Module Design-First — n/a, EPIC-001 isn't
  design-first.

RAID log and tech debt register reviewed (step 6a) — both empty, nothing to pull in.

---

## Tasks (ordered by dependency)

| Order | ID | Task | Estimate | Status | Assigned To |
|-------|-----|------|----------|--------|-------------|
| 1 | T-001 | Initialize Git repository, connect GitHub remote, base `.gitignore`/README | S | Done | |
| 2 | T-002 | Set up pnpm workspace (`pnpm-workspace.yaml`, root `package.json`) | S | Done | |
| 3 | T-003 | Scaffold NestJS backend app | M | Done | |
| 4 | T-004 | Scaffold Next.js frontend app | M | Done | |
| 5 | T-005 | Initialize Prisma schema + local dev PostgreSQL database | M | Done | |
| 6 | T-006 | Configure environment variable templates (`.env.example`) | S | Available | |
| 7 | T-007 | Configure ESLint + Prettier + TypeScript strict mode (both apps) | M | Available | |
| 8 | T-008 | Wire Tailwind CSS + shadcn/ui + design tokens into frontend | M | Available | |
| 9 | T-009 | Set up GitHub Actions CI pipeline (lint/typecheck/test/build gates) | M | Available | |
| 10 | T-010 | Configure `main` branch protection rules | S | Available | |
| 11 | T-011 | Scaffold authentication (JWT strategy, Guards skeleton) | M | Available | |
| 12 | T-012 | Verify full local dev loop (backend + frontend + Postgres + Redis running together) | S | Available | |

Full task detail (source references, exact file/folder footprint, per-task dependency): `task-list.md`.

Not in this sprint: **EPIC-002 (Platform Administration)** — no detailed doc exists yet
(`1-project/3-feature-breakdown.md` §10's own note: generates its own documentation outside the
per-module JIT cycle "when scheduled"). Not blocking M1's build order; flagged in `raid-log.md`
below for future scoping, not silently dropped.

---

# Revision History

| Date | Change |
|------|--------|
| 2026-08-17 | Sprint created — all 12 EPIC-001 tasks selected, one sprint (developer-confirmed over a 2-sprint split, given the tasks form one cohesive dependency chain with no natural sprint boundary). |
