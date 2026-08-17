# SalesHistory — Outputs

> Keep this file even if this module produces no documents/reports/exports — state that explicitly
> below rather than deleting the file. See `_deviations-from-original-template.md` in this folder.

Source: `docs_from_blueprint/module/SalesHistory/06-outputs.md`, tracing to
`blueprint/module/SalesHistory/05-outputs-documents.md`.

## Applicability

This module produces one output type — the thinnest in-module output surface of any module documented
in this series so far. A search across every file in the module's own directory for PDF/print/
forced-download/email signatures found **zero matches** — no PDF generation, no report/alert-triage
worklist screen, no fax or email integration.

| Output | Purpose | Trigger | Required Data | Audience | Total-Source (if applicable) |
|---|---|---|---|---|---|
| Generic ListView CSV Export | Standard export action available from the module's own ListView grid — lets a user download the current (filtered/searched) set of weekly product/location activity-aggregate rows as a CSV. | User invokes the ListView's "Export" control, driving a generic, shared export controller used by every exportable module in this codebase. | Row source built by the entity class's own export-query builder: substitutes the raw line-code foreign-key column for its joined display name in the permitted-fields list; joins the (confirmed empty) custom-field extension table, the attachment tables, the owner/user table, and the line-code lookup table; filtered by the caller's current ListView filter/search state plus a hardcoded not-deleted condition. | Internal (staff with SalesHistory export permission) | Reads an already-computed, already-persisted `total_activity` value — this output does not itself perform any calculation. Per the "one authoritative formula" requirement (`calculations.md`), once that formula is owned by a single authoritative service, this export simply reads whatever value that service has already persisted. |

## Cross-Module Read Consumers (not produced by this module)

This module's data has a reporting surface beyond its own output — but that surface is not something
SalesHistory itself produces:

- A substantial family of report files, living entirely outside this module's own directory, read this
  module's data for purchasing/inventory-planning purposes — order-point calculations, suggested-buy
  thresholds, stock-buy reports, and similar use cases. These are cross-module read consumers,
  documented in `integrations.md`.
- Only one of these external report files was confirmed by direct citation to actually query this
  module's core table; roughly a dozen further filenames were found by name/grep only, strongly
  implying (by naming convention) but not independently confirming a dependency on this module's data.
- A separately-named "Sales Rank" feature family (a module and cron scripts named analogously) is
  referenced only by a session-key naming convention this module's own ListView writes — whether that
  feature genuinely consumes this module's data was not confirmed by direct SQL citation anywhere in
  the source blueprint.

## Open Items

- Whether the ~12 unopened, filename-only-confirmed report files genuinely read this module's core
  table, and in what output shape (on-screen grid vs. PDF vs. CSV vs. scheduled/emailed report) — not
  determined in the source blueprint; only one file confirmed by direct citation.
- Whether the "Sales Rank" feature family actually queries this module's data, or computes its own rank
  concept from an entirely separate source — the session-key naming is suggestive but not proof of a
  real data dependency.

(Source: `docs_from_blueprint/module/SalesHistory/06-outputs.md`, full file.)
