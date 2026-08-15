'use client';

import { useState, useEffect } from 'react';
import { DashboardShell, type NavItem } from '@/components/layout/DashboardShell';
import { StatCard } from '@/components/dashboard/StatCard';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { SlidePanel } from '@/components/ui/SlidePanel';
import { useApi, apiAction, usePaginatedList } from '@/hooks/use-api';
import { useToast } from '@/store/toast';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { formatDate, timeAgo, truncate } from '@/lib/utils';
import { ENDPOINTS } from '@/lib/config';
import type { User } from '@/types/auth';
import type {
  SuperadminStats, OrgSummary, OrganizationInput, StaffMember, UserCreateInput,
  ActivityItem, Paginated,
} from '@/types/dashboard';

// ─── Icons ───────────────────────────────────────────────────────

function GridIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>;
}
function BuildingIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11" /></svg>;
}
function UsersIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
}
function ClipboardIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>;
}
function RecordsIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>;
}
function BillingIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>;
}
function MessagesIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
}
function SettingsIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
}
function PlusIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
}
function SendIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>;
}
function SearchIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
}

// ─── Nav ─────────────────────────────────────────────────────────
// Records/Billing/Messages/Settings are "Soon" — no backend surface yet
// (design_handoff_dashboards/README.md roadmap items).

const NAV: NavItem[] = [
  { id: 'overview', label: 'Dashboard', icon: <GridIcon />, section: 'Main' },
  { id: 'organizations', label: 'Organisations', icon: <BuildingIcon /> },
  { id: 'users', label: 'Users', icon: <UsersIcon /> },
  { id: 'audit', label: 'Audit Logs', icon: <ClipboardIcon /> },
  { id: 'records', label: 'Records', icon: <RecordsIcon />, section: 'Platform', soon: true },
  { id: 'billing', label: 'Billing', icon: <BillingIcon />, soon: true },
  { id: 'messages', label: 'Messages', icon: <MessagesIcon />, soon: true },
  { id: 'settings', label: 'Settings', icon: <SettingsIcon />, section: 'System', soon: true },
];

// ─── Shared form field styling ──────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 mb-4">
      <span className="text-xs font-semibold text-text-mid">{label}</span>
      {children}
    </label>
  );
}
const inputClass = 'h-[42px] border-[1.5px] border-border rounded-lg px-3.5 text-[13px] text-ink bg-page outline-none w-full focus:border-primary focus:bg-white transition-colors';

// ─── Search input (debounced) ───────────────────────────────────

function useDebouncedValue(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative w-[260px]">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-placeholder [&>svg]:w-[14px] [&>svg]:h-[14px]">
        <SearchIcon />
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full bg-white border-[1.5px] border-border rounded-lg pl-8 pr-3 text-[12.5px] text-ink outline-none focus:border-primary"
      />
    </div>
  );
}

// ─── Overview page ────────────────────────────────────────────────

