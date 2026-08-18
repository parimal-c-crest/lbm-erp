'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { MOCK_GROUPS, MOCK_LOCATIONS, MOCK_ROLES } from '@/lib/mock-data/users';
import type { User } from '@/types/user';

// Shared Create/Edit form (`docs-kit/5-modules/users/9-ui.md` §4 User Create/Edit) — mock only,
// no real save endpoint yet (EPIC-005). Password complexity mirrors ADR-155 client-side (server
// re-enforces it once the real backend exists — this is UX-only validation, not the security
// boundary).

const passwordRule = z
  .string()
  .min(8, 'At least 8 characters')
  .regex(/[A-Z]/, 'At least 1 uppercase letter')
  .regex(/[a-z]/, 'At least 1 lowercase letter')
  .regex(/[0-9]/, 'At least 1 number');

const baseSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  username: z.string().min(1, 'Username is required'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  phone: z.string().min(1, 'Phone is required'),
  roleId: z.string().min(1, 'Role is required'),
  groupIds: z.array(z.string()),
  defaultLocation: z.string().min(1, 'Default location is required'),
  status: z.enum(['active', 'inactive']),
  // `UserPreference` fields (`4-schema.md` §3: "UI/calendar/POS/print display preferences") — not
  // 2FA, which is Admin-configured per-Role (ADR-075, `role_two_factor_requirements`), not per-User;
  // that setting belongs to Role administration (T-031), never this form.
  emailNotificationsEnabled: z.boolean(),
  password: z.string().optional(),
});

// Password is required only on create — enforced via `superRefine` (isEdit-dependent) rather
// than two structurally different schemas, so `useForm`'s value type stays a single shape.
function buildSchema(isEdit: boolean) {
  return baseSchema.superRefine((data, ctx) => {
    if (isEdit) {
      return;
    }
    const result = passwordRule.safeParse(data.password ?? '');
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({ ...issue, path: ['password'] });
      }
    }
  });
}

export type UserFormValues = z.infer<typeof baseSchema>;

