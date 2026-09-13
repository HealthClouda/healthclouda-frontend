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

// FLAG-231 / FLAG-232 — this fixture is the PUBLISHED `PatientDashboard`
// component (backend #161), not our old interface.
//
// 🔴 It used to read `{upcoming_appointments, active_episodes,
// pending_access_requests, unread_notifications}` — two of which this endpoint
// has never sent. That is FLAG-221 in miniature: the fixture was typed from the
// same wrong assumption as the component, so the suite agreed with the bug and
// stayed green while two tiles were guaranteed to render an em dash.
//
// ⚠️ `tsc` could not catch it either. The extra keys live on a named const
// rather than an inline object literal, so excess-property checking never
// applies, and the two fields the interface *does* require are present.
const stats = {
  active_episodes: 1,
  unread_notifications: 2,
  total_episodes: 4,
  completed_episodes: 3,
  last_visit_date: '2026-08-27',
  last_visit_organization: 'Demo Clinic',
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
    render(<PatientDashboard user={user} initialStats={stats} />);

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

    render(<PatientDashboard user={user} initialStats={stats} />);
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

    render(<PatientDashboard user={user} initialStats={stats} />);
    fireEvent.click(screen.getByRole('button', { name: 'Appointments' }));

    expect(await screen.findByText(/Doctor unavailable/)).toBeInTheDocument();
  });

  it('filters by status via ?status= and resets to page 1', async () => {
    mockAppointments([appointment]);

    render(<PatientDashboard user={user} initialStats={stats} />);
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

/**
 * FLAG-231 / FLAG-232 — the stat-tile contract, asserted against the PUBLISHED
 * payload shape rather than against our own interface.
 *
 * 🔴 **This is the test that was missing.** `StatCard` renders `{value ?? '—'}`,
 * so a tile bound to a field the API never sends is an em dash, not an error —
 * and every other layer agreed with the bug: the old fixture carried the same
 * two phantom keys as the component (FLAG-221), and `tsc` cannot help because
 * excess-property checking does not apply to a named const.
 *
 * ⚠️ It must fail against the pre-fix component. It does: with `stats` shaped
 * like the real payload, "Upcoming Appts" read `stats.upcoming_appointments`,
 * got `undefined`, and rendered '—'. That is the RED this repo requires before
 * a fix counts (CLAUDE.md §5, and the discipline FLAG-221 exists to enforce).
 */
describe('FLAG-231 — overview stat tiles read fields the endpoint actually publishes', () => {
  // span(label) -> div.flex -> the StatCard root, which holds p.tabular-nums.
  //
  // `getAllByText` + a tag/class filter, not `getByText`: "Notifications" is BOTH
  // a tile label and the <h2> of the panel below it, so a bare lookup matches two
  // elements and throws. Only the tile label is an uppercase <span>.
  function tileValue(label: string): string {
    const span = screen
      .getAllByText(label)
      .find((el) => el.tagName === 'SPAN' && el.className.includes('uppercase'));
    if (!span) throw new Error(`no stat tile labelled "${label}"`);
    const tile = span.parentElement!.parentElement!;
    return tile.querySelector('p.tabular-nums')?.textContent?.trim() ?? '';
  }

  it('renders a real number in every tile — no em dash, no NaN', async () => {
    mockAppointments([appointment, { ...appointment, id: 'a2' }, { ...appointment, id: 'a3' }]);
    render(<PatientDashboard user={user} initialStats={stats} />);

    // "Upcoming Appts" is the envelope count of the list this page already
    // fetches and displays, not a stats field — so it settles asynchronously.
    await waitFor(() => expect(tileValue('Upcoming Appts')).toBe('3'));

    expect(tileValue('Active Episodes')).toBe('1');
    expect(tileValue('Notifications')).toBe('2');

    for (const label of ['Upcoming Appts', 'Active Episodes', 'Notifications']) {
      expect(tileValue(label), `tile "${label}" is bound to a field the API does not send`)
        .not.toMatch(/^(—|NaN|undefined)$/);
    }
  });

  it('does not render the two tiles whose fields this endpoint never published', () => {
    render(<PatientDashboard user={user} initialStats={stats} />);
    // `pending_access_requests` has no published equivalent and was not
    // repointed at a plausible neighbour (the FLAG-222 rule). Access & Referrals
    // stays reachable from the sidebar nav, which is why removing the tile costs
    // the patient nothing.
    expect(screen.queryByText('Access Requests')).toBeNull();
  });

  it('reads no field that the published PatientDashboard component lacks', () => {
    // Guards the regression directly: if someone re-adds a phantom key to the
    // fixture to make a tile "work", this fails and says why.
    const published = new Set([
      'total_episodes', 'active_episodes', 'completed_episodes', 'last_visit_date',
      'last_visit_organization', 'current_admission', 'active_prescriptions',
      'active_instructions', 'organizations_visited', 'unread_notifications',
    ]);
    for (const key of Object.keys(stats)) {
      expect(published.has(key), `fixture key "${key}" is not in the published component`).toBe(true);
    }
  });
});
