# Pricebooklevel200 — Outputs

> Keep this file even if this module produces no documents/reports/exports — state that explicitly
> below rather than deleting the file. See `_deviations-from-original-template.md` in this folder.

Source: `docs_from_blueprint/module/Pricebooklevel200/06-outputs.md`, itself transcribed from
`blueprint/module/Pricebooklevel200/05-outputs-documents.md` ("Pass 5").

## Applicability

Applicable. Unlike the sibling `MPLPricePlan` module (no PDF output at all), Pricebooklevel200 has a genuine,
customer/account-facing PDF document, confirmed real, not a stub. The module's export surface, however,
inherits the same "two entity classes, one dead" structural split found throughout this module's own blueprint:
the live entity class's export references a *sibling* module's own field-permission configuration; the dead
entity class's export references the confirmed-nonexistent legacy tier.

| Output | Purpose | Trigger | Required Data | Audience | Total-Source (if applicable) |
|---|---|---|---|---|---|
| Master Price Sheet PDF | A printable/emailable price sheet for a specific account/job — the customer-facing document a sales rep would hand to (or email) a customer, listing every rule on the sheet with its net price, optionally showing brand/color/manufacturer/profile columns per the sheet's own display-fields configuration. | The client-side "email this price sheet" action, and any direct PDF-generation route through the shared PDF pipeline this module's own PDF-generation function is registered against (registration/routing itself is shared framework, out of this module's own files). | The sheet's own header fields plus every rule row for the sheet, each resolved to human-readable labels instead of raw ids (line code/subline/division/color names, and presumably brand/manufacturer, not fully re-read in Pass 5). Confirmed working — no structural defect found. | External-facing (a customer receiving their negotiated/account-specific pricing) as well as internal (a sales rep reviewing/printing the sheet). | The pricing-computation pipeline in `calculations.md` — no output should independently recompute or trust a different price value than what that pipeline resolves (guidance, not an observed legacy fact for this output). |
| CSV Export (live entity class) | The standard listview "Export" action, letting a user download the current set of rules/price sheets as CSV. | Standard listview export action. | Correctly targets this module's own rule table, but resolves its own field-permission list via the *sibling* `Level200rules` module's own permission configuration, not this module's own — whether the two modules' field-permission sets happen to coincide, or this is another unadapted artifact, is not resolvable without a targeted read of that sibling module. The query's own filter clause additionally depends on a session-stored value, unescaped (PBL200-RULE-003), only meaningfully set after a prior view of the rule-list grid. | Internal (whoever has export access). | Same pricing pipeline as above; not confirmed broken, but carries a confirmed SQL-injection-shaped session-value dependency and a genuine cross-module coupling not confirmed to be intentional design. |
| CSV Export (dead legacy entity class) | The same generic export action, but routed through the module's dead legacy entity class. | Would be the same standard listview export action, but routed through the dead class — never reachable in practice since no live code path instantiates that class. | References a module and table confirmed absent from the codebase and database entirely — would fail outright on execution. | N/A — confirmed non-functional. | N/A |
| Rule-list grid | The module's real working surface for viewing/editing a price sheet's rules — a paginated grid, decorated with resolved product descriptions per rule. Interactive UI, not a document output in the print/download sense. | Every detail-view/edit-view load of a specific price sheet. | Correctly parameterized rule reads joined by sheet name to the header row. Side effect worth noting: this page load sets the session value the CSV export (row above) later depends on — its own load is a prerequisite for the export to scope correctly, an implicit ordering dependency between two otherwise-separate outputs. | Internal (whoever is editing the sheet). | N/A |
| Standard listview grid | The standard grid of all price sheets. Interactive UI, not a document output. | Standard module listview navigation. | Standard listview query/pagination — no module-specific business calculation. | Internal. | N/A |

## Confirmation — no other output/document-generation surface found

Beyond the 5 outputs above, a full-file sweep for PDF/print/forced-download signatures across all 37 code files
found matches only inside the PDF-generation file itself — no second PDF/document-generation surface, no
email-integration code beyond the client-side "email this price sheet" trigger (whose own server-side handler
was not located as a distinct file in this module's own directory — likely routed through a shared,
cross-module email-send utility, out of the source blueprint's own scope), and no forced-file-download response
anywhere else in the module.

## Output open items

- Whether the live entity class's CSV export's cross-reference to the sibling `Level200rules` module's own
  field-permission configuration is intentional shared design or an unadapted copy-paste artifact — not
  resolvable without a targeted read of that sibling module.
- What the shared, generic export-handling utility does with this export's session-dependent, potentially
  injectable filter clause when the session value is unset (e.g. an export attempted without first visiting the
  rule-list grid in the same session) — not traced to completion.
- Where the server-side handler for the "email this price sheet" client action actually lives — not located as
  a distinct file under this module's own directory; likely a shared, cross-module email-send endpoint, but not
  confirmed.
- The Master Price Sheet PDF's own precise brand/manufacturer-label resolution was not fully re-read in Pass 5
  (only line code/subline/division/color were explicitly confirmed) — flagged here for completeness, not
  independently escalated as a risk in the source material.
