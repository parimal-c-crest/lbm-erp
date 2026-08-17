# SalesOrder — Entities & Fields

> Every entity, every field, individually. No grouping/summarizing — that's how fields get lost.
> Legacy table/column names are a first-class column in the field catalog below, not an optional
> footnote — this project's whole documentation discipline rests on every claim being traceable to
> a specific source, and a footnote is too easy to skip. See
> `_deviations-from-original-template.md` in this folder.

Sources: `docs_from_blueprint/module/SalesOrder/02-entities-and-fields.md` (entity list, field
list, business meaning, type, required, default, source-of-truth) joined field-by-field against
`blueprint/module/SalesOrder/01-entities-fields.md` (legacy table/column citations) to populate
the Legacy Trace column that the first source deliberately omits. Every row below traces to one
or both of those two files; nothing is invented.

## Entity List

| Entity | Purpose |
|---|---|
| Sales Order (Header) | The core order record — what's being sold, to which account, its totals, status, and delivery/fulfillment metadata. |
| Line Item | One product/part/kit line on the order: quantity, pricing, tax, cost, and fulfillment/backorder/kit sub-state. |
| Billing Address | The address the order should be billed to; one per order. |
| Shipping Address | The address the order should ship/deliver to; one per order. |
| Deposit / ROA (Received-on-Account) Transaction | A money-received-in-advance transaction (deposit, gift card, refund, or account adjustment) not yet a finalized payment on a specific invoice line. Modeled across three related concepts: the transaction ledger itself, a per-order current-unapplied-balance cache, and a per-application allocation record (an ROA transaction can be applied across multiple orders over time). |
| Payment Record | A settled payment (or split-payment leg) recorded against an order. |
| Card Transaction | A credit/debit card authorization or sale processed through the card-payment gateway integration, linked either directly to an order or to a deposit/ROA transaction. |
| Finalization Record | A point-in-time snapshot of delivery-preference and freight/labor data captured at the moment an order is finalized. |
| Status History Event | An audit-log entry recorded each time an order's status changes, capturing account name and total at that moment. In the legacy system this table exists and has a read function, but is completely empty (0 rows) with no confirmed write path — carried forward as a legitimate audit concept that needs an actual write path, not legacy cruft. |
| Backorder / Buyout / Stock-Transfer Resolution | Per-line-item state for resolving an out-of-stock situation: buying out from a vendor, transferring from another location, or backordering. |

*(Two further legacy concepts keyed to a Sales Order — a generic record-sharing/group-assignment
mechanism, and a pre-save JSON audit snapshot — are deliberately excluded from this list. See
Known Gaps.)*

## Governing Architectural Requirements (R1–R5)

Carried forward from `docs_from_blueprint/module/SalesOrder/02-entities-and-fields.md` §1: five
architectural decisions the blueprint's implementation plan establishes, restated here as
forward-looking requirements for any new implementation, not merely observations about the legacy
system.

- **R1 — No generic dynamic-field/EAV mechanism.** Roughly a quarter of legacy header fields were
  added via an inconsistent "add a custom field" mechanism, landing unpredictably in either a
  dedicated extension table or directly on the base entity table, with no clean core/custom boundary.
  No evidence exists of end users defining new fields themselves at runtime. Requirement: the data
  model uses one explicit, typed field for every business field identified in this document, with no
  generic key-value extension mechanism.
