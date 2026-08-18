# T-034 — Change Password modal (self-service + admin-reset)

Status: 3/3 complete

- [x] `ChangePasswordModal` (`components/shared/ChangePasswordModal.tsx`) — one shared component, `mode: 'self-service' | 'admin-reset'` (FR-007 collapses both into one command). Self-service requires current-password re-verification; admin-reset doesn't. Client-side ADR-155 complexity check + confirm-password match.
- [x] Wired: self-service from TopBar's user menu ("Change Password"); admin-reset from User Detail (`ResetPasswordButton`, new client child, same pattern as the T-030 delete button).
- [x] Verify: typecheck/lint clean; browser check — both variants render with correct field sets, no console errors from this component (found and logged an unrelated pre-existing Dashboard hydration issue as TD-002, not a regression from this task).
