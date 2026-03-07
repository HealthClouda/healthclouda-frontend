/* ═══════════════════════════════════════════════════════════
   HealthClouda — Patient Dashboard
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
    if (role && role !== 'patient') {
      hc_redirectByRole(user.role);
      return;
    }
  }

  const name = (user && (user.full_name || [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email)) || 'Patient';
  const el = (id) => document.getElementById(id);
  if (el('sidebarUserName'))  el('sidebarUserName').textContent  = name;
  if (el('sidebarUserRole'))  el('sidebarUserRole').textContent  = 'Patient';
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
    case 'dashboard':     loadDashboard();     break;
    case 'visits':        loadVisits();        break;
    case 'referrals':     loadReferrals();     break;
    case 'profile':       loadProfile();       break;
    case 'notifications': loadNotifications(); break;
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

function formatRelativeDate(iso) {
  if (!iso) return 'No visits yet';
  const d   = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7)   return diff + ' days ago';
  return formatDate(iso);
}

function statusBadge(status) {
  if (!status) return '';
  const s = status.toLowerCase();
  const map = {
    active:    'badge-success',
    open:      'badge-success',
    completed: 'badge-info',
    closed:    'badge-info',
    cancelled: 'badge-danger',
    discharged:'badge-warning',
  };
  return '<span class="badge ' + (map[s] || 'badge-info') + '">' + escapeHtml(status) + '</span>';
}

function typeBadge(type) {
  if (!type) return '';
  return '<span class="badge badge-info">' + escapeHtml(type) + '</span>';
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


/* ══════════════════════════════════════════
   4. DEMO DATA (offline dev)
══════════════════════════════════════════ */
const DEMO_PROFILE = {
  healthclouda_id: 'HC-100234',
  first_name: 'Adaeze', last_name: 'Okafor',
  email: 'adaeze@gmail.com', phone: '+2348012345678',
  date_of_birth: '1995-06-15', age: 30, gender: 'Female',
  address: '12 Marina Road', city: 'Lagos', state: 'Lagos', country: 'Nigeria',
  blood_type: 'O+', genotype: 'AA',
  allergies: 'Penicillin', chronic_diseases: 'None', current_medications: 'None',
  emergency_contact_name: 'Chidi Okafor', emergency_contact_phone: '+2348098765432', emergency_contact_relationship: 'Brother',
  consent_status: true, total_episodes: 3, has_active_episode: true
};

const DEMO_DASHBOARD = {
  total_episodes: 3, active_episodes: 1, completed_episodes: 2,
  organizations_visited: [{ name: 'LUTH Hospital', slug: 'luth-hospital' }, { name: 'Reddington Hospital', slug: 'reddington' }],
  last_visit_date: '2026-02-24T21:44:49Z',
  active_prescriptions: [
    { organization: 'LUTH Hospital', episode_type: 'OUTPATIENT', prescribed_drugs: 'Amoxicillin 500mg x3 daily for 7 days, Paracetamol 500mg as needed' }
  ],
  active_instructions: [
    { organization: 'LUTH Hospital', episode_type: 'OUTPATIENT', instructions: 'Rest for 48 hours. Drink plenty of fluids. Return if symptoms worsen.' }
  ],
  unread_notifications: 2
};

const DEMO_EPISODES = [
  { id: 1, organization: { name: 'LUTH Hospital', org_id: 'org1' }, episode_type: 'OUTPATIENT', chief_complaint_summary: 'Persistent headache for 3 days', diagnosis_summary: 'Tension headache', status: 'ACTIVE', episode_start: '2026-02-24T10:00:00Z', episode_end: null },
  { id: 2, organization: { name: 'LUTH Hospital', org_id: 'org1' }, episode_type: 'OUTPATIENT', chief_complaint_summary: 'Routine checkup', diagnosis_summary: 'Healthy — no concerns', status: 'COMPLETED', episode_start: '2026-01-10T09:00:00Z', episode_end: '2026-01-10T11:00:00Z' },
  { id: 3, organization: { name: 'Reddington Hospital', org_id: 'org2' }, episode_type: 'EMERGENCY', chief_complaint_summary: 'Sprained ankle', diagnosis_summary: 'Grade 1 ankle sprain', status: 'COMPLETED', episode_start: '2025-12-05T14:00:00Z', episode_end: '2025-12-05T18:00:00Z' },
];

const DEMO_EPISODE_DETAIL = {
  id: 1, chief_complaint: 'Persistent headache for 3 days, worsening with screen time',
  diagnosis: 'Tension headache — likely related to stress and prolonged screen use',
  prescribed_drugs: 'Amoxicillin 500mg x3 daily for 7 days\nParacetamol 500mg as needed',
  patient_instructions: 'Rest for 48 hours. Avoid prolonged screen time. Drink plenty of fluids. Return if symptoms worsen or new symptoms appear.',
  vitals: { blood_pressure: '120/80', heart_rate: '72 bpm', temperature: '36.8°C', weight: '68 kg' },
  status: 'ACTIVE', episode_start: '2026-02-24T10:00:00Z', episode_end: null,
  organization: { name: 'LUTH Hospital' }, episode_type: 'OUTPATIENT'
};

