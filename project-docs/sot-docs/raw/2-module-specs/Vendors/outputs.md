# Vendors — Outputs

> Keep this file even if this module produces no documents/reports/exports — state that explicitly
> below rather than deleting the file. See `_deviations-from-original-template.md` in this folder.

Source: `docs_from_blueprint/module/Vendors/06-outputs.md`, itself derived from
`blueprint/module/Vendors/05-outputs-documents.md`.

## Applicability

Applies, but narrowly and entirely to CSV exports. The module must be able to generate **three distinct
CSV export outputs**, and has **no PDF generation, no print/rendering pipeline, and no email-delivered
document** anywhere across its legacy file set — confirmed by a targeted search for print/PDF/
force-download signatures across every file in the module. All three outputs are independently
implemented (no shared export engine between them).

| Output | Purpose | Trigger | Required Data | Audience | Total-Source (if applicable) |
|---|---|---|---|---|---|
| Generic Vendors ListView CSV Export | Standard "Export" action from the Vendors list grid — lets a user download the current (filtered) set of vendor records as a CSV. | User clicks the ListView "Export" control; delegates entirely to the generic export controller shared by every exportable module. | Permitted detail-view fields (respecting field-level permissions) joined against the header, custom-field extension, attachment tables (vendor logo/image), and the active owner's name — filtered by the caller's current ListView filter/search state plus the standard not-deleted guard. | Internal (staff with Vendors export permission). | N/A — no calculated financial total involved. |
| Vendor Physical Address CSV Export | Lets a user download a single vendor's full physical (ship-from) address book as a CSV — narrower than the ListView export, scoped to the Physical Address sub-domain. | The same ajax endpoint used to render the vendor's address-picker dropdown branches on an "export lines" request parameter instead of returning dropdown markup. | All physical-address rows for the requested vendor, each row prefixed with the vendor number. The export branch does not seed a default row for a zero-row vendor (that seeding is confirmed to happen only in the dropdown-render branch) — a vendor with zero address rows exports a header-only CSV. | Internal only (staff managing a vendor's ship-from address book). | N/A. |
| Line-Code Mapping CSV Export | Lets a user download the vendor line-code / alias / description mapping shown in the line-code picker/listing widget — the same widget used from both Vendors and Products. | The line-code listing widget branches the same way as the address export: an "export lines" request parameter short-circuits the normal render and streams a CSV instead. | The full set of line codes computed from a per-request temp table (classification, subline/product-division data), plus per-line "vendor line code" alias and description lookups. | Internal only (same audience as the listing widget — vendors/products line-code management). | N/A. |

**Format detail** (both bespoke exports): CSV built with a shared CSV-building utility class
(comma-delimited, CRLF line endings, double-quote enclosure), streamed as a forced file download with
no-cache headers. The Physical Address export's header row is Vendor No / Street Address1 / Street
Address2 / City / ZIP Code / State / Country / Phone / Notes; the Line-Code Mapping export's header row is
Line Code / Vendor Line Code / Description.

**Note**: the Line-Code Mapping export was originally under-tagged in the source structural inventory
(tagged only as a UI/purchasing/cross-module concern, not flagged as an output) — a later dedicated outputs
pass found its branch structurally identical to the Physical Address export's (same CSV class, same
header-block pattern, same trigger convention), and corrected the omission.

**Print-detail-view URL — noted, not catalogued as a fourth output**: the vendor detail/edit views both
assign a generic "print this page" URL for UI chrome. This is the same module-agnostic mechanism present on
effectively every module's detail/edit views — it produces a browser print-styled page render, not a
generated document/PDF/file download, and carries no Vendors-specific logic.

**Confirmed no other output/document-generation surface exists**: a search across every file in the module
for PDF/print/download signatures, and separately CSV/export signatures, found nothing beyond the three
outputs above. The QuickBooks (OCS) sync is a data-sync integration, not a document/output surface, and is
out of scope for this file.

## Open items

- The line-code listing widget's alias/description lookup arrays feeding the CSV export are populated
  earlier in the same file than the range directly re-read for the outputs pass — a future investigation
  wanting the exact source query should read that earlier range.
- The physical-address export branch's header-only-CSV-if-zero-rows behavior was confirmed by static read
  only, not verified against actual runtime behavior.
