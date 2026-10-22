// Browser-side screening only; a style change still needs manual visibility/contrast review.
// Playwright serialises these functions into the page, so every helper must live inside them.

// wait for finite CSS transitions/animations on the focused element (and its subtree, including
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

// the baseline for a tab loop is captured once, with nothing focused, so :focus-within styles on a
// shared ancestor never leak into the "before" state of a later sibling. Call before focusStyleProbe({ capture: true }).
export function focusBaseline() {
  if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur?.();
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
  // colours are compared by contrast between the unfocused and focused state. translucent
  // colours are composited over the backdrop (the nearest opaque ancestor background, captured unfocused, with
  // translucent layers in between), falling back to white. A colour-only change below minContrast is not counted. Unparseable colours count as changed,
  // so this is never weaker than the "any change" rule.
  const rgba = value => {
    if (String(value ?? '').trim() === 'transparent') return { c: [0, 0, 0], a: 0 };
    const m = /^rgba?\(([^)]*)\)$/.exec(String(value ?? '').trim());
    if (!m) return null;
    const parts = m[1].split(/[\s,/]+/).filter(Boolean);
    const n = parts.map((part, i) => part.endsWith('%') ? parseFloat(part) * (i < 3 ? 2.55 : 0.01) : parseFloat(part)); // channel % -> 0..255, alpha % -> 0..1
    if (n.length < 3 || n.some(Number.isNaN)) return null;
    return { c: n.slice(0, 3), a: n.length > 3 ? n[3] : 1 };
  };
  const over = (colour, ground) => colour.c.map((channel, i) => channel * colour.a + ground[i] * (1 - colour.a));
  const white = [255, 255, 255];
  const backdrop = el => {
    const layers = [];
    for (let node = el.parentElement; node; node = node.parentElement) {
      const colour = rgba((window.__focusBefore?.get(node)?.[0] ?? getComputedStyle(node)).backgroundColor);
      if (!colour) return white; // unparseable ancestor background: white fallback
      layers.push(colour);
      if (colour.a >= 1) break;
    }
    return layers.reverse().reduce((ground, colour) => over(colour, ground), white);
  };
  const rgb = (value, ground = white) => { const colour = rgba(value); return colour && over(colour, ground); };
  const contrast = (x, y) => { const [hi, lo] = [luminance(x), luminance(y)].sort((p, q) => q - p); return (hi + 0.05) / (lo + 0.05); };
  const luminance = c => c.map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  const strongColour = (a, b, ground = white) => {
    if (a === b) return false;
    const x = rgb(a, ground), y = rgb(b, ground);
    if (!x || !y) return true;
    return contrast(x, y) >= minContrast;
  };
  // an outline/border/decoration/shadow only counts when it is painted: alpha > 0 and at least
  // minContrast against the element's unfocused background composited over its backdrop. Unparseable colours count.
  const painted = (value, ground) => {
    const colour = rgba(value);
    if (!colour) return true;
    if (!(colour.a > 0)) return false;
    return contrast(over(colour, ground), ground) >= minContrast;
  };
  const on = (style, kind, side = '') => {
    if (kind === 'outline') return !!style.outlineStyle && style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0;
    if (kind === 'border') return !!style[`border${side}Style`] && !['none', 'hidden'].includes(style[`border${side}Style`]) && parseFloat(style[`border${side}Width`]) > 0;
    return !!style.textDecorationLine && style.textDecorationLine !== 'none';
  };
  const feature = (b, a, kind, side, geometry, colour, ground) => {
    const was = on(b, kind, side), is = on(a, kind, side);
    if (was !== is) return is ? painted(a[colour], ground) : painted(b[colour], ground);
    if (!is) return false;
    if (geometry.some(key => a[key] !== b[key])) return painted(a[colour], ground) || painted(b[colour], ground);
    return strongColour(b[colour], a[colour], ground);
  };
  // an outline (offset >= 0) and an outer box-shadow ring are drawn outside the element, so they are measured
  // against the backdrop; an inset ring or a negative-offset outline against the element's own background.
  const shadowItems = value => String(value ?? '').split(/,(?![^(]*\))/).map(item => item.trim()).filter(item => item && item !== 'none');
  const shadowColour = item => (item.match(/rgba?\([^)]*\)/) || [])[0];
  const shadow = (b, a, ground, back) => {
    if (a.boxShadow === b.boxShadow) return false;
    const shape = value => String(value ?? '').replace(/rgba?\([^)]*\)/g, 'C');
    const under = item => /\binset\b/.test(item) ? ground : back;
    const before = shadowItems(b.boxShadow), after = shadowItems(a.boxShadow);
    if (shape(a.boxShadow) !== shape(b.boxShadow)) {
      if (after.some(item => !shadowColour(item))) return true; // unparseable paint counts
      return after.some(item => painted(shadowColour(item), under(item))) || before.some(item => shadowColour(item) && painted(shadowColour(item), under(item)));
    }
    return after.some((item, i) => strongColour(shadowColour(before[i]), shadowColour(item), under(item)));
  };
  const outlineGround = (b, a, ground, back) => parseFloat((on(a, 'outline') ? a : b).outlineOffset) < 0 ? ground : back;
  const visibleChange = (b, a, back, ground = rgb(b.backgroundColor, back) || back) => feature(b, a, 'outline', '', ['outlineStyle', 'outlineWidth', 'outlineOffset'], 'outlineColor', outlineGround(b, a, ground, back))
    || ['Top', 'Right', 'Bottom', 'Left'].some(side => feature(b, a, 'border', side, [`border${side}Style`, `border${side}Width`], `border${side}Color`, ground))
    || feature(b, a, 'decoration', '', ['textDecorationLine', 'textDecorationStyle', 'textDecorationThickness'], 'textDecorationColor', ground)
    || shadow(b, a, ground, back) || strongColour(b.backgroundColor, a.backgroundColor, back) || strongColour(b.color, a.color, ground);
  const rendered = (style, index) => index === 0 || (!!style.content && !['none', 'normal'].includes(style.content));
  for (let el = document.activeElement; el; el = el.parentElement) {
    const before = window.__focusBefore?.get(el);
    if (!before) continue;
    const after = read(el), back = backdrop(el);
    if (after.some((style, i) => (rendered(style, i) || rendered(before[i], i)) && visibleChange(before[i], style, back))) return true;
  }
  return false;
}