const DEMO_REFERRALS_LIST = [
  {
    id: 'ref-uuid-1', letter_number: 'REF-NG-LUTH-20260303-0001',
    from_organization: { name: 'LUTH Hospital' },
    to_organization: { name: 'Reddington Hospital' },
    referring_doctor: { full_name: 'Dr. John Smith' },
    reason: 'Specialist consultation for persistent cardiac arrhythmia requiring advanced diagnostic evaluation.',
    urgency: 'URGENT', urgency_display: 'Urgent',
    status: 'PENDING', status_display: 'Pending',
    has_letter: true,
    created_at: '2026-03-03T12:00:00Z'
  },
  {
    id: 'ref-uuid-2', letter_number: 'REF-NG-LUTH-20260220-0042',
    from_organization: { name: 'LUTH Hospital' },
    to_organization: { name: 'ABC School Clinic' },
    referring_doctor: { full_name: 'Dr. Amadi Chinedu' },
    reason: 'Routine follow-up for post-operative care after appendectomy.',
    urgency: 'ROUTINE', urgency_display: 'Routine',
    status: 'ACCEPTED', status_display: 'Accepted',
    has_letter: true,
    created_at: '2026-02-20T09:30:00Z'
  },
  {
    id: 'ref-uuid-3', letter_number: 'REF-NG-REDD-20260105-0015',
    from_organization: { name: 'Reddington Hospital' },
    to_organization: { name: 'LUTH Hospital' },
    referring_doctor: { full_name: 'Dr. Fatima Bello' },
    reason: 'Orthopaedic evaluation for Grade 2 ankle sprain with possible ligament damage.',
    urgency: 'EMERGENCY', urgency_display: 'Emergency',
    status: 'COMPLETED', status_display: 'Completed',
    has_letter: false,
    created_at: '2026-01-05T14:00:00Z'
  }
];

const DEMO_REFERRAL_DETAIL = {
  id: 'ref-uuid-1', letter_number: 'REF-NG-LUTH-20260303-0001',
  from_organization: { name: 'LUTH Hospital', org_type: 'HOSPITAL', address: 'Idi-Araba, Lagos', city: 'Lagos', state: 'Lagos' },
  to_organization: { name: 'Reddington Hospital', org_type: 'HOSPITAL', address: 'Victoria Island, Lagos', city: 'Lagos', state: 'Lagos' },
  referring_doctor: { full_name: 'Dr. John Smith', email: 'doctor@luth.edu', phone: '+2348012345678' },
  reason: 'Specialist consultation for persistent cardiac arrhythmia requiring advanced diagnostic evaluation.',
  clinical_findings: 'Irregular heartbeat detected during routine examination. ECG shows occasional PVCs. Patient reports intermittent palpitations for 3 weeks.',
  provisional_diagnosis: 'Premature ventricular contractions (PVCs) — possible underlying structural heart disease.',
  recommended_investigations: 'Holter monitor (24h), Echocardiogram, Cardiac MRI if indicated.',
  recommended_treatment: 'Beta-blocker therapy pending specialist review. Avoid caffeine and strenuous exercise.',
  response_notes: '',
  urgency: 'URGENT', urgency_display: 'Urgent',
  status: 'PENDING', status_display: 'Pending',
  has_letter: true,
  created_at: '2026-03-03T12:00:00Z'
};

const DEMO_NOTIFICATIONS = [
  { id: 1, notification_type: 'EPISODE_CREATED', title: 'New Episode Created', message: 'A new outpatient episode has been created for you at LUTH Hospital.', is_read: false, organization_name: 'LUTH Hospital', created_at: '2026-02-24T10:05:00Z' },
  { id: 2, notification_type: 'EPISODE_CLOSED', title: 'Episode Completed', message: 'Your outpatient episode at LUTH Hospital has been marked as completed.', is_read: false, organization_name: 'LUTH Hospital', created_at: '2026-01-10T11:05:00Z' },
  { id: 3, notification_type: 'REFERRAL_SENT', title: 'Referral Sent', message: 'You have been referred to Reddington Hospital for further evaluation.', is_read: true, organization_name: 'LUTH Hospital', created_at: '2025-12-04T09:00:00Z' },
];


/* ══════════════════════════════════════════
   5. DASHBOARD PAGE
══════════════════════════════════════════ */
let _patientProfile = null;

