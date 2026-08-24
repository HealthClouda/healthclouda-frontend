/**
 * HealthClouda — Global Configuration
 * ─────────────────────────────────────────────────────────────
 * RULES:
 *  1. This is the ONLY file where URLs and constants live.
 *  2. Never hardcode API URLs or endpoint strings outside this file.
 *  3. To switch environments, set NEXT_PUBLIC_API_URL in .env.local
 *     (or in the Vercel dashboard per environment).
 * ─────────────────────────────────────────────────────────────
 */

// ── API base URL ───────────────────────────────────────────────
// Set NEXT_PUBLIC_API_URL in .env.local for local dev.
// Set it in the Vercel dashboard PER ENVIRONMENT — one deployment cannot serve
// more than one backend tier, because this value is baked in at build time.
//
// A4: a missing value must FAIL THE BUILD, not fall back. A deployed build that
// silently pointed at localhost would render fine and then fail every request,
// presenting as "the backend is down" rather than as the config error it is.
/**
 * Resolves the API base URL, throwing when it is missing outside development.
 *
 * Takes plain arguments rather than reading `process.env` itself: Next inlines
 * `process.env.NEXT_PUBLIC_*` only where it appears as a literal in the source,
 * so the literal read has to stay at module scope below. Passing the env object
 * into a function would break the client bundle silently.
 */
export function resolveApiBaseUrl(
  configured: string | undefined,
  nodeEnv: string | undefined,
): string {
  if (configured) return configured;
  if (nodeEnv !== 'development' && nodeEnv !== 'test') {
    throw new Error(
      'NEXT_PUBLIC_API_URL is not set. Every deployed environment must set it ' +
        'explicitly — dev → https://api-dev.healthclouda.com/api/v1, ' +
        'beta → https://api-beta.healthclouda.com/api/v1. There is no fallback ' +
        'outside local development: one build serves exactly one backend tier.',
    );
  }
  return 'http://localhost:8000/api/v1';
}

export const API_BASE_URL = resolveApiBaseUrl(
  process.env.NEXT_PUBLIC_API_URL,
  process.env.NODE_ENV,
);

// ── Token / cookie keys ────────────────────────────────────────
// NOTE: Phase 1 (auth migration) will move these to httpOnly cookies.
// These keys are kept for reference during migration.
export const TOKEN_KEYS = {
  ACCESS: 'hc_access_token',
  REFRESH: 'hc_refresh_token',
  USER: 'hc_user',
} as const;

