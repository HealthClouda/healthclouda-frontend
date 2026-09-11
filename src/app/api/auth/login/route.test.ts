import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextRequest } from 'next/server';
import { POST } from './route';
import { AUTH_COOKIES } from '@/lib/auth';

/**
 * Pre-fix tests for CONTRACT-AUDIT GLOBAL-4 (duty initial state), written RED:
 *
 * Backend shipped `is_on_duty` + `duty_toggled_at` on GET /auth/me/ for
 * DOCTOR/NURSE (2026-07-09, verified live — keys OMITTED entirely for other
 * roles, and NOT on the login response itself). The login route already
 * enriches the user from /auth/me/ (AUTH-4), but the enrichment copies only
 * `organization.*` — the duty fields are dropped, so DutyToggle always
 * starts "Off Duty" regardless of truth.
 */

function loginRequest() {
  return {
    headers: new Headers({ 'x-forwarded-for': `10.0.0.${Math.floor(Math.random() * 250)}` }),
    json: async () => ({
      email: 'doctor@demo.test',
      password: 'Demo#Pass1',
      loginType: 'org',
      orgSlug: 'demo-clinic',
    }),
  } as unknown as NextRequest;
}

const drfLoginBody = {
  access: 'access-token',
  refresh: 'refresh-token',
  // Live shape: the login user has NO org and NO duty fields.
  user: { id: 'u1', email: 'doctor@demo.test', first_name: 'Emeka', last_name: 'Okafor', role: 'DOCTOR', last_login: null },
};

function mockFetch(meBody: Record<string, unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((url: string) =>
      Promise.resolve(
        new Response(
          JSON.stringify(String(url).includes('/auth/me/') ? meBody : drfLoginBody),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      ),
    ),
  );
}

describe('POST /api/auth/login — /auth/me/ enrichment carries duty state (GLOBAL-4)', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it('copies is_on_duty + duty_toggled_at into the user for DOCTOR/NURSE', async () => {
    mockFetch({
      id: 'u1',
      role: 'DOCTOR',
      organization: { slug: 'demo-clinic', name: 'Demo Clinic' },
      is_on_duty: true,
      duty_toggled_at: '2026-07-09T22:02:19Z',
    });

    const res = await POST(loginRequest());
    expect(res.status).toBe(200);

    const { user } = (await res.json()) as { user: Record<string, unknown> };
    expect(user.organization_slug).toBe('demo-clinic');
    // The bug: enrichment drops these → DutyToggle always starts off-duty.
    expect(user.is_on_duty).toBe(true);
    expect(user.duty_toggled_at).toBe('2026-07-09T22:02:19Z');

    // The session user cookie must carry it too — dashboards read from there.
    const cookie = res.cookies.get(AUTH_COOKIES.USER)?.value ?? '';
    expect(JSON.parse(decodeURIComponent(cookie)).is_on_duty).toBe(true);
  });

  it('leaves the duty fields absent for roles the backend omits them for', async () => {
    mockFetch({
      id: 'u1',
      role: 'RECEPTIONIST',
      organization: { slug: 'demo-clinic', name: 'Demo Clinic' },
      // Verified live: keys OMITTED entirely (not null) for non-DOCTOR/NURSE.
    });

    const res = await POST(loginRequest());
    const { user } = (await res.json()) as { user: Record<string, unknown> };

    expect(user.organization_slug).toBe('demo-clinic');
    expect('is_on_duty' in user).toBe(false);
    expect('duty_toggled_at' in user).toBe(false);
  });
});
