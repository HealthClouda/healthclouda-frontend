import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DoctorDashboard } from './DoctorDashboard';
import { ENDPOINTS } from '@/lib/config';
import type { User } from '@/types/auth';

/**
 * RED-first tests for D5, covering FLAG-004 (E1) and the doctor half of
 * FLAG-213. Every fixture below is the shape the API actually returns, not a
 * hand-written guess — that distinction is the whole point. On `develop` the
 * D2 tables passed 108 green tests while rendering blank rows, because the
 * fixtures encoded the invented shape rather than the real one.
 *
 * Contract verified against the live schema at
 * https://api-dev.healthclouda.com/api/v1/schema/ on 2026-08-22:
 *
 *  - EpisodeListStatusEnum = ["ACTIVE","COMPLETED"]. There is no "OPEN", so
 *    `?status=OPEN` can never match a row (FLAG-004).
 *  - Neither /doctor/episodes/ nor /doctor/appointments/ documents ANY query
 *    parameter — not even `page`. On this backend that is NOT evidence of
 *    non-support (see the correction inside FLAG-205), so absence justifies
 *    verifying, never concluding. What it does mean is that we cannot claim
 *    `?today=` is honoured, and an unhonoured filter returns ALL appointments
 *    while the heading still says "Today". So today-ness is filtered
 *    client-side here, which is correct whether or not the server supports it.
 *  - Appointment payload fields (captured live 2026-08-19, FLAG-213):
 *    scheduled_at, duration_minutes, doctor{}, patient{}, booked_by{}, reason,
 *    notes, cancelled_at, cancellation_reason, created_at.
 *    `appointment_date`, `appointment_time` and `doctor_name` DO NOT EXIST.
 */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/demo-clinic/doctor',
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
  id: 'd1',
  email: 'doctor@demo.test',
  first_name: 'Emeka',
  last_name: 'Okafor',
  role: 'DOCTOR',
  organization_slug: 'demo-clinic',
  is_on_duty: true,
} as unknown as User;

const stats = {
  active_episodes: 4,
  appointments_today: 2,
  pending_referrals: 1,
  active_prescriptions: 3,
};

// Real appointment shape — FLAG-213, captured live 2026-08-19.
// NOTE: no appointment_date, no appointment_time, no doctor_name.
function appointmentAt(iso: string, id = 'appt-1') {
  return {
    id,
    scheduled_at: iso,
    duration_minutes: 30,
    patient: { id: 'p1', first_name: 'Chidi', last_name: 'Nwosu' },
    doctor: { id: 'd1', first_name: 'Emeka', last_name: 'Okafor' },
    booked_by: { id: 'r1', first_name: 'Ada', last_name: 'Obi' },
    reason: 'Follow-up consultation',
    notes: 'Bring previous scan results',
    cancelled_at: null,
    cancellation_reason: null,
    status: 'SCHEDULED',
    created_at: '2026-08-10T09:00:00Z',
  };
}

// Real episode shape — status enum is ACTIVE | COMPLETED.
// Deliberately a DIFFERENT patient from the appointment fixtures: the overview
// renders appointments and episodes side by side, so a shared name makes every
// name assertion ambiguous rather than wrong — it fails as "found multiple
// elements", which reads like a component bug and isn't one.
const episode = {
  id: 'ep-1',
  patient: { id: 'p9', first_name: 'Ifeoma', last_name: 'Nwachukwu' },
  chief_complaint: 'High blood pressure follow-up',
  status: 'ACTIVE',
  created_at: '2026-08-20T08:15:00Z',
};

