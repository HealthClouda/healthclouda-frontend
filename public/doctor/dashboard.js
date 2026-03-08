/* ═══════════════════════════════════════════════════════════
   HealthClouda — Doctor Dashboard
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
    if (role && role !== 'doctor' && role !== 'superadmin') {
      hc_redirectByRole(user.role);
      return;
    }
  }

  const name = (user && (user.full_name || [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email)) || 'Doctor';
  const el = (id) => document.getElementById(id);
  if (el('sidebarUserName'))  el('sidebarUserName').textContent  = name;
  if (el('sidebarUserRole'))  el('sidebarUserRole').textContent  = 'Doctor';
  if (el('sidebarAvatar'))    el('sidebarAvatar').textContent    = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  if (el('headerUserName'))   el('headerUserName').textContent   = name;
  if (el('dashWelcome'))      el('dashWelcome').textContent      = 'Welcome, Dr. ' + name.split(' ')[0];

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
    case 'dashboard':      loadDashboard();      break;
    case 'patients':       loadMyPatients();      break;
    case 'episodes':       loadEpisodes();        break;
    case 'prescriptions':  loadPrescriptions();   break;
    case 'referrals':      loadReferrals();       break;
    case 'appointments':   loadAppointments();    break;
    case 'notifications':  loadNotifications();   break;
  }
}

loadPage('dashboard');

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
async function safeApiGet(url) { return apiGet(url); }
async function safeApiPost(url, body) { return apiPost(url, body); }
async function safeApiPatch(url, body) { return apiPatch(url, body); }

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

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

function statusBadge(status) {
  const s = (status || '').toUpperCase();
  const map = {
    ACTIVE:      'badge-success',
    COMPLETED:   'badge-neutral',
    AVAILABLE:   'badge-success',
    OCCUPIED:    'badge-danger',
    DISCHARGED:  'badge-neutral',
    TRANSFERRED: 'badge-info',
    SCHEDULED:   'badge-info',
    CANCELLED:   'badge-warning',
    NO_SHOW:     'badge-danger',
    PENDING:     'badge-warning',
    ACCEPTED:    'badge-success',
    DECLINED:    'badge-danger',
  };
  const cls = map[s] || 'badge-neutral';
  return '<span class="badge ' + cls + '">' + escapeHtml(status) + '</span>';
}

function urgencyBadge(urgency) {
  const u = (urgency || '').toUpperCase();
  const cls = 'urgency-' + u.toLowerCase();
  return '<span class="badge ' + cls + '">' + escapeHtml(urgency) + '</span>';
}

function showToast(msg, type) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast' + (type ? ' ' + type : '');
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => t.classList.remove('show'), 3200);
}

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

function setButtonLoading(btn, loading, label) {
  if (!btn) return;
  if (loading) { btn.disabled = true; btn.dataset.origText = btn.textContent; btn.textContent = 'Loading\u2026'; }
  else { btn.disabled = false; btn.textContent = label || btn.dataset.origText || 'Submit'; }
}

function debounce(fn, ms) {
  let timer;
  return function(...args) { clearTimeout(timer); timer = setTimeout(() => fn.apply(this, args), ms); };
}

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

function parseApiError(err, fallback) {
  let msg = fallback || 'An error occurred.';
  if (err.data) {
    const msgs = [];
    for (const [f, errs] of Object.entries(err.data)) {
      msgs.push(f.replace(/_/g, ' ') + ': ' + (Array.isArray(errs) ? errs[0] : errs));
    }
    if (msgs.length) msg = msgs.join(' | ');
  } else if (err.message) { msg = err.message; }
  return msg;
}


/* ══════════════════════════════════════════
   4. DEMO DATA
══════════════════════════════════════════ */
const DEMO_DOC_STATS = {
  todays_appointments: 5, active_episodes: 12,
  patients_in_queue: 3, pending_referrals: 2,
  admissions_under_care: 8, completed_episodes_this_week: 15,
};

const DEMO_MY_PATIENTS = [
  { id: 'mp1', patient: { id: 'p1', healthclouda_id: 'HCL-ABC123', first_name: 'Adaeze', last_name: 'Okonkwo', gender: 'F', blood_type: 'O+', age: 37, allergies: 'Penicillin' }, episode: { id: 'e1', episode_type: 'INPATIENT', status: 'ACTIVE', chief_complaint: 'Chest pain', started_at: '2026-03-01T08:00:00Z' }, admission: { id: 'a1', ward: { id: 'w1', name: 'Medical Ward' }, bed: { id: 'b1', bed_number: 'B-001' }, admitted_at: '2026-03-01T08:00:00Z' }, latest_vitals: { blood_pressure_systolic: 120, blood_pressure_diastolic: 80, temperature: 36.8, pulse_rate: 75, recorded_at: '2026-03-03T22:02:19Z' } },
  { id: 'mp2', patient: { id: 'p2', healthclouda_id: 'HCL-DEF456', first_name: 'Emeka', last_name: 'Nwosu', gender: 'M', blood_type: 'A+', age: 55, allergies: 'None' }, episode: { id: 'e2', episode_type: 'OUTPATIENT', status: 'ACTIVE', chief_complaint: 'Hypertension follow-up', started_at: '2026-03-02T10:00:00Z' }, admission: null, latest_vitals: { blood_pressure_systolic: 155, blood_pressure_diastolic: 95, temperature: 37.1, pulse_rate: 88, recorded_at: '2026-03-03T14:30:00Z' } },
  { id: 'mp3', patient: { id: 'p3', healthclouda_id: 'HCL-GHI789', first_name: 'Fatima', last_name: 'Bello', gender: 'F', blood_type: 'B+', age: 28, allergies: 'Sulfa drugs' }, episode: { id: 'e3', episode_type: 'EMERGENCY', status: 'ACTIVE', chief_complaint: 'Acute abdominal pain', started_at: '2026-03-03T16:00:00Z' }, admission: { id: 'a3', ward: { id: 'w3', name: 'Emergency Ward' }, bed: { id: 'b5', bed_number: 'E-002' }, admitted_at: '2026-03-03T16:30:00Z' }, latest_vitals: { blood_pressure_systolic: 110, blood_pressure_diastolic: 70, temperature: 38.6, pulse_rate: 105, recorded_at: '2026-03-03T20:15:00Z' } },
];

