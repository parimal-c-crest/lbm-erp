'use client';

import { useState } from 'react';

import { ChangePasswordModal } from '@/components/shared/ChangePasswordModal';
import { Button } from '@/components/ui/button';
import type { User } from '@/types/user';

// Admin-reset variant of Change Password (`9-ui.md` §4), triggered from User Detail — the
// Detail page is a Server Component, so this small client child hosts the modal, same pattern as
// `UserDetailDeleteButton` (T-030).
export function ResetPasswordButton({ user }: { user: User }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Reset Password
      </Button>
      <ChangePasswordModal
        open={open}
        onOpenChange={setOpen}
        mode="admin-reset"
        subjectName={`${user.firstName} ${user.lastName}`}
      />
    </>
  );
}
