// designmd-to-sd.mjs: DESIGN.md YAML frontmatter -> Style Dictionary DTCG source (X3 fix, round-1 hardened).
// Usage: node designmd-to-sd.mjs <DESIGN.md> <out.json>
// Keeps lineHeight, letterSpacing and the components block (references like {colors.primary} kept as-is).
// Local file in, local file out: no network, no exec, no env.
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { join, resolve, dirname } from 'node:path';
import { verifiedDeps } from './verify-deps.mjs';
import { fontWeightAliases, inferTokenType, validateTokens } from './token-references.mjs';
let depsRoot;
try { depsRoot = verifiedDeps(process.env.FANNAN_DEPS, dirname(dirname(fileURLToPath(import.meta.url)))); }
catch (e) { console.error('designmd-to-sd: dependencies untrusted: ' + e.message); process.exit(2); }
const { parse } = await import(pathToFileURL(join(depsRoot, 'node_modules/yaml/dist/index.js')).href);

const die = (msg, code = 2) => { console.error(`designmd-to-sd: ${msg}`); process.exit(code); };
const [, , src, out, project] = process.argv;
if (!src || !out || !project) die('usage: FANNAN_DEPS=<npm prefix> node designmd-to-sd.mjs <DESIGN.md> <out.json> <project>');
if (!existsSync(src)) die(`input not found: ${src}`);

const text = readFileSync(src, 'utf8').replace(/^\uFEFF/, '');
const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
if (!m) die('no YAML frontmatter found (DESIGN.md must start with --- ... ---)');
let fm;
try { fm = parse(m[1]); } catch (e) { die(`invalid YAML frontmatter: ${e.message}`); }
if (!fm || typeof fm !== 'object' || Array.isArray(fm)) die('frontmatter must be a YAML mapping');

const warnings = [];
const errors = [];
const color = v => typeof v === 'string' && (/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v) || /^(rgb|hsl|oklch|oklab)a?\(/i.test(v));
function token(group, key, v, path) {
  if (group === 'typography' && key === 'fontWeight' && typeof v === 'string' && Object.hasOwn(fontWeightAliases, v)) v = fontWeightAliases[v]; // R4-1: CSS-valid number
  const t = { $value: v };
  const ref = typeof v === 'string' && /^\{[^{}]+\}$/.test(v);
  const ty = ref ? undefined : inferTokenType(path, v);
  if (ty) t.$type = ty;
  else if (!ref) {
    if (typeof v === 'number' && (group === 'breakpoints' || group === 'typography' && ['fontSize', 'letterSpacing'].includes(key))) errors.push(`units required at ${path}: use px, rem or em`);
    else errors.push(`unknown token type at ${path}`);
  }
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
    if (group === 'colors' && typeof v === 'string' && !/^\{[^{}]+\}$/.test(v) && !color(v)) errors.push(`not a colour at ${p}: ${v}`);
    if (typeof v === 'object' && !Array.isArray(v)) outObj[k] = wrap(group, v, p);
    else outObj[k] = token(group, k, v, p);
  }
  return outObj;
}
const tok = {};
for (const g of ['colors', 'rounded', 'spacing', 'breakpoints', 'typography', 'components']) {
  if (fm[g] === undefined) continue;
  if (typeof fm[g] !== 'object' || Array.isArray(fm[g]) || fm[g] === null) die(`"${g}" must be a mapping`);
  tok[g] = wrap(g, fm[g], g);
  if (!Object.keys(tok[g]).length) errors.push(`group "${g}" is empty`);
}
if (errors.length) { for (const e of errors) console.error(`designmd-to-sd: error: ${e}`); process.exit(3); }
if (!Object.keys(tok).length) die('no token groups found (colors, rounded, spacing, breakpoints, typography, components)');
try { validateTokens(tok); } catch (e) { die(e.message, 3); }
execFileSync(join(dirname(fileURLToPath(import.meta.url)), 'safe-write.sh'), [project, resolve(out)], { input: JSON.stringify(tok, null, 1) + '\n', encoding: 'utf8' });
for (const w of warnings) console.error(`designmd-to-sd: warning: ${w}`);
console.log(`designmd-to-sd: wrote ${out} (${Object.keys(tok).join(', ')})`);
