# T-031 — Role administration screen

Status: 4/4 complete

- [x] `RoleTree` (`components/shared/RoleTree.tsx`) — recursive hierarchy render, native HTML5 drag-and-drop reparenting (no DnD library added — not locked project-wide, single use), depth recompute via `reparentRole`.
- [x] `role_two_factor_requirements` modeled as `Role.requiresTwoFactor` (ADR-075) — inline toggle per row, `setRoleTwoFactorRequired` also recomputes every affected User's derived flag.
- [x] Create/Edit dialog (`RoleFormDialog`, co-located in `roles/page.tsx`) — name/description/parent-role fields; Delete via the shared `TransferTargetPicker` (BR-001), reassigning both member Users and child Roles to the transfer target.
- [x] Verify: typecheck/lint clean; browser check — drag-and-drop reparent (Purchasing Staff → under Admin, indentation updates), Create Role, 2FA toggle all confirmed working, no console errors. Linked from User List header ("Roles & Permissions").
