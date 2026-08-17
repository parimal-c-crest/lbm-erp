# Lifecycle Dashboard

Single-page rollup of milestone/epic/sprint status, open risks, and outstanding tech debt. Refreshed
by `7-sprint-planning/`, `8-implementation/`, and `10-release/1-release.md` whenever they change a
status this dashboard summarizes. For a visual, browser-viewable version, run
`11-dashboard/1-generate-dashboard.md`.

---

## Milestones

| Order | Milestone | Status |
|-------|-----------|--------|
| 1 | M1 — Environment Setup | In Progress |
| 2 | M2 — UI, All Modules, Static/Mock Data | Not Started |
| 3 | M3 — Backend/API: Identity & Catalog Foundation | Not Started |
| 4 | M4 — Backend/API: Vendors & Pricing | Not Started |
| 5 | M5 — Backend/API: Accounts | Not Started |
| 6 | M6 — Backend/API: Sales Order & Search Line Item | Not Started |
| 7 | M7 — Backend/API: Purchase Order & Purchase Line Item | Not Started |
| 8 | M8 — Backend/API: History Accumulators & Statements | Not Started |
| 9 | M9 — Backend/API: Settings | Not Started |

**Active milestone**: M1 — Environment Setup.

## Epics

34 total (3 non-module + 30 module UI/Backend pairs + 1 standing Maintenance epic) — all
`Not Started`. Full detail: `epics.md`.

## Sprints

**Sprint 1** (`sprints/sprint-1.md`) — Not Started. EPIC-001 (Environment Setup), 12 tasks.

## Tasks

21 real tasks defined (12 in EPIC-001, 9 in EPIC-003) — the 12 in EPIC-001 are `Available` and in
Sprint 1. Every other epic's tasks are `TBD` pending JIT module documentation. Full detail:
`task-list.md`.

## Open Risks / Issues / Dependencies

1 open: R-001 — EPIC-002 (Platform Administration) has no documentation-generation path defined yet.
Not currently blocking. Full detail: `raid-log.md`.

## Outstanding Tech Debt

None logged yet. Full detail: `tech-debt-register.md`.

---

# Revision History

| Date | Change |
|------|--------|
| 2026-08-17 | Initial creation, alongside `milestones.md`, `epics.md`, `task-list.md`, `dependencies.md`, `milestone-status.md`, `raid-log.md`, `tech-debt-register.md`. |
