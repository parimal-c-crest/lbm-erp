# PurchaseOrder — Entities & Fields

> Every entity, every field, individually. No grouping/summarizing — that's how fields get lost.
> Legacy table/column names are a first-class column in the field catalog below, not an optional
> footnote. See `_deviations-from-original-template.md` in `2-module-spec-template/`.

Source: `docs_from_blueprint/module/PurchaseOrder/02-entities-and-fields.md`, itself traced to
`blueprint/module/PurchaseOrder/01-entities-fields.md` (113 `vtiger_field` rows for `tabid=21`
across 6 backing tables plus `DESCRIBE` on the physical tables) and `00-pass0-inventory.md`.

**Scope note carried from source**: the source blueprint's field-cataloging pass is lighter-weight
than SalesOrder's — it groups many columns by theme (e.g. "checkboxes," "freight/shipping tracking
fields") rather than itemizing every one individually, a scope difference the source itself judged
appropriate given the module's size. This document transcribes exactly the level of detail the
source provides: where the source names an individual field, it is listed individually below; where
the source groups columns by theme, that same grouping is preserved rather than fabricating
individual rows the source never itemized. No Required/Default values are asserted below beyond what
the source explicitly confirmed.

## Governing architectural requirements (forward-looking, not current-state)

Drawn from `blueprint/module/PurchaseOrder/09-implementation-plan.md`, "Domain model" and "Key
design decisions" — requirements for any new implementation, not descriptions of the legacy system:

- **R1 — No generic custom-field (`cf_NNNN`) indirection.** Every `vtiger_purchaseordercf` field in
  §3.2 below should get a real, named column in a new data model.
- **R2 — One authoritative Line Item table, not a three-way staging/committed split.** Collapse the
  legacy `lbm_iframepodetails` / `vtiger_temppodetails` / `lbm_po_inventoryproductrel` split into one
  authoritative Line Item table with an explicit `draft`/`committed`-style state field — closing Open
  Question 1 (§4 below) "by design rather than by further investigation."
- **R3 — Status must be a real, populated, enforced enum**, not an empty picklist master table backed
  only by scattered string literals (see §3.8, §4).
- **R4 — The vendor-module data boundary must be structurally enforced, not merely better escaped.**
  Vendor-owned fields must be read via a Vendors-module service/API call, never written to directly
  from PurchaseOrder code (see the `setPPDValues.php` finding in risks-and-open-questions.md).
- **R5 — Financial write endpoints must use parameterized queries / an ORM exclusively.** No raw
  string SQL concatenation anywhere in a new implementation's equivalent endpoints.

## Entity List

| Entity | Purpose |
|---|---|
| Purchase Order (Header) | The core PO record — vendor, ship-to location, totals, status, EDI/RGN flags, freight/duty, dates, terms. |
| PO Line Item (Staging) | A line item while the PO is open for edit in the iframe, before commit. |
| PO Line Item (Committed) | The committed line item once a PO is saved — superset of staging plus receiving/reconciliation state. |
| Temp PO Details | A second, older/parallel staging table used by a subset of flows (Import); overlap with the staging Line Item entity not fully resolved. |
| PO Status History | Audit log of every `postatus` write against a PO — logs every write, not only genuine transitions (confirmed via sample data). |
| PO Status Picklist | Nominal picklist master table for `postatus` — confirmed 0 rows live; the actual valid-status set is derived empirically from distinct values in the header table. |
| Receiving Line Items | Receiving-module perspective on PO lines: received quantity, PO cost/core price at receipt time. |
| PO Reconciliation + Reconciliation Line | Header and line-level records comparing receiving-side vs. invoice-side amounts, with variance and COA columns for GL posting, plus region-specific VAT columns. |
| PO Templates | Saved/recurring PO definitions, including a serialized template payload. |

**Relationship summary**: A Purchase Order has one Billing Address and one Shipping Address block,
one or more Line Items (staging and/or committed, depending on lifecycle phase), zero or more Status
History entries, zero or more Reconciliation records (each with its own line items), and may be
linked to a saved Template. Committed Line Items carry direct cross-references to SalesOrder
(`rel_salesorder`/`rel_solinenumber`/`soid` for BOPO/RGN, `door_soid`/`door_sonum` for Door/NS
linkage) and to Receiving Line Items via PO number and line code. A PO may also be linked to a
scheduled-PO template (`fuse5_scheduled_po_templates`, referenced from `00-pass0-inventory.md` but
not itemized as its own catalogued entity in the source).

Source-of-Truth for every entity above: `vtiger_purchaseorder` (+`vtiger_purchaseordercf`,
`vtiger_pobillads`/`vtiger_poshipads`, `vtiger_crmentity`); `lbm_iframepodetails`;
`lbm_po_inventoryproductrel`; `vtiger_temppodetails`; `vtiger_postatushistory`; `vtiger_postatus`;
`vtiger_rm_polineitems`; `vtiger_poreconciliation` + `vtiger_poreconciliation_lineitem` (+
`_frt_column`, `cf`); `vtiger_potemplates` (+ `vtiger_potemplatesalert`).

## Field Catalog

### Purchase Order — Header

