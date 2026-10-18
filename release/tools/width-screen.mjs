// width-screen.mjs: R8, ported from codex/fannan-r3-review 2733317 (release/tools/browser-probes.mjs screenWidths/inspectLayout).
// Screening only: renders the page at every declared desktop width plus 320 CSS px (desktop 400% reflow equivalent) and
// flags horizontal overflow, clipped or ellipsised text, and a language/direction mismatch. Actual zoom, text spacing,
// WCAG reflow exceptions and layout quality still need manual evidence. 320 px is not a mobile design approval.
export const REFLOW_WIDTH = 320;

// R11 (Asad panel S3, panel D1 decision B): WCAG 1.4.10 excuses only the smallest region whose usage or meaning needs a
// two-dimensional layout. At the 320 px reflow width, ordinary text or media that overflows a sideways scroller (left
// or right) fails. A table, pre, code, role=grid/table with real rows, or an element marked data-fannan-2d="<reason>"
// is only a CANDIDATE: it is recorded with its element and reason, never excused automatically. A candidate's
// scroller must fit inside 320 px and be keyboard-usable (tabindex or a focusable child), and an unresolved candidate
// blocks the final handoff (resolveReflowCandidates). Resizable media (img, svg, video, canvas, iframe) is not a
// candidate unless it sits inside a marked data-fannan-2d region. No count caps.
export const TWO_D = 'table, pre, code, [role="grid"], [role="table"], [data-fannan-2d]';

export function inspectLayout({ reflow = false } = {}) {
  const TWO_D = 'table, pre, code, [role="grid"], [role="table"], [data-fannan-2d]';
  const clipped = [], offscreenLeft = [], scrolledText = [], reflowCandidates = [];
  // ARGON-R5-05: visually hidden (sr-only) content is not a clip: a box of at most 1x1 px, or clip: rect(0...) / clip-path inset(50%).
  const srOnly = (r, c) => (r.width <= 1 && r.height <= 1) || /^rect\(0(px)?,? 0(px)?,? 0(px)?,? 0(px)?\)$/.test(c.clip) || c.clipPath === 'inset(50%)';
  const focusable = e => e.matches('a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])');
  const inHorizontalScroller = e => { for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) if (['auto', 'scroll'].includes(getComputedStyle(a).overflowX)) return true; return false; };
  const beyond = (e, r) => [...e.querySelectorAll('*')].some(d => { const b = d.getBoundingClientRect(); return b.width > 0 && b.height > 0 && (b.right > r.right + 1 || b.left < r.left - 1); });
  // ARGON-R5-02: body is screened too, so html + body overflow hidden/clip cannot hide a wide layout.
  for (const e of document.querySelectorAll('body, body *')) {
    const c = getComputedStyle(e), r = e.getBoundingClientRect();
    if (!r.width || !r.height || c.visibility === 'hidden' || c.display === 'none' || srOnly(r, c)) continue;
    const media = e.matches('img, svg, video, canvas, iframe, input, select, textarea, button');
    if (!e.textContent.trim() && !media) continue;
    // overflow: clip makes no scroll container, so scrollWidth stays at clientWidth; measure what the box cuts off instead.
    const x = (e.scrollWidth > e.clientWidth + 1 && ['hidden', 'clip'].includes(c.overflowX)) || (c.overflowX === 'clip' && beyond(e, r));
    const y = e.scrollHeight > e.clientHeight + 1 && ['hidden', 'clip'].includes(c.overflowY);
    // CODEX-R4-04: ellipsis styling alone is not a clip; only text that actually overflows a hidden/clip box is recorded.
    if (e.textContent.trim() && (x || y)) clipped.push({ tag: e.tagName, slot: e.getAttribute('data-copy-slot'), x, y, ellipsis: x && c.textOverflow === 'ellipsis' });
    // ARGON-R5-05: text or media pushed past the left edge is lost (no scrollbar reaches it). Exempt: items inside a
    // horizontal scroller, and the off-screen skip-link pattern (a focusable absolute/fixed element wholly left of the
    // viewport that appears on focus; the focus probe checks it is visible when focused).
    if (r.left < -1 && e !== document.body && !inHorizontalScroller(e) && !(focusable(e) && ['absolute', 'fixed'].includes(c.position) && r.right <= 0)) offscreenLeft.push({ tag: e.tagName, slot: e.getAttribute('data-copy-slot'), left: Math.round(r.left) });
  }
  if (reflow) {
    const ownContent = d => d.matches('img, svg, video, canvas, iframe, input, select, textarea, button') || [...d.childNodes].some(n => n.nodeType === 3 && n.nodeValue.trim());
    const label = el => el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '');
    const contentRects = d => { if (d.matches('img, svg, video, canvas, iframe, input, select, textarea, button')) return [d.getBoundingClientRect()]; return [...d.childNodes].filter(n => n.nodeType === 3 && n.nodeValue.trim()).map(n => { const range = document.createRange(); range.selectNodeContents(n); return range.getBoundingClientRect(); }); };
    const candidateOf = (d, scroller) => { for (let t = d.closest(TWO_D); t; t = t.parentElement?.closest(TWO_D)) { if (t !== scroller && !scroller.contains(t)) return null; if (!t.matches('[role="grid"], [role="table"]') || t.querySelector('[role="row"]') || t.matches('[data-fannan-2d]')) return t; } return null; };
    for (const e of document.querySelectorAll('body, body *')) {
      const c = getComputedStyle(e);
      if (!['auto', 'scroll'].includes(c.overflowX) || e.scrollWidth <= e.clientWidth + 1 || c.display === 'none' || c.visibility === 'hidden') continue;
      const box = e.getBoundingClientRect();
      // the content itself is measured (text-node ranges, or the media box), so text overflowing its own box counts too
      const over = [...e.querySelectorAll('*')].filter(d => ownContent(d) && contentRects(d).some(b => b.width > 0 && b.height > 0 && (b.right > box.right + 1 || b.left < box.left - 1)));
      const plain = over.filter(d => !candidateOf(d, e));
      if (!over.length) continue; // only padding or empty boxes overflow
      if (plain.length) { scrolledText.push({ tag: e.tagName, slot: e.getAttribute('data-copy-slot'), sample: (plain[0].textContent || plain[0].tagName).trim().slice(0, 60) }); continue; }
      const keyboard = (e.hasAttribute('tabindex') && e.tabIndex >= 0) || !!e.querySelector('a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])');
      for (const t of new Set(over.map(d => candidateOf(d, e)))) {
        const marked = t.closest('[data-fannan-2d]');
        const reason = marked ? (marked.getAttribute('data-fannan-2d') || '').trim() || null : (t.getAttribute('role') || t.tagName.toLowerCase());
        reflowCandidates.push({ element: label(t), id: t.id || null, reason, scroller: label(e), fits: box.left >= -1 && box.right <= innerWidth + 1, keyboard });
      }
    }
  }
  const root = document.documentElement, body = document.body;
  const documentWidth = Math.max(root.scrollWidth, body ? body.scrollWidth : 0);
  return { width: innerWidth, documentWidth, horizontalOverflow: documentWidth > root.clientWidth + 1, clipped, offscreenLeft, scrolledText, reflowCandidates, lang: root.lang, dir: getComputedStyle(root).direction };
}

