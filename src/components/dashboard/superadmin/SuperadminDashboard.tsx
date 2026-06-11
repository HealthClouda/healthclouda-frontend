'use client';

import { useState } from 'react';
import { DashboardShell, type NavItem } from '@/components/layout/DashboardShell';
import { StatCard } from '@/components/dashboard/StatCard';
import { useApi, apiAction } from '@/hooks/use-api';
import { useToast } from '@/store/toast';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ShimmerRows } from '@/components/ui/Shimmer';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Avatar } from '@/components/ui/Avatar';
import { formatDate, timeAgo, truncate } from '@/lib/utils';
import { ENDPOINTS } from '@/lib/config';
import type { User } from '@/types/auth';
import type {
  SuperadminStats, OrgSummary, StaffMember, ActivityItem, Paginated,
} from '@/types/dashboard';

// ─── Icons ───────────────────────────────────────────────────────

function GridIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>;
}
function BuildingIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>;
}
function UsersIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>;
}
function ClipboardIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" /></svg>;
}
function ChartIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>;
}

// ─── Nav ─────────────────────────────────────────────────────────

const NAV: NavItem[] = [
  { id: 'overview',      label: 'Overview',      icon: <GridIcon /> },
  { id: 'organizations', label: 'Organizations',  icon: <BuildingIcon /> },
  { id: 'users',         label: 'Users',          icon: <UsersIcon /> },
  { id: 'audit',         label: 'Audit Logs',     icon: <ClipboardIcon /> },
];

// ─── Helper: table wrapper ────────────────────────────────────────

