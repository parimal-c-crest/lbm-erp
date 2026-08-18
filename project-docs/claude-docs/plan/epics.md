# Epics

Every epic starts `status: Not Started`. `Design Status` (blank / `Pending Review` / `Approved`)
applies to every `<Module> — UI Design` / `<Module> — Backend/API` epic pair (Design-First is
mandatory under the default Milestone 2/3+ structure, not opt-in) — blank means design work hasn't
started, not that the strategy was declined. See `6-implementation-plan/1-implementation-plan.md`
"Status Tracking" for the full rollup rule.

Module epics' task lists are `TBD — awaiting just-in-time module documentation` until that module's
`docs-kit/5-modules/<slug>/` is generated (`7-sprint-planning/1-sprint-planning.md` step 2a) —
consistent with the default JIT flow. Non-module epics whose source docs are already approved
(Environment Setup, App Shell/Chrome) have real tasks now (`task-list.md`). Users
(`docs-kit/5-modules/users/`) is the first module whose 11-document set is fully generated and
approved (2026-08-18) — Design Status set to `Approved` for both its epics (EPIC-004/005), SoT
folded in (`sot-docs/index.md`, 2026-08-18), and its real task list now derived: 36 tasks (T-029
through T-064) across EPIC-004 (UI Design) and EPIC-005 (Backend/API) — see `task-list.md`. UOM
(`docs-kit/5-modules/uom/`) is the second module through this gate (2026-08-18, 11 documents incl.
the ADR-190/191/192 amendment rounds already folded in) — its real task list is now derived too: 18
tasks (T-065 through T-082) across EPIC-010 (UI Design) and EPIC-011 (Backend/API) — see
`task-list.md`. Design Status stays blank for both (task derivation alone doesn't start design
work). Every other module epic remains `TBD`.

---

## Non-module epics

| ID | Epic | Milestone | Doc Reference | Description | Status | Design Status |
|----|------|-----------|----------------|--------------|--------|----------------|
| EPIC-001 | Environment Setup | M1 | `1-project/4-tech-stack.md`, `6-development/1-development-environment.md`, `2-folder-structure.md`, `4-git-workflow.md`, `9-ci-cd.md` | Install/wire the full tech stack so the project runs locally end to end. | Complete | *(n/a — not design-first)* |
| EPIC-002 | Platform Administration (Skeleton Control Panel) | M1 | `1-project/3-feature-breakdown.md` FEAT-015; `decisions-log.md` ADR-056/057/059/182-185; `epic-002-platform-administration/1-design.md` | Tenant provisioning, migration fanout, Super Admin support accounts, cron/job management. Cross-tenant infra, not one of the 15 business modules. | Complete | Approved |
| EPIC-003 | App Shell / Chrome | M2 | `4-ui/1-navigation.md`, `4-ui/3-design-system.md`, `4-ui/4-component-standards.md` | Branding, sidebar/topbar navigation shell, responsive shell behavior, auth screens (login, session-expired), dashboard shell layout — owned here since M2 is the first milestone rendering a real (if mock-data) authenticated screen. | Complete | blank |
| EPIC-034 | Maintenance | *(none — persists across every milestone)* | — | Standing epic for small post-launch fixes routed here by `12-maintenance/1-triage.md` that don't warrant their own epic or milestone. | Not Started | *(n/a)* |

---

## Module epics — UI Design (Milestone 2)

Every row except EPIC-004/005 (Users) and EPIC-010/011 (UOM) below: task list
`TBD — awaiting just-in-time module documentation`.

