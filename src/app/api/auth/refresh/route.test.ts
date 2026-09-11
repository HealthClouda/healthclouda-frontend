import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// getRefreshToken reads the httpOnly cookie via next/headers — mock it so we can
// drive the route without a real request scope. Keep the real cookie-option
// constants (AUTH_COOKIES etc.) from the module.
vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>();
  return { ...actual, getRefreshToken: vi.fn() };
});

import { POST } from './route';
import { getRefreshToken, AUTH_COOKIES } from '@/lib/auth';

/**
 * Regression guard for PR #49 (fix/auth-layer): "refresh rotation persistence".
 *
 * SimpleJWT rotates the refresh token on every /auth/refresh/ call and
 * blacklists the old one. The pre-fix route destructured only `access` and
 * discarded the rotated `refresh`, so the SECOND refresh always sent a
 * blacklisted token → 401 → the user was logged out roughly every hour.
 */
describe('POST /api/auth/refresh — rotation persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('persists the ROTATED refresh token returned by DRF', async () => {
    vi.mocked(getRefreshToken).mockResolvedValue('old-refresh-token');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ access: 'new-access', refresh: 'rotated-refresh' }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );

    const res = await POST();

    expect(res.status).toBe(200);
    expect(res.cookies.get(AUTH_COOKIES.ACCESS)?.value).toBe('new-access');
    // The bug: this used to still be 'old-refresh-token' (rotated value dropped).
    expect(res.cookies.get(AUTH_COOKIES.REFRESH)?.value).toBe('rotated-refresh');
  });

  it('clears cookies and returns 401 when DRF rejects the refresh token', async () => {
    vi.mocked(getRefreshToken).mockResolvedValue('expired-refresh');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{}', { status: 401 })),
    );

    const res = await POST();

    expect(res.status).toBe(401);
    // Deleted cookies are emitted with an empty value so the browser drops them.
    expect(res.cookies.get(AUTH_COOKIES.REFRESH)?.value).toBe('');
    expect(res.cookies.get(AUTH_COOKIES.ACCESS)?.value).toBe('');
  });

  it('short-circuits to 401 without calling DRF when no refresh cookie exists', async () => {
    vi.mocked(getRefreshToken).mockResolvedValue(null);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const res = await POST();

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
