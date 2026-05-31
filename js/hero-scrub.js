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
  function unlockSeeking() {
    const originalSrc = video.currentSrc || video.src;
    if (!originalSrc) return Promise.resolve();
    return fetch(originalSrc)
      .then(r => r.ok ? r.blob() : Promise.reject(new Error('fetch failed')))
      .then(blob => new Promise((resolve) => {
        video.addEventListener('loadedmetadata', resolve, { once: true });
        setTimeout(resolve, 3000); // safety
        video.src = URL.createObjectURL(blob);
      }))
      .catch(() => { /* fall through to whatever's already loaded */ });
  }

  /* ---------- iOS-Safari first-frame paint ----------
     A paused-since-init <video> stays black on iOS Safari (and some
     Android WebViews) even after currentTime is set — the decoder
     won't paint until a real play() has resolved at least once.
     We call play() once, pause on the first 'playing' tick, then
     never touch playback again. The video stays paused for the
     rest of the session and scroll-driven seeks paint correctly. */
  function primeDecoder() {
    return new Promise((resolve) => {
      let done = false;
      const finish = () => { if (done) return; done = true; resolve(); };
      video.addEventListener('playing', () => {
        try { video.pause(); } catch (e) {}
        finish();
      }, { once: true });
      try {
        const p = video.play();
        if (p && typeof p.catch === 'function') p.catch(() => finish());
      } catch (e) { finish(); }
      setTimeout(finish, 800); // safety
    });
  }

  function onReady() {
    duration = video.duration || 0;
    if (duration > 0 && tcEl) tcEl.textContent = `00:00 / ${fmt(duration)}`;
    primeDecoder().then(() => {
      try { video.pause(); } catch (e) {}
      onScroll();
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
