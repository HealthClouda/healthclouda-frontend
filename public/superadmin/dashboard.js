/* ═══════════════════════════════════════════════════════════
   HealthClouda — Super Admin Dashboard (Production)
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
    window.location.href = HC_ROUTER.signinPath({ role: 'SUPERADMIN' });
    return;
  }

  /* ── Redirect if wrong role ── */
  if (user && typeof hc_redirectByRole === 'function') {
    const role = (user.role || '').toLowerCase().replace(/_/g, '');
    if (role && role !== 'superadmin') {
      hc_redirectByRole(user.role);
      return;
    }
  }

  const name = (user && (user.full_name || user.email)) || 'Super Admin';
  const el   = (id) => document.getElementById(id);
  if (el('sidebarUserName')) el('sidebarUserName').textContent = name;
  if (el('sidebarUserRole')) el('sidebarUserRole').textContent = 'Super Admin';
  if (el('sidebarAvatar'))   el('sidebarAvatar').textContent   =
    name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
})();


/* ══════════════════════════════════════════
   2. NAVIGATION
══════════════════════════════════════════ */
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    const page = item.dataset.page;
    if (!page) return;

    // Swap active nav
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    item.classList.add('active');

    // Swap visible page
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

    // Lazy-load data (only on first visit)
    loadPage(page);

    // Close sidebar on tablet/mobile after navigation
    if (window.innerWidth <= 1024) closeSidebar();
  });
});

/* ── Sidebar toggle (hamburger) ── */
function toggleSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('mobileOverlay');
  const hamburger = document.getElementById('hamburgerBtn');
  const isOpen   = sidebar?.classList.contains('open');
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
    case 'dashboard':     loadDashboard(); break;
    case 'organisations': loadOrgs();      break;
    case 'users':         loadUsers();     break;
    case 'records':       loadRecords();   break;
    case 'billing':       loadBilling();   break;
    case 'messages':      loadMessages();  break;
    case 'audit':         loadAuditLogs(); break;
    case 'settings':      loadSettings();  break;
  }
}
// Load dashboard on first paint
loadPage('dashboard');


/* ══════════════════════════════════════════
   3. HELPERS
══════════════════════════════════════════ */
// Shimmer skeleton animation
const _shimmer = document.createElement('style');
_shimmer.textContent = `@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`;
document.head.appendChild(_shimmer);

function skeletonRow(cols) {
  return `<tr>${Array(cols).fill(
    `<td><div style="height:13px;border-radius:6px;background:linear-gradient(90deg,#f0f4fa 25%,#e2e8f0 50%,#f0f4fa 75%);background-size:200%;animation:shimmer 1.4s infinite;margin:4px 0"></div></td>`
  ).join('')}</tr>`;
}
function showSkeletonRows(tbodyId, cols, rows = 5) {
  const tb = document.getElementById(tbodyId);
  if (tb) tb.innerHTML = Array(rows).fill(skeletonRow(cols)).join('');
}
function setButtonLoading(btn, loading, label) {
  if (!btn) return;
  btn.disabled    = loading;
  btn.textContent = loading ? 'Please wait…' : label;
  btn.style.opacity = loading ? '0.65' : '1';
}
function formatMoney(n) {
  if (n >= 1e9) return '₦' + (n/1e9).toFixed(1) + 'B';
  if (n >= 1e6) return '₦' + (n/1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '₦' + (n/1e3).toFixed(1) + 'K';
  return '₦' + n;
}
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}
function formatRelativeTime(iso) {
  if (!iso) return '—';
  const d   = new Date(iso);
  const now = new Date();
  const t   = d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
  if (d.toDateString() === now.toDateString()) return 'Today, ' + t;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday, ' + t;
  return d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) + ', ' + t;
}
function statusBadge(status) {
  if (!status) return '—';
  const map = { successful:'badge-success', success:'badge-success', completed:'badge-info',
                suspended:'badge-danger', failed:'badge-danger', warning:'badge-warning' };
  return `<span class="badge ${map[status.toLowerCase()] || 'badge-info'}">${status}</span>`;
}

function escapeHtml(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// Safe API wrapper — falls back to null if api.js not loaded
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
async function safeApiDelete(endpoint) {
  if (typeof apiDelete === 'function') return apiDelete(endpoint);
  throw new Error('No backend connection');
}


/* Demo data constants removed — empty-state rendering used when backend offline */


/* ══════════════════════════════════════════
   5. DASHBOARD PAGE
══════════════════════════════════════════ */
async function loadDashboard() {
  await Promise.all([loadStats(), loadSystemHealth(), loadSecurityAlerts(), loadRecentActivity()]);
}

async function loadStats() {
  // Show loading shimmer
  ['statTotalUsers','statTotalOrgs','statRevenue','statRecords'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '<div style="height:28px;width:80px;border-radius:6px;background:linear-gradient(90deg,#f0f4fa 25%,#e2e8f0 50%,#f0f4fa 75%);background-size:200%;animation:shimmer 1.4s infinite;margin:4px 0"></div>';
  });
  ['trendUsers','trendOrgs','trendRevenue','trendRecords'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.className = 'stat-trend'; el.innerHTML = ''; }
  });

  try {
    const d = await safeApiGet(HC_CONFIG.ENDPOINTS.SA_STATS);
    document.getElementById('statTotalUsers').textContent = Number(d.total_users).toLocaleString();
    document.getElementById('statTotalOrgs').textContent  = Number(d.total_orgs).toLocaleString();
    document.getElementById('statRevenue').textContent    = formatMoney(d.monthly_revenue);
    document.getElementById('statRecords').textContent    = Number(d.active_records).toLocaleString();
    setTrend('trendUsers',   d.users_trend,   d.users_trend_up);
    setTrend('trendOrgs',    d.orgs_trend,    d.orgs_trend_up);
    setTrend('trendRevenue', d.revenue_trend, d.revenue_trend_up);
    setTrend('trendRecords', d.records_trend, d.records_trend_up);
  } catch {
    // API not available — show empty state, not fake numbers
    ['statTotalUsers','statTotalOrgs','statRevenue','statRecords'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = `<span style="opacity:0.3;font-size:1.4rem">—</span>`;
    });
    ['trendUsers','trendOrgs','trendRevenue','trendRecords'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.className = 'stat-trend'; el.style.color='var(--text-soft)'; el.textContent = 'Awaiting backend'; }
    });
  }
}
function setTrend(id, value, isUp) {
  const el = document.getElementById(id);
  if (!el || value == null) return;
  const up   = `<svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`;
  const down = `<svg viewBox="0 0 24 24"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>`;
  el.className = `stat-trend ${isUp ? 'up' : 'down'}`;
  el.innerHTML = (isUp ? up : down) + ' ' + value;
}

async function loadSystemHealth() {
  // Show shimmer in health items
  ['healthApi','healthDb','healthBackup'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '<div style="height:14px;width:140px;border-radius:4px;background:linear-gradient(90deg,#f0f4fa 25%,#e2e8f0 50%,#f0f4fa 75%);background-size:200%;animation:shimmer 1.4s infinite"></div>';
  });
  try {
    const d = await safeApiGet(HC_CONFIG.ENDPOINTS.SA_SYSTEM_HEALTH);
    const setH = (id, ok, label) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = `<span class="status-dot ${ok?'online':'offline'}"></span><span>${label}: <b>${ok?'Online':'Offline'}</b></span>`;
    };
    setH('healthApi', d.api_status === 'online', 'API Status');
    setH('healthDb',  d.db_status  === 'online', 'Database');
    const bEl = document.getElementById('healthBackup');
    if (bEl && d.last_backup) bEl.textContent = formatDate(d.last_backup);
  } catch {
    document.getElementById('healthApi').innerHTML = `<span class="status-dot offline"></span><span>API Status: <b style="color:var(--text-soft)">Not connected</b></span>`;
    document.getElementById('healthDb').innerHTML  = `<span class="status-dot offline"></span><span>Database: <b style="color:var(--text-soft)">Not connected</b></span>`;
    const bEl = document.getElementById('healthBackup');
    if (bEl) bEl.textContent = '—';
  }
}