Backed by `vtiger_purchaseorder`, 110 columns total; key fields individually surfaced via
`vtiger_field`.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Subject | Free-text PO subject | text | Required (PO-RULE-003) | — | vtiger_field | `typeofdata='V~M'` |
| Vendor Name | The vendor this PO is placed with | reference (to Vendor) | Required (PO-RULE-001) | — | vtiger_field | `vendor_id`, FK → Vendors module |
| Contact Name | Optional linked contact | reference (to Contact) | Optional | — | vtiger_purchaseorder | `contact_id` |
| Status | Primary lifecycle status | enum | — | — | vtiger_purchaseorder | `postatus` — drives the status/lifecycle state machine, see workflows.md |
| RGN PO Status | RGN sub-flow flag | text | — | — | vtiger_purchaseorder | `po_rgn_status` — observed live values: blank, `Submitted` |
| Ship To Location | Destination location for the order | reference (to Location) | Required (PO-RULE-002), DB `NOT NULL` | — | vtiger_purchaseorder | `mainlocation` |
| Due Date | Date the order is due | date | — | — | vtiger_purchaseorder | `duedate` |
| ETA Date | Estimated time of arrival | date | — | — | vtiger_purchaseorder | `etadate` |
| Requisition No / Tracking No | Free-text reference numbers | text | — | — | vtiger_purchaseorder | (grouped by source) |
| Carrier / Reorder To | Picklist fields | enum | — | — | vtiger_purchaseorder | (grouped by source) |
| PPD % | Prepaid-discount percentage | number | — | — | vtiger_purchaseorder | `ppdvalue` |
| Sub Total | Line-items subtotal before charges/tax | money | — | — | vtiger_purchaseorder | `hdnSubTotal` → `subtotal` — computed client+server |
| Grand Total | Order grand total | money | — | — | vtiger_purchaseorder | `hdnGrandTotal` → `total` — computed client+server |
| Other Charges | Miscellaneous order-level charges | money | — | — | vtiger_purchaseorder | `hdnothercharges` |
| Discount Amount / Percent | Order-level discount | money / number | — | — | vtiger_purchaseorder | `hdnDiscountAmount` / `hdnDiscountPercent` |
| S&H Amount | Shipping & handling charge | money | — | — | vtiger_purchaseorder | `hdnS_H_Amount` → `s_h_amount` |
| Tax Type | Which tax mode applies | enum | — | — | vtiger_purchaseorder | `hdnTaxType` → `taxtype` |
| Freight 1/2/3 | Three separate freight-vendor cost buckets, each with its own vendor/status pair | money (×3) | — | — | vtiger_purchaseorder | `pofreight1/2/3`, `pofreight_vendorN`/`pofreightstatusN` |
| Duty | Duty/customs charge | money | — | — | vtiger_purchaseorder | `poduty` |
| Surcharge / Surcharge % | Order-level surcharge | money / number | — | — | vtiger_purchaseorder | `po_surcharge` / `po_surcharge_percentage` |
| Small Order Charge | Charge applied to small orders | money | — | — | vtiger_purchaseorder | `po_small_order_charge` |
| Freight/Duty GL Codes | Chart-of-accounts codes for freight/duty | text | — | — | vtiger_purchaseorder | `pofreightcoa` / `podutycoa` |
| Excise Duty | Excise duty amount | money | — | — | vtiger_purchaseorder | `exciseduty` |
| Sales Commission | Commission amount | money | — | — | vtiger_purchaseorder | `salescommission` |
| Order-generation option flags | Checkbox options controlling how a suggested/forecast PO is generated | boolean (×10) | — | — | vtiger_purchaseorder | `best_alternate_cost`, `by_barcode`, `ps_ep_only`, `cf_1929` ("Order Lowest Cost Items Only"), `ignore_overstock`, `factor_order_delay`, `include_consignment`, `delayed_qoo`, `leave_cores_on_hand`, `ignore_vendor_core_qty` — grouped in source as "checkboxes" |
| Printed / Emailed / Faxed / EDI | Output-channel tracking flags | boolean (×4) | — | — | vtiger_purchaseorder | (grouped by source) |
| Scheduled PO | Whether this PO originated from a scheduled template | enum (`Yes`/`No`) | — | — | vtiger_purchaseorder | `scheduled_po` — links to `fuse5_scheduled_po_templates` |
| Reverse RGN PO | RGN-reversal marker | text | — | — | vtiger_purchaseorder | `reverse_rgn_po` |
| Container No / Seal No / Load Date / EDT / ETA Port | Freight/shipping tracking fields for import/container shipments | text/date (grouped) | — | — | vtiger_purchaseorder | (grouped by source) |
| Is Buyout PO | Marks this PO as a buyout PO | enum (`Yes`/`No`) | — | — | vtiger_purchaseorder | `isbuyoutpo` — cross-links to SalesOrder RGN/buyout |
| DIB File Types / DIB Delivery Service | Do-It-Best EDI-specific settings | enum | — | — | vtiger_purchaseorder | `dibfiletypes` / `dibdeliveryservice` |
| Acconex Confirm Number | Acconex (WMS) order confirmation number | text | — | — | vtiger_purchaseorder | `acx_confirm_num` |
| Default Transaction Code | Default `transcode` applied to line items | enum | — | — | vtiger_purchaseorder | `globaltranscode` — see Known Gaps, `transcode` open item |
| Terms & Conditions / Description / PO Comments | Free text | text | — | — | vtiger_purchaseorder | (grouped by source) |
| Total Line Items | Denormalized line-item count | number | — | — | vtiger_purchaseorder | `total_line_items` — computed |
| Outstanding Total | Remaining receiving/reconciliation balance | money | — | — | vtiger_purchaseorder | `outstanding_total` — computed |
| Charge-distribution flags | Whether order-level charges are distributed proportionally to line items | boolean | — | — | vtiger_purchaseorder | `reconciled_via_report`, `check_order_charge`, `check_s_h`, `check_surcharge` |
| Tax buckets | Up to three tax amounts plus a tax code and total | money (×3) / text / money | — | — | vtiger_purchaseorder | `po_tax1/2/3`, `po_taxcode`, `po_tax_total` |
| Reconciled | Boolean guard used alongside `postatus` for delete/edit protection | boolean | — | — | vtiger_purchaseorder | `reconciled` — see PO-RULE-017 |

