import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from './middleware';
import { AUTH_COOKIES } from '@/lib/auth';

function makeReq(path: string, cookies: Record<string, string> = {}): NextRequest {
  const req = new NextRequest(new URL(`https://app.test${path}`));
  for (const [name, value] of Object.entries(cookies)) {
    req.cookies.set(name, value);
  }
  return req;
}

function userCookie(user: Record<string, unknown>): string {
  // Middleware reads the (non-httpOnly) user cookie as encodeURIComponent(JSON).
  return encodeURIComponent(JSON.stringify(user));
}

const location = (res: Response) => res.headers.get('location');

// Middleware refreshes against the backend, so every test that exercises an
// expired access cookie has to say what the backend answered.
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const rotated = (access: string, refresh?: string) =>
  ({ ok: true, json: async () => ({ access, refresh }) }) as unknown as Response;
const rejected = () => ({ ok: false, status: 401, json: async () => ({}) }) as unknown as Response;

beforeEach(() => {
  fetchMock.mockReset();
});

/** The cookie header middleware hands DOWN to the server-rendered page. */
const forwardedCookies = (res: Response) => res.headers.get('x-middleware-request-cookie') ?? '';
/** Cookies middleware asks the BROWSER to store. */
const setCookies = (res: Response) => res.headers.getSetCookie().join(' ; ');

/**
 * Regression guards for PR #49 (fix/auth-layer):
 *  - middleware must gate on access OR refresh cookie (the access cookie
 *    expires hourly; a live refresh cookie means the session is still valid —
 *    page navs used to bounce to /signin despite a valid refresh token).
 *  - middleware must NEVER build a `/undefined/...` redirect when the user's
 *    organization_slug is missing.
 */
describe('middleware — session gating', () => {
  it('redirects an unauthenticated user off an org dashboard to the org signin', async () => {
    const res = await middleware(makeReq('/acme/doctor'));
    expect(res.status).toBe(307);
    expect(location(res)).toBe('https://app.test/acme/signin');
  });

  // Was: expected '/signin'. That assertion locked in sending a superadmin to
  // the PATIENT portal, which cannot log them in — the backend rejects staff
  // there. Corrected 2026-08-19 alongside the fix; see the describe block below.
  it('redirects an unauthenticated user off /superadmin to the SUPERADMIN signin', async () => {
    const res = await middleware(makeReq('/superadmin'));
    expect(res.status).toBe(307);
    expect(location(res)).toBe('https://app.test/superadmin/signin');
  });

  it('lets a dashboard nav through when ONLY the refresh cookie is present', async () => {
    // Access cookie has expired (hourly); refresh cookie is still alive.
    // Middleware now mints a new access token here rather than leaving it to
    // the client's first API call — see the session-resume block below for why.
    fetchMock.mockResolvedValueOnce(rotated('new-access', 'new-refresh'));
    const res = await middleware(makeReq('/acme/doctor', { [AUTH_COOKIES.REFRESH]: 'refresh-abc' }));
    expect(location(res)).toBeNull();
  });
});

describe('middleware — no /undefined/ redirects', () => {
  it('does NOT redirect a signed-in staff user with a MISSING org slug (would be /undefined/...)', async () => {
    const res = await middleware(
      makeReq('/acme/signin', {
        [AUTH_COOKIES.ACCESS]: 'access-abc',
        [AUTH_COOKIES.USER]: userCookie({ role: 'DOCTOR' }), // no organization_slug
      }),
    );
    // Must fall through to signin rather than build /undefined/doctor.
    expect(location(res)).toBeNull();
  });

  it('redirects a signed-in staff user WITH an org slug to their dashboard', async () => {
    const res = await middleware(
      makeReq('/acme/signin', {
        [AUTH_COOKIES.ACCESS]: 'access-abc',
        [AUTH_COOKIES.USER]: userCookie({ role: 'DOCTOR', organization_slug: 'acme' }),
      }),
    );
    expect(res.status).toBe(307);
    expect(location(res)).toBe('https://app.test/acme/doctor');
    expect(location(res)).not.toContain('undefined');
  });

  it('redirects a signed-in superadmin to /superadmin (no slug required)', async () => {
    const res = await middleware(
      makeReq('/superadmin/signin', {
        [AUTH_COOKIES.ACCESS]: 'access-abc',
        [AUTH_COOKIES.USER]: userCookie({ role: 'SUPERADMIN' }),
      }),
    );
    expect(res.status).toBe(307);
    expect(location(res)).toBe('https://app.test/superadmin');
  });
});

/**
 * Regression guards for the 2026-08-19 fix: every signin portal must be
 * reachable while logged OUT, which is the only time it is any use.
 *
 * `/superadmin/signin` sits under the `/superadmin` dashboard prefix, so the
 * dashboard guard claimed it and redirected it to `/signin` — the patients-only
 * portal, where the backend rejects staff. A superadmin could not sign in at
 * all. Found by clicking through the running app, not by these tests: nothing
 * here covered a signin URL without a session, so the bug was invisible.
 */
