# Accounts — Screens & User Flows

> This file is **inferred, not directly sourced from one blueprint pass** — the underlying blueprint
> does not document UI screens directly (out of scope for the source extraction passes, which
> catalog entry points/functions/fields/rules, not screen layouts). Source:
> `docs_from_blueprint/module/Accounts/08-screens-and-user-flows.md`, which infers the implied
> screen/interaction structure from the entities, rules, status findings, financial logic, outputs,
> and cross-module boundaries documented elsewhere in this module's spec.

## Screen Inventory

| Screen | Purpose |
|---|---|
| List view | Filterable, paginated, sortable grid of accounts, with export-to-file and mass-update (bulk field edits across a selection or saved search). |
| Detail view (read-only) | Account header, billing/shipping addresses, and related-list panels: contacts, jobs, pending/finalized sales orders (filtered separately by status), bids/contracts, autos/vehicles, activities, documents, ads, Year-to-Year sales comparison data. |
| Edit view (standard) | Full create/edit screen: identity/classification fields, the large billing/credit/statement-configuration field block (the extension-table fields — the module's largest single field surface), B2B access configuration, address blocks. Carries almost no server-side hard validation of its own — most of what happens on save is auto-fill, cascade, and override logic, not blocking checks (see business-rules-and-validation.md). |
| Quick Account Info panel | Condensed, embeddable view/edit surface (distinct from a SalesOrder-style alternate full flow) for narrower, faster field-level edits in embedded contexts. |
| Statement generation screen | Interactive surface for generating a single-account statement, with date-range/transaction-type/job-scope selection, plus a condensed "quick statement" variant reachable independently. |
| Batch statement screen | Account/date-range/location selection screen driving the bulk statement-generation engine, reachable interactively and via unattended cron entry points. |
| Archive statement screen | Browse/retrieval surface over previously generated statements, filterable by account or by date across all accounts, with a single-record detail popup. |
| Credit card management modal | Add/list/delete stored payment methods against the account, including a SalesOrder-embedded variant of the same widget reachable from the order-entry screen. **Currently fails outright** in the legacy system due to the missing underlying table (`vtiger_accountcreditcards`) — see risks-and-open-questions.md. |
| SPA code management modal | Add/edit/list Masterbrand "Special Price Agreement" codes for the account. |
| MPL exception management screen | Add/edit/list per-account/per-product Master Price List pricing exceptions, plus a bulk CSV import path. |
| Address management modal | Add/edit/delete billing/shipping address records for the account, plus a bulk CSV import/export path. |
| Ad/marketing association screen | Manage which advertising categories/ads the account is linked to. |
| Document management panel | Upload/list/download/delete file attachments linked to the account. |
| Account merge modal | Permission-gated flow for merging one account into another. Note: a separate, similarly-named legacy screen (`Merge.php`) is confirmed to be an unrelated mail-merge document-template exporter, not this feature — a naming confusion flagged for a new implementation to avoid repeating. |
| B2B portal login screen | Customer-facing login screen, outside the internal admin UI's own surface, sharing the same authentication concern (`authenticate_account()`) as the B2B-access-configuration block below. |
| B2B access-configuration block (on Edit view) | Internal configuration for catalog access, order-location permissions, username/password for the B2B storefront login. |
| Document generation/print actions | One action per output type (see outputs.md), most read-only against already-generated statement content; billing-cycle date configuration and manual-AR-date screens are narrower administrative variants of the same "configure how this account bills" concern. |

## Flows

- **Account create/edit (standard)**: entry via New Account or Edit action → identity/classification
  fields, billing/credit/statement-config block, address blocks, B2B config → save. Decision points:
  create vs. quick-create/activity-linked path (auto-fills from a default-template account and
  force-defaults Status to Active on the quick path only — ACC-VAL-003/004); A/R Type set to Balance
  Forward force-overrides Statement Transaction Type regardless of submitted value (ACC-VAL-007). Exit/
  success state: record saved; almost no path exists where the save is rejected outright (see
  business-rules-and-validation.md's headline finding that Save.php/Accounts.php contain no true hard
  block).
- **Address change propagation**: entry via editing billing/shipping address on an existing account
  with the "address changed" flag set → every related Contact's own mailing/other address fields are
  unconditionally overwritten with the account's just-submitted address, with no per-contact opt-out
  shown at the rule layer (ACC-VAL-005). A new implementation's screen should surface this cascade's
  scope to the user before it fires, since the legacy rule gives no visibility into which contacts will
  be affected.
- **Statement generation (interactive, single-account)**: entry from Account detail view's "Generate
  Statement" action → select statement type, date range, optional job scope → statement rendered
  on-screen. Decision points: A/R Type + Statement Transaction Type combination selects one of 5
  generation branches (ACC-VAL-023); company-info/logo resolves in priority order (specific profile →
  Default Location's info if the Account Statement Address Source setting selects it → org default)
  (ACC-VAL-024). Exit state: rendered statement, from which Email/Fax/Print/PDF actions branch off.
- **Batch statement generation**: entry via an account/date-range/location selection screen, or
  unattended cron. Decision points: account scope excludes Child-relationship accounts with a Parent
  Account set (ACC-VAL-038/083); for non-Manual frequencies, additionally requires non-zero Total Owed
  or Today's SO Totals (ACC-VAL-083). Exit state: per-account HTML files generated, archived, and
  (per delivery preference) emailed as PDF; a Reprint Invoices follow-up action becomes available,
  sourced from the batch run's collected finalized-SO-id list.
- **Credit-card add**: entry via the credit-card management modal → submit card number/description/
  type. Decision points: blocked with "already exists" if an identical (trim-compared) card number is
  already on file; blocked with "maximum limit reached" once the account has more than 50 stored cards
  — with a confirmed off-by-one gap at exactly 50 existing cards where neither condition is satisfied
  and the 51st card is silently not inserted with no message shown (ACC-VAL-110). Requests originating
  from the SalesOrder-embedded widget get an abbreviated echo-only response instead of the full
  rendered card list/modal (ACC-VAL-111). **In the traced legacy environment, this entire flow fails
  outright** with a database error rather than a validation message, because the underlying table does
  not exist (see risks-and-open-questions.md).
- **SPA code save**: entry via the SPA code management modal → submit Style Code, SPA Value, Builder
  Price Factor, Labor Adjustment. Decision points: blocked (client alert, re-render, abort) if the
  trimmed Style Code is empty (ACC-VAL-104); blocked if another SPA-code row for the same account
  already has the same code value, excluding the current record's own id when editing (ACC-VAL-105).
  Exit state: SPA code row saved, listed with a red/green color flag based on whether its Expire Date
  has passed (ACC-VAL-108).
- **Account merge**: entry via the Account Merge modal → select a source and destination account →
  confirm → execute. Decision points: whole-screen permission gate — non-admin users without the Merge
  permission are blocked from the screen entirely, before the merge form is even shown (ACC-VAL-037);
  a separate pre-check endpoint flags (but does not itself block) an already-soft-deleted account
  selection, and guards against concurrent double-running via a per-user lock file — but this is a
  pre-check only, and the actual merge-submit action only verifies a main account id was selected
  before writing its own lock, leaving a race window between two submits (ACC-VAL-034/035/036). A new
  implementation's screen/API contract should close this by making the merge command itself atomic.
- **B2B storefront login**: entry via the customer-facing login screen → submit username/password →
  `authenticate_account()` compares the submitted values against stored values via direct (non-
  parameterized, non-hashed) query matching. Exit state: access granted only on an exact match found
  for both fields (ACC-VAL-017) — flagged as a security item (plaintext/unparameterized comparison),
  not a business-rule finding in itself; see risks-and-open-questions.md.

## States

| Screen / Area | State | Notes |
|---|---|---|
| Account-level | Active/Inactive status | Real, validated field, but confirmed not to gate any behavior anywhere traced — a new implementation's screen may still surface it for record-classification/reporting, but should not assume marking an account Inactive currently blocks anything downstream, since the legacy system doesn't (see workflows.md). |
| Account-level | Status Code "health" classifier | Display-only. |
| Account-level | Fanbuilder signup status | Has a real guarded transition and is correctly shown as effectively immutable once set through the standard edit screen (see workflows.md §4.2–4.3). |
| Account-level | Lockout / Past Due Lockout flags | Referenced in business rules (ACC-VAL-021) but not independently investigated as UI states in the source screens pass. |
| Financial display | Current/past-due-bucket/deferred/total-owed balances | Read-only, system-computed fields (calculations.md) — none should ever be presented as directly editable inputs, only as read-outs of the aging pipeline. |
| Financial display | Paid-status-adjacent indicators | Surfaced through the statement/aging pipeline rather than a single account-level flag. |
| Edit view / all save paths | Validation/error state | Per the headline finding across nearly every rule group, the legacy system has almost no server-side hard-blocking validation — most screens' "errors" are actually silent auto-fills, cascades, and overrides rather than rejected submissions. A new implementation's screens should not assume the legacy absence of error states reflects an absence of *needed* validation — unconfirmed-required-field enforcement is a genuinely open design question. |
| Credit card management modal | No-permission / failure state | Whether the underlying storage mechanism is reachable at all is itself an open operational question in the legacy system (the missing-table Critical risk) — no legacy screen currently degrades gracefully when this occurs. |
| B2B access block | Credential-delivery state | In the legacy system, a welcome email transmits a plaintext password on successful B2B username validation — a new implementation's screen/flow design should replace this with a token-based onboarding state instead. |
| B2B access block | Access-enabled/disabled toggle state | Gates whether the account may log into the B2B storefront at all. |
