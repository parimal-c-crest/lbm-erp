# T-072 — Seed realistic mock/demo dataset (UOM)

Status: 3/3 complete

- [x] `frontend/src/types/uom.ts` — shared UOM types (Category, Type, FunctionalRole, Group, RoleAssignment, ConversionFactor, FactorHistory, PickingHierarchy)
- [x] `frontend/src/lib/mock-data/uom.ts` — Categories/Types/Functional Roles/Groups seeded with domain-real lumber-yard data; one Group with full Picking Hierarchy (Rebar Bundles); one Group flagged `isTransactionLocked` (Bagged Concrete Mix); 11 seeded starter Functional Roles; CRUD/guard helper functions for T-065–T-071 to import
- [x] Conversion Factor History fixture + `historyFor()` lookup (feeds T-070)
