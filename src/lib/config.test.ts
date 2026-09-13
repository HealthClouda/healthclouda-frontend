import { describe, it, expect } from 'vitest';
import { ENDPOINTS, ROLES, resolveApiBaseUrl } from './config';

describe('ENDPOINTS', () => {
  it('defines auth login endpoints', () => {
    expect(ENDPOINTS.LOGIN).toBeTruthy();
    expect(ENDPOINTS.LOGIN_ADMIN).toBeTruthy();
    expect(typeof ENDPOINTS.LOGIN_ORG).toBe('function');
    expect(ENDPOINTS.LOGIN_ORG('acme')).toContain('acme');
  });

  it('defines org-scoped endpoint builders', () => {
    expect(typeof ENDPOINTS.ORG_BY_SLUG).toBe('function');
    expect(ENDPOINTS.ORG_BY_SLUG('acme')).toContain('acme');
  });
});

/**
 * A4 (sprint plan Tier 1) — fail loudly on missing config.
 *
 * `API_BASE_URL` used to fall back to `http://localhost:8000/api/v1` whenever
 * NEXT_PUBLIC_API_URL was unset. In a DEPLOYED build that fails silently: the
 * app renders, every request goes to a localhost that isn't there, and it
 * presents as "the backend is down" rather than as the config error it is.
 *
 * One deployment cannot serve three backend tiers — the base URL is baked per
 * build — so a missing value must stop the build, not ship.
 *
 * The resolver takes plain arguments (not `process.env`) deliberately: Next
 * inlines `process.env.NEXT_PUBLIC_*` only where it appears as a literal, so
 * the literal read has to stay at module scope in config.ts. Passing the env
 * object into a function would silently break the client bundle.
 */
describe('resolveApiBaseUrl (A4 — fail loudly on missing config)', () => {
  it('returns the configured URL when one is set', () => {
    expect(resolveApiBaseUrl('https://api-dev.healthclouda.com/api/v1', 'production')).toBe(
      'https://api-dev.healthclouda.com/api/v1',
    );
  });

  it('THROWS when the URL is missing outside development', () => {
    expect(() => resolveApiBaseUrl(undefined, 'production')).toThrow(/NEXT_PUBLIC_API_URL/);
  });

  it('throws on an empty string too — an unset Vercel var reads as empty', () => {
    expect(() => resolveApiBaseUrl('', 'production')).toThrow(/NEXT_PUBLIC_API_URL/);
  });

  it('still falls back to localhost in development, so local dev needs no .env', () => {
    expect(resolveApiBaseUrl(undefined, 'development')).toBe('http://localhost:8000/api/v1');
  });

  it('does not throw under test, so the suite runs without env setup', () => {
    expect(() => resolveApiBaseUrl(undefined, 'test')).not.toThrow();
  });
});

/**
 * A6 — the org-admin access-request review endpoint was REMOVED by the backend
 * as a security fix (audit ORGADMIN-1): it let an org admin approve access to a
 * patient's records while BYPASSING that patient's consent. Patient consent is
 * the whole point of the access-request flow, so the caller must not come back.
 * The read-only list endpoint stays.
 */
describe('ORG_ADMIN endpoints (A6 — consent bypass removed)', () => {
  it('still exposes the read-only access-request list', () => {
    expect(ENDPOINTS.ORG_ADMIN_ACCESS_REQUESTS).toBeTruthy();
  });

  it('no longer exposes the consent-bypassing review endpoint', () => {
    expect('ORG_ADMIN_ACCESS_REVIEW' in ENDPOINTS).toBe(false);
  });
});

describe('ROLES', () => {
  it('defines all six roles', () => {
    expect(ROLES.SUPERADMIN).toBeTruthy();
    expect(ROLES.ORG_ADMIN).toBeTruthy();
    expect(ROLES.DOCTOR).toBeTruthy();
    expect(ROLES.NURSE).toBeTruthy();
    expect(ROLES.RECEPTIONIST).toBeTruthy();
    expect(ROLES.PATIENT).toBeTruthy();
  });
});