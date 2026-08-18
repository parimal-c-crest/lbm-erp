# T-033 — Group administration

Status: 3/3 complete

- [x] `Group`/`GroupMember`/`GroupMemberType` types; `MOCK_GROUPS` seeded with mixed Role/Role+Subordinates/User members; `addGroup`/`updateGroup`/`removeGroup` helpers.
- [x] Groups page: List (name/description/resolved member labels), Create/Edit dialog (per-role 3-state select: not included / role only / role + subordinates, plus individual-User checklist), Delete via `TransferTargetPicker`.
- [x] Verify: typecheck/lint clean; browser check — created "Regional Managers" group with an individual User member, appeared correctly in the list, no console errors.
