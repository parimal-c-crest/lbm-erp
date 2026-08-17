# Accounts — Outputs

## Applicability

Accounts produces documents/reports/exports. Source:
`docs_from_blueprint/module/Accounts/06-outputs.md` (ten distinct output types). Most are variants
of one underlying capability — the customer billing statement — delivered through different
channels (interactive, batch, archived, printed, emailed, faxed); the remainder are a cross-module
invoice-reprint delegation, a tax report, and three data exports.

**AccountStatement note**: seven of the ten outputs below (Outputs 1–8, excluding the Tax Report and
data exports — i.e. the statement-variant outputs) now also have their own dedicated tech-agnostic
module spec at `docs_from_blueprint/module/AccountStatement/`, since statement generation is large
and cohesive enough to warrant its own module boundary. This file continues to describe the full
output set as part of Accounts' own domain, per the source; statement-specific rendering/balance
detail beyond what's captured in the table below is not re-derived here.

**Architecture note**: unlike a single shared rendering function, Accounts' statement outputs share
a stateful class (`accountStatement`) that every statement-producing entry point instantiates and
drives through the same three-stage pipeline: (1) content generation — one shared method builds the
statement HTML fragment for one account over a date range; (2) HTML persistence — the fragment is
written to a physical file (one file per account, or one combined file per batch for the batch-print
path); (3) delivery-specific rendering — three independent scripts each read the persisted HTML back
out and do something different with it (client-side silent print, server-side PDF-plus-email, or fax
delegation). Every statement output funnels through the same content builder and then persists it to
disk unchanged — the delivery layer never recomputes or second-guesses the number content-generation
produced. The one confirmed exception is the Tax Report (Output 9), a genuinely separate live-
aggregate query unrelated to the statement engine.

