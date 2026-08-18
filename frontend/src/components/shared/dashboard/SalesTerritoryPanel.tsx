import { MapPin } from 'lucide-react';

import { SALES_TERRITORY } from '@/lib/mock-data/dashboard';

// Territory map placeholder (`4-ui/2-user-flows.md` §7: "territory map placeholder with
// per-region $ totals") — no real map/geo data exists yet, listed per-region instead.
export function SalesTerritoryPanel() {
  return (
    <div className="border-border bg-card rounded-lg border p-4">
      <h2 className="text-foreground mb-4 text-sm font-semibold">Sales Territory</h2>
      <ul className="flex flex-col gap-3">
        {SALES_TERRITORY.map((territory) => (
          <li key={territory.region} className="flex items-center gap-3">
            <MapPin className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
            <span className="text-foreground flex-1 text-sm">{territory.region}</span>
            <span className="text-foreground text-sm font-medium">{territory.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
