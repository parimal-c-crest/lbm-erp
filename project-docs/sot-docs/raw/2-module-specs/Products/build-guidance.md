# Products — Build Guidance

> Guidance for Stage 4, stated stack-neutrally.

Source: `docs_from_blueprint/module/Products/10-build-guidance.md` (condensed from
`blueprint/module/Products/09-implementation-plan.md`, Doc2). Rule IDs below use this kit's
`PROD-RULE-###` scheme (see `business-rules-and-validation.md`), which is the source's own
`PROD-VAL-###` numbering with the same numeric suffix (e.g. `PROD-VAL-014` → `PROD-RULE-014`).

## Rule-to-Enforcement-Layer Mapping Approach

Each of the 65 business rules catalogued in `business-rules-and-validation.md` should be enforced at
the most appropriate layer for its nature, using a consistent vocabulary:

- **Domain model invariant** — enforced inside the relevant aggregate; cannot be bypassed by any
  operation reaching that entity.
- **Application-level orchestration check** — coordinates multiple entities or triggers a side effect,
  rather than being a property of any single entity's own state.
- **DB constraint** — a last-resort integrity backstop, not the primary enforcement point.
- **Closed by construction** — the legacy failure mode is structurally unavailable in the new design;
  most relevant to the security findings.

Recommended grouping (matches this module's own rule-catalog categories in
`business-rules-and-validation.md`, so traceability from rule ID to build task stays direct):

| Rule group | Rule IDs | Count | Suggested primary layer |
|---|---|---|---|
| Entity-save: save-orchestration | PROD-RULE-001–010 | 10 | Application service (almost entirely field-cascade/audit-stamp/notification logic, not domain invariants) |
| Entity-save: core entity save hook | PROD-RULE-011–024 | 14 | Domain invariant (018, the Global-WAC three-way gate) / Application service (011–017, 019–023) / **not ported** (024 — confirmed 100% dead code) |
| Mass-update apply path | PROD-RULE-025–033 | 9 | Domain invariant (026, 032, the scope/execution gates) / **closed by construction** (027–029, the security half) / Application service (025, 030, 031, 033) |
| Mass-update blast-radius gate | (cross-cutting, not itself a numbered rule) | — | Application service — a new, mandatory count-preview/confirmation step before any mass-update executes |
| Supersession (Products-side trigger) | PROD-RULE-034–038 | 5 | Domain invariant (034, 035, 038) / **fixed, not ported** (036, the undefined-variable bug) / Cross-module trigger (037) |
| Delete | PROD-RULE-039–041 | 3 | Domain invariant (039, 040) / Application service (041) |
| Import | PROD-RULE-042–045 | 4 | Domain invariant (042, 043, 044) / **fixed** (045, the cross-linecode collision risk) |
| AUPF / Auto-Update-Subline rule engines | PROD-RULE-046–055 | 10 | Domain invariant (048, 053–055, the non-empty-scope requirement) / Application service (046, 049, 051, 052) / **closed by construction** (047, 050, already correctly implemented) |
| Lot/serial number tracking | PROD-RULE-056–060 | 5 | Domain invariant (056, 057 — serial number uniqueness) / **fixed** (058 — the lot-number validation gap) / Application service (059, 060) |
| Barcode ambiguity resolution | PROD-RULE-061–062 | 2 | **Superseded** — rendered moot entirely by the new barcode-uniqueness domain invariant; not ported |
| Product-field lookup management | PROD-RULE-063–065 | 3 | Application service, promoted from advisory-only to real, enforced invariants (063, 064) / **fixed** (065, the hardcoded-literal bug) |

**Total: 65 of 65 rules mapped, none omitted.**

### Governing security decisions (highest priority, given this module's confirmed risk posture)

Two decisions carry more build-sequencing weight than any single rule group, given the module's
confirmed 11 SQL injections:

- **A blanket data-access-layer decision**: the chosen technology stack's data-access layer must make
  both confirmed injection shapes — unwhitelisted dynamic column-name construction from request input,
  and unescaped/unparameterized values including "no bind mechanism at all" cases — structurally
  unavailable to ordinary business-logic code, not merely discouraged by convention. The legacy
  codebase's own mixed convention (mostly parameterized, with 11 confirmed live exceptions across 209
  files) is the strongest demonstration in this blueprint series that convention alone is insufficient.
