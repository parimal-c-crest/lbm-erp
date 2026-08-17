# Accounts — Entities & Fields

> Every entity, every field, individually. No grouping/summarizing — that's how fields get lost.
> Legacy table/column names are a first-class column in the field catalog below, not an optional
> footnote — this project's whole documentation discipline rests on every claim being traceable to
> a specific source, and a footnote is too easy to skip. See
> `_deviations-from-original-template.md` in this folder.

Source: `docs_from_blueprint/module/Accounts/02-entities-and-fields.md` (itself citing
`blueprint/module/Accounts/01-entities-fields.md`, "Doc1"). Seventeen business entities.

**AccountStatement note** (carried from the source): the four dedicated statement tables (Open-Item
Statement Line, Statement Deferred/Applied-Adjustment Detail, Statement Archive, Batch Statement
Snapshot) and the ~30 statement-configuration fields cataloged below also have their own dedicated
tech-agnostic module spec at `docs_from_blueprint/module/AccountStatement/`. This file keeps its own
field catalog intact per the source; statement-specific normalized-schema detail belongs to that
other module's spec, not here.

## Entity List

| Entity | Purpose |
|---|---|
| Account (Header) | The core customer/company record: identity, contact info, ownership/rating classification, hierarchy (parent/child accounts), and QuickBooks sync pointers. |
| Billing Address | The account's default billing address; one per account. |
| Shipping Address | The account's default shipping address; one per account. |
| Account Ad/Marketing Association | Which advertising categories/ads this account is associated with (marketing-source tracking). |
| Account Auto (Vehicle) | A vehicle/asset on file for the account (counter/service-type accounts — auto parts/service context), with make/model/VIN-adjacent info, service notes, and last-SO tracking. |
| Open-Item Statement Line | One open-invoice/transaction row as computed for an account's statement (balance-forward or open-item view) — the working data set behind statement generation. |
| Statement Deferred/Applied-Adjustment Detail | A deferred-revenue or ROA-adjustment amount tied to a specific applied SO, supporting the statement's "deferred" bucket. |
| Statement Archive | A saved snapshot (HTML/CSV) of a previously generated statement for an account, for reprint/audit purposes. |
| Batch Statement Snapshot | A per-account, per-batch-run snapshot of billing-cycle past-due buckets and reprint-invoice tracking, captured at the moment a batch statement run executes. |
| Credit Card on File | A card stored against the account for repeat billing. Two coexisting mechanisms: the legacy per-card table (referenced in code but absent from the live DB — see Known Gaps) and the CardConnect gateway's tokenized vault profile. |
| Masterbrand SPA Code | A per-account "Special Price Agreement" code entry (style/short-name/value/pricing-factor/labor-adjustment, with an effective/expiration date range) used in masterbrand-dealer pricing. |
| MPL (Master Price Level) Exception | A JSON blob of per-account pricing exceptions to the standard Master Price Level schedule. |
| Account Merge Log | An audit record of an account-merge operation: which accounts were merged into which surviving account, by whom, and when. |
| Year-to-Year Sales Summary | A per-account, per-line-code, per-month/year rollup of sales/returns/cost figures used for the Y2Y sales-comparison view. |
| Account Document | A file attachment uploaded and linked to an account (soft-deletable). |
| Product/Line-Code Cross-Reference Mapping | A customer-specific mapping between the ERP's internal product/line-code and the customer's own part-numbering scheme, used for EDI/ordering integrations. |
| Billing-Cycle Definition | A system-wide (not per-account) named billing-cycle window that accounts are assigned to. |

Several supporting/lookup tables exist but are **not** treated as normative business entities, per
the source's own scoping: a generic record-sharing "group" assignment mechanism and a generic
"related products" cross-entity link table (both standard framework plumbing, not Accounts-specific),
five small picklist-value tables backing header enum fields (Ownership/Rating/Region/Type/Deployment-
Status), the shared ad-catalog lookup (owned by a different module), and two picklist tables backing
`vtiger_accountscf` enum-like custom fields.

**Relationship summary** (from the source): An Account (header + 1:1 extension-fields table) has one
Billing Address and one Shipping Address (1:1), zero or more Ad/Marketing associations, zero or more
Autos/vehicles, zero or more Documents, zero or more Masterbrand SPA codes, an optional MPL Exception
blob (effectively 1:1), zero or more Product/Line-Code Mappings, zero or more stored Credit Cards
(via either or both of the two coexisting mechanisms), zero or more Year-to-Year Sales Summary rows
(one per line-code/month/year), zero or more Open-Item Statement Lines generated at statement-run
time, zero or more Statement Deferred/Applied-Adjustment rows (keyed indirectly rather than by a
direct account reference), zero or more archived Statements, zero or more Batch Statement snapshots
(one per batch run the account was included in), and can appear as the surviving or removed party in
zero or more Merge Log entries (the removed-accounts side stored as a serialized list rather than a
normalized reference — see Known Gaps). An Account also has a self-referencing parent/child hierarchy
(via two distinct fields whose exact relationship is unconfirmed — see Known Gaps) and is optionally
assigned to a system-wide Billing-Cycle Definition (referenced by name/type rather than a direct link).

## Field Catalog

**Scope and method** (carried from the source): every field below is transcribed from the source's
own field-by-field pass against the live schema — nothing here is invented, and nothing the source
individually catalogued is dropped. Where the source flagged a field's business meaning as
unconfirmed ("meaning unclear" / "Open Question" / "no UI label"), that uncertainty is carried
forward verbatim rather than resolved into a confident-sounding guess — look for the phrase *"meaning
unclear"* or *"Open Question"* below and cross-reference Known Gaps.

### Account (Header)

Backed by `vtiger_account`, the standard vtiger entity table (30 fields individually catalogued in
the source).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Account ID | Primary key | identifier | Yes | auto_increment | system-set | `.accountid` |
| Master Account Name | The account's display/company name | text | Yes | NULL | user-entered | `vtiger_field` 1 "Master Account Name"; `.accountname` |
| Next Job Number | Running counter used to number new jobs created under this account | integer | No | 0 | system-set | Column name, no direct `vtiger_field` label; `.next_job_number` |
| Member Of | Parent account in the vtiger-standard "Member Of" hierarchy field | reference (to Account) | No | 0 | user-entered | `vtiger_field` 7 "Member Of"; `.parentid` |
| Type | Account type classification (e.g. Customer/Vendor/etc.) | enum | No | NULL | user-entered | `vtiger_field` 15 "Type"; `.account_type` |
| Industry | Industry classification | enum | No | NULL | user-entered | `vtiger_field` 13 "industry"; `.industry` |
| Annual Revenue | Reported annual revenue | money | No | 0 | user-entered | `vtiger_field` 16 "Annual Revenue"; `.annualrevenue` |
| Rating | Account rating classification | enum | No | NULL | user-entered | `vtiger_field` 12 "Rating"; `.rating` |
| Ownership | Ownership classification | enum | No | NULL | user-entered | `vtiger_field` 11 "Ownership"; `.ownership` |
| SIC Code | Standard Industrial Classification code | text | No | NULL | user-entered | `vtiger_field` 14 "SIC Code"; `.siccode` |
| Ticker Symbol | Stock ticker symbol, if a public company | text | No | NULL | user-entered | `vtiger_field` 5 "Ticker Symbol"; `.tickersymbol` |
| Phone | Primary phone number | text | No | NULL | user-entered | `vtiger_field` 2 "Phone"; `.phone` |
| Phone (search-normalized) | Digits-only normalized copy of Phone, for search/dedup matching | text | No | NULL | system-set (derived) | Column name/index; `.phonestrip` |
| Other Phone | Secondary phone number | text | No | NULL | user-entered | `vtiger_field` 6 "Other Phone"; `.otherphone` |
| Other Phone (search-normalized) | Digits-only normalized copy of Other Phone | text | No | NULL | system-set (derived) | Column name/index; `.otherphonestrip` |
| Email | Primary email address | text | No | NULL | user-entered | `vtiger_field` 8 "Email"; `.email1` |
| Other Email | Secondary email address | text | No | NULL | user-entered | `vtiger_field` 10 "Other Email"; `.email2` |
| Website | Company website URL | text | No | NULL | user-entered | `vtiger_field` 3 "Website"; `.website` |
| Fax | Fax number | text | No | NULL | user-entered | `vtiger_field` 4 "Fax"; `.fax` |
| Email Opt Out | Whether the account has opted out of email communications | boolean | No | `0` | user-entered | `vtiger_field` 17 "Email Opt Out"; `.emailoptout` |
| Mailing List Opt Out | Whether the account has opted out of mailing-list/mailer campaigns | boolean | No | NULL | user-entered | `vtiger_field` 3261 "Mailing List Opt Out"; `.mailinglistoptout` |
| Notify Owner | Whether the assigned owner should be notified on record changes | boolean | No | `0` | user-entered | `vtiger_field` 18 "Notify Owner"; `.notify_owner` |
| QuickBooks List ID | QuickBooks customer "ListID" once synced | identifier | Yes (NOT NULL) | NULL | system-set (integration) | Confirmed via `OcsQbCall.php:22-26,119-123`; `.qb_listid` |
| QuickBooks Edit Sequence | QuickBooks optimistic-concurrency edit-sequence token | text | Yes (NOT NULL) | NULL | system-set (integration) | Confirmed via `OcsQbCall.php` usage; `.qb_editsequence` |
| Sales Person | Employee id of the assigned salesperson (base-table copy; a `vtiger_accountscf` custom field of the same name also exists — meaning unclear how the two relate, see Known Gaps) | reference (to Employee/User) | Yes (NOT NULL) | `0` | user-entered | Column name; cf. `Accounts.php:461 getSalesUser`, `:481 getSalesRep`; `.sales_person` |
| Order Type | No UI label; plausibly a default-order-type preference for the account — meaning unclear, see Known Gaps | enum-like text | No | NULL | unclear | `.ordertype` — **Open Question** |
| Discount Amount | No UI label; name suggests a default discount amount, stored as varchar not decimal — meaning unclear, see Known Gaps | text | No | NULL | unclear | `.disamount` — **Open Question** |
| Misc Charges | No UI label; name suggests a default misc-charge amount, possibly a legacy predecessor of the extension table's "Add Misc SO Fee" field — meaning unclear, see Known Gaps | text | No | NULL | unclear | `.mischarges` — **Open Question** |
| Parent Account | A second parent-account reference distinct from Member Of — relationship between the two unconfirmed, see Known Gaps | reference (to Account) | Yes (NOT NULL) | NULL | user-entered | `vtiger_field` 1873 "Parent Account"; `.parentaccountid` — **Open Question** |
| Default Location | The account's default store/branch location | reference (to Location) / enum | No | NULL | user-entered | `vtiger_field` 1927 "Default Location"; `.defaultlocation` |
| Master Account Category | Free-slot categorization field for the account | text | No | NULL | user-entered | `vtiger_field` 3410 "Master Account Category"; `.accountcategory` |
| Assigned To (Owner) | The CRM user/group who owns this record | reference (to User/Group) | No | 0 | user-entered | `vtiger_field` 19 "Assigned To"; `.smownerid` |
| Created By | User who created the record | reference (to User) | No | 0 | system-set | Column name; `.smcreatorid` |
| Modified By | User who last modified the record | reference (to User) | No | 0 | system-set | Column name; `.modifiedby` |
| Description | Free-text notes on the account | text | No | NULL | user-entered | `vtiger_field` 34 "Description"; `.description` |
| Lien Information | Free-text lien/legal-hold notes on the account | text | No | NULL | user-entered | `vtiger_field` 4537 "Lien Information"; `.lien_information` |
| Created Time | Record creation timestamp | datetime | No | NULL | system-set | `vtiger_field` 20 "Created Time"; `.createdtime` |
| Modified Time | Record last-modified timestamp | datetime | No | NULL | system-set | `vtiger_field` 21 "Modified Time"; `.modifiedtime` |
| Viewed Time | Timestamp of last view (standard vtiger "recently viewed" tracking) | datetime | No | NULL | system-set | Column name, no distinct `vtiger_field` row; `.viewedtime` |
| Deleted | Soft-delete flag | boolean | No | 0 | system-set | Column name; `.deleted` |
| Average Days to Pay | Computed average number of days the account takes to pay invoices | number | No | 0 | derived | `vtiger_field` 4236 "Average Days to Pay"; `.avgdays_to_pay` |
| Status | Whether the account is Active or Inactive | enum | No | `Active` | system-set/user-entered | `vtiger_field` 4622 "Status"; `.status` |

