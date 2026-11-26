import type { ReactNode } from 'react';
import { EMPTY_VALUE } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value?: number | string;
  icon: ReactNode;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'indigo' | 'teal' | 'slate';
  delta?: string;
  deltaPositive?: boolean;
  loading?: boolean;
  onClick?: () => void;
}

const C = {
  blue:   { bg: 'bg-chip',        text: 'text-primary' },
  green:  { bg: 'bg-success-bg',  text: 'text-success' },
  amber:  { bg: 'bg-warning-bg',  text: 'text-warning' },
  red:    { bg: 'bg-danger-bg',   text: 'text-danger' },
  purple: { bg: 'bg-purple-bg',   text: 'text-purple' },
  indigo: { bg: 'bg-purple-bg',   text: 'text-purple' },
  teal:   { bg: 'bg-info-bg',     text: 'text-info' },
  slate:  { bg: 'bg-row-hairline',text: 'text-text-soft' },
} as const;

export function StatCard({
  label, value, icon, color = 'blue', delta, deltaPositive, loading, onClick,
}: StatCardProps) {
  const c = C[color];

  if (loading) {
    return (
      <div className="bg-white rounded-card border border-border p-4 animate-pulse motion-reduce:animate-none">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2 flex-1">
            <div className="h-3 bg-row-hairline rounded w-24" />
            <div className="h-7 bg-row-hairline rounded w-16" />
            {delta && <div className="h-3 bg-row-hairline rounded w-20" />}
          </div>
          <div className="w-[38px] h-[38px] bg-row-hairline rounded-lg flex-shrink-0" />
        </div>
      </div>
    );
  }

  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      // Compact (w5-b6 group 3c): label and number stacked, icon beside them;
      // the number used to sit under a full-height icon row (~118px card).
      className={`bg-white rounded-card border border-border p-4 text-left w-full shadow-dash-card transition-all flex items-center justify-between gap-3
        ${onClick ? 'hover:border-primary/30 hover:shadow-md cursor-pointer active:scale-[0.98]' : ''}`}
    >
      {/* Spans only: a clickable card is a <button>, which may hold inline content only.
          break-words / truncate keep a long label or number from running under the icon. */}
      <span className="block min-w-0">
      <span className="block text-[11.5px] font-semibold text-text-soft uppercase tracking-wide break-words">{label}</span>
      <span className="block truncate font-body font-black text-[29px] text-ink mt-1.5 tracking-[-0.02em] leading-none tabular-nums">
        {value ?? EMPTY_VALUE}
      </span>
      {delta && (
        <span className={`text-xs mt-1.5 font-semibold flex items-center gap-1 ${
          deltaPositive === true
            ? 'text-success'
            : deltaPositive === false
              ? 'text-danger'
              : 'text-text-soft font-medium'
        }`}>
          {deltaPositive === true && (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 11l-5-5-5 5M12 6v12" />
            </svg>
          )}
          {delta}
        </span>
      )}
      </span>
      <span className={`w-[38px] h-[38px] ${c.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
        <span className={`${c.text} [&>svg]:w-[19px] [&>svg]:h-[19px] [&>svg]:stroke-current`}>{icon}</span>
      </span>
    </Tag>
  );
}
