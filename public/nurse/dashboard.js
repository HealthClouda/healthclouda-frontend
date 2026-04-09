/* ═══════════════════════════════════════════════════════════
   HealthClouda — Nurse Dashboard
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

  if (token && user && typeof hc_redirectByRole === 'function') {
    const role = (user.role || '').toLowerCase().replace(/_/g, '');
    if (role && role !== 'nurse' && role !== 'superadmin') {
      hc_redirectByRole(user.role);
      return;
    }
  }

  const name = (user && (user.full_name || [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email)) || 'Nurse';
  const el = (id) => document.getElementById(id);
  if (el('sidebarUserName'))  el('sidebarUserName').textContent  = name;
  if (el('sidebarUserRole'))  el('sidebarUserRole').textContent  = 'Nurse';
  if (el('sidebarAvatar'))    el('sidebarAvatar').textContent    = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  if (el('headerUserName'))   el('headerUserName').textContent   = name;

  // Set welcome message
  if (el('dashWelcome')) el('dashWelcome').textContent = 'Welcome, ' + name.split(' ')[0];

  // Load initial duty status
  loadDutyStatus();
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

const _loaded = new Set();

function loadPage(page) {
  if (_loaded.has(page)) return;
  _loaded.add(page);
  switch (page) {
    case 'dashboard':     loadDashboard();     break;
    case 'patients':      loadMyPatients();    break;
    case 'wards':         loadWardManagement(); break;
    case 'admissions':    loadAdmissions();    break;
    case 'notifications': loadNotifications(); break;
  }
}

// Load dashboard on start
loadPage('dashboard');

// Sidebar toggle
function toggleSidebar() {
  const sidebar   = document.getElementById('sidebar');
  const overlay   = document.getElementById('mobileOverlay');
  const hamburger = document.getElementById('hamburgerBtn');
  const isOpen    = sidebar?.classList.contains('open');
  if (isOpen) { closeSidebar(); }
  else {
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

function goToNotifications() {
  document.querySelector('.nav-item[data-page="notifications"]')?.click();
}


/* ══════════════════════════════════════════
   3. HELPERS
══════════════════════════════════════════ */

// ── Safe API wrappers ──
async function safeApiGet(url) { return apiGet(url); }
async function safeApiPost(url, body) { return apiPost(url, body); }
async function safeApiPatch(url, body) { return apiPatch(url, body); }

// ── HTML escape ──
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ── Date/time formatting ──
function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
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
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
  return formatDate(iso);
}

// ── Status badge ──
function statusBadge(status) {
  const s = (status || '').toUpperCase();
  const map = {
    ACTIVE:      'badge-success',
    AVAILABLE:   'badge-success',
    OCCUPIED:    'badge-danger',
    DISCHARGED:  'badge-neutral',
    TRANSFERRED: 'badge-info',
    MAINTENANCE: 'badge-warning',
    RESERVED:    'badge-info',
    WAITING:     'badge-warning',
    PENDING:     'badge-warning',
  };
  const cls = map[s] || 'badge-neutral';
  return '<span class="badge ' + cls + '">' + escapeHtml(status) + '</span>';
}

// ── Toast ──
function showToast(msg, type) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast' + (type ? ' ' + type : '');
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => t.classList.remove('show'), 3200);
}

// ── Shimmer ──
function shimmerBlock() {
  return '<div class="shimmer-line" style="width:60%;margin-bottom:8px"></div><div class="shimmer-line" style="width:40%"></div>';
}
function shimmerRows(n) {
  let html = '';
  for (let i = 0; i < n; i++) {
    html += '<tr><td colspan="8" style="padding:1rem">' + shimmerBlock() + '</td></tr>';
  }
  return html;
}

// ── Button loading ──
function setButtonLoading(btn, loading, label) {
  if (!btn) return;
  if (loading) { btn.disabled = true; btn.dataset.origText = btn.textContent; btn.textContent = 'Loading…'; }
  else { btn.disabled = false; btn.textContent = label || btn.dataset.origText || 'Submit'; }
}

// ── Debounce ──
function debounce(fn, ms) {
  let timer;
  return function(...args) { clearTimeout(timer); timer = setTimeout(() => fn.apply(this, args), ms); };
}

// ── Panel / Modal ──
function openPanel(id) {
  document.getElementById('overlay')?.classList.add('open');
  document.getElementById(id)?.classList.add('open');
}
function closeAllPanels() {
  document.getElementById('overlay')?.classList.remove('open');
  document.querySelectorAll('.slide-panel').forEach(p => p.classList.remove('open'));
}
function openModal(id) {
  document.getElementById(id)?.classList.add('open');
}
function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}

// ── Nurse-specific helpers ──
function losClass(days) {
  if (days >= 7) return 'los-danger';
  if (days >= 4) return 'los-warning';
  return '';
}

function isAbnormalVital(field, value) {
  if (value === null || value === undefined || value === '') return false;
  const v = parseFloat(value);
  if (isNaN(v)) return false;
  const ranges = {
    blood_pressure_systolic:  [90, 180],
    blood_pressure_diastolic: [60, 120],
    temperature:              [35, 38.5],
    pulse_rate:               [60, 100],
    respiratory_rate:         [12, 20],
    oxygen_saturation:        [95, Infinity],
  };
  const r = ranges[field];
  if (!r) return false;
  return v < r[0] || v > r[1];
}