### Purchase Order — Header Custom Fields

Backed by `vtiger_purchaseordercf`, 27 columns, PK `purchaseorderid`. Per Requirement R1, these are
legacy `cf_NNNN`-indirected fields the source blueprint labels by code, and every one should get a
real named column in a new implementation.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| PO Number | The human-facing PO number — `MUL`-indexed, used as the join key by nearly every ajax script instead of the primary key. Distinct from `purchaseorderid`. | text | — | — | vtiger_purchaseordercf | `cf_1103` |
| Name | Address-block name | text | — | — | vtiger_purchaseordercf | `cf_1107` |
| Street | Address street line | text | — | — | vtiger_purchaseordercf | `cf_1109` |
| PO Box / City / State / Zip | Address block fields | text | — | — | vtiger_purchaseordercf | `cf_1113`/`1115`/`1117`/`1119` |
| Customer Service Phone / Master Account # | Vendor-service contact / account reference | text | — | — | vtiger_purchaseordercf | `cf_1121`/`1123` |
| Backorder/Cancel | Picklist | enum | — | — | vtiger_purchaseordercf | `cf_1125` |
| For Customer # | Reference number | text | — | — | vtiger_purchaseordercf | `cf_1129` |
| On Invoice Number | Reference number | text | — | — | vtiger_purchaseordercf | `cf_1131` |
| Our Phone Number | Contact phone | text | — | — | vtiger_purchaseordercf | `cf_1133` |
| Purchased By | Purchaser reference | text | — | — | vtiger_purchaseordercf | `cf_1135` |
| PO Type | Picklist — required before proceeding on the order-generation screen | enum | Required (PO-RULE-004) | — | vtiger_purchaseordercf | `cf_1171` |
| Created By | Reference | reference | — | — | vtiger_purchaseordercf | `cf_1464` |
| Last PO Email History | Tracking field | text | — | — | vtiger_purchaseordercf | `cf_1897` |
| Job | Linked job reference | reference | — | — | vtiger_purchaseordercf | `cf_invoice_jobno` |
| Vendor Authorization Number | Vendor-supplied authorization number | text | — | — | vtiger_purchaseordercf | `cf_ven_auth_num` |
| Freight Tracking Number | Carrier tracking number | text | — | — | vtiger_purchaseordercf | `cf_freight_track_num` |
| Master Brand PO / OSF # | Cross-reference numbers | text | — | — | vtiger_purchaseordercf | `master_brand_po`/`master_brand_osf` |
| RGN PO Cost | Cost field specific to RGN POs | money | — | — | vtiger_purchaseordercf | `rgnpricefield` |
| Is Void | Void indicator | boolean | — | — | vtiger_purchaseordercf | `isvoi` |

**Cross-module field surfaced on this module**: `cf_1095` (Vendor PPD Amount) physically lives on
`vtiger_vendorcf` (a Vendors-module table), not on any PurchaseOrder table, but is registered
against `tabid=21` in `vtiger_fieldmodulerel` because the PO edit screen reads/writes it directly —
the mechanism behind the `setPPDValues.php` cross-module write finding (see Requirement R4 and
risks-and-open-questions.md).

### Purchase Order — Billing / Shipping Address

Backed by `vtiger_pobillads` (bill-to) and `vtiger_poshipads` (ship-to) — the source does not
itemize these column-by-column beyond noting the shape.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Bill Street/PO Box/City/State/Country/Code | Standard billing address block | text (grouped) | — | — | vtiger_pobillads | `bill_street/pobox/city/state/country/code` |
| Ship Street/PO Box/City/State/Country/Code | Standard shipping address block | text (grouped) | — | — | vtiger_poshipads | `ship_*` equivalents |
| Dropship | "Ship to Customer Physical Address" flag | boolean | — | — | vtiger_poshipads | not individually named in source |
| Shipping Block | Shipping block field | text | — | — | vtiger_poshipads | not individually named in source |
| Shipping Lot | Shipping lot field | text | — | — | vtiger_poshipads | not individually named in source |

### PO Line Item (Staging)

