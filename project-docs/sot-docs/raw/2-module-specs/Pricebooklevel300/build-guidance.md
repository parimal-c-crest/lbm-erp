# Pricebooklevel300 — Build Guidance

> Guidance for Stage 4, stated stack-neutrally.

> Source: `docs_from_blueprint/module/Pricebooklevel300/10-build-guidance.md`, derived from
> `blueprint/module/Pricebooklevel300/09-implementation-plan.md` and `10-deployment-cutover-outline.md`. This
> section is guidance for however a downstream process structures its own implementation-plan and testing
> documentation — it is not itself an implementation plan, a schema migration script, or an API specification.
> Rule IDs below use this document's own `PBL300-RULE-###` numbering (see `business-rules-and-validation.md`
> for the `PBL300-VAL-###` cross-reference).

## Rule-to-Enforcement-Layer Mapping Approach

Each of the 34 business rules catalogued for this module should be enforced at the most appropriate layer for
its nature, rather than uniformly at one layer, following the source's own recommended grouping (source-file
based, so traceability from rule ID to build task stays direct):

| Rule group | Rule IDs (this doc's numbering) | Count | Suggested primary layer |
|---|---|---|---|
| Entity class + schema-drift declarations | PBL300-RULE-001-005 | 5 | Closed by construction (002, the soft-delete injection) / not reproduced (003's cross-module export mistargeting; 004/005's dead schema declarations) |
| Everyday save path's two raw-SQL blocks | PBL300-RULE-006-011 | 6 | Closed by construction (007, 010) / domain invariant (009, the GP% divide-by-zero — a guarded, typed rejection, not a silent crash) / application service (008, an explicit field-name allow-list on the new command's own input contract; 011, dead redirect code not reproduced) |
| Delete lifecycle | PBL300-RULE-012-013 | 2 | Closed by construction (012) / preserved as a domain invariant (013 — the cross-module account cleanup becomes the new plan-delete command's own cascade against the new account-assignment table) |
| Wrong-entity-class write | PBL300-RULE-014 | 1 | Closed by construction — the file is deleted, not fixed (no confirmed live caller anywhere in this module) |
| Rule-list rendering | PBL300-RULE-015-016 | 2 | Not reproduced (015 was already clean) / application service (016 — the new design has exactly one rule-list rendering surface, correctly labeled) |
| Rule-duplication feature | PBL300-RULE-017-020 | 4 | Closed by construction — rebuilt from scratch, not patched (the two structurally-broken statements have no legacy reference implementation worth preserving; the new command is built against the feature's own documented intent instead) |
| Rule-type priority reorder | PBL300-RULE-021 | 1 | Closed by construction |
| Coupon subsystem | PBL300-RULE-022-026 | 5 | Not reproduced, already clean (022, 023, 024) / application service (025 — the session-sourced user-id becomes a properly-bound parameter for consistency) / closed by construction (026 — the new rendering layer HTML-escapes every interpolated value by default) |
| Account-apply flow | PBL300-RULE-027-031 | 5 | Closed by construction (027, 028, 029, 030) / not reproduced, already clean (031) — the new account-assignment commands operate against a tier-aware assignment table, closing the cross-tier collision risk as a byproduct of the schema change, not a separate fix |
| Plan-name validation | PBL300-RULE-032 | 1 | Closed by construction, already clean — the new design additionally makes plan-name uniqueness a real data-layer constraint, not merely an app-level check |
| Campaigns-junction leftovers | PBL300-RULE-033 | 1 | Closed by construction — deleted outright |
| List-view reflection | PBL300-RULE-034 | 1 | Application service — the new rendering layer's default output-escaping closes this by the same mechanism as 026, not a special-cased fix |

**Total: 34 of 34 rules mapped, none omitted.**

(`10-build-guidance.md` §10.1)

## Suggested Build Sequencing

A recommended build order, adapted from the source blueprint's own implementation plan, sized so each phase has
a verifiable, testable completion signal:

1. **Schema** — implement the four core entities with an **id-based** rule-to-plan link (closing the legacy
   name-based FK by construction — R1 in `entities-and-fields.md`), plus a holding decision on the
   account-plan assignment table's own tier-awareness (see decisions below — explicitly not this module's own
   to finalize unilaterally). Verify: every field has a typed home; the plan-name uniqueness constraint exists
   at the data layer, not only in application code.
2. **Domain rules (invariants)** — implement every rule assigned "domain model invariant" above: the GP%
   divide-by-zero guard, the plan-delete precondition (no live rule or assignment references the plan being
   deleted, closing the legacy's own unguarded-delete finding), the coupon's own duplicate-code create-time
   guard (preserved unchanged from the legacy system, since it is a genuinely working mechanism), the
   coupon-delete ownership check (a new guard, not present in the legacy system). Verify: one test per rule ID
   at minimum.
3. **Pricing engine** — implement a single, independently-unit-testable pricing service reproducing the three
   matching branches documented in `calculations.md`, closing both confirmed formula-completeness gaps (the
   "default" branch's missing discount case; the "combined quantity discount" branch's non-functional
   default-mode configuration) so the same rule row produces the same price regardless of which branch matches
   it. Verify: reproduce the documented formulas exactly against known inputs/outputs for all three branches;
   prove by construction that a coupon-gated rule returns an explicit, typed signal rather than a silent
   zero/unset price.
4. **Rule/coupon authoring operations** — implement the capability layer implied by `screens-and-user-flows.md`
   (plan authoring, rule authoring, coupon authoring) as the operation surface backing the module's own three
   interaction surfaces, consolidated (not duplicated the way the legacy system's own two rule-list rendering
   surfaces were). Verify: exactly one rule-list rendering surface exists, correctly labeled; the rebuilt
   rule-duplication command actually completes its own primary read (closing the legacy feature's own
   confirmed-broken happy path).
5. **Account-assignment operations** — implement the account-apply/remove commands against whatever
   account-plan assignment schema shape is ultimately ratified (see decisions below), closing the cross-tier
   collision risk if the tier-aware table proposal is adopted. Verify: a contract test confirms no operation
   ever accepts a raw array element unescaped into a filter clause (closing the legacy `IN (...)` injection
   shape by construction, not merely by habit).
6. **Outputs** — implement a real, correctly-scoped export against this module's own plan-header data and this
   module's own field-permission scope (closing the legacy export's cross-module mistargeting), plus the
   coupon-list and rule-list rendering surfaces with default output-escaping (closing both confirmed XSS
   findings by construction).
7. **Cross-module & integration** — implement the module's bounded cross-module interfaces: the contract into
   the sibling `MPLPricePlan` module's own price data (preserving the confirmed one-directional "try MPL first,
   fall back to this module's own price-level lookup" precedence exactly, since changing that precedence is a
   business decision, not a default of this build guidance); the rule-delete and default-date-reset operations,
   either consolidated into this module's own bounded context or left cross-module-delegated as the legacy
   system does — a decision this document does not make unilaterally, since the blueprint itself found no
   evidence the legacy split was a deliberate design choice versus historical happenstance.

