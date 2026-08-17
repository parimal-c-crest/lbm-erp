# Vendors — Screens & User Flows

> Views, fields, interactions, states. No component library or framework assumption.

Source: `docs_from_blueprint/module/Vendors/08-screens-and-user-flows.md`. The source blueprint does not
document UI screens directly (screen layouts were explicitly out of scope for the original blueprint
passes, which catalog entry points/functions, not layouts) — this section infers the implied screen/
interaction structure from the entities, rules, status model, and outputs documented elsewhere in this
spec, expressed as views/fields/interactions/states rather than any specific UI framework. Confidence is
therefore inference-level, not a direct source read, throughout this file.

## Screen Inventory

| Screen | Purpose |
|---|---|
| List view | Filterable, paginated, sortable grid of vendors, with an export-to-CSV action. |
| Detail view (read-only) | Displays the vendor header, contact clusters, freight/PO terms, the primary-supplier summary (built fresh on every render via a live join, not from a stale cache field), the sub-vendor list, the contact-information list, and related Products/Purchase-Orders/Contacts panels. |
| Edit view (standard) | The full create/edit screen: header fields, contact clusters, freight/PO terms, classification, EDI/Saberis/Aconnex/TecOrder integration configuration, the primary-supplier summary, sub-vendor picker, contact-information picker, and (for new records) an auto-generated vendor number. |
| Physical address book modal/interaction | A dedicated CRUD surface for the vendor's ship-from addresses: list/add/edit/delete, with a delete guard against addresses already referenced by a Buyout SO/PDM, and CSV bulk import/export. |
| Primary-supplier assignment interaction | A dedicated screen/modal for assigning or revoking the designated primary supplier at a given location, with a candidate-list dropdown scoped by vendor classification. |
| Line-code/purchasing management screens | A line-code picker/listing widget (shared with Products, CSV export), a per-vendor line-code-description edit interaction (the module's single highest-risk write surface), a conversion-rule grid (CSV import/delete), and a line-code-alias save/CSV-import interaction. |
| Document generation/export actions | One action per output type: the generic ListView CSV export, the physical-address CSV export, and the line-code mapping CSV export. |

**Structural note**: unlike a module with two parallel full-record client experiences, Vendors' implied UI
is one core vendor record surface (list/detail/edit) plus several distinct, narrower management
sub-screens for its satellite entities — the physical address book, primary-supplier assignment, and the
line-code/conversion-rule/alias purchasing cluster each imply their own dedicated interaction surface,
consistent with the source's structural-inventory finding that these are separate ajax-driven CRUD
clusters, not sub-panels of one unified edit form.

## Flows

- **Header fields flow**: vendor identity (name, number, category), contact-detail clusters (customer
  service, tech line, CSR, sales rep), classification (manufacturer/supplier/subcontractor/all),
  freight/PO terms (freight PPD amount/basis, minimum order amount, small order charge), tax configuration
  (tax-exempt, tax ID, tax authority code), and QuickBooks/SlipStream sync identifiers (system-set, not
  user-entered).
- **Sub-vendor/contact-picker flow**: a pipe-delimited sub-vendor list picker (add/remove) and a
  pipe-delimited contact-information picker (add/remove) — both denormalized caches rendered as HTML
  fragment widgets, one of which (contact information) genuinely drifts from its normalized counterpart
  with no confirmed sync code.
- **Physical-address flow**: add/edit/delete a ship-from address, with the update path's IDOR-shaped gap
  (no ownership check against the current vendor context, VEN-RULE-033) and the delete path's cross-module
  reference guard.
- **Primary-supplier flow**: select a candidate vendor or location as primary supplier for a given
  location, or clear the selection entirely (explicit revocation) — the candidate list is scoped by vendor
  classification, subject to the confirmed-dead classification-value bug for "All"-classified vendors.
- **Line-code/purchasing flow**: assign/edit a vendor's line codes (comma-delimited, validated only via an
  optional client-invoked pre-check, never at actual save time — VEN-RULE-010/011); edit a line code's
  description (the module's single highest-risk interaction, since the underlying write has no
  vendor-scoping); manage line-code aliases (create/update only, no delete affordance through any
  UI-reachable path); manage manufacturer-number-to-line-code conversion rules (CSV import/single-row
  delete).
- **Freight-terms flow**: edit Freight PPD Amount/Based-On, either through the full edit form (which
  silently truncates cents for Dollars-basis vendors due to a coercion bug) or the inline DetailView edit
  (which coerces correctly) — or, from a different module entirely, the Purchase-Order entry screen's own
  freight-term-adjustment interaction (which applies no coercion at all and is independently a confirmed
  SQL-injection vector).
- **Role-gated interactions**: none of the module's 48 business rules document a confirmed role/permission
  gate specific to Vendors beyond the standard module-permission checks every CRM entity has — no
  Vendors-specific role restriction was surfaced by any source pass. See `permissions.md` for the full
  finding.

## States

- **Vendor-level state**: no Active/Inactive concept exists — only the generic soft-delete state
  (confirmed enforced everywhere it matters) and the classification value (freely re-editable, not a
  lifecycle) should be visible/filterable in list and detail views.
- **Physical-address-level state**: the "is default" flag distinguishing the vendor's primary ship-from
  address from its alternates.
- **Primary-supplier-level state**: assigned (to a specific vendor or location) vs. unassigned, per
  (vendor, location) pair — revocable to "none" explicitly, not merely reassignable.
- **SlipStream integration state**: blank / Imported / Enrolled, surfaced on the detail view as an
  integration-status display — this is the module's one genuine, if currently unused, real
  lifecycle-shaped state that should be visible to purchasing/accounting staff.
- **Validation/error states**: hard-blocked actions should surface clear, specific error messaging tied to
  the blocking rule (e.g. missing record identifier on delete, an unreceived-PO delete refusal that is
  currently indistinguishable from success, a rejected physical-address delete due to a cross-module
  reference) rather than a generic failure or — as the legacy system does in several of these cases — a
  silent no-op that looks identical to success.
