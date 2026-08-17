# Settings — Permissions

> This file has no content anywhere yet for any of the 18 previously-specified modules — this is
> net-new extraction work, not a reformatting exercise (see `_deviations-from-original-template.md`).
> Settings is unusually well-suited to have a substantial permissions.md, since role/profile/permission
> management IS literally what one of its own concern areas (§2.2, `entities-and-fields.md`) does — this
> module is both a *consumer* of a permission model (like every other module) and the *administrative
> owner* of the permission model's own admin-UI write surface. Both angles are covered below.

Source: `docs_from_blueprint/module/Settings/02-entities-and-fields.md` §2.2 and
`blueprint/module/Settings/01-entities-fields.md` (Roles/Profiles/Permissions/Sharing section);
`docs_from_blueprint/module/Settings/03-business-rules-and-validation.md` §3.2 (rules SET-RULE-030
through SET-RULE-055 in this spec's renumbering); `docs_from_blueprint/module/Settings/09-risks-and-
open-questions.md` (R2 / SET-RISK-002).

## Roles

Settings itself is not built around a business entity with its own owned roles the way, say, SalesOrder
has "who can approve an SO." Instead, this module's roles are (a) the generic administrative roles who
use Settings' own screens, and (b) — genuinely unusual for this module spec series — the role/profile/
group entities that Settings' Roles/Profiles/Permissions/Sharing concern area *administers* for the
whole system, on behalf of the Users module which owns the underlying schema.

**Roles who use Settings' screens** (derived from `module-overview.md` § Actors):
- **System/superadmin administrators** — the primary actors across nearly every sub-domain. Several
  sub-areas are explicitly admin-only or superadmin-only gated at the code level: F5 API keys, AWS S3
  credentials, and add-on toggles are confirmed hardcoded to admin-only (user id 1) or superadmin
  checks. Most other Settings endpoints have **no confirmed in-file access-control check at all** — see
  `Ownership / Record-Level Rules` below.
- **Organization/company profile managers**, **integration/IT administrators**, **location/branch
  managers**, **template/document designers**, **auditors/compliance reviewers**, **pricing/finance
  administrators** — the narrower functional roles named in `module-overview.md`, none of which the
  source blueprint confirms as enforced by a distinct permission check within Settings' own files; these
  are business-role labels the source infers from *what* a screen does, not confirmed access-control
  gates.

**Roles Settings administers (on behalf of Users)** — the entities a Settings admin screen lets a
superadmin create/edit, which then govern every other user's access to every other module in the
system:
- **Role** — a named position in the org hierarchy (`vtiger_role`), created/edited via
  `createrole.php`/`SaveRole.php`, bound to exactly one Profile.
- **Profile** — the actual permission bundle (`vtiger_profile`) a Role is bound to; field/tab/module/
  utility permissions are physically stored against the Profile, not the Role (a confirmed mechanism
  finding — see `entities-and-fields.md` §2.2).
- **Group** — a named collection of users/roles/roles-and-subordinates/other groups (`vtiger_groups`),
  used as a sharing-rule target.
- **Sharing Rule** — governs cross-role/cross-group record visibility for a given module.

## Permission Matrix

Two matrices are needed because this module has two distinct kinds of "permission" in play: (1) who can
use Settings' own screens, and (2) what the Role/Profile/Group/Sharing entities Settings administers
actually grant. Both are documented below with their confirmed-vs-unconfirmed status made explicit
rather than assumed.

### Matrix 1 — Who can use Settings' own admin screens

| Action | System/Superadmin | Org Profile Manager | Integration/IT Admin | Ordinary Admin (non-super) |
|---|---|---|---|---|
| F5 Platform API Keys (create/view/delete) | Confirmed gated (admin-only, user id 1) | No | No | No |
| AWS S3 Bucket Credentials (create/view/delete) | Confirmed gated (admin-only) | No | No | No |
| Add-On Subscription Toggles | Confirmed gated (superadmin-only) | No | No | No |
| Organization Details / Company Profile edit | Unconfirmed — no in-file check found | Presumed yes (role label from source) | Unconfirmed | Unconfirmed |
| Roles/Profiles/Sharing-Rule CRUD | Unconfirmed — no in-file check found beyond whatever generic route-dispatch/ACL layer gates Settings-module actions in general, not opened in this pass | Unconfirmed | Unconfirmed | Unconfirmed |
| Integration credential save (QuickBooks, EDI, payment gateways, generic external API) | Unconfirmed — no in-file check found | No (role label doesn't fit) | Presumed yes (role label from source) | Unconfirmed |
| Module Manager (hard delete/restore) | Unconfirmed — no in-file check found | No | No | Unconfirmed |
| Audit Trail toggle | Unconfirmed — no in-file access-control check of its own found | No | No | Unconfirmed |
| Tax/VDP/Currency configuration | Unconfirmed — no in-file check found | No | No (role label doesn't fit) | Unconfirmed (role label: pricing/finance administrator, not independently confirmed as enforced) |

**Reading this matrix**: only three endpoints across the entire ~236-file module have a *confirmed*,
code-level access-control gate: F5 API keys, AWS S3 credentials, and add-on toggles. For every other
row, the source blueprint's own repeated finding is that "whether any access-control layer exists above
the individual save/delete action was not confirmed one way or the other" — the presumed-yes/no cells
above reflect the source's own inferred role-label fit (per `module-overview.md` § Actors), not a
confirmed enforcement mechanism. This gap is itself the single largest permissions-relevant finding in
this module and is not softened here.

### Matrix 2 — What Role/Profile/Group/Sharing (as administered by Settings) actually grant

This is the schema Settings' Identity & Access concern area writes to, owned end-to-end by the Users
module's own field catalog; Settings is the CRUD/admin-UI write surface, not the schema owner. The
categories below are the permission dimensions the Role/Profile mechanism enforces system-wide, not
Settings-specific:

| Permission Dimension | Enforced Via | Settings' Role |
|---|---|---|
| Per-module CRUD action (Create/Read/Update/Delete) | `vtiger_profile2standardpermissions` (Profile-level) | Settings' Role-editor UI writes this via the "standard action" permission grid |
| Per-module/tab visibility | `vtiger_profile2tab` (Profile-level) | Written by the same Role-editor UI's tab-permission loop |
| Per-field visibility/read-only | `vtiger_profile2field` (Profile-level, org-default baseline in `vtiger_def_org_field`) | Written by the Role-editor's field-visibility loop, and separately by the org-wide Default Field-Level Access editor |
| Global/system-level permission | `vtiger_profile2globalpermissions` (Profile-level) | Written by the same Role-editor UI |
| Per-module utility action | `vtiger_profile2utility` (Profile-level) | Written by the same Role-editor UI |
| Record-level sharing (cross-role/cross-group) | The nine `vtiger_datashare_*` variants | Written by Settings' Sharing-Rule create/edit screen |
| Protected/sensitive field visibility | `vtiger_field.protected` column, gated per-user via `vtiger_users.protected_field_permission` | Written by Settings' Protected-Field-List editor — **but hardcoded to the Accounts module only**, despite the action being generically named (see Business Rules below) |
| Report access | `lbm_role_reports` | Written by Settings' Role-Permitted-Reports picker |

## Ownership / Record-Level Rules

- **No tenant/ownership scoping documented within Settings' own files.** Because Settings is a
  system-configuration area, not a business-record module, "does a user only see their own records"
  does not apply in the SalesOrder/Accounts sense — most Settings entities are singleton or
  organization-wide config rows (Organization Details, currency, tax tables, the generic settings
  table), not per-user records. Where a Settings entity *is* per-user (Mail Accounts, Announcement —
  one row per creator), ownership is implicit in the primary key/foreign key shape (e.g. Announcement's
  primary key is literally the creator's user id) rather than enforced by a separate permission check.
- **State-dependent permission — none confirmed.** No Settings entity in this module was found to have
  a "can't edit once X" state-dependent permission rule (the module's own status-workflow findings — see
  `workflows.md` — establish that most Settings entities have no lifecycle at all, so there is no
  finalized/locked state to gate edits against in the first place).
- **A confirmed cross-module ownership violation exists**: `SaveCustomLabels.php`'s field-label update
  is **not scoped by `tabid`** (SET-RULE-006 / SET-RISK-012 — see `business-rules-and-validation.md`
  and `risks-and-open-questions.md`) — if the same field name is reused on a different module's tab,
  every matching row across every module gets relabeled in one statement, regardless of which module's
  admin actually intended the change. This is a structural absence of module-scoped ownership on a
  write path that should have it.
- **A confirmed record-level authorization gap exists** in the picklist/combo-field editor popup: its
  query is scoped to whichever role id the request supplies with **no ownership/permission check
  against the current session user** — any user able to reach this endpoint can view the picklist-value
  configuration for any role in the system by id (SET-RULE-087).

## Credential access control — who can view/edit integration credentials

Given this module's confirmed severity (the credential store for QuickBooks/Traverse, every EDI trading
partner, six payment gateways, and AWS S3 — several in plaintext, zero-escaping storage, per
`risks-and-open-questions.md` and `integrations.md`), credential access control is a permissions-
relevant angle worth stating explicitly rather than leaving folded into the risk register alone:

- **No credential-specific access-control layer was found anywhere in this module**, beyond the
  three confirmed admin/superadmin gates already listed in Matrix 1 (F5 API keys, AWS S3, add-on
  toggles). QuickBooks settings, EDI trading-partner FTP/SFTP credentials, all six payment-gateway
  credential tables, the generic external-API-credential table, and Slipstream's config are all written
  through endpoints whose own in-file access control was **not confirmed** by the source blueprint —
  the same "presumed gated somewhere above this file, not confirmed within it" pattern documented
  throughout `business-rules-and-validation.md` §3.4.
- **Once written, credentials are additionally readable in plaintext by anyone who can reach the
  corresponding settings-form GET/render path**, since several (DIB/Orgill EDI passwords, EliteExtra
  FTP/API passwords, shipping-carrier API passwords, payment-gateway bearer tokens) are confirmed
  redisplayed unmasked into the settings-form value on page load (SET-RULE-099 through SET-RULE-105) —
  meaning credential *visibility* is governed by whatever gates the settings page itself, with no
  separate "can view this specific secret" check layered on top, and the AWS S3 secret key and the
  generic external-API-credential password are stored with **no encryption at all**, so a direct
  database read (not merely reaching the admin UI) also exposes them in the clear.
- **No differentiated "view vs. edit" permission was found for any credential** — every credential
  screen investigated is a single combined view/edit form; the module has no read-only credential
  viewer role distinct from whoever can also change the credential.
- **Recommendation carried from `build-guidance.md` D3**: in a new implementation, every credential-
  shaped field should move to a dedicated secrets-vault reference (never a plaintext column), with
  credential *access* (not just write) logged through a channel independent of the general audit-trail
  toggle — closing both the storage gap and the access-control gap identified here in one mechanism,
  rather than patching visibility controls onto the legacy plaintext-column shape.

## Open Questions

- Whether any generic, shared route-dispatch/permission-check layer (outside the files this blueprint
  read) actually restricts the large majority of Settings' endpoints to admin-role users was not
  confirmed — this is the single largest open item in this file, repeated across nearly every row of
  Matrix 1.
- Whether the Protected-Field-List editor's hardcoded Accounts-only scope (despite its generic naming
  and any-module-capable underlying helper) is an intentional restriction or an unfinished feature was
  not confirmed by the source.
- Whether a caller of `checkDuplicateLocation.php`/`validateRegionAndDivision.php`-style advisory
  pre-check endpoints (see `business-rules-and-validation.md` SET-RULE-122/123/145) actually enforces
  the reported result, versus merely displaying it, was not confirmed for any of the advisory-only
  endpoints identified across the module.
- Whether the combo-field editor popup's cross-role visibility gap (SET-RULE-087) is exploitable in
  practice depends on which roles can reach the popup at all — not traced, since the popup's own
  access gate is itself unconfirmed (see Matrix 1).
