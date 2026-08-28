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

import { dataGet, dataAction } from '@/lib/client-api';
const dataGetMock = vi.mocked(dataGet);
const dataActionMock = vi.mocked(dataAction);

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

// Captured shape (FLAG-213, live 2026-08-19): checked_in_at,
// reason_for_visit and a NESTED assigned_doctor. The previous fixture used
// check_in_time / chief_complaint / a string doctor — fields the endpoint has
// never returned — so it agreed with the type and not with the API.
// Captured shape (FLAG-213, live 2026-08-19): checked_in_at,
// reason_for_visit and a NESTED assigned_doctor. The previous fixture used
// check_in_time / chief_complaint / a string doctor — fields this endpoint has
// never returned — so it agreed with the type and disagreed with the API.
function checkIn(i: number) {
  return {
    id: `ci-${i}`,
    queue_number: i,
    patient: { id: `p-${i}`, first_name: 'Patient', last_name: String(i), healthclouda_id: `HCL-000${i}` },
    checked_in_at: new Date().toISOString(),
    assigned_doctor: null,
    reason_for_visit: 'Headache',
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
    // Targeted by its accessible name: D4 added a status filter to this page,
    // so a bare getByRole('combobox') now matches two controls. The per-row
    // label is also what makes the dropdown usable by a screen reader at all.
    expect(screen.getByRole('combobox', { name: 'Assign a doctor to Patient 1' })).toBeInTheDocument();
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

/**
 * D4 Receptionist. Contract facts these lock, all read from the live schema on
 * 2026-08-24 or captured live 2026-08-19 (FLAG-213) — not inferred:
 *
 *  - /receptionist/check-ins/ returns checked_in_at, reason_for_visit,
 *    a NESTED assigned_doctor and queue_number. check_in_time,
 *    chief_complaint and a string doctor never existed.
 *  - The same endpoint DEFAULTS TO TODAY and applies date before status, so
 *    the date must be sent explicitly or the queue silently shows one day.
 *  - POST /patients/ is RECEPTIONIST-allowed, requires only first/last name,
 *    and its 201 returns NO id and NO healthclouda_id (backend #137).
 *  - has_portal_account is on PatientDetail only, never on a list or search.
 */
describe('D4 — the check-in queue reads the real payload', () => {
  const queue = {
    count: 2,
    next: null,
    previous: null,
    results: [
      {
        id: 'ci-1',
        queue_number: 1,
        patient: { id: 'p-1', first_name: 'Chidi', last_name: 'Nwosu', healthclouda_id: 'HCL-05CS2Q' },
        checked_in_at: '2026-08-24T09:15:00Z',
        assigned_doctor: null,
        checked_in_by: { first_name: 'Amara', last_name: 'Eze' },
        reason_for_visit: 'Persistent headache',
        status: 'WAITING',
      },
      {
        id: 'ci-2',
        queue_number: 2,
        patient: { id: 'p-2', first_name: 'Ngozi', last_name: 'Bello', healthclouda_id: 'HCL-CCBV02' },
        checked_in_at: '2026-08-24T09:40:00Z',
        assigned_doctor: { id: 'd-1', first_name: 'Ada', last_name: 'Obi' },
        checked_in_by: { first_name: 'Amara', last_name: 'Eze' },
        reason_for_visit: 'Follow-up',
        status: 'CALLED',
      },
    ],
  };

  async function openCheckIns() {
    dataGetMock.mockImplementation((path: string) => {
      if (path.startsWith(ENDPOINTS.REC_CHECK_INS)) return Promise.resolve(queue);
      return Promise.resolve(emptyPage);
    });
    render(<ReceptionistDashboard user={user} initialStats={stats} slug="acme" />);
    fireEvent.click(screen.getByRole('button', { name: 'Check-ins' }));
    await waitFor(() => expect(screen.getByText('Chidi Nwosu')).toBeInTheDocument());
  }

  it('renders reason, queue number and the nested doctor — not blank cells', async () => {
    await openCheckIns();
    const row = screen.getByText('Chidi Nwosu').closest('tr');
    expect(row!.textContent).toContain('Persistent headache');
    expect(row!.textContent).toContain('HCL-05CS2Q');
    // The pre-fix code read chief_complaint / check_in_time / a string doctor,
    // so every one of these cells rendered empty against this exact payload.
    const assigned = screen.getByText('Ngozi Bello').closest('tr');
    expect(assigned!.textContent).toContain('Ada Obi');
  });

  it('sends an explicit ?date= rather than relying on the server default', async () => {
    await openCheckIns();
    const paths = dataGetMock.mock.calls.map((c) => c[0] as string);
    // The overview ALSO hits this endpoint with its own ?page_size=6 preview
    // query, so select the list-page calls (usePaginatedList sends page_size=20).
    const pageCalls = paths.filter((p) => p.startsWith(ENDPOINTS.REC_CHECK_INS) && p.includes('page_size=20'));
    expect(pageCalls.length).toBeGreaterThan(0);
    const checkInCall = pageCalls[0];
    // 🪤 FLAG-213: this endpoint silently defaults to today, and status is
    // applied AFTER date. Sending the date explicitly is what makes the empty
    // queue explicable instead of looking broken.
    expect(checkInCall).toMatch(/\?date=\d{4}-\d{2}-\d{2}/);
  });

  it('refetches when the receptionist picks another date', async () => {
    await openCheckIns();
    const before = dataGetMock.mock.calls.length;
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-08-13' } });
    await waitFor(() => expect(dataGetMock.mock.calls.length).toBeGreaterThan(before));
    const paths = dataGetMock.mock.calls.map((c) => c[0] as string);
    expect(paths.some((p) => p.includes('date=2026-08-13'))).toBe(true);
  });
});

describe('D4 — registering a patient', () => {
  async function openRegister() {
    dataGetMock.mockResolvedValue(emptyPage);
    render(<ReceptionistDashboard user={user} initialStats={stats} slug="acme" />);
    fireEvent.click(screen.getByRole('button', { name: 'Patient Search' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Register patient' }));
    await screen.findByLabelText('First name *');
  }

  it('posts to /patients/ and omits fields the receptionist left blank', async () => {
    dataActionMock.mockResolvedValue({});
    await openRegister();

    fireEvent.change(screen.getByLabelText('First name *'), { target: { value: 'Ada' } });
    fireEvent.change(screen.getByLabelText('Last name *'), { target: { value: 'Bello' } });
    fireEvent.change(screen.getByLabelText(/^Phone/), { target: { value: '08030000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create patient record' }));

    await waitFor(() => expect(dataActionMock).toHaveBeenCalled());
    const [path, method, body] = dataActionMock.mock.calls[0];
    expect(path).toBe(ENDPOINTS.PATIENTS);
    expect(method).toBe('POST');
    expect(body).toEqual({ first_name: 'Ada', last_name: 'Bello', phone: '08030000000' });
    // Empty optional fields must be ABSENT, not ''. The serializer treats the
    // two differently and '' for date_of_birth is a 400.
    expect(Object.keys(body as object)).not.toContain('date_of_birth');
    expect(Object.keys(body as object)).not.toContain('email');
  });

  it('does not claim an HCL-ID it was never given', async () => {
    dataActionMock.mockResolvedValue({});
    await openRegister();
    fireEvent.change(screen.getByLabelText('First name *'), { target: { value: 'Ada' } });
    fireEvent.change(screen.getByLabelText('Last name *'), { target: { value: 'Bello' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create patient record' }));

    // POST /patients/ returns no id and no healthclouda_id (backend #137). The
    // screen must say so and point at search — NOT invent an ID, and NOT
    // silently search and present whichever result comes back first, which
    // could hand the patient someone else's identifier.
    const notice = await screen.findByText(/has been registered/);
    expect(notice.textContent).toContain('Ada Bello');
    expect(screen.getByText(/does not return the new HealthClouda ID/)).toBeInTheDocument();
    expect(screen.queryByText(/^HCL-/)).not.toBeInTheDocument();
  });
});

describe('D4 — portal invite and contact edit', () => {
  const found = {
    count: 1,
    next: null,
    previous: null,
    results: [{
      id: 'p-1', healthclouda_id: 'HCL-05CS2Q', first_name: 'Chidi', last_name: 'Nwosu',
      masked_phone: '080****1234', has_visited_org: true,
      has_pending_access_request: false, has_approved_access: true,
    }],
  };
  // has_portal_account is on PatientDetail ONLY — this is why opening the
  // panel costs a second fetch.
  const detail = {
    id: 'p-1', healthclouda_id: 'HCL-05CS2Q', first_name: 'Chidi', last_name: 'Nwosu',
    email: 'chidi@example.test', phone: '08031231234', has_portal_account: false,
  };

  async function openPanel() {
    dataGetMock.mockImplementation((path: string) => {
      if (path.startsWith(ENDPOINTS.PATIENT('p-1'))) return Promise.resolve(detail);
      if (path.startsWith(ENDPOINTS.REC_PATIENT_SEARCH)) return Promise.resolve(found);
      return Promise.resolve(emptyPage);
    });
    render(<ReceptionistDashboard user={user} initialStats={stats} slug="acme" />);
    fireEvent.click(screen.getByRole('button', { name: 'Patient Search' }));
    fireEvent.change(await screen.findByLabelText(/Search patients/), { target: { value: 'Chidi' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    fireEvent.click(await screen.findByRole('button', { name: /Portal & contact/ }));
    await screen.findByText('No portal account yet.');
  }

  it('sends the invite to the receptionist-scoped path', async () => {
    dataActionMock.mockResolvedValue({});
    await openPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Send portal invite' }));
    await waitFor(() => expect(dataActionMock).toHaveBeenCalled());
    expect(dataActionMock.mock.calls[0][0]).toBe(ENDPOINTS.REC_SEND_PORTAL_INVITE('p-1'));
    expect(dataActionMock.mock.calls[0][1]).toBe('POST');
  });

  it('PATCHes contact info only — the one thing a receptionist may edit', async () => {
    dataActionMock.mockResolvedValue({});
    await openPanel();
    fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: 'new@example.test' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Save email' }));
    await waitFor(() => expect(dataActionMock).toHaveBeenCalled());
    const [path, method, body] = dataActionMock.mock.calls[0];
    expect(path).toBe(ENDPOINTS.PATIENT('p-1'));
    expect(method).toBe('PATCH');
    // The schema says RECEPTIONIST may update "contact info only" — sending
    // anything else earns a 403 the receptionist cannot act on.
    expect(body).toEqual({ email: 'new@example.test' });
  });

  it('will not offer an invite with no email to send it to', async () => {
    dataGetMock.mockImplementation((path: string) => {
      if (path.startsWith(ENDPOINTS.PATIENT('p-1'))) return Promise.resolve({ ...detail, email: null });
      if (path.startsWith(ENDPOINTS.REC_PATIENT_SEARCH)) return Promise.resolve(found);
      return Promise.resolve(emptyPage);
    });
    render(<ReceptionistDashboard user={user} initialStats={stats} slug="acme" />);
    fireEvent.click(screen.getByRole('button', { name: 'Patient Search' }));
    fireEvent.change(await screen.findByLabelText(/Search patients/), { target: { value: 'Chidi' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    fireEvent.click(await screen.findByRole('button', { name: /Portal & contact/ }));
    expect(await screen.findByRole('button', { name: 'Send portal invite' })).toBeDisabled();
  });
});
