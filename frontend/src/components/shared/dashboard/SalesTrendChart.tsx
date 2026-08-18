'use client';

import { useState } from 'react';

import { SALES_TREND } from '@/lib/mock-data/dashboard';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

// Single series — no legend needed (dataviz skill: "a single series needs no legend box").
// Thin columns, 4px rounded cap, direct label on the current (last) month only.
export function SalesTrendChart() {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(...SALES_TREND.map((point) => point.amount));

  return (
    <div className="border-border bg-card rounded-lg border p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-foreground text-sm font-semibold">Sales Trend</h2>
        <span className="text-muted-foreground text-xs">Last 12 Months</span>
      </div>

      <div className="relative flex h-48 items-end justify-between gap-2">
        {SALES_TREND.map((point, index) => {
          const isLast = index === SALES_TREND.length - 1;
          const percent = (point.amount / max) * 100;

          return (
            <div key={index} className="flex flex-1 flex-col items-center gap-2">
              <div className="relative h-40 w-full max-w-6">
                {(hovered === index || isLast) && (
                  <span
                    className="text-foreground absolute left-1/2 -translate-x-1/2 -translate-y-full text-xs font-medium whitespace-nowrap"
                    style={{ bottom: `${percent}%` }}
                  >
                    {formatCurrency(point.amount)}
                  </span>
                )}
                <button
                  type="button"
                  aria-label={`${point.month}: ${formatCurrency(point.amount)}`}
                  onMouseEnter={() => setHovered(index)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(index)}
                  onBlur={() => setHovered(null)}
                  className="bg-chart-1 absolute bottom-0 w-full rounded-t-[4px] transition-opacity hover:opacity-80"
                  style={{ height: `${percent}%` }}
                />
              </div>
              <span className="text-muted-foreground text-xs">{point.month}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
