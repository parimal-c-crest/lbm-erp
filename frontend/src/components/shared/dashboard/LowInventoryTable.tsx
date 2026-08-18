import { Button } from '@/components/ui/button';
import { LOW_INVENTORY } from '@/lib/mock-data/dashboard';

export function LowInventoryTable() {
  return (
    <div className="border-destructive/40 bg-destructive/5 rounded-lg border p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-foreground text-sm font-semibold">Low Inventory</h2>
        <Button size="sm" variant="destructive">
          Bulk Restock Orders
        </Button>
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-border text-muted-foreground border-b">
            <th className="pb-2 font-medium">Product</th>
            <th className="pb-2 font-medium">Qty</th>
            <th className="pb-2 font-medium">Min</th>
          </tr>
        </thead>
        <tbody>
          {LOW_INVENTORY.map((item) => (
            <tr key={item.product} className="border-border border-b last:border-0">
              <td className="text-foreground py-2">{item.product}</td>
              <td className="text-destructive py-2 font-medium">{item.qty}</td>
              <td className="text-muted-foreground py-2">{item.min}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
