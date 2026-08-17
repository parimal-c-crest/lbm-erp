# Vendors — Build Guidance

> Guidance for Stage 4, stated stack-neutrally.

Source: `docs_from_blueprint/module/Vendors/10-build-guidance.md`, itself derived from
`blueprint/module/Vendors/09-implementation-plan.md` (the source's own draft implementation plan — drafted
but not yet reviewed by the business at blueprint time; carried forward here as guidance, not as an
already-approved design).

## Governing Design Decisions

The source implementation plan makes twelve explicit design decisions, each resolving a specific ambiguity
found rather than silently picking an answer or silently deferring it. Carried forward as the load-bearing
decisions any build should reason from:

- **D1 — Security-by-construction.** Nine individually SQL-injectable statements inside the module, plus a
  tenth in a different module's write path into this module's own data (see `risks-and-open-questions.md`
  VEN-RISK-002–008), are closed the same way: the data-access layer makes raw string-interpolated SQL and
  dynamic column-name construction from request input structurally unavailable, shared infrastructure other
  modules' write paths go through too (see D4).
- **D2 — The Line Code Description scoping bug (VEN-RISK-001 / VEN-OQ-001) is resolved as a genuine
  ambiguity, not silently picked.** The task is to decide whether Line Code (and its Description) is
  vendor-scoped or genuinely global. The source reasons toward **genuinely vendor-scoped** — the table
  already carries a required, populated vendor-id FK on every live row. Any new write command against this
  entity should always resolve by its full (tenant, vendor, line-code) key, making the defect class
  structurally unreachable, not fixed by adding a WHERE clause.
- **D3 — Vendor Line Code becomes its own bounded concept, not owned by Vendors.** Confirmed genuinely
  four-way shared, live, and dual-written. Recommendation: merge into one owned aggregate with its own
  dedicated boundary, exposing a vendor-scoped write command and read-only query interfaces the other three
  consumers use — closing the two-independently-unscoped-write-surfaces risk by construction.
- **D4 — One authoritative Freight PPD write command replaces all three legacy paths.** The correct
  coercion behavior becomes a domain rule inside one command every caller — including Purchase Order's own
  freight-term-adjustment screen — must call through. Purchase Order is explicitly **not** given a parallel
  write path into vendor data in the new design.
- **D5 — Vendor Active/Inactive: reasoned toward a recommendation, gated on confirmation, not silently
  invented.** No such field exists today; the generic soft-delete is genuinely enforced everywhere it
  matters but is designed as "remove this vendor," not "pause purchasing for a season." Recommendation: add
  a real, reversible `status` field (Active/Inactive), layered on top of soft-delete — flagged as a
  Phase-0-blocking product-owner confirmation, since the source found the *gap*, not a confirmed business
  need.
- **D6 — The classification field's 2017 rename bug is closed by defining exactly one enum**, with every
  consumer matching against the enum member, not a duplicated string literal.
- **D7 — Primary Supplier Assignment gets a real database uniqueness constraint** on the (vendor, location)
  pair, closing the confirmed race window (VEN-RULE-038); the scope itself is preserved unchanged. No
  defensive foreign key is added from Purchase Order into this table, since no PO record ever references
  it and no evidence suggests the business wants a demoted primary supplier to retroactively affect placed
  orders.
- **D8 — The "Pull Cost Price From" resolver consolidates into one shared service**, replacing the three
  independently-maintained implementations found, consumed by every caller through one shared interface.
- **D9 — QuickBooks sync is preserved and corrected, with the legacy edit-sync gap (VEN-RULE-045) flagged
  for explicit confirmation, not silently assumed either way.** The new vendor-save operation publishes a
  domain event unconditionally on both create and update; the QuickBooks integration subscribes to both —
  correcting the legacy gap by default. An SME confirmation is required before this build phase on whether
  the legacy edit-sync gap was intentional or an unnoticed regression; if intentional, the update-side
  subscription should be removed rather than built.
