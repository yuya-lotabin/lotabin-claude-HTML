/* ============================================================
   lotabin — Scroll-scrub cinematic hero
   ------------------------------------------------------------
   Vanilla-JS port of the 21st.dev SmoothScrollHero effect with
   one upgrade: the video itself scrubs frame-by-frame with
   scroll (currentTime mapped to progress), so the scroll
   actively transforms the image contents — not just a parallax.

   How it works
   ------------
   .hero-scrub-track is taller than the viewport. As the user
   scrolls past it, progress p ∈ [0, 1] is the fraction passed
   across (track.height - viewport.height). That single p drives
   six CSS custom properties on the sticky stage:

     --scrub-iy / --scrub-ix : clip-path inset, opens 14% → 0%
     --scrub-scale           : video scale,    1.10 → 1.00
     --scrub-text-op         : headline reveal, 0   → 1   (eased)
     --scrub-tc-op           : timecode shows  0   → 1   → fade
     --scrub-prompt-op       : "scroll" prompt 1   → 0

   p is ALSO used to set video.currentTime = duration * p, so
   the scroll position pins the visible frame to the video
   timeline. The video element stays paused — no autoplay, no
   loop, no rAF rate-snapping fighting the browser. That's
   what keeps the scrub smooth and flicker-free.

   Reduced motion: respected — CSS opens the clip-path and
   reveals the headline immediately, JS does nothing on scroll.
   ============================================================ */

