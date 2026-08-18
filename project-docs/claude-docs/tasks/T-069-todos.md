# T-069 — Group Detail/Edit screen

Status: 8/8 complete

- [x] `PickingHierarchyList.tsx` — ordered, drag + keyboard-accessible reorder
- [x] `UomGroupForm.tsx` shared component — header (Name, Category, Base Type, computed Picking-Hierarchy indicator)
- [x] Role Assignments section — Type dropdown per Functional Role, Base-Type "(default)" fallback label (BR-021)
- [x] Conversion Factors section — whole-number `units_per_base` input, inline "factor required" indicator (BR-019)
- [x] Picking Hierarchy section (add/remove/reorder, not gated behind a toggle)
- [x] Locked-state banner + all-fields-except-Name disabled + disabled Delete (BR-020/ADR-190)
- [x] `frontend/src/app/(dashboard)/settings/uom/groups/[id]/page.tsx` (edit existing)
- [x] `frontend/src/app/(dashboard)/settings/uom/groups/new/page.tsx` (create, blank form)
