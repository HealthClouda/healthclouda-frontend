import { describe, it, expect } from 'vitest';
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

/**
 * Regression guards for PR #49 (fix/auth-layer):
 *  - middleware must gate on access OR refresh cookie (the access cookie
 *    expires hourly; a live refresh cookie means the session is still valid —
 *    page navs used to bounce to /signin despite a valid refresh token).
 *  - middleware must NEVER build a `/undefined/...` redirect when the user's
 *    organization_slug is missing.
 */
describe('middleware — session gating', () => {
  it('redirects an unauthenticated user off an org dashboard to the org signin', () => {
    const res = middleware(makeReq('/acme/doctor'));
    expect(res.status).toBe(307);
    expect(location(res)).toBe('https://app.test/acme/signin');
  });

  // Was: expected '/signin'. That assertion locked in sending a superadmin to
  // the PATIENT portal, which cannot log them in — the backend rejects staff
  // there. Corrected 2026-08-19 alongside the fix; see the describe block below.
  it('redirects an unauthenticated user off /superadmin to the SUPERADMIN signin', () => {
    const res = middleware(makeReq('/superadmin'));
    expect(res.status).toBe(307);
    expect(location(res)).toBe('https://app.test/superadmin/signin');
  });

  it('lets a dashboard nav through when ONLY the refresh cookie is present', () => {
    // Access cookie has expired (hourly); refresh cookie is still alive.
    const res = middleware(makeReq('/acme/doctor', { [AUTH_COOKIES.REFRESH]: 'refresh-abc' }));
    // Not a redirect — the client will refresh the access token on first API call.
    expect(location(res)).toBeNull();
  });
});

describe('middleware — no /undefined/ redirects', () => {
  it('does NOT redirect a signed-in staff user with a MISSING org slug (would be /undefined/...)', () => {
    const res = middleware(
      makeReq('/acme/signin', {
        [AUTH_COOKIES.ACCESS]: 'access-abc',
        [AUTH_COOKIES.USER]: userCookie({ role: 'DOCTOR' }), // no organization_slug
      }),
    );
    // Must fall through to signin rather than build /undefined/doctor.
    expect(location(res)).toBeNull();
  });

  it('redirects a signed-in staff user WITH an org slug to their dashboard', () => {
    const res = middleware(
      makeReq('/acme/signin', {
        [AUTH_COOKIES.ACCESS]: 'access-abc',
        [AUTH_COOKIES.USER]: userCookie({ role: 'DOCTOR', organization_slug: 'acme' }),
      }),
    );
    expect(res.status).toBe(307);
    expect(location(res)).toBe('https://app.test/acme/doctor');
    expect(location(res)).not.toContain('undefined');
  });

  it('redirects a signed-in superadmin to /superadmin (no slug required)', () => {
    const res = middleware(
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
  it('does NOT redirect /superadmin/signin away when there is no session', () => {
    const res = middleware(makeReq('/superadmin/signin'));
    expect(location(res)).toBeNull();
  });

  it('does NOT redirect the org signin away when there is no session', () => {
    const res = middleware(makeReq('/acme/signin'));
    expect(location(res)).toBeNull();
  });

  it('does NOT redirect the general signin away when there is no session', () => {
    const res = middleware(makeReq('/signin'));
    expect(location(res)).toBeNull();
  });

  it('still guards the superadmin DASHBOARD itself', () => {
    const res = middleware(makeReq('/superadmin'));
    expect(res.status).toBe(307);
    expect(location(res)).toBe('https://app.test/superadmin/signin');
  });

  it('sends an expired org-staff session to its own org portal, not the general one', () => {
    const res = middleware(makeReq('/acme/org-admin'));
    expect(location(res)).toBe('https://app.test/acme/signin');
  });
});
