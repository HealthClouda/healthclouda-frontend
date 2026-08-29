// ─── Stats ────────────────────────────────────────────────────

export interface SuperadminStats {
  total_organizations: number;
  active_organizations: number;
  total_users: number;
  total_patients: number;
  new_orgs_this_month?: number;
  total_staff?: number;
}

// GET /org-admin/dashboard/stats/ — CAPTURED LIVE 2026-08-19, not inferred:
//   {"total_staff":4,"active_patients":14,"todays_appointments":0,
//    "bed_occupancy":"2/7","pending_access_requests":2,"critical_alerts":0}
//
// The previous version of this interface had `total_patients` and
// `active_episodes`, which the endpoint does not return — both stat cards
// rendered a permanent '—' against real data. The design README named these
// fields correctly all along; they were changed on the assumption that the
// existing names already worked. Nobody had run the dashboard.
//
// `bed_occupancy` is a STRING ("2/7"), not a number — do not do arithmetic.
export interface OrgAdminStats {
  total_staff: number;
  active_patients: number;
  todays_appointments: number;
  bed_occupancy: string;
  pending_access_requests: number;
  critical_alerts: number;
}

// Shape verified live 2026-07-05 (GLOBAL-6) — GET /receptionist/dashboard/stats/
export interface ReceptionistStats {
  todays_patients: number;
  pending_referrals: number;
  bed_occupancy_rate: number;
  emergency_occupancy_rate: number;
  total_beds: number;
  occupied_beds: number;
  emergency_total: number;
  emergency_occupied: number;
  awaiting_assignment: number;
  todays_checkins: number;
  waiting_queue: number;
  active_episodes: number;
  on_duty_doctors: number;
}

// Shape verified live 2026-07-11 (NURSE-1) — GET /nurse/dashboard/stats/
// is ward/admission aggregates; there is NO vitals_pending / critical_patients.
export interface NurseStats {
  total_wards: number;
  total_beds: number;
  available_beds: number;
  occupied_beds: number;
  maintenance_beds: number;
  reserved_beds: number;
  occupancy_rate: number;
  active_admissions: number;
  todays_admissions: number;
  todays_discharges: number;
  patients_in_queue: number;
}

export interface DoctorStats {
  active_episodes: number;
  appointments_today: number;
  pending_referrals: number;
  active_prescriptions: number;
}

export interface PatientDashboardData {
  upcoming_appointments: number;
  active_episodes: number;
  pending_access_requests: number;
  unread_notifications?: number;
}

// ─── Entities ────────────────────────────────────────────────

// GET /org/ list item — shape verified live 2026-08-14 against OrganizationList
// in the live schema. org_type enum: HOSPITAL | CLINIC | SCHOOL_CLINIC.
export interface OrgSummary {
  id: string;
  org_id: string;
  name: string;
  slug: string;
  org_type: string;
  email: string;
  phone?: string;
  city: string;
  state: string;
  country_name: string;
  is_active: boolean;
  is_verified?: boolean;
  total_staff?: number;
  total_patients?: number;
  created_at: string;
}

// GET /org/<id>/ — the fuller detail shape (OrganizationOrgAdmin in the
// schema). is_active/is_verified/license_number/verified_at are read-only
// via this endpoint — suspend/activate/verify are separate action endpoints.
export interface OrganizationDetail extends OrgSummary {
  address: string;
  country_code: string;
  license_number: string;
  verified_at: string | null;
  total_episodes: number;
  updated_at: string;
}

// POST /org/ and PUT /org/<id>/ body — verified against OrganizationOrgAdminRequest
// live 2026-08-14. All fields required except phone.
export interface OrganizationInput {
  name: string;
  org_type: string;
  email: string;
  phone?: string;
  address: string;
  city: string;
  state: string;
  country_code: string;
  country_name: string;
}

