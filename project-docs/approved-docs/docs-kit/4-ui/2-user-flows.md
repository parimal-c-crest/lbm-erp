# User Flows

> **Purpose**
>
> This document defines the standard user journeys, task flows, interaction sequences, and decision
> paths throughout the LBM ERP Rewrite. It ensures every user can accomplish tasks efficiently while
> maintaining a consistent experience across all modules.

---

# Document Information

| Field | Value |
|--------|-------|
| Project Name | LBM ERP Rewrite |
| Platform | Web |
| Version | 1.0 |
| Status | Draft |
| Author | Claude Code (docs-kit generation) |
| Created Date | 2026-08-17 |
| Last Updated | 2026-08-17 |

---

# 1. Executive Summary

User flows follow the sidebar/navigation model in `4-ui/1-navigation.md`: a flat, role-gated ERP
shell with no deep menu trees. The primary journeys are order capture (Sales Orders), procurement
(Purchase Orders), and the supporting master-data CRUD flows (Accounts, Products, Vendors, Location,
Pricing, Users). Role-based workflows follow the 6-role catalog from `1-project/2-requirements.md`
§5 (ADR-002); B2B Customer is excluded — that role never logs into this application (confirmed
separate external system, see `4-ui/1-navigation.md` §1). Expected outcome: every flow reaches its
goal in the fewest steps consistent with the server-side validation and confirmation rules already
locked per-module in `decisions-log.md`.

---

# 2. Objectives

User flow design:

- Minimizes user effort — CRUD flows never require more steps than List → Create/Edit → Save →
  Detail.
- Reduces unnecessary steps — no confirmation step on non-destructive actions (only on delete/
  cancel/finalize-reversal actions, per `1-project` FR conventions).
- Provides intuitive navigation, consistent with `4-ui/1-navigation.md`.
- Supports role-based workflows (§14).
- Handles errors gracefully — every flow has a documented failure path (§11).
- Maintains consistency across all 15 modules — one shared flow pattern per action type (Create,
  Edit, Delete, Search/Filter), not a bespoke pattern per module.

---

# 3. User Roles

Per `1-project/2-requirements.md` §5 (ADR-002):

| Role | Description |
|------|-------------|
| Counter/Sales Staff | Order entry, quoting, customer-facing transactions |
| Warehouse/Fulfillment Staff | Picking, receiving, stock transfers, delivery prep |
| Accounting/Management | Credit, statements, deposits/ROA, financial reporting |
| Purchasing Staff | Vendor management, PO creation/reconciliation, EDI |
| Admin | Users/role management, Settings, pricing configuration |
| B2B Customer | External storefront access — **not represented in this application's flows**; a
separate external system, out of scope here. Listed for completeness with the platform-wide role
catalog only. |

---

# 4. Flow Design Principles

Every user flow in this project:

- Is simple — matches the flat navigation model, no flow exceeds the depth in `4-ui/1-navigation.md`
  §3.
- Is predictable — the same action (Create/Edit/Delete/Search) always produces the same flow shape
  regardless of module.
- Is consistent with `4-ui/1-navigation.md` and `4-ui/3-design-system.md`.
- Is efficient — minimum steps to the user's goal.
- Is recoverable — every failure path returns the user to a state they can act from, never a dead
  end (§11).
- Is accessible — keyboard- and screen-reader-operable end to end (§16).
- Is responsive — every flow works unmodified across desktop/tablet/mobile (§15).

---

# 5. Application Entry Flows

## Guest User

```
Landing Page (Login)
      ↓
Login
      ↓
Dashboard (role-scoped)
```

There is no public/anonymous area beyond the login screen — confirmed in `4-ui/1-navigation.md` §19
(all routes require authentication except login).

## Authenticated User

```
Login
      ↓
Dashboard (role-scoped)
```

## Session Expired

