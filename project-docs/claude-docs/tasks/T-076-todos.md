# T-076 — Conversion Factor History backend

Status: 3/3 complete

- [x] BR-009 write-on-change — history row written inside the same `GroupsService` transaction as any Conversion Factor value change (on both create and update)
- [x] `HistoryService`/`HistoryController` — effective-dated lookup with optional `asOfDate`
- [x] Partial unique index (`effective_to IS NULL`) enforced at DB layer for "currently effective" row
