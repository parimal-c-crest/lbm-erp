'use client';

import { AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

// Next.js special file — client-side error boundary for the whole app segment. Nav doc §11
// "System Error" flow: friendly message only, no raw stack trace/error code shown to the user;
// `reset()` is the Retry action.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="bg-background flex min-h-svh items-center justify-center p-4">
      <div className="border-border bg-card flex w-full max-w-sm flex-col items-center gap-4 rounded-lg border p-8 text-center shadow-sm">
        <AlertTriangle className="text-destructive size-10" aria-hidden="true" />
        <h1 className="font-display text-foreground text-xl font-bold">Something went wrong</h1>
        <p className="text-muted-foreground text-sm">
          An unexpected error occurred. Please try again.
        </p>
        <Button onClick={reset} className="mt-2">
          Try Again
        </Button>
      </div>
    </div>
  );
}
