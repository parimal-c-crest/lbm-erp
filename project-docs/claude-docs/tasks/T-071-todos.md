# T-071 — Import/Export dialog wiring for UOM Groups

Status: 3/3 complete

- [x] Searched `frontend/src/components/shared/` for an existing import/export component — none exists (Users' CSV Import, T-041, is a standalone page, not a reusable Dialog) — built `UomImportExportDialog.tsx` as the first instance of the shared Dialog pattern
- [x] Upload + column-mapping (import), format/scope (export, CSV inline since the sandbox blocks script-driven downloads)
- [x] Per-row validation-result display incl. BR-019 completeness failures; wired into Group List's "Import / Export" button