(`10-build-guidance.md` §10.2)

**Two decisions this build guidance does not finalize unilaterally** (per this document set's own rigor
principle — nothing invented, ambiguity preserved):

1. **Whether the account-plan assignment relationship becomes a tier-aware, shared table spanning all three
   pricebook tiers, or remains independently modeled per tier.** The source blueprint's own implementation plan
   proposes a shared, tier-aware table as the schema shape that closes the cross-tier collision risk by
   construction — but explicitly flags this as **pending ratification by a future cross-sibling consolidation
   pass**, since a unilateral decision by this module's own spec risks contradicting whatever the two sibling
   tiers' own specs eventually decide.
2. **Whether the coupon subsystem is built out as a genuine pricing-integration feature, confirmed to integrate
   with an existing consumer elsewhere, or formally retired.** This decision is explicitly deferred to a
   dedicated discovery task tracing the actual checkout/cart flow before any build commitment is made —
   building a coupon-discount-application service against an assumption, in either direction, would risk either
   wasted build effort (if no consumer ever existed) or a silent business-logic gap (if a real consumer exists
   and is not integrated with).

(`10-build-guidance.md` §10.3)

## Test/Verification Strategy Pointer

- **Rule-ID-traceable tests**: name or tag each test after its `PBL300-RULE-###` ID (cross-referenced to the
  source's own `PBL300-VAL-###` ID) so coverage against this module's own rule catalog is mechanically
  auditable.
- **Golden-output tests for the pricing engine**: known rule/plan-type/product inputs paired with exact
  expected outputs for all three matching branches, including the precedence ordering within a matched rule set
  and the coupon-gate signal — reproducing the documented formulas precisely, not "simplified" in a way that
  would silently change a computed price for existing plans/rules.
- **State-transition tests** covering the four independent delete/soft-delete lifecycles documented in
  `workflows.md`, explicitly including a test that the new plan-delete precondition (no live rule or assignment
  references) actually blocks deletion where the legacy system's own equivalent did not.
- **Security regression tests**: explicit negative tests reproducing each of the module's own 12 confirmed
  injection shapes, asserting each is rejected; an explicit test that no operation reachable under this
  module's own routes can write to any entity outside this module's own bounded context (closing the
  `DetailViewAjax.php`/`Campaigns`-leftover finding class by structural test, not merely by code review — see
  also `permissions.md`).
- **Critical-risk closure tests** — one dedicated, explicitly-named test per Critical Risk Register finding
  (`risks-and-open-questions.md` PBL300-RISK-001 to 004), each asserting the specific legacy failure mode is
  structurally impossible to reproduce, not merely "currently passing."
- **Migration/data-integrity audit scripts** (not unit tests against new code) — run against the legacy
  system's live data before any migration decision, to quantify: how many rule rows would be orphaned by a
  name-to-id FK resolution; whether any live plan carries a GP% value of exactly the divide-by-zero-triggering
  value; whether any live plan uses the non-functional `Combined Quantity Discount` + default-mode combination;
  whether any live account assignment shows a genuine cross-tier name collision (testing whether Risk Register
  Finding PBL300-RISK-010 has ever actually manifested, not merely a theoretical risk).

(`10-build-guidance.md` §10.4)
