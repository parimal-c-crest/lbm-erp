# T-046–T-054 — Users Backend/API foundation (EPIC-005)

Combined todos file for the RBAC foundation slice built and verified this session — the
highest-priority part of the module per its own docs ("~126 other modules depend on it for
permission checks"). T-055 onward (Time Clock, Payroll, Personal Days, Login History detail,
QuickBooks, Mail/Notification/WordTemplate, Barcode, concurrency lock, full test suite) are
**not** built yet — left `Available` in `task-list.md`, not marked Done, so this isn't overstated.

## T-046 — Schema migration
Status: Done
- Extended `prisma/schema.prisma` with the full Users module schema (`4-schema.md` §4): User
  extensions (username/status/lockout fields), HR/Preference/NotificationPreference children,
  Role hierarchy + `RoleTwoFactorRequirement`, Profile + `RoleProfile` + `ProfileModuleActionPermission`,
  Group + `GroupMembership`, `TimeClockRecord` + `ClockInTaskDetail`, `PersonalDay`, `LoginHistory`,
  `QuickBooksSyncPointer`, `MailAccount`, `NotificationScheduler`, `WordTemplate` (ADR-188 — backend
  entities exist, no dedicated UI).
- Deliberate simplification, documented in-schema: `defaultLocation` is a plain string, not a real
  FK — Location module doesn't exist yet in this codebase.
- Migration hand-authored (`prisma migrate dev` needs an interactive TTY this environment doesn't
  have) via `prisma migrate diff --script`, edited to backfill `first_name`/`username` for the
  pre-existing skeleton bootstrap row before locking `NOT NULL`, then applied with
  `prisma migrate deploy` against **both** `lbm_erp_skeleton` and `lbm_erp_dev` — real local
  Postgres, not simulated.
- Fixed 2 pre-existing files (`tenant-provisioning.service.ts`, `scripts/issue-dev-token.ts`) that
  referenced the now-removed `users.role` string column — not scope creep, the schema change broke
  their typecheck and they needed fixing to keep the build green.

## T-047 — EntityIdentifier value object
Status: Done
- `backend/src/common/value-objects/entity-identifier.ts` — rejects empty/malformed/non-UUID input
  at construction (ADR-154, closes USR-RISK-001). Used by every delete command below.

## T-048 — Authentication backend
Status: Done
- `backend/src/auth/auth.service.ts` + `auth.controller.ts` — login by username (not email),
  generic anti-enumeration error (USR-RULE-030), DB-backed lockout (5 attempts → 15-min,
  ADR-155), Inactive-status gate (USR-RULE-022), login history recording.
- **Known limitation, flagged not hidden**: no IP-restriction check (no org-settings table exists
  yet to gate it against).

## T-049 — Per-role 2FA backend
Status: Done (with a documented limitation)
- `role_two_factor_requirements` config endpoint (`PATCH /roles/:id/two-factor-requirement`,
  refuses to enable if any member has no email — ADR-075's conditional-required-field rule).
- Login 2FA sub-flow (`POST /auth/2fa/verify`) — 6-digit code, 15-min window.
- **Known limitation, flagged not hidden**: codes are held in an in-memory `Map`, not Redis —
  this project's own BullMQ/async convention (ADR-031) and real email delivery are both out of
  scope for this slice; a restart loses in-flight codes. Fine for local dev, not production-ready.
- **Two real vulnerabilities found by an automated background security review, both fixed and
  e2e-verified same session**:
  1. *Weak cryptographic primitive* — the 6-digit code was generated with `Math.random()`
     (predictable, not a real security boundary). Fixed: `crypto.randomInt(0, 1_000_000)`.
  2. *Missing session binding on 2FA* — `POST /auth/2fa/verify` originally took a raw `userId` +
     `code`, so anyone who knew or enumerated a user's id could brute-force the 6-digit code
     against them directly, with no proof they'd ever completed step 1 (password check) at all.
     Fixed: `login()` now returns a short-lived signed `challengeToken` (JWT, `purpose:
     '2fa-challenge'`, 15-min exp) instead of the raw id; `verifyTwoFactor` requires and verifies
     that token and derives the user from it. Also added a max-5-wrong-attempts counter that
     discards the pending challenge, closing the unlimited-guess window the original code path
     otherwise-still-had. 4 new e2e tests cover this specifically (challenge-token-issued,
     successful verify, wrong-purpose-token rejected, lockout-after-5-wrong-attempts) — full
     suite now 4 suites / 17 tests, all passing.

## T-050 — Permission read model
Status: Done
- `backend/src/users/permissions/permissions.service.ts` — Role→Profile→module/action resolution,
  resolved fresh from live tables on every call (closes USR-RULE-012's cache-rebuild cost and
  USR-RISK-015's staleness — there's no cache to go stale). Super Admin bypass is real (ADR-057).

## T-051 — User CRUD backend
Status: Done
- `backend/src/users/users.service.ts` + `users.controller.ts` — create/edit/delete (transfer-target
  required, EntityIdentifier-validated, last-remaining-Admin delete protection), real
  duplicate-email/username invariant (ADR-157). CSV import/mass-update endpoints not built
  (those are T-041/T-042's *frontend* mock counterparts' real backend — deferred with the rest of
  T-055+).

## T-052 — Role + Profile CRUD backend
Status: Done
- `backend/src/users/roles/` — CRUD, reparent (cycle-safe depth recompute), 2FA toggle, delete
  w/ transfer-target (members + child roles reassigned).
- `backend/src/users/profiles/` — CRUD, every module/action permission explicitly seeded on
  create (ADR-156, closes USR-RISK-013), individual permission toggle endpoint, delete w/
  transfer-target (no real dependent to reassign yet, routed through the same contract for UI
  consistency, per code comment).

## T-053 — Group CRUD backend
Status: Done
- `backend/src/users/groups/` — CRUD with mixed USER/ROLE/ROLE_AND_SUBORDINATES membership,
  delete w/ transfer-target (same no-real-dependent caveat as Profile).

## T-054 — Change Password backend
Status: Done
- `UsersService.changePassword` (self-service old-password re-verification + admin-reset,
  collapsed into one command per FR-007) — wired to `POST /users/me/password` and
  `POST /users/:id/password-reset`.

## Verification (all of the above)
- `pnpm --filter backend typecheck` / `lint` — clean.
- Real e2e suite added: `backend/test/users-auth.e2e-spec.ts` — 6 tests against the real skeleton
  Postgres database (not mocked): login success, wrong password, 5-attempt lockout (DB-verified),
  Inactive-user rejection, unauthenticated-request rejection, and RBAC role-mismatch rejection
  (proves `RolesGuard` checks the actual role claim, not just "any role").
- Full backend e2e suite re-run after the schema change: **4 suites / 17 tests, all passing** —
  including the pre-existing `tenant-provisioning` and `job-scheduling` suites, confirming no
  regression from the User model changes, plus the 4 new 2FA-fix tests above.
