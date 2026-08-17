# SearchLineItem — Build Guidance

> Guidance for Stage 4, stated stack-neutrally.

Source: `docs_from_blueprint/module/SearchLineItem/10-build-guidance.md`
(`blueprint/module/SearchLineItem/09-implementation-plan.md`, Doc2).

## Governing design decisions

The blueprint's implementation plan makes nine explicit, cited decisions rather than defaulting on any
of them:

- **D1** — SearchLineItem is preserved as a first-class, physically-materialized read-model, populated
  exclusively by a domain event SalesOrder's finalize process publishes — not eliminated in favor of
  querying SalesOrder's own line-item storage directly, and not merged into SalesOrder's own aggregate.
  The scale (7,074 live, actively-growing rows) and multiple real, live, multi-surface consumers (Home
  dashboard, two alert worklists, two external read consumers) already depend on this exact shape; the
  one genuine cost of keeping it — reconciliation drift between the write side and the read model — is
  closed structurally by D3, not accepted as an ongoing risk. See requirement R1.
- **D2** — security-by-construction: a parameterized query layer everywhere, closing both confirmed
  Critical SQL injections structurally, plus every related Medium/second-order finding. The new
  data-access layer makes raw string-interpolated SQL structurally unavailable to business-logic code.
  See requirement R3.
- **D3** — one authoritative margin/extension calculation service, computing the derived-financial field
  set exactly once per row, closing the confirmed formula-level divergence between two independent
  legacy writers. Both the finalize-time projection handler and any later cost-backfill process call the
  same service. A related tax-recalculation concern is folded into the same disciplined-invocation
  pattern for consistency, not because it conflicted with the margin fields (it didn't).
- **D4** — both alert flags become first-class domain events with typed, guarded dismiss commands; the
  flag that never had a real dismiss mechanism gets one, closing a live, currently-accumulating
  operational-data gap. Reasoning for building (not deferring) the new dismiss command: this flag has
  live, accumulating, real operational data (80 rows and growing) actively affected by the gap today —
  only the command's precise scope (per-row vs. the legacy script's unsafe bulk match) is left open.
- **D5** — both confirmed division-by-zero risks are closed with explicit guard clauses that reject the
  edit, not silently coerce to zero — reversing the legacy system's confirmed silent-zero outcome.
- **D6** — the two confirmed-always-blank fields (Total Before/After) are excluded from the new schema,
  not carried forward as "derived" columns; parked for migration-audit traceability, promoted only if a
  real intended computation is later identified.
- **D7** — the two confirmed-empty satellite tables are excluded from the new schema entirely, not
  migrated as empty extension points. If a live use surfaces during migration rehearsal or SME review,
  it is added as a new, purpose-built table at that point.
- **D8** — multi-tenancy is first-class, per the same repo-wide requirement carried forward by every
  module in this series. See requirement R5.
- **D9** — the confirmed Campaigns-pattern leftover files, and the module's vestigial user-facing CRUD
  scaffolding, are both excluded from the new design, not ported or rebuilt. The new design's only
  user-initiated write surfaces against this module's data are the narrow, already-live ones the
  blueprint confirms are actually exercised: the guarded inline-edit command, and the two alert-dismiss
  commands — not a generic create/edit/delete form.

## Rule-to-Enforcement-Layer Mapping Approach

Each rule should be enforced at the most appropriate layer for its nature: **domain model invariant**,
**application service**, **DB constraint**, or **closed by construction** — not all rules belong in one
layer.

| Group | Rule IDs | Count | Primary enforcement layer | Notes |
|---|---|---|---|---|
| Save.php absent-guard rules (vestigial path) | SLI-RULE-001–002 | 2 | Closed by construction | Both rules describe what the vestigial file would do if invoked, not an exercised path. Decision D9 removes this surface entirely — there is no code path to reproduce, since the only write path is the projection handler, which has its own explicit contract by construction. |
| Entity-class absent-declaration rules | SLI-RULE-003–005 | 3 | Closed by construction (003, 004) / Application service (005) | The entity's missing required-fields declaration and empty save hook are closed the same way — the projection handler's contract is explicit and typed, not an optional hook a caller can leave empty. The export-query builder's string-substitution shape becomes an application-service concern inside a unified, parameterized export builder (D2). |
| Delete lifecycle | SLI-RULE-006–008 | 3 | Application service (006) / Domain invariant (007, reframed) / Closed by construction (008) | The record-id presence check becomes the shared soft-delete command's own load precondition. The unconditional soft-delete with no referencing-data integrity check is preserved as documented — no evidence was found that anything else's referential integrity depends on a specific row surviving (this is a read-model, D1), so no new guard is invented without evidence. The unparameterized-format id gap is closed by construction — the shared query layer's typed-id parameter binding rejects a malformed id at the command's own input boundary. |
| Inline-edit ajax path | SLI-RULE-009–013 | 5 | Domain invariant (009) / Closed by construction (011, 012, 013) / Application service (010) | The record-id presence check becomes the command's own load precondition. The "any field name accepted, no allow-list" gap is closed by construction — every field-routing branch resolves against an explicit allow-list of typed domain properties. Both unguarded divisions are D5's own named closure — explicit divisor guard clauses that reject, not silently zero. The non-numeric-silently-casts-to-zero gap is closed by the same command's input-numeric-validation step. |
| Alert-dismiss ajax path | SLI-RULE-014–016 | 3 | Closed by construction (014) / Domain invariant (015, reframed) / N/A confirms-absence (016) | The Critical SQL injection is D2's own named closure. The missing state-precondition check becomes the dismiss command's own domain invariant: load the row, check it is currently flagged before transitioning to dismissed, reject otherwise. The report-generation query's confirmed injection-free shape is preserved as a structural confirmation, not a rule needing enforcement. |
| Shared search-utility library | SLI-RULE-017–019 | 3 | Closed by construction (all three) | The confirmed-clean basic-search escaping and the "safe only because current callers pre-escape" latent surface are both closed by construction — the new shared query builder parameterizes at the single point every caller routes through, so there is no unescaped concatenation primitive available to a future caller. The second Critical SQL injection is D2's other named closure. |

