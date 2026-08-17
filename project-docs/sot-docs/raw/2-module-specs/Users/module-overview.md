# Users — Module Overview

> Copy this whole `2-module-spec-template/` folder per module, rename, fill in. Stay tech-agnostic
> throughout — no framework/database/language references anywhere in Stage 2.

## Purpose

Users is the security/identity backbone of the ERP: authentication and session handling, RBAC
(Role/Profile/permission management), a nine-variant org-wide and per-record sharing-rule
mechanism, group membership, a genuine two-state time-clock machine feeding a payroll-reporting
pipeline, personal days/holidays, user CRUD (including CSV import and mass-update), login history,
and a long tail of smaller personal-productivity features (mail accounts, notification schedulers,
Word-merge templates, barcode printing) that live under the same module for historical reasons.
A User record represents a login/employee identity: credentials, contact info, HR-adjacent fields
(salary, insurance, personal-day/vacation balances), UI/workflow preferences, and QuickBooks
employee-sync pointers (confirmed dead).

Users is the third blueprinted module (after SalesOrder and Accounts), chosen specifically because
it gates every other module's rewrite — login, RBAC, permissions, sharing rules, and time-clock/
payroll all live here. This module carries more direct operational weight than a typical module:
two Critical/High findings — the fully-traced root-cause mechanism of a prior real data-loss
incident (`deleteRole()`'s empty-parameter wipe of the entire role/permission subsystem) and live
SQL injection in the ordinary clock-in/out and personal-day endpoints — were flagged in the source
material as needing legacy-system remediation now, independent of any rewrite timeline (see
`risks-and-open-questions.md`).

**A structurally important finding**: at least four files physically located inside
`modules/Users/` are confirmed legacy misplacements that operate on **other** modules' data
entirely — a Leads-only "Change Status"/"Change Owner" form, a generic ~30-module mass owner/
group-change engine reachable from that form, a mislabeled Calendar/Activities relation-delete
file, and a Word-template merge branch for Leads/Contacts. These are treated as **not part of this
module's bounded context** throughout this spec (see `integrations.md`).

## Actors

- **Any authenticated user** — logs in/out, changes their own password, clocks in/out, submits
  personal-day/time-off requests, manages their own mail account and calendar/notification
  preferences.
- **Admin users** (`is_admin`) — create/edit/delete Users, Roles, Profiles, Groups, and Sharing
  Rules; bypass all module/field/sharing permission checks by design; manage org-wide default
  sharing; import users via CSV; run mass-updates.
- **Payroll/management staff** — consume the payroll report/export and manage time-card overrides.
- **Warehouse/timeclock-station staff** — consume the barcode-label output for badge-based
  clock-in/out and/or barcode-based login.
- **System/integration processes** — the QuickBooks employee-sync batch/cron dispatcher
  (confirmed dead), the auto-clock-out safety net, the 2FA verification-code email sender, and the
  privilege/sharing-cache regeneration job.
- **PendingDeliveries module (as a caller into Users)** — writes a delivery-driver-assignment flag
  onto the User record, one-directional, no reverse read confirmed from Users.

## Scope within this module

**In scope**: login/authentication, session handling, role/profile/permission management,
org-wide and per-record sharing rules, group membership, time-clock and payroll tracking, personal
days/holidays, user CRUD (including CSV import and mass-update), login history, mail accounts,
notification schedulers, word-merge templates, barcode printing, and the QuickBooks employee-sync
integration (confirmed dead).

**Out of scope**:
- Generic vtiger CRM "last import" batch-tracking plumbing (`vtiger_users_last_import`) —
  standard cross-module infra, not Users-specific business data.
- The four confirmed legacy-misplaced files described above — they belong to whichever module's
  data they actually operate on (Leads, Calendar/Activities, or a shared platform-level mass-update
  service), not to Users.
- The other ~125 modules of the wider ERP. Users is the third blueprinted module; the patterns
  established here are meant to generalize but this document does not itself specify those other
  modules.
- Deployment/rollout sequencing across the wider system (kept at outline depth in the source
  blueprint, not consolidated into this tech-agnostic layer).
- Selecting an implementation technology stack (explicitly deferred).

## Origin

Extracted-from-legacy. Source system: the legacy LBM (Fuse5) vtiger-5.0.4-derived multi-tenant ERP,
`modules/Users/` plus supporting utility files (e.g. `include/utils/UserInfoUtil.php`,
`CreateUserPrivilegeFile.php`). This file consolidates `docs_from_blueprint/module/Users/
01-module-overview.md`, itself derived from `blueprint/module/Users/00-README.md` and
`00-pass0-inventory.md` ("Doc1"), the outputs of an eight-pass blueprint-extraction effort against
the live legacy codebase and a read-only dev-DB snapshot. No BRD/requirements-derivation was
involved for this module — every claim below traces to a specific legacy code/schema citation
carried forward from that blueprint, not to a business-requirements document. Open questions raised
during extraction are catalogued in `risks-and-open-questions.md`, not resolved here.

## Dependencies

Per the source blueprint's blanket architectural fact: **every other module in the wider ERP reads
this module's context for record ownership and role/profile-based permission checks** — this
module's permission read model is a dependency of effectively every other module's authorization
logic, which is why its own build sequencing front-loads auth/RBAC ahead of every other concern
(see `build-guidance.md`). Beyond that blanket relationship, Users itself depends on no other
module's data to function; see `integrations.md` for the specific, narrower cross-module
boundaries found in the other direction (Leads, PendingDeliveries, Calendar/Activities,
QuickBooks).
