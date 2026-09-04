'use client';

import { useState } from 'react';
import { DashboardShell, type NavItem } from '@/components/layout/DashboardShell';
import { StatCard } from '@/components/dashboard/StatCard';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { SlidePanel } from '@/components/ui/SlidePanel';
import { SearchInput } from '@/components/ui/SearchInput';
import { FormField, formInputClass } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { useApi, apiAction, usePaginatedList } from '@/hooks/use-api';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useToast } from '@/store/toast';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Avatar } from '@/components/ui/Avatar';
import { formatDate, roleLabel, splitName, truncate } from '@/lib/utils';
import { ENDPOINTS } from '@/lib/config';
import type { User } from '@/types/auth';
import type {
  OrgAdminStats, OrgStaffMember, StaffInviteInput, OrgPatientSummary, Ward, AccessRequest, Paginated,
  OrgReferral, ReferralResponseInput,
} from '@/types/dashboard';

// ─── Icons ───────────────────────────────────────────────────────

function GridIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>; }
function UsersIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>; }
function UserIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>; }
function BedIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>; }
function KeyIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" /></svg>; }
function DocIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>; }
function RecordsIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>; }
function SettingsIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>; }
function PlusIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>; }
function SendIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>; }

// ─── Nav ─────────────────────────────────────────────────────────
// Notifications/Settings are "Soon" — not built today (D2 scope is staff
// invite + read-only access requests, per docs/FRONTEND_SPRINT_PLAN.md).

const NAV: NavItem[] = [
  { id: 'overview',         label: 'Dashboard',       icon: <GridIcon />, section: 'Main' },
  { id: 'staff',            label: 'Staff',           icon: <UsersIcon /> },
  { id: 'patients',         label: 'Patients',        icon: <UserIcon /> },
  { id: 'wards',            label: 'Wards & Beds',    icon: <BedIcon /> },
  { id: 'access-requests',  label: 'Access Requests', icon: <KeyIcon /> },
  { id: 'referrals',        label: 'Referrals',       icon: <DocIcon /> },
  { id: 'notifications',    label: 'Notifications',   icon: <RecordsIcon />, section: 'Platform', soon: true },
  { id: 'settings',         label: 'Settings',        icon: <SettingsIcon />, section: 'System', soon: true },
];

// ─── Overview ────────────────────────────────────────────────────

function OverviewPage({ stats, onNavigate }: { stats: OrgAdminStats | null; onNavigate: (p: string) => void }) {
  const { data: accessData, loading: arLoading, error: arError, refetch: arRefetch } =
    useApi<Paginated<AccessRequest>>(ENDPOINTS.ORG_ADMIN_ACCESS_REQUESTS + '?status=PENDING&page_size=5');
  const pending = accessData?.results ?? [];

  const columns: DataTableColumn<AccessRequest>[] = [
    { key: 'patient', header: 'Patient', render: (ar) => <span className="text-[13px] font-semibold text-ink">{ar.patient_name ?? (ar.patient ? `${ar.patient.first_name} ${ar.patient.last_name}` : '—')}</span> },
    { key: 'by', header: 'Requested By', render: (ar) => <span className="text-xs text-text-soft">{ar.staff_name ?? '—'}</span> },
    { key: 'reason', header: 'Reason', className: 'max-w-xs', render: (ar) => <span className="text-xs text-text-soft">{truncate(ar.reason ?? '—', 50)}</span> },
    { key: 'date', header: 'Date', className: 'whitespace-nowrap', render: (ar) => <span className="text-xs text-text-soft">{formatDate(ar.created_at)}</span> },
    { key: 'status', header: 'Status', render: (ar) => <StatusBadge status={ar.status} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Fields captured live 2026-08-19. `total_patients` and
            `active_episodes` were not in the payload and rendered '—' on every
            load; `bed_occupancy` arrives as the string "2/7". */}
        <StatCard loading={!stats} label="Total Staff" value={stats?.total_staff} icon={<UsersIcon />} color="purple" />
        <StatCard loading={!stats} label="Active Patients" value={stats?.active_patients} icon={<UserIcon />} color="blue" />
        <StatCard loading={!stats} label="Bed Occupancy" value={stats?.bed_occupancy} icon={<DocIcon />} color="amber" />
        <StatCard loading={!stats} label="Pending Access" value={stats?.pending_access_requests} icon={<KeyIcon />} color="red" onClick={stats?.pending_access_requests ? () => onNavigate('access-requests') : undefined} />
      </div>

      <div className="rounded-card border border-border bg-white shadow-dash-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-[13.5px] font-bold text-ink">Pending Access Requests</h2>
          <button onClick={() => onNavigate('access-requests')} className="text-[11.5px] font-semibold text-primary hover:underline">View all</button>
        </div>
        <DataTable
          columns={columns}
          data={pending}
          getRowKey={(ar) => ar.id}
          loading={arLoading}
          error={arError}
          onRetry={arRefetch}
          emptyTitle="All clear"
          emptyDescription="No pending access requests."
        />
      </div>
    </div>
  );
}

