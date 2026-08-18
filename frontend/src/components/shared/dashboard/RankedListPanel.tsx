import { TrendingDown, TrendingUp } from 'lucide-react';

import type { RankedItem } from '@/lib/mock-data/dashboard';

export function RankedListPanel({ title, items }: { title: string; items: RankedItem[] }) {
  return (
    <div className="border-border bg-card rounded-lg border p-4">
      <h2 className="text-foreground mb-4 text-sm font-semibold">{title}</h2>
      <ol className="flex flex-col gap-3">
        {items.map((item, index) => (
          <li key={item.name} className="flex items-center gap-3">
            <span className="text-muted-foreground w-4 text-sm font-medium">{index + 1}</span>
            <span className="text-foreground flex-1 truncate text-sm">{item.name}</span>
            <span className="text-foreground text-sm font-medium">{item.value}</span>
            {item.trend === 'up' ? (
              <TrendingUp className="text-success size-4" aria-label="Trending up" />
            ) : (
              <TrendingDown className="text-destructive size-4" aria-label="Trending down" />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
