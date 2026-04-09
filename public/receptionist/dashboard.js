/* ═══════════════════════════════════════════════════════════
   HealthClouda — Receptionist Dashboard
   Load order: config.js → api.js → auth.js → this file
═══════════════════════════════════════════════════════════ */


/* ══════════════════════════════════════════
   1. AUTH GUARD
══════════════════════════════════════════ */
(function authGuard() {
  let user  = null;
  let token = null;
  try { token = hc_getAccessToken(); } catch(e) {}
  try { user  = hc_getUser();        } catch(e) {}

  // Redirect to signin if not authenticated
  if (!token) {
    window.location.href = HC_ROUTER.signinPath(user);
    return;
  }

  if (user && typeof hc_redirectByRole === 'function') {
    const role = (user.role || '').toLowerCase().replace(/_/g, '');
    if (role && role !== 'receptionist' && role !== 'superadmin') {
      hc_redirectByRole(user.role);
      return;
    }
  }

  const name = (user && (user.full_name || [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email)) || 'Receptionist';
  const el = (id) => document.getElementById(id);
  if (el('sidebarUserName'))  el('sidebarUserName').textContent  = name;
  if (el('sidebarUserRole'))  el('sidebarUserRole').textContent  = 'Receptionist';
  if (el('sidebarAvatar'))    el('sidebarAvatar').textContent    = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  if (el('headerUserName'))   el('headerUserName').textContent   = name;
})();


/* ══════════════════════════════════════════
   2. NAVIGATION
══════════════════════════════════════════ */
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    const page = item.dataset.page;
    if (!page) return;

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    item.classList.add('active');

    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    const target = document.getElementById('page-' + page);
    if (target) {
      target.classList.add('active');
      target.style.opacity = '0';
      target.style.transform = 'translateY(8px)';
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          target.style.transition = 'opacity 0.22s ease, transform 0.22s ease';
          target.style.opacity = '1';
          target.style.transform = 'translateY(0)';
        });
      });
    }

    loadPage(page);
    if (window.innerWidth <= 1024) closeSidebar();
  });
});

function goToNotifications() {
  document.querySelector('[data-page="notifications"]').click();
}

/* ── Sidebar toggle ── */
function toggleSidebar() {
  const sidebar   = document.getElementById('sidebar');
  const overlay   = document.getElementById('mobileOverlay');
  const hamburger = document.getElementById('hamburgerBtn');
  const isOpen    = sidebar?.classList.contains('open');
  if (isOpen) {
    closeSidebar();
  } else {
    sidebar?.classList.add('open');
    overlay?.classList.add('open');
    hamburger?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}
function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('mobileOverlay')?.classList.remove('open');
  document.getElementById('hamburgerBtn')?.classList.remove('open');
  document.body.style.overflow = '';
}

const _loaded = new Set();
function loadPage(page) {
  if (_loaded.has(page)) return;
  _loaded.add(page);
  switch (page) {
    case 'dashboard':      loadDashboard();      break;
    case 'patients':       initPatientSearch();   break;
    case 'queue':          loadQueue();           break;
    case 'appointments':   loadAppointments();    break;
    case 'referrals':      loadReferrals();       break;
    case 'beds':           loadEmergencyBeds();   break;
    case 'access':         loadAccessRequests();  break;
    case 'messages':       loadMessages();        break;
    case 'notifications':  loadNotifications();   break;
  }
}
loadPage('dashboard');


/* ══════════════════════════════════════════
   3. HELPERS
══════════════════════════════════════════ */
async function safeApiGet(endpoint) {
  if (typeof apiGet === 'function') return apiGet(endpoint);
  throw new Error('No backend connection');
}
async function safeApiPost(endpoint, body) {
  if (typeof apiPost === 'function') return apiPost(endpoint, body);
  throw new Error('No backend connection');
}
async function safeApiPatch(endpoint, body) {
  if (typeof apiPatch === 'function') return apiPatch(endpoint, body || {});
  throw new Error('No backend connection');
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(iso) {
  if (!iso) return '—';
  return formatDate(iso) + ' ' + formatTime(iso);
}

function formatRelativeTime(iso) {
  if (!iso) return '—';
  const d   = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now - d) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return diffMin + 'm ago';
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return diffH + 'h ago';
  return formatDate(iso);
}

function statusBadge(status) {
  if (!status) return '';
  const s = status.toUpperCase().replace(/_/g, ' ');
  const map = {
    'ACTIVE':      'badge-success',
    'OPEN':        'badge-success',
    'WAITING':     'badge-warning',
    'IN PROGRESS': 'badge-info',
    'IN_PROGRESS': 'badge-info',
    'COMPLETED':   'badge-success',
    'CLOSED':      'badge-info',
    'CANCELLED':   'badge-danger',
    'NO SHOW':     'badge-danger',
    'NO_SHOW':     'badge-danger',
    'SCHEDULED':   'badge-info',
    'PENDING':     'badge-warning',
    'APPROVED':    'badge-success',
    'DENIED':      'badge-danger',
    'ACCEPTED':    'badge-success',
    'DECLINED':    'badge-danger',
  };
  return '<span class="badge ' + (map[status.toUpperCase()] || map[s] || 'badge-neutral') + '">' + escapeHtml(s) + '</span>';
}

function showToast(msg, type) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast' + (type ? ' ' + type : '');
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => t.classList.remove('show'), 3000);
}

function shimmerBlock() {
  return '<div class="shimmer-line" style="width:60%;margin-bottom:8px"></div><div class="shimmer-line" style="width:40%"></div>';
}

