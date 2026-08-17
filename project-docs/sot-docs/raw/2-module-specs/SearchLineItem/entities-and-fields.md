# SearchLineItem — Entities & Fields

> Every entity, every field, individually. No grouping/summarizing — that's how fields get lost.
> Legacy table/column names are a first-class column in the field catalog below, not an optional
> footnote — this project's whole documentation discipline rests on every claim being traceable to
> a specific source, and a footnote is too easy to skip. See
> `_deviations-from-original-template.md` in this folder.

Source: `docs_from_blueprint/module/SearchLineItem/02-entities-and-fields.md` (business meaning) and
`blueprint/module/SearchLineItem/01-entities-fields.md` (Legacy Trace / `vtiger_field` citations).

## 0. Governing architectural requirements (carried forward)

These are forward-looking requirements for any new implementation, not merely observations about the
legacy system (Doc2 §2.1):

- **R1** — SearchLineItem is preserved as a first-class, physically-materialized read-model, populated
  exclusively by an event SalesOrder's finalize process publishes — not folded into SalesOrder's own
  aggregate, and not queried live off SalesOrder's transactional storage.
- **R2** — Exactly one authoritative calculation service computes the margin/extension fields
  (`extsellprice`, `extproductcost`, `extcoresell`, `margindollars`, `marginpercent`), never two
  independently-authored restatements.
- **R3** — Security-by-construction: no raw string-interpolated SQL reachable from business logic.
- **R4** — The module's two alert flags (`supersedereturn`, `oversalealert`) are first-class domain
  events with typed, guarded dismiss commands, not boolean columns with ad hoc reset scripts.
- **R5** — Every business entity is scoped to a tenant.

## Entity List

| Entity | Purpose |
|---|---|
| Search Line Item (Sales-Order-Line Snapshot) | The core, and only real, entity — one row per finalized SalesOrder line, denormalizing identity/linkage, customer/job/people, pricing/margin, cost, tax, location/fulfillment, buyout, and kit/promotion/supersession context, plus a `supersedereturn` alert flag and an undocumented-but-live `oversalealert` flag. Backed by `vtiger_searchlineitem`, 103 physical columns, 85 CRM-registered. 7,074 live rows, actively growing. |
| Search Line Item Custom-Field Extension | The standard vtiger Studio custom-field companion table — structurally present but functionally empty: one column (the FK back to the header entity), zero live rows. No code reference found beyond its own schema description. |
| Search Line Item Group Relation | A grouping/relation table (row-FK + group-name), referenced only by the entity class's own "Backorderlog Number" search-field label — zero live rows. Not the generic CRM sharing-group infrastructure used elsewhere; apparently dormant. |

**Relationship summary — the return/supersede workflow, confirmed as a three-participant chain.**
SearchLineItem is a genuine, code-verified third participant (alongside Products and Location) in a
supersession-merge workflow: Products writes a supersession-merge decision onto Location's own table →
SalesOrder, on finalizing a return-type line for a superseded product, flags the SearchLineItem snapshot
row it just created → SearchLineItem's own alert worklist (plus a Home-dashboard widget) is the sole
consumer/report surface for that flag. SearchLineItem owns only the flag column and the worklist, not
the supersession decision itself and not the flag-setting decision. All joins in this chain are by
business key (linecode + product number, then product-to-default-location), not by a foreign-key
constraint. Beyond that one relationship, SearchLineItem's fields carry loose (non-FK'd) references to
SalesOrder, Products, Location, Accounts, Users, Jobs, and Kits. The header entity has no live
relationship to the two satellite tables beyond the shared PK/FK shape (both satellite tables are
empty). (Source: `02-entities-and-fields.md` §2; `01-entities-fields.md` §1.)

## Field Catalog

**Scope and method.** Business meaning is transcribed from `docs_from_blueprint/.../02-entities-and-
fields.md` §3; Legacy Trace is transcribed from `blueprint/.../01-entities-fields.md` §2. Where a
field's business meaning was flagged as unconfirmed, that uncertainty is carried forward verbatim.

**Logical Type legend**: `money`, `date`, `datetime`, `enum`, `text`, `number` (counts, quantities,
percentages, rates), `boolean`, `reference(to X)`, `identifier`, `json/serialized`.

