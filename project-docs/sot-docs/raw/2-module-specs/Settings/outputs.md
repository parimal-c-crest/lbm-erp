# Settings — Outputs

> Keep this file even if this module produces no documents/reports/exports — state that explicitly
> below rather than deleting the file. See `_deviations-from-original-template.md` in this folder.

Source: `docs_from_blueprint/module/Settings/06-outputs.md`, itself sourced from
`blueprint/module/Settings/05-outputs-documents.md` ("Pass 5 — Settings Output / Document Generation").

## Applicability

Applicable. Settings contains one genuine PDF-generation pipeline (Output 6 below — previously
mistagged by an earlier structural pass as generic "other, cross-module" content, not an output
surface) plus nine independent CSV/file-download endpoints, each hand-rolled with its own header block
(or, in two cases, no header block at all) — no shared export engine, no generic list-export mechanism
of the kind other, single-entity modules have for their own record lists (Settings has no
ListView-exportable "records" of its own in that sense). Two of the nine are not exports in the
generate-a-report sense at all — they are blob-download endpoints that stream back exactly the bytes a
user previously uploaded (the organization logo, a Word mail-merge template file), with no
transformation. Two further candidates investigated as output-shaped turned out, on full re-read, not
to generate any document at all — included in the catalog below marked N/A for completeness, per this
project's discipline of preserving ambiguity/negative findings rather than silently dropping them.

| Output | Purpose | Trigger | Required Data | Audience | Total-Source (if applicable) |
|---|---|---|---|---|---|
| Tax Table CSV Export | Lets an admin download the full tax-table configuration as CSV for offline review or handoff | Direct request — the whole source file is the export, no branching | Every row of the tax-table configuration, unfiltered | Internal (tax/admin configuration staff) | N/A — verbatim row dump, no totals computed |
| Zip-Code Master Import / Export | Maintains the organization-wide zip-code master used elsewhere for address validation/lookup; both directions live in one file, branched by request parameter | Import: file-upload request parameter present. Export: separate request parameter present | Import: uploaded CSV, 3 columns/row (zipcode/city/state), optional header-skip flag. Export: every zip-code-master row | Internal (system-admin configuration staff) | N/A. **Data-loss-risk characterization**: the import handler truncates the live table before processing a single row of the uploaded file, then inserts rows one at a time in the same request with no execution-time limit — see `risks-and-open-questions.md` R10 |
| WAC Change-Log CSV Export | Lets a user download the Weighted-Average-Cost change history as CSV — an audit-trail export | A specific task parameter on the WAC change-log list page | Change-log rows joined to product/location/user identifying data, filtered by the same search-criteria logic the listview's own grid feed uses | Internal (inventory/cost-audit staff) | N/A. **Notable divergence**: unlike every other export catalogued here, this branch sends **no HTTP header calls at all** before writing the CSV body — no `Content-Disposition`, `Content-Type`, or cache-control headers, meaning most browsers would render the CSV inline rather than triggering a file download (not verified against live runtime behavior, static read only) |
| Paint-Care-Fee Import / Sample-Template Download / Export | A full import/export/template cycle for paint-care-fee tier and per-state fee configuration — the most complete single-config-area output surface found in this module | Import: dedicated import function via the file's own ajax dispatcher, expecting an uploaded file. Sample download: dedicated function serving a static on-disk sample file. Export: dedicated export function | Import: uploaded CSV, 5 columns/row (tier number/title, state name/abbreviation, fee), optional header-skip flag — row-by-row upsert, not truncate-and-reload, so a partial-file failure only affects rows actually processed. Malformed/incomplete rows collected and returned as JSON rather than silently dropped. Export: fee rows joined to tier rows, both filtered to non-deleted | Internal (pricing/config admin staff managing state-level fee tiers) | N/A. Sample download: static file passthrough with three different Content-Type headers stacked in sequence (redundant/inconsistent, not itself harmful). Export: CSV with a header row, but a literal filename typo carried into the generated download filename |
| Custom Catalog CSV Export | Lets a user download parts-catalog data filtered by one or more line codes — an aftermarket/custom-catalog export distinct from the main product catalog | A POST with a selected line-code list; the same file also renders the export-selection form when not posted | Catalog rows joined to several lookup tables, filtered to active/non-deleted plus an optional line-code filter — queried via a **separate database connection** from the one used everywhere else in this module | Internal (catalog/parts management staff) | N/A. CSV header row includes a literal typo ("ProductNubmer"), streamed via native CSV-writing directly to the output stream — a third, distinct CSV-building implementation pattern within the module |
| Payroll Report PDF Generation | Generates a printable/downloadable PDF from an arbitrary HTML page-content payload — in practice used for payroll reports; the only place in this module that actually produces a PDF rather than a CSV | Any POST carrying a page-content payload and a username parameter — no task/mode branch, the whole source file is the pipeline | A pre-rendered HTML payload supplied by the caller (not built by this file itself), wrapped with a shared stylesheet reference | Internal (whoever generated the source report page — inferred payroll/admin staff) | N/A. Pipeline: delete any stale file for the given username, write the wrapped HTML to disk, shell out to an external HTML-to-PDF binary with fixed layout options, then stream the resulting PDF back if it exists, else echo a plain-text failure message. **No return-code check on the shell-out itself** — success is inferred purely from whether the output file exists afterward, not from the process's actual exit status |
| Word (Mail-Merge) Template Download | Lets a user download a previously-uploaded Word mail-merge template file exactly as stored — not a generated document, a stored-file retrieval | A request naming a specific template record | The template row's filename/filetype/binary content (base64-encoded in storage) | Internal (staff downloading a template to edit locally, or merge tooling in other modules that reads it before performing an actual merge) | N/A — blob passthrough, zero transformation of the stored bytes |
| Organization Logo Download | Streams the organization's stored logo image back as a download — structurally identical to the Word-template download but sourced from the organization's own profile row | A request with a file-id parameter (present in the request shape but not actually used by the query, which just selects the one existing org-details row regardless) | The organization's single logo filename/binary-blob columns | Internal (rendering/downloading the company logo used elsewhere in branding configuration) | N/A — raw image bytes, passthrough, same shape as the Word-template download |
| *(Pass 0 mistag correction — not an output)* | An FTP-export settings page (outbound host/credentials/folder configuration shared by EDI trading-partner export jobs) plus a small date-range-window admin table — confirmed by full re-read to generate no document, PDF, or CSV of its own; a function name suggesting CSV-date listing returns an HTML table string for in-page display, not a file | N/A — not an output-generation surface | N/A | N/A | N/A |
| *(Not an output — operational log viewer)* | A DataTables-backed viewer over a data-warehouse export-run history log, plus a re-trigger action that re-fires an **external** export process via an outbound call to a separate script outside this module — an operational "retry a failed export" trigger, not a document-generation step in its own right | N/A — not an output-generation surface | N/A | N/A | N/A |

