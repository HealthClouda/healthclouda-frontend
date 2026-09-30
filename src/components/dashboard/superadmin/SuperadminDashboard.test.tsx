import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { SuperadminDashboard } from './SuperadminDashboard';
import type { User } from '@/types/auth';

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

import { dataGet, dataAction } from '@/lib/client-api';
const dataGetMock = vi.mocked(dataGet);
const dataActionMock = vi.mocked(dataAction);

const user = {
  id: 'sa1', email: 'admin@healthclouda.com', first_name: 'Zainab', last_name: 'Bello', role: 'SUPERADMIN',
} as unknown as User;

// CAPTURED LIVE 2026-08-29 (FLAG-222) — GET /superadmin/dashboard/.
// Was `{total_organizations, active_organizations, total_users, total_patients}`:
// three of those four fields do not exist, so three tiles rendered '—' against
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

beforeEach(() => {
  vi.clearAllMocks();
  dataGetMock.mockImplementation(async (path: string) => {
    if (path.startsWith('/org/org-')) return orgDetail;
    if (path.startsWith('/org/')) return orgsEnvelope;
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
    await openPage('Organisations', 'Demo Clinic');
    fireEvent.click(screen.getByRole('button', { name: 'View' }));

    await waitFor(() => expect(dataGetMock).toHaveBeenCalledWith('/org/org-1/'));
    const panel = screen.getByRole('dialog');
    await waitFor(() => {
      expect(within(panel).getByLabelText(/address/i)).toHaveValue('12 Awolowo Road, Ikoyi');
    });
  });

  it('edit PATCHes only what changed and never blanks the untouched address', async () => {
    await openPage('Organisations', 'Demo Clinic');
    fireEvent.click(screen.getByRole('button', { name: 'View' }));
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
    await openPage('Organisations', 'Demo Clinic');
    let release: (v: unknown) => void = () => {};
    dataGetMock.mockImplementationOnce(() => new Promise((r) => { release = r; }));
    fireEvent.click(screen.getByRole('button', { name: 'View' }));

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
 * FLAG-205 correction. The Role dropdown was dropped from this page while
 * building D1, on the reasoning that `?role=` was absent from the live schema
 * and would therefore be silently ignored (the GLOBAL-2 / FLAG-004 class).
 *
 * That reasoning was wrong. @Qeeyat measured it against `api-dev` 2026-08-19:
 * `/auth/users/?role=DOCTOR` narrows 7 → 2, while `?is_active=true` on the same
 * endpoint returns all 7 — so an unknown param IS silently ignored here, which
 * is what makes the `?role=` result real filtering rather than coincidence.
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
    // which exist — so three of four rendered '—' on real data while these
    // tests stayed green against our own type.
    render(<SuperadminDashboard user={user} initialStats={stats} />);

    expect(await screen.findByText('4382')).toBeInTheDocument(); // total_users
    expect(screen.getByText('27')).toBeInTheDocument();          // total_orgs
    expect(screen.getByText('900')).toBeInTheDocument();         // active_records

    // No tile may render the empty placeholder from a payload this complete —
    // that is precisely what the bug looked like on screen.
    expect(screen.queryByText('—')).not.toBeInTheDocument();
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
    expect(screen.getByText('Nurse')).toBeInTheDocument();
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
