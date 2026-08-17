// ─── Stats ────────────────────────────────────────────────────

export interface SuperadminStats {
  total_organizations: number;
  active_organizations: number;
  total_users: number;
  total_patients: number;
  new_orgs_this_month?: number;
  total_staff?: number;
}

export interface OrgAdminStats {
  total_staff: number;
  total_patients: number;
  active_episodes: number;
  pending_access_requests: number;
  wards_total?: number;
  beds_occupied?: number;
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

export interface Appointment {
  id: string;
  patient?: { first_name: string; last_name: string };
  patient_name?: string;
  doctor_name?: string;
  appointment_date: string;
  appointment_time?: string;
  status: string;
  notes?: string;
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

export interface CheckIn {
  id: string;
  patient?: { first_name: string; last_name: string };
  patient_name?: string;
  check_in_time: string;
  assigned_doctor?: string | null;
  status: string;
  chief_complaint?: string;
}

export interface Ward {
  id: string;
  name: string;
  total_beds: number;
  occupied_beds: number;
  available_beds: number;
  ward_type?: string;
  // Nurse wards-overview serializer uses `category` (verified 2026-07-11).
  category?: string;
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