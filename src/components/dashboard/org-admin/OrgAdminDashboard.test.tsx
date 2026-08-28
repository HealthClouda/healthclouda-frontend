import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { OrgAdminDashboard } from './OrgAdminDashboard';
import type { User } from '@/types/auth';

/**
 * A6 (sprint plan Tier 1) — remove the org-admin consent bypass.
 *
 * Written RED against the pre-fix code, per the pre-fix/post-fix discipline.
 *
 * WHY THIS MATTERS: `POST /org-admin/access-requests/<id>/review/` was REMOVED
 * by the backend as a deliberate security fix (audit ORGADMIN-1). It allowed an
 * organisation admin to approve another org's request to read a patient's
 * records WITHOUT that patient's consent — and patient consent is the entire
 * point of the access-request flow. The frontend never stopped calling it.
 *
 * Today the call 404s, so the org admin sees "Failed" and nothing happens. That
 * is a *broken* control, not a safe one: the UI still presents Approve/Deny as
 * an admin's decision to make, which is exactly the mental model the backend
 * removed. With real PHI arriving 3 Sep, the affordance has to go, not just fail.
 *
 * The read-only list stays — an org admin can still SEE requests, which is
 * legitimate oversight. Approving is the patient's decision, made through the
 * consent link (or in-app, DASH-6/D6).
 */

// Sidebar/Header use next/navigation for logout — not under test here.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/demo-clinic/org-admin',
}));

// The whole data layer is mocked at the client-api seam — useApi and
// usePaginatedList run for real on top of these spies.
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
  id: 'oa1',
  email: 'admin@demo.test',
  first_name: 'Amaka',
  last_name: 'Eze',
  role: 'ORGANIZATION_ADMIN',
  organization_slug: 'demo-clinic',
} as unknown as User;

// CAPTURED from GET /org-admin/dashboard/stats/ against api-dev 2026-08-19,
// values changed but keys verbatim. The previous fixture invented
// `total_patients` and `active_episodes`, which the endpoint does not return —
// so these tests passed while two stat cards rendered '—' against real data.
// Fixtures here must mirror a real payload; that is the whole point of them.
const stats = {
  total_staff: 12,
  active_patients: 340,
  todays_appointments: 3,
  bed_occupancy: '5/20',
  pending_access_requests: 1,
  critical_alerts: 0,
};

// A PENDING request — the only status that ever rendered the action buttons.
const pendingRequest = {
  id: 'ar-1',
  patient_name: 'Chidi Nwosu',
  staff_name: 'Dr Bello (Lagos General)',
  reason: 'Referred for cardiology follow-up',
  status: 'PENDING',
  created_at: '2026-08-11T09:15:00Z',
};

// DRF paged envelope — never a bare array.
const envelope = { count: 1, next: null, previous: null, results: [pendingRequest] };

beforeEach(() => {
  vi.clearAllMocks();
  dataGetMock.mockResolvedValue(envelope);
});

async function openAccessRequestsPage() {
  render(<OrgAdminDashboard user={user} initialStats={stats} slug="demo-clinic" />);
  fireEvent.click(screen.getByRole('button', { name: 'Access Requests' }));
  await waitFor(() => {
    expect(screen.getByText('Chidi Nwosu')).toBeInTheDocument();
  });
}

