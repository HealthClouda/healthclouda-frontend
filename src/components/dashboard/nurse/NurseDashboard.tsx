'use client';

import { useState } from 'react';
import { DashboardShell, type NavItem } from '@/components/layout/DashboardShell';
import { StatCard } from '@/components/dashboard/StatCard';
import { DutyToggle, dutyBannerText, type DutyState } from '@/components/dashboard/DutyToggle';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { formInputClass } from '@/components/ui/FormField';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SlidePanel } from '@/components/ui/SlidePanel';
import { DischargePanel } from '@/components/dashboard/shared/DischargePanel';
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
  NurseStats,
  NurseAdmission,
  AdmissionAttendingDoctor,
  PatientVitals,
  Ward,
  WardBed,
  Paginated,
  EpisodeListItem,
  AttendingDoctor,
  OrgVisiblePatient,
  EmergencyAdmissionResponse,
  AdmissionRequest,
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

// FLAG-041 — who is attending, so a handover is visible where a nurse
// actually looks. /nurse/my-patients/ (ActiveAdmissionSerializer) carries no
// attending_doctor field at all; /ward/admissions/ (AdmissionListSerializer,
// same NURSE-readable permission, CanManageAdmissions) does. Keyed by
// admission id since both endpoints describe the same Admission rows.
// `undefined` (id not in the map — endpoint failed, still loading, or this
// admission fell off a page) degrades to the same em dash as "no doctor
// named yet" rather than a blank or a crash: a missing lookup and an absent
// fact must never be told apart in the UI (StatCard's `?? '—'` precedent).
type AttendingByAdmission = Map<string, AdmissionAttendingDoctor>;

function AttendingCell({ admission, attendingByAdmission }: {
  admission: NurseAdmission;
  attendingByAdmission: AttendingByAdmission;
}) {
  const info = attendingByAdmission.get(admission.id);
  if (info?.attending_doctor_name) {
    return <span className="text-xs text-text-mid">{info.attending_doctor_name}</span>;
  }
  if (info?.needs_attending_doctor) {
    return <span className="text-xs font-semibold text-warning-strong">Unassigned</span>;
  }
  return <span className="text-xs text-text-soft">—</span>;
}

