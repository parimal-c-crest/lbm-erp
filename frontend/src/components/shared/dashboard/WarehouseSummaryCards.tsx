import { WAREHOUSE_SUMMARY } from '@/lib/mock-data/dashboard';

export function WarehouseSummaryCards() {
  return (
    <div>
      <h2 className="text-foreground mb-4 text-sm font-semibold">Warehouse Summary</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {WAREHOUSE_SUMMARY.map((warehouse) => (
          <div key={warehouse.code} className="border-border bg-card rounded-lg border p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-foreground text-sm font-semibold">{warehouse.name}</span>
              <span className="text-muted-foreground text-xs">{warehouse.code}</span>
            </div>
            <p className="text-muted-foreground text-xs">
              {warehouse.sqft.toLocaleString('en-US')} sqft · {warehouse.capacityPercent}% capacity
            </p>
            <div className="mt-3 flex items-center justify-between text-sm">
              <div>
                <p className="text-muted-foreground text-xs">On Hand</p>
                <p className="text-foreground font-medium">
                  {warehouse.onHandQty.toLocaleString('en-US')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground text-xs">Value</p>
                <p className="text-foreground font-medium">{warehouse.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
