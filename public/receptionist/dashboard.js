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

  if (token && user && typeof hc_redirectByRole === 'function') {
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
   4. DEMO DATA (offline dev)
══════════════════════════════════════════ */
const DEMO_STATS = {
  today_patients: 24, waiting_queue: 6, pending_referrals: 3,
  on_duty_doctors: 5, bed_occupancy: '18/30', active_episodes: 12, awaiting_assignment: 4
};

const DEMO_PATIENTS = [
  { id: 1, healthclouda_id: 'HC-100234', first_name: 'Adaeze', last_name: 'Okafor', email: 'adaeze@gmail.com', phone: '+2348012345678', gender: 'Female', has_visited_org: true, has_pending_access_request: false, has_approved_access: true },
  { id: 2, healthclouda_id: 'HC-100235', first_name: 'Emeka', last_name: 'Udo', email: 'emeka@gmail.com', phone: '+2348098765432', gender: 'Male', has_visited_org: false, has_pending_access_request: true, has_approved_access: false },
  { id: 3, healthclouda_id: 'HC-100236', first_name: 'Fatima', last_name: 'Ibrahim', email: 'fatima@yahoo.com', phone: '+2348055512345', gender: 'Female', has_visited_org: false, has_pending_access_request: false, has_approved_access: false },
];

const DEMO_QUEUE = [
  { id: 1, patient_name: 'Adaeze Okafor', patient_hc_id: 'HC-100234', doctor_name: 'Dr. Amadi', status: 'WAITING', checked_in_at: '2026-03-03T08:30:00Z' },
  { id: 2, patient_name: 'Emeka Udo', patient_hc_id: 'HC-100235', doctor_name: 'Dr. Bello', status: 'IN_PROGRESS', checked_in_at: '2026-03-03T08:15:00Z' },
  { id: 3, patient_name: 'Ngozi Eze', patient_hc_id: 'HC-100237', doctor_name: 'Dr. Amadi', status: 'COMPLETED', checked_in_at: '2026-03-03T07:45:00Z' },
];

const DEMO_APPOINTMENTS = [
  { id: 1, patient_name: 'Adaeze Okafor', patient_hc_id: 'HC-100234', doctor_name: 'Dr. Amadi', date: '2026-03-04', time: '09:00', duration: 30, reason: 'Follow-up checkup', status: 'SCHEDULED' },
  { id: 2, patient_name: 'Chidi Nwosu', patient_hc_id: 'HC-100240', doctor_name: 'Dr. Bello', date: '2026-03-04', time: '10:30', duration: 45, reason: 'New consultation', status: 'SCHEDULED' },
];

const DEMO_REFERRALS = [
  { id: 1, patient_name: 'Kemi Adebayo', from_organization: 'Lagos General Hospital', urgency: 'HIGH', reason: 'Requires specialist cardiology consultation.', status: 'PENDING', created_at: '2026-03-02T14:00:00Z' },
  { id: 2, patient_name: 'Yusuf Musa', from_organization: 'Reddington Hospital', urgency: 'MEDIUM', reason: 'Orthopaedic follow-up after fracture.', status: 'ACCEPTED', created_at: '2026-02-28T10:00:00Z' },
];

const DEMO_BEDS = [
  {
    ward_name: 'Emergency Ward A', total_beds: 12, occupied_beds: 8,
    beds: [
      { number: 'A-01', status: 'occupied', patient_name: 'Ade Bola' },
      { number: 'A-02', status: 'available' },
      { number: 'A-03', status: 'occupied', patient_name: 'Kemi A.' },
      { number: 'A-04', status: 'occupied', patient_name: 'Emeka U.' },
      { number: 'A-05', status: 'available' },
      { number: 'A-06', status: 'occupied', patient_name: 'Ngozi E.' },
      { number: 'A-07', status: 'occupied', patient_name: 'Fatima I.' },
      { number: 'A-08', status: 'available' },
      { number: 'A-09', status: 'occupied', patient_name: 'Yusuf M.' },
      { number: 'A-10', status: 'occupied', patient_name: 'Chidi N.' },
      { number: 'A-11', status: 'available' },
      { number: 'A-12', status: 'occupied', patient_name: 'Bola T.' },
    ]
  },
  {
    ward_name: 'Emergency Ward B', total_beds: 8, occupied_beds: 3,
    beds: [
      { number: 'B-01', status: 'occupied', patient_name: 'Aisha K.' },
      { number: 'B-02', status: 'available' },
      { number: 'B-03', status: 'available' },
      { number: 'B-04', status: 'occupied', patient_name: 'David O.' },
      { number: 'B-05', status: 'available' },
      { number: 'B-06', status: 'available' },
      { number: 'B-07', status: 'available' },
      { number: 'B-08', status: 'occupied', patient_name: 'Mary A.' },
    ]
  }
];

const DEMO_ACCESS_REQUESTS = [
  { id: 1, patient_name: 'Emeka Udo', patient_hc_id: 'HC-100235', requested_by: 'Nurse Aisha', reason: 'Patient scheduled for lab tests', status: 'PENDING', created_at: '2026-03-03T09:00:00Z', responded_at: null },
  { id: 2, patient_name: 'Fatima Ibrahim', patient_hc_id: 'HC-100236', requested_by: 'Dr. Amadi', reason: 'Consultation referral', status: 'APPROVED', created_at: '2026-03-02T11:00:00Z', responded_at: '2026-03-02T14:00:00Z' },
];

const DEMO_DOCTORS = [
  { id: 1, name: 'Dr. Chinedu Amadi', specialty: 'General Practice' },
  { id: 2, name: 'Dr. Aisha Bello', specialty: 'Cardiology' },
  { id: 3, name: 'Dr. Femi Ogundimu', specialty: 'Orthopaedics' },
];

const DEMO_NOTIFICATIONS = [
  { id: 1, notification_type: 'REFERRAL_ALERT', title: 'New Referral Received', message: 'A high-urgency referral for Kemi Adebayo from Lagos General Hospital.', is_read: false, created_at: '2026-03-03T08:00:00Z' },
  { id: 2, notification_type: 'PATIENT_CHECKED_IN', title: 'Patient Checked In', message: 'Adaeze Okafor has checked in and is waiting in the queue.', is_read: false, created_at: '2026-03-03T08:30:00Z' },
  { id: 3, notification_type: 'APPOINTMENT_BOOKED', title: 'Appointment Booked', message: 'New appointment for Chidi Nwosu with Dr. Bello on 4 Mar 2026.', is_read: true, created_at: '2026-03-02T16:00:00Z' },
];


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
    stats = DEMO_STATS;
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
    results = DEMO_PATIENTS.filter(p =>
      (p.first_name + ' ' + p.last_name + ' ' + p.email + ' ' + p.healthclouda_id).toLowerCase().includes(query.toLowerCase())
    );
  }

  if (results.length === 0) {
    container.innerHTML = '<div class="empty-state"><h3>No patients found</h3><p>Try a different search term or register a new patient.</p></div>';
    return;
  }

  container.innerHTML = '<div class="patient-results">' +
    results.map(p => {
      const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email;
      const hcId = p.healthclouda_id || '—';

      // Determine status + available actions
      let statusHtml = '';
      let actionsHtml = '';

      const safeName = escapeHtml(name).replace(/'/g, '&#39;');

      if (p.has_visited_org) {
        statusHtml = '<span class="badge badge-success">Existing Patient</span>';
        actionsHtml = '<button class="btn btn-sm btn-primary" onclick="openAssignDoctorPanel(' + p.id + ',\'' + safeName + '\')">Assign Doctor</button>';
      } else if (p.has_pending_access_request) {
        statusHtml = '<span class="badge badge-warning">Pending Consent</span>';
        actionsHtml = '<button class="btn btn-sm btn-ghost" disabled>Awaiting Consent</button>';
      } else if (p.has_approved_access) {
        statusHtml = '<span class="badge badge-info">Approved</span>';
        actionsHtml = '<button class="btn btn-sm btn-primary" onclick="openAssignDoctorPanel(' + p.id + ',\'' + safeName + '\')">Assign Doctor</button>';
      } else {
        statusHtml = '<span class="badge badge-neutral">New to Org</span>';
        actionsHtml = '<button class="btn btn-sm btn-warning" onclick="openAccessRequestModal(' + p.id + ',\'' + safeName + '\')">Request Access</button>';
      }

      return '<div class="patient-card">' +
        '<div class="patient-card-info">' +
          '<div class="patient-card-name">' + escapeHtml(name) + ' ' + statusHtml + '</div>' +
          '<div class="patient-card-meta">' +
            escapeHtml(hcId) + ' &bull; ' + escapeHtml(p.email || '') + (p.phone ? ' &bull; ' + escapeHtml(p.phone) : '') +
            (p.gender ? ' &bull; ' + escapeHtml(p.gender) : '') +
          '</div>' +
        '</div>' +
        '<div class="patient-card-actions">' + actionsHtml + '</div>' +
      '</div>';
    }).join('') +
  '</div>';
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

  setButtonLoading(btn, true);
  try {
    await safeApiPost(HC_CONFIG.ENDPOINTS.CREATE_PATIENT, body);
    showToast('Patient registered successfully!', 'success');
    closeAllPanels();
    form.reset();
    // Re-search if there's a query
    const q = document.getElementById('patientSearchInput')?.value.trim();
    if (q && q.length >= 3) searchPatients(q);
  } catch (err) {
    let msg = 'Failed to register patient.';
    if (err.status >= 500) msg = 'Server error. Please try again later.';
    else if (err.response) {
      const errors = [];
      for (const [k, v] of Object.entries(err.response)) {
        if (Array.isArray(v)) errors.push(v.join(', '));
        else if (typeof v === 'string' && k !== 'detail' && k !== 'error') errors.push(v);
      }
      msg = err.response.error || err.response.detail || errors.join('. ') || msg;
    }
    showToast(msg, 'error');
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
    let msg = 'Failed to send access request.';
    if (err.response) msg = err.response.error || err.response.detail || msg;
    showToast(msg, 'error');
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
    _doctorsCache = DEMO_DOCTORS;
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
    let msg = 'Failed to assign doctor.';
    if (err.response) msg = err.response.error || err.response.detail || msg;
    showToast(msg, 'error');
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
    items = DEMO_QUEUE;
    if (status) items = items.filter(q => q.status === status);
  }

  document.getElementById('queueCount').textContent = items.length + ' patient' + (items.length !== 1 ? 's' : '');

  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No patients in queue.</td></tr>';
    return;
  }

  tbody.innerHTML = items.map((q, i) => {
    let actions = '';
    if (q.status === 'WAITING') {
      actions = '<button class="row-btn success" onclick="updateCheckIn(' + q.id + ',\'IN_PROGRESS\')">Call In</button>' +
                '<button class="row-btn danger" onclick="updateCheckIn(' + q.id + ',\'NO_SHOW\')">No-Show</button>';
    } else if (q.status === 'IN_PROGRESS') {
      actions = '<button class="row-btn success" onclick="updateCheckIn(' + q.id + ',\'COMPLETED\')">Complete</button>';
    }

    return '<tr>' +
      '<td class="td-mono">' + (i + 1) + '</td>' +
      '<td>' + escapeHtml(q.patient_name) + '<br><span class="td-mono">' + escapeHtml(q.patient_hc_id || '') + '</span></td>' +
      '<td>' + escapeHtml(q.doctor_name || '—') + '</td>' +
      '<td>' + statusBadge(q.status) + '</td>' +
      '<td class="td-date">' + formatRelativeTime(q.checked_in_at) + '</td>' +
      '<td><div class="row-actions">' + actions + '</div></td>' +
    '</tr>';
  }).join('');
}

