'use client';

import { useState, useEffect, useRef } from 'react';
import { DashboardShell, type NavItem } from '@/components/layout/DashboardShell';
import { StatCard } from '@/components/dashboard/StatCard';
import { DutyToggle } from '@/components/dashboard/DutyToggle';
import { useApi, apiAction, usePaginatedList } from '@/hooks/use-api';
import { dataGet } from '@/lib/client-api';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useToast } from '@/store/toast';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ErrorState } from '@/components/ui/ErrorState';
import { ShimmerRows } from '@/components/ui/Shimmer';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SlidePanel } from '@/components/ui/SlidePanel';
import { Avatar } from '@/components/ui/Avatar';
import { formatDate, formatTime, isToday, personName, timeAgo, truncate } from '@/lib/utils';
import { ENDPOINTS } from '@/lib/config';
import type { User } from '@/types/auth';
import type {
  DoctorStats, PatientSummary, Episode, Appointment, Referral, Prescription, Paginated,
  ReferralCreateInput, ReferralCreateResponse, ReferralTargetOrganization, RegenerateLetterResponse,
} from '@/types/dashboard';

// ─── Icons ────────────────────────────────────────────────────────
function GridIcon()    { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>; }
function UserIcon()    { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>; }
function DocIcon()     { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>; }
function CalIcon()     { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>; }
function ArrowIcon()   { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>; }
function BeakerIcon()  { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" /></svg>; }
// Admissions. Same path as NurseDashboard's BedIcon, deliberately — the two
// dashboards render the same concept and should not draw it two ways. The
// beaker that was here is the PRESCRIPTIONS icon and stayed behind when this
// tile was repurposed, which read as the leftover it was.
function BedIcon()     { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>; }

const NAV: NavItem[] = [
  { id: 'overview',      label: 'Overview',      icon: <GridIcon /> },
  { id: 'patients',      label: 'My Patients',   icon: <UserIcon /> },
  { id: 'episodes',      label: 'Episodes',      icon: <DocIcon /> },
  { id: 'appointments',  label: 'Appointments',  icon: <CalIcon /> },
  { id: 'referrals',     label: 'Referrals',     icon: <ArrowIcon /> },
  { id: 'prescriptions', label: 'Prescriptions', icon: <BeakerIcon /> },
];

/**
 * Segmented filter control, shared by Episodes and Referrals — both previously
 * carried their own copy of this markup.
 *
 * ⚠️ The active pill is `bg-primary-dark`, NOT `bg-primary`. Measured
 * 2026-08-23: white on `primary` is **4.21:1 and fails WCAG AA** (FLAG-014),
 * white on `primary-dark` is **5.98:1 and passes**. The `bg-blue-600` this
 * replaces was 5.17:1 — also passing — so migrating to `bg-primary` "for
 * consistency" would have been a silent accessibility regression on a control
 * that was previously fine. Tokens are not automatically the accessible choice.
 */
function FilterTabs<T extends string>({
  value, options, onChange, label,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium" role="group" aria-label={label}>
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`px-3 py-1.5 transition-colors ${
            value === o.value ? 'bg-primary-dark text-white' : 'text-text-mid hover:bg-page'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Page heading + count line, repeated on every list page. */
function PageHeading({ title, count, unit }: { title: string; count: number; unit: string }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {count > 0 && <p className="text-sm text-text-soft mt-0.5">{count} {unit}</p>}
    </div>
  );
}

/**
 * Names the patient on a row that may carry either a flat `patient_name` or a
 * nested `patient`. Episodes/referrals/prescriptions still hedge both ways —
 * unlike `Appointment`, their real shapes have not been captured live yet, so
 * the hedge stays until someone verifies them (the FLAG-213 treatment, applied
 * to the other three list endpoints, is still owed).
 */
function subjectName(row: {
  patient_name?: string;
  patient?: { first_name: string; last_name: string };
}): string {
  return row.patient_name ?? personName(row.patient);
}

/**
 * Episode status filters. ACTIVE | COMPLETED are the real enum values (live
 * schema, 2026-08-22) — these tabs previously read Open/Closed, which matched
 * nothing (FLAG-004).
 */
const EPISODE_FILTERS = [
  { value: 'ACTIVE' as const, label: 'Active' },
  { value: 'COMPLETED' as const, label: 'Completed' },
  { value: '' as const, label: 'All' },
];

const REFERRAL_TABS = [
  { value: 'outgoing' as const, label: 'Outgoing' },
  { value: 'incoming' as const, label: 'Incoming' },
];

// ─── Column definitions ───────────────────────────────────────────

const overviewEpisodeColumns: DataTableColumn<Episode>[] = [
  { key: 'patient', header: 'Patient', render: ep => <span className="font-medium text-ink">{subjectName(ep)}</span> },
  { key: 'complaint', header: 'Complaint', className: 'max-w-[160px]', render: ep => <span className="text-text-soft">{truncate(ep.chief_complaint ?? '—', 30)}</span> },
  { key: 'opened', header: 'Opened', className: 'whitespace-nowrap', render: ep => <span className="text-text-soft">{timeAgo(ep.episode_start ?? ep.created_at)}</span> },
];

function patientColumns(
  onStartEpisode: (p: PatientSummary) => void,
  onRefer: (p: PatientSummary) => void,
): DataTableColumn<PatientSummary>[] {
  return [
  {
    key: 'patient',
    header: 'Patient',
    render: p => (
      <div className="flex items-center gap-2.5">
        <Avatar firstName={p.first_name} lastName={p.last_name} size="sm" />
        <div>
          <div className="font-medium text-ink">{p.first_name} {p.last_name}</div>
          <div className="text-xs text-text-soft">{p.email ?? '—'}</div>
        </div>
      </div>
    ),
  },
  { key: 'phone', header: 'Phone', render: p => p.phone_number ?? '—' },
  { key: 'dob', header: 'Date of Birth', render: p => (p.date_of_birth ? formatDate(p.date_of_birth) : '—') },
  { key: 'since', header: 'Since', className: 'whitespace-nowrap', render: p => <span className="text-text-soft">{formatDate(p.created_at)}</span> },
  {
    key: 'actions', header: '', className: 'text-right',
    render: p => (
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={() => onStartEpisode(p)}
          className="text-xs font-medium text-primary-dark hover:underline"
        >
          New episode
        </button>
        <button
          onClick={() => onRefer(p)}
          className="text-xs font-medium text-primary-dark hover:underline"
        >
          Refer
        </button>
      </div>
    ),
  },
  ];
}

function episodeColumns(onComplete: (ep: Episode) => void): DataTableColumn<Episode>[] {
  return [
    { key: 'patient', header: 'Patient', render: ep => <span className="font-medium text-ink">{subjectName(ep)}</span> },
    { key: 'complaint', header: 'Chief Complaint', className: 'max-w-xs', render: ep => <span className="text-text-soft">{truncate(ep.chief_complaint ?? '—', 50)}</span> },
    { key: 'status', header: 'Status', render: ep => <StatusBadge status={ep.status} /> },
    { key: 'opened', header: 'Opened', className: 'whitespace-nowrap', render: ep => <span className="text-text-soft">{timeAgo(ep.episode_start ?? ep.created_at)}</span> },
    {
      key: 'actions',
      header: 'Actions',
      // ACTIVE, not OPEN — see FLAG-004. Gated on the wrong value, this action
      // never rendered at all.
      render: ep => ep.status === 'ACTIVE' ? (
        <button onClick={() => onComplete(ep)} className="text-xs font-semibold text-primary-dark hover:underline">
          Complete
        </button>
      ) : null,
    },
  ];
}

const appointmentColumns: DataTableColumn<Appointment>[] = [
  {
    key: 'patient',
    header: 'Patient',
    render: a => (
      <div className="flex items-center gap-2.5">
        <Avatar firstName={a.patient?.first_name ?? '?'} lastName={a.patient?.last_name ?? ''} size="sm" />
        <span className="font-medium text-ink">{personName(a.patient)}</span>
      </div>
    ),
  },
  { key: 'doctor', header: 'Doctor', render: a => <span data-testid={`appt-doctor-${a.id}`}>{personName(a.doctor)}</span> },
  { key: 'date', header: 'Date', className: 'whitespace-nowrap', render: a => <span data-testid={`appt-when-${a.id}`}>{formatDate(a.scheduled_at)}</span> },
  { key: 'time', header: 'Time', render: a => <span className="text-text-soft">{formatTime(a.scheduled_at)}</span> },
  { key: 'reason', header: 'Reason', className: 'max-w-xs', render: a => <span className="text-text-soft">{truncate(a.reason ?? a.notes ?? '—', 40)}</span> },
  { key: 'status', header: 'Status', render: a => a.status ? <StatusBadge status={a.status} /> : <span className="text-text-soft">—</span> },
];

function referralColumns(tab: 'outgoing' | 'incoming'): DataTableColumn<Referral>[] {
  return [
    { key: 'patient', header: 'Patient', render: r => <span className="font-medium text-ink">{subjectName(r)}</span> },
    {
      key: 'party',
      header: tab === 'outgoing' ? 'Referred To' : 'Referred By',
      render: r => (tab === 'outgoing' ? r.referred_to : r.referring_doctor) ?? '—',
    },
    { key: 'reason', header: 'Reason', className: 'max-w-xs', render: r => <span className="text-text-soft">{truncate(r.reason ?? '—', 45)}</span> },
    { key: 'date', header: 'Date', className: 'whitespace-nowrap', render: r => <span className="text-text-soft">{formatDate(r.created_at)}</span> },
    { key: 'status', header: 'Status', render: r => <StatusBadge status={r.status} /> },
  ];
}

function prescriptionColumns(onCancel: (rx: Prescription) => void): DataTableColumn<Prescription>[] {
  return [
    { key: 'patient', header: 'Patient', render: rx => <span className="font-medium text-ink">{subjectName(rx)}</span> },
    { key: 'medication', header: 'Medication', render: rx => <span className="font-medium text-text-mid">{rx.medication}</span> },
    { key: 'dosage', header: 'Dosage', render: rx => rx.dosage ?? '—' },
    { key: 'frequency', header: 'Frequency', render: rx => rx.frequency ?? '—' },
    { key: 'status', header: 'Status', render: rx => <StatusBadge status={rx.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: rx => rx.status === 'ACTIVE' ? (
        <button onClick={() => onCancel(rx)} className="text-xs font-semibold text-danger hover:underline">
          Cancel
        </button>
      ) : null,
    },
  ];
}

// ─── Overview ─────────────────────────────────────────────────────

function OverviewPage({
  stats, onNavigate, isOnDuty,
}: { stats: DoctorStats | null; onNavigate: (p: string) => void; isOnDuty: boolean }) {
  const { data: apptData, loading: apptLoading, error: apptError, refetch: apptRefetch } =
    useApi<Paginated<Appointment>>(ENDPOINTS.DOC_APPOINTMENTS);
  // ?status=ACTIVE is the real enum value (ACTIVE | COMPLETED, verified against
  // the live schema 2026-08-22). The old ?status=OPEN could never match a row.
  const { data: epData, loading: epLoading, error: epError, refetch: epRefetch } =
    useApi<Paginated<Episode>>(ENDPOINTS.DOC_EPISODES + '?status=ACTIVE');

  // FLAG-004: both of these panels used to hand the server a filter it ignores
  // (?today=true) or one that matched nothing (?status=OPEN), and rendered
  // whatever came back. Neither endpoint documents ANY query parameter, so we
  // cannot claim ?status= is honoured either — on this backend, absence from
  // the schema is not evidence of non-support (FLAG-205), but it is not
  // evidence of support either. So we send the correct value AND narrow
  // client-side: right whether or not the server participates.
  //
  // ⚠️ Both filters only see the first page the server returns (~20 rows —
  // ?page_size= is ignored, FLAG-013). A doctor with more than a page of
  // appointments could have today's row fall on page 2 and not appear here.
  // Tracked as FLAG-214 rather than guessed at with an undocumented ordering
  // param, which is the exact bug class this change removes.
  const todayAppts = (apptData?.results ?? []).filter(a => isToday(a.scheduled_at)).slice(0, 6);
  const recentEps = (epData?.results ?? []).filter(ep => ep.status === 'ACTIVE').slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Duty status banner */}
      <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${isOnDuty ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'}`}>
        <p className={`text-sm font-medium ${isOnDuty ? 'text-blue-700' : 'text-gray-500'}`}>
          {isOnDuty ? 'You are on duty — patients may be assigned to you.' : 'You are currently off duty.'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard loading={!stats} label="Active Episodes"    value={stats?.active_episodes}     icon={<DocIcon />}    color="blue"   onClick={() => onNavigate('episodes')} />
        {/* FLAG-222: the field is `todays_appointments`, not `appointments_today`
            — same two words, other order, and this tile was blank because of it. */}
        <StatCard loading={!stats} label="Appointments Today" value={stats?.todays_appointments}  icon={<CalIcon />}    color="indigo" onClick={() => onNavigate('appointments')} />
        <StatCard loading={!stats} label="Pending Referrals"  value={stats?.pending_referrals}    icon={<ArrowIcon />}  color="amber"  onClick={stats?.pending_referrals ? () => onNavigate('referrals') : undefined} />
        {/* Was "Prescriptions" reading `active_prescriptions`, which this endpoint
            has never sent — permanently blank. There is no prescriptions count in
            the payload; `/doctor/prescriptions/` has one, but reading it would pull
            ~20 prescription records (PHI) into a page that shows none of them just
            to render an integer. Asked for upstream. Meanwhile this tile shows a
            real field, and Prescriptions stays reachable from the sidebar.

            🔴 **Deliberately NOT clickable, and that is the point of the fix.** The
            substitution first shipped with `onNavigate('episodes')` carried over
            from the tile it replaced: the doctor's NAV has six pages and none of
            them is admissions, so the click landed on Episodes — a different
            dataset with a different count, under a label promising this one.
            `StatCard` takes an undefined `onClick` (Pending Referrals above does it
            conditionally), so the tile is honest and inert rather than pointing
            somewhere it is not. Give it a destination when an admissions page
            exists, not before. */}
        <StatCard loading={!stats} label="Admissions Under Care" value={stats?.admissions_under_care} icon={<BedIcon />} color="purple" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Today's appointments */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Today&apos;s Appointments</h2>
            <button onClick={() => onNavigate('appointments')} className="text-xs font-medium text-blue-600 hover:text-blue-800">View all →</button>
          </div>
          {apptLoading ? <ShimmerRows count={4} /> : apptError ? (
            <ErrorState message={apptError} onRetry={apptRefetch} />
          ) : !todayAppts.length ? (
            <div className="bg-chip border border-primary/15 rounded-card px-4 py-5 text-center">
              <p className="text-sm font-medium text-primary-dark">No appointments scheduled for today</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayAppts.map(a => (
                <div key={a.id} className="flex items-center gap-3 bg-white border border-border rounded-card px-4 py-3 hover:border-primary/30 hover:shadow-dash-card transition-all">
                  <Avatar firstName={a.patient?.first_name ?? '?'} lastName={a.patient?.last_name ?? ''} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{personName(a.patient)}</p>
                    <p className="text-xs text-text-soft">{formatTime(a.scheduled_at)}</p>
                  </div>
                  {a.status ? <StatusBadge status={a.status} /> : null}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent active episodes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-ink">Active Episodes</h2>
            <button onClick={() => onNavigate('episodes')} className="text-xs font-medium text-primary-dark hover:underline">View all →</button>
          </div>
          <DataTable
            columns={overviewEpisodeColumns}
            data={recentEps}
            getRowKey={ep => ep.id}
            loading={epLoading}
            error={epError}
            onRetry={epRefetch}
            emptyTitle="No active episodes"
            emptyDescription="Episodes you open will appear here."
          />
        </div>
      </div>
    </div>
  );
}

// ─── My Patients ───────────────────────────────────────────────────

/**
 * Start a clinical episode — POST /episodes/.
 *
 * ⚠️ NOT `/doctor/episodes/`. The doctor-namespaced endpoint documents no
 * request body at all (FLAG-218), while the generic viewset is fully specified
 * and its description states plainly: "POST /api/v1/episodes/ Create episode
 * (doctor/nurse)". Both were read from the live schema on 2026-08-24; the
 * documented one wins, because the alternative is inventing a payload and
 * learning the truth from 400s with a patient in the room.
 *
 * Required: `patient` (an id) — everything else is optional. `episode_type` is
 * a real enum, so it is a select, not a free-text field: OUTPATIENT |
 * INPATIENT | EMERGENCY | CONSULTATION.
 *
 * 🚨 Like `POST /patients/` (FLAG-216), the 201 returns NO `id` — `EpisodeCreate`
 * echoes the fields back and nothing else. So this cannot navigate to the
 * episode it just made; it refetches the list instead. Same shape of gap,
 * second endpoint, which is why FLAG-219 records it as a pattern rather than
 * one endpoint's oversight.
 */
function NewEpisodePanel({ patient, onClose, onCreated }: {
  patient: PatientSummary | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  // `form` is initialised once and never reset by anything in this
  // component — that's deliberate now, not an oversight: the caller
  // (`MyPatientsPage`) keys this component on `patient?.id`, so a patient
  // change is a full remount and `form` starts fresh every time. Found as
  // the sibling of the P1 fixed in `NewReferralPanel` — this one carries no
  // consent attestation and never crosses an org boundary, so it read as
  // materially less bad, but it is the same missing-reset defect.
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    episode_type: 'OUTPATIENT',
    chief_complaint: '',
    diagnosis: '',
    clinical_notes: '',
    treatment_plan: '',
    patient_instructions: '',
    prescribed_drugs: '',
  });

  const set = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!patient || saving) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { patient: patient.id };
      for (const [k, v] of Object.entries(form)) if (v !== '') payload[k] = v;
      await apiAction(ENDPOINTS.EPISODES, 'POST', payload);
      toast.success('Episode started');
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start episode');
    } finally {
      setSaving(false);
    }
  }

  const label = 'block text-xs font-medium text-text-soft';
  const field =
    'mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-white text-ink focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all';

  return (
    <SlidePanel
      open={!!patient}
      onClose={onClose}
      title="Start episode"
      subtitle={patient ? `${patient.first_name} ${patient.last_name}` : undefined}
      footer={
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-soft hover:text-ink">Cancel</button>
          <button type="submit" form="new-episode" disabled={saving}
            className="px-4 py-2 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Starting…' : 'Start episode'}
          </button>
        </div>
      }
    >
      <form id="new-episode" onSubmit={submit} className="space-y-4">
        <label className={label}>
          Episode type
          {/* A real enum in the schema — free text here would 400. */}
          <select value={form.episode_type} onChange={set('episode_type')} className={field}>
            <option value="OUTPATIENT">Outpatient</option>
            <option value="INPATIENT">Inpatient</option>
            <option value="EMERGENCY">Emergency</option>
            <option value="CONSULTATION">Consultation</option>
          </select>
        </label>

        <label className={label}>
          Chief complaint
          <input value={form.chief_complaint} onChange={set('chief_complaint')} className={field} />
        </label>

        <label className={label}>
          Diagnosis
          <input value={form.diagnosis} onChange={set('diagnosis')} className={field} />
        </label>

        <label className={label}>
          Clinical notes
          <textarea rows={3} value={form.clinical_notes} onChange={set('clinical_notes')} className={field} />
        </label>

        <label className={label}>
          Treatment plan
          <textarea rows={2} value={form.treatment_plan} onChange={set('treatment_plan')} className={field} />
        </label>

        <label className={label}>
          Prescribed drugs
          <textarea rows={2} value={form.prescribed_drugs} onChange={set('prescribed_drugs')} className={field} />
        </label>

        <label className={label}>
          Patient instructions
          <textarea rows={2} value={form.patient_instructions} onChange={set('patient_instructions')} className={field} />
        </label>

        <p className="text-[11px] text-text-soft border-t border-border pt-3">
          Only the patient is required. Clinical notes and treatment plan are not shown to the patient
          in their portal; chief complaint, diagnosis and instructions are.
        </p>
      </form>
    </SlidePanel>
  );
}

const URGENCY_OPTIONS: { value: ReferralCreateInput['urgency']; label: string }[] = [
  { value: 'EMERGENCY', label: 'Emergency — immediate intervention' },
  { value: 'URGENT', label: 'Urgent — review within hours to a few days' },
  { value: 'SEMI_URGENT', label: 'Semi-Urgent — assessment within days to weeks' },
  { value: 'ROUTINE', label: 'Routine — no significant risk from waiting' },
  { value: 'ELECTIVE', label: 'Elective — planned, non-urgent' },
];

const pickerField =
  'mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-white text-ink focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all';

/**
 * Search-as-you-type picker for `GET /referrals/target-organizations/`
 * (FLAG-566). Deliberately search-first, not a scrolling list: the endpoint
 * paginates at 20/page, so a client-side "load everything and filter" would
 * silently only ever search page one — the exact shape of bug FLAG-013
 * describes elsewhere. Nothing is fetched until the doctor types.
 *
 * Every row this endpoint returns is guaranteed by a backend test to pass
 * `validate_to_organization`, so no client-side re-validation of the
 * selection is needed here.
 */
function OrganizationPicker({ value, onChange }: {
  value: ReferralTargetOrganization | null;
  onChange: (org: ReferralTargetOrganization | null) => void;
}) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 350);
  // `null` = no search has resolved yet (distinct from `[]`, an actual empty
  // result) — the failure mode this whole feature exists to fix was an empty
  // list that looked like a real answer.
  const [results, setResults] = useState<ReferralTargetOrganization[] | null>(null);
  // The endpoint paginates at 20 — `count` is the true total, which can run
  // well past what `results` holds. The endpoint's own docstring says
  // Nigerian hospital names "collide heavily"; silently showing 20 of a
  // 40+ "General Hospital" match with nothing to say more exist recreates
  // the exact failure mode this feature was built to fix.
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef('');

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length < 2) {
      latest.current = trimmed;
      setResults(null);
      setTotalCount(0);
      setError(null);
      setLoading(false);
      return;
    }
    latest.current = trimmed;
    setLoading(true);
    setError(null);
    dataGet<Paginated<ReferralTargetOrganization>>(
      `${ENDPOINTS.REFERRAL_TARGET_ORGANIZATIONS}?search=${encodeURIComponent(trimmed)}`,
    ).then(data => {
      if (latest.current !== trimmed) return; // a newer keystroke has already superseded this response
      const page = data.results ?? [];
      setResults(page);
      setTotalCount(data.count ?? page.length);
    }).catch(err => {
      if (latest.current !== trimmed) return;
      setError(err instanceof Error ? err.message : 'Could not search organizations');
      setResults(null);
      setTotalCount(0);
    }).finally(() => {
      if (latest.current === trimmed) setLoading(false);
    });
  }, [debouncedQuery]);

  if (value) {
    return (
      <div className="mt-1 flex items-center justify-between gap-2 px-3 py-2 text-sm border border-border rounded-lg bg-page">
        <span className="text-ink">{value.name} — {value.city}, {value.state}</span>
        <button type="button" onClick={() => onChange(null)} className="text-xs font-medium text-primary-dark hover:underline shrink-0">
          Change
        </button>
      </div>
    );
  }

  const trimmedQuery = query.trim();

  return (
    <div className="relative">
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search by organization name or city…"
        className={pickerField}
      />
      {trimmedQuery !== '' && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-border rounded-lg shadow-lg max-h-56 overflow-auto">
          {trimmedQuery.length < 2 ? (
            <p className="px-3 py-2 text-xs text-text-soft">Keep typing — search needs at least 2 characters.</p>
          ) : loading ? (
            <p className="px-3 py-2 text-xs text-text-soft">Searching…</p>
          ) : error ? (
            <p className="px-3 py-2 text-xs text-red-600">Couldn&apos;t search organizations — {error}</p>
          ) : results && results.length === 0 ? (
            <p className="px-3 py-2 text-xs text-text-soft">No organisations match &ldquo;{debouncedQuery.trim()}&rdquo;.</p>
          ) : results && results.length > 0 ? (
            <>
              <ul>
                {results.map(org => (
                  <li key={org.id}>
                    <button
                      type="button"
                      onClick={() => { onChange(org); setQuery(''); setResults(null); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-row-hover transition-colors"
                    >
                      <div className="font-medium text-ink">{org.name}</div>
                      <div className="text-xs text-text-soft">{org.city}, {org.state}</div>
                    </button>
                  </li>
                ))}
              </ul>
              {totalCount > results.length && (
                <p className="px-3 py-2 text-[11px] text-text-soft border-t border-border">
                  Showing first {results.length} of {totalCount} — refine your search.
                </p>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

/**
 * External (cross-org) referral only — `POST /referrals/`
 * (`ReferralViewSet.create`, external-only per its own docstring). Internal
 * doctor-to-doctor referrals are still out of scope: FLAG-566 closed the
 * organization half of FLAG-027, but there is still no endpoint that lets a
 * doctor list colleague doctors for an internal referral.
 */
function NewReferralPanel({ patient, onClose, onCreated }: {
  patient: PatientSummary | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [toOrganization, setToOrganization] = useState<ReferralTargetOrganization | null>(null);
  const [form, setForm] = useState({
    urgency: 'ROUTINE' as ReferralCreateInput['urgency'],
    reason: '',
    clinical_findings: '',
    provisional_diagnosis: '',
    relevant_history: '',
    recommended_investigations: '',
    recommended_treatment: '',
  });
  const [consentObtained, setConsentObtained] = useState(false);
  const [destinationDisclosed, setDestinationDisclosed] = useState(false);
  // D9/FLAG-565: `create` can succeed while the PDF letter fails. When it
  // does, the panel stays open on this instead of closing, so the retry is
  // offered rather than left for the doctor to notice was missing.
  const [letterFailedFor, setLetterFailedFor] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  // No reset effect here on purpose — the caller (`MyPatientsPage`) keys this
  // component on `patient?.id`, so every patient change is a full remount and
  // every field above starts fresh. A reset effect naming some-but-not-all of
  // six pieces of state is exactly how the P1 this replaced happened: it
  // reset `toOrganization`/`letterFailedFor` and quietly left `form`,
  // `consentObtained` and `destinationDisclosed` carrying the previous
  // patient's values, including two attestation booleans that read as true.

  const set = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => setForm(f => ({ ...f, [k]: e.target.value }));

  const canSubmit =
    !!patient && !!toOrganization && form.reason.trim() !== '' &&
    form.clinical_findings.trim() !== '' && form.provisional_diagnosis.trim() !== '' &&
    consentObtained && destinationDisclosed;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || saving) return;
    setSaving(true);
    try {
      const payload: ReferralCreateInput = {
        patient: patient!.id,
        to_organization: toOrganization!.id,
        reason: form.reason,
        clinical_findings: form.clinical_findings,
        provisional_diagnosis: form.provisional_diagnosis,
        urgency: form.urgency,
        patient_consent_obtained: consentObtained,
        consent_destination_disclosed: destinationDisclosed,
      };
      if (form.relevant_history.trim() !== '') payload.relevant_history = form.relevant_history;
      if (form.recommended_investigations.trim() !== '') {
        payload.recommended_investigations = form.recommended_investigations;
      }
      if (form.recommended_treatment.trim() !== '') payload.recommended_treatment = form.recommended_treatment;

      const res = await apiAction(ENDPOINTS.REFERRAL_CREATE, 'POST', payload) as ReferralCreateResponse;
      onCreated();
      // `letter_generated` is the explicit field (D9/FLAG-565) — prefer it
      // over inferring anything from the 201 status or from `has_letter`.
      if (res?.letter_generated === false && res.referral?.id) {
        setLetterFailedFor(res.referral.id);
        toast.success('Referral created — the letter could not be generated');
      } else {
        toast.success('Referral created');
        onClose();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create referral');
    } finally {
      setSaving(false);
    }
  }

  async function retryLetter() {
    if (!letterFailedFor || retrying) return;
    setRetrying(true);
    try {
      const res = await apiAction(
        ENDPOINTS.REFERRAL_REGENERATE_LETTER(letterFailedFor), 'POST',
      ) as RegenerateLetterResponse;
      if (res?.letter_generated) {
        toast.success('Referral letter generated');
        onClose();
      } else {
        toast.error('The letter still could not be generated — try again shortly');
      }
    } catch (err) {
      // The backend returns 503 here rather than swallowing the failure a
      // second time, so this reaches the catch block on a repeat failure.
      toast.error(err instanceof Error ? err.message : 'Could not regenerate the letter');
    } finally {
      setRetrying(false);
    }
  }

  const label = 'block text-xs font-medium text-text-soft';
  const field = pickerField;

  return (
    <SlidePanel
      open={!!patient}
      onClose={onClose}
      title="Refer to another organization"
      subtitle={patient ? `${patient.first_name} ${patient.last_name}` : undefined}
      footer={
        letterFailedFor ? (
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-soft hover:text-ink">Done</button>
            <button type="button" onClick={retryLetter} disabled={retrying}
              className="px-4 py-2 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
              {retrying ? 'Retrying…' : 'Retry generating letter'}
            </button>
          </div>
        ) : (
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-soft hover:text-ink">Cancel</button>
            <button type="submit" form="new-referral" disabled={!canSubmit || saving}
              className="px-4 py-2 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
              {saving ? 'Sending…' : 'Send referral'}
            </button>
          </div>
        )
      }
    >
      {letterFailedFor ? (
        <div className="space-y-3">
          <p className="text-sm text-ink">The referral was created — the referral letter could not be generated.</p>
          <p className="text-xs text-text-soft">
            The receiving organization can&apos;t yet see the letter. You can retry generating it now, or
            leave it and retry later — the referral itself is not affected either way.
          </p>
        </div>
      ) : (
      <form id="new-referral" onSubmit={submit} className="space-y-4">
        <label className={label}>
          Receiving organization
          <OrganizationPicker value={toOrganization} onChange={setToOrganization} />
        </label>

        <label className={label}>
          Urgency
          <select value={form.urgency} onChange={set('urgency')} className={field}>
            {URGENCY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>

        <label className={label}>
          Reason for referral
          <textarea rows={2} value={form.reason} onChange={set('reason')} className={field} />
        </label>

        <label className={label}>
          Clinical findings
          <textarea rows={3} value={form.clinical_findings} onChange={set('clinical_findings')} className={field} />
        </label>

        <label className={label}>
          Provisional diagnosis
          <input value={form.provisional_diagnosis} onChange={set('provisional_diagnosis')} className={field} />
        </label>

        <label className={label}>
          Relevant history <span className="font-normal">(optional — your discretion on what&apos;s relevant)</span>
          <textarea rows={2} value={form.relevant_history} onChange={set('relevant_history')} className={field} />
        </label>

        <label className={label}>
          Recommended investigations <span className="font-normal">(optional)</span>
          <textarea rows={2} value={form.recommended_investigations} onChange={set('recommended_investigations')} className={field} />
        </label>

        <label className={label}>
          Recommended treatment <span className="font-normal">(optional)</span>
          <textarea rows={2} value={form.recommended_treatment} onChange={set('recommended_treatment')} className={field} />
        </label>

        <div className="border-t border-border pt-3 space-y-2">
          {/* FLAG-272 on the backend: these are the DOCTOR'S attestation, not
              the patient clicking a consent checkbox themselves. Wording has
              to say that plainly — this is a compliance record, not copy. */}
          <label className="flex items-start gap-2 text-xs text-ink">
            <input
              type="checkbox"
              checked={consentObtained}
              onChange={e => setConsentObtained(e.target.checked)}
              className="mt-0.5"
            />
            <span>I confirm I obtained this patient&apos;s verbal consent to share their information with the receiving organization.</span>
          </label>
          <label className="flex items-start gap-2 text-xs text-ink">
            <input
              type="checkbox"
              checked={destinationDisclosed}
              onChange={e => setDestinationDisclosed(e.target.checked)}
              className="mt-0.5"
            />
            <span>I confirm I told the patient which organization they are being referred to.</span>
          </label>
        </div>

        <p className="text-[11px] text-text-soft">
          Reason, clinical findings and provisional diagnosis are required, along with both
          confirmations above. This creates a PDF referral letter for the receiving organization —
          it does not give them access to this patient&apos;s record.
        </p>
      </form>
      )}
    </SlidePanel>
  );
}

function MyPatientsPage() {
  const { items: patients, count, page, setPage, totalPages, loading, error, refetch } =
    usePaginatedList<PatientSummary>(ENDPOINTS.DOC_MY_PATIENTS);
  // Episodes start FROM a patient row rather than from a picker inside the
  // episodes page. A picker would have to list patients, and a client-side one
  // sees only the first page (FLAG-214) — a doctor silently unable to find
  // their own patient is worse than one extra click. Referrals start the same
  // way, for the same reason.
  const [startFor, setStartFor] = useState<PatientSummary | null>(null);
  const [referFor, setReferFor] = useState<PatientSummary | null>(null);

  return (
    <div className="space-y-4">
      <PageHeading title="My Patients" count={count} unit="active" />
      <DataTable
        columns={patientColumns(setStartFor, setReferFor)}
        data={patients}
        getRowKey={p => p.id}
        loading={loading}
        error={error}
        onRetry={refetch}
        emptyTitle="No patients"
        emptyDescription="Patients assigned to you will appear here."
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalCount={count}
        pageSize={20}
      />
      {/* `key` forces a full remount on every patient change (including
          close → reopen for the SAME patient) — structural, not four more
          `setX` calls in a reset effect. Both panels are mounted permanently
          by this page (`SlidePanel` only controls visibility), so without
          this their internal state — including, on the referral panel, the
          FLAG-272 consent attestations — survives from whichever patient was
          last open and can be submitted against a different one. Found in
          review of #130: a referral for patient B could go out carrying
          patient A's clinical text with both consent boxes already ticked. */}
      <NewEpisodePanel
        key={startFor?.id ?? 'no-episode-patient'}
        patient={startFor}
        onClose={() => setStartFor(null)}
        onCreated={refetch}
      />
      <NewReferralPanel
        key={referFor?.id ?? 'no-referral-patient'}
        patient={referFor}
        onClose={() => setReferFor(null)}
        onCreated={refetch}
      />
    </div>
  );
}

// ─── Episodes ─────────────────────────────────────────────────────

function EpisodesPage() {
  // FLAG-004, second site. This page carried the same invented enum as the
  // overview panel: OPEN/CLOSED do not exist — the values are ACTIVE/COMPLETED
  // (live schema, 2026-08-22). The filter tabs were therefore meaningless AND
  // the row action below was gated on a status no episode can ever have.
  const [filter, setFilter] = useState<'ACTIVE' | 'COMPLETED' | ''>('ACTIVE');
  const path = ENDPOINTS.DOC_EPISODES + (filter ? `?status=${filter}` : '');
  const { items: episodes, count, page, setPage, totalPages, loading, error, refetch } =
    usePaginatedList<Episode>(path);
  const { toast } = useToast();
  const [completing, setCompleting] = useState<Episode | null>(null);
  const [working, setWorking] = useState(false);

  async function completeEpisode() {
    if (!completing) return;
    setWorking(true);
    try {
      await apiAction(ENDPOINTS.DOC_EPISODE_COMPLETE(completing.id), 'POST');
      toast.success('Episode marked as complete');
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to complete episode');
    } finally {
      setWorking(false);
      setCompleting(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeading title="Episodes" count={count} unit={filter.toLowerCase() || 'total'} />
        <FilterTabs
          label="Filter episodes by status"
          value={filter}
          onChange={f => { setFilter(f); setPage(1); }}
          options={EPISODE_FILTERS}
        />
      </div>

      <DataTable
        columns={episodeColumns(setCompleting)}
        data={episodes}
        getRowKey={ep => ep.id}
        loading={loading}
        error={error}
        onRetry={refetch}
        emptyTitle={`No ${filter.toLowerCase() || ''} episodes`.replace('  ', ' ')}
        emptyDescription="Episodes will appear here."
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalCount={count}
        pageSize={20}
      />

      <ConfirmDialog
        open={!!completing}
        onClose={() => setCompleting(null)}
        onConfirm={completeEpisode}
        loading={working}
        title="Complete Episode"
        description={`Mark this episode for ${completing?.patient_name ?? completing?.patient ? `${completing.patient!.first_name} ${completing.patient!.last_name}` : 'this patient'} as complete?`}
        confirmLabel="Mark Complete"
        confirmVariant="primary"
      />
    </div>
  );
}

// ─── Appointments ─────────────────────────────────────────────────

function AppointmentsPage() {
  const { items: list, count, page, setPage, totalPages, loading, error, refetch } =
    usePaginatedList<Appointment>(ENDPOINTS.DOC_APPOINTMENTS);

  return (
    <div className="space-y-4">
      <PageHeading title="Appointments" count={count} unit="total" />
      {/* Pagination was destructured and never rendered before, so page 2+ was
          unreachable. DataTable renders it from these props. */}
      <DataTable
        columns={appointmentColumns}
        data={list}
        getRowKey={a => a.id}
        loading={loading}
        error={error}
        onRetry={refetch}
        emptyTitle="No appointments"
        emptyDescription="Your scheduled appointments will appear here."
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalCount={count}
        pageSize={20}
      />
    </div>
  );
}

// ─── Referrals ────────────────────────────────────────────────────

function ReferralsPage() {
  const [tab, setTab] = useState<'outgoing' | 'incoming'>('outgoing');
  const path = tab === 'outgoing' ? ENDPOINTS.DOC_REFERRALS_OUT : ENDPOINTS.DOC_REFERRALS_IN;
  const { items: list, count, page, setPage, totalPages, loading, error, refetch } =
    usePaginatedList<Referral>(path);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeading title="Referrals" count={count} unit={tab} />
        <FilterTabs
          label="Referral direction"
          value={tab}
          onChange={t => { setTab(t); setPage(1); }}
          options={REFERRAL_TABS}
        />
      </div>
      <DataTable
        columns={referralColumns(tab)}
        data={list}
        getRowKey={r => r.id}
        loading={loading}
        error={error}
        onRetry={refetch}
        emptyTitle={`No ${tab} referrals`}
        emptyDescription="Referrals will appear here."
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalCount={count}
        pageSize={20}
      />
    </div>
  );
}

// ─── Prescriptions ────────────────────────────────────────────────

function PrescriptionsPage() {
  const { items: list, count, page, setPage, totalPages, loading, error, refetch } =
    usePaginatedList<Prescription>(ENDPOINTS.DOC_PRESCRIPTIONS);
  const { toast } = useToast();
  const [cancelling, setCancelling] = useState<Prescription | null>(null);
  const [working, setWorking] = useState(false);

  async function cancelRx() {
    if (!cancelling) return;
    setWorking(true);
    try {
      await apiAction(ENDPOINTS.DOC_PRESCRIPTION_CANCEL(cancelling.id), 'POST');
      toast.success('Prescription cancelled');
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setWorking(false);
      setCancelling(null);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeading title="Prescriptions" count={count} unit="total" />
      <DataTable
        columns={prescriptionColumns(setCancelling)}
        data={list}
        getRowKey={rx => rx.id}
        loading={loading}
        error={error}
        onRetry={refetch}
        emptyTitle="No prescriptions"
        emptyDescription="Prescriptions you've issued will appear here."
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalCount={count}
        pageSize={20}
      />
      <ConfirmDialog
        open={!!cancelling}
        onClose={() => setCancelling(null)}
        onConfirm={cancelRx}
        loading={working}
        title="Cancel Prescription"
        description={`Cancel the prescription for ${cancelling?.medication}?`}
        confirmLabel="Cancel Prescription"
        confirmVariant="danger"
      />
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────

const PAGE_TITLES: Record<string, string> = {
  overview:      'Overview',
  patients:      'My Patients',
  episodes:      'Episodes',
  appointments:  'Appointments',
  referrals:     'Referrals',
  prescriptions: 'Prescriptions',
};

interface Props {
  user: User;
  initialStats: DoctorStats | null;
  slug: string;
}

export function DoctorDashboard({ user, initialStats, slug: _slug }: Props) {
  const [page, setPage] = useState('overview');
  const [isOnDuty, setIsOnDuty] = useState(user.is_on_duty ?? false);
  // AUTH-6: server render can't refresh an expired session — fall back to a
  // client-side stats fetch (client-api refreshes on 401) instead of
  // shimmering forever.
  const { data: fetchedStats } = useApi<DoctorStats>(initialStats ? null : ENDPOINTS.DOC_STATS);
  const stats = initialStats ?? fetchedStats;

  return (
    <DashboardShell
      navItems={NAV}
      activePage={page}
      onPageChange={setPage}
      user={{ ...user, is_on_duty: isOnDuty }}
      pageTitle={PAGE_TITLES[page]}
      dutyToggle={<DutyToggle isOnDuty={isOnDuty} onToggle={setIsOnDuty} />}
      smallScreenGateFor="Doctor"
    >
      {page === 'overview'      && <OverviewPage stats={stats} onNavigate={setPage} isOnDuty={isOnDuty} />}
      {page === 'patients'      && <MyPatientsPage />}
      {page === 'episodes'      && <EpisodesPage />}
      {page === 'appointments'  && <AppointmentsPage />}
      {page === 'referrals'     && <ReferralsPage />}
      {page === 'prescriptions' && <PrescriptionsPage />}
    </DashboardShell>
  );
}