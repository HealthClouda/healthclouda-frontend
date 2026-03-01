//  HealthClouda 

document.addEventListener('DOMContentLoaded', () => {

  // Footer year 
  const yr = document.getElementById('footerYear');
  if (yr) yr.textContent = new Date().getFullYear();


  // Navbar scroll shrink 
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


  // Hamburger 
  const hamburger    = document.getElementById('hamburger');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const overlay      = document.getElementById('drawerOverlay');

  if (hamburger && mobileDrawer && overlay) {
    const openDrawer = () => {
      mobileDrawer.classList.add('open');
      overlay.classList.add('open');
      hamburger.classList.add('open');
      hamburger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    };

    const closeDrawer = () => {
      mobileDrawer.classList.remove('open');
      overlay.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    };

    hamburger.addEventListener('click', () =>
      mobileDrawer.classList.contains('open') ? closeDrawer() : openDrawer()
    );
    overlay.addEventListener('click', closeDrawer);
    document.querySelectorAll('.mobile-link, .mobile-signin')
      .forEach(el => el.addEventListener('click', closeDrawer));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
  }


  // ── Active nav link on scroll ────────────────────
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id], div[id]');

  if (navLinks.length && sections.length) {
    const linkObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${entry.target.id}`) {
              link.classList.add('active');
            }
          });
        }
      });
    }, { threshold: 0.35, rootMargin: `-${68}px 0px 0px 0px` });

    sections.forEach(s => linkObserver.observe(s));
  }


  // ── Universal scroll-reveal observer ────────────
  //    Watches anything with a class in the list below
  const revealTargets = [
    '.hero-content',
    '.hero-img',
    '.feature-card',
    '.benefit-item',
    '.about-intro',
    '.mission-card',
    '.ps-card',
    '.security-card',
    '.one-platform-note',
    '.one-platform-img',
    '.fade-in',
    '.fade-up',
    '.hidden',
  ];

  const revealObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        // Stagger sibling cards slightly
        const delay = entry.target.dataset.delay || (i * 80);
        setTimeout(() => {
          entry.target.classList.add('show');
        }, Number(delay));
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll(revealTargets.join(','))
    .forEach((el, i) => {
      // Auto stagger feature cards and mission cards
      if (el.classList.contains('feature-card') || el.classList.contains('mission-card') || el.classList.contains('ps-card')) {
        el.dataset.delay = i * 80;
      }
      revealObserver.observe(el);
    });


  // Contact form handler — now handled inline in public/index.html

}); 