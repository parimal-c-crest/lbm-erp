import {
  Building2,
  LayoutDashboard,
  MapPin,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Tag,
  Users,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';

// The 10 top-level sidebar items — `4-ui/1-navigation.md` §3/§5. Fixed order, never reordered
// by usage frequency or personalization (§17). An item may carry a one-level `children` submenu
// (ADR-189) — only populated once that module's own UI-Design step decides it needs one.
export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  children?: NavItem[];
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Sales Orders', href: '/sales-orders', icon: Receipt },
  { label: 'Accounts', href: '/accounts', icon: Building2 },
  { label: 'Products', href: '/products', icon: Package },
  { label: 'Purchase Orders', href: '/purchase-orders', icon: ShoppingCart },
  { label: 'Vendors', href: '/vendors', icon: Warehouse },
  { label: 'Pricing', href: '/pricing', icon: Tag },
  {
    label: 'Users',
    href: '/users',
    icon: Users,
    children: [
      { label: 'All Users', href: '/users', icon: Users },
      { label: 'Create User', href: '/users/new', icon: Users },
    ],
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    children: [
      { label: 'Mail Account', href: '/settings/mail-account', icon: Settings },
      // System Configuration > Unit of Measure (`docs-kit/5-modules/uom/9-ui.md` §3 — Settings →
      // System Configuration → Unit of Measure, per `1-module.md` §10's flagged Assumption).
      { label: 'Unit of Measure', href: '/settings/uom', icon: Settings },
      // Settings > Location — ADR-195. Location's day-to-day surface is the Super-Admin-only
      // Add-Location wizard (ADR-055), not a module staff browse daily — same shape as UOM.
      { label: 'Location', href: '/settings/locations', icon: MapPin },
    ],
  },
];
