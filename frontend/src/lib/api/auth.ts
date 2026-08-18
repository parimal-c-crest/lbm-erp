import { apiFetch, clearAuthToken, setDevToken } from '@/lib/api';

// Real auth client (`docs-kit/5-modules/users/8-api.md` §3) — `/auth/login`, `/auth/2fa/verify`.
// `X-Tenant-Subdomain: demo` is hardcoded the same way `lib/api/uom.ts` does — real tenant
// resolution (subdomain routing) is a separate, not-yet-built concern; local dev always targets
// the seeded `demo` tenant.

function headers(): HeadersInit {
  return { 'X-Tenant-Subdomain': 'demo' };
}

export type LoginResult =
  | { requires2fa: true; challengeToken: string }
  | { requires2fa?: false; accessToken: string; refreshToken: string };

export function login(username: string, password: string) {
  return apiFetch<LoginResult>('/auth/login', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ username, password }),
  });
}

export function verifyTwoFactor(challengeToken: string, code: string) {
  return apiFetch<{ accessToken: string; refreshToken: string }>('/auth/2fa/verify', {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ challengeToken, code }),
  });
}

/** Stores the access token so every subsequent `apiFetch` call authenticates as this user. */
export function storeSession(tokens: { accessToken: string }) {
  setDevToken(tokens.accessToken);
}

/**
 * Stateless JWT bearer auth — `POST /auth/logout` has nothing server-side to invalidate
 * (`auth.controller.ts`'s own comment), it's called for completeness/future session tracking, not
 * because clearing the local token depends on it. Best-effort: clear the local token regardless of
 * whether the network call succeeds (an expired/already-invalid token shouldn't block logout).
 */
export async function logout() {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } finally {
    clearAuthToken();
  }
}
