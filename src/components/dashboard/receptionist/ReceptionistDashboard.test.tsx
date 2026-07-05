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

// Real backend field names (GLOBAL-6, shape verified live 2026-07-05).
const stats = {
  todays_patients: 10,
  pending_referrals: 1,
  bed_occupancy_rate: 40,
  emergency_occupancy_rate: 0,
  total_beds: 5,
  occupied_beds: 2,
  emergency_total: 0,
  emergency_occupied: 0,
  awaiting_assignment: 2,
  todays_checkins: 7,
  waiting_queue: 2,
  active_episodes: 10,
  on_duty_doctors: 1,
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

/**
 * Pre-fix tests for CONTRACT-AUDIT PR 3 (receptionist contract fixes), written
 * RED against the buggy code:
 *
 *  - GLOBAL-6 (receptionist slice): stats tiles read invented field names
 *    (`check_ins_today`, `pending_assignments`, `available_emergency_beds`,
 *    `incoming_referrals`); the backend actually returns `todays_checkins`,
 *    `awaiting_assignment`, `total_beds`/`occupied_beds`, `pending_referrals`
 *    (verified live 2026-07-05) — every tile renders undefined.
 *  - REC-3: `/receptionist/doctors/on-duty/` returns a DRF envelope
 *    ({count, results}) — verified live — but the code types it as a bare
 *    array, so `doctors.length` is undefined and the assign-doctor dropdown
 *    NEVER renders.
 *  - REC-2 + GLOBAL-3: search renders Email/DOB (deliberately dropped from
 *    the minimised response) and never shows `healthclouda_id` (HCL-…),
 *    `masked_phone`, or the 3 access flags — the fields that ARE returned.
 */

const liveStats = {
  todays_patients: 14,
  pending_referrals: 1,
  bed_occupancy_rate: 33.3,
  emergency_occupancy_rate: 0,
  total_beds: 9,
  occupied_beds: 3,
  emergency_total: 0,
  emergency_occupied: 0,
  awaiting_assignment: 2,
  todays_checkins: 5,
  waiting_queue: 2,
  active_episodes: 14,
  on_duty_doctors: 1,
};

describe('GLOBAL-6 — stats tiles must read the real backend field names', () => {
  it('renders todays_checkins / awaiting_assignment / available beds / pending_referrals', async () => {
    render(
      <ReceptionistDashboard
        user={user}
        initialStats={liveStats}
        slug="acme"
      />,
    );

    // 5 check-ins today, 2 awaiting assignment, 9-3=6 beds available, 1 pending referral.
    expect(await screen.findByText('5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});

describe('REC-3 — doctors on-duty is a DRF envelope, not a bare array', () => {
  const onDutyEnvelope = {
    count: 1,
    results: [{
      id: 'd1',
      first_name: 'Emeka',
      last_name: 'Okafor',
      email: 'doctor@demo.test',
      is_on_duty: true,
      duty_toggled_at: '2026-07-05T16:35:02Z',
    }],
  };

  it('renders the on-duty strip and the assign-doctor dropdown from envelope.results', async () => {
    dataGetMock.mockImplementation((path: string) =>
      path.startsWith(ENDPOINTS.REC_DOCTORS_ON_DUTY)
        ? Promise.resolve(onDutyEnvelope)
        : path.startsWith(ENDPOINTS.REC_CHECK_INS)
          ? Promise.resolve({ count: 1, next: null, previous: null, results: [checkIn(1)] })
          : Promise.resolve(emptyPage),
    );

    render(<ReceptionistDashboard user={user} initialStats={liveStats} slug="acme" />);
    fireEvent.click(screen.getByRole('button', { name: 'Check-ins' }));

    await waitFor(() => {
      expect(screen.getByText('Patient 1')).toBeInTheDocument();
    });
    // Unassigned check-in + a doctor on duty → the dropdown MUST exist.
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getAllByText(/Dr\. Emeka Okafor/).length).toBeGreaterThan(0);
  });
});

describe('REC-2 + GLOBAL-3 — search renders the minimised contract fields', () => {
  const searchResult = {
    id: 'f2cd8de9-8f85-45d2-bd0d-8311d12f3079',
    healthclouda_id: 'HCL-JOJU5R',
    first_name: 'Emeka',
    last_name: 'Adeyemi',
    masked_phone: '080•••3376',
    has_visited_org: true,
    has_pending_access_request: false,
    has_approved_access: false,
  };

  async function searchFor(term: string) {
    fireEvent.click(screen.getByRole('button', { name: 'Patient Search' }));
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: term } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  }

  it('shows HCL-ID, masked phone and access status — not Email/DOB', async () => {
    dataGetMock.mockImplementation((path: string) =>
      path.startsWith(ENDPOINTS.REC_PATIENT_SEARCH)
        ? Promise.resolve({ count: 1, results: [searchResult] })
        : Promise.resolve(emptyPage),
    );

    render(<ReceptionistDashboard user={user} initialStats={liveStats} slug="acme" />);
    await searchFor('ade');

    expect(await screen.findByText('HCL-JOJU5R')).toBeInTheDocument(); // GLOBAL-3
    expect(screen.getByText('080•••3376')).toBeInTheDocument();
    // has_visited_org=true, no pending request, no approved access → "visited" status.
    expect(screen.getByText(/visited/i)).toBeInTheDocument();
    // Columns for fields the minimised response deliberately drops must be gone.
    expect(screen.queryByText(/date of birth/i)).not.toBeInTheDocument();
  });

  it('surfaces approved access as the patient access status', async () => {
    dataGetMock.mockImplementation((path: string) =>
      path.startsWith(ENDPOINTS.REC_PATIENT_SEARCH)
        ? Promise.resolve({
            count: 1,
            results: [{ ...searchResult, has_approved_access: true }],
          })
        : Promise.resolve(emptyPage),
    );

    render(<ReceptionistDashboard user={user} initialStats={liveStats} slug="acme" />);
    await searchFor('ade');

    expect(await screen.findByText(/access granted/i)).toBeInTheDocument();
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
