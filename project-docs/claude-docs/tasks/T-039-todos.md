# T-039 — Payroll Report screen

Status: 2/2 complete

- [x] Date-range selector, per-user × per-hours-type table (Regular/Holiday/Personal/Sick/Vacation) + Overtime column (flat US 1.5x/40hr, ADR-036), computed fresh from `MOCK_TIME_CLOCK_RECORDS` on every render (never cached, FR-009). "Needs Resolution" badge on any user with an unclosed punch in range (ADR-037) — never silently omitted. No export action (ADR-078).
- [x] Verify: typecheck/lint clean; browser check — table renders with correct per-user totals, Adrian Solis's unclosed punch correctly flagged, no console errors.
