import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NurseDashboard } from './NurseDashboard';
import { ENDPOINTS } from '@/lib/config';
import type { User } from '@/types/auth';

/**
 * Pre-fix tests for CONTRACT-AUDIT PR 4 (NURSE-1), written RED against the
 * buggy code per the pre-fix/post-fix discipline. Real contract verified live
 * 2026-07-11 against the seeded Docker backend:
 *
 *  - GET /nurse/my-patients/ returns ADMISSIONS ({count, results}) with
 *    nested patient/bed/ward/episode — not flat PatientSummary rows. The
 *    old page read top-level first_name/phone_number → every cell was "—".
 *  - GET/PATCH /nurse/patients/<patient_id>/vitals/ is the ONLY vitals
 *    endpoint: {patient_id, episode_id, vitals: <latest reading | null>}.
 *    PATCH appends a new reading (partial fields fine; 400 {error, code,
 *    details} out-of-range; 404 when the patient has no active episode
 *    at this org). Readings use blood_pressure_systolic/_diastolic +
 *    pulse_rate — the old VitalRecord's blood_pressure/heart_rate fields
 *    never existed.
 *  - ?vitals_pending= / ?include_vitals= on my-patients were invented —
 *    DRF ignores them, so the old pages showed misparsed admission rows.
 *  - GET /nurse/dashboard/stats/ is ward/admission stats (active_admissions,
 *    patients_in_queue, occupancy_rate, todays_admissions, …) — the old
 *    NurseStats fields (total_patients, vitals_pending, critical_patients)
 *    don't exist, so every stat card rendered 0/"—" forever.
 */

// Sidebar/Header use next/navigation for logout — not under test here.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/demo-clinic/nurse',
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
  id: 'n1',
  email: 'nurse@demo.test',
  first_name: 'Ngozi',
  last_name: 'Balogun',
  role: 'NURSE',
  organization_slug: 'demo-clinic',
  is_on_duty: true,
} as unknown as User;

// Real shape — verified live 2026-07-11 (GET /nurse/dashboard/stats/).
const stats = {
  total_wards: 2,
  total_beds: 7,
  available_beds: 5,
  occupied_beds: 2,
  maintenance_beds: 0,
  reserved_beds: 0,
  occupancy_rate: 28.6,
  active_admissions: 2,
  todays_admissions: 3,
  todays_discharges: 1,
  patients_in_queue: 2,
};

// Real admission item — verified live 2026-07-11 (GET /nurse/my-patients/).
const admission = {
  id: '409f41a9-9c2b-4ceb-8980-7655eb099640',
  patient: {
    id: 'fa3db9fe-9df1-4d7a-b0df-596345efeea1',
    healthclouda_id: 'HCL-05CS2Q',
    first_name: 'Chidi',
    last_name: 'Nwosu',
    gender: 'M',
    blood_type: 'O-',
    age: 49,
    allergies: null,
    emergency_contact_name: null,
    emergency_contact_phone: null,
  },
  bed: { id: 'bed-1', bed_number: 'GW-01', status: 'OCCUPIED' },
  ward: { id: 'ward-1', name: 'General Ward', category: 'MEDICAL', gender: 'O' },
  room: null,
  episode: {
    id: '983f5a76-5bd5-483e-8edd-cb9984bfa08e',
    episode_type: 'OUTPATIENT',
    status: 'ACTIVE',
    chief_complaint: 'High blood pressure follow-up',
  },
  admitted_at: '2026-07-11T20:24:41Z',
  admission_reason: 'Requires inpatient monitoring.',
  length_of_stay: 0,
};

// Real reading — verified live 2026-07-11 (GET /nurse/patients/<id>/vitals/).
const reading = {
  id: 'f7e40799-d839-4c88-b0fb-2abd96818d8b',
  temperature: 37.4,
  blood_pressure_systolic: 108,
  blood_pressure_diastolic: 93,
  pulse_rate: 73,
  respiratory_rate: 19,
  oxygen_saturation: 99,
  weight: 80.2,
  height: 160.6,
  notes: 'Routine reading.',
  recorded_at: '2026-07-09T16:24:40Z',
  recorded_by_info: {
    id: 'doc-1',
    first_name: 'Emeka',
    last_name: 'Okafor',
    full_name: 'Emeka Okafor',
    email: 'doctor@demo.test',
  },
};

const vitalsResponse = {
  patient_id: admission.patient.id,
  episode_id: admission.episode.id,
  vitals: reading,
};