async function loadSecurityAlerts() {
  // Security alerts endpoint not available in backend — show placeholder
  document.getElementById('secFailedLogins')?.querySelector('.sec-count') && (document.getElementById('secFailedLogins').querySelector('.sec-count').textContent = '—');
  document.getElementById('secLockedAccounts')?.querySelector('.sec-count') && (document.getElementById('secLockedAccounts').querySelector('.sec-count').textContent = '—');
  const saEl = document.getElementById('secSuspicious');
  if (saEl) {
    saEl.className = 'alert-item';
    saEl.querySelector('.sec-label').textContent = 'Coming soon';
  }
}

async function loadRecentActivity() {
  showSkeletonRows('activityTbody', 5, 5);
  try {
    const d    = await safeApiGet(HC_CONFIG.ENDPOINTS.SA_ACTIVITY);
    const rows = Array.isArray(d) ? d : (d.results || []);
    renderActivityTable(rows);
  } catch {
    const tbody = document.getElementById('activityTbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-soft);font-size:0.82rem">
      No activity data — connect backend to load real activity
    </td></tr>`;
  }
}
function renderActivityTable(rows) {
  const tbody = document.getElementById('activityTbody');
  if (!rows.length) { tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-soft)">No recent activity</td></tr>`; return; }
  const actionCls = s => { const v=(s||'').toLowerCase(); return (v==='failed'||v==='suspended')?'danger':''; };
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td style="font-size:0.78rem;color:var(--text-soft)">${formatRelativeTime(r.time)}</td>
      <td class="td-mono">${r.user_id || '—'}</td>
      <td class="td-action ${actionCls(r.status)}">${r.action || '—'}</td>
      <td>${r.entity || '—'}</td>
      <td>${statusBadge(r.status)}</td>
    </tr>`).join('');
}


/* ══════════════════════════════════════════
   6. ORGANISATIONS
══════════════════════════════════════════ */
let _orgsCache    = [];
let _orgsFiltered = [];
let _orgsPage     = 1;
let _sortField    = '';
let _sortDir      = 'asc';
const ORGS_PER_PAGE = 10;
const ORG_COLOURS   = ['#0075FF','#16a34a','#7c3aed','#ea580c','#0891b2','#db2777','#0d9488','#b45309'];

async function loadOrgs() {
  showSkeletonRows('orgTableBody', 7, 6);
  try {
    const d    = await safeApiGet(HC_CONFIG.ENDPOINTS.SA_ORGS);
    _orgsCache = Array.isArray(d) ? d : (d.results || []);
  } catch {
    _orgsCache = [];
  }
  _orgsFiltered = [..._orgsCache];
  _orgsPage     = 1;
  renderOrgsPage();
}

// Filter
function orgFilterChange() {
  const q      = (document.getElementById('orgSearch')?.value    || '').toLowerCase().trim();
  const type   =  document.getElementById('filterType')?.value   || '';
  const status =  document.getElementById('filterStatus')?.value || '';
  _orgsFiltered = _orgsCache.filter(o => {
    if (q && !o.name?.toLowerCase().includes(q) && !o.id?.toLowerCase().includes(q) && !o.org_id?.toLowerCase().includes(q)) return false;
    if (type && o.org_type !== type) return false;
    if (status === 'active'    && o.is_active === false) return false;
    if (status === 'suspended' && o.is_active !== false) return false;
    return true;
  });
  _orgsPage = 1;
  renderOrgsPage();
}
function clearOrgFilters() {
  ['orgSearch','filterType','filterStatus'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  _orgsFiltered = [..._orgsCache];
  _orgsPage = 1;
  renderOrgsPage();
}

// Sort
function sortOrgs(field) {
  _sortDir   = _sortField === field ? (_sortDir==='asc'?'desc':'asc') : 'asc';
  _sortField = field;
  ['name','date'].forEach(f => {
    const el = document.getElementById('sort-'+f);
    if (!el) return;
    el.textContent = f===field ? (_sortDir==='asc'?'↑':'↓') : '↕';
    el.className   = 'sort-icon'+(f===field?' '+_sortDir:'');
  });
  _orgsFiltered.sort((a,b) => {
    let va, vb;
    if (field==='name') { va=a.name||''; vb=b.name||''; }
    if (field==='date') { va=new Date(a.created_at||0); vb=new Date(b.created_at||0); }
    if (va<vb) return _sortDir==='asc'?-1:1;
    if (va>vb) return _sortDir==='asc'?1:-1;
    return 0;
  });
  _orgsPage = 1;
  renderOrgsPage();
}

// Render
function renderOrgsPage() {
  const total = _orgsFiltered.length;
  const pages = Math.ceil(total/ORGS_PER_PAGE)||1;
  _orgsPage   = Math.min(_orgsPage, pages);
  const from  = (_orgsPage-1)*ORGS_PER_PAGE;
  const slice = _orgsFiltered.slice(from, from+ORGS_PER_PAGE);
  const countEl = document.getElementById('orgCount');
  if (countEl) countEl.textContent = total===0
    ? 'No organisations found'
    : `Showing ${from+1}–${Math.min(from+ORGS_PER_PAGE,total)} of ${total} organisation${total!==1?'s':''}`;
  renderOrgsTable(slice);
  renderPagination(pages);
}

function renderOrgsTable(data) {
  const tbody = document.getElementById('orgTableBody');
  if (!tbody) return;
  if (!data?.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state" style="padding:2.5rem">
      <svg viewBox="0 0 24 24"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11"/></svg>
      <h3>No organisations found</h3><p>Try adjusting your search or filters.</p>
    </div></td></tr>`;
    return;
  }
  tbody.innerHTML = data.map((org,i) => {
    const colour   = ORG_COLOURS[i%ORG_COLOURS.length];
    const initials = (org.name||'??').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const orgType  = org.org_type || '';
    const typeCls  = orgType==='HOSPITAL'?'badge-blue':orgType==='CLINIC'?'badge-green':'badge-info';
    const typeLabel = orgType==='HOSPITAL'?'Hospital':orgType==='CLINIC'?'Clinic':orgType==='SCHOOL_CLINIC'?'School Clinic':orgType||'—';
    const isActive = org.is_active !== false;
    const statCls  = isActive?'badge-success':'badge-danger';
    const statLabel = isActive?'Active':'Suspended';
    const location = [org.city, org.state].filter(Boolean).join(', ');
    return `
      <tr class="${!isActive?'row-suspended':''}">
        <td>
          <div class="org-name-cell">
            <div class="org-avatar" style="background:${colour}">${initials}</div>
            <div>
              <div class="org-name">${escapeHtml(org.name)}</div>
              ${location?`<div class="org-sub">${escapeHtml(location)}</div>`:''}
            </div>
          </div>
        </td>
        <td><span class="badge ${typeCls}">${escapeHtml(typeLabel)}</span></td>
        <td class="td-mono">${escapeHtml(org.org_id || org.id)}</td>
        <td class="td-mono">${escapeHtml(org.slug || '—')}</td>
        <td>
          <span class="badge ${statCls}">
            ${!isActive?'<span class="status-dot offline" style="width:6px;height:6px;display:inline-block;margin-right:4px;vertical-align:middle"></span>':''}
            ${statLabel}
          </span>
        </td>
        <td class="td-date">${formatDate(org.created_at)}</td>
        <td>
          <div class="row-actions">
            <button class="row-btn" onclick="viewOrg('${escapeHtml(org.id)}')">View</button>
            ${!isActive
              ? `<button class="row-btn success" onclick="activateOrg('${escapeHtml(org.id)}','${escapeHtml(org.name)}')">Activate</button>`
              : `<button class="row-btn warn"    onclick="suspendOrg('${escapeHtml(org.id)}','${escapeHtml(org.name)}')">Suspend</button>`}
            <button class="row-btn danger" onclick="promptDeleteOrg('${escapeHtml(org.id)}','${escapeHtml(org.name)}')">Delete</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

// Pagination
function renderPagination(totalPages) {
  const el = document.getElementById('orgPagination');
  if (!el) return;
  if (totalPages<=1) { el.innerHTML=''; return; }
  let html = `<button class="page-btn" onclick="goOrgPage(${_orgsPage-1})" ${_orgsPage===1?'disabled':''}>‹</button>`;
  for (let p=1; p<=totalPages; p++) {
    if (totalPages>7 && p>2 && p<totalPages-1 && Math.abs(p-_orgsPage)>1) {
      if (p===3||p===totalPages-2) html+=`<span class="page-ellipsis">…</span>`;
      continue;
    }
    html+=`<button class="page-btn ${p===_orgsPage?'active':''}" onclick="goOrgPage(${p})">${p}</button>`;
  }
  html+=`<button class="page-btn" onclick="goOrgPage(${_orgsPage+1})" ${_orgsPage===totalPages?'disabled':''}>›</button>`;
  el.innerHTML = html;
}
function goOrgPage(p) {
  _orgsPage = Math.max(1, Math.min(p, Math.ceil(_orgsFiltered.length/ORGS_PER_PAGE)||1));
  renderOrgsPage();
}

// Suspend / Activate
async function suspendOrg(id, name) {
  if (!confirm(`Suspend "${name}"? They will lose access immediately.`)) return;
  try {
    await safeApiPost(`${HC_CONFIG.ENDPOINTS.SA_ORG_SUSPEND}${id}/suspend/`);
  } catch {}
  const o = _orgsCache.find(o=>o.id===id); if(o) o.is_active=false;
  orgFilterChange();
  showToast(`${name} suspended`, 'error');
}
async function activateOrg(id, name) {
  try {
    await safeApiPost(`${HC_CONFIG.ENDPOINTS.SA_ORG_ACTIVATE}${id}/activate/`);
  } catch {}
  const o = _orgsCache.find(o=>o.id===id); if(o) o.is_active=true;
  orgFilterChange();
  showToast(`${name} reactivated`, 'success');
}

// Delete
let _deleteOrgId=null, _deleteOrgName=null;
function promptDeleteOrg(id, name) {
  _deleteOrgId=id; _deleteOrgName=name;
  document.getElementById('deleteModalBody').textContent =
    `You are about to permanently delete "${name}". All data will be lost and this cannot be undone.`;
  document.getElementById('deleteModal').classList.add('open');
}
function closeDeleteModal() {
  document.getElementById('deleteModal').classList.remove('open');
  _deleteOrgId=null;
}
async function confirmDeleteOrg() {
  if (!_deleteOrgId) return;
  const btn = document.getElementById('deleteConfirmBtn');
  setButtonLoading(btn, true, 'Delete');
  try {
    await safeApiDelete(`${HC_CONFIG.ENDPOINTS.SA_ORG_DETAIL}${_deleteOrgId}/`);
  } catch {}
  _orgsCache    = _orgsCache.filter(o=>o.id!==_deleteOrgId);
  _orgsFiltered = _orgsFiltered.filter(o=>o.id!==_deleteOrgId);
  closeDeleteModal();
  renderOrgsPage();
  showToast(`${_deleteOrgName} deleted`, 'error');
  setButtonLoading(btn, false, 'Delete');
}

// Export CSV
function exportOrgsCSV() {
  if (!_orgsFiltered.length) { showToast('No data to export',''); return; }
  const headers = ['Name','Type','ID','Status','City','State','Date Added','Email','Phone'];
  const rows    = _orgsFiltered.map(o =>
    [o.name,o.org_type,o.org_id||o.id,o.is_active!==false?'Active':'Suspended',
     o.city,o.state,
     o.created_at?new Date(o.created_at).toLocaleDateString():'',
     o.email,o.phone
    ].map(v=>`"${(v||'').toString().replace(/"/g,'""')}"`).join(',')
  );
  const csv  = [headers.join(','),...rows].join('\n');
  const blob = new Blob([csv],{type:'text/csv'});
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'),{href:url,download:`organisations-${new Date().toISOString().slice(0,10)}.csv`});
  a.click(); URL.revokeObjectURL(url);
  showToast('CSV downloaded','success');
}

