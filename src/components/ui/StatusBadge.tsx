type BadgeColor = { bg: string; text: string };

const COLORS: Record<string, BadgeColor> = {
  // Success — positive / active
  ACTIVE:       { bg: 'bg-success-bg', text: 'text-success' },
  COMPLETED:    { bg: 'bg-success-bg', text: 'text-success' },
  APPROVED:     { bg: 'bg-success-bg', text: 'text-success' },
  DISPENSED:    { bg: 'bg-success-bg', text: 'text-success' },
  ON_DUTY:      { bg: 'bg-success-bg', text: 'text-success' },
  AVAILABLE:    { bg: 'bg-success-bg', text: 'text-success' },
  VERIFIED:     { bg: 'bg-success-bg', text: 'text-success' },
  GRANTED:      { bg: 'bg-success-bg', text: 'text-success' },

  // Info — scheduled / informational
  SCHEDULED:    { bg: 'bg-info-bg', text: 'text-info' },
  ADMITTED:     { bg: 'bg-info-bg', text: 'text-info' },

  // Warning — pending / awaiting
  PENDING:      { bg: 'bg-warning-bg', text: 'text-warning' },
  AWAITING:     { bg: 'bg-warning-bg', text: 'text-warning' },

  // Warning (stronger) — needs attention but not yet a failure
  NO_SHOW:      { bg: 'bg-warning-bg', text: 'text-warning' },
  MAINTENANCE:  { bg: 'bg-warning-bg', text: 'text-warning' },
  OCCUPIED:     { bg: 'bg-warning-bg', text: 'text-warning' },
  SUSPENDED:    { bg: 'bg-warning-bg', text: 'text-warning' },

  // Danger — negative / cancelled
  CANCELLED:    { bg: 'bg-danger-bg', text: 'text-danger' },
  DENIED:       { bg: 'bg-danger-bg', text: 'text-danger' },
  REVOKED:      { bg: 'bg-danger-bg', text: 'text-danger' },
  INACTIVE:     { bg: 'bg-danger-bg', text: 'text-danger' },

  // Neutral — closed / off
  CLOSED:       { bg: 'bg-row-hairline', text: 'text-text-mid' },
  OFF_DUTY:     { bg: 'bg-row-hairline', text: 'text-text-mid' },
  DISCHARGED:   { bg: 'bg-row-hairline', text: 'text-text-mid' },
};

const FALLBACK: BadgeColor = { bg: 'bg-row-hairline', text: 'text-text-mid' };

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
    <span className={`inline-flex items-center px-[11px] py-[3px] rounded-full text-[11px] font-bold ${bg} ${text}`}>
      {label ?? labelFor(status)}
    </span>
  );
}
