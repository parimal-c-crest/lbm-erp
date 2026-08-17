# AccountStatement — Screens & User Flows

> Views, fields, interactions, states. No component library or framework assumption.

Source: `docs_from_blueprint/module/AccountStatement/08-screens-and-user-flows.md`. This file is
**inferred, not directly documented** — the blueprint doesn't document UI screens directly, the same
scope boundary every other module's screens file in this series draws. The screen/interaction
structure below is inferred from the file inventory and the output catalog in `outputs.md`.

## Screen Inventory

| Screen | Purpose |
|---|---|
| Single-account statement view | A form submitting statement type, date range, and optional job scope from the Account detail view; renders the generated statement HTML on-screen with print/email/fax actions available (Outputs 5-7). Implied by `Statement.php` (entry point, delegates to `Accounts::processAccountStatement`) and the `AccountStatement.php` engine's content-generation methods. |
| Quick statement view | A condensed variant of the single-account view, job-scoped, that additionally always produces a CSV export up front — the one confirmed behavioral difference from the full view beyond the discount-text drift noted in `risks-and-open-questions.md`. Implied by `Accounts::processQuickAccountStatement` and its distinct entry point. |
| Batch statement selection and generation | An account/date-range/location selection screen that kicks off bulk generation across many accounts, with per-account archive creation and delivery per that account's configured preference. Implied by `BatchStatement.php` (74 lines, selection UI) and `RunBatchStatement.php` (1,333 lines, the generation engine). `showBatchStatements.php` provides a session-based listing of generated batch files for download once a run completes. |
| Archive browsing | A filterable grid (by account, or by date across all accounts) letting staff re-view/re-send a previously generated statement — the archive's Display Status flag (`workflows.md`) governs what appears here. Implied by `ArchiveStatement.php` (271 lines, listview) and `ArchiveStatementSingleDetail.php` (94 lines, single-record detail load), backed by `ArchiveStatementData.php`'s ajax data-fetch. |
| Deferred/applied-adjustment detail popup | A popup reached from the statement view showing the ROA/adjustment detail behind a deferred amount, with a void action that reverses the applied-amount bookkeeping (`integrations.md`). Implied by `DeferredDetails.php` (228 lines). |
| Balance-forward statement/aging report | A distinct report view from the interactive single/quick statement flows, focused on the balance-forward aging presentation specifically. Implied by `displayBfStatement.php` (455 lines, current) and `displayBfStatementOld.php` (352 lines, a confirmed-legacy prior version kept alongside it). |

## Flows

**Single-account statement generation**: entry from the Account detail view → staff submits statement
type, date range, optional job scope → content generated (finance charge computed if applicable, see
`calculations.md`) → HTML persisted and archived → statement HTML rendered on-screen → staff chooses
print (Output 5), email (Output 6), or fax (Output 7) as a subsequent action.

**Quick statement generation**: same entry pattern as above, on a distinct entry point, job-scoped →
CSV export always written up front (unconditional, unlike the full flow) → same content-generation/
archive/delivery steps, subject to the confirmed discount-text behavioral drift vs. the full flow
(`risks-and-open-questions.md` STMT-RISK-003).

**Batch statement generation**: staff selects accounts/date-range/location (or a billing-cycle cron
entry point fires unattended) → billing-cycle past-due recomputation triggers → per-account content
generation, archiving, and delivery per that account's configured preference → a listing of generated
combined-batch files becomes available for internal review/print via `showBatchStatements.php`.

**Archive retrieval**: staff navigates to the archive listview → filters by account or date → selects
a row → stored HTML (file-path pointer, preferred, or inline blob fallback) is displayed, re-showing
exactly what was archived at generation time — no recomputation → same delivery actions (print/email/
fax) can be re-run against the already-archived content.

**Deferred-detail void**: staff opens the deferred/applied-adjustment detail popup from the statement
view → reviews ROA/adjustment detail behind a deferred amount → void action removes applied-ROA-detail
rows and reverses unapplied-amount bookkeeping via shared utilities.

## States

- **No interactive screen exists** for the administrative/cron-triggered flows: `BillingCycleCron.php`,
  `accountPastDueCron.php`, `updateJobBillingCycle.php`, and `generateStatementData.php` are unattended
  entry points. `archiveandsendemail.php` provides a bulk archive-and-email action for a
  caller-specified account subset, reachable programmatically rather than through its own dedicated
  screen per the file inventory gathered.
- **No-permission state for B2B requests**: statement generation reachable from the B2B front-end
  bypasses the standard listview permission check entirely for requests flagged
  `requestfrom=b2bfrontend` — see `permissions.md` for the full finding. Whether this produces any
  distinct UI-visible "no-permission" state on that path was not confirmed in the source pass.
- Loading/empty/error states for any of the screens above were not independently documented in the
  source blueprint pass — not confirmed either way, consistent with this file's own inferred-not-
  documented status.
