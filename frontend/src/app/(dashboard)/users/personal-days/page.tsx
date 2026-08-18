'use client';

import { useMemo, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { addPersonalDayRequest, MOCK_PERSONAL_DAYS, MOCK_USERS } from '@/lib/mock-data/users';
import type { PersonalDayHoursType } from '@/types/user';

const CURRENT_USER_ID = MOCK_USERS[0]?.id ?? '';

function userLabel(userId: string) {
  const user = MOCK_USERS.find((candidate) => candidate.id === userId);
  return user ? `${user.firstName} ${user.lastName}` : 'Unknown';
}

// Personal Day / Time Off submission + admin Personal-Days listing
// (`docs-kit/5-modules/users/9-ui.md` §2) — two form shapes sharing one entity: whole-day-count
// vs. start/end-time-of-day (FR-010).
export default function PersonalDaysPage() {
  const [requests, setRequests] = useState(MOCK_PERSONAL_DAYS);
  const [shape, setShape] = useState<'day-count' | 'time-range'>('day-count');
  const [hoursType, setHoursType] = useState<PersonalDayHoursType>('vacation');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dayCount, setDayCount] = useState(1);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [note, setNote] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();

  const filteredRequests = useMemo(
    () => requests.filter((request) => userFilter === '' || request.userId === userFilter),
    [requests, userFilter],
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!startDate) {
      setFormError('Start date is required.');
      return;
    }
    setFormError(undefined);
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 300));

    addPersonalDayRequest({
      userId: CURRENT_USER_ID,
      shape,
      hoursType,
      startDate,
      endDate: shape === 'day-count' ? endDate || startDate : null,
      dayCount: shape === 'day-count' ? dayCount : null,
      startTime: shape === 'time-range' ? startTime : null,
      endTime: shape === 'time-range' ? endTime : null,
      note,
    });
    setRequests([...MOCK_PERSONAL_DAYS]);
    setIsSubmitting(false);
    setStartDate('');
    setEndDate('');
    setNote('');
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-display text-foreground text-2xl font-bold">Personal Days &amp; Time Off</h1>
        <p className="text-muted-foreground text-sm">Submit a request, or review the org&apos;s requests below.</p>
      </div>

      <div className="border-border bg-card max-w-xl rounded-lg border p-6">
        <h2 className="text-foreground mb-4 text-sm font-semibold">Submit a Request</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex gap-1 text-sm" role="tablist" aria-label="Request shape">
            <button
              type="button"
              role="tab"
              aria-selected={shape === 'day-count'}
              onClick={() => setShape('day-count')}
              className={`rounded-md px-3 py-1.5 font-medium ${shape === 'day-count' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}`}
            >
              Whole Day(s)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={shape === 'time-range'}
              onClick={() => setShape('time-range')}
              className={`rounded-md px-3 py-1.5 font-medium ${shape === 'time-range' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}`}
            >
              Partial Day (Hours)
            </button>
          </div>

          <FormField id="hours-type" label="Type" required>
            <select
              id="hours-type"
              value={hoursType}
              onChange={(e) => setHoursType(e.target.value as PersonalDayHoursType)}
              disabled={isSubmitting}
              className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
            >
              <option value="vacation">Vacation</option>
              <option value="personal">Personal</option>
              <option value="sick">Sick</option>
            </select>
          </FormField>

          {shape === 'day-count' ? (
            <div className="grid grid-cols-2 gap-4">
              <FormField id="start-date" label="Start Date" required error={formError}>
                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={isSubmitting}
                  className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                />
              </FormField>
              <FormField id="end-date" label="End Date">
                <input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={isSubmitting}
                  className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                />
              </FormField>
              <FormField id="day-count" label="Number of Days">
                <input
                  id="day-count"
                  type="number"
                  min={1}
                  value={dayCount}
                  onChange={(e) => setDayCount(Number(e.target.value))}
                  disabled={isSubmitting}
                  className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                />
              </FormField>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <FormField id="single-date" label="Date" required error={formError}>
                <input
                  id="single-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={isSubmitting}
                  className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                />
              </FormField>
              <FormField id="start-time" label="Start Time">
                <input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={isSubmitting}
                  className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                />
              </FormField>
              <FormField id="end-time" label="End Time">
                <input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={isSubmitting}
                  className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                />
              </FormField>
            </div>
          )}

          <FormField id="note" label="Note (optional)">
            <input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isSubmitting}
              className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
            />
          </FormField>

          <Button type="submit" disabled={isSubmitting} className="self-start">
            {isSubmitting ? 'Submitting…' : 'Submit Request'}
          </Button>
        </form>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-foreground text-sm font-semibold">All Requests (Admin)</h2>
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="border-border bg-background rounded-md border px-3 py-2 text-sm"
            aria-label="Filter by user"
          >
            <option value="">All Users</option>
            {MOCK_USERS.map((user) => (
              <option key={user.id} value={user.id}>
                {user.firstName} {user.lastName}
              </option>
            ))}
          </select>
        </div>
        <div className="border-border bg-card overflow-hidden rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-border text-muted-foreground bg-accent/40 border-b">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((request) => (
                <tr key={request.id} className="border-border border-b last:border-0">
                  <td className="text-foreground px-4 py-3 font-medium">{userLabel(request.userId)}</td>
                  <td className="text-muted-foreground px-4 py-3 capitalize">{request.hoursType}</td>
                  <td className="text-muted-foreground px-4 py-3">
                    {request.shape === 'day-count'
                      ? `${request.startDate} → ${request.endDate} (${request.dayCount}d)`
                      : `${request.startDate}, ${request.startTime}–${request.endTime}`}
                  </td>
                  <td className="text-muted-foreground px-4 py-3">{request.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
