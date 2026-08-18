# Users — Business Rules & Validation

> Every rule gets a stable ID (e.g. <MOD>-RULE-001) so Stage 4's test docs can trace back to it.

Source: `docs_from_blueprint/module/Users/03-business-rules-and-validation.md`, itself extracted
from `blueprint/module/Users/02-validation-rules.md` ("Doc1 Pass 2"), cross-checked against
`blueprint/module/Users/07-risk-findings.md` ("Doc1 Pass 7"). The blueprint catalogs **66 numbered
rules**; original legacy file:line citations are dropped here (remain available in
`blueprint/module/Users/02-validation-rules.md`) but IDs are renumbered `USR-VAL-###` →
`USR-RULE-###` for this document, preserving numeric order 1:1. Confidence values are carried
forward from the source Pass 2 catalog (`Confirmed` = directly verified by reading the code;
`Inferred` = deduced, flagged in the source for follow-up verification) — most rules in this module
are `Confirmed`; the few `Inferred` rules are marked below.

**Severity legend**: *Hard block* = the operation is refused/rejected entirely; *Guard/scope-gate*
= a sub-step or side effect is conditionally skipped, not the whole operation; *Clamp/override* = a
value is silently adjusted/superseded; *Not a block* = documents a computation branch or
side-effect gate, not a validation per se; *Dead/no guard* = the code exists but is never called, or
a check that should exist is entirely absent.

## Headline finding (module-wide)

This module gates authentication, session, and every permission/sharing decision in the ERP, yet
the save/entity layer (`Users::saveentity`/`insertIntoEntityTable`) contains **zero business-rule
validation** — every branch is a raw INSERT/UPDATE loop over whatever fields are present in the
request. The one genuine server-side duplicate-username/last-admin check that exists
(`Users::verify_data()`, USR-RULE-013) is **never called from the real save path**. Password
complexity is enforced by a **single client-side JS regex only**, toggle-gated, with no server-side
equivalent at any layer. **The single most severe finding** is in the delete-family: none of the
four delete entry points (Role/User/Profile/Group) validate their id parameter is non-empty before
running destructive queries — the `deleteRole()` case was traced end-to-end and confirmed as the
exact root cause of a prior real data-loss incident (see `risks-and-open-questions.md`).

## Business Rules

