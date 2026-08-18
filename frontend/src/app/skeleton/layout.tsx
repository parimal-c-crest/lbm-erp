'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { getDevToken, setDevToken } from '@/lib/api';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'Tenants', href: '/skeleton/tenants' },
  { label: 'Migration', href: '/skeleton/tenants/migrate' },
  { label: 'Jobs', href: '/skeleton/jobs' },
];

// Platform-admin control panel (T-027, design doc §8) — separate from the tenant ERP nav
// (`config/nav-items.ts`'s 10 modules). Gated server-side (skeleton subdomain + Super Admin
// role, `SkeletonOnlyGuard`/`RolesGuard`); this layout only holds the dev-token stopgap and nav.
export default function SkeletonLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [tokenInput, setTokenInput] = useState('');
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading localStorage on mount
    setHasToken(Boolean(getDevToken()));
  }, []);

  function handleSaveToken() {
    if (!tokenInput.trim()) {
      return;
    }
    setDevToken(tokenInput.trim());
    setHasToken(true);
    setTokenInput('');
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-5xl flex-col gap-6 p-6">
      <header className="border-border flex items-center justify-between border-b pb-4">
        <span className="font-display text-foreground text-lg font-bold">
          Skeleton Control Panel
        </span>
        <nav className="flex gap-4">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'text-muted-foreground hover:text-foreground text-sm font-medium',
                  isActive && 'text-foreground underline underline-offset-4',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {!hasToken && (
        <div className="border-border bg-card flex flex-wrap items-center gap-3 rounded-md border p-4">
          <span className="text-sm">
            No dev token set. Run <code>pnpm --filter backend run issue-dev-token</code> and paste
            it below (stopgap until real login exists).
          </span>
          <input
            type="text"
            value={tokenInput}
            onChange={(event) => setTokenInput(event.target.value)}
            placeholder="Paste JWT here"
            className="border-border min-w-64 flex-1 rounded-md border px-3 py-2 text-sm"
          />
          <Button size="sm" onClick={handleSaveToken}>
            Save token
          </Button>
        </div>
      )}

      <main className="flex-1">{children}</main>
    </div>
  );
}