| Output | Purpose | Trigger | Required Data | Audience | Total-Source (if applicable) |
|---|---|---|---|---|---|
| Account Statement (single-account, interactive) | The customer-facing billing statement for one account — balances, open invoices/transactions, and aging for a chosen date range and transaction-type view (Balance Forward / Open Items / Hybrid OI). | "Generate Statement" action from the Account detail view, submitted with statement type, date range, optional job scope. | Account billing info, open transactions/invoices in the date range, aging buckets and past-due intervals, finance charge if applicable — see calculations.md. | Customer (viewed on-screen internally before send). | Aging-bucket/finance-charge pipeline in calculations.md. |
| Quick Account Statement (condensed, job-scoped) | A condensed statement variant, callable with a narrower job/account-scoped request shape — same underlying content, apparently for quicker/embedded contexts (e.g. a job-level "view statement" shortcut). | Same trigger pattern as the full statement, on a distinct entry point reachable independently of the main statement page. | Same as above, plus this variant always writes a CSV export file up front — a behavior the full-statement flow does not perform unconditionally. | Customer (viewed internally). | Same as above. Note: confirmed behavioral drift from the full statement view on early-payment-discount-text gating (ACC-VAL-025) — see risks-and-open-questions.md. |
| Batch Statement (bulk, multi-account) | Generates statements for many accounts in one run — the production billing-cycle mechanism (vs. the interactive statement's one-off customer-service lookup): produces per-account HTML files, archives each, and (per account, per delivery preference) emails a PDF via the same mechanism as the standalone Statement Email output. | Account/date-range/location selection screen, or unattended via a billing-cycle cron entry point (also triggers billing-cycle past-due recomputation) or a narrower cron entry that only triggers billing-cycle data generation. | Same per-account data as the interactive statement, iterated across every selected account; also collects each account's finalized SO ids for the period, powering Reprint Invoices. A companion bulk archive-and-email mechanism exists for re-sending/backfilling a caller-specified subset of accounts. | Customer (per-account statement/emailed PDF) plus internal (listing of generated combined-batch files for internal review/print). | Same as interactive statement, per account. |
| Archive Statement (retrieval / re-display, not generation) | Lets staff browse and re-view/re-send previously generated statements, filtered by account or by date across all accounts — a retrieval surface, not an independent generator. | Navigating to the archive listview, optionally with a re-display action pulling one or more archived rows by account+date or by date-across-accounts. | Archived statement's stored HTML (a file-path pointer, preferred, or a stored HTML-content blob fallback — a file is re-materialized on the fly when only the blob is available). | Internal (staff browsing) directly; underlying document is customer-facing. | Displays exactly the stored total-owed figure as archived at generation time — no recomputation. |
| Statement "PDF" (client-side silent print) | Lets a staff member print the on-screen statement directly without a save-as-PDF step — an internal print-desk convenience, not a document-delivery mechanism. | A print button on the statement-display screen, posting the currently-rendered statement HTML back to this mechanism. | Whatever HTML is currently on screen, plus header/footer strings (account name/number, date) and a page-number-placement setting. No independent data access. | Internal (the staff member printing). | N/A — pure re-render of already-generated content. Note: architecturally not a server-side PDF renderer despite its name — wraps posted HTML in a print stylesheet and hands control to a legacy browser add-on via injected script, falling back to native browser print if unavailable. |
| Statement Email | Converts generated statement HTML to an actual PDF and emails it to the customer — the real PDF-generation-plus-delivery mechanism (vs. the client-side print output above). | "Email Statement" action on the statement-display screen, or invoked programmatically per-account from the batch flow. | Already-persisted statement HTML, the account's stored email address (a delivery-preference flag picks which of two on-file addresses), mail-server configuration read live from system settings. | Customer. | No recomputation — converts and mails already-generated content via a server-side HTML-to-PDF conversion tool. |
| Statement Fax | Faxes the generated statement to the customer's fax number on file, for accounts with delivery preference set to fax. | "Fax Statement" action on the statement-display screen, or the delivery-preference flag set to fax during automated delivery. | Account's fax number and the already-generated statement HTML file/content. | Customer. | No recomputation — delegates transmission entirely to an external, top-level, non-Accounts fax-transmission script (internals not read in source; flagged open). |
| Reprint Invoices (cross-module delegation into SalesOrder) | After a batch statement run, regenerates/reprints the underlying Sales Order invoice documents for accounts whose delivery preference includes printing/emailing the invoice HTML, so the invoice accompanies or gets resent alongside the statement. Accounts does not generate the invoice content itself. | Per-account "Reprint Invoices"/"Email Invoices" actions for a given batch-run identifier, sourced from the finalized-SO-id list a batch statement run collected. | Collected SO-id list plus the account's invoice/statement delivery-preference flags. Cross-module delegation (confirmed): Accounts issues an internal request to SalesOrder's own document-creation action, passing SO ids and requesting an invoice-formatted render; Accounts never touches invoice line-item or total data directly. | Customer (the invoice document) via internal staff action. | Belongs entirely to SalesOrder's own outputs documentation — Accounts only orchestrates when/for which SO ids the render happens; post-processing converts the returned HTML to PDF, can merge multiple accounts' PDFs, and can route directly to a configured network printer (support-configurable toggle). |
| Tax Report | Summarizes collected sales tax by tax code across all accounts, for accounting/tax-filing review. | Direct navigation to the report action — no filter UI; date range hard-coded to the trailing three calendar months from today. | An account's tax code and a cross-module line-item tax-dollar figure, joined and summed by tax code, then summed again into a grand total. | Internal only (management/accounting) — streamed as a spreadsheet download, no email/print/archive path. | **All recomputed live at request time** — a genuine departure from the "trust the stored/generated total" pattern every statement output above follows; there is no stored "tax report total" anywhere. |
| Export outputs (data extracts, not documents) | Three smaller, non-document data exports: (a) a generic record-export delegation with no Accounts-specific logic; (b) a configurable account-plus-contact data extract for external mail-merge/marketing-campaign tools (field selection, filter-clause construction, HTML-to-plain-text normalization); (c) a single-account CSV export of billing-plus-shipping addresses. | Direct navigation/action per export type. | Raw account/contact/address data per export type — not a formatted document. | Internal (marketing ops / staff preparing an extract). | N/A — raw data extracts, no computed total. |

## Open items (output-specific)

- **Output 5's legacy browser-add-on dependency**: whether the add-on is still installed/functional
  in the currently-supported browser environment, or whether Statement Email's server-side
  conversion has effectively superseded it, was not confirmed.
- **Output 7's fax-transmission internals**: the actual fax gateway is a top-level script outside
  the Accounts module, not read in the source pass; its request/response contract was inferred from
  the caller only.
- **Output 3's full control-flow detail**: the 1,334-line batch-statement orchestration engine was
  only grepped, not read end-to-end. Two separate archive-insert call sites suggest two distinct
  code paths not individually traced.
- **Output 1 vs. Output 2 delta**: both confirmed to call the same content-generation mechanism; the
  CSV-file behavior difference was confirmed, but a full line-by-line diff was not performed — there
  may be additional UI-only differences (e.g. job-id scoping) not surfaced.
- **Output 9's fixed three-month window**: no request parameter or configuration toggle for the date
  range was found — whether this is intentional (a fixed quarterly report) or a missing feature is
  unconfirmed.
- **Two archive-content maintenance scripts** (noted for Archive Statement) are confirmed to exist
  and rewrite archived HTML content, but whether either is still invoked (cron, manual, or dead) was
  not confirmed.
