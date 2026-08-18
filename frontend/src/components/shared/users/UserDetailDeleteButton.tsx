'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { TransferTargetPicker } from '@/components/shared/TransferTargetPicker';
import { Button } from '@/components/ui/button';
import { MOCK_USERS, removeMockUser } from '@/lib/mock-data/users';
import type { User } from '@/types/user';

// Detail page's own Delete action (T-030) — the Detail page itself is a Server Component
// (reads `params`), so the interactive transfer-target flow lives in this small client child
// instead of converting the whole page to a Client Component.
export function UserDetailDeleteButton({ user }: { user: User }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const candidates = useMemo(
    () =>
      MOCK_USERS.filter((candidate) => candidate.id !== user.id).map((candidate) => ({
        id: candidate.id,
        label: `${candidate.firstName} ${candidate.lastName} (@${candidate.username})`,
      })),
    [user.id],
  );

  function handleConfirm() {
    removeMockUser(user.id);
    router.push('/users');
  }

  return (
    <>
      <Button type="button" variant="destructive" size="sm" onClick={() => setOpen(true)}>
        Delete
      </Button>
      <TransferTargetPicker
        open={open}
        onOpenChange={setOpen}
        entityLabel="user"
        itemName={`${user.firstName} ${user.lastName}`}
        candidates={candidates}
        onConfirm={handleConfirm}
      />
    </>
  );
}
