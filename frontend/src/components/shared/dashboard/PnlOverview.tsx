import { PNL_OVERVIEW } from '@/lib/mock-data/dashboard';

const BAR_COLORS = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3'];

export function PnlOverview() {
  return (
    <div className="border-border bg-card rounded-lg border p-4">
      <h2 className="text-foreground mb-4 text-sm font-semibold">P&amp;L Overview</h2>
      <div className="flex flex-col gap-4">
        {PNL_OVERVIEW.map((bar, index) => (
          <div key={bar.label}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-foreground font-medium">{bar.label}</span>
              <span className="text-muted-foreground">{bar.value}</span>
            </div>
            <div
              role="progressbar"
              aria-label={bar.label}
              aria-valuenow={bar.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              className="bg-muted h-2 w-full overflow-hidden rounded-full"
            >
              <div
                className={`h-full rounded-full ${BAR_COLORS[index]}`}
                style={{ width: `${bar.percent}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
