# AccountStatement — Business Rules & Validation

> Every rule gets a stable ID (e.g. <MOD>-RULE-001) so Stage 4's test docs can trace back to it.

Source: `docs_from_blueprint/module/AccountStatement/03-business-rules-and-validation.md`, itself
filtered from `docs_from_blueprint/module/Accounts/03-business-rules-and-validation.md` to the rules
that are statement/billing-tagged. Original rule IDs were `ACC-VAL-###`, re-prefixed below as
`STMT-RULE-###` for this module's own numbering; the source `ACC-VAL-###` ID is preserved in the
Statement column for cross-reference back to Accounts' own catalog.

| ID | Statement | Trigger | Scope | Severity | Confidence |
|---|---|---|---|---|---|
| STMT-RULE-001 (ACC-VAL-017) | Account authentication returns access denied unless a matching record is found for both the submitted username and password, compared via direct (non-parameterized, non-hashed) query matching. | B2B portal login | Username, Password | Hard block (auth denial) — flagged as a security item; the B2B login path is what a statement request from `requestfrom=b2bfrontend` ultimately relies on for its upstream authentication, per STMT-RULE-003 below. | Confirmed |
| STMT-RULE-002 (ACC-VAL-025) | The early-payment-discount text parser's gating condition (`checkallotheroffterms()`) is applied inconsistently between the full and quick statement entry points — confirmed behavioral drift, not resolved at the rule-catalog level. | Statement generation (full vs. quick) | Discount text display | Correctness — see `risks-and-open-questions.md` STMT-RISK-003 for the full writeup. | Confirmed |
| STMT-RULE-003 (ACC-VAL-028) | For statement requests originating from the B2B front-end, a listview permission check is skipped entirely — that path relies on its own upstream authentication instead of this permission gate. | Statement generation, B2B front-end request | N/A (permission gate) | Hard skip of a permission check — flagged as security-relevant, not confirmed exploitable from this rule alone; see `risks-and-open-questions.md` STMT-RISK-002 and `permissions.md` (centerpiece finding). | Confirmed |

## Rules observed but not independently numbered in the source catalog

The following are documented as confirmed findings elsewhere in Accounts' own spec (risk register,
financial-pricing-logic, outputs) but were not assigned their own `ACC-VAL-###` ID in the source
validation-rules pass — carried forward here as observed behavior, not as a numbered rule:

- **Finance-charge divisor divergence** — the statement engine's own `calculateFinanceCharge` divides
  by 365 for "Net 1" terms, 12 otherwise; a separate cron-path calculator always divides by 12 with no
  term branch. See `calculations.md` and `risks-and-open-questions.md` STMT-RISK-001.
- **Duplicated finance-charge-suppression threshold gate** — independently implemented in the
  statement engine and the separate cron-path calculator, a second, separately-drifting piece of the
  same calculation. See `risks-and-open-questions.md` STMT-RISK-004.
- **Quadruplicated payment-term date-boundary parsing logic**, one of the four implementations living
  inline inside the statement engine's own entry points — a change to any term's meaning must be
  replicated correctly across all four or aging buckets, due dates, and discount text will silently
  disagree. See `risks-and-open-questions.md` STMT-RISK-005.

## Open Questions

- **This catalog is a filtered subset of Accounts' own 112-rule catalog, not an independently
  re-swept rule set scoped specifically to statement code.** A dedicated re-sweep of
  `AccountStatement.php`'s 49 methods, `RunBatchStatement.php`'s full 1,333 lines, and the remaining
  satellite files against this module's own numbering (continuing the `STMT-RULE-###` series above)
  would likely surface additional rules not captured under Accounts' own general-purpose sweep. This
  gap is stated explicitly rather than filled in with invented rules — preserved from the source
  document's own honesty about its scope (`docs_from_blueprint/module/AccountStatement/
  03-business-rules-and-validation.md` §3.3).
