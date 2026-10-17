// OPUS-R2-10: browser-side screen for spacing outside the built --spacing-* scale. Playwright serialises this
// function into the page, so it must stay self-contained. Screening only; reviewers still judge rhythm.
// Horizontal margins are skipped because `auto` margins resolve to used pixel values; 0, auto and normal are skipped.
export function spacingProbe() {
  const names = new Set();
  const collect = rules => { for (const rule of rules) { if (rule.style) for (const name of rule.style) if (name.startsWith('--spacing-')) names.add(name); if (rule.cssRules) collect(rule.cssRules); } };
  for (const sheet of document.styleSheets) { try { collect(sheet.cssRules); } catch { /* cross-origin sheet: not readable */ } }
  const root = getComputedStyle(document.documentElement);
  for (let i = 0; i < root.length; i++) if (root[i].startsWith('--spacing-')) names.add(root[i]);
  const probe = document.createElement('div'); document.body.append(probe);
  const scale = new Set();
  for (const name of names) { probe.style.paddingTop = `var(${name})`; const px = getComputedStyle(probe).paddingTop; if (/^\d*\.?\d+px$/.test(px) && px !== '0px') scale.add(px); }
  probe.remove();
  const keys = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginBottom', 'rowGap', 'columnGap'];
  const off = new Map();
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect(), c = getComputedStyle(el);
    if (!(r.width > 0 && r.height > 0) || c.visibility === 'hidden' || c.display === 'none') continue;
    for (const key of keys) {
      const value = c[key];
      if (!value || ['0px', 'auto', 'normal'].includes(value) || scale.has(value)) continue;
      if (!off.has(value)) off.set(value, { value, property: key, example: el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '') });
    }
  }
  return { spacingScale: [...scale].sort(), spacingOffScale: [...off.values()] };
}