describe('OrgAdmin access requests (A6 — consent bypass removed)', () => {
  it('still lists access requests read-only', async () => {
    await openAccessRequestsPage();
    expect(screen.getByText('Dr Bello (Lagos General)')).toBeInTheDocument();
    expect(screen.getByText(/cardiology follow-up/)).toBeInTheDocument();
  });

  it('offers NO Approve button on a pending request', async () => {
    await openAccessRequestsPage();
    expect(screen.queryByRole('button', { name: /^approve$/i })).toBeNull();
  });

  it('offers NO Deny button on a pending request', async () => {
    await openAccessRequestsPage();
    expect(screen.queryByRole('button', { name: /^deny$/i })).toBeNull();
  });

  it('renders no Actions column header at all', async () => {
    await openAccessRequestsPage();
    expect(screen.queryByText('Actions')).toBeNull();
  });

  // NOTE: an earlier version of this file asserted "dataAction was never called
  // with /review/". It PASSED against the pre-fix code — nothing in the test
  // clicks anything, so it was trivially true and proved nothing (T2: a test
  // that passed before your change is not a guard). The real guards are the
  // three button/column assertions above, plus the endpoint-constant check in
  // config.test.ts. What follows is the one write-side assertion that is
  // actually load-bearing: the row must offer no decision affordance at all.
  it('renders the pending row with no interactive control of any kind', async () => {
    await openAccessRequestsPage();
    const row = screen.getByText('Chidi Nwosu').closest('tr')!;
    expect(row.querySelectorAll('button, a, input, select')).toHaveLength(0);
  });
});

/**
 * D2 Org Admin (sprint plan Mon 17 Aug row) — Staff page rebuilt onto
 * DataTable/SlidePanel, with the one new write workflow it never had:
 * staff invite (POST /org-admin/staff/). Body shape (full_name, lowercase
 * role) is NOT in the live schema — carried forward from the 2026-07-11
 * empirical verification recorded in HANDOFF-Bastoh.md, not guessed here.
 */
describe('OrgAdmin — filtering resets pagination', () => {
  // Regression: `usePaginatedList` keeps `page` across endpoint changes, so
  // filtering from page 2 asked for page 2 of a shorter filtered list. DRF
  // answers 404 "Invalid page" and the table shows the error state instead of
  // the results. Needs >1 page of data to reproduce, which is why it survived.
  const many = Array.from({ length: 20 }, (_, i) => ({ ...pendingRequest, id: `ar-${i}`, patient_name: `Patient ${i}` }));
  const bigEnvelope = { count: 45, next: 'x', previous: null, results: many };

  it('drops back to page 1 when the status filter changes', async () => {
    dataGetMock.mockResolvedValue(bigEnvelope);
    render(<OrgAdminDashboard user={user} initialStats={stats} slug="demo-clinic" />);
    fireEvent.click(screen.getByRole('button', { name: 'Access Requests' }));
    await waitFor(() => expect(screen.getByText('Patient 0')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => {
      expect(dataGetMock).toHaveBeenCalledWith(expect.stringContaining('page=2'));
    });

    dataGetMock.mockClear();
    fireEvent.change(screen.getByLabelText(/filter by request status/i), { target: { value: 'PENDING' } });

    await waitFor(() => expect(dataGetMock).toHaveBeenCalled());
    for (const [path] of dataGetMock.mock.calls) {
      expect(path).not.toContain('page=2');
    }
    expect(dataGetMock).toHaveBeenCalledWith(expect.stringContaining('status=PENDING'));
  });

  it('labels the status filter and the patient search for screen readers', async () => {
    dataGetMock.mockResolvedValue(envelope);
    render(<OrgAdminDashboard user={user} initialStats={stats} slug="demo-clinic" />);
    fireEvent.click(screen.getByRole('button', { name: 'Access Requests' }));
    await waitFor(() => expect(screen.getByLabelText(/filter by request status/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Patients' }));
    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /search patients/i })).toBeInTheDocument();
    });
  });
});

