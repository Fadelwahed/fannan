// Browser-side design-quality screening for pre-handoff-check.mjs (release/references/design-quality.md).
// Playwright serialises this function into the page, so every helper must live inside it. ARGON-R2-09 moved it
// here from pre-handoff-check.mjs so it can be tested in a real browser.
export function designProbe() {
  const visible = e => { const r = e.getBoundingClientRect(), c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.display !== 'none'; };
  const sections = [...document.querySelectorAll('main section, section')].filter(visible);
  const centered = sections.filter(e => { const c = getComputedStyle(e); return c.textAlign === 'center' && e.getBoundingClientRect().width > 300; }).length;
  const sizes = [...new Set([...document.querySelectorAll('body *')].filter(visible).map(e => getComputedStyle(e).fontSize))];
  const pageArea = Math.max(document.documentElement.scrollHeight, innerHeight) * document.documentElement.clientWidth;
  const rects = [...document.querySelectorAll('body *')].filter(visible).map(e => ({e,r:e.getBoundingClientRect(),c:getComputedStyle(e)}));
  // R9 sibling of CODEX-R4-02: colours are normalised by a detached canvas, never by an element in the page, so page CSS
  // (span{color:...!important}) cannot change what "the accent" is.
  const ctx = document.createElement('canvas').getContext('2d');
  const norm = value => { ctx.fillStyle = '#010203'; ctx.fillStyle = value; const out = ctx.fillStyle; ctx.fillStyle = '#030201'; ctx.fillStyle = value; return out === ctx.fillStyle ? out : null; };
  // ARGON-R2-09: Style Dictionary emits --colors-accent / --colors-primary; a hand-declared --accent wins.
  // ARGON-R5-01: the measured accent is the first VALID candidate, and the check fails closed: if any candidate is
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
  return { centered, typeSizes: sizes, accent, accentVar, accentInvalid, accentArea, accentRatio: accentArea === null ? null : accentArea / pageArea, accentViewportRatio: accentViewportArea === null ? null : accentViewportArea / (innerWidth * innerHeight), gradients, heroGradient, glass, iconRows, purpleBlue, visibleText: text, headlines: [...document.querySelectorAll('h1,h2,[data-tagline]')].map(e => e.innerText), placeholders: /\[placeholder\]|lorem ipsum|\btbd\b/i.test(text), h1: document.querySelectorAll('h1').length }
}
