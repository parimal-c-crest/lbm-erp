# MPLPricePlan — Business Rules & Validation

> Every rule gets a stable ID (e.g. <MOD>-RULE-001) so Stage 4's test docs can trace back to it.

Source: `docs_from_blueprint/module/MPLPricePlan/03-business-rules-and-validation.md`, cross-checked
against `blueprint/module/MPLPricePlan/02-validation-rules.md` for the Confidence column. The blueprint
catalogs 29 numbered business/validation rules, extracted from a full read of the module's entity class,
save-orchestration, delete, Rule Section, and ajax-handler code. Original rule IDs (MPL-VAL-001–029) are
mapped 1:1 to `MPL-RULE-001`–`MPL-RULE-029` below; the mapping is preserved so either ID can be used to
cross-reference the source blueprint.

**Severity legend**: *Hard block* = the operation is refused/rejected entirely; *Guard* = a precondition
genuinely gates a state change or side effect; *SQL injection* = a confirmed, unmitigated
raw-SQL-construction vulnerability, catalogued here as a rule about the module's current
query-construction behavior, not a business rule per se; *Functional defect* = the code does not do what
its own name/purpose implies, independent of any security concern; *Not a block* = documents an absence
of enforcement, a data-flow fact, or a dead-code observation.

**Headline finding, preserved from the source blueprint**: this module has the widest, least-mitigated
SQL-injection surface of any module blueprinted in this series so far — 14 of the 29 catalogued rules
document a confirmed SQL injection, spanning nearly every file with a real write path.

