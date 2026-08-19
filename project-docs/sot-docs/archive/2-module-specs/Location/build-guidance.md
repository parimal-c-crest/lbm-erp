# Location — Build Guidance

> Guidance for Stage 4, stated stack-neutrally.

Source: `blueprint/module/Location/09-implementation-plan.md` (the source blueprint's own
implementation-plan draft) + `10-deployment-cutover-outline.md` via
`docs_from_blueprint/module/Location/10-build-guidance.md`. This is guidance for however a downstream
process structures its own implementation plan and testing documentation — not itself an
implementation plan, a schema migration script, or an API specification.

## Why this module's build guidance carries structural weight beyond its own screens

This module is the inventory/QoH scoping backbone — every module dealing with sales, purchasing,
inventory, pricing, or reporting joins against this module's own identity to scope its own data and to
read quantity-on-hand as ground truth (`integrations.md`). This module's Critical findings are judged
to have the broadest blast radius of any module blueprinted in this series to date, because a
corrupted or negative QoH figure does not stay contained inside this module's own files — it silently
propagates into every downstream sale-eligibility check, reorder calculation, and financial-valuation
figure. This module's domain-model decisions (especially the QoH non-negative guard) and security
posture are treated as load-bearing for the rest of a build program, the same way an identity/
authorization core would be load-bearing for every other module.

## Governing domain-model decisions

The five most directly load-bearing decisions (the data-model-shaping subset, R1-R7, is covered in
full in `entities-and-fields.md`):

- **Cost-basis policy on part supersession**: the quantity-merges-but-cost-doesn't-blend asymmetry
  (`calculations.md` §10) is replaced by one documented policy — a true weighted-average cost recompute
  as the default, computed atomically in the same transaction as the quantity merge, with the legacy
  "overwrite wholesale" behavior preserved as an explicit, intentional alternate mode. **Flagged for
  subject-matter-expert sign-off before this phase of a build**, since it changes what a
  part-supersession event does to a live financial figure other calculations depend on.
- **Reorder-point calculation ownership**: the current shape (Customreport owns the arithmetic and
  writes its result back into this module's own table via a dynamically-selected field name — a
  bounded-context violation, LOC-OQ-002) is replaced by bringing the calculation inside this module's
  own boundary, since every input the calculation needs is already this module's own data; Customreport's
  role becomes a purely read-only reporting layer with no write-back path.
- **The WMS bidirectional write path** is replaced by an explicit event/command contract in both
  directions — this module publishes an event on every QoH mutation for WMS to subscribe to instead of
  polling/joining this module's own table directly, and a WMS-originated QoH change calls this module's
  own shared write command instead of WMS code reaching into this module's schema. Neither module
  writes into the other's tables under any circumstance.
- **The sparse-history demand-formula divisor bias** (`calculations.md` §2-3) is **flagged for
  subject-matter-expert statistical sign-off, not silently corrected** — the new calculation service is
  built with the divisor behavior as an explicit, named parameter rather than hardcoding either the
  legacy's biased behavior or its unbiased sibling formula's behavior.
- **Security-by-construction**: the new data-access layer makes raw string-interpolated SQL
  structurally unavailable to business-logic code, and additionally makes dynamic column-name
  construction from request input structurally unavailable — directly closing every one of this
  module's six confirmed SQL-injection points (LOC-RISK-002 through 007), three of which are
  specifically the "the field/column *name* itself is attacker-controllable, not just the value" shape.

## Rule-to-Enforcement-Layer Mapping Approach

Each rule in `business-rules-and-validation.md` should be enforced at the most appropriate layer for
its nature, rather than uniformly at one layer:

- **Domain model invariant** — enforced inside the relevant business-entity boundary itself, such that
  it cannot be bypassed by any operation reaching that entity. Appropriate for the non-negative QoH
  invariant (R2 in `entities-and-fields.md`), the record-load-guard rules, and the Total-Available floor.
- **Closed by construction** — the legacy failure mode is structurally unavailable in the new design,
  not merely guarded against. Appropriate for findings that are really absences of a safeguard rather
  than a guard that can be bypassed — e.g. the entity save hook's "nothing ever aborts" finding, the
  disabled no-op-guard-on-the-merge-branch bug, the two-calls-per-field-edit stale-session-probe
  structure, and the field-level ajax endpoint's zero-validation finding.
- **Application-level orchestration check** — enforced at the level that coordinates multiple business
  entities or triggers a side effect. Appropriate for the save/delete entry-point presence checks, the
  confirmation-screen session-consistency check, and the formula-field default-fill behavior.