function shimmerRows(n) {
  let html = '';
  for (let i = 0; i < n; i++) {
    html += '<tr><td colspan="6" style="padding:1rem">' + shimmerBlock() + '</td></tr>';
  }
  return html;
}

function setButtonLoading(btn, loading, text) {
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = loading ? 'Loading…' : (text || 'Submit');
  btn.style.opacity = loading ? '0.65' : '1';
}

function debounce(fn, ms) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

/* ── Panel helpers ── */
function openPanel(panelId) {
  document.getElementById('overlay')?.classList.add('open');
  document.getElementById(panelId)?.classList.add('open');
}
function closeAllPanels() {
  document.getElementById('overlay')?.classList.remove('open');
  document.querySelectorAll('.slide-panel').forEach(p => p.classList.remove('open'));
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
}

/* ── Modal helpers ── */
function openModal(id) {
  document.getElementById(id)?.classList.add('open');
}
function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}


/* ══════════════════════════════════════════
   4. ERROR STATE HELPER
══════════════════════════════════════════ */
function renderError(containerId, message, retryFn) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const isTable = el.tagName === 'TBODY';
  if (isTable) {
    const cols = el.closest('table')?.querySelectorAll('thead th').length || 6;
    el.innerHTML = '<tr><td colspan="' + cols + '" class="empty-state">' +
      '<h3>Something went wrong</h3>' +
      '<p>' + escapeHtml(message) + '</p>' +
      (retryFn ? '<button class="btn btn-sm btn-primary" style="margin-top:0.5rem">Retry</button>' : '') +
    '</td></tr>';
    if (retryFn) el.querySelector('button').addEventListener('click', retryFn);
  } else {
    el.innerHTML = '<div class="empty-state">' +
      '<h3>Something went wrong</h3>' +
      '<p>' + escapeHtml(message) + '</p>' +
      (retryFn ? '<button class="btn btn-sm btn-primary" style="margin-top:0.5rem">Retry</button>' : '') +
    '</div>';
    if (retryFn) el.querySelector('button').addEventListener('click', retryFn);
  }
}


/* ══════════════════════════════════════════
   5. DASHBOARD PAGE
══════════════════════════════════════════ */
async function loadDashboard() {
  const ids = ['statTodayPatients','statWaitingQueue','statPendingReferrals','statOnDutyDoctors','statBedOccupancy','statActiveEpisodes','statAwaitingAssignment'];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = shimmerBlock(); });

  let stats;
  try {
    stats = await safeApiGet(HC_CONFIG.ENDPOINTS.REC_STATS);
  } catch {
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '—'; });
    showToast('Could not load dashboard stats. Please try again.', 'error');
    return;
  }

  document.getElementById('statTodayPatients').textContent     = stats.today_patients ?? '—';
  document.getElementById('statWaitingQueue').textContent       = stats.waiting_queue ?? '—';
  document.getElementById('statPendingReferrals').textContent   = stats.pending_referrals ?? '—';
  document.getElementById('statOnDutyDoctors').textContent      = stats.on_duty_doctors ?? '—';
  document.getElementById('statBedOccupancy').textContent       = stats.bed_occupancy ?? '—';
  document.getElementById('statActiveEpisodes').textContent     = stats.active_episodes ?? '—';
  document.getElementById('statAwaitingAssignment').textContent = stats.awaiting_assignment ?? '—';
}

let _dashRefreshInterval = setInterval(() => {
  if (document.getElementById('page-dashboard')?.classList.contains('active')) {
    _loaded.delete('dashboard');
    loadDashboard();
  }
}, 30000);


/* ══════════════════════════════════════════
   6. PATIENTS PAGE
══════════════════════════════════════════ */
function initPatientSearch() {
  const input = document.getElementById('patientSearchInput');
  if (!input) return;

  input.addEventListener('input', debounce(function() {
    const q = input.value.trim();
    if (q.length < 3) {
      document.getElementById('patientResultsContainer').innerHTML =
        '<div class="empty-state"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><h3>Search for a patient</h3><p>Enter a name, email, phone number, or HC ID above.</p></div>';
      return;
    }
    searchPatients(q);
  }, 350));
}

async function searchPatients(query) {
  const container = document.getElementById('patientResultsContainer');
  container.innerHTML = '<div class="patient-results">' +
    Array(2).fill('<div class="patient-card" style="pointer-events:none">' + shimmerBlock() + '</div>').join('') +
  '</div>';

  let results;
  try {
    const data = await safeApiGet(HC_CONFIG.ENDPOINTS.REC_PATIENT_SEARCH + '?query=' + encodeURIComponent(query));
    results = Array.isArray(data) ? data : (data.results || []);
  } catch {
    container.innerHTML = '<div class="empty-state"><h3>Search failed</h3><p>Could not reach the server. Please try again.</p></div>';
    return;
  }

  if (results.length === 0) {
    container.innerHTML = '<div class="empty-state"><h3>No patients found</h3><p>Try a different search term or register a new patient.</p></div>';
    return;
  }

  // Store results for info panel access
  _lastSearchResults = results;

  container.innerHTML = '<div class="patient-results">' +
    results.map((p, idx) => {
      const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email;
      const hcId = p.healthclouda_id || '—';

      let statusHtml = '';
      if (p.has_visited_org) {
        statusHtml = '<span class="badge badge-success">Existing Patient</span>';
      } else if (p.has_pending_access_request) {
        statusHtml = '<span class="badge badge-warning">Pending Consent</span>';
      } else if (p.has_approved_access) {
        statusHtml = '<span class="badge badge-info">Approved</span>';
      } else {
        statusHtml = '<span class="badge badge-neutral">New to Org</span>';
      }

      return '<div class="patient-card" data-patient-idx="' + idx + '" style="cursor:pointer">' +
        '<div class="patient-card-info">' +
          '<div class="patient-card-name">' + escapeHtml(name) + ' ' + statusHtml + '</div>' +
          '<div class="patient-card-meta">' +
            escapeHtml(hcId) + ' &bull; ' + escapeHtml(p.email || '') + (p.phone ? ' &bull; ' + escapeHtml(p.phone) : '') +
            (p.gender ? ' &bull; ' + escapeHtml(p.gender) : '') +
          '</div>' +
        '</div>' +
        '<div class="patient-card-actions">' +
          '<span style="color:var(--text-soft);font-size:0.78rem">View details &rsaquo;</span>' +
        '</div>' +
      '</div>';
    }).join('') +
  '</div>';

  // Attach click listeners via delegation
  container.querySelector('.patient-results').addEventListener('click', function(e) {
    const card = e.target.closest('[data-patient-idx]');
    if (!card) return;
    const idx = parseInt(card.dataset.patientIdx, 10);
    if (_lastSearchResults[idx]) openPatientInfoPanel(_lastSearchResults[idx]);
  });
}