```
Current Page
      ↓
401 (access token expired, refresh also fails)
      ↓
Session Expired notice
      ↓
Login
      ↓
Return to originating route
```

---

# 6. Authentication Flows

## Login

```
Login Page
      ↓
Validate Credentials (JWT access+refresh issued)
      ↓
Success
      ↓
Dashboard (role-scoped)
```

Failure

```
Login
      ↓
Invalid Credentials
      ↓
Show Error (generic — no distinction between "wrong password" and "unknown user," standard
credential-enumeration hardening)
      ↓
Retry
```

## Password Reset

```
Forgot Password
      ↓
Enter Email
      ↓
Verification (emailed reset link/token)
      ↓
Reset Password
      ↓
Login
```

*Forward reference, not a gap in this document* — exact password-reset mechanics (token TTL,
single-use enforcement) belong to the Users module's own authentication rules; this flow diagram is
structural only and defers numeric/behavioral detail to `5-modules/users/` when that module is
generated.

---

# 7. Dashboard Flow

```
Login
     ↓
Dashboard (role-scoped)
     ↓
Select Module (sidebar)
```

**Screen walkthrough** — per the reviewed Stitch mockup screenshot
(`sot-docs/design/screenshots/stitch_lbm_design/screen.png`, reused for layout/content-pattern
reference per ADR-177, not its literal fixed-width implementation), the Admin-role Dashboard
concretely contains:

- Top bar: global search ("Search orders, SKU, or customers..."), branch/location switcher
  ("Main Branch - Houston" with dropdown), notifications bell (unread indicator dot), user avatar +
  name + role label ("LBM Admin" / "System Controller"), a "Quick Create" trigger.
- Page header: title ("Enterprise Dashboard"), a live date-stamped subtitle ("Real-time operational
  overview for today, [date]"), and two page-level actions — "Filter" and "Export Report."
- KPI card row (6 cards, each: an icon, a small trend/status badge, a label, and a bold numeric
  value): Today's Sales (with a % change badge), Open Sales Orders (order count badge), PO Pending
  (a "Late" count badge), Inventory Value (a "last updated" timestamp), Receivables ("Overdue"
  badge), Low Stock Items (a "Critical" badge in an error-tinted card).
- Analytics row: a Sales Trend bar chart (12-month, labeled by month initial) with a "Last 12
  Months" period selector chip; an Order Status donut chart with a centered total count and a
  Completed/Pending/Shipped percentage legend; a P&L Overview panel with three labeled progress
  bars (Revenue, Purchases, Gross Margin), each showing a dollar value.
- Operations row: a "Recent Sales Orders" table (columns: Order #, Customer, Status badge, Amount,
  Ship Date) with a "View All Orders" link; a "Low Inventory" panel/table (columns: Product, Qty,
  Min) in an error-tinted card, with a "Bulk Restock Orders" action button.
- Widgets: KPI cards, Sales Trend chart, Order Status chart, P&L panel, Recent Orders table, Low
  Inventory table (all listed above).
- Quick actions: the floating "apps"-icon trigger (bottom-right) that opens a slide-in "Enterprise
  Portal" panel containing New Customer / New Order / New Quote / Receive Stock buttons and an
  "Active Alerts" feed (Low Stock Warning, Late Purchase Order, Approval Required entries, each
  timestamped).
- Notifications: the top-bar bell (badge dot) and the slide-in panel's Active Alerts feed (§ above)
  are the two notification surfaces shown.
- Recent activity: the "Recent Sales Orders" table and the slide-in panel's Active Alerts feed both
  serve this role; the mockup does not show a separate combined activity timeline on the main
  dashboard canvas itself (its `code.html` does include a "Customer Activity" timeline card further
  down the page — included below for completeness since it is present in the underlying markup even
  though clipped from the screenshot capture).
- Customer Activity timeline (present in `code.html`, below the fold in the captured screenshot):
  chronological entries (e.g. "[Customer] created Quote #...", "Order [SO-#] has been Shipped",
  "[Customer] paid Invoice #...") each with a relative timestamp.
- Warehouse Summary cards (also below the fold in `code.html`): per-location card showing
  name/code, square footage, capacity %, On Hand quantity, and $ Value.
- Top Selling Products / Top Customers / Sales Territory panels (also below the fold in `code.html`):
  horizontal bar list, ranked leaderboard with YTD $ and trend icon, and a territory map placeholder
  with per-region $ totals.

This Dashboard content is Admin-role-scoped as captured; role-scoped variants for the other 5 roles
show the same widget types filtered to what that role's KPIs/actions cover (e.g. Counter/Sales Staff
sees Today's Sales, Open Sales Orders, Recent Sales Orders — not Receivables or Low Stock, which are
Accounting/Management and Purchasing/Warehouse concerns respectively) `[Assumption: this document]`
— the mockup only shows the Admin variant; role-filtered dashboard content is not otherwise specified
in any SoT source and should be confirmed against real usage once each module's own reporting rules
exist.