- **Superseded by a design decision** — some legacy rules are not carried forward as rules at all,
  because the underlying mechanism they governed no longer exists in the new design. The kit-QoH
  delta-computation rules (LOC-RULE-014-017) are the clearest example: once kit quantity is always
  computed from component quantities (R3 in `entities-and-fields.md`), there is no independently-
  writable kit QoH left for a delta computation to apply to.

Recommended grouping (matching the rule catalog's own categories in `business-rules-and-validation.md`,
so traceability from rule ID to build task stays direct):

| Rule group | Rule IDs | Count | Suggested primary layer |
|---|---|---|---|
| Save entry-point | LOC-RULE-001–002 | 2 | Application-level orchestration |
| Entity-save-hook | LOC-RULE-003–006 | 4 | Domain invariant (003, 004) / closed by construction (005, 006) |
| Core QoH write (manual) | LOC-RULE-007–010 | 4 | Domain invariant (007, 009) / closed by construction (008, 010) |
| QoH confirmation screens | LOC-RULE-011–012 | 2 | Application-level orchestration |
| Kit-labeled QoH write | LOC-RULE-013–017 | 5 | Superseded by the kit-quantity-as-computed decision (R3) |
| Part-supersession linking/creation | LOC-RULE-018–021 | 4 | Domain invariant (018) / application-level (019, 020) / closed by construction (021) |
| Delete | LOC-RULE-022 | 1 | Application-level orchestration |
| Formula-field / lost-sale engine | LOC-RULE-023–028 | 6 | Application-level (023, 026, 027) / domain invariant (024, 025) / not carried forward (028, confirmed inert) |
| Field-level ajax save | LOC-RULE-029–031 | 3 | Closed by construction (029, 030) / application-level (031) |

**Total: 31 of 31 rules mapped, none omitted.**

## Suggested Build Sequencing

A recommended build order, sized so each phase has a verifiable, testable completion signal rather
than a subjective "looks right" checkpoint:

1. **Resolve blocking open decisions** — sign-off on the items that block later phases: the untraced
   reorder-point arithmetic (LOC-OQ-002), the untraced Forecasting write-surface file (LOC-OQ-005), the
   branch-operational-closure product-owner question (LOC-OQ-003), the CIP-EP/CIPW enablement-flag
   relationship (LOC-OQ-004), and the cost-basis and sparse-history-divisor sign-offs above. Verify: a
   decision log, one entry per resolved item, exists before Phase 1 starts.
2. **Core schema** — the branch header and Product-at-Location entities (with Product-at-Location's own
   first-class identity per R1), plus the audit-log entity, with tenant scoping (R5) and the shared
   data-access layer's parameterized/no-dynamic-column-name posture built as reusable infrastructure
   from the start. Verify: migrations run clean; every field group in `entities-and-fields.md` has a
   typed home; a test confirms the data-access layer rejects a raw string-interpolated query attempt.
3. **QoH core** — the single shared QoH-write command, the non-negative invariant, the audit-log write,
   and the QoH-change event publication. **This phase's output is the hard prerequisite every other
   module's own inventory-scoping logic needs** — treat as blocking for SalesOrder/Products/WMS
   cross-module integration work. Verify: a boundary test proving quantity-on-hand cannot be persisted
   below zero across every caller of the command; a concurrency test proving two simultaneous commands
   against the same row do not silently lost-update (closes LOC-RISK-008).
4. **Security hardening** — close the six confirmed injection points by construction (LOC-RISK-002
   through 007), even though some of their owning commands (kit adjustment, part supersession, the lost-
   sale report) aren't built until later phases — ensure the shared data-access layer makes every cited
   vulnerable pattern unavailable before those commands exist to misuse it. Verify: six negative
   security-regression tests, one per confirmed injection finding, reproducing the exact cited payload
   shape and asserting rejection.
5. **Part supersession** — the domain event (R4), the merge service, and the cost-basis policy once
   Phase 1's sign-off is available. Verify: state-transition tests covering the transition table
   (including the deliberately-absent reverse path); a golden-output test for both cost-basis modes
   against known inputs.
6. **Kit quantity** — the computed-kit-quantity service (R3), the Products-module interface query
   contract, and the redesigned kit-adjustment UI routing to component-level quantity commands. Verify:
   a test proving a kit product's computed available quantity always exactly reflects its components'
   current on-hand quantity — no independently-stored kit QoH exists to drift from it, verified by
   construction (a schema-level check, not just a behavioral one).
7. **Demand/reorder-point calculation pipeline** — the demand-formula calculator (once the
   sparse-history-divisor sign-off is available) and the reorder-point calculator (once LOC-OQ-002 is
   resolved). Verify: golden-output tests reproducing the documented formulas exactly, including the
   deliberately-preserved "skips blackout days, not weekends" behavior; a regression test confirming
   the reporting layer has no write-back path into this module's own table.
