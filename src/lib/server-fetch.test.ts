import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * FLAG-005 / E7 — `serverFetch` turned auth errors, 500s, network failures and
 * malformed JSON all into `null`, indistinguishable from "no data", and logged
 * nothing anywhere.
 *
 * A production incident therefore presents as a silently empty dashboard with no
 * signal in any log. These tests assert the two halves of the flag's "done when"
 * that live in this module: failures are DISTINGUISHABLE, and they are LOGGED
 * with a status and a path.
 */

vi.mock('./auth', () => ({ getAccessToken: async () => 'test-token' }));
vi.mock('./config', async (orig) => ({
  ...(await orig<typeof import('./config')>()),
  API_BASE_URL: 'https://api.test/api/v1',
}));

const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

beforeEach(() => {
  errorSpy.mockClear();
  vi.unstubAllGlobals();
});
afterEach(() => vi.unstubAllGlobals());

function mockFetch(impl: () => Promise<Response> | never) {
  vi.stubGlobal('fetch', vi.fn(impl));
}

describe('FLAG-005 — failures are distinguishable from empty', () => {
  it('reports a 500 as a failure carrying its status', async () => {
    mockFetch(async () => new Response('boom', { status: 500 }));
    const { serverFetchResult } = await import('./server-fetch');
    const res = await serverFetchResult('/doctor/stats/');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.status).toBe(500);
  });

  it('distinguishes an auth failure from a server failure', async () => {
    mockFetch(async () => new Response('nope', { status: 401 }));
    const { serverFetchResult } = await import('./server-fetch');
    const res = await serverFetchResult('/doctor/stats/');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe('unauthorized');
  });

  it('reports a network error as a network failure, not as empty data', async () => {
    mockFetch(() => { throw new TypeError('fetch failed'); });
    const { serverFetchResult } = await import('./server-fetch');
    const res = await serverFetchResult('/doctor/stats/');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe('network');
  });

  it('reports malformed JSON as a failure rather than as null', async () => {
    mockFetch(async () => new Response('<html>not json</html>', {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }));
    const { serverFetchResult } = await import('./server-fetch');
    const res = await serverFetchResult('/doctor/stats/');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe('malformed');
  });

  it('returns the data on success', async () => {
    mockFetch(async () => new Response(JSON.stringify({ total: 3 }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }));
    const { serverFetchResult } = await import('./server-fetch');
    const res = await serverFetchResult<{ total: number }>('/doctor/stats/');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.total).toBe(3);
  });
});

describe('FLAG-005 — failures are logged server-side with status and path', () => {
  it('logs the status and the endpoint on a 500', async () => {
    mockFetch(async () => new Response('boom', { status: 500 }));
    const { serverFetchResult } = await import('./server-fetch');
    await serverFetchResult('/doctor/stats/');

    expect(errorSpy).toHaveBeenCalled();
    const logged = errorSpy.mock.calls.map(c => c.join(' ')).join(' ');
    expect(logged).toContain('500');
    expect(logged).toContain('/doctor/stats/');
  });

  it('never logs the bearer token', async () => {
    mockFetch(async () => new Response('boom', { status: 500 }));
    const { serverFetchResult } = await import('./server-fetch');
    await serverFetchResult('/doctor/stats/');
    const logged = errorSpy.mock.calls.map(c => JSON.stringify(c)).join(' ');
    expect(logged).not.toContain('test-token');
  });

  it('does not log on success', async () => {
    mockFetch(async () => new Response(JSON.stringify({ ok: 1 }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }));
    const { serverFetchResult } = await import('./server-fetch');
    await serverFetchResult('/doctor/stats/');
    expect(errorSpy).not.toHaveBeenCalled();
  });
});

describe('FLAG-005 — the existing null-returning contract still holds', () => {
  it('serverFetch still returns null on failure, so fail-closed callers are unchanged', async () => {
    // PR #99's auth gate treats null as DENY. That must keep working exactly as
    // it does today — this change adds signal, it does not move the goalposts.
    mockFetch(async () => new Response('boom', { status: 500 }));
    const { serverFetch } = await import('./server-fetch');
    expect(await serverFetch('/auth/me/')).toBeNull();
  });

  it('serverFetch still returns data on success', async () => {
    mockFetch(async () => new Response(JSON.stringify({ role: 'DOCTOR' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }));
    const { serverFetch } = await import('./server-fetch');
    expect(await serverFetch<{ role: string }>('/auth/me/')).toEqual({ role: 'DOCTOR' });
  });
});
