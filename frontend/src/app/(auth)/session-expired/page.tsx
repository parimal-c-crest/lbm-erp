import { Clock } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

// Nav doc §5 Session Expired flow / §15: triggered on a 401 where token refresh also fails.
// Static screen only for this milestone — no real refresh-token interceptor exists yet (auth is
// mock, T-016); wiring the actual trigger belongs to the Users module's real auth (M3).
export default function SessionExpiredPage() {
  return (
    <div className="border-border bg-card flex w-full max-w-sm flex-col items-center gap-4 rounded-lg border p-8 text-center shadow-sm">
      <Clock className="text-muted-foreground size-10" aria-hidden="true" />
      <h1 className="font-display text-foreground text-xl font-bold">Session expired</h1>
      <p className="text-muted-foreground text-sm">
        Your session has expired. Please log in again to continue.
      </p>
      <Button asChild className="mt-2">
        <Link href="/login">Log In</Link>
      </Button>
    </div>
  );
}
