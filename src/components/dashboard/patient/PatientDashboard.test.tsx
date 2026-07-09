import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PatientDashboard } from './PatientDashboard';
import { ENDPOINTS } from '@/lib/config';
import type { User } from '@/types/auth';

/**
 * Pre-fix tests for CONTRACT-AUDIT PR 5 slice (PATIENT-1), written RED
 * against the buggy code per the pre-fix/post-fix discipline:
 *
 *  - PATIENT-1: `GET /patients/me/appointments/` shipped 2026-07-09
 *    (backend PR #65, verified live same day). The real contract:
 *    DRF envelope; filters `?status=` (case-insensitive) + `?date=YYYY-MM-DD`;
 *    item shape {id, organization: {name, slug}, doctor_name, scheduled_at,
 *    duration_minutes, status, reason, cancelled_at, cancellation_reason,
 *    created_at}. The dashboard still sends the invented `?upcoming=true`
 *    (silently ignored — GLOBAL-2) and renders pre-contract field names
 *    (`appointment_date` / `appointment_time` / `notes`) that don't exist
 *    → every row shows "—" for its date and drops org/reason entirely.
 */

// Sidebar/Header use next/navigation for logout — not under test here.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/demo-clinic/patient',
}));

// The entire data layer is mocked at the client-api seam — useApi and
// friends run for real on top of these spies.
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

import { dataGet } from '@/lib/client-api';
const dataGetMock = vi.mocked(dataGet);

const user = {
  id: 'p1',
  email: 'patient@demo.test',
  first_name: 'Chidi',
  last_name: 'Nwosu',
  role: 'PATIENT',
  organization_slug: 'demo-clinic',
} as unknown as User;

const stats = {
  upcoming_appointments: 1,
  active_episodes: 1,
  pending_access_requests: 0,
  unread_notifications: 2,
};

const emptyPage = { count: 0, next: null, previous: null, results: [] };

// Real item shape — verified live 2026-07-09 against the seeded Docker backend.
const appointment = {
  id: '1d89df5a-4aec-4158-87f2-18c2cd815487',
  organization: { name: 'Demo Clinic', slug: 'demo-clinic' },
  doctor_name: 'Emeka Okafor',
  scheduled_at: '2026-07-02T10:30:00Z',
  duration_minutes: 30,
  status: 'COMPLETED',
  reason: 'Malaria symptoms',
  cancelled_at: null,
  cancellation_reason: '',
  created_at: '2026-07-09T22:02:21Z',
};

function mockAppointments(results: unknown[]) {
  dataGetMock.mockImplementation((path: string) =>
    path.startsWith(ENDPOINTS.PATIENT_APPOINTMENTS)
      ? Promise.resolve({ count: results.length, next: null, previous: null, results })
      : Promise.resolve(emptyPage),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  dataGetMock.mockResolvedValue(emptyPage);
});

describe('PATIENT-1 — overview upcoming-appointments query uses real filters', () => {
  it('requests ?status=scheduled (NOT the invented ?upcoming=, which DRF ignores)', async () => {
    render(<PatientDashboard user={user} initialStats={stats} slug="demo-clinic" />);

    await waitFor(() => {
      expect(dataGetMock).toHaveBeenCalledWith(
        expect.stringMatching(/patients\/me\/appointments\/.*[?&]status=scheduled/),
      );
    });
    // ?upcoming= is not implemented backend-side — sending it means the
    // "Upcoming" panel actually shows ALL appointments (GLOBAL-2 pattern).
    const upcomingCalls = dataGetMock.mock.calls.filter((c) => /[?&]upcoming=/.test(String(c[0])));
    expect(upcomingCalls).toHaveLength(0);
  });
});

describe('PATIENT-1 — appointments page renders the real contract fields', () => {
  it('shows doctor, org name, scheduled date/time and reason from the live shape', async () => {
    mockAppointments([appointment]);

    render(<PatientDashboard user={user} initialStats={stats} slug="demo-clinic" />);
    fireEvent.click(screen.getByRole('button', { name: 'Appointments' }));

    expect(await screen.findByText('Emeka Okafor')).toBeInTheDocument();
    // Date must come from `scheduled_at` (ISO datetime) — the old
    // `appointment_date` field doesn't exist and renders "—".
    expect(screen.getByText(/02 Jul 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Demo Clinic/)).toBeInTheDocument();
    expect(screen.getByText(/Malaria symptoms/)).toBeInTheDocument();
  });

  it('shows the cancellation reason on cancelled appointments', async () => {
    mockAppointments([{
      ...appointment,
      id: 'cx-1',
      status: 'CANCELLED',
      cancelled_at: '2026-07-01T09:00:00Z',
      cancellation_reason: 'Doctor unavailable',
    }]);

    render(<PatientDashboard user={user} initialStats={stats} slug="demo-clinic" />);
    fireEvent.click(screen.getByRole('button', { name: 'Appointments' }));

    expect(await screen.findByText(/Doctor unavailable/)).toBeInTheDocument();
  });

  it('filters by status via ?status= and resets to page 1', async () => {
    mockAppointments([appointment]);

    render(<PatientDashboard user={user} initialStats={stats} slug="demo-clinic" />);
    fireEvent.click(screen.getByRole('button', { name: 'Appointments' }));
    await screen.findByText('Emeka Okafor');

    fireEvent.click(screen.getByRole('button', { name: /^cancelled$/i }));

    await waitFor(() => {
      expect(dataGetMock).toHaveBeenCalledWith(
        expect.stringMatching(/patients\/me\/appointments\/.*[?&]status=cancelled/),
      );
    });
    // Filter switches must land on page 1 (usePaginatedList convention).
    const pagedFilterCalls = dataGetMock.mock.calls.filter((c) =>
      /status=cancelled.*[?&]page=/.test(String(c[0])),
    );
    expect(pagedFilterCalls).toHaveLength(0);
  });
});