const DEMO_EPISODES = [
  { id: 'e1', patient: { id: 'p1', first_name: 'Adaeze', last_name: 'Okonkwo', age: 37 }, episode_type: 'INPATIENT', status: 'ACTIVE', chief_complaint: 'Chest pain', diagnosis: '', started_at: '2026-03-01T08:00:00Z', completed_at: null },
  { id: 'e2', patient: { id: 'p2', first_name: 'Emeka', last_name: 'Nwosu', age: 55 }, episode_type: 'OUTPATIENT', status: 'ACTIVE', chief_complaint: 'Hypertension follow-up', diagnosis: '', started_at: '2026-03-02T10:00:00Z', completed_at: null },
  { id: 'e4', patient: { id: 'p4', first_name: 'Chioma', last_name: 'Eze', age: 42 }, episode_type: 'OUTPATIENT', status: 'COMPLETED', chief_complaint: 'Routine check-up', diagnosis: 'Healthy, no issues', started_at: '2026-02-20T09:00:00Z', completed_at: '2026-02-20T10:00:00Z' },
];

const DEMO_EPISODE_DETAIL = {
  id: 'e1',
  patient: { id: 'p1', first_name: 'Adaeze', last_name: 'Okonkwo', age: 37, gender: 'F', blood_type: 'O+', allergies: 'Penicillin' },
  episode_type: 'INPATIENT', status: 'ACTIVE', chief_complaint: 'Chest pain',
  diagnosis: '', started_at: '2026-03-01T08:00:00Z', completed_at: null,
  admission: { ward: { name: 'Medical Ward' }, bed: { bed_number: 'B-001' } },
  notes: [
    { id: 'n1', content: 'Patient presents with acute chest pain radiating to the left arm. ECG ordered.', note_type: 'EXAMINATION', created_by: 'Dr. Adekunle', created_at: '2026-03-01T08:30:00Z' },
    { id: 'n2', content: 'ECG results normal. Blood work shows slightly elevated troponin. Will monitor.', note_type: 'FOLLOW_UP', created_by: 'Dr. Adekunle', created_at: '2026-03-02T09:00:00Z' },
  ],
  prescriptions: [
    { id: 'rx1', medication: 'Aspirin', dosage: '75mg', frequency: 'Once daily', duration: '30 days', status: 'ACTIVE', instructions: 'Take with food' },
    { id: 'rx2', medication: 'Atorvastatin', dosage: '20mg', frequency: 'Once daily at night', duration: '30 days', status: 'ACTIVE', instructions: '' },
  ],
  vitals_history: [
    { blood_pressure_systolic: 140, blood_pressure_diastolic: 90, temperature: 37.2, pulse_rate: 92, respiratory_rate: 18, oxygen_saturation: 97, recorded_at: '2026-03-01T08:30:00Z' },
    { blood_pressure_systolic: 130, blood_pressure_diastolic: 85, temperature: 36.9, pulse_rate: 80, respiratory_rate: 16, oxygen_saturation: 98, recorded_at: '2026-03-02T08:00:00Z' },
    { blood_pressure_systolic: 120, blood_pressure_diastolic: 80, temperature: 36.8, pulse_rate: 75, respiratory_rate: 16, oxygen_saturation: 98, recorded_at: '2026-03-03T22:02:19Z' },
  ],
};

const DEMO_PRESCRIPTIONS = [
  { id: 'rx1', patient: { id: 'p1', first_name: 'Adaeze', last_name: 'Okonkwo' }, episode_id: 'e1', medication: 'Aspirin', dosage: '75mg', frequency: 'Once daily', duration: '30 days', status: 'ACTIVE', instructions: 'Take with food', created_at: '2026-03-01T09:00:00Z' },
  { id: 'rx2', patient: { id: 'p1', first_name: 'Adaeze', last_name: 'Okonkwo' }, episode_id: 'e1', medication: 'Atorvastatin', dosage: '20mg', frequency: 'Once daily at night', duration: '30 days', status: 'ACTIVE', instructions: '', created_at: '2026-03-01T09:00:00Z' },
  { id: 'rx3', patient: { id: 'p2', first_name: 'Emeka', last_name: 'Nwosu' }, episode_id: 'e2', medication: 'Amlodipine', dosage: '5mg', frequency: 'Once daily', duration: '14 days', status: 'COMPLETED', instructions: 'Monitor BP', created_at: '2026-02-15T10:00:00Z' },
];

const DEMO_REFERRALS_IN = [
  { id: 'ref1', patient: { id: 'p5', first_name: 'Bola', last_name: 'Ogundimu' }, referring_doctor: 'Dr. Ngozi Ibe', referring_facility: 'City Clinic', reason: 'Suspected cardiac arrhythmia', urgency: 'HIGH', status: 'PENDING', created_at: '2026-03-03T14:00:00Z' },
];
const DEMO_REFERRALS_OUT = [
  { id: 'ref2', patient: { id: 'p1', first_name: 'Adaeze', last_name: 'Okonkwo' }, referred_to: 'Dr. Kemi Adebayo (Cardiology)', reason: 'Further cardiac evaluation', urgency: 'MEDIUM', status: 'ACCEPTED', created_at: '2026-03-02T11:00:00Z' },
];