### Search Line Item — Identity / SO-line linkage

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Search Line Item ID | Primary key | identifier | Yes | auto_increment | system-set | `.sliid` |
| Sales Order Date | Date of the parent sales order (denormalized copy) | date | No | NULL | system-set (copied at finalize) | `vtiger_field` 1213 "Sales Order Date"; `.sodate` |
| Sales Order Internal ID | Internal numeric id of the parent SalesOrder record | reference (to Sales Order) | Yes | 0 | system-set — **Open Question**: no CRM field label | `.soid` — paired with `.salesorderid` |
| Sales Order # | The parent sales order's user-facing number | text | No | NULL | system-set (copied at finalize); this module's primary drill-through link | `vtiger_field` 1214 "Sales Order #"; `.salesorderid` |
| Line Number | This line's ordinal position within its parent SO | number | Yes | NULL | system-set; this module's default sort field | `vtiger_field` 1250 "Line Number"; `.linenumber` |
| Product Internal ID | Internal numeric id of the product sold on this line | reference (to Product) | Yes | 0 | system-set — **Open Question**: no CRM field label | `.pid` — paired with `.productid` |
| Product # | The product's business-facing number/code | text | No | NULL | system-set (copied at finalize) | `vtiger_field` 1216 "Product #"; `.productid` |
| Line Code | Internal line-code classification of the product sold | text | No | NULL | system-set (copied at finalize) | `vtiger_field` 1215 "Line Code"; `.linecode`; joined to `lbm_product_linecode.linecodename` on export |
| Line Code Description | Display description of the line code | text | No | NULL | system-set (derived) | `vtiger_field` 1946 "Line Code Description"; `.linecodedesc` |
| Subline | Sub-line classification under the line code | text | No | NULL | system-set (copied at finalize) | `vtiger_field` 1251 "Subline"; `.subline`; joined to `lbm_product_subline.sublinename` on export |
| Product Description | Free-text description of the product sold | text | No | NULL | system-set (copied at finalize) | `vtiger_field` 1252 "Product Description"; `.description` |
| Product Group | Product-group classification | text | No | NULL | system-set (copied from location config at finalize) | `vtiger_field` 1255 "Product Group"; `.productgroup` |
| Customer Part Number | The customer's own part number for this product, if provided | text | No | NULL | user-entered (copied at finalize) | `vtiger_field` 1264 "Customer Part Number"; `.custpartnumber` |
| Print Customer Part Number Labels | Whether customer-part-number labels should print for this line | boolean | No | NULL | user-entered | `vtiger_field` 1265; `.printnumberlabels` |
| Vehicle Lookup | Vehicle-fitment lookup value associated with this line | text | No | `None` | system-set (copied at finalize) | `vtiger_field` 1223 "Vehicle Lookup"; `.vehiclelookup` |
| Vehicle Number | A specific vehicle number/identifier associated with this line | text | No | NULL | user-entered | `vtiger_field` 1280; `.vehiclenumber` |
| Applicable Price Rule | Which pricing rule was applied to derive this line's price | reference | No | NULL | system-set (derived) | `vtiger_field` 1266; `.pricerule` |
| Sell Level | The pricing "sell level" tier used for this line | text | No | NULL | system-set (derived) | `vtiger_field` 1267; `.selllevel` |

### Search Line Item — Customer / job / people

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Master Account Number | The customer account's business-facing account number | text | No | NULL | system-set (copied at finalize) | `vtiger_field` 1217 "Master Account Number"; `.accountnumber` |
| Master Account Name | FK to the Accounts entity | reference (to Account) | Yes | NULL | system-set | `vtiger_field` 3473 "Master Account Name"; `.account_id`; joined to `vtiger_account.accountname` on export |
| Master Account Coretype | The account's core-charge type classification (denormalized) | text | No | NULL | system-set (copied at finalize) | `vtiger_field` 1263 "Master Account Coretype"; `.acccoretype` |
| Master Account Tax Authority Code | The account's tax-authority code (denormalized) | reference | No | NULL | system-set (copied at finalize) | `vtiger_field` 3209 "Master Account Tax Authority Code"; `.acc_tac` |
| Customer PO # | The customer's own purchase-order number for this line — the one field confirmed to re-sync from its SO parent after finalize | text | No | NULL | user-entered (copied at finalize; re-synced on later SO-level PO-number edits) | `vtiger_field` 1652 "Customer PO #"; `.customerposli` |
| Job Name | FK to the Jobs entity this line is billed against, if any | reference (to Job) | No | 0 | user-entered (copied at finalize) | `vtiger_field` 4316 "Job Name"; `.jobid` (→ `lbm_jobs`) |
| Counter Person | The counter-desk user who took/entered this line | reference (to User) | No | NULL | system-set | `vtiger_field` 1218 "Counter Person"; `.counterperson` (FK to `vtiger_users.id`); joined to `vtiger_users.user_name` on export |
| Sales Person | The sales rep associated with this line | text | No | NULL | system-set (derived) | `vtiger_field` 3357 "Sales Person"; `.sales_person`; joined to `vtiger_users` (first/last name concat) on export |
| Sales Group Name | The sales group associated with this line | text | No | NULL | system-set (derived) | `vtiger_field` 3358 "Sales Group Name"; `.sales_group` |
| Authorized Purchaser | The user/contact who authorized this purchase | reference | No | 0 | user-entered | `vtiger_field` 4597 "Authorized Purchaser"; `.authorized_purchaser` |
| Transaction Code | Short code classifying the transaction type of this line — 7 of an unknown fuller set of values are confirmed: buyout, sale (gates the oversale-alert flag), two core-charge codes, and three/four return-type codes `6`/`7`/`8`/`18` (gate the supersede-return-alert flag) | enum(code) | No | NULL | system-set (copied at finalize) — **Open Question**: fuller code table never enumerated | `vtiger_field` 1222 "Transaction Code"; `.transactioncode`; joined to `fuse5_so_transcationcode.name` on export |
| Payment Method | Payment method associated with this line | reference | No | `''` | system-set (copied at finalize) | `vtiger_field` 3825 "Payment Method"; `.cf_1388` |

