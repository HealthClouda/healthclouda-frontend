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

export function truncate(str: string, max: number): string {
  return str.length > max ? `${str.slice(0, max)}…` : str;
}

// Role display
export function roleLabel(role: string): string {
  const map: Record<string, string> = {
    DOCTOR: 'Doctor',
    NURSE: 'Nurse',
    RECEPTIONIST: 'Receptionist',
    PATIENT: 'Patient',
    ORGANIZATION_ADMIN: 'Org Admin',
    SUPERADMIN: 'Superadmin',
  };
  return map[role] ?? role;
}