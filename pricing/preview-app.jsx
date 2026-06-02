/* ============================================================
   lotabin — Pricing section (LIVE PREVIEW build)
   Uses GSAP + ScrollTrigger from CDN globals (window.gsap).
   The Next.js drop-in (../pricing/PricingSection.jsx) mirrors
   this exactly but imports gsap and a CSS module instead.
   ============================================================ */

const { useRef, useLayoutEffect, useEffect } = React;
const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
if (gsap && ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

const { useTweaks, TweaksPanel, TweakSection, TweakSlider, TweakToggle, TweakColor } = window;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "spread": 120,
  "cardRadius": 20,
  "showVine": true,
  "vineWidth": 3.2,
  "accent": ["#c8a876", "#9a7d4f"]
}/*EDITMODE-END*/;

/* ---- vine geometry (viewBox 1000 x 1240, mapped 1:1 to the section) ----
   A single stem grows DOWN out of the bottom of the Sprout card into the
   visible gap, then FORKS at one point into three vines that fan out and
   tuck into the tops of the plan cards:
     centre -> Pro, left -> Standard, right -> Enterprise.
   Coords come from the live layout: Sprout bottom (500,662); card tops at
   y≈791 — Standard x≈186, Pro x≈500, Enterprise x≈814. The fork sits in
   the gap so the single stem is clearly visible before it splits. */
