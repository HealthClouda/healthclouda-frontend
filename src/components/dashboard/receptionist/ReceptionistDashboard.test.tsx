import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReceptionistDashboard } from './ReceptionistDashboard';
import { ENDPOINTS } from '@/lib/config';
import type { User } from '@/types/auth';

/**
 * Pre-fix tests for CONTRACT-AUDIT PR 2 (error/pagination hygiene), written
 * RED against the buggy code per the pre-fix/post-fix discipline:
 *
 *  - GLOBAL-1: `?limit=` is not a DRF pagination param (`?page_size=` is) —
 *    the overview "preview" lists silently pull the default 20.
 *  - AUTH-6: `serverFetch` returns null on any failure; dashboards render
 *    `StatCard loading={!stats}` → stat tiles shimmer FOREVER after an
 *    expired-access-token server render. The client must fall back to
 *    fetching stats itself (client-api can refresh the session; the server
 *    render cannot).
 *  - UX-ERR-1: list pages render the EMPTY state ("No check-ins") when the
 *    fetch FAILED — clinically dangerous (empty queue ≠ failed fetch). Must
 *    show a distinct error state with retry.
 *  - PERF-1: Pagination.tsx exists but is never rendered — every list
 *    silently truncates at DRF's default 20 rows.
 *
 * Receptionist is the representative dashboard; the same shared hooks/
 * components fix all six roles.
 */

// Sidebar/Header use next/navigation for logout — not under test here.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/acme/receptionist',
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
  id: 'u1',
  email: 'amara.eze@demo.test',
  first_name: 'Amara',
  last_name: 'Eze',
  role: 'RECEPTIONIST',
  organization_slug: 'acme',
} as unknown as User;

const stats = {
  check_ins_today: 7,
  pending_assignments: 2,
  available_emergency_beds: 3,
  incoming_referrals: 1,
};

const emptyPage = { count: 0, next: null, previous: null, results: [] };

function checkIn(i: number) {
  return {
    id: `ci-${i}`,
    patient_name: `Patient ${i}`,
    chief_complaint: 'Headache',
    check_in_time: new Date().toISOString(),
    assigned_doctor: null,
    status: 'WAITING',
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: every GET resolves to an empty page (individual tests override).
  dataGetMock.mockResolvedValue(emptyPage);
});

describe('GLOBAL-1 — DRF pagination param', () => {
  it('overview preview list requests ?page_size= (NOT ?limit=, which DRF ignores)', async () => {
    render(<ReceptionistDashboard user={user} initialStats={stats} slug="acme" />);

    await waitFor(() => {
      expect(dataGetMock).toHaveBeenCalledWith(expect.stringContaining('page_size=6'));
    });
    const limitCalls = dataGetMock.mock.calls.filter((c) => /[?&]limit=/.test(String(c[0])));
    expect(limitCalls).toHaveLength(0);
  });
});

describe('AUTH-6 — stat tiles must not shimmer forever when the server render failed', () => {
  it('falls back to fetching stats client-side when initialStats is null', async () => {
    dataGetMock.mockImplementation((path: string) =>
      path.startsWith(ENDPOINTS.REC_STATS)
        ? Promise.resolve(stats)
        : Promise.resolve(emptyPage),
    );

    render(<ReceptionistDashboard user={user} initialStats={null} slug="acme" />);

    // The client data layer can single-flight-refresh an expired session;
    // the server render cannot — so the client MUST re-request stats.
    await waitFor(() => {
      expect(dataGetMock).toHaveBeenCalledWith(expect.stringContaining(ENDPOINTS.REC_STATS));
    });
    // …and the tile renders the value instead of an eternal shimmer.
    await waitFor(() => {
      expect(screen.getByText('7')).toBeInTheDocument();
    });
  });
});

describe('UX-ERR-1 — failed fetch must NOT render as an empty state', () => {
  it('shows an error state with retry, not "No check-ins", when the list fetch fails', async () => {
    dataGetMock.mockRejectedValue(new Error('Request failed (HTTP 500)'));

    render(<ReceptionistDashboard user={user} initialStats={stats} slug="acme" />);
    fireEvent.click(screen.getByRole('button', { name: 'Check-ins' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
    // The dangerous lie: an empty-queue message for a failed fetch.
    expect(screen.queryByText(/no check-ins/i)).not.toBeInTheDocument();
  });

  it('retry button refetches the list', async () => {
    dataGetMock.mockRejectedValue(new Error('Request failed (HTTP 500)'));

    render(<ReceptionistDashboard user={user} initialStats={stats} slug="acme" />);
    fireEvent.click(screen.getByRole('button', { name: 'Check-ins' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    // Backend recovers; retry must actually refetch and render the list.
    dataGetMock.mockResolvedValue({ count: 1, next: null, previous: null, results: [checkIn(1)] });
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    await waitFor(() => {
      expect(screen.getByText('Patient 1')).toBeInTheDocument();
    });
  });
});

describe('PERF-1 — pagination UI', () => {
  it('renders page controls when the list has more rows than one page', async () => {
    dataGetMock.mockImplementation((path: string) =>
      path.startsWith(ENDPOINTS.REC_CHECK_INS)
        ? Promise.resolve({
            count: 45, // > default page size → multiple pages
            next: 'next-url',
            previous: null,
            results: Array.from({ length: 20 }, (_, i) => checkIn(i)),
          })
        : Promise.resolve(emptyPage),
    );

    render(<ReceptionistDashboard user={user} initialStats={stats} slug="acme" />);
    fireEvent.click(screen.getByRole('button', { name: 'Check-ins' }));

    await waitFor(() => {
      expect(screen.getByText('Patient 0')).toBeInTheDocument();
    });
    // Pagination.tsx exposes aria-labels "Previous" / "Next" / "Page N".
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument();
  });

  it('clicking page 2 requests ?page=2', async () => {
    dataGetMock.mockImplementation((path: string) =>
      path.startsWith(ENDPOINTS.REC_CHECK_INS)
        ? Promise.resolve({
            count: 45,
            next: 'next-url',
            previous: null,
            results: Array.from({ length: 20 }, (_, i) => checkIn(i)),
          })
        : Promise.resolve(emptyPage),
    );

    render(<ReceptionistDashboard user={user} initialStats={stats} slug="acme" />);
    fireEvent.click(screen.getByRole('button', { name: 'Check-ins' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Page 2' }));

    await waitFor(() => {
      expect(dataGetMock).toHaveBeenCalledWith(
        expect.stringMatching(/receptionist\/check-ins\/.*[?&]page=2/),
      );
    });
  });
});