function OverviewPage({
  stats, onNavigate,
}: { stats: SuperadminStats | null; onNavigate: (p: string) => void }) {
  const { data: activity, loading: actLoading, error: actError, refetch: actRefetch } =
    useApi<{ results?: ActivityItem[] } | ActivityItem[]>(ENDPOINTS.SA_ACTIVITY);
  const { data: orgsData, loading: orgsLoading, error: orgsError, refetch: orgsRefetch } =
    useApi<Paginated<OrgSummary>>(ENDPOINTS.SA_ORGS + '?page_size=5');

  const activityList = Array.isArray(activity)
    ? activity.slice(0, 8)
    : (activity as { results?: ActivityItem[] } | null)?.results?.slice(0, 8) ?? [];
  const recentOrgs = orgsData?.results ?? [];

  const activityColumns: DataTableColumn<ActivityItem>[] = [
    { key: 'event', header: 'Event', render: (r) => <span className="text-[12.5px] text-text-mid">{truncate(r.description ?? r.action ?? 'System event', 70)}</span> },
    { key: 'by', header: 'Performed By', render: (r) => r.performed_by ?? r.user ?? 'System' },
    { key: 'time', header: 'Time', className: 'whitespace-nowrap', render: (r) => timeAgo(r.created_at ?? r.timestamp) },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard loading={!stats} label="Total Users" value={stats?.total_users} icon={<UsersIcon />} color="purple" />
        <StatCard loading={!stats} label="Organisations" value={stats?.total_organizations} icon={<BuildingIcon />} color="blue" />
        <StatCard loading={!stats} label="Active Orgs" value={stats?.active_organizations} icon={<ChartCheckIcon />} color="green" />
        <StatCard loading={!stats} label="Total Patients" value={stats?.total_patients} icon={<UsersIcon />} color="amber" />
      </div>

      <div className="rounded-card border border-border bg-white shadow-dash-card p-5">
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-[13.5px] font-bold text-ink">Recent Organisations</h2>
          <button onClick={() => onNavigate('organizations')} className="text-[11.5px] font-semibold text-primary hover:underline">View all</button>
        </div>
        <DataTable
          columns={[
            { key: 'name', header: 'Organisation', render: (o: OrgSummary) => (
              <div>
                <div className="text-[13px] font-semibold text-ink">{o.name}</div>
                <div className="text-[11px] text-text-soft font-mono">{o.slug}</div>
              </div>
            ) },
            { key: 'status', header: 'Status', render: (o: OrgSummary) => <StatusBadge status={o.is_active ? 'ACTIVE' : 'SUSPENDED'} /> },
            { key: 'created', header: 'Created', className: 'whitespace-nowrap', render: (o: OrgSummary) => <span className="text-xs text-text-soft">{formatDate(o.created_at)}</span> },
          ]}
          data={recentOrgs}
          getRowKey={(o) => o.id}
          loading={orgsLoading}
          error={orgsError}
          onRetry={orgsRefetch}
          emptyTitle="No organisations"
          emptyDescription="None registered yet."
        />
      </div>

      <div className="rounded-card border border-border bg-white shadow-dash-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-[13.5px] font-bold text-ink">Recent Activity</h2>
          <button onClick={() => onNavigate('audit')} className="text-[11.5px] font-semibold text-primary hover:underline">View audit logs</button>
        </div>
        <DataTable
          columns={activityColumns}
          data={activityList}
          getRowKey={(r) => r.id}
          loading={actLoading}
          error={actError}
          onRetry={actRefetch}
          emptyTitle="No recent activity"
          emptyDescription="System activity will appear here."
        />
      </div>
    </div>
  );
}

function ChartCheckIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>;
}

// ─── Organisations page ───────────────────────────────────────────

const ORG_TYPE_LABEL: Record<string, string> = {
  HOSPITAL: 'Hospital', CLINIC: 'Clinic', SCHOOL_CLINIC: 'School Clinic',
};

const EMPTY_ORG_FORM: OrganizationInput = {
  name: '', org_type: 'CLINIC', email: '', phone: '', address: '', city: '', state: '', country_code: 'NG', country_name: 'Nigeria',
};

function OrgsPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);
  const endpoint = ENDPOINTS.SA_ORGS + (debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : '');
  const { items: orgs, count, page, setPage, totalPages, loading, error, refetch } =
    usePaginatedList<OrgSummary>(endpoint);
  useEffect(() => { setPage(1); }, [debouncedSearch, setPage]);

  const { toast } = useToast();
  const [confirm, setConfirm] = useState<{ org: OrgSummary; action: 'suspend' | 'activate' | 'verify' } | null>(null);
  const [working, setWorking] = useState(false);
  const [formPanel, setFormPanel] = useState<{ mode: 'add' } | { mode: 'edit'; org: OrgSummary } | null>(null);
  const [form, setForm] = useState<OrganizationInput>(EMPTY_ORG_FORM);
  const [saving, setSaving] = useState(false);

  function openAdd() {
    setForm(EMPTY_ORG_FORM);
    setFormPanel({ mode: 'add' });
  }
  function openEdit(org: OrgSummary) {
    setForm({
      name: org.name, org_type: org.org_type, email: org.email, phone: org.phone ?? '',
      address: '', city: org.city, state: org.state, country_code: 'NG', country_name: org.country_name,
    });
    setFormPanel({ mode: 'edit', org });
  }

  async function submitForm() {
    if (!form.name || !form.email || !form.address || !form.city || !form.state || !form.country_name) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      if (formPanel?.mode === 'edit') {
        await apiAction(ENDPOINTS.SA_ORG(formPanel.org.id), 'PUT', form);
        toast.success('Organisation updated');
      } else {
        await apiAction(ENDPOINTS.SA_ORGS, 'POST', form);
        toast.success('Organisation created');
      }
      setFormPanel(null);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save organisation');
    } finally {
      setSaving(false);
    }
  }

  async function runAction() {
    if (!confirm) return;
    setWorking(true);
    try {
      const path =
        confirm.action === 'suspend' ? ENDPOINTS.SA_ORG_SUSPEND(confirm.org.id)
        : confirm.action === 'activate' ? ENDPOINTS.SA_ORG_ACTIVATE(confirm.org.id)
        : ENDPOINTS.SA_ORG_VERIFY(confirm.org.id);
      await apiAction(path, 'POST');
      toast.success(`Organisation ${confirm.action}d successfully`);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setWorking(false);
      setConfirm(null);
    }
  }

  const columns: DataTableColumn<OrgSummary>[] = [
    { key: 'name', header: 'Organisation', render: (org) => (
      <div className="flex items-center gap-2.5">
        <Avatar firstName={org.name} lastName="" size="sm" />
        <div>
          <div className="text-[13px] font-semibold text-ink">{org.name}</div>
          <div className="text-[11px] text-text-soft font-mono">{org.slug}</div>
        </div>
      </div>
    ) },
    { key: 'type', header: 'Type', render: (org) => <StatusBadge status={org.org_type} label={ORG_TYPE_LABEL[org.org_type] ?? org.org_type} /> },
    { key: 'status', header: 'Status', render: (org) => <StatusBadge status={org.is_active ? 'ACTIVE' : 'SUSPENDED'} /> },
    { key: 'verified', header: 'Verified', render: (org) => <StatusBadge status={org.is_verified ? 'VERIFIED' : 'PENDING'} label={org.is_verified ? 'Verified' : 'Pending'} /> },
    { key: 'staff', header: 'Staff', className: 'tabular-nums', render: (org) => org.total_staff ?? '—' },
    { key: 'created', header: 'Date Added', className: 'whitespace-nowrap', render: (org) => <span className="text-xs text-text-soft">{formatDate(org.created_at)}</span> },
    { key: 'actions', header: 'Actions', render: (org) => (
      <div className="flex items-center gap-1.5">
        <button onClick={() => openEdit(org)} className="border border-border rounded-md px-2.5 py-1 text-[11.5px] font-semibold text-text-mid hover:border-primary hover:text-primary hover:bg-chip transition-colors">View</button>
        {!org.is_verified && (
          <button onClick={() => setConfirm({ org, action: 'verify' })} className="border border-border rounded-md px-2.5 py-1 text-[11.5px] font-semibold text-primary hover:bg-chip transition-colors">Verify</button>
        )}
        {org.is_active
          ? <button onClick={() => setConfirm({ org, action: 'suspend' })} className="border border-border rounded-md px-2.5 py-1 text-[11.5px] font-semibold text-danger hover:bg-danger-bg transition-colors">Suspend</button>
          : <button onClick={() => setConfirm({ org, action: 'activate' })} className="border border-border rounded-md px-2.5 py-1 text-[11.5px] font-semibold text-success hover:bg-success-bg transition-colors">Activate</button>}
      </div>
    ) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-body font-black text-[22px] text-ink">Organisations</h2>
          <p className="text-[13px] text-text-soft mt-0.5">Manage all hospitals, clinics and facilities on HealthClouda</p>
        </div>
        <Button onClick={openAdd} className="gap-1.5">
          <PlusIcon />
          Add Organisation
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={orgs}
        getRowKey={(o) => o.id}
        loading={loading}
        error={error}
        onRetry={refetch}
        emptyTitle="No organisations found"
        emptyDescription={search ? 'Try adjusting your search.' : 'No organisations have been registered yet.'}
        toolbar={<SearchInput value={search} onChange={setSearch} placeholder="Search by name or slug…" />}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalCount={count}
        pageSize={20}
      />

      <SlidePanel
        open={!!formPanel}
        onClose={() => setFormPanel(null)}
        title={formPanel?.mode === 'edit' ? 'Edit Organisation' : 'Add Organisation'}
        subtitle={formPanel?.mode === 'edit' ? formPanel.org.name : 'Register a new facility on HealthClouda'}
        footer={
          <>
            <Button variant="secondary" className="flex-1" onClick={() => setFormPanel(null)} disabled={saving}>Cancel</Button>
            <Button className="flex-1" onClick={submitForm} loading={saving}>{formPanel?.mode === 'edit' ? 'Save Changes' : 'Add Organisation'}</Button>
          </>
        }
      >
        <Field label="Organisation Name *">
          <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Type *">
          <select className={inputClass} value={form.org_type} onChange={(e) => setForm({ ...form, org_type: e.target.value })}>
            <option value="HOSPITAL">Hospital</option>
            <option value="CLINIC">Clinic</option>
            <option value="SCHOOL_CLINIC">School Clinic</option>
          </select>
        </Field>
        <Field label="Email *">
          <input type="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Phone">
          <input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label="Address *">
          <input className={inputClass} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="City *">
            <input className={inputClass} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </Field>
          <Field label="State *">
            <input className={inputClass} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          </Field>
        </div>
        <Field label="Country *">
          <input className={inputClass} value={form.country_name} onChange={(e) => setForm({ ...form, country_name: e.target.value })} />
        </Field>
      </SlidePanel>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={runAction}
        loading={working}
        title={`${confirm?.action === 'verify' ? 'Verify' : confirm?.action === 'suspend' ? 'Suspend' : 'Activate'} Organisation`}
        description={`Are you sure you want to ${confirm?.action} "${confirm?.org.name}"?`}
        confirmLabel={confirm?.action === 'suspend' ? 'Suspend' : confirm?.action === 'activate' ? 'Activate' : 'Verify'}
        confirmVariant={confirm?.action === 'suspend' ? 'danger' : 'primary'}
      />
    </div>
  );
}