function bedStatusClass(status) {
  const map = {
    available:   'bed-available',
    occupied:    'bed-occupied',
    maintenance: 'bed-maintenance',
    reserved:    'bed-reserved',
  };
  return map[(status || '').toLowerCase()] || '';
}


/* ══════════════════════════════════════════
   4. DEMO DATA
══════════════════════════════════════════ */
const DEMO_NURSE_STATS = {
  total_wards: 5, total_beds: 120, available_beds: 45,
  occupied_beds: 70, maintenance_beds: 3, reserved_beds: 2,
  occupancy_rate: 58.3, active_admissions: 70,
  todays_admissions: 3, todays_discharges: 2, patients_in_queue: 8,
};

const DEMO_WARD_OVERVIEW = [
  { id: 'w1', name: 'Medical Ward', category: 'MEDICAL', gender: 'BOTH', total_beds: 30, available_beds: 12, occupied_beds: 15, maintenance_beds: 2, reserved_beds: 1, occupancy_rate: 50.0, active_admissions: 15 },
  { id: 'w2', name: 'Surgical Ward', category: 'SURGICAL', gender: 'BOTH', total_beds: 20, available_beds: 5, occupied_beds: 13, maintenance_beds: 1, reserved_beds: 1, occupancy_rate: 65.0, active_admissions: 13 },
  { id: 'w3', name: 'ICU', category: 'ICU', gender: 'BOTH', total_beds: 10, available_beds: 2, occupied_beds: 8, maintenance_beds: 0, reserved_beds: 0, occupancy_rate: 80.0, active_admissions: 8 },
];

const DEMO_MY_PATIENTS = [
  { id: 'a1', patient: { id: 'p1', healthclouda_id: 'HCL-ABC123', first_name: 'Adaeze', last_name: 'Okonkwo', gender: 'F', blood_type: 'O+', age: 37, allergies: 'Penicillin', emergency_contact_name: 'Chidi Okonkwo', emergency_contact_phone: '+2348012345678' }, bed: { id: 'b1', bed_number: 'B-001', status: 'OCCUPIED' }, ward: { id: 'w1', name: 'Medical Ward', category: 'MEDICAL', gender: 'BOTH' }, episode: { id: 'e1', episode_type: 'INPATIENT', status: 'ACTIVE', chief_complaint: 'Chest pain' }, admitted_at: '2026-03-01T08:00:00Z', admission_reason: 'Acute chest pain investigation', length_of_stay: 3 },
  { id: 'a2', patient: { id: 'p2', healthclouda_id: 'HCL-DEF456', first_name: 'Emeka', last_name: 'Nwosu', gender: 'M', blood_type: 'A+', age: 55, allergies: 'None', emergency_contact_name: 'Ngozi Nwosu', emergency_contact_phone: '+2349087654321' }, bed: { id: 'b2', bed_number: 'B-005', status: 'OCCUPIED' }, ward: { id: 'w1', name: 'Medical Ward', category: 'MEDICAL', gender: 'BOTH' }, episode: { id: 'e2', episode_type: 'INPATIENT', status: 'ACTIVE', chief_complaint: 'Hypertension' }, admitted_at: '2026-02-25T10:00:00Z', admission_reason: 'Blood pressure management', length_of_stay: 7 },
];

const DEMO_VITALS = {
  patient_id: 'p1', episode_id: 'e1',
  vitals: { blood_pressure_systolic: 120, blood_pressure_diastolic: 80, temperature: 36.8, pulse_rate: 75, respiratory_rate: 16, oxygen_saturation: 98, weight: 70.5, height: 175, notes: 'Patient stable', recorded_by: 'nurse-uuid', recorded_at: '2026-03-03T22:02:19Z' },
};

const DEMO_WARDS = [
  { id: 'w1', name: 'Medical Ward', category: 'MEDICAL', gender: 'BOTH', total_beds: 30, available_beds: 12, occupied_beds: 15, occupancy_rate: 50.0, created_at: '2026-01-01T00:00:00Z' },
  { id: 'w2', name: 'Surgical Ward', category: 'SURGICAL', gender: 'BOTH', total_beds: 20, available_beds: 5, occupied_beds: 13, occupancy_rate: 65.0, created_at: '2026-01-01T00:00:00Z' },
];

const DEMO_BEDS = [
  { id: 'b1', bed_number: 'B-001', status: 'OCCUPIED', ward: { id: 'w1', name: 'Medical Ward' }, current_patient: { id: 'p1', first_name: 'Adaeze', last_name: 'Okonkwo' } },
  { id: 'b2', bed_number: 'B-002', status: 'AVAILABLE', ward: { id: 'w1', name: 'Medical Ward' }, current_patient: null },
  { id: 'b3', bed_number: 'B-003', status: 'MAINTENANCE', ward: { id: 'w1', name: 'Medical Ward' }, current_patient: null },
  { id: 'b4', bed_number: 'B-004', status: 'RESERVED', ward: { id: 'w1', name: 'Medical Ward' }, current_patient: null },
];

