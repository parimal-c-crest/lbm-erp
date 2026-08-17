# PurchaseHistory — Outputs

> Keep this file even if this module produces no documents/reports/exports — state that explicitly
> below rather than deleting the file. See `_deviations-from-original-template.md` in this folder.

Source: `docs_from_blueprint/module/PurchaseHistory/06-outputs.md`, itself traced to
`blueprint/module/PurchaseHistory/05-outputs-documents.md`.

## Applicability

This module produces exactly one output — a generic CSV export. Like SalesHistory, this module's own
directory contains no report screen, no PDF/print/email surface, and no alert-triage worklist of any kind (a
full grep across every file in the module for PDF/print/download signatures found zero matches). The only
file that could plausibly have been an output/reporting surface — a cron script (`fillinventorycost.php`)
found misplaced inside this module's own directory — was confirmed to be an entirely unrelated inventory-
turnover job that never references this module's own table at all, so it is not catalogued as a
PurchaseHistory output here (see `integrations.md`).

| Output | Purpose | Trigger | Required Data | Audience | Total-Source (if applicable) |
|---|---|---|---|---|---|
| Generic ListView CSV Export | Lets a user download the current (filtered/searched) set of weekly product/location purchase-activity-aggregate rows as a CSV. | User invokes the standard "Export" action from the module's own list view. | Every row's own field set, filtered by the caller's current list/search state plus an active-only (not-deleted) filter. | Internal (staff with export permission) | `total_activity` should be read as an already-recomputed, already-consistent persisted value, never a value accepted as direct caller input to a free-form edit endpoint (see `calculations.md`). |

The export's own row-source query joins the (confirmed-empty) custom-field extension table and the standard
attachment/owner-display tables — the same generic shape shared by every exportable module in the source
system. Unlike SalesHistory's own equivalent export query, this module's own query builder does **not**
itself substitute a joined line-code display name for the raw line-code value — that substitution, when it
happens, is performed generically by shared search/filter framework code, not by anything specific to this
module.

**No confirmed external report-layer dependency — a materially narrower footprint than SalesHistory's own.**
SalesHistory's own data feeds roughly a dozen purchasing/inventory-planning report files in the source
system. A repo-wide search for this module's own table name inside that same report-layer family returns
zero matches — despite several of SalesHistory's own report files having titles that sound
purchase-adjacent, none of them, nor any other file in that report family, was found to reference this
module's own data at all. This module's own purchase-activity data does not feed the same
purchasing/inventory-planning report family SalesHistory's own sales-activity data does — those reports
evidently derive their own purchasing-side inputs from the Purchase Line Item module's own data, not from
PurchaseHistory. **PurchaseHistory's own data has no confirmed external report-layer consumer of any kind
found anywhere in the source repository.**

## Open items

- Whether any code outside the source repository's own module tree (an external BI tool, a direct-database
  reporting connection, or a since-removed report file the blueprint's own grep could not catch) reads this
  module's own table — not determinable from a static repo grep alone.
- Whether the complete absence of a report-layer dependency reflects a genuine business decision
  (purchase-activity rollups were never built into the reporting layer the way sales-activity rollups were)
  or an incomplete/abandoned feature — not resolvable from static code reading alone.

(`docs_from_blueprint/module/PurchaseHistory/06-outputs.md` §6.1-6.4)
