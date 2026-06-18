/* ============================================================
   lotabin — Gallery card → detail popup (scrollytelling)
   Clicking any .sp-card in a .svc3-sp-carousel opens a panel that
   slides in from the right (Aston-Martin "Vantage S" style):

     • LEFT  — a cream pane that SCROLLS through a series of sections,
               each with its own sub-heading + body copy. A sticky
               category label (the card's own title / "thumbnail header")
               stays pinned at the top.
     • RIGHT — a pinned full-height image that CROSSFADES to a new photo
               as each left-hand section scrolls into view.

   Authoring per card
   ------------------
   Multi-section content lives in a JSON script inside the card:

     <a class="sp-card" ...>
       … thumbnail + body …
       <script type="application/json" class="sp-card__sections">
         [
           { "title": "Heading",
             "body":  ["Paragraph one.", "Paragraph two."],
             "img":   "assets/photo.png" }
         ]
       </script>
     </a>

   If that script is absent the popup falls back to a single section built
   from the card's own image + optional data-attributes
   (data-drawer-title, data-drawer-desc with " | " between paragraphs,
    data-drawer-img) — so every existing card keeps working unchanged.
   ============================================================ */
(function () {
  "use strict";

  var carousels = document.querySelectorAll(".svc3-sp-carousel");
  if (!carousels.length) return;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var DEFAULT_COPY = [
    "A short description of this project will live here — the brief we were given, and the idea that answered it.",
    "Replace this placeholder with the story of the work: what we shot, how it performed, and why it mattered."
  ];

  // ---- build the drawer + scrim once ----
  var scrim = document.createElement("div");
  scrim.className = "svc3-drawer-scrim";

  var drawer = document.createElement("div");
  drawer.className = "svc3-drawer";
  drawer.innerHTML =
    '<button type="button" class="svc3-drawer__close" aria-label="Close">' +
      '<svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13"/></svg>' +
    '</button>' +
    '<div class="svc3-drawer__panel" role="dialog" aria-modal="true" aria-label="Project detail">' +
      '<div class="svc3-drawer__text">' +
        '<span class="svc3-drawer__eyebrow"></span>' +
        '<div class="svc3-drawer__sections"></div>' +
      '</div>' +
      '<div class="svc3-drawer__media" aria-hidden="true">' +
        '<div class="svc3-drawer__layers"></div>' +
        '<div class="svc3-drawer__flash" aria-hidden="true"></div>' +
        '<span class="svc3-drawer__mediatag"></span>' +
      '</div>' +
      '<div class="svc3-drawer__scrollbar" aria-hidden="true"><div class="svc3-drawer__thumb"></div></div>' +
    '</div>';

  document.body.appendChild(scrim);
  document.body.appendChild(drawer);

  var panel = drawer.querySelector(".svc3-drawer__panel");
  var elClose = drawer.querySelector(".svc3-drawer__close");
  var elEyebrow = drawer.querySelector(".svc3-drawer__eyebrow");
  var elSections = drawer.querySelector(".svc3-drawer__sections");
  var elText = drawer.querySelector(".svc3-drawer__text");
  var elScrollbar = drawer.querySelector(".svc3-drawer__scrollbar");
  var elThumb = drawer.querySelector(".svc3-drawer__thumb");
  var elMedia = drawer.querySelector(".svc3-drawer__media");
  var elLayers = drawer.querySelector(".svc3-drawer__layers");
  var elFlash = drawer.querySelector(".svc3-drawer__flash");
  var elMediaTag = drawer.querySelector(".svc3-drawer__mediatag");

  var lastFocus = null;
  var prevOverflow = "";
  var sectionEls = [];
  var layerEls = [];
  var activeIdx = -1;
  var rafId = 0;

  // ---- read the section list for a card ----
  function readSections(card) {
    var json = card.querySelector("script.sp-card__sections");
    if (json) {
      try {
        var arr = JSON.parse(json.textContent);
        if (Array.isArray(arr) && arr.length) {
          return arr.map(function (s) {
            return {
              title: s.title || "",
              body: Array.isArray(s.body) ? s.body : (s.body ? [s.body] : []),
              img: s.img || ""
            };
          });
        }
      } catch (e) { /* fall through to single-section */ }
    }

    // --- single-section fallback (legacy cards) ---
    var titleEl = card.querySelector(".sp-card__title");
    var mediaEl = card.querySelector(".sp-card__media");
    var drawerImg = card.getAttribute("data-drawer-img");
    var img = drawerImg || (mediaEl ? bgUrl(mediaEl.style.backgroundImage) : "");
    var headline = card.getAttribute("data-drawer-title") ||
      (titleEl ? titleEl.textContent.trim() : "");
    var descAttr = card.getAttribute("data-drawer-desc");
    var body = descAttr ? descAttr.split(" | ") : DEFAULT_COPY.slice();
    return [{ title: headline, body: body, img: img }];
  }

  // pull a plain url out of a `url("…")` background-image value
  function bgUrl(v) {
    if (!v) return "";
    var m = v.match(/url\(["']?(.*?)["']?\)/);
    return m ? m[1] : "";
  }

  // brief #F6F4F0 light burst over the media pane, retriggered each swap
  function flash() {
    if (!elFlash || reduced) return;
    elFlash.classList.remove("is-flashing");
    void elFlash.offsetWidth; // force reflow so the animation restarts
    elFlash.classList.add("is-flashing");
  }

  function setActive(i) {
    if (i === activeIdx) return;
    var prev = activeIdx;
    activeIdx = i;
    // flash on a genuine change between two images (not the initial set)
    if (prev !== -1 && layerEls.length > 1) flash();
    layerEls.forEach(function (l, n) { l.classList.toggle("is-active", n === i); });
    sectionEls.forEach(function (s, n) { s.classList.toggle("is-active", n === i); });
  }

  // pick the section whose HEADER+COPY block crosses the vertical centre of the
  // scroll pane (ignoring the empty spacer above it), so the image swaps as the
  // text — not the gap — reaches the middle.
  function updateActive() {
    if (sectionEls.length < 2) return;
    var cr = elText.getBoundingClientRect();
    var centre = cr.top + cr.height / 2;
    var best = 0, bestDist = Infinity;
    for (var n = 0; n < sectionEls.length; n++) {
      var h = sectionEls[n].querySelector(".svc3-drawer__section-title");
      var c = sectionEls[n].querySelector(".svc3-drawer__section-copy");
      var ref = h || c;
      if (!ref) continue;
      var top = ref.getBoundingClientRect().top;
      var bottom = (c || h).getBoundingClientRect().bottom;
      if (centre >= top && centre <= bottom) { best = n; break; }
      var d = Math.min(Math.abs(centre - top), Math.abs(centre - bottom));
      if (d < bestDist) { bestDist = d; best = n; }
    }
    setActive(best);
  }

  function onScroll() {
    // run directly — cheap rect reads, and not dependent on rAF scheduling
    updateActive();
    updateScrollbar();
  }

  // custom scrollbar pinned to the far-right edge of the image
  function updateScrollbar() {
    var sH = elText.scrollHeight, cH = elText.clientHeight;
    var scrollable = sH - cH;
    if (scrollable <= 1) {
      elScrollbar.classList.remove("is-on");
      return;
    }
    elScrollbar.classList.add("is-on");
    var trackH = elScrollbar.clientHeight;
    var thumbH = Math.max(40, (cH / sH) * trackH);
    var maxTop = trackH - thumbH;
    var top = (elText.scrollTop / scrollable) * maxTop;
    elThumb.style.height = thumbH + "px";
    elThumb.style.transform = "translateY(" + top + "px)";
  }

  function open(card) {
    var titleEl = card.querySelector(".sp-card__title");
    var title = titleEl ? titleEl.textContent.trim() : "Project";
    var tagEl = card.querySelector(".sp-card__tag");

    // sticky category label = the card's own header
    elEyebrow.textContent = title;

    var sections = readSections(card);
    var hasImg = sections.some(function (s) { return s.img; });

    // ---- build left sections + right image layers ----
    elSections.innerHTML = "";
    elLayers.innerHTML = "";
    sectionEls = [];
    layerEls = [];
    activeIdx = -1;

    sections.forEach(function (s) {
      var sec = document.createElement("section");
      sec.className = "svc3-drawer__section";
      if (s.title) {
        var h = document.createElement("h3");
        h.className = "svc3-drawer__section-title";
        h.textContent = s.title;
        sec.appendChild(h);
      }
      var copy = document.createElement("div");
      copy.className = "svc3-drawer__section-copy";
      s.body.forEach(function (t) {
        var p = document.createElement("p");
        p.textContent = t;
        copy.appendChild(p);
      });
      sec.appendChild(copy);
      elSections.appendChild(sec);
      sectionEls.push(sec);

      var layer = document.createElement("div");
      layer.className = "svc3-drawer__layer";
      if (s.img) {
        layer.style.backgroundImage = 'url("' + s.img + '")';
        // preload so the crossfade has no flash
        var pre = new Image(); pre.src = s.img;
      }
      elLayers.appendChild(layer);
      layerEls.push(layer);
    });

    elMedia.classList.toggle("has-img", hasImg);
    elMediaTag.textContent = hasImg ? "" : (tagEl ? tagEl.textContent.trim() : "");
    drawer.classList.toggle("is-single", sections.length < 2);

    // first image visible immediately
    setActive(0);

    lastFocus = document.activeElement;
    prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    elText.scrollTop = 0;

    scrim.classList.add("is-open");
    drawer.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    // sync the active image to scroll position
    updateActive();
    updateScrollbar();
    window.setTimeout(function () { elClose.focus(); }, reduced ? 0 : 90);
  }

  function close() {
    scrim.classList.remove("is-open");
    drawer.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    document.body.style.overflow = prevOverflow;
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
  }

  function isOpen() { return drawer.classList.contains("is-open"); }

  // ---- bind card clicks (delegated per carousel) ----
  carousels.forEach(function (car) {
    car.addEventListener("click", function (e) {
      var card = e.target.closest ? e.target.closest(".sp-card") : null;
      if (!card || !car.contains(card)) return;
      e.preventDefault();
      open(card);
    });
  });

  elClose.addEventListener("click", close);
  scrim.addEventListener("click", close);
  elText.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () { if (isOpen()) { updateActive(); updateScrollbar(); } });

  // drag the custom scrollbar thumb to scroll the content
  var dragging = false, dragStartY = 0, dragStartScroll = 0;
  function onThumbDown(e) {
    dragging = true;
    dragStartY = (e.touches ? e.touches[0].clientY : e.clientY);
    dragStartScroll = elText.scrollTop;
    elScrollbar.classList.add("is-drag");
    e.preventDefault();
  }
  function onThumbMove(e) {
    if (!dragging) return;
    var y = (e.touches ? e.touches[0].clientY : e.clientY);
    var trackH = elScrollbar.clientHeight;
    var thumbH = elThumb.offsetHeight;
    var maxTop = trackH - thumbH;
    var scrollable = elText.scrollHeight - elText.clientHeight;
    if (maxTop <= 0) return;
    elText.scrollTop = dragStartScroll + ((y - dragStartY) / maxTop) * scrollable;
    e.preventDefault();
  }
  function onThumbUp() { dragging = false; elScrollbar.classList.remove("is-drag"); }
  elThumb.addEventListener("mousedown", onThumbDown);
  elThumb.addEventListener("touchstart", onThumbDown, { passive: false });
  window.addEventListener("mousemove", onThumbMove);
  window.addEventListener("touchmove", onThumbMove, { passive: false });
  window.addEventListener("mouseup", onThumbUp);
  window.addEventListener("touchend", onThumbUp);


  // let the pinned image drive the content: scrolling (wheel or drag) anywhere
  // over the right-hand picture scrolls the left-hand sections too.
  elMedia.addEventListener("wheel", function (e) {
    if (!isOpen()) return;
    // normalise delta units — line/page mode reports tiny deltas that would
    // otherwise make the scroll crawl.
    var d = e.deltaY;
    if (e.deltaMode === 1) d *= 16;            // lines → px
    else if (e.deltaMode === 2) d *= elText.clientHeight; // pages → px
    elText.scrollTop += d;
    e.preventDefault();
  }, { passive: false });

  var touchY = 0;
  elMedia.addEventListener("touchstart", function (e) {
    touchY = e.touches[0].clientY;
  }, { passive: true });
  elMedia.addEventListener("touchmove", function (e) {
    if (!isOpen()) return;
    var y = e.touches[0].clientY;
    elText.scrollTop += (touchY - y);
    touchY = y;
    e.preventDefault();
  }, { passive: false });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen()) close();
  });

  // keep focus inside the panel while open
  drawer.addEventListener("keydown", function (e) {
    if (e.key !== "Tab" || !isOpen()) return;
    var focusable = drawer.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    var first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
})();
