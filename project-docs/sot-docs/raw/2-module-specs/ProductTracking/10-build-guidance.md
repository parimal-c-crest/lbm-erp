# ProductTracking — Build Guidance

Part of the ProductTracking tech-agnostic module spec. Source:
`blueprint/module/ProductTracking/09-implementation-plan.md` (Doc2) and
`10-deployment-cutover-outline.md` (Doc3, outline-depth only), ultimately derived from
`blueprint/module/ProductTracking/`.

This section is guidance for however a downstream process structures its own implementation-plan and
testing documentation — it is not itself an implementation plan, a schema migration script, or an API
specification.

## 10.1 Governing design decisions

The blueprint's implementation plan makes eight explicit, cited decisions rather than defaulting on any
of them. Restated here as forward-looking guidance:

- **D1 — ProductTracking is preserved as a first-class, append-only audit-log entity, written
  exclusively through one shared write service, not eliminated and not left as ≥26 independent
  direct-instantiation call sites.** The legacy pattern is genuinely fragmented (some writers instantiate
  directly, a smaller set funnel through a shared wrapper function, both patterns coexist with no single
  enforced contract). One write service closes the confirmed cost-basis divergence and the unguarded
  override-layer risk by construction: there is exactly one place the cost-basis branch is evaluated,
  evaluated once, not independently re-derived by every one of the ≥26 callers' own inline logic. See
  requirement R1.
- **D2 — security-by-construction closes all four confirmed Critical SQL injections structurally, not by
  patching each splice individually.** The new data-access layer makes raw string-interpolated SQL
  structurally unavailable to business-logic code. The mass-assignment gap that chains one finding into
  the module's own everyday inline-edit endpoint is closed independently, by validating any submitted
  field name against an explicit allow-list of editable domain properties before it ever reaches the
  write service. Because the one shared write service is the *only* write path regardless of caller
  (internal UI, cron, or the mobile-scanner webservice), the webservice's own request payload is subject
  to the exact same allow-listed, parameterized validation as every other caller — closing the
  externally-reachable finding without needing to separately harden the scanner webservice's own code
  (though its own authentication layer remains a real, separate open question for the access-control
  layer). See requirement R3.
- **D3 — one authoritative cost-basis resolution service computes unit/net/accounting cost figures
  exactly once per write, resolving the location's configured cost basis and the two override conditions
  (Receiving-with-PO-cost, Product-Cut-with-WAC) as explicit, mutually-exclusive branches — not three
  independently-triggered SQL-fragment overwrites.** Net Cost is derived from the *same* resolved cost
  basis Accounting Net Cost uses, closing the confirmed divergence between the two — both fields compute
  from one resolved value, not two independently-hardcoded columns. See requirement R2.
- **D4 — Created Time and the creating-user id are set once, at creation, never re-stamped by a
  subsequent correction.** The legacy save hook unconditionally re-stamps both on **every** save,
  including inline-field-correction saves — meaning a row's "created" timestamp silently drifts forward
  every time any field on it is corrected, corrupting the audit trail's own chronology. A new
  implementation separates a write-once creation timestamp (set only by the write service) from a
  separate last-updated timestamp (set by the correction path) — closing this finding structurally, the
  same "an audit log's own creation timestamp must not silently drift" principle this specification
  applies to every audit-log-shaped entity it documents.
- **D5 — `.sellprice` is excluded from the new schema entirely, parked for migration-audit
  traceability.** Confirmed `NULL`/`0` on all 15,013 live rows, and every writer explicitly blanks it. No
  calculation is invented for this field. If a future SME review identifies a real intended use, it is
  promoted to a typed column at that point — not before.
- **D6 — the "Product Description" cross-table field registration is not reproduced; product description
  is resolved via a proper join to the Products entity at read time**, not as a stored column with an
  ambiguous cross-table origin.
- **D7 — the Campaigns-pattern leftover files are excluded entirely, not ported.** Their actual table
  writes target a different module's own relation tables, not anything ProductTracking owns, and the
  always-blank record-title assignment they carry is confirmed live but never correct. A new
  implementation's record-detail view uses a real, computed display label instead, since this entity —
  unlike SalesOrder or Products — has no natural single "name" field of its own.
- **D8 — multi-tenancy is first-class**, per the same repo-wide requirement carried forward by every
  module in this specification's own series. See requirement R4. This also closes, as a byproduct, the
  legacy system's own session-default-location-based scoping pattern with an explicit, structural
  tenant+location scope parameter instead of an implicit session global.

## 10.2 Rule-to-enforcement-layer mapping

Each of the 21 business rules catalogued for this module should be enforced at the most appropriate
layer for its nature, using the same vocabulary every module in this series uses: **domain model
invariant**, **application service**, **DB constraint**, **closed by construction**.