let _lastSearchResults = [];

/* ── Patient Info Panel ── */
function openPatientInfoPanel(patient) {
  const name = [patient.first_name, patient.last_name].filter(Boolean).join(' ') || patient.email;
  document.getElementById('patientInfoName').textContent = name;

  const body = document.getElementById('patientInfoBody');
  const hcId = patient.healthclouda_id || '—';

  // Status badge
  let statusHtml = '';
  if (patient.has_visited_org) {
    statusHtml = '<span class="badge badge-success">Existing Patient</span>';
  } else if (patient.has_pending_access_request) {
    statusHtml = '<span class="badge badge-warning">Pending Consent</span>';
  } else if (patient.has_approved_access) {
    statusHtml = '<span class="badge badge-info">Approved</span>';
  } else {
    statusHtml = '<span class="badge badge-neutral">New to Org</span>';
  }

  // Info rows
  let html = '<div style="margin-bottom:1.5rem">' +
    '<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:1rem">' + statusHtml + '</div>' +
    '<div style="display:grid;grid-template-columns:auto 1fr;gap:0.4rem 1rem;font-size:0.88rem">' +
      '<span style="color:var(--text-soft)">HC ID</span><span class="td-mono">' + escapeHtml(hcId) + '</span>' +
      '<span style="color:var(--text-soft)">Email</span><span>' + escapeHtml(patient.email || '—') + '</span>' +
      '<span style="color:var(--text-soft)">Phone</span><span>' + escapeHtml(patient.phone || '—') + '</span>' +
      '<span style="color:var(--text-soft)">Gender</span><span>' + escapeHtml(patient.gender || '—') + '</span>' +
    '</div>' +
  '</div>';

  // Action buttons based on access status
  html += '<div style="display:flex;flex-direction:column;gap:0.5rem">';

  if (patient.has_visited_org || patient.has_approved_access) {
    // Known patient — offer Book Appointment and Send to Nurse
    html += '<button class="btn btn-primary" id="patientInfoBookAppt">Book Appointment</button>';
    html += '<button class="btn btn-outline" id="patientInfoSendNurse">Send to Nurse (Vitals)</button>';
  } else if (patient.has_pending_access_request) {
    // Waiting on consent
    html += '<button class="btn btn-ghost" disabled>Awaiting Patient Consent</button>';
  } else {
    // New patient to org — request access
    html += '<button class="btn btn-warning" id="patientInfoRequestAccess">Request Access</button>';
  }

  html += '</div>';
  body.innerHTML = html;

  // Wire up action buttons
  const bookBtn = document.getElementById('patientInfoBookAppt');
  const nurseBtn = document.getElementById('patientInfoSendNurse');
  const accessBtn = document.getElementById('patientInfoRequestAccess');

  if (bookBtn) {
    bookBtn.addEventListener('click', function() {
      closeAllPanels();
      openBookAppointmentPanel(patient.id, name);
    });
  }
  if (nurseBtn) {
    nurseBtn.addEventListener('click', function() {
      closeAllPanels();
      sendToNurse(patient.id, name);
    });
  }
  if (accessBtn) {
    accessBtn.addEventListener('click', function() {
      closeAllPanels();
      openAccessRequestModal(patient.id, name);
    });
  }

  openPanel('patientInfoPanel');
}

/* ── Send to Nurse (vitals) ── */
async function sendToNurse(patientId, patientName) {
  // TODO: Backend endpoint needed — POST /receptionist/send-to-nurse/
  if (!HC_CONFIG.ENDPOINTS.REC_SEND_TO_NURSE) {
    showToast('Send to Nurse is not yet available. Backend endpoint required.', 'error');
    return;
  }
  try {
    await safeApiPost(HC_CONFIG.ENDPOINTS.REC_SEND_TO_NURSE, { patient_id: patientId });
    showToast(escapeHtml(patientName) + ' sent to nurse for vitals.', 'success');
  } catch (err) {
    showToast(hc_formatApiError(err.data, 'Failed to send patient to nurse.'), 'error');
  }
}

/* ── Register Patient ── */
function openRegisterPanel() {
  document.getElementById('registerPatientForm')?.reset();
  openPanel('registerPanel');
}