const DEMO_APPOINTMENTS = [
  { id: 'apt1', patient: { id: 'p2', first_name: 'Emeka', last_name: 'Nwosu' }, appointment_type: 'FOLLOW_UP', status: 'SCHEDULED', scheduled_at: '2026-03-06T09:00:00Z', notes: '' },
  { id: 'apt2', patient: { id: 'p6', first_name: 'Grace', last_name: 'Abiola' }, appointment_type: 'NEW', status: 'SCHEDULED', scheduled_at: '2026-03-06T10:30:00Z', notes: '' },
  { id: 'apt3', patient: { id: 'p7', first_name: 'Tunde', last_name: 'Bakare' }, appointment_type: 'FOLLOW_UP', status: 'COMPLETED', scheduled_at: '2026-03-05T14:00:00Z', notes: 'BP stable, continue medication' },
  { id: 'apt4', patient: { id: 'p8', first_name: 'Amina', last_name: 'Yusuf' }, appointment_type: 'NEW', status: 'NO_SHOW', scheduled_at: '2026-03-05T11:00:00Z', notes: '' },
];

const DEMO_NOTIFICATIONS = [
  { id: 'dn1', notification_type: 'NEW_APPOINTMENT', title: 'New Appointment', message: 'Emeka Nwosu has a follow-up appointment scheduled for tomorrow at 09:00.', is_read: false, created_at: '2026-03-05T16:00:00Z' },
  { id: 'dn2', notification_type: 'REFERRAL_RECEIVED', title: 'Referral Received', message: 'Dr. Ngozi Ibe referred Bola Ogundimu to you for suspected cardiac arrhythmia.', is_read: false, created_at: '2026-03-03T14:05:00Z' },
  { id: 'dn3', notification_type: 'VITALS_ALERT', title: 'Abnormal Vitals', message: 'Fatima Bello\'s temperature is 38.6\u00B0C (elevated). Please review.', is_read: true, created_at: '2026-03-03T20:20:00Z' },
  { id: 'dn4', notification_type: 'PATIENT_ASSIGNED', title: 'Patient Assigned', message: 'Fatima Bello has been assigned to your care in the Emergency Ward.', is_read: true, created_at: '2026-03-03T16:35:00Z' },
];

const DEMO_VITALS = {
  blood_pressure_systolic: 120, blood_pressure_diastolic: 80, temperature: 36.8,
  pulse_rate: 75, respiratory_rate: 16, oxygen_saturation: 98,
  weight: 70.5, height: 175, notes: 'Patient stable',
  recorded_at: '2026-03-03T22:02:19Z',
};


/* ══════════════════════════════════════════
   5. DASHBOARD PAGE
══════════════════════════════════════════ */
async function loadDashboard() {
  let stats;
  try { stats = await safeApiGet(HC_CONFIG.ENDPOINTS.DOC_STATS); }
  catch { stats = DEMO_DOC_STATS; }

  const el = (id) => document.getElementById(id);
  el('statTodayAppts').textContent         = stats.todays_appointments ?? '—';
  el('statActiveEpisodes').textContent     = stats.active_episodes ?? '—';
  el('statPatientsQueue').textContent      = stats.patients_in_queue ?? '—';
  el('statPendingReferrals').textContent   = stats.pending_referrals ?? '—';
  el('statAdmissionsUnder').textContent    = stats.admissions_under_care ?? '—';
  el('statCompletedWeek').textContent      = stats.completed_episodes_this_week ?? '—';

  loadTodaySchedule();
}

async function loadTodaySchedule() {
  const container = document.getElementById('todayScheduleContainer');
  if (!container) return;
  container.innerHTML = shimmerBlock();

  let items;
  try {
    const today = new Date().toISOString().split('T')[0];
    const data = await safeApiGet(HC_CONFIG.ENDPOINTS.DOC_APPOINTMENTS + '?status=SCHEDULED&date=' + today);
    items = Array.isArray(data) ? data : (data.results || []);
  } catch {
    items = DEMO_APPOINTMENTS.filter(a => a.status === 'SCHEDULED');
  }

  if (items.length === 0) {
    container.innerHTML = '<div class="empty-state">No appointments scheduled for today.</div>';
    return;
  }

  container.innerHTML = '<div class="schedule-list">' +
    items.slice(0, 6).map(a => {
      const p = a.patient || {};
      const name = [p.first_name, p.last_name].filter(Boolean).join(' ');
      return '<div class="schedule-item">' +
        '<span class="schedule-time">' + formatTime(a.scheduled_at) + '</span>' +
        '<div class="schedule-info">' +
          '<div class="schedule-patient">' + escapeHtml(name) + '</div>' +
          '<div class="schedule-type">' + escapeHtml(a.appointment_type || '') + '</div>' +
        '</div>' +
        statusBadge(a.status) +
      '</div>';
    }).join('') +
  '</div>';
}

let _dashRefreshInterval = setInterval(() => {
  if (document.getElementById('page-dashboard')?.classList.contains('active')) {
    _loaded.delete('dashboard');
    loadDashboard();
  }
}, 30000);


/* ══════════════════════════════════════════
   6. MY PATIENTS PAGE
══════════════════════════════════════════ */
const _patientSearchHandler = debounce(() => { _loaded.delete('patients'); loadMyPatients(); }, 400);

