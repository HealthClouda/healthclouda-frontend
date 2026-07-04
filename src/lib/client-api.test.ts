import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
