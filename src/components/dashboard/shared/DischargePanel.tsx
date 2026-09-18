'use client';

import { useState } from 'react';
import { formInputClass } from '@/components/ui/FormField';
import { SlidePanel } from '@/components/ui/SlidePanel';
import { apiAction } from '@/hooks/use-api';
import { useToast } from '@/store/toast';
import { ENDPOINTS } from '@/lib/config';

// ─── Discharge (shared by NurseDashboard and DoctorDashboard) ─────
//
// Extracted 2026-09-16 (Qeeyat's #150 review) — this used to be TWO copies
// (NurseDashboard.tsx / DoctorDashboard.tsx), which is exactly how FLAG-242
// happened: the same `<input type="datetime-local">` -> raw-string-to-server
// bug had to be found and fixed in one file, then found again in the other.
// One module now, so the fix lands once and cannot drift a second time.
//
// Verified against backend source (`DischargeSerializer`, `discharge_patient()`,
// apps/ward/serializers.py + services.py): `discharge_outcome`, `destination`,
// `deceased_at`, `discovered_at` are real fields, not contract-only.
// AGAINST_MEDICAL_ADVICE has no `reason`/`witnessed_by` field at all — the
// medical advisor's 2026-09-13 answer made the signature `discharged_by`'s
// own role (DOCTOR-only), not a second free-text field.
//
// The outcome list is declared exactly ONCE — value, label, tone, and which
// extra fields it requires — so correcting it is a one-place edit.
export interface DischargeExtraField { key: string; label: string; type: 'text' | 'datetime-local' }
export interface DischargeOutcomeConfig {
  value: string;
  label: string;
  // 'somber' gets NO green, NO "success" language, NO checkmark — a
  // DECEASED discharge must never read like the others.
  tone: 'neutral' | 'caution' | 'somber';
  extraFields: DischargeExtraField[];
}
export const DISCHARGE_OUTCOMES: DischargeOutcomeConfig[] = [
  { value: 'ROUTINE', label: 'Routine discharge', tone: 'neutral', extraFields: [] },
  {
    value: 'TRANSFERRED_OUT', label: 'Transferred out', tone: 'neutral',
    extraFields: [{ key: 'destination', label: 'Destination', type: 'text' }],
  },
  {
    // No extra fields at all — the (optional) reason reuses the discharge
    // summary textarea below; there is no signature field, the signer is
    // whichever account submits this (role-gated on the backend — see
    // `outcomesAllowedForRole` below).
    value: 'AGAINST_MEDICAL_ADVICE', label: 'Against medical advice', tone: 'caution',
    extraFields: [],
  },
  {
    value: 'ABSCONDED', label: 'Absconded', tone: 'caution',
    extraFields: [{ key: 'discovered_at', label: 'Discovered at', type: 'datetime-local' }],
  },
  {
    value: 'DECEASED', label: 'Deceased', tone: 'somber',
    extraFields: [{ key: 'deceased_at', label: 'Time of death', type: 'datetime-local' }],
  },
];

export type DischargeActorRole = 'NURSE' | 'DOCTOR';

// ─── Build 4 (FLAG-045) — who may pick which outcome, in ONE place ────────
//
// Owner's decision, 2026-09-17 (backend FLAG-592/FLAG-574): a nurse may
// record ABSCONDED and DECEASED on her own authority — both are things
// found, not decided, usually at night when no doctor is reachable — but
// ROUTINE / TRANSFERRED_OUT / AGAINST_MEDICAL_ADVICE are all a doctor's
// call, not hers. Both outcomes a nurse CAN record are also flagged
// `needs_doctor_review` server-side, so a doctor reviews them the next
// morning (the pending-reviews section on the doctor dashboard).
//
// This used to be a second boolean living beside AGAINST_MEDICAL_ADVICE's
// own role gate (`canRecordAgainstMedicalAdvice`) — exactly the shape that
// let FLAG-592 happen: the backend only enforced "doctor only" for AMA,
// leaving every other outcome open to a nurse. One function, one list, so a
// role's permitted outcomes cannot drift outcome-by-outcome again.
export function outcomesAllowedForRole(role: DischargeActorRole): string[] {
  if (role === 'DOCTOR') return DISCHARGE_OUTCOMES.map(o => o.value);
  return ['ABSCONDED', 'DECEASED'];
}

