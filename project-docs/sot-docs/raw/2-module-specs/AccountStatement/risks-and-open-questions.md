# AccountStatement — Risks & Open Questions

Source: `docs_from_blueprint/module/AccountStatement/09-risks-and-open-questions.md`, itself filtered
from `docs_from_blueprint/module/Accounts/09-risks-and-open-questions.md` to statement-specific items,
plus the output-open-items carried from `outputs.md`. All items below are blueprint-sourced (Accounts'
own Pass 7/8), not fresh session findings — consistent with this module's sourcing note in
`module-overview.md`.

## Risk Register

| ID | Finding | Severity | Impact | Source |
|---|---|---|---|---|
| STMT-RISK-001 | Finance-charge rate-divisor divergence — `ApplyFinanceCharge.php` always divides by 12; `AccountStatement.php::calculateFinanceCharge` (line 4762) divides by 365 for "Net 1" terms, 12 otherwise. A genuine formula mismatch (not a rounding difference) — an account on "Net 1" terms receives a materially different finance-charge amount (roughly 30x) depending on which entry point computes it. Rated High specifically because, unlike a comparable SalesOrder finding where two implementations at least agree with each other, these two do not. | High | Customer-visible dollar figure on the statement is wrong/inconsistent depending on generation path; accounting-review-worthy historical exposure for any "Net 1" account with finance-charge history. | `calculations.md`; `docs_from_blueprint/module/Accounts/09-risks-and-open-questions.md` |
| STMT-RISK-002 | B2B permission-check bypass for statement requests — `isPermitted('AccountStatement', 'ListView')` is skipped entirely for statement requests flagged `requestfrom=b2bfrontend`; that path relies entirely on its own upstream authentication with no defense-in-depth at this layer. Flagged by the source validation-rules pass as security-relevant but not confirmed exploitable from that rule alone. | Medium | No defense-in-depth on this permission gate for the B2B request path — see `permissions.md` for the full writeup, this is that file's centerpiece finding. | `business-rules-and-validation.md` STMT-RULE-003; `permissions.md` |
| STMT-RISK-003 | Confirmed behavioral drift between full and quick statement views — whether `checkallotheroffterms()` gates the early-payment-discount text parser differs between `processAccountStatement()` and `processQuickAccountStatement()`; the "Quick" view can display a different discount outcome than the full view for the exact same account and payment term. | Medium | Customer-visible discount text can disagree between the two entry points for identical inputs. | `calculations.md`; `business-rules-and-validation.md` STMT-RULE-002 |
| STMT-RISK-004 | Duplicated finance-charge-suppression threshold gate — independently implemented in both finance-charge calculators, compounding STMT-RISK-001's divisor divergence with a second, separately-drifting piece of the same calculation. | Medium | Same class of risk as STMT-RISK-001 — a second point where the two calculators can silently disagree. | `calculations.md` |
| STMT-RISK-005 | Quadruplicated payment-term date-boundary parsing — one of four independent implementations lives inline inside the statement engine's own entry points; a term-meaning change must be replicated correctly across all four or aging/due-dates/discount-text will silently disagree. | Medium | Not a currently-observed production bug, but a genuine correctness risk for any future term-meaning change. | `calculations.md` |

## Open Questions

| ID | Question | Why It's Ambiguous | Current Best Guess | Needs Confirmation? |
|---|---|---|---|---|
| STMT-OQ-001 | What transition sets Statement Archive's Display Status flag to a display-eligible state? | No confirmed transition path was independently traced in the source session. | Unknown | Yes |
| STMT-OQ-002 | What are the exact trigger conditions for Statement Archive's storage-mode precedence (file-path pointer vs. inline HTML-content blob)? | Source documents "a file-path pointer, preferred, or a stored HTML-content blob fallback" with implicit precedence rather than an explicit field. | File-path preferred, blob as fallback (implicit, not independently traced in detail). | Yes |
| STMT-OQ-003 | Does any unique constraint exist today on the Batch Statement Snapshot's (statement-run, account) pair? | No confirmed unique constraint exists in the legacy schema per the source pass. | No — addressed structurally in the normalized-schema proposal (`entities-and-fields.md` §2.6). | Yes |
| STMT-OQ-004 | Is Output 5's legacy browser-add-on dependency still installed/functional, or has Output 6's server-side conversion superseded it? | Not confirmed in the source pass. | Unknown | Yes |
| STMT-OQ-005 | What are Output 7's fax-transmission internals (the actual gateway)? | The gateway is a top-level, non-Accounts script, not read in the source pass; its contract was inferred from the caller only. | Unknown — fire-and-forget cURL call per `createStatementForFax`, no independent success/failure verification confirmed. | Yes |
| STMT-OQ-006 | Does Output 3's batch-statement engine have a third divergent code path beyond the two confirmed archive-insert call sites? | The 1,334-line batch engine was only grepped, not read end-to-end. | Unknown — two separate archive-insert call sites suggest two distinct code paths not individually traced. | Yes |
| STMT-OQ-007 | Are there additional UI-only differences between Output 1 (full statement) and Output 2 (quick statement) beyond the confirmed CSV-behavior and discount-text differences? | Content-generation sharing and the CSV-behavior difference confirmed; a full line-by-line diff not performed. | Unknown | Yes |
| STMT-OQ-008 | Is Output 9's fixed three-month window intentional, or a missing feature? | No request parameter or config toggle found for the date range. | Unknown (out of this module's core scope per `module-overview.md`, carried here for completeness since it lives in the same source inventory). | Yes |
| STMT-OQ-009 | Are the two archive-content maintenance scripts (that rewrite stored archive HTML directly) still invoked, or dead code? | Confirmed to exist and rewrite archived HTML; whether either is still invoked (cron, manual, or dead) was not confirmed. | Unknown | Yes |

<!-- Anti-hallucination discipline: nothing here should be silently resolved by guessing in
     downstream stages. Every item stays open until explicitly answered. -->

## What a dedicated re-sweep would need to confirm

This risk register is a filtered subset of Accounts' own 18-item register, not an independently
re-swept register scoped specifically to the ~10,900 lines of statement-specific code (same caveat as
`business-rules-and-validation.md`'s Open Questions). A dedicated Pass-7-style re-verification of
`AccountStatement.php`'s full 49 methods and `RunBatchStatement.php`'s full 1,333-line orchestration
engine would very plausibly surface additional findings — stated as a follow-up need, not filled in
speculatively.
