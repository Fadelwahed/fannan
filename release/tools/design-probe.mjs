// Browser-side screening for pre-handoff-check.mjs (release/references/design-quality.md): accent token identity,
// frames, placeholders and the single h1. Visual style is judged by the designer and the critic, not counted here.
// Playwright serialises this function into the page, so every helper must live inside it. This moves it
// here from pre-handoff-check.mjs so it can be tested in a real browser.
export function designProbe() {
  const visible = e => { const r = e.getBoundingClientRect(), c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.display !== 'none'; };
  // one composed-tree list (open shadow roots included) for every counter below.
  const composed = [];
  const walkComposed = root => { for (const el of root.querySelectorAll('*')) { composed.push(el); if (el.shadowRoot) walkComposed(el.shadowRoot); } };
  if (document.body) walkComposed(document.body);
  // colours are normalised by a detached canvas, never by an element in the page, so page CSS
  // (span{color:...!important}) cannot change what "the accent" is.
  const ctx = document.createElement('canvas').getContext('2d');
  const norm = value => { ctx.fillStyle = '#010203'; ctx.fillStyle = value; const out = ctx.fillStyle; ctx.fillStyle = '#030201'; ctx.fillStyle = value; return out === ctx.fillStyle ? out : null; };
  // Style Dictionary emits --colors-accent / --colors-primary; a hand-declared --accent wins. The accent is a token
  // validity check only (it must be the approved token, see accentCheck); how much of it a design uses is a design decision.
  const declared = ['--accent', '--colors-accent', '--colors-primary'].map(name => ({ name, value: getComputedStyle(document.documentElement).getPropertyValue(name).trim() })).filter(({value}) => value).map(v => ({ ...v, colour: norm(v.value) }));
  const accentInvalid = declared.filter(({colour}) => !colour).map(({name}) => name);
  const chosen = declared.find(({colour}) => colour) ?? null;
  const accentVar = chosen?.name ?? null, accent = chosen?.value ?? '';
  // frames: axe and the probes run in the main document only, so every element that can hold a nested document is
  // counted (readable same-origin frames and unreadable ones alike); the checker blocks the final handoff on any.
  const frames = [], unscannedFrames = [];
  const visit = root => {
    for (const el of root.querySelectorAll('*')) {
      if (el.shadowRoot) visit(el.shadowRoot);
      if (el.matches('iframe, frame, object, embed, fencedframe, portal')) { let doc = null; try { doc = el.contentDocument; } catch {} if (doc?.documentElement) { frames.push(el.getAttribute('src') || el.tagName.toLowerCase()); visit(doc); } else unscannedFrames.push(el.getAttribute('src') || el.tagName.toLowerCase()); }
    }
  };
  visit(document);
  const frameScopes = { frames: frames.length, unscannedFrames };
  const shadowText = composed.filter(e => e.shadowRoot).flatMap(e => [...e.shadowRoot.children].filter(c => !['STYLE', 'SCRIPT', 'TEMPLATE'].includes(c.tagName)).map(c => c.innerText || ''));
  // authored native strings are copy too: button-type input values, placeholders, every option label of a
  // shown select (datalist options too) and accessible names (aria-label, alt, title) join the screened text, so the
  // placeholder screen sees them.
  const nativeText = composed.filter(visible).flatMap(e => [
    e.tagName === 'INPUT' && ['submit', 'reset', 'button'].includes(e.type) ? e.value : '',
    /^(INPUT|TEXTAREA)$/.test(e.tagName) ? e.getAttribute('placeholder') || '' : '',
    e.tagName === 'SELECT' ? [...new Set([...e.options].flatMap(o => [o.label, o.text]))].join('\n') : '', // an option displays its label
    e.getAttribute('aria-label') || '', e.tagName === 'IMG' ? e.getAttribute('alt') || '' : '', e.getAttribute('title') || '',
  ]).concat(composed.filter(e => e.tagName === 'DATALIST').flatMap(d => [...d.options].map(o => o.value || o.text))).filter(x => x && x.trim());
  const text = [document.body.innerText, ...shadowText, ...nativeText].join('\n');
  return { accent, accentVar, accentInvalid, frameScopes, placeholders: /\[placeholder\]|lorem ipsum|\btbd\b/i.test(text), h1: composed.filter(e => e.matches('h1')).length };
}

// Browser side: a colour normalised by a detached canvas (as in designProbe), or null.
export function normColour(value) {
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.fillStyle = '#010203'; ctx.fillStyle = String(value ?? ''); const out = ctx.fillStyle;
  ctx.fillStyle = '#030201'; ctx.fillStyle = String(value ?? ''); return out === ctx.fillStyle ? out : null;
}

// Node side. The accent fails closed at final handoff: an invalid or missing accent variable, an unreadable approved
// token, or a page accent that is not the approved palette colour FAILS, with a message naming the variable. The
// wireframe phase (grayscale by plan) records DEFERRED, never PASS. No area or coverage limit is measured.
export function accentCheck({ design, approved, pageColour, approvedColour, phase }) {
  const base = { variable: design.accentVar, value: design.accent || null, approvedToken: approved?.token ?? null, approvedValue: approved?.value ?? null };
  let message = null;
  if (design.accentInvalid?.length) message = `accent variable ${design.accentInvalid.join(', ')} is not a valid colour`;
  else if (!design.accentVar) message = 'no accent variable declared (--accent, --colors-accent or --colors-primary)';
  else if (approved?.error || !approved?.value) message = `approved accent token unavailable: ${approved?.error || 'missing'}`;
  else if (!approvedColour) message = `approved accent token ${approved.token} (${approved.value}) is not a valid colour`;
  else if (pageColour !== approvedColour) message = `accent variable ${design.accentVar} (${design.accent}) does not match the approved token ${approved.token} (${approved.value})`;
  if (phase === 'wireframe') return { ...base, status: 'DEFERRED', message: message ?? 'accent identity deferred to the styled handoff', pass: true };
  return { ...base, status: message ? 'FAIL' : 'PASS', message, pass: !message };
}