const DEMO_ADMISSIONS = [
  { id: 'a1', patient: { id: 'p1', first_name: 'Adaeze', last_name: 'Okonkwo' }, bed: { id: 'b1', bed_number: 'B-001' }, ward: { id: 'w1', name: 'Medical Ward' }, status: 'ACTIVE', admitted_at: '2026-03-01T08:00:00Z', admission_reason: 'Chest pain', length_of_stay: 3 },
];

const DEMO_NOTIFICATIONS = [
  { id: 'n1', notification_type: 'PATIENT_ASSIGNED', title: 'New Patient Assigned', message: 'Patient Adaeze Okonkwo has been assigned to your ward.', is_read: false, created_at: '2026-03-03T12:00:00Z' },
  { id: 'n2', notification_type: 'PATIENT_CHECKED_IN', title: 'Patient Checked In', message: 'Emeka Nwosu has been checked in at Medical Ward.', is_read: true, created_at: '2026-03-02T09:00:00Z' },
];


/* ══════════════════════════════════════════
   5. DASHBOARD PAGE
══════════════════════════════════════════ */
let _wardsCache = [];

async function loadDashboard() {
  // Load stats
  let stats;
  try { stats = await safeApiGet(HC_CONFIG.ENDPOINTS.NURSE_STATS); }
  catch { stats = DEMO_NURSE_STATS; }

  const el = (id) => document.getElementById(id);
  el('statTotalWards').textContent       = stats.total_wards ?? '—';
  el('statTotalBeds').textContent        = stats.total_beds ?? '—';
  el('statAvailableBeds').textContent    = stats.available_beds ?? '—';
  el('statOccupiedBeds').textContent     = stats.occupied_beds ?? '—';
  if (el('statOccupancyRate')) el('statOccupancyRate').textContent = (stats.occupancy_rate != null ? stats.occupancy_rate + '% occupancy' : '');
  el('statActiveAdmissions').textContent = stats.active_admissions ?? '—';
  el('statTodayAdmissions').textContent  = stats.todays_admissions ?? '—';
  el('statTodayDischarges').textContent  = stats.todays_discharges ?? '—';
  el('statPatientsQueue').textContent    = stats.patients_in_queue ?? '—';

  // Load ward overview
  loadWardOverview();
}

async function loadWardOverview() {
  const container = document.getElementById('wardOverviewContainer');
  if (!container) return;
  container.innerHTML = shimmerBlock();

  let wards;
  try {
    const data = await safeApiGet(HC_CONFIG.ENDPOINTS.NURSE_WARDS_OVERVIEW);
    wards = Array.isArray(data) ? data : (data.results || []);
  } catch { wards = DEMO_WARD_OVERVIEW; }

  _wardsCache = wards;
  populateWardFilter(wards);
  populateWardSelects(wards);

  if (wards.length === 0) {
    container.innerHTML = '<div class="empty-state"><h3>No wards found</h3><p>No ward data available.</p></div>';
    return;
  }

  container.innerHTML = '<div class="ward-cards">' + wards.map(w => {
    const pct = w.occupancy_rate ?? (w.total_beds > 0 ? Math.round((w.occupied_beds / w.total_beds) * 100) : 0);
    const fillColor = pct > 80 ? 'var(--danger)' : pct > 50 ? 'var(--warning)' : 'var(--success)';
    return '<div class="ward-card">' +
      '<div class="ward-header">' +
        '<span class="ward-name">' + escapeHtml(w.name) + ' <span class="badge badge-info">' + escapeHtml(w.category) + '</span></span>' +
        '<span class="ward-stats">' + (w.active_admissions || 0) + ' active admissions</span>' +
      '</div>' +
      '<div class="occupancy-bar"><div class="occupancy-fill" style="width:' + pct + '%;background:' + fillColor + '"></div></div>' +
      '<div class="bed-breakdown">' +
        '<span class="bed-stat available">' + (w.available_beds || 0) + ' Available</span>' +
        '<span class="bed-stat occupied">' + (w.occupied_beds || 0) + ' Occupied</span>' +
        '<span class="bed-stat maintenance">' + (w.maintenance_beds || 0) + ' Maintenance</span>' +
        '<span class="bed-stat reserved">' + (w.reserved_beds || 0) + ' Reserved</span>' +
      '</div>' +
    '</div>';
  }).join('') + '</div>';
}

// Auto-refresh dashboard every 30 seconds
let _dashRefreshInterval = setInterval(() => {
  if (document.getElementById('page-dashboard')?.classList.contains('active')) {
    _loaded.delete('dashboard');
    loadDashboard();
  }
}, 30000);


/* ══════════════════════════════════════════
   6. MY PATIENTS PAGE
══════════════════════════════════════════ */
function populateWardFilter(wards) {
  const select = document.getElementById('patientWardFilter');
  if (!select) return;
  const val = select.value;
  select.innerHTML = '<option value="">All Wards</option>' +
    wards.map(w => '<option value="' + w.id + '">' + escapeHtml(w.name) + '</option>').join('');
  select.value = val;
}

