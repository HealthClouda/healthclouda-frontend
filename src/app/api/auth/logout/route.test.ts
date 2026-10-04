import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The tokens come from httpOnly cookies via next/headers — mock the getters so
// the route runs without a request scope. Keep the real AUTH_COOKIES.
vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>();
  return { ...actual, getAccessToken: vi.fn(), getRefreshToken: vi.fn() };
});

import { POST } from './route';
import { getAccessToken, getRefreshToken, AUTH_COOKIES } from '@/lib/auth';
import { ENDPOINTS } from '@/lib/config';

/**
 * FLAG-250 — signing out must end the session on the SERVER, not just in this
 * browser.
 *
 * The backend's `LogoutView` reads `{refresh}` from the body: it blacklists that
 * refresh token and calls `end_session()` (FLAG-610), so the session's access
 * tokens stop working at once. Without the body it answers 400 "Refresh token
 * is required" and does neither. This route used to send no body at all, and
 * swallowed the 400 as "best-effort", so no sign-out from the app ever ended a
 * server session.
 */
describe('POST /api/auth/logout — FLAG-250', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    errorSpy.mockRestore();
  });

  function signedIn() {
    vi.mocked(getAccessToken).mockResolvedValue('access-tok');
    vi.mocked(getRefreshToken).mockResolvedValue('refresh-tok');
  }

  function expectCookiesCleared(res: Response & { cookies: { get(name: string): { value: string } | undefined } }) {
    for (const name of [AUTH_COOKIES.ACCESS, AUTH_COOKIES.REFRESH, AUTH_COOKIES.USER]) {
      // A deleted cookie is emitted with an empty value so the browser drops it.
      expect(res.cookies.get(name)?.value ?? '').toBe('');
    }
  }

  it('sends the refresh token in the body, so the backend can end the session', async () => {
    signedIn();
    await POST();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url.endsWith(ENDPOINTS.LOGOUT)).toBe(true);
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer access-tok');
    expect(JSON.parse(String(init.body))).toEqual({ refresh: 'refresh-tok' });
  });

  it('says so in the server log when the backend refuses — status and path only, never a token', async () => {
    signedIn();
    fetchMock.mockResolvedValue(new Response('{"error":"Refresh token is required"}', { status: 400 }));
    await POST();

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const line = String(errorSpy.mock.calls[0][0]);
    expect(line).toContain('status=400');
    expect(line).toContain(ENDPOINTS.LOGOUT);
    expect(line).not.toContain('access-tok');
    expect(line).not.toContain('refresh-tok');
  });

  it('control: a successful logout logs nothing', async () => {
    signedIn();
    await POST();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('control: this browser is signed out whatever the backend answers', async () => {
    signedIn();
    fetchMock.mockResolvedValue(new Response('{}', { status: 403 }));
    const res = await POST();
    expect(res.status).toBe(200);
    expectCookiesCleared(res);
  });

  it('control: this browser is signed out even if the backend is unreachable', async () => {
    signedIn();
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    const res = await POST();
    expect(res.status).toBe(200);
    expectCookiesCleared(res);
  });

  it('control: no session cookies, no backend call', async () => {
    vi.mocked(getAccessToken).mockResolvedValue(null);
    vi.mocked(getRefreshToken).mockResolvedValue(null);
    const res = await POST();
    expect(fetchMock).not.toHaveBeenCalled();
    expectCookiesCleared(res);
  });
});