async function loadDashboard() {
  // Show shimmer
  document.getElementById('statTotalVisits').innerHTML    = shimmerBlock();
  document.getElementById('statActiveEpisodes').innerHTML = shimmerBlock();
  document.getElementById('statCompleted').innerHTML      = shimmerBlock();
  document.getElementById('statLastVisit').innerHTML      = shimmerBlock();

  // Fetch profile + dashboard stats in parallel
  let profile = null;
  let dashboard = null;

  try {
    [profile, dashboard] = await Promise.all([
      safeApiGet(HC_CONFIG.ENDPOINTS.PATIENT_ME),
      safeApiGet(HC_CONFIG.ENDPOINTS.PATIENT_DASHBOARD),
    ]);
  } catch {
    profile   = DEMO_PROFILE;
    dashboard = DEMO_DASHBOARD;
  }

  _patientProfile = profile;

  // Welcome banner
  const firstName = profile.first_name || profile.email || 'Patient';
  document.getElementById('welcomeMsg').textContent = 'Welcome, ' + firstName;
  document.getElementById('hcIdBadge').textContent  = profile.healthclouda_id || 'HC-######';

  // Update header + sidebar
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email || 'Patient';
  const el = (id) => document.getElementById(id);
  if (el('headerUserName'))  el('headerUserName').textContent  = fullName;
  if (el('sidebarUserName')) el('sidebarUserName').textContent = fullName;
  if (el('sidebarAvatar'))   el('sidebarAvatar').textContent   = fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  // Stats
  el('statTotalVisits').textContent    = dashboard.total_episodes ?? '—';
  el('statActiveEpisodes').textContent = dashboard.active_episodes ?? '—';
  el('statCompleted').textContent      = dashboard.completed_episodes ?? '—';
  el('statLastVisit').textContent      = formatRelativeDate(dashboard.last_visit_date);

  // Active prescriptions
  const rxContainer = document.getElementById('prescriptionsContainer');
  const rxList = dashboard.active_prescriptions || [];
  if (rxList.length === 0) {
    rxContainer.innerHTML = '<div class="empty-state">No active prescriptions.</div>';
  } else {
    rxContainer.innerHTML = rxList.map(rx =>
      '<div class="rx-item">' +
        '<div class="rx-org">' + escapeHtml(rx.organization) + ' ' + typeBadge(rx.episode_type) + '</div>' +
        '<div class="rx-text">' + escapeHtml(rx.prescribed_drugs) + '</div>' +
      '</div>'
    ).join('');
  }

  // Active instructions
  const ixContainer = document.getElementById('instructionsContainer');
  const ixList = dashboard.active_instructions || [];
  if (ixList.length === 0) {
    ixContainer.innerHTML = '<div class="empty-state">No active instructions.</div>';
  } else {
    ixContainer.innerHTML = ixList.map(ix =>
      '<div class="rx-item">' +
        '<div class="rx-org">' + escapeHtml(ix.organization) + ' ' + typeBadge(ix.episode_type) + '</div>' +
        '<div class="rx-text">' + escapeHtml(ix.instructions) + '</div>' +
      '</div>'
    ).join('');
  }

  // Organizations visited
  const orgsContainer = document.getElementById('orgsVisitedContainer');
  const orgsList = dashboard.organizations_visited || [];
  if (orgsList.length === 0) {
    orgsContainer.innerHTML = '<div class="empty-state">No organizations visited yet.</div>';
  } else {
    orgsContainer.innerHTML = '<div class="org-chips">' +
      orgsList.map(o => '<span class="org-chip">' + escapeHtml(o.name) + '</span>').join('') +
    '</div>';
  }

  // Update notification badge from dashboard data
  updateNotifBadge(dashboard.unread_notifications || 0);
}


/* ══════════════════════════════════════════
   6. VISIT HISTORY PAGE
══════════════════════════════════════════ */
let _episodesCache = [];

async function loadVisits() {
  const container = document.getElementById('visitsContainer');
  container.innerHTML = '<div class="episode-list">' +
    Array(3).fill(
      '<div class="episode-card" style="pointer-events:none">' + shimmerBlock() + '<br>' + shimmerBlock() + '</div>'
    ).join('') + '</div>';

  try {
    const data = await safeApiGet(HC_CONFIG.ENDPOINTS.EPISODES);
    _episodesCache = Array.isArray(data) ? data : (data.results || []);
  } catch {
    _episodesCache = DEMO_EPISODES;
  }

  renderEpisodeList();
}