- **A named, first-class closure for the save-hook injection specifically**: because one confirmed
  injection sits inside the Product entity's own core save hook — reachable on an ordinary product
  edit with no special screen or permission required (PROD-RISK-002 in this module's risk register) —
  this gets its own explicit build-sequencing priority and its own first-written regression test, not
  merely inclusion in a general security sweep.

## Suggested Build Sequencing

A recommended 10-phase build order, reasoned explicitly rather than mechanically copied from any other
blueprinted module's own phase count. **This module has two genuinely separable cores, and its Catalog
Identity core is structurally *upstream* of every other module's own schema, not merely a peer
dependency** — location-scoped inventory data is itself keyed by a foreign key into this module's own
product table.

1. **Resolve blocking open decisions** — subject-matter-expert/product-owner sign-off on at minimum:
   whether Door Configuration is in scope at all (PROD-OQ-015), the manufacturer/weight
   duplicate-column-collapse precedence, the Global-WAC corrected-formula sign-off (PROD-OQ-031), and
   the orphaned supersession-field migration-handling decision (PROD-OQ-026). Verify: a decision log,
   one paragraph per resolved item, checked in before build starts.
2. **Catalog Identity core** — the Product entity, the seven classification axes, the UOM framework,
   Product Barcode (with its real uniqueness constraint), Product Lot Number and Serial Number (with
   their deliberately-asymmetric uniqueness policies), all tenant-scoped. **This must be sequenced at
   or before the earliest phase of whichever module owns location-scoped inventory data**, since that
   module's own schema cannot be fully wired until this module's identity schema exists — i.e. Products'
   Catalog Identity core sequences at or before Location's own earliest phase. Verify: migrations run
   clean against an empty database; a boundary test proves a duplicate barcode within the same (tenant,
   barcode type) is rejected; a boundary test proves a duplicate serial number is rejected while an
   identical lot number is accepted (the asymmetry verified explicitly, not left to accident).
3. **Security hardening: the 11 confirmed injection points** — close every confirmed injection by
   construction (see the governing security decisions above) before any further business logic is
   layered onto the data-access layer. Verify: eleven negative security-regression tests, one per
   confirmed injection finding (PROD-RISK-001 through 007), reproducing each finding's exact cited
   payload shape and asserting rejection — with the save-hook injection's (PROD-RISK-002) test written
   **first**, given its uniquely ordinary reachability.
4. **Pricing core: MPL resolution, GP calculation, Global WAC** — a hard prerequisite for any
   order-entry module's own pricing-display and auto-finalize phases, but **not** a prerequisite for a
   location-inventory module's own quantity-on-hand core to function (identity is needed there, pricing
   logic is not). Gated on the Global-WAC corrected-formula sign-off from Phase 1. Verify: golden-output
   tests reproducing the documented formulas exactly (the six-formula MPL grammar, the penny-rounding
   tiebreak, both GP-formula tiers, the corrected Global-WAC blend); a contract test confirming the
   legacy dead-code endpoint's shape has no successor at all.
5. **MPL Price-Plan assignment scheduling** — gated on the unlocated-legacy-assignment-process
   follow-up confirmation from Phase 1 (PROD-OQ-029). Verify: a test confirming an assignment change is
   never triggered by the price-resolution read path itself (the date-range fields are consumed only by
   the scheduler, never at lookup time).
6. **Rule engines: AUPF and Auto-Update-Subline** — implement both engines' formulas and the new
   non-empty-scope save-time invariant. Verify: a test proving a rule with a blank scope across every
   filter field is rejected at save time, not merely excluded downstream by a query filter (the specific
   design fragility PROD-RISK-009 flags).
7. **Status/supersession trigger and mass-update/import** — implement the Part Status shared filter/
   read-model, the supersession trigger and its event publication, the mass-update command (with its
   new count-preview gate), and the import command. Verify: a test proving the shared Active-product
   filter is the *only* place the Active/Inactive/Discontinued exclusion condition is expressed, not
   60+ independently-derived copies; an integration test confirming the supersession event reaches a
   stub downstream subscriber.
