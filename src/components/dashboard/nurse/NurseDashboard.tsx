'use client';

import { useState } from 'react';
import { DashboardShell, type NavItem } from '@/components/layout/DashboardShell';
import { StatCard } from '@/components/dashboard/StatCard';
import { DutyToggle } from '@/components/dashboard/DutyToggle';
import { useApi, usePaginatedList } from '@/hooks/use-api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Pagination } from '@/components/ui/Pagination';
import { ShimmerRows } from '@/components/ui/Shimmer';
import { Avatar } from '@/components/ui/Avatar';
import { formatDate, timeAgo, truncate } from '@/lib/utils';
import { ENDPOINTS } from '@/lib/config';
import type { User } from '@/types/auth';
import type { NurseStats, PatientSummary, Ward, VitalRecord, Paginated } from '@/types/dashboard';

function GridIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>; }
function UserIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>; }
function HeartIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>; }
function BedIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>; }
function AlertIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>; }

const NAV: NavItem[] = [
  { id: 'overview', label: 'Overview',     icon: <GridIcon /> },
  { id: 'patients', label: 'My Patients',  icon: <UserIcon /> },
  { id: 'vitals',   label: 'Vitals',       icon: <HeartIcon /> },
  { id: 'wards',    label: 'Ward Overview',icon: <BedIcon /> },
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

function OverviewPage({ stats, onNavigate, isOnDuty }: { stats: NurseStats | null; onNavigate: (p: string) => void; isOnDuty: boolean }) {
  const { data: vitalsData, loading: vLoading, error: vError, refetch: vRefetch } =
    useApi<Paginated<VitalRecord> | VitalRecord[]>(ENDPOINTS.NURSE_MY_PATIENTS + '?vitals_pending=true&page_size=5');
  const pending = Array.isArray(vitalsData) ? vitalsData : (vitalsData as Paginated<VitalRecord> | null)?.results ?? [];

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${isOnDuty ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-100'}`}>
        <p className={`text-sm font-medium ${isOnDuty ? 'text-emerald-700' : 'text-gray-500'}`}>
          {isOnDuty ? 'You are currently on duty and visible to the system.' : 'You are currently off duty.'}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard loading={!stats} label="My Patients" value={stats?.total_patients} icon={<UserIcon />} color="purple" onClick={() => onNavigate('patients')} />
        <StatCard loading={!stats} label="Vitals Pending" value={stats?.vitals_pending} icon={<HeartIcon />} color="amber"
          delta={stats?.vitals_pending ? 'Needs recording' : undefined}
          onClick={stats?.vitals_pending ? () => onNavigate('patients') : undefined} />
        <StatCard loading={!stats} label="Wards" value={stats?.wards_count ?? '—'} icon={<BedIcon />} color="blue" onClick={() => onNavigate('wards')} />
        <StatCard loading={!stats} label="Critical" value={stats?.critical_patients ?? 0} icon={<AlertIcon />} color="red"
          delta={stats?.critical_patients ? 'Needs attention' : 'None critical'} />
      </div>

      {/* Vitals pending */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Vitals Pending</h2>
          <button onClick={() => onNavigate('vitals')} className="text-xs font-medium text-purple-600 hover:text-purple-800">Record vitals →</button>
        </div>
        {vLoading ? <ShimmerRows count={4} /> : vError ? (
          <ErrorState message={vError} onRetry={vRefetch} />
        ) : !pending.length ? (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-5 text-center">
            <p className="text-sm font-medium text-emerald-700">All vitals recorded — great work!</p>
          </div>
        ) : (
          <TableWrap>
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr><Th>Patient</Th><Th>Last Recorded</Th><Th>BP</Th><Th>HR</Th><Th>SpO2</Th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pending.map(v => (
                <tr key={v.id} className="hover:bg-gray-50/60 transition-colors">
                  <Td><span className="font-medium text-gray-900">{v.patient ? `${v.patient.first_name} ${v.patient.last_name}` : '—'}</span></Td>
                  <Td className="text-xs text-gray-400">{timeAgo(v.recorded_at)}</Td>
                  <Td className="text-xs font-mono">{v.blood_pressure ?? '—'}</Td>
                  <Td className="text-xs tabular-nums">{v.heart_rate ?? '—'}</Td>
                  <Td className="text-xs tabular-nums">{v.oxygen_saturation ? `${v.oxygen_saturation}%` : '—'}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </div>
    </div>
  );
}

// ─── My Patients page ─────────────────────────────────────────────

function MyPatientsPage() {
  const { items: patients, count, page, setPage, totalPages, loading, error, refetch } =
    usePaginatedList<PatientSummary>(ENDPOINTS.NURSE_MY_PATIENTS);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">My Patients</h2>
        {count > 0 && <p className="text-sm text-gray-400 mt-0.5">{count} assigned</p>}
      </div>
      {loading ? <ShimmerRows count={6} /> : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : !patients.length ? (
        <EmptyState title="No patients assigned" description="Patients assigned to you will appear here." />
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

// ─── Vitals page ──────────────────────────────────────────────────

function VitalsPage() {
  const { data, loading, error, refetch } = useApi<Paginated<VitalRecord> | VitalRecord[]>(ENDPOINTS.NURSE_MY_PATIENTS + '?include_vitals=true');
  const records = Array.isArray(data) ? data : (data as Paginated<VitalRecord> | null)?.results ?? [];

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-900">Vitals Records</h2>
      {loading ? <ShimmerRows count={6} /> : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : !records.length ? (
        <EmptyState title="No vitals recorded" description="Patient vitals recorded by you will appear here." />
      ) : (
        <TableWrap>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr><Th>Patient</Th><Th>BP</Th><Th>Heart Rate</Th><Th>Temp</Th><Th>SpO2</Th><Th>Recorded</Th></tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {records.map(v => (
              <tr key={v.id} className="hover:bg-gray-50/60 transition-colors">
                <Td><span className="font-medium text-gray-900">{v.patient ? `${v.patient.first_name} ${v.patient.last_name}` : '—'}</span></Td>
                <Td className="text-xs font-mono">{v.blood_pressure ?? '—'}</Td>
                <Td className="text-xs tabular-nums">{v.heart_rate ? `${v.heart_rate} bpm` : '—'}</Td>
                <Td className="text-xs tabular-nums">{v.temperature ? `${v.temperature}°C` : '—'}</Td>
                <Td className="text-xs tabular-nums">{v.oxygen_saturation ? `${v.oxygen_saturation}%` : '—'}</Td>
                <Td className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(v.recorded_at)}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}

// ─── Ward Overview page ───────────────────────────────────────────

function WardsPage() {
  const { data, loading, error, refetch } = useApi<Ward[] | Paginated<Ward>>(ENDPOINTS.NURSE_WARDS_OVERVIEW);
  const wards = Array.isArray(data) ? data : (data as Paginated<Ward> | null)?.results ?? [];

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-900">Ward Overview</h2>
      {loading ? <ShimmerRows count={3} /> : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : !wards.length ? (
        <EmptyState title="No wards" description="Ward information will appear here." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {wards.map(ward => {
            const pct = ward.total_beds > 0 ? Math.round((ward.occupied_beds / ward.total_beds) * 100) : 0;
            const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-purple-500';
            const badgeColor = pct >= 90 ? 'bg-red-50 text-red-700' : pct >= 70 ? 'bg-amber-50 text-amber-700' : 'bg-purple-50 text-purple-700';
            return (
              <div key={ward.id} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{ward.name}</h3>
                    {ward.ward_type && <p className="text-xs text-gray-400 mt-0.5">{ward.ward_type}</p>}
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>{pct}%</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{ward.occupied_beds} occupied</span>
                    <span className="text-emerald-600 font-medium">{ward.available_beds} free</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-gray-400">{ward.total_beds} total beds</p>
                </div>
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
  wards: 'Ward Overview',
};

interface Props {
  user: User;
  initialStats: NurseStats | null;
  slug: string;
}

export function NurseDashboard({ user, initialStats, slug: _slug }: Props) {
  const [page, setPage] = useState('overview');
  const [isOnDuty, setIsOnDuty] = useState(user.is_on_duty ?? false);
  // AUTH-6: server render can't refresh an expired session — fall back to a
  // client-side stats fetch instead of shimmering forever.
  const { data: fetchedStats } = useApi<NurseStats>(initialStats ? null : ENDPOINTS.NURSE_STATS);
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
      {page === 'overview' && <OverviewPage stats={stats} onNavigate={setPage} isOnDuty={isOnDuty} />}
      {page === 'patients' && <MyPatientsPage />}
      {page === 'vitals'   && <VitalsPage />}
      {page === 'wards'    && <WardsPage />}
    </DashboardShell>
  );
}