function renderEpisodeList() {
  const container = document.getElementById('visitsContainer');

  if (_episodesCache.length === 0) {
    container.innerHTML = '<div class="empty-state">No episodes found. Your medical visits will appear here.</div>';
    return;
  }

  container.innerHTML = '<div class="episode-list">' +
    _episodesCache.map(ep => {
      const orgName = ep.organization?.name || ep.organization_name || '';
      const date = formatDate(ep.episode_start || ep.created_at);
      return '<div class="episode-card" onclick="openEpisodeDetail(' + ep.id + ')">' +
        '<div class="episode-top">' +
          '<span class="episode-date">' + escapeHtml(date) + '</span>' +
          '<div class="episode-meta">' +
            (orgName ? '<span class="episode-org-name">' + escapeHtml(orgName) + '</span>' : '') +
            statusBadge(ep.status) +
          '</div>' +
        '</div>' +
        (ep.episode_type ? '<div class="episode-field"><div class="episode-field-label">Type</div><div class="episode-field-value">' + typeBadge(ep.episode_type) + '</div></div>' : '') +
        (ep.chief_complaint_summary ? '<div class="episode-field"><div class="episode-field-label">Chief Complaint</div><div class="episode-field-value">' + escapeHtml(ep.chief_complaint_summary) + '</div></div>' : '') +
        (ep.diagnosis_summary ? '<div class="episode-field"><div class="episode-field-label">Diagnosis</div><div class="episode-field-value">' + escapeHtml(ep.diagnosis_summary) + '</div></div>' : '') +
      '</div>';
    }).join('') +
  '</div>';
}

async function openEpisodeDetail(id) {
  const panel = document.getElementById('episodePanel');
  const body  = document.getElementById('episodePanelBody');
  const overlay = document.getElementById('overlay');

  panel.classList.add('open');
  overlay.classList.add('open');
  body.innerHTML = '<div class="empty-state">' + shimmerBlock() + '</div>';

  let detail = null;
  try {
    detail = await safeApiGet(HC_CONFIG.ENDPOINTS.EPISODES + id + '/');
  } catch {
    detail = DEMO_EPISODE_DETAIL;
  }

  const orgName = detail.organization?.name || detail.organization_name || '';
  const vitals  = detail.vitals || {};

  let html = '';

  // Top info
  html += '<div class="detail-row" style="margin-bottom:1.25rem">';
  html += '<div class="detail-field"><div class="detail-label">Status</div><div class="detail-value">' + statusBadge(detail.status) + '</div></div>';
  html += '<div class="detail-field"><div class="detail-label">Type</div><div class="detail-value">' + typeBadge(detail.episode_type) + '</div></div>';
  html += '</div>';

  if (orgName) {
    html += '<div class="detail-field"><div class="detail-label">Organization</div><div class="detail-value">' + escapeHtml(orgName) + '</div></div>';
  }

  html += '<div class="detail-row">';
  html += '<div class="detail-field"><div class="detail-label">Start Date</div><div class="detail-value">' + formatDate(detail.episode_start) + '</div></div>';
  html += '<div class="detail-field"><div class="detail-label">End Date</div><div class="detail-value">' + (detail.episode_end ? formatDate(detail.episode_end) : 'Ongoing') + '</div></div>';
  html += '</div>';

  if (detail.chief_complaint) {
    html += '<div class="detail-field"><div class="detail-label">Chief Complaint</div><div class="detail-value">' + escapeHtml(detail.chief_complaint) + '</div></div>';
  }
  if (detail.diagnosis) {
    html += '<div class="detail-field"><div class="detail-label">Diagnosis</div><div class="detail-value">' + escapeHtml(detail.diagnosis) + '</div></div>';
  }
  if (detail.prescribed_drugs) {
    html += '<div class="detail-field"><div class="detail-label">Prescribed Drugs</div><div class="detail-value" style="white-space:pre-line">' + escapeHtml(detail.prescribed_drugs) + '</div></div>';
  }
  if (detail.patient_instructions) {
    html += '<div class="detail-field"><div class="detail-label">Instructions</div><div class="detail-value" style="white-space:pre-line">' + escapeHtml(detail.patient_instructions) + '</div></div>';
  }

  // Vitals
  if (Object.keys(vitals).length > 0) {
    html += '<div class="detail-field"><div class="detail-label">Vitals</div></div>';
    html += '<div class="detail-row">';
    for (const [key, val] of Object.entries(vitals)) {
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      html += '<div class="detail-field"><div class="detail-label" style="font-size:0.68rem">' + escapeHtml(label) + '</div><div class="detail-value">' + escapeHtml(String(val)) + '</div></div>';
    }
    html += '</div>';
  }

  body.innerHTML = html;
}

function closePanel() {
  document.querySelectorAll('.slide-panel').forEach(p => p.classList.remove('open'));
  document.getElementById('overlay')?.classList.remove('open');
}


/* ══════════════════════════════════════════
   6b. REFERRALS PAGE
══════════════════════════════════════════ */
let _referralsCache = [];

