/**
 * HealthClouda — Path-Based Routing Utility
 * ─────────────────────────────────────────────────────────────
 * Provides centralized URL construction for org-scoped routes.
 * All navigation paths should be built through HC_ROUTER.
 *
 * URL scheme:
 *   /{org-slug}/doctor/        → doctor dashboard
 *   /{org-slug}/signin/        → org login
 *   /signin/                   → general login
 *   /superadmin/               → superadmin dashboard
 *
 * REQUIRES: config.js loaded before this file.
 * ─────────────────────────────────────────────────────────────
 */

var HC_ROUTER = {

  // Top-level path segments that are NOT org slugs
  _reserved: [
    'signin', 'superadmin', 'assets', 'public',
    'forgot-password', 'check-email', 'reset-password', 'password-success',
    'set-password', 'access-request', '404'
  ],

  /**
   * Extract org slug from the current URL path.
   * /{org-slug}/doctor/ → "org-slug"
   * /superadmin/        → null
   * /signin/            → null
   */
  getOrgSlugFromPath: function () {
    var segments = window.location.pathname.split('/').filter(Boolean);
    if (segments.length === 0) return null;
    var first = segments[0].toLowerCase();
    if (this._reserved.indexOf(first) !== -1) return null;
    // Reject segments that look like files (e.g. index.html)
    if (first.indexOf('.') !== -1) return null;
    return segments[0];
  },

  /**
   * Get org slug from: (1) URL path, (2) localStorage user, (3) null
   */
  getOrgSlug: function () {
    return this.getOrgSlugFromPath()
      || (typeof hc_getUser === 'function' && hc_getUser() && hc_getUser().organization_slug)
      || null;
  },

  /**
   * Build dashboard path for a given role.
   * roleDashboardPath('DOCTOR')         → '/luth-hospital/doctor/'
   * roleDashboardPath('SUPERADMIN')     → '/superadmin/'
   * roleDashboardPath('DOCTOR', 'luth') → '/luth/doctor/'
   */
  roleDashboardPath: function (role, orgSlug) {
    var slug = orgSlug || this.getOrgSlug();
    var normalized = (role || '').toUpperCase().replace(/_/g, '');

    var roleMap = {
      SUPERADMIN:        '/superadmin/',
      ORGANIZATIONADMIN: '/{slug}/org-admin/',
      DOCTOR:            '/{slug}/doctor/',
      NURSE:             '/{slug}/nurse/',
      RECEPTIONIST:      '/{slug}/receptionist/',
      PATIENT:           '/{slug}/patient/',
    };

    var template = roleMap[normalized];
    if (!template) return '/signin/';
    // Superadmin doesn't need an org slug
    if (normalized === 'SUPERADMIN') return template;
    if (!slug) return '/signin/';
    return template.replace('{slug}', encodeURIComponent(slug));
  },

  /**
   * Build signin path for a user context.
   * signinPath({ role: 'SUPERADMIN' })                      → '/superadmin/signin/'
   * signinPath({ role: 'DOCTOR', organization_slug: 'luth'}) → '/luth/signin/'
   * signinPath()                                             → '/signin/'
   */
  signinPath: function (user) {
    var role = ((user && user.role) || '').toUpperCase().replace(/_/g, '');
    if (role === 'SUPERADMIN') return '/superadmin/signin/';
    var slug = (user && user.organization_slug) || this.getOrgSlugFromPath();
    if (slug) return '/' + encodeURIComponent(slug) + '/signin/';
    return '/signin/';
  },

  /**
   * Build org landing page path.
   * orgLandingPath('luth') → '/luth/'
   */
  orgLandingPath: function (slug) {
    if (!slug) return '/';
    return '/' + encodeURIComponent(slug) + '/';
  },

  /**
   * Build password flow page path.
   * passwordFlowPath('forgot-password')           → '/forgot-password/'   (no org)
   * passwordFlowPath('forgot-password', 'luth')   → '/luth/forgot-password/'
   *
   * Valid pages: 'forgot-password', 'check-email', 'reset-password', 'password-success'
   */
  passwordFlowPath: function (page, orgSlug) {
    var slug = orgSlug || this.getOrgSlugFromPath();
    if (slug) return '/' + encodeURIComponent(slug) + '/' + page + '/';
    return '/' + page + '/';
  },
};
