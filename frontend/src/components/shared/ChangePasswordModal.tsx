'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';

// Change Password (`docs-kit/5-modules/users/9-ui.md` §4 Change Password) — self-service
// (old-password re-verified) and admin-reset (no old password required) variants share this one
// modal, collapsed into one command per FR-007 (closes the legacy system's two divergent,
// differently-argument-ordered password-change paths, USR-RULE-009/010).
const passwordRule = z
  .string()
  .min(8, 'At least 8 characters')
  .regex(/[A-Z]/, 'At least 1 uppercase letter')
  .regex(/[a-z]/, 'At least 1 lowercase letter')
  .regex(/[0-9]/, 'At least 1 number');

function buildSchema(requireOldPassword: boolean) {
  return z
    .object({
      oldPassword: requireOldPassword ? z.string().min(1, 'Current password is required') : z.string().optional(),
      newPassword: passwordRule,
      confirmPassword: z.string().min(1, 'Confirm your new password'),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    });
}

type ChangePasswordValues = z.infer<ReturnType<typeof buildSchema>>;

export function ChangePasswordModal({
  open,
  onOpenChange,
  mode,
  subjectName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'self-service' | 'admin-reset';
  /** Whose password this is, for admin-reset's dialog copy — omitted for self-service. */
  subjectName?: string;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isSelfService = mode === 'self-service';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({ resolver: zodResolver(buildSchema(isSelfService)) });

  async function onSubmit() {
    // Mock only — real change/reset endpoint (`POST /users/me/password` /
    // `POST /users/{id}/password-reset`) doesn't exist until EPIC-005.
    await new Promise((resolve) => setTimeout(resolve, 400));
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {reset();}
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isSelfService ? 'Change Password' : `Reset Password — ${subjectName}`}</DialogTitle>
          <DialogDescription>
            {isSelfService
              ? 'Enter your current password and choose a new one.'
              : 'Set a new password for this user. They are not required to confirm their old one.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          {isSelfService && (
            <FormField id="oldPassword" label="Current Password" required error={errors.oldPassword?.message}>
              <input
                id="oldPassword"
                type="password"
                autoComplete="current-password"
                aria-required="true"
                aria-invalid={Boolean(errors.oldPassword)}
                disabled={isSubmitting}
                className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                {...register('oldPassword')}
              />
            </FormField>
          )}

          <FormField id="newPassword" label="New Password" required error={errors.newPassword?.message}>
            <div className="relative">
              <input
                id="newPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                aria-required="true"
                aria-invalid={Boolean(errors.newPassword)}
                aria-describedby="new-password-hint"
                disabled={isSubmitting}
                className="border-border bg-background w-full rounded-md border px-3 py-2 pr-10 text-sm disabled:opacity-50"
                {...register('newPassword')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
              >
                {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
              </button>
            </div>
            <p id="new-password-hint" className="text-muted-foreground text-xs">
              Min 8 characters, 1 uppercase, 1 lowercase, 1 number.
            </p>
          </FormField>

          <FormField id="confirmPassword" label="Confirm New Password" required error={errors.confirmPassword?.message}>
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              aria-required="true"
              aria-invalid={Boolean(errors.confirmPassword)}
              disabled={isSubmitting}
              className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
              {...register('confirmPassword')}
            />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="secondary" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