async function submitRegisterPatient(e) {
  e.preventDefault();
  const form = document.getElementById('registerPatientForm');
  const btn  = document.getElementById('registerPatientBtn');
  if (!form) return;

  const body = {};
  new FormData(form).forEach((v, k) => { if (v) body[k] = v; });

  // Validate email format
  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    showToast('Please enter a valid email address.', 'error');
    return;
  }
  // Validate phone format (international, at least 10 digits)
  if (body.phone && !/^\+?[\d\s\-()]{10,}$/.test(body.phone)) {
    showToast('Please enter a valid phone number.', 'error');
    return;
  }

  setButtonLoading(btn, true);
  try {
    const created = await safeApiPost(HC_CONFIG.ENDPOINTS.CREATE_PATIENT, body);
    showToast('Patient registered successfully!', 'success');
    form.reset();
    closeAllPanels();
    // Org access is auto-granted on creation — open the patient panel immediately
    openPatientInfoPanel({ ...created, has_visited_org: true });
  } catch (err) {
    const fallback = err.status >= 500 ? 'Server error. Please try again later.' : 'Failed to register patient.';
    showToast(hc_formatApiError(err.data, fallback), 'error');
  }
  setButtonLoading(btn, false, 'Register Patient');
}

/* ── Access Request ── */
function openAccessRequestModal(patientId, patientName) {
  document.getElementById('accessReqPatientId').value = patientId;
  document.getElementById('accessReqPatientName').textContent = patientName;
  document.getElementById('accessReqReason').value = '';
  openModal('accessRequestModal');
}

async function submitAccessRequest() {
  const patientId = document.getElementById('accessReqPatientId').value;
  const reason    = document.getElementById('accessReqReason').value.trim();
  const btn       = document.getElementById('accessReqSubmitBtn');

  if (!reason) { showToast('Please provide a reason for access.', 'error'); return; }

  setButtonLoading(btn, true);
  try {
    await safeApiPost(HC_CONFIG.ENDPOINTS.REC_ACCESS_REQUESTS, { patient_id: patientId, reason: reason });
    showToast('Access request sent! Awaiting patient consent.', 'success');
    closeModal('accessRequestModal');
    // Re-search
    const q = document.getElementById('patientSearchInput')?.value.trim();
    if (q && q.length >= 3) searchPatients(q);
  } catch (err) {
    showToast(hc_formatApiError(err.data, 'Failed to send access request.'), 'error');
  }
  setButtonLoading(btn, false, 'Send Request');
}

/* ── Assign Doctor ── */
let _doctorsCache = null;

async function fetchDoctors() {
  if (_doctorsCache) return _doctorsCache;
  try {
    const data = await safeApiGet(HC_CONFIG.ENDPOINTS.REC_DOCTORS_ON_DUTY);
    _doctorsCache = Array.isArray(data) ? data : (data.results || []);
  } catch {
    _doctorsCache = [];
    showToast('Could not load doctors list.', 'error');
  }
  return _doctorsCache;
}

async function openAssignDoctorPanel(patientId, patientName) {
  document.getElementById('assignPatientId').value = patientId;
  document.getElementById('assignPatientName').textContent = patientName;
  document.getElementById('assignDoctorForm')?.reset();
  document.getElementById('assignPatientId').value = patientId;

  openPanel('assignDoctorPanel');

  const select = document.getElementById('assignDoctorSelect');
  select.innerHTML = '<option value="">Loading doctors…</option>';

  const doctors = await fetchDoctors();
  if (doctors.length === 0) {
    select.innerHTML = '<option value="">No doctors on duty</option>';
  } else {
    select.innerHTML = '<option value="">Select a doctor…</option>' +
      doctors.map(d => '<option value="' + d.id + '">' + escapeHtml(d.name) + (d.specialty ? ' — ' + escapeHtml(d.specialty) : '') + '</option>').join('');
  }
}

async function submitAssignDoctor(e) {
  e.preventDefault();
  const form = document.getElementById('assignDoctorForm');
  const btn  = document.getElementById('assignDoctorBtn');
  if (!form) return;

  const body = {};
  new FormData(form).forEach((v, k) => { if (v) body[k] = v; });

  setButtonLoading(btn, true);
  try {
    await safeApiPost(HC_CONFIG.ENDPOINTS.REC_ASSIGN_DOCTOR, body);
    showToast('Doctor assigned successfully!', 'success');
    closeAllPanels();
    // Refresh queue if loaded
    _loaded.delete('queue');
    if (document.getElementById('page-queue')?.classList.contains('active')) loadQueue();
  } catch (err) {
    showToast(hc_formatApiError(err.data, 'Failed to assign doctor.'), 'error');
  }
  setButtonLoading(btn, false, 'Assign Doctor');
}


