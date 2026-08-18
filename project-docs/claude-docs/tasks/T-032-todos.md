# T-032 — Profile administration (RoleProfileGrid + mobile Sheet drill-in)

Status: 4/4 complete

- [x] `Profile`/`ModulePermission` types + `MOCK_PROFILES` (3 seeded: Default/View-Only template, Admin Full Access, Warehouse Limited), `PERMISSION_MODULES` (9 business modules, matches sidebar).
- [x] `RoleProfileGrid` — dense desktop/tablet matrix (`hidden md:block`); mobile module-list + granted-count `Badge` (`md:hidden`) → `ModulePermissionSheet` drill-in (reuses `Sheet`, T-018).
- [x] Profiles page: List (all 3 seeded profiles, each with its own grid), Create/Edit dialog, Delete via `TransferTargetPicker`. Linked from Roles page header.
- [x] Verify: typecheck/lint clean; browser check at desktop (1280px, grid visible) and mobile (390px, module-list + Sheet visible) viewports — toggling a permission updates immediately, no console errors.
