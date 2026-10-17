// Browser-side design-quality screening for pre-handoff-check.mjs (release/references/design-quality.md).
// Playwright serialises this function into the page, so every helper must live inside it. ARGON-R2-09 moved it
// here from pre-handoff-check.mjs so it can be tested in a real browser.
export function designProbe() {
  const visible = e => { const r = e.getBoundingClientRect(), c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.display !== 'none'; };
  const sections = [...document.querySelectorAll('main section, section')].filter(visible);
  const centered = sections.filter(e => { const c = getComputedStyle(e); return c.textAlign === 'center' && e.getBoundingClientRect().width > 300; }).length;
  const sizes = [...new Set([...document.querySelectorAll('body *')].filter(visible).map(e => getComputedStyle(e).fontSize))];
  // ARGON-R2-09: Style Dictionary emits --colors-accent / --colors-primary; a hand-declared --accent wins.
  const accentVar = ['--accent', '--colors-accent', '--colors-primary'].find(k => getComputedStyle(document.documentElement).getPropertyValue(k).trim()) ?? null;
  const accent = accentVar ? getComputedStyle(document.documentElement).getPropertyValue(accentVar).trim() : '';
  const pageArea = Math.max(document.documentElement.scrollHeight, innerHeight) * document.documentElement.clientWidth;
  const rects = [...document.querySelectorAll('body *')].filter(visible).map(e => ({e,r:e.getBoundingClientRect(),c:getComputedStyle(e)}));
  const swatch = document.createElement('span'); swatch.style.color = accent; document.body.append(swatch);
  const accentComputed = accent ? getComputedStyle(swatch).color : ''; swatch.remove();
  const painted = rects.filter(({c}) => c.backgroundColor === accentComputed);
  const accentArea = accent ? painted.reduce((sum,{r}) => sum + Math.max(0, Math.min(r.width, innerWidth)) * r.height, 0) : null;
  const accentViewportArea = accent ? painted.reduce((sum,{r}) => sum + Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0)) * Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)), 0) : null;
  const gradients = rects.filter(({c}) => c.backgroundImage.includes('gradient(')).length;
  const heroGradient = [...document.querySelectorAll('main > section:first-child, main > header:first-child, .hero, [data-hero]')].some(e => getComputedStyle(e).backgroundImage.includes('gradient('));
  const glass = rects.filter(({c}) => c.backdropFilter !== 'none').length;
  // ARGON-R2-09: a centred icon trio is any visible container with exactly three visible item children that each
  // hold an icon, centred on the container or on every item (tags and wrappers do not exempt it), plus the R3
  // section rule (a centred section with exactly three icons) when no such row sits inside that section.
  const iconSel = 'svg, i, [class*="icon"]';
  const rows = [...document.querySelectorAll('body *')].filter(visible).filter(e => {
    const items = [...e.children].filter(visible);
    if (items.length !== 3 || !items.every(item => item.matches(iconSel) || item.querySelector(iconSel))) return false;
    return getComputedStyle(e).textAlign === 'center' || items.every(item => getComputedStyle(item).textAlign === 'center');
  });
  const iconRows = rows.length + sections.filter(e => getComputedStyle(e).textAlign === 'center' && e.querySelectorAll(iconSel).length === 3 && !rows.some(r => e.contains(r))).length;
  const purpleBlue = rects.some(({c}) => /rgb\((?:1[0-5]\d|[2-9]\d),\s*(?:[0-9]|[1-9]\d),\s*(?:1[3-9]\d|2\d\d)\)/.test(c.backgroundColor)) && rects.some(({c}) => /rgb\((?:[0-9]|[1-9]\d),\s*(?:[0-9]|[1-9]\d),\s*(?:1[3-9]\d|2\d\d)\)/.test(c.backgroundColor));
  const text = document.body.innerText;
  return { centered, typeSizes: sizes, accent, accentVar, accentArea, accentRatio: accentArea === null ? null : accentArea / pageArea, accentViewportRatio: accentViewportArea === null ? null : accentViewportArea / (innerWidth * innerHeight), gradients, heroGradient, glass, iconRows, purpleBlue, visibleText: text, headlines: [...document.querySelectorAll('h1,h2,[data-tagline]')].map(e => e.innerText), placeholders: /\[placeholder\]|lorem ipsum|\btbd\b/i.test(text), h1: document.querySelectorAll('h1').length }
}
