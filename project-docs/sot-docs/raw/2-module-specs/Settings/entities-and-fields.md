# Settings — Entities & Fields

> Every entity, every field, individually. No grouping/summarizing — that's how fields get lost.
> Legacy table/column names are a first-class column in the field catalog below, not an optional
> footnote — this project's whole documentation discipline rests on every claim being traceable to
> a specific source, and a footnote is too easy to skip. See
> `_deviations-from-original-template.md` in this folder.

Source: `docs_from_blueprint/module/Settings/02-entities-and-fields.md`, itself sourced from
`blueprint/module/Settings/01-entities-fields.md` ("Pass 1 — Settings Entity/Config-Area Overview and
Field Catalog"). Legacy Trace values below are taken directly from the raw blueprint's own
DESCRIBE-confirmed field catalogs.

## Applicability

Applicable, with a governing caveat the source is explicit about: **Settings has no single owned
business entity.** `SELECT tabid,name FROM vtiger_tab WHERE name='Settings'` returns zero rows —
Settings has no `vtiger_tab` entry at all. It is an administrative area spanning roughly 15 largely
unrelated system-configuration sub-domains, each with its own distinct backing table(s), most without
`vtiger_field` metadata since they are plain admin-config tables, not CRM entities. There is no
cross-area "Relationship summary" the way a normal business-entity module has one — that absence is
itself the correct characterization, not a documentation gap.

Two cross-cutting threads recur throughout and are named once here rather than repeated per entity:

1. **The generic key/value settings table** `vtiger_supportedfield` (742 live rows) backs hundreds of
   individually-named admin toggles across ~35 functional sections of the whole ERP — see §2.9.
2. **Roles/Users and Location cross-references** — the Roles/Profiles/Permissions/Sharing area (§2.2)
   and the Location/Division/Region/Printer area (part of §2.5) are each, in large part, the CRUD/
   admin-UI write surface for schema the Users and Location modules' own specs already catalog
   end-to-end as consumers — those tables are cited, not re-catalogued, here.

Roughly 15 tables across the whole module remain at table-purpose depth (name/purpose/row-scale, no
full column list) by explicit source-level judgment call — shared vtiger-core metadata infrastructure,
and families of structurally near-identical small lookup/config tables. This mirrors the source
blueprint's own judgment call rather than artificially flattening the module's genuinely uneven
structure. Every table the source individually itemized field-by-field is itemized field-by-field
below.

## Entity List

| Entity | Purpose |
|---|---|
| Organization Details | Tenant's singleton canonical org-profile record (name, address, tax/accounting, branding, mobile-app license, live/practice mode) |
| Company Profile (Multi-Profile) | A separate, near-identical multi-profile variant of Organization Details with no confirmed sync mechanism |
| Inventory Terms & Conditions | Org's single legal terms-and-conditions text block for inventory/sales documents |
| B2C Site Branding | Per-B2C-storefront branding (skin color, panel layout) for a ChannelAdvisor/B2C integration |
| Custom Field Labels | Not a table — patches three hardcoded Products custom-field labels directly on `vtiger_field` |
| Theme / Branding Options | Color-palette/font/layout theme record with an "is default" flag |
| Google Maps API Key | Singleton org-level Google Maps API key |
| Outbound Email / SMTP Configuration | Org's outbound mail-server credentials |
| Custom Invoice/Order Numbering | Per-module document-numbering configuration (prefix, next sequence, fixed width) |
| Mail Accounts (Incoming Mail) | Per-user configured incoming mail accounts |
| Default Org Field-Level Access | Org-wide default field visibility/read-only baseline every Role/Profile layers on top of |
| Protected Field Flag | Column on `vtiger_field` flagging a field as protected/sensitive |
| Tax Assignment Code (TAC) Table | Named tax-code lookup keyed by city/zip or code, three tax-rate components |
| Module Owner Assignment | Single admin-assigned "owner" user per module |
| Lead-to-Accounts/Contacts/Potentials Custom-Field Mapping | Declares a Lead custom field's value carries forward on conversion |
| Module Manager (Physical Delete/Restore) | Ad-hoc hard-delete/soft-restore tool over 5-6 eligible modules; not a schema-owning entity |
| QuickBooks Settings | Per-profile QuickBooks field-mapping/settings store |
| Traverse Settings | Structurally identical sibling of QuickBooks Settings for the Traverse integration |
| EDI Trading Partner Settings (DIB/EJD/Orgill) | Stored as rows in the generic settings table; no dedicated schema |
| Payment Gateway Configs (CardConnect/MX/Passport-Priority/Dejavoo/ChargeItPro) | Six near-identical per-gateway credential/config tables |
| ExpiNet Config | Per-location ExpiNet payment-terminal integration config |
| ExpiNet Terminals | Per-location ExpiNet terminal-ID-to-title mappings |
| BigCommerce Store Connection Credentials | BigCommerce API OAuth credentials, per store connection |
| E-commerce Feature Toggles | Generic enable/disable toggle table for named e-commerce features |
| WSM Pricing Groups | Named pricing groups for B2B/B2C web-store customers/accounts |
| WSM Brand-to-Linecode Conversion Map | Maps a brand's linecode scheme to the ERP's linecode scheme for two feed sources |
| WSM Extra-Info Settings | Generic key/value settings table for three B2B/B2C-related settings |
| WSM API Default Location / Default Account | Two single-row "current default" tables for API/e-commerce lookups |
| B2C Storefronts | Registered B2C storefront sites |
| FanBuilder Config | FanBuilder promotions/coupon integration config |
| F5 Platform API Keys | Fuse5's own platform API keys, admin-only gated |
| Generic External API Credentials | Credentials for external systems calling into this ERP |
| AWS S3 Bucket Credentials | AWS S3 bucket credentials, admin-only gated — the worst-defended credential in the module |
| Fuse5Connect Sub-Location Sharing / Access | Cross-sub-tenant location-sharing mechanism via SOAP |
| Tax Rate Table | Core city/state/county/zip-scoped sales-tax rate table |
| Max Tax by State | State-level cap table enforcing a maximum taxable amount per state |
| Kit Category | Kit category admin lookup |
| Division | Division admin CRUD, duplicate-name-guard defect confirmed |
| Region | Region admin CRUD, duplicate-name-guarded correctly |
| Physical Location Sort Report | Independent named-list ordering utility |
| Printers | Printer registry, one row per physical printer device |
| Module Printers | Per-module/output-type printer assignment |
| Uploaded Document | Generic binary/document upload attached to a source record |
| Uploaded Document Attach-Link | Many-to-many link for cross-module document attachment |
| Document Folder (Job-Doc Category) | Admin-managed, role-restricted document folder |
| "OKB" Upload Folder | A parallel, structurally near-identical folder-tree table |
| Word (Mail-Merge) Template | Binary Word-document template for mail-merge generation |
| Email Template | Reusable subject/body template for outbound email |
| Pick-Ticket (PT) Zone-Printer Template | Per-location, per-zone printer-to-zone assignment with scheduling |
| Audit Trail Entry | System-wide log of user actions |
| Clock History | Per-user clock-in/clock-out timekeeping record |
| Login History | Per-user login/logout session record |
| Inventory Notification + Location Assignment | Admin-configured notification template for inventory events, plus per-location activation |
| Email Notification Scheduler | Active/inactive scheduled email notification referencing an Email Template |
| Announcement | Single per-creator announcement title/body |
| WAC (Weighted-Average-Cost) Change Log | Per-product, per-location audit trail of WAC recalculation events |
| Currency (Administration) | Multi-currency master list |
| Outbound Server Configuration (Mail/Proxy/Backup) | Shared table for three outbound-server roles |
| VDP Plan / Tier / Account Assignment / Net Exceptions | Vendor Direct Pricing plan structure and account bulk-assignment |
| Commission Color-Tier Settings | Singleton 5-band commission-percent color config |
| Alternate Cost Field Configuration | Dynamic schema mechanism (live `ALTER TABLE`), not a fixed table |
| Company Holiday | Company-wide holiday date list |
| User Clock-In Detail (lookup list) | Sortable, soft-deletable clock-in reason/detail codes |
| Default Value / Lookup-Code Admin Utilities (family) | Nine small single-purpose admin lookup/default-value tables |
| Add-On Subscription Toggle | Per-feature on/off toggle with subscription date tracking |
| Data Warehouse Export Log | Audit log of channel-advisor/data-warehouse export runs |
| Slipstream (Vendor Bill-Pay) Integration Configuration | Per-location Slipstream integration config |
| SO Sub-Status & Web-Order Status (Status Manager family) | Two status-master tables plus an SO sub-status email-notification-rule table |
| Remaining Misc Admin Utility Entities | Primary Service Requested, Pro-Rating Return Term, Return Reason Code, Document Watermark, Sales Area, Paint-Care-Fee, Delivery Time Frame, POS Delivery-Method Actions |
| Generic Settings Table (`vtiger_supportedfield`) | The module's central EAV feature-flag/configuration-value store — 742 rows, ~35 sections |

## Field Catalog

### 2.1 Company / Organization Profile & Branding Configuration

#### Organization Details — `vtiger_organizationdetails`

Singleton, 1 row live. Written by `SaveCompany.php` and `updateOrganizationDetails.php`; read by
`OrganizationConfig.php` / `EditCompanyDetails.php`.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Org Detail ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| Profile Name | Label for this org-detail record (vestigial once multi-profile moved to `fuse5_companyprofiles`) | text | Yes | NULL | user-entered | `.profile_name` |
| Organization Name | The tenant's legal/display business name | text | Yes | NULL | user-entered | `.organizationname` |
| Address | Street address | text | No | NULL | user-entered | `.address` |
| City | City | text | No | NULL | user-entered | `.city` |
| State | State/province | text | No | NULL | user-entered | `.state` |
| Country | Country | text | No | NULL | user-entered | `.country` |
| Zip/Postal Code | Postal code | text | No | NULL | user-entered | `.code` |
| Phone | Main phone number | text | No | NULL | user-entered | `.phone` |
| Fax | Fax number | text | No | NULL | user-entered | `.fax` |
| Website | Company website URL | text | No | NULL | user-entered | `.website` |
| Logo Filename | Filename of the uploaded company logo | text | No | NULL | user-entered | `.logoname` |
| Logo (inline) | Inline/binary logo storage, distinct from `.logoname` — relationship unclear | text/binary | No | NULL | unclear | `.logo` — **Open Question**: relation to `.logoname` |
| Payroll Period | Pay-period cadence for payroll processing | enum | Yes | NULL | user-entered | `.payrollperiod` |
| Remit-To Address | Address printed on invoices/statements as "remit payment to" | text | Yes | NULL | user-entered | `.remitto` |
| Aconnex Buyer ID | Buyer id for an "Aconnex" EDI/marketplace integration — name unconfirmed | text | No | NULL | system-set (integration) | `.aconnexbuyerid` — **Open Question** |
| Contact First Name | First name of org's primary contact | text | No | NULL | user-entered | `.firstname` |
| Contact Middle Name | Middle name of org's primary contact | text | No | NULL | user-entered | `.middlename` |
| Contact Last Name | Last name of org's primary contact | text | No | NULL | user-entered | `.lastname` |
| Use Tax/TAC Table | How sales tax is calculated (TAC table / City-Zip / not at all) | enum | Yes | "No" | user-entered | `.usetaxtactable` |
| Mobile App License | License key enabling the mobile app integration | text | No | NULL | system-set | `.mobileapplicense` |
| Location Sort By | Default sort order applied to the location list | enum | Yes | "sequence" | user-entered | `.locsortby` |
| Language | Default UI language | text | Yes | "US English" | user-entered | `.language` |
| Live/Practice Mode | Whether the tenant is live/production or sandbox | enum | Yes | "Go Live!" | user-entered | `.f5_live_mode` |
| Accounting Method | Which accounting-system integration this org uses | enum | Yes | "QUICKBOOK" | user-entered | `.accountingmethod` |
| Tagline | Marketing tagline shown alongside branding | text | Yes | "" | user-entered | `.tagline` |
| Preloader | Filename of the loading-spinner/preloader animation asset | text | No | NULL | user-entered | `.preloader` |
| COSH Name | Alternate/short organization name — "COSH" context unexpanded | text | No | NULL | unclear | `.coshnam` — **Open Question** |
| Email Address | The org's general contact email | text | No | NULL | user-entered | `.emailaddress` |
| From-Doc Email | The "from" address on system-generated documents | text | No | "no-reply@omnna-lbm.live" | system-set | `.from_doc_email` |

**Open Question**: `StoreProfile.php`'s target table wasn't confirmed — it most likely writes into
this table, but which columns were not confirmed via grep.

#### Company Profile (Multi-Profile) — `fuse5_companyprofiles`

2 rows live plus one apparent test row.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Company Profile ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| Profile Name | Display name distinguishing this profile ("Default", "Ford Com LCC") | text | Yes | NULL | user-entered | `.profile_name` |
| Organization Name | Business name for this profile | text | Yes | NULL | user-entered | `.organizationname` |
| Address | Street address | text | No | NULL | user-entered | `.address` |
| City | City | text | No | NULL | user-entered | `.city` |
| State | State/province | text | No | NULL | user-entered | `.state` |
| Country | Country | text | No | NULL | user-entered | `.country` |
| Zip/Postal Code | Postal code | text | No | NULL | user-entered | `.code` |
| Phone | Phone number | text | No | NULL | user-entered | `.phone` |
| Fax | Fax number | text | No | NULL | user-entered | `.fax` |
| Website | Website URL | text | No | NULL | user-entered | `.website` |
| Logo Filename | Filename of this profile's logo | text | No | NULL | user-entered | `.logoname` |
| Remit-To Address | Remit-to address for this profile | text | Yes | NULL | user-entered | `.remitto` |
| Contact First Name | Primary contact first name | text | No | NULL | user-entered | `.firstname` |
| Contact Middle Name | Primary contact middle name | text | No | NULL | user-entered | `.middlename` |
| Contact Last Name | Primary contact last name | text | No | NULL | user-entered | `.lastname` |
| Tagline | Marketing tagline for this profile | text | Yes | "" | user-entered | `.tagline` |

**Open Question**: near-identical column shape to `vtiger_organizationdetails` with no code found
joining/synchronizing the two — unclear whether this is a genuinely separate multi-profile mechanism,
a newer replacement candidate, or a partially-abandoned feature.

#### Inventory Terms & Conditions — `vtiger_inventory_tandc`

Singleton by type, 1 row live (`type='Inventory'`). Written by `savetermsandconditions.php`.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| T&C ID | Primary key | identifier | Yes | NULL | system-set | `.id` |
| Type | Classifies which kind of T&C text this row holds | enum(code) | Yes | NULL | system-set | `.type` |
| Terms & Conditions Text | The legal T&C body shown/printed on inventory documents | text | No | NULL | user-entered | `.tandc` |

#### B2C Site Branding — `b2csitedetails`

0 rows live. Written/read by `B2Cdetails.php`.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Detail ID | Primary key | identifier | Yes | auto_increment | system-set | `.detailid` |
| B2C ID | Identifier of the B2C storefront/channel | reference | Yes | NULL | system-set | `.b2cid` |
| Skin Color | Branding skin/theme color | text | Yes | NULL | user-entered | `.skincolor` |
| Panel | Panel/layout selector (integer code) | enum(int) | Yes | NULL | user-entered | `.panel` — **Open Question**: value meanings unconfirmed |

#### Custom Field Labels — patches `vtiger_field` (Products module, tabid 14)

Not a distinct table. `SaveCustomLabels.php` renames the display label of three hardcoded Products
custom fields via `UPDATE vtiger_field SET fieldlabel = ? WHERE fieldname = ?` — **not scoped by
tabid**, a cross-module data-contamination risk since `cf_778`/`cf_780`/`cf_1487` also exist under
other tabids (89, 120).

| UI recordid | Target fieldname | Actual `vtiger_field.fieldid` (live) | Current label (live) | Business Meaning |
|---|---|---|---|---|
| 522 | `cf_778` | 779 | "Groups" | Products "Groups" multi-select classification field label |
| 523 | `cf_780` | 781 | "LBL_PRODUCT_SUBLINE" (unresolved, never relabeled) | Products "Subline" classification field label |
| 524 | `cf_1487` | 1488 | "LBL_SUB_CATEGORY" (unresolved, never relabeled) | Products "Sub Category" classification field label |

#### Theme / Branding Options — `theme_settings`

1 row live. Written by `themeinfo.php`.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Theme ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| Theme Title | Display name of this theme | text | Yes | NULL | user-entered | `.title` |
| Primary Color | Primary brand/UI color (hex) | text(color) | Yes | NULL | user-entered | `.primary_color` |
| Secondary Color | Secondary brand/UI color (hex) | text(color) | Yes | NULL | user-entered | `.secondary_color` |
| Focus/Cursor Color | Color for focused-field/cursor highlighting | text(color) | Yes | NULL | user-entered | `.focus_cursor_color` |
| Detail View Header Background Color | Background color of the detail-view header bar | text(color) | Yes | NULL | user-entered | `.detail_view_header_bgcolor` |
| Detail View Header Border Color | Border color of the detail-view header bar | text(color) | Yes | NULL | user-entered | `.detail_view_header_bordercolor` |
| Inner Header Gradient Color | Gradient color on inner header bars | text(color) | Yes | NULL | user-entered | `.inner_header_gradiant_color` |
| Label Background Color | Background color for field labels | text(color) | Yes | NULL | user-entered | `.label_bgcolor` |
| Button Color | Text/icon color on buttons | text(color) | Yes | NULL | user-entered | `.btn_color` |
| Button Background Color | Background color of buttons | text(color) | Yes | NULL | user-entered | `.btn_background_color` |
| Tertiary Color | Third accent brand color | text(color) | Yes | NULL | user-entered | `.tertiary_color` |
| Menu Background Color | Background color of the navigation menu | text(color) | No | "#D6D6D6" | user-entered | `.menu_background_color` |
| Table Header Background Color | Background color of list/table headers | text(color) | No | "#FFFFFF" | user-entered | `.table_header_bg_color` |
| Table Header Text Color | Text color of list/table headers | text(color) | No | "#000000" | user-entered | `.table_header_text_color` |
| Table Data Label Background Color | Background color of table data-row labels | text(color) | No | "#FFFFFF" | user-entered | `.table_data_label_bg_color` |
| Table Data Label Text Color | Text color of table data-row labels | text(color) | No | "#000000" | user-entered | `.table_data_label_text_color` |
| Table Border Color | Border color used on tables | text(color) | No | "#FFFFFF" | user-entered | `.table_border_color` |
| Font Size | Base UI font size (px) | integer | No | 14 | user-entered | `.font_size` |
| Created At | Timestamp the theme was created | datetime | No | NULL | system-set | `.created_at` |
| Is Default | Whether this is the org's currently-active theme | boolean(int) | No | 0 | system-set | `.is_default` |
| Background Text Color | Text color against the general background | text(color) | No | NULL | user-entered | `.bg_text_color` |
| Text Color | General body text color | text(color) | No | NULL | user-entered | `.text_color` |

**Open Question — dead/missing table**: `themeSettings.php`'s `themSettings` class targets
`lbm_theme_options`, confirmed via `DESCRIBE` **not to exist** in the live dev DB. Either dead code
superseded by `theme_settings`, or a table that exists only in another environment.

#### Google Maps API Key — `lbm_google_api_key`

Singleton, 1 row live.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| API Key ID | Primary key | identifier | Yes | NULL | system-set | `.id` |
| API Key | Google Maps API key used by location-mapping features | text | Yes | NULL | user-entered | `.api_key` |
| Updated By | User who last updated the key | reference | Yes | NULL | system-set | `.updated_by` |
| Updated On | Timestamp of the last update | datetime | Yes | NULL | system-set | `.updated_on` |

#### Outbound Email / SMTP Configuration — `vtiger_systems`

1 row live. Also backs Outbound Server Configuration (§2.7) — the same physical table, different
concern-area write surface.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| System Config ID | Primary key | identifier | Yes | NULL | system-set | `.id` |
| Mail Server | Outbound SMTP server hostname | text | No | NULL | user-entered | `.server` |
| Server Port | SMTP server port | integer | No | NULL | user-entered | `.server_port` |
| Server Username | Login username for the SMTP server | text | No | NULL | user-entered | `.server_username` |
| Server Password | Login password for the SMTP server — plaintext, no hashing/encryption | text | No | NULL | user-entered | `.server_password` |
| Server Type | Which server role this config row represents (`EmailConfig.php` filters `WHERE server_type = ?`) | enum(code) | No | NULL | system-set | `.server_type` — **Open Question**: other values unconfirmed |
| SMTP Auth | Whether SMTP authentication is enabled | boolean(text) | No | NULL | user-entered | `.smtp_auth` |

#### Custom Invoice/Order Numbering — `fuse5_customnumbers`

17 rows live, one per participating module.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Custom Number ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| Module | Which ERP module this numbering scheme applies to | enum(code) | Yes | NULL | system-set | `.module` |
| Short Name | Short internal code (e.g. `so`, `po`, `acc`, `st`, `rgn`) | text | Yes | NULL | system-set | `.shortname` |
| Prefix | Literal prefix text prepended to generated document numbers | text | Yes | "" | user-entered | `.prefix` |
| Next Number | Next sequence number to be assigned | integer | Yes | NULL | system-set | `.nextno` |
| Fixed Width | If nonzero, zero-pads the sequence number to this width | integer | Yes | 0 | user-entered | `.fixwidth` |

#### Mail Accounts (Incoming Mail) — `vtiger_mail_accounts`

24 rows live, soft-deleted via a status flag flip.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Account ID | Primary key | identifier | Yes | NULL | system-set | `.account_id` |
| User ID | The CRM user this mail account belongs to | reference | Yes | NULL | system-set | `.user_id` |
| Display Name | Friendly display name for the mail account | text | No | NULL | user-entered | `.display_name` |
| Mail ID | The email address for this account | text | No | NULL | user-entered | `.mail_id` |
| Account Name | Internal/label name for the account | text | No | NULL | user-entered | `.account_name` |
| Mail Protocol | Incoming-mail protocol used (IMAP/POP) | enum | No | NULL | user-entered | `.mail_protocol` |
| Mail Username | Username for authenticating to the mail server | text | Yes | NULL | user-entered | `.mail_username` |
| Mail Password | Password for authenticating to the mail server | text | Yes | NULL | user-entered | `.mail_password` |
| Mail Server Name | Incoming mail server hostname | text | No | NULL | user-entered | `.mail_servername` |
| Box Refresh | Refresh interval for checking the mailbox | integer | No | NULL | user-entered | `.box_refresh` |
| Mails Per Page | Pagination size for the mail list view | integer | No | NULL | user-entered | `.mails_per_page` |
| SSL Type | SSL/TLS connection type | text | No | NULL | user-entered | `.ssltype` |
| SSL Method | SSL/TLS method detail | text | No | NULL | user-entered | `.sslmeth` |
| Internal Mailer Flag | Whether this account is used as the system's internal mailer | boolean(int) | No | 0 | system-set | `.int_mailer` |
| Status | Active/soft-deleted status flag | enum(code) | No | NULL | system-set | `.status` |
| Set Default | Whether this is the user's default mail account | boolean(int) | No | NULL | user-entered | `.set_default` |
| Server (outbound leg) | Outbound-side server hostname, purpose vs. `.mail_servername` unclear | text | No | NULL | user-entered | `.server` — **Open Question** |
| Server Port (outbound leg) | Outbound-side server port | integer | No | NULL | user-entered | `.server_port` |
| Server Username (alt) | A second username field distinct from `.mail_username` | text | No | NULL | user-entered | `.server_username1` — **Open Question** |
| Server Password (alt) | A second password field distinct from `.mail_password` | text | No | NULL | user-entered | `.server_password1` — **Open Question** |
| Server Type | Classifies the server role for this account | enum(code) | No | "email" | system-set | `.server_type` |
| SMTP Auth | Whether SMTP auth is enabled for this account | boolean(text) | No | NULL | user-entered | `.smtp_auth` |

### 2.2 Roles / Profiles / Field-Level Permissions / Sharing Rules

The large majority of this concern area (role/profile/group/sharing-rule CRUD) touches **zero new
tables** — it is the CRUD/UI surface over schema the Users module's own field catalog already owns
end-to-end: Role (`vtiger_role`), Role-Profile Assignment (`vtiger_role2profile`), Profile
(`vtiger_profile`), Profile Field-Level Permission (`vtiger_profile2field`), Profile Global/Module/
Tab/Utility Permission (`vtiger_profile2globalpermissions`/`vtiger_profile2standardpermissions`/
`vtiger_profile2tab`/`vtiger_profile2utility`), Role Report Access Grant (`lbm_role_reports`), Group
(`vtiger_groups`), Group Nesting (`vtiger_group2grouprel`), Group Membership
(`vtiger_group2role`/`vtiger_group2rs`), and Sharing Rule (the nine `vtiger_datashare_*` variants plus
`vtiger_datashare_module_rel`/`vtiger_datashare_relatedmodules`/
`vtiger_datashare_relatedmodule_permission`). **Confirmed mechanism finding**: `SaveRole.php:232`
(`insert into vtiger_profile2field values(?,?,?,?,?)`) confirms a Role's field-level permissions edited
via `createrole.php` are physically stored through its bound Profile's `vtiger_profile2field` rows, not
a separate role-scoped table — corroborating the Users module's own relationship summary.

Four tables are genuinely new (not owned by the Users module's own catalog):

#### Entity A — Default Org Field-Level Access — `vtiger_def_org_field`

2,561 rows live. Edited via `DefaultFieldPermissions.php`/`EditDefOrgFieldLevelAccess.php`, persisted
by `UpdateDefaultFieldLevelAccess.php`.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Module (Tab) | The module this default applies to | reference | No | NULL | user-entered (admin) | `.tabid` → `vtiger_tab.tabid` |
| Field | The field this default applies to (composite PK with Module) | reference | Yes | NULL | user-entered (admin) | `.fieldid` → `vtiger_field.fieldid` |
| Visible By Default | Whether the field is visible by default org-wide — inverted checkbox semantics: submitting "checked" writes `0` (visible) | boolean(int, inverted) | No | NULL | user-entered (admin) | `.visible` |
| Read-Only By Default | Whether the field is read-only by default org-wide | boolean(int) | No | NULL | user-entered (admin) | `.readonly` — **Open Question**: no write path found for this column in this batch |

**Note**: despite Pass 0's prose describing this as "mandatory/visible," the live save code
(`UpdateDefaultFieldLevelAccess.php:39`) only ever writes `.visible` — "mandatory" is computed inline
from a hardcoded uitype/displaytype exclusion list, not stored as a separate flag.

#### Entity B — Protected Field Flag — `vtiger_field.protected` (relevant column subset)

Whether a field is flagged "protected" (sensitive/HR-type), gating visibility via a per-user
protected-field-permission setting owned by the Users module (`vtiger_users.protected_field_permission`).
`vtiger_field` itself is shared vtiger-core metadata, not re-catalogued in full — only the relevant
column is noted. Edited via `EditProtectedFieldList.php`, persisted by `UpdateProtectedFieldList.php`.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Protected | Whether this field is flagged protected/sensitive for the given module — forced to non-protected for several field-type combinations regardless of submitted value (a business rule, not a stored override) | boolean(int) | No | 0 | user-entered (admin) | `vtiger_field.protected`; written by `UpdateProtectedFieldList.php:39` (`update vtiger_field set protected=? where fieldid=? and tabid=?`) |

#### Entity C — Tax Assignment Code (TAC) Table — `vtiger_taxtable`

10 rows live. Listed/CRUD'd via `taclist.php`; mass-applied by `assignTACToAccounts.php`.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| TAC ID | Primary key | identifier | Yes | auto_increment | system-set | `.taxid` |
| Tax Code | The TAC's identifying code (also copied onto an Account's `cf_728` when assigned) | text | Yes | NULL | user-entered (admin) | `.taxcode` |
| City | City this TAC applies to (city/zip-based assignment mode) | text | Yes | NULL | user-entered (admin) | `.city` |
| State | State this TAC applies to | text | No | NULL | user-entered (admin) | `.state` |
| Zip Code | ZIP code this TAC applies to (city/zip-based assignment mode) | text | Yes | NULL | user-entered (admin) | `.zipcode` |
| County | County this TAC applies to | text | Yes | NULL | user-entered (admin) | `.county` |
| Base Tax Rate | Base tax-rate component | money | Yes | NULL | user-entered (admin) | `.base` |
| Local Tax Rate | Local tax-rate component | money | Yes | NULL | user-entered (admin) | `.local` |
| Silo Tax Rate | A third tax-rate component — "silo" meaning not confirmed | money | Yes | NULL | user-entered (admin) | `.silo` — **Open Question** |

**Cross-module note**: mass-assigning a TAC copies `.taxcode`/`.base`/`.local`/`.silo` onto the
Accounts module's own custom-field columns (`vtiger_accountscf.cf_728`, `.cf_1743` = base, `.cf_1745`
= local, `.cf_1747` = silo) for accounts flagged "Based on TAC Table"/"Based on City/Zip" — a **copy/
snapshot relationship, not a live FK**: an account's TAC-derived values do not update automatically if
the source TAC row later changes.

