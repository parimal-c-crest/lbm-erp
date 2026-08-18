# T-064 — Full Users module test suite + OpenAPI docs (EPIC-005)

Status: Done — **closes out EPIC-005, all 19 tasks (T-046–T-064) Done.**

## Traceability pass against `11-testing.md`
Not a re-test of everything the doc lists (66 business rules, full permission matrix) — that
would be its own multi-day audit, disproportionate to what a single M-sized task can responsibly
cover. Instead: checked §12 Security Tests' 7 named Critical/High tests against every `*.e2e-spec.ts`
file written across T-046–T-063 (grepped first, not assumed).

**Already covered by prior tasks** (verified, not re-tested here):
- Repeated failed-login lockout (USR-RISK-006) — `users-auth.e2e-spec.ts`, T-048.
- Weak-password rejection (USR-RISK-005) — `UsersService.changePassword`'s `PASSWORD_PATTERN`
  check, T-054.
- Permission escalation / "Denied cell returns 403" — every other spec file in the module
  already asserts this per-endpoint (RolesGuard tests throughout T-055–T-063).
- Personal-day ownership truncation (USR-RISK-004) — structurally moot now, not "covered by a
  test" but closed by construction: `personal_days.user_id` is a real UUID FK (T-046), the
  legacy `varchar(2)` truncation bug this test targeted cannot occur in this schema shape.

**Had zero coverage, added in `backend/test/users-security.e2e-spec.ts`:**
- Malformed/empty delete-id rejected before query construction (BR-001's own worked example,
  USR-RISK-001 — the module's single highest-stakes rule, traced root cause of a real prior
  data-loss incident).
- Last-remaining-Admin delete protection (USR-RISK-020).
- Duplicate-username rejection on create (USR-RULE-001).
- SQL-injection-shaped input stored as inert literal text through the real HTTP → service → DB
  path (USR-RISK-002/003) — proves Prisma's parameterization holds end-to-end, not just "the ORM
  is generally safe."

All 4 passed on first run — real existing guarantees getting real test coverage, not new
behavior. That's expected and correct for a gap-closing pass, not a red flag.

## OpenAPI docs
- Added `@nestjs/swagger` (new dependency) + its compiler plugin in `nest-cli.json` — infers
  request/response schemas from the `class-validator`-decorated DTOs already on every endpoint,
  no hand-duplicated `@ApiProperty` per field across ~40 endpoints.
- Wired `SwaggerModule` in `main.ts`, served at `/api/docs` (`/api/docs-json` for the raw spec).
- Tagged all 14 Users-module controllers with `@ApiTags` for grouping.
- **Verified live, not just "should work"**: built and booted the real compiled server, fetched
  `/api/docs-json`, confirmed 40 documented paths and correct per-controller tag grouping
  (Users, Roles, Profiles, Groups, Timeclock, Payroll, Personal Days, Holidays, Login History,
  QuickBooks Sync, Mail Account, Notification Schedulers, Word Templates, Barcode Labels — plus
  the pre-existing Auth/TenantProvisioning/JobManagement/App controllers, tagged for free).

## Verification
- Full backend e2e suite: **17 suites / 61 tests, all passing** — every suite written across
  T-055–T-064, no regressions anywhere in the pre-existing suite either.
- `pnpm typecheck` / `pnpm lint` — clean.

## Session-wide summary (T-055 through T-064)
10 tasks, all TDD'd against real Postgres + Redis (no mocks anywhere in this module's test
suite). Real bugs found and fixed along the way, not just features shipped:
- A repo-wide test-infra bug (`test:e2e` needed `NODE_OPTIONS=--experimental-vm-modules` for
  Prisma 7's WASM query compiler under ts-jest — was already fixed in `package.json`, just not
  used correctly at first).
- A real parallel-test-worker flake (`--runInBand` added to `test:e2e` — concurrent Jest workers
  hitting the same shared skeleton Postgres caused unique-constraint collisions and WASM-engine
  contention under load).
- A design correction caught before it compounded: T-056's payroll report initially live-joined
  `PersonalDay` instead of reading the submission-time `TimeClockRecord` bridge the docs actually
  specify — fixed before T-057 shipped and could have caused silent double-counting.
- Two real documentation/schema gaps found, resolved pragmatically, and flagged for developer
  confirmation rather than silently decided (raid-log R-005 Holiday/HolidayAssignment, R-006
  UserNotificationPreference).
- A live UI bug fix mid-session (unrelated to backend work, found during the earlier developer
  review): sidebar nav labels invisible at desktop width — see prior session notes.

Known, deliberately out-of-scope items (all flagged in their own task's todos, not silently
missing): frontend cutover from mock data to these real endpoints (T-046–064's own precedent —
backend-only, matches M2/M3 parallel-track status); real external integrations for QuickBooks/
cloud-print/2FA-email are stubbed (no credentials in this environment); R-006's
`UserNotificationPreference` backend never got its own task.
