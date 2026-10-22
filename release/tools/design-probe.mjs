// Browser-side design-quality screening for pre-handoff-check.mjs (release/references/design-quality.md).
// Playwright serialises this function into the page, so every helper must live inside it. This moves it
// here from pre-handoff-check.mjs so it can be tested in a real browser.
export function designProbe() {
  const visible = e => { const r = e.getBoundingClientRect(), c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.display !== 'none'; };
  // one composed-tree list (open shadow roots included) for every counter below.
  const composed = [];
  const walkComposed = root => { for (const el of root.querySelectorAll('*')) { composed.push(el); if (el.shadowRoot) walkComposed(el.shadowRoot); } };
  if (document.body) walkComposed(document.body);
  const sections = composed.filter(e => e.matches('section')).filter(visible);
  const centered = sections.filter(e => { const c = getComputedStyle(e); return c.textAlign === 'center' && e.getBoundingClientRect().width > 300; }).length;
  const sizes = [...new Set(composed.filter(visible).map(e => getComputedStyle(e).fontSize))];
  const pageArea = Math.max(document.documentElement.scrollHeight, innerHeight) * document.documentElement.clientWidth;
  const rects = composed.filter(visible).map(e => ({e,r:e.getBoundingClientRect(),c:getComputedStyle(e)}));
  // colours are normalised by a detached canvas, never by an element in the page, so page CSS
  // (span{color:...!important}) cannot change what "the accent" is.
  const ctx = document.createElement('canvas').getContext('2d');
  const norm = value => { ctx.fillStyle = '#010203'; ctx.fillStyle = value; const out = ctx.fillStyle; ctx.fillStyle = '#030201'; ctx.fillStyle = value; return out === ctx.fillStyle ? out : null; };
  // Style Dictionary emits --colors-accent / --colors-primary; a hand-declared --accent wins.
  // the measured accent is the first VALID candidate, and the check fails closed: if any candidate is
  // declared with a value that is not a colour, or none is declared, the ratios are null and the handoff gate fails.
  const declared = ['--accent', '--colors-accent', '--colors-primary'].map(name => ({ name, value: getComputedStyle(document.documentElement).getPropertyValue(name).trim() })).filter(({value}) => value).map(v => ({ ...v, colour: norm(v.value) }));
  const accentInvalid = declared.filter(({colour}) => !colour).map(({name}) => name);
  const chosen = declared.find(({colour}) => colour) ?? null;
  const accentVar = chosen?.name ?? null, accent = chosen?.value ?? '';
  const accentComputed = chosen && accentInvalid.length === 0 ? chosen.colour : null;
  const painted = accentComputed ? rects.filter(({c}) => norm(c.backgroundColor) === accentComputed) : [];
  const accentArea = accentComputed ? painted.reduce((sum,{r}) => sum + Math.max(0, Math.min(r.width, innerWidth)) * r.height, 0) : null;
  const accentViewportArea = accentComputed ? painted.reduce((sum,{r}) => sum + Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0)) * Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)), 0) : null;
  const gradients = rects.filter(({c}) => c.backgroundImage.includes('gradient(')).length;
  const heroGradient = composed.filter(e => e.matches('main > section:first-child, main > header:first-child, .hero, [data-hero]')).some(e => getComputedStyle(e).backgroundImage.includes('gradient('));
  // glass is counted on html, body, every visible element and its rendered ::before/::after.
  // Any declared backdrop filter other than none is glass, rendered by Chrome or not: Chrome drops the
  // -webkit-backdrop-filter alias at parse time (Safari renders it) and computes none on the root element, so the raw
  // text of style attributes and <style> elements is scanned too; pre-handoff-check scans every served CSS/HTML file.
  const filtered = c => !!c && c.backdropFilter && c.backdropFilter !== 'none';
  const rendered = c => c.content !== 'none' && c.content !== 'normal';
  const glassRaw = /(?:-webkit-)?backdrop-filter\s*:\s*(?!\s*none\s*(?:;|\}|!|$))[^;}]+/i;
  // comments are removed and CSS escapes resolved (backdrop\2d filter parses as the property) before matching.
  const stripComments = text => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\\([0-9a-fA-F]{1,6})[ \t\n\r\f]?/g, (_, h) => { try { return String.fromCodePoint(parseInt(h, 16)); } catch { return ''; } }).replace(/\\([^\n0-9a-fA-F])/g, '$1');
  const glassNodes = [document.documentElement, document.body, ...rects.map(({e}) => e)].filter(Boolean);
  let glass = glassNodes.filter(e => filtered(getComputedStyle(e)) || ['::before', '::after'].some(pseudo => { const c = getComputedStyle(e, pseudo); return rendered(c) && filtered(c); })).length
    + [...document.querySelectorAll('[style]')].filter(e => glassRaw.test(stripComments(e.getAttribute('style') || '')) && !filtered(getComputedStyle(e))).length
    + [...document.querySelectorAll('style')].filter(e => glassRaw.test(stripComments(e.textContent))).length
    + sheetGlass(document);
  // open shadow roots and same-origin frames are screened the same way (computed on every
  // element and rendered pseudo-element, style attributes, <style> text and constructed stylesheets). Closed shadow
  // roots cannot be reached from script; cross-origin frames are blocked by the checker and are counted as unscanned.
  // ordinary CSSOM sheets are read too (parsed rules keep a root-element filter that computes to none); a
  // sheet whose rules cannot be read is left to the checker's served-file scan, a constructed one counts.
  function sheetGlass(scope) { let n = 0; for (const sheet of scope.adoptedStyleSheets || []) { try { if (glassRaw.test(stripComments([...sheet.cssRules].map(r => r.cssText).join('\n')))) n++; } catch { n++; } } for (const sheet of scope.styleSheets || []) { try { if (glassRaw.test([...sheet.cssRules].map(r => r.cssText).join('\n'))) n++; } catch {} } return n; }
  const scopes = [], unscannedFrames = [];
  const visit = (root, inFrame) => {
    for (const el of root.querySelectorAll('*')) {
      if (el.shadowRoot) { scopes.push({ root: el.shadowRoot, kind: 'shadow' }); visit(el.shadowRoot, inFrame); }
      // every element that can hold a nested document counts as a frame.
      if (el.matches('iframe, frame, object, embed, fencedframe, portal')) { let doc = null; try { doc = el.contentDocument; } catch {} if (doc?.documentElement) { scopes.push({ root: doc, kind: 'frame' }); visit(doc, true); } else unscannedFrames.push(el.getAttribute('src') || el.tagName.toLowerCase()); }
    }
  };
  visit(document, false);
  const scopeGlass = root => { const els = [...root.querySelectorAll('*')]; return els.filter(e => { const view = e.ownerDocument.defaultView || window; return filtered(view.getComputedStyle(e)) || ['::before', '::after'].some(pseudo => { const c = view.getComputedStyle(e, pseudo); return rendered(c) && filtered(c); }); }).length + els.filter(e => e.hasAttribute('style') && glassRaw.test(stripComments(e.getAttribute('style') || '')) && !filtered((e.ownerDocument.defaultView || window).getComputedStyle(e))).length + els.filter(e => e.tagName === 'STYLE' && glassRaw.test(stripComments(e.textContent))).length + sheetGlass(root); };
  const glassInScopes = scopes.reduce((n, { root }) => n + scopeGlass(root), 0);
  glass += glassInScopes;
  const glassScopes = { shadowRoots: scopes.filter(x => x.kind === 'shadow').length, frames: scopes.filter(x => x.kind === 'frame').length, glassInScopes, unscannedFrames };
  // a centred icon trio is any visible container with exactly three visible item children that each
  // hold an icon, centred on the container or on every item (tags and wrappers do not exempt it), plus the
  // section rule (a centred section with exactly three icons) when no such row sits inside that section.
  const iconSel = 'svg, i, [class*="icon"]';
  const rows = composed.filter(visible).filter(e => {
    const items = [...e.children].filter(visible);
    if (items.length !== 3 || !items.every(item => item.matches(iconSel) || item.querySelector(iconSel))) return false;
    return getComputedStyle(e).textAlign === 'center' || items.every(item => getComputedStyle(item).textAlign === 'center');
  });
  const iconRows = rows.length + sections.filter(e => getComputedStyle(e).textAlign === 'center' && e.querySelectorAll(iconSel).length === 3 && !rows.some(r => e.contains(r))).length;
  const purpleBlue = rects.some(({c}) => /rgb\((?:1[0-5]\d|[2-9]\d),\s*(?:[0-9]|[1-9]\d),\s*(?:1[3-9]\d|2\d\d)\)/.test(c.backgroundColor)) && rects.some(({c}) => /rgb\((?:[0-9]|[1-9]\d),\s*(?:[0-9]|[1-9]\d),\s*(?:1[3-9]\d|2\d\d)\)/.test(c.backgroundColor));
  const shadowText = composed.filter(e => e.shadowRoot).flatMap(e => [...e.shadowRoot.children].filter(c => !['STYLE', 'SCRIPT', 'TEMPLATE'].includes(c.tagName)).map(c => c.innerText || ''));
  // authored native strings are copy too: button-type input values, placeholders, every option label of a
  // shown select (datalist options too) and accessible names (aria-label, alt, title) join the screened text, so the
  // placeholder and filler screens see them.
  const nativeText = composed.filter(visible).flatMap(e => [
    e.tagName === 'INPUT' && ['submit', 'reset', 'button'].includes(e.type) ? e.value : '',
    /^(INPUT|TEXTAREA)$/.test(e.tagName) ? e.getAttribute('placeholder') || '' : '',
    e.tagName === 'SELECT' ? [...new Set([...e.options].flatMap(o => [o.label, o.text]))].join('\n') : '', // an option displays its label
    e.getAttribute('aria-label') || '', e.tagName === 'IMG' ? e.getAttribute('alt') || '' : '', e.getAttribute('title') || '',
  ]).concat(composed.filter(e => e.tagName === 'DATALIST').flatMap(d => [...d.options].map(o => o.value || o.text))).filter(x => x && x.trim());
  const text = [document.body.innerText, ...shadowText, ...nativeText].join('\n');
  // every stylesheet (link, style, @import, constructed; open shadow roots too) is listed with its URL and
  // whether its rules could be read. The checker refuses data:/blob: sheets and fails any unreadable sheet it did
  // not serve and scan itself.
  const stylesheets = [];
  const listSheet = (sheet, owner) => { let rules = null; try { rules = [...sheet.cssRules]; } catch {} stylesheets.push({ href: sheet.href || null, owner, readable: rules !== null }); for (const r of rules || []) if (r.styleSheet) listSheet(r.styleSheet, 'import'); };
  for (const scope of [document, ...composed.filter(e => e.shadowRoot).map(e => e.shadowRoot)]) { for (const sh of scope.styleSheets || []) listSheet(sh, sh.ownerNode?.tagName?.toLowerCase() || 'sheet'); for (const sh of scope.adoptedStyleSheets || []) listSheet(sh, 'adopted'); }
  return { centered, typeSizes: sizes, accent, accentVar, accentInvalid, accentArea, accentRatio: accentArea === null ? null : accentArea / pageArea, accentViewportRatio: accentViewportArea === null ? null : accentViewportArea / (innerWidth * innerHeight), gradients, heroGradient, glass, glassScopes, iconRows, purpleBlue, visibleText: text, headlines: composed.filter(e => e.matches('h1,h2,[data-tagline]')).map(e => e.innerText), placeholders: /\[placeholder\]|lorem ipsum|\btbd\b/i.test(text), h1: composed.filter(e => e.matches('h1')).length, stylesheets }
}

