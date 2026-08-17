# Products — Entities & Fields

> Every entity, every field, individually. No grouping/summarizing — that's how fields get lost.
> Legacy table/column names are a first-class column in the field catalog below, not an optional
> footnote — this project's whole documentation discipline rests on every claim being traceable to
> a specific source, and a footnote is too easy to skip. See
> `_deviations-from-original-template.md` in this folder.

> Source: `docs_from_blueprint/module/Products/02-entities-and-fields.md` (business meaning, types,
> requiredness, defaults, source-of-truth, the governing requirements, and the §5 normalized-schema
> proposal), cross-referenced against `blueprint/module/Products/01-entities-fields.md` (Pass 1, the
> module's own field catalog, for Legacy Trace column names — cited per-field as
> `physical_table.column_name`). Where the source grouped columns rather than itemizing them
> individually (e.g. the ten M1–M10 price levels, the seven near-identical classification axes), that
> same grouping is preserved here — it is the source's own judgment call, not information loss.

## 0. Governing architectural requirements (forward-looking, not legacy description)

The blueprint's implementation plan establishes governing design decisions that shape the data model
itself (Doc2 §2.1, restated in `02-entities-and-fields.md` §1). These are requirements for any new
implementation, not observations about the legacy system as it exists today:

- **R1 — No raw string-interpolated SQL, no dynamic column-name construction from request input.**
  11 SQL injections were confirmed across 11 files in the legacy Products module (the highest raw
  count of any module blueprinted in this series), in two shapes: unwhitelisted dynamic column names
  built from a request string, and unescaped/unparameterized values. Every field-routing/mass-update
  branch must resolve against an explicit allow-list of typed domain properties, never a raw request
  string used as a column token; every value must always be parameterized.
- **R2 — The core save operation's own database access is closed to unvalidated input as a
  first-class concern.** One of the eleven confirmed injections (the Global-WAC recalculation block)
  sits inside the Product entity's own core save hook, reachable on an ordinary product edit with a
  changed cost field under Global WAC mode — the single most routine, highest-traffic reachability of
  any Critical finding documented in this blueprint series. The save operation must have no code path
  that reaches the database with any request-derived value not already validated/typed at the
  aggregate boundary.
- **R3 — Barcode uniqueness is a genuine domain invariant, enforced at save time, scoped by
  `(tenant, barcode type)`.** No server-side uniqueness gate exists anywhere in the legacy system for
  Unit/Inner/Case barcodes at product-save time; duplicates are detected only after the fact, and
  "resolved" only through a UI flow whose write-back is itself one of the 11 confirmed SQL injections.
  A barcode value must be unique per `(tenant, barcode_type)` across the live catalog, rejected with a
  specific error at save time, backed by a real uniqueness constraint.
- **R4 — Lot numbers and serial numbers are genuinely different domain concepts with different
  uniqueness policies; the legacy asymmetry between them is correct business logic, not a gap to
  unify — except one narrower gap.** A serial number identifies one physical unit and is already
  hard-blocked on duplication on both insert and edit; a lot number identifies a receiving *batch* and
  legitimately recurs, so the legacy system's absence of lot-number uniqueness enforcement is not
  itself a defect. `SerialNumber` carries a uniqueness invariant scoped `(tenant, product,
  serial_number)`; `LotNumber` carries **no** uniqueness invariant by design. **The one genuine gap**:
  the legacy lot-number *edit* path performs no validation of any kind (not even non-empty/format) —
  the new design adds lightweight format validation without adding uniqueness.
- **R5 — Totals/derived quantities are never independently writable once a derivation relationship
  exists.** Once a product has any variant row, its location-scoped quantity-on-hand must always be
  the live sum of its non-deleted variant rows, never an independently-writable value in parallel —
  closing an unresolved legacy ambiguity about whether a direct QoH edit could be silently clobbered
  by the next variant save.
- **R6 — Every business entity is scoped to a tenant.** Established at the platform level, carried
  forward here as an explicit requirement: every entity below carries a tenant reference, and every
  uniqueness constraint (product number, barcode-per-type, serial-number-per-product, classification-
  axis name, etc.) is scoped per-tenant, not global.

## Entity List

| Entity | Purpose |
|---|---|
| Product (Header) | The core SKU/part record — identity, vendor/manufacturer, base pricing, tax class, catalog/e-commerce flags. Merges the legacy header table and its 1:1 extension table into one combined field surface (~180 fields, the largest in the module). |
| Product Defaults Rule | An admin-configured template of default field values applied to new products matching a linecode/subline pattern. |
| Product/Customer (Line-Code) Cross-Reference Mapping | A customer-specific mapping between the ERP's internal product/linecode and the customer's own part-numbering scheme (EDI/ordering integrations). Jointly owned with Accounts. |
| Product Group (Assortment) | A named collection of products with per-product percentage weighting, group-level UOM-type configuration, a computed cost rollup, and an optional group-level MPL pricing override. |
| Product Sort Order | A per-linecode/make sort-order override used by listview/report ordering. |
| Product Tax Association | Which tax rate(s) apply to a specific product (an override to location/account-level tax rules). |
| Product Tracking (QoH Change History) | An audit-trail row recording every quantity-on-hand change for a product at a location. The single busiest Products-owned data by row count in the live system (15,013 rows in the legacy DB). |
| RGN Product Detail | A per-product line captured when a return/goods-notification-style transaction processes a product return ("RGN" abbreviation unconfirmed). |
| MPL (Master Price List) Pricing | A product's (optionally location-scoped) price-level schedule — the primary Min/Master-Price-List mechanism, redesigned to formalize the live foreign-key/existence-based "current price" semantics and repurpose unused date-range fields as assignment-scheduling inputs. |
| Special MPL (Account/Masterbrand Override) | A variant of the MPL record scoped to special account/masterbrand pricing overrides. |
| Product Variant + Variant Type | A per-location quantity-on-hand tracking row for a product "variant," classified by a variant-type lookup — real, guarded lifecycle logic, confirmed 100% dormant on live data; build deliberately deferred pending confirmation it is a genuinely planned feature. |
| Unit of Measure (UOM) framework | Category → Group → Type conversion framework designating which UOM Type serves each functional role for a product. **Not re-specified here** — see the UOM pointer note in §3.12 below; only Products' own UOM Group assignment field is catalogued in this document. |
| Track Length | A per-product-per-location tracked-length inventory record (products sold/stocked by linear measure). |
| Product Classification Axis (Brand / Color / Division / Linecode / Manufacturer / Profile / Subline) | Seven structurally near-identical named lookup tables classifying a product along independent axes; Division and Subline additionally support a two-level parent hierarchy. |
| Product Tint/Color Item | A paint-tint-mixing formula record associated with a product. |
| Product Barcode | Base/Inner/Outer barcode plus additional/alternate barcodes, unified into one entity — one row per (product, barcode type), carrying the real uniqueness constraint (R3). |
| Product Lot Number | A lot-tracked receiving/inventory record — no uniqueness constraint by design (R4), format-validated on both create and edit. |
| Product Serial Number | A serial-tracked per-unit inventory record — unique per (tenant, product, serial number) (R4), enforced on both create and edit. |
| Related/Alternate Part | A master-to-related product association for substitution at order time, scoped per-location. |
| AUPF (Auto-Update Price Field) Rule | A pricing-automation rule that recomputes one price level from another for products matching a linecode/subline/report-code filter — now requires a non-empty scope at save time. |
| Auto-Update Subline Rule | An analogous automation rule that mass-updates a product's subline classification — same non-empty-scope-at-save-time invariant. |
| Legacy Unmapped Fields (parking table) | A module-agnostic reference table (id → original field name → raw value) for fields confirmed to exist and carry data but whose business meaning was never confirmed — parked pending SME input, never guessed. `[NEW — infra, no legacy table equivalent]` |

