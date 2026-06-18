/* ============================================================
   lotabin — Services v3 hero stage
   Three.js shader plane: projector fog lit bronze, scanlines,
   vignette. Pauses off-screen; renders one frame under
   prefers-reduced-motion; CSS gradient remains as fallback.
   ============================================================ */

(function () {
  const canvas = document.getElementById('svc3-stage');
  if (!canvas || typeof THREE === 'undefined') return;

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
    return; // CSS gradient fallback stays
  }

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const uniforms = {
    uTime:  { value: 0 },
    uRes:   { value: new THREE.Vector2(1, 1) },
    uMouse: { value: new THREE.Vector2(0.0, 0.0) }
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
      'uniform vec2 uMouse;',
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
      '  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }',
      '  return v;',
      '}',
      '',
      'void main() {',
      '  vec2 uv = vUv;',
      '  float aspect = uRes.x / max(uRes.y, 1.0);',
      '  vec2 p = vec2(uv.x * aspect, uv.y);',
      '  float t = uTime * 0.045;',
      '',
      '  // drifting fog',
      '  float fog = fbm(p * 1.7 + vec2(t * 0.7, -t * 0.3) + fbm(p * 3.1 - t) * 0.5);',
      '',
      '  // projector beam falling from above the frame',
      '  vec2 src = vec2(0.34 + uMouse.x * 0.06, 1.18 + uMouse.y * 0.03);',
      '  vec2 d = uv - src;',
      '  float ang = atan(d.x, -d.y);',
      '  float beam = smoothstep(0.6, 0.0, abs(ang + 0.16)) * smoothstep(-0.25, 0.95, 1.0 - length(d));',
      '  beam *= 0.55 + 0.45 * fbm(vec2(ang * 6.0, length(d) * 3.0 - t * 2.4));',
      '',
      '  vec3 deep   = vec3(0.027, 0.027, 0.039);',
      '  vec3 ink    = vec3(0.051, 0.051, 0.067);',
      '  vec3 bronze = vec3(0.784, 0.659, 0.463);',
      '',
      '  vec3 col = mix(deep, ink, uv.y);',
      '  col += fog * 0.045;',
      '  col = mix(col, bronze, beam * fog * 0.22);',
      '  col += bronze * pow(beam, 3.0) * 0.10;',
      '',
      '  // faint film scanlines',
      '  col *= 1.0 - 0.035 * sin(uv.y * uRes.y * 1.4);',
      '',
      '  // vignette',
      '  float vig = smoothstep(1.3, 0.35, length(uv - vec2(0.5, 0.45)));',
      '  col *= mix(0.72, 1.0, vig);',
      '',
      '  gl_FragColor = vec4(col, 1.0);',
      '}'
    ].join('\n')
  });

  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

  /* ---------- sizing ---------- */
  function resize() {
    const host = canvas.parentElement;
    if (!host) return;
    const w = host.clientWidth || 1;
    const h = host.clientHeight || 1;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    uniforms.uRes.value.set(w, h);
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  /* ---------- pointer drift (lerped) ---------- */
  let mx = 0, my = 0;
  if (!reduced && window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener('pointermove', function (ev) {
      mx = (ev.clientX / window.innerWidth) * 2 - 1;
      my = (ev.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
  }

  /* ---------- render loop, paused while hero off-screen ---------- */
  let running = true;
  const hero = canvas.closest('.svc3-hero');
  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { running = e.isIntersecting; });
    }, { threshold: 0 }).observe(hero);
  }

  const start = performance.now();

  function frame(now) {
    if (running && !document.hidden) {
      uniforms.uTime.value = (now - start) / 1000;
      const m = uniforms.uMouse.value;
      m.x += (mx - m.x) * 0.04;
      m.y += (my - m.y) * 0.04;
      renderer.render(scene, camera);
    }
    requestAnimationFrame(frame);
  }

  if (reduced) {
    uniforms.uTime.value = 12.0;
    renderer.render(scene, camera);
  } else {
    requestAnimationFrame(frame);
  }
})();
