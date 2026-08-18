# Users — Entities & Fields

> Every entity, every field, individually. No grouping/summarizing — that's how fields get lost.
> Legacy table/column names are a first-class column in the field catalog below, not an optional
> footnote — this project's whole documentation discipline rests on every claim being traceable to
> a specific source, and a footnote is too easy to skip. See
> `_deviations-from-original-template.md` in this folder.

Source: `blueprint/module/Users/01-entities-fields.md` ("Doc1 Pass 1", legacy schema/field
traceability) and `docs_from_blueprint/module/Users/02-entities-and-fields.md` (tech-agnostic
translation and the eleven governing architectural requirements R1–R11). Legacy Trace column values
below are `.column_name` on the table named in each entity's heading unless otherwise noted; where a
field only carries meaning via code (no `vtiger_field` UI label), that is stated inline.

## Governing architectural requirements (carried forward, not re-litigated per field)

Doc1's implementation-plan pass reasons through eleven governing decisions for this module,
restated as forward-looking requirements: **R1** — no generic dynamic-field/EAV mechanism; every
field including all `generatedtype=2` (Studio/dynamic) fields lives directly on the single wide
`vtiger_users` table, so the new schema uses explicit typed columns, no EAV. **R2** — the User-Role
join table collapses to a single nullable `role_id` FK (schema permits multiple rows today but the
UI/business model treats it as 1:1). **R3** — the nine Sharing Rule variant tables unify into one
polymorphic `sharing_rule` table (source/target actor type + id, each an enum: `ROLE` /
`ROLE_AND_SUBORDINATES` / `GROUP`); `shareid` is already a shared id space across all nine, so even
the legacy system treats them as one entity. **R4** — the two Group-Membership tables unify into
one, with an `includes_subordinates` boolean. **R5** — `deleteRole()`'s failure mechanism (see
`risks-and-open-questions.md` R1) is closed by a blanket, non-bypassable parameter-validation
pattern at the domain-command boundary. **R6** — parameterized queries/ORM by default, no
raw-string-interpolated SQL escape hatch. **R7** — multi-tenancy is first-class: every table
carries `tenant_id`, every unique constraint is scoped `(tenant_id, ...)`. **R8** — the Time Clock
in/out cycle is a real, first-class two-state domain concept. **R9** — the payroll open-punch
undercount is a data-integrity error requiring resolution, not a silent auto-exclusion. **R10** —
one authoritative overtime formula, pending mandatory SME sign-off. **R11** — QuickBooks employee
sync is excluded from the new design pending confirmation (confirmed dead).

## Entity List

31 legacy entities, of which 29 carry forward as normative business entities (2 excluded — see
Known Gaps).

| Entity | Purpose |
|---|---|
| User (Header) | The core login/employee identity record: credentials, contact info, HR-adjacent fields, UI/workflow preferences, QuickBooks employee-sync pointers. A single wide table — no separate custom-fields extension table (R1). |
| User-Role Assignment | Which Role a User holds (1:1 in practice — collapsed to a single FK per R2). |
| User-Group Membership | Which Groups a User belongs to (many-to-many). |
| User Import Batch Marker | Generic vtiger CRM "last import" tracking row — **not carried forward** (out of scope). |
| Role | A node in the org-chart-shaped permission hierarchy (name, parent role, nesting depth). |
| Role Picklist Value Restriction | Which picklist values a given Role may see/select, per picklist. |
| Role-Profile Assignment | Which Profile(s) a Role is bound to (inherits its module/field/action permission set). |
| Role Location Security Setting | Per-Role, per-Location inactivity auto-logoff and auto clock-out timing settings. |
| Role Report Access Grant | Which custom reports a Role is permitted to run. |
| Role Name Seed List | A small standalone lookup of role-name strings; relationship to the live Role hierarchy unconfirmed — **not carried forward**. |
| Group | A named collection of Users/Roles/Groups used as a sharing/assignment target. |
| Group Nesting (Group-in-Group) | A Group containing another Group as a member. |
| Group Membership (Role / Role-and-Subordinates) | A Role, or a Role-and-its-subordinates, included as a member of a Group. Two legacy tables, unified per R4. |
| Profile | A named bundle of module/field/action permissions assignable to one or more Roles. |
| Profile Field-Level Permission | Per-Profile, per-module, per-field visibility/read-only setting. |
| Profile Global Action Permission | Per-Profile permission for a small set of org-wide actions not tied to a module. |
| Profile Module Action Permission | Per-Profile, per-module, per-operation (View/Edit/Delete/etc.) permission. |
| Profile Module (Tab) Access | Per-Profile, per-module coarse "can this Profile see this module at all" toggle. |
| Profile Related-List/Utility Permission | Per-Profile permission for module-level "utility" actions. |
| Sharing Rule | A record-visibility grant from one org actor to another, layered on top of the org-wide default. Nine near-identical legacy tables, unified per R3. |
| Sharing Rule Related-Module Scope | Which related modules a sharing rule extends into, and the per-related-module permission override. |
| Time Clock Record | A single clock-in/clock-out punch for a User, with an hours-type classification. The one real DB-enum-backed, actively-used status field in the module (R8). |
| Clock-In Task Detail | A "what are you working on" annotation attached to a clock-in session, optionally linked to a Sales Order/product/line-code. |
| Clock-In Task Catalog Entry | A reusable, per-user "task" label picklist feeding the annotation above. |
| Personal Day | A scheduled personal/vacation/time-off entry for a User. |
| Holiday (Catalog) | A system-wide named holiday value (e.g. "Christmas"). |
| Holiday Assignment (Per-User) | A specific calendar date on which a specific User observes a holiday. |
| Login History | An audit-trail entry of a login/logout event. |
| Mail Account | A personal webmail/IMAP-POP3-SMTP account configuration a User has connected. |
| Notification Scheduler | A named, admin-configured scheduled-notification rule. "Largely unpopulated/legacy" per a Pass 0 skeleton read, but a full-body read confirmed it is self-contained and actively toggle-able — carried forward as a real, if lightly-used, entity. |
| Word Template | A stored Word/merge-document template usable for mail-merge across Contacts/Leads/Users. |