#### Entity D — Module Owner Assignment — `vtiger_moduleowners`

85 rows live (one per module, matching `vtiger_tab`). No confirmed downstream consumer was located.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Module (Tab) | The module this owner assignment is for — also the PK, one row seeded per module | reference/identifier | Yes | 0 | system-set (seeded) | `.tabid` → `vtiger_tab.tabid` |
| Owner User | The user assigned as this module's owner | reference | Yes | NULL | user-entered (admin) | `.user_id`; written by `ListModuleOwners.php:20` |

### 2.3 Custom Fields / Module Manager / Picklists / Combo Fields

Settings' admin UI over vtiger-CORE metadata infrastructure shared by every module in the system, not
business data Settings itself owns — treated at table-purpose depth per the source's own judgment call:

| Mechanism | Legacy Trace (Table) | Purpose | Rows (live) |
|---|---|---|---|
| Field master table | `vtiger_field` | One row per Standard/Custom field across every module: label, physical column/table, uitype, block/display placement, default, required/quick-create flags. Key columns: `fieldid` (PK), `tabid`, `tablename`, `fieldname`, `columnname`, `uitype`, `fieldlabel`, `generatedtype`, `presence`, `displaytype` | 2,494 |
| Profile field-level access | `vtiger_profile2field` | Per-security-profile field visibility/read-only override. Key columns: `profileid`+`fieldid` (composite PK), `tabid`, `visible`, `readonly` | 52,385 |
| Org-default field-level access | `vtiger_def_org_field` | See Entity A, §2.2 | 2,561 |
| Picklist registry | `vtiger_picklist` | Maps a picklist's internal name to a `picklistid`. Key columns: `picklistid` (PK), `name` (unique) | 171 |
| Per-picklist value tables | `vtiger_<fieldname>` (e.g. `vtiger_leadsource`) | One dedicated table per picklist field holding selectable values: `id, <fieldname>, presence, picklist_valueid` | n/a (171 tables) |
| Role-scoped picklist value | `vtiger_role2picklist` | Which picklist values are available to which security role, with display sort order. Key columns: `roleid`, `picklistvalueid`, `picklistid` (composite PK), `sortid` | 37,463 |
| Picklist-id sequence generator | `vtiger_picklistvalues_seq` | Single-row sequence table minting new `picklist_valueid`s | 1 |

