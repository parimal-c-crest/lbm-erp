# T-057 — Personal Days & Holidays backend (EPIC-005)

Status: Done

## What was built
- `backend/src/users/personal-days/` — `POST /personal-days` (self-service). Creates the
  `PersonalDay` record, then bridges it into one or more real, already-closed `TimeClockRecord`
  rows at submission time — the documented mechanism (`8-api.md` POST /personal-days, FR-010 Main
  Flow), not a live join at report time.
  - Whole-day (`dayCount`/`startDate`..`endDate`): one 8-hour `TimeClockRecord` per calendar day
    in range (09:00–17:00, a documented assumption — no SoT source states the standard workday
    length).
  - Partial-day (`startTime`/`endTime`): one record for that day with the exact elapsed hours.
  - Cross-field validation (`6-validation.md` §4): `endTime <= startTime` rejected `400`.
- `backend/src/users/holidays/` — `GET /holidays` (any authenticated user), `POST /holidays`
  (Admin-only, optional `userIds[]` to assign in the same call).

## Correction made to T-056 before it could compound
Re-checking the docs while starting this task surfaced that T-056's payroll report had built the
Personal-Day bridge the wrong way — a live join against `PersonalDay` at report time, when the
approved docs specify the bridge happens once, at submission (this task). Fixed immediately:
removed the live join from `PayrollService`, updated its test to simulate this task's actual
bridge output instead. Payroll now reads only `TimeClockRecord`, so there's exactly one bridge
point, not two — no double-counting risk once this task shipped.

## Real doc/schema gap found and resolved (flagged, not silently decided)
`docs-kit/5-modules/users/4-schema.md` §3 describes `Holiday`/`HolidayAssignment` ("system-wide
holiday catalog + per-user observed-date assignment") but §4 (Table Definitions) never gave it
column-level detail — the only module entity with that gap. T-046 silently didn't migrate it as a
result. Added `Holiday { id, name, date }` / `HolidayAssignment { holidayId, userId }` to
`prisma/schema.prisma` as this task's own minimal design (unique `(name, date)`, unique
`(holidayId, userId)`) and migrated both `lbm_erp_skeleton` and `lbm_erp_dev` via the same
`prisma migrate diff --script` process T-046 used. **Logged as raid-log R-005** — developer should
confirm this shape, since the same doc gap could recur for other under-specified entities.

## Verification
- New `backend/test/personal-days.e2e-spec.ts` (3 tests) + `holidays.e2e-spec.ts` (3 tests) — real
  skeleton Postgres, TDD'd (RED confirmed via 404 before implementation).
- Full backend e2e suite: **9 suites / 37 tests, all passing**, no regressions.
- `pnpm typecheck` / `pnpm lint` — clean.

## Known limitations, flagged not hidden
- Holiday assignment doesn't itself feed payroll or the time clock — it's a catalog/roster only,
  matching the doc's own "per-user observed-date assignment" framing (no functional-spec language
  ties it to automatic PTO/pay). If LBM expects holidays to auto-generate paid-holiday
  `TimeClockRecord`s, that's a separate, undocumented requirement — not assumed here.
- 8-hour standard workday for whole-day Personal Day requests is the same assumption T-056's now-
  removed bridge used — carried forward here since this is now the actual place that decision
  lives.