8. **Variant lifecycle** — gated on product-owner confirmation the feature is worth building at all,
   given its confirmed 100% dormancy on live data; deliberately sequenced last among this module's own
   core entities for that reason. Verify: a referential-integrity delete-guard test; a schema-level test
   proving a variant-having product's location quantity-on-hand has no independently-writable path (the
   derivation invariant).
9. **Outputs** — implement the unified label-print delivery service (closing the two-inconsistent-
   PrintNode-mechanisms finding, PROD-RISK-013) plus the PI Count Variance, Core/Warranty, and
   inventory-snapshot report services. Verify: a test confirming both label-print paths resolve through
   one shared delivery service, not two independently-coded call patterns.
10. **Cross-module integrations** — implement the bounded-context interfaces documented elsewhere in
    this module's spec: the preserved Fuse5Connect entry point plus its event fan-out, PriceBooks'
    bidirectional association, the Price-Code-Book/Rank-Group read-only interface, VendorLinecode's
    Products-owned CRUD (with its data-quality fix applied), the e-commerce catalog push (gated on its
    sync/async-mechanism confirmation, PROD-OQ-034), and the PurchaseOrder sales-history link. QuickBooks
    item sync remains excluded. Verify: contract tests at each bounded-context boundary, including an
    idempotent-double-delivery test for every published domain event; a test confirming the preserved
    external-integration entry point is indistinguishable, at the aggregate boundary, from a manual UI
    edit.

## Test/Verification Strategy Pointer

- **Rule-ID-traceable tests**: name or tag each test after its `PROD-RULE-###` rule ID so coverage
  against `business-rules-and-validation.md`'s rule catalog is mechanically auditable (a script can grep
  test names against the rule catalog and report any rule with zero matching tests), rather than relying
  on manual review. One test per rule ID, at minimum.
- **Golden-output tests** for the pricing pipeline: known product/location/rule inputs paired with exact
  expected outputs, reproducing the documented formulas precisely — including rounding behavior and
  order-of-operations choices that might look "simplifiable" to an engineer unfamiliar with why they are
  shaped that way, but which are deliberate, documented business rules (or, for the Global-WAC formula,
  an explicitly-flagged correction pending sign-off, not a silent behavior change).
- **Security regression tests**: eleven explicit negative tests, one per confirmed injection finding
  (PROD-RISK-001 through 007 in this module's risk register), reproducing each finding's exact cited
  payload/attack shape and asserting rejection, not merely "no crash." The save-hook injection's test
  (PROD-RISK-002) is written first in the security-hardening build phase, per its uniquely ordinary
  reachability. A dedicated test asserting the mass-update path cannot execute without a preceding,
  matching count-preview confirmation token closes the separate blast-radius gap (PROD-RISK-008).
- **Domain-invariant boundary tests**: explicit tests for the barcode-uniqueness constraint (duplicate
  within a type rejected, cross-type duplicate accepted) and the lot/serial asymmetry (duplicate serial
  rejected, duplicate lot accepted) — the asymmetry verified deliberately, not left to accident.
- **Status/read-model consistency tests**: a test or static-analysis check confirming exactly one code
  location expresses the Active/Inactive/Discontinued exclusion condition, not dozens of
  independently-derived copies; a save-time rejection test for AUPF/Auto-Update-Subline rules with a
  blank scope across every filter field.
- **Critical-risk closure tests** — one dedicated, explicitly-named test per Critical/High finding
  (PROD-RISK-001 through 008 in this module's risk register), each asserting the specific legacy failure
  mode is structurally impossible to reproduce, not merely "currently passing."
- **Migration/data-integrity audit scripts** (not unit tests against new code) — run against the legacy
  system's live data to quantify: how many rows would fail migration under the new barcode-uniqueness
  constraint (a pre-flight audit, not an assumption the migration will pass cleanly); the orphaned
  supersession-field rows' origin; the manufacturer/weight duplicate-column-collapse conflict rate; the
  orphaned MPL backup table (confirmed safe to archive, not migrate). Given this module's confirmed
  security posture, the migration rehearsal should additionally include a zero-raw-SQL-string audit of
  the new data-access layer's own call sites, confirming no migration-tooling code itself reintroduces a
  string-interpolated query.

These should map into whatever this module's Stage 4 testing documents use as their own test-case
identifier scheme, keyed by the `PROD-RULE-###` / `PROD-RISK-###` IDs used throughout this spec.
