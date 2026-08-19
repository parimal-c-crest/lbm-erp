# Location — Entities & Fields

> Every entity, every field, individually. No grouping/summarizing — that's how fields get lost.
> Legacy table/column names are a first-class column in the field catalog below, not an optional
> footnote — this project's whole documentation discipline rests on every claim being traceable to
> a specific source, and a footnote is too easy to skip. See
> `_deviations-from-original-template.md` in this folder.

Source: `blueprint/module/Location/01-entities-fields.md` (full legacy-schema traceability) via
`docs_from_blueprint/module/Location/02-entities-and-fields.md`. Where the source blueprint itself
grouped near-identical columns rather than itemizing them (the ~97-column GL-account-mapping family
in Location Accounting Configuration), that grouping is preserved here with the full legacy column
list folded into the Legacy Trace cell, per this module's own precedent set by the source blueprint —
not a summarization introduced in this document. Every other row below is one field, one row.

## Governing architectural requirements (forward-looking, not legacy observation)

The source blueprint's implementation plan establishes decisions that shape the data model itself,
restated here as requirements for any new implementation:

- **R1 — Product-at-Location must be a first-class entity with its own identity and audit trail.**
  The legacy `vtiger_locationcf` table has no independent identity of its own — it shares the parent
  branch's `locationid` and is disambiguated only by an additional `cf_1472` (product id) parameter
  threaded through every controller, and has zero native soft-delete, audit-trail, or record-sharing
  mechanism despite being 72,104 rows of business-critical data.
- **R2 — Quantity-on-hand can never be persisted below zero.** All four legacy write paths into
  `cf_840` (Qty Onhand) lack a non-negative floor check (see `business-rules-and-validation.md`).
- **R3 — A kit product's available quantity is always computed from component quantities, never an
  independently-tracked number.** The legacy "kit" QoH-adjustment endpoint performs zero
  kit-component propagation despite its name.
- **R4 — Part Superseded (`cf_892`) is a first-class domain event.** The legacy system's one real,
  one-way lifecycle transition is independently re-filtered by six consumer contexts across four
  modules instead of publishing one shared event.
- **R5 — Every entity is scoped to a tenant** (multi-tenant platform-level requirement, carried
  forward explicitly rather than silently assumed).
- **R6 — Payment-gateway/vendor-integration credentials are Location-scoped but never stored as
  plaintext on the core branch-identity record.** The legacy `vtiger_location` header stores CIPW,
  CIP-EP, TecOrder, and branch-mailbox credentials as plaintext columns directly on the branch row.
- **R7 — The per-branch GL-account mapping is a normalized (transaction-type, account-code)
  structure, not a column-per-transaction-type schema.** The legacy `vtiger_location_accounting`
  table encodes ~97 near-duplicate columns, one per transaction/account type, across two downstream
  accounting systems (Traverse, QuickBooks).

## Entity List

| Entity | Purpose |
|---|---|
| Location (Branch/Store Header) | The physical branch/warehouse/store record: identity, document-numbering prefixes, address(es), branch-level tax rates, per-branch email/print/POS/WMS configuration, payment/integration credentials. 7 live rows on the source blueprint's dev database. |
| Location Accounting Configuration | One branch's 1:1 mapping of every SO/PO/inventory/payment transaction type to a GL account code in two downstream accounting integrations (Traverse and QuickBooks). Pure admin-config table, not managed by this module's own CRUD code. |
| Product-at-Location (QoH, Cost & Reorder Detail) | One product's quantity-on-hand, bin/shelf/zone location, cost history, reorder thresholds, demand-forecast formula outputs, sales-history rollups, and part-supersession configuration, at one specific branch. 72,104 rows — the module's largest and highest-stakes entity, rendered/edited only from within the Products module. |
| Location Group | Standard CRM record-sharing "group" assignment for a branch — generic platform infrastructure, not Location-specific business meaning. |
| Location Pass-On Field Configuration | A per-**product** (not per-branch) list of which Product-at-Location field names should be copied into a new superseding product's location rows when that product is marked superseded. |
| Role-Location Assignment | Which CRM security roles are permitted at which branches, plus two per-role/per-branch POS session-timeout settings. Owned/managed by Settings-area admin screens, not by this module's own code. **Not redesigned as part of this module's own specification** (see `module-overview.md` Scope). |
| Default-Location Picklist | A 2-row system picklist enumerating the two contexts a "default location" concept can apply to ("User Location", "Account Default Location") — backs a picklist field defined elsewhere, not a per-record data table of its own. |
| User-Location Tracking | A per-user, per-day log of which branch a user was clocked into/working at. Genuinely Location-domain data, but entirely owned and managed by the Users module's own code. **Not redesigned as part of this module's own specification.** |
| *Product Kit Component (interface reference only)* | Not owned by Location — modeled only because the kit-quantity requirement (R3) depends on it: which component products, and what quantity of each, make up a kit product. Owned by the Products module; queried read-only, never joined directly. |

**Ownership note.** A grep across every file in this module for thirteen candidate cross-module table
names sharing a "location" naming pattern (SalesTarget, WMS put-away-tote allocation, BOM, MPL
pricing, TecOrder vendor-integration tables) returned zero matches — none are owned by this module
despite the naming resemblance. Three files in this module's own directory
(`CallRelatedList.php`/`LoadList.php`/`updateRelations.php`) reference zero Location-owned tables —
copy-pasted generic Campaigns-relation boilerplate, not genuine Location logic; whether they are truly
dead or an orphaned-but-still-routed path was never confirmed.

**Relationship summary.** A Location Branch has exactly one Location Accounting Configuration row
(1:1, `vtiger_location_accounting.locationid` = `vtiger_location.locationid`), zero or more
Product-at-Location detail rows (`vtiger_locationcf.locationid` = branch FK, `.cf_1472` = product FK),
zero or more Role-Location assignments, zero or more Group assignments, and zero or more
User-Location tracking entries keyed by branch **name** rather than a stable identifier (a confirmed
schema-drift finding — see Known Gaps). A Product-at-Location row can reference another
Product-at-Location row at the *same* branch as its supersession target (`.cf_896`, a product-number
string, not a foreign key). Location Pass-On Field Configuration is keyed by product alone,
independent of any specific branch.

## Field Catalog

### Location (Branch/Store Header)

