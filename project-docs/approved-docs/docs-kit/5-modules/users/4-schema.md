# Schema — Users

# Document Information

| Field | Value |
|---|---|
| Module | Users |
| Version | 1.1 |
| Status | Draft |
| Database | PostgreSQL |
| Author | Developer (AI-assisted) |
| Last Updated | 2026-08-18 |

---

# 1. Overview

**Purpose**: define this module's PostgreSQL schema (via Prisma). **High-level entities**: User (+
three 1:1 child tables replacing legacy's ~120-column wide table), Role (hierarchical), Profile (+ 3
permission child tables), Group, Time Clock, Personal Day/Holiday, Login History, Mail Account,
Notification Scheduler, Word Template. **No Sharing Rule entity** — see below (ADR-081).

**Design principles** (adopts `entities-and-fields.md`'s Recommended rewrite schema as a starting
point where it doesn't conflict with an already-locked project decision — several overrides below
are **not** this session's own call, they're pre-existing ADRs the earlier drafting pass failed to
check before writing v1.0 of this document):

- **No EAV / no `tenant_id`**: every field lives as an explicit typed column (closes legacy's
  Studio-dynamic-field pattern, R1); isolation is physical (database-per-tenant, ADR-056) — this
  overrides the source blueprint's own R7 recommendation, since ADR-073 supersedes that for the
  whole project, not just this module.
- **`User` extends, doesn't replace, the bootstrap shape** already in `prisma/schema.prisma`
  (`id`, `email`, `password_hash`, `role`, `is_super_admin`, audit columns, ADR-005/185) — this
  schema adds the columns/child tables below to that existing model, not a parallel one. The
  bootstrap `role` column (currently a free string) becomes a real FK to the new `Role` table.
- **User-Role collapses to a single nullable `role_id` FK** (R2 — legacy schema permits multiple
  rows, UI/business model treats it as 1:1).
- **No `SharingRule` entity at all — dropped project-wide, per ADR-081.** The blueprint's own R3
  recommendation (unify 9 legacy sharing tables into one polymorphic table) is **not** followed —
  ADR-081 already decided the whole sharing-rule/precedence mechanism is dropped entirely, not
  rebuilt in any unified form: "Legacy's CRM-style sharing-rule/precedence engine ... was confirmed
  'validation-free by a full-file keyword grep' ... never actually enforced correctly. No other
  module's blueprint flagged a genuine business need for it either." Role-based access (ADR-002)
  plus server-side Guards (ADR-006) is sufficient, confirmed via ADR-081's own worked scenario. This
  correction was caught during this document's own review pass — v1.0 of this schema built the
  unified Sharing Rule table anyway, not having checked decisions-log.md first.
- **Group Membership unifies from 2 legacy tables into one**, with a `member_type` enum instead of
  two physically separate tables (R4) — Group remains, only as an assignment target (`4-ui/1-
  navigation.md`-style grouping), not a sharing-rule actor, now that sharing rules don't exist.
- **The legacy hierarchical Role tree (parent/depth) is kept** — developer-confirmed — Role keeps
  `parent_role_id`/`depth`, seeded with ADR-002's 5 tenant-facing roles as an initial flat layer,
  reparentable via the same drag-and-drop interaction the legacy system had.
- **A separate `username` column is added** to `users` (developer-confirmed) — distinct from
  `email`, unique, used for login instead of email.
- **2FA requirement is per-role, Admin-configurable** — a `role_two_factor_requirements` join table
  (`role_id`, `required` boolean), not a hardcoded allowlist. **Matches ADR-075 exactly** (this was
  independently re-derived with the developer before this review pass found the pre-existing ADR —
  no conflict, just should have been cited from the start).
- **Time Clock's `hours_type` includes a `labor_status` companion enum on the task-annotation side**:
  `working` / `break` (paid) / `lunch` (unpaid) — **per ADR-077**, not an open question (v1.0 of this
  document incorrectly left this unresolved).
