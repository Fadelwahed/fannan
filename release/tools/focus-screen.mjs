// Browser-side screening only; a style change still needs manual visibility/contrast review.
export function focusStyleProbe({ capture = false } = {}) {
  const properties = ['outlineStyle', 'outlineWidth', 'outlineColor', 'outlineOffset', 'boxShadow',
    'borderTopStyle', 'borderTopWidth', 'borderTopColor', 'borderRightStyle', 'borderRightWidth', 'borderRightColor',
    'borderBottomStyle', 'borderBottomWidth', 'borderBottomColor', 'borderLeftStyle', 'borderLeftWidth', 'borderLeftColor',
    'backgroundColor', 'color', 'textDecorationLine', 'textDecorationColor', 'textDecorationStyle', 'textDecorationThickness'];
  const read = el => { const style = getComputedStyle(el); return properties.map(key => style[key]); };
  if (capture) {
    window.__focusBefore = new WeakMap([...document.querySelectorAll('*')].map(el => [el, read(el)]));
    return;
  }
  const el = document.activeElement, before = window.__focusBefore?.get(el);
  return !!before && read(el).some((value, i) => value !== before[i]);
}
