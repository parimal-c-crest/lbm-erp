'use client';

import { Clock } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';

type LaborStatus = 'working' | 'break' | 'lunch';

function formatElapsed(startedAt: number, now: number) {
  const totalSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Time Clock widget (`docs-kit/5-modules/users/9-ui.md` §4 Time Clock widget) — persistent
// clock-in/out state, own record only. Optional "what are you working on" task annotation on
// clock-in (`labor_status`: Working/Break/Lunch, ADR-077). Elapsed-time display uses
// `aria-live="polite"` (§9) so a screen-reader user is told their clocked-in status without
// re-polling. Mounted in `TopBar` — the one persistent-across-every-page location.
export function TimeClockWidget() {
  const [clockedInAt, setClockedInAt] = useState<number | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const [task, setTask] = useState('');
  const [laborStatus, setLaborStatus] = useState<LaborStatus>('working');

  useEffect(() => {
    if (clockedInAt === null) {return undefined;}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- ticking clock display, not derived render state
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [clockedInAt]);

  function handleClockIn() {
    // Mock only — real `POST /timeclock/clock-in` doesn't exist until EPIC-005.
    setClockedInAt(Date.now());
    setPromptOpen(false);
    setTask('');
    setLaborStatus('working');
  }

  function handleClockOut() {
    // Mock only — real `POST /timeclock/clock-out` doesn't exist until EPIC-005.
    setClockedInAt(null);
    setNow(null);
  }

  const isClockedIn = clockedInAt !== null;

  return (
    <>
      {isClockedIn ? (
        <button
          type="button"
          onClick={handleClockOut}
          className="border-success text-success hover:bg-success/10 flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium"
        >
          <Clock className="size-4" aria-hidden="true" />
          <span aria-live="polite">{now !== null ? formatElapsed(clockedInAt, now) : '00:00:00'} — Clock Out</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setPromptOpen(true)}
          className="border-border text-muted-foreground hover:bg-accent flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium"
        >
          <Clock className="size-4" aria-hidden="true" />
          Clock In
        </button>
      )}

      <Dialog open={promptOpen} onOpenChange={setPromptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>What are you working on?</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <FormField id="task-annotation" label="Task (optional)">
              <input
                id="task-annotation"
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="e.g. Receiving — PO-4821"
                className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
              />
            </FormField>
            <FormField id="labor-status" label="Status">
              <select
                id="labor-status"
                value={laborStatus}
                onChange={(e) => setLaborStatus(e.target.value as LaborStatus)}
                className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="working">Working</option>
                <option value="break">Break (paid)</option>
                <option value="lunch">Lunch (unpaid)</option>
              </select>
            </FormField>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setPromptOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleClockIn}>
              Clock In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
