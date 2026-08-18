# Sprint 3

**Milestone**: M2 — UI, All Modules, Static/Mock Data
**Epic**: EPIC-004 — Users — UI Design
**Status**: Complete
**Assigned To**: *(solo developer + AI-assisted development — no per-task assignment needed)*

---

## Sprint Goal

Build every Users-module screen (List/Detail/Create/Edit, Role/Profile/Group administration, Time
Clock, Payroll, Personal Days, QuickBooks status, CSV Import, Mass Update, Mail Account, Barcode
Label) against static/mock data, per `docs-kit/5-modules/users/9-ui.md` — Users is the first module
to go through Milestone 2, and per the Module Design-First Strategy this hands off immediately to
`8-implementation/1-implement-task.md` rather than waiting for a later sprint.

---

## Definition of Ready — confirmed for every task below

- (a) Clear description + acceptance criteria, traceable to `9-ui.md`/`4-ui/` sections — see
  `task-list.md`'s Source Reference column per task.
- (b) No open `[NEEDS INPUT]` marker — `9-ui.md` is v1.2, no open assumptions remain (its own
  Revision History confirms this).
- (c) Every dependency (EPIC-003 shell primitives: Sidebar/TopBar/Breadcrumb/Sheet/Badge, T-013–021,
  all Done) already complete; in-sprint task-to-task dependencies scheduled earlier below.
- (d) File/folder footprint known — see `task-list.md`.
- (e) Design-Status-Approved gate (Module Design-First Strategy) applies to **Backend/API** tasks,
  not this epic's own UI-Design tasks — n/a here. **Flagged, not silently trusted**: `epics.md`
  already shows EPIC-004/005's Design Status as `Approved`, set when the JIT *documentation* set was
  reviewed (2026-08-18) — that is a different gate from the Design-First Strategy's real one (a
  developer's live-browser review of the *built* mock pages this sprint produces). See `raid-log.md`
  R-003: EPIC-005's Backend/API tasks must not be treated as unblocked by that pre-existing label —
  the real browser-review approval happens after this sprint's pages exist, not before.

RAID log and tech debt register reviewed — TD-001 (`/api/v1` prefix) not pulled into this sprint
(UI-only, no backend call sites touched yet). R-002 (no real hosting) doesn't block mock-data UI work.

---

## Tasks (ordered by dependency)

| Order | ID | Task | Estimate | Status | Assigned To |
|-------|-----|------|----------|--------|-------------|
| 1 | T-029 | User List + Detail + Create/Edit screens (mock data) | L | Done | |
| 2 | T-030 | Shared `TransferTargetPicker` delete-confirmation component; wire to User delete | M | Done | |
| 3 | T-031 | Role administration screen (hierarchy tree, drag-drop reparent, 2FA toggle) | L | Done | |
| 4 | T-032 | Profile administration (`RoleProfileGrid` + mobile `Sheet` drill-in) | L | Done | |
| 5 | T-033 | Group administration (List/Create/Edit, member picker) | M | Done | |
| 6 | T-034 | Change Password modal (self-service + admin-reset) | S | Done | |
| 7 | T-035 | 2FA verification-code entry + barcode-login fallback | M | Done | |
| 8 | T-036 | Time Clock widget (clock-in/out, elapsed time, task annotation) | M | Done | |
| 9 | T-037 | Time-Card override screen | M | Done | |
| 10 | T-038 | Personal Day/Time Off submission + admin Personal-Days listing | M | Done | |
| 11 | T-039 | Payroll Report screen (unclosed-punch badge, no export) | M | Done | |
| 12 | T-040 | QuickBooks sync status screen | S | Done | |
| 13 | T-041 | CSV Import wizard | M | Done | |
| 14 | T-042 | Mass Update screen | S | Done | |
| 15 | T-043 | Self-service Mail Account + notification-preference screen | S | Done | |
| 16 | T-044 | Barcode Label print screen | S | Done | |
| 17 | T-045 | Seed realistic mock/demo dataset — Users | M | Done | |

Full task detail (source references, exact file/folder footprint, per-task dependency): `task-list.md`.

**Process note (step 2a hand-off)**: this is EPIC-004's first sprint — per
`7-sprint-planning/1-sprint-planning.md` step 2a, it hands off immediately to
`8-implementation/1-implement-task.md` rather than sitting in the normal queue. Once the developer
reviews the built pages live in a browser and Design Status genuinely reaches `Approved` (the real
Design-First gate, not the pre-existing documentation-approval label — see R-003), return to sprint
planning to schedule EPIC-005 (Users — Backend/API) into a following sprint.

---

# Revision History

| Date | Change |
|------|--------|
| 2026-08-18 | Sprint created — all 17 EPIC-004 (Users — UI Design) tasks selected, dependency-ordered, hand-off to `8-implementation/1-implement-task.md` per Module Design-First Strategy. |
| 2026-08-18 | T-029 Done (first task of sprint) — sprint status set to `In Progress`. |
| 2026-08-18 | All 17 tasks (T-029–T-045) Done — sprint status set to `Complete`. Developer went offline mid-session and explicitly directed continuing autonomously through EPIC-005 (Backend/API) as well, without pausing for the Design-First Strategy's live-browser review/approval step (`8-implementation/1-implement-task.md` steps 3-5) — that real review is still outstanding and should happen when the developer is back; see `raid-log.md` R-003/R-004. Every page was still verified working via automated Playwright checks (navigation, forms, no console errors) and a manual visual screenshot review each task, and 3 real bugs were found and fixed along the way (T-030 delete-flow N/A, T-035 DOM-reuse field bleed, T-037 hydration + unhandled-exception, T-038 backwards date range) — see each task's own `-todos.md`. |