// ─── Staff page ───────────────────────────────────────────────────

const STAFF_ROLES = [
  { value: 'doctor', label: 'Doctor' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'receptionist', label: 'Receptionist' },
] as const;

const EMPTY_INVITE: StaffInviteInput = { full_name: '', email: '', role: 'doctor', phone: '' };

function StaffPage() {
  const { items: staff, count, page, setPage, totalPages, loading, error, refetch } =
    usePaginatedList<OrgStaffMember>(ENDPOINTS.ORG_ADMIN_STAFF);
  const { toast } = useToast();
  const [invitePanel, setInvitePanel] = useState(false);
  const [form, setForm] = useState<StaffInviteInput>(EMPTY_INVITE);
  const [saving, setSaving] = useState(false);

  async function submitInvite() {
    if (!form.full_name || !form.email || !form.role) {
      toast.error('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      // Omit `phone` rather than sending '' when untouched — same as the
      // Superadmin invite. The body shape is undocumented (FLAG-207), so an
      // empty string could fail phone-format validation and 400 the whole
      // invite for a field the admin never filled in.
      const body = { ...form };
      if (!body.phone) delete body.phone;
      await apiAction(ENDPOINTS.ORG_ADMIN_STAFF, 'POST', body);
      toast.success('Invitation sent');
      setInvitePanel(false);
      setForm(EMPTY_INVITE);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not send invitation');
    } finally {
      setSaving(false);
    }
  }

  const columns: DataTableColumn<OrgStaffMember>[] = [
    { key: 'member', header: 'Member', render: (s) => (
      <div className="flex items-center gap-2.5">
        <Avatar {...splitName(s.full_name)} size="sm" />
        <div>
          <div className="text-[13px] font-semibold text-ink">{s.full_name}</div>
          <div className="text-[11px] text-text-soft">{s.email}</div>
        </div>
      </div>
    ) },
    { key: 'role', header: 'Role', render: (s) => (
      <span className="inline-flex items-center px-[11px] py-[3px] rounded-full text-[11px] font-bold bg-chip text-primary">
        {roleLabel(s.role)}
      </span>
    ) },
    { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.is_active ? 'ACTIVE' : 'INACTIVE'} /> },
    // Was: Duty (`is_on_duty`) and Joined (`date_joined`). Neither field is on
    // /org-admin/staff/, so Duty rendered nothing at all and Joined rendered
    // '—' on every row. Replaced with `phone`, which the endpoint does return.
    // If on-duty status is wanted here it needs an `api-request`, not a column.
    { key: 'phone', header: 'Phone', render: (s) => <span className="text-xs text-text-soft">{s.phone ?? '—'}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-body font-black text-[22px] text-ink">Staff</h2>
          <p className="text-[13px] text-text-soft mt-0.5">Doctors, nurses and receptionists at this organisation</p>
        </div>
        <Button onClick={() => setInvitePanel(true)} className="gap-1.5">
          <PlusIcon />
          Invite Staff
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={staff}
        getRowKey={(s) => s.id}
        loading={loading}
        error={error}
        onRetry={refetch}
        emptyTitle="No staff members"
        emptyDescription="No staff have been added to this organisation."
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalCount={count}
        pageSize={20}
      />

      <SlidePanel
        open={invitePanel}
        onClose={() => setInvitePanel(false)}
        title="Invite Staff"
        subtitle="Add a new staff member to your organisation"
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
        <FormField label="Full Name *">
          <input className={formInputClass} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </FormField>
        <FormField label="Email *">
          <input type="email" className={formInputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </FormField>
        <FormField label="Role *">
          <select className={formInputClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as StaffInviteInput['role'] })}>
            {STAFF_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </FormField>
        <FormField label="Phone">
          <input className={formInputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </FormField>
      </SlidePanel>
    </div>
  );
}

// ─── Patients page ────────────────────────────────────────────────

function PatientsPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);
  const endpoint = ENDPOINTS.ORG_ADMIN_PATIENTS + (debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : '');
  const { items: patients, count, page, setPage, totalPages, loading, error, refetch } =
    usePaginatedList<OrgPatientSummary>(endpoint);
  // No page-reset effect needed: `usePaginatedList` resets to page 1 itself
  // when the endpoint changes, during render rather than after it.

  // Columns match the CAPTURED payload (2026-08-19). The previous set was typed
  // as PatientSummary — the /doctor/patients/ shape — and read first_name,
  // last_name, email, phone_number, date_of_birth and created_at, none of which
  // this endpoint returns. All 14 rows rendered blank names and '—' columns.
  // healthclouda_id in particular was being returned and never shown, while the
  // search box invited people to search by it.
  const columns: DataTableColumn<OrgPatientSummary>[] = [
    { key: 'patient', header: 'Patient', render: (p) => (
      <div className="flex items-center gap-2.5">
        <Avatar {...splitName(p.full_name)} size="sm" />
        <div>
          <div className="text-[13px] font-semibold text-ink">{p.full_name}</div>
          <div className="text-[11px] text-text-soft font-mono">{p.healthclouda_id}</div>
        </div>
      </div>
    ) },
    { key: 'gender', header: 'Gender', render: (p) => <span className="text-xs text-text-soft">{p.gender ?? '—'}</span> },
    { key: 'phone', header: 'Phone', render: (p) => <span className="text-xs text-text-soft">{p.phone ?? '—'}</span> },
    { key: 'last_visit', header: 'Last Visit', className: 'whitespace-nowrap', render: (p) => <span className="text-xs text-text-soft">{p.last_visit ? formatDate(p.last_visit) : '—'}</span> },
    { key: 'status', header: 'Status', render: (p) => (p.status ? <StatusBadge status={p.status} /> : <span className="text-xs text-text-soft">—</span>) },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-body font-black text-[22px] text-ink">Patients</h2>
        <p className="text-[13px] text-text-soft mt-0.5">Everyone registered at this organisation</p>
      </div>
      <DataTable
        columns={columns}
        data={patients}
        getRowKey={(p) => p.id}
        loading={loading}
        error={error}
        onRetry={refetch}
        emptyTitle="No patients found"
        emptyDescription={search ? 'Try adjusting your search.' : 'No patients have been registered under this organisation.'}
        toolbar={<SearchInput value={search} onChange={setSearch} placeholder="Search by name, email or HCL-ID…" label="Search patients" />}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalCount={count}
        pageSize={20}
      />
    </div>
  );
}

