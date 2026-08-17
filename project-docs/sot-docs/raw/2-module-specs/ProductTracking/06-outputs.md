# ProductTracking — Outputs

Part of the ProductTracking tech-agnostic module spec. Source:
`blueprint/module/ProductTracking/05-outputs-pdf.md` (Doc1 Pass 5), ultimately derived from
`blueprint/module/ProductTracking/`.

## 6.1 Architecture note — one generic CSV export, no PDF, no report screen at all

**ProductTracking has no PDF generation, no email-delivered document, and no report/worklist screen of
any kind — stated explicitly, not glossed over.** This is the thinnest output surface of any module
blueprinted in this series so far, thinner even than the sparsest sibling module's own output surface
(which at least had an alert-triage grid). A case-insensitive search of every file in the module for
PDF/print/forced-download signatures found zero matches. This is consistent with ProductTracking's
confirmed role as a plain append-only audit log with no alert/flag mechanism of the kind another
module's own output surface exists to triage — there is nothing here for a report screen to surface
(Pass 5, architecture note).

## 6.2 Output Catalog

| # | Output | Purpose | Trigger | Audience | Required data |
|---|---|---|---|---|---|
| 1 | **Generic ListView CSV Export** | The module's standard list-view "Export" action — lets a user download the current (filtered/searched) set of QoH-change log rows as a CSV. | User clicks the ListView "Export" control, invoking the module's own export-query builder. | Internal (staff with ProductTracking export permission), scoped to their session's current location | The export builder joins the resolving-user's display name and, where present, an account's display name into the row. **Unconditionally scoped to the current session's default location** — this scoping is appended regardless of whatever filter/search state the caller's own query carries, a stronger, unconditional version of the ListView's own location-scoping: a user cannot export another location's tracking rows through this endpoint no matter what search criteria they apply. |

## 6.3 Confirmation — no other output/document-generation surface found

Beyond Output 1, the blueprint's own search across every file in the module for PDF/print/download
signatures found zero matches — no PDF generation, no forced-file-download response, no fax integration,
and (unlike some sibling modules) no interactive alert-triage worklist screen either, since this module
carries no alert-flag field for a worklist to surface (this module's status-workflow documentation). The
only other UI surface beyond the standard CRUD shell is the product-variant detail ajax popup (this
module's business-rules documentation, PT-VAL-021) — a read-only product-variant breakdown rendered
inline into the detail page via a template, not a downloadable or printable document in its own right;
categorized here as UI, not as an output (Pass 5, "Confirmation" section).

## 6.4 Output open items

- **Whether the product-variant detail popup's rendered HTML is ever printed or otherwise exported
  outside the live ajax-fragment context** — not traceable statically; the code itself provides no print
  stylesheet, export button, or download path of its own.