async function loadReferrals() {
  const container = document.getElementById('referralsContainer');
  container.innerHTML = '<div class="referral-list">' +
    Array(2).fill(
      '<div class="referral-card" style="pointer-events:none">' + shimmerBlock() + '<br>' + shimmerBlock() + '</div>'
    ).join('') + '</div>';

  try {
    const data = await safeApiGet(HC_CONFIG.ENDPOINTS.PATIENT_REFERRALS);
    _referralsCache = Array.isArray(data) ? data : (data.results || []);
  } catch {
    _referralsCache = DEMO_REFERRALS_LIST;
  }

  renderReferralList();
}

function urgencyBadge(urgency) {
  if (!urgency) return '';
  const u = urgency.toUpperCase();
  const map = { ROUTINE: 'badge-success', URGENT: 'badge-warning', EMERGENCY: 'badge-danger' };
  return '<span class="badge ' + (map[u] || 'badge-neutral') + '">' + escapeHtml(urgency) + '</span>';
}

function referralStatusBadge(status) {
  if (!status) return '';
  const s = status.toUpperCase();
  const map = { PENDING: 'badge-warning', ACCEPTED: 'badge-success', DECLINED: 'badge-danger', COMPLETED: 'badge-info', CANCELLED: 'badge-neutral' };
  return '<span class="badge ' + (map[s] || 'badge-info') + '">' + escapeHtml(status) + '</span>';
}

function renderReferralList() {
  const container = document.getElementById('referralsContainer');

  if (_referralsCache.length === 0) {
    container.innerHTML = '<div class="empty-state">You have no referrals yet.</div>';
    return;
  }

  container.innerHTML = '<div class="referral-list">' +
    _referralsCache.map(r => {
      const fromOrg = r.from_organization?.name || '';
      const toOrg   = r.to_organization?.name || '';
      const doctor  = r.referring_doctor?.full_name || [r.referring_doctor?.first_name, r.referring_doctor?.last_name].filter(Boolean).join(' ') || '';

      let downloadBtn = '';
      if (r.has_letter) {
        downloadBtn = '<button class="btn btn-sm btn-primary" onclick="downloadReferralLetter(\'' + r.id + '\',event)">Download Letter</button>';
      }

      return '<div class="referral-card">' +
        '<div class="referral-top">' +
          '<span class="referral-number">' + escapeHtml(r.letter_number || '') + '</span>' +
          '<div class="referral-badges">' + urgencyBadge(r.urgency_display || r.urgency) + ' ' + referralStatusBadge(r.status_display || r.status) + '</div>' +
        '</div>' +
        '<div class="referral-orgs">' +
          '<span class="referral-org-name">' + escapeHtml(fromOrg) + '</span>' +
          '<span class="referral-arrow">→</span>' +
          '<span class="referral-org-name">' + escapeHtml(toOrg) + '</span>' +
        '</div>' +
        (doctor ? '<div class="referral-meta">Referring Doctor: ' + escapeHtml(doctor) + '</div>' : '') +
        '<div class="referral-detail-text">' + escapeHtml(r.reason || '') + '</div>' +
        '<div class="referral-meta">' + formatDate(r.created_at) + '</div>' +
        '<div class="referral-actions">' +
          '<button class="btn btn-sm btn-ghost" onclick="openReferralDetail(\'' + r.id + '\')">View Details</button>' +
          downloadBtn +
        '</div>' +
      '</div>';
    }).join('') +
  '</div>';
}

