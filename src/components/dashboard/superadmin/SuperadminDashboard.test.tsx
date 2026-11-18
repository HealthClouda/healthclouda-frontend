import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within, cleanup } from '@testing-library/react';
import { SuperadminDashboard } from './SuperadminDashboard';
import type { User } from '@/types/auth';
import { formatDateTime } from '@/lib/utils';

/**
 * D1 Superadmin pages (sprint plan Thu 13 Aug row) — rebuilt onto the shared
 * shell (DashboardShell/DataTable/SlidePanel) with two new write workflows
 * the old page never had: user invite (POST /auth/users/) and user
 * suspend/activate (DELETE / POST .../activate/). Endpoints verified live
 * against the schema 2026-08-14 before building — see types/dashboard.ts.
 */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/superadmin',
}));

vi.mock('@/lib/client-api', () => ({
  dataGet: vi.fn(),
  dataAction: vi.fn(),
  redirectToSignin: vi.fn(),
  ClientApiError: class ClientApiError extends Error {
    constructor(public status: number, public data: unknown, message: string) {
      super(message);
      this.name = 'ClientApiError';
    }
  },
}));

import { dataGet, dataAction, ClientApiError } from '@/lib/client-api';
const dataGetMock = vi.mocked(dataGet);
const dataActionMock = vi.mocked(dataAction);

const user = {
  id: 'sa1', email: 'admin@healthclouda.com', first_name: 'Zainab', last_name: 'Bello', role: 'SUPERADMIN',
} as unknown as User;

// CAPTURED LIVE 2026-08-29 (FLAG-222) — GET /superadmin/dashboard/.
// Was `{total_organizations, active_organizations, total_users, total_patients}`:
// three of those four fields do not exist, so three tiles rendered '–' against
// real data while this fixture kept the tests green.
const stats = {
  total_users: 4382, total_orgs: 27, active_organizations: 25, total_patients: 3106,
  monthly_revenue: 0, active_records: 900,
};

const activeOrg = {
  id: 'org-1', org_id: 'HCL-NG-DEMO-01', name: 'Demo Clinic', slug: 'demo-clinic', org_type: 'CLINIC',
  email: 'contact@demo-clinic.test', city: 'Lagos', state: 'Lagos', country_name: 'Nigeria',
  is_active: true, is_verified: true, total_staff: 5, total_patients: 21, created_at: '2026-06-01T00:00:00Z',
};
const orgsEnvelope = { count: 1, next: null, previous: null, results: [activeOrg] };

// GET /org/<id>/ (OrganizationOrgAdmin). The two fields that matter here are
// `address` and `country_code`: OrganizationList carries NEITHER, which is why
// the edit panel must prefill from the detail endpoint and not the list row.
const orgDetail = {
  ...activeOrg,
  address: '12 Awolowo Road, Ikoyi',
  country_code: 'NG',
  license_number: 'LIC-001',
  verified_at: '2026-06-02T00:00:00Z',
  total_episodes: 16,
  updated_at: '2026-08-01T00:00:00Z',
  // Backend #293 fields, shaped as captured live 2026-10-24. verified_by is
  // null with verified_at set: true of every org on dev today.
  verified_by: null,
  staff_by_role: { DOCTOR: 2, NURSE: 1, ORGANIZATION_ADMIN: 1, RECEPTIONIST: 1 },
  org_admins: [{ id: 'u-9', email: 'ngozi@demo-clinic.test', full_name: 'Ngozi Eze', role: 'ORGANIZATION_ADMIN' }],
};

const pendingUser = {
  id: 'u-1', first_name: 'Chidi', last_name: 'Okafor', email: 'chidi@demo-clinic.test', role: 'DOCTOR',
  is_active: true, last_login: null, date_joined: '2026-08-10T00:00:00Z', organization: { id: 'org-1', name: 'Demo Clinic', org_id: 'HCL-NG-DEMO-01' },
};
const activeUser = {
  id: 'u-2', first_name: 'Amara', last_name: 'Nwosu', email: 'amara@demo-clinic.test', role: 'NURSE',
  is_active: true, last_login: '2026-08-13T09:00:00Z', date_joined: '2026-07-01T00:00:00Z', organization: { id: 'org-1', name: 'Demo Clinic', org_id: 'HCL-NG-DEMO-01' },
};
const usersEnvelope = { count: 2, next: null, previous: null, results: [pendingUser, activeUser] };
// w5-b2 / backend FLAG-647: a suspended user who never signed in, exactly the
// shape of all 8 suspended users on dev. Kept out of usersEnvelope so the other
// Users tests keep their two rows.
const suspendedUser = {
  id: 'u-3', first_name: 'Sani', last_name: 'Bello', email: 'sani@demo-clinic.test', role: 'NURSE',
  is_active: false, is_suspended: true, last_login: null, date_joined: '2026-08-01T00:00:00Z',
  organization: { id: 'org-1', name: 'Demo Clinic', org_id: 'HCL-NG-DEMO-01' },
};
const suspendedDetail = { ...suspendedUser, phone: null, force_password_change: true, password_changed_at: null };

// GET /auth/users/<id>/ (UserDetail, live schema 2026-10-24): the list fields
// plus force_password_change and password_changed_at.
const activeUserDetail = {
  ...activeUser, phone: '+2348011111111',
  force_password_change: false, password_changed_at: '2026-07-02T10:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  dataGetMock.mockImplementation(async (path: string) => {
    if (path.startsWith('/org/org-')) return orgDetail;
    if (path.startsWith('/org/')) return orgsEnvelope;
    if (path === '/auth/users/u-2/') return activeUserDetail;
    if (path.startsWith('/auth/users/')) return usersEnvelope;
    return { count: 0, next: null, previous: null, results: [] };
  });
  dataActionMock.mockResolvedValue({});
});

async function openPage(name: string, expectText: string) {
  render(<SuperadminDashboard user={user} initialStats={stats} />);
  fireEvent.click(screen.getByRole('button', { name }));
  await waitFor(() => expect(screen.getByText(expectText)).toBeInTheDocument());
}

// w2-k1: "View" opens the organisation's detail view; Edit is a button on it.
async function openOrgDetail() {
  await openPage('Organisations', 'Demo Clinic');
  fireEvent.click(screen.getByRole('button', { name: 'View' }));
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Demo Clinic', level: 2 })).toBeInTheDocument());
  await waitFor(() => expect(screen.getByText('12 Awolowo Road, Ikoyi')).toBeInTheDocument());
}

describe('Superadmin — Overview', () => {
  // The server ignores `?page_size=` and returns its own page of 20 (measured
  // against api-dev 2026-08-17, FLAG-013), so "Recent Organisations" has to cap
  // client-side. The single-org fixture hid this: it only shows above 5.
  it('caps Recent Organisations at 5 even when the server returns a full page', async () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      ...activeOrg, id: `org-${i + 1}`, name: `Clinic ${i + 1}`, slug: `clinic-${i + 1}`,
    }));
    dataGetMock.mockImplementation(async (path: string) => {
      if (path.startsWith('/org/org-')) return orgDetail;
      if (path.startsWith('/org/')) return { count: 20, next: null, previous: null, results: many };
      return { count: 0, next: null, previous: null, results: [] };
    });

    render(<SuperadminDashboard user={user} initialStats={stats} />);
    await waitFor(() => expect(screen.getByText('Clinic 1')).toBeInTheDocument());
    expect(screen.getByText('Clinic 5')).toBeInTheDocument();
    expect(screen.queryByText('Clinic 6')).not.toBeInTheDocument();
  });
});

