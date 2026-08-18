# UOM — Field Extraction: Open Questions

**Origin: 1 (extracted-from-existing-system)** — adapted from the existing UOM legacy blueprint at
`project-docs/sot-docs/raw/2-module-specs/UOM/risks-and-open-questions.md`.

## Legacy's four original open questions (UOM-OQ-001 through 004) — RESOLVED this session

These were confirmed with the developer prior to this extraction pass (per this task's instructions)
and are recorded here as resolved, not left open:

| ID | Original Question | Resolution |
|---|---|---|
| UOM-OQ-001 | Tenant scoping — genuinely shared, or a latent multi-tenancy gap? | **Moot.** ADR-056 locked database-per-tenant project-wide; no tenant column is needed on any UOM table. Superseded ADR-004 (which had proposed row-level security specifically to close this exact gap) no longer applies. |
| UOM-OQ-002 | Should a formal `UOM-VAL-###` rule catalog be produced before build? | **Resolved by this extraction pass itself.** `business-rules.md` in this folder (UOM-RULE-001 through 018) is that catalog. |
| UOM-OQ-003 | Migration scope — how many of the 46+ legacy direct-access call sites need to change? | **Moot.** This is a fresh rewrite, not an incremental migration of legacy PHP files — the legacy call-site count is not relevant to build scope. The *architectural* lesson from those 46+ sites (no direct table access, ever) is preserved as UOM-RULE-015 / ADR-053; the literal count is not carried forward as a migration checklist. |
| UOM-OQ-004 | Whether the picking-hierarchy flag and actual row presence are ever inconsistent in live data | **Moot.** No live-data audit is in scope for a fresh rewrite. The underlying design question (should flag/row-presence consistency be enforced going forward?) is a separate, still-open item — see UOM-RULE-013 below, not resolved by this disposition. |

## Blocking items resolved with the developer this session

| ID | Question | Resolution |
|---|---|---|
| UOM-FX-OQ-002 | What is `UOMTypeFactorHistory`'s real key — per-Type, or per-(Group, Type) like the conversion factor it's tracking history for? | **RESOLVED — key is (Group, Type) together**, confirmed by the developer, matching `UOMConversionFactor`'s own key (not Type-only). This directly contradicts ADR-096's literal Decision-text wording ("versioned at the UOM Type level") and its Consequences line's column list (which named only `uom_type_id`) — per the developer's own instruction, ADR-096's original Decision/Consequences text is left unedited for historical traceability, and a short **Amendment** note has been appended under ADR-096 in `decisions-log.md` recording this resolution. See `entities-and-fields.md` and `business-rules.md` in this folder, both updated to reflect the (Group, Type) key. |
| UOM-FX-OQ-003 | Does a missing conversion factor for a non-Base Type produce a rejected operation, a clear error, or something else? | **RESOLVED — prevention, not a transaction-time reject/fallback decision.** Developer chose a structural fix over either original option: `UOMGroup` save-time validation now rejects the Group save itself if any Functional-Role-assigned Type lacks a conversion factor (see new **UOM-RULE-019** in `business-rules.md`). This makes "missing factor at conversion/transaction time" structurally impossible, so the original question (reject vs. graceful-error vs. something else, evaluated *at conversion time*) no longer applies — it's prevented earlier, at Group save. |

## Non-blocking items resolved with the developer this session

| ID | Question | Resolution |
|---|---|---|
| UOM-FX-OQ-006 | Does deleting a `UOMGroup` require an in-use guard against Products' `uom_group_id` references, the way Type/Category/Role deletion is guarded (UOM-RULE-014)? | **RESOLVED — yes, and extended beyond delete-only to a full field lock.** Developer decision (**ADR-190**): once a `UOMGroup` is referenced by any transaction, it becomes read-only and undeletable (Group Name is the sole editable exception), extending UOM-RULE-014's in-use `RESTRICT` pattern up to the Group entity itself. See new **UOM-RULE-020** in `business-rules.md`. |
| UOM-FX-OQ-008 | Legacy's case-sensitive Group-name-uniqueness check (UOM-RULE-001) — should the rewrite keep case-sensitive uniqueness, or move to case-insensitive? | **RESOLVED — case-insensitive, checked on both create and rename.** Developer decision (**ADR-191**): "Test" and "test" are the same name, the second rejected as a duplicate; the check runs on every write to Group Name, not just initial creation, since ADR-190 keeps Group Name editable indefinitely even on an otherwise-locked Group. See amended **UOM-RULE-001** in `business-rules.md`. |
| UOM-FX-OQ-001 | Should `UOMType` carry a `category_id`, scoping a Type to a Category? | **RESOLVED — yes, but optional, not required.** Developer decision (**ADR-192**): `UOMType` gains an optional `category_id` FK to `UOMCategory` — a Type may declare which Category it belongs to (e.g. "Feet" → "Length") but isn't required to. See amended `UOMType` field table in `entities-and-fields.md`. |
| UOM-FX-OQ-004 | Is a UOM Group usable when fewer than all Functional Roles have an assignment — e.g. only Base and Selling populated? | **RESOLVED — yes, via Base-Type fallback.** Developer decision (**ADR-192**): a Functional Role with no explicit Type assignment for a Group falls back to that Group's Base Type at resolution time, rather than blocking the operation. Applies wherever any consumer resolves "which Type fulfills role X for this Group." See new **UOM-RULE-021** in `business-rules.md`. |
| UOM-FX-OQ-005 | Should the "Uses Picking Hierarchy" flag and actual picking-hierarchy row presence be reconciled automatically, enforced as a hard consistency rule, or left as two independently editable facts? | **RESOLVED — the flag is removed entirely and replaced with a computed value.** Developer decision (**ADR-192**): "Uses Picking Hierarchy" is true if picking-hierarchy rows exist for the Group, false otherwise — not a stored, independently editable field. Removes the flag/row-presence inconsistency structurally, the same reasoning pattern as ADR-190's approach to the conversion-factor gap. See amended **UOM-RULE-013** in `business-rules.md` and the removed-field note in `entities-and-fields.md`. |
| UOM-FX-OQ-007 | Should `UOMFunctionalRole` deletion be guarded the same way Type/Category deletion is (UOM-RULE-014), given it's a new entity legacy never had? | **RESOLVED — yes, confirmed.** Developer decision (**ADR-192**): `UOMFunctionalRole` deletion is guarded by the same in-use `RESTRICT` pattern as `UOMType`/`UOMCategory` (UOM-RULE-014) — blocked while any `UOMRoleAssignment` row still references it. Firms up what this document had previously extended on its own reasoning without independent confirmation. See amended **UOM-RULE-014** in `business-rules.md`. |

## New open questions surfaced during this extraction

These arose from applying the field-extraction rigor bar (every field, every rule, Confidence-tagged)
to material the legacy blueprint itself flagged as thinner than a full blueprint pass, plus gaps that
appeared when reconciling the legacy shape against the locked ADRs. **All have since been resolved —
see "Non-blocking items resolved with the developer this session" above.** Table below is kept for
traceability of the original questions as first surfaced.

| ID | Question | Blocking? | Why It's Ambiguous | Original Best Guess |
|---|---|---|---|---|
| UOM-FX-OQ-001 | ~~Should `UOMType` carry a required `category_id`, scoping every Type to exactly one Category?~~ | **RESOLVED** — see "Non-blocking items resolved with the developer this session" above (ADR-192 / `UOMType.category_id`) | — | — |
| UOM-FX-OQ-004 | ~~Is a UOM Group usable (assignable to a Product, usable on a transaction line) when fewer than all Functional Roles have an assignment — e.g. only Base and Selling populated?~~ | **RESOLVED** — see "Non-blocking items resolved with the developer this session" above (ADR-192 / UOM-RULE-021) | — | — |
| UOM-FX-OQ-005 | ~~Should the "Uses Picking Hierarchy" flag and actual picking-hierarchy row presence be reconciled automatically (e.g. auto-toggle the flag based on row existence), enforced as a hard consistency rule, or left as two independently editable facts the way legacy left them?~~ | **RESOLVED** — see "Non-blocking items resolved with the developer this session" above (ADR-192 / UOM-RULE-013) | — | — |
| UOM-FX-OQ-006 | ~~Does deleting a `UOMGroup` require an in-use guard against Products' `uom_group_id` references, the way Type/Category/Role deletion is guarded (UOM-RULE-014)?~~ | **RESOLVED** — see "Non-blocking items resolved with the developer this session" above (ADR-190 / UOM-RULE-020) | — | — |
| UOM-FX-OQ-007 | ~~Should `UOMFunctionalRole` deletion be guarded the same way Type/Category deletion is (UOM-RULE-014), given it's a new entity legacy never had?~~ | **RESOLVED** — see "Non-blocking items resolved with the developer this session" above (ADR-192 / UOM-RULE-014) | — | — |
| UOM-FX-OQ-008 | ~~Legacy's case-sensitive Group-name-uniqueness check (UOM-RULE-001) — should the rewrite keep case-sensitive uniqueness, or move to case-insensitive?~~ | **RESOLVED** — see "Non-blocking items resolved with the developer this session" above (ADR-191 / UOM-RULE-001) | — | — |

## Risk Register carried forward as context (not per-field/per-rule open questions)

Per this task's framing, the 8 items in legacy's Risk Register (UOM-RISK-001 through 008) are
carried forward as **context informing the rules above**, not restated here as separate open
questions. Disposition of each, for traceability:

| ID | Legacy Finding | Disposition in this extraction |
|---|---|---|
| UOM-RISK-001 | SQL injection in `save_uom_group()` | Closed by construction — UOM-RULE-018 (parameterized queries / Prisma, no string-concatenated SQL). |
| UOM-RISK-002 | Unparameterized `$id` in `delete_uom()`'s in-use check | Closed by construction — UOM-RULE-018, same mechanism. |
| UOM-RISK-003 | Independent SQL reimplementation of the conversion formula (drift risk) | Closed by construction — UOM-RULE-015 (ADR-053: every module goes through UOM's own service, no direct table access, no reimplementation). |
| UOM-RISK-004 | No concurrency protection between the two UOM-price write directions | Structurally resolved — the underlying cache/write-back pattern that created this risk (`lbm_applied_uom_pricing`, "Manage UOM Qty Pricing" writing back to base price) is not carried forward at all; see `entities-and-fields.md` §"Entity dropped from the rewrite." Prices are resolved live per ADR-029's pricing block, removing the two-write-directions shape entirely. |
| UOM-RISK-005 | Rounding-mode divergence (`$global_qty_base_integer_sub`) | Resolved — ADR-161 / UOM-RULE-007 (always fractional, no config flag). |
| UOM-RISK-006 | Whether `delete_uom()`'s in-use check covers all reference points | Addressed by design — UOM-RULE-014 moves the guard to a database-enforced `RESTRICT` constraint across all reference points (Group's `base_type_id`, `UOMRoleAssignment`, `UOMConversionFactor`, `UOMPickingHierarchy`), which by construction cannot miss a reference point the way an ad hoc application check could. |
| UOM-RISK-007 | `lbm_applied_uom_pricing` cache-invalidation completeness | Structurally resolved — same disposition as UOM-RISK-004; no cache exists to go stale. |
| UOM-RISK-008 | No server-side permission enforcement on UOM's AJAX write/delete dispatch | Closed by construction — UOM-RULE-017 (ADR-006's standing real-server-side-Guard rule, explicitly restated for this module). |

