'use client';

import { Bell, ChevronDown, Plus, Search, User } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ChangePasswordModal } from '@/components/shared/ChangePasswordModal';
import { useQuickActions } from '@/components/shared/QuickActionsPanel';
import { SidebarMobileTrigger } from '@/components/shared/SidebarDrawer';
import { TimeClockWidget } from '@/components/shared/TimeClockWidget';
import { logout } from '@/lib/api/auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NAV_ITEMS } from '@/config/nav-items';

const BRANCH_STORAGE_KEY = 'topbar:selected-branch';

// Mock only — no branches/auth API exists yet (M2 milestone). Real data lands with the
// Location/Users modules' own JIT cycles.
const MOCK_BRANCHES = ['Main Branch - Houston', 'Dallas Warehouse', 'Austin Retail'];
const MOCK_USER = { name: 'LBM Admin', role: 'System Controller' };

function usePageTitle() {
  const pathname = usePathname();
  const match = NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  return match?.label ?? 'Dashboard';
}

function BranchSwitcher() {
  const [branch, setBranch] = useState(MOCK_BRANCHES[0]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restore persisted selection on mount
    setBranch(window.localStorage.getItem(BRANCH_STORAGE_KEY) ?? MOCK_BRANCHES[0]);
  }, []);

  function handleSelect(next: string) {
    setBranch(next);
    window.localStorage.setItem(BRANCH_STORAGE_KEY, next);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="hover:bg-accent flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium">
        {branch}
        <ChevronDown className="size-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {MOCK_BRANCHES.map((option) => (
          <DropdownMenuItem key={option} onSelect={() => handleSelect(option)}>
            {option}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenu() {
  const router = useRouter();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="hover:bg-accent flex items-center gap-2 rounded-md px-2 py-1.5">
          <span className="bg-accent text-accent-foreground flex size-9 items-center justify-center rounded-full">
            <User className="size-5" aria-hidden="true" />
          </span>
          <span className="hidden text-left lg:block">
            <span className="text-foreground block text-sm font-medium">{MOCK_USER.name}</span>
            <span className="text-muted-foreground block text-xs">{MOCK_USER.role}</span>
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem disabled>{MOCK_USER.name}</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => router.push('/settings/mail-account')}>
            Mail Account &amp; Notifications
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setChangePasswordOpen(true)}>Change Password</DropdownMenuItem>
          <DropdownMenuItem onSelect={handleLogout}>Log out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ChangePasswordModal open={changePasswordOpen} onOpenChange={setChangePasswordOpen} mode="self-service" />
    </>
  );
}

function NotificationsBell() {
  return (
    <button
      type="button"
      aria-label="Notifications"
      className="hover:bg-accent relative flex size-10 items-center justify-center rounded-md"
    >
      <Bell className="size-5" aria-hidden="true" />
      <span className="bg-destructive absolute top-2 right-2 size-2 rounded-full" aria-hidden="true" />
    </button>
  );
}

function QuickCreateButton() {
  const { setOpen } = useQuickActions();
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Quick create"
      className="hover:bg-accent flex size-10 items-center justify-center rounded-md"
    >
      <Plus className="size-5" aria-hidden="true" />
    </button>
  );
}

// Tablet range (md–lg): collapsed to an icon, expands to an inline input on tap (nav doc §12).
function SearchIconExpand() {
  const [expanded, setExpanded] = useState(false);

  if (!expanded) {
    return (
      <button
        type="button"
        aria-label="Search"
        onClick={() => setExpanded(true)}
        className="hover:bg-accent flex size-10 items-center justify-center rounded-md lg:hidden"
      >
        <Search className="size-5" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div className="relative lg:hidden">
      <Search
        className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
        aria-hidden="true"
      />
      <input
        type="search"
        autoFocus
        placeholder="Search orders, SKU, or customers..."
        onBlur={() => setExpanded(false)}
        className="border-border bg-background w-48 rounded-md border py-2 pr-3 pl-9 text-sm"
      />
    </div>
  );
}

// Desktop range (lg+): always the full-width input, no collapse.
function SearchFull() {
  return (
    <div className="relative hidden w-full max-w-sm lg:block">
      <Search
        className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
        aria-hidden="true"
      />
      <input
        type="search"
        placeholder="Search orders, SKU, or customers..."
        className="border-border bg-background w-full max-w-sm rounded-md border py-2 pr-3 pl-9 text-sm"
      />
    </div>
  );
}

// Persistent top bar (`4-ui/1-navigation.md` §4/§12) — full set of controls on desktop/tablet,
// condensed to hamburger + title + notifications/quick-create on mobile. All data below is mock
// (no auth/branch/search backend exists yet, M2 milestone) — real wiring lands with the modules
// that own each piece (Users/Location for auth+branches, Search Line Item for search).
export function TopBar() {
  const pageTitle = usePageTitle();

  return (
    <header className="border-border bg-card flex h-16 items-center gap-3 border-b px-4">
      <SidebarMobileTrigger />

      <span className="font-display text-foreground text-base font-bold md:hidden">
        {pageTitle}
      </span>

      <div className="hidden flex-1 items-center gap-3 md:flex">
        <SearchIconExpand />
        <SearchFull />
        <BranchSwitcher />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden lg:block">
          <TimeClockWidget />
        </div>
        <NotificationsBell />
        <QuickCreateButton />
        <div className="hidden md:block">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
