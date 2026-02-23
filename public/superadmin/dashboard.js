/* ═══════════════════════════════════════════════════════════
   HealthClouda — Super Admin Dashboard Logic
   Requires (in order): config.js → api.js → auth.js → this file
═══════════════════════════════════════════════════════════ */


/* ══════════════════════════════════════════
   1. AUTH GUARD
   Runs immediately — if the user is not a
   logged-in superadmin, redirect them away.
══════════════════════════════════════════ */
(function authGuard() {
  const user  = hc_getUser();
  const token = hc_getAccessToken();

  // Not logged in at all → back to signin
  if (!token || !user) {
    window.location.href = '/public/signin.html';
    return;
  }

  // Logged in but wrong role → their own dashboard
  if (user.role !== HC_CONFIG.ROLES.SUPERADMIN) {
    const redirect = HC_CONFIG.ROLE_REDIRECTS[user.role?.toUpperCase()];
    window.location.href = redirect || '/public/signin.html';
    return;
  }

  // Correct role — populate sidebar user info from real token data
  const nameEl   = document.getElementById('sidebarUserName');
  const roleEl   = document.getElementById('sidebarUserRole');
  const avatarEl = document.getElementById('sidebarAvatar');
  if (nameEl)   nameEl.textContent   = user.full_name || user.email || 'Super Admin';
  if (roleEl)   roleEl.textContent   = 'Super Admin';
  if (avatarEl) avatarEl.textContent = (user.full_name || 'SA')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
})();


/* ══════════════════════════════════════════
   2. NAVIGATION
══════════════════════════════════════════ */
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    const page = item.dataset.page;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    const target = document.getElementById('page-' + page);
    if (target) target.classList.add('active');
    loadPage(page);
    if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
  });
});

// Track which pages have already fetched data (lazy-load once per session)
const _loaded = new Set();

function loadPage(page) {
  if (_loaded.has(page)) return;
  _loaded.add(page);
  switch (page) {
    case 'dashboard':     loadDashboard(); break;
    case 'organisations': loadOrgs();      break;
    case 'audit':         loadAuditLogs(); break;
    // Other pages wired as their sprints are built
  }
}

// Boot — load dashboard data immediately
loadPage('dashboard');


/* ══════════════════════════════════════════
   3. LOADING / SKELETON HELPERS
══════════════════════════════════════════ */
function skeletonRow(cols) {
  return `<tr>${Array(cols).fill(`
    <td><div style="height:13px;border-radius:6px;background:linear-gradient(90deg,#f0f4fa 25%,#e2e8f0 50%,#f0f4fa 75%);background-size:200%;animation:shimmer 1.4s infinite;margin:4px 0;"></div></td>
  `).join('')}</tr>`;
}

// Inject shimmer keyframe once
const _shimmer = document.createElement('style');
_shimmer.textContent = `@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`;
document.head.appendChild(_shimmer);

function showSkeletonRows(tbodyId, cols, rows = 5) {
  const tbody = document.getElementById(tbodyId);
  if (tbody) tbody.innerHTML = Array(rows).fill(skeletonRow(cols)).join('');
}

function setButtonLoading(btn, isLoading, label) {
  if (!btn) return;
  btn.disabled    = isLoading;
  btn.textContent = isLoading ? 'Please wait…' : label;
  btn.style.opacity = isLoading ? '0.7' : '1';
}


/* ══════════════════════════════════════════
   4. DASHBOARD PAGE
══════════════════════════════════════════ */
async function loadDashboard() {
  await Promise.all([
    loadStats(),
    loadSystemHealth(),
    loadSecurityAlerts(),
    loadRecentActivity(),
  ]);
}

