# Location — Outputs

> Keep this file even if this module produces no documents/reports/exports — state that explicitly
> below rather than deleting the file. See `_deviations-from-original-template.md` in this folder.

Source: `blueprint/module/Location/05-outputs-documents.md` via
`docs_from_blueprint/module/Location/06-outputs.md`.

## Applicability

Applies, narrowly. The module produces six output/document capabilities, all internal UI screens or
ajax fragments — **not** customer-facing printed documents, and not PDFs. Unlike SalesOrder (a shared
invoice-rendering entry point) or Accounts (a shared statement-generation class), this module has **no
shared document/rendering engine of any kind**, confirmed as not an oversight: every output below is
an independent, self-contained UI fragment renderer or ajax handler; none call into a common "build a
document" function, none produce a PDF, and none write a file to disk for later delivery. This
confirms Location's framing as an internal inventory-scoping dimension, not a customer-facing entity —
its "outputs" are internal UI screens/ajax fragments a staff member uses while managing product/branch
data, not documents that leave the building.

| Output | Purpose | Trigger | Required Data | Audience | Total-Source (if applicable) |
|---|---|---|---|---|---|
| Lost Sale Log Report | Internal home-page report showing per-product/per-branch lost-sale events for a given week, with inline controls (reorder level, reorder-alert flag, cost, "track SH" flag, lost-sale factor) so a manager can act on the row directly from the report. A UI report/grid screen with inline-edit ajax actions, not a document generator — an earlier structural-inventory pass mistagged this as a PDF output on the strength of its name; a full read confirmed no PDF generation, no file written to disk, no print-styled page. | Navigation to the report (typically from a home-page portlet) opens a modal/popup grid. | Per-product/per-branch lost-sale rows for the current week, plus the row-action fields above | Internal (management/inventory staff) | No aggregate total. The one arithmetic step present (a lost-sale-factor recomputation) is a live recomputation in this same screen, not a value carried from a formula field. |
| Lost Sale Alert Dismiss (ajax companion) | Lets a user dismiss ("clear") one lost-sale alert row from the report grid without a full page reload. | An inline dismiss action on the Lost Sale Log Report's grid. | The target alert row id | Internal (same staff user acting on the report) | N/A — a single field update, no computation. |
| Product-at-Location Display (read-only detail surface) | Renders the "Location Details" panel on the Products-module detail view for whichever branch is currently selected — QoH, reorder settings, pricing/cost fields, lot-number info, and unit-of-measure-converted quantity/price displays. The **display half** of the Product-at-Location composite entity's detail surface — since this entity has no independent identity of its own, there is no standalone detail view/URL a user can navigate to directly; this is where its read view actually lives, reachable only from inside the Products module. | Included/rendered from the Products-module detail-view flow, not an independently routable URL. | The selected product's Product-at-Location row for the currently-selected branch | Internal (staff viewing a product's per-branch detail from the Products module) | Displays stored field values as loaded — no recomputation of QoH/cost/pricing totals happens here; the one transformation is a unit-of-measure conversion at render time, not a business-rule recalculation. |
| Product-at-Location Edit (editable form surface) | The editable counterpart to the Display output — renders the per-branch QoH/reorder/pricing/pass-on-field input form embedded in the Products module. The **edit half** of the same composite entity, confirming this entity's whole read/edit surface is reachable only through the Products module, never independently. | Same as the Display output — included from the Products-module edit flow, not an independently routable URL. | The selected product's Product-at-Location row for the currently-selected branch, plus the Location Pass-On Field Configuration for the "pass values to other locations" mechanism | Internal (staff editing a product's per-branch fields from the Products module) | N/A — a form-input renderer, not a computation or document. Saves are handled by this module's own save entry point (`business-rules-and-validation.md` LOC-RULE-001-006). |
| Cost Detail Ajax (tooltip/audit-string fragment) | A small ajax hover-tooltip endpoint on the Products/Location detail panel: for the QoH field it returns a configured tooltip string; for any other tracked field it returns a "field updated on [date] at [time] by [user]" audit string, sourced from that field's own paired change-tracking columns. | An ajax call (presumably a hover/tooltip trigger, not confirmed — the calling UI markup was out of the source blueprint's scope). | The target field name and the row's paired change-tracking columns | Internal | N/A — plain string echo of a stored value or a formatted audit string; no computation. |
| Export / CSV capability — none found | A confirmed absence, not an oversight: no file in this module writes a CSV, streams a force-download, or delegates to the generic export handler the way other already-blueprinted modules' address/contact-style exports do. No listview export, no address-style CSV extract, no mail-merge data feed of its own — consistent with the module's role as a per-product/per-branch dimension row, not an independently reportable business entity. | N/A | N/A | N/A | N/A |

## The real document adjacent to the Lost Sale Log Report

The lost-sale promotion cron (`calculations.md` §8) is not itself a document output, but the Lost Sale
Log Report unconditionally triggers a separate admin-notification function on **every plain page load**
with no `opt` query parameter set — an admin lost-sale notification email built and sent via its own
helper. That helper's internals (email body construction, recipient list, HTML/plain-text, whether it
has an attachment) were not independently re-read in the source blueprint — only its existence and
signature-level purpose were confirmed. Flagged as a Known Gap below and separately as a risk in
`risks-and-open-questions.md` for its unbounded send-frequency (firing on every ordinary page load, not
a controlled schedule).

## Known Gaps

- **The admin lost-sale-notification email as a document output** — its existence and
  signature-level purpose are confirmed, but a full characterization (audience, HTML vs. plain-text,
  attachment, and — critically — whether its every-page-load trigger cadence is intentional) was never
  attempted.
- **The ajax caller of the Cost Detail tooltip endpoint** — the client-side code that invokes this
  endpoint was not located; the exact UI trigger point is inferred, not confirmed, since template
  markup was out of the source blueprint's scope.
- **The row-fetch query for the Lost Sale Log grid itself** — the query that populates the report grid
  (as opposed to the row-action handlers, which are fully documented) lives in template markup out of
  the source blueprint's scope, so the grid's exact filter/column set is not documented here.
