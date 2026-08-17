# AccountStatement — Entities & Fields

> Every entity, every field, individually. No grouping/summarizing — that's how fields get lost.
> Legacy table/column names are a first-class column in the field catalog below, not an optional
> footnote — this project's whole documentation discipline rests on every claim being traceable to
> a specific source, and a footnote is too easy to skip. See
> `_deviations-from-original-template.md` in this folder.

Source: `docs_from_blueprint/module/Accounts/02-entities-and-fields.md` §§3.7-3.10 (the four dedicated
statement tables) and the statement-configuration fields cataloged within Accounts' extension-table
section (§3.2) — all ultimately traced to `blueprint/module/Accounts/01-entities-fields.md` (Doc1 §01).

## Entity List

| Entity | Purpose |
|---|---|
| Open-Item Statement Line | Working/output table populated by statement generation — one row per SO/invoice line included on a statement. |
| Statement Deferred/Applied-Adjustment Detail | Deferred/applied-amount detail drawn from the ROA/adjustment ledger, shown in the deferred-detail popup. |
| Statement Archive | Persisted record of a generated statement (HTML content and/or file path, delivery status). |
| Batch Statement Snapshot | One row per account per batch-statement run, snapshotting balance/aging figures at run time. |
| Statement-configuration fields (on Account) | ~30 fields governing per-account statement behavior — frequency, type, delivery channel, cycle comments, display toggles, finance-charge settings. Currently stored on Account's own extension table, not a dedicated entity. |

## Field Catalog

### Open-Item Statement Line

