const reference = value => typeof value === 'string' && /^\{[^{}]+\}$/.test(value);
const dimension = value => typeof value === 'string' && /^-?\d*\.?\d+(px|rem|em)$/.test(value);
const lineHeightPercent = (path, value) => path.endsWith('.lineHeight') && typeof value === 'string' && /^\d*\.?\d+%$/.test(value);
const color = value => typeof value === 'string' && (/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value) || /^(rgb|hsl|oklch|oklab)a?\(/i.test(value));
const weights = new Set(['thin', 'hairline', 'extra-light', 'ultra-light', 'light', 'normal', 'regular', 'book', 'medium', 'semi-bold', 'demi-bold', 'bold', 'extra-bold', 'ultra-bold', 'black', 'heavy', 'extra-black', 'ultra-black']);
const valid = {
  color,
  dimension,
  number: value => typeof value === 'number' && Number.isFinite(value),
  fontFamily: value => typeof value === 'string' && !!value.trim() || Array.isArray(value) && value.length > 0 && value.every(name => typeof name === 'string' && !!name.trim()),
  fontWeight: value => typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= 1000 || typeof value === 'string' && weights.has(value)
};

function expected(path) {
  const parts = path.split('.'), group = parts[0], key = parts.at(-1);
  if (group === 'colors') return ['color'];
  if (['rounded', 'breakpoints'].includes(group)) return ['dimension'];
  if (group === 'spacing') return ['dimension', 'number'];
  if (group === 'typography') return ({ fontFamily: ['fontFamily'], fontSize: ['dimension'], fontWeight: ['fontWeight'], letterSpacing: ['dimension'], lineHeight: ['number', 'dimension'] })[key];
  if (group === 'components') {
    if (/color$/i.test(key)) return ['color'];
    if (/^(rounded|padding|margin|gap)$/.test(key)) return ['dimension'];
  }
}

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