- **Every FK is a real, enforced constraint** — `RESTRICT` on delete while dependent rows exist for
  Role/Profile/Group, `CASCADE` for purely-dependent child rows (permission rows, group memberships)
  — closes the exact missing-constraint-plus-missing-validation combination that caused the
  `deleteRole()` incident (**ADR-154**, resolves USR-RISK-001).
- **Dead columns dropped entirely**: the 6 orphaned QuickBooks GL-mapping columns' *legacy* shape is
  not carried forward as-is, but the sync itself is **revived, not excluded** — see `2-functional-
  specification.md` §7 and **ADR-074**. `deliverystatus` (confirmed dead, no write site) and
  `vtiger_mail_accounts1` (byte-for-byte duplicate table, zero confirmed readers/writers) are
  dropped.
- **`Sales Accounts` JSON blob → `UserAssignedAccount` junction table**; **`Home Page Widget Order`
  serialized list → `UserHomeWidget` child table** — both per the source blueprint's own recommended
  fix.
- **`Personal Day.user_id` typed as a required FK** — closes the legacy `varchar(2)` truncation
  corruption bug (USR-RISK-004).
- **Time Clock's `clock_out` is `NULL`, never a sentinel timestamp**, when open — an open-punch
  exclusion is a natural predicate, not a repeated defensive guard clause. Handling of a punch that
  stays open past pay-period close is an explicit, visible "unclosed punch" state requiring manager
  resolution — **per ADR-037**, not silent exclusion.
- **Overtime is standard US 1.5x over 40 hours/week — per ADR-036.** No rolling-week-bucket
  configurability, no tenant-configurable threshold — flat and simple, not the "provisionally
  recommended, pending SME sign-off" framing v1.0 of this document used (that framing was this
  session's own invention before checking decisions-log; ADR-036 already settled it, flagged only
  for HR/payroll sign-off if LBM's actual jurisdiction needs a different rule, not a design-level
  open question).

---

# 2. Entity Relationship Diagram

```
User ──1:1── UserHrProfile
User ──1:1── UserPreference
User ──1:N── UserNotificationPreference
User ──N:1── Role ──N:M── Profile (via RoleProfile)
Role ──self-referencing── Role (parent_role_id, hierarchy kept)
Role ──1:1── RoleTwoFactorRequirement
User ──N:M── Group (via GroupMembership, member_type=USER)
Role ──N:M── Group (via GroupMembership, member_type=ROLE / ROLE_AND_SUBORDINATES)
Profile ──1:N── ProfileFieldPermission / ProfileModuleActionPermission / ProfileModuleAccess
User ──1:N── TimeClockRecord ──1:N── ClockInTaskDetail (labor_status enum, ADR-077)
User ──1:N── ClockInTaskCatalogEntry
User ──1:N── PersonalDay
User ──N:M── Holiday (via HolidayAssignment)
User ──1:N── LoginHistory (by username, denormalized per legacy — see Known Gaps)
User ──1:N── MailAccount
User ──1:N── UserAssignedAccount / UserHomeWidget
User ──1:N── QuickBooksSyncPointer (revived integration, ADR-074)
NotificationScheduler, WordTemplate — standalone, no FK to User

(No SharingRule entity — dropped project-wide, ADR-081. Group exists only as an assignment
 target/roster, not a record-visibility mechanism.)
```

---

# 3. Entities

## User

**Purpose**: the login/employee identity record. **Relationships**: 1:1 `UserHrProfile`/
`UserPreference`, 1:N `UserNotificationPreference`/`TimeClockRecord`/`PersonalDay`/`MailAccount`,
N:1 `Role`, N:M `Group`/`Holiday`.

## UserHrProfile

**Purpose**: HR-adjacent fields split out of the legacy ~120-column User Header (salary, insurance,
personal/sick day allotments, license/SSN). **Relationships**: 1:1 owned by `User`.

## UserPreference

**Purpose**: UI/calendar/POS/print display preferences split out of the same wide legacy table.
**Relationships**: 1:1 owned by `User`.

## UserNotificationPreference

**Purpose**: replaces ~15 granular boolean notification-toggle columns with one row-per-type table.
**Relationships**: N:1 `User`.