**Not carried forward as normative Products-owned entities** (with reason, per source §2):
- **Product-to-Price-Code-Book / Product-to-Rank-Group mapping** — each is the primary table of its own dedicated module; the Products-side inline write logic into these tables is confirmed 100% unreachable dead code (every call site commented out, zero live callers repo-wide). Products becomes a pure read/reference participant.
- **Product Category (legacy picklist)** — only 4 live rows, superseded by linecode/subline/division.
- **Product Collaterals** (binary attachment, 1:1 with a product) — 0 live rows.
- **Door Configuration subsystem** (12 tables, ~2,600-line dispatcher) — explicitly deferred pending a product-owner scope decision on whether door-hardware configurator sales are in scope at all.
- **MPL Price Plan Rule's four legacy filter-join tables** — folded into the redesigned MPL assignment-scheduling mechanism's own scope-filter columns.
- **The legacy scheduled-value-update mechanism** (`lbm_update_mpl_values`) — execution engine never located in any blueprint pass; flagged Phase-0-blocking pending a dedicated follow-up read.
- **The manually-curated cost-change/GP-override table** (`lbm_cost_change_nap_product`) — confirmed to be an admin-only default-GP%-override whitelist for "Not A Product" line items, folded into a nullable default-GP-override field on the Product entity rather than given full entity treatment.
- **`vtiger_productsgroup`** (single-column legacy grouping lookup, 0 live rows) — not migrated; parked as a migration-audit note only.

**Relationship summary**: A Product is classified along seven independent Product Classification
Axes, is assigned to exactly one UOM Group, has zero or more Product Barcodes, zero or more Lot
Number and Serial Number records, zero or more Tint Items, zero or more Related/Alternate Part
associations (as either master or related side), zero or more Product Tracking history rows, an MPL
Pricing assignment per location (resolved by existence, exactly one active assignment per
product/location), an optional Special MPL override, zero or more Price Book associations, zero or
more Product Tax Associations, zero or more Product Group memberships, zero or more Product Defaults
Rule matches (criteria-based, not FK), a Product/Customer Cross-Reference Mapping per customer
account, and can be scoped into any number of AUPF/Auto-Update-Subline rules via linecode/subline/
report-code filters. A Product may also participate in the Price-Code-Book/Rank-Group mapping chain
as a read-only consumer, and may be a Door Configuration component (deferred, not designed here).

## Field Catalog

### 3.1 Product (Header) — merged header + extension surface

