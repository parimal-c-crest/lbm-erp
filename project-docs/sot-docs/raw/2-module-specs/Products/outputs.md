# Products — Outputs

> Keep this file even if this module produces no documents/reports/exports — state that explicitly
> below rather than deleting the file. See `_deviations-from-original-template.md` in this folder.

## Applicability

This module **produces real outputs** — applicable, not N/A. Per
`docs_from_blueprint/module/Products/06-outputs.md` (Doc1 §05 / Doc2 §6), the module must support nine
distinct output/document types, covering label printing, data-integrity/reporting exports, an audit
report, a nightly snapshot job, a UI-shell listing, a delegated sales-history view, and a generic
listview export. See the catalog below for all nine, and "## Architecture notes" for two cross-cutting
facts that apply to every row: **none of the nine produce a server-side PDF today** — every output is
HTML or ZPL/EPL printer-control text handed to a client (browser print dialog, a local QZ-Tray-style
print client, or PrintNode) for final rendering — and every output that displays a price/cost/margin
figure must source it from this module's `calculations.md` pipeline, never from a caller-supplied value.

| Output | Purpose | Trigger | Required Data | Audience | Total-Source (if applicable) |
|---|---|---|---|---|---|
| 1. Product Label Printing — Avery sheet / label-tape (client-rendered HTML) | Prints physical product labels — barcode, product number, line code, price, bin/zone, company logo, optional QR code — onto Avery sheet stock or a label-tape printer, for a single product, a whole receiving/PO/SO line, a whole line-code, or a whole POS-selected product list. | An action selecting the print scope (single product; a whole line-code filtered by quantity-on-hand/reorder-alert/min/max/order-point; a purchase-order line; a sales-order line; a POS-selected line) plus label-geometry and labels-per-item parameters. | Line code, product number (canonical and normalized), barcode, product name, the current location's bin/zone (or a WMS-resolved address), an optional per-price-level sell price, company logo/address. Barcode images and QR codes are generated on the fly. | Internal (warehouse/receiving staff printing shelf/bin labels) | The displayed sell price must come from the MPL price-resolution pipeline (`calculations.md` Stages 1–3) — per the source's stated total-source requirement (§6.3), never a caller-supplied value. |
| 2. Product Label Printing — ZPL / EPL (thermal printer-language label, PrintNode-aware) | The same labeling need as Output 1, for thermal/industrial (Zebra/Eltron) label printers that consume printer-control-language strings instead of an HTML sheet — the operational path for warehouse thermal printers as opposed to office Avery-sheet printing. | A request selecting the format/scope (single product; line-code-wide, quantity/reorder/min/max/order-point-filtered variants; purchase-order line; sales-order line; POS line; receiving; a WMS-specific variant). | Same base product/barcode/pricing/location fields as Output 1, plus a barcode-position calculation used to position the barcode within a fixed-layout printer-language template. | Internal (warehouse/receiving/WMS staff) | Same as Output 1 — MPL price-resolution pipeline (`calculations.md` Stages 1–3). Delivered via one shared cross-module PrintNode integration point (see Architecture notes below), reached through two inconsistent code paths — flagged for consolidation in the new design, not a two-mechanism port. |
| 3. Duplicate Barcode Export (CSV) | Lists every product whose barcode (unit/inner-case/case) collides with another product's barcode — a data-integrity report for cleaning up ambiguous/duplicate barcodes. | A request specifying which barcode field to check. | Linecode, product number, and barcode for every colliding row, sourced from a join against the barcode-duplicate staging data. | Internal (staff auditing barcode data quality) | N/A — no total figure. **Not carried forward as a standing output in the new design**: under the new barcode-uniqueness domain invariant (see `entities-and-fields.md`), duplicates cannot exist post-migration, so this report has no findings to ever surface going forward. A one-time migration-tooling export of *migration-time* conflicts remains a legitimate need, addressed as a migration-tooling concern rather than a standing catalog output. Whether any standing audit capability should still be preserved was not explicitly resolved beyond that decision (flagged open). |
| 4. Physical Inventory (PI) Count Variance Report | Compares counted quantity against system quantity-on-hand, by product/location, scoped by count name/batch/department/class/fineline filters — the reconciliation document a manager reviews after a physical count to decide whether to post the count's quantity-on-hand adjustments. | A two-step flow: build the variance dataset (filtered by count/batch/department/class/fineline), then a separate action that triggers the printable/downloadable rendering. The two-step flow itself was inferred from a shared request-parameter convention, not an observed client-side call chain — flagged open. | The count event's identity and date/posted status, joined against the count-batch data and product identity, filtered by the requested batch/department/class/fineline scope. | Internal (inventory/management staff reviewing count results) | **Unconfirmed / open**: the variance-total aggregation math itself was not read in the source blueprint — only the filter/query-construction portion of the underlying function was traced; the actual counted-vs-quantity-on-hand variance calculation is not documented here because it was not confirmed. |
| 5. Core/Warranty Quantity Change Report | A same-day audit report listing every product whose "core quantity" or "warranty quantity" tracking field changed today at the current location — who changed it, when, old/new value — for reviewing same-day core-charge/warranty-tracking adjustments. | Direct navigation, selecting which of the two datasets (core or warranty) to display. | The relevant quantity-change tracking fields joined to product/location/user identity, filtered to the current session's location and to today's date. | Internal (staff/management reviewing same-day changes) | N/A — no aggregate total figure; it is a row-level change listing. |
| 6. Last Seven Days Inventory (nightly snapshot, no interactive output of its own) | Not itself a document — a nightly cron that inserts one inventory-value snapshot row per location into an inventory-log table (total/product-only/core-only value, at both last-cost and weighted-average-cost), presumably read back by some other listing/report to answer "last 7 days of inventory value." | A nightly cron run (or a manual browser-triggered run). | Aggregated quantity/cost data joined across location and product tables, excluding certain location types. | None directly — an unattended data-collection job. The downstream consumer of the log table was not located in the source blueprint (flagged open). | This is one of the few outputs across the whole blueprint-consolidation series that **computes a live aggregate rather than trusting a stored total** — worth preserving that property in the new design. Uses weighted-average cost, which must trace to the Global-WAC pipeline (`calculations.md` Stage 6), itself flagged with a confirmed formula defect pending sign-off. |
| 7. Lot Number Listing (a UI shell only, no export/print logic of its own) | The listview page shell for browsing lot-tracked product/lot-number rows — confirmed by direct read to contain no query, export, or print logic of its own. | Direct navigation to the listing page. | Only a couple of display-toggle flags; the actual lot-number row data lives in whatever endpoint backs the listing template, not located in the source blueprint's read scope (flagged open). | Internal | N/A — no total figure documented; the underlying data source itself is unconfirmed. |
| 8. Sales History display (delegated entirely to another module) | Products-side entry point for viewing a product's sales history — the actual implementation lives in the PurchaseOrder/Forecasting capability. | N/A — a pure delegation. | N/A in this file. | N/A in this file. | N/A — any sales-total computation belongs entirely to the delegated-to capability (PurchaseOrder/Forecasting), not re-derived here. |
| 9. Generic listview export (CSV/Excel) | Standard catalog listview export, shared handler also used by at least two other blueprinted modules' own listview exports. | Export action from the Products listview, respecting current filters (including location-scoped and part-status-aware filtering). | The current listview's filtered row set. | Internal | N/A — a row-level export, no aggregate total. |

