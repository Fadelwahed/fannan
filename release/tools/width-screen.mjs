// width-screen.mjs: R8, ported from codex/fannan-r3-review 2733317 (release/tools/browser-probes.mjs screenWidths/inspectLayout).
// Screening only: renders the page at every declared desktop width plus 320 CSS px (desktop 400% reflow equivalent) and
// flags horizontal overflow, clipped or ellipsised text, and a language/direction mismatch. Actual zoom, text spacing,
// WCAG reflow exceptions and layout quality still need manual evidence. 320 px is not a mobile design approval.
export const REFLOW_WIDTH = 320;

export function inspectLayout() {
  const clipped = [];
  for (const e of document.querySelectorAll('body *')) {
    const c = getComputedStyle(e), r = e.getBoundingClientRect();
    if (!r.width || !r.height || c.visibility === 'hidden' || c.display === 'none' || !e.textContent.trim()) continue;
    const x = e.scrollWidth > e.clientWidth + 1 && ['hidden', 'clip'].includes(c.overflowX);
    const y = e.scrollHeight > e.clientHeight + 1 && ['hidden', 'clip'].includes(c.overflowY);
    if (x || y || c.textOverflow === 'ellipsis') clipped.push({ tag: e.tagName, slot: e.getAttribute('data-copy-slot'), x, y, ellipsis: c.textOverflow === 'ellipsis' });
  }
  const root = document.documentElement;
  return { width: innerWidth, documentWidth: root.scrollWidth, horizontalOverflow: root.scrollWidth > root.clientWidth + 1, clipped, lang: root.lang, dir: getComputedStyle(root).direction };
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
      results.push({ ...result, purpose: widths.includes(width) ? 'declared desktop width' : 'desktop accessibility reflow (400% of 1280); not mobile approval', pass: !result.horizontalOverflow && result.clipped.length === 0 && language });
    }
  } finally {
    await page.setViewportSize({ width: 1440, height });
  }
  return { results, pass: results.every(r => r.pass), note: 'Automated width screen only; 320 CSS px approximates a 1280 px desktop at 400% zoom. Actual zoom, text spacing and WCAG reflow exceptions still require manual evidence.' };
}
