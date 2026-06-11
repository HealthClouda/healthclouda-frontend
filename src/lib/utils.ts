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