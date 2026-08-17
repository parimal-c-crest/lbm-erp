# Pricebooklevel800 — Risks & Open Questions

Source: `docs_from_blueprint/module/Pricebooklevel800/09-risks-and-open-questions.md`, itemized
against its underlying sources `blueprint/module/Pricebooklevel800/07-risk-findings.md` (risk
re-verification pass, every finding independently re-confirmed against live source and/or the live
database) and `08-consolidation-review.md` (Doc1 §08, master rollup/consolidation pass — carried
forward unchanged, no new findings surfaced).

**This module continues an unbroken streak: every one of the 16 modules blueprinted in this series so
far has had at least one confirmed live SQL injection** (`blueprint/module-blueprint-scope.md`).

## Risk Register

9 findings: 4 Critical, 2 High, 2 Medium, 1 Low.

| ID | Finding | Severity | Impact | Source |
|---|---|---|---|---|
| PBL800-RISK-001 | Header create/edit writes plus an unbounded, allow-list-free rule-field mass-assignment injection — the header save flow's create and edit branches both splice live, unescaped request values directly into write statements with no bind parameters. **Worse than a value-only injection**: the flow's per-rule update loop takes the **field name itself** (not just the value) from client input and splices it directly into the write clause of a raw update against the sibling rule table, with no allow-list of permitted column names at all — an attacker can supply an arbitrary column name (e.g. targeting an ownership or deletion column) and have it silently accepted, since both the column-name selection and every value are attacker-controlled and unescaped. | Critical | Strictly worse than a value-only injection: it additionally functions as an uncontrolled mass-assignment vulnerability against an entirely different module's table (`Level800rules`). | `blueprint/module/Pricebooklevel800/07-risk-findings.md` |
| PBL800-RISK-002 | A second-order rule-scope injection, compounded by two independent SQL syntax errors — the product-count lookup function's queries concatenate rule-scoping values (themselves writable via PBL800-RISK-001's own injection) unescaped into further queries, a genuine second-order injection chain. Independently, the same function has two separate SQL syntax errors (a missing keyword in one query, a stray keyword fragment in another), meaning the feature does not currently execute successfully at all. | Critical | Lower immediate exploitability than the other Criticals, since the vulnerable code path does not currently run to completion, but the underlying injection pattern would become live the moment the syntax errors were fixed without also fixing the escaping. | `blueprint/module/Pricebooklevel800/07-risk-findings.md` |
| PBL800-RISK-003 | A client-controlled raw SELECT feeding a global CRM field-metadata write — the "set as default" mass-action's SELECT of a chosen price book's name is built from unescaped, unvalidated request input, and that result feeds directly into a write against the platform's own field-definition table (itself parameterized). | Critical | A successful injection here (e.g. a crafted value engineered to return an attacker-chosen string) could set the **system-wide default value** of every future Account's assignment field to an arbitrary string — a genuine data-integrity/business-logic escalation beyond typical single-row data exposure, and this module's single most distinctive injection consequence in terms of blast-radius scope (global, forward-looking, affecting every future Account). | `blueprint/module/Pricebooklevel800/07-risk-findings.md` |
| PBL800-RISK-004 | Unescaped id-lists reaching Accounts' own pricing-tier assignment column — the Apply-to-Accounts bulk-write flow's price-book-id list and Account-id list are both spliced unescaped into query clauses with no bind parameters at all. | Critical | **Confirmed the module's single most consequential defect**: an attacker controlling either list could inject arbitrary SQL that ultimately influences which Accounts' pricing-tier assignment gets overwritten — a direct path from unauthenticated-shaped input to a customer-facing pricing-tier change across an attacker-chosen set of Accounts, not merely a data-disclosure risk. More directly consequential than PBL800-RISK-003 even though #3's blast radius (global default) is broader in scope — #4 requires only a crafted id list, a materially lower attack complexity. | `blueprint/module/Pricebooklevel800/07-risk-findings.md` |
| PBL800-RISK-005 | Unescaped dropdown render in the rule-duplication feature (partially client-mitigated stored-XSS) — the core rule-lookup in the duplicate-rule flow is correctly parameterized, but the destination price-book dropdown echoes the price-book name directly into markup with no escaping. | High | A stored-XSS vector if any live name value ever contains markup-significant characters. Downgraded from Critical because the client-side name-validation check does block the specific characters that would be needed to break out of the rendering context, though that check is client-side-only and not mirrored server-side (rule PBL800-RULE-012). | `blueprint/module/Pricebooklevel800/07-risk-findings.md` |
| PBL800-RISK-006 | Cross-module access-control-bypass-shaped Campaigns leftovers — four files that are verbatim leftover Campaigns code (`integrations.md`) are internally parameterized for their own SQL, so this is **not** a SQL-injection finding — the risk is architectural: these files are reachable via this module's own action names but execute against Campaigns' own relationship tables with no verification that the acting user has Campaigns-module permissions, only whatever the generic dispatcher checks for this module's own name. | High | A user with access to this module but not Campaigns could potentially read/write Campaigns relationship data through this back door — an access-control bypass via module-mismatch, not a SQL-injection defect. No proof-of-exploit was traced end-to-end (would require confirming the generic dispatcher's own permission-check granularity, out of this module's own file scope), but the shape is concerning enough to warrant explicit removal regardless. | `blueprint/module/Pricebooklevel800/07-risk-findings.md` |
| PBL800-RISK-007 | A declared internal table-name mapping on the header entity class does not match either the live database schema or this same file's own separately-declared table array — a "declared metadata not matching live DB" defect. A separately-declared group-relation table reference also points at a table confirmed absent from the live schema (present on a sibling tier's own module, but never created for this tier). | Medium | Neither has a confirmed live trigger path traced fully within this module's own scope (both depend on generic platform-core behavior not read in this pass). | `blueprint/module/Pricebooklevel800/07-risk-findings.md` |
| PBL800-RISK-008 | The CSV export function targets the wrong entity (the sibling rule table, not this module's own header table) — a functional, not security, gap, though the query itself is also built with an unescaped session-derived value, a lower-exploitability raw-SQL pattern worth noting alongside the functional mis-targeting. | Medium | Functional correctness gap (see `outputs.md`) with a lower-exploitability injection pattern riding alongside it. | `blueprint/module/Pricebooklevel800/07-risk-findings.md` |
| PBL800-RISK-009 | Dead/vestigial code with no live blast radius: a client-side button with no corresponding server-side handler found anywhere in this module (either a dead feature or a handler registered elsewhere, unconfirmed); the dead cascade-delete function already covered in depth in `calculations.md` (a data-integrity risk, not re-scored here as a duplicate finding, cross-referenced for completeness); dead entity-class instantiations with no functional or security impact. | Low | No live blast radius confirmed for the dead code itself; the cascade-delete function's *absence of use* is the real data-integrity risk, tracked separately in `calculations.md` and `entities-and-fields.md` §4. | `blueprint/module/Pricebooklevel800/07-risk-findings.md` |

## The module's headline data-integrity finding (not a code-level "risk register" item, equally consequential)

**0 live header rows, 8 orphaned live rule rows, 932 orphaned live account assignments, and a dead
cascade-delete function that would have prevented the orphaning had it ever been wired up.** Full
detail is documented in `entities-and-fields.md` §4 and `calculations.md`.

## Ambiguous/Unconfirmed Field Meanings

- The meaning and any live consumer of the `autoupdatefrompcb`/`createdfrom='PCB'` pair is
  unconfirmed.
- Whether the header-level "Times" default multiplier is ever read for anything beyond a UI pre-fill
  is unconfirmed.
- Two rule-table columns (a "Splitted" flag and a numeric "Run ID") have purposes not independently
  confirmed within this module's own scope.

These require subject-matter-expert input before being assigned normative meaning in a new schema;
they are **not** guessed at in this document. Full list also carried in
`entities-and-fields.md`'s Known Gaps section.

## Open Questions

Consolidated from Doc1 §08's own final consolidation pass — all seven are explicitly out-of-this-
module's-own-scope by nature (they require tracing into shared platform-core machinery or sibling
modules), not gaps in this module's own documentation.

