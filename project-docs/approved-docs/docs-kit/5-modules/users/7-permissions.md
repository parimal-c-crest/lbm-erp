# Permissions — Users

# Document Information

| Field | Value |
|---|---|
| Module | Users |
| Version | 1.1 |
| Status | Draft |
| Author | Developer (AI-assisted) |
| Last Updated | 2026-08-18 |

---

# 1. Overview

**Purpose**: define who can view/create/update/delete/manage this module's **own** data (Users,
Roles, Profiles, Groups — no Sharing Rule entity, dropped project-wide per ADR-081) — not the
whole-application permission model this module
*implements* for every other module (that's this module's own business logic, documented in
`3-business-rules.md`/`4-schema.md`, not restated here as a permissions concern). **Scope**: matches
the field-extraction pass's `permissions.md` reference exactly. **Authorization model**: role→
profile→module/field/action permission chain (`4-schema.md`), resolved fresh per request via
NestJS Guards (`3-api/3-authorization.md`) — never a session-cached or file-cached value (closes
USR-RISK-015).

---

# 2. Roles

ADR-002 starter catalog: Counter/Sales Staff, Warehouse/Fulfillment Staff, Accounting/Management,
Purchasing Staff, **Admin** (the only role with access to this module's own administration screens),
plus the structurally-separate **Super Admin** axis (ADR-057, platform-support, bypasses every
check, out of this module's own UI scope — see `1-module.md` §4).

---

# 3. Permission Matrix

| Permission | Admin | Non-admin (self) | Non-admin (another user's record) |
|---|---|---|---|
| Create User | Allowed | N/A | N/A |
| Edit User | Allowed | Allowed (own record only) | **Denied — real server-side enforcement** (closes the legacy system's inconsistent soft-message/hard-redirect mix, `2-functional-specification.md` FR-002) |
| Delete User | Allowed, via transfer-target flow | Denied | Denied |
| Delete Role/Profile/Group | Allowed, via transfer-target flow | Denied | Denied |
| Create/Edit Profile, Group | Allowed | Denied | Denied |
| Assign Role to a User | Allowed | Denied | Denied |
| Reparent a Role (hierarchy) | Allowed | Denied | Denied |
| Configure per-role 2FA requirement | Allowed | Denied | Denied |
| View User List/Detail | Allowed | **Role-permission-dependent** — governed by standard Profile module-access (§4 below), not hardcoded | Same |
| Change own password | Allowed | Allowed | N/A |
| Reset another user's password | Allowed | Denied | Denied |
| Submit own Personal Day / Time Off | Allowed | Allowed | N/A |
| Clock in/out (own) | Allowed | Allowed | N/A |
| Time-card override (any user) | Allowed | Denied | Denied |
| View Payroll Report (export deferred past MVP, ADR-078) | Allowed (also Accounting/Management, per ADR-002's role description) | Denied | Denied |
| Configure QuickBooks employee sync (revived, ADR-074) | Allowed | Denied | Denied |

**Closes a confirmed legacy gap**: none of the six admin-screen files (Save User, SaveProfile,
DeleteRole, DeleteUser, DeleteProfile, DeleteGroup) are gated through the legacy system's own Role/
Profile permission system at all — every row above is enforced as a real Guard-level check in the
new design, not assumed already satisfied. *(v1.0 of this table listed a seventh file,
RecalculateSharingRules — that job doesn't exist in this design; Sharing Rules were dropped
entirely, ADR-081.)*

---

# 4. Ownership Rules

Self vs. other is the only record-level distinction this module's own administration logic needs —
checked consistently (server-side, every path) in the new design, unlike the legacy system's mix of
a non-halting message (edit) and a hard redirect (password-change branch only).

**Resolved (developer confirmed)**: User List/Detail visibility is governed by the **standard
Profile module-access permission** — the same `profile_module_access` mechanism (§3, `4-schema.md`)
that gates every other module — not a hardcoded Admin-only rule. This closes the legacy system's own
confirmed gap (no blueprint pass traced a sharing-rule check gating who can *see* a given User row)
by routing visibility through the module's own general-purpose permission grid instead of leaving it
unspecified: an Admin can grant a non-Admin Role read access to the User List/Detail screens via that
Role's Profile, same as granting access to any other module.

---

# 5. Record-Level Permissions

No record-level lifecycle state (Draft/Approved/Archived) applies to User/Role/Profile/Group records
— this module has no such concept (`4-schema.md` §9, `workflow.md`).

---

# 6. Field-Level Permissions

**Editable by self**: contact info, notification preferences, mail account settings, own password.
**Admin-only**: Role assignment, `is_super_admin` flag (read-only display even to Admin — set only
via tenant provisioning or the skeleton control panel, ADR-057), Account Status, HR-profile fields
(salary, SSN, insurance).
**Read-only to everyone**: audit columns (`created_at`/`updated_at`/`created_by`/`updated_by`).

---

# 7. Action Permissions

Create/Update/Delete: see §3. Approve/Reject: N/A — no approval workflow in this module. Import:
Admin only (CSV Import wizard). Export: Admin only (User ListView export, Payroll/Time-Card exports
— Accounting/Management also for payroll specifically). Archive/Restore: N/A — soft-delete only, no
distinct archive state.

---

# 8. API Authorization

| Endpoint | Required Permission |
|---|---|
| `POST /auth/login` | Public (`@Public()`) |
| `GET/POST/PATCH/DELETE /users*` | Admin role (self-service subset: `PATCH /users/me`, `POST /users/me/password` — self, no Admin required) |
| `GET/POST/PATCH/DELETE /roles*`, `/profiles*`, `/groups*` | Admin role |
| `POST /timeclock/*` (own) | Any authenticated user |
| `POST /timeclock/override` | Admin or Accounting/Management |
| `GET /payroll/*` | Admin or Accounting/Management |

Full endpoint list: `8-api.md` §3.

---

# 9. UI Authorization

Sidebar/menu visibility for Users' admin screens: Admin role only (`4-ui/1-navigation.md` §10
matrix — Users is Admin-only across the board, no partial-access row for other roles). Self-service
screens (own password, own preferences, own Time Clock, own Personal Day submission) visible to
every authenticated user regardless of role. Read-only behavior: HR-profile fields render read-only
for non-Admin viewers of their own record where a business reason exists (none confirmed — every
self-service field is self-editable).

---

# 10. Audit Requirements

**Logging**: every user's activity logged, Super Admin included, with no unaudited backdoor CC
mechanism (closes USR-RISK-010, per ADR-057's audit requirement). **Approval history**: N/A — no
approval workflow. **Permission failures**: logged at the Guard layer per project-wide convention
(`3-api/3-authorization.md`) — not module-specific.

---

# 11. Related Documents

Module (`1-module.md`) · Business Rules (`3-business-rules.md`) · API (`8-api.md`) · UI (`9-ui.md`)
· [Authentication](../../../../approved-docs/docs-kit/3-api/2-authentication.md) ·
[Authorization](../../../../approved-docs/docs-kit/3-api/3-authorization.md).

---

# Revision History

| Date | Change |
|---|---|
| 2026-08-18 | Initial draft (v1.0). |
| 2026-08-18 | v1.1 — review pass: removed Sharing Rule permission rows and the non-existent RecalculateSharingRules job reference (ADR-081); added QuickBooks-sync and Role-reparent/2FA-config permission rows. |

# Approval

| Role | Name | Status | Date |
|---|---|---|---|
| Developer | Parimal Chaudhari | Pending | |

# AI Generation Notes

Every "Denied" cell in §3 that the legacy system left unenforced is a deliberate closure of a
confirmed gap (`sot-docs/raw/2-module-specs/Users/permissions.md`), not an invented restriction —
cited inline. User List/Detail visibility (§4) resolved with the developer: routed through the
module's own standard permission grid rather than hardcoded.
