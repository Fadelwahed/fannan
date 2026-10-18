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
  };
  return Object.entries(fns).filter(([, f]) => !native(f)).map(([name]) => name);
}

// Browser side (probe world): text whose colour against its resolved solid background falls below 4.5:1 (3:1 for
// large text). Backgrounds with images or non-sRGB colours are counted as unknown, not as passes.
export function contrastProbe() {
  const parse = v => { const m = /^rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)$/.exec(v || ''); return m ? [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])] : null; };
  const over = (top, under) => top.slice(0, 3).map((c, i) => c * top[3] + under[i] * (1 - top[3])).concat(1);
  const lum = ([r, g, b]) => [r, g, b].map(c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }).reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
  let failures = 0, unknown = 0, checked = 0;
  for (const el of document.querySelectorAll('body *')) {
    if (![...el.childNodes].some(n => n.nodeType === 3 && n.nodeValue.trim())) continue;
    const c = getComputedStyle(el), r = el.getBoundingClientRect();
    if (!r.width || !r.height || c.visibility === 'hidden' || c.display === 'none') continue;
    const layers = []; let known = true;
    for (let a = el; a; a = a.parentElement) { const s = getComputedStyle(a); if (s.backgroundImage !== 'none') { known = false; break; } const bg = parse(s.backgroundColor); if (!bg) { known = false; break; } if (bg[3] > 0) layers.push(bg); if (bg[3] >= 1) break; }
    const fg = parse(c.color);
    if (!known || !fg) { unknown++; continue; }
    const bg = layers.reverse().reduce((under, top) => over(top, under), [255, 255, 255, 1]);
    const text = over(fg, bg), [l1, l2] = [lum(text), lum(bg)].sort((x, y) => y - x), ratio = (l1 + 0.05) / (l2 + 0.05);
    const size = parseFloat(c.fontSize), large = size >= 24 || (size >= 18.66 && Number(c.fontWeight) >= 700);
    checked++; if (ratio < (large ? 3 : 4.5)) failures++;
  }
  return { contrastFailures: failures, contrastUnknown: unknown, contrastChecked: checked };
}

// Browser side: the visible copy slots, h1 count, lang and dir that make two renderings equivalent content.
export function contentProbe() {
  const shown = e => { const r = e.getBoundingClientRect(), c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.display !== 'none'; };
  return { slots: [...new Set([...document.querySelectorAll('[data-copy-slot]')].filter(shown).map(e => e.getAttribute('data-copy-slot')))].sort(), h1: document.querySelectorAll('h1').length, lang: document.documentElement.lang, dir: getComputedStyle(document.documentElement).direction };
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
  const native = window.requestAnimationFrame;
  lock(window, 'requestAnimationFrame', { value: function requestAnimationFrame(cb) { try { tick(); } catch {} return native.call(window, cb); }, writable: false });
}

// R12 M13: a rAF reading that is not a finite non-negative number (tampering or a missing counter) counts as a loop.
export const rafLoopFrom = (before, after) => !(Number.isFinite(before) && Number.isFinite(after) && after >= before) || after - before > 10;

export const VECTOR = { glass: 'count', h1: 'count', placeholders: 'flag', centered: 'count', typeSizes: 'count', heroGradient: 'flag', purpleBlue: 'flag', iconRows: 'count', accent: 'text', spacingOffScale: 'count', horizontalOverflow: 'flag', clipped: 'count', offscreenLeft: 'count', unreachable: 'count', scrolledText: 'count', unmeasured: 'count', reflowFail: 'flag', contrastFailures: 'count' };
export const INTEGRITY_CHECKS = [...Object.keys(VECTOR), 'content'];
const validVector = v => v && typeof v === 'object' && Object.entries(VECTOR).every(([k, t]) => t === 'count' ? Number.isInteger(v[k]) && v[k] >= 0 : t === 'flag' ? typeof v[k] === 'boolean' : typeof v[k] === 'string' || v[k] === null);
const validContent = c => c && Array.isArray(c.slots) && c.slots.every(x => typeof x === 'string') && Number.isInteger(c.h1) && c.h1 >= 0 && typeof c.lang === 'string' && typeof c.dir === 'string';
const worseOff = (k, on, off) => VECTOR[k] === 'count' ? off[k] > on[k] : VECTOR[k] === 'flag' ? off[k] && !on[k] : off[k] !== on[k];
const nonempty = x => typeof x === 'string' && !!x.trim();

