'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { Menu, X } from 'lucide-react';

import { SidebarNavList, useSidebar } from '@/components/shared/Sidebar';

// Mobile-only drawer (`4-ui/1-navigation.md` §12, §13) — Radix Dialog gives focus-trap while
// open and focus-return to the trigger on close for free, matching the accessibility
// requirement without hand-rolling it.
export function SidebarMobileTrigger() {
  const { setMobileOpen } = useSidebar();

  return (
    <button
      type="button"
      onClick={() => setMobileOpen(true)}
      aria-label="Open menu"
      className="text-foreground hover:bg-accent flex size-10 items-center justify-center rounded-md md:hidden"
    >
      <Menu className="size-5" aria-hidden="true" />
    </button>
  );
}

export function SidebarDrawer() {
  const { mobileOpen, setMobileOpen } = useSidebar();

  return (
    <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-foreground/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 md:hidden" />
        <Dialog.Content
          aria-label="Primary"
          className="bg-card data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left fixed inset-y-0 left-0 z-50 flex w-72 flex-col shadow-lg outline-none md:hidden"
        >
          <div className="border-border flex h-16 items-center justify-between border-b px-4">
            <Dialog.Title asChild>
              <span className="font-display text-foreground text-lg font-bold">LBM ERP</span>
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close menu"
                className="text-muted-foreground hover:bg-accent flex size-9 items-center justify-center rounded-md"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          <nav className="flex-1 overflow-y-auto py-4">
            <SidebarNavList />
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
