/* ═══════════════════════════════════════════════════════════
   HealthClouda — Super Admin Dashboard
   Load order: config.js → api.js → auth.js → this file
   
   DEV NOTE: Auth guard is bypassed when no token exists so
   the dashboard works standalone for UI testing. When the
   backend is live, a real token from signin will be used.
═══════════════════════════════════════════════════════════ */


/* ══════════════════════════════════════════
   1. AUTH GUARD (dev-safe)
══════════════════════════════════════════ */
(function authGuard() {
  // Try to get real auth — but don't redirect if missing (allows local dev)
  let user  = null;
  let token = null;
  try { token = hc_getAccessToken(); } catch(e) {}
  try { user  = hc_getUser();        } catch(e) {}

  // If token exists but wrong role → redirect to correct dashboard
  if (token && user && typeof hc_redirectByRole === 'function') {
    const role = (user.role || '').toLowerCase().replace(/_/g, '');
    if (role && role !== 'superadmin') {
      hc_redirectByRole(user.role);
      return;
    }
  }

  // Populate sidebar name
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
    case 'billing':       loadBilling();   break;
    case 'messages':      loadMessages();  break;
    case 'audit':         loadAuditLogs(); break;
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
  return (d.toDateString() === now.toDateString() ? 'Today, ' : 'Yesterday, ') + t;
}
function statusBadge(status) {
  if (!status) return '—';
  const map = { successful:'badge-success', success:'badge-success', completed:'badge-info',
                suspended:'badge-danger', failed:'badge-danger', warning:'badge-warning' };
  return `<span class="badge ${map[status.toLowerCase()] || 'badge-info'}">${status}</span>`;
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


/* ══════════════════════════════════════════
   4. DEMO DATA (shown when backend offline)
══════════════════════════════════════════ */
const DEMO_ORGS = [
  { id:'HC-25-00001', name:'City General Hospital',  type:'Hospital',    plan:'Premium', status:'Active',    email:'city@healthclouda.com',    phone:'09012345678', address:'13, Martins Street, Lagos Island, Lagos',  admin:'Dr. Aliyu Musa',     color:'#0075FF', created_at:'2025-01-10' },
  { id:'HC-25-00002', name:'Brightview Clinic',       type:'Clinic',      plan:'Pro',     status:'Active',    email:'bright@healthclouda.com',  phone:'08023456789', address:'5, Allen Avenue, Ikeja, Lagos',            admin:'Dr. Chinwe Okafor',  color:'#16a34a', created_at:'2025-02-14' },
  { id:'HC-25-00003', name:'Metro Medical Centre',    type:'Hospital',    plan:'Pro',     status:'Active',    email:'metro@healthclouda.com',   phone:'07034567890', address:'22, Broad Street, Lagos Island',           admin:'Dr. Emeka Bello',    color:'#7c3aed', created_at:'2025-03-05' },
  { id:'HC-25-00004', name:'HealthPlus Centre',       type:'Clinic',      plan:'Premium', status:'Active',    email:'hp@healthclouda.com',      phone:'09045678901', address:'10, Victoria Island, Lagos',              admin:'Dr. Aisha Fadahunsi',color:'#ea580c', created_at:'2025-04-20' },
  { id:'HC-25-00005', name:'MediCare Clinic',         type:'Clinic',      plan:'Basic',   status:'Suspended', email:'mc@healthclouda.com',      phone:'08056789012', address:'3, Oshodi Market Road, Lagos',            admin:'Dr. John Peters',    color:'#dc2626', created_at:'2025-05-01' },
  { id:'HC-25-00006', name:'NovaCare Diagnostics',    type:'Laboratory',  plan:'Basic',   status:'Active',    email:'nova@healthclouda.com',    phone:'07067890123', address:'8, Ikotun Road, Lagos',                   admin:'Dr. Fatima Sani',    color:'#0891b2', created_at:'2025-05-15' },
  { id:'HC-25-00007', name:'PharmaPlus',              type:'Pharmacy',    plan:'Basic',   status:'Active',    email:'pharma@healthclouda.com',  phone:'09078901234', address:'12, Surulere, Lagos',                     admin:'Mr. Tunde Adeyemi',  color:'#db2777', created_at:'2025-06-01' },
  { id:'HC-25-00008', name:'St. Mary\'s Hospital',    type:'Hospital',    plan:'Premium', status:'Active',    email:'stmary@healthclouda.com',  phone:'08089012345', address:'7, Gbagada Estate, Lagos',                admin:'Dr. Grace Obi',      color:'#0d9488', created_at:'2025-06-10' },
  { id:'HC-25-00009', name:'FirstCare Hospital',      type:'Hospital',    plan:'Pro',     status:'Active',    email:'firstcare@healthclouda.com',phone:'07090123456',address:'4, Ojota, Lagos',                         admin:'Dr. Kabiru Lawal',   color:'#b45309', created_at:'2025-07-03' },
  { id:'HC-25-00010', name:'LagosLab Diagnostics',    type:'Laboratory',  plan:'Pro',     status:'Suspended', email:'lagoslab@healthclouda.com', phone:'09001234567', address:'1, FESTAC Town, Lagos',                  admin:'Mr. Seun Adebayo',   color:'#6d28d9', created_at:'2025-07-20' },
  { id:'HC-25-00011', name:'CityPharm',               type:'Pharmacy',    plan:'Basic',   status:'Active',    email:'citypharm@healthclouda.com',phone:'08012345670', address:'9, Isolo, Lagos',                        admin:'Mrs. Ngozi Eze',     color:'#059669', created_at:'2025-08-01' },
  { id:'HC-25-00012', name:'Medicare Plus',           type:'Clinic',      plan:'Pro',     status:'Active',    email:'medplus@healthclouda.com', phone:'07023456781', address:'2, Lekki Phase 1, Lagos',                 admin:'Dr. Umar Danfolio',  color:'#d97706', created_at:'2025-08-15' },
];

const DEMO_USERS = [
  { id:'U001', full_name:'Dr. Aliyu Musa',      email:'aliyu@city.com',    role:'org_admin',    organisation_name:'City General Hospital', is_active:true,  date_joined:'2025-01-10', phone:'09012345678', last_login:'2026-02-20', record_count:120, login_count:45, action_count:230 },
  { id:'U002', full_name:'Dr. Fatima Sani',     email:'fatima@nova.com',   role:'doctor',       organisation_name:'NovaCare Diagnostics',  is_active:true,  date_joined:'2025-05-15', phone:'07067890123', last_login:'2026-02-22', record_count:88,  login_count:30, action_count:170 },
  { id:'U003', full_name:'Nurse Amaka Obi',     email:'amaka@metro.com',   role:'nurse',        organisation_name:'Metro Medical Centre',  is_active:true,  date_joined:'2025-03-05', phone:'08034561234', last_login:'2026-02-21', record_count:60,  login_count:55, action_count:145 },
  { id:'U004', full_name:'John Peters',         email:'john@medicare.com', role:'receptionist', organisation_name:'MediCare Clinic',       is_active:false, date_joined:'2025-05-01', phone:'08056789012', last_login:'2026-01-10', record_count:0,   login_count:12, action_count:40  },
  { id:'U005', full_name:'Grace Adewale',       email:'grace@hp.com',      role:'patient',      organisation_name:'HealthPlus Centre',     is_active:true,  date_joined:'2025-04-20', phone:'09011223344', last_login:'2026-02-19', record_count:5,   login_count:8,  action_count:12  },
  { id:'U006', full_name:'Dr. Emeka Bello',     email:'emeka@metro.com',   role:'doctor',       organisation_name:'Metro Medical Centre',  is_active:true,  date_joined:'2025-03-06', phone:'07034567890', last_login:'2026-02-23', record_count:200, login_count:60, action_count:310 },
  { id:'U007', full_name:'Dr. Chinwe Okafor',   email:'chinwe@bright.com', role:'org_admin',    organisation_name:'Brightview Clinic',     is_active:true,  date_joined:'2025-02-14', phone:'08023456789', last_login:'2026-02-22', record_count:95,  login_count:40, action_count:188 },
  { id:'U008', full_name:'Tunde Adeyemi',       email:'tunde@pharma.com',  role:'receptionist', organisation_name:'PharmaPlus',            is_active:true,  date_joined:'2025-06-01', phone:'09078901234', last_login:'2026-02-20', record_count:0,   login_count:25, action_count:75  },
];

const DEMO_ACTIVITY = [
  { time:new Date().toISOString(),                   user_id:'HC-25-00003', action:'Update Billing Plan',    entity:'City Hospital',    status:'successful' },
  { time:new Date(Date.now()-3600000).toISOString(), user_id:'HC-28-00363', action:'Account Suspended',      entity:'MediCare Clinic',  status:'suspended'  },
  { time:new Date(Date.now()-7200000).toISOString(), user_id:'HC-22-00453', action:'Added New Record',       entity:'Dr. Smith',        status:'completed'  },
  { time:new Date(Date.now()-86400000).toISOString(),user_id:'HC-23-00345', action:'Failed login attempt',   entity:'IP:192.168.1.10',  status:'failed'     },
  { time:new Date(Date.now()-90000000).toISOString(),user_id:'HC-26-00233', action:'Activated Account',      entity:'HealthPlus Centre',status:'successful' },
];


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
  ['secFailedLogins','secLockedAccounts','secSuspiciousActivity'].forEach(id => {
    const el = document.getElementById(id);
    const cnt = el?.querySelector('.sec-count');
    if (cnt) cnt.innerHTML = '<div style="height:20px;width:30px;border-radius:4px;display:inline-block;background:linear-gradient(90deg,#f0f4fa 25%,#e2e8f0 50%,#f0f4fa 75%);background-size:200%;animation:shimmer 1.4s infinite"></div>';
  });
  try {
    const d = await safeApiGet(HC_CONFIG.ENDPOINTS.SA_SECURITY);
    document.getElementById('secFailedLogins').querySelector('.sec-count').textContent  = d.failed_logins   ?? '—';
    document.getElementById('secLockedAccounts').querySelector('.sec-count').textContent = d.locked_accounts ?? '—';
    const saEl = document.getElementById('secSuspicious');
    if (saEl) {
      const clean = !d.suspicious_activity;
      saEl.className = `alert-item ${clean ? 'safe' : 'danger'}`;
      saEl.querySelector('.sec-label').textContent = clean
        ? 'No suspicious activity detected'
        : 'Suspicious activity flagged';
    }
  } catch {
    document.getElementById('secFailedLogins').querySelector('.sec-count').textContent   = '—';
    document.getElementById('secLockedAccounts').querySelector('.sec-count').textContent = '—';
    const saEl = document.getElementById('secSuspicious');
    if (saEl) {
      saEl.className = 'alert-item';
      saEl.querySelector('.sec-label').textContent = 'Awaiting backend connection';
    }
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
    _orgsCache = DEMO_ORGS;   // ← demo data when offline
  }
  _orgsFiltered = [..._orgsCache];
  _orgsPage     = 1;
  renderOrgsPage();
}

// Filter
function orgFilterChange() {
  const q      = (document.getElementById('orgSearch')?.value    || '').toLowerCase().trim();
  const type   =  document.getElementById('filterType')?.value   || '';
  const plan   =  document.getElementById('filterPlan')?.value   || '';
  const status =  document.getElementById('filterStatus')?.value || '';
  _orgsFiltered = _orgsCache.filter(o =>
    (!q      || o.name?.toLowerCase().includes(q) || o.id?.toLowerCase().includes(q)) &&
    (!type   || o.type   === type)   &&
    (!plan   || o.plan   === plan)   &&
    (!status || o.status === status)
  );
  _orgsPage = 1;
  renderOrgsPage();
}
function clearOrgFilters() {
  ['orgSearch','filterType','filterPlan','filterStatus'].forEach(id => {
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
  ['name','plan','date'].forEach(f => {
    const el = document.getElementById('sort-'+f);
    if (!el) return;
    el.textContent = f===field ? (_sortDir==='asc'?'↑':'↓') : '↕';
    el.className   = 'sort-icon'+(f===field?' '+_sortDir:'');
  });
  const planOrder = { Basic:1, Pro:2, Premium:3 };
  _orgsFiltered.sort((a,b) => {
    let va, vb;
    if (field==='name') { va=a.name||''; vb=b.name||''; }
    if (field==='plan') { va=planOrder[a.plan]||0; vb=planOrder[b.plan]||0; }
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
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state" style="padding:2.5rem">
      <svg viewBox="0 0 24 24"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11"/></svg>
      <h3>No organisations found</h3><p>Try adjusting your search or filters.</p>
    </div></td></tr>`;
    return;
  }
  tbody.innerHTML = data.map((org,i) => {
    const colour   = org.color || ORG_COLOURS[i%ORG_COLOURS.length];
    const initials = (org.name||'??').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const typeCls  = org.type==='Hospital'?'badge-blue':org.type==='Clinic'?'badge-green':'badge-info';
    const planCls  = org.plan==='Premium'?'badge-warning':org.plan==='Pro'?'badge-purple':'badge-info';
    const statCls  = org.status==='Active'?'badge-success':'badge-danger';
    const isSusp   = (org.status||'').toLowerCase()==='suspended';
    const safeName = (org.name||'').replace(/'/g,"\\'");
    return `
      <tr class="${isSusp?'row-suspended':''}">
        <td>
          <div class="org-name-cell">
            <div class="org-avatar" style="background:${colour}">${initials}</div>
            <div>
              <div class="org-name">${org.name}</div>
              ${org.admin?`<div class="org-sub">${org.admin}</div>`:''}
            </div>
          </div>
        </td>
        <td><span class="badge ${typeCls}">${org.type||'—'}</span></td>
        <td class="td-mono">${org.id}</td>
        <td><span class="badge ${planCls}">${org.plan||'—'}</span></td>
        <td>
          <span class="badge ${statCls}">
            ${isSusp?'<span class="status-dot offline" style="width:6px;height:6px;display:inline-block;margin-right:4px;vertical-align:middle"></span>':''}
            ${org.status||'—'}
          </span>
        </td>
        <td class="td-date">${formatDate(org.created_at)}</td>
        <td>
          <div class="row-actions">
            <button class="row-btn" onclick="viewOrg('${org.id}')">View</button>
            ${isSusp
              ? `<button class="row-btn success" onclick="activateOrg('${org.id}','${safeName}')">Activate</button>`
              : `<button class="row-btn warn"    onclick="suspendOrg('${org.id}','${safeName}')">Suspend</button>`}
            <button class="row-btn danger" onclick="promptDeleteOrg('${org.id}','${safeName}')">Delete</button>
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
    await safeApiPatch(`${HC_CONFIG.ENDPOINTS.SA_ORG_SUSPEND}${id}/suspend/`);
  } catch {}
  const o = _orgsCache.find(o=>o.id===id); if(o) o.status='Suspended';
  orgFilterChange();
  showToast(`${name} suspended`, 'error');
}
async function activateOrg(id, name) {
  try {
    await safeApiPatch(`${HC_CONFIG.ENDPOINTS.SA_ORG_ACTIVATE}${id}/activate/`);
  } catch {}
  const o = _orgsCache.find(o=>o.id===id); if(o) o.status='Active';
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
  const headers = ['Name','Type','ID','Plan','Status','Date Added','Email','Phone'];
  const rows    = _orgsFiltered.map(o =>
    [o.name,o.type,o.id,o.plan,o.status,
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

  const colour   = org.color || '#0075FF';
  const initials = (org.name||'??').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const isSusp   = (org.status||'').toLowerCase()==='suspended';

  document.getElementById('viewOrgTitle').textContent       = org.name;
  document.getElementById('viewOrgBadge').innerHTML         = `<span class="badge ${isSusp?'badge-danger':'badge-success'}" style="margin-top:4px">${org.status}</span>`;
  document.getElementById('viewOrgAvatar').textContent      = initials;
  document.getElementById('viewOrgAvatar').style.background = colour;
  document.getElementById('viewOrgName').textContent        = org.name;
  document.getElementById('viewOrgAdmin').textContent       = 'Admin: '+(org.admin||'—');
  document.getElementById('viewOrgEmail').textContent       = org.email   || '—';
  document.getElementById('viewOrgPhone').textContent       = org.phone   || '—';
  document.getElementById('viewOrgAddress').textContent     = org.address || '—';
  document.getElementById('viewOrgPlanVal').textContent     = org.plan    || '—';
  document.getElementById('viewOrgDate').textContent        = formatDate(org.created_at);

  const suspBtn = document.getElementById('panelSuspendBtn');
  if (suspBtn) {
    suspBtn.textContent = isSusp ? 'Activate' : 'Suspend';
    suspBtn.className   = `btn ${isSusp?'btn-success':'btn-danger'}`;
  }

  const heights = org.performance || [40,55,30,70,45,80,60];
  const chart   = document.getElementById('viewOrgChart');
  if (chart) chart.innerHTML = heights.map((h,i) =>
    `<div class="mini-bar ${i===heights.length-2?'accent':''}" style="height:${h}%" title="Week ${i+1}"></div>`
  ).join('');

  document.getElementById('viewOrgPanel').dataset.orgId    = org.id;
  document.getElementById('viewOrgPanel').dataset.orgName  = org.name;
  document.getElementById('viewOrgPanel').dataset.suspended = isSusp ? '1' : '0';
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
  el.innerHTML = `<div class="tab-loading">Loading users…</div>`;
  let users = [];
  try {
    const d = await safeApiGet(`${HC_CONFIG.ENDPOINTS.SA_ORG_USERS}${orgId}/users/`);
    users = Array.isArray(d) ? d : (d.results||[]);
  } catch {
    users = DEMO_USERS.filter(u => {
      const org = _orgsCache.find(o=>o.id===orgId);
      return org && u.organisation_name === org.name;
    });
  }
  if (!users.length) {
    el.innerHTML = `<div class="empty-state" style="padding:1.5rem">
      <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
      <h3>No users yet</h3><p>No users registered in this organisation.</p></div>`;
    return;
  }
  el.innerHTML = `<div class="section-label">Users (${users.length})</div>` +
    users.map(u => {
      const initials = (u.full_name||u.email||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
      const statCls  = u.is_active!==false?'badge-success':'badge-danger';
      return `<div class="org-user-item">
        <div class="org-user-avatar">${initials}</div>
        <div>
          <div class="org-user-name">${u.full_name||'—'}</div>
          <div class="org-user-role">${u.role||'—'} · ${u.email||'—'}</div>
        </div>
        <div class="org-user-right"><span class="badge ${statCls}" style="font-size:0.68rem">${u.is_active!==false?'Active':'Inactive'}</span></div>
      </div>`;
    }).join('');
}

async function loadOrgBilling(orgId) {
  const el = document.getElementById('orgBillingContent');
  el.innerHTML = `<div class="tab-loading">Loading billing…</div>`;
  let d;
  try {
    d = await safeApiGet(`${HC_CONFIG.ENDPOINTS.SA_ORG_BILLING}${orgId}/billing/`);
  } catch {
    const org = _orgsCache.find(o=>o.id===orgId);
    d = {
      plan: org?.plan || 'Pro',
      price: org?.plan==='Premium' ? 150000 : org?.plan==='Pro' ? 75000 : 25000,
      currency:'₦', billing_cycle:'month', status:'active',
      last_payment: '2026-01-01', next_payment: '2026-03-01',
      user_count: DEMO_USERS.filter(u=>u.organisation_name===org?.name).length,
      record_count: 120,
    };
  }
  el.innerHTML = `
    <div class="billing-plan-card">
      <div class="billing-plan-name">${d.plan||'—'} Plan
        <span class="badge ${d.status==='active'?'badge-success':'badge-danger'}" style="font-size:0.68rem">${d.status||'—'}</span>
      </div>
      <div class="billing-plan-price">${d.currency||'₦'}${Number(d.price||0).toLocaleString()}</div>
      <div class="billing-plan-cycle">per ${d.billing_cycle||'month'}</div>
    </div>
    <div class="section-label">Billing Details</div>
    ${[['Last Payment', d.last_payment?formatDate(d.last_payment):'—'],
       ['Next Payment', d.next_payment?formatDate(d.next_payment):'—'],
       ['Total Users',  d.user_count??'—'],
       ['Total Records',d.record_count??'—'],
    ].map(([l,v])=>`<div class="billing-info-row"><span class="billing-info-label">${l}</span><span class="billing-info-value">${v}</span></div>`).join('')}`;
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
  const name    = document.getElementById('newOrgName')?.value.trim();
  const type    = document.getElementById('newOrgType')?.value;
  const email   = document.getElementById('newOrgEmail')?.value.trim();
  const phone   = document.getElementById('newOrgPhone')?.value.trim();
  const address = document.getElementById('newOrgAddress')?.value.trim();
  const plan    = document.getElementById('newOrgPlan')?.value;
  if (!name||!type||!email||!phone||!address) { showToast('Please fill all required fields','error'); return; }

  const btn = document.querySelector('#addOrgPanel .panel-footer .btn-primary');
  setButtonLoading(btn, true, 'Add Organisation');
  let newOrg;
  try {
    newOrg = await safeApiPost(HC_CONFIG.ENDPOINTS.SA_ORGS, {name,type,email,phone,address,plan});
  } catch {
    // Create locally in demo mode
    newOrg = { id:'HC-26-'+String(Date.now()).slice(-5), name, type, email, phone, address, plan,
               status:'Active', color:ORG_COLOURS[_orgsCache.length%ORG_COLOURS.length],
               created_at: new Date().toISOString() };
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
  document.getElementById('editOrgSubtitle').textContent = `Editing: ${org.name}`;
  document.getElementById('editOrgName').value           = org.name    || '';
  document.getElementById('editOrgAddress').value        = org.address || '';
  document.getElementById('editOrgEmail').value          = org.email   || '';
  document.getElementById('editOrgPhone').value          = org.phone   || '';
  document.getElementById('editOrgType').value           = org.type    || '';
  document.getElementById('editOrgPlan').value           = org.plan    || '';
  document.getElementById('editOrgPanel').dataset.orgId  = id;
  openPanel('editOrgPanel');
}
async function submitEditOrg(e) {
  if (e && e.preventDefault) e.preventDefault();
  const id      = document.getElementById('editOrgPanel').dataset.orgId;
  const name    = document.getElementById('editOrgName')?.value.trim();
  const address = document.getElementById('editOrgAddress')?.value.trim();
  const email   = document.getElementById('editOrgEmail')?.value.trim();
  const phone   = document.getElementById('editOrgPhone')?.value.trim();
  const type    = document.getElementById('editOrgType')?.value;
  const plan    = document.getElementById('editOrgPlan')?.value;
  if (!name||!address||!email||!phone||!type) { showToast('Please fill all required fields','error'); return; }

  const btn = document.getElementById('editOrgSaveBtn');
  setButtonLoading(btn, true, 'Save Changes');
  try {
    await safeApiPatch(`${HC_CONFIG.ENDPOINTS.SA_ORG_DETAIL}${id}/`, {name,address,email,phone,type,plan});
  } catch {}
  const idx = _orgsCache.findIndex(o=>o.id===id);
  if (idx>-1) Object.assign(_orgsCache[idx], {name,address,email,phone,type,plan});
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
const ROLE_LABELS = { superadmin:'Super Admin', org_admin:'Org Admin', doctor:'Doctor', nurse:'Nurse', receptionist:'Receptionist', patient:'Patient' };
function roleLabel(r)      { return ROLE_LABELS[r] || r || '—'; }
function roleBadgeClass(r) { return `badge badge-role-${r||'patient'}`; }

async function loadUsers() {
  showSkeletonRows('userTableBody', 7, 8);
  try {
    const d = await safeApiGet(HC_CONFIG.ENDPOINTS.SA_USERS);
    _usersCache = Array.isArray(d) ? d : (d.results||[]);
  } catch {
    _usersCache = DEMO_USERS;
  }
  _usersFiltered = [..._usersCache];
  _usersPage     = 1;
  renderUsersPage();
}

function userFilterChange() {
  const q      = (document.getElementById('userSearch')?.value       || '').toLowerCase().trim();
  const role   =  document.getElementById('filterUserRole')?.value   || '';
  const status =  document.getElementById('filterUserStatus')?.value || '';
  _usersFiltered = _usersCache.filter(u =>
    (!q      || u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)) &&
    (!role   || u.role === role) &&
    (!status || (status==='active' && u.is_active) || (status==='suspended' && !u.is_active))
  );
  _usersPage = 1;
  renderUsersPage();
}
function clearUserFilters() {
  ['userSearch','filterUserRole','filterUserStatus'].forEach(id => {
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
    const safeName = (u.full_name||'').replace(/'/g,"\\'");
    return `
      <tr class="${isActive?'':'row-suspended'}">
        <td>
          <div class="user-name-cell">
            <div class="user-avatar" style="background:${colour}">${initials}</div>
            <div>
              <div class="user-name">${u.full_name||'—'}</div>
              ${u.id?`<div class="user-sub">#${u.id}</div>`:''}
            </div>
          </div>
        </td>
        <td><span class="${roleBadgeClass(u.role)}">${roleLabel(u.role)}</span></td>
        <td style="font-size:0.82rem;color:var(--text-mid)">${u.organisation_name||'—'}</td>
        <td style="font-size:0.82rem;color:var(--text-soft)">${u.email||'—'}</td>
        <td><span class="badge ${isActive?'badge-success':'badge-danger'}">
          ${!isActive?'<span class="status-dot offline" style="width:6px;height:6px;display:inline-block;margin-right:4px;vertical-align:middle"></span>':''}
          ${isActive?'Active':'Suspended'}
        </span></td>
        <td class="td-date">${formatDate(u.date_joined)}</td>
        <td>
          <div class="row-actions">
            <button class="row-btn" onclick="viewUser('${u.id}')">View</button>
            ${isActive
              ? `<button class="row-btn warn" onclick="suspendUser('${u.id}','${safeName}')">Suspend</button>`
              : `<button class="row-btn success" onclick="activateUser('${u.id}','${safeName}')">Activate</button>`}
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
  try { await safeApiPatch(`${HC_CONFIG.ENDPOINTS.SA_USER_SUSPEND}${id}/suspend/`); } catch {}
  const u=_usersCache.find(u=>u.id===id); if(u) u.is_active=false;
  userFilterChange();
  showToast(`${name} suspended`,'error');
}
async function activateUser(id, name) {
  try { await safeApiPatch(`${HC_CONFIG.ENDPOINTS.SA_USER_ACTIVATE}${id}/activate/`); } catch {}
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


/* ══════════════════════════════════════════
   8. AUDIT LOGS
══════════════════════════════════════════ */
async function loadAuditLogs() {
  showSkeletonRows('auditTbody', 6, 8);
  let rows=[];
  try {
    const d=await safeApiGet(HC_CONFIG.ENDPOINTS.SA_AUDIT);
    rows=Array.isArray(d)?d:(d.results||[]);
  } catch {
    const tbody = document.getElementById('auditTbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-soft);font-size:0.82rem">
      No audit logs — connect backend to load real data
    </td></tr>`;
    return;
  }
  const tbody=document.getElementById('auditTbody');
  if (!rows.length) { tbody.innerHTML=`<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-soft)">No audit logs found</td></tr>`; return; }
  tbody.innerHTML=rows.map(r=>`
    <tr>
      <td style="font-size:0.78rem;color:var(--text-soft)">${formatRelativeTime(r.time)}</td>
      <td class="td-mono">${r.user_id||'—'}</td>
      <td>${r.action||'—'}</td>
      <td>${r.entity||'—'}</td>
      <td class="td-mono" style="font-size:0.75rem">${r.ip||'—'}</td>
      <td>${statusBadge(r.status)}</td>
    </tr>`).join('');
}


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
  window.location.href='/public/signin.html';
}




/* ══════════════════════════════════════════
   NOTIFICATIONS
══════════════════════════════════════════ */

const DEMO_NOTIFS = [
  { id:'n1', type:'danger',  title:'Organisation suspended',     desc:'MediCare Clinic was suspended due to failed payment.',      time: new Date(Date.now()-1000*60*5).toISOString(),    read: false },
  { id:'n2', type:'warning', title:'Failed login attempts',      desc:'5 failed login attempts detected from IP 192.168.1.10.',   time: new Date(Date.now()-1000*60*32).toISOString(),   read: false },
  { id:'n3', type:'success', title:'New organisation registered', desc:'FirstCare Hospital successfully joined HealthClouda.',     time: new Date(Date.now()-1000*60*60*2).toISOString(), read: false },
  { id:'n4', type:'info',    title:'Billing plan upgraded',       desc:'City General Hospital upgraded from Pro to Premium.',      time: new Date(Date.now()-1000*60*60*5).toISOString(), read: true  },
  { id:'n5', type:'warning', title:'Storage nearing limit',       desc:'System storage is at 87% capacity. Consider expanding.',   time: new Date(Date.now()-1000*60*60*24).toISOString(),read: true  },
  { id:'n6', type:'success', title:'Backup completed',            desc:'Daily system backup completed successfully at 07:19 AM.',  time: new Date(Date.now()-1000*60*60*25).toISOString(),read: true  },
];

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
    const d  = await safeApiGet('/superadmin/notifications/');
    _notifs  = Array.isArray(d) ? d : (d.results || []);
  } catch {
    _notifs = DEMO_NOTIFS;
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
  safeApiPatch(`/superadmin/notifications/${id}/read/`).catch(() => {});
  renderNotifList();
  renderNotifBadge();
}

function markAllRead() {
  _notifs.forEach(n => n.read = true);
  safeApiPatch('/superadmin/notifications/read-all/').catch(() => {});
  renderNotifList();
  renderNotifBadge();
  showToast('All notifications marked as read', 'success');
}

function clearAllNotifs() {
  _notifs = [];
  safeApiDelete('/superadmin/notifications/').catch(() => {});
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
const DEMO_BILLING = [
  { id:'b1',  org:'City General Hospital',  plan:'Premium', amount:150000, status:'paid',    due:'2026-02-01' },
  { id:'b2',  org:'Brightview Clinic',       plan:'Pro',     amount:75000,  status:'paid',    due:'2026-02-05' },
  { id:'b3',  org:'Metro Medical Centre',    plan:'Pro',     amount:75000,  status:'paid',    due:'2026-02-05' },
  { id:'b4',  org:'HealthPlus Centre',       plan:'Premium', amount:150000, status:'pending', due:'2026-03-01' },
  { id:'b5',  org:'MediCare Clinic',         plan:'Basic',   amount:25000,  status:'overdue', due:'2026-01-15' },
  { id:'b6',  org:'NovaCare Diagnostics',    plan:'Basic',   amount:25000,  status:'paid',    due:'2026-02-10' },
  { id:'b7',  org:'PharmaPlus',              plan:'Basic',   amount:25000,  status:'pending', due:'2026-03-01' },
  { id:'b8',  org:'St. Mary\'s Hospital',    plan:'Premium', amount:150000, status:'paid',    due:'2026-02-01' },
  { id:'b9',  org:'FirstCare Hospital',      plan:'Pro',     amount:75000,  status:'paid',    due:'2026-02-08' },
  { id:'b10', org:'LagosLab Diagnostics',    plan:'Pro',     amount:75000,  status:'overdue', due:'2026-01-20' },
  { id:'b11', org:'CityPharm',               plan:'Basic',   amount:25000,  status:'paid',    due:'2026-02-12' },
  { id:'b12', org:'Medicare Plus',           plan:'Pro',     amount:75000,  status:'pending', due:'2026-03-05' },
];

let _billCache    = [];
let _billFiltered = [];
let _billPage     = 1;
let _billSortF    = '';
let _billSortD    = 'asc';
const BILL_PER_PAGE = 10;

async function loadBilling() {
  showSkeletonRows('billTableBody', 6, 6);
  try {
    const d = await safeApiGet(HC_CONFIG.ENDPOINTS.SA_BILLING);
    _billCache = Array.isArray(d) ? d : (d.results || []);
  } catch {
    _billCache = DEMO_BILLING;
  }
  _billFiltered = [..._billCache];
  _billPage = 1;
  renderBillingSummary();
  renderBillingPage();
}

function renderBillingSummary() {
  const total   = _billCache.reduce((s, b) => s + (b.amount || 0), 0);
  const active  = _billCache.filter(b => b.status !== 'overdue').length;
  const overdue = _billCache.filter(b => b.status === 'overdue').length;
  const mrr     = _billCache.filter(b => b.status === 'paid').reduce((s, b) => s + (b.amount || 0), 0);

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.innerHTML = val; };
  set('billStatRevenue', formatMoney(total));
  set('billStatActive',  active);
  set('billStatOverdue', overdue);
  set('billStatMRR',     formatMoney(mrr));

  if (overdue > 0) setTrend('billTrendOverdue', `${overdue} need attention`, false);
  setTrend('billTrendRevenue', 'This billing cycle', true);
  setTrend('billTrendActive',  `${active} of ${_billCache.length} orgs`, true);
  setTrend('billTrendMRR',     'Monthly recurring', true);

  // Plan breakdown
  const plans   = { Premium: 0, Pro: 0, Basic: 0 };
  _billCache.forEach(b => { if (plans[b.plan] !== undefined) plans[b.plan]++; });
  const maxPlan = Math.max(...Object.values(plans)) || 1;
  Object.entries(plans).forEach(([plan, count]) => {
    const bar = document.getElementById('bar' + plan);
    const cnt = document.getElementById('count' + plan);
    if (bar) bar.style.width = Math.round((count / maxPlan) * 100) + '%';
    if (cnt) cnt.textContent = count;
  });

  // Payment status
  const paid    = _billCache.filter(b => b.status === 'paid').length;
  const pending = _billCache.filter(b => b.status === 'pending').length;
  set('billPaidCount',    paid);
  set('billPendingCount', pending);
  set('billOverdueCount', overdue);
}

function billFilterChange() {
  const q      = (document.getElementById('billSearch')?.value || '').toLowerCase().trim();
  const plan   =  document.getElementById('filterBillPlan')?.value || '';
  const status =  document.getElementById('filterBillStatus')?.value || '';
  _billFiltered = _billCache.filter(b =>
    (!q      || b.org?.toLowerCase().includes(q)) &&
    (!plan   || b.plan   === plan) &&
    (!status || b.status === status)
  );
  _billPage = 1;
  renderBillingPage();
}
function clearBillFilters() {
  ['billSearch','filterBillPlan','filterBillStatus'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  _billFiltered = [..._billCache];
  _billPage = 1;
  renderBillingPage();
}
function sortBilling(field) {
  _billSortD = _billSortF === field ? (_billSortD === 'asc' ? 'desc' : 'asc') : 'asc';
  _billSortF = field;
  ['plan','amount','date'].forEach(f => {
    const el = document.getElementById('bsort-' + f); if (!el) return;
    el.textContent = f === field ? (_billSortD === 'asc' ? '↑' : '↓') : '↕';
  });
  const planOrder = { Basic:1, Pro:2, Premium:3 };
  _billFiltered.sort((a, b) => {
    let va, vb;
    if (field === 'plan')   { va = planOrder[a.plan] || 0; vb = planOrder[b.plan] || 0; }
    if (field === 'amount') { va = a.amount || 0; vb = b.amount || 0; }
    if (field === 'date')   { va = new Date(a.due || 0); vb = new Date(b.due || 0); }
    if (va < vb) return _billSortD === 'asc' ? -1 : 1;
    if (va > vb) return _billSortD === 'asc' ?  1 : -1;
    return 0;
  });
  _billPage = 1;
  renderBillingPage();
}
function renderBillingPage() {
  const total = _billFiltered.length;
  const pages = Math.ceil(total / BILL_PER_PAGE) || 1;
  _billPage   = Math.min(_billPage, pages);
  const from  = (_billPage - 1) * BILL_PER_PAGE;
  const slice = _billFiltered.slice(from, from + BILL_PER_PAGE);
  const countEl = document.getElementById('billCount');
  if (countEl) countEl.textContent = total === 0
    ? 'No transactions found'
    : `Showing ${from + 1}–${Math.min(from + BILL_PER_PAGE, total)} of ${total} transaction${total !== 1 ? 's' : ''}`;
  renderBillingTable(slice);
  renderBillingPagination(pages);
}
function renderBillingTable(data) {
  const tbody = document.getElementById('billTableBody');
  if (!tbody) return;
  if (!data?.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state" style="padding:2.5rem">
      <svg viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
      <h3>No transactions found</h3><p>Try adjusting your filters.</p>
    </div></td></tr>`;
    return;
  }
  const planCls = p => p === 'Premium' ? 'badge-warning' : p === 'Pro' ? 'badge-purple' : 'badge-info';
  const stCls   = s => s === 'paid' ? 'badge-paid' : s === 'pending' ? 'badge-pending' : 'badge-overdue';
  tbody.innerHTML = data.map(b => `
    <tr class="${b.status === 'overdue' ? 'row-suspended' : ''}">
      <td>
        <div class="org-name-cell">
          <div class="org-avatar" style="background:${ORG_COLOURS[Math.abs(b.id?.charCodeAt(1) || 0) % ORG_COLOURS.length]}">${(b.org || '??').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}</div>
          <span class="org-name">${b.org || '—'}</span>
        </div>
      </td>
      <td><span class="badge ${planCls(b.plan)}">${b.plan || '—'}</span></td>
      <td style="font-weight:600;color:var(--text-dark)">₦${Number(b.amount || 0).toLocaleString()}</td>
      <td><span class="badge ${stCls(b.status)}">${b.status ? b.status.charAt(0).toUpperCase() + b.status.slice(1) : '—'}</span></td>
      <td class="td-date">${formatDate(b.due)}</td>
      <td>
        <div class="row-actions">
          ${b.status === 'overdue' ? `<button class="row-btn warn" onclick="sendPaymentReminder('${b.id}','${(b.org||'').replace(/'/g,"\\'")}')">Remind</button>` : ''}
          ${b.status !== 'paid' ? `<button class="row-btn success" onclick="markBillPaid('${b.id}')">Mark Paid</button>` : '<span style="font-size:0.75rem;color:var(--success);font-weight:600">✓ Paid</span>'}
        </div>
      </td>
    </tr>`).join('');
}
function renderBillingPagination(totalPages) {
  const el = document.getElementById('billPagination');
  if (!el) return;
  if (totalPages <= 1) { el.innerHTML = ''; return; }
  let html = `<button class="page-btn" onclick="goBillPage(${_billPage - 1})" ${_billPage === 1 ? 'disabled' : ''}>‹</button>`;
  for (let p = 1; p <= totalPages; p++) {
    if (totalPages > 7 && p > 2 && p < totalPages - 1 && Math.abs(p - _billPage) > 1) {
      if (p === 3 || p === totalPages - 2) html += `<span class="page-ellipsis">…</span>`;
      continue;
    }
    html += `<button class="page-btn ${p === _billPage ? 'active' : ''}" onclick="goBillPage(${p})">${p}</button>`;
  }
  html += `<button class="page-btn" onclick="goBillPage(${_billPage + 1})" ${_billPage === totalPages ? 'disabled' : ''}>›</button>`;
  el.innerHTML = html;
}
function goBillPage(p) {
  _billPage = Math.max(1, Math.min(p, Math.ceil(_billFiltered.length / BILL_PER_PAGE) || 1));
  renderBillingPage();
}
function markBillPaid(id) {
  const b = _billCache.find(b => b.id === id);
  if (!b) return;
  b.status = 'paid';
  safeApiPatch(`/superadmin/billing/${id}/paid/`).catch(() => {});
  billFilterChange();
  renderBillingSummary();
  showToast(`${b.org} marked as paid`, 'success');
}
function sendPaymentReminder(id, org) {
  safeApiPost(`/superadmin/billing/${id}/remind/`).catch(() => {});
  showToast(`Payment reminder sent to ${org}`, 'success');
}
function exportBillingCSV() {
  if (!_billFiltered.length) { showToast('No data to export', ''); return; }
  const headers = ['Organisation', 'Plan', 'Amount', 'Status', 'Due Date'];
  const rows    = _billFiltered.map(b => [
    b.org, b.plan, b.amount, b.status,
    b.due ? new Date(b.due).toLocaleDateString() : '',
  ].map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(','));
  const csv  = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: `billing-${new Date().toISOString().slice(0, 10)}.csv` });
  a.click(); URL.revokeObjectURL(url);
  showToast('CSV downloaded', 'success');
}


/* ══════════════════════════════════════════════
   MESSAGES
══════════════════════════════════════════════ */
const DEMO_MSGS = [
  { id:'m1', from:'City General Hospital',    subject:'Billing query for February',    body:'Dear Admin,\n\nWe noticed a discrepancy in our February billing statement. The amount charged was ₦150,000 but we expected ₦120,000 based on our agreement.\n\nKindly review and revert.\n\nThank you.',           time: new Date(Date.now()-1000*60*15).toISOString(),    unread:true,  priority:'high',   direction:'in',  color:'#0075FF' },
  { id:'m2', from:'MediCare Clinic',           subject:'Request to reactivate account', body:'Hello,\n\nOur account was suspended last month due to a payment delay. We have since cleared all outstanding payments. Please reactivate our account at your earliest convenience.\n\nRegards,\nDr. John Peters', time: new Date(Date.now()-1000*60*60*2).toISOString(),  unread:true,  priority:'urgent', direction:'in',  color:'#dc2626' },
  { id:'m3', from:'Brightview Clinic',         subject:'New staff onboarding support',  body:'Hi,\n\nWe are onboarding 5 new nurses and 2 doctors next week. Could you please guide us on how to bulk-add users to our organisation dashboard?\n\nThanks,\nDr. Chinwe',                                     time: new Date(Date.now()-1000*60*60*5).toISOString(),  unread:false, priority:'normal', direction:'in',  color:'#16a34a' },
  { id:'m4', from:'Super Admin',               subject:'System Maintenance Notice',     body:'Dear Organisations,\n\nPlease be informed that HealthClouda will undergo scheduled maintenance on Saturday, March 1st 2026 from 12:00 AM to 4:00 AM WAT.\n\nDuring this window, the platform will be temporarily unavailable.\n\nWe apologise for any inconvenience.', time: new Date(Date.now()-1000*60*60*24).toISOString(), unread:false, priority:'high',   direction:'out', color:'#7c3aed' },
  { id:'m5', from:'NovaCare Diagnostics',      subject:'Feature request: Lab integration', body:'Hello Admin,\n\nWe would love to see a direct lab results integration feature in our dashboard. This would help our doctors access results faster.\n\nIs this on the roadmap?\n\nBest,\nFatima Sani',          time: new Date(Date.now()-1000*60*60*48).toISOString(), unread:false, priority:'normal', direction:'in',  color:'#0891b2' },
];

let _msgs        = [];
let _msgsFilter  = 'all';
let _activeMsgId = null;

async function loadMessages() {
  const list = document.getElementById('msgList');
  if (list) list.innerHTML = Array(5).fill('<div class="msg-item" style="pointer-events:none"><div class="msg-item-avatar" style="background:linear-gradient(90deg,#f0f4fa 25%,#e2e8f0 50%,#f0f4fa 75%);background-size:200%;animation:shimmer 1.4s infinite"></div><div class="msg-item-body"><div class="msg-item-header"><div style="height:11px;width:120px;border-radius:4px;background:linear-gradient(90deg,#f0f4fa 25%,#e2e8f0 50%,#f0f4fa 75%);background-size:200%;animation:shimmer 1.4s infinite"></div><div style="height:9px;width:40px;border-radius:4px;background:linear-gradient(90deg,#f0f4fa 25%,#e2e8f0 50%,#f0f4fa 75%);background-size:200%;animation:shimmer 1.4s infinite"></div></div><div style="height:10px;width:160px;border-radius:4px;margin:5px 0 4px;background:linear-gradient(90deg,#f0f4fa 25%,#e2e8f0 50%,#f0f4fa 75%);background-size:200%;animation:shimmer 1.4s infinite"></div><div style="height:9px;width:100px;border-radius:4px;background:linear-gradient(90deg,#f0f4fa 25%,#e2e8f0 50%,#f0f4fa 75%);background-size:200%;animation:shimmer 1.4s infinite"></div></div></div>').join('');
  try {
    const d = await safeApiGet('/superadmin/messages/');
    _msgs = Array.isArray(d) ? d : (d.results || []);
  } catch {
    _msgs = DEMO_MSGS;
  }
  populateMsgOrgDropdown();
  renderMsgList();
}

function populateMsgOrgDropdown() {
  const sel = document.getElementById('msgTo');
  if (!sel) return;
  sel.innerHTML = '<option value="">Select organisation…</option>' +
    _orgsCache.map(o => `<option value="${o.id}">${o.name}</option>`).join('');
}

function msgFilterChange() {
  renderMsgList();
}
function setMsgFilter(filter, btn) {
  _msgsFilter = filter;
  document.querySelectorAll('.msg-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderMsgList();
}
function renderMsgList() {
  const q    = (document.getElementById('msgSearch')?.value || '').toLowerCase().trim();
  const list = document.getElementById('msgList');
  if (!list) return;
  let filtered = _msgs.filter(m => {
    if (_msgsFilter === 'unread') return m.unread;
    if (_msgsFilter === 'sent')   return m.direction === 'out';
    return true;
  }).filter(m => !q || m.from?.toLowerCase().includes(q) || m.subject?.toLowerCase().includes(q));

  if (!filtered.length) {
    list.innerHTML = `<div class="notif-empty"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><p>No messages found</p></div>`;
    return;
  }
  list.innerHTML = filtered.map(m => {
    const initials = m.from.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const priCls   = m.priority === 'urgent' ? 'msg-priority-urgent' : m.priority === 'high' ? 'msg-priority-high' : '';
    return `<div class="msg-item ${m.unread ? 'unread' : ''} ${m.id === _activeMsgId ? 'active' : ''} ${priCls}" onclick="openMsg('${m.id}')">
      <div class="msg-item-avatar" style="background:${m.color || '#0075FF'}">${initials}</div>
      <div class="msg-item-body">
        <div class="msg-item-header">
          <span class="msg-item-from">${m.from}</span>
          <span class="msg-item-time">${notifTimeAgo(m.time)}</span>
        </div>
        <div class="msg-item-subject">${m.subject}</div>
        <div class="msg-item-preview">${m.body?.split('\n')[0] || ''}</div>
      </div>
      ${m.unread ? '<span class="msg-unread-dot"></span>' : ''}
    </div>`;
  }).join('');
}
function openMsg(id) {
  const m = _msgs.find(m => m.id === id);
  if (!m) return;
  _activeMsgId = id;
  m.unread = false;
  renderMsgList();

  // Show inline in viewer pane
  const viewer = document.getElementById('msgViewer');
  if (!viewer) return;
  const initials = m.from.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const priCls   = { urgent: 'badge-urgent', high: 'badge-high', normal: 'badge-normal' };
  viewer.innerHTML = `
    <div class="msg-view-header">
      <div>
        <div class="msg-view-subject">${m.subject}</div>
        <div class="msg-view-meta">${m.direction === 'out' ? 'Sent to all organisations' : 'From: ' + m.from} · ${notifTimeAgo(m.time)}</div>
      </div>
      <span class="badge ${priCls[m.priority] || 'badge-normal'}">${m.priority?.charAt(0).toUpperCase() + m.priority?.slice(1)}</span>
    </div>
    <div class="msg-view-body-wrap">
      <div class="msg-view-body">${m.body || '—'}</div>
    </div>
    <div class="msg-view-reply">
      <textarea id="inlineReply" placeholder="Type a reply…"></textarea>
      <button class="btn btn-primary" style="align-self:flex-end" onclick="sendInlineReply('${m.id}')">Reply</button>
    </div>`;

  safeApiPatch(`/superadmin/messages/${id}/read/`).catch(() => {});
  updateMsgBadge();
}
function updateMsgBadge() {
  const unread = _msgs.filter(m => m.unread).length;
  const badge  = document.querySelector('[data-page="messages"] .nav-badge');
  if (badge) badge.textContent = unread > 0 ? unread : '';
  if (badge && unread === 0) badge.style.display = 'none';
}
function sendInlineReply(id) {
  const body = document.getElementById('inlineReply')?.value.trim();
  if (!body) { showToast('Please type a reply first', ''); return; }
  safeApiPost('/superadmin/messages/', { reply_to: id, body }).catch(() => {});
  document.getElementById('inlineReply').value = '';
  showToast('Reply sent', 'success');
}
function openComposePanel() {
  if (!_loaded.has('organisations')) loadPage('organisations');
  setTimeout(populateMsgOrgDropdown, 300);
  openPanel('composeMsgPanel');
}
function sendMessage() {
  const to       = document.getElementById('msgTo')?.value;
  const subject  = document.getElementById('msgSubject')?.value.trim();
  const priority = document.getElementById('msgPriority')?.value;
  const body     = document.getElementById('msgBody')?.value.trim();
  if (!subject || !body) { showToast('Subject and message are required', ''); return; }

  const btn = document.getElementById('msgSendBtn');
  setButtonLoading(btn, true, 'Send Message');
  safeApiPost('/superadmin/messages/', { to, subject, priority, body })
    .catch(() => {})
    .finally(() => {
      const orgName = document.getElementById('msgTo')?.selectedOptions[0]?.text || 'All Organisations';
      _msgs.unshift({ id: 'm' + Date.now(), from: 'Super Admin', subject, body, priority, time: new Date().toISOString(), unread: false, direction: 'out', color: '#7c3aed' });
      renderMsgList();
      closePanel('composeMsgPanel');
      document.getElementById('msgSubject').value = '';
      document.getElementById('msgBody').value    = '';
      showToast(`Message sent to ${orgName}`, 'success');
      setButtonLoading(btn, false, 'Send Message');
    });
}


/* ══════════════════════════════════════════════
   AUDIT LOGS (full version)
══════════════════════════════════════════════ */
const DEMO_AUDIT = [
  { id:'a1',  time:new Date(Date.now()-1000*60*5).toISOString(),     user_id:'HC-25-00001', action:'Update Billing Plan',    entity:'City General Hospital', ip:'197.210.52.11',  status:'successful' },
  { id:'a2',  time:new Date(Date.now()-1000*60*32).toISOString(),    user_id:'HC-25-00005', action:'Account Suspended',      entity:'MediCare Clinic',        ip:'102.89.33.44',   status:'suspended'  },
  { id:'a3',  time:new Date(Date.now()-1000*60*60).toISOString(),    user_id:'U002',        action:'Added New Record',       entity:'Patient #P-1023',        ip:'105.112.88.21',  status:'completed'  },
  { id:'a4',  time:new Date(Date.now()-1000*60*90).toISOString(),    user_id:'U004',        action:'Failed Login Attempt',   entity:'MediCare Clinic',        ip:'192.168.1.10',   status:'failed'     },
  { id:'a5',  time:new Date(Date.now()-1000*60*120).toISOString(),   user_id:'HC-25-00002', action:'New Organisation Added', entity:'Brightview Clinic',      ip:'41.58.104.22',   status:'successful' },
  { id:'a6',  time:new Date(Date.now()-1000*60*180).toISOString(),   user_id:'U006',        action:'Updated Patient Record', entity:'Patient #P-0887',        ip:'197.210.64.55',  status:'completed'  },
  { id:'a7',  time:new Date(Date.now()-1000*60*60*6).toISOString(),  user_id:'HC-25-00003', action:'Activated Account',      entity:'Metro Medical Centre',   ip:'105.113.22.90',  status:'successful' },
  { id:'a8',  time:new Date(Date.now()-1000*60*60*8).toISOString(),  user_id:'U003',        action:'User Role Changed',      entity:'Nurse Amaka Obi',        ip:'102.90.45.67',   status:'successful' },
  { id:'a9',  time:new Date(Date.now()-1000*60*60*12).toISOString(), user_id:'HC-25-00006', action:'Billing Payment Made',   entity:'NovaCare Diagnostics',   ip:'41.211.78.33',   status:'successful' },
  { id:'a10', time:new Date(Date.now()-1000*60*60*24).toISOString(), user_id:'U001',        action:'Password Changed',       entity:'Dr. Aliyu Musa',         ip:'197.210.52.11',  status:'successful' },
  { id:'a11', time:new Date(Date.now()-1000*60*60*26).toISOString(), user_id:'HC-25-00010', action:'Account Suspended',      entity:'LagosLab Diagnostics',   ip:'102.89.33.55',   status:'suspended'  },
  { id:'a12', time:new Date(Date.now()-1000*60*60*30).toISOString(), user_id:'U007',        action:'Deleted Record',         entity:'Patient #P-0541',        ip:'197.211.44.12',  status:'failed'     },
  { id:'a13', time:new Date(Date.now()-1000*60*60*36).toISOString(), user_id:'HC-25-00008', action:'Plan Upgraded',          entity:'St. Mary\'s Hospital',   ip:'41.58.104.80',   status:'successful' },
  { id:'a14', time:new Date(Date.now()-1000*60*60*48).toISOString(), user_id:'U005',        action:'Login Success',          entity:'Grace Adewale',          ip:'105.112.88.99',  status:'successful' },
  { id:'a15', time:new Date(Date.now()-1000*60*60*50).toISOString(), user_id:'U004',        action:'Failed Login Attempt',   entity:'MediCare Clinic',        ip:'192.168.1.10',   status:'failed'     },
];

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
    _auditCache = DEMO_AUDIT;
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

/* Wire billing, messages, audit into loadPage */