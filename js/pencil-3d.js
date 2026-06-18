/* ============================================================
   lotabin — Services hero · skeletal wireframe pencil
   Rendered with the SAME technique as the partner globe
   (js/partner-globe.js): a 2D-canvas projection of a low-poly
   model — paper-white wireframe edges with depth-faded alpha,
   faint lit facet fills, vertex glints, and bronze accents
   (ferrule bands + a pulsing marker at the writing tip, echoing
   the globe's hub).

   Drag to spin (around the long axis) / tilt; gentle idle spin.
   Pauses off-screen; static under prefers-reduced-motion.
   ============================================================ */
(function () {
  "use strict";

  var canvas = document.getElementById("svc3-pencil");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var stage = canvas.parentElement;

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var autoRotateSpeed = reducedMotion ? 0 : 0.012;   // gentle spin about the pencil's axle

  // ---- palette (matches tokens.css / the globe) ----
  var PAPER  = "rgba(246, 244, 239, ALPHA)";   // paper-50
  var BRONZE = "rgba(200, 168, 118, ALPHA)";   // bronze

  /* ---- pencil model: hexagonal profile swept through rings ----
     [ y, radius, kind ]  kind: 0 eraser ·1 ferrule ·2 body ·3 wood ·4 graphite */
  var rings = [
    [ 2.46, 0.12, 0],
    [ 2.40, 0.24, 0],
    [ 2.30, 0.30, 0],
    [ 2.07, 0.30, 1],
    [ 2.02, 0.35, 1],
    [ 1.95, 0.365, 1],
    [ 1.90, 0.345, 1],
    [ 1.84, 0.365, 1],
    [ 1.60, 0.35, 1],
    [ 1.57, 0.34, 2],
    [-1.52, 0.34, 2],
    [-1.55, 0.335, 3],
    [-2.12, 0.13, 3],
    [-2.18, 0.12, 4]
  ];
  var SEG = 6;

  var verts = [], ringStart = [], i, k, y, r;
  for (i = 0; i < rings.length; i++) {
    ringStart[i] = verts.length;
    y = rings[i][0]; r = rings[i][1];
    for (k = 0; k < SEG; k++) {
      var a = k * (Math.PI * 2 / SEG);
      verts.push([Math.cos(a) * r, y, Math.sin(a) * r]);
    }
  }
  var topApex = verts.length; verts.push([0,  2.50, 0]);
  var tipApex = verts.length; verts.push([0, -2.50, 0]);

  // ---- edges (with optional bronze tint) ----
  var edges = [];
  function edge(a, b, bronze) { edges.push([a, b, bronze ? 1 : 0]); }
  // longitudinal
  for (i = 0; i < rings.length - 1; i++) {
    var br = rings[i][2] === 1 && rings[i + 1][2] === 1; // ferrule run
    for (k = 0; k < SEG; k++) edge(ringStart[i] + k, ringStart[i + 1] + k, br);
  }
  // ring hoops (bronze on the ferrule bands)
  for (i = 0; i < rings.length; i++) {
    var hoopBronze = rings[i][2] === 1;
    for (k = 0; k < SEG; k++) edge(ringStart[i] + k, ringStart[i] + (k + 1) % SEG, hoopBronze);
  }
  // caps
  for (k = 0; k < SEG; k++) edge(topApex, ringStart[0] + k, false);
  for (k = 0; k < SEG; k++) edge(tipApex, ringStart[rings.length - 1] + k, true);

  // ---- faces (for faint lit fills): [v0,v1,v2, isCap] ----
  var faces = [];
  for (i = 0; i < rings.length - 1; i++) {
    var aS = ringStart[i], bS = ringStart[i + 1];
    for (k = 0; k < SEG; k++) {
      var k2 = (k + 1) % SEG;
      faces.push([aS + k, bS + k, bS + k2, 0]);
      faces.push([aS + k, bS + k2, aS + k2, 0]);
    }
  }
  for (k = 0; k < SEG; k++) { var kk = (k + 1) % SEG; faces.push([topApex, ringStart[0] + k, ringStart[0] + kk, 1]); }
  var lastS = ringStart[rings.length - 1];
  for (k = 0; k < SEG; k++) { var kk2 = (k + 1) % SEG; faces.push([tipApex, lastS + k, lastS + kk2, 1]); }

  // ---- 3D helpers (same math as the globe) ----
  function rotYfn(p, ang) { var c = Math.cos(ang), s = Math.sin(ang); return [p[0]*c + p[2]*s, p[1], -p[0]*s + p[2]*c]; }
  function rotXfn(p, ang) { var c = Math.cos(ang), s = Math.sin(ang); return [p[0], p[1]*c - p[2]*s, p[1]*s + p[2]*c]; }
  function rotZfn(p, ang) { var c = Math.cos(ang), s = Math.sin(ang); return [p[0]*c - p[1]*s, p[0]*s + p[1]*c, p[2]]; }
  function project(p, cx, cy, fov) { var sc = fov / (fov + p[2]); return [p[0]*sc + cx, p[1]*sc + cy]; }

  // upright & straight; spins about its own central axle (Y), point down
  var rotY = 0.0;
  var rotX = 0.0;
  var time = 0;

  // click toggle: lay the pencil horizontal (point to TRUE LEFT) + reveal plan
  var laid = false;
  var curZ = 0;      // screen-plane rotation (0 = upright, π/2 = horizontal, point left)
  var curSlide = 0;  // horizontal offset as a fraction of width
  var curRise = 0;   // vertical offset as a fraction of height (mobile: lift up)
  function isMobile()   { return window.matchMedia("(max-width: 760px)").matches; }
  function targetZ()    { return laid ? Math.PI / 2 : 0; }
  // desktop: slide RIGHT (popup sits left). mobile: stay centered (popup stacks below)
  function targetSlide(){ return laid ? (isMobile() ? 0 : 0.22) : 0; }
  function targetRise() { return (laid && isMobile()) ? -0.38 : 0; }
  function animating() {
    return Math.abs(targetZ() - curZ) > 0.0015 ||
           Math.abs(targetSlide() - curSlide) > 0.0008 ||
           Math.abs(targetRise() - curRise) > 0.0008;
  }

  // light direction (upper-left, slightly toward camera) — as in the globe
  var LX = -0.42, LY = -0.62, LZ = -0.66;

  function draw() {
    var dpr = window.devicePixelRatio || 1;
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (w === 0 || h === 0) { schedule(); return; }
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr; canvas.height = h * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    rotY += autoRotateSpeed;             // rotate about the central axle
    if (!reducedMotion) time += 0.015;   // drives the gentle float + tip pulse

    // ease toward the laid/upright target
    curZ += (targetZ() - curZ) * 0.14;
    curSlide += (targetSlide() - curSlide) * 0.14;
    curRise += (targetRise() - curRise) * 0.14;

    var mobile = isMobile();
    var cx = w / 2 + curSlide * w;
    var bob = reducedMotion ? 0 : Math.sin(time * 0.9) * (h * 0.012);
    var cy = h / 2 + bob + curRise * h;
    // desktop framing unchanged; mobile fits the length to width so it never clips
    var scale = mobile ? Math.min(h * 0.16, w * 0.155) : Math.min(h * 0.165, w * 0.62);
    var fov = 620;

    // transform once per frame
    var rv = new Array(verts.length), sv = new Array(verts.length), zMax = 0.0001, p;
    for (i = 0; i < verts.length; i++) {
      p = rotZfn(rotYfn(rotXfn([verts[i][0] * scale, -verts[i][1] * scale, verts[i][2] * scale], rotX), rotY), curZ);
      rv[i] = p; sv[i] = project(p, cx, cy, fov);
      if (Math.abs(p[2]) > zMax) zMax = Math.abs(p[2]);
    }

    // faint lit facet fills (front faces only)
    for (i = 0; i < faces.length; i++) {
      var f = faces[i];
      var A = rv[f[0]], B = rv[f[1]], C = rv[f[2]];
      var cxf = (A[0]+B[0]+C[0])/3, cyf = (A[1]+B[1]+C[1])/3, czf = (A[2]+B[2]+C[2])/3;
      // geometric normal
      var ux=B[0]-A[0], uy=B[1]-A[1], uz=B[2]-A[2];
      var vx=C[0]-A[0], vy=C[1]-A[1], vz=C[2]-A[2];
      var nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx;
      // orient outward: radial for sides, axial for caps
      var rx, ry2, rz;
      if (f[3]) { rx = 0; ry2 = (cyf >= 0 ? 1 : -1); rz = 0; }
      else { rx = cxf; ry2 = 0; rz = czf; }
      if (nx*rx + ny*ry2 + nz*rz < 0) { nx = -nx; ny = -ny; nz = -nz; }
      if (nz > 0) continue; // back-facing (camera at -z)
      var nl = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1;
      var lit = Math.max(0, (nx*LX + ny*LY + nz*LZ) / nl);
      var sA = sv[f[0]], sB = sv[f[1]], sC = sv[f[2]];
      ctx.beginPath();
      ctx.moveTo(sA[0], sA[1]); ctx.lineTo(sB[0], sB[1]); ctx.lineTo(sC[0], sC[1]); ctx.closePath();
      ctx.fillStyle = PAPER.replace("ALPHA", (0.015 + lit * 0.085).toFixed(3));
      ctx.fill();
    }

    // wireframe edges, alpha by depth
    ctx.lineWidth = 1;
    for (i = 0; i < edges.length; i++) {
      var eA = rv[edges[i][0]], eB = rv[edges[i][1]];
      if (eA[2] > zMax * 0.55 && eB[2] > zMax * 0.55) continue; // hide far side
      var near = 1 - ((eA[2] + eB[2]) / 2 + zMax) / (2 * zMax); // 1 = nearest
      var s1 = sv[edges[i][0]], s2 = sv[edges[i][1]];
      ctx.beginPath();
      ctx.moveTo(s1[0], s1[1]); ctx.lineTo(s2[0], s2[1]);
      if (edges[i][2]) ctx.strokeStyle = BRONZE.replace("ALPHA", (0.22 + near * 0.5).toFixed(3));
      else             ctx.strokeStyle = PAPER.replace("ALPHA", (0.06 + near * 0.34).toFixed(3));
      ctx.stroke();
    }

    // vertex glints (near side)
    for (i = 0; i < verts.length; i++) {
      p = rv[i];
      if (p[2] > zMax * 0.2) continue;
      var sp = sv[i];
      var da = Math.max(0.08, 1 - (p[2] + zMax) / (2 * zMax)) * 0.55;
      ctx.beginPath();
      ctx.arc(sp[0], sp[1], 1.0, 0, Math.PI * 2);
      ctx.fillStyle = PAPER.replace("ALPHA", da.toFixed(2));
      ctx.fill();
    }

    // bronze marker at the writing tip (echoes the globe's hub)
    var tp = rv[tipApex], stp = sv[tipApex];
    if (tp[2] <= zMax * 0.6) {
      var pulse = reducedMotion ? 0.5 : (Math.sin(time * 2) * 0.5 + 0.5);
      ctx.beginPath();
      ctx.arc(stp[0], stp[1], 3.5 + pulse * 4.5, 0, Math.PI * 2);
      ctx.strokeStyle = BRONZE.replace("ALPHA", (0.18 + pulse * 0.18).toFixed(2));
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(stp[0], stp[1], 2.4, 0, Math.PI * 2);
      ctx.fillStyle = BRONZE.replace("ALPHA", "1");
      ctx.fill();
    }

    schedule();
  }

  var raf = 0, paused = false;
  function schedule() {
    if (paused) return;
    // under reduced motion stay static unless mid click-transition
    if (reducedMotion && !animating()) return;
    raf = requestAnimationFrame(draw);
  }

  draw();  // first frame

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      var visible = entries[0].isIntersecting;
      if (visible && paused) { paused = false; schedule(); }
      else if (!visible && !paused) { paused = true; cancelAnimationFrame(raf); }
    }, { threshold: 0 }).observe(canvas);
  }

  // click to lay the pencil horizontal (point true-left, slide right) + reveal plan
  function setLaid(v) {
    laid = v;
    stage.classList.toggle("laid", laid);
    schedule();   // kick the loop (needed under reduced motion)
  }
  canvas.addEventListener("click", function () { setLaid(!laid); });
  var closeBtn = stage.querySelector(".svc3-plan-close");
  if (closeBtn) closeBtn.addEventListener("click", function (e) { e.stopPropagation(); setLaid(false); });
})();
