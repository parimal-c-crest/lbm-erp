'use client';

import { FileQuestion } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';

// Next.js special file — auto-renders for any unmatched route (nav doc §15 "404 Page Not Found"
// and "Invalid Route" both map here). Outside the dashboard shell since the route itself is
// unrecognized — no sidebar context to show.
export default function NotFound() {
  const router = useRouter();

  return (
    <div className="bg-background flex min-h-svh items-center justify-center p-4">
      <div className="border-border bg-card flex w-full max-w-sm flex-col items-center gap-4 rounded-lg border p-8 text-center shadow-sm">
        <FileQuestion className="text-muted-foreground size-10" aria-hidden="true" />
        <h1 className="font-display text-foreground text-xl font-bold">Page not found</h1>
        <p className="text-muted-foreground text-sm">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>
        <div className="mt-2 flex gap-3">
          <Button variant="ghost" onClick={() => router.back()}>
            Previous Page
          </Button>
          <Button asChild>
            <Link href="/dashboard">Return to Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
