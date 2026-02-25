/**
 * HealthClouda — API Helpers
 * ─────────────────────────────────────────────────────────────
 * Centralised HTTP helpers + JWT token management.
 *
 * REQUIRES: config.js loaded before this file.
 * ─────────────────────────────────────────────────────────────
 */


// ══════════════════════════════════════════════════════════════
//  Token helpers
// ══════════════════════════════════════════════════════════════

function hc_getAccessToken() {
  return localStorage.getItem(HC_CONFIG.TOKEN_KEYS.ACCESS);
}

function hc_getRefreshToken() {
  return localStorage.getItem(HC_CONFIG.TOKEN_KEYS.REFRESH);
}

function hc_getUser() {
  try {
    return JSON.parse(localStorage.getItem(HC_CONFIG.TOKEN_KEYS.USER));
  } catch { return null; }
}

function hc_saveTokens({ access, refresh, user }) {
  if (access)  localStorage.setItem(HC_CONFIG.TOKEN_KEYS.ACCESS,  access);
  if (refresh) localStorage.setItem(HC_CONFIG.TOKEN_KEYS.REFRESH, refresh);
  if (user)    localStorage.setItem(HC_CONFIG.TOKEN_KEYS.USER,    JSON.stringify(user));
}

function hc_clearTokens() {
  localStorage.removeItem(HC_CONFIG.TOKEN_KEYS.ACCESS);
  localStorage.removeItem(HC_CONFIG.TOKEN_KEYS.REFRESH);
  localStorage.removeItem(HC_CONFIG.TOKEN_KEYS.USER);
}


// ══════════════════════════════════════════════════════════════
//  Role redirect helper
// ══════════════════════════════════════════════════════════════

/**
 * Redirect user to their role-specific dashboard.
 * @param {string} role      – raw role from backend (e.g. 'doctor', 'super_admin')
 * @param {string} fallback  – URL if role has no mapped dashboard
 */
function hc_redirectByRole(role, fallback) {
  if (!role) { window.location.href = fallback || '/public/signin.html'; return; }
  const key = role.toUpperCase().replace(/_/g, '');
  const dest = HC_CONFIG.ROLE_REDIRECTS[key];
  window.location.href = dest || fallback || '/public/signin.html';
}


// ══════════════════════════════════════════════════════════════
//  HTTP helpers
// ══════════════════════════════════════════════════════════════

/**
 * Make an authenticated API request.
 * Automatically attaches the JWT access token.
 * On 401, attempts a single token refresh then retries.
 */
async function apiFetch(endpoint, options = {}) {
  const url = HC_CONFIG.API_BASE_URL + endpoint;
  const token = hc_getAccessToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': 'Bearer ' + token } : {}),
    ...(options.headers || {}),
  };

  let res = await fetch(url, { ...options, headers });

  // Auto-refresh on 401
  if (res.status === 401 && token) {
    const refreshed = await _tryRefreshToken();
    if (refreshed) {
      headers['Authorization'] = 'Bearer ' + hc_getAccessToken();
      res = await fetch(url, { ...options, headers });
    } else {
      hc_clearTokens();
      window.location.href = '/public/signin.html';
      throw new Error('Session expired. Please log in again.');
    }
  }

  return _handleResponse(res);
}

/**
 * Make a public (unauthenticated) API request.
 */
async function publicApiRequest(endpoint, options = {}) {
  const url = HC_CONFIG.API_BASE_URL + endpoint;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const res = await fetch(url, { ...options, headers });
  return _handleResponse(res);
}


// ── Convenience wrappers ─────────────────────────────────────

async function apiGet(endpoint) {
  return apiFetch(endpoint, { method: 'GET' });
}

async function apiPost(endpoint, body) {
  return apiFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

async function apiPatch(endpoint, body) {
  return apiFetch(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

async function apiDelete(endpoint) {
  return apiFetch(endpoint, { method: 'DELETE' });
}


// ══════════════════════════════════════════════════════════════
//  Internal helpers
// ══════════════════════════════════════════════════════════════

async function _handleResponse(res) {
  if (res.status === 204) return null; // No Content

  let data;
  try { data = await res.json(); } catch { data = null; }

  if (!res.ok) {
    // Try to extract a useful error message from the response
    const msg = data?.detail
      || data?.message
      || data?.error
      || (data?.non_field_errors && data.non_field_errors[0])
      || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

async function _tryRefreshToken() {
  const refresh = hc_getRefreshToken();
  if (!refresh) return false;

  try {
    const res = await fetch(HC_CONFIG.API_BASE_URL + HC_CONFIG.ENDPOINTS.REFRESH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    hc_saveTokens({ access: data.access, refresh: data.refresh || refresh });
    return true;
  } catch {
    return false;
  }
}
