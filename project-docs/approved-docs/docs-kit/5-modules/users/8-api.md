# API Specification — Users

# Document Information

| Field | Value |
|---|---|
| Module | Users |
| Version | 1.1 |
| Status | Draft |
| API Version | v1 |
| Base Path | /api/v1 |
| Author | Developer (AI-assisted) |
| Last Updated | 2026-08-18 |

---

# 1. Overview

**Purpose**: REST contract for this module. **Scope**: authentication, User/Role/Profile/Group CRUD
(no Sharing Rule entity — ADR-081), Time Clock, Payroll (on-screen only, export deferred past MVP —
ADR-078), Personal Day/Holiday, self-service preferences, QuickBooks employee sync (revived,
ADR-074).
**Dependencies**: none inbound; every other module's own API depends on the JWT issued here and the
permission context resolved from Role/Profile. **Related project API documents**:
`3-api/1-api-design.md`, `3-api/2-authentication.md`, `3-api/3-authorization.md`.

---

# 2. API Summary

| Method | Endpoint | Description |
|---|---|---|
| POST | /auth/login | Authenticate, issue JWT access+refresh |
| POST | /auth/refresh | Refresh an expired access token |
| POST | /auth/logout | Invalidate session |
| POST | /auth/2fa/verify | Submit 2FA code |
| GET | /users | List users (Admin) |
| POST | /users | Create user (Admin) |
| GET | /users/{id} | User detail |
| PATCH | /users/{id} | Edit user |
| DELETE | /users/{id} | Delete user (transfer-target required) |
| POST | /users/import | CSV import |
| PATCH | /users/me | Self-service edit (own record) |
| POST | /users/me/password | Change own password |
| POST | /users/{id}/password-reset | Admin-reset another user's password |
| GET/POST | /roles | List/create Role (hierarchical — optional `parentRoleId`) |
| PATCH/DELETE | /roles/{id} | Edit/delete Role (transfer-target required on delete) |
| PATCH | /roles/{id}/reparent | Move Role to a new parent, recompute depth for descendants |
| PATCH | /roles/{id}/two-factor-requirement | Admin-configurable per-role 2FA toggle |
| GET/POST | /profiles | List/create Profile |
| PATCH/DELETE | /profiles/{id} | Edit/delete Profile |
| GET/POST | /groups | List/create Group |
| PATCH/DELETE | /groups/{id} | Edit/delete Group (transfer-target required on delete) |
| POST | /timeclock/clock-in | Clock in |
| POST | /timeclock/clock-out | Clock out |
| POST | /timeclock/override | Admin/manager time-card override |
| GET | /payroll/report | Payroll report (date-range, on-screen — CSV/ZIP export deferred past MVP, ADR-078) |
| POST | /personal-days | Submit personal day/time off |
| GET/POST | /holidays | Holiday catalog |
| GET | /login-history | Audit trail (Admin) |
| GET | /quickbooks-sync/status | QuickBooks employee-sync status per user (revived, ADR-074) |

*(No `/sharing-rules*` endpoints — that entity is dropped project-wide, ADR-081.)*

---

# 3. Endpoints

## POST /auth/login

**Purpose**: authenticate, issue JWT. **Authorization**: `@Public()`. **Related Requirements**:
FR-001. **Related Business Rules**: USR-RULE-019–030 (auth/session/2FA group). **Request Body**:
`LoginDto` (username, password — Username is the login identifier, kept distinct from Email per
developer decision, `4-schema.md`). **Validation References**: `6-validation.md` §3. **Success
Response**: `{ accessToken, refreshToken, requires2fa? }` — `requires2fa` set only if the user's
Role has `required=true` in `role_two_factor_requirements`. **Errors**: generic `401` for any
failure mode except IP-restriction denial (deliberate anti-enumeration posture, preserves
USR-RULE-030).

## POST /auth/2fa/verify

