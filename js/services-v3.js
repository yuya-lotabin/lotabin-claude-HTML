/* ============================================================
   lotabin — Services v3 motion + index module
   - Scrollspy: rail (desktop) + dock (mobile) chapter tracking
   - Rail progress thread
   - GSAP: hero intro, scroll reveals, ghost-numeral parallax,
     stat count-ups
   - Degrades gracefully: without GSAP / with reduced motion the
     page is fully visible and the index still works.
   ============================================================ */

(function () {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Scrollspy ---------- */
  const chapters = Array.prototype.slice.call(document.querySelectorAll('[data-chapter]'));
  const links = Array.prototype.slice.call(document.querySelectorAll('.svc3-rail a[data-ch], .svc3-dock a[data-ch]'));
  const dock = document.querySelector('.svc3-dock');
  const railNow = document.getElementById('railNow');
  const RAIL_NUMS = { 'why': '00', 't-sprout': '01', 't-standard': '02', 't-pro': '03', 't-enterprise': '04', 't-film': '05', 't-partners': '06' };

  function setActive(id) {
    let chip = null;
    links.forEach(function (a) {
      const on = a.dataset.ch === id;
      a.classList.toggle('active', on);
      if (on && dock && dock.contains(a)) chip = a;
    });
    if (railNow && RAIL_NUMS[id]) railNow.textContent = RAIL_NUMS[id];
    if (chip && dock) {
      dock.scrollTo({ left: Math.max(0, chip.offsetLeft - 20), behavior: reduced ? 'auto' : 'smooth' });
    }
  }

  if ('IntersectionObserver' in window && chapters.length) {
    const spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) setActive(e.target.dataset.chapter);
      });
    }, { rootMargin: '-40% 0px -52% 0px', threshold: 0 });
    chapters.forEach(function (c) { spy.observe(c); });
  }

  /* ---------- 2. Rail toggle (collapsed button → tier menu) ---------- */
  const rail = document.querySelector('.svc3-rail');
  const railBtn = document.querySelector('.svc3-rail-btn');
  if (rail && railBtn) {
    const setOpen = function (open) {
      rail.classList.toggle('open', open);
      railBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    railBtn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      setOpen(!rail.classList.contains('open'));
    });
    rail.querySelectorAll('.svc3-rail-menu a').forEach(function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });
    document.addEventListener('click', function (ev) {
      if (!rail.contains(ev.target)) setOpen(false);
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') setOpen(false);
    });
  }

  /* ---------- 2b. "Ad Blueprint" → land with the tiers section JUST out of view ----------
     Desktop only: scroll so .svc3-select sits just below the fold (hidden),
     clamped so the "00" stays a bit below the header. Mobile keeps the CSS anchor. */
  (function () {
    const typeline = document.getElementById('blueprint');
    const select = document.querySelector('.svc3-select');
    if (!typeline || !select) return;
    const isDesktop = function () { return window.matchMedia('(min-width: 1080px)').matches; };
    const docY = function (el) { return el.getBoundingClientRect().top + window.pageYOffset; };
    function scrollBlueprint(smooth) {
      const vh = window.innerHeight;
      let y = docY(select) - vh + 4;        // tiers section just past the bottom edge
      const maxY = docY(typeline) - 96;     // but keep the "00" ~96px under the header
      if (y > maxY) y = maxY;
      if (y < 0) y = 0;
      window.scrollTo({ top: y, behavior: smooth ? 'smooth' : 'auto' });
    }
    document.querySelectorAll('a[href="#blueprint"]').forEach(function (a) {
      a.addEventListener('click', function (ev) {
        if (!isDesktop()) return;           // mobile: default anchor (CSS scroll-margin)
        ev.preventDefault();
        scrollBlueprint(true);
        if (history.replaceState) history.replaceState(null, '', '#blueprint');
      });
    });
    if (location.hash === '#blueprint' && isDesktop()) {
      window.addEventListener('load', function () { setTimeout(function () { scrollBlueprint(false); }, 60); });
      setTimeout(function () { scrollBlueprint(false); }, 220);
    }
  })();

  const thread = document.querySelector('.svc3-rail .thread');
  if (thread) {
    let ticking = false;
    const update = function () {
      const doc = document.documentElement;
      const max = (doc.scrollHeight - doc.clientHeight) || 1;
      thread.style.transform = 'scaleY(' + Math.min(1, Math.max(0, doc.scrollTop / max)).toFixed(4) + ')';
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }

  /* ---------- 3b. Sprout gallery (button / dash driven, transform rail) ---------- */
  document.querySelectorAll('.svc3-sp-carousel').forEach(function (car) {
    const track = car.querySelector('.track');
    const rail = car.querySelector('.sp-rail');
    if (!track || !rail) return;
    const cards = Array.prototype.slice.call(rail.querySelectorAll('.sp-card'));
    if (!cards.length) return;
    const prev = car.querySelector('.cbtn.prev');
    const next = car.querySelector('.cbtn.next');
    const dots = Array.prototype.slice.call(car.querySelectorAll('.cdot'));
    let index = 0;

    const maxOffset = function () {
      return Math.max(0, rail.scrollWidth - track.clientWidth);
    };
    const offsetForIndex = function (i) {
      const base = cards[0].offsetLeft;
      return Math.max(0, Math.min(cards[i].offsetLeft - base, maxOffset()));
    };

    const apply = function () {
      index = ((index % cards.length) + cards.length) % cards.length;
      rail.style.transform = 'translate3d(' + (-offsetForIndex(index)) + 'px,0,0)';
      dots.forEach(function (d, i) { d.classList.toggle('is-active', i === index); });
    };

    const goTo = function (i) { index = i; apply(); };

    if (prev) prev.addEventListener('click', function () { goTo(index - 1); });
    if (next) next.addEventListener('click', function () { goTo(index + 1); });
    dots.forEach(function (d, i) { d.addEventListener('click', function () { goTo(i); }); });
    window.addEventListener('resize', apply);
    apply();
  });

  /* ---------- 4. GSAP motion ---------- */
  if (reduced || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  /* hero intro */
  const lines = document.querySelectorAll('.svc3-h1 .svc3-line > span');
  if (lines.length) {
    gsap.set(lines, { yPercent: 112 });
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .to(lines, { yPercent: 0, duration: 1.15, stagger: 0.12 }, 0.2);
  }

  /* generic scroll reveals */
  document.querySelectorAll('[data-gs]').forEach(function (el) {
    gsap.from(el, {
      opacity: 0,
      y: 36,
      duration: 0.95,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 86%', once: true }
    });
  });

  /* tier deliverable lists — staggered rows */
  document.querySelectorAll('.svc3-tier-list').forEach(function (list) {
    gsap.from(list.children, {
      opacity: 0,
      y: 22,
      duration: 0.7,
      stagger: 0.05,
      ease: 'power3.out',
      scrollTrigger: { trigger: list, start: 'top 85%', once: true }
    });
  });

  /* case rows — staggered */
  document.querySelectorAll('.svc3-rows').forEach(function (list) {
    gsap.from(list.children, {
      opacity: 0,
      y: 16,
      duration: 0.6,
      stagger: 0.07,
      ease: 'power3.out',
      scrollTrigger: { trigger: list, start: 'top 85%', once: true }
    });
  });

  /* ghost numerals — slow parallax drift */
  document.querySelectorAll('.svc3-ghost').forEach(function (g) {
    g.style.transform = 'none'; // hand transform ownership to GSAP
    gsap.fromTo(g, { yPercent: -62 }, {
      yPercent: -40,
      ease: 'none',
      scrollTrigger: {
        trigger: g.closest('.svc3-tier'),
        start: 'top bottom',
        end: 'bottom top',
        scrub: true
      }
    });
  });

  /* stat count-ups */
  document.querySelectorAll('[data-count]').forEach(function (el) {
    const end = parseFloat(el.dataset.count);
    if (isNaN(end)) return;
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const state = { v: 0 };
    gsap.to(state, {
      v: end,
      duration: 1.5,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      onUpdate: function () {
        el.textContent = prefix + Math.round(state.v).toLocaleString('en-US') + suffix;
      }
    });
  });

  /* text "resolve" reveal — letters settle into place (sibling to count-up) */
  document.querySelectorAll('[data-scramble]').forEach(function (el) {
    const finalText = el.textContent;
    const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: function () {
        const total = 26;
        let f = 0;
        const tick = function () {
          f++;
          const settled = Math.floor((f / total) * finalText.length);
          let out = '';
          for (let i = 0; i < finalText.length; i++) {
            const c = finalText[i];
            if (c === ' ') { out += ' '; continue; }
            out += (i < settled) ? c : glyphs[Math.floor(Math.random() * glyphs.length)];
          }
          el.textContent = out;
          if (f < total) requestAnimationFrame(tick);
          else el.textContent = finalText;
        };
        tick();
      }
    });
  });

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