#### Lead-to-Accounts/Contacts/Potentials Custom-Field Mapping — `vtiger_convertleadmapping`

4 rows live. `LeadCustomFieldMapping.php` renders the mapping grid; `SaveConvertLead.php` writes it;
`DeleteLeadCustomFieldMapping.php` clears one mapping row.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Mapping ID | Primary key | identifier | Yes | auto_increment | system-set | `.cfmid` |
| Lead Custom Field | The Lead custom field this mapping governs | reference | Yes | NULL | system-set | `.leadfid` |
| Target Account Field | Where the value copies to on Account conversion, if any | reference | No | NULL (`'NULL'` string-literal when cleared) | user-entered | `.accountfid` |
| Target Contact Field | Where the value copies to on Contact conversion, if any | reference | No | NULL (`'NULL'` string-literal when cleared) | user-entered | `.contactfid` |
| Target Potential Field | Where the value copies to on Potential conversion, if any | reference | No | NULL (`'NULL'` string-literal when cleared) | user-entered | `.potentialfid` |

**Data-quality note**: clearing a mapping writes the literal string `'NULL'` rather than SQL `NULL` —
downstream Lead-conversion code's handling of this literal string is unconfirmed.

#### Module Manager (Physical Delete / Restore) — a mechanism, not a schema-owning entity

Operates entirely against each target module's own base/custom-field tables plus `vtiger_crmentity`.

| Aspect | Detail | Legacy Trace |
|---|---|---|
| Eligible modules | Hard-coded to 5 tabids in `ListModuleRecords.php::getModuleList` | `WHERE tabid IN (4,7,14,59,60)` = Contacts, Leads, Products, CashReconciliation, CheckReconciliation |
| Delete criteria UI | Dynamic search-form/SQL-join builder scoped to the selected module's cf-table | `DeleteModuleRecord.php::getFieldList`/`getjoineQry` |
| Delete mechanism | Matching rows are **hard-deleted** (genuine `DELETE`) from the module's base + cf tables directly | `vtiger_products`+`vtiger_productcf` (Products), `vtiger_leaddetails` (Leads), `vtiger_contactdetails`+`vtiger_accountscf`/`vtiger_account` (Contacts), `vtiger_vendor` (Vendors), `vtiger_checkreconciliation`, `vtiger_cashreconciliation` — all joined to `vtiger_crmentity` for `crmid`/`setype`/`deleted` |
| Restore mechanism | Clears `vtiger_crmentity.deleted` for a comma-delimited id list; Products special-cased to also clear `deleted` on `vtiger_productcf`/`vtiger_products` directly | `RestoreModuleRecord.php` |
| Backup staging | Session-based table-selection helper; echoes per-table row counts via raw `mysql_query`; does **not** itself perform any backup/export | `moduleBackup.php` |

Delete is a genuine hard `DELETE` with no soft-delete flag involved; Restore only ever clears a
soft-delete flag, which a genuine hard delete can never leave set — the two are not actual inverses of
each other despite the shared naming.

### 2.4 Integration Config — QuickBooks/Traverse, EDI, Payment Gateways, Shipping, E-commerce, API Keys

#### QuickBooks / Traverse Accounting Integration

**QuickBooks Settings — `fuse5_qbsettings`** (151 rows live).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Setting ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| Profile | Which QB settings profile this row belongs to | reference | Yes | — | user-selected | `.profileid` |
| Setting Identifier | Stable machine key targeted by the single-field ajax save handler | text | Yes | — | system-defined | `.txtidentifier` |
| Module | The internal module/subsystem this QB setting applies to | text | Yes | — | system-defined | `.module` |
| Field | The specific field within that module this setting maps/configures | text | Yes | — | system-defined | `.field` |
| Value | The configured value (GL account code, mapping string, credential — heavily overloaded) | text | Yes | — | user-entered | `.value` |
| Default Value | Fallback value if none configured | text | Yes | — | system-defined | `.defaultval` |
| Display | Whether this setting row is shown on the admin UI | boolean(enum) | Yes | 1 | system-set | `.display` |

**Traverse Settings — `fuse5_traversesettings`** (0 rows live; no confirmed page controller populates
it — **Open Question**).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Setting ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| Setting Identifier | Stable machine key for this setting | text | Yes | — | system-defined | `.txtidentifier` |
| Module | Internal module/subsystem this setting applies to | text | Yes | — | system-defined | `.module` |
| Field | Specific field within that module | text | Yes | — | system-defined | `.field` |
| Value | Configured value | text | Yes | — | user-entered | `.value` |
| Default Value | Fallback value | text | Yes | — | system-defined | `.defaultval` |

**Cross-Reference Finding**: this surface is purely the admin-configuration side. Accounts' and Users'
own QuickBooks push logic are both confirmed dead (enqueue calls commented out); SalesOrder's is
confirmed live (invoice/credit-memo events genuinely enqueued, plus a synchronous real-time path for
payments). So `fuse5_qbsettings` is genuinely load-bearing configuration, consumed by at least one
live path, not vestigial. Products has no QuickBooks integration and does not consume this surface.

#### EDI Trading Partners (DIB / EJD / Orgill) — table-purpose depth

No dedicated tables — reads/writes rows in `vtiger_supportedfield` (§2.9) under
`sectionname = 'EDI Settings'` (25 rows), keyed by `sufieldsesname` values (`DIB_ACCESS`,
`EJD_INTEGRATION`, `ORGILL_INTEGRATION`, `DIBPRICEMAPPING`, `ORGILLPRICEMAPPING`,
`EJDPRICEMAPPING`, `DEFAULT_DIB_DEPT`/`DEFAULT_EJD_DEPT`/`DEFAULT_ORGILL_DEPT`). Two FTP/SFTP
credential validators (`EEFTPVal.php` for EliteExtra plain-FTP, `EJDFTPVal.php` for EJD SFTP) also
store their JSON connection-credential blob in `vtiger_supportedfield.sufielddata` rather than a
dedicated table. On live dev data, all three trading partners' toggles are `OFF` — a data-level
observation, not evidence the code paths are dead. `ExportingFTP.php`'s save target showed no
confirmed table hit — **Open Question**.

#### Payment Gateways — table-purpose depth (structurally near-identical, one table each)

| Table (Legacy Trace) | Rows | Gateway | Written by | Purpose |
|---|---|---|---|---|
| `lbm_cardconnect_config` | 2 | CardConnect | `cardconnect.php` | Per-location merchant ID, CardPointe site/user/password, Bolt site/API key/port |
| `lbm_cardconnect_terminals` | 3 | CardConnect | `cardconnect.php`, `prioritypayment.php` | Per-location terminal id/title plus JSON terminal-detail/option data — reused by Priority Payments' terminal-picker UI (cross-gateway coupling) |
| `priority_payment_mx_config` | 0 | MX Merchant (via Priority Payments wrapper) | `mxpayment.php` | Per-location merchant ID, sandbox/production URLs, username/password, redirect URLs |
| `lbm_priority_payment_config` | 0 | Passport / Priority Payments | `passport_payment.php`, `prioritypayment.php` | Per-location merchant ID, sandbox/production URLs, bearer token, customer/account IDs, processing mode, threshold limit — written by two different admin pages targeting the same table (**Open Question**: which is current) |
| `lbm_dejavoo_terminal_config` | 0 | Dejavoo | `dejavoo_terminal.php` | Per-terminal sandbox/production URLs, TPN number/nickname, auth key, register ID, disclaimer message; soft-deletable via `is_deleted` |
| *(none — vendor-hosted JS only)* | — | ChargeItPro | `chargeItProWebSetUp.php` | No server-side config table — a static HTML/JS shell loading the vendor's own hosted SDK |

**Schema-drift finding**: `prioritypayment.php:66` targets `priority_payment_config` (missing the
`lbm_` prefix used everywhere else in the file) — confirmed via live schema check **not to exist**; a
probable typo/dead delete branch.

#### Shipping Carriers — table-purpose depth, shared/unconfirmed mechanism

FedEx/UPS/USPS's storage mechanism was not confirmed by grep (most likely `vtiger_supportedfield` by
analogy — **Open Question**). EliteExtra (`eliteExtra.php`) uses both `vtiger_supportedfield` (an
account-level enable/status flag) and its own per-location profile table (name not resolved — a second
**Open Question**).

#### ExpiNet — full depth

