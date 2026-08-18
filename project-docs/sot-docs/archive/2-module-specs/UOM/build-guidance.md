# UOM — Build Guidance

> Guidance for Stage 4, stated stack-neutrally.

This section is guidance for however a downstream process structures its own implementation plan and
testing documentation — it is not itself an implementation plan, a schema migration script, or an API
specification. Given this module's non-standard sourcing (see `module-overview.md` §Origin), this file
leans more heavily on this session's own analysis than on a blueprint Doc2, which does not exist for
UOM. (Source: `docs_from_blueprint/module/UOM/10-build-guidance.md`.)

## Schema

A proposed normalized replacement schema — closing the sparse eleven-column group row, the ambiguous
two-column conversion factor, the missing tenant column, and the unversioned pricing cache — is detailed
in `entities-and-fields.md` §Recommended rewrite schema. Build against that schema, not a direct port of
the legacy tables.

## Rule-to-Enforcement-Layer Mapping Approach

- **Data constraint layer**: the proposed schema's unique constraints (group name per tenant, one role
  assignment per group/role, one conversion factor per group/type, one picking-hierarchy row per
  group/type and per group/sort-position) and required FKs (`base_type_id` not nullable) — see
  `entities-and-fields.md`.
- **Domain invariant layer**: the conversion-arithmetic rounding-mode decision (`calculations.md`), and
  whether a group is usable with unassigned base/selling role slots (`business-rules-and-validation.md`)
  — both need an explicit decision recorded as a domain rule, not left as legacy ambiguity.
- **Application-level check layer**: the group-save duplicate-name guard (currently the one confirmed
  application-level rule in `save_uom_group()`) and the delete in-use guards for UOM Type/Category —
  both should move to database-level `RESTRICT` constraints per `entities-and-fields.md`'s referential
  integrity recommendation, rather than remaining as pre-write application checks.

Given this module has no formal `UOM-VAL-###` rule catalog (`business-rules-and-validation.md`
§Applicability), this mapping is necessarily coarser than the per-rule-ID mapping a blueprint-sourced
module's build guidance would have — resolving `UOM-OQ-002` (whether to produce that catalog before
build) would sharpen this section.

## The central recommendation: one canonical UOM service, no direct table access

The single highest-value architectural decision for this domain: **UOM must be built as its own bounded
service with one API surface**, and every consumer — order entry, purchasing, receiving, store
transfers, warehouse allocation, manufacturing, kits, and reporting — must resolve UOM configuration and
conversions through that API, never through a direct join against the underlying tables. This directly
closes the finding in `integrations.md`: today, 46+ files bypass any shared interface, and at least one
(`InventoryQtyByUOMTypeName.php`) has already drifted into its own independent copy of the conversion
formula.

Concretely, the API should expose at minimum:
- Category/Type/Group CRUD (replacing `uom_ajax_action.php`, `uom_category.php`, `uom_type.php`,
  `uom_group.php`, `uom_grouplist.php`, `uom_manage.php`).
- Conversion factor CRUD (`lbm_uom_type_qty`, replacing the type-quantity handling inside
  `save_uom_group()`).
- Picking-hierarchy CRUD (`lbm_uom_picking_hierarchy`).
- A conversion query — the single replacement for
  `conversion_base_or_uom_for_qty_sellprice(_uomjsonarray)()` and, critically, for every direct-SQL
  reimplementation found in `integrations.md`, parameterized by product/group, direction
  (`base_to_uom`/`uom_to_base`), and kind (qty/price).
- A pick-unit-breakdown query — the replacement for the direct three-table join in
  `wmsSalesOrderAllocation.php:1312-1321`, since that consumer needs the full ordered breakdown in one
  call, not a raw conversion factor.

## Suggested Build Sequencing

1. **Security closure first** — both confirmed injections (UOM-RISK-001, UOM-RISK-002 in
   `risks-and-open-questions.md`) must be closed by construction in the new data-access layer, before
   broader UOM build work proceeds. Given UOM-RISK-001 sits in the group-save path (the single
   most-used UOM write operation), its regression test should be written first — the same sequencing
   principle Products' own build guidance applies to its own save-hook injection.
2. **Schema** — build the normalized replacement schema (`entities-and-fields.md`), resolving tenant
   scoping (UOM-OQ-001) before schema design, not after.