## Word / Email / PT Template Outputs — authoring surfaces only; document generation happens elsewhere

Settings' template-management files (Word templates, email templates, pick-ticket zone-printer
templates, document folder management) were investigated specifically as *outputs* — what, if
anything, do they actually produce as a deliverable document.

- **Word templates**: saving a template stores the **uploaded file's raw bytes verbatim**
  (base64-encoded) alongside its filename/filetype/filesize. There is no placeholder-substitution,
  merge-field validation, or any other transformation performed on the file content at save time —
  Settings' role is pure file storage plus metadata bookkeeping. Downloading it back returns those
  exact bytes unchanged. **No "generate a filled-in document from this template" action exists
  anywhere in Settings.**
- **Where the actual merge happens**: per-entity template-merge controllers exist in several *other*
  modules (Accounts, Contacts, HelpDesk, Hrm, Leads, Utilities). A direct read of the Accounts module's
  own merge controller confirms these are the actual document-generation entry points: each fetches a
  stored template row by id, writes its content to a local temp file, and drives a legacy
  **ActiveX-based mail-merge control**, gated behind an "older Internet Explorer on Windows" browser
  check — a pre-modern-browser, likely-unusable-today mechanism. Regardless of whether this legacy
  merge path still functions in any currently-supported browser, it confirms the architectural answer:
  **Settings is purely a template-authoring/storage surface; template-driven document generation, such
  as it exists at all, is implemented per-entity in the consuming modules, not in Settings.**
- **Email templates**: CRUD over an email-templates table (folder/name/description/subject). Like Word
  templates, this is authoring/storage only — Settings never sends an email or renders a filled
  template body. The one place an email template is *used* rather than authored within this module's
  own files is a status-manager association that links a template to a Sales-Order sub-status change
  notification rule — but the actual send/render presumably happens in the SO status-change workflow,
  outside this module.
- **PT (pick-ticket) zone-printer templates**: configuration only — which zone prints to which
  printer, on what schedule. No document or file is produced by this mechanism.
- **Document folder management**: general-purpose document attachment/folder CRUD — storage/attachment
  mechanics, not document generation.

**Conclusion**: Settings' Word/Email/PT template surfaces are entirely template-authoring and storage.
The only place a *document* (as opposed to a config record) comes out of these template systems within
Settings itself is the raw stored-file download; actual "fill this template with record data" document
generation is implemented elsewhere.

## Open Questions

- Whether an interrupted CSV export from the WAC Change-Log output actually forces a download in
  practice despite the missing headers was not verified against live runtime behavior — only confirmed
  by static read that no header call precedes the CSV write.
- Whether the PDF pipeline's shell-out ever leaves a stale/partial PDF file that would cause a false
  "success" report was not verified — the file's own logic checks only for file existence, not process
  exit status, and no runtime test was performed.
- The Custom Catalog export's separate database connection's provisioning and multi-tenancy scoping was
  not traced — confirmed distinct from the module's primary connection, but not confirmed scoped the
  same way.
- Whether the legacy ActiveX mail-merge mechanism is still functional in any modern browser, or has
  been supplanted by a newer mechanism in any of its six consuming modules, was not verified — out of
  scope for a Settings-focused investigation, but relevant context for whichever module's own spec
  eventually addresses template-driven document generation.
