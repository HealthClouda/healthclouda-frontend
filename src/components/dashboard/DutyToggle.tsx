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
 * Shared wording for the overview-page status banners (doctor + nurse) — kept
 * next to the toggle so the two never drift into describing the states
 * differently. "Off duty (inactive)" is phrased to not read as broken: using
 * the app at all is activity, so this should be rare on screen.
 */
export function dutyBannerText(duty: DutyState): string {
  if (duty.isOnDuty) return 'You are on duty — patients may be assigned to you.';
  if (duty.offDutyOverride) return 'You are off duty — you switched yourself off.';
  return 'You are off duty — no recent activity. Use the app to show as on duty again.';
}

interface DutyToggleProps extends DutyState {
  onChange: (next: DutyState) => void;
}

interface ToggleDutyResponse {
  is_on_duty?: boolean;
  off_duty_override?: boolean;
}

/**
 * Build 5 / FLAG-044 — the switch stopped being an on/off pair.
 *
 * It is now an OFF switch only: clicking it while on duty sends
 * `{is_on_duty: false}`, which marks `off_duty_override`. Clicking it while
 * overridden sends `{is_on_duty: true}`, which only CLEARS the override —
 * being on duty again is decided by activity (the heartbeat), not by this
 * click. The label always says what the click will DO ("Go off duty" /
 * "Back on duty"), never what state it claims to reach, so it cannot promise
 * "on duty" to someone who is about to walk away and sit idle.
 *
 * Renders three states from the two server fields, matched to the contract:
 *  - **On duty** — active in the last 15 minutes AND not switched off.
 *  - **Off duty (you switched off)** — `off_duty_override: true`.
 *  - **Off duty (inactive)** — neither on duty nor overridden; should be
 *    rare on screen, since using the app is itself activity.
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
          : 'Off-duty switch cleared — you will show as on duty while active',
      );
    } catch {
      toast.error('Failed to update duty status');
    } finally {
      setLoading(false);
    }
  }

  const label = offDutyOverride ? 'Back on duty' : 'Go off duty';
  const stateText = isOnDuty
    ? 'On duty'
    : offDutyOverride
      ? 'Off duty — you switched off'
      : 'Off duty — inactive';

  return (
    <button
      onClick={handle}
      disabled={loading}
      title={offDutyOverride ? 'Click to clear your off-duty switch' : 'Click to go off duty'}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold
        transition-all disabled:opacity-60 select-none
        ${isOnDuty
          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 ring-1 ring-emerald-200'
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200 ring-1 ring-gray-200'
        }`}
    >
      <span className={`w-2 h-2 rounded-full ${
        isOnDuty ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]' : 'bg-gray-400'
      }`} />
      {loading ? 'Updating…' : label}
      <span className="text-[10px] font-normal opacity-75">({stateText})</span>
    </button>
  );
}