## Blocking items — status

**No Blocking items remain.** The two items originally flagged Blocking — **UOM-FX-OQ-002**
(factor-history key shape) and **UOM-FX-OQ-003** (missing-conversion-factor behavior) — were both
resolved with the developer this session; see "Blocking items resolved with the developer this
session" above. `05-modules/modules.md` step 1 may proceed for UOM per the field-extraction
process's own guardrail, now satisfied.

**Zero open questions remain for UOM's field-extraction pass.** The six items that were originally
Non-blocking (UOM-FX-OQ-001, 004, 005, 006, 007, 008) have all since been resolved with the developer
this session, across three rounds: UOM-FX-OQ-006 and UOM-FX-OQ-008 by **ADR-190**/**ADR-191**
(UOM-RULE-020 and UOM-RULE-001 respectively), and the remaining four — UOM-FX-OQ-001, 004, 005, 007 —
by **ADR-192** (`UOMType.category_id`, new UOM-RULE-021, amended UOM-RULE-013, and amended
UOM-RULE-014 respectively). See "Non-blocking items resolved with the developer this session" above
for each resolution's detail. No Blocking or Non-blocking items are outstanding for UOM's
field-extraction pass as of this session.

## Coverage Statement

**Read in full**: `project-docs/sot-docs/raw/2-module-specs/UOM/risks-and-open-questions.md`
(source of the four legacy OQs and eight legacy risks), plus every other file in that folder, per
the same full-read pass documented in `entities-and-fields.md`'s Coverage Statement. Cross-checked
every new open question above against `decisions-log.md`'s UOM-tagged ADRs (already read in full)
to confirm none of these questions were actually already answered there and missed.

**Not read**: no live legacy code or database (Origin 1 adaptation, not re-derivation — same as the
other three documents in this folder). Products', SalesOrder's, PurchaseOrder's, Pricing's, and every
other consuming module's own field-extraction documents do not yet exist, so several
Non-blocking items above (UOM-FX-OQ-004, 006) note that the *consumer* side of the question should
be cross-checked once those modules go through their own extraction pass — that cross-check was not
performed here since there is nothing yet to cross-check against.
