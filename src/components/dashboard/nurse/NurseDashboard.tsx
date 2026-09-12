'use client';

import { useState } from 'react';
import { DashboardShell, type NavItem } from '@/components/layout/DashboardShell';
import { StatCard } from '@/components/dashboard/StatCard';
import { DutyToggle } from '@/components/dashboard/DutyToggle';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { formInputClass } from '@/components/ui/FormField';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SlidePanel } from '@/components/ui/SlidePanel';
import { useApi, useAllPages, apiAction, usePaginatedList } from '@/hooks/use-api';
import { useToast } from '@/store/toast';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ShimmerRows } from '@/components/ui/Shimmer';
import { Avatar } from '@/components/ui/Avatar';
import { formatDate, timeAgo } from '@/lib/utils';
import { ENDPOINTS } from '@/lib/config';
import { ClientApiError, dataGet } from '@/lib/client-api';
import type { User } from '@/types/auth';
import type {
  NurseStats, NurseAdmission, PatientVitals, Ward, WardBed, Paginated,
  EpisodeListItem, AttendingDoctor, OrgVisiblePatient, EpisodeCreateResponse,
  AdmissionCreateResponse, AdmissionRequest,
} from '@/types/dashboard';
import { URGENCY_OPTIONS, LEVEL_OF_CARE_OPTIONS } from '@/types/dashboard';

function GridIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>; }
function UserIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>; }
function HeartIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>; }
function BedIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>; }
function QueueIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>; }
function PlusIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 4.5v15m7.5-7.5h-15" /></svg>; }
// Admit — a bed with a plus, distinct from the plain BedIcon used for Ward
// Overview so the two nav entries don't read as the same destination.
function AdmitIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25M12 12.75v3M10.5 14.25h3" /></svg>; }
// Inbox tray — the doctor-ordered admission-request queue (Part 2).
function InboxIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" /></svg>; }

const NAV: NavItem[] = [
  { id: 'overview', label: 'Overview',     icon: <GridIcon /> },
  { id: 'patients', label: 'My Patients',  icon: <UserIcon /> },
  { id: 'vitals',   label: 'Vitals',       icon: <HeartIcon /> },
  { id: 'admit',    label: 'Admit Patient',icon: <AdmitIcon /> },
  { id: 'requests', label: 'Admission Requests', icon: <InboxIcon /> },
  { id: 'wards',    label: 'Ward Overview',icon: <BedIcon /> },
];

function PatientCell({ admission }: { admission: NurseAdmission }) {
  const p = admission.patient;
  return (
    <div className="flex items-center gap-2.5">
      <Avatar firstName={p.first_name} lastName={p.last_name} size="sm" />
      <div>
        <div className="text-[13px] font-semibold text-ink">{p.first_name} {p.last_name}</div>
        <div className="text-[11px] text-text-soft font-mono">{p.healthclouda_id}</div>
      </div>
    </div>
  );
}

// Shared by the Overview preview and the My Patients table — the two differed
// only in whether Age/Sex was shown, and had drifted apart in styling.
function admissionColumns(
  onRecordVitals: (a: NurseAdmission) => void,
  opts: {
    showAgeSex?: boolean;
    admittedAsDate?: boolean;
    // Part 2 — only wired on the full My Patients table, not the Overview
    // preview: five action buttons in a five-row preview is noise, not help.
    onDischarge?: (a: NurseAdmission) => void;
    onReassignDoctor?: (a: NurseAdmission) => void;
  } = {},
): DataTableColumn<NurseAdmission>[] {
  return [
    { key: 'patient', header: 'Patient', render: (a) => <PatientCell admission={a} /> },
    ...(opts.showAgeSex
      ? [{
          key: 'agesex',
          header: 'Age / Sex',
          className: 'whitespace-nowrap',
          render: (a: NurseAdmission) => (
            <span className="text-xs text-text-soft">
              {[a.patient.age != null ? `${a.patient.age}y` : null, a.patient.gender, a.patient.blood_type]
                .filter(Boolean).join(' · ') || '—'}
            </span>
          ),
        }]
      : []),
    { key: 'wardbed', header: 'Ward / Bed', className: 'whitespace-nowrap', render: (a) => <span className="text-xs text-text-mid">{wardBedLabel(a)}</span> },
    { key: 'complaint', header: 'Complaint', render: (a) => <span className="text-xs text-text-soft">{a.episode?.chief_complaint || '—'}</span> },
    { key: 'admitted', header: 'Admitted', className: 'whitespace-nowrap', render: (a) => (
      <span className="text-xs text-text-soft">
        {opts.admittedAsDate ? formatDate(a.admitted_at) : timeAgo(a.admitted_at)}
        {opts.admittedAsDate && a.length_of_stay > 0 && <span className="ml-1">({a.length_of_stay}d)</span>}
      </span>
    ) },
    { key: 'vitals', header: 'Vitals', render: (a) => (
      <button
        onClick={() => onRecordVitals(a)}
        className="border border-border rounded-md px-2.5 py-1 text-[11.5px] font-semibold text-primary hover:bg-chip transition-colors whitespace-nowrap"
      >
        Record vitals
      </button>
    ) },
    ...(opts.onDischarge || opts.onReassignDoctor
      ? [{
          key: 'ward-actions',
          header: '',
          className: 'text-right whitespace-nowrap',
          render: (a: NurseAdmission) => (
            <div className="flex items-center justify-end gap-3">
              {opts.onReassignDoctor && (
                <button onClick={() => opts.onReassignDoctor!(a)} className="text-xs font-semibold text-primary-dark hover:underline">
                  Doctor
                </button>
              )}
              {opts.onDischarge && (
                <button onClick={() => opts.onDischarge!(a)} className="text-xs font-semibold text-danger hover:underline">
                  Discharge
                </button>
              )}
            </div>
          ),
        }]
      : []),
  ];
}

function wardBedLabel(a: NurseAdmission): string {
  const parts = [a.ward?.name, a.bed ? `Bed ${a.bed.bed_number}` : null].filter(Boolean);
  return parts.length ? parts.join(' · ') : '—';
}

// ─── Overview ────────────────────────────────────────────────────

