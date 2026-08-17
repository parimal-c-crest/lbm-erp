# Accounts — Permissions

> **No dedicated permissions/role-matrix pass exists for Accounts anywhere in the source blueprint
> material.** Unlike every other file in this module spec, there is no `0X-permissions.md`-equivalent
> document to reformat. What follows is genuine extraction: findings surfaced incidentally while
> extracting other passes (`blueprint/module/Accounts/02-validation-rules.md`,
> `06-cross-module-integrations.md`), cross-checked directly against `modules/Accounts/*.php` via
> `isPermitted(` and `authenticate_account(` greps. This file is intentionally thin where the
> evidence is thin — no plausible-looking full role matrix is invented below.

## Roles

Only two role-shaped concepts are actually confirmed anywhere in the source material or the live
code for Accounts:

- **Standard internal CRM user** — subject to the generic vtiger profile-permission system
  (`isPermitted(module, action, recordId)`), the same mechanism every other module in this codebase
  uses. No Accounts-specific role names (e.g. "Counter Staff" vs. "Accounting Staff") were confirmed
  anywhere in the traced permission checks — the module-overview's Actors section names business
  roles (Customer, Counter/sales staff, Accounting/management staff, Warehouse/counter/service
  staff, System/integration processes) descriptively, but no permission check in the code was found
  to gate on those specific role names.
- **B2B storefront customer** — an external, account-level (not user-level) actor authenticated via
  `authenticate_account()` (`modules/Accounts/Accounts.php:124`) against `vtiger_accountscf.username`/
  `.password`, entirely separate from the internal CRM user/profile permission system.

A third, narrower role-shaped concept is confirmed only for one specific gate: a hardcoded elevated
role requirement ("H2" or "PRESIDENT" per `blueprint/module/Accounts/02-validation-rules.md`
ACC-VAL-021, `Accounts.php:883-927`) used as the fallback when an account has no explicit Lockout
Password Level roles configured — this governs who may override a lockout, not general
module-level CRUD access.

No confirmation was found, one way or the other, of a distinct "Admin" role label — the Merge
permission gate below is described in the source as gating "non-admin users," but the actual
mechanism confirmed in code is a profile-level action permission check
(`isPermitted('Accounts','Merge')`), not a literal role-name comparison. Treat "Admin" in the Merge
row below as the source's own descriptive framing of "whichever profile has the Merge action
permission granted," not a confirmed distinct role entity.

## Permission Matrix

The generic vtiger `isPermitted(module, action, recordId)` mechanism is confirmed to gate the
following actions in `modules/Accounts/*.php` (grep-confirmed call sites, not inferred):

| Action | Standard CRM User (profile-gated) | B2B Storefront Customer | Notes |
|---|---|---|---|
| View (Detail/List) | Gated generically by the vtiger sharing/profile system (not separately re-verified in this pass beyond the edit/delete/merge/export checks below). | No access — B2B customers authenticate against a separate front-end site, not this internal admin UI. | `DetailView.php`, `ListView.php` |
| Create | Not independently confirmed by a dedicated `isPermitted` check in the files greped — the generic vtiger CRUD save path is the confirmed mechanism (see business-rules-and-validation.md, ACC-VAL-020: the entity save hook has no early-return/abort path anywhere). | N/A | Unconfirmed whether an explicit Create-action permission check exists separately from the generic save flow. |
| Edit (EditView) | Confirmed: `isPermitted("Accounts", "EditView", $_REQUEST['record'])` gates the Edit link on Detail View (`DetailView.php:296`) and List View (`ListView.php:166`); also gates Edit on the SPA Codes listview (`MasterbrandSPACodes.php:10`) and the Address list (`addresseslist.php:24`). | N/A | Per-record permission check, standard vtiger pattern. |
| Delete | Confirmed: `isPermitted("Accounts", "Delete", $_REQUEST['record'])` gates the Delete link on Detail View (`DetailView.php:299`) and List View (`ListView.php:162`); also gates Delete on the SPA Codes listview (`MasterbrandSPACodes.php:13`) and the Address list (`addresseslist.php:27`). | N/A | Per-record permission check, standard vtiger pattern. |
| Export | Confirmed: `isPermitted('Accounts', 'Export', '')` gates the Export action on List View (`ListView.php:179`). | N/A | |
| Merge | Confirmed **whole-screen** gate: non-admin users are blocked from the entire Account Merge modal (not just the submit) if their profile's "Merge" action permission (category 6, action index 8) is not granted — checked by rendering a "not permitted" message and exiting before the merge form is even shown (`mergeAccounts.php:91-106`; ACC-VAL-037). Also gates the Merge link's visibility on List View (`ListView.php:423`) and Detail View (`DetailView.php:309`). | N/A | The only confirmed whole-page (not just per-action) permission gate found for this module. |
| SPA Codes: Edit/Delete | Confirmed, per-request (`MasterbrandSPACodes.php:10,13`), same pattern as above. | N/A | |
| **SPA Codes: Duplicate** | **No permission check at all** — confirmed permission gap. The Duplicate action is always rendered regardless of the user's edit/delete rights, bypassing the same checks Edit/Delete enforce on the identical listview. | N/A | ACC-VAL-107; carried forward to risks-and-open-questions.md as ACC-RISK-… (see that file's finding set; this specific gap was not separately re-numbered there, it is documented here as the authoritative source). |
| B2B login (authenticate) | N/A | Confirmed: `authenticate_account($username, $password)` (`Accounts.php:124-136`) grants access only when a row exists in `vtiger_accountscf` matching both submitted values, compared via **direct, non-parameterized, non-hashed** SQL string concatenation (`"...where username = '$username' AND password = '$password'"`). Flagged as a security item (ACC-VAL-017; ACC-RISK-006 in risks-and-open-questions.md), not a business-rule/permission-design finding in itself — but it is genuinely the sole gate on B2B account access. | This is a hard block (access denied unless a match is found), but the matching mechanism itself is a confirmed security defect, not a design choice to replicate. |
| Statement ListView (B2B front-end requests) | N/A | **Confirmed bypass**: for statement requests flagged `requestfrom=b2bfrontend`, the `isPermitted('AccountStatement','ListView')` check is skipped entirely — that path relies on its own upstream authentication instead of this permission gate (`Accounts.php:1025,1729`; `BatchStatement.php:26`). | Out of scope for this file per the task's own instruction: this is an **AccountStatement**-module permission finding, not an Accounts-module one, despite living in `Accounts.php`/`BatchStatement.php` — it belongs in AccountStatement's own permissions.md/risk register. Named here only to explain why it is *not* itself a row in the matrix above. |

