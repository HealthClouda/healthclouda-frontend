'use client';
import { useState } from 'react';
import { apiAction } from '@/hooks/use-api';
import { ENDPOINTS } from '@/lib/config';
import { useToast } from '@/store/toast';

export interface DutyState {
  isOnDuty: boolean;
  offDutyOverride: boolean;
}

/**
 * Shared wording for the overview-page status banners (doctor + nurse), kept
 * next to the toggle so the two never drift into describing the states
 * differently. "Off duty (inactive)" is phrased to not read as broken: using
 * the app at all is activity, so this should be rare on screen. No em dashes
 * in on-screen text (owner, 6 Oct; FLAG-070).
 */
export function dutyBannerText(duty: DutyState): string {
  if (duty.isOnDuty) return 'You are on duty. Patients may be assigned to you.';
  if (duty.offDutyOverride) return 'You are off duty. You switched yourself off.';
  return 'You are off duty because you have not used the app for 15 minutes. Use the app to show as on duty again.';
}

interface DutyToggleProps extends DutyState {
  onChange: (next: DutyState) => void;
}

interface ToggleDutyResponse {
  is_on_duty?: boolean;
  off_duty_override?: boolean;
}

/**
 * Build 5 / FLAG-044, reworded by FLAG-070 (owner, 6 Oct).
 *
 * The switch is an OFF switch: clicking it while on duty sends
 * `{is_on_duty: false}`, which marks `off_duty_override`. Clicking it while
 * switched off sends `{is_on_duty: true}`, which clears the override; the
 * person is using the app at that moment, so they show as on duty again.
 * Signing in also clears it (backend FLAG-622), and signing out takes them off
 * (backend FLAG-621).
 *
 * FLAG-070: the state and the action used to share one button, "Go off duty
 * (On duty)", which read as a contradiction. Now a status badge says where
 * you are ("On duty" / "Off duty") and the button says only what a click does
 * ("Go off duty" / "Go on duty"). Both come from the server's answer, never a
 * local flip.
 */
export function DutyToggle({ isOnDuty, offDutyOverride, onChange }: DutyToggleProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handle() {
    setLoading(true);
    try {
      // Overridden → clear it (true). Otherwise → switch off (false).
      const target = offDutyOverride ? true : false;
      const res = (await apiAction(ENDPOINTS.TOGGLE_DUTY, 'POST', {
        is_on_duty: target,
      })) as ToggleDutyResponse | null;
      // The response is authoritative — a local flip renders the wrong state
      // when duty was already changed elsewhere (second tab, other device),
      // the same lesson as the pre-build-5 single-field version of this.
      const nextOverride = typeof res?.off_duty_override === 'boolean' ? res.off_duty_override : !target;
      const nextOnDuty = typeof res?.is_on_duty === 'boolean' ? res.is_on_duty : target && isOnDuty;
      onChange({ isOnDuty: nextOnDuty, offDutyOverride: nextOverride });
      toast.success(
        nextOverride
          ? 'You are now off duty'
          : nextOnDuty
            ? 'You are back on duty'
            : 'You will show as on duty while you use the app',
      );
    } catch {
      toast.error('Failed to update duty status');
    } finally {
      setLoading(false);
    }
  }

  const label = offDutyOverride ? 'Go on duty' : 'Go off duty';
  const stateText = isOnDuty ? 'On duty' : 'Off duty';

  return (
    <div className="inline-flex items-center gap-2">
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1
          ${isOnDuty ? 'bg-emerald-100 text-emerald-700 ring-emerald-200' : 'bg-gray-100 text-gray-600 ring-gray-200'}`}
      >
        <span aria-hidden className={`w-2 h-2 rounded-full ${
          isOnDuty ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]' : 'bg-gray-400'
        }`} />
        {stateText}
      </span>
      <button
        onClick={handle}
        disabled={loading}
        className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-ink ring-1 ring-border
          bg-white hover:bg-page transition-colors disabled:opacity-60 select-none"
      >
        {loading ? 'Updating…' : label}
      </button>
    </div>
  );
}
