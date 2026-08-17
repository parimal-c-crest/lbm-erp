# Pricebooklevel300 — Business Rules & Validation

> Every rule gets a stable ID (e.g. <MOD>-RULE-001) so Stage 4's test docs can trace back to it.

> Source: `docs_from_blueprint/module/Pricebooklevel300/03-business-rules-and-validation.md`, itself condensed
> from `blueprint/module/Pricebooklevel300/02-validation-rules.md` (Pass 2), re-verified in
> `07-risk-findings.md` (Pass 7). The source catalogs **34 numbered rules** (originally `PBL300-VAL-001` through
> `PBL300-VAL-034`); IDs are reassigned below to this template's `PBL300-RULE-###` scheme, preserving original
> order and content 1:1 — no rule dropped, no rule merged or split. The original `PBL300-VAL-###` ID is kept in
> the Statement text (in parentheses) for cross-reference back to the source.
>
> **Headline finding**: this module's own real, actively-exercised write surface carries **12 confirmed live
> SQL-injection points across 6 files** — the plan's soft-delete, both of the everyday save path's raw-SQL
> blocks, all three of the rule-duplication feature's raw-SQL statements, a rule-type priority reorder, and
> both raw-SQL blocks in the account-apply flow. Two of the rule-duplication feature's own statements are
> additionally structurally broken independent of any security concern. The coupon subsystem is consistently,
> correctly parameterized throughout — a genuine, if narrow, clean corner of an otherwise widely-injectable
> module.

