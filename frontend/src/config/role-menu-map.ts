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