**Purpose**: complete 2FA login. **Authorization**: session from the prior `/auth/login` call, not
yet fully authenticated. **Request Body**: `{ code }`. **Success Response**: full JWT pair. **Errors**:
`401` on mismatch/expiry (15-minute window).

## GET /users

**Purpose**: list users. **Authorization**: Admin role (`7-permissions.md` §8). **Query Parameters**:
standard pagination/filter (`3-api/1-api-design.md`) + role/location/text-search per the User List
screen (`9-ui.md`). **Response**: paginated `UserListItemDto[]`. **Errors**: `403` non-Admin.

## POST /users

**Purpose**: create a user. **Authorization**: Admin. **Request Body**: `CreateUserDto`.
**Validation References**: `6-validation.md` §3/§5 (email unique, Role required). **Business Rule
References**: USR-RULE-001 (real duplicate-username check, not the legacy informational-only
version). **Success Response**: `201`, `UserDetailDto`. **Errors**: `409` duplicate email, `400`
validation.

## PATCH /users/{id}

**Purpose**: edit a user. **Authorization**: Admin (any user) or self (own record only —
`7-permissions.md` §3). **Request Body**: `UpdateUserDto`. **Validation/Business Rule References**:
same as create; role/profile change triggers permission read-model invalidation for that user
(closes USR-RISK-015). **Errors**: `403` non-Admin editing another user's record (real enforcement,
closes the legacy soft-block gap).

## DELETE /users/{id}

**Purpose**: delete a user. **Authorization**: Admin. **Request Body**: `{ transferToUserId }` for
any owned/assigned records requiring reassignment. **Business Rule References**: BR-001 (delete-
family, `3-business-rules.md`). **Errors**: `400` empty/invalid id (rejected before any query,
closes USR-RISK-001), `409` attempted last-admin self-demotion (closes USR-RISK-020).

## POST /users/import

**Purpose**: CSV import. **Authorization**: Admin. **Request Body**: multipart CSV + column-mapping.
**Validation References**: `6-validation.md` §7 (barcode/username/role-name/is_admin-format checks,
password validation applies uniformly). **Success Response**: per-row create/update result with
per-row exclusion reasons for failed rows.

## POST /users/me/password

**Purpose**: self-service password change. **Authorization**: self. **Request Body**:
`ChangePasswordDto` (oldPassword, newPassword). **Business Rule References**: USR-RULE-009/010
collapsed into one command (`2-functional-specification.md` FR-007). **Errors**: `400` old-password
mismatch or weak new password (server-side complexity check, closes USR-RISK-005).

## Role / Profile / Group CRUD

Same shape as Users' create/edit/delete (Admin-only, transfer-target-required delete for Role/
Profile/Group) — see `3-business-rules.md` BR-001 and `7-permissions.md` §3 for the shared pattern;
not re-specified per entity here to avoid repeating an identical contract 4 times.

## POST /timeclock/clock-in / /timeclock/clock-out

