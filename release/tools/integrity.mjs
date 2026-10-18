// R11 panel D1 (decisions C and T4), R12 M06-M08/M13/M17/M21: probe-integrity cross-checks for pre-handoff-check.mjs.
// The authoritative probes and axe run in the isolated probe world (probe-world.mjs: a CDP isolated world with its
// own globals and prototypes; Playwright has no public isolated-world evaluate, so CDP Page.createIsolatedWorld is
// used directly, Chromium only). On the positional page and on every declared state, three cross-checks run:
//  1. page world vs probe world: the full hard-fail vector (VECTOR) evaluated in the page's own world. A page that
//     patches the browser functions changes only its own world, so any difference is a tampering sign.
//  2. native functions: the page world's probe functions must still be native code (heuristic; a page can hide a
//     patch from Function.prototype.toString, which is why check 1 exists).
//  3. a JavaScript-off pass (javaScriptEnabled: false), diagnostic. First the content must be equivalent (the same
//     visible copy slots, h1 count, lang and dir); otherwise the diagnostic is INCOMPLETE and fails. Then every field
//     of the vector where the page with scripts off is worse fails, unless the handoff's `jsOffDifferences` records
//     that check for this screen, state and lang with a reason and a qaGate/approver reviewer.
// A vector that is missing a field or holds a non-finite or negative count is INCOMPLETE (never PASS). Contrast is a
// diagnostic computed by contrastProbe (axe does not complete with page scripts disabled in Chrome 155).
// R13 (panel round 13, threat model in release/FANNAN-PLAN.md): the vector is the canonical gate result (N11: every
// hard-fail input, per-width maps, ratios and scrolled-viewport accent; N12: contrast unknown and coverage), the
// content record carries slot and heading text (N13), a content difference is never PASS even with a reviewed
// waiver (N14: INCOMPLETE), tamperSigns is required (N19) and call/apply/bind/Reflect.apply are native-checked (N17).
// Browser side, page world: returns the names of probe functions that are no longer native.
export function nativeCheck() {
  const toString = Function.prototype.toString;
  const native = f => { try { return typeof f === 'function' && /\{\s*\[native code\]\s*\}\s*$/.test(toString.call(f)); } catch { return false; } };
  const desc = (o, k) => Object.getOwnPropertyDescriptor(o, k);
  const fns = {
    'Function.prototype.toString': toString,
    'window.getComputedStyle': window.getComputedStyle,
    'Element.prototype.getBoundingClientRect': Element.prototype.getBoundingClientRect,
    'Range.prototype.getBoundingClientRect': Range.prototype.getBoundingClientRect,
    'Document.prototype.querySelectorAll': Document.prototype.querySelectorAll,
    'Element.prototype.querySelectorAll': Element.prototype.querySelectorAll,
    'Element.prototype.matches': Element.prototype.matches,
    'Element.prototype.getAttribute': Element.prototype.getAttribute,
    'Element.prototype.closest': Element.prototype.closest,
    'Node.prototype.textContent (get)': desc(Node.prototype, 'textContent')?.get,
    'Element.prototype.scrollWidth (get)': desc(Element.prototype, 'scrollWidth')?.get,
    'CanvasRenderingContext2D.prototype.fillStyle (set)': desc(CanvasRenderingContext2D.prototype, 'fillStyle')?.set,
    'Array.prototype.filter': Array.prototype.filter,
    // R13 N17: the rAF wrapper binds call at install time; patched invocation helpers are a tamper sign as well.
    'Function.prototype.call': Function.prototype.call,
    'Function.prototype.apply': Function.prototype.apply,
    'Function.prototype.bind': Function.prototype.bind,
    'Reflect.apply': Reflect.apply,
  };
  return Object.entries(fns).filter(([, f]) => !native(f)).map(([name]) => name);
}