/* ══════════════════════════════════════════
   7. QUEUE PAGE
══════════════════════════════════════════ */
async function loadQueue() {
  const tbody = document.getElementById('queueTableBody');
  if (!tbody) return;
  tbody.innerHTML = shimmerRows(3);

  const status = document.getElementById('queueStatusFilter')?.value || '';
  let url = HC_CONFIG.ENDPOINTS.REC_CHECK_INS;
  if (status) url += '?status=' + status;

  let items;
  try {
    const data = await safeApiGet(url);
    items = Array.isArray(data) ? data : (data.results || []);
  } catch {
    renderError('queueTableBody', 'Could not load queue. Please try again.', loadQueue);
    return;
  }

  document.getElementById('queueCount').textContent = items.length + ' patient' + (items.length !== 1 ? 's' : '');

  // Doctor load summary
  const doctorLoad = {};
  items.forEach(function(q) {
    const doc = q.doctor_name || 'Unassigned';
    if (!doctorLoad[doc]) doctorLoad[doc] = 0;
    if (q.status === 'WAITING' || q.status === 'IN_PROGRESS') doctorLoad[doc]++;
  });
  const loadEl = document.getElementById('doctorLoadSummary');
  if (loadEl) {
    const entries = Object.entries(doctorLoad);
    if (entries.length > 0) {
      loadEl.innerHTML = entries.map(function(e) {
        return '<span class="badge badge-neutral" style="margin-right:0.4rem">' + escapeHtml(e[0]) + ': ' + e[1] + '</span>';
      }).join('');
    } else {
      loadEl.innerHTML = '';
    }
  }

  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No patients in queue.</td></tr>';
    return;
  }

  tbody.innerHTML = items.map((q, i) => {
    return '<tr>' +
      '<td class="td-mono">' + (i + 1) + '</td>' +
      '<td>' + escapeHtml(q.patient_name) + '<br><span class="td-mono">' + escapeHtml(q.patient_hc_id || '') + '</span></td>' +
      '<td>' + escapeHtml(q.doctor_name || '—') + '</td>' +
      '<td>' + statusBadge(q.status) + '</td>' +
      '<td class="td-date">' + formatRelativeTime(q.checked_in_at) + '</td>' +
    '</tr>';
  }).join('');
}

/* ══════════════════════════════════════════
   8. APPOINTMENTS PAGE
══════════════════════════════════════════ */
async function loadAppointments() {
  const tbody = document.getElementById('apptTableBody');
  if (!tbody) return;
  tbody.innerHTML = shimmerRows(3);

  const status = document.getElementById('apptStatusFilter')?.value || '';
  const date   = document.getElementById('apptDateFilter')?.value || '';

  let url = HC_CONFIG.ENDPOINTS.REC_APPOINTMENTS;
  const params = [];
  if (status) params.push('status=' + status);
  if (date)   params.push('date=' + date);
  if (params.length) url += '?' + params.join('&');

  let items;
  try {
    const data = await safeApiGet(url);
    items = Array.isArray(data) ? data : (data.results || []);
  } catch {
    renderError('apptTableBody', 'Could not load appointments. Please try again.', loadAppointments);
    return;
  }

  document.getElementById('apptCount').textContent = items.length + ' appointment' + (items.length !== 1 ? 's' : '');

  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No appointments found.</td></tr>';
    return;
  }

  tbody.innerHTML = items.map(a => {
    let actions = '';
    if (a.status === 'SCHEDULED') {
      actions = '<button class="row-btn success" data-appt-id="' + a.id + '" data-appt-action="COMPLETED">Complete</button>' +
                '<button class="row-btn danger" data-appt-id="' + a.id + '" data-appt-action="CANCELLED">Cancel</button>' +
                '<button class="row-btn warn" data-appt-id="' + a.id + '" data-appt-action="NO_SHOW">No-Show</button>';
    }

    const dateTime = a.date ? escapeHtml(a.date) + (a.time ? ' ' + escapeHtml(a.time) : '') : formatDateTime(a.scheduled_at);

    return '<tr>' +
      '<td>' + escapeHtml(a.patient_name) + '<br><span class="td-mono">' + escapeHtml(a.patient_hc_id || '') + '</span></td>' +
      '<td>' + escapeHtml(a.doctor_name || '—') + '</td>' +
      '<td class="td-date">' + dateTime + (a.duration ? '<br><span style="font-size:0.72rem;color:var(--text-soft)">' + a.duration + ' min</span>' : '') + '</td>' +
      '<td>' + escapeHtml(a.reason || '—') + '</td>' +
      '<td>' + statusBadge(a.status) + '</td>' +
      '<td><div class="row-actions">' + actions + '</div></td>' +
    '</tr>';
  }).join('');

  // Delegated click handler for appointment actions
  tbody.addEventListener('click', function(e) {
    const btn = e.target.closest('[data-appt-action]');
    if (!btn) return;
    const id = btn.dataset.apptId;
    const action = btn.dataset.apptAction;
    if (action === 'CANCELLED' && !confirm('Are you sure you want to cancel this appointment?')) return;
    if (action === 'NO_SHOW' && !confirm('Mark this appointment as no-show?')) return;
    updateAppointment(id, action);
  });
}

async function updateAppointment(id, newStatus) {
  try {
    await safeApiPatch(HC_CONFIG.ENDPOINTS.REC_APPOINTMENTS + id + '/', { status: newStatus });
    showToast('Appointment updated!', 'success');
    _loaded.delete('appointments');
    loadAppointments();
  } catch (err) {
    showToast(hc_formatApiError(err.data, 'Failed to update appointment.'), 'error');
  }
}

/* ── Book Appointment ── */
async function openBookAppointmentPanel(patientId, patientName) {
  document.getElementById('bookApptForm')?.reset();
  // Pre-fill patient if passed from info panel
  const pidInput = document.getElementById('apptPatientId');
  const pnameEl = document.getElementById('apptPatientLabel');
  if (patientId && pidInput) pidInput.value = patientId;
  if (patientName && pnameEl) {
    pnameEl.textContent = patientName;
    pnameEl.style.display = 'block';
  } else if (pnameEl) {
    pnameEl.style.display = 'none';
  }
  openPanel('bookApptPanel');

  const select = document.getElementById('apptDoctorSelect');
  select.innerHTML = '<option value="">Loading doctors…</option>';

  const doctors = await fetchDoctors();
  if (doctors.length === 0) {
    select.innerHTML = '<option value="">No doctors on duty</option>';
  } else {
    select.innerHTML = '<option value="">Select a doctor…</option>' +
      doctors.map(d => '<option value="' + d.id + '">' + escapeHtml(d.name) + (d.specialty ? ' — ' + escapeHtml(d.specialty) : '') + '</option>').join('');
  }
}