function populateWardSelects(wards) {
  // Populate all ward selects in panels/modals
  ['admissionWardFilter', 'bedWardSelect', 'admitWardSelect', 'transferWardSelect'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const val = sel.value;
    const first = sel.options[0]?.textContent || 'Select ward…';
    sel.innerHTML = '<option value="">' + first + '</option>' +
      wards.map(w => '<option value="' + w.id + '">' + escapeHtml(w.name) + '</option>').join('');
    sel.value = val;
  });
}

async function loadMyPatients() {
  const tbody = document.getElementById('patientTableBody');
  if (!tbody) return;
  tbody.innerHTML = shimmerRows(3);

  const wardId = document.getElementById('patientWardFilter')?.value || '';
  let url = HC_CONFIG.ENDPOINTS.NURSE_MY_PATIENTS;
  if (wardId) url += '?ward_id=' + wardId;

  let items;
  try {
    const data = await safeApiGet(url);
    items = Array.isArray(data) ? data : (data.results || []);
  } catch { items = DEMO_MY_PATIENTS; }

  document.getElementById('patientCount').textContent = items.length + ' patient' + (items.length !== 1 ? 's' : '');

  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No patients found.</td></tr>';
    return;
  }

  tbody.innerHTML = items.map(a => {
    const p = a.patient || {};
    const patientName = [p.first_name, p.last_name].filter(Boolean).join(' ');
    const los = a.length_of_stay ?? 0;
    const lc = losClass(los);
    return '<tr class="' + lc + '">' +
      '<td class="td-mono">' + escapeHtml(a.bed?.bed_number || '—') + '</td>' +
      '<td>' + escapeHtml(patientName) + '<div class="td-mono" style="font-size:0.7rem">' + escapeHtml(p.healthclouda_id || '') + '</div></td>' +
      '<td>' + (p.age ?? '—') + '</td>' +
      '<td>' + escapeHtml(p.blood_type || '—') + '</td>' +
      '<td>' + escapeHtml(p.allergies || 'None') + '</td>' +
      '<td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + escapeHtml(a.episode?.chief_complaint || a.admission_reason || '') + '">' + escapeHtml(a.episode?.chief_complaint || a.admission_reason || '—') + '</td>' +
      '<td class="' + (lc ? 'td-los-highlight' : '') + '">' + los + '</td>' +
      '<td><div class="row-actions">' +
        '<button class="row-btn success" onclick="openVitalsModal(\'' + p.id + '\',\'' + escapeHtml(patientName).replace(/'/g, '&#39;') + '\')">Vitals</button>' +
      '</div></td>' +
    '</tr>';
  }).join('');
}


/* ══════════════════════════════════════════
   7. VITALS
══════════════════════════════════════════ */
async function openVitalsModal(patientId, patientName) {
  document.getElementById('vitalsPatientId').value = patientId;
  document.getElementById('vitalsPatientName').textContent = patientName;
  document.getElementById('vitalsForm')?.reset();
  openModal('vitalsModal');

  const container = document.getElementById('currentVitalsDisplay');
  container.innerHTML = shimmerBlock();

  let data;
  try {
    data = await safeApiGet(HC_CONFIG.ENDPOINTS.NURSE_VITALS + patientId + '/vitals/');
  } catch { data = DEMO_VITALS; }

  const vitals = data.vitals || data;

  const fields = [
    { key: 'blood_pressure_systolic',  label: 'BP Systolic',  unit: 'mmHg' },
    { key: 'blood_pressure_diastolic', label: 'BP Diastolic', unit: 'mmHg' },
    { key: 'temperature',              label: 'Temp',         unit: '°C' },
    { key: 'pulse_rate',               label: 'Pulse',        unit: 'bpm' },
    { key: 'respiratory_rate',         label: 'Resp Rate',    unit: '/min' },
    { key: 'oxygen_saturation',        label: 'O₂ Sat',      unit: '%' },
    { key: 'weight',                   label: 'Weight',       unit: 'kg' },
    { key: 'height',                   label: 'Height',       unit: 'cm' },
  ];

  container.innerHTML = '<div class="vitals-summary">' +
    fields.map(f => {
      const val = vitals?.[f.key];
      const abnormal = isAbnormalVital(f.key, val);
      return '<div class="vital-chip' + (abnormal ? ' abnormal' : '') + '">' +
        '<span class="vital-chip-label">' + f.label + '</span>' +
        '<span class="vital-chip-value">' + (val != null ? val + ' ' + f.unit : '—') + '</span>' +
      '</div>';
    }).join('') +
  '</div>' +
  (vitals?.recorded_at ? '<div class="vital-updated">Last recorded: ' + formatDateTime(vitals.recorded_at) + '</div>' : '') +
  (vitals?.notes ? '<div class="vital-updated">Notes: ' + escapeHtml(vitals.notes) + '</div>' : '');
}

