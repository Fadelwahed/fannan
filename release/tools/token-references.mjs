const reference = value => typeof value === 'string' && /^\{[^{}]+\}$/.test(value);
// R4-2: a unitless zero is a valid CSS length; every other dimension needs px, rem or em.
const dimension = value => value === 0 || typeof value === 'string' && /^-?\d*\.?\d+(px|rem|em)$/.test(value);
const lineHeightPercent = (path, value) => path.endsWith('.lineHeight') && typeof value === 'string' && /^\d*\.?\d+%$/.test(value);
const color = value => typeof value === 'string' && (/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value) || /^(rgb|hsl|oklch|oklab)a?\(/i.test(value));
// DTCG font-weight aliases. CSS accepts only 1-1000, normal and bold here, so aliases are converted to numbers
// before writing token JSON; raw aliases are never emitted into CSS.
export const fontWeightAliases = Object.freeze({ thin: 100, hairline: 100, 'extra-light': 200, 'ultra-light': 200, light: 300, normal: 400, regular: 400, book: 400, medium: 500, 'semi-bold': 600, 'demi-bold': 600, bold: 700, 'extra-bold': 800, 'ultra-bold': 800, black: 900, heavy: 900, 'extra-black': 950, 'ultra-black': 950 });
const cssWeightKeywords = new Set(['normal', 'bold']);
const valid = {
  color,
  dimension,
  number: value => typeof value === 'number' && Number.isFinite(value),
  fontFamily: value => typeof value === 'string' && !!value.trim() || Array.isArray(value) && value.length > 0 && value.every(name => typeof name === 'string' && !!name.trim()),
  fontWeight: value => typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= 1000 || typeof value === 'string' && cssWeightKeywords.has(value)
};

// CODEX-R2-02: component spacing keys that must be CSS lengths (physical and logical sides, row/column gap,
// inset and scroll padding/margin). OPUS-R2-01: plus the design.md spec's size/width/height sub-tokens and
// min/max width/height. A bare 0 is allowed; other numbers need px, rem or em.
const componentDimensionKey = /^(rounded|gap|rowGap|columnGap|size|width|height|minWidth|maxWidth|minHeight|maxHeight)$|^(padding|margin|inset|scrollPadding|scrollMargin)(Top|Right|Bottom|Left|Inline|Block|InlineStart|InlineEnd|BlockStart|BlockEnd)?$/;
export const isComponentDimensionKey = key => componentDimensionKey.test(key);

function expected(path) {
  const parts = path.split('.'), group = parts[0], key = parts.at(-1);
  if (group === 'colors') return ['color'];
  if (['rounded', 'breakpoints'].includes(group)) return ['dimension'];
  if (group === 'spacing') return ['dimension']; // R4-6: spacing requires px, rem or em (a bare 0 is a valid dimension)
  if (group === 'typography') return ({ fontFamily: ['fontFamily'], fontSize: ['dimension'], fontWeight: ['fontWeight'], letterSpacing: ['dimension'], lineHeight: ['number', 'dimension'] })[key];
  if (group === 'components') {
    if (/color$/i.test(key)) return ['color'];
    if (componentDimensionKey.test(key)) return ['dimension'];
  }
}

// OPUS-R2-01: true when the path accepts only CSS lengths, so a bare nonzero number means "units required".
export const expectsDimension = path => (expected(path) ?? []).length === 1 && expected(path)[0] === 'dimension';

export function inferTokenType(path, value) {
  const allowed = expected(path);
  const types = allowed ?? ['color', 'dimension', 'number'];
  return types.find(type => valid[type](value) || type === 'dimension' && lineHeightPercent(path, value));
}

export function validateTokens(tokens) {
  const leaves = new Map();
  function scan(value, path = '') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error(`invalid token group: ${path}`);
    if ('$value' in value) { leaves.set(path, value); return; }
    for (const [key, child] of Object.entries(value)) {
      if (key.includes('.')) throw Error(`ambiguous token name: ${key}`);
      scan(child, path ? `${path}.${key}` : key);
    }
  }
  scan(tokens);
  function resolve(path, seen = new Set()) {
    const token = leaves.get(path);
    if (!token) throw Error(`missing token reference: ${path}`);
    if (seen.has(path)) throw Error(`cyclic token reference: ${path}`);
    seen.add(path);
    const value = token.$value, target = reference(value) ? resolve(value.slice(1, -1), seen) : token;
    const type = token.$type ?? target.$type;
    if (!Object.hasOwn(valid, type)) throw Error(`unknown token type at ${path}: ${type}`);
    const allowed = expected(path);
    if (allowed && !allowed.includes(type)) throw Error(`incompatible token type at ${path}: ${type}`);
    if (token.$type && token.$type !== target.$type) throw Error(`incompatible token reference at ${path}: ${token.$type} vs ${target.$type}`);
    if (!reference(value) && !valid[type](value) && !(type === 'dimension' && lineHeightPercent(path, value))) throw Error(`invalid ${type} value at ${path}`);
    return target;
  }
  for (const path of leaves.keys()) resolve(path);
}
