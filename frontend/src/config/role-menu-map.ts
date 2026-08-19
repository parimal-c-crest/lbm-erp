// Role→menu visibility matrix (`4-ui/1-navigation.md` §10) — a UI convenience default, not the
// real permission boundary (that's each module's own server-side Guard, JIT). B2B Customer never
// logs into this app and is excluded (§10 note).
export type Role =
  | 'Counter/Sales Staff'
  | 'Warehouse/Fulfillment Staff'
  | 'Accounting/Management'
  | 'Purchasing Staff'
  | 'Admin';

export const ROLES: Role[] = [
  'Counter/Sales Staff',
  'Warehouse/Fulfillment Staff',
  'Accounting/Management',
  'Purchasing Staff',
  'Admin',
];

// Menu labels visible per role — must match `NAV_ITEMS`' labels exactly (nav-items.ts).
export const ROLE_MENU_MAP: Record<Role, string[]> = {
  'Counter/Sales Staff': ['Dashboard', 'Sales Orders', 'Accounts', 'Products'],
  'Warehouse/Fulfillment Staff': [
    'Dashboard',
    'Sales Orders',
    'Products',
    'Purchase Orders',
    'Location',
  ],
  'Accounting/Management': ['Dashboard', 'Sales Orders', 'Accounts', 'Pricing'],
  'Purchasing Staff': ['Dashboard', 'Products', 'Purchase Orders', 'Vendors'],
  Admin: [
    'Dashboard',
    'Sales Orders',
    'Accounts',
    'Products',
    'Purchase Orders',
    'Vendors',
    'Location',
    'Pricing',
    'Users',
    'Settings',
  ],
};

// No real login/role yet (mock milestone) — Admin shows every item, matching current behavior
// unchanged by default. Swap this for the real authenticated role once login (Users module, M3)
// exists.
export const MOCK_CURRENT_ROLE: Role = 'Admin';

// Super Admin is a structurally separate axis from the Role/Profile catalog above, never assigned
// to a tenant's own business users (ADR-057; backend already models this as `User.isSuperAdmin`,
// not a Role row — `backend/src/users/permissions/permissions.service.ts`). The Role type/map above
// predates that model and has no "Super Admin" entry of its own, so Location's Super-Admin-only
// actions (Add Location, ADR-055) key off this separate mock flag instead of `MOCK_CURRENT_ROLE`.
// Flip to `false` locally to see the Super-Admin-gated UI (Add Location button/wizard route) hide,
// same "UI convenience, server enforces" caveat as the rest of this file (ADR-006).
export const MOCK_IS_SUPER_ADMIN = true;