// Node side. probe = isolated world, page = page world, jsOff = isolated world with page scripts disabled; each is
// { vector, content }. tamperSigns from nativeCheck; scope = { screen, state, lang } of the rendering.
export function compareIntegrity({ probe, page, jsOff, tamperSigns = [], handoff, scope = { screen: null, state: null, lang: null } }) {
  const base = { scope, probeWorld: probe, pageWorld: page, jsOff, tamperSigns };
  const incomplete = [probe, page, jsOff].flatMap((run, i) => [validVector(run?.vector) ? null : `${['probe world', 'page world', 'JavaScript off'][i]} vector incomplete`, validContent(run?.content) ? null : `${['probe world', 'page world', 'JavaScript off'][i]} content record incomplete`]).filter(Boolean);
  if (!Array.isArray(tamperSigns)) incomplete.push('native-function check incomplete');
  if (incomplete.length) return { ...base, mismatches: [], incomplete, expectedDifferences: [], postScriptDifferences: [], status: 'INCOMPLETE', pass: false };
  const mismatches = [], expected = [], recorded = [];
  for (const name of tamperSigns) mismatches.push({ check: 'native', detail: `${name} is not native in the page world` });
  for (const k of Object.keys(VECTOR)) if (page.vector[k] !== probe.vector[k]) mismatches.push({ check: k, detail: `page world ${JSON.stringify(page.vector[k])}, probe world ${JSON.stringify(probe.vector[k])}` });
  if (JSON.stringify(page.content) !== JSON.stringify(probe.content)) mismatches.push({ check: 'content', detail: 'page world and probe world see different content' });
  const roles = [handoff?.settings?.roles?.qaGate, handoff?.settings?.roles?.approver].filter(nonempty);
  const explain = check => (Array.isArray(handoff?.jsOffDifferences) ? handoff.jsOffDifferences : []).find(d => d?.check === check && d.screen === scope.screen && d.state === scope.state && d.lang === scope.lang && nonempty(d.reason) && roles.includes(d.reviewer));
  const differences = [];
  if (JSON.stringify(jsOff.content) !== JSON.stringify(probe.content)) differences.push({ check: 'content', detail: `with JavaScript off the content differs (slots ${jsOff.content.slots.join(',') || 'none'} vs ${probe.content.slots.join(',') || 'none'}, h1 ${jsOff.content.h1} vs ${probe.content.h1}, ${jsOff.content.lang}/${jsOff.content.dir} vs ${probe.content.lang}/${probe.content.dir})` });
  for (const k of Object.keys(VECTOR)) {
    if (worseOff(k, probe.vector, jsOff.vector)) differences.push({ check: k, detail: `with JavaScript off ${k} is ${JSON.stringify(jsOff.vector[k])} vs ${JSON.stringify(probe.vector[k])}` });
    else if (worseOff(k, jsOff.vector, probe.vector)) recorded.push({ check: k, detail: `the scripted page is worse than JavaScript off (${k}); failed by the main check` });
  }
  let contentUnexplained = false;
  for (const d of differences) { const e = explain(d.check); if (e) expected.push({ ...d, reason: e.reason.trim(), reviewer: e.reviewer }); else { mismatches.push({ ...d, source: 'js-off' }); if (d.check === 'content') contentUnexplained = true; } }
  const status = contentUnexplained ? 'INCOMPLETE' : mismatches.length ? 'integrity mismatch' : 'PASS';
  return { ...base, mismatches, incomplete: contentUnexplained ? ['JavaScript-off content is not equivalent; its metrics prove nothing'] : [], expectedDifferences: expected, postScriptDifferences: recorded, status, pass: status === 'PASS' };
}