// GET /superadmin/health/ — shape from backend #294 (read from its source, not a
// live capture: Railway builds were paused, so #294 wasn't deployed yet). It
// answers 503 WITH this same body when any service errors.
const healthy = {
  status: 'healthy', timestamp: '2026-10-22T19:00:00Z',
  services: {
    database: { status: 'ok', engine: 'postgresql' },
    cache: { status: 'ok' },
    worker: { status: 'ok', workers: 1 },
    storage: { status: 'ok' },
  },
  system: { python_version: '3.11.9', django_version: '4.2.27' },
  records: { organizations: 27, users: 4382, patients: 3106, episodes: 900, referrals: 41 },
};
const workerDown = {
  ...healthy, status: 'unhealthy',
  services: { ...healthy.services, worker: { status: 'error', error: 'No background worker replied' } },
};

describe('Superadmin — Overview: System Health card (b5)', () => {
  function withHealth(health: unknown) {
    dataGetMock.mockImplementation(async (path: string) => {
      if (path.startsWith('/superadmin/health/')) {
        if (health instanceof Error) throw health;
        return health;
      }
      if (path.startsWith('/org/')) return orgsEnvelope;
      return { count: 0, next: null, previous: null, results: [] };
    });
  }

  it('shows Healthy and one OK row per service from GET /superadmin/health/', async () => {
    withHealth(healthy);
    render(<SuperadminDashboard user={user} initialStats={stats} />);

    const card = await screen.findByRole('region', { name: 'System Health' });
    await waitFor(() => expect(within(card).getByText('Healthy')).toBeInTheDocument());
    for (const name of ['Database', 'Cache (Redis)', 'Background worker', 'File storage']) {
      expect(within(card).getByText(name)).toBeInTheDocument();
    }
    expect(within(card).getAllByText('OK')).toHaveLength(4);
    expect(within(card).getByText(/django 4\.2\.27/i)).toBeInTheDocument();
    expect(dataGetMock).toHaveBeenCalledWith(expect.stringContaining('/superadmin/health/'));
  });

  // The 503 carries the per-service report. A card that treated every non-2xx as
  // "couldn't load" would hide WHICH service is down, the one thing it is for.
  it('reads the 503 body: shows Unhealthy and names the failed service', async () => {
    withHealth(new ClientApiError(503, workerDown, 'Service unavailable'));
    render(<SuperadminDashboard user={user} initialStats={stats} />);

    const card = await screen.findByRole('region', { name: 'System Health' });
    await waitFor(() => expect(within(card).getByText('Unhealthy')).toBeInTheDocument());
    expect(within(card).getByText('No background worker replied')).toBeInTheDocument();
    expect(within(card).getAllByText('OK')).toHaveLength(3);
    expect(within(card).queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows "Not configured" in neutral, not as a failure', async () => {
    withHealth({ ...healthy, services: { ...healthy.services, worker: { status: 'not_configured' } } });
    render(<SuperadminDashboard user={user} initialStats={stats} />);

    const card = await screen.findByRole('region', { name: 'System Health' });
    await waitFor(() => expect(within(card).getByText('Not configured')).toBeInTheDocument());
    expect(within(card).getByText('Healthy')).toBeInTheDocument();
  });

  // No report at all means the backend itself didn't answer: that IS the outage signal.
  it('says no report was available, with a retry, when the server does not answer', async () => {
    withHealth(new Error('Network down'));
    render(<SuperadminDashboard user={user} initialStats={stats} />);

    const card = await screen.findByRole('region', { name: 'System Health' });
    expect(await within(card).findByRole('alert')).toHaveTextContent(/could not get a health report/i);
    expect(within(card).getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  // dev ran the pre-#294 backend when this was built (Railway builds paused): its
  // body has no `services`. The card must degrade, not take the overview down.
  it('handles a reply without a service report without breaking the overview', async () => {
    withHealth({ status: 'healthy', database: { status: 'connected' } });
    render(<SuperadminDashboard user={user} initialStats={stats} />);

    const card = await screen.findByRole('region', { name: 'System Health' });
    expect(await within(card).findByRole('alert')).toHaveTextContent(/could not get a health report/i);
    expect(await screen.findByText('Demo Clinic')).toBeInTheDocument();
  });

  // A status this card doesn't know (an older shape, or a new one like 'degraded')
  // used to reach StatusBadge as undefined and crash the whole overview.
  it('shows an unknown service status as "Unknown" without breaking the overview', async () => {
    withHealth({ ...healthy, services: { ...healthy.services, worker: { status: 'degraded' } } });
    render(<SuperadminDashboard user={user} initialStats={stats} />);

    const card = await screen.findByRole('region', { name: 'System Health' });
    await waitFor(() => expect(within(card).getByText('Unknown')).toBeInTheDocument());
    expect(within(card).getAllByText('OK')).toHaveLength(3);
    expect(await screen.findByText('Demo Clinic')).toBeInTheDocument();
  });

  // Once a report has arrived, a service it leaves out is "Not reported", not the
  // loading ellipsis: "…" forever reads as still checking.
  it('shows a service missing from the report as "Not reported", not as still loading', async () => {
    const { worker: _omitted, ...withoutWorker } = healthy.services;
    withHealth({ ...healthy, services: withoutWorker });
    render(<SuperadminDashboard user={user} initialStats={stats} />);

    const card = await screen.findByRole('region', { name: 'System Health' });
    await waitFor(() => expect(within(card).getByText('Not reported')).toBeInTheDocument());
    expect(within(card).queryByText('…')).not.toBeInTheDocument();
  });
});

describe('Superadmin — Organisations page', () => {
  it('lists organisations from the real /org/ envelope', async () => {
    await openPage('Organisations', 'Demo Clinic');
    expect(screen.getByText('demo-clinic')).toBeInTheDocument();
  });

  it('opens the Add Organisation panel and submits POST /org/', async () => {
    await openPage('Organisations', 'Demo Clinic');
    fireEvent.click(screen.getByRole('button', { name: /add organisation/i }));
    const panel = screen.getByRole('dialog');
    fireEvent.change(within(panel).getByLabelText(/organisation name/i), { target: { value: 'New Clinic' } });
    fireEvent.change(within(panel).getByLabelText(/^email \*/i), { target: { value: 'new@clinic.test' } });
    fireEvent.change(within(panel).getByLabelText(/address/i), { target: { value: '1 Main St' } });
    fireEvent.change(within(panel).getByLabelText(/city/i), { target: { value: 'Abuja' } });
    fireEvent.change(within(panel).getByLabelText(/state/i), { target: { value: 'FCT' } });

    fireEvent.click(within(panel).getByRole('button', { name: /^add organisation$/i }));

    await waitFor(() => {
      expect(dataActionMock).toHaveBeenCalledWith('/org/', 'POST', expect.objectContaining({ name: 'New Clinic', email: 'new@clinic.test' }));
    });
  });

  it('prefills the edit panel from GET /org/<id>/, so the stored address is visible', async () => {
    await openOrgDetail();
    dataGetMock.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    await waitFor(() => expect(dataGetMock).toHaveBeenCalledWith('/org/org-1/'));
    const panel = screen.getByRole('dialog');
    await waitFor(() => {
      expect(within(panel).getByLabelText(/address/i)).toHaveValue('12 Awolowo Road, Ikoyi');
    });
  });

  it('edit PATCHes only what changed and never blanks the untouched address', async () => {
    await openOrgDetail();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const panel = screen.getByRole('dialog');
    await waitFor(() => expect(within(panel).getByLabelText(/address/i)).toHaveValue('12 Awolowo Road, Ikoyi'));

    // Change only the phone — the classic "admin corrects a phone number" edit.
    fireEvent.change(within(panel).getByLabelText(/phone/i), { target: { value: '+2348000000000' } });
    fireEvent.click(within(panel).getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(dataActionMock).toHaveBeenCalledWith('/org/org-1/', 'PATCH', { phone: '+2348000000000' });
    });
    const body = dataActionMock.mock.calls[0][2] as Record<string, unknown>;
    expect(body).not.toHaveProperty('address');
    expect(body).not.toHaveProperty('country_code');
  });

  it('blocks Save while the detail fetch is still in flight', async () => {
    await openOrgDetail();
    let release: (v: unknown) => void = () => {};
    dataGetMock.mockImplementationOnce(() => new Promise((r) => { release = r; }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    const panel = screen.getByRole('dialog');
    expect(within(panel).getByRole('button', { name: /save changes/i })).toBeDisabled();
    release(orgDetail);
    await waitFor(() => expect(within(panel).getByRole('button', { name: /save changes/i })).toBeEnabled());
  });

  it('gives the organisations search box an accessible name', async () => {
    await openPage('Organisations', 'Demo Clinic');
    expect(screen.getByRole('textbox', { name: /search organisations/i })).toBeInTheDocument();
  });

  it('suspend action still calls the superadmin suspend endpoint, not generic org DELETE', async () => {
    await openPage('Organisations', 'Demo Clinic');
    fireEvent.click(screen.getByRole('button', { name: 'Suspend' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Suspend' }));
    await waitFor(() => {
      expect(dataActionMock).toHaveBeenCalledWith('/superadmin/organizations/org-1/suspend/', 'POST', undefined);
    });
  });
});

/**
 * Stand-up w2-k1. "View" used to open the edit form. It now opens a detail view
 * built on backend #293's org detail fields and `/auth/users/?organization=`,
 * both captured live 2026-10-24.
 */
describe('Superadmin — organisation detail view (w2-k1)', () => {
  it('"View" opens the detail view, not the edit form, and reads the org and its staff', async () => {
    await openOrgDetail();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(dataGetMock).toHaveBeenCalledWith('/org/org-1/');
    expect(dataGetMock).toHaveBeenCalledWith(expect.stringMatching(/^\/auth\/users\/\?.*organization=org-1/));
    expect(screen.getByText('HCL-NG-DEMO-01')).toBeInTheDocument();
  });

  it('shows staff, patient and episode counts', async () => {
    await openOrgDetail();
    for (const [label, value] of [['Active staff', '5'], ['Patients', '21'], ['Episodes', '16']]) {
      const card = screen.getByText(label, { selector: 'p, span, div' }).closest('div.rounded-card') as HTMLElement;
      expect(card).toHaveTextContent(value);
    }
  });

  it('says the verifier was not recorded when verified_at is set but verified_by is null', async () => {
    await openOrgDetail();
    const verification = screen.getByRole('region', { name: 'Verification' });
    expect(verification).toHaveTextContent(/verified on 02 Jun 2026/i);
    expect(verification).toHaveTextContent(/verifier not recorded/i);
  });

  it('names the verifier when the backend recorded one', async () => {
    dataGetMock.mockImplementation(async (path: string) => {
      if (path === '/org/org-1/') return { ...orgDetail, verified_by: { id: 'sa1', email: 'admin@healthclouda.com', full_name: 'Zainab Bello', role: 'SUPERADMIN' } };
      if (path.startsWith('/org/')) return orgsEnvelope;
      if (path.startsWith('/auth/users/')) return usersEnvelope;
      return { count: 0, next: null, previous: null, results: [] };
    });
    await openOrgDetail();
    expect(screen.getByRole('region', { name: 'Verification' })).toHaveTextContent(/by Zainab Bello/);
  });

  it('lists the org admins, and warns when there are none', async () => {
    await openOrgDetail();
    const admins = screen.getByRole('region', { name: 'Organisation admins' });
    expect(within(admins).getByText('Ngozi Eze')).toBeInTheDocument();
    expect(within(admins).getByText('ngozi@demo-clinic.test')).toBeInTheDocument();

    cleanupAndRenderWith({ ...orgDetail, org_admins: [] });
    await openOrgDetail();
    expect(screen.getByRole('region', { name: 'Organisation admins' })).toHaveTextContent(/no organisation admin/i);
  });

  it('shows staff by role, with readable role names', async () => {
    await openOrgDetail();
    const byRole = screen.getByRole('region', { name: 'Staff by role' });
    expect(byRole).toHaveTextContent('Doctor2');
    expect(byRole).toHaveTextContent('Org Admin1');
  });

  it('lists the staff from /auth/users/?organization=<id>', async () => {
    await openOrgDetail();
    const staff = screen.getByRole('region', { name: 'Staff' });
    await waitFor(() => expect(within(staff).getByText('Amara Nwosu')).toBeInTheDocument());
  });

  it('Back returns to the organisations table', async () => {
    await openOrgDetail();
    fireEvent.click(screen.getByRole('button', { name: /back to organisations/i }));
    expect(screen.getByRole('textbox', { name: /search organisations/i })).toBeInTheDocument();
  });

  it('suspending from the detail view uses the superadmin endpoint and re-reads the org', async () => {
    await openOrgDetail();
    dataGetMock.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Suspend' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Suspend' }));
    await waitFor(() => expect(dataActionMock).toHaveBeenCalledWith('/superadmin/organizations/org-1/suspend/', 'POST', undefined));
    await waitFor(() => expect(dataGetMock).toHaveBeenCalledWith('/org/org-1/'));
  });

  // Found in @Bastoh's browser pass on #205: after Suspend the tile said 0 staff
  // but the Staff table still listed everyone as Active, because only the org
  // was re-read. Suspending an org deactivates all of its staff (backend), so
  // the table must re-read too.
  it('re-reads the Staff table after Suspend, so it matches the tile', async () => {
    await openOrgDetail();
    const staffRow = () => within(screen.getByRole('region', { name: 'Staff' })).getByText('Amara Nwosu').closest('tr') as HTMLElement;
    // "before" must be Active, not merely contain "active" (which "Inactive" does).
    await waitFor(() => expect(staffRow()).not.toHaveTextContent(/inactive/i));
    expect(staffRow()).toHaveTextContent('Active'); // cells run together, so no \b

    // From here on the backend reports the suspended state.
    dataGetMock.mockImplementation(async (path: string) => {
      if (path === '/org/org-1/') return { ...orgDetail, is_active: false, total_staff: 0, staff_by_role: {} };
      if (path.startsWith('/org/')) return { ...orgsEnvelope, results: [{ ...activeOrg, is_active: false }] };
      if (path.startsWith('/auth/users/')) {
        return { ...usersEnvelope, results: usersEnvelope.results.map((u) => ({ ...u, is_active: false })) };
      }
      return { count: 0, next: null, previous: null, results: [] };
    });
    fireEvent.click(screen.getByRole('button', { name: 'Suspend' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Suspend' }));

    await waitFor(() => expect(screen.getByRole('region', { name: 'Staff by role' })).toHaveTextContent(/no active staff/i));
    await waitFor(() => expect(staffRow()).toHaveTextContent(/inactive/i));
  });

  // Found in the browser walk of #205 (predates it): the toast was built as
  // `${action}d`, so it read "suspendd" and "verifyd".
  it('confirms in plain English: "Organisation suspended successfully"', async () => {
    await openOrgDetail();
    fireEvent.click(screen.getByRole('button', { name: 'Suspend' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Suspend' }));
    // The Toaster isn't rendered here; the message lands in the toast store.
    const { useToastStore } = await import('@/store/toast');
    await waitFor(() => expect(useToastStore.getState().toasts.map((t) => t.message))
      .toContain('Organisation suspended successfully'));
  });

  it('the Suspend confirmation says the staff will be deactivated', async () => {
    await openOrgDetail();
    fireEvent.click(screen.getByRole('button', { name: 'Suspend' }));
    expect(screen.getByRole('dialog')).toHaveTextContent(/every staff member at this organisation will be deactivated/i);
  });

  // Review of #205: useApi keeps the previous data while the next path loads,
  // so View B briefly rendered A's page, with Suspend bound to A. Suspending
  // in that window would deactivate every staff member at the wrong org.
  it('opening a second organisation never shows the first one while it loads', async () => {
    const otherOrg = { ...activeOrg, id: 'org-2', org_id: 'HCL-NG-OTHER-02', name: 'Other Clinic', slug: 'other-clinic' };
    dataGetMock.mockImplementation(async (path: string) => {
      if (path === '/org/org-1/') return orgDetail;
      if (path === '/org/org-2/') return new Promise(() => {}); // still loading
      if (path.startsWith('/org/')) return { ...orgsEnvelope, count: 2, results: [activeOrg, otherOrg] };
      if (path.startsWith('/auth/users/')) return usersEnvelope;
      return { count: 0, next: null, previous: null, results: [] };
    });
    await openPage('Organisations', 'Other Clinic');
    fireEvent.click(screen.getAllByRole('button', { name: 'View' })[0]);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Demo Clinic', level: 2 })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /back to organisations/i }));
    fireEvent.click((await screen.findAllByRole('button', { name: 'View' }))[1]);

    expect(screen.getByText(/loading organisation/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Demo Clinic', level: 2 })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Suspend' })).not.toBeInTheDocument();
  });

  // Review of #205: org_admins counts ACTIVE admins only, and suspending an org
  // deactivates all of its staff, so every suspended org looked admin-less.
  it('does not warn "no organisation admin" on a suspended organisation', async () => {
    cleanupAndRenderWith({ ...orgDetail, is_active: false, total_staff: 0, staff_by_role: {}, org_admins: [] });
    await openOrgDetail();
    const admins = screen.getByRole('region', { name: 'Organisation admins' });
    expect(admins).not.toHaveTextContent(/nobody at this organisation/i);
    expect(admins).toHaveTextContent(/suspended/i);
  });

  // Review of #205: staging's backend does not send the #293 fields yet.
  it('renders without the #293 fields instead of crashing', async () => {
    const { staff_by_role: _r, org_admins: _a, ...older } = orgDetail;
    cleanupAndRenderWith(older);
    await openOrgDetail();
    expect(screen.getByRole('region', { name: 'Staff by role' })).toBeInTheDocument();
  });

  it('calls the staff tile "Active staff", since it counts active staff only', async () => {
    await openOrgDetail();
    expect(screen.getByText('Active staff')).toBeInTheDocument();
  });

  it('shows a deactivated staff member who never signed in as Inactive, not "Invite pending"', async () => {
    dataGetMock.mockImplementation(async (path: string) => {
      if (path === '/org/org-1/') return orgDetail;
      if (path.startsWith('/org/')) return orgsEnvelope;
      if (path.startsWith('/auth/users/')) return { ...usersEnvelope, results: [{ ...pendingUser, is_active: false }] };
      return { count: 0, next: null, previous: null, results: [] };
    });
    await openOrgDetail();
    const staff = screen.getByRole('region', { name: 'Staff' });
    const row = (await within(staff).findByText('Chidi Okafor')).closest('tr') as HTMLElement;
    expect(row).toHaveTextContent(/inactive/i);
    expect(row).not.toHaveTextContent(/invite pending/i);
  });
});

function cleanupAndRenderWith(detail: Record<string, unknown>) {
  cleanup();
  dataGetMock.mockImplementation(async (path: string) => {
    if (path === '/org/org-1/') return detail;
    if (path.startsWith('/org/')) return orgsEnvelope;
    if (path.startsWith('/auth/users/')) return usersEnvelope;
    return { count: 0, next: null, previous: null, results: [] };
  });
}

/**
 * FLAG-205 correction. The Role dropdown was dropped from this page while
 * building D1, on the reasoning that `?role=` was absent from the live schema
 * and would therefore be silently ignored (the GLOBAL-2 / FLAG-004 class).
 *
 * That reasoning was wrong. @Qeeyat measured it against `api-dev` 2026-08-19:
 * `/auth/users/?role=DOCTOR` narrows 7 → 2, while `?is_active=true` on the same
 * endpoint returned all 7 — so an unknown param IS silently ignored here, which
 * is what makes the `?role=` result real filtering rather than coincidence.
 * (Since backend #293, `?is_active=` is honoured too and all four filters are
 * published — see the w2-k2 block below.)
 *
 * These tests can only prove we send the param; that it is HONOURED rests on
 * that live measurement, recorded in FLAG-205 and HANDOFF.md.
 */
describe('Superadmin — Users page: role filter (FLAG-205)', () => {
  it('sends ?role= when a role is chosen', async () => {
    await openPage('Users', 'Chidi Okafor');
    dataGetMock.mockClear();

    fireEvent.change(screen.getByLabelText(/filter by role/i), { target: { value: 'DOCTOR' } });

    await waitFor(() => {
      expect(dataGetMock).toHaveBeenCalledWith(expect.stringContaining('role=DOCTOR'));
    });
  });

  it('combines the role filter with an active search rather than replacing it', async () => {
    await openPage('Users', 'Chidi Okafor');
    fireEvent.change(screen.getByRole('textbox', { name: /search users/i }), { target: { value: 'chidi' } });
    await waitFor(() => expect(dataGetMock).toHaveBeenCalledWith(expect.stringContaining('search=chidi')));

    dataGetMock.mockClear();
    fireEvent.change(screen.getByLabelText(/filter by role/i), { target: { value: 'NURSE' } });

    await waitFor(() => {
      const paths = dataGetMock.mock.calls.map(([p]) => p as string);
      expect(paths.some((p) => p.includes('role=NURSE') && p.includes('search=chidi'))).toBe(true);
    });
  });

  it('clearing the role filter drops the param entirely', async () => {
    await openPage('Users', 'Chidi Okafor');
    fireEvent.change(screen.getByLabelText(/filter by role/i), { target: { value: 'DOCTOR' } });
    await waitFor(() => expect(dataGetMock).toHaveBeenCalledWith(expect.stringContaining('role=DOCTOR')));

    dataGetMock.mockClear();
    fireEvent.change(screen.getByLabelText(/filter by role/i), { target: { value: '' } });

    await waitFor(() => expect(dataGetMock).toHaveBeenCalled());
    for (const [path] of dataGetMock.mock.calls) {
      expect(path).not.toContain('role=');
    }
  });

  it('changing the role filter never requests a stale page number', async () => {
    // usePaginatedList resets to page 1 during render when the endpoint changes
    // (#78). Asserting across EVERY recorded call, not just the last, is what
    // catches an effect-based reset that fires after the bad request goes out.
    await openPage('Users', 'Chidi Okafor');
    dataGetMock.mockClear();

    fireEvent.change(screen.getByLabelText(/filter by role/i), { target: { value: 'DOCTOR' } });

    await waitFor(() => expect(dataGetMock).toHaveBeenCalled());
    for (const [path] of dataGetMock.mock.calls) {
      expect(path).not.toContain('page=2');
    }
  });
});

/**
 * Stand-up w2-k2. Backend #293 published `?is_active=` and `?organization=` on
 * /auth/users/. Measured on api-dev 2026-10-24 as superadmin, against a control
 * (`?nonsense_param=1` → 10 of 10): is_active=false → 0, organization=<id> → 1,
 * organization=<unknown uuid> → 0, organization=not-a-uuid → 400. So both are
 * really honoured, and these tests pin that we send them.
 */
describe('Superadmin — Users page: status and organisation filters (w2-k2)', () => {
  it('sends ?is_active=false for Suspended and ?is_active=true for Active', async () => {
    await openPage('Users', 'Chidi Okafor');
    dataGetMock.mockClear();
    fireEvent.change(screen.getByLabelText(/filter by status/i), { target: { value: 'false' } });
    await waitFor(() => expect(dataGetMock).toHaveBeenCalledWith(expect.stringContaining('is_active=false')));

    dataGetMock.mockClear();
    fireEvent.change(screen.getByLabelText(/filter by status/i), { target: { value: 'true' } });
    await waitFor(() => expect(dataGetMock).toHaveBeenCalledWith(expect.stringContaining('is_active=true')));
  });

  it('lists organisations to filter by, and sends ?organization=<id> with the other filters', async () => {
    await openPage('Users', 'Chidi Okafor');
    const orgFilter = screen.getByLabelText(/filter by organisation/i);
    await waitFor(() => expect(within(orgFilter).getByRole('option', { name: 'Demo Clinic' })).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/filter by role/i), { target: { value: 'DOCTOR' } });
    dataGetMock.mockClear();
    fireEvent.change(orgFilter, { target: { value: 'org-1' } });

    await waitFor(() => {
      const paths = dataGetMock.mock.calls.map(([p]) => p as string);
      expect(paths.some((p) => p.startsWith('/auth/users/?') && p.includes('organization=org-1') && p.includes('role=DOCTOR'))).toBe(true);
    });
  });

  it('"All" drops the status and organisation params entirely', async () => {
    await openPage('Users', 'Chidi Okafor');
    fireEvent.change(screen.getByLabelText(/filter by status/i), { target: { value: 'false' } });
    await waitFor(() => expect(dataGetMock).toHaveBeenCalledWith(expect.stringContaining('is_active=false')));

    dataGetMock.mockClear();
    fireEvent.change(screen.getByLabelText(/filter by status/i), { target: { value: '' } });
    await waitFor(() => expect(dataGetMock).toHaveBeenCalled());
    for (const [path] of dataGetMock.mock.calls) {
      expect(path).not.toContain('is_active=');
      expect(path).not.toContain('organization=');
    }
    // w5-b2: "All" means everyone, suspended users included (owner, 2026-11-18).
    expect(dataGetMock).toHaveBeenCalledWith(expect.stringContaining('include_suspended=true'));
  });

  it('opts in to suspended users only for "All", not for Active or Suspended', async () => {
    await openPage('Users', 'Chidi Okafor');
    for (const value of ['true', 'false']) {
      dataGetMock.mockClear();
      fireEvent.change(screen.getByLabelText(/filter by status/i), { target: { value } });
      await waitFor(() => expect(dataGetMock).toHaveBeenCalledWith(expect.stringContaining(`is_active=${value}`)));
      for (const [path] of dataGetMock.mock.calls) expect(path).not.toContain('include_suspended');
    }
  });

  it('says to adjust the filters when a filter, not a search, empties the list', async () => {
    await openPage('Users', 'Chidi Okafor');
    dataGetMock.mockImplementation(async (path: string) => {
      if (path.startsWith('/org/')) return orgsEnvelope;
      return { count: 0, next: null, previous: null, results: [] };
    });
    fireEvent.change(screen.getByLabelText(/filter by status/i), { target: { value: 'false' } });
    await waitFor(() => expect(screen.getByText(/adjusting your search or filters/i)).toBeInTheDocument());
  });
});

describe('Superadmin — user detail panel (w2-k2)', () => {
  async function openDetail() {
    await openPage('Users', 'Amara Nwosu');
    fireEvent.click(screen.getByRole('button', { name: /view details for amara nwosu/i }));
    const panel = screen.getByRole('dialog');
    await waitFor(() => expect(within(panel).getByText('+2348011111111')).toBeInTheDocument());
    return panel;
  }

  it('opens from the user name and reads GET /auth/users/<id>/', async () => {
    const panel = await openDetail();
    expect(dataGetMock).toHaveBeenCalledWith('/auth/users/u-2/');
    expect(within(panel).getByText('amara@demo-clinic.test')).toBeInTheDocument();
    expect(within(panel).getByText('Demo Clinic')).toBeInTheDocument();
  });

  it('shows the account facts the list cannot: password last changed and whether a change is due', async () => {
    const panel = await openDetail();
    expect(within(panel).getByText('Password last changed')).toBeInTheDocument();
    expect(within(panel).getByText('Must change password at next sign-in')).toBeInTheDocument();
    expect(within(panel).getByText('No')).toBeInTheDocument();
  });

  it('suspends from the panel through the same confirmed DELETE as the table', async () => {
    const panel = await openDetail();
    fireEvent.click(within(panel).getByRole('button', { name: 'Suspend' }));
    const confirm = screen.getAllByRole('dialog').find((d) => d !== panel)!;
    fireEvent.click(within(confirm).getByRole('button', { name: 'Suspend' }));
    await waitFor(() => expect(dataActionMock).toHaveBeenCalledWith('/auth/users/u-2/', 'DELETE', undefined));
  });

  // w5-b1 / FLAG-252: backend #309 emails the user a one-time link; the admin
  // never sees a password. The reset also signs the user out everywhere, so it
  // goes through a confirm dialog that says so.
  async function openResetConfirm() {
    const panel = await openDetail();
    fireEvent.click(within(panel).getByRole('button', { name: /reset password/i }));
    const confirm = screen.getAllByRole('dialog').find((d) => d !== panel)!;
    expect(confirm.textContent).toMatch(/signed out on every device/i);
    return confirm;
  }

  it('Reset password confirms, then POSTs /auth/users/<id>/send-password-reset/', async () => {
    const confirm = await openResetConfirm();
    fireEvent.click(within(confirm).getByRole('button', { name: /send reset link/i }));
    await waitFor(() => expect(dataActionMock)
      .toHaveBeenCalledWith('/auth/users/u-2/send-password-reset/', 'POST', undefined));
    const { useToastStore } = await import('@/store/toast');
    await waitFor(() => expect(useToastStore.getState().toasts.map((t) => t.message))
      .toContain('Password reset link sent'));
  });

  it('a throttled reset (429) shows the message and does not retry', async () => {
    const { useToastStore } = await import('@/store/toast');
    useToastStore.setState({ toasts: [] }); // earlier tests leave toasts in the store
    dataActionMock.mockRejectedValueOnce(
      new ClientApiError(429, null, 'Too many requests. Please try again shortly.'));
    const confirm = await openResetConfirm();
    fireEvent.click(within(confirm).getByRole('button', { name: /send reset link/i }));
    await waitFor(() => expect(useToastStore.getState().toasts.map((t) => t.message))
      .toContain('Too many requests. Please try again shortly.'));
    expect(useToastStore.getState().toasts.map((t) => t.message)).not.toContain('Password reset link sent');
    expect(dataActionMock.mock.calls.filter(([p]) => p === '/auth/users/u-2/send-password-reset/'))
      .toHaveLength(1);
  });

  // Suspended: can't sign in anyway. Pending: never signed in, so "signed out,
  // password stops working" is untrue (Resend in the row is the action).
  // Own account (signed in as sa1): would sign the admin out with a dead password.
  it.each([
    ['a suspended user', { is_active: false }],
    ['an invite-pending user', { last_login: null }],
    ['your own account', { id: 'sa1' }],
  ])('offers no Reset password on %s', async (_label, override) => {
    const base = dataGetMock.getMockImplementation()!;
    dataGetMock.mockImplementation(async (path: string) =>
      path === '/auth/users/u-2/' ? { ...activeUserDetail, ...override } : base(path));
    const panel = await openDetail();
    expect(within(panel).getByRole('button', { name: /suspend|activate/i })).toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: /reset password/i })).not.toBeInTheDocument();
  });
});

// GET /contact/contact-list/ (SUPERADMIN): shape from backend #295, which added
// created_at (source, 2026-10-22). Paginated, newest first.
const contactMessage = {
  id: '7c1f2a64-0b8e-4c55-9d1e-2f3a4b5c6d7e',
  first_name: 'Amaka', last_name: 'Eze', email: 'amaka.eze@example.com', phone_number: '08031234567',
  message: 'We run two clinics in Enugu and would like a demo.',
  created_at: '2026-10-20T09:15:00Z',
};

describe('Superadmin — Messages page (w2-b4)', () => {
  function withMessages(envelope: unknown) {
    dataGetMock.mockImplementation(async (path: string) => {
      if (path.startsWith('/contact/contact-list/')) return envelope;
      if (path.startsWith('/org/')) return orgsEnvelope;
      return { count: 0, next: null, previous: null, results: [] };
    });
  }

  it('is no longer "Soon": the Messages item can be opened', () => {
    render(<SuperadminDashboard user={user} initialStats={stats} />);
    expect(screen.getByRole('button', { name: 'Messages' })).toBeEnabled();
  });

  it('lists contact-form messages: who, how to reply, what they said and when', async () => {
    withMessages({ count: 1, next: null, previous: null, results: [contactMessage] });
    await openPage('Messages', 'Amaka Eze');

    expect(dataGetMock).toHaveBeenCalledWith(expect.stringContaining('/contact/contact-list/'));
    expect(screen.getByRole('link', { name: 'amaka.eze@example.com' })).toHaveAttribute('href', 'mailto:amaka.eze@example.com');
    expect(screen.getByText('08031234567')).toBeInTheDocument();
    expect(screen.getByText('We run two clinics in Enugu and would like a demo.')).toBeInTheDocument();
    expect(screen.getByText(formatDateTime(contactMessage.created_at))).toBeInTheDocument(); // the received date
  });

  // Review of #203: the email comes from the PUBLIC contact form, and the
  // backend's validator accepts `x?bcc=...&a=@example.com`. Unencoded, `?`
  // `&` `=` became mailto fields: a hidden Bcc on the superadmin's reply.
  it('a hostile contact-form email cannot add fields to the reply link', async () => {
    const hostile = 'x?bcc=spy%40evil.test&a=@example.com';
    withMessages({ count: 1, next: null, previous: null, results: [{ ...contactMessage, email: hostile }] });
    await openPage('Messages', 'Amaka Eze');
    const href = screen.getByRole('link', { name: hostile }).getAttribute('href')!;
    expect(href.startsWith('mailto:')).toBe(true);
    expect(href.slice('mailto:'.length)).not.toMatch(/[?&=]/);
  });

  it('gives the page a title in the header', async () => {
    withMessages({ count: 1, next: null, previous: null, results: [contactMessage] });
    await openPage('Messages', 'Amaka Eze');
    expect(screen.getByRole('heading', { name: 'Messages', level: 1 })).toBeInTheDocument();
  });

  it('says so when nobody has written in yet', async () => {
    withMessages({ count: 0, next: null, previous: null, results: [] });
    await openPage('Messages', 'No messages yet');
    expect(dataGetMock).toHaveBeenCalledWith(expect.stringContaining('/contact/contact-list/'));
  });
});

describe('Superadmin — Users page', () => {
  it('gives the users search box an accessible name', async () => {
    await openPage('Users', 'Chidi Okafor');
    expect(screen.getByRole('textbox', { name: /search users/i })).toBeInTheDocument();
  });

  it('labels a never-logged-in user as invite pending, not Active/Inactive', async () => {
    await openPage('Users', 'Chidi Okafor');
    expect(screen.getByText('Invite pending')).toBeInTheDocument();
  });

  it('only offers Resend on the pending user, not the active one', async () => {
    await openPage('Users', 'Chidi Okafor');
    const pendingRow = screen.getByText('Chidi Okafor').closest('tr')!;
    const activeRow = screen.getByText('Amara Nwosu').closest('tr')!;
    expect(pendingRow.querySelector('button[class*="text-primary"]')?.textContent).toMatch(/resend/i);
    expect(activeRow.textContent).not.toMatch(/resend/i);
  });

  it('resend calls POST /auth/users/<id>/resend-setup-email/', async () => {
    await openPage('Users', 'Chidi Okafor');
    fireEvent.click(screen.getByRole('button', { name: /resend/i }));
    await waitFor(() => {
      expect(dataActionMock).toHaveBeenCalledWith('/auth/users/u-1/resend-setup-email/', 'POST', undefined);
    });
  });

  it('suspending a user calls DELETE on the user endpoint (new capability)', async () => {
    await openPage('Users', 'Chidi Okafor');
    const activeRow = screen.getByText('Amara Nwosu').closest('tr')!;
    fireEvent.click(within(activeRow).getByRole('button', { name: 'Suspend' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Suspend' }));
    await waitFor(() => {
      expect(dataActionMock).toHaveBeenCalledWith('/auth/users/u-2/', 'DELETE', undefined);
    });
  });

  it('invite submits POST /auth/users/ without a password field', async () => {
    await openPage('Users', 'Chidi Okafor');
    fireEvent.click(screen.getByRole('button', { name: /invite user/i }));
    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Tunde' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Bakare' } });
    fireEvent.change(screen.getByLabelText(/^email \*/i), { target: { value: 'tunde@demo-clinic.test' } });
    fireEvent.change(screen.getByLabelText(/^role \*/i), { target: { value: 'DOCTOR' } });
    await waitFor(() => screen.getByLabelText(/^organisation \*/i));
    fireEvent.change(screen.getByLabelText(/^organisation \*/i), { target: { value: 'org-1' } });

    fireEvent.click(screen.getByRole('button', { name: /send invitation/i }));

    await waitFor(() => {
      expect(dataActionMock).toHaveBeenCalledWith('/auth/users/', 'POST', expect.objectContaining({ email: 'tunde@demo-clinic.test', role: 'DOCTOR' }));
    });
    const [, , body] = dataActionMock.mock.calls.find((c) => c[0] === '/auth/users/')!;
    expect(body).not.toHaveProperty('password');
  });

  it('does not submit the invite when required fields are missing', async () => {
    await openPage('Users', 'Chidi Okafor');
    fireEvent.click(screen.getByRole('button', { name: /invite user/i }));
    fireEvent.click(screen.getByRole('button', { name: /send invitation/i }));
    expect(dataActionMock).not.toHaveBeenCalledWith('/auth/users/', 'POST', expect.anything());
  });
});

describe('FLAG-222 — stat tiles must read the fields the API actually sends', () => {
  it('renders every tile from the captured /superadmin/dashboard/ payload', async () => {
    // The fixture above IS the live shape. Before this, the tiles read
    // total_organizations / active_organizations / total_patients — none of
    // which exist — so three of four rendered '–' on real data while these
    // tests stayed green against our own type.
    render(<SuperadminDashboard user={user} initialStats={stats} />);

    expect(await screen.findByText('4382')).toBeInTheDocument(); // total_users
    expect(screen.getByText('27')).toBeInTheDocument();          // total_orgs
    expect(screen.getByText('900')).toBeInTheDocument();         // active_records

    // No tile may render the empty placeholder from a payload this complete —
    // that is precisely what the bug looked like on screen.
    expect(screen.queryByText('–')).not.toBeInTheDocument();
  });

  // FLAG-051 — the two tiles removed under FLAG-222 are back: the backend now
  // sends `active_organizations` and `total_patients` (issue #158). Each tile
  // must read its own field; in particular Total Patients must not fall back
  // to `active_records`, which counts episodes.
  it('shows Active Organisations and Total Patients from their own fields', async () => {
    render(<SuperadminDashboard user={user} initialStats={stats} />);

    const activeOrgs = await screen.findByText('Active Organisations');
    expect(activeOrgs.closest('div')?.parentElement?.textContent).toContain('25');
    const patients = screen.getByText('Total Patients');
    expect(patients.closest('div')?.parentElement?.textContent).toContain('3106');
    expect(patients.closest('div')?.parentElement?.textContent).not.toContain('900');
  });
});

// ─── FLAG-061 — Audit Logs read the AuditLog shape ─────────────────────────
// Shape read from the live schema 2026-09-30 (PaginatedAuditLogList →
// AuditLog). This row is a real one from api-dev (28 Sep, FLAG-601's audit of
// an off-duty doctor named as attending). The page read `performed_by` /
// `user` / `description`, none of which exist, so every row said "System".
const overrideEntry = {
  id: 'log-1', user_email: 'nurse@demo.test', user_role: 'NURSE', action: 'CREATE',
  resource_type: 'Admission', resource_id: 'a161c35d-7d41-4b16-8076-1bebc2d56e21',
  resource_repr: 'CREATE Admission', reason: 'Off-duty doctor named as attending on admission',
  ip_address: '13.223.229.170', created_at: '2026-09-28T01:13:32.954039Z', changes: {},
  metadata: { route: 'emergency', attending_doctor_on_duty_override: true },
};
const systemEntry = {
  ...overrideEntry, id: 'log-2', user_email: '', user_role: '', action: 'READ', resource_type: 'Patient',
  resource_repr: 'Patient HCL-A2XLXC', reason: '', metadata: {},
};

describe('FLAG-061 — Audit Logs show who, what and why', () => {
  const auditCalls = () => dataGetMock.mock.calls.map(c => c[0] as string).filter(p => p.startsWith('/audit/logs/'));

  beforeEach(() => {
    dataGetMock.mockImplementation(async (path: string) => {
      if (path.startsWith('/audit/logs/')) return { count: 2, next: null, previous: null, results: [overrideEntry, systemEntry] };
      if (path.startsWith('/org/')) return orgsEnvelope;
      return { count: 0, next: null, previous: null, results: [] };
    });
  });

  it('names the person who did it, with their role, instead of "System"', async () => {
    await openPage('Audit Logs', 'nurse@demo.test');
    // Scoped to the table: the record-type filter also offers "Nurse" (API requests).
    expect(within(screen.getByRole('table')).getByText('Nurse')).toBeInTheDocument();
  });

  it('shows the reason and the record that was touched', async () => {
    await openPage('Audit Logs', 'Off-duty doctor named as attending on admission');
    expect(screen.getAllByText(/Admission/).length).toBeGreaterThan(0);
    expect(screen.getByText('Patient HCL-A2XLXC')).toBeInTheDocument();
  });

  it('says "System" only when the entry really has no user', async () => {
    await openPage('Audit Logs', 'nurse@demo.test');
    // Scoped to the table: the sidebar also has a "System" section heading.
    expect(within(screen.getByRole('table')).getAllByText('System')).toHaveLength(1);
  });

  it('filters by action on the server', async () => {
    await openPage('Audit Logs', 'nurse@demo.test');
    fireEvent.change(screen.getByLabelText('Action'), { target: { value: 'LOGIN_FAILURE' } });
    await waitFor(() => expect(auditCalls().some(p => p.includes('action=LOGIN_FAILURE'))).toBe(true));
  });

  // Review of #172: the backend's audit filters are filterset_fields, so all
  // EXACT. A free-text box that sends partial text reports "No matching
  // entries" when entries exist, the worst failure on an audit screen.
  it('offers record types as the exact values the backend writes, not free text', async () => {
    await openPage('Audit Logs', 'nurse@demo.test');
    const select = screen.getByLabelText('Record type');
    expect(select.tagName).toBe('SELECT');
    const values = Array.from((select as HTMLSelectElement).options).map(o => o.value);
    // Re-review of #172: all 28 values the three backend writers produce
    // (AuditMiddleware's URL prefixes, the save signals + coverage table,
    // and log_action callers), read from backend develop 4 Oct, plus 'Duty'
    // (backend FLAG-622, 6 Oct).
    const ALL = [
      'Admission', 'AdmissionRequest', 'Appointment', 'Bed', 'BillingRecord', 'Episode', 'OrgAccessRequest',
      'Organization', 'Patient', 'PatientCheckIn', 'PatientConsent', 'Prescription', 'Referral', 'User', 'VitalsRecord',
      'Auth', 'Doctor', 'Episodes', 'Nurse', 'Organizations', 'Patients', 'Receptionist', 'Referrals', 'Superadmin', 'Ward',
      'Action', 'Duty', 'PatientMerge', 'PatientMergeUndo',
    ];
    for (const v of ALL) expect(values).toContain(v);
    expect(values.filter(v => v !== '')).toHaveLength(ALL.length);
    // The look-alike pairs are told apart: a save vs an API request (reads included).
    const groups = Array.from(select.querySelectorAll('optgroup')).map(g => g.getAttribute('label'));
    expect(groups).toEqual(['Record changes', 'API requests (including reads)', 'Other actions']);
    const episodes = (select as HTMLSelectElement).querySelector('option[value="Episodes"]');
    expect(episodes?.closest('optgroup')?.getAttribute('label')).toBe('API requests (including reads)');
    fireEvent.change(select, { target: { value: 'Admission' } });
    await waitFor(() => expect(auditCalls().some(p => p.includes('resource_type=Admission'))).toBe(true));
  });

  it('sends the email only once it is a full address, and says so meanwhile', async () => {
    await openPage('Audit Logs', 'nurse@demo.test');
    const box = screen.getByLabelText('Full email address');
    fireEvent.change(box, { target: { value: 'doctor@' } });
    expect(await screen.findByText(/Enter the full email address, exactly as registered/)).toBeInTheDocument();
    await new Promise(r => setTimeout(r, 500));
    expect(auditCalls().some(p => p.includes('user_email='))).toBe(false);

    fireEvent.change(box, { target: { value: 'doctor@demo.test' } });
    await waitFor(() => expect(auditCalls().some(p => p.includes('user_email=doctor%40demo.test'))).toBe(true), { timeout: 3000 });
    expect(screen.queryByText(/Enter the full email address/)).toBeNull();
  });

  it('never sends a partial patient record ID (the backend 400s on a non-UUID)', async () => {
    await openPage('Audit Logs', 'nurse@demo.test');
    fireEvent.change(screen.getByLabelText(/Patient record ID/), { target: { value: '421839bb-3f00' } });
    expect(await screen.findByText('Enter the full record ID')).toBeInTheDocument();
    await new Promise(r => setTimeout(r, 500));
    expect(auditCalls().some(p => p.includes('patient='))).toBe(false);
  });

  it('filters by patient record ID on the server', async () => {
    await openPage('Audit Logs', 'nurse@demo.test');
    fireEvent.change(screen.getByLabelText(/Patient record ID/), { target: { value: '421839bb-3f00-4c93-9379-137bc3862939' } });
    await waitFor(() => expect(auditCalls().some(p => p.includes('patient=421839bb-3f00-4c93-9379-137bc3862939'))).toBe(true), { timeout: 3000 });
  });
});

describe('FLAG-061 — Overview "Recent Activity" shows real entries', () => {
  it('lists the latest audit entries with the person who did them', async () => {
    dataGetMock.mockImplementation(async (path: string) => {
      if (path.startsWith('/audit/logs/')) return { count: 2, next: null, previous: null, results: [overrideEntry, systemEntry] };
      // The real /superadmin/activity/ body — neither a list nor {results} —
      // which is why this box always said "No recent activity".
      if (path.startsWith('/superadmin/activity/')) return { period: { days: 7 }, limit: 50, activity: { recent_users: [], recent_patients: [] } };
      if (path.startsWith('/org/')) return orgsEnvelope;
      return { count: 0, next: null, previous: null, results: [] };
    });
    render(<SuperadminDashboard user={user} initialStats={stats} />);
    expect(await screen.findByText('nurse@demo.test')).toBeInTheDocument();
    expect(screen.queryByText('No recent activity')).not.toBeInTheDocument();
  });
});

describe('Superadmin — Users page: a suspended user (w5-b2, backend FLAG-647)', () => {
  beforeEach(() => {
    dataGetMock.mockImplementation(async (path: string) => {
      if (path.startsWith('/org/')) return orgsEnvelope;
      if (path === '/auth/users/u-3/') return suspendedDetail;
      if (path.startsWith('/auth/users/')) return { count: 3, next: null, previous: null, results: [pendingUser, activeUser, suspendedUser] };
      return { count: 0, next: null, previous: null, results: [] };
    });
  });

  it('labels the row Suspended, not "Invite pending", even though they never signed in', async () => {
    await openPage('Users', 'Sani Bello');
    const row = screen.getByText('Sani Bello').closest('tr')!;
    expect(within(row).getByText('Suspended')).toBeInTheDocument();
    expect(within(row).queryByText('Invite pending')).toBeNull();
    // Positive control: the never-signed-in active user is still "Invite pending".
    const pending = screen.getByText('Chidi Okafor').closest('tr')!;
    expect(within(pending).getByText('Invite pending')).toBeInTheDocument();
  });

  it('offers Activate but not Resend on a suspended row', async () => {
    await openPage('Users', 'Sani Bello');
    const row = screen.getByText('Sani Bello').closest('tr')!;
    expect(within(row).getByRole('button', { name: 'Activate' })).toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: /resend/i })).toBeNull();
    // Positive control: the pending user keeps Resend.
    const pending = screen.getByText('Chidi Okafor').closest('tr')!;
    expect(within(pending).getByRole('button', { name: /resend/i })).toBeInTheDocument();
  });

  it('says Suspended in the panel, with Activate and no Reset password', async () => {
    await openPage('Users', 'Sani Bello');
    fireEvent.click(screen.getByRole('button', { name: /view details for sani bello/i }));
    const panel = screen.getByRole('dialog');
    await waitFor(() => expect(within(panel).getByText('sani@demo-clinic.test')).toBeInTheDocument());
    expect(within(panel).getByText('Suspended')).toBeInTheDocument();
    expect(within(panel).queryByText('Invite pending')).toBeNull();
    expect(within(panel).getByRole('button', { name: 'Activate' })).toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: /reset password/i })).toBeNull();
  });
});
