'use client';

import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';

import { NAV_ITEMS } from '@/config/nav-items';
import { MOCK_CURRENT_ROLE, ROLE_MENU_MAP } from '@/config/role-menu-map';
import { cn } from '@/lib/utils';

const TABLET_EXPANDED_STORAGE_KEY = 'sidebar:tablet-expanded';

interface SidebarContextValue {
  tabletExpanded: boolean;
  setTabletExpanded: Dispatch<SetStateAction<boolean>>;
  mobileOpen: boolean;
  setMobileOpen: Dispatch<SetStateAction<boolean>>;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

// `4-ui/1-navigation.md` §14 — tablet collapse state persisted per-user (local storage), not
// reset on navigation. Mobile drawer state is session-only (never persisted, closed on every
// navigation via `SidebarNavList`'s link click handler rather than a pathname effect).
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [tabletExpanded, setTabletExpanded] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.localStorage.getItem(TABLET_EXPANDED_STORAGE_KEY) === 'true';
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(TABLET_EXPANDED_STORAGE_KEY, String(tabletExpanded));
  }, [tabletExpanded]);

  return (
    <SidebarContext.Provider
      value={{ tabletExpanded, setTabletExpanded, mobileOpen, setMobileOpen }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

// Shared item list — reused by the desktop/tablet rail (this file) and the mobile drawer
// (`SidebarDrawer.tsx`), so the 10-item set and active-state logic exist in exactly one place.
// Items with `children` (ADR-189) render as an expand/collapse group instead of a direct link;
// in icon-only rail mode (collapsed, no submenu room) they fall back to linking straight to the
// parent's own href.
export function SidebarNavList({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();
  const { setMobileOpen } = useSidebar();
  const visibleItems = NAV_ITEMS.filter((item) =>
    ROLE_MENU_MAP[MOCK_CURRENT_ROLE].includes(item.label),
  );

  const isItemActive = (item: (typeof NAV_ITEMS)[number]) =>
    pathname === item.href ||
    pathname.startsWith(`${item.href}/`) ||
    (item.children?.some((child) => pathname === child.href) ?? false);

  const [openLabels, setOpenLabels] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(visibleItems.filter(isItemActive).map((item) => [item.label, true])),
  );

  return (
    <ul className="flex flex-col gap-1 px-3">
      {visibleItems.map((item) => {
        const isActive = isItemActive(item);
        const Icon = item.icon;
        const hasChildren = (item.children?.length ?? 0) > 0;
        const isOpen = hasChildren && (openLabels[item.label] ?? false);

        return (
          <li key={item.href}>
            {hasChildren ? (
              <button
                type="button"
                onClick={() =>
                  setOpenLabels((prev) => ({ ...prev, [item.label]: !prev[item.label] }))
                }
                aria-expanded={isOpen}
                aria-label={collapsed ? item.label : undefined}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'text-muted-foreground hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-3 rounded-md border-l-4 border-transparent px-3 py-2.5 text-sm font-medium transition-colors',
                  collapsed && 'justify-center px-0 lg:justify-start lg:px-3',
                  isActive && 'border-l-primary bg-accent text-primary',
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                <span className={cn('flex-1 text-left', collapsed && 'sr-only lg:not-sr-only')}>
                  {item.label}
                </span>
                <ChevronDown
                  className={cn(
                    'size-4 shrink-0 transition-transform',
                    isOpen && 'rotate-180',
                    collapsed && 'hidden lg:block',
                  )}
                  aria-hidden="true"
                />
              </button>
            ) : (
              <Link
                href={item.href}
                onClick={() => setMobileOpen(false)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={collapsed ? item.label : undefined}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center gap-3 rounded-md border-l-4 border-transparent px-3 py-2.5 text-sm font-medium transition-colors',
                  collapsed && 'justify-center px-0 lg:justify-start lg:px-3',
                  isActive && 'border-l-primary bg-accent text-primary',
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                <span className={cn(collapsed && 'sr-only lg:not-sr-only')}>{item.label}</span>
              </Link>
            )}

            {hasChildren && isOpen && (
              <ul
                className={cn(
                  'mt-1 flex flex-col gap-1 pl-8',
                  collapsed && 'hidden lg:flex',
                )}
              >
                {item.children!.map((child) => {
                  const isChildActive = pathname === child.href;
                  return (
                    <li key={child.href}>
                      <Link
                        href={child.href}
                        onClick={() => setMobileOpen(false)}
                        aria-current={isChildActive ? 'page' : undefined}
                        className={cn(
                          'text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center rounded-md px-3 py-2 text-sm transition-colors',
                          isChildActive && 'bg-accent text-primary font-medium',
                        )}
                      >
                        {child.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// Desktop (`lg:` always expanded) / Tablet (`md:` icon-only by default, expands as an overlay on
// click) sidebar — `4-ui/1-navigation.md` §12, `4-ui/6-responsive-design.md` §12. Mobile uses
// `SidebarDrawer.tsx` instead (hidden here via `md:flex`).
export function Sidebar() {
  const { tabletExpanded, setTabletExpanded } = useSidebar();

  return (
    <aside
      aria-label="Primary"
      className={cn(
        'border-border bg-card fixed inset-y-0 left-0 z-40 hidden flex-col border-r transition-[width] duration-200',
        'md:flex',
        tabletExpanded ? 'w-64 shadow-lg' : 'w-[72px]',
        'lg:w-64 lg:shadow-none',
      )}
    >
      <div className="border-border flex h-16 items-center border-b px-4">
        <span
          className={cn(
            'font-display text-foreground text-lg font-bold',
            !tabletExpanded && 'hidden lg:inline',
          )}
        >
          LBM ERP
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <SidebarNavList collapsed={!tabletExpanded} />
      </nav>

      <button
        type="button"
        onClick={() => setTabletExpanded((prev) => !prev)}
        aria-expanded={tabletExpanded}
        aria-label={tabletExpanded ? 'Collapse menu' : 'Expand menu'}
        className="border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center justify-center gap-2 border-t py-3 text-sm lg:hidden"
      >
        {tabletExpanded ? (
          <ChevronLeft className="size-4" aria-hidden="true" />
        ) : (
          <ChevronRight className="size-4" aria-hidden="true" />
        )}
      </button>
    </aside>
  );
}
