import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NurseDashboard } from './NurseDashboard';
import { ENDPOINTS } from '@/lib/config';
import type { User } from '@/types/auth';

/**
 * FLAG-607 follow-up (owner decision 2b, 28 Sep): the nurse's normal Admit
 * form can name an attending doctor, optionally. Before this only the
 * emergency form could, so an admission from an existing case often had no
 * doctor and reached nobody. POST /ward/admissions/ already accepts
 * `attending_doctor` + `attending_doctor_override` (AdmissionCreateSerializer);
 * the off-duty check is the same warn-and-allow as the emergency route.
 */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/demo-clinic/nurse',
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

import { dataGet, dataAction, ClientApiError } from '@/lib/client-api';
const dataGetMock = vi.mocked(dataGet);
const dataActionMock = vi.mocked(dataAction);

const user = {
  id: 'n1', email: 'nurse@demo.test', first_name: 'Ngozi', last_name: 'Balogun',
  role: 'NURSE', organization_slug: 'demo-clinic', is_on_duty: true,
} as unknown as User;

const episode = {
  id: 'ep-2',
  patient: { id: 'patient-ada', healthclouda_id: 'HCL-ADA001', first_name: 'Ada', last_name: 'Obi' },
  organization: { id: 'org-1', name: 'Demo Clinic', org_id: 'DC-1' },
  episode_type: 'INPATIENT',
  chief_complaint_summary: 'Severe abdominal pain',
  diagnosis_summary: '',
  status: 'ACTIVE',
  episode_start: '2026-09-10T08:00:00Z',
  episode_end: null,
};

const bed = {
  id: 'bed-9', bed_number: 'GW-09', status: 'AVAILABLE',
  ward: { id: 'ward-1', name: 'General Ward', category: 'MEDICAL' },
  room: null, current_patient: null, assigned_at: null, created_at: '2026-01-01T00:00:00Z',
};

const onDuty = { id: 'doc-1', full_name: 'Dr. Amaka Bello', staff_id: 'DOC-01', is_on_duty: true };
const offDuty = { id: 'doc-2', full_name: 'Dr. Femi Adeyemi', staff_id: 'DOC-02', is_on_duty: false };

beforeEach(() => {
  vi.clearAllMocks();
  dataGetMock.mockImplementation((path: string) => {
    if (path.startsWith(ENDPOINTS.EPISODES)) return Promise.resolve({ count: 1, results: [episode] });
    if (path.startsWith(ENDPOINTS.WARD_BEDS)) return Promise.resolve({ count: 1, results: [bed] });
    if (path.startsWith(ENDPOINTS.WARD_ATTENDING_DOCTORS)) return Promise.resolve([onDuty, offDuty]);
    return Promise.resolve({ count: 0, results: [] });
  });
});

async function openAdmitForm() {
  render(<NurseDashboard user={user} initialStats={null} slug="demo-clinic" />);
  fireEvent.click(screen.getByRole('button', { name: 'Admit Patient' }));
  await screen.findByText('Ada Obi');
  fireEvent.click(screen.getByRole('button', { name: 'Admit' }));
  fireEvent.change(await screen.findByLabelText('Bed'), { target: { value: bed.id } });
  fireEvent.change(screen.getByLabelText('Admission reason'), { target: { value: 'Monitoring' } });
}

function submit() {
  fireEvent.click(screen.getAllByRole('button', { name: 'Admit' }).slice(-1)[0]);
}

describe('FLAG-607 — the Admit form can name an attending doctor', () => {
  it('offers an optional doctor picker', async () => {
    await openAdmitForm();
    const picker = await screen.findByLabelText('Attending doctor');
    expect(picker).not.toBeRequired();
    await screen.findByRole('option', { name: 'Dr. Amaka Bello' });
  });

  it('sends the chosen doctor as attending_doctor', async () => {
    dataActionMock.mockResolvedValue({ admission: {} });
    await openAdmitForm();
    await screen.findByRole('option', { name: 'Dr. Amaka Bello' });
    fireEvent.change(screen.getByLabelText('Attending doctor'), { target: { value: 'doc-1' } });
    submit();

    await waitFor(() => expect(dataActionMock).toHaveBeenCalled());
    const [path, method, body] = dataActionMock.mock.calls[0];
    expect(path).toBe(ENDPOINTS.ADMISSIONS);
    expect(method).toBe('POST');
    expect(body).toMatchObject({ attending_doctor: 'doc-1', attending_doctor_override: false, override: false });
  });

  it('leaving it blank sends no doctor at all', async () => {
    dataActionMock.mockResolvedValue({ admission: {} });
    await openAdmitForm();
    submit();

    await waitFor(() => expect(dataActionMock).toHaveBeenCalled());
    const body = dataActionMock.mock.calls[0][2] as Record<string, unknown>;
    expect(Object.keys(body)).not.toContain('attending_doctor');
    expect(Object.keys(body)).not.toContain('attending_doctor_override');
  });

  it('an off-duty doctor is a warning, and Admit anyway resends with attending_doctor_override only', async () => {
    const msg = 'Dr. Femi Adeyemi is not currently on duty. Resend with attending_doctor_override=true to admit anyway.';
    dataActionMock
      .mockRejectedValueOnce(new ClientApiError(400, { error: msg, details: { attending_doctor: [msg] } }, msg))
      .mockResolvedValueOnce({ admission: {} });
    await openAdmitForm();
    await screen.findByRole('option', { name: 'Dr. Femi Adeyemi' });
    fireEvent.change(screen.getByLabelText('Attending doctor'), { target: { value: 'doc-2' } });
    submit();

    const warning = await screen.findByText(/not currently on duty/);
    expect(warning.textContent).not.toMatch(/Resend with/);
    fireEvent.click(screen.getByRole('button', { name: 'Admit anyway' }));

    await waitFor(() => expect(dataActionMock).toHaveBeenCalledTimes(2));
    expect(dataActionMock.mock.calls[1][2]).toMatchObject({
      attending_doctor: 'doc-2', attending_doctor_override: true, override: false,
    });
  });
});
