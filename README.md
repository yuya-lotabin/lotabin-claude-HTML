# lotabin — Website

Bilingual (EN / JA), static HTML site for **lotabin** — a short-form video ad production desk and motion picture studio in Nagoya, Japan.

Two pages, one design system, no build step.

```
/
├── index.html              ← lotabin (video ad desk + brand / agency offers)
├── entertainment.html      ← lotabin Entertainment (film studio portfolio)
├── assets/
│   ├── transparent.png         ← drop a new logo here to update both pages
│   └── Timeline 1.mp4          ← cinematic asset for the scroll-scrub hero
├── css/
│   ├── tokens.css          ← colors, type, spacing, motion, reveal animations
│   ├── site.css            ← landing-page styles (dark / ink)
│   └── entertainment.css   ← studio-page styles (paper / warm)
├── js/
│   ├── i18n.js             ← EN / JA dictionary + lang toggle + localStorage
│   └── anim.js             ← scroll reveals, magnetic CTAs, mobile menu, tabs
└── .claude/
    └── launch.json         ← local dev server (Python http.server :5173)
```

---

## Run locally

The site is plain HTML — open `index.html` directly, or run a static server for accurate routing:

```bash
cd "/Users/yuyakagawa/Desktop/LOTABIN WEB DEV MK 2"
python3 -m http.server 5173
# then open http://localhost:5173
```

No npm, no bundler, no build step.

---

## Deploy

Drag-and-drop deploy to any static host:

- **Netlify** — drop the project folder into the deploys page.
- **Vercel** — `vercel --prod` from the folder (no config needed).
- **Cloudflare Pages** — connect the repo or upload the folder.
- **GitHub Pages** — push to a repo, enable Pages on the branch root.

No server-side requirements. All assets are local except Google Fonts (CDN).

---

## Content edits

### Plan copy (Sprout, Standard, Pro, Enterprise, Film Studio, Partner ×4)

All plan copy lives in **`js/i18n.js`** under the `en` and `ja` dictionaries. Each plan key is namespaced — brand plans live under `p.*`, agency plans live under `a.*`. To change a plan price or feature, edit only the dictionary — the HTML uses `data-i18n="<key>"` and re-renders automatically.

### Screenplay portfolio + films in progress

Likewise, the studio-page content lives in `js/i18n.js` under the `ent.*` keys. To add a new screenplay card, copy a `<article class="script-card">…</article>` block in `entertainment.html`, give it new `data-i18n` keys (`ent.s7.title`, etc.), and add matching strings to both `en` and `ja` dictionaries.

To update a film's progress in `entertainment.html`, edit the `<span class="seg done">` / `<span class="seg live">` / empty `<span class="seg">` triple inside the `<div class="stages">` block of the relevant track. Five segments correspond to Development → Pre-production → Production → Post → Release.

### Language toggle

The toggle persists in `localStorage` under `lotabin.lang`. First-time visitors default to JA if their browser language starts with `ja`, otherwise EN. To clear: `localStorage.removeItem('lotabin.lang')` in the console.

---

## Design system

| Token | Value | Use |
|---|---|---|
| `--ink-900` | `#0d0d11` | Primary dark background (video desk) |
| `--paper-100` | `#ece7dc` | Warm paper background (entertainment) |
| `--bronze` | `#c8a876` | Singular accent — film-stock warm |
| `--font-display` | Playfair Display | Editorial display + italic accents |
| `--font-serif` | Source Serif 4 | Body on entertainment, drop-caps |
| `--font-sans` | Inter + Noto Sans JP | Body on video desk |
| `--font-mono` | JetBrains Mono | Eyebrows, labels, coords |

Type & spacing all scale fluidly via `clamp()` — no breakpoint juggling needed for typography.

Animations respect `prefers-reduced-motion`. All reveals are CSS-only transitions triggered by a single IntersectionObserver in `js/anim.js` (no GSAP, no Lenis — keeps the bundle at zero JS framework cost).

---

## Accessibility & quality

- WCAG AA contrast on both pages (verified at primary text + buttons)
- Visible 2px bronze focus ring on all interactive elements
- Min 44×44pt touch targets on buttons and tabs
- Mobile menu sets `aria-expanded` + locks body scroll
- Audience-tab switcher uses `role="tab"` + `aria-selected`
- All decorative SVGs use `aria-hidden`; icon-only buttons have `aria-label`
- No horizontal scroll on mobile (verified at 375px)
- Fonts load with `display=swap` to avoid invisible text

