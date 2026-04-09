/* ═══════════════════════════════════════════════════════════
   HealthClouda — Doctor Dashboard (Production)
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

  /* ── Redirect to signin if not authenticated ── */
  if (!token) {
    window.location.href = HC_ROUTER.signinPath(user);
    return;
  }

  /* ── Redirect if wrong role ── */
  if (user && typeof hc_redirectByRole === 'function') {
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
  if (diff < 0) return 'Just now';
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

// Error parsing centralised in hc_formatApiError (api.js)

/* ── Confirm modal utility ── */
function showConfirmModal(options) {
  document.getElementById('confirmModalTitle').textContent = options.title || 'Confirm Action';
  document.getElementById('confirmModalMessage').textContent = options.message || 'Are you sure?';

  const inputGroup = document.getElementById('confirmModalInputGroup');
  const input = document.getElementById('confirmModalInput');
  if (options.showInput) {
    inputGroup.style.display = '';
    document.getElementById('confirmModalInputLabel').textContent = options.inputLabel || 'Reason';
    input.placeholder = options.inputPlaceholder || 'Optional...';
    input.value = '';
  } else {
    inputGroup.style.display = 'none';
  }

  const btn = document.getElementById('confirmModalBtn');
  btn.textContent = options.confirmText || 'Confirm';
  btn.className = 'btn ' + (options.confirmClass || 'btn-danger');
  btn.onclick = function() {
    closeModal('confirmModal');
    if (typeof options.onConfirm === 'function') {
      options.onConfirm(options.showInput ? input.value : null);
    }
  };

  openModal('confirmModal');
}

/* ── Pagination helper ── */
function renderPagination(containerId, data, loadFnName) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const totalPages = data.total_pages || (data.count ? Math.ceil(data.count / 20) : 1);
  const currentPage = data.page || 1;

  if (totalPages <= 1) { container.innerHTML = ''; return; }

  container.innerHTML = '<div class="pagination">' +
    '<button class="row-btn"' + (currentPage <= 1 ? ' disabled' : '') + ' data-action="paginate" data-fn="' + loadFnName + '" data-page="' + (currentPage - 1) + '">Prev</button>' +
    '<span class="pagination-info">Page ' + currentPage + ' of ' + totalPages + '</span>' +
    '<button class="row-btn"' + (currentPage >= totalPages ? ' disabled' : '') + ' data-action="paginate" data-fn="' + loadFnName + '" data-page="' + (currentPage + 1) + '">Next</button>' +
  '</div>';
}

/* ── Safe ID validator (UUID format) ── */
function isValidUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}


/* ══════════════════════════════════════════
   4. DASHBOARD PAGE
══════════════════════════════════════════ */
async function loadDashboard() {
  let stats;
  try {
    stats = await safeApiGet(HC_CONFIG.ENDPOINTS.DOC_STATS);
  } catch(err) {
    showToast('Failed to load dashboard stats.', 'error');
    stats = {};
  }

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
    const data = await safeApiGet(HC_CONFIG.ENDPOINTS.DOC_APPOINTMENTS + '?status=SCHEDULED&date=' + encodeURIComponent(today));
    items = Array.isArray(data) ? data : (data.results || []);
  } catch(err) {
    container.innerHTML = '<div class="empty-state">Failed to load schedule.</div>';
    return;
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
   5. MY PATIENTS PAGE
══════════════════════════════════════════ */
const _patientSearchHandler = debounce(() => { _loaded.delete('patients'); loadMyPatients(); }, 400);

async function loadMyPatients(page) {
  const tbody = document.getElementById('patientTableBody');
  if (!tbody) return;
  tbody.innerHTML = shimmerRows(3);

  const search = document.getElementById('patientSearch')?.value?.trim() || '';
  const status = document.getElementById('patientStatusFilter')?.value || '';

  let url = HC_CONFIG.ENDPOINTS.DOC_MY_PATIENTS;
  const params = [];
  if (search)  params.push('search=' + encodeURIComponent(search));
  if (status)  params.push('status=' + encodeURIComponent(status));
  if (page && page > 1) params.push('page=' + page);
  if (params.length) url += '?' + params.join('&');

  let items, responseData;
  try {
    responseData = await safeApiGet(url);
    items = Array.isArray(responseData) ? responseData : (responseData.results || []);
  } catch(err) {
    showToast('Failed to load patients.', 'error');
    items = [];
    responseData = {};
  }

  document.getElementById('patientCount').textContent = items.length + ' patient' + (items.length !== 1 ? 's' : '');

  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No patients found.</td></tr>';
    renderPagination('patientPagination', {}, 'loadMyPatients');
    return;
  }

  tbody.innerHTML = items.map(item => {
    const p = item.patient || {};
    const ep = item.episode || {};
    const adm = item.admission;
    const v = item.latest_vitals;
    const name = [p.first_name, p.last_name].filter(Boolean).join(' ');
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
        '<button class="row-btn info" data-action="openVitals" data-id="' + escapeHtml(p.id || '') + '" data-name="' + escapeHtml(name) + '">Vitals</button>' +
        '<button class="row-btn" data-action="viewEpisode" data-id="' + escapeHtml(ep.id || '') + '">Episode</button>' +
        '<button class="row-btn success" data-action="addNote" data-id="' + escapeHtml(ep.id || '') + '" data-name="' + escapeHtml(name) + '">Note</button>' +
      '</div></td>' +
    '</tr>';
  }).join('');

  renderPagination('patientPagination', responseData, 'loadMyPatients');
}


