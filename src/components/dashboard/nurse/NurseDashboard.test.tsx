import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NurseDashboard } from './NurseDashboard';
import { ENDPOINTS } from '@/lib/config';
import { useToastStore } from '@/store/toast';
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

function mockBackend({
  vitals = vitalsResponse,
  admissionsList = [] as unknown[],
}: { vitals?: unknown; admissionsList?: unknown[] } = {}) {
  dataGetMock.mockImplementation((path: string) => {
    if (path.startsWith(ENDPOINTS.NURSE_VITALS(admission.patient.id))) {
      return Promise.resolve(vitals);
    }
    // FLAG-041 — GET /ward/admissions/?status=ACTIVE, the endpoint that
    // actually carries attending_doctor_name. Checked before NURSE_MY_PATIENTS
    // ('/ward/admissions/' and '/nurse/my-patients/' don't collide, but this
    // keeps the intent obvious).
    if (path.startsWith(ENDPOINTS.ADMISSIONS)) {
      return Promise.resolve({ count: admissionsList.length, results: admissionsList });
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

describe('FLAG-041 — attending doctor / handover visibility', () => {
  // /nurse/my-patients/ (ActiveAdmissionSerializer) carries no attending_doctor
  // field at all — verified against apps/ward/nurse_serializers.py. The only
  // NURSE-readable endpoint that has it is GET /ward/admissions/
  // (AdmissionListSerializer, same admission id), so the dashboard fetches
  // that separately and merges by id.
  it('shows the attending doctor name on My Patients, from /ward/admissions/ — not my-patients', async () => {
    mockBackend({
      admissionsList: [{ id: admission.id, attending_doctor_name: 'Dr. Emeka Okafor', needs_attending_doctor: false }],
    });
    render(<NurseDashboard user={user} initialStats={stats} slug="demo-clinic" />);
    fireEvent.click(screen.getByRole('button', { name: 'My Patients' }));

    expect(await screen.findByText(/Chidi Nwosu/)).toBeInTheDocument();
    expect(screen.getByText('Dr. Emeka Okafor')).toBeInTheDocument();
  });

  it('shows the same handover on the Overview preview, not only My Patients', async () => {
    mockBackend({
      admissionsList: [{ id: admission.id, attending_doctor_name: 'Dr. Emeka Okafor', needs_attending_doctor: false }],
    });
    render(<NurseDashboard user={user} initialStats={stats} slug="demo-clinic" />);

    expect(await screen.findByText('Dr. Emeka Okafor')).toBeInTheDocument();
  });

  it('flags an ACTIVE admission with no attending doctor as Unassigned, not blank', async () => {
    mockBackend({
      admissionsList: [{ id: admission.id, attending_doctor_name: null, needs_attending_doctor: true }],
    });
    render(<NurseDashboard user={user} initialStats={stats} slug="demo-clinic" />);
    fireEvent.click(screen.getByRole('button', { name: 'My Patients' }));

    expect(await screen.findByText(/Chidi Nwosu/)).toBeInTheDocument();
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });

  it('degrades to a plain dash, and never crashes the list, when /ward/admissions/ has no matching row', async () => {
    // The default mockBackend() — no admissionsList override — is what a
    // still-loading, failed, or genuinely empty /ward/admissions/ response
    // looks like from this component's point of view: the id is simply not
    // in the map. This must render the same as "no field returned" (StatCard's
    // `?? '—'` precedent), never a blank crash or a wrong name.
    mockBackend();
    render(<NurseDashboard user={user} initialStats={stats} slug="demo-clinic" />);
    fireEvent.click(screen.getByRole('button', { name: 'My Patients' }));

    expect(await screen.findByText(/Chidi Nwosu/)).toBeInTheDocument();
    expect(screen.queryByText('Unassigned')).not.toBeInTheDocument();
    expect(screen.getByText('Attending').closest('table')).toBeInTheDocument();
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
    // `admit_patient()` now raises a typed `WardGenderMismatch`, and the
    // view translates it to a DRF field error under `details.gender` —
    // backend #194 (FLAG-031 closed at source). `details.gender` is a
    // STRING, not a list, matching what `AdmissionCreateSerializer`
    // produced before #193.
    dataActionMock.mockRejectedValueOnce(
      new ClientApiError(
        400,
        {
          error: "gender: Patient gender (Female) does not match the ward's gender policy (Male). Resend with override=true to admit anyway.",
          code: 'BAD_REQUEST',
          details: {
            gender: "Patient gender (Female) does not match the ward's gender policy (Male). Resend with override=true to admit anyway.",
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

  it('a `details.patient` rejection is a hard stop — no override, no retry button', async () => {
    const { ClientApiError } = await import('@/lib/client-api');
    dataActionMock.mockRejectedValueOnce(
      new ClientApiError(
        400,
        {
          error: 'patient: This patient cannot be admitted.',
          code: 'BAD_REQUEST',
          details: { patient: 'This patient cannot be admitted.' },
        },
        'patient: This patient cannot be admitted.',
      ),
    );
    await openAdmitPage();

    fireEvent.click(screen.getByRole('button', { name: 'Admit' }));
    fireEvent.change(await screen.findByLabelText('Bed'), { target: { value: availableBed.id } });
    // Row "Admit" link + the panel's own submit button, same as the gender
    // two-step test above.
    const beforeSubmitCount = screen.getAllByRole('button', { name: 'Admit' }).length;
    fireEvent.click(screen.getAllByRole('button', { name: 'Admit' }).slice(-1)[0]);

    expect(await screen.findByText('This patient cannot be admitted.')).toBeInTheDocument();
    // No override affordance (unlike the gender two-step) — the message is
    // shown with a plain "Close", never an "Admit anyway".
    expect(screen.queryByRole('button', { name: 'Admit anyway' })).not.toBeInTheDocument();
    // The panel's own submit button is gone (a hard stop, not left standing
    // to invite a retry) — only the row's link "Admit" button, from behind
    // the still-open panel, remains.
    expect(screen.getAllByRole('button', { name: 'Admit' }).length).toBe(beforeSubmitCount - 1);
    expect(dataActionMock).toHaveBeenCalledTimes(1);
  });

  it('a 409 on admit refreshes the bed list instead of showing a validation error', async () => {
    const { ClientApiError } = await import('@/lib/client-api');
    // The backend's 409 body is flat — no `details` key at all, the same
    // shape the flat gender-mismatch error used to have pre-#194. Her input
    // was valid when she picked the bed; someone else just took it.
    dataActionMock.mockRejectedValueOnce(
      new ClientApiError(409, { error: 'Bed GW-09 was just assigned to another patient.' }, 'Conflict'),
    );
    await openAdmitPage();

    fireEvent.click(screen.getByRole('button', { name: 'Admit' }));
    fireEvent.change(await screen.findByLabelText('Bed'), { target: { value: availableBed.id } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Admit' }).slice(-1)[0]);

    // A non-blocking notice, not a field-level validation error.
    expect(await screen.findByText(/taken by another patient/)).toBeInTheDocument();
    // The bed list is refetched (GET fires again) rather than the form
    // being left stuck on a bed that no longer exists.
    await waitFor(() => {
      expect(dataGetMock.mock.calls.filter(([path]) => path.startsWith(ENDPOINTS.WARD_BEDS)).length).toBeGreaterThan(1);
    });
    // The stale selection is cleared, and the form is still usable — the
    // "Admit" button is still there, ready for a different bed.
    expect(screen.getByLabelText('Bed')).toHaveValue('');
    expect(screen.getAllByRole('button', { name: 'Admit' }).length).toBeGreaterThan(0);
  });
});

/**
 * Build 2 (FLAG-575) — the emergency admission, as ONE call.
 *
 * Medical Q1 (2026-09-12): a NURSE admits a patient no doctor has seen yet,
 * directly, without a pre-existing ACTIVE episode. This block used to describe
 * a two-call chain — POST /episodes/ then POST /ward/admissions/ — which is
 * exactly the defect FLAG-243 records: the admit refused a deceased patient
 * while the episode call had no such guard, so a refusal left an ACTIVE
 * episode open with nobody in a bed behind it.
 *
 * It is now a single POST /ward/emergency-admissions/ (apps/ward/views.py
 * EmergencyAdmissionView, apps/ward/services.py emergency_admit) which does
 * find-or-create patient → org access grant → deceased check → episode →
 * admission inside one `transaction.atomic()`.
 *
 * Contract re-verified against backend source on `develop` 2026-09-18, after
 * #217 — which renamed the override field to `override`, added
 * `stated_hcl_id`, moved the bed race and "already admitted" to 409, and made
 * the deceased refusal field-shaped under `details.patient`. Read from source,
 * not from the schema: `/api/v1/schema/` publishes "No response body" for this
 * view (backend FLAG-591).
 */
describe('WARD-EMERGENCY — emergency admission, one call (build 2 / FLAG-575, closes FLAG-243)', () => {
  // GET /patients/search/?query= — PatientListSerializer. ORG-scoped (see
  // OrgVisiblePatient's comment in types/dashboard.ts).
  const foundPatient = {
    id: 'patient-emma',
    healthclouda_id: 'HCL-EM3RG',
    first_name: 'Emeka',
    last_name: 'Uche',
    email: '',
    phone: '+2348012345678',
    date_of_birth: '1990-01-01',
    age: 36,
    gender: 'M',
    blood_type: 'O+',
    city: 'Lagos',
    state: 'Lagos',
    is_active: true,
  };

  // GET /ward/attending-doctors/ — AttendingDoctorSerializer, bare array,
  // on-duty first (already sorted server-side).
  const onDutyDoctor = { id: 'doc-1', full_name: 'Dr. Amaka Bello', staff_id: 'DOC-01', is_on_duty: true };
  const offDutyDoctor = { id: 'doc-2', full_name: 'Dr. Femi Adeyemi', staff_id: 'DOC-02', is_on_duty: false };

  const emergencyBed = {
    id: 'bed-er-1',
    bed_number: 'ER-01',
    status: 'AVAILABLE',
    ward: { id: 'ward-er', name: 'Emergency Ward', category: 'EMERGENCY' },
    room: null,
    current_patient: null,
    assigned_at: null,
    created_at: '2026-01-01T00:00:00Z',
  };

  // {message, admission, patient} — `patient` is PatientDetailSerializer.
  function admitted(overrides: Record<string, unknown> = {}) {
    return {
      message: 'Patient admitted.',
      admission: { id: 'adm-1', needs_attending_doctor: false },
      patient: { ...foundPatient, registration_incomplete: false },
      ...overrides,
    };
  }

  function mockEmergencyBackend() {
    dataGetMock.mockImplementation((path: string) => {
      if (path.startsWith(ENDPOINTS.PATIENTS_SEARCH)) {
        return Promise.resolve({ count: 1, results: [foundPatient] });
      }
      if (path.startsWith(ENDPOINTS.WARD_ATTENDING_DOCTORS)) {
        return Promise.resolve([onDutyDoctor, offDutyDoctor]);
      }
      if (path.startsWith(ENDPOINTS.WARD_BEDS)) {
        return Promise.resolve({ count: 1, results: [emergencyBed] });
      }
      // The page's own eligible-episode / already-admitted fetches — empty,
      // not under test here.
      return Promise.resolve({ count: 0, results: [] });
    });
  }

  async function openEmergencyPanel() {
    mockEmergencyBackend();
    render(<NurseDashboard user={user} initialStats={stats} slug="demo-clinic" />);
    fireEvent.click(screen.getByRole('button', { name: 'Admit Patient' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Emergency admission' }));
    await screen.findByRole('dialog', { name: 'Emergency admission' });
  }

  async function selectPatient() {
    fireEvent.change(screen.getByLabelText('Find the patient'), { target: { value: 'Emeka' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    fireEvent.click(await screen.findByRole('button', { name: /Emeka Uche/ }));
  }

  async function fillBedAndReason(reason = 'Collapsed at reception') {
    fireEvent.change(await screen.findByLabelText('Bed'), { target: { value: emergencyBed.id } });
    fireEvent.change(screen.getByLabelText('Reason for admission'), { target: { value: reason } });
  }

  // Builds the backend's real error envelope — apps/core/exceptions.py
  // custom_exception_handler: {error, code, details}.
  async function reject(status: number, body: Record<string, unknown>, message: string) {
    const { ClientApiError } = await import('@/lib/client-api');
    return Promise.reject(new ClientApiError(status, body, message));
  }

  it('opens from an "Emergency admission" entry point on the Admit Patient page', async () => {
    await openEmergencyPanel();
    expect(screen.getByText('No doctor has seen this patient yet')).toBeInTheDocument();
  });

  it('searches org-visible patients and lets the nurse pick one', async () => {
    await openEmergencyPanel();
    await selectPatient();

    // Selecting replaces the search step with the patient's identity card.
    expect(screen.getByText('HCL-EM3RG')).toBeInTheDocument();
    expect(screen.queryByLabelText('Find the patient')).not.toBeInTheDocument();
  });

  it('blocks submission with an empty or whitespace-only reason — the client never sends it', async () => {
    await openEmergencyPanel();
    await selectPatient();
    fireEvent.change(await screen.findByLabelText('Bed'), { target: { value: emergencyBed.id } });

    expect(screen.getByRole('button', { name: 'Admit now' })).toBeDisabled();

    // Whitespace-only is not a bypass.
    fireEvent.change(screen.getByLabelText('Reason for admission'), { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: 'Admit now' })).toBeDisabled();
    expect(dataActionMock).not.toHaveBeenCalled();
  });

  // 🎯 THE control this rewrite exists for. It fails on the two-call version
  // — that one called ENDPOINTS.EPISODES first and would trip both
  // assertions — so it is a test that can actually fail, not one that merely
  // passes (CLAUDE.md: a test that cannot fail proves nothing).
  it('sends exactly ONE request and never creates an episode of its own — FLAG-243 closed', async () => {
    dataActionMock.mockImplementation(() => Promise.resolve(admitted()));

    await openEmergencyPanel();
    await selectPatient();
    await fillBedAndReason();
    fireEvent.click(screen.getByRole('button', { name: 'Admit now' }));

    await waitFor(() => {
      expect(dataActionMock).toHaveBeenCalledWith(
        ENDPOINTS.WARD_EMERGENCY_ADMISSIONS,
        'POST',
        {
          bed_id: emergencyBed.id,
          patient_id: foundPatient.id,
          presenting_complaint: 'Collapsed at reception',
          override: false,
        },
      );
    });
    // One request in total, and none of them to /episodes/ — there is no
    // window in which an episode can exist without the admission behind it.
    expect(dataActionMock).toHaveBeenCalledTimes(1);
    expect(dataActionMock).not.toHaveBeenCalledWith(ENDPOINTS.EPISODES, 'POST', expect.anything());

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Emergency admission' })).not.toBeInTheDocument(),
    );
  });

  it('admits a walk-in with no record at all, sending a description instead of a patient_id', async () => {
    dataActionMock.mockImplementation(() =>
      Promise.resolve(admitted({
        patient: {
          ...foundPatient,
          id: 'patient-new',
          first_name: 'man, ~40, brought in by police',
          last_name: '',
          registration_incomplete: true,
        },
      })),
    );

    await openEmergencyPanel();
    // The path the old form had no answer for: she cannot find them because
    // there is nothing to find.
    fireEvent.click(await screen.findByRole('button', { name: /Admit as a new emergency patient/i }));
    fireEvent.change(await screen.findByLabelText('Who is this patient?'), {
      target: { value: 'man, ~40, brought in by police' },
    });
    await fillBedAndReason('Unresponsive at the door');
    fireEvent.click(screen.getByRole('button', { name: 'Admit now' }));

    await waitFor(() => {
      expect(dataActionMock).toHaveBeenCalledWith(
        ENDPOINTS.WARD_EMERGENCY_ADMISSIONS,
        'POST',
        {
          bed_id: emergencyBed.id,
          description: 'man, ~40, brought in by police',
          presenting_complaint: 'Unresponsive at the door',
          override: false,
        },
      );
    });
    // `patient_id` is ABSENT, not null — the backend treats "omitted" as
    // "create a record now" and would refuse a null id.
    const body = dataActionMock.mock.calls[0][2] as Record<string, unknown>;
    expect('patient_id' in body).toBe(false);
  });

  it('sends a stated HCL-ID as a note, and never as something that identifies the patient', async () => {
    dataActionMock.mockImplementation(() => Promise.resolve(admitted()));

    await openEmergencyPanel();
    fireEvent.click(await screen.findByRole('button', { name: /Admit as a new emergency patient/i }));
    fireEvent.change(await screen.findByLabelText('Who is this patient?'), {
      target: { value: 'woman, ~30, collapsed in the market' },
    });
    fireEvent.change(screen.getByLabelText(/HealthClouda ID they say they have/i), {
      target: { value: 'HCL-SAYS0' },
    });
    await fillBedAndReason('Collapse');
    fireEvent.click(screen.getByRole('button', { name: 'Admit now' }));

    await waitFor(() => {
      expect(dataActionMock).toHaveBeenCalledWith(
        ENDPOINTS.WARD_EMERGENCY_ADMISSIONS,
        'POST',
        expect.objectContaining({ stated_hcl_id: 'HCL-SAYS0' }),
      );
    });
    // It rides along as a note only: it is NOT sent as patient_id, which is
    // what "it grants nothing and links nothing" means in practice.
    const body = dataActionMock.mock.calls[0][2] as Record<string, unknown>;
    expect(body.patient_id).toBeUndefined();
  });

  it('includes the selected attending doctor as attending_doctor_id, and omits the field when none is chosen', async () => {
    dataActionMock.mockImplementation(() => Promise.resolve(admitted()));

    await openEmergencyPanel();
    await selectPatient();
    await fillBedAndReason('Chest pain');
    fireEvent.change(await screen.findByLabelText('Attending doctor'), { target: { value: onDutyDoctor.id } });

    // Before submit closes the panel: both doctors are offered — the off-duty
    // one is never silently dropped from the picker.
    expect(screen.getByRole('option', { name: onDutyDoctor.full_name })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: offDutyDoctor.full_name })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Admit now' }));

    await waitFor(() => {
      expect(dataActionMock).toHaveBeenCalledWith(
        ENDPOINTS.WARD_EMERGENCY_ADMISSIONS,
        'POST',
        expect.objectContaining({ attending_doctor_id: onDutyDoctor.id }),
      );
    });
  });

  it('an off-duty doctor is selectable, and "Admit anyway" resends the ONE override flag this endpoint actually reads', async () => {
    dataActionMock.mockImplementation(() =>
      reject(
        400,
        {
          error: 'attending_doctor: Dr. Femi Adeyemi is not currently on duty. Resend with attending_doctor_override=true to assign them anyway.',
          code: 'BAD_REQUEST',
          details: {
            attending_doctor: ['Dr. Femi Adeyemi is not currently on duty. Resend with attending_doctor_override=true to assign them anyway.'],
          },
        },
        'attending_doctor: Dr. Femi Adeyemi is not currently on duty. Resend with attending_doctor_override=true to assign them anyway.',
      ),
    );

    await openEmergencyPanel();
    await selectPatient();
    await fillBedAndReason('Chest pain');

    // Selectable, not disabled — the override must be reachable from the UI,
    // per the medical advisor's "a night with no on-duty doctor must never
    // refuse an admission outright".
    expect(screen.getByRole('option', { name: offDutyDoctor.full_name })).not.toBeDisabled();
    fireEvent.change(screen.getByLabelText('Attending doctor'), { target: { value: offDutyDoctor.id } });
    fireEvent.click(screen.getByRole('button', { name: 'Admit now' }));

    expect(await screen.findByText(/is not currently on duty/)).toBeInTheDocument();
    // A deliberate pause, not a silent retry — and only ONE request so far.
    expect(dataActionMock).toHaveBeenCalledTimes(1);

    dataActionMock.mockImplementationOnce(() => Promise.resolve(admitted({ admission: { id: 'adm-6' } })));
    fireEvent.click(screen.getByRole('button', { name: 'Admit anyway' }));

    await waitFor(() => {
      expect(dataActionMock).toHaveBeenLastCalledWith(
        ENDPOINTS.WARD_EMERGENCY_ADMISSIONS,
        'POST',
        expect.objectContaining({ attending_doctor_id: offDutyDoctor.id, override: true }),
      );
    });
    // 🔴 The field the backend's own message tells her to send does NOT exist
    // on this endpoint — DRF drops unknown keys, so sending it would loop for
    // ever (backend FLAG-601, reproduced against real Postgres 2026-09-18).
    // Asserting its ABSENCE is what stops a well-meaning "follow the error
    // message" change from silently breaking the only override that works.
    const lastBody = dataActionMock.mock.calls.at(-1)?.[2] as Record<string, unknown>;
    expect('attending_doctor_override' in lastBody).toBe(false);
  });

  it('keeps the backend’s "Resend with …=true" instruction off the nurse’s screen', async () => {
    dataActionMock.mockImplementation(() =>
      reject(
        400,
        {
          error: "gender: Sex not recorded — this is a Female ward. Resend with override=true to admit anyway.",
          code: 'BAD_REQUEST',
          details: { gender: 'Sex not recorded — this is a Female ward. Resend with override=true to admit anyway.' },
        },
        "gender: Sex not recorded — this is a Female ward. Resend with override=true to admit anyway.",
      ),
    );

    await openEmergencyPanel();
    await selectPatient();
    await fillBedAndReason('Trauma');
    fireEvent.click(screen.getByRole('button', { name: 'Admit now' }));

    // The clinical half is shown…
    expect(await screen.findByText(/Sex not recorded/)).toBeInTheDocument();
    // …the API instruction is not. She has a button; and on the on-duty
    // variant of this message the instruction is actively wrong (FLAG-601).
    expect(screen.queryByText(/Resend with/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Admit anyway' })).toBeInTheDocument();
  });

  it('shows the ward-gender two-step as a deliberate warning, and the override resends as `override`', async () => {
    dataActionMock.mockImplementation(() =>
      reject(
        400,
        {
          error: "gender: Patient gender (Male) does not match the ward's gender policy (Female). Resend with override=true to admit anyway.",
          code: 'BAD_REQUEST',
          details: {
            gender: "Patient gender (Male) does not match the ward's gender policy (Female). Resend with override=true to admit anyway.",
          },
        },
        "gender: Patient gender (Male) does not match the ward's gender policy (Female). Resend with override=true to admit anyway.",
      ),
    );

    await openEmergencyPanel();
    await selectPatient();
    await fillBedAndReason('Trauma');
    fireEvent.click(screen.getByRole('button', { name: 'Admit now' }));

    expect(await screen.findByText(/does not match the ward's gender policy/)).toBeInTheDocument();
    expect(dataActionMock).toHaveBeenCalledTimes(1);

    dataActionMock.mockImplementationOnce(() => Promise.resolve(admitted({ admission: { id: 'adm-5' } })));
    fireEvent.click(screen.getByRole('button', { name: 'Admit anyway' }));

    await waitFor(() => {
      expect(dataActionMock).toHaveBeenLastCalledWith(
        ENDPOINTS.WARD_EMERGENCY_ADMISSIONS,
        'POST',
        expect.objectContaining({ override: true }),
      );
    });
  });

  it('a deceased patient is a hard stop — field-shaped, with no override offered', async () => {
    dataActionMock.mockImplementation(() =>
      reject(
        400,
        {
          error: 'patient: This patient cannot be admitted at this time. Please check the record.',
          code: 'BAD_REQUEST',
          details: { patient: 'This patient cannot be admitted at this time. Please check the record.' },
        },
        'patient: This patient cannot be admitted at this time. Please check the record.',
      ),
    );

    await openEmergencyPanel();
    await selectPatient();
    await fillBedAndReason('Brought in unresponsive');
    fireEvent.click(screen.getByRole('button', { name: 'Admit now' }));

    expect(await screen.findByText(/cannot be admitted at this time/)).toBeInTheDocument();
    // No two-step: resending cannot change this outcome, so the form must not
    // imply that it can.
    expect(screen.queryByRole('button', { name: 'Admit anyway' })).not.toBeInTheDocument();
  });

  // Backend #217 moved BOTH the bed race and "this patient already has an
  // active admission" to 409, and both arrive as a flat {error} with no
  // `details` — indistinguishable without matching on wording. So the notice
  // must repeat the SERVER's sentence rather than this file's canned bed
  // message: "that bed was just taken" would send her round a loop that
  // picking another bed can never end.
  it('a 409 says what the server said — "already admitted" is not reported as a bed race', async () => {
    useToastStore.setState({ toasts: [] });
    dataActionMock.mockImplementation(() =>
      reject(
        409,
        { error: 'This patient already has an active admission in your organization.' },
        'This patient already has an active admission in your organization.',
      ),
    );

    await openEmergencyPanel();
    await selectPatient();
    await fillBedAndReason('Chest pain');
    fireEvent.click(screen.getByRole('button', { name: 'Admit now' }));

    expect(await screen.findByText(/already has an active admission/)).toBeInTheDocument();
    expect(screen.queryByText(/That bed was just taken/)).not.toBeInTheDocument();
    // The panel stays open and usable — nothing was written server-side, so
    // this is a re-pick, never a lost admission.
    expect(screen.getByRole('dialog', { name: 'Emergency admission' })).toBeInTheDocument();
  });

  it('a genuine bed race still reads as a bed race', async () => {
    dataActionMock.mockImplementation(() =>
      reject(
        409,
        { error: 'Bed ER-01 is no longer available (status: OCCUPIED). Please choose another bed.' },
        'Bed ER-01 is no longer available (status: OCCUPIED). Please choose another bed.',
      ),
    );

    await openEmergencyPanel();
    await selectPatient();
    await fillBedAndReason('Severe bleeding');
    fireEvent.click(screen.getByRole('button', { name: 'Admit now' }));

    expect(await screen.findByText(/no longer available/)).toBeInTheDocument();
    // Her bed choice is cleared so she re-picks from the refreshed list; the
    // rest of what she typed survives.
    expect(screen.getByLabelText('Bed')).toHaveValue('');
    expect(screen.getByLabelText('Reason for admission')).toHaveValue('Severe bleeding');
    // ⚠️ And NOT the old two-call wording: there is no half-finished episode
    // to go and find any more.
    expect(screen.queryByText(/Episode started for/)).not.toBeInTheDocument();
  });

  it('a patient id this hospital cannot reach is refused as a plain not-found, with no hint the record exists elsewhere', async () => {
    dataActionMock.mockImplementation(() =>
      reject(400, { error: 'Patient not found.' }, 'Patient not found.'),
    );

    await openEmergencyPanel();
    await selectPatient();
    await fillBedAndReason('Collapse');
    fireEvent.click(screen.getByRole('button', { name: 'Admit now' }));

    // Byte-identical to a genuine typo, on purpose: reception's search is
    // platform-wide, so ids are trivially obtainable and the refusal must not
    // confirm that a record exists at another hospital (backend FLAG-593).
    // The UI must not dress it up with "try another hospital" language.
    expect(await screen.findByText('Patient not found.')).toBeInTheDocument();
    expect(screen.queryByText(/another hospital|another organisation|another organization/i)).not.toBeInTheDocument();
  });

  it('tells the nurse when the record went in incomplete, so reception knows to finish it', async () => {
    useToastStore.setState({ toasts: [] });
    dataActionMock.mockImplementation(() =>
      Promise.resolve(admitted({
        admission: { id: 'adm-9', needs_attending_doctor: true },
        patient: { ...foundPatient, first_name: 'man, ~40', last_name: '', registration_incomplete: true },
      })),
    );

    await openEmergencyPanel();
    fireEvent.click(await screen.findByRole('button', { name: /Admit as a new emergency patient/i }));
    fireEvent.change(await screen.findByLabelText('Who is this patient?'), { target: { value: 'man, ~40' } });
    await fillBedAndReason('Collapse at the door');
    fireEvent.click(screen.getByRole('button', { name: 'Admit now' }));

    await waitFor(() => expect(useToastStore.getState().toasts.length).toBeGreaterThan(0));
    const messages = useToastStore.getState().toasts.map(t => t.message).join(' ');
    expect(messages).toMatch(/record incomplete/i);
    expect(messages).toMatch(/no attending doctor/i);
  });
});

/**
 * Part 2 — the full ordered admission workflow, added to the contract
 * 2026-09-12 after this PR was already underway. Owner's stated reason:
 * "the owner intends to walk the entire admission workflow himself, through
 * the screens" — so the bar is a person can go from a doctor deciding to
 * admit through to a discharge without hitting a dead end.
 *
 * Re-verified against backend source 2026-09-14 — the Part 2 backend
 * (ward.AdmissionRequest, reassign-doctor, discharge_outcome) is now built
 * and merged to `develop`. Fixture field names below match
 * `AdmissionRequestListSerializer`/`AdmissionRequestDetailSerializer`
 * (`apps/ward/serializers.py`) value-for-value, no longer a contract guess.
 */
describe('WARD-PART2 — nurse admission-request queue (accept/decline)', () => {
  const pendingRequest = {
    id: 'req-1',
    patient: { id: 'patient-zainab', healthclouda_id: 'HCL-ZN001', first_name: 'Zainab', last_name: 'Suleiman' },
    episode: 'ep-req-1',
    requested_by: { id: 'doc-req-1', first_name: 'Tunde', last_name: 'Bakare' },
    requested_ward: null,
    level_of_care: 'ICU',
    urgency: 'URGENT',
    clinical_reason: 'Post-op monitoring required',
    status: 'REQUESTED',
    decline_reason: '',
    resulting_admission: null,
    created_at: '2026-09-12T10:00:00Z',
  };

  const requestBed = {
    id: 'bed-icu-1',
    bed_number: 'ICU-01',
    status: 'AVAILABLE',
    ward: { id: 'ward-icu', name: 'ICU', category: 'ICU' },
    room: null,
    current_patient: null,
    assigned_at: null,
    created_at: '2026-01-01T00:00:00Z',
  };

  function mockQueueBackend() {
    dataGetMock.mockImplementation((path: string) => {
      if (path.startsWith(ENDPOINTS.ADMISSION_REQUESTS)) {
        return Promise.resolve({ count: 1, results: [pendingRequest] });
      }
      if (path.startsWith(ENDPOINTS.WARD_BEDS)) {
        return Promise.resolve({ count: 1, results: [requestBed] });
      }
      return Promise.resolve({ count: 0, results: [] });
    });
  }

  async function openQueue() {
    mockQueueBackend();
    render(<NurseDashboard user={user} initialStats={stats} slug="demo-clinic" />);
    fireEvent.click(screen.getByRole('button', { name: 'Admission Requests' }));
    await screen.findByText('Zainab Suleiman');
  }

  it('lists a REQUESTED admission request with urgency, level of care and who asked', async () => {
    await openQueue();
    expect(screen.getByText('Zainab Suleiman')).toBeInTheDocument();
    expect(screen.getByText(/Urgent/)).toBeInTheDocument();
    expect(screen.getByText('ICU')).toBeInTheDocument();
    expect(screen.getByText(/Post-op monitoring required/)).toBeInTheDocument();
    expect(screen.getByText(/Tunde Bakare/)).toBeInTheDocument();
  });

  it('accepting picks a bed and admits — POST .../accept/ with the bed id', async () => {
    dataActionMock.mockResolvedValue({ message: 'ok', admission: { id: 'adm-9' } });
    await openQueue();

    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    fireEvent.change(await screen.findByLabelText('Bed'), { target: { value: requestBed.id } });
    fireEvent.click(screen.getByRole('button', { name: 'Accept & admit' }));

    await waitFor(() => {
      expect(dataActionMock).toHaveBeenCalledWith(
        ENDPOINTS.ADMISSION_REQUEST_ACCEPT(pendingRequest.id),
        'POST',
        { bed: requestBed.id, override: false },
      );
    });
  });

  it('shows the gender two-step on Accept too, then resends with override=true (FLAG-031)', async () => {
    const { ClientApiError } = await import('@/lib/client-api');
    // `details.gender` (a string) — the real shape on all three admit
    // surfaces since backend #194 (FLAG-031 closed at source).
    dataActionMock.mockRejectedValueOnce(
      new ClientApiError(
        400,
        {
          error: "gender: Patient gender (Male) does not match the ward's gender policy (Female). Resend with override=true to admit anyway.",
          code: 'BAD_REQUEST',
          details: {
            gender: "Patient gender (Male) does not match the ward's gender policy (Female). Resend with override=true to admit anyway.",
          },
        },
        "gender: Patient gender (Male) does not match the ward's gender policy (Female). Resend with override=true to admit anyway.",
      ),
    );
    await openQueue();

    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    fireEvent.change(await screen.findByLabelText('Bed'), { target: { value: requestBed.id } });
    fireEvent.click(screen.getByRole('button', { name: 'Accept & admit' }));

    expect(await screen.findByText(/does not match the ward's gender policy/)).toBeInTheDocument();
    expect(dataActionMock).toHaveBeenCalledTimes(1);

    dataActionMock.mockResolvedValueOnce({ message: 'ok', admission: { id: 'adm-10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Admit anyway' }));

    await waitFor(() => {
      expect(dataActionMock).toHaveBeenLastCalledWith(
        ENDPOINTS.ADMISSION_REQUEST_ACCEPT(pendingRequest.id),
        'POST',
        { bed: requestBed.id, override: true },
      );
    });
  });

  it('is a first-class refusal: declining requires a non-blank reason and posts it', async () => {
    dataActionMock.mockResolvedValue({ message: 'ok' });
    await openQueue();

    fireEvent.click(screen.getByRole('button', { name: 'Decline' }));
    // Two "Decline" buttons are on screen now: the row action (still
    // rendered behind the panel) and the panel's own submit — same shape as
    // the WARD-1 "Admit" panels above.
    await screen.findByLabelText('Reason for declining');
    const declineButton = screen.getAllByRole('button', { name: 'Decline' }).slice(-1)[0];

    // Blank reason never sends the request.
    expect(declineButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Reason for declining'), {
      target: { value: 'No ICU bed available; requesting transfer to a partner facility.' },
    });
    expect(declineButton).not.toBeDisabled();
    fireEvent.click(declineButton);

    await waitFor(() => {
      expect(dataActionMock).toHaveBeenCalledWith(
        ENDPOINTS.ADMISSION_REQUEST_DECLINE(pendingRequest.id),
        'POST',
        { decline_reason: 'No ICU bed available; requesting transfer to a partner facility.' },
      );
    });
  });
});

describe('WARD-PART2 — discharge with outcome', () => {
  // Deliberately off-duty — Q3's "signed by a doctor" is not gated by duty
  // the way Q2's attending-doctor picker is (FLAG-041).
  const signingDoctor = { id: 'doc-sign-1', full_name: 'Dr. Ada Obi', staff_id: 'DOC-S1', is_on_duty: false };

  function mockDischargeBackend() {
    dataGetMock.mockImplementation((path: string) => {
      if (path.startsWith(ENDPOINTS.NURSE_MY_PATIENTS)) {
        return Promise.resolve({ count: 1, results: [admission] });
      }
      if (path.startsWith(ENDPOINTS.WARD_ATTENDING_DOCTORS)) {
        return Promise.resolve([signingDoctor]);
      }
      return Promise.resolve({ count: 0, results: [] });
    });
  }

  async function openDischarge() {
    mockDischargeBackend();
    render(<NurseDashboard user={user} initialStats={stats} slug="demo-clinic" />);
    fireEvent.click(screen.getByRole('button', { name: 'My Patients' }));
    await screen.findByText(/Chidi Nwosu/);
    fireEvent.click(screen.getByRole('button', { name: 'Discharge' }));
  }

  it('FLAG-045/FLAG-592 — offers ONLY Absconded and Deceased, never Routine / Transferred out / Against medical advice', async () => {
    // The positive control: the previous version of this gate only blocked
    // AGAINST_MEDICAL_ADVICE (a second boolean living beside the outcome
    // list), leaving ROUTINE/TRANSFERRED_OUT open to a nurse — the exact
    // bug the owner's 2026-09-17 decision (backend FLAG-592) closed. The
    // likely regression is this spreading the wrong way and hiding the two
    // outcomes a nurse must still be able to record at 3am with no doctor
    // reachable — so both halves are asserted here, not just the omission.
    await openDischarge();

    const select = screen.getByLabelText('Outcome') as HTMLSelectElement;
    const values = Array.from(select.options).map(o => o.value);
    expect(values).toEqual(['ABSCONDED', 'DECEASED']);
    expect(values).not.toContain('ROUTINE');
    expect(values).not.toContain('TRANSFERRED_OUT');
    expect(values).not.toContain('AGAINST_MEDICAL_ADVICE');
  });

  it('an absconded discharge sends discharge_outcome=ABSCONDED with discovered_at, and tells the nurse it awaits doctor confirmation', async () => {
    useToastStore.setState({ toasts: [] });
    dataActionMock.mockResolvedValue({ message: 'ok' });
    await openDischarge();

    // ABSCONDED is the default (first allowed outcome) — the select need
    // not be touched to reach it.
    fireEvent.change(screen.getByLabelText('Discovered at'), { target: { value: '2026-09-17T03:00' } });
    const submit = screen.getAllByRole('button', { name: 'Discharge' }).slice(-1)[0];
    expect(submit).not.toBeDisabled();
    fireEvent.click(submit);

    const expectedDiscoveredAt = new Date('2026-09-17T03:00').toISOString();
    await waitFor(() => {
      expect(dataActionMock).toHaveBeenCalledWith(
        ENDPOINTS.ADMISSION_DISCHARGE(admission.id),
        'POST',
        { discharge_outcome: 'ABSCONDED', discovered_at: expectedDiscoveredAt },
      );
    });
    await waitFor(() => expect(useToastStore.getState().toasts.length).toBeGreaterThan(0));
    const messages = useToastStore.getState().toasts.map(t => t.message).join(' ');
    expect(messages).toMatch(/awaiting doctor confirmation/i);
  });

  it('DECEASED never uses success/celebratory styling — no green "Discharge" button, an explicit warning, and a neutral confirmation', async () => {
    dataActionMock.mockResolvedValue({ message: 'ok' });
    await openDischarge();

    fireEvent.change(screen.getByLabelText('Outcome'), { target: { value: 'DECEASED' } });

    // The submit button relabels away from "Discharge" and away from the
    // ordinary primary (green/blue) styling — this is the literal ask: this
    // outcome must never sit in the UI styled like the others. Only the ROW
    // action button (unaffected by the panel's outcome state) still reads
    // "Discharge" — the panel's own submit does not.
    expect(screen.queryAllByRole('button', { name: 'Discharge' })).toHaveLength(1);
    const recordButton = screen.getByRole('button', { name: 'Record outcome' });
    expect(recordButton.className).not.toMatch(/bg-primary/);

    // An explicit, plainly-worded confirmation is shown — not silence.
    expect(screen.getByText(/records the patient as deceased/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Time of death'), { target: { value: '2026-09-12T09:30' } });
    fireEvent.click(recordButton);

    // FLAG-242 — the raw `datetime-local` value ("2026-09-12T09:30") carries
    // no timezone. The backend runs `TIME_ZONE='UTC'`, `USE_TZ=True`, and
    // `DischargeSerializer.deceased_at` is a plain `DateTimeField`, so
    // sending that string naked makes the server treat 09:30 AS ALREADY
    // UTC — an hour (or more) wrong for anyone west of Greenwich. Comparing
    // against `new Date(...).toISOString()` (rather than a hardcoded literal)
    // keeps this assertion honest about WHAT property matters — the
    // submitted value represents the same instant the browser resolved the
    // input to, with an explicit offset — without hardcoding this machine's
    // timezone into the test.
    const expectedDeceasedAt = new Date('2026-09-12T09:30').toISOString();
    await waitFor(() => {
      expect(dataActionMock).toHaveBeenCalledWith(
        ENDPOINTS.ADMISSION_DISCHARGE(admission.id),
        'POST',
        expect.objectContaining({ discharge_outcome: 'DECEASED', deceased_at: expectedDeceasedAt }),
      );
    });
    // Belt-and-braces: whatever `expectedDeceasedAt` resolves to on this
    // machine, it must carry an explicit offset. A value that happened to
    // equal the raw local string would pass the `objectContaining` check
    // above by accident if `toISOString` were ever swapped for something
    // that doesn't convert — this line is the one that actually catches that.
    const sentPayload = dataActionMock.mock.calls.at(-1)?.[2] as Record<string, string>;
    expect(sentPayload.deceased_at).toMatch(/Z$|[+-]\d{2}:\d{2}$/);
    expect(sentPayload.deceased_at).not.toBe('2026-09-12T09:30');
  });
});

describe('WARD-PART2 — no doctor-reassign control on the nurse dashboard', () => {
  // `AdmissionViewSet.reassign_doctor` is DOCTOR-only and 403s for every
  // other role (`apps/ward/views.py`) — a "Doctor" button here would 403 on
  // every click. An earlier version of this PR had exactly that button,
  // wired to a test that mocked `dataAction` resolving `{message: 'ok'}`, a
  // response the real backend can never send from this role. This is a
  // negative control against that regressing, not a feature test.
  it('renders no "Doctor" reassign button on the My Patients table', async () => {
    dataGetMock.mockImplementation((path: string) => {
      if (path.startsWith(ENDPOINTS.NURSE_MY_PATIENTS)) {
        return Promise.resolve({ count: 1, results: [admission] });
      }
      return Promise.resolve({ count: 0, results: [] });
    });
    render(<NurseDashboard user={user} initialStats={stats} slug="demo-clinic" />);
    fireEvent.click(screen.getByRole('button', { name: 'My Patients' }));
    await screen.findByText(/Chidi Nwosu/);

    expect(screen.queryByRole('button', { name: 'Doctor' })).not.toBeInTheDocument();
    // Discharge stays nurse-reachable (only the reassign control is the 403
    // trap), so only its absence is asserted, not the whole row-actions cell.
    expect(screen.getByRole('button', { name: 'Discharge' })).toBeInTheDocument();
  });

});
