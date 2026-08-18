# T-040 — QuickBooks sync status screen

Status: 2/2 complete

- [x] `QuickBooksSyncRecord` type + `MOCK_QUICKBOOKS_SYNC` (synced/pending/error spread across all 14 users). Per-user status table (QB List ID, last synced, error detail).
- [x] Verify: typecheck/lint clean; browser check — all three status states render correctly with the right tone/detail, no console errors.
