# Users — Permissions

> Scope note: this module *is* the roles/permissions/profiles system for the whole legacy
> application — its Profile/Role/Sharing-Rule machinery is how every other module's access control
> is expressed. This file is deliberately narrower than that: it covers only who can manage
> **this module's own data** (create/edit/delete a User, assign a Role, manage a Profile/Group/
> Sharing Rule), not the whole-application permission model this module implements for everyone
> else — that would be redundant with the rest of this spec (`entities-and-fields.md`,
> `business-rules-and-validation.md`).

Source: genuine extraction — no dedicated permissions pass exists in `docs_from_blueprint/module/
Users/`, so this file is built directly from `blueprint/module/Users/02-validation-rules.md`
("Doc1 Pass 2", the delete-family and save-orchestration rule findings) and
`blueprint/module/Users/06-cross-module-integrations.md` ("Doc1 Pass 6"), cross-checked against
`business-rules-and-validation.md`/`risks-and-open-questions.md` in this folder (the traced
`deleteRole()` data-loss incident), plus a direct grep of `modules/Users/*.php` for `isPermitted(`
and `is_admin` performed for this extraction (not part of any blueprint pass).

## Roles

Only one role distinction is actually checked anywhere in this module's own administration code:
**Admin** (`is_admin='on'` on the acting user's own record) versus **non-admin authenticated
user**. This module does **not** gate its own admin screens (Save User, SaveProfile, DeleteRole,
DeleteUser, DeleteProfile, DeleteGroup, RecalculateSharingRules) through the Role/Profile/
module-action-permission system it implements for the rest of the application — a grep for
`isPermitted(` across every file in `modules/Users/` found exactly three call sites, and none of
them are in any of the seven files just named: two are in the Leads-hosted legacy-misplacement file
(`updateLeadDBStatus.php`, gating a Leads `EditView` action, not a Users action — see
`integrations.md`), and one is in `massdelete.php`, the shared ~30-module mass-delete mechanism
that happens to live under `modules/Users/` (gating a per-record `Delete` action on whatever module
the record belongs to — not specific to Users' own data). **This module manages the Profile/Role/
Permission system, but does not appear to consult it when protecting its own administration
screens.**

## Permission Matrix

"Admin" = `is_admin='on'` on the acting user. "Non-admin" = any other authenticated user. Severity
language matches `business-rules-and-validation.md` (Hard block / Soft-cosmetic block / No guard).

| Action | Admin | Non-admin (self) | Non-admin (another user's record) |
|---|---|---|---|
| Create User | Allowed (intended) | **Not hard-blocked in the save script itself** — USR-RULE-002's "record absent implies create" branch shows an "Unauthorized" message for a non-admin, but this is not an `exit`/`die`, so the save continues regardless (soft/cosmetic block only) | N/A (create has no target-user concept) |
| Edit User | Allowed | Allowed (own record) | **Inconsistently blocked**: USR-RULE-002 shows a non-halting message; USR-RULE-003 hard-redirects to Logout, but *only* inside the password-change branch; a plain profile-field edit of another user outside that branch has no confirmed hard block anywhere in the files read |
| Submit `is_admin=on` for any user | Allowed | Hard-blocked (redirect to Logout, USR-RULE-004) | Hard-blocked (same rule) |
| Delete User | Allowed (intended) | **`DeleteUser.php` has zero guards of any kind — no admin-only check, no self-delete check, no non-empty-id check** (USR-RULE-055). Nothing in the entry-point file itself stops a non-admin (or a malformed request) from reaching `deleteUserFun()`. | Same — no guard distinguishes "another user's record" from any other case |
| Delete Role | Allowed (intended) | **`DeleteRole.php` has exactly one guard — a hardcoded protection for the President (`H2`) role id.** No admin check, no other role protection (USR-RULE-052); `deleteRole()` itself performs no parameter validation at all (USR-RULE-053) — this is the traced root cause of the module's prior data-loss incident (`risks-and-open-questions.md` USR-RISK-001) | Same |
| Delete Profile | Allowed (intended) | **No guard of any kind in `DeleteProfile.php` or `deleteProfile()`** (USR-RULE-054) | Same |
| Delete Group | Allowed (intended) | **No guard of any kind in `DeleteGroup.php` or `deleteGroup()`**, plus an unhandled-branch gap on the transfer-type parameter (USR-RULE-057/058) | Same |
| Create/Edit Profile (`SaveProfile.php`) | Allowed (intended) | **No `is_admin` check found anywhere in `SaveProfile.php`** by direct grep — the file contains no reference to `is_admin` at all | Same |
| Create/Edit Group (`UserGroups.php`) | Allowed | `UserGroups.php` reads `is_admin($current_user)` and assigns it to the template (`IS_ADMIN`) for the UI to render conditionally — this is template-rendering data, not a confirmed backend access-control gate on the save action itself; whether the save endpoint independently enforces admin-only was not traced | Same, unconfirmed |
| Assign Role to a User | Allowed (intended) | Not independently gated beyond the general User-save rules above (USR-RULE-011) | Same |
| Manage Sharing Rules / Org-Wide Default Sharing | Allowed (intended) | Not read in any blueprint pass at the guard level; `CreateUserPrivilegeFile.php` (the privilege/sharing-cache engine) is confirmed to contain **no validation logic anywhere** — it computes what admins already are and are not permitted, it does not itself gate who may edit sharing configuration | Same, unconfirmed |
| Recalculate Sharing Rules (`RecalculateSharingRules.php`) | Allowed (intended) | **No permission check visible in the file itself** (7 lines) — relies entirely on whatever the outer module-action-routing layer does, which was not read by any blueprint pass (USR-RULE-060) | Same, unconfirmed |

## Ownership / Record-Level Rules

- **Self vs. other**: the only record-level distinction found anywhere in this module's own
  administration logic is "is the target user record the acting user's own record" — checked
  inconsistently (see Edit User row above) and never for the delete-family at all.
- **No group/role-scoped visibility model was found for Users' own data.** Unlike most other
  modules in this ERP, User records are not shown to be governed by the org-wide-default-plus-
  sharing-rule visibility model this module implements *for* other modules — no blueprint pass
  traced a sharing-rule check gating who can *see* a given User row in the User List/Detail views.
  This is a genuine gap in the source material (not read by any pass), not a confirmed "no" — see
  Open Item below.
- **No state-dependent permission** (e.g. "can't edit once Finalized") applies to User records —
  Users has no such lifecycle concept; see `workflows.md`.
- **Admin bypass is real and load-bearing at the permission-computation layer**: `is_admin` users
  get a minimal privilege-cache file with no role-hierarchy/sharing computation at all
  (USR-RULE-045/047) — admin is a genuine, structural bypass of the whole permission system this
  module implements, not merely a UI convenience.

## Open items (carried forward, not resolved here)

- **Whether an outer module-action-routing layer independently enforces `is_admin`/a Profile-based
  permission check before any of the seven admin-screen files listed above are even reached** was
  never traced by any blueprint pass — every finding in this file describes what the files
  themselves do or don't check, not what (if anything) happens earlier in the request-routing
  chain. This is the single largest open question for this file: it is entirely possible a routing
  layer closes some of the gaps documented above, but no blueprint pass confirmed or ruled this
  out, and this extraction did not go beyond the same file set the blueprint already covered.
- **Who can see a given User record in list/detail views** (row-level visibility) was not traced by
  any blueprint pass and is not confirmed here.
- A thin file is the honest outcome here: the source material's own risk register
  (`risks-and-open-questions.md`, USR-RISK-001) already documents that this module's delete-family
  guards are the single most safety-relevant gap in the whole module, and the permission-matrix
  findings above are the same gap restated from the "who is allowed" angle rather than the
  "was the id validated" angle covered there.