- **R2 — A dedicated Line Item concept, not a mechanism shared across modules.** The legacy line-item
  table, despite a naming collision with a generic framework table name that does not actually exist
  in the live database (see risks-and-open-questions.md, Critical Risk #3), is in practice already a
  dedicated, SalesOrder-specific table. Requirement: the new data model keeps one single, canonical
  Line Item entity dedicated to Sales Orders — preserving what the legacy system already got right
  while removing the naming ambiguity that causes a live defect.
- **R3 — Totals are always computed, never accepted as direct input.** Direct architectural fix for
  the single most severe risk found in the legacy system: the finalized order total is written
  verbatim from a client-submitted value with no server-side verification against the order's actual
  line items, and every printed customer-facing total is subsequently read from that same unverified,
  stored value. Requirement: no operation may accept a total (grand total, subtotal, or final total)
  as a directly-writable input — every total is always the output of running the pricing/calculation
  pipeline (see calculations.md) against the order's current line items, tax, and deposit state, at
  every point a total is needed.
- **R4 — Status is split into two independent concepts, not one overloaded field.** The legacy system
  writes two structurally different, independently-validated status concepts into the *same* database
  column: a free-text quote/contract/pending lifecycle track, and a separately-configured,
  lookup-table-validated fulfillment/delivery pipeline. A value read from that column cannot, by
  itself, be known to belong to one track or the other without also consulting other fields.
  Requirement: the new data model represents these as two explicit, independently-typed status
  concepts — **QuoteLifecycleStatus** and **FulfillmentStatus** — alongside a third, coarser
  **primary lifecycle status** concept (full detail in workflows.md).
- **R5 — Every business entity is scoped to a tenant.** This is a multi-tenant platform (tenant
  resolved by request context); established at the platform level, outside this module's specific
  scope, but carried forward here as an explicit requirement rather than silently assumed.
  Requirement: every entity below carries a tenant reference, and every uniqueness constraint (e.g.
  order number uniqueness) is scoped per-tenant, not global.

## Field Catalog

<!-- Logical types: money / date / datetime / enum / text / reference(to X) / boolean / array
     Never a raw SQL type (varchar, int, etc). -->

### Sales Order — Header

Backed by `vtiger_salesorder`, the standard vtiger entity table (183 fields individually
catalogued).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Subject | Free-text order subject/title | text | No | NULL | user-entered | `vtiger_salesorder.subject` |
| Potential (Opportunity) Link | Optional link to a CRM Potential this SO originated from | reference (to Potential/Opportunity) | No | NULL | derived | `vtiger_salesorder.potentialid` |
| Master Account Number | Denormalized copy of the customer account's number | text | No | NULL | derived (copied from Account) | `vtiger_salesorder.customerno` |
| Quote Link | Optional link to the Quote this SO was converted from | reference (to Quote) | No | NULL | derived | `vtiger_salesorder.quoteid` |
| Backorder Root SO | If this SO was auto-generated as a backorder, the original/root SO id | reference (to Sales Order) | No | 0 | system-set | `vtiger_salesorder.backorder_root_salesorderid` |
| Vendor Terms | Payment terms text copied from vendor — meaning unclear, see Known Gaps | text | No | NULL | unclear | `vtiger_salesorder.vendorterms` |
| Contact | Linked CRM Contact for the order | reference (to Contact) | No | NULL | user-entered | `vtiger_salesorder.contactid` |
| Vendor | Linked vendor/supplier record — meaning unclear, see Known Gaps | reference (target unclear) | No | NULL | unclear | `vtiger_salesorder.vendorid` |
| Due Date | Date payment/order is due | date | No | NULL | user-entered | `vtiger_salesorder.duedate` |
| Carrier | Shipping carrier name | text | No | NULL | user-entered | `vtiger_salesorder.carrier` |
| Pending | Free-text pending-reason field | text | No | NULL | user-entered | `vtiger_salesorder.pending` |
| Purchase Order # | Legacy single PO number field (superseded — see Customer PO # below) | text | No | NULL | user-entered | `vtiger_salesorder.purchaseorder` |
| Order Type | Coarse order type tag (e.g. "normal_so") — relationship to Order Type (internal) below unclear, see Known Gaps | enum | No | `normal_so` | system-set | `vtiger_salesorder.type` |
| Adjustment | Manual dollar adjustment applied to the order total | money | No | NULL | user-entered | `vtiger_salesorder.adjustment` |
| Sales Commission | Commission amount/rate associated with the sale | money | No | NULL | user-entered/derived | `vtiger_salesorder.salescommission` |
| Excise Duty | Excise duty tax amount | money | No | NULL | derived | `vtiger_salesorder.exciseduty` |
| Misc SO Fee Skip | Whether the miscellaneous SO fee is skipped for this order | boolean | No | `No` | user-entered | `vtiger_salesorder.miscsofeeskip` |
| Misc SO Fee | Miscellaneous fee amount charged on the order | money | No (NOT NULL, no default) | none | user-entered/derived | `vtiger_salesorder.miscsofee` |
| Misc SO Fee Text | Label/description text shown for the misc fee | text | No | none | derived | `vtiger_salesorder.miscsofeetext` |
| Misc SO Fee — Manual Override | Whether the misc fee was manually overridden vs. system-calculated | boolean | No | `No` | user-entered | `vtiger_salesorder.miscsofee_manual` |
| Total Misc SO Fee Tax | Tax amount computed on the misc SO fee | money | No | none | derived | `vtiger_salesorder.totalmiscsofeetax` |
| Total Delivery-Charge Tax | Tax amount computed on the delivery charge | money | No | 0.000 | derived | `vtiger_salesorder.total_dc_tax` |
| Apply Delivery Charge | Whether a delivery charge applies to this order | boolean | No | `No` | user-entered | `vtiger_salesorder.apply_deliverycharge` |
| Delivery Charge | Delivery charge dollar amount | money | No | 0.00 | user-entered/derived | `vtiger_salesorder.deliverycharge` |
| Delivery Charge — Manual Override | Whether delivery charge was manually overridden | boolean | No | 0 | user-entered | `vtiger_salesorder.dc_manual` |
| Contract Amount | Dollar amount tied to a service contract linked to this order | money | No | 0.00 | user-entered/derived | `vtiger_salesorder.contract_amount` |
| Received Amount | Amount received/collected against the order to date | money | No | 0.00 | derived | `vtiger_salesorder.received_amount` |
| Total | Grand total of the order | money | No | NULL | derived (calculated from line items + fees + tax) | `vtiger_salesorder.total` |
| Sub Total | Sum of line-item extended prices before tax/fees | money | No | NULL | derived | `vtiger_salesorder.subtotal` |
| Apply Deposit | Whether a deposit is being applied to this order | boolean | Yes | `No` | user-entered | `vtiger_salesorder.applydeposit` |
| Return Deposit | Whether a deposit return is being processed on this order | boolean | Yes | `No` | user-entered | `vtiger_salesorder.returndeposit` |
| Deposit Type | Scope of deposit application: this order only, or all of the account's orders | enum | Yes | `Current SO` | user-entered | `vtiger_salesorder.deposittype` |
| Deposit Amount | Dollar amount of the deposit | money | Yes (NOT NULL) | NULL | user-entered | `vtiger_salesorder.depositamount` |
| Total Deposit Paid | Running total of deposit funds paid toward this order | money | No | 0.000 | derived | `vtiger_salesorder.total_deposit_paid` |
| Open Deposit Due | Remaining deposit amount still owed | money | No | 0.000 | derived | `vtiger_salesorder.open_deposit_due` |
| Deposit Yet to Bill | Deposit funds collected but not yet applied/billed | money | No | 0.000 | derived | `vtiger_salesorder.deposit_yet_to_bill` |
| Contract Deposit | Deposit amount specific to a linked contract | money | No | 0.00 | user-entered | `vtiger_salesorder.contract_deposit_amt` |
| Non-Refundable Deposit Return Adjustment | Adjustment amount when a non-refundable deposit is returned anyway | money | No | 0.000 | derived | `vtiger_salesorder.nonrefunddepositreturn_adjustment` |
| Account Total Deposit Amount | Total deposit amount across the whole account (not just this SO) | money | Yes (NOT NULL) | NULL | derived | `vtiger_salesorder.acctotaldepositamount` |
| Gift Card Total Amount | Total dollar amount applied via gift card(s) | money | Yes (NOT NULL) | NULL | derived | `vtiger_salesorder.giftcardtotalamount` |
| Gift Card Details | Detail data describing the gift card(s) used | array | Yes (NOT NULL) | NULL | derived | `vtiger_salesorder.giftcarddetails` |
| COD Apply Return Credit | Dollar amount of a return credit applied on a COD order | money | Yes (NOT NULL) | NULL | derived | `vtiger_salesorder.cod_apply_return_credit` |
| Apply COD Return | Whether a COD return is being applied | boolean | Yes | `No` | user-entered | `vtiger_salesorder.apply_cod_return` |
| SO Final Total | The order's finalized/locked total (distinct from the working Total) | money | Yes (NOT NULL) | NULL | system-set (at finalize) | `vtiger_salesorder.sofinaltotal` |
| Tax Type | How tax is calculated/grouped for the order | enum | No | NULL | user-entered | `vtiger_salesorder.taxtype` |
| Discount Percent | Order-level discount, as a percent | number | No | NULL | user-entered | `vtiger_salesorder.discount_percent` |
| Discount Amount | Order-level discount, as a dollar amount | money | No | NULL | user-entered | `vtiger_salesorder.discount_amount` |
| Shipping & Handling Amount | S&H charge on the order | money | No | NULL | user-entered/derived | `vtiger_salesorder.s_h_amount` |
| Master Account | The customer Account this order belongs to | reference (to Account) | Yes | NULL | user-entered | `vtiger_salesorder.accountid` |
| Terms & Conditions | Order-specific T&C text shown on printed documents | text | No | NULL | user-entered/derived | `vtiger_salesorder.terms_conditions` |
| Description / Notes | General notes on the order | text | No | NULL | user-entered | `vtiger_salesorder.sonotes` |
| Pick Ticket Comments | Comments shown specifically on the pick-ticket print output | text | No | NULL | user-entered | `vtiger_salesorder.pickticketcomments` |
| Status | The order's primary workflow status | enum | No | NULL | system-set | `vtiger_salesorder.sostatus` |
| Sub-Status | Finer-grained status within the primary status (e.g. delivery sub-states) | enum | No | NULL | system-set | `vtiger_salesorder.sosubstatus` |
| Order Type (internal) | Internal order-type classifier, e.g. normal SO vs. other flows — relationship to Order Type above unclear, see Known Gaps | text | No | `normal_so` | system-set | `vtiger_salesorder.ordertype` |
| Invoice Date | Date the order was invoiced | datetime | No | NULL | system-set | `vtiger_salesorder.invoice_date` |
| Source of SO Creation | Which channel/flow created this SO (e.g. Quick SO, ecommerce, etc.) | enum | Yes (NOT NULL) | NULL | system-set | `vtiger_salesorder.sourceofcreation` |
| Allocate Inventory | Whether inventory should be allocated/reserved for this order | boolean | No | NULL | user-entered | `vtiger_salesorder.allocateinventory` |
| From Auction | Flag indicating the order originated from an auction flow | boolean | Yes (NOT NULL) | 0 | system-set | `vtiger_salesorder.from_auction` |
| Sales Order Number | Human-facing SO number/document number | text | Yes (NOT NULL) | NULL | system-set | `vtiger_salesorder.salesorder_no` |
| Invoice Number | Invoice number assigned once the order is invoiced | text | Yes (NOT NULL) | NULL | system-set | `vtiger_salesorder.invoice_no` |
| Location | Store/branch location the order belongs to | reference (to Location) | Yes (NOT NULL) | NULL | user-entered | `vtiger_salesorder.mainlocation` |
| Customer PO # | Customer's own purchase-order number for this order | text | No | NULL | user-entered | `vtiger_salesorder.customerpo` |
| Customer OSF # | Customer's OSF reference number — "OSF" abbreviation unexpanded, meaning unclear, see Known Gaps | text | No | NULL | user-entered | `vtiger_salesorder.customerosfno` |
| Timed Out (Temp Saved) | Marks the SO as an incomplete/timed-out draft save | boolean | Yes (NOT NULL) | 0 | system-set | `vtiger_salesorder.tempsaved` |
| QuickBooks Transaction ID | QuickBooks sync transaction id, once posted | text (identifier) | Yes (NOT NULL) | NULL | system-set (integration) | `vtiger_salesorder.qb_txnid` |
| QuickBooks Edit Sequence | QuickBooks optimistic-concurrency edit-sequence token | text | Yes (NOT NULL) | NULL | system-set (integration) | `vtiger_salesorder.qb_editsequence` |
| Customer PO Number (alt) | A second customer-PO-number field — possible duplicate of Customer PO #, meaning unclear, see Known Gaps | text | No | NULL | user-entered | `vtiger_salesorder.customerponumber` |
| QuickBooks Queue State | Sync queue status for pushing this order to QuickBooks | enum | Yes (NOT NULL) | `0` | system-set (integration) | `vtiger_salesorder.qb_queue` |
| Freight | Freight cost on the order | money | Yes (NOT NULL) | 0.000 | user-entered/derived | `vtiger_salesorder.freight` |
| Labor | Labor cost on the order | money | Yes (NOT NULL) | 0.000 | user-entered/derived | `vtiger_salesorder.labor` |
| Markup | Markup percentage applied to the order's pricing | number | Yes (NOT NULL) | NULL | user-entered | `vtiger_salesorder.markup` |
| Discount/Markup/GP Type | Which pricing mode is in effect (discount vs markup vs gross-profit target) | enum | No | none | user-entered | `vtiger_salesorder.discount_markup_gp_type` |
| ROA Flag | Whether this order has ROA (received-on-account) funds involved | boolean | Yes (NOT NULL) | NULL | system-set | `vtiger_salesorder.roa` |
| Merged-Up Flag | Marks that this order's data was merged into another order — exact semantics unclear, see Known Gaps | number | Yes (NOT NULL) | NULL | system-set | `vtiger_salesorder.mergedup` |
| SO/Quote Status | Whether this record is being treated as a quote vs. a firm order | boolean | Yes (NOT NULL) | `No` | system-set | `vtiger_salesorder.so_quote_status` |
| Pending SO Name | Name/label for a pending SO state | text | Yes (NOT NULL) | none | system-set | `vtiger_salesorder.pending_so_name` |
| From Org Location | Originating org/location for cross-location orders | text | No | NULL | system-set | `vtiger_salesorder.from_org_location` |
| Paid Status | Whether the order is paid, partially paid, or unpaid | enum | Yes (NOT NULL) | `No` | derived | `vtiger_salesorder.paid_status` |
| Is COD | Whether this is a Cash-On-Delivery order | boolean | Yes (NOT NULL) | `No` | user-entered | `vtiger_salesorder.isCOD` |
| SO Delivery Preference | How the order should be delivered (pickup, delivery, etc.) | enum | No | NULL | user-entered | `vtiger_salesorder.so_delivery` |
| Truck Type | Type of delivery truck required | reference (to Truck Type lookup) | No | NULL | user-entered | `vtiger_salesorder.truck_type` |
| Load Type | Delivery load classification | reference (to Load Type lookup) | No | NULL | user-entered | `vtiger_salesorder.load_type` |
| Other Location Delivery | Free text for delivery to a non-standard/other location | text | No | none | user-entered | `vtiger_salesorder.other_location_delivery` |
| Target Delivery Time | Target date/time for delivery | datetime | No | `0000-00-00 00:00:00` | user-entered | `vtiger_salesorder.target_delivery_time` |
| Money Reconciliation Date | Date this order's payments were reconciled in an end-of-day batch | date | No | NULL | system-set | `vtiger_salesorder.moneyreconciliationdate` |
| Money Reconciliation (Batch) | Which end-of-day reconciliation batch this order belongs to | reference (to Reconciliation Batch) | Yes (NOT NULL) | 0 | system-set | `vtiger_salesorder.moneyreconciliationid` |
| Total Misc Tax Value | Total misc-tax dollar value | money | Yes (NOT NULL) | NULL | derived | `vtiger_salesorder.totalmisctaxval` |
| Total Misc Tax Rate | Misc-tax rate applied | number | Yes (NOT NULL) | NULL | derived | `vtiger_salesorder.totalmisctaxrate` |
| Misc Tax Label | Display label for the misc tax line | text | Yes (NOT NULL) | NULL | derived | `vtiger_salesorder.misctaxlabel` |
| RO Job Hat | Unclear — name suggests a repair-order "job hat" classification, meaning unclear, see Known Gaps | text | Yes (NOT NULL) | NULL | unclear | `vtiger_salesorder.ro_job_hat` |
| Terms | Payment terms code | enum | No | none | user-entered | `vtiger_salesorder.terms` |
| Invoice/Statement Terms Name | Display name of the invoice/statement terms | text | No | none | user-entered/derived | `vtiger_salesorder.invoice_statement_term_name` |
| Due Term | Possibly a due-date term code distinct from Terms — meaning unclear, see Known Gaps | text | No | none | unclear | `vtiger_salesorder.due_term` |
| Term Due Date | Computed due date from the terms | date | No | NULL | derived | `vtiger_salesorder.term_due_date` |
| QB Profile Setting | Which QuickBooks company/profile config applies | text | Yes (NOT NULL) | `Company QB Settings` | system-set | `vtiger_salesorder.cf_qbprofile` |
| SO Type (location) | Location-related SO type classifier (distinct from SO Type below) | text | Yes (NOT NULL) | NULL | system-set | `vtiger_salesorder.loc_type` |
| Pushed to EliteExtra | Sync status flag for the EliteExtra delivery-dispatch integration | enum | Yes (NOT NULL) | `3` | system-set (integration) | `vtiger_salesorder.pushedtoee` |
| Refund Gift Card ROA ID | Reference to the ROA/ADJ record used for a gift-card refund | reference (to Deposit/ROA Transaction) | Yes (NOT NULL) | NULL | system-set | `vtiger_salesorder.refundgiftcardroaid` |
| Register | The register/link the order is tied to | reference (to Register) | Yes (NOT NULL) | NULL | system-set | `vtiger_salesorder.link150` |
| Custom 1 (Order Type edit) | Free-slot custom field, currently labeled "Order Type edit" | enum | Yes (NOT NULL) | NULL | user-entered | `vtiger_salesorder.custom1` |
| Custom 2 (Forceman) | Free-slot custom field, currently labeled "Forceman" — meaning unclear as a business term, see Known Gaps | enum | Yes (NOT NULL) | NULL | user-entered | `vtiger_salesorder.custom2` |
| Custom 3 (Model) | Free-slot custom field, currently labeled "Model" | text | No | none | user-entered | `vtiger_salesorder.custom3` |
| Custom 4 (Elevation) | Free-slot custom field, currently labeled "Elevation" | text | No | none | user-entered | `vtiger_salesorder.custom4` |
| SO Discount Frequency | How often a recurring discount applies — meaning inferred from name only, see Known Gaps | number | No | 0 | unclear | `vtiger_salesorder.so_discount_frequency` |
| PPV Payment Method | Payment method captured during the PPV (pre-pick verification) step | enum | Yes (NOT NULL) | NULL | user-entered | `vtiger_salesorder.ppvpaymentmethod` |
| PPV Status | Pre-pick-verification status (Pending/Completed) | enum | Yes (NOT NULL) | NULL | system-set | `vtiger_salesorder.ppvstatus` |
| Finalized SO Payment Method | Payment method recorded at finalize time | text | No | none | system-set | `vtiger_salesorder.finalized_so_payment_method` |
| Web Opt-In / Text Preference | Whether the customer opted in to web/text notifications — abbreviation meaning unclear, see Known Gaps | boolean | Yes (NOT NULL) | `Yes` | user-entered | `vtiger_salesorder.woptintedpt` |
| Paid Date | Date the order was fully paid | date | No | NULL | derived | `vtiger_salesorder.paid_date` |
| Account Previous Total Owed | Snapshot of the account's total owed balance at time of order | money | No | NULL | derived | `vtiger_salesorder.accprevtotalowed` |
| Appointment ID | Linked scheduling appointment | reference (to Appointment) | No | 0 | derived/cross-module | `vtiger_salesorder.apptsid` |
| Promised Time | Free-text promised delivery/service time | text | No | NULL | user-entered | `vtiger_salesorder.promised_time` |
| Shipping Tracking Number | Carrier tracking number | text | No | NULL | system-set/user-entered | `vtiger_salesorder.tracking_number_shipping` |
| Picked | Whether the order's items have been picked | boolean | No | `No` | system-set | `vtiger_salesorder.picked` |
| CN Number | Credit-note number ("CN" = Credit Note) | text | Yes (NOT NULL) | none | system-set | `vtiger_salesorder.cnnumber` |
| CN Created Date | Date/time the credit note was created | datetime | No | NULL | system-set | `vtiger_salesorder.cncreateddate` |
| CCC Invoice Sent | Whether an invoice was sent for a CCC-type order — "CCC" abbreviation unexpanded, meaning unclear, see Known Gaps | boolean | No | NULL | system-set | `vtiger_salesorder.ccc_invoice_sent` |
| Interview Notes | Free-text notes from a customer interview/intake process | text | No | NULL | user-entered | `vtiger_salesorder.interviewnotes` |
| Service Status ID | Reference to a service-status lookup value | reference (to Service Status lookup) | Yes (NOT NULL) | 1 | system-set | `vtiger_salesorder.service_status_id` |
| OASN Status | Order-Acknowledgement/Ship-Notice status | enum | Yes (NOT NULL) | `Pending` | system-set | `vtiger_salesorder.oasnstatus` |
| Multi-Sale Type | Whether the order is a Service vs. Counter Sale | enum | No | NULL | user-entered | `vtiger_salesorder.multi_sales_type` |
| PPV Shipping Detail | Whether shipping detail was captured during PPV | boolean | Yes (NOT NULL) | `No` | system-set | `vtiger_salesorder.ppv_shipping_detail` |
| Quote Expire Date | Expiration date if this record is being used as a quote | date | No | NULL | user-entered/derived | `vtiger_salesorder.quote_exp_date` |
| Contract Start Date | Start date of a linked service contract | date | No | NULL | user-entered | `vtiger_salesorder.contract_start_date` |
| SO Type | Classifies the record as a contract, quote, or plain sales order | enum | No | NULL | system-set | `vtiger_salesorder.sotype` |
| Total Weight | Total shipping weight of the order | number | No | 0.000 | derived | `vtiger_salesorder.total_weight` |
| Weight Type | Unit of the total-weight figure | text | No | none | derived | `vtiger_salesorder.weight_type` |
| Show Core | Whether core-charge amounts should be displayed on this order | boolean | Yes (NOT NULL) | `No` | user-entered | `vtiger_salesorder.showcore` |
| Duration | Total service duration in minutes | number | No | 0 | user-entered/derived | `vtiger_salesorder.duration` |
| SO/Quote Reference | Free-text reference to a related SO or Quote | text | No | none | user-entered | `vtiger_salesorder.so_quote_reference` |
| SO/Quote Reference Type | Type qualifier for the reference above | text | No | none | system-set | `vtiger_salesorder.so_quote_reference_type` |
| Quote Date | Date the quote was generated | datetime | No | NULL | system-set | `vtiger_salesorder.quote_date` |
| Estimate # | Estimate number associated with the order | text | No | none | system-set | `vtiger_salesorder.estimatenumber` |
| Serialized Term Info | Financing/term info payload | array | No | NULL | system-set | `vtiger_salesorder.serializedterminfo` |
| Sub-Status Date | Timestamp text of the last sub-status change | text | No | none | system-set | `vtiger_salesorder.sosubstatus_date` |
| Web Order Status | Status of a linked web/ecommerce order | text | No | none | cross-module/system-set | `vtiger_salesorder.weborderstatus` |
| Inquiry Type (Job Type) | Type of job/inquiry this order is for | reference (to Job Type lookup) | No | 0 | user-entered | `vtiger_salesorder.inquiry_type` |
| Install Sales | Whether this is an install-sales order | boolean | No | none | user-entered | `vtiger_salesorder.install_sales` |
| Target Install Date | Requested installation date | date | No | `0000-00-00` | user-entered | `vtiger_salesorder.target_install_date` |
| Product Scanned | Whether line-item products have been barcode-scanned | boolean | No | `0` | system-set | `vtiger_salesorder.is_product_scanned` |
| TAC Tax — Manual Apply | Whether TAC tax was applied manually rather than automatically | boolean | No | `no` | user-entered | `vtiger_salesorder.so_tac_tax_apply_manually` |
| SO Tax 1 / SO Tax 2 / SO Tax 3 | Up to three tax amounts computed at the order level | money (×3) | No | 0.000 each | derived | `vtiger_salesorder.so_tax1`, `.so_tax2`, `.so_tax3` |
| Account Tax Based On | What basis (e.g. ship-to, bill-to) the account's tax is computed on | text | No | none | derived | `vtiger_salesorder.acctaxbasedon` |
| SO Tax Code | Tax code applied to the order | text | No | none | derived | `vtiger_salesorder.so_taxcode` |
| State Tax Applied | Whether state-level tax was applied | boolean | No | `no` | derived | `vtiger_salesorder.state_tax_applied` |
| State Tax Amount | State tax dollar amount | money | No | 0.000 | derived | `vtiger_salesorder.state_tax_amount` |
| SO JSON Data | Freeform payload for extended/overflow order data | array | No | NULL | system-set | `vtiger_salesorder.so_jsondata` |
| Accepted Quote Used | Whether the order was created from an accepted quote | boolean | No | `no` | system-set | `vtiger_salesorder.accepted_quote_used` |
| Description of Work | Free-text description-of-work narrative | text | No | NULL | user-entered | `vtiger_salesorder.dow_description` |
| INI Description | Free-text "INI" narrative — abbreviation meaning unclear, see Known Gaps | text | No | NULL | user-entered | `vtiger_salesorder.ini_description` |
| DOW Reference ID | Reference id tied to the description-of-work record | reference (to Description-of-Work record) | No | 0 | system-set | `vtiger_salesorder.dow_reference_id` |
| INI Reference ID | Reference id tied to the INI record — meaning unclear, see Known Gaps | reference (target unclear) | No | 0 | system-set | `vtiger_salesorder.ini_reference_id` |
| Non-Refundable Deposit Amount | Portion of the deposit that is non-refundable | money | No | 0.000 | user-entered/derived | `vtiger_salesorder.nonrefund_depositamount` |
| Contract Sales | Whether this order is a contract sale | boolean | No | `No` | user-entered | `vtiger_salesorder.contract_sales` |
| Master SO # | Reference to a "master" SO this one rolls up under | reference (to Sales Order) | No | 0 | system-set | `vtiger_salesorder.master_soid` |
| Child SO Complete | Whether a child SO under a master SO is complete | boolean | No | none | system-set | `vtiger_salesorder.is_child_so_complete` |
| Sub-Backorder Counter | Count of backorder sub-SOs spawned from this order | number | No | 0 | system-set | `vtiger_salesorder.sub_backorder_counter` |
| Sub-New-Pending-SO Counter | Count of new-pending sub-SOs spawned from this order | number | No | 0 | system-set | `vtiger_salesorder.sub_newpendingso_counter` |
| Return Reason Code | Code for the reason an order/line was returned | reference (to Return Reason lookup) | No | 0 | user-entered | `vtiger_salesorder.so_return_reason_code` |
| Authorized Purchaser | Person authorized to purchase/approve this order | reference (to Contact/Person) | No | 0 | user-entered | `vtiger_salesorder.authorized_purchaser` |
| Target Delivery Date | Requested delivery date | date | No | NULL | user-entered | `vtiger_salesorder.target_delivery_date` |
| Time Range | Numeric code for a delivery time-range option — meaning unclear, see Known Gaps | number | No | 0 | unclear | `vtiger_salesorder.time_range` |
| Target Delivery Start Time / End Time | Requested delivery time window | text (×2, time-of-day) | No | `00:00:00` each | user-entered | `vtiger_salesorder.target_delivery_start_time`, `.target_delivery_end_time` |
| Hold | Whether the order is on hold | boolean | No | `N` | user-entered | `vtiger_salesorder.hold` |
| Contact (secondary) | A second contact reference distinct from Contact above — exact distinction unclear, see Known Gaps | reference (to Contact) | No | NULL | unclear | `vtiger_salesorder.contact` |
| Approved | Whether the order has been approved | boolean | No | `No` | user-entered | `vtiger_salesorder.approved` |
| Credit Limit User | User associated with a credit-limit override/check | text | No | NULL | system-set | `vtiger_salesorder.creditlimit_user` |
| Plan ID | Reference to a financing/payment plan | reference (to Financing/Payment Plan) | No | NULL | system-set | `vtiger_salesorder.planid` |
| Ecommerce Order ID | External ecommerce platform's order id | text (identifier) | No | NULL | cross-module/system-set | `vtiger_salesorder.ecomorderid` |
| Ecommerce Config ID | Which ecommerce store configuration this order came from | reference (to Ecommerce Store Config) | No | NULL | cross-module/system-set | `vtiger_salesorder.ecom_config_id` |
| Ecommerce Store Name | Name of the originating ecommerce store | text | No | NULL | cross-module/system-set | `vtiger_salesorder.ecom_store_name` |
| EE Status | EliteExtra delivery-dispatch integration status | text | No | none | cross-module/system-set (integration) | `vtiger_salesorder.ee_status` |
| EE Status Change Time | Timestamp of last EliteExtra status change | text | No | none | system-set | `vtiger_salesorder.ee_status_change_time` |
| EE Manifest Name | EliteExtra delivery manifest name | text | No | none | system-set | `vtiger_salesorder.ee_manifest_name` |
| EE Total Route Drive Time | Estimated drive time for the delivery route | text | No | none | system-set | `vtiger_salesorder.ee_total_route_drive_time` |
| EE Driver Name | Assigned delivery driver name | text | No | none | system-set | `vtiger_salesorder.ee_driver_name` |
| EE ETA | Estimated delivery arrival time | text | No | none | system-set | `vtiger_salesorder.ee_eta` |
| EE Vehicle | Assigned delivery vehicle | text | No | none | system-set | `vtiger_salesorder.ee_vehicle` |
| EE Signer | Name of person who signed for delivery | text | No | none | system-set | `vtiger_salesorder.ee_signer` |
| EE Time Departed | Time the delivery vehicle departed | text | No | none | system-set | `vtiger_salesorder.ee_time_departed` |
| EE Staging Location | Staging location for the delivery | text | No | none | system-set | `vtiger_salesorder.ee_staging_location` |
| Total Units (Number of Lines) | Count of line items on the order | number | No | 0 | derived | `vtiger_salesorder.total_units` |

### Sales Order — Header Extension Fields

Backed by `vtiger_salesordercf`, a 1:1 "custom fields" extension table joined to the header by its
own SO reference (21 fields individually catalogued).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Counter Person | Employee who handled the order at the counter | reference (to Employee/User) | No | 0 | user-entered | `vtiger_salesordercf.cf_456` |
| Sales Person | Employee credited as the salesperson | reference (to Employee/User) | No | 0 | user-entered | `vtiger_salesordercf.cf_so_salesman` |
| Allocate Inventory (custom) | Duplicate-looking custom-field toggle for inventory allocation — relation to header Allocate Inventory unclear, see Known Gaps | enum | No | none | user-entered | `vtiger_salesordercf.cf_644` |
| Payment Method | Deposit/payment method selected | enum | No | none | user-entered | `vtiger_salesordercf.cf_1388` |
| Check Number | Check number if paid by check | text | No | none | user-entered | `vtiger_salesordercf.cf_1390` |
| Phone | Contact phone number captured on the order | text | No | NULL | user-entered | `vtiger_salesordercf.cf_1639` |
| Web Order | Whether this order originated as a web order | boolean | No | none | system-set | `vtiger_salesordercf.cf_1653` |
| Print Type | Which print/output type was last used | enum | No | NULL | system-set | `vtiger_salesordercf.cf_1925` |
| Email | Email address captured on the order | text | No | NULL | user-entered | `vtiger_salesordercf.cf_3094` |
| CA Order ID | Reference id to a "CA" order/system — abbreviation unclear, see Known Gaps | text | No | NULL | unclear | `vtiger_salesordercf.ca_order_id` |
| Use Saved Tax | Whether to reuse a previously-saved tax calculation | boolean | Yes (NOT NULL) | `No` | system-set | `vtiger_salesordercf.usesavedtax` |
| Line Option Default Tax | Default taxability mode applied to new line items | enum | Yes (NOT NULL) | `OFF` | user-entered | `vtiger_salesordercf.lineoptiondefaulttax` |
| Split Payment Details | Detail of a split-payment arrangement | array | Yes (NOT NULL) | none | system-set | `vtiger_salesordercf.splitpaymentdetails` |
| Special Term | Recurring-payment special term unit (month/week) | enum | Yes (NOT NULL) | none | user-entered | `vtiger_salesordercf.specialterm` |
| Number of Payments | Count of installment payments in a split-payment plan | number | Yes (NOT NULL) | 0 | user-entered | `vtiger_salesordercf.numberofpayments` |
| Until First Payment Due | Number of periods until the first installment is due | number | Yes (NOT NULL) | 0 | user-entered | `vtiger_salesordercf.untilfirstpaymentdue` |
| Backorder SO | Whether this specific SO is itself a backorder SO | boolean | Yes (NOT NULL) | `No` | system-set | `vtiger_salesordercf.backorder_so` |
| Line Employee | Numeric field; name suggests an employee tied to a line item context — meaning unclear, see Known Gaps | reference (target unclear) | Yes (NOT NULL) | 0 | unclear | `vtiger_salesordercf.linempl` |
| PT Data | Payload possibly related to "Payment Terms" or "Print Ticket" data — meaning unclear, see Known Gaps | array | No | NULL | unclear | `vtiger_salesordercf.pt_data` |
| Picked Status | Fulfillment pick/pack/ship stage | enum | No | NULL | system-set | `vtiger_salesordercf.picked_status` |
| Link Email | Email address used for a shareable order link | text | No | NULL | system-set | `vtiger_salesordercf.link_email` |

### Line Item

Backed by `lbm_so_inventoryproductrel` (118 columns total; 36 individually catalogued in the
source). The table has no `vtiger_field` rows, so all meanings are inferred from column names and
code usage; per source, only the columns with clear business significance or confirmed code usage
are itemized, and **the remainder (roughly 80 columns) is a flagged, not-yet-detailed group**, not
individually invented here.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Line Item ID | Primary key of the line item row | text (identifier) | Yes | auto_increment | system-set | `lbm_so_inventoryproductrel.iprid` |
| Legacy/Generic ID | Secondary id column matching the generic vtiger `id` PK pattern; likely a carryover from the shared schema this table was forked from — relationship to Line Item ID unclear, see Known Gaps | text (identifier) | No | NULL | system-set | `lbm_so_inventoryproductrel.id` |
| Barcode | Scanned/assigned barcode for this line | text | No | NULL | user-entered/derived | `lbm_so_inventoryproductrel.barcode` |
| Product | The product/part sold on this line | reference (to Product) | No | NULL | user-entered | `lbm_so_inventoryproductrel.productid` |
| Sequence Number | Display/entry order of the line on the order | number | No | NULL | system-set | `lbm_so_inventoryproductrel.sequence_no` |
| Print Sort Order | Order the line prints in on documents (may differ from entry order) | number | No | NULL | user-entered/system-set | `lbm_so_inventoryproductrel.printsortorder` |
| Transaction Code | Line-item type code (e.g. normal sale, credit, etc.) | enum | No | NULL | system-set | `lbm_so_inventoryproductrel.transcode` |
| Order Quantity | Quantity ordered | number | No | 0 | user-entered | `lbm_so_inventoryproductrel.quantity` |
| Ship Quantity | Quantity actually shipped | number | No | NULL | derived | `lbm_so_inventoryproductrel.shipqty` |
| Sales Price | Unit sell price | money | No | NULL | user-entered/derived | `lbm_so_inventoryproductrel.salepricevalue` |
| Sales Price — Manually Changed | Whether the sell price was manually overridden | boolean | No | `No` | user-entered | `lbm_so_inventoryproductrel.sp_changed_manually` |
| List Price | Catalog list price for the product | money | No | NULL | derived | `lbm_so_inventoryproductrel.listprice` |
| Cost Price | Unit cost of the product | money | No | NULL | derived | `lbm_so_inventoryproductrel.costprice` |
| Changed Cost | Manually overridden cost value | money | No | 0.0000 | user-entered | `lbm_so_inventoryproductrel.changed_cost` |
| Discount Percent (line) | Discount percent applied to this line | number | No | NULL | user-entered | `lbm_so_inventoryproductrel.discount_percent` |
| Discount Amount (line) | Discount dollar amount applied to this line | money | No | NULL | user-entered/derived | `lbm_so_inventoryproductrel.discount_amount` |
| Comment | Line-item comment shown internally | text | No | NULL | user-entered | `lbm_so_inventoryproductrel.comment` |
| Comment (location-specific) | Location-scoped variant of the line comment — exact distinction from Comment unclear, see Known Gaps | text | No | NULL | user-entered | `lbm_so_inventoryproductrel.commentloc` |
| Part Note | Note text specific to the part | text | No | NULL | user-entered | `lbm_so_inventoryproductrel.partnote` |
| Description | Line item description text | text | No | NULL | derived (from product) / user-entered | `lbm_so_inventoryproductrel.description` |
| Tax 1 / Tax 2 / Tax 3 | Up to three tax rates applied to the line | number (×3) | No | NULL each | derived | `lbm_so_inventoryproductrel.tax1`, `.tax2`, `.tax3` |
| Part Taxable | Whether the part portion of the line is taxable | boolean | No | 0 | derived | `lbm_so_inventoryproductrel.parttaxable` |
| Core Taxable | Whether the core-charge portion of the line is taxable | boolean | No | NULL | derived | `lbm_so_inventoryproductrel.coretaxable` |
| Quantity Received | Quantity received into inventory/fulfillment for this line | number | No | 0.00 | system-set | `lbm_so_inventoryproductrel.qty_received` |
| Quantity Backordered | Quantity currently on backorder for this line | number | No | 0.00 | system-set | `lbm_so_inventoryproductrel.qty_bo` |
| Quantity Cancelled | Quantity cancelled from this line | number | No | 0.00 | system-set | `lbm_so_inventoryproductrel.qty_cancelled` |
| Sales Order (parent) | The Sales Order this line belongs to | reference (to Sales Order) | No | NULL | system-set | `lbm_so_inventoryproductrel.rel_salesorder` |
| SO Line Number | The line's ordinal number within the SO | number | No | NULL | system-set | `lbm_so_inventoryproductrel.rel_solinenumber` |
| Purchase Order (linked) | A Purchase Order this line is linked to (e.g. for a special-order/buyout line) | reference (to Purchase Order) | No | NULL | cross-module | `lbm_so_inventoryproductrel.rel_purchaseorder` |
| Coupon Details | Coupon code/discount detail applied to this line | text | No | NULL | derived | `lbm_so_inventoryproductrel.coupondetails` |
| Kits — Unique ID / Kit ID / Kit Number / Kit Group ID / Kit Qty | Identify a "kit" (bundle) this line belongs to, and its role within it | reference/text (identifier) (×5) | No | varies | system-set | `lbm_so_inventoryproductrel.kits_unique_id`, `.kitsid`, `.kitsnumber`, `.kitsgroupid`, `.kitsqty` |
| Serial Number(s) | Serial number(s) tracked against this line | text | No | NULL | user-entered | `lbm_so_inventoryproductrel.product_serial_number` |
| Lot Number(s) | Lot number(s) tracked against this line | text | No | NULL | user-entered | `lbm_so_inventoryproductrel.product_lot_number` |
| Technician | Technician assigned to this line (for service/install lines) | reference (to Employee/User) | No | 0 | user-entered | `lbm_so_inventoryproductrel.technician` |
| Store Pick | Whether this line is fulfilled by in-store pick rather than warehouse | boolean | No | `No` | user-entered | `lbm_so_inventoryproductrel.cf_storepick` |
| Picked | Whether this specific line has been picked | boolean | Yes (NOT NULL) | `No` | system-set | `lbm_so_inventoryproductrel.picked` |
| *(not individually catalogued)* | Roughly 80 additional columns (`gpcolorcode`, `taxdollartot`, `rgn_status`, `polineitemfreight`, `polineitemduty`, `sligroup`/`slicolor`, `uomjsondata*`, `variantjsondata`, `productgroup*`, `accepted_quote_id`/`accepted_quote_soid`, `tintcolorinfo`, `bigtreeprod*`, `cogs`/`enablecogs`) covering unit-of-measure conversion, product-variant, kit-grouping, RGN/return, and cost-of-goods-sold mechanics. Meaning "plausible from naming but not independently confirmed" per source — not itemized individually. See Known Gaps. | — | — | — | — | `lbm_so_inventoryproductrel.*` (group, not individually confirmed — see `blueprint/module/SalesOrder/01-entities-fields.md` §2.2) |

### Billing Address

Backed by `vtiger_sobillads`, 1:1 with the header (16 fields individually catalogued).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Billing Address ID | Row key, 1:1 with the Sales Order | text (identifier) | Yes | 0 | system-set | `vtiger_sobillads.sobilladdressid` |
| Billing Street | Street line of the billing address | text | No | NULL | user-entered | `vtiger_sobillads.bill_street` |
| Billing Address 2 (PO Box) | Second address line / PO box | text | No | NULL | user-entered | `vtiger_sobillads.bill_pobox` |
| Billing City | City | text | No | NULL | user-entered | `vtiger_sobillads.bill_city` |
| Billing State | State/province | text | No | NULL | user-entered | `vtiger_sobillads.bill_state` |
| Billing Postal Code | Postal/ZIP code | text | No | NULL | user-entered | `vtiger_sobillads.bill_code` |
| Billing County | County | text | No | NULL | user-entered | `vtiger_sobillads.bill_county` |
| Billing Country | Country | text | No | NULL | user-entered | `vtiger_sobillads.bill_country` |
| Billing Lot | Lot number for the billing address (real-estate/lot-based addressing) | text | No | none | user-entered | `vtiger_sobillads.billing_lot` |
| Billing Block | Block number for the billing address | text | No | none | user-entered | `vtiger_sobillads.billing_block` |
| Billing Name | Name on the billing address | text | No | NULL | user-entered | `vtiger_sobillads.billing_name` |
| Billing C/O | Care-of name for billing | text | No | NULL | user-entered | `vtiger_sobillads.bill_careof` |
| Billing Master Account | Denormalized account name/number for billing | text | No | NULL | derived | `vtiger_sobillads.billing_account` |
| Billing Phone | Phone number for billing contact | text | No | NULL | user-entered | `vtiger_sobillads.billing_phone` |
| Billing Fax | Fax number for billing contact | text | No | NULL | user-entered | `vtiger_sobillads.billing_fax` |
| General Master Account Notes | Notes about the master account, surfaced from the billing-address block in the order UI | text | No | NULL | user-entered | `vtiger_sobillads.so_gen_notes` |

### Shipping Address

Backed by `vtiger_soshipads`, 1:1 with the header the same way (15 fields individually catalogued;
Latitude/Longitude combined into one source row).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Shipping Address ID | Row key, 1:1 with the Sales Order | text (identifier) | Yes | 0 | system-set | `vtiger_soshipads.soshipaddressid` |
| Shipping Street | Street line of the shipping address | text | No | NULL | user-entered | `vtiger_soshipads.ship_street` |
| Shipping Address 2 (PO Box) | Second address line / PO box | text | No | NULL | user-entered | `vtiger_soshipads.ship_pobox` |
| Shipping City | City | text | No | NULL | user-entered | `vtiger_soshipads.ship_city` |
| Shipping State | State/province | text | No | NULL | user-entered | `vtiger_soshipads.ship_state` |
| Shipping Postal Code | Postal/ZIP code | text | No | NULL | user-entered | `vtiger_soshipads.ship_code` |
| Shipping County | County | text | No | NULL | user-entered | `vtiger_soshipads.ship_county` |
| Shipping Country | Country | text | No | NULL | user-entered | `vtiger_soshipads.ship_country` |
| Shipping Lot / Block | Lot/block numbers for the shipping address | text (×2) | No | none | user-entered | `vtiger_soshipads.shipping_lot`, `.shipping_block` |
| Shipping Name | Name at the shipping address | text | No | NULL | user-entered | `vtiger_soshipads.shipping_name` |
| Shipping Master Account | Denormalized account name/number for shipping | text | No | NULL | derived | `vtiger_soshipads.shipping_account` |
| Shipping Phone | Phone for the shipping contact | text | No | NULL | user-entered | `vtiger_soshipads.shipping_phone` |
| Shipping Email | Email for the shipping contact | text | No | none | user-entered | `vtiger_soshipads.shipping_email` |
| Shipping Fax | Fax for the shipping contact | text | No | NULL | user-entered | `vtiger_soshipads.shipping_fax` |
| Shipping Address Notes | Free-text delivery notes | text | No | NULL | user-entered | `vtiger_soshipads.shipping_notes` |
| Shipping Latitude / Longitude | Geocoded delivery coordinates | text (×2, numeric) | No | none | derived (geocoding) | `vtiger_soshipads.ship_latitude`, `.ship_longitude` |

### Deposit / ROA (Received-on-Account) Transaction

Three related tables: the transaction ledger itself, a per-order current-unapplied-balance cache,
and a per-application allocation record.

**Transaction Ledger** (`vtiger_roaoradj`) — 27 fields individually catalogued:

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Transaction ID | Primary key | text (identifier) | Yes | NULL | system-set | `vtiger_roaoradj.id` |
| Transaction Type | Coarse type (ROA/ADJ/Deposit/Gift Card/Return Deposit/Refund/Discount/Deferred) | enum | Yes | NULL | system-set | `vtiger_roaoradj.transtype`, `.searchtranstype` |
| Recorded By User | Employee who recorded the transaction | reference (to Employee/User) | Yes | NULL | system-set | `vtiger_roaoradj.user` |
| Account | Customer account the funds belong to | reference (to Account) | Yes | NULL | user-entered | `vtiger_roaoradj.accountid` |
| Job | Job the deposit is tied to | reference (to Job) | Yes | NULL | user-entered | `vtiger_roaoradj.jobid` |
| Amount | Transaction dollar amount | money | Yes | NULL | user-entered | `vtiger_roaoradj.amount` |
| Payment Method | How the funds were received (check, CC, cash, etc.) | enum | Yes | NULL | user-entered | `vtiger_roaoradj.paymentmethod` |
| Notes | Free-text notes on the transaction | text | Yes | NULL | user-entered | `vtiger_roaoradj.notes` |
| Date | Date the transaction was recorded | date | Yes | NULL | user-entered | `vtiger_roaoradj.date` |
| Location | Store/branch location the transaction was recorded at | reference (to Location) | Yes | 0 | system-set | `vtiger_roaoradj.locationid` |
| Unapplied Amount | Remaining amount of this transaction not yet applied to any SO | money | Yes | NULL | derived | `vtiger_roaoradj.unappliedamount` |
| Check Number | Check number, if paid by check | text | Yes | NULL | user-entered | `vtiger_roaoradj.checknumber` |
| Adjustment Type | Sub-classification of an adjustment-type transaction | number (code) | Yes | 0 | system-set | `vtiger_roaoradj.adjtype` |
| Print on Statement | Whether this transaction appears on the customer statement | boolean | Yes | 0 | system-set | `vtiger_roaoradj.printonstatement` |
| Expire Date | Expiration date (e.g. for a gift card) | date | No | NULL | user-entered/derived | `vtiger_roaoradj.expiredate` |
| Subtype | Finer classification: Deposit / Return Deposit / Gift Card / Refund | enum | Yes | NULL | system-set | `vtiger_roaoradj.subtype` |
| Deposit Type | Free-text deposit-type qualifier | text | No | none | user-entered | `vtiger_roaoradj.deposittype` |
| SO Sub-Status of Deposit | The SO sub-status this deposit is tied to | text | No | none | system-set | `vtiger_roaoradj.sosubstatusofdeposit` |
| Sales Order | The SO this transaction originated from | reference (to Sales Order) | Yes | NULL | system-set | `vtiger_roaoradj.salesorderid` |
| Gift Card Code | The gift card code, if subtype = Gift Card | text | Yes | NULL | user-entered | `vtiger_roaoradj.giftcardcode` |
| Account Number | Bank/card account number reference (masked/partial) | text | Yes | NULL | user-entered | `vtiger_roaoradj.accountnumber` |
| ROA Discount | Discount amount tied to this ROA transaction | money | Yes | 0.00 | derived | `vtiger_roaoradj.roadiscount` |
| Is Refund Deposit Adjustment | Whether this record is a refund-of-deposit adjustment | boolean | Yes | `No` | system-set | `vtiger_roaoradj.isrefunddepositadj` |
| Source of Creation | Which channel created the transaction (LBM app, mobile App, or an accepted contract flow) | enum | No | NULL | system-set | `vtiger_roaoradj.source_of_creation` |
| Is Contract Deposit | Whether this deposit is tied to a service contract | boolean | No | `no` | system-set | `vtiger_roaoradj.is_contract_deposit` |
| Memo Type / Memo Account | Bank memo classification fields for reconciliation | text (×2) | Yes | NULL each | system-set | `vtiger_roaoradj.memotype`, `.memoaccount` |
| Credit Applied to SO | Log/detail of how this credit was applied to SO(s) | text | Yes | NULL | system-set | `vtiger_roaoradj.creditappliedtoso` |
| *(not individually catalogued)* | A smaller remainder of columns (`qb_txnid`/`qb_editsequence`, `moneyreconciliationdate`/`id`, `adjlowerappliedtoso`, `discountrefroaid`, `bypass_cardno`, `banknumber`/`bankaccountnumber`, `inserted_datetime`, `link150`, `payment_ccp`/`payment_detail`, `sosubstatus_id_of_deposit`/`ref_sosubstatus_id_of_deposit`) following the same patterns as similarly-named columns above; not individually re-explained by source. | — | — | — | — | `vtiger_roaoradj.*` (group, not individually confirmed) |

**Per-SO Unapplied Balance** (`vtiger_salesorder_roa`) — 3 fields individually catalogued:

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Sales Order | The SO this balance belongs to (primary key) | reference (to Sales Order) | Yes | NULL | system-set | `vtiger_salesorder_roa.salesorderid` |
| Unapplied Amount | Current unapplied ROA amount for this SO | money | Yes | NULL | derived | `vtiger_salesorder_roa.unappliedamount` |
| Unapplied Credit | Current unapplied credit amount for this SO | money | Yes | NULL | derived | `vtiger_salesorder_roa.unappliedcredit` |

**Applied-Deposit Ledger** (`vtiger_salesorder_roadetails`) — 9 fields individually catalogued:

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Sales Order | The SO the funds were applied to (composite primary key with Applied SO Number) | reference (to Sales Order) | Yes | NULL | system-set | `vtiger_salesorder_roadetails.salesorderid` |
| Applied SO Number | The SO number the ROA transaction is recorded against/applied from | text (composite identifier) | Yes | NULL | system-set | `vtiger_salesorder_roadetails.appliedsonum` |
| Applied SO Transaction ID | Transaction id of the source ROA record | text (identifier) | Yes | NULL | system-set | `vtiger_salesorder_roadetails.appliedso_txnid` |
| Transaction Type | Type of the applied transaction | enum | Yes | NULL | system-set | `vtiger_salesorder_roadetails.txntype` |
| Applied Amount | Dollar amount applied | money | Yes | NULL | system-set | `vtiger_salesorder_roadetails.amount` |
| Remaining Amount | Amount remaining after this application | money | Yes | NULL | derived | `vtiger_salesorder_roadetails.remainingamount` |
| Subtype | Deposit / Return Deposit / Gift Card / Refund | enum | Yes | NULL | system-set | `vtiger_salesorder_roadetails.subtype` |
| Deposit Type | Free-text deposit-type qualifier | text | No | none | system-set | `vtiger_salesorder_roadetails.deposittype` |
| Created At | Timestamp the application record was created | datetime | Yes | CURRENT_TIMESTAMP | system-set | `vtiger_salesorder_roadetails.created_at` |

### Payment Record

Backed by `vtiger_sopayment` (18 fields individually catalogued).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Payment ID | Primary key | text (identifier) | Yes | auto_increment | system-set | `vtiger_sopayment.paymentid` |
| Sales Order | The SO this payment applies to | reference (to Sales Order) | Yes | NULL | system-set | `vtiger_sopayment.soid` |
| SO Number | Denormalized SO number | text | Yes | NULL | derived | `vtiger_sopayment.sonumber` |
| Payment Type | Method of payment (e.g. cash, check, card) | enum | Yes | NULL | user-entered | `vtiger_sopayment.paymenttype` |
| Amount | Payment dollar amount | money | Yes | NULL | user-entered | `vtiger_sopayment.amount` |
| Payment Number | Reference/confirmation number for the payment | text | Yes | NULL | user-entered/system-set | `vtiger_sopayment.paymentno` |
| Expiration Date | Card expiration date, if applicable | text | Yes | NULL | user-entered | `vtiger_sopayment.expdate` |
| Sell-Side Extended Amount | Portion of the payment attributable to "sell" price | money | Yes | 0.00 | derived | `vtiger_sopayment.sellextamt` |
| Core-Side Extended Amount | Portion of the payment attributable to core-charge | money | Yes | 0.00 | derived | `vtiger_sopayment.coreextamt` |
| Difference Amount | Rounding/reconciliation difference on the payment | money | Yes | NULL | derived | `vtiger_sopayment.diffamt` |
| Payment Mode | Whether the payment record is a Real transaction or a Split/Scheduled leg | enum | Yes | `S` | system-set | `vtiger_sopayment.paymentmode` |
| Subtype | Deposit / Return Deposit / Gift Card / Refund classification | enum | Yes | NULL | system-set | `vtiger_sopayment.subtype` |
| Update Date | Last-updated timestamp | datetime | No | NULL | system-set | `vtiger_sopayment.updatedate` |
| Distributed Misc SO Fee | Portion of the order's misc fee allocated to this payment | money | No | 0.00 | derived | `vtiger_sopayment.distmiscsofee` |
| Apply Return Credit | Whether a return credit was applied via this payment | boolean | Yes | `No` | user-entered | `vtiger_sopayment.apply_return_credit` |
| Payment Type (gateway) | Which payment gateway processed this payment (Expinet/CIP/CardConnect/Priority Payment/other) | enum | No | NULL | system-set (integration) | `vtiger_sopayment.payment_type` |
| Payment Reference ID | Id of the linked gateway transaction record | reference (to Card Transaction) | Yes | 0 | system-set | `vtiger_sopayment.payment_ref_id` |
| Payment Detail (Priority Payment) | Detail payload from the Priority Payment gateway | array | No | NULL | system-set (integration) | `vtiger_sopayment.pp_payment_detail` |
| *(not individually catalogued)* | `bypass_cardno`, `moneyreconciliationdate`/`moneyreconciliationid` follow the same patterns described for other tables; not re-explained individually. | — | — | — | — | `vtiger_sopayment.*` (group, not individually confirmed) |

### Card Transaction (ChargeItPro)

Two legacy tables with identical field shapes: one keyed directly to a Sales Order, one keyed to a
Deposit/ROA transaction — a strong candidate for consolidation into one polymorphic entity, since
the two legacy shapes are confirmed field-identical (15 fields individually catalogued on the
direct-to-SO table).

**Direct-to-SO** (`vtiger_salesorder_chargeitpro`):

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| ID | Primary key | text (identifier) | Yes | auto_increment | system-set | `vtiger_salesorder_chargeitpro.id` |
| User | Employee who ran the card transaction | reference (to Employee/User) | Yes | NULL | system-set | `vtiger_salesorder_chargeitpro.user_id` |
| Sales Order | SO the card transaction applies to | reference (to Sales Order) | Yes | NULL | system-set | `vtiger_salesorder_chargeitpro.salesorderid` |
| SO Number | Denormalized SO number | text | Yes | NULL | derived | `vtiger_salesorder_chargeitpro.salesorder_no` |
| Transaction Type | Sale/refund/void, etc., per the gateway | enum | Yes | NULL | system-set (integration) | `vtiger_salesorder_chargeitpro.transactionType` |
| Masked Account | Masked card number | text | Yes | NULL | system-set (integration) | `vtiger_salesorder_chargeitpro.maskedAccount` |
| Card Type | Card brand (Visa/MC/etc.) | text | Yes | NULL | system-set (integration) | `vtiger_salesorder_chargeitpro.accountCardType` |
| Amount Total | Charged amount | money | Yes | NULL | system-set | `vtiger_salesorder_chargeitpro.amountTotal` |
| Approval Number | Gateway approval/auth code | text | Yes | NULL | system-set (integration) | `vtiger_salesorder_chargeitpro.approvalNumber` |
| Billing Name | Name on the card | text | Yes | NULL | user-entered | `vtiger_salesorder_chargeitpro.billingName` |
| Result Status | Success/decline/error status from the gateway | enum | Yes | NULL | system-set (integration) | `vtiger_salesorder_chargeitpro.resultStatus` |
| Unique Transaction ID | Gateway's transaction id | text (identifier) | Yes | NULL | system-set (integration) | `vtiger_salesorder_chargeitpro.uniqueTransId` |
| Signature URL | Link to the captured signature image | text | Yes | NULL | system-set | `vtiger_salesorder_chargeitpro.signatureURL` |
| Source of Creation | LBM system vs. mobile App | enum | Yes | `LBM` | system-set | `vtiger_salesorder_chargeitpro.source_of_creation` |
| Created Time | Timestamp of the transaction | datetime | Yes | NULL | system-set | `vtiger_salesorder_chargeitpro.createdtime` |

**Linked-to-ROA variant** (`vtiger_salesorder_chargeitpro_roaoradj`) — same 15 fields as above
(field-identical to the direct-to-SO table per source), but keyed by a reference to the Deposit/ROA
Transaction entity instead of the Sales Order, plus one additional field not present on the
direct-to-SO table:

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Deposit/ROA Transaction (in place of Sales Order above) | The Deposit/ROA transaction this card transaction applies to | reference (to Deposit/ROA Transaction) | Yes | NULL | system-set | `vtiger_salesorder_chargeitpro_roaoradj.roaoradj_id` |
| Account Number | Bank/account number (nullable) | text | No | NULL | system-set (integration) | `vtiger_salesorder_chargeitpro_roaoradj.accountNumber` |

### Finalization Record

Backed by `vtiger_sofinalizedata`, 1:1 with the header (9 fields individually catalogued).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Sales Order | The SO this finalize snapshot belongs to (1:1 primary key) | reference (to Sales Order) | Yes | NULL | system-set | `vtiger_sofinalizedata.salesorderid` |
| Delivery Preference | Delivery preference locked in at finalize time | text | No | NULL | system-set (from user-entered value) | `vtiger_sofinalizedata.deliverypreference` |
| Target Time | Target delivery/service time at finalize | datetime | No | NULL | system-set | `vtiger_sofinalizedata.targettime` |
| Minimum Time | Earliest acceptable delivery/service time | datetime | No | NULL | system-set | `vtiger_sofinalizedata.minimumtime` |
| Maximum Time | Latest acceptable delivery/service time | datetime | No | NULL | system-set | `vtiger_sofinalizedata.maximumtime` |
| Customer PO | Customer PO number as of finalize | text | No | NULL | system-set (copied) | `vtiger_sofinalizedata.customerpo` |
| Total Freight | Freight total locked in at finalize | money | No | NULL | system-set | `vtiger_sofinalizedata.totalfreight` |
| Total Labor | Labor total locked in at finalize | money | No | NULL | system-set | `vtiger_sofinalizedata.totallabor` |
| Finalize Time | Timestamp the order was finalized | datetime | No | NULL | system-set | `vtiger_sofinalizedata.sofinalizetime` |

### Status History Event

Backed by `vtiger_sostatushistory` (6 fields individually catalogued). This table exists and is
read by module code but is empty (0 rows) in the live system, with no confirmed write path —
carried forward as a legitimate concept needing an actual write path.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| History ID | Primary key | text (identifier) | Yes | auto_increment | system-set | `vtiger_sostatushistory.historyid` |
| Sales Order | The SO this status event belongs to | reference (to Sales Order) | Yes | NULL | system-set | `vtiger_sostatushistory.salesorderid` |
| Account Name | Snapshot of the account name at the time of the status change | text | No | NULL | derived (snapshot) | `vtiger_sostatushistory.accountname` |
| Total | Snapshot of the order total at the time of the status change | money | No | NULL | derived (snapshot) | `vtiger_sostatushistory.total` |
| Status | The status value being recorded | enum | No | NULL | system-set | `vtiger_sostatushistory.sostatus` |
| Last Modified | Timestamp of the status change | datetime | No | NULL | system-set | `vtiger_sostatushistory.lastmodified` |

### Backorder / Buyout / Stock-Transfer Resolution

Backed by `vtiger_sopopupvalues`, keyed to a specific SO + line number (18 fields individually
catalogued).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Popup Row ID | Primary key | text (identifier) | Yes | auto_increment | system-set | `vtiger_sopopupvalues.sopopupid` |
| Sales Order | The SO this resolution row belongs to | reference (to Sales Order) | Yes | NULL | system-set | `vtiger_sopopupvalues.soid` |
| Popup Unique ID | Unique id correlating this row to a specific popup interaction | text (identifier) | No | none | system-set | `vtiger_sopopupvalues.so_popup_unique_id` |
| Line Number | The SO line number this resolution applies to | number | Yes | NULL | system-set | `vtiger_sopopupvalues.linenumber` |
| Account / Vendor | The account and/or vendor involved in the buyout | reference (to Account) / reference (to Vendor) | Yes | NULL each | system-set | `vtiger_sopopupvalues.accountid`, `.vendorid` |
| Buyout Cost / Buyout Core Cost | Cost to buy the item out from a vendor (part and core portions) | money (×2) | Yes | 0 each | derived | `vtiger_sopopupvalues.buyoutcost`, `.buyoutcorecost` |
| Product | The product being resolved | reference (to Product) | Yes | NULL | system-set | `vtiger_sopopupvalues.productid` |
| Product Qty | Quantity being resolved | number | Yes | 0 | system-set | `vtiger_sopopupvalues.productqty` |
| Do Not Merge | Prevents this row from merging with another backorder row | boolean | Yes | 0 | user-entered | `vtiger_sopopupvalues.donotmerge` |
| Buyout Type | Classification of the buyout | enum | Yes | NULL | system-set | `vtiger_sopopupvalues.botype` |
| Total Buy Qty / Qty Not Received | Ordered vs. still-outstanding buyout quantity | number (×2) | Yes | 0 each | derived | `vtiger_sopopupvalues.totalbuyqty`, `.qtynotreceived` |
| Buyout PO Number | The generated PO number for the buyout | text | No | NULL | system-set | `vtiger_sopopupvalues.boponum` |
| Buyout Payment Method | Payment method for the buyout PO | text | Yes | NULL | user-entered | `vtiger_sopopupvalues.bopaymentmethod` |
| Stock-Transfer From Location | Source location for a stock transfer resolution | reference (to Location) | Yes | NULL | system-set | `vtiger_sopopupvalues.stfromlocation` |
| Stock-Transfer Number | The generated stock-transfer document number | text | No | NULL | system-set | `vtiger_sopopupvalues.stnum` |
| ST Printed / ST Created | Whether the stock-transfer document has been printed/created | boolean (×2) | Yes | `No` each | system-set | `vtiger_sopopupvalues.stprinted`, `.stcreated` |
| Delivery Method | How the buyout item will be delivered (will-pick, vendor-will-deliver, drop-ship, expedite, install-sales-drop-ship) | enum | No | NULL | user-entered | `vtiger_sopopupvalues.bo_deliver` |
| PO Status | Status of the generated buyout/backorder PO | enum | No | NULL | system-set | `vtiger_sopopupvalues.po_status` |
| *(not individually catalogued)* | Roughly 15 additional columns (`uni_deliverycode`, `st_allow_inv`, `venaddressid`, `uni_location`, `auto_receive_st`, `aconnexinfoid`, `bopo_so_map_id`, `updatealc`, `bopocomments`/`bostcomments`, `bopoepid`, `st_status`, `addtocblfrmbo`, `rowbackordernow`, `uomjsondata`, `sellexistinginventory`) following the buyout/stock-transfer/UOM patterns above; not individually re-confirmed against a code citation. | — | — | — | — | `vtiger_sopopupvalues.*` (group, not individually confirmed) |

## Known Gaps

- **Two supporting legacy concepts are deliberately excluded from the Entity List above.** A
  generic record-sharing/group-assignment mechanism (`vtiger_sogrouprelation` — standard vtiger CRM
  plumbing used by every module, not SalesOrder-specific business data) and a pre-save JSON audit
  snapshot (`vtiger_soserializeddata` — a full-record snapshot taken immediately before every save,
  used for change-tracking, not something a user would think of as "part of the order," and slated
  to be superseded by proper audit/event infrastructure at the platform level). Both are real,
  populated legacy tables keyed to a Sales Order; they are omitted here as a deliberate scoping
  decision inherited from the source documents, not an oversight.

- **"Docket Amount" is a genuine field-coverage gap in the source itself.** It is used extensively
  as a real, heavily-gated business field in validation rules and the pricing pipeline elsewhere in
  this module's spec, but has **no corresponding entry anywhere in the source field catalog**
  (`blueprint/module/SalesOrder/01-entities-fields.md`). Because it was never catalogued there, it
  is deliberately **not** given a row in any table above — inventing a placeholder row for it would
  misrepresent the source. Business meaning (per the source's own note): the target invoice/docket
  total an order's pricing should round to. Whether it is a persisted column or a purely transient
  calculation input was not confirmed by either source file.

- **Fields whose business meaning is marked "unclear" inline above** (carried forward verbatim from
  the source, not resolved into a guess):
  - Header: Vendor Terms and Vendor (unconfirmed scope of "vendor"); Order Type vs. Order Type
    (internal) (relationship between `.type` and `.ordertype` unconfirmed); Customer OSF # ("OSF"
    unexpanded); Customer PO Number (alt) vs. Customer PO # (possible duplicate, unconfirmed);
    Merged-Up Flag (unconfirmed trigger semantics); RO Job Hat (no UI label, meaning inferred from
    name only); Due Term (relationship to Terms/Term Due Date unconfirmed); Custom 2 (Forceman)
    (not a confidently definable business term); SO Discount Frequency (no code citation beyond the
    column name); Web Opt-In / Text Preference (`woptintedpt` abbreviation unconfirmed); CCC
    Invoice Sent ("CCC" unexpanded); INI Description and INI Reference ID ("INI" unexpanded); Time
    Range (numeric code, no lookup table found); Contact (secondary) (exact distinction from
    Contact unconfirmed).
  - Header Extension: Allocate Inventory (custom) (relation to header Allocate Inventory
    unconfirmed — likely legacy duplication); CA Order ID ("CA" unexpanded); Line Employee (no UI
    label, meaning inferred from name only); PT Data (no UI label, possibly Payment Terms or Print
    Ticket data, unconfirmed).
  - Line Item: Legacy/Generic ID vs. Line Item ID (`.id` vs. `.iprid` — a probable schema-merge
    artifact from the generic `vtiger_inventoryproductrel` design this table was forked from;
    relationship unconfirmed); Comment (location-specific) vs. Comment (exact distinction
    unconfirmed).
  - Note: CN Number ("CN" = Credit Note) and OASN Status (Order-Acknowledgement/Ship-Notice) have
    their abbreviations *inferred* by the source with reasonable confidence and are **not** flagged
    as open questions there — they are listed for completeness above but are not part of this gap
    list.

- **~95 fields are grouped rather than individually itemized** in the source, not itemized here
  either, per explicit source discipline (fabricating individual rows for a merely-plausible column
  name was ruled out): roughly 80 columns on the Line Item entity (unit-of-measure conversion,
  product-variant, kit-grouping, RGN/return, and cost-of-goods-sold mechanics) and roughly 15
  columns on the Backorder/Buyout/Stock-Transfer Resolution entity (buyout/stock-transfer/UOM
  mechanics). Both are flagged in the source as needing a dedicated follow-up deep-dive pass given
  the Line Item entity's size (118 columns total) and centrality to pricing/tax/kit/fulfillment
  logic.

- **No field in either source file could be confidently matched to a *wrong* or *ambiguous* legacy
  column** during this pass — every Legacy Trace entry above cites a specific `table.column` pulled
  directly from `blueprint/module/SalesOrder/01-entities-fields.md` §2.1–§2.10. Nothing required the
  fallback "column name not individually re-confirmed" phrasing at the individual-field level; the
  only citations left at the table-level (not per-column) are the explicitly-grouped column bundles
  listed above, which the source itself never itemized column-by-column.