describe('OrgAdmin — Staff invite', () => {
  // CAPTURED from GET /org-admin/staff/ against api-dev 2026-08-19. Two things
  // the old fixture got wrong, both of which hid a rendering bug:
  //   1. the endpoint returns `full_name`, not first_name/last_name — the old
  //      shape came from /auth/users/, so every row rendered a blank name;
  //   2. it returns a BARE ARRAY, not a DRF envelope, so there is no pagination
  //      here at all. The fixture wrapped it in {count,results}, which
  //      `usePaginatedList` tolerates — hiding the difference.
  //   3. `role` is lowercase ("nurse"), not uppercase ("NURSE").
  const staffMember = {
    id: 's-1', full_name: 'Ngozi Eze', role: 'nurse',
    email: 'ngozi@demo-clinic.test', phone: null, is_active: true,
  };
  const staffList = [staffMember];

  async function openStaffPage() {
    dataGetMock.mockImplementation(async (path: string) => {
      if (path.startsWith('/org-admin/staff/')) return staffList;
      return envelope;
    });
    render(<OrgAdminDashboard user={user} initialStats={stats} slug="demo-clinic" />);
    fireEvent.click(screen.getByRole('button', { name: 'Staff' }));
    await waitFor(() => expect(screen.getByText('Ngozi Eze')).toBeInTheDocument());
  }

  it('lists staff from the real /org-admin/staff/ payload', async () => {
    await openStaffPage();
    expect(screen.getByText('ngozi@demo-clinic.test')).toBeInTheDocument();
  });

  // The bug these fixtures used to hide: rows rendered, so the table "worked",
  // but every human-readable cell was blank because the field names were from
  // a different endpoint. Assert the NAME, not just row presence.
  it('renders the staff name, not a blank cell', async () => {
    await openStaffPage();
    const row = screen.getByText('Ngozi Eze').closest('tr');
    expect(row).not.toBeNull();
    expect(row!.textContent).toContain('Ngozi Eze');
    // '—' is the empty-value placeholder; a row of them is the failure mode.
    expect(row!.textContent?.match(/—/g)?.length ?? 0).toBeLessThan(2);
    // ...and the em-dash count alone CANNOT see the Role column bug, because a
    // raw lowercase role is not an em dash. The fixture's role is 'nurse'
    // (lowercase, as this endpoint really returns it); the column must show the
    // humanised label. The negative assertion is the one with teeth.
    expect(row!.textContent).toContain('Nurse');
    expect(row!.textContent).not.toContain('nurse');
  });

  it('sends full_name and a lowercase role, not first/last name or uppercase role', async () => {
    await openStaffPage();
    fireEvent.click(screen.getByRole('button', { name: /invite staff/i }));
    const panel = screen.getByRole('dialog');
    fireEvent.change(within(panel).getByLabelText(/full name/i), { target: { value: 'Tunde Bakare' } });
    fireEvent.change(within(panel).getByLabelText(/^email \*/i), { target: { value: 'tunde@demo-clinic.test' } });
    fireEvent.change(within(panel).getByLabelText(/^role \*/i), { target: { value: 'nurse' } });

    fireEvent.click(within(panel).getByRole('button', { name: /send invitation/i }));

    await waitFor(() => {
      // `phone` is absent, not ''. The body shape is undocumented (FLAG-207),
      // so an empty string risks failing phone-format validation and 400ing an
      // invite over a field the admin never filled in.
      expect(dataActionMock).toHaveBeenCalledWith(
        '/org-admin/staff/',
        'POST',
        { full_name: 'Tunde Bakare', email: 'tunde@demo-clinic.test', role: 'nurse' },
      );
    });
  });

  it('does not submit when required fields are missing', async () => {
    await openStaffPage();
    fireEvent.click(screen.getByRole('button', { name: /invite staff/i }));
    fireEvent.click(screen.getByRole('button', { name: /send invitation/i }));
    expect(dataActionMock).not.toHaveBeenCalledWith('/org-admin/staff/', 'POST', expect.anything());
  });
});

/**
 * Patients had NO list test before 2026-08-19 — only an accessible-name check.
 * The page shipped rendering 14 rows of blank names and '—' columns, because
 * it was typed as `PatientSummary` (the /doctor/patients/ shape) and every
 * field it read was absent from the payload.
 */