## Architecture notes

- **No server-side PDF anywhere in this catalog today**: all nine output types are HTML or ZPL/EPL
  printer-control text, rendered client-side or via a print client/PrintNode, never a server-generated
  PDF. This is a genuine current-state architectural fact, carried forward here rather than invented.
- **One shared PrintNode integration, reached through two inconsistent code paths** (§6.1): Products
  shares one cross-module PrintNode integration point (also used by at least one other blueprinted
  module's own invoice-reprint flow), built on shared helper functions that resolve a configured
  printer, resolve it to a PrintNode account key, and make the PrintNode API call. What is *not*
  consistent is how each print branch (chiefly Output 2) reaches PrintNode once that gate passes — some
  branches call the shared delivery function directly, in-process; others build a URL and fire it as a
  self-originated HTTP request into a separate, top-level dispatcher script (`PrintZplLabel.php`)
  outside the module's own files, synchronously or fire-and-forget depending on server platform and a
  background-call setting. Both patterns reach the same PrintNode account/printer but are not the same
  code path — flagged for consolidation in the new design, not for porting as two independently-coded
  mechanisms. Whether `PrintZplLabel.php`'s self-cURL branch is functionally equivalent to the
  in-process branch (retry logic, error handling, response format) is **unconfirmed** — it was never
  read in the source blueprint.
- **Total-source requirement (§6.3)**: consistent with the same principle applied throughout the
  blueprint-consolidation series, every output must read an already server-computed, already-verified
  figure — none may read or trust a value that was ever accepted as direct caller input. The MPL
  price-resolution pipeline and the Gross-Profit formulas documented in `calculations.md` are the
  **only** paths that may ever produce the price/cost/margin figures Outputs 1, 2, and 4 display.

## Open items carried from the source

- Output 2 / Architecture note: whether `PrintZplLabel.php`'s self-cURL branch behaves identically to
  the in-process delivery branch is unconfirmed.
- Output 4: the PI Count Variance Report's actual variance-total aggregation math was not traced past
  the filter/query-construction stage; what renders the dataset before print/download was inferred, not
  observed.
- Output 6: the nightly inventory-snapshot log's downstream consumer (listview/report/dashboard) was
  not located.
- Output 7: the Lot Number Listing's actual row-data source endpoint was not identified.
- Output 3: whether a standing (not just migration-time) barcode-conflict audit capability should be
  preserved after the uniqueness constraint eliminates the ongoing need was not explicitly resolved.
