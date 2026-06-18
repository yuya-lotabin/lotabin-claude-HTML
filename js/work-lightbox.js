/* ============================================================
   lotabin — Work gallery video lightbox
   ------------------------------------------------------------
   Clicking a .work-card opens a fullscreen overlay that plays
   the video referenced by the card's data-video attribute and
   shows the client + lotabin partner credit.

   Per-card attributes (add these in work.html):
     data-video   = YouTube or Vimeo URL, or a direct .mp4 path.
                    Leave empty for an "unlinked / coming soon" card.
     data-client  = client / brand name  (shown in the overlay)
     data-partner = the lotabin partner who made it (shown in overlay)

   Supported data-video forms:
     https://www.youtube.com/watch?v=ID
     https://youtu.be/ID
     https://www.youtube.com/embed/ID
     https://vimeo.com/123456789
     https://vimeo.com/123456789/PRIVATEHASH
     https://player.vimeo.com/video/123456789
     https://cdn.example.com/clip.mp4
   ============================================================ */
(function () {
  const lb = document.getElementById('videoLightbox');
  if (!lb) return;

  const stage      = lb.querySelector('#vlbStage');
  const elTag      = lb.querySelector('#vlbTag');
  const elTitle    = lb.querySelector('#vlbTitle');
  const elClient   = lb.querySelector('[data-vlb-client]');
  const elPartner  = lb.querySelector('[data-vlb-partner]');
  const rowClient  = lb.querySelector('[data-vlb-row="client"]');
  const rowPartner = lb.querySelector('[data-vlb-row="partner"]');
  const closeBtn   = lb.querySelector('.vlb__close');
  let lastFocus = null;

  /* Turn a pasted URL into an embeddable source. */
  function parseEmbed(raw) {
    if (!raw) return null;
    const url = raw.trim();
    if (!url || /^#?(placeholder|tbd|todo|soon)/i.test(url)) return null;

    // YouTube — watch, youtu.be, embed, shorts
    let m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/i);
    if (m) {
      return { type: 'embed', provider: 'youtube', src: 'https://www.youtube.com/embed/' + m[1] +
        '?autoplay=1&rel=0&modestbranding=1&playsinline=1' };
    }

    // Vimeo — public id, optional private hash (/HASH or ?h=HASH), or player URL
    m = url.match(/(?:vimeo\.com\/(?:video\/|channels\/[\w]+\/|groups\/[\w]+\/videos\/)?|player\.vimeo\.com\/video\/)(\d+)(?:\/([0-9a-zA-Z]+))?/i);
    if (m) {
      let hash = m[2] || '';
      const hq = url.match(/[?&]h=([0-9a-zA-Z]+)/i);
      if (hq) hash = hq[1];
      return { type: 'embed', provider: 'vimeo', src: 'https://player.vimeo.com/video/' + m[1] +
        '?autoplay=1&byline=0&portrait=0&title=0' + (hash ? '&h=' + hash : '') };
    }

    // Direct video file
    if (/\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url)) return { type: 'file', src: url };

    // Anything else — try as an iframe src (last resort)
    return { type: 'embed', provider: 'other', src: url };
  }

  /* Lazily load the Vimeo Player SDK (once) so we can intercept the end of
     a video and suppress the "More from this creator" recommendations grid. */
  let vimeoSDK = null;
  function ensureVimeoSDK() {
    if (vimeoSDK) return vimeoSDK;
    vimeoSDK = new Promise(function (resolve) {
      if (window.Vimeo && window.Vimeo.Player) { resolve(window.Vimeo); return; }
      const s = document.createElement('script');
      s.src = 'https://player.vimeo.com/api/player.js';
      s.async = true;
      s.onload = function () { resolve(window.Vimeo); };
      s.onerror = function () { resolve(null); };
      document.head.appendChild(s);
    });
    return vimeoSDK;
  }

  function suppressVimeoEndScreen(iframe) {
    ensureVimeoSDK().then(function (V) {
      if (!V || !V.Player) return;
      try {
        const player = new V.Player(iframe);
        // When the film ends, rewind + pause so the recommendations grid never shows.
        player.on('ended', function () {
          player.setCurrentTime(0).catch(function () {});
          player.pause().catch(function () {});
        });
      } catch (e) { /* SDK unavailable — video still plays normally */ }
    });
  }

  function fillStage(card) {
    const embed = parseEmbed(card.getAttribute('data-video'));
    const title = (card.querySelector('.work-title') || {}).textContent || '';
    stage.innerHTML = '';

    if (!embed) {
      const soon = document.createElement('div');
      soon.className = 'vlb__soon';
      soon.innerHTML =
        '<span class="vlb__soon-k">No film linked yet</span>' +
        '<span class="vlb__soon-t">Add a YouTube or Vimeo link to this project to play it here.</span>';
      stage.appendChild(soon);
      return;
    }

    if (embed.type === 'file') {
      const v = document.createElement('video');
      v.src = embed.src;
      v.controls = true;
      v.autoplay = true;
      v.playsInline = true;
      stage.appendChild(v);
    } else {
      const f = document.createElement('iframe');
      f.src = embed.src;
      f.title = title.trim() || 'Video';
      f.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
      f.setAttribute('allowfullscreen', '');
      f.setAttribute('frameborder', '0');
      stage.appendChild(f);
      if (embed.provider === 'vimeo') suppressVimeoEndScreen(f);
    }
  }

  function open(card) {
    const tag     = (card.querySelector('.work-tag')   || {}).textContent || '';
    const title   = (card.querySelector('.work-title') || {}).textContent || '';
    const client  = (card.getAttribute('data-client')  || '').trim();
    const partner = (card.getAttribute('data-partner') || '').trim();

    elTag.textContent   = tag.trim();
    elTitle.textContent = title.trim();

    if (client)  { elClient.textContent  = client;  rowClient.hidden  = false; } else { rowClient.hidden  = true; }
    if (partner) { elPartner.textContent = partner; rowPartner.hidden = false; } else { rowPartner.hidden = true; }

    fillStage(card);

    lastFocus = document.activeElement;
    lb.classList.add('open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    closeBtn.focus({ preventScroll: true });
  }

  function close() {
    if (!lb.classList.contains('open')) return;
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    // Clear the stage after the fade so the video stops playing.
    setTimeout(function () { stage.innerHTML = ''; }, 340);
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (e) {} }
  }

  document.querySelectorAll('[data-gallery] .work-card').forEach(function (card) {
    card.addEventListener('click', function (e) {
      e.preventDefault();
      open(card);
    });
  });

  lb.addEventListener('click', function (e) {
    if (e.target.closest('[data-vlb-close]')) close();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') close();
  });
})();