---

# 8. CRUD User Flow

Applicable to Accounts, Products, Vendors, Location, Pricing, Users (and any future module using
standard CRUD, e.g. once ProductTracking/StoreTransfer are scheduled).

## Create

```
List
   ↓
Create
   ↓
Client-side validation (immediate field feedback)
   ↓
Submit → server-side validation (Guard + business rules)
   ↓
Save
   ↓
Detail
```

## Edit

```
Detail
   ↓
Edit
   ↓
Client-side validation
   ↓
Submit → server-side validation
   ↓
Update
   ↓
Detail
```

## Delete

```
Detail
   ↓
Delete
   ↓
Confirmation dialog (destructive-action pattern, `4-ui/4-component-standards.md`)
   ↓
Deleted
   ↓
List
```

Sales Orders and Purchase Orders do not use this generic CRUD shape as-is — they follow their own
lifecycle flows (§7 note above, and the Sales/Purchase Order flows in `4-ui/1-navigation.md` §7),
since "delete" is not a valid terminal action on a finalized order; those modules use status
transitions (draft → picking → shipped → invoiced / draft → receiving → reconciled) instead of a
generic delete step.

---

# 9. Search & Filter Flow

```
Open List
      ↓
Search (type-ahead, scoped to that module's records — `4-ui/1-navigation.md` §11)
      ↓
Filter (module-specific filter panel)
      ↓
Sort (column-header sort where applicable)
      ↓
Results (paginated)
```

State (search term, active filters, sort, page) persists when navigating away and back via
breadcrumb or browser back, per `4-ui/1-navigation.md` §16.

---

# 10. Approval Workflow

Applies where a module's own business rules require sign-off — e.g. the Stitch mockup's "Approval
Required" alert example ("[Staff] submitted a quote for $45,000 requiring management sign-off"),
consistent with Accounting/Management's role scope.

```
Draft
   ↓
Submitted
   ↓
Review (Accounting/Management or Admin, per module's own rule)
   ↓
Approved
```

Alternative

```
Submitted
      ↓
Rejected
      ↓
Revise
      ↓
Resubmit
```

*Forward reference, not a gap in this document* — which specific actions require approval (e.g.
quote value thresholds) is module-specific business-rule detail, not yet extracted; deferred to each
module's own `5-modules/<module>/` generation.

---

# 11. Error Handling Flow

Validation Error

```
Submit Form
      ↓
Validation Failed (server-side, mirrored client-side per `4-ui/5-form-standards.md`)
      ↓
Highlight Errors (inline, field-level)
      ↓
Correct Input
      ↓
Submit Again
```

Permission Error

```
Open Page / Attempt Action
      ↓
403 Access Denied (server-side Guard rejection — the real boundary, `4-ui/1-navigation.md` §19)
      ↓
Return to Dashboard
```

System Error

