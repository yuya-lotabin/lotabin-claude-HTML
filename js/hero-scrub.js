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
   scrolls past it, we compute progress p ∈ [0, 1] across the
   "extra" height (track.height - viewport.height). That single
   p drives four CSS custom properties on the sticky stage:

     --scrub-iy / --scrub-ix : clip-path inset, opens 14% → 0%
     --scrub-scale           : video scale,    1.10 → 1.00
     --scrub-text-op         : headline reveal, 0   → 1   (eased)
     --scrub-tc-op           : timecode shows  0   → 1   → fade
     --scrub-prompt-op       : "scroll" prompt 1   → 0

   p is also used to set video.currentTime, with two upgrades for
   smoothness:
     (a) requestVideoFrameCallback when available — coalesces
         seek requests to the actual frame paints
     (b) a serialized seek-queue so we never call currentTime
         while a previous seek is still pending (prevents stutter
         on iOS Safari and on older Chromium).

   Reduced motion: the IntersectionObserver-driven CSS already
   collapses the effect (clip opens, text shows). This module
   still attaches but skips work.
   ============================================================ */

(function () {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const track   = document.querySelector('[data-scrub]');
  if (!track) return;
  const sticky  = track.querySelector('.hero-scrub-sticky');
  const video   = track.querySelector('.hero-scrub-video');
  const tcEl    = track.querySelector('[data-scrub-tc]');
  if (!sticky || !video) return;

  /* ---------- Scroll-locked playback ----------
     The video element is visible (no canvas overlay). It's playing
     continuously with `loop` (required for iOS Safari to paint the
     frames — paused-since-init videos stay black on iOS). The rAF
     loop overrides currentTime to the scroll-driven target every
     frame. At 60 fps the at-most-16 ms of forward drift between
     snaps is invisible, and the natural loop-restart at end-of-clip
     is also masked by the same override.
     This keeps the visible behavior: video locked to scroll position,
     no visible looping, no visible auto-play. */

  function startLockLoop() {
    const loop = () => {
      try {
        if (duration > 0 && Math.abs(video.currentTime - scrollTargetCT) > 0.024) {
          video.currentTime = scrollTargetCT;
        }
      } catch (e) {}
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* ---------- Easing helpers ---------- */
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp  = (a, b, t) => a + (b - a) * t;
  // smoother text reveal — 1 - (1-x)^3 starts slow, ends snappy
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

  /* ---------- Seek (direct, browser coalesces rapid sets) ---------- */
  // Earlier versions used a serialized queue plus requestVideoFrameCallback.
  // That created races: rVFC fires for paused-video repaints unrelated to the
  // seek, prematurely flipping the "pending" flag and dropping intermediate
  // seeks. The browser is already smart about coalescing rapid currentTime
  // assignments — keep it simple. Because we keep the video in the PLAYING
  // state (see startKeepalive), each scroll tick effectively "pins" the
  // playhead to the scroll-driven target frame.
  let lastSeek = -1;
  function requestSeek(t) {
    // Skip sub-frame deltas (<= ~1/120 s): they're indistinguishable visually
    // and can stutter the decoder on rapid scroll.
    if (Math.abs(t - lastSeek) < 0.008) return;
    lastSeek = t;
    try { video.currentTime = t; } catch (e) { /* ignore */ }
  }

  /* ---------- Timecode formatter ---------- */
  const fmt = secs => {
    if (!isFinite(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  /* ---------- Progress → CSS + video frame ---------- */
  let duration = 0;
  let ticking  = false;
  let lastP    = -1;

  function applyProgress(p) {
    // 1. Clip-path inset opens
    const iy = lerp(14, 0, p);
    const ix = lerp(18, 0, p);
    const r  = lerp(14, 0, p);
    sticky.style.setProperty('--scrub-iy', iy.toFixed(2) + '%');
    sticky.style.setProperty('--scrub-ix', ix.toFixed(2) + '%');
    sticky.style.setProperty('--scrub-r',  r.toFixed(1)  + 'px');

    // 2. Video gentle de-scale
    sticky.style.setProperty('--scrub-scale', (1.10 - 0.10 * p).toFixed(3));

    // 3. Text reveal — kick in once frame is mostly open (p > 0.55)
    const tp = clamp((p - 0.55) / 0.45, 0, 1);
    const tpe = easeOutCubic(tp);
    sticky.style.setProperty('--scrub-text-op', tpe.toFixed(3));
    sticky.style.setProperty('--scrub-text-pe', tpe > 0.05 ? 'auto' : 'none');

    // 4. Timecode: in 0.05 → 0.95, fade at edges
    const tcOp = (p < 0.05) ? p / 0.05
              : (p > 0.95) ? (1 - p) / 0.05
              : 1;
    sticky.style.setProperty('--scrub-tc-op', tcOp.toFixed(2));

    // 5. Scroll prompt fades out 0 → 0.15
    sticky.style.setProperty('--scrub-prompt-op',
      clamp(1 - p / 0.15, 0, 1).toFixed(2));

    // 6. Video seek — scroll progress maps linearly to the full timeline.
    //    Clamp just shy of the end so we never trip 'ended' (which auto-
    //    pauses the element on some browsers and could trigger a reset).
    if (duration > 0) {
      scrollTargetCT = Math.min(duration * p, duration - 0.05);
      requestSeek(scrollTargetCT);
      if (tcEl) tcEl.textContent = `${fmt(duration * p)} / ${fmt(duration)}`;
    }
  }

  function computeProgress() {
    const rect = track.getBoundingClientRect();
    const total = track.offsetHeight - window.innerHeight;
    if (total <= 0) return 0;
    // negative top means we've scrolled past the start of track
    const passed = clamp(-rect.top, 0, total);
    return passed / total;
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

  let scrollTargetCT = 0;

  function ensurePlaying() {
    if (!video.paused) return;
    try {
      const p = video.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (e) {}
  }

  /* ---------- Boot ---------- */
  function onReady() {
    duration = video.duration || 0;
    if (duration > 0 && tcEl) tcEl.textContent = `00:00 / ${fmt(duration)}`;

    // Try to play (autoplay attr should already have started it; this is
    // a fallback for browsers / WebViews where attribute autoplay was denied
    // but a JS-initiated play after user gesture is permitted).
    ensurePlaying();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) ensurePlaying(); });
    // On gesture-locked browsers (rare for muted+inline), kick play on first scroll.
    window.addEventListener('scroll', ensurePlaying, { passive: true, once: true });

    startLockLoop();
    onScroll();
  }

  if (reduced) {
    // CSS already opens the frame; just show last frame as a still
    sticky.style.setProperty('--scrub-text-op', '1');
    sticky.style.setProperty('--scrub-text-pe', 'auto');
    return;
  }

  /* ----------------------------------------------------------
     Unlock seeking for MP4s with moov-at-end.
     Some MP4s (including ours) are encoded without the
     `-movflags +faststart` flag, so their `seekable` range
     stays [0,0] even after the file is fully buffered, and
     setting currentTime silently snaps to 0.
     Fetching the whole file as a Blob and pointing the video
     at the resulting blob: URL makes the entire file
     immediately available, so the browser parses the trailing
     moov atom and unlocks full-range seeking.
     ---------------------------------------------------------- */
  function unlockSeeking() {
    const originalSrc = video.currentSrc || video.src;
    if (!originalSrc) return Promise.resolve();
    return fetch(originalSrc)
      .then(r => r.ok ? r.blob() : Promise.reject(new Error('fetch failed')))
      .then(blob => {
        const url = URL.createObjectURL(blob);
        return new Promise((resolve) => {
          const finish = () => resolve();
          video.addEventListener('loadedmetadata', finish, { once: true });
          // safety timeout
          setTimeout(finish, 3000);
          video.src = url;
        });
      })
      .catch(() => { /* swallow — fallback below handles errors */ });
  }

  unlockSeeking().then(() => {
    if (video.readyState >= 1 && video.duration) {
      onReady();
    } else {
      video.addEventListener('loadedmetadata', onReady, { once: true });
    }
  });

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => {
    lastP = -1;
    onScroll();
  }, { passive: true });

  /* ---------- Safety: if video fails to load, dont block the page ---------- */
  video.addEventListener('error', () => {
    sticky.style.setProperty('--scrub-text-op', '1');
    sticky.style.setProperty('--scrub-text-pe', 'auto');
    sticky.style.setProperty('--scrub-iy', '0%');
    sticky.style.setProperty('--scrub-ix', '0%');
    sticky.style.setProperty('--scrub-prompt-op', '0');
    sticky.style.setProperty('--scrub-tc-op', '0');
    video.style.display = 'none';
    // fall back to a gradient backdrop
    sticky.style.background =
      'radial-gradient(60% 80% at 80% 20%, rgba(200,168,118,0.18), transparent 60%),' +
      'linear-gradient(180deg, var(--ink-1000), var(--ink-800))';
  }, { once: true });
})();
