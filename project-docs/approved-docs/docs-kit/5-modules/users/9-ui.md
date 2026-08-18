# UI Specification — Users

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
| 2026-08-18 | v1.1 — review pass: removed the Sharing Rule administration screen entirely (ADR-081); removed payroll/time-card CSV export actions (ADR-078, deferred past MVP); added QuickBooks sync status screen (ADR-074). |
| 2026-08-18 | v1.2 — last open item resolved: mobile permission-grid behavior changed from an assumed accordion to a module-list + `Sheet` drill-in (reuses the T-018 Sheet primitive, matches current dashboard-product convention for settings drill-in). No open assumptions remain in this document. |

---

# 1. Overview

**Purpose**: define this module's screens per the project-wide design system
(`4-ui/3-design-system.md`, `4-ui/4-component-standards.md`). **Scope**: 22 screens across 5
functional clusters (login/session, user administration, self-service, time-clock/payroll,
settings/utility). **Target users**: every authenticated user (self-service, time clock); Admin
(administration screens); Accounting/Management (payroll). **References**:
`4-ui/1-navigation.md` §6 (Users' nav sub-structure), `4-ui/5-form-standards.md`.

---

# 2. Screen Inventory

| Screen | Purpose |
|---|---|
| Login | Public, pre-authentication; barcode-login and 2FA sub-states |
| User List | Admin-only, filterable/sortable/paginated grid |
| User Detail | Read-only header + audit trail |
| User Create/Edit | Full form: header, password, role/group, preferences |
| Change Password | Modal, self-service or admin-reset |
| Role administration | Hierarchy tree picker (expand/collapse/select), drag-and-drop reparenting (recomputes `depth`), Create/Edit form, per-role 2FA-requirement toggle |
| Profile List/Create/Edit | Permission-grid administration |
| Group List/Create/Edit | Member picker (Users/Roles/Roles-and-Subordinates) |
| Delete confirmation (User/Role/Profile/Group) | Transfer-target-required popup step |
| 2FA verification-code entry | Login-flow sub-state |
| Time Clock widget | Clock-in/out button or barcode scan, task annotation |
| Time-Card override | Admin/manager correction screen |
| Personal Day / Time Off submission | Two form shapes (day-count vs. start/end time) |
| Payroll Report | Date-range, on-screen only — CSV/ZIP export deferred past MVP (ADR-078) |
| QuickBooks sync status | Per-user sync status (revived integration, ADR-074) |
| Personal-Days listing | Admin-filterable |
| Barcode Label print | Label-layout parameters |
| Mail Account administration | Self-service, own account only |
| CSV Import wizard | Admin-only, 3-step |
| Mass Update | Admin-only, field/value picker |

---

# 3. Navigation

**Entry points**: sidebar "Users" item (Admin-visible per `4-ui/1-navigation.md` §10 matrix) →
List → Create/Detail/Edit → Roles & Permissions → Role Detail (per `4-ui/1-navigation.md` §6's
already-locked sub-structure). Self-service screens (own password, Time Clock, Personal Day) are
reachable from the top-bar user menu, not the Users sidebar item, since they're available to every
role. **Breadcrumb**: `Users > [Detail/Edit/Roles & Permissions]` per `Breadcrumb.tsx` (T-015,
already built — matches its first-segment-to-nav-item-label convention).

---

# 4. Screen Specifications

## User List

**Purpose**: browse/manage users. **Layout**: standard List Page pattern (`4-ui/3-design-system.md`
§6) — page header + search/filter bar + data table + pagination. **Displayed columns**: Name, Email,
Role, Status, Default Location. **Filters**: role, location, text search. **Sorting**: any column.
**Pagination**: standard. **Available actions**: Create User, row-level Edit/Delete. **Permissions**:
Admin-only (`7-permissions.md` §9). **Empty state**: "No users yet — create your first one"
(`4-ui/3-design-system.md` §8 pattern). **Loading state**: skeleton rows. **Error state**: "Couldn't
load users — retry."

## User Create / Edit

**Fields**: header (name, username, email, contact — Username is the login identifier, kept distinct
from Email per developer decision), password (create only — masked, visibility toggle, complexity
hint), Role (required select from the hierarchy tree), Group (multi-select), preference toggles
(grouped, progressive disclosure for rarely-used HR fields). **Validation references**: `6-validation.md` §3.
**Default values**: Account Status defaults `Active`. **Buttons**: Cancel/Back, Save (standard
order, `4-ui/5-form-standards.md` §13). **Success flow**: lands on User Detail (§12 project
convention). **Failure flow**: inline field errors, form data preserved.

## Change Password

**Fields**: old password (self-service only), new password (masked + visibility toggle +
complexity hint), confirm password. **Validation references**: `6-validation.md` §3 — server-side
complexity enforced (closes USR-RISK-005, no client-side-only gap). **Success flow**: toast
confirmation. **Failure flow**: specific inline error (weak password / old password mismatch).

## Role administration

**Layout**: hierarchy tree picker (expand/collapse/select) + Create/Edit form (name + description +
parent Role) + a per-role 2FA-requirement toggle (Admin-configurable, replaces the legacy hardcoded
allowlist — `1-module.md` §14). **Reparent interaction**: drag-and-drop within the tree, recomputes
`depth` for the moved Role and all descendants server-side. **Delete confirmation flow**:
transfer-target picker (for both member Users and any child Roles) before the delete fires
(`3-business-rules.md` BR-001) — this module's highest-stakes interaction, given the delete-family's
Critical severity finding.

## Profile / Group administration

**Layout**: List + Create/Edit form (name + description for Group; permission grid for Profile).
**Delete confirmation flow**: same transfer-target-picker pattern as Role above.

## Time Clock widget

**Interaction**: a persistent clock-in/out button (or barcode scan at a timeclock station) + an
optional "what are you working on" annotation prompt on clock-in. **States**: clocked-in (shows
elapsed time), clocked-out. **Permissions**: any authenticated user, own record only.

## Payroll Report

**Layout**: date-range/report-type selector → table (per-user, per-hours-type columns + overtime,
flat US 1.5x/40hr per ADR-036) — **no export action** (CSV/ZIP export deferred past MVP, ADR-078;
on-screen report only in this build). **States**: a report period covering an unclosed punch shows a
visible "Needs Resolution" badge on the affected row(s) — never silently omits those hours (ADR-037,
per `4-ui/3-design-system.md` §8's error-tinted-card pattern for this kind of warning).

## CSV Import wizard

**Steps**: Upload → Column Mapping → Validate-then-Process. **Per-row result**: excluded rows shown
with their specific exclusion reason (barcode/username/role/is-admin-format), matching the source
system's row-level (not all-or-nothing) exclusion behavior.

---

# 5. Forms

Reference: `4-ui/5-form-standards.md` project-wide (label-above-input, trailing-asterisk required
indicator, on-blur validation timing, fixed button order). Module-specific: the password field's
visibility-toggle icon button (required `aria-label`, per `4-ui/5-form-standards.md` §16); the
Personal Day form's two distinct shapes (whole-day-count vs. start/end-time-of-day) sharing one
underlying entity.

---

# 6. UI Components

Module-specific: `RoleProfileGrid` (Profile's module/field/action permission grid — a dense,
scannable matrix on desktop/tablet; on mobile, a module list rendering `ModulePermissionSheet` per
tap — see §8); `TimeClockWidget` (persistent clock-in/out state); `TransferTargetPicker` (the shared
delete-confirmation component reused across User/Role/Profile/Group deletes — one component, not
four near-duplicates, given the identical contract established in `3-business-rules.md` BR-001).
Reusable: `Badge` (T-020, Account Status/granted-count cells), `Sheet` (T-018, mobile permission
drill-in).

---

# 7. User Interactions

**Search**: User List text search (debounced 300ms, `4-ui/5-form-standards.md` §19). **Filtering**:
role/location on User List; job/tenant/status/date on... N/A (that's the skeleton control panel's
own job-run history, not this module — no cross-reference intended). **Sorting**: standard table
sort. **Bulk actions**: Mass Update (Admin-only). **Import/Export**: CSV Import wizard; User-List
export. Payroll/Time-Card exports: deferred past MVP (ADR-078), not built in this scope. **Drag &
drop**: Role hierarchy tree reparenting, kept from the legacy
design per developer decision (`1-module.md` §14) — recomputes `depth` server-side on drop.
**Keyboard shortcuts**: none module-specific beyond standard project-wide accessibility support.

---

# 8. Responsive Behavior

Reference: `4-ui/6-responsive-design.md` project-wide. Module exception: the Profile permission grid
(`RoleProfileGrid`) is desktop/tablet-landscape only by nature of its density. On mobile it becomes
a **module list → Sheet drill-in**: a single-column list of modules, each row showing a granted-
count badge (e.g. "8/12 granted", reusing `Badge`); tapping a row opens that module's field/action
toggles in a bottom `Sheet` (the same primitive built for the Quick Actions panel, T-018) rather
than navigating to a full new page — dismissible by swipe-down or tap-out. Resolved with the
developer, chosen over a simpler accordion because it matches the current sheet-drill-in pattern
used by comparable dashboard products, and reuses a component already in this codebase instead of
introducing a new interaction shape.

---

# 9. Accessibility

Reference: `4-ui/3-design-system.md` §13, WCAG 2.2 AA project-wide floor. Module-specific: the
password visibility-toggle icon button requires an explicit `aria-label` (Show/Hide password);
the Time Clock widget's elapsed-time display uses `aria-live="polite"` so a screen-reader user is
told their clocked-in status without needing to re-poll.

---

# 10. UI States

Loading (skeleton), Empty (per `4-ui/3-design-system.md` §8 pattern), No Permission ("You don't have
access to this," Return to Dashboard link — the 403 screen already built, T-017), Validation Errors
(inline, `6-validation.md`), Network Errors (friendly retry), Read Only (self-service viewing an
Admin-only field), Disabled (form fields during Saving state), Archived (N/A — this module has no
archive state).

---

# 11. Notifications

**Success**: "User saved successfully." / "Role deleted successfully." (toast, auto-dismiss, per
`4-ui/2-user-flows.md` §12). **Warning**: "This payroll report includes incomplete time-clock
records." **Error**: specific inline + toast for save failures. **Confirmation dialogs**: the
transfer-target-required delete flow (§4 above) is itself the confirmation step for User/Role/
Profile/Group deletes — no separate generic "Are you sure?" modal layered on top of it.

---

# 12. Related Documents

Functional Specification (`2-functional-specification.md`) · Validation (`6-validation.md`) ·
Permissions (`7-permissions.md`) · API (`8-api.md`) · Project UI Standards (`4-ui/`).

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

Screen inventory adapted from the field-extraction pass's inferred screen structure (the source
blueprint doesn't document UI screens directly, out of its own Pass 0 structural-inventory scope —
see `sot-docs/raw/2-module-specs/Users/screens-and-user-flows.md`'s own note on this). Role
hierarchy tree/drag-drop reparenting restored per developer decision (§4, §7). Mobile permission-grid
behavior (§8) resolved with the developer to a Sheet-based drill-in — no open assumptions remain.
