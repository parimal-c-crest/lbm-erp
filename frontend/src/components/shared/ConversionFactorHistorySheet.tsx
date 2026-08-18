'use client';

import { useEffect, useState } from 'react';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { errorMessage, getFactorHistory } from '@/lib/api/uom';
import type { UOMTypeFactorHistoryEntry } from '@/types/uom';

// Conversion Factor History panel (`docs-kit/5-modules/uom/9-ui.md` §4 Conversion Factor History
// panel) — Sheet opened via "View History" next to a Conversion Factor row. Rate / Effective From
// / Effective To (or "Current"), read-only, system-generated only (`5-data-dictionary.md` §2) —
// no edit affordance. Wired to the real backend (EPIC-011, T-076).
export function ConversionFactorHistorySheet({
  open,
  onOpenChange,
  groupId,
  typeId,
  typeName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  typeId: string;
  typeName: string;
}) {
  const [entries, setEntries] = useState<UOMTypeFactorHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {return;}
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch when the sheet opens
    setLoading(true);
    setLoadError(null);
    getFactorHistory(groupId, typeId)
      .then((rows) => {
        if (!cancelled) {setEntries(rows);}
      })
      .catch((error: unknown) => {
        // 404 "no history exists for this pair" is expected for a brand-new factor, not an error.
        if (!cancelled) {
          setEntries([]);
          const message = errorMessage(error);
          if (!/no factor history/i.test(message)) {setLoadError(message);}
        }
      })
      .finally(() => {
        if (!cancelled) {setLoading(false);}
      });
    return () => {
      cancelled = true;
    };
  }, [open, groupId, typeId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Conversion Factor History — {typeName}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-3 overflow-y-auto p-4">
          {loadError && (
            <p role="alert" className="text-destructive text-sm">
              {loadError}
            </p>
          )}
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : entries.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No prior rate changes recorded for this unit.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-border text-muted-foreground border-b">
                  <th className="py-2 pr-2 font-medium">Rate</th>
                  <th className="py-2 pr-2 font-medium">Effective From</th>
                  <th className="py-2 font-medium">Effective To</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-border border-b last:border-0">
                    <td className="text-foreground py-2 pr-2">{Number(entry.rate)}</td>
                    <td className="text-muted-foreground py-2 pr-2">{String(entry.effectiveFrom).slice(0, 10)}</td>
                    <td className="text-muted-foreground py-2">
                      {entry.effectiveTo ? String(entry.effectiveTo).slice(0, 10) : 'Current'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
