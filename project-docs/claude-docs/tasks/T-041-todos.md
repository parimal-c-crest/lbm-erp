# T-041 — CSV Import wizard

Status: 2/2 complete

- [x] 3-step wizard: Upload (file or paste, + sample-CSV loader) → Column Mapping (auto-detected headers, dropdown per column) → Validate & Process (per-row imported/excluded with specific reason — missing field, duplicate username/email — row-level exclusion, not all-or-nothing, FR-002).
- [x] Verify: typecheck/lint clean; browser check — sample CSV (1 clean row, 1 duplicate-username row, 1 missing-username row) produced exactly the expected 1 imported / 2 excluded with correct per-row reasons, no console errors.
