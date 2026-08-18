# Module Specification — Users

# Document Information

| Field | Value |
|---|---|
| Module Name | Users |
| Version | 1.1 |
| Status | Draft |
| Owner | Developer (solo, AI-assisted) |
| Priority | Highest — gates every other module's authorization behavior (M3, first module built) |

---

# 1. Executive Summary

**Purpose**: Users is the identity/RBAC backbone of the ERP — authentication, session handling,
role/permission management, group membership, a two-state time-clock feeding payroll, personal
days/holidays, user administration (including CSV import), login history, and a set of
personal-productivity features (mail accounts, notification schedulers, Word-merge templates,
barcode printing) that live under the same module for historical reasons carried forward from the
legacy system. [Source: `sot-docs/raw/2-module-specs/Users/module-overview.md`]

**Business objective**: replace the legacy system's informal, largely-unenforced permission model
with structurally-enforced authentication and authorization — closing two Critical findings (a
traced data-loss incident root cause, live SQL injection reachable by any authenticated user) and
six High findings (weak password/lockout posture, a silent payroll undercount, divergent overtime
formulas) that the legacy extraction confirmed. [Source:
`sot-docs/raw/2-module-specs/Users/risks-and-open-questions.md`]

**Scope**: per-tenant user/role/permission administration, authentication, time clock and payroll
reporting. Out of scope: the skeleton-level, cross-tenant Super Admin management screen (ADR-057) —
that is the Platform Administration (Skeleton Control Panel) epic's own territory, not this
module's UI, even though the `User` table and `is_super_admin` flag are shared (see §4 Actors and
`7-permissions.md`).

---

# 2. Business Context

**Problem statement**: the legacy system's `Users::saveentity`/`insertIntoEntityTable` performs
zero business-rule validation on save; the one real server-side duplicate-username/last-admin guard
that exists is never called from the real save path; none of the four delete entry points
(Role/User/Profile/Group) validate their id parameter before running destructive queries — this
last gap is the confirmed, traced root cause of a prior real data-loss incident. [Source:
`sot-docs/raw/2-module-specs/Users/business-rules-and-validation.md` Headline Finding, `USR-RISK-001`]

**Business value**: a correct, structurally-enforced permission system is a prerequisite for every
other module's own authorization to be trustworthy — this project's core security-rewrite objective
(CLAUDE.md) cannot be met if the module every other module depends on for record ownership and
permission checks is itself unenforced.