/* ══════════════════════════════════════════
   6. VITALS (Read-only)
══════════════════════════════════════════ */
async function openVitalsModal(patientId, patientName) {
  document.getElementById('vitalsPatientName').textContent = patientName;
  openModal('vitalsModal');

  const container = document.getElementById('vitalsDisplay');
  container.innerHTML = shimmerBlock();

  let data;
  try {
    data = await safeApiGet(HC_CONFIG.ENDPOINTS.DOC_VITALS + patientId + '/vitals/');
  } catch(err) {
    container.innerHTML = '<div class="empty-state">Failed to load vitals.</div>';
    return;
  }

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
   7. EPISODES PAGE
══════════════════════════════════════════ */
let _currentEpisodeTab = 'ACTIVE';
let _episodeDetailId = null;

function switchEpisodeTab(tab) {
  _currentEpisodeTab = tab;
  document.querySelectorAll('#episodeTabs .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  _loaded.delete('episodes');
  loadEpisodes();
}

async function loadEpisodes(page) {
  const tbody = document.getElementById('episodeTableBody');
  if (!tbody) return;
  tbody.innerHTML = shimmerRows(3);

  // Show list, hide detail
  document.getElementById('episodeListView').style.display = '';
  document.getElementById('episodeDetailView').style.display = 'none';

  let items, responseData;
  try {
    let url = HC_CONFIG.ENDPOINTS.DOC_EPISODES + '?status=' + encodeURIComponent(_currentEpisodeTab);
    if (page && page > 1) url += '&page=' + page;
    responseData = await safeApiGet(url);
    items = Array.isArray(responseData) ? responseData : (responseData.results || []);
  } catch(err) {
    showToast('Failed to load episodes.', 'error');
    items = [];
    responseData = {};
  }

  document.getElementById('episodeCount').textContent = items.length + ' episode' + (items.length !== 1 ? 's' : '');

  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No ' + _currentEpisodeTab.toLowerCase() + ' episodes.</td></tr>';
    renderPagination('episodePagination', {}, 'loadEpisodes');
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
        '<button class="row-btn info" data-action="viewEpisode" data-id="' + escapeHtml(ep.id) + '">View</button>' +
        (_currentEpisodeTab === 'ACTIVE' ? '<button class="row-btn warn" data-action="completeEpisode" data-id="' + escapeHtml(ep.id) + '" data-name="' + escapeHtml(name) + '">Complete</button>' : '') +
      '</div></td>' +
    '</tr>';
  }).join('');

  renderPagination('episodePagination', responseData, 'loadEpisodes');
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
  } catch(err) {
    detailView.innerHTML = '<div class="empty-state">Failed to load episode details.</div>';
    return;
  }

  const p = ep.patient || {};
  const name = [p.first_name, p.last_name].filter(Boolean).join(' ');
  const notes = ep.notes || [];
  const prescriptions = ep.prescriptions || [];
  const vitalsHistory = ep.vitals_history || [];

  let html = '';

  // Header
  html += '<div style="margin-bottom:1rem"><button class="btn btn-ghost btn-sm" data-action="backToEpisodes">&larr; Back to Episodes</button></div>';
  html += '<div class="episode-detail-header">' +
    '<div>' +
      '<div class="episode-patient-name">' + escapeHtml(name) + '</div>' +
      '<div class="episode-patient-meta">' +
        (p.age ? p.age + 'y' : '') + (p.gender ? ' / ' + p.gender : '') +
        (p.blood_type ? ' &#183; ' + escapeHtml(p.blood_type) : '') +
        (p.allergies ? ' &#183; Allergies: ' + escapeHtml(p.allergies) : '') +
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
      '<button class="btn btn-primary btn-sm" data-action="addNote" data-id="' + escapeHtml(episodeId) + '" data-name="' + escapeHtml(name) + '">+ Add Note</button>' +
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
      '<button class="btn btn-primary btn-sm" data-action="createRx" data-episode="' + escapeHtml(episodeId) + '" data-patient="' + escapeHtml(p.id || '') + '" data-name="' + escapeHtml(name) + '">+ Add Prescription</button>' +
    '</div>';
  if (prescriptions.length === 0) {
    html += '<div class="empty-state">No prescriptions issued yet.</div>';
  } else {
    html += '<div class="rx-list">' + prescriptions.map(rx =>
      '<div class="rx-item">' +
        '<div>' +
          '<div class="rx-item-med">' + escapeHtml(rx.medication) + ' ' + escapeHtml(rx.dosage || '') + '</div>' +
          '<div class="rx-item-details">' + escapeHtml(rx.frequency || '') + ' &#183; ' + escapeHtml(rx.duration || '') +
            (rx.instructions ? ' &#183; ' + escapeHtml(rx.instructions) : '') + '</div>' +
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
/* ── Patient search widget (shared by episode + referral forms) ── */
function initPatientSearchWidget(searchInputId, hiddenInputId, dropdownId) {
  const searchEl   = document.getElementById(searchInputId);
  const hiddenEl   = document.getElementById(hiddenInputId);
  const dropdownEl = document.getElementById(dropdownId);
  if (!searchEl || !hiddenEl || !dropdownEl) return;

  let debounceTimer;

  searchEl.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    hiddenEl.value = '';
    const q = searchEl.value.trim();
    if (q.length < 2) { dropdownEl.style.display = 'none'; return; }
    debounceTimer = setTimeout(async () => {
      try {
        const data = await safeApiGet(HC_CONFIG.ENDPOINTS.DOC_MY_PATIENTS + '?search=' + encodeURIComponent(q));
        const patients = data.results || (Array.isArray(data) ? data : []);
        if (!patients.length) {
          dropdownEl.innerHTML = '<div style="padding:0.6rem 1rem;color:var(--text-soft);font-size:0.85rem">No patients found</div>';
        } else {
          dropdownEl.innerHTML = patients.map(p => {
            const name = [p.first_name, p.last_name].filter(Boolean).join(' ');
            const hcId = p.healthclouda_id ? '<span style="color:var(--text-soft);font-size:0.8rem;margin-left:0.4rem">' + escapeHtml(p.healthclouda_id) + '</span>' : '';
            return '<div class="dropdown-item" data-id="' + p.id + '" data-name="' + escapeHtml(name) + '" style="padding:0.55rem 1rem;cursor:pointer;font-size:0.88rem">' + escapeHtml(name) + hcId + '</div>';
          }).join('');
          dropdownEl.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('mousedown', function (ev) {
              ev.preventDefault();
              hiddenEl.value  = item.dataset.id;
              searchEl.value  = item.dataset.name;
              dropdownEl.style.display = 'none';
            });
          });
        }
        dropdownEl.style.display = 'block';
      } catch (_) { dropdownEl.style.display = 'none'; }
    }, 300);
  });

  searchEl.addEventListener('blur', () => setTimeout(() => { dropdownEl.style.display = 'none'; }, 150));
  searchEl.addEventListener('focus', () => { if (dropdownEl.innerHTML) dropdownEl.style.display = 'block'; });
}

