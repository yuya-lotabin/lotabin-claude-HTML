/* ============================================================
   lotabin — Instant Ad Blueprint desk (self-serve)
   A focused, single-screen intake for the $29 AI ad blueprint.
   Self-contained: needs only React + ReactDOM. Reuses the
   shared `if-*` styles from css/intake.css.
   ============================================================ */

(function () {
  const { useState, useEffect, useRef, useMemo } = React;
  const STORE = 'lotabin.blueprint.v1';

  const I = {
    arrow: (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}><path d="M3 8h10M9 4l4 4-4 4"/></svg>,
    close: (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><path d="M4 4l8 8M12 4l-8 8"/></svg>,
    spark: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/></svg>,
  };

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const DEFAULT_STATE = {
    product: '', usp: '', who: '', pain: '', cta: '', link: '', email: '',
  };

  function loadState() {
    try { const s = JSON.parse(localStorage.getItem(STORE)); if (s && typeof s === 'object') return { ...DEFAULT_STATE, ...s }; } catch (e) {}
    return { ...DEFAULT_STATE };
  }

  /* ---------- field primitives (mirrors intake) ---------- */
  function Field({ label, optionalText, error, children }) {
    return (
      <label className="if-field">
        <span className="if-label">{label}{optionalText ? <span className="opt">· {optionalText}</span> : null}</span>
        {children}
        {error ? <span className="if-err">{error}</span> : null}
      </label>
    );
  }
  function TextInput({ value, onChange, placeholder, bad, type }) {
    return (
      <input className={'if-input' + (bad ? ' bad' : '')} type={type || 'text'} value={value || ''}
        placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    );
  }
  function TextArea({ value, onChange, placeholder, bad }) {
    return <textarea className={'if-textarea' + (bad ? ' bad' : '')} value={value || ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />;
  }

  function App() {
    const [state, setState] = useState(loadState);
    const [errors, setErrors] = useState({});
    const [done, setDone] = useState(false);
    const [mounted, setMounted] = useState(false);
    const scrollRef = useRef(null);
    const ticket = useMemo(() => ({ id: 'BLP-26' + Math.floor(1000 + Math.random() * 9000) }), []);

    useEffect(() => { const id = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(id); }, []);
    useEffect(() => { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {} }, [state]);

    const set = (k, v) => { setState(s => ({ ...s, [k]: v })); setErrors(e => (e[k] ? { ...e, [k]: false } : e)); };

    function validate() {
      const e = {};
      if (!state.product.trim()) e.product = true;
      if (!state.usp.trim()) e.usp = true;
      if (!state.who.trim()) e.who = true;
      if (!state.email.trim()) e.email = true;
      else if (!EMAIL_RE.test(state.email.trim())) e.email = 'fmt';
      return e;
    }
    function submit() {
      const e = validate();
      if (Object.keys(e).length) { setErrors(e); if (scrollRef.current) scrollRef.current.scrollTop = 0; return; }
      setErrors({}); setDone(true);
    }
    function resetAll() {
      setState({ ...DEFAULT_STATE }); setErrors({}); setDone(false);
      try { localStorage.removeItem(STORE); } catch (e) {}
    }

    const stageStyle = { '--if-accent': '#c8a876', '--if-accent-deep': '#9a7d4f', '--if-bg': '#0d0d11' };
    const stageCls = 'if-stage' + (mounted ? ' in' : '');

    if (done) {
      return (
        <div className="if-stage in" style={stageStyle}>
          <div className="if-done" style={{ gridColumn: '1 / -1', gridRow: '1 / -1' }}>
            <div className="if-done-in">
              <div className="if-seal"><svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: 40 }}><path d="M11 20.5l6 6L29 13" /></svg></div>
              <div className="dk">Blueprint queued</div>
              <h2 className="dh">Your Ad Blueprint is on the way.</h2>
              <p className="dp">We’re generating an AI ad blueprint from your product details. You’ll receive a branded PDF at <b>{state.email}</b> within 24 hours.</p>

              <div className="if-ticket">
                <div className="tt">
                  <div className="tc"><div className="tk">Blueprint ID</div><div className="tv accent">{ticket.id}</div></div>
                  <div className="tc"><div className="tk">Product</div><div className="tv">{state.product || '—'}</div></div>
                  <div className="tc"><div className="tk">Price</div><div className="tv">$29</div></div>
                  <div className="tc"><div className="tk">Delivery</div><div className="tv">Within 24h</div></div>
                </div>
                <div className="perf" />
              </div>

              <div className="if-next">
                <div className="nh">What happens next</div>
                <div className="nr"><span className="nn">01</span><span className="nt">We generate a sales angle, three hooks, a short script, and a 6-frame storyboard.</span></div>
                <div className="nr"><span className="nn">02</span><span className="nt">You receive it as a branded PDF within 24 hours — no calls, no waiting on a team.</span></div>
                <div className="nr"><span className="nn">03</span><span className="nt">Upgrade to Sprout, Standard, or Pro within 14 days and your $29 is credited.</span></div>
              </div>

              <div className="dact">
                <a className="if-btn pri" href="services-sprout.html">See Sprout Creative Pilot<I.arrow /></a>
                <button className="if-btn ghost" onClick={resetAll}>Submit another product</button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={stageCls} style={stageStyle}>
        {/* RAIL */}
        <aside className="if-rail">
          <div className="if-brand">
            <img src="assets/transparent.png" alt="lotabin" />
            <span className="bt"><span className="bn">lotabin</span><span className="bk">Blueprint desk</span></span>
          </div>
          <div className="if-rail-title">Self-serve · AI draft</div>
          <div className="bp-rail-card">
            <I.spark className="bp-rail-ic" />
            <span className="bp-rail-name">Instant Ad Blueprint</span>
            <span className="bp-rail-price">$29 · one-time</span>
            <ul className="bp-rail-list">
              <li>1 product · 1 USP</li>
              <li>1 AI sales angle</li>
              <li>3 hook options</li>
              <li>15–30s script + 6-frame storyboard</li>
              <li>CTA + production recommendation</li>
            </ul>
          </div>
          <div className="if-rail-foot">
            <div className="if-progress"><span style={{ width: '12%' }} /></div>
            <div className="if-wave"><span className="d" />Branched from the main desk</div>
          </div>
        </aside>

        {/* TOP BAR (mobile) */}
        <div className="if-topbar">
          <div className="tb-brand"><img src="assets/transparent.png" alt="lotabin" /><span className="bn">lotabin</span></div>
          <div className="tb-mid">
            <div className="tb-meta"><span>Instant Ad Blueprint</span><span>$29 · AI draft</span></div>
            <div className="if-progress"><span style={{ width: '12%' }} /></div>
          </div>
        </div>

        {/* MAIN */}
        <main className="if-main">
          <button className="if-close" aria-label="Back to services" onClick={() => { window.location.href = 'services.html'; }}><I.close /></button>
          <div className="if-scroll" ref={scrollRef}>
            <div className="if-inner">
              <div className="if-step-key">
                <span className="if-kicker">Instant Ad Blueprint</span>
                <h2 className="if-h">See how your product could become a paid-social ad.</h2>
                <p className="if-sub">Tell us about the product you want to advertise. We turn it into an AI-generated ad blueprint — a sales angle, hooks, a short script, a storyboard, and a CTA — delivered as a branded PDF.</p>

                <div className="if-review">
                  <div>
                    <div className="if-grid2">
                      <Field label="Product or service name" error={errors.product && 'Required'}>
                        <TextInput value={state.product} onChange={v => set('product', v)} placeholder="e.g. Aoba Cold Brew — subscription" bad={errors.product} />
                      </Field>
                      <Field label="Where do we send it?" error={errors.email === 'fmt' ? 'Enter a valid email' : (errors.email && 'Required')}>
                        <TextInput type="email" value={state.email} onChange={v => set('email', v)} placeholder="you@company.com" bad={errors.email} />
                      </Field>
                    </div>
                    <Field label="What is it, and what makes it worth buying?" error={errors.usp && 'Required'}>
                      <TextArea value={state.usp} onChange={v => set('usp', v)} placeholder="The product and its single strongest selling point — the USP we should lead with." bad={errors.usp} />
                    </Field>
                    <Field label="Who is it for?" error={errors.who && 'Required'}>
                      <TextInput value={state.who} onChange={v => set('who', v)} placeholder="The buyer — age, role, what they care about." bad={errors.who} />
                    </Field>
                    <Field label="What problem does it solve?" optionalText="optional">
                      <TextArea value={state.pain} onChange={v => set('pain', v)} placeholder="The pain, the hesitation, the “before” state." />
                    </Field>
                    <div className="if-grid2">
                      <Field label="What should the viewer do next?" optionalText="optional">
                        <TextInput value={state.cta} onChange={v => set('cta', v)} placeholder="e.g. Start a subscription" />
                      </Field>
                      <Field label="Product or website link" optionalText="optional">
                        <TextInput value={state.link} onChange={v => set('link', v)} placeholder="https://" />
                      </Field>
                    </div>
                    <p className="bp-note">This is an AI-generated creative draft. It does not include human review, revisions, or finished video production.</p>
                  </div>

                  <aside className="if-est">
                    <div className="eh">Instant Ad Blueprint</div>
                    <div className="eprice">$29</div>
                    <div className="eper">One-time · AI draft</div>
                    <div className="erow"><span className="ek">Delivery</span><span className="ev">Within 24h</span></div>
                    <div className="erow"><span className="ek">Format</span><span className="ev">Branded PDF</span></div>
                    <div className="erow"><span className="ek">Human review</span><span className="ev">None</span></div>
                    <div className="erow"><span className="ek">Revisions</span><span className="ev">None</span></div>
                  </aside>
                </div>
              </div>
            </div>
          </div>
          <div className="if-foot">
            <div className="if-foot-in">
              <span className="meta">Self-serve · No account needed</span>
              <div className="if-actions">
                <a className="if-btn ghost" href="services.html">Back to packages</a>
                <button className="if-btn pri" onClick={submit}>Get my Ad Blueprint — $29<I.arrow /></button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
})();