### Search Line Item — Pricing / margin

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Sell Qty | Quantity sold on this line | number | No | NULL | system-set (copied at finalize) | `vtiger_field` 1219 "Sell Qty"; `.sellqty` |
| Shipped Qty | Quantity actually shipped for this line — the divisor in one of the module's two confirmed division-by-zero risks | number | No | NULL | system-set | `vtiger_field` 1257 "Shipped Qty"; `.shippedqty` |
| Backorder Qty | Quantity backordered for this line | number | No | NULL | system-set | `vtiger_field` 1258 "Backorder Qty"; `.backorderqty` |
| Sell Price Qty | Quantity basis the sell price is expressed per | number | Yes | NULL | system-set — **Open Question**: no CRM field label | `.sellpriceqty` |
| Sell Price | Unit sell price for this line | money | No | NULL | system-set (copied at finalize) | `vtiger_field` 1220 "Sell Price"; `.sellprice` |
| List Price | Manufacturer/catalog list price for the product on this line | money | No | NULL | system-set (copied at finalize) | `vtiger_field` 1261 "List Price"; `.listprice` |
| Net Price | Net price after adjustments for this line | money | No | NULL | system-set (derived) | `vtiger_field` 1268 "Net Price"; `.netprice` |
| Extended Sellprice | Sell price × quantity for this line — the divisor's sibling in the module's own division-by-zero risk | money | No | NULL | system-set (derived) | `vtiger_field` 1259 "Extended Sellprice"; `.extsellprice` |
| Before Discounts Extended Sellprice | Extended sell price prior to discount/coupon application | text | No | NULL | system-set (derived) | `vtiger_field` 3786; `.before_discounts_ext_sellprice` |
| Applied Coupon Code | Coupon/promo code applied to this line, if any | text | No | NULL | user-entered (copied at finalize) | `vtiger_field` 3809; `.applied_couponcode` |
| Amount Add/Subtract | A manual price adjustment amount applied to this line | number | No | NULL | user-entered | `vtiger_field` 1269 "Amount Add/Subtract"; `.amountadd` |
| Times | A pricing multiplier factor | number | No | NULL | user-entered | `vtiger_field` 1270 "Times"; `.times` |
| Core Price | Unit core-charge price for this line | money | No | NULL | system-set (copied at finalize) | `vtiger_field` 1221 "Core Price"; `.coreprice` |
| Extended Coresell | Core price × quantity for this line | number | No | NULL | system-set (derived) | `vtiger_field` 1262 "Extended Coresell"; `.extcoresell` |
| Margin Dollars | Dollar margin on this line (sell − cost) — genuinely computed once at SalesOrder-finalize time, and recomputable via the module's own inline-edit ajax endpoint | money | No | NULL | system-set (derived) | `vtiger_field` 1224 "Margin Dollars"; `.margindollars` |
| Margin Percentage (%) | Percentage margin on this line, computed alongside Margin Dollars | number(%) | No | NULL | system-set (derived) | `vtiger_field` 1225 "Margin Percentage (%)"; `.marginpercent` |
| Total Before | Catalogued as "line total before adjustment," but **confirmed hardcoded to an empty string on every finalize-time write** — never actually computed by any traced code path | money | No | NULL | **Confirmed vestigial.** | `vtiger_field` 1281 "Total Before"; `.totbefore` |
| Total After | Same finding as Total Before — described as a derived total, confirmed always blank in practice | money | No | NULL | **Confirmed vestigial.** | `vtiger_field` 1282 "Total After"; `.totafter` |
| Discount Amount | Discount amount applied to this line | money | No | `0.000` | system-set (derived) — **Open Question**: no CRM field label | `.discountamount` |
| VOC | A numeric flag/value; meaning not confirmed | number | No | `0` | unclear — **Open Question**: abbreviation not expanded, no CRM field label | `.voc` |
| Pushed to Promotion Tracker | Whether this line has been pushed into the Promotion Tracker mechanism | boolean | Yes | NULL | system-set | `vtiger_field` 3012; `.ispromotiontracker` |
| UOM | Unit-of-measure code for this line's quantity | text | No | NULL | system-set (copied at finalize) | `vtiger_field` 4192 "UOM"; `.uom` |
| UOM JSON Data | Serialized unit-of-measure conversion detail for this line | json/serialized | No | NULL | system-set (derived) — **Open Question**: no CRM field label | `.uomjsondata` |
| Total Sq Ft | Total square footage represented by this line | number | No | `0.00` | system-set (derived) | `vtiger_field` 4307 "Total Sq Ft"; `.total_sq_ft` |
| Shipping Type | Shipping method/type for this line | text | No | NULL | system-set (copied at finalize) | `vtiger_field` 3658 "Shipping Type"; `.shipping_type` |
| Budget Cost | Budgeted unit cost for this line | money | Yes | `0.00` | user-entered | `vtiger_field` 4459 "Budget Cost"; `.budget_cost` |
| Budget Cost Ext | Budgeted extended cost for this line | money | Yes | `0.00` | system-set (derived) | `vtiger_field` 4460 "Budget Cost Ext"; `.budget_cost_ext` |
| Applicable Big Tree Product CRV | A per-unit fee for a specific vendor/program ("Big Tree") | money | No | `0.0000` | system-set (copied at finalize) — **Open Question**: "Big Tree" program never identified | `.bigtreeprodcrv` |
| Big Tree Product Type | Product-type classification for the "Big Tree" program | text | No | NULL | system-set (copied at finalize) — **Open Question**: same cluster | `.bigtreeprodtype` |
| Big Tree Product Units Per Case | Units-per-case packaging factor for the "Big Tree" program | number | No | `0` | system-set (copied at finalize) — **Open Question**: same cluster | `.bigtreeprodunitpercase` |