No confirmed differentiation was found between any two internal "Standard CRM User" sub-roles (e.g.
Counter Staff vs. Accounting Staff) — every internal-user check found in the grep sweep uses the same
generic `isPermitted("Accounts", action, recordId)` shape with no role-name branching visible in
these files. If finer-grained internal role differentiation exists, it would live in the underlying
vtiger profile/role configuration data, not in Accounts-module code itself, and was not traced here.

## Ownership / Record-Level Rules

- **B2B account-level authentication, not user-level**: the B2B storefront login model authenticates
  against the **Account** record's own username/password fields (`vtiger_accountscf.username`/
  `.password` — legacy fields — and separately, `cf_b2b_username`/`cf_b2b_password`, per
  entities-and-fields.md), not against individual CRM user accounts. This means the "record" a B2B
  login is scoped to is the Account itself — access is inherently record-level by construction, not
  layered on top of a user-level permission system.
- **B2B catalog/location scoping**: once authenticated, a B2B account's access is further scoped by
  two fields — B2B Catalog Access (which product catalog(s) it can browse) and B2B Order Locations
  Allowed (which store/branch locations it can order from) — both JSON multi-select fields on the
  account extension table (see entities-and-fields.md). Whether these are enforced server-side on
  every relevant request, or only used to filter what's displayed, was not independently confirmed in
  this pass — flagged as an open item.
- **Allow B2B Access gate**: a single boolean field (`cf_allow_b2b_access`) determines whether the
  account is permitted to log into the B2B storefront at all — the coarsest-grained access gate for
  this actor type.
- **Lockout-override role fallback**: `getLockoutPasswordLevel()` (`Accounts.php:883-927`) defaults
  to requiring the "H2" or "PRESIDENT" role to override a lockout when the account has no explicit
  Lockout Password Level roles configured — the same fallback applies again if the account genuinely
  has zero matching roles configured system-wide (ACC-VAL-021). This is a record-adjacent permission
  check (it governs an action on a specific account's lockout state) rather than a CRUD permission.
- **No confirmed state-dependent permission** (e.g. "can't edit once X") was found anywhere in the
  traced Accounts-module permission checks — unlike modules with a finalize/lock lifecycle, Accounts
  has no formal status state machine at all (see workflows.md), so there is no state for a permission
  rule to key off of. This is a genuine absence, not an oversight in this extraction.
- **No confirmed tenant-scoping detail** was found specific to Accounts' own permission checks beyond
  what the underlying multi-tenant platform provides generically — this pass did not trace whether
  `isPermitted()` itself enforces tenant boundaries, since that is repo-wide infrastructure outside
  Accounts-module code.

## Open items

- Whether B2B Catalog Access / B2B Order Locations Allowed are enforced server-side on every request
  or only used for display filtering was not confirmed.
- Whether any internal role differentiation exists beyond the generic `isPermitted("Accounts", ...)`
  shape (e.g. distinct Counter Staff vs. Accounting Staff permissions) was not traced — this file's
  grep sweep covered `modules/Accounts/*.php` only, not the underlying profile/role configuration
  data.
- Whether a distinct Create-action permission check exists separately from the generic vtiger save
  flow was not confirmed.
- The SQL-injection and plaintext-password findings noted in the Permission Matrix above (B2B login)
  are cross-referenced from risks-and-open-questions.md (ACC-RISK-001, ACC-RISK-006) — they are
  documented here only insofar as they define the actual (defective) access-control boundary; the
  security remediation itself is not re-derived in this file.
