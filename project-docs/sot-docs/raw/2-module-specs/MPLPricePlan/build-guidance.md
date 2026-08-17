# MPLPricePlan — Build Guidance

> Guidance for Stage 4, stated stack-neutrally.

Source: `docs_from_blueprint/module/MPLPricePlan/10-build-guidance.md`, itself drawn from
`blueprint/module/MPLPricePlan/09-implementation-plan.md` (drafted, not yet reviewed by its own author per
its own document-control header) and `blueprint/module/MPLPricePlan/10-deployment-cutover-outline.md`
(outline depth only). This section is guidance for however a downstream process structures its own
implementation-plan and testing documentation — it is not itself an implementation plan, a schema
migration script, or an API specification.

## Rule-to-Enforcement-Layer Mapping Approach

Each of the 29 business rules catalogued in `business-rules-and-validation.md` should be enforced at the
most appropriate layer for its nature, rather than uniformly at one layer:

- **Closed by construction** — the injection-shaped rules (14 of the 29) are not "fixed" one at a time;
  the recommended approach is a data-access layer that makes raw string-interpolated SQL structurally
  unreachable from business-logic code at all, so every write (rule-scope save, plan-level grid save,
  location-copy fan-out, ajax task) resolves against a parameterized query builder or equivalent — closing
  the module's four Critical risk-register findings (`risks-and-open-questions.md` MPL-RISK-001 through
  004) by construction, not by remembering to escape one more time.
