type BadgeColor = { bg: string; text: string };

const COLORS: Record<string, BadgeColor> = {
  // Green — positive / active
  ACTIVE:       { bg: 'bg-green-100', text: 'text-green-700' },
  COMPLETED:    { bg: 'bg-green-100', text: 'text-green-700' },
  APPROVED:     { bg: 'bg-green-100', text: 'text-green-700' },
  DISPENSED:    { bg: 'bg-green-100', text: 'text-green-700' },
  ON_DUTY:      { bg: 'bg-green-100', text: 'text-green-700' },
  AVAILABLE:    { bg: 'bg-green-100', text: 'text-green-700' },
  VERIFIED:     { bg: 'bg-green-100', text: 'text-green-700' },
  GRANTED:      { bg: 'bg-green-100', text: 'text-green-700' },

  // Blue — scheduled / informational
  SCHEDULED:    { bg: 'bg-blue-100',   text: 'text-blue-700' },
  ADMITTED:     { bg: 'bg-blue-100',   text: 'text-blue-700' },

  // Yellow — pending / awaiting
  PENDING:      { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  AWAITING:     { bg: 'bg-yellow-100', text: 'text-yellow-700' },

  // Orange — warnings
  NO_SHOW:      { bg: 'bg-orange-100', text: 'text-orange-700' },
  MAINTENANCE:  { bg: 'bg-orange-100', text: 'text-orange-700' },
  OCCUPIED:     { bg: 'bg-orange-100', text: 'text-orange-700' },
  SUSPENDED:    { bg: 'bg-orange-100', text: 'text-orange-700' },

  // Red — negative / cancelled
  CANCELLED:    { bg: 'bg-red-100',    text: 'text-red-700' },
  DENIED:       { bg: 'bg-red-100',    text: 'text-red-700' },
  REVOKED:      { bg: 'bg-red-100',    text: 'text-red-700' },
  INACTIVE:     { bg: 'bg-red-100',    text: 'text-red-700' },

  // Gray — closed / neutral / off
  CLOSED:       { bg: 'bg-gray-100',   text: 'text-gray-600' },
  OFF_DUTY:     { bg: 'bg-gray-100',   text: 'text-gray-600' },
  DISCHARGED:   { bg: 'bg-gray-100',   text: 'text-gray-600' },
};

const FALLBACK: BadgeColor = { bg: 'bg-gray-100', text: 'text-gray-600' };

function labelFor(status: string): string {
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface StatusBadgeProps {
  status: string;
  label?: string; // override display label
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const { bg, text } = COLORS[status.toUpperCase()] ?? FALLBACK;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
      {label ?? labelFor(status)}
    </span>
  );
}