// View Org Panel
let _viewingOrgId = null;
async function viewOrg(id) {
  _viewingOrgId = id;
  openPanel('viewOrgPanel');

  // Reset
  document.getElementById('viewOrgTitle').textContent = 'Loading…';
  document.getElementById('viewOrgBadge').innerHTML   = '';
  document.querySelectorAll('#viewOrgPanel .tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('#viewOrgPanel .tab-content').forEach(c=>c.classList.remove('active'));
  document.querySelector('#viewOrgPanel .tab-btn').classList.add('active');
  document.getElementById('tabOverview').classList.add('active');
  document.getElementById('orgUsersContent').innerHTML   = `<div class="tab-loading">Loading users…</div>`;
  document.getElementById('orgBillingContent').innerHTML = `<div class="tab-loading">Loading billing…</div>`;

  // Fetch or find in cache
  let org;
  try {
    org = await safeApiGet(`${HC_CONFIG.ENDPOINTS.SA_ORG_DETAIL}${id}/`);
  } catch {
    org = _orgsCache.find(o=>o.id===id);
  }
  if (!org) { showToast('Organisation not found','error'); return; }

  const initials = (org.name||'??').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const isActive = org.is_active !== false;
  const statLabel = isActive ? 'Active' : 'Suspended';
  const location = [org.city, org.state, org.country_name].filter(Boolean).join(', ');

  document.getElementById('viewOrgTitle').textContent       = org.name;
  document.getElementById('viewOrgBadge').innerHTML         = `<span class="badge ${!isActive?'badge-danger':'badge-success'}" style="margin-top:4px">${statLabel}</span>`;
  document.getElementById('viewOrgAvatar').textContent      = initials;
  document.getElementById('viewOrgAvatar').style.background = '#0075FF';
  document.getElementById('viewOrgName').textContent        = org.name;
  document.getElementById('viewOrgAdmin').textContent       = org.org_id || '—';
  document.getElementById('viewOrgEmail').textContent       = org.email   || '—';
  document.getElementById('viewOrgPhone').textContent       = org.phone   || '—';
  document.getElementById('viewOrgAddress').textContent     = org.address || '—';
  document.getElementById('viewOrgLocationVal').textContent = location    || '—';
  document.getElementById('viewOrgDate').textContent        = formatDate(org.created_at);

  // Slug, license, verified, landing URL
  document.getElementById('viewOrgSlug').textContent        = org.slug || '—';
  document.getElementById('viewOrgLicense').textContent     = org.license_number || '—';
  const isVerified = org.is_verified === true;
  const verifiedEl = document.getElementById('viewOrgVerified');
  verifiedEl.innerHTML = isVerified
    ? `<span class="badge badge-success">Verified</span>${org.verified_at ? ' — ' + formatDate(org.verified_at) : ''}`
    : `<span class="badge badge-danger">Not Verified</span>`;

  const landingEl = document.getElementById('viewOrgLandingUrl');
  if (org.slug) {
    const landingUrl = `${window.location.origin}${HC_ROUTER.orgLandingPath(org.slug)}`;
    landingEl.innerHTML = `<a href="${landingUrl}" target="_blank" rel="noopener" style="color:var(--accent);text-decoration:underline">${landingUrl}</a>`;
  } else {
    landingEl.textContent = '—';
  }

  // Statistics
  document.getElementById('viewOrgStaff').textContent    = org.total_staff    ?? 0;
  document.getElementById('viewOrgPatients').textContent  = org.total_patients ?? 0;
  document.getElementById('viewOrgEpisodes').textContent  = org.total_episodes ?? 0;

  const suspBtn = document.getElementById('panelSuspendBtn');
  if (suspBtn) {
    suspBtn.textContent = !isActive ? 'Activate' : 'Suspend';
    suspBtn.className   = `btn ${!isActive?'btn-success':'btn-danger'}`;
  }

  const heights = org.performance || [40,55,30,70,45,80,60];
  const chart   = document.getElementById('viewOrgChart');
  if (chart) chart.innerHTML = heights.map((h,i) =>
    `<div class="mini-bar ${i===heights.length-2?'accent':''}" style="height:${h}%" title="Week ${i+1}"></div>`
  ).join('');

  document.getElementById('viewOrgPanel').dataset.orgId    = org.id;
  document.getElementById('viewOrgPanel').dataset.orgName  = org.name;
  document.getElementById('viewOrgPanel').dataset.suspended = !isActive ? '1' : '0';
}

function switchOrgTab(btn, contentId) {
  const panel = btn.closest('.slide-panel');
  panel.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  panel.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(contentId).classList.add('active');
  if (contentId==='tabUsers'   && _viewingOrgId) loadOrgUsers(_viewingOrgId);
  if (contentId==='tabBilling' && _viewingOrgId) loadOrgBilling(_viewingOrgId);
}

async function loadOrgUsers(orgId) {
  const el = document.getElementById('orgUsersContent');
  el.innerHTML = '<div class="tab-loading">Loading users…</div>';

  // Ensure users cache is populated
  if (!_usersCache.length) {
    try {
      const d = await safeApiGet(HC_CONFIG.ENDPOINTS.SA_USERS);
      _usersCache = (Array.isArray(d) ? d : (d.results||[])).map(normalizeUser);
    } catch { _usersCache = []; }
  }

  // Filter users belonging to this org
  const orgUsers = _usersCache.filter(u =>
    u.organization?.id === orgId || u.organization_id === orgId
  );

  if (!orgUsers.length) {
    el.innerHTML = `<div class="empty-state" style="padding:1.5rem">
      <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
      <h3>No users</h3><p>No users found for this organisation.</p></div>`;
    return;
  }

  el.innerHTML = `<div class="org-users-count" style="font-size:0.8rem;color:var(--text-soft);margin-bottom:0.75rem">${orgUsers.length} user${orgUsers.length!==1?'s':''}</div>` +
    orgUsers.map(u => {
      const colour   = userColour(u.id);
      const initials = (u.full_name||u.email||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      const isActive = u.is_active !== false;
      return `<div class="org-user-item${!isActive?' suspended':''}" onclick="closePanel('viewOrgPanel');setTimeout(()=>viewUser('${escapeHtml(u.id)}'),300)">
        <div class="user-avatar" style="background:${colour};width:32px;height:32px;font-size:0.7rem;min-width:32px">${initials}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:500;font-size:0.85rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(u.full_name)||'—'}</div>
          <div style="font-size:0.75rem;color:var(--text-soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(u.email)}</div>
        </div>
        <span class="${roleBadgeClass(u.role)}" style="font-size:0.7rem;white-space:nowrap">${roleLabel(u.role)}</span>
        ${!isActive?'<span class="badge badge-danger" style="font-size:0.65rem;margin-left:4px">Suspended</span>':''}
      </div>`;
    }).join('');
}

async function loadOrgBilling(orgId) {
  const el = document.getElementById('orgBillingContent');
  el.innerHTML = `<div class="empty-state" style="padding:1.5rem">
    <svg viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
    <h3>Coming Soon</h3><p>Billing management will be available in a future update.</p></div>`;
}

async function panelSuspendOrg() {
  const panel  = document.getElementById('viewOrgPanel');
  const id     = panel.dataset.orgId;
  const name   = panel.dataset.orgName;
  const isSusp = panel.dataset.suspended === '1';
  if (isSusp) {
    await activateOrg(id, name);
  } else {
    if (!confirm(`Suspend "${name}"? They will lose access immediately.`)) return;
    await suspendOrg(id, name);
  }
  closePanel('viewOrgPanel');
}

// Add Org
async function submitAddOrg(e) {
  if (e && e.preventDefault) e.preventDefault();
  const name           = document.getElementById('newOrgName')?.value.trim();
  const org_type       = document.getElementById('newOrgType')?.value;
  const email          = document.getElementById('newOrgEmail')?.value.trim();
  const phone          = document.getElementById('newOrgPhone')?.value.trim();
  const address        = document.getElementById('newOrgAddress')?.value.trim();
  const city           = document.getElementById('newOrgCity')?.value.trim();
  const state          = document.getElementById('newOrgState')?.value.trim();
  const country_code   = document.getElementById('newOrgCountryCode')?.value.trim();
  const country_name   = document.getElementById('newOrgCountryName')?.value.trim();
  const license_number = document.getElementById('newOrgLicense')?.value.trim();
  if (!name||!org_type||!email||!address||!city||!state||!country_code||!country_name) {
    showToast('Please fill all required fields','error'); return;
  }

  const btn = document.querySelector('#addOrgPanel .panel-footer .btn-primary');
  setButtonLoading(btn, true, 'Add Organisation');
  const payload = {name,org_type,email,address,city,state,country_code,country_name};
  if (phone)          payload.phone = phone;
  if (license_number) payload.license_number = license_number;
  let newOrg;
  try {
    newOrg = await safeApiPost(HC_CONFIG.ENDPOINTS.SA_ORGS, payload);
  } catch {
    showToast('Could not add organisation — backend offline', 'error');
    setButtonLoading(btn, false, 'Add Organisation');
    return;
  }
  _orgsCache.unshift(newOrg);
  _orgsFiltered = [..._orgsCache];
  renderOrgsPage();
  document.getElementById('addOrgForm').reset();
  closePanel('addOrgPanel');
  showToast(`${name} added successfully`, 'success');
  setButtonLoading(btn, false, 'Add Organisation');
}

// Edit Org
function openEditOrgPanel() {
  const panel = document.getElementById('viewOrgPanel');
  const id    = panel.dataset.orgId;
  const org   = _orgsCache.find(o=>o.id===id);
  if (!org) return;
  document.getElementById('editOrgSubtitle').textContent   = `Editing: ${org.name}`;
  document.getElementById('editOrgName').value             = org.name         || '';
  document.getElementById('editOrgAddress').value          = org.address      || '';
  document.getElementById('editOrgCity').value             = org.city         || '';
  document.getElementById('editOrgState').value            = org.state        || '';
  document.getElementById('editOrgCountryCode').value      = org.country_code || '';
  document.getElementById('editOrgCountryName').value      = org.country_name || '';
  document.getElementById('editOrgEmail').value            = org.email        || '';
  document.getElementById('editOrgPhone').value            = org.phone        || '';
  document.getElementById('editOrgType').value             = org.org_type     || '';
  document.getElementById('editOrgLicense').value          = org.license_number || '';
  document.getElementById('editOrgPanel').dataset.orgId    = id;
  openPanel('editOrgPanel');
}
async function submitEditOrg(e) {
  if (e && e.preventDefault) e.preventDefault();
  const id             = document.getElementById('editOrgPanel').dataset.orgId;
  const name           = document.getElementById('editOrgName')?.value.trim();
  const address        = document.getElementById('editOrgAddress')?.value.trim();
  const city           = document.getElementById('editOrgCity')?.value.trim();
  const state          = document.getElementById('editOrgState')?.value.trim();
  const country_code   = document.getElementById('editOrgCountryCode')?.value.trim();
  const country_name   = document.getElementById('editOrgCountryName')?.value.trim();
  const email          = document.getElementById('editOrgEmail')?.value.trim();
  const phone          = document.getElementById('editOrgPhone')?.value.trim();
  const org_type       = document.getElementById('editOrgType')?.value;
  const license_number = document.getElementById('editOrgLicense')?.value.trim();
  if (!name||!address||!email||!org_type||!city||!state||!country_code||!country_name) {
    showToast('Please fill all required fields','error'); return;
  }

  const btn = document.getElementById('editOrgSaveBtn');
  setButtonLoading(btn, true, 'Save Changes');
  const payload = {name,address,city,state,country_code,country_name,email,phone,org_type};
  if (license_number) payload.license_number = license_number;
  try {
    await safeApiPatch(`${HC_CONFIG.ENDPOINTS.SA_ORG_DETAIL}${id}/`, payload);
  } catch {}
  const idx = _orgsCache.findIndex(o=>o.id===id);
  if (idx>-1) Object.assign(_orgsCache[idx], payload);
  orgFilterChange();
  closePanel('editOrgPanel');
  showToast(`${name} updated`, 'success');
  setButtonLoading(btn, false, 'Save Changes');
}


/* ══════════════════════════════════════════
   7. USERS
══════════════════════════════════════════ */
let _usersCache    = [];
let _usersFiltered = [];
let _usersPage     = 1;
let _userSortField = '';
let _userSortDir   = 'asc';
const USERS_PER_PAGE = 10;
const USER_COLOURS   = ['#0075FF','#16a34a','#7c3aed','#ea580c','#0891b2','#db2777','#0d9488','#b45309'];

function userColour(id) {
  let hash = 0;
  for (let i=0; i<(id||'').length; i++) hash=(hash*31+id.charCodeAt(i))>>>0;
  return USER_COLOURS[hash%USER_COLOURS.length];
}
const ROLE_LABELS = { SUPERADMIN:'Super Admin', ORGANIZATION_ADMIN:'Org Admin', DOCTOR:'Doctor', NURSE:'Nurse', RECEPTIONIST:'Receptionist', PATIENT:'Patient' };

function normalizeUser(u) {
  if (!u) return u;
  if (!u.full_name) u.full_name = [u.first_name, u.last_name].filter(Boolean).join(' ') || '';
  if (!u.organisation_name) u.organisation_name = u.organization?.name || '';
  return u;
}
function roleLabel(r)      { return ROLE_LABELS[r] || r || '—'; }
function roleBadgeClass(r) { return `badge badge-role-${r||'patient'}`; }

async function loadUsers() {
  showSkeletonRows('userTableBody', 7, 8);
  try {
    const d = await safeApiGet(HC_CONFIG.ENDPOINTS.SA_USERS);
    _usersCache = (Array.isArray(d) ? d : (d.results||[])).map(normalizeUser);
  } catch {
    _usersCache = [];
  }
  _usersFiltered = [..._usersCache];
  _usersPage     = 1;
  renderUsersPage();
  populateUserOrgFilter();
}

function userFilterChange() {
  const q      = (document.getElementById('userSearch')?.value       || '').toLowerCase().trim();
  const role   =  document.getElementById('filterUserRole')?.value   || '';
  const status =  document.getElementById('filterUserStatus')?.value || '';
  const org    =  document.getElementById('filterUserOrg')?.value    || '';
  _usersFiltered = _usersCache.filter(u =>
    (!q      || u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)) &&
    (!role   || u.role === role) &&
    (!status || (status==='active' && u.is_active) || (status==='suspended' && !u.is_active)) &&
    (!org    || u.organisation_name === org || u.organization?.name === org)
  );
  _usersPage = 1;
  renderUsersPage();
}
function clearUserFilters() {
  ['userSearch','filterUserRole','filterUserStatus','filterUserOrg'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value='';
  });
  _usersFiltered = [..._usersCache];
  _usersPage = 1;
  renderUsersPage();
}

