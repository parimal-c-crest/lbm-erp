# PurchaseLineItem — Build Guidance

> Guidance for Stage 4, stated stack-neutrally.
>
> Source: `docs_from_blueprint/module/PurchaseLineItem/10-build-guidance.md`, itself traced to
> `blueprint/module/PurchaseLineItem/09-implementation-plan.md`. This section is guidance for however a
> downstream process structures its own implementation-plan and testing documentation — it is not itself
> an implementation plan, a schema migration script, or an API specification.

## Rule-to-Enforcement-Layer Mapping Approach

Each of the 14 business rules catalogued in `business-rules-and-validation.md` should be enforced at the
most appropriate layer for its nature — not all rules belong in one layer:

| Rule group | Rule IDs | Rule count | Suggested primary layer |
|---|---|---|---|
| Save.php absent-guard rules (vestigial path) | PLI-RULE-001–002 | 2 | **Closed by construction** — a new implementation has no general user-facing create/edit form for this entity at all (per R1/R4), so there is no code path where an unvalidated field-presence gap or an unchecked-save-result redirect could be reproduced. |
| Entity-class absent-declaration + injection rules | PLI-RULE-003–006 | 4 | **Closed by construction** (003, 004, and — critically — **005**, the Critical injection) / **Application-level service** (006). The required-field and vendor-lookup gaps are closed by the projection/write handler's own contract requiring these values as preconditions, not optional lookups. The injection is closed by the security-by-construction requirement (R3). The export-query builder's own substitution logic becomes an application-service concern, parameterized by construction. |
| Delete lifecycle rules | PLI-RULE-007–008 | 2 | **Application-level service** (007, the record-presence precondition) / **Closed by construction, reframed as a positive finding** (008 — this module already used the safer, shared delete pattern in the legacy system; the new design simply inherits that same safe pattern). |
| Inline-edit wrong-entity-class + mass-assignment rules | PLI-RULE-009–011 | 3 | **Domain invariant** (009, the record-presence precondition) / **Closed by construction** (010, the wrong-entity-class bug — R4's own named closure; and 011, the mass-assignment gap — closed by an explicit allow-list of typed domain properties, the same pattern used for every module's own inline-edit mass-assignment finding). |
| Shared search/list infrastructure | PLI-RULE-012–013 | 2 | **Closed by construction** (012 — since the underlying shared infrastructure itself is being replaced with a parameterized query builder, there is no unescaped-concatenation primitive left for any caller to reach) / **N/A, preserved as-is** (013, display-only client-side validation hints — not a security control either in the legacy or the new design). |
| Campaigns-leftover / copy-paste bug | PLI-RULE-014 | 1 | **Excluded, not fixed** — the leftover files this rule documents carry no PurchaseLineItem-specific logic and are not carried forward into the new design at all; there is no bug to reproduce or fix since the leftover code itself is excluded. |

**Total: 14 of 14 rules mapped, none omitted.**

## Suggested Build Sequencing

A recommended build order, sized so each phase has a verifiable, testable completion signal:

1. **Schema** — implement the one core entity plus a holding area for genuinely-ambiguous legacy data
   (the one live row from the smaller, unindexed group-relation table — preserved for audit traceability,
   not silently dropped, per the "flag the ambiguity, don't guess" principle). Exclude the
   functionally-inert custom-field companion table entirely — it carries zero business columns and no
   data beyond its own foreign key. **Verify**: every field from the source catalog has a typed home; no
   generic dynamic-field mechanism is reintroduced.
2. **Write path** — implement the single, shared cost-extension calculation service (R2), consumed by
   every one of the module's six legacy trigger points' new-stack equivalents (PurchaseOrder's
   finalize/append/reverse-RGN commands, Receiving's append flow, POReconciliation's cost-correction
   flow). **Verify**: reproduce the documented formula exactly against known inputs/outputs; prove by
   construction that no code path can set an extension value without invoking the shared service; prove
   the service's own signature makes the intra-row dual-quantity-basis bug structurally impossible to
   reproduce.
3. **Security-by-construction pass** — implement the parameterized data-access layer (R3), closing the
   Critical SQL injection (PLI-RISK-001) and the Medium-severity ASN/vendor-number-backfill finding
   (PLI-RISK-004) regardless of their individual reachability status. **Verify**: a negative test
   reproducing the exact raw-record-id-into-`WHERE`-clause pattern documented in the risk register's top
   finding, asserting it is structurally impossible in the new implementation.
4. **Inline-edit capability** — implement the single, correctly-scoped inline-edit command (R4), replacing
   both of the legacy system's own broken/unvalidated edit surfaces with one coherent, typed operation
   against an explicit allow-list of editable fields. **Verify**: a dedicated test asserting the command
   is typed against the actual PurchaseLineItem aggregate specifically, with no generic
   class-instantiation step where a substitution could occur — the direct, explicitly-named closure test
   for the risk register's second-highest-priority finding (PLI-RISK-002).
5. **Read/search/export surface** — implement the list view, detail view (including the resolved link
   back to the parent Purchase Order), and the single CSV export output, all reading already-persisted,
   already-correct values. **Verify**: the export's own filter/substitution logic is parameterized by
   construction, matching the closure already established in Phase 3.
6. **Cross-module read interfaces** — implement named, versioned read queries for the module's five
   external reporting/forecasting/formula-field consumers, rather than exposing direct table access to
   each. **Verify**: each of the five consumers' own data needs is met by an explicit, named query, not an
   ad hoc join against the entity's own storage.

## Test/Verification Strategy Pointer

- **Rule-ID-traceable tests**: name or tag each test after its PLI-RULE-### ID so coverage against
  `business-rules-and-validation.md`'s rule catalog is mechanically auditable — one test per rule ID, at
  minimum.
- **Golden-output tests** for the shared cost-extension calculation service: known unit-cost/quantity
  inputs paired with exact expected outputs, reproducing the documented rounding policy precisely,
  including a dedicated test proving the service's single-quantity-basis-per-call design makes the legacy
  intra-row inconsistency structurally unreproducible (see `calculations.md`).
- **Security regression tests**: an explicit negative test reproducing the exact
  raw-record-id-concatenation pattern described in PLI-RISK-001, asserting it is rejected/impossible by
  construction.
- **Correctness-closure test for the wrong-entity-class bug**: one dedicated, explicitly-named test
  asserting the new inline-edit command only ever operates on the PurchaseLineItem aggregate, never on any
  other entity's storage, regardless of what record id is supplied — the direct closure test for
  PLI-RISK-002, this module's single highest-priority finding.
- **Migration/data-integrity audit scripts** (not unit tests against new code) — run against the legacy
  system's live data to quantify how many historical rows were touched by more than one of the six legacy
  writers (informing the historical-reconciliation decision flagged in `calculations.md`) before any
  migration decision is made about how to handle them.
