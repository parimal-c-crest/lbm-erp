# Settings — Cross-Module & Integration Touchpoints

Source: `docs_from_blueprint/module/Settings/07-cross-module-integrations.md`, itself sourced from
`blueprint/module/Settings/06-cross-module-integrations.md` ("Pass 6 — Cross-Module Dependency Map &
External Integration Touchpoints"), a reverse-dependency synthesis across the seven other
already-blueprinted modules' own Pass 6 documents (Accounts, Location, Products, SalesOrder,
SearchLineItem, Users, Vendors) plus fresh Settings-side investigation of four named gap areas.

Settings is the configuration/administration backbone for the entire ERP — organization profile,
roles/profiles/permissions/sharing, custom-field and module administration, tax tables, integration
credentials for every external system the ERP talks to, document/email templates, location/printer
administration, VDP pricing tiers, and a long tail of admin toggles. Nearly every other module reads
*some* Settings-owned configuration at runtime; that background-radiation relationship is stated once
here rather than re-itemized module-by-module. What follows are the specific, already-surfaced
relationships the source pass found — both the ones confirmed live and the ones found to be genuine,
previously undocumented gaps in *other* modules' own blueprints.

## Related Modules

| Module | What This Module Reads | What This Module Writes/Triggers | Direction | Sync/Async |
|---|---|---|---|---|
| **Location** — role/branch scoping & GL-account mapping | Settings writes `vtiger_role_locations` (which security roles are permitted at which branches, plus per-role/per-branch POS session-timeout settings) and `vtiger_location_accounting` (per-branch, ~97-row GL-account-code mapping to Traverse/QuickBooks) | Both tables owned entirely by Settings admin screens (`StoreProfile.php`; `editLocation.php`/`locationqbsetting.php`/`locationTraverseSettings.php`) | Settings → Location, one-directional. Settings owns both the admin UI and the entire write path; Location-module code has zero reference to either table | Sync (direct writes). Which downstream modules actually read the GL mappings at SO-finalize/PO-receipt/POS-EOD-reconciliation time was left an open question by Location's own Pass 6 |
| **Products** — Module Manager / custom-fields cross-mutation | N/A | `DeleteModuleRecord.php`, `RestoreModuleRecord.php`, `AddCustomFieldToDB.php`, `DeleteCustomField.php` can hard-delete, soft-delete-restore, and DDL-alter `vtiger_products`/`vtiger_productcf` from an admin screen entirely outside `modules/Products/*.php` | Settings → Products, one-directional | Sync. **Gap found during this pass**: a targeted grep of Products' own Pass 0/1/2/6 docs for these four filenames and "Module Manager" returned zero matches — despite `RestoreModuleRecord.php` carrying confirmed Products-specific special-casing. This is a real, previously undocumented gap in Products' own blueprint, surfaced by Settings' Pass 6, not by Products' own investigation |
| **Location** — printer assignment | N/A | `checkDupicatePrinter.php` (real writes to `vtiger_printers` and `vtiger_moduleprinters`), `DeletePrinter.php`, `GetPrinters.php`, `LocationPrintersAjax.php`, `addPrinterbyLocation.php`. Both tables key on `locationid` as a plain FK reference into `vtiger_location`, but neither is a field on the Location entity itself | Settings → Location, FK-reference only. Location owns no printer field or table and never touches either table from its own code | Sync. **Gap found during this pass**: a grep of Location's own Pass 0/1/6 docs for "printer" returned zero matches across all three files. This sub-area is also one of the most heavily SQL-injection-affected areas in the whole Settings corpus (`business-rules-and-validation.md` SET-RULE-135 through SET-RULE-142) |
| **Vendors** — SlipStream vendor-bill-pay integration | N/A | `slipStreamManager.php` owns the entire admin/bulk side: bulk vendor import (writes `ss_config_id`/`ss_account_id` on success, logs to `slipstream_api_logs`), `deleteVendor()`, bulk payment import against `vtiger_poreconciliation`. Vendors itself owns only a display flag (`DetailView.php`) and one narrower initial-link write. A *third*, neither-module-owned file, `slipstream/ss_manage_process.php::updateVendorStatus()`, is SlipStream's own inbound webhook, trusting the external payload verbatim | Bidirectional, asymmetric — Settings owns outbound admin/bulk writes into Vendors' `ss_*` fields; Vendors owns only the initial link + read-only display; the webhook is a third, external-triggered path | Async (webhook) + Sync (admin bulk actions). This is the single richest cross-module relationship found in the whole seven-module corpus; already fully characterized by Vendors' own Pass 6 |
| **SalesOrder** — tax config, VDP tiers, `vtiger_supportedfield` toggles | N/A (SalesOrder reads, per source's cross-reference — the actual call sites were not identified) | Tax type/rate/max-tax-by-state configuration (`TaxConfig.php`, `maxtaxmanager.php`, `updateusetaxtactable.php`); VDP tier/plan/account-assignment CRUD (`CreateVdpTierLevel.php` family, `manageVDP.php` family, `SaveAccountVDPPopUp.php` — carries a confirmed unparameterized-SQL-injection finding, SET-RULE-196, across every query in the file); the large shared `vtiger_supportedfield` key-value table backing dozens of toggles | Settings → SalesOrder, read-dominant | Sync (config read at order-entry/finalize/pricing time). SalesOrder's own Pass 6 cites **zero** direct `modules/Settings/*.php` files — its consumption runs through generic, already-abstracted lookups; the actual consuming call sites were **not identified** by either pass — a genuine, named gap in the corpus |
| **PurchaseOrder** — EDI trading-partner config | N/A | Settings owns EDI config for DIB/EJD/Orgill (FTP connection settings, cost-field mappings), stored predominantly as `vtiger_supportedfield` rows keyed by names like `DIB_ACCESS`/`EJD_INTEGRATION`/`ORGILL_INTEGRATION` | Forward-reference only — not investigated | N/A. PurchaseOrder has **not yet been blueprinted** in this corpus. No relationship was assumed; explicitly deferred for PurchaseOrder's own future Pass 1/6. One data-level signal available now: all three named EDI toggles are live-DB-confirmed `OFF` on the dev snapshot |
| **Accounts** | Presumed instance of the blanket relationship above (e.g. tax rates feeding `assignTACToAccounts.php`) | N/A | Not independently characterized | Accounts' own Pass 6 cites **zero** direct `modules/Settings/*.php` files — a genuine negative finding, not re-opened by this pass |
| **SearchLineItem** | Presumed instance of the blanket relationship above (product/price-level display drawing on Products' own Settings-adjacent GP-override table) | N/A | Not independently characterized | SearchLineItem's own Pass 6 also cites **zero** direct `modules/Settings/*.php` files |
| **Users** | N/A | N/A | N/A | A notable *negative* finding, per Users' own Pass 6: "the task brief's premise that this might reach into other modules' data is not confirmed" — `vtiger_notificationscheduler` is self-contained |

## External Systems

| System | What Crosses the Boundary | Direction | Trigger | Sync/Async |
|---|---|---|---|---|
| **QuickBooks** | `fuse5_qbsettings` (151-row, per-profile field mapping); `vtiger_location_accounting`'s `qb_*` columns | Bidirectional/cross-module — a currency-rate save in Settings synchronously triggers a PurchaseOrder-module vendor-cost mass-recompute; `fuse5_qbsettings` also feeds a live SalesOrder QB-sync path | Currency-rate save (Settings); SO invoice/credit-memo events (SalesOrder-side) | Sync (currency cascade). **Mixed liveness, confirmed cross-module**: `SaveCurrencyInfo.php` synchronously calls `modules/PurchaseOrder/updatecurrencyrate.php::updateEPVendorCost()`. Accounts'/Users' own QB push code is dead while SalesOrder's live QB sync path still consumes this same config |
| **Traverse** | `fuse5_traversesettings` (0 rows live); `vtiger_location_accounting`'s `traverse_*` columns | N/A — structurally present, no confirmed live path | N/A | N/A. Structurally identical sibling to the QB settings but with 0 live rows and no page controller found that populates it — flagged as an open question |
| **EDI — DIB / EJD / Orgill** | `vtiger_supportedfield` rows under `sectionname='EDI Settings'`; `EEFTPVal.php`/`EJDFTPVal.php` FTP/SFTP credential JSON | Outbound (Settings → external FTP/SFTP feeds) | Admin save of trading-partner config | Sync (save-time), async (FTP/SFTP transfer itself). Toggled **OFF** for all three trading partners in the live dev-DB snapshot (a data observation, not a code-level liveness determination). PurchaseOrder-side consumption not yet blueprinted |
| **Payment gateways — CardConnect / MX Merchant / Passport / Priority Payments / Dejavoo / ChargeItPro** | Six near-identical per-gateway config tables (`lbm_cardconnect_config`, `priority_payment_mx_config`, `lbm_priority_payment_config`, `lbm_dejavoo_terminal_config`; ChargeItPro has no server-side table at all — vendor-hosted JS only) | Outbound (credential config feeding each gateway's own API) | Admin credential save | Sync (save-time). **Live, with confirmed structural drift**: `prioritypayment.php:66` targets a nonexistent `priority_payment_config` table (probable dead/broken branch), and `prioritypayment.php` cross-writes into CardConnect's own terminal table. No SQLi was independently catalogued for the gateway credential tables themselves in the source's targeted sweep, but this file family sits directly adjacent to confirmed-injectable admin tooling elsewhere in the same concern area |
| **ExpiNet** | `lbm_expinet_config` (1 row), `lbm_expinet_terminals` (3 rows) | Outbound | Admin credential save | Sync. Live — dedicated tables, actively populated (non-zero row counts), written by `expinet.php` |
| **Shipping — FedEx / UPS / USPS / EliteExtra** | No dedicated tables found for FedEx/UPS/USPS in the source's targeted grep — most likely routed through `vtiger_supportedfield` like the EDI partners. EliteExtra confirmed to use both `vtiger_supportedfield` (account-level flag) and its own unresolved per-location table | Unresolved | N/A | N/A. **Open question, not resolved by this pass either** — storage mechanism for FedEx/UPS/USPS was never confirmed by a follow-up grep |
| **E-commerce — BigCommerce / B2B-B2C (WSM) / B2C sites / FanBuilder** | `bigcommerce_setup_detail` (2 rows, live), `ecom_features`, `fuse5_wsm_pricegroup`/`fuse5_wsm_linecode_conversion` | Outbound, feeding a confirmed live catalog-push mechanism in Products (`E-commerceUtils.php::getSearchedProducts()`) | Admin config save; catalog-push trigger | Sync/Async mixed. **Live**, with one confirmed doubly-dead function: `bigcommerce.php:13`'s `deactivateotherAPI()` targets a nonexistent table (`bigcommerce_api_details`) **and** its call sites are already commented out — dead at both the call-site and schema level |
| **Fuse5Connect** | Connection config/health-check (`fuse5ConnectSettingAjax.php`/`fusion_connection_check.php`) | Outbound config; consuming logic lives in Products (`f5api/lib/Product/Fuse5Product.php::AddProduct()`) | Product-creation API calls | Async. **Live, confirmed via Products' own Pass 6** — a genuine inbound product-creation API path, not a raw-SQL bypass |
| **SlipStream** | Vendor-bill-pay integration (`slipStreamManager.php`) | Bidirectional, asymmetric (see Related Modules above) | Admin bulk actions; inbound webhook | Sync (admin actions) + Async (webhook). **Live**, fully characterized above |
| **AWS S3** | `lbm_aws_s3_setup_details` (bucket, region, access key, secret key) | Outbound (credential storage feeding S3 API calls elsewhere) | Admin credential save | Sync (save-time). ⚠️ **Live and the single worst-defended credential-handling finding in the entire Settings corpus, and one of the least-defended write paths found in the whole eight-module blueprint effort to date.** `awsS3Key.php`'s `saveORUpdate`/`delete` branches build their entire SQL statement by direct concatenation of raw `$_POST` values with **no escaping function of any kind (not even `addslashes()`)** — a confirmed SQL-injection path. The AWS **secret key itself is stored completely unescaped and unencrypted** in the database (`business-rules-and-validation.md` SET-RULE-096, SET-RULE-104) |

### Plaintext-credential / zero-escaping findings — restated explicitly

The source pass is unambiguous that these are safety-critical findings, and they are restated here
rather than left buried in the table above:

- ⚠️ **AWS S3 (`awsS3Key.php`)** — **Confirmed, worst in corpus.** Two independent confirmed defects
  stack on the same file: (1) SQL injection — the entire `saveORUpdate`/`delete` SQL statement is
  built by raw concatenation of `$_POST` values with no escaping function applied at all, not even
  `addslashes()` (SET-RULE-096); (2) the AWS **secret access key is persisted completely unescaped and
  unencrypted** in `lbm_aws_s3_setup_details` (SET-RULE-104). The source explicitly characterizes this
  as "the single worst-defended credential-handling finding in the entire Settings corpus" and "one of
  the least-defended write paths found in this entire eight-module blueprint effort to date."
- The source's pattern note also situates this in a wider trend: every module blueprinted to date,
  Settings included, has at least one confirmed SQL-injection finding somewhere in its admin/config
  surface (the "8 for 8" streak); AWS S3 is simply the most severe single instance of that pattern
  found anywhere in the corpus so far.
- No other integration above carries an equivalently confirmed plaintext-credential finding in the
  source — the payment-gateway family is flagged for structural drift and adjacency to
  confirmed-injectable tooling, but the source is explicit that no SQLi was independently catalogued
  for the gateway credential tables *themselves* in its targeted sweep. That distinction (adjacent risk
  vs. a directly confirmed finding on the credential write path itself) is preserved here rather than
  flattened into an equivalent-severity claim.

## Open Questions

- **SalesOrder's actual consuming call sites** for tax config, VDP tiers, and `vtiger_supportedfield`
  toggles were not identified by either this pass or SalesOrder's own Pass 6 — Settings' write-side
  ownership is fully catalogued, but the read side is an open gap.
- **PurchaseOrder's relationship to EDI config** is a genuine forward-reference — PurchaseOrder has no
  blueprint yet; nothing was assumed.
- **Traverse integration's actual liveness** — 0 live rows and no page controller found that populates
  it; whether this is genuinely unused/vestigial or simply unconfigured in this environment was not
  determined.
- **Shipping carrier (FedEx/UPS/USPS) settings storage mechanism** — inherited unresolved from
  Settings' own field-catalog pass; not re-investigated by this pass.
- **`vtiger_location_accounting`'s downstream consumers** — which modules actually read the
  Traverse/QuickBooks GL-code mappings at posting time (SalesOrder finalize, PO receipt, POS EOD
  reconciliation) was left open by Location's own Pass 6 and not independently traced here.
- **Whether the Products/Location documentation gaps generalize** — this pass verified the Module
  Manager (Products) and printer-assignment (Location) relationships specifically because the task
  brief named them; whether Settings' Module Manager area has similar undocumented special-casing for
  other named branches (HelpDesk/Vendors/PriceBooks all appear in `AddCustomFieldToDB.php`/
  `DeleteCustomField.php`'s table-resolvers) was **not** checked against those modules' own blueprint
  docs in this pass.
- **Payment-gateway credential tables' own SQLi exposure** — the source flags these files as
  structurally adjacent to confirmed-injectable admin tooling elsewhere in the same concern area, but
  states plainly that no SQLi was independently catalogued for the gateway credential tables
  themselves in its targeted sweep; this is preserved as unresolved, not escalated to a confirmed
  finding, and not downgraded to "safe" either.