function sortUsers(field) {
  _userSortDir   = _userSortField===field ? (_userSortDir==='asc'?'desc':'asc') : 'asc';
  _userSortField = field;
  ['name','date'].forEach(f => {
    const el = document.getElementById('usort-'+f);
    if (!el) return;
    el.textContent = f===field?(_userSortDir==='asc'?'↑':'↓'):'↕';
    el.className   = 'sort-icon'+(f===field?' '+_userSortDir:'');
  });
  _usersFiltered.sort((a,b) => {
    let va, vb;
    if (field==='name') { va=(a.full_name||'').toLowerCase(); vb=(b.full_name||'').toLowerCase(); }
    if (field==='date') { va=new Date(a.date_joined||0); vb=new Date(b.date_joined||0); }
    if (va<vb) return _userSortDir==='asc'?-1:1;
    if (va>vb) return _userSortDir==='asc'?1:-1;
    return 0;
  });
  _usersPage = 1;
  renderUsersPage();
}

function renderUsersPage() {
  const total = _usersFiltered.length;
  const pages = Math.ceil(total/USERS_PER_PAGE)||1;
  _usersPage  = Math.min(_usersPage, pages);
  const from  = (_usersPage-1)*USERS_PER_PAGE;
  const slice = _usersFiltered.slice(from, from+USERS_PER_PAGE);
  const countEl = document.getElementById('userCount');
  if (countEl) countEl.textContent = total===0
    ? 'No users found'
    : `Showing ${from+1}–${Math.min(from+USERS_PER_PAGE,total)} of ${total} user${total!==1?'s':''}`;
  renderUsersTable(slice);
  renderUsersPagination(pages);
}

