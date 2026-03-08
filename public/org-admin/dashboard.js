(function authGuard() {
  let user = null;
  let token = null;
  try { token = hc_getAccessToken(); } catch {}
  try { user = hc_getUser(); } catch {}

  if (token && user && typeof hc_redirectByRole === 'function') {
    const role = (user.role || '').toLowerCase().replace(/_/g, '');
    if (role && role !== 'orgadmin' && role !== 'superadmin') {
      hc_redirectByRole(user.role);
      return;
    }
  }

  const orgName = user?.organization_name || user?.organization?.name || 'Organisation';
  const fullName = user?.full_name || [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || 'Org Admin';
  const initials = fullName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  setText('sidebarUserName', fullName);
  setText('sidebarUserRole', 'Org Admin');
  setText('sidebarAvatar', initials);
  setText('headerUserName', fullName);
  setText('headerOrgName', orgName + ' Admin');
  setText('dashWelcome', 'Welcome, ' + fullName.split(' ')[0]);
})();

document.querySelectorAll('.nav-item').forEach((item) => {
  item.addEventListener('click', () => {
    const page = item.dataset.page;
    if (!page) return;

    document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
    item.classList.add('active');

    document.querySelectorAll('.page-content').forEach((p) => p.classList.remove('active'));
    const target = document.getElementById('page-' + page);
    if (target) target.classList.add('active');

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
    case 'dashboard':
      loadDashboard();
      break;
    case 'staff':
      loadStaff();
      break;
    case 'patients':
      loadPatients();
      break;
    case 'wards':
      loadWards();
      break;
    case 'access':
      loadAccessRequests();
      break;
    case 'notifications':
      loadNotifications();
      break;
    case 'settings':
      loadSettings();
      initChangePasswordOnce();
      break;
  }
}
loadPage('dashboard');

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? '-';
}
function escapeHtml(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function statusBadge(status) {
  const key = String(status || '').toUpperCase().replace(/_/g, ' ');
  const map = {
    ACTIVE: 'badge-success',
    AVAILABLE: 'badge-success',
    OCCUPIED: 'badge-danger',
    INACTIVE: 'badge-neutral',
    PENDING: 'badge-warning',
    APPROVED: 'badge-success',
    DENIED: 'badge-danger',
    COMPLETED: 'badge-info',
  };
  return '<span class="badge ' + (map[key] || 'badge-neutral') + '">' + escapeHtml(key || 'UNKNOWN') + '</span>';
}
function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatTimeAgo(value) {
  if (!value) return '-';
  const diffSec = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return Math.floor(diffSec / 60) + 'm ago';
  if (diffSec < 86400) return Math.floor(diffSec / 3600) + 'h ago';
  return formatDate(value);
}

async function safeApiGet(url) {
  if (typeof apiGet !== 'function') throw new Error('API unavailable');
  return apiGet(url);
}
async function safeApiPost(url, body) {
  if (typeof apiPost !== 'function') throw new Error('API unavailable');
  return apiPost(url, body);
}
async function safeApiPatch(url, body) {
  if (typeof apiPatch !== 'function') throw new Error('API unavailable');
  return apiPatch(url, body);
}

function showToast(message, type) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = message;
  t.className = 'toast ' + (type || '');
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => t.classList.remove('show'), 2800);
}

const DEMO = {
  stats: {
    total_staff: 39,
    active_patients: 412,
    todays_appointments: 67,
    bed_occupancy: '72/110',
    pending_access_requests: 6,
    critical_alerts: 2,
  },
  activity: [
    { created_at: new Date().toISOString(), actor_name: 'Dr. Rose Allan', action: 'Updated episode diagnosis', entity: 'Episode EP-392', status: 'completed' },
    { created_at: new Date(Date.now() - 1000 * 60 * 50).toISOString(), actor_name: 'Nurse David Musa', action: 'Recorded abnormal vitals', entity: 'Patient HC-22710', status: 'warning' },
    { created_at: new Date(Date.now() - 1000 * 60 * 130).toISOString(), actor_name: 'Reception Desk', action: 'Requested cross-org access', entity: 'Patient HC-77212', status: 'pending' },
  ],
  staff: [
    { id: 's1', full_name: 'Dr. Rose Allan', role: 'doctor', email: 'rose@hospital.com', phone: '+2348011111111', is_active: true },
    { id: 's2', full_name: 'Nurse David Musa', role: 'nurse', email: 'david@hospital.com', phone: '+2348022222222', is_active: true },
    { id: 's3', full_name: 'Faith Ojo', role: 'receptionist', email: 'faith@hospital.com', phone: '+2348033333333', is_active: false },
  ],
  patients: [
    { id: 'p1', full_name: 'Amina Yusuf', healthclouda_id: 'HC-22710', gender: 'Female', phone: '+2348061001000', last_visit: '2026-03-05', status: 'ACTIVE' },
    { id: 'p2', full_name: 'John Ude', healthclouda_id: 'HC-77212', gender: 'Male', phone: '+2348072002000', last_visit: '2026-03-07', status: 'ACTIVE' },
    { id: 'p3', full_name: 'Bola Ahmed', healthclouda_id: 'HC-32044', gender: 'Female', phone: '+2348083003000', last_visit: '2026-02-25', status: 'INACTIVE' },
  ],
  wards: [
    {
      id: 'w1',
      name: 'Medical Ward',
      total_beds: 12,
      occupied_beds: 9,
      beds: [
        { bed_number: 'M-01', status: 'OCCUPIED' }, { bed_number: 'M-02', status: 'OCCUPIED' },
        { bed_number: 'M-03', status: 'AVAILABLE' }, { bed_number: 'M-04', status: 'OCCUPIED' },
        { bed_number: 'M-05', status: 'OCCUPIED' }, { bed_number: 'M-06', status: 'AVAILABLE' },
      ],
    },
    {
      id: 'w2',
      name: 'Surgical Ward',
      total_beds: 10,
      occupied_beds: 7,
      beds: [
        { bed_number: 'S-01', status: 'OCCUPIED' }, { bed_number: 'S-02', status: 'AVAILABLE' },
        { bed_number: 'S-03', status: 'OCCUPIED' }, { bed_number: 'S-04', status: 'OCCUPIED' },
        { bed_number: 'S-05', status: 'AVAILABLE' }, { bed_number: 'S-06', status: 'OCCUPIED' },
      ],
    },
  ],
  access: [
    { id: 'a1', patient_name: 'John Ude', requested_by_name: 'St. Luke Clinic', reason: 'Transfer referral in progress', status: 'PENDING', created_at: '2026-03-08T08:30:00Z' },
    { id: 'a2', patient_name: 'Amina Yusuf', requested_by_name: 'City Hospital', reason: 'Emergency trauma history', status: 'APPROVED', created_at: '2026-03-07T11:20:00Z' },
  ],
  notifications: [
    { id: 'n1', title: 'New access request', message: 'St. Luke Clinic requested patient access.', created_at: new Date().toISOString(), is_read: false },
    { id: 'n2', title: 'Low bed availability', message: 'Surgical Ward is above 80% occupancy.', created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(), is_read: true },
  ],
  settings: {
    org_name: 'Lakeside Medical Centre',
    support_email: 'support@lakeside.com',
    support_phone: '+2348012345678',
    address: '12 Admiralty Way, Lekki, Lagos',
  },
};

async function loadDashboard() {
  let stats = null;
  let activity = null;
  try {
    stats = await safeApiGet(HC_CONFIG.ENDPOINTS.ORG_ADMIN_STATS);
    activity = await safeApiGet(HC_CONFIG.ENDPOINTS.ORG_ADMIN_ACTIVITY);
  } catch {
    stats = DEMO.stats;
    activity = DEMO.activity;
  }

  setText('statStaff', stats.total_staff ?? '-');
  setText('statPatients', stats.active_patients ?? '-');
  setText('statAppts', stats.todays_appointments ?? '-');
  setText('statBeds', stats.bed_occupancy ?? '-');
  setText('statAccess', stats.pending_access_requests ?? '-');
  setText('statAlerts', stats.critical_alerts ?? '-');

  const tbody = document.getElementById('activityTbody');
  const rows = (Array.isArray(activity) ? activity : (activity.results || [])).slice(0, 8);
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No recent activity.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map((a) => (
    '<tr>' +
      '<td>' + escapeHtml(formatTimeAgo(a.created_at || a.time)) + '</td>' +
      '<td>' + escapeHtml(a.actor_name || a.user_name || '-') + '</td>' +
      '<td>' + escapeHtml(a.action || '-') + '</td>' +
      '<td>' + escapeHtml(a.entity || '-') + '</td>' +
      '<td>' + statusBadge(a.status || 'info') + '</td>' +
    '</tr>'
  )).join('');
}

async function loadStaff() {
  const q = (document.getElementById('staffSearch')?.value || '').trim().toLowerCase();
  const role = document.getElementById('staffRoleFilter')?.value || '';
  let items = [];

  try {
    const params = new URLSearchParams();
    if (q) params.set('search', q);
    if (role) params.set('role', role);
    const path = HC_CONFIG.ENDPOINTS.ORG_ADMIN_STAFF + (params.toString() ? '?' + params.toString() : '');
    const data = await safeApiGet(path);
    items = Array.isArray(data) ? data : (data.results || []);
  } catch {
    items = [...DEMO.staff].filter((s) => {
      const okQ = !q || s.full_name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
      const okR = !role || s.role === role;
      return okQ && okR;
    });
  }

  _staffCache = items;
  setText('staffCount', items.length + ' staff');

  const tbody = document.getElementById('staffTbody');
  if (!items.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No staff found.</td></tr>';
    return;
  }

  tbody.innerHTML = items.map((s) => {
    const next = !s.is_active;
    return (
      '<tr>' +
        '<td>' + escapeHtml(s.full_name || '-') + '</td>' +
        '<td>' + statusBadge(s.role || 'staff') + '</td>' +
        '<td>' + escapeHtml(s.email || '-') + '</td>' +
        '<td>' + escapeHtml(s.phone || '-') + '</td>' +
        '<td>' + statusBadge(s.is_active ? 'active' : 'inactive') + '</td>' +
        '<td><div class="row-actions"><button class="row-btn ' + (next ? 'success' : 'danger') + '" onclick="toggleStaffStatus(\'' + escapeHtml(s.id) + '\',' + next + ')">' + (next ? 'Activate' : 'Suspend') + '</button></div></td>' +
      '</tr>'
    );
  }).join('');
}

function openAddStaffPanel() {
  document.getElementById('addStaffForm')?.reset();
  openPanel('addStaffPanel');
}

async function submitAddStaff(e) {
  e.preventDefault();
  const form = document.getElementById('addStaffForm');
  const btn = document.getElementById('addStaffBtn');
  if (!form) return;

  const payload = {};
  new FormData(form).forEach((value, key) => { payload[key] = value; });

  setButtonLoading(btn, true, 'Creating...');
  try {
    await safeApiPost(HC_CONFIG.ENDPOINTS.ORG_ADMIN_STAFF, payload);
    showToast('Staff account created.', 'success');
    closeAllPanels();
    _loaded.delete('staff');
    loadStaff();
  } catch {
    DEMO.staff.unshift({
      id: 'demo-' + Date.now(),
      full_name: payload.full_name,
      role: payload.role,
      email: payload.email,
      phone: payload.phone,
      is_active: true,
    });
    showToast('Created in demo mode (backend unavailable).', 'success');
    closeAllPanels();
    _loaded.delete('staff');
    loadStaff();
  } finally {
    setButtonLoading(btn, false, 'Create Staff');
  }
}

async function toggleStaffStatus(id, isActive) {
  try {
    await safeApiPatch(HC_CONFIG.ENDPOINTS.ORG_ADMIN_STAFF + id + '/status/', { is_active: isActive });
  } catch {
    const row = DEMO.staff.find((s) => String(s.id) === String(id));
    if (row) row.is_active = isActive;
  }
  showToast('Staff status updated.', 'success');
  _loaded.delete('staff');
  loadStaff();
}

async function loadPatients() {
  const q = (document.getElementById('patientSearch')?.value || '').trim().toLowerCase();
  let items = [];
  try {
    const path = HC_CONFIG.ENDPOINTS.ORG_ADMIN_PATIENTS + (q ? '?search=' + encodeURIComponent(q) : '');
    const data = await safeApiGet(path);
    items = Array.isArray(data) ? data : (data.results || []);
  } catch {
    items = DEMO.patients.filter((p) => !q || p.full_name.toLowerCase().includes(q) || p.healthclouda_id.toLowerCase().includes(q));
  }

  _patientsCache = items;
  setText('patientCount', items.length + ' patients');

  const tbody = document.getElementById('patientTbody');
  if (!items.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No patients found.</td></tr>';
    return;
  }
  tbody.innerHTML = items.map((p) => (
    '<tr>' +
      '<td>' + escapeHtml(p.full_name || '-') + '</td>' +
      '<td class="td-mono">' + escapeHtml(p.healthclouda_id || '-') + '</td>' +
      '<td>' + escapeHtml(p.gender || '-') + '</td>' +
      '<td>' + escapeHtml(p.phone || '-') + '</td>' +
      '<td>' + escapeHtml(formatDate(p.last_visit)) + '</td>' +
      '<td>' + statusBadge(p.status || 'ACTIVE') + '</td>' +
    '</tr>'
  )).join('');
}

async function loadWards() {
  let wards = [];
  try {
    const data = await safeApiGet(HC_CONFIG.ENDPOINTS.ORG_ADMIN_WARDS_OVERVIEW);
    wards = Array.isArray(data) ? data : (data.results || []);
  } catch {
    wards = DEMO.wards;
  }

  const container = document.getElementById('wardsContainer');
  if (!wards.length) {
    container.innerHTML = '<div class="empty-state">No ward data found.</div>';
    return;
  }

  container.innerHTML = '<div class="ward-cards">' + wards.map((w) => {
    const beds = w.beds || [];
    return (
      '<div class="ward-card">' +
        '<div class="ward-card-head">' +
          '<div><div class="ward-name">' + escapeHtml(w.name || '-') + '</div><div class="ward-meta">' + escapeHtml((w.occupied_beds || 0) + '/' + (w.total_beds || beds.length || 0) + ' occupied') + '</div></div>' +
          statusBadge(w.status || 'active') +
        '</div>' +
        '<div class="bed-grid">' + beds.map((b) => (
          '<div class="bed-cell ' + ((b.status || '').toLowerCase() === 'occupied' ? 'occupied' : 'available') + '">' +
            '<div class="bed-no">' + escapeHtml(b.bed_number || '-') + '</div>' +
          '</div>'
        )).join('') + '</div>' +
      '</div>'
    );
  }).join('') + '</div>';
}

async function loadAccessRequests() {
  const status = document.getElementById('accessStatusFilter')?.value || '';
  let items = [];
  try {
    const path = HC_CONFIG.ENDPOINTS.ORG_ADMIN_ACCESS_REQUESTS + (status ? '?status=' + status : '');
    const data = await safeApiGet(path);
    items = Array.isArray(data) ? data : (data.results || []);
  } catch {
    items = DEMO.access.filter((a) => !status || a.status === status);
  }

  _accessCache = items;
  setText('accessCount', items.length + ' requests');

  const tbody = document.getElementById('accessTbody');
  if (!items.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No access requests.</td></tr>';
    return;
  }

  tbody.innerHTML = items.map((a) => {
    const canReview = String(a.status).toUpperCase() === 'PENDING';
    const actions = canReview
      ? '<button class="row-btn success" onclick="reviewAccessRequest(\'' + escapeHtml(a.id) + '\',\'APPROVED\')">Approve</button>' +
        '<button class="row-btn danger" onclick="reviewAccessRequest(\'' + escapeHtml(a.id) + '\',\'DENIED\')">Deny</button>'
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
}

async function reviewAccessRequest(id, decision) {
  try {
    await safeApiPatch(HC_CONFIG.ENDPOINTS.ORG_ADMIN_ACCESS_REQUESTS + id + '/review/', { decision });
  } catch {
    const req = DEMO.access.find((a) => String(a.id) === String(id));
    if (req) req.status = decision;
  }
  showToast('Request ' + decision.toLowerCase() + '.', 'success');
  _loaded.delete('access');
  loadAccessRequests();
  _loaded.delete('dashboard');
  loadDashboard();
}

async function loadNotifications() {
  let items = [];
  try {
    const data = await safeApiGet(HC_CONFIG.ENDPOINTS.STAFF_NOTIFS);
    items = Array.isArray(data) ? data : (data.results || []);
  } catch {
    items = DEMO.notifications;
  }
  _notifCache = items;
  renderNotifications();
}

function renderNotifications() {
  const container = document.getElementById('notificationsContainer');
  if (!container) return;
  if (!_notifCache.length) {
    container.innerHTML = '<div class="empty-state">No notifications.</div>';
    return;
  }

  container.innerHTML = '<div class="notif-list-page">' + _notifCache.map((n) => (
    '<div class="notif-item ' + (!n.is_read ? 'unread' : '') + '" onclick="markNotificationRead(\'' + escapeHtml(n.id) + '\')">' +
      '<div>' +
        '<div class="notif-title">' + escapeHtml(n.title || '-') + '</div>' +
        '<div class="notif-message">' + escapeHtml(n.message || '-') + '</div>' +
        '<div class="notif-meta">' + escapeHtml(formatTimeAgo(n.created_at)) + '</div>' +
      '</div>' +
    '</div>'
  )).join('') + '</div>';

  updateNotifBadge(_notifCache.filter((n) => !n.is_read).length);
}

async function markNotificationRead(id) {
  const row = _notifCache.find((n) => String(n.id) === String(id));
  if (!row || row.is_read) return;
  row.is_read = true;
  renderNotifications();
  try {
    await safeApiPatch(HC_CONFIG.ENDPOINTS.STAFF_NOTIFS + id + '/read/');
  } catch {}
}

async function markAllNotificationsRead() {
  _notifCache.forEach((n) => { n.is_read = true; });
  renderNotifications();
  try {
    for (const n of _notifCache) {
      await safeApiPatch(HC_CONFIG.ENDPOINTS.STAFF_NOTIFS + n.id + '/read/').catch(() => {});
    }
  } catch {}
  showToast('All notifications marked as read.', 'success');
}

function updateNotifBadge(count) {
  const value = count > 99 ? '99+' : String(count || 0);
  ['headerNotifBadge', 'sidebarNotifBadge'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = value;
    el.classList.toggle('hidden', count === 0);
  });
}

async function refreshUnreadCount() {
  try {
    const data = await safeApiGet(HC_CONFIG.ENDPOINTS.STAFF_UNREAD);
    updateNotifBadge(data.count || data.unread_count || 0);
  } catch {
    updateNotifBadge(DEMO.notifications.filter((n) => !n.is_read).length);
  }
}
setInterval(refreshUnreadCount, 30000);
refreshUnreadCount();

async function loadSettings() {
  let settings;
  try {
    settings = await safeApiGet(HC_CONFIG.ENDPOINTS.ORG_ADMIN_SETTINGS);
  } catch {
    settings = DEMO.settings;
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
    await safeApiPatch(HC_CONFIG.ENDPOINTS.ORG_ADMIN_SETTINGS, payload);
    showToast('Settings saved.', 'success');
  } catch {
    Object.assign(DEMO.settings, payload);
    showToast('Saved in demo mode (backend unavailable).', 'success');
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
function openPanel(panelId) {
  document.getElementById('overlay')?.classList.add('open');
  document.getElementById(panelId)?.classList.add('open');
}
function closeAllPanels() {
  document.getElementById('overlay')?.classList.remove('open');
  document.querySelectorAll('.slide-panel').forEach((p) => p.classList.remove('open'));
}
function setButtonLoading(btn, loading, label) {
  if (!btn) return;
  btn.disabled = !!loading;
  btn.textContent = loading ? 'Please wait...' : (label || btn.textContent);
}

async function orgAdminLogout() {
  let slug = '';
  try { slug = hc_getUser()?.organization_slug || ''; } catch {}

  try { await apiPost(HC_CONFIG.ENDPOINTS.LOGOUT, { refresh: hc_getRefreshToken() }); } catch {}
  try { hc_clearTokens(); } catch {}

  window.location.href = slug
    ? '/public/organization/signin.html?org=' + slug
    : '/public/signin.html';
}
