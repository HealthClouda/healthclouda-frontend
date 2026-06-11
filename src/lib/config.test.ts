import { describe, it, expect } from 'vitest';
import { ENDPOINTS, ROLES } from './config';

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