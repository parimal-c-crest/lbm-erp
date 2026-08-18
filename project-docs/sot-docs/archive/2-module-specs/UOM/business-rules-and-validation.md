# UOM — Business Rules & Validation

## Applicability

**No rigor-verified numbered rule catalog exists for this domain.** Every other module in this docs-kit
carries a numbered rule catalog (e.g. `SO-VAL-###`, `PROD-VAL-###`) produced by a dedicated blueprint
validation-rules pass (Doc1 Pass 2), independently re-verified in a later consolidation pass. **No
equivalent pass exists for UOM** — it was never blueprinted as its own module, and the Products
blueprint's own Pass 2 did not separately catalog UOM-specific rules under a `PROD-VAL` ID (confirmed: no
rule in `blueprint/module/Products/02-validation-rules.md` is tagged as UOM-specific per this session's
search). What follows are rules **observed** during this session's direct reads of
`include/utils/commonfunctions.php` and the UOM-related files in `modules/Products/00-pass0-inventory.md`
— genuine, code-grounded, but not independently re-verified the way a blueprint-sourced module's rule
catalog would be, and deliberately **not** assigned `UOM-RULE-###` IDs, since doing so would imply a
rigor level this list does not have. Treat this list as a starting point for a proper validation pass,
not a substitute for one. (Source: `docs_from_blueprint/module/UOM/03-business-rules-and-validation.md`
§3.0.)

## Observed structural rules (no rule-ID scheme applied — see Applicability)

- **A UOM Group names up to eleven independent type assignments**, one per functional role (base,
  selling, pricing, stocking, PI, picking, purchase, purchase-cost, receiving, reporting, inner, outer)
  — each defaulting to `0` (unassigned) rather than being required at group-creation time
  (`lbm_uom_group` field catalog, `entities-and-fields.md`). Whether the system enforces that a group is
  unusable until at least its base/selling roles are populated was not confirmed in this session — open
  question.
- **A non-base UOM type needs an explicit conversion factor row** in `lbm_uom_type_qty` to be usable in
  any conversion — the primitive functions in `commonfunctions.php:6137-6265` look up `baseqty`/`qty`
  from a cached JSON array and do not appear to have a fallback for a missing factor; whether a missing
  factor produces a graceful error or a silent division issue was not traced to a specific guard clause
  in this session — open question, flagged for a proper validation pass.
- **The picking-hierarchy flag on a group is independent of whether picking-hierarchy rows actually
  exist** for that group — `lbm_uom_group.picking_hierarchy` (a Yes/No flag) and the presence of
  `lbm_uom_picking_hierarchy` rows for that `uomgroupid` are two separate facts; whether the system
  guards against the flag being "Yes" with zero rows present, or vice versa, was not confirmed.

## Observed data-integrity rules (from `save_uom_group()`, `commonfunctions.php:3873-3995`)

- Saving a UOM group writes to `lbm_uom_group` and, for each submitted type-quantity row, to
  `lbm_uom_type_qty` — both operations are unescaped/unparameterized string-concatenation SQL (see
  `risks-and-open-questions.md` for the security implication), which as a side effect means **no
  application-level type validation was found on these fields** beyond whatever implicit coercion the
  raw SQL performs.
- `delete_uom()` (`commonfunctions.php:3258-3264`) performs an in-use check before allowing a UOM Type
  to be deleted — confirming the intent that a UOM Type in active use by a group should not be
  deletable — but the check itself uses an unescaped `$id` (see `risks-and-open-questions.md`), so its
  reliability under adversarial input was not independently verified.
- `save_uom_group()` rejects a duplicate active `groupname` (case-sensitive `SELECT COUNT` guard before
  insert/update) — this is the one confirmed application-level uniqueness rule in this function's body
  (`commonfunctions.php:3883-3889`).

## Confidence

All rules above are **Inferred** in the sense of this template's Confidence column — code-grounded via
direct read of the cited line ranges, but not independently re-verified by a second blueprint pass the
way a `Confirmed` rating would imply for the other 18 modules in this docs-kit.

## Open Questions

- This session's research did not attempt to exhaustively catalog every UOM-related validation rule the
  way a full blueprint Pass 2 would — that would require systematically reading every function listed in
  `docs_from_blueprint/module/UOM/00-README.md`'s file inventory rule by rule, the same rigor applied to
  every other module in this series. This file exists to be honest about that gap, not to paper over it
  with an invented rule catalog. (Source: `docs_from_blueprint/module/UOM/03-business-rules-and-
  validation.md` §3.3.)
- Whether a group is usable with unassigned base/selling role slots.
- Whether a missing conversion factor for a non-base type produces a graceful error or a silent
  division/lookup issue.
- Whether the picking-hierarchy flag and actual row presence are ever inconsistent.
