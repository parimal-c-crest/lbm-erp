# Tech Debt Register

Written to throughout the project by `7-sprint-planning/1-sprint-planning.md` (review each sprint,
pull items into scope when capacity allows) and `8-implementation/2-code-review.md` (log new debt
found during review). Initialized empty.

| ID | Description | Location | Severity | Raised | Status |
|----|--------------|----------|----------|--------|--------|
| TD-001 | `frontend/.env.local.example` documents `NEXT_PUBLIC_API_URL` with an `/api/v1` prefix, but `backend/src/main.ts` never calls `setGlobalPrefix('api/v1')` — the backend actually serves at its unprefixed root. Frontend code currently works around this with a same-value fallback, not a real fix. | `backend/src/main.ts`, `frontend/.env.local.example`, `frontend/src/lib/api.ts` | Low (documented workaround in place, not blocking) | 2026-08-18 | Open |
| TD-002 | Dashboard page (`OrderStatusChart`) throws a React hydration mismatch in the browser console (server/client HTML diff around the donut-chart SVG `<title>`) — found incidentally during T-034's Playwright check, pre-existing, not caused by Users-module work. Page still renders/functions correctly (React recovers by regenerating the tree client-side), so not release-blocking, but the root cause (likely a `Math.random()`/`Date`-based id or locale-dependent formatting inside the chart) should be found and fixed. | `frontend/src/components/shared/dashboard/OrderStatusChart.tsx` | Low-Medium (console noise + wasted re-render, not a visible/functional bug yet) | 2026-08-18 | Open |

---

# Revision History

| Date | Change |
|------|--------|
| 2026-08-17 | Initialized empty. |
| 2026-08-18 | TD-001 logged — `/api/v1` prefix documented but not implemented backend-side. |
| 2026-08-18 | TD-002 logged — pre-existing Dashboard hydration mismatch found incidentally during T-034 verification. |