// Browser side (probe world): text whose colour against its resolved solid background falls below 4.5:1 (3:1 for
// large text). Backgrounds with images or non-sRGB colours are counted as unknown, not as passes.
// R16-GPT-01: compositing effects anywhere on the composed ancestor chain (above an opaque background too) are read:
// filter opacity() is composited like opacity; any other non-identity filter, a blend mode, a backdrop filter or a
// mask cannot be resolved, so the text is unknown and counted in contrastEffects (integrity is then INCOMPLETE).
// R16-GPT-02: native control text (input and textarea values or placeholders, button-type input labels, the
// selected option of a select) is measured too, with the placeholder colour where the placeholder shows.
// R17-GPT-02: a shown placeholder is measured with its own computed opacity composited onto its colour and with its
// own font size and weight. R17-MIMAR-02: the text colour is the computed -webkit-text-fill-color (it computes to
// the color value unless set). Anything this CSS pass misses is caught by the pixel backstop (visibility.mjs).
export function contrastProbe() {
  const parse = v => { const m = /^rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)$/.exec(v || ''); return m ? [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])] : null; };
  const lum = ([r, g, b]) => [r, g, b].map(c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }).reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
  let failures = 0, unknown = 0, checked = 0, effects = 0;
  // R14-GPT-02: the composed tree (open shadow roots); backgrounds resolve through slots and shadow hosts; text is
  // rendered when its own text ranges have area (display:contents and zero-size boxes included).
  const up = a => a.assignedSlot ?? a.parentElement ?? (a.getRootNode() instanceof ShadowRoot ? a.getRootNode().host : null);
  const all = []; const walk = root => { for (const el of root.querySelectorAll('*')) { all.push(el); if (el.shadowRoot) walk(el.shadowRoot); } }; if (document.body) walk(document.body);
  const textArea = el => [...el.childNodes].some(n => { if (n.nodeType !== 3 || !n.nodeValue.trim()) return false; const range = document.createRange(); range.selectNodeContents(n); return [...range.getClientRects()].some(b => b.width > 0 && b.height > 0); });
  const num = a => { const t = a.trim(); return t === '' ? 1 : t.endsWith('%') ? parseFloat(t) / 100 : parseFloat(t); };
  const IDENTITY = { brightness: 1, contrast: 1, saturate: 1, grayscale: 0, invert: 0, sepia: 0 };
  // [opacity multiplier from filter opacity(), resolvable?] for one computed style
  const effect = s => {
    let mult = 1, ok = true;
    const filter = s.filter || 'none';
    if (filter !== 'none') {
      const fn = /([a-z-]+)\(([^()]*)\)/g;
      if (filter.replace(fn, '').trim()) ok = false; // nested functions (drop-shadow colours, url()) are not resolved
      for (const [, name, arg] of filter.matchAll(fn)) {
        const v = num(arg);
        if (name === 'opacity' && v >= 0) mult *= Math.min(1, v);
        else if (name in IDENTITY && v === IDENTITY[name]) continue;
        else if ((name === 'blur' || name === 'hue-rotate') && parseFloat(arg) === 0) continue;
        else ok = false;
      }
    }
    for (const k of ['mixBlendMode']) if (s[k] && s[k] !== 'normal') ok = false;
    for (const k of ['backdropFilter', 'webkitBackdropFilter', 'maskImage', 'webkitMaskImage']) if (s[k] && s[k] !== 'none') ok = false;
    return [mult, ok];
  };
  const BUTTONISH = ['submit', 'reset', 'button'], NO_TEXT = ['hidden', 'checkbox', 'radio', 'range', 'color', 'file', 'image'];
  // displayed native-control text: { text, placeholder } or null
  const controlText = el => {
    if (el.tagName === 'INPUT') {
      const t = (el.type || 'text').toLowerCase();
      if (NO_TEXT.includes(t)) return null;
      if (BUTTONISH.includes(t)) return el.hasAttribute('value') ? (el.value.trim() ? { text: el.value } : null) : t === 'button' ? null : { text: t };
      return el.value.trim() ? { text: el.value } : el.placeholder.trim() ? { text: el.placeholder, placeholder: true } : null;
    }
    if (el.tagName === 'TEXTAREA') return el.value.trim() ? { text: el.value } : el.placeholder.trim() ? { text: el.placeholder, placeholder: true } : null;
    if (el.tagName === 'SELECT') { const o = el.selectedOptions?.[0]; return o && o.text.trim() ? { text: o.text } : null; }
    return null;
  };
  const boxed = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  for (const el of all) {
    const c = getComputedStyle(el);
    let colour, typo = c, own = 1;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) {
      const t = controlText(el);
      if (!t || c.visibility !== 'visible' || c.display === 'none' || !boxed(el)) continue;
      if (t.placeholder) { const ps = getComputedStyle(el, '::placeholder'); colour = ps.webkitTextFillColor || ps.color; own = Number(ps.opacity); typo = ps; }
      else colour = c.webkitTextFillColor || c.color;
    } else {
      if (![...el.childNodes].some(n => n.nodeType === 3 && n.nodeValue.trim())) continue;
      if (c.visibility !== 'visible' || c.display === 'none' || !textArea(el)) continue;
      colour = c.webkitTextFillColor || c.color;
    }
    // R15 A3: CSS opacity on the element and its composed ancestors is composited (premultiplied groups). The walk
    // over backgrounds stops at an opaque one only when no node from there up is translucent.
    const chain = []; for (let a = el; a; a = up(a)) { const s = getComputedStyle(a), [mult, ok] = effect(s); chain.push([s, Number(s.opacity) * mult, ok]); }
    if (chain.some(([, , ok]) => !ok)) { effects++; unknown++; continue; } // R16-GPT-01: never a silent pass
    const opaqueFrom = []; for (let i = chain.length - 1, all = true; i >= 0; i--) { all = all && chain[i][1] >= 1; opaqueFrom[i] = all ? 1 : 0; }
    const levels = []; let known = true;
    for (let i = 0; i < chain.length; i++) { const [s, op] = chain[i]; if (s.backgroundImage !== 'none') { known = false; break; } const bg = parse(s.backgroundColor); if (!bg || !(op >= 0 && op <= 1)) { known = false; break; } levels.push([bg, op]); if (bg[3] >= 1 && opaqueFrom[i] === 1) break; }
    const parsed = parse(colour), fg = parsed && own >= 0 && own <= 1 ? [parsed[0], parsed[1], parsed[2], parsed[3] * own] : null;
    if (!known || !fg) { unknown++; continue; }
    const pm = ([r, g, b, a]) => [r * a, g * a, b * a, a], fade = (x, o) => x.map(v => v * o), on = (top, under) => top.map((v, i) => v + under[i] * (1 - top[3]));
    let tx = on(pm(fg), pm(levels[0][0])), bx = pm(levels[0][0]);
    for (let i = 1; i < levels.length; i++) { const own = pm(levels[i][0]), o = levels[i - 1][1]; tx = on(fade(tx, o), own); bx = on(fade(bx, o), own); }
    const lastOp = levels.at(-1)[1], canvas = [255, 255, 255, 1], flat = x => on(fade(x, lastOp), canvas).slice(0, 3);
    const text = flat(tx), bg = flat(bx), [l1, l2] = [lum(text), lum(bg)].sort((x, y) => y - x), ratio = (l1 + 0.05) / (l2 + 0.05);
    const size = parseFloat(typo.fontSize), large = size >= 24 || (size >= 18.66 && Number(typo.fontWeight) >= 700);
    checked++; if (ratio < (large ? 3 : 4.5)) failures++;
  }
  return { contrastFailures: failures, contrastUnknown: unknown, contrastChecked: checked, contrastEffects: effects };
}

