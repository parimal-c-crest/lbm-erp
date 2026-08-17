# PurchaseLineItem — Outputs

> Keep this file even if this module produces no documents/reports/exports — state that explicitly
> below rather than deleting the file. See `_deviations-from-original-template.md` in this folder.
>
> Source: `docs_from_blueprint/module/PurchaseLineItem/06-outputs.md`, itself traced to
> `blueprint/module/PurchaseLineItem/05-outputs-documents.md`.

## Applicability

**Applicable, but this is the thinnest output surface of any module processed under this method to
date.** The module must be able to generate **exactly one** output/document type. There is no PDF
generation, no `wkhtmltopdf`/`html2pdf`-style rendering pipeline, and no email-delivered document anywhere
in the module's own files. Unlike some sibling modules, this module also has **no alert-triage worklist
screen of any kind** — consistent with the finding that no alert-flag/triage workflow exists on this
entity at all (see `workflows.md`).

| Output | Purpose | Trigger | Required Data | Audience | Total-Source (if applicable) |
|---|---|---|---|---|---|
| Generic ListView CSV Export | Standard "Export" action available from the module's own list view — lets a user download the current (filtered/searched) set of purchase-line snapshot rows as a CSV for use outside the application (spreadsheet analysis, vendor cost reconciliation, etc.). | User clicks the list view's "Export" control, invoking the module's own export-query builder through the same generic export controller shared by every exportable module in this codebase. | The export query substitutes two raw foreign-key/code columns for their human-readable joined equivalents before building the row source: vendor id → vendor name, transaction code → transaction-type display name. Filtered by the caller's current list-view filter/search state, plus a hardcoded "not deleted" clause. | Internal (staff with export permission) — no customer/vendor-facing surface | Reads whatever cost/extension values are currently persisted on the row — see below. |

## Total-source requirement for this output

The single output this module generates should read whatever cost/extension values are currently
persisted on the row — there is no separate "recompute at export time" concern the way SalesOrder's own
outputs carry, since this module's export is a raw data dump, not a document requiring a computed total.
The financial-consistency requirement that matters here is upstream, at write time (see `calculations.md`'s
6-writer computed-column redesign) — the export itself should simply read the already-correct,
already-persisted values.

## Open Questions

- Whether any of the five `Customreport`-module reports that separately consume this module's data (see
  `integrations.md`) themselves generate PDF or other document output — these files live outside this
  module's own scope and were not read in full in the source blueprint; flagged for a dedicated
  Customreport-focused investigation if one is ever scoped.
- **No open item exists regarding whether this module has an undiscovered second output surface** — the
  source blueprint's own grep swept every file in the module for PDF/print/forced-download signatures and
  found none beyond the one output cataloged above; this is a confirmed-clean negative finding, not an
  open question.