// FLAG-242 — a `datetime-local` input's value ("2026-09-15T10:00") carries no
// timezone. The backend runs `TIME_ZONE='UTC'`, `USE_TZ=True`, and
// `DischargeSerializer.deceased_at`/`discovered_at` are plain `DateTimeField`s,
// so DRF makes a naive value aware IN THE SERVER'S ZONE — 10:00 entered in
// Lagos (WAT, UTC+1) was stored as 10:00 UTC, i.e. 11:00 local. A legal
// record (time of death), wrong by an hour, with no error anywhere.
//
// `new Date(value)` parses a zone-less "YYYY-MM-DDTHH:mm" string as LOCAL
// time (this is standard JS date-string parsing, not a browser quirk), so
// `.toISOString()` converts it to the correct UTC instant with an explicit
// `Z` offset — which is exactly what DRF's `DateTimeField` needs to stop
// guessing. Only applied to `datetime-local` fields; `destination` (a plain
// text field) passes through unchanged.
export function toDischargePayloadValue(field: DischargeExtraField, rawValue: string): string {
  if (field.type !== 'datetime-local') return rawValue;
  const asDate = new Date(rawValue);
  return Number.isNaN(asDate.getTime()) ? rawValue : asDate.toISOString();
}

export interface DischargeAdmission {
  id: string;
  patient: { first_name: string; last_name: string };
}

