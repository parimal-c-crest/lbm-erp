# T-077 — Picking Hierarchy backend

Status: 4/4 complete

- [x] Picking Hierarchy rows created/replaced inside the Group-save transaction (`GroupsService.create`/`update`)
- [x] BR-012 uniqueness (Type and Sort Order per Group) validated before commit
- [x] Computed `usesPickingHierarchy` read projection (BR-013/ADR-192) — no stored column, derived from row existence at read time (`findById`/`list`)
- [x] Single batched `pickBreakdown(groupId)` query (FR-010) — not N per-Type calls