| ID | Statement | Trigger | Scope | Severity | Confidence |
|---|---|---|---|---|---|
| USR-RULE-001 | A separate ajax `dup_check` reports whether a username already exists (no soft-delete filter — a deleted user's username still blocks reuse), but this is a distinct request from the actual save; the save action itself never re-checks for a duplicate username. | Ajax `dup_check` request | Username | No block at save time — informational endpoint only | Confirmed |
| USR-RULE-002 | Non-admin users editing another user's record are shown an "Unauthorized" message, but this is **not** an `exit`/`die` — the rest of the save script continues executing regardless. | Save, non-admin, foreign/absent record | Whole save | Soft/cosmetic block only | Confirmed |
| USR-RULE-003 | Non-admin users editing a different user (checked only inside the password-change branch) are hard-redirected to Logout — independent of, and unlike, USR-RULE-002, this one is a real `exit`. | Save, non-admin, editing a different user | Whole save | Hard block | Confirmed |
| USR-RULE-004 | Non-admin users submitting `is_admin=on` for any user are hard-redirected to Logout. | Save, non-admin, is_admin=on submitted | is_admin | Hard block | Confirmed |
| USR-RULE-005 | If the submitted role is `H2` (President), `is_admin` is force-overridden to `'on'` regardless of what was submitted. | Save, role=H2 | is_admin | Hard override | Confirmed |
| USR-RULE-006 | `internal_mailer` is force-normalized to 1/0 on every save, with the session copy synced in lockstep. | Every save | Internal Mailer | Not a block — normalization | Confirmed |
| USR-RULE-007 | `date_format` and `currency_id` are force-overridden to fixed values on every save, discarding whatever was submitted — these two fields are effectively non-configurable via this save path. | Every save | Date Format, Currency | Hard override | Confirmed |
| USR-RULE-008 | On create only, `expiredays` defaults to the literal `'Never'` if left blank. | Create, expiredays blank | Expire Days | Not a block — conditional default | Confirmed |
| USR-RULE-009 | If `changepassword=true` and the password check fails, the **entire** save is aborted (redirect + exit) — not just the password portion, even if a profile-field edit was bundled in the same submission. | Save, changepassword=true, check fails | User Password | Hard block, but blocks the whole co-submitted save | Confirmed |
| USR-RULE-010 | A **second**, independently-triggered password-change path exists: if `user_name`+`new_password` are both posted, a second `change_password()` call fires — this time passing the *confirmation* field as the "old password" argument, meaning it effectively checks the new password's confirmation against the stored hash, not the real old password (likely a latent argument-order bug). | Save, user_name + new_password posted | User Password | Hard block on failure, semantically wrong argument | Confirmed |
| USR-RULE-011 | Role/group mapping uses different function pairs (delete-then-insert vs. insert-only) depending on whether the target user already has an id — with a subtle create/edit asymmetry on whether group can be saved empty. | Every save | Role, Group | Not a block — branch-selection with an asymmetry | Confirmed |
| USR-RULE-012 | The privilege/sharing cache files are unconditionally regenerated on **every** save, regardless of whether any permission-relevant field actually changed. | Every save | Permission cache | Not a block — unconditional, costly side effect | Confirmed |
| USR-RULE-013 | `verify_data()` fails if (a) another non-deleted user already has the same username, or (b) the user being saved is the org's *only* admin and the request has no `is_admin` key at all — **but this function is never called from the real save path**, so neither protection is actually enforced today. | Would trigger on save if called | Username, is_admin | Defined but dead on the server-side save path | Confirmed |
| USR-RULE-014 | `authenticate_user($password)` — a distinct, legacy login-check method — builds its SQL via direct string interpolation, unparameterized; re-verified to have **zero live callers anywhere in the repo** — dead code. | Callers of this specific method (none found) | Username, password hash | Hard block if reached, but confirmed dead | Confirmed |
| USR-RULE-015 | `change_password()` hard-blocks on empty new password, and (for non-admin callers) re-checks the old password — but has **no password complexity, minimum length, or reuse/history check** at all; any non-empty string is accepted. | Password change | User Password | Hard block on the two checks present; no complexity enforcement | Confirmed |
| USR-RULE-016 | `change_password_direct_import()` (CSV-import password path) has no old-password check at all (by design) and the same absence of complexity/reuse validation — non-empty is its only guard. | CSV user import | User Password | Weakest of the two password-set paths | Confirmed |
| USR-RULE-017 | `load_user()` increments a **session-scoped** login-attempt counter and logs (never blocks) past 5 attempts; the counter resets only on a successful login — a scripted attack that doesn't preserve session cookies never accumulates a count at all. | Every login attempt | Brute-force protection | No hard block — logging only, no lockout | Confirmed |
| USR-RULE-018 | `load_user()` runs two vestigial branding-tamper integrity checks whose result is never actually read/acted upon anywhere later in the function — entirely inert/dead validation code. | Every login attempt | N/A | Not a block — dead validation | Confirmed |
| USR-RULE-019 | The actual credential check is delegated to `doLogin()`, branching on the configured auth type (LDAP/AD/default-SQL); failure returns null, treated as auth failure by the caller. | Every login attempt | Username, Password | Hard block | Confirmed |
| USR-RULE-020 | For non-barcode logins, if password auth fails, `doLogin()` silently **falls back** to checking the same submitted value as a raw, unencrypted barcode value — the login field doubles as a barcode fallback with no UI indication. | Login, password mismatch | Username, Password/Barcode | Not a block — silent fallback broadens what "success" accepts | Confirmed |
| USR-RULE-021 | IP-based access restriction: for non-admin users, if the org-wide IP-allowlist setting is on, the user's default location must resolve to a Location whose allowed-IP list contains the requester's IP, unless the user's role is exempted — login hard-denied otherwise. | Login, non-admin, IP-allowlist ON | N/A | Hard block | Confirmed |
| USR-RULE-022 | After successful credential/IP checks, `authenticated` is set true only if `status` is not `"Inactive"` — the one confirmed, genuinely enforced status gate in the module. | Login, credentials valid | Status | Hard block | Confirmed |
| USR-RULE-023 | `insertIntoEntityTable()`'s per-field loop performs only type coercion (password encrypt, checkbox normalize, multi-picklist join, date format) — **no field is checked against being empty even when its own metadata marks it required**. | Every save | Any Users column-registered field | Not a block anywhere in this loop | Confirmed |
| USR-RULE-024 | On edit, if the computed UPDATE clause ends up empty (zero matching field rows), the UPDATE is silently skipped rather than erroring. | Edit, zero updatable fields resolved | N/A | Not a block — silent no-op guard | Confirmed |
| USR-RULE-025 | User-photo upload is gated by a Users-only `validateImageFile()` call (internals not read); a separate, module-wide bad-extension check renames dangerous uploads to `.txt` rather than rejecting them. | User photo upload | Attachment/Photo | Hard gate (Users-only) + separate module-wide defusal | Confirmed guard exists; internals unread |
| USR-RULE-026 | `getRole()`/`getAuthenticatedParentRole()` return empty/false silently for a user with zero role mappings — no explicit error raised. | Permission/lockout checks | Role | Not a block — silent empty-result fallback | Confirmed |
| USR-RULE-027 | Username resolution tries a barcode match, then a looser barcode match (no `barcoderequireforlogin` restriction), then falls back to a literal username — three interpretations tried in sequence. | Every login attempt | Username/Barcode | Not a block — resolution/fallback chain | Confirmed |
| USR-RULE-028 | 2FA hard gate, but **role-allowlist-gated**: only fires for roles in a configured list; requires the submitted code to match and be within a 15-minute window. | Login, 2FA ON, role in allowlist | 2FA verification code | Hard block (redirect on mismatch/expiry), but coverage is role-gated | Confirmed |
| USR-RULE-029 | On success, the 2FA code is cleared — single-use, though nothing rate-limits re-requesting a fresh one. | Successful login | 2FA code | Not a block — cleanup | Confirmed |
| USR-RULE-030 | Failure messages are generic (`ERR_INVALID_PASSWORD`) for every failure mode except the IP-restriction path — a deliberate anti-enumeration posture. | Login failure | N/A | Not a block — messaging policy | Confirmed |
| USR-RULE-031 | Client-side JS blocks submission on blank old/new/confirm password or a mismatch — **entirely client-side**; a direct POST bypasses all four checks (server side only enforces new-password-non-empty + old-password match for non-admins, no confirm-match check exists server-side at all). | ChangePassword popup submit | Old/New/Confirm Password | Client-side only | Confirmed |
| USR-RULE-032 | The 8-char/upper/lower/digit/special complexity regex is enforced **only** via a client-side `onblur` handler, toggle-gated — no server-side equivalent exists at any layer. | ChangePassword popup, toggle ON | New Password | Client-side only, toggle-gated, no server-side equivalent | Confirmed |
| USR-RULE-033 | `Forms.php`'s client-side `verify_data(form)` (distinct from the dead server-side `verify_data()`, USR-RULE-013) performs required-field/password-match/format checks — no confirmed server-side equivalent for any of them. | User EditView submit | Multiple form fields | Client-side only | Confirmed presence/purpose; Inferred that no server-side equivalent exists |
| USR-RULE-034 | An already-authenticated session skips the login form entirely and redirects to the default page. | Login page load, already authenticated | N/A | Hard redirect | Confirmed |
| USR-RULE-035 | Logout optionally runs a DB backup+FTP push for admin users before destroying the session — a privileged side effect gated on `is_admin`. | Logout, admin user | N/A | Not a validation rule — flagged for completeness | Inferred from skeleton-level description, not re-confirmed by full read |
| USR-RULE-036 | The required lockout role set for a protected action is resolved via a 10+-branch hardcoded lookup keyed on the requested action type (payment overrides, Store Transfer actions, End-of-Day, cash-drawer/deposit). | Protected-area access request | Lockout Password Level | Not itself a block — resolves the role list USR-RULE-037/038 check against | Confirmed |
| USR-RULE-037 | In ajax mode, the actual override-permission check is **structurally dead**: the real `in_array` logic is commented out and replaced with an unconditional failure — every ajax-mode lockout-override request always fails regardless of the user's actual role. | Protected-area ajax check | N/A | Hard-coded to always fail (dead/bypassed logic) | Confirmed |
| USR-RULE-038 | In iFrame mode, an override login is accepted only if the resolved user's role is in the allowed list **and** the credential check succeeds — the one working override path. | Protected-area override submit (iFrame mode) | Lockout override credentials | Hard block (both checks must pass) | Confirmed |
| USR-RULE-039 | An unauthenticated pre-login ajax probe resolves a user by username/barcode and reveals whether 2FA is required — indirectly confirms account existence/active status. | Login page, username field blur | N/A | Not a block — information-disclosure-adjacent probe | Confirmed |
| USR-RULE-040 | 2FA codes are 6-digit, generated with a collision-avoidance retry against other users' currently-active codes (a global, not per-user, uniqueness constraint). | 2FA code generation | 2FA code | Not a block — collision-avoidance loop | Confirmed |
| USR-RULE-041 | If the resolved user's personal email is empty, no 2FA code is generated/sent — a silent dead-end with no alternate delivery channel or admin alert. | 2FA code request | Email2 | Hard gate, but a silent dead-end for the affected user | Confirmed |
| USR-RULE-042 | 2FA code (re)generation has **no rate limit** — repeated calls generate/email a fresh code each time, indefinitely refreshing the 15-minute window. | 2FA code request (repeated) | N/A | No block — absence of rate-limiting is the finding | Confirmed |
| USR-RULE-043 | The `admin` account's 2FA codes are additionally CC'd to a hardcoded developer-email list on every send, ungated by any environment check. | 2FA code request, username=admin | N/A | Not a block — a standing backdoor-adjacent visibility mechanism | Confirmed |
| USR-RULE-044 | The lockout-password ajax check requires non-empty `userid`/`username`/password before even attempting; success requires an exact credential match. | Lockout-area password prompt (ajax) | Lockout password | Hard gate on preconditions; hard pass/fail on credential check | Confirmed |
| USR-RULE-045 | Privilege-file generation branches entirely on `is_admin`: admin users get a minimal file with no role-hierarchy/sharing computation at all. | Privilege-file (re)generation | is_admin | Not a block — branch-selection with security implications (admin = unconditional full access) | Confirmed |
| USR-RULE-046 | The sharing-privileges file generator `require`s the just-written user-privileges file as bare global-scope variables — an implicit ordering dependency; every caller found in scope does call both in the correct order, so this is latent, not an active bug. | Sharing-privileges regeneration | N/A | Not a block — implicit ordering contract enforced only by caller discipline | Confirmed pattern; no violating call site found |
| USR-RULE-047 | Admin users get an early-return minimal sharing-privileges file — consistent with USR-RULE-045, sharing rules are never computed for admins. | Sharing-privileges regeneration, is_admin=on | N/A | Not a block — early-return optimization | Confirmed |
| USR-RULE-048 | New-profile creation copies its entire permission baseline from whichever profile has the **numerically lowest id** in the system — not a designated "default profile" flag. | Profile create | All permission fields | Not a block — baseline-selection logic with no explicit default-profile concept | Confirmed |
| USR-RULE-049 | Two specific tab ids are excluded from the direct permission loop; one is instead force-set identical to another tab's submitted value, with no independent UI control. | Profile save | Tab Permissions | Hard override | Confirmed |
| USR-RULE-050 | Standard-action permission checkboxes default to **"granted"** whenever the corresponding request field is simply absent — a permission the form doesn't render for a given tab silently defaults to granted, not denied. | Profile save (create), field absent | Standard Action Permissions | Fail-open default for absent fields, security-relevant | Confirmed pattern; Inferred severity (did not trace whether the profile-edit UI always renders every checkbox) |
| USR-RULE-051 | Field-visibility values for a fixed list of field types are force-set to visible regardless of what was submitted for that field. | Profile create | Field Visibility (specific uitypes) | Hard override | Confirmed |
| USR-RULE-052 | `DeleteRole.php` has **exactly one guard**: a hardcoded check against the President role id. No check that the role-id parameter is non-empty, exists, or that the transfer-target role is valid. | DeleteRole.php invocation | Role delete parameters | No guard for the general case | Confirmed |
| USR-RULE-053 | `deleteRole()` itself performs **no parameter validation whatsoever** before delegating to a helper function whose behavior on an empty id was, at the time of this rule's extraction, unconfirmed. | Any call to deleteRole() with empty/invalid id | Role, Profile, Role2Profile, Group2Role, Sharing Rules | No guard — later fully traced (see risk register R1) | Confirmed (no validation present); Inferred (exact blast-radius mechanism, pending the delegate helper's own body — later closed) |
| USR-RULE-054 | `deleteProfile()` performs no non-empty/existence check on its id parameter before five unconditional parameterized DELETEs — an empty id is more likely to silently no-op than cascade (parameterized `WHERE col=?` with an empty bind matches zero rows). | DeleteProfile.php invocation, or internal call from deleteRole() | Profile + 5 join tables | No guard, but bounded blast radius | Confirmed |
| USR-RULE-055 | `DeleteUser.php` has **zero guards of any kind** — no admin-only check, no self-delete check, no non-empty check on either id parameter. | DeleteUser.php invocation | User delete parameters | No guard whatsoever | Confirmed |
| USR-RULE-056 | `deleteUserFun()` likewise performs no validation before nine sequential parameterized UPDATE/DELETE statements — bounded blast radius, same shape as USR-RULE-054. | DeleteUser.php or any other caller | User + 7 related tables | No guard, bounded blast radius | Confirmed |
| USR-RULE-057 | `DeleteGroup.php` has zero guards, and an additional gap: an unrecognized transfer-type value silently proceeds with a null transfer target rather than erroring. | DeleteGroup.php invocation | Group delete parameters | No guard, plus an unhandled-branch gap | Confirmed |
| USR-RULE-058 | `deleteGroup()` performs no validation on any of its three parameters; the ownership-transfer step fails open to a silent no-op for an unrecognized transfer type. | Any call to deleteGroup() | Group + 5 related tables | No guard | Confirmed |
| USR-RULE-059 | **Net conclusion**: none of the four delete entry points or their delegate functions validate id parameters before destructive SQL. `deleteProfile()`/`deleteUserFun()`/`deleteGroup()`'s parameterized queries bound the blast radius of an empty parameter to a silent no-op; `deleteRole()`'s dependency on an (at extraction time) unread helper function was flagged as the single highest-priority follow-up — later fully resolved (see risk register R1). | N/A — module-wide conclusion | Role/Profile/User/Group delete subsystem | Critical, module-wide gap | Confirmed (absence of guards); Inferred (deleteRole()'s precise blast-radius mechanism, since resolved) |
| USR-RULE-060 | The RecalculateSharingRules entry point disables the execution-time limit and calls the global recompute function with no confirmation step and no permission check visible in the file itself. | Any request to this action | Whole privilege-cache subsystem | No guard in this file; relies entirely on the outer routing layer | Confirmed for this file; Inferred that outer routing provides the actual permission gate |
| USR-RULE-061 | The delegate function iterates **every non-deleted user in the system**, unbounded/unpaginated, with no progress reporting or partial-failure/resume mechanism. | Recalculate-sharing-rules trigger | Every user's privilege/sharing cache files | Not a validation rule — an operational/reliability risk | Confirmed |
| USR-RULE-062 | The only access-control gate before any module-specific delete branch is a per-record permission check (`isPermitted($returnmodule,'Delete',$id)`); records failing it are reported back to the user as "couldn't delete." | Mass-delete submit, per record | N/A (permission gate) | Hard block per-record, with user-facing reporting | Confirmed |
| USR-RULE-063 | Several module branches (not Users itself) layer an additional status-based guard on top; records failing that secondary guard are silently excluded with no report back — a UX inconsistency versus the permission-check failure path. | Mass-delete submit, module-specific | Status fields (per module) | Hard per-record block, inconsistent failure reporting | Confirmed |
| USR-RULE-064 | Import rows are flagged invalid if the submitted barcode already belongs to a different existing username, is shorter than 12 characters, collides with another row in the same batch, or if the submitted role name doesn't match any live Role. | CSV import, step 3 validation | User Barcode, Role Name | Hard exclusion from import | Confirmed |
| USR-RULE-065 | Rows are also flagged invalid if username is null/empty, or `is_admin` is present but not exactly `'on'`/`'off'`. | CSV import, step 3 validation | Username, is_admin | Hard exclusion from import | Confirmed |
| USR-RULE-066 | **No password-related validation exists anywhere in the import-validation step** — a row supplying any (or no) password value is not checked for complexity, length, or presence at this layer, consistent with USR-RULE-016's finding for the direct-import password path. | CSV import | User Password | Absence of check | Confirmed (absence) |

**Total: 66 of 66 rules catalogued.**

## Open Questions

Carried forward from the source Pass 2 catalog's own systemic/cross-cutting findings and follow-up
list — these are ambiguities in the legacy system's own intended behavior, not gaps in this
extraction:

1. **Password policy is entirely client-side and toggle-gated** — no file contains a server-side
   password complexity, minimum-length, or reuse/history check at any layer. Needs SME confirmation
   of the intended policy before a new implementation's domain-invariant password rule is written.
2. **No server-side account lockout / login rate-limiting exists** — the session-scoped attempt
   counter only logs, never blocks. Needs a business decision on lockout threshold/window (new
   capability, nothing to carry forward).
3. **Two same-named-but-different `verify_data()` functions exist** — a live client-side JS one and
   a dead server-side PHP one. Needs confirmation neither is assumed live by any downstream
   consumer of this spec.
4. **`logintoProtectedArea.php`'s ajax-mode override check is dead/bypassed code** — only the
   iFrame-mode path is a live override mechanism today. Needs SME confirmation of whether the
   ajax-mode path should be revived (with the real check restored) or formally retired.
5. **USR-RULE-048's "lowest profileid" baseline** has no confirmed relationship to any canonical
   default-profile seed value; `DefaultDataPopulator.php` (the likely source of that seed data) was
   not read by any blueprint pass — flagged for a follow-up read before a new implementation's
   default-profile-template concept is finalized.
6. **`getRoleAndSubordinatesInformation()`** — the helper `deleteRole()` delegates to — was not
   independently read line-by-line in the source Pass 2 catalog at extraction time; its exact
   query-construction behavior on an empty role id is the detail that, once read, confirmed the
   R1 incident mechanism recorded in `risks-and-open-questions.md`.