### Account — Header Extension Fields

Backed by `vtiger_accountscf`, a 1:1 "custom fields" extension table joined to the header by
`accountid` (~180 fields; the largest single field surface in the Accounts module). Every row below
has a confirmed `vtiger_field` label except where marked otherwise. This subsection is part of the
Account (Header) entity — split into its own table here because the source itself gives it a
distinct subsection, and because collapsing ~180 fields into the Account (Header) table above would
make that table unreadable.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| EliteExtra Customer ID | Sync id for the EliteExtra delivery-dispatch integration — no UI label, meaning inferred from column name only, see Known Gaps | identifier | No | 0 | system-set (integration) | `.ee_custid` — **Open Question** |
| Master Account Number | The account's human-facing account number | text | Yes (NOT NULL) | NULL | system-set | `vtiger_field` 659 "Master Account Number"; `.cf_658` |
| List Price Code | Which list-price schedule applies to this account | enum(code) | No | NULL | user-entered | `vtiger_field` 663 "List Price Code"; `.cf_662` |
| Invoice Resequence | Whether invoice line items are resequenced on print | boolean | No | NULL | user-entered | `vtiger_field` 675 "Invoice Resequence"; `.cf_674` |
| Pick Resequence | Whether pick-ticket line items are resequenced | boolean | No | NULL | user-entered | `vtiger_field` 677 "Pick Resequence"; `.cf_676` |
| Pick Price | Whether pricing is shown on the pick ticket | boolean | No | NULL | user-entered | `vtiger_field` 679 "Pick Price"; `.cf_678` |
| Pack Resequence | Whether packing-slip line items are resequenced | boolean | No | NULL | user-entered | `vtiger_field` 681 "Pack Resequence"; `.cf_680` |
| Pack Price | Whether pricing is shown on the packing slip | boolean | No | NULL | user-entered | `vtiger_field` 683 "Pack Price"; `.cf_682` |
| Needs PO | Whether orders for this account require a PO number | boolean | No | NULL | user-entered | `vtiger_field` 685 "Needs PO"; `.cf_684` |
| Blanket PO | Whether this account operates under a standing/blanket PO | boolean | No | NULL | user-entered | `vtiger_field` 687 "Blanket PO"; `.cf_686` |
| Blanket PO Number | The blanket PO number on file | text | No | NULL | user-entered | `vtiger_field` 689 "Blanket PO Number"; `.cf_688` |
| Route | Delivery route code the account is assigned to | text | No | NULL | user-entered | `vtiger_field` 693 "Route"; `.cf_692` |
| Stop | Delivery stop sequence number on the route | text | No | NULL | user-entered | `vtiger_field` 695 "Stop"; `.cf_694` |
| Drive Time | Estimated drive time to this account (minutes) | number | No | NULL | user-entered/derived | `vtiger_field` 699 "Drive Time"; `.cf_698` |
| Minimum Delivery Time | Earliest acceptable delivery time window | text | No | NULL | user-entered | `vtiger_field` 701 "Minimum Delivery Time"; `.cf_700` |
| Maximum Delivery Time | Latest acceptable delivery time window | text | No | NULL | user-entered | `vtiger_field` 703 "Maximum Delivery Time"; `.cf_702` |
| Normal Delivery Time | Standard/typical delivery time window | text | No | NULL | user-entered | `vtiger_field` 705 "Normal Delivery Time"; `.cf_704` |
| Use Delivery Handicap | Whether a delivery-time handicap/penalty is applied for this account | boolean | No | NULL | user-entered | `vtiger_field` 707 "Use Delivery Handicap"; `.cf_706` |
| Core Type (unlabeled variant) | Second core-charge-type-shaped column with no `vtiger_field` row — relationship to Core Type below unconfirmed, see Known Gaps | text | No | NULL | unclear | `.cf_714` — **Open Question** |
| Core Type | How core charges are handled for this account | enum | No | NULL | user-entered | `vtiger_field` 711 "Core Type"; `.cf_710` |
| Statement Frequency | How often statements are generated for this account (e.g. Month/Week) | enum | No | `Month` | user-entered | `vtiger_field` 717 "Statement Frequency"; `.cf_716` |
| Process Web Order | Whether web/ecommerce orders are auto-processed for this account | boolean | No | NULL | user-entered | `vtiger_field` 719 "Process Web Order"; `.cf_718` |
| Status Code | Account status/health code (distinct from the header Status Active/Inactive flag) | enum(code) | No | NULL | system-set | `vtiger_field` 721 "Status Code"; `.cf_720` |
| Terms | Payment terms code for this account | enum | No | NULL | user-entered | `vtiger_field` 723 "Terms"; `.cf_722` |
| Tax Status | Whether the account is taxable, tax-exempt, etc. | enum | No | NULL | user-entered | `vtiger_field` 725 "Tax Status"; `.cf_724` |
| Tax Authority Code | Governing tax-authority code for this account | text | No | NULL | user-entered | `vtiger_field` 729 "Tax Authority Code"; `.cf_728` |
| Tax Number | Tax-exemption / resale certificate number | text | No | NULL | user-entered | `vtiger_field` 731 "Tax Number"; `.cf_730` |
| Second Tax/Exemption field (unlabeled) | No `vtiger_field` row; likely a second tax-authority or exemption value alongside Tax Authority Code/Tax Number — meaning unclear, see Known Gaps | text | No | NULL | unclear | `.cf_732` — **Open Question** |
| Lockout | Whether the account is locked out from placing new orders | boolean | No | NULL | system-set/user-entered | `vtiger_field` 737 "Lockout"; `.cf_736` |
| Stop Over Credit Limit | Whether orders are blocked once the account exceeds its credit limit | boolean | No | NULL | user-entered | `vtiger_field` 739 "Stop Over Credit Limit"; `.cf_738` |
| Credit Limit | Maximum outstanding balance allowed for this account | money | No | NULL | user-entered | `vtiger_field` 741 "Credit Limit"; `.cf_740` |
| Finance Charge | Whether finance charges apply to this account | boolean | No | NULL | user-entered | `vtiger_field` 743 "Finance Charge"; `.cf_742`; cf. `AccountStatement.php:4762 calculateFinanceCharge` |
| Annual Finance Charge Percentage | Annual interest rate used to compute finance charges | number(%) | No | NULL | user-entered | `vtiger_field` 745 "Annual Finance Charge Percentage"; `.cf_744` |
| Minimum Finance Charge | Minimum dollar finance charge applied regardless of computed amount | money | No | NULL | user-entered | `vtiger_field` 747 "Minimum Finance Charge"; `.cf_746` |
| High Credit | Highest outstanding balance the account has ever carried | money | No | NULL | derived | `vtiger_field` 749 "High Credit"; `.cf_748` |
| Current | Current (not-yet-past-due) open balance | money | No | NULL | derived | `vtiger_field` 751 "Current"; `.cf_750` |
| 1 Billing Cycle Past Due | Balance past due by one billing cycle | money | No | NULL | derived | `vtiger_field` 753 "1 Billing Cycle Past Due"; `.cf_752`; cf. `AccountStatement.php:3265 generateBillingCyclePastDue` |
| 2 Billing Cycle Past Due | Balance past due by two billing cycles | money | No | NULL | derived | `vtiger_field` 755 "2 Billing Cycle Past Due"; `.cf_754` |
| 3 Billing Cycle Past Due | Balance past due by three billing cycles | money | No | NULL | derived | `vtiger_field` 757 "3 Billing Cycle Past Due"; `.cf_756` |
| More than 3 Billing Cycle Past Due | Balance past due by more than three billing cycles | money | No | NULL | derived | `vtiger_field` 759 "More than 3 Billing Cycle Past Due"; `.cf_758` |
| Deferred | Deferred-revenue balance (funds received, revenue not yet recognized) | money | No | NULL | derived | `vtiger_field` 761 "Deferred"; `.cf_760` |
| Deferred — Return Portion (unlabeled) | Return-side counterpart to Deferred, no `vtiger_field` row — meaning unclear, see Known Gaps | money | No | NULL | unclear | `.cf_760_return` — **Open Question** |
| Total Owed | Grand-total balance owed by the account across all buckets | money | No | NULL | derived | `vtiger_field` 763 "Total Owed"; `.cf_762` |
| Number Of Invoice Copies | How many invoice copies print for this account | integer | No | NULL | user-entered | `vtiger_field` 765 "Number Of Invoice Copies"; `.cf_764` |
| Last Order Date | Date of the account's most recent order | date | No | NULL | derived | `vtiger_field` 767 "Last Order Date"; `.cf_766` |
| Last Payment Date | Date of the account's most recent payment | date | No | NULL | derived | `vtiger_field` 769 "Last Payment Date"; `.cf_768` |
| Last Payment Amount | Dollar amount of the most recent payment | money | No | NULL | derived | `vtiger_field` 771 "Last Payment Amount"; `.cf_770` |
| Notes | General account notes (distinct from the header Description field and the Billing Address "General Master Account Notes") | text | No | NULL | user-entered | `vtiger_field` 773 "Notes"; `.cf_772` |
| Relationship | Free-text relationship classification | enum | No | NULL | user-entered | `vtiger_field` 827 "Relationship"; `.cf_826` |
| Status Code Notes | Free-text notes explaining the current Status Code | text | No | NULL | user-entered | `vtiger_field` 829 "Status Code Notes"; `.cf_828` |
| Display Until | Expiration date for a displayed note/comment (paired with Status Code Notes) | date | No | NULL | user-entered | `vtiger_field` 831 "Display Until"; `.cf_830` |
| Process Counter Order | Whether counter-sale orders are auto-processed for this account | boolean | No | NULL | user-entered | `vtiger_field` 961 "Process Counter Order"; `.cf_960` |
| Master Price Sheet (MPS) | Which master price sheet applies to this account | reference/text | No | NULL | user-entered | `vtiger_field` 985 "Master Price Sheet (MPS)"; `.cf_984` |
| Sales and Promotions | Applicable sales/promotion program(s) for this account | json | No | NULL | user-entered | `vtiger_field` 987 "Sales and Promotions"; `.cf_986` |
| Kit Pricing | Whether kit pricing is based on Sell Price or another basis | enum | No | `Sell Price` | user-entered | Column name; `.kit_pricing` |
| List Price | Which base list price applies to this account | text | No | NULL | user-entered | `vtiger_field` 989 "List Price"; `.cf_988` |
| Default Delivery Preference | Default delivery method preselected on new orders for this account | enum | No | NULL | user-entered | `vtiger_field` 1178 "Default Delivery Preference"; `.cf_1177` |
| Title | Contact title/salutation for the account's primary contact | enum | No | NULL | user-entered | `vtiger_field` 1242 "Title"; `.cf_1241` |
| Contact First Name | First name of the account's primary/default contact | text | No | NULL | user-entered | `vtiger_field` 1244 "Contact First Name"; `.cf_1243` |
| Contact Last Name | Last name of the account's primary/default contact | text | No | NULL | user-entered | `vtiger_field` 1246 "Contact Last Name"; `.cf_1245` |
| Past Due Lockout | Whether the account is locked out from ordering once past due | boolean | No | NULL | user-entered | `vtiger_field` 1416 "Past Due Lockout"; `.cf_1415` |
| Default Payment Method | Preselected payment method on new orders | enum | No | NULL | user-entered | `vtiger_field` 1418 "Default Payment Method"; `.cf_1417` |
| Lockout Password Level | Security level required to override a lockout | enum | No | NULL | system-set | `vtiger_field` 1420 "Lockout Password Level"; `.cf_1419`; cf. `Accounts.php:883 getLockoutPasswordLevel` |
| Acceptable Payment Types | Which payment types this account is permitted to use | json (multi-select) | No | NULL | user-entered | `vtiger_field` 1422 "Acceptable Payment Types"; `.cf_1421` |
| Today's SO Totals | Running total of today's sales-order activity for this account | money | No | NULL | derived | `vtiger_field` 1441 "Todays SO Totals"; `.cf_1440` |
| Statement Type | Which statement format/type is used (Balance-Forward vs. Open-Item) | enum | No | NULL | user-entered | `vtiger_field` 1453 "Statement Type"; `.cf_1452` |
| Default Location (custom) | A second "default location"-shaped field distinct from header Default Location — relationship unconfirmed, see Known Gaps | text | Yes (NOT NULL) | NULL | unclear | `vtiger_field` 1498 "Default Location"; `.cf_1497` — **Open Question** |
| Push to Delivery Mobile | Whether orders for this account push to the delivery mobile app | boolean | No | NULL | system-set | `vtiger_field` 1582 "Push to delivery mobile"; `.cf_1581` |
| Documentation Preference | Preferred output document format(s) for this account | json (multi-select) | No | NULL | user-entered | `vtiger_field` 1623 "Documentation Preference"; `.cf_1622` |
| Transfer To Web | Whether the account is transferred/exposed to the web/ecommerce channel | boolean | No | NULL | system-set | `vtiger_field` 1625 "Transfer To Web"; `.cf_1624` |
| Use Location Sales Tax | Whether tax is computed from the location instead of the account's own tax fields | boolean | No | NULL | user-entered | `vtiger_field` 1742 "Use Location Sales Tax"; `.cf_1741` |
| State Tax | Account-specific state tax rate override | number(%) | Yes (NOT NULL) | NULL | user-entered | `vtiger_field` 1744 "State Tax"; `.cf_1743` |
| Local Tax | Account-specific local tax rate override | number(%) | Yes (NOT NULL) | NULL | user-entered | `vtiger_field` 1746 "Local Tax"; `.cf_1745` |
| Silo Tax | Account-specific silo tax rate override | number(%) | Yes (NOT NULL) | NULL | user-entered | `vtiger_field` 1748 "Silo Tax"; `.cf_1747` |
| Sales Group | Sales group the account is assigned to (used in sales-rep list resolution) | reference/enum | No | NULL | user-entered | `vtiger_field` 1829 "Sales Group"; `.cf_1706`; cf. `Accounts.php:522 getSalesRepListId` |
| Sales Last 12 | Trailing-12-month sales total | money | Yes (NOT NULL) | NULL | derived | `vtiger_field` 1837 "Sales Last 12"; `.cf_1836` |
| Returns Last 12 | Trailing-12-month returns total | money | Yes (NOT NULL) | NULL | derived | `vtiger_field` 1839 "Returns Last 12"; `.cf_1838` |
| Prorated Returns | Whether returns are prorated for the trailing-12 calculation | boolean | Yes (NOT NULL) | NULL | system-set | `vtiger_field` 1841 "Prorated Returns"; `.cf_1840` |
| 24-Month Payment History | Serialized 24-month payment-history code string | text/serialized | No | `000000000000000000000000` | system-set | `vtiger_field` 1881 "24 month payment history"; `.cf_1881`; cf. `AccountStatement.php:5313 update24MonthPaymentHistory` |
| Sales MTD | Month-to-date sales total | money | Yes (NOT NULL) | NULL | derived | `vtiger_field` 1882 "Sales MTD"; `.cf_1882` |
| Sales YTD | Year-to-date sales total | money | Yes (NOT NULL) | NULL | derived | `vtiger_field` 1883 "Sales YTD"; `.cf_1883` |
| Returns MTD | Month-to-date returns total | money | Yes (NOT NULL) | NULL | derived | `vtiger_field` 1884 "Returns MTD"; `.cf_1884` |
| Returns YTD | Year-to-date returns total | money | Yes (NOT NULL) | NULL | derived | `vtiger_field` 1885 "Returns YTD"; `.cf_1885` |
| Last Month Sales | Prior calendar month's sales total (label inferred, not confirmed against a direct `vtiger_field` lookup) | money | No | NULL | derived | `vtiger_field` 3014 "Last Month Sales" (inferred); cf. `AccountStatement.php:5212 calculateLastMonthNetSales`; `.cf_3014` |
| Last Month Returns | Prior calendar month's returns total (label inferred) | money | No | NULL | derived | `vtiger_field` 3013 "Last Month Returns" (inferred); `.cf_3013` |
| YTD Comparison | Year-over-year sales comparison figure | money/number | Yes (NOT NULL) | NULL | derived | `vtiger_field` 1886 "YTD Comparison"; `.cf_1886` |
| Show SC Popup | Whether the "SC" popup should display for this account — abbreviation unexpanded, meaning unclear, see Known Gaps | boolean | No | NULL | system-set | Column name; `.showscpopup` — **Open Question**: expand "SC" |
| Default SO Markup/Discount % | Default markup or discount percentage applied to new orders for this account | number(%) | Yes (NOT NULL) | NULL | user-entered | `vtiger_field` 2013 "Default SO Markup/Discount %"; `.acc_discount` |
| Statement Comments | Free-text comments shown on the account's statement | text | Yes (NOT NULL) | NULL | user-entered | `vtiger_field` 2070 "Statement Comments"; `.acf_comments` |
| Current Statement Comment | The currently-active statement comment (denormalized/computed from the four cycle-specific comments below) | text | No | NULL | derived | `vtiger_field` 4538 "Current Statement Comment"; `.stmt_comment_current` |
| 1 Billing Cycle Statement Comment | Comment shown on statement when the account is 1 cycle past due | text | Yes (NOT NULL) | NULL | user-entered | `vtiger_field` 3001 "1 Billing Cycle Statement Comment"; `.stmt_comment_1` |
| 2 Billing Cycle Statement Comment | Comment shown when 2 cycles past due | text | Yes (NOT NULL) | NULL | user-entered | `vtiger_field` 3002 "2 Billing Cycle Statement Comment"; `.stmt_comment_2` |
| 3 Billing Cycle Statement Comment | Comment shown when 3 cycles past due | text | Yes (NOT NULL) | NULL | user-entered | `vtiger_field` 3003 "3 Billing Cycle Statement Comment"; `.stmt_comment_3` |
| 3+ Billing Cycle Statement Comment | Comment shown when more than 3 cycles past due | text | Yes (NOT NULL) | NULL | user-entered | `vtiger_field` 3004 "3+ Billing Cycle Statement Comment"; `.stmt_comment_4` |
| Statement Comment 1 Display Until | Expiration date for the 1-cycle comment | date | No | NULL | user-entered | `vtiger_field` 3005; `.stmt_comment_1_date` |
| Statement Comment 2 Display Until | Expiration date for the 2-cycle comment | date | No | NULL | user-entered | `vtiger_field` 3006; `.stmt_comment_2_date` |
| Statement Comment 3 Display Until | Expiration date for the 3-cycle comment | date | No | NULL | user-entered | `vtiger_field` 3007; `.stmt_comment_3_date` |
| Statement Comment 3+ Display Until | Expiration date for the 3+-cycle comment | date | No | NULL | user-entered | `vtiger_field` 3008; `.stmt_comment_4_date` |
| Statement Transaction Type | Which transaction-type mode the statement uses (e.g. "Hybrid OI") | enum | Yes (NOT NULL) | `Hybrid OI` | user-entered | `vtiger_field` 3015 "Statement Transaction Type"; `.cf_statement_trans_type` |
| Apply Return Credits To Related SO | Whether return credits auto-apply to the related SO | boolean | Yes (NOT NULL) | `No` | user-entered | `vtiger_field` 3026 "Apply Return Credits To Related SO"; `.applycreditstorelatedso` |
| Special Notes | Free-text special notes | text | No | NULL | user-entered | `vtiger_field` 3052 "Special Notes"; `.cf_3031` |
| Printed On | Free-slot field currently labeled "Printed On" | text | No | NULL | user-entered | `vtiger_field` 3053 "Printed On"; `.cf_3032` |
| Default SO General Comment | Default free-text comment auto-populated on new orders for this account | text | Yes (NOT NULL) | NULL | user-entered | `vtiger_field` 3059 "Default SO General Comment"; `.so_gen_cmt` |
| SO General Comment Display Until | Expiration date for the default SO comment | date | No | NULL | user-entered | `vtiger_field` 3060 "SO General Comment Display Until"; `.so_gen_cmt_date` |
| Sales Defect Rate (%) | Computed defect/return-rate percentage for the account | number(%) | Yes (NOT NULL) | `0` | derived | `vtiger_field` 3070 "Sales Defect Rate (%)"; `.sdr` |
| Display Total Owed On Invoice | Whether the running Total Owed figure prints on invoices | boolean | Yes (NOT NULL) | `Yes` | user-entered | `vtiger_field` 3072 "Display Total Owed On Invoice"; `.print_total_owed` |
| Apply Return Credits To Oldest SO | Whether return credits auto-apply to the account's oldest open SO | boolean | Yes (NOT NULL) | `No` | user-entered | `vtiger_field` 3075 "Apply Return Credits To Oldest SO"; `.applycreditstooldestso` |
| Applied Amount Column In Statement | Whether an "Applied Amount" column is shown on the statement | boolean | Yes (NOT NULL) | `No` | user-entered | `vtiger_field` 3077 "Applied Amount Column In Statement"; `.amountapplied` |
| Total Owed Column In Statement | Whether a "Total Owed" column is shown on the statement | boolean | Yes (NOT NULL) | `No` | user-entered | `vtiger_field` 3078 "Total Owed Column In Statement"; `.amountremaining` |
| Is Default Template (unlabeled) | No `vtiger_field` row; likely marks this account's config as a template for new-account defaults — meaning unclear, see Known Gaps | boolean | Yes (NOT NULL) | `No` | unclear | `.isdefaulttemplate` — **Open Question** |
| QB Profile Setting | Which QuickBooks company/profile config applies to this account | text | Yes (NOT NULL) | `Company QB Settings` | system-set | `vtiger_field` 3112 "QB Profile Setting"; `.cf_qbprofile` |
| A/R Type | Accounts-receivable accounting basis (Open Item vs. other) | enum | Yes (NOT NULL) | `Open Item` | system-set | `vtiger_field` 3202 "A/R Type"; `.cf_ar_type` |
| Rebate Tracker Customer Type | Customer-type classification used by the Rebate Tracker feature | enum | No | NULL | user-entered | `vtiger_field` 3245 "Rebate Tracker Customer Type"; `.rbtcustomertype` |
| Rebate Tracker Customer Type 2 | Secondary Rebate Tracker classification | enum | No | NULL | user-entered | `vtiger_field` 3282 "Rebate Tracker Customer Type 2"; `.rbtcustomertype2` |
| Reprint All Invoices With Statement Batch | Whether all invoices are auto-reprinted alongside the batch statement run | boolean | Yes (NOT NULL) | `No` | user-entered | `vtiger_field` 3264 "Reprint all invoices along with statement batch"; `.reprintinvoices` |
| Default Company Profile | Default company/profile used for this account's documents | enum | Yes (NOT NULL) | `Default` | system-set | `vtiger_field` 3281 "Default Company Profile"; `.cf_defcompanyprofile` |
| Invoice Style | Which invoice print style/layout is used | enum | Yes (NOT NULL) | `Default` | user-entered | `vtiger_field` 3353 "Invoice Style"; `.cf_invoice_style` |
| Credit Invoice Email | How credit-invoice notifications are delivered | enum | Yes (NOT NULL) | `Email` | user-entered | `vtiger_field` 3370 "Credit invoice email"; `.cf_credit_so_email` |
| Statement Sequence | Sort order used when generating the statement | enum | Yes (NOT NULL) | `By Date` | user-entered | `vtiger_field` 3373 "Statement Sequence"; `.cf_stmt_sort` |
| Sales Area | Geographic/organizational sales-area classification | enum | No | NULL | user-entered | `vtiger_field` 3387 "Sales Area"; `.cf_salesarea` |
| Invoice/Statement Terms Name | Display name of the invoice/statement payment terms | text | Yes (NOT NULL) | NULL | user-entered/derived | `vtiger_field` 3398 "Invoice/Statement Terms Name"; `.cf_customterm` |
| Backorder/Cancel Default | Default resolution for out-of-stock lines: backorder vs. cancel | enum | No | `Default Option` | user-entered | `vtiger_field` 3551 "Backorder/Cancel Default"; `.backorderedi` |
| Card on File (legacy, no gateway suffix) | A single stored card token/reference, no UI label — appears superseded by the per-card table (drift) and the gateway-specific variants below, see Known Gaps | text | Yes (NOT NULL) | NULL | unclear | `.card_on_file` — **Open Question** |
| Card on File Description (legacy) | Display description for the legacy card-on-file token | text | Yes (NOT NULL) | NULL | unclear | `.card_on_file_desc` — **Open Question** |
| Card on File Type (legacy) | Card brand/type for the legacy card-on-file token | text | Yes (NOT NULL) | NULL | unclear | `.card_on_file_type` — **Open Question** |
| Card on File (Expinet) | Stored card token/reference for the Expinet payment gateway | text | Yes (NOT NULL) | NULL | system-set (integration) | `.card_on_file_expinet` |
| Card on File Description (Expinet) | Display description for the Expinet-stored card | text | Yes (NOT NULL) | NULL | system-set (integration) | `.card_on_file_desc_expinet` |
| Card on File Type (Expinet) | Card brand/type for the Expinet-stored card | text | Yes (NOT NULL) | NULL | system-set (integration) | `.card_on_file_type_expinet` |
| Card on File (CardConnect) | Stored card token/reference for the CardConnect gateway — relationship to the dedicated CardConnect vault-profile table not fully confirmed, see Known Gaps | text | Yes (NOT NULL) | NULL | system-set (integration) | `.card_on_file_cardconnect` — **Open Question** |
| Card on File Description (CardConnect) | Display description for the CardConnect-stored card | text | Yes (NOT NULL) | NULL | system-set (integration) | `.card_on_file_desc_cardconnect` |
| Card on File Type (CardConnect) | Card brand/type for the CardConnect-stored card | text | Yes (NOT NULL) | NULL | system-set (integration) | `.card_on_file_type_cardconnect` |
| Priority Payment Contact ID | Linked contact id in the Priority Payment gateway (used to fetch previously-used cards) | reference | No | NULL | system-set (integration) | Column name; cf. `priorityPaymentAcctData.php:16 getAccountPPPreviousCard`; `.priority_payment_contact_id` |
| Statement Email | How the statement is delivered (email/fax/etc.) | enum | Yes (NOT NULL) | `Email` | user-entered | `vtiger_field` 3552 "Statement Email"; `.cf_acc_stmt_email` |
| Display Total Owed On ROA Receipt | Whether Total Owed prints on ROA/deposit receipts | boolean | Yes (NOT NULL) | `Yes` | user-entered | `vtiger_field` 3594 "Display Total Owed On ROA Receipt"; `.cf_total_owed_roa` |
| Username | B2B/portal login username for this account (legacy field — see also the dedicated B2B Username field below) | text | No | NULL | system-set | Column name; cf. `Accounts.php:124 authenticate_account`; `.username` |
| Password | B2B/portal login password (legacy field, plaintext-shaped column — flagged for security review in a later pass) | text | No | NULL | system-set | Column name; cf. `Accounts.php:124 authenticate_account`; `.password` |
| Allow B2B Access | Whether this account is permitted to log into the B2B storefront | boolean | No | NULL | user-entered | `vtiger_field` 3831 "Allow B2B Access"; `.cf_allow_b2b_access` |
| B2B Username | Username for the B2B storefront login | text | No | NULL | user-entered | `vtiger_field` 3832 "B2B Username"; `.cf_b2b_username`; cf. `B2BAccountUsernameValidation.php` |
| B2B Password | Password for the B2B storefront login | text | No | NULL | user-entered | `vtiger_field` 3833 "B2B Password"; `.cf_b2b_password` |
| B2B Catalog Access | Which product catalog(s) this account can browse on the B2B storefront | json (multi-select) | No | NULL | user-entered | `vtiger_field` 3843 "B2B Catalog Access"; `.cf_b2b_catalog_access` |
| B2B Order Locations Allowed | Which store/branch locations this account can order from via B2B | json (multi-select) | No | NULL | user-entered | `vtiger_field` 3847 "B2B Order Locations Allowed"; `.cf_b2b_order_locations_allowed` |
| B2B Front-End Account ID (unlabeled) | No `vtiger_field` row; the corresponding account id on the separate B2B front-end site, used by the B2B REST sync — relationship to the field below unconfirmed, see Known Gaps | identifier | No | NULL | cross-module/system-set (integration) | `.cf_b2b_fe_accounts_id` — **Open Question** |
| B2B Account ID (unlabeled, alt) | No `vtiger_field` row; a second B2B-account-id-shaped column — relation to the field above unconfirmed, see Known Gaps | identifier | No | NULL | cross-module/system-set (integration) | `.cf_b2b_accountid` — **Open Question** |
| Pwct Exceptions | Free-text field labeled "Pwct Exceptions" — abbreviation not expanded, see Known Gaps | text | No | NULL | user-entered | `vtiger_field` 3901 "Pwct Exceptions"; `.cf_coretype_exceptions` — **Open Question**: expand "Pwct" |
| Packing Slip Format | Which packing-slip layout is used | enum | Yes (NOT NULL) | `Default` | user-entered | `vtiger_field` 3923 "Packing Slip Format"; `.cf_packing_slip_format` |
| Account Statement Address Source | Whether the statement uses the account's default location address or the main company address | enum | No | `Account Default Location Address` | user-entered | `vtiger_field` 3952 "Account Statement Address Source"; `.accstmtaddressoption` |
| Master Price Level (MPL) | Which Master Price Level schedule applies to this account (drives the MPL Exception entity) | reference/enum | No | 0 | user-entered | `vtiger_field` 4066 "Master Price Level (MPL)"; `.cf_marginpricelevel` |
| Non-Stock Special Order Arrival Notification | Whether the account is notified when a special-order non-stock item arrives | boolean | No | `No` | user-entered | `vtiger_field` 4130 "Non-Stock Special Order Arrival Notification"; `.cf_spl_order_notification` |
| Include Shipping Charges On SO | Whether shipping charges are itemized directly on the SO for this account | boolean | No | `No` | user-entered | `vtiger_field` 4200 "Include Shipping Charges On SO"; `.include_shipping_on_so` |
| Operation Mode in Batch Statement | Whether batch statements are generated per-account (Individual) or combined (Consolidated) | enum | No | `Individual` | user-entered | `vtiger_field` 4212 "Operation Mode in Batch Statement"; `.operation_mode_batch_stmt` |
| Will Call Tax Override | Whether a will-call-specific tax override applies to this account | boolean | No | `No` | user-entered | `vtiger_field` 4217 "Will Call Tax Override"; `.cf_willcall_tax_override` |
| Use Authorized Contact | Whether an authorized-purchaser contact restriction applies to this account | boolean | No | `No` | user-entered | `vtiger_field` 4283 "Use Authorized Contact"; `.cf_use_authorized_contact` |
| Authorized Contact Print In SO Document | Whether the authorized contact's name prints on SO documents | boolean | No | `No` | user-entered | `vtiger_field` 4284 "Authorized Contact Print In SO Document"; `.cf_authorized_contact_print` |
| Default Authorized Contact | The default authorized-purchaser contact for this account | reference (to Contact) | No | 0 | user-entered | `vtiger_field` 4285 "Default Authorized Contact"; `.cf_authorized_contact_default` |
| Can Order | Whether the account is currently permitted to place orders (a coarser gate than Lockout/Past Due Lockout) | boolean | No | `Yes` | system-set | `vtiger_field` 4313 "Can Order"; `.cf_canorder` |
| Add Misc SO Fee | Whether the miscellaneous SO fee applies by default to this account's orders | boolean | No | `No` | user-entered | `vtiger_field` 4315 "Add misc SO Fee"; `.miscsofee` |
| Apply Delivery Charge | Whether a delivery charge applies by default to this account's orders | boolean | No | `No` | user-entered | `vtiger_field` 4317 "Apply Delivery Charge"; `.cf_apply_delivery_charge` |
| Salesman Can Be Changed | Whether the assigned salesperson can be changed on this account's orders | boolean | No | `No` | user-entered | `vtiger_field` 4321 "Salesman Can Be Changed"; `.cf_ma_salesman_can_be_changed` |
| Liquor License Type | Type of liquor license on file, for regulated-goods accounts | enum | No | NULL | user-entered | `vtiger_field` 4621 "Liquor License Type"; `.cf_liquor_license_type` |
| Do NOT Allow Deposits | Whether this account is barred from having deposits recorded against its orders | boolean | No | `No` | user-entered | `vtiger_field` 4633 "Do NOT Allow Deposits"; `.cf_do_not_allow_deposits` |
| Finance Charge Apply By Job | Whether finance charges are computed per-job rather than per-account | boolean | No | `No` | user-entered | `vtiger_field` 4372 "Finance Charge Apply By Job"; `.finance_charge_job`; cf. `AccountStatement.php:4704 updateJobBillingCycleInfo` |
| First Sale Date | Date of the account's first-ever sale | date | No | NULL | derived | `vtiger_field` 4422 "First Sale Date"; `.cf_ma_firstsale_date` |
| First Sale SO ID (unlabeled) | The SO id of the account's first-ever sale, paired with First Sale Date — meaning plausible but not independently confirmed, see Known Gaps | reference (to Sales Order) | No | 0 | derived | Column name; `.ma_firstsale_soid` — **Open Question** |
| Send Invoice Weekly | Whether invoices are batched and sent weekly for this account | boolean | No | `No` | user-entered | `vtiger_field` 4436 "Send invoice weekly"; `.cf_sendinvoiceweekly` |
| Day to Send Invoice | Which day of the week weekly invoices are sent | enum | No | NULL | user-entered | `vtiger_field` 4437 "Day to send invoice"; `.cf_daytosendinvoice` |
| Show Discount on Statement | Whether discount amounts are itemized on the statement | enum | No | `No` | user-entered | `vtiger_field` 4439 "Show Discount on statement"; `.cf_show_disc_on_stmt` |
| Minimum Amount to Apply Finance Charge | Balance threshold below which no finance charge is applied | money | No | `0.00` | user-entered | `vtiger_field` 4487 "Minimum Amount to Apply Finance Charge"; `.cf_min_amt_to_apply_fc` |
| Innov8 Print Statement | Whether statements print via the "Innov8" print integration | boolean | No | `No` | user-entered | `vtiger_field` 4528 "Innov8 Print Statement"; `.cf_print_innov8_code` |
| Innov8 Sort Comment | Sort key/comment used by the Innov8 print integration | text | No | NULL | system-set | `vtiger_field` 4539 "Innov8 Sort Comment"; `.cf_innov8_sort_stmt_comment` |
| Do Not Allow Deposits — Once Per Day flag (unlabeled) | No `vtiger_field` row; name suggests a once-per-day throttle on some account operation — meaning unclear, see Known Gaps | text | No | NULL | unclear | `.cf_once_per_day` — **Open Question** |
| Email Credit Invoices Only | Whether only credit-type invoices (not regular invoices) are emailed for this account | boolean | No | `No` | user-entered | `vtiger_field` 3686 "Email Credit Invoices Only"; `.cf_email_creditinvoice_only` |
| Shipping Mark Up | Whether shipping charges are marked up as a direct dollar increase or a percentage | enum | No | `Direct Price Increase` | user-entered | `vtiger_field` 3703 "Shipping Mark Up"; `.cf_shipping_markup` |
| Shipping Mark Up Amount | The dollar or percentage markup value applied to shipping | money/number(%) | No | NULL | user-entered | `vtiger_field` 3704 "Shipping Mark Up Amount"; `.cf_shipping_markup_amount` |
| Contact Information | Free-text/JSON contact-information blob distinct from the primary Contact First/Last Name fields | text/json | No | NULL | user-entered | `vtiger_field` 3706 "Contact Information"; `.cf_contact_information`; cf. `Accounts.php:949 getContactInformationList` |
| Display Previous Balance | How the previous balance is shown on the statement | enum | No | `Show previous open item detail` | user-entered | `vtiger_field` 3632 "Display Previous Balance"; `.cf_stmt_previousbalance` |
| Display Payment Detail | Whether payment detail lines are shown on the statement | enum | No | `Yes` | user-entered | `vtiger_field` 3633 "Display Payment Detail"; `.cf_stmt_paymentdetail` |
| Reseller Permit Expiration Date | Expiration date of the account's reseller/exemption permit | date | No | NULL | user-entered | `vtiger_field` 3609 "Reseller Permit Expiration Date"; `.cf_reseller_permit_exp_dt` |
| Fanbuilder Status | Status of the account's Fanbuilder (FB) e-commerce integration signup | enum | No | `NA` | system-set (integration) | `vtiger_field` 4636 "Fanbuilder Status"; `.cf_ma_fb_status`; cf. `fbcustomer_ajax_action.php` |
| Fanbuilder ID (unlabeled) | External Fanbuilder-side customer/account id — presumed by adjacency to Fanbuilder Status, not confirmed, see Known Gaps | identifier | No | NULL | system-set (integration) | Column name; `.cf_ma_fb_id` — **Open Question** |
| Last Changed | Auto-updating timestamp of the most recent change to this custom-fields row | datetime | Yes (NOT NULL) | CURRENT_TIMESTAMP | system-set | Column name; `.lastchanged` |
| Merchant Customer ID (unlabeled) | No `vtiger_field` row; name suggests a payment-gateway customer id, not confirmed against a specific integration in this pass, see Known Gaps | identifier | No | NULL | unclear | `.mx_customerid` — **Open Question** |