function openCreateEpisodePanel() {
  document.getElementById('createEpisodeForm')?.reset();
  document.getElementById('epPatientSearch') && (document.getElementById('epPatientSearch').value = '');
  document.getElementById('epPatientDropdown') && (document.getElementById('epPatientDropdown').style.display = 'none');
  openPanel('createEpisodePanel');
  initPatientSearchWidget('epPatientSearch', 'epPatientId', 'epPatientDropdown');
}

async function submitCreateEpisode(e) {
  e.preventDefault();
  const form = document.getElementById('createEpisodeForm');
  const btn  = document.getElementById('createEpisodeBtn');
  const body = {};
  new FormData(form).forEach((v, k) => { if (v) body[k] = v.trim(); });

  if (!body.patient || !body.episode_type || !body.chief_complaint) {
    showToast('Please fill in all required fields.', 'error');
    return;
  }

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
    showToast(hc_formatApiError(err?.data,'Failed to create episode.'), 'error');
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
    showToast(hc_formatApiError(err?.data,'Failed to complete episode.'), 'error');
  }
  setButtonLoading(btn, false, 'Complete Episode');
}


/* ══════════════════════════════════════════
   8. CLINICAL NOTES
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
  new FormData(form).forEach((v, k) => { if (v) body[k] = v.trim(); });

  if (!body.content) {
    showToast('Please enter note content.', 'error');
    return;
  }

  setButtonLoading(btn, true);
  try {
    await safeApiPost(HC_CONFIG.ENDPOINTS.DOC_EPISODES + episodeId + '/notes/', body);
    showToast('Note added successfully!', 'success');
    form.reset();
    closeAllPanels();
    // Refresh episode detail if viewing
    if (_episodeDetailId === episodeId) viewEpisodeDetail(episodeId);
  } catch (err) {
    showToast(hc_formatApiError(err?.data,'Failed to add note.'), 'error');
  }
  setButtonLoading(btn, false, 'Add Note');
}


/* ══════════════════════════════════════════
   9. PRESCRIPTIONS PAGE
══════════════════════════════════════════ */
let _currentRxTab = 'ACTIVE';