/** Local midday today, so the client-side "today" filter is timezone-stable. */
function todayAtNoonIso() {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

function daysFromNowIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

let appointments: ReturnType<typeof appointmentAt>[] = [];

function mockBackend() {
  dataGetMock.mockImplementation((path: string) => {
    if (path.startsWith(ENDPOINTS.DOC_APPOINTMENTS)) {
      return Promise.resolve({ count: appointments.length, results: appointments });
    }
    if (path.startsWith(ENDPOINTS.DOC_EPISODES)) {
      return Promise.resolve({ count: 1, results: [episode] });
    }
    return Promise.resolve({ count: 0, results: [] });
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  appointments = [appointmentAt(todayAtNoonIso())];
  mockBackend();
});

function urlsFor(prefix: string) {
  return dataGetMock.mock.calls.map(c => String(c[0])).filter(u => u.startsWith(prefix));
}

describe('FLAG-004 / E1 — the doctor overview stops sending params the backend ignores', () => {
  it('never requests ?status=OPEN — the enum is ACTIVE | COMPLETED, so OPEN matches nothing', async () => {
    render(<DoctorDashboard user={user} initialStats={stats} slug="demo-clinic" />);

    await waitFor(() => expect(urlsFor(ENDPOINTS.DOC_EPISODES).length).toBeGreaterThan(0));
    const episodeUrls = urlsFor(ENDPOINTS.DOC_EPISODES);

    expect(episodeUrls.filter(u => /[?&]status=OPEN\b/.test(u))).toHaveLength(0);
    expect(episodeUrls.some(u => /[?&]status=ACTIVE\b/.test(u))).toBe(true);
  });

  it('never requests the invented ?today= param on appointments', async () => {
    render(<DoctorDashboard user={user} initialStats={stats} slug="demo-clinic" />);

    await waitFor(() => expect(urlsFor(ENDPOINTS.DOC_APPOINTMENTS).length).toBeGreaterThan(0));
    expect(urlsFor(ENDPOINTS.DOC_APPOINTMENTS).filter(u => /[?&]today=/.test(u))).toHaveLength(0);
  });

  it('shows only today\'s appointments under a heading that says Today', async () => {
    // One today, two not — each with a distinct patient so presence and absence
    // are both assertable. The old code asked the server with ?today=true and
    // rendered whatever came back, so an ignored filter listed all three under
    // a heading that says "Today's Appointments".
    const today = appointmentAt(todayAtNoonIso(), 'today-1');
    const future = { ...appointmentAt(daysFromNowIso(3), 'future-1'), patient: { id: 'p2', first_name: 'Amaka', last_name: 'Eze' } };
    const past = { ...appointmentAt(daysFromNowIso(-2), 'past-1'), patient: { id: 'p3', first_name: 'Tunde', last_name: 'Bello' } };
    appointments = [today, future, past];
    mockBackend();

    render(<DoctorDashboard user={user} initialStats={stats} slug="demo-clinic" />);

    // Today's patient shows on the overview card…
    expect(await screen.findByText('Chidi Nwosu')).toBeInTheDocument();
    // …and the other two do not.
    expect(screen.queryByText('Amaka Eze')).not.toBeInTheDocument();
    expect(screen.queryByText('Tunde Bello')).not.toBeInTheDocument();
  });
});

describe('FLAG-004 — the Episodes PAGE had the same bug as the overview panel', () => {
  it('defaults to ?status=ACTIVE, never ?status=OPEN', async () => {
    render(<DoctorDashboard user={user} initialStats={stats} slug="demo-clinic" />);
    fireEvent.click(screen.getByRole('button', { name: 'Episodes' }));

    await waitFor(() => expect(urlsFor(ENDPOINTS.DOC_EPISODES).length).toBeGreaterThan(0));
    const urls = urlsFor(ENDPOINTS.DOC_EPISODES);
    expect(urls.filter(u => /[?&]status=(OPEN|CLOSED)\b/.test(u))).toHaveLength(0);
    expect(urls.some(u => /[?&]status=ACTIVE\b/.test(u))).toBe(true);
  });

  it('offers Completed as a filter, not the non-existent Closed', async () => {
    render(<DoctorDashboard user={user} initialStats={stats} slug="demo-clinic" />);
    fireEvent.click(screen.getByRole('button', { name: 'Episodes' }));

    expect(await screen.findByRole('button', { name: 'Completed' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Closed' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open' })).not.toBeInTheDocument();
  });

  it('renders the Complete action on an ACTIVE episode — it never rendered before', async () => {
    // The row action was gated on `ep.status === 'OPEN'`. No episode is ever
    // OPEN (the enum is ACTIVE | COMPLETED), so complete-episode — one of the
    // few write workflows that exist at all — was unreachable in the UI.
    render(<DoctorDashboard user={user} initialStats={stats} slug="demo-clinic" />);
    fireEvent.click(screen.getByRole('button', { name: 'Episodes' }));

    expect(await screen.findByRole('button', { name: /Complete/i })).toBeInTheDocument();
  });
});

describe('D5 — the shared filter control is announceable', () => {
  it('groups the episode filters and marks the active one with aria-pressed', async () => {
    render(<DoctorDashboard user={user} initialStats={stats} slug="demo-clinic" />);
    fireEvent.click(screen.getByRole('button', { name: 'Episodes' }));

    const group = await screen.findByRole('group', { name: /filter episodes by status/i });
    expect(group).toBeInTheDocument();

    // Active is the default, so it is the pressed one — a screen reader user
    // otherwise has no way to tell which filter is applied, because the only
    // signal is the pill's background colour.
    expect(screen.getByRole('button', { name: 'Active' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Completed' })).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(screen.getByRole('button', { name: 'Completed' }));
    expect(screen.getByRole('button', { name: 'Completed' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('FLAG-213 (doctor half) — appointments render the real payload', () => {
  it('renders a real date from scheduled_at rather than a blank appointment_date', async () => {
    render(<DoctorDashboard user={user} initialStats={stats} slug="demo-clinic" />);
    fireEvent.click(screen.getByRole('button', { name: 'Appointments' }));

    // Old code called formatDate(a.appointment_date) — undefined — so the
    // cell rendered blank/invalid against real data while the row still drew.
    const cell = await screen.findByTestId('appt-when-appt-1');
    expect(cell.textContent?.trim()).not.toBe('');
    expect(cell.textContent).not.toMatch(/invalid|undefined|NaN/i);
  });

  it('renders the doctor from the nested doctor object, not doctor_name', async () => {
    render(<DoctorDashboard user={user} initialStats={stats} slug="demo-clinic" />);
    fireEvent.click(screen.getByRole('button', { name: 'Appointments' }));

    const cell = await screen.findByTestId('appt-doctor-appt-1');
    expect(cell.textContent).toMatch(/Emeka Okafor/);
  });

  it('renders the patient name from the nested patient object', async () => {
    render(<DoctorDashboard user={user} initialStats={stats} slug="demo-clinic" />);
    fireEvent.click(screen.getByRole('button', { name: 'Appointments' }));

    expect(await screen.findByText(/Chidi Nwosu/)).toBeInTheDocument();
  });
});

/**
 * D5 write workflows. Every contract fact here was read from the live schema on
 * 2026-08-24 before the feature was built:
 *
 *  - POST /episodes/ is fully specified and its description says "Create
 *    episode (doctor/nurse)". POST /doctor/episodes/ documents NO request body
 *    (FLAG-218), so the generic viewset is the one we can build against.
 *  - `patient` is the only required field; `episode_type` is a real enum.
 *  - The 201 returns no `id` (FLAG-219), so this refetches rather than
 *    navigating to the episode it just created.
 */
describe('D5 — starting an episode', () => {
  const patientsPage = {
    count: 1,
    next: null,
    previous: null,
    results: [{
      id: 'pat-1',
      first_name: 'Chidi',
      last_name: 'Nwosu',
      email: 'chidi@example.test',
      phone_number: '08031231234',
      date_of_birth: '1990-04-02',
      created_at: '2026-07-01T10:00:00Z',
    }],
  };

  async function openPanel() {
    dataGetMock.mockImplementation((path: string) => {
      if (path.startsWith(ENDPOINTS.DOC_MY_PATIENTS)) return Promise.resolve(patientsPage);
      return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
    });
    render(<DoctorDashboard user={user} initialStats={null} slug="demo-clinic" />);
    fireEvent.click(screen.getByRole('button', { name: 'My Patients' }));
    fireEvent.click(await screen.findByRole('button', { name: 'New episode' }));
    await screen.findByLabelText(/Episode type/);
  }

  it('posts to the DOCUMENTED episodes endpoint, not the doctor-scoped one', async () => {
    dataActionMock.mockResolvedValue({});
    await openPanel();
    fireEvent.change(screen.getByLabelText(/Chief complaint/), { target: { value: 'Chest pain' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start episode' }));

    await waitFor(() => expect(dataActionMock).toHaveBeenCalled());
    const [path, method, body] = dataActionMock.mock.calls[0];
    expect(path).toBe(ENDPOINTS.EPISODES);
    expect(path).not.toBe(ENDPOINTS.DOC_EPISODES);
    expect(method).toBe('POST');
    expect(body).toMatchObject({ patient: 'pat-1', episode_type: 'OUTPATIENT', chief_complaint: 'Chest pain' });
  });

  it('sends the patient id and omits every field left blank', async () => {
    dataActionMock.mockResolvedValue({});
    await openPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Start episode' }));
    await waitFor(() => expect(dataActionMock).toHaveBeenCalled());
    const body = dataActionMock.mock.calls[0][2] as Record<string, unknown>;
    // `patient` is the only REQUIRED field in the schema; empty optionals must
    // be absent rather than '' — the serializer treats the two differently.
    expect(body.patient).toBe('pat-1');
    expect(Object.keys(body)).not.toContain('diagnosis');
    expect(Object.keys(body)).not.toContain('clinical_notes');
  });

  it('offers only the four episode types the enum actually allows', async () => {
    await openPanel();
    const select = screen.getByLabelText(/Episode type/) as HTMLSelectElement;
    const values = Array.from(select.options).map(o => o.value);
    // Free text or an invented value here is a 400. Enum read from the live
    // schema 2026-08-24.
    expect(values).toEqual(['OUTPATIENT', 'INPATIENT', 'EMERGENCY', 'CONSULTATION']);
  });
});

/**
 * FLAG-280 (backend): accepting or declining a referral is now the RECEIVING
 * organisation's ORGANIZATION_ADMIN, and "a doctor can no longer self-accept" —
 * stated verbatim in the live schema on both /referrals/{id}/accept/ and the
 * doctor-namespaced path. The sprint plan flagged this change as due ~20 Aug
 * and told us to re-read Swagger before building; this test is that re-read,
 * pinned so nobody adds the buttons back later.
 */
describe('D5 — referral accept/decline is NOT the doctor’s to make', () => {
  it('renders referrals read-only, with no accept or decline action', async () => {
    dataGetMock.mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [{
        id: 'ref-1',
        status: 'PENDING',
        reason: 'Cardiology opinion',
        created_at: '2026-08-20T09:00:00Z',
        patient: { id: 'pat-1', first_name: 'Chidi', last_name: 'Nwosu' },
      }],
    });
    render(<DoctorDashboard user={user} initialStats={null} slug="demo-clinic" />);
    fireEvent.click(screen.getByRole('button', { name: 'Referrals' }));
    await screen.findByText('Cardiology opinion');

    // A button here would 403 every time — an affordance the doctor cannot use
    // and cannot understand.
    expect(screen.queryByRole('button', { name: /accept/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /decline/i })).not.toBeInTheDocument();
  });
});