// ── 4a. Stat cards ───────────────────────────────────────────
async function loadStats() {
  ['statTotalUsers','statTotalOrgs','statRevenue','statRecords'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<span style="opacity:0.3;font-size:1rem">…</span>`;
  });

  try {
    const data = await apiGet(HC_CONFIG.ENDPOINTS.SA_STATS);
    // Expected: { total_users, total_orgs, monthly_revenue, active_records,
    //             users_trend, orgs_trend, revenue_trend, records_trend,
    //             users_trend_up, orgs_trend_up, revenue_trend_up, records_trend_up }

    document.getElementById('statTotalUsers').textContent = Number(data.total_users).toLocaleString();
    document.getElementById('statTotalOrgs').textContent  = Number(data.total_orgs).toLocaleString();
    document.getElementById('statRevenue').textContent    = '₦' + formatMoney(data.monthly_revenue);
    document.getElementById('statRecords').textContent    = Number(data.active_records).toLocaleString();

    setTrend('trendUsers',   data.users_trend,   data.users_trend_up);
    setTrend('trendOrgs',    data.orgs_trend,    data.orgs_trend_up);
    setTrend('trendRevenue', data.revenue_trend, data.revenue_trend_up);
    setTrend('trendRecords', data.records_trend, data.records_trend_up);

  } catch (err) {
    console.error('[SA] Stats:', err.message);
    ['statTotalUsers','statTotalOrgs','statRevenue','statRecords'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '—';
    });
    showToast('Could not load stats', 'error');
  }
}

function setTrend(id, value, isUp) {
  const el = document.getElementById(id);
  if (!el || value == null) return;
  const upArrow   = `<svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`;
  const downArrow = `<svg viewBox="0 0 24 24"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>`;
  el.className = `stat-trend ${isUp ? 'up' : 'down'}`;
  el.innerHTML  = (isUp ? upArrow : downArrow) + ' ' + value;
}

function formatMoney(n) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)         return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

// ── 4b. System health ────────────────────────────────────────
async function loadSystemHealth() {
  try {
    const data = await apiGet(HC_CONFIG.ENDPOINTS.SA_SYSTEM_HEALTH);
    // Expected: { api_status:'online'|'offline', db_status:'online'|'offline', last_backup:'ISO string' }
    setHealthItem('healthApi', data.api_status === 'online', 'API Status');
    setHealthItem('healthDb',  data.db_status  === 'online', 'Database');
    const backupEl = document.getElementById('healthBackup');
    if (backupEl && data.last_backup) backupEl.textContent = formatBackupTime(data.last_backup);
  } catch (err) {
    console.error('[SA] System health:', err.message);
  }
}

function setHealthItem(id, isOnline, label) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = `
    <span class="status-dot ${isOnline ? 'online' : 'offline'}"></span>
    <span>${label}: <b>${isOnline ? 'Online' : 'Offline'}</b></span>`;
}

function formatBackupTime(iso) {
  const d   = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
  return (d.toDateString() === now.toDateString() ? 'Today ' : d.toLocaleDateString() + ' ') + time;
}

// ── 4c. Security alerts ──────────────────────────────────────
async function loadSecurityAlerts() {
  try {
    const data = await apiGet(HC_CONFIG.ENDPOINTS.SA_SECURITY);
    // Expected: { failed_logins:5, locked_accounts:2, suspicious_activity:false }
    const flEl = document.getElementById('secFailedLogins');
    const laEl = document.getElementById('secLockedAccounts');
    const saEl = document.getElementById('secSuspicious');
    if (flEl) flEl.querySelector('.sec-count').textContent = data.failed_logins ?? '—';
    if (laEl) laEl.querySelector('.sec-count').textContent = data.locked_accounts ?? '—';
    if (saEl) {
      const clean = !data.suspicious_activity;
      saEl.className = `alert-item ${clean ? 'safe' : 'danger'}`;
      saEl.querySelector('.sec-label').textContent = clean
        ? 'No suspicious activity detected'
        : 'Suspicious activity flagged — review audit logs';
    }
  } catch (err) {
    console.error('[SA] Security alerts:', err.message);
  }
}

// ── 4d. Recent activity ──────────────────────────────────────
async function loadRecentActivity() {
  showSkeletonRows('activityTbody', 5, 5);
  try {
    const data = await apiGet(HC_CONFIG.ENDPOINTS.SA_ACTIVITY);
    // Expected: [ { time, user_id, action, entity, status } ]
    renderActivityTable(Array.isArray(data) ? data : (data.results || []));
  } catch (err) {
    console.error('[SA] Activity:', err.message);
    document.getElementById('activityTbody').innerHTML =
      `<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-soft);font-size:0.82rem;">Could not load recent activity.</td></tr>`;
  }
}

