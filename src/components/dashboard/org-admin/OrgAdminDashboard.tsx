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
import { formatDate, roleLabel, truncate } from '@/lib/utils';
import { ENDPOINTS } from '@/lib/config';
import type { User } from '@/types/auth';
import type {
  OrgAdminStats, StaffMember, PatientSummary, Ward, AccessRequest, Paginated,
} from '@/types/dashboard';

function GridIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>; }
function UsersIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>; }
function UserIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>; }
function BedIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>; }
function KeyIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" /></svg>; }
function DocIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>; }

const NAV: NavItem[] = [
  { id: 'overview',         label: 'Overview',         icon: <GridIcon /> },
  { id: 'staff',            label: 'Staff',            icon: <UsersIcon /> },
  { id: 'patients',         label: 'Patients',         icon: <UserIcon /> },
  { id: 'wards',            label: 'Wards',            icon: <BedIcon /> },
  { id: 'access-requests',  label: 'Access Requests',  icon: <KeyIcon /> },
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

function OverviewPage({ stats, onNavigate }: { stats: OrgAdminStats | null; onNavigate: (p: string) => void }) {
  const { data: accessData, loading: arLoading, error: arError, refetch: arRefetch } =
    useApi<Paginated<AccessRequest>>(ENDPOINTS.ORG_ADMIN_ACCESS_REQUESTS + '?status=PENDING&page_size=5');
  const pending = accessData?.results ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard loading={!stats} label="Total Staff" value={stats?.total_staff} icon={<UsersIcon />} color="indigo" />
        <StatCard loading={!stats} label="Total Patients" value={stats?.total_patients} icon={<UserIcon />} color="blue" />
        <StatCard loading={!stats} label="Active Episodes" value={stats?.active_episodes} icon={<DocIcon />} color="amber" />
        <StatCard loading={!stats} label="Pending Access" value={stats?.pending_access_requests} icon={<KeyIcon />} color="red" onClick={stats?.pending_access_requests ? () => onNavigate('access-requests') : undefined} delta={stats?.pending_access_requests ? 'Requires review' : undefined} />
      </div>

      {/* Pending Access Requests */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Pending Access Requests</h2>
          <button onClick={() => onNavigate('access-requests')} className="text-xs font-medium text-indigo-600 hover:text-indigo-800">View all →</button>
        </div>
        {arLoading ? <ShimmerRows count={3} /> : arError ? (
          <ErrorState message={arError} onRetry={arRefetch} />
        ) : !pending.length ? (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-5 text-center">
            <p className="text-sm font-medium text-emerald-700">All clear — no pending access requests</p>
          </div>
        ) : (
          <TableWrap>
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr><Th>Patient</Th><Th>Requested By</Th><Th>Reason</Th><Th>Date</Th><Th>Status</Th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pending.map(ar => (
                <tr key={ar.id} className="hover:bg-gray-50/60 transition-colors">
                  <Td><span className="font-medium text-gray-900">{ar.patient_name ?? (ar.patient ? `${ar.patient.first_name} ${ar.patient.last_name}` : '—')}</span></Td>
                  <Td className="text-xs">{ar.staff_name ?? '—'}</Td>
                  <Td className="text-xs text-gray-500 max-w-xs">{truncate(ar.reason ?? '—', 50)}</Td>
                  <Td className="text-xs text-gray-400 whitespace-nowrap">{formatDate(ar.created_at)}</Td>
                  <Td><StatusBadge status={ar.status} /></Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </div>
    </div>
  );
}

// ─── Staff page ───────────────────────────────────────────────────

function StaffPage() {
  const { items: staff, count, page, setPage, totalPages, loading, error, refetch } =
    usePaginatedList<StaffMember>(ENDPOINTS.ORG_ADMIN_STAFF);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Staff Members</h2>
          {count > 0 && <p className="text-sm text-gray-400 mt-0.5">{count} total</p>}
        </div>
      </div>
      {loading ? <ShimmerRows count={6} /> : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : !staff.length ? (
        <EmptyState title="No staff members" description="No staff have been added to this organization." />
      ) : (
        <TableWrap>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr><Th>Member</Th><Th>Role</Th><Th>Status</Th><Th>Duty</Th><Th>Joined</Th></tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {staff.map(s => (
              <tr key={s.id} className="hover:bg-gray-50/60 transition-colors">
                <Td>
                  <div className="flex items-center gap-2.5">
                    <Avatar firstName={s.first_name} lastName={s.last_name} size="sm" />
                    <div>
                      <div className="font-medium text-gray-900">{s.first_name} {s.last_name}</div>
                      <div className="text-xs text-gray-400">{s.email}</div>
                    </div>
                  </div>
                </Td>
                <Td><span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">{roleLabel(s.role)}</span></Td>
                <Td><StatusBadge status={s.is_active ? 'ACTIVE' : 'INACTIVE'} /></Td>
                <Td>
                  {s.is_on_duty !== undefined && (
                    <span className={`text-xs font-medium ${s.is_on_duty ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {s.is_on_duty ? '● On Duty' : '○ Off Duty'}
                    </span>
                  )}
                </Td>
                <Td className="text-xs text-gray-400 whitespace-nowrap">{formatDate(s.date_joined)}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalCount={count} pageSize={20} />
    </div>
  );
}

// ─── Patients page ────────────────────────────────────────────────

function PatientsPage() {
  const { items: patients, count, page, setPage, totalPages, loading, error, refetch } =
    usePaginatedList<PatientSummary>(ENDPOINTS.ORG_ADMIN_PATIENTS);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Patients</h2>
        {count > 0 && <p className="text-sm text-gray-400 mt-0.5">{count} registered</p>}
      </div>
      {loading ? <ShimmerRows count={8} /> : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : !patients.length ? (
        <EmptyState title="No patients" description="No patients have been registered under this organization." />
      ) : (
        <TableWrap>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr><Th>Patient</Th><Th>Phone</Th><Th>Date of Birth</Th><Th>Registered</Th></tr>
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
                <Td className="text-xs text-gray-400 whitespace-nowrap">{formatDate(p.created_at)}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} totalCount={count} pageSize={20} />
    </div>
  );
}

// ─── Wards page ───────────────────────────────────────────────────

function WardsPage() {
  const { data: wards, loading, error, refetch } = useApi<Ward[] | Paginated<Ward>>(ENDPOINTS.ORG_ADMIN_WARDS_OVERVIEW);
  const wardList = Array.isArray(wards) ? wards : wards?.results ?? [];

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-900">Ward Overview</h2>
      {loading ? <ShimmerRows count={4} /> : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : !wardList.length ? (
        <EmptyState title="No wards" description="No wards have been configured for this organization." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {wardList.map(ward => {
            const pct = ward.total_beds > 0 ? Math.round((ward.occupied_beds / ward.total_beds) * 100) : 0;
            const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500';
            return (
              <div key={ward.id} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{ward.name}</h3>
                    {ward.ward_type && <p className="text-xs text-gray-400 mt-0.5">{ward.ward_type}</p>}
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    pct >= 90 ? 'bg-red-50 text-red-700' : pct >= 70 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                  }`}>{pct}%</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{ward.occupied_beds} occupied</span>
                    <span>{ward.available_beds} available</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-gray-400">{ward.total_beds} beds total</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Access Requests page ─────────────────────────────────────────

// READ-ONLY BY DESIGN (A6 / audit ORGADMIN-1). The backend removed
// `POST /org-admin/access-requests/<id>/review/` as a security fix: it let an
// org admin approve another organisation's access to a patient's records while
// bypassing the patient's own consent. An org admin may SEE requests — that is
// legitimate oversight — but the decision belongs to the patient, made through
// the emailed consent link or in-app (DASH-6). Do not re-add Approve/Deny here.
function AccessRequestsPage() {
  const { items: list, count, page, setPage, totalPages, loading, error, refetch } =
    usePaginatedList<AccessRequest>(ENDPOINTS.ORG_ADMIN_ACCESS_REQUESTS);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Access Requests</h2>
        {count > 0 && <p className="text-sm text-gray-400 mt-0.5">{count} total</p>}
        <p className="text-xs text-gray-400 mt-1">
          Read-only. Patients approve or deny access to their own records — an
          administrator cannot decide on their behalf.
        </p>
      </div>
      {loading ? <ShimmerRows count={6} /> : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : !list.length ? (
        <EmptyState title="No access requests" description="Patient data access requests will appear here." />
      ) : (
        <TableWrap>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr><Th>Patient</Th><Th>Requested By</Th><Th>Reason</Th><Th>Date</Th><Th>Status</Th></tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {list.map(ar => (
              <tr key={ar.id} className="hover:bg-gray-50/60 transition-colors">
                <Td><span className="font-medium text-gray-900">{ar.patient_name ?? (ar.patient ? `${ar.patient.first_name} ${ar.patient.last_name}` : '—')}</span></Td>
                <Td className="text-xs">{ar.staff_name ?? '—'}</Td>
                <Td className="text-xs text-gray-500 max-w-xs">{truncate(ar.reason ?? '—', 50)}</Td>
                <Td className="text-xs text-gray-400 whitespace-nowrap">{formatDate(ar.created_at)}</Td>
                <Td><StatusBadge status={ar.status} /></Td>
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
  staff: 'Staff Members',
  patients: 'Patients',
  wards: 'Ward Overview',
  'access-requests': 'Access Requests',
};

interface Props {
  user: User;
  initialStats: OrgAdminStats | null;
  slug: string;
}

export function OrgAdminDashboard({ user, initialStats, slug: _slug }: Props) {
  const [page, setPage] = useState('overview');
  // AUTH-6: server render can't refresh an expired session — fall back to a
  // client-side stats fetch instead of shimmering forever.
  const { data: fetchedStats } = useApi<OrgAdminStats>(initialStats ? null : ENDPOINTS.ORG_ADMIN_STATS);
  const stats = initialStats ?? fetchedStats;

  return (
    <DashboardShell
      navItems={NAV}
      activePage={page}
      onPageChange={setPage}
      user={user}
      pageTitle={PAGE_TITLES[page]}
    >
      {page === 'overview'        && <OverviewPage stats={stats} onNavigate={setPage} />}
      {page === 'staff'           && <StaffPage />}
      {page === 'patients'        && <PatientsPage />}
      {page === 'wards'           && <WardsPage />}
      {page === 'access-requests' && <AccessRequestsPage />}
    </DashboardShell>
  );
}