const FORK_Y = 716;
const STEM = "M500 662 C 505 678 495 698 500 716";
// every branch STARTS at the fork (500,716) so it draws outward FROM the stem.
// { d, branch, card } — branch:true vines are hidden on mobile; the centre vine stays
const VINES = [
  { d: "M500 716 C 500 748 500 772 500 818", branch: false, card: 1 },                            // centre -> Pro
  { d: "M500 716 C 446 742 250 742 202 786 C 193 794 188 806 186 820", branch: true, card: 0 },   // left  -> Standard
  { d: "M500 716 C 554 742 750 742 798 786 C 807 794 812 806 814 820", branch: true, card: 2 },   // right -> Enterprise
];
// [x, y, rotation, isBranchLeaf] — ordered top→bottom so they sprout
// in step with the vine drawing past them (they "track" the draw)
const LEAVES = [
  [512, 698, 30, false],
  [452, 730, -40, true], [548, 730, 40, true],
  [494, 752, -28, false],
  [330, 748, -56, true], [670, 748, 56, true],
  [232, 786, -58, true], [768, 786, 58, true],
  [508, 778, 30, false],
  [500, 802, -20, false],
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

const Arrow = () => (
  <svg className="arr" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
);

function Card({ plan }) {
  return (
    <article className={"card " + (plan.featured ? "pro" : "")} data-plan>
      {plan.featured ? <span className="pill">Most Chosen</span> : null}
      <span className="tier">{plan.tier}</span>
      <h3 className="name">{plan.name}</h3>
      <p className="blurb">{plan.blurb}</p>
      {/* monthly plans intentionally show no price */}
      <ul className="feats">{plan.feats.map((f, i) => <li key={i}>{f}</li>)}</ul>
      <a className="cta" href="#"><span className="ctaArrow">{plan.cta}<Arrow /></span></a>
    </article>
  );
}

function PricingSection() {
  const root = useRef(null);
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // re-measure scroll positions when layout-affecting tweaks change
  useEffect(() => { if (ScrollTrigger) ScrollTrigger.refresh(); }, [t.spread, t.cardRadius, t.showVine, t.vineWidth]);

  useLayoutEffect(() => {
    if (!gsap || !ScrollTrigger) return;
    const el = root.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      const main = el.querySelector("[data-vine-main]");
      const branches = el.querySelectorAll("[data-branch]");
      const leaves = el.querySelectorAll(".leaf");
      const cards = el.querySelectorAll("[data-plan]");
      // map each vine to the card it connects to
      const branchFor = (cardIdx) => el.querySelector(`[data-branch][data-card="${cardIdx}"]`);
      const centre = branchFor(1), left = branchFor(0), right = branchFor(2);

      // initial (drawn-from-nothing) state
      gsap.set([main, ...branches], { strokeDasharray: 1, strokeDashoffset: 1 });
      gsap.set(leaves, { opacity: 0, scale: 0, rotate: -45, transformOrigin: "50% 50%" });
      gsap.set(cards, { opacity: 0, y: 46 }); // hidden until their vine connects

      if (reduce) {
        // show the finished vine + leaves + cards, no scroll animation
        gsap.set([main, ...branches], { strokeDashoffset: 0 });
        gsap.set(leaves, { opacity: 1, scale: 1, rotate: 0 });
        gsap.set(cards, { opacity: 1, y: 0 });
        return;
      }

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: el, start: "top 82%", end: "bottom 72%", scrub: 1 },
      });
      const reveal = { opacity: 1, y: 0, ease: "power3.out", duration: 1.0 };

      // 1 — as you scroll, the stem traces ON out of the bottom of the Sprout card
      tl.to(main, { strokeDashoffset: 0, duration: 1.2 }, 0);
      // 2 — from the one fork, three vines trace outward, fanning to each plan
      tl.to(centre, { strokeDashoffset: 0, duration: 1.8 }, 1.2);
      tl.to(left,   { strokeDashoffset: 0, duration: 2.0 }, 1.4);
      tl.to(right,  { strokeDashoffset: 0, duration: 2.0 }, 1.6);
      // 3 — leaves sprout in step as the trace passes them (top→bottom)
      tl.to(leaves, { opacity: 1, scale: 1, rotate: 0, ease: "back.out(1.7)", duration: 0.5, stagger: 0.2 }, 1.3);
      // 4 — each plan reveals the moment its own vine connects its end to the card
      tl.to(cards[1], reveal, 2.7); // Pro, as centre vine lands (ends ~3.0)
      tl.to(cards[0], reveal, 3.1); // Standard (ends ~3.4)
      tl.to(cards[2], reveal, 3.3); // Enterprise (ends ~3.6)
    }, el);

    return () => ctx.revert();
  }, []);

  const acc = Array.isArray(t.accent) ? t.accent : [t.accent, t.accent];
  const sectionStyle = {
    "--bronze": acc[0],
    "--bronze-deep": acc[1] || acc[0],
    "--card-r": t.cardRadius + "px",
    "--vine-w": t.vineWidth,
  };

  return (
    <section className="pricing" ref={root} style={sectionStyle}>
      {/* vine overlay — behind cards, non-interactive */}
      <div className="vineWrap" aria-hidden="true" style={{ display: t.showVine ? "" : "none" }}>
        <svg className="vineSvg" viewBox="0 0 1000 1240" preserveAspectRatio="none">
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
          <path className="vinePath" data-vine-main d={STEM} pathLength="1" />
          {VINES.map((v, i) => <path key={i} className={v.branch ? "branch" : "vinePath"} data-branch data-card={v.card} d={v.d} pathLength="1" />)}
          {LEAVES.map(([x, y, r, branch], i) => (
            <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
              <g className={"leaf" + (branch ? " leafBranch" : "")}>
                <path d={LEAF_D} />
              </g>
            </g>
          ))}
        </svg>
      </div>

      <div className="inner">
        <header className="head">
          <span className="eyebrow">Plans</span>
          <h2 className="title">Start small. <em>Grow into a system.</em></h2>
          <p className="sub">Begin with a single Sprout trial, then scale into a monthly production engine when you’re ready.</p>
        </header>

        <div className="stack" style={{ gap: t.spread + "px" }}>
          {/* Sprout — prominent entry card with one-time price */}
          <article className="card sprout">
            <div className="sproutTop">
              <span className="tier">Trial — one-time</span>
              <h3 className="name">Sprout</h3>
              <p className="blurb">The low-risk first step. Test the workflow, quality, and fit before moving into a monthly plan.</p>
              <div className="price"><span className="amt">$99</span><span className="per">one-time</span></div>
            </div>
            <ul className="feats">
              {SPROUT_FEATS.map((f, i) => <li key={i}>{f}</li>)}
              <li className="dim">$99 credited toward month one if upgraded within 7 days</li>
            </ul>
            <a className="cta" href="#"><span className="ctaArrow">Start a Sprout trial<Arrow /></span></a>
          </article>

          {/* Monthly trio — no prices */}
          <div className="trio">
            {TRIO.map((p) => <Card key={p.name} plan={p} />)}
          </div>
        </div>
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Layout" />
        <TweakSlider label="Sprout → plans gap" value={t.spread} min={8} max={180} step={4} unit="px" onChange={(v) => setTweak("spread", v)} />
        <TweakSlider label="Card radius" value={t.cardRadius} min={0} max={40} step={2} unit="px" onChange={(v) => setTweak("cardRadius", v)} />
        <TweakSection label="Vine" />
        <TweakToggle label="Show vine" value={t.showVine} onChange={(v) => setTweak("showVine", v)} />
        <TweakSlider label="Vine thickness" value={t.vineWidth} min={1} max={7} step={0.2} onChange={(v) => setTweak("vineWidth", v)} />
        <TweakSection label="Accent" />
        <TweakColor label="Film accent" value={t.accent}
          options={[["#c8a876", "#9a7d4f"], ["#9bb0c4", "#647a90"], ["#a9b59a", "#73815f"], ["#cf9f8a", "#9c6b56"], ["#b9a8c4", "#7e6a8e"]]}
          onChange={(v) => setTweak("accent", v)} />
      </TweaksPanel>
    </section>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<PricingSection />);
