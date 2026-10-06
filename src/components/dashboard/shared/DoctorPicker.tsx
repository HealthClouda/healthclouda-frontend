'use client';

// Shared by the nurse's emergency admission (NurseDashboard) and the doctor's
// hand-over (DoctorDashboard) — both attach a doctor to an admission through
// the same GET /ward/attending-doctors/ list and the same soft on-duty check.

import { formInputClass } from '@/components/ui/FormField';
import { ShimmerRows } from '@/components/ui/Shimmer';
import type { AttendingDoctor } from '@/types/dashboard';

// Optional, and deliberately framed that way (Q2 — attending_doctor is
// PROMPTED, NEVER BLOCKS): the default option reads as a normal outcome,
// not an error state, because for an emergency admission it often is one.
//
// ⚠️ CORRECTED — `restrictToOnDuty` disabling the off-duty `<option>`s was
// itself wrong, not just stale. `_check_attending_doctor_on_duty`
// (apps/ward/serializers.py) is the advisor's real Q2 answer: SOFT,
// warn-and-allow, the same shape as the ward gender rule (FLAG-301) —
// "a night with no on-duty doctor must never refuse an admission outright."
// Disabling the option made the backend's own override unreachable from the
// UI. `restrictToOnDuty` now defaults to `true` only because no caller
// currently needs the old hard-disable behaviour; every real call site
// (EmergencyAdmitForm, HandOverPanel) passes `restrictToOnDuty={false}` and
// handles the resulting 400 with a select → warn → confirm two-step.
export function DoctorPicker({
  id = 'emergency-attending-doctor',
  label = 'Attending doctor',
  helperText,
  restrictToOnDuty = true,
  doctors, loading, error, value, onChange, required = false,
}: {
  id?: string;
  label?: string;
  helperText?: string;
  doctors: AttendingDoctor[] | null;
  loading: boolean;
  error: string | null;
  value: string;
  onChange: (id: string) => void;
  // The emergency admission's picker is never-blocks/optional; the doctor's
  // hand-over panel (DoctorDashboard HandOverPanel) sets this true — a
  // hand-over with no doctor named is not a hand-over.
  required?: boolean;
  restrictToOnDuty?: boolean;
}) {
  const onDuty = (doctors ?? []).filter(d => d.is_on_duty);
  const offDuty = (doctors ?? []).filter(d => !d.is_on_duty);
  const defaultHelperText = restrictToOnDuty
    ? (required
        ? 'Choose the doctor taking over this patient. Only doctors on duty can be selected.'
        : 'Optional. Naming one never blocks this admission. Only doctors on duty can be selected; leave it as-is if none is available.')
    : (required ? 'Choose the doctor.' : 'Optional. Naming one never blocks this admission.');
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-text-soft mb-1">
        {label}
      </label>
      <p className="text-[11px] text-text-soft mb-1">
        {helperText ?? defaultHelperText}
      </p>
      {loading ? <ShimmerRows count={1} /> : error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : (
        <>
          <select
            id={id}
            value={value}
            onChange={e => onChange(e.target.value)}
            className={formInputClass}
          >
            <option value="">{/* FLAG-056: the blank choice means "no doctor named", not "none available". */}
            {required ? 'Select a doctor…' : 'No attending doctor yet'}</option>
            {onDuty.length > 0 && (
              <optgroup label="On duty">
                {onDuty.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
              </optgroup>
            )}
            {offDuty.length > 0 && (
              <optgroup label={restrictToOnDuty ? 'Not on duty (cannot be selected)' : 'Not on duty'}>
                {offDuty.map(d => (
                  <option key={d.id} value={d.id} disabled={restrictToOnDuty}>{d.full_name}</option>
                ))}
              </optgroup>
            )}
          </select>
          {restrictToOnDuty && !loading && onDuty.length === 0 && (
            <p className="text-[11px] text-text-soft mt-1">No doctors are currently on duty.</p>
          )}
        </>
      )}
    </div>
  );
}
