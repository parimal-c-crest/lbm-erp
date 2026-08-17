# AccountStatement — Outputs

> Keep this file even if this module produces no documents/reports/exports — state that explicitly
> below rather than deleting the file. See `_deviations-from-original-template.md` in this folder.

Source: `docs_from_blueprint/module/AccountStatement/06-outputs.md`, itself re-homed from
`docs_from_blueprint/module/Accounts/06-outputs.md` since statement generation is this module's core
responsibility rather than one of several Accounts output types. Original citation:
`blueprint/module/Accounts/05-outputs-documents.md` (Pass 5).

## Applicability

Applicable — this is the core of the module. Every statement-producing entry point instantiates the
same stateful class, `accountStatement`, and drives it through the same three-stage pipeline:

1. **Content generation** — one shared method builds the statement HTML fragment for one account over
   a date range (balance/aging math is consumed from Accounts, not owned here — see
   `calculations.md`).
2. **HTML persistence** — the fragment is written to a physical file, either one file per account
   (used for on-demand/single-account and per-account batch runs) or one combined file per batch of
   several accounts concatenated together (used only by the batch-print path).
3. **Delivery-specific rendering** — three independent scripts each read the persisted HTML back out
   and do something different with it: client-side silent print, server-side PDF-plus-email, or fax
   delegation.

Every statement entry point (Outputs 1-3 below) is a different front door into steps 1-2 of this same
pipeline, distinguished by scope (one account vs. many) and by delivery mechanism — not by different
content-generation logic. The delivery layer never recomputes or second-guesses the number the
content-generation stage produced. The one exception is the Tax Report (Output 9), a genuinely
separate live-aggregate query unrelated to the statement engine, kept in this catalog for completeness
since it lives in the same source file inventory, but out of this module's core scope per
`module-overview.md`.

