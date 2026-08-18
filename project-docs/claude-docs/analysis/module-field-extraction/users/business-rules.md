# Users — Business Rules (Field-Extraction Pass)

**Origin**: Extracted-from-existing-system (Origin 1). This document formally adopts
`project-docs/sot-docs/raw/2-module-specs/Users/business-rules-and-validation.md` as this module's
business-rules field-extraction output — that blueprint document already catalogs all 66 rules with
a stable `USR-RULE-###` id, statement, trigger, scope, severity, and `Confidence` tag
(`Confirmed`/`Inferred`, matching this document's own vocabulary directly — no mapping needed), per
an extraction effort against `blueprint/module/Users/02-validation-rules.md` ("Doc1 Pass 2"),
cross-checked against Pass 7's risk findings.

Multi-step rules (e.g. USR-RULE-059's module-wide delete-family conclusion, the payroll formulas
detailed in `calculations.md`) are written with their actual steps, not a simplified restatement —
see the source document directly for full statements; not reproduced here to avoid transcription
drift.

**Read**: `sot-docs/raw/2-module-specs/Users/business-rules-and-validation.md` in full (66 rules) —
also `calculations.md` in the same folder for the payroll hours/overtime formulas (multi-step logic
beyond a single condition, per this document's own instruction to write real steps for such rules).

## Cross-module field dependencies

Named at the field level, not just relationship level (per this document's own requirement):

- Sharing Rule's Source/Target Actor fields reference `Role.roleid`, `Group.groupid`, or a
  Role-and-Subordinates composite — same-module, not cross-module.
- Clock-In Task Detail's `soid`/`productid`/`linecode` fields reference Sales Order, Product, and
  Line Code entities owned by other modules (Sales Order, Products) — read-only denormalized links,
  no write-back confirmed.
- PendingDeliveries (another module) writes one-directionally into this module's User Header
  `pdmstatus` field — see `sot-docs/raw/2-module-specs/Users/integrations.md` for the full
  cross-module relationship table.

## Coverage Statement

**Read for this pass**: `business-rules-and-validation.md` (132 lines, 66 rules) and
`calculations.md` (136 lines, the payroll pipeline's multi-step formulas) in full.

**Not read**: the same gaps noted in `entities-and-fields.md`'s Coverage Statement apply here too —
the `typeofhours` non-default write site and the sharing-rule precedence/conflict-resolution engine
internals (USR-OQ-019) were confirmed **not** read by any blueprint pass, flagged as required
follow-up reads before Phase 5/7 of `build-guidance.md`, not silently assumed here.