(function () {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const track  = document.querySelector('[data-scrub]');
  if (!track) return;
  const sticky = track.querySelector('.hero-scrub-sticky');
  const video  = track.querySelector('.hero-scrub-video');
  const canvas = track.querySelector('.hero-scrub-canvas');
  const tcEl   = track.querySelector('[data-scrub-tc]');
  if (!sticky || !video) return;

  /* ---------- Canvas paint (cross-device-reliable) ----------
     iPhone 12 / iOS 14 happens to composite a paused, seeked <video>
     element to screen, but newer iOS (iPhone 13/15 on iOS 16/17/18)
     and several Android WebViews refuse to — the user sees the
     dark element with no frame. Painting the decoded frame into a
     <canvas> sidesteps that compositor: canvas content always paints,
     and drawImage(video) returns the actual decoded pixels as long
     as the decoder is awake (which our one-time prime ensures). */
  const ctx = canvas ? canvas.getContext('2d', { alpha: false }) : null;

  function resizeCanvas() {
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = sticky.clientWidth, h = sticky.clientHeight;
    canvas.width  = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function paintFrame() {
    if (!canvas || !ctx || !video.videoWidth) return;
    const cw = sticky.clientWidth, ch = sticky.clientHeight;
    const vw = video.videoWidth, vh = video.videoHeight;
    // object-fit: cover
    const cAspect = cw / ch, vAspect = vw / vh;
    let sx, sy, sw, sh;
    if (vAspect > cAspect) {
      sh = vh; sw = vh * cAspect; sx = (vw - sw) / 2; sy = 0;
    } else {
      sw = vw; sh = vw / cAspect; sx = 0; sy = (vh - sh) / 2;
    }
    try { ctx.drawImage(video, sx, sy, sw, sh, 0, 0, cw, ch); }
    catch (e) { /* drawImage can throw before first decode */ }
  }

  function startPaintLoop() {
    const loop = () => { paintFrame(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  /* ---------- Helpers ---------- */
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp  = (a, b, t) => a + (b - a) * t;
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

  const fmt = secs => {
    if (!isFinite(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  /* ---------- State ---------- */
  let duration = 0;
  let ticking  = false;
  let lastP    = -1;

  /* ---------- Apply progress to the stage ---------- */
  function applyProgress(p) {
    // Clip-path inset opens
    sticky.style.setProperty('--scrub-iy', (lerp(14, 0, p)).toFixed(2) + '%');
    sticky.style.setProperty('--scrub-ix', (lerp(18, 0, p)).toFixed(2) + '%');
    sticky.style.setProperty('--scrub-r',  (lerp(14, 0, p)).toFixed(1) + 'px');

    // Video scale de-zooms
    sticky.style.setProperty('--scrub-scale', (1.10 - 0.10 * p).toFixed(3));

    // Headline reveals once frame is mostly open
    const tp  = clamp((p - 0.55) / 0.45, 0, 1);
    const tpe = easeOutCubic(tp);
    sticky.style.setProperty('--scrub-text-op', tpe.toFixed(3));
    sticky.style.setProperty('--scrub-text-pe', tpe > 0.05 ? 'auto' : 'none');

    // Timecode fades in at the edges
    const tcOp = (p < 0.05) ? p / 0.05
              : (p > 0.95) ? (1 - p) / 0.05
              : 1;
    sticky.style.setProperty('--scrub-tc-op', tcOp.toFixed(2));

    // Scroll prompt fades out fast
    sticky.style.setProperty('--scrub-prompt-op', clamp(1 - p / 0.15, 0, 1).toFixed(2));

    // Drive the video frame
    if (duration > 0) {
      // Clamp just shy of duration so we never trip 'ended'.
      const target = clamp(duration * p, 0, duration - 0.05);
      try { video.currentTime = target; } catch (e) {}
      if (tcEl) tcEl.textContent = `${fmt(duration * p)} / ${fmt(duration)}`;
    }
  }

  function computeProgress() {
    const rect = track.getBoundingClientRect();
    const total = track.offsetHeight - window.innerHeight;
    if (total <= 0) return 0;
    return clamp(-rect.top, 0, total) / total;
  }

  function onScroll() {
    if (ticking || reduced) return;
    ticking = true;
    requestAnimationFrame(() => {
      const p = computeProgress();
      if (Math.abs(p - lastP) > 0.0005) {
        applyProgress(p);
        lastP = p;
      }
      ticking = false;
    });
  }

  /* ---------- Unlock seeking for moov-at-end MP4s ----------
     Some MP4s are encoded without `-movflags +faststart`, so
     their seekable range stays [0,0] even when fully buffered,
     and setting currentTime silently snaps to 0. Fetching the
     file as a Blob and pointing the <video> at the blob URL
     gives the browser the whole file at once and unlocks the
     trailing moov atom so seeks land correctly. */
  function unlockSeeking(srcOverride) {
    const src = srcOverride || video.currentSrc || video.src;
    if (!src) return Promise.resolve();
    return fetch(src)
      .then(r => r.ok ? r.blob() : Promise.reject(new Error('fetch failed')))
      .then(blob => new Promise((resolve) => {
        const old = video.currentSrc || video.src;
        video.addEventListener('loadedmetadata', resolve, { once: true });
        setTimeout(resolve, 3000); // safety
        video.src = URL.createObjectURL(blob);
        if (old && old.startsWith('blob:')) {
          try { URL.revokeObjectURL(old); } catch (e) {}
        }
      }))
      .catch(() => { /* fall through to whatever's already loaded */ });
  }

  /* ---------- Fallback detection ----------
     After prime, seek the video to a non-fade-in frame and try to
     drawImage to a temp canvas. If the result is essentially black
     (decoder didn't produce a frame), the primary asset can't paint
     on this device — swap to assets/fallback.mov and re-run setup. */
  const FALLBACK_SRC = 'assets/fallback.mov';
  let fallbackTried = false;

  function readDecoderTest() {
    try {
      const tmp = document.createElement('canvas');
      tmp.width = 32; tmp.height = 32;
      const tctx = tmp.getContext('2d');
      tctx.drawImage(video, 0, 0, 32, 32);
      const data = tctx.getImageData(0, 0, 32, 32).data;
      let sum = 0;
      for (let i = 0; i < data.length; i += 4) {
        sum += data[i] + data[i + 1] + data[i + 2];
      }
      // 32*32 pixels * 3 channels = max 32*32*3*255 = 783360
      return sum / (32 * 32 * 3);
    } catch (e) { return -1; }
  }

  async function tryFallbackIfBlank() {
    if (fallbackTried || !duration || duration < 0.5) return;
    const probeTime = Math.min(duration * 0.5, duration - 0.1);
    video.currentTime = probeTime;
    await new Promise((resolve) => {
      let done = false;
      const onSeeked = () => { if (!done) { done = true; video.removeEventListener('seeked', onSeeked); resolve(); } };
      video.addEventListener('seeked', onSeeked);
      setTimeout(() => { if (!done) { done = true; video.removeEventListener('seeked', onSeeked); resolve(); } }, 800);
    });
    // Let one or two paint frames go by
    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => requestAnimationFrame(r));
    const avgBrightness = readDecoderTest();
    // < ~3 / 255 mean per channel means essentially black across 32x32 = paint failure
    if (avgBrightness >= 0 && avgBrightness < 3) {
      fallbackTried = true;
      swapToFallback();
    } else {
      // Test passed — re-fire the scroll handler so currentTime snaps
      // back to whatever the user's actual scroll position calls for.
      lastP = -1;
      onScroll();
    }
  }

  function swapToFallback() {
    decoderAwake = false;
    lastP = -1;
    duration = 0;
    unlockSeeking(FALLBACK_SRC).then(() => {
      if (video.readyState >= 1 && video.duration) {
        onReadyAfterFallback();
      } else {
        video.addEventListener('loadedmetadata', onReadyAfterFallback, { once: true });
      }
    });
  }

  function onReadyAfterFallback() {
    duration = video.duration || 0;
    if (duration > 0 && tcEl) tcEl.textContent = `00:00 / ${fmt(duration)}`;
    primeDecoder().then(() => {
      try { video.pause(); } catch (e) {}
      onScroll();
      // Don't re-test — if fallback also can't paint, accept the result
      // rather than risking a swap loop.
    });
  }

  /* ---------- Wake the decoder ----------
     A paused-since-init <video> stays black on iOS Safari (and some
     Android WebViews) — drawImage returns transparent pixels until
     a real play() has resolved at least once. We call play(),
     pause on the first 'playing' tick, then never touch playback
     again. The video stays paused for the rest of the session and
     scroll-driven seeks paint correctly via the canvas. */
  let decoderAwake = false;
  function primeDecoder() {
    return new Promise((resolve) => {
      let done = false;
      const finish = (ok) => {
        if (done) return; done = true;
        if (ok) decoderAwake = true;
        resolve();
      };
      video.addEventListener('playing', () => {
        try { video.pause(); } catch (e) {}
        finish(true);
      }, { once: true });
      try {
        const p = video.play();
        if (p && typeof p.catch === 'function') p.catch(() => finish(false));
      } catch (e) { finish(false); }
      setTimeout(() => finish(false), 800); // safety
    });
  }

  /* On the strictest iOS Safari versions (17/18), the auto-attempted
     play() can be silently rejected without firing 'playing'. If that
     happens, we retry inside the first user gesture handler — gesture-
     initiated play() is always allowed. */
  function attachGestureFallback() {
    if (decoderAwake) return;
    const tryWake = () => {
      if (decoderAwake) return;
      primeDecoder().then(() => {
        try { video.pause(); } catch (e) {}
        onScroll();
      });
    };
    const opts = { once: true, passive: true, capture: true };
    window.addEventListener('touchstart', tryWake, opts);
    window.addEventListener('pointerdown', tryWake, opts);
    window.addEventListener('scroll',      tryWake, opts);
    window.addEventListener('click',       tryWake, opts);
  }

  function onReady() {
    duration = video.duration || 0;
    if (duration > 0 && tcEl) tcEl.textContent = `00:00 / ${fmt(duration)}`;
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas, { passive: true });
    startPaintLoop();
    primeDecoder().then(() => {
      try { video.pause(); } catch (e) {}
      onScroll();
      attachGestureFallback(); // re-wakes the decoder on first gesture if needed
      // After a short settle, check whether the decoder is actually
      // producing visible frames on this device. If not, swap to the
      // fallback asset (fallback.mov) and re-run setup.
      setTimeout(tryFallbackIfBlank, 600);
    });
  }

  /* ---------- Reduced motion: open the frame, show the text ---------- */
  if (reduced) {
    sticky.style.setProperty('--scrub-iy', '0%');
    sticky.style.setProperty('--scrub-ix', '0%');
    sticky.style.setProperty('--scrub-r', '0px');
    sticky.style.setProperty('--scrub-scale', '1.00');
    sticky.style.setProperty('--scrub-text-op', '1');
    sticky.style.setProperty('--scrub-text-pe', 'auto');
    return;
  }

  /* ---------- Boot ---------- */
  unlockSeeking().then(() => {
    if (video.readyState >= 1 && video.duration) {
      onReady();
    } else {
      video.addEventListener('loadedmetadata', onReady, { once: true });
    }
  });

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { lastP = -1; onScroll(); }, { passive: true });

  /* ---------- Safety: if video fails to load, dont block the page ---------- */
  video.addEventListener('error', () => {
    sticky.style.setProperty('--scrub-iy', '0%');
    sticky.style.setProperty('--scrub-ix', '0%');
    sticky.style.setProperty('--scrub-text-op', '1');
    sticky.style.setProperty('--scrub-text-pe', 'auto');
    video.style.display = 'none';
    sticky.style.background =
      'radial-gradient(60% 80% at 80% 20%, rgba(200,168,118,0.18), transparent 60%),' +
      'linear-gradient(180deg, var(--ink-1000), var(--ink-800))';
  }, { once: true });

})();