### Search Line Item — Cost (current and pre-supersession "original")

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Product Cost | Current unit cost of the product on this line | money | Yes | NULL | system-set (copied at finalize) | `vtiger_field` 1621 "Product Cost"; `.productcost` |
| Extended Product Cost | Product Cost × quantity; editable via the module's own inline-edit ajax endpoint, which recomputes Margin Dollars/Margin Percentage from it | money | No | NULL | system-set (derived, editable) | `vtiger_field` 1260 "Extended Product Cost"; `.extproductcost` |
| Core Cost | Current unit core cost for this line | money | No | NULL | system-set (copied at finalize) | `vtiger_field` 1631 "Core Cost"; `.corecost` |
| Extended Original Product Cost | Pre-adjustment/pre-supersession "original" extended product cost; editable via the module's inline-edit endpoint, which directly recomputes Original Product Cost from this value ÷ Shipped Qty — the module's second confirmed division-by-zero risk | money | No | `0.0000` | system-set (derived, editable) | `vtiger_field` 3233 "Extended Original Product Cost"; `.extorgproductcost` |
| Original Product Cost | Pre-adjustment/pre-supersession unit product cost for this line — a directly-writable target column despite carrying no CRM field label | money | No | `0.0000` | system-set (derived) — **confirmed live and load-bearing** despite the missing label | `.orgproductcost` |
| Extended Original Core Cost | Pre-adjustment/pre-supersession extended core cost | money | No | `0.0000` | system-set (derived) | `vtiger_field` 3240; `.extorgcorecost` |
| Original Core Cost | Pre-adjustment/pre-supersession unit core cost | money | No | `0.0000` | system-set (derived) — **Open Question**: no CRM field label | `.orgcorecost` |
| COGS | Cost-of-goods-sold value recognized for this line | money | No | `0.000` | system-set (derived) | `vtiger_field` 4628 "COGS"; `.cogs` |
| FIFO Cost Breakup | Serialized/delimited breakdown of FIFO cost-layer consumption for this line | text | No | NULL | system-set (derived) | `vtiger_field` 3062; `.fifocostbreakup` |

