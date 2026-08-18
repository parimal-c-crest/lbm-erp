import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { RECENT_SALES_ORDERS, type RecentOrder } from '@/lib/mock-data/dashboard';

const STATUS_TONE: Record<RecentOrder['status'], 'success' | 'warning' | 'default'> = {
  Completed: 'success',
  Pending: 'warning',
  Shipped: 'default',
};

export function RecentOrdersTable() {
  return (
    <div className="border-border bg-card rounded-lg border p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-foreground text-sm font-semibold">Recent Sales Orders</h2>
        <Link href="/sales-orders" className="text-primary text-sm font-medium hover:underline">
          View All Orders
        </Link>
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-border text-muted-foreground border-b">
            <th className="pb-2 font-medium">Order #</th>
            <th className="pb-2 font-medium">Customer</th>
            <th className="pb-2 font-medium">Status</th>
            <th className="pb-2 font-medium">Amount</th>
            <th className="pb-2 font-medium">Ship Date</th>
          </tr>
        </thead>
        <tbody>
          {RECENT_SALES_ORDERS.map((order) => (
            <tr key={order.orderNumber} className="border-border border-b last:border-0">
              <td className="text-foreground py-2 font-medium">{order.orderNumber}</td>
              <td className="py-2">{order.customer}</td>
              <td className="py-2">
                <Badge tone={STATUS_TONE[order.status]}>{order.status}</Badge>
              </td>
              <td className="py-2">{order.amount}</td>
              <td className="text-muted-foreground py-2">{order.shipDate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
