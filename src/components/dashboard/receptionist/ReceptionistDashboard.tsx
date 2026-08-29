'use client';

import { useState } from 'react';
import { DashboardShell, type NavItem } from '@/components/layout/DashboardShell';
import { StatCard } from '@/components/dashboard/StatCard';
import { useApi, apiAction, usePaginatedList } from '@/hooks/use-api';
import { dataGet } from '@/lib/client-api';
import { useToast } from '@/store/toast';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { SlidePanel } from '@/components/ui/SlidePanel';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Pagination } from '@/components/ui/Pagination';
import { ShimmerRows } from '@/components/ui/Shimmer';
import { formatDate, formatDateTime, formatTime, personName, timeAgo, truncate } from '@/lib/utils';
import { ENDPOINTS } from '@/lib/config';
import type { User } from '@/types/auth';
import type {
  ReceptionistStats, CheckIn, Appointment, Referral, PatientSearchResult, OnDutyDoctor, Paginated,
  PatientDetail, NewPatient, PatientCreateResponse,
} from '@/types/dashboard';

function GridIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>; }
function UserPlusIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" /></svg>; }
function CalIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H18v-.008zm0 2.25h.008v.008H18V15z" /></svg>; }
function SearchIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>; }
function ArrowIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>; }
function BedIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>; }

const NAV: NavItem[] = [
  { id: 'overview',      label: 'Overview',        icon: <GridIcon /> },
  { id: 'checkins',      label: 'Check-ins',        icon: <UserPlusIcon /> },
  { id: 'appointments',  label: 'Appointments',     icon: <CalIcon /> },
  { id: 'patients',      label: 'Patient Search',   icon: <SearchIcon /> },
  { id: 'referrals',     label: 'Referrals',        icon: <ArrowIcon /> },
];

