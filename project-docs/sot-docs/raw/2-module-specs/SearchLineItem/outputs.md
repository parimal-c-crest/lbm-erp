# SearchLineItem — Outputs

> Keep this file even if this module produces no documents/reports/exports — state that explicitly
> below rather than deleting the file. See `_deviations-from-original-template.md` in this folder.

Source: `docs_from_blueprint/module/SearchLineItem/06-outputs.md`
(`blueprint/module/SearchLineItem/05-outputs-documents.md`, Doc1 Pass 5).

## Applicability

Applicable, but the thinnest output surface of any module carried through this series so far. There is
**no PDF generation, no document-rendering pipeline, and no email-delivered document** anywhere in this
module's files — confirmed both by a targeted search of the module for print/PDF/forced-download
signatures and by the module's own structural inventory finding no such call. Exactly one true document/
export surface exists (a generic CSV export), plus one alert-triage UI screen that is not a document
despite its filename. Nothing in this module leaves the system as a PDF, fax, or formatted business
document the way SalesOrder's invoices do — consistent with SearchLineItem's role as an internal search/
lookup and alert-triage utility, not a customer-facing document-producing module.

| Output | Purpose | Trigger | Required Data | Audience | Total-Source (if applicable) |
|---|---|---|---|---|---|
| Generic CSV Export | The module's standard list-view "Export" action — lets a user download the current (filtered/searched) set of line-item snapshot rows as a CSV for use outside the application (spreadsheet analysis, bulk data handoff). | User clicks the list-view "Export" control, invoking the module's own export-query builder. | The export builder substitutes several raw foreign-key/code columns for their human-readable joined equivalents before building the query: counter person → user name, transaction code → display name, master account → account name, job → job name, line code → line-code name, subline → subline name, and sales person → a concatenated first/last name — the same "swap foreign-key ids for display names" pattern seen across every other exportable module in this codebase. Filtered by the caller's current list-view filter/search state. | Internal (staff with export permission) | N/A — see "Total-source note" below; this output does not read an order-level total. |
| Superseded/Return Alert Worklist (*not a document, catalogued for completeness*) | Surfaces the live queue of "superseded product still pending a return/quantity-on-hand-combination decision" alerts as an on-screen worklist, and lets a user dismiss (individually or in bulk) alerts already acted on — the sole UI/consumer surface for the `supersedereturn` flag. | Loaded as an ajax fragment on demand; dismissal (individually or bulk) is the same endpoint with the flagged row ids submitted, subject to the confirmed SQL-injection and missing-state-guard findings documented in `business-rules-and-validation.md` (SLI-RULE-014/015). | Joins the flagged rows against Products' and Location's own supersession data to pull, per flagged line: SO number, SO date, location, superseded-product link, current quantity-on-hand, superseding-product reference, and two combined-stock-on-hand/quantity-on-hand flags. | Internal only — staff responsible for working the superseded-product/return-alert queue | N/A |

## Why the worklist is not a document

Despite its filename and its "Report" framing in its own UI (browser title, headings, an "Action Taken,
Remove Selected" button), the supersede/return worklist is **not a document or printable report** — it
is an interactive alert-triage grid. It queries currently-flagged rows and renders them as an inline
table echoed directly into the page (no templating system, no PDF, no forced-download header, no
download of any kind); each row and the whole set are wired to an ajax "dismiss" action that flips the
underlying flag back to not-flagged and reloads the page to re-render the now-shorter list. This is the
same pattern found for at least one other module blueprinted in this series (a `*Report.php`-named file
that turned out to be a functionally live, mutable UI worklist, not a generated document a user would
print, save, or hand to someone outside the system).

**There is no equivalent screen for the module's other alert flag** (`oversalealert`) — that flag has no
dismiss UI or report page at all anywhere in this module; its three read-only consumers (an oversale-list
report and two Home-dashboard widget-count queries) all live outside this module entirely.

## Total-source note

Unlike SalesOrder's ten outputs, none of this module's two output surfaces reads or displays an
order-level "total" figure of the kind SalesOrder's server-side-recomputation requirement governs — the
CSV export and the alert worklist both operate on already-persisted, per-line snapshot fields, not a
computed order total. The governing requirement that applies here instead is the single-authoritative-
calculation-service requirement (R2, see `calculations.md`): both outputs should read margin/extension
figures that were computed exactly once, by exactly one service, never independently re-derived by the
export or worklist rendering logic itself.

## Output open items

- Whether the supersede/return worklist's HTML table is ever consumed outside its live ajax-fragment
  context (e.g. printed via a browser's native print function, or copy-pasted elsewhere) was not
  traceable statically — the code provides no print stylesheet, export button, or download path of its
  own, so any such use would be an ad hoc user action outside the application's own affordances.
- No dismiss/report UI exists for `oversalealert` at all — reconfirmed here from the output-surface
  angle (the fuller reachability question around its one candidate dismiss mechanism, which lives
  outside this module, is carried forward as a risk item in `risks-and-open-questions.md`).
