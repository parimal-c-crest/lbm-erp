# Lifecycle Dashboard

Single-page rollup of milestone/epic/sprint status, open risks, and outstanding tech debt. Refreshed
by `7-sprint-planning/`, `8-implementation/`, and `10-release/1-release.md` whenever they change a
status this dashboard summarizes. For a visual, browser-viewable version, run
`11-dashboard/1-generate-dashboard.md`.

---

## Milestones

| Order | Milestone | Status |
|-------|-----------|--------|
| 1 | M1 — Environment Setup | Released (v1.0.0, 2026-08-18) |
| 2 | M2 — UI, All Modules, Static/Mock Data | In Progress |
| 3 | M3 — Backend/API: Identity & Catalog Foundation | Not Started |
| 4 | M4 — Backend/API: Vendors & Pricing | Not Started |
| 5 | M5 — Backend/API: Accounts | Not Started |
| 6 | M6 — Backend/API: Sales Order & Search Line Item | Not Started |
| 7 | M7 — Backend/API: Purchase Order & Purchase Line Item | Not Started |
| 8 | M8 — Backend/API: History Accumulators & Statements | Not Started |
| 9 | M9 — Backend/API: Settings | Not Started |

**Active milestone**: M2 — UI, All Modules, Static/Mock Data.

## Epics

34 total (3 non-module + 30 module UI/Backend pairs + 1 standing Maintenance epic). Full detail:
`epics.md`.

- **Complete**: EPIC-001 (Environment Setup), EPIC-002 (Platform Administration), EPIC-003
  (App Shell/Chrome).
- **Not Started**: the remaining 31 (30 module UI/Backend pairs + EPIC-034 Maintenance) — but
  EPIC-004/005 (Users) now have Design Status `Approved`: the module's full 11-document JIT set is
  generated, reviewed, and promoted to `docs-kit/5-modules/users/` (2026-08-18). Task derivation
  (`5-update-sot/`, then a scoped `6-implementation-plan/` re-run) not yet run — that's the next
  concrete step.

## Sprints

- **Sprint 1** (`sprints/sprint-1.md`) — Complete. EPIC-001, 12 tasks, all Done.
- **Sprint 2** (`sprints/sprint-2.md`) — Complete. EPIC-002, 7 tasks, all Done.
- EPIC-003's 9 tasks (T-013–T-021) were completed without a dedicated sprint file — tracked
  directly in `task-list.md`.

## Tasks

28 real tasks defined (12 EPIC-001 T-001–T-012, 9 EPIC-003 T-013–T-021, 7 EPIC-002 T-022–T-028) —
**all 28 Done**. Every module epic's tasks remain `TBD` pending JIT module documentation. Full
detail: `task-list.md`.

## Open Risks / Issues / Dependencies

1 open: R-002 — M1 released without a real deploy/production-verification pass (no hosting
provisioned yet). R-001 resolved (EPIC-002's doc-generation path was defined and fully executed).
Full detail: `raid-log.md`.

## Outstanding Tech Debt

1 open: TD-001 — `/api/v1` API prefix documented in frontend env template but not implemented in
`backend/src/main.ts`. Full detail: `tech-debt-register.md`.

---

# Revision History

| Date | Change |
|------|--------|
| 2026-08-17 | Initial creation, alongside `milestones.md`, `epics.md`, `task-list.md`, `dependencies.md`, `milestone-status.md`, `raid-log.md`, `tech-debt-register.md`. |
| 2026-08-18 | Refreshed for M1 release (v1.0.0) — EPIC-001/002/003 Complete, M1 Released, M2 In Progress, R-001 resolved, R-002 + TD-001 opened. |
| 2026-08-18 | Users module (EPIC-004/005) Design Status set to `Approved` — first module through the full JIT documentation cycle. ADR-186/187 added; `3-api/2-authentication.md` amended (v1.1) to match ADR-187. |
