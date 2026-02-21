// // Header

// // Navbar Section
// // Select navbar
// const navbar = document.querySelector("nav");

// window.addEventListener("scroll", () => {
//   if (window.scrollY > 50) { // scroll down more than 50px
//     navbar.classList.add("shrink");
//   } else {
//     navbar.classList.remove("shrink");
//   }
// });


// // Hero Section
// document.addEventListener("DOMContentLoaded", () => {
//   const observer = new IntersectionObserver((entries) => {
//     entries.forEach(entry => {
//       if (entry.isIntersecting) {
//         entry.target.classList.add("show");
//       }
//     });
//   }, { threshold: 0.2 }); // triggers when 20% is visible

//   const heroElements = document.querySelectorAll(".hero-content, .hero-img");
//   heroElements.forEach(el => observer.observe(el));
// });

// // Everything You Need
// document.addEventListener("scroll", () => {
//   const items = document.querySelectorAll(".need-items");
//   items.forEach((item, index) => {
//     const rect = item.getBoundingClientRect();
//     if (rect.top < window.innerHeight - 50) {
//       setTimeout(() => {
//         item.classList.add("show");
//     }, index * 200); // 200ms delay between each item
//     }
//   });
// });

// // One-platform

// document.addEventListener("DOMContentLoaded", () => {
//   const observer = new IntersectionObserver((entries, observer) => {
//     entries.forEach(entry => {
//       if (entry.isIntersecting) {
//         entry.target.classList.add("show");
//         observer.unobserve(entry.target); // animate only once
//       }
//     });
//   }, { threshold: 0.2 });

//   // Apply animations
//   document.querySelector(".one-platform-note").classList.add("fade-left");
//   document.querySelector(".one-platform-img").classList.add("fade-right");

//   document.querySelectorAll(".benefit-item").forEach(item => {
//     item.classList.add("zoom-in");
//     observer.observe(item);
//   });

//   // Observe one-platform too
//   observer.observe(document.querySelector(".one-platform-note"));
//   observer.observe(document.querySelector(".one-platform-img"));
// });

// document.addEventListener("DOMContentLoaded", () => {
//   const observer = new IntersectionObserver((entries, observer) => {
//     entries.forEach((entry, index) => {
//       if (entry.isIntersecting) {
//         // Staggered reveal: 0.1s apart
//         setTimeout(() => {
//           entry.target.classList.add("show");
//         }, index * 100); 
//         observer.unobserve(entry.target); // Animate once
//       }
//     });
//   }, { threshold: 0.2 });

//   // Observe all fade-up elements across the site
//   document.querySelectorAll(".fade-up").forEach(el => {
//     observer.observe(el);
//   });
// });

// // Enterprise
// document.addEventListener("DOMContentLoaded", () => {
//   const observer = new IntersectionObserver((entries, observer) => {
//     entries.forEach(entry => {
//       if (entry.isIntersecting) {
//         entry.target.classList.add("show");
//         observer.unobserve(entry.target); // run once per element
//       }
//     });
//   }, { threshold: 0.2 });

//   // Observe all hidden elements (including this section)
//   document.querySelectorAll(".hidden").forEach(el => observer.observe(el));
// });

/**
 * HealthClouda — Animations & UI Behaviour
 * ─────────────────────────────────────────────────────────────
 * Handles all visual/interactive behaviour that is shared
 * across pages: navbar, scroll-reveal, hamburger menu.
 *
 * NO API calls here. NO auth logic here.
 * This file is purely UI — safe to load on every page.
 *
 * REQUIRES: Nothing (standalone, no dependencies)
 * ─────────────────────────────────────────────────────────────
 */

document.addEventListener('DOMContentLoaded', () => {

  // ── Footer year ──────────────────────────────────────────
  const yr = document.getElementById('footerYear');
  if (yr) yr.textContent = new Date().getFullYear();


  // ── Navbar scroll shrink ─────────────────────────────────
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


  // ── Hamburger / mobile drawer ────────────────────────────
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
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeDrawer();
    });
  }


  // ── Active nav link on scroll ────────────────────────────
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
    }, { threshold: 0.35, rootMargin: '-68px 0px 0px 0px' });

    sections.forEach(s => linkObserver.observe(s));
  }


  // ── Scroll-reveal ────────────────────────────────────────
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
        const delay = entry.target.dataset.delay || (i * 80);
        setTimeout(() => entry.target.classList.add('show'), Number(delay));
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll(revealTargets.join(',')).forEach((el, i) => {
    // Auto-stagger cards
    if (
      el.classList.contains('feature-card') ||
      el.classList.contains('mission-card') ||
      el.classList.contains('ps-card')
    ) {
      el.dataset.delay = i * 80;
    }
    revealObserver.observe(el);
  });

});