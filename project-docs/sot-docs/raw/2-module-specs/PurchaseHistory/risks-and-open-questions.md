# PurchaseHistory — Risks & Open Questions

Source: `docs_from_blueprint/module/PurchaseHistory/09-risks-and-open-questions.md`, itself traced to
`blueprint/module/PurchaseHistory/07-risk-findings.md` and `08-consolidation-review.md`. 13 findings total (1
Critical, 0 High, 3 Medium, 9 Low/Informational).

## Risk Register

| ID | Finding | Severity | Impact | Source |
|---|---|---|---|---|
| PH-RISK-001 | A confirmed, unmitigated SQL injection in the module's own entity-class edit-save path — the edit-branch `UPDATE` is built from raw string concatenation of a request-controlled row identifier, called with no bind-array argument at all. Reachable via two independent, everyday-path routes: the ordinary edit-form submission, and the inline-edit ajax endpoint. This is the twelfth consecutive module in this blueprint-extraction series confirmed to carry at least one live SQL injection, and the same systemic pattern independently confirmed in the sibling PurchaseLineItem module's own entity class. | Critical | Row(s) in `vtiger_purchasehistory` can be widened or redirected by a crafted `UPDATE ... WHERE` payload via two ordinary-path routes. Mitigation for a new implementation: R3 (security-by-construction) plus removing the general-purpose edit surface both reachability paths depend on — the vulnerable hook does not exist in the new design at all, replaced by one authoritative, parameterized-by-construction aggregator service. | `blueprint/module/PurchaseHistory/07-risk-findings.md` §1.1 |
| PH-RISK-002 | `LoadList.php`'s own branch for this module performs a two-column insert into a 13-column table, silently discarding 11 columns' worth of data on any row it creates. | Medium | MySQL would either reject this outright (column-count mismatch under strict mode) or silently populate only the first two columns with the remainder left at defaults. Whether this branch is ever actually reached by any live caller was not confirmed (a wider search, e.g. JS/ajax call sites, was not performed). | `blueprint/module/PurchaseHistory/07-risk-findings.md` PH-R-002 |
| PH-RISK-003 | A shared, framework-level "is this line code in use" guard includes an unescaped, string-concatenated `SELECT` against this module's own table among five other tables it checks. | Medium | A shared-framework concern, not a module-owned write path; whether its own parameter is ever directly sourced from request input was not traced to its ultimate origin. | `blueprint/module/PurchaseHistory/07-risk-findings.md` PH-R-005 |
| PH-RISK-004 | `LoadList.php`'s own request-derived filter parameter reaches shared list-view/search framework code via a non-parameterized query call, not traced to completion. | Medium | The same unresolved shared-framework residual flagged for every prior module in this series. | `blueprint/module/PurchaseHistory/07-risk-findings.md` PH-R-006 |
| PH-RISK-005 | A structurally-incomplete leftover Campaigns-pattern related-list handler pair (`CallRelatedList.php`/`updateRelations.php`), confirmed to never touch this module's own table. | Low/Informational | No live business-logic impact confirmed. | `08-consolidation-review.md` §5 |
| PH-RISK-006 | A misplaced cron file (`fillinventorycost.php`) contributing zero business logic to this module despite living in its directory; its own vulnerable-SQL-shape is real but entirely out of this module's own scope. | Low/Informational | Source-tree/code-organization issue, not a PurchaseHistory business-logic or security issue in itself; see `integrations.md`. | `08-consolidation-review.md` §5 |
| PH-RISK-007 | A commented-out, never-executed fourth write candidate found in the PurchaseOrder module's own `EditView.php` file. | Low/Informational | Dead code; hints at an abandoned "correct PurchaseHistory on PO line deletion" feature. | `08-consolidation-review.md` §5 |
| PH-RISK-008 | Clean/positive finding: all three confirmed live accumulator writers' own SQL is fully parameterized and their formula is byte-for-byte identical across all three. | Low/Informational (positive) | No divergence risk from the confirmed live writers today; the risk is the latent two-near-verbatim-duplicate-functions drift potential (see `calculations.md`). | `08-consolidation-review.md` §5 |
| PH-RISK-009 | Clean/positive finding: this module's own sort-order/order-by session keys correctly match what its own list view writes, unlike a confirmed session-key-mismatch bug in SalesHistory's own equivalent. | Low/Informational (positive) | No functional defect. | `08-consolidation-review.md` §5 |
| PH-RISK-010 | The soft-delete flag is confirmed genuinely unexercised (0 of 644 rows) on the source dev snapshot; the code path itself is confirmed present and functional. | Low/Informational | Whether this reflects genuine production behavior or a dev-data artifact is unresolved. | `08-consolidation-review.md` §5 |
| PH-RISK-011 | Clean negative finding: no dangerous dynamic-code-execution pattern exists anywhere in the module. | Low/Informational (positive) | N/A | `08-consolidation-review.md` §5 |
| PH-RISK-012 | Clean negative finding: the entity class's own declared table name is confirmed accurate against the live database. | Low/Informational (positive) | N/A | `08-consolidation-review.md` §5 |
| PH-RISK-013 | Clean negative finding: neither of the module's own live write paths instantiates the wrong entity class — the specific pattern this blueprint's own extraction was asked to check for, confirmed absent here, unlike a confirmed instance of exactly this bug in the sibling PurchaseLineItem module's own inline-edit endpoint. | Low/Informational (positive) | N/A | `08-consolidation-review.md` §5 |

