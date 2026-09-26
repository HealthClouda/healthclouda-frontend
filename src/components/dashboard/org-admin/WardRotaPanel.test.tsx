import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OrgAdminDashboard } from './OrgAdminDashboard';
import type { User } from '@/types/auth';

/**
 * Build 6 (frontend half) — the ward rota, org admin side (FLAG-046).
 *
 * The contract (`ward.Shift` — fixed 2026-09-17, backend built in parallel):
 * GET/POST/PATCH/DELETE /ward/shifts/, `POST .../hand-over/`. ORG_ADMIN plans
 * shifts; the rota NAMES and ROUTES and never GATES care.
 */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/demo-clinic/org-admin',
}));

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
  active_patients: 340,
  todays_appointments: 0,
  bed_occupancy: '5/20',
  pending_access_requests: 0,
  critical_alerts: 0,
};

const ward = { id: 'w-1', name: 'Emergency', total_beds: 10, occupied_beds: 4 };

const nurse = {
  id: 'n-1', full_name: 'Ngozi Eze', role: 'nurse',
  email: 'ngozi@demo-clinic.test', phone: null, is_active: true,
};

const shift = {
  id: 'sh-1', ward: 'w-1', ward_name: 'Emergency', nurse: 'n-1', nurse_name: 'Ngozi Eze',
  starts_at: '2026-09-17T19:00:00Z', ends_at: '2026-09-18T07:00:00Z',
  is_in_charge: true, created_at: '2026-09-17T10:00:00Z',
};

function routeGet(overrides: Record<string, unknown> = {}) {
  dataGetMock.mockImplementation(async (path: string) => {
    if (path.startsWith('/org-admin/wards/overview/')) return overrides.wards ?? [ward];
    if (path.startsWith('/org-admin/staff/')) return overrides.staff ?? [nurse];
    if (path.startsWith('/ward/shifts/')) return overrides.shifts ?? { count: 1, next: null, previous: null, results: [shift] };
    return { count: 0, next: null, previous: null, results: [] };
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  routeGet();
});

async function openRota() {
  render(<OrgAdminDashboard user={user} initialStats={stats} slug="demo-clinic" />);
  fireEvent.click(screen.getByRole('button', { name: 'Wards & Beds' }));
  await waitFor(() => expect(screen.getByText('Emergency')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: 'Manage rota' }));
  await waitFor(() => expect(screen.getByText('Ngozi Eze')).toBeInTheDocument());
}

describe('OrgAdmin ward rota — read', () => {
  it('lists the ward\'s shifts, including who is in charge', async () => {
    await openRota();
    expect(screen.getAllByText('In charge').length).toBeGreaterThan(0);
  });

  it('queries GET /ward/shifts/ scoped to this ward, not every shift in the org', async () => {
    await openRota();
    expect(dataGetMock).toHaveBeenCalledWith(expect.stringContaining('/ward/shifts/'));
    const shiftCalls = dataGetMock.mock.calls.map(([p]) => p as string).filter((p) => p.startsWith('/ward/shifts/'));
    expect(shiftCalls.length).toBeGreaterThan(0);
    for (const call of shiftCalls) {
      expect(call).toContain('ward_id=w-1');
    }
  });
});

describe('OrgAdmin ward rota — add shift sends offset-safe times', () => {
  it('converts a raw datetime-local value into an ISO string with an offset before POSTing', async () => {
    dataActionMock.mockResolvedValue({ ...shift, id: 'sh-2' });
    await openRota();
    fireEvent.click(screen.getByRole('button', { name: 'Add shift' }));

    await waitFor(() => expect(screen.getByText('Nurse *')).toBeInTheDocument());
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'n-1' } });
    // The raw value a <input type="datetime-local"> produces — no 'Z', no
    // offset. This is the exact string FLAG-242 found being sent as-is.
    const RAW_LOCAL_VALUE = '2026-09-17T19:00';
    fireEvent.change(screen.getByLabelText('Starts *'), { target: { value: RAW_LOCAL_VALUE } });
    fireEvent.change(screen.getByLabelText('Ends *'), { target: { value: '2026-09-18T07:00' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(dataActionMock).toHaveBeenCalled());
    const [, , body] = dataActionMock.mock.calls[0];
    const payload = body as { starts_at: string; ends_at: string };
    // This is the guard: a raw datetime-local value must NEVER reach the
    // wire unchanged, and the value sent must carry a 'Z'/offset.
    expect(payload.starts_at).not.toBe(RAW_LOCAL_VALUE);
    expect(payload.starts_at.endsWith('Z')).toBe(true);
    expect(payload.ends_at.endsWith('Z')).toBe(true);
  });
});

describe('OrgAdmin ward rota — remove', () => {
  it('DELETEs the shift and refetches', async () => {
    dataActionMock.mockResolvedValue({});
    await openRota();
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Remove' }).length).toBeGreaterThan(1));
    const confirmButtons = screen.getAllByRole('button', { name: 'Remove' });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);
    await waitFor(() => {
      expect(dataActionMock).toHaveBeenCalledWith('/ward/shifts/sh-1/', 'DELETE', undefined);
    });
  });
});
