# SearchLineItem — Risks & Open Questions

Source: `docs_from_blueprint/module/SearchLineItem/09-risks-and-open-questions.md`
(`blueprint/module/SearchLineItem/07-risk-findings.md` Pass 7 and `08-consolidation-review.md` Pass 8).

## Risk Register

17 findings: 2 Critical, 3 High, 4 Medium, 8 Low/Informational. Consolidated from Pass 7 (risk
re-verification) and Pass 8 (final consolidation pass, which promoted five additional findings
documented in Passes 1 and 4 but never carried into Pass 7's own register).

| ID | Finding | Severity | Impact | Source |
|---|---|---|---|---|
| SLI-RISK-001 | SQL injection in the supersede/return worklist's alert-dismiss action — the submitted id-list is only trimmed, then spliced directly into an `UPDATE ... WHERE sliid IN (...)` statement with no bind array at all. Reachable by any authenticated user via the module's own ajax endpoint, with no permission check inside the file beyond session authentication. | Critical | Confirmed, unmitigated SQL injection reachable by any authenticated user; given the injection sits in an `UPDATE` statement, potentially any row/table reachable from this database connection. | Pass 7; see `business-rules-and-validation.md` SLI-RULE-014 |
| SLI-RISK-002 | SQL injection in the shared dashboard-drill where-clause builder, 4 of 8 parameters unescaped — several request parameters are concatenated raw into the query while the function's other parameters are correctly quoted in the same function. Reachable through the module's own everyday list-view rendering path whenever a dashboard-drill request type is present — "arguably more exposed" than SLI-RISK-001, since it fires through ordinary list-browsing, not a specific dismiss-button click. | Critical | Confirmed, unmitigated SQL injection on 4 of 8 parameters, reachable via ordinary list-browsing. | Pass 7; see `business-rules-and-validation.md` SLI-RULE-019 |
| SLI-RISK-003 | The two confirmed writers of the same margin/extension field set can produce genuinely divergent values for the same row — SalesOrder's finalize-time buyout-branch formula and a scheduled cost-backfill process's independent restatement diverge on the account-coretype branching, the extension-basis assumption, and the backfill process's use of the row's current rather than finalize-time input values. | High | Confirmed formula-divergence risk, not merely an absent-lock finding. | Pass 4/6/7; see `calculations.md` |
| SLI-RISK-004 | Both division-by-zero risks silently zero the target column rather than producing a visibly-wrong value — under this database's non-strict configuration, both unguarded inline-edit divisions coerce to zero on a zero-denominator input rather than erroring or persisting an obviously-broken value. | High | A silent zero is materially more likely to be mistaken for a legitimate figure by downstream reporting. 38 and 31 of 7,074 live rows respectively are exposed to this today. | Pass 4/7; see `calculations.md`, `business-rules-and-validation.md` SLI-RULE-011/012 |
| SLI-RISK-005 | The alert-dismiss action has no state-precondition guard, independent of the injection — any row, flagged or not, can be reset by this action. | High | A logical-scope gap that would remain even in a hypothetically-parameterized rewrite of the query. | Pass 2/7; see `business-rules-and-validation.md` SLI-RULE-015 |
| SLI-RISK-006 | The dashboard-drill where-clause builder's "owner" branch concatenates a database-sourced value unescaped after an otherwise-parameterized lookup. | Medium | Low practical risk since that value cannot itself be attacker-controlled through this path, but structurally the same "trust a value because it came from the database" pattern as SLI-RISK-008. | Pass 7 |
| SLI-RISK-007 | A related-list "load list" endpoint's request-supplied view-id parameter reaches shared, generic list-query framework code via a non-parameterized query call, not traced to completion in the blueprint. | Medium | Unresolved residual risk — this call shape has produced confirmed injections in other modules of this codebase when traced one layer further. | Pass 7 |
| SLI-RISK-008 | Two detail-view lookups (a kit-number lookup, a job-name lookup) are unparameterized but second-order — they operate on already-stored, not request-supplied, values. | Medium | Low practical exploitability today, but worth parameterizing regardless as defense-in-depth since both are foreign-key-typed fields a future code path could plausibly make user-writable without this query being revisited. | Pass 7 |
| SLI-RISK-009 | `oversalealert` is a real, live, currently-accumulating alert flag (80 of 7,074 live rows flagged at blueprint time) with no confirmed-reachable dismiss mechanism anywhere in the live application. | Medium | Confirmed, live, currently-growing operational-data condition, distinct in kind from this module's security findings — every future oversale alert accumulates permanently under the traced legacy code, with no product-level way to clear it if the one candidate dismiss script is genuinely unreachable. | Pass 3/6/7; see `workflows.md` |
| SLI-RISK-010 | Two files under this module's own directory (a related-list panel renderer and a related-record linker) are confirmed verbatim/near-verbatim copies of a different module's generic related-list handler, never adapted to this module's own relation table. | Low | Candidates for exclusion, not migration, in a new implementation's scope decision. | Pass 7/8 |
| SLI-RISK-011 | The scheduled cost-backfill process and the ad hoc tax-recalculation script are real, independent writers of this module's table, but of different fields (tax-dollar, and cost/margin fields respectively) than a naive "four independent writers of the same fields" framing would suggest. | Low | An earlier characterization in the blueprint's own cross-module pass was corrected mid-series to reflect that only two writers genuinely conflict, not four. | Pass 6/7 |
| SLI-RISK-012 | The advance-search criteria-building function has no internal escaping of its own — safe only because its two known callers both pre-escape. | Low | A latent surface with no defense of its own if a future caller fails to pre-escape. | Pass 2/7; see `business-rules-and-validation.md` SLI-RULE-018 |
| SLI-RISK-013 | No use of dangerous dynamic-code-execution functions (`eval`, `base64_decode`) was found anywhere in this module. | Informational | A clean negative finding, worth recording since it rules out one entire class of obfuscated-payload risk. | Pass 7 |
| SLI-RISK-014 | The module's entire standard create/edit scaffolding is present but is not the real write path — the only confirmed row-creation site anywhere in this codebase is SalesOrder's own finalize routine. | Low | A new implementation that assumed this module needs a full user-facing create/edit surface would be over-building relative to how the table is actually populated in production. | Pass 1/8 |
| SLI-RISK-015 | The custom-field-extension satellite table is structurally present but functionally empty (one column, zero live rows, no code reference beyond its own schema description). | Low | A new schema design that carries it forward as a real extension point would be building migration effort around a table with zero write activity across the blueprint's entire eight-pass investigation. | Pass 1/8 |
| SLI-RISK-016 | One field-registration row is anomalous: a "Shipping Name" field is registered against this module's tab but its physical column actually lives on SalesOrder's own shipping-address table. | Low | A cross-module field-registration anomaly, plausibly a configuration error, never resolved by the blueprint. | Pass 1/8 |
| SLI-RISK-017 | Total Before / Total After are hardcoded to an empty string at every finalize-time write, never computed despite being catalogued as system-derived totals. | Low | A schema-documentation correctness gap (not a live data-corruption bug, since the fields are consistently blank rather than wrongly computed). | Pass 4/8; see `calculations.md` |

**This module's calibrated risk framing.** The blueprint's own final consolidation pass is explicit that
this module — the seventh consecutive module carried through this series with a confirmed, live,
unmitigated SQL injection — should be ranked at the **lower-urgency end** of the series' risk stack, not
treated with the same "drop everything" framing warranted by modules whose Critical findings touch
shared master data. The injections themselves (SLI-RISK-001/002) are technically no less dangerous than
any other module's finding of the same shape, but the *business* blast radius is the narrowest of any
module carried through this series so far, on three independent axes: file count (21 files, the smallest
of the series to date), data ownership (this module owns nothing anything else depends on being
correct — it is a downstream read target, never written back to by any consumer), and audience (no
customer-, vendor-, or trading-partner-facing surface at all; every consumer is internal staff, or an
external system reading *from* this module for pricing lookups, never writing into it). This should
still be treated as a "patch the legacy system now" item — both confirmed injections are real,
currently-reachable — but triaged **below** other modules' Critical findings in a remediation queue, not
alongside them.

## Open Questions

19 items across all eight blueprint analysis passes, grouped by theme with representative items.

| ID | Question | Why It's Ambiguous | Current Best Guess | Needs Confirmation? |
|---|---|---|---|---|
| SLI-OQ-001 | What is the business meaning of the ~7 ambiguous/orphaned fields with no CRM field label (sell-price quantity basis, discount amount, "VOC," UOM JSON payload, "Original Core Cost," "Return PO Flag," and the row's own created/modified timestamps)? | No `vtiger_field` label; meaning inferred solely from column-name convention. | Meaning as stated in `entities-and-fields.md`'s field catalog, unconfirmed. | Yes |
| SLI-OQ-002 | What is the full `.transactioncode` code-to-meaning mapping? | Only 7 of an unknown fuller set of values were confirmed (buyout, sale, two core-charge codes, three/four return-type codes `6`/`7`/`8`/`18`); the presumed fuller reference table was never enumerated, and no pass distinguishes the return-type codes from one another as sub-types. | The 7 confirmed values only. | Yes |
| SLI-OQ-003 | Does a post-finalize SO-side edit actually leave other snapshot fields stale? | The blueprint's finding that only Customer PO Number and (same-transaction) Line Number have confirmed post-creation update paths is a static-analysis result, not a live before/after reproduction against a real finalized-SO edit. | Yes, other fields go stale — not behaviorally tested. | Yes |
| SLI-OQ-004 | Is the `oversalealert` bulk-reset script's dismiss path actually reachable in the live application (merged from four raw entries)? | A genuine dismiss mechanism exists in code for this flag, correcting an earlier "no dismiss path exists at all" finding, but no caller of it was found anywhere in the repository. | Likely unreachable, but not confirmed dead code either. | Yes |
| SLI-OQ-005 | Is the confirmed extension-basis divergence (SLI-RISK-003) a genuine formula bug, or is an upstream value already extended by the time it reaches the margin formula? | The upstream derivation of the actual price/cost inputs SearchLineItem's margin formulas consume was not traced by this blueprint. | Unresolved. | Yes |
| SLI-OQ-006 | Has the margin-percent divide-by-zero corruption (SLI-RISK-004) ever actually reached a live row in production? | The row-level precondition is confirmed to exist on real data (38/31 rows), but whether any user has actually triggered the inline-edit path against one of those specific rows was not checked. | Unknown. | Yes |
| SLI-OQ-007 | What is the Ford EDI export's invocation mechanism (scheduled vs. manually triggered)? | No caller reference was found for the export script. | Likely a scheduled batch job, based on its zip-archiving/CSV-per-section structure. | Yes |
| SLI-OQ-008 | Does the mobile-scanner webservice's read of SearchLineItem data surface to the external app's own UI, or is it purely an internal pricing-calculation input? | Not traced beyond the two matched queries. | Unknown. | Yes |
| SLI-OQ-009 | Where does the "load list" endpoint's request-supplied view-id parameter terminate inside shared framework code? | Not traced to its terminal query in the blueprint. | Unresolved residual risk (SLI-RISK-007). | Yes |
| SLI-OQ-010 | Is the alert-dismiss action's missing permission check (SLI-RULE-014) intentional design, or a genuine gap? | Not resolvable from static analysis alone — every authenticated user can dismiss any alert regardless of module-level permissions today. | Unknown; flagged as the single highest-priority unresolved question (see below). | Yes |
| SLI-OQ-011 | Have the 38/31-row divide-by-zero exposure counts grown since the blueprint's own snapshot? | Point-in-time snapshot only; not re-queried since. | Likely grown, given the table is actively growing (7,074 rows and counting). | Yes |
| SLI-OQ-012 | What do the shared escaping/quoting helper functions' own internal implementations do? | Not read in any pass — their behavior was inferred from call-site effects only. | Presumed correct based on observed call-site behavior (SLI-RULE-017/018). | Yes |
| SLI-OQ-013 | What does the advance-search field-picker builder (`getAdvSearchfields`) do internally? | Only skimmed for structure, never fully read. | Builds the advance-search field picker and applies permission/visibility filtering; not independently verified. | Yes |
| SLI-OQ-014 | Is the "Big Tree" per-unit fee / product-type / units-per-case column cluster tied to an identifiable vendor or program? | Never identified anywhere across the blueprint's eight analysis passes. | Unknown third-party program. | Yes |
| SLI-OQ-015 | Is the "Shipping Name" field-registration anomaly (fieldid 4598, registered against SearchLineItem's tab but pointing at SalesOrder's `vtiger_soshipads`) a configuration error or intentional shared display plumbing? | Never resolved by the blueprint. | Unknown. | Yes |
| SLI-OQ-016 | Should the custom-field-extension satellite table be carried into a new schema at all? | Structurally present, functionally empty (1 column, 0 rows), no code reference beyond its own schema description. | No — recommended exclusion (see `entities-and-fields.md` §6). | Yes (confirm exclusion decision with SME/product owner before migration) |
| SLI-OQ-017 | Is the group-relation table's "Backorderlog Number" grouping mechanism a retired feature or simply unexercised on the blueprint's own dev snapshot? | Zero live rows; no code site found that writes to it; meaning inferred solely from a search-field label. | Likely retired or never adopted. | Yes |
| SLI-OQ-018 | Does "RGN" (Return-Goods-Number) expand to something more specific with additional business rules attached? | Abbreviation not expanded or confirmed anywhere in the blueprint. | Return-goods-number reference, as labeled. | Yes |
| SLI-OQ-019 | What was "Total Before"/"Total After" originally intended to compute, given they are hardcoded blank on every write? | No evidence of an intended formula found anywhere across the blueprint's eight analysis passes. | Unknown — do not invent a calculation without SME input (see `calculations.md`). | Yes |

**Ambiguous/unconfirmed field meanings**: roughly 17 individual field references (plus 2 whole-
satellite-table questions, folded into SLI-OQ-016/017 above) carry confirmed-unclear business meaning —
unexpanded abbreviations, orphaned unlabeled columns, and a never-identified third-party program cluster
— full list in `entities-and-fields.md`'s field catalog. These require subject-matter-expert input
before being assigned normative meaning in a new schema; they are **not** guessed at in that document.

**The single highest-priority unresolved question**: whether the module's missing permission check on
the alert-dismiss action (SLI-OQ-010) is intentional design or a genuine gap — not resolvable from
static analysis alone. This sits alongside, but is distinct from, the two Critical SQL injections
themselves (SLI-RISK-001/002), which need no further confirmation before being fixed — they are
confirmed defects regardless of the permission-model question.

<!-- Anti-hallucination discipline: nothing here should be silently resolved by guessing in
     downstream stages. Every item stays open until explicitly answered. -->
