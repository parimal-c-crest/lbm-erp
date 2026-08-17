# Vendors — Entities & Fields

> Every entity, every field, individually. No grouping/summarizing — that's how fields get lost.
> Legacy table/column names are a first-class column in the field catalog below, not an optional
> footnote — this project's whole documentation discipline rests on every claim being traceable to
> a specific source, and a footnote is too easy to skip. See
> `_deviations-from-original-template.md` in this folder.

Source: `docs_from_blueprint/module/Vendors/02-entities-and-fields.md`, cross-checked for legacy column
names against `blueprint/module/Vendors/01-entities-fields.md` §2.

## Entity List

| Entity | Purpose |
|---|---|
| Vendor (Header + Custom Fields) | The supplier record itself: identity, contact info, GL/tax configuration, freight/PO terms, EDI/X12/Saberis/Aconnex integration credentials, QuickBooks (via OCS) and SlipStream sync identifiers, and the sub-vendor/contact-information picker lists. |
| Vendor Physical Address | A vendor's ship-from address book (distinct from the header's own single street/city/state/zip fields); supports multiple addresses per vendor with one flagged default. |
| Primary Supplier Assignment | Records which Vendor or Location is the designated default/primary supplier for a given vendor-at-a-location pairing. |
| Vendor-Contact Relation | A many-to-many link between a Vendor and Contacts-module records. |
| Vendor Conversion Rule | A per-vendor mapping of manufacturer part number to internal line code. |
| Vendor Line Code | The manufacturer line-code reference/pricing-configuration record (one row per line code a vendor supplies) — door/slab/component classification flags, square-footage pricing, markup adder, GL cost/income account codes. **Confirmed genuinely four-way shared** (Vendors' narrow `description`-only write, a separate `VendorLinecode` module's full CRUD, Products' read-only consumption, SalesOrder's client-side pricing-calculator read) — not exclusively Vendors-owned despite being documented here. |
| Vendor Line Code Alias | A per-vendor alternate/"other" code mapped onto one of the vendor's line codes (distinct from Vendor Conversion Rule's mfg-number mapping). |

**Relationship summary**: A Vendor header has zero or more Vendor Physical Address rows, zero or more
Vendor-Contact links, zero or more Vendor Conversion Rule rows, zero or more Vendor Line Code rows, and —
through those line codes — zero or more Vendor Line Code Alias rows. A Primary Supplier Assignment row
references a Location and designates either another Vendor or a Location as the primary supplier
(disambiguated by a supplier-type field). A Vendor can also reference other Vendors directly as
**sub-vendors** (a pipe-delimited list of vendor ids on the header, not a normalized join table) — a
second, denormalized parent/sub-vendor relationship distinct from Primary Supplier Assignment.

## Field Catalog

### Vendor — Header

