# PurchaseHistory — Build Guidance

> Guidance for Stage 4, stated stack-neutrally.

Source: `docs_from_blueprint/module/PurchaseHistory/10-build-guidance.md`, itself traced to
`blueprint/module/PurchaseHistory/09-implementation-plan.md` and `10-deployment-cutover-outline.md`.

## Rule-to-Enforcement-Layer Mapping Approach

Each of the 13 rules catalogued in `business-rules-and-validation.md` should be enforced at the most
appropriate layer for its nature:

| Rule group | Rule IDs | Count | Suggested primary layer | Notes |
|---|---|---|---|---|
| Save.php's own thin validation | PH-RULE-001–003 | 3 | **Closed by construction** | Removing the general-purpose free-form save surface these rules describe closes all three: there is no field-presence gate to under-implement, no request-identifier-to-injection data flow to guard (closed jointly with the entity-class rules below), and no unchecked-success redirect to fix (the aggregator's own command handler should surface an explicit success/failure result). |
| Entity-class rules | PH-RULE-004–010 | 7 | **Closed by construction** (004, 006, 007, 008) / Application-level (005) / Domain invariant, reframed (009) / Preserved as-is (010) | The absent-required-fields finding (004) is moot once there is no general save surface left to validate. The Critical SQL injection and its first-save-branch sibling (006/007/008) are closed by the aggregator's own parameterized-by-construction write. The list-metadata naming inconsistency (005) becomes an application-service concern using consistent, fully-qualified identifiers by construction. The sort-order-parameter naming bug (009) is fixed by construction with an unambiguous parameter name. The session-key-match clean finding (010) is preserved as-is, not "fixed," since it was already correct. |
| Delete.php lifecycle | PH-RULE-011–012 | 2 | Application-level (011) / Domain invariant (012) | The record-id presence check (011) becomes the shared soft-delete command's own load precondition. The unconditional delegation to the shared delete mechanism (012) is preserved as documented — no evidence was found of a confirmed cross-module reference into a specific row that a delete could orphan, so no new guard is invented without evidence. |
| DetailViewAjax.php inline-edit | PH-RULE-013 | 1 | **Closed by construction** | The free-form field-name/value acceptance with no recompute is closed by replacing the general-purpose inline-edit endpoint with the narrower, audited manual-correction action, which always triggers the aggregator's own recompute regardless of which field was corrected. |

**Total: 13 of 13 rules mapped, none omitted.**

## Suggested Build Sequencing

1. **Schema** — implement the one core aggregate entity, excluding the two confirmed-empty satellite tables
   (the custom-field extension and the group-relation table) as normative entities — parked as a documented
   exclusion, not silently dropped. Verify: the aggregate's own five-field accumulator key and two activity
   counters plus the derived total are all typed and present; no generic dynamic-field mechanism exists.
2. **Domain rules (invariants)** — implement the soft-delete precondition and the tenant-scoping requirement
   (R4). Verify: one test per applicable rule ID at minimum.
3. **Aggregator service** — implement the single authoritative accumulate-delta service (R1), including the
   transaction-code-to-counter mapping as a strictly-typed enumeration with explicit rejection of
   unrecognized values, and the manual-correction action that always recomputes the derived total. Verify:
   reproduce the documented formula exactly against known inputs/outputs; prove by construction that no code
   path can set the derived total without invoking the aggregator.
4. **Screens/operations** — implement the read/browse/export capability layer implied by
   `screens-and-user-flows.md`. Verify: a contract test confirms the "recompute the derived total" operation
   never accepts a caller-supplied total as direct input.
5. **Outputs** — implement the one confirmed output (CSV export), reading only server-computed, persisted
   values.
6. **Cross-module publish contract** — implement the event contract the sibling PurchaseOrder module's three
   call sites publish against, coordinating with the sibling PurchaseLineItem module's own equivalent
   contract on the shared trigger-event design point.

## Test/Verification Strategy Pointer

- **Rule-ID-traceable tests**: name or tag each test after its PH-RULE-### rule ID so coverage against the
  rule catalog in `business-rules-and-validation.md` is mechanically auditable — one test per rule ID at
  minimum.
- **Golden-output tests** for the accumulate-delta formula: known buy/return-quantity inputs paired with
  exact expected `total_activity` outputs, covering the purchase-type and return-type transaction-code
  branches and the manual-correction recompute path.
- **Critical-risk closure test** — one dedicated, explicitly-named test asserting PH-RISK-001 (the confirmed
  SQL-injection failure mode) is structurally impossible to reproduce in the new implementation, not merely
  "currently passing."
- **Consolidation-regression test**: an explicit test asserting that all three of the sibling PurchaseOrder
  module's own trigger events funnel through the same single aggregator code path and produce identical
  results for identical inputs — directly guarding against the exact "two near-verbatim duplicate functions"
  drift risk the legacy system's own history already demonstrated once.
- **Migration/data-integrity audit script** (not a unit test against new code) — run against the legacy
  system's live data to check whether the historical migration script's own narrow formula divergence ever
  actually produced a discrepancy on a real row, before any migration decision is finalized about how to
  handle it (see open question PH-OQ-009).

## Cutover/scope notes (outline depth)

- PurchaseHistory's own cutover is bound to the sibling PurchaseOrder module's own release schedule — this
  module has no independent write surface once the free-form edit paths are removed, so there is no "cut this
  module over on its own timeline" option.
- All three of PurchaseOrder's own call sites should cut over atomically, or a bridging adapter should
  republish legacy writes as the new event type during a staggered cutover — a partial cutover of only some
  call sites would leave this module's own aggregate silently incomplete.
- No historical-formula-reconciliation decision is required for data migration — because all three live
  legacy writers already compute the identical formula the new design adopts unchanged, the one-time backfill
  can copy the historical counters directly, using a simple recompute-and-compare check as a correctness
  verification rather than a reconciliation decision.
- The SQL-injection finding (PH-RISK-001) is a "patch the legacy system now" item, independent of the
  rewrite's own timeline — it sits on the module's own everyday edit-save path, reachable via two
  independent routes, and should be prioritized in the legacy remediation queue at a priority comparable to
  the series' other higher-exposure findings, not the lowest-urgency tier.
- `fillinventorycost.php`'s own redesign is entirely out of this module's scope — it belongs to whichever
  module's own build guidance eventually covers the search-line-item/inventory-cost reporting domain.

(`docs_from_blueprint/module/PurchaseHistory/10-build-guidance.md` §10.1-10.4)
