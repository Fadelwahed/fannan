// width-screen.mjs: R8, ported from codex/fannan-r3-review 2733317 (release/tools/browser-probes.mjs screenWidths/inspectLayout).
// Screening only: renders the page at every declared desktop width plus 320 CSS px (desktop 400% reflow equivalent) and
// flags horizontal overflow, clipped or ellipsised text, and a language/direction mismatch. Actual zoom, text spacing,
// WCAG reflow exceptions and layout quality still need manual evidence. 320 px is not a mobile design approval.
export const REFLOW_WIDTH = 320;

// R11 (Asad panel S3): WCAG 1.4.10 excuses only content that needs a two-dimensional layout. At the 320 px reflow width a
// horizontal scroller passes only when everything that overflows it is inside such content: table, pre, code, img, svg,
// canvas, video, iframe, role=grid/table, or an element marked data-fannan-2d="<reason>" (recorded for review).
export const TWO_D = 'table, pre, code, img, svg, canvas, video, iframe, [role="grid"], [role="table"], [data-fannan-2d]';

export function inspectLayout({ reflow = false } = {}) {
  const TWO_D = 'table, pre, code, img, svg, canvas, video, iframe, [role="grid"], [role="table"], [data-fannan-2d]';
  const clipped = [], offscreenLeft = [], scrolledText = [], twoDimensional = [];
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
    for (const e of document.querySelectorAll('body, body *')) {
      const c = getComputedStyle(e);
      if (!['auto', 'scroll'].includes(c.overflowX) || e.scrollWidth <= e.clientWidth + 1 || c.display === 'none' || c.visibility === 'hidden') continue;
      const box = e.getBoundingClientRect();
      const self2d = e.matches(TWO_D) ? e : null;
      const over = [...e.querySelectorAll('*')].filter(d => { const b = d.getBoundingClientRect(); return b.width > 0 && b.height > 0 && ownContent(d) && (b.right > box.right + 1 || b.left < box.left - 1); });
      const plain = self2d ? [] : over.filter(d => { const t = d.closest(TWO_D); return !t || !e.contains(t); });
      if (plain.length) scrolledText.push({ tag: e.tagName, slot: e.getAttribute('data-copy-slot'), sample: (plain[0].textContent || plain[0].tagName).trim().slice(0, 60) });
      else {
        const content = self2d ?? over.map(d => d.closest(TWO_D)).find(Boolean) ?? e;
        twoDimensional.push({ tag: e.tagName, content: content.tagName, role: content.getAttribute('role'), reason: content.getAttribute('data-fannan-2d') ?? (content.getAttribute('role') || content.tagName.toLowerCase()) });
      }
    }
  }
  const root = document.documentElement, body = document.body;
  const documentWidth = Math.max(root.scrollWidth, body ? body.scrollWidth : 0);
  return { width: innerWidth, documentWidth, horizontalOverflow: documentWidth > root.clientWidth + 1, clipped, offscreenLeft, scrolledText, twoDimensional, lang: root.lang, dir: getComputedStyle(root).direction };
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
      results.push({ ...result, purpose: widths.includes(width) ? 'declared desktop width' : 'desktop accessibility reflow (400% of 1280); not mobile approval', pass: !result.horizontalOverflow && result.clipped.length === 0 && result.offscreenLeft.length === 0 && result.scrolledText.length === 0 && language });
    }
  } finally {
    await page.setViewportSize({ width: 1440, height });
  }
  return { results, pass: results.every(r => r.pass), note: 'Automated width screen only; 320 CSS px approximates a 1280 px desktop at 400% zoom. Actual zoom, text spacing and WCAG reflow exceptions still require manual evidence.' };
}