Backed by `fuse5_statementdata`. No `vtiger_field` rows — a pure working/output table populated by the
statement-generation logic, not a Studio-managed entity.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Statement Data Row ID | Primary key | identifier | Yes | auto_increment | system-set | `.statementdataid` |
| Sales Order | The SO this statement line represents | reference(to Sales Order) | Yes | 0 | system-set | `.salesorderid` |
| SO Number | Denormalized SO number | text | Yes | NULL | derived | `.salesorder_no` |
| Invoice Number | Denormalized invoice number | text | Yes | NULL | derived | `.invoice_no` |
| Customer PO | Denormalized customer PO number | text | No | none | derived | `.customerpo` |
| Total | Total amount of the SO/invoice line | money | No | 0.000 | derived | `.total` |
| Account | The account this line was generated for | reference(to Account) | No | 0 | system-set | `.accountid` |
| Originating Account | The originating account, when this line is attributed to a different (e.g. child) account than the one it's grouped under | reference(to Account) | No | 0 | system-set | `.orgaccountid` |
| Job | The job this line is associated with, if any | reference(to Job) | No | 0 | system-set | `.jobid` |
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
| ROA/Adjustment | The source ROA/adjustment transaction this deferred detail is drawn from (references SalesOrder's ROA/ADJ ledger) | reference(to Deposit/ROA Transaction) | Yes | NULL | system-set | `.roaadjid` |
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
| Account | The account this archived statement belongs to | reference(to Account) | Yes | NULL | system-set | `.accountid` |
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

Backed by `fuse5_batchstatement`. No `vtiger_field` rows — one row per account per batch-statement run.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Batch Statement Row ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| Account | The account this batch-run snapshot belongs to | reference(to Account) | Yes | NULL | system-set | `.accountid` |
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

### Statement-configuration fields (currently on Account's own extension table)

~30 fields governing statement behavior per account. Per Accounts' own field catalog — full definitions
in `docs_from_blueprint/module/Accounts/02-entities-and-fields.md` §3.2; individually itemized here
since this module owns their *behavior*, not their storage today (see the normalized-schema proposal
in §2.6 below for how the rewrite changes that split).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Statement Type | Which statement format/type is used (Balance-Forward vs. Open-Item) | enum | No | NULL | user-entered | `vtiger_field` 1453 "Statement Type"; `.cf_1452` |
| Statement Frequency | How often statements are generated for this account (e.g. Month/Week) | enum | No | `Month` | user-entered | `vtiger_field` 717 "Statement Frequency"; `.cf_716` |
| Statement Transaction Type | Which transaction-type mode the statement uses (e.g. "Hybrid OI") | enum | Yes (NOT NULL) | `Hybrid OI` | user-entered | `vtiger_field` 3015 "Statement Transaction Type"; `.cf_statement_trans_type` |
| Statement Sequence | Sort order used when generating the statement | enum | Yes (NOT NULL) | `By Date` | user-entered | `vtiger_field` 3373 "Statement Sequence"; `.cf_stmt_sort` |
| Statement Email | How the statement is delivered (email/fax/etc.) | enum | Yes (NOT NULL) | `Email` | user-entered | `vtiger_field` 3552 "Statement Email"; `.cf_acc_stmt_email` |
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
| Account Statement Address Source | Whether the statement uses the account's default location address or the main company address | enum | No | `Account Default Location Address` | user-entered | `vtiger_field` 3952 "Account Statement Address Source"; `.accstmtaddressoption` |
| Operation Mode in Batch Statement | Whether batch statements are generated per-account (Individual) or combined (Consolidated) | enum | No | `Individual` | user-entered | `vtiger_field` 4212 "Operation Mode in Batch Statement"; `.operation_mode_batch_stmt` |
| Applied Amount Column In Statement | Whether an "Applied Amount" column is shown on the statement | boolean | Yes (NOT NULL) | `No` | user-entered | `vtiger_field` 3077 "Applied Amount Column In Statement"; `.amountapplied` |
| Total Owed Column In Statement | Whether a "Total Owed" column is shown on the statement | boolean | Yes (NOT NULL) | `No` | user-entered | `vtiger_field` 3078 "Total Owed Column In Statement"; `.amountremaining` |
| Show Discount on Statement | Whether discount amounts are itemized on the statement | enum | No | `No` | user-entered | `vtiger_field` 4439 "Show Discount on statement"; `.cf_show_disc_on_stmt` |
| Display Previous Balance | How the previous balance is shown on the statement | enum | No | `Show previous open item detail` | user-entered | `vtiger_field` 3632 "Display Previous Balance"; `.cf_stmt_previousbalance` |
| Display Payment Detail | Whether payment detail lines are shown on the statement | enum | No | `Yes` | user-entered | `vtiger_field` 3633 "Display Payment Detail"; `.cf_stmt_paymentdetail` |
| Innov8 Print Statement | Whether statements print via the "Innov8" print integration | boolean | No | `No` | user-entered | `vtiger_field` 4528 "Innov8 Print Statement"; `.cf_print_innov8_code` |
| Innov8 Sort Comment | Sort key/comment used by the Innov8 print integration | text | No | NULL | system-set | `vtiger_field` 4539 "Innov8 Sort Comment"; `.cf_innov8_sort_stmt_comment` |
| Finance Charge | Whether finance charges apply to this account | boolean | No | NULL | user-entered | `vtiger_field` 743 "Finance Charge"; `.cf_742`; cf. `AccountStatement.php:4762 calculateFinanceCharge` |
| Annual Finance Charge Percentage | Annual interest rate used to compute finance charges | number(%) | No | NULL | user-entered | `vtiger_field` 745 "Annual Finance Charge Percentage"; `.cf_744` |
| Minimum Finance Charge | Minimum dollar finance charge applied regardless of computed amount | money | No | NULL | user-entered | `vtiger_field` 747 "Minimum Finance Charge"; `.cf_746` |
| Finance Charge Apply By Job | Whether finance charges are computed per-job rather than per-account | boolean | No | `No` | user-entered | `vtiger_field` 4372 "Finance Charge Apply By Job"; `.finance_charge_job`; cf. `AccountStatement.php:4704 updateJobBillingCycleInfo` |
| Minimum Amount to Apply Finance Charge | Balance threshold below which no finance charge is applied | money | No | `0.00` | user-entered | `vtiger_field` 4487 "Minimum Amount to Apply Finance Charge"; `.cf_min_amt_to_apply_fc` |

## Known Gaps

- The statement-configuration fields above are catalogued individually here, but their full behavior
  (what the statement engine does with each) is documented across `calculations.md`,
  `business-rules-and-validation.md`, and `outputs.md` — this file is the field catalog, not the
  behavior spec.
- No confirmed uniqueness/referential-integrity constraint exists today on Batch Statement Snapshot's
  `statementtime` + `accountid` correlation key in the legacy schema — see §2.6 below and
  `risks-and-open-questions.md`.
- Statement Archive's storage-mode precedence (file-path pointer vs. inline HTML-content blob) is
  implicit in legacy code, not an explicit field — see §2.6 below and `risks-and-open-questions.md`.

## 2.6 Recommended rewrite schema — this session's own design proposal, not a blueprint finding

Accounts' own entities file already anticipated this split, proposing `account_statement_setting` and
`account_statement_cycle_comment` as forward-looking tables even while treating them as part of the
Accounts domain model. This module adopts and extends that proposal as its own owned schema, since the
statement-configuration data is functionally this module's responsibility, not Accounts'.

**Problems this design fixes:**

1. **~30 statement-configuration fields live scattered across Account's flat extension table**, not
   grouped or independently versioned — a change to statement behavior requires touching the same wide
   table as every other unrelated Account concern. **Fix**: `account_statement_setting`, 1:1 with
   Account, owned by this module.
2. **Four numbered "N Billing Cycle Statement Comment" columns plus four paired expiration dates** are a
   sparse, hard-to-extend fixed-arity design — a fifth cycle tier means a schema migration.
   **Fix**: `account_statement_cycle_comment`, one row per (account, cycle_number), a fifth tier is a
   data insert.
3. **The Statement Archive table stores full rendered HTML plus a separate file-path pointer, with
   ambiguous precedence between the two** (a file-path pointer, preferred, or a stored HTML-content
   blob fallback). **Fix**: make the precedence explicit in schema — a required `storage_mode` enum
   (`file`/`inline`) rather than two nullable competing columns with implicit fallback logic.
4. **No documented uniqueness or referential integrity** on the Batch Statement Snapshot's correlation
   key (`statementtime` + `accountid`) — nothing stops a batch run from producing duplicate snapshot
   rows for the same account. **Fix**: unique constraint on (`batch_run_id`, `account_id`).

**Proposed tables:**

- **`account_statement_setting`** — `account_id` (PK/FK → Account, 1:1, required), `statement_type`,
  `statement_frequency`, `transaction_type`, `sequence_order`, `delivery_channel`, `address_source`,
  `batch_operation_mode` (individual/consolidated), display-toggle booleans (applied_amount_column,
  total_owed_column, show_discount, display_previous_balance, display_payment_detail), audit columns.
- **`account_statement_cycle_comment`** — `id` (PK), `account_id` (FK → Account), `cycle_number` (1, 2,
  3, or "3+"), `comment_text`, `display_until` (date), unique on (`account_id`, `cycle_number`), audit
  columns.
- **`account_finance_charge_setting`** — `account_id` (PK/FK → Account, 1:1), `finance_charge_enabled`,
  `annual_percentage`, `minimum_charge`, `apply_by_job` (boolean), `minimum_balance_threshold`, audit
  columns — separated from statement display settings since finance-charge computation is a distinct
  concern from statement rendering (see `calculations.md` for why this separation matters given the
  confirmed divisor divergence).
- **`statement_line`** (replaces `fuse5_statementdata`) — real FKs to Sales Order and Account (replacing
  the denormalized SO-number/invoice-number text copies with joins at read time), `batch_run_id` (FK,
  nullable — populated only for batch-generated lines), otherwise structurally unchanged from the
  Open-Item Statement Line catalog above.
- **`statement_deferred_detail`** (replaces `fuse5_statementdeferred`) — real FK to the ROA/adjustment
  ledger row, structurally unchanged otherwise.
- **`statement_archive`** (replaces `vtiger_statement_archive`) — adds `storage_mode` (fixing problem 3
  above); real FK to Account; otherwise structurally unchanged.
- **`statement_batch_run`** (new — replaces the implicit `statementtime` correlation key with a real
  entity) — `id` (PK), `initiated_at`, `initiated_by`, `run_type` (manual/cron), audit columns.
- **`statement_batch_snapshot`** (replaces `fuse5_batchstatement`) — `batch_run_id` (FK →
  `statement_batch_run`, required, fixing problem 4), `account_id` (FK → Account), the same snapshot
  columns as above, unique on (`batch_run_id`, `account_id`).

**Referential integrity**: every FK above should be a real, enforced constraint with explicit delete
behavior — `RESTRICT` on Account delete while any statement setting, cycle comment, archive row, or
snapshot exists for it, consistent with the referential-integrity standard applied throughout this
series' other normalized-schema proposals.