**Relationship summary**: A User has exactly one effective Role (User-Role Assignment), belongs to
zero or more Groups (User-Group Membership), has zero or more Time Clock Records (each optionally
annotated with Clock-In Task Details, drawing labels from that User's own Clock-In Task Catalog),
zero or more Personal Days and Holiday Assignments, zero or more Login History entries (legacy:
matched by username string, not a numeric FK), and zero or more Mail Accounts. A Role sits in a
self-referencing parent/child hierarchy, is bound to one or more Profiles via Role-Profile
Assignment, restricts zero or more Picklist Values, has zero or more Role Location Security
Settings and Role Report Access Grants, and can be a member of zero or more Groups. A Group can
itself be a member of another Group and has zero or more direct User members. A Profile owns zero
or more Field-Level, Global Action, Module Action, Module (Tab) Access, and Related-List/Utility
Permissions. A Sharing Rule references a source actor and a target actor (each Role/
Role-and-Sub/Group) plus a permission level, and is scoped to exactly one module + cascade setting
via a Sharing Rule Related-Module Scope row.

## Field Catalog

### User (Header)

Backed by `vtiger_users` — a single wide table, ~120 business fields, no side custom-fields table
(R1). 111 fields carry a real `vtiger_field` Studio label (tabid 29); six QuickBooks GL-mapping
fields carry an orphaned `tabid=0` label (Schema Drift #1 — see Known Gaps).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| User ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| Username | Login username | text | practically Yes (dup-checked on save, not server-enforced) | NULL | user-entered | `vtiger_field` 415 "User Name"; `.user_name` |
| Password (hashed) | Encrypted/hashed login password | text | No | NULL | system-set (derived) | `vtiger_field` 417 "Password"; `.user_password` |
| Password Hash (MD5 fast-lookup) | Lowercased-MD5 shadow copy used as a fast pre-check before the full crypt-algorithm check | text | No | NULL | system-set (derived) | `.user_hash` |
| Password Crypt Type | Which hash algorithm (MD5/BLOWFISH) encodes this user's password | enum | No | MD5 | system-set | `.crypt_type` |
| Confirm Password (form-only) | Client-side confirmation input, not meaningfully persisted | text | No | NULL | user-entered | `vtiger_field` 418 "Confirm Password"; `.confirm_password` |
| User Barcode | A barcode identifying this user for barcode-scan login/lookup | text | No | NULL | user-entered/system-set | `vtiger_field` 3372 "User Barcode"; `.user_barcode` |
| Barcode Accepted for Login | Whether this user may log in via barcode scan | boolean | No | off | user-entered | `vtiger_field` 3382 "Barcode Accepted for Login"; `.barcoderequireforlogin` |
| Is Admin | Full administrator privileges (bypasses role/profile checks) | boolean | No | 0 | user-entered | `vtiger_field` 416 "Admin"; `.is_admin` |
| Is Active (Login Enabled) | Login-enabled flag — confirmed dead/unread | boolean | Yes | 0 | user-entered/system-set | `.is_login` (distinct from `.status` below) |
| Status | Active/Inactive — real, enforced | enum | No | Active | user-entered/system-set | `vtiger_field` 423 "Status"; `.status` |
| First Name | Given name | text | Yes | NULL | user-entered | `vtiger_field` 419 "First Name"; `.first_name` |
| Last Name | Family name | text | No | NULL | user-entered | `vtiger_field` 420 "Last Name"; `.last_name` |
| Middle Name | Middle name | text | No | NULL | user-entered | `vtiger_field` 3354 "Middle Name"; `.middle_name` |
| Title | Job/contact title | text | No | NULL | user-entered | `vtiger_field` 430 "Title"; `.title` |
| Job Title | A second job-title-shaped field — Open Question: relationship to Title | text | No | NULL | user-entered | `vtiger_field` 1796 "Job Title"; `.jobtitle` |
| Department | Organizational department | text | No | NULL | user-entered | `vtiger_field` 432 "Department"; `.department` |
| Reports To | This user's manager | reference | No | NULL | user-entered | `vtiger_field` 434 "Reports To"; `.reports_to_id` |
| Currency | Default operating currency | reference | Yes | 1 | user-entered (force-overridden every save — USR-RULE-007) | `vtiger_field` 426 "Currency"; `.currency_id` |
| Description | Free-text notes | text | No | NULL | user-entered | `vtiger_field` 442 "Notes"; `.description` |
| Office Phone | Work phone | text | No | NULL | user-entered | `vtiger_field` 431; `.phone_work` |
| Mobile Phone | Mobile phone | text | No | NULL | user-entered | `vtiger_field` 433; `.phone_mobile` |
| Home Phone | Home phone | text | No | NULL | user-entered | `vtiger_field` 439; `.phone_home` |
| Other Phone | Secondary phone | text | No | NULL | user-entered | `vtiger_field` 435; `.phone_other` |
| Fax | Fax number | text | No | NULL | user-entered | `vtiger_field` 437; `.phone_fax` |
| Email | Primary email | text | No | NULL | user-entered | `vtiger_field` 422; `.email1` |
| Other Email | Secondary email | text | No | NULL | user-entered | `vtiger_field` 436; `.email2` |
| Yahoo ID | Legacy IM integration id | text | No | NULL | user-entered | `vtiger_field` 438; `.yahoo_id` |
| Signature | Email signature block | text | No | NULL | user-entered | `vtiger_field` 441; `.signature` |
| Street Address | Home/mailing street | text | No | NULL | user-entered | `vtiger_field` 443; `.address_street` |
| City | Address city | text | No | NULL | user-entered | `vtiger_field` 444; `.address_city` |
| State | Address state | text | No | NULL | user-entered | `vtiger_field` 445; `.address_state` |
| Postal Code | Address ZIP | text | No | NULL | user-entered | `vtiger_field` 446; `.address_postalcode` |
| Country | Address country | text | No | NULL | user-entered | `vtiger_field` 447; `.address_country` |
| User Image | Uploaded profile-photo filename | text | No | NULL | system-set (derived) | `vtiger_field` 448; `.imagename` |
| Date of Birth | Birthdate | date | No | NULL | user-entered | `vtiger_field` 450; `.userdob` |
| Emergency Contact Name | Emergency contact | text | No | NULL | user-entered | `vtiger_field` 1797; `.contactname` |
| Licence Number | Driver's/professional license | text | No | NULL | user-entered | `vtiger_field` 451; `.licenceno` |
| Driver License Expiration Date | Expiration date of the license on file | date | No | NULL | user-entered | `vtiger_field` 3458; `.driver_license_exp_date` |
| Social Security Number | SSN on file (HR/payroll use) | text | No | NULL | user-entered | `vtiger_field` 452; `.ssnumber` |
| Hire Date | Date of hire | date | No | NULL | user-entered | `vtiger_field` 3459; `.hire_date` |
| Created Date | A second "record created" date field — Open Question: relationship to Created Time | date | No | NULL | user-entered/system-set | `vtiger_field` 3857; `.created_date` |
| Expire In Days | Days after which this account auto-expires (feeds a cron job) | text | No | Never | user-entered | `vtiger_field` 3858; `.expiredays` |
| Total Personal Days | Personal/vacation day allotment | number | No | NULL | user-entered | `vtiger_field` 453; `.totalvacday` |
| Personal Days Remaining | Personal/vacation day balance | number | No | NULL | derived | `vtiger_field` 454; `.vacdatremain` |
| Sick Days | Sick-day allotment | number | No | NULL | user-entered | `vtiger_field` 459; `.sickdat` |
| Sick Days Remaining | Sick-day balance | number | No | NULL | derived | `vtiger_field` 1795; `.sickdaysremaining` |
| Insurance Plan | Health insurance on file | text | No | NULL | user-entered | `vtiger_field` 460; `.insuranceplan` |
| Supplemental Insurance | Whether supplemental insurance is carried | enum | No | NULL | user-entered | `vtiger_field` 465; `.suplmntinsselect` |
| Supplemental Insurance Detail | Free-text detail | text | No | NULL | user-entered | `vtiger_field` 461; `.supplmntalinsu` |
| 401k | 401k participation | enum | No | NULL | user-entered | `vtiger_field` 462; `.401k` |
| 401k % | 401k contribution % | number | No | NULL | user-entered | `vtiger_field` 463; `.401kperct` |
| Salary | Salary amount/rate — legacy stores as varchar, not decimal | text | No | NULL | user-entered | `vtiger_field` 466; `.salary` |
| Hourly Rate | Hourly pay rate | money | No | 0.000 | user-entered | `.hourlyrate` (Studio/dynamic field) |
| Payroll Deduction | Payroll-deduction amount/flag | number | No | NULL | user-entered | `vtiger_field` 467; `.payrolldeduct` |
| Health Insurance | HR/payroll deduction field | enum | No | NULL | user-entered | `vtiger_field` 468; `.healthinsurance` |
| Garnish | Wage garnishment flag | enum | No | NULL | user-entered | `vtiger_field` 469; `.garnish` |
| Garnish Amount | Garnished dollar amount | money | No | NULL | user-entered | `vtiger_field` 470; `.garnishamt` |
| Holiday Hours | Paid holiday hours allotted — Open Question: relation to the Holiday Assignment entity | number | No | NULL | user-entered | `vtiger_field` 464; `.holidays` |
| Created Time | Standard vtiger audit timestamp | datetime | Yes | CURRENT_TIMESTAMP | system-set | `.date_entered` |
| Modified Time | Standard vtiger audit timestamp | datetime | Yes | 0000-00-00... | system-set | `.date_modified` |
| Modified By | Last-modifying user | reference | No | NULL | system-set | `.modified_user_id` |
| Deleted | Soft-delete flag | boolean | Yes | 0 | system-set | `.deleted` |
| Sales Person | Salesperson flag | text | No | Yes | user-entered | `vtiger_field` 3472; `.spcmuser` |
| Sales Accounts | Assigned-accounts list — a JSON/serialized blob standing in for a real many-to-many relationship | text/json | No | NULL | derived | `vtiger_field` 1373; `.salesaccount` |
| Default Location | Default store/branch | reference | Yes | NULL | user-entered | `vtiger_field` 1474; `.defaultlocation` |
| SO Default Location | Default location for new SOs | enum | Yes | User Location | user-entered | `vtiger_field` 1926; `.sodefaultlocation` |
| Default Register | Default POS cash register | enum/reference | No | NULL | user-entered | `vtiger_field` 3258; `.link150` |
| Default CR Book | Default Cash Receipts book | reference/enum | No | NULL | user-entered | `vtiger_field` 4409; `.cr_book` |
| Organization Access Level | Open Question: exact meaning/valid values not traced | enum | No | NULL | user-entered | `vtiger_field` 3631; `.org_access_level` |
| Protected Field Permission | Governs viewing/editing "protected" sensitive fields | enum | No | NULL | user-entered | `vtiger_field` 1432; `.protected_field_permission` |
| Account Rename Authority | Whether authorized to rename Account records | boolean | No | NULL | user-entered | `vtiger_field` 2072; `.allowacrename` |
| Push ROA To EOD | Whether ROA entries auto-push into end-of-day | boolean | Yes | Yes | user-entered | `vtiger_field` 2081; `.roatoeod` |
| Make Adjustments & Change SO Payment Method | Financial-adjustment/payment-method authority | boolean | Yes | No | user-entered | `vtiger_field` 2093; `.make_adjustment` |
| Cursor Default | Default focus field for product-lookup screens | enum | No | NULL | user-entered | `vtiger_field` 1431; `.cursordefault` |
| PO-ST Cursor Default | Default focus field for PO/Store-Transfer product-detail screens | enum | No | NULL | user-entered | `vtiger_field` 1502; `.pocursordefault` |
| Default Activity View | Default listview filter, Activities home widget | enum | No | This Week | user-entered | `vtiger_field` 424; `.activity_view` |
| Default Lead View | Default listview filter, Leads home widget | enum | No | Last Week | user-entered | `vtiger_field` 425; `.lead_view` |
| Home Page Widget Order | Ordered widget-code list controlling home-page layout — serialized text | text/serialized | No | NULL | user-entered | `.homeorder` (no distinct `vtiger_field` row) |
| Default Landing Page | Page/URL the user lands on after login | text | Yes | NULL | user-entered | `.defaultpage` |
| Default Home View | Open Question: not confirmed populated/read anywhere | enum-ish | No | NULL | unclear | `Users.php:219 var $defhomeview`; `.defhomeview` |
| User Preferences (blob) | Serialized bag of misc session-level UI preferences | text/serialized | No | NULL | system-set | `.user_preferences` |
| Calendar Color | Calendar event color — Open Question: relationship to Event User Color | text(hex) | No | #E6FAD8 | user-entered | `.cal_color` (no `vtiger_field` row) |
| Event User Color | Second calendar event color field | text(hex) | No | #eb8d12 | user-entered | `vtiger_field` 4198; `.event_user_color` |
| Time Zone | Timezone config | text | No | NULL | user-entered | `.tz` (no `vtiger_field` row) |
| Week Start Day | Calendar-week-start config | number | No | NULL | user-entered | `.weekstart` |
| Named Days | Open Question: exact format/usage not confirmed | text | No | NULL | unclear | `.namedays` |
| Work Days | Open Question: exact format/usage not confirmed | text | No | NULL | unclear | `.workdays` |
| Date Format | Preferred date display format (force-overridden every save — USR-RULE-007) | enum | No | mm-dd-yyyy | user-entered | `vtiger_field` 440; `.date_format` |
| Calendar Hour Format | 12hr/24hr display | enum | No | am-pm | user-entered | `vtiger_field` 427; `.hour_format` |
| Day Starts At | Calendar view start-of-day | text(time) | No | 10:00 | user-entered | `vtiger_field` 429; `.start_hour` |
| Day Ends At | Calendar view end-of-day | text(time) | No | 23:00 | user-entered | `vtiger_field` 428; `.end_hour` |
| Calendar Display Setting | Open Question: structure not confirmed | text | No | NULL | unclear | `.calendar_display_setting` |
| View Calendar Install Sales Menu | Home-screen widget toggle | boolean | No | Yes | user-entered | `.view_calendar_install_sales_menu` |
| Tag Cloud View | Legacy "tag cloud" home-page widget toggle | int | No | 0 | user-entered | `.tagcloud_view` |
| Internal Mail Composer | Whether the in-app mail composer is enabled | boolean | Yes | 1 | user-entered | `vtiger_field` 449; `.internal_mailer` |
| Buy-Out-Received Email Alert | Notification toggle | boolean | Yes | No | user-entered | `.buyoutrcvdemail` |
| Non-Stock Buy-Out-Received Email Alert | Notification toggle | boolean | Yes | No | user-entered | `.nsbuyoutrcvdemail` |
| Send Email Notification On Finalizing BOPO | Buyout-PO notification toggle | boolean | No | NULL | user-entered | `vtiger_field` 4494; `.sendemailon_pofinalize` |
| Send Email Notification On Receiving BOPO | Buyout-PO notification toggle | boolean | No | NULL | user-entered | `vtiger_field` 4495; `.sendemailon_poreceive` |
| Online Orders Notification | Notification toggle | enum | No | NULL | user-entered | `vtiger_field` 1610; `.onlineorder` |
| Over ST Receive Notification | Notification toggle | enum | No | NULL | user-entered | `vtiger_field` 1898; `.onlinest` |
| Show Inbound ST Notification | Notification popup toggle | boolean | Yes | NULL | user-entered | `vtiger_field` 3183; `.instpopup` |
| Show Outbound ST Notification | Notification popup toggle | boolean | Yes | NULL | user-entered | `vtiger_field` 3184; `.outstpopup` |
| Show ST Print Notifications | Notification popup toggle | boolean | Yes | NULL | user-entered | `vtiger_field` 3301; `.cronstprintpopup` |
| Print Template ST by Print Server | Whether ST template prints route via print server | boolean | Yes | NULL | user-entered | `vtiger_field` 3586; `.printcronstviaprintserver` |
| Finalized WO Notification For POS Master Account | Notification toggle | enum | No | NULL | user-entered | `vtiger_field` 3388; `.finalizedwo` |
| Show PPV Notification | Priority-Payment-Vault alert toggle | boolean | No | No | user-entered | `vtiger_field` 3320; `.showppvalert` |
| Show Other-Location-SO Popup | Warning-popup toggle | boolean | Yes | NULL | user-entered | `vtiger_field` 1993; `.showolspopup` |
| Display Master-Account-Location Restriction at POS | Toggle | boolean | Yes | NULL | user-entered | `vtiger_field` 3256; `.showaccountswithloc` |
| Sound Notification for Web Order | Audible alert toggle | enum | No | NULL | user-entered | `vtiger_field` 2061; `.won` |
| Sound Notification for Store Transfer | Audible alert toggle | text | No | "" | user-entered | `vtiger_field` 2062; `.stn` |
| Allow User To Change Photograph | Self-service UI-visibility toggle | boolean | No | off | user-entered | `vtiger_field` 3758; `.allowphotograph` |
| Allow User To Change Sound Notification | Self-service UI-visibility toggle | boolean | No | off | user-entered | `vtiger_field` 3759; `.allowsoundnotification` |
| Show Time-Off/Personal-Days Detail Tab | Self-service UI-visibility toggle | boolean | No | off | user-entered | `vtiger_field` 3760; `.allowtimeoffdetails` |
| Show Time Card Tab | Self-service UI-visibility toggle | boolean | No | off | user-entered | `vtiger_field` 3761; `.allowtimecard` |
| Show Home Page Components Tab | Self-service UI-visibility toggle | boolean | No | off | user-entered | `vtiger_field` 3762; `.allowhomepagecompo` |
| Show My Groups Tab | Self-service UI-visibility toggle | boolean | No | off | user-entered | `vtiger_field` 3763; `.allowmygrouptabs` |
| Delivery Module User | Delivery-driver flag | enum | No | NULL | user-entered | `vtiger_field` 1574; `.dmuser` |
| Pending Delivery Status | Pending-status label | text | Yes | No | user-entered | `vtiger_field` 1575; `.pdmstatus` (written cross-module by PendingDeliveries — see `integrations.md`) |
| Delivery Status | Live delivery-clock status — confirmed dead (column name has a leading space, Schema Drift #2) | enum-ish text | Yes | CLOCKED OUT | system-set | `` ` deliverystatus` `` (leading space in the live column name) |
| Transfer to Website | Whether assignments/records transfer to the web channel | enum | No | NULL | user-entered | `vtiger_field` 1514; `.transfertoweb` |
| Invoice Format | Print/report preference | enum | No | NULL | user-entered | `vtiger_field` 3138; `.inv_format` |
| Email Document Format | Print/report preference | enum | Yes | NULL | user-entered | `vtiger_field` 3806; `.email_doc_format` |
| Printing Method | Print/report preference | enum | Yes | NULL | user-entered | `vtiger_field` 3376; `.printingmethod` |
| Report Default Page | Print/report preference | enum | No | Report List | user-entered | `vtiger_field` 3149; `.reportdefault_page` |
| SO Default Transaction Type | New-SO default | reference/enum | No | 1 | user-entered | `vtiger_field` 3265; `.sodefault_transaction` |
| SO PPL Checkbox Default | New-SO default toggle | enum | No | NULL | user-entered | `vtiger_field` 3712; `.sopplcheckbox` |
| Show PPL Pick Button on SO Detail | New-SO default toggle | enum | No | NULL | user-entered | `vtiger_field` 3713; `.sopplpickbtn` |
| Show PPL Pick Button on ST Detail | New-ST default toggle | text | Yes | NULL | user-entered | `vtiger_field` 3836; `.stpplpickbtn` |
| View Product CC/Alternate Cost on POS | POS display preference | boolean | No | on | user-entered | `vtiger_field` 3296; `.viewproductcostpos` |
| Default POS Field 1 | POS display preference | enum | No | "" | user-entered | `vtiger_field` 4367; `.default_pos_field1` |
| Default POS Field 2 | POS display preference | enum | No | "" | user-entered | `vtiger_field` 4368; `.default_pos_field2` |
| Fasterbid URL | External "Fasterbid" integration endpoint | text | No | NULL | user-entered | `vtiger_field` 4144; `.fasterbidurl` |
| Fasterbid FTP URL/User/Password | External Fasterbid FTP credentials | text | No | NULL | user-entered | `vtiger_field` 4145/4146/4147; `.fasterbid_ftp_url`/`_user`/`_password` |
| Webmail Client URL | External webmail client URL | text | No | http://webmail.gofuse5.com | user-entered | `vtiger_field` 3148; `.webmail_url` |
| QuickBooks List ID | Employee sync pointer — integration confirmed dead (R11) | identifier | Yes | NULL | system-set (integration) | `.qb_listid` |
| QuickBooks Edit Sequence | Employee sync pointer — integration confirmed dead | text | Yes | NULL | system-set (integration) | `.qb_editsequence` |
| QuickBooks List ID (Rep) | Sales-Rep sync pointer — integration confirmed dead | identifier | Yes | NULL | system-set (integration) | `.qb_listid_rep` |
| QuickBooks Edit Sequence (Rep) | Sales-Rep sync pointer — integration confirmed dead | text | Yes | NULL | system-set (integration) | `.qb_editsequence_rep` |
| QB Costs Ledger | QuickBooks GL-account mapping — Schema Drift #1, orphaned `tabid=0` metadata | reference/enum | No | NULL | system-set (integration) | `vtiger_field` 1634 (tabid=0); `.qb_costsledger` |
| QB SO Item Name | QuickBooks GL-account mapping — Schema Drift #1 | text | No | NULL | system-set (integration) | `vtiger_field` 1635 (tabid=0); `.qb_soitem` |
| SO Merchandise Inventory Chart of Account | QuickBooks GL-account mapping — Schema Drift #1 | reference/enum | No | NULL | system-set (integration) | `vtiger_field` 1892 (tabid=0); `.qb_main_inv` |
| SO Core Inventory Chart of Account | QuickBooks GL-account mapping — Schema Drift #1 | reference/enum | No | NULL | system-set (integration) | `vtiger_field` 1893 (tabid=0); `.qb_core_inv` |
| VIR Merchandise Inventory Chart of Account | QuickBooks GL-account mapping — Schema Drift #1 | reference/enum | No | NULL | system-set (integration) | `vtiger_field` 1894 (tabid=0); `.qb_vi_main_inv` |
| VIR Core Inventory Chart of Account | QuickBooks GL-account mapping — Schema Drift #1 | reference/enum | No | NULL | system-set (integration) | `vtiger_field` 1895 (tabid=0); `.qb_vi_core_inv` |
| Poreconcile Default Date | Open Question: plausible meaning inferred from name only | text/date-ish | No | NULL | user-entered | `.poreconciledefaultdate` |
| 2FA Verification Code | One-time login verification code (15-minute validity window) | text | No | "" | system-set | `.user_authcode` |
| 2FA Code Generated At | Generation timestamp for the 2FA code | datetime | No | NULL | system-set | `.user_authcode_date` |

### User-Role Assignment

Backed by `vtiger_user2role`.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| User | The User this assignment is for | reference/identifier(PK) | Yes | NULL | system-set | `.userid` |
| Role | The Role assigned to this user | reference | Yes | NULL | user-entered (admin) | `vtiger_field` 421 "Role"; `.roleid` |

### User-Group Membership

Backed by `vtiger_users2group`.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Group | The Group | reference/identifier(PK) | Yes | NULL | user-entered (admin) | `.groupid` |
| User | The member User | reference/identifier(PK) | Yes | NULL | user-entered (admin) | `.userid` |

### Role

Backed by `vtiger_role`.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Role ID | Primary key — legacy uses a composite string id (e.g. `H2`, `H2_1`) encoding hierarchy position | identifier | Yes | NULL | system-set | `.roleid` |
| Role Name | Display name | text | No | NULL | user-entered | `.rolename` |
| Parent Role | Self-referencing FK; `H2` (President) is the root, protected from deletion | reference | No | NULL | user-entered/system-set | `.parentrole` |
| Depth | Cached nesting depth, recomputed on reparenting | integer | No | NULL | system-set (derived) | `.depth`; cf. `RoleDragDrop.php` |

### Role Picklist Value Restriction

Backed by `vtiger_role2picklist`.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Role | The Role this restriction applies to | reference/identifier(PK) | Yes | NULL | user-entered (admin) | `.roleid` |
| Picklist Value | The specific value made visible to this role | reference/identifier(PK) | Yes | NULL | user-entered (admin) | `.picklistvalueid` |
| Picklist | Which picklist (field) this value belongs to | reference/identifier(PK) | Yes | NULL | user-entered (admin) | `.picklistid` |
| Sort Order | Display order within the role's restricted view | integer | No | NULL | user-entered (admin) | `.sortid` |

### Role-Profile Assignment

Backed by `vtiger_role2profile`.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Role | The Role | reference/identifier(PK) | Yes | NULL | user-entered (admin) | `.roleid` |
| Profile | The Profile this role inherits permissions from | reference/identifier(PK) | Yes | NULL | user-entered (admin) | `.profileid` |

### Role Location Security Setting

Backed by `vtiger_role_locations`.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Setting ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| Role | The Role this setting applies to | reference | Yes | NULL | user-entered (admin) | `.roleid` |
| Location | The Location this setting applies to | reference | Yes | NULL | user-entered (admin) | `.location_id` |
| Inactivity Logoff (minutes) | Minutes of inactivity before auto-logoff — Open Question: unit not independently confirmed | number | Yes | NULL | user-entered (admin) | `.inactivity_logoff` |
| Auto Clock-Out (minutes/hours) | Auto clock-out timing threshold — Open Question: unit not independently confirmed | number | Yes | NULL | user-entered (admin) | `.auto_clockout` |

### Role Report Access Grant

Backed by `lbm_role_reports`.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Grant ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| Role | The Role granted access | reference | Yes | NULL | user-entered (admin) | `.roleid` |
| Report Static Identifier | The custom report's static identifier (references `vtiger_customreport.staticidentifier`) | reference(text key) | Yes | NULL | user-entered (admin) | `.staticidentifier` |

### Group

Backed by `vtiger_groups`.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Group ID | Primary key | identifier | Yes | NULL | system-set | `.groupid` |
| Group Name | Display name (unique in prose, not DB-enforced — see Known Gaps) | text | No | NULL | user-entered | `.groupname` |
| Description | Free-text description | text | No | NULL | user-entered | `.description` |

### Group Nesting (Group-in-Group)

Backed by `vtiger_group2grouprel`.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Group | The containing Group | reference/identifier(PK) | Yes | NULL | user-entered (admin) | `.groupid` |
| Contains Group | The member Group nested inside it | reference/identifier(PK) | Yes | NULL | user-entered (admin) | `.containsgroupid` |

### Group Membership (Role / Role-and-Subordinates)

Two legacy tables with the same shape, differing in whether membership cascades to subordinate
roles — unified into one under R4.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Group | The Group | reference/identifier(PK) | Yes | NULL | user-entered (admin) | `vtiger_group2role.groupid` / `vtiger_group2rs.groupid` |
| Role | The member Role (whole-role table) | reference/identifier(PK) | Yes | NULL | user-entered (admin) | `vtiger_group2role.roleid` |
| Role-and-Subordinates | The member Role, cascading to all subordinate roles (composite token, not a bare FK, in the legacy table) | reference(composite)/identifier(PK) | Yes | NULL | user-entered (admin) | `vtiger_group2rs.roleandsubid` |

### Profile

Backed by `vtiger_profile`.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Profile ID | Primary key | identifier | Yes | auto_increment | system-set | `.profileid` |
| Profile Name | Display name | text | Yes | NULL | user-entered | `.profilename` |
| Description | Free-text description | text | No | NULL | user-entered | `.description` |

### Profile Field-Level Permission

Backed by `vtiger_profile2field`.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Profile | The Profile this permission applies to | reference/identifier(PK) | Yes | NULL | user-entered (admin) | `.profileid` |
| Module (Tab) | Which module the field belongs to | reference | No | NULL | system-set | `.tabid` |
| Field | The specific field this permission governs | reference/identifier(PK) | Yes | NULL | user-entered (admin) | `.fieldid` |
| Visible | Whether visible for this profile | boolean | No | NULL | user-entered (admin) | `.visible` |
| Read-Only | Whether read-only (visible, not editable) for this profile | boolean | No | NULL | user-entered (admin) | `.readonly` |

### Profile Global Action Permission

Backed by `vtiger_profile2globalpermissions`.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Profile | The Profile | reference/identifier(PK) | Yes | NULL | user-entered (admin) | `.profileid` |
| Global Action | The org-wide action being permissioned — Open Question: action catalog not enumerated | reference/identifier(PK) | Yes | NULL | user-entered (admin) | `.globalactionid` |
| Permission | Whether granted | boolean | No | NULL | user-entered (admin) | `.globalactionpermission` |

### Profile Module Action Permission

Backed by `vtiger_profile2standardpermissions`.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Profile | The Profile | reference/identifier(PK) | Yes | NULL | user-entered (admin) | `.profileid` |
| Module (Tab) | The module this permission governs | reference/identifier(PK) | Yes | NULL | user-entered (admin) | `.tabid` |
| Operation | The CRUD-style operation (View/Edit/Delete/etc.) | identifier(PK) | Yes | NULL | user-entered (admin) | `.Operation` |
| Permission | Whether granted (defaults to granted when the request field is absent — USR-RULE-050) | boolean | No | NULL | user-entered (admin) | `.permissions` |

### Profile Module (Tab) Access

Backed by `vtiger_profile2tab`.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Row ID | Primary key | identifier | Yes | auto_increment | system-set | `.profile2tabid` |
| Profile | What this coarse access toggle governs | reference | No | NULL | user-entered (admin) | `.profileid` |
| Module (Tab) | What this coarse access toggle governs | reference | No | NULL | user-entered (admin) | `.tabid` |
| Permission | Whether the profile can see the module at all — Open Question: polarity (0 = granted, per vtiger convention) not independently re-verified | boolean | Yes | 0 | user-entered (admin) | `.permissions` |

### Profile Related-List/Utility Permission

Backed by `vtiger_profile2utility`.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Profile | Scope of the utility permission | reference/identifier(PK) | Yes | NULL | user-entered (admin) | `.profileid` |
| Module (Tab) | Scope of the utility permission | reference/identifier(PK) | Yes | NULL | user-entered (admin) | `.tabid` |
| Utility/Activity | The specific utility action — Open Question: activity-id-to-label catalog not enumerated | reference/identifier(PK) | Yes | NULL | user-entered (admin) | `.activityid` |
| Permission | Whether granted | boolean | No | NULL | user-entered (admin) | `.permission` |

### Sharing Rule

All nine legacy tables (`vtiger_datashare_role2role`, `_role2group`, `_role2rs`, `_rs2role`,
`_rs2rs`, `_rs2grp`, `_grp2role`, `_grp2grp`, `_grp2rs`) share the same three-column shape;
presented once per R3, unified in the new design.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Sharing Rule ID | Primary key — a shared id space across all nine physical tables | identifier | Yes | NULL | system-set | `.shareid` (all 9 tables) |
| Source Actor | The Role / Role-and-Subordinates / Group records are shared *from* | reference | No | NULL | user-entered (admin) | `share_roleid` (role2role/role2group/role2rs) / `share_roleandsubid` (rs2role/rs2rs/rs2grp) / `share_groupid` (grp2role/grp2grp/grp2rs) |
| Target Actor | The Role / Role-and-Subordinates / Group granted visibility *into* the source | reference | No | NULL | user-entered (admin) | `to_roleid` (role2role/rs2role/grp2role) / `to_groupid` (role2group/rs2grp/grp2grp) / `to_roleandsubid` (role2rs/rs2rs/grp2rs) |
| Permission Level | Access level granted — Open Question: exact integer encoding not independently re-verified | integer(enum) | No | NULL | user-entered (admin) | `.permission` (all 9 tables) |

### Sharing Rule Related-Module Scope

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| **Base module-scope row (`vtiger_datashare_module_rel`, every sharing rule has one)** | | | | | | |
| Sharing Rule | The rule this scope row belongs to | reference | Yes | NULL | system-set | `.shareid` |
| Module (Tab) | The module the rule applies to | reference | No | NULL | user-entered (admin) | `.tabid` |
| Cascade Relation Type | Whether/how the rule cascades to related-list modules | text(enum-ish) | No | NULL | user-entered (admin) | `.relationtype` |
| **Related-module definition (`vtiger_datashare_relatedmodules`)** | | | | | | |
| Related-Module Scope ID | Primary key | identifier | Yes | NULL | system-set | `.datashare_relatedmodule_id` |
| Module (Tab) | The primary module | reference | No | NULL | system-set | `.tabid` |
| Related Module (Tab) | The related-module extension | reference | No | NULL | system-set | `.relatedto_tabid` |
| **Per-rule related-module permission (`vtiger_datashare_relatedmodule_permission`)** | | | | | | |
| Sharing Rule | Which rule this permission is for | reference | Yes | NULL | system-set | `.shareid` |
| Related-Module Scope | Which scope this permission is for | reference | Yes | NULL | system-set | `.datashare_relatedmodule_id` |
| Permission | Access level granted for the related module | integer(enum) | No | NULL | user-entered (admin) | `.permission` |

### Time Clock Record

Backed by `vtiger_user_clocksys`.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Clock Record ID | Primary key | identifier | Yes | auto_increment | system-set | `.clock_id` |
| User Name | Username at time of punch (denormalized copy, not a live FK) | text | Yes | NULL | system-set | `.user_name` |
| User | The User who punched | reference | Yes | NULL | system-set | `.user_id` |
| User IP | IP address the punch was made from | text | Yes | NULL | system-set | `.user_ip` |
| Clock In | Clock-in timestamp | datetime | No | NULL | system-set | `.clock_in`; cf. `ClockHistory.php:143` |
| Clock Out | Clock-out timestamp | datetime | No | NULL | system-set | `.clock_out`; cf. `AutoOffTimer.php` |
| Punch Date | Calendar date of the punch | date | Yes | NULL | system-set | `.currdate` |
| Status | CLOCK IN (open) / CLOCK OUT (completed) — a genuine DB-enum | enum | Yes | NULL | system-set | `.status` |
| Hours Type | Classification of the hours (Regular/Holiday/Personal/Sick/Vacation) | enum(text) | Yes | REGULAR HOURS | system-set | `.typeofhours` |
| Help Message | Free-text explanatory note, populated only by the auto-clock-out safety-net path — a confirmed gap in the original field catalog, added per the consolidation review's own addendum | text | No | NULL (populated only on system-forced close) | system-set | Column presence confirmed by consolidation-review addendum, not independently re-DESCRIBE'd in Pass 1 |

### Clock-In Task Detail

Backed by `fuse5_user_clockin_details`.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Detail ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| User | The User this task annotation belongs to | reference | Yes | 0 | system-set | `.userid` |
| Task Details | Free-text description of what the user is working on | text | No | NULL | user-entered | `.details` |
| Sales Order | Linked SO | reference | No | 0 | user-entered | `.soid` |
| Sales Order Number | Denormalized SO number | text | No | 0 | system-set (derived) | `.sonumber` |
| Product | Linked product | reference | No | 0 | user-entered | `.productid` |
| Line Code | Linked line-code | reference | No | 0 | user-entered | `.linecode` |
| Product Number | Denormalized product number | text | No | 0 | system-set (derived) | `.prodnum` |
| Sequence | Display/entry order | integer | No | 0 | system-set | `.sequence` |
| Labor Status | Completion status of this piece of labor — Open Question: no confirmed enum enumerated | enum | No | "" | user-entered | `.labstatus` |
| Added On | Creation timestamp | datetime | No | NULL | system-set | `.addedon` |

### Clock-In Task Catalog Entry

Backed by `fuse5_user_clockin_details_list`.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Catalog Entry ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| Task Label | The reusable task-label text | text | No | NULL | user-entered | `.details` |
| User | Owner of this per-user catalog entry (not shared) | reference | No | 0 | system-set | `.userid` |
| Sequence | Pick-list display order | integer | No | 0 | user-entered | `.sequence` |
| Deleted | Soft-delete flag | boolean | No | 0 | system-set | `.deleted` |
| Added On | Creation timestamp | datetime | No | NULL | system-set | `.addedon` |
| Modified On | Last-modified timestamp | datetime | No | CURRENT_TIMESTAMP | system-set | `.modifiedon` |

### Personal Day

Backed by `vtiger_personal_days`.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Personal Day ID | Primary key | identifier | Yes | auto_increment | system-set | `.pdayid` |
| Date | Date of the personal-day entry | date | Yes | NULL | user-entered | `.personalsrtdate` |
| Start Time | Time-off period start | text(time) | Yes | NULL | user-entered | `.starttime`; cf. `AddPersonalDay.php` |
| End Time | Time-off period end | text(time) | Yes | NULL | user-entered | `.endtime` |
| Duration | Computed duration of the period | text | Yes | NULL | derived | `.timeduration`; cf. `AddTimeOff.php:87` |
| Description | Free-text reason | text | Yes | NULL | user-entered | `.personaldesc` |
| User | The User taking the personal day — **legacy column is `varchar(2)`, a confirmed active data-corruption bug for any user id ≥ 100 (Schema Drift #3)** | reference | Yes | NULL | system-set | `.userid` |
| Deleted | Soft-delete flag | boolean(text) | Yes | 0 | system-set | `.deleted`; cf. `delPersonalHoliday.php` |

### Holiday (Catalog)

Backed by `vtiger_holidays`.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Holiday ID | Primary key | identifier | Yes | auto_increment | system-set | `.holidaysid` |
| Holiday Name | Display name (e.g. "Christmas") | text | Yes | NULL | user-entered (admin) | `.holidays` |
| Presence | Standard vtiger picklist-value active/inactive flag | boolean | Yes | 1 | system-set | `.presence` |
| Picklist Value ID | Cross-reference to the generic vtiger picklist-value id space | reference | Yes | 0 | system-set | `.picklist_valueid` |

### Holiday Assignment (Per-User)

Backed by `vtiger_holidaylist_user`.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Assignment ID | Primary key | identifier | Yes | auto_increment | system-set | `.holidaylistid` |
| User | Observing user | reference | Yes | NULL | system-set | `.user_id`; cf. `addholiday.php` |
| User Name | Denormalized username copy | text | Yes | NULL | system-set | `.user_name` |
| Holiday Date | The specific calendar date this user has off | date | Yes | NULL | user-entered (admin) | `.holidaydate` |

### Login History

Backed by `vtiger_loginhistory`.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Login Record ID | Primary key | identifier | Yes | auto_increment | system-set | `.login_id` |
| Username | Session username — legacy matches by string, not FK | text | Yes | NULL | system-set | `.user_name`; cf. `LoginHistory.php:135` |
| User IP | Originating IP | text | Yes | NULL | system-set | `.user_ip` |
| Login Time | Session start timestamp | datetime | Yes | 0000-00-00 00:00:00 | system-set | `.login_time` |
| Logout Time | Session end timestamp | datetime | Yes | CURRENT_TIMESTAMP | system-set | `.logout_time`; cf. `LoginHistory.php:154` |
| Status | Session status (e.g. Signed In/Signed Out) | enum | No | NULL | system-set | `.status` |
| Session ID | The PHP session id associated with this login | identifier | Yes | NULL | system-set | `.session_id` |

### Mail Account

Backed by `vtiger_mail_accounts`.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Mail Account ID | Primary key | identifier | Yes | NULL | system-set | `.account_id` |
| User | The owning User | reference | Yes | NULL | system-set | `.user_id`; cf. `SaveMailAccount.php` |
| Display Name | Sender identity field | text | No | NULL | user-entered | `.display_name` |
| Mail Address | Sender identity field | text | No | NULL | user-entered | `.mail_id` |
| Account Name | Sender identity field | text | No | NULL | user-entered | `.account_name` |
| Mail Protocol | Incoming-mail connection type | enum | No | NULL | user-entered | `.mail_protocol` |
| Mail Username | Incoming-mail connection | text | No | NULL | user-entered | `.mail_username` |
| Mail Password | Incoming-mail connection (encrypted on save) | text | Yes | NULL | user-entered (encrypted on save) | `.mail_password`; cf. `SaveMailAccount.php` |
| Mail Server Name | Incoming-mail server config | text | No | NULL | user-entered | `.mail_servername` |
| Inbox Refresh Interval | Incoming-mail server config | integer | No | NULL | user-entered | `.box_refresh` |
| Mails Per Page | Incoming-mail server config | integer | No | NULL | user-entered | `.mails_per_page` |
| SSL Type | Connection security config | enum | No | NULL | user-entered | `.ssltype` |
| SSL Method | Connection security config | enum | No | NULL | user-entered | `.sslmeth` |
| Is Internal Mailer | Usage flag | boolean | No | 0 | user-entered | `.int_mailer` |
| Status | Usage flag | text | No | NULL | system-set | `.status` |
| Is Default | Usage flag | boolean | No | NULL | user-entered | `.set_default` |
| Outgoing Server | SMTP config | text | No | NULL | user-entered | `.server` |
| Outgoing Server Port | SMTP config | integer | No | NULL | user-entered | `.server_port` |
| Outgoing Server Username | SMTP config | text | No | NULL | user-entered | `.server_username1` |
| Outgoing Server Password | SMTP config | text | No | NULL | user-entered | `.server_password1` |
| Server Type | Connection classification | enum | No | email | user-entered | `.server_type` |
| SMTP Auth | Auth requirement | boolean | No | NULL | user-entered | `.smtp_auth` |

### Notification Scheduler

Backed by `vtiger_notificationscheduler`.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Scheduler ID | Primary key | identifier | Yes | auto_increment | system-set | `.schedulednotificationid` |
| Scheduler Name | Unique display name | text | No | NULL | user-entered (admin) | `.schedulednotificationname` |
| Active | Whether currently active | boolean | No | NULL | user-entered (admin) | `.active`; cf. `updateNotificationSchedulers.php` |
| Notification Subject | Email template | text | No | NULL | user-entered (admin) | `.notificationsubject` |
| Notification Body | Email template | text | No | NULL | user-entered (admin) | `.notificationbody` |
| Label | Short label | text | No | NULL | user-entered (admin) | `.label` |
| Type | Notification category | text | No | NULL | user-entered (admin) | `.type` |

### Word Template

Backed by `vtiger_wordtemplates`.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Template ID | Primary key | identifier | Yes | NULL | system-set | `.templateid` |
| Filename | Original uploaded filename | text | Yes | NULL | user-entered | `.filename`; cf. `binaryfilelist.php` |
| Module | Which module this template is usable from (Contacts/Leads/Users) | enum(text) | Yes | NULL | user-entered | `.module`; cf. `populatetemplate.php` |
| Created Time | Upload timestamp | datetime | Yes | CURRENT_TIMESTAMP | system-set | `.date_entered` |
| Parent Type | Further classification of the intended parent record type | text | Yes | NULL | user-entered | `.parent_type` |
| Data | Binary template file content | binary(blob) | No | NULL | user-entered | `.data`; cf. `downloadfile.php` |
| Description | Free-text description | text | No | NULL | user-entered | `.description` |
| File Size | Stored size | text | Yes | NULL | system-set (derived) | `.filesize` |
| File Type | Extension/MIME classification | text | Yes | NULL | system-set (derived) | `.filetype` |
| Deleted | Soft-delete flag | boolean | Yes | 0 | system-set | `.deleted`; cf. `deletewordtemplate.php` |

## Known Gaps

**Entities not carried forward as normative business entities**: User Import Batch Marker (generic
vtiger CRM infra, `vtiger_users_last_import`) and Role Name Seed List (`user_roles` — unconfirmed
relationship to the live `vtiger_role` hierarchy). Additionally excluded per the source blueprint's
consolidation/implementation-plan passes: `vtiger_mail_accounts1` (a byte-for-byte schema duplicate
of Mail Account with zero confirmed readers/writers across all 8 blueprint passes — Schema Drift
#4) and `vtiger_usertype` (no confirmed live column reference anywhere).

**17 of 18 flagged fields remain genuine open items** with no meaning resolved by any later
blueprint pass (the 18th, `vtiger_mail_accounts1`, is the table-level item above, not a field):
`jobtitle` vs. `title`, `created_date` vs. `date_entered`, `holidays` (hours) vs. the Holiday
Assignment entity, `org_access_level`, `defhomeview`, `cal_color` vs. `event_user_color`,
`namedays`/`workdays`, `calendar_display_setting`, `poreconciledefaultdate`, the two
`role_location_security` unit fields (`inactivity_logoff`/`auto_clockout`), `globalactionid`/
`activityid` catalogs, the `sharing_rule` permission-level integer encoding, `profile_tab_access`
permission polarity, `user_roles`'s relationship to `Role`, `vtiger_usertype`, and
`vtiger_link_fuse5_sub_sharing` (surfaced by a table-name search but never `DESCRIBE`'d in any
pass). These are flagged for SME confirmation before being assigned normative meaning — not guessed
at here.

**The `deliverystatus` field** (leading-space column name, on User Header) is the one field in this
catalog whose **liveness**, not just meaning, is confirmed negative: no write site anywhere in the
repo, all live users show the unchanged default — flagged for exclusion rather than
preservation-pending-confirmation.

**Six QuickBooks GL-mapping columns' `vtiger_field` metadata carries `tabid=0`** instead of
`tabid=29` (Users) — Schema Drift #1. This orphaning means these six fields likely do not appear on
the standard User Edit/Detail form at all; where/how they are actually maintained today is
unconfirmed, flagged for SME confirmation before a metadata-driven migration silently drops them.

**No confirmed unique constraint is enforced anywhere on a name only described as "(unique)" in
prose** — Group Name, Notification Scheduler Name, and Username itself (whose fully-implemented
server-side duplicate-username guard exists in code but is never actually called from the real save
path — see `risks-and-open-questions.md` R16).

**Recommended rewrite schema** (this session's own proposal, not a blueprint finding — see
`docs_from_blueprint/module/Users/02-entities-and-fields.md` §5 for the full reasoning): split the
User Header's ~120 columns into a lean core identity table plus cohesive one-to-one child tables
(HR profile, UI/calendar preferences, POS/print defaults); replace the granular notification-toggle
columns with a `user_notification_preference` row-per-type table; replace the `Sales Accounts`
JSON blob with a real `user_assigned_account` junction table; replace `Home Page Widget Order`'s
serialized list with a `user_home_widget` child table; drop the six QuickBooks GL-mapping columns
and `deliverystatus` entirely (both confirmed dead); type `personal_day.user_id` as a required
integer FK (closing the `varchar(2)` corruption bug) with a migration/backfill step flagging rows
that cannot be unambiguously remapped; type `Salary` as `money`, not free text; make every FK a
real enforced database constraint, with `role`/`profile`/`group` defaulting to `RESTRICT` on delete
while dependent rows exist (the missing-constraint-plus-missing-validation combination is the exact
confirmed mechanism of the `deleteRole()` incident — see `risks-and-open-questions.md` R1) and
purely-dependent child rows (Role Picklist Restrictions, Profile permission rows, Sharing Rule
module-scope rows) using `CASCADE`. Every table in the new design also carries `tenant_id` per R7.
This proposed schema is a starting point for Stage 3 schema design, not a finalized migration plan.
