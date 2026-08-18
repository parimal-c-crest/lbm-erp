# T-055 — Time Clock backend (EPIC-005)

Status: Done

## What was built
- `backend/src/users/timeclock/timeclock.controller.ts` + `timeclock.service.ts` —
  `POST /timeclock/clock-in` (self, optional `task`/`laborStatus` annotation), `POST
  /timeclock/clock-out` (self, closes the caller's own open punch), `POST /timeclock/override`
  (Admin/Accounting-Management only, corrects `clockIn`/`clockOut` on any record).
- State machine guard (`3-business-rules.md` §6): a second clock-in while a punch is already open
  is rejected `409`, not silently allowed — closes the legacy system's confirmed absence of this
  check.
- Cross-field validation (`6-validation.md` §4): override rejects `clockOut < clockIn` with `400`.
- Auto-clock-out safety net (`auto-close.service.ts` + `auto-close.processor.ts` +
  `auto-close.scheduler.ts`) — a self-contained BullMQ queue (`timeclock-auto-close`, reuses the
  root Redis connection `JobsModule` already configures) with one daily repeatable job. Sweeps
  every registered tenant (via `TenantClientRegistryService`, not `TenantContextService` — no HTTP
  request context in a background job) and flips any punch still `clock_in` from a prior day to
  `unclosed_needs_resolution`. **Never guesses a clock-out timestamp** — per ADR-037, an unclosed
  punch is an explicit, visible state requiring manager resolution, not a silently-fabricated
  clock-out.
- Deliberately **not** wired into the platform-admin cross-tenant `JobDefinition`/`JobSchedule`
  control-panel engine (EPIC-002) — that system has no precedent yet for any module registering
  into it (no seed data, no per-tenant schedule fan-out convention established), and building that
  convention wasn't this task's scope. Self-contained BullMQ queue instead; still satisfies "runs
  automatically, per tenant, on a schedule."

## Verification
- New `backend/test/timeclock.e2e-spec.ts` (7 tests) + `timeclock-auto-close.e2e-spec.ts`
  (2 tests) — real skeleton Postgres, real Redis, TDD'd (watched RED before every GREEN, including
  the auto-close sweep — caught and corrected one instance of writing the service before its test
  mid-session).
- Full backend e2e suite: **6 suites / 26 tests, all passing**, no regressions.
- `pnpm typecheck` / `pnpm lint` — clean.

## Known limitations, flagged not hidden
- Auto-close sweep runs once daily (00:10 UTC) — a punch that spans past midnight isn't flagged
  until the next day's sweep, not the moment it crosses midnight. Matches the "safety net"
  framing in the functional spec (a periodic sweep, not real-time), not treated as a gap.
- Frontend (`TimeClockWidget.tsx`) still calls its mock handlers — switching it to the real
  endpoints wasn't part of this backend task, consistent with T-046–054's precedent (`wire to`
  means the real backend now exists with a matching contract, not a frontend cutover).
- Concurrent-edit lock on the override endpoint is T-063, not this task — override has no lock
  yet, by design (sequencing, not an oversight).

## Repo/toolchain note (not code, orientation for next session)
- `pnpm test:e2e` (not a bare `npx jest`) is required — it sets
  `NODE_OPTIONS=--experimental-vm-modules`, needed for Prisma 7's WASM query compiler under
  ts-jest's CJS transform. Running jest directly hangs/fails with no useful output. Already
  correctly configured in `package.json`; this is a one-time trap for whoever runs tests by hand.
