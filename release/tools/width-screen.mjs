import { resolveScoped } from './exceptions.mjs';
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
  const MEDIA = 'img, svg, video, canvas, iframe, frame, object, embed, fencedframe, portal, input, select, textarea, button';
  const NESTED = 'iframe, frame, object, embed, fencedframe, portal';
  const clipped = [], offscreenLeft = [], unreachable = [], scrolledText = [], reflowCandidates = [], unmeasured = [], unscannedScopes = [];
  // ARGON-R5-05: visually hidden (sr-only) content is not a clip: clip: rect(0...) / clip-path inset(50%), or a box of at
  // most 1x1 px. R13 N02: the tiny box counts as sr-only only when it also clips (overflow hidden/clip); text that
  // overflows a zero-size visible box is rendered and measured.
  const srOnly = (r, c) => (r.width <= 1 && r.height <= 1 && (['hidden', 'clip'].includes(c.overflowX) || ['hidden', 'clip'].includes(c.overflowY))) || /^rect\(0(px)?,? 0(px)?,? 0(px)?,? 0(px)?\)$/.test(c.clip) || c.clipPath === 'inset(50%)';
  const focusable = e => e.matches('a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])');
  const label = el => el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '');
  // R12 M11: the composed tree. Open shadow roots are walked (they share the page's coordinates); parents follow slots
  // and shadow hosts. Same-origin frames are measured as documents; a frame that cannot be read is an unscanned scope.
  const parentOf = el => el.assignedSlot ?? el.parentElement ?? (el.getRootNode() instanceof ShadowRoot ? el.getRootNode().host : null);
  const all = [];
  const walk = root => { for (const el of root.querySelectorAll('*')) { all.push(el); if (el.shadowRoot) walk(el.shadowRoot); } };
  if (document.body) { all.push(document.body); walk(document.body); }
  const within = (s, d) => { for (let a = d; a; a = parentOf(a)) if (a === s) return true; return false; };
  const ownText = el => [...el.childNodes].some(n => n.nodeType === 3 && n.nodeValue.trim());
  // the content itself is measured (text-node ranges, or the media box), so text overflowing its own box counts too
  const textRects = el => [...el.childNodes].filter(n => n.nodeType === 3 && n.nodeValue.trim()).map(n => { const range = document.createRange(); range.selectNodeContents(n); return range.getBoundingClientRect(); }).filter(b => b.width > 0 && b.height > 0);
  const contentRects = el => el.matches(MEDIA) ? [el.getBoundingClientRect()] : textRects(el);
  // R12 M14, R13 N02: hidden, undisplayed or sr-only content (on the element or a composed ancestor) is never
  // measured. Visibility comes from computed style plus geometry: an element box, or (display:contents, zero-size
  // boxes) its rendered text ranges.
  const srHidden = new Map();
  const inSrOnly = el => { if (!el) return false; if (srHidden.has(el)) return srHidden.get(el); const v = srOnly(el.getBoundingClientRect(), getComputedStyle(el)) || inSrOnly(parentOf(el)); srHidden.set(el, v); return v; };
  const shown = el => { const c = getComputedStyle(el); if (c.display === 'none' || c.visibility !== 'visible' || inSrOnly(el)) return false; const r = el.getBoundingClientRect(); return (r.width > 0 && r.height > 0) || textRects(el).length > 0; };
  const isContent = el => el.matches(MEDIA) || ownText(el);
  // R13 N03: composed content detection: an element holds content when it or any composed descendant (open shadow
  // trees included) is shown text or media, so a shadow-only host is screened too.
  const holds = new Set();
  for (const d of all) if (isContent(d) && shown(d)) for (let a = d; a && !holds.has(a); a = parentOf(a)) holds.add(a);
  // R13 N01: body's overflow propagates to the viewport when html's is visible; body is then not a scroll or clip box
  // (the viewport is), so content pushed left of it is offscreenLeft.
  const rootStyle = getComputedStyle(document.documentElement);
  const bodyPropagates = rootStyle.overflowX === 'visible' && rootStyle.overflowY === 'visible';
  const clipBox = a => a !== document.documentElement && !(a === document.body && bodyPropagates);
  const overflowX = el => getComputedStyle(el).overflowX;
  const scrollerOf = el => { for (let a = parentOf(el); a && a !== document.documentElement; a = parentOf(a)) if (clipBox(a) && overflowX(a) !== 'visible') return a; return null; };
  // R12 M02: the horizontal range a scroller can show. scrollLeft runs 0..max (LTR) or -max..0 (RTL); hidden/clip boxes
  // show only their inner box. Content outside this range is lost on either edge, whatever scrollWidth says.
  const reach = s => {
    const b = s.getBoundingClientRect(), left = b.left + s.clientLeft, right = left + s.clientWidth;
    if (!['auto', 'scroll'].includes(overflowX(s))) return { left, right, inner: { left, right } };
    const max = Math.max(0, s.scrollWidth - s.clientWidth), rtl = getComputedStyle(s).direction === 'rtl';
    const min = rtl ? -max : 0, top = rtl ? 0 : max, cur = s.scrollLeft;
    return { left: left + min - cur, right: right + top - cur, inner: { left, right } };
  };
  const beyond = (e, r) => all.some(d => d !== e && holds.has(d) && within(e, d) && [...(shown(d) && d.getBoundingClientRect().width > 0 ? [d.getBoundingClientRect()] : []), ...contentRects(d)].some(b => b.right > r.right + 1 || b.left < r.left - 1)); // R13 N03: composed ancestry and content
  // ARGON-R5-02: body is screened too, so html + body overflow hidden/clip cannot hide a wide layout.
  for (const e of all) {
    const c = getComputedStyle(e), r = e.getBoundingClientRect();
    if (!holds.has(e)) continue; // R13 N02/N03: shown, and holds shown text or media (composed)
    // overflow: clip makes no scroll container, so scrollWidth stays at clientWidth; measure what the box cuts off instead.
    // R12 M02: hidden boxes are measured the same way, so content pushed past their LEFT edge is a clip too.
    const x = (e.scrollWidth > e.clientWidth + 1 && ['hidden', 'clip'].includes(c.overflowX)) || (clipBox(e) && ['hidden', 'clip'].includes(c.overflowX) && beyond(e, r));
    const y = e.scrollHeight > e.clientHeight + 1 && ['hidden', 'clip'].includes(c.overflowY);
    // CODEX-R4-04: ellipsis styling alone is not a clip; only text that actually overflows a hidden/clip box is recorded.
    if ((x || y)) clipped.push({ tag: e.tagName, slot: e.getAttribute('data-copy-slot'), x, y, ellipsis: x && c.textOverflow === 'ellipsis' });
    const s = scrollerOf(e);
    // ARGON-R5-05: text or media pushed past the left edge of the page is lost (no scrollbar reaches it). Exempt: the
    // off-screen skip-link pattern (a focusable absolute/fixed element wholly left of the viewport that appears on
    // focus; the focus probe checks it is visible when focused). Inside a scroller, R12 M02 measures its range instead.
    const left = Math.min(r.width > 0 ? r.left : Infinity, ...contentRects(e).map(b => b.left)); // R13 N02: zero-size boxes by their text
    if (!s && left < -1 && e !== document.body && !(focusable(e) && ['absolute', 'fixed'].includes(c.position) && r.right <= 0)) offscreenLeft.push({ tag: e.tagName, slot: e.getAttribute('data-copy-slot'), left: Math.round(left) });
    if (s && ['auto', 'scroll'].includes(overflowX(s)) && (isContent(e) || ['auto', 'scroll'].includes(c.overflowX))) {
      const range = reach(s), rects = isContent(e) ? contentRects(e) : [r];
      const side = rects.some(b => b.left < range.left - 1) ? 'left' : rects.some(b => b.right > range.right + 1) ? 'right' : null;
      if (side && !(focusable(e) && ['absolute', 'fixed'].includes(c.position))) unreachable.push({ tag: e.tagName, slot: e.getAttribute('data-copy-slot'), side, scroller: label(s) });
    }
    // R12 M11: a same-origin frame whose document scrolls sideways is screened at 320 px; an unreadable frame is unscanned.
    // R13 N04: every element that can hold a nested document (object, embed, fencedframe, portal too).
    if (e.matches(NESTED)) { let doc = null; try { doc = e.contentDocument; } catch {} if (!doc?.documentElement) unscannedScopes.push({ tag: e.tagName, src: e.getAttribute('src') || (e.hasAttribute('srcdoc') ? 'srcdoc' : '') }); else if (reflow && doc.documentElement.scrollWidth > doc.documentElement.clientWidth + 1) scrolledText.push({ tag: e.tagName, slot: e.getAttribute('data-copy-slot'), sample: 'frame document scrolls sideways' }); }
  }
  if (reflow) {
    const candidateOf = (d, scroller) => { for (let t = d.closest(TWO_D); t; t = t.parentElement?.closest(TWO_D)) { if (t !== scroller && !scroller.contains(t)) return null; if (!t.matches('[role="grid"], [role="table"]') || t.querySelector('[role="row"]') || t.matches('[data-fannan-2d]')) return t; } return null; };
    const usable = el => shown(el) && !el.disabled && !el.closest('[inert]') && el.tabIndex >= 0;
    for (const e of all) {
      const c = getComputedStyle(e);
      if (!['auto', 'scroll'].includes(c.overflowX) || !holds.has(e)) continue; // R13 N02: a zero-size scroller holding shown text is screened
      const box = reach(e).inner;
      // R12 M01: the scroller's own text counts (bare text in a nowrap box, a directly scrollable pre), and so does
      // content in its open shadow tree; nothing is skipped because scrollWidth did not grow.
      const inside = all.filter(d => within(e, d) && shown(d) && isContent(d));
      const over = inside.filter(d => contentRects(d).some(b => b.right > box.right + 1 || b.left < box.left - 1));
      if (!over.length) {
        // fail closed: the box scrolls and visible elements stick out, but no text or media was measured there
        if (e.scrollWidth > e.clientWidth + 1 && all.some(d => d !== e && within(e, d) && shown(d) && (d.getBoundingClientRect().right > box.right + 1 || d.getBoundingClientRect().left < box.left - 1) && holds.has(d))) unmeasured.push({ tag: e.tagName, slot: e.getAttribute('data-copy-slot'), scroller: label(e) });
        continue; // otherwise only padding or empty boxes overflow
      }
      const plain = over.filter(d => !candidateOf(d, e));
      if (plain.length) { scrolledText.push({ tag: e.tagName, slot: e.getAttribute('data-copy-slot'), sample: ((ownText(plain[0]) ? [...plain[0].childNodes].filter(n => n.nodeType === 3).map(n => n.nodeValue).join('') : plain[0].tagName) || '').trim().slice(0, 60) }); continue; }
      // R12 M10: keyboard use is the scroller itself in the tab order, or usable (shown, enabled, not inert) targets
      // spaced so that tabbing through them scrolls across the whole overflowing extent. R13 N15: focusing a target
      // scrolls it just into view, so the first and last targets must reach the content edges (1 px) and each next
      // target must end within one box width of the previous one's end.
      const extent = inside.flatMap(contentRects).reduce((x, b) => ({ left: Math.min(x.left, b.left), right: Math.max(x.right, b.right) }), { left: Infinity, right: -Infinity });
      const targets = all.filter(d => d !== e && within(e, d) && focusable(d) && usable(d)).map(d => d.getBoundingClientRect()).sort((p, q) => p.left - q.left);
      const span = box.right - box.left;
      const stepped = targets.length > 0 && targets[0].left <= extent.left + 1 && targets.every((t, i) => i === 0 || t.right - targets[i - 1].right <= span) && Math.max(...targets.map(t => t.right)) >= extent.right - 1;
      const keyboard = (e.hasAttribute('tabindex') && e.tabIndex >= 0 && !e.closest('[inert]')) || stepped;
      for (const t of new Set(over.map(d => candidateOf(d, e)))) {
        const marked = t.closest('[data-fannan-2d]');
        const reason = marked ? (marked.getAttribute('data-fannan-2d') || '').trim() || null : (t.getAttribute('role') || t.tagName.toLowerCase());
        const outer = e.getBoundingClientRect();
        reflowCandidates.push({ element: label(t), id: t.id || null, reason, scroller: label(e), fits: outer.left >= -1 && outer.right <= innerWidth + 1, keyboard });
      }
    }
  }
  const root = document.documentElement, body = document.body;
  const documentWidth = Math.max(root.scrollWidth, body ? body.scrollWidth : 0);
  return { width: innerWidth, documentWidth, horizontalOverflow: documentWidth > root.clientWidth + 1, clipped, offscreenLeft, unreachable, scrolledText, reflowCandidates, unmeasured, unscannedScopes, lang: root.lang, dir: getComputedStyle(root).direction };
}

