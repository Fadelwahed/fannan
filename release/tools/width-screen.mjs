// width-screen.mjs: R8, ported from codex/fannan-r3-review 2733317 (release/tools/browser-probes.mjs screenWidths/inspectLayout).
// Screening only: renders the page at every declared desktop width plus 320 CSS px (desktop 400% reflow equivalent) and
// flags horizontal overflow, clipped or ellipsised text, and a language/direction mismatch. Actual zoom, text spacing,
// WCAG reflow exceptions and layout quality still need manual evidence. 320 px is not a mobile design approval.
export const REFLOW_WIDTH = 320;

export function inspectLayout() {
  const clipped = [], offscreenLeft = [];
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
  const root = document.documentElement, body = document.body;
  const documentWidth = Math.max(root.scrollWidth, body ? body.scrollWidth : 0);
  return { width: innerWidth, documentWidth, horizontalOverflow: documentWidth > root.clientWidth + 1, clipped, offscreenLeft, lang: root.lang, dir: getComputedStyle(root).direction };
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
      const result = await page.evaluate(inspectLayout);
      const language = !expected || (result.lang === expected.lang && result.dir === expected.dir);
      results.push({ ...result, purpose: widths.includes(width) ? 'declared desktop width' : 'desktop accessibility reflow (400% of 1280); not mobile approval', pass: !result.horizontalOverflow && result.clipped.length === 0 && result.offscreenLeft.length === 0 && language });
    }
  } finally {
    await page.setViewportSize({ width: 1440, height });
  }
  return { results, pass: results.every(r => r.pass), note: 'Automated width screen only; 320 CSS px approximates a 1280 px desktop at 400% zoom. Actual zoom, text spacing and WCAG reflow exceptions still require manual evidence.' };
}
