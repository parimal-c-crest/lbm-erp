# PurchaseOrder — Outputs

Source: `docs_from_blueprint/module/PurchaseOrder/06-outputs.md`, itself traced to
`blueprint/module/PurchaseOrder/05-outputs-documents.md`.

## Applicability

Applies in full. PurchaseOrder produces a substantial document/report/export catalogue, spanning
three separate rendering engines.

## Three separate rendering engines

Unlike SalesOrder's single shared rendering foundation for most of its outputs, PurchaseOrder mixes
three distinct rendering technologies depending on the document type — described here as
capabilities the system must support, not as any particular rendering library:

1. **Smarty + html2ps (HTML → PS → PDF)**: the main PO document, the invoice-style PO PDF, the
   receiver/backorder-receiving/variance-receiving PDFs, the receive-cost-margin PDF, and the email
   PDF. Several of these are structured as callable functions accepting a parameters payload rather
   than direct request handlers, meaning they are also invoked programmatically from elsewhere (e.g.
   batch/email flows), not only via direct HTTP hit.
2. **TCPDF**: a specific PO print variant, pulling the operating currency symbol via a query joining
   currency and user data.
3. **FPDF**: the two line-item-heavy documents (advanced item listing, suggested-PO listing), where
   FPDF's more direct table-drawing API is likely preferred for wide tabular layouts.

A generic dispatcher writes an interim HTML file and branches on the requested action (print, view,
email); several of the outputs below route through this dispatcher for the print/view/email trigger
rather than being their own renderer.

| Output | Purpose | Trigger | Required Data | Audience | Total-Source (if applicable) |
|---|---|---|---|---|---|
| Purchase Order (main print/PDF) | Standard PO document sent to the vendor — billing/shipping address, terms, line items, totals. | Print/view/email action | Header, addresses, line items, totals | Vendor, buyer | Header pre-computed totals (calculations.md §1) |
| PO "Invoice" style PDF | Alternate PO rendering shared/reused from a SalesOrder-style invoice template (defaults its current-module context to `"SalesOrder"` when unset — a confirmed code-reuse pattern, not a bug, but worth flagging for the rewrite's module boundary design). | Print/view/email action | Header, line items, totals | Vendor, buyer | Header pre-computed totals |
| Email PDF | Generates and attaches the PO PDF to an outbound vendor email; batches via a batch-PDF helper. | Email send action | Header, line items, totals | Vendor | Header pre-computed totals |
| Item-level PDF (plain) | Line-item listing export. | User action | Line items | Buyer | n/a |
| Item-level PDF (advanced) | Wider tabular line-item export. | User action | Line items (wide layout) | Buyer | n/a |
| Suggested-PO item PDF | Output of the order-point/forecast suggested-PO builder. | Suggested-PO generation | Forecast/order-point-derived line items | Buyer | Forecast pipeline output |
| Receiver PDF | Goods-receipt document. | Receiving action | Receiving line items | Warehouse/receiving staff | Received quantities |
| Backorder receiving PDF | Backorder-specific receiving document. | Receiving/backorder action | Line items with backorder quantity | Warehouse/receiving staff | Backordered quantities |
| Variance receiving PDF | Receiving variance report (quantity/cost mismatch vs. the PO). | Receiving action | Ordered vs. received quantities/costs | Warehouse/receiving, accounting staff | Variance computed at receiving |
| Receive cost-margin PDF | Cost/margin analysis at receiving time. | Receiving action | Cost and margin data | Buyer, accounting staff | Cost/margin computed at receiving |
| Discrepancy report | Non-PDF (HTML/Smarty) discrepancy listing between ordered vs. received. | User action | Ordered vs. received quantities | Warehouse/receiving, accounting staff | n/a |
| Top-10 PO widget | Dashboard widget — templated output, not a document export, grouped here for completeness. | Dashboard load | Aggregated PO data | Buyer | n/a |
| Delivery log popup | Popup showing delivery-log data — no dedicated controller was conclusively located under this name in the module root; likely rendered from one of the DIB delivery-confirmation ajax files, not fully traced. | User action | Delivery-log data | Buyer | n/a |

## CSV import/export

- **PO record export** — a CSV export of PO records.
- **CSV import (three-step wizard)** — upload → column-mapping/validation → commit; the commit step
  performs the actual row-by-row write into the staging/line-item tables and is by far the largest
  file in this group (579 lines).
- **PO-to-PO duplication** ("import from PO") — clones data **from** an existing PO into a new one;
  distinct from CSV import, consumed by the "duplicate PO" UI action.

## EDI as an output channel

Although EDI submission is functionally a cross-module integration (see integrations.md), it is
also, from the PO's own perspective, **a document-output channel parallel to PDF/email/print**:
manual EDI submission branches to the three vendor-network push methods exactly the way the PDF
dispatcher branches on its requested action, and `Printed`, `Emailed`, `Faxed`, `EDI` are sibling
boolean-ish flags on the header tracking which output channel(s) have fired for a given PO.

## Open Items

- The delivery-log popup's controlling controller was not conclusively traced — candidates are the
  DIB order-confirmation or DC-post-data ajax files, flagged as Open Question PO-OQ-003 (see
  risks-and-open-questions.md).
- The "PO Invoice-style PDF" file's reuse of a SalesOrder-context default was not traced further to
  confirm whether it is genuinely shared rendering code or a copy — flagged for confirmation before a
  new implementation decides whether to unify or keep separate PO/SO print pipelines.
- Whether `printed`/`emailed`/`faxed`/`edi` flags are ever reset (e.g. on a re-print) or are
  write-once markers was not confirmed in this pass.