// Shared by the Overview preview and the My Patients table — the two differed
// only in whether Age/Sex was shown, and had drifted apart in styling.
function admissionColumns(
  onRecordVitals: (a: NurseAdmission) => void,
  attendingByAdmission: AttendingByAdmission,
  opts: {
    showAgeSex?: boolean;
    admittedAsDate?: boolean;
    // Part 2 — only wired on the full My Patients table, not the Overview
    // preview: an action button in a five-row preview is noise, not help.
    onDischarge?: (a: NurseAdmission) => void;
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
    { key: 'attending', header: 'Attending', className: 'whitespace-nowrap', render: (a) => (
      <AttendingCell admission={a} attendingByAdmission={attendingByAdmission} />
    ) },
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
    ...(opts.onDischarge
      ? [{
          key: 'ward-actions',
          header: '',
          className: 'text-right whitespace-nowrap',
          render: (a: NurseAdmission) => (
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => opts.onDischarge!(a)} className="text-xs font-semibold text-danger hover:underline">
                Discharge
              </button>
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

// FLAG-041 — fetches the ACTIVE admissions on /ward/admissions/ (the endpoint
// that actually carries attending_doctor_name — see the type's comment) and
// keys them by admission id. Called from EACH page below rather than lifted
// to the top-level `NurseDashboard`, deliberately: `DashboardShell`'s small-
// screen gate (`smallScreenGateFor`) works by never mounting its children at
// all below the breakpoint (D3/FLAG-203) — a hook called any higher than
// that would fire regardless of the gate, exactly the "fetched but hidden"
// shape FLAG-203 exists to prevent. `useAllPages` (not `usePaginatedList`)
// because a partial map here would silently mislabel a real admission as "no
// field returned" instead of reporting who is actually attending — same
// reasoning as the ward board's FLAG-013 fix. A failure here degrades to an
// empty map, not a broken dashboard: `attendingByAdmission.get(id)` on an
// empty Map just returns `undefined`, which AttendingCell already renders as
// the safe em dash.
function useAttendingDoctors(): AttendingByAdmission {
  const { data } = useAllPages<AdmissionAttendingDoctor>(ENDPOINTS.ADMISSIONS + '?status=ACTIVE');
  const rows = data ?? [];
  const map: AttendingByAdmission = new Map();
  for (const row of rows) map.set(row.id, row);
  return map;
}

// ─── Overview ────────────────────────────────────────────────────

function OverviewPage({ stats, onNavigate, onRecordVitals, duty }: {
  stats: NurseStats | null;
  onNavigate: (p: string) => void;
  onRecordVitals: (a: NurseAdmission) => void;
  duty: DutyState;
}) {
  const { data, loading, error, refetch } =
    useApi<Paginated<NurseAdmission>>(ENDPOINTS.NURSE_MY_PATIENTS + '?page_size=5');
  const admissions = data?.results ?? [];
  const attendingByAdmission = useAttendingDoctors();

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${duty.isOnDuty ? 'bg-success-bg border-success/20' : 'bg-chip border-border'}`}>
        <p className={`text-sm font-medium ${duty.isOnDuty ? 'text-success-strong' : 'text-text-soft'}`}>
          {dutyBannerText(duty)}
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
          columns={admissionColumns(onRecordVitals, attendingByAdmission)}
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

// ─── Discharge (Part 2 / Build 4, FLAG-045) ────────────────────────
//
// The outcome list and the panel itself now live in one shared module
// (`@/components/dashboard/shared/DischargePanel`), used by both this file
// and DoctorDashboard.tsx — see that module's header comment for why
// (FLAG-242 review of #150: a rule copied instead of shared meant the same
// timezone bug had to be fixed twice). Which outcomes this dashboard offers
// is decided in exactly one place — `outcomesAllowedForRole('NURSE')` in
// that shared module — passed in here as `role="NURSE"`, not a boolean per
// outcome living beside it.
//
// FLAG-045/FLAG-592 (owner's decision, 2026-09-17) — this screen is
// nurse-only (route-gated the same way every dashboard is; see
// requireDashboardUser() in CLAUDE.md §5), and offers ONLY ABSCONDED and
// DECEASED — ROUTINE / TRANSFERRED_OUT / AGAINST_MEDICAL_ADVICE are a
// doctor's judgement call, not hers. `discharge_patient()` now rejects all
// three from a non-doctor caller, not only AMA (that was the bug: the
// backend previously only enforced the doctor-only rule for AMA, leaving a
// nurse able to send a patient home on her own authority for every other
// outcome). ABSCONDED and DECEASED both come back `needs_doctor_review` so
// a doctor reviews them the next morning.

// ─── My Patients page ─────────────────────────────────────────────
//
// No doctor-reassign panel here on purpose. `AdmissionViewSet.reassign_doctor`
// is DOCTOR-only (`apps/ward/views.py`) and 403s for every other role,
// including NURSE — so a "Doctor" button on this screen would 403 on every
// click. Reassignment belongs on a doctor-side admissions surface — the same
// missing screen FLAG-042 already tracks — not built here, per the owner.
// Caught in review of an earlier version of this PR, which had the button
// wired to a mocked `{message: 'ok'}` response the real backend can never
// return.

function MyPatientsPage({ onRecordVitals }: { onRecordVitals: (a: NurseAdmission) => void }) {
  const { items: admissions, count, page, setPage, totalPages, loading, error, refetch } =
    usePaginatedList<NurseAdmission>(ENDPOINTS.NURSE_MY_PATIENTS);
  const attendingByAdmission = useAttendingDoctors();
  const [discharging, setDischarging] = useState<NurseAdmission | null>(null);

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
        columns={admissionColumns(onRecordVitals, attendingByAdmission, {
          showAgeSex: true,
          admittedAsDate: true,
          onDischarge: setDischarging,
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
        role="NURSE"
        idPrefix="discharge"
        readError={(err, fallback) => readFieldError(
          err,
          ['discharge_outcome', 'discharge_summary', 'destination', 'deceased_at', 'discovered_at', 'non_field_errors'],
          fallback,
        ).message}
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
 * {error, code, details: {<field>: <message> | [<message>, ...]}} —
 * directly from `details` rather than the flattened `.message` (which
 * prefixes the field name, e.g. "gender: Patient gender..."). Returning
 * which field failed is what lets the caller branch into the gender
 * two-step.
 *
 * The ward gender-policy mismatch (FLAG-239/301) used to arrive as a flat
 * `{error: message}` with no `details` key at all — `admit_patient()`
 * (apps/ward/services.py) raised a plain `ValueError`, and every ward view
 * caught it and returned a hand-built `Response`, bypassing
 * `custom_exception_handler` entirely. That made this branch structurally
 * unreachable on all three admit surfaces (FLAG-031), worked around here
 * with a text match against the backend's fixed wording. Fixed at the
 * source in backend #194 (`WardGenderMismatch`, a typed `ValueError`
 * subclass the views translate to `serializers.ValidationError({'gender':
 * ...})`) — `details.gender` now arrives as a STRING, not a list, matching
 * what `AdmissionCreateSerializer` produced before #193. The text-match
 * fallback is gone; this is a pure `details` read like every other field
 * rejection.
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

/**
 * Strips the backend's trailing "Resend with <field>=true …" sentence before
 * a warning reaches a nurse.
 *
 * Two reasons, and the second is the important one:
 *  1. It is an API instruction. She has a button; she is not composing a
 *     request by hand, and reading her a parameter name is noise mid-emergency.
 *  2. On the emergency route the instruction is **wrong**. The on-duty refusal
 *     says `attending_doctor_override=true`, but that endpoint declares no such
 *     field and DRF drops unknown keys, so following it verbatim returns the
 *     same 400 for ever (backend FLAG-601, reproduced 2026-09-18). The single
 *     `override` flag this form already resends is what actually works.
 *
 * Deliberately display-only — the branch logic still reads `details`, never
 * this text, so when FLAG-601 is fixed this quietly becomes a nicety again
 * rather than something that has to be unwound.
 */
function withoutResendInstruction(message: string): string {
  return message.replace(/\s*Resend with \S+=true[^.]*\.\s*$/, '').trim() || message;
}

function admissionFieldError(err: unknown): { field: string | null; message: string } {
  return readFieldError(
    err,
    // A-3: 'admission_reason'/'admission_source'/'attending_doctor' added
    // for the emergency path — AdmissionCreateSerializer.validate
    // (apps/ward/serializers.py) can now reject on any of these three too.
    // 'patient' (backend fix/admission-refusal-shapes, paired with this
    // branch) is a hard stop — see admissionFieldError's caller, which never
    // offers an override for it the way it does for 'gender'.
    ['gender', 'admission_reason', 'admission_source', 'attending_doctor', 'episode', 'bed', 'patient', 'non_field_errors'],
    'Failed to admit patient',
  );
}

/**
 * A bed assigned seconds ago by someone else — 409, not 400. Deliberately
 * checked BEFORE `readFieldError`/`admissionFieldError`: the backend's 409
 * body is flat (no `details` key at all, same shape the flat gender-mismatch
 * error used to have pre-#194), so routing it through the field-error path
 * would just fall through to `non_field_errors`/the generic fallback and get
 * rendered as if the nurse had typed something wrong. She didn't — the bed
 * she picked was valid when she picked it. The only correct response is to
 * re-fetch the bed list and let her pick again, not to blame a field.
 */
function isBedConflict(err: unknown): boolean {
  return err instanceof ClientApiError && err.status === 409;
}

const BED_CONFLICT_MESSAGE = 'That bed was just taken by another patient — the list below has been refreshed, pick another.';

// Non-blocking by design — `role="status"` (polite), not `role="alert"`,
// and it renders ALONGSIDE the rest of the form rather than replacing it
// the way GenderOverrideWarning/PatientBlockedNotice do. Her input was
// valid; nothing about the rest of what she typed (reason, doctor, …) needs
// re-entering, only the bed.
// `message` exists because the emergency route's 409 is ambiguous — see the
// comment at its catch block. The ordered paths pass nothing and keep the
// canned wording, which is accurate for them: there, 409 only ever means the
// bed went.
function BedConflictNotice({ onDismiss, message }: { onDismiss: () => void; message?: string }) {
  return (
    <div role="status" className="rounded-lg border border-info/30 bg-info-bg px-3 py-2.5 flex items-start justify-between gap-2">
      <p className="text-xs font-semibold text-info">{message ?? BED_CONFLICT_MESSAGE}</p>
      <button type="button" onClick={onDismiss} className="text-xs font-semibold text-text-soft hover:text-ink flex-shrink-0">
        Dismiss
      </button>
    </div>
  );
}

// Build 2 (FLAG-575) — POST /ward/emergency-admissions/ errors
// (apps/ward/views.py EmergencyAdmissionView / EmergencyAdmissionSerializer).
// 'gender' and 'attending_doctor' are the two warn-and-allow two-steps
// (share the single `override` flag — see EmergencyAdmissionRequest's
// comment in types/dashboard.ts); 'attending_doctor_id' is a genuine
// validation failure (bad id), never reachable from this picker's own list;
// 'patient' is the deceased hard stop. Everything else is a flat {error}
// with no `details` key at all and falls through to the generic message.
function emergencyAdmissionFieldError(err: unknown): { field: string | null; message: string } {
  return readFieldError(
    err,
    [
      'gender', 'attending_doctor', 'attending_doctor_id', 'patient',
      'patient_id', 'bed_id', 'description', 'presenting_complaint',
      'stated_hcl_id', 'non_field_errors',
    ],
    'Failed to admit patient',
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
function GenderOverrideWarning({ message, saving, onOverride, onCancel, cancelLabel, note }: {
  message: string;
  saving: boolean;
  onOverride: (e: React.MouseEvent) => void;
  onCancel: () => void;
  // The defaults suit the ward-gender two-step this box was written for. The
  // on-duty two-step reuses it and NEITHER default is true there: "choose a
  // different bed" is not the way out of an off-duty doctor, and on the
  // emergency route that override is not audited at all (backend FLAG-601).
  // So the caller overrides both rather than this box asserting them.
  cancelLabel?: string;
  note?: string;
}) {
  return (
    <div role="alert" className="rounded-lg border border-warning/30 bg-warning-bg px-3 py-2.5 space-y-2">
      <p className="text-xs font-semibold text-warning-strong">{withoutResendInstruction(message)}</p>
      <p className="text-[11px] text-text-soft">
        {note ?? 'Admitting anyway is recorded in this patient’s audit trail.'}
      </p>
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
          {cancelLabel ?? 'Choose a different bed'}
        </button>
      </div>
    </div>
  );
}

// `details.patient` — a hard stop, not a two-step. Unlike the gender/on-duty
// warnings above there is no override: no bed choice or confirmation click
// changes this outcome, so the form offers neither. Deliberately renders
// only the backend's own message, with no "why" added and no "try again" —
// the instruction for the nurse here is to escalate, not retry.
function PatientBlockedNotice({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div role="alert" className="rounded-lg border border-danger/30 bg-danger-bg px-3 py-2.5 space-y-2">
      <p className="text-xs font-semibold text-danger">{message}</p>
      <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs font-semibold text-text-soft hover:text-ink">
        Close
      </button>
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
  // Set on `details.patient` — a hard stop, never retried and never given an
  // override (see PatientBlockedNotice).
  const [patientBlocked, setPatientBlocked] = useState<string | null>(null);
  // Set on a 409 — non-blocking (see BedConflictNotice): the rest of the
  // form stays live, only the bed list gets refreshed.
  const [bedConflict, setBedConflict] = useState(false);

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
      // The bed she picked was valid when she picked it — someone else just
      // took it. Not her mistake and not a field to correct: re-fetch the
      // beds and let her carry on, rather than showing a validation error.
      if (isBedConflict(err)) {
        setBedId('');
        setBedConflict(true);
        void refetchBeds();
        toast.warning(BED_CONFLICT_MESSAGE);
        return;
      }
      const { field, message } = admissionFieldError(err);
      if (field === 'gender' && !override) {
        setGenderWarning(message);
      } else if (field === 'patient') {
        setPatientBlocked(message);
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
          {!genderWarning && !patientBlocked && (
            <button type="submit" form="admit-patient" disabled={saving || !bedId}
              className="px-4 py-2 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
              {saving ? 'Admitting…' : 'Admit'}
            </button>
          )}
        </div>
      }
    >
      <form id="admit-patient" onSubmit={(e) => void submit(e, false)} className="space-y-4">
        {patientBlocked ? (
          <PatientBlockedNotice message={patientBlocked} onClose={onClose} />
        ) : (
          <>
        {bedConflict && <BedConflictNotice onDismiss={() => setBedConflict(false)} />}
        <BedPicker
          id="admit-bed"
          beds={beds}
          loading={bedsLoading}
          error={bedsError}
          onRetry={refetchBeds}
          value={bedId}
          onChange={(v) => { setBedId(v); setGenderWarning(null); setBedConflict(false); }}
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
          </>
        )}

        {formError && <p role="alert" className="text-xs font-semibold text-danger">{formError}</p>}
      </form>
    </SlidePanel>
  );
}

// ─── Emergency admission (build 2 — FLAG-575, closes FLAG-243) ─────────
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
// ONE call — POST /ward/emergency-admissions/. This replaces the old chained
// POST /episodes/ then POST /ward/admissions/: that version's admission call
// refused a deceased patient while the episode call had no such guard, so a
// refusal left an ACTIVE episode open with nobody in a bed behind it
// (FLAG-243, reproduced against #148). Inside the backend's single
// `transaction.atomic()` there is nothing to orphan — either the patient (if
// new), the org access grant, the episode and the admission all get created,
// or none of them do.
//
// Patient selection is now TWO paths, not one:
//  - an existing patient THIS hospital already has (an approved
//    OrgAccessRequest, or an existing episode here) — found via
//    /patients/search/, same scoping as before (see OrgVisiblePatient's
//    comment in types/dashboard.ts);
//  - a genuine first-ever walk-in with no record anywhere here — a short
//    free-text `description` instead of a name, admitted directly. This is
//    the gap the old form had no path for at all (flagged, not built, in
//    the previous round) — a patient with no prior relationship to this org
//    could be found by nobody's search and could not be admitted.
// A patient id belonging to another hospital is refused with a plain
// not-found 400, deliberately indistinguishable from a typo
// (`PatientNotAvailableHere` — see the backend service's own docstring:
// "there is no break-glass").

function EmergencyPatientSearch({ onSelect, onNewPatient }: {
  onSelect: (p: OrgVisiblePatient) => void;
  onNewPatient: () => void;
}) {
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
      ) : null}
      <button
        type="button"
        onClick={onNewPatient}
        className="text-xs font-semibold text-primary-dark hover:underline"
      >
        Can&apos;t find them? Admit as a new emergency patient
      </button>
      {results.length > 0 ? (
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
//
// ⚠️ CORRECTED — `restrictToOnDuty` disabling the off-duty `<option>`s was
// itself wrong, not just stale. `_check_attending_doctor_on_duty`
// (apps/ward/serializers.py) is the advisor's real Q2 answer: SOFT,
// warn-and-allow, the same shape as the ward gender rule (FLAG-301) —
// "a night with no on-duty doctor must never refuse an admission outright."
// Disabling the option made the backend's own override unreachable from the
// UI. `restrictToOnDuty` now defaults to `true` only because no caller
// currently needs the old hard-disable behaviour; every real call site
// (`EmergencyAdmitForm`) passes `restrictToOnDuty={false}` and handles the
// resulting 400 with the same select → warn → "Admit anyway" two-step used
// for the gender check.
function DoctorPicker({
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
  // A-2b's picker (emergency admission) is never-blocks/optional — the only
  // live caller. No caller currently sets this true (the reassign-doctor
  // panel that would have is gone — it belongs on a doctor-side admissions
  // surface, FLAG-042, not built here), but kept as a prop rather than
  // deleted: a future required use of the same doctor list shouldn't need a
  // second component.
  required?: boolean;
  restrictToOnDuty?: boolean;
}) {
  const onDuty = (doctors ?? []).filter(d => d.is_on_duty);
  const offDuty = (doctors ?? []).filter(d => !d.is_on_duty);
  const defaultHelperText = restrictToOnDuty
    ? (required
        ? 'Choose the doctor taking over this patient. Only doctors on duty can be selected.'
        : 'Optional — naming one never blocks this admission. Only doctors on duty can be selected; leave it as-is if none is available.')
    : (required ? 'Choose the doctor.' : 'Optional — naming one never blocks this admission.');
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
            <option value="">{required ? 'Select a doctor…' : 'No doctor available right now'}</option>
            {onDuty.length > 0 && (
              <optgroup label="On duty">
                {onDuty.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
              </optgroup>
            )}
            {offDuty.length > 0 && (
              <optgroup label={restrictToOnDuty ? 'Not on duty — cannot be selected' : 'Not on duty'}>
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
  // True once the nurse has chosen "admit as a new emergency patient" — a
  // genuine walk-in with no record here. Mutually exclusive with `patient`;
  // switching back to search clears the description/HCL-ID fields below
  // rather than leaving stale text behind for a different patient.
  const [newPatient, setNewPatient] = useState(false);
  const [description, setDescription] = useState('');
  const [statedHclId, setStatedHclId] = useState('');
  const [reason, setReason] = useState('');
  const [bedId, setBedId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [genderWarning, setGenderWarning] = useState<string | null>(null);
  // Set only when the server's on-duty two-step fires (backend Q2,
  // `_check_attending_doctor_on_duty` — soft/warn-and-allow, same shape as
  // the gender check, never a hard block: "a night with no on-duty doctor
  // must never refuse an admission outright"). Off-duty doctors are
  // selectable in the picker below (not disabled) precisely so this
  // override can be exercised from the UI. Unlike the old two-call form,
  // this endpoint has ONE `override` flag shared by both the gender and the
  // on-duty warning — resending either resends the same field.
  const [doctorWarning, setDoctorWarning] = useState<string | null>(null);
  // Set on `details.patient` (deceased) — a hard stop, never retried and
  // never given an override.
  const [patientBlocked, setPatientBlocked] = useState<string | null>(null);
  // Set on a 409 — bed taken, or the patient turns out to already be
  // admitted. Holds the SERVER's sentence rather than a boolean, because
  // those two cases are indistinguishable here and need different answers
  // from the nurse. Non-blocking: nothing was written (the whole call is one
  // transaction), so this is purely "pick again", not a lost admission.
  const [bedConflict, setBedConflict] = useState<string | null>(null);

  function resetPatientSelection() {
    setPatient(null);
    setNewPatient(false);
    setDescription('');
    setStatedHclId('');
    setGenderWarning(null);
    setDoctorWarning(null);
  }

  async function submit(e: React.FormEvent | React.MouseEvent, override = false) {
    e.preventDefault();
    const trimmedReason = reason.trim();
    const trimmedDescription = description.trim();
    if (saving || !bedId || !trimmedReason) return;
    if (!patient && !trimmedDescription) return;
    setSaving(true);
    setFormError(null);

    try {
      // 🎯 The control FLAG-243 exists to close: exactly ONE request, and no
      // /episodes/ call at all — everything (find-or-create the patient, the
      // org access grant, the episode, the admission) happens server-side in
      // one transaction.
      const res = (await apiAction(ENDPOINTS.WARD_EMERGENCY_ADMISSIONS, 'POST', {
        bed_id: bedId,
        ...(patient ? { patient_id: patient.id } : { description: trimmedDescription }),
        presenting_complaint: trimmedReason,
        ...(doctorId ? { attending_doctor_id: doctorId } : {}),
        ...(statedHclId.trim() ? { stated_hcl_id: statedHclId.trim() } : {}),
        override,
      })) as EmergencyAdmissionResponse;

      const needsDoctor = res?.admission?.needs_attending_doctor;
      const incomplete = res?.patient?.registration_incomplete;
      const admittedName = `${res?.patient?.first_name ?? patient?.first_name ?? ''} ${res?.patient?.last_name ?? patient?.last_name ?? ''}`.trim();
      toast.success(
        `${admittedName || 'Patient'} admitted`
        + (needsDoctor ? ' — no attending doctor assigned yet' : '')
        + (incomplete ? ' — record incomplete, reception can complete it later' : ''),
      );
      setGenderWarning(null);
      setDoctorWarning(null);
      onAdmitted();
      onClose();
    } catch (err) {
      // ⚠️ This endpoint returns 409 for TWO different situations — the bed
      // was taken a second ago, and "this patient already has an active
      // admission" — and both arrive as a flat {error} with no `details`, so
      // they are indistinguishable without matching on wording. We therefore
      // show the SERVER's sentence rather than this file's canned bed message:
      // telling a nurse "that bed was just taken" when the real answer is
      // "he is already in a bed upstairs" sends her round a loop that picking
      // another bed can never end. The bed list is refreshed either way — it
      // is right for the common case and harmless for the other.
      //
      // Nothing was written in either case (the whole call is one backend
      // transaction), so this is a re-pick, never a lost admission.
      if (isBedConflict(err)) {
        const conflict = err instanceof Error && err.message ? err.message : BED_CONFLICT_MESSAGE;
        setBedId('');
        setBedConflict(conflict);
        void refetchBeds();
        toast.warning(conflict);
        return;
      }
      const { field, message } = emergencyAdmissionFieldError(err);
      if (field === 'gender' && !override) {
        setGenderWarning(message);
      } else if (field === 'attending_doctor' && !override) {
        setDoctorWarning(message);
      } else if (field === 'patient') {
        // Hard stop — no override, no retry language: deceased, and
        // resending cannot change that.
        setPatientBlocked(message);
      } else {
        setFormError(message);
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
      subtitle={
        patient ? `${patient.first_name} ${patient.last_name}`
          : newPatient ? 'New emergency patient — no record yet'
          : 'No doctor has seen this patient yet'
      }
      footer={
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-soft hover:text-ink">Cancel</button>
          {!genderWarning && !doctorWarning && !patientBlocked && (
            <button
              type="submit"
              form="emergency-admit"
              disabled={saving || !bedId || !reason.trim() || (!patient && !description.trim())}
              className="px-4 py-2 bg-danger hover:opacity-90 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {saving ? 'Admitting…' : 'Admit now'}
            </button>
          )}
        </div>
      }
    >
      <form id="emergency-admit" onSubmit={(e) => void submit(e, false)} className="space-y-4">
        {!patient && !newPatient ? (
          <EmergencyPatientSearch onSelect={setPatient} onNewPatient={() => setNewPatient(true)} />
        ) : patient ? (
          <div className="flex items-center justify-between bg-chip rounded-lg px-3 py-2">
            <div>
              <div className="text-[13px] font-semibold text-ink">{patient.first_name} {patient.last_name}</div>
              <div className="text-[11px] text-text-soft font-mono">{patient.healthclouda_id}</div>
            </div>
            <button type="button" onClick={resetPatientSelection} className="text-xs font-semibold text-primary-dark hover:underline">
              Change patient
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-ink">New emergency patient — no record yet</p>
              <button type="button" onClick={resetPatientSelection} className="text-xs font-semibold text-primary-dark hover:underline">
                Search instead
              </button>
            </div>
            <div>
              <label htmlFor="emergency-description" className="block text-xs font-medium text-text-soft mb-1">
                Who is this patient?
              </label>
              <p className="text-[11px] text-text-soft mb-1">
                Required — a short description, e.g. &quot;man, ~40, brought in by police&quot;. Reception
                completes the full record later.
              </p>
              <input
                id="emergency-description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                maxLength={100}
                className={formInputClass}
              />
            </div>
            <div>
              <label htmlFor="emergency-stated-hcl-id" className="block text-xs font-medium text-text-soft mb-1">
                HealthClouda ID they say they have (optional)
              </label>
              <p className="text-[11px] text-text-soft mb-1">
                A note only — it does not link or grant access to any record.
              </p>
              <input
                id="emergency-stated-hcl-id"
                value={statedHclId}
                onChange={e => setStatedHclId(e.target.value)}
                maxLength={64}
                className={formInputClass}
              />
            </div>
          </div>
        )}

        {patientBlocked ? (
          <PatientBlockedNotice message={patientBlocked} onClose={onClose} />
        ) : (
          <>
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

        {bedConflict && (
          <BedConflictNotice message={bedConflict} onDismiss={() => setBedConflict(null)} />
        )}
        <BedPicker
          id="emergency-admit-bed"
          beds={beds}
          loading={bedsLoading}
          error={bedsError}
          onRetry={refetchBeds}
          value={bedId}
          onChange={(v) => { setBedId(v); setGenderWarning(null); setBedConflict(null); }}
        />

        <DoctorPicker
          doctors={doctors}
          loading={doctorsLoading}
          error={doctorsError}
          value={doctorId}
          onChange={(v) => { setDoctorId(v); setDoctorWarning(null); }}
          restrictToOnDuty={false}
        />

        {genderWarning && (
          <GenderOverrideWarning
            message={genderWarning}
            saving={saving}
            onOverride={(e) => void submit(e, true)}
            onCancel={() => setGenderWarning(null)}
          />
        )}

        {doctorWarning && (
          <GenderOverrideWarning
            message={doctorWarning}
            saving={saving}
            // The SAME `override` flag as the gender two-step — this endpoint
            // has only one, unlike the ordered-admit and accept paths, which
            // carry a separate `attending_doctor_override`.
            onOverride={(e) => void submit(e, true)}
            onCancel={() => setDoctorWarning(null)}
            cancelLabel="Choose another doctor"
            // NOT "recorded in the audit trail": on this route that override
            // writes no audit row at all (backend FLAG-601 — the three sibling
            // routes do, this one discards the check's result). Saying it is
            // audited would be telling a nurse something untrue about a
            // clinical decision, so we say only what is actually the case.
            note="The admission goes ahead and this doctor is recorded as attending."
          />
        )}
          </>
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
// Verified against backend source 2026-09-14 — `AdmissionRequestViewSet`
// (`apps/ward/views.py`), `AdmissionRequestAcceptSerializer`,
// `AdmissionRequestDeclineSerializer` (`apps/ward/serializers.py`). No
// longer contract-only; see the Part 2 note on `AdmissionRequest` in
// types/dashboard.ts for what each shape carries.

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
  // Set on `details.patient` — a hard stop, never retried and never given
  // an override, same as the other two admit surfaces.
  const [patientBlocked, setPatientBlocked] = useState<string | null>(null);
  // Set on a 409 — non-blocking, same as the other two admit surfaces.
  const [bedConflict, setBedConflict] = useState(false);

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
      // The bed she picked was valid a moment ago — someone else just took
      // it. Not her mistake: re-fetch the beds and let her pick again,
      // rather than treating it as a validation error on the bed field.
      if (isBedConflict(err)) {
        setBedId('');
        setBedConflict(true);
        void refetchBeds();
        toast.warning(BED_CONFLICT_MESSAGE);
        return;
      }
      // Reuses the same gender two-step as the other two admit paths
      // (backend FLAG-301) — a ward gender-policy mismatch applies to a bed
      // regardless of which of the three entry points put the patient there.
      const { field, message } = readFieldError(err, ['gender', 'bed', 'patient', 'non_field_errors'], 'Failed to accept admission request');
      if (field === 'gender' && !override) {
        setGenderWarning(message);
      } else if (field === 'patient') {
        setPatientBlocked(message);
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
          {!genderWarning && !patientBlocked && (
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
        {patientBlocked ? (
          <PatientBlockedNotice message={patientBlocked} onClose={onClose} />
        ) : (
          <>
        {bedConflict && <BedConflictNotice onDismiss={() => setBedConflict(false)} />}
        <BedPicker
          id="accept-request-bed"
          beds={beds}
          loading={bedsLoading}
          error={bedsError}
          onRetry={refetchBeds}
          value={bedId}
          onChange={(v) => { setBedId(v); setGenderWarning(null); setBedConflict(false); }}
        />
        {genderWarning && (
          <GenderOverrideWarning
            message={genderWarning}
            saving={saving}
            onOverride={(e) => void submit(e, true)}
            onCancel={() => setGenderWarning(null)}
          />
        )}
          </>
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
  const [duty, setDuty] = useState<DutyState>({
    isOnDuty: user.is_on_duty ?? false,
    offDutyOverride: user.off_duty_override ?? false,
  });
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
      user={{ ...user, is_on_duty: duty.isOnDuty, off_duty_override: duty.offDutyOverride }}
      pageTitle={PAGE_TITLES[page]}
      dutyToggle={<DutyToggle isOnDuty={duty.isOnDuty} offDutyOverride={duty.offDutyOverride} onChange={setDuty} />}
      // D1 built this prop and Superadmin/Org Admin pass it; Nurse never did,
      // so this dashboard had no mobile gate at all. Same omission the T5
      // harness caught on Superadmin.
      smallScreenGateFor="Nurse"
    >
      {page === 'overview' && (
        <OverviewPage stats={stats} onNavigate={setPage} onRecordVitals={openVitals} duty={duty} />
      )}
      {page === 'patients' && <MyPatientsPage onRecordVitals={openVitals} />}
      {page === 'vitals'   && <VitalsPage selected={vitalsFor} onSelect={setVitalsFor} />}
      {page === 'admit'    && <AdmitPatientPage />}
      {page === 'requests' && <AdmissionRequestsPage />}
      {page === 'wards'    && <WardsPage />}
    </DashboardShell>
  );
}
