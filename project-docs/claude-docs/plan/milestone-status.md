# Milestone Status

Build order and status (`Not Started` / `In Progress` / `Complete` / `Released`). Only one milestone
is ever `In Progress` at a time — `7-sprint-planning/1-sprint-planning.md` enforces this.

| Order | Milestone | Status |
|-------|-----------|--------|
| 1 | M1 — Environment Setup | Released |
| 2 | M2 — UI, All Modules, Static/Mock Data | In Progress |
| 3 | M3 — Backend/API: Identity & Catalog Foundation (Users, Location, Products, UOM) | In Progress* |
| 4 | M4 — Backend/API: Vendors & Pricing | Not Started |
| 5 | M5 — Backend/API: Accounts | Not Started |
| 6 | M6 — Backend/API: Sales Order & Search Line Item | Not Started |
| 7 | M7 — Backend/API: Purchase Order & Purchase Line Item | Not Started |
| 8 | M8 — Backend/API: History Accumulators & Statements | Not Started |
| 9 | M9 — Backend/API: Settings | Not Started |

---

# Revision History

| Date | Change |
|------|--------|
| 2026-08-17 | Initial creation — all 9 milestones `Not Started`. |
| 2026-08-17 | M1 set to `In Progress` — Sprint 1 planned against it (`sprints/sprint-1.md`). |
| 2026-08-18 | M1 set to `Complete` — both its epics (EPIC-001, EPIC-002) Done. M2 set to `In Progress` — its first epic (EPIC-003, App Shell/Chrome) Complete. |
| 2026-08-18 | M1 set to `Released` (v1.0.0) — local-only release (RAID R-002), no real hosting exists yet. UAT sign-off: `tasks/uat-signoff-M1.md`. Unblocks `8-implementation/1-implement-task.md` to continue M2. |
| 2026-08-18 | M3 set to `In Progress*` out of sequence — EPIC-005 (Users Backend/API) work started (Sprint 4) while M2 is still In Progress (14 of 15 module UI-Design epics remain `Not Started`), on the developer's explicit instruction to continue into backend work overnight. Starred the same way Sprint 2 flagged T-013's own out-of-sequence build — documented, not hidden. See `raid-log.md` R-004. |
| 2026-08-18 | EPIC-005 (Users Backend/API) reached Complete — all 19 tasks (T-046–T-064) Done. M3 stays `In Progress*` — its other 2 foundation modules (Location, Products, UOM) haven't started. See `epics.md`, `task-list.md`. |
| 2026-08-18 | UOM ran its full JIT gate this session and reached Complete on both epics — EPIC-010 (UI Design, T-065–T-072) and EPIC-011 (Backend/API, T-073–T-082), 20/20 e2e tests passing, real browser-verified. M3 stays `In Progress*` — Location and Products (its remaining 2 foundation modules) still haven't started. Users' own EPIC-004 Design Status also reached `Approved` for real this session (R-003/R-004 closed) — was previously Done-but-unreviewed. |
