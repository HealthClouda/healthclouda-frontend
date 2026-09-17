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
import { sessionExpiryCodeFrom, SESSION_EXPIRY_REASON, type SessionExpiryCode } from './session-expiry-code';

// ── Single-flight session refresh ──────────────────────────────
type RefreshResult = { ok: true } | { ok: false; code?: SessionExpiryCode };
let refreshInFlight: Promise<RefreshResult> | null = null;

function refreshSession(): Promise<RefreshResult> {
  refreshInFlight ??= fetch('/api/auth/refresh', { method: 'POST' })
    .then(async (r): Promise<RefreshResult> => {
      if (r.ok) return { ok: true };
      const body = await r.json().catch(() => null);
      return { ok: false, code: sessionExpiryCodeFrom(body) ?? undefined };
    })
    .catch((): RefreshResult => ({ ok: false }))
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

export function redirectToSignin(): void {
  const slug = getOrgSlugFromPathname(window.location.pathname);
  window.location.href = slug ? `/${slug}/signin` : '/signin';
}

/**
 * Ends the session the same way logout does (clears the httpOnly cookies
 * server-side), then lands on the right signin page with a plain-language
 * reason — build 5 / FLAG-044. Never call this instead of a refresh attempt;
 * call it INSTEAD of attempting one, because the backend would just return
 * the same code again.
 */
export async function endSessionAndRedirect(code: SessionExpiryCode): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
  const slug = getOrgSlugFromPathname(window.location.pathname);
  const base = slug ? `/${slug}/signin` : '/signin';
  window.location.href = `${base}?reason=${SESSION_EXPIRY_REASON[code]}`;
}

// ── Core fetch with 401 → refresh → retry ──────────────────────
async function proxyFetch(input: string, init?: RequestInit): Promise<Response> {
  let res = await fetch(input, init);
  if (res.status !== 401) return res;

  // The proxy routes (`/api/data`, `/api/action`) forward the backend's body
  // through verbatim, so a session-expiry code is visible here already. Do
  // NOT attempt a refresh in that case — it would just replay the same
  // refusal (contract point 2); end the session and say why instead.
  let code = sessionExpiryCodeFrom(await res.clone().json().catch(() => null));
  if (code) {
    void endSessionAndRedirect(code);
    return res;
  }

  const refreshed = await refreshSession();
  if (!refreshed.ok) {
    if (refreshed.code) {
      void endSessionAndRedirect(refreshed.code);
    } else {
      redirectToSignin();
    }
    return res;
  }
  res = await fetch(input, init);
  if (res.status === 401) {
    code = sessionExpiryCodeFrom(await res.clone().json().catch(() => null));
    if (code) {
      void endSessionAndRedirect(code);
    } else {
      redirectToSignin();
    }
  }
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
