# SalesHistory — Risks & Open Questions

Source: `docs_from_blueprint/module/SalesHistory/09-risks-and-open-questions.md`, tracing to
`blueprint/module/SalesHistory/07-risk-findings.md` (Pass 7) and `08-consolidation-review.md` (Pass 8).
11 findings (2 Critical, 2 High, 2 Medium, 5 Low/Informational). Unlike a sibling module in this
series whose equivalent findings were explicitly calibrated to the series' *lowest*-urgency tier, this
module's own consolidation verdict places both Critical findings at a **higher** exposure tier, since
both sit on the module's own everyday save-form path rather than a specialized endpoint.

## Risk Register

| ID | Finding | Severity | Impact | Source |
|---|---|---|---|---|
| SH-RISK-001 | SQL injection in the module's own existing-row lookup: the primary save entry point takes five request values (product number, line code, week, year, location), trims each, and interpolates all five directly into a raw `SELECT` statement with an explicitly empty parameter-binding array — no escaping, no parameterization, despite the call's shape superficially resembling a parameterized query. Reachable by any authenticated user with ordinary create/edit permission, through the module's normal, everyday save workflow. | Critical | Full read exposure of the core entity table via the module's everyday save form; mitigated in a new implementation by requirement R2 (`entities-and-fields.md`) — a data-access layer that makes raw string-interpolated SQL structurally unavailable, closing this class of risk everywhere at once. | Doc1 §02, §07 §1.1; SLH-RULE-001 |
| SH-RISK-002 | A second, independently-reachable SQL injection using the identical unescaped value: a shared utility function both of the module's own save paths call unconditionally interpolates one parameter raw into an `INSERT` statement against the shared side-effect table; the value reaching this function is the same raw, trim-only request value Finding SH-RISK-001 already found unescaped. A single malicious submission reaches two independent unescaped SQL statements in the same request. | Critical | Same structural closure as SH-RISK-001 — one data-access layer fix, not a one-off patch to this call site. | Doc1 §02, §07 §1.2; unnumbered rule cited under SLH-RULE-007 |
| SH-RISK-003 | Three independently-authored `total_activity` formula restatements disagree with each other: the module's own formula adds `transfer_out_qty` raw; SalesOrder's and Location's writers both wrap it in absolute value (a confirmed two-against-one split). SalesOrder's own new-row branch additionally omits four of six input terms. Location's cron additionally overwrites its lost-sale counter directly rather than accumulating a delta. | High | Historical `total_activity` figures may not agree with what any single writer's own formula would compute today; mitigated by the "one authoritative formula" requirement R1 and the recommended default formula in `calculations.md` (flagged there as requiring SME sign-off, not settled). | Doc1 §04, §06 §1.1-1.3, §07 Finding #3 |
| SH-RISK-004 | No locking or transaction-isolation mechanism exists across any of the four confirmed writers, one of which (Location's cron) is genuinely asynchronous — each performs its own independent read-then-write sequence against the identical five-field key with no exclusive-read/lock-and-retry pattern found anywhere. A race between a cron-triggered write and a same-moment live-user or SO-finalize write is structurally possible today. | High | Potential lost updates against the aggregate; whether this has ever produced one in production was not tested from the source blueprint's read-only pass. Mitigated by per-aggregate-key serialization at the single authoritative service's own persistence layer (`calculations.md`). | Doc1 §06 §1.0/Open Question 5, §07 Finding #4 |
| SH-RISK-005 | A shared, non-parameterized query-construction pattern in one of the module's own leftover files (already flagged as a different module's copy-pasted template, not SalesHistory-specific logic) reaches a shared framework query-builder via an unvalidated request parameter — not traced to completion, and the file never references this module's own core table at all. | Medium | Unclear/unconfirmed exploitability; the file is a candidate for exclusion rather than migration regardless (see `entities-and-fields.md` R5). | Doc1 §07 §4.2 Finding #5 |
| SH-RISK-006 | Confirmed functional bug, not a security finding: the module's own listview sort-order helper reads a request parameter shaped like a record-id parameter as if it were a sort-direction value — almost certainly a copy-paste artifact — and the grid's own sort-state-persistence write uses session keys this same read logic never reads back, meaning sort-order persistence across requests is silently non-functional (every request falls back to the hardcoded default). | Medium | User-facing: sort preference never actually persists across requests in the legacy system. | Doc1 §02 SLH-RULE-011, §07 Finding #6 |
| SH-RISK-007 | SalesOrder's own equivalent existing-row lookup uses the identical raw-string-interpolation shape as SH-RISK-001, but with second-order (stored, not directly request-supplied) input provenance at that specific call site. | Low/Informational | Worth parameterizing regardless as defense-in-depth. | Doc1 §07 §5 |
| SH-RISK-008 | Three files in the module's own directory (`CallRelatedList.php`, `updateRelations.php`, `LoadList.php`) remain confirmed leftover copies of a different module's related-list-handler template, never touching this module's own core table at all. | Low/Informational | Candidates for exclusion rather than migration (R5, `entities-and-fields.md`). | Doc1 §00, §07 R8 |
| SH-RISK-009 | Clean negative finding: no dangerous dynamic-code-execution pattern exists anywhere in the module. | Low/Informational | None — confirmed absence, stated for completeness. | Doc1 §07 §5 |
| SH-RISK-010 | Clean negative finding: the entity class's own declared backing-table name is confirmed accurate against the live database (unlike a pattern seen elsewhere in this codebase). | Low/Informational | None — confirmed absence, stated for completeness. | Doc1 §07 §5 |
| SH-RISK-011 | A plausible-but-unconfirmed candidate script for the historical write site of the module's four unlabeled week-boundary columns. | Low/Informational | Relevant to migration rehearsal for requirement R3 (`entities-and-fields.md`) — not confirmed by a full line-by-line read. | Doc1 §06 §1.4, §08 §4 Theme B |

