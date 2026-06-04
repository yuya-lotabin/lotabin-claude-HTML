"use client";

/* ============================================================
   lotabin — Pricing section with a scroll-grown vine
   Next.js (App Router) client component.

   deps:  npm i gsap
   usage: import PricingSection from "@/components/PricingSection";
          <PricingSection />

   Notes
   - The vine is one <path data-vine-main>; branches are separate
     <path data-branch> elements; leaves are <g data-leaf> groups.
   - Drawing uses pathLength=1 + strokeDasharray/strokeDashoffset.
   - Leaves sprout via opacity / scale / rotation.
   - Everything is scrubbed to scroll via GSAP ScrollTrigger.
   - prefers-reduced-motion shows the finished vine, no animation.
   - The SVG overlay is pointer-events:none and sits behind the
     cards (z-index in the CSS module).
   ============================================================ */

import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styles from "./PricingSection.module.css";

/* ---- vine geometry (viewBox 1000 x 1240) ----
   One short stem grows from the BOTTOM of the Sprout card, then
   branches — right there — into three vines: centre -> Pro,
   left -> Standard, right -> Enterprise. (No vine above Sprout.) */
const STEM = "M500 452 C 502 472 498 486 500 500";
// { d, branch } — branch:true vines are hidden on mobile; the centre vine stays
const VINES = [
  { d: "M500 500 C 500 660 500 860 500 1060", branch: false },
  { d: "M500 500 C 466 558 252 598 196 720 C 150 802 178 922 178 1048", branch: true },
  { d: "M500 500 C 534 558 748 598 804 720 C 850 802 822 922 822 1048", branch: true },
];
// [x, y, rotation, isBranchLeaf] — ordered top→bottom so they sprout
// in step with the vine drawing past them (they "track" the draw)
const LEAVES = [
  [514, 600, 32, false],
  [300, 628, -56, true], [700, 628, 56, true],
  [486, 720, -38, false],
  [214, 758, -64, true], [786, 758, 64, true],
  [516, 840, 30, false],
  [182, 902, -50, true], [818, 902, 50, true],
  [488, 956, -40, false], [510, 1042, 28, false],
];
const LEAF_D = "M0 0 C 7 -11 22 -10 29 0 C 22 10 7 11 0 0 Z";

const SPROUT_FEATS = [
  "1 product / 1 offer", "1 Video Ad Pack", "3 hook options",
  "1 script + 1 storyboard", "1 master cut up to 15s", "Captions & text overlays",
  "Brand Alignment Sheet", "7-day turnaround",
];
const TRIO = [
  { tier: "Monthly", name: "Standard", blurb: "Your monthly video foundation — a steady stream of short-form ads.", cta: "Choose Standard", feats: ["Up to 2 products / 2 offers", "6 Video Ad Packs / month", "Videos up to 30 seconds", "Storyboarding included", "9:16 delivery + 1:1 exports", "Planned production waves", "Review checkpoints each wave"] },
  { tier: "Monthly — most chosen", name: "Pro", featured: true, blurb: "A repeatable video engine — high output, frequent refreshes, priority turnaround.", cta: "Choose Pro", feats: ["Up to 3 products / 3 offers", "12 Video Ad Packs / month", "2 production waves of 6", "6 light adjustment credits / mo", "Refreshes from winners", "Voiceover included", "Monthly creative direction call", "Priority turnaround"] },
  { tier: "Monthly — high capacity", name: "Enterprise", blurb: "Priority video capacity for brands with more offers and more moving parts.", cta: "Talk to us", feats: ["Up to 5 products / 5 offers", "15 Video Ad Packs / month", "Custom production cadence", "Priority queue", "Refreshes from prior ads", "Voiceover included", "Scheduled review checkpoints", "Optional avatar-supported scope"] },
];

