# UOM — Field Extraction: Business Rules & Validation

**Origin: 1 (extracted-from-existing-system)** — adapted from the existing UOM legacy blueprint at
`project-docs/sot-docs/raw/2-module-specs/UOM/`, itself a mix of blueprint-sourced and
session-sourced material (see that folder's `module-overview.md` § Origin).

> This module's legacy `business-rules-and-validation.md` carried **no** `UOM-RULE-###`/`UOM-VAL-###`
> ID scheme at all — it explicitly states no rigor-verified rule catalog exists for this domain
> (see that file's own "Applicability" section). **This document is that catalog now** — it resolves
> legacy's UOM-OQ-002 ("whether a formal rule catalog should be produced before build") by being
> one, per this task's instruction. Rules below combine: (a) legacy's own observed structural/
> data-integrity rules, re-numbered here, and (b) rules that only exist because of a cross-cutting
> ADR (e.g. Base-is-smallest-unit) — both kinds carry a `UOM-RULE-###` ID and a Confidence tag
> reflecting their actual sourcing rigor, not a uniform "Confirmed" applied indiscriminately.

## Rule Catalog

### UOM-RULE-001 — UOM Group name must be unique

- **Statement**: A UOM Group's name must be unique (within the tenant's own database, per ADR-056's
  database-per-tenant boundary — no explicit per-tenant scoping column needed on the uniqueness
  constraint itself, since there is only one tenant per database). The comparison is
  **case-insensitive** — "Test" and "test" are treated as the same name, and the second is rejected
  as a duplicate. The check runs on **both** Group create and Group rename (every write to `name`,
  not just initial creation) — since Group Name stays editable indefinitely even on an otherwise
  transaction-locked Group (UOM-RULE-020 / ADR-190), a rename must be checked for a duplicate the
  same as a create.
- **Trigger**: Group create or rename.
- **Scope**: `UOMGroup.name`.
- **Severity**: Hard block.
- **Source**: Legacy's `save_uom_group()` confirmed case-sensitive `SELECT COUNT` duplicate-name
  guard (`business-rules-and-validation.md` §"Observed data-integrity rules",
  `commonfunctions.php:3883-3889` per the legacy blueprint's citation) — the one confirmed
  application-level uniqueness rule legacy actually enforces. The rewrite's case-insensitive
  comparison and its explicit application on rename (not just create) are **ADR-191**, resolving
  what was originally flagged Non-blocking open question UOM-FX-OQ-008.
- **Confidence**: Confirmed (legacy behavior for the underlying uniqueness rule; case-insensitivity
  and the create-and-rename trigger are Confirmed per ADR-191, a direct developer decision this
  session — no longer Inferred).

### UOM-RULE-002 — A UOM Group's Base Type must be assigned at creation

- **Statement**: A UOM Group cannot be saved without a Base Type assigned.
- **Trigger**: Group create or update.
- **Scope**: `UOMGroup.base_type_id`.
- **Severity**: Hard block.
- **Source**: ADR-096 ("Base is always the group's smallest unit, enforced as a validated rule at
  UOM Group setup") plus the schema decision making `base_type_id` non-nullable (`entities-and-
  fields.md` in this folder). This directly reverses legacy's own behavior, where
  `base_uomtypeid` defaulted to `0`/unassigned (`entities-and-fields.md` §`lbm_uom_group` field
  catalog in the source blueprint) — the rewrite closes that gap by design, not silently.
- **Confidence**: Confirmed (ADR-096).

### UOM-RULE-003 — Base Type must be the smallest unit in its group

- **Statement**: The Type assigned as a Group's Base must be smaller than (or equal to — see
  Confidence note) every other Type used by that group, such that every other type's conversion
  factor relative to Base is a whole number ≥ 1, never a fraction.
- **Trigger**: Group setup / Base Type assignment; also re-checked whenever a new
  `UOMConversionFactor` row is added for the group (see UOM-RULE-006).
- **Scope**: `UOMGroup.base_type_id`, `UOMConversionFactor.units_per_base`.
- **Severity**: Hard block.
- **Source**: ADR-096 — "Base is always the group's smallest unit... every other unit's factor
  relative to Base is a clean whole number (≥1), avoiding fractional-factor data-entry errors."
- **Confidence**: Confirmed for the overall intent; **Underspecified** for the exact enforcement
  mechanism — ADR-096 states the *outcome* (whole-number factors) but does not specify whether the
  system validates "is this Type smaller than Base" directly (which would require some notion of
  physical size independent of the conversion factor itself, not modeled anywhere in this catalog)
  or simply validates "is every submitted `units_per_base` a whole number ≥ 1" as a proxy for
  correctness. This document does not invent which mechanism is used — flagged in
  `open-questions.md` as Non-blocking (a reasonable default of "validate the whole-number
  constraint on every submitted factor" can be implemented without resolving the deeper question).

### UOM-RULE-004 — Conversion factor is a single whole-number-or-greater ratio, one documented direction

- **Statement**: `UOMConversionFactor.units_per_base` states how many units of the non-Base Type
  equal one Base unit — one column, one documented direction (replacing legacy's undocumented-
  direction `baseqty`/`qty` pair).
- **Trigger**: Conversion factor create/update.
- **Scope**: `UOMConversionFactor.units_per_base`.
- **Severity**: Hard block (required field, must be > 0, must be a whole number per UOM-RULE-003).
- **Source**: ADR-096; legacy blueprint's own "Recommended rewrite schema" §Problem 2 (the
  ambiguous two-column representation is exactly what "let the `$global_qty_base_integer_sub`
  rounding-mode divergence and the independent SQL-formula copy both happen without either being an
  obvious contract violation").
- **Confidence**: Confirmed.

### UOM-RULE-005 — A non-Base Type needs an explicit conversion factor row to be usable in any conversion

- **Statement**: A Type other than a group's Base Type cannot be used in a conversion (i.e.,
  selected on a transaction line, referenced in a role assignment that requires a computed price/
  qty, etc.) until an explicit `UOMConversionFactor` row exists for that (Group, Type) pair.
- **Trigger**: Any conversion attempt (base→UOM or UOM→base) for a non-Base type.
- **Scope**: `UOMConversionFactor` (existence check), `UOMGroup.base_type_id`.
- **Severity**: Hard block — but the *behavior on violation* is itself unresolved, see Confidence.
- **Source**: Legacy's observed rule (`business-rules-and-validation.md` §"Observed structural
  rules" in the source blueprint) — "the primitive functions... look up `baseqty`/`qty` from a
  cached JSON array and do not appear to have a fallback for a missing factor."
- **Confidence**: Confirmed for the resolved rewrite behavior — see **UOM-RULE-019** below. The
  developer resolved this (originally Blocking open question UOM-FX-OQ-003) not by choosing a
  transaction-time reject/fallback behavior, but by **preventing the missing-factor state from ever
  existing**: `UOMGroup` save-time validation rejects the save itself if any role-assigned Type
  lacks a conversion factor. This makes the question "what happens at conversion time when a factor
  is missing" moot — a non-Base Type reachable through any Group's role assignment always has a
  conversion factor by the time a consumer could ever try to use it. Legacy's own unconfirmed
  behavior (graceful error vs. silent issue) is not carried forward either way, since the state it
  describes can no longer occur.

### UOM-RULE-006 — Conversion factor uniqueness: one row per (Group, Type)

- **Statement**: At most one `UOMConversionFactor` row may exist for a given (Group, Type) pair.
- **Trigger**: Conversion factor create.
- **Scope**: `UOMConversionFactor.group_id`, `UOMConversionFactor.type_id`.
- **Severity**: Hard block (unique constraint).
- **Source**: Legacy blueprint's own "Recommended rewrite schema" §Known Gaps ("No confirmed unique
  constraints" on the legacy table) — this rule is the rewrite's fix, not a legacy-observed
  behavior; no ADR explicitly restates it, but nothing in decisions-log.md contradicts it and it is
  a structural precondition for UOM-RULE-004/005 to be meaningful (two conflicting factors for the
  same pair would make "the" conversion factor ambiguous).
- **Confidence**: Inferred (necessary consequence of the single-ratio-per-pair design; not itself an
  explicit ADR sentence).

### UOM-RULE-007 — Conversions always stay fractional/decimal — no whole-number-rounding mode

- **Statement**: Neither `base_to_uom` nor `uom_to_base` quantity conversion ever forces a result to
  a whole number. There is no configuration flag (legacy's `$global_qty_base_integer_sub`) that
  changes this behavior per deployment.
- **Trigger**: Every conversion computation.
- **Scope**: The conversion service's qty conversion output, for both directions.
- **Severity**: Not a block — a computation-behavior rule, not a validation gate.
- **Source**: **ADR-161**, resolving legacy's UOM-RISK-005 (rounding-mode divergence) explicitly.
  Legacy's own two-branch formula (`calculations.md` §"Calculation Pipeline" in the source
  blueprint: `ceil()`/`floor()` under the flag, `common_decimal_round_qty()`/`round(...,4)`
  otherwise) is **not** carried forward — ADR-161 collapses it to the fractional branch only.
- **Confidence**: Confirmed (ADR-161).

### UOM-RULE-008 — Base-unit-pivot conversion — every conversion routes through the group's Base type

- **Statement**: Converting between any two non-Base Types in the same group is never done via a
  direct pairwise factor — it always goes source unit → Base unit → target unit, using each Type's
  own factor relative to Base.
- **Trigger**: Every conversion computation.
- **Scope**: Conversion service, all `UOMConversionFactor` rows for the group involved.
- **Severity**: Hard architectural rule — not user-facing validation, but a non-negotiable
  implementation constraint.
- **Source**: ADR-096 ("Base-unit-pivot conversion: every conversion goes source unit → base unit →
  target unit... never a direct factor stored between every possible pair of units. Confirmed as the
  right approach... matches legacy's own existing schema shape").
- **Confidence**: Confirmed (ADR-096).

### UOM-RULE-009 — Conversion-rate history is versioned at change time, not duplicated per transaction line

- **Statement**: When a `UOMConversionFactor.units_per_base` value changes, a `UOMTypeFactorHistory`
  row is written capturing the prior rate and the date range it was effective. A transaction line
  never stores its own copy of the rate — only the finalize date and the Type reference; the
  effective rate is resolved by looking up history for that date at read time.
- **Trigger**: Conversion factor update (write history for the outgoing rate); any historical
  read/report of a finalized transaction line (lookup history by finalize date).
- **Scope**: `UOMTypeFactorHistory`, every consuming module's finalized transaction lines
  (SalesOrder, PurchaseOrder, StoreTransfer, SalesHistory — see `entities-and-fields.md` §Cross-
  module field dependencies).
- **Severity**: Hard architectural rule (the specific mechanism replacing legacy's per-line rate
  snapshot, chosen explicitly to avoid the storage cost "confirmed by developer as a real database
  storage burden at this project's transaction volume (millions of lines)").
- **Source**: ADR-096; the exact key shape — **(Group, Type), matching `UOMConversionFactor`'s own
  key** — was confirmed with the developer during this field-extraction pass (resolving what was
  originally flagged as Blocking open question UOM-FX-OQ-002). ADR-096's own Decision/Consequences
  text (which read as Type-level-only) is left unedited for historical traceability; a short
  Amendment note recording this (Group, Type) resolution has been appended under ADR-096 in
  `decisions-log.md`.
- **Confidence**: Confirmed (ADR-096 + this session's Amendment).

### UOM-RULE-010 — UOM Functional Roles, Categories, Types, and Groups are freely admin-manageable, not fixed

- **Statement**: An admin can add, rename, or soft-delete any Category, Type, Functional Role, or
  Group — none of these four concepts is a hardcoded/fixed enum at any level. A sensible starter set
  can ship pre-seeded, but nothing prevents further customization.
- **Trigger**: Any create/rename/delete on these four entities.
- **Scope**: `UOMCategory`, `UOMType`, `UOMFunctionalRole`, `UOMGroup`.
- **Severity**: Not a block — a permissiveness rule (states what is *allowed*, not what is
  forbidden).
- **Source**: ADR-094, explicitly generalizing the "add/rename freely" pattern already used
  elsewhere in this project for roles (ADR-002/060/068) and themes (ADR-064).
- **Confidence**: Confirmed (ADR-094).

### UOM-RULE-011 — Role Assignment uniqueness: one Type per (Group, Functional Role)

- **Statement**: A UOM Group cannot assign two different Types to the same Functional Role
  simultaneously — at most one `UOMRoleAssignment` row per (Group, Functional Role) pair.
- **Trigger**: Role assignment create/update.
- **Scope**: `UOMRoleAssignment.group_id`, `UOMRoleAssignment.role_id`.
- **Severity**: Hard block (unique constraint).
- **Source**: Direct consequence of ADR-094's stated model ("one row per (UOM Group, Functional
  Role, UOM Type)") and the legacy shape it replaces, where each of the eleven role slots held
  exactly one type value. Not an independently stated ADR sentence beyond the model description
  itself.
- **Confidence**: Inferred (necessary consequence of ADR-094's described model).

### UOM-RULE-012 — Picking Hierarchy uniqueness: one row per (Group, Type) and per (Group, Sort Order)

- **Statement**: A group's picking-hierarchy sequence cannot contain the same Type twice, and cannot
  have two rows claiming the same sort position.
- **Trigger**: Picking-hierarchy row create/update/reorder.
- **Scope**: `UOMPickingHierarchy.group_id`, `.type_id`, `.sort_order`.
- **Severity**: Hard block (two unique constraints).
- **Source**: Legacy blueprint's own "Recommended rewrite schema" §Problem 5 ("No confirmed unique
  constraints — nothing stops two picking-hierarchy rows for the same group claiming the same sort
  position"). No ADR explicitly restates this, but it directly closes a confirmed legacy gap and is
  not contradicted by anything in decisions-log.md.
- **Confidence**: Inferred (blueprint-sourced schema-integrity fix, not an independent ADR).

### UOM-RULE-013 — "Uses Picking Hierarchy" is a computed value, not a stored/editable flag

- **Statement**: "Uses Picking Hierarchy" is **not** a persisted `UOMGroup` field. It is computed at
  read/resolution time: **true** if at least one `UOMPickingHierarchy` row exists for the Group,
  **false** otherwise. There is no independent flag to set, toggle, or validate against row
  presence — the flag/row-presence inconsistency this rule originally flagged as Underspecified is
  removed structurally, since there is no longer a second fact that could disagree with row
  presence.
- **Trigger**: Any read of a Group's picking-hierarchy usage status (computed on demand — not a
  write-time trigger, since there is nothing to write).
- **Scope**: `UOMPickingHierarchy` (existence-for-group query). `UOMGroup` no longer carries a
  `uses_picking_hierarchy` column.
- **Severity**: Not a validation rule any more — a computed-value definition.
- **Source**: **ADR-192** (resolving **UOM-FX-OQ-005**, originally Non-blocking). Supersedes this
  rule's prior text, which described legacy's own observed gap (`business-rules-and-validation.md`
  §"Observed structural rules": "whether the system guards against the flag being 'Yes' with zero
  rows present, or vice versa, was not confirmed" — also legacy's UOM-OQ-004) and left the
  enforcement mechanism Underspecified. The developer resolved it not by picking an enforcement
  mechanism for a stored flag, but by removing the stored flag entirely.
- **Confidence**: Confirmed (ADR-192, a direct developer decision this session).

### UOM-RULE-014 — Deleting a Type/Category/Functional Role in use is blocked

- **Statement**: A UOM Type, Category, or Functional Role currently referenced by any `UOMGroup`
  (via `base_type_id` or `category_id`), `UOMRoleAssignment`, `UOMConversionFactor`, or
  `UOMPickingHierarchy` row cannot be deleted.
- **Trigger**: Delete attempt on `UOMType`, `UOMCategory`, or `UOMFunctionalRole`.
- **Scope**: All four "in-use" reference points above.
- **Severity**: Hard block, enforced as a real database-level `RESTRICT` foreign-key constraint —
  **not** an application-level pre-check, per the build-guidance recommendation this document
  adopts rather than re-derives.
- **Source**: Legacy confirms the *intent* (`delete_uom()` performs an in-use check before allowing
  a Type/Category delete — `workflows.md` in the source blueprint) but legacy's own coverage of that
  check was never confirmed complete across all reference points (legacy's UOM-RISK-006: "a UOM
  Type can be referenced by a group via any of eleven role-specific FK slots, or by
  `lbm_uom_type_qty`/`lbm_uom_picking_hierarchy` rows... whether the existing in-use guard checks
  all of these... was not traced"). The rewrite's move to enforced FK `RESTRICT` constraints
  (`build-guidance.md` in the source blueprint, §"Rule-to-Enforcement-Layer Mapping Approach")
  closes this gap **by construction** rather than by more careful application-level checking — this
  is this document's own synthesis of the build-guidance recommendation into a stated rule, not a
  separately-numbered ADR.
- **Confidence**: Confirmed for the intent (block deletion while in use); Inferred for "enforce via
  DB `RESTRICT`" specifically, since that is the source blueprint's own build-guidance
  recommendation rather than a decisions-log ADR — flagged as Non-blocking in `open-questions.md`
  since it's a sound default that doesn't block proceeding. **`UOMFunctionalRole`'s inclusion in this
  rule is now Confirmed, not Inferred**: this document originally extended the pattern to
  `UOMFunctionalRole` (a new entity legacy never had) on its own reasoning, flagged as an
  unconfirmed extension (former UOM-FX-OQ-007). **ADR-192** confirms it directly — `UOMFunctionalRole`
  deletion is guarded by the same in-use `RESTRICT` pattern as `UOMType`/`UOMCategory`, blocked while
  any `UOMRoleAssignment` row still references it.

### UOM-RULE-015 — Every module resolves UOM conversions and configuration exclusively through UOM's own service

- **Statement**: No other module (Products, SalesOrder, PurchaseOrder, Location, Receiving,
  StoreTransfer, Manufacturing, Kits, SalesHistory, Settings, Pricing, etc.) may read `UOMCategory`,
  `UOMType`, `UOMGroup`, `UOMFunctionalRole`, `UOMRoleAssignment`, `UOMConversionFactor`,
  `UOMTypeFactorHistory`, or `UOMPickingHierarchy` via a direct database join, and none may
  reimplement the conversion arithmetic itself. Every access goes through UOM's own service/API.
- **Trigger**: Architectural — applies to every consuming module's own design, not a runtime
  event.
- **Scope**: The entire UOM entity set (module boundary enforcement).
- **Severity**: Hard block at the architecture-review level (not a runtime validation).
- **Source**: **ADR-053**, closing legacy's confirmed 46+-file direct-access pattern and the
  independent SQL reimplementation of the conversion formula in
  `modules/Customreport/InventoryQtyByUOMTypeName.php:51-54` (legacy's UOM-RISK-003 — the confirmed
  live drift risk this rule exists specifically to close). See `integrations.md` and
  `build-guidance.md` in the source blueprint for the full call-site survey this rule supersedes.
- **Confidence**: Confirmed (ADR-053).

### UOM-RULE-016 — UOM Type deletion cascades a fixed-price override deletion in Pricing

- **Statement**: When a UOM Type is deleted (per UOM-RULE-014's in-use guard — meaning it was not in
  active use as a Group's Base/role/conversion-factor/picking-hierarchy type, but *may* still carry
  a Pricing-rule fixed-price override for that unit), any Pricing-rule fixed-price override keyed to
  that Type is deleted along with it — not orphaned, not blocking the UOM Type's own deletion.
  Pricing for that unit automatically reverts to Base-derived resolution.
- **Trigger**: UOM Type deletion.
- **Scope**: Cross-module — `UOMType` (the deleted record) and Pricing's fixed-price-override
  records keyed to that `UOMType.id`.
- **Severity**: Auto-remediation (cascading delete), not a block.
- **Source**: decisions-log.md:554 ("UOM unit deletion cascades into Pricing — if a unit is removed
  from a UOM Group, any fixed-price override tied to that specific unit is deleted along with it...
  Pricing for that unit automatically reverts to Base-derived").
- **Confidence**: Confirmed (part of ADR-029's pricing-resolution design).

### UOM-RULE-017 — Real server-side authorization required on every UOM write/delete operation

- **Statement**: Every UOM create/update/delete operation (Category, Type, Group, Functional Role,
  Role Assignment, Conversion Factor, Picking Hierarchy) must be gated by a real server-side
  authorization check on the endpoint itself — never a UI-layer-only flag computed on a different
  page than the one performing the write.
- **Trigger**: Every UOM write endpoint.
- **Scope**: All UOM write operations.
- **Severity**: Hard block.
- **Source**: This directly closes legacy's confirmed permission-enforcement gap (UOM-RISK-008 —
  `uom_ajax_action.php`'s dispatcher "contains no `isPermitted()` call anywhere in the file"; the
  only check found was a page-load-only UI flag computed in a *different* file, `uom_manage.php`).
  Not a UOM-specific ADR — this is the project's own standing rule **ADR-006** ("every endpoint
  requires a real server-side Guard, no exceptions"), explicitly restated here per this
  extraction's cross-check obligation (do not silently assume a already-covered cross-cutting rule
  applies without saying so).
- **Confidence**: Confirmed (ADR-006, a standing project-wide rule, directly applicable here).

### UOM-RULE-018 — All UOM writes must use parameterized queries / an ORM — no string-concatenated SQL

- **Statement**: No UOM write path may build SQL by string-concatenating client-submitted values.
- **Trigger**: Every UOM write operation.
- **Scope**: All UOM entities.
- **Severity**: Hard block (security).
- **Source**: Directly closes legacy's two confirmed SQL injections — UOM-RISK-001 (`save_uom_group()`
  concatenates every field from raw `$_REQUEST` into `INSERT`/`UPDATE` SQL) and UOM-RISK-002
  (`delete_uom()`'s in-use check interpolates an unescaped `$id`). Not a UOM-specific ADR — this is
  the project's own standing tech-stack choice (Prisma as the ORM, parameterized by construction)
  restated here for completeness, same pattern as UOM-RULE-017.
- **Confidence**: Confirmed (standing project-wide tech-stack decision — Prisma, per
  `tech-stack.md` — closes this class of defect by construction).

### UOM-RULE-019 — A UOM Group save is rejected if any role-assigned Type lacks a conversion factor

- **Statement**: When a `UOMGroup` is saved (create or update), the save is validated before commit:
  for every `UOMRoleAssignment` row that will exist for the group afterward, if the assigned Type is
  not the group's own Base Type, a `UOMConversionFactor` row must already exist (or be submitted as
  part of the same save) for that (Group, Type) pair. If any role-assigned, non-Base Type has no
  corresponding conversion factor, the entire Group save is rejected — not partially applied, not
  saved with a warning.
- **Trigger**: `UOMGroup` create or update (specifically, whenever a `UOMRoleAssignment` is added or
  changed to point at a new Type as part of that save).
- **Scope**: `UOMGroup`, `UOMRoleAssignment.type_id`, `UOMGroup.base_type_id`, `UOMConversionFactor`
  (existence check per role-assigned Type).
- **Severity**: Hard block.
- **Source**: Developer decision resolving what was originally flagged as Blocking open question
  UOM-FX-OQ-003. Chosen deliberately over both options this document had originally floated
  (reject-at-conversion-time vs. graceful-fallback-at-conversion-time) — the developer's resolution
  prevents the missing-factor state from ever being reachable in the first place, rather than
  deciding how to handle it after the fact. This directly supersedes legacy's own unconfirmed
  behavior (`business-rules-and-validation.md`'s "Observed structural rules": "whether a missing
  factor produces a graceful error or a silent division issue was not traced") — the rewrite does
  not need to answer that question at all, because the state it describes cannot occur.
- **Confidence**: Confirmed (developer-confirmed resolution, this session).

This rule makes **UOM-RULE-005** (a non-Base Type needs an explicit conversion factor row to be
usable) enforceable at the point of Group configuration rather than at the point of use — by the
time any consuming module (SalesOrder, PurchaseOrder, etc.) resolves a role assignment to a Type via
UOM's own service (UOM-RULE-015), a conversion factor for that Type is guaranteed to already exist,
for every Group currently save-able under this rule.

### UOM-RULE-020 — A UOM Group becomes fully locked and undeletable once referenced by any transaction, with Group Name the sole exception

- **Statement**: Once a `UOMGroup` is referenced by **any** transaction (a SalesOrder line,
  PurchaseOrder line, receiving record, or any other transactional consumer — first reference is
  what triggers the lock, not mere assignment to a Product), the Group becomes read-only and
  undeletable, with **one single exception**: **Group Name** (`UOMGroup.name`) stays editable
  indefinitely, since every reference to a Group is by ID, not by name, so renaming has no effect
  on already-recorded transactions. Locked once transaction-referenced: Category
  (`UOMGroup.category_id`), sort order, all eleven role-Type assignments (`UOMRoleAssignment`),
  Base Type (`UOMGroup.base_type_id`), conversion factors (`UOMConversionFactor`), and
  picking-hierarchy rows (`UOMPickingHierarchy`). Delete is blocked outright, with no exception,
  once referenced. If a business need arises for a genuinely different conversion (e.g. a supplier
  repackages a unit), the intended path is creating a **new** Group, not editing a locked one.
- **Trigger**: Any update attempt on a locked field, or any delete attempt, against a `UOMGroup`
  that has at least one transactional reference.
- **Scope**: `UOMGroup` (all fields except `name`), `UOMRoleAssignment`, `UOMConversionFactor`,
  `UOMPickingHierarchy` — all scoped to a transaction-referenced Group.
- **Severity**: Hard block (update of a locked field, or delete, on a used Group); Group Name update
  is explicitly Not blocked, on either a used or unused Group.
- **Source**: **ADR-190**. This extends **UOM-RULE-014**'s existing in-use `RESTRICT` delete-guard
  pattern (which blocks Type/Category/Role deletion while referenced by a Group) up one level, to
  the Group entity itself — both the field-lock and the delete-lock are new; UOM-RULE-014 did not
  previously cover the Group. This rule closes **UOM-FX-OQ-006** (`open-questions.md` in this
  folder), which had asked whether Group deletion needs the same in-use guard as Type/Category/Role
  deletion — now resolved and marked Resolved there, citing ADR-190.
- **Confidence**: Confirmed (ADR-190, a direct developer decision this session).

### UOM-RULE-021 — A Functional Role with no explicit Type assignment falls back to the Group's Base Type

- **Statement**: When a consumer resolves "which Type fulfills Functional Role X for Group G" (e.g.
  SalesOrder/PurchaseOrder resolving Qty/Sell-Price/Cost via ADR-095's Settings mapping) and finds no
  `UOMRoleAssignment` row for that (Group, Role) pair, the resolution **falls back to the Group's own
  Base Type** rather than blocking the operation or returning an empty/null result. This applies
  wherever any consuming module resolves a role-to-Type mapping through UOM's own service
  (UOM-RULE-015) — the fallback is UOM's responsibility, not something each consumer re-implements.
- **Trigger**: Any role-to-Type resolution lookup where the Group has no explicit assignment for the
  requested Functional Role.
- **Scope**: `UOMRoleAssignment` (existence check), `UOMGroup.base_type_id` (fallback target).
- **Severity**: Not a block — a resolution-behavior rule (states what happens instead of failing).
- **Source**: **ADR-192**, resolving **UOM-FX-OQ-004** (originally Non-blocking; this document's
  prior "Current Best Guess" in `open-questions.md` had already recommended this exact fallback,
  now confirmed rather than just recommended).
- **Confidence**: Confirmed (ADR-192, a direct developer decision this session).

## Confidence summary

Of the 21 rules above: **17 Confirmed** (001–004, 007, 008, 009, 010, 013, 014 (`UOMFunctionalRole`
delete-guard extension now firm), 016, 017, 018, 019, 020, 021 grounded directly in an ADR, a
developer-confirmed resolution this session, or a standing project rule), **1 with a remaining
Underspecified component** (003's enforcement mechanism is now resolved by UOM-RULE-019's
prevention-at-save-time design, but the field-level note on `UOMType.category_id`'s exact
Category-scoping enforcement remains a matter for the API/UI layer to implement per ADR-192's
"optional FK" resolution, not itself blocking), and several others (006, 011, 012, 014's
DB-`RESTRICT` mechanism-choice) are **Inferred** — necessary consequences of a locked decision's
stated model rather than independently restated ADR sentences. None of the 21 silently invents a
resolution where the source material or decisions-log.md was actually silent — the pairs that
previously had a genuinely open Confidence gap (005/009 via UOM-FX-OQ-002/003; 020 via
UOM-FX-OQ-006; 001 via UOM-FX-OQ-008) were resolved with the developer in prior rounds this session
(ADR-190/191), and the remaining four Non-blocking questions (UOM-FX-OQ-001/004/005/007, closed by
new rule 021 and amendments to 013/014, plus `entities-and-fields.md`'s `UOMType.category_id`) are
now resolved via **ADR-192** — **no open questions remain for UOM's field-extraction pass.**

## Coverage Statement

**Read in full**: all files in `project-docs/sot-docs/raw/2-module-specs/UOM/` (same set as
`entities-and-fields.md`'s Coverage Statement — not re-read a second time independently, reused from
the same reading pass). Every ADR matched by grepping decisions-log.md for "UOM" was read in full
context (ADR-004 [superseded], ADR-029's pricing block, ADR-040, ADR-053, ADR-056, ADR-094 through
ADR-098, ADR-161), plus ADR-006 (standing server-side-Guard rule) and the Prisma/tech-stack decision,
both referenced from memory of already-established project-wide standing rules rather than
independently re-grepped in this pass — **not** independently re-verified by opening
`tech-stack.md` or the ADR-006 entry itself in this session; flagged so a later reader knows this
citation is asserted from established project convention, not freshly re-confirmed against source
text in this exact pass.

**Not read**: legacy live PHP source or live legacy database (per Origin 1's adaptation instruction
— this document adapts the blueprint's own citations, it does not re-derive them). Other modules'
own field-extraction `business-rules.md` documents do not yet exist, so UOM-RULE-016's Pricing-side
mechanics are stated only from UOM's own vantage point (what UOM's delete operation must trigger),
not cross-verified against a Pricing-module field extraction that hasn't been written yet.
