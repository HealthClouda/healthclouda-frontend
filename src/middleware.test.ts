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

  it('redirects an unauthenticated user off /superadmin to the general signin', () => {
    const res = middleware(makeReq('/superadmin'));
    expect(res.status).toBe(307);
    expect(location(res)).toBe('https://app.test/signin');
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
