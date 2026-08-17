# SalesHistory — Build Guidance

> Guidance for Stage 4, stated stack-neutrally.

Source: `docs_from_blueprint/module/SalesHistory/10-build-guidance.md`, tracing to
`blueprint/module/SalesHistory/09-implementation-plan.md` (Doc2), cross-referenced against
`10-deployment-cutover-outline.md` (Doc3) for deployment-facing material kept at outline depth.

## The Module's Central Design Question

Every prior module's own build guidance in this series has had to decide, at most, whether to preserve
a single legacy write path or replace it with a cleaner one. SalesHistory's own blueprint establishes a
genuinely harder starting condition: **four independent legacy writers, three of them carrying
confirmed-divergent formulas for the same derived field, one of them asynchronous, none of them
coordinating with any locking mechanism**. The source blueprint frames this module's central decision
not as "keep or eliminate a read-model" but as **"how many event sources feed one canonical aggregate,
and who owns the one formula"** — preserved here as the organizing principle for everything below.

## Rule-to-Enforcement-Layer Mapping Approach

Each of the 16 business rules catalogued in `business-rules-and-validation.md` (plus the unnumbered
shared-infrastructure finding) should be enforced at the most appropriate layer for its nature:

| Rule group | Rule IDs | Count | Suggested primary layer | Notes |
|---|---|---|---|---|
| Save-path key-lookup & injection | SLH-RULE-001–003 | 3 | Closed by construction (001) / Application-level command validation (002-003) | SLH-RULE-001 (the first Critical injection) is closed as a byproduct of replacing the raw existing-row lookup with a parameterized-by-construction read inside the one authoritative service (`calculations.md`), not by remembering to escape one more query. SLH-RULE-002's five-field presence gate becomes the write-command's own required-field validation; SLH-RULE-003's absent type/format checking becomes typed command parameters. |
| Accumulator arithmetic | SLH-RULE-004–005 | 2 | Closed by construction | Both rules are closed by the authoritative service's own typed event/command payloads — a delta is a validated number by the time it reaches the formula. |
| Save-path structural gaps | SLH-RULE-006–007 | 2 | Domain invariant (006) / Closed by construction (007, the second Critical injection) | SLH-RULE-006 becomes the write-command's own explicit success/failure result. SLH-RULE-007 is closed by making the side-effect write part of the same transaction the authoritative service commits, through the same parameterized data-access layer as every other write. |
| Entity-class rules | SLH-RULE-008–011 | 4 | Closed by construction (008, 009) / Application-level service (010) / Domain invariant, reframed (011) | SLH-RULE-008/009 are closed via one shared, parameterized write path. SLH-RULE-010 becomes an application-service concern inside a unified, parameterized export-query builder. SLH-RULE-011 (sort-order session-key mismatch) is fixed by construction: one consistently-named session/preference key, not two kept in sync by convention. |
| Delete-path lifecycle | SLH-RULE-012–013 | 2 | Application-level service (012) / Domain invariant (013) | SLH-RULE-012's presence check becomes the shared soft-delete command's own load precondition. SLH-RULE-013 is preserved as documented — no confirmed cross-module reference into a specific row that a delete could orphan was found, so no new guard is invented without evidence. |
| Inline-edit (correction) path | SLH-RULE-014–016 | 3 | Domain invariant (014) / Closed by construction (015) / Application-level service (016) | SLH-RULE-014's presence check becomes the correction-command's own load precondition. SLH-RULE-015 (mass-assignment gap) is closed by construction via an explicit allow-list of typed properties. SLH-RULE-016 becomes the same one-authoritative-formula recompute the whole module funnels through — always run, always surfaced in the command's own typed response. |
| Shared side-effect injection | *(unnumbered, cited under SLH-RULE-007)* | 1 | Closed by construction | Same closure as SLH-RULE-007 — its successor write goes through the identical parameterized layer as every other write. |

**Total: 16 of 16 numbered rules mapped, plus the unnumbered shared-infrastructure finding, none
omitted.**

## Suggested Build Sequencing