// ─── Wards page ───────────────────────────────────────────────────

function WardsPage() {
  const { data: wards, loading, error, refetch } = useApi<Ward[] | Paginated<Ward>>(ENDPOINTS.ORG_ADMIN_WARDS_OVERVIEW);
  const wardList = Array.isArray(wards) ? wards : wards?.results ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-body font-black text-[22px] text-ink">Wards & Beds</h2>
        <p className="text-[13px] text-text-soft mt-0.5">Occupancy across every ward at this organisation</p>
      </div>
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 bg-white rounded-card border border-border animate-pulse" />)}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : !wardList.length ? (
        <EmptyState title="No wards" description="No wards have been configured for this organisation." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {wardList.map((ward) => {
            const pct = ward.total_beds > 0 ? Math.round((ward.occupied_beds / ward.total_beds) * 100) : 0;
            const barColor = pct >= 90 ? 'bg-danger' : pct >= 70 ? 'bg-warning' : 'bg-success';
            const chipColor = pct >= 90 ? 'bg-danger-bg text-danger' : pct >= 70 ? 'bg-warning-bg text-warning' : 'bg-success-bg text-success';
            return (
              <div key={ward.id} className="bg-white rounded-card border border-border shadow-dash-card p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-[13.5px] font-bold text-ink">{ward.name}</h3>
                    {ward.ward_type && <p className="text-[11px] text-text-soft mt-0.5">{ward.ward_type}</p>}
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${chipColor}`}>{pct}%</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-text-soft">
                    <span>{ward.occupied_beds} occupied</span>
                    {/* Derived: /org-admin/wards/overview/ returns no
                        available_beds, so this rendered an empty string
                        followed by the word "available". */}
                    <span>{ward.available_beds ?? ward.total_beds - ward.occupied_beds} available</span>
                  </div>
                  <div className="h-2 bg-row-hairline rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-text-soft">{ward.total_beds} beds total</p>
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
  const [status, setStatus] = useState('');
  const endpoint = ENDPOINTS.ORG_ADMIN_ACCESS_REQUESTS + (status ? `?status=${status}` : '');
  const { items: list, count, page, setPage, totalPages, loading, error, refetch } =
    usePaginatedList<AccessRequest>(endpoint);

  const columns: DataTableColumn<AccessRequest>[] = [
    { key: 'patient', header: 'Patient', render: (ar) => <span className="text-[13px] font-semibold text-ink">{ar.patient_name ?? (ar.patient ? `${ar.patient.first_name} ${ar.patient.last_name}` : '—')}</span> },
    { key: 'by', header: 'Requested By', render: (ar) => <span className="text-xs text-text-soft">{ar.staff_name ?? '—'}</span> },
    { key: 'reason', header: 'Reason', className: 'max-w-xs', render: (ar) => <span className="text-xs text-text-soft">{truncate(ar.reason ?? '—', 50)}</span> },
    { key: 'date', header: 'Date', className: 'whitespace-nowrap', render: (ar) => <span className="text-xs text-text-soft">{formatDate(ar.created_at)}</span> },
    { key: 'status', header: 'Status', render: (ar) => <StatusBadge status={ar.status} /> },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-body font-black text-[22px] text-ink">Access Requests</h2>
        <p className="text-[13px] text-text-soft mt-0.5">
          Read-only. Patients approve or deny access to their own records; an administrator cannot decide on their behalf.
        </p>
      </div>
      <DataTable
        columns={columns}
        data={list}
        getRowKey={(ar) => ar.id}
        loading={loading}
        error={error}
        onRetry={refetch}
        emptyTitle="No access requests"
        emptyDescription="Patient data access requests will appear here."
        toolbar={
          <select aria-label="Filter by request status" className={`${formInputClass} h-9 w-auto`} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="DENIED">Denied</option>
          </select>
        }
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalCount={count}
        pageSize={20}
      />
    </div>
  );
}


// ─── Referrals page (FLAG-220) ────────────────────────────────────

/**
 * Incoming referrals, and the accept/decline the product had nowhere to do.
 *
 * 🚨 Why this page exists. The backend moved referral authorisation to the
 * receiving organisation's ORGANIZATION_ADMIN around 20 Aug — "a doctor can no
 * longer self-accept", verbatim in the live schema. The Doctor dashboard is
 * read-only and must stay that way (a button there would 403 every time), and
 * Org Admin had no referrals page at all. So a referral could be created and
 * listed but never accepted, by anyone — a hole in the product rather than a
 * misplaced button (FLAG-220).
 *
 * 🪤 The endpoints are still namespaced /doctor/referrals/<id>/accept/ while
 * requiring ORG_ADMIN, so scoping work from path names gets this backwards. We
 * use the generic /referrals/<id>/accept/ twins, which carry the same rule and
 * are the fully documented ones.
 */

// Statuses observed live 2026-08-28: ACCEPTED, DECLINED. The schema documents NO
// status enum for referrals, so the name of the PENDING state is unverified.
//
// 🔴 Gate by EXCLUSION, not inclusion: anything not already resolved can be
// actioned. Listing the pending value would mean inventing an enum member — the
// exact bug class FLAG-004 was — and a wrong guess would hide the buttons on
// precisely the rows that need them, which fails silently.
const RESOLVED_STATUSES = new Set(['ACCEPTED', 'DECLINED', 'CANCELLED', 'COMPLETED']);
const isActionable = (r: OrgReferral) => !RESOLVED_STATUSES.has(r.status);

function ReferralsPage() {
  const { items: referrals, count, page, setPage, totalPages, loading, error, refetch } =
    usePaginatedList<OrgReferral>(ENDPOINTS.ORG_ADMIN_REFERRALS);
  const { toast } = useToast();
  const [responding, setResponding] = useState<{ referral: OrgReferral; action: 'accept' | 'decline' } | null>(null);
  const [form, setForm] = useState<ReferralResponseInput>({ response_notes: '' });
  const [saving, setSaving] = useState(false);

  function open(referral: OrgReferral, action: 'accept' | 'decline') {
    setForm({ response_notes: '', create_episode: action === 'accept' });
    setResponding({ referral, action });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!responding || !form.response_notes.trim() || saving) return;
    setSaving(true);
    try {
      const { referral, action } = responding;
      const endpoint = action === 'accept'
        ? ENDPOINTS.REFERRAL_ACCEPT(referral.id)
        : ENDPOINTS.REFERRAL_DECLINE(referral.id);
      // Only send the clinical fields when an episode is actually being opened:
      // they are meaningless otherwise, and response_notes is the only field the
      // schema marks required.
      const payload: ReferralResponseInput = { response_notes: form.response_notes.trim() };
      if (action === 'accept' && form.create_episode) {
        payload.create_episode = true;
        if (form.chief_complaint?.trim()) payload.chief_complaint = form.chief_complaint.trim();
        if (form.diagnosis?.trim()) payload.diagnosis = form.diagnosis.trim();
      }
      await apiAction(endpoint, 'POST', payload);
      toast.success(action === 'accept' ? 'Referral accepted' : 'Referral declined');
      setResponding(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send the response');
    } finally {
      setSaving(false);
    }
  }

  const columns: DataTableColumn<OrgReferral>[] = [
    {
      key: 'patient', header: 'Patient',
      render: (r) => (
        <div>
          <div className="text-[13px] font-semibold text-ink">{r.patient.first_name} {r.patient.last_name}</div>
          <div className="text-[11px] text-text-soft font-mono">{r.patient.healthclouda_id}</div>
        </div>
      ),
    },
    {
      key: 'from', header: 'Referred by',
      render: (r) => (
        <div>
          <div className="text-xs text-ink">{r.from_organization?.name ?? '—'}</div>
          {r.referring_doctor && (
            <div className="text-[11px] text-text-soft">
              Dr. {r.referring_doctor.full_name ?? `${r.referring_doctor.first_name} ${r.referring_doctor.last_name}`}
            </div>
          )}
        </div>
      ),
    },
    { key: 'reason', header: 'Reason', render: (r) => <span className="text-xs text-text-soft">{truncate(r.reason ?? '—', 40)}</span> },
    {
      key: 'urgency', header: 'Urgency',
      // urgency_display is prose ("Semi-Urgent - assessment within days to
      // weeks") and too long for a cell, so the raw enum reads better here with
      // the full wording kept as the tooltip.
      render: (r) => (
        <span title={r.urgency_display} className="text-xs font-medium text-ink">
          {r.urgency ? r.urgency.replace(/_/g, ' ').toLowerCase() : '—'}
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'received', header: 'Received', className: 'whitespace-nowrap', render: (r) => <span className="text-xs text-text-soft">{formatDate(r.created_at)}</span> },
    {
      key: 'actions', header: '',
      render: (r) => (
        isActionable(r) ? (
          <div className="flex gap-1.5 justify-end">
            <button onClick={() => open(r, 'accept')}
              aria-label={`Accept referral for ${r.patient.first_name} ${r.patient.last_name}`}
              className="px-2.5 py-1 text-[11.5px] font-semibold rounded-md bg-primary-dark text-white hover:opacity-90 transition-opacity">
              Accept
            </button>
            <button onClick={() => open(r, 'decline')}
              aria-label={`Decline referral for ${r.patient.first_name} ${r.patient.last_name}`}
              className="px-2.5 py-1 text-[11.5px] font-semibold rounded-md border border-border text-text-soft hover:text-ink transition-colors">
              Decline
            </button>
          </div>
        ) : (
          <span className="text-[11.5px] text-text-soft block text-right">{r.status_display ?? '—'}</span>
        )
      ),
    },
  ];

  const accepting = responding?.action === 'accept';

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-ink">Incoming referrals</h2>
        <p className="text-sm text-text-soft mt-0.5">
          Referrals sent to this organisation. Accepting or declining is an organisation admin
          decision — a doctor cannot respond on the organisation&apos;s behalf.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={referrals}
        getRowKey={(r) => r.id}
        loading={loading}
        error={error}
        onRetry={refetch}
        emptyTitle="No referrals"
        emptyDescription="Referrals sent to this organisation will appear here."
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalCount={count}
        pageSize={20}
      />

      <SlidePanel
        open={!!responding}
        onClose={() => setResponding(null)}
        title={accepting ? 'Accept referral' : 'Decline referral'}
        subtitle={responding ? `${responding.referral.patient.first_name} ${responding.referral.patient.last_name} · ${responding.referral.letter_number}` : undefined}
        footer={
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setResponding(null)} className="px-4 py-2 text-sm font-medium text-text-soft hover:text-ink">Cancel</button>
            <Button type="submit" form="referral-response" disabled={!form.response_notes.trim() || saving}>
              {saving ? 'Sending…' : accepting ? 'Accept referral' : 'Decline referral'}
            </Button>
          </div>
        }
      >
        <form id="referral-response" onSubmit={submit} className="space-y-4">
          <FormField label="Response notes *">
            <textarea
              required
              rows={4}
              value={form.response_notes}
              onChange={(e) => setForm(f => ({ ...f, response_notes: e.target.value }))}
              // `formInputClass` pins height to 42px for single-line inputs, which
              // squashes a rows=4 textarea into one line. h-auto lets rows win.
              className={`${formInputClass} h-auto py-2.5`}
            />
            <p className="mt-1 text-xs text-text-soft">
              {accepting
                ? 'Sent to the referring organisation. Required.'
                : 'The reason for declining, sent to the referring organisation. Required.'}
            </p>
          </FormField>

          {accepting && (
            <>
              <label className="flex items-start gap-2.5 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={!!form.create_episode}
                  onChange={(e) => setForm(f => ({ ...f, create_episode: e.target.checked }))}
                  className="mt-0.5"
                />
                <span>
                  Open an episode for this patient
                  <span className="block text-xs text-text-soft">
                    Starts the patient&apos;s care record in this organisation straight away.
                  </span>
                </span>
              </label>

              {form.create_episode && (
                <div className="space-y-4 pl-6">
                  <FormField label="Chief complaint">
                    <input value={form.chief_complaint ?? ''} onChange={(e) => setForm(f => ({ ...f, chief_complaint: e.target.value }))} className={formInputClass} />
                  </FormField>
                  <FormField label="Diagnosis">
                    <input value={form.diagnosis ?? ''} onChange={(e) => setForm(f => ({ ...f, diagnosis: e.target.value }))} className={formInputClass} />
                  </FormField>
                </div>
              )}
            </>
          )}
        </form>
      </SlidePanel>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────

const PAGE_TITLES: Record<string, string> = {
  overview: 'Dashboard',
  staff: 'Staff',
  patients: 'Patients',
  wards: 'Wards & Beds',
  'access-requests': 'Access Requests',
  referrals: 'Referrals',
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
      smallScreenGateFor="Organisation Admin"
    >
      {page === 'overview'        && <OverviewPage stats={stats} onNavigate={setPage} />}
      {page === 'staff'           && <StaffPage />}
      {page === 'patients'        && <PatientsPage />}
      {page === 'wards'           && <WardsPage />}
      {page === 'access-requests' && <AccessRequestsPage />}
      {page === 'referrals'       && <ReferralsPage />}
    </DashboardShell>
  );
}
