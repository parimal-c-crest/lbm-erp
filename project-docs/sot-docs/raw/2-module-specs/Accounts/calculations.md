# Accounts — Calculations

## Applicability

Accounts has substantial computed/derived logic: finance-charge calculation, aging-bucket/past-due
computation, credit-limit checking, and tax-exemption determination. Source:
`docs_from_blueprint/module/Accounts/05-financial-pricing-logic.md`. Statement-specific balance/
rendering math beyond what's captured here is re-homed in the separately-specified AccountStatement
module spec and is not re-derived in this file.

**Headline finding**: two structurally independent finance-charge engines exist (the manual/batch
UI-triggered flow and the nightly cron), maintained as separate copies rather than a shared
function, with **three confirmed points of divergence** between them (principal formula, threshold
gate application, and — most significantly — the rate divisor). This divergence is preserved as
documented below rather than resolved into a single "correct" formula; whether one is a defect or
both are intentionally different is not settled by the source.

## Calculation Pipeline

### 1. Finance-charge principal (both engines, otherwise identical)

- **Inputs**: the four billing-cycle past-due buckets (1-cycle, 2-cycle, 3-cycle, 3-plus-cycle),
  Deferred, A/R Type.
- **Formula**: `sumOfPastDue = pastDue1Cycle + pastDue2Cycle + pastDue3Cycle + pastDue3PlusCycle`,
  plus a "last month or week" amount **on the cron path only** (the manual/batch engine's
  underlying data structure structurally cannot include that term). If A/R Type is "Balance
  Forward" and Deferred is non-zero, `sumOfPastDue -= Deferred`.
- **Output**: past-due principal used as the basis for the charge.
- **Divergence #1 (confirmed)**: cron folds in the last-month/week amount; manual/batch cannot.
- Always derived from a freshly-run aging-bucket recompute (stage 3 below) immediately before the
  finance-charge computation runs — never from stale, already-persisted bucket values.

### 2. Minimum-amount-to-apply threshold gate

- **Inputs**: Finance Charge Apply By Job, "Minimum Amount To Apply Finance Charge" setting,
  `sumOfPastDue`.
- **Formula**: `minimumAmountToApply = 0`, unless Apply By Job = "Yes" AND the minimum setting is
  greater than 0, in which case `minimumAmountToApply = Minimum Amount To Apply Finance Charge`.
- **Divergence #2 (confirmed)**: manual/batch applies the gate **before** computing (enter the
  calculation only if `sumOfPastDue > minimumAmountToApply`); cron computes the charge **first**,
  then conditionally zeroes it if `sumOfPastDue < minimumAmountToApply`. Functionally equivalent
  for the common case, not byte-for-byte identical logic (the LBM-2936 rule, independently
  implemented twice — ACC-VAL-044/ACC-VAL-076 in business-rules-and-validation.md).

### 3. Rate application (the headline divergence)

- **Inputs**: Annual Finance Charge Percentage (default 0), Minimum Finance Charge (default 0),
  payment term.
- **Formula, manual/batch (always)**: `financeChargeAmount = (sumOfPastDue × financeChargePercent / 100) / 12` — always monthly proration; no daily-rate branch exists anywhere in this engine.
- **Formula, cron only**: divides by 365 (daily proration) specifically when the term is the
  shortest available term ("Net 1"); divides by 12 for every other term.
- **Divergence #3 (confirmed, headline)**: an account on the shortest payment term receives a
  materially different, roughly-30x-smaller batch-computed charge than the cron's daily-prorated
  charge, depending purely on which entry point computes it. No comment or design note in the
  legacy code explains why the manual/batch engine lacks the daily-rate branch.
- **Rounding**: `financeChargeAmount` is rounded to cents.
- **Floor**: if Minimum Finance Charge is set and the computed amount is below it, the minimum is
  used instead. The cron engine additionally gates this floor on the principal being positive; the
  manual/batch engine applies the floor unconditionally whenever the computed amount is below the
  minimum (rarely diverges in practice, since the threshold gate already requires a
  positive-enough principal to reach this step).

### 4. Discount-term suppression and credit-memo computation (cron-only)

- Exists only in the cron engine — a manually-triggered finance charge is never suppressed by
  these discount terms.
- For a fixed set of early-payment discount-term strings, the computed finance-charge amount is
  unconditionally forced to zero. Instead:
  - `totalRemainingCreditAndRoaAmount` = credits and ROA amounts booked this month, to date.
  - `sumOfPastDueTillDate = sumOfPastDue - totalRemainingCreditAndRoaAmount`.
  - If `sumOfPastDueTillDate <= 0` (account is not net-past-due once credits are netted in) and
    `lastMonthNetSales > 0` (prior month's net sales, or a ROA-amount variant depending on which
    discount-term family matched): `creditAmount = (percentage × lastMonthNetSales) / 100`, where
    percentage is 1, 2, 5, or 6 depending on the matched term.
  - Two of the discount-term branches instead base the credit on actual ROA cash received rather
    than net sales, and use **two different denominators for what is nominally the same 2% term
    family**: one computes `creditAmount = (2 × totalRoaAmount) / 98` (a source comment frames this
    as "we have used ROA amount as 98% and give 2% on this 98% amount"); the other computes
    `creditAmount = (2 × totalRoaAmount) / 100`. Both are preserved exactly as documented — the
    source found no evidence the divisor difference is a bug rather than a negotiated term
    difference, and it is not "corrected" here.

