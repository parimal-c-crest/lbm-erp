# Navigation

> **Purpose**
>
> This document defines the application's navigation architecture, user navigation flows, menu
> structure, routing conventions, and navigation standards for the LBM ERP Rewrite. It ensures
> users can efficiently access features while providing developers and designers with a consistent
> navigation model across the application.

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | LBM ERP Rewrite |
| Platform | Web |
| Navigation Type | Sidebar (desktop/tablet) / Drawer (mobile) |
| Version | 1.0 |
| Status | Draft |
| Author | Claude Code (docs-kit generation) |
| Created Date | 2026-08-17 |
| Last Updated | 2026-08-17 |

---

# 1. Executive Summary

The LBM ERP Rewrite is a single-tenant-per-session, role-gated internal business application (not a
public storefront — B2B customers access their own separate system and never log into this
application [Source: developer confirmation, this document's generation round]). Navigation is
built around a persistent left sidebar exposing the 10 top-level areas a logged-in staff/admin user
can reach, gated by the 6-role catalog locked in `1-project/2-requirements.md` §5 (ADR-002).

- **Navigation philosophy**: flat and shallow. Most work happens 1-2 clicks from the sidebar —
  list → detail/create, with no deep nested menu trees. Internal-only, multi-writer read-model
  modules (SearchLineItem, PurchaseLineItem) have no navigation entry point at all; they are backend
  data, never a screen a user opens directly.
- **UX goals**: minimize clicks for the highest-frequency ERP tasks (order entry, receiving,
  looking up stock), keep the active module always visible, never hide a role's own workflow behind
  another module's menu.
- **Primary navigation style**: persistent sidebar on desktop/tablet, collapsing to a drawer on
  mobile — matches `ui-ux-design-requirements.md`'s explicit responsive-by-default requirement.
- **Accessibility**: full keyboard operability, visible focus states, ARIA landmarks/roles on the
  sidebar, top bar, and breadcrumb trail (see §13).
- **Responsive behavior**: desktop → expanded sidebar; tablet → collapsible/icon-only sidebar;
  mobile → hidden sidebar behind a hamburger-triggered drawer (see §12). This corrects a gap found
  in the Stitch AI mockup reviewed during design-source selection, which used a fixed, non-collapsing
  sidebar — that fixed-width pattern is explicitly rejected here per ADR-177.

---

# 2. Navigation Objectives

The navigation:

- Is simple and intuitive — one flat sidebar, no more than two navigation levels (top-level item →
  sub-item) anywhere.
- Minimizes clicks for the six confirmed user roles' primary daily tasks.
- Is role-based — a user only ever sees menu items their role can act on (§10); this is a UI
  convenience only, never the actual security boundary (every mutating endpoint is independently
  Guard-checked server-side per `1-project/2-requirements.md` FR-005/US-003 — hiding a menu item is
  not authorization).
- Stays consistent across all 15 modules — one shared sidebar/topbar shell, not a per-module layout.
- Scales as new modules are added — ProductTracking and StoreTransfer (both confirmed future
  additions, not yet slotted into the build sequence) slot into the existing sidebar structure
  without a redesign: ProductTracking as a sub-view under Products (audit-log style, mirroring how
  SalesHistory nests under Sales Orders), StoreTransfer as a sub-view under Purchase Orders/Sales
  Orders once built, matching how their legacy entry points already work.
- Supports the responsive layout rules in §12.

---

# 3. Navigation Architecture

```
Dashboard
│
├── Sales Orders
│   ├── List
│   ├── Create (Order / Quote / Service Contract / Quick SO)
│   ├── Detail
│   └── Reports (Sales History)
│
├── Accounts
│   ├── List
│   ├── Create
│   ├── Detail (billing, credit, statements, stored payment methods)
│   └── Statements (Account Statement)
│
├── Products
│   ├── List
│   ├── Create
│   ├── Detail (pricing, tax, UOM)
│   └── UOM Conversions
│
├── Purchase Orders
│   ├── List
│   ├── Create
│   ├── Detail (receiving, reconciliation, return-goods)
│   └── Reports (Purchase History)
│
├── Vendors
│   ├── List
│   ├── Create
│   └── Detail
│
├── Location
│   ├── List (branches)
│   └── Detail (product-at-location stock)
│
├── Pricing
│   ├── Rules List
│   └── Rule Create/Edit
│
├── Users
│   ├── List
│   ├── Create
│   ├── Detail
│   └── Roles & Permissions
│
└── Settings
    ├── General
    ├── Integrations (QuickBooks, EDI, payment gateway)
    └── Administration
```

`SearchLineItem` and `PurchaseLineItem` are materialized read-models with no direct screen —
neither appears in this tree (§6 covers where their data surfaces instead).

---

# 4. Navigation Types

- **Primary Navigation**: left sidebar, the 10 top-level items in §3.
- **Secondary Navigation**: in-module tabs on detail screens (e.g. an Account's Overview / Billing /
  Statements / Payment Methods tabs).
- **Sidebar Navigation**: primary mechanism, all breakpoints (collapses/becomes a drawer per §12).
- **Top Navigation**: persistent top bar — global search, current location/branch switcher,
  notifications, quick actions, user menu (mirrors the Stitch mockup's top-bar layout, reused for
  layout pattern only per ADR-177, not its non-responsive implementation).
- **Breadcrumb Navigation**: below the top bar on every non-dashboard screen (§8).
- **Footer Navigation**: minimal — system status, integration health, legal links only. Not a
  primary navigation surface.
- **Context Navigation**: contextual actions on list/detail screens (e.g. a Sales Order detail's
  "Convert Quote to Order," "Print," "Duplicate" actions) — not top-level nav, defined per-module in
  `5-modules/<module>/9-ui.md`.
- **Quick Actions**: a persistent "Quick Create" entry point (mirrors the reviewed mockup's
  bottom-corner FAB pattern) for the highest-frequency creates: New Sales Order, New Purchase Order,
  New Account, New Product — configurable per role.

---

# 5. Menu Structure

| Menu | Parent | Description |
|------|--------|-------------|
| Dashboard | Root | Role-scoped operational overview — KPIs, recent activity, alerts relevant to the logged-in role. |
| Sales Orders | Root | Order/quote/service-contract capture through fulfillment and invoicing. |
| Accounts | Root | Customer/company hub — identity, billing, credit, statements, stored payment methods. |
| Products | Root | Product catalog — identity, pricing inputs, tax, UOM. |
| Purchase Orders | Root | PO creation, receiving, reconciliation, vendor EDI/QuickBooks integration. |
| Vendors | Root | Supplier master — identity, contact, GL/freight config, line-code taxonomy. |
| Location | Root | Branch/store management and per-location stock (quantity-on-hand). |
| Pricing | Root | Unified pricing-rule engine (replaces legacy's four separate pricing mechanisms, ADR-029). |
| Users | Root | Identity/RBAC administration — accounts, roles, groups, sharing rules. |
| Settings | Root | System-wide configuration, integrations, and administration. |

Sub-items (SalesHistory, PurchaseHistory, AccountStatement, UOM) are documented under their parent
module in §6, not as separate root entries, per the confirmed nav-scope decision for this document.

---

# 6. Module Navigation

```
Sales Orders
List
 ├── Create
 ├── Detail
 │    ├── Line Items
 │    ├── Pricing/Discounts
 │    └── Fulfillment Status
 ├── Edit
 └── Reports
      └── Sales History (per-product/location rolling activity — read-only)

Accounts
List
 ├── Create
 ├── Detail
 │    ├── Billing / Credit
 │    ├── Stored Payment Methods
 │    └── Statements
 │         └── Account Statement (generate/view/deliver)
 └── Edit

Products
List
 ├── Create
 ├── Detail
 │    ├── Pricing Inputs
 │    ├── Tax
 │    └── UOM Conversions
 └── Edit

Purchase Orders
List
 ├── Create
 ├── Detail
 │    ├── Receiving
 │    ├── Reconciliation
 │    └── Return-Goods Notification
 ├── Edit
 └── Reports
      └── Purchase History (buy/return counters — read-only)

Vendors
List
 ├── Create
 ├── Detail
 └── Edit

Location
List (branches)
 ├── Detail
 │    └── Product-at-Location Stock
 └── Edit

Pricing
Rules List
 ├── Create Rule
 ├── Rule Detail
 └── Edit Rule

Users
List
 ├── Create
 ├── Detail
 ├── Edit
 └── Roles & Permissions
      └── Role Detail (permission matrix per §10)

Settings
General
 ├── Integrations
 │    ├── QuickBooks
 │    ├── EDI
 │    └── Payment Gateway
 └── Administration
```

`SearchLineItem`/`PurchaseLineItem` data appears inline within Sales Order / Purchase Order detail
screens (as the finalized line-item record once an order is committed) — they are never opened as
their own list/detail screens, matching their role as materialized read-models with SalesOrder/
PurchaseOrder as sole or primary writer.

---

# 7. User Navigation Flow

### Authentication

```
Login
    ↓
Dashboard (role-scoped)
```

### CRUD Flow (standard, applies to Accounts, Products, Vendors, Users, Pricing rules)

```
List
   ↓
Create
   ↓
Detail
   ↓
Edit
   ↓
Back to List
```

### Sales Order Flow

```
Sales Orders List
   ↓
Create (Order / Quote / Service Contract / Quick SO)
   ↓
Detail → Line Items → Pricing
   ↓
Fulfillment status progression (draft → picking → shipped → invoiced)
   ↓
Back to List
```

### Purchase Order Flow

```
Purchase Orders List
   ↓
Create
   ↓
Detail
   ↓
Receiving → Reconciliation
   ↓
Back to List
```

### Error / Session Flow

```
Any authenticated screen
   ↓ (401 / expired token)
Session Expired notice
   ↓
Login (redirect back to originating route after re-auth)
```

---

# 8. Breadcrumb Standards

Breadcrumbs:

- Display current location, always starting from the top-level module, never from Dashboard unless
  Dashboard is the current page.
- Support hierarchical navigation — every breadcrumb segment except the last is a clickable link
  back to that level.
- Never include duplicate entries.
- On a Create/Edit screen, the breadcrumb ends with the action, not a placeholder record name.

Examples

```
Sales Orders
 >
SO-9401
```

```
Products
 >
Ceramic Brake Kits (v2)
 >
Edit
```

---

# 9. Routing Standards

Routes follow the same resource-oriented, REST-friendly convention as the backend API
(`3-api/1-api-design.md`'s `/api/v1/...` pattern), using plural lower-kebab-case resource segments:

```
/dashboard

/sales-orders
/sales-orders/create
/sales-orders/{id}
/sales-orders/{id}/edit

/accounts
/accounts/{id}
/accounts/{id}/statements

/products
/products/{id}

/purchase-orders
/purchase-orders/{id}

/vendors
/vendors/{id}

/locations
/locations/{id}

/pricing
/pricing/{id}

/users
/users/{id}
/users/roles

/settings
/settings/integrations
```

Rules

- Lowercase URLs.
- Hyphen-separated words.
- Resource-oriented paths, plural nouns for list/collection routes.
- `{id}` segments use the resource's real identifier (never an internal numeric row ID exposed
  where a business-facing code exists, e.g. `SO-9401` for a Sales Order once assigned).
- No verbs in the path except the fixed `create`/`edit` action suffixes shown above — all other
  state changes (e.g. finalize, cancel) are actions on the detail screen, not separate routes.

---

# 10. Navigation Permissions

Per `1-project/2-requirements.md` §5 (ADR-002), 6 roles are confirmed. B2B Customer never logs into
this application (confirmed separate external system, this document's generation round) and is
therefore excluded from this application's navigation entirely — it is listed in the role catalog
for API/authorization purposes only, not represented here.

| Menu | Counter/Sales Staff | Warehouse/Fulfillment Staff | Accounting/Management | Purchasing Staff | Admin |
|------|:---:|:---:|:---:|:---:|:---:|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| Sales Orders | ✓ | ✓ (fulfillment views) | ✓ (view/reporting) | | ✓ |
| Accounts | ✓ (view/create) | | ✓ | | ✓ |
| Products | ✓ (view) | ✓ (view) | | ✓ | ✓ |
| Purchase Orders | | ✓ (receiving) | | ✓ | ✓ |
| Vendors | | | | ✓ | ✓ |
| Location | | ✓ | | | ✓ |
| Pricing | | | ✓ (view) | | ✓ |
| Users | | | | | ✓ |
| Settings | | | | | ✓ |

`[Assumption: this document]` — the exact per-role split above (e.g. Accounting/Management getting
read-only Sales Orders access for reporting) is inferred from each role's one-line description in
`1-project/2-requirements.md` §5, not from an explicit ADR enumerating menu-level permissions. The
real, binding permission boundary is the server-side Guard on each endpoint (defined per-module in
`5-modules/<module>/`, JIT) — this matrix is a UI convenience default and should be revisited once
each module's own role/permission rules are extracted.

---

# 11. Search & Quick Navigation

- **Global Search**: top-bar search across orders, SKUs, customers, and vendors (pattern taken from
  the reviewed Stitch mockup's search bar, per ADR-177 — style only, rebuilt responsive).
- **Quick Search**: type-ahead within any list screen, scoped to that module's records.
- **Command Palette**: not in MVP scope — no SoT source requests it; flagged as a possible
  post-MVP enhancement, not a current requirement.
- **Recently Visited Pages**: not in MVP scope.
- **Favorites**: not in MVP scope.
- **Quick Actions**: the Quick Create entry point from §4 (New Sales Order, New Purchase Order, New
  Account, New Product), visible items scoped by role per §10.

---

# 12. Responsive Navigation

Desktop (≥1024px)

- Expanded sidebar, always visible, labeled icons + text.
- Full top bar (search, branch switcher, notifications, quick actions, user menu).

Tablet (≥768px, <1024px)

- Collapsible sidebar — icon-only by default, expandable on tap/click, overlays content rather than
  pushing it when expanded.
- Top bar retained in full; search may collapse to an icon that expands on tap.

Mobile (<768px)

- Sidebar hidden behind a hamburger-triggered drawer (slide-in, dismissible via overlay tap or
  swipe).
- Bottom navigation not used — the module set (10 top-level items) is too large for a bottom bar to
  represent without its own overflow menu, which would just reintroduce the drawer pattern one level
  down; the drawer is the single mobile navigation surface.
- Top bar reduces to: hamburger trigger, page title, and a condensed quick-actions/notifications
  icon cluster.

This directly replaces the fixed, non-responsive sidebar found in the reviewed Stitch mockup — see
ADR-177.

---

# 13. Accessibility Standards

Navigation supports:

- Full keyboard navigation — Tab/Shift+Tab through all sidebar items, top-bar controls, and
  breadcrumb links; Enter/Space activates.
- Screen reader support — sidebar wrapped in a `<nav>` landmark with `aria-label="Primary"`,
  breadcrumb trail in a `<nav aria-label="Breadcrumb">` with an ordered list.
- Visible focus indicators on every interactive nav element — never suppressed via
  `outline: none` without a replacement focus style.
- Proper ARIA attributes — `aria-current="page"` on the active sidebar item and last breadcrumb
  segment, `aria-expanded`/`aria-controls` on the mobile drawer trigger and collapsible sidebar
  toggle.
- Logical tab order matching visual order: sidebar → top bar → breadcrumb → page content.
- Accessible menu controls — the mobile drawer traps focus while open and returns focus to its
  trigger on close.

---

# 14. Navigation State Management

- **Active menu highlighting**: current top-level item and, where applicable, current sub-item
  highlighted via `aria-current="page"` plus a visual treatment (matches the reviewed mockup's
  left-border-accent pattern for the active item).
- **Expanded/collapsed menu state**: sidebar collapse state (tablet) persisted per-user (local
  storage), not reset on navigation.
- **Selected workspace**: current branch/location (top-bar switcher) persisted for the session and
  restored on next login as the user's last-used branch.
- **Current module**: derived from the route, not stored separately — avoids the two ever
  disagreeing.
- **Recently visited pages**: not in MVP scope (§11).

---

# 15. Error Navigation

- **403 Access Denied**: shown when a role-permitted-looking route is hit but the server-side Guard
  rejects it (confirms the UI menu is a convenience, not the real boundary, per §2/§10) — offers
  "Return to Dashboard."
- **404 Page Not Found**: offers "Return to Dashboard" and "Previous Page."
- **Session Expired**: triggered on a 401 from an expired JWT access token where refresh also fails
  — offers "Login" (redirects back to the originating route after re-authentication).
- **Invalid Route**: unrecognized path renders the same 404 handling as above.

---

# 16. Performance Guidelines

Navigation:

- Loads the sidebar/top-bar shell once per session (Next.js layout-level, not re-fetched per route).
- Lazy-loads route-level code per module (Next.js App Router route-based code splitting) —
  avoids shipping all 10 modules' UI on first load.
- Caches menu/permission configuration for the session; only re-fetched on login or explicit
  role/permission change.
- Avoids full page reloads on navigation — client-side routing throughout.
- Preserves scroll position and list filters/pagination state when navigating away and back via
  breadcrumb or browser back.

---

# 17. Best Practices

- Keep menu depth to two levels maximum (top-level → sub-item).
- Use consistent labels matching each module's name exactly as shown in §5 — no synonyms across
  screens (e.g. always "Sales Orders," never "Orders" alone).
- Group related read-only reporting views (Sales History, Purchase History) under their owning
  module rather than as independent top-level items.
- Avoid duplicate navigation paths — a screen has exactly one canonical route; deep-linking from a
  related record (e.g. a Vendor's linked Purchase Orders) reuses that same canonical route with
  filters applied, not a second route.
- Highlight the active page/module at all times.
- Keep navigation predictable — the sidebar order in §3/§5 is fixed, never reordered by usage
  frequency or personalization.
- Prioritize the highest-frequency tasks (order entry, receiving) via Quick Actions rather than
  restructuring the sidebar itself.
- Maintain this same shell across all 15 modules and their future `5-modules/<module>/9-ui.md`
  screens.

---

# 18. Assumptions

- The role → menu-visibility matrix in §10 is inferred from each role's one-line description in
  `1-project/2-requirements.md` §5, not an explicit ADR — flagged for revisit once module-level
  permission rules are extracted `[Assumption: this document]`.
- ProductTracking and StoreTransfer are described here only as future sub-views under Products and
  Purchase Orders/Sales Orders respectively, matching their confirmed-but-unscheduled status in
  `module-list.md` — their exact nav placement is not yet locked by an ADR and may change once each
  is formally slotted into the build sequence `[Assumption: this document]`.
- Command Palette, Favorites, and Recently Visited are assumed out of MVP scope — no SoT source
  requests them `[Assumption: this document]`.

---

# 19. Constraints

- Role-based navigation required (§10), but is a UI convenience only — never the actual
  authorization boundary (`1-project/2-requirements.md` FR-005).
- Responsive design mandatory across desktop/tablet/mobile (`ui-ux-design-requirements.md`).
- Navigation must support full keyboard accessibility (§13).
- All routes require authentication (JWT session) unless explicitly public (login screen only — no
  other public routes exist; there is no B2B-facing surface in this application, confirmed above).
- B2B Customer role exists in the platform-wide role catalog for API/authorization purposes but has
  no representation in this application's navigation — B2B access happens through a separate
  external system, out of scope for this document.

---

# 20. Related Documents

- `1-project/1-project-overview.md`
- `1-project/2-requirements.md` (role catalog, ADR-002)
- `1-project/4-tech-stack.md`
- `3-api/1-api-design.md` (route-naming parity, §9)
- `3-api/2-authentication.md`
- `3-api/3-authorization.md`
- `4-ui/2-user-flows.md`
- `4-ui/3-design-system.md`
- `4-ui/6-responsive-design.md`
- `4-ui/7-accessibility.md`
- `sot-docs/design/design-source.md`
- `decisions-log.md` (ADR-002, ADR-029, ADR-177)

---

# 21. Revision History

| Version | Date | Author | Description |
|----------|------|--------|-------------|
| 1.0 | 2026-08-17 | Claude Code (docs-kit generation) | Initial Draft |

---

# Approval

| Role | Name | Status | Date |
|------|------|--------|------|
| UI/UX Designer | | Pending | |
| Solution Architect | | Pending | |
| Technical Lead | | Pending | |

---

# AI Generation Notes

- Follows the approved `1-project/2-requirements.md` role catalog (ADR-002) and `3-api/1-api-design.md`
  route conventions.
- Designs intuitive, role-based navigation minimizing clicks for the six confirmed roles' primary
  tasks; B2B Customer excluded per developer confirmation (separate external system).
- Uses consistent menu naming and routing conventions matching module names/slugs from
  `claude-docs/analysis/module-list.md`.
- Responsive and accessible navigation defined for all three breakpoints (§12), directly correcting
  the fixed-width, non-responsive pattern found in the reviewed Stitch mockup (ADR-177).
- Scalable for ProductTracking/StoreTransfer once formally scheduled.
- Does not define page layouts or component-level UI details — those belong in `3-design-system.md`,
  `4-component-standards.md`, and each module's own `5-modules/<module>/9-ui.md`.
- Consistent with `3-api/2-authentication.md`, `3-api/3-authorization.md`, and the role catalog.