// Browser side: what makes two renderings equivalent content. R13 N13: each visible copy slot with its normalised
// visible text, every visible heading with its level and text (open shadow roots included), the h1 count, lang and
// dir; a JavaScript-off skeleton with empty fixed-size slots is therefore not equivalent.
// R14-GPT-01: an element is rendered when its computed style shows it and it has a box with area or rendered text
// ranges, so a display:contents or zero-size slot is compared by its text too (empty without JavaScript = differs).
export function contentProbe() {
  const rangeArea = e => { const range = document.createRange(); range.selectNodeContents(e); return [...range.getClientRects()].some(b => b.width > 0 && b.height > 0); };
  const shown = e => { const c = getComputedStyle(e); if (c.visibility !== 'visible' || c.display === 'none') return false; const r = e.getBoundingClientRect(); return (r.width > 0 && r.height > 0) || rangeArea(e); };
  const norm = x => (x || '').replace(/\s+/g, ' ').trim();
  const text = e => norm(e.innerText) || (getComputedStyle(e).display === 'contents' ? norm([...e.childNodes].map(n => n.nodeType === 3 ? n.nodeValue : n.innerText || '').join(' ')) : '');
  const all = []; const walk = root => { for (const el of root.querySelectorAll('*')) { all.push(el); if (el.shadowRoot) walk(el.shadowRoot); } }; if (document.body) walk(document.body);
  const slots = all.filter(e => e.hasAttribute('data-copy-slot') && shown(e)).map(e => [e.getAttribute('data-copy-slot'), text(e)]).sort((a, b) => (a[0] + '\u0000' + a[1]).localeCompare(b[0] + '\u0000' + b[1]));
  const headings = all.filter(e => /^H[1-6]$/.test(e.tagName) && shown(e)).map(e => [Number(e.tagName[1]), text(e)]);
  // R16-GPT-02: controls and named elements without text of their own: each shown form control, button, link,
  // image or element with an ARIA role or label is recorded with its accessible name (aria-labelledby, aria-label,
  // label elements, button value, alt, own text, title, placeholder) and its displayed value, placeholder or
  // selected option, so a label or value that only script fills makes the JavaScript-off content differ.
  const byId = (e, id) => (e.getRootNode().getElementById?.(id)) || document.getElementById(id);
  const nameOf = e => {
    const by = (e.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean).map(id => byId(e, id)).filter(Boolean).map(x => norm(x.textContent)).join(' ').trim();
    if (by) return by;
    const label = norm(e.getAttribute('aria-label')); if (label) return label;
    if (e.labels?.length) { const t = norm([...e.labels].map(l => l.textContent).join(' ')); if (t) return t; }
    if (e.tagName === 'INPUT' && ['submit', 'reset', 'button'].includes(e.type)) { const v = norm(e.value); if (v) return v; }
    if (e.tagName === 'IMG') { const alt = norm(e.getAttribute('alt')); if (alt) return alt; }
    if (!/^(INPUT|TEXTAREA|SELECT|IMG)$/.test(e.tagName)) { const t = text(e); if (t) return t; }
    return norm(e.getAttribute('title')) || norm(e.getAttribute('placeholder'));
  };
  // R17-GPT-01: the displayed value is recorded separately from the accessible name: a button-type input shows its
  // value (the browser's default label for submit and reset without one), so a value that only script supplies
  // differs with JavaScript off even when an aria-label keeps the name the same.
  const shownValue = e => {
    if (e.tagName === 'SELECT') return norm(e.selectedOptions?.[0]?.text);
    if (e.tagName === 'INPUT' && ['submit', 'reset', 'button'].includes(e.type)) return e.hasAttribute('value') ? norm(e.value) : e.type === 'button' ? '' : e.type;
    return /^(INPUT|TEXTAREA)$/.test(e.tagName) && !['hidden', 'checkbox', 'radio', 'range', 'color', 'file', 'image'].includes(e.type) ? norm(e.value) || norm(e.placeholder) : '';
  };
  const named = e => /^(INPUT|TEXTAREA|SELECT|BUTTON|IMG)$/.test(e.tagName) || (e.tagName === 'A' && e.hasAttribute('href')) || e.hasAttribute('role') || e.hasAttribute('aria-label') || e.hasAttribute('aria-labelledby');
  const controls = all.filter(e => named(e) && !(e.tagName === 'INPUT' && e.type === 'hidden') && shown(e)).map(e => [e.tagName.toLowerCase() + (e.tagName === 'INPUT' ? ':' + e.type : '') + (e.getAttribute('role') ? '[' + e.getAttribute('role') + ']' : ''), nameOf(e), shownValue(e)]);
  return { slots, headings, controls, h1: all.filter(e => e.tagName === 'H1').length, lang: document.documentElement.lang, dir: getComputedStyle(document.documentElement).direction };
}

