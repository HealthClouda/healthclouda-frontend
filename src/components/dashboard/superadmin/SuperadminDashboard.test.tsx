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

const stats = { total_organizations: 27, active_organizations: 25, total_users: 4382, total_patients: 900 };

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