7 live rows on the source blueprint's dev database. Only **one** of this entity's ~100 columns
(Location Name) has a CRM-managed field label — every other column is admin-configured through
Settings-area screens outside the standard field-registration pipeline.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Location ID | Primary key (also the shared crmentity id for this branch) | identifier | Yes | auto_increment | system-set | `vtiger_location.locationid` |
| Location Name | The branch's display name | text | Yes | NULL | user-entered | `vtiger_field` 832 "Location Name"; `vtiger_location.locationname` |
| Store Alias | Meaning unclear — no UI label, no confirmed code usage | number | No | NULL | unclear | `vtiger_location.store_alias` |
| Display Sequence | Sort/display order for this branch in location pickers/lists | number | No | NULL | system-set | `vtiger_location.sequence` |
| Timezone | The branch's local timezone | text | Yes | NULL | user-entered | `vtiger_location.timezone` |
| SO Number Prefix | Prefix used when auto-numbering Sales Orders created at this branch | text | Yes | `S` | user-entered | `vtiger_location.soinitials` |
| PO Number Prefix | Prefix used when auto-numbering Purchase Orders created at this branch | text | Yes | `P` | user-entered | `vtiger_location.poinitials` |
| Quote Number Prefix | Prefix used when auto-numbering Quotes created at this branch | text | Yes | `Q` | user-entered | `vtiger_location.quoteinitials` |
| Invoice Number Prefix | Prefix used when auto-numbering Invoices created at this branch | text | Yes | `I` | user-entered | `vtiger_location.invoiceinitials` |
| Estimate Number Prefix | Prefix used when auto-numbering Estimates created at this branch | text | No | `ES` | user-entered | `vtiger_location.estimateinitials` |
| PO Receipt Number Prefix | Prefix used when auto-numbering PO Receipts created at this branch | text | No | `R` | user-entered | `vtiger_location.poreceiptinitials` |
| External Store ID | Meaning unclear — name suggests an integration-facing store id, not confirmed | text | Yes | `''` | unclear | `vtiger_location.fblocstoreid` |
| Street | Physical address street line | text | Yes | NULL | user-entered | `vtiger_location.street` |
| Street 2 | Physical address line 2 | text | Yes | NULL | user-entered | `vtiger_location.street2` |
| City | Physical city | text | Yes | NULL | user-entered | `vtiger_location.city` |
| State | Physical state | text | Yes | NULL | user-entered | `vtiger_location.state` |
| Zip | Physical zip code | text | No | NULL | user-entered | `vtiger_location.zip` |
| SO Street / SO Street 2 / SO City / SO State / SO Zip | Address used specifically on Sales Order documents (may differ from physical address) | text (x5) | No | NULL each | user-entered | `.so_street` / `.so_street2` / `.so_city` / `.so_state` / `.so_zip` |
| Billing Street / Billing Street 2 / Billing City / Billing State / Billing Zip | Address used on billing/statement documents | text (x5) | No | NULL each | user-entered | `.bill_street` / `.bill_street2` / `.bill_city` / `.bill_state` / `.bill_zip` |
| Phone | Branch phone number | text | No | NULL | user-entered | `vtiger_location.phone` |
| Fax | Branch fax number | text | No | NULL | user-entered | `vtiger_location.fax` |
| State Tax Rate | Branch-level state sales-tax rate applied to orders at this branch | number(%) | Yes | NULL | user-entered | `vtiger_location.tax_state` |
| Local Tax Rate | Branch-level local sales-tax rate | number(%) | Yes | NULL | user-entered | `vtiger_location.tax_local` |
| Silo Tax Rate | Branch-level silo tax rate | number(%) | Yes | NULL | user-entered | `vtiger_location.tax_silo` |
| Tax-Authority-Code Basis Enabled | Whether tax for this branch is instead computed from a Tax Authority Code lookup | boolean | Yes | `no` | user-entered | `vtiger_location.tax_based_tac_status` |
| Tax Authority Code | The Tax Authority Code id used when the TAC basis is enabled | reference | Yes | `0` | user-entered | `vtiger_location.tax_based_tac_code` |
| Shop Parts Tax Rate | Tax rate applied to the "shop parts"/miscellaneous-supply fee at this branch | number(%) | Yes | NULL | user-entered | `vtiger_location.tax_shopparts` |
| Shop Parts Fee Minimum | Minimum dollar amount for the shop-parts fee | money | Yes | NULL | user-entered | `vtiger_location.shoppartsmin` |
| Shop Parts Fee Maximum | Maximum dollar amount for the shop-parts fee | money | Yes | NULL | user-entered | `vtiger_location.shoppartsmax` |
| Shop Parts Fee Basis | What the shop-parts fee percentage is calculated against | enum | No | `L` | user-entered | `vtiger_location.apply_shoppart_on` |
| EOD Starting Drawer Amount | Default starting cash-drawer amount for end-of-day/register reconciliation | money | No | `200.00` | user-entered | `vtiger_location.eodstartingdraweramt` |
| Floating Drawer | Whether this branch uses a shared/floating cash drawer rather than one fixed per register | boolean | Yes | NULL | user-entered | `vtiger_location.floatingdrawer` |
| Distribution-Center Location | Flags this branch as a distribution-center/warehouse-only location — inferred from name only, not independently confirmed | boolean | Yes | `0` | unclear | `vtiger_location.dclocation` |
| Default Invoice Print Copies | Default number of invoice copies printed at this branch | number | Yes | `2` | user-entered | `vtiger_location.invoiceprintcopies` |
| Core Taxable / Core Return Taxable / Never Tax Core Returns / Always Tax Cores | Branch-level tax treatment of core charges and core-charge returns | boolean (x4) | varies | varies | user-entered | `.coretaxable` / `.corereturntaxable` / `.nevertaxcoresreturn` / `.alwaystaxcores` |
| Fuse5Connect Module Visible / Sharing Visible / Sub ID / Access Key | Fuse5Connect integration visibility flags and credentials for this branch | boolean/text (x4) | Yes | varies | system-set (integration) | `.fuse5connect_module_visible` / `.fuse5connect_sharing_visible` / `.fuse5connect_sub_id` / `.fuse5connect_access_key` |
| POS Popup | Meaning unclear — no UI label, no confirmed code usage | number | No | NULL | unclear | `vtiger_location.m_popup` |
| General Statement Comment | Default free-text comment shown on statements generated for this branch | text | Yes | NULL | user-entered | `vtiger_location.general_stmt_comment` |
| Print Type | Meaning unclear — likely a print-format/layout selector, not confirmed | text | Yes | `1` | unclear | `vtiger_location.print_type` |
| PO / ROA Adjustment / Store Transfer / Quote / Pick Ticket / Label / Packing Slip / COD Print Copies | Default print-copy counts per document type at this branch | number (x8) | Yes | `1`-`2` each | user-entered | `.invoiceprintcopies_po` / `.invoiceprintcopies_roaadj` / `.invoiceprintcopies_st` / `.invoiceprintcopies_qt` / `.invoiceprintcopies_pt` / `.invoiceprintcopies_label` / `.invoiceprintcopies_ps` / `.invoiceprintcopies_cod` |
| SO From-Email / Notification From-Email / CardConnect SO From-Email / PO From-Email / Statement From-Email / Quote From-Email / Bid From-Email | Outbound "from" email addresses used per document type when emailed from this branch | text (x7) | varies | varies | user-entered | `.fromemail_so` / `.fromemail_notification` / `.cardconnect_fromemail_so` / `.fromemail_po` / `.fromemail_stmt` / `.fromemail_qt` / `.fromemail_bid` |
| Default SO / Quote / Worksheet / Repair / PO General Comment | Default free-text comments auto-populated on new records of each type at this branch | text (x5) | Yes | NULL each | user-entered | `.loc_sogencmt` / `.loc_quotecmt` / `.loc_worksheetcmt` / `.loc_repaircmt` / `.loc_pogencmt` |
| Location Type | Classification of this branch (e.g. "Parts") | enum | Yes | `Parts` | user-entered | `vtiger_location.location_type` |
| Allowed IP List | IP address allow-list restricting login/access to this branch | text | No | NULL | user-entered | `vtiger_location.allow_ip` |
| Allowed Store-Transfer Locations | List of other branches this branch is permitted to Store-Transfer to/from | text | No | NULL | user-entered | `vtiger_location.allow_st_loc` |
| Sell-Price Warning / Zero Sell-Price Warning / Cost-Price Warning | Whether warnings are shown when entering a price below a threshold, or a zero sell price, at this branch | enum/boolean (x3) | varies | varies | user-entered | `.sellpricewarning` / `.zero_sell_price_warning` / `.costpricewarning` |
| Default Auto-Receive Store Transfer / Auto-Receive Inbound Store Transfer | Default and actual settings for whether Store Transfers are auto-received at this branch | number/boolean | No | varies | user-entered | `.def_auto_receive_st` / `.auto_receive_inbound_st` |
| Track Outbound Sales History / Track Return Gross Profit / Takes Deposits | Branch-level policy toggles | enum/boolean (x3) | Yes | varies | user-entered | `.trackoutboundsh` / `.trackreturngp` / `.takesdeposits` |
| Print Pick Ticket on Quick COD / for New Web Order | Whether pick tickets auto-print for Quick COD/new web orders at this branch | enum/boolean (x2) | Yes/No | varies | user-entered | `.printPickticket_in_quickCOD` / `.printpickticketfornewweborder` |
| Store-Transfer Pricing Basis (plus From/Other variants) | Basis used for Store Transfer pricing depending on this branch's role in the transfer | enum/text (x3) | varies | `CC`/NULL | user-entered | `.stpricebasedon` / `.fromstpricebasedon` / `.otherstpricebasedon` |
| PO-Needed Alert on Account Select | Whether an alert fires when selecting an account that needs a PO number | boolean | Yes | `No` | user-entered | `vtiger_location.needpoalertonaccountselect` |
| Pick Ticket Sort Order / Sort Order 2 / Main Sort By | Column sequence used to sort pick-ticket line items at this branch | text (x3) | Yes | preset defaults | user-entered | `.pickticketsortorder` / `.pickticketsortorder2` / `.pickticketmainsortby` |
| Location Title / SO Location Title / Billing Location Title | Display titles used on general/SO/billing documents for this branch | text (x3) | varies | NULL | user-entered | `.locationtitle` / `.so_locationtitle` / `.bill_locationtitle` |
| SO Contact First/Middle/Last Name | Default SO contact person name for this branch | text (x3) | No | NULL | user-entered | `.so_contactperson_firstname` / `.so_contactperson_middlename` / `.so_contactperson_lastname` |
| Print Location Title on PO / on PO Billing | Whether the location title prints on Purchase Orders / PO billing documents | boolean (x2) | Yes | `No` | user-entered | `.loctitle_printpo` / `.loctitle_printpobill` |
| Save Top PPV | Meaning unclear — name suggests saving a "top PPV" (purchase-price-variance?) value, not confirmed | boolean | Yes | `No` | unclear | `vtiger_location.savetoppv` |
| Store-Transfer Receiving Backorder/Cancel Default | Default resolution (backorder vs. cancel) when receiving a Store Transfer short at this branch | text | Yes | NULL | user-entered | `vtiger_location.st_rec_backorder_cancel` |
| Require POS Save-as-Pending | Whether POS transactions at this branch must be saved as pending before completing | boolean | Yes | `No` | user-entered | `vtiger_location.requireposaveaspending` |
| POS "CP" Toggle / List | Meaning unclear — abbreviation "CP" not expanded, no confirmed code usage | enum/text (x2) | varies | NULL | unclear | `.pos_cp_toggle` / `.pos_cp_list` |
| Estimator List | List of estimators assigned to this branch | text | Yes | NULL | user-entered | `vtiger_location.estimator_list` |
| Delivery-Method Override | Overrides the system default delivery method for orders at this branch | text | Yes | NULL | user-entered | `vtiger_location.overridedefadeliverymethod` |
| Default Accounting Price-Level ID / Default Job Template/Price-Level ID | Plausibly-named default ids applied at this branch — inferred from column name only, not independently confirmed | reference (x2) | Yes | NULL | unclear | `.defacctplid` / `.defjobtplid` |
| CIPW Status / Merchant Name / Merchant Key / Configuration ID | ChargeItPro Wireless payment-gateway enablement and credentials for this branch | text (x4) | varies | varies | unclear/system-set (integration) | `.cipw_status` / `.cipw_merchantname` / `.cipw_merchantkey` / `.cipw_configurationid` |
| CIP-EP OID / Auth Token | ChargeItPro EmergePay payment-gateway credentials for this branch | text (x2) | Yes | NULL | unclear/system-set (integration) | `.cip_ep_oid` / `.cip_ep_auth_token` |
| Corcshiptocode / Gcomshiptocode | "Ship-to code" fields for two unidentified integration partners | text (x2) | No | NULL | unclear | `.corcshiptocode` / `.gcomshiptocode` |
| Branch Mailbox User ID / User / Password | Credentials for a branch-specific email-integration mailbox — exact integration not confirmed | text (x3) | No | NULL | system-set (integration) | `.locmailuid` / `.locmailuser` / `.locmailpass` |
| Statement Email CC Self | Whether the statement from-email address is also CC'd on outbound statements | boolean | Yes | `Yes` | user-entered | `vtiger_location.fromemail_stmt_ccemail` |
| TecOrder Username / Password / Buyer ID | Credentials for the TecOrder vendor-ordering integration at this branch — consuming code never located | text (x3) | No | NULL | system-set (integration) | `.tecorderuname` / `.tecorderpass` / `.tecorderbuyid` |
| Statement Comment (branch-level) | A second statement-comment-shaped field alongside "General Statement Comment" — distinction not confirmed | text | Yes | NULL | unclear | `vtiger_location.statementcomment` |
| Default Line Code | Default product line-code applied to new products/orders at this branch | text | No | NULL | user-entered | `vtiger_location.defaultlinecode` |
| Tax Detail | Free-text tax detail/note for this branch | text | Yes | NULL | user-entered | `vtiger_location.tax_detail` |
| Default Out-of-Stock Option / Default Catalog Out-of-Stock Option | Default behavior (backorder/cancel/quote-it) when an ordered product is out of stock, generally and for the B2B/catalog channel specifically | enum (x2) | No | varies | user-entered | `.default_out_of_stock_option` / `.default_catalog_out_of_stock_option` |
| Default Store-Transfer Source Location | Default branch used as the source when creating a Store Transfer into this branch | reference | No | NULL | user-entered | `vtiger_location.default_st_from_location` |
| Display Warehouse Inventory at POS / Show Current Transfer-Availability | Whether warehouse-level inventory/current transfer-availability figures are shown at the POS for this branch | boolean (x2) | Yes | varies | user-entered | `.display_wh_inv_at_pos` / `.wh_show_curr_ta` |
| Warehouse Location ID | The branch id designated as this branch's associated "warehouse" location — inferred, not confirmed as a self-reference vs. a different id space | reference | Yes | NULL | unclear | `vtiger_location.wh_location_id` |
| Misc Tax Setting Enabled / Label / Rate | Whether a miscellaneous tax applies at this branch, and its label/rate | boolean/text/number (x3) | varies | varies | user-entered | `.misctaxsetting` / `.misctaxlabel` / `.misctaxrate` |
| Store-Transfer Priority Picking / Receiving Cost Basis | Store-Transfer configuration for this branch's role as source/destination | text (x2) | No | NULL | user-entered | `.st_priority_picking` / `.receiving_st_cost` |
| WMS-Managed Location / Zone Source | Whether this branch's inventory is managed via the WMS put-away/pick-list system, and whether bin/zone data is sourced from WMS | boolean (x2) | No | `No` each | user-entered | `.wmslocation` / `.zonesource` |
| Misc SO Fee Taxable | Whether the miscellaneous SO fee is taxable at this branch | boolean | Yes | `0` | user-entered | `vtiger_location.miscsofeetax` |
| DC Tax | Meaning unclear — likely a distribution-center-specific tax flag paired with Distribution-Center Location, not confirmed | boolean | No | `0` | unclear | `vtiger_location.dc_tax` |
| Prevent Store-Transfer Pick Ticket / Global Reorder Numbering | Whether pick tickets are suppressed for Store Transfers, and whether this branch participates in cross-branch reorder numbering | boolean (x2) | Yes | `No` each | user-entered | `.prevent_st_pick_tick` / `.global_reorder_no` |
| Location Logo | Path/filename of this branch's uploaded logo image, used on printed documents | text | No | NULL | user-entered | `vtiger_location.locationlogo` |
| Sales Tax Basis | Whether sales tax is computed from the Company (branch) Location or the order's Shipping Address | enum | Yes | `Company Location` | user-entered | `vtiger_location.salestaxbasedon` |
| Base Currency | The branch's base currency id | reference | No | `0` | user-entered | `vtiger_location.location_base_currency` |
| Salesman Assignment Basis | Whether salesman assignment at this branch is open to "all" salesmen or restricted to a "single" assigned one | enum | No | `all` | user-entered | `vtiger_location.location_base_salesman` |
| Show Store Pick | Whether the "store pick" fulfillment option is shown at this branch | boolean | No | `No` | user-entered | `vtiger_location.showstorepick` |
| POS Register List / Register EOD Starting Amounts | Config of POS registers at this branch and their per-register EOD starting cash amounts | text/json (x2) | Yes | NULL | system-set | `.pos_register_list` / `.registers_eodstartingamount` |
| Other Expense Configuration | JSON blob of additional configured expense line types for this branch | json | No | NULL | user-entered | `vtiger_location.other_expense_json` |
| Created By / Assigned To / Created Time / Modified Time / Deleted | Standard CRM audit and soft-delete fields | reference/datetime/boolean | No | varies | system-set | Standard `vtiger_crmentity` fields (`.smcreatorid`, `.smownerid`, created/modified time, deleted) |