async function submitBookAppointment(e) {
  e.preventDefault();
  const form = document.getElementById('bookApptForm');
  const btn  = document.getElementById('bookApptBtn');
  if (!form) return;

  const body = {};
  new FormData(form).forEach((v, k) => { if (v) body[k] = v; });

  // Validate date is not in the past
  if (body.date) {
    const today = new Date().toISOString().slice(0, 10);
    if (body.date < today) {
      showToast('Appointment date cannot be in the past.', 'error');
      return;
    }
  }

  setButtonLoading(btn, true);
  try {
    await safeApiPost(HC_CONFIG.ENDPOINTS.REC_APPOINTMENTS, body);
    showToast('Appointment booked successfully!', 'success');
    closeAllPanels();
    _loaded.delete('appointments');
    if (document.getElementById('page-appointments')?.classList.contains('active')) loadAppointments();
  } catch (err) {
    showToast(hc_formatApiError(err.data, 'Failed to book appointment.'), 'error');
  }
  setButtonLoading(btn, false, 'Book Appointment');
}


/* ══════════════════════════════════════════
   9. REFERRALS PAGE
══════════════════════════════════════════ */
async function loadReferrals() {
  const container = document.getElementById('referralsContainer');
  if (!container) return;
  container.innerHTML = '<div class="referral-list">' +
    Array(2).fill('<div class="referral-card" style="pointer-events:none">' + shimmerBlock() + '</div>').join('') +
  '</div>';

  const status = document.getElementById('referralStatusFilter')?.value || '';
  let url = HC_CONFIG.ENDPOINTS.REC_REFERRALS;
  if (status) url += '?status=' + status;

  let items;
  try {
    const data = await safeApiGet(url);
    items = Array.isArray(data) ? data : (data.results || []);
  } catch {
    renderError('referralsContainer', 'Could not load referrals. Please try again.', loadReferrals);
    return;
  }

  if (items.length === 0) {
    container.innerHTML = '<div class="empty-state"><h3>No referrals found</h3><p>Incoming referrals from other organizations will appear here.</p></div>';
    return;
  }

  container.innerHTML = '<div class="referral-list">' +
    items.map(r => {
      const urgencyClass = (r.urgency || '').toLowerCase() === 'high' ? 'badge-danger' : (r.urgency || '').toLowerCase() === 'medium' ? 'badge-warning' : 'badge-neutral';

      let actions = '';
      if (r.status === 'PENDING') {
        actions = '<div class="referral-actions">' +
          '<button class="btn btn-sm btn-primary" data-referral-notify="' + r.id + '">Notify Staff</button>' +
        '</div>';
      }

      return '<div class="referral-card">' +
        '<div class="referral-top">' +
          '<span class="referral-from">' + escapeHtml(r.from_organization || r.from_org_name || '') + '</span>' +
          '<div>' + statusBadge(r.status) + ' <span class="badge ' + urgencyClass + '">' + escapeHtml(r.urgency || '') + '</span></div>' +
        '</div>' +
        '<div class="referral-detail"><strong>Patient:</strong> ' + escapeHtml(r.patient_name || '') + '</div>' +
        '<div class="referral-detail">' + escapeHtml(r.reason || '') + '</div>' +
        '<div class="referral-meta">' + formatDate(r.created_at) + '</div>' +
        actions +
      '</div>';
    }).join('') +
  '</div>';

  // Delegated click handler for referral notify buttons
  container.addEventListener('click', function(e) {
    const btn = e.target.closest('[data-referral-notify]');
    if (!btn) return;
    openNotifyDoctorsModal(btn.dataset.referralNotify);
  });
}

/* ── Notify Staff Modal ── */
async function openNotifyDoctorsModal(referralId) {
  document.getElementById('notifyReferralId').value = referralId;
  document.getElementById('notifyDoctorsMessage').value = '';

  const doctorListEl = document.getElementById('notifyDoctorsList');
  const nurseListEl = document.getElementById('notifyNursesList');
  doctorListEl.innerHTML = 'Loading doctors…';
  nurseListEl.innerHTML = 'Loading nurses…';
  openModal('notifyDoctorsModal');

  const doctors = await fetchDoctors();
  if (doctors.length === 0) {
    doctorListEl.innerHTML = '<div style="font-size:0.85rem;color:var(--text-soft)">No doctors on duty.</div>';
  } else {
    doctorListEl.innerHTML = doctors.map(d =>
      '<label style="display:flex;align-items:center;gap:0.5rem;padding:0.4rem 0;font-size:0.88rem;cursor:pointer">' +
        '<input type="checkbox" name="doctor_ids" value="' + d.id + '">' +
        escapeHtml(d.name) + (d.specialty ? ' <span style="color:var(--text-soft);font-size:0.78rem">(' + escapeHtml(d.specialty) + ')</span>' : '') +
      '</label>'
    ).join('');
  }

  // TODO: Backend — need a nurses-on-duty endpoint; for now show placeholder
  nurseListEl.innerHTML = '<div style="font-size:0.85rem;color:var(--text-soft)">Nurse notifications coming soon (backend needed).</div>';
}

