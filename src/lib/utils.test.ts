import { describe, it, expect } from 'vitest';
import { roleLabel, splitName } from './utils';

/**
 * `roleLabel` is shared by Org Admin, Superadmin, Doctor and the invite flows,
 * and it is fed by two endpoints that disagree about casing:
 *   /auth/users/       -> uppercase RoleEnum   ("ORGANIZATION_ADMIN")
 *   /org-admin/staff/  -> lowercase            ("org_admin")
 * Before this was fixed the lowercase values fell through the lookup and the
 * Org Admin staff table rendered a Role column of raw `org_admin` / `doctor`.
 */
describe('roleLabel', () => {
  it('humanises the uppercase RoleEnum from /auth/users/', () => {
    expect(roleLabel('ORGANIZATION_ADMIN')).toBe('Org Admin');
    expect(roleLabel('DOCTOR')).toBe('Doctor');
    expect(roleLabel('SUPERADMIN')).toBe('Superadmin');
  });

  it('humanises the lowercase roles from /org-admin/staff/', () => {
    expect(roleLabel('org_admin')).toBe('Org Admin');
    expect(roleLabel('doctor')).toBe('Doctor');
    expect(roleLabel('nurse')).toBe('Nurse');
    expect(roleLabel('receptionist')).toBe('Receptionist');
    expect(roleLabel('patient')).toBe('Patient');
  });

  // Guards the specific trap: case normalisation looks like the fix and isn't.
  // 'org_admin'.toUpperCase() is ORG_ADMIN, which is NOT the canonical
  // ORGANIZATION_ADMIN key, so an uppercasing implementation still misses.
  it('maps org_admin to the ORGANIZATION_ADMIN label, not ORG_ADMIN', () => {
    expect(roleLabel('org_admin')).not.toBe('org_admin');
    expect(roleLabel('org_admin')).toBe(roleLabel('ORGANIZATION_ADMIN'));
  });

  it('falls back to the raw value for a role it does not know', () => {
    expect(roleLabel('PHARMACIST')).toBe('PHARMACIST');
  });
});

describe('splitName', () => {
  it('takes the first two whitespace-separated parts', () => {
    expect(splitName('Ada Bello')).toEqual({ firstName: 'Ada', lastName: 'Bello' });
    // Third and later parts are dropped — the initials are A + G, which is what
    // a 28px avatar circle shows.
    expect(splitName('Ada Grace Bello')).toEqual({ firstName: 'Ada', lastName: 'Grace' });
  });

  it('survives an absent or empty name', () => {
    expect(splitName(undefined)).toEqual({ firstName: undefined, lastName: undefined });
    expect(splitName('   ')).toEqual({ firstName: undefined, lastName: undefined });
  });
});