### Location Accounting Configuration

1:1 with the branch header. No CRM field labels exist for this table at all — pure admin-config
managed entirely by Settings-area screens (`modules/Settings/editLocation.php`,
`locationqbsetting.php`, `locationTraverseSettings.php`). ~97 columns follow one of two repeating
families rather than individually itemized, per the source blueprint's own grouped treatment.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Location ID | FK to the branch this accounting configuration belongs to (1:1, also the PK) | identifier/reference | Yes | NULL | system-set | `vtiger_location_accounting.locationid` |
| Location Name (denormalized) | Copy of the branch name, denormalized onto this table | text | Yes | NULL | system-set (derived) | `vtiger_location_accounting.locationname` |
| Traverse GL account-code mappings — 34 columns | For each of 34 transaction/account types (merchandise/core/return inventory, SO tax/shop-parts/misc-tax/misc-fee/cost/income accounts, manual inventory adjustment, gift-card deposit liability, finance-charge income, discrepancy debit/credit, accrued-purchases/AP/freight/misc accounts, payment AR/deposit-to accounts, EOD cash/check/CC/charge AR accounts) — the GL account code used when posting that transaction type to Traverse for this branch | text (GL code, x34) | No | `''`/NULL each | system-set (integration config) | `.traverse_gl_code`, `.traverse_merchandise_inv`, `.traverse_core_inv`, `.traverse_core_return_inv`, `.traverse_defect_return_inv`, `.traverse_warranty_return_inv`, `.traverse_so_tax_income_account`, `.traverse_so_shop_parts_income_account`, `.traverse_so_misc_tax_income_account`, `.traverse_so_misc_so_fee_income_account`, `.traverse_so_part_cost_ledger`, `.traverse_so_core_cost_ledger`, `.traverse_so_merchandise_income_account`, `.traverse_so_core_income_account`, `.traverse_so_labor_income_account`, `.traverse_so_freight_income_account`, `.traverse_so_misc_income_account`, `.traverse_part_inv_manual_adj`, `.traverse_gift_card_deposit_liability`, `.traverse_finance_charge_income`, `.traverse_discrepancy_debit_account`, `.traverse_discrepancy_credit_account`, `.traverse_vi_acc_pur`, `.traverse_vi_accounts_payable`, `.traverse_vi_freight`, `.traverse_vi_miscellaneous`, `.traverse_payment_ar_account`, `.traverse_payment_deposit_to_account`, `.traverse_eod_cash_cehck_invoices_ar`, `.traverse_eod_refund_check_invoices`, `.traverse_eod_cc_invoices_ar`, `.traverse_eod_charge_invoices_ar` |
| QuickBooks Profile ID / Class / Location User | Which QuickBooks profile applies to this branch, the QuickBooks "Class" tag applied to transactions posted from this branch, and the QuickBooks integration user credential for this branch's sync | reference/text (x3) | varies | varies | system-set | `.qb_profileid` / `.qb_class` / `.qb_location_user` |
| QuickBooks account/item-name mappings — ~60 columns | For each of ~60 transaction/account/item types (inventory adjustment/WAC-correction accounts, cost ledgers, SO item/core-item/tax/freight/labor accounts and items, Store Transfer in-transit/COGS/income/AR/AP/clearing accounts and items, accrued-purchases/inventory/freight/duty/VAT accounts, payment AR/ROA-split accounts, cash/check/CC payment names, EOD debit/credit/AR accounts) — the QuickBooks account or item name used when posting that transaction type for this branch | text (QB account/item name, x~60) | No | `''`/NULL each | system-set (integration config) | `.qb_main_inv`, `.qb_core_inv`, `.qb_core_return_inv`, `.qb_defect_return_inv`, `.qb_warranty_return_inv`, `.qb_inv_manual_adjust_acc`, `.qb_inv_wac_correction`, `.qb_cost_ledger`, `.qb_core_cost_ledger`, `.qb_so_item`, `.qb_so_core_item`, `.qb_tax_item_sub`, `.qb_misc_tax_item_sub`, `.qb_frieght_item_sub`, `.qb_labor_item_sub`, `.qb_labor_bom_sub`, `.qb_misc_fee_item`, `.qb_so_merchandise_account`, `.qb_so_core_account`, `.qb_so_tax_account`, `.qb_so_freight_account`, `.qb_so_labor_account`, `.qb_st_in_transit`, `.qb_st_cogs`, `.qb_st_core_cogs`, `.qb_st_income`, `.qb_st_core_income`, `.qb_st_income_item`, `.qb_st_core_income_item`, `.qb_st_ar`, `.qb_st_invoice_dummy_customer_account`, `.qb_st_ap`, `.qb_st_vendor_for_vendor_bill`, `.qb_st_clearing_account`, `.qb_vi_acc_pur`, `.qb_vi_main_inv`, `.qb_vi_core_inv`, `.qb_vi_freight`, `.qb_vi_duty`, `.qb_vi_vat`, `.qb_vi_miscellaneous`, `.qb_payment_ar_act`, `.qb_payment_roa_split_due_to`, `.qb_payment_roa_split_due_from`, `.qb_csh_payment_name`, `.qb_check_payment_name`, `.qb_cc_payment_name`, `.qb_payment_deposit_to_act`, `.qb_eod_debit_act`, `.qb_eod_credit_act`, `.qb_eod_dummy_customer_act`, `.qb_eod_cash_ar`, `.qb_eod_refund_check`, `.qb_eod_cc_ar`, `.qb_eod_chg_receivable`, `.qb_st_cogs_income_entry`, `.qb_accounts_payable`, `.qb_st_cogs_income_costtype`, `.qb_st_income_ap_entry`, `.qb_po_acc_freight`, `.qb_po_acc_duty`, `.qb_so_misc_account`, `.qb_so_misc_cogs` |
| QuickBooks Use Same AR/AP Profile / Push Same Sell/Cost | Whether Store Transfer AR and AP post to the same QuickBooks profile, and whether Store Transfer income posts using the same sell price as cost | boolean (x2) | Yes | varies | user-entered | `.qb_st_use_arap_sameprofile` / `.qb_st_push_same_sell_cost` |

