# Milestones

Default structure per `6-implementation-plan/1-implementation-plan.md` §1: Milestone 1 (environment,
exempt from the demoable-slice rule) → Milestone 2 (UI, all modules, static/mock data — one
demoable slice: the whole app clickable end-to-end on fake data) → Milestone 3+ (real backend/API
layered onto one module or small dependency-ordered group at a time — each its own demoable slice:
"this module is now real"). No user direction to use a fully-vertical structure instead, so this
default applies.

Module backend build order (Milestones 3-9) derived from `1-project/3-feature-breakdown.md` §6
(feature dependencies) and `claude-docs/analysis/module-list.md`'s own foundational-module notes
(Users: ~126 modules depend on it for permission checks; Location/Products: joined by nearly every
transactional module). See `dependencies.md` for the full cross-epic dependency graph.

| ID | Milestone | Scope | Build Order |
|----|-----------|-------|-------------|
| M1 | Environment Setup | Install/wire the chosen tech stack (`1-project/4-tech-stack.md`, `6-development/1-development-environment.md`) — pnpm workspace, NestJS backend skeleton, Next.js frontend skeleton, Prisma schema init, CI pipeline. No feature/UI work. Also hosts the Platform Administration (skeleton control panel) epic — tenant provisioning infrastructure needed before any real tenant work can happen. | 1 |
| M2 | UI — All Modules, Static/Mock Data | Every page for every module + auth screens + dashboard/app shell, built against `4-ui/` design system and shaped to match approved `2-database/`/`3-api/` schemas, using realistic mock data — no real backend wired. Hosts App Shell/Chrome (real tasks now) + every `<Module> — UI Design` epic (tasks TBD until that module's own `5-modules/<slug>/` docs exist, per the JIT gate). | 2 |
| M3 | Backend/API — Identity & Catalog Foundation | Users, Location, Products, UOM — the modules the rest of the system's transactional flow depends on (RBAC, branch/stock ground truth, catalog, unit conversion). | 3 |
| M4 | Backend/API — Vendors & Pricing | Vendors (feeds Products' purchasing taxonomy and PurchaseOrder), Pricing (unified engine, depends on Products). | 4 |
| M5 | Backend/API — Accounts | Customer/company hub — billing, credit, statements input, SPA/MPL pricing exceptions. | 5 |
| M6 | Backend/API — Sales Order & Search Line Item | SalesOrder (depends on Location, UOM, Pricing, Accounts, Products per feature-breakdown §6) + SearchLineItem (its sole read-model). | 6 |
| M7 | Backend/API — Purchase Order & Purchase Line Item | PurchaseOrder (depends on Vendors, Location per feature-breakdown §6) + PurchaseLineItem (its committed-line read-model). | 7 |
| M8 | Backend/API — History Accumulators & Statements | SalesHistory, PurchaseHistory (side effects of SalesOrder/PurchaseOrder finalize events) + AccountStatement (depends on Accounts). | 8 |
| M9 | Backend/API — Settings | Multi-domain configuration/integration hub (QuickBooks, EDI, payment gateway) — scheduled last since no other module structurally blocks on it, despite being used broadly for config. | 9 |

`ProductTracking` and `StoreTransfer` are confirmed future additions, not part of this MVP-15
milestone sequence (`module-list.md`, ADR-144, ADR-166-170) — not scheduled into any milestone above.
A future milestone gets added for either only once the developer schedules it, per
`6-implementation-plan/1-implementation-plan.md`'s "Re-run after launch" note.

---

# Revision History

| Date | Change |
|------|--------|
| 2026-08-17 | Initial creation — 9 milestones derived from `1-project/3-feature-breakdown.md` and `claude-docs/analysis/module-list.md`. |