**ExpiNet Config — `lbm_expinet_config`** (1 row live).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Config ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| Server Status | Whether ExpiNet is enabled for this location | enum | No | OFF | user-entered | `.expinet_server_status` |
| Location (legacy field) | Legacy free-text location identifier, superseded by `.location_id` | text | No | NULL | user-entered | `.expinet_location_id` |
| Developer ID | ExpiNet API developer/partner ID | text | No | NULL | user-entered | `.expinet_developer_id` |
| Product Transaction ID | ExpiNet product-transaction identifier | text | No | NULL | user-entered | `.expinet_product_transaction_id` |
| User ID | ExpiNet account user ID | text | No | NULL | user-entered | `.expinet_user_id` |
| User API Key | ExpiNet API key credential | text | No | NULL | user-entered | `.expinet_user_api_key` |
| User Hash Key | ExpiNet hash-key credential | text | No | NULL | user-entered | `.expinet_user_hash_key` |
| Location | The ERP location this config applies to | reference | No | 0 | system-set | `.location_id` |
| Created Time | Record creation timestamp | datetime | No | now | system-set | `.createdtime` |
| Modified Time | Last-modified timestamp | datetime | No | NULL | system-set | `.modifiedtime` |

**ExpiNet Terminals — `lbm_expinet_terminals`** (3 rows live).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Terminal Mapping ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| Terminal ID | The ExpiNet-side terminal identifier | text | No | NULL | user-selected (from ExpiNet API) | `.terminal_id` |
| Terminal Title | Human-friendly label for the terminal | text | No | NULL | user-entered | `.terminal_title` |
| Location | The ERP location this terminal is mapped to | reference | No | 0 | system-set | `.location_id` |
| Created Time | Record creation timestamp | datetime | No | now | system-set | `.createdtime` |
| Modified Time | Last-modified timestamp | datetime | No | NULL | system-set | `.modifiedtime` |

#### E-commerce — mixed depth

**BigCommerce Store Connection Credentials — `bigcommerce_setup_detail`** (2 rows live).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Credential ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| Store Name | Display name for this BigCommerce store connection | text | No | NULL | user-entered | `.store_name` |
| Client ID | BigCommerce API OAuth client ID | text | Yes | — | user-entered | `.clientid` |
| Client Secret | BigCommerce API OAuth client secret | text | Yes | — | user-entered | `.clientsecret` |
| Access Token | BigCommerce API access token | text | Yes | — | user-entered/system-set | `.accesstoken` |
| Store Hash | BigCommerce store-hash identifier | text | Yes | — | user-entered | `.store_hash` |
| API URL | BigCommerce store API base URL | text | Yes | — | user-entered | `.api_url` |
| Active | Whether this credential row is the active one — enforcement function confirmed dead | enum | Yes | Y | system-set | `.active` |
| E-commerce Location | The ERP location this store is scoped to | text | Yes | — | user-entered | `.ecom_location` |
| E-commerce Inventory Location | Location used for inventory-quantity sync | text | Yes | — | user-entered | `.ecom_inv_location` |
| E-commerce Price Field | Which product price-level field feeds BigCommerce's price sync | text | No | cf_796 | user-entered | `.ecom_price_field` |
| Created Date | Record creation timestamp | datetime | Yes | now | system-set | `.createddate` |
| Updated Date | Last-modified timestamp | datetime | Yes | now | system-set | `.updateddate` |
| Deleted | Soft-delete flag | boolean | Yes | 0 | system-set | `.deleted` |

**Schema-drift finding**: `bigcommerce.php:13`'s `deactivateotherAPI()` targets
`UPDATE bigcommerce_api_details` — confirmed **not to exist** live (only `bigcommerce_setup_detail`
and the unrelated `fir_bigcommerce_api_logs` do); call sites already commented out — doubly confirmed
dead.

**E-commerce Feature Toggles — `ecom_features`** (1 row live).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Feature ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| Feature Name | Which e-commerce integration/feature this row toggles | text | Yes | — | system-defined | `.ecom_name` |
| Status | Whether the feature is active | enum | Yes | Inactive | user-entered | `.status` |
| Related Table | Optional pointer to the feature's own detail table name | text | No | NULL | system-defined | `.relatedtable` |
| Created Date | Record creation date | date | Yes | — | system-set | `.createddate` |

**B2B/B2C Wholesale-Site-Manager (WSM), all written by `b2bandb2c.php`:**

*Pricing Groups — `fuse5_wsm_pricegroup`* (4 rows live).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Price Group ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| Location | Location this price group applies to | reference | Yes | — | user-entered | `.locationid` |
| User | The web-store user this price group is scoped to | reference | Yes | — | user-entered | `.userid` |
| Account | The account this price group is scoped to | reference | Yes | — | user-entered | `.accountid` |
| Price Group | The named pricing tier/group | text | Yes | — | user-entered | `.pricegroup` |
| Price For | What the price group applies to | text | Yes | — | user-entered | `.pricefor` |
| Created Date | Record creation timestamp | datetime | Yes | — | system-set | `.createdDate` |

*Brand-to-Linecode Conversion Map — `fuse5_wsm_linecode_conversion`* (1 row live).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Conversion ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| Brand Name | The manufacturer/brand this conversion applies to | text | Yes | — | user-entered | `.brandname` |
| ZDP Linecode | Linecode as known to the "ZDP" feed source — expansion unconfirmed | text | Yes | — | user-entered | `.zdplinecode` — **Open Question** |
| DCI Linecode | Linecode as known to the "DCI" feed source | text | Yes | — | user-entered | `.dcilinecode` |
| Modified Time | Last-modified timestamp | datetime | Yes | — | system-set | `.modifiedtime` |
| Created Time | Record creation timestamp | datetime | Yes | — | system-set | `.createdtime` |

*Extra-Info Settings — `fuse5_wsm_extrainfo`* (3 rows live, insert-replaces by type).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Info ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| User | The user who set this info | reference | Yes | — | system-set | `.userid` |
| Info Type | Which of the three settings this row is (discount product ID / products API key / order API key) | enum | Yes | — | system-defined | `.infotype` |
| Information | The actual configured value | text | Yes | — | user-entered | `.information` |
| Created Date | Record creation/last-modified timestamp | datetime | Yes | now | system-set | `.createdDate` |

Two further single-row "current default" tables — `fuse5_api_default_location` (1 row) and
`fuse5_api_default_account` (1 row), truncate-and-reinsert pattern — hold trivial `id`/name/id-number/
`createddate` shapes used by API/e-commerce lookups when no explicit location/account is specified;
table-purpose depth given their trivial shape.

**B2C Storefronts — `b2csites`** (0 rows live).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Site ID | Primary key | identifier | Yes | auto_increment | system-set | `.b2cid` |
| Status | Whether this B2C site registration is active | enum | Yes | — | user-entered | `.status` |
| Site URL | The B2C storefront's URL | text | Yes | — | user-entered | `.siteurl` |
| Site API Key | API key used to authenticate this site's requests | text | Yes | — | user-entered/system-set | `.siteapi` |

**FanBuilder Promotions/Coupon Integration Config — `lbm_fb_config`** (0 rows live).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Config ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| Server Status | Whether the FanBuilder integration is enabled | enum | No | OFF | user-entered | `.fb_server_status` |
| Base URL | FanBuilder API base URL | text | No | NULL | user-entered | `.fb_base_url` |
| Global System ID | FanBuilder system-level login ID | text | No | NULL | user-entered | `.fb_global_system_id` |
| Global System Password | FanBuilder system-level login password | text | No | NULL | user-entered | `.fb_global_system_pass` |
| Global System Password Expiry | Expiry marker for the above password | text | No | NULL | system-set | `.fb_global_system_pass_exp` |
| Access Token | FanBuilder OAuth-style access token | text | No | NULL | system-set | `.fb_access_token` |
| Access Token Expiry | Expiry timestamp for the access token | text | No | NULL | system-set | `.fb_access_token_exp_at` |
| Last Token Sync | When the token was last refreshed | text | No | NULL | system-set | `.fb_last_token_sync_at` |
| Store ID | FanBuilder-side store identifier | text | No | NULL | user-entered | `.fb_store_id` |
| Default Coupon Product | The product used as the default coupon/discount line item | reference | No | 0 | user-entered | `.fb_def_cpn_prod` |
| Quarantine Roles | Roles excluded from FanBuilder-related actions | text (multi-value) | No | NULL | user-entered | `.fb_quarantine_roles` |
| Created Time | Record creation timestamp | datetime | No | now | system-set | `.fb_createdtime` |
| Modified Time | Last-modified timestamp | datetime | No | NULL | system-set | `.fb_modifiedtime` |

#### API Keys / Credentials / Sub-Location Sharing — full depth

**F5 Platform API Keys — `fuse5_f5apikey`** (4 rows live, admin-only user-id-1 gated).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Key ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| Title | Human-friendly label for the key (unique) | text | Yes | — | user-entered | `.title` |
| API Type | Which client class the key is issued for | enum | Yes | Standalone | user-selected | `.apitype` (Mobile/B2B/Standalone) |
| API Key | The generated key value (unique) | text | Yes | — | system-generated (`random_f5api_key()`) | `.apikey` |
| Created Date | Record creation timestamp | datetime | No | NULL | system-set | `.createddate` |
| Created By | User who issued the key | reference | No | 0 | system-set | `.createdby` |
| Deleted | Soft-delete flag | boolean(enum) | No | 0 | system-set | `.deleted` |

**Generic External API Credentials — `fuse5_api_credentials`** (1 row live).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Credential ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| Company Name | The external company/integration this credential identifies | text | Yes | — | user-entered | `.companyname` |
| Username | API username | text | Yes | — | user-entered | `.username` |
| Password | API password | text | Yes | — | user-entered | `.password` |
| Allowed IP | IP address(es) permitted to authenticate | text | Yes | — | user-entered | `.allowedip` |
| Created Time | Record creation timestamp | datetime | Yes | — | system-set | `.createdtime` |
| Updated Time | Last-modified timestamp | datetime | Yes | — | system-set | `.updatedtime` |
| Created By | User who created the credential | reference | Yes | — | system-set | `.createdby` |
| Created From | Origin/context the credential was created from | integer | Yes | — | system-set | `.createdfrom` |

**AWS S3 Bucket Credentials — `lbm_aws_s3_setup_details`** (0 rows live, admin-only gated — **the
single worst-defended credential-handling finding in the entire Settings corpus**, per the risk
register).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| AWS Config ID | Primary key | identifier | Yes | auto_increment | system-set | `.awsid` |
| S3 Bucket | Target S3 bucket name | text | No | NULL | user-entered | `.s3_bucket` |
| S3 Region | AWS region the bucket lives in | text | No | NULL | user-entered | `.s3_region` |
| S3 Key | AWS access key ID | text | No | NULL | user-entered | `.s3_key` |
| S3 Secret | AWS secret access key | text | No | NULL | user-entered | `.s3_secret` |
| Created By | User who created the config | reference | No | 0 | system-set | `.created_by` |
| Deleted | Soft-delete flag | boolean | No | 0 | system-set | `.is_deleted` |

**Fuse5Connect Sub-Location Sharing** — a cross-sub-tenant location-sharing mechanism reached via SOAP
(`fuse5ConnectClient.php`) to a target sub-tenant's own server.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Sharing ID | Primary key (Sharing table, 8 rows live) | identifier | Yes | auto_increment | system-set | `vtiger_link_fuse5_sub_sharing.id` |
| Target Sub-Tenant / Location / Location Name | Which locations from a target sub-tenant are shared into the current sub-tenant's location | reference (×3) | Yes | NULL each | system-set | `.lfss_to_sub_id`/`.lfss_to_loc_id`/`.lfss_to_loc_name` |
| Current Sub-Tenant / Location | The current sub-tenant/location the share applies to | reference (×2) | Yes | NULL each | system-set | `.lfss_current_sub_id`/`.lfss_current_loc_id` |
| Access Grant ID | Primary key (Access table, 0 rows live) | identifier | Yes | auto_increment | system-set | `vtiger_link_fuse5_sub_access.id` |
| From Sub-Tenant / Location / Location Name | Which sub-tenant/location has been granted access (reverse-direction of Sharing) | reference (×3) | Yes | NULL each | system-set | `.lfsa_from_sub_id`/`.lfsa_from_loc_id`/`.lfsa_from_loc_name` |
| Access | Whether the access grant is active | boolean | Yes | NULL | system-set | `.lfsa_access` |
| Current Sub-Tenant / Location (Access) | The current sub-tenant/location the grant applies into | reference (×2) | Yes | NULL each | system-set | `.lfsa_current_sub_id`/`.lfsa_current_loc_id` |

**Open Question**: `vtiger_link_fuse5_subinfo` and `vtiger_link_fuse5_subinfo_skeleton` (seen in a
`SHOW TABLES LIKE 'vtiger_link_fuse5%'` sweep) were not matched to any file in this concern area —
likely owned by a different Settings sub-area not covered by this pass.

### 2.5 Tax Configuration / Catalog Import-Export, and Location / Division / Region / Printer Administration

#### Tax Configuration

**Tax Rate Table — `vtiger_taxtable`** (10 rows live) — distinct from the TAC lookup in §2.2 despite
identical column shape.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Tax ID | Primary key | identifier | Yes | auto_increment | system-set | `.taxid` |
| Tax Code | Tax-code identifier this rate row is filed under | text | Yes | NULL | user-entered | `.taxcode` |
| City | City name this tax rate applies to | text | Yes | NULL | user-entered | `.city` |
| State | State name/abbreviation | text | No | NULL | user-entered | `.state` |
| Zip Code | Zip/postal code | text | Yes | NULL | user-entered | `.zipcode` |
| County | County name | text | Yes | NULL | user-entered | `.county` |
| Base (State) Tax Rate | State-level tax percentage/amount component | money(rate) | Yes | NULL | user-entered | `.base` |
| Local Tax Rate | Local (city/county) tax percentage/amount component | money(rate) | Yes | NULL | user-entered | `.local` |
| Silo Tax Rate | A third tax bucket alongside state/local — meaning unconfirmed | money(rate) | Yes | NULL | user-entered | `.silo` — **Open Question** |

