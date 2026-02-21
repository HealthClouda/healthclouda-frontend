document.addEventListener('DOMContentLoaded', () => {

// ═══════════════════════════════════════════════════
//  ANNOUNCEMENT ENGINE
// ═══════════════════════════════════════════════════
// Edit this array to add / remove / update announcements.
// deadline: "YYYY-MM-DD" → auto-hides after that date
// deadline: null         → shows forever (ongoing)

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
    const today    = new Date(); today.setHours(0,0,0,0);
    const deadline = new Date(dateStr); deadline.setHours(0,0,0,0);
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
                <p>Check back soon for updates from the University Health Centre.</p>
            </div>`;
        return;
    }

    container.innerHTML = active.map(a => {
        const days   = a.deadline ? daysUntil(a.deadline) : null;
        const urgent = days !== null && days <= 3;

        const badge = urgent
            ? `<div class="urgency-badge">⚠️ ${days === 0 ? 'Ends today' : `${days} day${days !== 1 ? 's' : ''} left`}</div>`
            : '';

        const more = a.link
            ? ` <span class="text-primary" style="cursor:pointer">See more</span>` : '';

        return `
        <div class="col-md-3 announcement-card ${urgent ? 'announcement-urgent' : ''} text-center shadow border rounded-5 py-4 px-3">
            ${badge}
            <h3 class="text-primary">${a.title}</h3>
            <h6 class="pb-3">Date: ${a.dateLabel}</h6>
            <p class="h5 pt-2">${a.body}${more}</p>
        </div>`;
    }).join('');
}

renderAnnouncements();


// ═══════════════════════════════════════════════════
//  INFINITE CONVEYOR BELT CAROUSEL
// ═══════════════════════════════════════════════════

const track   = document.getElementById('wellbeingTrack');
const wPrev   = document.getElementById('wPrev');
const wNext   = document.getElementById('wNext');
const dots    = document.getElementById('carouselDots');

if (track) {
    // Clone cards for seamless loop
    Array.from(track.children).forEach(card => {
        track.appendChild(card.cloneNode(true));
    });

    const totalOriginal = track.children.length / 2;
    let offset = 0;
    let paused = false;
    const SPEED = 0.7; // px per frame

    function cardStep() {
        const card = track.children[0];
        const gap  = parseFloat(getComputedStyle(track).gap) || 24;
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
    wPrev?.addEventListener('click', () => { offset = Math.max(0, offset - cardStep()); });
    wNext?.addEventListener('click', () => { offset += cardStep(); });

    // Touch swipe
    let tx = 0;
    track.addEventListener('touchstart', e => { tx = e.touches[0].clientX; paused = true; }, { passive: true });
    track.addEventListener('touchend',   e => {
        const d = tx - e.changedTouches[0].clientX;
        if (Math.abs(d) > 30) offset = Math.max(0, offset + (d > 0 ? cardStep() : -cardStep()));
        paused = false;
    });

    // Reset on resize
    window.addEventListener('resize', () => { offset = 0; track.style.transform = 'translateX(0)'; });

    requestAnimationFrame(loop);
}


// ═══════════════════════════════════════════════════
//  FOOTER YEAR
// ═══════════════════════════════════════════════════
const yr = document.getElementById('landingpage-footer-year');
if (yr) yr.textContent = new Date().getFullYear();

}); // end DOMContentLoaded