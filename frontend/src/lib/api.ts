const DEV_TOKEN_STORAGE_KEY = 'skeleton:dev-token';

export function getDevToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage.getItem(DEV_TOKEN_STORAGE_KEY);
}

export function setDevToken(token: string) {
  window.localStorage.setItem(DEV_TOKEN_STORAGE_KEY, token);
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export function clearAuthToken() {
  window.localStorage.removeItem(DEV_TOKEN_STORAGE_KEY);
}

// Thin fetch wrapper, shared by every real API client (`lib/api/*.ts`). Storage key/name predate
// real login (T-027's skeleton-only dev-token stopgap) but the mechanism is now also what the real
// `/auth/login` flow (`lib/api/auth.ts`) stores its access token under — same token, same header,
// one storage slot, not two parallel ones.
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getDevToken();
  // NOTE: `frontend/.env.local.example` documents `NEXT_PUBLIC_API_URL` with an `/api/v1` prefix
  // that `main.ts` doesn't set yet (no `setGlobalPrefix` call) — out of T-027's scope to add.
  // Falls back to the backend's actual current (unprefixed) root until that lands.
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new ApiError(body || response.statusText, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

// NestJS error responses are JSON (`{ message, ... }` or a module-specific error shape, e.g.
// BR-020's `{ code, message, lockedFields }`) but `apiFetch` stores the raw response text as
// `ApiError.message` — unwrap it here so callers show the real validation/business-rule message,
// not a JSON blob. Shared by every `lib/api/*.ts` client.
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    try {
      const parsed = JSON.parse(error.message) as { message?: string | string[] };
      if (Array.isArray(parsed.message)) {
        return parsed.message.join('; ');
      }
      if (parsed.message) {
        return parsed.message;
      }
    } catch {
      // Not JSON — fall through to the raw text.
    }
    return error.message;
  }
  return error instanceof Error ? error.message : 'Unexpected error.';
}
