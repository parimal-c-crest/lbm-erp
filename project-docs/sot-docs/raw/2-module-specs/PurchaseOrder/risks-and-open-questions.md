# PurchaseOrder — Risks & Open Questions

Source: `docs_from_blueprint/module/PurchaseOrder/09-risks-and-open-questions.md`, itself traced to
`blueprint/module/PurchaseOrder/07-risk-findings.md` and `08-consolidation-review.md` (master
rollup, cross-document contradiction check, final `status: reviewed` verdict).

**Method note** (preserved from the source, since it is itself part of the finding's credibility):
every file named as a suspect in the original task brief (`PurchaseOrderAjax.php`,
`PurchaseOrderAjaxHandle.php`, `setPPDValues.php`, `GetPODetails.php`, `checkPONumAvail.php`,
`getPOintial.php`, `ProcessChanges.php`, `UpdateCost.php`, `updateTax.php`,
`GetSearchedCategory.php`/`GetSearchedDivision.php`/`GetSearchedLineCode.php`) was opened and read
directly. Every one of the 9 modules processed before PurchaseOrder in this blueprint series had at
least one confirmed live SQL injection; PurchaseOrder continues that pattern, at a higher finding
density than most. The consolidation pass found **no contradictions** across all 12 blueprint
documents.

## Risk Register

| ID | Finding | Severity | Impact | Source |
|---|---|---|---|---|
| PO-RISK-001 | `CalcTotal.php:143,145` — the SQL **column name itself** in an UPDATE's `SET` clause is built from raw `$_REQUEST['updateExtParam']`, with no allow-list. Column names cannot be parameterized by bind arrays even if used — interpolated as raw SQL syntax, not a value. The update-target value, PO number, and product id in the same statement are also concatenated unescaped. | Critical | An attacker controlling `updateExtParam` can inject arbitrary SQL directly into the `SET` clause of an UPDATE against a live PO staging table (`lbm_iframepodetails`). **The single worst finding in the module** — worse than a typical `WHERE`-clause injection because the column-name context defeats naive escaping/parameterization fixes and requires an explicit allow-list; reachable from the PO edit screen's routine "update a line item's total" ajax path, exercised on essentially every PO edit, not a rare admin action. Direct read of `CalcTotal.php` for this spec confirms **no `isPermitted()` call or session/role check exists anywhere in the file** — the routine PO-edit endpoint carrying this Critical SQLi has no adjacent authorization gate at all. | `blueprint/module/PurchaseOrder/07-risk-findings.md` R-001; confirmed directly against `modules/PurchaseOrder/CalcTotal.php` for this spec |
| PO-RISK-002 | `setPPDValues.php` (4 statements) — all four SQL statements concatenate vendor id/PPD-type/PPD-amount request values directly into SELECT/UPDATE strings against `vtiger_vendorcf` (a Vendors-module table), mutated from a PurchaseOrder-module file with no bind array anywhere in the file. | Critical | A Vendors-module table mutated from PurchaseOrder-module code, with no visible role/CSRF check — independently corroborates the same finding already recorded from the Vendors side of this blueprint series. Direct read of the file for this spec confirms no `isPermitted()` or session check anywhere in `setPPDValues.php`. | `blueprint/module/PurchaseOrder/07-risk-findings.md` R-002; confirmed directly against `modules/PurchaseOrder/setPPDValues.php` for this spec |
| PO-RISK-003 | `RemovePOLine.php` (9 statements) — every SELECT/UPDATE/DELETE builds its WHERE clause from raw PO number, temp-detail id, kit id, and product id request values via string concatenation. One statement mixes a bind placeholder for one column with a raw-concatenated `IN (...)` list for another. | Critical | Trusts an unvalidated comma-separated id list in a DELETE-capable path. | `blueprint/module/PurchaseOrder/07-risk-findings.md` R-003 |
| PO-RISK-004 | `UpdateCost.php` (5 statements) — product id, vendor id, updated cost, and PO id values concatenated into UPDATE statements against five different tables (equivalent parts, vendor custom fields, location custom fields, both staging/committed line-item tables). | High | One unauthenticated-shaped cost-override endpoint reaching five tables; knock-on effect into LIFO/UOM inventory valuation, not just the one PO being edited (see calculations.md §3). | `blueprint/module/PurchaseOrder/07-risk-findings.md` R-004 |
| PO-RISK-005 | `DetailViewAjax.php` (2 statements) — core-price/converted-core-price request values concatenated into UPDATEs against both line-item tables. | High | Live-price corruption reachable from the read-only Detail view's ajax layer. | `blueprint/module/PurchaseOrder/07-risk-findings.md` R-005 |
| PO-RISK-006 | `getEPprice.php` — PO number concatenated unescaped into an UPDATE that is also malformed SQL (a stray second `WHERE` clause). | High (+ correctness bug) | Both issues in the same statement — see calculations.md §4 for the correctness angle. | `blueprint/module/PurchaseOrder/07-risk-findings.md` R-006 |
| PO-RISK-007 | `EmeryInvoices.php:35` — PO number, unescaped, concatenated into an EJD invoice-log UPDATE. | Medium-High | EJD invoice-matching data corruption. | `blueprint/module/PurchaseOrder/07-risk-findings.md` R-007 |
| PO-RISK-008 | `updateLocTbl.php:3` — a single UPDATE against `vtiger_locationcf` concatenates four separate request-derived parameters (min/max/order-point/location id), three of them not even quoted. | High | No escaping technique used elsewhere in the codebase would help here; only a bind parameter or explicit numeric cast fixes it. | `blueprint/module/PurchaseOrder/07-risk-findings.md` R-008 |
| PO-RISK-009 | `getVendorAvailability.php:153` — PO number, raw, in a WHERE clause writing EDI response detail. | Medium | EDI response-detail corruption. | `blueprint/module/PurchaseOrder/07-risk-findings.md` R-009 |
| PO-RISK-010 | `saveUOMforPOlines.php:32` — PO id interpolated raw into a UOM line UPDATE. | Medium | UOM line-pricing corruption. | `blueprint/module/PurchaseOrder/07-risk-findings.md` R-010 |
| PO-RISK-011 | `bopo_link_fix.php:13` — SO id, raw, in a WHERE clause against the shared SO/PO edit-lock table. | Medium | Shared edit-lock table corruption, affecting both SalesOrder and PurchaseOrder concurrency control. | `blueprint/module/PurchaseOrder/07-risk-findings.md` R-011 |
| PO-RISK-012 | `updatecurrencyrate.php:28` — currency code, parsed client-side, unparameterized. | Medium | The adjacent global-currency-edit branch in the same file parameterizes correctly, showing the fix pattern already existed and simply wasn't applied here (see calculations.md §5). | `blueprint/module/PurchaseOrder/07-risk-findings.md` R-012 |
| PO-RISK-013 | `getpendingpolistinfo.php:76-77` — DataTables server-side paging: sort direction concatenated with no allow-list; pagination offsets concatenated with no numeric cast. | Medium | List-view paging endpoint corruption/injection. | `blueprint/module/PurchaseOrder/07-risk-findings.md` R-013 |
| PO-RISK-014 | 8 files, single/double-parameter concatenations each — `Delete.php`, `PrePOEditView.php`, `DetailView.php`, `EditView.php`, `POlineItems.php`, `updatePONumberInTempTable.php`, `updatePONumberforSOBOPO.php`, `checkPONumAvail.php` — each has one or two `WHERE <col>='<raw request value>'`-style concatenations (PO record id, vendor id, PO number, old/new PO number). | Medium (cluster) | Individually narrower blast radius than PO-RISK-001–004, but the pattern recurs across essentially every file that accepts a PO number or record id from the client. | `blueprint/module/PurchaseOrder/07-risk-findings.md` R-014 |
| PO-RISK-015 | `script_rgnpo_pushtoqb.php` is dead/disabled code left live in the tree: a hardcoded RGN PO-number list and an unconditional early exit before any of its ~75 lines of real QuickBooks-push logic can execute. | Informational/Low | Flagged for removal, not migration. | `blueprint/module/PurchaseOrder/07-risk-findings.md` R-015 |
| PO-RISK-016 | `StoreTransferPopup.php` is a genuinely empty (0-byte) file, referenced by name in the store-transfer flow grouping but containing no code. | Informational | Either a broken/incomplete feature or a leftover stub; worth confirming with the team whether the store-transfer-popup UI path works end-to-end or silently no-ops. | `blueprint/module/PurchaseOrder/07-risk-findings.md` R-016 |
| PO-RISK-017 | `noname1.php` (1 line) is a placeholder/orphan file with no discernible purpose. | Informational | Candidate for exclusion from the rewrite inventory. | `blueprint/module/PurchaseOrder/07-risk-findings.md` R-017 |
| PO-RISK-018 | Negative finding (checked and cleared) — `Save.php` correctly instantiates the PurchaseOrder entity class, and its declared `table_name`/`tab_name` were verified against the live schema and match. | Informational | Unlike some prior modules in this blueprint series, no table-name-mismatch bug was found in this module's core save path. | `blueprint/module/PurchaseOrder/07-risk-findings.md` R-018 |
| PO-RISK-019 | The `vtiger_postatus` picklist master table is empty (0 rows) while 8 distinct status strings are live. | Medium (data-integrity) | A stray/mistyped status string written by any code path (including a future EDI callback or a manual DB fix) would silently bypass every status-dependent guard in the module (the delete-block list, the receiving-transition logic, the EDI Finalized-only gate) without triggering any FK/constraint error. See workflows.md. | `blueprint/module/PurchaseOrder/07-risk-findings.md` R-019 |
| PO-RISK-020 | `EmeryInvoices.php:72`'s pagination `LIMIT` is built from raw request-value arithmetic (subtraction/multiplication). | Low-Medium | PHP's numeric-coercion behavior limits but does not eliminate the injection surface compared to PO-RISK-013's direct string concatenation — still not a bind parameter or explicit cast. | `blueprint/module/PurchaseOrder/07-risk-findings.md` R-020 |

**Total: 14 confirmed SQL-injection findings spanning at least 27 individual vulnerable SQL
statements across 20 files, plus 6 non-injection findings** (counted directly from the source table,
not a header estimate).

**Biggest risk in the module**: PO-RISK-001 (`CalcTotal.php`'s attacker-controlled SQL column name)
is the standout finding: reachable on essentially every PO edit, operating on a live financial
staging table, and structurally worse than a value-position injection because the fix requires an
explicit allow-list, not merely a bind parameter — and, confirmed directly against source for this
spec, has no authorization gate anywhere in the file at all. PO-RISK-002 (`setPPDValues.php`) is the
close second, both for being a confirmed cross-module write with zero parameterization anywhere in
the file, and because it independently corroborates a finding already recorded from the Vendors side
of this same blueprint series.

## Open Questions

| ID | Question | Why It's Ambiguous | Current Best Guess | Needs Confirmation? |
|---|---|---|---|---|
| PO-OQ-001 | Does `vtiger_temppodetails` (the older staging table) still carry live traffic distinct from `lbm_iframepodetails`, or is it kept only for the Import flow? | A full write-path trace was not completed given the module's size. | Likely Import-flow-only, given `lbm_iframepodetails` is the table cited throughout the standard edit/save/cost pipeline, but not confirmed. | Yes — needs a targeted follow-up read of the CSV-import files before a new implementation's staging-table design is finalized (Requirement R2, entities-and-fields.md). |
| PO-OQ-002 | Is the empty `vtiger_postatus` picklist table an environment-specific gap in the development database, or does PurchaseOrder genuinely never seed this table module-wide (including production)? | Cannot be resolved from a read-only dev-DB snapshot alone. | No guess ventured in the source. | Yes — needs either a production schema comparison or team confirmation. |
| PO-OQ-003 | Which PHP controller renders `Smarty/templates/PurchaseOrder/getDeliveryLogForPO.tpl`? | No direct render call was found among the files read this pass. | Candidates: the DIB order-confirmation or DC-post-data ajax files. | Yes, but low priority — one popup among many. |
| PO-OQ-004 | Should `vtiger_potemplates.templatename` have a real DB-level uniqueness constraint, given the UI enforces "template already exists" only client-side? | Whether the current gap was intentional (soft, client-scoped uniqueness) or an oversight is unresolved. | No guess ventured in the source; entities-and-fields.md §5 proposes a `(tenant_id, name)` unique constraint as the rewrite's resolution. | Yes — flagged for the rewrite's schema design to make an explicit decision rather than inherit the ambiguity. |
| PO-OQ-005 | What is the authoritative `transcode` enum for this module (cross-reference recommended against Products' blueprint)? | Not resolved from PurchaseOrder's own files alone; `transcode == 7` is treated as "excluded from cost" and plausibly "waste" (co-located `RemoveWastePODetails.php` filename), but this is inference, not confirmation. | `transcode == 7` plausibly means waste/non-cost. | Yes — recommended first step is reading Products' own blueprint. |

<!-- Anti-hallucination discipline: nothing here should be silently resolved by guessing in
     downstream stages. Every item stays open until explicitly answered. -->

## Highest-Priority Unresolved Question

Per the rule catalog in business-rules-and-validation.md: of the 26 validation rules catalogued,
only three have a confirmed server-side enforcement point (two field-definition-level required-field
rules, and the PO-RULE-017 delete guard) — every other rule's confirmed enforcement is client-side
JavaScript only, with no matching server-side guard located anywhere in this pass. This mirrors the
SalesOrder blueprint's own single-highest-priority open question almost exactly: **whether any
server-side enforcement exists today for these rules (even undiscovered), and if not, whether
client-side-only enforcement is something real users currently depend on in ways that would make a
sudden strict server-side enforcement regime disruptive.** This should be the first item resolved
before or during a new implementation's validation-layer design.