| ID | Question | Why It's Ambiguous | Current Best Guess | Needs Confirmation? |
|---|---|---|---|---|
| PBL800-OQ-001 | Does the current dataset's "every 500-Level pricing lookup returns 0.0000" condition (`calculations.md`) actually reach a live customer-facing sales order today, or is it caught by a fallback elsewhere in the broader pricing waterfall (outside this module's own scope to trace further)? | The header lookup step (`calculations.md` stage 1) is structurally confirmed to fail for every current non-"LP" assignment, but whether anything downstream in the wider pricing engine catches that failure was not traced within this module's own file set. | Unknown — the single highest-priority open question in this module's whole blueprint, per Doc3 a hard blocker for setting any cutover date. | Yes |
| PBL800-OQ-002 | What does `autoupdatefrompcb`/`createdfrom='PCB'` actually drive? | No PCB-sync process was found within this module's own files; unverifiable without locating whatever process consumes this flag elsewhere in the codebase. | Unknown — inferred label only ("Product Cost Book"), not confirmed. | Yes |
| PBL800-OQ-003 | Is the header-level "Times" default multiplier ever actually read for anything beyond a UI pre-fill? | No confirmed read site found within this module's scope. | Likely a UI-pre-fill-only value, not confirmed. | Yes |
| PBL800-OQ-004 | Do `"M3"`/`"500"` (the two dominant live account-assignment values) correspond to live header rows in the sibling `Pricebooklevel200`/`Pricebooklevel300` modules' own tables? | If so, the 932 accounts are not simply orphaned but were migrated to reference a *different* tier's price book under the same assignment column — which would reframe the "orphaned data" finding significantly. | Unknown — exactly the kind of question the cross-sibling consolidation pass (referenced but not itself part of this module's own blueprint) is positioned to answer. | Yes |
| PBL800-OQ-005 | Does the generic platform dispatcher's permission check for the Campaigns-leftover action names evaluate access control against the URL's declared module, the file's actual include target, or neither? | Determines whether the Campaigns-leftover files (PBL800-RISK-006) are a real access-control-bypass risk or merely dead weight; requires reading the core dispatcher, out of this module's own scope. | Unknown. | Yes |
| PBL800-OQ-006 | Is the declared table-name-mapping/group-relation-table mismatch's live effect actually exercised by any core platform flow for this module (e.g. group-sharing UI, ownership transfer), or is it inert because this module has no group-sharing feature exposed in its own UI? | Unverifiable without reading shared platform-core machinery, out of scope. | Unknown. | Yes |
| PBL800-OQ-007 | What, if anything, currently calls the color-code-settings handler referenced by the client-side button with no corresponding file in this module? | Confirmed absent as a file under this module; could be registered elsewhere in a shared action-routing table not read in this pass. | Unknown — likely dead button, not confirmed. | Yes |

<!-- Anti-hallucination discipline: nothing here should be silently resolved by guessing in
     downstream stages. Every item stays open until explicitly answered. -->

## The single highest-priority unresolved question

Per Doc1 §08's own deduplicated open-questions log: **whether the confirmed-live "every 500-Level
pricing lookup returns 0.0000" condition (PBL800-OQ-001) reaches production customer-facing pricing
today.** This is "resolved enough to act on" only in the narrow sense that "the current dataset makes
every such lookup fail at its very first step" is itself an actionable, structurally-confirmed fact —
but the broader question (does anything downstream catch it, and has this been silently affecting
real sales orders) remains open and, per Doc3, is a **hard blocker for setting any cutover date** for
this module.
