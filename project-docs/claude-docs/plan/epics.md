# Epics

Every epic starts `status: Not Started`. `Design Status` (blank / `Pending Review` / `Approved`)
applies to every `<Module> — UI Design` / `<Module> — Backend/API` epic pair (Design-First is
mandatory under the default Milestone 2/3+ structure, not opt-in) — blank means design work hasn't
started, not that the strategy was declined. See `6-implementation-plan/1-implementation-plan.md`
"Status Tracking" for the full rollup rule.

Module epics' task lists are `TBD — awaiting just-in-time module documentation` until that module's
`docs-kit/5-modules/<slug>/` is generated (`7-sprint-planning/1-sprint-planning.md` step 2a) —
consistent with the default JIT flow. Non-module epics whose source docs are already approved
(Environment Setup, App Shell/Chrome) have real tasks now (`task-list.md`).

---

## Non-module epics

| ID | Epic | Milestone | Doc Reference | Description | Status | Design Status |
|----|------|-----------|----------------|--------------|--------|----------------|
| EPIC-001 | Environment Setup | M1 | `1-project/4-tech-stack.md`, `6-development/1-development-environment.md`, `2-folder-structure.md`, `4-git-workflow.md`, `9-ci-cd.md` | Install/wire the full tech stack so the project runs locally end to end. | In Progress | *(n/a — not design-first)* |
| EPIC-002 | Platform Administration (Skeleton Control Panel) | M1 | `1-project/3-feature-breakdown.md` FEAT-015; `decisions-log.md` ADR-056/057/059 | Tenant provisioning, migration fanout, Super Admin support accounts, cron/job management. Cross-tenant infra, not one of the 15 business modules. | Not Started | *(n/a)* |
| EPIC-003 | App Shell / Chrome | M2 | `4-ui/1-navigation.md`, `4-ui/3-design-system.md`, `4-ui/4-component-standards.md` | Branding, sidebar/topbar navigation shell, responsive shell behavior, auth screens (login, session-expired), dashboard shell layout — owned here since M2 is the first milestone rendering a real (if mock-data) authenticated screen. | Not Started | blank |
| EPIC-034 | Maintenance | *(none — persists across every milestone)* | — | Standing epic for small post-launch fixes routed here by `12-maintenance/1-triage.md` that don't warrant their own epic or milestone. | Not Started | *(n/a)* |

---

## Module epics — UI Design (Milestone 2)

Every row: task list `TBD — awaiting just-in-time module documentation`.

| ID | Epic | Module Slug | Status | Design Status |
|----|------|-------------|--------|----------------|
| EPIC-004 | Users — UI Design | `users` | Not Started | blank |
| EPIC-006 | Location — UI Design | `location` | Not Started | blank |
| EPIC-008 | Products — UI Design | `products` | Not Started | blank |
| EPIC-010 | UOM — UI Design | `uom` | Not Started | blank |
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

---

## Module epics — Backend/API (Milestones 3-9)

Every row: task list `TBD — awaiting just-in-time module documentation`.

| ID | Epic | Module Slug | Milestone | Status | Design Status |
|----|------|-------------|-----------|--------|----------------|
| EPIC-005 | Users — Backend/API | `users` | M3 | Not Started | blank |
| EPIC-007 | Location — Backend/API | `location` | M3 | Not Started | blank |
| EPIC-009 | Products — Backend/API | `products` | M3 | Not Started | blank |
| EPIC-011 | UOM — Backend/API | `uom` | M3 | Not Started | blank |
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

---

# Revision History

| Date | Change |
|------|--------|
| 2026-08-17 | Initial creation — 34 epics (3 non-module + 30 module UI/Backend pairs + Maintenance). |
