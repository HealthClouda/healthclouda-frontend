'use client';

/**
 * Client data layer — ALL browser-side API access goes through here.
 *
 * Responsibilities:
 *  - Route every request through the Next.js proxy (/api/data, /api/action).
 *  - On 401: refresh the session ONCE (single-flight — the backend rotates and
 *    blacklists refresh tokens, so concurrent refreshes log the user out),
 *    then retry the original request once. Only redirect to signin if the
 *    refresh itself fails.
 *  - Keep redirects org-aware (staff go back to /{slug}/signin, not /signin).
 *
 * This module is also the swap point for the offline-first data layer planned
 * for the staging phase (IndexedDB-first reads, outbox writes) — components
 * must never call fetch() directly.
 */

import { getOrgSlugFromPathname } from './router';

// ── Single-flight session refresh ──────────────────────────────
let refreshInFlight: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  refreshInFlight ??= fetch('/api/auth/refresh', { method: 'POST' })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

export function redirectToSignin(): void {
  const slug = getOrgSlugFromPathname(window.location.pathname);
  window.location.href = slug ? `/${slug}/signin` : '/signin';
}

// ── Core fetch with 401 → refresh → retry ──────────────────────
async function proxyFetch(input: string, init?: RequestInit): Promise<Response> {
  let res = await fetch(input, init);
  if (res.status !== 401) return res;

  const refreshed = await refreshSession();
  if (!refreshed) {
    redirectToSignin();
    return res;
  }
  res = await fetch(input, init);
  if (res.status === 401) redirectToSignin();
  return res;
}

export class ClientApiError extends Error {
  constructor(
    public status: number,
    public data: unknown,
    message: string,
  ) {
    super(message);
    this.name = 'ClientApiError';
  }
}

function errorMessage(status: number, data: unknown): string {
  if (status === 429) return 'Too many requests — please try again shortly.';
  const obj = data as Record<string, unknown> | null;
  const msg = obj?.detail ?? obj?.error;
  return typeof msg === 'string' ? msg : `Request failed (HTTP ${status})`;
}

// ── Public API ─────────────────────────────────────────────────

/** Authenticated GET of a backend path (e.g. ENDPOINTS.REC_CHECK_INS). */
export async function dataGet<T = unknown>(path: string): Promise<T> {
  const res = await proxyFetch(`/api/data?path=${encodeURIComponent(path)}`);
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ClientApiError(res.status, data, errorMessage(res.status, data));
  return data as T;
}

/** Authenticated write (POST/PATCH/PUT/DELETE) to a backend path. */
export async function dataAction<T = unknown>(
  path: string,
  method = 'POST',
  body?: unknown,
): Promise<T> {
  const res = await proxyFetch('/api/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, path, data: body }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ClientApiError(res.status, data, errorMessage(res.status, data));
  return data as T;
}