```
Unexpected Error (5xx, network failure)
      ↓
Show Friendly Message (no raw stack trace/error code exposed to the user)
      ↓
Retry
```

---

# 12. Notification Flow

```
Action Completed
       ↓
Success Notification (toast, auto-dismiss)
```

```
Validation Failed
       ↓
Warning Notification (inline + toast where the field isn't currently visible)
```

```
System Failure
       ↓
Error Notification (toast, persists until dismissed)
```

```
Business Event (e.g. Low Stock threshold crossed, PO overdue)
       ↓
Alert (persistent, surfaced in top-bar bell + Active Alerts panel per §7 walkthrough)
```

---

# 13. Multi-Step Workflow

Applies to Sales Order / Purchase Order creation, which spans line items → pricing/discounts →
review before save (not a single-screen form).

```
Step 1: Header (customer/vendor, location)
   ↓
Step 2: Line Items
   ↓
Step 3: Pricing / Discounts
   ↓
Review
   ↓
Submit
```

Include

- Save Draft (available at every step — orders/POs support a draft state, per
  `4-ui/1-navigation.md` §7 lifecycle flows).
- Previous / Next.
- Cancel (returns to List, discarding unsaved changes with a confirmation if any step has unsaved
  input).

---

# 14. Role-Based Flows

Admin

```
Dashboard
     ↓
Users
     ↓
Roles & Permissions
```

Counter/Sales Staff

```
Dashboard
     ↓
Sales Orders
     ↓
Create (Order / Quote / Quick SO)
```

Warehouse/Fulfillment Staff

```
Dashboard
     ↓
Purchase Orders
     ↓
Receiving
```

Accounting/Management

```
Dashboard
     ↓
Accounts
     ↓
Statements
```

Purchasing Staff

```
Dashboard
     ↓
Purchase Orders
     ↓
Create
```

B2B Customer — not applicable; excluded from this application's flows (§3).

---

# 15. Mobile User Flow

- **Drawer menu**: sidebar collapses to a hamburger-triggered drawer, per `4-ui/1-navigation.md`
  §12. Opening any module from the drawer auto-closes it.