export function DischargePanel({
  admission,
  onClose,
  onDischarged,
  role,
  idPrefix,
  readError,
}: {
  admission: DischargeAdmission | null;
  onClose: () => void;
  onDischarged: () => void;
  // The single source of which outcomes this form offers — see
  // `outcomesAllowedForRole` above. This screen still handles a 400 from the
  // backend gracefully (`readError` below) in case the allowed-outcomes list
  // here and the backend's own role check ever disagree, but the disallowed
  // options are not offered in the first place, not offered-then-blocked.
  role: DischargeActorRole;
  // Keeps DOM ids unique when both dashboards' tests/markup could otherwise
  // collide (e.g. 'discharge' for the nurse form, 'doctor-discharge' here).
  idPrefix: string;
  // The two write paths read errors differently: the nurse's admit flow
  // (elsewhere in NurseDashboard.tsx) has a `details.field`/409 reader this
  // discharge endpoint never returns — `AdmissionViewSet.discharge` wraps
  // every `ValueError` as a flat `{error: "..."}`, never `details`. Callers
  // pass their own reader rather than this module guessing the shape.
  readError: (err: unknown, fallback: string) => string;
}) {
  const { toast } = useToast();
  const allowedOutcomes = outcomesAllowedForRole(role);
  const availableOutcomes = DISCHARGE_OUTCOMES.filter(o => allowedOutcomes.includes(o.value));
  const [outcome, setOutcome] = useState<string>(availableOutcomes[0]?.value ?? DISCHARGE_OUTCOMES[0].value);
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState('');
  const [instructions, setInstructions] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const outcomeConfig = DISCHARGE_OUTCOMES.find(o => o.value === outcome) ?? DISCHARGE_OUTCOMES[0];
  // Defence in depth only — the select below never offers a disallowed
  // outcome, so this should be unreachable in practice. Kept in case the
  // allowed-outcomes list and the backend's own role check ever disagree.
  const outcomeBlockedForRole = !allowedOutcomes.includes(outcome);
  const missingRequired = outcomeBlockedForRole || outcomeConfig.extraFields.some(f => !extra[f.key]?.trim());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!admission || saving || missingRequired) return;
    setSaving(true);
    setFormError(null);
    try {
      const payload: Record<string, string> = { discharge_outcome: outcome };
      // The AMA reason lives here, not as a separate required field. Optional
      // for every outcome, including AMA.
      if (summary.trim()) payload.discharge_summary = summary.trim();
      if (instructions.trim()) payload.discharge_instructions = instructions.trim();
      for (const f of outcomeConfig.extraFields) {
        payload[f.key] = toDischargePayloadValue(f, extra[f.key].trim());
      }

      await apiAction(ENDPOINTS.ADMISSION_DISCHARGE(admission.id), 'POST', payload);

      const name = `${admission.patient.first_name} ${admission.patient.last_name}`;
      // A nurse recording ABSCONDED/DECEASED leaves this admission flagged
      // `needs_doctor_review` server-side — say so here, not silently, so
      // she knows it isn't the end of the record.
      const pendingReviewSuffix = role === 'NURSE' && (outcome === 'ABSCONDED' || outcome === 'DECEASED')
        ? ' Awaiting doctor confirmation.'
        : '';
      // Never `toast.success` for DECEASED — success toasts render green
      // with a checkmark, which this outcome must never look like.
      if (outcome === 'DECEASED') {
        toast.info(`Recorded: ${name} — deceased.${pendingReviewSuffix}`);
      } else if (outcome === 'AGAINST_MEDICAL_ADVICE' || outcome === 'ABSCONDED') {
        toast.warning(`${name} discharged — ${outcomeConfig.label.toLowerCase()}.${pendingReviewSuffix}`);
      } else {
        toast.success(`${name} discharged`);
      }
      onDischarged();
      onClose();
    } catch (err) {
      setFormError(readError(err, 'Failed to discharge patient'));
    } finally {
      setSaving(false);
    }
  }

  const formId = `${idPrefix}-patient`;

  return (
    <SlidePanel
      open={!!admission}
      onClose={onClose}
      title="Discharge patient"
      subtitle={admission ? `${admission.patient.first_name} ${admission.patient.last_name}` : undefined}
      footer={
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-soft hover:text-ink">Cancel</button>
          <button
            type="submit"
            form={formId}
            disabled={saving || missingRequired}
            className={`px-4 py-2 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors ${
              outcomeConfig.tone === 'somber' ? 'bg-ink hover:opacity-90' : 'bg-primary hover:bg-primary-dark'
            }`}
          >
            {saving ? 'Saving…' : outcomeConfig.tone === 'somber' ? 'Record outcome' : 'Discharge'}
          </button>
        </div>
      }
    >
      <form id={formId} onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor={`${idPrefix}-outcome`} className="block text-xs font-medium text-text-soft mb-1">Outcome</label>
          <select
            id={`${idPrefix}-outcome`}
            value={outcome}
            onChange={e => { setOutcome(e.target.value); setExtra({}); }}
            className={formInputClass}
          >
            {availableOutcomes.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {outcomeConfig.tone === 'somber' && (
          <p role="alert" className="text-xs font-semibold text-ink bg-row-hover border border-border rounded-lg px-3 py-2.5">
            This records the patient as deceased. It closes the episode and frees the bed.
          </p>
        )}

        {role === 'NURSE' && (outcome === 'ABSCONDED' || outcome === 'DECEASED') && (
          <p role="status" className="text-xs font-semibold text-warning-strong bg-warning-bg border border-warning/30 rounded-lg px-3 py-2.5">
            A doctor reviews this the next morning — it stays flagged for review until one does.
          </p>
        )}

        {outcomeBlockedForRole && (
          <p role="alert" className="text-xs font-semibold text-warning-strong bg-warning-bg border border-warning/30 rounded-lg px-3 py-2.5">
            Only a doctor can complete this kind of discharge — the backend now attests this to
            the signed-in account, and a nurse account cannot be the signer. Ask an on-duty
            doctor to record this discharge.
          </p>
        )}

        {!outcomeBlockedForRole && outcome === 'AGAINST_MEDICAL_ADVICE' && (
          <p role="status" className="text-xs font-semibold text-warning-strong bg-warning-bg border border-warning/30 rounded-lg px-3 py-2.5">
            This is recorded under your name as the signing doctor — the backend attests an
            against-medical-advice discharge to the account that submits it, not a separate
            signature field (FLAG-042).
          </p>
        )}

        {outcomeConfig.extraFields.map(f => (
          <div key={f.key}>
            <label htmlFor={`${idPrefix}-${f.key}`} className="block text-xs font-medium text-text-soft mb-1">{f.label}</label>
            <input
              id={`${idPrefix}-${f.key}`}
              type={f.type}
              value={extra[f.key] ?? ''}
              onChange={e => setExtra(v => ({ ...v, [f.key]: e.target.value }))}
              className={formInputClass}
            />
          </div>
        ))}

        <div>
          <label htmlFor={`${idPrefix}-summary`} className="block text-xs font-medium text-text-soft mb-1">
            {/* Reused by AMA as the (optional) reason. */}
            {outcome === 'AGAINST_MEDICAL_ADVICE' ? 'Reason (optional)' : 'Discharge summary (optional)'}
          </label>
          <textarea id={`${idPrefix}-summary`} rows={2} value={summary} onChange={e => setSummary(e.target.value)} className={`${formInputClass} h-auto py-2`} />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-instructions`} className="block text-xs font-medium text-text-soft mb-1">Discharge instructions (optional)</label>
          <textarea id={`${idPrefix}-instructions`} rows={2} value={instructions} onChange={e => setInstructions(e.target.value)} className={`${formInputClass} h-auto py-2`} />
        </div>

        {formError && <p role="alert" className="text-xs font-semibold text-danger">{formError}</p>}
      </form>
    </SlidePanel>
  );
}
