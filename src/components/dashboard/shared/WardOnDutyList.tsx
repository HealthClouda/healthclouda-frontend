'use client';

import { useState } from 'react';
import { SlidePanel } from '@/components/ui/SlidePanel';
import { FormField, formInputClass } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { useApi, apiAction } from '@/hooks/use-api';
import { useToast } from '@/store/toast';
import { ENDPOINTS } from '@/lib/config';
import type { Shift, Paginated } from '@/types/dashboard';

// ─── "Who's on this ward now" + handover (build 6, FLAG-046) ──────
//
// Shared so the same query shape and handover flow can be reused wherever a
// ward is displayed (today: the Nurse dashboard's Ward Overview page).
//
// Deliberately queries `?ward_id=<id>&current=true` on the server rather than
// fetching every shift in the org and filtering client-side — a ward board
// showing several wards must not turn into an unbounded client-side scan of
// the whole rota's history to answer "who is here right now".
//
// ⚠️ DISPLAY (+ optional handover) ONLY. This component never disables or
// hides admit/discharge/accept controls anywhere else on the page — per the
// owner's 2026-09-17 decision the rota NAMES and ROUTES, it never GATES care.
// A nurse with no row here can still do everything a rostered nurse can; see
// the positive-control test in NurseDashboard.test.tsx that asserts this.
export function WardOnDutyList({ wardId, currentUserId }: { wardId: string; currentUserId: string }) {
  const { data, loading, error, refetch } =
    useApi<Paginated<Shift>>(`${ENDPOINTS.SHIFTS}?ward_id=${wardId}&current=true`);
  const shifts = data?.results ?? [];
  const [handoverFor, setHandoverFor] = useState<Shift | null>(null);

  if (loading) {
    return <p className="mt-3 pt-3 border-t border-border text-[11px] text-text-soft">Checking who&apos;s on…</p>;
  }
  if (error) {
    return <p className="mt-3 pt-3 border-t border-border text-[11px] text-danger">Could not load who&apos;s on this ward.</p>;
  }
  if (!shifts.length) {
    return <p className="mt-3 pt-3 border-t border-border text-[11px] text-text-soft">No nurse currently rostered on this ward.</p>;
  }

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <p className="text-[11px] font-semibold text-text-soft mb-1.5">On this ward now</p>
      <ul className="space-y-1">
        {shifts.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-2">
            <span className="text-[11.5px] text-ink truncate">{s.nurse_name}</span>
            <span className="flex items-center gap-1.5 flex-shrink-0">
              {s.is_in_charge && (
                <span className="inline-flex items-center px-[9px] py-[2px] rounded-full text-[10px] font-bold bg-chip text-primary">
                  In charge
                </span>
              )}
              {/* Only the signed-in nurse who IS the in-charge nurse on THIS
                  shift sees the control — never another rostered nurse, and
                  never when nobody is in charge yet. */}
              {s.is_in_charge && s.nurse === currentUserId && (
                <button
                  type="button"
                  onClick={() => setHandoverFor(s)}
                  className="text-[10.5px] font-semibold text-primary hover:underline"
                >
                  Hand over
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>

      <HandoverPanel
        shift={handoverFor}
        wardShifts={shifts}
        currentUserId={currentUserId}
        onClose={() => setHandoverFor(null)}
        onDone={() => { setHandoverFor(null); refetch(); }}
      />
    </div>
  );
}

function HandoverPanel({
  shift, wardShifts, currentUserId, onClose, onDone,
}: {
  shift: Shift | null;
  wardShifts: Shift[];
  currentUserId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [nurseId, setNurseId] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Only nurses ALSO currently rostered on this ward are offered — handing
  // over to someone not on the ward is exactly the 400 the backend guards
  // against ("the admin must add her first"). Excludes the caller herself.
  const candidates = wardShifts.filter((s) => s.nurse !== currentUserId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!shift || !nurseId || saving) return;
    setSaving(true);
    setFormError(null);
    try {
      await apiAction(ENDPOINTS.SHIFT_HAND_OVER(shift.id), 'POST', { nurse_id: nurseId });
      toast.success('Handed over');
      onDone();
    } catch (err) {
      // The contract's 400 (not rostered) and 403 (not the in-charge nurse or
      // an admin) both arrive as a FLAT body ({"error": …} / {"detail": …}) —
      // no `details` map to key into, unlike the admission/discharge field
      // errors elsewhere in this app. `ClientApiError`'s own `.message`
      // (built in `errorMessage()`, client-api.ts) already reads both shapes,
      // so there is nothing else to parse here.
      setFormError(err instanceof Error ? err.message : 'Could not hand over this shift');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SlidePanel
      open={!!shift}
      onClose={onClose}
      title="Hand over"
      subtitle={shift?.ward_name}
      footer={
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-soft hover:text-ink">Cancel</button>
          <Button type="submit" form="shift-handover" disabled={!nurseId || saving} loading={saving}>
            Hand over
          </Button>
        </div>
      }
    >
      <form id="shift-handover" onSubmit={submit} className="space-y-4">
        {formError && (
          <p role="alert" className="text-xs font-semibold text-danger bg-danger-bg border border-danger/30 rounded-lg px-3 py-2.5">
            {formError}
          </p>
        )}
        {candidates.length === 0 ? (
          <p className="text-xs text-text-soft">No other nurse is currently rostered on this ward to hand over to.</p>
        ) : (
          <FormField label="Hand in charge to">
            <select className={formInputClass} value={nurseId} onChange={(e) => setNurseId(e.target.value)}>
              <option value="">Select a nurse…</option>
              {candidates.map((s) => <option key={s.nurse} value={s.nurse}>{s.nurse_name}</option>)}
            </select>
          </FormField>
        )}
      </form>
    </SlidePanel>
  );
}
