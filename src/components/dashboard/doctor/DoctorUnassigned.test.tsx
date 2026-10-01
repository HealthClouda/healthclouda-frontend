import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { DoctorDashboard } from './DoctorDashboard';
import { ENDPOINTS } from '@/lib/config';
import type { User } from '@/types/auth';

/**
 * FLAG-607 follow-up (owner decision 2b, 28 Sep): every doctor sees the
 * admissions no doctor owns. Backend FLAG-618
 * (HealthClouda/healthclouda-backend#245): `GET /ward/admissions/?unassigned=true`
 * = no attending doctor AND no case doctor, combinable with `status` and
 * `needs_doctor_review`. Any doctor may already take one over
 * (`reassign-doctor`) or review its discharge (`doctor-review`).
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
  id: 'd1', email: 'doctor@demo.test', first_name: 'Emeka', last_name: 'Okafor',
  role: 'DOCTOR', organization_slug: 'demo-clinic', is_on_duty: true,
} as unknown as User;

function admission(id: string, first: string, last: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    patient: { id: `p-${id}`, healthclouda_id: `HCL-${id}`, first_name: first, last_name: last },
    bed: { id: `b-${id}`, bed_number: 'GW-06', ward: { id: 'w1', name: 'General Ward' } },
    status: 'ACTIVE',
    admission_reason: 'Observation',
    admitted_at: '2026-09-28T10:00:00Z',
    attending_doctor: null,
    attending_doctor_name: null,
    needs_attending_doctor: true,
    needs_doctor_review: false,
    ...extra,
  };
}

const unowned = admission('u1', 'Rita', 'Nobody');
const unownedDeath = admission('u2', 'Tayo', 'Lost', {
  status: 'DISCHARGED', needs_attending_doctor: false, needs_doctor_review: true,
  discharge_outcome: 'DECEASED', deceased_at: '2026-09-29T03:00:00Z',
  discharged_at: '2026-09-29T03:10:00Z', discharged_by_name: 'Nurse Joy',
});

let unassignedActive = [unowned];
let unassignedReviews = [unownedDeath];

function query(path: string) {
  return new URLSearchParams(path.split('?')[1] ?? '');
}

beforeEach(() => {
  vi.clearAllMocks();
  unassignedActive = [unowned];
  unassignedReviews = [unownedDeath];
  dataGetMock.mockImplementation((path: string) => {
    if (path.startsWith(ENDPOINTS.WARD_ATTENDING_DOCTORS)) {
      return Promise.resolve([{ id: 'd1', full_name: 'Dr. Emeka Okafor', staff_id: 'D1', is_on_duty: true }]);
    }
    if (path.startsWith(ENDPOINTS.ADMISSIONS)) {
      const q = query(path);
      if (q.get('unassigned') === 'true' && q.get('needs_doctor_review') === 'true') {
        return Promise.resolve({ count: unassignedReviews.length, next: null, previous: null, results: unassignedReviews });
      }
      if (q.get('unassigned') === 'true') {
        return Promise.resolve({ count: unassignedActive.length, next: null, previous: null, results: unassignedActive });
      }
    }
    return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
  });
});

async function openAdmissions() {
  render(<DoctorDashboard user={user} initialStats={null} slug="demo-clinic" />);
  fireEvent.click(screen.getByRole('button', { name: 'Admissions' }));
}

function admissionUrls() {
  return dataGetMock.mock.calls.map(c => String(c[0])).filter(u => u.startsWith(ENDPOINTS.ADMISSIONS));
}

describe('FLAG-607 — Unassigned admissions on the doctor Admissions page', () => {
  it('asks the server for unowned ACTIVE admissions, never the whole organisation', async () => {
    await openAdmissions();
    await screen.findByText('Rita Nobody');
    const unassigned = admissionUrls().map(query).filter(q => q.get('unassigned') === 'true');
    expect(unassigned.some(q => q.get('status') === 'ACTIVE')).toBe(true);
    // Every admissions request is scoped: mine=true or unassigned=true.
    for (const q of admissionUrls().map(query)) {
      expect(q.get('mine') === 'true' || q.get('unassigned') === 'true').toBe(true);
    }
  });

  it('lists an unowned admission with its bed, under an Unassigned heading', async () => {
    await openAdmissions();
    const section = (await screen.findByRole('heading', { name: /Unassigned/ })).closest('section') as HTMLElement;
    expect(within(section).getByText('Rita Nobody')).toBeInTheDocument();
    expect(within(section).getByText(/GW-06/)).toBeInTheDocument();
  });

  it('Take over opens the assign panel for that patient and assigns the signed-in doctor', async () => {
    dataActionMock.mockResolvedValue({ admission: {} });
    await openAdmissions();
    fireEvent.click(await screen.findByRole('button', { name: 'Take over Rita Nobody' }));

    const dialog = await screen.findByRole('dialog', { name: 'Assign an attending doctor' });
    // The signed-in doctor is preselected: taking over is one click.
    await within(dialog).findByRole('option', { name: /\(you\)/ });
    expect((within(dialog).getByLabelText('New attending doctor') as HTMLSelectElement).value).toBe('d1');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Assign' }));

    await waitFor(() => expect(dataActionMock).toHaveBeenCalled());
    expect(dataActionMock).toHaveBeenCalledWith(
      ENDPOINTS.ADMISSION_REASSIGN_DOCTOR('u1'), 'POST',
      { attending_doctor: 'd1', attending_doctor_override: false },
    );
  });

  it('shows an unowned death awaiting review, which any doctor can confirm', async () => {
    dataActionMock.mockResolvedValue({ admission: {} });
    await openAdmissions();
    const heading = await screen.findByRole('heading', { name: /no doctor assigned/i });
    const section = heading.closest('div') as HTMLElement;
    expect(within(section).getByText('Tayo Lost')).toBeInTheDocument();
    fireEvent.click(within(section).getByRole('button', { name: 'Confirm death' }));

    await waitFor(() => expect(dataActionMock).toHaveBeenCalledWith(ENDPOINTS.ADMISSION_DOCTOR_REVIEW('u2'), 'POST', undefined));
  });

  it('shows nothing extra when every admission has a doctor', async () => {
    unassignedActive = [];
    unassignedReviews = [];
    await openAdmissions();
    await waitFor(() => expect(admissionUrls().some(u => u.includes('unassigned=true'))).toBe(true));
    await waitFor(() => expect(screen.queryByRole('heading', { name: /Unassigned/ })).toBeNull());
    expect(screen.queryByRole('heading', { name: /no doctor assigned/i })).toBeNull();
  });
});