async function openReferralDetail(id) {
  const panel = document.getElementById('referralPanel');
  const body  = document.getElementById('referralPanelBody');
  const overlay = document.getElementById('overlay');

  panel.classList.add('open');
  overlay.classList.add('open');
  body.innerHTML = '<div class="empty-state">' + shimmerBlock() + '</div>';

  let detail = null;
  try {
    detail = await safeApiGet(HC_CONFIG.ENDPOINTS.PATIENT_REFERRAL_DETAIL + id + '/');
  } catch {
    detail = DEMO_REFERRAL_DETAIL;
  }

  const fromOrg = detail.from_organization?.name || '';
  const toOrg   = detail.to_organization?.name || '';
  const doctor  = detail.referring_doctor?.full_name || [detail.referring_doctor?.first_name, detail.referring_doctor?.last_name].filter(Boolean).join(' ') || '';

  let html = '';

  // Referral number + badges
  html += '<div style="margin-bottom:1.25rem">';
  html += '<div style="font-family:var(--mono);font-size:0.82rem;font-weight:600;color:var(--primary);margin-bottom:0.5rem">' + escapeHtml(detail.letter_number || '') + '</div>';
  html += '<div style="display:flex;gap:0.35rem">' + urgencyBadge(detail.urgency_display || detail.urgency) + ' ' + referralStatusBadge(detail.status_display || detail.status) + '</div>';
  html += '</div>';

  // Organizations
  html += '<div class="detail-field"><div class="detail-label">From Organization</div><div class="detail-value">' + escapeHtml(fromOrg);
  if (detail.from_organization?.org_type) html += ' <span class="badge badge-neutral">' + escapeHtml(detail.from_organization.org_type.replace(/_/g, ' ')) + '</span>';
  html += '</div></div>';

  html += '<div class="detail-field"><div class="detail-label">To Organization</div><div class="detail-value">' + escapeHtml(toOrg);
  if (detail.to_organization?.org_type) html += ' <span class="badge badge-neutral">' + escapeHtml(detail.to_organization.org_type.replace(/_/g, ' ')) + '</span>';
  html += '</div></div>';

  // Referring doctor
  if (doctor) {
    html += '<div class="detail-field"><div class="detail-label">Referring Doctor</div><div class="detail-value">' + escapeHtml(doctor) + '</div></div>';
  }

  // Reason
  html += '<div class="detail-field"><div class="detail-label">Reason for Referral</div><div class="detail-value">' + escapeHtml(detail.reason || '—') + '</div></div>';

  // Clinical fields
  if (detail.clinical_findings) {
    html += '<div class="detail-field"><div class="detail-label">Clinical Findings</div><div class="detail-value" style="white-space:pre-line">' + escapeHtml(detail.clinical_findings) + '</div></div>';
  }
  if (detail.provisional_diagnosis) {
    html += '<div class="detail-field"><div class="detail-label">Provisional Diagnosis</div><div class="detail-value" style="white-space:pre-line">' + escapeHtml(detail.provisional_diagnosis) + '</div></div>';
  }
  if (detail.recommended_investigations) {
    html += '<div class="detail-field"><div class="detail-label">Recommended Investigations</div><div class="detail-value" style="white-space:pre-line">' + escapeHtml(detail.recommended_investigations) + '</div></div>';
  }
  if (detail.recommended_treatment) {
    html += '<div class="detail-field"><div class="detail-label">Recommended Treatment</div><div class="detail-value" style="white-space:pre-line">' + escapeHtml(detail.recommended_treatment) + '</div></div>';
  }
  if (detail.response_notes) {
    html += '<div class="detail-field"><div class="detail-label">Response Notes</div><div class="detail-value" style="white-space:pre-line">' + escapeHtml(detail.response_notes) + '</div></div>';
  }

  // Date
  html += '<div class="detail-field"><div class="detail-label">Date Created</div><div class="detail-value">' + formatDate(detail.created_at) + '</div></div>';

  // Download button
  if (detail.has_letter) {
    html += '<div style="margin-top:0.5rem"><button class="btn btn-primary" onclick="downloadReferralLetter(\'' + detail.id + '\',event)">Download Referral Letter (PDF)</button></div>';
  }

  body.innerHTML = html;
}

async function downloadReferralLetter(id, event) {
  if (event) event.stopPropagation();

  const btn = event?.target;
  if (btn) { btn.disabled = true; btn.textContent = 'Downloading…'; }

  try {
    const token = hc_getAccessToken();
    const url = HC_CONFIG.API_BASE_URL + HC_CONFIG.ENDPOINTS.PATIENT_REFERRAL_LETTER + id + '/download-letter/';

    const res = await fetch(url, {
      headers: { 'Authorization': 'Bearer ' + token }
    });

    if (!res.ok) throw new Error('Download failed');

    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = 'referral-letter-' + id + '.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);

    showToast('Referral letter downloaded!', 'success');
  } catch (err) {
    showToast('Failed to download referral letter.', 'error');
  }

  if (btn) { btn.disabled = false; btn.textContent = btn.textContent.includes('PDF') ? 'Download Referral Letter (PDF)' : 'Download Letter'; }
}


/* ══════════════════════════════════════════
   7. PROFILE PAGE
══════════════════════════════════════════ */
let _profileData = null;
let _editMode = false;

async function loadProfile() {
  const container = document.getElementById('profileContainer');
  container.innerHTML = '<div class="empty-state">' + shimmerBlock() + '<br>' + shimmerBlock() + '</div>';

  try {
    _profileData = await safeApiGet(HC_CONFIG.ENDPOINTS.PATIENT_ME);
  } catch {
    _profileData = _patientProfile || DEMO_PROFILE;
  }

  _editMode = false;
  renderProfile();
}

