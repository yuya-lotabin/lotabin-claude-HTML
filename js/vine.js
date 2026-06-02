/* ============================================================
   lotabin — Pricing vine
   A scroll-driven, line-tracing (draw-on) vine that grows from the
   bottom of the Sprout card, forks ONCE into three branches, and
   connects its ends to the Standard / Pro / Enterprise cards — each
   plan reveals the moment its own vine lands. Pure vanilla; geometry
   is measured from the live layout so it stays responsive.
   Mobile (single-column trio): vine is skipped, cards reveal normally.
   ============================================================ */
(function () {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SVGNS = 'http://www.w3.org/2000/svg';
  const LEAF_D = 'M0 0 C 7 -11 22 -10 29 0 C 22 10 7 11 0 0 Z';

  const stack = document.querySelector('.lane[data-lane="brands"] .plan-stack[data-vine]')
             || document.querySelector('.plan-stack[data-vine]');
  if (!stack) return;
  const sprout = stack.querySelector('.sprout-feature');
  const trio   = stack.querySelector('.plan-trio');
  if (!sprout || !trio) return;
  const cards = Array.prototype.slice.call(trio.querySelectorAll('.plan')); // [Standard, Pro, Enterprise]
  if (cards.length < 3) return;

  let layer = stack.querySelector('.vine-layer');
  if (!layer) {
    layer = document.createElement('div');
    layer.className = 'vine-layer';
    layer.setAttribute('aria-hidden', 'true');
    stack.prepend(layer);
  }
  // hard guarantee the overlay never participates in flow (belt + braces vs CSS)
  layer.style.position = 'absolute';
  layer.style.left = layer.style.top = layer.style.right = layer.style.bottom = '0';
  layer.style.zIndex = '0';
  layer.style.pointerEvents = 'none';
  if (getComputedStyle(stack).position === 'static') stack.style.position = 'relative';

  // per-card draw sub-ranges along the global progress p[0..1], and the
  // p at which each card "connects" and reveals.
  const DRAW   = { 1: [0.24, 0.40], 0: [0.34, 0.44], 2: [0.44, 0.46] }; // centre, left, right
  const REVEAL = { 1: 0.60, 0: 0.74, 2: 0.86 };

  let svg, stemEl, branchEls = [null, null, null], leaves = [];
  let built = false, lastW = 0, lastH = 0;

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const isMobile = () => window.matchMedia('(max-width: 767px)').matches;

  function mk(name, attrs) {
    const e = document.createElementNS(SVGNS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function branchD(fx, fy, tx, ty) {
    const dx = tx - fx, dy = ty - fy;
    const c1x = fx + dx * 0.12, c1y = fy + dy * 0.34;
    const c2x = tx,            c2y = fy + dy * 0.74;
    return 'M' + fx.toFixed(1) + ' ' + fy.toFixed(1) +
           ' C ' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) +
           ' ' + c2x.toFixed(1) + ' ' + c2y.toFixed(1) +
           ' ' + tx.toFixed(1) + ' ' + ty.toFixed(1);
  }

  // sample `count` leaves along a path; each gets a reveal threshold
  function leavesAlong(path, count, revealStart, revealSpan) {
    const len = path.getTotalLength();
    const out = [];
    for (let i = 0; i < count; i++) {
      const f = (i + 1) / (count + 1);
      const pt = path.getPointAtLength(len * f);
      const pn = path.getPointAtLength(Math.min(len, len * f + 1));
      const ang = Math.atan2(pn.y - pt.y, pn.x - pt.x) * 180 / Math.PI;
      const side = (i % 2 === 0 ? 1 : -1) * 58;
      const g = mk('g', { transform: 'translate(' + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1) + ') rotate(' + (ang + side).toFixed(1) + ')' });
      const inner = mk('g', { class: 'vine-leaf' });
      inner.appendChild(mk('path', { d: LEAF_D }));
      g.appendChild(inner);
      g.__revealAt = revealStart + revealSpan * f;
      out.push(g);
    }
    return out;
  }

  function finishAll() {
    [stemEl].concat(branchEls).forEach((p) => { if (p) { p.style.strokeDashoffset = 0; p.style.opacity = '1'; } });
    leaves.forEach((g) => g.classList.add('in'));
    cards.forEach((c) => c.classList.add('vine-revealed'));
  }

  function build() {
    const R = stack.getBoundingClientRect();
    const W = R.width, H = R.height;
    if (W < 2 || H < 2) return false;

    layer.innerHTML = '';
    leaves = []; branchEls = [null, null, null]; stemEl = null;

    if (isMobile()) {
      // no vine on stacked single-column layout — let cards show normally
      layer.style.display = 'none';
      stack.classList.remove('vine-armed');
      cards.forEach((c) => c.classList.remove('vine-revealed'));
      built = true; lastW = Math.round(W); lastH = Math.round(H);
      return true;
    }
    layer.style.display = '';

    svg = mk('svg', { class: 'vine-svg', viewBox: '0 0 ' + W.toFixed(1) + ' ' + H.toFixed(1), preserveAspectRatio: 'none' });
    const defs = mk('defs', {});
    const lg = mk('linearGradient', { id: 'vineGradSite', x1: '0', y1: '0', x2: '0', y2: '1' });
    lg.appendChild(mk('stop', { offset: '0', 'stop-color': '#e3c9a3' }));
    lg.appendChild(mk('stop', { offset: '0.5', 'stop-color': '#c8a876' }));
    lg.appendChild(mk('stop', { offset: '1', 'stop-color': '#9a7d4f' }));
    const rg = mk('radialGradient', { id: 'leafGradSite', cx: '0.3', cy: '0.3', r: '0.9' });
    rg.appendChild(mk('stop', { offset: '0', 'stop-color': '#e3c9a3' }));
    rg.appendChild(mk('stop', { offset: '1', 'stop-color': '#a9874f' }));
    defs.appendChild(lg); defs.appendChild(rg);
    svg.appendChild(defs);

    // geometry, relative to the stack box
    const sr = sprout.getBoundingClientRect();
    const sx = sr.left + sr.width / 2 - R.left;
    const sy = sr.bottom - R.top;
    const tr = trio.getBoundingClientRect();
    const cardTopY = tr.top - R.top;
    const gap = Math.max(40, cardTopY - sy);
    const fork = { x: sx, y: sy + gap * 0.46 };
    const tuck = Math.min(30, gap * 0.28);
    const targets = cards.map((c) => {
      const cr = c.getBoundingClientRect();
      return { x: cr.left + cr.width / 2 - R.left, y: cardTopY + tuck };
    });

    // stem
    const stemPath = 'M' + sx.toFixed(1) + ' ' + sy.toFixed(1) +
      ' C ' + (sx + 5).toFixed(1) + ' ' + (sy + gap * 0.16).toFixed(1) +
      ' ' + (sx - 5).toFixed(1) + ' ' + (sy + gap * 0.30).toFixed(1) +
      ' ' + fork.x.toFixed(1) + ' ' + fork.y.toFixed(1);
    stemEl = mk('path', { class: 'vine-path', d: stemPath });
    svg.appendChild(stemEl);

    // branches — centre first so it sits beneath the side sweeps
    [1, 0, 2].forEach((idx) => {
      const t = targets[idx];
      const p = mk('path', { class: 'vine-path' + (idx === 1 ? '' : ' vine-side'), d: branchD(fork.x, fork.y, t.x, t.y) });
      p.setAttribute('data-card', idx);
      svg.appendChild(p);
      branchEls[idx] = p;
    });

    layer.appendChild(svg);

    // arm the dash on every line — hidden until its own draw begins
    [stemEl].concat(branchEls).forEach((p) => {
      const L = p.getTotalLength();
      p.__len = L;
      p.style.strokeDasharray = L;
      p.style.strokeDashoffset = L;
      p.style.opacity = '0'; // avoids the round-cap dot showing pre-draw
    });
    branchEls.forEach((p) => { p.__rng = DRAW[+p.getAttribute('data-card')]; });

    // leaves: a couple on the stem, two per branch
    let groups = leavesAlong(stemEl, 1, 0.06, 0.16);
    groups = groups.concat(leavesAlong(branchEls[1], 2, DRAW[1][0], DRAW[1][1]));
    groups = groups.concat(leavesAlong(branchEls[0], 2, DRAW[0][0], DRAW[0][1]));
    groups = groups.concat(leavesAlong(branchEls[2], 2, DRAW[2][0], DRAW[2][1]));
    groups.forEach((g) => { svg.appendChild(g); leaves.push(g); });

    stack.classList.add('vine-armed');
    built = true; lastW = Math.round(W); lastH = Math.round(H);
    if (reduced) finishAll();
    return true;
  }

  function setDraw(path, s0, s1, p) {
    const L = path.__len || 0;
    let local = (p - s0) / (s1 - s0);
    local = local < 0 ? 0 : local > 1 ? 1 : local;
    path.style.strokeDashoffset = (L * (1 - local)).toFixed(1);
    path.style.opacity = local > 0.001 ? '1' : '0'; // no dot before the line starts
  }

  function frame() {
    if (!built || reduced) return;
    if (isMobile()) return;
    const vh = window.innerHeight;
    const tr = trio.getBoundingClientRect();
    const startLine = vh * 0.92, endLine = vh * 0.42;
    const p = clamp01((startLine - tr.top) / (startLine - endLine));

    setDraw(stemEl, 0, 0.22, p);
    branchEls.forEach((pa) => { setDraw(pa, pa.__rng[0], pa.__rng[0] + pa.__rng[1], p); });
    leaves.forEach((g) => { g.classList.toggle('in', p >= (g.__revealAt || 1)); });
    cards.forEach((c, idx) => { c.classList.toggle('vine-revealed', p >= REVEAL[idx]); });
  }

  let ticking = false;
  function onScroll() {
    if (!ticking) { requestAnimationFrame(() => { ensureBuilt(); frame(); ticking = false; }); ticking = true; }
  }

  function ensureBuilt() {
    const R = stack.getBoundingClientRect();
    if (R.width < 2 || R.height < 2) return; // hidden lane
    if (!built || Math.abs(Math.round(R.width) - lastW) > 1 || Math.abs(Math.round(R.height) - lastH) > 2) {
      if (build()) frame();
    }
  }

  function init() { ensureBuilt(); frame(); }
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('load', () => { ensureBuilt(); frame(); });
  window.addEventListener('scroll', onScroll, { passive: true });

  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { built = false; ensureBuilt(); frame(); }, 150);
  });
  // recompute when the user toggles back to the Brands lane
  document.querySelectorAll('[data-tabs] button[role="tab"]').forEach((b) => {
    b.addEventListener('click', () => setTimeout(() => { built = false; ensureBuilt(); frame(); }, 80));
  });
})();
