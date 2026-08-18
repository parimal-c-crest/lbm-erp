'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Shared delete-confirmation flow (`docs-kit/5-modules/users/3-business-rules.md` BR-001,
// `9-ui.md` §4 "Delete confirmation") — the transfer-target-required popup step is itself the
// confirmation for every User/Role/Profile/Group delete (`9-ui.md` §11), not a separate generic
// "Are you sure?" modal layered on top. One component, reused by Role/Profile/Group deletes
// (T-031/T-032/T-033) rather than four near-duplicates, per BR-001's identical shared contract.
export interface TransferTargetCandidate {
  id: string;
  label: string;
}

export function TransferTargetPicker({
  open,
  onOpenChange,
  entityLabel,
  itemName,
  candidates,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** e.g. "user", "role", "profile", "group" — used in the dialog copy. */
  entityLabel: string;
  /** Display name of the record being deleted. */
  itemName: string;
  /** Every other record of the same type this one's dependents can be reassigned to. */
  candidates: TransferTargetCandidate[];
  onConfirm: (transferTargetId: string) => Promise<void> | void;
}) {
  const [transferTargetId, setTransferTargetId] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleConfirm() {
    if (!transferTargetId) {return;}
    setIsDeleting(true);
    try {
      await onConfirm(transferTargetId);
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
      setTransferTargetId('');
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isDeleting) {
          onOpenChange(next);
          setTransferTargetId('');
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {itemName}?</DialogTitle>
          <DialogDescription>
            Choose who owned/assigned records currently tied to this {entityLabel} should transfer
            to. This can&apos;t be undone (BR-001).
          </DialogDescription>
        </DialogHeader>

        {candidates.length === 0 ? (
          <p role="alert" className="text-destructive text-sm">
            No other {entityLabel}s exist to transfer to — create one first, or this delete can&apos;t
            proceed.
          </p>
        ) : (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-foreground font-medium">
              Transfer to <span aria-hidden="true" className="text-destructive">*</span>
            </span>
            <select
              value={transferTargetId}
              onChange={(e) => setTransferTargetId(e.target.value)}
              disabled={isDeleting}
              className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
              aria-label={`Transfer target ${entityLabel}`}
            >
              <option value="" disabled>
                Select a {entityLabel}…
              </option>
              {candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <DialogFooter>
          <Button type="button" variant="secondary" disabled={isDeleting} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!transferTargetId || isDeleting || candidates.length === 0}
            onClick={handleConfirm}
          >
            {isDeleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