describe('OrgAdmin — Patients list', () => {
  // CAPTURED from GET /org-admin/patients/ against api-dev 2026-08-19.
  const patient = {
    id: 'p-1',
    full_name: 'Bola Adeyemi',
    healthclouda_id: 'HCL-CCBV02',
    gender: 'Female',
    phone: '08096197808',
    last_visit: '2026-08-13',
    status: 'ACTIVE',
  };
  const patientsEnvelope = { count: 1, next: null, previous: null, results: [patient] };

  async function openPatientsPage() {
    dataGetMock.mockImplementation(async (path: string) => {
      if (path.startsWith('/org-admin/patients/')) return patientsEnvelope;
      return envelope;
    });
    render(<OrgAdminDashboard user={user} initialStats={stats} slug="demo-clinic" />);
    fireEvent.click(screen.getByRole('button', { name: 'Patients' }));
    await waitFor(() => expect(screen.getByText('Bola Adeyemi')).toBeInTheDocument());
  }

  it('renders the patient name and HCL-ID, not blank cells', async () => {
    await openPatientsPage();
    const row = screen.getByText('Bola Adeyemi').closest('tr');
    expect(row).not.toBeNull();
    // The HCL-ID was returned by the API and never displayed, while the search
    // box invited searching by it.
    expect(row!.textContent).toContain('HCL-CCBV02');
    expect(row!.textContent).toContain('08096197808');
    expect(row!.textContent?.match(/—/g)?.length ?? 0).toBeLessThan(2);
  });
});

describe('OrgAdmin — Overview stat cards', () => {
  it('renders every stat card from the real payload, with no empty placeholders', async () => {
    dataGetMock.mockResolvedValue(envelope);
    render(<OrgAdminDashboard user={user} initialStats={stats} slug="demo-clinic" />);

    // `total_patients` / `active_episodes` did not exist on the payload, so
    // these two cards rendered '—' for every org until 2026-08-19.
    expect(await screen.findByText('340')).toBeInTheDocument();   // active_patients
    expect(screen.getByText('5/20')).toBeInTheDocument();          // bed_occupancy (a STRING)
    expect(screen.getByText('12')).toBeInTheDocument();            // total_staff
  });
});


/**
 * FLAG-220 — the referral journey had no accept step, anywhere in the product.
 *
 * The backend moved accept/decline to the receiving organisation's
 * ORGANIZATION_ADMIN around 20 Aug ("a doctor can no longer self-accept",
 * verbatim in the live schema). The Doctor dashboard is read-only and must stay
 * so, and Org Admin had no referrals page at all — so a referral could be
 * created and listed but never accepted, by anyone.
 *
 * Fixtures are CAPTURED from GET /referrals/received/ against api-dev on
 * 2026-08-28: a DRF envelope whose items carry 14 fields, NOT the 28-field
 * `ReferralDetail` the schema documents for this endpoint.
 */
