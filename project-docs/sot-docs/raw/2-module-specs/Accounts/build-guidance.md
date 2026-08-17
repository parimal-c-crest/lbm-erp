# Accounts — Build Guidance

Source: `docs_from_blueprint/module/Accounts/10-build-guidance.md`, ultimately derived from
`blueprint/module/Accounts/09-implementation-plan.md`. This section is guidance for however a
downstream process structures its own implementation plan and testing documentation — it is not
itself an implementation plan, a schema migration script, or an API specification. Stated
stack-neutrally throughout.

## Governing design decisions (context for the mapping/sequencing below)

Unlike SalesOrder's spec, Accounts' entity/field catalog does not carry forward-looking
architectural requirements analogous to SalesOrder's R1-R5 — instead, the source implementation plan
documents seven governing decisions (D1-D7), each closing a specific legacy finding documented
elsewhere in this module spec. Summarized here because the rule-to-layer mapping and build
sequencing below both depend on them:

- **D1** — no generic dynamic-field/EAV mechanism, despite ~75% of Accounts' ~460 fields sitting on
  the legacy custom-field-extension table (vs. SalesOrder's ~24%). Every one of those fields is a
  known, fixed, developer-added business field with a real UI label, not evidence of runtime
  end-user extensibility. New schema uses explicit typed columns for every catalogued field,
  collapsing the current two-table header-plus-extension split into one table.
- **D2** — credit cards on file become tokenized-vault references only; the legacy raw-card-table
  pattern (and its Critical missing-table risk, ACC-RISK-002) is not carried forward. A credit-card
  reference stores a gateway-issued token/profile id and display metadata only — never a full card
  number, CVV, or other card-data-bearing value. The legacy 50-card cap and its off-by-one gap
  (ACC-RISK-011) are not ported.
- **D3** — one statement aggregate service with pluggable delivery channels, replacing the
  shared-stateful-class-plus-standalone-delivery-scripts pattern, closing the confirmed full/quick
  statement discount-text drift (ACC-RISK-012) by construction — one code path decides
  whether/how the discount-text parser runs, not two independently-maintained functions that can
  disagree.
- **D4** — one authoritative finance-charge formula, replacing the two independently-maintained
  engines (calculations.md, ACC-RISK-003). The daily-accrual rate for shortest-payment-term accounts
  (the cron engine's behavior) is adopted as the target for every trigger path — **explicitly flagged
  as a business-behavior change requiring subject-matter-expert sign-off** before this phase
  proceeds, since any shortest-term account previously charged manually would see a materially
  smaller charge once unified. The opposite resolution (drop the daily-rate branch, standardize on
  ÷12 everywhere) is equally acceptable design-wise; carrying two silently-divergent formulas forward
  is not.
- **D5** — multi-tenancy is first-class: every entity carries a tenant reference, every uniqueness
  constraint (account number, SPA code per account, etc.) is scoped per-tenant, not global.
- **D6** — security-by-construction: parameterized queries by default everywhere, structurally
  closing the confirmed SQL injection in the SPA-code save endpoint (ACC-RISK-001) and the
  plaintext/unparameterized B2B login (ACC-RISK-006) — the new data-access layer makes raw
  string-interpolated SQL structurally unavailable for business-logic code, not merely
  code-review-enforced. Password authentication uses salted-hash comparison with rate-limiting on
  the B2B login path.
- **D7** — QuickBooks integration is excluded-pending-confirmation (every queue-enqueue call site is
  confirmed commented out, ACC-RISK-005); B2B integration is carried forward but with its
  authentication, transport (disabled cert verification), and credential-delivery (plaintext-password
  welcome email) failure modes all redesigned.

## Rule-to-Enforcement-Layer Mapping Approach

Each rule should be enforced at the most appropriate layer (data constraint, domain invariant, or
application-level check) depending on the rule's nature — not all rules belong in one layer. The
source implementation plan groups all 112 ACC-RULE rules (see business-rules-and-validation.md) by
the legacy source file each was extracted from, so traceability back to the rule catalog stays
direct. Enforcement layers use the same vocabulary as SalesOrder's own build guidance: **domain model
invariant** (enforced inside the aggregate itself, cannot be bypassed by any operation reaching it),
**application service** (orchestration/side-effect gating across multiple entities), **data-layer
constraint** (a last-resort integrity backstop, not the primary enforcement point).

| Rule group | Rule IDs | Count | Suggested primary layer |
|---|---|---|---|
| Save orchestration | ACC-RULE-001–016 | 16 | Application service — almost entirely field-cascade/auto-fill/consistency-override logic, not domain invariants. The duplicate-account-number rule (currently only an informational client-side check) becomes a real domain invariant backed by a uniqueness constraint plus an application-service pre-check for a friendly error. The credit-limit and MPL cascades to Jobs become explicit domain events, not synchronous cross-table writes. |
| Account entity | ACC-RULE-017–028 | 12 | Mixed — domain invariant (address-default determinism and related entity-state rules) / application service (statement-mode branch selection, company-info fallback) / **redesigned entirely** (the plaintext-SQL-concat B2B login, replaced by a hashed-credential domain service per Decision D6; the B2B permission-check-skip finding, closed by construction since B2B requests authenticate via a distinct service-to-service credential rather than falling through an empty branch of the normal user-permission check). |
| Merge / account-merge | ACC-RULE-029–037 | 9 | Application service, with one capability **explicitly deferred**. The file historically named for "merge" is confirmed to be an unrelated legacy mail-merge export feature and is renamed accordingly. The real account-merge/dedupe orchestration wrapper becomes an application service — but its actual field-reassignment logic was never read in any source pass and is a build-blocking gap: this guidance cannot specify per-child-entity merge rules until that follow-up read happens (see Phase 0 below). The confirmed check-then-act timing gap between the merge pre-check and the actual merge submission becomes a domain invariant: the merge command acquires a proper lock, not a session-scoped lock file checked only by a separate endpoint. |
| Finance-charge application | ACC-RULE-038–047 | 10 | Domain model invariant (the principal computation, rate application, and posting gate) / application service (account-scope eligibility filtering) / **unified into Decision D4** (the rate-divisor and threshold-gate rules). A raw-SQL ledger-insert bypass for one specific caller context is not carried forward — every ledger write goes through the ledger aggregate's own save path, no bypass for any caller. |
| Statement engine | ACC-RULE-048–095 | 48 | Domain model invariant (child-account redirect logic, the balance-forward aging waterfall, remaining-amount computation) / application service (delivery-gating rules, statement-mode branch selection) — the largest, most heterogeneous group, mirroring the source's own single-file concentration. The quadruplicated term-parsing logic collapses into one shared domain service. The three-path remaining-amount divergence collapses into one calculator selected by an explicit accounting-basis value. The confirmed condensed-vs-full statement drift (Decision D3) is closed structurally rather than by choosing which of the two legacy behaviors is "correct." |
| Billing-cycle cron | ACC-RULE-096–099 | 4 | Application service (branch selection, frequency-specific recompute) / domain model invariant (the daily reset rule, the manual-frequency zero-out-on-bad-data behavior). |
| Billing-cycle date save | ACC-RULE-100 | 1 | Data-layer constraint plus application service — the confirmed no-validation gap (no check that a cycle's start date precedes its end date) gets both a database-level check constraint and an application-service-level friendly-error pre-check. |
| Past-due cron | ACC-RULE-101–103 | 3 | Application service — scoped entirely to the QuickBooks-integration surface, excluded-pending-confirmation per Decision D7; documented for completeness but not built until QuickBooks sync is confirmed live. |
| SPA-code save | ACC-RULE-104–106 | 3 | Domain model invariant (required-field and per-account-uniqueness rules, the latter additionally backed by a database constraint) / **eliminated by Decision D6** (the unquoted-numeric-field SQL-injection finding — not "mapped to a layer," structurally impossible under the new data-access approach). |
| SPA-code listview actions | ACC-RULE-107–108 | 2 | Application service — the confirmed per-action permission-check inconsistency (Duplicate ungated while Edit/Delete are gated — see permissions.md) becomes a domain invariant: all actions on the listview go through the same authorization check, no per-action inconsistency possible by construction. |
| Credit-card management | ACC-RULE-109–112 | 4 | **Superseded by Decision D2** — the missing-table risk cannot recur under the vault-only design; the 50-card-cap off-by-one gap is replaced by a domain invariant with a correctly-inclusive boundary check if any display cap is retained at all; the SalesOrder-originated abbreviated-response behavior becomes an explicit response-shape parameter rather than a hardcoded caller-identity string check; the one confirmed field-catalog gap (two fallback fields with no entry in the entity catalog) is parked pending subject-matter-expert confirmation of their origin. |

**Total: 112 of 112 rules mapped, none omitted**, per the source implementation plan.

## Suggested Build Sequencing

A recommended build order, sized so each phase has a verifiable, testable completion signal rather
than a subjective "looks right" checkpoint. The source implementation plan documents nine phases —
one more than SalesOrder's seven, reflecting Accounts' broader integration surface and the
credit-card security redesign's distinct risk profile.

0. **Resolve blocking open decisions** — subject-matter-expert answers for items that block later
   phases: the account-merge-process follow-up code read (see risks-and-open-questions.md
   ACC-OQ-010), the parent-account/B2B-account-id duplicate-column collapses, confirmation of
   whether Total Owed is updated synchronously at cross-module finalize time (ACC-OQ-014), the
   QuickBooks live-or-dead confirmation, and the B2B password-migration approach (forced reset vs.
   hash-in-place). Verify: a decision log exists, one entry per resolved item, before Phase 1 starts.
1. **Schema** — implement the seventeen core entities plus a holding area for unmapped/orphan fields
   pending subject-matter-expert confirmation, with constraints (including the billing-cycle
   start-before-end check and the SPA-code/product-mapping uniqueness constraints), indexing, and
   tenant scoping. Verify: migrations run clean against an empty database; every field group has a
   typed home; no generic dynamic-field mechanism exists (D1 self-check); no column exists capable of
   holding a raw card number (D2 self-check).
2. **Domain rules (invariants)** — implement every rule assigned "domain model invariant" above:
   duplicate account-number/SPA-code prevention, address-default determinism, billing-cycle date
   ordering, credit-card boundary checks. Verify: one test per rule ID at minimum, all passing.
3. **Status / Fanbuilder** — implement the account status field as a plain enum with no state machine
   (per the status-workflow finding that Accounts has no real status workflow, workflows.md) and the
   Fanbuilder-status domain service, which does have a confirmed guarded transition and a real
   cross-module consumer. Deliberately the smallest phase in this sequence. Verify: Fanbuilder
   transition tests cover every documented transition; the account-status field has no
   transition-guard tests because none are specified — a documented absence, not an oversight.
4. **Financial/calculation pipeline** — implement the finance-charge calculator and eligibility
   service (Decision D4, **depends on Phase 0's finance-charge-formula and B2B-migration
   decisions**), the remaining-amount calculator, the billing-cycle past-due calculator, the term
   schedule resolver, the credit-limit query capability (**depends on Phase 0's Total-Owed
   sync-timing confirmation**), and the tax-exemption resolver. Verify: golden-output tests
   reproducing every documented formula exactly against known inputs/outputs, including the
   balance-forward three-pass waterfall and the two intentionally different discount-credit basis
   formulas — not "simplified" during reimplementation.
5. **Screens/operations** — implement the capability layer implied by screens-and-user-flows.md:
   account CRUD, the credit-limit query, statement generation, credit-card vault operations,
   SPA-code/MPL-exception management. Verify: each capability has an implemented handler with at
   least one integration test; a contract test confirms no handler accepts a raw card number as input
   (D2 self-check at the operation-surface level).
6. **Statement engine and outputs** — implement the unified statement-generation capability
   (Decision D3), the statement-line rebuildable-projection refresh mechanism, and the pluggable
   delivery channels for all ten output types (outputs.md). Verify: snapshot tests for each output
   type against known account/statement data; a regression test confirming the full and condensed
   statement requests produce identical discount-text-gating decisions for the same input (closing
   the drift Decision D3 exists to prevent).
7. **Cross-module integrations** — implement the bounded-context interfaces documented in
   integrations.md: the SalesOrder query/event relationship, the Jobs event-driven cascade, a unified
   Contacts link service, the RoaAdj command surface, and the narrow PriceBooks/MPS status-flip
   relationship. QuickBooks and general B2B/Fanbuilder external adapters per the risk mitigations in
   risks-and-open-questions.md. Verify: contract tests at each bounded-context boundary; a
   security-regression test suite covering every B2B/SQL-injection-class finding, each asserting the
   specific legacy failure mode is rejected — not merely "assumed fixed by the framework."
8. **Credit-card vault migration and cutover** — migrate any recoverable legacy card-reference data
   into the vault-reference table, execute the B2B password-reset-vs-hash-in-place decision from
   Phase 0, and run a migration-validation script confirming zero raw-card data exists anywhere in
   the new system. **Sequenced last, deliberately isolated**, given its distinct security-compliance
   risk profile compared to the rest of the schema migration. Verify: the migration-validation script
   reports zero raw-card-data matches across the full new schema, including any unmapped-field
   holding area; every B2B account holder has either a fresh password hash or a pending
   forced-reset flag, never a carried-forward plaintext value.

## Test/Verification Strategy Pointer

- **Rule-ID-traceable tests**: name or tag each test after its ACC-RULE-### rule ID so coverage
  against business-rules-and-validation.md's rule catalog is mechanically auditable (a script can
  grep test names against the rule catalog and report any rule with zero matching tests), rather than
  relying on manual review.
- **Golden-output tests** for the financial pipeline: known account/statement-line inputs paired with
  exact expected finance-charge, total-owed, and per-aging-bucket outputs, reproducing the documented
  formulas in calculations.md precisely — including the two intentionally different discount-credit
  basis divisors, which should be preserved exactly rather than "simplified" by an engineer unfamiliar
  with why they differ.
- **Statement-drift regression test**: a dedicated test asserting that generating a statement with
  the condensed flag on and off produces identical discount-text-gating decisions for the same
  account/term/date-range input — the specific regression Decision D3 exists to prevent.
- **Security regression tests**: explicit negative tests attempting the exact SQL-injection pattern
  documented for the SPA-code save endpoint (ACC-RISK-001) against the new equivalent operation,
  asserting rejection; an explicit attempt at B2B login with a SQL-injection-shaped username/password,
  asserting rejection rather than merely "no crash"; a test asserting that any outbound B2B/Fanbuilder
  call rejects a self-signed or otherwise invalid certificate, not merely assuming transport security
  is on (risks-and-open-questions.md ACC-RISK-001, ACC-RISK-006, ACC-RISK-007 for full risk detail
  these tests close).
- **Critical-risk closure tests** — one dedicated, explicitly-named test per Critical/High finding in
  risks-and-open-questions.md (the SQL injection, the missing credit-card table, the finance-charge
  divisor divergence, the undefined-variable defect, the dead QuickBooks queue, the plaintext B2B
  authentication), each asserting the specific legacy failure mode is structurally impossible to
  reproduce — for example, a static schema-introspection test asserting the new credit-card table has
  no column capable of holding a raw card number, not merely a runtime behavioral test.
- **Migration/data-integrity audit scripts** (not unit tests against new code) — run against the
  legacy system's live data to quantify how many records fall into each documented ambiguous/orphan
  field bucket (see entities-and-fields.md's Known Gaps) and to validate zero raw-card data exists
  anywhere in the migrated system, before any migration decision is finalized about how to handle
  them.
