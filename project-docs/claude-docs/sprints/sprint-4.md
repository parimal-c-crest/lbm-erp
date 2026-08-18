# Sprint 4

**Milestone**: M3 — Backend/API: Identity & Catalog Foundation
**Epic**: EPIC-005 — Users — Backend/API
**Status**: In Progress
**Assigned To**: *(solo developer + AI-assisted development — no per-task assignment needed)*

---

## Sprint Goal

Build the Users module's RBAC foundation (schema, auth/login/2FA/lockout, permission read model,
User/Role/Profile/Group CRUD, change password) — the highest-priority slice per the module's own
documentation ("~126 other modules depend on it for permission checks").

---

## Process note — created retroactively, out of sequence

This sprint was **not** planned through the normal `7-sprint-planning/1-sprint-planning.md` flow.
M2 (UI, All Modules) is still `In Progress` — 14 of 15 module UI-Design epics remain `Not Started`
— and the normal milestone sequence doesn't start M3 until M2 completes. Work started here anyway
because the developer went offline mid-session (after Sprint 3/EPIC-004 completed) and explicitly
directed continuing autonomously into EPIC-005 without waiting for either the milestone gate or the
Design-First Strategy's live-browser page-review/approval loop (`8-implementation/1-implement-task.md`
steps 3-5) to run first. Documented here rather than hidden, same convention Sprint 2 used for
T-013's own out-of-sequence build. See `raid-log.md` R-004 and `milestone-status.md`'s own note on
M3.

## Definition of Ready — partially waived, not silently skipped

- (a)-(d): met — every task traces to `docs-kit/5-modules/users/`, footprints known.
- (e) **Design Status Approved for the paired UI Design epic** — technically `Approved` in
  `epics.md`, but that label is itself flagged as not the real gate (R-003/R-004). Proceeded
  anyway on the developer's explicit instruction; not silently assumed satisfied.

RAID log reviewed — R-002 (no real hosting) doesn't block local backend work; R-003/R-004 both
apply to this sprint directly and are cited above rather than re-litigated here.

---

## Tasks (ordered by dependency)

| Order | ID | Task | Estimate | Status | Assigned To |
|-------|-----|------|----------|--------|-------------|
| 1 | T-046 | Users schema migration (all entities) | M | Done* | |
| 2 | T-047 | Shared `EntityIdentifier` value object | S | Done | |
| 3 | T-048 | Authentication backend (login, lockout, Inactive gate) | M | Done* | |
| 4 | T-049 | Per-role 2FA backend | M | Done* | |
| 5 | T-050 | Permission read model | L | Done | |
| 6 | T-051 | User CRUD backend | L | Done* | |
| 7 | T-052 | Role + Profile CRUD backend | L | Done | |
| 8 | T-053 | Group CRUD backend | S | Done | |
| 9 | T-054 | Change Password backend | S | Done | |

`*` = completed with a documented limitation — see `task-list.md`'s own footnote block and
`tasks/T-046-through-T-054-todos.md` for the full detail on each.

**Not in this sprint** (remain `Available` in `task-list.md`, not started): T-055 (Time Clock),
T-056 (Payroll), T-057 (Personal Days/Holidays), T-058 (Login History detail), T-059 (QuickBooks),
T-060 (Mail/Notification/WordTemplate), T-061 (Barcode), T-062 (backend seed data), T-063
(concurrency lock), T-064 (full test suite).

Full task detail (source references, exact file/folder footprint, per-task dependency): `task-list.md`.

---

## Verification

- `pnpm --filter backend typecheck` / `lint` — clean.
- `backend/test/users-auth.e2e-spec.ts` (new, 10 tests across 2 describe blocks) — real HTTP
  requests against the real skeleton Postgres database: login success, wrong-password rejection,
  5-attempt lockout (DB-verified), Inactive-user rejection, unauthenticated-request rejection,
  RBAC role-mismatch rejection, plus 4 tests added when a background security review caught two
  real 2FA vulnerabilities (weak `Math.random()` code generation, missing session binding on
  `/auth/2fa/verify`) — both fixed same session, see `tasks/T-046-through-T-054-todos.md` §T-049.
- Full backend e2e suite re-run: **4 suites / 17 tests, all passing** — including the pre-existing
  `tenant-provisioning` and `job-scheduling` suites, confirming no regression.

---

# Revision History

| Date | Change |
|------|--------|
| 2026-08-18 | Sprint created retroactively — T-046–T-054 (9 tasks) selected and completed in dependency order, out of the normal milestone sequence per the developer's explicit instruction. |