**Purpose**: Time Clock transitions. **Authorization**: self (any authenticated user). **Business
Rule References**: `3-business-rules.md` §6 state machine. **Validation**: parameterized query only,
no raw-string construction (closes USR-RISK-002). **Errors**: `409` if clocking in with an already-
open punch (closes the legacy system's confirmed absence of this guard).

## POST /timeclock/override

**Purpose**: admin/manager correction of clock-in/out timestamps. **Authorization**: Admin or
Accounting/Management. **Validation**: clock-out must not precede clock-in (`6-validation.md` §4,
closes the legacy system's confirmed absence of this check).

## GET /payroll/report

**Purpose**: date-range payroll report. **Authorization**: Admin or Accounting/Management.
**Query Parameters**: date range, report type. **Response**: per-user hours-type columns + overtime
column (flat US 1.5x/40hr, ADR-036), computed fresh (never cached). **Business Rule References**:
`3-business-rules.md` §5 Calculations — flags any covered period containing an unresolved/unclosed
punch as provisional (ADR-037). **No export endpoint** — CSV/ZIP export is deferred past MVP
(ADR-078); this endpoint returns on-screen report data only.

## POST /personal-days

**Purpose**: submit a personal-day/time-off entry. **Authorization**: self. **Business Rule
References**: bridges into a Time Clock Record with the matching hours-type classification (closes
the legacy disconnect, `calculations.md` §4).

---

# 4. Request Models

DTOs per endpoint above (`CreateUserDto`, `UpdateUserDto`, `ChangePasswordDto`, etc.) — field shapes
mirror `4-schema.md` §4 table definitions and `6-validation.md` §3; not redefined here per the
project's shared-DTO convention (avoid redefining common objects, per this template's own
instruction).

---

# 5. Response Models

Standard project-wide `SuccessResponse`/`PaginationResponse`/`ErrorResponse` envelopes
(`3-api/1-api-design.md`) — no module-specific response shape beyond the DTOs named per endpoint
above.

---

# 6. Validation References

`6-validation.md` §3–§9 — every endpoint above cites the specific section inline rather than
repeating validation-rule ids here.

---

# 7. Authorization References

`7-permissions.md` §3/§8 — every endpoint's required role is stated inline above and in the API
Summary table.

---

# 8. Business Rule References

`3-business-rules.md` — every endpoint cites its governing `USR-RULE-###`/`USR-RISK-###` inline
above.

---

# 9. Events

**Emails**: 2FA verification-code delivery (`POST /auth/login` when 2FA required), sent only to the
account holder's own email (ADR-076). **Notifications**: none beyond the 2FA email. **Queues**:
BullMQ for the auto-clock-out safety net and the QuickBooks employee-sync job (ADR-074). **Webhooks**:
none confirmed for this module.

---

# 10. Integrations

External APIs: QuickBooks employee sync — **revived**, async via BullMQ (ADR-074, `1-module.md`
§11). Third-party systems: cloud-print service for barcode labels (optional delivery channel).

---

# 11. Performance

**Caching**: permission read model resolved per-request from live tables, not a regenerated file
cache (closes USR-RULE-012's cost) — implementation may still use Redis for the *resolved* value
with real invalidation on role/profile change, not a stale TTL-only cache.
**Pagination**: standard project-wide cursor/offset pagination (`3-api/1-api-design.md`) on all
list endpoints. **Timeouts**: standard project-wide. **Rate limits**: standard project-wide API
rate limits (ADR-171) apply; 2FA code regeneration additionally needs its own rate limit at the
application layer (closes USR-RISK-014's confirmed absence of one).

---

# 12. Related Documents

Module (`1-module.md`) · Functional Specification (`2-functional-specification.md`) · Validation
(`6-validation.md`) · Business Rules (`3-business-rules.md`) · Permissions (`7-permissions.md`) ·
Project API Standards (`3-api/1-api-design.md`).

---

# Revision History

| Date | Change |
|---|---|
| 2026-08-18 | Initial draft (v1.0). |
| 2026-08-18 | v1.1 — review pass: removed `/sharing-rules*` endpoints entirely (ADR-081); removed `/payroll/report/export` (ADR-078, deferred past MVP); QuickBooks reframed as revived (ADR-074); locked overtime formula reference (ADR-036); 2FA email delivery scoped to account holder only (ADR-076). |

# Approval

| Role | Name | Status | Date |
|---|---|---|---|
| Developer | Parimal Chaudhari | Pending | |

# AI Generation Notes

Endpoint set derived directly from `2-functional-specification.md`'s 12 FRs. Role/Profile/Group/
Sharing-Rule CRUD endpoints deliberately not each fully re-specified (identical Admin-only,
transfer-target-required pattern) to avoid four near-duplicate sections — see `3-business-rules.md`
BR-001 for the one shared contract they all follow.
