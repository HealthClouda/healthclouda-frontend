'use client';
import { useState } from 'react';
import { apiAction } from '@/hooks/use-api';
import { ENDPOINTS } from '@/lib/config';
import { useToast } from '@/store/toast';

interface DutyToggleProps {
  isOnDuty: boolean;
  onToggle: (next: boolean) => void;
}

export function DutyToggle({ isOnDuty, onToggle }: DutyToggleProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handle() {
    setLoading(true);
    try {
      // The response is authoritative — `{message, is_on_duty, duty_toggled_at}`
      // (verified live). A local flip renders the opposite of the real state
      // when duty was already toggled elsewhere (second tab, other device).
      const res = (await apiAction(ENDPOINTS.TOGGLE_DUTY, 'POST')) as { is_on_duty?: boolean } | null;
      const next = typeof res?.is_on_duty === 'boolean' ? res.is_on_duty : !isOnDuty;
      onToggle(next);
      toast.success(next ? 'You are now on duty' : 'You are now off duty');
    } catch {
      toast.error('Failed to update duty status');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handle}
      disabled={loading}
      title={isOnDuty ? 'Click to go off duty' : 'Click to go on duty'}
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
      {loading ? 'Updating…' : isOnDuty ? 'On Duty' : 'Off Duty'}
    </button>
  );
}