function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white"><table className="w-full text-sm">{children}</table></div>;
}
function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{children}</th>;
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3.5 text-gray-700 ${className}`}>{children}</td>;
}

// ─── Overview ────────────────────────────────────────────────────

function OverviewPage({ stats, onNavigate }: { stats: ReceptionistStats | null; onNavigate: (p: string) => void }) {
  const { data: checkinsData, loading: ciLoading, error: ciError, refetch: ciRefetch } =
    useApi<Paginated<CheckIn>>(ENDPOINTS.REC_CHECK_INS + '?page_size=6');
  const todayQueue = checkinsData?.results ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard loading={!stats} label="Check-ins Today" value={stats?.todays_checkins} icon={<UserPlusIcon />} color="green" />
        <StatCard loading={!stats} label="Pending Assignment" value={stats?.awaiting_assignment} icon={<CalIcon />} color="amber"
          delta={stats?.awaiting_assignment ? 'Needs doctor assignment' : undefined}
          onClick={stats?.awaiting_assignment ? () => onNavigate('checkins') : undefined} />
        <StatCard loading={!stats} label="Avail. Beds" value={stats ? stats.total_beds - stats.occupied_beds : undefined} icon={<BedIcon />} color="blue" />
        <StatCard loading={!stats} label="Pending Referrals" value={stats?.pending_referrals} icon={<ArrowIcon />} color="purple"
          onClick={stats?.pending_referrals ? () => onNavigate('referrals') : undefined} />
      </div>

      {/* Today's Queue */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Today&apos;s Queue</h2>
          <button onClick={() => onNavigate('checkins')} className="text-xs font-medium text-emerald-600 hover:text-emerald-800">Manage check-ins →</button>
        </div>
        {ciLoading ? <ShimmerRows count={4} /> : ciError ? (
          <ErrorState message={ciError} onRetry={ciRefetch} />
        ) : !todayQueue.length ? (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-6 text-center">
            <p className="text-sm font-medium text-emerald-700">Queue is clear — no pending check-ins</p>
          </div>
        ) : (
          <TableWrap>
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr><Th>#</Th><Th>Patient</Th><Th>Reason</Th><Th>Time</Th><Th>Doctor</Th><Th>Status</Th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {/* FLAG-213: checked_in_at / reason_for_visit / assigned_doctor{}
                  — check_in_time, chief_complaint and a string doctor never
                  existed, so every one of these cells used to render blank. */}
              {todayQueue.map(ci => (
                <tr key={ci.id} className="hover:bg-gray-50/60 transition-colors">
                  <Td className="text-xs font-mono text-gray-400 w-10">{ci.queue_number ?? '—'}</Td>
                  <Td><span className="font-medium text-gray-900">{personName(ci.patient)}</span></Td>
                  <Td className="text-xs text-gray-500 max-w-xs">{truncate(ci.reason_for_visit ?? '—', 40)}</Td>
                  <Td className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(ci.checked_in_at)}</Td>
                  <Td className="text-xs">{ci.assigned_doctor ? personName(ci.assigned_doctor) : <span className="text-amber-500 font-medium">Unassigned</span>}</Td>
                  <Td><StatusBadge status={ci.status} /></Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </div>
    </div>
  );
}

// ─── Check-ins page ───────────────────────────────────────────────

/** Local YYYY-MM-DD. `toISOString()` is UTC and silently shifts the date
 *  either side of midnight in WAT — a receptionist opening the queue at
 *  00:30 would be shown yesterday. */
function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function CheckInsPage() {
  // 🪤 FLAG-213: this endpoint defaults to TODAY, and the date filter applies
  // BEFORE status — so `?status=WAITING` alone returns nothing. Against seed
  // data (check-ins dated 13 Aug) the queue therefore looks empty and broken.
  //
  // The date is a visible, explicit control rather than an invisible server
  // default, so the next person sees WHY the queue is empty instead of
  // rediscovering it. It cost time once; it is written down and now it is
  // also on screen.
  const [date, setDate] = useState(todayISO());
  const [status, setStatus] = useState('');

  const query = `?date=${encodeURIComponent(date)}` + (status ? `&status=${encodeURIComponent(status)}` : '');
  const { items: list, count, page, setPage, totalPages, loading, error, refetch } =
    usePaginatedList<CheckIn>(ENDPOINTS.REC_CHECK_INS + query);

  // REC-3: the endpoint returns a DRF envelope, not a bare array.
  const { data: doctorsData } = useApi<Paginated<OnDutyDoctor>>(ENDPOINTS.REC_DOCTORS_ON_DUTY);
  const doctors = doctorsData?.results ?? [];
  const { toast } = useToast();
  const [assigning, setAssigning] = useState<string | null>(null);

  async function assignDoctor(checkInId: string, doctorId: string) {
    setAssigning(checkInId);
    try {
      await apiAction(ENDPOINTS.REC_ASSIGN_DOCTOR, 'POST', { check_in_id: checkInId, doctor_id: doctorId });
      toast.success('Doctor assigned');
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to assign');
    } finally {
      setAssigning(null);
    }
  }

  const isToday = date === todayISO();

  const columns: DataTableColumn<CheckIn>[] = [
    {
      key: 'queue', header: '#', className: 'w-12',
      render: (ci) => <span className="text-xs font-mono text-text-soft">{ci.queue_number ?? '—'}</span>,
    },
    {
      key: 'patient', header: 'Patient',
      render: (ci) => (
        <div>
          <div className="font-medium text-ink">{personName(ci.patient)}</div>
          {ci.patient?.healthclouda_id && (
            <div className="text-xs text-text-soft font-mono">{ci.patient.healthclouda_id}</div>
          )}
        </div>
      ),
    },
    {
      key: 'reason', header: 'Reason',
      render: (ci) => <span className="text-xs text-text-soft">{truncate(ci.reason_for_visit ?? '—', 40)}</span>,
    },
    {
      key: 'checked_in', header: 'Checked In',
      render: (ci) => (
        <span className="text-xs text-text-soft whitespace-nowrap" title={formatDateTime(ci.checked_in_at)}>
          {isToday ? timeAgo(ci.checked_in_at) : formatTime(ci.checked_in_at)}
        </span>
      ),
    },
    {
      key: 'doctor', header: 'Assign Doctor',
      render: (ci) => (
        !ci.assigned_doctor && doctors.length > 0 ? (
          <select
            aria-label={`Assign a doctor to ${personName(ci.patient)}`}
            disabled={assigning === ci.id}
            onChange={e => e.target.value && assignDoctor(ci.id, e.target.value)}
            className="text-xs border border-border rounded-lg px-2 py-1 bg-white text-text-soft focus:ring-2 focus:ring-primary/30 outline-none"
          >
            <option value="">Assign doctor…</option>
            {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.first_name} {d.last_name}</option>)}
          </select>
        ) : (
          <span className="text-xs text-text-soft">{ci.assigned_doctor ? personName(ci.assigned_doctor) : '—'}</span>
        )
      ),
    },
    { key: 'status', header: 'Status', render: (ci) => <StatusBadge status={ci.status} /> },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-ink">Check-ins</h2>
        <p className="text-sm text-text-soft mt-0.5">
          {count > 0 ? `${count} on ${formatDate(date)}` : `Showing ${formatDate(date)}`}
        </p>
      </div>

      {/* Doctors on duty strip */}
      {doctors.length > 0 && (
        <div className="bg-primary-soft border border-primary/20 rounded-xl px-4 py-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-primary-dark mr-1">Doctors on duty:</span>
          {doctors.map(d => (
            <span key={d.id} className="text-xs text-primary-dark bg-white border border-primary/20 px-2 py-0.5 rounded-full">
              Dr. {d.first_name} {d.last_name}
            </span>
          ))}
        </div>
      )}

      <DataTable
        columns={columns}
        data={list}
        getRowKey={(ci) => ci.id}
        loading={loading}
        error={error}
        onRetry={refetch}
        emptyTitle={isToday ? 'No check-ins yet today' : `No check-ins on ${formatDate(date)}`}
        emptyDescription="The queue is filtered by date — change it above to look at another day."
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalCount={count}
        pageSize={20}
        toolbar={
          <>
            <label className="text-xs font-medium text-text-soft" htmlFor="checkin-date">Date</label>
            <input
              id="checkin-date"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value || todayISO())}
              className="text-sm border border-border rounded-lg px-2.5 py-1.5 bg-white text-ink focus:ring-2 focus:ring-primary/30 outline-none"
            />
            <label className="text-xs font-medium text-text-soft ml-2" htmlFor="checkin-status">Status</label>
            <select
              id="checkin-status"
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="text-sm border border-border rounded-lg px-2.5 py-1.5 bg-white text-ink focus:ring-2 focus:ring-primary/30 outline-none"
            >
              <option value="">All</option>
              <option value="WAITING">Waiting</option>
              <option value="CALLED">Called</option>
              <option value="COMPLETED">Completed</option>
              <option value="NO_SHOW">No show</option>
            </select>
            {!isToday && (
              <button
                onClick={() => setDate(todayISO())}
                className="text-xs font-medium text-primary-dark hover:underline ml-auto"
              >
                Back to today
              </button>
            )}
          </>
        }
      />
    </div>
  );
}

// ─── Appointments page ────────────────────────────────────────────

function AppointmentsPage() {
  // The schema documents NO parameters for this endpoint, but its description
  // names three: "GET: appointments (?date=&doctor_id=&status=)". This API
  // hides its params in prose (FLAG-217), so they are used on the strength of
  // that description — not invented, and not assumed from another endpoint.
  //
  // Unlike check-ins, this one is NOT date-defaulted, so the date filter starts
  // empty and shows everything.
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('');
  const [doctorId, setDoctorId] = useState('');

  const params = [
    date ? `date=${encodeURIComponent(date)}` : '',
    status ? `status=${encodeURIComponent(status)}` : '',
    doctorId ? `doctor_id=${encodeURIComponent(doctorId)}` : '',
  ].filter(Boolean).join('&');

  const { items: list, count, page, setPage, totalPages, loading, error, refetch } =
    usePaginatedList<Appointment>(ENDPOINTS.REC_APPOINTMENTS + (params ? `?${params}` : ''));

  const { data: doctorsData } = useApi<Paginated<OnDutyDoctor>>(ENDPOINTS.REC_DOCTORS_ON_DUTY);
  const doctors = doctorsData?.results ?? [];

  // FLAG-213: nested patient/doctor objects and one scheduled_at datetime —
  // never patient_name / doctor_name / appointment_date.
  const columns: DataTableColumn<Appointment>[] = [
    { key: 'patient', header: 'Patient', render: (a) => <span className="font-medium text-ink">{personName(a.patient)}</span> },
    { key: 'doctor', header: 'Doctor', render: (a) => <span className="text-xs text-text-soft">{personName(a.doctor)}</span> },
    { key: 'date', header: 'Date', render: (a) => <span className="text-xs text-text-soft whitespace-nowrap">{formatDate(a.scheduled_at)}</span> },
    { key: 'time', header: 'Time', render: (a) => <span className="text-xs text-text-soft">{formatTime(a.scheduled_at)}</span> },
    { key: 'reason', header: 'Reason', render: (a) => <span className="text-xs text-text-soft">{truncate(a.reason ?? '—', 32)}</span> },
    { key: 'status', header: 'Status', render: (a) => a.status ? <StatusBadge status={a.status} /> : <span className="text-xs text-text-soft">—</span> },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-ink">Appointments</h2>
        {count > 0 && <p className="text-sm text-text-soft mt-0.5">{count} total</p>}
      </div>
      <DataTable
        columns={columns}
        data={list}
        getRowKey={(a) => a.id}
        loading={loading}
        error={error}
        onRetry={refetch}
        emptyTitle="No appointments"
        emptyDescription={params ? 'Nothing matches these filters.' : 'Appointments will appear here.'}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalCount={count}
        pageSize={20}
        toolbar={
          <>
            <label className="text-xs font-medium text-text-soft" htmlFor="appt-date">Date</label>
            <input
              id="appt-date" type="date" value={date}
              onChange={e => setDate(e.target.value)}
              className="text-sm border border-border rounded-lg px-2.5 py-1.5 bg-white text-ink focus:ring-2 focus:ring-primary/30 outline-none"
            />
            <label className="text-xs font-medium text-text-soft ml-2" htmlFor="appt-doctor">Doctor</label>
            <select
              id="appt-doctor" value={doctorId}
              onChange={e => setDoctorId(e.target.value)}
              className="text-sm border border-border rounded-lg px-2.5 py-1.5 bg-white text-ink focus:ring-2 focus:ring-primary/30 outline-none"
            >
              <option value="">All doctors</option>
              {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.first_name} {d.last_name}</option>)}
            </select>
            <label className="text-xs font-medium text-text-soft ml-2" htmlFor="appt-status">Status</label>
            <select
              id="appt-status" value={status}
              onChange={e => setStatus(e.target.value)}
              className="text-sm border border-border rounded-lg px-2.5 py-1.5 bg-white text-ink focus:ring-2 focus:ring-primary/30 outline-none"
            >
              <option value="">All</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            {params && (
              <button
                onClick={() => { setDate(''); setStatus(''); setDoctorId(''); }}
                className="text-xs font-medium text-primary-dark hover:underline ml-auto"
              >
                Clear filters
              </button>
            )}
          </>
        }
      />
    </div>
  );
}

// ─── Patient Search page ──────────────────────────────────────────

// REC-2: search results are minimised — access state is the useful signal.
function AccessBadge({ p }: { p: PatientSearchResult }) {
  if (p.has_approved_access) return <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Access granted</span>;
  if (p.has_pending_access_request) return <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Request pending</span>;
  if (p.has_visited_org) return <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">Visited before</span>;
  return <span className="text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">New to org</span>;
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-text-soft">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-text-soft mt-1">{hint}</span>}
    </label>
  );
}

const inputCls =
  'mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-white text-ink focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all';

/**
 * Pull the identifiers out of a `POST /patients/` response.
 *
 * 🪤 **They are nested under `patient`.** Reading the top level returns
 * `undefined`, which looks exactly like the backend not sending them — the
 * misreading behind FLAG-216 (issue #101). The top-level read below is a
 * forward-compatible fallback for a future flattened shape, **not** a guess:
 * either way the values come from the response to *this* request, so they
 * cannot belong to a different patient.
 *
 * What this must never become is a search for the patient we just created.
 * Two same-name registrations minutes apart are indistinguishable, and handing
 * someone the WRONG HealthClouda ID attaches their records to another person,
 * silently, at the desk. A gap the receptionist can see beats a guess they
 * cannot.
 */
/** What the desk needs after a successful registration. */
type RegisteredPatient = { name: string; id?: string; healthcloudaId?: string };

function readCreatedPatient(response: unknown): { id?: string; healthcloudaId?: string } {
  const body = (response ?? {}) as PatientCreateResponse & { id?: string; healthclouda_id?: string };
  return {
    id: body.patient?.id ?? body.id,
    healthcloudaId: body.patient?.healthclouda_id ?? body.healthclouda_id,
  };
}

/**
 * Register a patient — POST /patients/.
 *
 * Verified against the live schema 2026-08-24: RECEPTIONIST is one of only two
 * roles allowed to CREATE, and `first_name`/`last_name` are the only required
 * fields.
 *
 * ✅ **The 201 DOES carry `id` and `healthclouda_id`, nested under `patient`**
 * (backend #137, closed with no code change; issue #101). The schema documents
 * this response as the `PatientCreate` *request* serializer, which is what made
 * FLAG-216 conclude the identifiers were absent. They are not — so the HCL-ID
 * handout this whole flow exists for happens right here, from the response we
 * already have.
 *
 * The fallback for a missing ID is kept anyway: this shape has been documented
 * wrongly once already, and a desk that is told the ID is unavailable can still
 * search. A desk handed a confidently wrong ID cannot.
 */
function RegisterPatientPanel({ open, onClose, onRegistered }: {
  open: boolean; onClose: () => void; onRegistered: (result: RegisteredPatient) => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<NewPatient>({ first_name: '', last_name: '' });

  const set = (k: keyof NewPatient) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const canSubmit = form.first_name.trim() !== '' && form.last_name.trim() !== '' && !saving;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      // Strip empties: the serializer treats '' and absent differently for
      // nullable fields, and sending '' for date_of_birth is a 400.
      const payload = Object.fromEntries(
        Object.entries(form).filter(([, v]) => v !== '' && v !== undefined),
      );
      const created = readCreatedPatient(await apiAction(ENDPOINTS.PATIENTS, 'POST', payload));
      onRegistered({ name: `${form.first_name} ${form.last_name}`.trim(), ...created });
      setForm({ first_name: '', last_name: '' });
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not register patient');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SlidePanel
      open={open}
      onClose={onClose}
      title="Register patient"
      subtitle="Creates a new patient record for this organisation"
      footer={
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-soft hover:text-ink">Cancel</button>
          <button type="submit" form="register-patient" disabled={!canSubmit}
            className="px-4 py-2 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Registering…' : 'Create patient record'}
          </button>
        </div>
      }
    >
      <form id="register-patient" onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name *"><input required value={form.first_name} onChange={set('first_name')} className={inputCls} /></Field>
          <Field label="Last name *"><input required value={form.last_name} onChange={set('last_name')} className={inputCls} /></Field>
        </div>

        <Field label="Phone" hint="Recommended — it is how the patient is reached when there is no email.">
          <input type="tel" value={form.phone ?? ''} onChange={set('phone')} className={inputCls} />
        </Field>

        <Field label="Email" hint="Optional. Needed later to send a portal invite.">
          <input type="email" value={form.email ?? ''} onChange={set('email')} className={inputCls} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Date of birth"><input type="date" value={form.date_of_birth ?? ''} onChange={set('date_of_birth')} className={inputCls} /></Field>
          <Field label="Gender">
            <select value={form.gender ?? ''} onChange={set('gender')} className={inputCls}>
              <option value="">Not specified</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="O">Other</option>
            </select>
          </Field>
        </div>

        <Field label="Address"><input value={form.address ?? ''} onChange={set('address')} className={inputCls} /></Field>

        <label className="flex items-start gap-2 pt-1">
          <input type="checkbox" checked={form.consent_given ?? false}
            onChange={e => setForm(f => ({ ...f, consent_given: e.target.checked }))}
            className="mt-0.5 rounded border-border text-primary focus:ring-primary/30" />
          <span className="text-xs text-text-soft">Patient has given consent for their records to be stored and shared between facilities.</span>
        </label>

        <p className="text-[11px] text-text-soft border-t border-border pt-3">
          Only first and last name are required by the server. If it rejects the form, the message shown is the server&apos;s own.
        </p>
      </form>
    </SlidePanel>
  );
}

/**
 * Portal access + contact details for one patient.
 *
 * `has_portal_account` exists ONLY on `PatientDetail` — not on any list or
 * search result — so this costs one fetch per patient opened. That is the
 * contract, not an oversight to optimise away.
 *
 * Editing is limited to email on purpose: the schema states RECEPTIONIST may
 * update "contact info only". Offering more would produce a 403 the
 * receptionist cannot act on.
 */
function PatientActionsPanel({ patient, onClose }: { patient: PatientSearchResult | null; onClose: () => void }) {
  const { toast } = useToast();
  const { data: detail, loading, error, refetch } =
    useApi<PatientDetail>(patient ? ENDPOINTS.PATIENT(patient.id) : null);
  const [email, setEmail] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(false);

  const shownEmail = dirty ? email : detail?.email ?? '';

  async function saveEmail() {
    if (!patient) return;
    setSaving(true);
    try {
      await apiAction(ENDPOINTS.PATIENT(patient.id), 'PATCH', { email: shownEmail });
      toast.success('Contact details updated');
      setDirty(false);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update');
    } finally {
      setSaving(false);
    }
  }

  async function sendInvite() {
    if (!patient) return;
    setInviting(true);
    try {
      await apiAction(ENDPOINTS.REC_SEND_PORTAL_INVITE(patient.id), 'POST');
      toast.success('Portal invite sent');
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not send invite');
    } finally {
      setInviting(false);
    }
  }

  return (
    <SlidePanel
      open={!!patient}
      onClose={onClose}
      title={patient ? `${patient.first_name} ${patient.last_name}` : ''}
      subtitle={patient?.healthclouda_id}
    >
      {loading ? <ShimmerRows count={3} /> : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : detail ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-text-soft">HealthClouda ID</div>
              <div className="font-mono text-ink">{detail.healthclouda_id}</div>
            </div>
            <div>
              <div className="text-xs text-text-soft">Phone</div>
              <div className="text-ink">{detail.phone || '—'}</div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <Field label="Email" hint="Receptionists may update contact details only.">
              <input
                type="email"
                value={shownEmail}
                onChange={e => { setEmail(e.target.value); setDirty(true); }}
                className={inputCls}
              />
            </Field>
            {dirty && (
              <button onClick={saveEmail} disabled={saving}
                className="mt-2 px-3 py-1.5 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors">
                {saving ? 'Saving…' : 'Save email'}
              </button>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <div className="text-xs font-medium text-text-soft mb-1">Patient portal</div>
            {detail.has_portal_account ? (
              <p className="text-sm text-ink">This patient already has a portal account.</p>
            ) : (
              <p className="text-sm text-text-soft">No portal account yet.</p>
            )}
            <button
              onClick={sendInvite}
              disabled={inviting || !shownEmail}
              className="mt-2 px-3 py-1.5 border border-primary text-primary-dark hover:bg-primary-soft disabled:opacity-50 text-xs font-medium rounded-lg transition-colors"
            >
              {inviting ? 'Sending…' : detail.has_portal_account ? 'Resend portal invite' : 'Send portal invite'}
            </button>
            {!shownEmail && (
              <p className="text-[11px] text-text-soft mt-1.5">Add an email address first — the invite is sent by email.</p>
            )}
          </div>
        </div>
      ) : null}
    </SlidePanel>
  );
}

function PatientSearchPage() {
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState(false);
  const [patients, setPatients] = useState<PatientSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [selected, setSelected] = useState<PatientSearchResult | null>(null);
  const [justRegistered, setJustRegistered] = useState<RegisteredPatient | null>(null);
  const { toast } = useToast();

  const runSearch = async (q: string) => {
    setLoading(true);
    setSearched(true);
    try {
      const data = await dataGet<Paginated<PatientSearchResult>>(
        ENDPOINTS.REC_PATIENT_SEARCH + '?query=' + encodeURIComponent(q),
      );
      setPatients(data.results ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    await runSearch(query);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-base font-semibold text-ink">Patient Search</h2>
        <button
          onClick={() => setRegisterOpen(true)}
          className="px-3.5 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg transition-colors"
        >
          Register patient
        </button>
      </div>

      {/* The HCL-ID handout, honestly. The create response has no identifiers
          (backend #137), so rather than guessing which search result is the
          patient just created, this says what happened and hands the desk the
          one safe next step. */}
      {justRegistered && (
        <div className="bg-primary-soft border border-primary/20 rounded-xl px-4 py-3">
          <p className="text-sm font-medium text-primary-dark">{justRegistered.name} has been registered.</p>

          {justRegistered.healthcloudaId ? (
            <>
              {/* The point of the whole flow: the desk reads this back to the
                  patient. It is their permanent identifier across every
                  organisation on the platform, so it is shown large, in mono,
                  and selectable rather than tucked into a toast that vanishes. */}
              <p className="text-xs text-text-soft mt-2">HealthClouda ID — read this back to the patient</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-lg font-semibold text-ink tracking-wide select-all">
                  {justRegistered.healthcloudaId}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(justRegistered.healthcloudaId ?? '');
                    toast.success('HealthClouda ID copied');
                  }}
                  className="text-xs font-medium text-primary-dark hover:underline"
                >
                  Copy
                </button>
              </div>
            </>
          ) : (
            /* FLAG-216's original state, kept deliberately. This response shape
               has been documented wrongly once already, so if the ID is missing
               we say so and hand over the one safe next step. We do NOT search
               for the patient just created and assume the first hit is theirs:
               two same-name registrations minutes apart are indistinguishable,
               and the wrong HealthClouda ID attaches someone's records to
               another person, invisibly, at the desk. */
            <>
              <p className="text-xs text-text-soft mt-1">
                The HealthClouda ID did not come back with this registration, so it cannot be shown
                here. Search for the patient to confirm which record is theirs before reading an ID
                back to them.
              </p>
              <button
                onClick={() => { setQuery(justRegistered.name); void runSearch(justRegistered.name); }}
                className="mt-2 text-xs font-medium text-primary-dark hover:underline"
              >
                Find {justRegistered.name} →
              </button>
            </>
          )}
        </div>
      )}

      <form onSubmit={search} className="flex gap-2 max-w-lg">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-soft [&>svg]:w-4 [&>svg]:h-4"><SearchIcon /></span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="Search patients by name, email or phone"
            placeholder="Search by name, email or phone…"
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-border rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
          />
        </div>
        <button type="submit" className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-xl transition-colors">
          Search
        </button>
      </form>

      {loading ? <ShimmerRows count={4} /> : searched && !patients.length ? (
        <EmptyState title="No patients found" description={`No patients matching "${query}".`} />
      ) : patients.length > 0 ? (
        <TableWrap>
          <thead className="bg-page border-b border-border">
            <tr><Th>Patient</Th><Th>Phone</Th><Th>Access</Th><Th>Portal</Th></tr>
          </thead>
          <tbody className="divide-y divide-row-hairline">
            {patients.map(p => (
              <tr key={p.id} className="hover:bg-row-hover transition-colors">
                <Td>
                  <div className="font-medium text-ink">{p.first_name} {p.last_name}</div>
                  {/* GLOBAL-3: the HCL-ID is the human-facing patient identifier (wristbands) */}
                  <div className="text-xs text-text-soft font-mono">{p.healthclouda_id}</div>
                </Td>
                <Td className="text-xs">{p.masked_phone || '—'}</Td>
                <Td><AccessBadge p={p} /></Td>
                <Td>
                  <button
                    onClick={() => setSelected(p)}
                    className="text-xs font-medium text-primary-dark hover:underline"
                  >
                    Portal &amp; contact
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 bg-primary-soft rounded-full flex items-center justify-center mb-3 text-primary-dark [&>svg]:w-5 [&>svg]:h-5">
            <SearchIcon />
          </div>
          <p className="text-sm text-text-soft">Enter a patient name, email, or phone number to search</p>
        </div>
      )}

      <RegisterPatientPanel
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onRegistered={setJustRegistered}
      />
      <PatientActionsPanel patient={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

// ─── Referrals page ───────────────────────────────────────────────

function ReferralsPage() {
  const { items: list, count, page, setPage, totalPages, loading, error, refetch } =
    usePaginatedList<Referral>(ENDPOINTS.REC_REFERRALS);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Incoming Referrals</h2>
        {count > 0 && <p className="text-sm text-gray-400 mt-0.5">{count} total</p>}
      </div>
      {loading ? <ShimmerRows count={5} /> : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : !list.length ? (
        <EmptyState title="No referrals" description="Incoming referrals will appear here." />
      ) : (
        <TableWrap>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr><Th>Patient</Th><Th>From</Th><Th>Reason</Th><Th>Date</Th><Th>Status</Th></tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {list.map(r => (
              <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                <Td><span className="font-medium text-gray-900">{r.patient_name ?? (r.patient ? `${r.patient.first_name} ${r.patient.last_name}` : '—')}</span></Td>
                <Td className="text-xs">{r.referring_doctor ?? '—'}</Td>
                <Td className="text-xs text-gray-500 max-w-xs">{truncate(r.reason ?? '—', 50)}</Td>
                <Td className="text-xs text-gray-400 whitespace-nowrap">{formatDate(r.created_at)}</Td>
                <Td><StatusBadge status={r.status} /></Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalCount={count} pageSize={20} />
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────

const PAGE_TITLES: Record<string, string> = {
  overview: 'Overview',
  checkins: "Today's Check-ins",
  appointments: 'Appointments',
  patients: 'Patient Search',
  referrals: 'Referrals',
};

interface Props {
  user: User;
  initialStats: ReceptionistStats | null;
  slug: string;
}

export function ReceptionistDashboard({ user, initialStats, slug: _slug }: Props) {
  const [page, setPage] = useState('overview');
  // AUTH-6: the server render can't refresh an expired session — when it hands
  // us null, fetch stats client-side (client-api refreshes on 401) instead of
  // shimmering forever.
  const { data: fetchedStats } = useApi<ReceptionistStats>(
    initialStats ? null : ENDPOINTS.REC_STATS,
  );
  const stats = initialStats ?? fetchedStats;

  return (
    <DashboardShell
      navItems={NAV}
      activePage={page}
      onPageChange={setPage}
      user={user}
      pageTitle={PAGE_TITLES[page]}
      /* T5 requires DASH-1…5 to show the notice below 768px (DASH-6 stays
         responsive). Receptionist was the last of the five without it.
         ⚠️ This is CONSISTENCY, not security — FLAG-203: the gate is CSS-only,
         so PHI still lands in the DOM on a small screen. */
      smallScreenGateFor="Receptionist"
    >
      {page === 'overview'     && <OverviewPage stats={stats} onNavigate={setPage} />}
      {page === 'checkins'     && <CheckInsPage />}
      {page === 'appointments' && <AppointmentsPage />}
      {page === 'patients'     && <PatientSearchPage />}
      {page === 'referrals'    && <ReferralsPage />}
    </DashboardShell>
  );
}