export function UserForm({ user }: { user?: User }) {
  const router = useRouter();
  const isEdit = Boolean(user);
  const [showPassword, setShowPassword] = useState(false);
  const [showHrPrefs, setShowHrPrefs] = useState(false);

  const schema = useMemo(() => buildSchema(isEdit), [isEdit]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: user
      ? {
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          email: user.email,
          phone: user.phone,
          roleId: user.roleId,
          groupIds: user.groupIds,
          defaultLocation: user.defaultLocation,
          status: user.status,
          // Not modeled on the `User` fixture (a separate `UserPreference` entity, out of this
          // task's scope) — defaults on for every existing user rather than fabricating a value.
          emailNotificationsEnabled: true,
        }
      : { status: 'active', groupIds: [], emailNotificationsEnabled: true },
  });

  async function onSubmit() {
    // Mock only — no real save endpoint until EPIC-005 (Backend/API) wires this form to the
    // real API. Lands on Detail per the project convention (`4-ui/2-user-flows.md` §12).
    await new Promise((resolve) => setTimeout(resolve, 400));
    router.push(user ? `/users/${user.id}` : '/users');
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex w-full flex-col gap-6">
      <div
        className={isEdit ? undefined : 'grid grid-cols-1 items-start gap-6 lg:grid-cols-2'}
      >
        <fieldset className="border-border bg-card flex flex-col gap-4 rounded-lg border p-6">
          <legend className="text-foreground mb-1 text-sm font-semibold">Header</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField id="firstName" label="First Name" required error={errors.firstName?.message}>
              <input
                id="firstName"
                aria-required="true"
                aria-invalid={Boolean(errors.firstName)}
                disabled={isSubmitting}
                className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                {...register('firstName')}
              />
            </FormField>
            <FormField id="lastName" label="Last Name" required error={errors.lastName?.message}>
              <input
                id="lastName"
                aria-required="true"
                aria-invalid={Boolean(errors.lastName)}
                disabled={isSubmitting}
                className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                {...register('lastName')}
              />
            </FormField>
            <FormField id="username" label="Username" required error={errors.username?.message}>
              <input
                id="username"
                autoComplete="username"
                aria-required="true"
                aria-invalid={Boolean(errors.username)}
                disabled={isSubmitting}
                className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                {...register('username')}
              />
            </FormField>
            <FormField id="email" label="Email" required error={errors.email?.message}>
              <input
                id="email"
                type="email"
                aria-required="true"
                aria-invalid={Boolean(errors.email)}
                disabled={isSubmitting}
                className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                {...register('email')}
              />
            </FormField>
            <FormField id="phone" label="Phone" required error={errors.phone?.message}>
              <input
                id="phone"
                type="tel"
                aria-required="true"
                aria-invalid={Boolean(errors.phone)}
                disabled={isSubmitting}
                className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                {...register('phone')}
              />
            </FormField>
            <FormField id="status" label="Account Status" required>
              <select
                id="status"
                disabled={isSubmitting}
                className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
                {...register('status')}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </FormField>
          </div>
        </fieldset>

        {!isEdit && (
          <fieldset className="border-border bg-card flex flex-col gap-4 rounded-lg border p-6">
            <legend className="text-foreground mb-1 text-sm font-semibold">Password</legend>
            <FormField id="password" label="Password" required error={errors.password?.message}>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  aria-required="true"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby="password-hint"
                  disabled={isSubmitting}
                  className="border-border bg-background w-full rounded-md border px-3 py-2 pr-10 text-sm disabled:opacity-50"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" aria-hidden="true" />
                  ) : (
                    <Eye className="size-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              <p id="password-hint" className="text-muted-foreground text-xs">
                Min 8 characters, 1 uppercase, 1 lowercase, 1 number.
              </p>
            </FormField>
          </fieldset>
        )}
      </div>

      <fieldset className="border-border bg-card flex flex-col gap-4 rounded-lg border p-6">
        <legend className="text-foreground mb-1 text-sm font-semibold">Role &amp; Group</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField id="roleId" label="Role" required error={errors.roleId?.message}>
            <select
              id="roleId"
              aria-required="true"
              aria-invalid={Boolean(errors.roleId)}
              disabled={isSubmitting}
              defaultValue=""
              className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
              {...register('roleId')}
            >
              <option value="" disabled>
                Select a role…
              </option>
              {MOCK_ROLES.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            id="defaultLocation"
            label="Default Location"
            required
            error={errors.defaultLocation?.message}
          >
            <select
              id="defaultLocation"
              aria-required="true"
              disabled={isSubmitting}
              defaultValue=""
              className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
              {...register('defaultLocation')}
            >
              <option value="" disabled>
                Select a location…
              </option>
              {MOCK_LOCATIONS.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <fieldset>
          <legend className="text-foreground text-sm font-medium">Groups</legend>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {MOCK_GROUPS.map((group) => (
              <label key={group.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  value={group.id}
                  disabled={isSubmitting}
                  className="border-border size-4 rounded"
                  {...register('groupIds')}
                />
                {group.name}
              </label>
            ))}
          </div>
        </fieldset>
      </fieldset>

      <details
        className="border-border rounded-md border p-4"
        open={showHrPrefs}
        onToggle={(e) => setShowHrPrefs(e.currentTarget.open)}
      >
        <summary className="text-foreground cursor-pointer text-sm font-semibold">
          Preferences &amp; HR (rarely used)
        </summary>
        <div className="mt-4 flex flex-col gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              disabled={isSubmitting}
              className="border-border size-4 rounded"
              {...register('emailNotificationsEnabled')}
            />
            Email Notifications Enabled
          </label>
          <p className="text-muted-foreground text-xs">
            2FA requirement is set per Role, not per user — see Role administration.
          </p>
        </div>
      </details>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={isSubmitting}
          onClick={() => router.push(user ? `/users/${user.id}` : '/users')}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  );
}
