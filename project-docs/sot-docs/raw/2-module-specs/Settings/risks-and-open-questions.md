# Settings — Risks & Open Questions

Source: `docs_from_blueprint/module/Settings/09-risks-and-open-questions.md`, itself sourced from
`blueprint/module/Settings/07-risk-findings.md` (Pass 7, risk re-verification) and
`blueprint/module/Settings/08-consolidation-review.md` (Pass 8, final consolidation).

**This is the highest-stakes risk register in the entire blueprint series to date.** Settings is the
largest module blueprinted (236 files, 428 functions, vs. Products' previous high of 209 files) and
carries the worst-documented risk profile found so far: **8 Critical findings spanning 5 structurally
distinct defect classes**, **~47 confirmed SQL-injection sites across ~22 files** (the 8-for-8 streak —
every module blueprinted in this series has found at least one confirmed SQL injection), 9
data-integrity bugs, and 7 confirmed dead/mismatched-table references. Because this module holds the
credential store for QuickBooks/Traverse, every EDI trading partner, six payment gateways, and AWS S3 —
several stored in plaintext with zero escaping — its blast radius is the first in this series confirmed
to cross the application's own boundary into third-party financial and infrastructure systems. Nothing
below is compressed for brevity at the expense of completeness — this document is deliberately
exhaustive, per the source's own explicit instruction, and that discipline is preserved here without
thinning.

## Risk Register

19 findings, consolidated and deduplicated by the source's own Pass 8: 8 Critical, 2 High, 3 Medium, 3
Low-Medium, 2 Informational, 1 Resolved.

| ID | Finding | Severity | Impact | Source |
|---|---|---|---|---|
| SET-RISK-001 | **SQL injection cluster: ~47 confirmed sites across ~22 files, spanning every one of the module's seven independently-audited concern areas.** The largest single-module injection surface found in this blueprint series — more than 4× Products' previous-worst count of 11. Headline instances: `savestlocation.php` (a generic "save any single field on `vtiger_location`" endpoint where the column name itself is spliced unquoted as the raw SQL identifier, with no allow-list — an arbitrary-column-write primitive); `updateOrganizationDetails.php` (both target column name and value taken directly from the request with no allow-list/escaping, `pquery()` parameterized in form only via an empty bind array); `awsS3Key.php` (entire SQL statement built by direct concatenation of raw `$_POST` values with no escaping function of any kind, AWS secret access key stored completely unescaped and unencrypted); `SaveAccountVDPPopUp.php` (every SQL statement in the entire file built by raw string concatenation, zero use of bind parameters anywhere); `sosubstatus.php`'s "LBM#912" allocation cluster and its `weborderstatus.php` sibling (a later-added injection cluster, four task branches splicing five distinct request values directly into SQL with zero escaping) | **Critical** | Direct SQL-injection exploitability across every concern area of the module, including arbitrary-column-write primitives and credential-endpoint injection | Pass 2 (all seven sections); Pass 7 §2c |
| SET-RISK-002 | **`SaveRole.php`'s broken edit path creates permanently orphaned Profile rows on every role edit.** The file's entire profile-construction body (~200 lines: a fresh `vtiger_profile` row plus a full set of `profile2tab`/`profile2standardpermissions`/`profile2utility`/`profile2field` child rows) runs unconditionally for both create and edit mode. For `mode=='edit'`, the branch that would wire the freshly-built profile to the role actually being edited is commented out — the real update path is a *different* module's file, `modules/Users/UpdateProfileChanges.php`. Every single role edit through this action leaves behind a brand-new, permanently orphaned Profile with unbounded accumulation over time; the intended permission edit may never land on the role actually being edited unless the caller separately knows to invoke the other file | **Critical** | Unbounded orphan-row accumulation per edit; a silent no-op of the intended permission update if this action alone is invoked; the Role itself is never stuck — "what is left half-created is a Profile" | Pass 2 SET-VAL-030–033; Pass 7 §1 Finding 4 |
| SET-RISK-003 | **`CreateVdpTierLevel.php` silently zeroes the volume-discount rebate for every account previously in the top VDP tier, on every new-tier creation.** Adding a new top tier reassigns the existing top tier's `maxprice` down to the new tier's `minprice` boundary, but the new tier row is inserted with no `volumne_discount_percent` value supplied — the column defaults to `0.00` | **Critical** | Every account previously in the old top tier is silently moved into a band with a 0% rebate until an operator separately notices and manually corrects it — a direct, unwarned dollar impact on live pricing/rebates | Pass 4 §2.4 (newly-found bug); risk-rated for the first time by Pass 7 §1 Finding 5 |
| SET-RISK-004 | **Currency-rate-change save triggers an unconditional, unaudited, unbounded mass recompute of vendor equivalent-parts cost fields via a cross-module call.** `SaveCurrencyInfo.php:29` unconditionally invokes `updateEPVendorCost($currency_code, $conversion_rate)` — a function in `modules/PurchaseOrder/updatecurrencyrate.php` — on every currency save, even a save that only changed status, since the currency code/rate are read from the request regardless of which fields the operator actually intended to change. Retroactively divides every matching vendor's equivalent-parts cost and core cost by the new exchange rate, in the same request | **Critical** | No dry-run, no row-count confirmation, no audit-trail entry of the mass recompute itself — the single most consequential live calculation found anywhere in this module | Pass 4 §4.1–4.2; Pass 7 §1 Finding 6 |
| SET-RISK-005 | **`CurrencyDelete.php` performs an unconditional delete with no Base-currency check and a dead reassignment safety net.** Deletes any currency row by id unconditionally — no Base-currency check, no reference/dependency check. The paired confirmation popup collects a `transfer_currency_id` from the operator, but `CurrencyDelete.php` never reads or applies it — the one UI element that looks like a safety net is fully inert (commented-out reassignment code confirms one once existed and was removed). The only Base-currency protection anywhere in this file family is a client-side `disabled`/`readonly` HTML attribute on the *edit* form, with no server-side equivalent and no application at all to delete | **Critical** | Base currency (and any other currency) can be deleted with no server-side guard at all | Pass 2 SET-VAL-153–155; Pass 7 §1 Finding 8 |
| SET-RISK-006 | **Audit Trail is a single global, unscoped, unlogged kill-switch.** Every audit-trail row write anywhere in the application is gated by one global boolean, loaded from a config file and checked once before the `INSERT INTO vtiger_audit_trial`. `SaveAuditTrail.php` is the entire implementation — it rewrites that one config-file line, with no in-file access-control check of its own, and — critically — the act of flipping the switch is not itself written to `vtiger_audit_trial`, because that write path is gated by the very flag being changed | **Critical** | Any account able to reach this endpoint can disable audit logging system-wide with no trace of who did it or when | Pass 2 SET-VAL-167–169; Pass 7 §1 Finding 9 |
| SET-RISK-007 | **Module Manager Restore is structurally incapable of restoring a hard-deleted record, but reports false success.** `DeleteModuleRecord.php` performs a true `DELETE FROM <table> WHERE <idcol> IN (...)` for every table in the target module's backing-table set — a hard purge with no soft-delete flag involved at all. `RestoreModuleRecord.php` only ever flips a `deleted` column back to `0` via a `WHERE id IN (...)` that, after a real Delete, structurally cannot match any row — yet the action still echoes a non-zero "records restored" count regardless of actual affected-row count | **Critical** | Delete and Restore are two independently-designed halves of what looks like one reversible feature but isn't — data loss is silent and unrecoverable through the UI | Pass 2 SET-VAL-068 ("Confirmed — highest-severity lifecycle finding"); Pass 3 §3 full transition-table treatment; Pass 7 §1 Finding 1 |
| SET-RISK-008 | **`managedivision.php`'s duplicate-division-name check queries a nonexistent column, and PHP's `NULL == 0` loose comparison silently treats the resulting query failure as "no duplicate found" on every invocation.** The duplicate check queries `WHERE region_name = ?` against `fuse5_manage_division`, a table whose only name column is `division_name` — a copy-paste error from the sibling `manageregions.php`, where `region_name` is the correct column. Because `pquery()`'s error is non-fatal by default, `num_rows()` returns PHP `NULL`, and `NULL == 0` evaluates `true` under PHP's loose comparison | **Critical** | Duplicate division names have never actually been blocked by this check, confirmed for every possible input, not a hypothetical edge case | Pass 1 §6 Open Question (first flagged); Pass 2 SET-VAL-112–115 (re-derived); Pass 7 §1 Finding 2 (full trace) |
| SET-RISK-009 | **Dead/mismatched-table cluster: 7 confirmed instances, by far the largest count of this bug class found in any module in this series.** `bigcommerce.php:13`'s `deactivateotherAPI()` targets `bigcommerce_api_details` (does not exist; live table is `bigcommerce_setup_detail`; doubly dead since call sites are also commented out); `priority_payment_config` (missing `lbm_` prefix; two live, dispatch-reachable branches reference it, meaning deleting a Priority Payment credential always silently fails, leaving stale bearer tokens live indefinitely); `themeSettings.php:28,44` targets `lbm_theme_options` (does not exist; theme-config reads silently return no rows); `alternateCostsSettings.php` (all six SQL statements target `vtiger_altcost_fields`, does not exist — the entire Alternate Costs feature is broken end-to-end); `addLocation.php:120-122`'s bare reference to `vtiger_pricebooklevel` (does not exist; the price-book-name lookup silently fails); `SaveAccessLocation.php`/`SaveSharingLocation.php` target `vtiger_link_fuse5_sharing` (does not exist; location-level access/sharing-rule save and delete both silently no-op) | **High** | Multiple confirmed-broken features (feature-level, not merely edge-case); `priority_payment_mx_config` was checked and confirmed to exist — explicitly excluded from this cluster | Pass 1 (multiple Open Questions first flagging several); Pass 7 §2b (full sweep and confirmation) |
| SET-RISK-010 | **`saveZinecode.php`'s zip-code-master import truncates the live table before reloading it, with no transaction, no checksum, and no rollback path.** Runs `TRUNCATE table fuse5_zipcodes` before processing a single row of the uploaded file, then inserts rows one at a time in the same request with `set_time_limit(0)` removing PHP's own execution-time safety net | **High** | If the upload is interrupted for any reason (browser disconnect, malformed row, any resource limit other than PHP's time limit), the table is left permanently empty except for whatever prefix of the file was processed, with no way to recover the pre-import data short of a database restore | Pass 5, Output 2; Pass 7 §1 Finding 7 |
| SET-RISK-011 (NR1) | **VDP tier *delete*-side sequence-integrity gap.** Deleting a middle tier absorbs its `maxprice` into the tier one level below but never renumbers the `level` values of tiers above it, leaving a permanent gap in the sequence (e.g. levels 1, 2, 4, 5 after deleting level 3). Deleting the lowest tier skips absorption entirely (the "find a tier below" query matches nothing) and orphans that price range with no referential check against accounts still assigned to it | **Medium** | Permanent sequence gaps and, for the lowest-tier case, an orphaned price range with no fallback traced | Pass 3 §7.2. Lives in the same file/table as SET-RISK-003 (the create-side sibling) but was never promoted alongside it into Pass 7's register |
| SET-RISK-012 (NR4) | **`SaveCustomLabels.php`'s field-label `UPDATE` is not scoped by `tabid`.** Since the same custom-field names (`cf_778`/`cf_780`/`cf_1487`) can exist under other modules' tabids, a custom-label save in Settings could silently overwrite another module's field label | **Medium** | Cross-module data-contamination risk distinct in shape from the SQL-injection cluster (a missing `WHERE`-scope bug in an otherwise-parameterized statement, not an injection) | Pass 1 §2 Open Question |
| SET-RISK-013 (NR5) | **`DeletePickList.php`'s 4 replace-mode SQL statements are not transaction-wrapped.** The same "multi-statement mutation, no atomicity" shape already registered for `saveZinecode.php` (SET-RISK-010) and `CurrencyDelete.php`'s reassignment logic (SET-RISK-005), but for a third, independent file | **Medium** | A mid-sequence failure during a picklist-value replace could leave referencing records in a partially-migrated state | Pass 2, Section 3 follow-ups |
| SET-RISK-014 (NR2) | **`checkDuplicateLocation.php`/`validateRegionAndDivision.php` are advisory-only.** Whether any caller actually blocks a save when either returns `FAILURE` was never confirmed | **Low-Medium** | Same "advisory computation, unconfirmed enforcement" shape flagged as a distinct risk class from outright injection bugs | Pass 2, Section 5 follow-ups |
| SET-RISK-015 (NR3) | **`addPrinterbyLocation.php`'s reflected-output XSS shape was never verified end-to-end.** Not itself an SQL-injection finding, and — being a different vulnerability class — was not captured by Pass 7's SQLi-focused sweep at all | **Low-Medium** | The module's one confirmed candidate for a distinct vulnerability class beyond the dominant injection pattern | Pass 2, SET-VAL-142 |
| SET-RISK-016 (NR6) | **`vtiger_convertleadmapping`'s clear operation writes the string `'NULL'` instead of SQL `NULL`.** | **Low-Medium** | A possible latent bug in downstream Lead-conversion code if it does not specifically handle the string case — never independently re-checked by any later pass | Pass 1 §4 Open Question |
| SET-RISK-017 (R11, Resolved) | Pass 2's own internal "7 for 7" vs. "8 for 8" SQL-injection-streak tally inconsistency (a documentation-hygiene issue, not a code bug) | **Informational (Resolved)** | Directly corrected by Pass 8 itself (five Edits to the source document, verified with a post-fix grep) | Pass 8 |
| SET-RISK-018 (R12) | `priority_payment_mx_config` is explicitly confirmed to **exist** live and must not be folded into the SET-RISK-009 dead-table cluster | **Informational** | Carried here only so a future reader does not mistakenly add it | Pass 7 |
| SET-RISK-019 (R13) | A "wrong-entity-class instantiation" bug class (seen in other modules in this series) was checked for and **does not reproduce** in Settings | **Informational** | A consistent negative finding | Pass 7 |

## Open Questions

### A. Ambiguous/unconfirmed field, table, and abbreviation meanings (49 items, grouped by theme)

Pass 1's own summary estimate was "roughly 25 Open Questions"; an exhaustive count by Pass 8 found **55
distinct items** across Pass 1's seven written sections — more than double the document's own estimate.
6 of the 55 were subsequently resolved or escalated into the Risk Register above (`managedivision.php`'s
bug → SET-RISK-008; `vtiger_altcost_fields`'s absence → part of SET-RISK-009; `bigcommerce_api_details`
→ part of SET-RISK-009; the `priority_payment_config` naming confusion → partially resolved as part of
SET-RISK-009; `priority_payment_mx_config` → resolved the other way, SET-RISK-018; the VDP tier lifecycle
bugs generally → split into SET-RISK-003/SET-RISK-011). The remaining **49 are true orphans**:

| ID | Question | Why It's Ambiguous | Current Best Guess | Needs Confirmation? |
|---|---|---|---|---|
| SET-OQ-001 | What does "OKB" (the parallel document-folder-system prefix) stand for? | Never expanded in code comments or UI strings | Unknown | Yes |
| SET-OQ-002 | What does "COSH" (`vtiger_organizationdetails.coshnam`) stand for/mean? | Never expanded in code | Unknown | Yes |
| SET-OQ-003 | What is the "Aconnex" integration (`vtiger_organizationdetails.aconnexbuyerid`)? | Integration name never confirmed from code context | Likely an EDI/marketplace integration | Yes |
| SET-OQ-004 | What is "GRT" tax terminology's relationship to `max_amount`? | `SetGRTTaxVal.php` is a generic-by-id endpoint; no `sesname LIKE '%GRT%'` row exists in the current dev DB | Unknown | Yes |
| SET-OQ-005 | What does "silo" mean as a third tax-rate component (alongside base/local)? | Recurs across `vtiger_taxtable`, `vtiger_tax_max_list` with no definition found | Unknown, possibly LBM-specific terminology | Yes |
| SET-OQ-006 | What do "ZDP"/"DCI" mean (linecode-conversion feed abbreviations)? | Never expanded in `fuse5_wsm_linecode_conversion` code or UI | Unknown | Yes |
| SET-OQ-007 | What do `vtiger_supportedfield.dumycs`/`.displayincs` columns mean? | Names suggest "dummy" and "display in [CS]" but neither is confirmed | Unknown | Yes |
| SET-OQ-008 | What do "INI" codes (`lbm_ini_list`) represent? | Only known via structural twin-ness with `lbm_dow_list` (day-of-week) | Unknown | Yes |
| SET-OQ-009 | What is the relationship between `fuse5_companyprofiles` and `vtiger_organizationdetails`? | Near-identical column shape, no code found joining/syncing them | Possibly a migration-in-progress or genuinely separate multi-profile mechanism | Yes |
| SET-OQ-010 | Why do two parallel document-folder trees (`lbm_job_fol_categories` vs. `okb_upload_folders`) exist? | No code found explaining the split | Possibly one deprecated predecessor of the other | Yes |
| SET-OQ-011 | What is the relationship between `vtiger_organizationdetails.logo` and `.logoname`? | Dual logo storage (inline blob/text vs. filename), relationship/precedence unclear | Possibly legacy dual-storage | Yes |
| SET-OQ-012 | What is the split between `vtiger_mail_accounts`'s dual server/credential column pairs? | Apparent duplicate-purpose columns (incoming vs. outbound leg?) not confirmed | Possibly incoming vs. outbound mail-account legs | Yes |
| SET-OQ-013 | Which of `passport_payment.php`/`prioritypayment.php` (both writing `lbm_priority_payment_config`) is current/live? | Two files write the same table with overlapping but not identical branch logic | Unknown — determines whether SET-RISK-009's delete bug is user-visible | Yes |
| SET-OQ-014 | What table does `StoreProfile.php` actually write to? | No distinct table identified; likely `vtiger_organizationdetails` but not confirmed via grep | `vtiger_organizationdetails` | Yes |
| SET-OQ-015 | What is `ExportingFTP.php`'s save target? | No `vtiger_supportedfield` or dedicated-table hit found in targeted grep | Unknown | Yes |
| SET-OQ-016 | What are `fedex.php`/`ups.php`/`usps.php`'s save targets? | No table name matched search terms used | Most likely `vtiger_supportedfield`, by analogy with DIB/EJD/Orgill | Yes |
| SET-OQ-017 | What is `eliteExtra.php`'s per-location profile table name? | Not resolved by DESCRIBE sweep | Likely `lbm_eliteextra_*`, not confirmed | Yes |
| SET-OQ-018 | What admin page (if any) populates `fuse5_traversesettings`? | Only a single-field ajax updater found; no page-controller equivalent to `qbSettings.php` located | Possibly never built, or outside this batch's file list | Yes |
| SET-OQ-019 | Where does the custom-catalog subsystem's `$adbCustomCatalog` connection actually point in production? | Assignment site not located; six tables confirmed absent from dev DB | Unknown — a per-tenant or third-party catalog DB | Yes |
| SET-OQ-020 | Where is Google Calendar OAuth token storage? | Two branches call externally-defined token functions whose storage table wasn't resolvable in this batch | Likely a Users-module or generic OAuth-token table | Yes |
| SET-OQ-021 | What table does "Primary Service Requested" (`PrimaryService.php`) actually write to? | Delegates to externally-defined `savePrimeryServiceRequested()`/`updatePrimaryServiceRequested()`, target table not resolvable | Unknown | Yes |
| SET-OQ-022 | Where does the actual clock-in/out timestamp data underlying Time Card/Payroll reports live? | Not found in any table discovered in this concern area | Likely a Users-module login-history/time-clock table or a background cron | Yes |
| SET-OQ-023 | Is there a write path for `vtiger_def_org_field.readonly`? | No Settings-file write path found in this batch | Possibly none exists | Yes |
| SET-OQ-024 | Does anything actually consume/enforce "module owner" (`vtiger_moduleowners`)? | No confirmed downstream consumer located | Unknown | Yes |
| SET-OQ-025 | What populates `vtiger_audit_trial.browserdetail`? | Present in the schema but not read/written by any confirmed code path in this pass | Possibly dead/vestigial, or populated elsewhere | Yes |
| SET-OQ-026 | Is `vtiger_announcement`'s 1-row-per-creator design intentional? | The PK being `creatorid` itself structurally forces this; business intent not confirmed | Likely intentional (a single current-announcement-per-admin mechanism) | Yes |
| SET-OQ-027 | Is `addCreditCardType.php`'s `CC_TYPE_ACCOUNT` mapping consumed by any live path? | Not determined from this pass alone | Unknown | Yes |
| SET-OQ-028 | Is `fuse5_traversesettings` consumed by any live path? | Not determined from this pass alone | Unknown, likely dead given 0 live rows | Yes |
| SET-OQ-029 | What are `vtiger_link_fuse5_subinfo`/`_subinfo_skeleton` for? | Exist in schema, unreferenced by any file read in this pass | Likely owned by a different Settings sub-area | Yes |
| SET-OQ-030 | Does `vtiger_link_fuse5_sharing` exist in any environment? | Referenced by two live write paths (`SaveAccessLocation.php`/`SaveSharingLocation.php`) but confirmed absent from the dev DB | Unknown — may exist only in production/other tenant schemas | Yes |
| SET-OQ-031 | Are `fuse5_zipcodes` and `fuse5_service_appts_priority` genuinely absent in production too? | Actively read/written by live code but absent from the dev snapshot | Unknown | Yes |
| SET-OQ-032 | Does `lbm_theme_options` exist anywhere? | `themeSettings.php`'s class targets it; confirmed absent from dev DB (part of SET-RISK-009) | Likely dead code superseded by `theme_settings` | Yes |
| SET-OQ-033 | Does downstream Lead-conversion code correctly handle the string `'NULL'` written by `vtiger_convertleadmapping`'s clear operation? | Not independently re-checked by any later pass (also SET-RISK-016) | Unknown | Yes |
| SET-OQ-034 | Does `vtiger_loginhistory.login_time`'s legacy zero-date default leak into date arithmetic anywhere? | Not traced end-to-end | Unknown — a strict-SQL-mode compatibility risk | Yes |
| SET-OQ-035 | Why is `lbm_uploaded_docs_relation.deleted` typed as an unusual zerofill-tinyint? | No business reason found, reads as legacy typing | Legacy artifact, no business meaning | No — normalize in rewrite regardless |
| SET-OQ-036 | Why does `vtiger_wordtemplates.templateid` have no auto_increment/default? | Id minting relies entirely on an application-layer sequence call | Legacy schema-design gap | No — fix in rewrite regardless |
| SET-OQ-037 | Is there a collision-safety check for picklist per-field value-table naming (`vtiger_<fieldname>`) against pre-existing vtiger-core tables? | No uniqueness/collision check found in this pass's file set beyond a label-duplicate check in `AddCustomFieldToDB.php` | Possibly none exists | Yes |
| SET-OQ-038 | Does `moduleBackup.php`'s table-selection staging ever produce an actual export/backup file? | Only stages a table selection into the session and echoes row counts; no actual export mechanism located | Likely none exists, or lives elsewhere unfound | Yes |
| SET-OQ-039 | Why does Vendors appear in `DeleteModuleRecord.php`'s code but not `ListModuleRecords.php`'s eligible-module list? | Grep confirms the code path exists; whether it's dead, reachable elsewhere, or the list is stale is unresolved | Unknown | Yes |
| SET-OQ-040 | Is `fuse5_manage_vdp_accounts.accountids`' denormalized CSV list ever validated for referential integrity? | No such check found | No | No — fix in rewrite regardless |
| SET-OQ-041 | Is `fuse5_vdp_net_exception_price_plan` a per-plan table or a global singleton? | No `vdpid`/plan-linking column found despite the admin UI being framed as per-plan | Possibly a global singleton | Yes |
| SET-OQ-042 | What unit of measure applies to `fuse5_defaultboxsizesforshipping`'s dimension columns? | All plain integers, no UOM column | Unknown | Yes |
| SET-OQ-043 | What is "Physical Location Sort Report"'s exact business purpose? | Appears to be an independent named-list ordering utility, not FK'd to `vtiger_location` | Unknown | Yes |
| SET-OQ-044 | What is the relationship between the WAC change log and Products' own QoH-tracking table? | Both appear to be parallel audit trails, likely firing from the same underlying inventory-change events, not confirmed | Parallel, possibly same trigger source | Yes |
| SET-OQ-045 | What business scenario drives choosing TAC assignment mode "Based on City/Zip" vs. "Based on TAC"? | Functionally clear from code (two different lookup keys into the same table), business scenario not confirmed | Unknown | Yes |
| SET-OQ-046 | Is the shipping-carrier plaintext-password finding (SET-RULE-102) confirmed for all three carrier files or only one? | Confirmed directly for one file, inferred by structural analogy for its two siblings | Likely all three, not independently confirmed | Yes |
| SET-OQ-047 | Does an access-control layer above the individual save/delete action exist for most Settings endpoints? | Not confirmed one way or the other by the source blueprint for the large majority of endpoints | Unknown | Yes |
| SET-OQ-048 | Does any code outside Settings renumber VDP tier levels after a mid-sequence delete? | Not searched for repo-wide | Unknown | Yes |
| SET-OQ-049 | What is the actual full column list of the custom-catalog subsystem's six tables beyond what one INSERT statement makes inferable? | Cannot be DESCRIBE'd from the available DB connection | Partial list inferable from `CustomCatalogImportStep3.php`'s INSERT | Yes |

### B. Documentation/output-cataloging follow-ups (4 items — see `outputs.md`)

| ID | Question | Why It's Ambiguous | Current Best Guess | Needs Confirmation? |
|---|---|---|---|---|
| SET-OQ-050 | Does the WAC Change-Log CSV export actually force a download in practice despite missing HTTP headers? | Only confirmed by static read that no header call precedes the CSV write | Likely renders inline in most browsers | Yes |
| SET-OQ-051 | Does the payroll PDF pipeline's shell-out ever leave a stale/partial PDF file that causes a false "success" report? | The file's logic checks only for file existence, not process exit status; no runtime test performed | Plausible | Yes |
| SET-OQ-052 | Is the Custom Catalog export's separate database connection scoped the same way (multi-tenancy) as the module's primary connection? | Confirmed distinct connection, not confirmed scoped the same way | Unknown | Yes |
| SET-OQ-053 | Is the legacy ActiveX mail-merge mechanism still functional in any modern browser? | Not verified — out of scope for a Settings-focused investigation | Almost certainly non-functional in current browsers | Yes |

### C. Unread/unconfirmed function internals (17 grouped entries, ~38 granular raw items — see `blueprint/module/Settings/08-consolidation-review.md` §4C for the full list)

Per-concern-area lists of helper functions whose internals were never opened (e.g. `get_google_api_key()`,
`from_html()`, `getFuse5Currency()`, `addSharingRule()`, `escape_string()`'s protection-equivalence to
`pquery()`), template-escaping behavior never verified for several reflected/stored values flagged
throughout `business-rules-and-validation.md`, and several files characterized only via Pass 0's
incidental notes rather than independently read in Pass 2. Not itemized individually here to avoid
fabricating specificity the source itself only grouped — see the cited source document for the full
granular list.

### D. Status/lifecycle follow-ups (4 items — see `workflows.md`)

Company Profile's `vtiger_cf_defcompanyprofile` liveness; which template renders the base-currency
selection field; Module Manager's manual-delete-path pre-filtering; whether any other repo-wide
re-insert-based restore mechanism exists.

### E. Financial/pricing follow-ups (4 items — see `calculations.md`)

Whether "Max Tax by State" is compared against a computed tax total in SalesOrder; whether a commission
amount is computed anywhere independently of the color-banding table; whether `vtiger_altcost_fields`'s
absence holds on production tenants; whether the currency-conversion file's two formulas can both fire
from the same action.

### F. Cross-module unknowns (6 items — see `integrations.md`)

SalesOrder's actual consuming call sites for tax/VDP/`vtiger_supportedfield` config; PurchaseOrder's
EDI-config relationship (forward-reference, no blueprint yet); Traverse integration's actual liveness;
FedEx/UPS/USPS's settings-storage mechanism; `vtiger_location_accounting`'s downstream consumers;
whether the Products/Location documentation gaps generalize to other named branches.

### G. Risk-sweep follow-ups (4 items)

| ID | Question | Why It's Ambiguous | Current Best Guess | Needs Confirmation? |
|---|---|---|---|---|
| SET-OQ-054 | Is the ~47-site injection count a floor or a ceiling? | Most of the 236 files were never individually re-read for this specific pattern | An explicit **floor**, not a ceiling | Yes |
| SET-OQ-055 | Does any access-control layer above request-dispatch (module-permission/CSRF/role gate) narrow the practical exploitability of the ~47 confirmed injection points? | Not traced end-to-end | Unknown | Yes |
| SET-OQ-056 | Do the four newly-found dead-table bugs have siblings among the ~229 files not specifically swept? | Not checked | Plausible, unconfirmed | Yes |
| SET-OQ-057 | Are `weborderstatus.php`'s and `sosubstatus.php`'s injection points reachable by any role below full admin? | Not traced | Unknown | Yes |

## Documentation-hygiene note preserved from the source

A reader of `workflows.md` alone, without also reading `calculations.md`, would not learn that VDP
tiers feed a monthly rebate report rather than live Sales Order pricing — flagged by the source's own
Pass 8 as a documentation-hygiene gap between two consistent (not contradictory) documents, carried
forward here explicitly so this tech-agnostic spec doesn't repeat the same gap across its own files.

## The single highest-priority framing

Per the source's Pass 8 consolidation review: this module's risk register "should be treated as the
single highest-priority 'patch the legacy system now' cluster found across every module audited in this
blueprint series to date, exceeding even Products' own remediate-now framing" — 8 independently
confirmed Critical findings spanning five distinct defect classes, ~47 directly exploitable
SQL-injection vectors, on the one module whose tables are the credential store and administrative
control plane for the entire ERP's financial integrations (QuickBooks/Traverse, EDI, six payment
gateways, AWS S3) and its role/permission system. SET-RISK-006 (the audit-trail kill-switch) and
SET-RISK-007 (Module Manager Restore's false-success reporting) mean this module's own detection and
recovery mechanisms cannot be trusted to catch or undo an exploit of its own SET-RISK-001 injection
cluster — a compound risk no prior module in this blueprint series has presented. This framing is
preserved here verbatim in substance (not softened) because the source's own instruction is that this
risk register be exhaustive and not compressed for brevity — a discipline this file inherits and does
not relax.

<!-- Anti-hallucination discipline: nothing here should be silently resolved by guessing in
     downstream stages. Every item stays open until explicitly answered. -->
