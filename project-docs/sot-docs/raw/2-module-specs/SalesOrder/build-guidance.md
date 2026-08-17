# SalesOrder — Build Guidance

> Guidance for Stage 4, stated stack-neutrally.

Source: `docs_from_blueprint/module/SalesOrder/10-build-guidance.md`, ultimately derived from
`blueprint/module/SalesOrder/09-implementation-plan.md`. This section is guidance for however a
downstream process structures its own implementation-plan and testing documentation — it is not
itself an implementation plan, a schema migration script, or an API specification.

## Rule-to-Enforcement-Layer Mapping Approach

Each of the 123 business rules catalogued in business-rules-and-validation.md should be enforced at
the most appropriate layer for its nature, rather than uniformly at one layer:

- **Domain model invariant** — enforced inside the relevant business-entity boundary itself, such
  that it cannot be bypassed by any operation reaching that entity. Appropriate for rules that
  represent a fundamental correctness property of the entity's own state (e.g. quantity-on-hand
  clamping, duplicate order-number prevention, terminal-state command rejection, deposit-vs-total
  capping, double-application prevention on ROA funds).
- **Application-level orchestration check** — enforced at the level that coordinates multiple
  business entities or triggers a side effect (a notification, an external-system push, a
  cross-capability write), rather than being a property of any single entity's own state. Appropriate
  for most of the save-orchestration group, the document-management/delivery-log group's later
  items, import validation, and role-gate flags — the last of these specifically requiring that
  server-side enforcement be the *only* enforcement path in a new implementation, closing the legacy
  system's unconfirmed UI-only-enforcement gap (SO-RISK-010).
- **Data-layer constraint** — a last-resort integrity backstop (e.g. a uniqueness constraint on order
  number per tenant), not the primary enforcement point for a business rule — business rules should
  fail with a clear, specific, business-meaningful message before a generic data-layer rejection is
  ever reached.

Recommended grouping (matching business-rules-and-validation.md's own rule-catalog categories, so
traceability from rule ID to build task stays direct):

| Rule group | Rule IDs | Rule count | Suggested primary layer |
|---|---|---|---|
| Save-orchestration | SO-RULE-001–012 | 12 | Application-level orchestration (one true hard block: duplicate order number) |
| Entity-level | SO-RULE-013–024 | 12 | Domain invariant (013–016, 019–024); explicitly excluded, not reimplemented, pending confirmation (017–018, SO-OQ-023) |
| Cost/margin | SO-RULE-025–040 | 16 | Pricing-pipeline stage (domain-level pure calculation) |
| Line-item/inventory | SO-RULE-041–058 | 18 | Domain invariant (quantity clamping) + application-level projection maintenance (search/history sync) |
| Returns/clamps | SO-RULE-059–081 | 23 | Domain invariant (clamps, 059–072) + application-level side effects (delivery-log/job-linkage, 073–081) |
| Credit/ROA | SO-RULE-082–095 | 14 | Domain invariant (084–091, the money-movement core) + application-level (082/083, 092–095) |
| Miscellaneous | SO-RULE-096–123 | 28 | Mixed — domain invariant for terminal-state/duplicate/capping rules; application-level for import validation and role gates; pricing-pipeline stage for rounding rules |

**Total: 123 of 123 rules mapped, none omitted.**

## Suggested Build Sequencing

A recommended build order, sized so each phase has a verifiable, testable completion signal rather
than a subjective "looks right" checkpoint:

1. **Schema** — implement the twelve core entities (entities-and-fields.md) plus the
   fulfillment-status lookup/allow-list concepts and a holding area for the ~20 orphan/unmapped
   fields pending subject-matter-expert confirmation. Verify: every field group has a typed home; no
   generic dynamic-field mechanism exists (self-check against R1).
2. **Domain rules (invariants)** — implement every rule assigned "domain model invariant" above:
   duplicate-number prevention, inventory-deallocation gates, quantity-on-hand clamping,
   credit-application eligibility, deposit/ROA double-application prevention, terminal-state command
   rejection. Verify: one test per rule ID at minimum.
3. **State machine** — implement the three-way status split (workflows.md), including the fulfillment
   allow-list and a real audit-history write path (closing SO-RISK-019's empty-history-table finding).
   Verify: every transition documented in workflows.md's Transitions table has a corresponding test; a
   status change always produces exactly one audit record with all three status values populated.
4. **Pricing engine** — implement the calculation pipeline (calculations.md) including the
   mandatory-recomputation guarantee (R3) and the cost/margin and returns/clamps rule groups. Verify:
   reproduce the documented formulas exactly against known inputs/outputs, including the
   per-component-then-sum tax rounding and the rounding-distribution penny-plug; prove by construction
   (not just by testing) that no code path can set a total value without invoking the pipeline.
5. **Screens/operations** — implement the capability layer implied by screens-and-user-flows.md as the
   operation surface backing both client experiences (standard and Quick). Verify: a contract test
   confirms the "recalculate totals" operation never accepts a caller-supplied total as input.
6. **Outputs** — implement the shared rendering capability for the confirmed-live output types
   documented in outputs.md, all reading server-computed, persisted totals only. Resolve the liveness
   of the two legacy/standalone generators (SO-OQ-049) before deciding whether to port them at all.
7. **Cross-module & integration** — implement the bounded interfaces from integrations.md, evaluating
   synchronous-vs-asynchronous for each external integration on its own merits (the accounting-sync
   integration's asynchronous, queue-based shape is an external constraint to preserve, not a legacy
   limitation to remove; the delivery-dispatch/document-management/loyalty-platform integrations are
   candidates to move to asynchronous processing since no business requirement was found that they
   must block the finalize operation).

## Test/Verification Strategy Pointer

- **Rule-ID-traceable tests**: name or tag each test after its SO-RULE-### rule ID (see
  business-rules-and-validation.md) so coverage against the rule catalog is mechanically auditable (a
  script can grep test names against the rule catalog and report any rule with zero matching tests),
  rather than relying on manual review.
- **Golden-output tests** for the pricing pipeline: known line-item/tax/deposit inputs paired with
  exact expected outputs, reproducing the documented formulas in calculations.md precisely — including
  rounding behavior that might look "simplifiable" to an engineer unfamiliar with why it's shaped that
  way, but which is a deliberate, documented business rule.
- **State-transition tests** covering every transition in workflows.md's Transitions table, explicitly
  including a test that asserts the legacy re-finalize defect (SO-RISK-004) cannot occur in the new
  implementation.
- **Security regression tests**: an explicit negative test reproducing the exact
  structure-controlling-input pattern described in SO-RISK-001, asserting it is rejected; explicit
  tests attempting to bypass each role-gated action (SO-RISK-010) via a direct operation call rather
  than only through a screen, asserting server-side rejection.
- **Critical-risk closure tests** — one dedicated, explicitly-named test per Critical finding
  (SO-RISK-001 through SO-RISK-003 in risks-and-open-questions.md), each asserting the specific legacy
  failure mode is structurally impossible to reproduce, not merely "currently passing."
- **Migration/data-integrity audit scripts** (not unit tests against new code) — run against the
  legacy system's live data to quantify how many records fall into each documented anomalous bucket
  (workflows.md's Open items; SO-RISK-018) before any migration decision is made about how to handle
  them.

---

*This file, together with the module's overview, entities, business rules, calculations, workflows,
outputs, integrations, screens/user-flows, permissions, and risks/open-questions files, forms the
complete tech-agnostic SalesOrder module specification.*