A derived "total tax" (`base+local+silo`) is computed at read time by `editLocation.php`, not stored.

**Max Tax by State — `vtiger_tax_max_list`** (3 rows live; referenced by the `MAX_TAX_PER_SO`
`vtiger_supportedfield` toggle, `sufieldid` 716, live ON).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Max Tax Rule ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| State Name | The state this max-tax rule applies to (uniqueness enforced in app code) | text | No | NULL | user-entered | `.state_name` |
| Max Taxable Amount | Dollar cap above which no further tax is charged on a SO in this state | money | No | 0.000 | user-entered | `.max_amount` |
| State Tax Cap Component | State-portion cap value | text/money-ish | Yes | 0 | user-entered | `.state` — **Schema Drift**: `varchar(25)`, not `decimal` |
| Local Tax Cap Component | Local-portion cap value | text/money-ish | Yes | 0 | user-entered | `.local` — same varchar drift |
| Silo Tax Cap Component | Silo-portion cap value | text/money-ish | Yes | 0 | user-entered | `.silo` — same varchar drift; **Open Question**: relationship to `.max_amount` unconfirmed |

**Kit Category — `vtiger_kitcategory`** (7 rows live) — full CRUD via `kitscategory.php`.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Kit Category ID | Primary key | identifier | Yes | auto_increment | system-set | `.kitcategoryid` |
| Kit Category Name | The category label (uniqueness enforced in app code, scoped to non-deleted rows) | text | Yes | NULL | user-entered | `.kitcategory` |
| Sort Order | Manual drag-sort position | integer | Yes | 0 | user-entered | `.sortorderid` |
| Presence | Active/visible flag | boolean(-ish) | Yes | 1 | system-set | `.presence` |
| Modified By User | User who last modified this category | reference | Yes | 0 | system-set | `.userid` |
| Modified On | Last-modified timestamp | datetime | Yes | CURRENT_TIMESTAMP | system-set | `.modifiedon` |
| Deleted | Soft-delete flag | boolean(enum) | Yes | No | system-set | `.deleted` |

Deleting a kit category cascades a plain-text `UPDATE fuse5_kits SET kitcategory=?` rename — a
**denormalized string relationship, not an FK**: a kit whose stored category string doesn't exactly
match is silently orphaned.

**Related, not independently confirmed via DESCRIBE**: `vtiger_shippingtaxinfo` / `vtiger_inventorytaxinfo`
(shipping-and-handling tax table and inventory/product tax table, written by `TaxConfig.php`, inferred
5-column shape `taxname`/`taxlabel`/`percentage`/`taxid`/`deleted` from the INSERT statement — flagged
for a follow-up pass); `vtiger_currency_info.qb_accounts_payable` (a single `varchar(100)` column,
default `"Accounts Payable"`, written by `addVIRAccountsPayableCurrency.php` — the full extent of the
"Virtual Inventory Reconciliation" page's writes).

**Custom Aftermarket-Parts Catalog Import/Export** — lives in an entirely separate database connection
(`$adbCustomCatalog`, assignment site not located). Six tables (`part_no`, `year_model`, `year_maker`,
`year_engine`, `categories`, `categories_subcategories`) are referenced by live import/export/delete
code but **confirmed absent** from the dev database via `SHOW TABLES LIKE`. **Open Questions**: target
database/host in production; full column list beyond what `CustomCatalogImportStep3.php`'s one INSERT
statement makes inferable (`productnumber, linecode, category, subcategory, createddatetime,
description, maker, model, yearlisting, enginetype, oemno, oemprice, partslinkno, otherno, item,
feature, status, sortorder`); whether this subsystem is in-scope for the rewrite at all.

#### Location / Division / Region / Printer Administration

**Location-module cross-reference**: `blueprint/module/Location/01-entities-fields.md` already
catalogues `vtiger_location` and `vtiger_location_accounting` field-by-field — not re-catalogued here.
`Settings/addLocation.php` (the sole `INSERT INTO vtiger_location`, ~40 columns) and
`Settings/editLocation.php` (1,544 lines) are confirmed as the entire CRUD/admin-UI write surface for
those two tables — Location's own files mostly *read* them downstream.

**Schema-drift finding**: `SaveAccessLocation.php`/`SaveSharingLocation.php` both grant/revoke
Fuse5Connect cross-sub-location data-sharing against `vtiger_link_fuse5_sharing`, confirmed via live
schema check **not to exist**. Genuinely referenced by two live write paths but absent from this
snapshot — cannot be field-catalogued; **Open Question**.

**Division — `fuse5_manage_division`** (0 rows live) — full CRUD via `managedivision.php`.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Division ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| Division Name | The division's display name — **confirmed defect**: the duplicate-name-check query (`managedivision.php` line 15) references `region_name`, a column that does not exist on this table (copy-paste artifact from the parallel Region admin page) — the duplicate-name guard for new divisions likely silently fails | text | No | NULL | user-entered | `.division_name` |
| Associated Region IDs | Comma-separated list of `fuse5_manage_regions.id` values — denormalized, not a join table | text | No | NULL | user-entered | `.rel_region` |

**Region — `fuse5_manage_regions`** (0 rows live) — full CRUD, duplicate-name-guarded correctly.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Region ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| Region Name | The region's display name (uniqueness enforced correctly by app code) | text | No | NULL | user-entered | `.region_name` |
| Associated Location IDs | Comma-separated list of `vtiger_location.locationid` values — denormalized | text | No | NULL | user-entered | `.rel_location` |

Deleting a region scrubs its id out of every division's `.rel_region` string (manual referential-
integrity cleanup in application code, since both columns are plain text with no FK/join-table
backing). `validateRegionAndDivision.php` provides the pre-delete guard.

**Physical Location Sort Report — `fuse5_physicallocsortreport`** (4 rows live) — full CRUD + drag-sort
via `PhysicalLocationSortReport.php`.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Sort Report ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| Title | The sort-report entry's display title (uniqueness enforced in app code) | text | No | NULL | user-entered | `.title` |
| Sequence | Manual drag-sort position, bulk re-sequenced via the `savesortorder` task | integer | No | NULL | system-set (drag-reorder) | `.sequence` |

**Open Question**: exact business purpose of "Physical Location Sort Report" and what distinguishes
"physical location" from a `vtiger_location` branch record was not confirmed — appears to be an
independent named-list ordering utility, not FK'd to `vtiger_location`.

**Printers — `vtiger_printers`** (3 rows live) — the printer registry.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Printer ID | Primary key | identifier | Yes | auto_increment | system-set | `.printersid` |
| Location | The branch this printer is registered to | reference | Yes | NULL | user-entered | `.locationid` |
| Printer Name | The physical printer's device name (uniqueness enforced, scoped per-location) | text | Yes | NULL | user-entered | `.printername` |

**Module Printers — `vtiger_moduleprinters`** (2 rows live) — the per-module/output-type printer
assignment, distinct from the printer registry above. One of the most heavily SQL-injection-affected
sub-areas in the module.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Module Printer ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| Location | The branch this printer assignment applies to | reference | Yes | NULL | user-entered | `.locationid` |
| Printer Name | The physical printer device name assigned for this module/output type | text | Yes | NULL | user-entered | `.printername` |
| Module Name | Which document/output type this printer handles (Sales Order, Pick Ticket, Packing Slip, Work Sheet, Purchase Order, Labels, Batch Statement, shipping-label formats, delivery-method exceptions) | enum | Yes | NULL | user-entered | `.modulename` |
| Zone | The warehouse/product zone this printer assignment is scoped to | text | Yes | NULL | user-entered | `.zone` |
| Zone Source | Whether the zone refers to a WMS-managed zone (`fuse5_wms`) or a Product zone (`fuse5_product_zones`), resolved dynamically per-location | enum | Yes | NULL | user-entered | `.zonesource` |
| Brand/Model | The printer hardware's brand and model string | text | Yes | NULL | user-entered | `.brand_model` |
| Delivery Method | The delivery-method scope this printer assignment applies to | text | Yes | NULL | user-entered | `.delivery_method` |

### 2.6 Document / Email / Word Template Management, and Audit Trail / Notifications / Currency Administration

#### Document / Email / Word Template Management

**Uploaded Document — `lbm_uploaded_docs`** (75 rows live).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Document ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| Title | Display title of the document | text | No | NULL | user-entered | `.title` |
| Description | Free-text description | text | No | NULL | user-entered | `.description` |
| Doc Type | The source module/context this document belongs to | enum(code) | No | NULL | system-set | `.doctype` |
| Tag | Free-text tag/label | text | No | NULL | user-entered | `.tag` |
| File Detail | Stored file metadata (name/path fragment) | text | No | NULL | system-set | `.filedetail` |
| Created Filename | The filename as stored on disk after upload | text | No | NULL | system-set | `.created_filename` |
| Thumbnail URL | Path/URL to a generated thumbnail, if any | text | No | NULL | system-set | `.thumbnail_url` |
| Doc Type Unique ID | The specific source record's id within Doc Type — direct attachment target | text | No | NULL | system-set | `.doc_type_unique_id` |
| Inputted Filename | The original filename as uploaded by the user | text | No | NULL | user-entered | `.inputed_file_name` |
| Uploaded By | The user who uploaded the document | reference | No | 0 | system-set | `.uploaded_by` |
| Send Email | Whether this document auto-attaches when the source record's related email is sent | boolean(int) | No | 0 | user-entered | `.send_email` |
| Deleted | Soft-delete flag | boolean(int) | No | 0 | system-set | `.deleted` |
| Deleted By | User who soft-deleted the record | reference | No | 0 | system-set | `.deletedby` |
| Category Folder ID | The `lbm_job_fol_categories` folder this document is filed under | reference | No | 0 | user-entered | `.category_fol_id` |
| Upload Folder ID | The `okb_upload_folders` folder this document is filed under (a second, parallel folder assignment) | reference | No | 0 | user-entered | `.upload_folder_id` |
| Sort Order | Listview sort-order override | integer | Yes | 0 | system-set | `.sort_order` |
| Created Datetime | Record creation timestamp | datetime | No | NULL | system-set | `.createddatetime` |
| Modified Datetime | Record last-modified timestamp | datetime | No | NULL | system-set | `.modifieddatetime` |

**Uploaded Document Attach-Link — `lbm_uploaded_docs_relation`** (13 rows live).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Relation ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| Uploaded Doc ID | The `lbm_uploaded_docs` row being attached | reference | Yes | NULL | system-set | `.lbm_uploaded_docs_id` |
| Module | The target module the doc is attached to | enum(code) | Yes | NULL | system-set | `.module` |
| Number | The target record's business number/id within Module | text | Yes | NULL | system-set | `.number` |
| User ID | The user who created the attachment link | reference | Yes | NULL | system-set | `.user_id` |
| Deleted | Soft-delete flag (unusual `tinyint(1) unsigned zerofill` typing) | boolean(int) | Yes | 0 | system-set | `.deleted` |
| Modified Time | Last-modified timestamp | datetime | No | NULL | system-set | `.modifiedtime` |
| Created Time | Creation timestamp | datetime | No | NULL | system-set | `.createdtime` |

**Document Folder (Job-Doc Category) — `lbm_job_fol_categories`** (3 rows live).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Folder ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| Parent ID | Parent folder id (0 = root) | reference | Yes | 0 | system-set | `.parent_id` |
| Category Name | Display name of the folder | text | No | NULL | user-entered | `.categoryname` |
| Allow Role IDs | Comma-delimited list of role ids permitted to see/use this folder | text | No | NULL | user-entered | `.allow_role_ids` |
| Is Editable | Whether the folder is user-editable/deletable vs. a protected system folder | boolean(enum) | No | 1 | system-set | `.is_editable` |
| Is Deleted | Soft-delete flag | boolean(int) | Yes | 0 | system-set | `.is_deleted` |
| Created Foldername | The on-disk directory name created for this folder | text | No | NULL | system-set | `.created_foldername` |
| Created Datetime | Creation timestamp | datetime | No | NULL | system-set | `.created_datetime` |
| Updated Datetime | Last-modified timestamp | datetime | No | NULL | system-set | `.updated_datetime` |

**"OKB" Upload Folder — `okb_upload_folders`** (0 rows live — "OKB" expansion unconfirmed).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Folder ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| Name | Display name of the folder | text | Yes | NULL | user-entered | `.name` |
| Parent ID | Parent folder id (NULL = root) | reference | No | NULL | system-set | `.parent_id` |
| Created At | Creation timestamp | datetime | Yes | NULL | system-set | `.created_at` |
| Deleted | Soft-delete flag | boolean(int) | No | 0 | system-set | `.deleted` |
| Module Type | The module this folder tree is scoped to (currently used as a global/unscoped tree) | enum(code) | No | NULL | system-set | `.module_type` |
| Module ID | The specific record id this folder tree is scoped to, when not global | reference | No | 0 | system-set | `.module_id` |