// R12 M13: the reduced-motion rAF counter, installed by addInitScript in every frame. The counter is private (a
// closure), exposed only through a non-writable, non-configurable getter, and requestAnimationFrame is replaced by a
// non-writable, non-configurable wrapper, so page scripts cannot reset, freeze or bypass it. Child frames report to
// the top window through a non-configurable function.
export function rafCounterInit() {
  let count = 0;
  const lock = (o, k, d) => { try { Object.defineProperty(o, k, { configurable: false, enumerable: false, ...d }); } catch {} };
  if (window === window.top) { lock(window, '__fannanRafTick', { value: () => { count++; }, writable: false }); lock(window, '__raf', { get: () => count }); }
  let tick = () => {}; try { tick = window.top.__fannanRafTick || tick; } catch {}
  // R13 N17: the native rAF is bound at install time, so no later lookup of Function.prototype.call can capture it.
  const callNative = Function.prototype.call.bind(window.requestAnimationFrame);
  lock(window, 'requestAnimationFrame', { value: function requestAnimationFrame(cb) { try { tick(); } catch {} return callNative(window, cb); }, writable: false });
}

// R14-GPT-05: browser side, the reduced-motion snapshot. Every element of the composed tree (open shadow roots
// included), keyed by its composed path (tag:index at each level, '#shadow' into a shadow root), with its rounded box,
// transform and opacity, so two snapshots compare the same elements.
export function motionSnapshot() {
  const out = [];
  const walk = (root, path) => { [...root.children].forEach((e, i) => { const id = `${path}/${e.tagName}:${i}`; const r = e.getBoundingClientRect(), c = getComputedStyle(e); out.push(id + '=' + [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height), c.transform, c.opacity].join('|')); if (e.shadowRoot) walk(e.shadowRoot, id + '#shadow'); walk(e, id); }); };
  if (document.body) walk(document.body, 'body');
  return out;
}
// R14-GPT-05: elements whose entry changed between two snapshots, plus elements that disappeared.
export const motionChanges = (s1, s2) => { const before = new Set(s1); return s2.filter(v => !before.has(v)).length + Math.max(0, s1.length - s2.length); };

