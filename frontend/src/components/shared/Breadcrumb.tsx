'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { NAV_ITEMS } from '@/config/nav-items';

function humanize(segment: string) {
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Below the top bar on every non-dashboard screen (`4-ui/1-navigation.md` §4/§8) — hidden on
// Dashboard itself per that same rule. Derives labels from the URL; the first segment matches a
// real nav item label, deeper segments are humanized kebab-case until module pages exist to
// supply real record names.
export function Breadcrumb() {
  const pathname = usePathname();

  if (pathname === '/dashboard') {
    return null;
  }

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) {
    return null;
  }

  const crumbs = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join('/')}`;
    const navMatch = index === 0 ? NAV_ITEMS.find((item) => item.href === href) : undefined;
    return { href, label: navMatch?.label ?? humanize(segment) };
  });

  return (
    <nav aria-label="Breadcrumb" className="border-border bg-card border-b px-4 py-2">
      <ol className="text-muted-foreground flex items-center gap-2 text-sm">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li key={crumb.href} className="flex items-center gap-2">
              {index > 0 && <span aria-hidden="true">/</span>}
              {isLast ? (
                <span aria-current="page" className="text-foreground font-medium">
                  {crumb.label}
                </span>
              ) : (
                <Link href={crumb.href} className="hover:text-foreground">
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