- **Bottom navigation**: not used (per `4-ui/1-navigation.md` §12 rationale — 10 top-level modules
  don't fit a bottom bar without reintroducing an overflow/drawer anyway).
- **Touch interactions**: minimum touch target sizing per `ui-ux-design-requirements.md`; swipe-to-
  dismiss on the drawer and the Quick Actions slide-in panel.
- **Responsive workflow**: every flow in this document (§5–14) runs unmodified on mobile — only the
  navigation chrome (§12 of `4-ui/1-navigation.md`) and form layout (`4-ui/5-form-standards.md`,
  multi-column → single-column) change, never the flow's step sequence.
- **Offline behavior**: not applicable — no offline mode requested in any SoT source; the
  application assumes an active connection, consistent with a session-authenticated JWT model.

---

# 16. Accessibility Considerations

User flows support:

- Keyboard navigation through every step of every flow (Tab order matches visual/logical order).
- Screen reader announcements on state changes (e.g. "Order saved," "3 validation errors found").
- Focus management — focus moves to the first error on validation failure, to the confirmation
  dialog on delete, and back to the triggering control when a dialog closes.
- Skip navigation — a "Skip to main content" link precedes the sidebar in tab order.
- Accessible error messages — associated to their field via `aria-describedby`, not conveyed by
  color alone.
- Clear progress indicators on multi-step flows (§13) — current step always announced.

---

# 17. Performance Considerations

User flows:

- Minimize loading delays — optimistic UI where safe (e.g. list sort/filter), server-confirmed
  state for financial actions (order save, payment).
- Reduce unnecessary page reloads — client-side routing throughout (`4-ui/1-navigation.md` §16).
- Preserve user state — form/filter state survives navigation-and-back (§9).
- Use lazy loading for below-the-fold dashboard widgets (§7's Warehouse Summary / Top Products /
  Top Customers / Sales Territory panels) and route-level code splitting per module.
- Provide loading indicators (skeleton states, `4-ui/4-component-standards.md`) on every
  network-bound view, never a blank screen during fetch.

---

# 18. Flow Review Checklist

- User goal is achieved in the minimum steps consistent with server-side validation.
- Error recovery exists for every flow in §11.
- Permission checks included — every flow assumes a server-side Guard, not just menu visibility.
- Responsive behavior verified per §15.
- Accessibility supported per §16.
- Navigation is intuitive and matches `4-ui/1-navigation.md`.
- Success and failure paths documented for every flow in this file.

---

# 19. Best Practices

- Keep workflows short — no flow in this document exceeds 5 steps end to end.
- Minimize decision points — a flow branches only at genuine business decisions (approve/reject),
  not at incidental UI choices.
- Use consistent terminology — module names match `4-ui/1-navigation.md` §5 exactly.
- Provide immediate feedback — inline validation, toast notifications (§12).
- Allow easy recovery from errors (§11).
- Avoid unnecessary confirmations — reserved for destructive/irreversible actions only (§8 Delete,
  order/PO cancellation).
- Support keyboard and touch interactions equally (§16, §15).
- Design with the user's primary task in mind — order entry and receiving get the shortest paths
  (Quick Actions, §7 walkthrough).

---

# 20. Assumptions

- Role-scoped Dashboard content for the 5 non-Admin roles is inferred from each role's description,
  not shown in the reviewed mockup (which only captures the Admin view)
  `[Assumption: this document]`.
- Offline behavior is assumed out of scope — no SoT source requests it `[Assumption: this document]`.
- Command Palette / Favorites / Recently Visited flows are out of MVP scope, consistent with
  `4-ui/1-navigation.md` §11 `[Assumption: this document]`.

---

# 21. Constraints

- Authentication required for every protected workflow (§5, §6).
- Role-based access enforced at the server (§2, §11) — UI flow gating is convenience only.
- Responsive design mandatory (§15).
- Accessibility standards must be followed (§16).

---

# 22. Related Documents

- `4-ui/1-navigation.md`
- `4-ui/3-design-system.md`
- `4-ui/4-component-standards.md`
- `4-ui/5-form-standards.md`
- `3-api/2-authentication.md`
- `3-api/3-authorization.md`
- `1-project/2-requirements.md` (role catalog, ADR-002)
- `sot-docs/design/screenshots/stitch_lbm_design/` (Dashboard flow screen walkthrough, §7)
- `decisions-log.md` (ADR-002, ADR-177)

---

# 23. Revision History

| Version | Date | Author | Description |
|----------|------|--------|-------------|
| 1.0 | 2026-08-17 | Claude Code (docs-kit generation) | Initial Draft |

---

# Approval

| Role | Name | Status | Date |
|------|------|--------|------|
| UI/UX Designer | | Pending | |
| Product Owner | | Pending | |
| Solution Architect | | Pending | |

---

# AI Generation Notes

- User flows derived from `1-project/2-requirements.md`, `4-ui/1-navigation.md`, and a literal
  screen-by-screen walkthrough of the reviewed Stitch mockup (§7) per ADR-177 (style/content-pattern
  reference only, layout rebuilt responsive).
- Documents both success and failure paths for every flow (§6, §8, §11).
- Considers all 6 catalog roles; B2B Customer explicitly excluded (out of scope, separate system).
- Kept workflows simple, intuitive, and efficient — no generic prose flow descriptions where a
  concrete screenshot fact was available (§7).
- Consistent with `4-ui/1-navigation.md`, `3-api/2-authentication.md`, `3-api/3-authorization.md`.
- Does not define screen layouts or UI components — reserved for `4-ui/3-design-system.md`,
  `4-ui/4-component-standards.md`, and module-level `5-modules/<module>/9-ui.md`.