### Billing Address

Backed by `vtiger_accountbillads`, 1:1 with the header via `accountaddressid` = `accountid`.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Billing Address Row ID | Internal row primary key (distinct from the 1:1 join key) | identifier | Yes | auto_increment | system-set | `.id` |
| Account (join key) | The Account this billing address belongs to (1:1) | reference (to Account) / identifier | Yes | 0 | system-set | `.accountaddressid` |
| Billing C/O | Care-of name for billing | text | No | none | user-entered | `vtiger_field` 4224 "C/O"; `.bill_careof` |
| Billing City | City | text | No | NULL | user-entered | `vtiger_field` 24 "Billing City"; `.bill_city` |
| Billing Code | Postal/ZIP code | text | No | NULL | user-entered | `vtiger_field` 28 "Billing Code"; `.bill_code` |
| Billing County | County | text | No | NULL | user-entered | `vtiger_field` 1048 "Billing County"; `.bill_county` |
| Billing Country | Country | text | No | NULL | user-entered | `vtiger_field` 30 "Billing Country"; `.bill_country` |
| Billing State | State/province | text | No | NULL | user-entered | `vtiger_field` 26 "Billing State"; `.bill_state` |
| Billing Street | Street line | text | No | NULL | user-entered | `vtiger_field` 22 "Billing Address"; `.bill_street` |
| Billing Address 2 (PO Box) | Second address line / PO box | text | No | NULL | user-entered | `vtiger_field` 32 "Billing Address 2"; `.bill_pobox` |
| General Master Account Notes | Notes about the master account, surfaced from the billing-address block in EditView/DetailView (same field name is copied to SalesOrder at SO-creation time) | text | No | NULL | user-entered | `vtiger_field` 3189 "General Master Account Notes"; `.acc_gen_notes` |
| Billing Notes (unlabeled) | A second notes-shaped column distinct from General Master Account Notes; no `vtiger_field` row — relationship unconfirmed, see Known Gaps | text | No | NULL | unclear | `.billing_notes` — **Open Question** |
| Is Default | Whether this is the account's default billing address (schema supports multiple; current UI/code usage confirms only a single row per account in practice) | boolean | Yes | `No` | system-set | Column name; `.isdefault` |
| Billing Block | Block number for the billing address | text | No | none | user-entered | `vtiger_field` 4259 "Billing Block"; `.billing_block` |
| Billing Lot | Lot number for the billing address | text | No | none | user-entered | `vtiger_field` 4258 "Billing Lot"; `.billing_lot` |

