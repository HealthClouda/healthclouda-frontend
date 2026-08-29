'use client';

import { useState } from 'react';
import { DashboardShell, type NavItem } from '@/components/layout/DashboardShell';
import { StatCard } from '@/components/dashboard/StatCard';
import { useApi, usePaginatedList } from '@/hooks/use-api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Pagination } from '@/components/ui/Pagination';
import { ShimmerRows } from '@/components/ui/Shimmer';
import { Avatar } from '@/components/ui/Avatar';
import { formatDate, formatTime, timeAgo, truncate } from '@/lib/utils';
import { ENDPOINTS } from '@/lib/config';
import type { User } from '@/types/auth';
import type {
  PatientDashboardData, Episode, PatientAppointment, AccessRequest, Referral, Notification, Paginated,
} from '@/types/dashboard';

// ─── Icons ────────────────────────────────────────────────────────
function GridIcon()  { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>; }
function HeartIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>; }
function CalIcon()   { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>; }
function KeyIcon()   { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" /></svg>; }
function DocIcon()   { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>; }
function BellIcon()  { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>; }

const NAV: NavItem[] = [
  { id: 'overview',     label: 'Overview',        icon: <GridIcon /> },
  { id: 'health',       label: 'My Health',        icon: <HeartIcon /> },
  { id: 'appointments', label: 'Appointments',     icon: <CalIcon /> },
  { id: 'access',       label: 'Access & Referrals', icon: <KeyIcon /> },
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

function OverviewPage({ stats, user, onNavigate }: { stats: PatientDashboardData | null; user: User; onNavigate: (p: string) => void }) {
  // PATIENT-1: real endpoint + real filter — `?upcoming=` was never implemented
  // backend-side and silently showed ALL appointments (GLOBAL-2 pattern).
  const { data: apptData, loading: apptLoading, error: apptError, refetch: apptRefetch } =
    useApi<Paginated<PatientAppointment>>(ENDPOINTS.PATIENT_APPOINTMENTS + '?status=scheduled&page_size=3');
  const { data: notifData, loading: notifLoading, error: notifError, refetch: notifRefetch } =
    useApi<Paginated<Notification>>(ENDPOINTS.PATIENT_NOTIFS + '?page_size=5');
  const upcoming = apptData?.results ?? [];
  const notifs = notifData?.results ?? [];

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="flex items-center gap-4 bg-gradient-to-r from-teal-600 to-teal-500 text-white rounded-2xl px-6 py-5">
        <Avatar firstName={user.first_name} lastName={user.last_name} size="lg" />
        <div>
          <p className="text-teal-100 text-sm">Welcome back,</p>
          <h2 className="text-xl font-bold">{user.first_name} {user.last_name}</h2>
          {user.organization_name && <p className="text-teal-200 text-xs mt-0.5">{user.organization_name}</p>}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard loading={!stats} label="Upcoming Appts"    value={stats?.upcoming_appointments}    icon={<CalIcon />}  color="teal"   onClick={() => onNavigate('appointments')} />
        <StatCard loading={!stats} label="Active Episodes"   value={stats?.active_episodes}           icon={<DocIcon />}  color="blue"   onClick={() => onNavigate('health')} />
        <StatCard loading={!stats} label="Access Requests"   value={stats?.pending_access_requests}   icon={<KeyIcon />}  color="amber"  onClick={() => onNavigate('access')} />
        <StatCard loading={!stats} label="Notifications"     value={stats?.unread_notifications ?? 0} icon={<BellIcon />} color="purple" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming appointments */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Upcoming Appointments</h2>
            <button onClick={() => onNavigate('appointments')} className="text-xs font-medium text-teal-600 hover:text-teal-800">View all →</button>
          </div>
          {apptLoading ? <ShimmerRows count={3} /> : apptError ? (
            <ErrorState message={apptError} onRetry={apptRefetch} />
          ) : !upcoming.length ? (
            <div className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-5 text-center">
              <p className="text-sm font-medium text-teal-700">No upcoming appointments</p>
              <p className="text-xs text-teal-500 mt-1">Your next appointment will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.map(a => (
                <div key={a.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 hover:border-teal-200 hover:shadow-sm transition-all">
                  <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0 text-teal-600 [&>svg]:w-5 [&>svg]:h-5">
                    <CalIcon />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{a.doctor_name || 'Doctor'}</p>
                    <p className="text-xs text-gray-400">{formatDate(a.scheduled_at)} · {formatTime(a.scheduled_at)} · {a.organization.name}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent notifications */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Notifications</h2>
          </div>
          {notifLoading ? <ShimmerRows count={4} /> : notifError ? (
            <ErrorState message={notifError} onRetry={notifRefetch} />
          ) : !notifs.length ? (
            <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-5 text-center">
              <p className="text-sm text-gray-500">No notifications</p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifs.map(n => (
                <div key={n.id} className={`flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors ${!n.is_read ? 'bg-teal-50/60 hover:bg-teal-50' : 'hover:bg-gray-50'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${!n.is_read ? 'bg-teal-500' : 'bg-gray-300'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!n.is_read ? 'font-medium text-gray-900' : 'text-gray-600'}`}>{n.message}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{timeAgo(n.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── My Health page ───────────────────────────────────────────────

function HealthPage() {
  const { items: episodes, count, page, setPage, totalPages, loading, error, refetch } =
    usePaginatedList<Episode>(ENDPOINTS.EPISODES + '?my=true');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900">My Health Records</h2>
        {count > 0 && <p className="text-sm text-gray-400 mt-0.5">{count} episodes on record</p>}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Episodes</h3>
        {loading ? <ShimmerRows count={5} /> : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : !episodes.length ? (
          <EmptyState title="No health records" description="Your medical episodes will appear here." />
        ) : (
          <TableWrap>
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr><Th>Episode</Th><Th>Chief Complaint</Th><Th>Status</Th><Th>Date</Th><Th>Closed</Th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {episodes.map(ep => (
                <tr key={ep.id} className="hover:bg-gray-50/60 transition-colors">
                  <Td><span className="font-mono text-xs text-gray-500">#{ep.id.slice(0, 8)}</span></Td>
                  <Td className="font-medium text-gray-900 max-w-xs">{truncate(ep.chief_complaint ?? '—', 50)}</Td>
                  <Td><StatusBadge status={ep.status} /></Td>
                  <Td className="text-xs text-gray-400 whitespace-nowrap">{formatDate(ep.episode_start ?? ep.created_at)}</Td>
                  <Td className="text-xs text-gray-400 whitespace-nowrap">{ep.closed_at ? formatDate(ep.closed_at) : '—'}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalCount={count} pageSize={20} />
      </div>
    </div>
  );
}

// ─── Appointments page ────────────────────────────────────────────

const APPT_FILTERS = ['scheduled', 'completed', 'cancelled', ''] as const;
type ApptFilter = (typeof APPT_FILTERS)[number];

function AppointmentsPage() {
  // PATIENT-1: ?status= is case-insensitive backend-side; '' = all.
  const [filter, setFilter] = useState<ApptFilter>('');
  const path = ENDPOINTS.PATIENT_APPOINTMENTS + (filter ? `?status=${filter}` : '');
  const { items: list, count, page, setPage, totalPages, loading, error, refetch } =
    usePaginatedList<PatientAppointment>(path);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">My Appointments</h2>
          {count > 0 && <p className="text-sm text-gray-400 mt-0.5">{count} {filter || 'total'}</p>}
        </div>
        <div className="flex rounded-xl border border-gray-200 overflow-hidden text-xs font-medium">
          {APPT_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={`px-3 py-1.5 capitalize transition-colors ${filter === f ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              {f === '' ? 'All' : f}
            </button>
          ))}
        </div>
      </div>
      {loading ? <ShimmerRows count={6} /> : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : !list.length ? (
        <EmptyState title="No appointments" description="Your appointments will be listed here." />
      ) : (
        <div className="space-y-3">
          {list.map(a => {
            const isPast = a.status === 'COMPLETED' || a.status === 'CANCELLED';
            return (
              <div key={a.id} className={`flex items-center gap-4 bg-white border rounded-xl px-5 py-4 transition-all hover:shadow-sm
                ${isPast ? 'border-gray-100 opacity-70' : 'border-teal-100 hover:border-teal-200'}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isPast ? 'bg-gray-50' : 'bg-teal-50'}`}>
                  <span className={`[&>svg]:w-5 [&>svg]:h-5 ${isPast ? 'text-gray-400' : 'text-teal-600'}`}><CalIcon /></span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{a.doctor_name || 'Doctor'}</p>
                  <p className="text-sm text-gray-500">
                    {formatDate(a.scheduled_at)} at {formatTime(a.scheduled_at)} · {a.duration_minutes} min · {a.organization.name}
                  </p>
                  {a.reason && <p className="text-xs text-gray-400 mt-0.5">{truncate(a.reason, 60)}</p>}
                  {a.status === 'CANCELLED' && a.cancellation_reason && (
                    <p className="text-xs text-red-400 mt-0.5">Cancelled: {truncate(a.cancellation_reason, 60)}</p>
                  )}
                </div>
                <StatusBadge status={a.status} />
              </div>
            );
          })}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalCount={count} pageSize={20} />
    </div>
  );
}

// ─── Access & Referrals page ──────────────────────────────────────

function AccessPage() {
  const [tab, setTab] = useState<'access' | 'referrals'>('access');
  const { data: arData, loading: arLoading, error: arError, refetch: arRefetch } =
    useApi<Paginated<AccessRequest>>(ENDPOINTS.PATIENT_ACCESS_REQUESTS);
  const { data: refData, loading: refLoading, error: refError, refetch: refRefetch } =
    useApi<Paginated<Referral> | Referral[]>(ENDPOINTS.PATIENT_REFERRALS);

  const accessList = arData?.results ?? [];
  const refList = Array.isArray(refData) ? refData : refData?.results ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-base font-semibold text-gray-900">Access & Referrals</h2>
        <div className="flex rounded-xl border border-gray-200 overflow-hidden text-xs font-medium">
          {(['access', 'referrals'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 capitalize transition-colors ${tab === t ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              {t === 'access' ? 'Data Access' : 'Referrals'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'access' && (
        arLoading ? <ShimmerRows count={4} /> : arError ? (
          <ErrorState message={arError} onRetry={arRefetch} />
        ) : !accessList.length ? (
          <EmptyState title="No access requests" description="Requests to access your medical data will appear here." />
        ) : (
          <TableWrap>
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr><Th>Requested By</Th><Th>Reason</Th><Th>Date</Th><Th>Status</Th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {accessList.map(ar => (
                <tr key={ar.id} className="hover:bg-gray-50/60 transition-colors">
                  <Td className="font-medium text-gray-900">{ar.staff_name ?? '—'}</Td>
                  <Td className="text-xs text-gray-500 max-w-xs">{truncate(ar.reason ?? '—', 55)}</Td>
                  <Td className="text-xs text-gray-400 whitespace-nowrap">{formatDate(ar.created_at)}</Td>
                  <Td><StatusBadge status={ar.status} /></Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )
      )}

      {tab === 'referrals' && (
        refLoading ? <ShimmerRows count={4} /> : refError ? (
          <ErrorState message={refError} onRetry={refRefetch} />
        ) : !refList.length ? (
          <EmptyState title="No referrals" description="Referrals from your doctor will appear here." />
        ) : (
          <TableWrap>
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr><Th>Referred By</Th><Th>Referred To</Th><Th>Reason</Th><Th>Date</Th><Th>Status</Th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {refList.map(r => (
                <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                  <Td className="font-medium text-gray-900">{r.referring_doctor ?? '—'}</Td>
                  <Td className="text-xs">{r.referred_to ?? '—'}</Td>
                  <Td className="text-xs text-gray-500 max-w-xs">{truncate(r.reason ?? '—', 45)}</Td>
                  <Td className="text-xs text-gray-400 whitespace-nowrap">{formatDate(r.created_at)}</Td>
                  <Td><StatusBadge status={r.status} /></Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────

const PAGE_TITLES: Record<string, string> = {
  overview:     'Overview',
  health:       'My Health',
  appointments: 'Appointments',
  access:       'Access & Referrals',
};

interface Props {
  user: User;
  initialStats: PatientDashboardData | null;
}

export function PatientDashboard({ user, initialStats }: Props) {
  const [page, setPage] = useState('overview');
  // AUTH-6: server render can't refresh an expired session — fall back to a
  // client-side stats fetch instead of shimmering forever.
  const { data: fetchedStats } = useApi<PatientDashboardData>(
    initialStats ? null : ENDPOINTS.PATIENT_DASHBOARD,
  );
  const stats = initialStats ?? fetchedStats;

  return (
    <DashboardShell
      navItems={NAV}
      activePage={page}
      onPageChange={setPage}
      user={user}
      pageTitle={page === 'overview' ? undefined : PAGE_TITLES[page]}
    >
      {page === 'overview'     && <OverviewPage stats={stats} user={user} onNavigate={setPage} />}
      {page === 'health'       && <HealthPage />}
      {page === 'appointments' && <AppointmentsPage />}
      {page === 'access'       && <AccessPage />}
    </DashboardShell>
  );
}