// GET /auth/users/ item — shape verified live 2026-08-14 against UserList.
// last_login is the only signal for "invite still pending" — the backend has
// no dedicated pending-invite field or filter (FLAG-205).
// GET /org-admin/staff/ — CAPTURED LIVE 2026-08-19. Note this is a BARE ARRAY,
// not a DRF envelope, so there is no pagination on this list at all:
//   [{"id":"…","full_name":"Ada Administrator","role":"org_admin",
//     "email":"…","phone":null,"is_active":true}]
//
// Deliberately NOT `StaffMember`: that type describes `/auth/users/`, which the
// Superadmin dashboard consumes and which really does return first_name /
// last_name. Org Admin was typed as `StaffMember` and so rendered a blank name
// and a '?' avatar for every row. Two endpoints, two shapes, two types.
//
// `role` is LOWERCASE here ("org_admin", "doctor") while /auth/users/ returns
// uppercase ("ORGANIZATION_ADMIN") — a real inconsistency in the API, not a typo.
export interface OrgStaffMember {
  id: string;
  full_name: string;
  role: string;
  email: string;
  phone: string | null;
  is_active: boolean;
}

// GET /org-admin/patients/ — CAPTURED LIVE 2026-08-19 (DRF envelope):
//   {"id":"…","full_name":"Abubakar Nwosu","healthclouda_id":"HCL-CCBV02",
//    "gender":"Male","phone":"08096197808","last_visit":"2026-08-13",
//    "status":"ACTIVE"}
//
// Shares only `id` with `PatientSummary`, which describes /doctor/patients/.
// Typing this list as `PatientSummary` meant every column read a field that
// does not exist: 14 rows rendered with blank names and '—' everywhere, while
// the HCL-ID the search box advertises was returned and never displayed.
export interface OrgPatientSummary {
  id: string;
  full_name: string;
  healthclouda_id: string;
  gender?: string;
  phone?: string | null;
  last_visit?: string | null;
  status?: string;
}

export interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  phone?: string;
  is_active: boolean;
  is_on_duty?: boolean;
  date_joined?: string;
  last_login?: string | null;
  organization?: { id: string; name: string; org_id: string } | null;
}

// POST /auth/users/ body — verified against UserCreateRequest live 2026-08-14.
// password is deliberately omitted (invite flow — backend emails a
// setup-password link when it's absent); organization omitted for SUPERADMIN.
export interface UserCreateInput {
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  phone?: string;
  organization?: string;
}

// POST /org-admin/staff/ body — the live schema documents no request shape
// for this endpoint (verified 2026-08-17), so this is carried forward from
// the 2026-07-11 empirical verification (HANDOFF-Bastoh.md): `full_name`
// (not first/last, unlike /auth/users/) and a LOWERCASE role — a real
// casing inconsistency with the rest of the API, not a typo here.
export interface StaffInviteInput {
  full_name: string;
  email: string;
  role: 'doctor' | 'nurse' | 'receptionist';
  phone?: string;
}

export interface PatientSummary {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone_number?: string;
  date_of_birth?: string;
  created_at?: string;
}

// Minimised receptionist search result (REC-2) — GET /receptionist/patients/search/?query=
// Deliberately has NO email/DOB/blood_type; full detail requires granted access.
export interface PatientSearchResult {
  id: string;
  healthclouda_id: string;
  first_name: string;
  last_name: string;
  masked_phone: string;
  has_visited_org: boolean;
  has_pending_access_request: boolean;
  has_approved_access: boolean;
}

// GET /receptionist/doctors/on-duty/ — DRF envelope of these (REC-3)
export interface OnDutyDoctor {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_on_duty: boolean;
  duty_toggled_at: string | null;
}

export interface Episode {
  id: string;
  patient?: { id: string; first_name: string; last_name: string };
  patient_name?: string;
  status: string;
  chief_complaint?: string;
  created_at: string;
  closed_at?: string | null;
}