describe('middleware — signin pages are reachable when logged out', () => {
  it('does NOT redirect /superadmin/signin away when there is no session', async () => {
    const res = await middleware(makeReq('/superadmin/signin'));
    expect(location(res)).toBeNull();
  });

  it('does NOT redirect the org signin away when there is no session', async () => {
    const res = await middleware(makeReq('/acme/signin'));
    expect(location(res)).toBeNull();
  });

  it('does NOT redirect the general signin away when there is no session', async () => {
    const res = await middleware(makeReq('/signin'));
    expect(location(res)).toBeNull();
  });

  it('still guards the superadmin DASHBOARD itself', async () => {
    const res = await middleware(makeReq('/superadmin'));
    expect(res.status).toBe(307);
    expect(location(res)).toBe('https://app.test/superadmin/signin');
  });

  it('sends an expired org-staff session to its own org portal, not the general one', async () => {
    const res = await middleware(makeReq('/acme/org-admin'));
    expect(location(res)).toBe('https://app.test/acme/signin');
  });
});

/**
 * Server-side session resume — the regression @Qeeyat caught on PR #99.
 *
 * A5/FLAG-001 moved every dashboard gate onto `requireDashboardUser()`, which
 * resolves identity from `/auth/me/` using the **httpOnly access token**. That
 * cookie is `maxAge: 3600` and the real `api-dev` token expires on the same
 * hour. Middleware, meanwhile, has always treated a live refresh cookie as a
 * live session and left the recovery to `client-api.ts`'s single-flight refresh
 * on the first API call.
 *
 * Those two facts collide one hour after login: middleware allows the request,
 * the page gate finds no access token, and the user is bounced to signin
 * holding a refresh token good for another six days. It hits every user, every
 * hour, on any full page load — and it is invisible in logs, because #103
 * deliberately does not log `no_token`.
 *
 * A Server Component cannot set cookies in Next, so the gate cannot fix this
 * itself. Middleware can, and it already owns the "refresh cookie means the
 * session is alive" invariant, so the refresh moves here.
 *
 * Each of these FAILS on the pre-fix middleware, which performs no refresh at
 * all: there is no `Set-Cookie` and nothing is forwarded to the render.
 */
describe('middleware — server-side session resume (the hourly-logout regression)', () => {
  const expired = { [AUTH_COOKIES.REFRESH]: 'refresh-abc' };

  it('mints a fresh access token when the access cookie has expired', async () => {
    fetchMock.mockResolvedValueOnce(rotated('fresh-access', 'rotated-refresh'));
    const res = await middleware(makeReq('/acme/doctor', expired));

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(location(res)).toBeNull();
    expect(setCookies(res)).toContain('hc_access_token=fresh-access');
  });

  it('forwards the new token to the page gate on the SAME request', async () => {
    // Without this the gate still sees no access token on the very navigation
    // that refreshed, and redirects to signin anyway — the bug would survive
    // its own fix, one render later.
    fetchMock.mockResolvedValueOnce(rotated('fresh-access', 'rotated-refresh'));
    const res = await middleware(makeReq('/acme/doctor', expired));

    expect(forwardedCookies(res)).toContain('hc_access_token=fresh-access');
  });

  it('persists the ROTATED refresh token, not the one it was given', async () => {
    // SimpleJWT rotates and blacklists: keeping the old refresh cookie means
    // the next refresh presents a blacklisted token and logs the user out.
    fetchMock.mockResolvedValueOnce(rotated('fresh-access', 'rotated-refresh'));
    const res = await middleware(makeReq('/acme/doctor', expired));

    expect(setCookies(res)).toContain('hc_refresh_token=rotated-refresh');
  });

  it('does NOT refresh when the access cookie is still alive', async () => {
    const res = await middleware(
      makeReq('/acme/doctor', { [AUTH_COOKIES.ACCESS]: 'access-abc', ...expired }),
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(location(res)).toBeNull();
  });

  it('does NOT refresh on a route that is not a dashboard', async () => {
    // The landing page and the signin portals render fine without identity;
    // refreshing there would spend a backend round trip on every visit.
    await middleware(makeReq('/', expired));
    await middleware(makeReq('/acme/signin', expired));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('signs the user out when the backend REJECTS the refresh token', async () => {
    // Genuinely expired after 7 days: fail closed, and clear the dead cookies
    // so the signin page cannot bounce them straight back (see below).
    fetchMock.mockResolvedValueOnce(rejected());
    const res = await middleware(makeReq('/acme/doctor', expired));

    expect(location(res)).toBe('https://app.test/acme/signin?session=expired');
    expect(setCookies(res)).toContain('hc_refresh_token=;');
  });

  it('keeps the cookies when the backend is UNREACHABLE', async () => {
    // A network blip is not proof the session is dead. Destroying a live
    // 7-day session because the API wobbled for one request is the harsher
    // failure, so the cookies stay and the next navigation retries.
    fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const res = await middleware(makeReq('/acme/doctor', expired));

    expect(location(res)).toBe('https://app.test/acme/signin?session=expired');
    expect(setCookies(res)).not.toContain('hc_refresh_token=;');
  });

  it('does not bounce an expired session back off the signin page (no redirect loop)', async () => {
    // The `?session=expired` marker exists for exactly this: without it, the
    // "already signed in" rule sees the still-present cookies, redirects to the
    // dashboard, which redirects back here — forever.
    const res = await middleware(
      makeReq('/acme/signin?session=expired', {
        ...expired,
        [AUTH_COOKIES.USER]: userCookie({ role: 'DOCTOR', organization_slug: 'acme' }),
      }),
    );

    expect(location(res)).toBeNull();
  });

  it('sends a superadmin to the superadmin portal, not the patient one', async () => {
    fetchMock.mockResolvedValueOnce(rejected());
    const res = await middleware(makeReq('/superadmin', expired));

    expect(location(res)).toBe('https://app.test/superadmin/signin?session=expired');
  });
});
