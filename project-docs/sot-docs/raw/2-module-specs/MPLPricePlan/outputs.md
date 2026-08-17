# MPLPricePlan — Outputs

> Keep this file even if this module produces no documents/reports/exports — state that explicitly
> below rather than deleting the file. See `_deviations-from-original-template.md` in this folder.

Source: `docs_from_blueprint/module/MPLPricePlan/06-outputs.md`.

## Applicability

This module has an output surface, but an unusual one: **no PDF generation, no email-delivered document,
and no rendering pipeline for a printable document** anywhere in the module — this is an internal utility
module, not a customer-facing document-producing one. Its one nominal "export" feature is **structurally
non-functional**, not merely unsafe or thin — a confirmed functional defect, not merely a thin feature, so
this file is still filled in below rather than marked N/A.

| Output | Purpose | Trigger | Required Data | Audience | Total-Source (if applicable) |
|---|---|---|---|---|---|
| Plan ListView grid (interactive UI, not a document) | The standard grid of all MPL Price Plans (name, description, penny-round default, etc.) — the module's main navigation surface. | Opening the module's default entry point. | Standard list-driven query against the plan header table. | Internal (merchandising/pricing administration staff with module access). | N/A |
| Plan Edit screen — Level Grid + Rule Section (interactive UI, the module's real "output" for a merchandiser) | The module's actual working surface: a plan's per-pricing-level Take/Formula/Value grid, plus the Rule List — both loaded as ajax fragments into the same edit page, not separate documents. | Opening any plan for editing. There is no read-only view of a plan at all — the module's own detail-view slot is only a redirect to the edit screen; every "view" of a plan is functionally an edit session. | This plan+location's formula-grid data, the fixed Take/Formula option lists, the list of other tenant locations (for the "copy to" checkbox UI); this plan's live (non-deleted) rule rows with per-row scope-selection detail. | Internal (merchandising/pricing administration). | Whatever data a real export/reporting surface reads should read the same server-computed grid data the pricing engine itself consumes — see Total-Source Requirement below. |
| CSV export — structurally broken, non-functional | As designed: the standard ListView "Export" action, letting a user download the current set of plans as CSV. | The ListView "Export" action. | Would need a real query against the plan header's actual columns; the module's own query builder instead returns a literal, incomplete placeholder string (see MPL-RULE-004 in `business-rules-and-validation.md`). | Internal — but non-functional as designed. | **Confirmed impact**: this feature is non-functional — clicking it would surface a database error or an empty/broken file, not a working CSV download (exact user-visible failure mode not confirmed, see Open Items). |
| Rule List datatable server-side pagination (interactive UI, not an export) | Feeds the Rule Section's paginated/sortable grid — a distinct ajax "data output" endpoint, cataloged here for completeness. | Loading or paging/sorting the Rule List grid on a plan's edit screen. | This plan's live rule rows, each pre-rendered with inline scope-selection controls and date-picker widgets. | Internal (merchandising/pricing administration). | N/A |

## Total-Source Requirement

Per this module's own governing calculation requirement (see `calculations.md`): whatever data a new
implementation's export or reporting surface reads should read the same server-computed, already-validated
grid data the pricing engine itself consumes — not a separately maintained snapshot that could drift from
what a sale line actually prices against.

## Open Items

- **What the shared, generic export-handling mechanism actually does when handed the module's
  syntactically invalid export-query stub** — whether it surfaces a raw database error to the end user,
  fails silently with an empty file, or is caught somewhere upstream — was not traced in the source
  blueprint; needed to fully characterize the export feature's user-visible failure mode.
- **Whether the export stub's broken state is a work-in-progress left mid-development, or a feature nobody
  has exercised in production long enough to notice is broken** — not resolvable from static code; the
  near-total absence of standard field-label registration on this module's own columns and the module's
  generally thin generic-CRUD polish elsewhere (e.g. the empty standard delete-action slot) is at least
  consistent with "export was never finished," but this is inference, not a confirmed finding.