| Output | Purpose | Trigger | Required Data | Audience | Total-Source (if applicable) |
|---|---|---|---|---|---|
| 1. Account Statement (single-account, interactive) | The customer-facing billing statement for one account — balances, open invoices/transactions, and aging for a chosen date range and transaction-type view. | The "Generate Statement" action from the Account detail view, submitted with a statement type, a date range, and optionally a job scope. | Account billing info, open transactions/invoices in the date range, aging buckets and past-due intervals, finance charge if applicable. | Customer (viewed on-screen internally before send). | Content-generation stage computes/consumes the total; delivery never recomputes it. |
| 2. Quick Account Statement (condensed, job-scoped) | A condensed statement variant, callable with a narrower job/account-scoped request shape. | Same trigger pattern as Output 1, on a distinct entry point. | Same as Output 1, plus this variant always writes a CSV export file up front — a behavior Output 1's flow does not perform unconditionally. | Same as Output 1. | Same as Output 1. |
| 3. Batch Statement (bulk, multi-account) | Generates statements for many accounts in one run — the production billing-cycle mechanism. Produces per-account HTML files, archives each one, and emails a PDF per account based on that account's delivery preference. | An account/date-range/location selection screen, or unattended via a billing-cycle cron entry point (which also triggers billing-cycle past-due recomputation) or a narrower cron that only triggers billing-cycle data generation. | Same per-account data as Output 1, iterated across every selected account; also collects each account's finalized SO ids for the period, which powers Output 8 (Reprint Invoices). A companion bulk archive-and-email mechanism exists for re-sending a caller-specified subset of accounts. | Customer (per-account statement/emailed PDF) plus internal (a listing of generated combined-batch files for internal review/print). | Same as Output 1, per account. |
| 4. Archive Statement (retrieval / re-display) | Lets staff browse and re-view/re-send previously generated statements, filtered by account or by date. A retrieval surface over Outputs 1/3's output, not an independent generator. | Navigating to the archive listview, optionally re-displaying one or more archived rows. | An archived statement's stored HTML — stored two ways (a file-path pointer, preferred, or a stored HTML-content blob fallback); when only the blob is available, a file is re-materialized on the fly so the same delivery scripts used for a fresh statement can still act on it. | Internal (staff) directly; the underlying document is customer-facing. | Reads only — displays exactly what was archived at generation time, including its stored total-owed figure. Two one-off maintenance scripts exist that rewrite stored archive HTML content directly — not part of the live generation/retrieval flow, noted for completeness. |
| 5. Statement "PDF" (client-side silent print) | Lets a staff member print the on-screen statement directly, without a save-as-PDF step. | A print button on the statement-display screen, posting the currently-rendered statement HTML back to this mechanism. | Whatever HTML is currently on screen, plus header/footer strings and a page-number-placement setting. No data access beyond the posted HTML. | Internal (the staff member printing). | **Architecturally not a server-side PDF renderer despite its name** — wraps the posted HTML in a print stylesheet and hands control to a legacy browser add-on, falling back to the browser's native print dialog. |
| 6. Statement Email | Converts the generated statement HTML to an actual PDF and emails it to the customer — the real PDF-generation-plus-delivery mechanism. | An "Email Statement" action, or invoked programmatically per-account from the batch flow. | The already-persisted statement HTML, the account's stored email address (a delivery-preference flag determines which of two on-file addresses is preferred), mail-server config. | Customer. | Server-side HTML-to-PDF conversion, then emailed as an attachment. No recomputation. |
| 7. Statement Fax | Faxes the generated statement to the customer's fax number on file, for accounts whose delivery preference is fax. | A "Fax Statement" action, or the delivery-preference flag being set to fax during automated delivery. | The account's fax number and the already-generated statement HTML. | Customer. | Delegates transmission entirely to an external, top-level, non-Accounts fax-transmission script. |
| 8. Reprint Invoices (cross-module delegation into SalesOrder) | After a batch statement run, regenerates/reprints the underlying Sales Order invoice documents for accounts whose delivery preference includes the invoice HTML. This module's counterpart to SalesOrder's own reprint flow — **AccountStatement does not generate the invoice content itself.** | Per-account "Reprint Invoices"/"Email Invoices" actions for a given batch-run identifier, sourced from the finalized-SO-id list a batch statement run collected. | The collected SO-id list plus delivery-preference flags. | Customer (the invoice document) via internal staff action. | Issues a request to SalesOrder's own document-creation action; the response's document URL is the generated invoice HTML's location — AccountStatement never touches invoice line-item or total data. Post-processing converts to PDF via the same tool as Output 6, can merge multiple accounts' PDFs, and can route directly to a network printer. |
| 9. Tax Report (out of core scope, see Applicability above) | Summarizes collected sales tax by tax code across all accounts. | Direct navigation — date range hard-coded to the trailing three calendar months. | An account's tax code and cross-module line-item tax figures, recomputed live at request time. | Internal only (management/accounting) — spreadsheet download. | The one output in this catalog that does **not** trust a stored/generated total — recomputed live. |
| 10. Export outputs (data extracts, not documents) (out of core scope) | Three small, non-document data exports: a generic record-export delegation, a mail-merge/marketing-campaign account+contact extract, and a single-account billing/shipping-address CSV export. | Direct navigation/action per export type. | Raw account/contact/address data per export type. | Internal (marketing ops / staff). | N/A — data extracts, not computed totals. |

## Output open items (carried forward from Accounts' own spec)

- **Output 5's legacy browser-add-on dependency**: whether the add-on is still installed/functional, or
  whether Output 6's server-side conversion has effectively superseded it, not confirmed.
- **Output 7's fax-transmission internals**: the actual fax gateway is a top-level script outside this
  module's own files, not read in the source pass; its contract was inferred from the caller only.
- **Output 3's full control-flow detail**: the 1,334-line batch-statement engine was only grepped, not
  read end-to-end. Two separate archive-insert call sites suggest two distinct code paths not
  individually traced.
- **Output 1 vs. Output 2 delta**: confirmed to share content-generation logic; the CSV-file behavior
  difference confirmed; a full line-by-line diff not performed — additional UI-only differences may
  exist.
- **Output 9's fixed three-month window**: no request parameter or config toggle found for the date
  range — whether intentional or a missing feature is unconfirmed.
- **The two archive-content maintenance scripts**: confirmed to exist and rewrite archived HTML, but
  whether either is still invoked (cron, manual, or dead) was not confirmed.

All items above are carried into `risks-and-open-questions.md`'s open-questions table (STMT-OQ-###)
for tracking.
