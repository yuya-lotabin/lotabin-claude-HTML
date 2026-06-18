/* ============================================================
   lotabin — Services · "The Case" F1 pit stop (three.js)
   A low-poly wireframe pit lane: the car hits its marks, jacks
   lift it, all four crews run the wheel guns and swap tyres, the
   car drops and the lollipop releases — choreographed to scroll.

   Rendered in the site's wireframe language (paper-white depth-
   faded edges + faint faces, bronze accents, exponential fog to the
   page color). Progress is read from #coFill (driven by
   js/case-orbit.js) — same wiring as before. Pauses off-screen;
   one static frame under prefers-reduced-motion; CSS fallback (the
   stacked reasons) remains without WebGL/Three.js.
   ============================================================ */
(function () {
  var canvas = document.getElementById('stairCanvas');
  if (!canvas || typeof THREE === 'undefined') return;

  var pin     = document.getElementById('coPin');
  var section = document.getElementById('caseStair');
  var fillEl  = document.getElementById('coFill');
  var pitVideo = document.getElementById('pitVideo');
  if (!pin) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'low-power', preserveDrawingBuffer: true });
  } catch (e) { canvas.remove(); return; }
  renderer.setClearColor(0x000000, 0);

  var INK    = 0x0d0d11;   // page bg → fog target (seamless)
  var PAPER  = 0xf6f4ef;
  var BRONZE = 0xc8a876;

  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(INK, 0.030);
  var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 300);

  /* ---------------- shared materials ---------------- */
  var paperEdge  = new THREE.LineBasicMaterial({ color: PAPER,  transparent: true, opacity: 0.52 });
  var paperDim   = new THREE.LineBasicMaterial({ color: PAPER,  transparent: true, opacity: 0.30 });
  var bronzeEdge = new THREE.LineBasicMaterial({ color: BRONZE, transparent: true, opacity: 0.9 });
  var bronzeMat  = new THREE.MeshBasicMaterial({ color: BRONZE, transparent: true, opacity: 0.55 });
  function faceMat(op) { return new THREE.MeshBasicMaterial({ color: PAPER, transparent: true, opacity: op, side: THREE.DoubleSide, depthWrite: false }); }
  var bodyFace = faceMat(0.05);
  var darkFace = new THREE.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });

  function wireBox(w, h, d, opts) {
    opts = opts || {};
    var g = new THREE.Group();
    var box = new THREE.BoxGeometry(w, h, d);
    if (opts.face !== false) g.add(new THREE.Mesh(box, opts.dark ? darkFace : bodyFace));
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(box), opts.bronze ? bronzeEdge : (opts.dim ? paperDim : paperEdge)));
    return g;
  }
  function lineSeg(ax, ay, az, bx, by, bz, mat) {
    var geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(ax, ay, az), new THREE.Vector3(bx, by, bz)]);
    return new THREE.LineSegments(geo, mat || paperEdge);
  }
  // merge many segment pairs into ONE LineSegments (keeps detail cheap)
  function lineSet(segs, mat) {
    var pts = [];
    for (var i = 0; i < segs.length; i++) {
      var s = segs[i];
      pts.push(new THREE.Vector3(s[0], s[1], s[2]), new THREE.Vector3(s[3], s[4], s[5]));
    }
    return new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), mat || paperEdge);
  }

  /* ================= GROUND ================= */
  var grid = new THREE.GridHelper(60, 60, BRONZE, PAPER);
  grid.material.transparent = true;
  grid.material.opacity = 0.12;
  scene.add(grid);
  // pit box outline where the car stops
  (function () {
    var pts = [[3.4, 0.01, 1.7], [-3.4, 0.01, 1.7], [-3.4, 0.01, -1.7], [3.4, 0.01, -1.7], [3.4, 0.01, 1.7]];
    var v = pts.map(function (p) { return new THREE.Vector3(p[0], p[1], p[2]); });
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(v), bronzeEdge));
  })();
  // pit lane guide line
  scene.add(lineSeg(-30, 0.01, 2.6, 30, 0.01, 2.6, paperDim));

  /* ================= CAR ================= */
  var car = new THREE.Group();
  scene.add(car);
  var BODY_Y = 0.62;

  // floor pan
  var pan = wireBox(6.2, 0.12, 1.5, { dim: true, faceOpacity: 0.04 }); pan.position.set(-0.1, 0.30, 0); car.add(pan);
  // monocoque / chassis
  var chassis = wireBox(4.6, 0.5, 0.86); chassis.position.set(-0.2, BODY_Y, 0); car.add(chassis);
  // sidepods
  var sp1 = wireBox(2.1, 0.5, 0.5, { faceOpacity: 0.04 }); sp1.position.set(-0.7, 0.6, 0.74); car.add(sp1);
  var sp2 = wireBox(2.1, 0.5, 0.5, { faceOpacity: 0.04 }); sp2.position.set(-0.7, 0.6, -0.74); car.add(sp2);
  // engine cover / airbox tapering to the rear
  var cover = wireBox(2.2, 0.55, 0.62); cover.position.set(-1.5, 0.98, 0); car.add(cover);
  car.add(lineSeg(-0.4, 1.25, 0, -1.0, 1.05, 0, paperEdge)); // airbox scoop ridge
  // nose cone
  var nose = wireBox(1.9, 0.34, 0.46); nose.position.set(2.55, 0.55, 0); car.add(nose);
  car.add(lineSeg(3.5, 0.55, 0, 4.05, 0.30, 0.0, paperEdge));
  // front wing (bronze)
  var fWing = wireBox(0.55, 0.07, 2.3, { bronze: true, faceOpacity: 0.05 }); fWing.position.set(3.95, 0.20, 0); car.add(fWing);
  car.add(lineSeg(3.95, 0.20, 1.15, 3.95, 0.55, 0.55, bronzeEdge));
  car.add(lineSeg(3.95, 0.20, -1.15, 3.95, 0.55, -0.55, bronzeEdge));
  // rear wing (bronze) on struts
  var rWing = wireBox(0.7, 0.08, 2.0, { bronze: true, faceOpacity: 0.05 }); rWing.position.set(-2.95, 1.5, 0); car.add(rWing);
  car.add(lineSeg(-2.95, 0.8, 0.5, -2.95, 1.46, 0.5, paperEdge));
  car.add(lineSeg(-2.95, 0.8, -0.5, -2.95, 1.46, -0.5, paperEdge));
  // halo + driver head
  var halo = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.045, 8, 20, Math.PI), bronzeMat);
  halo.rotation.x = Math.PI / 2; halo.rotation.z = Math.PI / 2; halo.position.set(0.55, 1.18, 0); car.add(halo);
  var head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), faceMat(0.08));
  head.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.SphereGeometry(0.18, 8, 6)), paperDim));
  head.position.set(0.35, 1.12, 0); car.add(head);

  /* ---- wheels (4 corners) ---- */
  function makeWheel() {
    var orient = new THREE.Group();        // fixed orientation: axle along Z
    var spin = new THREE.Group();          // spins around the axle
    var cyl = new THREE.CylinderGeometry(0.62, 0.62, 0.5, 20, 1, true);
    spin.add(new THREE.Mesh(cyl, darkFace));
    spin.add(new THREE.LineSegments(new THREE.EdgesGeometry(cyl), paperEdge));
    // rim + spokes
    var rim = new THREE.Mesh(new THREE.TorusGeometry(0.30, 0.03, 6, 16), bronzeMat);
    rim.position.y = 0.26; rim.rotation.x = Math.PI / 2; spin.add(rim);
    // brake disc + hub cap inside the rim
    var disc = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.012, 6, 18), bronzeMat);
    disc.position.y = 0.26; disc.rotation.x = Math.PI / 2; spin.add(disc);
    var hubcap = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 6, 12), bronzeMat);
    hubcap.position.y = 0.26; hubcap.rotation.x = Math.PI / 2; spin.add(hubcap);
    for (var s = 0; s < 5; s++) {
      var a = s * Math.PI * 2 / 5;
      spin.add(lineSeg(0, 0.26, 0, 0.55 * Math.cos(a), 0.26, 0.55 * Math.sin(a), paperDim));
    }
    orient.add(spin);
    orient.rotation.x = Math.PI / 2;       // lay the cylinder so the axle runs along Z
    orient.userData.spin = spin;
    return orient;
  }
  var wheelDefs = [
    { x: 2.35, z: 1.02 }, { x: 2.35, z: -1.02 },
    { x: -2.05, z: 1.02 }, { x: -2.05, z: -1.02 }
  ];
  var wheels = wheelDefs.map(function (d) {
    var hub = new THREE.Group();
    hub.position.set(d.x, 0.62, d.z);
    var w = makeWheel();
    hub.add(w);
    car.add(hub);
    return { hub: hub, spin: w.userData.spin, baseZ: d.z, side: d.z >= 0 ? 1 : -1, x: d.x };
  });

  /* ============================================================
     REFINED DETAIL — extra wireframe so the car reads as a real
     F1 machine. Every static car-fixed line is merged into THREE
     LineSegments (one per material), so all this polish costs a
     handful of draw calls, not hundreds. *s helpers mirror z.
     ============================================================ */
  (function detailing() {
    var paper = [], dim = [], brz = [];
    function P(ax, ay, az, bx, by, bz) { paper.push([ax, ay, az, bx, by, bz]); }
    function B(ax, ay, az, bx, by, bz) { brz.push([ax, ay, az, bx, by, bz]); }
    function Ps(ax, ay, az, bx, by, bz) { P(ax, ay, az, bx, by, bz); P(ax, ay, -az, bx, by, -bz); }
    function Ds(ax, ay, az, bx, by, bz) { dim.push([ax, ay, az, bx, by, bz]); dim.push([ax, ay, -az, bx, by, -bz]); }
    function Bs(ax, ay, az, bx, by, bz) { B(ax, ay, az, bx, by, bz); B(ax, ay, -az, bx, by, -bz); }

    /* suspension — wishbones + pushrod + (front) track rod, both axles */
    function axle(hx, steer) {
      var uoY = 0.84, loY = 0.44, oz = 0.92;
      Ds(hx, uoY, oz, hx - 0.55, 0.86, 0.30);            // upper wishbone V
      Ds(hx, uoY, oz, hx + 0.55, 0.86, 0.30);
      Ds(hx, loY, oz, hx - 0.55, 0.40, 0.24);            // lower wishbone V
      Ds(hx, loY, oz, hx + 0.55, 0.40, 0.24);
      Ds(hx, loY, oz, hx, uoY, oz);                      // upright
      Ds(hx, loY + 0.02, oz - 0.04, hx - 0.40, 0.92, 0.22); // pushrod
      if (steer) Ds(hx, 0.62, oz - 0.04, hx - 0.50, 0.62, 0.22); // track rod
    }
    axle(2.35, true);
    axle(-2.05, false);

    /* front wing — two flap elements, profile ribs, endplates, nose pylons */
    B(3.78, 0.27, -1.06, 3.78, 0.27, 1.06);
    B(3.64, 0.36, -1.06, 3.64, 0.36, 1.06);
    [0.35, 0.75, 1.02].forEach(function (z) { Bs(4.20, 0.16, z, 3.60, 0.37, z); });
    [1.08, -1.08].forEach(function (z) {
      B(4.25, 0.12, z, 3.55, 0.12, z);
      B(3.55, 0.12, z, 3.55, 0.58, z);
      B(3.55, 0.58, z, 4.25, 0.42, z);
      B(4.25, 0.42, z, 4.25, 0.12, z);
    });
    Bs(3.95, 0.30, 0.18, 3.20, 0.46, 0.12);              // nose pylons

    /* nose — taper the cone to a sharp tip */
    var tipX = 4.18;
    P(3.50, 0.72, 0, tipX, 0.50, 0);
    Ps(3.50, 0.55, 0.23, tipX, 0.50, 0.0);
    Ps(3.50, 0.39, 0.23, tipX, 0.50, 0.0);

    /* rear wing — top flap, endplates, beam wing */
    B(-3.05, 1.66, -1.0, -3.05, 1.66, 1.0);
    Bs(-2.75, 1.54, 1.0, -3.25, 1.66, 1.0);
    Bs(-2.75, 1.54, 0.4, -3.25, 1.66, 0.4);
    [1.0, -1.0].forEach(function (z) {
      B(-2.60, 1.15, z, -3.35, 1.15, z);
      B(-3.35, 1.15, z, -3.35, 1.72, z);
      B(-3.35, 1.72, z, -2.60, 1.66, z);
      B(-2.60, 1.66, z, -2.60, 1.15, z);
    });
    B(-3.00, 0.92, -0.7, -3.00, 0.92, 0.7);              // beam wing
    Bs(-2.80, 0.95, 0.7, -3.20, 0.90, 0.7);

    /* shark-fin engine cover (cover → rear wing, on the z=0 plane) */
    P(-0.55, 1.26, 0, -2.70, 1.50, 0);
    P(-2.70, 1.50, 0, -2.70, 1.02, 0);
    P(-2.70, 1.02, 0, -1.50, 1.04, 0);
    P(-1.50, 1.04, 0, -0.55, 1.26, 0);

    /* airbox intake + T-camera */
    Ps(-0.45, 1.28, 0.16, -0.62, 1.00, 0.0);
    P(-0.45, 1.28, 0.16, -0.45, 1.28, -0.16);
    P(-0.50, 1.28, 0, -0.50, 1.44, 0);

    /* halo Y-strut + cockpit rim */
    P(1.02, 1.16, 0, 1.35, 0.92, 0);
    P(0.95, 0.93, 0.30, 0.15, 0.93, 0.30);
    P(0.15, 0.93, 0.30, 0.15, 0.93, -0.30);
    P(0.15, 0.93, -0.30, 0.95, 0.93, -0.30);
    Ps(0.95, 0.93, 0.30, 1.05, 0.98, 0);

    /* wing mirrors */
    Ps(0.70, 0.95, 0.30, 0.95, 1.00, 0.62);
    Ps(0.85, 1.00, 0.66, 1.05, 1.00, 0.66);
    Ps(0.95, 0.95, 0.60, 0.95, 1.06, 0.60);

    car.add(lineSet(paper, paperEdge));
    car.add(lineSet(dim, paperDim));
    car.add(lineSet(brz, bronzeEdge));

    // faint shark-fin face (single 2-triangle mesh)
    var finGeo = new THREE.BufferGeometry();
    finGeo.setAttribute('position', new THREE.Float32BufferAttribute([
      -0.55, 1.26, 0, -2.70, 1.50, 0, -2.70, 1.02, 0,
      -0.55, 1.26, 0, -2.70, 1.02, 0, -1.50, 1.04, 0
    ], 3));
    car.add(new THREE.Mesh(finGeo, faceMat(0.05)));
  })();

  /* ---- jacks (front & rear) ---- */
  // a low pit jack: a short vertical lift post at the car, and a long lever
  // running OUT along the lane to the operator who hauls on it (reach = +X).
  function makeJack(reach) {
    var g = new THREE.Group();
    var post = new THREE.Group();
    post.add(lineSeg(0, 0, 0, 0, 0.5, 0, bronzeEdge));                  // lift post (scaled for the lift)
    post.add(lineSeg(-0.2, 0.02, 0.16, 0.2, 0.02, -0.16, bronzeEdge));  // foot pad
    g.add(post);
    g.add(lineSeg(0, 0.46, 0, reach, 0.1, 0, bronzeEdge));             // long lever
    g.add(lineSeg(reach, 0.1, 0, reach + (reach > 0 ? 0.28 : -0.28), 0.0, 0, bronzeEdge)); // grip
    g.userData.post = post;
    return g;
  }
  var frontJack = makeJack(0.85); frontJack.position.set(4.35, 0, 0); car.add(frontJack);   // nose (screen-left)
  var rearJack  = makeJack(-0.9); rearJack.position.set(-3.4, 0, 0);  car.add(rearJack);    // tail (screen-right)

  /* ================= CREW ================= */
  var crew = [];
  function makeCrew(opts) {
    opts = opts || {};
    var g = new THREE.Group();
    // legs (crouch) — two angled shins to the ground
    g.add(lineSeg(-0.13, 0, 0.10, -0.13, 0.42, -0.02, paperEdge));
    g.add(lineSeg(0.13, 0, 0.10, 0.13, 0.42, -0.02, paperEdge));
    var hips = wireBox(0.42, 0.22, 0.30, { faceOpacity: 0.05 }); hips.position.y = 0.5; g.add(hips);
    // torso pivot (leans forward)
    var torsoPivot = new THREE.Group(); torsoPivot.position.y = 0.6; g.add(torsoPivot);
    var torso = wireBox(0.4, 0.6, 0.3, { faceOpacity: 0.05 }); torso.position.y = 0.3; torsoPivot.add(torso);
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), faceMat(0.07));
    head.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.SphereGeometry(0.16, 7, 5)), paperDim));
    head.position.y = 0.74; torsoPivot.add(head);
    // helmet bronze band
    var band = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.018, 6, 14), bronzeMat);
    band.rotation.x = Math.PI / 2; band.position.y = 0.76; torsoPivot.add(band);
    // arms reaching forward + wheel gun
    var gunPivot = new THREE.Group(); gunPivot.position.set(0, 0.34, 0.22); torsoPivot.add(gunPivot);
    torsoPivot.add(lineSeg(-0.18, 0.5, 0.0, -0.02, 0.36, 0.30, paperEdge));
    torsoPivot.add(lineSeg(0.18, 0.5, 0.0, 0.02, 0.36, 0.30, paperEdge));
    if (opts.gun !== false) {
      var gun = wireBox(0.16, 0.16, 0.5, { bronze: true, faceOpacity: 0.12 }); gun.position.z = 0.2; gunPivot.add(gun);
    }
    if (opts.lollipop) {
      var pole = lineSeg(0, 0, 0, 0, 2.4, 0, bronzeEdge); torsoPivot.add(pole);
      var sign = wireBox(0.7, 0.5, 0.04, { bronze: true, faceOpacity: 0.1 });
      var signPivot = new THREE.Group(); signPivot.position.set(0, 2.4, 0); sign.position.y = 0.3; signPivot.add(sign);
      torsoPivot.add(signPivot);
      g.userData.signPivot = signPivot;
    }
    g.position.set(opts.x || 0, 0, opts.z || 0);
    g.rotation.y = opts.face || 0;
    g.userData.kind = opts.kind;
    g.userData.torsoPivot = torsoPivot;
    g.userData.gunPivot = gunPivot;
    g.userData.baseX = opts.x || 0;
    g.userData.outX = (opts.x || 0) + (opts.stepOut || 0);
    scene.add(g);
    return g;
  }
  // four wheel crews — one knelt outboard of each corner, facing the car
  crew.push(makeCrew({ x: 2.35,  z: 2.2,  face: Math.PI, kind: 'wheel' }));  // front-left
  crew.push(makeCrew({ x: 2.35,  z: -2.2, face: 0,       kind: 'wheel' }));  // front-right
  crew.push(makeCrew({ x: -2.05, z: 2.2,  face: Math.PI, kind: 'wheel' }));  // rear-left
  crew.push(makeCrew({ x: -2.05, z: -2.2, face: 0,       kind: 'wheel' }));  // rear-right
  // jack operators on the lane centre line — front (nose) & rear (tail)
  var frontMan = makeCrew({ x: 5.3, z: 0, face: -Math.PI / 2, gun: false, stepOut: 0.8 }); frontMan.userData.kind = 'jack';
  var rearMan  = makeCrew({ x: -4.2, z: 0, face: Math.PI / 2, gun: false, stepOut: -0.8 }); rearMan.userData.kind = 'jack';
  crew.push(frontMan); crew.push(rearMan);

  // spare / swapped tyres lying flat beside each corner (signature pit clutter)
  function spareTyre(x, z) {
    var g = new THREE.Group();
    var cyl = new THREE.CylinderGeometry(0.6, 0.6, 0.4, 18);
    g.add(new THREE.Mesh(cyl, darkFace));
    g.add(new THREE.LineSegments(new THREE.EdgesGeometry(cyl), paperDim));
    var rim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.028, 6, 16), bronzeMat);
    rim.position.y = 0.22; rim.rotation.x = Math.PI / 2; g.add(rim);
    g.position.set(x, 0.2, z);
    scene.add(g);
    return g;
  }
  spareTyre(2.6, 3.05); spareTyre(2.6, -3.05);
  spareTyre(-1.7, 3.05); spareTyre(-1.7, -3.05);

  /* ================= SIZING ================= */
  var sizedW = 0, sizedH = 0;
  function resize() {
    var w = pin.clientWidth || 0, h = pin.clientHeight || 0;
    if (w < 2 || h < 2) return false;
    if (w === sizedW && h === sizedH) return false;
    sizedW = w; sizedH = h;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    return true;
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('load', resize, { passive: true });
  if ('ResizeObserver' in window) {
    new ResizeObserver(function () { if (resize() && reduced) renderer.render(scene, camera); }).observe(pin);
  }

  /* ================= PROGRESS ================= */
  function readProgress() {
    if (!fillEl || !fillEl.style.width) return 0;
    var v = parseFloat(fillEl.style.width);
    return isNaN(v) ? 0 : Math.min(1, Math.max(0, v / 100));
  }
  function clamp(n) { return Math.min(1, Math.max(0, n)); }
  function mix(a, b, t) { return a + (b - a) * t; }
  function smooth(a, b, p) { if (p <= a) return 0; if (p >= b) return 1; var t = (p - a) / (b - a); return t * t * (3 - 2 * t); }

  // hand off the wireframe scene to the real pit footage, in the same frame
  var videoOn = false;        // footage requested by scroll position
  var videoCovering = false;  // footage has fully faded in → safe to pause the 3D render
  var coverTimer = 0;
  var FADE_MS = 700;          // matches the .co-video CSS opacity transition
  function setVideo(on) {
    if (!pitVideo || on === videoOn) return;
    videoOn = on;
    clearTimeout(coverTimer);
    if (on) {
      pitVideo.style.opacity = '1';
      var p = pitVideo.play();
      if (p && p.catch) p.catch(function () {});
      // keep cross-fading the live scene under the video, THEN stop rendering it
      coverTimer = setTimeout(function () { if (videoOn) videoCovering = true; }, FADE_MS);
    } else {
      videoCovering = false;   // scene is visible again → resume rendering immediately
      pitVideo.style.opacity = '0';
      pitVideo.pause();
      try { pitVideo.currentTime = 0; } catch (e) {}   // reset so it replays from the start on re-entry
    }
  }

  /* ================= ANIMATION ================= */
  var _tgt = new THREE.Vector3(1.3, 0.9, 0);
  function animate(e, t) {
    // --- car arrive / leave along the lane ---
    var entry = smooth(0.0, 0.10, e);
    var exit  = smooth(0.90, 1.0, e);
    var carX = mix(-16, 0, entry);
    carX = mix(carX, 22, exit);
    car.position.x = carX;

    // --- jacked up for the stop, then the FRONT is set down (nose leads) ---
    var lift      = smooth(0.15, 0.30, e);              // car up off its marks for the stop
    var frontDown = smooth(0.66, 0.80, e);              // front jack released → nose lowered to the ground
    var rearDown  = smooth(0.74, 0.86, e);              // rear follows a beat later
    car.position.y = lift * (1 - frontDown) * 0.26;     // settle down as the front comes down
    car.rotation.z = -0.05 * (frontDown * (1 - frontDown) * 4); // brief nose-down lead, then flat
    frontJack.userData.post.scale.y = mix(0.35, 1, lift * (1 - frontDown));   // front jack collapses first
    rearJack.userData.post.scale.y  = mix(0.35, 1, lift * (1 - rearDown));    // rear jack follows


    // --- wheel swap: off then a fresh set on, guns spinning ---
    var off = smooth(0.32, 0.44, e) * (1 - smooth(0.56, 0.68, e));
    var gunHot = smooth(0.30, 0.40, e) * (1 - smooth(0.60, 0.70, e));
    for (var i = 0; i < wheels.length; i++) {
      var wdef = wheels[i];
      wdef.hub.position.z = wdef.baseZ + wdef.side * off * 1.25;
      wdef.hub.position.y = 0.62 + off * 0.04;
      wdef.spin.rotation.y += (0.05 + gunHot * 0.5);   // tyre off the hub spins down
    }

    // --- crew choreography ---
    var lean = smooth(0.16, 0.30, e) * (1 - smooth(0.70, 0.82, e));
    var step = exit;            // step clear as the car leaves
    for (var c = 0; c < crew.length; c++) {
      var m = crew[c], ud = m.userData;
      ud.torsoPivot.rotation.x = mix(0.05, -0.62, lean);
      m.position.x = mix(ud.baseX, ud.outX, step);
      if (ud.kind === 'wheel' && ud.gunPivot) {
        ud.gunPivot.rotation.z += gunHot * 0.6;        // wheel-gun barrel spin
        ud.gunPivot.position.z = mix(0.22, 0.40, off); // reach to the hub during the swap
      }
      if (ud.kind === 'lolli' && ud.signPivot) {
        var release = smooth(0.80, 0.92, e);
        ud.signPivot.rotation.x = mix(0, -1.5, release); // lollipop lifts → GO
        ud.torsoPivot.rotation.x = mix(0.05, 0.0, lean);
      }
    }

    // --- camera: near-overhead bird's-eye, matching the reference framing ---
    // Camera sits on the -Z side, so world +X reads to screen-LEFT — the car
    // (nose at +X, travelling -X → +X) enters from the RIGHT and runs LEFT.
    // Low tilt = the flat, telephoto top-down look of the reference still.
    var camY = mix(15.4, 13.8, smooth(0.28, 0.6, e));      // ease down/in during the stop
    var camZ = -3.4 + Math.sin(t * 0.12) * 0.3;            // gentle tilt off pure top-down + drift
    var camX = 0.5;                                        // sit directly over the car's mid-point → centred
    camera.position.set(camX, camY, camZ);
    camera.up.set(0, 1, 0);
    camera.lookAt(0.5, 0.18, 0);                           // frame the resting car level & centred
  }

  /* ================= LOOP ================= */
  var running = true;
  if (section && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        running = en.isIntersecting;
        // don't keep decoding the footage while the section is off-screen
        if (pitVideo && videoOn) {
          if (running) { var p = pitVideo.play(); if (p && p.catch) p.catch(function () {}); }
          else { pitVideo.pause(); }
        }
      });
    }, { threshold: 0 }).observe(section);
  }
  var start = performance.now();
  var eased = 0;
  function frame(now) {
    if (running && !document.hidden) {
      var t = (now - start) / 1000;
      eased += (readProgress() - eased) * 0.09;
      setVideo(eased >= 0.80);          // car's front is down → cut to the footage
      // once the footage has fully covered the frame, stop driving the GPU with the 3D scene
      if (!videoCovering) {
        resize();
        // while the video is taking over, freeze the car at the "set down" beat so it
        // never advances into the drive-away motion during the cross-fade
        animate(videoOn ? Math.min(eased, 0.80) : eased, t);
        renderer.render(scene, camera);
      }
    }
    requestAnimationFrame(frame);
  }
  if (reduced) { eased = 0.45; animate(0.45, 0); renderer.render(scene, camera); }
  else { requestAnimationFrame(frame); }
})();