| Group | Rule IDs | Count | Primary enforcement layer | Notes |
|---|---|---|---|---|
| Save.php absent-guard rules (dead Campaigns-leftover) | PT-VAL-001–002 | 2 | Closed by construction | Decision D7 removes the leftover fields/files entirely — there is no dead-field block to reproduce. |
| Cost/QoH computation | PT-VAL-003–013 | 11 | Closed by construction | Every computed-field rule (net effect, cost-basis branches, bin/zone/shelf, M2 resync, the QuickBooks-push gate) becomes a single, explicit branch inside the write service / cost-basis resolver (D1, D3), not a re-derivable SQL-fragment chain. The unescaped cost-field splice (PT-VAL-009) is closed by Decision D2; the re-stamping-on-correction defect (PT-VAL-004) is closed by Decision D4. |
| Delete lifecycle | PT-VAL-014–015 | 2 | Application service | The record-id presence check becomes the shared soft-delete command's own load precondition. The unconditional delete via a generic shared helper, with no confirmed further check, is preserved as documented — the blueprint found no confirmed cross-module reference *into* a ProductTracking row that a delete could orphan (the "terminal audit-log leaf" finding), so no new integrity guard is invented without evidence. |
| Inline-edit path | PT-VAL-016–018 | 3 | Domain invariant (016) / Closed by construction (017, 018) | The record-id presence check becomes the successor command's own load precondition. The missing field-name allow-list is closed by Decision D2's explicit allow-list. The mass-assignment-into-injection chain is closed as a direct consequence of both D2 sub-closures together. |
| ListView search injection | PT-VAL-019–020 | 2 | Closed by construction (019) / Application service (020) | The `pricingavail` branch's raw splice is Decision D2's own named closure. The shared where-condition-builder path inherits the same parameterized query layer — there is no unparameterized-string-concatenation primitive available to any caller in the new design. |
| Product-variant detail popup | PT-VAL-021 | 1 | Closed by construction | Decision D2's own named closure for this endpoint's successor. |

**Total rules mapped: 21 of 21.**

## 10.3 The `QohChangeService` write contract (as designed in the blueprint's Doc2)

Every one of ProductTracking's ≥11 writer bounded contexts (SalesOrder, Products, PurchaseOrder,
Receiving, ReceivingST, StoreTransfer, PendingStoreTransfers, Location, PhysicalInventory, QuickEdit,
ProductCut, Import) plus the mobile-scanner webservice calls one typed command, replacing both legacy
entry patterns (direct instantiation, the shared-but-inconsistent writer-function wrapper):

1. Resolve the location's configured cost-basis setting via the Location bounded context's own query
   interface, not a raw location-table join.
2. Compute Net Effect = New Qty − Prev Qty.
3. Resolve unit/net/accounting cost figures via the one cost-basis resolution service (D3).
4. Resolve bin/zone/shelf via a named WMS-aware location-detail service, the same branch logic
   documented in this module's business-rules documentation (PT-VAL-010), now a named service call
   rather than an inline SQL-fragment branch.
5. Persist via the parameterized query layer (D2) — no raw SQL string ever assembled from command inputs.
6. If the writer requests a QuickBooks push, publish a domain event rather than calling the push function
   inline — the same call shape regardless of which of the ≥26 legacy callers' successor bounded contexts
   invokes it.

Net Effect is always derived by the service, never accepted as caller input — closing PT-VAL-003's
"discard whatever was submitted" finding by making it structurally impossible to submit a Net Effect
value at all.

## 10.4 Recommended phase sequencing

**Sequencing rationale.** Unlike a module whose own data is a prerequisite for other modules'
transactional logic, ProductTracking has **no single upstream module to bind its own cutover to** — at
least 11 distinct writer bounded contexts plus an external webservice all call the same write contract.
This makes ProductTracking's own build/cutover sequencing a genuine coordination problem, reasoned
through explicitly below rather than defaulted to a "core module, build first" or "downstream reporting
module, build last" template.

