# Functional Specification — Users

# Document Information

| Field | Value |
|---|---|
| Module | Users |
| Version | 1.2 |
| Status | Draft |

---

# 1. Overview

**Purpose**: translate `1-module.md`'s business requirements into concrete system behavior.
**Scope**: authentication, user/role/profile/group administration, per-role 2FA configuration, time
clock/payroll, personal days/holidays, self-service preferences, QuickBooks employee sync.
**References**: `1-module.md` §6 Functional Requirements (FR-001–FR-013).

---

# 2. Functional Scope

**Implemented features**: all FR-001–FR-013 (see `1-module.md` §6).

**Excluded features**: no Sharing Rule mechanism of any kind (ADR-081 — dropped project-wide, role-
based access plus Guards is sufficient); admin-account 2FA email CC mechanism (dropped, superseded
by ADR-057's individual-account model, ADR-076); cross-tenant Super Admin management (skeleton
control panel's scope, ADR-057); payroll CSV export (wanted, deferred past MVP, ADR-078).

**Dependencies**: none inbound; every other module depends on this module's permission read model
(see `1-module.md` §11).

---

# 3. Feature Specifications

## FR-001 Authenticate

### Description
Login via username/password (Username is the login identifier, kept distinct from Email — developer
decision, `4-schema.md`), with 2FA (per-role, Admin-configurable — ADR-075), IP-restriction
(non-admin, org-setting-gated), and barcode-login fallback.

### Trigger
User submits the login form, or a barcode scan at a timeclock station.

### Preconditions
None — login is the one public, pre-authentication route (`4-ui/1-navigation.md` §19).

### Main Flow
Credential check → 2FA sub-state if the user's Role has `required=true` in
`role_two_factor_requirements` (Admin-configurable per role, ADR-075 — not a hardcoded allowlist;
Super Admin accounts go through the same configurable system, no special always-on exception) → IP-
restriction check for non-admins → Account Status check (must not be Inactive) → session established
→ land on default page.

### Alternate Flow
Already-authenticated session → redirect straight to default page (preserves USR-RULE-034).
Barcode-based login → username resolution tries barcode match first, then literal username.

### Exception Flow
Any failure → generic error message (deliberate anti-enumeration posture, preserves USR-RULE-030,
except the IP-restriction path). 5 failed attempts → 15-minute account lockout, real DB-backed
tracking, auto-unlock (ADR-155).

### Post Conditions
Session established; permission read model resolved for the authenticated user; login history
entry recorded.

---

## FR-002 Manage Users

### Description
Create/edit/delete a User; CSV import; mass-update.

### Trigger
Admin action from the User List/Detail screens, or a CSV import wizard submission.

### Preconditions
Acting user has the Admin role (ADR-002) — see `7-permissions.md`. The legacy system's own admin
screens are not gated through its own permission system at all — this new design closes that by
enforcing the Admin-role check as a domain invariant (ADR-006's standing Guard principle) on every
one of these commands.

### Main Flow
Create: header fields (incl. Username, Email — both unique) + Role/Group assignment + preference
defaults → duplicate-username/email check (real domain invariant + DB constraint, ADR-157) → save →
permission read model updated for the new user. Edit: same fields, pre-populated → save → if
Role/Profile changed, permission read model invalidated for that user immediately (closes the legacy
session-caching staleness, USR-RISK-015) → **one consolidated save path** — no duplicate Profile-row
construction when the edit reaches Role/Profile via this endpoint (ADR-134). Delete: **transfer-
target selection required before the delete fires** → id validated non-empty/exists at the domain
layer (ADR-154) → cascade per `4-schema.md` §8.

### Alternate Flow
CSV Import: upload → column-mapping → validation (barcode/username/role-name/is_admin-format checks,
preserves USR-RULE-064/065) → create/update. Password validation applies uniformly to the import
path too (ADR-155 — no import-specific carve-out).

### Exception Flow
Duplicate username/email → rejected with a specific error. Attempted self-demotion of the
organization's last remaining Admin → rejected (ADR-157).

### Post Conditions
User record persisted; permission read model current; audit columns (`created_by`/`updated_by`,
ADR-005) populated.

---

## FR-003 Manage Roles

### Description
Create/edit/delete/reparent a Role — hierarchical (parent/child + depth), seeded from ADR-002's 5
tenant-facing roles.

### Trigger
Admin action from Role administration views.

### Preconditions
Admin role. Deleting a role requires a valid transfer-target role for its members and any child
Roles.

### Main Flow
Create/Edit: name + description + parent Role (optional). Delete: transfer-target selection → id
validated non-empty/exists (ADR-154, closes USR-RISK-001) → member Users and any child Roles
reassigned → Role-Profile/Group-membership references updated → Role deleted.

### Alternate Flow
Reparent: drag-and-drop interaction in the Role hierarchy tree picker → `depth` recomputed
server-side for the moved Role and all its descendants.

### Exception Flow
Empty/malformed role id on delete → rejected before any query construction — the module's single
highest-stakes fix (ADR-154).

### Post Conditions
Role catalog updated; every affected User's permission read model reflects the change on their very
next request.

---

## FR-004 Manage Groups

### Description
Create/edit/delete a Group — a named assignment/roster target (e.g. bulk notification recipients),
**not** a record-visibility mechanism (ADR-081 dropped sharing rules entirely, so Group has no
sharing-actor role).

### Trigger / Preconditions
Admin action; Admin role required.

### Main Flow
Create/Edit: name + description + member picker (Users, Roles, Roles-and-Subordinates). Delete:
transfer-target selection → id validated → membership rows removed.

### Exception Flow
Empty/malformed group id on delete → rejected (same pattern as Role/User/Profile, ADR-154's
principle applied consistently).

### Post Conditions
Group membership current.

---

## FR-005 Manage Profiles & Permissions

### Description
Create/edit a Profile (bundle of module/field/action permissions) and assign it to Roles.

### Trigger / Preconditions
Admin action; Admin role required.

### Main Flow
Create: baseline copied from an explicit, named default-profile template → every permission
explicitly set, denied unless explicitly granted (ADR-156, closes USR-RISK-013's fail-open default)
→ save via the one consolidated Role-edit save path (ADR-134 — no orphaned duplicate Profile row
left behind, closing the legacy `SaveRole.php`/`UpdateProfileChanges.php` defect, SET-RISK-002).

### Exception Flow
Delete Profile with empty/malformed id → rejected (ADR-154's principle).

### Post Conditions
Every Role bound to this Profile reflects the new permission set on next request.

---

## FR-006 Configure Per-Role 2FA Requirement

### Description
Admin toggles whether a given Role requires 2FA at login (ADR-075) — replaces what was drafted in
this document's v1.0 as "Manage Sharing Rules," a feature ADR-081 already decided not to build.

### Trigger / Preconditions
Admin action; Admin role required.

### Main Flow
Toggle `required` on `role_two_factor_requirements` for the Role → if turning on, Email becomes a
required field for every User holding that Role (ADR-075's conditional-required-field rule — closes
the legacy system's silent 2FA dead-end for users with no email on file) → save.

### Exception Flow
Attempting to enable 2FA for a Role whose members include a User with no Email on file → the save
surfaces which Users are missing Email, doesn't silently succeed and leave them locked out at their
next login.

### Post Conditions
2FA gate takes effect for every affected User on their next login attempt.

---

## FR-007 Change Password

### Description
Self-service and admin-reset password change, collapsed into **one** command (closes the legacy
system's two divergent, differently-argument-ordered password-change paths, USR-RULE-009/010).

### Trigger
Change Password action (self-service or admin-initiated reset).

### Preconditions
Old-password match required for self-service (not for admin-reset or CSV import).

### Main Flow
New password validated server-side — min 8 characters, 1 uppercase, 1 lowercase, 1 number (ADR-155,
no special-character requirement) — at **every** call site, no toggle to disable → old password
re-verified (self-service only) → hash updated (bcrypt, ADR-014).

### Exception Flow
Weak password → rejected with a specific message at every entry point (interactive, import, admin-
reset) — uniform rejection, no import-specific carve-out.

### Post Conditions
Password hash updated.

---

## FR-008 Time Clock

### Description
Clock in/out, optional task annotation (`labor_status`: Working/Break/Lunch, ADR-077), admin/manager
override.

Full state machine: `3-business-rules.md` §6.

### Main Flow
Clock in → (optional) task annotation with `labor_status` → clock out (client action, auto-close
safety net, or admin override).

### Exception Flow
Auto-close command's only valid input is a domain-resolved (user, record) pair — structurally
prevents the legacy wrong-id-space substitution bug (closes USR-RISK-011).

### Post Conditions
Time Clock Record closed with both timestamps populated, or explicitly surfaced as an "unclosed
punch" requiring manager resolution if still open when its pay period closes (ADR-037 — never
silently excluded).

---

## FR-009 Payroll Reporting

### Description
Date-range-scoped, multi-user report with per-hours-type columns and one authoritative overtime
column. **CSV/ZIP export is wanted but explicitly deferred past MVP (ADR-078)** — not built in this
module's initial scope; the report itself (on-screen) is in scope.

### Main Flow
Date range + report-type selection → hours computed fresh at view time (never cached) via **one**
shared elapsed-time calculator and the standard US overtime formula — 1.5x pay for hours beyond 40
in a work week (ADR-036, flat and simple, not tenant-configurable).

### Exception Flow
A report covering an unresolved open/unclosed punch is flagged provisional/incomplete — never
silently computed as if the hours didn't exist (ADR-037).

### Post Conditions
Report reflects current data, always recomputed, never cached. Export: post-MVP (ADR-078).

---

## FR-010 Personal Days & Holidays

### Description
Submit a personal-day/time-off entry; admin manages the org holiday catalog and per-user holiday
assignments.

### Main Flow
Submission → **bridged into the payroll pipeline** via a corresponding time-clock record with the
appropriate hours-type classification (closes the legacy system's confirmed disconnect between the
two).

### Post Conditions
Personal-day entry recorded with a correctly-typed user reference (closes the legacy `varchar(2)`
truncation bug, USR-RISK-004).

---

## FR-011 Login History

### Description
Read-only audit trail of login/logout events.

### Main Flow
Recorded automatically on every login/logout — no user-facing create/edit/delete actions.

### Post Conditions
N/A — append-only.

---

## FR-012 Self-Service Preferences

### Description
Mail account configuration, notification toggles.

### Main Flow
Any authenticated user manages their own mail account/notification settings; no admin gate.

### Post Conditions
Preferences persisted per-user.

---

## FR-013 QuickBooks Employee Sync

### Description
Keeps QuickBooks' own employee list current with this module's User data — **revived**, not
excluded (ADR-074, reversing the legacy system's confirmed-dead, every-enqueue-call-commented-out
state).

### Trigger
User create/update (real-time enqueue) or the sync job's own schedule.

### Main Flow
User save → sync job enqueued (BullMQ, async per ADR-031's standing non-blocking-external-
integration principle) → QuickBooks list-id/edit-sequence pointer updated on success.

### Post Conditions
`quickbooks_sync_pointers` row current for the synced User.

---

# 4. Business Process Flow

See `1-module.md` §9 for the login/RBAC-resolution flow and the Time Clock state diagram reference.

---

# 5. System Behavior

**Create/Update/Delete**: see FR-002/003/004/005 above — every delete requires transfer-target
selection + non-empty/valid id, one shared pattern (ADR-154), not per-entity patches.

**Search**: User List supports role/location/text-search filtering.

**Import**: CSV Import wizard (FR-002 Alternate Flow).

**Export**: generic ListView export (User records). Payroll/Time-Card CSV export: deferred past MVP
(ADR-078) — not built in this scope.

**Notifications**: 2FA verification-code email, sent only to the account holder's own email — no CC/
broadcast path (ADR-076).

**Background Jobs**: auto-clock-out safety net; permission read-model invalidation (real-time);
QuickBooks employee-sync (async, ADR-074).

---

# 6. Data Processing

**Inputs**: user-entered form fields (see `5-data-dictionary.md`), CSV import rows, time-clock punch
events.

**Transformations**: password hashing (bcrypt); elapsed-time/overtime computation
(`3-business-rules.md` §5, ADR-036).

**Outputs**: on-screen payroll report, User ListView export, barcode label
(see `8-api.md` §9 Events / `9-ui.md`).

---

# 7. Integrations

**External APIs**: QuickBooks employee sync — **revived** (ADR-074), async via BullMQ.

**Queues**: BullMQ for background auto-clock-out, permission-invalidation propagation, and
QuickBooks sync.

**Email**: 2FA verification-code delivery only, to the account holder's own email (ADR-076).

**Third-party services**: cloud-print service for barcode labels (optional delivery channel).

**Note on legacy-misplaced files**: four files physically inside the legacy `modules/Users/`
directory operate on Leads/Calendar data entirely — **not modeled as part of this module's bounded
context at all**; they belong to whichever module actually owns that data.

---

# 8. Error Handling

**Validation errors**: specific, field-level messages (`6-validation.md`) — never a generic
"Invalid input."

**Business errors**: duplicate username/email, weak password, invalid/empty delete-target id,
attempted last-admin self-demotion, 2FA-required Role with a memberless-of-Email User — each with a
specific message tied to the blocking rule.

**System errors**: standard project-wide friendly-message pattern — no raw stack trace/error code
exposed.

**Recovery**: failed CSV import rows are excluded individually with a per-row reason, not an
all-or-nothing batch failure.

---

# 9. Performance Requirements

Permission checks resolve from a live read model per request — no unconditional full-cache
regeneration on every save. No specific max-response-time/concurrency figure confirmed by any SoT
source for this module — inherits project-wide API performance guidelines (`3-api/`).

---

# 10. Security Requirements

**Authentication**: JWT access+refresh (`3-api/2-authentication.md`), bcrypt password hashing
(ADR-014), server-side password complexity (ADR-155), DB-backed session-independent lockout
(ADR-155).

**Authorization**: role→profile→module/field/action permission chain, resolved fresh per request
(closes USR-RISK-015 staleness); Admin bypass is real and intentional; Super Admin bypass is a
structurally separate axis (ADR-057). No sharing-rule layer (ADR-081).

**Audit**: every user's activity logged, Super Admin included (ADR-057) — no unaudited backdoor CC
mechanism (ADR-076).

**Encryption**: bcrypt for passwords; standard TLS in transit.

---

# 11. Edge Cases

**Duplicate data**: duplicate username/email → rejected as a real domain invariant + DB constraint
(ADR-157).

**Timeouts**: N/A — no long-running synchronous operation in this module now that Sharing Rules
(and their `RecalculateSharingRules` batch job) don't exist (ADR-081).

**Network failure**: standard project-wide retry/error-messaging pattern.

**Concurrent updates**: two admin/manager time-card override screens editing the same punch — the
standard project-wide concurrent-edit lock (ADR-079/080/084): opening a punch for override locks it
(Redis TTL, heartbeat-renewed, instant release on clean close); a second manager attempting to open
the same punch gets a detailed "currently being edited by X" message, not a silent overwrite.
Resolved with the developer — this module applies the standing principle like every other module,
not a module-specific answer.

**Large data**: User List/CSV import at scale — standard pagination/per-row-result handling
(FR-002).

---

# 12. Assumptions

See `1-module.md` §14 for the module-level decisions (Role hierarchy kept, 2FA Admin-configurable
per role, Username field, permission-based User-list visibility — all developer-confirmed, and all
independently matching pre-existing ADR-075/etc. this document's v1.0 hadn't checked for).
Concurrent time-card-override edits (§11) resolved — standard project-wide lock (ADR-079/080/084),
no remaining open items in this document.

---

# 13. Constraints

See `1-module.md` §15 (database-per-tenant, validation stack, bcrypt).

---

# 14. Traceability

| Requirement | Feature |
|---|---|
| FR-001 | Authenticate |
| FR-002 | Manage Users |
| FR-003 | Manage Roles |
| FR-004 | Manage Groups |
| FR-005 | Manage Profiles & Permissions |
| FR-006 | Configure Per-Role 2FA Requirement |
| FR-007 | Change Password |
| FR-008 | Time Clock |
| FR-009 | Payroll Reporting |
| FR-010 | Personal Days & Holidays |
| FR-011 | Login History |
| FR-012 | Self-Service Preferences |
| FR-013 | QuickBooks Employee Sync |

---

# 15. Related Documents

Module (`1-module.md`) · Schema (`4-schema.md`) · Validation (`6-validation.md`) · API (`8-api.md`)
· UI (`9-ui.md`) · Permissions (`7-permissions.md`) · Testing (`11-testing.md`).

---

# Revision History

| Date | Change |
|---|---|
| 2026-08-18 | Initial draft (v1.0). |
| 2026-08-18 | v1.1 — review pass corrected 7 conflicts with pre-existing locked ADRs v1.0 never checked: FR-006 "Manage Sharing Rules" replaced with "Configure Per-Role 2FA Requirement" (ADR-081 drops sharing rules entirely); FR-009 CSV export marked deferred-past-MVP (ADR-078); FR-013 QuickBooks added as revived, not excluded (ADR-074); concrete password/lockout/overtime policies cited (ADR-155/036) instead of "pending SME sign-off"; unclosed-punch handling cited to ADR-037; role-edit consolidation added to FR-002/005 (ADR-134); RecalculateSharingRules removed from Edge Cases (the job doesn't exist without Sharing Rules). |
| 2026-08-18 | v1.2 — resolved the last open assumption: time-card-override concurrency. Should have applied ADR-084's standing project-wide concurrent-edit-lock principle by default instead of guessing last-write-wins; developer confirmed the real-lock answer, which is what the standing principle already required. §11/§12 updated, no open items remain in this document. |

---

# AI Generation Notes

v1.1 corrects the same class of error found across every document in this module's draft set — see
`1-module.md`'s Revision History for the full list of the 14 pre-existing ADRs v1.0 failed to check
before drafting.