| ID | Statement | Trigger | Scope | Severity | Confidence |
|---|---|---|---|---|---|
| MPL-RULE-001 | The module-specific save hook other modules use for post-save side effects/validation is an empty function body — no validation, no side effects. | Every save | N/A | None enforced | Confirmed |
| MPL-RULE-002 | A required-fields declaration exists but is empty — whatever generic save-time required-field check (if any) runs off this declaration enforces zero fields from it. | Every save | N/A | None are hard blocks from this declaration | Confirmed |
| MPL-RULE-003 | The ListView sort-by field declaration lists two placeholder column names that do not exist on the plan header table — sorting by either would error or silently sort by nothing. | Sorting the ListView by a declared sort field | ListView sort behavior | Functional defect, not a security finding | Confirmed |
| MPL-RULE-004 | The CSV-export query builder returns a literal, incomplete placeholder string concatenated with a `WHERE` clause — not valid SQL against any real table or column list. | ListView "Export" action | CSV export feature | Functional defect — the export feature is structurally non-functional, not merely thin | Confirmed |
| MPL-RULE-005 | The entity save itself runs with no presence/format check on the plan's own required name field visible in the save script — whatever the generic entity-save framework enforces (not traced in the source blueprint) is the only protection. | Every plan save | MPL Price Plan header | None are hard blocks in this file | Confirmed |
| MPL-RULE-006 | The rule-scope update loop trusts a caller-submitted loop-count with no upper bound and no check that it matches the number of rule-id keys actually present — a mismatched count silently produces malformed downstream queries rather than being rejected. | Every save from the Rule Section UI | All rule-scope tables | Not a hard block — malformed input flows through unchecked | Confirmed |
| MPL-RULE-007 | A rule row's start/end date update is built by raw string concatenation of caller-submitted date values and the rule id — no escaping, no bind parameters, no date-format validation. | Every rule row saved | Rule start/end date | **Confirmed SQL injection** | Confirmed |
| MPL-RULE-008 | The linecode-scope table's row-clearing delete is raw-concatenated on the (caller-derived) rule id, no bind parameters. | Every rule row saved | Rule Linecode Scope | **Confirmed SQL injection** | Confirmed |
| MPL-RULE-009 | For each selected linecode, the corresponding insert raw-concatenates both the rule id and the linecode id, no bind parameters. | Every rule row saved with ≥1 linecode selected | Rule Linecode Scope | **Confirmed SQL injection** | Confirmed |
| MPL-RULE-010 | The identical delete+re-insert pattern (MPL-RULE-008/009) is repeated verbatim for the Rule Subline Scope table. | Every rule row saved | Rule Subline Scope | **Confirmed SQL injection** (delete + insert) | Confirmed |
| MPL-RULE-011 | The identical pattern is repeated for the Rule Division Scope table. | Every rule row saved | Rule Division Scope | **Confirmed SQL injection** (delete + insert) | Confirmed |
| MPL-RULE-012 | The identical pattern is repeated for the Rule Product Scope table. | Every rule row saved | Rule Product Scope | **Confirmed SQL injection** (delete + insert) | Confirmed |
| MPL-RULE-013 | A row-count function call for each of the four scope dimensions is invoked on a possibly-unset input value with no presence guard — a rule save with zero scope selections for any one dimension can hard-error the entire save request depending on the runtime's exact null-handling behavior for that call shape. | Saving a rule with no linecode/subline/division/product selected | Whole save request | Not a block — a live crash risk, not a rejection | Confirmed (call shape); Inferred (exact fatal-vs-warning runtime behavior not empirically tested, per no-destructive-testing constraint) |
| MPL-RULE-014 | The pricing-level grid build reads caller-submitted take/formula/value values with no validation that `take` is one of the known cost bases, that `formula` is one of the six known operations, or that `value` is numeric — any string submitted for any of the three is accepted and persisted as-is. | Every plan save | The plan's per-location formula grid | Not a block — unvalidated free-text into a field the pricing engine later interprets structurally | Confirmed |
| MPL-RULE-015 | The UOM-type update is raw-concatenated on both the submitted value and the plan id, no bind parameters, no allow-list check against the 12 known UOM-type keys. | Every save where a UOM type is submitted | Plan UOM Type | **Confirmed SQL injection** | Confirmed |
| MPL-RULE-016 | A redundant, unparameterized second write of created-date/created-by on a newly-created plan duplicates work the entity's own save call should already have done — the values themselves are not caller-controlled (system-derived), so injection risk is low, but the pattern (raw concatenation, no bind parameters) is preserved. | Every new-plan save | Plan Created Date/Created By | Low injection risk (not directly caller-controlled), but an unparameterized, redundant write | Confirmed |
| MPL-RULE-017 | The final redirect logic computes return-navigation values from the request but then unconditionally overwrites them before ever reading them again — dead code, not a security or data-integrity issue. | Every save | N/A | Confirms a dead-code finding, no functional impact | Confirmed |
| MPL-RULE-018 | The standard vtiger delete-action slot performs no delete of any kind — it is an inert include stub. The module's real delete path lives entirely in the ajax layer. | The standard `action=Delete` URL for this module | N/A | Structural absence, not a validation gap | Confirmed |
| MPL-RULE-019 | **The module's single most anomalous file**: a standalone delete-by-id script deletes from a table belonging to a completely unrelated module, keyed by an unescaped, unbound caller-supplied id — raw string-concatenated, no bind parameters, no existence check, no permission check beyond whatever session-auth gate the wider system enforces. No caller of this file was found anywhere in this module's own client-side code or the wider repository. | A direct request to this file's delete action, by URL construction only — no UI affordance triggers it | An unrelated module's live table | **Confirmed SQL injection, plus a confirmed wrong-table write target.** See `permissions.md` for the authorization-gap treatment of this finding. | Confirmed |
| MPL-RULE-020 | The plan's default-location formula-grid lookup query raw-concatenates the caller-submitted plan id directly, no bind parameters, no numeric-format check. | Every load of the Rule Section ajax fragment | Read-only (but SQL injection in a `SELECT` is not inherently lower-severity — e.g. via UNION) | **Confirmed SQL injection** | Confirmed |
| MPL-RULE-021 | The UOM-type dropdown builder passes the caller-submitted plan id, raw string-concatenated, into a criteria fragment handed to a shared query-result helper — whether that shared helper itself performs any escaping was not confirmed in the source blueprint. | Every load of the Rule Section ajax fragment | Read-only | **Confirmed SQL injection** (call shape); whether the shared helper mitigates it internally is unconfirmed | Confirmed (call shape); Inferred (whether the shared `getQueryResult()` helper itself escapes was not verified) |
| MPL-RULE-022 | The plan-delete task's own usage-count query and its subsequent soft-delete `UPDATE` are both raw-concatenated, no bind parameters, on a fully caller-controlled id. | Every plan-delete action | Plan header (soft-delete) plus a usage-count read | **Confirmed SQL injection** (2 statements, one read one write) | Confirmed |
| MPL-RULE-023 | The usage guard itself (the plan-delete task's own precondition check) is a real, working precondition — a plan cannot be soft-deleted while any product/location assignment still references it. This is a genuine data-integrity guard, the module's only one found in the source blueprint. | Every plan-delete action | Plan Is Deleted flag | N/A — confirms a real guard exists (contrast MPL-RULE-022's injection risk in the same query) | Confirmed |
| MPL-RULE-024 | Adding a new blank rule row raw-concatenates the caller-submitted plan id, no bind parameters, no check that the referenced plan actually exists or is not itself deleted. | Every "Add Rule Row" click | Rule row insert | **Confirmed SQL injection** | Confirmed |
| MPL-RULE-025 | The Rule List grid's server-side data-table endpoint raw-concatenates the plan-id filter on both its count and full-row queries; additionally, its sort-direction value is not validated against ascending/descending at all before being appended raw to the sort clause. | Every Rule List grid load/sort/page | Rule row listing (read) | **Confirmed SQL injection** (2 vectors: the plan-id filter and the unvalidated sort direction) | Confirmed |
| MPL-RULE-026 | Deleting one or more rule rows builds an `IN (...)` clause from a caller-built, comma-delimited id string, raw-concatenated, no bind parameters, no format validation that every segment is actually numeric. | Every rule-row delete (single or bulk) | Rule Is Deleted flag | **Confirmed SQL injection** | Confirmed |
| MPL-RULE-027 | The location-switch grid-fetch query raw-concatenates both the plan id and the location id, no bind parameters. | Every location switch on the plan's grid-editing UI | Read-only | **Confirmed SQL injection** | Confirmed |
| MPL-RULE-028 | The plan-grid save function's own row-lookup query (which row gets the payload) is raw-concatenated on both plan id and location id — a partial mitigation: the actual JSON payload being saved is parameterized, so it cannot itself break out of its bound value, but the lookup clause determining which row receives it remains fully injectable. | Every plan-grid save | Plan Level/Location grid (read for lookup, then write) | **Confirmed SQL injection** on the lookup clause; the data payload itself is correctly parameterized | Confirmed |
| MPL-RULE-029 | The "copy this grid to other locations" fan-out deletes and re-inserts every other tenant location's grid row for this plan; the delete's row-selection clause raw-concatenates the caller-submitted plan id (the location value itself is system-sourced, lower risk); the insert's data payload is parameterized, same partial-mitigation shape as MPL-RULE-028. Because this function runs in a loop across every tenant location whenever the location-uniformity setting defaults to "off", a single malicious plan-id value is replayed — and could inject — once per tenant location in a single request. | Every "copy to other locations" save (the default behavior unless the tenant has explicitly opted into per-location grids) | Plan Level/Location grid, every other tenant location | **Confirmed SQL injection**, and the **widest blast radius of any single injection point in this module** | Confirmed |

<!-- Severity: hard block / warning / auto-remediation / not a block (side-effect only)
     Confidence: Confirmed (explicit source) / Inferred (deduced, needs verification) -->

## Open Questions

- 14 of the 29 rules document a confirmed, unmitigated SQL injection (MPL-RULE-007, 008, 009, 010, 011,
  012, 015, 019, 020, 021, 022, 024, 025, 026, 027, 028, 029 — several rule IDs each cover more than one
  raw-SQL statement, so the raw statement count exceeds the rule-ID count). Whether any live production
  tenant (as opposed to the source blueprint's dev snapshot) has ever exercised one of these paths with a
  malicious payload is not testable without access to a broader live/production dataset.
- MPL-RULE-013: whether the missing `isset()`/`!empty()` guard on the scope row-count calls produces a
  hard fatal or a silent warning depends on the exact PHP runtime's `count()`-on-null behavior — not
  empirically tested (per this project's no-destructive-testing discipline).
- MPL-RULE-021: whether the shared `getQueryResult()` helper performs its own escaping internally, which
  would partially mitigate this rule's direct exploitability — not traced to completion in the source
  blueprint.
- MPL-RULE-014: `penny_round`'s full valid-option set and any intended validation rule is not confirmed —
  see `entities-and-fields.md` Known Gaps.
- The full rule catalog with legacy-source file:line citations is preserved at
  `blueprint/module/MPLPricePlan/02-validation-rules.md` for traceability if a claim above ever needs
  re-verification against the original source.
- A recommended enforcement-layer mapping for all 29 rules is provided separately in
  `build-guidance.md`.
