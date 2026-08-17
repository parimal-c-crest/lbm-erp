# Pricebooklevel800 — Build Guidance

> Guidance for Stage 4, stated stack-neutrally.

Source: `docs_from_blueprint/module/Pricebooklevel800/10-build-guidance.md`, ultimately derived from
`blueprint/module/Pricebooklevel800/09-implementation-plan.md` (Doc2) and
`10-deployment-cutover-outline.md` (Doc3). **Doc2's own status note is preserved here: "drafted, not
yet reviewed by the user"** — this file mirrors that status rather than presenting the plan as final.
Doc3's own status note ("outline complete") is also preserved as-is. This section is guidance for
however a downstream process structures its own implementation-plan and testing documentation — it is
not itself an implementation plan, a schema migration script, or an API specification.

## Recommended Domain Model

Doc2 recommends treating the header entity and the sibling rule entity as **one bounded context**, not
two, given the confirmed finding that they function as a single business entity split across two
legacy modules with no real encapsulation between them (see `integrations.md`):

```
PriceBookTier (aggregate root)
  - id, name (unique — enforced at the storage level, closing PBL800-RULE-004)
  - description
  - listPriceLowerThanSellPriceAllowed: bool   (replaces the header floor-guard flag)
  - defaultMultiplier: decimal                 (replaces header Times, if PBL800-OQ-003 confirms it's live)
  - defaultPennyRoundRule: enum
  - defaultPriceLevelCode: enum(SP, LP, CM, M1..M10)
  - autoCreateRulesFromCostBookSync: bool       (replaces autoupdatefrompcb, pending PBL800-OQ-002)
  - isSystemDefault: bool                       (replaces the system-default flag; single-exclusive,
                                                  enforced by a storage-level partial unique constraint
                                                  or a transactional set/clear, not the legacy two-step
                                                  "clear all then set one" pattern)
  - status: Active | Deleted

  PriceRule (child entity, owned by PriceBookTier — real foreign key, not string-matched name)
    - id, priceBookTierId (FK, NOT NULL, cascade-delete)
    - lineCode, subline, productDivision, productId, priceCode, salesRank  (nullable = wildcard,
                                                                             matching legacy semantics
                                                                             exactly)
    - pcRange: nullable structured range (from, to|INFINITE) — replace the legacy free-text range
      string with two typed nullable columns
    - priceLevel, times, addSubtract, netPrice, gpPercentage, muPercentage, pennyRound
    - createdFrom: enum(Authored, CostBookSync)
```

**Key structural change from legacy**: `PriceRule.priceBookTierId` is a **real foreign key**, not a
name-string match. This closes the confirmed data-integrity gap (orphaned rules surviving header
deletion, `entities-and-fields.md` §4) by construction — the storage layer itself refuses to leave a
rule pointing at a deleted/nonexistent tier, replacing the legacy dead cascade-delete function that
was written but never wired up.

`Account.priceBookTierId` (replacing the legacy assignment column) becomes a **nullable foreign key**
to `PriceBookTier`, with a distinct, explicit "use product's own list price" sentinel (replacing the
legacy `"LP"` magic string) modeled as either a nullable-FK-means-that convention or an explicit enum
value — team's choice, documented as an open design decision either way, but the legacy free-text
`"LP"`/blank/anything-else three-way branch must not be reproduced as opaque string comparison in a
new implementation.

## Rule-to-Enforcement-Layer Mapping Approach

Each of the 14 business rules catalogued in `business-rules-and-validation.md` should be enforced at
the most appropriate layer for its nature, rather than uniformly at one layer:

- **Domain model invariant** — enforced inside the `PriceBookTier`/`PriceRule` aggregate boundary
  itself: the storage-level unique-name constraint (closes PBL800-RULE-004), the required
  `priceBookTierId` FK on every rule (closes PBL800-RULE-009's reverse direction), the single-exclusive
  `isSystemDefault` constraint.
- **Application-level orchestration check** — enforced at the level that coordinates multiple
  entities or triggers a side effect: the delete flow's cascade-or-block decision (closes
  PBL800-RULE-007/008), the "set as default" transactional service (closes PBL800-RULE-014's silent
  partial-success), the Apply-to-Accounts bulk-update service.