// GET /patients/me/appointments/ item (PATIENT-1) — shape verified live
// 2026-07-09. Spans all orgs the patient has visited; most recent first.
export interface PatientAppointment {
  id: string;
  organization: { name: string; slug: string };
  doctor_name: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  reason: string;
  cancelled_at: string | null;
  cancellation_reason: string;
  created_at: string;
}

/** A person as embedded in an appointment payload — never a flat `*_name` string. */
export interface AppointmentParty {
  id: string;
  first_name: string;
  last_name: string;
}

/**
 * The staff-facing appointment, as returned by `/doctor/appointments/` and
 * `/receptionist/appointments/`. Captured live 2026-08-19 (FLAG-213).
 *
 * ⚠️ This is NOT the same serializer as `PatientAppointment` below, and the two
 * genuinely disagree: the patient one carries a flat `doctor_name` string, this
 * one nests `doctor`. Only `PatientAppointment` is documented in the schema
 * (verified 2026-08-22) — this shape comes from a live capture, so treat the
 * capture as the source of truth for it and re-capture rather than infer.
 *
 * The previous version of this type invented `appointment_date`,
 * `appointment_time` and `doctor_name`. None of them exist, so every date and
 * doctor cell rendered blank against real data while the rows still drew.
 */
export interface Appointment {
  id: string;
  scheduled_at: string;
  duration_minutes?: number;
  patient?: AppointmentParty;
  doctor?: AppointmentParty;
  booked_by?: AppointmentParty;
  reason?: string;
  notes?: string;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  created_at?: string;
  /**
   * ⚠️ Optional deliberately: `status` was NOT in the 2026-08-19 capture and
   * this serializer is undocumented, so its presence is unverified. It is very
   * likely there (`PatientAppointment` has it, and `cancelled_at` implies it),
   * but callers must render a fallback rather than assume. Make it required
   * once someone confirms it with a doctor or receptionist token.
   */
  status?: string;
}

export interface Referral {
  id: string;
  patient?: { first_name: string; last_name: string };
  patient_name?: string;
  referring_doctor?: string;
  referred_to?: string;
  reason?: string;
  status: string;
  created_at: string;
}

/**
 * GET /receptionist/check-ins/ — captured live 2026-08-19 (FLAG-213).
 *
 * The previous type described `check_in_time`, a string `assigned_doctor` and
 * `chief_complaint`; none of the three exist. The endpoint returns
 * `checked_in_at`, a nested `assigned_doctor` OBJECT and `reason_for_visit`,
 * plus `queue_number` — which is precisely what a queue UI needs and was being
 * returned and thrown away.
 *
 * ⚠️ The schema documents NO response body for this endpoint (it is a
 * hand-rolled APIView), so this shape comes from a live capture and nothing
 * else. Do not "tidy" it against the schema — the schema has nothing to say.
 */
export interface CheckIn {
  id: string;
  queue_number?: number;
  patient?: { id?: string; first_name: string; last_name: string; healthclouda_id?: string };
  checked_in_at: string;
  assigned_doctor?: { id: string; first_name: string; last_name: string } | null;
  checked_in_by?: { id?: string; first_name: string; last_name: string } | null;
  reason_for_visit?: string | null;
  status: string;
  called_at?: string | null;
  completed_at?: string | null;
}

/**
 * GET /patients/{id}/ — `PatientDetail`, read from the live schema 2026-08-24.
 * Only the fields D4 consumes are listed; the serializer returns ~30.
 *
 * `has_portal_account` lives HERE and on no list endpoint — not on
 * `PatientList`, not on `PatientSearchResult` — so deciding whether to offer a
 * portal invite costs one detail fetch per patient. That is a contract fact,
 * not an oversight to optimise away.
 */
export interface PatientDetail {
  id: string;
  healthclouda_id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string;
  date_of_birth?: string | null;
  age?: number;
  gender?: string;
  has_portal_account: boolean;
  is_active?: boolean;
}