async function loadMyPatients() {
  const tbody = document.getElementById('patientTableBody');
  if (!tbody) return;
  tbody.innerHTML = shimmerRows(3);

  const search = document.getElementById('patientSearch')?.value?.trim() || '';
  const status = document.getElementById('patientStatusFilter')?.value || '';

  let url = HC_CONFIG.ENDPOINTS.DOC_MY_PATIENTS;
  const params = [];
  if (search)  params.push('search=' + encodeURIComponent(search));
  if (status)  params.push('status=' + status);
  if (params.length) url += '?' + params.join('&');

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

  tbody.innerHTML = items.map(item => {
    const p = item.patient || {};
    const ep = item.episode || {};
    const adm = item.admission;
    const v = item.latest_vitals;
    const name = [p.first_name, p.last_name].filter(Boolean).join(' ');
    const safeName = escapeHtml(name).replace(/'/g, '&#39;');
    const wardBed = adm ? (escapeHtml(adm.ward?.name || '') + ' / ' + escapeHtml(adm.bed?.bed_number || '')) : '<span class="badge badge-neutral">Outpatient</span>';

    let vitalsHtml = '—';
    if (v && v.recorded_at) {
      const bpAbn = isAbnormalVital('blood_pressure_systolic', v.blood_pressure_systolic) || isAbnormalVital('blood_pressure_diastolic', v.blood_pressure_diastolic);
      const tempAbn = isAbnormalVital('temperature', v.temperature);
      const prAbn = isAbnormalVital('pulse_rate', v.pulse_rate);
      vitalsHtml =
        '<span style="' + (bpAbn ? 'color:var(--danger);font-weight:700' : '') + '">' + (v.blood_pressure_systolic || '—') + '/' + (v.blood_pressure_diastolic || '—') + '</span> ' +
        '<span style="' + (tempAbn ? 'color:var(--danger);font-weight:700' : '') + '">' + (v.temperature || '—') + '\u00B0</span> ' +
        '<span style="' + (prAbn ? 'color:var(--danger);font-weight:700' : '') + '">' + (v.pulse_rate || '—') + 'bpm</span>';
    }

    return '<tr>' +
      '<td>' + escapeHtml(name) + '<div class="td-mono" style="font-size:0.7rem">' + escapeHtml(p.healthclouda_id || '') + '</div></td>' +
      '<td>' + (p.age ?? '—') + '/' + (p.gender || '—') + '</td>' +
      '<td>' + escapeHtml(p.blood_type || '—') + '</td>' +
      '<td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + escapeHtml(ep.chief_complaint || '') + '">' + escapeHtml(ep.chief_complaint || '—') + '</td>' +
      '<td>' + statusBadge(ep.episode_type || '') + '</td>' +
      '<td>' + wardBed + '</td>' +
      '<td style="font-size:0.78rem">' + vitalsHtml + '</td>' +
      '<td><div class="row-actions">' +
        '<button class="row-btn info" onclick="openVitalsModal(\'' + p.id + '\',\'' + safeName + '\')">Vitals</button>' +
        '<button class="row-btn" onclick="viewEpisodeDetail(\'' + ep.id + '\')">Episode</button>' +
        '<button class="row-btn success" onclick="openAddNotePanel(\'' + ep.id + '\',\'' + safeName + '\')">Note</button>' +
      '</div></td>' +
    '</tr>';
  }).join('');
}


/* ══════════════════════════════════════════
   7. VITALS (Read-only)
══════════════════════════════════════════ */
async function openVitalsModal(patientId, patientName) {
  document.getElementById('vitalsPatientName').textContent = patientName;
  openModal('vitalsModal');

  const container = document.getElementById('vitalsDisplay');
  container.innerHTML = shimmerBlock();

  let data;
  try {
    data = await safeApiGet(HC_CONFIG.ENDPOINTS.DOC_VITALS + patientId + '/vitals/');
  } catch { data = DEMO_VITALS; }

  const vitals = data.vitals || data;

  const fields = [
    { key: 'blood_pressure_systolic',  label: 'BP Systolic',  unit: 'mmHg' },
    { key: 'blood_pressure_diastolic', label: 'BP Diastolic', unit: 'mmHg' },
    { key: 'temperature',              label: 'Temp',         unit: '\u00B0C' },
    { key: 'pulse_rate',               label: 'Pulse',        unit: 'bpm' },
    { key: 'respiratory_rate',         label: 'Resp Rate',    unit: '/min' },
    { key: 'oxygen_saturation',        label: 'O\u2082 Sat',  unit: '%' },
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


/* ══════════════════════════════════════════
   8. EPISODES PAGE
══════════════════════════════════════════ */
let _currentEpisodeTab = 'ACTIVE';
let _episodeDetailId = null;

function switchEpisodeTab(tab) {
  _currentEpisodeTab = tab;
  document.querySelectorAll('#episodeTabs .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  _loaded.delete('episodes');
  loadEpisodes();
}

async function loadEpisodes() {
  const tbody = document.getElementById('episodeTableBody');
  if (!tbody) return;
  tbody.innerHTML = shimmerRows(3);

  // Show list, hide detail
  document.getElementById('episodeListView').style.display = '';
  document.getElementById('episodeDetailView').style.display = 'none';

  let items;
  try {
    const data = await safeApiGet(HC_CONFIG.ENDPOINTS.DOC_EPISODES + '?status=' + _currentEpisodeTab);
    items = Array.isArray(data) ? data : (data.results || []);
  } catch { items = DEMO_EPISODES.filter(e => e.status === _currentEpisodeTab); }

  document.getElementById('episodeCount').textContent = items.length + ' episode' + (items.length !== 1 ? 's' : '');

  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No ' + _currentEpisodeTab.toLowerCase() + ' episodes.</td></tr>';
    return;
  }

  tbody.innerHTML = items.map(ep => {
    const p = ep.patient || {};
    const name = [p.first_name, p.last_name].filter(Boolean).join(' ');
    const days = ep.started_at ? Math.max(1, Math.ceil((Date.now() - new Date(ep.started_at).getTime()) / 86400000)) : '—';
    return '<tr>' +
      '<td>' + escapeHtml(name) + '</td>' +
      '<td>' + statusBadge(ep.episode_type || '') + '</td>' +
      '<td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escapeHtml(ep.chief_complaint || '—') + '</td>' +
      '<td class="td-date">' + formatDate(ep.started_at) + '</td>' +
      '<td>' + days + '</td>' +
      '<td>' + statusBadge(ep.status) + '</td>' +
      '<td><div class="row-actions">' +
        '<button class="row-btn info" onclick="viewEpisodeDetail(\'' + ep.id + '\')">View</button>' +
        (_currentEpisodeTab === 'ACTIVE' ? '<button class="row-btn warn" onclick="openCompleteEpisodeModal(\'' + ep.id + '\',\'' + escapeHtml(name).replace(/'/g,'&#39;') + '\')">Complete</button>' : '') +
      '</div></td>' +
    '</tr>';
  }).join('');
}

async function viewEpisodeDetail(episodeId) {
  _episodeDetailId = episodeId;

  // Show detail view, hide list
  document.getElementById('episodeListView').style.display = 'none';
  const detailView = document.getElementById('episodeDetailView');
  detailView.style.display = 'block';
  detailView.innerHTML = shimmerBlock();

  let ep;
  try {
    ep = await safeApiGet(HC_CONFIG.ENDPOINTS.DOC_EPISODES + episodeId + '/');
  } catch { ep = DEMO_EPISODE_DETAIL; }

  const p = ep.patient || {};
  const name = [p.first_name, p.last_name].filter(Boolean).join(' ');
  const notes = ep.notes || [];
  const prescriptions = ep.prescriptions || [];
  const vitalsHistory = ep.vitals_history || [];

  let html = '';

  // Header
  html += '<div style="margin-bottom:1rem"><button class="btn btn-ghost btn-sm" onclick="backToEpisodeList()">&larr; Back to Episodes</button></div>';
  html += '<div class="episode-detail-header">' +
    '<div>' +
      '<div class="episode-patient-name">' + escapeHtml(name) + '</div>' +
      '<div class="episode-patient-meta">' +
        (p.age ? p.age + 'y' : '') + (p.gender ? ' / ' + p.gender : '') +
        (p.blood_type ? ' &middot; ' + escapeHtml(p.blood_type) : '') +
        (p.allergies ? ' &middot; Allergies: ' + escapeHtml(p.allergies) : '') +
      '</div>' +
    '</div>' +
    '<div style="text-align:right">' +
      statusBadge(ep.episode_type) + ' ' + statusBadge(ep.status) +
      (ep.admission ? '<div style="font-size:0.78rem;color:var(--text-soft);margin-top:0.3rem">' + escapeHtml(ep.admission.ward?.name || '') + ' / ' + escapeHtml(ep.admission.bed?.bed_number || '') + '</div>' : '') +
    '</div>' +
  '</div>';

  // Chief Complaint & Diagnosis
  html += '<div class="episode-detail-section">' +
    '<div class="section-title">Chief Complaint</div>' +
    '<p style="font-size:0.88rem;color:var(--text-mid)">' + escapeHtml(ep.chief_complaint || '—') + '</p>' +
  '</div>';
  if (ep.diagnosis) {
    html += '<div class="episode-detail-section">' +
      '<div class="section-title">Diagnosis</div>' +
      '<p style="font-size:0.88rem;color:var(--text-mid)">' + escapeHtml(ep.diagnosis) + '</p>' +
    '</div>';
  }

  // Vitals History
  if (vitalsHistory.length > 0) {
    html += '<div class="episode-detail-section">' +
      '<div class="section-title">Vitals History</div>' +
      '<div class="table-card"><div class="table-scroll"><table>' +
        '<thead><tr><th>Date</th><th>BP</th><th>Temp</th><th>Pulse</th><th>Resp</th><th>O2</th></tr></thead>' +
        '<tbody>' +
        vitalsHistory.map(v =>
          '<tr>' +
          '<td class="td-date">' + formatDateTime(v.recorded_at) + '</td>' +
          '<td>' + (v.blood_pressure_systolic || '—') + '/' + (v.blood_pressure_diastolic || '—') + '</td>' +
          '<td>' + (v.temperature != null ? v.temperature + '\u00B0' : '—') + '</td>' +
          '<td>' + (v.pulse_rate || '—') + '</td>' +
          '<td>' + (v.respiratory_rate || '—') + '</td>' +
          '<td>' + (v.oxygen_saturation != null ? v.oxygen_saturation + '%' : '—') + '</td>' +
          '</tr>'
        ).join('') +
        '</tbody></table></div></div>' +
    '</div>';
  }

  // Clinical Notes
  html += '<div class="episode-detail-section">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem">' +
      '<div class="section-title" style="margin-bottom:0">Clinical Notes</div>' +
      '<button class="btn btn-primary btn-sm" onclick="openAddNotePanel(\'' + episodeId + '\',\'' + escapeHtml(name).replace(/'/g,'&#39;') + '\')">+ Add Note</button>' +
    '</div>';
  if (notes.length === 0) {
    html += '<div class="empty-state">No notes recorded yet.</div>';
  } else {
    html += '<div class="notes-list">' + notes.map(n =>
      '<div class="note-item">' +
        '<div class="note-item-header">' +
          '<span class="note-item-type badge badge-info">' + escapeHtml(n.note_type || 'GENERAL') + '</span>' +
          '<span class="note-item-date">' + formatDateTime(n.created_at) + '</span>' +
        '</div>' +
        '<div class="note-item-content">' + escapeHtml(n.content) + '</div>' +
        (n.created_by ? '<div class="note-item-author">' + escapeHtml(n.created_by) + '</div>' : '') +
      '</div>'
    ).join('') + '</div>';
  }
  html += '</div>';

  // Prescriptions
  html += '<div class="episode-detail-section">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem">' +
      '<div class="section-title" style="margin-bottom:0">Prescriptions</div>' +
      '<button class="btn btn-primary btn-sm" onclick="openCreateRxPanel(\'' + episodeId + '\',\'' + (p.id || '') + '\',\'' + escapeHtml(name).replace(/'/g,'&#39;') + '\')">+ Add Prescription</button>' +
    '</div>';
  if (prescriptions.length === 0) {
    html += '<div class="empty-state">No prescriptions issued yet.</div>';
  } else {
    html += '<div class="rx-list">' + prescriptions.map(rx =>
      '<div class="rx-item">' +
        '<div>' +
          '<div class="rx-item-med">' + escapeHtml(rx.medication) + ' ' + escapeHtml(rx.dosage || '') + '</div>' +
          '<div class="rx-item-details">' + escapeHtml(rx.frequency || '') + ' &middot; ' + escapeHtml(rx.duration || '') +
            (rx.instructions ? ' &middot; ' + escapeHtml(rx.instructions) : '') + '</div>' +
        '</div>' +
        statusBadge(rx.status) +
      '</div>'
    ).join('') + '</div>';
  }
  html += '</div>';

  detailView.innerHTML = html;
}

function backToEpisodeList() {
  document.getElementById('episodeDetailView').style.display = 'none';
  document.getElementById('episodeListView').style.display = '';
}

// Create Episode
function openCreateEpisodePanel() {
  document.getElementById('createEpisodeForm')?.reset();
  openPanel('createEpisodePanel');
}

async function submitCreateEpisode(e) {
  e.preventDefault();
  const form = document.getElementById('createEpisodeForm');
  const btn  = document.getElementById('createEpisodeBtn');
  const body = {};
  new FormData(form).forEach((v, k) => { if (v) body[k] = v; });

  setButtonLoading(btn, true);
  try {
    await safeApiPost(HC_CONFIG.ENDPOINTS.DOC_EPISODES, body);
    showToast('Episode created successfully!', 'success');
    form.reset();
    closeAllPanels();
    _loaded.delete('episodes');
    _loaded.delete('dashboard');
    _loaded.delete('patients');
    loadEpisodes();
  } catch (err) {
    showToast(parseApiError(err, 'Failed to create episode.'), 'error');
  }
  setButtonLoading(btn, false, 'Create Episode');
}

// Complete Episode
function openCompleteEpisodeModal(episodeId, patientName) {
  document.getElementById('completeEpisodeId').value = episodeId;
  document.getElementById('completeEpisodePatient').textContent = patientName;
  document.getElementById('completeSummary').value = '';
  document.getElementById('completeDiagnosis').value = '';
  openModal('completeEpisodeModal');
}

async function submitCompleteEpisode() {
  const episodeId = document.getElementById('completeEpisodeId').value;
  const btn = document.getElementById('submitCompleteBtn');
  const body = {
    summary: document.getElementById('completeSummary').value.trim(),
    final_diagnosis: document.getElementById('completeDiagnosis').value.trim(),
  };

  if (!body.final_diagnosis) {
    showToast('Please enter a final diagnosis.', 'error');
    return;
  }

  setButtonLoading(btn, true);
  try {
    await safeApiPost(HC_CONFIG.ENDPOINTS.DOC_EPISODES + episodeId + '/complete/', body);
    showToast('Episode completed successfully!', 'success');
    closeModal('completeEpisodeModal');
    _loaded.delete('episodes');
    _loaded.delete('dashboard');
    _loaded.delete('patients');
    loadEpisodes();
  } catch (err) {
    showToast(parseApiError(err, 'Failed to complete episode.'), 'error');
  }
  setButtonLoading(btn, false, 'Complete Episode');
}


/* ══════════════════════════════════════════
   9. CLINICAL NOTES
══════════════════════════════════════════ */
function openAddNotePanel(episodeId, patientName) {
  document.getElementById('noteEpisodeId').value = episodeId;
  document.getElementById('notePatientName').textContent = patientName || 'Patient';
  document.getElementById('addNoteForm')?.reset();
  openPanel('addNotePanel');
}

async function submitAddNote(e) {
  e.preventDefault();
  const form = document.getElementById('addNoteForm');
  const btn  = document.getElementById('addNoteBtn');
  const episodeId = document.getElementById('noteEpisodeId').value;
  const body = {};
  new FormData(form).forEach((v, k) => { if (v) body[k] = v; });

  setButtonLoading(btn, true);
  try {
    await safeApiPost(HC_CONFIG.ENDPOINTS.DOC_EPISODES + episodeId + '/notes/', body);
    showToast('Note added successfully!', 'success');
    form.reset();
    closeAllPanels();
    // Refresh episode detail if viewing
    if (_episodeDetailId === episodeId) viewEpisodeDetail(episodeId);
  } catch (err) {
    showToast(parseApiError(err, 'Failed to add note.'), 'error');
  }
  setButtonLoading(btn, false, 'Add Note');
}


/* ══════════════════════════════════════════
   10. PRESCRIPTIONS PAGE
══════════════════════════════════════════ */
let _currentRxTab = 'ACTIVE';

function switchRxTab(tab) {
  _currentRxTab = tab;
  document.querySelectorAll('#rxTabs .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  _loaded.delete('prescriptions');
  loadPrescriptions();
}

async function loadPrescriptions() {
  const tbody = document.getElementById('rxTableBody');
  if (!tbody) return;
  tbody.innerHTML = shimmerRows(3);

  let items;
  try {
    const data = await safeApiGet(HC_CONFIG.ENDPOINTS.DOC_PRESCRIPTIONS + '?status=' + _currentRxTab);
    items = Array.isArray(data) ? data : (data.results || []);
  } catch { items = DEMO_PRESCRIPTIONS.filter(r => r.status === _currentRxTab); }

  document.getElementById('rxCount').textContent = items.length + ' prescription' + (items.length !== 1 ? 's' : '');

  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No ' + _currentRxTab.toLowerCase() + ' prescriptions.</td></tr>';
    return;
  }

  tbody.innerHTML = items.map(rx => {
    const p = rx.patient || {};
    const name = [p.first_name, p.last_name].filter(Boolean).join(' ');
    let actions = '';
    if (_currentRxTab === 'ACTIVE') {
      actions = '<button class="row-btn danger" onclick="cancelPrescription(\'' + rx.id + '\')">Cancel</button>';
    }
    return '<tr>' +
      '<td>' + escapeHtml(name) + '</td>' +
      '<td><strong>' + escapeHtml(rx.medication) + '</strong></td>' +
      '<td>' + escapeHtml(rx.dosage || '—') + '</td>' +
      '<td>' + escapeHtml(rx.frequency || '—') + '</td>' +
      '<td>' + escapeHtml(rx.duration || '—') + '</td>' +
      '<td>' + statusBadge(rx.status) + '</td>' +
      '<td><div class="row-actions">' + actions + '</div></td>' +
    '</tr>';
  }).join('');
}

function openCreateRxPanel(episodeId, patientId, patientName) {
  const form = document.getElementById('createRxForm');
  form?.reset();
  document.getElementById('rxEpisodeId').value = episodeId || '';
  document.getElementById('rxPatientId').value = patientId || '';
  document.getElementById('rxPatientLabel').textContent = patientName || 'Patient';
  openPanel('createRxPanel');
}

async function submitCreateRx(e) {
  e.preventDefault();
  const form = document.getElementById('createRxForm');
  const btn  = document.getElementById('createRxBtn');
  const body = {};
  new FormData(form).forEach((v, k) => { if (v) body[k] = v; });

  setButtonLoading(btn, true);
  try {
    await safeApiPost(HC_CONFIG.ENDPOINTS.DOC_PRESCRIPTIONS, body);
    showToast('Prescription created successfully!', 'success');
    form.reset();
    closeAllPanels();
    _loaded.delete('prescriptions');
    loadPrescriptions();
    if (_episodeDetailId) viewEpisodeDetail(_episodeDetailId);
  } catch (err) {
    showToast(parseApiError(err, 'Failed to create prescription.'), 'error');
  }
  setButtonLoading(btn, false, 'Create Prescription');
}

async function cancelPrescription(rxId) {
  if (!confirm('Cancel this prescription?')) return;
  try {
    await safeApiPatch(HC_CONFIG.ENDPOINTS.DOC_PRESCRIPTIONS + rxId + '/cancel/');
    showToast('Prescription cancelled.', 'success');
    _loaded.delete('prescriptions');
    loadPrescriptions();
  } catch (err) {
    showToast(parseApiError(err, 'Failed to cancel prescription.'), 'error');
  }
}


/* ══════════════════════════════════════════
   11. REFERRALS PAGE
══════════════════════════════════════════ */
let _currentRefTab = 'incoming';

function switchRefTab(tab) {
  _currentRefTab = tab;
  document.querySelectorAll('#refTabs .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  _loaded.delete('referrals');
  loadReferrals();
}

async function loadReferrals() {
  const tbody = document.getElementById('refTableBody');
  if (!tbody) return;
  tbody.innerHTML = shimmerRows(3);

  const isIncoming = _currentRefTab === 'incoming';
  const url = isIncoming ? HC_CONFIG.ENDPOINTS.DOC_REFERRALS_IN : HC_CONFIG.ENDPOINTS.DOC_REFERRALS_OUT;

  let items;
  try {
    const data = await safeApiGet(url);
    items = Array.isArray(data) ? data : (data.results || []);
  } catch { items = isIncoming ? DEMO_REFERRALS_IN : DEMO_REFERRALS_OUT; }

  document.getElementById('refCount').textContent = items.length + ' referral' + (items.length !== 1 ? 's' : '');

  // Update table headers
  document.getElementById('refColFrom').textContent = isIncoming ? 'From' : 'Referred To';

  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No ' + _currentRefTab + ' referrals.</td></tr>';
    return;
  }

  tbody.innerHTML = items.map(ref => {
    const p = ref.patient || {};
    const name = [p.first_name, p.last_name].filter(Boolean).join(' ');
    const fromTo = isIncoming
      ? escapeHtml(ref.referring_doctor || ref.referring_facility || '—')
      : escapeHtml(ref.referred_to || '—');

    let actions = '';
    if (isIncoming && ref.status === 'PENDING') {
      actions =
        '<button class="row-btn success" onclick="acceptReferral(\'' + ref.id + '\')">Accept</button>' +
        '<button class="row-btn danger" onclick="declineReferral(\'' + ref.id + '\')">Decline</button>';
    }

    return '<tr>' +
      '<td>' + escapeHtml(name) + '</td>' +
      '<td>' + fromTo + '</td>' +
      '<td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escapeHtml(ref.reason || '—') + '</td>' +
      '<td>' + urgencyBadge(ref.urgency || 'LOW') + '</td>' +
      '<td class="td-date">' + formatDate(ref.created_at) + '</td>' +
      '<td>' + statusBadge(ref.status) + '</td>' +
      '<td><div class="row-actions">' + actions + '</div></td>' +
    '</tr>';
  }).join('');
}

async function acceptReferral(refId) {
  try {
    await safeApiPatch(HC_CONFIG.ENDPOINTS.DOC_REFERRALS + refId + '/accept/');
    showToast('Referral accepted.', 'success');
    _loaded.delete('referrals');
    _loaded.delete('dashboard');
    loadReferrals();
  } catch (err) {
    showToast(parseApiError(err, 'Failed to accept referral.'), 'error');
  }
}

async function declineReferral(refId) {
  const reason = prompt('Reason for declining (optional):');
  try {
    await safeApiPatch(HC_CONFIG.ENDPOINTS.DOC_REFERRALS + refId + '/decline/', { reason: reason || '' });
    showToast('Referral declined.', 'success');
    _loaded.delete('referrals');
    loadReferrals();
  } catch (err) {
    showToast(parseApiError(err, 'Failed to decline referral.'), 'error');
  }
}

function openCreateRefPanel() {
  document.getElementById('createRefForm')?.reset();
  openPanel('createRefPanel');
}

async function submitCreateRef(e) {
  e.preventDefault();
  const form = document.getElementById('createRefForm');
  const btn  = document.getElementById('createRefBtn');
  const body = {};
  new FormData(form).forEach((v, k) => { if (v) body[k] = v; });

  setButtonLoading(btn, true);
  try {
    await safeApiPost(HC_CONFIG.ENDPOINTS.DOC_REFERRALS, body);
    showToast('Referral created successfully!', 'success');
    form.reset();
    closeAllPanels();
    _loaded.delete('referrals');
    loadReferrals();
  } catch (err) {
    showToast(parseApiError(err, 'Failed to create referral.'), 'error');
  }
  setButtonLoading(btn, false, 'Create Referral');
}


/* ══════════════════════════════════════════
   12. APPOINTMENTS PAGE
══════════════════════════════════════════ */
let _currentApptTab = 'SCHEDULED';

function switchApptTab(tab) {
  _currentApptTab = tab;
  document.querySelectorAll('#apptTabs .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  _loaded.delete('appointments');
  loadAppointments();
}

async function loadAppointments() {
  const tbody = document.getElementById('apptTableBody');
  if (!tbody) return;
  tbody.innerHTML = shimmerRows(3);

  let items;
  try {
    const data = await safeApiGet(HC_CONFIG.ENDPOINTS.DOC_APPOINTMENTS + '?status=' + _currentApptTab);
    items = Array.isArray(data) ? data : (data.results || []);
  } catch { items = DEMO_APPOINTMENTS.filter(a => a.status === _currentApptTab); }

  document.getElementById('apptCount').textContent = items.length + ' appointment' + (items.length !== 1 ? 's' : '');

  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No ' + _currentApptTab.toLowerCase().replace(/_/g, ' ') + ' appointments.</td></tr>';
    return;
  }

  tbody.innerHTML = items.map(a => {
    const p = a.patient || {};
    const name = [p.first_name, p.last_name].filter(Boolean).join(' ');
    let actions = '';
    if (_currentApptTab === 'SCHEDULED') {
      actions =
        '<button class="row-btn success" onclick="updateApptStatus(\'' + a.id + '\',\'COMPLETED\')">Complete</button>' +
        '<button class="row-btn warn" onclick="updateApptStatus(\'' + a.id + '\',\'NO_SHOW\')">No Show</button>' +
        '<button class="row-btn danger" onclick="updateApptStatus(\'' + a.id + '\',\'CANCELLED\')">Cancel</button>';
    }
    return '<tr>' +
      '<td class="td-date">' + formatDateTime(a.scheduled_at) + '</td>' +
      '<td>' + escapeHtml(name) + '</td>' +
      '<td>' + statusBadge(a.appointment_type || '') + '</td>' +
      '<td>' + statusBadge(a.status) + '</td>' +
      '<td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escapeHtml(a.notes || '—') + '</td>' +
      '<td><div class="row-actions">' + actions + '</div></td>' +
    '</tr>';
  }).join('');
}

async function updateApptStatus(apptId, newStatus) {
  const notes = (newStatus === 'COMPLETED') ? prompt('Appointment notes (optional):') : '';
  try {
    await safeApiPatch(HC_CONFIG.ENDPOINTS.DOC_APPOINTMENTS + apptId + '/', { status: newStatus, notes: notes || '' });
    showToast('Appointment updated.', 'success');
    _loaded.delete('appointments');
    _loaded.delete('dashboard');
    loadAppointments();
  } catch (err) {
    showToast(parseApiError(err, 'Failed to update appointment.'), 'error');
  }
}


/* ══════════════════════════════════════════
   13. NOTIFICATIONS
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
      return '<div class="notif-item' + unread + '" onclick="markNotificationRead(\'' + n.id + '\')">' +
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
    case 'REFERRAL_RECEIVED':  return '&#x1F6A8;';
    case 'NEW_APPOINTMENT':    return '&#x1F4C5;';
    case 'PATIENT_ASSIGNED':   return '&#x1F464;';
    case 'VITALS_ALERT':       return '&#x26A0;';
    case 'EPISODE_UPDATE':     return '&#x1F4CB;';
    default:                   return '&#x1F514;';
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
    for (const n of _notifsCache) {
      await safeApiPatch(HC_CONFIG.ENDPOINTS.STAFF_NOTIFS + n.id + '/read/').catch(() => {});
    }
  } catch { /* silent */ }

  refreshUnreadCount();
  showToast('All notifications marked as read.', 'success');
}

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

let _notifPollInterval = setInterval(refreshUnreadCount, 30000);
refreshUnreadCount();


/* ══════════════════════════════════════════
   14. DUTY STATUS TOGGLE
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
   15. LOGOUT
══════════════════════════════════════════ */
async function doctorLogout() {
  clearInterval(_notifPollInterval);
  clearInterval(_dashRefreshInterval);

  let slug = '';
  try { slug = hc_getUser()?.organization_slug || ''; } catch {}

  try { await apiPost(HC_CONFIG.ENDPOINTS.LOGOUT, { refresh: hc_getRefreshToken() }); } catch {}
  try { hc_clearTokens(); } catch {}

  window.location.href = slug
    ? '/public/organization/signin.html?org=' + slug
    : '/public/signin.html';
}