### 5. Ledger posting

- Both engines post the finance charge as a negative-amount ledger entry (a charge increases what
  the account owes), only when the computed amount is positive; the manual/batch engine
  additionally requires the account's finance-charge-mode setting to allow posting at all (a gate
  the cron engine also checks, but at a different point in its flow).
- The credit-memo branch (cron-only) posts the opposite sign (a positive-amount credit),
  **independently of whether the finance-charge-mode gate would have allowed a charge to post at
  all** — confirmed as intentional discount-terms behavior, not reconciled to symmetric gating
  without further business input.

### 6. Job scoping

- The manual/batch engine's outer loop re-runs the entire principal/threshold/rate computation once
  per job under the account (or once for the account as a whole, for accounts with no job-level
  scoping). The formula itself has no internal job-awareness — job scoping happens entirely by
  re-running the aging-bucket recompute (stage 3 in this pipeline) with a different job argument
  each iteration.

### 7. Statement balance / aging-bucket computation (Balance-Forward three-pass waterfall)

- **Inputs**: six raw bucket amounts (current, last-month-or-week, 1-cycle, 2-cycle, 3-cycle,
  3-plus-cycle), each independently fetched by a shared remaining-amount function keyed by a date
  window resolved by term-parsing logic (confirmed quadruplicated — see Open Questions).
- **Applies only to Balance Forward accounts.** Open-Item accounts skip all three passes and use
  each bucket's raw fetched amount as-is.
- **Pass 1** — fold negative adjustments and residual credit into the payment pool, per bucket: if a
  negative adjustment was recorded against a bucket, `due[bucket] += that negative amount` (as a
  positive addition to what's due) and `payment[bucket] = 0`; if both a payment amount and a credit
  amount are set for a bucket, `payment[bucket] += credit[bucket]` and `credit[bucket] = 0`.
- **Pass 2** — oldest-due-first application: for each bucket with a positive due amount (descending
  order, most-recent first), apply `min(available payment, remaining due)` from the payment pool
  across buckets in the same order; `result[bucket]` = remaining due after all available payment is
  applied.
- **Pass 3** — residual credit drives the bucket negative: for each bucket, if payment is left over
  after Pass 2's due-clearing, `result[bucket] -= that leftover payment` (bucket goes negative — a
  credit balance).
- **A second, independent netting layer** exists inside the per-bucket fetch itself (for
  Balance-Forward accounts): the remaining-amount function already nets same-window credit against
  same-window due *before* the three-pass cross-bucket waterfall runs a second time on the results.
  This two-layer structure (local netting, then global netting) is preserved as documented — the
  source found no evidence it is accidental duplication rather than intentional.

### 8. Total Owed

- **Formula**: sum of all six buckets. Deferred is fetched separately (summing only positive-total
  rows) and is **confirmed deliberately not subtracted** — a prior subtraction existed and was
  removed, left commented out rather than deleted. A "negative deferred"/returns counterpart
  (summing negative-total rows) is computed and stored but likewise not folded into Total Owed.
  Whether it *should* fold in is an open business-design question, not a settled fact.
- **Persistence**: two functions persist the computed buckets (one for the account, one for a job),
  each performing a field-folding step (the "current" bucket is written as
  current-plus-last-month-or-week, since last-month-or-week is never persisted as its own column),
  with every value rounded before being written. The job-level variant additionally writes a second,
  duplicate "total owed" column under a different name whenever the job-field mapping designates it
  — a confirmed duplicate-write finding, not resolved by this specification.

### 9. Term-schedule parsing (confirmed quadruplicated)

- Payment-term date-boundary parsing (resolving a term string like "Net 30" into a concrete date
  window) is independently re-implemented in at least four places: aging-bucket window resolution, a
  "last N periods" computation, a due-date calculation, and an inline variant embedded in the
  interactive statement-generation functions. A change to any term's meaning must be replicated
  correctly across all four or the account's aging buckets, invoice due dates, and discount-text
  display will silently disagree. This is a documented structural risk, carried forward as-is (full
  detail: risks-and-open-questions.md).
- The billing-cycle cron's clock has a deliberate one-day lag: every downstream date-window
  computation is anchored to "yesterday," not the cron's actual run time — confirmed as a deliberate
  design choice, not an incidental artifact.
- For "Manual" billing-frequency accounts, the admin-facing billing-cycle-date screen writes/reads a
  start/end date pair verbatim, but the date pair *actually used* in the aging computation takes the
  start date from the "current"-typed cycle row only and hard-codes the end date to *today*,
  regardless of the configured end date. Whether this is intentional or a latent UX bug was not
  determined.

