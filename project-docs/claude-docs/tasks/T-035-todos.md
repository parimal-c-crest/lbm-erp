# T-035 — 2FA verification-code entry + barcode-login fallback

Status: 3/3 complete

- [x] Added a login-method tab (Email & Password / Badge-Barcode) to the existing T-016 login page; barcode path resolves against a mock badge code, same downstream flow as password login.
- [x] Added the 2FA sub-state: 6-digit code entry (`aria-live` context line, 15-min-window copy, "Back to login"), gated on the mock credential's `requiresTwoFactor` flag (mirrors the Admin role's real 2FA setting from `lib/mock-data/users.ts`).
- [x] **Real bug found and fixed during verification**: switching from the credentials stage to the 2FA stage (and between the password/barcode tabs) reused the same uncontrolled `<input>` DOM node across React's reconciliation (same tree position, no `key`), so the 2FA code field silently inherited whatever was typed into the Email field. Fixed by giving each stage/tab's root element a distinct `key` (`credentials`/`2fa`, `password`/`barcode`), forcing a real remount. Confirmed via Playwright: field value is empty after both transitions.
- [x] Verify: typecheck/lint clean; full browser flow (password login → 2FA → dashboard, and barcode tab → field isolation) confirmed working, no console errors.