**Open Question**: why two parallel document-folder systems exist, and whether one is a deprecated
predecessor of the other, is not confirmed. `lbm_uploaded_docs`'s dual folder-assignment columns
(`.category_fol_id` / `.upload_folder_id`) — whether a document is ever filed in both trees
simultaneously is also unconfirmed.

**Word (Mail-Merge) Template — `vtiger_wordtemplates`** (0 rows live).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Template ID | Primary key — no auto_increment/default reported at the schema level | identifier | Yes | NULL | system-set | `.templateid` — **Open Question**: id minting relies entirely on `$adb->getUniqueID('vtiger_wordtemplates')` |
| Filename | Stored filename of the Word template | text | Yes | NULL | user-entered | `.filename` |
| Module | The module this template is available for (mail-merge context) | enum(code) | Yes | NULL | user-entered | `.module` |
| Date Entered | Upload timestamp | datetime | Yes | CURRENT_TIMESTAMP | system-set | `.date_entered` |
| Parent Type | Legacy parent-entity-type classification | text | Yes | NULL | system-set | `.parent_type` |
| Data | The binary Word-document content | binary(blob) | No | NULL | user-entered | `.data` |
| Description | Free-text description | text | No | NULL | user-entered | `.description` |
| Filesize | File size | text | Yes | NULL | system-set | `.filesize` |
| Filetype | MIME/file type | text | Yes | NULL | system-set | `.filetype` |
| Deleted | Soft-delete flag | boolean(int) | Yes | 0 | system-set | `.deleted` |

**Email Template — `vtiger_emailtemplates`** (17 rows live).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Folder Name | The template's organizational folder (free text, not FK) | text | No | NULL | user-entered | `.foldername` |
| Template Name | Display name of the template | text | No | NULL | user-entered | `.templatename` |
| Subject | Default email subject line | text | No | NULL | user-entered | `.subject` |
| Description | Free-text description | text | No | NULL | user-entered | `.description` |
| Body | The email body content (HTML/merge-field template text) | text | No | NULL | user-entered | `.body` |
| Deleted | Soft-delete flag | boolean(int) | Yes | 0 | system-set | `.deleted` |
| Template ID | Primary key | identifier | Yes | auto_increment | system-set | `.templateid` |

**Pick-Ticket (PT) Zone-Printer Template — `fuse5_printer_templates`** (0 rows live) +
**`fuse5_printer_templates_assignments`** (11 rows live).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Template ID | Primary key | identifier | Yes | auto_increment | system-set | `fuse5_printer_templates.id` |
| Template Name | Display name of the zone-printer template | text | Yes | NULL | user-entered | `.template_name` |
| Zone ID | The pick zone id this row assigns a printer to | text | Yes | NULL | user-entered | `.zid` |
| Zone Name | Display name of the zone | text | Yes | NULL | user-entered | `.zone_name` |
| Zone Source | The source/type of zone list this template applies to | enum(code) | Yes | NULL | system-set | `.zone_source` |
| Location ID | The location this template belongs to | reference | Yes | NULL | system-set | `.location_id` |
| Printer Name | The printer assigned to this zone under this template | text | Yes | NULL | user-entered | `.printer_name` |
| Use Now (Default) | Whether this is the currently-active default template for the location/zone-source | boolean(enum Y/N) | Yes | N | user-entered | `.usenow` |
| Modified | Last-modified timestamp | datetime | Yes | NULL | system-set | `.modified` |
| Assignment ID | Primary key (assignment row) | identifier | Yes | auto_increment | system-set | `fuse5_printer_templates_assignments.id` |
| Day | Day-of-week this schedule assignment applies to | text | Yes | 0 | user-entered | `.day` |
| Start Time / End Time | The time window this template is scheduled to be active | time (×2) | Yes | NULL each | user-entered | `.start_time`/`.end_time` |
| Start/End Time Display | Human-formatted display copies | text (×2) | Yes | NULL each | system-set (derived) | `.starttime_display`/`.endtime_display` |
| Template Name (assignment) | The template being scheduled, denormalized as a string rather than FK | text | Yes | NULL | system-set | `.template_name` |
| Location ID (assignment) | The location this scheduling assignment applies to | reference | Yes | 0 | system-set | `.locationid` |
| Zone Source (assignment) | The zone-source scope for this schedule row | enum(code) | Yes | NULL | system-set | `.zone_source` |
| Modified (assignment) | Last-modified timestamp | datetime | Yes | NULL | system-set | `.modified` |

#### Audit Trail / Notifications / Currency Administration

**Audit Trail Entry — `vtiger_audit_trial`** (116,619 rows live — the single largest table found; the
misspelled "trial" instead of "trail" is the live table name, not a documentation typo).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Audit ID | Primary key | identifier | Yes | auto_increment | system-set | `.auditid` |
| User ID | The user who performed the audited action | reference | No | NULL | system-set | `.userid` |
| Module | The module the action occurred in | enum(code) | No | NULL | system-set | `.module` |
| Action | The action performed (e.g. save/delete) | enum(code) | No | NULL | system-set | `.action` |
| Record ID | The affected record's id (display name resolved dynamically per-module at read time, not stored) | text | No | NULL | system-set | `.recordid` |
| Action Date | Timestamp of the action | datetime | No | NULL | system-set | `.actiondate` |
| Browser Detail | Browser/user-agent string captured at action time — schema-present, not read/written by any confirmed code path | text | No | NULL | system-set | `.browserdetail` — **Open Question** |

**Clock History — `vtiger_user_clocksys`** (681 rows live).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Clock ID | Primary key | identifier | Yes | auto_increment | system-set | `.clock_id` |
| User Name | The clocking-in user's name (denormalized) | text | Yes | NULL | system-set | `.user_name` |
| User ID | The clocking-in user's id | reference | Yes | NULL | system-set | `.user_id` |
| User IP | IP address the clock action was recorded from | text | Yes | NULL | system-set | `.user_ip` |
| Clock In / Clock Out | Timestamps of clock-in and (if completed) clock-out | datetime (×2) | No | NULL each | system-set | `.clock_in`/`.clock_out` |
| Current Date | The business date this clock record applies to | date | Yes | NULL | system-set | `.currdate` |
| Status | Whether the row represents an open "clock in" or completed "clock out" | enum | Yes | NULL | system-set | `.status` |
| Type of Hours | The pay-type classification for this clocked period | enum(code) | Yes | Regular Hours | system-set | `.typeofhours` |

**Login History — `vtiger_loginhistory`** (92 rows live).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Login ID | Primary key | identifier | Yes | auto_increment | system-set | `.login_id` |
| User Name | The logging-in user's name (denormalized) | text | Yes | NULL | system-set | `.user_name` |
| User IP | IP address the login was recorded from | text | Yes | NULL | system-set | `.user_ip` |
| Logout Time | Timestamp of logout | datetime | Yes | CURRENT_TIMESTAMP | system-set | `.logout_time` |
| Login Time | Timestamp of login — legacy zero-date default | datetime | Yes | 0000-00-00 00:00:00 | system-set | `.login_time` — **Open Question**: confirm this doesn't leak into date arithmetic |
| Status | The session's current status | enum(code) | No | NULL | system-set | `.status` |
| Session ID | The web session id associated with this login | text | Yes | NULL | system-set | `.session_id` |

**Inventory Notification — `vtiger_inventorynotification`** (22 rows live) + **per-location
assignment — `fuse5_location_inventorynotification`** (62 rows live).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Notification ID | Primary key | identifier | Yes | auto_increment | system-set | `vtiger_inventorynotification.notificationid` |
| Notification Name | Internal display name | text | No | NULL | user-entered | `.notificationname` |
| Notification Subject | Email subject line for this notification | text | No | NULL | user-entered | `.notificationsubject` |
| Notification Body | Email body content | text | No | NULL | user-entered | `.notificationbody` |
| Label | Display label for the notification | text | No | NULL | user-entered | `.label` |
| Deleted | Soft-delete flag | boolean(int) | Yes | 0 | system-set | `.deleted` |
| Notify For Module | The module this notification is scoped to (Accounts, PurchaseOrder, SalesOrder, StoreTransfer, ReceivingPO/ST, TrackLength, Manufacturing, BidSubmission — hardcoded, not a lookup table) | enum(code) | No | NULL | user-entered | `.notify_for_module` |
| Location Notification ID | Primary key (location-assignment row) | identifier | Yes | auto_increment | system-set | `fuse5_location_inventorynotification.loc_notification_id` |
| Location | The location this notification is active for | reference | Yes | 0 | user-entered | `.location` |
| Notification Type | Type/category of the location-scoped notification assignment | enum(code) | Yes | 0 | user-entered | `.notification_type` |
| Inventory Notification ID (FK) | The Inventory Notification this assignment activates for the location | reference | Yes | 0 | system-set | `.inventory_notification_id` |

**Email Notification Scheduler — `vtiger_notificationscheduler`** (8 rows live).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Scheduled Notification ID | Primary key | identifier | Yes | auto_increment | system-set | `.schedulednotificationid` |
| Scheduled Notification Name | Internal unique name for the scheduler entry | text | No | NULL | system-set | `.schedulednotificationname` |
| Active | Whether this scheduled notification is currently enabled | boolean(int) | No | NULL | user-entered | `.active` |
| Notification Subject | Email subject line | text | No | NULL | user-entered | `.notificationsubject` |
| Notification Body | Despite the column name, stores an Email Template's `templateid` (a reference), not literal body text | reference | No | NULL | user-entered | `.notificationbody` — **Open Question**: whether raw body text is ever stored directly for some legacy rows |
| Label | Display label | text | No | NULL | user-entered | `.label` |
| Type | Classification of the scheduled notification (short code) | enum(code) | No | NULL | system-set | `.type` |

**Announcement — `vtiger_announcement`** (7 rows live; PK is the creator's own id, structurally
forcing one-active-announcement-per-admin, not a general feed).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Creator ID | The admin user this announcement belongs to (also the PK) | identifier/reference | Yes | NULL | system-set | `.creatorid` |
| Announcement | The announcement body text | text | No | NULL | user-entered | `.announcement` |
| Title | The announcement title | text | No | NULL | user-entered | `.title` |
| Time | Last-updated timestamp | datetime | Yes | CURRENT_TIMESTAMP | system-set | `.time` |

**WAC (Weighted-Average-Cost) Change Log — `lbm_wac_change_log`** (11,095 rows live).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Log ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| Product ID | The product this WAC change applies to | reference | No | NULL | system-set | `.productid` |
| Location ID | The location this WAC change applies to | reference | No | NULL | system-set | `.locationid` |
| Previous WAC | The WAC value before this change | money | No | 0.000 | system-set | `.prev_wac` |
| New WAC | The WAC value after this change | money | No | 0.000 | system-set | `.new_wac` |
| Current QOH | The quantity-on-hand snapshot at the time of the WAC change | number | No | 0.00 | system-set | `.current_qoh` |
| Module Name | Which module/process triggered the recalculation | enum(code) | No | NULL | system-set | `.module_name` |
| Log Added From | Free-text/code identifying the specific code path or trigger source | text | No | NULL | system-set | `.log_added_from` |
| Log Data | Additional free-text/JSON detail about the change event | text | No | NULL | system-set | `.logdata` |
| Created On | Timestamp of the change event | datetime | No | NULL | system-set | `.createdon` |
| Created By | The user or process attributed to the change | reference | No | NULL | system-set | `.createdby` |

This table's relationship to the Products module's own `vtiger_producttracking` QoH-change-history
entity is unconfirmed — both appear to be parallel audit trails likely firing from the same underlying
inventory-change events.

**Currency (Administration) — `vtiger_currency_info`** (1 live row — USD, Base). This is this table's
**first full catalog anywhere in the blueprint corpus** — not documented by Location or Users' own Pass
1 despite being cross-cutting in principle.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Currency Name/Code | Currency identity | text | Yes | NULL | user-entered | (column names not itemized individually in source beyond business meaning) |
| Base Designation | Whether this is the org's designated Base currency | boolean | Yes | NULL | user-entered | — |
| Conversion Rate | The exchange rate applied against the Base currency | number(rate) | Yes | NULL | user-entered | — |
| Status | Active/inactive flag | enum | Yes | NULL | user-entered | — |
| QuickBooks AP Account | The QuickBooks GL account name AP transactions in this currency should post to | text | No | "Accounts Payable" | user-entered | `.qb_accounts_payable` (`varchar(100)`) |

Saving a new conversion rate triggers a real, cross-module mass cost recompute (`updateEPVendorCost()`
via `SaveCurrencyInfo.php`); reassigning which currency is Base is a live-reachable side effect of the
Organization Details edit form, not a dedicated action; deleting a currency is entirely unguarded,
including against deleting the Base currency itself.

### 2.7 Backup & Server Configuration / VDP Tier & Color Settings / Time-Clock & Payroll

**Outbound Server Configuration (Mail / Proxy / Backup) — `vtiger_systems`** (1 row live — the same
physical table as Outbound Email/SMTP Configuration in §2.1; this concern area is its Backup/Proxy
write surface). One genuine functional strength: `Save.php` live-tests the connection (`fsockopen` for
proxy, `ftp_connect`/`ftp_login` for backup, or a real test email for mail) before persisting.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Config ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| Server Host | Hostname/IP of the mail/proxy/FTP server | text | No | NULL | user-entered | `.server` |
| Server Port | Port number for the connection | integer | No | NULL | user-entered | `.server_port` |
| Server Username | Login username for the server | text | No | NULL | user-entered | `.server_username` |
| Server Password | Login password — plaintext, no hashing/encryption column | text | No | NULL | user-entered | `.server_password` |
| Server Role | Which of the three roles this row configures | enum (`backup`/`proxy`/blank=mail) | No | NULL | user-entered | `.server_type` |
| SMTP Auth Required | Whether the mail server requires SMTP authentication (mail-role rows only) | boolean(-ish text) | No | NULL | user-entered | `.smtp_auth` |

