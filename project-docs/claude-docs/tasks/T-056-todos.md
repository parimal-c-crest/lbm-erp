# T-056 — Payroll pipeline (EPIC-005)

Status: Done

## What was built
- `backend/src/users/payroll/payroll.controller.ts` + `payroll.service.ts` — `GET
  /payroll/report?start=&end=` (Admin/Accounting-Management only), computed fresh on every call,
  never cached (`8-api.md` §3).
- One shared elapsed-time calculator (`clockOut - clockIn`), summed per `hoursType`
  (regular/holiday/personal/sick/vacation) — replaces the legacy's 8 independent inline
  implementations.
- Overtime: standard US rule, 1.5x-eligible hours beyond 40 in a calendar week (ADR-036) —
  computed per real Monday-anchored week bucket over the report's regular-hours punches, not the
  legacy's two divergent formulas (a real per-week rolling bucket, not a flat period-total
  comparison).
- Unclosed-punch flagging (ADR-037): any punch in range that isn't cleanly `clock_out` (still
  `clock_in`, or already `unclosed_needs_resolution`) excludes that punch's hours from the sum and
  flags the whole row `needs_resolution` — never silently computed as if the hours didn't exist.
- **Personal-Day→hours-classification bridge**: initially built as a live join against
  `PersonalDay` at report time — **corrected mid-session** after re-checking `8-api.md` POST
  /personal-days and FR-010's Main Flow, which specify the bridge happens at *submission* time
  (a `PersonalDay` submission writes a real `TimeClockRecord` row, T-057's job). Payroll now only
  ever reads `TimeClockRecord` — no second join, no double-counting once T-057 exists. Caught
  before it compounded into T-057; test updated to match (simulates T-057's bridge output
  directly rather than asserting the now-removed live-join behavior).

## Known divergence from the T-039 frontend mock, flagged not silently matched
- The mock's own overtime math (`payroll/page.tsx`) applies a **flat total-hours-over-40 per the
  whole report period**, not a per-week bucket — that's the legacy system's Formula B, which
  `calculations.md` §2 documents as *confirmed wrong* for any period longer than one week. The
  backend implements the business-rules doc's actual intent (real weekly bucketing) instead of
  matching the prototype's bug. Whoever wires the frontend to this real endpoint will need to fix
  the mock's overtime calc too — not this task's scope (backend-only, frontend not cut over yet,
  same precedent as T-046–055).
- Standard workday assumed at 8 hours for whole-day Personal Day requests — not stated explicitly
  anywhere in the approved docs; a reasonable default, flagged for developer confirmation if LBM's
  actual policy differs.

## Verification
- New `backend/test/payroll.e2e-spec.ts` (5 tests) — real skeleton Postgres, TDD'd (RED confirmed
  via 404 before implementation).
- Full backend e2e suite: **7 suites / 31 tests, all passing**, no regressions.
- `pnpm typecheck` / `pnpm lint` — clean.

## Real bug found and fixed while verifying (test infrastructure, not app code)
Running the full e2e suite (7 suites, up from 4 at session start) with Jest's default parallel
workers caused real failures against the shared skeleton Postgres database: two different suites
each create a Role literally named `"Admin"` (required — `RolesGuard` checks the JWT's exact role
*name* string, no `is_admin` flag to use instead), so concurrent workers collided on the unique
constraint; separately, concurrent Prisma WASM query-compiler initialization under load threw a
raw `RuntimeError: unreachable`. Fixed by adding `--runInBand` to `backend/package.json`'s
`test:e2e` script — e2e tests against one real shared database should run serially, not in
parallel workers. Also had to manually drop one orphaned physical tenant database
(`lbm_erp_tenant_e2e_test_tenant`) left behind by a crashed run from before this fix.
