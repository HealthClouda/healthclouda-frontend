document.addEventListener('DOMContentLoaded', async () => {

// ═══════════════════════════════════════════════════
//  ORG DATA — API fetch with fallback to org-config.js
// ═══════════════════════════════════════════════════

function getOrgSlug() {
  const params = new URLSearchParams(window.location.search);
  return params.get('org') || (typeof ORG_CONFIG !== 'undefined' && ORG_CONFIG.slug) || null;
}

async function loadOrgData() {
  const slug = getOrgSlug();
  if (!slug) {
    return typeof ORG_CONFIG !== 'undefined' ? ORG_CONFIG : null;
  }

  try {
    const endpoint = HC_CONFIG.ENDPOINTS.ORG_BY_SLUG + slug + '/';
    const data = await publicApiRequest(endpoint);
    return data;
  } catch {
    // API unavailable — fall back to static config
    return typeof ORG_CONFIG !== 'undefined' ? ORG_CONFIG : null;
  }
}


// ═══════════════════════════════════════════════════
//  BRANDING — apply org data to DOM
// ═══════════════════════════════════════════════════

function setText(id, value) {
  const el = document.getElementById(id);
  if (el && value) el.textContent = value;
}

function setEmailLink(id, label, email) {
  const el = document.getElementById(id);
  if (!el || !email) return;
  const link = document.createElement('a');
  link.href = 'mailto:' + email;
  link.textContent = email;
  el.textContent = label + ': ';
  el.appendChild(link);
}

function applyOrgBranding(org) {
  if (!org) return;

  // Page title
  document.title = org.pageTitle || org.page_title || ('HealthClouda | ' + (org.name || ''));

  // Hero org logo
  const orgLogo = document.getElementById('heroOrgLogo');
  if (orgLogo && (org.logo || org.logo_url)) {
    orgLogo.src = org.logo || org.logo_url;
    orgLogo.alt = (org.name || 'Organization') + ' logo';
  }

  // Hero org name
  setText('heroOrgName', org.name);

  // Contact info
  setText('contactClinicName', org.clinic?.name || org.clinic_name);
  setText('contactClinicAddress', org.clinic?.address || org.clinic_address);
  setText('contactClinicHours', org.clinic?.hours ? 'Open: ' + org.clinic.hours : '');
  setText('contactClinicPhone', org.clinic?.phone ? 'Phone: ' + org.clinic.phone : '');
  setEmailLink('contactClinicEmail', 'Email', org.clinic?.email || org.clinic_email);
  setText('contactEmergencyPhone', org.emergency?.phone || org.emergency_phone);
}


// ═══════════════════════════════════════════════════
//  INIT — load data and apply
// ═══════════════════════════════════════════════════

const org = await loadOrgData();
applyOrgBranding(org);

// Store slug for contact form
window._orgSlug = org?.slug || getOrgSlug();


// ═══════════════════════════════════════════════════
//  ANNOUNCEMENT ENGINE
// ═══════════════════════════════════════════════════

const ANNOUNCEMENTS = [
  {
    title:     "Free Medical Check-Up Week",
    deadline:  "2026-10-29",
    dateLabel: "October 25 – 29, 2026",
    body:      "Routine health screenings at the Campus Medical Centre. Early registration required via the HealthClouda portal.",
    link:      "#"
  },
  {
    title:     "New Clinic Hours",
    deadline:  null,
    dateLabel: "Effective November 1, 2025",
    body:      "The University Clinic now operates Monday–Saturday, 8:00 AM – 6:00 PM.",
    link:      null
  },
  {
    title:     "Mental Health Support Program",
    deadline:  null,
    dateLabel: "Ongoing",
    body:      "Access free mental health counseling sessions this semester. Visit the Support tab after signing in.",
    link:      null
  }
];

function daysUntil(dateStr) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const deadline = new Date(dateStr); deadline.setHours(0, 0, 0, 0);
  return Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
}

function renderAnnouncements() {
  const container = document.getElementById('announcementCards');
  if (!container) return;

  const active = ANNOUNCEMENTS.filter(a =>
    !a.deadline || daysUntil(a.deadline) >= 0
  );

  if (active.length === 0) {
    container.innerHTML = `
      <div class="announcement-empty">
        <span class="announcement-empty-icon">📋</span>
        <h4>No announcements right now</h4>
        <p>Check back soon for updates from the Health Centre.</p>
      </div>`;
    return;
  }

  container.innerHTML = active.map(a => {
    const days = a.deadline ? daysUntil(a.deadline) : null;
    const urgent = days !== null && days <= 3;

    const badge = urgent
      ? `<div class="urgency-badge">⚠️ ${days === 0 ? 'Ends today' : `${days} day${days !== 1 ? 's' : ''} left`}</div>`
      : '';

    const more = a.link
      ? ` <a href="${a.link}" style="color:var(--primary);font-weight:600;">See more</a>` : '';

    return `
      <div class="announcement-card ${urgent ? 'announcement-urgent' : ''}">
        ${badge}
        <h3>${a.title}</h3>
        <div class="date-label">Date: ${a.dateLabel}</div>
        <p>${a.body}${more}</p>
      </div>`;
  }).join('');
}

renderAnnouncements();


// ═══════════════════════════════════════════════════
//  WELLBEING CAROUSEL (infinite conveyor belt)
// ═══════════════════════════════════════════════════

const track = document.getElementById('wellbeingTrack');
const wPrev = document.getElementById('wPrev');
const wNext = document.getElementById('wNext');

if (track) {
  // Clone cards for seamless loop
  Array.from(track.children).forEach(card => {
    track.appendChild(card.cloneNode(true));
  });

  const totalOriginal = track.children.length / 2;
  let offset = 0;
  let paused = false;
  const SPEED = 0.7;

  function cardStep() {
    const card = track.children[0];
    const gap = parseFloat(getComputedStyle(track).gap) || 24;
    return card.offsetWidth + gap;
  }

  function loop() {
    if (!paused) {
      offset += SPEED;
      const loopAt = cardStep() * totalOriginal;
      if (offset >= loopAt) offset -= loopAt;
      track.style.transform = `translateX(-${offset}px)`;
    }
    requestAnimationFrame(loop);
  }

  // Pause on hover
  track.closest('.wellbeing-carousel-wrapper')?.addEventListener('mouseenter', () => paused = true);
  track.closest('.wellbeing-carousel-wrapper')?.addEventListener('mouseleave', () => paused = false);

  // Buttons
  if (wPrev) wPrev.addEventListener('click', () => { offset = Math.max(0, offset - cardStep()); });
  if (wNext) wNext.addEventListener('click', () => { offset += cardStep(); });

  // Touch swipe
  let tx = 0;
  track.addEventListener('touchstart', e => { tx = e.touches[0].clientX; paused = true; }, { passive: true });
  track.addEventListener('touchend', e => {
    const d = tx - e.changedTouches[0].clientX;
    if (Math.abs(d) > 30) offset = Math.max(0, offset + (d > 0 ? cardStep() : -cardStep()));
    paused = false;
  });

  // Reset on resize
  window.addEventListener('resize', () => { offset = 0; track.style.transform = 'translateX(0)'; });

  requestAnimationFrame(loop);
}


// ═══════════════════════════════════════════════════
//  NAVBAR SCROLL SHRINK
// ═══════════════════════════════════════════════════

const navbar = document.getElementById('navbar');
if (navbar) {
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        navbar.classList.toggle('shrink', window.scrollY > 60);
        ticking = false;
      });
      ticking = true;
    }
  });
}