**Dependencies**: none inbound (Users depends on no other module's data to function). Outbound: every
other module reads this module's role/profile/permission context — see §11.

---

# 3. Module Overview

**Description**: a User record represents a login/employee identity within one tenant database
(ADR-056 database-per-tenant) — credentials, contact info, HR-adjacent fields, UI/workflow
preferences. This module also owns Role and Group, the Time Clock/payroll pipeline, and a set of
smaller self-contained features (Personal Days, Holidays, Login History, Mail Accounts, Notification
Schedulers, Word Templates, Barcode Label printing, revived QuickBooks employee sync — ADR-074).
**No Sharing Rule mechanism** — role-based access (ADR-002) plus server-side Guards (ADR-006) is the
only authorization layer; the legacy sharing-rule/precedence engine was confirmed never actually
enforced correctly and no genuine business need was found for rebuilding it (ADR-081).

**Responsibilities**: authenticate users; compute and enforce the module/field/action permission
model for every module in the ERP (not just this one); manage the User/Role/Group entity set; track
time-clock punches and compute payroll hours/overtime; manage personal days/holidays; import users
via CSV; sync employee records to QuickBooks.

**Out of scope**: the skeleton-level cross-tenant Super Admin management screen (ADR-057 — owned by
the Platform Administration epic); four legacy-misplaced files that operate on Leads/Calendar data,
not Users data (not part of this module's bounded context at all — see
`2-functional-specification.md` §7); payroll CSV export (wanted, but explicitly deferred past MVP —
ADR-078).

---

# 4. Actors

- **Any authenticated user** — logs in/out, changes their own password, clocks in/out, submits
  personal-day/time-off requests, manages their own mail account and notification preferences.
- **Admin** (ADR-002 role) — creates/edits/deletes Users, Roles, Profiles, Groups; imports users via
  CSV; configures per-role 2FA requirement (ADR-075). Distinct from the legacy `is_admin` flag,
  which this module's new design maps onto the ADR-002 "Admin" role rather than a separate boolean
  (see `7-permissions.md`).
- **Super Admin** (ADR-057) — a platform-support account, one per tenant (created automatically at
  tenant provisioning — already implemented, `backend/src/tenant/provisioning/`), a structurally
  distinct axis from the ADR-002 role catalog, never assigned to a tenant's own business users.
  Bypasses every module/field/action permission check by design (mirrors legacy `is_admin`'s
  privilege-cache bypass, USR-RULE-045/047). This module's own screens surface Super Admin as a
  read-only badge on the User record it belongs to; creating/managing *additional* Super Admin
  accounts is the skeleton control panel's job (ADR-057), not this module's.
- **Payroll/management staff** — the Accounting/Management role (ADR-002); consumes the payroll
  report/export, manages time-card overrides.
- **Warehouse/timeclock-station staff** — the Warehouse/Fulfillment Staff role; clocks in/out,
  consumes barcode-label output for badge-based clock-in.
- **System processes** — the auto-clock-out safety net, 2FA verification-code sender, permission
  read-model invalidation on role/profile change, the revived QuickBooks employee-sync job
  (ADR-074).

---

# 5. Goals

**Business goals**: close every Critical/High security finding from the legacy extraction (see
`risks-and-open-questions.md` field-extraction pass, `10-implementation-plan.md` mitigations);
establish the RBAC foundation every other module (M3 onward) depends on.

**User goals**: log in reliably; see only what their role permits; manage their own password/
preferences without admin intervention; have their time-clock hours counted correctly toward
payroll.

**Success metrics**: zero unvalidated delete entry points (closes USR-RISK-001); zero raw
string-interpolated SQL (closes USR-RISK-002/003); a role/permission change takes effect on the
target user's next request, no stale session cache; payroll totals never silently exclude open
punches.

---

# 6. Functional Requirements

Organized by feature — full detail in `2-functional-specification.md` §3:

- FR-001 Authenticate (login/logout, 2FA, IP-restriction, barcode fallback)
- FR-002 Manage Users (create/edit/delete/CSV import/mass-update)
- FR-003 Manage Roles (create/edit/delete/reparent — hierarchical catalog seeded from ADR-002's 5
  roles, hierarchy kept per developer decision; see `4-schema.md` §1)
- FR-004 Manage Groups (create/edit/delete, member picker — assignment/roster only, ADR-081)
- FR-005 Manage Profiles & Permissions (module/field/action permission grid)
- FR-006 Configure Per-Role 2FA Requirement (ADR-075 — renumbered from the earlier "Manage Sharing
  Rules," which is dropped entirely per ADR-081)
- FR-007 Change Password (self-service and admin-reset)
- FR-008 Time Clock (clock in/out, task annotation, admin override)
- FR-009 Payroll Reporting (hours/overtime report; CSV export deferred past MVP, ADR-078)
- FR-010 Personal Days & Holidays (submit, admin-manage)
- FR-011 Login History (view, audit)
- FR-012 Self-Service Preferences (mail account, notification toggles)
- FR-013 QuickBooks Employee Sync (revived, ADR-074)

---

# 7. User Stories

- As **any user**, I want to log in with my email/password (and 2FA if my role requires it) so that
  I can access only what my role permits.
- As **Admin**, I want to create a new User and assign a Role so that they can start working with
  correctly-scoped access on day one.
- As **Admin**, I want an attempted delete with a missing/invalid id to be rejected before any query
  runs, so that the legacy `deleteRole()` incident can never recur.
- As **Warehouse/Fulfillment Staff**, I want to clock in/out (by button or badge scan) so that my
  hours are tracked for payroll.
- As **Accounting/Management**, I want a payroll report that never silently excludes an open punch,
  so that I can trust the totals before running payroll.

---

# 8. Acceptance Criteria

**Given** a delete request for any of User/Role/Profile/Group with an empty or malformed id,
**when** the request reaches the domain layer, **then** it is rejected before any query is
constructed (closes USR-RISK-001).

**Given** a user with an Inactive account status, **when** they submit fully correct credentials,
**then** they are not authenticated (preserves USR-RULE-022's real, enforced gate).

**Given** a time-clock punch still open when its pay period closes, **when** payroll is run,
**then** it surfaces as an explicit "unclosed punch" exception requiring manager resolution — never
silently excluded from the total (ADR-037).

---

# 9. Business Process

```
Login → RBAC context resolved (Role → Profile → module/field/action permissions)
        → every subsequent request in the ERP authorized against this context,
        fresh per request (no session-cached staleness). No sharing-rule layer (ADR-081).
```

Time Clock: `(none) → CLOCK IN → CLOCK OUT` — full transition table in `workflows.md` (field-extraction
pass) / `3-business-rules.md` §6.

---

# 10. Module Navigation

Reference: `4-ui/1-navigation.md` §6 lists Users' sub-structure as `List → Create → Detail → Edit →
Roles & Permissions → Role Detail`. Full screen inventory in `9-ui.md`.

---

# 11. Dependencies

**Modules**: none inbound. Outbound — every other module in the ERP reads this module's
role/profile/permission context for authorization (the blanket architectural fact restated once
rather than per-module, per the field-extraction pass). PendingDeliveries (a future module) writes
one-directionally into this module's `pending_delivery_status` field.

**External systems**: QuickBooks employee sync — confirmed dead in the legacy system, **revived** in
this design (ADR-074), not excluded — the new system actively keeps QuickBooks' employee list
current with this module's User data, async via BullMQ per ADR-031's standing principle.

**Shared services**: JWT issuance (`3-api/2-authentication.md`), bcrypt hashing (ADR-014), Redis/
BullMQ for the 2FA-email/lockout/background jobs.

---

# 12. Events

**Triggers**: login/logout, password change, role/profile change (triggers permission read-model
invalidation), time-clock punch, personal-day submission.

**Notifications**: 2FA verification-code email, sent only to the account holder's own email — the
legacy admin-account CC-to-developer-email mechanism is dropped entirely, superseded by ADR-057's
individual-account model (ADR-076).

**Background jobs**: auto-clock-out safety net (fires after configured store-close); permission
read-model invalidation on role/profile change (real invalidation, not a file-cache regeneration —
see `4-schema.md`/`8-api.md`); QuickBooks employee-sync (async, ADR-074).

---

# 13. Non-Functional Requirements

**Performance**: permission checks resolve per-request from a live read model, not a regenerated
file cache (closes the legacy system's unconditional-every-save cache regeneration cost,
USR-RULE-012).

**Availability**: N/A beyond standard project-wide targets — no module-specific SLA identified.

**Security**: parameterized queries/ORM only, no raw-string escape hatch (closes USR-RISK-002/003);
password complexity — min 8 characters, 1 uppercase, 1 lowercase, 1 number — enforced server-side at
every password-set path (ADR-155); account lockout — 5 failed attempts, 15-minute lockout,
auto-unlock, real DB-backed tracking not session-scoped (ADR-155); bcrypt hashing (ADR-014).

**Accessibility**: WCAG 2.2 AA per `4-ui/3-design-system.md` §13 — no module-specific exception.

**Localization**: not confirmed in scope for MVP — no SoT source requests it for this module.

---

# 14. Assumptions

- **Resolved (developer confirmed)**: the legacy hierarchical Role tree (self-referencing parent/
  child, computed nesting depth) **is** carried forward — Role keeps `parent_role_id`/`depth`,
  seeded with ADR-002's 5 tenant-facing roles as a starting flat layer that Admin can reparent via
  the same drag-and-drop reparenting interaction the legacy system had (see `9-ui.md`).
- **Resolved (developer confirmed)**: 2FA role requirement is **Admin-configurable per role** (a
  real settings screen, not a hardcoded allowlist) — closes USR-RISK-014's coverage gap by making
  the gate an intentional, visible admin decision instead of an undocumented code-level list.
- **Resolved (developer confirmed)**: a separate **Username** field is carried forward
  distinct from Email — users log in with Username, matching the legacy system's behavior. This
  changes the bootstrap `User` model (currently email-only) — see `4-schema.md`.
- **Resolved (developer confirmed)**: User List/Detail visibility is governed by the **standard
  Profile module-access permission** (the same mechanism every other module uses), not a
  hardcoded Admin-only rule — see `7-permissions.md` §4.
- Super Admin account creation/management (beyond the automatic bootstrap already implemented in
  `backend/src/tenant/provisioning/`) is the skeleton control panel's responsibility (ADR-057), not
  this module's own UI. `[Source: decisions-log ADR-057]`

---

# 15. Constraints

- Database-per-tenant isolation (ADR-056) — no `tenant_id` column anywhere in this module's schema
  (ADR-073 supersedes the legacy blueprint's own R7 recommendation to add one).
- Validation stack locked project-wide: `react-hook-form` + `zod` client-side, `class-validator` +
  `class-transformer` server-side (ADR-174).
- Password hashing: bcrypt (ADR-014).

---

# 16. Risks

Full register in `risks-and-open-questions.md` (field-extraction pass) — 22 findings (2 Critical, 6
High, 2 Medium-High, 4 Medium, 1 Low-Medium, 5 Low), all mapped to an explicit mitigation in
`10-implementation-plan.md`. Two findings (USR-RISK-001, USR-RISK-002) are flagged by the source
extraction as needing **legacy-system remediation now**, independent of this rewrite's timeline —
outside this document's own scope to action, but noted here so it isn't lost.

---

# 17. Related Documents

Schema (`4-schema.md`) · Data Dictionary (`5-data-dictionary.md`) · Validation (`6-validation.md`) ·
Permissions (`7-permissions.md`) · API (`8-api.md`) · UI (`9-ui.md`) · Business Rules
(`3-business-rules.md`) · Testing (`11-testing.md`) · Field-extraction pass
(`project-docs/claude-docs/analysis/module-field-extraction/users/`) · Source blueprint
(`project-docs/sot-docs/raw/2-module-specs/Users/`).

---

# Revision History

| Date | Change |
|---|---|
| 2026-08-18 | Initial draft (v1.0). |
| 2026-08-18 | v1.1 — review pass found this module already has 14 locked ADRs (ADR-036/037/057/074–078/081/134/154–157/185) v1.0 never checked. Corrected: Sharing Rules removed entirely (ADR-081), QuickBooks revived not excluded (ADR-074), payroll CSV export marked deferred-past-MVP (ADR-078), concrete password/lockout policy cited (ADR-155), 2FA-CC-drop and unclosed-punch handling cited to their real ADRs (076/037) instead of presented as this document's own invention. |

---

# Approval

| Role | Name | Status | Date |
|---|---|---|---|
| Developer | Parimal Chaudhari | Pending | |

---

# AI Generation Notes

Drafted from the pre-existing legacy blueprint (`sot-docs/raw/2-module-specs/Users/`, an eight-pass
extraction against the live legacy system) rather than re-deriving facts — see the field-extraction
pass adaptation documents for the formal citation chain. Four design decisions flagged and confirmed
with the developer (§14): Role hierarchy kept, 2FA made Admin-configurable per role, Username field
restored, User-list visibility made permission-based rather than hardcoded. v1.1's review pass then
found this module already has its own set of locked ADRs from an earlier session that v1.0 never
consulted — corrected throughout, see Revision History.