async function submitNotifyDoctors() {
  const referralId = document.getElementById('notifyReferralId').value;
  const message    = document.getElementById('notifyDoctorsMessage').value.trim();
  const btn        = document.getElementById('notifyDoctorsBtn');

  const checkboxes = document.querySelectorAll('#notifyDoctorsList input[name="doctor_ids"]:checked');
  const doctorIds  = Array.from(checkboxes).map(cb => cb.value);

  if (doctorIds.length === 0) { showToast('Please select at least one doctor.', 'error'); return; }

  setButtonLoading(btn, true);
  try {
    await safeApiPost(HC_CONFIG.ENDPOINTS.REC_NOTIFY_DOCTORS + referralId + '/notify-doctors/', {
      doctor_ids: doctorIds,
      message: message || undefined
    });
    showToast('Doctors notified successfully!', 'success');
    closeModal('notifyDoctorsModal');
    _loaded.delete('referrals');
    if (document.getElementById('page-referrals')?.classList.contains('active')) loadReferrals();
  } catch (err) {
    showToast(hc_formatApiError(err.data, 'Failed to notify doctors.'), 'error');
  }
  setButtonLoading(btn, false, 'Notify Selected');
}


/* ══════════════════════════════════════════
   10. EMERGENCY BEDS PAGE
══════════════════════════════════════════ */
async function loadEmergencyBeds() {
  const container = document.getElementById('bedsContainer');
  if (!container) return;
  container.innerHTML = '<div class="ward-cards">' +
    '<div class="ward-card" style="pointer-events:none">' + shimmerBlock() + '<br>' + shimmerBlock() + '</div>' +
  '</div>';

  let wards;
  try {
    const data = await safeApiGet(HC_CONFIG.ENDPOINTS.REC_EMERGENCY_BEDS);
    wards = Array.isArray(data) ? data : (data.wards || data.results || []);
  } catch {
    renderError('bedsContainer', 'Could not load bed data. Please try again.', loadEmergencyBeds);
    return;
  }

  if (wards.length === 0) {
    container.innerHTML = '<div class="empty-state"><h3>No ward data</h3><p>Emergency bed information will appear here.</p></div>';
    return;
  }

  container.innerHTML = '<div class="ward-cards">' +
    wards.map(w => {
      const total    = w.total_beds || w.beds?.length || 0;
      const occupied = w.occupied_beds ?? (w.beds || []).filter(b => b.status === 'occupied').length;
      const available = total - occupied;
      const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;
      const fillColor = pct > 80 ? 'var(--danger)' : pct > 50 ? 'var(--warning)' : 'var(--success)';

      let bedsHtml = '';
      if (w.beds && w.beds.length) {
        bedsHtml = '<div class="bed-grid">' +
          w.beds.map(b => {
            const patientName = b.current_patient
              ? [b.current_patient.first_name, b.current_patient.last_name].filter(Boolean).join(' ')
              : '';
            const cls = (b.status || '').toUpperCase() === 'OCCUPIED' ? 'occupied' : 'available';
            return '<div class="bed-cell ' + cls + '" title="' + escapeHtml(b.bed_number + (patientName ? ': ' + patientName : '')) + '">' +
              '<div class="bed-number">' + escapeHtml(b.bed_number || '') + '</div>' +
              '<div class="bed-patient">' + escapeHtml(patientName || 'Available') + '</div>' +
            '</div>';
          }).join('') +
        '</div>';
      }

      return '<div class="ward-card">' +
        '<div class="ward-header">' +
          '<span class="ward-name">' + escapeHtml(w.ward_name || w.name || 'Ward') + '</span>' +
          '<span class="ward-stats">' + occupied + ' occupied / ' + available + ' available (' + total + ' total)</span>' +
        '</div>' +
        '<div class="occupancy-bar"><div class="occupancy-fill" style="width:' + pct + '%;background:' + fillColor + '"></div></div>' +
        bedsHtml +
      '</div>';
    }).join('') +
  '</div>';
}


/* ══════════════════════════════════════════
   11. ACCESS REQUESTS PAGE
══════════════════════════════════════════ */
async function loadAccessRequests() {
  const tbody = document.getElementById('accessTableBody');
  if (!tbody) return;
  tbody.innerHTML = shimmerRows(3);

  const status = document.getElementById('accessStatusFilter')?.value || '';
  let url = HC_CONFIG.ENDPOINTS.REC_ACCESS_REQUESTS;
  if (status) url += '?status=' + status;

  let items;
  try {
    const data = await safeApiGet(url);
    items = Array.isArray(data) ? data : (data.results || []);
  } catch {
    renderError('accessTableBody', 'Could not load access requests. Please try again.', loadAccessRequests);
    return;
  }

  document.getElementById('accessCount').textContent = items.length + ' request' + (items.length !== 1 ? 's' : '');

  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No access requests found.</td></tr>';
    return;
  }

  tbody.innerHTML = items.map(a => {
    return '<tr>' +
      '<td>' + escapeHtml(a.patient_name || '') + '<br><span class="td-mono">' + escapeHtml(a.patient_hc_id || '') + '</span></td>' +
      '<td>' + escapeHtml(a.requested_by || '—') + '</td>' +
      '<td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="' + escapeHtml(a.reason || '') + '">' + escapeHtml(a.reason || '—') + '</td>' +
      '<td>' + statusBadge(a.status) + '</td>' +
      '<td class="td-date">' + formatDate(a.created_at) + '</td>' +
      '<td class="td-date">' + (a.responded_at ? formatDate(a.responded_at) : '—') + '</td>' +
    '</tr>';
  }).join('');
}


/* ══════════════════════════════════════════
   12. NOTIFICATIONS PAGE
══════════════════════════════════════════ */
let _notifsCache = [];