export const validWidths = widths => Array.isArray(widths) && widths.length > 0 && widths.includes(1440) && widths.every(w => Number.isInteger(w) && w > 0) && new Set(widths).size === widths.length;

// expected: { lang, dir } for a declared state, or null for the positional page (language checked per state).
export async function screenWidths(page, widths, expected = null, height = 900) {
  if (!validWidths(widths)) return { results: [], pass: false, error: 'settings.desktopWidths invalid; no width screened' };
  const results = [];
  try {
    for (const width of [...widths, ...(widths.includes(REFLOW_WIDTH) ? [] : [REFLOW_WIDTH])]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => scrollTo(0, 0));
      const result = await page.evaluate(inspectLayout, { reflow: width === REFLOW_WIDTH });
      const language = !expected || (result.lang === expected.lang && result.dir === expected.dir);
      results.push({ ...result, purpose: widths.includes(width) ? 'declared desktop width' : 'desktop accessibility reflow (400% of 1280); not mobile approval', pass: !result.horizontalOverflow && result.clipped.length === 0 && result.offscreenLeft.length === 0 && result.scrolledText.length === 0 && result.reflowCandidates.every(c => c.fits && c.keyboard) && language });
    }
  } finally {
    await page.setViewportSize({ width: 1440, height });
  }
  return { results, pass: results.every(r => r.pass), note: 'Automated width screen only; 320 CSS px approximates a 1280 px desktop at 400% zoom. Actual zoom, text spacing and WCAG reflow exceptions still require manual evidence; every reflow candidate needs a recorded decision.' };
}

// R11 panel D1 (decisions B, T2): a candidate is resolved only by a handoff `reflowExceptions` entry naming its element
// id, a non-empty reason and a reviewer who holds the qaGate or approver role. Anything else stays unresolved, and an
// unresolved candidate BLOCKS the final handoff (recorded, not failed, in the wireframe phase).
export function resolveReflowCandidates(candidates, handoff, phase = 'handoff') {
  const roles = [handoff?.settings?.roles?.qaGate, handoff?.settings?.roles?.approver].filter(r => typeof r === 'string' && r.trim());
  const entries = Array.isArray(handoff?.reflowExceptions) ? handoff.reflowExceptions : [];
  const seen = new Map();
  for (const c of candidates) { const key = `${c.element}|${c.scroller}`; if (!seen.has(key)) seen.set(key, c); }
  const recorded = [...seen.values()].map(c => {
    const entry = c.id ? entries.find(x => x?.id === c.id) : null;
    const why = !c.id ? 'candidate has no element id to resolve' : !entry ? 'no reflowExceptions entry for this id' : !(typeof entry.reason === 'string' && entry.reason.trim()) ? 'reflowExceptions entry has no reason' : !roles.includes(entry.reviewer) ? 'reflowExceptions reviewer is not the qaGate or approver' : !c.reason ? 'data-fannan-2d reason is blank' : null;
    return { ...c, resolved: !why, decision: entry && !why ? { reason: entry.reason.trim(), reviewer: entry.reviewer } : null, unresolvedBecause: why };
  });
  const unresolved = recorded.filter(c => !c.resolved);
  return { candidates: recorded, unresolved: unresolved.length, status: phase === 'wireframe' ? 'DEFERRED' : unresolved.length ? 'FAIL' : 'PASS', pass: phase === 'wireframe' || unresolved.length === 0 };
}
