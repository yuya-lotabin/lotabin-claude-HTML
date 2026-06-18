/* ============================================================
   lotabin — partner globe
   Rotating low-poly (geodesic) wireframe sphere marking the
   countries lotabin partners are from. Arcs radiate from Nagoya
   (the producer hub).

   EDIT HERE → the list of partner countries:
   ============================================================ */
(function () {
  "use strict";

  // Home base — the producer hub (Japan)
  var HUB = { lat: 35.17, lng: 136.90, label: "Japan" };

  /* Partner origins are read AUTOMATICALLY from the partner cards
     below (.partner-card .p-origin). Cards show CITIES; the globe
     shows the corresponding COUNTRY (deduped — two Brazilian cities
     produce one "Brazil" marker). To support a new city, add it to
     CITY_COUNTRY; to support a new country, add its centroid to
     COUNTRY_COORDS. */
  var COUNTRY_COORDS = {
    "japan": [36.2, 138.25],
    "brazil": [-10.3, -53.2],
    "norway": [61.5, 9.1],
    "south korea": [36.4, 127.9],
    "taiwan": [23.7, 121.0],
    "hong kong": [22.3, 114.2],
    "singapore": [1.35, 103.82],
    "thailand": [15.1, 101.0],
    "philippines": [12.9, 121.8],
    "indonesia": [-2.2, 117.4],
    "vietnam": [16.0, 106.3],
    "malaysia": [4.0, 102.0],
    "india": [22.0, 79.0],
    "china": [35.0, 103.8],
    "australia": [-25.3, 133.8],
    "new zealand": [-41.5, 172.8],
    "united kingdom": [54.0, -2.5],
    "france": [46.6, 2.5],
    "germany": [51.1, 10.4],
    "netherlands": [52.2, 5.5],
    "belgium": [50.6, 4.7],
    "spain": [40.2, -3.6],
    "portugal": [39.6, -8.0],
    "italy": [42.5, 12.5],
    "switzerland": [46.8, 8.2],
    "austria": [47.6, 14.1],
    "sweden": [62.2, 14.8],
    "denmark": [56.0, 9.5],
    "finland": [64.5, 26.0],
    "iceland": [64.9, -18.6],
    "poland": [52.0, 19.4],
    "czechia": [49.8, 15.5],
    "hungary": [47.2, 19.4],
    "greece": [39.3, 22.0],
    "turkey": [39.0, 35.2],
    "ukraine": [49.0, 31.4],
    "ireland": [53.2, -7.7],
    "united states": [39.8, -98.6],
    "canada": [56.1, -106.3],
    "mexico": [23.6, -102.5],
    "argentina": [-35.4, -65.2],
    "chile": [-35.7, -71.5],
    "colombia": [4.6, -74.1],
    "peru": [-9.2, -75.0],
    "uruguay": [-32.5, -55.8],
    "south africa": [-29.0, 25.1],
    "nigeria": [9.1, 8.7],
    "kenya": [0.2, 37.9],
    "egypt": [26.7, 29.9],
    "morocco": [31.8, -7.1],
    "israel": [31.4, 35.0],
    "united arab emirates": [23.9, 54.3],
    "saudi arabia": [24.2, 45.1],
    "qatar": [25.3, 51.2]
  };

  // city (lowercase, diacritics stripped) → country name
  var CITY_COUNTRY = {
    "nagoya": "Japan", "tokyo": "Japan", "osaka": "Japan", "kyoto": "Japan", "fukuoka": "Japan", "sapporo": "Japan",
    "seoul": "South Korea", "busan": "South Korea",
    "taipei": "Taiwan",
    "hong kong": "Hong Kong",
    "singapore": "Singapore",
    "bangkok": "Thailand",
    "manila": "Philippines",
    "jakarta": "Indonesia",
    "ho chi minh city": "Vietnam", "hanoi": "Vietnam",
    "kuala lumpur": "Malaysia",
    "mumbai": "India", "delhi": "India", "bangalore": "India",
    "beijing": "China", "shanghai": "China",
    "sydney": "Australia", "melbourne": "Australia",
    "auckland": "New Zealand",
    "london": "United Kingdom",
    "paris": "France",
    "berlin": "Germany", "munich": "Germany",
    "amsterdam": "Netherlands",
    "brussels": "Belgium",
    "madrid": "Spain", "barcelona": "Spain",
    "lisbon": "Portugal",
    "rome": "Italy", "milan": "Italy",
    "zurich": "Switzerland", "geneva": "Switzerland",
    "vienna": "Austria",
    "stockholm": "Sweden",
    "oslo": "Norway",
    "copenhagen": "Denmark",
    "helsinki": "Finland",
    "reykjavik": "Iceland",
    "warsaw": "Poland",
    "prague": "Czechia",
    "budapest": "Hungary",
    "athens": "Greece",
    "istanbul": "Turkey",
    "kyiv": "Ukraine",
    "dublin": "Ireland",
    "new york": "United States", "los angeles": "United States", "san francisco": "United States",
    "seattle": "United States", "chicago": "United States", "austin": "United States",
    "miami": "United States", "boston": "United States",
    "toronto": "Canada", "vancouver": "Canada", "montreal": "Canada",
    "mexico city": "Mexico",
    "sao paulo": "Brazil", "rio de janeiro": "Brazil", "curitiba": "Brazil",
    "buenos aires": "Argentina",
    "santiago": "Chile",
    "bogota": "Colombia",
    "lima": "Peru",
    "montevideo": "Uruguay",
    "cape town": "South Africa", "johannesburg": "South Africa",
    "lagos": "Nigeria",
    "nairobi": "Kenya",
    "cairo": "Egypt",
    "casablanca": "Morocco",
    "tel aviv": "Israel",
    "dubai": "United Arab Emirates",
    "riyadh": "Saudi Arabia",
    "doha": "Qatar"
  };

  // Build the country list from the partner cards (deduped by country).
  // ALL partner cards are read — every department's cities show on the globe
  // at once, regardless of which department panel is currently selected.
  var PARTNER_COUNTRIES = [];
  function buildPartnerData() {
    PARTNER_COUNTRIES = [];
    var seen = {};
    var nodes = document.querySelectorAll(".partner-card .p-origin");
    for (var i = 0; i < nodes.length; i++) {
      var label = (nodes[i].textContent || "").trim();
      if (!label) continue;
      // normalize: lowercase + strip diacritics (São Paulo → sao paulo)
      var key = label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      // city → country; a country name written directly also works
      var country = CITY_COUNTRY[key] || (COUNTRY_COORDS[key] ? label : null);
      if (!country) {
        console.warn('partner-globe: unknown origin "' + label + '" — add it to CITY_COUNTRY in js/partner-globe.js');
        continue;
      }
      var cKey = country.toLowerCase();
      if (seen[cKey]) continue;
      seen[cKey] = true;
      if (cKey === "japan") continue; // already shown as the hub
      var coords = COUNTRY_COORDS[cKey];
      if (!coords) {
        console.warn('partner-globe: no coordinates for "' + country + '" — add it to COUNTRY_COORDS in js/partner-globe.js');
        continue;
      }
      PARTNER_COUNTRIES.push({ lat: coords[0], lng: coords[1], label: country });
    }
    markers = [Object.assign({ hub: true }, HUB)].concat(PARTNER_COUNTRIES);
    connections = PARTNER_COUNTRIES.map(function (c) {
      return { from: [HUB.lat, HUB.lng], to: [c.lat, c.lng] };
    });
  }

  // ---- palette (matches tokens.css) ----
  var DOT_COLOR    = "rgba(246, 244, 239, ALPHA)";   // paper-50
  var ARC_COLOR    = "rgba(200, 168, 118, 0.35)";    // bronze
  var MARKER_COLOR = "rgba(200, 168, 118, 1)";       // bronze
  var HUB_COLOR    = "rgba(246, 244, 239, 1)";       // paper-50

  var canvas = document.getElementById("partner-globe");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var autoRotateSpeed = reducedMotion ? 0 : 0.0022;

  var markers = [];
  var connections = [];
  buildPartnerData();
  // expose for department switching (team.html)
  window.refreshPartnerGlobe = buildPartnerData;

  // start rotated so Japan faces the camera
  var rotY = 2.0;
  var rotX = 0.28;
  var time = 0;
  var drag = { active: false, sx: 0, sy: 0, ry: 0, rx: 0 };

  // ---- polygonal icosphere (subdivided icosahedron — faceted globe) ----
  var icoVerts = [], icoFaces = [], icoEdges = [];
  (function () {
    function norm(p) {
      var l = Math.sqrt(p[0] * p[0] + p[1] * p[1] + p[2] * p[2]);
      return [p[0] / l, p[1] / l, p[2] / l];
    }
    var t = (1 + Math.sqrt(5)) / 2;
    var base = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t],
                [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]];
    for (var b = 0; b < base.length; b++) icoVerts.push(norm(base[b]));
    icoFaces = [[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],
                [10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],
                [2,4,11],[6,2,10],[8,6,7],[9,8,1]];
    for (var s = 0; s < 3; s++) {
      var cache = {}, next = [];
      var mid = function (a, c) {
        var key = a < c ? a + "_" + c : c + "_" + a;
        if (cache[key] === undefined) {
          icoVerts.push(norm([(icoVerts[a][0] + icoVerts[c][0]) / 2,
                              (icoVerts[a][1] + icoVerts[c][1]) / 2,
                              (icoVerts[a][2] + icoVerts[c][2]) / 2]));
          cache[key] = icoVerts.length - 1;
        }
        return cache[key];
      };
      for (var f = 0; f < icoFaces.length; f++) {
        var fa = icoFaces[f][0], fb = icoFaces[f][1], fc = icoFaces[f][2];
        var ab = mid(fa, fb), bc = mid(fb, fc), ca = mid(fc, fa);
        next.push([fa, ab, ca], [fb, bc, ab], [fc, ca, bc], [ab, bc, ca]);
      }
      icoFaces = next;
    }
    var seenE = {};
    for (var fi = 0; fi < icoFaces.length; fi++) {
      for (var k = 0; k < 3; k++) {
        var ea = icoFaces[fi][k], eb = icoFaces[fi][(k + 1) % 3];
        var ekey = ea < eb ? ea + "_" + eb : eb + "_" + ea;
        if (!seenE[ekey]) { seenE[ekey] = true; icoEdges.push([ea, eb]); }
      }
    }
  })();

  function latLngToXYZ(lat, lng, r) {
    var phi = ((90 - lat) * Math.PI) / 180;
    var theta = ((lng + 180) * Math.PI) / 180;
    return [
      -(r * Math.sin(phi) * Math.cos(theta)),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta),
    ];
  }
  function rotYfn(p, a) {
    var c = Math.cos(a), s = Math.sin(a);
    return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
  }
  function rotXfn(p, a) {
    var c = Math.cos(a), s = Math.sin(a);
    return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c];
  }
  function project(p, cx, cy, fov) {
    var scale = fov / (fov + p[2]);
    return [p[0] * scale + cx, p[1] * scale + cy];
  }

  /* ---- Japan-locked spin ----------------------------------------------
     Until the user drags, the globe keeps Japan pinned at dead-center and
     spins around the axis that points at the camera through Japan (so the
     whole world turns around the hub instead of carrying Japan off-screen).
     Once dragged, it switches to free rotX/rotY rotation. -------------- */
  function mat3mul(a, b) {
    var o = new Array(9);
    for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) {
      o[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
    }
    return o;
  }
  function mat3apply(m, p) {
    return [
      m[0] * p[0] + m[1] * p[1] + m[2] * p[2],
      m[3] * p[0] + m[4] * p[1] + m[5] * p[2],
      m[6] * p[0] + m[7] * p[1] + m[8] * p[2]
    ];
  }
  function rotZmat(a) {
    var c = Math.cos(a), s = Math.sin(a);
    return [c, -s, 0, s, c, 0, 0, 0, 1];
  }
  function rotYmat(a) {
    var c = Math.cos(a), s = Math.sin(a);
    return [c, 0, s, 0, 1, 0, -s, 0, c];
  }
  function rotXmat(a) {
    var c = Math.cos(a), s = Math.sin(a);
    return [1, 0, 0, 0, c, -s, 0, s, c];
  }
  // rotation mapping unit vector a -> unit vector b (Rodrigues)
  function rotAtoB(a, b) {
    var vx = a[1] * b[2] - a[2] * b[1],
        vy = a[2] * b[0] - a[0] * b[2],
        vz = a[0] * b[1] - a[1] * b[0];
    var c = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    if (1 + c < 1e-9) return [-1, 0, 0, 0, 1, 0, 0, 0, -1]; // opposite
    var V = [0, -vz, vy, vz, 0, -vx, -vy, vx, 0];
    var V2 = mat3mul(V, V);
    var k = 1 / (1 + c);
    var R = new Array(9);
    for (var i = 0; i < 9; i++) R[i] = (i % 4 === 0 ? 1 : 0) + V[i] + V2[i] * k;
    return R;
  }
  // base orientation: bring Japan to the camera-facing center (front = -z)
  var jHat = latLngToXYZ(HUB.lat, HUB.lng, 1);
  var baseM = rotAtoB(jHat, [0, 0, -1]);
  var rollZ = 0;
  var interacted = false; // true once the user drags
  var curM = null;        // per-frame matrix when Japan-locked; null when free
  function applyRot(p) {
    if (curM) return mat3apply(curM, p);
    return rotYfn(rotXfn(p, rotX), rotY);
  }

  function draw() {
    var dpr = window.devicePixelRatio || 1;
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (w === 0 || h === 0) { schedule(); return; }
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var cx = w / 2, cy = h / 2;
    var radius = Math.min(w, h) * 0.40;
    var fov = 600;

    if (!reducedMotion) time += 0.015;
    // Japan-locked spin until the user interacts; afterwards curM is driven
    // by the drag handlers and held between frames.
    if (!interacted) {
      rollZ += autoRotateSpeed;
      curM = mat3mul(rotZmat(rollZ), baseM);
    }

    ctx.clearRect(0, 0, w, h);

    var i, p, sp;

    // faceted polygon sphere: transform all vertices once per frame
    var rv = new Array(icoVerts.length), sv = new Array(icoVerts.length);
    for (i = 0; i < icoVerts.length; i++) {
      p = applyRot([icoVerts[i][0] * radius, icoVerts[i][1] * radius, icoVerts[i][2] * radius]);
      rv[i] = p;
      sv[i] = project(p, cx, cy, fov);
    }

    // subtle facet shading (front faces only, lit from upper-left)
    for (i = 0; i < icoFaces.length; i++) {
      var fA = rv[icoFaces[i][0]], fB = rv[icoFaces[i][1]], fC = rv[icoFaces[i][2]];
      if (fA[2] > 0 && fB[2] > 0 && fC[2] > 0) continue;
      var ux = fB[0] - fA[0], uy = fB[1] - fA[1], uz = fB[2] - fA[2];
      var vx = fC[0] - fA[0], vy = fC[1] - fA[1], vz = fC[2] - fA[2];
      var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      if (nz > 0) continue; // back-facing
      var nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      var lit = Math.max(0, (nx * -0.42 + ny * -0.55 + nz * -0.72) / nl);
      var sA = sv[icoFaces[i][0]], sB = sv[icoFaces[i][1]], sC = sv[icoFaces[i][2]];
      ctx.beginPath();
      ctx.moveTo(sA[0], sA[1]);
      ctx.lineTo(sB[0], sB[1]);
      ctx.lineTo(sC[0], sC[1]);
      ctx.closePath();
      ctx.fillStyle = DOT_COLOR.replace("ALPHA", (0.012 + lit * 0.07).toFixed(3));
      ctx.fill();
    }

    // wireframe edges, alpha by depth
    ctx.lineWidth = 1;
    for (i = 0; i < icoEdges.length; i++) {
      var eA = rv[icoEdges[i][0]], eB = rv[icoEdges[i][1]];
      if (eA[2] > 0 && eB[2] > 0) continue;
      var depth = 1 - ((eA[2] + eB[2]) / 2 + radius) / (2 * radius);
      var sE1 = sv[icoEdges[i][0]], sE2 = sv[icoEdges[i][1]];
      ctx.beginPath();
      ctx.moveTo(sE1[0], sE1[1]);
      ctx.lineTo(sE2[0], sE2[1]);
      ctx.strokeStyle = DOT_COLOR.replace("ALPHA", (0.04 + depth * 0.13).toFixed(3));
      ctx.stroke();
    }

    // vertex glints
    for (i = 0; i < icoVerts.length; i++) {
      p = rv[i];
      if (p[2] > 0) continue;
      sp = sv[i];
      var depthAlpha = Math.max(0.08, 1 - (p[2] + radius) / (2 * radius)) * 0.5;
      ctx.beginPath();
      ctx.arc(sp[0], sp[1], 0.9, 0, Math.PI * 2);
      ctx.fillStyle = DOT_COLOR.replace("ALPHA", depthAlpha.toFixed(2));
      ctx.fill();
    }

    // arcs hub → partner countries
    for (i = 0; i < connections.length; i++) {
      var conn = connections[i];
      var p1 = latLngToXYZ(conn.from[0], conn.from[1], radius);
      var p2 = latLngToXYZ(conn.to[0], conn.to[1], radius);
      p1 = applyRot(p1);
      p2 = applyRot(p2);
      if (p1[2] > radius * 0.3 && p2[2] > radius * 0.3) continue;

      var s1 = project(p1, cx, cy, fov);
      var s2 = project(p2, cx, cy, fov);

      var mx = (p1[0] + p2[0]) / 2, my = (p1[1] + p2[1]) / 2, mz = (p1[2] + p2[2]) / 2;
      var ml = Math.sqrt(mx * mx + my * my + mz * mz) || 1;
      var ah = radius * 1.22;
      var sc = project([(mx / ml) * ah, (my / ml) * ah, (mz / ml) * ah], cx, cy, fov);

      ctx.beginPath();
      ctx.moveTo(s1[0], s1[1]);
      ctx.quadraticCurveTo(sc[0], sc[1], s2[0], s2[1]);
      ctx.strokeStyle = ARC_COLOR;
      ctx.lineWidth = 1;
      ctx.stroke();

      // traveling spark along arc
      if (!reducedMotion) {
        var t = (Math.sin(time * 1.1 + conn.to[0] * 0.13) + 1) / 2;
        var tx = (1 - t) * (1 - t) * s1[0] + 2 * (1 - t) * t * sc[0] + t * t * s2[0];
        var ty = (1 - t) * (1 - t) * s1[1] + 2 * (1 - t) * t * sc[1] + t * t * s2[1];
        ctx.beginPath();
        ctx.arc(tx, ty, 1.6, 0, Math.PI * 2);
        ctx.fillStyle = MARKER_COLOR;
        ctx.fill();
      }
    }

    // country markers
    for (i = 0; i < markers.length; i++) {
      var m = markers[i];
      p = latLngToXYZ(m.lat, m.lng, radius);
      p = applyRot(p);
      if (p[2] > radius * 0.1) continue;

      sp = project(p, cx, cy, fov);
      var col = m.hub ? HUB_COLOR : MARKER_COLOR;

      // pulse ring
      var pulse = reducedMotion ? 0.5 : Math.sin(time * 2 + m.lat) * 0.5 + 0.5;
      ctx.beginPath();
      ctx.arc(sp[0], sp[1], 3.5 + pulse * 3.5, 0, Math.PI * 2);
      ctx.strokeStyle = col.replace("1)", (0.18 + pulse * 0.15).toFixed(2) + ")");
      ctx.lineWidth = 1;
      ctx.stroke();

      // core dot
      ctx.beginPath();
      ctx.arc(sp[0], sp[1], 2.2, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.fill();

      // label
      if (m.label) {
        ctx.font = "500 9px 'JetBrains Mono', monospace";
        ctx.fillStyle = col.replace("1)", "0.75)");
        var txt = m.label.toUpperCase();
        // letter-spacing by hand (canvas has none cross-browser)
        var x = sp[0] + 8, yLbl = sp[1] + 3;
        for (var k = 0; k < txt.length; k++) {
          ctx.fillText(txt[k], x, yLbl);
          x += ctx.measureText(txt[k]).width + 1.6;
        }
      }
    }

    schedule();
  }

  var raf = 0;
  var paused = false;
  function schedule() {
    if (paused) return;
    raf = requestAnimationFrame(draw);
  }

  // start immediately; IO (if it fires) only pauses when off-screen
  schedule();
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      var visible = entries[0].isIntersecting;
      if (visible && paused) {
        paused = false;
        schedule();
      } else if (!visible && !paused) {
        paused = true;
        cancelAnimationFrame(raf);
      }
    }, { threshold: 0 }).observe(canvas);
  }

  // drag to spin (free rotation, starting from wherever the Japan-locked
  // spin currently is — no snap)
  canvas.addEventListener("pointerdown", function (e) {
    interacted = true;
    drag = { active: true, sx: e.clientX, sy: e.clientY, baseM: curM };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", function (e) {
    if (!drag.active) return;
    var yaw = (e.clientX - drag.sx) * 0.005;
    var pitch = Math.max(-1.4, Math.min(1.4, (e.clientY - drag.sy) * 0.005));
    // screen-space yaw/pitch applied on top of the orientation at grab time
    curM = mat3mul(rotYmat(yaw), mat3mul(rotXmat(pitch), drag.baseM));
  });
  canvas.addEventListener("pointerup", function () { drag.active = false; });
  canvas.addEventListener("pointercancel", function () { drag.active = false; });
})();