- **D10 — EDI/Saberis/Aconnex/TecOrder configuration is normalized out of the flat header into a dedicated,
  per-integration-type configuration table** — none of these fields is itself a secret (provider selectors,
  seller/customer id numbers, boolean eligibility flags), so this normalization does not carry a
  secrets-encryption requirement, though the shape supports one for any future field that needs it.
- **D11 — SlipStream Vendor Status is designed as a complete, first-class state machine, but its build is
  explicitly deferred pending product-owner confirmation.** The full state machine (blank → Imported →
  Enrolled → blank) is specified now as a typed enum (closing the legacy webhook's no-allow-list gap by
  construction), but the actual build effort is sequenced last and gated on confirming whether SlipStream is
  a genuinely planned-but-never-activated integration worth building to spec, or dead weight safe to defer.
- **D12 — Multi-tenancy is first-class.** Every entity carries a tenant reference, and every uniqueness
  constraint (Vendor Number, the Line Code aggregate's (vendor, line-code-number) pair, Primary Supplier's
  (vendor, location) pair) is scoped per-tenant, not global.

## Rule-to-Enforcement-Layer Mapping Approach

Each of the 48 business rules catalogued in `business-rules-and-validation.md` should be enforced at the
most appropriate layer for its nature, rather than uniformly at one layer: **domain model invariant**
(enforced inside the aggregate, cannot be bypassed), **application service** (orchestration/side-effect
gating), **DB constraint** (integrity backstop, not the primary enforcement point), and **closed by
construction** (the legacy failure mode is structurally unavailable in the new design, not merely guarded
against).

| Rule group | Rule IDs | Count | Suggested primary layer | Notes |
|---|---|---|---|---|
| Save.php orchestration & Freight PPD coercion | VEN-RULE-001–007 | 7 | Application service (001, 005–007) / closed by construction (002–004) | The undefined-variable coercion bug and the disabled Lines-Purchased normalization block are both closed by construction — one write path/one computed read-model per field, no second divergent implementation to fall out of sync with. |
| Vendors.php entity class | VEN-RULE-008–014 | 7 | Domain invariant (008) / application service (009, 013) / closed by construction (010–012, 014) | Line-code uniqueness (010/011, currently an unwired optional pre-check) becomes closed by construction via D3's database uniqueness constraint. |
| DetailViewAjax.php inline-edit path | VEN-RULE-015–019 | 5 | Domain invariant (015) / closed by construction (016, 017, 019) / application service (018) | The one path that gets Freight PPD coercion right (016) is generalized into D4's single shared command. |
| Delete.php lifecycle | VEN-RULE-020–022 | 3 | Application service (020, 021) / domain invariant (022, reframed) | The silent-skip-on-failure delete (021) becomes an explicit, typed result (Deleted / RejectedUnreceivedPO / RejectedNavigationContext) instead of a redirect indistinguishable from success. |
| Line-code/purchasing cluster | VEN-RULE-023–030 | 8 | Domain invariant (024, 025) / closed by construction (026, 027) / application service (023, 028–030) | 025 (the global-write bug) is D2's own named closure. 028/029 (the identical-system-wide-list cron and its trim bug) are not carried forward as-is — Lines Purchased is redesigned as a genuinely vendor-scoped computed value. |
| Physical address book | VEN-RULE-031–036 | 6 | Application service (031, 034) / domain invariant (032, 033 reframed) / closed by construction (035, 036) | The IDOR gap (033) is closed by construction — every command loads the address scoped by (tenant, vendor, address-id) together. |
| Primary-supplier assignment | VEN-RULE-037–043 | 7 | Application service (038–040) / closed by construction (037, 041, 042) / structural clarification (043) | The cosmetic manufacturer-only alert (037) is not carried forward as decoration — if the business wants it gated, it becomes a real, server-enforced precondition, flagged for confirmation. |
| QuickBooks (OCS) synchronization | VEN-RULE-044–048 | 5 | Application service (044, 047, 048) / closed by construction (045, 046) | 045 (the dead edit-sync enqueue) is D9's own named closure, gated on the SME confirmation D9 itself requires. |

