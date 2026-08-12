import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OrgAdminDashboard } from './OrgAdminDashboard';
import type { User } from '@/types/auth';

/**
 * A6 (sprint plan Tier 1) — remove the org-admin consent bypass.
 *
 * Written RED against the pre-fix code, per the pre-fix/post-fix discipline.
 *
 * WHY THIS MATTERS: `POST /org-admin/access-requests/<id>/review/` was REMOVED
 * by the backend as a deliberate security fix (audit ORGADMIN-1). It allowed an
 * organisation admin to approve another org's request to read a patient's
 * records WITHOUT that patient's consent — and patient consent is the entire
 * point of the access-request flow. The frontend never stopped calling it.
 *
 * Today the call 404s, so the org admin sees "Failed" and nothing happens. That
 * is a *broken* control, not a safe one: the UI still presents Approve/Deny as
 * an admin's decision to make, which is exactly the mental model the backend
 * removed. With real PHI arriving 3 Sep, the affordance has to go, not just fail.
 *
 * The read-only list stays — an org admin can still SEE requests, which is
 * legitimate oversight. Approving is the patient's decision, made through the
 * consent link (or in-app, DASH-6/D6).
 */

// Sidebar/Header use next/navigation for logout — not under test here.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/demo-clinic/org-admin',
}));

// The whole data layer is mocked at the client-api seam — useApi and
// usePaginatedList run for real on top of these spies.
vi.mock('@/lib/client-api', () => ({
  dataGet: vi.fn(),
  dataAction: vi.fn(),
  redirectToSignin: vi.fn(),
  ClientApiError: class ClientApiError extends Error {
    constructor(
      public status: number,
      public data: unknown,
      message: string,
    ) {
      super(message);
      this.name = 'ClientApiError';
    }
  },
}));

import { dataGet, dataAction } from '@/lib/client-api';
const dataGetMock = vi.mocked(dataGet);
const dataActionMock = vi.mocked(dataAction);

const user = {
  id: 'oa1',
  email: 'admin@demo.test',
  first_name: 'Amaka',
  last_name: 'Eze',
  role: 'ORGANIZATION_ADMIN',
  organization_slug: 'demo-clinic',
} as unknown as User;

const stats = {
  total_staff: 12,
  total_patients: 340,
  active_episodes: 8,
  pending_access_requests: 1,
};

// A PENDING request — the only status that ever rendered the action buttons.
const pendingRequest = {
  id: 'ar-1',
  patient_name: 'Chidi Nwosu',
  staff_name: 'Dr Bello (Lagos General)',
  reason: 'Referred for cardiology follow-up',
  status: 'PENDING',
  created_at: '2026-08-11T09:15:00Z',
};

// DRF paged envelope — never a bare array.
const envelope = { count: 1, next: null, previous: null, results: [pendingRequest] };

beforeEach(() => {
  vi.clearAllMocks();
  dataGetMock.mockResolvedValue(envelope);
});

async function openAccessRequestsPage() {
  render(<OrgAdminDashboard user={user} initialStats={stats} slug="demo-clinic" />);
  fireEvent.click(screen.getByRole('button', { name: 'Access Requests' }));
  await waitFor(() => {
    expect(screen.getByText('Chidi Nwosu')).toBeInTheDocument();
  });
}

describe('OrgAdmin access requests (A6 — consent bypass removed)', () => {
  it('still lists access requests read-only', async () => {
    await openAccessRequestsPage();
    expect(screen.getByText('Dr Bello (Lagos General)')).toBeInTheDocument();
    expect(screen.getByText(/cardiology follow-up/)).toBeInTheDocument();
  });

  it('offers NO Approve button on a pending request', async () => {
    await openAccessRequestsPage();
    expect(screen.queryByRole('button', { name: /^approve$/i })).toBeNull();
  });

  it('offers NO Deny button on a pending request', async () => {
    await openAccessRequestsPage();
    expect(screen.queryByRole('button', { name: /^deny$/i })).toBeNull();
  });

  it('renders no Actions column header at all', async () => {
    await openAccessRequestsPage();
    expect(screen.queryByText('Actions')).toBeNull();
  });

  // NOTE: an earlier version of this file asserted "dataAction was never called
  // with /review/". It PASSED against the pre-fix code — nothing in the test
  // clicks anything, so it was trivially true and proved nothing (T2: a test
  // that passed before your change is not a guard). The real guards are the
  // three button/column assertions above, plus the endpoint-constant check in
  // config.test.ts. What follows is the one write-side assertion that is
  // actually load-bearing: the row must offer no decision affordance at all.
  it('renders the pending row with no interactive control of any kind', async () => {
    await openAccessRequestsPage();
    const row = screen.getByText('Chidi Nwosu').closest('tr')!;
    expect(row.querySelectorAll('button, a, input, select')).toHaveLength(0);
  });
});