async function submitVitals(e) {
  e.preventDefault();
  const form = document.getElementById('vitalsForm');
  const btn  = document.getElementById('submitVitalsBtn');
  const patientId = document.getElementById('vitalsPatientId').value;

  const body = {};
  new FormData(form).forEach((v, k) => { if (v !== '') body[k] = v; });

  if (Object.keys(body).length === 0) {
    showToast('Please fill in at least one vital sign.', 'error');
    return;
  }

  // Client-side validation ranges
  const validations = {
    blood_pressure_systolic: [50, 300],
    blood_pressure_diastolic: [20, 200],
    temperature: [30, 45],
    pulse_rate: [20, 250],
    respiratory_rate: [5, 60],
    oxygen_saturation: [50, 100],
    weight: [0.5, 500],
    height: [20, 300],
  };
  for (const [field, [min, max]] of Object.entries(validations)) {
    if (body[field] !== undefined) {
      const v = parseFloat(body[field]);
      if (isNaN(v) || v < min || v > max) {
        showToast(field.replace(/_/g, ' ') + ' must be between ' + min + ' and ' + max, 'error');
        return;
      }
    }
  }

  setButtonLoading(btn, true);
  try {
    await safeApiPatch(HC_CONFIG.ENDPOINTS.NURSE_VITALS + patientId + '/vitals/', body);
    showToast('Vitals recorded successfully!', 'success');
    closeModal('vitalsModal');
    _loaded.delete('patients');
    _loaded.delete('dashboard');
  } catch (err) {
    showToast(hc_formatApiError(err.data, 'Failed to record vitals.'), 'error');
  }
  setButtonLoading(btn, false, 'Save Vitals');
}


/* ══════════════════════════════════════════
   8. WARD & BED MANAGEMENT
══════════════════════════════════════════ */
async function loadWardManagement() {
  const container = document.getElementById('wardListContainer');
  if (!container) return;
  container.innerHTML = shimmerBlock();

  let wards;
  try {
    const data = await safeApiGet(HC_CONFIG.ENDPOINTS.WARDS);
    wards = Array.isArray(data) ? data : (data.results || []);
  } catch { wards = DEMO_WARDS; }

  if (wards.length === 0) {
    container.innerHTML = '<div class="empty-state"><h3>No wards</h3><p>Create a ward to get started.</p></div>';
    return;
  }

  container.innerHTML = '<div class="ward-cards">' + wards.map(w => {
    return '<div class="ward-card" id="ward-' + w.id + '">' +
      '<div class="ward-header" style="cursor:pointer" onclick="toggleWardBeds(\'' + escapeHtml(w.id) + '\')">' +
        '<div>' +
          '<span class="ward-name">' + escapeHtml(w.name) + '</span> ' +
          '<span class="badge badge-info">' + escapeHtml(w.category || '') + '</span> ' +
          (w.gender && w.gender !== 'BOTH' ? '<span class="badge badge-neutral">' + escapeHtml(w.gender) + '</span>' : '') +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:0.5rem">' +
          '<span class="ward-stats">' + (w.total_beds || 0) + ' beds · ' + (w.available_beds || 0) + ' available</span>' +
          '<span class="ward-expand-icon" id="expandIcon-' + w.id + '">&#9660;</span>' +
        '</div>' +
      '</div>' +
      '<div class="ward-beds-container" id="wardBeds-' + w.id + '" style="display:none"></div>' +
    '</div>';
  }).join('') + '</div>';
}

async function toggleWardBeds(wardId) {
  const container = document.getElementById('wardBeds-' + wardId);
  const icon = document.getElementById('expandIcon-' + wardId);
  if (!container) return;

  if (container.style.display === 'none') {
    container.style.display = 'block';
    icon?.classList.add('expanded');
    container.innerHTML = shimmerBlock();

    let beds;
    try {
      const data = await safeApiGet(HC_CONFIG.ENDPOINTS.WARD_BEDS + '?ward_id=' + wardId);
      beds = Array.isArray(data) ? data : (data.results || []);
    } catch { beds = DEMO_BEDS; }

    if (beds.length === 0) {
      container.innerHTML = '<div class="empty-state">No beds in this ward.</div>';
      return;
    }

    container.innerHTML = '<div class="bed-grid">' + beds.map(b => {
      const cls = bedStatusClass(b.status);
      const patientName = b.current_patient ? [b.current_patient.first_name, b.current_patient.last_name].filter(Boolean).join(' ') : '';
      const label = patientName || escapeHtml(b.status || 'Available');
      return '<div class="bed-cell ' + cls + '" title="' + escapeHtml(b.bed_number) + ': ' + label + '">' +
        '<div class="bed-number">' + escapeHtml(b.bed_number || '') + '</div>' +
        '<div class="bed-patient">' + escapeHtml(label) + '</div>' +
      '</div>';
    }).join('') + '</div>';
  } else {
    container.style.display = 'none';
    icon?.classList.remove('expanded');
  }
}

// ── Add Ward ──
function openAddWardPanel() { openPanel('addWardPanel'); }

