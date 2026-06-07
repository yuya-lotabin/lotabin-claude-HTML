/* ============================================================
   lotabin Production Orbit (light-DOM, individually editable)
   Markup is canonical HTML in the page (.lotabin-orbit); styles in
   css/production-orbit.css; this file only drives the scroll animation.
   No shadow DOM, no custom element.
   ============================================================ */
(() => {
  "use strict";

  function initLotabinProductionOrbit(root, host) {
        const section = root.querySelector('#assembly');
        const hud = root.querySelector('#hud');
        const hudStage = root.querySelector('#hudStage');
        const hudFill = root.querySelector('#hudFill');
        const steps = Array.from(root.querySelectorAll('.lo-step'));
        const world = root.querySelector('#world');
        const orbit = root.querySelector('#orbit');
        const vineLine = root.querySelector('#vineLine');
        const vineGold = root.querySelector('#vineGold');
        const track = root.querySelector('.lo-track');
        const glow = root.querySelector('#glow');
        const phone = root.querySelector('#phone');
        const grid = root.querySelector('#grid');
        const finalVideo = root.querySelector('#finalVideo');
        const info = root.querySelector('#info');
        const kicker = root.querySelector('#kicker');
        const title = root.querySelector('#title');
        const bodyText = root.querySelector('#bodyText');
        const whyText = root.querySelector('#whyText');
        const leaves = [1,2,3,4,5].map(n => root.querySelector('#leaf' + n));
        const totalCards = 6;
        const stepAngle = Math.PI * 2 / totalCards;
        const cards = Array.from({length: totalCards}, (_, i) => ({
          el: root.querySelector('#c' + (i + 1)),
          base: Math.PI / 2 - i * stepAngle
        }));
    
        const copy = [
          ['01 · Linear','Onboarding a Real Production Team','Linear keeps production organized.','Tasks, status, and approvals sit here before anything is assembled.','It gives the whole project structure so the creative does not drift.'],
          ['02 · Script','Script defines the voice','The script gives the commercial its voice.','Voiceover, captions, timing, and emphasis shape the message before visuals combine.','It makes the final video feel intentional, not improvised.'],
          ['02.5 · Concept','Character concept aligns the look','Concept work shows the client the character direction and visual consistency of the final product.','It prevents surprises by aligning wardrobe, styling, world-building, and brand tone early.'],
          ['03 · Storyboard','Storyboard maps the shots','Storyboard turns the script into shot order, framing, and commercial rhythm.','It lets everyone see the production plan before edit decisions become expensive.'],
          ['03.5 · QA','Weekly QA keeps brand alignment','Quality assurance happens in check-in calls where the brand image and commercial direction are reviewed together.','It keeps the work aligned with the client every week instead of waiting until the final review.'],
          ['04 · Picture','Picture completes the orbit','The hero picture lands in front and completes the full production circle.','Now the viewer understands every ingredient before the phone assembles.'],
          ['05 · Merge','Pieces merge into iPhone','The six production moments collapse into the device screen as one assembled mobile output.','It shows the final result is built from a clear production system.'],
          ['06 · Autoplay','Final screen is live','Watch your brand gain a voice and story','The viewer can feel the final product immediately.']
        ];
    
        let videoStarted = false;
        const starts = [0,.10,.23,.36,.49,.62,.80,.91];
        const ends = [.10,.23,.36,.49,.62,.80,.91,1];
        const clamp = (n,min=0,max=1) => Math.min(max, Math.max(min,n));
        const mix = (a,b,t) => a + (b-a)*t;
        const smooth = (a,b,p) => {
          if(p<=a)return 0;
          if(p>=b)return 1;
          const t=(p-a)/(b-a);
          return t*t*(3-2*t);
        };
        const smoother = (a,b,p) => {
          if(p<=a)return 0;
          if(p>=b)return 1;
          const t=(p-a)/(b-a);
          return t*t*t*(t*(t*6-15)+10);
        };
        const band = (a,b,p,f=.018) => smooth(a,a+f,p)*(1-smooth(b-f,b,p));
    
        function dims() {
          const compact = innerWidth < 760;
          const rect = world.getBoundingClientRect();
          const w = Math.max(320, rect.width || innerWidth);
          const h = Math.max(280, rect.height || innerHeight);
          return {
            compact,
            rx: compact ? Math.min(w * .32, 132) : Math.min(w * .287, 504),
            ry: compact ? Math.min(h * .13, 118) : Math.min(h * .145, 150),
            ringW: compact ? Math.min(w * .86, 360) : Math.min(w * .77, 1260),
            ringH: compact ? Math.min(h * .42, 370) : Math.min(h * .78, 430)
          };
        }
    
        function stickyOffsetPx() {
          const raw = getComputedStyle(host).getPropertyValue('--lotabin-sticky-top').trim();
          const value = Number.parseFloat(raw);
          return Number.isFinite(value) ? value : 0;
        }
    
        function animRange() {
          const offset = stickyOffsetPx();
          const total = section.offsetHeight - Math.max(1, innerHeight - offset);
          // Reserve a dwell at the end so the final assembled video stays pinned for a
          // while and a small over-scroll keeps it in place before the next transition.
          const dwell = innerHeight * 0.9;
          return { offset, animTotal: Math.max(1, total - dwell) };
        }

        function scrollProgress() {
          const { offset, animTotal } = animRange();
          return clamp((offset - section.getBoundingClientRect().top) / animTotal);
        }

        // Scroll the page so the orbit animation sits at progress `p` (0..1).
        function scrollToProgress(p) {
          const { offset, animTotal } = animRange();
          const sectionDocTop = section.getBoundingClientRect().top + window.scrollY;
          const target = sectionDocTop - offset + clamp(p) * animTotal;
          window.scrollTo({ top: Math.round(target), behavior: 'smooth' });
        }
    
        function idxFor(p) {
          if(p<.10)return 0;
          if(p<.23)return 1;
          if(p<.36)return 2;
          if(p<.49)return 3;
          if(p<.62)return 4;
          if(p<.80)return 5;
          if(p<.91)return 6;
          return 7;
        }
    
        function rotationFor(p) {
          const move = [[.02,.10],[.16,.23],[.29,.36],[.42,.49],[.55,.62]];
          let rot = 0;
          for (let i=0; i<5; i++) {
            if (p < move[i][0]) return i * stepAngle;
            if (p < move[i][1]) return mix(i * stepAngle, (i + 1) * stepAngle, smoother(move[i][0], move[i][1], p));
            rot = (i + 1) * stepAngle;
          }
          return rot;
        }
    
        function setCopy(p) {
          const i = idxFor(p), c = copy[i];
          kicker.textContent=c[0];
          hudStage.textContent=c[1];
          title.textContent=c[2];
          bodyText.textContent=c[3];
          whyText.textContent=c[4];
          steps.forEach((step, n)=>{
            const local=clamp((p-starts[n])/(ends[n]-starts[n]));
            step.style.setProperty('--seg', local.toFixed(4));
            step.classList.toggle('lo-active', n===i);
            step.classList.toggle('lo-done', n<i);
          });
          hudFill.style.width = `${(p*100).toFixed(2)}%`;
          hud.style.setProperty('--hud-y', `${mix(0,-8,smooth(.88,.98,p)).toFixed(2)}px`);
          hud.style.setProperty('--hud-scale', `${mix(1,.985,smooth(.88,.98,p)).toFixed(4)}`);
          hud.style.setProperty('--hud-opacity', `${mix(1,.92,smooth(.94,1,p)).toFixed(4)}`);
          info.style.setProperty('--info-y', `${mix(0,8,smooth(.94,1,p)).toFixed(2)}px`);
          info.style.setProperty('--info-opacity', `${mix(1,.94,smooth(.94,1,p)).toFixed(4)}`);
        }
    
        function placeLeaf(el, angle, rx, ry, opacity, ringY) {
          const x = rx * Math.cos(angle), y = ry * Math.sin(angle) + ringY;
          el.style.opacity = opacity.toFixed(4);
          el.style.transform = `translate(-50%,-50%) translate(${x.toFixed(2)}px,${y.toFixed(2)}px) rotate(${(angle*180/Math.PI+95).toFixed(2)}deg) scale(${mix(.75,1.12,opacity).toFixed(3)})`;
        }
    
        function playVideo(p) {
          if(p < .93 || videoStarted) return;
          videoStarted = true;
          const promise = finalVideo.play();
          if(promise && promise.catch) {
            promise.catch(()=>root.addEventListener('touchstart',()=>finalVideo.play(),{once:true}));
          }
        }
    
        function render(p) {
          p = clamp(p);
          setCopy(p);
          const D = dims();
          const intro = 1;
          const vine = smooth(.04,.79,p);
          const merge = smooth(.80,.91,p);
          const compress = smooth(.84,.925,p);
          const phoneRise = smooth(.82,.94,p);
          const video = smooth(.93,.985,p);
          const settle = smooth(.97,1,p);
          const rot = rotationFor(p);
          const ringScale = mix(1,.80,merge)+mix(0,.05,phoneRise);
          const ringY = mix(0,32,phoneRise)-mix(0,8,settle);
    
          orbit.style.width = `${D.ringW}px`;
          orbit.style.height = `${D.ringH}px`;
          // Keep the decorative ring a TRUE circle on screen. The SVG viewBox is
          // stretched to fill the wide ring box (preserveAspectRatio="none"), so we
          // counter that by scaling the horizontal radius by ringH/ringW: this makes
          // rx*ringW === ry*ringH, i.e. equal rendered radii (a circle) at any aspect.
          const ringRxView = (44 * D.ringH / Math.max(1, D.ringW)).toFixed(3);
          vineLine.setAttribute('rx', ringRxView);
          if (vineGold) vineGold.setAttribute('rx', ringRxView);
          if (track) track.setAttribute('rx', ringRxView);
          orbit.style.setProperty('--ring-y',`${ringY.toFixed(2)}px`);
          orbit.style.setProperty('--ring-scale',ringScale.toFixed(4));
          orbit.style.setProperty('--ring-opacity',intro.toFixed(4));
          // set the draw offset on the orbit so BOTH the green and gold rings inherit it
          orbit.style.setProperty('--vine-offset', `${(100-vine*100).toFixed(2)}`);
          // As the circle completes, crossfade the green vine to the gold chroma key
          // (#CFA772) in a quick smooth motion. Window sits at the tail of the draw.
          const goldComp = smoother(.64, .80, p);
          orbit.style.setProperty('--vine-gold-opacity', goldComp.toFixed(4));
          orbit.style.setProperty('--vine-green-opacity', (1 - goldComp).toFixed(4));
    
          const leafAngles=[-Math.PI/2+.1,-.18,Math.PI/2-.18,Math.PI+.20,Math.PI*1.74];
          // leaves ride the same true circle as the ring (equal x/y radii)
          const leafR = D.ringH*.44;
          leafAngles.forEach((a,i)=>placeLeaf(leaves[i], a, leafR*ringScale, leafR*ringScale, clamp((vine-i*.15)/.45), ringY));
    
          const targets=[
            {x:-74,y:0},
            {x:-38,y:68},
            {x:38,y:68},
            {x:74,y:0},
            {x:38,y:-68},
            {x:-38,y:-68}
          ];
    
          let focus=-1, focusAmt=0;
          [[.00,.02,0],[.10,.16,1],[.23,.29,2],[.36,.42,3],[.49,.55,4],[.62,.80,5]].forEach(w=>{
            const amount=band(w[0],w[1],p,.022);
            if(amount>focusAmt){ focusAmt=amount; focus=w[2]; }
          });
    
          cards.forEach((card,i)=>{
            const theta=card.base+rot;
            const front=(Math.sin(theta)+1)/2;
            const isDesktop = !D.compact;
            let x=D.rx*Math.cos(theta), y=D.ry*Math.sin(theta);
            let z=isDesktop ? mix(-560,360,front) : mix(-120,135,front);
            let scale=isDesktop ? mix(.34,1.42,front) : mix(.62,1.18,front);
            let ry=isDesktop ? -Math.cos(theta)*38 : -Math.cos(theta)*25;
            let rx=isDesktop ? mix(18,-2,front) : mix(14,0,front);
            let rz=Math.cos(theta)*3;
            let opacity=(isDesktop ? mix(.14,1,front) : mix(.40,1,front))*intro;
            const depthBlur = isDesktop ? mix(3.8,0,front) : 0;
    
            if(focus===i){
              scale += (isDesktop ? .070 : .095)*focusAmt;
              opacity=Math.min(1,opacity+(isDesktop ? .18 : .20)*focusAmt);
              z += (isDesktop ? 90 : 24)*focusAmt;
            } else if(focus!==-1){
              scale*=mix(1,isDesktop ? .84 : .90,focusAmt);
              opacity*=mix(1,isDesktop ? .54 : .72,focusAmt);
            }
    
            x=mix(x,targets[i].x,merge);
            y=mix(y,targets[i].y+54,merge);
            z=mix(z,45,merge);
            scale=mix(scale,.68,merge);
            ry=mix(ry,0,merge);
            rx=mix(rx,0,merge);
            rz=mix(rz,0,merge);
    
            x=mix(x,0,compress);
            y=mix(y,64,compress);
            z=mix(z,120,compress);
            scale=mix(scale,.26,compress);
            opacity*=1-smooth(.88,.98,p);
    
            const fadeBlur = mix(0,5,smooth(.88,.98,p));
            card.el.style.opacity=opacity.toFixed(4);
            card.el.style.zIndex=String(10+Math.round(front*80)+(focus===i?12:0));
            card.el.style.filter=`blur(${(depthBlur+fadeBlur).toFixed(2)}px) drop-shadow(0 ${mix(10,30,front).toFixed(1)}px ${mix(24,82,front).toFixed(1)}px rgba(0,0,0,.36))`;
            card.el.style.transform=`translate(-50%,-50%) translate3d(${x.toFixed(2)}px,${(y+ringY*.10).toFixed(2)}px,${z.toFixed(2)}px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg) scale(${scale.toFixed(4)})`;
          });
    
          glow.style.setProperty('--glow-opacity', smooth(.80,.92,p).toFixed(4));
          glow.style.setProperty('--glow-scale', mix(.54,1.08,smooth(.84,.92,p)).toFixed(4));
          phone.style.setProperty('--phone-opacity', smooth(.80,.90,p).toFixed(4));
          phone.style.setProperty('--phone-scale', mix(.70,D.compact?1.02:1.08,phoneRise).toFixed(4));
          // Keep the phone screen anchored at its centered position — no upward settle
          // drift, so it never slides up into the "Production flow" HUD.
          phone.style.setProperty('--phone-y', `${mix(70,0,phoneRise).toFixed(2)}px`);
          phone.style.setProperty('--phone-rx', `${mix(22,0,phoneRise).toFixed(2)}deg`);
          phone.style.setProperty('--phone-ry', `${mix(-10,0,phoneRise).toFixed(2)}deg`);
          phone.style.setProperty('--phone-rz', `${mix(-6,0,phoneRise).toFixed(2)}deg`);
          phone.style.setProperty('--video-opacity', video.toFixed(4));
          grid.style.setProperty('--grid-opacity', (1-video).toFixed(4));
          grid.style.setProperty('--grid-scale', mix(1,.93,video).toFixed(4));
          // Final stage: smoothly turn the title to the gold chroma key (#CFA772) as the
          // user scrolls to "Watch your brand gain a voice and story", then add a shine.
          if (title) {
            const goldT = smooth(.91, .99, p);
            if (goldT > 0.96) {
              title.classList.add('lo-title-final');
              title.style.color = '';
            } else {
              title.classList.remove('lo-title-final');
              const r = Math.round(242 + (207 - 242) * goldT);
              const g = Math.round(239 + (167 - 239) * goldT);
              const b = Math.round(230 + (114 - 230) * goldT);
              title.style.color = `rgb(${r},${g},${b})`;
            }
          }
          playVideo(p);
        }
    
        // Make the HUD step labels interactive: clicking one scrolls the page to the
        // point in the animation where that production stage is active.
        // KPI…Play. "KPI Setup" targets exactly 0 — the fresh, empty start state; "Play"
        // targets exactly 1.0 — the completed state. Nothing more, nothing less.
        const stepTargets = [0, .16, .29, .42, .55, .70, .85, 1];
        steps.forEach((step, i) => {
          const targetP = stepTargets[i] != null ? stepTargets[i] : (i + .5) / steps.length;
          step.setAttribute('role', 'button');
          step.setAttribute('tabindex', '0');
          step.setAttribute('aria-label', 'Jump to stage: ' + step.textContent.trim());
          const go = () => scrollToProgress(targetP);
          step.addEventListener('click', go);
          step.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
          });
        });

        let ticking=false;
        function update() {
          if(ticking)return;
          ticking=true;
          requestAnimationFrame(()=>{
            ticking=false;
            render(scrollProgress());
          });
        }
    
        const onScroll = update;
        const onResize = update;
        const onOrientation = update;
        window.addEventListener('scroll', onScroll, {passive:true});
        window.addEventListener('resize', onResize, {passive:true});
        window.addEventListener('orientationchange', onOrientation, {passive:true});
        root.addEventListener('touchstart', () => { if(finalVideo.paused) finalVideo.play().catch(()=>{}); }, {once:true, passive:true});
        host.__lotabinCleanup = () => {
          window.removeEventListener('scroll', onScroll);
          window.removeEventListener('resize', onResize);
          window.removeEventListener('orientationchange', onOrientation);
        };
        render(scrollProgress());
      }

  function bootLotabinOrbit() {
    document.querySelectorAll('.lotabin-orbit').forEach((el) => {
      if (el.__lotabinInit) return;
      el.__lotabinInit = true;
      initLotabinProductionOrbit(el, el);
    });
  }
  if (document.readyState !== 'loading') bootLotabinOrbit();
  else document.addEventListener('DOMContentLoaded', bootLotabinOrbit);
})();