// ═══════════════════════════════════════════════════
//  FOOTER YEAR
// ═══════════════════════════════════════════════════

const yr = document.getElementById('footerYear');
if (yr) yr.textContent = new Date().getFullYear();


// ═══════════════════════════════════════════════════
//  CONTACT FORM
// ═══════════════════════════════════════════════════

const orgContactForm = document.getElementById('orgContactForm');
if (orgContactForm) {
  orgContactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = document.getElementById('orgContactBtn');
    const statusDiv = document.getElementById('contactFormMsg');
    const originalText = btn.textContent;

    statusDiv.textContent = '';
    statusDiv.style.color = '';

    const name = document.getElementById('contact-name').value.trim();
    const email = document.getElementById('contact-email').value.trim();
    const phone = document.getElementById('contact-phone').value.trim();
    const message = document.getElementById('contact-message').value.trim();

    if (!name || !email || !phone || !message) {
      statusDiv.textContent = 'Please fill in all required fields.';
      statusDiv.style.color = '#dc2626';
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      statusDiv.textContent = 'Please enter a valid email address.';
      statusDiv.style.color = '#dc2626';
      return;
    }

    const slug = window._orgSlug;
    if (!slug) {
      statusDiv.textContent = 'Organization configuration error. Please contact support.';
      statusDiv.style.color = '#dc2626';
      return;
    }

    btn.textContent = 'Sending...';
    btn.disabled = true;

    try {
      const endpoint = HC_CONFIG.ENDPOINTS.ORG_CONTACT + slug + '/contact/';

      await publicApiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          name:    name,
          email:   email,
          phone:   phone,
          message: message,
        }),
      });

      statusDiv.textContent = 'Your message has been sent successfully.';
      statusDiv.style.color = '#16a34a';
      orgContactForm.reset();

    } catch (err) {
      if (err.status === 404) {
        statusDiv.textContent = 'Organization not found. Please contact support.';
      } else if (err.status === 400 && err.data) {
        const messages = [];
        for (const [field, errors] of Object.entries(err.data)) {
          if (Array.isArray(errors)) {
            messages.push(field + ': ' + errors.join(', '));
          } else if (typeof errors === 'string') {
            messages.push(field + ': ' + errors);
          }
        }
        statusDiv.textContent = messages.length > 0
          ? messages.join(' | ')
          : 'Please check your input and try again.';
      } else if (err.status >= 500) {
        statusDiv.textContent = 'Our server is temporarily unavailable. Please try again later.';
      } else {
        statusDiv.textContent = err.message || 'Something went wrong. Please try again.';
      }
      statusDiv.style.color = '#dc2626';

    } finally {
      setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
      }, 3000);
    }
  });
}

}); // end DOMContentLoaded
