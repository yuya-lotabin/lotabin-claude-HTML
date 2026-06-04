/* ============================================================
   lotabin — Intake step components + field primitives
   Exports to window: IFSteps (map of step renderers), IFIcons
   ============================================================ */

(function () {
  const { useState, useRef } = React;

  /* ---------- icons ---------- */
  const I = {
    check: (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 8.5l3.2 3.2L13 4.5"/></svg>,
    arrow: (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}><path d="M3 8h10M9 4l4 4-4 4"/></svg>,
    back: (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}><path d="M13 8H3M7 4L3 8l4 4"/></svg>,
    close: (p) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}><path d="M4 4l8 8M12 4l-8 8"/></svg>,
    upload: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" {...p}><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>,
    file: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" {...p}><path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h4"/></svg>,
    store: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" {...p}><path d="M3 9l1.5-5h15L21 9M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9M4 9h16"/></svg>,
    handshake: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" {...p}><path d="M3 12l4-4 4 3 3-3 4 4M8 11l2 2 2-2 2 2M3 12v4a1 1 0 0 0 1 1h2M21 12v4a1 1 0 0 0-1 1h-2"/></svg>,
  };

  function px(obj, lang) { return obj ? (obj[lang] !== undefined ? obj[lang] : obj.en) : ''; }

  /* ---------- field primitives ---------- */
  function Field({ label, optionalText, error, children }) {
    return (
      <label className="if-field">
        <span className="if-label">{label}{optionalText ? <span className="opt">· {optionalText}</span> : null}</span>
        {children}
        {error ? <span className="if-err">{error}</span> : null}
      </label>
    );
  }

  function TextInput({ value, onChange, placeholder, bad, type, onEnter }) {
    return (
      <input
        className={'if-input' + (bad ? ' bad' : '')}
        type={type || 'text'}
        value={value || ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && type !== 'textarea' && onEnter) onEnter(); }}
      />
    );
  }
  function TextArea({ value, onChange, placeholder, bad }) {
    return <textarea className={'if-textarea' + (bad ? ' bad' : '')} value={value || ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />;
  }

  /* ===================== STEPS ===================== */

  function Lane({ t, lang, state, set, go }) {
    const opts = [
      { id: 'brand', icon: I.store, tt: 'lane.brand.t', dd: 'lane.brand.d', tag: 'lane.tagline.brand' },
      { id: 'agency', icon: I.handshake, tt: 'lane.agency.t', dd: 'lane.agency.d', tag: 'lane.tagline.agency' },
    ];
    return (
      <div>
        <span className="if-kicker">{t('step.lane')}</span>
        <h2 className="if-h">{t('lane.h')}</h2>
        <p className="if-sub">{t('lane.p')}</p>
        <div className="if-cards two">
          {opts.map(o => {
            const Ic = o.icon;
            const sel = state.lane === o.id;
            return (
              <button type="button" key={o.id} className={'if-card' + (sel ? ' sel' : '')}
                onClick={() => { set('lane', o.id); if (state.plan) set('plan', null); setTimeout(go, 180); }}>
                <span className="check">{sel ? <I.check/> : null}</span>
                <Ic className="ic"/>
                <span className="ct">{t(o.tt)}</span>
                <span className="cd">{t(o.dd)}</span>
                <span className="ctag">{t(o.tag)}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function Plan({ t, lang, state, set, go }) {
    const list = (window.INTAKE.PLANS[state.lane] || window.INTAKE.PLANS.brand);
    return (
      <div>
        <span className="if-kicker">{t('step.plan')}</span>
        <h2 className="if-h">{t('plan.h')}</h2>
        <p className="if-sub">{t('plan.p')}</p>
        <div className="if-cards plans">
          {list.map(p => {
            const sel = state.plan === p.id;
            return (
              <button type="button" key={p.id} className={'if-card plan-c' + (sel ? ' sel' : '')}
                onClick={() => { set('plan', p.id); setTimeout(go, 180); }}>
                {p.popular ? <span className="if-ribbon">{t('plan.popular')}</span> : null}
                <span className="check">{sel ? <I.check/> : null}</span>
                <span className="pt">{px(p.tier, lang)}</span>
                <span className="pn">{px(p.name, lang)}</span>
                <span className="pp"><span className="amt">{px(p.price, lang)}</span><span className="per">{px(p.per, lang)}</span></span>
                <span className="pb">{px(p.blurb, lang)}</span>
              </button>
            );
          })}
        </div>
        <div className="if-cards" style={{ marginTop: 'var(--s-4)' }}>
          <button type="button" className={'if-card unsure' + (state.plan === 'unsure' ? ' sel' : '')}
            onClick={() => { set('plan', 'unsure'); setTimeout(go, 180); }}>
            <span className="check">{state.plan === 'unsure' ? <I.check/> : null}</span>
            <span className="ct">{t('plan.unsure.t')}</span>
            <span className="cd">{t('plan.unsure.d')}</span>
          </button>
        </div>
      </div>
    );
  }

  function Offer({ t, lang, state, set, errors }) {
    return (
      <div>
        <span className="if-kicker">{t('step.offer')}</span>
        <h2 className="if-h">{t('offer.h')}</h2>
        <p className="if-sub">{t('offer.p')}</p>
        <Field label={t('offer.product.l')} error={errors.product && t('err.required')}>
          <TextInput value={state.product} onChange={v => set('product', v)} placeholder={t('offer.product.ph')} bad={errors.product} />
        </Field>
        <Field label={t('offer.what.l')} error={errors.what && t('err.required')}>
          <TextArea value={state.what} onChange={v => set('what', v)} placeholder={t('offer.what.ph')} bad={errors.what} />
        </Field>
        <div className="if-grid2">
          <Field label={t('offer.who.l')} error={errors.who && t('err.required')}>
            <TextArea value={state.who} onChange={v => set('who', v)} placeholder={t('offer.who.ph')} bad={errors.who} />
          </Field>
          <Field label={t('offer.pain.l')}>
            <TextArea value={state.pain} onChange={v => set('pain', v)} placeholder={t('offer.pain.ph')} />
          </Field>
        </div>
        <Field label={t('offer.cta.l')}>
          <TextInput value={state.cta} onChange={v => set('cta', v)} placeholder={t('offer.cta.ph')} />
        </Field>
      </div>
    );
  }

  function Creative({ t, lang, state, set, errors }) {
    const tones = window.INTAKE.TONES, formats = window.INTAKE.FORMATS;
    const toggleTone = (id) => {
      const cur = state.tones || [];
      if (cur.includes(id)) set('tones', cur.filter(x => x !== id));
      else if (cur.length < 3) set('tones', [...cur, id]);
    };
    const toggleFmt = (id) => {
      const cur = state.formats || [];
      set('formats', cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]);
    };
    const tonesSel = state.tones || [];
    return (
      <div>
        <span className="if-kicker">{t('step.creative')}</span>
        <h2 className="if-h">{t('creative.h')}</h2>
        <p className="if-sub">{t('creative.p')}</p>

        <div className="if-field">
          <span className="if-label">{t('creative.tone.l')}{errors.tones ? <span className="if-err" style={{textTransform:'none',letterSpacing:0}}>· {t('err.pick')}</span> : null}</span>
          <div className="if-chips">
            {tones.map(tn => {
              const sel = tonesSel.includes(tn.id);
              const dis = !sel && tonesSel.length >= 3;
              return <button type="button" key={tn.id} className={'if-chip' + (sel ? ' sel' : '') + (dis ? ' dis' : '')}
                onClick={() => !dis && toggleTone(tn.id)}>{sel ? <I.check style={{width:12,height:12}}/> : null}{px(tn, lang)}</button>;
            })}
          </div>
        </div>

        <div className="if-grid2 if-section-gap">
          <div className="if-field" style={{ marginTop: 0 }}>
            <span className="if-label">{t('creative.hooks.l')}</span>
            <div className="if-seg">
              {[3, 5, 8].map(n => <button type="button" key={n} className={state.hooks === n ? 'sel' : ''} onClick={() => set('hooks', n)}>{n}</button>)}
            </div>
          </div>
          <div className="if-field" style={{ marginTop: 0 }}>
            <span className="if-label">{t('creative.formats.l')}</span>
            <div className="if-formats">
              {formats.map(f => {
                const sel = (state.formats || []).includes(f.id);
                return <button type="button" key={f.id} className={'if-fmt' + (sel ? ' sel' : '')} onClick={() => toggleFmt(f.id)}>
                  <div className="fl">{f.label}</div><div className="fn">{px(f.note, lang)}</div>
                </button>;
              })}
            </div>
          </div>
        </div>

        <Field label={t('creative.refs.l')} optionalText={t('optional')}>
          <TextArea value={state.refs} onChange={v => set('refs', v)} placeholder={t('creative.refs.ph')} />
        </Field>
      </div>
    );
  }

  function Assets({ t, lang, state, set }) {
    const fileRef = useRef(null);
    const [drag, setDrag] = useState(false);
    const timings = window.INTAKE.TIMINGS;
    const ready = state.ready || [];
    const checks = [
      { id: 'footage', l: 'assets.footage' },
      { id: 'product', l: 'assets.product' },
      { id: 'logo', l: 'assets.logo' },
      { id: 'none', l: 'assets.none' },
    ];
    const toggle = (id) => {
      let cur = ready.slice();
      if (id === 'none') { cur = cur.includes('none') ? [] : ['none']; }
      else { cur = cur.filter(x => x !== 'none'); cur = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]; }
      set('ready', cur);
    };
    const onFile = (f) => { if (f) set('file', { name: f.name, size: f.size }); };
    return (
      <div>
        <span className="if-kicker">{t('step.assets')}</span>
        <h2 className="if-h">{t('assets.h')}</h2>
        <p className="if-sub">{t('assets.p')}</p>

        <div className="if-field">
          <span className="if-label">{t('assets.ready.l')}</span>
          <div className="if-checks">
            {checks.map(c => {
              const sel = ready.includes(c.id);
              return <div key={c.id} className={'if-checkrow' + (sel ? ' sel' : '')} onClick={() => toggle(c.id)}>
                <span className="if-box">{sel ? <I.check/> : null}</span>
                <span className="cl">{t(c.l)}</span>
              </div>;
            })}
          </div>
        </div>

        <div className="if-field">
          <span className="if-label">{t('assets.drop.l')}<span className="opt">· {t('optional')}</span></span>
          {state.file
            ? <div className="if-file">
                <I.file className="fi" style={{ width: 20, height: 20 }} />
                <span className="fn">{state.file.name}</span>
                <button type="button" className="fx" onClick={() => set('file', null)}><I.close style={{ width: 14, height: 14 }} /></button>
              </div>
            : <div className={'if-drop' + (drag ? ' drag' : '')}
                onClick={() => fileRef.current && fileRef.current.click()}
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files[0]); }}>
                <I.upload className="di" />
                <div className="dl">{t('assets.drop.ph')}</div>
                <div className="dn">{t('assets.drop.note')}</div>
                <input ref={fileRef} type="file" hidden onChange={(e) => onFile(e.target.files[0])} />
              </div>}
        </div>

        <div className="if-grid2">
          <Field label={t('assets.timing.l')}>
            <select className="if-select" value={state.timing || ''} onChange={(e) => set('timing', e.target.value)}>
              <option value="" disabled>—</option>
              {timings.map(ti => <option key={ti.id} value={ti.id}>{px(ti, lang)}</option>)}
            </select>
          </Field>
          <Field label={t('assets.notes.l')} optionalText={t('optional')}>
            <TextArea value={state.notes} onChange={v => set('notes', v)} placeholder={t('assets.notes.ph')} />
          </Field>
        </div>
      </div>
    );
  }

  function Contact({ t, lang, state, set, errors }) {
    const regions = window.INTAKE.REGIONS;
    return (
      <div>
        <span className="if-kicker">{t('step.contact')}</span>
        <h2 className="if-h">{t('contact.h')}</h2>
        <p className="if-sub">{t('contact.p')}</p>
        <div className="if-grid2">
          <Field label={t('contact.name.l')} error={errors.name && t('err.required')}>
            <TextInput value={state.name} onChange={v => set('name', v)} placeholder={t('contact.name.ph')} bad={errors.name} />
          </Field>
          <Field label={t('contact.company.l')} error={errors.company && t('err.required')}>
            <TextInput value={state.company} onChange={v => set('company', v)} placeholder={t('contact.company.ph')} bad={errors.company} />
          </Field>
        </div>
        <Field label={t('contact.email.l')} error={errors.email && (errors.email === 'fmt' ? t('err.email') : t('err.required'))}>
          <TextInput value={state.email} onChange={v => set('email', v)} placeholder={t('contact.email.ph')} type="email" bad={errors.email} />
        </Field>
        <Field label={t('contact.region.l')}>
          <select className="if-select" value={state.region || ''} onChange={(e) => set('region', e.target.value)}>
            <option value="" disabled>—</option>
            {regions.map(r => <option key={r.id} value={r.id}>{px(r, lang)}</option>)}
          </select>
        </Field>
        <div className="if-consent" onClick={() => set('consent', !state.consent)}>
          <span className="if-box">{state.consent ? <I.check/> : null}</span>
          <span className="cl">{t('contact.consent.l')}</span>
        </div>
      </div>
    );
  }

  window.IFIcons = I;
  window.IFhelpers = { px };
  window.IFSteps = { Lane, Plan, Offer, Creative, Assets, Contact };
})();
