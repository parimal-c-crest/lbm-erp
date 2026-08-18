# T-075 — UOM Group backend

Status: 6/6 complete

- [x] `GroupsService.create`/`update` — atomic Group + Role Assignments + Conversion Factors (+ Picking Hierarchy) save in one Prisma `$transaction`
- [x] BR-019/VR-010 Group-save completeness validation naming every offending Type/Role
- [x] BR-001/VR-019 case-insensitive Group name uniqueness on create and rename
- [x] BR-002 Base-Type-required
- [x] BR-020/VR-018 transaction-reference lock check — `isGroupLocked(groupId)` service call, `GroupLockedException` (`GROUP_LOCKED` 409 naming every rejected field); honestly returns `false` always today since no consuming module's `uom_group_id` table exists yet, documented not guessed
- [x] `GroupsController` — full CRUD + nested routes
