import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { DoctorDashboard } from './DoctorDashboard';
import { ENDPOINTS } from '@/lib/config';
import { useToastStore } from '@/store/toast';
import type { User } from '@/types/auth';

/**
 * FLAG-060 — a doctor had no browser path from a reception check-in to
 * "Start episode". The Queue page reads GET /doctor/queue/ (backend FLAG-617,
 * HealthClouda/healthclouda-backend#243): the signed-in doctor's own check-ins
 * for a day, `{count, results}`, each row `PatientCheckInListSerializer` — the
 * same shape reception's /receptionist/check-ins/ returns (`CheckIn`).
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

function checkIn(id: string, n: number, status: string, patient: { id: string; first_name: string; last_name: string; healthclouda_id: string }) {
  return {
    id,
    patient: { ...patient, email: null, phone: '08030000000' },
    assigned_doctor: { id: 'd1', first_name: 'Emeka', last_name: 'Okafor', email: 'doctor@demo.test' },
    checked_in_by: { id: 'r1', first_name: 'Rita', last_name: 'Desk', email: 'rec@demo.test' },
    status,
    queue_number: n,
    checked_in_at: new Date().toISOString(),
    called_at: null,
    completed_at: null,
    reason_for_visit: 'Headache for three days',
  };
}

const ngozi = { id: 'pat-ngozi', first_name: 'Ngozi', last_name: 'Eze', healthclouda_id: 'HCL-NGZ001' };
const bayo = { id: 'pat-bayo', first_name: 'Bayo', last_name: 'Ade', healthclouda_id: 'HCL-BAY002' };

let queue: ReturnType<typeof checkIn>[] = [];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

beforeEach(() => {
  vi.clearAllMocks();
  useToastStore.setState({ toasts: [] });
  queue = [checkIn('ci-1', 1, 'WAITING', ngozi), checkIn('ci-2', 2, 'IN_PROGRESS', bayo)];
  dataGetMock.mockImplementation((path: string) => {
    if (path.startsWith(ENDPOINTS.DOC_QUEUE)) return Promise.resolve({ count: queue.length, results: queue });
    return Promise.resolve({ count: 0, next: null, previous: null, results: [] });
  });
});

async function openQueue() {
  render(<DoctorDashboard user={user} initialStats={null} slug="demo-clinic" />);
  fireEvent.click(screen.getByRole('button', { name: 'Queue' }));
  return screen.findByText('Ngozi Eze');
}

function rowOf(name: string) {
  return screen.getByText(name).closest('tr') as HTMLElement;
}

describe('FLAG-060 — the doctor Queue page', () => {
  it('reads the doctor queue endpoint for today', async () => {
    await openQueue();
    const urls = dataGetMock.mock.calls.map(c => String(c[0])).filter(u => u.startsWith(ENDPOINTS.DOC_QUEUE));
    expect(urls.length).toBeGreaterThan(0);
    expect(urls[0]).toContain(`date=${todayISO()}`);
    // Never reception's endpoint — a doctor is refused there (403).
    expect(dataGetMock.mock.calls.some(c => String(c[0]).startsWith(ENDPOINTS.REC_CHECK_INS))).toBe(false);
  });

  it('shows queue number, name, HealthClouda ID and reason', async () => {
    await openQueue();
    const row = rowOf('Ngozi Eze');
    expect(within(row).getByText('1')).toBeInTheDocument();
    expect(within(row).getByText('HCL-NGZ001')).toBeInTheDocument();
    expect(within(row).getByText(/Headache for three days/)).toBeInTheDocument();
  });

  it('Start episode posts the PATIENT id, never the check-in id', async () => {
    dataActionMock.mockResolvedValue({});
    await openQueue();
    fireEvent.click(within(rowOf('Ngozi Eze')).getByRole('button', { name: /Start episode/ }));
    await screen.findByLabelText(/Episode type/);
    fireEvent.click(screen.getByRole('button', { name: 'Start episode' }));

    await waitFor(() => expect(dataActionMock).toHaveBeenCalled());
    const [path, method, body] = dataActionMock.mock.calls[0];
    expect(path).toBe(ENDPOINTS.EPISODES);
    expect(method).toBe('POST');
    expect((body as Record<string, unknown>).patient).toBe('pat-ngozi');
  });

  it('Call in moves a waiting patient to IN_PROGRESS on the doctor route', async () => {
    dataActionMock.mockResolvedValue({});
    await openQueue();
    fireEvent.click(within(rowOf('Ngozi Eze')).getByRole('button', { name: /Call in/ }));

    await waitFor(() => expect(dataActionMock).toHaveBeenCalled());
    expect(dataActionMock).toHaveBeenCalledWith(ENDPOINTS.DOC_QUEUE_ITEM('ci-1'), 'PATCH', { status: 'IN_PROGRESS' });
  });

  it('Done completes a patient who is being seen; a waiting row has no Done', async () => {
    dataActionMock.mockResolvedValue({});
    await openQueue();
    expect(within(rowOf('Ngozi Eze')).queryByRole('button', { name: /^Done/ })).toBeNull();
    fireEvent.click(within(rowOf('Bayo Ade')).getByRole('button', { name: /^Done/ }));

    await waitFor(() => expect(dataActionMock).toHaveBeenCalled());
    expect(dataActionMock).toHaveBeenCalledWith(ENDPOINTS.DOC_QUEUE_ITEM('ci-2'), 'PATCH', { status: 'COMPLETED' });
  });

  it('shows the error when a status change is refused', async () => {
    dataActionMock.mockRejectedValue(new Error('Cannot change check-in status from COMPLETED to IN_PROGRESS.'));
    await openQueue();
    fireEvent.click(within(rowOf('Ngozi Eze')).getByRole('button', { name: /Call in/ }));

    await waitFor(() => expect(useToastStore.getState().toasts.length).toBeGreaterThan(0));
    expect(useToastStore.getState().toasts.map(t => t.message).join(' ')).toMatch(/Cannot change check-in status/);
  });

  it('says so when nobody is waiting', async () => {
    queue = [];
    render(<DoctorDashboard user={user} initialStats={null} slug="demo-clinic" />);
    fireEvent.click(screen.getByRole('button', { name: 'Queue' }));
    expect(await screen.findByText(/No patients checked in/)).toBeInTheDocument();
  });

  it('shows every check-in on one page, with no pager: the endpoint is not paginated', async () => {
    // Review of #175: /doctor/queue/ returns {count, results} with ALL of the
    // day's rows. A pager would claim a page 2 that is the same list again.
    queue = Array.from({ length: 21 }, (_, i) =>
      checkIn(`ci-${i + 1}`, i + 1, 'WAITING', { id: `p-${i + 1}`, first_name: 'Pat', last_name: `Number${i + 1}`, healthclouda_id: `HCL-${i + 1}` }));
    render(<DoctorDashboard user={user} initialStats={null} slug="demo-clinic" />);
    fireEvent.click(screen.getByRole('button', { name: 'Queue' }));

    expect(await screen.findByText('Pat Number21')).toBeInTheDocument();
    expect(screen.getByText('Pat Number1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /next/i })).toBeNull();
    expect(screen.queryByText(/page 1 of/i)).toBeNull();
    const urls = dataGetMock.mock.calls.map(c => String(c[0])).filter(u => u.startsWith(ENDPOINTS.DOC_QUEUE));
    expect(urls.every(u => !/[?&]page(_size)?=/.test(u))).toBe(true);
  });
});
