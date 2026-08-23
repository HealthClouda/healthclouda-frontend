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

import { dataGet } from '@/lib/client-api';
const dataGetMock = vi.mocked(dataGet);

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