### Search Line Item — Tax

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Part Taxed | Whether this line's part amount is taxed | boolean | No | NULL | system-set (derived) | `vtiger_field` 1271 "Part Taxed"; `.taxed` |
| Core Taxed | Whether this line's core-charge amount is taxed | boolean | Yes | NULL | system-set (derived) | `vtiger_field` 1888 "Core Taxed"; `.coretaxed` |
| Tax Percent | Overall tax rate percentage applied to this line | number(%) | No | NULL | system-set (derived) | `vtiger_field` 1272; `.taxpercent` |
| Tax Dollars | Overall tax dollar amount applied to this line — recomputed independently by a standalone ad hoc utility script outside SalesOrder's finalize routine | money | No | NULL | system-set (derived) | `vtiger_field` 1633; `.taxdollar` |
| Silo Tax | Silo-specific tax rate component | number(%) | No | NULL | system-set (derived) | `vtiger_field` 1749; `.silotax` |
| Local Tax | Local tax rate component | number(%) | No | NULL | system-set (derived) | `vtiger_field` 1750; `.localtax` |
| State Tax | State tax rate component | number(%) | No | NULL | system-set (derived) | `vtiger_field` 1751; `.statetax` |
| Silo Tax Dollars | Silo tax dollar amount | money | No | NULL | system-set (derived) | `vtiger_field` 1752; `.silotaxdollars` |
| Local Tax Dollars | Local tax dollar amount | money | No | NULL | system-set (derived) | `vtiger_field` 1753; `.localtaxdollars` |
| State Tax Dollars | State tax dollar amount | money | No | NULL | system-set (derived) | `vtiger_field` 1754; `.statetaxdollars` |
| Misc Tax | Miscellaneous tax dollar amount | money | No | NULL | system-set (derived) | `vtiger_field` 3826; `.misctaxval` |
| Misc Tax (%) | Miscellaneous tax rate percentage | number(%) | No | NULL | system-set (derived) | `vtiger_field` 3827; `.misctaxper` |
| VAT Tax | Whether VAT applies to this line | boolean(enum) | Yes | `no` | system-set (copied at finalize) | `vtiger_field` 3778 "VAT Tax"; `.vattax` |

### Search Line Item — Location / fulfillment

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Location Internal ID | Internal numeric id of the branch/location this line was sold from | reference (to Location) | Yes | 0 | system-set — **Open Question**: no CRM field label | `.locid` — paired with `.mainlocation` |
| Location | Display name of the location this line was sold from — used as the join key (by name, not id) in the supersede/return worklist's own query | text | Yes | NULL | system-set (copied at finalize) | `vtiger_field` 1539 "Location"; `.mainlocation` |
| Return Location | The location a return-type line's goods are tracked back to | text | No | NULL | system-set (copied at finalize) | `vtiger_field` 3219; `.trackreturngplocation` |
| RGN Number | Return-goods-number reference for this line | text | Yes | NULL | system-set (copied at finalize) — **Open Question**: "RGN" abbreviation not expanded | `vtiger_field` 1545 "RGN Number"; `.rgnnumber` |
| Return PO Flag | Whether this line is tied to a return purchase order | boolean(enum) | Yes | NULL | system-set (derived) — **Open Question**: no CRM field label | `.returnpoflg` |
| Zone | Warehouse zone location for this product | text | No | NULL | system-set (copied from location config at finalize) | `vtiger_field` 1273 "Zone"; `.zone` |
| Shelf | Warehouse shelf location | text | No | NULL | system-set (copied from location config at finalize) | `vtiger_field` 1274 "Shelf"; `.shelf` |
| Bin | Warehouse bin location | text | No | NULL | system-set (copied from location config at finalize) | `vtiger_field` 1275 "Bin"; `.bin` |
| Lot Numbers | Lot-number(s) associated with the inventory shipped on this line | text | Yes | NULL | system-set | `vtiger_field` 4033; `.lot_numbers` |

### Search Line Item — Buyout

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Buyout | Whether this line is a Buyout (drop-ship/special-order) line | boolean | No | NULL | system-set (copied at finalize) | `vtiger_field` 1277 "Buyout"; `.buyout` |
| Buyout PO | The Buyout PO number this line is sourced from, if any | text | No | NULL | system-set (copied at finalize) | `vtiger_field` 1278 "Buyout PO"; `.buyoutpo` |
| Buyout Vendor | The vendor supplying this Buyout line | reference | No | NULL | system-set (copied at finalize) | `vtiger_field` 1279 "Buyout Vendor"; `.buyoutvendor` |

### Search Line Item — Kit / promotion / supersession

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Kit Number | FK to the Kits entity if this line is part of a kit | reference (to Kit) | No | NULL | system-set (copied at finalize) | `vtiger_field` 3330 "Kit Number"; `.kitsid` (→ `fuse5_kits`) |
| Kit Group Name | FK to the kit-group this line's kit belongs to | reference | No | NULL | system-set (copied at finalize) | `vtiger_field` 3331 "Kit Group Name"; `.kitsgroupid` (→ `fuse5_kitsgroup`) |
| Part Message | A free-text message/note attached to this line | text | No | NULL | user-entered (copied at finalize) | `vtiger_field` 1256 "Part Message"; `.partmessage` |
| Superseded/Return Alert Flag | Whether this line's product is a superseded product AND the line is a return-type transaction, still pending user action on the supersede/return worklist | boolean(enum) | Yes | NULL | system-set (SalesOrder-finalize logic); reset by the module's own alert-dismiss action | no CRM label; `.supersedereturn`; set by `SalesOrder::saveFinalizeSOFunctions.php`, reset by `SupersedeReturnReport.php`'s `removeLines` ajax branch |
| Oversale Alert Flag | A second, structurally parallel alert flag: whether this line represents a sale that exceeded available stock at finalize time — **no CRM field label at all**; located only via direct code-usage tracing | boolean(enum) | Yes | NULL | system-set (SalesOrder-finalize logic) — no *confirmed-reachable* dismiss path | no CRM label; `.oversalealert` (name inferred from code usage, not a `vtiger_field` row) |

