'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { MOCK_TIME_CLOCK_RECORDS, MOCK_USERS, overrideTimeClockRecord } from '@/lib/mock-data/users';
import type { TimeClockRecord } from '@/types/user';

function userLabel(userId: string) {
  const user = MOCK_USERS.find((candidate) => candidate.id === userId);
  return user ? `${user.firstName} ${user.lastName}` : 'Unknown';
}

function toLocalInputValue(iso: string | null) {
  if (!iso) {return '';}
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

// Time-Card override (`docs-kit/5-modules/users/9-ui.md` §2 Time-Card override) — Admin/manager
// correction screen. Any record covering an unresolved punch shows a "Needs Resolution" badge
// (ADR-037) — never silently computed as if the hours didn't exist.
export default function TimeCardOverridePage() {
  const [records, setRecords] = useState(MOCK_TIME_CLOCK_RECORDS);
  const [editing, setEditing] = useState<TimeClockRecord | null>(null);

  function refresh() {
    setRecords([...MOCK_TIME_CLOCK_RECORDS]);
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <Link href="/users" className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Users
      </Link>
      <div>
        <h1 className="font-display text-foreground text-2xl font-bold">Time-Card Override</h1>
        <p className="text-muted-foreground text-sm">
          Admin/manager correction of clock-in/out timestamps. Concurrent edits are locked
          (ADR-079/080/084) — not modeled in this mock, real locking lands with EPIC-005.
        </p>
      </div>

      <div className="border-border bg-card overflow-hidden rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-border text-muted-foreground bg-accent/40 border-b">
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Punch Date</th>
              <th className="px-4 py-3 font-medium">Clock In</th>
              <th className="px-4 py-3 font-medium">Clock Out</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id} className="border-border border-b last:border-0">
                <td className="text-foreground px-4 py-3 font-medium">{userLabel(record.userId)}</td>
                <td className="text-muted-foreground px-4 py-3">{new Date(record.punchDate).toLocaleDateString('en-US')}</td>
                <td className="text-muted-foreground px-4 py-3">{new Date(record.clockIn).toLocaleTimeString('en-US')}</td>
                <td className="text-muted-foreground px-4 py-3">
                  {record.clockOut ? new Date(record.clockOut).toLocaleTimeString('en-US') : '—'}
                </td>
                <td className="px-4 py-3">
                  {record.status === 'unclosed_needs_resolution' ? (
                    <Badge tone="error">Needs Resolution</Badge>
                  ) : (
                    <Badge tone="success">Closed</Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => setEditing(record)}
                    className="text-primary text-sm font-medium hover:underline"
                  >
                    Override
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <OverrideDialog
          record={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            refresh();
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function OverrideDialog({
  record,
  onClose,
  onSaved,
}: {
  record: TimeClockRecord;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [clockIn, setClockIn] = useState(toLocalInputValue(record.clockIn));
  const [clockOut, setClockOut] = useState(toLocalInputValue(record.clockOut));
  const [error, setError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSave() {
    const clockInDate = new Date(clockIn);
    const clockOutDate = new Date(clockOut);
    if (!clockIn || !clockOut || Number.isNaN(clockInDate.getTime()) || Number.isNaN(clockOutDate.getTime())) {
      setError('Enter a valid clock-in and clock-out date/time.');
      return;
    }

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 200));
    const result = overrideTimeClockRecord(record.id, {
      clockIn: clockInDate.toISOString(),
      clockOut: clockOutDate.toISOString(),
    });
    setIsSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSaved();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Override — {userLabel(record.userId)}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <FormField id="override-clock-in" label="Clock In" required>
            <input
              id="override-clock-in"
              type="datetime-local"
              value={clockIn}
              onChange={(e) => setClockIn(e.target.value)}
              disabled={isSubmitting}
              className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
            />
          </FormField>
          <FormField id="override-clock-out" label="Clock Out" required error={error}>
            <input
              id="override-clock-out"
              type="datetime-local"
              value={clockOut}
              onChange={(e) => setClockOut(e.target.value)}
              disabled={isSubmitting}
              className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
            />
          </FormField>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" disabled={isSubmitting} onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={isSubmitting} onClick={handleSave}>
            {isSubmitting ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
