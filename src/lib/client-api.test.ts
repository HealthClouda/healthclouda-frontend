import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { dataGet } from './client-api';

/**
 * Regression guard for PR #49 (fix/auth-layer): "single-flight refresh".
 *
 * The backend rotates AND blacklists refresh tokens. If two requests 401 at the
 * same time and each fires its own /auth/refresh, the second refresh presents a
 * now-blacklisted token → 401 → the user is logged out. proxyFetch must funnel
 * concurrent 401s through ONE in-flight refresh, then retry each request.
 */

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

// jsdom's window.location is read-only and its href setter throws; replace it so
// redirectToSignin() is observable instead of blowing up.
let currentLocation: { pathname: string; href: string };
function stubLocation(pathname: string) {
  currentLocation = { pathname, href: '' };
  Object.defineProperty(window, 'location', {
    value: currentLocation,
    writable: true,
    configurable: true,
  });
}

describe('client-api — single-flight refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubLocation('/acme/receptionist');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('refreshes ONCE for concurrent 401s, then retries both requests', async () => {
    let dataAttempts = 0;
    const fetchMock = vi.fn((input: string) => {
      if (input.includes('/api/auth/refresh')) {
        return Promise.resolve(jsonResponse({ success: true }, 200));
      }
      // First attempt of each concurrent request 401s; the post-refresh retry succeeds.
      dataAttempts += 1;
      return Promise.resolve(
        dataAttempts <= 2 ? jsonResponse({ detail: 'expired' }, 401) : jsonResponse({ ok: true }, 200),
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const [a, b] = await Promise.all([dataGet('/a/'), dataGet('/b/')]);

    expect(a).toEqual({ ok: true });
    expect(b).toEqual({ ok: true });

    const refreshCalls = fetchMock.mock.calls.filter((c) =>
      String(c[0]).includes('/api/auth/refresh'),
    );
    expect(refreshCalls).toHaveLength(1);
  });

  it('GLOBAL-5: surfaces 429 as a friendly "try again shortly" message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ detail: 'throttled' }, 429)),
    );

    await expect(dataGet('/a/')).rejects.toThrow(/try again shortly/i);
  });

  it('redirects to the ORG signin (not /signin) when the refresh itself fails', async () => {
    const fetchMock = vi.fn((input: string) => {
      if (input.includes('/api/auth/refresh')) {
        return Promise.resolve(jsonResponse({ detail: 'session expired' }, 401));
      }
      return Promise.resolve(jsonResponse({ detail: 'expired' }, 401));
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(dataGet('/a/')).rejects.toThrow();
    // Org-aware: a receptionist under /acme goes back to /acme/signin.
    expect(currentLocation.href).toBe('/acme/signin');
  });
});

/**
 * Build 5 / FLAG-044 — SESSION_IDLE_EXPIRED / SESSION_MAX_AGE_EXPIRED.
 *
 * The load-bearing rule under test: neither code may ever trigger a refresh
 * attempt (contract point 2 — the backend would just repeat the refusal), and
 * an ORDINARY 401 (no `code`) must still run today's refresh-and-retry
 * unchanged — the two `it`s above already cover that as a positive control,
 * so this block only adds the two new codes.
 */
describe('client-api — session-expiry codes never trigger a refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubLocation('/acme/receptionist');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('SESSION_IDLE_EXPIRED on the ORIGINAL request: no refresh attempted, ends the session and redirects with the reason', async () => {
    // Deliberately a normal 200, not a throw: if the code under test wrongly
    // calls refresh anyway, this must NOT crash the test — the explicit
    // "no refresh call happened" assertion below is what has to catch that,
    // not an incidental exception (a test that can pass for the wrong reason
    // proves nothing).
    const fetchMock = vi.fn((input: string) => {
      if (input.includes('/api/auth/refresh')) return Promise.resolve(jsonResponse({ success: true }, 200));
      if (input.includes('/api/auth/logout')) return Promise.resolve(jsonResponse({ success: true }, 200));
      return Promise.resolve(jsonResponse({ error: 'expired', code: 'SESSION_IDLE_EXPIRED' }, 401));
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(dataGet('/a/')).rejects.toThrow();
    // `endSessionAndRedirect` is fire-and-forget from `proxyFetch` (a real
    // navigation does not need to wait for the best-effort logout call) —
    // `waitFor` tolerates that instead of racing a synchronous equality check.
    await waitFor(() => expect(currentLocation.href).toBe('/acme/signin?reason=idle'));
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('/api/auth/refresh'))).toBe(false);
  });

  it('SESSION_MAX_AGE_EXPIRED returned BY THE REFRESH CALL: no retry, ends the session with the 12h-cap reason', async () => {
    let dataAttempts = 0;
    const fetchMock = vi.fn((input: string) => {
      if (input.includes('/api/auth/refresh')) {
        return Promise.resolve(jsonResponse({ detail: 'expired', code: 'SESSION_MAX_AGE_EXPIRED' }, 401));
      }
      if (input.includes('/api/auth/logout')) return Promise.resolve(jsonResponse({ success: true }, 200));
      dataAttempts += 1;
      // Ordinary 401 on the original call — no code — so a refresh IS attempted.
      return Promise.resolve(jsonResponse({ detail: 'expired' }, 401));
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(dataGet('/a/')).rejects.toThrow();
    await waitFor(() => expect(currentLocation.href).toBe('/acme/signin?reason=max_age'));
    // Exactly one attempt at the original endpoint — the retry-after-refresh
    // path never fires because the refresh itself carried the code.
    expect(dataAttempts).toBe(1);
  });
});
