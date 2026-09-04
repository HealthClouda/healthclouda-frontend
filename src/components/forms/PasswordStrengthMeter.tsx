'use client';

import { ReqMetIcon, ReqUnmetIcon } from './AuthIcons';

// Backend password rule (FRONTEND_HANDOFF §2): ≥8 chars, ≥1 uppercase, ≥1 digit,
// ≥1 special. Shared by the strength meter UI and the reset/set-password schemas
// so validation and the live requirement ticks always agree.
export interface PasswordChecks {
  len: boolean;
  upper: boolean;
  number: boolean;
  special: boolean;
}

export function passwordChecks(pw: string): PasswordChecks {
  return {
    len: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    number: /[0-9]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
}

export function passwordIsValid(pw: string): boolean {
  const c = passwordChecks(pw);
  return c.len && c.upper && c.number && c.special;
}

const REQS: { key: keyof PasswordChecks; label: string }[] = [
  { key: 'len', label: 'At least 8 characters' },
  { key: 'upper', label: 'One uppercase letter' },
  { key: 'number', label: 'One number' },
  { key: 'special', label: 'One special character' },
];

const LEVELS = [
  { label: 'Weak', color: '#dc2626' },
  { label: 'Weak', color: '#dc2626' },
  { label: 'Fair', color: '#f59e0b' },
  { label: 'Good', color: '#0075ff' },
  { label: 'Strong', color: '#16a34a' },
];

interface Props {
  password: string;
}

export function PasswordStrengthMeter({ password }: Props) {
  if (!password) return null;

  const checks = passwordChecks(password);
  const score = Object.values(checks).filter(Boolean).length; // 0–4
  const { label, color } = LEVELS[score];
  const missing = REQS.filter((r) => !checks[r.key]).map((r) =>
    r.key === 'len'
      ? '8+ characters'
      : r.key === 'upper'
      ? 'an uppercase letter'
      : r.key === 'number'
      ? 'a number'
      : 'a special character',
  );
  // "a", "a and b", "a, b and c"
  const missingText =
    missing.length <= 1
      ? missing.join('')
      : `${missing.slice(0, -1).join(', ')} and ${missing[missing.length - 1]}`;
  const helper = score === 4 ? 'Strong password' : `${label} — add ${missingText}`;

  return (
    <div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#e5e7eb]">
        <div
          className="h-full rounded-full transition-all duration-200"
          style={{ width: `${Math.max(score, 0.5) * 25}%`, background: color }}
        />
      </div>
      <div className="mt-[5px] text-xs text-[#6b7280]">{helper}</div>
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
        {REQS.map((r) => (
          <div
            key={r.key}
            className={`flex items-center gap-1.5 text-xs ${checks[r.key] ? 'text-[#16a34a]' : 'text-[#9ca3af]'}`}
          >
            {checks[r.key] ? <ReqMetIcon /> : <ReqUnmetIcon />}
            {r.label}
          </div>
        ))}
      </div>
    </div>
  );
}
