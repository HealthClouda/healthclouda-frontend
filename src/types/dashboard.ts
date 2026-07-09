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

export interface NurseStats {
  total_patients: number;
  vitals_pending: number;
  wards_count?: number;
  critical_patients?: number;
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

export interface OrgSummary {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  is_verified?: boolean;
  total_staff?: number;
  total_patients?: number;
  created_at: string;
}

export interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  is_active: boolean;
  is_on_duty?: boolean;
  date_joined?: string;
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

export interface VitalRecord {
  id: string;
  patient?: { first_name: string; last_name: string };
  blood_pressure?: string;
  heart_rate?: number;
  temperature?: number;
  oxygen_saturation?: number;
  recorded_at: string;
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