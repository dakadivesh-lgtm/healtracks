/* dashboard.js – WoundWise Dashboard micro-interactions */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Active nav highlight ── */
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
    });
  });

  /* ── Upload button → trigger upload nav ── */
  const startUploadBtn = document.getElementById('btn-start-upload');
  const navUpload = document.getElementById('nav-upload');
  if (startUploadBtn && navUpload) {
    startUploadBtn.addEventListener('click', () => {
      navItems.forEach(n => n.classList.remove('active'));
      navUpload.classList.add('active');
    });
  }

  /* ── Quick-card click highlight nav ── */
  const cardNavMap = {
    'qcard-upload':  'nav-upload',
    'qcard-history': 'nav-history',
    'qcard-records': 'nav-records',
    'qcard-help':    'nav-help',
  };

  Object.entries(cardNavMap).forEach(([cardId, navId]) => {
    const card = document.getElementById(cardId);
    const nav  = document.getElementById(navId);
    if (card && nav) {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        navItems.forEach(n => n.classList.remove('active'));
        nav.classList.add('active');
      });
    }
  });

  /* ── Greeting time of day ── */
  const greetingEl = document.querySelector('.greeting-title');
  if (greetingEl) {
    const hour = new Date().getHours();
    let tod = 'morning';
    if (hour >= 12 && hour < 17) tod = 'afternoon';
    else if (hour >= 17) tod = 'evening';
    greetingEl.textContent = `Good ${tod}, Divesh 👋`;
  }

  /* ── Subtle card entrance animation ── */
  const cards = document.querySelectorAll('.quick-card, .no-tests-card');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    cards.forEach((card, i) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(12px)';
      card.style.transition = `opacity 0.4s ease ${i * 0.07}s, transform 0.4s ease ${i * 0.07}s, box-shadow 0.18s ease, border-color 0.18s ease`;
      io.observe(card);
    });
  }
});
