'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { errorMessage } from '@/lib/api';
import { login, storeSession, verifyTwoFactor } from '@/lib/api/auth';

import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';

// Login (`docs-kit/5-modules/users/9-ui.md` §2/§4 Login, 2FA verification-code entry) — wired to
// the real `/auth/login` + `/auth/2fa/verify` endpoints (EPIC-005 backend, already built).
// Username, not Email (ADR-187 — this screen was originally built email-only, before ADR-187
// locked Username as the real login identifier; this is that follow-up). Barcode login has no
// real backend endpoint yet (`AuthService.login` only resolves by username) — left as a visibly
// disabled mode rather than silently wired to nothing, per FR-001's still-pending barcode
// resolution path.

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});
type LoginValues = z.infer<typeof loginSchema>;

const twoFactorSchema = z.object({ code: z.string().length(6, 'Enter the 6-digit code') });
type TwoFactorValues = z.infer<typeof twoFactorSchema>;

type Stage = 'credentials' | '2fa';

export default function LoginPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('credentials');
  const [mode, setMode] = useState<'password' | 'barcode'>('password');
  const [showPassword, setShowPassword] = useState(false);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);

  const passwordForm = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });
  const twoFactorForm = useForm<TwoFactorValues>({ resolver: zodResolver(twoFactorSchema) });

  async function onSubmitPassword(values: LoginValues) {
    try {
      const result = await login(values.username, values.password);
      if (result.requires2fa) {
        setChallengeToken(result.challengeToken);
        setStage('2fa');
        return;
      }
      storeSession(result);
      router.push('/dashboard');
    } catch (error) {
      // Generic — never distinguishes "wrong password" from "unknown user" (§6, credential
      // enumeration hardening; `AuthService.login`'s own `genericError()` already enforces this
      // server-side, this just surfaces whatever message it sent).
      passwordForm.setError('root', { message: errorMessage(error) });
    }
  }

  async function onSubmitTwoFactor(values: TwoFactorValues) {
    if (!challengeToken) {
      twoFactorForm.setError('root', { message: 'Session expired — log in again.' });
      setStage('credentials');
      return;
    }
    try {
      const tokens = await verifyTwoFactor(challengeToken, values.code);
      storeSession(tokens);
      router.push('/dashboard');
    } catch (error) {
      twoFactorForm.setError('root', { message: errorMessage(error) });
    }
  }

  if (stage === '2fa') {
    return (
      <div key="2fa" className="border-border bg-card w-full max-w-sm rounded-lg border p-8 shadow-sm">
        <h1 className="font-display text-foreground mb-2 text-xl font-bold">Verification Code</h1>
        <p className="text-muted-foreground mb-6 text-sm" aria-live="polite">
          We sent a 6-digit code to your email. It expires in 15 minutes.
        </p>
        <form
          onSubmit={twoFactorForm.handleSubmit(onSubmitTwoFactor)}
          noValidate
          className="flex flex-col gap-4"
        >
          <FormField id="2fa-code" label="Verification Code" required error={twoFactorForm.formState.errors.code?.message}>
            <input
              id="2fa-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
              aria-required="true"
              aria-invalid={Boolean(twoFactorForm.formState.errors.code)}
              disabled={twoFactorForm.formState.isSubmitting}
              className="border-border bg-background w-full rounded-md border px-3 py-2 text-center text-lg tracking-[0.5em] disabled:opacity-50"
              {...twoFactorForm.register('code')}
            />
          </FormField>

          {twoFactorForm.formState.errors.root && (
            <p role="alert" aria-live="polite" className="text-destructive text-sm">
              {twoFactorForm.formState.errors.root.message}
            </p>
          )}

          <Button type="submit" disabled={twoFactorForm.formState.isSubmitting} className="mt-2">
            {twoFactorForm.formState.isSubmitting ? 'Verifying…' : 'Verify'}
          </Button>
          <button
            type="button"
            onClick={() => setStage('credentials')}
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            Back to login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div key="credentials" className="border-border bg-card w-full max-w-sm rounded-lg border p-8 shadow-sm">
      <h1 className="font-display text-foreground mb-2 text-xl font-bold">LBM ERP</h1>

      <div className="mb-6 flex gap-1 text-sm" role="tablist" aria-label="Login method">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'password'}
          onClick={() => setMode('password')}
          className={`rounded-md px-3 py-1.5 font-medium ${mode === 'password' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}`}
        >
          Username &amp; Password
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'barcode'}
          onClick={() => setMode('barcode')}
          className={`rounded-md px-3 py-1.5 font-medium ${mode === 'barcode' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}`}
        >
          Badge / Barcode
        </button>
      </div>

      {mode === 'password' ? (
        <form key="password" onSubmit={passwordForm.handleSubmit(onSubmitPassword)} noValidate className="flex flex-col gap-4">
          <FormField id="username" label="Username" required error={passwordForm.formState.errors.username?.message}>
            <input
              id="username"
              autoComplete="username"
              autoFocus
              aria-required="true"
              aria-invalid={Boolean(passwordForm.formState.errors.username)}
              disabled={passwordForm.formState.isSubmitting}
              className="border-border bg-background w-full rounded-md border px-3 py-2 text-sm disabled:opacity-50"
              {...passwordForm.register('username')}
            />
          </FormField>

          <FormField id="password" label="Password" required error={passwordForm.formState.errors.password?.message}>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                aria-required="true"
                aria-invalid={Boolean(passwordForm.formState.errors.password)}
                disabled={passwordForm.formState.isSubmitting}
                className="border-border bg-background w-full rounded-md border px-3 py-2 pr-10 text-sm disabled:opacity-50"
                {...passwordForm.register('password')}
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
          </FormField>

          {passwordForm.formState.errors.root && (
            <p role="alert" aria-live="polite" className="text-destructive text-sm">
              {passwordForm.formState.errors.root.message}
            </p>
          )}

          <Button type="submit" disabled={passwordForm.formState.isSubmitting} className="mt-2">
            {passwordForm.formState.isSubmitting ? 'Logging in…' : 'Log In'}
          </Button>
        </form>
      ) : (
        <div className="text-muted-foreground flex flex-col gap-4 text-sm">
          <p role="status">
            Badge/barcode login isn&apos;t available yet — the backend only supports Username &amp;
            Password right now. Use that tab instead.
          </p>
        </div>
      )}
    </div>
  );
}
