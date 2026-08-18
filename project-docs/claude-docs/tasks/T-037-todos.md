# T-037 — Time-Card override screen

Status: 3/3 complete

- [x] `TimeClockRecord` type + `MOCK_TIME_CLOCK_RECORDS` (4 records, one deliberately `unclosed_needs_resolution`, ADR-037) + `overrideTimeClockRecord` (clock-out-after-clock-in validation, `6-validation.md` §4).
- [x] Override page: table (User/Punch Date/Clock In/Clock Out/Status), "Needs Resolution" badge on the open punch, per-row Override dialog (datetime-local inputs).
- [x] **Two real bugs found and fixed during verification**:
  1. Hydration mismatch — `toLocaleDateString()`/`toLocaleTimeString()` called without an explicit locale render differently server vs. client (Node ICU vs. browser). Fixed by passing `'en-US'` explicitly everywhere (matches the convention already used in `dashboard/page.tsx`) — also retroactively fixed the same latent bug in T-029's User Detail audit-trail dates, which hadn't been caught yet.
  2. Unhandled `RangeError: Invalid time value` crash — `handleSave` called `.toISOString()` on a `Date` built from an empty/invalid datetime-local value with no validation first. Fixed by validating both dates before use and showing a friendly inline error instead of throwing.
- [x] Verify: typecheck/lint clean; browser check — overriding Adrian Solis's unclosed punch correctly resolved it to "Closed", no console errors on re-test.
