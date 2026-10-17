// OPUS-R2-10: browser-side screen for spacing outside the approved spacing scale. Playwright serialises spacingProbe
// into the page, so it must stay self-contained. Screening only; reviewers still judge rhythm.
// CODEX-R3-02: the approved scale is passed in from the hash-checked handoff token JSON (approvedSpacing below);
// it is never read from the page's own --spacing-* declarations, so a page cannot add a variable to legitimise a value.
// Horizontal margins are skipped because `auto` margins resolve to used pixel values; 0, auto and normal are skipped.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { validateTokens } from './token-references.mjs';

export function spacingProbe(approved = []) {
  const probe = document.createElement('div'); document.body.append(probe);
  const scale = new Set();
  for (const value of Array.isArray(approved) ? approved : []) {
    if (typeof value !== 'string' || !/^\d*\.?\d+(px|rem|em)$/.test(value)) continue; // plain lengths only
    probe.style.paddingTop = ''; probe.style.paddingTop = value;
    const px = getComputedStyle(probe).paddingTop;
    if (/^\d*\.?\d+px$/.test(px) && px !== '0px') scale.add(px);
  }
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

// CODEX-R3-02: node side. Reads the handoff's token JSON once, checks those exact bytes against the handoff SHA-256
// and the Style Dictionary build evidence input hash, validates the tokens and returns every spacing.* value
// (references resolved). On any failure it returns no values and an error, so every nonzero spacing is off-scale.
export function approvedSpacing(handoff) {
  const json = handoff?.tokens?.json;
  if (typeof json?.path !== 'string' || !/^[a-f0-9]{64}$/.test(json?.sha256 || '')) return { values: [], error: 'handoff tokens.json path and SHA-256 required' };
  let bytes;
  try { bytes = readFileSync(resolve(json.path)); } catch { return { values: [], error: 'handoff tokens.json cannot be read' }; }
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== json.sha256) return { values: [], error: 'tokens.json SHA-256 does not match the handoff' };
  let build = null;
  try { build = JSON.parse(readFileSync(resolve(handoff.tokens.buildEvidence.path), 'utf8')); } catch {}
  if (build?.inputSha256 !== sha256) return { values: [], error: 'Style Dictionary build evidence missing or not built from this tokens.json' };
  let tokens;
  try { tokens = JSON.parse(bytes.toString('utf8')); validateTokens(tokens); } catch (e) { return { values: [], error: `tokens.json invalid: ${e.message}` }; }
  const lookup = path => path.split('.').reduce((at, key) => at && typeof at === 'object' ? at[key] : undefined, tokens);
  const literal = (token, depth = 0) => { const v = token?.$value; return typeof v === 'string' && /^\{[^{}]+\}$/.test(v) && depth < 64 ? literal(lookup(v.slice(1, -1)), depth + 1) : v; };
  const values = new Set();
  const walk = node => { if (!node || typeof node !== 'object') return; if ('$value' in node) { const v = literal(node); if (typeof v === 'string') values.add(v); return; } for (const child of Object.values(node)) walk(child); };
  walk(tokens.spacing);
  return { values: [...values].sort(), source: { path: json.path, sha256 } };
}
