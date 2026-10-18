// R11 panel D1 (decisions C and T4): probe-integrity cross-checks for pre-handoff-check.mjs.
// The authoritative probes and axe run in the isolated probe world (probe-world.mjs: a CDP isolated world with its
// own globals and prototypes; Playwright has no public isolated-world evaluate, so CDP Page.createIsolatedWorld is
// used directly, Chromium only). Three cross-checks run on the positional page:
//  1. page world vs probe world: the same probes evaluated in the page's own world. A page that patches the browser
//     functions changes only its own world, so any difference on a hard-fail metric is a tampering sign.
//  2. native functions: the page world's probe functions must still be native code (heuristic; a page can hide a
//     patch from Function.prototype.toString, which is why check 1 exists).
//  3. a JavaScript-off pass (javaScriptEnabled: false), diagnostic: if the page with scripts off shows more glass or
//     fails the 320 px reflow screen where the scripted page passes, that difference fails unless the handoff records
//     it in `jsOffDifferences` with a reason (expected progressive enhancement). Differences where the scripted page
//     is worse are already failed by the main checks and are recorded only.
// Any unexplained difference or tampering sign is an `integrity mismatch` and fails both phases.
export const INTEGRITY_CHECKS = ['glass', 'reflow'];

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

const summary = run => ({ glass: run.glass, reflowPass: run.reflowPass, scrolledText: run.scrolledText });

// Node side. probe = isolated world, page = page world, jsOff = isolated world with page scripts disabled; each is
// { glass, reflowPass, scrolledText }. tamperSigns from nativeCheck.
export function compareIntegrity({ probe, page, jsOff, tamperSigns = [], handoff }) {
  const mismatches = [], expected = [], recorded = [];
  for (const name of tamperSigns) mismatches.push({ check: 'native', detail: `${name} is not native in the page world` });
  if (page.glass !== probe.glass) mismatches.push({ check: 'glass', detail: `page world counts ${page.glass} glass, probe world ${probe.glass}` });
  if (page.reflowPass !== probe.reflowPass || page.scrolledText !== probe.scrolledText) mismatches.push({ check: 'reflow', detail: `page world reflow ${page.reflowPass}/${page.scrolledText}, probe world ${probe.reflowPass}/${probe.scrolledText}` });
  const reasons = new Map((Array.isArray(handoff?.jsOffDifferences) ? handoff.jsOffDifferences : []).filter(d => INTEGRITY_CHECKS.includes(d?.check) && typeof d.reason === 'string' && d.reason.trim()).map(d => [d.check, d.reason.trim()]));
  const worse = { glass: jsOff.glass > probe.glass, reflow: !jsOff.reflowPass && probe.reflowPass };
  const better = { glass: jsOff.glass < probe.glass, reflow: jsOff.reflowPass && !probe.reflowPass };
  for (const check of INTEGRITY_CHECKS) {
    if (worse[check]) (reasons.has(check) ? expected : mismatches).push({ check, detail: `with JavaScript off: ${check === 'glass' ? `${jsOff.glass} glass vs ${probe.glass}` : 'the 320 px reflow screen fails'}`, ...(reasons.has(check) ? { reason: reasons.get(check) } : { source: 'js-off' }) });
    else if (better[check]) recorded.push({ check, detail: `the scripted page is worse than JavaScript off (${check}); failed by the main check` });
  }
  return { probeWorld: summary(probe), pageWorld: summary(page), jsOff: summary(jsOff), tamperSigns, mismatches, expectedDifferences: expected, postScriptDifferences: recorded, status: mismatches.length ? 'integrity mismatch' : 'PASS', pass: mismatches.length === 0, untested: 'contrast is not cross-checked with JavaScript off (axe does not complete with page scripts disabled in Chrome 155)' };
}