Backed by `lbm_iframepodetails`, PK `temppodetailsid`, 43 columns total, keyed by `ponumber` (the
human PO number, not `purchaseorderid`) + `hdnproductid`.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Quantity | Ordered quantity for this line | number | — | — | lbm_iframepodetails | `qty` |
| Cost Price / Converted Cost Price | Unit cost, in native and converted currency | money | — | — | lbm_iframepodetails | `costprice`/`convcostprice` |
| Core Price Value / Converted | Core-charge unit price, native and converted | money | — | — | lbm_iframepodetails | `corepricevalue`/`convcorepricevalue` |
| Barcode | Scanned/assigned barcode | text | — | — | lbm_iframepodetails | `barcode` |
| Line Number | Line's ordinal position | number | — | — | lbm_iframepodetails | `linenum` |
| From PO Type | Source-type marker for the line | text | — | — | lbm_iframepodetails | `frompotype` |
| Kit fields | Kit-membership identifiers | reference/text (×3) | — | — | lbm_iframepodetails | `kitsid`/`kitsnumber`/`kitsqty` |
| Per-line freight/duty/other-charge/discount allocation columns | Per-line proportional shares of header-level charges | money (grouped) | — | — | lbm_iframepodetails | not individually named in source |
| Variant/UOM JSON | Product-variant and unit-of-measure conversion payloads | array | — | — | lbm_iframepodetails | `variantjsondata`/`uomjsondata` |
| EDI extra detail | Cached EDI vendor-availability response | array/text | — | — | lbm_iframepodetails | `ediextradetail` |
| Linked SalesOrder | Linked SO id, for BOPO/RGN flows | reference (to Sales Order) | — | — | lbm_iframepodetails | `soid` |

**Not individually catalogued**: the remaining ~30 of the 43 columns follow the freight/duty/kit/UOM
patterns above and were not individually re-itemized by the source blueprint pass — logged in Known
Gaps below rather than guessed at here.

### PO Line Item (Committed)

Backed by `lbm_po_inventoryproductrel`, PK `iprid`, 100+ columns, keyed by `id` (→
`purchaseorderid`) + `productid` + `sequence_no` — a superset of the staging table plus
receiving/reconciliation state.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Quantity Received | Quantity received into inventory for this line | number | — | — | lbm_po_inventoryproductrel | `qty_received` |
| Quantity Backordered | Quantity on backorder | number | — | — | lbm_po_inventoryproductrel | `qty_bo` |
| Quantity Cancelled | Quantity cancelled | number | — | — | lbm_po_inventoryproductrel | `qty_cancelled` |
| Quantity Reconciled | Quantity resolved through reconciliation [sic — source spelling preserved as `qty_reconcilied`] | number | — | — | lbm_po_inventoryproductrel | `qty_reconcilied` |
| Quantity Returnable / Core Quantity Returnable | Quantity/core-quantity eligible for return | number | — | — | lbm_po_inventoryproductrel | `qty_returnable`/`core_qty_returnable` |
| RGN Status | Per-line RGN status | enum | — | — | lbm_po_inventoryproductrel | `rgn_status` |
| Warranty Resolved / Warranty Qty Resolved | Warranty-return resolution state | boolean/number | — | — | lbm_po_inventoryproductrel | `warranty_resolved`/`warranty_qty_resolved` |
| BOPO cross-links | Links this line back to a specific SalesOrder and SO line, and to a related PO | reference (to Sales Order / SO Line / Purchase Order) | — | — | lbm_po_inventoryproductrel | `rel_salesorder`/`rel_solinenumber`/`rel_purchaseorder` |
| Door/NS linkage | Door/NS-specific SO linkage | reference (to Sales Order) | — | — | lbm_po_inventoryproductrel | `door_soid`/`door_sonum` |
| Kit fields | Kit-expansion identifiers | reference/text (×4) | — | — | lbm_po_inventoryproductrel | `kitsid`/`kitsnumber`/`kitsgroupid`/`kitsqty` |
| Technician | Technician assigned to this line | reference (to Employee/User) | — | — | lbm_po_inventoryproductrel | not individually named in source |
| Equivalent-Part ID | Linked equivalent-part record | reference (to Equivalent Part) | — | — | lbm_po_inventoryproductrel | `epid` |
| Tax columns | Line-level tax rates/amounts | number/money (grouped) | — | — | lbm_po_inventoryproductrel | `tax1-3`, `grtpercentage`, `misctaxper`/`misctaxval` |
| Per-line freight/duty/S&H/surcharge/small-order-charge/discount allocation columns | Mirror the header-level distribution flags at line granularity | money (grouped) | — | — | lbm_po_inventoryproductrel | not individually named in source |

**Not individually catalogued**: the remaining columns beyond the ones itemized above (roughly 80+
of the 100+ total) follow the same receiving/reconciliation/kit/tax/allocation patterns and were
grouped rather than individually re-confirmed by the source pass.

### Temp PO Details

Backed by `vtiger_temppodetails`, PK `temp_podetails_id`. A second, older/parallel staging table
used by a subset of flows (Import).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| PO id | Linked PO | reference (to Purchase Order) | — | — | vtiger_temppodetails | `poid` |
| Product id | Linked product | reference (to Product) | — | — | vtiger_temppodetails | `productid` |
| Transaction Code | See Known Gaps, `transcode` open item | enum | — | — | vtiger_temppodetails | `transcode` |
| Quantity | Ordered quantity | number | — | — | vtiger_temppodetails | `quantity` |
| Cost Price | Unit cost | money | — | — | vtiger_temppodetails | `costprice` |
| Core Price Value | Core-charge unit price | money | — | — | vtiger_temppodetails | `corepricevalue` |
| Description | Free text | text | — | — | vtiger_temppodetails | `description` |
| Barcode | Scanned/assigned barcode | text | — | — | vtiger_temppodetails | `barcode` |