function switchRxTab(tab) {
  _currentRxTab = tab;
  document.querySelectorAll('#rxTabs .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  _loaded.delete('prescriptions');
  loadPrescriptions();
}

async function loadPrescriptions(page) {
  const tbody = document.getElementById('rxTableBody');
  if (!tbody) return;
  tbody.innerHTML = shimmerRows(3);

  let items, responseData;
  try {
    let url = HC_CONFIG.ENDPOINTS.DOC_PRESCRIPTIONS + '?status=' + encodeURIComponent(_currentRxTab);
    if (page && page > 1) url += '&page=' + page;
    responseData = await safeApiGet(url);
    items = Array.isArray(responseData) ? responseData : (responseData.results || []);
  } catch(err) {
    showToast('Failed to load prescriptions.', 'error');
    items = [];
    responseData = {};
  }

  document.getElementById('rxCount').textContent = items.length + ' prescription' + (items.length !== 1 ? 's' : '');

  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No ' + _currentRxTab.toLowerCase() + ' prescriptions.</td></tr>';
    renderPagination('rxPagination', {}, 'loadPrescriptions');
    return;
  }

  tbody.innerHTML = items.map(rx => {
    const p = rx.patient || {};
    const name = [p.first_name, p.last_name].filter(Boolean).join(' ');
    let actions = '';
    if (_currentRxTab === 'ACTIVE') {
      actions = '<button class="row-btn danger" data-action="cancelRx" data-id="' + escapeHtml(rx.id) + '">Cancel</button>';
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

  renderPagination('rxPagination', responseData, 'loadPrescriptions');
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
  new FormData(form).forEach((v, k) => { if (v) body[k] = v.trim(); });

  if (!body.medication || !body.dosage || !body.frequency) {
    showToast('Please fill in medication, dosage, and frequency.', 'error');
    return;
  }

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
    showToast(hc_formatApiError(err?.data,'Failed to create prescription.'), 'error');
  }
  setButtonLoading(btn, false, 'Create Prescription');
}

async function cancelPrescription(rxId) {
  showConfirmModal({
    title: 'Cancel Prescription',
    message: 'Are you sure you want to cancel this prescription? This action cannot be undone.',
    confirmText: 'Cancel Prescription',
    confirmClass: 'btn-danger',
    onConfirm: async function() {
      try {
        await safeApiPatch(HC_CONFIG.ENDPOINTS.DOC_PRESCRIPTIONS + rxId + '/cancel/');
        showToast('Prescription cancelled.', 'success');
        _loaded.delete('prescriptions');
        loadPrescriptions();
      } catch (err) {
        showToast(hc_formatApiError(err?.data,'Failed to cancel prescription.'), 'error');
      }
    }
  });
}


/* ══════════════════════════════════════════
   10. REFERRALS PAGE
══════════════════════════════════════════ */
let _currentRefTab = 'incoming';

function switchRefTab(tab) {
  _currentRefTab = tab;
  document.querySelectorAll('#refTabs .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  _loaded.delete('referrals');
  loadReferrals();
}

async function loadReferrals(page) {
  const tbody = document.getElementById('refTableBody');
  if (!tbody) return;
  tbody.innerHTML = shimmerRows(3);

  const isIncoming = _currentRefTab === 'incoming';
  let url = isIncoming ? HC_CONFIG.ENDPOINTS.DOC_REFERRALS_IN : HC_CONFIG.ENDPOINTS.DOC_REFERRALS_OUT;
  if (page && page > 1) url += (url.includes('?') ? '&' : '?') + 'page=' + page;

  let items, responseData;
  try {
    responseData = await safeApiGet(url);
    items = Array.isArray(responseData) ? responseData : (responseData.results || []);
  } catch(err) {
    showToast('Failed to load referrals.', 'error');
    items = [];
    responseData = {};
  }

  document.getElementById('refCount').textContent = items.length + ' referral' + (items.length !== 1 ? 's' : '');

  // Update table headers
  document.getElementById('refColFrom').textContent = isIncoming ? 'From' : 'Referred To';

  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No ' + _currentRefTab + ' referrals.</td></tr>';
    renderPagination('refPagination', {}, 'loadReferrals');
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
        '<button class="row-btn success" data-action="acceptRef" data-id="' + escapeHtml(ref.id) + '">Accept</button>' +
        '<button class="row-btn danger" data-action="declineRef" data-id="' + escapeHtml(ref.id) + '">Decline</button>';
    }
    // View detail button for all referrals
    actions += '<button class="row-btn info" data-action="viewRefDetail" data-id="' + escapeHtml(ref.id) + '">View</button>';
    // PDF download for inter-org outgoing referrals with letters
    if (!isIncoming && ref.referral_type === 'inter_org' && ref.has_letter) {
      actions += '<button class="row-btn" data-action="downloadRefLetter" data-id="' + escapeHtml(ref.id) + '">PDF</button>';
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

  renderPagination('refPagination', responseData, 'loadReferrals');
}

async function acceptReferral(refId) {
  try {
    await safeApiPatch(HC_CONFIG.ENDPOINTS.DOC_REFERRALS + refId + '/accept/');
    showToast('Referral accepted.', 'success');
    _loaded.delete('referrals');
    _loaded.delete('dashboard');
    loadReferrals();
  } catch (err) {
    showToast(hc_formatApiError(err?.data,'Failed to accept referral.'), 'error');
  }
}

async function declineReferral(refId) {
  showConfirmModal({
    title: 'Decline Referral',
    message: 'Are you sure you want to decline this referral?',
    showInput: true,
    inputLabel: 'Reason for declining',
    inputPlaceholder: 'Optional reason...',
    confirmText: 'Decline',
    confirmClass: 'btn-danger',
    onConfirm: async function(reason) {
      try {
        await safeApiPatch(HC_CONFIG.ENDPOINTS.DOC_REFERRALS + refId + '/decline/', { reason: reason || '' });
        showToast('Referral declined.', 'success');
        _loaded.delete('referrals');
        loadReferrals();
      } catch (err) {
        showToast(hc_formatApiError(err?.data,'Failed to decline referral.'), 'error');
      }
    }
  });
}

/* ── Referral Detail View ── */
async function viewReferralDetail(refId) {
  const content = document.getElementById('referralDetailContent');
  const downloadBtn = document.getElementById('referralDownloadBtn');
  openModal('referralDetailModal');
  content.innerHTML = '<div class="empty-state">Loading referral details...</div>';
  downloadBtn.style.display = 'none';

  try {
    const detail = await safeApiGet(HC_CONFIG.ENDPOINTS.DOC_REFERRALS + refId + '/');
    const p = detail.patient || {};
    const name = [p.first_name, p.last_name].filter(Boolean).join(' ');

    let html = '<div class="referral-detail-grid">';
    html += '<div class="detail-field"><span class="detail-label">Patient</span><span class="detail-value">' + escapeHtml(name) + '</span></div>';
    html += '<div class="detail-field"><span class="detail-label">Status</span><span class="detail-value">' + statusBadge(detail.status) + '</span></div>';
    html += '<div class="detail-field"><span class="detail-label">Urgency</span><span class="detail-value">' + urgencyBadge(detail.urgency || 'LOW') + '</span></div>';
    if (detail.referral_type) {
      html += '<div class="detail-field"><span class="detail-label">Type</span><span class="detail-value">' + escapeHtml(detail.referral_type.replace(/_/g, ' ')) + '</span></div>';
    }
    if (detail.referring_doctor) {
      html += '<div class="detail-field"><span class="detail-label">From Doctor</span><span class="detail-value">' + escapeHtml(detail.referring_doctor) + '</span></div>';
    }
    if (detail.referring_facility) {
      html += '<div class="detail-field"><span class="detail-label">From Facility</span><span class="detail-value">' + escapeHtml(detail.referring_facility) + '</span></div>';
    }
    if (detail.referred_to) {
      html += '<div class="detail-field"><span class="detail-label">Referred To</span><span class="detail-value">' + escapeHtml(detail.referred_to) + '</span></div>';
    }
    html += '<div class="detail-field"><span class="detail-label">Date</span><span class="detail-value">' + formatDateTime(detail.created_at) + '</span></div>';
    html += '</div>';
    if (detail.reason) {
      html += '<div class="detail-field" style="margin-top:1rem"><span class="detail-label">Reason</span><p style="font-size:0.88rem;color:var(--text-mid);margin-top:0.25rem">' + escapeHtml(detail.reason) + '</p></div>';
    }
    if (detail.clinical_notes) {
      html += '<div class="detail-field" style="margin-top:0.75rem"><span class="detail-label">Clinical Notes</span><p style="font-size:0.88rem;color:var(--text-mid);margin-top:0.25rem">' + escapeHtml(detail.clinical_notes) + '</p></div>';
    }

    content.innerHTML = html;

    if (detail.has_letter) {
      downloadBtn.style.display = '';
      downloadBtn.setAttribute('data-id', detail.id);
    }
  } catch(err) {
    content.innerHTML = '<div class="empty-state">Failed to load referral details.</div>';
  }
}

/* ── Referral Letter PDF Download ── */
async function downloadReferralLetter(refId, btnEl) {
  if (btnEl) { btnEl.disabled = true; btnEl.textContent = 'Downloading...'; }

  try {
    let token = hc_getAccessToken();
    const url = HC_CONFIG.API_BASE_URL + HC_CONFIG.ENDPOINTS.DOC_REFERRALS + refId + '/download-letter/';
    let res = await fetch(url, { headers: { 'Authorization': 'Bearer ' + token } });
    if (res.status === 401) {
      try {
        token = await hc_refreshAccessToken();
        res = await fetch(url, { headers: { 'Authorization': 'Bearer ' + token } });
      } catch { /* refresh failed — handled by hc_refreshAccessToken */ }
    }
    if (!res.ok) throw new Error('Download failed');

    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = 'referral-letter-' + refId + '.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
    showToast('Referral letter downloaded!', 'success');
  } catch(err) {
    showToast(hc_formatApiError(err?.data,'Failed to download referral letter.'), 'error');
  }
  if (btnEl) { btnEl.disabled = false; btnEl.textContent = 'PDF'; }
}

/* ── Referral Type Toggle ── */
function toggleRefTypeFields(type) {
  const internalFields = document.getElementById('refInternalFields');
  const interOrgFields = document.getElementById('refInterOrgFields');
  if (internalFields) internalFields.style.display = (type === 'internal_department') ? '' : 'none';
  if (interOrgFields) interOrgFields.style.display = (type === 'inter_org') ? '' : 'none';
}

function openCreateRefPanel() {
  document.getElementById('createRefForm')?.reset();
  document.getElementById('refPatientSearch') && (document.getElementById('refPatientSearch').value = '');
  document.getElementById('refPatientDropdown') && (document.getElementById('refPatientDropdown').style.display = 'none');
  toggleRefTypeFields('');
  openPanel('createRefPanel');
  initPatientSearchWidget('refPatientSearch', 'refPatientId', 'refPatientDropdown');
}

async function submitCreateRef(e) {
  e.preventDefault();
  const form = document.getElementById('createRefForm');
  const btn  = document.getElementById('createRefBtn');
  const body = {};
  new FormData(form).forEach((v, k) => { if (v) body[k] = v.trim(); });

  if (!body.patient || !body.referral_type || !body.reason) {
    showToast('Please fill in all required fields.', 'error');
    return;
  }

  setButtonLoading(btn, true);
  try {
    await safeApiPost(HC_CONFIG.ENDPOINTS.DOC_REFERRALS, body);
    showToast('Referral created successfully!', 'success');
    form.reset();
    closeAllPanels();
    _loaded.delete('referrals');
    loadReferrals();
  } catch (err) {
    showToast(hc_formatApiError(err?.data,'Failed to create referral.'), 'error');
  }
  setButtonLoading(btn, false, 'Create Referral');
}


/* ══════════════════════════════════════════
   11. APPOINTMENTS PAGE
══════════════════════════════════════════ */
let _currentApptTab = 'SCHEDULED';

function switchApptTab(tab) {
  _currentApptTab = tab;
  document.querySelectorAll('#apptTabs .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  _loaded.delete('appointments');
  loadAppointments();
}

async function loadAppointments(page) {
  const tbody = document.getElementById('apptTableBody');
  if (!tbody) return;
  tbody.innerHTML = shimmerRows(3);

  let items, responseData;
  try {
    let url = HC_CONFIG.ENDPOINTS.DOC_APPOINTMENTS + '?status=' + encodeURIComponent(_currentApptTab);
    if (page && page > 1) url += '&page=' + page;
    responseData = await safeApiGet(url);
    items = Array.isArray(responseData) ? responseData : (responseData.results || []);
  } catch(err) {
    showToast('Failed to load appointments.', 'error');
    items = [];
    responseData = {};
  }

  document.getElementById('apptCount').textContent = items.length + ' appointment' + (items.length !== 1 ? 's' : '');

  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No ' + _currentApptTab.toLowerCase().replace(/_/g, ' ') + ' appointments.</td></tr>';
    renderPagination('apptPagination', {}, 'loadAppointments');
    return;
  }

  tbody.innerHTML = items.map(a => {
    const p = a.patient || {};
    const name = [p.first_name, p.last_name].filter(Boolean).join(' ');
    let actions = '';
    if (_currentApptTab === 'SCHEDULED') {
      actions =
        '<button class="row-btn success" data-action="updateAppt" data-id="' + escapeHtml(a.id) + '" data-status="COMPLETED">Complete</button>' +
        '<button class="row-btn warn" data-action="updateAppt" data-id="' + escapeHtml(a.id) + '" data-status="NO_SHOW">No Show</button>' +
        '<button class="row-btn danger" data-action="updateAppt" data-id="' + escapeHtml(a.id) + '" data-status="CANCELLED">Cancel</button>';
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

  renderPagination('apptPagination', responseData, 'loadAppointments');
}

async function updateApptStatus(apptId, newStatus) {
  if (newStatus === 'COMPLETED') {
    showConfirmModal({
      title: 'Complete Appointment',
      message: 'Mark this appointment as completed?',
      showInput: true,
      inputLabel: 'Appointment notes',
      inputPlaceholder: 'Optional notes...',
      confirmText: 'Complete',
      confirmClass: 'btn-success',
      onConfirm: async function(notes) {
        await _doUpdateApptStatus(apptId, newStatus, notes || '');
      }
    });
  } else if (newStatus === 'CANCELLED') {
    showConfirmModal({
      title: 'Cancel Appointment',
      message: 'Are you sure you want to cancel this appointment?',
      confirmText: 'Cancel Appointment',
      confirmClass: 'btn-danger',
      onConfirm: async function() {
        await _doUpdateApptStatus(apptId, newStatus, '');
      }
    });
  } else {
    showConfirmModal({
      title: 'Update Appointment',
      message: 'Change status to ' + newStatus.replace(/_/g, ' ') + '?',
      confirmText: 'Confirm',
      onConfirm: async function() {
        await _doUpdateApptStatus(apptId, newStatus, '');
      }
    });
  }
}

async function _doUpdateApptStatus(apptId, newStatus, notes) {
  try {
    await safeApiPatch(HC_CONFIG.ENDPOINTS.DOC_APPOINTMENTS + apptId + '/', { status: newStatus, notes: notes });
    showToast('Appointment updated.', 'success');
    _loaded.delete('appointments');
    _loaded.delete('dashboard');
    loadAppointments();
  } catch (err) {
    showToast(hc_formatApiError(err?.data,'Failed to update appointment.'), 'error');
  }
}


/* ══════════════════════════════════════════
   12. NOTIFICATIONS
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
  } catch(err) {
    showToast('Failed to load notifications.', 'error');
    _notifsCache = [];
  }

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
      return '<div class="notif-item' + unread + '" data-action="markNotifRead" data-id="' + escapeHtml(n.id) + '">' +
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
  } catch(err) {
    showToast('Failed to mark notification as read.', 'error');
  }

  refreshUnreadCount();
}

async function markAllNotificationsRead() {
  _notifsCache.forEach(n => n.is_read = true);
  renderNotifications();

  try {
    for (const n of _notifsCache) {
      await safeApiPatch(HC_CONFIG.ENDPOINTS.STAFF_NOTIFS + n.id + '/read/').catch(() => {});
    }
  } catch(err) {
    showToast('Failed to mark all as read.', 'error');
  }

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
  } catch(err) {
    /* Non-critical — badge will show stale count */
  }
}

let _notifPollInterval = setInterval(refreshUnreadCount, 30000);
refreshUnreadCount();


/* ══════════════════════════════════════════
   13. DUTY STATUS TOGGLE
══════════════════════════════════════════ */
async function loadDutyStatus() {
  try {
    const data = await safeApiGet(HC_CONFIG.ENDPOINTS.ME);
    if (data) updateDutyUI(data.is_on_duty);
  } catch(err) {
    /* Non-critical — duty badge defaults to off */
  }
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
   14. LOGOUT
══════════════════════════════════════════ */
async function doctorLogout() {
  clearInterval(_notifPollInterval);
  clearInterval(_dashRefreshInterval);

  let slug = '';
  try { slug = hc_getUser()?.organization_slug || ''; } catch(e) {}

  try { await apiPost(HC_CONFIG.ENDPOINTS.LOGOUT, { refresh: hc_getRefreshToken() }); } catch(e) {}
  try { hc_clearTokens(); } catch(e) {}

  window.location.href = HC_ROUTER.signinPath({ organization_slug: slug });
}


/* ══════════════════════════════════════════
   15. INTERVAL CLEANUP (Memory Leak Fix)
══════════════════════════════════════════ */
document.addEventListener('visibilitychange', function() {
  if (document.hidden) {
    clearInterval(_dashRefreshInterval);
    clearInterval(_notifPollInterval);
  } else {
    _dashRefreshInterval = setInterval(function() {
      if (document.getElementById('page-dashboard')?.classList.contains('active')) {
        _loaded.delete('dashboard');
        loadDashboard();
      }
    }, 30000);
    _notifPollInterval = setInterval(refreshUnreadCount, 30000);
    refreshUnreadCount();
  }
});

window.addEventListener('beforeunload', function() {
  clearInterval(_dashRefreshInterval);
  clearInterval(_notifPollInterval);
});


/* ══════════════════════════════════════════
   16. EVENT DELEGATION (CSP-safe)
══════════════════════════════════════════ */
document.addEventListener('click', function(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;
  const id = btn.dataset.id;
  const name = btn.dataset.name;

  switch (action) {
    /* ── Patient row actions ── */
    case 'openVitals':
      openVitalsModal(id, name);
      break;
    case 'viewEpisode':
      viewEpisodeDetail(id);
      break;
    case 'addNote':
      openAddNotePanel(id, name);
      break;

    /* ── Episode actions ── */
    case 'completeEpisode':
      openCompleteEpisodeModal(id, name);
      break;
    case 'backToEpisodes':
      backToEpisodeList();
      break;

    /* ── Prescription actions ── */
    case 'cancelRx':
      cancelPrescription(id);
      break;
    case 'createRx':
      openCreateRxPanel(btn.dataset.episode, btn.dataset.patient, name);
      break;

    /* ── Referral actions ── */
    case 'acceptRef':
      acceptReferral(id);
      break;
    case 'declineRef':
      declineReferral(id);
      break;
    case 'viewRefDetail':
      viewReferralDetail(id);
      break;
    case 'downloadRefLetter':
      downloadReferralLetter(id, btn);
      break;
    case 'downloadRefLetterModal':
      downloadReferralLetter(document.getElementById('referralDownloadBtn')?.getAttribute('data-id'), btn);
      break;

    /* ── Appointment actions ── */
    case 'updateAppt':
      updateApptStatus(id, btn.dataset.status);
      break;

    /* ── Notification actions ── */
    case 'markNotifRead':
      markNotificationRead(id);
      break;

    /* ── Pagination ── */
    case 'paginate': {
      const fn = btn.dataset.fn;
      const pg = parseInt(btn.dataset.page, 10);
      if (fn === 'loadMyPatients') { _loaded.delete('patients'); loadMyPatients(pg); }
      else if (fn === 'loadEpisodes') { _loaded.delete('episodes'); loadEpisodes(pg); }
      else if (fn === 'loadPrescriptions') { _loaded.delete('prescriptions'); loadPrescriptions(pg); }
      else if (fn === 'loadReferrals') { _loaded.delete('referrals'); loadReferrals(pg); }
      else if (fn === 'loadAppointments') { _loaded.delete('appointments'); loadAppointments(pg); }
      break;
    }

    /* ── Referral type toggle ── */
    case 'toggleRefType':
      toggleRefTypeFields(btn.value || document.getElementById('refType')?.value || '');
      break;
  }
});