### Search Line Item — Audit / system

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Created Time | Row-creation timestamp | datetime | Yes | NULL | system-set — this module carries its own audit timestamps directly rather than inheriting a shared entity-table's, unlike every other module blueprinted so far | `.createdtime` — no `vtiger_crmentity` join exists for this module |
| Modified Time | Row-last-modified timestamp | datetime | Yes | NULL | system-set — same basis as above | `.modifiedtime` |
| Is Deleted | Soft-delete flag, set by a direct update rather than a true row delete or the generic delete mechanism other modules use | boolean | Yes | `0` | system-set — zero rows have this set on the blueprint's own live snapshot | `.deleted`; `Delete.php`'s direct `UPDATE` per its "RM 6508" comment |

### Search Line Item Custom-Field Extension

No business fields exist beyond the 1:1 foreign key back to the header entity.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Search Line Item ID (FK) | 1:1 FK back to the header, also this table's PK | identifier/reference | Yes | NULL | system-set | `vtiger_searchlineitemcf.sliid` |

### Search Line Item Group Relation

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Search Line Item ID | FK to the Search Line Item row this grouping applies to | reference | Yes | NULL | system-set | `vtiger_searchlineitemgrouprelation.sliid` |
| Group Name | The name of the group/backorderlog this line belongs to | text | No | NULL | unclear — **Open Question**: no code site found that writes to this table; meaning inferred solely from the entity class's own "Backorderlog Number" label | `.groupname` |

## Known Gaps

- **This module does not join the generic shared entity table other modules extend.** Unlike every
  other module blueprinted so far, SearchLineItem's rows carry their own creation/modification
  timestamps directly rather than inheriting them from a shared audit-table join. Presented as a Schema
  Drift finding, not a business requirement to replicate.
- **One CRM field-registration row is anomalous**: a "Shipping Name" field (`vtiger_field` 4598) is
  registered against this module's tab but its physical column actually lives on SalesOrder's own
  `vtiger_soshipads` table, not on this entity. Excluded from the catalog above on that basis. Whether
  this is a configuration error or intentional shared display plumbing was never resolved.
- **~18 of 103 physical columns have no CRM field label at all** — spanning internal-id/business-facing
  identifier pairs, several derived/system columns, the "Big Tree" program cluster, and the two alert
  flags themselves. Business meaning for most was inferred from column-name convention and adjacent-
  column pairing rather than a confirmed label or code citation; flagged individually as Open Questions
  above.
- **Two directly-writable columns bypass the module's normal save mechanism entirely.** Extended
  Product Cost and Extended Original Product Cost, when edited via the module's own inline-edit ajax
  endpoint, drive direct database writes to Margin Dollars/Margin Percentage and Original Product Cost
  respectively — the second of these is written by a direct update that runs *before*, and independently
  of, the entity's normal save call, creating a confirmed division-by-zero risk (see
  `business-rules-and-validation.md` SLI-RULE-012 and `calculations.md`).
- **Roughly 8 fields are true orphans** — no CRM field label, and no later blueprint pass independently
  confirmed or expanded their meaning beyond column-name-convention inference: the quantity basis for
  sell price, a discount-amount field, "VOC," a UOM JSON payload, "Original Core Cost," "Return PO
  Flag," and the row's own created/modified timestamps. Require SME confirmation before being assigned
  normative business meaning.
- **The "Big Tree" program cluster** (a per-unit fee, a product-type classification, a units-per-case
  factor) belongs to a vendor/program never identified anywhere across the blueprint's eight analysis
  passes.
- **"Total Before"/"Total After"** are catalogued as system-derived totals, but both are hardcoded to an
  empty string on every write and never actually computed by any traced code path — a confirmed
  correction to the original field-catalog characterization.
- **`.transactioncode`'s full code-to-meaning mapping is not fully resolved.** Only 7 of an unknown
  fuller set of values were confirmed (buyout, sale, two core-charge codes, three-or-four return-type
  codes) — the presumed fuller reference table was never enumerated, and no pass distinguishes the
  return-type codes from one another as sub-types.
- **The two satellite tables' real-world purpose is unresolved.** Whether the empty custom-field
  extension table should be carried into a new schema at all, and whether the group-relation table's
  "Backorderlog Number" grouping mechanism is a retired feature or simply unexercised, were both left
  as open questions.

## 6. Recommended rewrite schema — this session's own design proposal, not a blueprint finding

Everything above documents what exists today. This section is different in kind: a proposed replacement
schema, reasoned from the specific structural problems the legacy shape causes. Table/column names below
are tech-agnostic placeholders, not a commitment to any specific naming convention.