Backed by the core supplier record table (20 physical columns, 14 CRM-registered).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Vendor ID | Primary key (also the shared entity table's id) | text (identifier) | Yes | 0 | system-set | `vtiger_vendor.vendorid` |
| Vendor Name | The supplier's display/legal name | text | Yes | NULL | user-entered | `vtiger_field` 255 "Vendor Name"; `vtiger_vendor.vendorname` |
| Phone | Vendor's main phone number | text | No | NULL | user-entered | `vtiger_field` 256; `vtiger_vendor.phone` |
| Email | Vendor's main email address | text | No | NULL | user-entered | `vtiger_field` 257; `vtiger_vendor.email` |
| GL Account | General-ledger account code associated with this vendor | text | No | NULL | user-entered | `vtiger_field` 259; `vtiger_vendor.glacct` |
| Website | Vendor's website URL | text | No | NULL | user-entered | `vtiger_field` 258; `vtiger_vendor.website` |
| Category | Vendor category/classification | enum(text) | No | NULL | user-entered | `vtiger_field` 260; `vtiger_vendor.category` |
| Street | Vendor's street address | text | No | NULL | user-entered (fallback source for a default Physical Address row) | `vtiger_field` 263; `vtiger_vendor.street` |
| City | Vendor's city | text | No | NULL | user-entered | `vtiger_field` 265; `vtiger_vendor.city` |
| State | Vendor's state | text | No | NULL | user-entered | `vtiger_field` 266; `vtiger_vendor.state` |
| Po Box | Vendor's PO box (alternate to street) | text | No | NULL | user-entered | `vtiger_field` 264; `vtiger_vendor.pobox` |
| Postal Code | Vendor's zip/postal code | text | No | NULL | user-entered | `vtiger_field` 267; `vtiger_vendor.postalcode` |
| Country | Vendor's country | text | No | NULL | user-entered | `vtiger_field` 268; `vtiger_vendor.country` |
| Description | Free-text description of the vendor | text | No | NULL | user-entered | `vtiger_field` 269 (on shared `vtiger_crmentity`, not `vtiger_vendor` itself) |
| Vendor Image | Filename of the vendor's uploaded logo/photo | text | No | NULL | system-set | `vtiger_field` 1583; `vtiger_vendor.imagename` |
| QuickBooks List ID | The QuickBooks-side list identifier for this vendor, used by the two-way sync to match records | text | Yes | NULL | system-set (integration) — no UI label; meaning inferred from sync context | `vtiger_vendor.qb_listid` |
| QuickBooks Edit Sequence | QuickBooks' optimistic-concurrency edit-sequence token, required on every update push | text | Yes | NULL | system-set (integration) — same basis as above | `vtiger_vendor.qb_editsequence` |
| PO Comments | Default free-text comment applied to Purchase Orders placed with this vendor | text | No | NULL | user-entered | `vtiger_field` 4492; `vtiger_vendor.po_comments` |
| SlipStream Config ID | SlipStream integration's configuration id for this vendor | reference | No | 0 | system-set (integration) — no UI label | `vtiger_vendor.ss_config_id` |
| SlipStream Account ID | SlipStream integration's account id for this vendor | text | No | `''` | system-set (integration) — no UI label | `vtiger_vendor.ss_account_id` |

### Vendor — Custom-Field Extension

Backed by a 1:1 "custom fields" extension table joined to the header (91 CRM-registered columns of ~108
total physical columns).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Vendor ID (FK) | 1:1 FK back to the header, also this table's PK | text (identifier)/reference | Yes | 0 | system-set | `vtiger_vendorcf.vendorid` |
| Vendor Number | System-assigned/user-editable unique vendor number, auto-generated for new vendors | text | Yes | NULL | system-set | `vtiger_field` 3065; `vtiger_vendorcf.vendornumber` |
| Vendor Abbreviation / Line Code | Short code identifying this vendor, **functionally treated as the vendor's "Line Code" throughout the entity class** despite its CRM label reading "Vendor Abbreviation" — confirmed label/usage mismatch, see Known Gaps | text | No | NULL | user-entered | `vtiger_field` 1058 "Vendor Abbreviation"; `vtiger_vendorcf.cf_1057` |
| Customer Service Phone | Vendor's customer-service department phone | text | No | NULL | user-entered | `vtiger_field` 1064; `.cf_1063` |
| Customer Service E-Mail | Vendor's customer-service department email | text | No | NULL | user-entered | `vtiger_field` 1070; `.cf_1069` |
| Customer Service Fax | Vendor's customer-service department fax | text | No | NULL | user-entered | `vtiger_field` 1072; `.cf_1071` |
| Tech Line Phone | Vendor's technical-support line phone | text | No | NULL | user-entered | `vtiger_field` 1074; `.cf_1073` |
| Tech Line Email | Vendor's technical-support line email | text | No | NULL | user-entered | `vtiger_field` 1076; `.cf_1075` |
| Tech Line Fax | Vendor's technical-support line fax | text | No | NULL | user-entered | `vtiger_field` 1078; `.cf_1077` |
| CSR Name | Name of this vendor's assigned customer-service rep | text | No | NULL | user-entered | `vtiger_field` 1080; `.cf_1079` |
| CSR Phone | CSR's phone number | text | No | NULL | user-entered | `vtiger_field` 1082; `.cf_1081` |
| CSR Email | CSR's email address | text | No | NULL | user-entered | `vtiger_field` 1084; `.cf_1083` |
| CSR Fax | CSR's fax number | text | No | NULL | user-entered | `vtiger_field` 1086; `.cf_1085` |
| Our Master Account # | This business's account number with the vendor | text | No | NULL | user-entered | `vtiger_field` 1088; `.cf_1087` |
| Minimum Order Amount | Minimum dollar order size the vendor requires | money | No | NULL | user-entered | `vtiger_field` 1090; `.cf_1089` |
| Small Order Charge | Fee charged by the vendor for orders below the minimum | money | No | NULL | user-entered | `vtiger_field` 1092; `.cf_1091` |
| Freight PPD Amount | Freight-prepaid threshold/amount for this vendor, normalized between dollars and units before persisting | money | No | NULL | user-entered | `vtiger_field` 1096; `vtiger_vendorcf.cf_1095` |
| Terms Comment | Free-text note on this vendor's payment terms | text | No | NULL | user-entered | `vtiger_field` 1100; `.cf_1099` |
| Warehouse Code | Code identifying the vendor's fulfilling warehouse | text | No | NULL | user-entered | `vtiger_field` 1102; `.cf_1101` |
| Lines Purchased | Comma-delimited list of line codes this vendor is the (current) supplier of; kept sorted/de-duplicated by several independent write paths | text | No | NULL | system-set (derived) | `vtiger_field` 1176; `vtiger_vendorcf.cf_1175` |
| Manufacturer/Supplier/Subcontractors | Classifies whether this vendor record represents a manufacturer, supplier, subcontractor, or (since a 2017 rename) "all" relationship | enum(text) | No | NULL | user-entered | `vtiger_field` 1180; `vtiger_vendorcf.cf_1179` |
| Freight PPD Based on | Basis used to determine the freight-prepaid threshold (dollars vs. unit count) | enum(text) | No | NULL | user-entered — drives a dollars-vs-units coercion of Freight PPD Amount | `vtiger_field` 1182; `.cf_1181` |
| Backorder/Cancel | Default vendor-side behavior (backorder vs. cancel) for unfulfillable order lines | enum(text) | No | NULL | user-entered | `vtiger_field` 1184; `.cf_1183` |
| Default Lead Time | Default supplier lead time (days) used when this vendor has no product-specific lead-time data | number | No | NULL | user-entered | `vtiger_field` 1186; `.cf_1185` |
| Sales Rep Phone | Vendor's assigned sales rep phone | text | No | NULL | user-entered | `vtiger_field` 1200; `.cf_1199` |
| Sales Rep Mobile | Vendor's assigned sales rep mobile phone | text | No | NULL | user-entered | `vtiger_field` 1202; `.cf_1201` |
| Sales Rep Fax | Vendor's assigned sales rep fax | text | No | NULL | user-entered | `vtiger_field` 1204; `.cf_1203` |
| Sales Rep Email | Vendor's assigned sales rep email | text | No | NULL | user-entered | `vtiger_field` 1206; `.cf_1205` |
| Title | A title/name cluster whose relationship to "Sales Rep Name" below is not confirmed — see Known Gaps | text | No | NULL | user-entered | `vtiger_field` 1290; `.cf_1289` |
| First Name | First name paired with Title/Last Name | text | No | NULL | user-entered | `vtiger_field` 1292; `.cf_1291` |
| Last Name | Last name paired with Title/First Name | text | No | NULL | user-entered | `vtiger_field` 1294; `.cf_1293` |
| Terms | The vendor's payment-terms picklist value — plain text/picklist with no confirmed FK into the separately-owned payment-terms master table | enum(text) | No | NULL | user-entered | `vtiger_field` 1304; `vtiger_vendorcf.cf_1303` |
| Return Tracking Field | Field used to track/reference vendor returns | text | No | NULL | user-entered | `vtiger_field` 1332; `.cf_1331` |
| Apply Conversion | Whether this vendor's manufacturer-number-to-linecode Conversion Rules are applied | boolean(text) | Yes | `0` | user-entered | `vtiger_field` 1353; `vtiger_vendorcf.cf_1352` |
| Freight Product # | Product number used to represent freight charges on this vendor's POs | text | No | NULL (default `FREIGHT`) | user-entered | `vtiger_field` 1359; `.cf_1358` |
| Misc Fee Product # | Product number used to represent miscellaneous fees on this vendor's POs | text | No | NULL (default `ADMIN FEE`) | user-entered | `vtiger_field` 1361; `.cf_1360` |
| Default Location | The branch/location this vendor's records default to | reference | No | NULL | user-entered | `vtiger_field` 1500; `.cf_1499` |
| Sales Rep Name | Name of the vendor's sales rep — a second name field alongside the Title/First/Last cluster above, relationship unconfirmed | text | No | NULL | user-entered | `vtiger_field` 1508; `.cf_1507` |
| Primary Supplier (display cache) | **Confirmed dead** — nothing writes to it and the edit screen doesn't even read it; the actual "primary supplier" display string is built fresh on every page load via a live join against the normalized Primary Supplier Assignment table | text | No | NULL | system-set (derived) — confirmed dead, see Known Gaps | `vtiger_field` 1585; `.cf_1584` |
| Approved Vehicle Expense Vendor | Whether this vendor is approved for vehicle-expense purchases | boolean(text) | No | NULL | user-entered | `vtiger_field` 1590; `.cf_1589` |
| Order in Vendor Order Qty Increments | Whether orders to this vendor must round to its purchasing-unit-of-measure increments | boolean(text) | No | NULL | user-entered | `vtiger_field` 1658; `.cf_1657` |
| Pull Cost Price From | Which cost-price source this vendor's PO pricing is pulled from | enum(text) | No | NULL | user-entered | `vtiger_field` 1664; `.cf_1663` |
| Invoice | Vendor invoicing-related configuration flag | enum(text) | No | NULL | user-entered | `vtiger_field` 1687; `.cf_1686` |
| Sub Vendors | Pipe-delimited list of other Vendor record ids designated as sub-vendors of this one | text | No | `''` | user-entered | `vtiger_field` 1879; `vtiger_vendorcf.cf_1878` |
| Auto Update Line Purchased | Whether "Lines Purchased" is kept auto-updated by the batch/cron sort-and-refresh scripts | boolean(text) | No | NULL | user-entered | `vtiger_field` 1928; `.cf_1928` |
| Aconnex Seller ID | Seller id for the Aconnex integration | text | No | NULL | user-entered | `vtiger_field` 1931; `.cf_1931` |
| Aconnex Customer # | Customer number for the Aconnex integration | text | No | NULL | user-entered | `vtiger_field` 1932; `.cf_1932` |
| 2nd Freight PPD Amount | A second freight-prepaid threshold amount | money | No | NULL | user-entered | `vtiger_field` 4433; `.cf_2nd_frieght_ppd_amount` |
| 2nd Freight PPD Based on | Basis for the second freight-prepaid threshold | enum(text) | No | NULL | user-entered | `vtiger_field` 4432; `.cf_2nd_frieght_ppd_based_on` |
| Check EP | Whether "equivalent part" checking is enabled for this vendor | boolean(text) | No | NULL | system-set | `vtiger_field` 3023; `.cf_3023` |
| Allow to Send Buyout PO through EDI | Whether Buyout POs to this vendor may be transmitted via EDI | boolean(text) | Yes | `0` | user-entered | `vtiger_field` 3164; `.cf_3164` |
| Allow to Send Normal PO through EDI | Whether standard POs to this vendor may be transmitted via EDI | boolean(text) | Yes | `1` | user-entered | `vtiger_field` 3165; `.cf_3165` |
| Buyout Information | Free-text/JSON-ish notes on Buyout-PO handling for this vendor | text | No | NULL | user-entered | `vtiger_field` 4496; `.cf_boinfo` |
| Contact Information | Pipe-delimited list of Contacts-module ids linked to this vendor — a denormalized cache paralleling the normalized Vendor-Contact Relation, **confirmed real but independently write-drifting** (no sync code found between the two) | text | No | NULL | user-entered | `vtiger_field` 3705; `vtiger_vendorcf.cf_contact_information` |
| Default RGN Cost for PO | Default cost basis code used for "RGN" costing on POs from this vendor — abbreviation not expanded | enum(code) | No | `CC` | user-entered | `vtiger_field` 3575; `.cf_def_rgn_cost` |
| DIB Vendor ID | Vendor id used by the "Do It Best" EDI integration | text | No | NULL | user-entered | `vtiger_field` 4199; `.cf_dibvendorid` |
| Documentation Preference | Preferred PO document format/delivery method for this vendor | enum(text) | No | `Print PO` | user-entered | `vtiger_field` 4635; `.cf_document_preference` |
| Hide Cost On PO Docs | Whether cost figures are suppressed on printed PO documents for this vendor | boolean(text) | No | `No` | user-entered | `vtiger_field` 3792; `.cf_hide_cost_on_podoc` |
| Print Equivalent Part Info on Printed PO | Whether equivalent/substitute part info prints on this vendor's POs | boolean(text) | No | NULL | user-entered | `vtiger_field` 4223; `.cf_print_epinfo` |
| Tax Exempt | Whether this vendor is tax-exempt | enum(text) | No | `No` | user-entered | `vtiger_field` 3861; `.cf_taxexempt` |
| Tax ID | Vendor's tax identification number | text | No | NULL | user-entered | `vtiger_field` 3471; `.cf_taxid` |
| Variance % on Invoice | Allowed percentage variance between PO and vendor invoice before flagging a discrepancy | number(%) | No | NULL | user-entered | `vtiger_field` 4513; `.cf_variance_per_invoice` |
| Variance $ on Invoice | Allowed dollar variance between PO and vendor invoice before flagging a discrepancy | money | No | NULL | user-entered | `vtiger_field` 4512; `.cf_variance_rate_invoice` |
| X12 EDI | X12 EDI enablement/configuration setting — no confirmed consumer found anywhere in the codebase | enum(text) | No | NULL | user-entered — **Open Question**, likely unused but not confirmed dead with full rigor | `vtiger_field` 4497; `.cf_x12edi` |
| X12 EDI Invoice Option | X12 EDI invoice-handling option | enum(text) | No | NULL | user-entered — same open question as above | `vtiger_field` 4498; `.cf_x12edi_invoice_option` |
| X12 EDI Vendor ID Number | Vendor id number used in X12 EDI transactions | text | No | NULL | user-entered — same open question as above | `vtiger_field` 4499; `.cf_x12edi_vendoridnumber` |
| Default Currency | Vendor's default transaction currency | enum(text) | No | NULL | user-entered | `vtiger_field` 3397; `.default_currency` |
| Default Vendor Delivery Method | Default shipping/delivery method for orders from this vendor | enum(text) | No | `We will pick it up` | user-entered | `vtiger_field` 3592; `.defaultdeliverymethod` |
| (Sell Price) Exchange Rate Factor | Currency exchange-rate multiplier applied when deriving sell price from this vendor's cost | number | No | NULL | user-entered | `vtiger_field` 3321; `.exchangerate` |
| Fax PO Using | Method/service used to fax POs to this vendor | enum(text) | No | NULL | user-entered | `vtiger_field` 3284; `.faxpousing` |
| Insurance expiration date | Expiration date of the vendor's insurance certificate on file | date | No | NULL | user-entered | `vtiger_field` 4189; `.insurance_expiration_date` |
| Insurance image | Filename of the uploaded insurance-certificate image | text | No | NULL | system-set | `vtiger_field` 4188; `.insurance_image` |
| Certificate image | Filename of an uploaded (non-insurance) certificate image | text | No | NULL | system-set | `vtiger_field` 4186; `.certificate_image` |
| Certificate expiration date | Expiration date of that certificate | date | No | NULL | user-entered | `vtiger_field` 4187; `.certificate_expiration_date` |
| Mark-up Factor | Multiplier applied to this vendor's cost to derive sell price | number | No | NULL | user-entered | `vtiger_field` 3322; `.markupfactor` |
| Price Sheet Cost | Basis currency/source used for this vendor's price-sheet cost figures; substituted with the base-currency value on save | enum(text) | Yes | `Base Currency` | user-entered | `vtiger_field` 3404; `.pricesheetcost` |
| Saberis Vendor NS Code Template | Saberis-integration field — column named for "UOM" carries this label; suspected swapped with the row below, see Known Gaps | integer | No | NULL | unclear | `vtiger_field` 4220; `vtiger_vendorcf.saberishuom` |
| Saberis Vendor UOM | Saberis-integration field — column named for "NS code" carries this label; suspected swapped with the row above, see Known Gaps | integer | No | NULL | unclear | `vtiger_field` 4221; `vtiger_vendorcf.saberishnscode` |
| Default Apply Sell Price Logic to Buyout Cost | Whether the standard sell-price calculation logic is applied to Buyout-PO cost for this vendor by default | boolean(enum) | Yes | `No` | user-entered | `vtiger_field` 3718; `.sellpricefrombuyoutcost` |
| Use Special Order Cost | Whether a special-order cost basis overrides the normal cost for this vendor | boolean(text) | No | `0` | system-set | `vtiger_field` 3729; `.specialordercost` |
| Special Order Cost | Which cost field/basis is used as the special-order cost | enum(code) | No | `M1` | user-entered | `vtiger_field` 3730; `.specialordercostfield` |
| SlipStream Vendor Status | This vendor's status within the SlipStream integration — the module's one genuine, webhook-driven state machine | text | No | NULL | system-set (integration) | `vtiger_field` 4639; `vtiger_vendorcf.ss_vendor_status` |
| Subcontractor type | Classification of subcontractor type when this vendor represents a subcontractor | text | No | NULL | user-entered | `vtiger_field` 4185; `.subcontractor_type` |
| Supported Regions | List of geographic regions this vendor supports/services | text | No | NULL | user-entered | `vtiger_field` 3748; `.supportedregion` |
| Uni-Select Default Delivery Method | Default delivery method specific to the Uni-Select integration/program | enum(text) | No | NULL | user-entered | `vtiger_field` 3096; `.uni_deliverycode` |
| Vendor Uses Linecode | Whether this vendor's parts are organized/purchased by line code | boolean(text) | No | NULL | system-set | `vtiger_field` 3777; `.usemarercode` |
| Use Product Number instead Product Stripped | Whether the raw Product Number (vs. the normalized "stripped" number) is used when interacting with this vendor | boolean(text) | No | NULL | system-set | `vtiger_field` 3807; `.useproductnumber` |
| Tax Authority Code | The Tax Authority Code used to compute tax on POs to this vendor, gated by a supported-field flag | reference | No | NULL | user-entered | `vtiger_field` 4417; `vtiger_vendorcf.vendor_tax_authority_code` |
| WH Price Used | Which warehouse-price source is used for this vendor | enum(text) | No | `Vendor's cost through EDI` | user-entered | `vtiger_field` 3815; `.whpriceused` |
| Active EDI | Which EDI mode/provider is active for this vendor — read directly by PurchaseOrder-module code at PO-creation time, not a dedicated EDI module | enum(text) | No | `None` | user-entered | `vtiger_field` 3854; `.activeedi` |
| EDI Vendor Backorder/Cancel | Default EDI backorder/cancel behavior for this vendor | enum(text) | No | `Backorder` | user-entered | `vtiger_field` 3401; `.babelbackcancel` |
| Buyout Markup % | Markup percentage applied to this vendor's Buyout-PO costs | number(%) | No | `0.00` | user-entered | `vtiger_field` 3290; `.bomarkup` |

### Vendor Physical Address

No CRM field registrations exist for this table — a pure ajax/CRUD-managed table, not a standard
EditView-registered entity.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Physical Address ID | Primary key | text (identifier) | Yes | auto_increment | system-set | `vtiger_vendor_physicaladdress.vpaddressid` |
| Vendor ID | FK to the owning vendor | reference | Yes | NULL | system-set | `.vendorid` |
| Street 1 | Address line 1 | text | No | NULL | user-entered | `.street1` |
| Street 2 | Address line 2 | text | No | NULL | user-entered | `.street2` |
| City | Address city | text | No | NULL | user-entered | `.city` |
| State | Address state | text | No | NULL | user-entered | `.state` |
| Zip Code | Address zip/postal code | text | No | NULL | user-entered | `.zipcode` |
| Country | Address country | text | No | NULL | user-entered | `.country` |
| Phone | Phone number for this specific address/location | text | No | NULL | user-entered | `.phone` |
| Notes | Free-text notes on this address | text | No | NULL | user-entered | `.notes` |
| Is Default | Whether this is the vendor's default ship-from address | boolean(int) | No | `0` | user-entered | `.isdefault` |

**Delete guard**: a delete action refuses to delete an address row already referenced elsewhere (a Buyout
SO or PDM reference) — a cross-module integrity check, not a DB-level FK constraint.

### Primary Supplier Assignment

No CRM field registrations exist for this table.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Assignment ID | Primary key | text (identifier) | Yes | auto_increment | system-set | `vtiger_vendor_primarysupplier.relid` |
| Location ID | The branch this primary-supplier assignment applies to | reference | Yes | NULL | user-entered | `.locationid` |
| Vendor ID | The vendor this assignment is *for* (i.e. whose primary supplier is being set) | reference | Yes | NULL | system-set | `.vendorid` |
| Primary Supplier ID | The id of the designated primary supplier — interpreted as either another Vendor's id or a Location's id depending on Supplier Type | reference (polymorphic) | Yes | NULL | user-entered | `.primarysupplierid` |
| Supplier Type | Which kind of entity Primary Supplier ID refers to | enum(`vendor`,`location`) | Yes | `vendor` | user-entered | `.suppliertype` |

### Vendor-Contact Relation

No CRM field registrations exist for this table — a plain many-to-many link, the confirmed normalized
source of truth (in contrast with the header's own denormalized "Contact Information" cache).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Vendor ID | FK to the vendor (composite PK, part 1) | reference | Yes | 0 | system-set | `vtiger_vendorcontactrel.vendorid` |
| Contact ID | FK to the Contacts-module record (composite PK, part 2) | reference | Yes | 0 | system-set | `.contactid` |

### Vendor Conversion Rule

No CRM field registrations exist for this table. Only active when the header's "Apply Conversion" flag
is set.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Vendor ID | FK to the vendor (composite PK, part 1) | reference | Yes | NULL | system-set | `vtiger_vendorconversionrule.vendorid` |
| Manufacturer Number | The vendor/manufacturer's own part number for the cross-referenced item (composite PK, part 2) | text | Yes | NULL | user-entered (CSV import) | `.mfgnum`; CSV column header `Mfg #` |
| Line Code | The internal line code this manufacturer number maps to | text | No | NULL | user-entered (CSV import) | `.linecode`; CSV column header `Linecode` |

### Vendor Line Code

No CRM field registrations exist for this table. **Shared cross-module and confirmed four-way dual-write**
(see Entity List above) — documented here in full because Vendors is this document's primary anchor and
the table's owning FK connects it to a vendor.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Vendor Line Code ID | Primary key | text (identifier) | Yes | auto_increment | system-set | `vtiger_vendorlinecode.vendorlinecodeid` |
| Line Code | The line-code identifier itself | integer | Yes | NULL | user-entered | `.linecode` |
| Subline | Sub-line classification under the main line code | integer | No | NULL | user-entered | `.subline` |
| Product Division | Product-division classification | integer | No | NULL | user-entered | `.productdivision` |
| Vendor ID | FK to the owning vendor | reference | Yes | NULL | system-set | `vtiger_vendorlinecode.vendor_id` |
| Product Number | Product-number association for this line-code row — meaning of a per-row product number on what is otherwise a line-level record not independently confirmed | text | No | NULL | unclear | `.productnumber` |
| Level of Map | Mapping-level/hierarchy indicator | integer | No | NULL | unclear | `.levelofmap` |
| Description | Human-readable description of the line code; **updated by an endpoint with no vendor-scoping in its WHERE clause — the single highest-severity finding in this module** | text | No | NULL | user-entered | `vtiger_vendorlinecode.description` |
| Subline Description | Human-readable description of the subline | text | No | NULL | user-entered | `.sublinedesc` |
| Product Division Description | Human-readable description of the product division | text | No | NULL | user-entered | `.productdivisiondesc` |
| Is Product Stripped | Whether product numbers under this line code use the "stripped" (alphanumeric-normalized) form | boolean(enum) | Yes | `Yes` | user-entered | `.is_prdstpd` |
| UOM Type | Unit-of-measure type for products under this line code | integer | No | `0` | user-entered | `.uom_type` |
| Product Price ERF/MUF | Whether an "ERF/MUF" pricing-formula adjustment applies to products under this line code — abbreviation not expanded | boolean(enum) | No | `No` | unclear | `.prod_price_erf_muf` |
| Is Default | Whether this is the default line-code row for its grouping — **the "only one row exclusive" logic is not scoped by vendor_id anywhere in the code** | text(enum) | No | `No` | user-entered | `.is_default` |
| Use Sq Ft Calculation | Whether square-footage-based pricing applies to this line code | boolean(text) | No | `No` | user-entered | `.use_sq_ft_calculation` |
| Sq Ft Price | Price-per-square-foot for this line code — consumed only by SalesOrder's pricing calculator | money | No | `0.0000` | user-entered | `.sq_ft_price` |
| Is Door Code | Door-industry classification flag | boolean(text) | No | `No` | user-entered | `.is_door_code` |
| Is Door Slab | Door-industry classification flag | boolean(text) | No | `No` | user-entered | `.is_door_slab` |
| Is Door Component | Door-industry classification flag | boolean(text) | No | `No` | user-entered | `.is_door_component` |
| Default Door Code | Default door-code value for this line code — a `varchar(10)` with a boolean-shaped default (`No`), possible schema drift | text(enum) | No | `No` | user-entered — **Open Question** | `.default_door_code` |
| Adder Per (unit) | **A percentage markup on cost, not a flat per-unit dollar adder** — the field-catalog pass's original "per-unit price adder" description was corrected once the actual consuming formula was traced | number(%), `DECIMAL(7,4)` | No | `0.0000` | user-entered | `vtiger_vendorlinecode.adder_per` |
| DCS Copy To / DCS Take / DCS Formula / DCS Value | "DCS" copy-target, take-value, formula, and value settings — abbreviation not expanded, likely a door-configuration-system pricing integration, live write site confirmed | text/money (×4) | No | NULL/`0.00` | unclear | `.dcs_copyto`, `.dcs_take`, `.dcs_formula`, `.dcs_value` |
| COGS GL Account | Cost-of-goods-sold GL account code for products under this line code — **no confirmed live consumer** for GL-posting purposes anywhere in the codebase | text | No | NULL | user-entered | `.cogs_gl` |
| Income GL Account | Income GL account code for products under this line code — same no-confirmed-consumer status | text | No | NULL | user-entered | `.income_gl` |
| Is Deleted | Soft-delete flag | boolean(int) | No | `0` | system-set | `.is_deleted` |
| Created / Modified (audit) | Standard row-audit timestamp/user fields | datetime/reference | No | — | system-set | `.created`, `.created_by`, `.modifiedtime`, `.modified_by` |

### Vendor Line Code Alias

No CRM field registrations exist for this table.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Alias ID | Primary key | text (identifier) | Yes | auto_increment | system-set | `vtiger_vendorlinecodealias.vendorlinecodealiasid` |
| Vendor ID | FK to the owning vendor | reference | Yes | NULL | system-set | `.vendorid` |
| Line Code | FK/reference to the line code this alias applies to | reference | No | NULL | system-set | `.linecode` |
| Vendor Line Code (alias) | The vendor's own alternate code for this line code | text | No | NULL | user-entered | `.vendor_linecode` |
| Other Code (alias) | A second alternate/"other" code for this line code | text | No | NULL | user-entered | `.othercode` |

**Confirmed asymmetry**: rows can be created/updated but **cannot be deleted** through any UI-reachable
code path found across every source pass — a genuine structural gap, not an intentional immutability
design.

## Known Gaps

- **Roughly 10 true-orphan custom-field/header columns** carry no CRM label and no confirmed code usage
  found anywhere across every source pass.
- **The Title/First Name/Last Name cluster vs. "Sales Rep Name"** — two apparently-overlapping name
  representations for what may be the same sales-rep person; relationship never confirmed.
- **"RGN," "ERF/MUF," and "DCS" abbreviations** on the header and Vendor Line Code entities are never
  expanded or confirmed across any pass.
- **`lbm_nonstockpricelevel`'s JSON payload structure** — a JSON-blob price-level table the `VendorLinecode`
  module writes via delete-then-insert, keyed to the same id that anchors the Vendor Line Code entity. This
  table appears nowhere in the original entity catalog because it was discovered only after the module's
  boundary was corrected to include `VendorLinecode/`. Its relationship to Vendor Line Code's own pricing
  arithmetic was never characterized.
- **X12 EDI fields' consumer status** — no consumer found by a repo-wide grep, but not verified with the
  same rigor applied to a confirmed-dead column elsewhere in the catalog; could be genuinely dead or
  simply missed by the search pattern used.
- **The two Saberis integration fields appear to have swapped CRM labels** — the column literally named
  for "UOM" carries the label "NS Code Template," while the "NS code" column carries the label "UOM."
  Either a genuine historical label swap or a column-rename that wasn't followed by a label update;
  flagged for SME/Saberis-integration-owner resolution.
- **The vendor payment-terms master table is confirmed owned by a different module** (POReconciliation),
  not Vendors — the header's own "Terms" field is an independent plain picklist/text value with no
  confirmed FK relationship.
- **Vendor Conversion Rule and Vendor Line Code Alias are both empty (0 rows) on the dev snapshot**
  despite being actively coded-against, CSV-import-capable features — their real-world data shape cannot
  be sampled on this dev DB.

---

## Recommended rewrite schema — proposed design, not a source-material finding

Everything above documents what exists today. This section is different in kind: a proposed replacement
schema, reasoned from specific structural problems the legacy shape causes, each cited back to where it is
already documented above. Table/column names below are tech-agnostic placeholders, not a commitment to any
specific naming convention. Carried forward verbatim from
`docs_from_blueprint/module/Vendors/02-entities-and-fields.md` §5, since it was reasoned directly from the
field catalog above and is load-bearing context for `build-guidance.md`.

**Problems this design fixes, one by one:**

1. **Vendor Line Code's per-vendor identity is enforced by convention (a `WHERE`-clause discipline every
   caller must remember), not by the schema.** The table already carries a `vendor_id` column, but nothing
   stops two different vendors' rows from sharing the same `Line Code` number, and one confirmed write path
   (Description, above) updates purely by line-code number with no vendor-scoping at all — silently
   overwriting every other vendor's row sharing that number, deterministically, on every save. This is the
   headline defect in this module's own risk findings, and it is enabled structurally by the absence of a
   per-vendor uniqueness constraint (also independently documented — the "Is Default" exclusivity logic
   likewise isn't scoped by vendor). **Fix**: split the table so that vendor ownership is part of the row's
   own identity rather than a column a query can forget to filter on — see the two-table split below.
2. **The same table is also a genuinely four-way shared write surface** (Vendors' description-only write,
   the owning module's three supplementary raw-SQL writes, plus two read-only consumers) **with no
   coordinating lock and two independently-unscoped write surfaces**, not one. **Fix**: once every write is
   keyed through a row whose natural key already includes `vendor_id`, an unscoped `WHERE` clause becomes
   structurally incapable of crossing vendor boundaries — the fix closes both the description bug and the
   default-row/default-door exclusivity bugs by construction, not by asking every future writer to remember
   to add the filter.
3. **`lbm_nonstockpricelevel` stores its price-level data as an opaque JSON blob, delete-then-insert on
   every write, with a structure never characterized by any pass.** A JSON blob standing in for what is, on
   its own write pattern, evidently a set of rows. **Fix**: normalize it into an explicit price-level table
   with real columns and real keys.
4. **Two denormalized "cache" fields on the header drift out of sync with the normalized relations they
   duplicate.** "Primary Supplier" is confirmed dead — nothing writes it, the edit screen doesn't read it,
   the real value is built fresh from the normalized Primary Supplier Assignment table every time. "Contact
   Information" (a pipe-delimited id list) duplicates the normalized Vendor-Contact Relation table with no
   sync code found between the two. **Fix**: drop both columns from the header outright; every consumer
   reads the normalized table directly.
5. **"Sub Vendors" is a pipe-delimited list of vendor ids on the header** — a real, actively-used
   parent/sub-vendor relationship modeled as a delimited string rather than a join table, unlike the
   module's own Vendor-Contact Relation, which gets this right. **Fix**: give it the same normalized shape
   as Vendor-Contact Relation.
6. **"Lines Purchased" is a hand-maintained comma-delimited derived list**, and being a flat string rather
   than derived-on-read or a versioned cache is exactly what let two independent bugs reach production
   undetected: a cron that overwrites every auto-update vendor with the identical system-wide list instead
   of that vendor's own supplied codes, and a separate off-by-one trim bug that can truncate the list's last
   entry. **Fix**: derive it from the normalized Vendor Line Code assignment on read, or, if a persisted
   cache is still wanted for performance, make it a versioned artifact whose staleness is detectable rather
   than a plain string a cron edits in place.
7. **Vendor Line Code Alias rows can be created and updated but never deleted through any reachable code
   path** — a confirmed structural gap, not an intentional immutability design. **Fix**: add a soft-delete
   column so a delete lifecycle can actually exist.
8. **The physical-address CSV import's upsert match key includes free-text address fields**, so
   re-importing the same vendor's address with a corrected spelling creates a new row instead of updating
   the existing one, silently accumulating duplicates; separately, an unmatched vendor number is still
   inserted with an empty FK rather than rejected. **Fix**: match imports on a stable identifier, not on
   address text; reject rather than silently orphan a row with no resolvable vendor.
9. **"Vendor Abbreviation" is the CRM label, but every consumer treats the column as the vendor's Line
   Code.** **Fix**: name the column for what it does — `line_code` — not what a stale label says.

**Proposed tables:**

- **`vendor`** (replaces the header + custom-field extension) — all fields carried forward except the two
  dead/drifting caches removed by problem 4 (`primary_supplier_id`, `contact_information`) and the two
  delimited lists replaced by problems 5–6 (`sub_vendors`, `lines_purchased`). `vendor_number` unique.
  `line_code` (renamed from "Vendor Abbreviation," problem 9). Standard audit/soft-delete columns.
- **`vendor_physical_address`** — unchanged in shape; the CSV-import upsert (problem 8) is reworked to key
  on `vendor_id` + a stable external/reference identifier rather than street/city/zip text, and to reject
  rows whose vendor number doesn't resolve rather than inserting with an empty FK.
- **`vendor_primary_supplier_assignment`** — unchanged in shape.
- **`vendor_contact`** — unchanged; the pattern this module already gets right.
- **`vendor_sub_vendor`** (new, closes problem 5) — `vendor_id` (FK → `vendor`), `sub_vendor_id` (FK →
  `vendor`), composite PK on both, same shape as `vendor_contact`. Replaces the header's pipe-delimited
  `Sub Vendors` string.
- **`vendor_conversion_rule`** — unchanged in shape.
- **`line_code`** (new — the shared identity/classification half of the old Vendor Line Code table, closes
  problems 1–2) — `id` (PK), `line_code_number`, `subline`, `product_division`, `subline_description`,
  `product_division_description`, `uom_type`, `is_product_stripped`, `level_of_map`, audit columns. Unique
  on (`line_code_number`, `subline`, `product_division`). This is the table the line code's owning module,
  Products, and SalesOrder's calculator read as shared reference data — genuinely global, not per-vendor.
- **`vendor_line_code`** (new — the per-vendor half, closes problems 1–2) — `id` (PK), `vendor_id` (FK →
  `vendor`, required), `line_code_id` (FK → `line_code`, required), `description` (now unambiguously
  per-vendor — an update can only ever touch this row, because `vendor_id` is part of its own identity, not
  a filter a query can omit), `product_number`, `is_default` (boolean), `use_sq_ft_calculation`,
  `sq_ft_price`, `is_door_code`/`is_door_slab`/`is_door_component`, `default_door_code`, `adder_per_unit`,
  `dcs_copy_to`/`dcs_take`/`dcs_formula`/`dcs_value`, `cogs_gl_account`, `income_gl_account`, `is_deleted`,
  audit columns. **Unique on (`vendor_id`, `line_code_id`)** — closes the missing per-vendor uniqueness
  constraint directly. A **partial unique index on `vendor_id` where `is_default` is true** replaces the
  legacy's system-wide, unscoped default-row exclusivity update with an enforced, per-vendor-only
  guarantee.
- **`vendor_line_code_price_level`** (new — replaces `lbm_nonstockpricelevel`'s JSON blob, closes problem
  3) — `id` (PK), `vendor_line_code_id` (FK → `vendor_line_code`), `price_level_code`, `price`,
  `sort_order`, audit columns. Exact column set to be confirmed once the legacy JSON payload's actual
  contents are decoded and reviewed — not read in this session.
- **`vendor_line_code_alias`** (closes problem 7) — unchanged in shape, plus an `is_deleted` (boolean) /
  `deleted_at` column so a genuine delete lifecycle can exist where none does today.

**Referential integrity**: every FK above should be a real, enforced database constraint. In particular,
`vendor_line_code.vendor_id` and `vendor_line_code.line_code_id` being NOT NULL and part of an enforced
unique pair is the load-bearing fix in this design — it is what makes the module's own highest-severity
finding (the vendor-scoping bug) structurally impossible to reintroduce, rather than merely patched at one
call site. Recommend `RESTRICT` on delete for `line_code` while any `vendor_line_code` row references it,
and for `vendor` while any `vendor_line_code`, `vendor_physical_address`, `vendor_conversion_rule`, or
`vendor_sub_vendor` row references it.