function renderActivityTable(rows) {
  const tbody = document.getElementById('activityTbody');
  if (!tbody) return;
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state" style="padding:2rem"><h3>No recent activity</h3></div></td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td style="font-size:0.78rem;color:var(--text-soft)">${formatRelativeTime(r.time)}</td>
      <td class="td-mono">${r.user_id || '—'}</td>
      <td class="td-action ${actionClass(r.status)}">${r.action || '—'}</td>
      <td>${r.entity || '—'}</td>
      <td>${statusBadge(r.status)}</td>
    </tr>
  `).join('');
}

function actionClass(status) {
  const s = (status || '').toLowerCase();
  if (s === 'failed' || s === 'suspended') return 'danger';
  return '';
}

function formatRelativeTime(iso) {
  if (!iso) return '—';
  const d   = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
  return (d.toDateString() === now.toDateString() ? 'Today, ' : 'Yesterday, ') + time;
}

function statusBadge(status) {
  if (!status) return '—';
  const map = {
    successful:'badge-success', success:'badge-success',
    completed:'badge-info',     suspended:'badge-danger',
    failed:'badge-danger',      warning:'badge-warning',
  };
  const cls = map[status.toLowerCase()] || 'badge-info';
  return `<span class="badge ${cls}">${status}</span>`;
}


/* ══════════════════════════════════════════
   5. ORGANISATIONS PAGE
══════════════════════════════════════════ */
let _orgsCache = [];
const ORG_COLOURS = ['#0075FF','#16a34a','#7c3aed','#ea580c','#0891b2','#db2777'];

async function loadOrgs() {
  showSkeletonRows('orgTableBody', 6, 6);
  try {
    const data  = await apiGet(HC_CONFIG.ENDPOINTS.SA_ORGS);
    _orgsCache  = Array.isArray(data) ? data : (data.results || []);
    renderOrgs(_orgsCache);
  } catch (err) {
    console.error('[SA] Orgs:', err.message);
    document.getElementById('orgTableBody').innerHTML =
      `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-soft);font-size:0.82rem;">
        Could not load organisations. ${err.message}</td></tr>`;
    showToast('Could not load organisations', 'error');
  }
}

function renderOrgs(data) {
  const tbody = document.getElementById('orgTableBody');
  if (!tbody) return;
  if (!data?.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state" style="padding:2rem">
      <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <h3>No organisations found</h3><p>Try a different search term.</p>
    </div></td></tr>`;
    return;
  }
  tbody.innerHTML = data.map((org, i) => {
    const colour   = org.color || ORG_COLOURS[i % ORG_COLOURS.length];
    const initials = org.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const typeCls  = org.type === 'Hospital' ? 'badge-blue' : 'badge-green';
    const planCls  = org.plan === 'Pro' ? 'badge-purple' : org.plan === 'Premium' ? 'badge-warning' : 'badge-info';
    const statCls  = org.status === 'Active' ? 'badge-success' : 'badge-danger';
    const isSusp   = org.status?.toLowerCase() === 'suspended';
    return `
      <tr style="${isSusp ? 'background:#fff5f5' : ''}">
        <td>
          <div class="org-name-cell">
            <div class="org-avatar" style="background:${colour}">${initials}</div>
            <span class="org-name">${org.name}</span>
          </div>
        </td>
        <td><span class="badge ${typeCls}">${org.type}</span></td>
        <td class="td-mono">${org.id}</td>
        <td><span class="badge ${planCls}">${org.plan}</span></td>
        <td><span class="badge ${statCls}">${org.status}</span></td>
        <td>
          <div class="row-actions">
            <button class="row-btn" onclick="viewOrg('${org.id}')">View</button>
            ${isSusp
              ? `<button class="row-btn" onclick="activateOrg('${org.id}','${org.name}')">Activate</button>`
              : `<button class="row-btn danger" onclick="suspendOrg('${org.id}','${org.name}')">Suspend</button>`}
          </div>
        </td>
      </tr>`;
  }).join('');
}

function filterOrgs(q) {
  const query = q.toLowerCase().trim();
  if (!query) { renderOrgs(_orgsCache); return; }
  renderOrgs(_orgsCache.filter(o =>
    o.name?.toLowerCase().includes(query) ||
    o.id?.toLowerCase().includes(query)   ||
    o.type?.toLowerCase().includes(query)
  ));
}