- **Data-layer constraint** — a last-resort integrity backstop (e.g. the FK constraints themselves),
  not the primary enforcement point for a business rule — business rules should fail with a clear,
  specific, business-meaningful message before a generic data-layer rejection is ever reached.

| Rule group | Rule IDs | Rule count | Suggested primary layer |
|---|---|---|---|
| Header validation | PBL800-RULE-001–006 | 6 | Domain invariant (name uniqueness, required fields) + data-layer constraint (NOT NULL/enum) |
| Delete validation | PBL800-RULE-007–008 | 2 | Application-level orchestration (cascade-or-block decision), replacing the legacy two-path split with exactly one guarded path |
| Rule-row validation | PBL800-RULE-009–011 | 3 | Domain invariant (explicit named-field DTO replacing the allow-list-free dynamic write, closing PBL800-RULE-009); product-count feature (PBL800-RULE-011) pending a Phase-0 rebuild-or-drop decision |
| Client-side-only validation | PBL800-RULE-012–013 | 2 | Must gain a server-side mirror in the new implementation — currently provides no actual enforcement |
| Mass-action validation | PBL800-RULE-014 | 1 | Application-level orchestration (single-selection enforced server-side, not silently truncated) |

**Total: 14 of 14 rules mapped, none omitted.**

## Design Decisions

1. **Merge `Level800rules` into this aggregate at design time**, even though legacy treats them as
   separate modules — per the confirmed structural finding. If the sibling `Pricebooklevel200`/`300`
   blueprints confirm the identical shape (expected, given the shared dead cascade-delete function
   already treats all three tiers uniformly), design one generic `PriceBookTier`/`PriceRule` pair
   parameterized by tier, not three near-duplicate implementations — this is the single most
   consequential structural decision Doc2 makes, and should be revisited once the cross-sibling
   consolidation pass completes.
2. **Close every Critical/High finding by construction**: parameterized queries/an ORM everywhere
   (closes PBL800-RISK-001 through PBL800-RISK-004 and PBL800-RISK-005 from `risks-and-open-
   questions.md`), and the four Campaigns-leftover files (PBL800-RISK-006) are simply **not ported** —
   they have no Pricebooklevel800-specific logic to preserve.
3. **Replace the header save flow's allow-list-free dynamic rule-field write** (PBL800-RISK-001) with
   an explicit, named-field data-transfer object for rule edits — no regex-driven arbitrary-column
   mass assignment of any kind.
4. **Give the "set as default" operation** (PBL800-RISK-003) a proper transactional service method
   that clears/sets the flag in one transaction and updates the *new-Account default* via an explicit
   application-config value, not a direct write into a generic field-metadata table — closes both the
   injection and the architecturally-surprising "editing a row on this list mutates unrelated field
   metadata" side effect.
5. **Rebuild the delete flow with a real cascade** (closing the orphan-data findings): deleting a
   `PriceBookTier` either (a) cascades to soft-delete its `PriceRule`s and clears the FK on any Account
   currently assigned to it (with an explicit user-facing warning listing affected account count,
   replacing the legacy single-usage-guard-message pattern), or (b) is blocked outright if any Account
   is still assigned, matching the legacy guarded path's existing intent but making it the **only**
   delete path (retire the legacy unconditional delete path entirely — PBL800-RULE-007's bypass finding
   is closed by having exactly one delete code path, not two with different guarantees).
6. **Fix the product-count feature's two SQL syntax errors** (PBL800-RISK-002) as part of a
   from-scratch reimplementation — decide first (Phase 0 product-owner call) whether this feature is
   worth preserving at all, given it has apparently been non-functional in legacy for long enough that
   the syntax errors were never caught/reported.