function OverviewPage({ stats, onNavigate, onRecordVitals, isOnDuty }: {
  stats: NurseStats | null;
  onNavigate: (p: string) => void;
  onRecordVitals: (a: NurseAdmission) => void;
  isOnDuty: boolean;
}) {
  const { data, loading, error, refetch } =
    useApi<Paginated<NurseAdmission>>(ENDPOINTS.NURSE_MY_PATIENTS + '?page_size=5');
  const admissions = data?.results ?? [];

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${isOnDuty ? 'bg-success-bg border-success/20' : 'bg-chip border-border'}`}>
        <p className={`text-sm font-medium ${isOnDuty ? 'text-success-strong' : 'text-text-soft'}`}>
          {isOnDuty ? 'You are currently on duty and visible to the system.' : 'You are currently off duty.'}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard loading={!stats} label="Active Admissions" value={stats?.active_admissions} icon={<UserIcon />} color="purple" onClick={() => onNavigate('patients')} />
        <StatCard loading={!stats} label="Patients in Queue" value={stats?.patients_in_queue} icon={<QueueIcon />} color="amber" />
        <StatCard loading={!stats} label="Bed Occupancy" value={stats ? `${stats.occupancy_rate}%` : undefined} icon={<BedIcon />} color="blue"
          delta={stats ? `${stats.occupied_beds} of ${stats.total_beds} beds occupied` : undefined}
          onClick={() => onNavigate('wards')} />
        <StatCard loading={!stats} label="Admitted Today" value={stats?.todays_admissions} icon={<PlusIcon />} color="green"
          delta={stats ? `${stats.todays_discharges} discharged today` : undefined} />
      </div>

      {/* My patients preview → record vitals */}
      <div className="rounded-card border border-border bg-white shadow-dash-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-[13.5px] font-bold text-ink">My Patients</h2>
          <button onClick={() => onNavigate('patients')} className="text-[11.5px] font-semibold text-primary hover:underline">View all</button>
        </div>
        <DataTable
          columns={admissionColumns(onRecordVitals)}
          data={admissions}
          getRowKey={(a) => a.id}
          loading={loading}
          error={error}
          onRetry={refetch}
          emptyTitle="No active admissions"
          emptyDescription="Patients admitted at your organization will appear here."
        />
      </div>
    </div>
  );
}

// ─── Discharge (Part 2) ────────────────────────────────────────────
//
// ⚠️ UNVERIFIED — POST /ward/admissions/{id}/discharge/ already exists
// (discharge_summary/discharge_instructions, both optional), but
// `discharge_outcome` and its per-outcome fields are contract-only; see the
// Part 2 note on AdmissionRequest in types/dashboard.ts. Field names for the
// per-outcome extras are the most literal reading of the contract's plain
// English and are the first thing to reconcile against the real serializer.
//
// The outcome list is declared exactly ONCE — value, label, tone, and which
// extra fields it requires — so when the advisor answers Q3 and the real
// shape lands, correcting it is a one-place edit, per the owner's ask.
interface DischargeExtraField { key: string; label: string; type: 'text' | 'datetime-local' }
interface DischargeOutcomeConfig {
  value: string;
  label: string;
  // 'somber' gets NO green, NO "success" language, NO checkmark — the
  // explicit ask: a DECEASED discharge must never read like the others.
  tone: 'neutral' | 'caution' | 'somber';
  extraFields: DischargeExtraField[];
}
const DISCHARGE_OUTCOMES: DischargeOutcomeConfig[] = [
  { value: 'ROUTINE', label: 'Routine discharge', tone: 'neutral', extraFields: [] },
  {
    value: 'TRANSFERRED_OUT', label: 'Transferred out', tone: 'neutral',
    extraFields: [{ key: 'destination', label: 'Destination', type: 'text' }],
  },
  {
    value: 'AGAINST_MEDICAL_ADVICE', label: 'Against medical advice', tone: 'caution',
    extraFields: [
      { key: 'reason', label: 'Reason', type: 'text' },
      { key: 'witnessed_by', label: 'Witnessed by', type: 'text' },
    ],
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

function DischargePanel({ admission, onClose, onDischarged }: {
  admission: NurseAdmission | null;
  onClose: () => void;
  onDischarged: () => void;
}) {
  const { toast } = useToast();
  const [outcome, setOutcome] = useState<string>('ROUTINE');
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState('');
  const [instructions, setInstructions] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const outcomeConfig = DISCHARGE_OUTCOMES.find(o => o.value === outcome) ?? DISCHARGE_OUTCOMES[0];
  const missingRequired = outcomeConfig.extraFields.some(f => !extra[f.key]?.trim());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!admission || saving || missingRequired) return;
    setSaving(true);
    setFormError(null);
    try {
      const payload: Record<string, string> = { discharge_outcome: outcome };
      if (summary.trim()) payload.discharge_summary = summary.trim();
      if (instructions.trim()) payload.discharge_instructions = instructions.trim();
      for (const f of outcomeConfig.extraFields) payload[f.key] = extra[f.key].trim();

      await apiAction(ENDPOINTS.ADMISSION_DISCHARGE(admission.id), 'POST', payload);

      const name = `${admission.patient.first_name} ${admission.patient.last_name}`;
      // Never `toast.success` for DECEASED — the explicit ask is no
      // celebratory/"success" language on that path, and success toasts in
      // this app render green with a checkmark.
      if (outcome === 'DECEASED') {
        toast.info(`Recorded: ${name} — deceased.`);
      } else if (outcome === 'AGAINST_MEDICAL_ADVICE' || outcome === 'ABSCONDED') {
        toast.warning(`${name} discharged — ${outcomeConfig.label.toLowerCase()}.`);
      } else {
        toast.success(`${name} discharged`);
      }
      onDischarged();
      onClose();
    } catch (err) {
      const { message } = readFieldError(
        err,
        ['discharge_outcome', ...outcomeConfig.extraFields.map(f => f.key), 'non_field_errors'],
        'Failed to discharge patient',
      );
      setFormError(message);
    } finally {
      setSaving(false);
    }
  }

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
            form="discharge-patient"
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
      <form id="discharge-patient" onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="discharge-outcome" className="block text-xs font-medium text-text-soft mb-1">Outcome</label>
          <select
            id="discharge-outcome"
            value={outcome}
            onChange={e => { setOutcome(e.target.value); setExtra({}); }}
            className={formInputClass}
          >
            {DISCHARGE_OUTCOMES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {outcomeConfig.tone === 'somber' && (
          <p role="alert" className="text-xs font-semibold text-ink bg-row-hover border border-border rounded-lg px-3 py-2.5">
            This records the patient as deceased. It closes the episode and frees the bed.
          </p>
        )}

        {outcomeConfig.extraFields.map(f => (
          <div key={f.key}>
            <label htmlFor={`discharge-${f.key}`} className="block text-xs font-medium text-text-soft mb-1">{f.label}</label>
            <input
              id={`discharge-${f.key}`}
              type={f.type}
              value={extra[f.key] ?? ''}
              onChange={e => setExtra(v => ({ ...v, [f.key]: e.target.value }))}
              className={formInputClass}
            />
          </div>
        ))}

        <div>
          <label htmlFor="discharge-summary" className="block text-xs font-medium text-text-soft mb-1">Discharge summary (optional)</label>
          <textarea id="discharge-summary" rows={2} value={summary} onChange={e => setSummary(e.target.value)} className={`${formInputClass} h-auto py-2`} />
        </div>
        <div>
          <label htmlFor="discharge-instructions" className="block text-xs font-medium text-text-soft mb-1">Discharge instructions (optional)</label>
          <textarea id="discharge-instructions" rows={2} value={instructions} onChange={e => setInstructions(e.target.value)} className={`${formInputClass} h-auto py-2`} />
        </div>

        {formError && <p role="alert" className="text-xs font-semibold text-danger">{formError}</p>}
      </form>
    </SlidePanel>
  );
}

// ─── Reassign attending doctor (Part 2) ─────────────────────────────
//
// ⚠️ UNVERIFIED — POST /ward/admissions/{id}/reassign-doctor/ is contract-only
// (see the Part 2 note in types/dashboard.ts). Reuses DoctorPicker
// (`required`) rather than a second doctor-list component.
function ReassignDoctorPanel({ admission, onClose, onReassigned }: {
  admission: NurseAdmission | null;
  onClose: () => void;
  onReassigned: () => void;
}) {
  const { toast } = useToast();
  const { data: doctors, loading, error } =
    useApi<AttendingDoctor[]>(admission ? ENDPOINTS.WARD_ATTENDING_DOCTORS : null);
  const [doctorId, setDoctorId] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!admission || saving || !doctorId) return;
    setSaving(true);
    setFormError(null);
    try {
      await apiAction(ENDPOINTS.ADMISSION_REASSIGN_DOCTOR(admission.id), 'POST', { attending_doctor: doctorId });
      toast.success('Attending doctor updated');
      onReassigned();
      onClose();
    } catch (err) {
      const { message } = readFieldError(err, ['attending_doctor', 'non_field_errors'], 'Failed to reassign doctor');
      setFormError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SlidePanel
      open={!!admission}
      onClose={onClose}
      title="Reassign attending doctor"
      subtitle={admission ? `${admission.patient.first_name} ${admission.patient.last_name}` : undefined}
      footer={
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-soft hover:text-ink">Cancel</button>
          <button type="submit" form="reassign-doctor" disabled={saving || !doctorId}
            className="px-4 py-2 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Saving…' : 'Reassign'}
          </button>
        </div>
      }
    >
      <form id="reassign-doctor" onSubmit={submit} className="space-y-4">
        <DoctorPicker id="reassign-attending-doctor" doctors={doctors} loading={loading} error={error} value={doctorId} onChange={setDoctorId} required />
        {formError && <p role="alert" className="text-xs font-semibold text-danger">{formError}</p>}
      </form>
    </SlidePanel>
  );
}

// ─── My Patients page ─────────────────────────────────────────────

function MyPatientsPage({ onRecordVitals }: { onRecordVitals: (a: NurseAdmission) => void }) {
  const { items: admissions, count, page, setPage, totalPages, loading, error, refetch } =
    usePaginatedList<NurseAdmission>(ENDPOINTS.NURSE_MY_PATIENTS);
  const [discharging, setDischarging] = useState<NurseAdmission | null>(null);
  const [reassigning, setReassigning] = useState<NurseAdmission | null>(null);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-body font-black text-[22px] text-ink">My Patients</h2>
        {count > 0 && (
          <p className="text-[13px] text-text-soft mt-0.5">
            {count} active admission{count === 1 ? '' : 's'}
          </p>
        )}
      </div>
      <DataTable
        columns={admissionColumns(onRecordVitals, {
          showAgeSex: true,
          admittedAsDate: true,
          onDischarge: setDischarging,
          onReassignDoctor: setReassigning,
        })}
        data={admissions}
        getRowKey={(a) => a.id}
        loading={loading}
        error={error}
        onRetry={refetch}
        emptyTitle="No active admissions"
        emptyDescription="Patients admitted at your organization will appear here."
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalCount={count}
        pageSize={20}
      />
      <DischargePanel
        key={`discharge-${discharging?.id ?? 'none'}`}
        admission={discharging}
        onClose={() => setDischarging(null)}
        onDischarged={refetch}
      />
      <ReassignDoctorPanel
        key={`reassign-${reassigning?.id ?? 'none'}`}
        admission={reassigning}
        onClose={() => setReassigning(null)}
        onReassigned={refetch}
      />
    </div>
  );
}

// ─── Vitals page ──────────────────────────────────────────────────

// Backend validation bounds — probed live 2026-07-11 (400 {error} outside).
const VITAL_FIELDS = [
  { key: 'temperature',              label: 'Temperature (°C)',       min: 30,  max: 45,  step: 0.1 },
  { key: 'blood_pressure_systolic',  label: 'Systolic (mmHg)',        min: 50,  max: 300, step: 1 },
  { key: 'blood_pressure_diastolic', label: 'Diastolic (mmHg)',       min: 20,  max: 200, step: 1 },
  { key: 'pulse_rate',               label: 'Pulse rate (bpm)',       min: 20,  max: 250, step: 1 },
  { key: 'respiratory_rate',         label: 'Resp. rate (per min)',   min: 5,   max: 60,  step: 1 },
  { key: 'oxygen_saturation',        label: 'SpO2 (%)',               min: 50,  max: 100, step: 1 },
  { key: 'weight',                   label: 'Weight (kg)',            min: 0.5, max: 500, step: 0.1 },
  { key: 'height',                   label: 'Height (cm)',            min: 20,  max: 300, step: 0.1 },
] as const;

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-chip rounded-lg px-3 py-2.5">
      <p className="text-[11px] font-semibold text-text-soft uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-ink mt-0.5 tabular-nums">{value}</p>
    </div>
  );
}

function LatestReading({ vitals }: { vitals: PatientVitals }) {
  const r = vitals.vitals;
  if (!r) {
    return <EmptyState title="No vitals recorded" description="Readings recorded for this patient's active episode will appear here." />;
  }
  const bp = r.blood_pressure_systolic != null || r.blood_pressure_diastolic != null
    ? `${r.blood_pressure_systolic ?? '—'} / ${r.blood_pressure_diastolic ?? '—'}`
    : '—';
  return (
    <div className="bg-white rounded-card border border-border shadow-dash-card p-4 space-y-3">
      <h3 className="text-[13.5px] font-bold text-ink">Latest reading</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Metric label="BP (mmHg)" value={bp} />
        <Metric label="Pulse" value={r.pulse_rate != null ? `${r.pulse_rate} bpm` : '—'} />
        <Metric label="Temp" value={r.temperature != null ? `${r.temperature}°C` : '—'} />
        <Metric label="SpO2" value={r.oxygen_saturation != null ? `${r.oxygen_saturation}%` : '—'} />
        <Metric label="Resp. rate" value={r.respiratory_rate != null ? `${r.respiratory_rate}/min` : '—'} />
        <Metric label="Weight" value={r.weight != null ? `${r.weight} kg` : '—'} />
        <Metric label="Height" value={r.height != null ? `${r.height} cm` : '—'} />
        <Metric label="Recorded" value={timeAgo(r.recorded_at)} />
      </div>
      {r.notes && <p className="text-xs text-text-mid border-t border-border pt-2.5">{r.notes}</p>}
      {r.recorded_by_info && (
        <p className="text-xs text-text-soft">Recorded {timeAgo(r.recorded_at)} by {r.recorded_by_info.full_name}</p>
      )}
    </div>
  );
}

function RecordVitalsForm({ patientId, onRecorded }: { patientId: string; onRecorded: () => void }) {
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Only send fields the nurse actually filled in — the backend stores a
    // partial body as-is, and an empty body would create an all-null reading.
    const payload: Record<string, number | string> = {};
    for (const f of VITAL_FIELDS) {
      const raw = values[f.key]?.trim();
      if (raw) payload[f.key] = Number(raw);
    }
    if (notes.trim()) payload.notes = notes.trim();
    if (!Object.keys(payload).length) {
      setFormError('Enter at least one measurement or a note before saving.');
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      await apiAction(ENDPOINTS.NURSE_VITALS(patientId), 'PATCH', payload);
      toast.success('Vitals recorded');
      setValues({});
      setNotes('');
      onRecorded();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to record vitals');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-card border border-border shadow-dash-card p-4 space-y-4">
      <h3 className="text-[13.5px] font-bold text-ink">Record new reading</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {VITAL_FIELDS.map(f => (
          <div key={f.key}>
            <label htmlFor={`vital-${f.key}`} className="block text-xs font-semibold text-text-mid mb-1">{f.label}</label>
            <input
              id={`vital-${f.key}`}
              type="number"
              min={f.min}
              max={f.max}
              step={f.step}
              value={values[f.key] ?? ''}
              onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
              className={formInputClass}
            />
          </div>
        ))}
      </div>
      <div>
        <label htmlFor="vital-notes" className="block text-xs font-semibold text-text-mid mb-1">Notes</label>
        <textarea
          id="vital-notes"
          rows={2}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className={`${formInputClass} h-auto py-2`}
        />
      </div>
      {formError && <p role="alert" className="text-xs font-semibold text-danger">{formError}</p>}
      <Button type="submit" loading={saving}>Record reading</Button>
    </form>
  );
}

function VitalsPanel({ admission }: { admission: NurseAdmission }) {
  const { data, loading, error, refetch } =
    useApi<PatientVitals>(ENDPOINTS.NURSE_VITALS(admission.patient.id));

  return (
    <div className="space-y-4">
      {loading ? <ShimmerRows count={3} /> : error ? (
        // 404 here = no active episode for this patient at your org.
        <ErrorState message={error} onRetry={refetch} />
      ) : data ? (
        <LatestReading vitals={data} />
      ) : null}
      <RecordVitalsForm patientId={admission.patient.id} onRecorded={refetch} />
    </div>
  );
}

function VitalsPage({ selected, onSelect }: {
  selected: NurseAdmission | null;
  onSelect: (a: NurseAdmission) => void;
}) {
  const { items: admissions, loading, error, refetch } =
    usePaginatedList<NurseAdmission>(ENDPOINTS.NURSE_MY_PATIENTS, 50);

  return (
    <div className="space-y-4">
      <h2 className="font-body font-black text-[22px] text-ink">Vitals</h2>
      {loading ? <ShimmerRows count={6} /> : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : !admissions.length ? (
        <EmptyState title="No active admissions" description="Admit a patient to record their vitals." />
      ) : (
        <div className="grid lg:grid-cols-[280px_1fr] gap-4 items-start">
          {/* Patient picker */}
          <div className="bg-white rounded-card border border-border shadow-dash-card p-2 space-y-1">
            {admissions.map(a => (
              <button key={a.id} onClick={() => onSelect(a)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                  selected?.patient.id === a.patient.id ? 'bg-chip' : 'hover:bg-row-hover'
                }`}>
                <Avatar firstName={a.patient.first_name} lastName={a.patient.last_name} size="sm" />
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-ink truncate">{a.patient.first_name} {a.patient.last_name}</div>
                  <div className="text-[11px] text-text-soft truncate">{a.patient.healthclouda_id} · {wardBedLabel(a)}</div>
                </div>
              </button>
            ))}
          </div>
          {selected ? (
            <VitalsPanel key={selected.patient.id} admission={selected} />
          ) : (
            <EmptyState title="Select a patient" description="Choose a patient to view and record their vitals." />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Admit patient (WARD-1) ─────────────────────────────────────────
//
// Entry point is an ACTIVE episode, not a bare patient row — the backend
// rejects any other episode status ("Only active episodes can have new
// admissions", apps/ward/serializers.py AdmissionCreateSerializer.
// validate_episode). A NURSE has no access to /doctor/episodes/
// (CanManageAdmissions is a different permission from what gates that
// endpoint) and there is no "my patients without a bed" endpoint, so
// eligible episodes are read from the generic /episodes/ viewset — a NURSE
// can read their own org's episodes there (CanAccessEpisode) — and
// cross-referenced against the nurse's own active-admissions list to hide
// patients who are already admitted. The backend would 400 on that combo
// anyway ("This patient already has an active admission in your
// organization."), but there is no reason to let a nurse pick one to find
// out.
//
// /episodes/ documents no query params at all (verified against
// apps/patients/views.py EpisodeViewSet.get_queryset, which never reads
// self.request.query_params — not inferred from the schema), so the ACTIVE
// filter is applied client-side over EVERY page, the same trade the ward
// board below makes: a nurse unable to find an eligible patient here has
// clinical consequence, unlike a merely-short list.

/**
 * Reads apps/core/exceptions.py's custom_exception_handler shape —
 * {error, code, details: {<field>: [<message>, ...]}} — directly from
 * `details` rather than the flattened `.message` (which prefixes the field
 * name, e.g. "gender: Patient gender..."). Returning which field failed is
 * what lets the caller branch into the gender two-step.
 */
function readFieldError(
  err: unknown,
  priority: string[],
  fallback: string,
): { field: string | null; message: string } {
  if (err instanceof ClientApiError) {
    const details = (err.data as { details?: Record<string, unknown> } | null)?.details;
    if (details) {
      for (const field of priority) {
        const v = details[field];
        if (v == null) continue;
        const message = Array.isArray(v) ? String(v[0]) : String(v);
        return { field: field === 'non_field_errors' ? null : field, message };
      }
    }
  }
  return { field: null, message: err instanceof Error ? err.message : fallback };
}

function admissionFieldError(err: unknown): { field: string | null; message: string } {
  return readFieldError(
    err,
    // A-3: 'admission_reason'/'admission_source'/'attending_doctor' added
    // for the emergency path — AdmissionCreateSerializer.validate
    // (apps/ward/serializers.py) can now reject on any of these three too.
    ['gender', 'admission_reason', 'admission_source', 'attending_doctor', 'episode', 'bed', 'patient', 'non_field_errors'],
    'Failed to admit patient',
  );
}

// A-3: POST /episodes/ errors — EpisodeCreateSerializer (apps/patients/serializers.py).
// 'patient' carries the consent_given=False rejection ("Cannot create episode
// for patient without consent.") and the org-access gate (FLAG-212); a plain
// ValidationError (e.g. "already has an active episode at your organization")
// lands in 'non_field_errors'.
function episodeFieldError(err: unknown): { field: string | null; message: string } {
  return readFieldError(
    err,
    ['patient', 'episode_type', 'chief_complaint', 'non_field_errors'],
    'Failed to start episode',
  );
}

function eligibleEpisodeColumns(onAdmit: (ep: EpisodeListItem) => void): DataTableColumn<EpisodeListItem>[] {
  return [
    {
      key: 'patient', header: 'Patient', render: ep => (
        <div className="flex items-center gap-2.5">
          <Avatar firstName={ep.patient.first_name} lastName={ep.patient.last_name} size="sm" />
          <div>
            <div className="text-[13px] font-semibold text-ink">{ep.patient.first_name} {ep.patient.last_name}</div>
            <div className="text-[11px] text-text-soft font-mono">{ep.patient.healthclouda_id}</div>
          </div>
        </div>
      ),
    },
    { key: 'complaint', header: 'Chief Complaint', render: ep => <span className="text-xs text-text-soft">{ep.chief_complaint_summary || '—'}</span> },
    { key: 'opened', header: 'Opened', className: 'whitespace-nowrap', render: ep => <span className="text-xs text-text-soft">{timeAgo(ep.episode_start)}</span> },
    {
      key: 'actions', header: '', className: 'text-right',
      render: ep => (
        <button onClick={() => onAdmit(ep)} className="text-xs font-semibold text-primary-dark hover:underline">
          Admit
        </button>
      ),
    },
  ];
}

// Shared by the ordered admit form (below) and the emergency admit form
// (A-3) — extracted rather than duplicated so the two never drift the way
// the /nurse/my-patients/ vs /ward/admissions/ admission shapes already
// have. `id` stays a prop because both forms can exist in the tree at once
// (the emergency panel does not replace the ordered one).
function BedPicker({ id, beds, loading, error, onRetry, value, onChange }: {
  id: string;
  beds: WardBed[] | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-text-soft mb-1">Bed</label>
      {loading ? <ShimmerRows count={1} /> : error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : !beds?.length ? (
        <p className="text-xs text-text-soft">No available beds in your organization right now.</p>
      ) : (
        <select
          id={id}
          value={value}
          onChange={e => onChange(e.target.value)}
          className={formInputClass}
        >
          <option value="">Select a bed…</option>
          {beds.map(b => (
            <option key={b.id} value={b.id}>
              {[b.ward?.name, b.room?.name, `Bed ${b.bed_number}`].filter(Boolean).join(' · ')}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

// Backend FLAG-301: warn-and-allow, not a dead end. Shared by both admit
// forms — the ward gender policy applies to a bed regardless of which path
// put the patient there.
function GenderOverrideWarning({ message, saving, onOverride, onCancel }: {
  message: string;
  saving: boolean;
  onOverride: (e: React.MouseEvent) => void;
  onCancel: () => void;
}) {
  return (
    <div role="alert" className="rounded-lg border border-warning/30 bg-warning-bg px-3 py-2.5 space-y-2">
      <p className="text-xs font-semibold text-warning-strong">{message}</p>
      <p className="text-[11px] text-text-soft">Admitting anyway is recorded in this patient&apos;s audit trail.</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onOverride}
          disabled={saving}
          className="px-3 py-1.5 text-xs font-semibold text-white bg-warning-strong hover:opacity-90 disabled:opacity-50 rounded-md transition-colors"
        >
          {saving ? 'Admitting…' : 'Admit anyway'}
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-xs font-semibold text-text-soft hover:text-ink">
          Choose a different bed
        </button>
      </div>
    </div>
  );
}

function AdmitForm({ episode, onClose, onAdmitted }: {
  episode: EpisodeListItem | null;
  onClose: () => void;
  onAdmitted: () => void;
}) {
  const { toast } = useToast();
  const { data: beds, loading: bedsLoading, error: bedsError, refetch: refetchBeds } =
    useAllPages<WardBed>(ENDPOINTS.WARD_BEDS + '?status=AVAILABLE');
  const [bedId, setBedId] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // Set only when the server's gender two-step fires (backend FLAG-301) — a
  // deliberate pause for the clinician to confirm, never auto-retried.
  const [genderWarning, setGenderWarning] = useState<string | null>(null);

  async function submit(e: React.FormEvent | React.MouseEvent, override: boolean) {
    e.preventDefault();
    if (!episode || saving || !bedId) return;
    setSaving(true);
    setFormError(null);
    try {
      await apiAction(ENDPOINTS.ADMISSIONS, 'POST', {
        patient: episode.patient.id,
        episode: episode.id,
        bed: bedId,
        admission_reason: reason.trim(),
        override,
      });
      toast.success(`${episode.patient.first_name} ${episode.patient.last_name} admitted`);
      setGenderWarning(null);
      onAdmitted();
      onClose();
    } catch (err) {
      const { field, message } = admissionFieldError(err);
      if (field === 'gender' && !override) {
        setGenderWarning(message);
      } else {
        setFormError(message);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <SlidePanel
      open={!!episode}
      onClose={onClose}
      title="Admit patient"
      subtitle={episode ? `${episode.patient.first_name} ${episode.patient.last_name}` : undefined}
      footer={
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-soft hover:text-ink">Cancel</button>
          {!genderWarning && (
            <button type="submit" form="admit-patient" disabled={saving || !bedId}
              className="px-4 py-2 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
              {saving ? 'Admitting…' : 'Admit'}
            </button>
          )}
        </div>
      }
    >
      <form id="admit-patient" onSubmit={(e) => void submit(e, false)} className="space-y-4">
        <BedPicker
          id="admit-bed"
          beds={beds}
          loading={bedsLoading}
          error={bedsError}
          onRetry={refetchBeds}
          value={bedId}
          onChange={(v) => { setBedId(v); setGenderWarning(null); }}
        />

        <div>
          <label htmlFor="admit-reason" className="block text-xs font-medium text-text-soft mb-1">Admission reason</label>
          <textarea
            id="admit-reason"
            rows={3}
            value={reason}
            onChange={e => setReason(e.target.value)}
            className={`${formInputClass} h-auto py-2`}
          />
        </div>

        {genderWarning && (
          <GenderOverrideWarning
            message={genderWarning}
            saving={saving}
            onOverride={(e) => void submit(e, true)}
            onCancel={() => setGenderWarning(null)}
          />
        )}

        {formError && <p role="alert" className="text-xs font-semibold text-danger">{formError}</p>}
      </form>
    </SlidePanel>
  );
}

// ─── Emergency admission (A-3) ───────────────────────────────────────
//
// The flow above assumes a doctor or receptionist already opened an ACTIVE
// episode before a nurse ever sees the patient. A patient who collapses at
// the door has none of that. Medical advisor's answer, Q1 (2026-09-12): a
// NURSE admits directly; a reason MUST be recorded (brief is fine — a doctor
// reviews afterwards); naming the attending doctor is prompted but must
// NEVER block the admission. "Nurse in charge of the emergency ward" from
// that answer is enforced as hospital policy, not a system gate — no
// charge-nurse/rota concept exists anywhere in the system (owner decision,
// same date) — so ANY nurse may use this path; WHO admitted is still
// recorded via the existing `admitted_by` on the admission.
//
// Two calls, chained: POST /episodes/ (episode_type=EMERGENCY) so the
// admission has an ACTIVE episode to point at, then POST /ward/admissions/
// with admission_source=EMERGENCY_DIRECT, using the id straight off the
// episode-create response — no intermediate refetch (see
// EpisodeCreateResponse's comment in types/dashboard.ts).
//
// The two calls share ONE on-screen "reason" field rather than asking a
// nurse mid-emergency to type two near-duplicate free-text boxes
// (chief_complaint vs admission_reason describe the same event here) — sent
// as chief_complaint to the episode call and admission_reason to the
// admission call.
//
// ⚠️ Patient selection is narrower than "any patient who walks in" — see
// OrgVisiblePatient's comment in types/dashboard.ts. A patient with no prior
// relationship to this organization (no approved OrgAccessRequest, no
// existing episode here) will not appear in this search AND will separately
// 400 on the episode call. Reported to the orchestrator, not solved here —
// out of scope tonight (AdmissionRequest / access-request flows, A-4).

function EmergencyPatientSearch({ onSelect }: { onSelect: (p: OrgVisiblePatient) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OrgVisiblePatient[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setSearched(true);
    setError(null);
    try {
      const data = await dataGet<{ count: number; results: OrgVisiblePatient[] }>(
        ENDPOINTS.PATIENTS_SEARCH + '?query=' + encodeURIComponent(q),
      );
      setResults(data.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="emergency-patient-search" className="block text-xs font-medium text-text-soft mb-1">
          Find the patient
        </label>
        <form onSubmit={search} className="flex gap-2">
          <input
            id="emergency-patient-search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Name, phone or HealthClouda ID…"
            className={formInputClass}
          />
          <button
            type="submit"
            className="px-3 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            Search
          </button>
        </form>
      </div>
      {error && <p role="alert" className="text-xs font-semibold text-danger">{error}</p>}
      {searching ? <ShimmerRows count={2} /> : searched && !results.length && !error ? (
        <p className="text-xs text-text-soft">No matching patient found at your organization.</p>
      ) : results.length > 0 ? (
        <ul className="border border-border rounded-lg divide-y divide-row-hairline max-h-56 overflow-auto">
          {results.map(p => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onSelect(p)}
                className="w-full text-left px-3 py-2 hover:bg-row-hover transition-colors flex items-center justify-between gap-2"
              >
                <span>
                  <span className="text-[13px] font-semibold text-ink">{p.first_name} {p.last_name}</span>
                  <span className="block text-[11px] text-text-soft font-mono">{p.healthclouda_id}</span>
                </span>
                {p.age != null && (
                  <span className="text-[11px] text-text-soft whitespace-nowrap">{p.age}y · {p.gender}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

// Optional, and deliberately framed that way (Q2 — attending_doctor is
// PROMPTED, NEVER BLOCKS): the default option reads as a normal outcome,
// not an error state, because for an emergency admission it often is one.
function DoctorPicker({ id = 'emergency-attending-doctor', doctors, loading, error, value, onChange, required = false }: {
  id?: string;
  doctors: AttendingDoctor[] | null;
  loading: boolean;
  error: string | null;
  value: string;
  onChange: (id: string) => void;
  // A-2b's picker (emergency admission) is never-blocks/optional. Reassign
  // (Part 2) genuinely requires a target doctor — same list, different
  // framing, so this is a prop rather than a second component.
  required?: boolean;
}) {
  const onDuty = (doctors ?? []).filter(d => d.is_on_duty);
  const offDuty = (doctors ?? []).filter(d => !d.is_on_duty);
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-text-soft mb-1">
        Attending doctor
      </label>
      <p className="text-[11px] text-text-soft mb-1">
        {required
          ? 'Choose the doctor taking over this patient.'
          : 'Optional — naming one never blocks this admission. Leave it as-is if none is available.'}
      </p>
      {loading ? <ShimmerRows count={1} /> : error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : (
        <select
          id={id}
          value={value}
          onChange={e => onChange(e.target.value)}
          className={formInputClass}
        >
          <option value="">{required ? 'Select a doctor…' : 'No doctor available right now'}</option>
          {onDuty.length > 0 && (
            <optgroup label="On duty">
              {onDuty.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
            </optgroup>
          )}
          {offDuty.length > 0 && (
            <optgroup label="Not on duty">
              {offDuty.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
            </optgroup>
          )}
        </select>
      )}
    </div>
  );
}

function EmergencyAdmitForm({ open, onClose, onAdmitted }: {
  open: boolean;
  onClose: () => void;
  onAdmitted: () => void;
}) {
  const { toast } = useToast();
  // Fetched only while the panel is open — no point spending two requests
  // every time the Admit Patient page mounts for a form most sessions never
  // open.
  const { data: beds, loading: bedsLoading, error: bedsError, refetch: refetchBeds } =
    useAllPages<WardBed>(open ? ENDPOINTS.WARD_BEDS + '?status=AVAILABLE' : null);
  const { data: doctors, loading: doctorsLoading, error: doctorsError } =
    useApi<AttendingDoctor[]>(open ? ENDPOINTS.WARD_ATTENDING_DOCTORS : null);

  const [patient, setPatient] = useState<OrgVisiblePatient | null>(null);
  const [reason, setReason] = useState('');
  const [bedId, setBedId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [genderWarning, setGenderWarning] = useState<string | null>(null);
  // Set once the episode POST succeeds. Kept in STATE, not a local variable
  // in `submit` — the gender two-step (and a plain retry after a failed bed
  // assignment) re-invokes `submit` from scratch, and a local variable would
  // re-run the episode POST on every retry. That creates a second Episode
  // for the same patient/org on each attempt, which the backend's own
  // duplicate-active-episode check then rejects — a real bug caught writing
  // the retry test below, not a hypothetical.
  const [episodeId, setEpisodeId] = useState<string | null>(null);

  async function submit(e: React.FormEvent | React.MouseEvent, override: boolean) {
    e.preventDefault();
    const trimmedReason = reason.trim();
    // Client-side gate: admission_reason must be non-blank for
    // EMERGENCY_DIRECT (AdmissionCreateSerializer.validate sets
    // allow_blank=False deliberately for exactly this — FLAG-336's trap —
    // but a nurse should not have to discover that from a 400).
    if (!patient || saving || !bedId || !trimmedReason) return;
    setSaving(true);
    setFormError(null);

    let epId = episodeId;
    if (!epId) {
      try {
        const episodeRes = (await apiAction(ENDPOINTS.EPISODES, 'POST', {
          patient: patient.id,
          episode_type: 'EMERGENCY',
          chief_complaint: trimmedReason,
        })) as EpisodeCreateResponse;
        epId = episodeRes?.episode?.id ?? null;
        if (epId) setEpisodeId(epId);
      } catch (err) {
        const { message } = episodeFieldError(err);
        setFormError(message);
        setSaving(false);
        return;
      }
    }

    if (!epId) {
      setFormError(
        'The episode was started but did not return an id, so the bed assignment could not continue. Please retry.',
      );
      setSaving(false);
      return;
    }

    try {
      const admissionRes = (await apiAction(ENDPOINTS.ADMISSIONS, 'POST', {
        patient: patient.id,
        episode: epId,
        bed: bedId,
        admission_reason: trimmedReason,
        admission_source: 'EMERGENCY_DIRECT',
        ...(doctorId ? { attending_doctor: doctorId } : {}),
        override,
      })) as AdmissionCreateResponse;

      const needsDoctor = admissionRes?.admission?.needs_attending_doctor;
      toast.success(
        `${patient.first_name} ${patient.last_name} admitted`
        + (needsDoctor ? ' — no attending doctor assigned yet' : ''),
      );
      setGenderWarning(null);
      onAdmitted();
      onClose();
    } catch (err) {
      const { field, message } = admissionFieldError(err);
      if (field === 'gender' && !override) {
        setGenderWarning(message);
      } else {
        // The episode is already created and ACTIVE at this point — it will
        // show up in the ordinary Admit Patient list below, so a failed bed
        // assignment here is a retry, not a dead end.
        setFormError(
          `Episode started for ${patient.first_name} ${patient.last_name}, but the bed assignment failed: `
          + `${message} Find them in the Admit Patient list below to retry.`,
        );
        onAdmitted();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <SlidePanel
      open={open}
      onClose={onClose}
      title="Emergency admission"
      subtitle={patient ? `${patient.first_name} ${patient.last_name}` : 'No doctor has seen this patient yet'}
      footer={
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-soft hover:text-ink">Cancel</button>
          {!genderWarning && (
            <button
              type="submit"
              form="emergency-admit"
              disabled={saving || !patient || !bedId || !reason.trim()}
              className="px-4 py-2 bg-danger hover:opacity-90 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {saving ? 'Admitting…' : 'Admit now'}
            </button>
          )}
        </div>
      }
    >
      <form id="emergency-admit" onSubmit={(e) => void submit(e, false)} className="space-y-4">
        {!patient ? (
          <EmergencyPatientSearch onSelect={setPatient} />
        ) : (
          <div className="flex items-center justify-between bg-chip rounded-lg px-3 py-2">
            <div>
              <div className="text-[13px] font-semibold text-ink">{patient.first_name} {patient.last_name}</div>
              <div className="text-[11px] text-text-soft font-mono">{patient.healthclouda_id}</div>
            </div>
            <button type="button" onClick={() => setPatient(null)} className="text-xs font-semibold text-primary-dark hover:underline">
              Change patient
            </button>
          </div>
        )}

        <div>
          <label htmlFor="emergency-reason" className="block text-xs font-medium text-text-soft mb-1">
            Reason for admission
          </label>
          <p className="text-[11px] text-text-soft mb-1">Required — a brief reason is fine. A doctor reviews afterwards.</p>
          <textarea
            id="emergency-reason"
            rows={2}
            value={reason}
            onChange={e => setReason(e.target.value)}
            className={`${formInputClass} h-auto py-2`}
          />
        </div>

        <BedPicker
          id="emergency-admit-bed"
          beds={beds}
          loading={bedsLoading}
          error={bedsError}
          onRetry={refetchBeds}
          value={bedId}
          onChange={(v) => { setBedId(v); setGenderWarning(null); }}
        />

        <DoctorPicker doctors={doctors} loading={doctorsLoading} error={doctorsError} value={doctorId} onChange={setDoctorId} />

        {genderWarning && (
          <GenderOverrideWarning
            message={genderWarning}
            saving={saving}
            onOverride={(e) => void submit(e, true)}
            onCancel={() => setGenderWarning(null)}
          />
        )}

        {formError && <p role="alert" className="text-xs font-semibold text-danger">{formError}</p>}
      </form>
    </SlidePanel>
  );
}

function AdmitPatientPage() {
  const { data: episodeData, loading: epLoading, error: epError, refetch: epRefetch } =
    useAllPages<EpisodeListItem>(ENDPOINTS.EPISODES);
  const { data: admissionData, loading: admLoading, error: admError, refetch: admRefetch } =
    useAllPages<NurseAdmission>(ENDPOINTS.NURSE_MY_PATIENTS);
  // Form state is keyed on the episode id below (house rule 9) so switching
  // which patient is being admitted is a full remount — PR #130's clinical-
  // text-and-consent-booleans leak was this exact shape of bug in a sibling
  // permanently-mounted panel.
  const [admitting, setAdmitting] = useState<EpisodeListItem | null>(null);
  // Same guard for the emergency panel: `emergencyKey` bumps on every open
  // so a cancelled admission never leaves a stale patient/bed/reason behind
  // for the next time this opens.
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [emergencyKey, setEmergencyKey] = useState(0);

  const loading = epLoading || admLoading;
  const error = epError || admError;
  const refetch = () => { epRefetch(); admRefetch(); };

  const admittedPatientIds = new Set((admissionData ?? []).map(a => a.patient.id));
  const eligible = (episodeData ?? []).filter(
    ep => ep.status === 'ACTIVE' && !admittedPatientIds.has(ep.patient.id),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-body font-black text-[22px] text-ink">Admit Patient</h2>
          <p className="text-[13px] text-text-soft mt-0.5">
            Patients with an active episode at your organization who are not already admitted.
          </p>
        </div>
        <button
          onClick={() => { setEmergencyKey(k => k + 1); setEmergencyOpen(true); }}
          className="px-3.5 py-2 bg-danger hover:opacity-90 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
        >
          Emergency admission
        </button>
      </div>
      <DataTable
        columns={eligibleEpisodeColumns(setAdmitting)}
        data={eligible}
        getRowKey={ep => ep.id}
        loading={loading}
        error={error}
        onRetry={refetch}
        emptyTitle="No patients to admit"
        emptyDescription="Patients with an active episode who are not already admitted will appear here."
      />
      <AdmitForm
        key={admitting?.id ?? 'none'}
        episode={admitting}
        onClose={() => setAdmitting(null)}
        onAdmitted={refetch}
      />
      <EmergencyAdmitForm
        key={`emergency-${emergencyKey}`}
        open={emergencyOpen}
        onClose={() => setEmergencyOpen(false)}
        onAdmitted={refetch}
      />
    </div>
  );
}

// ─── Admission Requests queue (Part 2 — the ordered path) ───────────
//
// A doctor decides a patient needs admitting and sends a request; the ward
// (any NURSE) accepts — choosing a bed, which creates the admission — or
// declines with a reason. "The ward is allowed to refuse a planned
// admission" is a signed-off product decision, so Decline is a first-class
// action here, not a buried menu item.
//
// ⚠️ UNVERIFIED — see the Part 2 note on `AdmissionRequest` in
// types/dashboard.ts: this whole screen is built from the contract's plain
// English, not from backend source, because the backend for it does not
// exist yet on the parallel branch.

function urgencyLabel(value: string): string {
  return URGENCY_OPTIONS.find(o => o.value === value)?.label ?? value;
}
function levelOfCareLabel(value: string): string {
  return LEVEL_OF_CARE_OPTIONS.find(o => o.value === value)?.label ?? value;
}

function AcceptRequestPanel({ request, onClose, onAccepted }: {
  request: AdmissionRequest | null;
  onClose: () => void;
  onAccepted: () => void;
}) {
  const { toast } = useToast();
  const { data: beds, loading: bedsLoading, error: bedsError, refetch: refetchBeds } =
    useAllPages<WardBed>(request ? ENDPOINTS.WARD_BEDS + '?status=AVAILABLE' : null);
  const [bedId, setBedId] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [genderWarning, setGenderWarning] = useState<string | null>(null);

  async function submit(e: React.FormEvent | React.MouseEvent, override: boolean) {
    e.preventDefault();
    if (!request || saving || !bedId) return;
    setSaving(true);
    setFormError(null);
    try {
      await apiAction(ENDPOINTS.ADMISSION_REQUEST_ACCEPT(request.id), 'POST', { bed: bedId, override });
      toast.success(`${request.patient.first_name} ${request.patient.last_name} admitted`);
      setGenderWarning(null);
      onAccepted();
      onClose();
    } catch (err) {
      // Reuses the same gender two-step as the other two admit paths
      // (backend FLAG-301) — a ward gender-policy mismatch applies to a bed
      // regardless of which of the three entry points put the patient there.
      const { field, message } = readFieldError(err, ['gender', 'bed', 'non_field_errors'], 'Failed to accept admission request');
      if (field === 'gender' && !override) {
        setGenderWarning(message);
      } else {
        setFormError(message);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <SlidePanel
      open={!!request}
      onClose={onClose}
      title="Accept admission request"
      subtitle={request ? `${request.patient.first_name} ${request.patient.last_name}` : undefined}
      footer={
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-soft hover:text-ink">Cancel</button>
          {!genderWarning && (
            <button type="submit" form="accept-request" disabled={saving || !bedId}
              className="px-4 py-2 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
              {saving ? 'Admitting…' : 'Accept & admit'}
            </button>
          )}
        </div>
      }
    >
      <form id="accept-request" onSubmit={(e) => void submit(e, false)} className="space-y-4">
        {request && (
          <div className="bg-chip rounded-lg px-3 py-2 text-xs text-text-soft space-y-1">
            <p><span className="font-semibold text-ink">{urgencyLabel(request.urgency)}</span> · {levelOfCareLabel(request.level_of_care)}</p>
            {request.clinical_reason && <p>{request.clinical_reason}</p>}
          </div>
        )}
        <BedPicker
          id="accept-request-bed"
          beds={beds}
          loading={bedsLoading}
          error={bedsError}
          onRetry={refetchBeds}
          value={bedId}
          onChange={(v) => { setBedId(v); setGenderWarning(null); }}
        />
        {genderWarning && (
          <GenderOverrideWarning
            message={genderWarning}
            saving={saving}
            onOverride={(e) => void submit(e, true)}
            onCancel={() => setGenderWarning(null)}
          />
        )}
        {formError && <p role="alert" className="text-xs font-semibold text-danger">{formError}</p>}
      </form>
    </SlidePanel>
  );
}

function DeclineRequestPanel({ request, onClose, onDeclined }: {
  request: AdmissionRequest | null;
  onClose: () => void;
  onDeclined: () => void;
}) {
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!request || saving || !trimmed) return;
    setSaving(true);
    setFormError(null);
    try {
      await apiAction(ENDPOINTS.ADMISSION_REQUEST_DECLINE(request.id), 'POST', { decline_reason: trimmed });
      toast.warning(`Declined the admission request for ${request.patient.first_name} ${request.patient.last_name}`);
      onDeclined();
      onClose();
    } catch (err) {
      const { message } = readFieldError(err, ['decline_reason', 'non_field_errors'], 'Failed to decline admission request');
      setFormError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SlidePanel
      open={!!request}
      onClose={onClose}
      title="Decline admission request"
      subtitle={request ? `${request.patient.first_name} ${request.patient.last_name}` : undefined}
      footer={
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-soft hover:text-ink">Cancel</button>
          <button type="submit" form="decline-request" disabled={saving || !reason.trim()}
            className="px-4 py-2 bg-danger hover:opacity-90 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Declining…' : 'Decline'}
          </button>
        </div>
      }
    >
      <form id="decline-request" onSubmit={submit} className="space-y-4">
        <p className="text-xs text-text-soft">
          The ward can refuse a planned admission — for example, no appropriate bed, or the clinical
          picture does not match the requested level of care. Say why, so the requesting doctor can act on it.
        </p>
        <div>
          <label htmlFor="decline-reason" className="block text-xs font-medium text-text-soft mb-1">Reason for declining</label>
          <textarea
            id="decline-reason"
            rows={3}
            value={reason}
            onChange={e => setReason(e.target.value)}
            className={`${formInputClass} h-auto py-2`}
          />
        </div>
        {formError && <p role="alert" className="text-xs font-semibold text-danger">{formError}</p>}
      </form>
    </SlidePanel>
  );
}

function admissionRequestColumns(
  onAccept: (r: AdmissionRequest) => void,
  onDecline: (r: AdmissionRequest) => void,
): DataTableColumn<AdmissionRequest>[] {
  return [
    {
      key: 'patient', header: 'Patient', render: r => (
        <div className="flex items-center gap-2.5">
          <Avatar firstName={r.patient.first_name} lastName={r.patient.last_name} size="sm" />
          <div>
            <div className="text-[13px] font-semibold text-ink">{r.patient.first_name} {r.patient.last_name}</div>
            <div className="text-[11px] text-text-soft font-mono">{r.patient.healthclouda_id}</div>
          </div>
        </div>
      ),
    },
    { key: 'urgency', header: 'Urgency', render: r => <StatusBadge status={r.urgency} label={urgencyLabel(r.urgency)} /> },
    { key: 'level', header: 'Level of care', render: r => <span className="text-xs text-text-soft">{levelOfCareLabel(r.level_of_care)}</span> },
    { key: 'reason', header: 'Clinical reason', render: r => <span className="text-xs text-text-soft">{r.clinical_reason || '—'}</span> },
    {
      key: 'requested_by', header: 'Requested by', className: 'whitespace-nowrap',
      render: r => <span className="text-xs text-text-soft">{r.requested_by ? `Dr. ${r.requested_by.first_name} ${r.requested_by.last_name}` : '—'}</span>,
    },
    { key: 'requested', header: 'Requested', className: 'whitespace-nowrap', render: r => <span className="text-xs text-text-soft">{timeAgo(r.created_at)}</span> },
    {
      key: 'actions', header: '', className: 'text-right whitespace-nowrap',
      render: r => (
        <div className="flex items-center justify-end gap-3">
          <button onClick={() => onDecline(r)} className="text-xs font-semibold text-danger hover:underline">Decline</button>
          <button onClick={() => onAccept(r)} className="text-xs font-semibold text-primary-dark hover:underline">Accept</button>
        </div>
      ),
    },
  ];
}

function AdmissionRequestsPage() {
  const { items: requests, count, page, setPage, totalPages, loading, error, refetch } =
    usePaginatedList<AdmissionRequest>(ENDPOINTS.ADMISSION_REQUESTS + '?status=REQUESTED');
  const [accepting, setAccepting] = useState<AdmissionRequest | null>(null);
  const [declining, setDeclining] = useState<AdmissionRequest | null>(null);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-body font-black text-[22px] text-ink">Admission Requests</h2>
        {count > 0 && (
          <p className="text-[13px] text-text-soft mt-0.5">{count} awaiting a decision</p>
        )}
      </div>
      <DataTable
        columns={admissionRequestColumns(setAccepting, setDeclining)}
        data={requests}
        getRowKey={r => r.id}
        loading={loading}
        error={error}
        onRetry={refetch}
        emptyTitle="No pending requests"
        emptyDescription="Admission requests from doctors will appear here."
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalCount={count}
        pageSize={20}
      />
      <AcceptRequestPanel
        key={`accept-${accepting?.id ?? 'none'}`}
        request={accepting}
        onClose={() => setAccepting(null)}
        onAccepted={refetch}
      />
      <DeclineRequestPanel
        key={`decline-${declining?.id ?? 'none'}`}
        request={declining}
        onClose={() => setDeclining(null)}
        onDeclined={refetch}
      />
    </div>
  );
}

// ─── Ward Overview page ───────────────────────────────────────────

// Bed status → StatusBadge status. Observed live: OCCUPIED, AVAILABLE. The
// ward serialisers also define MAINTENANCE and RESERVED, which the seed data
// does not exercise — handled here so they don't render as an unknown state.
const BED_STATUS_LABEL: Record<string, string> = {
  AVAILABLE: 'Available',
  OCCUPIED: 'Occupied',
  MAINTENANCE: 'Maintenance',
  RESERVED: 'Reserved',
};

function WardsPage() {
  // A ward board must show EVERY ward and EVERY bed, so both of these read all
  // pages rather than the first. `useApi` + `.results` capped the board at the
  // first 20 beds: invisible against 7 seeded beds, and at a real hospital a
  // partial bed list with nothing to say it is partial. A nurse concluding a
  // bed is not there has clinical consequence, which is what separates this
  // from the cosmetic pagination gaps in FLAG-013/214.
  const { data: wardData, loading, error, refetch } = useAllPages<Ward>(ENDPOINTS.NURSE_WARDS_OVERVIEW);
  const wards = wardData ?? [];

  // Bed-level detail lives on the ward app, not the nurse app: the nurse
  // wards-overview endpoint returns counts only, with no per-bed information.
  // /ward/beds/ is a paginated envelope and documents page/search/ordering
  // (live schema, confirmed 2026-08-23).
  const { data: bedData } = useAllPages<WardBed>(ENDPOINTS.WARD_BEDS);
  const beds = bedData ?? [];
  const bedsByWard = beds.reduce<Record<string, WardBed[]>>((acc, b) => {
    const wardId = b.ward?.id;
    if (!wardId) return acc;
    (acc[wardId] ??= []).push(b);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <h2 className="font-body font-black text-[22px] text-ink">Ward Overview</h2>
      {loading ? <ShimmerRows count={3} /> : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : !wards.length ? (
        <EmptyState title="No wards" description="Ward information will appear here." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {wards.map(ward => {
            const pct = ward.total_beds > 0 ? Math.round((ward.occupied_beds / ward.total_beds) * 100) : 0;
            const barColor = pct >= 90 ? 'bg-danger' : pct >= 70 ? 'bg-warning' : 'bg-success';
            const badgeColor = pct >= 90 ? 'bg-danger-bg text-danger' : pct >= 70 ? 'bg-warning-bg text-warning-strong' : 'bg-success-bg text-success-strong';
            return (
              <div key={ward.id} className="bg-white rounded-card border border-border shadow-dash-card p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-[13.5px] font-bold text-ink">{ward.name}</h3>
                    {ward.category && <p className="text-[11px] text-text-soft mt-0.5">{ward.category}</p>}
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>{pct}%</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-text-soft">
                    <span>{ward.occupied_beds} occupied</span>
                    <span className="text-success-strong font-semibold">{ward.available_beds ?? ward.total_beds - ward.occupied_beds} free</span>
                  </div>
                  <div className="h-2 bg-row-hairline rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-text-soft">{ward.total_beds} total beds</p>
                </div>

                {/* Per-bed detail from /ward/beds/ — who is in which bed, which
                    is the actual question a nurse has at a ward board. */}
                {(bedsByWard[ward.id]?.length ?? 0) > 0 && (
                  <ul className="mt-3 pt-3 border-t border-border space-y-1.5">
                    {bedsByWard[ward.id]
                      .slice()
                      .sort((a, b) => a.bed_number.localeCompare(b.bed_number))
                      .map((bed) => (
                        <li key={bed.id} className="flex items-center justify-between gap-2">
                          <span className="text-[11.5px] font-semibold text-ink font-mono">{bed.bed_number}</span>
                          <span className="flex items-center gap-2 min-w-0">
                            {bed.current_patient && (
                              <span className="text-[11px] text-text-soft truncate">
                                {bed.current_patient.first_name} {bed.current_patient.last_name}
                              </span>
                            )}
                            <StatusBadge
                              status={bed.status}
                              label={BED_STATUS_LABEL[bed.status] ?? bed.status}
                            />
                          </span>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────

const PAGE_TITLES: Record<string, string> = {
  overview: 'Overview',
  patients: 'My Patients',
  vitals: 'Vitals',
  admit: 'Admit Patient',
  requests: 'Admission Requests',
  wards: 'Ward Overview',
};

interface Props {
  user: User;
  initialStats: NurseStats | null;
  slug: string;
}

export function NurseDashboard({ user, initialStats, slug: _slug }: Props) {
  const [page, setPage] = useState('overview');
  // Patient whose vitals are open — set by "Record vitals" row actions so
  // the Vitals page lands with that patient already selected.
  const [vitalsFor, setVitalsFor] = useState<NurseAdmission | null>(null);
  const [isOnDuty, setIsOnDuty] = useState(user.is_on_duty ?? false);
  // AUTH-6: server render can't refresh an expired session — fall back to a
  // client-side stats fetch instead of shimmering forever.
  const { data: fetchedStats } = useApi<NurseStats>(initialStats ? null : ENDPOINTS.NURSE_STATS);
  const stats = initialStats ?? fetchedStats;

  function openVitals(a: NurseAdmission) {
    setVitalsFor(a);
    setPage('vitals');
  }

  return (
    <DashboardShell
      navItems={NAV}
      activePage={page}
      onPageChange={setPage}
      user={{ ...user, is_on_duty: isOnDuty }}
      pageTitle={PAGE_TITLES[page]}
      dutyToggle={<DutyToggle isOnDuty={isOnDuty} onToggle={setIsOnDuty} />}
      // D1 built this prop and Superadmin/Org Admin pass it; Nurse never did,
      // so this dashboard had no mobile gate at all. Same omission the T5
      // harness caught on Superadmin.
      smallScreenGateFor="Nurse"
    >
      {page === 'overview' && <OverviewPage stats={stats} onNavigate={setPage} onRecordVitals={openVitals} isOnDuty={isOnDuty} />}
      {page === 'patients' && <MyPatientsPage onRecordVitals={openVitals} />}
      {page === 'vitals'   && <VitalsPage selected={vitalsFor} onSelect={setVitalsFor} />}
      {page === 'admit'    && <AdmitPatientPage />}
      {page === 'requests' && <AdmissionRequestsPage />}
      {page === 'wards'    && <WardsPage />}
    </DashboardShell>
  );
}
