# T-074 — Category/Type/Functional Role CRUD backend

Status: 5/5 complete

- [x] `CategoriesService`/`CategoriesController` — CRUD, BR-014/VR-015 in-use RESTRICT delete guard surfaced as a clear error
- [x] `TypesService`/`TypesController` — CRUD, optional `categoryId` (ADR-192), BR-014 in-use guard across Base Type/Role Assignment/Conversion Factor/Picking Hierarchy references
- [x] `FunctionalRolesService`/`FunctionalRolesController` — CRUD, BR-014/VR-020 in-use guard (confirmed by ADR-192)
- [x] Type-delete → Pricing cascade (BR-016/ADR-053): Pricing module does not exist in this codebase yet — documented no-op/TODO in `TypesService.remove`, not guessed
- [x] `@Roles('Admin')` + `RolesGuard` on every write endpoint (BR-017/ADR-006)