**The one question that has to be answered before any column design: should this even be a writable
table set at all?** R1 already settles this in principle — keep it as its own entity, not folded into
SalesOrder, and not queried live off SalesOrder's transactional storage. This design follows through on
the *consequence* of that decision: a live JOIN/view over SalesOrder's own line table would contend with
SalesOrder's own OLTP write path on every search/list/alert-worklist/Ford-EDI/mobile-scanner read —
exactly the query shapes a 7,074-row-and-growing snapshot with dedicated indexes exists to avoid. So the
proposal keeps this as its own physically materialized table set, not a database view — but makes it
**structurally insert/update-only from one place**: a single finalize-event consumer service, with no
generic create/edit scaffolding of its own. The legacy module's full CRUD scaffolding was never the real
write path — SalesOrder's finalize routine was the only confirmed row-creation site in the entire
codebase. The new schema should not repeat that mismatch between what the scaffolding implies and how
the table is actually populated.

**Problems this design fixes, one by one:**

1. **Two independent writers can produce genuinely divergent values for the same derived-financial
   field set** — SalesOrder's finalize-time formula and a scheduled cost-backfill script restate the
   same margin/extension calculation with confirmed formula-level divergences (R2). **Fix**: no column
   is ever writable by two different code paths independently — every write goes through the same
   single calculation service, and the pricing/cost tables get a `source_event_id`/`calculated_at`
   provenance pair on every row so a second writer bypassing the service is detectable after the fact.
2. **Two boolean alert flags with no state machine and no guarded dismiss path** — `supersedereturn` has
   an unguarded, injectable dismiss action; `oversalealert` has no confirmed-reachable dismiss path at
   all, so 80 of 7,074 live rows sit permanently flagged (R4). A boolean column structurally cannot
   carry "who dismissed this, when, and why." **Fix**: replace both flag columns with a proper
   alert-event table, one row per raised alert, with an explicit status and a required actor/
   timestamp/reason on dismissal.
3. **A confirmed-vestigial pair of columns ("Total Before"/"Total After") is catalogued as system-
   derived but is hardcoded to an empty string on every write.** **Fix**: drop them entirely — this is
   the one case where "no confirmed use" is settled fact, not an open question.
4. **Roughly 8 further fields have no confirmed business meaning beyond a column-name-convention
   guess.** Unlike Total Before/After, these are *unconfirmed* rather than *confirmed-unused* — dropping
   them outright risks silently discarding data someone downstream may depend on; giving each one a
   dedicated typed column would dress up a guess as settled business meaning. **Fix**: quarantine them
   into a single generic key/value extension table, scoped to this entity. Each field gets promoted to a
   real typed column once an SME confirms its meaning, and is dropped from the extension table once
   superseded.
5. **A serialized/delimited "FIFO Cost Breakup" column packs a multi-row breakdown into one text
   field.** **Fix**: normalize into a proper one-row-per-layer child table.
6. **Three flat, hardcoded tax-jurisdiction column triples ("Silo"/"Local"/"State" rate + dollar amount
   each)** — adding a fourth jurisdiction level means an `ALTER TABLE`, and an inapplicable jurisdiction
   silently defaults to `NULL`. **Fix**: normalize into one row per (line, jurisdiction) pair.
7. **Two satellite tables carry zero live rows and no confirmed writer or reader.** **Fix**: do not
   carry either forward. If the "Backorderlog Number" grouping concept is still a real business need, it
   should be designed fresh as its own entity once confirmed, not resurrected as an empty legacy
   artifact.
8. **No tenant/company column anywhere is asserted as a requirement rather than confirmed already
   present (R5).** **Fix**: add it explicitly on every table below rather than leaving it implicit.

**Proposed tables:**

