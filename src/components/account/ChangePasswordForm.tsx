'use client';

import { useState } from 'react';
import { apiAction } from '@/hooks/use-api';
import { ClientApiError } from '@/lib/client-api';
import { ENDPOINTS } from '@/lib/config';
import { formInputClass } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { PasswordStrengthMeter, passwordIsValid } from '@/components/forms/PasswordStrengthMeter';

/**
 * FLAG-611 — change your own password while signed in.
 *
 * `POST /auth/change-password/ {old_password, new_password}` (backend #249,
 * FLAG-620) ends the user's OTHER sessions and answers
 * `{message, other_sessions_ended}`. The same backend rule as reset applies
 * (8+ characters, an uppercase letter, a number, a special character), so the
 * same check runs here first.
 *
 * ⚠️ A refusal is DRF's raw field errors — the view returns
 * `serializer.errors` itself, so there is no `{error, details}` wrapper:
 * `{old_password: ['Old password is incorrect']}`. Both shapes are read, so
 * the form keeps working if the view is ever moved onto the shared handler.
 *
 * Used twice: the sidebar's Change password panel (every dashboard) and the
 * forced-change page a flagged user is sent to.
 */

type Field = 'old_password' | 'new_password' | 'confirm';

export function passwordChangedMessage(otherSessionsEnded: number): string {
  if (otherSessionsEnded <= 0) return 'Password changed.';
  const devices = otherSessionsEnded === 1 ? '1 other device' : `${otherSessionsEnded} other devices`;
  return `Password changed. You’ve been signed out on ${devices}.`;
}

function fieldErrorsFrom(err: unknown): Partial<Record<Field, string>> & { form?: string } {
  const data = err instanceof ClientApiError ? (err.data as Record<string, unknown> | null) : null;
  const source = (data?.details as Record<string, unknown> | undefined) ?? data ?? {};
  const first = (v: unknown) => (Array.isArray(v) ? String(v[0]) : typeof v === 'string' ? v : undefined);
  const out: Partial<Record<Field, string>> & { form?: string } = {};
  const oldMsg = first(source.old_password);
  const newMsg = first(source.new_password);
  if (oldMsg) out.old_password = oldMsg;
  if (newMsg) out.new_password = newMsg;
  if (!oldMsg && !newMsg) {
    out.form = first(data?.error) ?? first(data?.detail) ?? (err instanceof Error ? err.message : 'Could not change your password');
  }
  return out;
}

export function ChangePasswordForm({ onChanged, idPrefix = 'change-password' }: {
  onChanged: (otherSessionsEnded: number) => void;
  idPrefix?: string;
}) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>> & { form?: string }>({});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const local: typeof errors = {};
    if (!current) local.old_password = 'Enter your current password';
    if (!passwordIsValid(next)) {
      local.new_password = 'Password must be 8+ characters with an uppercase letter, a number, and a special character';
    }
    if (next !== confirm) local.confirm = 'Passwords do not match';
    setErrors(local);
    if (Object.keys(local).length) return;

    setSaving(true);
    try {
      const res = (await apiAction(ENDPOINTS.CHANGE_PW, 'POST', {
        old_password: current,
        new_password: next,
      })) as { other_sessions_ended?: number } | null;
      onChanged(res?.other_sessions_ended ?? 0);
    } catch (err) {
      setErrors(fieldErrorsFrom(err));
    } finally {
      setSaving(false);
    }
  }

  const label = 'block text-xs font-medium text-text-soft mb-1';
  const fieldError = (f: Field) => errors[f] && (
    <p id={`${idPrefix}-${f}-error`} role="alert" className="mt-1 text-xs font-semibold text-danger">{errors[f]}</p>
  );
  const describe = (f: Field) => (errors[f] ? `${idPrefix}-${f}-error` : undefined);

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="space-y-4">
      <div>
        <label htmlFor={`${idPrefix}-current`} className={label}>Current password</label>
        <input
          id={`${idPrefix}-current`} type="password" autoComplete="current-password"
          value={current} onChange={e => setCurrent(e.target.value)}
          aria-invalid={errors.old_password ? true : undefined} aria-describedby={describe('old_password')}
          className={formInputClass}
        />
        {fieldError('old_password')}
      </div>
      <div>
        <label htmlFor={`${idPrefix}-new`} className={label}>New password</label>
        <input
          id={`${idPrefix}-new`} type="password" autoComplete="new-password"
          value={next} onChange={e => setNext(e.target.value)}
          aria-invalid={errors.new_password ? true : undefined} aria-describedby={describe('new_password')}
          className={formInputClass}
        />
        {fieldError('new_password')}
        <div className="mt-2"><PasswordStrengthMeter password={next} /></div>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-confirm`} className={label}>Confirm new password</label>
        <input
          id={`${idPrefix}-confirm`} type="password" autoComplete="new-password"
          value={confirm} onChange={e => setConfirm(e.target.value)}
          aria-invalid={errors.confirm ? true : undefined} aria-describedby={describe('confirm')}
          className={formInputClass}
        />
        {fieldError('confirm')}
      </div>
      <p className="text-[11px] text-text-soft">
        Changing it signs you out on your other devices. You stay signed in here.
      </p>
      {errors.form && <p role="alert" className="text-xs font-semibold text-danger">{errors.form}</p>}
      <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Change password'}</Button>
    </form>
  );
}
