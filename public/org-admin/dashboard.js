/* ═══════════════════════════════════════════════════════════
   HealthClouda — Org Admin Dashboard (Production)
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
    if (role && role !== 'organizationadmin' && role !== 'superadmin') {
      hc_redirectByRole(user.role);
      return;
    }
  }

  const orgName = user?.organization_name || user?.organization?.name || 'Organisation';
  const fullName = user?.full_name || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || 'Org Admin';
  const initials = fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const el = (id) => document.getElementById(id);
  if (el('sidebarUserName')) el('sidebarUserName').textContent = fullName;
  if (el('sidebarUserRole')) el('sidebarUserRole').textContent = 'Org Admin';
  if (el('sidebarAvatar'))   el('sidebarAvatar').textContent   = initials;
  if (el('headerUserName'))  el('headerUserName').textContent  = fullName;
  if (el('dashWelcome'))     el('dashWelcome').textContent     = 'Welcome, ' + fullName.split(' ')[0];
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
let _staffCache = [];
let _patientsCache = [];
let _accessCache = [];
let _notifCache = [];

function loadPage(page) {
  if (_loaded.has(page)) return;
  _loaded.add(page);
  switch (page) {
    case 'dashboard':     loadDashboard(); break;
    case 'staff':         loadStaff(); break;
    case 'patients':      loadPatients(); break;
    case 'wards':         loadWards(); break;
    case 'access':        loadAccessRequests(); break;
    case 'notifications': loadNotifications(); break;
    case 'settings':      loadSettings(); initChangePasswordOnce(); break;
  }
}
loadPage('dashboard');


/* ══════════════════════════════════════════
   3. HELPERS
══════════════════════════════════════════ */
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? '-';
}
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function statusBadge(status) {
  const key = String(status || '').toUpperCase().replace(/_/g, ' ');
  const map = {
    ACTIVE: 'badge-success', AVAILABLE: 'badge-success', OCCUPIED: 'badge-danger',
    INACTIVE: 'badge-neutral', PENDING: 'badge-warning', APPROVED: 'badge-success',
    DENIED: 'badge-danger', COMPLETED: 'badge-info',
    DOCTOR: 'badge-info', NURSE: 'badge-success', RECEPTIONIST: 'badge-warning',
    'ORG ADMIN': 'badge-neutral',
  };
  return '<span class="badge ' + (map[key] || 'badge-neutral') + '">' + escapeHtml(key || 'UNKNOWN') + '</span>';
}
function formatDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatTimeAgo(value) {
  if (!value) return '-';
  const diffSec = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return Math.floor(diffSec / 60) + 'm ago';
  if (diffSec < 86400) return Math.floor(diffSec / 3600) + 'h ago';
  return formatDate(value);
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
function shimmerRows(n, cols) {
  let html = '';
  for (let i = 0; i < n; i++) {
    html += '<tr><td colspan="' + (cols || 6) + '" style="padding:1rem">' + shimmerBlock() + '</td></tr>';
  }
  return html;
}

function debounce(fn, ms) {
  let timer;
  return function() { var args = arguments; var ctx = this; clearTimeout(timer); timer = setTimeout(function() { fn.apply(ctx, args); }, ms); };
}

function setButtonLoading(btn, loading, label) {
  if (!btn) return;
  if (loading) { btn.disabled = true; btn.dataset.origText = btn.textContent; btn.textContent = 'Loading\u2026'; }
  else { btn.disabled = false; btn.textContent = label || btn.dataset.origText || 'Submit'; }
}

// Error parsing centralised in hc_formatApiError (api.js)

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

/* ── Confirm modal utility ── */
function showConfirmModal(options) {
  document.getElementById('confirmModalTitle').textContent = options.title || 'Confirm Action';
  document.getElementById('confirmModalMessage').textContent = options.message || 'Are you sure?';

  const btn = document.getElementById('confirmModalBtn');
  btn.textContent = options.confirmText || 'Confirm';
  btn.className = 'btn ' + (options.confirmClass || 'btn-danger');
  btn.onclick = function() {
    closeModal('confirmModal');
    if (typeof options.onConfirm === 'function') options.onConfirm();
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


/* ══════════════════════════════════════════
   4. DASHBOARD PAGE
══════════════════════════════════════════ */
async function loadDashboard() {
  const tbody = document.getElementById('activityTbody');
  if (tbody) tbody.innerHTML = shimmerRows(3, 5);

  let stats, activity;
  try {
    [stats, activity] = await Promise.all([
      apiGet(HC_CONFIG.ENDPOINTS.ORG_ADMIN_STATS),
      apiGet(HC_CONFIG.ENDPOINTS.ORG_ADMIN_ACTIVITY),
    ]);
  } catch(err) {
    showToast('Failed to load dashboard.', 'error');
    stats = {};
    activity = [];
  }

  setText('statStaff', stats.total_staff ?? '-');
  setText('statPatients', stats.active_patients ?? '-');
  setText('statAppts', stats.todays_appointments ?? '-');
  setText('statBeds', stats.bed_occupancy ?? '-');
  setText('statAccess', stats.pending_access_requests ?? '-');
  setText('statAlerts', stats.critical_alerts ?? '-');

  const rows = (Array.isArray(activity) ? activity : (activity.results || [])).slice(0, 8);
  if (!rows.length) {
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No recent activity.</td></tr>';
    return;
  }
  if (tbody) tbody.innerHTML = rows.map(a =>
    '<tr>' +
      '<td>' + escapeHtml(formatTimeAgo(a.created_at || a.time)) + '</td>' +
      '<td>' + escapeHtml(a.actor_name || a.user_name || '-') + '</td>' +
      '<td>' + escapeHtml(a.action || '-') + '</td>' +
      '<td>' + escapeHtml(a.entity || '-') + '</td>' +
      '<td>' + statusBadge(a.status || 'info') + '</td>' +
    '</tr>'
  ).join('');
}

let _dashRefreshInterval = setInterval(function() {
  if (document.getElementById('page-dashboard')?.classList.contains('active')) {
    _loaded.delete('dashboard');
    loadDashboard();
  }
}, 30000);


/* ══════════════════════════════════════════
   5. STAFF PAGE
══════════════════════════════════════════ */
const _staffSearchHandler = debounce(function() { _loaded.delete('staff'); loadStaff(); }, 400);

async function loadStaff(page) {
  const tbody = document.getElementById('staffTbody');
  if (tbody) tbody.innerHTML = shimmerRows(3, 6);

  const q = (document.getElementById('staffSearch')?.value || '').trim();
  const role = document.getElementById('staffRoleFilter')?.value || '';

  const params = new URLSearchParams();
  if (q) params.set('search', q);
  if (role) params.set('role', role);
  if (page && page > 1) params.set('page', page);
  const path = HC_CONFIG.ENDPOINTS.ORG_ADMIN_STAFF + (params.toString() ? '?' + params.toString() : '');

  let items, responseData;
  try {
    responseData = await apiGet(path);
    items = Array.isArray(responseData) ? responseData : (responseData.results || []);
  } catch(err) {
    showToast('Failed to load staff.', 'error');
    items = [];
    responseData = {};
  }

  _staffCache = items;
  setText('staffCount', items.length + ' staff');

  if (!items.length) {
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No staff found.</td></tr>';
    renderPagination('staffPagination', {}, 'loadStaff');
    return;
  }

  if (tbody) tbody.innerHTML = items.map(s =>
    '<tr data-action="viewStaff" data-id="' + escapeHtml(s.id) + '" style="cursor:pointer">' +
      '<td>' + escapeHtml(s.full_name || '-') + '</td>' +
      '<td>' + statusBadge(s.role || 'staff') + '</td>' +
      '<td>' + escapeHtml(s.email || '-') + '</td>' +
      '<td>' + escapeHtml(s.phone || '-') + '</td>' +
      '<td>' + statusBadge(s.is_active ? 'active' : 'inactive') + '</td>' +
      '<td><div class="row-actions">' +
        '<button class="row-btn" data-action="editStaff" data-id="' + escapeHtml(s.id) + '">Edit</button>' +
        '<button class="row-btn ' + (!s.is_active ? 'success' : 'danger') + '" data-action="toggleStaff" data-id="' + escapeHtml(s.id) + '" data-active="' + (!s.is_active) + '">' + (!s.is_active ? 'Activate' : 'Suspend') + '</button>' +
      '</div></td>' +
    '</tr>'
  ).join('');

  renderPagination('staffPagination', responseData, 'loadStaff');
}

function openAddStaffPanel() {
  document.getElementById('addStaffForm')?.reset();
  setText('addStaffPanelTitle', 'Add Staff Member');
  document.getElementById('addStaffPassword')?.parentElement?.classList.remove('hidden');
  document.getElementById('addStaffForm')?.removeAttribute('data-edit-id');
  openPanel('addStaffPanel');
}

function openEditStaffPanel(id) {
  const staff = _staffCache.find(s => String(s.id) === String(id));
  if (!staff) { showToast('Staff member not found.', 'error'); return; }

  const form = document.getElementById('addStaffForm');
  if (!form) return;

  form.reset();
  form.setAttribute('data-edit-id', id);
  setText('addStaffPanelTitle', 'Edit Staff Member');

  form.querySelector('[name="full_name"]').value = staff.full_name || '';
  form.querySelector('[name="email"]').value = staff.email || '';
  form.querySelector('[name="phone"]').value = staff.phone || '';
  form.querySelector('[name="role"]').value = staff.role || '';

  /* Hide password field for edit mode */
  document.getElementById('addStaffPassword')?.parentElement?.classList.add('hidden');

  openPanel('addStaffPanel');
}

async function submitAddStaff(e) {
  e.preventDefault();
  const form = document.getElementById('addStaffForm');
  const btn = document.getElementById('addStaffBtn');
  if (!form) return;

  const editId = form.getAttribute('data-edit-id');
  const payload = {};
  new FormData(form).forEach((value, key) => { if (value) payload[key] = value; });

  setButtonLoading(btn, true, editId ? 'Saving...' : 'Creating...');
  try {
    if (editId) {
      delete payload.password;
      await apiPatch(HC_CONFIG.ENDPOINTS.ORG_ADMIN_STAFF + editId + '/', payload);
      showToast('Staff member updated.', 'success');
    } else {
      await apiPost(HC_CONFIG.ENDPOINTS.ORG_ADMIN_STAFF, payload);
      showToast('Staff account created.', 'success');
    }
    closeAllPanels();
    _loaded.delete('staff');
    loadStaff();
  } catch(err) {
    showToast(hc_formatApiError(err?.data,editId ? 'Failed to update staff.' : 'Failed to create staff.'), 'error');
  } finally {
    setButtonLoading(btn, false, editId ? 'Save Changes' : 'Create Staff');
  }
}

function confirmToggleStaff(id, makeActive) {
  const staff = _staffCache.find(s => String(s.id) === String(id));
  const name = staff ? staff.full_name : 'this staff member';
  const action = makeActive === 'true' || makeActive === true ? 'activate' : 'suspend';

  showConfirmModal({
    title: action === 'activate' ? 'Activate Staff' : 'Suspend Staff',
    message: 'Are you sure you want to ' + action + ' ' + name + '?',
    confirmText: action === 'activate' ? 'Activate' : 'Suspend',
    confirmClass: action === 'activate' ? 'btn-primary' : 'btn-danger',
    onConfirm: function() { toggleStaffStatus(id, action === 'activate'); },
  });
}

async function toggleStaffStatus(id, isActive) {
  try {
    await apiPatch(HC_CONFIG.ENDPOINTS.ORG_ADMIN_STAFF + id + '/status/', { is_active: isActive });
    showToast('Staff status updated.', 'success');
  } catch(err) {
    showToast(hc_formatApiError(err?.data,'Failed to update staff status.'), 'error');
  }
  _loaded.delete('staff');
  loadStaff();
}

function viewStaffDetail(id) {
  const staff = _staffCache.find(s => String(s.id) === String(id));
  if (!staff) return;

  const container = document.getElementById('staffDetailBody');
  if (!container) return;

  container.innerHTML =
    '<div class="detail-row"><span class="detail-label">Full Name</span><span class="detail-value">' + escapeHtml(staff.full_name || '-') + '</span></div>' +
    '<div class="detail-row"><span class="detail-label">Role</span><span class="detail-value">' + statusBadge(staff.role) + '</span></div>' +
    '<div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">' + escapeHtml(staff.email || '-') + '</span></div>' +
    '<div class="detail-row"><span class="detail-label">Phone</span><span class="detail-value">' + escapeHtml(staff.phone || '-') + '</span></div>' +
    '<div class="detail-row"><span class="detail-label">Status</span><span class="detail-value">' + statusBadge(staff.is_active ? 'active' : 'inactive') + '</span></div>' +
    (staff.created_at ? '<div class="detail-row"><span class="detail-label">Created</span><span class="detail-value">' + escapeHtml(formatDate(staff.created_at)) + '</span></div>' : '') +
    '<div class="detail-actions">' +
      '<button class="btn btn-primary" data-action="editStaff" data-id="' + escapeHtml(staff.id) + '">Edit</button>' +
      '<button class="btn ' + (staff.is_active ? 'btn-danger' : 'btn-ghost') + '" data-action="toggleStaff" data-id="' + escapeHtml(staff.id) + '" data-active="' + (!staff.is_active) + '">' + (staff.is_active ? 'Suspend' : 'Activate') + '</button>' +
    '</div>';

  openPanel('staffDetailPanel');
}


/* ══════════════════════════════════════════
   6. PATIENTS PAGE
══════════════════════════════════════════ */
const _patientSearchHandler = debounce(function() { _loaded.delete('patients'); loadPatients(); }, 400);

async function loadPatients(page) {
  const tbody = document.getElementById('patientTbody');
  if (tbody) tbody.innerHTML = shimmerRows(3, 6);

  const q = (document.getElementById('patientSearch')?.value || '').trim();

  const params = new URLSearchParams();
  if (q) params.set('search', q);
  if (page && page > 1) params.set('page', page);
  const path = HC_CONFIG.ENDPOINTS.ORG_ADMIN_PATIENTS + (params.toString() ? '?' + params.toString() : '');

  let items, responseData;
  try {
    responseData = await apiGet(path);
    items = Array.isArray(responseData) ? responseData : (responseData.results || []);
  } catch(err) {
    showToast('Failed to load patients.', 'error');
    items = [];
    responseData = {};
  }

  _patientsCache = items;
  setText('patientCount', items.length + ' patient' + (items.length !== 1 ? 's' : ''));

  if (!items.length) {
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No patients found.</td></tr>';
    renderPagination('patientPagination', {}, 'loadPatients');
    return;
  }

  if (tbody) tbody.innerHTML = items.map(p =>
    '<tr>' +
      '<td>' + escapeHtml(p.full_name || '-') + '</td>' +
      '<td class="td-mono">' + escapeHtml(p.healthclouda_id || '-') + '</td>' +
      '<td>' + escapeHtml(p.gender || '-') + '</td>' +
      '<td>' + escapeHtml(p.phone || '-') + '</td>' +
      '<td>' + escapeHtml(formatDate(p.last_visit)) + '</td>' +
      '<td>' + statusBadge(p.status || 'ACTIVE') + '</td>' +
    '</tr>'
  ).join('');

  renderPagination('patientPagination', responseData, 'loadPatients');
}


/* ══════════════════════════════════════════
   7. WARDS & BEDS PAGE
══════════════════════════════════════════ */
async function loadWards() {
  const container = document.getElementById('wardsContainer');
  if (!container) return;
  container.innerHTML = '<div style="padding:1rem">' + shimmerBlock() + '</div>';

  let wards;
  try {
    const data = await apiGet(HC_CONFIG.ENDPOINTS.ORG_ADMIN_WARDS_OVERVIEW);
    wards = Array.isArray(data) ? data : (data.results || []);
  } catch(err) {
    showToast('Failed to load wards.', 'error');
    wards = [];
  }

  if (!wards.length) {
    container.innerHTML = '<div class="empty-state">No ward data found.</div>';
    return;
  }

  container.innerHTML = '<div class="ward-cards">' + wards.map(w => {
    const beds = w.beds || [];
    const occ = w.occupied_beds || beds.filter(b => (b.status || '').toUpperCase() === 'OCCUPIED').length;
    const total = w.total_beds || beds.length || 0;
    return (
      '<div class="ward-card">' +
        '<div class="ward-card-head">' +
          '<div><div class="ward-name">' + escapeHtml(w.name || '-') + '</div>' +
          '<div class="ward-meta">' + escapeHtml(occ + '/' + total + ' occupied') + '</div></div>' +
          statusBadge(w.status || 'active') +
        '</div>' +
        '<div class="bed-grid">' + beds.map(b =>
          '<div class="bed-cell ' + ((b.status || '').toLowerCase() === 'occupied' ? 'occupied' : 'available') + '">' +
            '<div class="bed-no">' + escapeHtml(b.bed_number || '-') + '</div>' +
          '</div>'
        ).join('') + '</div>' +
      '</div>'
    );
  }).join('') + '</div>';
}


/* ══════════════════════════════════════════
   8. ACCESS REQUESTS PAGE
══════════════════════════════════════════ */
async function loadAccessRequests(page) {
  const tbody = document.getElementById('accessTbody');
  if (tbody) tbody.innerHTML = shimmerRows(3, 6);

  const status = document.getElementById('accessStatusFilter')?.value || '';

  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (page && page > 1) params.set('page', page);
  const path = HC_CONFIG.ENDPOINTS.ORG_ADMIN_ACCESS_REQUESTS + (params.toString() ? '?' + params.toString() : '');

  let items, responseData;
  try {
    responseData = await apiGet(path);
    items = Array.isArray(responseData) ? responseData : (responseData.results || []);
  } catch(err) {
    showToast('Failed to load access requests.', 'error');
    items = [];
    responseData = {};
  }

  _accessCache = items;
  setText('accessCount', items.length + ' request' + (items.length !== 1 ? 's' : ''));

  if (!items.length) {
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No access requests.</td></tr>';
    renderPagination('accessPagination', {}, 'loadAccessRequests');
    return;
  }

  if (tbody) tbody.innerHTML = items.map(a => {
    const canReview = String(a.status).toUpperCase() === 'PENDING';
    const actions = canReview
      ? '<button class="row-btn success" data-action="reviewAccess" data-id="' + escapeHtml(a.id) + '" data-decision="APPROVED">Approve</button>' +
        '<button class="row-btn danger" data-action="reviewAccess" data-id="' + escapeHtml(a.id) + '" data-decision="DENIED">Deny</button>'
      : '-';

    return (
      '<tr>' +
        '<td>' + escapeHtml(a.patient_name || '-') + '</td>' +
        '<td>' + escapeHtml(a.requested_by_name || a.requested_by || '-') + '</td>' +
        '<td>' + escapeHtml(a.reason || '-') + '</td>' +
        '<td>' + statusBadge(a.status || '-') + '</td>' +
        '<td>' + escapeHtml(formatDate(a.created_at)) + '</td>' +
        '<td><div class="row-actions">' + actions + '</div></td>' +
      '</tr>'
    );
  }).join('');

  renderPagination('accessPagination', responseData, 'loadAccessRequests');
}

function confirmReviewAccess(id, decision) {
  const req = _accessCache.find(a => String(a.id) === String(id));
  const patient = req ? req.patient_name : 'this request';
  const action = decision === 'APPROVED' ? 'approve' : 'deny';

  showConfirmModal({
    title: action === 'approve' ? 'Approve Access' : 'Deny Access',
    message: 'Are you sure you want to ' + action + ' the access request for ' + patient + '?',
    confirmText: action === 'approve' ? 'Approve' : 'Deny',
    confirmClass: action === 'approve' ? 'btn-primary' : 'btn-danger',
    onConfirm: function() { reviewAccessRequest(id, decision); },
  });
}

async function reviewAccessRequest(id, decision) {
  try {
    await apiPatch(HC_CONFIG.ENDPOINTS.ORG_ADMIN_ACCESS_REQUESTS + id + '/review/', { decision: decision });
    showToast('Request ' + decision.toLowerCase() + '.', 'success');
  } catch(err) {
    showToast(hc_formatApiError(err?.data,'Failed to review request.'), 'error');
  }
  _loaded.delete('access');
  loadAccessRequests();
  _loaded.delete('dashboard');
  loadDashboard();
}


/* ══════════════════════════════════════════
   9. NOTIFICATIONS PAGE
══════════════════════════════════════════ */
async function loadNotifications() {
  const container = document.getElementById('notificationsContainer');
  if (container) container.innerHTML = '<div style="padding:1rem">' + shimmerBlock() + '</div>';

  let items;
  try {
    const data = await apiGet(HC_CONFIG.ENDPOINTS.STAFF_NOTIFS);
    items = Array.isArray(data) ? data : (data.results || []);
  } catch(err) {
    showToast('Failed to load notifications.', 'error');
    items = [];
  }
  _notifCache = items;
  renderNotifications();
}

function renderNotifications() {
  const container = document.getElementById('notificationsContainer');
  if (!container) return;
  if (!_notifCache.length) {
    container.innerHTML = '<div class="empty-state">No notifications.</div>';
    updateNotifBadge(0);
    return;
  }

  container.innerHTML = '<div class="notif-list-page">' + _notifCache.map(n =>
    '<div class="notif-item ' + (!n.is_read ? 'unread' : '') + '" data-action="markNotifRead" data-id="' + escapeHtml(n.id) + '">' +
      '<div>' +
        '<div class="notif-title">' + escapeHtml(n.title || '-') + '</div>' +
        '<div class="notif-message">' + escapeHtml(n.message || '-') + '</div>' +
        '<div class="notif-meta">' + escapeHtml(formatTimeAgo(n.created_at)) + '</div>' +
      '</div>' +
    '</div>'
  ).join('') + '</div>';

  updateNotifBadge(_notifCache.filter(n => !n.is_read).length);
}

async function markNotificationRead(id) {
  const row = _notifCache.find(n => String(n.id) === String(id));
  if (!row || row.is_read) return;
  row.is_read = true;
  renderNotifications();
  try {
    await apiPatch(HC_CONFIG.ENDPOINTS.STAFF_NOTIFS + id + '/read/');
  } catch(e) {}
}

async function markAllNotificationsRead() {
  _notifCache.forEach(n => { n.is_read = true; });
  renderNotifications();
  try {
    for (const n of _notifCache) {
      await apiPatch(HC_CONFIG.ENDPOINTS.STAFF_NOTIFS + n.id + '/read/').catch(function() {});
    }
  } catch(e) {}
  showToast('All notifications marked as read.', 'success');
}

function updateNotifBadge(count) {
  const value = count > 99 ? '99+' : String(count || 0);
  ['headerNotifBadge', 'sidebarNotifBadge'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = value;
    el.classList.toggle('hidden', count === 0);
  });
}

async function refreshUnreadCount() {
  try {
    const data = await apiGet(HC_CONFIG.ENDPOINTS.STAFF_UNREAD);
    updateNotifBadge(data.count || data.unread_count || 0);
  } catch(e) {
    /* silent — badge stays as-is */
  }
}
let _notifPollInterval = setInterval(refreshUnreadCount, 30000);
refreshUnreadCount();


/* ══════════════════════════════════════════
   10. SETTINGS PAGE
══════════════════════════════════════════ */
async function loadSettings() {
  let settings;
  try {
    settings = await apiGet(HC_CONFIG.ENDPOINTS.ORG_ADMIN_SETTINGS);
  } catch(err) {
    showToast('Failed to load settings.', 'error');
    settings = {};
  }

  document.getElementById('setOrgName').value = settings.org_name || settings.name || '';
  document.getElementById('setOrgEmail').value = settings.support_email || settings.email || '';
  document.getElementById('setOrgPhone').value = settings.support_phone || settings.phone || '';
  document.getElementById('setOrgAddress').value = settings.address || '';
}

async function saveSettings(e) {
  e.preventDefault();
  const btn = document.getElementById('saveSettingsBtn');
  const payload = {
    org_name: document.getElementById('setOrgName').value.trim(),
    support_email: document.getElementById('setOrgEmail').value.trim(),
    support_phone: document.getElementById('setOrgPhone').value.trim(),
    address: document.getElementById('setOrgAddress').value.trim(),
  };

  setButtonLoading(btn, true, 'Saving...');
  try {
    await apiPatch(HC_CONFIG.ENDPOINTS.ORG_ADMIN_SETTINGS, payload);
    showToast('Settings saved.', 'success');
  } catch(err) {
    showToast(hc_formatApiError(err?.data,'Failed to save settings.'), 'error');
  } finally {
    setButtonLoading(btn, false, 'Save Settings');
  }
}

let _changePwInit = false;
function initChangePasswordOnce() {
  if (_changePwInit) return;
  _changePwInit = true;
  if (typeof hc_initChangePasswordForm === 'function') {
    hc_initChangePasswordForm();
  }
}


/* ══════════════════════════════════════════
   11. UI CONTROLS
══════════════════════════════════════════ */
function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('open');
  document.getElementById('mobileOverlay')?.classList.toggle('open');
  document.getElementById('hamburgerBtn')?.classList.toggle('open');
}
function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('mobileOverlay')?.classList.remove('open');
  document.getElementById('hamburgerBtn')?.classList.remove('open');
}
function goToNotifications() {
  document.querySelector('.nav-item[data-page="notifications"]')?.click();
}


