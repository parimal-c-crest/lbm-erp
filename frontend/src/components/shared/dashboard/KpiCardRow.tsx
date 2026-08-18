import { Badge } from '@/components/ui/badge';
import { KPI_CARDS } from '@/lib/mock-data/dashboard';

const TONE_MAP = { default: 'default', success: 'success', warning: 'warning', error: 'error' } as const;

export function KpiCardRow() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
      {KPI_CARDS.map((kpi) => (
        <div key={kpi.label} className="border-border bg-card rounded-lg border p-4">
          <p className="text-muted-foreground text-sm">{kpi.label}</p>
          <p className="text-foreground mt-1 text-2xl font-bold">{kpi.value}</p>
          <Badge tone={TONE_MAP[kpi.badge.tone]} className="mt-2">
            {kpi.badge.text}
          </Badge>
        </div>
      ))}
    </div>
  );
}
