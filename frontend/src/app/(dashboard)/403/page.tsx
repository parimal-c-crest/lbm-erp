import { Lock } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

// Nav doc §11/§15: server-side Guard rejection, not a client-side check — the sidebar menu item
// that led here was only a convenience, never the real boundary. Kept inside the dashboard shell
// (unlike 404/session-expired) since the user is still authenticated, just lacks permission for
// this one thing, and may want to navigate elsewhere.
export default function ForbiddenPage() {
  return (
    <div className="flex min-h-[60svh] items-center justify-center p-4">
      <div className="border-border bg-card flex w-full max-w-sm flex-col items-center gap-4 rounded-lg border p-8 text-center shadow-sm">
        <Lock className="text-destructive size-10" aria-hidden="true" />
        <h1 className="font-display text-foreground text-xl font-bold">Access denied</h1>
        <p className="text-muted-foreground text-sm">
          You don&apos;t have permission to access this page.
        </p>
        <Button asChild className="mt-2">
          <Link href="/dashboard">Return to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