**Total: 48 of 48 rules mapped, none omitted.**

## Suggested Build Sequencing

A recommended build order, sized so each phase has a verifiable, testable completion signal rather than a
subjective "looks right" checkpoint. Vendors' own dependents are narrower than a module with a "blanket
relationship" to the rest of the system — chiefly Purchase Order, with Products and SalesOrder only
consuming the spun-off Line Code aggregate and the Cost Source Resolver — so this module's core should be
built early enough that those two shared services exist before their consumers need them, and strictly
before Purchase Order's own build begins.

1. **Phase 0 — Resolve blocking open decisions.** Product-owner/SME sign-off on: the Vendor Active/Inactive
   need (D5), the Line Code default-row/default-door-code exclusivity scope (VEN-OQ-023), the QuickBooks
   edit-sync-gap intentionality question (D9), and the JSON price-level table's structure (VEN-OQ-006,
   blocks its own finalization). Verify: a decision log, one paragraph per resolved item, checked in before
   Phase 1 starts.
2. **Phase 1 — Core schema: vendor identity plus shared security infrastructure.** Implement the vendor
   header/custom-field collapse, physical address, contact relation, conversion rule, and the shared
   unmapped-fields table, with tenant scoping and the shared parameterized/no-dynamic-column-name
   data-access layer built as reusable infrastructure. Verify: migrations run clean; every header field
   present with stated type/nullability; a unit test proving the shared data-access layer rejects a raw
   string-interpolated query attempt.
3. **Phase 2 — The Line Code bounded aggregate: the vendor-scoping fix and the unified write surface.**
   Implement the Line Code aggregate, its alias and price-level children, and the vendor-scoped save
   commands with the (tenant, vendor, line-code-number) uniqueness constraint — the single highest-priority
   phase, since VEN-RISK-001 and VEN-RISK-010 share this one root cause. Verify: a regression test proving a
   description edit on one vendor's line code cannot alter another vendor's row sharing the same line-code
   number; a uniqueness-constraint test proving a duplicate insert is rejected.
4. **Phase 3 — Security hardening: the remaining confirmed injection points.** Close every remaining
   High/Critical injection finding (VEN-RISK-002–008) across the physical-address CRUD, line-code alias
   save, the freight-PPD command, and the cost-source resolver — including the cross-module Purchase-Order
   write path, once Phase 5's freight-terms command exists. Verify: one negative security-regression test
   per confirmed-vulnerable statement, reproducing the exact cited payload shape and asserting rejection.
5. **Phase 4 — Status/lifecycle and classification.** Implement the (confirmed-need-gated) Active/Inactive
   status field, the single classification enum, the soft-delete/unreceived-PO delete guard, and the
   primary-supplier assignment with its real uniqueness constraint. Verify: state-transition tests covering
   the full transition table; a behavioral (not just static) reproduction of an "All"-classified vendor's
   candidate-list inclusion; a concurrency test proving two simultaneous assignment attempts against the
   same (vendor, location) pair do not both succeed.
6. **Phase 5 — Freight PPD, Cost Source Resolver, and vendor integration config.** Implement the single
   authoritative freight-terms command, the shared cost-source-resolution service, and the normalized
   integration-configuration table — this phase's outputs are the hard prerequisite Purchase Order's and
   Products' own build phases need. Verify: a golden-value regression test (a decimal amount submitted on a
   Dollars-basis vendor persists exactly, not truncated); a test proving the resolver reproduces every
   legacy cost-source-selector value's resolved field.
7. **Phase 6 — QuickBooks and SlipStream event-subscriber integrations.** Implement the vendor
   created/updated event publication (with the update-side QuickBooks subscription gated on Phase 0's
   intentionality confirmation) and the full SlipStream state machine — schema/domain design built now, but
   the SlipStream half of this phase's *build effort* remains gated on Phase 0's confirmation. Verify: a
   contract test proving a duplicated event delivery does not double-push to QuickBooks; a webhook-adapter
   test proving an unrecognized SlipStream status string is rejected, not persisted.