**Open item (carried forward, not resolved)**: whether this table still carries live traffic
distinct from `lbm_iframepodetails`, or is kept only for the Import flow, was not fully traced —
flagged as Open Question OQ-1 in risks-and-open-questions.md. This directly motivates Requirement R2
above (collapse the staging/committed split by design rather than by further investigating the
legacy overlap).

### PO Status History

Backed by `vtiger_postatushistory`, PK `historyid`.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Purchase Order | Linked PO | reference (to Purchase Order) | — | — | vtiger_postatushistory | `purchaseorderid` |
| Status | Status value at time of write | enum | — | — | vtiger_postatushistory | `postatus` |
| Invoice Number | Invoice reference | text | — | — | vtiger_postatushistory | `invoice_number` |
| Invoice Amount | Invoice amount | money | — | — | vtiger_postatushistory | `invoice_amount` |
| Receipt Number | Receipt reference | text | — | — | vtiger_postatushistory | `receipt_number` |
| Last Modified | Write timestamp | datetime | — | — | vtiger_postatushistory | `lastmodified` |

Written exclusively via `PurchaseOrder::logToPoStatusHistory()`. **Note**: sample data confirms this
table logs every write to `postatus`, not only genuine transitions (repeated `'Approved'` rows
recorded against the same PO) — a modeling note for a new implementation (write only on actual
transitions, see workflows.md §Required Resolution).

### PO Status Picklist

Backed by `vtiger_postatus`, schema fields `postatusid`, `postatus` (unique), `presence`,
`picklist_valueid` — **confirmed 0 rows live** in `lbm-local-integer`. The live set of status
strings in use is derived empirically from `vtiger_purchaseorder.postatus` distinct values, not from
this table. Whether this emptiness is an environment-specific gap in the dev database or a genuine
module-wide production condition is an open question (OQ-2, risks-and-open-questions.md), not
resolved here.

### Receiving Line Items

Backed by `vtiger_rm_polineitems`, PK `id`.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| RM ID | Receiving-module id | reference | — | — | vtiger_rm_polineitems | `rmid` |
| Part ID | Product id | reference (to Product) | — | — | vtiger_rm_polineitems | `pid` |
| Equivalent-Part ID | Linked equivalent-part record | reference (to Equivalent Part) | — | — | vtiger_rm_polineitems | `epid` |
| Line Code | Line identifier | text | — | — | vtiger_rm_polineitems | `linecode` |
| Product Stripped | Stripped product code | text | — | — | vtiger_rm_polineitems | `productstripped` |
| Barcode | Scanned/assigned barcode | text | — | — | vtiger_rm_polineitems | `barcode` |
| Mode | Receiving mode | enum (`''`/`S`/`M`) | — | — | vtiger_rm_polineitems | `mode` |
| Received Quantity / Received Quantity (PO) | Quantity received | number | — | — | vtiger_rm_polineitems | `receqty`/`receqty_po` |
| PO Number | Linked PO number | text | — | — | vtiger_rm_polineitems | `ponumber` |
| PO Each | Per-unit PO reference | text | — | — | vtiger_rm_polineitems | `po_each` |
| Sequence | Ordinal position | number | — | — | vtiger_rm_polineitems | `sequence` |
| Core Price / Cost Price | Core and cost pricing at receipt time | money | — | — | vtiger_rm_polineitems | `coreprice`/`costprice` |
| Appended PO | Appended-PO marker | text | — | — | vtiger_rm_polineitems | `appendpo` |
| Created PO | Created-PO marker | text | — | — | vtiger_rm_polineitems | `created_po` |

### PO Reconciliation

Backed by `vtiger_poreconciliation` (header) and `vtiger_poreconciliation_lineitem` (line), plus
`vtiger_poreconciliation_lineitem_frt_column` and `vtiger_poreconciliationcf`.

**Header** (`vtiger_poreconciliation`):

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Reconciliation ID | Primary key | reference | — | — | vtiger_poreconciliation | `reconciliationid` |
| Invoice Number | Invoice reference | text | — | — | vtiger_poreconciliation | `invoicenum` |
| Receipt Numbers | Receipt references | text | — | — | vtiger_poreconciliation | `receiptnumbers` |
| Vendor | Linked vendor | reference (to Vendor) | — | — | vtiger_poreconciliation | `vendor_id` |
| Totals (receiving/invoice/variance) | Header-level total amounts and variances | money (grouped) | — | — | vtiger_poreconciliation | `receiving_total_amount`, `invoice_total_amount`, `product_variance_total`, `core_variance_total`, `other_variance_total`, `freight_variance_total` |
| QuickBooks linkage | QB transaction reference | text (grouped) | — | — | vtiger_poreconciliation | `qb_txnid`, `qb_editsequence` |
| COA fields | Chart-of-accounts codes for discount/cost-variance/qty-variance/surcharge/S&H | text (grouped) | — | — | vtiger_poreconciliation | not individually named in source |
| PO Numbers | Linked PO numbers — **not normalized**, a comma-list | text | — | — | vtiger_poreconciliation | `ponumbers` (mediumtext) |
| Location | Linked location | reference (to Location) | — | — | vtiger_poreconciliation | `locationid` |
| VAT columns (Irish/UK-specific) | Region-specific VAT rate buckets | money (grouped) | — | — | vtiger_poreconciliation | `vat_23_percent`, `vat_13_5_percent`, `vat_0_percent` |
| Slipstream integration fields | Slipstream import/payment tracking | text/boolean (grouped) | — | — | vtiger_poreconciliation | `is_imported_on_ss`, `ss_account_id`, `ss_payment_status` |