function renderUsersTable(data) {
  const tbody = document.getElementById('userTableBody');
  if (!tbody) return;
  if (!data?.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state" style="padding:2.5rem">
      <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
      <h3>No users found</h3><p>Try adjusting your filters.</p>
    </div></td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(u => {
    const colour   = userColour(u.id);
    const initials = (u.full_name||u.email||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const isActive = u.is_active !== false;
    return `
      <tr class="${isActive?'':'row-suspended'}">
        <td>
          <div class="user-name-cell">
            <div class="user-avatar" style="background:${colour}">${initials}</div>
            <div>
              <div class="user-name">${escapeHtml(u.full_name)||'—'}</div>
              ${u.id?`<div class="user-sub">#${escapeHtml(u.id)}</div>`:''}
            </div>
          </div>
        </td>
        <td><span class="${roleBadgeClass(u.role)}">${roleLabel(u.role)}</span></td>
        <td style="font-size:0.82rem;color:var(--text-mid)">${escapeHtml(u.organisation_name)||'—'}</td>
        <td style="font-size:0.82rem;color:var(--text-soft)">${escapeHtml(u.email)||'—'}</td>
        <td><span class="badge ${isActive?'badge-success':'badge-danger'}">
          ${!isActive?'<span class="status-dot offline" style="width:6px;height:6px;display:inline-block;margin-right:4px;vertical-align:middle"></span>':''}
          ${isActive?'Active':'Suspended'}
        </span></td>
        <td class="td-date">${formatDate(u.date_joined)}</td>
        <td>
          <div class="row-actions">
            <button class="row-btn" onclick="viewUser('${escapeHtml(u.id)}')">View</button>
            ${isActive
              ? `<button class="row-btn warn" onclick="suspendUser('${escapeHtml(u.id)}','${escapeHtml(u.full_name)}')">Suspend</button>`
              : `<button class="row-btn success" onclick="activateUser('${escapeHtml(u.id)}','${escapeHtml(u.full_name)}')">Activate</button>`}
          </div>
        </td>
      </tr>`;
  }).join('');
}

function renderUsersPagination(totalPages) {
  const el = document.getElementById('userPagination');
  if (!el) return;
  if (totalPages<=1) { el.innerHTML=''; return; }
  let html = `<button class="page-btn" onclick="goUserPage(${_usersPage-1})" ${_usersPage===1?'disabled':''}>‹</button>`;
  for (let p=1; p<=totalPages; p++) {
    if (totalPages>7&&p>2&&p<totalPages-1&&Math.abs(p-_usersPage)>1) {
      if (p===3||p===totalPages-2) html+=`<span class="page-ellipsis">…</span>`;
      continue;
    }
    html+=`<button class="page-btn ${p===_usersPage?'active':''}" onclick="goUserPage(${p})">${p}</button>`;
  }
  html+=`<button class="page-btn" onclick="goUserPage(${_usersPage+1})" ${_usersPage===totalPages?'disabled':''}>›</button>`;
  el.innerHTML=html;
}
function goUserPage(p) {
  _usersPage=Math.max(1,Math.min(p,Math.ceil(_usersFiltered.length/USERS_PER_PAGE)||1));
  renderUsersPage();
}

async function suspendUser(id, name) {
  if (!confirm(`Suspend "${name}"?`)) return;
  try { await safeApiDelete(`${HC_CONFIG.ENDPOINTS.SA_USER_DETAIL}${id}/`); } catch {}
  const u=_usersCache.find(u=>u.id===id); if(u) u.is_active=false;
  userFilterChange();
  showToast(`${name} suspended`,'error');
}
async function activateUser(id, name) {
  try { await safeApiPost(`${HC_CONFIG.ENDPOINTS.SA_USER_ACTIVATE}${id}/activate/`); } catch {}
  const u=_usersCache.find(u=>u.id===id); if(u) u.is_active=true;
  userFilterChange();
  showToast(`${name} reactivated`,'success');
}

function exportUsersCSV() {
  if (!_usersFiltered.length) { showToast('No data to export',''); return; }
  const headers = ['Name','Email','Role','Organisation','Status','Date Joined'];
  const rows    = _usersFiltered.map(u => [
    u.full_name, u.email, roleLabel(u.role), u.organisation_name,
    u.is_active!==false?'Active':'Suspended',
    u.date_joined?new Date(u.date_joined).toLocaleDateString():'',
  ].map(v=>`"${(v||'').toString().replace(/"/g,'""')}"`).join(','));
  const csv=[ headers.join(','),...rows].join('\n');
  const blob=new Blob([csv],{type:'text/csv'});
  const url=URL.createObjectURL(blob);
  const a=Object.assign(document.createElement('a'),{href:url,download:`users-${new Date().toISOString().slice(0,10)}.csv`});
  a.click(); URL.revokeObjectURL(url);
  showToast('CSV downloaded','success');
}

/* ── Org filter dropdown for Users page ── */
function populateUserOrgFilter() {
  const sel = document.getElementById('filterUserOrg');
  if (!sel) return;
  const orgNames = [...new Set(_usersCache.map(u => u.organisation_name || u.organization?.name).filter(Boolean))].sort();
  const current  = sel.value;
  sel.innerHTML  = '<option value="">All Organisations</option>' +
    orgNames.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
  if (current) sel.value = current;
}

/* ── Populate org dropdown for Create User panel ── */
async function populateOrgDropdown(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '<option value="">Loading…</option>';
  let orgs = _orgsCache;
  if (!orgs.length) {
    try {
      const d = await safeApiGet(HC_CONFIG.ENDPOINTS.SA_ORGS);
      orgs = Array.isArray(d) ? d : (d.results||[]);
    } catch { orgs = []; }
  }
  sel.innerHTML = '<option value="">Select organisation…</option>' +
    orgs.filter(o => o.is_active !== false).map(o =>
      `<option value="${escapeHtml(o.id)}">${escapeHtml(o.name)}</option>`
    ).join('');
}

/* ── Open Create User panel ── */
function openCreateUserPanel() {
  openPanel('addUserPanel');
  populateOrgDropdown('newUserOrg');
}

/* ── Toggle org field visibility based on role ── */
function onCreateUserRoleChange() {
  const role    = document.getElementById('newUserRole')?.value;
  const orgGrp  = document.getElementById('newUserOrgGroup');
  const orgSel  = document.getElementById('newUserOrg');
  if (!orgGrp) return;
  if (role === 'SUPERADMIN') {
    orgGrp.style.display = 'none';
    if (orgSel) orgSel.removeAttribute('required');
  } else {
    orgGrp.style.display = '';
    if (orgSel) orgSel.setAttribute('required','');
  }
}

/* ── Toggle password field visibility ── */
function togglePasswordVisibility(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  const isPassword = inp.type === 'password';
  inp.type = isPassword ? 'text' : 'password';
  btn.title = isPassword ? 'Hide password' : 'Show password';
}

/* ── Submit Create User ── */
async function submitCreateUser(e) {
  if (e && e.preventDefault) e.preventDefault();
  const email      = document.getElementById('newUserEmail')?.value.trim();
  const first_name = document.getElementById('newUserFirstName')?.value.trim();
  const last_name  = document.getElementById('newUserLastName')?.value.trim();
  const password   = document.getElementById('newUserPassword')?.value;
  const role       = document.getElementById('newUserRole')?.value;
  const organization = document.getElementById('newUserOrg')?.value;
  const phone      = document.getElementById('newUserPhone')?.value.trim();

  if (!email || !password || !role) {
    showToast('Please fill all required fields', 'error'); return;
  }
  if (password.length < 8) {
    showToast('Password must be at least 8 characters', 'error'); return;
  }
  if (role !== 'SUPERADMIN' && !organization) {
    showToast('Please select an organisation', 'error'); return;
  }

  const btn = document.getElementById('createUserBtn');
  setButtonLoading(btn, true, 'Create User');

  const payload = { email, password, role };
  if (first_name)    payload.first_name = first_name;
  if (last_name)     payload.last_name  = last_name;
  if (phone)         payload.phone      = phone;
  if (organization)  payload.organization = organization;

  let newUser;
  try {
    newUser = await safeApiPost(HC_CONFIG.ENDPOINTS.SA_USERS, payload);
  } catch (err) {
    const msg = err?.response?.data?.detail || err?.response?.data?.email?.[0] || 'Could not create user';
    showToast(msg, 'error');
    setButtonLoading(btn, false, 'Create User');
    return;
  }
  _usersCache.unshift(normalizeUser(newUser));
  _usersFiltered = [..._usersCache];
  _usersPage = 1;
  renderUsersPage();
  populateUserOrgFilter();
  document.getElementById('addUserForm').reset();
  closePanel('addUserPanel');
  showToast(`${first_name || email} created successfully`, 'success');
  setButtonLoading(btn, false, 'Create User');
}

let _viewingUserId=null;
async function viewUser(id) {
  _viewingUserId=id;
  openPanel('viewUserPanel');
  document.getElementById('viewUserTitle').textContent='Loading…';

  let u;
  try {
    u = await safeApiGet(`${HC_CONFIG.ENDPOINTS.SA_USER_DETAIL}${id}/`);
  } catch {
    u = _usersCache.find(u=>u.id===id);
  }
  if (!u) { showToast('User not found','error'); return; }
  normalizeUser(u);

  const colour   = userColour(u.id);
  const initials = (u.full_name||u.email||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const isActive = u.is_active!==false;

  document.getElementById('viewUserTitle').textContent       = u.full_name||u.email||'—';
  document.getElementById('viewUserAvatar').textContent      = initials;
  document.getElementById('viewUserAvatar').style.background = colour;
  document.getElementById('viewUserName').textContent        = u.full_name||'—';
  document.getElementById('viewUserOrg').textContent         = u.organisation_name||'No organisation';
  document.getElementById('viewUserBadge').innerHTML         = `<span class="badge ${isActive?'badge-success':'badge-danger'}" style="margin-top:4px">${isActive?'Active':'Suspended'}</span>`;
  document.getElementById('viewUserChips').innerHTML         = `<span class="user-chip ${roleBadgeClass(u.role).replace('badge ','')}">${roleLabel(u.role)}</span>`;
  document.getElementById('viewUserEmail').textContent       = u.email     ||'—';
  document.getElementById('viewUserPhone').textContent       = u.phone     ||'—';
  document.getElementById('viewUserJoined').textContent      = formatDate(u.date_joined);
  document.getElementById('viewUserOrgDetail').textContent   = u.organisation_name||'—';
  document.getElementById('viewUserLastLogin').textContent   = u.last_login ? formatDate(u.last_login) : 'Never';
  document.getElementById('viewUserOrgId').textContent       = u.organization?.org_id || '—';
  document.getElementById('viewUserPwChanged').textContent   = u.password_changed_at ? formatDate(u.password_changed_at) : 'Never';
  document.getElementById('actRecords').textContent          = u.record_count??'—';
  document.getElementById('actLogins').textContent           = u.login_count??'—';
  document.getElementById('actActions').textContent          = u.action_count??'—';

  const suspBtn=document.getElementById('userSuspendBtn');
  if (suspBtn) { suspBtn.textContent=isActive?'Suspend':'Activate'; suspBtn.className=`btn ${isActive?'btn-danger':'btn-success'}`; }
  document.getElementById('viewUserPanel').dataset.userId=u.id;
  document.getElementById('viewUserPanel').dataset.userName=u.full_name||u.email;
  document.getElementById('viewUserPanel').dataset.active=isActive?'1':'0';
}
async function panelToggleUserStatus() {
  const panel=document.getElementById('viewUserPanel');
  const id=panel.dataset.userId, name=panel.dataset.userName;
  const isActive=panel.dataset.active==='1';
  if (isActive) { if (!confirm(`Suspend "${name}"?`)) return; await suspendUser(id,name); }
  else { await activateUser(id,name); }
  closePanel('viewUserPanel');
}


/* ── Edit User ── */
async function openEditUser(id) {
  closePanel('viewUserPanel');
  let u = _usersCache.find(u => u.id === id);
  if (!u) {
    try { u = await safeApiGet(`${HC_CONFIG.ENDPOINTS.SA_USER_DETAIL}${id}/`); normalizeUser(u); } catch {}
  }
  if (!u) { showToast('User not found', 'error'); return; }

  document.getElementById('editUserId').value        = u.id;
  document.getElementById('editUserEmail').value      = u.email || '';
  document.getElementById('editUserFirstName').value  = u.first_name || '';
  document.getElementById('editUserLastName').value   = u.last_name || '';
  document.getElementById('editUserPhone').value      = u.phone || '';
  document.getElementById('editUserRole').value       = u.role || '';
  document.getElementById('editUserOrg').value        = u.organisation_name || 'No organisation';
  document.getElementById('editUserSubtitle').textContent = u.full_name || u.email || '';

  setTimeout(() => openPanel('editUserPanel'), 200);
}

async function submitEditUser(e) {
  if (e && e.preventDefault) e.preventDefault();
  const id         = document.getElementById('editUserId').value;
  const first_name = document.getElementById('editUserFirstName').value.trim();
  const last_name  = document.getElementById('editUserLastName').value.trim();
  const phone      = document.getElementById('editUserPhone').value.trim();
  const role       = document.getElementById('editUserRole').value;

  if (!role) { showToast('Role is required', 'error'); return; }

  const btn = document.getElementById('editUserBtn');
  setButtonLoading(btn, true, 'Save Changes');

  const payload = { role };
  if (first_name) payload.first_name = first_name;
  if (last_name)  payload.last_name  = last_name;
  if (phone)      payload.phone      = phone;

  try {
    const updated = await safeApiPatch(`${HC_CONFIG.ENDPOINTS.SA_USER_DETAIL}${id}/`, payload);
    normalizeUser(updated);

    const idx = _usersCache.findIndex(u => u.id === id);
    if (idx !== -1) {
      _usersCache[idx] = { ..._usersCache[idx], ...updated };
      normalizeUser(_usersCache[idx]);
    }
    _usersFiltered = [..._usersCache];
    renderUsersPage();
    populateUserOrgFilter();
    closePanel('editUserPanel');
    showToast(`${updated.full_name || updated.email} updated`, 'success');
  } catch (err) {
    const msg = err?.response?.data?.detail || err?.response?.data?.role?.[0] || 'Could not update user';
    showToast(msg, 'error');
  }
  setButtonLoading(btn, false, 'Save Changes');
}

/* First loadAuditLogs removed — see full version below */


/* ══════════════════════════════════════════
   9. PANEL / OVERLAY / TAB HELPERS
══════════════════════════════════════════ */
function openPanel(id) {
  closeAllPanels();
  const panel=document.getElementById(id);
  if (panel) panel.classList.add('open');
  const overlay=document.getElementById('overlay');
  if (overlay) overlay.classList.add('open');
}
function closePanel(id) {
  const panel=document.getElementById(id);
  if (panel) panel.classList.remove('open');
  const overlay=document.getElementById('overlay');
  if (overlay) overlay.classList.remove('open');
}
function closeAllPanels() {
  document.querySelectorAll('.slide-panel').forEach(p=>p.classList.remove('open'));
  const overlay=document.getElementById('overlay');
  if (overlay) overlay.classList.remove('open');
}
function switchTab(btn, contentId) {
  const panel=btn.closest('.slide-panel')||document;
  panel.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  panel.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
  btn.classList.add('active');
  const content=document.getElementById(contentId);
  if (content) content.classList.add('active');
}


/* ══════════════════════════════════════════
   10. TOAST
══════════════════════════════════════════ */
let _toastTimer;
function showToast(msg, type='') {
  const t=document.getElementById('toast');
  if (!t) return;
  t.textContent=msg;
  t.className='toast show '+(type||'');
  clearTimeout(_toastTimer);
  _toastTimer=setTimeout(()=>t.classList.remove('show'), 3000);
}


/* ══════════════════════════════════════════
   11. LOGOUT
══════════════════════════════════════════ */
async function hc_logoutAdmin() {
  try {
    if (typeof apiPost==='function' && typeof hc_getRefreshToken==='function') {
      await apiPost(HC_CONFIG.ENDPOINTS.LOGOUT, { refresh: hc_getRefreshToken() });
    }
  } catch {}
  try { if (typeof hc_clearTokens==='function') hc_clearTokens(); } catch {}
  window.location.href = HC_ROUTER.signinPath({ role: 'SUPERADMIN' });
}




/* ══════════════════════════════════════════
   NOTIFICATIONS
══════════════════════════════════════════ */


let _notifs     = [];
let _notifOpen  = false;
let _notifLoaded= false;

const NOTIF_ICONS = {
  info:    `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  success: `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`,
  warning: `<svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  danger:  `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
};

function notifTimeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60)   return 'Just now';
  if (diff < 3600) return Math.floor(diff/60) + 'm ago';
  if (diff < 86400)return Math.floor(diff/3600) + 'h ago';
  return Math.floor(diff/86400) + 'd ago';
}

async function loadNotifications() {
  try {
    const d  = await safeApiGet(HC_CONFIG.ENDPOINTS.SA_NOTIFS);
    _notifs  = Array.isArray(d) ? d : (d.results || []);
  } catch {
    _notifs = [];
  }
  renderNotifBadge();
}

function renderNotifBadge() {
  const unread = _notifs.filter(n => !n.read).length;
  const dot    = document.getElementById('notifDot');
  const btn    = document.getElementById('notifBtn');

  // Remove old count badge if any
  const old = btn?.querySelector('.notif-count');
  if (old) old.remove();
  if (dot) dot.style.display = unread > 0 ? 'block' : 'none';

  if (unread > 0 && btn) {
    const badge = document.createElement('span');
    badge.className   = 'notif-count';
    badge.textContent = unread > 9 ? '9+' : unread;
    btn.appendChild(badge);
  }
}

function renderNotifList() {
  const list = document.getElementById('notifList');
  if (!list) return;

  if (!_notifs.length) {
    list.innerHTML = `<div class="notif-empty">
      <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
      <p>You're all caught up!</p>
    </div>`;
    return;
  }

  list.innerHTML = _notifs.map(n => `
    <div class="notif-item ${n.read ? '' : 'unread'}" onclick="markNotifRead('${n.id}')">
      <div class="notif-icon ${n.type}">${NOTIF_ICONS[n.type] || NOTIF_ICONS.info}</div>
      <div class="notif-body">
        <div class="notif-title">${n.title}</div>
        <div class="notif-desc">${n.desc}</div>
        <div class="notif-time">${notifTimeAgo(n.time)}</div>
      </div>
    </div>`).join('');
}

function toggleNotifPanel() {
  _notifOpen = !_notifOpen;
  const panel = document.getElementById('notifPanel');
  if (!panel) return;

  if (_notifOpen) {
    panel.classList.add('open');
    if (!_notifLoaded) {
      _notifLoaded = true;
      loadNotifications().then(renderNotifList);
    } else {
      renderNotifList();
    }
  } else {
    panel.classList.remove('open');
  }
}

function markNotifRead(id) {
  const n = _notifs.find(n => n.id === id);
  if (!n || n.read) return;
  n.read = true;
  // Fire and forget to API
  safeApiPatch(`${HC_CONFIG.ENDPOINTS.SA_NOTIF_READ}${id}/read/`).catch(() => {});
  renderNotifList();
  renderNotifBadge();
}

function markAllRead() {
  _notifs.forEach(n => {
    if (!n.read) {
      n.read = true;
      safeApiPatch(`${HC_CONFIG.ENDPOINTS.SA_NOTIF_READ}${n.id}/read/`).catch(() => {});
    }
  });
  renderNotifList();
  renderNotifBadge();
  showToast('All notifications marked as read', 'success');
}

function clearAllNotifs() {
  _notifs.forEach(n => {
    if (!n.read) safeApiPatch(`${HC_CONFIG.ENDPOINTS.SA_NOTIF_READ}${n.id}/read/`).catch(() => {});
  });
  _notifs = [];
  renderNotifList();
  renderNotifBadge();
  showToast('Notifications cleared', '');
}

// Close notif panel when clicking outside
document.addEventListener('click', (e) => {
  const wrapper = document.getElementById('notifWrapper');
  if (_notifOpen && wrapper && !wrapper.contains(e.target)) {
    _notifOpen = false;
    document.getElementById('notifPanel')?.classList.remove('open');
  }
});

// Load badge count on init (without opening panel)
loadNotifications();


/* ══════════════════════════════════════════
   12. GLOBAL SEARCH
══════════════════════════════════════════ */
document.getElementById('globalSearch')?.addEventListener('input', function() {
  const val=this.value.trim();
  if (!val) return;
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.querySelector('[data-page="organisations"]')?.classList.add('active');
  document.querySelectorAll('.page-content').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-organisations')?.classList.add('active');
  const orgInput=document.getElementById('orgSearch');
  if (orgInput) { orgInput.value=val; }
  if (!_loaded.has('organisations')) {
    loadPage('organisations');
  } else {
    orgFilterChange();
  }
});


/* ══════════════════════════════════════════════
   DYNAMIC DATE — first day of current month → today
══════════════════════════════════════════════ */
(function setHeaderDate() {
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const fmt   = d => d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
  const el    = document.getElementById('headerDateText');
  if (el) el.textContent = fmt(start) + ' → ' + fmt(now);
})();


/* ══════════════════════════════════════════════
   BILLING
══════════════════════════════════════════════ */

async function loadBilling() {
  const container = document.getElementById('page-billing');
  if (container) container.innerHTML = `<div class="empty-state" style="padding:3rem;text-align:center">
    <svg viewBox="0 0 24 24" style="width:48px;height:48px;margin:0 auto 1rem;stroke:var(--text-soft);fill:none;stroke-width:1.5"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
    <h3>Coming Soon</h3><p style="color:var(--text-soft)">Billing management will be available in a future update.</p></div>`;
}



/* ══════════════════════════════════════════════
   MESSAGES
══════════════════════════════════════════════ */

async function loadMessages() {
  const container = document.getElementById('page-messages');
  if (container) container.innerHTML = `<div class="empty-state" style="padding:3rem;text-align:center">
    <svg viewBox="0 0 24 24" style="width:48px;height:48px;margin:0 auto 1rem;stroke:var(--text-soft);fill:none;stroke-width:1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    <h3>Coming Soon</h3><p style="color:var(--text-soft)">Messaging will be available in a future update.</p></div>`;
}


/* ══════════════════════════════════════════════
   AUDIT LOGS (full version)
══════════════════════════════════════════════ */

let _auditCache    = [];
let _auditFiltered = [];
let _auditPage     = 1;
let _auditSortF    = 'time';
let _auditSortD    = 'desc';
const AUDIT_PER_PAGE = 10;

async function loadAuditLogs() {
  showSkeletonRows('auditTbody', 6, 8);
  try {
    const d = await safeApiGet(HC_CONFIG.ENDPOINTS.SA_AUDIT);
    _auditCache = Array.isArray(d) ? d : (d.results || []);
  } catch {
    _auditCache = [];
  }
  _auditFiltered = [..._auditCache];
  _auditPage = 1;
  renderAuditPage();
}
function auditFilterChange() {
  const q      = (document.getElementById('auditSearch')?.value || '').toLowerCase().trim();
  const status =  document.getElementById('filterAuditStatus')?.value || '';
  _auditFiltered = _auditCache.filter(a =>
    (!q      || a.user_id?.toLowerCase().includes(q) || a.action?.toLowerCase().includes(q) || a.entity?.toLowerCase().includes(q) || a.ip?.toLowerCase().includes(q)) &&
    (!status || a.status === status)
  );
  _auditPage = 1;
  renderAuditPage();
}
function clearAuditFilters() {
  ['auditSearch','filterAuditStatus'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  _auditFiltered = [..._auditCache];
  _auditPage = 1;
  renderAuditPage();
}
function sortAudit(field) {
  _auditSortD = _auditSortF === field ? (_auditSortD === 'asc' ? 'desc' : 'asc') : 'desc';
  _auditSortF = field;
  const el = document.getElementById('asort-time');
  if (el) el.textContent = _auditSortD === 'asc' ? '↑' : '↓';
  _auditFiltered.sort((a, b) => {
    const va = new Date(a.time || 0), vb = new Date(b.time || 0);
    return _auditSortD === 'asc' ? va - vb : vb - va;
  });
  _auditPage = 1;
  renderAuditPage();
}
function renderAuditPage() {
  const total = _auditFiltered.length;
  const pages = Math.ceil(total / AUDIT_PER_PAGE) || 1;
  _auditPage  = Math.min(_auditPage, pages);
  const from  = (_auditPage - 1) * AUDIT_PER_PAGE;
  const slice = _auditFiltered.slice(from, from + AUDIT_PER_PAGE);
  const countEl = document.getElementById('auditCount');
  if (countEl) countEl.textContent = total === 0
    ? 'No logs found'
    : `Showing ${from + 1}–${Math.min(from + AUDIT_PER_PAGE, total)} of ${total} log${total !== 1 ? 's' : ''}`;
  renderAuditTable(slice);
  renderAuditPagination(pages);
}
function renderAuditTable(data) {
  const tbody = document.getElementById('auditTbody');
  if (!tbody) return;
  if (!data?.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-soft);font-size:0.82rem">No audit logs found</td></tr>`;
    return;
  }
  const actionCls = s => { const v = (s || '').toLowerCase(); return (v === 'failed' || v === 'suspended') ? 'danger' : ''; };
  tbody.innerHTML = data.map(r => `
    <tr>
      <td style="font-size:0.78rem;color:var(--text-soft);white-space:nowrap">${formatRelativeTime(r.time)}</td>
      <td class="td-mono">${r.user_id || '—'}</td>
      <td class="td-action ${actionCls(r.status)}">${r.action || '—'}</td>
      <td style="font-size:0.82rem">${r.entity || '—'}</td>
      <td class="td-mono">${r.ip || '—'}</td>
      <td>${statusBadge(r.status)}</td>
    </tr>`).join('');
}
function renderAuditPagination(totalPages) {
  const el = document.getElementById('auditPagination');
  if (!el) return;
  if (totalPages <= 1) { el.innerHTML = ''; return; }
  let html = `<button class="page-btn" onclick="goAuditPage(${_auditPage - 1})" ${_auditPage === 1 ? 'disabled' : ''}>‹</button>`;
  for (let p = 1; p <= totalPages; p++) {
    if (totalPages > 7 && p > 2 && p < totalPages - 1 && Math.abs(p - _auditPage) > 1) {
      if (p === 3 || p === totalPages - 2) html += `<span class="page-ellipsis">…</span>`;
      continue;
    }
    html += `<button class="page-btn ${p === _auditPage ? 'active' : ''}" onclick="goAuditPage(${p})">${p}</button>`;
  }
  html += `<button class="page-btn" onclick="goAuditPage(${_auditPage + 1})" ${_auditPage === totalPages ? 'disabled' : ''}>›</button>`;
  el.innerHTML = html;
}
function goAuditPage(p) {
  _auditPage = Math.max(1, Math.min(p, Math.ceil(_auditFiltered.length / AUDIT_PER_PAGE) || 1));
  renderAuditPage();
}
function exportAuditCSV() {
  if (!_auditFiltered.length) { showToast('No data to export', ''); return; }
  const headers = ['Timestamp', 'User ID', 'Action', 'Entity', 'IP Address', 'Status'];
  const rows    = _auditFiltered.map(a => [
    a.time ? new Date(a.time).toLocaleString() : '',
    a.user_id, a.action, a.entity, a.ip, a.status,
  ].map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(','));
  const csv  = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: `audit-logs-${new Date().toISOString().slice(0, 10)}.csv` });
  a.click(); URL.revokeObjectURL(url);
  showToast('Audit log CSV downloaded', 'success');
}

/* ══════════════════════════════════════════
   11. RECORDS PAGE
══════════════════════════════════════════ */

async function loadRecords() {
  const container = document.getElementById('page-records');
  if (container) container.innerHTML = `<div class="empty-state" style="padding:3rem;text-align:center">
    <svg viewBox="0 0 24 24" style="width:48px;height:48px;margin:0 auto 1rem;stroke:var(--text-soft);fill:none;stroke-width:1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
    <h3>Coming Soon</h3><p style="color:var(--text-soft)">Records management will be available in a future update.</p></div>`;
}


/* ══════════════════════════════════════════
   12. SETTINGS PAGE
══════════════════════════════════════════ */

async function loadSettings() {
  const container = document.getElementById('page-settings');
  if (container) container.innerHTML = `<div class="empty-state" style="padding:3rem;text-align:center">
    <svg viewBox="0 0 24 24" style="width:48px;height:48px;margin:0 auto 1rem;stroke:var(--text-soft);fill:none;stroke-width:1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
    <h3>Coming Soon</h3><p style="color:var(--text-soft)">Platform settings will be available in a future update.</p></div>`;
}

async function changeSAPassword(e) {
  e.preventDefault();
  const errEl  = document.getElementById('saPwError');
  const succEl = document.getElementById('saPwSuccess');
  errEl.textContent  = '';
  succEl.textContent = '';

  const oldPw    = document.getElementById('saOldPassword').value;
  const newPw    = document.getElementById('saNewPassword').value;
  const confirmPw = document.getElementById('saConfirmPassword').value;

  if (!oldPw || !newPw || !confirmPw) { errEl.textContent = 'All fields are required.'; return; }
  if (newPw.length < 8) { errEl.textContent = 'Password must be at least 8 characters.'; return; }
  if (newPw !== confirmPw) { errEl.textContent = 'Passwords do not match.'; return; }

  const btn = document.getElementById('changeSAPwBtn');
  setButtonLoading(btn, true);
  try {
    await safeApiPost(HC_CONFIG.ENDPOINTS.CHANGE_PW, { old_password: oldPw, new_password: newPw });
    succEl.textContent = 'Password updated successfully.';
    document.getElementById('saChangePasswordForm').reset();
  } catch (err) {
    errEl.textContent = (err?.data?.detail) || (err?.data?.message) || 'Could not update password.';
  }
  setButtonLoading(btn, false, 'Update Password');
}


/* Wire billing, messages, audit into loadPage */