// R12 M13: a rAF reading that is not a finite non-negative number (tampering or a missing counter) counts as a loop.
export const rafLoopFrom = (before, after) => !(Number.isFinite(before) && Number.isFinite(after) && after >= before) || after - before > 10;

// R13 N11/N12: the vector is the canonical gate result. Types: count (non-negative integer), flag (boolean), text
// (string or null), ratio (finite non-negative number or null; null means the gate could not measure it), widths
// (per-width counts keyed by CSS width, so {1440:1, 320:0} and {1440:0, 320:1} differ) and coverage (a count that
// must match between worlds but is never "worse"; zero JavaScript-off contrast coverage makes the run INCOMPLETE).
export const VECTOR = { glass: 'count', h1: 'count', placeholders: 'flag', centered: 'count', typeSizes: 'count', heroGradient: 'flag', purpleBlue: 'flag', iconRows: 'count', accent: 'text', accentRatio: 'ratio', maxViewportAccent: 'ratio', filler: 'flag', ruleOfThree: 'flag', frames: 'count', stylesheetsUnscanned: 'count', spacingOffScale: 'count', horizontalOverflow: 'widths', clipped: 'widths', offscreenLeft: 'widths', unreachable: 'widths', scrolledText: 'widths', unmeasured: 'widths', unscannedScopes: 'widths', reflowFail: 'flag', contrastFailures: 'count', contrastUnknown: 'count', contrastChecked: 'coverage', contrastEffects: 'count', textMeasured: 'coverage', textObscured: 'count', textUnreadable: 'count', textUnmeasured: 'count' };
// R17: the rendered-visibility backstop (visibility.mjs) supplies textMeasured, textObscured, textUnreadable and
// textUnmeasured for each rendering.
export { visibilityScan, VISIBILITY } from './visibility.mjs';
export const VISIBILITY_FIELDS = ['textMeasured', 'textObscured', 'textUnreadable', 'textUnmeasured'];
export const INTEGRITY_CHECKS = [...Object.keys(VECTOR), 'content'];
const isCount = x => Number.isInteger(x) && x >= 0;
const validField = (t, x) => t === 'count' || t === 'coverage' ? isCount(x) : t === 'flag' ? typeof x === 'boolean' : t === 'text' ? typeof x === 'string' || x === null : t === 'ratio' ? x === null || (typeof x === 'number' && Number.isFinite(x) && x >= 0) : !!x && typeof x === 'object' && !Array.isArray(x) && Object.keys(x).length > 0 && Object.entries(x).every(([w, n]) => /^\d+$/.test(w) && isCount(n));
const validVector = v => !!v && typeof v === 'object' && Object.entries(VECTOR).every(([k, t]) => validField(t, v[k]));
const validContent = c => !!c && Array.isArray(c.slots) && c.slots.every(x => Array.isArray(x) && x.length === 2 && x.every(y => typeof y === 'string')) && Array.isArray(c.headings) && c.headings.every(x => Array.isArray(x) && x.length === 2 && Number.isInteger(x[0]) && typeof x[1] === 'string') && isCount(c.h1) && typeof c.lang === 'string' && typeof c.dir === 'string' && (c.controls === undefined || (Array.isArray(c.controls) && c.controls.every(x => Array.isArray(x) && x.length === 3 && x.every(y => typeof y === 'string'))));
const canon = x => JSON.stringify(x && typeof x === 'object' && !Array.isArray(x) ? Object.keys(x).sort((a, b) => a - b).map(k => [k, x[k]]) : x);
const worseOff = (k, on, off) => {
  const t = VECTOR[k], a = on[k], b = off[k];
  if (t === 'count') return b > a;
  if (t === 'flag') return b && !a;
  if (t === 'text') return b !== a;
  if (t === 'ratio') return (a !== null && b === null) || (a !== null && b !== null && b > a + 1e-9);
  if (t === 'widths') return canon(Object.keys(a).sort()) !== canon(Object.keys(b).sort()) || Object.keys(b).some(w => b[w] > a[w]);
  return false; // coverage
};
const nonempty = x => typeof x === 'string' && !!x.trim();

