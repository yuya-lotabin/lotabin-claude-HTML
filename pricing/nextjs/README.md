# Pricing section — scroll-grown vine (Next.js)

A responsive, dark-luxury pricing section for lotabin. A **Sprout** entry card
(one-time `$99`) sits above a three-up monthly row (**Standard / Pro / Enterprise**,
prices intentionally hidden, **Pro** highlighted). A gold **SVG vine grows out of the
bottom of the Sprout card and down behind the cards as you scroll**, with branches and
leaves that sprout on the way.

## Files
- `PricingSection.jsx` — the client component (App Router, `"use client"`)
- `PricingSection.module.css` — scoped styles

## Install
```bash
npm i gsap
```
GSAP `ScrollTrigger` ships in the same package — no extra install.

## Use
```jsx
import PricingSection from "@/components/PricingSection";

export default function Page() {
  return <PricingSection />;
}
```
Drop both files in the same folder (e.g. `components/`). Fonts used: **Playfair
Display**, **Inter**, **JetBrains Mono** — load them however you load fonts
(`next/font/google` recommended).

## How the animation is built
- **One** main path (`data-vine-main`) draws first; **branches** are separate
  `data-branch` paths that draw after the main vine is underway; **leaves** are
  `data-leaf` `<g>` groups placed along the paths.
- Drawing uses `pathLength={1}` + `strokeDasharray/strokeDashoffset` (1 → 0).
- Leaves sprout with `opacity` + `scale` + `rotation` (`back.out` ease).
- A single GSAP timeline is **scrubbed** to scroll via `ScrollTrigger`
  (`start: "top 78%"`, `end: "bottom 52%"`, `scrub: 1`).
- **Reduced motion:** if `prefers-reduced-motion: reduce`, the component sets the
  finished state (vine fully drawn, leaves shown) and skips the ScrollTrigger.
- The SVG overlay is `pointer-events: none` and sits behind the cards via `z-index`
  (overlay `z-index: 0`, card stack `z-index: 1`).

## Responsive
- **Desktop (≥860px):** Sprout becomes a two-column feature; the three monthly cards
  sit in a row beneath.
- **Tablet (≥760px):** monthly cards go three-up.
- **Mobile (<760px):** cards stack vertically and the **branches + branch leaves are
  hidden** (`display:none`) so only the clean central vine remains.

## Tuning
| Want to change | Where |
|---|---|
| Vine shape | `MAIN_VINE` / `BRANCHES` path strings (viewBox is `1000 × 1240`) |
| Leaf count / placement | `LEAVES` array — `[x, y, rotation, isBranchLeaf]` |
| When it draws | `start` / `end` on the `scrollTrigger` |
| Draw vs. sprout timing | the timeline offsets (`0`, `1.6`, `1.2`) + `stagger` values |
| Accent / glow | `--bronze` and the `.pro` box-shadow in the CSS module |

> If you render more than one `PricingSection` on a single page, give the SVG
> gradient ids (`vineGrad`, `leafGrad`) unique suffixes to avoid `url(#…)` collisions.