- **`sales_order_line_snapshot`** (replaces `vtiger_searchlineitem`'s identity/linkage, customer/job/
  people, location/fulfillment, buyout, and kit/promotion columns) — `id` (PK), `tenant_id`,
  `sales_order_id` (FK), `sales_order_number`, `line_number`, `product_id` (FK), `product_number`,
  `line_code`, `line_code_description`, `subline`, `product_description`, `product_group`,
  `customer_part_number`, `print_customer_part_number_labels` (boolean), `vehicle_lookup`,
  `vehicle_number`, `applicable_price_rule_id` (FK), `sell_level`, `master_account_id` (FK),
  `master_account_coretype`, `master_account_tax_authority_code`, `customer_po_number` (the one field
  confirmed to re-sync after finalize on later SO-level edits), `job_id` (FK, nullable),
  `counter_person_id` (FK to User), `sales_person_id` (FK), `sales_group_id` (FK),
  `authorized_purchaser_id` (FK, nullable), `transaction_code_id` (FK to a new `transaction_code` lookup
  table, replacing the legacy's unenumerated code column), `payment_method_id` (FK), `location_id` (FK),
  `return_location_id` (FK, nullable), `rgn_number`, `return_po_flag` (boolean), `zone`, `shelf`, `bin`,
  `lot_numbers`, `is_buyout` (boolean), `buyout_po`, `buyout_vendor_id` (FK, nullable), `kit_id` (FK,
  nullable), `kit_group_id` (FK, nullable), `part_message`, `source_event_id` (the finalize event that
  produced this row — the sole intended write path), `created_at`, `updated_at`, `deleted_at` (soft
  delete, using the shared audit mechanism every other module uses, not this module's own standalone
  timestamp columns).
- **`sales_order_line_pricing`** (1:1 with the snapshot row) — `line_id` (PK, FK →
  `sales_order_line_snapshot`), `sell_qty`, `shipped_qty` (NOT NULL, `CHECK > 0` — closes one of the two
  confirmed division-by-zero risks at the schema layer), `backorder_qty`, `sell_price`, `list_price`,
  `net_price`, `extended_sell_price`, `before_discount_extended_sell_price` (money — corrected from the
  legacy's `text` type), `applied_coupon_code`, `manual_adjustment_amount`, `pricing_multiplier`,
  `core_price`, `extended_core_sell`, `margin_dollars`, `margin_percent`, `total_sq_ft`, `shipping_type`,
  `budget_cost`, `budget_cost_ext`, `uom_type_id` (FK into the UOM module's own proposed
  `uom_type`/`uom_conversion_factor` tables, replacing the legacy's serialized UOM JSON payload),
  `calculated_at`, `source_event_id`.
- **`sales_order_line_cost`** (1:1 with the snapshot row) — `line_id` (PK, FK), `product_cost`,
  `extended_product_cost`, `core_cost`, `extended_original_product_cost`, `original_product_cost`,
  `extended_original_core_cost`, `cogs`, `calculated_at`, `source_event_id`. `Original Core Cost` is
  deliberately excluded here and quarantined instead — it is the one field in this cluster never
  confirmed as load-bearing, unlike `Original Product Cost`.
- **`sales_order_line_cost_layer`** (new — replaces the serialized "FIFO Cost Breakup" text column) —
  `id` (PK), `line_id` (FK → `sales_order_line_snapshot`), `layer_sequence` (integer), `layer_reference`,
  `quantity`, `unit_cost`, unique on (`line_id`, `layer_sequence`).
- **`sales_order_line_tax_component`** (new — replaces the fixed Silo/Local/State rate+dollar column
  triples) — `id` (PK), `line_id` (FK), `jurisdiction_code` (small lookup/enum — `silo`, `local`,
  `state`, plus `misc`), `rate_percent`, `amount`, unique on (`line_id`, `jurisdiction_code`).
  `part_taxed`, `core_taxed`, `tax_percent`, `tax_dollars`, and `vat_applies` (boolean) stay as columns
  on `sales_order_line_pricing` — they are whole-line flags/totals, not per-jurisdiction components.
- **`sales_order_line_alert`** (new — replaces `supersedereturn`/`oversalealert` boolean columns) — `id`
  (PK), `line_id` (FK), `alert_type` (enum: `supersede_return`, `oversale`), `status` (enum: `open`,
  `dismissed`), `raised_at`, `raised_by_event_id`, `dismissed_at` (nullable), `dismissed_by_user_id`
  (nullable), `dismissal_reason` (nullable), a partial-unique constraint on (`line_id`, `alert_type`)
  where `status = 'open'` so a line cannot accumulate two simultaneous open alerts of the same type.
  Dismissal is a first-class, permission-checked, state-precondition-guarded command (R4) — it can only
  transition an `open` row to `dismissed`.
- **`sales_order_line_unclassified_attribute`** (new — the quarantine table for problem 4) — `id` (PK),
  `line_id` (FK), `attribute_key` (the ~8 orphaned field names: sell-price quantity basis, discount
  amount, `voc_value`, original core cost, return PO flag, and the three Big-Tree-cluster values),
  `attribute_value` (text — deliberately untyped), `captured_at`. Not joined by default in any standard
  query path.

**Not carried forward**: `Total Before` / `Total After`, the custom-field extension table and the
group-relation table (both zero-row, no confirmed writer or reader).

**Referential integrity**: every FK above should be a real, enforced database constraint — the legacy
schema's cross-module joins were confirmed to work only by business-key convention, not an actual
foreign-key constraint. Recommend `RESTRICT` on delete for `sales_order_id`/`product_id`/`location_id`
while any dependent snapshot row exists — a finalized sales-order line is a historical record, and a
hard delete of its parent should never silently orphan or cascade-delete the read-model row that exists
specifically to preserve a point-in-time view of it.
