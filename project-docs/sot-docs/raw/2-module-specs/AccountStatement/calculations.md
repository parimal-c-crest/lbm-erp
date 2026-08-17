# AccountStatement — Calculations

> Keep this file even if this module has no computed/derived logic — state that explicitly below
> rather than deleting the file. A missing file can't be told apart from "nobody got to it yet";
> an explicit "no calculation logic exists in this module" statement can't be. See
> `_deviations-from-original-template.md` in this folder for why.

Source: `docs_from_blueprint/module/AccountStatement/05-financial-pricing-logic.md`, traced to
`docs_from_blueprint/module/Accounts/09-risks-and-open-questions.md` (High findings #3 and #10) and
`docs_from_blueprint/module/Accounts/04-financial-pricing-logic.md` §1.3-1.4, ultimately
`blueprint/module/Accounts/04-financial-pricing.md` (Pass 4) and `07-risk-findings.md`/
`08-consolidation-review.md` (Pass 7/8).

## Applicability

Applicable. The balance and aging figures a statement displays (Current, 1/2/3/3+ Billing Cycle Past
Due, Total Owed) are **owned and computed by Accounts itself**, not by this module — AccountStatement
reads and renders them (see `module-overview.md` scope boundary). The one calculation genuinely
performed *inside* the statement engine, with its own confirmed defect, is the finance charge.

## Calculation Pipeline

### Finance-charge calculation — a confirmed formula mismatch, not a rounding difference

Two independent implementations exist, and they disagree:

- **`ApplyFinanceCharge.php`** (the manual/batch UI path) always divides by 12:
  `(sumOfPastDue × financeChargePercent / 100) / 12`, with no term-based branch anywhere in the file.
- **`AccountStatement.php::calculateFinanceCharge`** (line 4762, the statement engine's own path)
  instead divides by 365 specifically for accounts on "Net 1" terms, and by 12 otherwise.

**This is a genuine formula mismatch, not merely a difference in when a threshold gate applies** — an
account on "Net 1" terms receives a materially different (**roughly 30x smaller** for the
batch-computed value vs. the cron's daily-prorated value) finance-charge amount depending on which of
the two entry points computes it. Rated **High** severity in Accounts' own risk register specifically
because, unlike a comparable duplicated-formula finding in SalesOrder's own blueprint (rated Medium
because its two implementations at least currently agree), these two do **not** currently agree with
each other. Full detail: `risks-and-open-questions.md` STMT-RISK-001.

**Inputs**: sum of past-due balance, finance-charge percentage (`Annual Finance Charge Percentage`),
account payment terms.
**Formula (as implemented today, two disagreeing versions)**:
- `ApplyFinanceCharge.php`: `(sumOfPastDue × annualPercent / 100) / 12`, always.
- `AccountStatement.php::calculateFinanceCharge`: `(sumOfPastDue × annualPercent / 100) / 365` for
  "Net 1" terms; `/ 12` for every other term.
**Output**: finance-charge dollar amount added to the statement/billing cycle.
**Rounding behavior**: not documented in the source pass — not confirmed either way.

### Duplicated suppression threshold

A second, independently-implemented piece of the same calculation — the finance-charge-suppression
threshold gate (whether a balance below a minimum amount skips the charge entirely) — is separately
implemented in both `ApplyFinanceCharge.php` and `AccountStatement.php::calculateFinanceCharge`,
compounding the divisor divergence with a second, separately-drifting piece of the same calculation.
See `risks-and-open-questions.md` STMT-RISK-004.

### Quadruplicated payment-term date-boundary parsing

Payment-term date-boundary logic (used for aging-bucket assignment, invoice due dates, and the
early-payment-discount text shown on a statement) is implemented **four separate times**: in
`checkTerm()`, `getLastXPeriod()`, `calculateduedate()`, and an inline variant embedded directly inside
`Accounts.php::processAccountStatement()`/`processQuickAccountStatement()`. A change to any term's
meaning must be replicated correctly across all four independent implementations, or the account's
aging buckets, invoice due dates, and discount text will silently disagree with each other. Not a
currently-observed production bug, but a genuine correctness risk this module's rewrite should
consolidate into one shared function from the start. See `risks-and-open-questions.md` STMT-RISK-005.

### Behavioral drift in the discount-text gate

`processAccountStatement()` and `processQuickAccountStatement()` diverge on whether
`checkallotheroffterms()` gates the early-payment-discount text parser before it runs — the "Quick"
statement view can compute and display a different discount outcome than the full Statement view for
the exact same account and payment term. Confirmed behavioral drift, not resolved in the source. See
`risks-and-open-questions.md` STMT-RISK-003.

## Server-Side Recomputation Requirement

Any finance-charge or aging value used on a statement must be recomputed server-side at the point of
generation — no confirmed instance of a caller-supplied finance-charge or balance figure being trusted
was found, but the deeper issue documented above is not "client-trusted total," it is that **the
server itself has two disagreeing implementations**. The standard "recompute server-side, never trust
caller input" fix does not close this defect on its own — what's required, per
`build-guidance.md`, is a single canonical server-side implementation, used identically by every
entry point (manual/batch UI, cron, statement engine), replacing today's three independently-drifting
copies. All three findings above (divisor divergence, duplicated threshold, quadruplicated
term-parsing) point to this same root cause: no single shared finance/term-calculation service exists
today — every entry point implements its own copy.
