'use client';

import { useState } from 'react';
import { DashboardShell, type NavItem } from '@/components/layout/DashboardShell';
import { StatCard } from '@/components/dashboard/StatCard';
import { useApi, apiAction } from '@/hooks/use-api';
import { dataGet } from '@/lib/client-api';
import { useToast } from '@/store/toast';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ShimmerRows } from '@/components/ui/Shimmer';
import { formatDate, formatTime, timeAgo, truncate } from '@/lib/utils';
import { ENDPOINTS } from '@/lib/config';
import type { User } from '@/types/auth';
import type {
  ReceptionistStats, CheckIn, Appointment, Referral, PatientSummary, Paginated,
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
  const { data: checkinsData, loading: ciLoading } = useApi<Paginated<CheckIn>>(ENDPOINTS.REC_CHECK_INS + '?limit=6');
  const todayQueue = checkinsData?.results ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard loading={!stats} label="Check-ins Today" value={stats?.check_ins_today} icon={<UserPlusIcon />} color="green" />
        <StatCard loading={!stats} label="Pending Assignment" value={stats?.pending_assignments} icon={<CalIcon />} color="amber"
          delta={stats?.pending_assignments ? 'Needs doctor assignment' : undefined}
          onClick={stats?.pending_assignments ? () => onNavigate('checkins') : undefined} />
        <StatCard loading={!stats} label="Avail. Beds" value={stats?.available_emergency_beds} icon={<BedIcon />} color="blue" />
        <StatCard loading={!stats} label="Referrals In" value={stats?.incoming_referrals} icon={<ArrowIcon />} color="purple"
          onClick={stats?.incoming_referrals ? () => onNavigate('referrals') : undefined} />
      </div>

      {/* Today's Queue */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Today&apos;s Queue</h2>
          <button onClick={() => onNavigate('checkins')} className="text-xs font-medium text-emerald-600 hover:text-emerald-800">Manage check-ins →</button>
        </div>
        {ciLoading ? <ShimmerRows count={4} /> : !todayQueue.length ? (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-6 text-center">
            <p className="text-sm font-medium text-emerald-700">Queue is clear — no pending check-ins</p>
          </div>
        ) : (
          <TableWrap>
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr><Th>Patient</Th><Th>Complaint</Th><Th>Time</Th><Th>Doctor</Th><Th>Status</Th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {todayQueue.map(ci => (
                <tr key={ci.id} className="hover:bg-gray-50/60 transition-colors">
                  <Td><span className="font-medium text-gray-900">{ci.patient_name ?? (ci.patient ? `${ci.patient.first_name} ${ci.patient.last_name}` : '—')}</span></Td>
                  <Td className="text-xs text-gray-500 max-w-xs">{truncate(ci.chief_complaint ?? '—', 40)}</Td>
                  <Td className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(ci.check_in_time)}</Td>
                  <Td className="text-xs">{ci.assigned_doctor ?? <span className="text-amber-500 font-medium">Unassigned</span>}</Td>
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

function CheckInsPage() {
  const { data, loading, refetch } = useApi<Paginated<CheckIn>>(ENDPOINTS.REC_CHECK_INS);
  const { data: doctors } = useApi<{ id: string; first_name: string; last_name: string }[]>(ENDPOINTS.REC_DOCTORS_ON_DUTY);
  const { toast } = useToast();
  const [assigning, setAssigning] = useState<string | null>(null);
  const list = data?.results ?? [];

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

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Check-ins</h2>
        {data && <p className="text-sm text-gray-400 mt-0.5">{data.count} total today</p>}
      </div>

      {/* Doctors on duty strip */}
      {doctors && doctors.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-emerald-700 mr-1">Doctors on duty:</span>
          {doctors.map(d => (
            <span key={d.id} className="text-xs text-emerald-700 bg-white border border-emerald-200 px-2 py-0.5 rounded-full">
              Dr. {d.first_name} {d.last_name}
            </span>
          ))}
        </div>
      )}

      {loading ? <ShimmerRows count={6} /> : !list.length ? (
        <EmptyState title="No check-ins" description="Patient check-ins will appear here." />
      ) : (
        <TableWrap>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr><Th>Patient</Th><Th>Complaint</Th><Th>Checked In</Th><Th>Assign Doctor</Th><Th>Status</Th></tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {list.map(ci => (
              <tr key={ci.id} className="hover:bg-gray-50/60 transition-colors">
                <Td><span className="font-medium text-gray-900">{ci.patient_name ?? (ci.patient ? `${ci.patient.first_name} ${ci.patient.last_name}` : '—')}</span></Td>
                <Td className="text-xs text-gray-500">{truncate(ci.chief_complaint ?? '—', 40)}</Td>
                <Td className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(ci.check_in_time)}</Td>
                <Td>
                  {!ci.assigned_doctor && doctors && doctors.length > 0 ? (
                    <select
                      disabled={assigning === ci.id}
                      onChange={e => e.target.value && assignDoctor(ci.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-600 focus:ring-2 focus:ring-emerald-300 outline-none"
                    >
                      <option value="">Assign doctor…</option>
                      {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.first_name} {d.last_name}</option>)}
                    </select>
                  ) : (
                    <span className="text-xs text-gray-600">{ci.assigned_doctor ?? '—'}</span>
                  )}
                </Td>
                <Td><StatusBadge status={ci.status} /></Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}

// ─── Appointments page ────────────────────────────────────────────

function AppointmentsPage() {
  const { data, loading } = useApi<Paginated<Appointment>>(ENDPOINTS.REC_APPOINTMENTS);
  const list = data?.results ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Appointments</h2>
        {data && <p className="text-sm text-gray-400 mt-0.5">{data.count} total</p>}
      </div>
      {loading ? <ShimmerRows count={6} /> : !list.length ? (
        <EmptyState title="No appointments" description="Appointments will appear here." />
      ) : (
        <TableWrap>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr><Th>Patient</Th><Th>Doctor</Th><Th>Date</Th><Th>Time</Th><Th>Status</Th></tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {list.map(a => (
              <tr key={a.id} className="hover:bg-gray-50/60 transition-colors">
                <Td><span className="font-medium text-gray-900">{a.patient_name ?? (a.patient ? `${a.patient.first_name} ${a.patient.last_name}` : '—')}</span></Td>
                <Td className="text-xs">{a.doctor_name ?? '—'}</Td>
                <Td className="text-xs text-gray-500 whitespace-nowrap">{formatDate(a.appointment_date)}</Td>
                <Td className="text-xs text-gray-400">{a.appointment_time ? formatTime(a.appointment_time) : '—'}</Td>
                <Td><StatusBadge status={a.status} /></Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}

// ─── Patient Search page ──────────────────────────────────────────

function PatientSearchPage() {
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState(false);
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await dataGet<Paginated<PatientSummary> | PatientSummary[]>(
        ENDPOINTS.REC_PATIENT_SEARCH + '?query=' + encodeURIComponent(query),
      );
      setPatients(Array.isArray(data) ? data : data.results ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold text-gray-900">Patient Search</h2>

      <form onSubmit={search} className="flex gap-2 max-w-lg">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 [&>svg]:w-4 [&>svg]:h-4"><SearchIcon /></span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name, email or phone…"
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 outline-none transition-all"
          />
        </div>
        <button type="submit" className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-colors">
          Search
        </button>
      </form>

      {loading ? <ShimmerRows count={4} /> : searched && !patients.length ? (
        <EmptyState title="No patients found" description={`No patients matching "${query}".`} />
      ) : patients.length > 0 ? (
        <TableWrap>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr><Th>Patient</Th><Th>Phone</Th><Th>Date of Birth</Th></tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {patients.map(p => (
              <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                <Td>
                  <div className="font-medium text-gray-900">{p.first_name} {p.last_name}</div>
                  <div className="text-xs text-gray-400">{p.email ?? '—'}</div>
                </Td>
                <Td className="text-xs">{p.phone_number ?? '—'}</Td>
                <Td className="text-xs">{p.date_of_birth ? formatDate(p.date_of_birth) : '—'}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mb-3 text-emerald-600 [&>svg]:w-5 [&>svg]:h-5">
            <SearchIcon />
          </div>
          <p className="text-sm text-gray-500">Enter a patient name, email, or phone number to search</p>
        </div>
      )}
    </div>
  );
}

// ─── Referrals page ───────────────────────────────────────────────

function ReferralsPage() {
  const { data, loading } = useApi<Paginated<Referral>>(ENDPOINTS.REC_REFERRALS);
  const list = data?.results ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Incoming Referrals</h2>
        {data && <p className="text-sm text-gray-400 mt-0.5">{data.count} total</p>}
      </div>
      {loading ? <ShimmerRows count={5} /> : !list.length ? (
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

  return (
    <DashboardShell
      navItems={NAV}
      activePage={page}
      onPageChange={setPage}
      user={user}
      pageTitle={PAGE_TITLES[page]}
    >
      {page === 'overview'     && <OverviewPage stats={initialStats} onNavigate={setPage} />}
      {page === 'checkins'     && <CheckInsPage />}
      {page === 'appointments' && <AppointmentsPage />}
      {page === 'patients'     && <PatientSearchPage />}
      {page === 'referrals'    && <ReferralsPage />}
    </DashboardShell>
  );
}