import { describe, it, expect } from 'vitest';
import { getOrgSlugFromPathname, roleDashboardPath } from './router';
import { ROLES } from './config';

/**
 * Underpins the org-aware redirects fixed in PR #49 (fix/auth-layer):
 * redirectToSignin() and logout use this to decide between /{slug}/signin and
 * /signin. It must return a real slug for org paths and null for reserved
 * (non-org) first segments — never a bogus slug that yields /undefined/... .
 */
describe('getOrgSlugFromPathname', () => {
  it('extracts the org slug from an org-scoped dashboard path', () => {
    expect(getOrgSlugFromPathname('/acme/receptionist')).toBe('acme');
    expect(getOrgSlugFromPathname('/acme/doctor/patients/5')).toBe('acme');
  });

  it('returns null for reserved (non-org) first segments', () => {
    expect(getOrgSlugFromPathname('/signin')).toBeNull();
    expect(getOrgSlugFromPathname('/superadmin')).toBeNull();
    expect(getOrgSlugFromPathname('/forgot-password')).toBeNull();
  });

  it('returns null for the root path', () => {
    expect(getOrgSlugFromPathname('/')).toBeNull();
    expect(getOrgSlugFromPathname('')).toBeNull();
  });
});

/**
 * FLAG-210 — a patient has no organisation, and every patient route needed one.
 *
 * `GET /auth/me/` returns `"organization": null` for a patient, and that is
 * CORRECT: records move with the patient between facilities (`CLAUDE.md` §1), so
 * a patient belongs to no single org. But this function built `/${orgSlug}/patient`
 * and the only route that existed was `/[slug]/patient`, so `SigninForm` refused
 * the login rather than navigate to `/undefined/patient`. Patients could not sign
 * in at all.
 *
 * Architecture settled 2026-08-28: the apex is marketing + the patient portal;
 * org staff use `beta.`. So the patient dashboard is slug-less.
 */
describe('FLAG-210 — the patient dashboard is not org-scoped', () => {
  it('returns a slug-less /patient when no org slug is available', () => {
    expect(roleDashboardPath(ROLES.PATIENT)).toBe('/patient');
  });

  it('ignores an org slug even when one is passed', () => {
    // A patient may have been invited by an org, but they do not belong to it.
    // Honouring a slug here would recreate the bug for anyone whose signin form
    // happens to know one.
    expect(roleDashboardPath(ROLES.PATIENT, 'demo-clinic')).toBe('/patient');
  });

  it('never builds an /undefined/ path for a patient', () => {
    expect(roleDashboardPath(ROLES.PATIENT, undefined)).not.toContain('undefined');
  });
});
