# Products — Cross-Module & Integration Touchpoints

Products is the catalog master: its identity/classification/price-level/tax/UOM data is the single
source of truth every transactional capability that builds a line item (SalesOrder, PurchaseOrder,
Quotes, StoreTransfer, Manufacturing/BOM, POS, WMS pick/pack, the e-commerce storefront) joins against
for that line item's product/price/tax/UOM data, as a byproduct of building the line rather than a
distinct integration each deserving its own row. That blanket relationship is stated once, here; the
rows below are the specific, named relationships worth documenting individually — write-back paths,
shared ownership of borderline data, and structurally distinct integrations.
Source: `docs_from_blueprint/module/Products/07-cross-module-integrations.md`.

**UOM note**: the UOM (category/group/type/conversion) mechanism referenced throughout this module's
spec has its own dedicated tech-agnostic module spec at `docs_from_blueprint/module/UOM/`, extracted
after research found UOM is consumed directly by a dozen-plus modules with no enforced boundary — see
that folder's `07-cross-module-integrations.md` for the full direct-access survey. This file describes
only Products' own relationship to UOM (the `uomgroup_id` assignment); the UOM domain's own internals
and its cross-module coupling are documented there, not duplicated here.

## Related Modules

| Module | What This Module Reads | What This Module Writes/Triggers | Direction | Sync/Async |
|---|---|---|---|---|
| **SalesOrder** | No confirmed SalesOrder → Products write-back — a search for a SalesOrder-module write into Products' own quantity-on-hand-audit table found no live write site; SalesOrder's quantity-on-hand-affecting writes land on Location's table instead. | Line-item product data (description, price levels, tax, UOM) at order-entry time, plus the base-tier cost input to SalesOrder's own Gross-Profit calculation — the *default, lowest-priority* cost-basis tier only; SalesOrder's manual-cost-override and buyout-cost tiers are pure SalesOrder-side data with no Products involvement. | Products → SalesOrder, read-dominant. A query relationship, not a command one. | Not specified in source. |
| **PurchaseOrder** | No confirmed PurchaseOrder → Products write-back into Products' own audit tables — a broader search for any write into the Product header found no hits; PurchaseOrder-side cost/quantity changes on receipt are written to Location's table, per the same pattern as SalesOrder. | Products hosts a routing shim (a sales-history display entry point) that delegates to PurchaseOrder/Forecasting's own sales-history-for-reorder capability. Products separately maintains its *own*, independently-purposed sales-history rollups for its own pricing-report display — a different, already cleanly separated consumer. A manually-curated per-product default Gross-Profit-percentage override table exists for line items with no real catalog-product cost record (e.g. freight/labor/misc-fee lines); confirmed a manual admin-curated whitelist, not a cost-change-triggered audit trail despite its legacy name. | Products hosts a routing shim; PurchaseOrder owns the underlying capability. **Decision**: this ownership stays with PurchaseOrder/Forecasting rather than being absorbed into Products, because PurchaseOrder already owns the sales-history aggregation logic and the decision it supports ("how much should I reorder") is a purchasing decision, not a catalog-identity one. | Not specified in source. |
| **Location (supersession trigger)** | Reads old and new product rows by classification/product-number match to locate them — the Product entity's own record is read-only in this flow, used only to locate the rows. | Writes the merge-trigger flags **onto Location's table** (not Products' own) to drive the quantity-on-hand/sales-history/pricing merge transition — a transition that is multiply-enforced entirely on Location's side. No corresponding Product-header transition exists (confirmed absent; see this module's status/workflow documentation, §4.3). | Products → Location, one-directional, single-shot. | Not specified in source. |
| **PriceBooks** | Reads/participates in the price-book-to-product association (list price per book) that PriceBooks also manages from the book side (delete-cascade on book delete, its own related-list read). | Manages the price-book-to-product association from the product side (add/edit/delete). | **Genuinely bidirectional/jointly-owned**, confirmed by direct evidence on both sides — not merely Products participating in a PriceBooks-owned table. The new design keeps this bidirectional, formalized as two named operations either capability can invoke, replacing several independently-shaped legacy write paths. | Not specified in source. |
| **Kits** | Products has no awareness of Kits at all — no write, no shared table, no kit-membership field anywhere on the Product entity. Kit membership itself (which products compose a kit, in what quantity) lives entirely in Kits-owned data, never touched by any Products-module code. | N/A — Products does not write to or trigger anything in Kits. | Kits → Products, **read-only** (kit-component descriptions read a component product's identity/price/quantity-on-hand data). | Not specified in source. |
| **VendorLinecode** | N/A per source (Products is the write owner in this relationship). | A line-code-to-vendor cross-reference for reporting/purchase-order-suggestion purposes — Products' own field-management dispatcher is the live create/edit/delete surface for this master data; the dedicated VendorLinecode module is presentation-only (a listview and a "split rule" utility). No confirmed relationship to the separate Vendors (vendor/supplier company record) concept was found. | **Direction inverted from what the module names imply**: Products owns the write path, not VendorLinecode. The new design keeps this ownership direction — no evidence suggests the current shape is a defect. The hardcoded-sentinel data-quality gap in this same dispatcher's duplicate-check helper is fixed inside this same service. | Not specified in source. |
| **WMS** | None — tested and confirmed absent. | None — tested and confirmed absent. | N/A. All interaction between the Products/pricing domain and warehouse-management concerns is mediated entirely through Location's table — every WMS-side query joins through Location's product-at-location row, never the Product entity directly. Confirms a hypothesis stated at the outset of the source blueprint's cross-module pass; a genuinely negative finding, not merely un-investigated. | N/A |
| **Accounts** | Reads the customer-specific product/line-code cross-reference used for EDI/ordering integrations. | Participates in the same cross-reference — create/edit screens live on the Accounts side, with read access from Products. | Genuinely joint-owned. Preserved as a shared, jointly-writable relationship; no evidence either side's write access is a defect. | Not specified in source. |
| **UOM** | Reads the UOM Group assignment (`uomgroup_id`) for a product — Products' own relationship to the UOM framework. | No write-back into UOM's own domain tables is described in this module's source file. | Products → UOM, read (assignment only). **See the UOM note above**: UOM's own internals and its full cross-module direct-access survey are specified separately in `docs_from_blueprint/module/UOM/07-cross-module-integrations.md` and are not reproduced here. | Not specified in source. |

## External Systems

| System | What Crosses the Boundary | Direction | Trigger | Sync/Async |
|---|---|---|---|---|
| **E-commerce catalog push (BigCommerce-family)** | Product catalog data (description, price, category, variant mapping) pushed to an external storefront, gated by a compound condition: the product must be explicitly opted in, non-variant, strictly Active (Part Status), stocked, and not one of several excluded non-product/freight/labor line-item placeholder categories. A separate, narrower push exists specifically for classification-axis (linecode/subline/division) data. A reverse leg exists for incoming storefront orders reconciled back into SalesOrder — out of this module's own scope. | Outbound, product → storefront. | **Unconfirmed** — whether the push is cron-driven batch or fires inline on every save was not determined in the source blueprint; flagged Phase-0-blocking for the new design, since a cron-batch push has a natural cutover moment while an inline push needs the new save path wired to trigger it at the exact moment of cutover with no gap. | Unconfirmed (tied to the trigger question). |
| **Fuse5Connect** | Full product-record creation/update pushed *into* Products from an external vendor-catalog-sync-integrated system. Confirmed a genuine, actively-used inbound product-provisioning API, not merely stored credentials — the integration point instantiates the standard Product entity and calls the identical save path a manual UI edit would use, not a raw-database bypass. Immediately after save, it queues the new product into both the price-code-book/rank-group assignment pipeline and the AUPF auto-pricing engine, then writes location-scoped fields. | Inbound, external system → Products. | An inbound product create/update request from the external system. | **Synchronous** — the entity save and its immediate downstream fan-out calls happen inline within the same request. **Decision**: preserved as a first-class, unmodified integration point in the new design — inbound creates/updates continue to enter through the same save operation a UI edit exposes, with the downstream fan-out redesigned as domain events rather than inline synchronous calls. Because this integration is actively used (not dead), its cutover needs explicit coordination — there is no safe "leave it on the legacy system a while longer" option. |
| **QuickBooks item/SKU sync** | Confirmed **thin/absent** — no dedicated Products-owned QuickBooks integration file exists, and a table Pass 1 initially flagged as possibly QuickBooks-adjacent has zero Products-file references. The one QuickBooks-adjacent reference found is Products' own Global-WAC recalculation block *reaching out* into a different capability's own QuickBooks cost-posting module for a WAC-driven side effect — not a Products-owned sync. | N/A as a Products-owned integration. | Global-WAC recalculation (a cost-field edit under Global WAC mode). | N/A. **Decision**: excluded-pending-confirmation, consistent with every other blueprinted module's own finding for QuickBooks integrations in this series; the one live QuickBooks-adjacent touchpoint is modeled as a domain event a separately-designed downstream consumer subscribes to. |

## Open Items

Carried forward from the source blueprint's own cross-module/integration open-items list — preserved
here rather than resolved by guessing:

- **The e-commerce catalog push's sync/async mechanism** — whether the compound-gated product query
  feeds a cron-driven batch push or an inline on-save push was not determined; the relevant source file
  is large and was not read end-to-end in the source blueprint.
- **The narrower, classification-axis-only e-commerce push script's relationship to the main product
  push** — confirmed to exist and its narrow scope, but its body and trigger relationship to the main
  push were not read.
- **The exact abbreviation/meaning of the manually-curated cost/GP-override table's name** (referenced
  under PurchaseOrder above) remains unresolved — "Not Applicable Pricing" is the best inference from
  its confirmed behavior, not a confirmed expansion.
- **Whether the two independent write paths into the Price-Code-Book/Rank-Group mapping tables can
  conflict or race** — both write paths were confirmed to exist independently, but since Products' own
  inline write path into these tables is confirmed 100% unreachable dead code (every call site
  commented out, zero external callers found), this is moot for Products' own design; flagged only as a
  candidate defect-risk area for whichever bounded context ends up owning both mapping tables going
  forward. (This mapping chain is a four-module relationship distinct from the eight related modules
  tabulated above, and is not itself tabulated here.)
- **Whether the `Vendors` capability (the vendor/supplier company record itself) has any relationship
  to Products beyond the VendorLinecode cross-reference** — no direct code reference from Products to
  the Vendors capability was found, but the reverse direction (whether Vendors reads Products data) was
  not independently verified, nor was whether the Product header's own Vendor Name field is populated
  through some Vendors-owned picker not traced in the source blueprint.