async function loadNotifications() {
  const container = document.getElementById('notificationsContainer');
  container.innerHTML = '<div class="notif-list-page">' +
    Array(3).fill('<div class="notif-item" style="pointer-events:none"><div style="flex:1">' + shimmerBlock() + '</div></div>').join('') +
  '</div>';

  try {
    const data = await safeApiGet(HC_CONFIG.ENDPOINTS.STAFF_NOTIFS);
    _notifsCache = Array.isArray(data) ? data : (data.results || []);
  } catch {
    renderError('notificationsContainer', 'Could not load notifications. Please try again.', loadNotifications);
    return;
  }

  renderNotifications();
}

function renderNotifications() {
  const container = document.getElementById('notificationsContainer');

  if (_notifsCache.length === 0) {
    container.innerHTML = '<div class="empty-state"><h3>No notifications</h3><p>You\'re all caught up!</p></div>';
    return;
  }

  container.innerHTML = '<div class="notif-list-page">' +
    _notifsCache.map(n => {
      const typeClass = (n.notification_type || '').toLowerCase().replace(/_/g, '-');
      const icon = notifIcon(n.notification_type);
      const unread = !n.is_read ? ' unread' : '';
      return '<div class="notif-item' + unread + '" data-notif-id="' + n.id + '" style="cursor:pointer">' +
        '<div class="notif-icon ' + typeClass + '">' + icon + '</div>' +
        '<div class="notif-body">' +
          '<div class="notif-title">' + escapeHtml(n.title) + '</div>' +
          '<div class="notif-message">' + escapeHtml(n.message) + '</div>' +
          '<div class="notif-meta"><span>' + formatRelativeTime(n.created_at) + '</span></div>' +
        '</div>' +
        (!n.is_read ? '<div class="notif-dot"></div>' : '') +
      '</div>';
    }).join('') +
  '</div>';

  // Delegated click for notification items
  container.querySelector('.notif-list-page')?.addEventListener('click', function(e) {
    const item = e.target.closest('[data-notif-id]');
    if (!item) return;
    markNotificationRead(parseInt(item.dataset.notifId, 10));
  });
}

function notifIcon(type) {
  switch (type) {
    case 'REFERRAL_ALERT':      return '🚨';
    case 'PATIENT_ASSIGNED':    return '👤';
    case 'PATIENT_CHECKED_IN':  return '✅';
    case 'APPOINTMENT_BOOKED':  return '📅';
    default:                    return '🔔';
  }
}

async function markNotificationRead(id) {
  const notif = _notifsCache.find(n => n.id === id);
  if (!notif || notif.is_read) return;

  notif.is_read = true;
  renderNotifications();

  try {
    await safeApiPatch(HC_CONFIG.ENDPOINTS.STAFF_NOTIFS + id + '/read/');
  } catch { /* silent — already updated UI optimistically */ }

  refreshUnreadCount();
}

async function markAllNotificationsRead() {
  const btn = document.getElementById('markAllReadBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Marking…'; }

  _notifsCache.forEach(n => n.is_read = true);
  renderNotifications();

  try {
    await safeApiPost(HC_CONFIG.ENDPOINTS.STAFF_NOTIFS + 'read-all/');
  } catch { /* silent */ }

  updateNotifBadge(0);
  if (btn) { btn.disabled = false; btn.textContent = 'Mark all as read'; }
  showToast('All notifications marked as read', 'success');
}


/* ══════════════════════════════════════════
   13. NOTIFICATION BADGE POLLING
══════════════════════════════════════════ */
function updateNotifBadge(count) {
  const headerBadge  = document.getElementById('headerNotifBadge');
  const sidebarBadge = document.getElementById('sidebarNotifBadge');

  if (headerBadge) {
    headerBadge.textContent = count > 99 ? '99+' : count;
    headerBadge.classList.toggle('hidden', count === 0);
  }
  if (sidebarBadge) {
    sidebarBadge.textContent = count > 99 ? '99+' : count;
    sidebarBadge.classList.toggle('hidden', count === 0);
  }
}

async function refreshUnreadCount() {
  try {
    const data = await safeApiGet(HC_CONFIG.ENDPOINTS.STAFF_UNREAD);
    updateNotifBadge(data.count || 0);
  } catch { /* silent */ }
}

// Poll every 30 seconds
let _notifPollInterval = setInterval(refreshUnreadCount, 30000);
// Initial fetch
refreshUnreadCount();


/* ══════════════════════════════════════════
   14. MESSAGES PAGE (Coming Soon)
══════════════════════════════════════════ */
async function loadMessages() {
  const container = document.getElementById('messagesContainer');
  if (!container) return;
  container.innerHTML = '<div class="empty-state" style="padding:3rem;text-align:center">' +
    '<svg viewBox="0 0 24 24" style="width:48px;height:48px;margin:0 auto 1rem;stroke:var(--text-soft);fill:none;stroke-width:1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
    '<h3>Coming Soon</h3><p style="color:var(--text-soft)">Messaging will be available in a future update.</p></div>';
}
function refreshMessageBadge() { /* no backend endpoint */ }
let _msgPollInterval = null;


/* ══════════════════════════════════════════
   15. LOGOUT
══════════════════════════════════════════ */
async function recLogout() {
  clearInterval(_notifPollInterval);
  clearInterval(_msgPollInterval);
  clearInterval(_dashRefreshInterval);

  // Read user before clearing tokens (for role-aware redirect)
  var user = null;
  try { user = hc_getUser(); } catch(e) {}

  try {
    if (typeof apiPost === 'function' && typeof hc_getRefreshToken === 'function') {
      await apiPost(HC_CONFIG.ENDPOINTS.LOGOUT, { refresh: hc_getRefreshToken() });
    }
  } catch {}
  try { if (typeof hc_clearTokens === 'function') hc_clearTokens(); } catch {}

  window.location.href = HC_ROUTER.signinPath(user);
}