### Shipping Address

Backed by `vtiger_accountshipads`, 1:1 with the header the same way.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Shipping Address Row ID | Internal row primary key | identifier | Yes | auto_increment | system-set | `.id` |
| Account (join key) | The Account this shipping address belongs to (1:1) | reference (to Account) / identifier | Yes | 0 | system-set | `.accountaddressid` |
| Shipping City | City | text | No | NULL | user-entered | `vtiger_field` 25 "Shipping City"; `.ship_city` |
| Shipping Code | Postal/ZIP code | text | No | NULL | user-entered | `vtiger_field` 29 "Shipping Code"; `.ship_code` |
| Shipping County | County | text | No | NULL | user-entered | `vtiger_field` 1049 "Shipping County"; `.ship_county` |
| Shipping Country | Country | text | No | NULL | user-entered | `vtiger_field` 31 "Shipping Country"; `.ship_country` |
| Shipping State | State/province | text | No | NULL | user-entered | `vtiger_field` 27 "Shipping State"; `.ship_state` |
| Shipping Address 2 (PO Box) | Second address line / PO box | text | No | NULL | user-entered | `vtiger_field` 33 "Shipping Address 2"; `.ship_pobox` |
| Shipping Street | Street line | text | No | NULL | user-entered | `vtiger_field` 23 "Shipping Address"; `.ship_street` |
| General Master Account Notes (unlabeled here) | Notes-shaped column mirroring the billing-address field of the same name, no distinct `vtiger_field` row on this table — relationship unconfirmed, see Known Gaps | text | Yes (NOT NULL) | NULL | unclear | `.acc_gen_notes` — **Open Question** |
| Shipping Address Notes | Free-text delivery notes | text | Yes (NOT NULL) | NULL | user-entered | `vtiger_field` 4143 "Shipping Address Notes"; `.shipping_notes` |
| Is Default | Whether this is the account's default shipping address | boolean | Yes | `No` | system-set | Column name; `.isdefault` |
| Shipping Phone | Phone number for the shipping contact | text | No | NULL | user-entered | `vtiger_field` 4237 "Shipping Phone"; `.ship_phone` |
| Shipping Fax | Fax number for the shipping contact | text | No | NULL | user-entered | `vtiger_field` 4238 "Shipping Fax"; `.ship_fax` |
| Shipping Block | Block number for the shipping address | text | No | none | user-entered | `vtiger_field` 4255 "Shipping Block"; `.shipping_block` |
| Shipping Lot | Lot number for the shipping address | text | No | none | user-entered | `vtiger_field` 4254 "Shipping Lot"; `.shipping_lot` |

