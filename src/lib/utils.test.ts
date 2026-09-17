import { describe, it, expect } from 'vitest';
import { roleLabel, splitName, localDateTimeToISOString } from './utils';

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

// FLAG-046 (ward rota, build 6) — the rota's add/edit-shift form uses a
// `datetime-local` input, exactly the shape FLAG-242 already found broken in
// the discharge panel: a zone-less string sent as-is lets the backend (UTC)
// assume ITS zone rather than the browser's.
describe('localDateTimeToISOString', () => {
  it('appends a UTC offset to a zone-less datetime-local value', () => {
    const result = localDateTimeToISOString('2026-09-17T19:00');
    // A bare `datetime-local` value has no 'Z'/offset at all — this is the
    // exact defect this function exists to prevent, so assert on the RAW
    // value first: it must not equal what a naive `JSON.stringify` would send.
    expect(result).not.toBe('2026-09-17T19:00');
    expect(result.endsWith('Z')).toBe(true);
    // The instant is derived from the LOCAL wall-clock reading, not reinterpreted
    // as UTC — round-tripping through Date and back to the machine's own zone
    // must reproduce the same hour/minute the user typed.
    const roundTripped = new Date(result);
    expect(roundTripped.getHours()).toBe(19);
    expect(roundTripped.getMinutes()).toBe(0);
  });

  it('passes through an unparsable value unchanged rather than sending "Invalid Date"', () => {
    expect(localDateTimeToISOString('not-a-date')).toBe('not-a-date');
  });
});