function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}
function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{children}</th>;
}
function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3.5 text-gray-700 ${className}`}>{children}</td>;
}

// ─── Overview page ────────────────────────────────────────────────

function OverviewPage({
  stats, onNavigate,
}: { stats: SuperadminStats | null; onNavigate: (p: string) => void }) {
  const { data: activity, loading: actLoading } = useApi<{ results?: ActivityItem[] } | ActivityItem[]>(ENDPOINTS.SA_ACTIVITY);
  const { data: orgsData, loading: orgsLoading } = useApi<Paginated<OrgSummary>>(ENDPOINTS.SA_ORGS + '?limit=5');

  const activityList = Array.isArray(activity)
    ? activity.slice(0, 8)
    : (activity as { results?: ActivityItem[] } | null)?.results?.slice(0, 8) ?? [];
  const recentOrgs = orgsData?.results ?? [];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard loading={!stats} label="Total Orgs" value={stats?.total_organizations} icon={<BuildingIcon />} color="slate" />
        <StatCard loading={!stats} label="Active Orgs" value={stats?.active_organizations} icon={<ChartIcon />} color="green" delta={stats ? `${stats.active_organizations} of ${stats.total_organizations} active` : undefined} />
        <StatCard loading={!stats} label="Total Users" value={stats?.total_users} icon={<UsersIcon />} color="indigo" />
        <StatCard loading={!stats} label="Total Patients" value={stats?.total_patients} icon={<UsersIcon />} color="blue" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Organizations */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Recent Organizations</h2>
            <button onClick={() => onNavigate('organizations')} className="text-xs font-medium text-blue-600 hover:text-blue-800">View all →</button>
          </div>
          {orgsLoading ? <ShimmerRows count={4} /> : !recentOrgs.length ? (
            <EmptyState title="No organizations" description="None registered yet." />
          ) : (
            <TableWrap>
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr><Th>Organization</Th><Th>Status</Th><Th>Created</Th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentOrgs.map(org => (
                  <tr key={org.id} className="hover:bg-gray-50/60 transition-colors">
                    <Td>
                      <div className="font-medium text-gray-900">{org.name}</div>
                      <div className="text-xs text-gray-400">{org.slug}</div>
                    </Td>
                    <Td><StatusBadge status={org.is_active ? 'ACTIVE' : 'SUSPENDED'} /></Td>
                    <Td className="text-xs text-gray-400">{formatDate(org.created_at)}</Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </div>

        {/* Recent Activity */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Recent Activity</h2>
            <button onClick={() => onNavigate('audit')} className="text-xs font-medium text-blue-600 hover:text-blue-800">View audit logs →</button>
          </div>
          {actLoading ? <ShimmerRows count={5} /> : !activityList.length ? (
            <EmptyState title="No recent activity" description="System activity will appear here." />
          ) : (
            <div className="space-y-1">
              {activityList.map(item => (
                <div key={item.id} className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">{truncate(item.description ?? item.action ?? 'System event', 70)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.performed_by ?? item.user ?? 'System'} · {timeAgo(item.created_at ?? item.timestamp)}</p>
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

// ─── Organizations page ───────────────────────────────────────────

function OrgsPage() {
  const { data, loading, refetch } = useApi<Paginated<OrgSummary>>(ENDPOINTS.SA_ORGS);
  const { toast } = useToast();
  const [confirm, setConfirm] = useState<{ org: OrgSummary; action: 'suspend' | 'activate' | 'verify' } | null>(null);
  const [working, setWorking] = useState(false);

  async function runAction() {
    if (!confirm) return;
    setWorking(true);
    try {
      const path =
        confirm.action === 'suspend' ? ENDPOINTS.SA_ORG_SUSPEND(confirm.org.id)
        : confirm.action === 'activate' ? ENDPOINTS.SA_ORG_ACTIVATE(confirm.org.id)
        : ENDPOINTS.SA_ORG_VERIFY(confirm.org.id);
      await apiAction(path, 'POST');
      toast.success(`Organization ${confirm.action}d successfully`);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setWorking(false);
      setConfirm(null);
    }
  }

  const orgs = data?.results ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Organizations</h2>
          {data && <p className="text-sm text-gray-400 mt-0.5">{data.count} total</p>}
        </div>
      </div>

      {loading ? <ShimmerRows count={6} /> : !orgs.length ? (
        <EmptyState title="No organizations" description="No organizations have been registered yet." />
      ) : (
        <TableWrap>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr><Th>Organization</Th><Th>Status</Th><Th>Verified</Th><Th>Staff</Th><Th>Patients</Th><Th>Created</Th><Th>Actions</Th></tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {orgs.map(org => (
              <tr key={org.id} className="hover:bg-gray-50/60 transition-colors">
                <Td>
                  <div className="font-medium text-gray-900">{org.name}</div>
                  <div className="text-xs text-gray-400 font-mono">{org.slug}</div>
                </Td>
                <Td><StatusBadge status={org.is_active ? 'ACTIVE' : 'SUSPENDED'} /></Td>
                <Td>
                  {org.is_verified
                    ? <span className="text-xs font-medium text-emerald-600">✓ Verified</span>
                    : <span className="text-xs text-amber-600">Pending</span>}
                </Td>
                <Td className="tabular-nums">{org.total_staff ?? '—'}</Td>
                <Td className="tabular-nums">{org.total_patients ?? '—'}</Td>
                <Td className="text-xs text-gray-400 whitespace-nowrap">{formatDate(org.created_at)}</Td>
                <Td>
                  <div className="flex items-center gap-3">
                    {!org.is_verified && (
                      <button onClick={() => setConfirm({ org, action: 'verify' })} className="text-xs font-medium text-blue-600 hover:text-blue-800">Verify</button>
                    )}
                    {org.is_active
                      ? <button onClick={() => setConfirm({ org, action: 'suspend' })} className="text-xs font-medium text-red-600 hover:text-red-800">Suspend</button>
                      : <button onClick={() => setConfirm({ org, action: 'activate' })} className="text-xs font-medium text-emerald-600 hover:text-emerald-800">Activate</button>
                    }
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={runAction}
        loading={working}
        title={`${confirm?.action === 'verify' ? 'Verify' : confirm?.action === 'suspend' ? 'Suspend' : 'Activate'} Organization`}
        description={`Are you sure you want to ${confirm?.action} "${confirm?.org.name}"?`}
        confirmLabel={confirm?.action === 'suspend' ? 'Suspend' : confirm?.action === 'activate' ? 'Activate' : 'Verify'}
        confirmVariant={confirm?.action === 'suspend' ? 'danger' : 'primary'}
      />
    </div>
  );
}

// ─── Users page ───────────────────────────────────────────────────

function UsersPage() {
  const { data, loading } = useApi<Paginated<StaffMember>>(ENDPOINTS.SA_USERS);
  const users = data?.results ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">All Users</h2>
        {data && <p className="text-sm text-gray-400 mt-0.5">{data.count} registered</p>}
      </div>
      {loading ? <ShimmerRows count={8} /> : !users.length ? (
        <EmptyState title="No users" description="No users registered yet." />
      ) : (
        <TableWrap>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr><Th>User</Th><Th>Role</Th><Th>Status</Th><Th>Joined</Th></tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                <Td>
                  <div className="flex items-center gap-2.5">
                    <Avatar firstName={u.first_name} lastName={u.last_name} size="sm" />
                    <div>
                      <div className="font-medium text-gray-900">{u.first_name} {u.last_name}</div>
                      <div className="text-xs text-gray-400">{u.email}</div>
                    </div>
                  </div>
                </Td>
                <Td><span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">{u.role.replace('_', ' ')}</span></Td>
                <Td><StatusBadge status={u.is_active ? 'ACTIVE' : 'INACTIVE'} /></Td>
                <Td className="text-xs text-gray-400 whitespace-nowrap">{formatDate(u.date_joined)}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </div>
  );
}

// ─── Audit Logs page ──────────────────────────────────────────────

function AuditPage() {
  const { data, loading } = useApi<Paginated<ActivityItem>>(ENDPOINTS.SA_AUDIT);
  const logs = data?.results ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Audit Logs</h2>
        {data && <p className="text-sm text-gray-400 mt-0.5">{data.count} entries</p>}
      </div>
      {loading ? <ShimmerRows count={10} /> : !logs.length ? (
        <EmptyState title="No audit logs" description="System activity will be logged here." />
      ) : (
        <TableWrap>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr><Th>Event</Th><Th>Performed By</Th><Th>Time</Th></tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {logs.map(log => (
              <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                <Td className="max-w-sm">
                  <p className="text-sm text-gray-700">{truncate(log.description ?? log.action ?? '—', 80)}</p>
                </Td>
                <Td className="text-xs text-gray-500">{log.performed_by ?? log.user ?? 'System'}</Td>
                <Td className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(log.created_at ?? log.timestamp)}</Td>
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
  organizations: 'Organizations',
  users: 'All Users',
  audit: 'Audit Logs',
};

interface Props {
  user: User;
  initialStats: SuperadminStats | null;
}

export function SuperadminDashboard({ user, initialStats }: Props) {
  const [page, setPage] = useState('overview');

  return (
    <DashboardShell
      navItems={NAV}
      activePage={page}
      onPageChange={setPage}
      user={user}
      pageTitle={PAGE_TITLES[page]}
    >
      {page === 'overview'      && <OverviewPage stats={initialStats} onNavigate={setPage} />}
      {page === 'organizations' && <OrgsPage />}
      {page === 'users'         && <UsersPage />}
      {page === 'audit'         && <AuditPage />}
    </DashboardShell>
  );
}