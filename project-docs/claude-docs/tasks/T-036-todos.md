# T-036 — Time Clock widget

Status: 3/3 complete

- [x] `TimeClockWidget` (`components/shared/TimeClockWidget.tsx`) — persistent clock-in/out button (mounted in `TopBar`, desktop `lg:` only per its existing responsive convention), ticking elapsed-time display with `aria-live="polite"` (§9), optional task annotation + `labor_status` (Working/Break/Lunch, ADR-077) prompt on clock-in.
- [x] Clock-out is immediate (no confirmation prompt, matches the widget's own "persistent button" framing — the override/correction flow belongs to T-037).
- [x] Verify: typecheck/lint clean; browser check — Clock In prompt → task annotation → ticking "Clock Out" state confirmed live, no new console errors (pre-existing TD-002 Dashboard hydration warning unrelated).