## Open Questions

| ID | Question | Why It's Ambiguous | Current Best Guess | Needs Confirmation? |
|---|---|---|---|---|
| SH-OQ-001 | Is `.uom`'s intended population mechanism ever genuinely exercised in production? | Empty on every sampled dev-snapshot row; the module's own ListView search-rewriting logic implies real UOM codes are expected in at least some tenants, but no write site was found anywhere in the blueprint's eight-pass sweep. | No — likely a true orphan | Yes — migration-rehearsal check per R4 |
| SH-OQ-002 | Is `.productnumber`'s zero-match rate against the live Products table a genuine production-data issue or a dev-fixture artifact? | Business-key match only, not database-enforced; zero-match rate not conclusively attributed either way. | Unclear | Yes — SME confirmation against production-shaped data |
| SH-OQ-003 | What was `.pt_id` ("Price Tracker ID") ever meant to reference? | No `vtiger_field` label, no write site found anywhere, zero live rows populated; the field name itself is an inferred guess. | Likely a true orphan | Yes — if any live tenant shows it populated during migration rehearsal |
| SH-OQ-004 | Does the standalone historical-backfill script genuinely write all four week-boundary columns, and is it one-time or re-run? | Found and generally characterized, but not confirmed by full line-by-line read. | Plausible candidate, unconfirmed | Yes — before finalizing the R3 schema collapse |
| SH-OQ-005 | Does `Sales Activity Group Relation`'s `groupname` field have any real-world purpose? | No write-site code found anywhere in the blueprint. | Likely no purpose | No — excluded from new schema per R5 regardless |
| SH-OQ-006 | Does `.lostsale` being `0` on every dev-snapshot row reflect genuine production rarity or a dev-data artifact? | The write mechanism (Location's cron) genuinely exists and runs, making a dev-artifact explanation somewhat more likely, but not conclusively resolved. | Dev-data artifact, leaning | Yes — SME/production-data confirmation |
| SH-OQ-007 | Does any confirmed writer ever accumulate onto a past week's row, or is every writer confined to the current week/year? | Not resolved in the source blueprint. | Unknown | Yes |
| SH-OQ-008 | Has the confirmed absence of locking ever produced a lost update in production? | No locking mechanism found in any writer; not tested from the source blueprint's read-only pass. | Unknown — structurally possible, not confirmed as occurred | Yes |
| SH-OQ-009 | Does the shared soft-delete framework helper perform any existence/reference check before soft-deleting a row? | Not independently re-read in the source blueprint (a stated boundary around shared framework helpers). | Unknown | Yes, if a delete-orphan concern is raised |
| SH-OQ-010 | Does an undelete/restore mechanism for the soft-delete flag exist anywhere outside this module's own files? | The source blueprint's check was scoped to the module's own directory only, not a repo-wide search. | Unknown | Yes |
| SH-OQ-011 | Has the confirmed `|transfer_out_qty|` divergence ever produced two disagreeing `total_activity` values on the same live row? | Formula divergence confirmed by direct comparison; production-data impact not queried. | Unknown | Yes |
| SH-OQ-012 | Does SalesOrder's structurally-incomplete new-row formula reflect an intentional simplification or a genuine bug? | Omits four of six terms; no rationale found in code or comments. | Unclear — likely a bug | Yes |
| SH-OQ-013 | What is the upstream derivation of the lost-sale quantity Location's cron directly writes? | Traced only as far as a temp-table join whose own populating logic is out of this module's scope. | Unknown | Only if reconciling Location's own logic, not this module's own scope |
| SH-OQ-014 | Do any of the one-off `db_utilities/` migration scripts carry their own further-divergent `total_activity` formula restatement? | Found by search, not opened for a formula-level read. | Unknown | Yes, before treating Writers 1-3 as the complete divergence picture |
| SH-OQ-015 | Do the ~12 unopened `Customreport/*.php` files and the "Sales Rank" feature family genuinely read this module's data, and in what output shape? | Only one report file confirmed by direct citation; the "Sales Rank" relationship is session-key-naming-suggestive only. | Likely yes for most Customreport files (naming convention); unconfirmed for Sales Rank | Yes |

## The Single Highest-Priority Unresolved Question

Whether the two Critical, everyday-path SQL injections (SH-RISK-001/002) have ever actually been
exploited against production data, and what the confirmed three-way `total_activity` formula divergence
with zero locking (SH-RISK-003/004) means for the trustworthiness of every historical row's stored
total. The source blueprint explicitly recommends SH-RISK-001/002 be triaged for prompt legacy-system
remediation given their ordinary-path reachability — not deprioritized the way a sibling module's
equivalent findings were — and that SH-RISK-003/004 be flagged to the business/data-quality team as a
genuine data-integrity concern **independent of the rewrite's own timeline**, since it means the
`total_activity` figures already on file for at least some rows may not agree with what any single
confirmed writer's own formula would compute for that same row today.

<!-- Anti-hallucination discipline: nothing here should be silently resolved by guessing in
     downstream stages. Every item stays open until explicitly answered. -->

(Source: `docs_from_blueprint/module/SalesHistory/09-risks-and-open-questions.md`, full file.)
