// Header

// Navbar Section
// Select navbar
const navbar = document.querySelector("nav");

window.addEventListener("scroll", () => {
  if (window.scrollY > 50) { // scroll down more than 50px
    navbar.classList.add("shrink");
  } else {
    navbar.classList.remove("shrink");
  }
});


// Hero Section
document.addEventListener("DOMContentLoaded", () => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");
      }
    });
  }, { threshold: 0.2 }); // triggers when 20% is visible

  const heroElements = document.querySelectorAll(".hero-content, .hero-img");
  heroElements.forEach(el => observer.observe(el));
});

// Everything You Need
document.addEventListener("scroll", () => {
  const items = document.querySelectorAll(".need-items");
  items.forEach((item, index) => {
    const rect = item.getBoundingClientRect();
    if (rect.top < window.innerHeight - 50) {
      setTimeout(() => {
        item.classList.add("show");
    }, index * 200); // 200ms delay between each item
    }
  });
});

// One-platform

document.addEventListener("DOMContentLoaded", () => {
  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");
        observer.unobserve(entry.target); // animate only once
      }
    });
  }, { threshold: 0.2 });

  // Apply animations
  document.querySelector(".one-platform-note").classList.add("fade-left");
  document.querySelector(".one-platform-img").classList.add("fade-right");

  document.querySelectorAll(".benefit-item").forEach(item => {
    item.classList.add("zoom-in");
    observer.observe(item);
  });

  // Observe one-platform too
  observer.observe(document.querySelector(".one-platform-note"));
  observer.observe(document.querySelector(".one-platform-img"));
});

document.addEventListener("DOMContentLoaded", () => {
  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        // Staggered reveal: 0.1s apart
        setTimeout(() => {
          entry.target.classList.add("show");
        }, index * 100); 
        observer.unobserve(entry.target); // Animate once
      }
    });
  }, { threshold: 0.2 });

  // Observe all fade-up elements across the site
  document.querySelectorAll(".fade-up").forEach(el => {
    observer.observe(el);
  });
});

// Enterprise
document.addEventListener("DOMContentLoaded", () => {
  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");
        observer.unobserve(entry.target); // run once per element
      }
    });
  }, { threshold: 0.2 });

  // Observe all hidden elements (including this section)
  document.querySelectorAll(".hidden").forEach(el => observer.observe(el));
});