/**
 * POST /patients/ request body — `PatientCreateRequest` from the live schema
 * 2026-08-24. **Only `first_name` and `last_name` are required.**
 *
 * ⚠️ The sprint plan records a rule that email is optional but phone becomes
 * REQUIRED when email is omitted. That rule is NOT in the schema — if it
 * exists it is in the serializer's `validate()`, where our form cannot see it,
 * and the receptionist meets it as a 400 after submitting. Asked in backend
 * #137; until answered, the form asks for phone but does not hard-block on it,
 * because inventing a client-side rule the server may not share is how you get
 * a form that refuses valid data.
 */
/**
 * What `POST /patients/` actually returns — **the identifiers are NESTED.**
 *
 * ```json
 * { "message": "Patient registered successfully",
 *   "patient": { "id": "…", "healthclouda_id": "HCL-…", … } }
 * ```
 *
 * 🪤 **Reading `healthclouda_id` off the top level yields `undefined`, which is
 * indistinguishable from the field not existing** — and that is exactly the
 * mistake FLAG-216 recorded as fact for four days. The live schema documents
 * this 201 as `PatientCreate` (19 fields, no identifiers), because the *request*
 * serializer sits in the response slot. `PatientViewSet.create` re-serialises
 * the saved row with `PatientDetailSerializer`. The schema is wrong; the
 * endpoint is right (backend #137, closed with no code change; issue #101).
 *
 * Every field is optional here on purpose: this is an untrusted response shape
 * that has already been documented wrongly once, so the UI must degrade rather
 * than assume. See `readCreatedPatient()` in `ReceptionistDashboard`.
 */
export interface PatientCreateResponse {
  message?: string;
  patient?: {
    id?: string;
    healthclouda_id?: string;
    first_name?: string;
    last_name?: string;
  };
}

/** Request body for `POST /patients/` — response is `PatientCreateResponse`. */
export interface NewPatient {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  consent_given?: boolean;
}

/**
 * GET /referrals/received/ item — CAPTURED LIVE 2026-08-28 (FLAG-220).
 *
 * ⚠️ The schema is wrong twice about this endpoint, so do not "tidy" this type
 * against it: it documents the 200 as a single `ReferralDetail` (28 fields) when
 * the endpoint actually returns a **DRF envelope** whose items carry **14**. The
 * list serializer is a subset — `response_notes`, `responded_by` and the clinical
 * fields are detail-only and are NOT here.
 *
 * `patient`, `from_organization` and `referring_doctor` are nested OBJECTS.
 */
export interface OrgReferral {
  id: string;
  letter_number: string;
  patient: { id: string; healthclouda_id: string; first_name: string; last_name: string; gender?: string };
  patient_age_at_referral?: number;
  from_organization: { id: string; name: string; org_id?: string; city?: string | null; state?: string | null };
  to_organization?: { id: string; name: string };
  referring_doctor?: { id: string; first_name: string; last_name: string; full_name?: string } | null;
  reason?: string;
  urgency?: string;
  urgency_display?: string;
  status: string;
  status_display?: string;
  has_letter?: boolean;
  created_at: string;
}

/**
 * POST /referrals/{id}/accept/ and /decline/ — `ReferralResponseRequest`, read
 * from the live schema 2026-08-28. **`response_notes` is REQUIRED for both.**
 *
 * `create_episode` (accept only, in practice) asks the backend to open an episode
 * in the receiving org. The clinical fields are optional and only meaningful
 * alongside it.
 */
export interface ReferralResponseInput {
  response_notes: string;
  create_episode?: boolean;
  chief_complaint?: string;
  diagnosis?: string;
}

export interface Ward {
  id: string;
  name: string;
  total_beds: number;
  occupied_beds: number;
  // Optional: /org-admin/wards/overview/ does NOT return it (captured live
  // 2026-08-19 — it returns total_beds, occupied_beds and a nested `beds[]`).
  // The org-admin ward card rendered an empty string before the word
  // "available". Derive it as total_beds - occupied_beds rather than assuming
  // every wards endpoint supplies it.
  available_beds?: number;
  beds?: { id: string; bed_number: string; status: string }[];
  ward_type?: string;
  // Nurse wards-overview serializer uses `category` (verified 2026-07-11).
  category?: string;
}

