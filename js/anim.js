/* ============================================================
   lotabin — Motion module
   - IntersectionObserver reveals (.reveal, .reveal-up, .reveal-fade,
     .reveal-stagger, .mask-line)
   - Header on-scroll
   - Mobile menu
   - Lang toggle (delegated to i18n.js)
   - Audience-lane tabs
   - Magnetic CTAs (desktop / fine pointer only)
   - Lightweight parallax via transform
   - prefers-reduced-motion respected
   ============================================================ */

(function () {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Reveal on scroll ---------- */
  const revealSel = '.reveal, .reveal-up, .reveal-fade, .reveal-stagger, .mask-line';
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '-8% 0px -8% 0px', threshold: 0.05 });
    document.querySelectorAll(revealSel).forEach(el => io.observe(el));
  } else {
    document.querySelectorAll(revealSel).forEach(el => el.classList.add('in'));
  }

  /* ---------- 2. Header scroll state ----------
     The dark backdrop on the header is suppressed while the user is still
     inside the scroll-scrub hero stage, so the header reads as floating
     glyphs over the cinematic video rather than a heavy bar competing
     with the headline. It snaps in cleanly once they're past the hero. */
  const header = document.querySelector('.site-header');
  const scrubTrack = document.querySelector('[data-scrub]');
  const setHeader = () => {
    if (!header) return;
    const scrolledPast = window.scrollY > 24;
    let insideHero = false;
    if (scrubTrack) {
      // active while the bottom of the track is still below the top of the viewport
      const rect = scrubTrack.getBoundingClientRect();
      insideHero = rect.bottom > 80; // small grace zone
    }
    // Box (translucent backdrop + rule) shows as soon as the page is scrolled,
    // including while scrubbing through the cinematic hero.
    header.classList.toggle('scrolled', scrolledPast);
  };
  setHeader();
  window.addEventListener('scroll', setHeader, { passive: true });

  /* ---------- 3. Mobile menu ---------- */
  const menuBtn = document.querySelector('[data-menu-btn]');
  const menu = document.querySelector('[data-mobile-menu]');
  if (menuBtn && menu) {
    const setOpen = (open) => {
      menu.classList.toggle('open', open);
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    };
    menuBtn.addEventListener('click', () => setOpen(!menu.classList.contains('open')));
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setOpen(false)));
  }

  /* ---------- 4. Audience-lane tabs ---------- */
  document.querySelectorAll('[data-tabs]').forEach(group => {
    const buttons = group.querySelectorAll('button[role="tab"]');
    const lanes = document.querySelectorAll('[data-lane]');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const want = btn.dataset.target;
        buttons.forEach(b => {
          const active = b.dataset.target === want;
          b.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        lanes.forEach(ln => {
          const show = ln.dataset.lane === want;
          ln.hidden = !show;
        });
      });
    });
  });

  /* Deep links into a hidden lane (e.g. pricing.html#for-agencies):
     switch the tab first, then scroll to the target. */
  const activateLaneFromHash = () => {
    const hash = location.hash.slice(1);
    if (!hash) return;
    const target = document.getElementById(hash);
    if (!target) return;
    const lane = target.closest('[data-lane]');
    if (!lane || !lane.hidden) return;
    const btn = document.querySelector('[data-tabs] button[role="tab"][data-target="' + lane.dataset.lane + '"]');
    if (!btn) return;
    btn.click();
    requestAnimationFrame(() => {
      const off = (document.querySelector('.site-header')?.offsetHeight || 0) + 12;
      const y = target.getBoundingClientRect().top + window.scrollY - off;
      window.scrollTo({ top: y, behavior: 'auto' });
    });
  };
  window.addEventListener('hashchange', activateLaneFromHash);
  activateLaneFromHash();

  /* ---------- 5. Magnetic CTAs (desktop only) ---------- */
  const fine = window.matchMedia('(pointer: fine)').matches;
  if (fine && !reduced) {
    document.querySelectorAll('[data-magnetic]').forEach(el => {
      const strength = parseFloat(el.dataset.magnetic) || 0.25;
      el.addEventListener('mousemove', (ev) => {
        const r = el.getBoundingClientRect();
        const x = ev.clientX - (r.left + r.width / 2);
        const y = ev.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- 6. Parallax ---------- */
  if (!reduced) {
    const parallaxEls = document.querySelectorAll('[data-parallax]');
    if (parallaxEls.length) {
      let ticking = false;
      const updateParallax = () => {
        const vh = window.innerHeight;
        parallaxEls.forEach(el => {
          const r = el.getBoundingClientRect();
          if (r.bottom < 0 || r.top > vh) return;
          const speed = parseFloat(el.dataset.parallax) || 0.15;
          const center = r.top + r.height / 2 - vh / 2;
          const t = -center * speed;
          el.style.transform = `translate3d(0, ${t.toFixed(1)}px, 0)`;
        });
        ticking = false;
      };
      window.addEventListener('scroll', () => {
        if (!ticking) { requestAnimationFrame(updateParallax); ticking = true; }
      }, { passive: true });
      updateParallax();
    }
  }

  /* ---------- 7. Smooth anchor links ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (ev) => {
      const href = a.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      ev.preventDefault();
      const off = (document.querySelector('.site-header')?.offsetHeight || 0) + 12;
      const y = target.getBoundingClientRect().top + window.scrollY - off;
      window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
    });
  });

  /* ---------- 8. i18n bootstrap ---------- */
  if (window.LOTABIN_I18N) window.LOTABIN_I18N.init();

  /* ---------- 9. Year stamp ---------- */
  document.querySelectorAll('[data-year]').forEach(el => {
    el.textContent = new Date().getFullYear();
  });

})();