**Total rules mapped: 19 of 19.**

## Suggested Build Sequencing

**Sequencing rationale.** A module whose own data other modules' transactional build phases depend on
(e.g. a catalog or location-quantity core) is built early in this series' own convention. SearchLineItem
is structurally inverted relative to that case: it is a downstream read-side artifact of SalesOrder's
own finalize logic, not a prerequisite for it. Nothing in SalesOrder's own finalize process needs
SearchLineItem to exist to compute a price or record a sale — the data flows one direction only, and
every one of this module's own consumers is itself a reporting/read surface. **Reasoned placement: this
module's build belongs strictly after SalesOrder's own core finalize-process build is complete and its
finalize event contract is stable** — a downstream reporting phase, not a foundational one.

1. **Resolve blocking open decisions** — subject-matter-expert/product-owner sign-off on the items in
   `risks-and-open-questions.md` that block schema or command design, at minimum: the full
   transaction-code reference-table enumeration (SLI-OQ-002), the oversale-alert dismiss command's exact
   scope (SLI-OQ-004), and confirmation that SalesOrder's own specification has finalized the
   finalize-event contract this module subscribes to. Verify: a decision log exists before the next
   phase starts.
2. **Prerequisite gate — SalesOrder's own finalize process and event publication exist and are
   tested.** Not this module's own build effort, but a hard gating dependency tracked here because
   nothing downstream can start without it. Verify: SalesOrder's own specification confirms the finalize
   event is published on every finalize, carrying every field the margin/extension calculation service
   needs as input.
3. **Core read-model schema and the event-projection handler** — implement the entity, the shared
   parked-field reference table, the event subscriber that creates rows, and the margin/extension and
   tax-recalculation services as the handler's own computation dependencies, closing the
   formula-divergence risk from the first row written rather than retrofitting it later. Verify:
   migrations run clean; an idempotency test proves a duplicated event delivery does not create a second
   row for the same SO line; a golden-formula test reproduces every transaction-code branch documented in
   `calculations.md`.
4. **Security hardening — the shared parameterized query/search layer** that every subsequent phase's
   search/export/dismiss commands route through, closing both Critical injections and every related
   Medium/second-order finding in one piece of infrastructure rather than per-endpoint. Verify: negative
   security-regression tests reproduce the blueprint's exact cited injection payload shapes and assert
   rejection; a static-analysis check confirms no raw string-interpolated query exists in the
   search/list/export path.
5. **Alert-flag domain events, dismiss commands, and the guarded inline-edit command** — implement both
   flag states with their dismiss commands (the oversale-alert dismiss command is genuinely new, closing
   a live operational-data gap the legacy system never had), and the inline-edit command with explicit
   divisor/numeric guards. Verify: state-transition tests cover both flags' full transition tables,
   including a test proving the new oversale-dismiss command succeeds where the legacy system had no
   confirmed-reachable equivalent; division-by-zero regression tests prove both guarded paths reject
   rather than silently zero, reproducing the blueprint's own 38/31-row live-data preconditions as test
   fixtures.
6. **Outputs and cross-module read APIs** — implement the unified CSV export, both alert worklists, and
   named read interfaces for the Products/mobile-scanner/Ford-export consumers, replacing the legacy's ad
   hoc shared-script/direct-table-query patterns. Verify: a contract test exists at each named-query
   boundary; an export-fidelity test proves all seven joined-display-name substitutions match the
   blueprint's documented join map exactly.

## Test/Verification Strategy Pointer

- **Projection-handler/idempotency tests**: a duplicated finalize-event delivery must not create a
  second row for the same SO line — this module's one genuinely new idempotency requirement relative to
  a purely CRUD-shaped module.
- **Calculation-pipeline golden-output tests**: fixture-based, one case per transaction-code branch
  documented in `calculations.md`, run against both invocation sites (the finalize handler and any later
  cost-backfill process) to prove they share one formula.
- **Guard-clause regression tests**: explicit tests that a zero denominator on either special-cased
  inline-edit field produces a rejected-edit result, not a persisted zero; that a non-numeric submitted
  value is rejected, not coerced.
- **Security regression tests**: attempt each of the blueprint's documented injection payload shapes
  (the alert-dismiss id-list splice, the four unescaped dashboard-drill parameters) against the new
  command/query layer and assert rejection.
- **State-transition tests**: both alert flags' full flagged→dismissed transitions, including a negative
  test proving dismissal of a not-currently-flagged row is rejected, and a positive test proving the new
  oversale-alert dismiss command works end-to-end.
- **Query/export contract tests**: one test per named read API, asserting the interface's shape
  independent of which specific consumer (Products, the mobile scanner, the Ford export, Home) calls it.
- **Migration/data-integrity audit scripts** (not unit tests against new code): the full transaction-code
  reference-table enumeration; a re-verification that the two confirmed-always-blank fields are indeed
  blank across every tenant's data before excluding them from scope, not merely assumed from one
  snapshot; a re-run of the division-by-zero exposure counts as a read-only query before migration to
  confirm they have not grown materially.

**One test per rule ID, at minimum**: every `SLI-RULE-###` in `business-rules-and-validation.md` should
map to at least one test case in Stage 4's testing documentation, per the rule-to-enforcement-layer
mapping above.