describe('FLAG-220 — org admin can respond to incoming referrals', () => {
  const pendingReferral = {
    id: 'ref-1',
    letter_number: 'REF-OTH-2026-0002',
    patient: {
      id: 'p-1', healthclouda_id: 'HCL-CCBV02',
      first_name: 'Adaeze', last_name: 'Okafor', gender: 'Female',
    },
    patient_age_at_referral: 18,
    from_organization: { id: 'o-2', name: 'Other Clinic' },
    referring_doctor: { id: 'd-9', first_name: 'Emeka', last_name: 'Obi', full_name: 'Emeka Obi' },
    reason: 'Requires specialist evaluation and management.',
    urgency: 'SEMI_URGENT',
    urgency_display: 'Semi-Urgent - assessment within days to weeks',
    // NOTE: the schema documents no status enum for referrals, and the seeded
    // data only ever showed ACCEPTED / DECLINED. The pending value is therefore
    // UNVERIFIED, which is exactly why the UI gates by exclusion. This fixture
    // uses a deliberately unfamiliar value to prove that gating works for a
    // status we have never seen.
    status: 'AWAITING_RESPONSE',
    status_display: 'Awaiting response',
    has_letter: false,
    created_at: '2026-08-27T21:13:21.333306Z',
  };

  const resolvedReferral = {
    ...pendingReferral,
    id: 'ref-2',
    letter_number: 'REF-OTH-2026-0003',
    patient: { ...pendingReferral.patient, first_name: 'Tunde', last_name: 'Bello' },
    // A different sending org on purpose: sharing one name across fixtures makes
    // getByText ambiguous and reads like a component bug when it is a fixture bug.
    from_organization: { id: 'o-3', name: 'Lagos General' },
    status: 'DECLINED',
    status_display: 'Declined by Receiving Hospital',
  };

  const referralEnvelope = (rows: unknown[]) => ({ count: rows.length, next: null, previous: null, results: rows });

  async function openReferrals(rows: unknown[] = [pendingReferral, resolvedReferral]) {
    dataGetMock.mockResolvedValue(referralEnvelope(rows));
    render(<OrgAdminDashboard user={user} initialStats={stats} slug="demo-clinic" />);
    fireEvent.click(screen.getByRole('button', { name: 'Referrals' }));
    await waitFor(() => expect(screen.getByText('Adaeze Okafor')).toBeInTheDocument());
  }

  it('has a Referrals page at all — the capability that was missing', async () => {
    await openReferrals();
    expect(screen.getByText('Incoming referrals')).toBeInTheDocument();
    expect(screen.getByText('Other Clinic')).toBeInTheDocument();
  });

  it('offers Accept and Decline on a referral that is not yet resolved', async () => {
    await openReferrals();
    expect(screen.getByRole('button', { name: /Accept referral for Adaeze Okafor/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Decline referral for Adaeze Okafor/ })).toBeInTheDocument();
  });

  it('does NOT offer actions on an already-resolved referral', async () => {
    await openReferrals();
    expect(screen.queryByRole('button', { name: /Accept referral for Tunde Bello/ })).not.toBeInTheDocument();
    expect(screen.getByText('Declined by Receiving Hospital')).toBeInTheDocument();
  });

  it('requires response notes before the response can be sent', async () => {
    await openReferrals();
    fireEvent.click(screen.getByRole('button', { name: /Accept referral for Adaeze Okafor/ }));
    // `response_notes` is the ONLY field the schema marks required on
    // ReferralResponseRequest, so submitting without it would be a guaranteed 400.
    const submit = await screen.findByRole('button', { name: 'Accept referral' });
    expect(submit).toBeDisabled();
  });

  it('POSTs the accept with the notes, and to the generic (not doctor-namespaced) path', async () => {
    await openReferrals();
    fireEvent.click(screen.getByRole('button', { name: /Accept referral for Adaeze Okafor/ }));

    const notes = await screen.findByLabelText(/Response notes/);
    fireEvent.change(notes, { target: { value: 'Capacity confirmed, bed available.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Accept referral' }));

    await waitFor(() => expect(dataActionMock).toHaveBeenCalled());
    const [path, method, body] = dataActionMock.mock.calls[0];
    expect(path).toBe('/referrals/ref-1/accept/');
    expect(method).toBe('POST');
    expect(body).toMatchObject({ response_notes: 'Capacity confirmed, bed available.' });
  });

  it('sends the decline to the decline endpoint, with no episode fields', async () => {
    await openReferrals();
    fireEvent.click(screen.getByRole('button', { name: /Decline referral for Adaeze Okafor/ }));

    const notes = await screen.findByLabelText(/Response notes/);
    fireEvent.change(notes, { target: { value: 'No cardiology cover this week.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Decline referral' }));

    await waitFor(() => expect(dataActionMock).toHaveBeenCalled());
    const [path, , body] = dataActionMock.mock.calls[0];
    expect(path).toBe('/referrals/ref-1/decline/');
    expect(body).toEqual({ response_notes: 'No cardiology cover this week.' });
    // create_episode must never ride along on a decline.
    expect(body).not.toHaveProperty('create_episode');
  });
});
