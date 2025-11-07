// 1) Always start at top (even if browser remembered a hash)
window.addEventListener("load", () => {
  if (window.location.hash) {
    history.replaceState(null, "", " "); // clear hash without reloading
  }
  window.scrollTo({ top: 0, behavior: "instant" });
});

// 2) Reveal on scroll
const io = new IntersectionObserver(
  (entries) => entries.forEach((e) => {
    if (e.isIntersecting) {
      e.target.classList.add('show');
      io.unobserve(e.target);
    }
  }),
  { threshold: 0.15 }
);
document.querySelectorAll('.fade-in, .stagger').forEach(el => io.observe(el));

// 3) Smooth internal links
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', (ev) => {
    const id = a.getAttribute('href');
    if (id && id.length > 1) {
      ev.preventDefault();
      document.querySelector(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.pushState(null, '', id);
    }
  });
});

// 4) Show nav after slight scroll
const nav = document.querySelector(".nav");
const showNav = () => nav.classList.toggle("visible", window.scrollY > 60);
document.addEventListener("scroll", showNav, { passive: true });
showNav();