**Line item** (`vtiger_poreconciliation_lineitem`):

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Reconciliation Line ID | Primary key | reference | — | — | vtiger_poreconciliation_lineitem | `reconciliationlineid` |
| PO Number | Linked PO number | text | — | — | vtiger_poreconciliation_lineitem | `ponumber` |
| Line Code | Linked line | text | — | — | vtiger_poreconciliation_lineitem | `linecode` |
| Product Code | Linked product code | text | — | — | vtiger_poreconciliation_lineitem | `productcode` |
| Ship/Bill/Core quantity+cost fields | Receiving-side amounts | money/number (grouped) | — | — | vtiger_poreconciliation_lineitem | not individually named in source |
| Invoice-side mirror fields | Invoice-side amounts | money/number (grouped) | — | — | vtiger_poreconciliation_lineitem | `inv_*` |
| Computed variances | Product/core/other variance amounts | money (grouped) | — | — | vtiger_poreconciliation_lineitem | `productvariance`, `corevariance`, `othervariance` |
| VAT | Line-level VAT amount | money | — | — | vtiger_poreconciliation_lineitem | not individually named in source |

### PO Templates

Backed by `vtiger_potemplates`, PK `id`.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| User | Owning user | reference (to User) | — | — | vtiger_potemplates | `userid` |
| Vendor | Linked vendor | reference (to Vendor) | — | — | vtiger_potemplates | `vendorid` |
| Template Name | Template name — **no unique DB constraint found**, see Known Gaps | text | Required (PO-RULE-020, client-side) | — | vtiger_potemplates | `templatename` |
| Data | Serialized template payload | array | — | — | vtiger_potemplates | `data` (longtext) |
| Location | Linked location | reference (to Location) | — | — | vtiger_potemplates | `locationid` |
| Create PO | Whether template auto-generates a PO | enum (`Yes`/`No`) | — | — | vtiger_potemplates | `createpo` |
| PO Number | Linked PO number | text | — | — | vtiger_potemplates | `ponumber` |
| User List | List of authorized users | text/array | — | — | vtiger_potemplates | `userlist` |
| PPD fields | Prepaid-discount fields on the template | money/number (grouped) | — | — | vtiger_potemplates | not individually named in source |
| Alert Only | Whether the template only alerts, without generating a PO | boolean | — | — | vtiger_potemplates | `alertonly` |
| Last Checked | Last cron check timestamp | datetime | — | — | vtiger_potemplates | `lastchecked` |

Alert scheduling is a separate table, `vtiger_potemplatesalert`, not itemized column-by-column in
the source.

## Known Gaps

- **`vtiger_temppodetails` vs. `lbm_iframepodetails` overlap** — the source blueprint's own
  grep-based pass could not fully resolve whether the older staging table still carries live traffic
  distinct from the newer one; flagged as Open Question OQ-1. This is the direct motivation for
  Requirement R2 — a new implementation is directed to resolve this by collapsing the split, not by
  further legacy archaeology.
- **`vtiger_potemplates.templatename` has no unique DB-level constraint** despite the UI enforcing
  "template already exists" client-side (`PurchaseOrder.js:141`, PO-RULE-022) — flagged as Open
  Question OQ-4; whether this was intentional (soft, client-scoped uniqueness) or a gap is not
  resolved.
- **The `transcode` enum's authoritative source is unconfirmed from PurchaseOrder's own files
  alone** — `transcode == 7` is treated as a special "excluded from cost" line type in the financial
  pipeline (calculations.md) and reappears as a distinct branch in RGN cancel-item processing, but
  the full lookup table/enum was not resolved in this pass; the source recommends cross-referencing
  Products' own blueprint as a first step. Flagged as Open Question OQ-5.
- **Field-level Required/Default status is not systematically documented** in the source blueprint
  for most PO fields (unlike SalesOrder's field catalog, which resolved this per-field) — this
  document does not invent Required/Default values the source did not itself confirm; where a
  field's required status is explicitly stated in the source (Subject, Vendor, Ship-To Location,
  PO Type, Template Name), it is called out inline above via its originating rule ID.
- **The remaining ~30 of 43 staging-line-item columns and ~80+ of 100+ committed-line-item columns**
  were grouped rather than individually itemized by the source pass — see the "Not individually
  catalogued" notes under those two entities above.

## §5 — Recommended rewrite schema (this session's own design proposal, not a blueprint finding)

Everything above documents what exists today. This section is different in kind: a proposed
replacement schema, reasoned from specific structural problems the legacy shape causes — each cited
back to where it's documented elsewhere in this module's own spec, not invented for this section.
Table/column names below are tech-agnostic placeholders, not a commitment to any specific naming
convention or database engine. (Source:
`docs_from_blueprint/module/PurchaseOrder/02-entities-and-fields.md` §5, in full.)

**Problems this design fixes, one by one:**

