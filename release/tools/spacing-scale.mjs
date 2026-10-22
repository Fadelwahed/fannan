// browser-side screen for spacing outside the approved spacing scale. Playwright serialises spacingProbe
// into the page, so it must stay self-contained. Screening only; reviewers still judge rhythm.
// the approved scale is passed in from the hash-checked handoff token JSON (approvedSpacing below);
// it is never read from the page's own --spacing-* declarations, so a page cannot add a variable to legitimise a value.
// horizontal margins are screened too. getComputedStyle resolves `auto` margins to used pixels, so a margin whose
// computed value (computedStyleMap) is the `auto` keyword is skipped; 0, auto and normal are skipped.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { validateTokens } from './token-references.mjs';

// no measuring element. Page CSS (including !important rules) cannot reach the scale: approved values are
// converted numerically. px is used directly, rem via the root element's computed font size, and em via each inspected
// element's own computed font size (CSS resolves padding, margin and gap em against the element itself).
export function spacingProbe(approved = []) {
  const units = { px: [], rem: [], em: [] };
  for (const value of Array.isArray(approved) ? approved : []) {
    const m = typeof value === 'string' && /^(\d*\.?\d+)(px|rem|em)$/.exec(value); // plain lengths only
    if (m && Number(m[1]) > 0) units[m[2]].push(Number(m[1]));
  }
  const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize);
  const near = (a, b) => Math.abs(a - b) < 0.05;
  const scale = new Set([...units.px.map(n => n + 'px'), ...units.rem.map(n => n * rootPx + 'px')]);
  const keys = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'rowGap', 'columnGap'];
  const cssName = { marginLeft: 'margin-left', marginRight: 'margin-right', marginTop: 'margin-top', marginBottom: 'margin-bottom' };
  const off = new Map(), exceptions = [];
  const composed = [document.documentElement, document.body].filter(Boolean); // html and body margins too
  const walkComposed = root => { for (const el of root.querySelectorAll('*')) { composed.push(el); if (el.shadowRoot) walkComposed(el.shadowRoot); } };
  if (document.body) walkComposed(document.body); // open shadow roots too (spacing and exceptions)
  for (const el of composed) {
    const r = el.getBoundingClientRect(), c = getComputedStyle(el);
    if (!(r.width > 0 && r.height > 0) || c.visibility === 'hidden' || c.display === 'none') continue;
    // a documented exception (data-fannan-spacing-exception="<reason>") excuses this element's own
    // off-scale values; each is recorded in the evidence for review. A blank reason excuses nothing.
    const excuse = (el.getAttribute('data-fannan-spacing-exception') || '').trim();
    const offHere = [];
    const elPx = parseFloat(c.fontSize);
    const allowed = [...units.px, ...units.rem.map(n => n * rootPx), ...units.em.map(n => n * elPx)];
    for (const key of keys) {
      const value = c[key];
      if (!value || ['0px', 'auto', 'normal'].includes(value)) continue;
      if (cssName[key] && String(el.computedStyleMap?.().get(cssName[key])) === 'auto') continue; // used px of an auto margin
      const px = /^-?\d*\.?\d+px$/.test(value) ? parseFloat(value) : NaN;
      if (Number.isFinite(px) && allowed.some(a => near(a, px))) continue;
      if (excuse) { offHere.push(value); continue; }
      if (!off.has(value)) off.set(value, { value, property: key, example: el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '') });
    }
    if (offHere.length) exceptions.push({ element: el.tagName.toLowerCase() + (el.id ? `#${el.id}` : ''), id: el.id || null, reason: excuse, values: [...new Set(offHere)] }); // the id resolves it
  }
  return { spacingScale: [...scale].sort(), spacingScaleEm: units.em.map(n => n + 'em'), rootFontSize: rootPx + 'px', spacingOffScale: [...off.values()], spacingExceptions: exceptions };
}

// node side. Reads the handoff's token JSON once, checks those exact bytes against the handoff SHA-256
// and the Style Dictionary build evidence input hash, validates the tokens and returns every spacing.* value
// (references resolved). On any failure it returns no values and an error, so every nonzero spacing is off-scale.
export function approvedSpacing(handoff) {
  const loaded = approvedTokens(handoff);
  if (loaded.error) return { values: [], error: loaded.error };
  const { tokens, literal, source } = loaded;
  const values = new Set();
  const walk = node => { if (!node || typeof node !== 'object') return; if ('$value' in node) { const v = literal(node); if (typeof v === 'string') values.add(v); return; } for (const child of Object.values(node)) walk(child); };
  walk(tokens.spacing);
  return { values: [...values].sort(), source };
}

// the accent is bound to the approved palette token, not to whatever the page declares.
// colors.accent wins, then colors.primary (the names Style Dictionary emits as --colors-accent / --colors-primary).
export function approvedAccent(handoff) {
  const loaded = approvedTokens(handoff);
  if (loaded.error) return { token: null, value: null, error: loaded.error };
  for (const token of ['accent', 'primary']) {
    const v = loaded.literal(loaded.tokens?.colors?.[token]);
    if (typeof v === 'string' && v.trim()) return { token: `colors.${token}`, value: v.trim(), source: loaded.source };
  }
  return { token: null, value: null, error: 'approved tokens declare no colors.accent or colors.primary' };
}

export function approvedTokens(handoff) {
  const json = handoff?.tokens?.json;
  if (typeof json?.path !== 'string' || !/^[a-f0-9]{64}$/.test(json?.sha256 || '')) return { error: 'handoff tokens.json path and SHA-256 required' };
  let bytes;
  try { bytes = readFileSync(resolve(json.path)); } catch { return { error: 'handoff tokens.json cannot be read' }; }
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== json.sha256) return { error: 'tokens.json SHA-256 does not match the handoff' };
  let build = null;
  try { build = JSON.parse(readFileSync(resolve(handoff.tokens.buildEvidence.path), 'utf8')); } catch {}
  if (build?.inputSha256 !== sha256) return { error: 'Style Dictionary build evidence missing or not built from this tokens.json' };
  let tokens;
  try { tokens = JSON.parse(bytes.toString('utf8')); validateTokens(tokens); } catch (e) { return { error: `tokens.json invalid: ${e.message}` }; }
  const lookup = path => path.split('.').reduce((at, key) => at && typeof at === 'object' ? at[key] : undefined, tokens);
  const literal = (token, depth = 0) => { const v = token?.$value; return typeof v === 'string' && /^\{[^{}]+\}$/.test(v) && depth < 64 ? literal(lookup(v.slice(1, -1)), depth + 1) : v; };
  return { tokens, literal, source: { path: json.path, sha256 } };
}