function mockBackend({ vitals = vitalsResponse }: { vitals?: unknown } = {}) {
  dataGetMock.mockImplementation((path: string) => {
    if (path.startsWith(ENDPOINTS.NURSE_VITALS(admission.patient.id))) {
      return Promise.resolve(vitals);
    }
    if (path.startsWith(ENDPOINTS.NURSE_MY_PATIENTS)) {
      return Promise.resolve({ count: 1, results: [admission] });
    }
    return Promise.resolve({ count: 0, results: [] });
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockBackend();
});

describe('NURSE-1 — overview uses the real stats contract', () => {
  it('renders real stat fields and drops the invented ?vitals_pending= query', async () => {
    render(<NurseDashboard user={user} initialStats={stats} slug="demo-clinic" />);

    // Real fields: active_admissions=2, patients_in_queue=2,
    // todays_admissions=3. The old cards read total_patients/vitals_pending
    // (nonexistent) → permanently 0/"—".
    expect(await screen.findByText('Active Admissions')).toBeInTheDocument();
    expect(screen.getByText(/in queue/i)).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    // ?vitals_pending= is not implemented backend-side — DRF silently
    // ignores it and returns ALL admissions (GLOBAL-2 pattern).
    await waitFor(() => expect(dataGetMock).toHaveBeenCalled());
    const inventedCalls = dataGetMock.mock.calls.filter((c) =>
      /[?&](vitals_pending|include_vitals)=/.test(String(c[0])),
    );
    expect(inventedCalls).toHaveLength(0);
  });
});

describe('NURSE-1 — my-patients page renders the real admission shape', () => {
  it('shows patient name, HCL-ID, ward/bed and chief complaint from nested objects', async () => {
    render(<NurseDashboard user={user} initialStats={stats} slug="demo-clinic" />);
    fireEvent.click(screen.getByRole('button', { name: 'My Patients' }));

    // Old code read top-level first_name/last_name → name never rendered.
    expect(await screen.findByText(/Chidi Nwosu/)).toBeInTheDocument();
    expect(screen.getByText(/HCL-05CS2Q/)).toBeInTheDocument();
    expect(screen.getByText(/General Ward/)).toBeInTheDocument();
    expect(screen.getByText(/GW-01/)).toBeInTheDocument();
    expect(screen.getByText(/High blood pressure follow-up/)).toBeInTheDocument();
  });
});

describe('NURSE-1 — vitals page uses the per-patient endpoint', () => {
  async function openVitalsForPatient() {
    render(<NurseDashboard user={user} initialStats={stats} slug="demo-clinic" />);
    fireEvent.click(screen.getByRole('button', { name: 'Vitals' }));
    // Select the patient whose vitals we want (list comes from my-patients).
    fireEvent.click(await screen.findByRole('button', { name: /Chidi Nwosu/ }));
  }

  it('fetches GET /nurse/patients/<id>/vitals/ — NOT my-patients with ?include_vitals=', async () => {
    await openVitalsForPatient();

    await waitFor(() => {
      expect(dataGetMock).toHaveBeenCalledWith(
        expect.stringContaining(ENDPOINTS.NURSE_VITALS(admission.patient.id)),
      );
    });
    const inventedCalls = dataGetMock.mock.calls.filter((c) =>
      /[?&]include_vitals=/.test(String(c[0])),
    );
    expect(inventedCalls).toHaveLength(0);
  });

  it('renders the latest reading with real field names (systolic/diastolic, pulse_rate)', async () => {
    await openVitalsForPatient();

    // 108/93 comes from blood_pressure_systolic/_diastolic — the old
    // `blood_pressure` string field never existed.
    expect(await screen.findByText(/108\s*\/\s*93/)).toBeInTheDocument();
    expect(screen.getByText(/73/)).toBeInTheDocument(); // pulse_rate, not heart_rate
    expect(screen.getByText(/37\.4/)).toBeInTheDocument();
    expect(screen.getByText(/Emeka Okafor/)).toBeInTheDocument(); // recorded_by_info
  });

  it('records a reading via PATCH with numeric payload and refreshes the latest vitals', async () => {
    dataActionMock.mockResolvedValue({
      ...vitalsResponse,
      vitals: { ...reading, id: 'new-1', temperature: 36.9 },
    });
    await openVitalsForPatient();
    await screen.findByText(/108\s*\/\s*93/);

    fireEvent.change(screen.getByLabelText(/temperature/i), { target: { value: '36.9' } });
    fireEvent.change(screen.getByLabelText(/systolic/i), { target: { value: '120' } });
    fireEvent.change(screen.getByLabelText(/diastolic/i), { target: { value: '80' } });
    fireEvent.click(screen.getByRole('button', { name: /save|record/i }));

    await waitFor(() => {
      expect(dataActionMock).toHaveBeenCalledWith(
        ENDPOINTS.NURSE_VITALS(admission.patient.id),
        'PATCH',
        expect.objectContaining({
          temperature: 36.9,
          blood_pressure_systolic: 120,
          blood_pressure_diastolic: 80,
        }),
      );
    });
    // Untouched fields must be OMITTED — sending them as null/'' would
    // store junk (the backend accepts partial bodies).
    const payload = dataActionMock.mock.calls[0][2] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('pulse_rate');
    expect(payload).not.toHaveProperty('notes');
  });

  it('blocks an empty submission client-side (backend would store an all-null reading)', async () => {
    await openVitalsForPatient();
    await screen.findByText(/108\s*\/\s*93/);

    fireEvent.click(screen.getByRole('button', { name: /save|record/i }));

    // Verified live: PATCH {} returns 200 and CREATES an all-null reading —
    // the form must refuse to send it.
    expect(dataActionMock).not.toHaveBeenCalled();
    expect(await screen.findByText(/at least one/i)).toBeInTheDocument();
  });

  it('surfaces backend 400 validation messages on the form', async () => {
    const { ClientApiError } = await import('@/lib/client-api');
    dataActionMock.mockRejectedValue(
      new ClientApiError(
        400,
        {
          error: 'temperature: Ensure this value is less than or equal to 45.0.',
          code: 'BAD_REQUEST',
          details: { temperature: ['Ensure this value is less than or equal to 45.0.'] },
        },
        'temperature: Ensure this value is less than or equal to 45.0.',
      ),
    );
    await openVitalsForPatient();
    await screen.findByText(/108\s*\/\s*93/);

    fireEvent.change(screen.getByLabelText(/temperature/i), { target: { value: '44' } });
    fireEvent.click(screen.getByRole('button', { name: /save|record/i }));

    expect(
      await screen.findByText(/less than or equal to 45/i),
    ).toBeInTheDocument();
  });

  it('shows an empty state when the patient has no readings yet (vitals: null)', async () => {
    mockBackend({ vitals: { ...vitalsResponse, vitals: null } });
    await openVitalsForPatient();

    expect(await screen.findByText(/no vitals recorded/i)).toBeInTheDocument();
  });
});
