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
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   ring: 'ring-blue-100' },
  green:  { bg: 'bg-emerald-50',text: 'text-emerald-600',ring: 'ring-emerald-100' },
  amber:  { bg: 'bg-amber-50',  text: 'text-amber-600',  ring: 'ring-amber-100' },
  red:    { bg: 'bg-red-50',    text: 'text-red-600',    ring: 'ring-red-100' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', ring: 'ring-purple-100' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', ring: 'ring-indigo-100' },
  teal:   { bg: 'bg-teal-50',   text: 'text-teal-600',   ring: 'ring-teal-100' },
  slate:  { bg: 'bg-slate-50',  text: 'text-slate-600',  ring: 'ring-slate-100' },
} as const;

export function StatCard({
  label, value, icon, color = 'blue', delta, deltaPositive, loading, onClick,
}: StatCardProps) {
  const c = C[color];

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3 animate-pulse">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 flex-1">
            <div className="h-3 bg-gray-200 rounded w-24" />
            <div className="h-8 bg-gray-200 rounded w-16" />
            {delta && <div className="h-3 bg-gray-200 rounded w-20" />}
          </div>
          <div className="w-11 h-11 bg-gray-200 rounded-xl flex-shrink-0" />
        </div>
      </div>
    );
  }

  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`bg-white rounded-xl border border-gray-100 p-5 text-left w-full transition-all
        ${onClick ? 'hover:border-gray-200 hover:shadow-md cursor-pointer active:scale-[0.98]' : 'hover:shadow-sm'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1 tabular-nums leading-none">
            {value ?? '—'}
          </p>
          {delta && (
            <p className={`text-xs mt-2 font-medium ${
              deltaPositive === true
                ? 'text-emerald-600'
                : deltaPositive === false
                  ? 'text-red-500'
                  : 'text-gray-400'
            }`}>
              {delta}
            </p>
          )}
        </div>
        <div className={`w-11 h-11 ${c.bg} rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ${c.ring}`}>
          <span className={`${c.text} [&>svg]:w-5 [&>svg]:h-5 [&>svg]:stroke-current`}>{icon}</span>
        </div>
      </div>
    </Tag>
  );
}