# T-043 — Self-service Mail Account + notification-preference screen

Status: 2/2 complete

- [x] `(dashboard)/settings/mail-account/page.tsx` — mail account fields (display name, reply-to, signature) + notification-preference toggles (4 types). Reachable from TopBar's user menu ("Mail Account & Notifications"), own account only, no admin gate (FR-012).
- [x] Verify: typecheck/lint clean; browser check — navigated via user menu, form renders and saves with a confirmation message, no console errors.
