# AccountStatement — Permissions

> No existing content anywhere else in this module's spec covers permissions comprehensively — this
> file is genuine extraction, not a reformatting of prior work. Sources: `docs_from_blueprint/module/
> AccountStatement/09-risks-and-open-questions.md` item 2, `docs_from_blueprint/module/AccountStatement/
> 03-business-rules-and-validation.md` (STMT-RULE-003, source ACC-VAL-028), and
> `blueprint/module/Accounts/02-validation-rules.md` (ACC-VAL-028, `Accounts.php:1025,1729`,
> `BatchStatement.php:26`), cross-checked against `project-docs/approved-docs/docs-kit/2-module-specs/
> Accounts/permissions.md`'s own matrix row for this exact finding (that file explicitly defers the
> finding here since it is an AccountStatement-module gate, not an Accounts-module one, despite living
> in `Accounts.php`/`BatchStatement.php`).

## Headline finding: the B2B permission-check bypass for statement requests

**For statement requests originating from the B2B front-end, the standard listview permission check is
skipped entirely.** `isPermitted('AccountStatement', 'ListView')` is never called on the code path
taken when a request is flagged `requestfrom=b2bfrontend` — confirmed at `Accounts.php:1025,1729` and
`BatchStatement.php:26`. That request path relies **entirely** on its own upstream B2B authentication
instead of this permission gate, with **no defense-in-depth at this layer**.

This is not a passive absence of a permission concept for the B2B actor — it is an **active skip**: the
same code that gates every other statement request through `isPermitted('AccountStatement',
'ListView')` deliberately does not run that check when the request is tagged as coming from the B2B
front-end. Flagged by the source validation-rules pass (ACC-VAL-028 / STMT-RULE-003) as
security-relevant, and by Accounts' own risk register as Medium severity — **not confirmed exploitable
from this finding alone**, since the B2B path does still authenticate upstream (see
`business-rules-and-validation.md` STMT-RULE-001 for that authentication's own confirmed defect: direct,
non-parameterized, non-hashed username/password matching). The combination of the two — a weak upstream
authentication mechanism, feeding a path that has no independent permission check of its own once that
authentication is passed — is why this is documented as the centerpiece finding for this module's
permissions, not a minor footnote.

This finding is carried in the risk register as **STMT-RISK-002** (`risks-and-open-questions.md`) and
in the rule catalog as **STMT-RULE-003** (`business-rules-and-validation.md`). `build-guidance.md`
lists deliberately resolving this — either adding defense-in-depth at this layer, or explicitly
documenting the B2B upstream authentication as an intentional, reviewed sufficiency decision — as a
priority-3 security/correctness closure ahead of any rewrite cutover.

## Roles

Two role-shaped concepts apply to statement access, both inherited from Accounts' own permission model
(no AccountStatement-specific named roles were found):

- **Standard internal CRM user** — subject to the generic vtiger profile-permission system
  (`isPermitted('AccountStatement', <action>, ...)`), the same mechanism every other vtiger-derived
  module in this codebase uses. No AccountStatement-specific role names (e.g. "Billing Clerk" vs.
  "Accounting Manager") were confirmed in the traced permission checks.
- **B2B front-end request** — not a user-level role at all, but a request-shape flag
  (`requestfrom=b2bfrontend`) that, when present, **routes around** the standard permission check
  entirely rather than being evaluated by it. See headline finding above.

## Permission Matrix

