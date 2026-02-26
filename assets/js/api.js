/**
 * HealthClouda — API Communication Layer
 * ─────────────────────────────────────────────────────────────
 * RULES:
 *  1. ALL fetch() calls in this project go through apiRequest().
 *  2. Never call fetch() directly in HTML files or other scripts.
 *  3. This file handles: auth headers, token refresh, errors.
 *
 * REQUIRES: config.js loaded before this file.
 * ─────────────────────────────────────────────────────────────
 */


// ── Token helpers ────────────────────────────────────────────

function hc_getAccessToken() {
  return localStorage.getItem(HC_CONFIG.TOKEN_KEYS.ACCESS);
}

function hc_getRefreshToken() {
  return localStorage.getItem(HC_CONFIG.TOKEN_KEYS.REFRESH);
}

function hc_getUser() {
  try {
    return JSON.parse(localStorage.getItem(HC_CONFIG.TOKEN_KEYS.USER));
  } catch {
    return null;
  }
}

function hc_saveTokens({ access, refresh, user }) {
  if (access)  localStorage.setItem(HC_CONFIG.TOKEN_KEYS.ACCESS,  access);
  if (refresh) localStorage.setItem(HC_CONFIG.TOKEN_KEYS.REFRESH, refresh);
  if (user)    localStorage.setItem(HC_CONFIG.TOKEN_KEYS.USER, JSON.stringify(user));
}

function hc_clearTokens() {
  Object.values(HC_CONFIG.TOKEN_KEYS).forEach(key => localStorage.removeItem(key));
}


// ── Token refresh ────────────────────────────────────────────

let _refreshPromise = null; // Prevents multiple simultaneous refresh calls

async function hc_refreshAccessToken() {
  // If a refresh is already in flight, wait for that one
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    const refresh = hc_getRefreshToken();
    if (!refresh) throw new Error('No refresh token available');

    const res = await fetch(`${HC_CONFIG.API_BASE_URL}${HC_CONFIG.ENDPOINTS.REFRESH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });

    if (!res.ok) {
      // Refresh token is also expired → force logout
      hc_clearTokens();
      window.location.href = '/public/signin.html';
      throw new Error('Session expired. Please log in again.');
    }

    const data = await res.json();
    hc_saveTokens({ access: data.access });
    return data.access;
  })();

  try {
    return await _refreshPromise;
  } finally {
    _refreshPromise = null;
  }
}


// ── Core request function ────────────────────────────────────

/**
 * apiRequest(endpoint, options)
 *
 * @param {string} endpoint   - e.g. '/patients/' (no base URL needed)
 * @param {object} options    - standard fetch options (method, body, headers…)
 * @returns {Promise<any>}    - parsed JSON response
 *
 * @example
 *   const patients = await apiRequest('/patients/');
 *   const result   = await apiRequest('/episodes/', {
 *     method: 'POST',
 *     body: JSON.stringify({ patient: id, notes: '...' })
 *   });
 */
async function apiRequest(endpoint, options = {}) {
  const token = hc_getAccessToken();

  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers, // allow caller to override headers
    },
  };

  let response = await fetch(`${HC_CONFIG.API_BASE_URL}${endpoint}`, config);

  // ── 401: Try to refresh token once, then retry ──
  if (response.status === 401) {
    try {
      const newToken = await hc_refreshAccessToken();
      config.headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(`${HC_CONFIG.API_BASE_URL}${endpoint}`, config);
    } catch {
      // Refresh failed — redirect to login (already handled in hc_refreshAccessToken)
      return;
    }
  }

  // ── 204 No Content ──
  if (response.status === 204) return null;

  // ── Parse response ──
  const data = await response.json().catch(() => ({}));

  // ── Non-OK responses → throw structured error ──
  if (!response.ok) {
    const message =
      data.detail ||
      data.message ||
      data.non_field_errors?.[0] ||
      `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.data   = data; // full response body for form validation errors
    throw error;
  }

  return data;
}


// ── Convenience wrappers ────────────────────────────────────

/**
 * apiGet('/patients/')
 * apiPost('/episodes/', { patient: id, notes: '...' })
 * apiPut('/episodes/123/', { diagnosis: '...' })
 * apiDelete('/patients/123/')
 */
function apiGet(endpoint, options = {}) {
  return apiRequest(endpoint, { ...options, method: 'GET' });
}

function apiPost(endpoint, body = {}, options = {}) {
  return apiRequest(endpoint, {
    ...options,
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function apiPut(endpoint, body = {}, options = {}) {
  return apiRequest(endpoint, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

function apiPatch(endpoint, body = {}, options = {}) {
  return apiRequest(endpoint, {
    ...options,
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

function apiDelete(endpoint, options = {}) {
  return apiRequest(endpoint, { ...options, method: 'DELETE' });
}


// ── Public API (no auth needed) ────────────────────────────

/**
 * publicApiRequest(endpoint, options)
 * For endpoints that don't require authentication
 * e.g. contact form, public org info
 */
async function publicApiRequest(endpoint, options = {}) {
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  const response = await fetch(`${HC_CONFIG.API_BASE_URL}${endpoint}`, config);

  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.detail || data.message || `Request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    error.data   = data;
    throw error;
  }

  return data;
}