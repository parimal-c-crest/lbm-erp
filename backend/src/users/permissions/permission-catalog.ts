// Canonical module/action catalog for Profile permission grants — mirrors the frontend's
// `PERMISSION_MODULES` (`frontend/src/lib/mock-data/users.ts`) and the sidebar's own module set
// (`config/nav-items.ts`). Field-level permissions (`profile_field_permissions` in the doc) are
// deferred — no SoT source names concrete field-level rules to enforce yet.
export const PERMISSION_MODULES = [
  'sales-orders',
  'accounts',
  'products',
  'purchase-orders',
  'vendors',
  'locations',
  'pricing',
  'users',
  'settings',
] as const;

export const PERMISSION_ACTIONS = ['view', 'create', 'edit', 'delete'] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];
