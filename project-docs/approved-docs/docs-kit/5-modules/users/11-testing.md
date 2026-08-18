# Module Testing — Users

# Document Information

| Field | Value |
|---|---|
| Module | Users |
| Version | 1.2 |
| Status | Draft |
| Author | Developer (AI-assisted) |
| Last Updated | 2026-08-18 |

---

# Revision History

| Date | Change |
|---|---|
| 2026-08-18 | Initial draft (v1.0). |
| 2026-08-18 | v1.1 — review pass: removed Sharing Rule and payroll-export test scope (ADR-081/078); removed the non-existent RecalculateSharingRules large-data test. |
| 2026-08-18 | v1.2 — time-card override concurrency test replaced last-write-wins assumption with the standard project-wide lock test (ADR-079/080/084). |

---

# 1. Overview

**Purpose**: complete test specification with traceability from requirement to test case. **Scope**:
auth, User/Role/Profile/Group CRUD, Time Clock, Payroll (on-screen), Personal Day/Holiday,
QuickBooks sync.
**References**: `10-implementation-plan.md`'s Test/Verification Strategy Pointer (adopted from
`sot-docs/raw/2-module-specs/Users/build-guidance.md`).

---

# 2. Test Scope

**Included**: FR-001–FR-012 (`2-functional-specification.md`), all 66 business rules
(`3-business-rules.md`), the permission matrix (`7-permissions.md`).

**Excluded**: Sharing Rule tests of any kind (dropped project-wide, ADR-081 — no such feature
exists to test); payroll CSV/ZIP export tests (deferred past MVP, ADR-078); cross-tenant Super Admin
management (skeleton control panel's own test scope, not this module's).

**Dependencies**: none inbound.

**Cross-Module Data Flow**:

| Produces | Consumed by | Field | Test |
|---|---|---|---|
| This module's Role/Profile/permission read model | Every other module | Role → Profile → module/field/action permission chain | End-to-end test: create a User with a scoped Role in this module, confirm the target permission is actually enforced when calling a different module's endpoint (not just that this module's own unit tests pass) |
| Time Clock Records (`hours_type`-classified) | Payroll Report (this module) | `hours_type` | Already same-module — listed for completeness, not a cross-module link |
| Personal Day submission | Time Clock Record (bridge) | The new hours-type-classification bridge (closes the legacy disconnect) | Submit a Personal Day, confirm it produces a correctly-classified Time Clock Record end-to-end |

**Consumes from other modules**: `default_location_id` (Location module, once it exists) — no
producing module built yet at the time this module is implemented (M3 builds Users/Location/
Products/UOM together per `milestone-status.md`, so this is same-milestone, not a forward
dependency on unbuilt work).

---

# 3. Traceability Matrix

| Requirement | Business Rule | Validation | Permission | Test Case |
|---|---|---|---|---|
| FR-001 Authenticate | USR-RULE-019–030 | `6-validation.md` §3 | `7-permissions.md` §3 (public) | TC-001–TC-005 |
| FR-002 Manage Users | USR-RULE-001–012 | `6-validation.md` §3/§5 | `7-permissions.md` §3 | TC-006–TC-012 |
| Delete-family (all entities) | USR-RULE-052–059 | — | Admin only | TC-013–TC-016 |
| FR-008 Time Clock | `3-business-rules.md` §6 | `6-validation.md` §4 | Self | TC-017–TC-020 |
| FR-009 Payroll | `3-business-rules.md` §5 | — | Admin/Accounting-Management | TC-021–TC-023 |

---

# 4. Functional Tests

## TC-001

**Title**: Successful login with valid credentials, no 2FA. **Requirement**: FR-001. **Preconditions**:
active user, role not 2FA-required. **Steps**: submit valid email/password. **Expected Result**: JWT
issued, redirect to default page. **Priority**: Critical.

## TC-002

**Title**: Login denied for Inactive account status despite correct credentials. **Requirement**:
FR-001. **Preconditions**: user with `status = Inactive`. **Steps**: submit correct credentials.
**Expected Result**: `401`, generic message (preserves USR-RULE-022). **Priority**: Critical.

## TC-006

**Title**: Duplicate email rejected on create. **Requirement**: FR-002. **Preconditions**: existing
user with email X. **Steps**: create a new user with email X. **Expected Result**: `409`, specific
error (closes USR-RULE-001). **Priority**: High.

## TC-013

**Title**: Delete Role with empty id rejected before query construction. **Requirement**: FR-003.
**Preconditions**: Admin session. **Steps**: `DELETE /roles/` (empty id). **Expected Result**: `400`,
rejected before any query — reproduces the exact legacy `deleteRole()` failure mode and asserts
rejection (closes USR-RISK-001). **Priority**: Critical.

## TC-017

**Title**: Clock-in blocked while an open punch already exists for the user. **Requirement**: FR-008.
**Preconditions**: user has an open Time Clock Record. **Steps**: submit another clock-in.
**Expected Result**: `409` (closes the legacy system's confirmed absence of this guard). **Priority**:
High.

---

# 5. Validation Tests

Required Fields, Formats, Ranges, Cross-field, Business validation — one test per row of
`6-validation.md` §3–§5, named/tagged by field (e.g. `email-required`, `personal-day-end-after-start`).

---

# 6. Permission Tests

**Admin**: full CRUD on all module entities — confirm every §3 "Allowed" cell of
`7-permissions.md`. **Manager (Accounting/Management)**: payroll report access, no User/Role/
Profile/Group CRUD access. **Staff (other 3 roles)**: self-service only — own password, own Time
Clock, own Personal Day submission; every admin-screen endpoint returns `403`. **Ownership**: a
non-Admin user editing another user's record is rejected server-side (closes the legacy soft-block
gap — `2-functional-specification.md` FR-002).

---

# 7. API Tests

GET/POST/PATCH/DELETE per `8-api.md` §2 API Summary — standard CRUD test coverage plus the
module-specific negative tests already listed in §4 above (TC-013 pattern repeated for
User/Profile/Group delete). Errors: `400`/`401`/`403`/`404`/`409` per endpoint. Pagination/Filtering:
User List's role/location/text-search filters.

---

# 8. UI Tests

List/Create/Edit/Delete for User/Role/Profile/Group screens (`9-ui.md` §4), plus Role reparenting.
Search:
User List debounced search. Filtering: role/location. Responsive: Profile permission-grid mobile
collapse (`9-ui.md` §8). Accessibility: password visibility-toggle `aria-label`, Time Clock widget
`aria-live` region (`9-ui.md` §9).

---

# 9. Business Rule Tests

One test per rule, tagged/named after its `USR-RULE-###` id so coverage against
`3-business-rules.md` is mechanically auditable (a script can grep test names against the rule
catalog and report any rule with zero matching tests) — per
`sot-docs/raw/2-module-specs/Users/build-guidance.md`'s own stated test strategy. 66 rules total;
not enumerated individually here (see `3-business-rules.md` for the full catalog reference).

---

# 10. Edge Cases

**Duplicate**: TC-006 above. **Concurrency**: two admin/manager time-card overrides on the same
punch — test confirms the standard project-wide lock (ADR-079/080/084) blocks the second manager
from opening the punch while the first has it locked, with the detailed "currently being edited by
X" message; a heartbeat-timeout test confirms the lock releases automatically on disconnect.
**Large data**: User List
pagination and CSV import at scale — test confirms per-row exclusion doesn't degrade to an
all-or-nothing failure. *(No RecalculateSharingRules test — that job doesn't exist, ADR-081.)*
**Timeout**: N/A beyond standard project-wide handling. **Network failure**: standard project-wide
retry pattern.

---

# 11. Performance Tests

Large datasets: User List pagination at scale. Bulk import: CSV import with a large row count —
confirm per-row exclusion doesn't degrade to an all-or-nothing failure. Search: debounced, doesn't
fire on every keystroke. Pagination: standard.

---

# 12. Security Tests

Adopted directly from `sot-docs/raw/2-module-specs/Users/build-guidance.md`'s Test/Verification
Strategy Pointer — one test per Critical/High finding, explicit and named:

- Reproduce the empty-identifier delete request for Role/User/Profile/Group, assert rejection
  before any query construction (USR-RISK-001).
- Attempt the documented injection payloads against clock-in/clock-out/personal-day commands,
  assert parameterized rejection (USR-RISK-002/003).
- Create a personal-day row for a user id ≥ 100, assert correct, untruncated ownership
  (USR-RISK-004).
- Attempt a weak-password change via every entry point (interactive, import, admin-reset), assert
  uniform rejection (USR-RISK-005).
- Script repeated failed-login attempts across session boundaries, assert DB-backed lockout
  activates regardless of cookie/session persistence (USR-RISK-006).
- Attempt to create a duplicate username and to demote the organization's last remaining Admin,
  assert both rejected via the real command path (USR-RISK-020).
- Attempt to save a User missing a required field, assert server-side rejection with no
  client-side involvement in the test (USR-RISK-021).

**Unauthorized access / permission escalation**: every `7-permissions.md` §3 "Denied" cell gets a
test confirming the endpoint actually returns `403`, not just that the UI hides the button.

---

# 13. Regression Checklist

Critical workflows: login (incl. 2FA/IP-restriction/Inactive-account denial), User create/edit/
delete, Role/Profile/Group delete via transfer-target flow, Time Clock clock-in/out, Payroll report
generation with an open-punch flag.

---

# 14. Test Data

Required seed data: ADR-002's 5 tenant-facing roles + a default Profile template (Phase 2,
`10-implementation-plan.md`). Reference data: none module-specific beyond the Role catalog.

---

# 15. Related Documents

Module (`1-module.md`) · Functional Specification (`2-functional-specification.md`) · Business
Rules (`3-business-rules.md`) · Validation (`6-validation.md`) · Permissions (`7-permissions.md`) ·
API (`8-api.md`) · UI (`9-ui.md`) ·
[Project Testing Strategy](../../../../approved-docs/docs-kit/6-development/6-testing-strategy.md)
(not yet generated — late-wave `6-development/` doc, per project status).

---

# Revision History

| Date | Change |
|---|---|
| 2026-08-18 | Initial draft. |

# Approval

| Role | Name | Status | Date |
|---|---|---|---|
| Developer | Parimal Chaudhari | Pending | |

# AI Generation Notes

Security test list adopted directly from the source blueprint's own build-guidance document — every
Critical/High finding gets a named, specific negative test, not a general assurance. Cross-Module
Data Flow (§2) is thin for this module specifically because Users is the *first* module built (M3)
and has no inbound dependency on another module's data yet — the table is structured to be filled
in as later modules (Location, Products) come online and this module starts consuming their data
(`default_location_id`).