1. **Resolve blocking open decisions** — subject-matter-expert sign-off on the schema-shape-affecting
   Open Questions (the "M2" field's meaning, the two-distinct-cost-column relationship, the "Product
   Description" cross-registration anomaly). None block starting the next phase, but resolving them first
   avoids rework on the cost-basis/M2 columns.
2. **Core schema, cost-basis resolver, and write service** — build the entity, the cost-basis resolution
   service (D3), and the write service (§10.3) against a synthetic/test caller — no real writer bounded
   context wired in yet. Verify: a golden-formula test reproduces every override-layer branch documented
   in this module's own financial-pricing-logic documentation.
3. **Wire the highest-volume legacy writers first**, per this module's own live `change_type`
   distribution: Sales Order (7,087 rows), Product Import (5,637), Store Transfer (1,090), Receiving
   (569). This order retires the largest share of legacy write-path risk soonest. Verify: an idempotency/
   parity test compares new-service output against the legacy save hook's own computed values for a
   sample of real historical rows.
4. **Wire the remaining confirmed writers** (Products' 9 files, PurchaseOrder, QuickEdit, ProductCut,
   Location, PhysicalInventory, PendingStoreTransfers) and the mobile-scanner webservice — the latter
   re-pointed at the same write service, closing the externally-reachable Critical finding the moment this
   phase lands, independent of whether the scanner's own authentication model has been modernized yet.
5. **Build the read surface** (ListView/DetailView/CSV export, a named read query for the 12-report
   reporting family) and the inline-correction command (D2's allow-list, D4's updated-at-only correction
   semantics). Verify: security-regression tests reproduce the blueprint's exact cited injection payload
   shapes for all four confirmed findings and assert rejection.
6. **Decommission every legacy direct-instantiation call site and the shared writer-function wrapper**
   once all Phase 3/4 callers are confirmed migrated — closing the "≥26 independent write paths"
   fragmentation finding for good.

## 10.5 Cutover considerations carried forward from Doc3 (outline depth)

- **No single upstream module to bind this module's own cutover timing to** — two workable sequencing
  options exist: (a) cut each writer module over independently, tolerating a mixed transition state where
  some writers still call the legacy path and others call the new service, requiring a union read view
  across both the legacy and new tables for any report/UI needing a complete picture during the
  transition; or (b) hold this module's own cutover until every writer module has cut over, avoiding the
  split-table problem at the cost of a longer single cutover event. This is a genuine open decision, not
  a default — carried forward for the rewrite team to resolve, not resolved here.
- **The mobile-scanner webservice is a hard dependency for closing the externally-reachable Critical
  finding** — until its write call is re-pointed at the new write service, the legacy SQL injection
  remains live and externally reachable regardless of how much of the rest of the rewrite has shipped.
  This is the one item in this module's own cutover plan flagged for **out-of-band remediation on the
  legacy system itself**, ahead of the full rewrite's own timeline.
- **A one-time backfill of the 15,013+ live rows is needed**, with no ongoing dual-write reconciliation
  required for historical rows — but if cutover option (a) above is chosen, a genuine dual-write
  reconciliation window exists for the transition period itself.
- **The historical Net Cost / Accounting Net Cost divergence needs an explicit reconciliation decision**
  for any tenant that ever ran a non-default GP-basis setting: re-derive via the new cost-basis resolver
  (requires the original setting at the time of each row's creation, which may not be reconstructable if
  the setting has since changed) vs. carry forward whichever legacy value is on disk, flagged for review.
- **The 990-row blank-`push_to_qb` anomaly needs a mapping rule before backfill**: the new boolean column
  requires every blank-string legacy row to be mapped to a definite value (most likely `false`, matching
  the enum's own default) — a reasonable default, but should be confirmed against a sample of the actual
  blank rows during migration rehearsal rather than assumed silently.
- **Security remediation urgency**: restated from the blueprint's own deployment-facing document — all
  four Critical findings are confirmed, live, currently-reachable SQL injections in the legacy system
  today, genuine "patch the legacy system now, independent of the rewrite timeline" items, recommended at
  the **higher** end of this series' urgency stack (see this module's risks-and-open-questions
  documentation §9.2).

## 10.6 Test/verification strategy guidance

- **Golden-formula tests**: fixture-based, one case per cost-basis branch and per override layer
  (default, Receiving-with-PO-cost, Product-Cut-with-WAC), proving Net Cost and Accounting Net Cost are
  derived from the same resolved cost basis.
- **Security regression tests**: attempt each of the blueprint's four documented injection payload shapes
  (the `pricingavail` branch, the product-variant detail popup, the cost-field splice via the inline-edit
  mass-assignment gap, and the shared writer function's WAC-lookup splice) against the new command/query
  layer and assert rejection.
- **Write-path parity tests**: compare the new write service's computed cost/quantity output against the
  legacy save hook's own output for a sample of real historical rows across each `change_type`, to
  surface any unintended behavior change before cutover.
- **Idempotency tests**: confirm a duplicated write request does not create a second row for the same
  underlying event, since ≥26 legacy callers previously had no shared contract enforcing this.
- **Migration/data-integrity audit scripts** (not unit tests against new code): a per-tenant confirmation
  that `.sellprice` is indeed blank/zero everywhere before excluding it from scope, not merely assumed
  from the blueprint's own dev snapshot; a sample-based confirmation of the blank-`push_to_qb`-to-boolean
  mapping rule; a re-run of the `change_type` live-value distribution to confirm no new values have
  appeared beyond those the blueprint already catalogued.

---

*This file, together with the module's other topic files, forms the complete tech-agnostic
ProductTracking module specification.*
