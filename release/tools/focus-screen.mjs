// Browser-side screening only; a style change still needs manual visibility/contrast review.
export function focusStyleProbe({ capture = false } = {}) {
  const properties = ['outlineStyle', 'outlineWidth', 'outlineColor', 'outlineOffset', 'boxShadow',
    'borderTopStyle', 'borderTopWidth', 'borderTopColor', 'borderRightStyle', 'borderRightWidth', 'borderRightColor',
    'borderBottomStyle', 'borderBottomWidth', 'borderBottomColor', 'borderLeftStyle', 'borderLeftWidth', 'borderLeftColor',
    'backgroundColor', 'color', 'textDecorationLine', 'textDecorationColor', 'textDecorationStyle', 'textDecorationThickness'];
  const read = el => ['', '::before', '::after'].flatMap(pseudo => {
    const style = getComputedStyle(el, pseudo || null);
    return properties.map(key => style[key]);
  });
  if (capture) {
    window.__focusBefore = new WeakMap([...document.querySelectorAll('*')].map(el => [el, read(el)]));
    return;
  }
  for (let el = document.activeElement; el; el = el.parentElement) {
    const before = window.__focusBefore?.get(el);
    if (before && read(el).some((value, i) => value !== before[i])) return true;
  }
  return false;
}
