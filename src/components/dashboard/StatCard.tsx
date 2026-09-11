import type { ReactNode } from 'react';

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
      <div className="bg-white rounded-card border border-border p-5 space-y-3 animate-pulse">
        <div className="flex items-start justify-between gap-3">
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
      className={`bg-white rounded-card border border-border p-5 text-left w-full shadow-dash-card transition-all
        ${onClick ? 'hover:border-primary/30 hover:shadow-md cursor-pointer active:scale-[0.98]' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11.5px] font-semibold text-text-soft uppercase tracking-wide">{label}</span>
        <span className={`w-[38px] h-[38px] ${c.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
          <span className={`${c.text} [&>svg]:w-[19px] [&>svg]:h-[19px] [&>svg]:stroke-current`}>{icon}</span>
        </span>
      </div>
      <p className="font-body font-black text-[29px] text-ink mt-2.5 tracking-[-0.02em] leading-none tabular-nums">
        {value ?? '—'}
      </p>
      {delta && (
        <p className={`text-xs mt-2.5 font-semibold flex items-center gap-1 ${
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
        </p>
      )}
    </Tag>
  );
}
