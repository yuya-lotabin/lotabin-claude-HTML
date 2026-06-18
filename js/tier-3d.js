/* ============================================================
   lotabin — Services · 3D tier boxes
   Same projection technique as the pencil (js/pencil-3d.js) and
   the partner globe (js/partner-globe.js): a 2D-canvas projection
   of a low-poly model — paper-white wireframe edges with depth-
   faded alpha, faint lit facet fills, bronze accents on the lid,
   and a pulsing bronze marker on top (echoing the globe's hub).

   One floating "stack of packs" per tier card — the stack grows
   with the cadence (Sprout 1 · Standard 2 · Pro 3 · Enterprise 4).
   Gentle idle spin; tilts toward the cursor on hover; pauses
   off-screen; static under prefers-reduced-motion.
   ============================================================ */
(function () {
  "use strict";

  var cards = Array.prototype.slice.call(
    document.querySelectorAll(".svc3-toc--tiers a")
  );
  if (!cards.length) return;

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- palette (matches tokens.css / the pencil + globe) ----
  var PAPER  = "rgba(246, 244, 239, ALPHA)";   // paper-50
  var BRONZE = "rgba(200, 168, 118, ALPHA)";   // bronze

  // ---- light direction (upper-left, toward camera) — as the pencil ----
  var LX = -0.42, LY = -0.62, LZ = -0.66;

  // slabs per tier, by card order
  var STACK = [1, 2, 3, 4];

  // ---- model: a stack of thin rounded-edge boxes (slabs) ----
  var SLAB_H = 0.34, GAP = 0.17, HW = 1.45, HD = 0.92;

  function buildStack(count) {
    var verts = [], edges = [], faces = [], centers = [];
    var totalH = count * SLAB_H + (count - 1) * GAP;
    var startY = -totalH / 2 + SLAB_H / 2;
    var hh = SLAB_H / 2;
    for (var s = 0; s < count; s++) {
      var cy = startY + s * (SLAB_H + GAP);
      var b = verts.length;
      verts.push([-HW, cy - hh, -HD]); // 0
      verts.push([ HW, cy - hh, -HD]); // 1
      verts.push([ HW, cy + hh, -HD]); // 2
      verts.push([-HW, cy + hh, -HD]); // 3
      verts.push([-HW, cy - hh,  HD]); // 4
      verts.push([ HW, cy - hh,  HD]); // 5
      verts.push([ HW, cy + hh,  HD]); // 6
      verts.push([-HW, cy + hh,  HD]); // 7
      centers.push([0, cy, 0]);
      var top = (s === count - 1) ? 1 : 0;
      // [a,b,bronze]
      // bottom rect
      edges.push([b+0,b+1,0],[b+1,b+5,0],[b+5,b+4,0],[b+4,b+0,0]);
      // top rect — bronze "lid" on the crowning slab
      edges.push([b+3,b+2,top],[b+2,b+6,top],[b+6,b+7,top],[b+7,b+3,top]);
      // verticals
      edges.push([b+0,b+3,0],[b+1,b+2,0],[b+5,b+6,0],[b+4,b+7,0]);
      // faces [v0,v1,v2, slabIndex]
      faces.push(
        [b+0,b+1,b+2,s],[b+0,b+2,b+3,s],   // front -z
        [b+5,b+4,b+7,s],[b+5,b+7,b+6,s],   // back  +z
        [b+4,b+0,b+3,s],[b+4,b+3,b+7,s],   // left  -x
        [b+1,b+5,b+6,s],[b+1,b+6,b+2,s],   // right +x
        [b+3,b+2,b+6,s],[b+3,b+6,b+7,s],   // top   +y
        [b+4,b+5,b+1,s],[b+4,b+1,b+0,s]    // bottom -y
      );
    }
    // crowning top-centre marker vertex (lid centroid)
    var topCy = startY + (count - 1) * (SLAB_H + GAP) + hh;
    var marker = verts.length; verts.push([0, topCy, 0]);
    return {
      verts: verts, edges: edges, faces: faces, centers: centers,
      marker: marker, totalH: totalH
    };
  }

  // ---- 3D helpers (same math as the pencil/globe) ----
  function rotX(p, a){ var c=Math.cos(a), s=Math.sin(a); return [p[0], p[1]*c - p[2]*s, p[1]*s + p[2]*c]; }
  function rotY(p, a){ var c=Math.cos(a), s=Math.sin(a); return [p[0]*c + p[2]*s, p[1], -p[0]*s + p[2]*c]; }
  function project(p, cx, cy, fov){ var sc = fov / (fov + p[2]); return [p[0]*sc + cx, p[1]*sc + cy]; }

  function makeRenderer(card, idx) {
    var canvas = document.createElement("canvas");
    canvas.className = "svc3-tier-gl";
    canvas.setAttribute("aria-hidden", "true");
    card.insertBefore(canvas, card.firstChild);
    var ctx = canvas.getContext("2d");

    var model = buildStack(STACK[idx] || 1);

    var rotYv = 0.5 + idx * 0.4;   // staggered start angle
    var spin = reducedMotion ? 0 : 0.006;
    var time = idx * 1.3;

    // hover state (eased)
    var hover = 0, hoverTarget = 0;
    var tiltX = 0, tiltXTarget = 0;
    var tiltY = 0, tiltYTarget = 0;

    card.addEventListener("pointermove", function (e) {
      var r = card.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width;
      var py = (e.clientY - r.top) / r.height;
      tiltYTarget = (px - 0.5) * 0.9;
      tiltXTarget = -(py - 0.5) * 0.7;
    });
    card.addEventListener("pointerenter", function () { hoverTarget = 1; kick(); });
    card.addEventListener("pointerleave", function () {
      hoverTarget = 0; tiltXTarget = 0; tiltYTarget = 0;
    });

    function frame() {
      var dpr = window.devicePixelRatio || 1;
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (w === 0 || h === 0) return;
      if (canvas.width !== Math.round(w*dpr) || canvas.height !== Math.round(h*dpr)) {
        canvas.width = Math.round(w*dpr); canvas.height = Math.round(h*dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // ease hover/tilt
      hover += (hoverTarget - hover) * 0.12;
      tiltX += (tiltXTarget - tiltX) * 0.12;
      tiltY += (tiltYTarget - tiltY) * 0.12;

      if (!reducedMotion) {
        rotYv += spin + hover * 0.022;
        time += 0.016;
      }

      // framing — float on the right of the card, clear of the text
      var cx = w * (w < 220 ? 0.66 : 0.72);
      var bob = reducedMotion ? 0 : Math.sin(time * 0.9) * (h * 0.018);
      var cy = h * 0.52 + bob;
      var fov = 760;
      var fit = Math.min((h * 0.66) / model.totalH, (w * 0.42) / (2 * HW));
      var scale = fit * (1 + hover * 0.05);

      var baseTiltX = -0.46;
      var rxA = baseTiltX + tiltX;
      var ryA = rotYv + tiltY;

      var rv = new Array(model.verts.length);
      var sv = new Array(model.verts.length);
      var zMax = 0.0001, p, i;
      for (i = 0; i < model.verts.length; i++) {
        var v = model.verts[i];
        p = rotY(rotX([v[0]*scale, -v[1]*scale, v[2]*scale], rxA), ryA);
        rv[i] = p; sv[i] = project(p, cx, cy, fov);
        if (Math.abs(p[2]) > zMax) zMax = Math.abs(p[2]);
      }

      // faint lit facet fills (front faces only)
      for (i = 0; i < model.faces.length; i++) {
        var f = model.faces[i];
        var A = rv[f[0]], B = rv[f[1]], C = rv[f[2]];
        var ux=B[0]-A[0], uy=B[1]-A[1], uz=B[2]-A[2];
        var vx=C[0]-A[0], vy=C[1]-A[1], vz=C[2]-A[2];
        var nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx;
        // orient outward (away from this slab's centre)
        var sc2 = model.centers[f[3]];
        var ctr = rotY(rotX([sc2[0]*scale, -sc2[1]*scale, sc2[2]*scale], rxA), ryA);
        var cxf=(A[0]+B[0]+C[0])/3, cyf=(A[1]+B[1]+C[1])/3, czf=(A[2]+B[2]+C[2])/3;
        if (nx*(cxf-ctr[0]) + ny*(cyf-ctr[1]) + nz*(czf-ctr[2]) < 0) { nx=-nx; ny=-ny; nz=-nz; }
        if (nz > 0) continue; // back-facing (camera at -z)
        var nl = Math.sqrt(nx*nx+ny*ny+nz*nz) || 1;
        var lit = Math.max(0, (nx*LX + ny*LY + nz*LZ) / nl);
        var sA=sv[f[0]], sB=sv[f[1]], sC=sv[f[2]];
        ctx.beginPath();
        ctx.moveTo(sA[0],sA[1]); ctx.lineTo(sB[0],sB[1]); ctx.lineTo(sC[0],sC[1]); ctx.closePath();
        ctx.fillStyle = PAPER.replace("ALPHA", (0.018 + lit * (0.09 + hover*0.05)).toFixed(3));
        ctx.fill();
      }

      // wireframe edges, alpha by depth
      ctx.lineWidth = 1;
      for (i = 0; i < model.edges.length; i++) {
        var e = model.edges[i];
        var eA = rv[e[0]], eB = rv[e[1]];
        if (eA[2] > zMax * 0.55 && eB[2] > zMax * 0.55) continue; // hide far side
        var near = 1 - ((eA[2] + eB[2]) / 2 + zMax) / (2 * zMax);
        var s1 = sv[e[0]], s2 = sv[e[1]];
        ctx.beginPath();
        ctx.moveTo(s1[0],s1[1]); ctx.lineTo(s2[0],s2[1]);
        if (e[2]) ctx.strokeStyle = BRONZE.replace("ALPHA", (0.30 + near * 0.55 + hover*0.1).toFixed(3));
        else      ctx.strokeStyle = PAPER.replace("ALPHA", (0.07 + near * (0.30 + hover*0.12)).toFixed(3));
        ctx.stroke();
      }

      // vertex glints (near side)
      for (i = 0; i < model.verts.length - 1; i++) {
        p = rv[i];
        if (p[2] > zMax * 0.2) continue;
        var sp = sv[i];
        var da = Math.max(0.06, 1 - (p[2] + zMax) / (2 * zMax)) * 0.5;
        ctx.beginPath();
        ctx.arc(sp[0], sp[1], 0.9, 0, Math.PI * 2);
        ctx.fillStyle = PAPER.replace("ALPHA", da.toFixed(2));
        ctx.fill();
      }

      // bronze marker crowning the stack (echoes the globe's hub / pencil tip)
      var mp = rv[model.marker], smp = sv[model.marker];
      if (mp[2] <= zMax * 0.7) {
        var pulse = reducedMotion ? 0.5 : (Math.sin(time * 2) * 0.5 + 0.5);
        ctx.beginPath();
        ctx.arc(smp[0], smp[1], 2.6 + pulse * 3.4, 0, Math.PI * 2);
        ctx.strokeStyle = BRONZE.replace("ALPHA", (0.16 + pulse * 0.16).toFixed(2));
        ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath();
        ctx.arc(smp[0], smp[1], 1.9, 0, Math.PI * 2);
        ctx.fillStyle = BRONZE.replace("ALPHA", "1");
        ctx.fill();
      }
    }

    var settled = false;
    function isAnimating() {
      return !reducedMotion ||
             Math.abs(hoverTarget - hover) > 0.002 ||
             Math.abs(tiltXTarget - tiltX) > 0.002 ||
             Math.abs(tiltYTarget - tiltY) > 0.002;
    }

    return {
      canvas: canvas,
      visible: false,
      tick: function () {
        frame();
        if (reducedMotion && !isAnimating()) { settled = true; }
        else { settled = false; }
      },
      get settled() { return settled; }
    };
  }

  var renderers = cards.map(makeRenderer);

  // ---- single shared loop over visible cards ----
  var raf = 0;
  function loop() {
    raf = 0;
    var run = false;
    for (var i = 0; i < renderers.length; i++) {
      var r = renderers[i];
      if (!r.visible) continue;
      r.tick();
      if (!r.settled) run = true;
    }
    if (run) raf = requestAnimationFrame(loop);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(loop); }

  // start drawing immediately (don't gate the first frame on IO —
  // some environments never fire it); IO below only PAUSES off-screen.
  renderers.forEach(function (r) { r.visible = true; });
  kick();

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        for (var i = 0; i < renderers.length; i++) {
          if (renderers[i].canvas === en.target) {
            renderers[i].visible = en.isIntersecting;
          }
        }
      });
      kick();
    }, { threshold: 0 });
    renderers.forEach(function (r) { io.observe(r.canvas); });
  }

  window.addEventListener("resize", kick);
})();