// GET /ward/beds/ — CAPTURED LIVE 2026-08-19 as nurse@demo.test (200, 7 beds):
//   {id, bed_number, status, ward, room, current_patient, assigned_at, created_at}
// A nurse can READ this. Whether a nurse may POST to /ward/admissions/ or
// /ward/admissions/<id>/discharge/ is NOT established — see FLAG-211.
// `ward` and `current_patient` are nested OBJECTS, not ids — confirmed on a
// real OCCUPIED bed rather than assumed from the key names. `status` observed:
// OCCUPIED | AVAILABLE (the ward serialisers also mention MAINTENANCE and
// RESERVED, which the seed data does not currently exercise).
export interface WardBed {
  id: string;
  bed_number: string;
  status: string;
  ward: { id: string; name: string; category?: string } | null;
  room: { id: string; name?: string } | null;
  current_patient: {
    id: string;
    healthclouda_id: string;
    first_name: string;
    last_name: string;
  } | null;
  assigned_at: string | null;
  created_at?: string;
}

export interface Prescription {
  id: string;
  patient?: { first_name: string; last_name: string };
  patient_name?: string;
  medication: string;
  dosage?: string;
  frequency?: string;
  status: string;
  prescribed_at: string;
}

export interface ActivityItem {
  id: string;
  action?: string;
  description?: string;
  user?: string;
  performed_by?: string;
  timestamp?: string;
  created_at?: string;
}

export interface AccessRequest {
  id: string;
  patient?: { first_name: string; last_name: string };
  patient_name?: string;
  staff_name?: string;
  reason?: string;
  status: string;
  created_at: string;
}

// ─── Nurse vitals (NURSE-1) — shapes verified live 2026-07-11 ───

// GET /nurse/my-patients/ item — an active ADMISSION with nested objects,
// not a flat patient row. Envelope is {count, results} (no next/previous).
export interface NurseAdmission {
  id: string;
  patient: {
    id: string;
    healthclouda_id: string;
    first_name: string;
    last_name: string;
    gender: string;
    blood_type: string | null;
    age: number | null;
    allergies: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
  };
  bed: { id: string; bed_number: string; status: string } | null;
  ward: { id: string; name: string; category: string; gender: string } | null;
  room: { id: string; name?: string } | null;
  episode: {
    id: string;
    episode_type: string;
    status: string;
    chief_complaint: string;
  } | null;
  admitted_at: string;
  admission_reason: string;
  length_of_stay: number;
}

// One vitals reading. PATCH /nurse/patients/<id>/vitals/ APPENDS a new
// reading (partial bodies fine — unsent fields stored as null, so the
// client must omit untouched inputs). Backend bounds (probed live):
// temp 30–45°C, systolic ≥50, diastolic 20–200, pulse 20–250, resp 5–60,
// SpO2 50–100, weight 0.5–500kg, height 20–300cm.
export interface VitalsReading {
  id: string;
  temperature: number | null;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  pulse_rate: number | null;
  respiratory_rate: number | null;
  oxygen_saturation: number | null;
  weight: number | null;
  height: number | null;
  notes: string;
  recorded_at: string;
  recorded_by_info: {
    id: string;
    first_name: string;
    last_name: string;
    full_name: string;
    email: string;
  } | null;
}

// GET/PATCH /nurse/patients/<id>/vitals/ response. `vitals` is the LATEST
// reading (null when none recorded yet); 404 = patient not found / no
// active episode at this org.
export interface PatientVitals {
  patient_id: string;
  episode_id: string;
  vitals: VitalsReading | null;
}

export interface Notification {
  id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}