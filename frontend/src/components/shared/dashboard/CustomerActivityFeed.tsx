import { Activity } from 'lucide-react';

import { CUSTOMER_ACTIVITY } from '@/lib/mock-data/dashboard';

export function CustomerActivityFeed() {
  return (
    <div className="border-border bg-card rounded-lg border p-4">
      <h2 className="text-foreground mb-4 text-sm font-semibold">Customer Activity</h2>
      <ul className="flex flex-col gap-3">
        {CUSTOMER_ACTIVITY.map((entry, index) => (
          <li key={index} className="flex items-start gap-3">
            <Activity className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p className="text-foreground flex-1 text-sm">{entry.text}</p>
            <span className="text-muted-foreground shrink-0 text-xs">{entry.time}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