7. **Fix the CSV export's wrong-entity targeting** (PBL800-RISK-008) by giving a new implementation's
   export feature an explicit choice: export the currently-listed `PriceBookTier` headers (matching
   what the list view actually displays, closing the legacy UX mismatch), and offer a *separate*,
   explicitly-labeled "export this tier's rules" action for the rule-level data — not one ambiguous
   "Export" button doing the latter while the grid shows the former.
8. **The missing color-code-settings handler** (PBL800-RISK-009 / PBL800-OQ-007): resolve before
   build — either locate and port the legacy handler (if it turns out to be registered elsewhere) or
   drop the dead client-side button.
9. **`autoupdatefrompcb`/PCB-sync** (PBL800-OQ-002): explicitly out of this module's rewrite scope
   until the actual sync process is located and blueprinted; model the field as a passthrough boolean
   for now, do not attempt to reimplement sync logic sight-unseen.

## Suggested Build Sequencing

1. **Phase 0 (decision gate)**: product-owner sign-off on (a) merging the rule entity into each tier's
   aggregate per decision #1, pending sibling-pass confirmation; (b) whether the product-count tooltip
   feature (decision #6) is worth rebuilding; (c) resolution of PBL800-OQ-001 (is the current
   0.0000-price condition live in production today — if yes, this may need an **out-of-band legacy
   hotfix** before/independent of the rewrite, see §Deployment/Cutover Notes below).
2. **Phase 1 — schema & migration**: define `PriceBookTier`/`PriceRule` tables with real foreign keys;
   write a migration that (a) creates rows in the new schema from the legacy header/rule tables
   (currently 0 header rows / 8 rule rows to migrate for this tier specifically), and (b) **explicitly
   resolves the 932 orphaned account-assignment values** — per PBL800-OQ-004, first check whether they
   match a live sibling-tier header row (in which case they migrate to *that* tier's new aggregate, not
   this one) before treating any of them as unrecoverable orphan data needing manual reconciliation.
   Verify: every field group in `entities-and-fields.md` has a typed home; the FK on
   `PriceRule.priceBookTierId` is `NOT NULL`.
3. **Phase 2 — core CRUD & validation**: tier-header CRUD with a storage-level unique-name constraint
   (closes PBL800-RULE-004), rule CRUD via the foreign-key relationship. Verify: one test per rule ID
   at minimum.
4. **Phase 3 — pricing service**: reimplement the specificity-scoring/range-filter algorithm
   (`calculations.md`) as an independently unit-testable rule-matcher service, with explicit test
   cases for every specificity-tie scenario and the floor-guard behavior. Verify: golden-output tests
   reproduce the documented pipeline exactly against known inputs.
5. **Phase 4 — Accounts integration**: the tier-assignment foreign key on Account, plus the bulk
   "apply to accounts" feature (replacing the legacy bulk-write files) as a single parameterized
   bulk-update service call, not per-id raw-SQL loops. Verify: a contract test confirms neither the
   price-book-id list nor the Account-id list can carry unescaped SQL structure (closes PBL800-RISK-004).