## Role

**Purpose**: a named business role, hierarchical (parent/child + depth, kept from the legacy
design per developer decision), seeded with ADR-002's 5 tenant-facing roles (Counter/Sales Staff,
Warehouse/Fulfillment Staff, Accounting/Management, Purchasing Staff, Admin — B2B Customer excluded
from this application's own navigation per nav doc §10, tracked for API/authorization purposes
only). Access control is role-based only — no separate sharing-rule layer (ADR-081).
**Relationships**: 1:N `User`, N:M `Profile` (via `RoleProfile`), N:M `Group`, self-referencing
parent/child, 1:1 `RoleTwoFactorRequirement`.

## Profile

**Purpose**: a named bundle of module/field/action permissions. **Relationships**: N:M `Role`, 1:N
`ProfileFieldPermission`/`ProfileModuleActionPermission`/`ProfileModuleAccess`.

## Group

**Purpose**: a named collection of Users/Roles — an assignment/roster target only (e.g. bulk
notification recipients), **not** a record-visibility mechanism now that sharing rules are dropped
(ADR-081). **Relationships**: N:M `User`/`Role` (via `GroupMembership`), self-referencing nesting.

## TimeClockRecord

**Purpose**: a single clock-in/out punch, the module's one real DB-enum-backed state machine.
**Relationships**: N:1 `User`, 1:N `ClockInTaskDetail`.

## ClockInTaskDetail

**Purpose**: a "what are you working on" annotation on a clock-in session, with a `labor_status`
enum (`working`/`break`/`lunch`, ADR-077). **Relationships**: N:1 `TimeClockRecord`, `User`.

## PersonalDay

**Purpose**: a scheduled personal/vacation/sick/time-off entry. **Relationships**: N:1 `User`.

## Holiday / HolidayAssignment

**Purpose**: system-wide holiday catalog + per-user observed-date assignment. **Relationships**: N:M
via `HolidayAssignment`.

## LoginHistory

**Purpose**: append-only login/logout audit trail. **Relationships**: none enforced (legacy matches
by username string, not FK — preserved as a documented gap, see Known Gaps below).

## MailAccount / NotificationScheduler / WordTemplate

**Purpose**: self-contained personal-productivity features carried forward as-is. **Relationships**:
`MailAccount` N:1 `User`; `NotificationScheduler`/`WordTemplate` standalone.

## QuickBooksSyncPointer

**Purpose**: employee-sync tracking (list-id/edit-sequence pair) for the **revived** QuickBooks
integration (ADR-074 — not excluded, as v1.0 of this document incorrectly stated). **Relationships**:
1:1 `User`.

---

# 4. Table Definitions

Full field-by-field detail lives in `5-data-dictionary.md` and the field-extraction catalog — this
section gives structural columns only.

## users (extends existing table)

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | No | `gen_random_uuid()` |
| email | varchar | No | — |
| username | varchar | No | — |
| password_hash | varchar | No | — |
| role_id | uuid (FK → roles.id) | Yes | NULL |
| is_super_admin | boolean | No | false |
| first_name | varchar | No | — |
| last_name | varchar | Yes | NULL |
| status | enum(`active`,`inactive`) | No | `active` |
| default_location_id | uuid (FK → locations.id, Location module) | Yes | NULL |
| *(+ ~30 more contact/address/barcode columns, see `5-data-dictionary.md`)* | | | |
| created_at / updated_at / created_by / updated_by / is_deleted / deleted_at | per ADR-005 | — | — |