**VDP (Vendor Direct Pricing) Plan, Tier, and Account Assignment** — given fuller treatment since it
carries the module's most consequential financial-calculation bug.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace | Table |
|---|---|---|---|---|---|---|---|
| Plan ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` | `fuse5_manage_vdp_plan` (0 rows) |
| Plan Name | Admin-assigned name for the VDP plan | text | No | 0 | user-entered | `.vdp_name` | `fuse5_manage_vdp_plan` |
| Tier ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` | `fuse5_manage_vdp_tiers` (0 rows) |
| Tab Type | Which tab/context this tier row belongs to | text/enum | Yes | NULL | system-set | `.tab_type` | `fuse5_manage_vdp_tiers` |
| Plan (FK) | The VDP plan this tier belongs to | reference | Yes | NULL | system-set | `.vdpid` | `fuse5_manage_vdp_tiers` |
| Tier Level | Sequential tier number 1-6, capped in `CreateVdpTierLevel.php` | integer | Yes | NULL | system-set | `.level` | `fuse5_manage_vdp_tiers` |
| Tier Min Price | Lower bound of the price band for this tier | money | Yes | 0.00 | user-entered | `.minprice` | `fuse5_manage_vdp_tiers` |
| Tier Max Price | Upper bound of the price band | money(-ish text) | Yes | NULL | user-entered | `.maxprice` — **Schema Drift**: `varchar(20)`, not decimal | `fuse5_manage_vdp_tiers` |
| Volume Discount % | Additional volume-discount percent applied within this tier | number(%) | Yes | 0.00 | user-entered | `.volumne_discount_percent` — misspelled in the live schema | `fuse5_manage_vdp_tiers` |
| Account Assignment ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` | `fuse5_manage_vdp_accounts` (4 rows) |
| Plan (FK, accounts) | The VDP plan these accounts are assigned to | reference | Yes | NULL | system-set | `.vdpid` | `fuse5_manage_vdp_accounts` |
| Assigned Account IDs | CSV list of account ids assigned to this plan — denormalized, no FK | text (CSV) | No | NULL | system-set | `.accountids` — **Open Question**: no referential integrity | `fuse5_manage_vdp_accounts` |
| Net Exception ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` | `fuse5_vdp_net_exception_price_plan` (1 row) |
| Include Cores | Whether core charges are included under VDP net-item pricing | boolean(enum) | Yes | No | user-entered | `.include_cores` | `fuse5_vdp_net_exception_price_plan` |
| Sell Price Override | Whether VDP net pricing overrides the normal sell price | boolean(enum) | Yes | No | user-entered | `.sell_price_override` | `fuse5_vdp_net_exception_price_plan` |
| Promotion Override | Whether VDP net pricing overrides active promotions | boolean(enum) | Yes | No | user-entered | `.promotion_override` | `fuse5_vdp_net_exception_price_plan` |

**Open Question**: `fuse5_vdp_net_exception_price_plan` has no plan-linking column despite the admin UI
being framed as per-plan — appears to be a single global settings row rather than per-plan.

**Commission Color-Tier Settings — `fuse5_commissiontiers`** (1 row live; `SaveColorSettings.php`
always deletes all rows and re-inserts exactly one, so this is effectively a singleton).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Commission Tiers ID | Primary key | identifier | Yes | auto_increment | system-set | `.commissiontiersid` |
| Level N Min (N=1-5) | Lower bound of commission-percent band N | integer(%) | Yes | NULL | user-entered | `.level{N}min` |
| Level N Max (N=1-5) | Upper bound of commission-percent band N | integer(%) | Yes | NULL | user-entered | `.level{N}max` |
| Level N Color (N=1-5) | Hex display color for band N | text (hex color) | Yes | NULL | user-entered | `.level{N}color` |

**Alternate Cost Field Configuration** — a dynamic schema mechanism, not a fixed table:
`alternateCostsSettings.php` dynamically adds/removes columns on `vtiger_locationcf` via live
`ALTER TABLE` statements and registers each new column as a standard vtiger custom field (inserting
into `vtiger_field`, `vtiger_field_seq`, `vtiger_profile2field`, `vtiger_def_org_field`). Also
references `vtiger_altcost_fields` (tracking which fieldids are alternate-cost fields) confirmed
**absent** from the live dev database — likely a stale/removed feature-toggle table.

**Company Holiday — `vtiger_holidaylist_user`** (10 rows live; company-wide, not per-location).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Holiday List ID | Primary key | identifier | Yes | auto_increment | system-set | `.holidaylistid` |
| Created By User ID | User who added the holiday | reference | Yes | NULL | system-set | `.user_id` |
| Created By User Name | Denormalized copy of the creating user's name | text | Yes | NULL | system-set | `.user_name` |
| Holiday Date | The calendar date of the holiday | date | Yes | NULL | user-entered | `.holidaydate` |

**Open Question / risk note**: `addholiday.php` is flagged as building its INSERT with unescaped/
unquoted request values (no parameterized query) — a SQL-injection-shaped risk. No separate
per-employee PTO request/balance system exists in this concern area.

**User Clock-In Detail (lookup list) — `fuse5_user_clockin_details_list`** (8 rows live).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| Detail Text | The clock-in detail/reason label | text | No | NULL | user-entered | `.details` |
| Created By User ID | User who created the lookup entry | reference | No | 0 | system-set | `.userid` |
| Sort Sequence | Drag-reorder display sequence | integer | No | 0 | user-entered | `.sequence` |
| Deleted | Soft-delete flag | boolean(int) | No | 0 | system-set | `.deleted` |
| Added On | Row creation timestamp | datetime | No | NULL | system-set | `.addedon` |
| Modified On | Row last-modified timestamp (auto-updates) | datetime | No | CURRENT_TIMESTAMP | system-set | `.modifiedon` |

**Time Card / Payroll Time Track — no dedicated table found**: `timeCard.php`/`payrollTimeTrack.php`/
`getPayrollListing.php` are pure display/reporting pages with no live query recovered in this pass.
**Open Question**: the actual clock-in/out timestamp data these reports summarize was not found in any
table discovered in this concern area — likely a Users-module login-history/time-clock table or a
background cron, out of Settings' own scope.

### 2.8 Misc Admin Utilities

#### Default Value / Lookup-Code Admin Utilities (grouped family)

Nine thin request-branching CRUD scripts, each managing one small, single-purpose admin lookup/
default-value table — catalogued as one family rather than nine separate full entities, per the
source's own judgment call for structurally-similar small lookups.

| Business Entity | Purpose | Legacy Trace (Table) | Columns (confirmed) | Rows (live) |
|---|---|---|---|---|
| Default SO Account (per location) | The default Account auto-applied to a new SO at a given location | `fuse5_default_so_account` | `id` (PK), `locationid` (ref), `accountname` (denormalized), `accountid` (ref) | 6 |
| Default Shipping Box Size | A named box size (dimensions) offered when packing a shipment | `fuse5_defaultboxsizesforshipping` | `id` (PK), `box_name`, `length`, `width`, `height` — all plain integers, no UOM column (**Open Question**) | 0 |
| Delivery Method (lookup) | A named delivery method option selectable on Sales Orders | `vtiger_cf_1177` (a standard vtiger picklist-value table) | `cf_1177id` (PK), `cf_1177` (label), `presence`, `picklist_valueid`, `sequence` | 10 |
| Delivery Method → E-commerce Push List | A curated subset of delivery methods flagged for push to e-commerce (truncate-and-repopulate, not a flag column) | `lbm_dm_for_ee_push` | `id` (PK), `dm_name` | 6 |
| QuickBooks Discrepancy/Memo Type → GL Account Mapping | Maps a discrepancy/memo-type code to a QuickBooks GL account | `fuse5_qbsettings` (see §2.4) | `id`, `profileid`, `txtidentifier`, `module`, `field`, `value` (mediumtext, encoded via `explodeMemoAccount`/`implodeMemoAccount`), `defaultval`, `display` | 151 |
| Lost-Sale Reason Code | A named reason code selectable when recording a lost sale | `vtiger_lostsalesreasons` | `id` (PK), `name` | 6 |
| Day-of-Week (DOW) List | A generic named/described, sortable, soft-deletable lookup value | `lbm_dow_list` | `id` (PK), `dow_title`, `description`, `is_deleted`, `created_datetime` | 5 |
| INI-Code List | Structural twin of the DOW list — "INI" purpose unconfirmed | `lbm_ini_list` | `id` (PK), `ini_title`, `ini_description`, `is_deleted`, `created_datetime` | 4 |
| Zip Code Master | Master zip-to-city/state lookup, bulk CSV-imported | `fuse5_zipcodes` — **table confirmed absent from the live dev DB** despite active code references | n/a (table missing) | n/a |
| Service Appointment Priority | Sortable, soft-deletable priority-ordering list for service appointments | `fuse5_service_appts_priority` — **table confirmed absent from the live dev DB** despite active code references | n/a (table missing) | n/a |

#### Add-On Subscription Toggle — `lbm_addons_settings` (4 rows live)

Each add-on is linked 1:1 to a `vtiger_supportedfield` row it keeps in sync; a cron helper
(`automaticallyOnOffAddOnsSettings.php`) auto-disables add-ons whose subscription has expired.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Add-On ID | Primary key | identifier | Yes | auto_increment | system-set | `.addons_id` |
| Add-On Setting Code | Internal code name for this add-on (syncs the linked `vtiger_supportedfield` row) | text | Yes | '' | system-set | `.addons_cs_name` |
| Add-On Section | Grouping/section label for display | text | Yes | '' | user-entered | `.addons_section` |
| Enabled | Whether the add-on is currently active | boolean(enum Y/N) | Yes | N | user-entered | `.addons_enable` |
| Last Modified Date | Timestamp of the last on/off toggle | datetime | No | CURRENT_TIMESTAMP | system-set | `.addons_modified_date` |
| Subscription Start Date | Date the add-on's subscription began | date | No | NULL | user-entered | `.subscription_start_date` |
| Subscription End Date | Date the add-on's subscription ends (drives cron auto-disable) | date | No | NULL | user-entered | `.subscription_end_date` |
| Modified Source | Whether the last change was manual or automated | enum/text | No | 'Manually' | system-set | `.modified_source` |

#### Data Warehouse Export Log — `fuse5_datawarehouse_log` (0 rows live)

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Log ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| Warehouse Type | Which export/warehouse feed this log entry is for | text | No | NULL | system-set | `.warehouse_type` |
| Run Time | When the export ran | datetime | No | NULL | system-set | `.run_time` |
| File Type | Type/format of the exported file | text | No | NULL | system-set | `.file_type` |
| File Name | Name of the generated export file | text | No | NULL | system-set | `.file_name` |
| Result | Outcome/log text of the export run | text | No | NULL | system-set | `.result` |

#### Slipstream (Vendor Bill-Pay) Integration Configuration — `slipstream_config_detail` (0 rows live)

