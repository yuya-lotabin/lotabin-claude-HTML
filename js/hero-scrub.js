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
   five CSS custom properties on the sticky stage:

     --scrub-iy / --scrub-ix : clip-path inset, opens 14% → 0%
     --scrub-scale           : video scale,    1.10 → 1.00
     --scrub-text-op         : headline reveal, 0   → 1   (eased)
     --scrub-tc-op           : timecode shows  0   → 1   → fade
     --scrub-prompt-op       : "scroll" prompt 1   → 0

   p is ALSO used to set video.currentTime = duration * p, so
   the scroll position pins the visible frame to the video
   timeline. The video element is visible directly (no canvas
   overlay) — autoplay+muted+playsinline lets every iPhone and
   Android composite it, and we pause on the first 'playing' tick
   so the user only sees scroll-driven frames.

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
  const tcEl   = track.querySelector('[data-scrub-tc]');
  if (!sticky || !video) return;

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
  let decoderAwake = false;

  /* ---------- Apply scroll progress to the stage ---------- */
  function applyProgress(p) {
    // Clip-path inset opens 14%/18% → 0%
    sticky.style.setProperty('--scrub-iy', (lerp(14, 0, p)).toFixed(2) + '%');
    sticky.style.setProperty('--scrub-ix', (lerp(18, 0, p)).toFixed(2) + '%');
    sticky.style.setProperty('--scrub-r',  (lerp(14, 0, p)).toFixed(1) + 'px');

    // Video scale de-zooms 1.10 → 1.00
    sticky.style.setProperty('--scrub-scale', (1.10 - 0.10 * p).toFixed(3));

    // Headline reveal kicks in once the frame is mostly open
    const tp  = clamp((p - 0.55) / 0.45, 0, 1);
    const tpe = easeOutCubic(tp);
    sticky.style.setProperty('--scrub-text-op', tpe.toFixed(3));
    sticky.style.setProperty('--scrub-text-pe', tpe > 0.05 ? 'auto' : 'none');

    // Timecode fades in/out at the edges
    const tcOp = (p < 0.05) ? p / 0.05
              : (p > 0.95) ? (1 - p) / 0.05
              : 1;
    sticky.style.setProperty('--scrub-tc-op', tcOp.toFixed(2));

    // Scroll prompt fades out quickly
    sticky.style.setProperty('--scrub-prompt-op', clamp(1 - p / 0.15, 0, 1).toFixed(2));

    // Drive the video frame
    if (duration > 0) {
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
     If the MP4 wasn't encoded with `-movflags +faststart`, its
     seekable range stays [0,0] and currentTime silently snaps
     to 0. Pulling the file in as a Blob and pointing video.src
     at the resulting blob: URL gives the browser the whole file
     at once so it can parse the trailing moov atom. */
  function unlockSeeking() {
    const src = video.currentSrc || video.src;
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

  /* ---------- Wake the decoder so iOS/WebKit will paint frames ----------
     iOS Safari (13+ all the way through 18) won't paint a paused-
     since-init <video> to the screen — even with currentTime set.
     The fix is to call play() once, pause on the first 'playing'
     tick, then never touch playback again. We have both an
     autoplay attribute on the element AND a JS play() to belt
     this — on the strictest iOS versions the autoplay can be
     blocked while gesture-initiated play() will not be. */
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

  /* On the strictest iOS Safari versions (17/18 on iPhone 13/14/15),
     both the autoplay attribute and the JS-initiated play() can be
     silently denied — no 'playing' event fires. The first real
     user gesture is always allowed, so we re-run the prime inside
     a one-time touchstart/scroll/click handler. */
  function attachGestureFallback() {
    if (decoderAwake) return;
    const tryWake = () => {
      if (decoderAwake) return;
      primeDecoder().then(() => {
        try { video.pause(); } catch (e) {}
        // Re-fire scroll handler so the visible frame matches
        // wherever the user actually is on the page now.
        lastP = -1;
        onScroll();
      });
    };
    const opts = { once: true, passive: true, capture: true };
    window.addEventListener('touchstart',  tryWake, opts);
    window.addEventListener('pointerdown', tryWake, opts);
    window.addEventListener('scroll',      tryWake, opts);
    window.addEventListener('click',       tryWake, opts);
  }

  function onReady() {
    duration = video.duration || 0;
    if (duration > 0 && tcEl) tcEl.textContent = `00:00 / ${fmt(duration)}`;
    primeDecoder().then(() => {
      try { video.pause(); } catch (e) {}
      onScroll();
      attachGestureFallback();
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