// ─── Users page ───────────────────────────────────────────────────

const EMPTY_USER_FORM: UserCreateInput = { email: '', first_name: '', last_name: '', role: '', phone: '', organization: '' };

function UsersPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);
  const endpoint = ENDPOINTS.SA_USERS + (debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : '');
  const { items: users, count, page, setPage, totalPages, loading, error, refetch } =
    usePaginatedList<StaffMember>(endpoint);
  useEffect(() => { setPage(1); }, [debouncedSearch, setPage]);

  const { toast } = useToast();
  const [confirm, setConfirm] = useState<{ user: StaffMember; action: 'suspend' | 'activate' } | null>(null);
  const [working, setWorking] = useState(false);
  const [invitePanel, setInvitePanel] = useState(false);
  const [form, setForm] = useState<UserCreateInput>(EMPTY_USER_FORM);
  const [saving, setSaving] = useState(false);
  const [justResent, setJustResent] = useState<Set<string>>(new Set());

  const { data: orgOptions } = useApi<Paginated<OrgSummary>>(invitePanel ? ENDPOINTS.SA_ORGS + '?page_size=100' : null);

  function openInvite() {
    setForm(EMPTY_USER_FORM);
    setInvitePanel(true);
  }

  async function submitInvite() {
    if (!form.email || !form.first_name || !form.last_name || !form.role) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (form.role !== 'SUPERADMIN' && !form.organization) {
      toast.error('Please select an organisation');
      return;
    }
    setSaving(true);
    try {
      const body: UserCreateInput = { ...form };
      if (form.role === 'SUPERADMIN') delete body.organization;
      await apiAction(ENDPOINTS.SA_USERS, 'POST', body);
      toast.success('Invitation sent');
      setInvitePanel(false);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not send invitation');
    } finally {
      setSaving(false);
    }
  }

  async function runAction() {
    if (!confirm) return;
    setWorking(true);
    try {
      if (confirm.action === 'suspend') {
        await apiAction(ENDPOINTS.SA_USER(confirm.user.id), 'DELETE');
        toast.success('User suspended');
      } else {
        await apiAction(ENDPOINTS.SA_USER_ACTIVATE(confirm.user.id), 'POST');
        toast.success('User activated');
      }
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setWorking(false);
      setConfirm(null);
    }
  }

  async function resend(u: StaffMember) {
    try {
      await apiAction(ENDPOINTS.SA_USER_RESEND_SETUP(u.id), 'POST');
      toast.success('Setup email resent');
      setJustResent((s) => new Set(s).add(u.id));
      setTimeout(() => setJustResent((s) => { const n = new Set(s); n.delete(u.id); return n; }), 6000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not resend');
    }
  }

  const columns: DataTableColumn<StaffMember>[] = [
    { key: 'user', header: 'User', render: (u) => (
      <div className="flex items-center gap-2.5">
        <Avatar firstName={u.first_name} lastName={u.last_name} size="sm" />
        <div>
          <div className="text-[13px] font-semibold text-ink">{u.first_name} {u.last_name}</div>
          <div className="text-[11px] text-text-soft">{u.email}</div>
        </div>
      </div>
    ) },
    { key: 'role', header: 'Role', render: (u) => (
      <span className="inline-flex items-center px-[11px] py-[3px] rounded-full text-[11px] font-bold bg-chip text-primary">
        {u.role.replace('_', ' ')}
      </span>
    ) },
    { key: 'org', header: 'Organisation', render: (u) => u.organization?.name ?? '—' },
    { key: 'status', header: 'Status', render: (u) => (
      u.last_login == null
        ? <StatusBadge status="PENDING" label="Invite pending" />
        : <StatusBadge status={u.is_active ? 'ACTIVE' : 'INACTIVE'} />
    ) },
    { key: 'joined', header: 'Joined', className: 'whitespace-nowrap', render: (u) => <span className="text-xs text-text-soft">{u.date_joined ? formatDate(u.date_joined) : '—'}</span> },
    { key: 'actions', header: 'Actions', render: (u) => (
      <div className="flex items-center gap-1.5">
        {u.last_login == null && (
          <button onClick={() => resend(u)} className="border border-border rounded-md px-2.5 py-1 text-[11.5px] font-semibold text-primary hover:bg-chip transition-colors whitespace-nowrap">
            {justResent.has(u.id) ? 'Invite sent ✓' : 'Resend'}
          </button>
        )}
        {u.is_active
          ? <button onClick={() => setConfirm({ user: u, action: 'suspend' })} className="border border-border rounded-md px-2.5 py-1 text-[11.5px] font-semibold text-danger hover:bg-danger-bg transition-colors">Suspend</button>
          : <button onClick={() => setConfirm({ user: u, action: 'activate' })} className="border border-border rounded-md px-2.5 py-1 text-[11.5px] font-semibold text-success hover:bg-success-bg transition-colors">Activate</button>}
      </div>
    ) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-body font-black text-[22px] text-ink">Users</h2>
          <p className="text-[13px] text-text-soft mt-0.5">All registered staff and patients across HealthClouda</p>
        </div>
        <Button onClick={openInvite} className="gap-1.5">
          <PlusIcon />
          Invite User
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={users}
        getRowKey={(u) => u.id}
        loading={loading}
        error={error}
        onRetry={refetch}
        emptyTitle="No users found"
        emptyDescription={search ? 'Try adjusting your search.' : 'No users registered yet.'}
        toolbar={<SearchInput value={search} onChange={setSearch} placeholder="Search by name or email…" />}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalCount={count}
        pageSize={20}
      />

      <SlidePanel
        open={invitePanel}
        onClose={() => setInvitePanel(false)}
        title="Invite User"
        subtitle="Add a new staff member to an organisation"
        footer={
          <>
            <Button variant="secondary" className="flex-1" onClick={() => setInvitePanel(false)} disabled={saving}>Cancel</Button>
            <Button className="flex-1 gap-1.5" onClick={submitInvite} loading={saving}>
              <SendIcon />
              Send Invitation
            </Button>
          </>
        }
      >
        <div className="flex gap-2.5 items-start bg-chip border-[1.5px] border-primary/30 rounded-lg p-3.5 mb-5">
          <p className="text-xs text-primary leading-relaxed">
            No password needed: they will receive an email with a secure link to set their own password.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="First Name *">
            <input className={inputClass} value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          </Field>
          <Field label="Last Name *">
            <input className={inputClass} value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          </Field>
        </div>
        <Field label="Email *">
          <input type="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Role *">
          <select className={inputClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="">Select role…</option>
            <option value="ORGANIZATION_ADMIN">Org Admin</option>
            <option value="DOCTOR">Doctor</option>
            <option value="NURSE">Nurse</option>
            <option value="RECEPTIONIST">Receptionist</option>
            <option value="SUPERADMIN">Super Admin (platform)</option>
          </select>
        </Field>
        {form.role === 'SUPERADMIN' && (
          <div className="flex gap-2.5 items-start bg-danger-bg border-[1.5px] border-danger/30 rounded-lg p-3.5 mb-4">
            <p className="text-xs text-danger leading-relaxed">
              <b>Full platform access.</b> A Super Admin can manage every organisation, user and setting on HealthClouda. This invitation is recorded in the audit log.
            </p>
          </div>
        )}
        {form.role && form.role !== 'SUPERADMIN' && (
          <Field label="Organisation *">
            <select className={inputClass} value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })}>
              <option value="">Select organisation…</option>
              {orgOptions?.results.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </Field>
        )}
        <Field label="Phone">
          <input className={inputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
      </SlidePanel>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={runAction}
        loading={working}
        title={confirm?.action === 'suspend' ? 'Suspend User' : 'Activate User'}
        description={`Are you sure you want to ${confirm?.action} ${confirm?.user.first_name} ${confirm?.user.last_name}?`}
        confirmLabel={confirm?.action === 'suspend' ? 'Suspend' : 'Activate'}
        confirmVariant={confirm?.action === 'suspend' ? 'danger' : 'primary'}
      />
    </div>
  );
}

// ─── Audit Logs page ──────────────────────────────────────────────

function AuditPage() {
  const { items: logs, count, page, setPage, totalPages, loading, error, refetch } =
    usePaginatedList<ActivityItem>(ENDPOINTS.SA_AUDIT);

  const columns: DataTableColumn<ActivityItem>[] = [
    { key: 'event', header: 'Event', className: 'max-w-sm', render: (log) => <span className="text-[12.5px] text-text-mid">{truncate(log.description ?? log.action ?? '—', 80)}</span> },
    { key: 'by', header: 'Performed By', render: (log) => <span className="text-xs text-text-soft">{log.performed_by ?? log.user ?? 'System'}</span> },
    { key: 'time', header: 'Time', className: 'whitespace-nowrap', render: (log) => <span className="text-xs text-text-soft">{timeAgo(log.created_at ?? log.timestamp)}</span> },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-body font-black text-[22px] text-ink">Audit Logs</h2>
        <p className="text-[13px] text-text-soft mt-0.5">{count > 0 ? `${count} entries` : 'System activity log'}</p>
      </div>
      <DataTable
        columns={columns}
        data={logs}
        getRowKey={(log) => log.id}
        loading={loading}
        error={error}
        onRetry={refetch}
        emptyTitle="No audit logs"
        emptyDescription="System activity will be logged here."
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalCount={count}
        pageSize={20}
      />
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────

const PAGE_TITLES: Record<string, string> = {
  overview: 'Dashboard',
  organizations: 'Organisations',
  users: 'Users',
  audit: 'Audit Logs',
};

interface Props {
  user: User;
  initialStats: SuperadminStats | null;
}

export function SuperadminDashboard({ user, initialStats }: Props) {
  const [page, setPage] = useState('overview');
  // AUTH-6: server render can't refresh an expired session — fall back to a
  // client-side stats fetch instead of shimmering forever.
  const { data: fetchedStats } = useApi<SuperadminStats>(initialStats ? null : ENDPOINTS.SA_STATS);
  const stats = initialStats ?? fetchedStats;

  return (
    <DashboardShell
      navItems={NAV}
      activePage={page}
      onPageChange={setPage}
      user={user}
      pageTitle={PAGE_TITLES[page]}
    >
      {page === 'overview'      && <OverviewPage stats={stats} onNavigate={setPage} />}
      {page === 'organizations' && <OrgsPage />}
      {page === 'users'         && <UsersPage />}
      {page === 'audit'         && <AuditPage />}
    </DashboardShell>
  );
}