### Product-at-Location (QoH, Cost & Reorder Detail)

72,104 rows on the source blueprint's dev database — this module's largest and most business-critical
entity, backed by `vtiger_locationcf` (composite-keyed by `.locationid` + `.cf_1472` product id, no
independent identity/crmentity of its own). 160 of its ~150 physical columns have CRM field labels.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Row ID | Primary key of this product/location composite row (not the business-facing branch id) | identifier | Yes | auto_increment | system-set | `vtiger_locationcf.locid` |
| Location | FK to the branch this row belongs to | reference | Yes | 0 | system-set | `vtiger_locationcf.locationid` |
| Product | FK to the Products-module record this row belongs to (the composite key's product side) | reference | No | NULL | system-set | `vtiger_field` 1473 "Product"; `.cf_1472` |
| Line Code | Product line-code at this location | text | No | NULL | user-entered | `vtiger_field` 837 "Line Code"; `.cf_836` |
| Line Code (unlabeled variant) | No UI label; a second line-code-shaped column, relationship to the labeled Line Code unconfirmed | text | No | NULL | unclear | `.cf_834` |
| Product Number | The product's number/SKU, denormalized onto this row | text | No | NULL | user-entered/derived | `vtiger_field` 839 "Product Number"; `.cf_838` |
| Qty Onhand | Current quantity on hand for this product at this branch — the module's single highest-stakes field: no code path writes it with a non-negative floor check | number | No | 0 | derived | `vtiger_field` 841 "Qty Onhand"; `.cf_840` |
| Qty Scanned | Quantity most recently scanned (e.g. cycle count/WMS scan) | number | No | 0 | derived | `vtiger_field` 843 "Qty Scanned"; `.cf_842` |
| Total Available | Computed total available quantity — the only field in this module protected by a real non-negative floor | number | No | 0 | derived | `vtiger_field` 845 "Total Available"; `.cf_844` |
| Customer Back Order Qty | Quantity currently on customer backorder for this product/branch | number | No | 0 | derived | `vtiger_field` 847; `.cf_846` |
| Vendor Back Order Qty | Quantity currently on vendor backorder (awaiting receipt) | number | No | 0 | derived | `vtiger_field` 849; `.cf_848` |
| Forecast GRP | Forecast group code used to bucket this product/branch for demand forecasting | text | No | NULL | user-entered | `vtiger_field` 851; `.cf_850` |
| Sales Rank | Sales-rank classification for this product at this branch | enum | No | NULL | derived | `vtiger_field` 853; `.cf_852` |
| Rank Group | Rank-group classification, related to Sales Rank | text | No | NULL | user-entered | `vtiger_field` 855; `.cf_854` |
| Part Type | Part-type classification for this product/branch | enum | No | NULL | user-entered | `vtiger_field` 859; `.cf_858` |
| Zone | Warehouse zone where this product is stored at this branch | text | No | NULL | user-entered | `vtiger_field` 861; `.cf_860` |
| Shelf | Warehouse shelf location | text | No | NULL | user-entered | `vtiger_field` 863; `.cf_862` |
| Bin | Warehouse bin location | text | No | NULL | user-entered | `vtiger_field` 865; `.cf_864` |
| Aisle | Warehouse aisle location | text | No | NULL | user-entered | `vtiger_field` 3411; `.cf_aisle` |
| Secondary Zone / Aisle / Shelf / Bin | Secondary warehouse zone/aisle/shelf/bin location | text (x4) | No | NULL each | user-entered | `.cf_secondary_zone` / `.cf_secondary_aisle` / `.cf_secondary_shelf` / `.cf_secondary_bin` |
| Tertiary Zone / Aisle / Shelf / Bin | Tertiary warehouse zone/aisle/shelf/bin location | text (x4) | No | NULL each | user-entered | `.cf_tertiary_zone` / `.cf_tertiary_aisle` / `.cf_tertiary_shelf` / `.cf_tertiary_bin` |
| Price Label | Which price-label format is used for this product at this branch | enum | No | NULL | user-entered | `vtiger_field` 867; `.cf_866` |
| Min GP Percent | Minimum acceptable gross-profit percentage | number(%) | No | `100.00` | user-entered | `vtiger_field` 869; `.cf_868` |
| Max GP Percent | No confirmed UI label; meaning inferred from adjacency to Min GP Percent only | number(%) | No | `0` | unclear | `.cf_870` |
| Part Taxed | Whether this product is taxable at this branch | boolean | No | NULL | user-entered | `vtiger_field` 873; `.cf_872` |
| Current Market Cost | Current market cost for this product at this branch | money | No | NULL | derived | `vtiger_field` 875; `.cf_874` |
| Weighted Average Cost | Weighted-average cost for this product at this branch | money | No | NULL | derived | `vtiger_field` 877; `.cf_876` |
| FIFO Cost | FIFO cost for this product at this branch | money | No | NULL | derived | `vtiger_field` 879; `.cf_878` |
| Last Cost | Most recent purchase cost for this product at this branch | money | No | NULL | derived | `vtiger_field` 881; `.cf_880` |
| Alternate Cost 1 / 2 / 3 | Alternate/secondary cost figures for this product/branch | money (x3) | No | NULL each | user-entered | `.cf_1187` / `.cf_1189` / `.cf_1191` |
| Alternate Cost Note | Meaning unclear — text column adjacent to the three Alternate Cost fields, plausibly a source/note for them | text | No | NULL | unclear | `.cf_1193` |
| Lowest Cost | Lowest cost on record for this product/branch | money | No | `0.0000` | derived | `vtiger_field` 1833; `.cf_1832` |
| Future Cost / Future Cost Effective Date | A scheduled future cost for this product/branch, and the date it takes effect | money/date | No | `0.0000`/NULL | user-entered | `.future_cost` / `.future_cost_effective_date` |
| LIFO Date / LIFO Value | Date and value associated with the LIFO cost figure | date/money | No | NULL each | derived | `.lifo_date` / `.lifo_value` |
| Current/Landed/Avg/Last/Alternate Cost — Date & User | For six cost figures (current, avg landed, avg, last, alternate 1/2/3), the date it was last changed and the user who changed it | text/datetime, reference (x12) | No | `''`/NULL | system-set | `.current_cost_date`/`.current_cost_user`, `.avg_landed_cost_date`/`.avg_landed_cost_user`, `.avg_cost_date`/`.avg_cost_user`, `.last_cost_date`/`.last_cost_user`, `.alternate_cost_1_date`/`.alternate_cost_1_user`, `.alternate_cost_2_date`/`.alternate_cost_2_user`, `.alternate_cost_3_date`/`.alternate_cost_3_user` |
| Last Received Date / Last PO Number | Date and PO number of this product's most recent receipt at this branch | date/text | No | varies | derived | `.cf_882` / `.cf_884` |
| Last Sold Date / First Sold Date | Dates this product was first and most recently sold at this branch | date (x2) | No | varies | derived | `.cf_886` / `.cf_1830` |
| Last Returned (value) | Most recent return-related value — column typed as text, not a date | text | No | NULL | derived | `.cf_888` |
| Last Returned Date | No UI label; date column adjacent to Last Returned, plausibly its date component, not confirmed | date | No | `0000-00-00` | unclear | `.cf_890` |
| **Part Superseded** | Whether this product/branch row has been marked superseded by another product — the module's one real, one-way lifecycle transition | boolean | No | `No` | system-set | Confirmed via `Location.php:62`, `formulaFieldFunctions.php`; `.cf_892` |
| **Superseding Product Number** | The product number of the part that supersedes this one — a string lookup value, not a foreign key | text | No | NULL | user-entered | Confirmed via `Location.php:58-66`; `.cf_896` |
| Related Part # (unlabeled default flag) | No UI label; a `Yes`-defaulted flag near the supersession fields in the new-row template, exact meaning not confirmed | text | No | `Yes` | unclear | `.cf_904` |
| Unlabeled short code (near cf_904) | No UI label; short code, exact meaning not confirmed | text | No | NULL | unclear | `.cf_906` |
| Related Part # | A related/cross-reference part number for this product | text | No | NULL | user-entered | `vtiger_field` 909; `.cf_908` |
| Alternate Part # | An alternate part number for this product | text | No | NULL | user-entered | `vtiger_field` 1627; `.cf_1626` |
| Part Min / Part Max / Part Order Point | Minimum/maximum stock thresholds and the reorder-point threshold for this product/branch | number (x3) | No | NULL each | user-entered/derived | `.cf_898` / `.cf_900` / `.cf_902` |
| Selling UOM Type | Unit-of-measure type used when selling this product | enum | No | NULL | user-entered | `vtiger_field` 911; `.cf_910` |
| Vendor Order (PUOM) Type | Purchasing unit-of-measure type used when ordering from the vendor | enum | No | NULL | user-entered | `vtiger_field` 913; `.cf_912` |
| Vendor Order Increment (PUOM) | Purchasing increment quantity in vendor-order units | text | No | NULL | user-entered | `vtiger_field` 1656; `.cf_1655` |
| Primary Supplier | Primary supplier code for this product at this branch | text | No | NULL | user-entered | `vtiger_field` 915; `.cf_914` |
| Min Order Qty / Buy Qty / Purchase Increment | Sourcing configuration for this product/branch | number (x3) | No | NULL each | user-entered | `.cf_916` / `.cf_918` / `.cf_1356` (Purchase Increment) |
| Avg Daily Demand | Computed average daily demand (formula field) | number | No | `0.000` | derived | `vtiger_field` 921; `.cf_920`; cf. `formulaFieldFunctions.php::UpdateAverageDailyDemand` |
| Days Inventory | Computed days-of-inventory-on-hand figure | number | No | NULL | derived | `vtiger_field` 923; `.cf_922` |
| Forecast Blackout Start/End Date | Date range during which demand forecasting is suspended for this product/branch | date (x2) | No | `0000-00-00` each | user-entered | `.cf_924` / `.cf_926` |
| Lead Time Receipts / Avg Lead Time | Number of receipts used as the lead-time calculation basis, and the computed average supplier lead time | number (x2) | No | NULL each | derived | `.cf_928` / `.cf_930` (`formulaFieldFunctions.php::UpdateAvgLeadTime`) |
| Avg Days Between (Sales) / Num Invoices for Avg Days Between / Use Avg Between In Calc | Computed average days between sales (formula field), its invoice-count basis, and whether it's factored into the reorder calculation | number/boolean (x3) | No | varies | derived/user-entered | `.cf_932` (`UpdateAvgDaysBetween`) / `.cf_934` / `.cf_936` |
| Avg Qty Sold / Num Invoices For Avg Qty Sold / High Qty Sold / Num Invoices For High Qty Sold | Computed average and high quantity-sold figures and their invoice-count bases | number (x4) | No | varies | derived | `.cf_938` (`UpdateAvgQtySold`) / `.cf_1153` / `.cf_1157` (`UpdateHighQtySold`) / `.cf_1155` |
| Projected Next Use Date / Use Project Factor / Projection Factor | Computed projected next-use date (formula field), and a manual override multiplier | date/boolean/number (x3) | No | varies | derived/user-entered | `.cf_940` (`UpdateProjNextUse`) / `.cf_942` / `.cf_944` |
| Projected Next Order Date / Projected Date to Receive More | Computed projected reorder and next-receipt dates (formula fields) | date (x2) | No | varies | derived | `.cf_1344` (`UpdateProjNextOrderDate`) / `.cf_1503` (`UpdateProjectedNextReceiptDate`) |
| SO Part Notes / PO Part Notes / Require SO Part Notes / Part Notes Display | Free-text notes shown on SO/PO lines for this product/branch, whether they're required, and where they display | text/enum (x4) | No | NULL each | user-entered | `.cf_946` / `.cf_1935` / `.partnoterequire` / `.cf_1733` |
| Sales Previous (unlabeled variant) | No UI label; decimal columns clustered immediately before the labeled Sales Previous fields, plausibly earlier/superseded period buckets | number (x3) | No | NULL each | unclear | `.cf_948`, `.cf_950`, `.cf_952` |
| Sales Previous - 12 / 13-24 / 25-36 | Prior-period sales totals across three trailing 12-month-equivalent windows (formula fields) | money (x3) | No | NULL each | derived | `.cf_954` / `.cf_956` / `.cf_958` (`updateSalesPreviousFields`) |
| Sales YTD / YTD Sales Qty / MTD Sales / MTD Sales Qty / Last Month's Sales / Last Month Sales Qty / YTD Cost / MTD Cost | Year-to-date and month-to-date sales and cost rollups | money/number (x8) | Yes | varies | derived | `.cf_2023` / `.cf_2024` / `.cf_2025` / `.cf_2026` / `.cf_2027` / `.cf_2028` / `.cf_2029` / `.cf_2030` |
| Quantity On Order / Qty Cust BO Not Ordered Yet | Quantity currently on order (PO not yet received), and customer-backorder quantity not yet placed on a vendor PO | number/text (x2) | No | 0/NULL | derived | `.cf_1067` / `.cf_1505` |
| Core Qty On Hand / Warranty Qty On Hand / Defect Qty on Hand | Quantities of core-charge, warranty-replacement, and defective units on hand | number (x3) | varies | 0/NULL | derived | `.cf_1139` / `.cf_1141` / `.cf_defectqoh` |
| Core/Warranty Qty Changed (plus paired Date/Time and User for each) | Markers, timestamps, and users recorded when Core/Warranty Qty On Hand are manually changed | text/datetime/reference (x6) | No | NULL each | system-set | `.coreqtychanged`/`.coreqtychangeddatetime`/`.coreqtychangeduser`, `.warrantyqtychanged`/`.warrantyqtychangeddatetime`/`.warrantyqtychangeduser` |
| Core OSTQ / Warranty OSTQ / Defect OSTQ | "Outstanding quantity" (on order/in transit) figures for core, warranty, and defect stock | number (x3) | Yes | `0` each | derived | `.cf_ostq_core` / `.cf_warranty_core` / `.cf_defect_core` |
| Weeks for Avg Daily Demand / Order Frequency / Weeks Before X Rank / Weeks of N Rank / Set Reorder Minimum Using | Configuration inputs to the demand/reorder calculation | number/text/enum (x5) | No | varies | user-entered | `.cf_1145` (`findLimitForAvgDailyDemand`) / `.cf_1147` / `.cf_1149` / `.cf_1151` / `.cf_1159` |
| Qty Allocated | Quantity currently allocated (reserved against open orders) for this product/branch | number | No | 0 | derived | `vtiger_field` 1196; `.cf_1195` |
| Qty Consigned / Total QoH + Consigned | Quantity held on consignment, and combined on-hand-plus-consigned quantity | number (x2) | No | 0 each | derived | `.cf_1708` / `.cf_1197` |
| Reorder | Whether this product/branch is currently flagged to reorder (formula-driven) | boolean | No | NULL | derived | `vtiger_field` 1355; `.cf_1354` |
| Reorder Alert | Whether a reorder alert is flagged — name inferred from an inline-edit control (`changeReorderAlert`), no CRM field label to corroborate | boolean | Yes | `0` | system-set | `.ralert` |
| Eligible Return Date / Beginning Stock Date | Date through which stock is eligible for return, and the date this product/branch's stock tracking began | date (x2) | No | `0000-00-00` each | derived/user-entered | `.cf_1460` / `.cf_1562` |
| Outgoing Store Transfer Qty / ST Qty Available | Quantity currently allocated to, and quantity available for, an outbound Store Transfer | number (x2) | No | 0/0.00 | derived | `.cf_1868` / `.cf_1483` |
| Purchase Unit In Terms Of UOM | Identified only via a code comment as "Purchase Unit In Terms Of UOM"; no field label to corroborate | number | Yes | `0.00` | unclear | `.cf_1495` |
| **Combine Sales History Option** | Governs how sales-history is combined when this product is superseded (merge into the superseding product, remove the old data, or leave the two separate) — **no CRM field label**, confirmed via code usage only | enum | No | NULL | user-entered | Confirmed via `formulaFieldFunctions.php:441-541` (`combineSH`), `Location.js:92`; `.cf_1665` |
| **Combine QoH Option** | Governs how quantity-on-hand is combined when this product is superseded (same three-value pattern) — **no CRM field label** | enum | No | NULL | user-entered | Confirmed via `formulaFieldFunctions.php:551-739` (`combineQoH`), `Location.js:93`; `.cf_1667` |
| Transfer Price and Cost | Whether pricing and cost fields transfer from this product/branch to the superseding product/branch on supersession | boolean | Yes | `No` | user-entered | Confirmed via `formulaFieldFunctions.php:755`, `Location.js:274`; `.transferpriceandcost` |
| Superseded Allow Store Transfer | Whether Store Transfers are still permitted for this product/branch after it has been marked superseded | boolean | Yes | `No` | user-entered | Confirmed via `CommonUtils.php:15799`, `StoreTransfer/loadProductsNew.php:407`; `.supercededallowtransfer` |
| False Demand / FD Order Frequency / FD Avg Lead Time / FD Days Inventory / FD Avg Daily Demand | Whether a "false demand" adjustment applies, and the calculation-basis figures used | boolean/number (x5) | No | NULL each | user-entered/derived | `.cf_1669` (`recordFalseLoss`) / `.cf_1671` / `.cf_1673` / `.cf_1675` / `.cf_1677` |
| Lost Sales / False Loss | Computed accumulated lost-sale quantity and false-loss count for this product/branch | number (x2) | varies | varies | derived | `.cf_1714` (`recordLostSale`) / `.false_loss` (`recordFalseLoss`) |
| Comments | Free-text comments for this product/branch | text | No | NULL | user-entered | `vtiger_field` 1732; `.cf_1731` |
| Manufacturers Pop Code | Manufacturer "pop code" classification | text | No | NULL | user-entered | `vtiger_field` 1835; `.cf_1834` |
| Qty Onhand Tooltip | Cached/precomputed text shown in the Qty Onhand hover tooltip | text | No | NULL | derived | `vtiger_field` 1874; `.cf_1874`; cf. `CostDetailAjax.php` |
| SO Price Override | Whether the SO line price for this product/branch can be manually overridden | boolean | Yes | `Yes` | user-entered | `vtiger_field` 1947; `.so_price_over_ride` |
| Print Part Notes On Invoice | Whether part notes print on invoices | enum | No | `0` | user-entered | `vtiger_field` 1992; `.print_partnotes_on_invoice` |
| Turns / Qty Defect Rate (%) | Computed inventory-turns figure and defect-rate percentage (formula fields) | number (x2) | varies | varies | derived | `.turns` / `.qdr` |
| Minimum Sell Increment / Default Sell Qty | Minimum increment this product can be sold in, and the default quantity pre-filled when selling it | text/number (x2) | No | NULL/`1` | user-entered | `.cf_sellinguom` / `.cf_default_sell_qty` |
| Assembly Product Type | Whether/how this product/branch functions as a kit/assembly — feeds the kit-quantity requirement R3 | enum | No | `Non-Assembly Product` | user-entered | `vtiger_field` 4016; `.assembly_type` |
| POS Hover Notes | Notes shown on hover at the POS for this product/branch | text | No | NULL | user-entered | `vtiger_field` 4218; `.cf_pos_hover_notes` |
| Tax Holiday / Start Tax Holiday Date / End Tax Holiday Date | Whether this product/branch is currently exempt under a tax holiday, and the exemption window | boolean/date (x3) | No | varies | user-entered | `.cf_tax_holiday` / `.cf_start_tax_holiday_date` / `.cf_end_tax_holiday_date` |
| MPL Price Plan | Which Master Price Level price plan applies to this product/branch | reference | No | `1` | user-entered | `vtiger_field` 4294; `.cf_mplpriceplanid` |
| Visible in Searches | Whether this product/branch is visible in search results | boolean | No | `Yes` | user-entered | `vtiger_field` 4395; `.cf_stocked` |
| In Store Pick | Whether this product is fulfilled via in-store pick at this branch | boolean | No | `No` | user-entered | `vtiger_field` 4434; `.cf_storepick` |
| Inventory Adjustment Account / Inventory Balance Account | Accounting accounts used for inventory adjustments and balance for this product/branch | reference (x2) | No | NULL each | user-entered | `.cf_inv_adj_acc` / `.cf_inv_bal_acc` |
| Web Store Pickup Only | Whether this product/branch is restricted to web-order store-pickup only | boolean | No | `No` | user-entered | `vtiger_field` 4471; `.cf_web_store_pickup` |
| Last Count Date | Date of the last physical inventory count | datetime | No | NULL | derived | `vtiger_field` 4481; `.last_count_date` |
| Last Sell Price | The most recent sell price for this product/branch | money | No | `0.0000` | derived | `vtiger_field` 4561; `.cf_last_sellprice` |
| Delayed Quantity On Order | Quantity on order that has been flagged as delayed | text | No | NULL | derived | `vtiger_field` 3601; `.cf_delayqoo` |
| Freeze O2X From Forecast Updates | Whether O2X (an external forecasting/ordering integration) updates are frozen for this product/branch | date-shaped flag | No | NULL | user-entered | `vtiger_field` 3791; `.freezeo2xupdateloc` |
| Row Last Modified Date | System-tracked last-modified timestamp for this row specifically (distinct from the shared crmentity modified time) | datetime | No | `0000-00-00 00:00:00` | system-set | `vtiger_locationcf.locdatamodifieddate` |
| Product Stripped | Alphanumeric-only normalized copy of the product number, used when pushing data to QuickBooks | text | Yes | `''` | system-set (derived) | Confirmed via `DetailViewAjax.php:194-197`; `.product_stripped` |
| Unlabeled date (near supersession fields) | No UI label; date column referenced in `DetailViewAjax.php`/`validatePartSuperceded.php`, set to the current date at certain supersession/edit events — exact meaning not confirmed | date | No | NULL | unclear | `.cf_1735` |

### Location Group

Generic CRM record-sharing "group" assignment — not given full field-catalog treatment since it
carries no Location-specific business meaning beyond the group-membership link itself.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Group Relation ID | Primary key | identifier | Yes | auto_increment | system-set | `vtiger_locationgrouprelation.locationgrouprelationid` |
| Location | The branch this group assignment applies to | reference | No | NULL | system-set | `vtiger_locationgrouprelation.locationid` |
| Group Name | The CRM sharing-group name this branch is assigned to | text | No | NULL | user-entered | `vtiger_locationgrouprelation.groupname` |

### Location Pass-On Field Configuration

Keyed by product alone (not by branch); defines which Product-at-Location field names should be
copied into a new superseding product's per-branch rows during part-supersession processing.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Pass-On Config ID | Primary key | identifier | Yes | auto_increment | system-set | `vtiger_locationpassonfield.id` |
| Product | The product this pass-on field configuration applies to | reference | Yes | NULL | system-set | `vtiger_locationpassonfield.productid` |
| Pass-On Fields | Serialized/delimited list of Product-at-Location field names to copy onto the superseding product's rows when this product is superseded | text/serialized | Yes | NULL | system-set | Confirmed via `validatePartSuperceded.php:47-140`, `EditLocationFile.php:218-226`; `.passonfields` |

### Role-Location Assignment

Access-control data owned by Settings-area admin screens, not by this module's own code — included
here because it is genuinely Location-domain data. **Not redesigned as part of this module's own
specification.**

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Assignment ID | Primary key | identifier | Yes | auto_increment | system-set | `vtiger_role_locations.id` |
| Role | The CRM security role this assignment grants branch access to | reference | Yes | NULL | user-entered (admin) | `vtiger_role_locations.roleid` |
| Location | The branch this role is granted access to | reference | Yes | NULL | user-entered (admin) | `vtiger_role_locations.location_id` |
| Inactivity Logoff (minutes) | Minutes of inactivity before a session for this role/branch is automatically logged off | number | Yes | NULL | user-entered (admin) | `vtiger_role_locations.inactivity_logoff` |
| Auto Clock-Out (minutes) | Minutes after which a POS/timeclock session for this role/branch is automatically clocked out | number | Yes | NULL | user-entered (admin) | `vtiger_role_locations.auto_clockout` |

### Default-Location Picklist

A 2-row system picklist backing a "default location" concept used elsewhere in the ERP (Users' and
Accounts' own default-location selection) — not per-record default-location data itself.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Picklist Row ID | Primary key | identifier | Yes | auto_increment | system-set | `vtiger_sodefaultlocation.sodefaultlocationid` |
| Picklist Value | The picklist option label (live values: "User Location", "Account Default Location") | text | Yes | NULL | system-managed | `vtiger_sodefaultlocation.sodefaultlocation` |
| Presence | Standard picklist visibility flag | number | Yes | `1` | system-managed | `vtiger_sodefaultlocation.presence` |
| Picklist Value ID | Standard picklist cross-reference id | identifier | Yes | `0` | system-managed | `vtiger_sodefaultlocation.picklist_valueid` |

`vtiger_sodefaultlocation_seq` is a bare single-column sequence-counter table with no business
meaning of its own — not catalogued as a field row.

### User-Location Tracking (cross-module — owned by Users, not Location)

Entirely managed by the Users module's own code; zero references anywhere in this module's own files.
Included per the source blueprint's own expectation that Location-domain tracking data be catalogued
here, with ownership flagged. **Not redesigned as part of this module's own specification; see the
confirmed schema-drift finding on this entity's branch reference below.**

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Track ID | Primary key | identifier | Yes | auto_increment | system-set | `vtiger_track_userlocation.trackid` |
| Location Name | The branch name the user was tracked at — stored as a denormalized name string, **not** a stable reference to the branch's own identity | text | Yes | NULL | system-set | `vtiger_track_userlocation.locationname` |
| Track Date | The date this tracking entry applies to | date | Yes | NULL | system-set | `vtiger_track_userlocation.currdate` |
| User | The user being tracked | reference | Yes | NULL | system-set | `vtiger_track_userlocation.userid` |

## Known Gaps

- **A branch reference stored by name, not by identity.** User-Location Tracking keys its branch
  reference by the branch's **name** (`.locationname`, a denormalized text value) rather than a
  stable identifier (`vtiger_location.locationid`) — every other Location-referencing entity in this
  catalog uses a proper reference. A branch rename would silently orphan historical tracking rows.
  Owned by the Users module, so flagged here as a schema-drift finding, not resolved.
- **A naming/label-mismatch risk on the two "Combine" options.** Combine Sales History Option
  (`.cf_1665`) and Combine QoH Option (`.cf_1667`) have **no CRM field label** for either — business
  meaning established only by code usage (`formulaFieldFunctions.php`). A future schema design working
  from field labels alone could misassign one option's meaning to the other's column.
- **The Product-at-Location entity has no independent audit/soft-delete/sharing mechanism of its own**
  in the legacy system, despite being the module's highest-cardinality, most business-critical data
  (72,104 rows vs. 12 crmentity rows for the 7 real branches) — this is the finding R1 above is the
  direct response to.
- **A confirmed field-catalog gap running the field-usage-without-a-catalog-entry direction.** A
  business rule (the rule group governing eight silently-defaulted config fields — see
  `business-rules-and-validation.md`) references a field labeled **"Multiply FCST By Per Car"** that
  has **no corresponding entry anywhere in the source field catalog**. Because it has no catalog
  entry, no row is listed for it above — inventing a placeholder would misrepresent the source. A
  closely related, lower-confidence question: whether a second field cited by the same rule ("Delay
  Reorder to Avg Days Between Sales") is the same field as "Use Avg Between In Calc" — plausible by
  business-meaning similarity only, not confirmed by any code citation in either direction.
- **A remainder of unlabeled/unconfirmed fields** — roughly a dozen columns on the branch header and a
  similar number on Product-at-Location have no CRM field label and no code usage the source blueprint
  could confirm a business meaning from (flagged inline above with "meaning unclear"/"unconfirmed").
  These require subject-matter-expert confirmation before being assigned a normative business meaning
  in a new schema.
- **The GL-mapping entity's ~97 near-duplicate columns** are a genuine coverage area, not a gap — the
  source blueprint documents this family once rather than fabricating a distinct narrative per column,
  and this document preserves that same grouped treatment (R7 above).
