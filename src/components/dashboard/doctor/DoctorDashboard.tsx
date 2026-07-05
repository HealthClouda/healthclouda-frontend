'use client';

import { useState } from 'react';
import { DashboardShell, type NavItem } from '@/components/layout/DashboardShell';
import { StatCard } from '@/components/dashboard/StatCard';
import { DutyToggle } from '@/components/dashboard/DutyToggle';
import { useApi, apiAction, usePaginatedList } from '@/hooks/use-api';
import { useToast } from '@/store/toast';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Pagination } from '@/components/ui/Pagination';
import { ShimmerRows } from '@/components/ui/Shimmer';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Avatar } from '@/components/ui/Avatar';
import { formatDate, formatTime, timeAgo, truncate } from '@/lib/utils';
import { ENDPOINTS } from '@/lib/config';
import type { User } from '@/types/auth';
import type {
  DoctorStats, PatientSummary, Episode, Appointment, Referral, Prescription, Paginated,
} from '@/types/dashboard';

// ─── Icons ────────────────────────────────────────────────────────
function GridIcon()    { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>; }
function UserIcon()    { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>; }
function DocIcon()     { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>; }
function CalIcon()     { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>; }
function ArrowIcon()   { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>; }
function BeakerIcon()  { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" /></svg>; }

const NAV: NavItem[] = [
  { id: 'overview',      label: 'Overview',      icon: <GridIcon /> },
  { id: 'patients',      label: 'My Patients',   icon: <UserIcon /> },
  { id: 'episodes',      label: 'Episodes',      icon: <DocIcon /> },
  { id: 'appointments',  label: 'Appointments',  icon: <CalIcon /> },
  { id: 'referrals',     label: 'Referrals',     icon: <ArrowIcon /> },
  { id: 'prescriptions', label: 'Prescriptions', icon: <BeakerIcon /> },
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

// ─── Overview ─────────────────────────────────────────────────────

function OverviewPage({
  stats, onNavigate, isOnDuty,
}: { stats: DoctorStats | null; onNavigate: (p: string) => void; isOnDuty: boolean }) {
  const { data: apptData, loading: apptLoading, error: apptError, refetch: apptRefetch } =
    useApi<Paginated<Appointment>>(ENDPOINTS.DOC_APPOINTMENTS + '?today=true&page_size=6');
  const { data: epData, loading: epLoading, error: epError, refetch: epRefetch } =
    useApi<Paginated<Episode>>(ENDPOINTS.DOC_EPISODES + '?status=OPEN&page_size=5');
  const todayAppts = apptData?.results ?? [];
  const recentEps = epData?.results ?? [];

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
        <StatCard loading={!stats} label="Appointments Today" value={stats?.appointments_today}   icon={<CalIcon />}    color="indigo" onClick={() => onNavigate('appointments')} />
        <StatCard loading={!stats} label="Pending Referrals"  value={stats?.pending_referrals}    icon={<ArrowIcon />}  color="amber"  onClick={stats?.pending_referrals ? () => onNavigate('referrals') : undefined} />
        <StatCard loading={!stats} label="Prescriptions"      value={stats?.active_prescriptions} icon={<BeakerIcon />} color="purple" onClick={() => onNavigate('prescriptions')} />
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
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-5 text-center">
              <p className="text-sm font-medium text-blue-700">No appointments scheduled for today</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayAppts.map(a => (
                <div key={a.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 hover:border-blue-200 hover:shadow-sm transition-all">
                  <Avatar firstName={a.patient?.first_name ?? '?'} lastName={a.patient?.last_name ?? ''} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {a.patient_name ?? (a.patient ? `${a.patient.first_name} ${a.patient.last_name}` : '—')}
                    </p>
                    <p className="text-xs text-gray-400">{a.appointment_time ? formatTime(a.appointment_time) : formatDate(a.appointment_date)}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent open episodes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Open Episodes</h2>
            <button onClick={() => onNavigate('episodes')} className="text-xs font-medium text-blue-600 hover:text-blue-800">View all →</button>
          </div>
          {epLoading ? <ShimmerRows count={4} /> : epError ? (
            <ErrorState message={epError} onRetry={epRefetch} />
          ) : !recentEps.length ? (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-5 text-center">
              <p className="text-sm font-medium text-emerald-700">No open episodes</p>
            </div>
          ) : (
            <TableWrap>
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr><Th>Patient</Th><Th>Complaint</Th><Th>Opened</Th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentEps.map(ep => (
                  <tr key={ep.id} className="hover:bg-gray-50/60 transition-colors">
                    <Td><span className="font-medium text-gray-900">{ep.patient_name ?? (ep.patient ? `${ep.patient.first_name} ${ep.patient.last_name}` : '—')}</span></Td>
                    <Td className="text-xs text-gray-500 max-w-[160px]">{truncate(ep.chief_complaint ?? '—', 30)}</Td>
                    <Td className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(ep.created_at)}</Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── My Patients ───────────────────────────────────────────────────

function MyPatientsPage() {
  const { items: patients, count, page, setPage, totalPages, loading, error, refetch } =
    usePaginatedList<PatientSummary>(ENDPOINTS.DOC_MY_PATIENTS);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">My Patients</h2>
        {count > 0 && <p className="text-sm text-gray-400 mt-0.5">{count} active</p>}
      </div>
      {loading ? <ShimmerRows count={7} /> : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : !patients.length ? (
        <EmptyState title="No patients" description="Patients assigned to you will appear here." />
      ) : (
        <TableWrap>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr><Th>Patient</Th><Th>Phone</Th><Th>Date of Birth</Th><Th>Since</Th></tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {patients.map(p => (
              <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                <Td>
                  <div className="flex items-center gap-2.5">
                    <Avatar firstName={p.first_name} lastName={p.last_name} size="sm" />
                    <div>
                      <div className="font-medium text-gray-900">{p.first_name} {p.last_name}</div>
                      <div className="text-xs text-gray-400">{p.email ?? '—'}</div>
                    </div>
                  </div>
                </Td>
                <Td className="text-xs">{p.phone_number ?? '—'}</Td>
                <Td className="text-xs">{p.date_of_birth ? formatDate(p.date_of_birth) : '—'}</Td>
                <Td className="text-xs text-gray-400">{formatDate(p.created_at)}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalCount={count} pageSize={20} />
    </div>
  );
}

// ─── Episodes ─────────────────────────────────────────────────────

function EpisodesPage() {
  const [filter, setFilter] = useState<'OPEN' | 'CLOSED' | ''>('OPEN');
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
        <div>
          <h2 className="text-base font-semibold text-gray-900">Episodes</h2>
          {count > 0 && <p className="text-sm text-gray-400 mt-0.5">{count} {filter.toLowerCase() || 'total'}</p>}
        </div>
        <div className="flex rounded-xl border border-gray-200 overflow-hidden text-xs font-medium">
          {(['OPEN', 'CLOSED', ''] as const).map(f => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={`px-3 py-1.5 transition-colors ${filter === f ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              {f === '' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? <ShimmerRows count={6} /> : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : !episodes.length ? (
        <EmptyState title={`No ${filter.toLowerCase() || ''} episodes`} description="Episodes will appear here." />
      ) : (
        <TableWrap>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr><Th>Patient</Th><Th>Chief Complaint</Th><Th>Status</Th><Th>Opened</Th><Th>Actions</Th></tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {episodes.map(ep => (
              <tr key={ep.id} className="hover:bg-gray-50/60 transition-colors">
                <Td><span className="font-medium text-gray-900">{ep.patient_name ?? (ep.patient ? `${ep.patient.first_name} ${ep.patient.last_name}` : '—')}</span></Td>
                <Td className="text-xs text-gray-500 max-w-xs">{truncate(ep.chief_complaint ?? '—', 50)}</Td>
                <Td><StatusBadge status={ep.status} /></Td>
                <Td className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(ep.created_at)}</Td>
                <Td>
                  {ep.status === 'OPEN' && (
                    <button onClick={() => setCompleting(ep)} className="text-xs font-medium text-blue-600 hover:text-blue-800">
                      Complete
                    </button>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalCount={count} pageSize={20} />

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
      <div>
        <h2 className="text-base font-semibold text-gray-900">Appointments</h2>
        {count > 0 && <p className="text-sm text-gray-400 mt-0.5">{count} total</p>}
      </div>
      {loading ? <ShimmerRows count={7} /> : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : !list.length ? (
        <EmptyState title="No appointments" description="Your scheduled appointments will appear here." />
      ) : (
        <TableWrap>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr><Th>Patient</Th><Th>Date</Th><Th>Time</Th><Th>Notes</Th><Th>Status</Th></tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {list.map(a => (
              <tr key={a.id} className="hover:bg-gray-50/60 transition-colors">
                <Td>
                  <div className="flex items-center gap-2.5">
                    <Avatar firstName={a.patient?.first_name ?? '?'} lastName={a.patient?.last_name ?? ''} size="sm" />
                    <span className="font-medium text-gray-900">{a.patient_name ?? (a.patient ? `${a.patient.first_name} ${a.patient.last_name}` : '—')}</span>
                  </div>
                </Td>
                <Td className="text-xs whitespace-nowrap">{formatDate(a.appointment_date)}</Td>
                <Td className="text-xs text-gray-400">{a.appointment_time ? formatTime(a.appointment_time) : '—'}</Td>
                <Td className="text-xs text-gray-500 max-w-xs">{truncate(a.notes ?? '—', 40)}</Td>
                <Td><StatusBadge status={a.status} /></Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
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
        <div>
          <h2 className="text-base font-semibold text-gray-900">Referrals</h2>
          {count > 0 && <p className="text-sm text-gray-400 mt-0.5">{count} {tab}</p>}
        </div>
        <div className="flex rounded-xl border border-gray-200 overflow-hidden text-xs font-medium">
          {(['outgoing', 'incoming'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setPage(1); }}
              className={`px-3 py-1.5 capitalize transition-colors ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>
      {loading ? <ShimmerRows count={5} /> : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : !list.length ? (
        <EmptyState title={`No ${tab} referrals`} description="Referrals will appear here." />
      ) : (
        <TableWrap>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr><Th>Patient</Th><Th>{tab === 'outgoing' ? 'Referred To' : 'Referred By'}</Th><Th>Reason</Th><Th>Date</Th><Th>Status</Th></tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {list.map(r => (
              <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                <Td><span className="font-medium text-gray-900">{r.patient_name ?? (r.patient ? `${r.patient.first_name} ${r.patient.last_name}` : '—')}</span></Td>
                <Td className="text-xs">{tab === 'outgoing' ? (r.referred_to ?? '—') : (r.referring_doctor ?? '—')}</Td>
                <Td className="text-xs text-gray-500 max-w-xs">{truncate(r.reason ?? '—', 45)}</Td>
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
      <div>
        <h2 className="text-base font-semibold text-gray-900">Prescriptions</h2>
        {count > 0 && <p className="text-sm text-gray-400 mt-0.5">{count} total</p>}
      </div>
      {loading ? <ShimmerRows count={6} /> : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : !list.length ? (
        <EmptyState title="No prescriptions" description="Prescriptions you've issued will appear here." />
      ) : (
        <TableWrap>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr><Th>Patient</Th><Th>Medication</Th><Th>Dosage</Th><Th>Frequency</Th><Th>Status</Th><Th>Actions</Th></tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {list.map(rx => (
              <tr key={rx.id} className="hover:bg-gray-50/60 transition-colors">
                <Td><span className="font-medium text-gray-900">{rx.patient_name ?? (rx.patient ? `${rx.patient.first_name} ${rx.patient.last_name}` : '—')}</span></Td>
                <Td className="font-medium text-gray-800">{rx.medication}</Td>
                <Td className="text-xs">{rx.dosage ?? '—'}</Td>
                <Td className="text-xs">{rx.frequency ?? '—'}</Td>
                <Td><StatusBadge status={rx.status} /></Td>
                <Td>
                  {rx.status === 'ACTIVE' && (
                    <button onClick={() => setCancelling(rx)} className="text-xs font-medium text-red-600 hover:text-red-800">Cancel</button>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalCount={count} pageSize={20} />
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