8. **Lost-sale/false-loss pipeline and accounting configuration** — the accumulate-then-promote
   pipeline (with the compounding-factor fix, LOC-RISK-011), the redesigned scheduled admin
   notification (closing LOC-RISK-018), and the GL-account-mapping/integration-credential entities with
   secrets-encrypted credential storage (R6, R7). Verify: a test proving the lost-sale factor is applied
   once per event, not compounded; a static schema-introspection test proving no credential field is
   capable of holding a plaintext secret.
9. **Cross-module integrations and outputs** — the bounded-context interfaces (Forecasting/vendor/
   export/autocomplete/B2B subscription to the supersession event, WMS's subscription to the
   QoH-changed event), and the output catalog (Lost Sale Log Report, Cost Detail tooltip,
   Product-at-Location display/edit surfaces). Verify: contract tests at each bounded-context boundary,
   including an idempotent-double-delivery test for the supersession event; snapshot tests for each
   output type.

## Test/Verification Strategy Pointer

- **Rule-ID-traceable tests**: name or tag each test after its `LOC-RULE-###` id so coverage against
  the business-rule catalog is mechanically auditable (a script can grep test names against the rule
  catalog and report any rule with zero matching tests).
- **Golden-output tests** for the calculation pipeline (`calculations.md`): known sales-history/receipt
  inputs paired with exact expected outputs, reproducing the documented formulas precisely — including
  the deliberately-preserved "next working day" blackout-only behavior and the hard-coded no-history
  fallback, which might look "simplifiable" to an engineer unfamiliar with why they're shaped that way.
- **Security regression tests**: an explicit negative test reproducing each of the six documented
  injection payload shapes and asserting rejection, not merely "no crash" — including the two
  request-derived *column-name* shapes, asserted via a whitelist-rejection test, not just a
  value-escaping test.
- **Boundary-inclusive invariant tests**: the negative-QoH test should specifically cover the exact
  boundary (quantity zero minus one), not just an obviously-negative value, against every caller of the
  shared QoH-write command.
- **Concurrency tests**: two simultaneous QoH-adjustment commands against the same row, asserting a
  correct serialized outcome or an explicit, retriable conflict — never a silent lost update.
- **Migration/data-integrity audit scripts** (not unit tests against new code) — run against the
  legacy system's live data to quantify: how many rows fall into each documented ambiguous/orphan field
  bucket (`entities-and-fields.md` Known Gaps); whether any existing row already holds a negative QoH
  value today (the non-negative-invariant retrofit cannot simply add a constraint and assume it will
  pass); how large the legacy-vs-computed discrepancy is for kit products once kit quantity becomes
  computed rather than independently stored (discrepancies are the *expected*, already-existing state
  per the confirmed absence of kit-component propagation, not a migration bug); and that the
  ~97-column-to-normalized-row GL-mapping transform reproduces every legacy value with no data loss.

## Deployment/cutover posture (kept at outline depth, per the source blueprint)

Full-depth deployment/cutover planning is explicitly deferred by the source blueprint itself until a
technology stack is chosen and at least one pilot module's own cutover has been attempted. The
load-bearing points worth carrying into any downstream planning:

- **This module is not a peer module that can be phased independently the way a more bounded module
  can** — it is read as ground truth by essentially every transactional module, so its own QoH-write
  core is a hard prerequisite for other modules' own cutover phases.
- **The WMS relationship is the one dependency that plausibly forces a combined cutover unit** —
  because it is genuinely bidirectional, a "new module, old screens" bridge shape covers the read side
  but not obviously the write side; either this module and WMS cut over together, or a temporary
  translation shim is built for the cutover window only. Flagged as **cutover-blocking**, given the
  confirmed SQL-injection point (LOC-RISK-005) sits directly on this same code path.
- **A parallel-run window for QoH should be scoped as shadow-write verification with reconciliation,
  not blind dual-write** — dual-writing quantity-on-hand across a legacy system with no floor check and
  a new system with a hard non-negative invariant risks the two systems disagreeing on whether a given
  adjustment is even valid.
- **Migration-specific risks, each a real transform or data-quality check, not a straight row-copy**:
  promoting Product-at-Location to a first-class entity with a new surrogate identity is a structural
  remap affecting every module that currently references it by its legacy composite key; the
  negative-QoH-invariant retrofit needs a pre-flight audit for any already-negative live row before a
  constraint can safely be added; the kit-QoH-becomes-computed transform needs a migration-time
  reconciliation report; credential migration for payment-gateway/vendor-integration secrets is a
  distinct, higher-sensitivity lane requiring validation that zero plaintext credential values survive
  into the new schema in any form.
- **The module's five Critical security/correctness findings (LOC-RISK-001 through 005) need
  legacy-system remediation now, independent of any rewrite/cutover timeline.**