Backed in the legacy system by `vtiger_products` (standard entity table, 45 columns) plus
`vtiger_productcf` (1:1 "custom fields" extension table, 142 columns) — together the largest field
surface in the module.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Product ID | Primary key | text (identifier) | Yes | auto_increment | system-set | `vtiger_products.productid` |
| Product Description | Display name/short description | text | No | NULL | user-entered | `vtiger_field` "Product Description"; `.productname` |
| Part Number | The product's SKU/business identifier, distinct from the internal id | text | No | NULL | user-entered | `vtiger_field` "Part Number"; `.productcode` |
| Product Active | Whether the product is active — legacy boolean, **inert**: 100% of live products show it unset, only two peripheral read sites, neither an order-entry gate; structurally superseded by Part Status | boolean | No | 0 | user-entered | `vtiger_field` "Product Active"; `.discontinued` (inverted label) |
| Manufacturer (free-text) | Manufacturer name — a second, FK-shaped Manufacturer field also exists on the extension surface; relation between the two unconfirmed | text | No | NULL | user-entered | `vtiger_field` "Manufacturer"; `.manufacturer` |
| Product Category (legacy) | Legacy category classification, largely superseded by Linecode/Subline/Division | enum | No | NULL | user-entered | `vtiger_field` "Product Category"; `.productcategory` |
| Sales Start Date / Sales End Date | Date range the product is sellable | date ×2 | No | NULL | user-entered | `.sales_start_date` / `.sales_end_date` |
| Support Start Date / Support Expiry Date | Date range of support/warranty coverage | date ×2 | No | NULL | user-entered | `.start_date` / `.expiry_date` |
| Vendor Name | Primary vendor for the product | reference (to Vendor) | No | NULL | user-entered | `.vendor_id` |
| Mfr PartNo / Vendor PartNo | Manufacturer's and vendor's own part numbers | text ×2 | No | NULL | user-entered | `.mfr_part_no` / `.vendor_part_no` |
| Serial No (legacy single field) | Legacy single-serial-number field — superseded by the dedicated Serial Number entity; still-in-use status unconfirmed | text | No | NULL | user-entered | `.serialno` |
| Product Sheet | Path/reference to a product spec sheet | text | No | NULL | user-entered | `.productsheet` |
| GL Account | General-ledger account code for this product | enum | No | NULL | user-entered | `.glacct` |
| Unit Price | Base/list unit price — legacy field, largely superseded by M1–M10 | money | No | NULL | user-entered | `.unit_price` |
| Commission Rate | Sales-commission rate for this product | number(%) | No | NULL | user-entered | `.commissionrate` |
| Tax Class | Which tax class applies to the product | enum | No | NULL | user-entered | `.taxclass` |
| Usage Unit / Qty per Unit / Qty In Stock / Reorder Level / Handler / Qty In Demand | Legacy vtiger-standard fields, confirmed superseded by newer location-scoped or classification mechanisms elsewhere (no business logic found referencing them) | mixed | No | varies | user-entered/derived | `.usageunit` / `.qty_per_unit` / `.qtyinstock` / `.reorderlevel` / `.handler` / `.qtyindemand` |
| Product Image | Filename of the product's primary image | text | No | NULL | user-entered | `.imagename` |
| Long Description | Extended/full product description | text | No | NULL | user-entered | `.product_description` |
| Combine Qty on Pick | Whether identical line items are combined into one pick-ticket line | boolean | No | Yes | user-entered | `.combine_qty_on_pick` |
| E-commerce Upload | Whether/how the product is pushed to the e-commerce channel | enum | No | No | user-entered | `.ecom_upload` |
| E-commerce Description / Specifications / Meta Keyword | Text used specifically for e-commerce listings | text ×3 | No | NULL | user-entered | `.ecom_description` / `.ecom_specifications` / `.meta_keyword` |
| Is Variant Product | Whether this product is itself a variant of a master/parent product | boolean | Yes | No | system-set | `.is_variant_product` |
| Master Product Number | The part number of the master product this variant belongs to | reference (to Product) | No | NULL | system-set | `.master_product_number` |
| Currency | Currency code for pricing — legacy multi-currency field, largely unused in this single-currency deployment | enum | No | NULL | system-set | `.currency` |
| Weight | Physical weight — a duplicate-looking field also exists on the extension surface with its own unit-type selector; which is authoritative is unconfirmed | number | No | NULL | user-entered | `.weight` |
| Pack Size / Cost Factor / Commission Method | Legacy vtiger-standard fields | mixed | No | NULL | user-entered | `.pack_size` / `.cost_factor` / `.commissionmethod` |
| Created Time / Modified Time / Created By / Modified By / Deleted / Assigned To (Owner) | Standard record audit/ownership columns | mixed | No | varies | system-set | `.createdtime` / `.modifiedtime` / `.smcreatorid` / `.modifiedby` / `.deleted` / `.smownerid` |
| **— Extension surface (~142 fields, `vtiger_productcf`) —** | | | | | | |
| Groups (multi-select) | Multi-select product-group tag(s) — relation to the Product Group entity unconfirmed | text/json | No | NULL | user-entered | `.cf_778` |
| Subline / Product Number / Product Number (normalized) | Classification and canonical identity fields — the normalized copy is a whitespace/punctuation-stripped search key, **not** a distinct "Master Part" field | enum(code) + text ×2 | Yes (identity fields) | NULL | user-entered/derived | `.cf_780` / `.cf_782` / `.cf_784` |
| Price Code | The product's price-code letter/short-code | enum(code) | No | NULL | user-entered | `.cf_788` |
| Base / Inner / Outer Barcode + Qty | The product's primary/unit, inner-pack, and outer-case barcodes and their represented unit quantities | text ×3 + number ×3 | No | NULL | user-entered | `.cf_790` / `.cf_792` / `.cf_794` / `.cf_1367` / `.cf_1369` / `.cf_1371` |
| M1 – M10 | Ten parallel price-level columns forming the core Master Price List price-level schedule, each independently editable and each tracked by an audit date/user pair | money ×10 | No | NULL | user-entered | `.cf_796`, `.cf_798`, `.cf_800`, `.cf_802`, `.cf_804`, `.cf_806`, `.cf_808`, `.cf_810`, `.cf_812`, `.cf_1485` |
| M1–M9 Audit Date/User pairs | Per-price-level "last changed on/by" audit pairs — the legacy naming is inconsistent (no clean 1:10 mapping between price levels and audit pairs; no Master1/Master8 pair exists) | datetime + reference ×9 pairs | No | NULL | system-set | `.alt_reference_price_date/_user`, `.master2_date/_user`..`.master7_date/_user`, `.master9_date/_user`, `.reference_price_date/_user` |
| Core Sell Price / Core Cost / Alt Core Sell Price | Sell price and cost of a core-charge component (core-exchange pricing) | money ×3 | No | NULL | user-entered | `.cf_814` (+ `.core_sell_date/_user`) / `.cf_1628` (+ `.core_cost_date/_user`) / `.altcoresellprice` |
| List Price / Jobber Price (audit only) | List price and a "Jobber" price-level audit pair with no corresponding value column identified | money + audit pair | No | NULL | user-entered | `.cf_1729` (+ `.list_price_date/_user`) / `.jobber_date/_user` |
| Equivalent Part Current Cost / High Cost | Cost sourced from an equivalent/cross-referenced part; highest cost on record | money ×2 | No | NULL | derived | `.cf_1809` (+ `.ep_current_cost_date/_user`) / `.cf_1887` |
| Length / Height / Width (+ unit type each) | Physical dimensions | number + enum ×3 | No | NULL | user-entered | `.cf_816`+`.cf_length_type`, `.cf_818`+`.cf_height_type`, `.cf_820`+`.cf_width_type` |
| Weight (extension) + Type | Physical weight with a unit-type selector — see base-table Weight field's duplicate-field note above | number + enum | No | NULL | user-entered | `.cf_822`+`.weight_type` |
| Volume + Type / Total Sq Ft | Computed/entered volume and total square footage (relevant for flooring/sheet-goods) | number + enum / number | No | NULL | user-entered/derived | `.volume`+`.cf_volume_type` / `.total_sq_ft` |
| Part Superseded / Superseding Product (Stripped) | Whether this product has been superseded, and by which part — **confirmed disconnected from the live supersession action**: the current supersession flow never writes these fields on the Product record itself, only on Location's own table; 6 live rows carry data with no located write site | boolean + text | No | NULL | user-entered | `.cf_892` / `.cf_896` |
| Equivalent Part / Master Part Info | Whether an equivalent/cross-referenced part is registered, and free-text info about it | boolean + text | No | NULL | user-entered | `.cf_1805` / `.cf_1807` |
| Transfer / Transfer Pricing & Cost / Superceded-Allow Transfer | Inter-location transfer eligibility and whether pricing/cost transfer along with it | boolean + enum + boolean | No | NULL | user-entered | `.cf_1307` / `.transferpriceandcost` / `.supercededallowtransfer` |
| Sub Category | A second, extension-level category classification distinct from the base-table Product Category | enum | No | NULL | user-entered | `.cf_1487` |
| Price Code Book | Which Price Code Book governs this product's pricing | enum | No | NULL | user-entered | `.cf_1511` |
| Combine Sales History / Combine Qty On Hand | Whether sales-history and quantity-on-hand figures are combined across variant/related products for reporting | boolean ×2 | No | NULL | user-entered | `.cf_1665` / `.cf_1667` |
| Reference Price (audit only) | Audit pair for a "Reference Price" level with no distinctly-named value column identified | audit pair | No | NULL | unclear | `.reference_price_date/_user` |
| Report Codes | Free-text/code field used to filter products for AUPF rules and reporting | text | No | NULL | user-entered | `.reportcodes` |
| AU PF Rule # / AU PF Exception | The id of the last-applied AUPF rule, and a per-product opt-out flag from AUPF rule application | reference + boolean | No | NULL | system-set/user-entered | `.au_pf_rule_no` / `.au_pf_exception` |
| Order Delay | Expected shipping delay in days | number | No | NULL | user-entered | `.orderdelay` |
| OE # / MFG # | Original-equipment and manufacturer part-number cross-references | text ×2 | No | NULL | user-entered | `.cf_oe` / `.cf_mfg` |
| Part Status | The product's lifecycle/catalog status — **the single most pervasively-enforced status field found anywhere in this blueprint series** | enum | No | NULL | system-set/user-entered | `.part_status` |
| Part Type | Classifies the part's role (e.g. main part vs. core/accessory) | enum | No | NULL | user-entered | `.cf_858` |
| VOC | Volatile Organic Compound rating/disclosure (paint products) | text | No | NULL | user-entered | `.cf_voc` |
| Combined SH 1-12 / 13-24 / 25-36 | Three rolling 12-month-bucket combined sales-history totals (used when Combine Sales History is enabled) | number ×3 | No | NULL | derived | `.cf_combinedsh_1to12/_13to24/_25to36` |
| Country of Origin / Tariff Code | Trade-compliance disclosure fields | text ×2 | No | NULL | user-entered | `.cf_coo` / `.cf_tariff_code` |
| Print Product Related Docs | Whether related documents auto-print with this product's output documents | boolean | No | NULL | user-entered | `.cf_print_prd_rel_docs` |
| Flat Rate Hours / Flat Rate Labor Cost | Standard labor hours/cost for a flat-rate-billed service product | number ×2 | No | NULL | user-entered | `.flatratehours` / `.flatratelaborcost` |
| Freeze O2X from Forecast Updates | A date after which this product is excluded/frozen from a forecasting update process ("O2X" abbreviation unconfirmed) | date | No | NULL | user-entered | `.freezeo2xupdate` |
| Global Sales Rank | Computed sales-rank classification across all locations | enum | No | NULL | derived | `.global_sales_rank` |
| Has Serial Number / Has Lot Number | Whether this product is tracked by serial and/or lot number, driving which tracking entities are expected | boolean ×2 | No | NULL | user-entered | `.cf_has_serial_number` / `.cf_has_lot_number` |
| Allow Returns | Whether this product may be returned | boolean | No | NULL | user-entered | `.allow_returns` |
| Grade | Quality-grade classification | enum | No | NULL | user-entered | `.cf_grade` |
| Freeze Reorder Status | Whether automatic reorder-point processing is frozen for this product | boolean | No | NULL | user-entered | `.freezereorderstatus` |
| Product Description 2 | A secondary description line | text | No | NULL | user-entered | `.product_description2` (no label row) |
| Brand / Color / Profile / Manufacturer (FK) | Four of the seven classification axes, each an FK-shaped extension field (Manufacturer's relation to the base-table free-text Manufacturer field is unconfirmed) | reference ×4 | No | NULL | user-entered | `.brand` / `.color_id` / `.profile_id` / `.manufacturer_id` |
| UOM Group | The product's assigned UOM Group — see the UOM pointer note in §3.12 | reference (to UOM Group) | No | NULL | user-entered | `.uomgroup_id` |
| Default SLI Group | Default sales-line-item grouping for this product on printed documents | enum | No | NULL | user-entered | `.cf_default_sli_group` |
| Liquor Category / Alcohol By Volume / Container Type / CRV / Gallons / Units Per Case | A cluster of alcohol-beverage-specific compliance/packaging fields | mixed | No | NULL | user-entered | `.cf_liquor_category`, `.cf_alcohol_by_volume`, `.cf_container_type`, `.cf_crv`, `.cf_gallons`, `.cf_unitpercase` |
| Track Lengths | Whether this product is tracked by length (drives the Track Length entity) | boolean | No | NULL | user-entered | `.tracklength` |
| Sort ID / Temp Sort ID | Sort-order values for listview/report ordering, with a working "temp" staging column | integer ×2 | No | NULL | system-set | `.sortid` / `.temp_sortid` |
| UOM (default/display) | The product's default/display UOM code, distinct from its UOM Group assignment | text | No | NULL | user-entered | `.uom` |
| Tint Item | Whether this product has an associated Tint/Color Item record | boolean | No | NULL | user-entered | `.tintitem` |
| Website | A product-specific website/URL override | text | No | NULL | user-entered | `.cf_product_website` |
| NS Archived | Whether this non-stock product record has been archived | boolean | No | NULL | system-set | `.cf_nsarchived` |
| Do It Best / Emery / Orgill Product | Flags marking this product as sourced from a specific co-op/distributor catalog integration | boolean ×3 | No | NULL | user-entered | `.cf_dib_part` / `.cf_ejd_part` / `.cf_orgill_part` |
| Paint Care Tier | Paint-care-program compliance tier classification | enum | No | NULL | user-entered | `.cf_paint_care_tier` |
| Create Sub SO | Whether ordering this product auto-creates a sub-order (e.g. for a linked service/kit component) | boolean | No | NULL | user-entered | `.cf_create_sub_so` |
| MPL Price Plan | The MPL Price Plan assigned to this product (an alternate pricing mechanism) | reference (to MPL Price Plan) | No | NULL | user-entered | `.cf_mplpriceplanid` |
| Hung Door | Whether this is a pre-hung door product (Door Configuration flag, deferred) | boolean | No | NULL | user-entered | `.cf_is_hung_door` |
| BigCommerce / Uploaded On BigCommerce / Visible to Big-Co-op Customer | Whether/when the product is pushed to the BigCommerce e-commerce integration, and whether it's visible to a specific co-op customer segment ("Big C" abbreviation unconfirmed) | boolean + datetime + boolean | No | NULL | system-set (integration) | `.big_commerce` / `.uploaded_on_bigcommerce` / `.cf_visible_to_big_cust` |
| NS Code Product | Whether this is a non-stock code product | boolean | No | NULL | user-entered | `.is_non_stock` |
| Is Undefined Product / Undefined Product Group ID | Flags a placeholder/undefined product record and its associated undefined-product group | boolean + reference | No | NULL | system-set | `.is_undefined_product` / `.undefined_prod_group_id` |
| Non Stock ID | Reference into non-stock/NS-level configuration when this is a non-stock product | reference | No | NULL | system-set | `.non_stock_id` |
| Data Modified Date | A generic "last data modified" timestamp distinct from the standard modified-time field | date | No | NULL | system-set | `.datamodifieddate` |

**Not individually catalogued** — a working "update all UOM price fields" staging flag
(`vtiger_productcf.is_update_all_uom_price_fields`) and a second, extension-level soft-delete column
(`vtiger_productcf.deleted`, independent of `vtiger_products.deleted`) exist and are documented in the
source but not itemized above beyond noting their presence — see Known Gaps.

### 3.2 Product Defaults Rule

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Rule ID | Primary key | text (identifier) | Yes | auto_increment | system-set | `vtiger_productdefaultsrules.ruleid` |
| Linecode / Subline | The classification pattern this rule matches | enum(code) ×2 | No | NULL | user-entered | `.linecode` / `.subline` |
| Product Name / Part Note / Comment / Primary Supplier | Default values applied to a new product's matching fields | text ×4 | No | NULL | user-entered | `.product_name` / `.part_note` / `.comment` / `.primary_supplier` |

### 3.3 Product/Customer Cross-Reference Mapping (jointly owned with Accounts)

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Mapping ID | Primary key | text (identifier) | Yes | auto_increment | system-set | `vtiger_productmapping.mappingid` |
| CRM ID | The internal product id being mapped | reference (to Product) | Yes | NULL | system-set | `.crmid` |
| Account ID | The customer account this mapping applies to | reference (to Account) | Yes | NULL | system-set | `.accountid` |
| OCS Line Code / OCS Product Number | The internal (ERP-side) line code and product number | reference + text | Yes | NULL | system-set | `.ocslinecode` / `.ocsprodnumber` |
| Customer Line Code / Customer Product Number | The customer's own line-code and part-number equivalents | text ×2 | Yes | NULL | user-entered | `.custlinecode` / `.custprodnumber` |

### 3.4 Product Group (Assortment)

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Product Group ID | Primary key | text (identifier) | Yes | auto_increment | system-set | `lbm_productgroup.productgroupid` |
| Group Name / Group Description | Display name and description | text ×2 | No | NULL | user-entered | `.productgroupname` / `.productgroupdescription` |
| Current Market / Weighted Average Cost | Group-level computed cost rollups | money ×2 | No | NULL | derived | `.currentmarket` / `.weightedaveragecost` |
| UOM Types / Default UOM Type | The set of applicable UOM types across member products, and the group's default | text/json + enum | Yes | NULL | user-entered | `.uom_types` / `.default_uom_type` |
| PG Setting | A group-level on/off feature toggle — which feature it gates is unconfirmed | enum | Yes | OFF | user-entered | `.pg_setting` |
| Created By / Created On / Deleted | Audit and soft-delete fields | reference + datetime + boolean | No | varies | system-set | `.createdby` / `.createdon` / `.deleted` |
| — Member row: Product | A product belonging to this group | reference (to Product) | No | 0 | user-entered | `lbm_productgroup_product.productid` |
| — Member row: Product Percentage | The product's weighting percentage within the group | number(%) | Yes | 0 | user-entered | `.product_percentage` |
| — MPL row: MPL Data | Group-level MPL pricing-level override | json | No | NULL | user-entered | `lbm_productgroup_mpl.mpljson` |

### 3.5 Product Sort Order

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| ID | Primary key | text (identifier) | Yes | auto_increment | system-set | `vtiger_productsortorder.id` |
| Linecode / Make | The classification this sort-order rule applies to | enum(code) + text | Yes | NULL | user-entered | `.linecode` / `.make` |
| Sort Order | The override sort-order value/expression | text | Yes | NULL | user-entered | `.sortorder` |
| Active | Whether the rule is currently active | boolean | Yes | NULL | user-entered | `.active` |

### 3.6 Product Tax Association

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| ID | Primary key | text (identifier) | Yes | auto_increment | system-set | `vtiger_producttaxrel.producttaxrelid` |
| Product ID | The product this tax association applies to | reference (to Product) | Yes | NULL | system-set | `.productid` |
| Tax ID | The tax record applied | reference (to Tax) | Yes | NULL | user-entered | `.taxid` |
| Tax Percentage | The tax rate percentage snapshotted at association time | number(%) | No | NULL | user-entered | `.taxpercentage` |

### 3.7 Product Tracking (QoH Change History)

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Product Tracking ID | Primary key | text (identifier) | Yes | auto_increment | system-set | `vtiger_producttracking.protrackid` |
| Location | The location this quantity-on-hand change occurred at | reference (to Location) | Yes | NULL | system-set | `.mainlocation` |
| Product (correlation) | The product this change applies to — **legacy correlation was by denormalized linecode+product-number, not a direct product reference; the new design uses a typed reference**, closing a confirmed schema-drift finding | reference (to Product) | Yes | NULL | system-set | `.linecode` + `.productnumber` (legacy denormalized correlation pair) |
| Previous / New Quantity On Hand | The quantity before and after this change | number ×2 | Yes | NULL | system-set | `.prev_qtyonhand` / `.new_qtyonhand` |
| Reason For Change / Change Type | Free-text explanation and a classification of what triggered the change (sale, receipt, adjustment, transfer) | text + enum | Yes | NULL | user-entered/system-set | `.reason_for_change` / `.change_type` |
| Changed By (user) | The user who made/triggered the change | reference (to User) | No | NULL | system-set | `.user` |
| Cost / Sell Price (snapshot) | Cost and sell-price snapshots at the time of the change | money ×2 | No | NULL | system-set | `.cost` / `.sellprice` |
| Sales Order / Purchase Order (reference) | The associated order, if applicable | reference ×2 | No | NULL | system-set | `.salesorder` / `.purchaseorder` |
| BOM Number | Associated Bill-of-Materials number, if from a manufacturing/kit transaction | text | No | NULL | system-set | `.bomnumber` |
| Account / Vendor / Customer PO / Store-Transfer Number | Additional transaction context captured at the time of change | mixed | No | NULL | system-set | `.accountid` / `.vendor_id` / `.customer_po` / `.stnumber` |
| Net Cost / WAC / Accounting Cost / Accounting Net Cost / Purchase Cost | Multiple parallel cost-basis snapshots captured at time of change | money ×5 | No | NULL | system-set | `.net_cost` / `.wac` / `.accounting_cost` / `.accountingnetcost` / `.purchase_cost` |
| Bin / Zone / Shelf (snapshot) | Location-within-warehouse snapshot at time of change | text ×3 | No | NULL | system-set | `.cf_bin` / `.cf_zone` / `.cf_shelf` |
| Push To QB | Whether this tracking row has been synced to QuickBooks | boolean | Yes | No | system-set (integration) | `.push_to_qb` |
| M2 (price snapshot) | A snapshot of the M2 price level at time of change | money | No | NULL | system-set | `.m2` |
| Lot Numbers | Free-text/serialized list of lot numbers involved in this change | text | Yes | NULL | system-set | `.lot_numbers` |

### 3.8 RGN Product Detail

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| RGN Product Detail ID | Primary key | text (identifier) | Yes | auto_increment | system-set | `vtiger_rgnproductdetail.rgnproductdetailid` |
| RGN (parent transaction) | Parent transaction this line belongs to — the parent entity itself is not confirmed Products-owned (likely PurchaseOrder-side) | reference | Yes | NULL | system-set | `.rgnid` |
| Product / Linecode / Product Number (normalized) | The product on this line | reference + text ×2 | Yes | NULL | system-set | `.productid` (stored as varchar, FK-shaped) / `.linecode` / `.productstripped` |
| Transaction Code / Type | Classification of the return transaction | integer + text | Yes | NULL | system-set | `.transactioncode` / `.transactiontype` |
| Return Qty | Quantity being returned | number | Yes | NULL | user-entered | `.returnqty` |
| Purchase SO | Associated purchase/sales-order reference | text | Yes | NULL | system-set | `.purchaseso` |
| Description | Free-text description of the return | text | Yes | NULL | user-entered | `.description` |

### 3.9 MPL (Master Price List) Pricing — redesigned per the governing pricing requirement

Three related concepts; see this module's `calculations.md` for the full price-resolution pipeline.

**MPL Price Plan** — a named price-level schedule:

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Plan ID | Primary key | text (identifier) | Yes | auto_increment | system-set | `lbm_mpl_price_plan.mplpriceplanid` |
| Name / Description | Display identity | text ×2 | No | NULL | user-entered | `.mplname` / `.mpldescription` |
| Penny Round | The rounding scheme applied to computed prices | enum | No | NULL | user-entered | `.penny_round` |
| UOM Type | The UOM the plan's prices are expressed in | enum | No | NULL | user-entered | `.uom_type` |
| — Level row: Pricing Level / Take / Formula / Value | Which price level, which cost/price field is the basis, the formula (Add/Subtract/Times/GP%/MU%/Net Price), and the formula's numeric input | enum + enum + enum + number | No | NULL | user-entered | `.leveljsondata` (structured JSON, not itemized as separate columns in the legacy schema) |
| — Location-wise override | A per-location override of the plan's level schedule | json | No | NULL | user-entered | `lbm_mpl_price_plan_level_location_wise.leveljsondata` (+ `.locationid`, `.mpl_plan_id`) |

**MPL Price Plan Assignment** — the live "current price" pointer (one active assignment per
product/location, resolved by existence, not by date). This assignment-pointer shape is a design
requirement carried forward from the governing pricing pipeline documentation; the legacy schema does
not have a dedicated assignment table distinct from the JSON-blob mechanism below — see Known Gaps
for the unresolved precedence question between the three parallel legacy MPL mechanisms.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Product / Location | The product and (optionally) location this assignment applies to | reference ×2 | Yes/No | NULL | system-set | `lbm_product_mpl.productid` / `.locationid` |
| MPL Price Plan | The assigned plan | reference (to MPL Price Plan) | Yes | NULL | system-set | Not cited in source as a direct FK on `lbm_product_mpl` — see Known Gaps (three-mechanism precedence) |
| Assigned At / Assigned By | When and how the assignment was made (manual vs. an automated scheduler) | datetime + enum | No | NULL | system-set | Not cited in source |

**MPL Price Plan Rule (assignment-scheduling input, not a lookup-time gate)** — see `calculations.md`
for the reasoning behind this repurposing of the legacy date-range fields:

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Rule ID | Primary key | text (identifier) | Yes | auto_increment | system-set | `lbm_mpl_price_plan_rule.mplruleid` |
| MPL Price Plan | The plan this rule can assign | reference (to MPL Price Plan) | Yes | NULL | user-entered | Not individually cited — associated via the rule's own row |
| Start Date / End Date | The effective date range governing *when the assignment scheduler reassigns*, not when a price is valid to read | date ×2 | No | NULL | user-entered | `.start_date` / `.end_date` |
| Scope: Division / Linecode / Subline / Product | Filter criteria scoping which products the rule's plan applies to | reference ×4 (nullable) | No | NULL | user-entered | `lbm_mpl_price_plan_rule_division` / `_linecode` / `_subline` / `_product` (four join tables) |

**Scheduled MPL Value Update (legacy, execution engine never located)** — flagged Phase-0-blocking,
not carried forward pending confirmation of whether it is a superseded predecessor or a genuinely
separate live mechanism. Legacy Trace: `lbm_update_mpl_values` (`.id`, `.linecode`, `.subline`,
`.product_division`, `.take`, `.formula`, `.value`, `.mpl_formula`, `.scheduled_date`).

### 3.10 Special MPL (Account/Masterbrand Override)

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Product | The product this special override applies to | reference (to Product) | Yes | 0 | system-set | `lbm_product_special_mpl.productid` |
| Override Data | The price-level schedule as structured data | json | No | NULL | user-entered | Not individually cited beyond the table's existence |
| Sell-Type UOM | The UOM the special-MPL override's sell price is expressed in | text | No | NULL | user-entered | `.selltype_uom` |

### 3.11 Product Variant + Variant Type

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Product Variant ID | Primary key | text (identifier) | Yes | auto_increment | system-set | `lbm_product_variant.productvariantid` |
| Variant Type | The classification of this variant | reference (to Variant Type) | Yes | 0 | user-entered | `.varianttypeid` |
| Location / Product | The location this variant's quantity is scoped to, and the base/master product it is a variant of | reference ×2 | Yes | 0 | system-set | `.locationid` / `.productid` |
| Quantity On Hand / Total Available | The variant's own tracked quantities at this location — **always derived from the live sum of non-deleted variant rows once a product has any variant** (R5), never independently writable | number ×2 | No | 0 | derived | `.qoh` / `.ta` |
| Variant Type ID / Name | Primary key and display name of the variant-type lookup | text (identifier) + text | Yes | NULL | user-entered | `lbm_product_variant_type.varianttypeid` / `.varianttype` |
| — Tracking: Product Tracking Ref | The parent Product Tracking row this variant-qty change correlates to | reference | No | NULL | system-set | `lbm_variant_tracking.protrackid` |
| — Tracking: Prev/New QoH, Net Effect | Before/after variant QoH and the computed delta | number ×3 | No | NULL | system-set | `.prev_qtyonhand` / `.new_qtyonhand` / `.neteffect` |

### 3.12 Unit of Measure (UOM) framework — pointer only, not re-specified here

**Applicability note**: the full UOM Category → Group → Type conversion schema (eleven role-specific
unit-type assignments, conversion-factor table, picking-unit hierarchy) is specified in the **UOM
module's own** `entities-and-fields.md` — it is a separately owned module and is deliberately **not
duplicated here**, per `docs_from_blueprint/module/Products/07-cross-module-integrations.md`'s
explicit "UOM note" and per this module's own `02-entities-and-fields.md` §5 statement: "It does not
re-propose the UOM Category/Type/Group/conversion schema — that normalization is covered in the UOM
module's own spec." Products' own field surface carries exactly one UOM-related field of its own:

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| UOM Group (assignment) | The UOM Group this product is assigned to — a product is assigned to exactly one UOM Group | reference (to UOM Group, owned by the UOM module) | No | NULL | user-entered | `vtiger_productcf.uomgroup_id` |
| UOM (default/display) | The product's default/display UOM code, distinct from its UOM Group assignment | text | No | NULL | user-entered | `vtiger_productcf.uom` |

### 3.13 Track Length

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Track Length ID | Primary key | text (identifier) | Yes | auto_increment | system-set | `lbm_tracklength.tracklengthid` |
| Product / Location | The tracked-length product and the location this row applies to | reference ×2 | Yes | 0 | system-set | `.productid` / `.locationid` |
| UOM Qty | The tracked length quantity, in the product's UOM | number | No | 0.000 | user-entered | `.uomqty` |
| Quantity On Hand | Quantity-on-hand of this tracked length | number | No | NULL | derived | `.qoh` |
| Allocated | Quantity of this tracked length currently allocated to open orders | number | No | 0.000 | derived | `.allocated` |

*Two satellite tables (`lbm_tracklength_ipr`, `lbm_tracklength_range`) exist and are referenced by a
related UI screen (`tracklength_modal.php`) but were not DESCRIBE'd/itemized in the source blueprint —
deferred, not itemized here either.*

### 3.14 Product Classification Axis (Brand / Color / Division / Linecode / Manufacturer / Profile / Subline)

Common fields across all seven axes: an id (primary key), a name (display value), a sort-order value,
the creating user, and a soft-delete flag. Division and Subline additionally support a two-level
parent hierarchy (Division nests under a parent Subline; Subline nests under a parent Linecode).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| ID | Primary key | text (identifier) | Yes | auto_increment | system-set | Brand: `lbm_product_brand.pbrandid`; Color: `lbm_product_color.pcolorid`; Division: `lbm_product_division.productdivisionid`; Linecode: `lbm_product_linecode.productlinecodeid`; Manufacturer: `lbm_product_manufacturer.manufacturerid`; Profile: `lbm_product_profile.pprofileid`; Subline: `lbm_product_subline.productsublineid` |
| Name | The display value for this classification axis | text | Yes | NULL | user-entered | `pbrand` / `pcolor` / `divisionname` / `linecodename` / `manufacturer` / `pprofile` / `sublinename` (respectively) |
| Based (Linecode only) | Whether the linecode is a system-seeded value or user-created | enum | No | User | user-entered | `lbm_product_linecode.based` |
| Parent (Division/Subline only) | The parent Subline/Linecode this value nests under | reference | No | NULL | user-entered | `lbm_product_division.parent_productsublineid` / `lbm_product_subline.parent_productlinecodeid` |
| Sort Order ID / Tree Sort Order ID (hierarchy axes only) | Display ordering | integer ×2 | No | NULL | user-entered | `.sortorderid` (all seven); `.treesortorderid` (Division/Subline only) |
| User ID | The user who created the value | reference (to User) | No | NULL | system-set | `.userid` |
| Deleted | Soft-delete flag | boolean | No | 0 | system-set | `.deleted` |

Row counts at time of blueprinting (informational, not a schema fact): Brand 2, Color 6, Division 10,
Linecode 146, Manufacturer 23, Profile 5, Subline 170.

*A bridge table (`masterproductlinecode`, 0 live rows) linking a product to a "Line Code Prefix"
string exists — purpose unconfirmed, tentatively grouped under this family pending confirmation, see
Known Gaps.*

### 3.15 Product Tint/Color Item

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| ID | Primary key | text (identifier) | Yes | auto_increment | system-set | `lbm_product_tintitem.id` |
| Product | The paint product this tint formula belongs to | reference (to Product) | No | NULL | system-set | `.productid` |
| Color Name / Formula | Display name of the mixed color and the tint-mixing formula/recipe text | text ×2 | No | NULL | user-entered | `.colorname` / `.formula` |
| Deleted | Soft-delete flag | boolean | No | 0 | system-set | `.deleted` |

### 3.16 Product Barcode (unified, per the governing R3 requirement)

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| ID | Primary key | text (identifier) | Yes | auto_increment | system-set | `lbm_additional_barcodes.id`; base/inner/outer barcode values themselves also legacy-duplicated on `vtiger_productcf.cf_790/792/794` (header columns, see §3.1 and the §5 redesign notes for why those header columns are dropped) |
| Product | The product this barcode belongs to | reference (to Product) | Yes | NULL | system-set | `.productid` |
| Barcode Type | Which barcode role this row represents (Unit / Inner / Outer / Additional) | enum | Yes | NULL | system-set | Not a single legacy enum column — inferred from which legacy field/table the value originates from (header Base/Inner/Outer columns vs. `lbm_additional_barcodes`) |
| Barcode Value | The scanned/assigned barcode string — **unique per `(tenant, barcode type)`** across the live catalog (no such constraint exists in the legacy schema today — this is a new invariant, R3) | text | Yes | NULL | user-entered | `.additional_barcode` (additional); `vtiger_productcf.cf_790/792/794` (base/inner/outer) |
| Unit Qty | The unit quantity represented by one scan of this barcode | number | No | 0 | user-entered | `.additional_barcode_qty`; `vtiger_productcf.cf_1367/1369/1371` |
| Source | Whether the barcode was added manually or via CSV import | enum | Yes | Manual | system-set | `lbm_additional_barcodes.create_from` (values include `LO` = manual) |

### 3.17 Product Lot Number

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| ID | Primary key | text (identifier) | Yes | auto_increment | system-set | `fuse5_product_lot_numbers.lotid` |
| Product / Location | The product and location this lot record belongs to | reference ×2 | Yes | NULL | system-set | `.productid` / `.locationid` |
| Lot Number | The specific lot/batch identifier — **format/non-empty-validated on both create and edit; deliberately no uniqueness constraint** (R4), since the same lot number legitimately recurs across shipments — the legacy edit path today performs no validation at all, a confirmed gap | text | Yes (format-validated) | NULL | user-entered | `.lot_number` |
| Receiving Reference | Source of the record (e.g. a specific receiving/PO transaction) | reference | No | NULL | system-set | `.refid` / `.po_num` |
| Allocation Status | Whether this specific lot unit is currently allocated to an open order | boolean | Yes | No | system-set | `.is_allocated` |

### 3.18 Product Serial Number

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| ID | Primary key | text (identifier) | Yes | auto_increment | system-set | `fuse5_product_serial_numbers.serialid` |
| Product / Location | The product and location this serial record belongs to | reference ×2 | Yes | NULL | system-set | `.productid` / `.locationid` |
| Serial Number | The specific serial identifier — **unique per `(tenant, product, serial number)`**, enforced on both create and edit, matching legacy behavior already confirmed correct | text | Yes | NULL | user-entered | `.serial_number` |
| Receiving Reference / PO Number | Source of the record | reference + text | No | NULL | system-set | `.refid` / `.po_num` |
| Allocation Status | Whether this specific serial unit is currently allocated to an open order | boolean | Yes | No | system-set | `.is_allocated` |

### 3.19 Related/Alternate Part

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Related Part ID | Primary key | text (identifier) | Yes | auto_increment | system-set | `fuse5_relatedpart.relatedpartid` |
| Master Product / Linecode / Product Number | The "master" side of the association — the product being substituted from | reference + reference + text | No | 0/NULL | system-set | `.mproductid` / `.mlinecode` / `.mproductnumber` |
| Related Product / Linecode / Product Number | The "related" side — the substitute/alternate product | reference + reference + text | No | 0/NULL | system-set | `.rproductid` / `.rlinecode` / `.rproductnumber` |
| Part Type | Classification of the relationship (e.g. substitute, accessory) | enum(code) | No | NULL | user-entered | `.parttype` |
| Rounding Rule | How the substitute quantity is rounded when the qty ratio isn't 1:1 | enum | No | Always Up | user-entered | `.roundingrule` |
| Part Qty | The quantity ratio between master and related part | number | No | 1.00 | user-entered | `.partqty` |
| Location | The location this association is scoped to | reference (to Location) | No | 0 | user-entered | `.locationid` / `.locationname` |
| Deleted | Soft-delete flag | boolean | No | 0 | system-set | `.deleted` |

### 3.20 AUPF (Auto-Update Price Field) Rule

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Rule ID / Rule # | Primary key and a separate sequential display number | text (identifier) + integer | Yes | NULL | system-set | `vtiger_autoupdatepricefieldsrules.ruleid` / `.rule_no` |
| Sequence | Display/execution order among rules | integer | No | NULL | user-entered | `.sequence` |
| Linecode / Subline / Report Codes | Filter criteria selecting which products the rule applies to — **at least one must be non-empty at save time** (AUPF-specific non-empty-scope invariant) | enum(code) ×3 | At least one required | NULL | user-entered | `.linecode` / `.subline` / `.report_codes` |
| From Price Level / From Range / To Range | Source price level and the qualifying value range it must fall within | enum + number ×2 | No | NULL | user-entered | `.from_pricelevel` / `.from_range` / `.to_range` |
| Times | The multiplier applied to compute the target price level (a ratio, e.g. 1.15 for +15%, not an additive delta) | number | No | NULL | user-entered | `.times` |
| Value Based On UOM | Whether the rule accounts for variant-UOM pricing (divides rather than multiplies; zeroes `times` when enabled per the legacy save handler) | boolean | No | NULL | user-entered | `.vuom` |
| To Price Level | The target price level the rule writes | enum | Yes | NULL | user-entered | `.to_pricelevel` |
| Comment | Free-text rule description | text | No | NULL | user-entered | `.comment` |
| Auto Update | Whether the rule runs automatically (cron-driven) vs. manually | boolean | No | NULL | user-entered | `.auto_update` |
| Date Update | The scheduled date for date-triggered execution | date | No | NULL | user-entered | `.date_update` |

### 3.21 Auto-Update Subline Rule

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Rule ID / Rule # | Primary key and display rule number | text (identifier) + integer | Yes | NULL | system-set | `vtiger_autoupdatesublinerules.ruleid` / `.rule_no` |
| Linecode / Match Pattern / Target Subline | Match criteria (linecode, a part-number pattern) and the target subline value to assign — **at least one of linecode/match-pattern must be non-empty at save time** | mixed | At least one required | NULL | user-entered | `.linecode` / `.critarea` + `.prno` (match pattern) / `.subline` |
| Auto Update / Date Update | Same automation-trigger pattern as the AUPF Rule | boolean + date | No | NULL | user-entered | `.auto_update` / `.date_update` |

### 3.22 Legacy Unmapped Fields (parking table — new, infra only)

`[NEW — infra, no legacy table equivalent]`. A module-agnostic reference table (id → original field
name → raw value) proposed to park fields the source blueprint confirmed exist and carry data but
whose business meaning was never confirmed (e.g. `vtiger_productcf.cf_2069` on Product Tracking, the
"Jobber Price" and "Reference Price" audit-only pairs with no located value column). No fields are
guessed into a business meaning to avoid populating this table with fabricated entries — see Known
Gaps below for the full unresolved list this table would receive.

## Known Gaps

Carried forward verbatim from the source blueprint — nothing here is resolved by guessing:

1. **"RGN" abbreviation is unexpanded** — the RGN Product Detail entity's exact expansion was never confirmed.
2. **`Manufacturer` (free-text, on the Product header, `.manufacturer`) vs. `Manufacturer` (FK, on the extension surface, `.manufacturer_id`)** — which is authoritative, or whether one is legacy, was never confirmed. Flagged Phase-0-blocking for migration, since collapsing the two columns cannot be done safely without knowing which wins on conflict.
3. **`Serial No` (legacy single field on the Product header, `.serialno`)** — still in active use, or fully superseded by the dedicated Serial Number entity, was never confirmed.
4. **The Product header's multi-select "Groups" field (`.cf_778`) relationship to the Product Group entity** — same grouping concept, or two independent mechanisms, was never confirmed.
5. **A vestigial single-column legacy grouping lookup (`vtiger_productsgroup`, 0 live rows)** — vestigial predecessor to Product Group, or still referenced somewhere outside the source blueprint's read scope, was never confirmed.
6. **Precedence between the three parallel MPL mechanisms** — the JSON-blob `lbm_product_mpl`, the newer rule-based `lbm_mpl_price_plan`/`_rule` family, and `lbm_update_mpl_values` are all live and populated; which takes precedence when they overlap is not confirmed. The legacy scheduled-value-update mechanism's (`lbm_update_mpl_values`) own execution engine was never located at all — a narrower, still-open sub-question.
7. **A "Line Code Prefix" bridge table's column meaning is unconfirmed** (`masterproductlinecode.LCP`, 0 live rows).
8. **A second "Date Created"-shaped field on the extension surface (`.cf_824`) vs. the header's standard created-time field (`.createdtime`)** — relationship unconfirmed.
9. **"O2X" abbreviation is unexpanded** (`.freezeo2xupdate`, a forecast-update freeze field).
10. **"Big-Co-op"/"Big C" abbreviation is unexpanded** (`.cf_visible_to_big_cust`, a customer-visibility flag, tentatively a co-op member program name).
11. **A generic "last data modified" date field's (`.datamodifieddate`) purpose/relationship to the standard modified-time field is unconfirmed.**
12. **The Product Group's own on/off feature toggle's (`lbm_productgroup.pg_setting`) gated feature is unconfirmed.**
13. **A staging/queue table (`lbm_product_calc_update`) and an audit-log table (`lbm_productcut_audit`) exact triggering business processes are unconfirmed** — one is now confirmed to be a plain cron work-queue (role resolved, insert site still unlocated); the other's role (an audit log of "product cut," cost or catalog pruning) remains fully open.
14. **Two Track Length satellite tables** (`lbm_tracklength_ipr`, `lbm_tracklength_range`) are referenced by a related UI screen but were never itemized in the source blueprint — deliberately deferred, not itemized here either.
15. **The Door Configuration subsystem** (12 tables) is catalogued at table-purpose depth only in the source blueprint — full column-level field catalog deferred to a dedicated follow-up pass, gated on the Phase-0 product-owner scope decision.
16. **A working "update all UOM price fields" staging flag (`vtiger_productcf.is_update_all_uom_price_fields`) and a second, extension-level soft-delete column (`vtiger_productcf.deleted`, independent of `vtiger_products.deleted`)** exist and are documented in the source but their active-use status beyond the standard vtiger extension-table pattern was not independently confirmed.
17. **`vtiger_products.weight` vs. `vtiger_productcf.cf_822`("Weight") + `.weight_type`** — two weight-shaped fields exist on the header and extension table respectively; which one is authoritative (or whether one is legacy/unused) is not confirmed.
18. **RGN vs. Reverse-RGN table pairing inconsistency** — `vtiger_rgnproductdetail` (Products-referenced) and `fuse5_reversergnproductdetails` (zero Products-file references, ruled out as not Products-owned) look like they should be a matched forward/reverse pair, but only one side is confirmed Products-owned by the blueprint's Grep evidence.
19. **"Jobber Price" and "Reference Price" audit pairs** (`.jobber_date/_user`, `.reference_price_date/_user`) have no corresponding value column identified in the source blueprint at all — meaning unclear.
20. **`lbm_mpl_price_plan_rule_product`** — despite the "mpl_price_plan" family being Products-owned, this specific join table had zero Products-file references found in the source blueprint's Grep; likely still Products-owned (the natural product-level override join for `lbm_mpl_price_plan_rule`) but its write path was never located.
21. **A second "created by" field on the extension surface** (`.cf_created_by`) distinct from the base-table `.smcreatorid` — purpose unclear.
22. Roughly 14 additional field-meaning gaps carried forward unresolved from the source blueprint's own consolidation pass (individually listed inline in the field catalog above with an unconfirmed/unclear note, or in this section) require subject-matter-expert confirmation before being assigned a normative business meaning — none are guessed at in this document.

---

## 5. Recommended rewrite schema — a design proposal, not a legacy-system finding

Everything above (§0, §3.1–§3.22, Known Gaps) documents what exists today, restated as forward-looking
data-model requirements or transcribed from the source blueprint's own field catalog. This section is
different in kind: a proposed replacement schema for Products' own core entities, reasoned from the
specific structural problems the legacy shape causes (each cited back to where it's documented
elsewhere in this document). It does **not** re-propose the UOM Category/Type/Group/conversion schema
— that normalization is covered in the UOM module's own spec; Products' relationship to it here remains
a single `uom_group_id` reference, unchanged from §3.12. Table/column names below are tech-agnostic
placeholders, not a commitment to any specific naming convention.

**Problems this design fixes, one by one:**

1. **The merged header + extension surface is one ~180-field row conflating core identity with every
   unrelated concern** — pricing, dimensions, e-commerce flags, compliance disclosures, and integration
   bookkeeping all live as flat columns on the single widest row in the whole module (§3.1). A schema
   change to any one concern touches the same table as a change to core identity, and every read of "a
   product" pulls all ~180 columns regardless of which concern the caller actually needs. **Fix**: split
   by concern into a small core-identity table plus satellite tables, one per concern, each
   independently extensible.
2. **`Manufacturer` exists as two parallel, unreconciled columns** — a free-text field on the base
   header and a separate FK-shaped field on the extension surface — with the relationship between them
   never confirmed, flagged Phase-0-blocking for migration specifically because collapsing them cannot
   be done safely without knowing which wins on conflict (§3.1; Known Gap 2). **Fix**: one column, a
   required FK into the Manufacturer classification axis (§3.14) — the free-text variant is not carried
   forward, closing the ambiguity by construction rather than by a migration-time guess.
3. **`Weight` exists as two parallel, unreconciled columns** — a base-header numeric field and a
   separate extension-surface field with its own unit-type selector — with authoritativeness never
   confirmed (Known Gap 17). **Fix**: one weight column paired with one unit-type column, matching the
   pattern already used correctly for Length/Height/Width.
4. **Base/Inner/Outer barcode values and quantities are duplicated as inline columns on the Product
   header itself**, alongside the dedicated Product Barcode entity (§3.16) that already carries the real
   `(tenant, barcode_type)` uniqueness invariant (R3) — two representations of the same fact with no
   confirmed synchronization between them, and the header copy was never subject to any uniqueness check
   at all. **Fix**: no barcode columns of any kind on the core product table; the Product Barcode table
   (§3.16) is the single source, with its unique constraint as the actual integrity backstop rather than
   a UI-only check.
5. **Ten parallel M1–M10 price-level columns plus nine independently-named audit-date/user pairs with
   no clean 1:10 mapping between them** (§3.1) — adding an eleventh price level means a schema
   migration, and a level with no populated audit pair is silently indistinguishable from one that was
   never audited. **Fix**: normalize price levels into one row per (product, price-level code) pair,
   each row carrying its own audit columns natively — no separate, drifting audit-pair table.
6. **The Product-to-Price-Code-Book and Product-to-Rank-Group mapping logic is confirmed 100%
   unreachable dead code** — every call site commented out, zero live callers found repo-wide, with the
   two dedicated modules' own management screens as the only actual writers today. Carrying placeholder
   mapping columns or FKs for this on the new Product table would reintroduce a write surface the legacy
   system has already structurally abandoned. **Fix**: no PCB/RankGroup columns or mapping tables on the
   Products side at all; Products consumes both concepts as a pure read participant, never local storage.
7. **The mass-update apply path has no count-confirmation, dry-run, or batch-size cap at the
   application layer** (see `risks-and-open-questions.md`) — primarily an application-service gate, not
   a schema defect, but it has a genuine schema-level angle: today there is no record of what a mass
   update actually changed, at what scope, or who authorized it, after the fact. **Fix (schema-level
   angle only)**: an explicit mass-update batch/audit table capturing the filter scope, the
   server-computed affected-row-count preview, a confirmation token binding preview to execution, and
   the executing user/timestamp — giving the application-layer gate a durable record to enforce against
   and audit after the fact, rather than requiring the confirmation step to be trusted as stateless. This
   directly connects to the permissions gap noted in `permissions.md` — an ungated, uncapped mass-write
   capability is exactly the kind of thing a proper authorization model should gate.

**Proposed tables:**

- **`product`** (core identity only) — `id` (PK), `tenant_id`, `product_number` (unique per tenant),
  `part_number`, `description`, `long_description`, `part_status` (enum, FK to a status lookup),
  `part_type` (enum), `vendor_id` (FK), `manufacturer_id` (FK → Manufacturer classification axis,
  required — closes problem 2), `brand_id` / `color_id` / `division_id` / `linecode_id` / `profile_id` /
  `subline_id` (FK each → their respective classification axis table — real, enforced FKs rather than
  the string-matched linecode/subline correlations found elsewhere in this module, e.g. §3.7's legacy
  denormalized correlation), `uom_group_id` (FK → UOM Group, per the UOM module's own schema),
  `tax_class_id` (FK), `gl_account_id` (FK), `is_variant_product` (boolean), `master_product_id`
  (FK → `product`, nullable, required when `is_variant_product`), audit columns
  (`created_at`/`updated_at`/`created_by`/`updated_by`), `is_deleted`/`deleted_at`. The ~180-field
  header+extension surface's other concerns are gone from this table entirely, split into the tables
  below.
- **`product_price_level`** (new — replaces the flat M1–M10 + audit-pair columns, closes problem 5) —
  `id` (PK), `product_id` (FK → `product`), `price_level_code` (a small lookup/enum table rather than a
  hardcoded column list, so an eleventh price level is a data insert, not a migration), `value` (money),
  `last_changed_at`, `last_changed_by` (FK → User), unique on (`product_id`, `price_level_code`), audit
  columns.
- **`product_dimension`** — `product_id` (FK → `product`, PK), `length`/`width`/`height` + their unit
  types, `weight` (single column, closes problem 3) + `weight_unit_type`, `volume` + `volume_unit_type`,
  `total_sq_ft`.
- **`product_ecommerce`** — `product_id` (FK → `product`, PK), `upload_mode` (enum), `description`,
  `specifications`, `meta_keyword`, `bigcommerce_uploaded_at`, `visible_to_co_op_customer` (boolean),
  `website_override`.
- **`product_compliance`** — `product_id` (FK → `product`, PK), `country_of_origin`, `tariff_code`,
  `voc_rating`, plus the alcohol-beverage-specific cluster (`liquor_category`, `alcohol_by_volume`,
  `container_type`, `crv`, `gallons`, `units_per_case`) and `paint_care_tier` — grouped here as the
  compliance/regulatory-disclosure concern, kept off the core identity table.
- **`product_barcode`** — as already specified in §3.16, unchanged here; the header-level Base/Inner/
  Outer barcode columns and their duplicate quantities are **not** carried forward onto `product` or
  `product_dimension` (closes problem 4) — this table, with its real unique constraint on
  (`tenant_id`, `barcode_type`, `barcode_value`), is the only representation.
- **`product_mass_update_batch`** (new — schema-level angle on problem 7) — `id` (PK), `tenant_id`,
  `initiated_by` (FK → User), `requested_at`, `filter_scope` (structured, not a raw request-string
  echo), `field_selection` (structured, validated against the same server-side allow-list R1 requires
  for the apply path itself), `affected_row_count_preview` (integer), `confirmation_token` (unique),
  `executed_at`, `executed_by` (FK → User, nullable until executed), `status` (enum: previewed /
  confirmed / executed / expired). The apply path itself remains an application-service concern; this
  table is what makes "what changed, at what scope, confirmed by whom" a queryable fact afterward rather
  than an unrecorded side effect.

**On the Product-header supersession pair**: the two legacy header fields (`Part Superseded` /
`Superseding Product`) are **not** carried forward as independently-writable columns on `product` — no
write site was ever located for them despite an exhaustive search, and the actual supersession
transition is already, correctly, Location-owned (see `integrations.md`). If a read-time convenience
projection is still wanted on the product record, it should be computed from Location's own
authoritative transition data, never an independently-editable column of its own.

**Referential integrity**: every FK above should be a real, enforced database constraint. This directly
closes a two-hop pattern found repeatedly in this module's risk register — an unwhitelisted/unvalidated
identifier reaching the database as a raw string is a data-access-layer concern per R1/R2, but a schema
that only enforces relationships "by convention" (e.g. the legacy linecode+product-number string
correlation §3.7 replaces with a typed FK) leaves a second, independent gap even after the query layer
is fixed. Recommend `RESTRICT` on delete for every classification-axis and lookup table referenced above
while any dependent `product` row exists, and a real unique constraint — not an application-only check —
for every invariant this document's own governing requirements (§0) already establish: product number
and barcode-per-type per tenant (R3, R6), and serial-number-per-product (R4).