Configured per location.

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace |
|---|---|---|---|---|---|---|
| Config Detail ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` |
| Location (FK) | Which location this Slipstream config applies to | reference | No | 0 | user-entered | `.location_id` |
| Server Status | Connection/enablement status of the integration for this location | text | No | NULL | system-set | `.server_status` |
| Customer ID | Slipstream-side customer identifier | text | No | '' | system-set | `.customer_id` |
| Beneficial Owner ID | Slipstream-side beneficial-owner identifier (bank-compliance field) | text | No | '' | system-set | `.beneficial_owner_id` |
| API Key | Slipstream API credential | text | No | '' | system-set | `.api_key` |
| API URL | Slipstream API base URL | text | No | '' | system-set | `.api_url` |
| Onboarding Video Link | Link to the Slipstream onboarding walkthrough video | text | No | '' | system-set | `.ss_flow_video_link` |
| Custom Onboarding Link | A custom onboarding URL variant | text | No | '' | system-set | `.custom_onboarding_link` |
| Slipstream Account ID | Slipstream-side account identifier | text | No | '' | system-set | `.ss_account_id` |
| Slipstream Account Status | Status of the Slipstream account | enum/text | No | 'ACTIVE' | system-set | `.ss_account_status` |
| Slipstream Business ID | Slipstream-side "customer business" identifier | text | No | '' | system-set | `.ss_customer_business_id` |
| Slipstream Business Status | Status of the Slipstream business entity | text | No | '' | system-set | `.ss_customer_business_status` |
| Deleted | Soft-delete flag | boolean(int) | No | 0 | system-set | `.is_deleted` |

#### Sales-Order Sub-Status & Web-Order Status (Status Manager family)

Backed by `lbm_sosubstatus` (12 rows), `lbm_sosubstauschange_emailtemplate` (0 rows),
`lbm_weborderstatus` (1 row). Both status-master admin pages (`sosubstatus.php`/`weborderstatus.php`)
carry confirmed, later-added SQL injection clusters (see `risks-and-open-questions.md`).

| Field | Business Meaning | Logical Type | Required? | Default | Source-of-Truth | Legacy Trace | Table |
|---|---|---|---|---|---|---|---|
| Sub-Status ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` | `lbm_sosubstatus` |
| Sub-Status Name | The SO sub-status label | text | Yes | NULL | user-entered | `.sosubstatus` | `lbm_sosubstatus` |
| Action Type | The workflow action this sub-status represents | text | Yes | NULL | user-entered | `.actiontype` | `lbm_sosubstatus` |
| Sort Order | Display/workflow ordering, auto-adjusted relative to "Invoiced" | integer | Yes | 0 | system-set | `.sortorderid` | `lbm_sosubstatus` |
| Created/Modified By User ID | User who last touched the row | reference | Yes | 0 | system-set | `.userid` | `lbm_sosubstatus` |
| Modified On | Auto-updating last-modified timestamp | datetime | Yes | CURRENT_TIMESTAMP | system-set | `.modifiedon` | `lbm_sosubstatus` |
| Deleted | Soft-delete flag | boolean(enum) | Yes | No | system-set | `.deleted` | `lbm_sosubstatus` |
| Email Rule ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` | `lbm_sosubstauschange_emailtemplate` |
| Sub-Status (FK) | Which SO sub-status transition triggers this rule | reference | Yes | NULL | system-set | `.sosubstatus_id` | `lbm_sosubstauschange_emailtemplate` |
| Action Taken | The specific action-taken value that triggers the email | text | Yes | NULL | user-entered | `.action_taken` | `lbm_sosubstauschange_emailtemplate` |
| Email Frequency | How often the notification email is sent | text | Yes | NULL | user-entered | `.email_freq` | `lbm_sosubstauschange_emailtemplate` |
| Email Limit | Cap on number of notification emails sent | text | Yes | NULL | user-entered | `.email_limit` | `lbm_sosubstauschange_emailtemplate` |
| Email Template | Which email template to use for the notification | text | Yes | NULL | user-entered | `.email_template` | `lbm_sosubstauschange_emailtemplate` |
| Web Order Status ID | Primary key | identifier | Yes | auto_increment | system-set | `.id` | `lbm_weborderstatus` |
| Web Order Status Name | The web-order status label | text | Yes | NULL | user-entered | `.weborderstatus` | `lbm_weborderstatus` |
| BigCommerce Status ID | Corresponding status id in BigCommerce | reference (external) | No | 0 | user-entered | `.big_commerce_status_id` | `lbm_weborderstatus` |
| Sort Order (web) | Display/workflow ordering, auto-adjusted relative to "Order Received" | integer | Yes | 0 | system-set | `.sortorderid` | `lbm_weborderstatus` |
| Created/Modified By User ID (web) | User who last touched the row | reference | Yes | 0 | system-set | `.userid` | `lbm_weborderstatus` |
| Modified On (web) | Auto-updating last-modified timestamp | datetime | Yes | CURRENT_TIMESTAMP | system-set | `.modifiedon` | `lbm_weborderstatus` |
| Deleted (web) | Soft-delete flag | boolean(enum) | Yes | No | system-set | `.deleted` | `lbm_weborderstatus` |

#### Remaining Misc Admin Utility Entities

| Business Entity | Purpose | Legacy Trace (Table) | Key Columns | Rows (live) |
|---|---|---|---|---|
| Primary Service Requested | Master-config lookup of "primary services requested" values, delegated to externally-defined functions | table not resolvable within this concern area — **Open Question** | — | — |
| Pro-Rating Return Term + Term Detail | A named return-term with tiered lower/upper-bound charge percentages by day-range, filterable by linecode/subline and return type | `vtiger_proratingreturnterm` (id, name), `vtiger_proratingtermdetail` (id, termid ref, lower, upper, type, charge money, productstrip, linecode, subline, normal/defect/warranty/core_returns flags) | see columns | 1 / 1 |
| Return Reason Code | User-defined reason code for product returns; blank values and "Credit Rebill" rejected on add | `vtiger_return_reason_code` | `id` (PK), `reason_code`, `type`, `deleted` | 2 |
| Document Watermark Configuration | Per-document-type watermark text/logo-image configuration for printed documents | `lbm_document_watermark` | `id` (PK), `display` (Yes/No), `document` (indexed), `item_image`, `item_text`, `watermark_item`, `deleted`, `userid`, `createdtime`, `modifiedtime` | 4 |
| Sales Area (per location) | A location-scoped sales-area classification value with auto-computed sort sequence | `vtiger_cf_salesarea` | `cf_salesareaid` (PK), `cf_salesarea` (label), `presence`, `picklist_valueid`, `locationid`, `sequence` | 2 |
| Paint-Care-Fee Tier + Fee | CSV-importable pricing structure for a paint-department "paint care fee" (state-mandated paint-disposal fees) | `lbm_paint_care_tier` (id, tier_number, tier_title, created_on, created_by, deleted), `lbm_paint_care_fee` (id, tier_id ref, state_name, state_abbreviation, fee money, created_on, created_by, deleted) | see columns | 4 / 34 |
| Delivery Time Frame | A named delivery-type window (start/end time strings), guarded against duplicate delivery-type names on add | `lbm_deliverytimeframe` | `id` (PK), `deliverytype`, `starttime`, `endtime` | 3 |
| POS Delivery-Method Actions (config) | JSON-blob config, keyed by delivery-method name + SO status, controlling POS "to be delivered" display behavior | `lbm_pos_deliveymethod_actions` | `id` (PK), `deliverymethod_name`, `sostatus`, `deliverymethod_actions` (JSON text) | 5 |

**Google Calendar Integration** — no local table found; two OAuth-token branches call
externally-defined token functions whose storage table was not resolvable — **Open Question**, likely
lives in a Users-module or generic OAuth-token table outside this batch's scope.

### 2.9 Core Settings Ajax Dispatcher / Module Entry Points

#### The generic key-value settings table — `vtiger_supportedfield`

**This is the single most important table surfaced across the entire Settings module's field
catalog.** 742 live rows, EAV-style (entity-attribute-value), backing hundreds of individually-named
admin settings across ~35 functional sections (Sales Order, Purchase Order/Receiving, Printing, EDI
Settings, WMS/scanner, Credit Card Processing, Master Brand, Job settings, Status Manager linkage, and
dozens more). No satellite/companion tables — the EAV pattern is self-contained.

| Column | Business Meaning | Legacy Trace | Notes |
|---|---|---|---|
| Setting ID | Primary key — the stable identifier a specific setting's write-site targets | `sufieldid` | PK |
| Setting Label | The human-readable admin-UI label for this setting | `sufieldlabel` | e.g. "Delivery Methods", "SPA Surcharge" |
| Setting Value (Status) | The setting's current value — despite the name, a free-form value | `sufieldstatus` | `ON`/`OFF` for checkboxes, CSV for multiselects, free-text/numeric for textboxes, or a selectbox choice string |
| Description | Longer admin-facing help-text description | `sufielddesc` | Tooltip/description text |
| Setting Type | The UI control type used to edit this setting — drives how value columns are interpreted | `sufieldtype` | checkbox 529 rows, selectbox 102, textbox 47, multiselect 22, link 14, text 7, radiobox 2, plus ~6 specialized one-off types |
| Setting Key (Session Name) | The internal machine key application logic elsewhere uses to look up this setting's value at runtime | `sufieldsesname` | Indexed (MUL) — the real lookup key most consuming code uses, not Setting ID |
| Sub-Status Value | Secondary/companion value column | `sufieldsubstatus` | used e.g. for search-field visibility sub-flags and an "X-Rank week value" toggle |
| Sort Order | Display order within its section on the admin page | `sortorder` | UI ordering only |
| Section Name | Which functional area/tab this setting is grouped under | `sectionname` | Fixed `ENUM` of 35 sections (Sales Order 288 rows, Printing 77, Other 52, Products 41, Purchase Order 33, EDI Settings 25, Store Transfer 23, Account 21, Credit Card Processing 18, Home Page 17, Receiving 15, Deliver 13, WMS & Scanner 12, Sales Order Line 11, Hide Role Based Custom buttons 10, Report Settings 9, Organization Management 8, and 18 smaller sections) — adding a genuinely new section requires a schema-level enum change |
| Data (tertiary value) | A tertiary free-text value slot | `sufielddata` | observed holding a phone number, a mode keyword, or a placeholder for still-unset custom fields |
| Dummy Flag | Unclear purpose | `dumycs` | nullable integer, default 0 — **Open Question** |
| Display-in-Context Flag | Whether this setting is shown in an unspecified UI context | `displayincs` | default shown (1) — **Open Question**: "CS" abbreviation unconfirmed |

**Business characterization**: the module's central feature-flag/configuration-value store — the
mechanism by which dozens of otherwise-hardcoded behaviors became admin-configurable without a schema
change per setting. Every consumer must know the specific lookup key it needs and how to interpret the
value column for that setting's type; a full row-by-row catalog of all 742 rows is out of scope (it
would effectively re-derive most of the ERP's admin-configuration surface), but the table's mechanism,
ownership, and structural shape are documented here as the canonical reference.

**Cross-reference finding**: `lbm_cost_change_nap_product` (2 rows live: `id` PK, `productid` ref
indexed, `defaultgp` decimal(11,2) default 0.00, `createdon`, `createdby`, `deleted` int indexed) is
confirmed written exclusively through `SaveSupportedField.php`'s `recordid`-keyed
`CUSTOM_COST_OF_NOT_A_PRODUCT` branch — a per-product opt-in default gross-profit override used when a
product's cost cannot be derived normally (e.g. a non-inventory "not-a-product" line). Simple guarded
single-row-per-product insert with no update path — re-submitting an existing product returns
`DUPLICATE` rather than updating `.defaultgp`.

#### Core Ajax Dispatcher and Module Entry Points — full risk treatment

No dedicated business-data tables of their own — routing/dispatch mechanisms, catalogued here since
they are the entry points through which most of the rest of the Settings module is actually reached.

| Entry point | Legacy Trace | Role |
|---|---|---|
| Generic Settings Ajax Entry Point | `SettingsAjax.php` (524 lines, zero PHP functions) | Dominant request-routing file. Its main branch (`$_REQUEST['file']`) `require_once`s an arbitrary `modules/Settings/{file}.php` named by the client request — most of the small task-dispatcher scripts throughout this document are reached *through* this file. Also handles inline branches: `orgajax` (delegates to `CreateSharingRule.php`), `announce_save`, `mb_save` (master-brand), `ediftp_save`, `addStyleToOmnna`. |
| Server Configuration Save Handler | `Save.php` (158 lines, zero functions) | The core save handler for the Outbound Server Configuration entity (§2.7): branches on `server_type` to live-test the connection before persisting. |
| Settings Landing Page Controller | `index.php` (132 lines, zero functions) | Default `module=Settings` admin-console home; no data writes. |
| Shared Form-Helper Library | `Forms.php` (231 lines, 2 functions) | Not a dispatcher — generic client-side form-validation JS generation and a generic "add new record" form builder used by multiple Settings sub-pages. |

These, together with `SupportedField.php`/`SaveSupportedField.php` (4,646 and 2,356 lines
respectively) form the structural backbone of the whole Settings module's request routing — flagged
prominently for the rewrite's routing/API-design pass, since the arbitrary-file-inclusion-by-request-
parameter pattern in `SettingsAjax.php` is both the mechanism that ties everything together *and* a
notable legacy security pattern to review (see `risks-and-open-questions.md`, R2).

## Known Gaps

- **~55 Open Questions were raised by the source field-catalog pass alone** (more than double that
  pass's own summary estimate). Every individual Open Question surfaced inline in §2.1–§2.9 above is
  drawn directly from the source; none has been resolved or guessed at in this document.
- **Two structurally near-identical tables with no confirmed relationship** recur as a pattern across
  this module (Company Profile vs. Organization Details, §2.1; the two document-folder trees, §2.6) —
  each is flagged in place rather than assumed to be either duplicates or a migration-in-progress.
- **Several tables are actively referenced by live code but confirmed absent from the dev database
  snapshot** this blueprint was extracted against: `lbm_theme_options` (§2.1), `vtiger_altcost_fields`
  (§2.7), `vtiger_link_fuse5_sharing` (§2.5), `fuse5_zipcodes` and `fuse5_service_appts_priority`
  (§2.8), and others — some confirmed broken, others whose production-environment status is simply
  unconfirmed either way.
- **Roughly 15 tables in this module's own field catalog are deliberately treated at table-purpose
  depth rather than full column-by-column depth** (shared vtiger-core metadata infrastructure in §2.3;
  families of structurally near-identical small lookup tables in §2.4, §2.5, and §2.8; the EDI
  trading-partner and shipping-carrier mechanisms in §2.4 that store settings in the generic key-value
  table rather than owning dedicated schema of their own) — an explicit judgment call by the source
  blueprint, preserved here rather than fabricating individual field rows the source itself never
  itemized.
- **A custom aftermarket-parts catalog import/export subsystem (§2.5) lives in an entirely separate
  database connection** whose target host/schema was not confirmed, and whose six tables could not be
  DESCRIBE'd — flagged for confirmation of both its target environment and its in-scope status before
  further blueprint or rewrite investment.
- **A proposed rewrite schema exists in the source** (`docs_from_blueprint/module/Settings/02-entities-
  and-fields.md` §2.11) covering credential/integration storage and company-profile duplication — this
  is explicitly the extraction session's own forward-looking design proposal, not a blueprint finding
  about what exists today, so it is not reproduced in this entities-and-fields catalog. See
  `build-guidance.md` for how it informs Stage 4 sequencing.
