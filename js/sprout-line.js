/* ============================================================
   lotabin — Sprout process · auto-play wireframe production line
   Same visual language as the pencil / globe / tier boxes:
   paper-white wireframe edges with depth-faded alpha (fog),
   faint lit low-poly facet fills, bronze accents — here driven
   with Three.js as five morphing station-glyphs that crossfade
   along the 7-day Sprout timeline, looping forever.

   Degrades gracefully: without WebGL / THREE the frame's diagonal
   hatch remains. Pauses off-screen. Renders one static frame
   (the finished ad) under prefers-reduced-motion.
   ============================================================ */
(function () {
  "use strict";

  var root = document.querySelector(".svc3-spline");
  if (!root || typeof THREE === "undefined") return;
  var canvas = root.querySelector(".svc3-spline__gl");
  if (!canvas) return;

  var PAPER = 0xf6f4ef;
  var BRONZE = 0xc8a876;
  var INK = 0x0d0d11;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- stage copy (mono step + display title + day badge) ----
  var STAGES = [
    { step: "01 — The brief",   title: "Your product, the goal", day: "Day 01" },
    { step: "02 — Three hooks", title: "Three angles explored",  day: "Day 02" },
    { step: "03 — The shoot",   title: "Filmed \u0026 directed", day: "Day 03" },
    { step: "04 — The cut",     title: "Edited to 15 seconds",   day: "Day 05" },
    { step: "05 — Delivered",   title: "One polished ad",        day: "Day 07" }
  ];
  var N = STAGES.length;

  // ---- renderer ----
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  } catch (e) { return; }
  renderer.setClearColor(0x000000, 0);

  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(INK, 5.4, 11.5);
  var camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 6.4);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  var key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(-3, 4, 4);
  scene.add(key);

  // ---- wireframe helper ----
  function wire(geo, accent, baseLine, baseFill) {
    baseLine = baseLine == null ? 0.5 : baseLine;
    baseFill = baseFill == null ? 0.06 : baseFill;
    var g = new THREE.Group();
    var fillMat = new THREE.MeshStandardMaterial({
      color: accent ? BRONZE : PAPER, transparent: true, opacity: baseFill,
      roughness: 1, metalness: 0, flatShading: true, depthWrite: false
    });
    fillMat.userData.base = baseFill;
    var lineMat = new THREE.LineBasicMaterial({
      color: accent ? BRONZE : PAPER, transparent: true, opacity: baseLine, fog: true
    });
    lineMat.userData.base = baseLine;
    g.add(new THREE.Mesh(geo, fillMat));
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 18), lineMat));
    return g;
  }
  // bronze (or paper) line run from a list of [a,b] point pairs
  function strokes(pairs, accent, baseLine) {
    baseLine = baseLine == null ? 0.6 : baseLine;
    var pts = [];
    for (var i = 0; i < pairs.length; i++) {
      pts.push(pairs[i][0][0], pairs[i][0][1], pairs[i][0][2]);
      pts.push(pairs[i][1][0], pairs[i][1][1], pairs[i][1][2]);
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    var mat = new THREE.LineBasicMaterial({
      color: accent ? BRONZE : PAPER, transparent: true, opacity: baseLine, fog: true
    });
    mat.userData.base = baseLine;
    return new THREE.LineSegments(geo, mat);
  }

  // ---- the five station glyphs ----
  function buildBrief() {
    var s = new THREE.Group();
    s.add(wire(new THREE.BoxGeometry(1.45, 1.72, 0.13)));
    var head = wire(new THREE.BoxGeometry(1.45, 0.18, 0.15), true, 0.6, 0.12);
    head.position.y = 0.77;
    s.add(head);
    // three faint "text" rules
    [0.18, -0.08, -0.34].forEach(function (y) {
      var bar = wire(new THREE.BoxGeometry(0.98, 0.045, 0.14), false, 0.34, 0.04);
      bar.position.set(-0.12, y, 0.02);
      s.add(bar);
    });
    return s;
  }
  function buildHooks() {
    var s = new THREE.Group();
    var defs = [[-0.95, -0.12, 0.46, false], [0, 0.42, 0.52, true], [0.95, -0.12, 0.44, false]];
    var branch = [];
    defs.forEach(function (d) {
      var ico = wire(new THREE.IcosahedronGeometry(d[2], 0), d[3], d[3] ? 0.62 : 0.5);
      ico.position.set(d[0], d[1], 0);
      s.add(ico);
      branch.push([[0, -1.04, 0], [d[0], d[1], 0]]);
    });
    s.add(strokes(branch, true, 0.5));
    return s;
  }
  function buildShoot() {
    var s = new THREE.Group();
    s.add(wire(new THREE.BoxGeometry(1.3, 0.86, 0.78)));
    var lens = wire(new THREE.CylinderGeometry(0.3, 0.4, 0.55, 18));
    lens.rotation.z = Math.PI / 2;
    lens.position.x = 0.82;
    s.add(lens);
    var ring = wire(new THREE.TorusGeometry(0.32, 0.05, 10, 22), true, 0.62, 0.12);
    ring.rotation.y = Math.PI / 2;
    ring.position.x = 1.08;
    s.add(ring);
    var finder = wire(new THREE.BoxGeometry(0.34, 0.3, 0.5));
    finder.position.set(-0.42, 0.62, 0);
    s.add(finder);
    return s;
  }
  function buildEdit() {
    var s = new THREE.Group();
    var heights = [0.5, 1.12, 0.74, 1.5, 0.92, 0.6];
    var x0 = -1.0, dx = 0.4, base = -0.86;
    var tallest = 3;
    heights.forEach(function (h, i) {
      var bar = wire(new THREE.BoxGeometry(0.2, h, 0.2), i === tallest, i === tallest ? 0.62 : 0.5);
      bar.position.set(x0 + i * dx, base + h / 2, 0);
      s.add(bar);
    });
    s.add(strokes([[[-1.2, base, 0], [1.2, base, 0]]], true, 0.55));
    return s;
  }
  function buildDeliver() {
    var s = new THREE.Group();
    s.add(wire(new THREE.TorusGeometry(0.92, 0.06, 14, 48)));
    var play = wire(new THREE.ConeGeometry(0.44, 0.72, 3), true, 0.66, 0.14);
    play.rotation.z = -Math.PI / 2;
    play.position.x = 0.06;
    s.add(play);
    return s;
  }

  var builders = [buildBrief, buildHooks, buildShoot, buildEdit, buildDeliver];
  var stages = builders.map(function (b) {
    var g = b();
    g.rotation.x = 0.16;
    g.visible = false;
    scene.add(g);
    return g;
  });

  // crossfade opacity window centered on each stage
  function stageOpacity(i, sf) {
    var x = sf - i - 0.5;
    x = ((x + N / 2) % N + N) % N - N / 2;
    var ax = Math.abs(x);
    var P = 0.34, E = 0.66;
    if (ax <= P) return 1;
    if (ax >= E) return 0;
    return (E - ax) / (E - P);
  }
  function applyVis(stage, o) {
    stage.visible = o > 0.003;
    if (!stage.visible) return;
    stage.scale.setScalar(0.85 + 0.15 * o);
    stage.traverse(function (n) {
      var m = n.material;
      if (m && m.userData && m.userData.base != null) m.opacity = m.userData.base * o;
    });
  }

  // ---- caption / track DOM ----
  var capEl = root.querySelector(".svc3-spline__cap");
  var stepEl = root.querySelector(".svc3-spline__step");
  var titleEl = root.querySelector(".svc3-spline__title");
  var dayEl = root.querySelector(".svc3-spline__day");
  var fillEl = root.querySelector(".t-fill");
  var nodeEls = Array.prototype.slice.call(root.querySelectorAll(".t-node"));
  var shown = -1;

  function setCaption(i) {
    if (i === shown) return;
    shown = i;
    var s = STAGES[i];
    if (capEl) {
      capEl.classList.add("is-swap");
      setTimeout(function () {
        if (stepEl) stepEl.textContent = s.step;
        if (titleEl) titleEl.textContent = s.title;
        if (dayEl) dayEl.textContent = s.day + " / 07";
        capEl.classList.remove("is-swap");
      }, 240);
    }
    nodeEls.forEach(function (n, k) {
      n.classList.toggle("is-active", k === i);
      n.classList.toggle("is-done", k < i);
    });
  }

  function easeIO(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  // ---- sizing ----
  function resize() {
    var w = root.clientWidth, h = root.clientHeight;
    if (!w || !h) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // pull the camera back a touch on portrait/narrow frames so glyphs never clip
    camera.position.z = 6.4 + Math.max(0, (0.95 - camera.aspect)) * 2.2;
    camera.updateProjectionMatrix();
  }
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(root);
  window.addEventListener("resize", resize);
  resize();

  // ---- loop ----
  var STAGE_DUR = 2.7;
  var last = performance.now();
  var sf = 0;
  var raf = 0, paused = false;

  function render() {
    for (var i = 0; i < N; i++) {
      var g = stages[i];
      applyVis(g, stageOpacity(i, sf));
      if (g.visible) g.rotation.y += 0.0; // set per-frame below
    }
    renderer.render(scene, camera);
  }

  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    sf = (sf + dt / STAGE_DUR) % N;

    for (var i = 0; i < N; i++) {
      var o = stageOpacity(i, sf);
      applyVis(stages[i], o);
      if (stages[i].visible) stages[i].rotation.y += dt * 0.5;
    }

    var si = Math.floor(sf) % N;
    setCaption(si);
    if (fillEl) {
      var local = sf - Math.floor(sf);
      var frac = (Math.floor(sf) + easeIO(local)) / N;
      fillEl.style.width = (frac * 100).toFixed(1) + "%";
    }

    renderer.render(scene, camera);
    if (!paused) raf = requestAnimationFrame(frame);
  }

  if (reduced) {
    sf = 4.5;                 // hold on the finished ad
    for (var i = 0; i < N; i++) applyVis(stages[i], stageOpacity(i, sf));
    setCaption(4);
    if (fillEl) fillEl.style.width = "100%";
    renderer.render(scene, camera);
  } else {
    raf = requestAnimationFrame(frame);
  }

  if ("IntersectionObserver" in window && !reduced) {
    new IntersectionObserver(function (entries) {
      var vis = entries[0].isIntersecting;
      if (vis && paused) { paused = false; last = performance.now(); raf = requestAnimationFrame(frame); }
      else if (!vis && !paused) { paused = true; cancelAnimationFrame(raf); }
    }, { threshold: 0 }).observe(root);
  }
})();