/* ══════════════════════════════════════════
   12. LOGOUT
══════════════════════════════════════════ */
async function orgAdminLogout() {
  clearInterval(_dashRefreshInterval);
  clearInterval(_notifPollInterval);

  let slug = '';
  try { slug = hc_getUser()?.organization_slug || ''; } catch(e) {}

  try { await apiPost(HC_CONFIG.ENDPOINTS.LOGOUT, { refresh: hc_getRefreshToken() }); } catch(e) {}
  try { hc_clearTokens(); } catch(e) {}

  window.location.href = HC_ROUTER.signinPath({ organization_slug: slug });
}


/* ══════════════════════════════════════════
   13. VISIBILITY API (pause polling when tab hidden)
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
   14. EVENT DELEGATION (CSP-safe)
══════════════════════════════════════════ */
document.addEventListener('click', function(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;
  const id = btn.dataset.id;

  switch (action) {
    /* ── Staff actions ── */
    case 'viewStaff':
      viewStaffDetail(id);
      break;
    case 'editStaff':
      e.stopPropagation();
      closeAllPanels();
      openEditStaffPanel(id);
      break;
    case 'toggleStaff':
      e.stopPropagation();
      confirmToggleStaff(id, btn.dataset.active);
      break;

    /* ── Access request actions ── */
    case 'reviewAccess':
      confirmReviewAccess(id, btn.dataset.decision);
      break;

    /* ── Notification actions ── */
    case 'markNotifRead':
      markNotificationRead(id);
      break;

    /* ── Modal actions ── */
    case 'closeConfirmModal':
      closeModal('confirmModal');
      break;

    /* ── Logout ── */
    case 'logout':
      orgAdminLogout();
      break;

    /* ── Pagination ── */
    case 'paginate': {
      const fn = btn.dataset.fn;
      const pg = parseInt(btn.dataset.page, 10);
      if (fn === 'loadStaff')          { _loaded.delete('staff');   loadStaff(pg); }
      else if (fn === 'loadPatients')  { _loaded.delete('patients'); loadPatients(pg); }
      else if (fn === 'loadAccessRequests') { _loaded.delete('access'); loadAccessRequests(pg); }
      break;
    }
  }
});