### Account Ad/Marketing Association

Backed by `vtiger_accountads`. No `vtiger_field` rows (not a Studio-managed entity) — meanings
inferred from column names and code usage.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Row ID | Primary key | identifier | Yes | auto_increment | system-set | `.accountadsid` |
| Account | The account this ad association belongs to | reference (to Account) | Yes | NULL | system-set | `.accountid` |
| Category IDs | Comma-delimited list of ad-category ids the account is associated with | text (delimited list) | Yes | NULL | user-entered | `.categoryids`; cf. `SaveAccountAds.php` |
| Ad IDs | Comma-delimited list of specific ad ids the account is associated with | text (delimited list) | Yes | NULL | user-entered | `.adids` |
| Sequence | Comma-delimited display-order values paired with the category/ad lists | text (delimited list) | Yes | NULL | user-entered | `.sequence` |
| Sequence ID | Identifier correlating a specific sequence entry | text | Yes | NULL | system-set | `.sequenceid` |

### Account Auto (Vehicle)

Backed by `vtiger_accountsautos`. No `vtiger_field` rows.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Auto ID | Primary key | identifier | Yes | auto_increment | system-set | `.autoid` |
| Account | The account (customer) this vehicle belongs to | reference (to Account) | Yes | NULL | system-set | `.account_id` |
| Account Number | Denormalized copy of the account's number | text | No | NULL | derived | `.account_number` |
| Auto Info | Free-text vehicle description (year/make/model style) | text | No | NULL | user-entered | `.autoinfo` |
| VIN | Vehicle Identification Number | text | No | NULL | user-entered | `.vin` |
| Auto Info Code | Coded/normalized version of the vehicle description | text | No | NULL | derived | `.autoinfocode` |
| License Plate | License plate number | text | Yes (NOT NULL) | NULL | user-entered | `.license` |
| State Code | State the license plate is registered in | text | No | NULL | user-entered | `.statecode` |
| Unit Number | Fleet/unit number, for commercial accounts | text | Yes (NOT NULL) | NULL | user-entered | `.unit` |
| Last Mileage | Last recorded odometer reading | text (numeric-shaped) | Yes (NOT NULL) | NULL | user-entered | `.lastmileage` |
| Time In | Timestamp/description of when the vehicle was last checked in | text | Yes (NOT NULL) | NULL | system-set | `.timein` |
| Last SO | The SO number of the vehicle's last associated service order | text | Yes (NOT NULL) | NULL | derived | `.lastso` |
| Last SO Date | Date of the last associated service order | date | No | NULL | derived | `.lastsodate` |
| Car Notes | Free-text notes about the vehicle | text | Yes (NOT NULL) | NULL | user-entered | `.carnotes` |
| Phone | Phone number associated with the vehicle record (e.g. driver's phone) | text | Yes (NOT NULL) | NULL | user-entered | `.phone` |
| Driver | Name of the vehicle's driver | text | Yes (NOT NULL) | NULL | user-entered | `.driver` |
| Engine | Engine type/code | text | Yes (NOT NULL) | NULL | user-entered | `.engine` |
| Engine Details | Free-text engine detail | text | Yes (NOT NULL) | NULL | user-entered | `.enginedetails` |
| Transmission | Transmission type/code | text | Yes (NOT NULL) | NULL | user-entered | `.transmission` |
| Transmission Details | Free-text transmission detail | text | Yes (NOT NULL) | NULL | user-entered | `.transmissiondetails` |
| Auxiliary 1/2/3 | Up to three free-slot auxiliary equipment/attribute codes | text (×3) | Yes (NOT NULL) | NULL each | user-entered | `.aux1`, `.aux2`, `.aux3` |
| Auxiliary 1/2/3 Details | Free-text detail paired with each auxiliary code | text (×3) | Yes (NOT NULL) | NULL each | user-entered | `.aux1details`, `.aux2details`, `.aux3details` |
| Vehicle Color | Vehicle color | text | Yes (NOT NULL) | NULL | user-entered | `.vehiclecolor` |
| Catalog Info | Free-text/JSON parts-catalog lookup info for this vehicle | text/json | No | NULL | derived | `.cataloginfo` |
| Deleted | Soft-delete flag | boolean | Yes | 0 | system-set | `.deleted` |
| Created Time | Record creation timestamp | datetime | Yes | NULL | system-set | `.createdtime` |
| Modified Time | Record last-modified timestamp | datetime | Yes | NULL | system-set | `.modifiedtime` |

### Open-Item Statement Line

Backed by `fuse5_statementdata`. No `vtiger_field` rows — a pure working/output table populated by
the statement-generation logic, not a Studio-managed entity.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Statement Data Row ID | Primary key | identifier | Yes | auto_increment | system-set | `.statementdataid` |
| Sales Order | The SO this statement line represents | reference (to Sales Order) | Yes | 0 | system-set | `.salesorderid` |
| SO Number | Denormalized SO number | text | Yes | NULL | derived | `.salesorder_no` |
| Invoice Number | Denormalized invoice number | text | Yes | NULL | derived | `.invoice_no` |
| Customer PO | Denormalized customer PO number | text | No | none | derived | `.customerpo` |
| Total | Total amount of the SO/invoice line | money | No | 0.000 | derived | `.total` |
| Account | The account this line was generated for | reference (to Account) | No | 0 | system-set | `.accountid` |
| Originating Account | The originating account, when this line is attributed to a different (e.g. child) account than the one it's grouped under | reference (to Account) | No | 0 | system-set | `.orgaccountid` |
| Job | The job this line is associated with, if any | reference (to Job) | No | 0 | system-set | `.jobid` |
| Relationship (denormalized) | Denormalized copy of the account's Relationship custom field | text | No | none | derived | `.cf_826` |
| Paid Amount | Amount paid to date on this line | money | Yes | 0.00 | derived | `.paidamt` |
| Update Date | Date the underlying record was last updated | date | No | NULL | system-set | `.updatedate` |
| Finalize Date | Date the underlying SO was finalized | date | No | NULL | system-set | `.sofinalizetime` |
| Payment Method | Payment method recorded on the line | text | Yes | NULL | derived | `.paymentmethod` |
| Remaining Amount | Balance remaining on this line | money | Yes | 0.00 | derived | `.remainingamount` |
| ROA Flag | Whether this line represents ROA/deposit activity rather than a standard invoice | boolean | Yes | `0` | system-set | `.roa` |
| Check Number | Check number, if paid by check | text | Yes | none | derived | `.checknumber` |
| Deferred Amount | Portion of this line's amount treated as deferred revenue | money | Yes | 0.00 | derived | `.deferredamount` |
| Notes | Free-text notes carried onto the statement line | text | Yes | NULL | derived | `.notes` |
| Adjustment Type | Sub-classification of an adjustment-type line | text(code) | Yes | `0` | system-set | `.adjtype` |
| Print on Statement | Whether this line appears on the printed statement | boolean | Yes | `No` | system-set | `.printonstatement` |
| Child Account Name | Denormalized name of the child/originating account, when different from the grouping account | text | Yes | none | derived | `.childaccountname` |
| Subtype | Deposit / Return Deposit / Gift Card / Refund classification | enum | Yes | NULL | system-set | `.subtype` |
| CN Number | Credit-note number | text | Yes | NULL | system-set | `.cnnumber` |
| CN Created Date | Date the credit note was created | date | No | NULL | system-set | `.cncreateddate` |
| Paid Amount (temp/working) | Working-copy of Paid Amount used mid-computation before the final value is committed | money | Yes | NULL | system-set (transient) | `.temp_paidamt` |
| Remaining Amount (temp/working) | Working-copy of Remaining Amount used mid-computation | money | Yes | NULL | system-set (transient) | `.temp_remainingamount` |
| SO Aging Period | Which aging bucket (e.g. current, 1-cycle, 2-cycle) this line falls into | enum/text | No | none | derived | `.so_aging_period` |

### Statement Deferred/Applied-Adjustment Detail

Backed by `fuse5_statementdeferred`. No `vtiger_field` rows.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Statement Deferred Row ID | Primary key | identifier | Yes | auto_increment | system-set | `.statementdeferredid` |
| ROA/Adjustment | The source ROA/adjustment transaction this deferred detail is drawn from (references SalesOrder's ROA/ADJ ledger) | reference (to Deposit/ROA Transaction) | Yes | NULL | system-set | `.roaadjid` |
| Applied SO Number | The SO number this deferred amount is applied to/against | text | No | NULL | system-set | `.appliedsonum` |
| Deferred Amount | Dollar amount treated as deferred for this application | money | No | NULL | derived | `.deferredamount` |
| Notes | Free-text notes | text | Yes | NULL | system-set | `.notes` |
| Adjustment Type | Sub-classification code | integer(code) | Yes | `0` | system-set | `.adjtype` |
| Expire Date | Expiration date, mirroring the parent ROA/adjustment transaction's own expire date | date | No | NULL | derived | `.expiredate` |

### Statement Archive

Backed by `vtiger_statement_archive`. No `vtiger_field` rows.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Archive Row ID | Primary key | identifier | Yes | auto_increment | system-set | `.statementarchiveid` |
| Date | Date the statement was generated/archived | date | Yes | NULL | system-set | `.date` |
| Account | The account this archived statement belongs to | reference (to Account) | Yes | NULL | system-set | `.accountid` |
| HTML Content | The full rendered statement HTML | text | Yes | NULL | system-set | `.htmlcontent`; cf. `AccountStatement.php:5846 generateHTMLStatementFile` |
| Statement Type | Which statement type (Balance-Forward/Open-Item) was archived | text | Yes | NULL | system-set | `.statementtype` |
| Statement Frequency | Billing frequency in effect at archive time | text | Yes | none | system-set | `.statementfrequency` |
| Statement Record Count | Count of line items included in the archived statement | text (numeric-shaped) | Yes | none | system-set | `.statementrecordcount`; cf. `AccountStatement.php:5351 getStatementRecordCount` |
| Statement Start Date | Start of the date range covered by this statement | date | Yes | NULL | system-set | `.statementstartdate` |
| Statement End Date | End of the date range covered by this statement | date | Yes | NULL | system-set | `.statementenddate` |
| Total Owed | Total-owed figure as of this archived statement | money | Yes | NULL | system-set | `.totalowed` |
| HTML File Path | Filesystem path to a saved copy of the HTML statement, if written to disk | text | Yes | none | system-set | `.htmlfilepath`; cf. `AccountStatement.php:5885 generateAccountStatementFile` |
| CSV File Path | Filesystem path to a saved CSV export, if generated | text | Yes | none | system-set | `.csvfilepath` |
| Display Status | Whether this archived statement is shown in the archive listview | boolean | Yes | `No` | system-set | `.displaystatus` |
| Email Status | Whether/how this statement was emailed (Yes/No/Not Applicable) | enum | Yes | `N/A` | system-set | `.emailstatus`; cf. `AccountStatement.php:5958 sendStatementinMail` |
| From Email | Sender address used when emailing this statement | text | No | NULL | system-set | `.fromemail` |
| To Email | Recipient address used when emailing this statement | text | No | NULL | system-set | `.toemail` |
| Message | Free-text status/error message from the send attempt | text | No | NULL | system-set | `.msg` |

### Batch Statement Snapshot

Backed by `fuse5_batchstatement`. No `vtiger_field` rows — one row per account per batch-statement
run.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Batch Statement Row ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| Account | The account this batch-run snapshot belongs to | reference (to Account) | Yes | NULL | system-set | `.accountid` |
| Account Number | Denormalized account number | text | Yes | NULL | derived | `.accountnumber` |
| Current (snapshot) | Snapshot of the "Current" balance bucket at batch-run time | money | Yes | NULL | derived | `.cf_750` |
| Last Month/Week (snapshot) | Snapshot of the prior period's sales/balance figure | money | Yes | NULL | derived | `.lastmonthorweek` |
| 1 Billing Cycle Past Due (snapshot) | Snapshot of the 1-cycle past-due bucket | money | Yes | NULL | derived | `.cf_752` |
| 2 Billing Cycle Past Due (snapshot) | Snapshot of the 2-cycle past-due bucket | money | Yes | NULL | derived | `.cf_754` |
| 3 Billing Cycle Past Due (snapshot) | Snapshot of the 3-cycle past-due bucket | money | Yes | NULL | derived | `.cf_756` |
| More than 3 Billing Cycle Past Due (snapshot) | Snapshot of the 3+-cycle past-due bucket | money | Yes | NULL | derived | `.cf_758` |
| Deferred (snapshot) | Snapshot of the Deferred balance | money | Yes | NULL | derived | `.cf_760` |
| Total Owed (snapshot) | Snapshot of Total Owed at batch-run time | money | Yes | NULL | derived | `.cf_762` |
| Reprint SO IDs | Delimited list of SO ids flagged for reprint alongside this batch run | text (delimited list) | Yes | NULL | system-set | `.reprintsoids`; cf. `AccountStatement.php:6549 updateReprintInvoicessoids` |
| Statement Time | Unix timestamp identifying which batch run this snapshot belongs to (the correlation key across all accounts in one run) | integer(timestamp) | Yes | NULL | system-set | `.statementtime` |
| Created At | Row insert timestamp | datetime | Yes | CURRENT_TIMESTAMP | system-set | `.created_at` |

### Credit Card on File

Two coexisting mechanisms.

**Legacy per-card table (`vtiger_accountcreditcards`) — referenced live in code but absent from the
live DB. See Known Gaps, Schema Drift #1. This is the module's single most severe risk finding.**
Field shapes below are reconstructed entirely from code SQL (`SELECT *` / explicit `INSERT` column
lists in `ManageAccountCreditCards.php`/`LoadCreditCardDetails.php`), not from a live `DESCRIBE` — the
table itself could not be inspected because it does not exist.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Row ID | Primary key (inferred from `INSERT ... VALUES ('', ...)` pattern) | identifier | Yes | auto_increment (inferred) | system-set | `.accountcreditcardsid`; `ManageAccountCreditCards.php:49` |
| Account | The account this stored card belongs to | reference (to Account) | Yes | NULL | system-set | `.accountid`; `ManageAccountCreditCards.php:26,49` |
| Credit Card Number | The stored card number (dedup key; masking/tokenization not confirmed from this pass — flagged as a PCI-scope item for a later pass) | text | Yes | NULL | user-entered | `.creditcardnumber`; `ManageAccountCreditCards.php:49` |
| Expiry Date | Card expiration date | text | Yes | NULL | user-entered | `.expirydate`; `ManageAccountCreditCards.php:49` |
| Card Type | Card brand (Visa/MC/etc.) | text | Yes | NULL | user-entered | `.cardtype`; `ManageAccountCreditCards.php:49` |
| Name on Card | Cardholder name | text | Yes | NULL | user-entered | `.nameoncard`; `ManageAccountCreditCards.php:49` |
| CC Zip | Cardholder billing zip code (AVS check) | text | Yes | NULL | user-entered | `.cczip`; `ManageAccountCreditCards.php:49` |

**CardConnect Vault Profile (`lbm_cardconnect_account_profiles`)** — the live, DB-confirmed mechanism
for a tokenized stored card via the CardConnect gateway:

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Row ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| Account | The account this vault profile belongs to | reference (to Account) | No | 0 | system-set | `.account_id` |
| CC Gateway Account ID | CardConnect-side account/vault identifier | text | No | none | system-set (integration) | `.cc_acctid` |
| CC Gateway Profile ID | CardConnect-side stored-profile identifier (the reusable token) | text | No | none | system-set (integration) | `.cc_profileid` |
| Expiry | Card expiration date as reported by the gateway | text | No | none | system-set (integration) | `.expiry` |
| Created Time | Row creation timestamp | datetime | No | CURRENT_TIMESTAMP | system-set | `.createdtime` |
| Modified Time | Row last-updated timestamp | datetime | No | NULL | system-set | `.modifiedtime` |

Note: the account-facing "precard list" widget itself reads from `lbm_cardconnect_log`, a shared,
cross-module CardConnect transaction log also used by SalesOrder-side card processing — not
Accounts-owned, out of scope for this catalog beyond noting the join (`account_id` correlates
transactions back to Account records).

### Masterbrand SPA Code

Backed by `lbm_ma_spa_code`. No `vtiger_field` rows.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Row ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| Account | The account this SPA code entry belongs to | reference (to Account) | Yes | NULL | system-set | `.accountid` |
| Style Code | Product style code the SPA pricing applies to | text | Yes | none | user-entered | `.style_code` |
| Short Name | Short display name for the SPA code entry | text | Yes | none | user-entered | `.short_name` |
| SPA Code | The Special Price Agreement code itself | text | Yes | none | user-entered | `.spa_code` |
| SPA Value | The negotiated special price value | money | Yes | 0.000000 | user-entered | `.spa_value` |
| Builder Price Factor | Pricing multiplier applied for builder/dealer pricing | number | Yes | 0.000000 | user-entered | `.builder_price_factor` |
| Labor Adjustment | Labor-cost adjustment factor tied to this SPA entry | number | Yes | 0.000 | user-entered | `.labor_adjustment` |
| Effective Date | Date this SPA code becomes effective | date | Yes | `0000-00-00` | user-entered | `.effective_date` |
| Expire Date | Date this SPA code expires | date | Yes | `0000-00-00` | user-entered | `.expire_date` |

### MPL (Master Price Level) Exception

Backed by `lbm_account_mpl_exceptions`. No `vtiger_field` rows.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Row ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| Account | The account this MPL exception set belongs to (effectively 1:1 — one exception blob per account) | reference (to Account) | Yes | 0 | system-set | `.accid` |
| MPL Exceptions (JSON) | Serialized JSON structure of per-product/line-code price exceptions overriding the account's assigned Master Price Level | json | No | NULL | user-entered | `.mplexceptions_json`; cf. `MPLExceptionImport.php:21 import_ma_mpl_exception` |

### Account Merge Log

Backed by `fuse5_account_merge_log`. No `vtiger_field` rows.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Row ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| Main (Surviving) Account | The account that survived the merge | reference (to Account) | No | NULL | system-set | `.main_account_id`; cf. `mergeAccounts.php:55-85` |
| Removed Accounts | The account(s) merged into and removed by this operation — stored as a serialized/delimited list rather than one row per removed account (schema-drift-adjacent design choice, see Known Gaps) | text (serialized list) | No | NULL | system-set | `.removed_accounts` |
| Date | Timestamp the merge was performed | datetime | No | NULL | system-set | `.date` |
| User | User who performed the merge | text | No | NULL | system-set | `.user` |

A related supporting table, `lbm_merge_pendingpo_logs`, tracks pending-PO data (`purchaseorderid`,
`ponumber`, `mergedpodata` JSON) carried over during an account merge that involved open purchase
orders — cross-module (Purchasing) plumbing invoked from the same merge flow rather than a distinct
Accounts business entity, and is not itemized here.

### Year-to-Year Sales Summary

Backed by `fuse5_accounty2yinfo`. No `vtiger_field` rows.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Row ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| Account | The account this sales-summary row belongs to | reference (to Account) | Yes | NULL | system-set | `.accountid` |
| Line Code | Product line code this summary row is scoped to | text | Yes | NULL | system-set | `.linecode` |
| Month | Three-letter month code | text | Yes | NULL | system-set | `.month` |
| Year | Four-digit year | integer | Yes | NULL | system-set | `.year` |
| Total Sales | Sales dollar total for this account/line/month/year | money | Yes | NULL | derived | `.totalsales`; cf. `displayQuickAccountY2YInfoCron.php:152 getYnYSalesdata` |
| Total Core Sales | Core-charge portion of sales | money | Yes | 0.00 | derived | `.totalcoresales` |
| Total Cost | Cost-of-goods total | money | Yes | 0.00 | derived | `.totalcost` |
| Total Core Cost | Core-charge portion of cost | money | Yes | 0.00 | derived | `.totalcorecost` |
| Total Return | Returns dollar total | money | Yes | 0.00 | derived | `.totalreturn` |
| Total Core Return | Core-charge portion of returns | money | Yes | 0.00 | derived | `.totalcorereturn` |
| Total Warranty Return | Warranty-related returns dollar total | money | Yes | 0.00 | derived | `.totalwatreturn` |

### Account Document

Backed by `lbm_account_document`. No `vtiger_field` rows.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Row ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| Account | The account this document is attached to | reference (to Account) | Yes | NULL | system-set | `.accountid` |
| Title | Display title/description of the document | text | No | NULL | user-entered | `.title`; cf. `editRelatedDocs.php` |
| Original Filename | The file's original name as uploaded | text | No | NULL | system-set | `.org_filename` |
| Stored Filename | The filename used on disk (obfuscated/system-generated to avoid collisions) | text | No | NULL | system-set | `.sys_filename` |
| Created On | Upload timestamp | datetime | No | NULL | system-set | `.createdon` |
| Created By | User who uploaded the document | reference (to User) | No | NULL | system-set | `.createdby` |
| Deleted On | Soft-delete timestamp | datetime | No | NULL | system-set | `.deletedon` |
| Deleted By | User who deleted the document | reference (to User) | No | NULL | system-set | `.deletedby` |
| Deleted | Soft-delete flag | boolean | No | 0 | system-set | `.deleted`; cf. `documentAjaxAction.php:62 delete_account_documentlist` |

### Product/Line-Code Cross-Reference Mapping

Backed by `vtiger_productmapping`. No `vtiger_field` rows — a shared generic mapping table (not
exclusively Accounts-owned in the schema) managed through the Accounts module's mapping ajax
endpoints.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Mapping ID | Primary key | identifier | Yes | auto_increment | system-set | `.mappingid` |
| CRM ID (product) | The internal product/record id this mapping row cross-references | reference (to Product) | Yes | NULL | system-set | `.crmid`; cf. `CreateMapping.php` |
| Account | The account this customer-specific mapping applies to — **stored as text rather than an int FK, see Known Gaps** | reference (to Account, stored as varchar) | Yes | NULL | system-set | `.accountid` |
| OCS Line Code | The ERP's internal ("OCS") line code | reference/text | Yes | NULL | system-set | `.ocslinecode` |
| OCS Product Number | The ERP's internal product number | text | Yes | NULL | system-set | `.ocsprodnumber` |
| Customer Line Code | The customer's own line-code value for cross-reference | text | Yes | NULL | user-entered | `.custlinecode` |
| Customer Product Number | The customer's own part/product number for cross-reference | text | Yes | NULL | user-entered | `.custprodnumber` |

### Billing-Cycle Definition

Backed by `fuse5_accountbillingcycle`. No `vtiger_field` rows — a small, system-wide lookup/
configuration table (not per-account).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Row ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| Billing Cycle Type | The cycle-frequency type this row configures (correlates to the header extension's "Statement Frequency" values, e.g. Week/Month) | enum(text) | Yes | NULL | system-set | `.billingcycletype` |
| Billing Cycle Name | Display name for this billing-cycle window | text | Yes | NULL | user-entered | `.billingcyclename` |
| Start Date | Start date of the current billing-cycle window | date | No | NULL | user-entered | `.stdate`; cf. `billingcycledate.php` |
| End Date | End date of the current billing-cycle window | date | No | NULL | user-entered | `.enddate` |
| Disabled | Whether this billing-cycle definition is currently disabled | boolean | Yes | `0` | system-set | `.disable` |

**Lookup/Picklist tables** (not given full field-catalog treatment, per the source's own scoping):
`vtiger_accountownership`, `vtiger_accountrating`, `vtiger_accountregion`, `vtiger_accounttype`/`_seq`,
`vtiger_accountdepstatus`, `vtiger_advertise`, `vtiger_cf_statement_trans_type`, `vtiger_cf_
document_preference` — each a simple `(id, label, sortorder, presence)`-shaped picklist with no
additional business meaning beyond the value list itself. Two of these (`vtiger_accountregion`,
`vtiger_accountdepstatus`) and `vtiger_cf_document_preference` have unconfirmed links to any specific
Account column — see Known Gaps.

<!-- Logical types: money / date / datetime / enum / text / reference(to X) / boolean / array
     Never a raw SQL type (varchar, int, etc). -->

## Known Gaps

- **The missing `vtiger_accountcreditcards` table is the single most severe finding in this catalog
  (Schema Drift #1).** `DESCRIBE vtiger_accountcreditcards` fails outright (`ERROR 1146: Table doesn't
  exist`) against the live dev database, yet the table is referenced live and centrally by
  `modules/Accounts/ManageAccountCreditCards.php` (the add-card `INSERT` and both list-cards
  `SELECT *` paths) and `modules/Accounts/LoadCreditCardDetails.php` (the ajax card-lookup endpoint).
  If either of these frequently-hit CRUD/ajax paths executes against an environment where this table
  truly does not exist, every "add card" / "list cards" / "load card details" request fails outright —
  the source explicitly frames this as a live bug risk, not mere documentation noise, and the same
  class of finding as SalesOrder's own `vtiger_inventoryproductrel` drift. The source recommends a
  human/DBA confirm whether the table exists under a renamed form elsewhere, or whether
  `lbm_cardconnect_account_profiles` has superseded it in practice with these legacy files left
  un-migrated. Nothing in this document resolves that question — it is preserved here exactly as
  flagged, and is expected to be escalated as a Critical risk in the risk register.
- **`fuse5_account_merge_log.removed_accounts` stores a serialized/delimited list of account ids
  rather than one row per removed account** — not a broken-reference drift, but a normalization
  choice the source flags as needing an explicit keep-denormalized-vs-normalize-to-child-table
  decision.
- **`vtiger_productmapping.accountid` is typed `varchar(255)`, not an integer FK**, despite every
  other Account-referencing column in this catalog being an `int` — confirmed via live `DESCRIBE`.
  Not necessarily a bug (the column may sometimes hold a delimited multi-account list — unconfirmed),
  but flagged as an inconsistency worth resolving rather than silently carrying forward.
- **`a_bf_oi_totalowed` does not exist as a persistent table — confirmed intentional, not drift.** A
  maintenance script (`ScriptTotalowedBFOI.php`) creates this table itself at runtime via its own
  `CREATE TABLE` statement; it is simply not materialized on the dev snapshot inspected. Directly
  analogous to SalesOrder's `vtiger_soshop` drop-table finding.
- **~180 fields on the header extension table (`vtiger_accountscf`) are the largest single field
  surface in this module**, and the custom-field mechanism backing them is used far more heavily here
  than in SalesOrder (roughly 75% of all Accounts fields vs. SalesOrder's ~24%).
- **24 open questions are carried forward verbatim from the source**, each already flagged inline
  above with "meaning unclear" / "Open Question" / "no UI label" and requiring SME confirmation
  before being assigned a normative business meaning. They cluster into recurring patterns rather
  than being independent one-offs:
  - **Duplicate/unclear-relationship field pairs**: `parentid` ("Member Of") vs. `parentaccountid`
    ("Parent Account"); `cf_714` vs. `cf_710` (two "Core Type" columns); `cf_1497` ("Default
    Location", custom) vs. the header's own `defaultlocation`; `card_on_file`/`card_on_file_desc`/
    `card_on_file_type` (legacy, no gateway suffix) vs. the Expinet- and CardConnect-suffixed
    variants and the missing `vtiger_accountcreditcards` table; `card_on_file_cardconnect` vs. the
    CardConnect vault profile's own `cc_profileid`; `cf_b2b_fe_accounts_id` vs. `cf_b2b_accountid`;
    the two `acc_gen_notes`/`billing_notes`-shaped columns on Billing Address, and the unlabeled
    `acc_gen_notes` on Shipping Address duplicating the billing-side field name.
  - **Unlabeled/no-`vtiger_field`-row columns with only naming-convention-inferred meaning**:
    `ordertype`, `disamount`, `mischarges` (header); `ee_custid`, `cf_732`, `cf_760_return`,
    `isdefaulttemplate`, `cf_once_per_day`, `ma_firstsale_soid`, `cf_ma_fb_id`, `mx_customerid`
    (extension table).
  - **Unexpanded abbreviations**: `showscpopup` ("SC"), `cf_coretype_exceptions` (labeled "Pwct
    Exceptions").
  - **Unconfirmed lookup-table links**: `vtiger_accountregion` and `vtiger_accountdepstatus` (no
    column in `vtiger_account`/`vtiger_accountscf` was confirmed in this pass to reference either);
    `vtiger_cf_document_preference` (presumed to back "Documentation Preference" by naming
    convention only, not a confirmed code citation).
  - Nothing above resolves any of these 24 items — each is carried forward exactly as flagged,
    consistent with the source's own "unclear" designation.
