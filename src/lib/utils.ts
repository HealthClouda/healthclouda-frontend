// Date / time
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Names a person embedded in an API payload as a nested object.
 *
 * Staff-facing appointment payloads nest `patient`/`doctor`/`booked_by` objects;
 * the flat `patient_name` / `doctor_name` strings several components used to
 * read never existed, so those cells rendered blank against real data
 * (FLAG-213). Returns the em-dash placeholder rather than an empty string so a
 * missing person looks deliberate instead of looking like a broken cell.
 */
export function personName(
  p?: { first_name?: string; last_name?: string } | null,
): string {
  if (!p) return '—';
  const full = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
  return full || '—';
}

/**
 * True when an ISO timestamp falls on the viewer's local calendar day.
 *
 * Exists because "today" filters have to be done client-side: `?today=true` was
 * invented and DRF ignores it silently (FLAG-004), so asking the server for
 * today's appointments returned every appointment under a heading that said
 * Today. Compares local date parts, not UTC — a 23:00 WAT appointment is still
 * today for the person looking at the screen.
 */
export function isToday(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// String
export function initials(firstName?: string, lastName?: string): string {
  const f = firstName?.[0]?.toUpperCase() ?? '';
  const l = lastName?.[0]?.toUpperCase() ?? '';
  return `${f}${l}` || '?';
}

export function fullName(firstName?: string, lastName?: string): string {
  return [firstName, lastName].filter(Boolean).join(' ') || 'Unknown';
}

/**
 * Split a single `full_name` into the { firstName, lastName } pair `Avatar`
 * and `initials` expect. Several org-admin endpoints return one combined name
 * rather than the two fields `/auth/users/` gives, so without this the avatar
 * received `undefined` and fell back to '?'.
 *
 * Takes the FIRST TWO whitespace-separated parts and drops the rest, so
 * "Ada Grace Bello" → { firstName: 'Ada', lastName: 'Grace' } and the initials
 * are A + G. Imperfect for multi-part names but stable and never wrong about
 * the first initial, which is what a 28px circle actually shows. Note that
 * `lastName` is therefore a middle name for such people — fine for initials,
 * worth remembering before using it as a display surname anywhere.
 */
export function splitName(name?: string): { firstName?: string; lastName?: string } {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0], lastName: parts[1] };
}

export function truncate(str: string, max: number): string {
  return str.length > max ? `${str.slice(0, max)}…` : str;
}

// Role display

/** Keyed by the UPPERCASE `RoleEnum` that `/auth/users/` and `/auth/me/` return. */
const ROLE_LABELS: Record<string, string> = {
  DOCTOR: 'Doctor',
  NURSE: 'Nurse',
  RECEPTIONIST: 'Receptionist',
  PATIENT: 'Patient',
  ORGANIZATION_ADMIN: 'Org Admin',
  SUPERADMIN: 'Superadmin',
};

/**
 * The two endpoints genuinely disagree about role casing: `/auth/users/`
 * returns the uppercase `RoleEnum`, `/org-admin/staff/` returns lowercase
 * (see `OrgStaffMember` in `types/dashboard.ts`). Both reach this function.
 *
 * Case normalisation alone does NOT work, which is why this table is explicit:
 * `'org_admin'.toUpperCase()` is `ORG_ADMIN`, but the canonical key is
 * `ORGANIZATION_ADMIN` — the spellings differ by more than case, so an
 * uppercased lookup still misses and falls through to the raw value. That was
 * the bug: the Org Admin staff table shipped a Role column reading
 * `org_admin` / `doctor`.
 */
const ROLE_ALIASES: Record<string, string> = {
  doctor: 'DOCTOR',
  nurse: 'NURSE',
  receptionist: 'RECEPTIONIST',
  patient: 'PATIENT',
  org_admin: 'ORGANIZATION_ADMIN',
  organization_admin: 'ORGANIZATION_ADMIN',
  superadmin: 'SUPERADMIN',
};

export function roleLabel(role: string): string {
  const canonical = ROLE_ALIASES[role.toLowerCase()] ?? role;
  return ROLE_LABELS[canonical] ?? role;
}