// Browser-side screening only; a style change still needs manual visibility/contrast review.
// Playwright serialises these functions into the page, so every helper must live inside them.

// R4-3: wait for finite CSS transitions/animations on the focused element (and its subtree, including
// pseudo-elements) and on its ancestors, so a focus style is read in its settled state. Infinite
// animations are ignored; the wait is capped.
export async function focusSettle({ maxMs = 1000 } = {}) {
  const el = document.activeElement;
  if (!el || el === document.body) return;
  const running = [];
  for (let node = el; node; node = node.parentElement) running.push(...node.getAnimations({ subtree: node === el }));
  const finite = running.filter(animation => Number.isFinite(animation.effect?.getComputedTiming?.().endTime));
  if (!finite.length) return;
  await Promise.race([Promise.allSettled(finite.map(animation => animation.finished)), new Promise(resolve => setTimeout(resolve, maxMs))]);
}

export function focusStyleProbe({ capture = false, minContrast = 3 } = {}) {
  const properties = ['content', 'outlineStyle', 'outlineWidth', 'outlineColor', 'outlineOffset', 'boxShadow',
    'borderTopStyle', 'borderTopWidth', 'borderTopColor', 'borderRightStyle', 'borderRightWidth', 'borderRightColor',
    'borderBottomStyle', 'borderBottomWidth', 'borderBottomColor', 'borderLeftStyle', 'borderLeftWidth', 'borderLeftColor',
    'backgroundColor', 'color', 'textDecorationLine', 'textDecorationColor', 'textDecorationStyle', 'textDecorationThickness'];
  const read = el => ['', '::before', '::after'].map(pseudo => {
    const style = getComputedStyle(el, pseudo || null);
    return Object.fromEntries(properties.map(key => [key, style[key]]));
  });
  if (capture) {
    window.__focusBefore = new WeakMap([...document.querySelectorAll('*')].map(el => [el, read(el)]));
    return;
  }
  // R4-3: colours are compared by contrast between the unfocused and focused state (composited over white).
  // A colour-only change below minContrast (3:1) is not counted. Unparseable colours count as changed,
  // so this is never weaker than the R3 "any change" rule.
  const rgb = value => {
    const m = /^rgba?\(([^)]*)\)$/.exec(String(value ?? '').trim());
    if (!m) return null;
    const parts = m[1].split(/[\s,/]+/).filter(Boolean);
    const n = parts.map(part => part.endsWith('%') ? parseFloat(part) / 100 : parseFloat(part));
    if (n.length < 3 || n.some(Number.isNaN)) return null;
    const alpha = n.length > 3 ? n[3] : 1;
    return n.slice(0, 3).map(channel => channel * alpha + 255 * (1 - alpha));
  };
  const luminance = c => c.map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  const strongColour = (a, b) => {
    if (a === b) return false;
    const x = rgb(a), y = rgb(b);
    if (!x || !y) return true;
    const [hi, lo] = [luminance(x), luminance(y)].sort((p, q) => q - p);
    return (hi + 0.05) / (lo + 0.05) >= minContrast;
  };
  const on = (style, kind, side = '') => {
    if (kind === 'outline') return !!style.outlineStyle && style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0;
    if (kind === 'border') return !!style[`border${side}Style`] && !['none', 'hidden'].includes(style[`border${side}Style`]) && parseFloat(style[`border${side}Width`]) > 0;
    return !!style.textDecorationLine && style.textDecorationLine !== 'none';
  };
  const feature = (b, a, kind, side, geometry, colour) => {
    const was = on(b, kind, side), is = on(a, kind, side);
    if (was !== is) return true;
    if (!is) return false;
    return geometry.some(key => a[key] !== b[key]) || strongColour(b[colour], a[colour]);
  };
  const colours = value => String(value ?? '').match(/rgba?\([^)]*\)/g) || [];
  const shadow = (b, a) => {
    if (a.boxShadow === b.boxShadow) return false;
    const shape = value => String(value ?? '').replace(/rgba?\([^)]*\)/g, 'C');
    if (shape(a.boxShadow) !== shape(b.boxShadow)) return true;
    const before = colours(b.boxShadow), after = colours(a.boxShadow);
    return after.some((colour, i) => strongColour(before[i], colour));
  };
  const visibleChange = (b, a) => feature(b, a, 'outline', '', ['outlineStyle', 'outlineWidth', 'outlineOffset'], 'outlineColor')
    || ['Top', 'Right', 'Bottom', 'Left'].some(side => feature(b, a, 'border', side, [`border${side}Style`, `border${side}Width`], `border${side}Color`))
    || feature(b, a, 'decoration', '', ['textDecorationLine', 'textDecorationStyle', 'textDecorationThickness'], 'textDecorationColor')
    || shadow(b, a) || strongColour(b.backgroundColor, a.backgroundColor) || strongColour(b.color, a.color);
  const rendered = (style, index) => index === 0 || (!!style.content && !['none', 'normal'].includes(style.content));
  for (let el = document.activeElement; el; el = el.parentElement) {
    const before = window.__focusBefore?.get(el);
    if (!before) continue;
    const after = read(el);
    if (after.some((style, i) => (rendered(style, i) || rendered(before[i], i)) && visibleChange(before[i], style))) return true;
  }
  return false;
}
