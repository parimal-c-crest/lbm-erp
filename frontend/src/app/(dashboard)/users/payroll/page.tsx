'use client';

import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { MOCK_TIME_CLOCK_RECORDS, MOCK_USERS } from '@/lib/mock-data/users';
import type { HoursType } from '@/types/user';

const HOURS_TYPES: HoursType[] = ['regular', 'holiday', 'personal', 'sick', 'vacation'];
const OVERTIME_THRESHOLD_HOURS = 40; // flat US 1.5x over 40hrs/week, ADR-036 — not tenant-configurable.

function hoursBetween(clockIn: string, clockOut: string) {
  return (new Date(clockOut).getTime() - new Date(clockIn).getTime()) / (1000 * 60 * 60);
}

// Payroll Report (`docs-kit/5-modules/users/9-ui.md` §4 Payroll Report) — date-range, on-screen
// only, CSV/ZIP export deferred past MVP (ADR-078). Hours computed fresh at render time (never
// cached, `2-functional-specification.md` FR-009). A period covering an unresolved/unclosed
// punch is flagged provisional — never silently computed as if the hours didn't exist (ADR-037).
export default function PayrollReportPage() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const rows = useMemo(() => {
    const rangeStart = new Date(startDate).getTime();
    const rangeEnd = new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1;

    return MOCK_USERS.map((user) => {
      const records = MOCK_TIME_CLOCK_RECORDS.filter((record) => {
        const punchTime = new Date(record.punchDate).getTime();
        return record.userId === user.id && punchTime >= rangeStart && punchTime <= rangeEnd;
      });

      const hoursByType: Record<HoursType, number> = {
        regular: 0,
        holiday: 0,
        personal: 0,
        sick: 0,
        vacation: 0,
      };
      let hasUnresolved = false;

      for (const record of records) {
        if (record.status === 'unclosed_needs_resolution' || !record.clockOut) {
          hasUnresolved = true;
          continue;
        }
        hoursByType[record.hoursType] += hoursBetween(record.clockIn, record.clockOut);
      }

      const regularHours = hoursByType.regular;
      const overtimeHours = Math.max(0, regularHours - OVERTIME_THRESHOLD_HOURS);
      const straightRegularHours = regularHours - overtimeHours;

      return { user, hoursByType, straightRegularHours, overtimeHours, hasUnresolved, hasRecords: records.length > 0 };
    }).filter((row) => row.hasRecords);
  }, [startDate, endDate]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-display text-foreground text-2xl font-bold">Payroll Report</h1>
        <p className="text-muted-foreground text-sm">
          On-screen only — CSV/ZIP export is deferred past MVP (ADR-078).
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          Start
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border-border bg-background rounded-md border px-3 py-2 text-sm"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          End
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border-border bg-background rounded-md border px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="border-border bg-card overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-border text-muted-foreground bg-accent/40 border-b">
              <th className="px-4 py-3 font-medium">User</th>
              {HOURS_TYPES.map((type) => (
                <th key={type} className="px-4 py-3 text-right font-medium capitalize">
                  {type}
                </th>
              ))}
              <th className="px-4 py-3 text-right font-medium">Overtime</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={HOURS_TYPES.length + 3} className="text-muted-foreground px-4 py-8 text-center">
                  No time-clock records in this date range.
                </td>
              </tr>
            ) : (
              rows.map(({ user, hoursByType, straightRegularHours, overtimeHours, hasUnresolved }) => (
                <tr key={user.id} className="border-border border-b last:border-0">
                  <td className="text-foreground px-4 py-3 font-medium">
                    {user.firstName} {user.lastName}
                  </td>
                  {HOURS_TYPES.map((type) => (
                    <td key={type} className="text-muted-foreground px-4 py-3 text-right">
                      {(type === 'regular' ? straightRegularHours : hoursByType[type]).toFixed(2)}
                    </td>
                  ))}
                  <td className="text-muted-foreground px-4 py-3 text-right">{overtimeHours.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    {hasUnresolved ? (
                      <Badge tone="error">Needs Resolution</Badge>
                    ) : (
                      <Badge tone="success">Complete</Badge>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