1. **Status is governed by an empty picklist master table plus scattered string-literal comparisons
   in at least five files, with no DB-level check catching a stray value.** `vtiger_postatus` is
   confirmed 0 rows live while 8 distinct `postatus` strings are genuinely in use, enforced only by
   `if ($postatus == 'X')`-style checks duplicated independently across `ProcessChanges.php`,
   `RGNCancelItem.php`, `Save.php`, `Delete.php`, and `manualSubmitEDI.php` (see workflows.md;
   Requirement R3; risk R-019). The delete-guard's own status list (`Delete.php:14`) is itself an
   independent duplicate of "which statuses are committed," decaying silently from the EDI/receiving
   checks the moment any one of the five files is edited without the others. **Fix**: a populated
   `po_status` lookup table as the single enforced source of truth, plus one `po_status_transition`
   table that owns every transition rule and status-dependent guard (delete-eligibility,
   EDI-eligibility, receiving-eligibility) as data rows rather than five independently hardcoded
   checks.
2. **The header's charge/tax/freight fields are a wide block of flat, similarly-named sibling
   columns — three freight buckets, three tax buckets, duty, excise, surcharge, S&H, small-order
   charge, discount amount/percent, each with its own GL-code twin — and this exact shape is what let
   `CalcTotal.php` build a live SQL column name from raw `$_REQUEST['updateExtParam']` with no
   allow-list, the single worst finding in the module** (see calculations.md; risk PO-RISK-001). A
   dynamic-column-name UPDATE against a fixed wide row is exactly the pattern a flat sibling-column
   shape invites: "which of these fifteen similarly-shaped columns do I update" is a question dynamic
   SQL answers when a normalized child table would instead answer it with a `WHERE charge_type_id = ?`
   parameter. **Fix**: collapse the flat charge/tax columns into a `po_charge` child table (one row
   per charge instance, `charge_type_id` a value not a column name), removing both the rigidity and
   the temptation/need for column-name-driven SQL entirely — every write becomes a parameterized
   `INSERT`/`UPDATE ... WHERE charge_type_id = ?`, with no code path left that constructs a column
   identifier from user input.
3. **Line items are split across three physically separate tables** — two staging tables
   (`lbm_iframepodetails` and the older, only partly-traced `vtiger_temppodetails`) and one committed
   table (`lbm_po_inventoryproductrel`), with the overlap between the two staging tables never fully
   resolved (Requirement R2; OQ-1). **Fix**: one authoritative `po_line_item` table with an explicit
   `lifecycle_state` (draft/committed) column, per Requirement R2 — closing OQ-1 by design rather
   than by further archaeology of the legacy overlap.
4. **The reconciliation header stores its linked PO numbers as a single denormalized
   comma-separated `mediumtext` column** (`ponumbers`) instead of a real child relationship. **Fix**:
   a `po_reconciliation_po` join table, one row per (reconciliation, PO) pair.
5. **`vtiger_potemplates.templatename` has no unique DB-level constraint**, relying entirely on
   client-side JavaScript to block duplicates (OQ-4). **Fix**: an explicit unique constraint on
   (`tenant_id`, `name`) in `po_template`, resolving OQ-4 with a stated decision rather than carrying
   the ambiguity forward.
6. **Vendor-owned fields are written directly from PurchaseOrder code into a Vendors-module table**
   (`setPPDValues.php` mutating `vtiger_vendorcf` with zero parameterization across all four of its
   statements — Requirement R4; risk PO-RISK-002), and one Vendors-owned custom field (`cf_1095`,
   Vendor PPD Amount) is registered against the PurchaseOrder tab and physically lives outside any
   PurchaseOrder table. **Fix**: no PO table in this schema carries a vendor-owned column at all —
   `vendor_id` on `purchase_order` is a read-only reference; PPD%, PPD type, tax exemption, EDI
   capability, and default currency are read via a Vendors-module service call, never written from PO
   tables, making the cross-module boundary violation structurally impossible rather than merely
   better-escaped.

**Proposed tables:**

- **`purchase_order`** (header) — `id` (PK), `tenant_id`, `po_number` (unique per tenant — the
  human-facing identifier the legacy system already treats as the real join key, now made the actual
  unique key instead of a custom field), `vendor_id` (FK, reference-only, closes problem 6),
  `contact_id` (FK, nullable), `status_id` (FK → `po_status`, required, closes problem 1),
  `rgn_sub_status_id` (FK → `po_rgn_status`, nullable — kept as its own typed concept, not folded
  into `status_id`), `is_locked_for_deletion` (boolean, replaces the free-standing `reconciled` guard
  with a named, status-service-owned flag), `ship_to_location_id` (FK, required), `due_date`,
  `eta_date`, `subtotal`, `grand_total` (both explicitly documented as derived/computed, not
  independently writable), `terms`, `description`, audit/soft-delete columns.
- **`po_status`** (new — replaces the empty `vtiger_postatus`, closes problem 1) — `id` (PK), `code`
  (unique, e.g. `APPROVED`, `FINALIZED`, `ORDER_PARTIALLY_RECEIVED` — the 8 observed live values as
  the seeded initial member set), `label`, `is_committed` (boolean — the single flag `Delete.php`'s
  hardcoded list and the receiving/EDI eligibility checks all read from instead of each re-deriving
  it), `sort_order`, audit columns. Populated at install time — an empty status table is no longer a
  possible state.
