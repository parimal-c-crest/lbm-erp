'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';

interface FanoutResult {
  subdomain: string;
  type: string;
  status: 'ok' | 'failed';
  error?: string;
}

const TYPE_OPTIONS = ['all', 'testing', 'demo', 'live'] as const;

// Migration fanout trigger (design doc §6/§8) — POST /skeleton/tenants/migrate-fanout.
// Staged testing -> demo -> live, halts on first failure (same as the CLI script it wraps).
export default function MigrateFanoutPage() {
  const [typeFilter, setTypeFilter] = useState<(typeof TYPE_OPTIONS)[number]>('all');
  const [results, setResults] = useState<FanoutResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function handleRun() {
    setRunning(true);
    setError(null);
    setResults(null);
    try {
      const query = typeFilter === 'all' ? '' : `?type=${typeFilter}`;
      const data = await apiFetch<FanoutResult[]>(`/skeleton/tenants/migrate-fanout${query}`, {
        method: 'POST',
      });
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Migration fanout</h1>
      <p className="text-muted-foreground text-sm">
        Applies the current migration history to skeleton, then every tenant — staged
        testing → demo → live. Halts on first failure.
      </p>

      <div className="flex items-center gap-3">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as (typeof TYPE_OPTIONS)[number])}
          className="border-border rounded-md border px-3 py-2 text-sm"
        >
          {TYPE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <Button onClick={handleRun} disabled={running}>
          {running ? 'Running…' : 'Run migration fanout'}
        </Button>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {results && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-border border-b">
              <th className="py-2">Subdomain</th>
              <th className="py-2">Type</th>
              <th className="py-2">Status</th>
              <th className="py-2">Error</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <tr key={result.subdomain} className="border-border border-b">
                <td className="py-2">{result.subdomain}</td>
                <td className="py-2">{result.type}</td>
                <td className={result.status === 'ok' ? 'py-2 text-green-600' : 'py-2 text-destructive'}>
                  {result.status}
                </td>
                <td className="py-2">{result.error ?? '—'}</td>
              </tr>
            ))}
            {results.length === 0 && (
              <tr>
                <td colSpan={4} className="text-muted-foreground py-4">
                  No tenants matched this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
