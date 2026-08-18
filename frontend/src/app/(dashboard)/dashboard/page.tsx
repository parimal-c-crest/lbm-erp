import { Download, Filter } from 'lucide-react';

import { CustomerActivityFeed } from '@/components/shared/dashboard/CustomerActivityFeed';
import { KpiCardRow } from '@/components/shared/dashboard/KpiCardRow';
import { LowInventoryTable } from '@/components/shared/dashboard/LowInventoryTable';
import { OrderStatusChart } from '@/components/shared/dashboard/OrderStatusChart';
import { PnlOverview } from '@/components/shared/dashboard/PnlOverview';
import { RankedListPanel } from '@/components/shared/dashboard/RankedListPanel';
import { RecentOrdersTable } from '@/components/shared/dashboard/RecentOrdersTable';
import { SalesTerritoryPanel } from '@/components/shared/dashboard/SalesTerritoryPanel';
import { SalesTrendChart } from '@/components/shared/dashboard/SalesTrendChart';
import { WarehouseSummaryCards } from '@/components/shared/dashboard/WarehouseSummaryCards';
import { Button } from '@/components/ui/button';
import { TOP_CUSTOMERS, TOP_SELLING_PRODUCTS } from '@/lib/mock-data/dashboard';

// Admin-role-scoped shell (`4-ui/2-user-flows.md` §7 walkthrough, `4-ui/3-design-system.md` §6
// layout: KPI row -> analytics row -> operations row -> supplementary rows). Every widget below
// is mock data (T-021) — no reporting backend exists yet.
export default function DashboardPage() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-foreground text-2xl font-bold">Enterprise Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Real-time operational overview for today, {today}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm">
            <Filter className="size-4" aria-hidden="true" />
            Filter
          </Button>
          <Button size="sm">
            <Download className="size-4" aria-hidden="true" />
            Export Report
          </Button>
        </div>
      </div>

      <KpiCardRow />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SalesTrendChart />
        <OrderStatusChart />
        <PnlOverview />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RecentOrdersTable />
        <LowInventoryTable />
      </div>

      <CustomerActivityFeed />

      <WarehouseSummaryCards />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <RankedListPanel title="Top Selling Products" items={TOP_SELLING_PRODUCTS} />
        <RankedListPanel title="Top Customers" items={TOP_CUSTOMERS} />
        <SalesTerritoryPanel />
      </div>
    </div>
  );
}
