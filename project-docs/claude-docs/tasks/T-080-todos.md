# T-080 — Bulk Import/Export backend

Status: 4/4 complete

- [x] `POST /uom/groups/import` — per-row validation identical to an interactive Group save (VR-017), reuses `GroupsService.create` directly so BR-019's completeness check applies row-for-row
- [x] `GET /uom/groups/export`
- [x] Scoped implementation flagged: synchronous, not the full BullMQ progress-tracking/S3-expiring-file pattern — ADR-098's own ~2-minute sync-vs-background threshold covers UOM's reference-data volume; documented in `ImportExportService`'s header comment, not hidden
- [x] Frontend `UomImportExportDialog` rewired to call the real endpoints (step 9 rewiring, done alongside this task)