async function submitAddWard(e) {
  e.preventDefault();
  const form = document.getElementById('addWardForm');
  const btn  = document.getElementById('addWardBtn');
  const body = {};
  new FormData(form).forEach((v, k) => { if (v) body[k] = v; });

  setButtonLoading(btn, true);
  try {
    await safeApiPost(HC_CONFIG.ENDPOINTS.WARDS, body);
    showToast('Ward created successfully!', 'success');
    form.reset();
    closeAllPanels();
    _loaded.delete('wards');
    loadWardManagement();
    // Refresh ward overview on dashboard too
    _loaded.delete('dashboard');
  } catch (err) {
    showToast(hc_formatApiError(err.data, 'Failed to create ward.'), 'error');
  }
  setButtonLoading(btn, false, 'Create Ward');
}

// ── Add Bed ──
function openAddBedPanel() {
  populateWardSelects(_wardsCache);
  openPanel('addBedPanel');
}

async function submitAddBed(e) {
  e.preventDefault();
  const form = document.getElementById('addBedForm');
  const btn  = document.getElementById('addBedBtn');
  const body = {};
  new FormData(form).forEach((v, k) => { if (v) body[k] = v; });

  setButtonLoading(btn, true);
  try {
    await safeApiPost(HC_CONFIG.ENDPOINTS.WARD_BEDS, body);
    showToast('Bed created successfully!', 'success');
    form.reset();
    closeAllPanels();
    _loaded.delete('wards');
    loadWardManagement();
    _loaded.delete('dashboard');
  } catch (err) {
    const isDuplicate = err.status === 400 &&
      JSON.stringify(err.data || '').toLowerCase().includes('bed_number');
    const fallback = isDuplicate
      ? 'A bed with this number already exists in the selected ward.'
      : 'Failed to create bed.';
    showToast(hc_formatApiError(err.data, fallback), 'error');
  }
  setButtonLoading(btn, false, 'Create Bed');
}


/* ══════════════════════════════════════════
   9. ADMISSIONS PAGE
══════════════════════════════════════════ */
let _currentAdmissionTab = 'ACTIVE';

function switchAdmissionTab(tab) {
  _currentAdmissionTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  _loaded.delete('admissions');
  loadAdmissions();
}