function renderProfile() {
  const p = _profileData;
  if (!p) return;

  const container = document.getElementById('profileContainer');
  const readonlyField = (label, value) =>
    '<div class="profile-field"><div class="profile-field-label">' + escapeHtml(label) + '</div><div class="profile-field-value">' + escapeHtml(value || '—') + '</div></div>';

  let html = '<div class="profile-grid">';

  // Personal info (read-only)
  html += '<div class="profile-section">';
  html += '<div class="profile-section-header"><div class="profile-section-title"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Personal Information</div></div>';
  html += '<div class="profile-fields-grid">';
  html += readonlyField('Full Name', [p.first_name, p.last_name].filter(Boolean).join(' ') || p.name);
  html += readonlyField('Email', p.email);
  html += readonlyField('Date of Birth', formatDate(p.date_of_birth));
  html += readonlyField('Age', p.age ? p.age + ' years' : null);
  html += readonlyField('Gender', p.gender);
  html += readonlyField('HealthClouda ID', p.healthclouda_id);
  html += '</div></div>';

  // Medical info (read-only)
  html += '<div class="profile-section">';
  html += '<div class="profile-section-header"><div class="profile-section-title"><svg viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> Medical Information</div></div>';
  html += '<div class="profile-fields-grid">';
  html += readonlyField('Blood Type', p.blood_type);
  html += readonlyField('Genotype', p.genotype);
  html += readonlyField('Allergies', p.allergies);
  html += readonlyField('Chronic Diseases', p.chronic_diseases);
  html += '</div>';
  html += readonlyField('Current Medications', p.current_medications);
  html += '</div>';

  // Contact info (editable)
  html += '<div class="profile-section full-width">';
  html += '<div class="profile-section-header">';
  html += '<div class="profile-section-title"><svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg> Contact Information</div>';

  if (!_editMode) {
    html += '<button class="btn btn-ghost btn-sm" onclick="enableEditMode()">Edit</button>';
  }
  html += '</div>';

  if (_editMode) {
    html += renderContactForm(p);
  } else {
    html += '<div class="profile-fields-grid">';
    html += readonlyField('Phone', p.phone);
    html += readonlyField('Address', p.address);
    html += readonlyField('City', p.city);
    html += readonlyField('State', p.state);
    html += readonlyField('Country', p.country);
    html += '</div>';

    html += '<div style="margin-top:1.25rem;padding-top:1.25rem;border-top:1px solid var(--border)">';
    html += '<div class="profile-section-title" style="font-size:0.88rem;margin-bottom:1rem"><svg viewBox="0 0 24 24" style="stroke:var(--danger)"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Emergency Contact</div>';
    html += '<div class="profile-fields-grid">';
    html += readonlyField('Name', p.emergency_contact_name);
    html += readonlyField('Phone', p.emergency_contact_phone);
    html += readonlyField('Relationship', p.emergency_contact_relationship);
    html += '</div></div>';
  }

  html += '</div>';
  html += '</div>'; // close profile-grid

  container.innerHTML = html;
}

function renderContactForm(p) {
  const field = (label, id, value, type) =>
    '<div class="form-group">' +
      '<label class="form-label" for="' + id + '">' + escapeHtml(label) + '</label>' +
      '<input class="form-input" type="' + (type || 'text') + '" id="' + id + '" value="' + escapeHtml(value || '') + '">' +
    '</div>';

  let html = '<div class="profile-fields-grid">';
  html += field('Phone', 'editPhone', p.phone, 'tel');
  html += field('Address', 'editAddress', p.address);
  html += field('City', 'editCity', p.city);
  html += field('State', 'editState', p.state);
  html += field('Country', 'editCountry', p.country);
  html += '</div>';

  html += '<div style="margin-top:1.25rem;padding-top:1.25rem;border-top:1px solid var(--border)">';
  html += '<div style="font-size:0.88rem;font-weight:700;margin-bottom:1rem;color:var(--text-dark)">Emergency Contact</div>';
  html += '<div class="profile-fields-grid">';
  html += field('Name', 'editEmName', p.emergency_contact_name);
  html += field('Phone', 'editEmPhone', p.emergency_contact_phone, 'tel');
  html += field('Relationship', 'editEmRelationship', p.emergency_contact_relationship);
  html += '</div></div>';

  html += '<div class="form-actions">';
  html += '<button class="btn btn-primary" id="saveProfileBtn" onclick="saveProfile()">Save Changes</button>';
  html += '<button class="btn btn-ghost" onclick="cancelEdit()">Cancel</button>';
  html += '</div>';

  return html;
}

function enableEditMode() {
  _editMode = true;
  renderProfile();
}

function cancelEdit() {
  _editMode = false;
  renderProfile();
}