### 10. Credit limit (cross-module capability — not gated inside Accounts itself)

- Accounts does not itself gate any save on credit limit; the numeric comparison lives in shared
  code invoked from SalesOrder, which reads Accounts' fields directly. Documented here because the
  computation itself is Accounts-side data.
- **Child-account redirect**: if the account being checked is a Child account with a parent set, the
  entire check re-runs against the **parent** account's fields instead (via a full entity reload).
- **In-flight exposure add-on**: the total of any other not-yet-finalized, charge-to-account orders
  for the same account currently awaiting payment verification is folded into the owed amount before
  the comparison — capturing exposure that Total Owed (only refreshed by the cron/finance-charge
  posting, not live per-order) would not yet reflect.
- **Formula**:
  ```
  totalOwedByAccount = Total Owed + inFlightPendingVerificationAmount
  if stopOverCreditLimit is empty:                            SUCCESS (no enforcement configured)
  elif Terms == 'No Credit':                                  hard failure
  elif (totalOwedByAccount + proposedAmount) <= Credit Limit:  SUCCESS
  elif stopOverCreditLimit == 'Warning':                       failure, warning-only
  elif stopOverCreditLimit == 'Yes':                           hard failure
  elif stopOverCreditLimit == 'Password':                      role-gated
  else:                                                        role-gated (same gate)
  ```
- The password-override and final catch-all branches share an identical role-membership gate: a
  configured list of roles permitted to bypass the block is checked against the session's role; if
  not in that list, not an administrator, and a system-wide alt-approval setting isn't disabled, the
  result routes to an "alt-approval" outcome (SalesOrder turns this into a pending-approval
  sub-status); otherwise it routes to a password-override prompt.
- **Job-level credit limit** runs as a second, independent check using the identical formula shape
  against job-scoped fields. Because a job's owed figure is tracked independently from the account's
  Total Owed — while a job's credit limit is only cascaded from the account's Credit Limit at
  account-save time for opted-in jobs — the job-level and account-level checks can drift out of sync
  between account saves. The job-level password-override/final-else branches were not independently
  re-read character-for-character in the source; they visibly mirror the account-level pattern by
  naming convention only — inferred, not confirmed.

### 11. Tax exemption (pure lookup, no arithmetic)

- Combines the account's Tax Status with a line's product Tax Status:

| Product Tax Status ↓ / Account Tax Status → | Always | Sometimes | Never |
|---|---|---|---|
| **Always** | Taxable | Taxable | Exempt |
| **Conditionally Yes** | Taxable | Taxable | Exempt |
| **Conditionally No** | Taxable | Exempt | Exempt |
| **Never** | Exempt | Exempt | Exempt |

- The account's Tax Status can only ever *narrow* taxability toward exempt. Every combination
  resolves to a definite taxable/exempt outcome — no "unknown/error" result. A stable, no-defect
  lookup, carried forward verbatim. Consumed by SalesOrder's own tax-calculation pipeline; Accounts'
  side of the interface is simply "expose Tax Status for read."

## Server-Side Recomputation Requirement

Any value derived by this pipeline (finance charges, aging buckets, Total Owed, credit-limit
exposure, tax-exemption outcome) must be recomputed server-side at every consuming step, never
accepted as caller-supplied input. This is the standard fix for the "client-trusted total" class of
risk.

The legacy system does **not** consistently honor this today: the finance-charge ledger record is
created via two different code paths depending on the caller — a raw direct-insert that bypasses the
ledger entity's normal save logic entirely for the large-batch statement flow, versus the normal
entity-save flow for every other caller (ACC-VAL-047 in business-rules-and-validation.md). Any
validation or side-effect living in the ledger entity's own save logic silently does not run for the
batch-statement path. This structural risk — a raw-write bypass that skips whatever server-side
recomputation/validation the normal path enforces — is the concrete legacy failure mode this
requirement exists to prevent from recurring; it is carried forward to the risk register rather than
resolved here.

## Open Questions

- Whether Total Owed is updated synchronously at cross-module order-finalize time, or only by the
  nightly cron/finance-charge posting, was not confirmed — determines whether the credit-limit check
  can ever compare against a stale Total Owed for same-day orders finalized before the next cron run.
- The job-level credit-limit check's password-override/final-else branches were not read
  character-for-character; structural mirroring of the account-level branch is inferred from naming
  convention only.
- Which of the two finance-charge engines' rate-divisor behavior is the "intended" one is not
  resolved by the source — an open business decision, not resolved here.
- The Manual-frequency "always today" End Date versus the admin-editable End Date shown on the
  billing-cycle-date screen — confirmed to be two genuinely different values by design, but whether
  this is intentional or a latent UX bug was not determined.
- Whether the manual/batch engine's raw-ledger-insert bypass also has an equivalent in the cron
  path's credit-memo posting was not fully re-verified; the read range suggests the cron path always
  goes through the normal entity save path, but this was not independently confirmed against every
  invocation context.