**Highest-priority item**: PH-RISK-001 (the Critical SQL injection) should be triaged for prompt legacy-system
remediation given its ordinary-path, two-route reachability — not deprioritized the way a
specialized-endpoint-only finding might be. This module's own inline-edit endpoint correctly targets its own
entity class throughout (unlike some other modules in this series, where the biggest risk was a correctness
bug competing for attention with a confirmed injection) — meaning PH-RISK-001 is unambiguously this module's
own most consequential finding, with no competing correctness bug of comparable severity. (`09-risks-and-
open-questions.md` §9.4)

## Open Questions

| ID | Question | Why It's Ambiguous | Current Best Guess | Needs Confirmation? |
|---|---|---|---|---|
| PH-OQ-001 | Does Product Number's confirmed zero-match rate against the Products entity's own product-code field reflect a genuine production-data business-key mismatch, or is it purely a dev/test-fixture artifact of the snapshot the blueprint was extracted against? | The zero-match finding is confirmed structurally (no FK), but its business cause is unknown. | Unknown — no guess offered | Yes |
| PH-OQ-002 | What is the Purchase History Group Relation entity's "Group Name" field actually used for? | No code site found in the source blueprint that writes to this table. | Unknown — no guess offered | Yes |
| PH-OQ-003 | Does the soft-delete flag being unset on every one of the 644 live rows reflect genuine production behavior (rows are effectively never deleted by end users) or a dev-data artifact? | Code path confirmed functional; usage pattern unconfirmed. | Unknown — no guess offered | Yes |
| PH-OQ-004 | Does the shared soft-delete framework helper (`DeleteEntity()`) perform any existence/reference check before soft-deleting a row? | Out of the source blueprint's own scope — a shared-framework-helper boundary. | Unknown — no guess offered | Yes |
| PH-OQ-005 | Does an undelete/restore mechanism for the soft-delete flag exist anywhere outside this module's own files? | The source blueprint's own grep for this was module-scoped only, not a repo-wide confirmation. | Likely no (none found within module scope), but not repo-wide confirmed | Yes |
| PH-OQ-006 | Is a backdated purchase-order correction ever intentionally meant to bucket into a past week's row, rather than always landing in the current calendar week's row as all three confirmed writers' own current-week-lookup convention implies? | A business-rule question, not resolvable from static code reading alone. | Current best guess: always lands in the current calendar week (per confirmed writer behavior), but this may not match business intent | Yes |
| PH-OQ-007 | Does the accumulator formula's confirmed simplicity (two counters, no absolute-value wrapping) relative to SalesHistory reflect a genuine business difference (purchase activity has no lost-sale/transfer equivalent) or a never-built feature? | Not resolvable from static code reading alone. | Unknown — no guess offered | Yes |
| PH-OQ-008 | What happens on an unrecognized transaction-code value at any of the three confirmed writer call sites? | None of the three carries a final catch-all branch. | Likely leaves `buy_qty`/`return_qty` unset on a brand-new row, but not traced to its ultimate save-time effect | Yes |
| PH-OQ-009 | Has the migration script's own absolute-value divergence ever produced a discrepancy on a live row it touched? | Requires either a live negative-value row or a controlled reproduction; not confirmed in the source blueprint. | Unknown — no guess offered | Yes |
| PH-OQ-010 | Is the return-quantity counter ever legitimately negative in this business domain? | A return recorded as a negative quantity would itself be an unusual convention; not resolved from static reading alone. | Unknown — no guess offered | Yes |
| PH-OQ-011 | Does any code outside the source repository's own module tree (external BI tool, direct-database reporting connection, or a since-removed report file) read this module's own table? | Not determinable from a static repo grep alone. | Unknown — no guess offered | Yes |
| PH-OQ-012 | Does the complete absence of a report-layer dependency reflect a genuine business decision (purchase-activity rollups were never built into reporting) or an incomplete/abandoned feature? | Not resolvable from static code reading alone. | Unknown — no guess offered | Yes |

<!-- Anti-hallucination discipline: nothing here should be silently resolved by guessing in
     downstream stages. Every item stays open until explicitly answered. -->

(`docs_from_blueprint/module/PurchaseHistory/09-risks-and-open-questions.md` §9.1-9.4)