| ID | Epic | Module Slug | Status | Design Status |
|----|------|-------------|--------|----------------|
| EPIC-004 | Users — UI Design | `users` | Complete | Approved |
| EPIC-006 | Location — UI Design | `location` | Not Started | blank |
| EPIC-008 | Products — UI Design | `products` | Not Started | blank |
| EPIC-010 | UOM — UI Design | `uom` | Complete | Approved |
| EPIC-012 | Vendors — UI Design | `vendors` | Not Started | blank |
| EPIC-014 | Pricing — UI Design | `pricing` | Not Started | blank |
| EPIC-016 | Accounts — UI Design | `accounts` | Not Started | blank |
| EPIC-018 | Sales Order — UI Design | `sales-order` | Not Started | blank |
| EPIC-020 | Search Line Item — UI Design | `search-line-item` | Not Started | blank |
| EPIC-022 | Purchase Order — UI Design | `purchase-order` | Not Started | blank |
| EPIC-024 | Purchase Line Item — UI Design | `purchase-line-item` | Not Started | blank |
| EPIC-026 | Sales History — UI Design | `sales-history` | Not Started | blank |
| EPIC-028 | Purchase History — UI Design | `purchase-history` | Not Started | blank |
| EPIC-030 | Account Statement — UI Design | `account-statement` | Not Started | blank |
| EPIC-032 | Settings — UI Design | `settings` | Not Started | blank |

\* EPIC-004: all 17 tasks Done. The Design-First Strategy's real developer live-browser
review/sign-off (`raid-log.md` R-004) ran this session — same review pass that produced ADR-193
(icon-only row actions) and ADR-194 (bordered-card form sections), both applied to Users' pages
too, not just UOM's. R-003/R-004 closed.

† EPIC-010: all 8 tasks (T-065–T-072, `task-list.md`) Done — every UOM screen built against the
shared `frontend/src/lib/mock-data/uom.ts` fixture, real inter-page navigation verified. Developer's
own live-browser review ran this session (multiple rounds — row-action icons/ADR-193, form-section
cards/ADR-194, column/tab renames, layout width fixes) and design is confirmed Approved
2026-08-18 — Complete per the Module Design-First Strategy's rollup rule.

---

## Module epics — Backend/API (Milestones 3-9)

Every row except EPIC-005 (Users) and EPIC-011 (UOM) below: task list
`TBD — awaiting just-in-time module documentation`.

| ID | Epic | Module Slug | Milestone | Status | Design Status |
|----|------|-------------|-----------|--------|----------------|
| EPIC-005 | Users — Backend/API | `users` | M3 | Complete | Approved* |
| EPIC-007 | Location — Backend/API | `location` | M3 | Not Started | blank |
| EPIC-009 | Products — Backend/API | `products` | M3 | Not Started | blank |
| EPIC-011 | UOM — Backend/API | `uom` | M3 | Complete | Approved |
| EPIC-013 | Vendors — Backend/API | `vendors` | M4 | Not Started | blank |
| EPIC-015 | Pricing — Backend/API | `pricing` | M4 | Not Started | blank |
| EPIC-017 | Accounts — Backend/API | `accounts` | M5 | Not Started | blank |
| EPIC-019 | Sales Order — Backend/API | `sales-order` | M6 | Not Started | blank |
| EPIC-021 | Search Line Item — Backend/API | `search-line-item` | M6 | Not Started | blank |
| EPIC-023 | Purchase Order — Backend/API | `purchase-order` | M7 | Not Started | blank |
| EPIC-025 | Purchase Line Item — Backend/API | `purchase-line-item` | M7 | Not Started | blank |
| EPIC-027 | Sales History — Backend/API | `sales-history` | M8 | Not Started | blank |
| EPIC-029 | Purchase History — Backend/API | `purchase-history` | M8 | Not Started | blank |
| EPIC-031 | Account Statement — Backend/API | `account-statement` | M8 | Not Started | blank |
| EPIC-033 | Settings — Backend/API | `settings` | M9 | Not Started | blank |

† EPIC-011: real 10-task breakdown derived (T-073–T-082, `task-list.md`) from UOM's approved JIT
documentation set (superseded by the ‡ note below — all 10 tasks are now `Done`).

