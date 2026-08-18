# T-038 — Personal Day/Time Off submission + admin Personal-Days listing

Status: 3/3 complete

- [x] `PersonalDayRequest` type + `MOCK_PERSONAL_DAYS` (2 seeded, one per shape) + `addPersonalDayRequest`.
- [x] Submission form: tab toggle between "Whole Day(s)" (date range + count) and "Partial Day (Hours)" (single date + start/end time) — two shapes sharing one entity (FR-010). Admin listing below, filterable by user.
- [x] **Real bug found and fixed during verification**: seed data for Priya Nair's vacation had `startDate` after `endDate` (an `isoAt()` offset-sign mixup) — the list rendered "2026-08-27 → 2026-08-25", a backwards range. Fixed the seed values; re-verified chronological order.
- [x] Verify: typecheck/lint clean; browser check — submitted a partial-day request, appeared correctly in the admin listing, no console errors.
