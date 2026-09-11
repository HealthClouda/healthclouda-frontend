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

/**
 * D3 (sprint plan Tue 18 row) — ward/bed detail.
 *
 * The nurse wards-overview endpoint returns COUNTS ONLY: total/available/
 * occupied per ward, with no per-bed information. Which bed a given patient is
 * in — the actual question at a ward board — lives on GET /ward/beds/, a
 * different app. Read access for a nurse token was verified live 2026-08-19
 * (200, 7 beds). Fixtures below are captured from that response.
 */
describe('D3 — ward overview shows per-bed detail', () => {
  // CAPTURED from GET /nurse/wards/overview/ (DRF envelope, unlike the
  // org-admin equivalent which returns a bare array).
  const wardsResponse = {
    count: 1,
    results: [{
      id: 'ward-1',
      name: 'General Ward',
      category: 'MEDICAL',
      category_other: '',
      gender: 'O',
      total_beds: 2,
      available_beds: 1,
      occupied_beds: 1,
      maintenance_beds: 0,
      reserved_beds: 0,
      occupancy_rate: 50,
      active_admissions: 1,
    }],
  };

  // CAPTURED from GET /ward/beds/ — `ward` and `current_patient` are nested
  // OBJECTS, not ids.
  const bedsResponse = {
    count: 2,
    results: [
      {
        id: 'bed-2', bed_number: 'GW-02', status: 'AVAILABLE',
        ward: { id: 'ward-1', name: 'General Ward', category: 'MEDICAL' },
        room: null, current_patient: null, assigned_at: null,
      },
      {
        id: 'bed-1', bed_number: 'GW-01', status: 'OCCUPIED',
        ward: { id: 'ward-1', name: 'General Ward', category: 'MEDICAL' },
        room: null,
        current_patient: {
          id: 'p-1', healthclouda_id: 'HCL-05CS2Q',
          first_name: 'Chidi', last_name: 'Nwosu',
        },
        assigned_at: '2026-08-13T13:34:04Z',
      },
    ],
  };

  function mockWards() {
    dataGetMock.mockImplementation((path: string) => {
      if (path.startsWith(ENDPOINTS.WARD_BEDS)) return Promise.resolve(bedsResponse);
      if (path.startsWith(ENDPOINTS.NURSE_WARDS_OVERVIEW)) return Promise.resolve(wardsResponse);
      return Promise.resolve({ count: 0, results: [] });
    });
  }

  async function openWards() {
    mockWards();
    render(<NurseDashboard user={user} initialStats={stats} slug="demo-clinic" />);
    fireEvent.click(screen.getByRole('button', { name: 'Ward Overview' }));
    await waitFor(() => expect(screen.getByText('General Ward')).toBeInTheDocument());
  }

  it('lists each bed with its number and status', async () => {
    await openWards();
    expect(await screen.findByText('GW-01')).toBeInTheDocument();
    expect(screen.getByText('GW-02')).toBeInTheDocument();
    expect(screen.getByText('Occupied')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
  });

  it('names the patient occupying a bed', async () => {
    await openWards();
    expect(await screen.findByText('Chidi Nwosu')).toBeInTheDocument();
  });

  it('sorts beds by number rather than trusting API order', async () => {
    // The fixture deliberately returns GW-02 before GW-01.
    await openWards();
    await screen.findByText('GW-01');
    const numbers = screen.getAllByText(/^GW-\d+$/).map((el) => el.textContent);
    expect(numbers).toEqual(['GW-01', 'GW-02']);
  });
});

/**
 * The ward board caps at the first page unless it explicitly asks for the rest.
 * /ward/beds/ returns a paginated envelope (live schema 2026-08-23, which also
 * documents page/search/ordering). With 7 seeded beds this is invisible — the
 * fixture therefore has to exceed one page to see it at all, which is why the
 * bug survived a green suite and a live click-through.
 */
describe('D3 — the ward board loads every bed, not just the first page', () => {
  const PAGE = 20;
  const TOTAL = 25;

  const bed = (n: number) => ({
    id: `bed-${n}`,
    bed_number: `GW-${String(n).padStart(2, '0')}`,
    status: 'AVAILABLE',
    ward: { id: 'ward-1', name: 'General Ward', category: 'MEDICAL' },
    room: null,
    current_patient: null,
    assigned_at: null,
  });
  const allBeds = Array.from({ length: TOTAL }, (_, i) => bed(i + 1));

  const wardsResponse = {
    count: 1,
    results: [{
      id: 'ward-1', name: 'General Ward', category: 'MEDICAL', category_other: '',
      gender: 'O', total_beds: TOTAL, available_beds: TOTAL - 1, occupied_beds: 1,
      maintenance_beds: 0, reserved_beds: 0, occupancy_rate: 4, active_admissions: 1,
    }],
  };

  async function openWards() {
    dataGetMock.mockImplementation((path: string) => {
      if (path.startsWith(ENDPOINTS.WARD_BEDS)) {
        const page = Number(new URLSearchParams(path.split('?')[1] ?? '').get('page') ?? 1);
        return Promise.resolve({
          count: TOTAL,
          // The trap FLAG-013 records: `next` echoes params back whether or not
          // the server honoured them. The fixture mimics that faithfully.
          next: page * PAGE < TOTAL ? `${ENDPOINTS.WARD_BEDS}?page=${page + 1}` : null,
          results: allBeds.slice((page - 1) * PAGE, page * PAGE),
        });
      }
      if (path.startsWith(ENDPOINTS.NURSE_WARDS_OVERVIEW)) return Promise.resolve(wardsResponse);
      return Promise.resolve({ count: 0, results: [] });
    });
    render(<NurseDashboard user={user} initialStats={stats} slug="demo-clinic" />);
    fireEvent.click(screen.getByRole('button', { name: 'Ward Overview' }));
    await waitFor(() => expect(screen.getByText('General Ward')).toBeInTheDocument());
  }

  it('renders beds from beyond the first page', async () => {
    await openWards();
    // GW-21..GW-25 exist only on page 2. Before the fix the board stopped at 20
    // and a nurse had no indication the list was partial.
    expect(await screen.findByText('GW-21')).toBeInTheDocument();
    expect(screen.getByText('GW-25')).toBeInTheDocument();
  });

  it('renders every bed the API reports, not a page of them', async () => {
    await openWards();
    await screen.findByText('GW-25');
    expect(screen.getAllByText(/^GW-\d+$/)).toHaveLength(TOTAL);
  });

  it('requests the later pages through our own proxy path', async () => {
    await openWards();
    await screen.findByText('GW-25');
    // Never DRF's absolute `next` URL — the browser only talks to our proxy.
    const paths = dataGetMock.mock.calls.map((c) => c[0] as string);
    expect(paths).toContain(`${ENDPOINTS.WARD_BEDS}?page=2`);
    expect(paths.every((p) => p.startsWith('/'))).toBe(true);
  });
});

describe('D3 — the nurse dashboard has a small-screen gate', () => {
  // DashboardShell has had `smallScreenGateFor` since D1, but Nurse never
  // passed it — the same dead-prop omission the T5 harness caught on
  // Superadmin. Without it this dashboard renders a full table layout on a
  // phone, which is where PHI is most likely to be shoulder-surfed.
  it('shows the notice and fetches NO patient data on a small screen', async () => {
    // ⚠️ Rewritten 2026-08-29 (FLAG-203 fixed). This test used to assert only
    // that the notice was RENDERED, with the note "the md: breakpoint is a media
    // query JSDOM cannot evaluate, so visibility is not assertable here." That
    // was true of the CSS-only gate and it is exactly what hid the bug: the
    // notice and the whole dashboard were BOTH in the DOM, and the test passed
    // on a build that shipped the records to the phone.
    //
    // The gate is now a JS mount decision, so the real property is assertable —
    // and it is not "is the notice visible" but "did any PHI leave the server".
    const realMatchMedia = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: false, // narrow
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;

    try {
      mockBackend();
      render(<NurseDashboard user={user} initialStats={stats} slug="demo-clinic" />);

      expect(await screen.findByText('This dashboard needs a bigger screen')).toBeInTheDocument();
      expect(screen.getByText(/the Nurse dashboard is designed for/i)).toBeInTheDocument();

      // The assertion that actually matters: nothing was requested, so no
      // patient reached this device — not even hidden.
      expect(dataGetMock).not.toHaveBeenCalled();
      expect(screen.queryByText(/Chidi Nwosu/)).not.toBeInTheDocument();
      expect(screen.queryByText(/HCL-05CS2Q/)).not.toBeInTheDocument();
      expect(screen.queryByText('Active Admissions')).not.toBeInTheDocument();
    } finally {
      window.matchMedia = realMatchMedia;
    }
  });
});

/**
 * WARD-1 — the admissions write path. Pre-fix, the Nurse dashboard had no
 * "Admit Patient" nav entry and no admit UI at all: `git grep -n
 * "ENDPOINTS.ADMISSIONS" src/` matched only `src/lib/config.ts` itself, and
 * these tests failed RED for that exact reason (no "Admit Patient" button /
 * role to find). Shapes below are read from BACKEND SOURCE
 * (apps/ward/serializers.py, apps/patients/serializers.py
 * EpisodeListSerializer, apps/core/exceptions.py custom_exception_handler),
 * not the live schema — see the PR body for the file:line citations.
 */
describe('WARD-1 — admit patient', () => {
  // GET /episodes/ (generic viewset) items — apps/patients/serializers.py
  // EpisodeListSerializer. Distinct shape from /doctor/episodes/: nests
  // `organization`, truncates complaint into `chief_complaint_summary`, no
  // `has_admission`.
  const eligibleEpisode = {
    id: 'ep-2',
    patient: {
      id: 'patient-ada',
      healthclouda_id: 'HCL-ADA001',
      first_name: 'Ada',
      last_name: 'Obi',
    },
    organization: { id: 'org-1', name: 'Demo Clinic', org_id: 'DC-1' },
    episode_type: 'INPATIENT',
    chief_complaint_summary: 'Severe abdominal pain',
    diagnosis_summary: '',
    status: 'ACTIVE',
    episode_start: '2026-09-10T08:00:00Z',
    episode_end: null,
  };

  // Chidi Nwosu (the `admission` fixture's patient) also has an active
  // episode, but is ALREADY admitted — must be excluded from the picker.
  const alreadyAdmittedEpisode = {
    id: 'ep-1',
    patient: {
      id: admission.patient.id,
      healthclouda_id: admission.patient.healthclouda_id,
      first_name: admission.patient.first_name,
      last_name: admission.patient.last_name,
    },
    organization: { id: 'org-1', name: 'Demo Clinic', org_id: 'DC-1' },
    episode_type: 'OUTPATIENT',
    chief_complaint_summary: 'High blood pressure follow-up',
    diagnosis_summary: '',
    status: 'ACTIVE',
    episode_start: '2026-07-11T20:00:00Z',
    episode_end: null,
  };

  // GET /ward/beds/?status=AVAILABLE — apps/ward/serializers.py BedListSerializer.
  const availableBed = {
    id: 'bed-9',
    bed_number: 'GW-09',
    status: 'AVAILABLE',
    ward: { id: 'ward-1', name: 'General Ward', category: 'MEDICAL' },
    room: null,
    current_patient: null,
    assigned_at: null,
    created_at: '2026-01-01T00:00:00Z',
  };

  function mockAdmitBackend() {
    dataGetMock.mockImplementation((path: string) => {
      if (path.startsWith(ENDPOINTS.EPISODES)) {
        return Promise.resolve({ count: 2, results: [eligibleEpisode, alreadyAdmittedEpisode] });
      }
      if (path.startsWith(ENDPOINTS.WARD_BEDS)) {
        return Promise.resolve({ count: 1, results: [availableBed] });
      }
      if (path.startsWith(ENDPOINTS.NURSE_MY_PATIENTS)) {
        return Promise.resolve({ count: 1, results: [admission] });
      }
      return Promise.resolve({ count: 0, results: [] });
    });
  }

  async function openAdmitPage() {
    mockAdmitBackend();
    render(<NurseDashboard user={user} initialStats={stats} slug="demo-clinic" />);
    fireEvent.click(screen.getByRole('button', { name: 'Admit Patient' }));
    await screen.findByText('Ada Obi');
  }

  it('lists a patient with an active episode who is not yet admitted', async () => {
    await openAdmitPage();
    expect(screen.getByText('Ada Obi')).toBeInTheDocument();
    expect(screen.getByText(/Severe abdominal pain/)).toBeInTheDocument();
  });

  it('excludes a patient whose active episode already has an admission', async () => {
    await openAdmitPage();
    // Chidi Nwosu has an ACTIVE episode too (`alreadyAdmittedEpisode`), but is
    // already in `admission` (NURSE_MY_PATIENTS) — must not be offered again.
    expect(screen.queryByText('Chidi Nwosu')).not.toBeInTheDocument();
  });

  it('submits POST /ward/admissions/ with the selected bed and episode', async () => {
    dataActionMock.mockResolvedValue({ message: 'Patient admitted successfully', admission: {} });
    await openAdmitPage();

    fireEvent.click(screen.getByRole('button', { name: 'Admit' }));
    fireEvent.change(await screen.findByLabelText('Bed'), { target: { value: availableBed.id } });
    fireEvent.change(screen.getByLabelText('Admission reason'), { target: { value: 'Requires monitoring' } });
    // Two "Admit" buttons are on screen now: the row action (still rendered
    // behind the panel) and the panel's submit button — the submit is last.
    fireEvent.click(screen.getAllByRole('button', { name: 'Admit' }).slice(-1)[0]);

    await waitFor(() => {
      expect(dataActionMock).toHaveBeenCalledWith(
        ENDPOINTS.ADMISSIONS,
        'POST',
        {
          patient: eligibleEpisode.patient.id,
          episode: eligibleEpisode.id,
          bed: availableBed.id,
          admission_reason: 'Requires monitoring',
          override: false,
        },
      );
    });
  });

  it('shows the gender two-step as a deliberate warning, not a silent retry', async () => {
    const { ClientApiError } = await import('@/lib/client-api');
    dataActionMock.mockRejectedValueOnce(
      new ClientApiError(
        400,
        {
          error: "gender: Patient gender (Female) does not match the ward's gender policy (Male). Resend with override=true to admit anyway.",
          code: 'BAD_REQUEST',
          details: {
            gender: ["Patient gender (Female) does not match the ward's gender policy (Male). Resend with override=true to admit anyway."],
          },
        },
        "gender: Patient gender (Female) does not match the ward's gender policy (Male). Resend with override=true to admit anyway.",
      ),
    );
    await openAdmitPage();

    fireEvent.click(screen.getByRole('button', { name: 'Admit' }));
    fireEvent.change(await screen.findByLabelText('Bed'), { target: { value: availableBed.id } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Admit' }).slice(-1)[0]);

    // The warning is shown — not an auto-retry with override=true.
    expect(await screen.findByText(/does not match the ward's gender policy/)).toBeInTheDocument();
    expect(dataActionMock).toHaveBeenCalledTimes(1);

    // Only an explicit second click resends with override=true.
    dataActionMock.mockResolvedValueOnce({ message: 'ok', admission: {} });
    fireEvent.click(screen.getByRole('button', { name: 'Admit anyway' }));

    await waitFor(() => {
      expect(dataActionMock).toHaveBeenLastCalledWith(
        ENDPOINTS.ADMISSIONS,
        'POST',
        expect.objectContaining({ override: true }),
      );
    });
  });

  it('surfaces a non-gender rejection (e.g. bed already taken) as a readable message', async () => {
    const { ClientApiError } = await import('@/lib/client-api');
    dataActionMock.mockRejectedValueOnce(
      new ClientApiError(
        400,
        {
          error: 'bed: Bed GW-09 is not available (status: OCCUPIED).',
          code: 'BAD_REQUEST',
          details: { bed: ['Bed GW-09 is not available (status: OCCUPIED).'] },
        },
        'bed: Bed GW-09 is not available (status: OCCUPIED).',
      ),
    );
    await openAdmitPage();

    fireEvent.click(screen.getByRole('button', { name: 'Admit' }));
    fireEvent.change(await screen.findByLabelText('Bed'), { target: { value: availableBed.id } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Admit' }).slice(-1)[0]);

    expect(await screen.findByText(/Bed GW-09 is not available/)).toBeInTheDocument();
  });
});
