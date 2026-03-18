/**
 * HealthClouda — Global Configuration
 * ─────────────────────────────────────────────────────────────
 * RULES:
 *  1. This is the ONLY file where URLs and constants live.
 *  2. Never hardcode API URLs anywhere else in the project.
 *  3. To switch environments, change API_BASE_URL only.
 * ─────────────────────────────────────────────────────────────
 */

const HC_CONFIG = {

  // ── API ────────────────────────────────────────────────────
  // Auto-detects environment based on hostname.
  API_BASE_URL: (function () {
    var host = window.location.hostname;

    // Development
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:8000/api/v1';
    }

    // Staging (if you set one up)
    if (host === 'staging.healthclouda.ng') {
      return 'https://api-staging.healthclouda.ng/api/v1';
    }

    // Vercel deployment
    if (host === 'healthclouda-frontend.vercel.app') {
      return 'https://healthclouda-backend-production.up.railway.app/api/v1';
    }

    // Production
    return 'https://api.healthclouda.ng/api/v1';
  })(),

  // ── Token storage keys ─────────────────────────────────────
  // Centralised so a rename never breaks 10 files.
  TOKEN_KEYS: {
    ACCESS:  'hc_access_token',
    REFRESH: 'hc_refresh_token',
    USER:    'hc_user',
  },

  // ── API endpoints ──────────────────────────────────────────
  ENDPOINTS: {
    // ── Auth ────────────────────────────────────────────
    LOGIN:        '/auth/login/',
    LOGIN_ADMIN:  '/auth/login/admin/',
    LOGOUT:       '/auth/logout/',
    REFRESH:      '/auth/refresh/',                                // POST { refresh } → { access }
    ME:           '/auth/me/',                                     // GET → user details
    FORGOT_PW:    '/auth/forgot-password/',
    VERIFY_OTP:   '/auth/verify-otp/',
    RESEND_OTP:   '/auth/resend-otp/',
    RESET_PW:     '/auth/reset-password/',
    CHANGE_PW:    '/auth/change-password/',
    CONTACT_FORM: '/contact/contact-form/',                        // POST → public contact form
    ORG_CONTACT:  '/org/',                                         // POST /:slug/contact/
    ORG_BY_SLUG:  '/org/by-slug/',                                 // GET /:slug/ → org branding info
    ORG_ANNOUNCEMENTS: '/org/',                                    // GET /:slug/announcements/
    EPISODES:     '/episodes/',                                    // GET → paginated list, GET /:id/ → detail

    // ── Patient ──────────────────────────────────────────
    PATIENT_ME:        '/patients/me/',                            // GET → full profile, PATCH → update contact fields
    PATIENT_DASHBOARD: '/patients/me/dashboard/',                  // GET → stats, prescriptions, instructions, orgs visited
    PATIENT_NOTIFS:    '/patients/me/notifications/',              // GET → notification list
    PATIENT_UNREAD:    '/patients/me/notifications/unread-count/', // GET → { count }
    PATIENT_READ_ALL:  '/patients/me/notifications/read-all/',     // POST → mark all read
    PATIENT_ACCESS_REQUESTS: '/patients/me/access-requests/',      // GET → list, PATCH /:id/ → { action: 'grant'|'deny' }
    // Mark single read: PATIENT_NOTIFS + ':id/read/'  (PATCH)

    // ── Patient Referrals ─────────────────────────────
    PATIENT_REFERRALS:       '/referrals/my-referrals/',           // GET → list of referrals
    PATIENT_REFERRAL_DETAIL: '/referrals/',                        // GET /:uuid/ → full detail
    PATIENT_REFERRAL_LETTER: '/referrals/',                        // GET /:uuid/download-letter/ → PDF

    // ── Receptionist ────────────────────────────────────
    REC_STATS:           '/receptionist/dashboard/stats/',
    REC_PATIENT_SEARCH:  '/receptionist/patients/search/',         // GET ?query=
    REC_ACCESS_REQUESTS: '/receptionist/access-requests/',         // GET (list), POST (create)
    REC_ACCESS_RESPOND:  '/receptionist/access-requests/respond/', // GET ?token=&action= (public, no auth)
    REC_DOCTORS_ON_DUTY: '/receptionist/doctors/on-duty/',
    REC_ASSIGN_DOCTOR:   '/receptionist/assign-doctor/',           // POST
    REC_EMERGENCY_BEDS:  '/receptionist/emergency-beds/',
    REC_CHECK_INS:       '/receptionist/check-ins/',               // GET, POST, PATCH /:id/
    REC_APPOINTMENTS:    '/receptionist/appointments/',            // GET, POST, PATCH /:id/
    REC_REFERRALS:       '/referrals/received/',                   // GET
    REC_NOTIFY_DOCTORS:  '/receptionist/referrals/',               // POST /:id/notify-doctors/
    CREATE_PATIENT:      '/patients/',                             // POST
    STAFF_NOTIFS:        '/auth/me/notifications/',                // GET → notification list
    STAFF_UNREAD:        '/auth/me/notifications/unread-count/',   // GET → { count }
    // Mark single read: STAFF_NOTIFS + ':id/read/'  (PATCH)

    // ── Nurse ───────────────────────────────────────────
    NURSE_STATS:          '/nurse/dashboard/stats/',               // GET → dashboard overview
    NURSE_WARDS_OVERVIEW: '/nurse/wards/overview/',                // GET → ward summary cards
    NURSE_MY_PATIENTS:    '/nurse/my-patients/',                   // GET ?ward_id=<uuid>
    NURSE_VITALS:         '/nurse/patients/',                      // GET/PATCH /:id/vitals/
    TOGGLE_DUTY:          '/auth/me/toggle-duty/',                 // POST → toggle on/off duty

    // ── Doctor ─────────────────────────────────────────
    DOC_STATS:            '/doctor/dashboard/stats/',              // GET → dashboard overview
    DOC_MY_PATIENTS:      '/doctor/my-patients/',                  // GET ?ward_id=&status=&search=&page=
    DOC_EPISODES:         '/doctor/episodes/',                     // GET ?status=&page=, POST, GET/:id/, PATCH/:id/, POST/:id/complete/
    DOC_PRESCRIPTIONS:    '/doctor/prescriptions/',                // GET ?status=&episode_id=&page=, POST, PATCH/:id/cancel/
    DOC_REFERRALS:        '/doctor/referrals/',                    // POST (create outgoing), GET/:id/
    DOC_REFERRALS_IN:     '/doctor/referrals/incoming/',           // GET ?status=
    DOC_REFERRALS_OUT:    '/doctor/referrals/outgoing/',           // GET
    DOC_APPOINTMENTS:     '/doctor/appointments/',                 // GET ?status=&date=&page=, GET/:id/, PATCH/:id/
    DOC_VITALS:           '/doctor/patients/',                     // GET /:id/vitals/, GET /:id/vitals/history/

    // ── Ward / Bed / Admission (shared) ────────────────
    WARDS:                '/ward/',                                // GET (list), POST (create), GET/PUT/DELETE /:id/
    WARD_BEDS:            '/ward/beds/',                           // GET ?ward_id=, POST, PATCH /:id/
    WARD_ROOMS:           '/ward/rooms/',                          // GET, POST, PUT/DELETE /:id/
    ADMISSIONS:           '/ward/admissions/',                     // GET ?status=, POST, GET /:id/

    // ── Super Admin ───────────────────────────────────────
    // Dashboard overview
    SA_STATS:         '/superadmin/dashboard/',                     // GET → system-wide statistics
    SA_SYSTEM_HEALTH: '/superadmin/health/',                        // GET → db, python/django versions, record counts
    SA_ACTIVITY:      '/superadmin/activity/',                      // GET ?limit=&days=&type= → recent system activity

    // Organisation CRUD (via shared /org/ endpoints)
    SA_ORGS:          '/org/',                                      // GET → paginated list, POST → create
    SA_ORG_DETAIL:    '/org/',                                      // GET /:id/, PATCH /:id/, DELETE /:id/
    SA_ORG_SUSPEND:   '/superadmin/organizations/',                 // POST /:id/suspend/
    SA_ORG_ACTIVATE:  '/superadmin/organizations/',                 // POST /:id/activate/
    SA_ORG_VERIFY:    '/superadmin/organizations/',                 // POST /:id/verify/

    // Users (via shared /auth/users/ endpoints)
    SA_USERS:         '/auth/users/',                               // GET → paginated list, POST → create
    SA_USER_DETAIL:   '/auth/users/',                               // GET /:id/, PUT /:id/, PATCH /:id/, DELETE /:id/ (soft)
    SA_USER_ACTIVATE: '/auth/users/',                               // POST /:id/activate/
    SA_USER_RESET_PW: '/auth/users/',                               // POST /:id/reset-password/

    // Audit logs
    SA_AUDIT:         '/audit/logs/',                               // GET → paginated audit log entries
    SA_ACCESS_LOGS:   '/audit/access-logs/',                        // GET → patient data access logs (compliance)

    // Notifications (reuse staff notification endpoints)
    SA_NOTIFS:        '/auth/me/notifications/',                    // GET → list
    SA_NOTIF_READ:    '/auth/me/notifications/',                    // PATCH /:id/read/

    // Contact submissions
    SA_CONTACT_LIST:  '/contact/contact-list/',                     // GET → general contact submissions
    SA_ORG_CONTACTS:  '/org/contacts/',                             // GET → org contact submissions

    // ── Org Admin ────────────────────────────────────────────────
    ORG_ADMIN_STATS:           '/org-admin/dashboard/stats/',      // GET → org-level dashboard stats
    ORG_ADMIN_ACTIVITY:        '/org-admin/activity/',             // GET → recent org activity feed
    ORG_ADMIN_STAFF:           '/org-admin/staff/',                // GET → list, POST → create, PATCH /:id/ → update
    ORG_ADMIN_PATIENTS:        '/org-admin/patients/',             // GET → patient directory (org-scoped)
    ORG_ADMIN_WARDS_OVERVIEW:  '/org-admin/wards/overview/',       // GET → ward cards and occupancy
    ORG_ADMIN_BEDS:            '/org-admin/beds/',                 // GET ?ward_id= → bed list
    ORG_ADMIN_ACCESS_REQUESTS: '/org-admin/access-requests/',      // GET, PATCH /:id/review/
    ORG_ADMIN_SETTINGS:        '/org-admin/settings/',             // GET, PATCH org profile/settings
  },

  // ── Role names (must match what the backend returns) ──────
  ROLES: {
    SUPERADMIN:   'SUPERADMIN',
    ORG_ADMIN:    'ORGANIZATION_ADMIN',
    DOCTOR:       'DOCTOR',
    NURSE:        'NURSE',
    RECEPTIONIST: 'RECEPTIONIST',
    PATIENT:      'PATIENT',
  },

  // ── UI constants ───────────────────────────────────────────
  SESSION_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes
};

// Make it available globally (no ES modules needed for vanilla JS)
// Usage in any file:  HC_CONFIG.API_BASE_URL
