'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

const TABS = [
  { label: 'Groups', href: '/settings/uom/groups' },
  { label: 'Categories', href: '/settings/uom/categories' },
  { label: 'Types', href: '/settings/uom/types' },
  { label: 'UOM Roles', href: '/settings/uom/functional-roles' },
] as const;

// Sub-nav for the Unit of Measure landing (`docs-kit/5-modules/uom/9-ui.md` §3 — "tabs or sub-nav
// for Categories / Types / Functional Roles / Groups"), reused at the top of every UOM screen.
export function UomSubNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Unit of Measure sections" className="border-border flex gap-1 border-b">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'border-b-2 border-transparent px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