export const validWidths = widths => Array.isArray(widths) && widths.length > 0 && widths.includes(1440) && widths.every(w => Number.isInteger(w) && w > 0) && new Set(widths).size === widths.length;

// R13 N16: closed shadow roots cannot be reached from page script, so they are counted through the DevTools protocol
// (DOM.getDocument with pierce). Each one is an unscanned scope and fails the width screen; if the count itself
// cannot be taken, the document is an unscanned scope (fail closed).
export async function closedShadowRoots(page) {
  let session = null;
  try {
    session = await page.context().newCDPSession(page);
    const { root } = await session.send('DOM.getDocument', { depth: -1, pierce: true });
    const hosts = [];
    const walk = n => { for (const r of n.shadowRoots || []) { if (r.shadowRootType === 'closed') hosts.push(n.localName); walk(r); } for (const c of n.children || []) walk(c); if (n.contentDocument) walk(n.contentDocument); if (n.templateContent) walk(n.templateContent); };
    walk(root);
    return hosts;
  } catch { return null; } finally { if (session) await session.detach().catch(() => {}); }
}

// expected: { lang, dir } for a declared state, or null for the positional page (language checked per state).
export async function screenWidths(page, widths, expected = null, height = 900) {
  if (!validWidths(widths)) return { results: [], pass: false, error: 'settings.desktopWidths invalid; no width screened' };
  const results = [];
  const closed = await closedShadowRoots(page);
  const closedScopes = closed === null ? [{ tag: 'DOCUMENT', src: 'closed shadow roots could not be counted' }] : closed.map(host => ({ tag: host.toUpperCase(), src: 'closed shadow root' }));
  try {
    for (const width of [...widths, ...(widths.includes(REFLOW_WIDTH) ? [] : [REFLOW_WIDTH])]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => scrollTo(0, 0));
      const result = await page.evaluate(inspectLayout, { reflow: width === REFLOW_WIDTH });
      result.unscannedScopes.push(...closedScopes);
      const language = !expected || (result.lang === expected.lang && result.dir === expected.dir);
      results.push({ ...result, purpose: widths.includes(width) ? 'declared desktop width' : 'desktop accessibility reflow (400% of 1280); not mobile approval', pass: !result.horizontalOverflow && result.clipped.length === 0 && result.offscreenLeft.length === 0 && result.unreachable.length === 0 && result.scrolledText.length === 0 && result.unmeasured.length === 0 && result.unscannedScopes.length === 0 && result.reflowCandidates.every(c => c.fits && c.keyboard) && language });
    }
  } finally {
    await page.setViewportSize({ width: 1440, height });
  }
  return { results, pass: results.every(r => r.pass), note: 'Automated width screen only; 320 CSS px approximates a 1280 px desktop at 400% zoom. Actual zoom, text spacing and WCAG reflow exceptions still require manual evidence; every reflow candidate needs a recorded decision.' };
}

// R11 panel D1 (decisions B, T2), R12 M09: a candidate is resolved only by a handoff `reflowExceptions` entry naming
// the same screen, state, lang and element id, a non-empty reason and a reviewer who holds the qaGate or approver role
// (exceptions.mjs). Every occurrence keeps its scope; an unresolved candidate BLOCKS the final handoff.
export function resolveReflowCandidates(candidates, handoff, phase = 'handoff') {
  const r = resolveScoped({ items: candidates.map(c => ({ screen: null, state: null, lang: null, ...c })), entries: handoff?.reflowExceptions, roles: [handoff?.settings?.roles?.qaGate, handoff?.settings?.roles?.approver], phase, what: 'reflowExceptions', shape: c => `${c.element}|${c.scroller}` });
  return { candidates: r.items, unresolved: r.unresolved, status: r.status, pass: r.pass };
}
