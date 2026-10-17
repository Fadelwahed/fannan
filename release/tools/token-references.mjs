export function validateReferences(tokens) {
  const refs = new Map();
  function scan(value, path = '') {
    if (value && typeof value === 'object' && '$value' in value) {
      refs.set(path, typeof value.$value === 'string' && /^\{[^{}]+\}$/.test(value.$value) ? value.$value.slice(1, -1) : null);
    } else if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) scan(child, path ? `${path}.${key}` : key);
    }
  }
  scan(tokens);
  function resolve(path, seen = new Set()) {
    if (!refs.has(path)) throw Error(`missing token reference: ${path}`);
    if (seen.has(path)) throw Error(`cyclic token reference: ${path}`);
    seen.add(path);
    const next = refs.get(path);
    if (next) resolve(next, seen);
  }
  for (const path of refs.keys()) resolve(path);
}