‡ EPIC-011: all 10 tasks (T-073–T-082) `Done` — real backend built, 20/20 e2e tests passing against
real Postgres/Redis (`pnpm --filter backend run test:e2e -- uom.e2e-spec.ts`). Real browser
click-through (Playwright, real dev token + `X-Tenant-Subdomain: demo`) run this session across
Groups List, Group Detail, Categories, Types, Functional Roles, and Add Group — found and fixed one
real bug in the process: `GET /uom/groups`'s list summary never included nested `roleAssignments`
(by design, per `8-api.md`'s own "summary, not full detail" spec), but the Group List page read
`group.roleAssignments.length` for its "UOM Roles" column, crashing the whole page (React error
boundary, `TypeError: Cannot read properties of undefined`). Fixed by adding a real
`roleAssignmentCount` field to the list summary (`groups.service.ts`'s `list()`, via Prisma
`_count`) and updating the frontend to a proper `UOMGroupSummary` type instead of a mis-typed reuse
of the full `UOMGroup` detail shape (`frontend/src/types/uom.ts`, `lib/api/uom.ts`,
`settings/uom/groups/page.tsx`); `8-api.md`'s `GET /uom/groups` response description updated to
document the field. Re-verified clean after the fix — all 6 pages render real backend data
correctly, no console errors.

**Known, deliberately-deferred limitation** (not a bug): the demo seed's "transaction-locked" Group
("Bagged Concrete Mix") renders fully editable, not locked — `isGroupLocked()` currently always
returns `false` since no consumer module (SalesOrder/PurchaseOrder/etc.) exists yet to hold a real
`uom_group_id` reference to check against. The lock logic and its `GROUP_LOCKED` 409 response are
real and tested at the unit/e2e level; only the "is anything actually referencing this Group"
signal is a stub (`groups.service.ts` `isGroupLocked()`, TODO comment names exactly which future
modules need to register a check there). Correct given build order — UOM (M3) ships before any
transactional module (M6+) — not something to fix now.

---

# Revision History

| Date | Change |
|------|--------|
| 2026-08-17 | Initial creation — 34 epics (3 non-module + 30 module UI/Backend pairs + Maintenance). |
| 2026-08-18 | EPIC-004/005 (Users) Design Status set to `Approved` — full 11-document JIT set generated, reviewed against 14 pre-existing Users-specific ADRs, corrected, and promoted to `docs-kit/5-modules/users/`. |
| 2026-08-18 | EPIC-004/005 (Users) real task list derived — 36 tasks (T-029–T-064), scoped re-run of `6-implementation-plan/1-implementation-plan.md` steps 2-6/8. See `task-list.md`. |
| 2026-08-18 | EPIC-004 status set to `In Progress` — T-029 Done (Sprint 3's first task). |
| 2026-08-18 | EPIC-004 status set to `Complete*` — all 17 Sprint 3 tasks Done; starred because the Design-First live-review gate didn't run yet (R-004). |
| 2026-08-18 | EPIC-004 Design Status confirmed `Approved` for real — the developer's live-browser review actually ran this session (R-003/R-004 closed), producing ADR-193/194 which were applied to both Users and UOM. Star removed from both Status and Design Status. |
| 2026-08-18 | EPIC-005 status set to `In Progress` — Sprint 4 (T-046–T-054, the RBAC foundation) Done, started out of sequence while M2 isn't complete (R-004). T-055 onward not yet built. |
| 2026-08-18 | EPIC-005 status set to `Complete` — all 19 tasks (T-046–T-064) Done: Time Clock, Payroll, Personal Days/Holidays, Login History, QuickBooks sync, Mail Account/Notification Scheduler/Word Template, Barcode Labels, seed data, the project's first concurrent-edit lock utility, and OpenAPI docs. 17 e2e suites / 61 tests, all real (skeleton Postgres + Redis), no mocks. Two real doc/schema gaps found and resolved along the way, both flagged in `raid-log.md` (R-005 Holiday/HolidayAssignment, R-006 UserNotificationPreference backend never scoped). Still out of sequence vs M2 (R-004 unresolved — the Design-First live-review gate for EPIC-004's UI never ran). |
| 2026-08-18 | EPIC-010/011 (UOM) real task list derived — 18 tasks (T-065–T-082), module-scoped re-run of `6-implementation-plan/1-implementation-plan.md` steps 2-6/8, replacing the `TBD` placeholder. Status stays `Not Started` for both (no task started). See `task-list.md`. |