3. **Domain rules / calculations** — implement the canonical conversion service (`calculations.md`),
   with the rounding-mode decision (UOM-RISK-005) and concurrency protection (UOM-RISK-004) resolved as
   part of this phase, not deferred.
4. **Screens/API** — Category/Type/Group CRUD, conversion-factor CRUD, picking-hierarchy CRUD, and the
   conversion/pick-breakdown queries listed above.
5. **Consumer migration** — every file named in `integrations.md`'s direct-access survey moves off
   direct table access onto the new API as part of this module's build phase, not as a follow-up
   cleanup: SalesOrder (`wmsSalesOrderAllocation.php`), PurchaseOrder (`SaveNewRow.php`,
   `DetailViewAjax.php`, `PurchaseOrder.php`), Receiving/ReceivingST, StoreTransfer
   (`fetchLocationProductDetails.php`), Manufacturing, Kits, SalesHistory (`ListView.php`), Import
   (`ImportSave.php`), Settings (`productCatalog.php`), CustomImport
   (`uomqtypricing_customImportsave.php`), and the Customreport family including
   `InventoryQtyByUOMTypeName.php` — this last one specifically needs its inline-SQL formula replaced
   with a call to the new conversion query, closing the confirmed drift risk (UOM-RISK-003) rather than
   carrying it forward into the rewrite.
6. **Outputs** — the UOM Group listview and "Manage UOM Qty Pricing" grid, once their underlying data
   paths are served by the new service.

## Decisions to resolve before/during build

- **Tenant scoping** (UOM-OQ-001) — resolve before schema design, not after.
- **Rounding-mode behavior** (UOM-RISK-005) — decide whether the `$global_qty_base_integer_sub`-gated
  whole-unit rounding is a real, preservable per-deployment configuration choice, or legacy
  inconsistency to collapse into one fixed behavior.
- **Concurrency protection** (UOM-RISK-004) between the two price-write directions (base→UOM cascade vs.
  the UOM-pricing screen) — add optimistic-concurrency (version/timestamp check) so the two paths can no
  longer silently clobber each other.
- **Whether to invest in a formal `UOM-VAL-###` validation-rules pass** (UOM-OQ-002) before build, to
  reach the same rigor bar as every other blueprint-sourced module, given build guidance here is
  necessarily less rule-traceable than a blueprint-sourced module's own guidance.
- **Permission enforcement gap** (UOM-RISK-008) — decide whether the new service enforces authorization
  at the API layer itself (recommended) rather than relying on a UI-only page-load check the way
  `uom_manage.php` does today. See `permissions.md`.

## Test/Verification Strategy Pointer

- **Security regression tests** for both confirmed injections (UOM-RISK-001, UOM-RISK-002), reproducing
  the exact unescaped-field shapes documented in `risks-and-open-questions.md`, asserting rejection.
- **Formula-parity tests**: a golden-output test suite for the conversion primitive (base_to_uom /
  uom_to_base, qty and price) run against both the new service's implementation and, during migration,
  the still-live `InventoryQtyByUOMTypeName.php`-style call sites, to positively confirm the drift risk
  (UOM-RISK-003) is closed rather than merely assumed closed.
- **Concurrency test**: a test proving a base-price edit and a UOM-pricing-screen edit against the same
  product, submitted concurrently, cannot both succeed silently — one must be rejected or merged, not
  simply the last write winning with no signal (UOM-RISK-004).
- **Permission test**: a test proving the group save/delete API rejects a caller without the appropriate
  role, independent of any UI-layer gating (UOM-RISK-008).
- **Migration audit** (not a unit test — run against the legacy system's live data, matching this
  series' migration-rehearsal convention): quantify how many groups have unassigned role-specific type
  slots, how many types have zero conversion-factor rows, and whether any live picking-hierarchy
  flag/row inconsistency exists (UOM-RISK-007, UOM-OQ-004) — a pre-flight count, not an assumption the
  migration will pass cleanly.

Since no `UOM-VAL-###` rule catalog exists (`business-rules-and-validation.md`), the usual "one test per
rule ID" mapping this docs-kit uses for other modules cannot be applied here yet — the test list above
maps to risk/open-question IDs instead, until UOM-OQ-002 is resolved and a rule catalog exists to map
tests against.