// node side. True when CSS or HTML text declares a backdrop filter other than none, prefixed or
// not, outside comments. Used on every CSS/HTML file the checker serves, because Chrome discards the -webkit- alias.
export function rawGlass(text, kind = 'css') {
  // comments removed and CSS escapes resolved first. in HTML, JavaScript and SVG text any script form
  // also counts, with no colon needed (style.backdropFilter, style.webkitBackdropFilter, setProperty('-webkit-backdrop-
  // filter', ...), style['backdrop-filter']); only an explicit `: none` is not glass. Fail closed.
  // in HTML/JS/SVG, JavaScript string escapes (\xNN, \uNNNN, \u{...}) are decoded before matching.
  // CSS comment syntax inside a JavaScript string is not a comment, so the raw text and the comment-stripped text are
  // both matched and either match counts. Deliberate obfuscation beyond this is outside the threat model (references/design-method.md).
  const src = String(text);
  const strip = t => t.replace(/\/\*[\s\S]*?\*\//g, '');
  const cssUnescape = t => t.replace(/\\([0-9a-fA-F]{1,6})[ \t\n\r\f]?/g, (_, h) => { try { return String.fromCodePoint(parseInt(h, 16)); } catch { return ''; } }).replace(/\\([^\n0-9a-fA-F])/g, '$1');
  const code = h => { try { return String.fromCodePoint(parseInt(h, 16)); } catch { return ''; } };
  const jsUnescape = t => t.replace(/\\u\{([0-9a-fA-F]{1,6})\}/g, (_, h) => code(h)).replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => code(h)).replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => code(h));
  const declared = t => /(?:-webkit-)?backdrop-filter\s*:\s*(?!\s*none\s*(?:;|\}|!|$|["'`]))[^;}]+/i.test(t);
  if (kind === 'css') return declared(cssUnescape(strip(src)));
  const script = t => declared(t) || /\b[wW]ebkitBackdropFilter\b|\bbackdropFilter\b/.test(t) || /(?:-webkit-)?backdrop-filter(?!\s*:\s*none\b)/i.test(t);
  return [src, strip(src)].some(t => script(jsUnescape(t)) || script(cssUnescape(jsUnescape(t))));
}

// Browser side: a colour normalised by a detached canvas (as in designProbe), or null.
export function normColour(value) {
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.fillStyle = '#010203'; ctx.fillStyle = String(value ?? ''); const out = ctx.fillStyle;
  ctx.fillStyle = '#030201'; ctx.fillStyle = String(value ?? ''); return out === ctx.fillStyle ? out : null;
}

// Node side. The accent fails closed at final handoff: an invalid or missing accent variable, an unreadable approved
// token, or a page accent that is not the approved palette colour FAILS, with a message naming the variable. The
// wireframe phase (grayscale by plan) records DEFERRED, never PASS. The area ratios stay a DOM background-area proxy
// (approximate; screenshot review required) and are gated separately. No interactive-element requirement .
export function accentCheck({ design, approved, pageColour, approvedColour, phase }) {
  const base = { variable: design.accentVar, value: design.accent || null, approvedToken: approved?.token ?? null, approvedValue: approved?.value ?? null, areaBasis: 'DOM background-area proxy: approximate; overlapping or transformed boxes are not pixel-measured' };
  let message = null;
  if (design.accentInvalid?.length) message = `accent variable ${design.accentInvalid.join(', ')} is not a valid colour`;
  else if (!design.accentVar) message = 'no accent variable declared (--accent, --colors-accent or --colors-primary)';
  else if (approved?.error || !approved?.value) message = `approved accent token unavailable: ${approved?.error || 'missing'}`;
  else if (!approvedColour) message = `approved accent token ${approved.token} (${approved.value}) is not a valid colour`;
  else if (pageColour !== approvedColour) message = `accent variable ${design.accentVar} (${design.accent}) does not match the approved token ${approved.token} (${approved.value})`;
  if (phase === 'wireframe') return { ...base, status: 'DEFERRED', message: message ?? 'accent identity deferred to the styled handoff', pass: true };
  return { ...base, status: message ? 'FAIL' : 'PASS', message, pass: !message };
}