1. **Schema** — implement the one core entity with the week-boundary collapse (R3) and the parked-field
   holding area (R4) for fields with no confirmed writer. Verify: no generic dynamic-field mechanism
   reintroduced; parked fields genuinely excluded from active business logic, not silently promoted.
2. **The one authoritative aggregator service** — implement the single service described in
   `calculations.md`, including its own typed event/command contracts for each legacy writer's business
   role (a sale, a lost-sale detection, a correction) and its own per-key serialization. Verify: a
   contract test confirms no code path outside this service can write `total_activity`; a concurrency
   test confirms two simultaneous writes for the identical key never silently overwrite each other's
   effect.
3. **Domain rules (invariants)** — implement every rule assigned "domain invariant" above: the
   five-field key presence/type validation, the record-id load preconditions on delete and correction.
   Verify: one test per rule ID at minimum.
4. **Read/search/export surface** — implement the capability layer implied by `screens-and-user-flows.md`,
   including the one CSV export output (`outputs.md`), all reading the authoritative service's own
   persisted totals only. Verify: the export's own query construction is parameterized by construction,
   matching R2's structural closure of the injection findings.
5. **Cross-module event contracts** — implement the publish-side contracts for SalesOrder and Location
   (`integrations.md`), and the named read-query interface the `Customreport/` consumer family should
   use instead of direct table access. Verify: SalesOrder's and Location's own publishers each carry
   only the delta each is authoritative for, and neither independently restates the formula.

This sequencing follows schema → single-writer service → domain invariants → read/export surface →
cross-module contracts, adjusted from the standard template ordering because this module's dominant
dependency is the multi-writer coordination problem (step 2), not its workflow/state machine (this
module has none — see `workflows.md`).

## Test/Verification Strategy Pointer

- **Rule-ID-traceable tests**: name or tag each test after its SLH-RULE-### ID so coverage against
  `business-rules-and-validation.md` is mechanically auditable.
- **Golden-output tests** for the formula: known counter inputs paired with exact expected
  `total_activity` outputs, reproducing whichever canonical formula is ultimately confirmed
  (`calculations.md` §"Required resolution", pending SME sign-off) precisely — including a dedicated
  test asserting the confirmed two-against-one `|transfer_out_qty|` divergence cannot recur once the
  one-authoritative-service design is built, and a dedicated test reproducing SalesOrder's own
  confirmed structurally-incomplete new-row formula to prove the new design's equivalent path does not
  omit any of the six terms.
- **Concurrency tests** covering the locking gap (SH-RISK-004): two simultaneous writes for the
  identical key (simulating, e.g., a cron-triggered lost-sale event landing between a live save's own
  read and write) must not silently lose either write's effect.
- **Security regression tests**: explicit negative tests reproducing the exact raw-string-interpolation
  pattern described in SH-RISK-001/002, asserting both are structurally impossible to reproduce in the
  new data-access layer — not merely "currently passing."
- **Critical-risk closure tests** — one dedicated, explicitly-named test per Critical finding
  (SH-RISK-001/002), each asserting the specific legacy failure mode is structurally impossible to
  reproduce.
- **Migration/data-integrity audit scripts** (not unit tests against new code) — kept at outline depth
  per the source blueprint's own deployment outline: (a) quantify how historical rows' stored
  `total_activity` values compare against a re-derivation using the new canonical formula, since the
  recommended migration default is to **recompute, not copy**, every historical row's total from its
  own already-stored six counters (a lower-risk migration since all six counters are already persisted
  directly on each row); and (b) verify whether the four week-boundary columns' live values genuinely
  agree with a pure week/year-based derivation for every tenant's data before the R3 schema collapse is
  finalized. Both audit scripts, and the wider three-source cutover-sequencing decision (all three
  event sources — SalesHistory's own save form, SalesOrder, Location — must coordinate cutover timing,
  since no safe partial-cutover state exists for fewer than all three), are deployment-facing detail
  belonging to whatever downstream deployment plan a technology-stack decision eventually produces.

(Source: `docs_from_blueprint/module/SalesHistory/10-build-guidance.md`, full file.)