| ID | Statement | Trigger | Scope | Severity | Confidence |
|---|---|---|---|---|---|
| PBL300-RULE-001 | (PBL300-VAL-001) The module-specific save hook has an empty function body — no validation, no side effects. | Every save | N/A | Not a block | Confirmed |
| PBL300-RULE-002 | (PBL300-VAL-002) The plan's soft-delete update splices the record id directly into the query string with no placeholder at all; a trailing bind-array argument is passed but binds against nothing. | Every plan deletion | Plan's soft-delete flag | Confirmed SQL injection | Confirmed |
| PBL300-RULE-003 | (PBL300-VAL-003) The CSV export query builder targets the rule sub-entity's own table (not this module's own plan-header table), scoped by a *different* module's own field-permission check, and additionally embeds a session-stored value raw-concatenated into a `LIKE` clause. | ListView "Export" action | CSV export feature; cross-module field-permission scoping | Cross-module export-target mismatch (structural defect); exploitability of the session value not confirmed end-to-end | Confirmed (structure); Inferred (end-to-end exploitability) |
| PBL300-RULE-004 | (PBL300-VAL-004) The entity class declares a table-index key that does not match the live table's actual name — a dead/incorrect schema declaration. | N/A (static declaration) | N/A | Not a security finding — schema drift | Confirmed |
| PBL300-RULE-005 | (PBL300-VAL-005) The entity class declares a "group relation" table that does not exist in the live database at all. | N/A (static declaration) | Whatever generic entity machinery consumes this declaration (not traced) | Not a security finding — schema drift, functional impact unknown | Confirmed |
| PBL300-RULE-006 | (PBL300-VAL-006) The entity save itself runs with no presence/format check on the plan name visible in this write path — whatever the generic entity-save machinery enforces (not traced) is the only protection. | Every save | Plan header | Not a hard block in this path | Confirmed |
| PBL300-RULE-007 | (PBL300-VAL-007) The header-field bulk update string-interpolates every caller-supplied value (pricing level, times, penny-round, plan type, description, etc.) directly into the SQL statement, called with an empty bind array. | Every plan save | Plan header's pricing/description/type columns | Confirmed SQL injection — the module's everyday save action | Confirmed |
| PBL300-RULE-008 | (PBL300-VAL-008) The dynamic-field-discovery step (regex-scanning every request key for a field-name-plus-rule-id shape) has no allow-list of recognized field-name prefixes and no bound on how many/which rule ids a single save request can target. | Every save from the rule-editing grid | All discovered rule rows | Not a hard block — feeds directly into PBL300-RULE-010 below | Confirmed |
| PBL300-RULE-009 | (PBL300-VAL-009) The recompute-on-change block performs no numeric-range validation before using an edited value in a division — an unguarded divide-by-zero at exactly one specific input value. | Editing a rule's GP% field to exactly 100 | The plan's weighted-average GP% recompute | Live code defect; no confirmed live-data trigger on the blueprint's own dev snapshot | Confirmed (code shape); Inferred (no live-data trigger) |
| PBL300-RULE-010 | (PBL300-VAL-010) The per-rule bulk update is built by raw string-concatenating **every** edited field's value (including a format-transformed but still-concatenated-raw date) into the SQL statement, executed with **no bind-array argument at all**. | Every rule edited on the plan's edit screen | Every editable rule column | Confirmed SQL injection — the module's own everyday, most-used save action | Confirmed |
| PBL300-RULE-011 | (PBL300-VAL-011) The final redirect block computes return-navigation variables from caller input but the subsequent redirect is unconditional and hardcoded, never referencing the just-computed variables — dead code. | Every save | N/A — confirms dead-code finding | Not a block | Confirmed |
| PBL300-RULE-012 | (PBL300-VAL-012) The delete entry script performs no validation on the caller-supplied record id before passing it through to the injectable soft-delete (PBL300-RULE-002). | Every delete action | Plan's soft-delete flag | See PBL300-RULE-002 | Confirmed |
| PBL300-RULE-013 | (PBL300-VAL-013) The cross-module account cleanup triggered on plan delete has a correctly-parameterized own lookup and a correctly-parameterized write, though its own read scans every account row unconditionally rather than scoping to only accounts that actually reference the deleted plan. | Every delete action | Every account's plan-assignment column | Clean — a real, working cross-module cleanup; the unscoped scan is an efficiency concern, not a security one | Confirmed |
| PBL300-RULE-014 | (PBL300-VAL-014) An ajax endpoint under this module's own route instantiates an entirely different module's entity class, loads a record by a caller-supplied id, sets an arbitrary field named by caller input to a caller-supplied value with **no allow-list on which column can be targeted**, and saves it against the *other* module. | Direct URL/ajax construction (no confirmed UI caller anywhere in this module) | An arbitrary record's arbitrary column, belonging to a completely different module | Not a SQL injection in this file itself, but a confirmed wrong-entity-class write — this module's single highest-severity finding | Confirmed |
| PBL300-RULE-015 | (PBL300-VAL-015) Both of the module's two rule-list rendering surfaces use correctly parameterized queries throughout their own direct SQL. | Every load of a plan's rule-list view | Read-only | Clean | Confirmed |
| PBL300-RULE-016 | (PBL300-VAL-016) One of the two rule-list rendering surfaces is wired to the UI under an "Account Settings" label but its actual body duplicates the other surface's rule-list query/render logic wholesale — it contains no account-settings logic of any kind. | Opening the "Account Settings" modal | N/A | Not a security finding — duplicate-code / mislabeled-action defect | Confirmed |
| PBL300-RULE-017 | (PBL300-VAL-017) The feature's own source-rule lookup query references an undefined table alias in its `WHERE` clause (the table is aliased one way, but a different, undeclared alias is referenced) — this statement raises a SQL error on every execution. | Every "Duplicate Rule" submission | The source-rule lookup this entire feature depends on | Structurally broken — not a security finding; likely prevents the feature's own primary read from ever succeeding | Confirmed |
| PBL300-RULE-018 | (PBL300-VAL-018) A follow-up per-duplicated-row field-patch update begins its `SET` clause with a stray leading comma — invalid SQL syntax, a second independent break in the same feature. | Every duplicated-rule row's post-save field patch (if reached at all) | Rule rows | Structurally broken — a second independent SQL-syntax defect | Confirmed |
| PBL300-RULE-019 | (PBL300-VAL-019) The query populating the "Select Sales & Promotions Book(s)" picker dropdown raw-concatenates a caller-supplied plan-type value directly into its `WHERE` clause, called with an empty bind array — and this query runs on **every open of the dialog**, not only on submit. | Every open of the "Duplicate PB Rule" modal | Read-only, but reachable on every dialog load | Confirmed SQL injection | Confirmed |
| PBL300-RULE-020 | (PBL300-VAL-020) A success-confirmation response echoes a caller-supplied value unescaped inside an inline `<script>` block. | Every successful "Duplicate Rule" submission | Client-side, reflected | Confirmed reflected XSS | Confirmed |
| PBL300-RULE-021 | (PBL300-VAL-021) A drag-reorder save loops over caller-supplied id segments and raw-interpolates each one directly into a per-id `UPDATE`, called with an empty bind array despite the underlying API supporting real parameter binding. | Every "Change Rule Types Priority" drag-reorder save | Rule type priority ordering | Confirmed SQL injection | Confirmed |
| PBL300-RULE-022 | (PBL300-VAL-022) Both coupon-modal render surfaces' own list queries are correctly parameterized. | Every open of either coupon modal | Read-only | Clean | Confirmed |
| PBL300-RULE-023 | (PBL300-VAL-023) Adding a coupon delegates to a shared save function whose every internal query uses real parameter binding. | Adding a new coupon | Coupon table | Clean | Confirmed |
| PBL300-RULE-024 | (PBL300-VAL-024) Editing an existing coupon uses a correctly parameterized update. | Editing a coupon | Coupon table | Clean | Confirmed |
| PBL300-RULE-025 | (PBL300-VAL-025) Deleting a coupon correctly parameterizes its id/rule-id match predicates, but raw-interpolates a session-sourced (not request-sourced) user-id value into the same statement — low risk, but inconsistent with the statement's own use of placeholders elsewhere. | Deleting a coupon | Coupon's soft-delete flag | Low risk (session-sourced, not caller-controlled) but not using the available bind-array slot for consistency | Confirmed |
| PBL300-RULE-026 | (PBL300-VAL-026) The coupon-list-fragment render builds an inline HTML list, embedding a stored coupon code, stored comments, and a caller-supplied rule id directly into JS-attribute strings with **no escaping of any kind**, even though the underlying `SELECT` feeding this render is itself correctly parameterized. | Every render of a rule's coupon list | Client-side | Confirmed stored + reflected XSS — not a SQL-injection finding | Confirmed |
| PBL300-RULE-027 | (PBL300-VAL-027) The mass-apply-to-accounts picker's own plan-name lookup, run once per selected plan id, raw-concatenates each id directly into its `WHERE` clause with an empty bind array. | Every open of the mass-apply-to-accounts picker | Read-only | Confirmed SQL injection | Confirmed |
| PBL300-RULE-028 | (PBL300-VAL-028) Two further queries in the same picker each embed the *result* of PBL300-RULE-027's own already-injectable query, plus other raw-concatenated values, into their own `WHERE`/`NOT IN` clauses. | Same trigger as above | Read-only | Confirmed SQL injection — compounded, reusing an already-injectable fragment as further input | Confirmed |
| PBL300-RULE-029 | (PBL300-VAL-029) The account-apply save handler's own account-detail lookup joins every element of a caller-supplied array with commas and splices the result directly into an `IN (...)` clause with no per-element escaping/casting. | Applying selected accounts to a plan | Read (feeds the write below) | Confirmed SQL injection — the classic "IN (...) built from a raw request array" shape | Confirmed |
| PBL300-RULE-030 | (PBL300-VAL-030) The same save handler's plan-name lookup (run in both its "add" and "remove" code paths) repeats the identical raw-concatenation pattern as PBL300-RULE-027. | Applying/removing selected accounts | Read-only | Confirmed SQL injection — 2 statement sites within this file | Confirmed |
| PBL300-RULE-031 | (PBL300-VAL-031) Both the "add" and "remove" code paths' final write to the account's plan-assignment column are correctly parameterized. | Same trigger as above | Account's plan-assignment column | Clean — the actual write is parameterized even though the reads feeding it are not | Confirmed |
| PBL300-RULE-032 | (PBL300-VAL-032) The duplicate-name-check endpoint used at plan-creation time is correctly parameterized throughout. | Every duplicate-name check on plan creation | Read-only | Clean | Confirmed |
| PBL300-RULE-033 | (PBL300-VAL-033) Three files under this module's own directory contain correctly-parameterized SQL, but that SQL writes exclusively to a *different* module's own junction tables, with those same files' own internal redirects targeting that other module by name, and no caller of any of the three found anywhere in this module's own UI or the wider repo. | Direct URL access only (no confirmed UI caller) | A different module's own junction tables | Not itself a SQL-injection finding — a structural "wrong module, unreachable from this module's UI" finding | Confirmed |
| PBL300-RULE-034 | (PBL300-VAL-034) An error-message request parameter is reflected directly into the rendered template, with no encoding/escaping wrapper visible in this file and the underlying rendering layer's own auto-escaping behavior not traced. | Any mass-delete/mass-change-owner action that surfaces a permission error | Client-side, reflected | Informational — potential reflected-XSS surface pending confirmation of the rendering layer's own escaping behavior | Confirmed (call shape); Inferred (exploitability) |