async function suspendOrg(id, name) {
  if (!confirm(`Suspend "${name}"? They will lose access immediately.`)) return;
  try {
    await apiPatch(`${HC_CONFIG.ENDPOINTS.SA_ORG_SUSPEND}${id}/suspend/`);
    const org = _orgsCache.find(o => o.id === id);
    if (org) org.status = 'Suspended';
    renderOrgs(_orgsCache);
    showToast(`${name} suspended`, 'error');
  } catch (err) {
    showToast(err.message || 'Could not suspend organisation', 'error');
  }
}

async function activateOrg(id, name) {
  try {
    await apiPatch(`${HC_CONFIG.ENDPOINTS.SA_ORG_ACTIVATE}${id}/activate/`);
    const org = _orgsCache.find(o => o.id === id);
    if (org) org.status = 'Active';
    renderOrgs(_orgsCache);
    showToast(`${name} reactivated`, 'success');
  } catch (err) {
    showToast(err.message || 'Could not activate organisation', 'error');
  }
}


/* ══════════════════════════════════════════
   6. VIEW ORG PANEL
══════════════════════════════════════════ */
async function viewOrg(id) {
  openPanel('viewOrgPanel');
  document.getElementById('viewOrgTitle').textContent = 'Loading…';
  document.getElementById('viewOrgBadge').innerHTML   = '';

  // Reset tabs to Overview
  document.querySelectorAll('#viewOrgPanel .tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('#viewOrgPanel .tab-content').forEach(c => c.classList.remove('active'));
  document.querySelector('#viewOrgPanel .tab-btn').classList.add('active');
  document.getElementById('tabOverview').classList.add('active');

  try {
    const org      = await apiGet(`${HC_CONFIG.ENDPOINTS.SA_ORG_DETAIL}${id}/`);
    const colour   = org.color || '#0075FF';
    const initials = org.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    document.getElementById('viewOrgTitle').textContent       = org.name;
    document.getElementById('viewOrgBadge').innerHTML         = `<span class="badge ${org.status === 'Active' ? 'badge-success' : 'badge-danger'}" style="margin-top:4px">${org.status}</span>`;
    document.getElementById('viewOrgAvatar').textContent      = initials;
    document.getElementById('viewOrgAvatar').style.background = colour;
    document.getElementById('viewOrgName').textContent        = org.name;
    document.getElementById('viewOrgAdmin').textContent       = 'Admin: ' + (org.admin || '—');
    document.getElementById('viewOrgEmail').textContent       = org.email   || '—';
    document.getElementById('viewOrgPhone').textContent       = org.phone   || '—';
    document.getElementById('viewOrgAddress').textContent     = org.address || '—';

    // Performance chart — backend may return array of weekly values
    const heights = org.performance || [40, 55, 30, 70, 45, 80, 60];
    const chart   = document.getElementById('viewOrgChart');
    if (chart) chart.innerHTML = heights.map((h, i) =>
      `<div class="mini-bar ${i === heights.length - 2 ? 'accent' : ''}" style="height:${h}%" title="Week ${i + 1}"></div>`
    ).join('');

    // Store for panel footer buttons
    document.getElementById('viewOrgPanel').dataset.orgId   = org.id;
    document.getElementById('viewOrgPanel').dataset.orgName = org.name;

  } catch (err) {
    document.getElementById('viewOrgTitle').textContent = 'Error loading organisation';
    showToast(err.message || 'Could not load organisation details', 'error');
  }
}

async function panelSuspendOrg() {
  const panel = document.getElementById('viewOrgPanel');
  await suspendOrg(panel.dataset.orgId, panel.dataset.orgName);
  closePanel('viewOrgPanel');
}


/* ══════════════════════════════════════════
   7. ADD ORGANISATION
══════════════════════════════════════════ */
async function submitAddOrg(e) {
  e.preventDefault();
  const name    = document.getElementById('newOrgName').value.trim();
  const type    = document.getElementById('newOrgType').value;
  const email   = document.getElementById('newOrgEmail').value.trim();
  const phone   = document.getElementById('newOrgPhone').value.trim();
  const address = document.getElementById('newOrgAddress').value.trim();
  const plan    = document.getElementById('newOrgPlan').value;

  if (!name || !type || !email || !phone || !address) {
    showToast('Please fill all required fields', 'error');
    return;
  }

  const btn = document.querySelector('#addOrgPanel .panel-footer .btn-primary');
  setButtonLoading(btn, true, 'Add Organisation');

  try {
    const newOrg = await apiPost(HC_CONFIG.ENDPOINTS.SA_ORGS, { name, type, email, phone, address, plan });
    _orgsCache.unshift(newOrg);
    renderOrgs(_orgsCache);
    document.getElementById('addOrgForm').reset();
    closePanel('addOrgPanel');
    showToast(`${name} added successfully`, 'success');
  } catch (err) {
    showToast(err.message || 'Could not add organisation', 'error');
  } finally {
    setButtonLoading(btn, false, 'Add Organisation');
  }
}


/* ══════════════════════════════════════════
   8. AUDIT LOGS PAGE
══════════════════════════════════════════ */
async function loadAuditLogs() {
  showSkeletonRows('auditTbody', 6, 8);
  try {
    const data = await apiGet(HC_CONFIG.ENDPOINTS.SA_AUDIT);
    const rows = Array.isArray(data) ? data : (data.results || []);
    const tbody = document.getElementById('auditTbody');
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state" style="padding:2rem"><h3>No audit logs</h3></div></td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map(r => `
      <tr>
        <td style="font-size:0.78rem">${r.timestamp ? new Date(r.timestamp).toLocaleString() : '—'}</td>
        <td class="td-mono">${r.user_id   || '—'}</td>
        <td>${r.action       || '—'}</td>
        <td>${r.entity       || '—'}</td>
        <td class="td-mono">${r.ip_address || '—'}</td>
        <td>${statusBadge(r.status)}</td>
      </tr>`).join('');
  } catch (err) {
    console.error('[SA] Audit logs:', err.message);
    document.getElementById('auditTbody').innerHTML =
      `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-soft);font-size:0.82rem;">Could not load audit logs.</td></tr>`;
  }
}


