# Products — Screens & User Flows

> Views, fields, interactions, states. No component library or framework assumption.

> **Inferred content, not directly observed.** The source blueprint's own Pass 0 catalogs entry
> points/functions, not screen layouts. Everything in this file is *inferred* from the entities, rules,
> status model, and outputs that the blueprint does document elsewhere in this module's spec — the same
> inference method the SalesOrder pilot module's equivalent file used. Treat screen names, groupings,
> and flow steps below as a reasoned reconstruction, lower-confidence than the directly-extracted
> entities/rules/workflows content in this module's other spec files, not as directly-confirmed UI.
> Source: `docs_from_blueprint/module/Products/08-screens-and-user-flows.md`.

Unlike SalesOrder's "two client experiences over one capability set" framing, Products' implied screen
surface spans several genuinely distinct working areas, because the entities documented in this
module's spec span identity/classification, pricing (three parallel mechanisms plus two rule engines),
physical tracking (barcode/lot/serial), and several administrative mass-operation tools (mass-update,
CSV import, Product Defaults Rules) — not one linear create-then-fulfill flow.

## Screen Inventory

| Screen | Purpose |
|---|---|
| List view | Filterable, paginated, sortable grid of products; location-scoped and Part-Status-aware filtering (all three status values shown by default, unlike every downstream consumer's exclusion filter); export-to-file action; dedicated CSV-import entry point. |
| Detail view (read-only) | Displays the product header, classification-axis assignments, UOM Group assignment, current price levels, barcode/lot/serial summaries, and related-part/kit-adjacent read-only lists. |
| Edit view (standard) | Full create/edit screen: header identity fields plus the ~180-field combined header/extension surface (identity, pricing, dimensions, e-commerce, tax, classification blocks), addressed per-location where the underlying data is location-scoped (cost fields, quantity-on-hand). Whether a product is flagged an "alternate-part" record determines which roughly-60 fields (pricing, tax, dimensions, e-commerce, etc.) the edit form even shows — a confirmed legacy display behavior worth preserving as *display only*, not an enforcement mechanism (see business rules doc, PROD-VAL-022). |
| Mass-update view | Selecting a broad set of products (explicit selection, entire classification, or reusing a prior search) and a set of fields to change in bulk across all of them. The new design's mandatory count-preview/confirmation step is a new, explicit interaction the legacy screen did not have. |
| CSV import view | Multi-step: upload, column-to-field mapping (with a duplicate-mapping hard block), and a run step that reports per-row outcomes — a new, explicit per-row error report added in the new design (see business rules doc, PROD-VAL-044). |
| MPL price-level editor | Per-product/per-location price-level entry. |
| Manage UOM Qty Pricing grid | The confirmed alternate write-direction pricing path (see pricing/calculation doc, §5.4). |
| AUPF rule editor | Auto-pricing rule definition (scope filters, formula selection, from/to price-level selection); non-empty-scope requirement enforced at save time in the new design. |
| Auto-Update-Subline rule editor | Same rule-editor pattern as AUPF, scoped to subline; non-empty-scope requirement enforced at save time in the new design. |
| MPL Price Plan / Price Plan Rule management | Price plan and price-plan-rule administration. |
| Product Group/assortment editor | Product group/assortment definition and membership. |
| Barcode entry (in Edit view) | Barcode entry per type — base/inner/outer, plus additional barcodes — integrated into the product edit view. |
| Lot number add/edit screen | Lot-number entry/edit; format-validated, no uniqueness check by design in the legacy system (see business rules doc, PROD-VAL-056 to 058). |
| Serial number add/edit screen | Serial-number entry/edit; duplicate rejected outright on both paths. |
| Barcode-ambiguity-resolution screen (legacy only) | Lists duplicate barcodes and flags rows for manual resolution. **No equivalent in the new design** — rendered unnecessary by the new save-time uniqueness constraint. |
| Supersession screen | Batch entry screen for recording old-product-to-new-product supersession pairs; triggers Location's own merge cascade as a side effect rather than mutating the Product record itself. |
| Variant management screen | Create/rename/delete Variant Types (duplicate-name guard, referential-integrity delete guard) and per-location variant quantity entry. A real legacy screen, confirmed 100% unused on live data; its build is deliberately deferred in the new design pending confirmation it is worth building. |
| Related/Alternate Part screen | Listview/editor for master-to-related product substitution associations, scoped per-location. |
| Product Defaults Rule screen | Admin screen defining template default values applied to new products matching a linecode/subline pattern. |
| Product-field lookup management screens | Admin editors for the seven classification axes (Brand/Color/Division/Linecode/Manufacturer/Profile/Subline) and vendor-linecode master data, sharing one generic duplicate-check mechanism (with the confirmed hardcoded-literal data-quality fix applied in the new design). |
| Label-print actions | One action per label format (Avery/HTML, ZPL/EPL thermal), each with scope/geometry selection, resolving through the shared printer-delivery mechanism. |
| Report/document generation actions | One action per output type documented elsewhere in this module's spec: PI Count Variance, Core/Warranty Change Report, Duplicate Barcode audit (superseded by the uniqueness constraint in the new design), Sales History delegation, generic export. |

## Flows

<!-- Per flow: entry point, steps, decision points, exit/success state. All inferred — see note at top of file. -->

### Create/Edit Product
- **Entry point**: List view ("Add Product") or Detail view → Edit view.
- **Steps**: identity/classification entry (linecode/subline/division/brand/color/profile/manufacturer
  selection, product-number entry with derived normalized-search-key display, supersession/
  equivalent-part linkage entry); per-level price entry (with audit-pair "last changed on/by" display
  per level); MPL Price Plan assignment; classification, dimensions, e-commerce, tax field blocks.
- **Decision points**: alternate-part flag determines which ~60 fields the form shows (display-only,
  PROD-VAL-022); Global-WAC recalculation fires implicitly as a side effect of an ordinary cost-field
  edit under Global WAC mode (not a distinct user action).
- **Exit/success state**: product saved to catalog via the standard save path; Gross-Profit is
  displayed read-only, computed.

### Mass-Update
- **Entry point**: List view → Mass-update view.
- **Steps**: select scope (explicit list / entire classification / reused prior search); select fields
  to change in bulk; (new design) count-preview/confirmation step.
- **Decision points**: mandatory count-preview/confirmation before commit — new in this design, absent
  from the legacy screen.
- **Exit/success state**: bulk update applied across all products in scope; in-progress state is the
  count-preview/confirmation state itself (new).

### CSV Import
- **Entry point**: List view → dedicated CSV-import entry point.
- **Steps**: upload file; map CSV columns to product fields; run import.
- **Decision points**: duplicate-mapping hard block at the mapping step (PROD-VAL-044); per-row outcome
  determined during the run (created / updated / skipped-with-reason).
- **Exit/success state**: per-row outcome report — a new, explicit result surface the new design adds
  in place of the legacy's frequent silent per-row skip.

### Barcode / Lot / Serial Entry
- **Entry point**: barcode entry inline in Edit view; lot and serial numbers via their own dedicated
  add/edit screens.
- **Steps**: barcode entry per type (base/inner/outer, additional); lot-number entry (format-validated);
  serial-number entry.
- **Decision points**: serial numbers reject a duplicate outright (both create and edit paths, PROD-
  VAL-056 to 058); lot numbers accept any value with no uniqueness check in the legacy system; the new
  design's save-time barcode-uniqueness constraint replaces the legacy barcode-ambiguity-resolution
  screen entirely.
- **Exit/success state**: barcode/lot/serial record saved; a rejected duplicate barcode or duplicate
  serial number surfaces clear, specific error messaging tied to the blocking rule.

### Supersession
- **Entry point**: Supersession screen (batch entry).
- **Steps**: record old-product-to-new-product supersession pairs; system looks up old and new product
  rows by classification/product-number match.
- **Decision points**: none specified in source beyond the classification/product-number lookup match.
- **Exit/success state**: writes merge-trigger flags onto Location's own table, triggering Location's
  merge cascade for quantity-on-hand/sales-history/pricing as a side effect; the Product record itself
  is not mutated (in the new design, the supersession flag/pointer pair on the product is read-only).

### Pricing Rule Definition (AUPF / Auto-Update-Subline)
- **Entry point**: AUPF rule editor or Auto-Update-Subline rule editor.
- **Steps**: define scope filters, select formula, select from/to price level; set the "Auto Update"
  toggle (daily cron pool vs. manual/scheduled-only).
- **Decision points**: non-empty-scope requirement enforced at save time in the new design — a rejected
  blank-scope pricing rule is a documented hard-blocked action.
- **Exit/success state**: rule saved; if "Auto Update" is enabled, the rule participates in the daily
  cron pool going forward — a simple, user-visible two-state flag per rule.

### UOM Quantity Pricing
- **Entry point**: "Manage UOM Qty Pricing" grid.
- **Steps**: per-quantity-break price entry (the confirmed alternate write-direction pricing path).
- **Decision points**: the weighted-average-cost write path inside this grid is role-restricted in the
  legacy system (a specific role list, or the administrator account) — the one field-level role check
  found anywhere in this module's save paths; server-side enforcement of this restriction is a
  requirement for the new implementation, not an assumption already satisfied.
- **Exit/success state**: pricing grid entries saved.

### Product-Field Lookup Management (classification-axis admin)
- **Entry point**: Product-field lookup management screens (Brand/Color/Division/Linecode/
  Manufacturer/Profile/Subline, plus VendorLinecode master data).
- **Steps**: add/edit/delete a lookup value.
- **Decision points**: shared generic duplicate-check mechanism blocks duplicate lookup values (the
  hardcoded-literal data-quality gap in this mechanism is fixed in the new design).
- **Exit/success state**: lookup value saved.

### Variant Management (deferred — low confidence)
- **Entry point**: Variant management screen.
- **Steps**: create/rename/delete Variant Types; per-location variant quantity entry.
- **Decision points**: duplicate-name guard on Variant Type creation; referential-integrity delete
  guard on Variant Type deletion.
- **Exit/success state**: not established — this screen is confirmed 100% unused on live data, and its
  build is deliberately deferred in the new design pending confirmation it is worth building at all.

### Label Print
- **Entry point**: label-print action, available from list/detail/edit views.
- **Steps**: select label format (Avery/HTML, or ZPL/EPL thermal); select scope/geometry.
- **Decision points**: none specified in source beyond format selection.
- **Exit/success state**: label output resolved through the shared printer-delivery mechanism.

### Report / Document Generation
- **Entry point**: report/document generation action.
- **Steps**: select output type — PI Count Variance, Core/Warranty Change Report, Duplicate Barcode
  audit (superseded by the new uniqueness constraint), Sales History (delegated to PurchaseOrder/
  Forecasting), or generic export.
- **Decision points**: none specified in source.
- **Exit/success state**: document/report generated.

## States

<!-- Loading, empty, error, no-permission, read-only, etc — per screen if they differ. All inferred — see note at top of file. -->

- **Product-level state**: Part Status (Active/Inactive/Discontinued), filterable in list/detail views;
  the supersession flag/pointer pair (read-only in the new design); e-commerce publish eligibility
  (derived from the compound gate documented in this module's integrations doc).
- **Barcode/lot/serial-level state**: allocation status — whether a specific lot/serial unit is
  currently allocated to an open order.
- **Rule-engine state**: the AUPF/Auto-Update-Subline "Auto Update" toggle — enabled for the daily cron
  pool, or manual/scheduled-only; a simple, user-visible two-state flag per rule.
- **Mass-operation state**: an in-progress mass-update's count-preview/confirmation state (new in this
  design); a CSV import run's per-row outcome state (created / updated / skipped-with-reason).
- **Validation/error states**: hard-blocked actions should surface clear, specific error messaging tied
  to the blocking rule (e.g. a rejected duplicate barcode, a rejected duplicate serial number, a
  rejected blank-scope pricing rule, a rejected malformed CSV column mapping) rather than the legacy
  system's frequent pattern of a silent per-row skip with no operator-facing error.
- **Not addressed in source**: generic loading, empty-list, and no-permission/read-only states per
  screen are not described in the source blueprint for this module — left unstated here rather than
  invented; the one confirmed role/permission-related check is the WAC-field role restriction noted
  above and in the Flows section.