**Primary Key**: `id`. **Foreign Keys**: `role_id → roles.id` (`ON DELETE RESTRICT`),
`default_location_id → locations.id`. **Indexes**: unique on `email`; unique on `username`.
**Constraints**: `email` and `username` both unique (real domain invariant — legacy only checked
username via ADR-157's guard, this design closes the gap for email too).

## user_hr_profiles / user_preferences

1:1 child tables, `user_id` PK+FK (`ON DELETE CASCADE`) — full column list in
`5-data-dictionary.md`.

## user_notification_preferences

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | No | `gen_random_uuid()` |
| user_id | uuid (FK → users.id) | No | — |
| notification_type | varchar | No | — |
| enabled | boolean | No | false |

**Primary Key**: `id`. **Constraints**: unique on `(user_id, notification_type)`.

## roles

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | No | `gen_random_uuid()` |
| name | varchar | No | — |
| description | text | Yes | NULL |
| parent_role_id | uuid (FK → roles.id, self) | Yes | NULL |
| depth | integer | No | 0 |

**Primary Key**: `id`. **Foreign Keys**: `parent_role_id → roles.id` (`ON DELETE RESTRICT`).
**Constraints**: unique on `name`. `depth` recomputed server-side on reparenting.

## role_two_factor_requirements

| Column | Type | Nullable | Default |
|---|---|---|---|
| role_id | uuid (FK → roles.id, PK) | No | — |
| required | boolean | No | false |

**Primary Key**: `role_id`. Admin-configurable per role (ADR-075) — replaces the legacy hardcoded
allowlist. `users.email` becomes required (not-null enforced at the application layer) for any user
whose Role has `required=true` here, per ADR-075's conditional-required-field rule.

## profiles / role_profiles

`profiles`: `id`, `name` (unique), `description`. `role_profiles`: `role_id`, `profile_id`
composite PK, both FK `ON DELETE CASCADE`. **One consolidated save path for Profile edits reached
via a Role** — no duplicate Profile-row construction on edit, per ADR-134 (closes the legacy
`SaveRole.php`/`UpdateProfileChanges.php` orphaned-row defect, SET-RISK-002).

## profile_field_permissions / profile_module_action_permissions / profile_module_access

Each: `profile_id` FK `ON DELETE CASCADE`, module/field/action reference, `visible`/`read_only`/
`permission` boolean — every permission explicitly set on create, no fail-open default (ADR-156,
closes USR-RISK-013).

## groups / group_memberships

`groups`: `id`, `name` (unique), `description`. `group_memberships`: `id`, `group_id` FK `ON DELETE
CASCADE`, `member_type` enum(`USER`,`ROLE`,`ROLE_AND_SUBORDINATES`), `member_id` (polymorphic
reference, application-validated against the type). Assignment/roster use only (ADR-081) — never
consulted for record-visibility decisions.

## time_clock_records

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | No | `gen_random_uuid()` |
| user_id | uuid (FK → users.id) | No | — |
| clock_in | timestamptz | No | — |
| clock_out | timestamptz | **Yes — NULL when open, never a sentinel** | NULL |
| punch_date | date | No | — |
| status | enum(`clock_in`,`clock_out`,`unclosed_needs_resolution`) | No | — |
| hours_type | enum(`regular`,`holiday`,`personal`,`sick`,`vacation`) | No | `regular` |
| help_message | text | Yes | NULL |

**Primary Key**: `id`. **Foreign Keys**: `user_id → users.id`. **Indexes**: `(user_id, punch_date)`.
`unclosed_needs_resolution` status: a punch still open when its pay period closes surfaces here as
an explicit, visible exception requiring manager action (ADR-037) — never silently excluded from a
payroll total.

## clock_in_task_details

Adds `labor_status` enum(`working`,`break`,`lunch`) — **ADR-077**, not an open question. Remaining
columns per `5-data-dictionary.md`.

## personal_days

`user_id` **real FK** (`ON DELETE RESTRICT`) — closes USR-RISK-004's `varchar(2)` corruption;
remaining columns per `5-data-dictionary.md`.

## login_history

`username` (text, **not a FK** — legacy matches by string; preserved deliberately, see Known Gaps),
`login_time`, `logout_time`, `status`, `session_id`, `user_ip`.

## quickbooks_sync_pointers

`user_id` FK (`ON DELETE CASCADE`), `qb_list_id`, `qb_edit_sequence` — supports the **revived**
QuickBooks employee sync (ADR-074), replacing the legacy's 6 orphaned GL-mapping columns with a
minimal, purpose-built pointer table.

---

# 5. Relationships

**One-to-One**: `User ↔ UserHrProfile`, `User ↔ UserPreference`, `User ↔ QuickBooksSyncPointer`,
`Role ↔ RoleTwoFactorRequirement`.
**One-to-Many**: `Role → User`, `User → TimeClockRecord/PersonalDay/MailAccount/
UserNotificationPreference`, `TimeClockRecord → ClockInTaskDetail`, `Role → Role` (self, hierarchy).
**Many-to-Many**: `Role ↔ Profile` (via `RoleProfile`), `User ↔ Group` and `Role ↔ Group` (via
`GroupMembership`), `User ↔ Holiday` (via `HolidayAssignment`).

---

# 6. Constraints

- Primary keys: `uuid`, `gen_random_uuid()` default (ADR-005 convention).
- Foreign keys: `RESTRICT` on delete for Role/Profile/Group referenced by dependent business rows;
  `CASCADE` for purely-owned child rows (permission rows, group memberships, HR/preference 1:1
  children).
- Unique constraints: `users.email`, `users.username`, `roles.name`, `profiles.name`, `groups.name`,
  `(user_notification_preferences.user_id, notification_type)`.
- Check constraints: none beyond enum-backed columns.

---

# 7. Index Strategy

`time_clock_records(user_id, punch_date)` for payroll-range queries; `personal_days(user_id)`;
`login_history(username, login_time)`. Unique indexes per §6.

---

# 8. Cascading Rules

**ON DELETE**: `CASCADE` for 1:1/owned-child tables and permission/membership rows; `RESTRICT` for
`Role`/`Profile`/`Group` referenced by still-existing dependents — a delete must go through the
application-layer transfer-target flow (`3-business-rules.md` BR-001, ADR-154) before the DB row can
be removed.

**ON UPDATE**: standard `CASCADE` for all FKs.

---

# 9. Data Integrity

**Referential integrity**: every FK enforced at the DB layer (ADR-154's structural fix).
**Consistency**: permission read model recomputed from live tables per request, not a regenerated
file cache. **Normalization**: the wide legacy `User` header is split into 3 tables plus a proper
notification-preference child table.

---

# 10. Migration Notes

**Versioning**: standard Prisma migration history, shared across skeleton and every tenant database
(ADR-056). **Backward compatibility**: N/A — from-scratch schema. **Legacy data migration** (if ever
performed): the `personal_days.user_id` `varchar(2)` corruption (USR-RISK-004) requires a
backfill/flagging pass, per `10-implementation-plan.md`'s test-strategy pointer.

---

# 11. Related Documents

Data Dictionary (`5-data-dictionary.md`) · Validation (`6-validation.md`) · Business Rules
(`3-business-rules.md`) · API (`8-api.md`).

---

# Revision History

| Date | Change |
|---|---|
| 2026-08-18 | Initial draft (v1.0). |
| 2026-08-18 | v1.1 — review pass caught 7 conflicts with pre-existing, already-locked ADRs the initial draft never checked: removed the Sharing Rule engine entirely (ADR-081), revived QuickBooks instead of excluding it (ADR-074), added the Labor Status enum (ADR-077), locked overtime to flat US 1.5x/40hr (ADR-036), added the unclosed-punch resolution state (ADR-037), cited ADR-154/155/156/157 explicitly instead of independently re-deriving the same fixes, added the Role-edit consolidation note (ADR-134). |

# Approval

| Role | Name | Status | Date |
|---|---|---|---|
| Developer | Parimal Chaudhari | Pending | |

# AI Generation Notes

v1.1 corrects a real process failure in v1.0: this document was drafted without first checking
`decisions-log.md` for module-specific ADRs already covering Users (14 exist — ADR-036/037/057/074–
078/081/134/154–157/185), several of which directly contradict what v1.0 independently invented
(Sharing Rules, QuickBooks-excluded, overtime-formula-pending-signoff). Every other document in this
module's draft set has the same class of correction applied — see each document's own Revision
History.
