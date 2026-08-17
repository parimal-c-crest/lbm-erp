# Pricebooklevel200 — Risks & Open Questions

Source: `docs_from_blueprint/module/Pricebooklevel200/09-risks-and-open-questions.md`, itself transcribed from
`blueprint/module/Pricebooklevel200/07-risk-findings.md` ("Pass 7") and `08-consolidation-review.md` ("Pass
8"). 19 risk findings (4 Critical, 4 High, 6 Medium, 5 Low/Informational), re-confirmed by directly re-reading
the cited source file/line ranges, plus a 15-item open-questions list.

## Risk Register

| ID | Finding | Severity | Impact | Source |
|---|---|---|---|---|
| PBL200-RISK-001 | The module's own standard delete action instantiates an unrelated module's entity class (outbound delivery-log tracking), not this module's own Price Sheet entity — the module's own everyday, primary delete action, reachable by any user with ordinary delete permission, not a rare or attacker-only path. | Critical | Most likely practical effect: price sheets cannot be deleted through the standard action at all (a silent no-op, since no delivery-log row is likely to share the target price-sheet's own id); a secondary, lower-probability-but-nonzero risk exists that an unrelated delivery-log record could be silently soft-deleted if an id collision does occur. | `07-risk-findings.md` §1, Risk Register #1; `business-rules-and-validation.md` rule PBL200-RULE-014 |
| PBL200-RISK-002 | A wrong-entity-class ajax endpoint (`DetailViewAjax.php`) writes an arbitrary field to an arbitrary record of an unrelated module (Campaigns), from inside this module's own URL namespace, with **no permission check of its own** and no caller found anywhere in this module's own client-side code. | Critical | Any authenticated user, regardless of their own permissions on the unrelated module, can write an arbitrary field value to an arbitrary record of that module by direct URL construction. See `permissions.md` for full detail. | `07-risk-findings.md` §2, Risk Register #2; `business-rules-and-validation.md` rule PBL200-RULE-041 |
| PBL200-RISK-003 | The module's standard save action and a second, independently-reachable ajax endpoint both contain a near-identical raw-SQL rule-field-update mechanism with no bound parameters at all and no allow-list of which field names may be targeted. | Critical | The module's own everyday save action, duplicated across two independently-reachable implementations, meaning a fix applied to one alone would leave the other's identical defect fully intact. | `07-risk-findings.md` §4.1-4.2, Risk Register #3; rules PBL200-RULE-007/008/019/020 |
| PBL200-RISK-004 | Four confirmed leftover files from an unrelated module (Campaigns) — the wrong-class ajax endpoint from PBL200-RISK-002, a whole-page related-list controller, and two relationship-table write scripts — confirm this module's own file set was wholesale copy-pasted from that unrelated module with insufficient adaptation. | Critical | Listed as its own Critical entry distinct from PBL200-RISK-002, because the *pattern* (not merely the one live-exploitable instance) is itself a signal that this module's own file set needs a systemic audit, not a one-off fix. The widest count of confirmed wrong-entity-class defects found in any single module blueprinted in this documentation series to date. | `07-risk-findings.md` §3, Risk Register #4; `integrations.md` §Campaigns |
| PBL200-RISK-005 | The live entity class's CSV-export query has a session-value injection dependency, reachable via the standard listview export action, contingent on a session value that is itself poisonable via the module's own injectable rule-name write path. | High | A second-order injection chain, not a directly request-driven one. | `07-risk-findings.md` §4, Risk Register #5; rule PBL200-RULE-003 |
| PBL200-RISK-006 | The "apply price sheet to accounts" flow's read-side lookups are unescaped, poisoning up to three statements from a single attacker-controlled value. | High | Reachable via a normal, if less frequent than a price-sheet save, administrative action. | `07-risk-findings.md` §4.3, Risk Register #6; rules PBL200-RULE-029/030 |
| PBL200-RISK-007 | The wrong-entity-class ajax endpoint's second branch (an "account details" lookup) has a confirmed, independently exploitable read-path SQL injection. | High | On the same file as PBL200-RISK-002, but on a separate branch. | `07-risk-findings.md` §2, Risk Register #7; rule PBL200-RULE-042 |
| PBL200-RISK-008 | Three files/methods reference a module and set of tables confirmed absent from the codebase and database entirely. | High | Not a live security finding (these paths are confirmed non-functional/dead), but a confirmed, wide-reaching functional defect: the module's own "duplicate rule to another price book" and "count matching products for a duplicated rule" features are entirely non-functional. | `07-risk-findings.md` §5.4, Risk Register #8; rules PBL200-RULE-015/016 |
| PBL200-RISK-009 | The rule-line entity has dual, uncoordinated ownership between this module (the table's dominant raw-SQL writer, by row count) and a separate sibling module (`Level200rules`, the table's own declared entity-class owner). | Medium | Not itself an injection, but a genuine architectural risk: two independently-evolving modules writing the same table through two different mechanisms, joined only by an unenforced string match, with no coordinating lock or shared write-path abstraction found between them. | `07-risk-findings.md` §5.1/§5.4, Risk Register #9; `integrations.md` §`Level200rules`; `entities-and-fields.md` Requirement R2 |
| PBL200-RISK-010 | The account-assignment field's three write paths carry genuinely inconsistent semantics — using one popup on an account that already has other price sheets assigned via the other two flows silently destroys those other assignments. | Medium | Data-integrity/semantic-inconsistency defect on one shared field. | `07-risk-findings.md` §4.3, Risk Register #10; rule PBL200-RULE-035 |
| PBL200-RISK-011 | A structurally identical divide-by-zero risk to the sibling `MPLPricePlan` module's own `GP%` finding exists in this module's own GP-based fallback pricing formula. | Medium | A GP value of exactly 100 under a compound triggering condition produces a divide-by-zero with no guard clause; no currently-triggering live row on the source blueprint's own dev snapshot, one save-time typo away. | `07-risk-findings.md`, Risk Register #11; `calculations.md` §"Live divide-by-zero risk" |
| PBL200-RISK-012 | A price sheet's own end date is captured, displayed once, but not enforced as a pricing gate anywhere in the traced live pricing path. | Medium | 9 of 14 live sheets carry a non-NULL end date on the source blueprint's own dev snapshot, several already in the past, yet remain Active and pricing-eligible. | `07-risk-findings.md`, Risk Register #12; `workflows.md` §`mps_end_date` |
| PBL200-RISK-013 | A 3-state "100-level override" flag on the sheet header has no confirmed reader anywhere in this module's own files or the traced pricing path. | Medium | A genuine schema mystery, directly named after the confirmed-dead "100 level" tier; could be a further dead artifact or an unfound live consumer. | `07-risk-findings.md`, Risk Register #13; `entities-and-fields.md` §Known Gaps |
| PBL200-RISK-014 | The "check duplicate price-sheet name" endpoint performs no duplicate-name validation despite its own name promising one. | Medium | A confirmed functional gap, not itself security-relevant, but worth flagging since a genuine "prevent duplicate price-sheet names" business rule may be silently unenforced anywhere in the system as a result. | `07-risk-findings.md`, Risk Register #14; rule PBL200-RULE-018 |
| PBL200-RISK-015 | Three of the four Campaigns-leftover files (the related-list controller and the two relationship-table write scripts) have no independently live-exploitable consequence of their own. | Low/Informational | Confirmed dead-from-the-UI's-own-perspective, parameterized where SQL exists, but structurally the same copy-paste leftover pattern as PBL200-RISK-004's escalated framing. Listed separately here at Low severity for each file's own individual contribution, since each is independently harmless if reached. | `07-risk-findings.md` §3, Risk Register #15 |
| PBL200-RISK-016 | The detail-view controller's single-pane related-lists branch references an undefined variable. | Low/Informational | A confirmed fatal-on-trigger functional defect under a specific view configuration, not a security finding. | `07-risk-findings.md`, Risk Register #16; rule PBL200-RULE-012 |
| PBL200-RISK-017 | The list-view controller's Postgres-only code branch groups by a column belonging to an unrelated module's table. | Low/Informational | Confirmed unreachable on this deployment's MySQL configuration, informational only. | `07-risk-findings.md`, Risk Register #17; rule PBL200-RULE-013 |
| PBL200-RISK-018 | The dead legacy entity class's own id-generation helper function creates a redeclaration hazard if both entity classes were ever loaded in the same request. | Low/Informational | No live trigger path found, informational. | `07-risk-findings.md`, Risk Register #18; rule PBL200-RULE-005 |
| PBL200-RISK-019 | The GP color-code settings file's dead import of an unrelated module's class. | Low/Informational | Cosmetic only. | `07-risk-findings.md`, Risk Register #19; rule PBL200-RULE-026 |

## Ambiguous/unconfirmed field meanings

Roughly 20 fields carry confirmed-unclear or partially-unclear business meaning (unexpanded terminology, fields
with no confirmed reader, a 3-state flag directly named after a confirmed-dead pricing tier, etc.) — full list
in `entities-and-fields.md` §Known Gaps. These require subject-matter-expert input before being assigned
normative meaning in a new schema; they are **not** guessed at in this document.

## Open Questions

| ID | Question | Why It's Ambiguous | Current Best Guess | Needs Confirmation? |
|---|---|---|---|---|
| PBL200-OQ-001 | What is the 3-state "100-level override" flag's business meaning, and is there any code path that reads it? | No reader found anywhere in the module's own files or the traced pricing path; the column name directly references the confirmed-dead "100 level" tier. | Likely a further dead artifact of the removed "100 level" tier, but not confirmed. | Yes |
| PBL200-OQ-002 | What is "Future Master Price Sheet"'s intended consumer? | Captured at save time if the edit form includes it; never confirmed read anywhere. | Captured-but-unconsumed successor pointer. | Yes |
| PBL200-OQ-003 | Are Price Method and the Price-Basis Selector field read anywhere in the live pricing path? | The penny-round mechanism is confirmed unread; these two remain open beyond what the pricing-formula trace directly confirmed. | Likely UI-descriptive-only, not confirmed. | Yes |
| PBL200-OQ-004 | Where does interactive single-rule-row "add" actually happen? | The source blueprint's own file set covers only bulk-insert and edit-existing-row paths, not a dedicated "insert one new blank rule row" action. | Either such an action exists in code not isolated as distinct by the source blueprint, or new rows are only ever created via the two bulk paths found. | Yes |
| PBL200-OQ-005 | What is the internal resolution logic of the "location base price"/"price dropdown" lookups the GP-based fallback formula depends on? | Not traced to completion in the source blueprint. | Unknown. | Yes |
| PBL200-OQ-006 | What is the exact math of the shared unit-of-measure conversion function used in the pricing computation? | Internal logic not traced to completion. | Unknown. | Yes |
| PBL200-OQ-007 | What is the exact rounding behavior of the shared cost-rounding function referenced in the GP-based fallback formula? | Not traced to completion. | Unknown. | Yes |
| PBL200-OQ-008 | What is the full caller chain of the pricing-computation function within SalesOrder/Quotes, and its ordering relative to any sibling-tier calls into the same shared pricing-decision result set? | Not traced anywhere in this module's own blueprint. | The single most important open question for the cross-sibling consolidation pass. | Yes |
| PBL200-OQ-009 | Has any live production tenant ever saved a GP value of exactly 100 on a rule row? | Not testable against the source blueprint's own dev-only snapshot. | No row on the dev snapshot carries exactly 100.000, but production data is untested. | Yes |
| PBL200-OQ-010 | Is the live entity class's CSV export's cross-reference to the sibling `Level200rules` module's own field-permission configuration intentional shared design or an unadapted artifact? | Not resolvable without a targeted read of that sibling module. | Possibly an unadapted copy-paste artifact, not confirmed. | Yes |
| PBL200-OQ-011 | What does the shared, generic export-handling utility do with the session-dependent, injectable export query when the session value is unset? | Not traced to completion. | Unknown. | Yes |
| PBL200-OQ-012 | Where does the server-side handler for the client-side "email this price sheet" action actually live? | Not located as a distinct file under this module's own directory. | Likely a shared, cross-module email-send endpoint, not confirmed. | Yes |
| PBL200-OQ-013 | Does the sibling `Level200rules` module's own CRUD write the shared rule table with the same field conventions this module's own files assume? | Not investigated in the Pricebooklevel200-scoped source blueprint. | Unknown — a real risk given the confirmed dual-ownership finding. | Yes |
| PBL200-OQ-014 | Is the account-assignment field genuinely shared across all three sibling pricing tiers, or tier-specific? | A preliminary grep of the sibling modules' own directories for this exact field name found no hits — a signal, not a confirmed negative. | The highest-priority cross-sibling open question alongside PBL200-OQ-008. | Yes |
| PBL200-OQ-015 | Do the sibling `Pricebooklevel300`/`Pricebooklevel800` modules carry their own dead "100 level"-shaped references, their own Campaigns-leftover files, or their own wrong-class-delete action against an unrelated module? | None of these were independently confirmed or ruled out for the sibling modules in the source blueprint. | Unknown. | Yes |

**Further risk-sweep follow-ups (source: Pass 7, not independently re-numbered by the source consolidation
pass, preserved here for completeness rather than compressed away):**

- What the shared, generic delete helper actually does when handed a mismatched entity/module pair
  (PBL200-RISK-001) — the single most consequential *code-level* open question in the whole document set, since
  it determines whether PBL200-RISK-001 is a silent no-op or an active cross-module data-corruption risk.
- Whether any live production tenant's delivery-log table shares any numeric id with a live price-sheet id —
  determines whether PBL200-RISK-001's secondary risk (accidental cross-module deletion) is a live concern on
  any given tenant; a pure read-only check would be safe and is recommended as a fast follow, not performed in
  the source blueprint for scope reasons.
- What legitimate, Pricebooklevel200-specific feature (if any) PBL200-RISK-002's write branch, or the
  related-list controller, were originally meant to provide before being left as unadapted leftovers from the
  unrelated module — not resolvable from static code alone.
- The internal escaping behavior of the shared job-id-resolution, account-lookup, and query-result helper
  functions that several of this module's own second-order-injection findings depend on — not traced to
  completion, the same "shared framework, not re-derived" boundary drawn consistently across this documentation
  series.

## The single highest-priority unresolved question

Per the source blueprint's own final consolidation pass: **what the shared, generic delete helper actually does
when handed a mismatched entity/module pair** (the delete action instantiating an unrelated module's entity
while receiving this module's own request parameters) is the single most consequential open question in the
entire document set — it determines whether the module's own delete feature is a harmless no-op or an active
cross-module data-corruption risk, and any fix design depends on knowing which. This is "resolved enough to act
on" only in the narrow sense that "the current system has no *confirmed* working delete for this module" is
itself the actionable fact for a new implementation — the broader question of the exact legacy failure mode
remains open and should be the first item resolved before or during a new implementation's own delete-guard
design (see `build-guidance.md`).

## A note on the module's own overall risk profile relative to the documentation series

The source blueprint's own final verdict frames this module distinctly from its immediately-prior sibling
(`MPLPricePlan`) on several axes, carried forward here verbatim rather than re-summarized: the module's core
business logic is genuinely real and live-consumed, more so than `MPLPricePlan`'s own narrower-adoption
mechanism; but the wrong-entity-class defect count (2 distinct target modules across 4 files with live
consequence) is the widest found in the series to date; the SQL-injection count (16 confirmed points) is wide
but not the widest, spread across a more varied set of vulnerability shapes than most prior modules; and the
`Level200rules` sibling relationship is a genuinely novel structural finding relative to the series so far — a
live, dual-ownership, uncoordinated shared-table relationship between two sibling modules, distinct in kind from
every other module's own cross-module findings in this series to date.

<!-- Anti-hallucination discipline: nothing here should be silently resolved by guessing in
     downstream stages. Every item stays open until explicitly answered. -->
