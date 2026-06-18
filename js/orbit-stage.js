/* ============================================================
   lotabin — Production Orbit background stage
   Three.js shader plane behind the orbit: a receding soundstage
   grid floor that advances with the production line, drifting
   volumetric fog, dust motes, and a center glow that crossfades
   sprout-green → gold in sync with the orbit's color script.

   Progress is read from the HUD fill bar (#hudFill), which
   production-orbit.js already updates every frame — no duplicate
   scroll math, always in lockstep with the cards.

   Degrades gracefully: without WebGL / Three.js the original CSS
   gradient background remains. Pauses off-screen. Renders a single
   static frame under prefers-reduced-motion.
   ============================================================ */

(function () {
  const canvas = document.getElementById('orbitStage');
  if (!canvas || typeof THREE === 'undefined') return;

  const pin = canvas.closest('.lo-pin');
  const assembly = canvas.closest('.lo-assembly');
  const hudFill = document.getElementById('hudFill');
  if (!pin) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'low-power'
    });
  } catch (e) {
    canvas.remove(); // CSS gradient fallback stays
    return;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const uniforms = {
    uTime: { value: 0 },
    uRes:  { value: new THREE.Vector2(1, 1) },
    uProg: { value: 0 },   // orbit progress 0..1
    uGold: { value: 0 },   // green → gold crossfade
    uDim:  { value: 0 }    // finale dim so the phone video pops
  };

  const material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    depthTest: false,
    depthWrite: false,
    vertexShader: [
      'varying vec2 vUv;',
      'void main() {',
      '  vUv = uv;',
      '  gl_Position = vec4(position.xy, 0.0, 1.0);',
      '}'
    ].join('\n'),
    fragmentShader: [
      'precision highp float;',
      'uniform float uTime;',
      'uniform vec2 uRes;',
      'uniform float uProg;',
      'uniform float uGold;',
      'uniform float uDim;',
      'varying vec2 vUv;',
      '',
      'float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }',
      'float noise(vec2 p) {',
      '  vec2 i = floor(p); vec2 f = fract(p);',
      '  f = f * f * (3.0 - 2.0 * f);',
      '  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),',
      '             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);',
      '}',
      'float fbm(vec2 p) {',
      '  float v = 0.0; float a = 0.5;',
      '  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }',
      '  return v;',
      '}',
      '',
      'void main() {',
      '  vec2 uv = vUv;',
      '  float aspect = uRes.x / max(uRes.y, 1.0);',
      '',
      '  vec3 base   = vec3(0.051, 0.051, 0.067);', // #0d0d10
      '  vec3 green  = vec3(0.784, 0.659, 0.463);', // sprout #8ad9aa
      '  vec3 gold   = vec3(0.784, 0.659, 0.463);', // #CFA772
      '  vec3 accent = mix(green, gold, uGold);',
      '  vec3 col = base;',
      '',
      '  /* --- receding soundstage floor grid, advancing with progress --- */',
      '  float horizon = 0.44;',
      '  if (uv.y < horizon) {',
      '    float d = horizon - uv.y;',
      '    float z = 1.0 / (d * 6.0 + 0.025);',
      '    float travel = uTime * 0.30 + uProg * 26.0;',
      '    vec2 w = vec2((uv.x - 0.5) * z * aspect * 2.4, z + travel);',
      '    vec2 g = abs(fract(w) - 0.5);',
      '    float lines = smoothstep(0.045, 0.0, g.x) + smoothstep(0.045, 0.0, g.y);',
      '    float dist = 1.0 - clamp(z * 0.085, 0.0, 1.0);',     // fade toward horizon
      '    float nearFade = smoothstep(0.0, 0.05, d);',          // soft top edge
      '    col += accent * lines * 0.085 * dist * nearFade;',
      '  }',
      '',
      '  /* --- drifting volumetric fog --- */',
      '  float fog = fbm(vec2(uv.x * 2.1 * aspect, uv.y * 2.1) + vec2(uTime * 0.030, -uTime * 0.014));',
      '  col += accent * fog * 0.050 * (0.35 + 0.65 * (1.0 - uv.y));',
      '',
      '  /* --- center glow behind the orbit --- */',
      '  vec2 q = uv - vec2(0.5, 0.52);',
      '  q.x *= aspect;',
      '  float glow = exp(-dot(q, q) * 6.5);',
      '  col += accent * glow * (0.085 + 0.085 * uGold);',
      '',
      '  /* --- rising dust motes --- */',
      '  vec2 dp = vec2(uv.x * aspect, uv.y) * 70.0 + vec2(0.0, -uTime * 0.55);',
      '  vec2 cell = floor(dp);',
      '  float h = hash(cell);',
      '  vec2 jitter = vec2(hash(cell + 7.3), hash(cell + 3.1));',
      '  float mote = smoothstep(0.18, 0.0, length(fract(dp) - 0.2 - jitter * 0.6));',
      '  float tw = 0.5 + 0.5 * sin(uTime * (1.0 + h * 2.0) + h * 40.0);',
      '  col += accent * mote * step(0.93, h) * tw * 0.16;',
      '',
      '  /* --- film scanlines + vignette --- */',
      '  col *= 1.0 - 0.028 * sin(uv.y * uRes.y * 1.3);',
      '  float vig = smoothstep(1.25, 0.32, length(uv - vec2(0.5, 0.5)));',
      '  col *= mix(0.9, 1.0, vig);',
      '',
      '  /* --- finale dim so the assembled phone video pops --- */',
      '  col *= mix(1.0, 0.66, uDim);',
      '',
      '  gl_FragColor = vec4(col, 1.0);',
      '}'
    ].join('\n')
  });

  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

  /* ---------- sizing ----------
     The pin can measure 0 while the page is still laying out (fonts, big
     media), which would leave a 1×1 drawing buffer. So: ResizeObserver on
     the pin + a cheap per-frame guard, never just the window resize event. */
  let sizedW = 0, sizedH = 0;
  function resize() {
    const w = pin.clientWidth || 0;
    const h = pin.clientHeight || 0;
    if (w < 2 || h < 2) return false;            // not laid out yet — try again later
    if (w === sizedW && h === sizedH) return false;
    sizedW = w; sizedH = h;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    uniforms.uRes.value.set(w, h);
    return true;
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('load', resize, { passive: true });
  if ('ResizeObserver' in window) {
    new ResizeObserver(function () {
      if (resize() && reduced) renderer.render(scene, camera); // keep static frame crisp
    }).observe(pin);
  }

  /* ---------- progress (read from the HUD fill the orbit already drives) ---------- */
  const smoother = function (a, b, p) {
    if (p <= a) return 0;
    if (p >= b) return 1;
    const t = (p - a) / (b - a);
    return t * t * t * (t * (t * 6 - 15) + 10);
  };
  function readProgress() {
    if (!hudFill || !hudFill.style.width) return 0;
    const v = parseFloat(hudFill.style.width);
    return isNaN(v) ? 0 : Math.min(1, Math.max(0, v / 100));
  }

  /* ---------- render loop, paused while the section is off-screen ---------- */
  let running = true;
  if (assembly && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { running = e.isIntersecting; });
    }, { threshold: 0 }).observe(assembly);
  }

  const start = performance.now();

  function setUniforms(now) {
    const p = readProgress();
    uniforms.uTime.value = (now - start) / 1000;
    uniforms.uProg.value += (p - uniforms.uProg.value) * 0.08;          // eased travel
    uniforms.uGold.value = smoother(0.64, 0.80, p);                     // matches vine gold window
    uniforms.uDim.value = smoother(0.86, 0.96, p);                      // finale
  }

  function frame(now) {
    if (running && !document.hidden) {
      resize();                                  // cheap guard: no-ops unless pin size changed
      setUniforms(now);
      renderer.render(scene, camera);
    }
    requestAnimationFrame(frame);
  }

  if (reduced) {
    uniforms.uTime.value = 8.0;
    uniforms.uProg.value = 0.3;
    renderer.render(scene, camera);
  } else {
    requestAnimationFrame(frame);
  }
})();