8. **Phase 7 — Cross-module integrations, physical-address hardening, and outputs.** Implement the
   remaining bounded-context read interfaces (VendorInvoice/RebateTracker/Forecasting queries), the
   physical-address IDOR/orphan-row/duplicate-accumulation closures, and the unified CSV export service
   replacing the module's three independently-implemented exporters. Verify: contract tests at each
   bounded-context boundary; a test proving a physical-address CSV import with an unmatched vendor number
   rejects the row rather than inserting an orphaned FK; an IDOR regression test for the address-update
   command.

**Domain model shape (for reference, not a schema spec)**: the source's own draft implementation plan
proposes 10 core entities: `vendor` (header/custom-field collapse), `vendor_integration_config` (D10's
normalized EDI/Saberis/Aconnex/TecOrder cluster), `vendor_physical_address`,
`vendor_primary_supplier_assignment` (D7's constrained version), `vendor_contact` (replacing the drifting
header cache), `vendor_conversion_rule`, `line_code` (D3's spun-off aggregate root), `line_code_alias` (a
child of `line_code`, now given a real delete command), `line_code_price_level` (successor to the
JSON-blob price-level table, kept as an opaque JSON column pending a dedicated follow-up read), and a
shared `legacy_unmapped_fields` reference table for every confirmed-orphan column pending SME confirmation.
The confirmed-dead "Primary Supplier" cache field and the header's "Contact Information" cache are
explicitly **not** carried forward as typed fields (superseded by `vendor_contact`; see
`entities-and-fields.md` §Recommended rewrite schema for the full proposed table set).

## Test/Verification Strategy Pointer

- **Rule-ID-traceable tests**: name or tag each test after its `VEN-RULE-###` id so coverage against the
  rule catalog is mechanically auditable — a script can grep test names against the rule catalog and report
  any rule with zero matching tests. One test per rule id, at minimum, per this template's own standard.
- **Aggregate invariant unit tests**: one test per rule id/decision assigned "domain model invariant" above,
  including the vendor-scoping boundary test (D2/VEN-RISK-001) and the (tenant, vendor, location)
  uniqueness-constraint test (D7).
- **Application-service integration tests**: test through the command handler, asserting on side effects
  (event published, cascade policy applied) rather than internal state, for the save/delete-orchestration
  group, the physical-address group, and the QuickBooks-dispatcher group.
- **Calculation-pipeline golden-output tests**: fixture-based — known Freight-PPD-basis/amount input → exact
  expected persisted value (the decimal-truncation regression case, `calculations.md` §1); known
  cost-source-selector value → exact expected resolved field, reproducing every case the three legacy
  resolvers collectively handled.
- **Security regression tests**: explicit negative tests attempting each of `risks-and-open-questions.md`'s
  documented injection payload shapes (including the Purchase-Order-side write) against the new command
  layer, asserting rejection, not merely "no crash."
- **Critical-risk closure tests**: one dedicated, explicitly-named test per VEN-RISK-### Critical/High
  finding, each asserting the specific legacy failure mode is structurally impossible to reproduce, not
  merely "currently passing."
- **Concurrency tests**: two simultaneous primary-supplier assignment attempts against the same (vendor,
  location) pair, asserting the database constraint rejects the second rather than allowing two rows to
  silently coexist.
- **Event-contract/idempotency tests**: a duplicated vendor-updated/SlipStream-enrollment-confirmed event
  delivery must not double-push to QuickBooks or double-fire a downstream reconciliation eligibility
  change.
- **Migration/data-integrity audit scripts** (not unit tests against new code): run against the legacy
  system's live data to quantify how many Vendor Line Code rows would collide under the new per-vendor
  uniqueness constraint before any migration decision is made, and to re-validate the alias-table injection
  closures against a production-like snapshot once one is available (VEN-OQ-007).

---

*Per the source blueprint's own framing, `risks-and-open-questions.md`'s VEN-RISK-001 through VEN-RISK-008
need legacy-system remediation independent of any rewrite timeline — this build guidance describes the
new-system design, not a substitute for that urgent hotfix work.*