// ── API endpoints ──────────────────────────────────────────────
export const ENDPOINTS = {
  // ── Auth ──────────────────────────────────────────────────
  LOGIN: '/auth/login/',
  LOGIN_ADMIN: '/auth/login/admin/',
  LOGIN_ORG: (slug: string) => `/auth/login/${slug}/`,
  LOGOUT: '/auth/logout/',
  REFRESH: '/auth/refresh/',
  ME: '/auth/me/',
  FORGOT_PW: '/auth/forgot-password/',
  VERIFY_OTP: '/auth/verify-otp/',
  RESEND_OTP: '/auth/resend-otp/',
  RESET_PW: '/auth/reset-password/',
  CHANGE_PW: '/auth/change-password/',
  SETUP_PW_VALIDATE: '/auth/setup-password/validate/',
  SETUP_PW: '/auth/setup-password/',
  // Public self-service re-request of an expired invite link (backend #68,
  // #66 follow-up). Anti-enumeration: always a generic 200.
  SETUP_PW_RESEND: '/auth/setup-password/resend/',
  TOGGLE_DUTY: '/auth/me/toggle-duty/',

  // ── Public / org ───────────────────────────────────────────
  CONTACT_FORM: '/contact/contact-form/',
  ORG_BY_SLUG: (slug: string) => `/org/by-slug/${slug}/`,
  // ORG_ANNOUNCEMENTS removed 2026-07-13: the route never existed on the
  // backend (verified live vs prod schema) — re-add when backend#69 ships.
  ORG_CONTACT: (slug: string) => `/org/${slug}/contact/`,

  // ── Shared ─────────────────────────────────────────────────
  EPISODES: '/episodes/',
  STAFF_NOTIFS: '/auth/me/notifications/',
  STAFF_UNREAD: '/auth/me/notifications/unread-count/',
  STAFF_NOTIF_READ: (id: string) => `/auth/me/notifications/${id}/read/`,

  // ── Patient ────────────────────────────────────────────────
  PATIENT_ME: '/patients/me/',
  PATIENT_DASHBOARD: '/patients/me/dashboard/',
  // Shipped 2026-07-09 (PATIENT-1) — DRF envelope; ?status= (case-insensitive)
  // + ?date=YYYY-MM-DD; spans ALL orgs the patient has visited.
  PATIENT_APPOINTMENTS: '/patients/me/appointments/',
  PATIENT_NOTIFS: '/patients/me/notifications/',
  PATIENT_UNREAD: '/patients/me/notifications/unread-count/',
  PATIENT_READ_ALL: '/patients/me/notifications/read-all/',
  PATIENT_NOTIF_READ: (id: string) => `/patients/me/notifications/${id}/read/`,
  PATIENT_ACCESS_REQUESTS: '/patients/me/access-requests/',
  PATIENT_ACCESS_REQUEST: (id: string) => `/patients/me/access-requests/${id}/`,
  PATIENT_REFERRALS: '/referrals/my-referrals/',
  PATIENT_REFERRAL_DETAIL: (uuid: string) => `/referrals/${uuid}/`,
  PATIENT_REFERRAL_LETTER: (uuid: string) => `/referrals/${uuid}/download-letter/`,

  // ── Receptionist ───────────────────────────────────────────
  REC_STATS: '/receptionist/dashboard/stats/',
  REC_PATIENT_SEARCH: '/receptionist/patients/search/',
  REC_ACCESS_REQUESTS: '/receptionist/access-requests/',
  REC_ACCESS_RESPOND: '/receptionist/access-requests/respond/',
  REC_DOCTORS_ON_DUTY: '/receptionist/doctors/on-duty/',
  REC_ASSIGN_DOCTOR: '/receptionist/assign-doctor/',
  REC_EMERGENCY_BEDS: '/receptionist/emergency-beds/',
  REC_CHECK_INS: '/receptionist/check-ins/',
  REC_CHECK_IN: (id: string) => `/receptionist/check-ins/${id}/`,
  REC_APPOINTMENTS: '/receptionist/appointments/',
  REC_APPOINTMENT: (id: string) => `/receptionist/appointments/${id}/`,
  REC_REFERRALS: '/referrals/received/',
  REC_NOTIFY_DOCTORS: (id: string) => `/receptionist/referrals/${id}/notify-doctors/`,
  // D4. `/patients/` is the shared patient CRUD viewset, NOT a receptionist
  // route — its schema description spells out the role rules verbatim:
  //   CREATE (POST):        SUPERADMIN, RECEPTIONIST only
  //   UPDATE (PUT/PATCH):   RECEPTIONIST -> contact info only
  // (read from the live schema 2026-08-24; see FLAG-217 on where this API
  // hides its permissions and query params).
  PATIENTS: '/patients/',
  PATIENT: (id: string) => `/patients/${id}/`,
  REC_SEND_PORTAL_INVITE: (id: string) => `/receptionist/patients/${id}/send-portal-invite/`,
  CREATE_PATIENT: '/patients/',

  // ── Nurse ──────────────────────────────────────────────────
  NURSE_STATS: '/nurse/dashboard/stats/',
  NURSE_WARDS_OVERVIEW: '/nurse/wards/overview/',
  NURSE_MY_PATIENTS: '/nurse/my-patients/',
  NURSE_VITALS: (id: string) => `/nurse/patients/${id}/vitals/`,

  // ── Doctor ─────────────────────────────────────────────────
  DOC_STATS: '/doctor/dashboard/stats/',
  DOC_MY_PATIENTS: '/doctor/my-patients/',
  DOC_EPISODES: '/doctor/episodes/',
  DOC_EPISODE: (id: string) => `/doctor/episodes/${id}/`,
  DOC_EPISODE_COMPLETE: (id: string) => `/doctor/episodes/${id}/complete/`,
  DOC_PRESCRIPTIONS: '/doctor/prescriptions/',
  DOC_PRESCRIPTION_CANCEL: (id: string) => `/doctor/prescriptions/${id}/cancel/`,
  DOC_REFERRALS: '/doctor/referrals/',
  DOC_REFERRAL: (id: string) => `/doctor/referrals/${id}/`,
  DOC_REFERRALS_IN: '/doctor/referrals/incoming/',
  DOC_REFERRALS_OUT: '/doctor/referrals/outgoing/',
  DOC_APPOINTMENTS: '/doctor/appointments/',
  DOC_APPOINTMENT: (id: string) => `/doctor/appointments/${id}/`,
  DOC_VITALS: (id: string) => `/doctor/patients/${id}/vitals/`,
  DOC_VITALS_HISTORY: (id: string) => `/doctor/patients/${id}/vitals/history/`,

  // ── Ward / Bed / Admissions (shared) ───────────────────────
  WARDS: '/ward/',
  WARD: (id: string) => `/ward/${id}/`,
  WARD_BEDS: '/ward/beds/',
  WARD_BED: (id: string) => `/ward/beds/${id}/`,
  WARD_ROOMS: '/ward/rooms/',
  ADMISSIONS: '/ward/admissions/',
  ADMISSION: (id: string) => `/ward/admissions/${id}/`,

  // ── Org Admin ──────────────────────────────────────────────
  ORG_ADMIN_STATS: '/org-admin/dashboard/stats/',
  ORG_ADMIN_ACTIVITY: '/org-admin/activity/',
  ORG_ADMIN_STAFF: '/org-admin/staff/',
  // FLAG-207: ORG_ADMIN_STAFF_MEMBER used to point at `/org-admin/staff/<id>/`,
  // which does not exist in the live schema (verified 2026-08-17) and had zero
  // consumers — removed rather than fixed to a guess. The only staff-detail
  // mutation the schema documents is the status endpoint below.
  ORG_ADMIN_STAFF_STATUS: (id: string) => `/org-admin/staff/${id}/status/`,
  ORG_ADMIN_PATIENTS: '/org-admin/patients/',
  ORG_ADMIN_WARDS_OVERVIEW: '/org-admin/wards/overview/',
  ORG_ADMIN_BEDS: '/org-admin/beds/',
  ORG_ADMIN_ACCESS_REQUESTS: '/org-admin/access-requests/',
  // A6/ORGADMIN-1: `/org-admin/access-requests/<id>/review/` was REMOVED by the
  // backend as a security fix — it let an org admin approve access to a
  // patient's records while bypassing that patient's consent. Do not re-add it.
  // The list above is read-only oversight; approving is the patient's decision,
  // made via the emailed consent link or in-app (DASH-6).
  ORG_ADMIN_SETTINGS: '/org-admin/settings/',

  // ── Superadmin ─────────────────────────────────────────────
  SA_STATS: '/superadmin/dashboard/',
  SA_SYSTEM_HEALTH: '/superadmin/health/',
  SA_ACTIVITY: '/superadmin/activity/',
  SA_ORGS: '/org/',
  SA_ORG: (id: string) => `/org/${id}/`,
  SA_ORG_SUSPEND: (id: string) => `/superadmin/organizations/${id}/suspend/`,
  SA_ORG_ACTIVATE: (id: string) => `/superadmin/organizations/${id}/activate/`,
  SA_ORG_VERIFY: (id: string) => `/superadmin/organizations/${id}/verify/`,
  SA_USERS: '/auth/users/',
  SA_USER: (id: string) => `/auth/users/${id}/`,
  SA_USER_ACTIVATE: (id: string) => `/auth/users/${id}/activate/`,
  SA_USER_RESET_PW: (id: string) => `/auth/users/${id}/reset-password/`,
  SA_USER_RESEND_SETUP: (id: string) => `/auth/users/${id}/resend-setup-email/`,
  SA_AUDIT: '/audit/logs/',
  SA_ACCESS_LOGS: '/audit/access-logs/',
  SA_NOTIFS: '/auth/me/notifications/',
  SA_CONTACT_LIST: '/contact/contact-list/',
  SA_ORG_CONTACTS: '/org/contacts/',
} as const;

// ── Roles (must match what the backend returns) ────────────────
export const ROLES = {
  SUPERADMIN: 'SUPERADMIN',
  ORG_ADMIN: 'ORGANIZATION_ADMIN',
  DOCTOR: 'DOCTOR',
  NURSE: 'NURSE',
  RECEPTIONIST: 'RECEPTIONIST',
  PATIENT: 'PATIENT',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

// ── UI constants ───────────────────────────────────────────────
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// ── Reserved URL paths (cannot be org slugs) ──────────────────
// Keep in sync with Next.js app directory structure.
export const RESERVED_PATHS = new Set([
  'signin',
  'superadmin',
  'assets',
  'forgot-password',
  'check-email',
  'reset-password',
  'password-success',
  'set-password',
  'access-request',
  '404',
  'api',
  '_next',
]);