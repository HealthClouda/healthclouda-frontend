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
  // Switch this one line to move between dev and production.
  API_BASE_URL: 'http://localhost:8000/api/v1',

  // ── Token storage keys ─────────────────────────────────────
  // Centralised so a rename never breaks 10 files.
  TOKEN_KEYS: {
    ACCESS:  'hc_access_token',
    REFRESH: 'hc_refresh_token',
    USER:    'hc_user',
  },

  // ── Auth endpoints ─────────────────────────────────────────
  ENDPOINTS: {
    LOGIN:        '/auth/login/',
    LOGOUT:       '/auth/logout/',
    REFRESH:      '/auth/token/refresh/',
    FORGOT_PW:    '/auth/forgot-password/',
    VERIFY_OTP:   '/auth/verify-otp/',
    RESEND_OTP:   '/auth/resend-otp/',
    RESET_PW:     '/auth/reset-password/',
    CONTACT_FORM: '/contact-form/',

    // ── Super Admin ───────────────────────────────────────
    // Dashboard overview
    SA_STATS:         '/superadmin/stats/',            // GET  → { total_users, total_orgs, monthly_revenue, active_records }
    SA_SYSTEM_HEALTH: '/superadmin/system-health/',    // GET  → { api_status, db_status, last_backup }
    SA_SECURITY:      '/superadmin/security-alerts/',  // GET  → { failed_logins, locked_accounts, suspicious_activity }
    SA_ACTIVITY:      '/superadmin/recent-activity/',  // GET  → [ { time, user_id, action, entity, status } ]

    // Organisations CRUD
    SA_ORGS:          '/superadmin/organisations/',    // GET  → paginated list, POST → create
    SA_ORG_DETAIL:    '/superadmin/organisations/',    // GET /:id, PATCH /:id, DELETE /:id
    SA_ORG_SUSPEND:   '/superadmin/organisations/',    // PATCH /:id/suspend/
    SA_ORG_ACTIVATE:  '/superadmin/organisations/',    // PATCH /:id/activate/
    SA_ORG_USERS:     '/superadmin/organisations/',    // GET  /:id/users/
    SA_ORG_BILLING:   '/superadmin/organisations/',    // GET  /:id/billing/

    // Users
    SA_USERS:         '/superadmin/users/',            // GET  → paginated list
    SA_USER_DETAIL:   '/superadmin/users/',            // GET /:id, PATCH /:id

    // Billing
    SA_BILLING:       '/superadmin/billing/',          // GET  → revenue, plans breakdown

    // Audit logs
    SA_AUDIT:         '/superadmin/audit-logs/',       // GET  → paginated log entries
  },

  // ── Role → dashboard redirect map ─────────────────────────
  // Keys must match the NORMALISED role string:
  //   backend role → toUpperCase().replace(/_/g,'') → key here
  //   'super_admin' → 'SUPERADMIN'
  //   'org_admin'   → 'ORGADMIN'
  //   'doctor'      → 'DOCTOR'
  // Add new roles here as dashboards are built.
  ROLE_REDIRECTS: {
    SUPERADMIN:   '/public/superadmin/index.html',
    ORGADMIN:     '/public/org-admin/index.html',
    DOCTOR:       '/public/doctor/index.html',
    NURSE:        '/public/nurse/index.html',
    RECEPTIONIST: '/public/receptionist/index.html',
    PATIENT:      '/public/patient/index.html',
  },

  // ── Role names (must match what the backend returns) ──────
  ROLES: {
    SUPERADMIN:   'superadmin',
    ORG_ADMIN:    'org_admin',
    DOCTOR:       'doctor',
    NURSE:        'nurse',
    RECEPTIONIST: 'receptionist',
    PATIENT:      'patient',
  },

  // ── UI constants ───────────────────────────────────────────
  SESSION_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes
};

// Make it available globally (no ES modules needed for vanilla JS)
// Usage in any file:  HC_CONFIG.API_BASE_URL