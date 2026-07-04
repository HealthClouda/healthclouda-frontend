import { describe, it, expect } from 'vitest';
import { getOrgSlugFromPathname } from './router';

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
