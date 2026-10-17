// designmd-to-sd.mjs: DESIGN.md YAML frontmatter -> Style Dictionary DTCG source (X3 fix, round-1 hardened).
// Usage: node designmd-to-sd.mjs <DESIGN.md> <out.json>
// Keeps lineHeight, letterSpacing and the components block (references like {colors.primary} kept as-is).
// Local file in, local file out: no network, no exec, no env.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { parse } from 'yaml';

const die = (msg, code = 2) => { console.error(`designmd-to-sd: ${msg}`); process.exit(code); };
const [, , src, out] = process.argv;
if (!src || !out) die('usage: node designmd-to-sd.mjs <DESIGN.md> <out.json>');
if (!existsSync(src)) die(`input not found: ${src}`);

const text = readFileSync(src, 'utf8').replace(/^\uFEFF/, '');
const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
if (!m) die('no YAML frontmatter found (DESIGN.md must start with --- ... ---)');
let fm;
try { fm = parse(m[1]); } catch (e) { die(`invalid YAML frontmatter: ${e.message}`); }
if (!fm || typeof fm !== 'object' || Array.isArray(fm)) die('frontmatter must be a YAML mapping');

const warnings = [];
const GROUP_TYPE = { colors: 'color', rounded: 'dimension', spacing: 'dimension' };
const errors = [];
const TYPO_TYPE = { fontFamily: 'fontFamily', fontSize: 'dimension', lineHeight: 'number', letterSpacing: 'dimension', fontWeight: 'fontWeight' };

function typeFor(group, key, v) {
  if (typeof v === 'string' && /^\{.+\}$/.test(v)) return undefined; // reference: type comes from target
  if (typeof v === 'number' && (group === 'spacing' || group === 'rounded')) return 'number'; // unitless stays a number (SD must not turn 8 into 8rem)
  if (group === 'typography' && TYPO_TYPE[key]) return (key === 'lineHeight' && typeof v === 'string' && /(px|rem|em)$/.test(v)) ? 'dimension' : TYPO_TYPE[key];
  if (GROUP_TYPE[group]) return GROUP_TYPE[group];
  if (typeof v === 'string' && /^#([0-9a-f]{3,8})$/i.test(v)) return 'color';
  if (typeof v === 'string' && /^-?\d*\.?\d+(px|rem|em)$/.test(v)) return 'dimension';
  if (typeof v === 'number') return 'number';
  return undefined;
}
function token(group, key, v, path) {
  const t = { $value: Array.isArray(v) ? v : v }; // numbers stay numbers, arrays stay arrays
  const ty = typeFor(group, key, v); if (ty) t.$type = ty;
  return t;
}
function wrap(group, obj, path) {
  const outObj = {};
  for (const [k, v] of Object.entries(obj)) {
    const p = `${path}.${k}`;
    if (v === null || v === undefined) {
      if (group === 'colors') errors.push(`empty colour at ${p} (an unquoted #hex is a YAML comment: quote it, e.g. "#112233")`);
      else warnings.push(`skipped empty value at ${p}`);
      continue;
    }
    if (group === 'colors' && typeof v === 'string' && !/^\{.+\}$/.test(v) && !/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v) && !/^(rgb|hsl|oklch|oklab)a?\(/i.test(v)) errors.push(`not a colour at ${p}: ${v}`);
    if (typeof v === 'object' && !Array.isArray(v)) outObj[k] = wrap(group, v, p);
    else outObj[k] = token(group, k, v, p);
  }
  return outObj;
}
const tok = {};
for (const g of ['colors', 'rounded', 'spacing', 'typography', 'components']) {
  if (fm[g] === undefined) continue;
  if (typeof fm[g] !== 'object' || Array.isArray(fm[g]) || fm[g] === null) die(`"${g}" must be a mapping`);
  tok[g] = wrap(g, fm[g], g);
  if (!Object.keys(tok[g]).length) errors.push(`group "${g}" is empty`);
}
if (errors.length) { for (const e of errors) console.error(`designmd-to-sd: error: ${e}`); process.exit(3); }
if (!Object.keys(tok).length) die('no token groups found (colors, rounded, spacing, typography, components)');
writeFileSync(out, JSON.stringify(tok, null, 1) + '\n');
for (const w of warnings) console.error(`designmd-to-sd: warning: ${w}`);
console.log(`designmd-to-sd: wrote ${out} (${Object.keys(tok).join(', ')})`);
