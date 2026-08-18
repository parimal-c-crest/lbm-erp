import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { QuickActionsFab, QuickActionsPanel, QuickActionsProvider } from '@/components/shared/QuickActionsPanel';
import { Sidebar, SidebarProvider } from '@/components/shared/Sidebar';
import { SidebarDrawer } from '@/components/shared/SidebarDrawer';
import { TopBar } from '@/components/shared/TopBar';
import { TooltipProvider } from '@/components/ui/tooltip';

export default function DashboardLayout({ children }: LayoutProps<'/'>) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <QuickActionsProvider>
          <Sidebar />
          <SidebarDrawer />

          <div className="min-h-svh md:pl-[72px] lg:pl-64">
            <TopBar />
            <Breadcrumb />
            <main className="pb-24 md:pr-24 md:pb-20">{children}</main>
          </div>

          <QuickActionsFab />
          <QuickActionsPanel />
        </QuickActionsProvider>
      </SidebarProvider>
    </TooltipProvider>
  );
}
