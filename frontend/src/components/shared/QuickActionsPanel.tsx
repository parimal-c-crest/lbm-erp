'use client';

import { Clock, FileWarning, LayoutGrid, ShieldAlert, UserPlus } from 'lucide-react';
import { createContext, useContext, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface QuickActionsContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const QuickActionsContext = createContext<QuickActionsContextValue | null>(null);

// Shared open/close state — the top bar's Quick Create icon (T-014) and the floating FAB below
// both open the same panel, matching Sidebar.tsx's own context pattern.
export function QuickActionsProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <QuickActionsContext.Provider value={{ open, setOpen }}>{children}</QuickActionsContext.Provider>
  );
}

export function useQuickActions() {
  const context = useContext(QuickActionsContext);
  if (!context) {
    throw new Error('useQuickActions must be used within a QuickActionsProvider');
  }
  return context;
}

const QUICK_CREATE_ACTIONS = ['New Customer', 'New Order', 'New Quote', 'Receive Stock'];

// Mock only — no real alerting/module data exists yet (M2 milestone).
const MOCK_ALERTS = [
  { icon: FileWarning, label: 'Low Stock Warning', detail: 'Ceramic Brake Kits (v2)', time: '12m ago' },
  { icon: Clock, label: 'Late Purchase Order', detail: 'PO-2291 — Acme Supply Co.', time: '1h ago' },
  { icon: ShieldAlert, label: 'Approval Required', detail: 'SO-9401 discount over threshold', time: '3h ago' },
];

// Floating trigger, bottom-right (`4-ui/2-user-flows.md` §7) — desktop/tablet only; mobile's
// condensed top-bar cluster (`4-ui/1-navigation.md` §12) already covers this role there.
export function QuickActionsFab() {
  const { setOpen } = useQuickActions();
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Open quick actions"
      className="bg-secondary text-secondary-foreground hover:opacity-90 fixed right-6 bottom-6 z-40 hidden size-14 items-center justify-center rounded-full shadow-lg md:flex"
    >
      <LayoutGrid className="size-6" aria-hidden="true" />
    </button>
  );
}

// Slide-in panel content (`4-ui/2-user-flows.md` §7 walkthrough) — "Enterprise Portal": 4
// highest-frequency quick-create buttons (inert this task — the real create flows are each
// module's own future task) + an Active Alerts feed (mock).
export function QuickActionsPanel() {
  const { open, setOpen } = useQuickActions();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>Enterprise Portal</SheetTitle>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
          <div>
            <h2 className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
              Quick Create
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {QUICK_CREATE_ACTIONS.map((action) => (
                <Button key={action} variant="secondary" size="sm" className="justify-start gap-2">
                  <UserPlus className="size-4" aria-hidden="true" />
                  {action}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
              Active Alerts
            </h2>
            <ul className="flex flex-col gap-3">
              {MOCK_ALERTS.map((alert) => (
                <li key={alert.label} className="border-border flex items-start gap-3 rounded-md border p-3">
                  <alert.icon className="text-destructive mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <div className="flex-1">
                    <p className="text-foreground text-sm font-medium">{alert.label}</p>
                    <p className="text-muted-foreground text-sm">{alert.detail}</p>
                  </div>
                  <span className="text-muted-foreground shrink-0 text-xs">{alert.time}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