function Arrow() {
  return (
    <svg className={styles.arr} width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

function Card({ plan }) {
  return (
    <article className={plan.featured ? `${styles.card} ${styles.pro}` : styles.card} data-plan>
      {plan.featured ? <span className={styles.pill}>Most Chosen</span> : null}
      <span className={styles.tier}>{plan.tier}</span>
      <h3 className={styles.name}>{plan.name}</h3>
      <p className={styles.blurb}>{plan.blurb}</p>
      {/* monthly plans intentionally show no price */}
      <ul className={styles.feats}>
        {plan.feats.map((f, i) => <li key={i}>{f}</li>)}
      </ul>
      <a className={styles.cta} href="#"><span className={styles.ctaArrow}>{plan.cta}<Arrow /></span></a>
    </article>
  );
}

export default function PricingSection() {
  const root = useRef(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    gsap.registerPlugin(ScrollTrigger);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      const main = el.querySelector("[data-vine-main]");
      const branches = el.querySelectorAll("[data-branch]");
      const leaves = el.querySelectorAll("[data-leaf]");
      const cards = el.querySelectorAll("[data-plan]");

      gsap.set([main, ...branches], { strokeDasharray: 1, strokeDashoffset: 1 });
      gsap.set(leaves, { opacity: 0, scale: 0, rotate: -45, transformOrigin: "50% 50%" });
      gsap.set(cards, { opacity: 0 }); // hidden until their vine connects

      if (reduce) {
        gsap.set([main, ...branches], { strokeDashoffset: 0 });
        gsap.set(leaves, { opacity: 1, scale: 1, rotate: 0 });
        gsap.set(cards, { opacity: 1 });
        return;
      }

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 48%", scrub: 1 },
      });
      // 1 — short stem grows out of the bottom of the Sprout card
      tl.to(main, { strokeDashoffset: 0, duration: 1.4 }, 0);
      // 2 — the three vines grow down to each plan
      tl.to(branches, { strokeDashoffset: 0, duration: 3, stagger: 0.3 }, 1.2);
      // 3 — leaves sprout in step with the vine drawing past them (top→bottom)
      tl.to(leaves, { opacity: 1, scale: 1, rotate: 0, ease: "back.out(1.7)", duration: 0.6, stagger: 0.26 }, 1.3);
      // 4 — once the vines have connected, all three plans fade in together
      tl.to(cards, { opacity: 1, duration: 1.1, ease: "power2.out" }, 4.6);
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section className={styles.pricing} ref={root}>
      {/* vine overlay — behind cards, non-interactive */}
      <div className={styles.vineWrap} aria-hidden="true">
        <svg className={styles.vineSvg} viewBox="0 0 1000 1240" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="vineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#e3c9a3" />
              <stop offset="0.5" stopColor="#c8a876" />
              <stop offset="1" stopColor="#9a7d4f" />
            </linearGradient>
            <radialGradient id="leafGrad" cx="0.3" cy="0.3" r="0.9">
              <stop offset="0" stopColor="#e3c9a3" />
              <stop offset="1" stopColor="#a9874f" />
            </radialGradient>
          </defs>
          <path className={styles.vinePath} data-vine-main d={STEM} pathLength="1" />
          {VINES.map((v, i) => (
            <path key={i} className={v.branch ? styles.branch : styles.vinePath} data-branch d={v.d} pathLength="1" />
          ))}
          {LEAVES.map(([x, y, r, branch], i) => (
            <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
              <g className={branch ? `${styles.leaf} ${styles.leafBranch}` : styles.leaf} data-leaf>
                <path d={LEAF_D} />
              </g>
            </g>
          ))}
        </svg>
      </div>

      <div className={styles.inner}>
        <header className={styles.head}>
          <span className={styles.eyebrow}>Plans</span>
          <h2 className={styles.title}>Start small. <em>Grow into a system.</em></h2>
          <p className={styles.sub}>Begin with a single Sprout trial, then scale into a monthly production engine when you’re ready.</p>
        </header>

        <div className={styles.stack}>
          {/* Sprout — prominent entry card with one-time price */}
          <article className={`${styles.card} ${styles.sprout}`}>
            <div className={styles.sproutTop}>
              <span className={styles.tier}>Trial — one-time</span>
              <h3 className={styles.name}>Sprout</h3>
              <p className={styles.blurb}>The low-risk first step. Test the workflow, quality, and fit before moving into a monthly plan.</p>
              <div className={styles.price}><span className={styles.amt}>$99</span><span className={styles.per}>one-time</span></div>
            </div>
            <ul className={styles.feats}>
              {SPROUT_FEATS.map((f, i) => <li key={i}>{f}</li>)}
              <li className={styles.dim}>$99 credited toward month one if upgraded within 7 days</li>
            </ul>
            <a className={styles.cta} href="#"><span className={styles.ctaArrow}>Start a Sprout trial<Arrow /></span></a>
          </article>

          {/* Monthly trio — no prices */}
          <div className={styles.trio}>
            {TRIO.map((p) => <Card key={p.name} plan={p} />)}
          </div>
        </div>
      </div>
    </section>
  );
}
