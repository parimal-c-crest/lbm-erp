# Roadmap

Forward-looking view, refreshed at each release (`10-release/1-release.md` step 12) and by
maintenance triage (`12-maintenance/1-triage.md`) as new work lands.

## Just shipped — M1 (v1.0.0, 2026-08-18)

Environment setup + the Platform Administration skeleton control panel. Local-dev-only release —
no real hosting exists yet (RAID R-002).

## In progress — M2: UI, All Modules, Static/Mock Data

- ✅ EPIC-003 (App Shell/Chrome) — Complete. Sidebar, top bar, breadcrumb, login/error screens,
  Quick Actions, role-based menu, Dashboard shell — all shipped in v1.0.0.
- ⏳ Next: JIT documentation + UI build for each of the 15 MVP modules' own UI-Design epics
  (EPIC-004 through EPIC-032, odd-numbered) — Sales Orders, Accounts, Products, Purchase Orders,
  Vendors, Location, Pricing, Users, Settings, and the sub-item modules (UOM, Search Line Item,
  Sales/Purchase History, Account Statement). None started yet; each needs its own
  `docs-kit/5-modules/<slug>/` generated before implementation tasks exist for it
  (`7-sprint-planning/1-sprint-planning.md` step 2a).

## Not started — M3 through M9: Backend/API

Build order per `milestone-status.md`:

- M3 — Identity & Catalog Foundation (Users, Location, Products, UOM)
- M4 — Vendors & Pricing
- M5 — Accounts
- M6 — Sales Order & Search Line Item
- M7 — Purchase Order & Purchase Line Item
- M8 — History Accumulators & Statements
- M9 — Settings

Real login/auth (currently mocked in M2's UI) lands with M3's Users module.

## Known gaps carried forward

- RAID R-002 — no staging/production environment provisioned; real deploy verification deferred
  until hosting exists (ADR-071 decided AWS, not yet provisioned).
- TD-001 — `/api/v1` API prefix documented but not implemented backend-side.
- ProductTracking and StoreTransfer — both blueprinted/design-reviewed but not yet slotted into the
  formal MVP module build sequence (project status, `CLAUDE.md`).

## Post-release process

From here on, anything new (bug, enhancement, doc update, security patch) is routed through
`12-maintenance/1-triage.md` rather than handled ad hoc — logged to `intake-log.md`, then either
folded into an existing epic's task list or the standing EPIC-034 Maintenance epic.