---

## Swapping the logo

The logo is referenced at exactly four spots per page (favicon, apple-touch-icon, header brand mark, footer brand mark), all loading `assets/transparent.png`. To swap:

```bash
# replace the file, keep the filename
cp /path/to/new-logo.png assets/transparent.png
```

If you prefer a different filename or format (SVG recommended for crispness), update the `src=` and `href=` references in `index.html` and `entertainment.html` (4 each).

---

## Scroll-scrub cinematic hero

The home page's hero is a single scroll-driven cinematic sequence: as you scroll past the section, **the video scrubs frame-by-frame** and **the clip-path inset opens** from a small matted rectangle into a full-bleed frame, all from one progress value (0 → 1). The headline then reveals over the final third.

This is a vanilla-JS port of the 21st.dev *SmoothScrollHero* (React + Framer Motion) component — same effect, no dependencies, no build step.

### Files
- **`js/hero-scrub.js`** — drives `video.currentTime` and six CSS custom properties (`--scrub-iy/ix/r/scale/text-op/tc-op/prompt-op/chip-op`) from a single rAF-throttled scroll handler
- **`css/site.css` → `.hero-scrub-*`** — the sticky-stage layout, clip-path, overlay gradients, text-reveal, and reduced-motion fallback
- **`assets/Timeline 1.mp4`** — the cinematic asset (2.94 s, 1080 × 1920)

### Swap the video
Drop a new MP4 at `assets/Timeline 1.mp4` (same filename — note the space, URL-encoded as `Timeline%201.mp4` in the markup) and you're done. To use a different path, update one `src=` in `index.html`.

### Important encoding note (faststart)
Browsers need an MP4's `moov` atom at the start of the file to expose the seekable range; without it, `video.currentTime = …` silently snaps to 0 even after the file is fully buffered. The current asset doesn't have faststart, so `hero-scrub.js` works around it by fetching the file as a Blob and pointing the `<video>` at a `blob:` URL — the browser then re-parses the trailing moov and unlocks full seeking.

This works but downloads the entire video before the scrub starts. For best initial-load performance, re-encode the file once:

```bash
brew install ffmpeg      # if not yet installed
ffmpeg -i assets/mk2-home-hero.mp4 \
       -c:v libx264 -crf 20 -preset slow -g 6 \
       -an -movflags +faststart \
       assets/mk2-home-hero.faststart.mp4
mv assets/mk2-home-hero.faststart.mp4 assets/mk2-home-hero.mp4
```

The `-g 6` flag inserts a keyframe every 6 frames, which makes mid-video seeks land instantly — important for smooth scrubbing on iOS Safari. After re-encoding, you can remove the `unlockSeeking()` block from `hero-scrub.js` for a faster first paint, but leaving it in is harmless (the fetch becomes ~free against the browser's HTTP cache).

### Tuning the effect
All knobs live in `js/hero-scrub.js → applyProgress(p)`:

| Knob | Default | What it controls |
|---|---|---|
| `lerp(14, 0, p)` / `lerp(18, 0, p)` | 14% / 18% | Starting matted-frame inset (top/bottom, left/right) |
| `1.10 - 0.10 * p` | 1.10 → 1.00 | Video scale (de-zooms as the frame opens) |
| `(p - 0.55) / 0.45` | reveals 55-100% | When the headline overlay starts/finishes its reveal |
| `easeOutCubic` | smooth-out | Easing curve for the text reveal |

And the scroll length lives in `css/site.css → .hero-scrub-track { height: 250vh }` — increase for a slower, more deliberate scrub.

### Reduced motion
`prefers-reduced-motion: reduce` opens the clip-path to full immediately, shows the headline from the start, and skips all scroll-driven seeks. The first frame of the video stays as a still backdrop.

---

## Browser support

Tested in Chromium-class engines at desktop (1440), tablet (768), and mobile (375). Uses:

- CSS `clamp()`, custom properties, `svh`, `backdrop-filter`, `aspect-ratio`
- JS `IntersectionObserver`, `matchMedia`, fetch-free
- Graceful no-JS fallback (reveals collapse to opacity-1, lang stays at default)

Older browsers (IE11) are not supported.

---

## Contact

- General — `yuya@lotabin.com`
- Screenplays / studio — `yuya@lotabin.com`

— Built with focus on clarity, motion that means something, and Japanese editorial restraint.