// Node side. probe = isolated world, page = page world, jsOff = isolated world with page scripts disabled; each is
// { vector, content }. tamperSigns from nativeCheck (R13 N19: required; omitted, undefined or null is INCOMPLETE);
// scope = { screen, state, lang } of the rendering.
export function compareIntegrity({ probe, page, jsOff, tamperSigns, handoff, scope = { screen: null, state: null, lang: null } }) {
  const base = { scope, probeWorld: probe, pageWorld: page, jsOff, tamperSigns: tamperSigns ?? null };
  const incomplete = [probe, page, jsOff].flatMap((run, i) => [validVector(run?.vector) ? null : `${['probe world', 'page world', 'JavaScript off'][i]} vector incomplete`, validContent(run?.content) ? null : `${['probe world', 'page world', 'JavaScript off'][i]} content record incomplete`]).filter(Boolean);
  if (!Array.isArray(tamperSigns)) incomplete.push('native-function check incomplete');
  if (incomplete.length) return { ...base, mismatches: [], incomplete, expectedDifferences: [], postScriptDifferences: [], status: 'INCOMPLETE', pass: false };
  const mismatches = [], expected = [], recorded = [], notes = [];
  for (const name of tamperSigns) mismatches.push({ check: 'native', detail: `${name} is not native in the page world` });
  for (const k of Object.keys(VECTOR)) if (canon(page.vector[k]) !== canon(probe.vector[k])) mismatches.push({ check: k, detail: `page world ${canon(page.vector[k])}, probe world ${canon(probe.vector[k])}` });
  if (canon(page.content) !== canon(probe.content)) mismatches.push({ check: 'content', detail: 'page world and probe world see different content' });
  const roles = [handoff?.settings?.roles?.qaGate, handoff?.settings?.roles?.approver].filter(nonempty);
  const explain = check => (Array.isArray(handoff?.jsOffDifferences) ? handoff.jsOffDifferences : []).find(d => d?.check === check && d.screen === scope.screen && d.state === scope.state && d.lang === scope.lang && nonempty(d.reason) && roles.includes(d.reviewer));
  const differences = [];
  const sameContent = canon(jsOff.content) === canon(probe.content);
  if (!sameContent) differences.push({ check: 'content', detail: `with JavaScript off the content differs (slots ${jsOff.content.slots.length} vs ${probe.content.slots.length}, headings ${jsOff.content.headings.length} vs ${probe.content.headings.length}, controls ${(jsOff.content.controls || []).length} vs ${(probe.content.controls || []).length}, h1 ${jsOff.content.h1} vs ${probe.content.h1}, ${jsOff.content.lang}/${jsOff.content.dir} vs ${probe.content.lang}/${probe.content.dir}; text compared per slot and heading)` });
  for (const k of Object.keys(VECTOR)) {
    if (worseOff(k, probe.vector, jsOff.vector)) differences.push({ check: k, detail: `with JavaScript off ${k} is ${canon(jsOff.vector[k])} vs ${canon(probe.vector[k])}` });
    else if (worseOff(k, jsOff.vector, probe.vector)) recorded.push({ check: k, detail: `the scripted page is worse than JavaScript off (${k}); failed by the main check` });
  }
  // R13 N12: JavaScript-off text that could not be contrast-checked at all, where the scripted page could, proves nothing.
  if (jsOff.vector.contrastChecked === 0 && probe.vector.contrastChecked > 0) notes.push('JavaScript-off contrast coverage is zero; its contrast diagnostic proves nothing');
  // R16-GPT-01: text under a filter, blend mode, backdrop filter or mask that the probe cannot resolve, in either
  // rendering, is never a silent pass; the cross-check is INCOMPLETE (the main gates still fail glass).
  for (const [run, where] of [[probe, 'scripted page'], [jsOff, 'JavaScript-off page']]) if (run.vector.contrastEffects > 0) notes.push(`${where}: ${run.vector.contrastEffects} text element(s) under compositing effects the contrast probe cannot resolve`);
  // R17: the rendered-visibility backstop. Text the scripted page paints but leaves covered by another layer or below
  // the pixel readability floor fails outright; JavaScript-off text that is worse (obscured, unreadable or
  // unmeasurable where the scripted page painted it) is an integrity mismatch through the vector comparison above,
  // and a reviewed jsOffDifferences entry for it keeps the evidence but never makes it PASS (INCOMPLETE). Text that
  // cannot be measured in either rendering is INCOMPLETE.
  for (const k of ['textObscured', 'textUnreadable']) if (probe.vector[k] > 0) mismatches.push({ check: k, source: 'rendered', detail: `the scripted page paints ${probe.vector[k]} text element(s) ${k === 'textObscured' ? 'covered by another painted layer' : 'below the pixel readability floor'}` });
  for (const [run, where] of [[probe, 'scripted page'], [jsOff, 'JavaScript-off page']]) if (run.vector.textUnmeasured > 0) notes.push(`${where}: ${run.vector.textUnmeasured} text element(s) the visibility backstop cannot measure (no box, clipped to nothing, off-screen or too few pixels)`);
  for (const d of differences) { const e = explain(d.check); if (e) { expected.push({ ...d, reason: e.reason.trim(), reviewer: e.reviewer }); if (['textObscured', 'textUnreadable', 'textUnmeasured'].includes(d.check)) notes.push(`JavaScript-off ${d.check} differs (reviewed waiver recorded); text visible only with JavaScript is never PASS`); } else mismatches.push({ ...d, source: 'js-off' }); }
  // R12 M08, R13 N14: non-equivalent JavaScript-off content is never PASS. An unexplained difference is a mismatch;
  // a reviewed `content` entry is kept as evidence, but the JavaScript-off metrics stay unverified (INCOMPLETE).
  if (!sameContent) notes.push(explain('content') ? 'JavaScript-off content differs (reviewed waiver recorded); its metrics are unverified' : 'JavaScript-off content is not equivalent; its metrics prove nothing');
  // A between-world or native mismatch (a tampering sign) outranks INCOMPLETE; both fail.
  const status = mismatches.some(m => m.source !== 'js-off') ? 'integrity mismatch' : notes.length ? 'INCOMPLETE' : mismatches.length ? 'integrity mismatch' : 'PASS';
  return { ...base, mismatches, incomplete: notes, expectedDifferences: expected, postScriptDifferences: recorded, status, pass: status === 'PASS' };
}
