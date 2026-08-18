# T-030 — Shared TransferTargetPicker delete-confirmation component; wire to User delete

Status: 4/4 complete

- [x] Add `components/ui/dialog.tsx` — centered modal primitive (Radix Dialog, distinct from `sheet.tsx`'s slide-in), matching the existing shipped-component style.
- [x] Add `components/shared/TransferTargetPicker.tsx` — generic transfer-target-required delete confirmation (`3-business-rules.md` BR-001), reusable by Role/Profile/Group (T-031/032/033), not User-specific.
- [x] Wire to User delete: List page (Delete action per row, local state + `removeMockUser`) and Detail page (`UserDetailDeleteButton` client child, since Detail is a Server Component).
- [x] Verify: typecheck/lint clean; browser check — delete from List and from Detail both open the picker, require a transfer target before the Delete button enables, remove the row / redirect to List on confirm, no console errors.

Mock-only note: `removeMockUser` mutates the shared fixture array in place so a delete is reflected
across pages within the same client session — real reassignment-on-delete is EPIC-005's job.