/* ══════════════════════════════════════════
   9. TABS
══════════════════════════════════════════ */
function switchTab(btn, contentId) {
  const panel = btn.closest('.slide-panel');
  panel.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  panel.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(contentId).classList.add('active');
}


/* ══════════════════════════════════════════
   10. PANEL HELPERS
══════════════════════════════════════════ */
function openPanel(id) {
  closeAllPanels();
  document.getElementById(id).classList.add('open');
  document.getElementById('overlay').classList.add('open');
}
function closePanel(id) {
  document.getElementById(id).classList.remove('open');
  document.getElementById('overlay').classList.remove('open');
}
function closeAllPanels() {
  document.querySelectorAll('.slide-panel').forEach(p => p.classList.remove('open'));
  document.getElementById('overlay').classList.remove('open');
}


/* ══════════════════════════════════════════
   11. TOAST
══════════════════════════════════════════ */
let _toastTimer;
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className   = `toast show ${type}`;
  clearTimeout(_toastTimer);
  _toastTimer   = setTimeout(() => t.classList.remove('show'), 3500);
}


/* ══════════════════════════════════════════
   12. LOGOUT
══════════════════════════════════════════ */
async function hc_logoutAdmin() {
  try {
    await apiPost(HC_CONFIG.ENDPOINTS.LOGOUT, { refresh: hc_getRefreshToken() });
  } catch (_) {
    // Logout API failure — still clear and redirect
  } finally {
    hc_clearTokens();
    window.location.href = '/public/signin.html';
  }
}


/* ══════════════════════════════════════════
   13. GLOBAL SEARCH
══════════════════════════════════════════ */
document.getElementById('globalSearch').addEventListener('input', function () {
  const q = this.value.trim();
  if (!q) return;
  // Jump to Organisations page
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector('[data-page="organisations"]').classList.add('active');
  document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
  document.getElementById('page-organisations').classList.add('active');
  // Load if needed, then filter
  if (!_loaded.has('organisations')) {
    loadPage('organisations');
    setTimeout(() => {
      document.getElementById('orgSearch').value = q;
      filterOrgs(q);
    }, 800);
  } else {
    document.getElementById('orgSearch').value = q;
    filterOrgs(q);
  }
});