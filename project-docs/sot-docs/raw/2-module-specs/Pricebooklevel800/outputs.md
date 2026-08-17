# Pricebooklevel800 — Outputs

> Keep this file even if this module produces no documents/reports/exports — state that explicitly
> below rather than deleting the file. See `_deviations-from-original-template.md` in this folder.

Source: `docs_from_blueprint/module/Pricebooklevel800/06-outputs.md`, ultimately derived from
`blueprint/module/Pricebooklevel800/05-outputs-documents.md` (Doc1 §05).

## Applicability

This module produces outputs, but unlike transactional-document modules such as SalesOrder, it
produces **no PDF output** — confirmed by full-file read of every file in the module. Its outputs are
limited to a mis-targeted CSV export, two distinct listing/grid surfaces, and a bulk-write modal that
is an output surface only in the loose sense that it lists Accounts, not in the sense of producing a
document. No word-merge / mail-merge template output was found in this module either (unlike
SalesOrder's invoice-generation equivalent) — confirmed absent by full-file read.

| Output | Purpose | Trigger | Required Data | Audience | Total-Source (if applicable) |
|---|---|---|---|---|---|
| CSV Export (mis-targeted) | Nominally a CSV export of the currently-listed price-book headers — **but the actual query targets the sibling rule table, not the header table the ListView displays.** Clicking "Export" from this module's ListView (which lists price-book headers) produces a CSV of the currently-in-session price book's *rules*, scoped by a raw session value set by the rule-details screen. This is a real, functioning export — just of a different entity than the one the ListView shows — not a broken/placeholder stub. | Export action from the ListView. | Whatever the rule table's own attachment/user-joined columns expose; has no relationship to the ListView's own row-selection/checkbox state at all. | Pricing/merchandising administrator | N/A — not a financial total document |
| ListView (header grid) | The module's primary listing output: a paginated grid of price-book header rows (name, description, etc.). Row-level delete action is deliberately overridden to call the module's own guarded ajax delete path instead of the generic mass-delete behavior every other module gets — a deliberate per-module override, confirming the ListView layer itself is aware this module needs a non-standard delete affordance. | Standard list-view navigation. | Price Book Name, Description, and the other listed header columns. | Pricing/merchandising administrator | N/A |
| Rule Details grid (a second, parallel listing UI) | A separate, paginated (100 rows/page) grid of the sibling rule table's rows scoped to one price book, with per-row inline-edit fields consumed by the header save flow's own rule-update loop. This is the module's actual "rule editing surface" and is functionally a second, parallel listing UI to the standard ListView — not reachable via the standard list-view URL, only from within a specific price book's own detail context. | Navigating into a specific price book's "Rule Details" tab. | Full rule-row field set (line code/subline/division/product id/price code/sales rank/pricing-operation fields), plus linecode/subline/division dropdown reference data. | Pricing/merchandising administrator | N/A |
| Apply-to-Accounts modal (bulk-write UI, not a document) | Lists Accounts currently assigned vs. not assigned to one or more selected price books, and processes bulk assignment/un-assignment of the Accounts' price-book value. An output surface only in the sense that it lists Accounts — its actual purpose is a bulk cross-module write, not a generated document or report. | "Apply to Accounts" action from the ListView, for one or more selected price books. | Selected price-book name(s), full or filtered Account list, group-apply dropdown data. | Pricing/merchandising administrator | N/A |

## Total-source / downstream-consumption note

This module produces no customer-facing print/PDF output of its own. Its pricing computation is
instead **consumed by SalesOrder's own outputs** (invoices, quotes, etc. — see the SalesOrder module
spec) as an upstream pricing input. Per `calculations.md`, that downstream consumption currently
receives a `0.0000` price for every account whose assignment isn't `"LP"`, given the confirmed empty
header table — a fact any new implementation of SalesOrder's own outputs must be aware this module's
pricing feed can currently supply.

## Output open items

- Whether the CSV-export mis-targeting (above) should be fixed by making the export match the
  ListView's own displayed entity, by offering a separate explicitly-labeled "export this tier's
  rules" action, or by some other resolution was not decided within the source blueprint's own scope
  — see `build-guidance.md` for the proposed resolution.
- Whether the "Rule Details" grid should remain a separate parallel listing UI or be unified with the
  standard ListView in a new implementation was not decided within the source blueprint's own scope.