async function saveProfile() {
  const btn = document.getElementById('saveProfileBtn');
  if (!btn) return;
  btn.disabled = true;
  btn.textContent = 'Saving…';
  btn.style.opacity = '0.65';

  const body = {
    phone:                        document.getElementById('editPhone')?.value.trim()          || '',
    address:                      document.getElementById('editAddress')?.value.trim()        || '',
    city:                         document.getElementById('editCity')?.value.trim()           || '',
    state:                        document.getElementById('editState')?.value.trim()          || '',
    country:                      document.getElementById('editCountry')?.value.trim()        || '',
    emergency_contact_name:         document.getElementById('editEmName')?.value.trim()         || '',
    emergency_contact_phone:        document.getElementById('editEmPhone')?.value.trim()        || '',
    emergency_contact_relationship: document.getElementById('editEmRelationship')?.value.trim() || '',
  };

  try {
    const updated = await safeApiPatch(HC_CONFIG.ENDPOINTS.PATIENT_ME, body);
    _profileData = updated;
    _editMode = false;
    renderProfile();
    showToast('Profile updated successfully', 'success');
  } catch (err) {
    let msg = 'Failed to update profile. Please try again.';
    if (err.status >= 500) {
      msg = 'Our server is temporarily unavailable. Please try again later.';
    } else if (err.response) {
      // Build field-level error messages
      const errors = [];
      for (const [key, val] of Object.entries(err.response)) {
        if (Array.isArray(val)) errors.push(val.join(', '));
        else if (typeof val === 'string' && key !== 'detail' && key !== 'error') errors.push(val);
      }
      msg = err.response.error || err.response.detail || errors.join('. ') || msg;
    } else if (err.message && err.message.includes('fetch')) {
      msg = 'Cannot connect to server. Please check your connection.';
    } else if (err.message) {
      msg = err.message;
    }
    showToast(msg, 'error');
    btn.disabled = false;
    btn.textContent = 'Save Changes';
    btn.style.opacity = '1';
  }
}


/* ══════════════════════════════════════════
   8. NOTIFICATIONS PAGE
══════════════════════════════════════════ */
let _notifsCache = [];

async function loadNotifications() {
  const container = document.getElementById('notificationsContainer');
  container.innerHTML = '<div class="notif-list-page">' +
    Array(3).fill(
      '<div class="notif-item" style="pointer-events:none"><div style="flex:1">' + shimmerBlock() + '</div></div>'
    ).join('') + '</div>';

  try {
    const data = await safeApiGet(HC_CONFIG.ENDPOINTS.PATIENT_NOTIFS);
    _notifsCache = Array.isArray(data) ? data : (data.results || []);
  } catch {
    _notifsCache = DEMO_NOTIFICATIONS;
  }

  renderNotifications();
}

function renderNotifications() {
  const container = document.getElementById('notificationsContainer');

  if (_notifsCache.length === 0) {
    container.innerHTML = '<div class="empty-state">No notifications yet.</div>';
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
          '<div class="notif-meta">' +
            (n.organization_name ? '<span>' + escapeHtml(n.organization_name) + '</span>' : '') +
            '<span>' + formatDate(n.created_at) + '</span>' +
          '</div>' +
        '</div>' +
        (!n.is_read ? '<div class="notif-dot"></div>' : '') +
      '</div>';
    }).join('') +
  '</div>';
}

function notifIcon(type) {
  switch (type) {
    case 'EPISODE_CREATED': return '📋';
    case 'EPISODE_CLOSED':  return '✅';
    case 'REFERRAL_SENT':   return '🔄';
    default:                return '🔔';
  }
}

async function markNotificationRead(id) {
  const notif = _notifsCache.find(n => n.id === id);
  if (!notif || notif.is_read) return;

  notif.is_read = true;
  renderNotifications();

  try {
    await safeApiPatch(HC_CONFIG.ENDPOINTS.PATIENT_NOTIFS + id + '/read/');
  } catch { /* silent — already updated UI optimistically */ }

  refreshUnreadCount();
}

async function markAllNotificationsRead() {
  const btn = document.getElementById('markAllReadBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Marking…'; }

  _notifsCache.forEach(n => n.is_read = true);
  renderNotifications();

  try {
    await safeApiPost(HC_CONFIG.ENDPOINTS.PATIENT_READ_ALL);
  } catch { /* silent */ }

  updateNotifBadge(0);
  if (btn) { btn.disabled = false; btn.textContent = 'Mark all as read'; }
  showToast('All notifications marked as read', 'success');
}


/* ══════════════════════════════════════════
   9. NOTIFICATION BADGE POLLING
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
    const data = await safeApiGet(HC_CONFIG.ENDPOINTS.PATIENT_UNREAD);
    updateNotifBadge(data.count || 0);
  } catch { /* silent */ }
}

// Poll every 60 seconds
let _notifPollInterval = setInterval(refreshUnreadCount, 60000);


/* ══════════════════════════════════════════
   10. LOGOUT
══════════════════════════════════════════ */
async function patientLogout() {
  clearInterval(_notifPollInterval);
  try {
    if (typeof apiPost === 'function' && typeof hc_getRefreshToken === 'function') {
      await apiPost(HC_CONFIG.ENDPOINTS.LOGOUT, { refresh: hc_getRefreshToken() });
    }
  } catch {}
  try { if (typeof hc_clearTokens === 'function') hc_clearTokens(); } catch {}
  window.location.href = '/public/signin.html';
}