- **Domain model invariant** — enforced inside the relevant business-entity boundary itself. Appropriate
  for the plan-delete usage guard (the module's one real, working integrity check), a new
  ownership/cascade guard for rule-delete, and the `GP%`/formula/zero-price typed-result handling in the
  calculation service.
- **Application-level orchestration check** — enforced at the level that coordinates multiple entities or
  triggers a side effect. Appropriate for the plan-assignment write path (coordinating with the Products
  capability), the location-uniformity fan-out's confirmation-step UX addition, and import-time assignment
  resolution.
- **Data-layer constraint** — a last-resort integrity backstop, not the primary enforcement point.

A recommended grouping (matching the rule catalog's own categories):

| Rule group | Rule IDs | Rule count | Suggested primary treatment |
|---|---|---|---|
| Entity-class rules | MPL-RULE-001–004 | 4 | Closed by construction (001, 002 — the empty hooks are simply not reproduced; the new command's own contract is explicit and typed) / Application-level fix (003 sort-fields, 004 export-query) |
| Plan-save rule-scope block | MPL-RULE-005–017 | 13 | Closed by construction (007–012, the 8 injection statements) / Application-level (005, 006, 013, 014, 016) / Domain invariant (015, reframed as a UOM-type enum validation) |
| Delete lifecycle | MPL-RULE-018–019 | 2 | Closed by construction (019 — file removed entirely, not merely fixed) / N/A (018 — not reproduced; the real delete path is the only one that exists in the new design) |
| Rule Section read path | MPL-RULE-020–021 | 2 | Closed by construction |
| Ajax handler tasks | MPL-RULE-022–029 | 8 | Closed by construction / Domain invariant (023, the usage guard, preserved exactly, now correctly parameterized) |

**Total: 29 of 29 rules mapped, none omitted.**

## Suggested Build Sequencing

The source blueprint's own draft implementation plan (status: drafted, not yet reviewed) makes eight
explicit design decisions, restated here as build-guidance inputs rather than settled fact — this document
does not elevate an unreviewed draft to confirmed requirement status, but preserves its reasoning for
whoever reviews it next:

1. **Security-by-construction** closes the widest confirmed injection surface of any module in this series
   with one structural change: no raw string-interpolated SQL reachable from business-logic code at all.
2. **The wrong-table-delete script (`DeleteRule.php`) is deleted outright, not merely fixed** — its entire
   premise is a copy-paste leftover, redundant with the already-correctly-scoped rule-delete task once
   that task is itself parameterized. See `permissions.md` for the authorization gap this closes.
3. **The Rule sub-entity's fate is an explicit, human-owned Phase-0 decision, not silently rebuilt or
   silently dropped** — carried into the new schema as a dormant, feature-flagged capability (schema
   present, no default pricing-engine consumer wired up) pending that decision.
4. **A first-class calculation service becomes the one authoritative home for the traced
   formula/precedence logic**, replacing the shared utility function's in-line, un-unit-tested
   implementation — independently testable, with typed invalid-formula/zero-price/division-by-zero
   results rather than silent drops.
5. **The plan-assignment relationship becomes an explicit, first-class table within a clearly-owned
   bounded context**, replacing the legacy cross-module column ownership — without changing which
   capability (Products) triggers the assignment.
6. **The location-uniformity toggle's two modes are both preserved** — this is treated as a genuine,
   apparently-intentional business capability, not merely a bug — but the uniform-copy action gains an
   explicit confirmation step naming which/how-many locations will be overwritten, closing the "silent"
   half of the footgun without removing the capability itself.
7. **The legacy plan-header JSON column is excluded from the new schema**, migrated only as a one-time
   backfill source.
8. **Multi-tenancy is first-class** — every entity carries a tenant reference.

A recommended build order, sized so each phase has a verifiable, testable completion signal:

1. **Schema** — implement the plan header, per-location grid, shared pricing-level reference data, and the
   plan-assignment relationship as first-class tables; carry the Rule sub-entity's schema forward as a
   dormant capability pending its Phase-0 decision (item 3 above). Verify: every field group has a typed
   home; no generic dynamic-field mechanism is introduced (this module already has none — a self-check
   against regression, not a fix).
2. **Domain rules (invariants)** — implement the plan-delete usage guard exactly as documented, and the
   rule-delete ownership/cascade guard the legacy system never had. Verify: one test per rule ID at
   minimum.
3. **Calculation service** — implement the six-formula switch, the precedence chain, the explicit `GP%`
   division guard, and the typed invalid-formula/zero-price/division-by-zero results. Verify: reproduce
   the documented formulas exactly against known inputs/outputs, including the confirmed `value=100`
   divide-by-zero case as an explicit, named regression test that must return a typed error, not an
   infinite/undefined value.
4. **Save-time validation** — allow-list `take`/`formula` and range-validate `value` at save time
   (closing MPL-RULE-014's "any string accepted" gap), rather than only at compute time. Verify: a
   malformed plan grid is rejected at authoring time with a specific error, before it can ever reach a
   live sale line.
5. **Screens/operations** — implement the capability layer implied by `screens-and-user-flows.md` as the
   operation surface backing the plan edit screen's two authoring fragments. Verify: the plan-assignment
   write path is only ever reachable through the Products-capability contract, never written directly by
   this module's own screens.
6. **Outputs** — implement a real, working export against the plan header's actual columns, replacing the
   broken stub; the list/edit-screen fragments carry forward largely unchanged in kind.
7. **Cross-module & integration** — implement the module's bounded interfaces, resolving the
   caller-enumeration open question for the shared pricing-computation function's SalesOrder/Quotes
   callers before treating this phase as complete (a hard blocker per the deployment notes below).

### Deployment/cutover notes (outline depth only, per the source blueprint)

- **The full caller enumeration of the shared pricing-computation function is a hard blocker for setting a
  cutover date**, not merely a nice-to-have — a tenant left with the pricing flow still calling the legacy
  function against already-migrated assignment data would silently price every line off stale/absent
  assignment data.
- **The wrong-table-delete script's cross-module data-corruption risk deserves same-day legacy-system
  remediation independent of the rewrite timeline** — a minimal patch (delete the file, or at minimum
  disable its route) should not wait for this module's own full remediation sequencing, because it
  corrupts a different module's live data.
- **A tenant-level pre-cutover check is recommended**: whether that tenant's live data includes a `GP%`
  value of exactly `100` anywhere in its grids — if so, that tenant's backfill should flag the row for
  review before cutover, since the new calculation service will reject it outright rather than silently
  producing an infinite/undefined value the way the legacy path does.
- **The Rule sub-entity's cutover is contingent on its Phase-0 decision** (item 3 above) — if the decision
  is to retire the feature, its schema still migrates as dormant capability but its UI need not ship at
  cutover; if the decision is to build the missing consumer, that is a materially larger scope addition
  needing its own build-phase estimate first.

## Test/Verification Strategy Pointer

- **Rule-ID-traceable tests**: name or tag each test after its MPL-RULE-### rule ID so coverage against
  this module's rule catalog is mechanically auditable.
- **Golden-output tests** for the calculation service: known take/formula/value/UOM inputs paired with
  exact expected outputs, reproducing all six documented formulas precisely — including the
  `Times`-formula's `value=0`-coerced-to-`1` behavior, which might look like a bug to an engineer
  unfamiliar with why it's shaped that way, but is the legacy system's actual, documented behavior worth
  confirming is intentional before either preserving or changing it.
- **Security regression tests**: an explicit negative test per confirmed injection point (MPL-RISK-001
  through 004 in `risks-and-open-questions.md`), asserting each is structurally impossible to reproduce in
  the new design — not merely "currently passing."
- **Critical-risk closure tests** — one dedicated, explicitly-named test per Critical finding, each
  asserting the specific legacy failure mode (wrong-table write, each injection surface) is structurally
  impossible to reproduce.
- **Formula-defect regression tests** — a dedicated test asserting `GP%` at `value=100` returns a typed
  error rather than an infinite/undefined result; a dedicated test asserting an unrecognized `formula`
  string is rejected at save time, not silently accepted and silently dropped at compute time.
- **Migration/data-integrity audit scripts** (not unit tests against new code) — run against the legacy
  system's live data to quantify, per tenant, how many `leveljsondata` rows carry a `GP%` value of exactly
  `100` before any migration decision is made about how to handle them.