<!-- Severity: hard block / warning / auto-remediation / not a block (side-effect only)
     Confidence: Confirmed (explicit source) / Inferred (deduced, needs verification) -->

## Open Questions

- Whether an orphaned rule row left behind by an unguarded plan delete (PBL300-RULE-002) can ever be
  "re-attached" to pricing if a new plan is later created with the same name — the name-based rule-to-plan link
  makes this a genuine, code-confirmed possibility, but whether it has ever happened on live production data
  was not testable from the source blueprint's dev-snapshot evidence alone (`docs_from_blueprint/module/Pricebooklevel300/04-status-workflow.md`
  §4.10).
- Whether the CSV export's field-permission-scope mismatch (PBL300-RULE-003) causes a hard error, a
  silently-wrong-but-non-erroring export, or something else entirely — depends on the shared export handler's
  own behavior when the requested field-permission scope doesn't match the requesting module, not traced by the
  source blueprint (`06-outputs.md` §6.4).
- Whether the "Account Settings"-labeled rule-list duplicate (PBL300-RULE-016) confuses real users in
  production, or is well-understood tribal knowledge — not resolvable from static code alone.
- Whether the mass-duplicate-rule picker's broken primary read (PBL300-RULE-017) has ever been
  noticed/reported as a non-functional feature, or whether the "Duplicate Rule" action is rarely enough used
  that the break has gone unnoticed — not resolvable from static code alone.
- Whether the ListView's own error-message reflection (PBL300-RULE-034) is actually exploitable, pending
  confirmation of the underlying template-rendering layer's own auto-escaping behavior — not traced by the
  source blueprint.

(`03-business-rules-and-validation.md` §3.13; `09-risks-and-open-questions.md` §9.3)
