/* ============================================================
   lotabin — Intake flow orchestrator
   Needs: React, ReactDOM, intake-data.jsx, intake-steps.jsx,
          tweaks-panel.jsx
   ============================================================ */

(function () {
  const { useState, useEffect, useRef, useMemo } = React;
  const { px } = window.IFhelpers;
  const S = window.IFSteps;
  const I = window.IFIcons;

  const ORDER = ['lane', 'plan', 'offer', 'creative', 'assets', 'contact', 'review'];
  const STORE = 'lotabin.brief.v1';
  const STEP_STORE = 'lotabin.brief.step.v1';

  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "accent": ["#c8a876", "#9a7d4f"],
    "bg": "ink",
    "layout": "rail",
    "density": "regular"
  }/*EDITMODE-END*/;

  const DEFAULT_STATE = {
    lane: null, plan: null,
    product: '', what: '', who: '', pain: '', cta: '',
    tones: [], hooks: 3, formats: ['9:16', '1:1'], refs: '',
    ready: [], file: null, timing: '', notes: '',
    name: '', company: '', email: '', region: '', consent: true,
  };

  function loadState() {
    try { const s = JSON.parse(localStorage.getItem(STORE)); if (s && typeof s === 'object') return { ...DEFAULT_STATE, ...s }; } catch (e) {}
    return { ...DEFAULT_STATE };
  }

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function App() {
    const [t, setTweak] = window.useTweaks(TWEAK_DEFAULTS);
    const [lang, setLang] = useState(() => {
      try { return localStorage.getItem('lotabin.lang') === 'ja' ? 'ja' : 'en'; } catch (e) { return 'en'; }
    });
    const tr = useMemo(() => {
      const D = window.INTAKE.DICT;
      return (k) => (D[lang] && D[lang][k] !== undefined) ? D[lang][k] : (D.en[k] !== undefined ? D.en[k] : k);
    }, [lang]);

    const [state, setState] = useState(loadState);
    const [stepIdx, setStepIdx] = useState(() => {
      const n = parseInt(localStorage.getItem(STEP_STORE), 10); return (n >= 0 && n < ORDER.length) ? n : 0;
    });
    const [maxReached, setMaxReached] = useState(stepIdx);
    const [errors, setErrors] = useState({});
    const [done, setDone] = useState(false);
    const [mounted, setMounted] = useState(false);
    const scrollRef = useRef(null);
    const ticket = useMemo(() => ({
      id: 'LTB-26' + Math.floor(1000 + Math.random() * 9000),
      wave: 15,
    }), []);

    useEffect(() => { const id = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(id); }, []);
    useEffect(() => { try { localStorage.setItem(STORE, JSON.stringify({ ...state, file: state.file })); } catch (e) {} }, [state]);
    useEffect(() => { try { localStorage.setItem(STEP_STORE, String(stepIdx)); } catch (e) {} }, [stepIdx]);
    useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [stepIdx]);
    useEffect(() => {
      document.documentElement.setAttribute('lang', lang);
      try { localStorage.setItem('lotabin.lang', lang); } catch (e) {}
    }, [lang]);

    const set = (k, v) => { setState(s => ({ ...s, [k]: v })); setErrors(e => (e[k] ? { ...e, [k]: false } : e)); };

    const stepKey = ORDER[stepIdx];

    function validate(key) {
      const e = {};
      if (key === 'lane' && !state.lane) e.lane = true;
      if (key === 'plan' && !state.plan) e.plan = true;
      if (key === 'offer') { if (!state.product.trim()) e.product = true; if (!state.what.trim()) e.what = true; if (!state.who.trim()) e.who = true; }
      if (key === 'creative') { if (!state.tones || state.tones.length === 0) e.tones = true; }
      if (key === 'contact') {
        if (!state.name.trim()) e.name = true;
        if (!state.company.trim()) e.company = true;
        if (!state.email.trim()) e.email = true;
        else if (!EMAIL_RE.test(state.email.trim())) e.email = 'fmt';
      }
      return e;
    }

    function next() {
      const e = validate(stepKey);
      if (Object.keys(e).length) { setErrors(e); return; }
      setErrors({});
      if (stepIdx < ORDER.length - 1) { const n = stepIdx + 1; setStepIdx(n); setMaxReached(m => Math.max(m, n)); }
      else { submit(); }
    }
    function back() { if (stepIdx > 0) setStepIdx(stepIdx - 1); }
    function advance() {
      if (stepIdx < ORDER.length - 1) { const n = stepIdx + 1; setStepIdx(n); setMaxReached(m => Math.max(m, n)); setErrors({}); }
    }
    function jump(i) {
      if (i <= maxReached) {
        // validate everything up to i
        for (let j = 0; j < i; j++) { const e = validate(ORDER[j]); if (Object.keys(e).length) { setStepIdx(j); setErrors(e); return; } }
        setErrors({}); setStepIdx(i);
      }
    }
    function submit() { setDone(true); }
    function resetAll() {
      setState({ ...DEFAULT_STATE }); setStepIdx(0); setMaxReached(0); setErrors({}); setDone(false);
      try { localStorage.removeItem(STORE); localStorage.removeItem(STEP_STORE); } catch (e) {}
    }

    /* ---- derived display helpers ---- */
    const planObj = useMemo(() => {
      if (!state.lane || !state.plan || state.plan === 'unsure') return null;
      return (window.INTAKE.PLANS[state.lane] || []).find(p => p.id === state.plan) || null;
    }, [state.lane, state.plan]);

    const estimate = useMemo(() => {
      if (state.plan === 'unsure' || !planObj) return { price: tr('review.empty'), per: tr('plan.unsure.t') };
      return { price: px(planObj.price, lang), per: px(planObj.per, lang) };
    }, [planObj, state.plan, lang, tr]);

    /* ---- styling from tweaks ---- */
    const acc = Array.isArray(t.accent) ? t.accent : [t.accent, t.accent];
    const stageStyle = {
      '--if-accent': acc[0],
      '--if-accent-deep': acc[1] || acc[0],
      '--if-bg': t.bg === 'black' ? '#07070a' : '#0d0d11',
    };
    const stageCls = 'if-stage' + (mounted ? ' in' : '') + (t.layout === 'top' ? ' force-top' : '') + (t.density === 'dense' ? ' dense' : '');

    const stepProps = { t: tr, lang, state, set, errors, go: advance };

    /* ---- rail ---- */
    const railSteps = ORDER.map((k, i) => {
      const status = i === stepIdx ? 'is-active' : (i < stepIdx || (i <= maxReached && i < stepIdx)) ? '' : '';
      const isDone = i < stepIdx;
      const cls = 'if-step' + (i === stepIdx ? ' is-active' : '') + (isDone ? ' is-done' : '') + (i > maxReached ? ' is-locked' : '');
      return (
        <button type="button" key={k} className={cls} disabled={i > maxReached} onClick={() => jump(i)}>
          <span className="if-dot">{isDone ? <I.check/> : String(i + 1).padStart(2, '0')}</span>
          <span className="if-sl">{tr('step.' + k)}</span>
        </button>
      );
    });

    const progressPct = done ? 100 : Math.round(((stepIdx) / (ORDER.length - 1)) * 100);

    const langToggle = (
      <div className="if-lang" role="group" aria-label="Language" style={{ display: 'inline-flex', border: '1px solid var(--if-line-strong)', borderRadius: 999, overflow: 'hidden', fontFamily: 'var(--font-mono)', fontSize: '.64rem', letterSpacing: '.16em' }}>
        {['en', 'ja'].map(l => (
          <button type="button" key={l} onClick={() => setLang(l)}
            style={{ background: lang === l ? 'var(--paper-50)' : 'transparent', color: lang === l ? 'var(--ink-1000)' : 'var(--fg)', border: 0, padding: '7px 12px', cursor: 'pointer', font: 'inherit', textTransform: 'uppercase' }}>
            {l}
          </button>
        ))}
      </div>
    );

    function renderStep() {
      if (stepKey === 'lane') return <S.Lane {...stepProps} />;
      if (stepKey === 'plan') return <S.Plan {...stepProps} />;
      if (stepKey === 'offer') return <S.Offer {...stepProps} />;
      if (stepKey === 'creative') return <S.Creative {...stepProps} />;
      if (stepKey === 'assets') return <S.Assets {...stepProps} />;
      if (stepKey === 'contact') return <S.Contact {...stepProps} />;
      if (stepKey === 'review') return <Review tr={tr} lang={lang} state={state} planObj={planObj} estimate={estimate} ticket={ticket} jump={jump} />;
      return null;
    }

    if (done) return <DoneScreen tr={tr} lang={lang} state={state} planObj={planObj} ticket={ticket} resetAll={resetAll} stageStyle={stageStyle} bg={t.bg} accent={acc} renderTweaks={() => <Tweaks t={t} setTweak={setTweak} />} />;

    return (
      <div className={stageCls} style={stageStyle}>
        {/* RAIL */}
        <aside className="if-rail">
          <div className="if-brand">
            <img src="assets/transparent.png" alt="lotabin" />
            <span className="bt"><span className="bn">lotabin</span><span className="bk">{tr('brand.kicker')}</span></span>
          </div>
          <div className="if-rail-title">{tr('brand.sub')}</div>
          <nav className="if-steps">{railSteps}</nav>
          <div className="if-rail-foot">
            {langToggle}
            <div className="if-progress"><span style={{ width: progressPct + '%' }} /></div>
            <div className="if-wave"><span className="d" />{'Wave ' + ticket.wave} · {ticket.id}</div>
          </div>
        </aside>

        {/* TOP BAR (mobile / forced) */}
        <div className="if-topbar">
          <div className="tb-brand"><img src="assets/transparent.png" alt="lotabin" /><span className="bn">lotabin</span></div>
          <div className="tb-mid">
            <div className="tb-meta"><span>{tr('nav.step')} <b>{String(stepIdx + 1).padStart(2, '0')}</b> {tr('nav.of')} {ORDER.length}</span><span>{tr('step.' + stepKey)}</span></div>
            <div className="if-progress"><span style={{ width: progressPct + '%' }} /></div>
          </div>
          {langToggle}
        </div>

        {/* MAIN */}
        <main className="if-main">
          <button className="if-close" aria-label={tr('close')} onClick={() => { window.location.href = 'index.html'; }}><I.close /></button>
          <div className="if-scroll" ref={scrollRef}>
            <div className="if-inner">
              <div className="if-step-key" key={stepKey}>{renderStep()}</div>
            </div>
          </div>
          <div className="if-foot">
            <div className="if-foot-in">
              <span className="meta">{tr('nav.step')} <b>{String(stepIdx + 1).padStart(2, '0')}</b> {tr('nav.of')} {ORDER.length}</span>
              <div className="if-actions">
                {stepIdx > 0 ? <button className="if-btn ghost" onClick={back}><I.back />{tr('nav.back')}</button> : <span />}
                <button className="if-btn pri" onClick={next}>
                  {stepKey === 'review' ? tr('nav.submit') : tr('nav.next')}<I.arrow />
                </button>
              </div>
            </div>
          </div>
        </main>

        <Tweaks t={t} setTweak={setTweak} />
      </div>
    );
  }

  /* ===================== REVIEW ===================== */
  function Review({ tr, lang, state, planObj, estimate, ticket, jump }) {
    const tones = (state.tones || []).map(id => { const o = window.INTAKE.TONES.find(x => x.id === id); return o ? px(o, lang) : id; });
    const timing = state.timing ? px(window.INTAKE.TIMINGS.find(x => x.id === state.timing) || {}, lang) : '';
    const region = state.region ? px(window.INTAKE.REGIONS.find(x => x.id === state.region) || {}, lang) : '';
    const laneTxt = state.lane === 'agency' ? tr('lane.agency.t') : tr('lane.brand.t');
    const planTxt = state.plan === 'unsure' ? tr('plan.unsure.t') : (planObj ? px(planObj.name, lang) : tr('review.empty'));
    const readyTxt = (state.ready || []).filter(x => x !== 'none').map(id => tr('assets.' + id)).join(' · ') || ((state.ready || []).includes('none') ? tr('assets.none') : '');
    const E = tr('review.empty');

    const Row = ({ k, v, stepI, tags }) => (
      <div className="if-rev-row">
        <span className="rk">{k}</span>
        {tags
          ? <span className="rv"><span className="if-tags">{v.map((x, i) => <span key={i}>{x}</span>)}</span></span>
          : <span className={'rv' + (v ? '' : ' muted')}>{v || E}</span>}
        {stepI !== undefined ? <button className="if-rev-edit" onClick={() => jump(stepI)}>{tr('review.edit')}</button> : <span />}
      </div>
    );

    return (
      <div>
        <span className="if-kicker">{tr('step.review')}</span>
        <h2 className="if-h">{tr('review.h')}</h2>
        <p className="if-sub">{tr('review.p')}</p>
        <div className="if-review">
          <div className="if-rev-list">
            <Row k={tr('review.lane')} v={laneTxt} stepI={0} />
            <Row k={tr('review.plan')} v={planTxt} stepI={1} />
            <Row k={tr('review.product')} v={state.product} stepI={2} />
            <Row k={tr('review.what')} v={state.what} stepI={2} />
            <Row k={tr('review.who')} v={state.who} stepI={2} />
            <Row k={tr('review.pain')} v={state.pain} stepI={2} />
            <Row k={tr('review.cta')} v={state.cta} stepI={2} />
            {tones.length ? <Row k={tr('review.tone')} v={tones} tags stepI={3} /> : <Row k={tr('review.tone')} v={''} stepI={3} />}
            <Row k={tr('review.hooks')} v={String(state.hooks)} stepI={3} />
            {(state.formats || []).length ? <Row k={tr('review.formats')} v={state.formats} tags stepI={3} /> : <Row k={tr('review.formats')} v={''} stepI={3} />}
            <Row k={tr('review.refs')} v={state.refs} stepI={3} />
            <Row k={tr('review.assets')} v={readyTxt} stepI={4} />
            {state.file ? <Row k={tr('review.file')} v={state.file.name} stepI={4} /> : null}
            <Row k={tr('review.timing')} v={timing} stepI={4} />
            <Row k={tr('review.notes')} v={state.notes} stepI={4} />
            <Row k={tr('review.contact')} v={[state.name, state.company, state.email, region].filter(Boolean).join(' · ')} stepI={5} />
          </div>
          <aside className="if-est">
            <div className="eh">{tr('review.est.h')}</div>
            <div className="eprice">{estimate.price}</div>
            <div className="eper">{estimate.per}</div>
            <div className="erow"><span className="ek">{tr('review.est.turn')}</span><span className="ev">{tr('review.est.turn.v')}</span></div>
            <div className="erow"><span className="ek">{tr('review.est.wave')}</span><span className="ev">Wave {ticket.wave}</span></div>
            <div className="erow"><span className="ek">{tr('done.id')}</span><span className="ev">{ticket.id}</span></div>
          </aside>
        </div>
      </div>
    );
  }

  /* ===================== DONE ===================== */
  function DoneScreen({ tr, lang, state, planObj, ticket, resetAll, stageStyle, bg, accent, renderTweaks }) {
    const laneTxt = state.lane === 'agency' ? tr('lane.agency.t') : tr('lane.brand.t');
    const planTxt = state.plan === 'unsure' ? tr('plan.unsure.t') : (planObj ? px(planObj.name, lang) : '—');
    return (
      <div className="if-stage in" style={stageStyle} >
        <div className="if-done" style={{ gridColumn: '1 / -1', gridRow: '1 / -1' }}>
          <div className="if-done-in">
            <div className="if-seal"><svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: 40 }}><path d="M11 20.5l6 6L29 13" /></svg></div>
            <div className="dk">{tr('done.kicker')}</div>
            <h2 className="dh">{tr('done.h')}</h2>
            <p className="dp">{tr('done.p')}</p>

            <div className="if-ticket">
              <div className="tt">
                <div className="tc"><div className="tk">{tr('done.id')}</div><div className="tv accent">{ticket.id}</div></div>
                <div className="tc"><div className="tk">{tr('done.wave')}</div><div className="tv">Wave {ticket.wave}</div></div>
                <div className="tc"><div className="tk">{tr('done.lane')}</div><div className="tv">{laneTxt}</div></div>
                <div className="tc"><div className="tk">{tr('done.plan')}</div><div className="tv">{planTxt}</div></div>
              </div>
              <div className="perf" />
            </div>

            <div className="if-next">
              <div className="nh">{tr('done.next.h')}</div>
              <div className="nr"><span className="nn">01</span><span className="nt">{tr('done.n1')}</span></div>
              <div className="nr"><span className="nn">02</span><span className="nt">{tr('done.n2')}</span></div>
              <div className="nr"><span className="nn">03</span><span className="nt">{tr('done.n3')}</span></div>
            </div>

            <div className="dact">
              <a className="if-btn pri" href="index.html">{tr('done.home')}</a>
              <button className="if-btn ghost" onClick={resetAll}>{tr('done.again')}</button>
            </div>
          </div>
        </div>
        {renderTweaks ? renderTweaks() : null}
      </div>
    );
  }

  /* ===================== TWEAKS ===================== */
  function Tweaks({ t, setTweak }) {
    const { TweaksPanel, TweakSection, TweakColor, TweakRadio } = window;
    return (
      <TweaksPanel title="Tweaks">
        <TweakSection label="Accent" />
        <TweakColor label="Film accent" value={t.accent}
          options={[['#c8a876', '#9a7d4f'], ['#9bb0c4', '#647a90'], ['#a9b59a', '#73815f'], ['#cf9f8a', '#9c6b56'], ['#b9a8c4', '#7e6a8e']]}
          onChange={(v) => setTweak('accent', v)} />
        <TweakSection label="Surface" />
        <TweakRadio label="Background" value={t.bg} options={['ink', 'black']} onChange={(v) => setTweak('bg', v)} />
        <TweakSection label="Layout" />
        <TweakRadio label="Stepper" value={t.layout} options={['rail', 'top']} onChange={(v) => setTweak('layout', v)} />
        <TweakRadio label="Density" value={t.density} options={['regular', 'dense']} onChange={(v) => setTweak('density', v)} />
      </TweaksPanel>
    );
  }

  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
})();