async function loadAdmissions() {
  const tbody = document.getElementById('admissionTableBody');
  if (!tbody) return;
  tbody.innerHTML = shimmerRows(3);

  let url = HC_CONFIG.ENDPOINTS.ADMISSIONS + '?status=' + _currentAdmissionTab;
  const wardId = document.getElementById('admissionWardFilter')?.value;
  if (wardId) url += '&ward_id=' + wardId;

  let items;
  try {
    const data = await safeApiGet(url);
    items = Array.isArray(data) ? data : (data.results || []);
  } catch { items = DEMO_ADMISSIONS.filter(a => a.status === _currentAdmissionTab); }

  document.getElementById('admissionCount').textContent = items.length + ' admission' + (items.length !== 1 ? 's' : '');

  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No ' + _currentAdmissionTab.toLowerCase() + ' admissions.</td></tr>';
    return;
  }

  tbody.innerHTML = items.map(a => {
    const p = a.patient || {};
    const patientName = [p.first_name, p.last_name].filter(Boolean).join(' ');
    const wardName = a.ward?.name || a.bed?.ward?.name || '—';
    const bedNum = a.bed?.bed_number || '—';
    const los = a.length_of_stay ?? '—';
    let actions = '';
    if (_currentAdmissionTab === 'ACTIVE') {
      actions =
        '<button class="row-btn success" onclick="openVitalsModal(\'' + p.id + '\',\'' + escapeHtml(patientName).replace(/'/g, '&#39;') + '\')">Vitals</button>' +
        '<button class="row-btn warn" onclick="openDischargeModal(\'' + a.id + '\',\'' + escapeHtml(patientName).replace(/'/g, '&#39;') + '\')">Discharge</button>' +
        '<button class="row-btn" onclick="openTransferModal(\'' + a.id + '\',\'' + escapeHtml(patientName).replace(/'/g, '&#39;') + '\')">Transfer</button>';
    }

    return '<tr>' +
      '<td>' + escapeHtml(patientName) + '</td>' +
      '<td>' + escapeHtml(wardName) + ' / ' + escapeHtml(bedNum) + '</td>' +
      '<td class="td-date">' + formatDate(a.admitted_at) + '</td>' +
      '<td>' + los + '</td>' +
      '<td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escapeHtml(a.admission_reason || '—') + '</td>' +
      '<td>' + statusBadge(a.status) + '</td>' +
      '<td><div class="row-actions">' + actions + '</div></td>' +
    '</tr>';
  }).join('');
}

// ── Admit Patient ──
function openAdmitPanel() {
  populateWardSelects(_wardsCache);
  document.getElementById('admitBedSelect').innerHTML = '<option value="">Select ward first…</option>';
  document.getElementById('admitPatientForm')?.reset();
  openPanel('admitPanel');
}

async function loadAvailableBeds() {
  const wardId = document.getElementById('admitWardSelect')?.value;
  const bedSelect = document.getElementById('admitBedSelect');
  if (!bedSelect) return;

  if (!wardId) {
    bedSelect.innerHTML = '<option value="">Select ward first…</option>';
    return;
  }

  bedSelect.innerHTML = '<option value="">Loading beds…</option>';
  try {
    const data = await safeApiGet(HC_CONFIG.ENDPOINTS.WARD_BEDS + '?ward_id=' + wardId + '&status=AVAILABLE');
    const beds = Array.isArray(data) ? data : (data.results || []);
    bedSelect.innerHTML = '<option value="">Select bed…</option>' +
      beds.map(b => '<option value="' + b.id + '">' + escapeHtml(b.bed_number) + '</option>').join('');
  } catch {
    bedSelect.innerHTML = '<option value="">Failed to load beds</option>';
  }
}

async function submitAdmitPatient(e) {
  e.preventDefault();
  const form = document.getElementById('admitPatientForm');
  const btn  = document.getElementById('admitPatientBtn');
  const body = {};
  new FormData(form).forEach((v, k) => { if (v) body[k] = v; });

  setButtonLoading(btn, true);
  try {
    await safeApiPost(HC_CONFIG.ENDPOINTS.ADMISSIONS, body);
    showToast('Patient admitted successfully!', 'success');
    form.reset();
    closeAllPanels();
    _loaded.delete('admissions');
    loadAdmissions();
    _loaded.delete('dashboard');
  } catch (err) {
    showToast(hc_formatApiError(err.data, 'Failed to admit patient.'), 'error');
  }
  setButtonLoading(btn, false, 'Admit Patient');
}

// ── Discharge ──
function openDischargeModal(admissionId, patientName) {
  document.getElementById('dischargeAdmissionId').value = admissionId;
  document.getElementById('dischargePatientName').textContent = patientName;
  document.getElementById('dischargeSummary').value = '';
  document.getElementById('dischargeInstructions').value = '';
  openModal('dischargeModal');
}

async function submitDischarge() {
  const admissionId = document.getElementById('dischargeAdmissionId').value;
  const btn = document.getElementById('submitDischargeBtn');
  const body = {
    discharge_summary:      document.getElementById('dischargeSummary').value.trim(),
    discharge_instructions: document.getElementById('dischargeInstructions').value.trim(),
  };

  setButtonLoading(btn, true);
  try {
    await safeApiPost(HC_CONFIG.ENDPOINTS.ADMISSIONS + admissionId + '/discharge/', body);
    showToast('Patient discharged successfully!', 'success');
    closeModal('dischargeModal');
    _loaded.delete('admissions');
    loadAdmissions();
    _loaded.delete('dashboard');
  } catch (err) {
    showToast(err.message || 'Discharge failed.', 'error');
  }
  setButtonLoading(btn, false, 'Discharge Patient');
}

// ── Transfer ──
function openTransferModal(admissionId, patientName) {
  document.getElementById('transferAdmissionId').value = admissionId;
  document.getElementById('transferPatientName').textContent = patientName;
  populateWardSelects(_wardsCache);
  document.getElementById('transferBedSelect').innerHTML = '<option value="">Select ward first…</option>';
  openModal('transferModal');
}

async function loadTransferBeds() {
  const wardId = document.getElementById('transferWardSelect')?.value;
  const bedSelect = document.getElementById('transferBedSelect');
  if (!bedSelect) return;

  if (!wardId) {
    bedSelect.innerHTML = '<option value="">Select ward first…</option>';
    return;
  }

  bedSelect.innerHTML = '<option value="">Loading beds…</option>';
  try {
    const data = await safeApiGet(HC_CONFIG.ENDPOINTS.WARD_BEDS + '?ward_id=' + wardId + '&status=AVAILABLE');
    const beds = Array.isArray(data) ? data : (data.results || []);
    bedSelect.innerHTML = '<option value="">Select bed…</option>' +
      beds.map(b => '<option value="' + b.id + '">' + escapeHtml(b.bed_number) + '</option>').join('');
  } catch {
    bedSelect.innerHTML = '<option value="">Failed to load beds</option>';
  }
}

async function submitTransfer() {
  const admissionId = document.getElementById('transferAdmissionId').value;
  const newBed = document.getElementById('transferBedSelect').value;
  const btn = document.getElementById('submitTransferBtn');

  if (!newBed) {
    showToast('Please select a bed.', 'error');
    return;
  }

  setButtonLoading(btn, true);
  try {
    await safeApiPost(HC_CONFIG.ENDPOINTS.ADMISSIONS + admissionId + '/transfer/', { new_bed: newBed });
    showToast('Patient transferred successfully!', 'success');
    closeModal('transferModal');
    _loaded.delete('admissions');
    loadAdmissions();
    _loaded.delete('dashboard');
  } catch (err) {
    showToast(err.message || 'Transfer failed.', 'error');
  }
  setButtonLoading(btn, false, 'Transfer');
}


/* ══════════════════════════════════════════
   10. NOTIFICATIONS
══════════════════════════════════════════ */
let _notifsCache = [];

async function loadNotifications() {
  const container = document.getElementById('notificationsContainer');
  if (!container) return;

  container.innerHTML = '<div class="notif-list-page">' +
    Array(3).fill('<div class="notif-item" style="pointer-events:none"><div style="flex:1">' + shimmerBlock() + '</div></div>').join('') +
  '</div>';

  try {
    const data = await safeApiGet(HC_CONFIG.ENDPOINTS.STAFF_NOTIFS);
    _notifsCache = Array.isArray(data) ? data : (data.results || []);
  } catch { _notifsCache = DEMO_NOTIFICATIONS; }

  renderNotifications();
}

function renderNotifications() {
  const container = document.getElementById('notificationsContainer');
  if (!container) return;

  if (_notifsCache.length === 0) {
    container.innerHTML = '<div class="empty-state"><h3>No notifications</h3><p>You\'re all caught up!</p></div>';
    return;
  }

  container.innerHTML = '<div class="notif-list-page">' +
    _notifsCache.map(n => {
      const typeClass = (n.notification_type || '').toLowerCase().replace(/_/g, '-');
      const icon = notifIcon(n.notification_type);
      const unread = !n.is_read ? ' unread' : '';
      return '<div class="notif-item' + unread + '" onclick="markNotificationRead(\'' + escapeHtml(n.id) + '\')">' +
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
    case 'REFERRAL_ALERT':      return '&#x1F6A8;';
    case 'PATIENT_ASSIGNED':    return '&#x1F464;';
    case 'PATIENT_CHECKED_IN':  return '&#x2705;';
    case 'APPOINTMENT_BOOKED':  return '&#x1F4C5;';
    default:                    return '&#x1F514;';
  }
}

async function markNotificationRead(id) {
  const notif = _notifsCache.find(n => String(n.id) === String(id));
  if (!notif || notif.is_read) return;

  notif.is_read = true;
  renderNotifications();

  try {
    await safeApiPatch(HC_CONFIG.ENDPOINTS.STAFF_NOTIFS + id + '/read/');
  } catch { /* silent */ }

  refreshUnreadCount();
}

async function markAllNotificationsRead() {
  _notifsCache.forEach(n => n.is_read = true);
  renderNotifications();

  try {
    // Mark each one individually since there's no bulk endpoint
    for (const n of _notifsCache) {
      await safeApiPatch(HC_CONFIG.ENDPOINTS.STAFF_NOTIFS + n.id + '/read/').catch(() => {});
    }
  } catch { /* silent */ }

  refreshUnreadCount();
  showToast('All notifications marked as read.', 'success');
}

// ── Notification badge ──
function updateNotifBadge(count) {
  const headerBadge  = document.getElementById('headerNotifBadge');
  const sidebarBadge = document.getElementById('sidebarNotifBadge');

  [headerBadge, sidebarBadge].forEach(badge => {
    if (!badge) return;
    badge.textContent = count > 99 ? '99+' : count;
    badge.classList.toggle('hidden', count === 0);
  });
}

async function refreshUnreadCount() {
  try {
    const data = await safeApiGet(HC_CONFIG.ENDPOINTS.STAFF_UNREAD);
    updateNotifBadge(data.unread_count || data.count || 0);
  } catch { /* silent */ }
}

// Poll every 30 seconds
let _notifPollInterval = setInterval(refreshUnreadCount, 30000);
refreshUnreadCount();


/* ══════════════════════════════════════════
   11. DUTY STATUS TOGGLE
══════════════════════════════════════════ */
async function loadDutyStatus() {
  try {
    const data = await safeApiGet(HC_CONFIG.ENDPOINTS.ME);
    if (data) updateDutyUI(data.is_on_duty);
  } catch { /* silent */ }
}

function updateDutyUI(onDuty) {
  const btn = document.getElementById('dutyToggleBtn');
  const label = document.getElementById('dutyToggleLabel');
  const statusEl = document.getElementById('headerDutyStatus');

  if (btn) btn.classList.toggle('on-duty', !!onDuty);
  if (label) label.textContent = onDuty ? 'On Duty' : 'Off Duty';
  if (statusEl) {
    statusEl.textContent = onDuty ? 'On Duty' : 'Off Duty';
    statusEl.className = 'duty-badge ' + (onDuty ? 'on' : 'off');
  }
}

async function toggleDutyStatus() {
  try {
    const data = await safeApiPost(HC_CONFIG.ENDPOINTS.TOGGLE_DUTY);
    updateDutyUI(data.is_on_duty);
    showToast(data.message || ('Duty status: ' + (data.is_on_duty ? 'On Duty' : 'Off Duty')), 'success');
  } catch (err) {
    showToast('Failed to toggle duty status.', 'error');
  }
}


/* ══════════════════════════════════════════
   12. LOGOUT
══════════════════════════════════════════ */
async function nurseLogout() {
  clearInterval(_notifPollInterval);
  clearInterval(_dashRefreshInterval);

  let slug = '';
  try { slug = hc_getUser()?.organization_slug || ''; } catch {}

  try { await apiPost(HC_CONFIG.ENDPOINTS.LOGOUT, { refresh: hc_getRefreshToken() }); } catch {}
  try { hc_clearTokens(); } catch {}

  window.location.href = HC_ROUTER.signinPath({ organization_slug: slug });
}