- **`po_status_transition`** (new, closes problem 1) — `id` (PK), `from_status_id` (FK, nullable for
  the initial creation transition), `to_status_id` (FK), `trigger_code` (enum: `create`, `finalize`,
  `receive_partial`, `receive_full`, `cancel_all_lines`, `reconcile_partial`, `reconcile_complete`,
  `rgn_process`), unique on (`from_status_id`, `trigger_code`) so a given trigger from a given status
  has exactly one resolved outcome. This table is the single source every status-dependent guard
  reads from — the delete-block list, the EDI-eligibility check (`Finalized` only), and the
  receiving-eligibility check all become queries against this table rather than five independently
  hardcoded literal comparisons.
- **`po_rgn_status`** (new, small lookup — replaces the free-text `po_rgn_status` column) — `id`
  (PK), `code` (`NOT_SUBMITTED`/`SUBMITTED`), `label`.
- **`po_status_history`** (tightened, replaces `vtiger_postatushistory`) — `id` (PK),
  `purchase_order_id` (FK), `from_status_id` (FK, nullable), `to_status_id` (FK), `changed_at`,
  `changed_by`, `invoice_number`, `invoice_amount`, `receipt_number`. Written only when a transition
  actually occurs — the status service is the only writer — closing the confirmed gap where the
  legacy table logs every write to `postatus` regardless of whether the value changed.
- **`po_charge`** (new — replaces the header's flat freight/duty/surcharge/tax/S&H/small-order-charge
  columns, closes problem 2) — `id` (PK), `purchase_order_id` (FK), `charge_type_id` (FK → a small
  `charge_type` lookup table: `freight`, `duty`, `surcharge`, `small_order`, `excise_duty`,
  `sales_commission`, `shipping_handling`, `discount`, `tax`, seeded from the columns itemized in
  the Header section above), `amount`, `percent` (nullable), `gl_account_code` (nullable), `vendor_id`
  (nullable — covers the per-freight-bucket vendor assignment), `status_text` (nullable — covers the
  per-freight-bucket status), audit columns. Every write is `... WHERE charge_type_id = ?`, a bound
  parameter, never a column identifier built from request input.
- **`po_line_item`** (replaces the staging/committed/temp three-way split, closes problem 3) — `id`
  (PK), `purchase_order_id` (FK), `product_id` (FK), `line_number`, `lifecycle_state` (enum:
  `draft`/`committed`, per Requirement R2), `quantity_ordered`, `quantity_received`,
  `quantity_backordered`, `quantity_cancelled`, `quantity_reconciled`, `quantity_returnable`,
  `cost_price`, `converted_cost_price`, `core_price`, `converted_core_price`, `transcode_id` (FK → a
  `transcode` lookup table — giving `transcode` an owning table closes OQ-5's ambiguity about its
  authoritative source, cross-checked against Products' own schema if Products defines a global
  version), `related_sales_order_id` / `related_sales_order_line_id` (FK, nullable — BOPO/RGN
  linkage), `door_sales_order_id` (FK, nullable), `kit_group_id` (nullable), `barcode`, audit columns.
  Unique on (`purchase_order_id`, `line_number`).
- **`po_line_charge_allocation`** (new — replaces the per-line freight/duty/S&H/surcharge/discount
  allocation columns duplicated at line granularity) — `id` (PK), `line_item_id` (FK),
  `charge_type_id` (FK, same lookup as `po_charge`), `amount`, unique on (`line_item_id`,
  `charge_type_id`).
- **`po_reconciliation`** (header, tightened) — `id` (PK), `tenant_id`, `vendor_id` (FK,
  reference-only), `invoice_number`, `location_id` (FK), variance/total columns as documented above,
  `vat_code_id` (FK → a `vat_code` lookup — replaces the three flat `vat_23_percent` /
  `vat_13_5_percent` / `vat_0_percent` columns with a rate reference), audit columns.
- **`po_reconciliation_po`** (new — replaces the `ponumbers` comma-list, closes problem 4) — `id`
  (PK), `reconciliation_id` (FK), `purchase_order_id` (FK), `receipt_number`, unique on
  (`reconciliation_id`, `purchase_order_id`).
- **`po_reconciliation_line`** — `id` (PK), `reconciliation_id` (FK), `line_item_id` (FK →
  `po_line_item`, replacing the legacy's own PO-number+line-code composite key), ship/bill/core
  quantity+cost columns, invoice-side mirror columns, computed variance columns, `vat_code_id` (FK),
  audit columns.
- **`po_template`** (tightened, closes problem 5) — `id` (PK), `tenant_id`, `user_id` (FK),
  `vendor_id` (FK, reference-only), `name` (**unique on `tenant_id` + `name`** — new, closes OQ-4),
  `location_id` (FK), `payload`, `create_po` (boolean), `alert_only` (boolean), `last_checked_at`,
  audit columns. Alert scheduling stays a separate `po_template_alert` child table, mirroring the
  legacy's own `vtiger_potemplatesalert` split.

**Referential integrity**: every FK above should be a real, enforced database constraint. The legacy
schema's own worst finding — `CalcTotal.php` building a live SQL *column name*, not a value, from raw
request input — could not have happened against a normalized `po_charge` table, since there would be
no column identifier for request input to reach in the first place; the parameterized `charge_type_id`
value replaces it entirely (problem 2, above). Recommend `RESTRICT` on delete for `po_status` and
`vendor_id`-referencing rows while dependent records exist, and route every vendor-field read through
the Vendors-module service boundary rather than a cross-schema join, keeping Requirement R4's
structural separation intact at the data-access layer as well as the schema layer.