| Action | Standard CRM User (profile-gated) | B2B Front-End Request |
|---|---|---|
| List/View statement (archive, generation) | Confirmed: `isPermitted('AccountStatement', 'ListView')` gates this action for internal-UI requests, per the standard vtiger role-privilege framework. | **No gate at all** — the same `isPermitted('AccountStatement', 'ListView')` check is skipped entirely for requests flagged `requestfrom=b2bfrontend` (`Accounts.php:1025,1729`; `BatchStatement.php:26`). Access instead depends solely on the B2B front-end's own upstream authentication (`authenticate_account()`, a confirmed-weak mechanism per STMT-RULE-001). |
| Generate statement (single/quick/batch) | Not independently confirmed by a dedicated action-specific `isPermitted` check beyond the ListView gate above — the generation entry points (`Statement.php`, `Accounts::processAccountStatement`/`processQuickAccountStatement`, `BatchStatement.php`) were not confirmed to carry their own separate permission check distinct from the ListView gate. | Same bypass as above applies to any generation request tagged `requestfrom=b2bfrontend`. |
| Archive retrieval/re-display | Covered under the same `ListView` gate as above; no separate Delete/Edit-shaped check was found for archive rows in the source material. | Same bypass applies if reachable via a `requestfrom=b2bfrontend`-tagged request; whether the archive-retrieval surface is itself reachable from the B2B front-end was not independently confirmed. |
| Create/Update/Delete (statement records) | Statement data (Open-Item Statement Line, Statement Deferred Detail, Batch Statement Snapshot) is system-generated, not user-authored — no confirmed user-facing Create/Update/Delete permission check applies to these rows directly. Statement Archive rows are written by the generation pipeline, not edited by users through a confirmed UI path (two one-off maintenance scripts exist that rewrite archived HTML directly — see `outputs.md` open items — but their invocation/permission context was not traced). | N/A — B2B is a read/generate-only actor for statement content; no write path into statement records was found on this actor's side. |

## Ownership / Record-Level Rules

- **Statement content is scoped to the requesting account**, not filtered by user ownership within
  the internal CRM — an internal user with `ListView` permission on AccountStatement can generate/view
  a statement for any account, subject to whatever broader vtiger sharing/role-privilege model applies
  generally (not independently re-verified for AccountStatement specifically in this pass).
- **B2B access is account-scoped, not user-scoped** — per Accounts' own permissions finding, the B2B
  storefront login model authenticates against the **Account** record's own username/password fields,
  not individual CRM user accounts. A statement request from the B2B front-end is implicitly scoped to
  whichever account authenticated — but because the `AccountStatement`-specific `ListView` check is
  bypassed on this path (headline finding above), whether the underlying statement-generation logic
  itself independently re-validates that the requested account matches the authenticated B2B account
  (i.e. prevents one authenticated B2B account from requesting another account's statement by
  parameter manipulation) was **not confirmed** in this pass — flagged as an open item below, not
  assumed safe.
- **No state-dependent permission was found** (e.g. no "can't generate once X" state gate) — consistent
  with `workflows.md`'s finding that Statement Archive has no unified state machine, only two narrow
  status flags (Display Status, Email Status), neither of which was found to gate generation/access
  permissions.
- **No tenant-scoping detail specific to AccountStatement** was independently traced beyond what the
  underlying multi-tenant platform provides generically, consistent with the same caveat in Accounts'
  own permissions.md.

## Open Items

- **Whether the B2B-bypassed statement-generation path independently re-validates that the requested
  account matches the authenticated B2B account** was not confirmed — this is the single most
  security-relevant unconfirmed question this file surfaces, since it determines whether the
  permission-check bypass is merely "no defense-in-depth" (acceptable if account-matching is
  independently enforced) or "a genuine cross-account access gap" (if it isn't). Needs SME/code
  confirmation before the priority-3 build-guidance decision (`build-guidance.md`) can be made
  responsibly.
- **Whether a dedicated Create/action-level `isPermitted` check exists for statement generation**
  distinct from the `ListView` gate was not confirmed — the source material traces the `ListView` gate
  specifically, not a full action-by-action sweep of every AccountStatement entry point.
- **Whether the archive-retrieval surface is itself reachable via a `requestfrom=b2bfrontend`-tagged
  request** (and therefore also subject to the bypass) was not independently confirmed — the two
  confirmed bypass call sites are in `Accounts.php` (statement generation) and `BatchStatement.php`
  (batch generation), not in the archive-specific files (`ArchiveStatement.php`,
  `ArchiveStatementSingleDetail.php`, `ArchiveStatementData.php`).
- This file's B2B-login weakness cross-reference (STMT-RULE-001 / ACC-VAL-017) is documented here only
  insofar as it defines the actual (defective) upstream authentication the bypassed path relies on —
  the security remediation for that authentication mechanism itself belongs to Accounts' own spec, not
  re-derived here.
