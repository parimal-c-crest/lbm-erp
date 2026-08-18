'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';

interface JobSchedule {
  id: string;
  jobDefinitionId: string;
  tenantSubdomain: string;
  enabled: boolean;
  offsetMinutes: number;
}

interface JobDefinition {
  id: string;
  name: string;
  baseHour: number;
  baseMinute: number;
  masterEnabled: boolean;
  schedules: JobSchedule[];
}

interface JobRun {
  id: string;
  jobDefinitionId: string;
  tenantSubdomain: string;
  status: 'running' | 'success' | 'failure' | 'timeout';
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
}

const RUN_STATUS_OPTIONS = ['all', 'running', 'success', 'failure', 'timeout'] as const;

// Cron/job management (design doc §7/§8) — list + master/per-tenant toggles + filterable run
// history. GET/PATCH /skeleton/jobs, GET /skeleton/jobs/runs.
export default function JobsPage() {
  const [jobs, setJobs] = useState<JobDefinition[] | null>(null);
  const [runs, setRuns] = useState<JobRun[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<(typeof RUN_STATUS_OPTIONS)[number]>('all');
  const [error, setError] = useState<string | null>(null);

  async function loadJobs() {
    const data = await apiFetch<JobDefinition[]>('/skeleton/jobs');
    setJobs(data);
  }

  async function loadRuns() {
    const query = statusFilter === 'all' ? '' : `?status=${statusFilter}`;
    const data = await apiFetch<JobRun[]>(`/skeleton/jobs/runs${query}`);
    setRuns(data);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount/filter change
    Promise.all([loadJobs(), loadRuns()]).catch((err: unknown) =>
      setError(err instanceof Error ? err.message : String(err)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function toggleMaster(job: JobDefinition) {
    await apiFetch(`/skeleton/jobs/${job.id}/master`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled: !job.masterEnabled }),
    });
    await loadJobs();
  }

  async function toggleSchedule(schedule: JobSchedule) {
    await apiFetch(`/skeleton/jobs/schedules/${schedule.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled: !schedule.enabled }),
    });
    await loadJobs();
  }

  return (
    <div className="flex flex-col gap-8">
      {error && <p className="text-destructive text-sm">{error}</p>}

      <section>
        <h1 className="mb-4 text-xl font-bold">Jobs</h1>
        <div className="flex flex-col gap-4">
          {jobs?.map((job) => (
            <div key={job.id} className="border-border rounded-md border p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {job.name} ({String(job.baseHour).padStart(2, '0')}:
                  {String(job.baseMinute).padStart(2, '0')} UTC base)
                </span>
                <Button size="sm" variant={job.masterEnabled ? 'secondary' : 'primary'} onClick={() => toggleMaster(job)}>
                  {job.masterEnabled ? 'Disable (master)' : 'Enable (master)'}
                </Button>
              </div>
              <ul className="mt-3 flex flex-col gap-1">
                {job.schedules.map((schedule) => (
                  <li key={schedule.id} className="flex items-center justify-between text-sm">
                    <span>
                      {schedule.tenantSubdomain} — offset {schedule.offsetMinutes}m
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => toggleSchedule(schedule)}>
                      {schedule.enabled ? 'Disable' : 'Enable'}
                    </Button>
                  </li>
                ))}
                {job.schedules.length === 0 && (
                  <li className="text-muted-foreground text-sm">No per-tenant schedules.</li>
                )}
              </ul>
            </div>
          ))}
          {jobs && jobs.length === 0 && (
            <p className="text-muted-foreground text-sm">No job definitions yet.</p>
          )}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Run history</h2>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as (typeof RUN_STATUS_OPTIONS)[number])}
            className="border-border rounded-md border px-3 py-2 text-sm"
          >
            {RUN_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-border border-b">
              <th className="py-2">Tenant</th>
              <th className="py-2">Status</th>
              <th className="py-2">Started</th>
              <th className="py-2">Duration</th>
            </tr>
          </thead>
          <tbody>
            {runs?.map((run) => (
              <tr key={run.id} className="border-border border-b">
                <td className="py-2">{run.tenantSubdomain}</td>
                <td className="py-2">{run.status}</td>
                <td className="py-2">{new Date(run.startedAt).toLocaleString()}</td>
                <td className="py-2">{run.durationMs ? `${run.durationMs}ms` : '—'}</td>
              </tr>
            ))}
            {runs && runs.length === 0 && (
              <tr>
                <td colSpan={4} className="text-muted-foreground py-4">
                  No runs recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