6. **Phase 5 — system-default & duplication features**: a `setSystemDefault` service (decision #4),
   rule duplication-across-tiers feature (replacing the legacy duplicate-rule flow, using the new
   foreign-key-based tier reference instead of a name-string destination list).
7. **Phase 6 — cutover**: see §Deployment/Cutover Notes below.

## Test/Verification Strategy Pointer

- **Rule-ID-traceable tests**: name or tag each test after its PBL800-RULE-### rule ID so coverage
  against `business-rules-and-validation.md` is mechanically auditable, matching the SalesOrder pilot
  spec's own convention.
- **Golden-output tests** for the pricing pipeline (`calculations.md`): known product/rule/price-code-
  range inputs paired with exact expected outputs, reproducing the documented specificity-scoring and
  tiebreak behavior precisely.
- **Data-integrity closure test**: an explicit, dedicated test asserting that deleting a
  `PriceBookTier` with owned `PriceRule`s and/or assigned Accounts either cascades correctly or is
  blocked outright — never silently orphans data the way the legacy system's two independent,
  non-cascading delete paths did.
- **Security regression tests**: one dedicated, explicitly-named test per Critical/High finding in
  `risks-and-open-questions.md` (PBL800-RISK-001 through PBL800-RISK-006), each asserting the specific
  legacy failure mode (unbounded column-name mass assignment, the second-order rule-scope injection,
  the global-metadata-mutation injection, the account-list/price-book-list injection reaching Accounts'
  own assignment column, the unescaped dropdown render, the Campaigns access-control bypass) is
  structurally impossible to reproduce, not merely "currently passing."
- **Migration/data-integrity audit scripts** (not unit tests against new code) — run against the
  legacy system's live data to resolve PBL800-OQ-004 (where the 932 orphaned account-assignment values
  actually belong) before any migration decision is made about how to handle them.

## Deployment / Cutover Notes

- **Security remediation urgency**: Doc3 recommends **same-day, rewrite-independent legacy patch**
  remediation for PBL800-RISK-003 (the global-metadata-mutation injection) and PBL800-RISK-004 (the
  Accounts-pricing-tier-redirect injection) — both have blast radii extending beyond this module's own
  data and are reachable via ordinary authenticated-user request shapes, not requiring unusual attacker
  positioning. PBL800-RISK-001 (the header/rule-field injection) should be included in the same
  targeted patch pass, since it remains a live, unconditionally-reachable injection on the module's
  core save flow. PBL800-RISK-002's exploitability is currently gated by its own pre-existing SQL
  syntax errors (lower immediate urgency, though still worth including if feasible). PBL800-RISK-005/
  PBL800-RISK-006 are recommended for inclusion in the same patch pass but are not blocking.
- **Hard blockers for setting a cutover date** (Doc3): (1) resolving PBL800-OQ-001 (whether the
  0.0000-price condition is live in production today) — this must be resolved before any cutover date
  can be set, since it determines whether the rewrite replaces a currently-broken pricing path or a
  currently-working one requiring output-parity validation against real legacy pricing outputs; (2)
  resolving PBL800-OQ-004 (where the 932 orphaned account-assignment values actually belong) — required
  before the Phase 1 migration can run without silent data loss or misassignment; (3) the sibling-pass
  dependency on Design Decision #1 (merging the rule entity into one aggregate) — only provisional
  until the parallel sibling-tier blueprint passes confirm or refute the identical structural shape.
- **Cutover sequencing**: this tier's own live-data footprint is currently small (0 header rows, 8 rule
  rows) relative to the 932-account assignment surface — migration risk is concentrated almost entirely
  in correctly resolving those orphaned/cross-tier assignments (Phase 1), not in migrating a large
  volume of this tier's own header/rule data. Doc3 recommends cutting over **together with, not
  independently of**, the sibling `Pricebooklevel200`/`Pricebooklevel300` tiers, given the shared
  dead-cascade-function finding and the shared client-side integration points — cutting over this tier
  alone while the legacy system still serves the other two tiers risks the same kind of orphaning this
  blueprint found, this time between the new system and the still-legacy siblings. No external-partner
  coordination is needed for this tier's own cutover, since no external-system integration was found.
- **Rollback considerations**: given the currently-empty header table, a rollback of just this tier's
  own data is low-risk. The higher-risk rollback surface is the Accounts assignment-column migration
  (Phase 1) — Doc3 recommends the migration be additive/reversible (preserve the legacy assignment
  string value alongside the new foreign key during a transition window) rather than a destructive
  one-way cutover, so a rollback does not require reconstructing the original string values from the
  new foreign-key-based schema.

---

*This file, together with the module's overview, entities, business rules, calculations, workflows,
outputs, integrations, screens/user-flows, permissions, and risks/open-questions files, forms the
complete tech-agnostic Pricebooklevel800 module specification.*
