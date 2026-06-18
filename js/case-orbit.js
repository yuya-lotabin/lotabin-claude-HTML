/* ============================================================
   lotabin — Services · "The Case" scroll driver
   Same mechanical as js/production-orbit.js: a sticky-pinned track,
   scroll → progress 0..1, a typewriter HUD title, a progress fill
   bar, a clickable step rail that lights up per stage, and reason
   panels that crossfade as you descend. The three.js spiral
   staircase (js/case-stair.js) reads progress from the fill bar
   (#coFill) — no duplicate scroll math, always in lockstep.
   ============================================================ */
(function () {
  "use strict";

  var root    = document.getElementById('caseStair');
  if (!root) return;
  var track   = document.getElementById('coTrack');
  var pin     = document.getElementById('coPin');
  var hudStage= document.getElementById('coStage');
  var fill    = document.getElementById('coFill');
  var steps   = Array.prototype.slice.call(root.querySelectorAll('.co-step'));
  var panels  = Array.prototype.slice.call(root.querySelectorAll('.co-panel'));
  if (!track || !pin || !panels.length) return;

  var N = panels.length;                 // 3 stages
  var titles = [
    'One desk, not a department.',
    'Packs, not loose files.',
    'Waves, not whirlwinds.'
  ];

  root.classList.add('is-live');

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp  = function (n, a, b) { a = a == null ? 0 : a; b = b == null ? 1 : b; return Math.min(b, Math.max(a, n)); };
  var mix    = function (a, b, t) { return a + (b - a) * t; };
  var smooth = function (a, b, p) { if (p <= a) return 0; if (p >= b) return 1; var t = (p - a) / (b - a); return t * t * (3 - 2 * t); };

  /* ---------- scroll → progress (identical mechanic to the orbit) ---------- */
  function stickyOffsetPx() {
    var raw = getComputedStyle(root).getPropertyValue('--co-sticky').trim();
    var v = parseFloat(raw);
    return isFinite(v) ? v : 0;
  }
  function animRange() {
    var offset = stickyOffsetPx();
    var total = track.offsetHeight - Math.max(1, innerHeight - offset);
    var dwell = innerHeight * 0.5;       // hold the last landing a beat
    return { offset: offset, animTotal: Math.max(1, total - dwell) };
  }
  function scrollProgress() {
    var r = animRange();
    return clamp((r.offset - track.getBoundingClientRect().top) / r.animTotal);
  }
  function scrollToProgress(p) {
    var r = animRange();
    var docTop = track.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: Math.round(docTop - r.offset + clamp(p) * r.animTotal), behavior: 'smooth' });
  }

  function idxFor(p) { return Math.min(N - 1, Math.floor(p * N)); }

  /* ---------- typewriter HUD title ---------- */
  var typeTimer = null, typeTarget = hudStage ? hudStage.textContent : '';
  function typeStage(text) {
    if (!hudStage || text === typeTarget) return;
    typeTarget = text;
    if (typeTimer) { clearInterval(typeTimer); typeTimer = null; }
    if (reduced) { hudStage.textContent = text; return; }
    var n = 0;
    hudStage.classList.add('co-typing');
    hudStage.textContent = '';
    typeTimer = setInterval(function () {
      n += 1;
      hudStage.textContent = text.slice(0, n);
      if (n >= text.length) { clearInterval(typeTimer); typeTimer = null; hudStage.classList.remove('co-typing'); }
    }, 20);
  }

  /* ---------- render ---------- */
  function render(p) {
    p = clamp(p);
    var idx = idxFor(p);

    if (fill) fill.style.width = (p * 100).toFixed(2) + '%';
    typeStage(titles[idx]);

    var fadeW = 0.05;
    for (var n = 0; n < N; n++) {
      // step rail: per-step segment fill + active state
      if (steps[n]) {
        var seg = clamp((p - n / N) / (1 / N));
        steps[n].style.setProperty('--seg', seg.toFixed(4));
        steps[n].classList.toggle('is-active', n === idx);
      }
      // panel crossfade — full dwell within its third, quick crossfade at seams
      var lo = (n === 0) ? 1 : smooth(n / N - fadeW, n / N + fadeW, p);
      var hi = (n === N - 1) ? 1 : (1 - smooth((n + 1) / N - fadeW, (n + 1) / N + fadeW, p));
      var op = lo * hi;
      var el = panels[n];
      el.style.opacity = op.toFixed(4);
      el.style.transform = 'translateY(' + mix(14, 0, op).toFixed(2) + 'px)';
      el.style.pointerEvents = op > 0.6 ? 'auto' : 'none';
    }
  }

  /* ---------- step rail click → jump to that landing ---------- */
  var stepTargets = [];
  for (var i = 0; i < N; i++) stepTargets.push((i + 0.5) / N);
  steps.forEach(function (step, i) {
    step.setAttribute('aria-label', 'Go to reason ' + (i + 1));
    step.addEventListener('click', function () { scrollToProgress(stepTargets[i]); });
  });

  /* ---------- rAF-throttled scroll loop ---------- */
  var ticking = false;
  function update() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; render(scrollProgress()); });
  }
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  window.addEventListener('orientationchange', update, { passive: true });
  render(scrollProgress());
})();
