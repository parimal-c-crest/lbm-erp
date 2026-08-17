# Pricebooklevel200 — Build Guidance

> Guidance for Stage 4, stated stack-neutrally.

Source: `docs_from_blueprint/module/Pricebooklevel200/10-build-guidance.md`, itself transcribed from
`blueprint/module/Pricebooklevel200/09-implementation-plan.md` ("Doc 2") and
`10-deployment-cutover-outline.md` ("Doc 3", outline depth only, per the source blueprint's own stated project
convention). This section is guidance for however a downstream process structures its own implementation-plan
and testing documentation — it is not itself an implementation plan, a schema migration script, or an API
specification.

## Rule-to-Enforcement-Layer Mapping Approach

Each of the 42 business rules catalogued in `business-rules-and-validation.md` should be enforced at the most
appropriate layer for its nature (data constraint, domain invariant, or application-level check), rather than
uniformly at one layer. The source blueprint's own implementation plan groups the 42 rules as follows:

| Rule group | Rule IDs | Count | Suggested primary treatment |
|---|---|---|---|
| Entity-class findings | PBL200-RULE-001 to 005 | 5 | Closed by construction (001, redundant save logic folded into the command itself) / Application-service fix (002-003, thin field-declaration and Postgres-leftover fixed as ordinary bugs) / **Not reproduced** (004-005, the dead legacy entity class and its redeclaration hazard are simply not ported) |
| Save action rule-update block | PBL200-RULE-006 to 011, 019-020 | 8 | **Closed by construction** (008, 020 — the duplicated raw-SQL injection, parameterized) / Domain invariant (007, 019 — the mass-assignment gap, closed by an explicit allow-list of writable columns) / Application service (009, 011 — the GP-recalculation trigger and display-config build, ported as ordinary computed fields) — the two independent legacy implementations are consolidated into one command, closing the "fix one, miss the other" risk PBL200-RISK-003 explicitly calls out |
| Standard controllers | PBL200-RULE-012 to 013 | 2 | Application service (012 — the undefined-variable bug, fixed as an ordinary defect) / **Not reproduced** (013 — the dead Postgres-only leftover) |
| Delete lifecycle | PBL200-RULE-014 | 1 | **Closed by construction** — correct entity targeted, new usage guard added (verify no live account assignment still references the sheet before allowing deletion) |
| "100 level"-referencing dead code | PBL200-RULE-004-005 (entity class), 015-016, 023-024 | — | **Not reproduced** |
| Job/account existence checks | PBL200-RULE-017 to 018 | 2 | Closed by construction (017, second-order injection, parameterized) / Application service (018 — the unimplemented duplicate-name check becomes a real, working uniqueness check on the sheet's own name, per tenant) |
| Rule-list grid | PBL200-RULE-021 to 022 | 2 | N/A (021, already clean) / **Closed by construction** (022 — the session-value chain is moot once no code path constructs an unparameterized criteria string from a session value at all) |
| GP color-code settings | PBL200-RULE-025 to 028 | 4 | N/A (025, 027-028, already clean — this module's own cleanest legacy files, ported with minimal change) / Application service (026 — dead import removed) |
| Account-apply flow | PBL200-RULE-029 to 035 | 7 | **Closed by construction** (029-032 — parameterized) / Domain invariant (033, already clean — the parameterized write itself, preserved) / **Closed by construction, redesigned** (034-035 — a relationship-table redesign eliminates the semantic-inconsistency question entirely, not merely fixes the injection) |
| Job-scoped save variant | PBL200-RULE-036 to 038 | 3 | Closed by construction (036, 038 — second-order injections, parameterized) / Domain invariant (037 — the bulk sheet-wide rule delete becomes a properly-scoped, explicit command rather than an implicit side effect of a request flag) |
| PDF output / sheet-copy feature | PBL200-RULE-039 to 040 | 2 | N/A — already clean, ported with minimal change (this module's other two cleanest legacy files) |
| Wrong-entity-class ajax dispatch | PBL200-RULE-041 to 042 | 2 | **Not reproduced** (041 — the arbitrary-write branch; also close the missing-permission-check gap by construction — see `permissions.md`) / Closed by construction (042 — the account-lookup injection, if the underlying feature is genuinely needed, is rebuilt against a parameterized query layer, not retained as-is) |

**Total: all 42 rules mapped, none omitted.**

## Suggested Build Sequencing

A recommended build order, sized so each phase has a verifiable, testable completion signal:

1. **Phase 0 — cross-module boundary resolution.** Before schema work on the rule-line entity proceeds,
   resolve the ownership boundary with the sibling `Level200rules` module (Requirement R2 in
   `entities-and-fields.md`) and the cross-tier precedence-ordering question with the sibling
   `Pricebooklevel300`/`Pricebooklevel800` modules (see `integrations.md`). The source blueprint's own
   deployment outline explicitly treats these as **hard blockers on cutover**, not merely sequencing
   dependencies — a new implementation should treat them the same way for its own rule-line entity build, not
   proceed on an assumed answer.
2. **Schema.** Implement the four entities (`entities-and-fields.md`) with Requirements R1-R5 satisfied: a real
   foreign key from rule to sheet (R1), a single clear owner for the rule entity per the Phase-0 resolution
   (R2), the account-assignment relationship as a proper many-to-many table, not a pipe-delimited field (R3),
   type-consistent scope-dimension columns (R4), and tenant scoping throughout (R5). Verify: every field group
   has a typed home; no pipe-delimited multi-value string field remains for account assignment.
3. **Domain rules (invariants).** Implement every rule assigned "domain invariant"/"closed by construction"
   treatment above: the delete-guard (no live assignment may still reference the sheet), the GP-based fallback
   formula's divide-by-zero guard, the account-assignment relationship's add/remove semantics (no
   overwrite-vs-append ambiguity by construction), and the parameterized-query-only data-access layer that
   closes all 16 confirmed injection points at once. Verify: one test per rule ID at minimum, and an explicit,
   dedicated test asserting no raw string-interpolated query is reachable from business-logic code anywhere in
   the module.
4. **Status/lifecycle.** Implement the `mps_status` gate exactly as it works today (a genuine, working live
   pricing gate — preserve unchanged, per `workflows.md`), the rule-line soft-delete as a real per-rule
   operation (replacing the legacy bulk-by-sheet-name delete), and a real delete guard for the sheet entity for
   the first time. Decide, with subject-matter-expert input, whether `mps_end_date` becomes an enforced pricing
   gate or stays informational-only — the source blueprint's own recommendation is to implement this as an
   optional, off-by-default flag so no tenant's live pricing silently changes at cutover. Verify: every
   transition documented in `workflows.md` has a corresponding test.
5. **Pricing engine.** Implement the calculation pipeline (`calculations.md`) as a single, independently-testable
   service: the 7-dimension specificity scoring as a named, tested function (not an inline query-ordering
   expression), the linecode-only fallback, the direct-net-price and GP-based-fallback formula paths with the
   divide-by-zero guard, and a typed result (priced / zero-price / no-match / division-by-zero) that never
   silently drops a line with no signal. Verify: reproduce the documented formulas exactly against known
   inputs/outputs, including the specificity-scoring tie-break behavior; prove by construction that a
   resolved-to-zero price is never indistinguishable from "no rule matched."
6. **Screens/operations.** Implement the capability layer implied by `screens-and-user-flows.md` as the
   operation surface: sheet CRUD, rule-row CRUD (consolidating the legacy system's two independent
   implementations into one), GP color-code settings, account assignment (one consistent add/remove operation,
   not two divergent ones), a real working duplicate-name check, the job-linkage/sales-order-seed flow, and
   correct, module-scoped permission checks on every write surface (closing the `DetailViewAjax.php` gap — see
   `permissions.md`). Verify: a contract test confirms the account-assignment operation cannot silently
   overwrite/clear existing assignments the way one of the legacy paths did.
7. **Outputs.** Implement the Master Price Sheet PDF (ported with minimal change, per `outputs.md`'s own
   assessment that this is a genuinely clean legacy output) and the CSV export (rebuilt against the new
   parameterized query layer, owning its own field-permission definition rather than borrowing the sibling
   `Level200rules` module's own configuration, per the Phase-0 boundary resolution). Resolve whether the two
   confirmed-dead output variants need any migration attention at all before deciding not to port them.
8. **Cross-module & integration.** Implement the bounded interfaces in `integrations.md`: the account-assignment
   relationship, the job-linkage relationship, the sales-order-line-item-seed flow (rebuilding the legacy
   system's own 6-table raw join against each module's new-stack read models rather than one raw join), and the
   pricing-computation service's own call site in the SalesOrder/Quotes pricing flow — explicitly coordinated
   with whatever the sibling `Pricebooklevel300`/`Pricebooklevel800` modules' own equivalent calculators require
   for tier-precedence ordering (Phase-0 gate). Do **not** reproduce any relationship to the unrelated Campaigns
   or delivery-log modules — those are confirmed copy-paste leftovers with no legitimate
   Pricebooklevel200-specific purpose.

## Test/Verification Strategy Pointer

- **Rule-ID-traceable tests**: name or tag each test after its `PBL200-RULE-###` rule id so coverage against
  the rule catalog in `business-rules-and-validation.md` is mechanically auditable, rather than relying on
  manual review — the same convention established by the `SalesOrder` pilot module's own build-guidance
  document.
- **Golden-output tests** for the pricing pipeline (`calculations.md`): known scope-dimension/net-price/GP
  inputs paired with exact expected outputs, reproducing the documented specificity-scoring and formula
  behavior precisely — including the tie-breaking behavior between two rules of equal specificity, and the
  fallback-tier behavior when no scored rule matches.
- **Security regression tests**: an explicit negative test for each of the 16 confirmed injection points
  (risks PBL200-RISK-005 to 008), asserting each is structurally impossible to reproduce in the new
  data-access layer, not merely "currently passing."
- **Critical-risk closure tests** — one dedicated, explicitly-named test per Critical finding
  (PBL200-RISK-001 to 004), each asserting the specific legacy failure mode (the wrong-entity-class delete, the
  arbitrary Campaigns write with no permission check, the duplicated injection, the wholesale-copy-paste
  pattern) is structurally impossible to reproduce.
- **Cross-sibling coordination tests**, once the Phase-0 boundary questions (build sequencing step 1) are
  resolved: a test confirming the pricing-computation service's own tier-precedence behavior matches whatever
  ordering the cross-sibling consolidation determines, since this cannot be verified by testing this module's
  own calculator in isolation.
- **Migration/data-integrity audit scripts** (not unit tests against new code) — per the source blueprint's own
  deployment outline, a pre-migration, read-only audit of the account-assignment field's own live data is
  recommended before that table's backfill runs, to detect and reconcile any inconsistency the legacy system's
  own overwrite/clear write path may have already introduced. A per-tenant, read-only check for a GP value of
  exactly 100 anywhere in that tenant's live rule data, and for any end date in the past on a currently-Active
  sheet, is recommended before that tenant's own cutover.

## Explicit non-goals carried forward from the source blueprint's own implementation plan

The upstream account-to-sheet resolution logic, the internals of several pricing-formula helper functions
(location-base-price lookup, UOM conversion, cost-rounding), the sibling `Level200rules` module's own
entity/CRUD design, and the sibling `Pricebooklevel300`/`Pricebooklevel800` modules' own entities are all
explicitly out of scope for this module's own build — this spec designs the **contracts** these boundaries
imply (e.g. "resolve the assigned price sheet for this account" as an upstream input; "resolve UOM conversion"
as a downstream dependency), not the implementations behind them.

## Legacy-system remediation urgency, independent of a new build's own timeline

Carried forward from the source blueprint's own deployment outline as context, not as build guidance for a new
implementation: the wrong-entity-class delete action (PBL200-RISK-001) and the arbitrary Campaigns-record write
with no permission check (PBL200-RISK-002) are flagged in the source material as deserving
same-day-of-discovery legacy-system remediation, independent of any rewrite's own timeline, because their most
likely practical effect is an actively broken delete feature and an actively exploitable arbitrary-write
endpoint in the system currently in production use. This is noted here for completeness; it is a legacy-system
operations concern, not a new-build requirement.