async function updateCheckIn(id, newStatus) {
  try {
    await safeApiPatch(HC_CONFIG.ENDPOINTS.REC_CHECK_INS + id + '/', { status: newStatus });
    showToast('Queue updated!', 'success');
    _loaded.delete('queue');
    loadQueue();
  } catch (err) {
    let msg = 'Failed to update queue.';
    if (err.response) msg = err.response.error || err.response.detail || msg;
    showToast(msg, 'error');
  }
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
    items = DEMO_APPOINTMENTS;
  }

  document.getElementById('apptCount').textContent = items.length + ' appointment' + (items.length !== 1 ? 's' : '');

  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No appointments found.</td></tr>';
    return;
  }

  tbody.innerHTML = items.map(a => {
    let actions = '';
    if (a.status === 'SCHEDULED') {
      actions = '<button class="row-btn success" onclick="updateAppointment(' + a.id + ',\'COMPLETED\')">Complete</button>' +
                '<button class="row-btn danger" onclick="updateAppointment(' + a.id + ',\'CANCELLED\')">Cancel</button>' +
                '<button class="row-btn warn" onclick="updateAppointment(' + a.id + ',\'NO_SHOW\')">No-Show</button>';
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
}

async function updateAppointment(id, newStatus) {
  try {
    await safeApiPatch(HC_CONFIG.ENDPOINTS.REC_APPOINTMENTS + id + '/', { status: newStatus });
    showToast('Appointment updated!', 'success');
    _loaded.delete('appointments');
    loadAppointments();
  } catch (err) {
    let msg = 'Failed to update appointment.';
    if (err.response) msg = err.response.error || err.response.detail || msg;
    showToast(msg, 'error');
  }
}

/* ── Book Appointment ── */
async function openBookAppointmentPanel() {
  document.getElementById('bookApptForm')?.reset();
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

  setButtonLoading(btn, true);
  try {
    await safeApiPost(HC_CONFIG.ENDPOINTS.REC_APPOINTMENTS, body);
    showToast('Appointment booked successfully!', 'success');
    closeAllPanels();
    _loaded.delete('appointments');
    if (document.getElementById('page-appointments')?.classList.contains('active')) loadAppointments();
  } catch (err) {
    let msg = 'Failed to book appointment.';
    if (err.response) {
      const errors = [];
      for (const [k, v] of Object.entries(err.response)) {
        if (Array.isArray(v)) errors.push(v.join(', '));
        else if (typeof v === 'string' && k !== 'detail' && k !== 'error') errors.push(v);
      }
      msg = err.response.error || err.response.detail || errors.join('. ') || msg;
    }
    showToast(msg, 'error');
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
    items = DEMO_REFERRALS;
    if (status) items = items.filter(r => r.status === status);
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
          '<button class="btn btn-sm btn-primary" onclick="openNotifyDoctorsModal(' + r.id + ')">Notify Doctors</button>' +
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
}

/* ── Notify Doctors Modal ── */
async function openNotifyDoctorsModal(referralId) {
  document.getElementById('notifyReferralId').value = referralId;
  document.getElementById('notifyDoctorsMessage').value = '';

  const listEl = document.getElementById('notifyDoctorsList');
  listEl.innerHTML = 'Loading doctors…';
  openModal('notifyDoctorsModal');

  const doctors = await fetchDoctors();
  if (doctors.length === 0) {
    listEl.innerHTML = '<div class="empty-state">No doctors on duty.</div>';
    return;
  }

  listEl.innerHTML = doctors.map(d =>
    '<label style="display:flex;align-items:center;gap:0.5rem;padding:0.4rem 0;font-size:0.88rem;cursor:pointer">' +
      '<input type="checkbox" name="doctor_ids" value="' + d.id + '">' +
      escapeHtml(d.name) + (d.specialty ? ' <span style="color:var(--text-soft);font-size:0.78rem">(' + escapeHtml(d.specialty) + ')</span>' : '') +
    '</label>'
  ).join('');
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
  } catch (err) {
    let msg = 'Failed to notify doctors.';
    if (err.response) msg = err.response.error || err.response.detail || msg;
    showToast(msg, 'error');
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
    wards = DEMO_BEDS;
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
            const cls = b.status === 'occupied' ? 'occupied' : 'available';
            return '<div class="bed-cell ' + cls + '" title="' + escapeHtml(b.patient_name || 'Available') + '">' +
              '<div class="bed-number">' + escapeHtml(b.number || b.bed_number || '') + '</div>' +
              (b.patient_name ? '<div class="bed-patient">' + escapeHtml(b.patient_name) + '</div>' : '<div class="bed-patient">Available</div>') +
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
    items = DEMO_ACCESS_REQUESTS;
    if (status) items = items.filter(a => a.status === status);
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
    _notifsCache = DEMO_NOTIFICATIONS;
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
      return '<div class="notif-item' + unread + '" onclick="markNotificationRead(' + n.id + ')">' +
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
   14. LOGOUT
══════════════════════════════════════════ */
async function recLogout() {
  clearInterval(_notifPollInterval);
  clearInterval(_dashRefreshInterval);
  try {
    if (typeof apiPost === 'function' && typeof hc_getRefreshToken === 'function') {
      await apiPost(HC_CONFIG.ENDPOINTS.LOGOUT, { refresh: hc_getRefreshToken() });
    }
  } catch {}
  try { if (typeof hc_clearTokens === 'function') hc_clearTokens(); } catch {}

  // Redirect to org signin — try to get slug from user data
  let slug = '';
  try {
    const user = hc_getUser();
    slug = user?.organization_slug || '';
  } catch {}

  if (slug) {
    window.location.href = '/public/organization/signin.html?org=' + slug;
  } else {
    window.location.href = '/public/signin.html';
  }
}
