// R25 (panel round 25): real-Chrome regressions for Mi'mar's R25 tiebreaks as confirmed and tightened by Fadel. A hidden
// control counts once, as one name per owning control: text nested in a control is part of it (R25-GPT-01, an R24
// regression). The one-to-one count is shared across all clipping boxes of one screen, state and width; carousel slide
// states keep their own counts (R25-GPT-02). Content collapsed at a width by a box with zero visible area (max-height or
// height 0 with overflow hidden) is rescued by a declared state exactly as display:none is; a partial cut still fails
// (R25-GPT-03). One more swap on the closed list: tabs becoming headed sections, each tab with a shown heading of the same
// name and every panel's content and actions still shown (R25-GPT-04). Each test was first run against the dc1338f
// sources and failed there at its assertion (test-results/r25/R25-*-before.log).
import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as integrity from '../tools/integrity.mjs';
import * as visibility from '../tools/visibility.mjs';
import { screenWidths } from '../tools/width-screen.mjs';

const { contentProbe, contrastProbe, compareIntegrity, VECTOR } = integrity;
const release = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const deps = process.env.FANNAN_DEPS || resolve(release, '..', 'runtime-deps');
const chrome = process.env.FANNAN_TEST_CHROME || '/usr/bin/google-chrome';
const haveChrome = existsSync(join(deps, 'node_modules/playwright-core')) && existsSync(chrome);
const skip = !haveChrome && 'test-only deps or local Chrome absent';
// a noisy photograph stand-in (seeded random RGB noise with soft bands), as an 8-bit RGB PNG
const photo = () => {
  const w = 320, h = 200, raw = Buffer.alloc((w * 3 + 1) * h); let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3, base = 90 + 80 * Math.sin(x / 23) * Math.cos(y / 17); for (let c = 0; c < 3; c++) raw[o + c] = Math.max(0, Math.min(255, base + [40, 10, -20][c] + (rnd() - 0.5) * 120)); }
  const crc = b => { let c = ~0; for (const x of b) { c ^= x; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1; } return ~c >>> 0; };
  const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
};
const withBrowser = async fn => {
  const { chromium } = createRequire(join(deps, 'node_modules/'))('playwright-core');
  const { isolatedPage } = await import('../tools/probe-world.mjs');
  const dir = mkdtempSync(join(tmpdir(), 'fannan-r25-'));
  writeFileSync(join(dir, 'photo.png'), photo());
  const browser = await chromium.launch({ executablePath: chrome, args: ['--headless=new'] });
  const open = async (html, javaScriptEnabled = true) => {
    const file = join(dir, `p${Math.random().toString(36).slice(2)}.html`); writeFileSync(file, html);
    const ctx = await browser.newContext({ javaScriptEnabled, viewport: { width: 1440, height: 900 } });
    const main = await ctx.newPage(); await main.goto(pathToFileURL(file).href); await main.waitForLoadState('load'); await main.waitForTimeout(100);
    return { main, probe: await isolatedPage(main) };
  };
  try { await fn({ open }); } finally { await browser.close(); rmSync(dir, { recursive: true, force: true }); }
};
const widths = { 1440: 0, 320: 0 };
const base = Object.fromEntries(Object.entries(VECTOR).map(([k, t]) => [k, t === 'flag' ? false : t === 'text' ? '#123456' : t === 'widths' ? widths : t === 'coverage' ? 5 : 0]));
const scope = { screen: 'home', state: 'default', lang: 'en' };
const FIELDS = ['textMeasured', 'textObscured', 'textUnreadable', 'textUnmeasured', 'textHidden'];
// one rendering measured as pre-handoff-check measures it: the CSS contrast pass plus the visibility backstop
const measure = async (pg, opts) => {
  const v = { ...base, ...await pg.evaluate(contrastProbe) };
  const vis = await integrity.visibilityScan(pg, opts ? { ...integrity.VISIBILITY, ...opts } : undefined); for (const k of FIELDS) v[k] = vis[k] ?? 0; v.visibility = vis;
  return { vector: v, content: await pg.evaluate(contentProbe) };
};
const both = async (open, html) => {
  const on = await measure((await open(html)).probe), off = await measure((await open(html, false)).probe);
  return { on, off, integrity: compareIntegrity({ probe: on, page: on, jsOff: off, tamperSigns: [], scope }) };
};
const page = (body, script = '', head = '') => `<!doctype html><html lang="en"><head>${head}</head><body style="background:#fff;margin:0;font:16px/1.5 sans-serif"><main style="padding:20px"><h1>Title</h1>${body}</main>${script ? `<script>${script}</script>` : ''}</body></html>`;
const W = (body, script = '', dir = 'ltr') => `<!doctype html><html lang="${dir === 'rtl' ? 'ar' : 'en'}" dir="${dir}"><head></head><body style="background:#fff;margin:0;font:16px/1.5 sans-serif;color:#1a1a1a"><main style="padding:20px"><h1>${dir === 'rtl' ? 'عنوان' : 'Title'}</h1>${body}</main>${script ? `<script>${script}</script>` : ''}</body></html>`;

const ws = await import('../tools/width-screen.mjs');
// states: { stateName: html }; the overall result after resolving reveals, truncations and losses across the declared states
const gateOf = open => async (states, dir = 'ltr') => {
  // R29: a state is its html, or { html, opener, reveals } when it declares the reveal it rescues (checked by the gate)
  const decl = Object.entries(states).map(([state, v]) => [state, typeof v === 'string' ? { html: v } : v]);
  const probes = decl.filter(([, v]) => v.opener && v.reveals).map(([state, v]) => ({ state, opener: v.opener, reveals: v.reveals }));
  const scopes = []; for (const [state, v] of decl) scopes.push({ scope: { screen: 'home', state, lang: dir === 'rtl' ? 'ar' : 'en' }, widths: await ws.screenWidths((await open(v.html)).main, [1440], null, 900, probes), declaration: v.opener && v.reveals ? { opener: v.opener, reveals: v.reveals } : null });
  const r = ws.resolveReveals(scopes);
  const rules = [...new Set(scopes.flatMap(s => s.widths.results.flatMap(x => [...x.clipped.filter(c => !c.revealedBy).map(c => c.rule), ...(x.offscreenLeft.length ? ['offscreenLeft'] : []), ...((x.lost || []).filter(l => !l.reachableIn).length ? ['not shown at this width'] : [])])))].sort();
  if (process.env.DUMP) console.log(JSON.stringify(Object.keys(states)), JSON.stringify(scopes.map(s => s.widths.results.map(x => [x.width, x.clipped, x.lost, x.offscreenLeft]))).slice(0, 3000));
  return { pass: r.pass && scopes.every(s => s.widths.pass), rules };
};
const img = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000"><rect width="1600" height="1000" fill="#7a9"/><circle cx="800" cy="500" r="300" fill="#345"/></svg>');

// the page each 'l' element is hidden below 600 px and each 's' element above it (the panel's repro pattern)
const LS = '<style>@media (max-width:600px){.l{display:none}}@media (min-width:601px){.s{display:none}}</style>';
const svgBand = (fill, patch, width) => `background:url('data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="200"><rect width="1200" height="200" fill="${fill}"/>${patch ? `<rect width="${width}" height="200" fill="${patch}"/>` : ''}</svg>`)}')`;
const P = x => W(LS + x);



// R29: a declared state that rescues hidden content names its opener and the region it reveals
const D = (html, opener, reveals) => ({ html, opener, reveals });
const ACC = html => D(html, 'button[aria-expanded]', 'button[aria-expanded] + div');

test('R25-GPT-01: real Chrome: a hidden control counts once per owning control: a button>span inside a collapsed accordion passes with its expanded state; two real same-name buttons with one shown still fail (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const acc = (exp, inner) => W(`<button aria-expanded="${exp}">Downloads</button><div style="${exp ? '' : 'max-height:0;overflow:hidden'}"><p>Files for this release.</p>${inner}</div>`);
  const nested = '<button><span>Download</span></button>', two = '<button><span>Download</span></button> <button>Download</button>';
  assert.deepEqual({
    nestedLabel: await gate({ default: acc(false, nested), expanded: ACC(acc(true, nested)) }),
    nestedLabelDeep: await gate({ default: acc(false, '<a href="/f"><span><b>Get</b> the file</span></a>'), expanded: ACC(acc(true, '<a href="/f"><span><b>Get</b> the file</span></a>')) }),
    twoShownOne: (await gate({ default: acc(false, two), expanded: ACC(acc(true, nested)) })).pass,
  }, { nestedLabel: { pass: true, rules: [] }, nestedLabelDeep: { pass: true, rules: [] }, twoShownOne: false });
}));

test('R25-GPT-02: real Chrome: the one-to-one count is shared across clipping boxes: two collapsed panels each with a Download fail when the expanded state shows one Download, and pass when it shows both; carousel slide states keep their own counts (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const panels = (exp, n) => W(['Windows', 'Mac'].map((os, i) => `<button aria-expanded="${exp}">${os}</button><div style="${exp ? '' : 'max-height:0;overflow:hidden'}"><p>Files for ${os}.</p>${!exp || i < n ? '<button>Download</button>' : ''}</div>`).join(''));
  const slides = ['Shop shoes', 'Shop bags', 'Shop hats'];
  const carousel = i => W(`<div style="overflow:hidden;width:300px"><div style="display:flex;width:900px;transform:translateX(-${i * 300}px)">${slides.map((s, k) => `<div style="flex:0 0 300px"><p>Slide ${k + 1}</p><button>${s}</button></div>`).join('')}</div></div>`);
  const r = {
    siblingsShowOne: (await gate({ default: panels(false), expanded: ACC(panels(true, 1)) })).pass,
    siblingsShowBoth: await gate({ default: panels(false), expanded: ACC(panels(true, 2)) }),
    carousel: (await gate({ default: carousel(0), 'slide-2': carousel(1), 'slide-3': carousel(2) })).pass,
  };
  assert.deepEqual(r, { siblingsShowOne: false, siblingsShowBoth: { pass: true, rules: [] }, carousel: true });
}));

test('R25-GPT-03: real Chrome: a nav collapsed at 320 by max-height:0 and overflow hidden is rescued by a declared menu-open state, like display:none; without the state it fails; a partial cut (max-height 1.5em) still fails with the state (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const nav = (how, isOpen) => W(`<style>.nav{margin:0;padding:0;list-style:none}@media (max-width:600px){.nav{${isOpen ? '' : how}}}@media (min-width:601px){.menu{display:none}}</style><nav aria-label="Main"><button class="menu" aria-expanded="${isOpen}">Menu</button><ul class="nav"><li><a href="/about">About</a></li><li><a href="/team">Team</a></li><li><a href="/contact">Contact</a></li></ul></nav>`);
  const mh = 'max-height:0;overflow:hidden', h0 = 'height:0;overflow:hidden', dn = 'display:none', part = 'max-height:1.5em;overflow:hidden';
  assert.deepEqual({
    maxHeightAlone: (await gate({ default: nav(mh, false) })).pass,
    maxHeightMenuOpen: await gate({ default: nav(mh, false), 'menu-open': D(nav(mh, true), '.menu', '.nav') }),
    heightZeroMenuOpen: await gate({ default: nav(h0, false), 'menu-open': D(nav(h0, true), '.menu', '.nav') }),
    displayNoneMenuOpen: await gate({ default: nav(dn, false), 'menu-open': D(nav(dn, true), '.menu', '.nav') }),
    partialMenuOpen: (await gate({ default: nav(part, false), 'menu-open': D(nav(part, true), '.menu', '.nav') })).pass,
  }, { maxHeightAlone: false, maxHeightMenuOpen: { pass: true, rules: [] }, heightZeroMenuOpen: { pass: true, rules: [] }, displayNoneMenuOpen: { pass: true, rules: [] }, partialMenuOpen: false });
}));

test('R25-GPT-04: real Chrome: tabs becoming headed sections pass when every tab gets a shown heading with the same name and all panel content and actions stay shown; a missing heading, a renamed heading or a dropped panel action fails; plain paragraphs are no swap (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const tabs = '<div class="l"><div role="tablist" aria-label="Plan details"><button role="tab" aria-selected="true">Overview</button><button role="tab" aria-selected="false">Pricing</button></div><div role="tabpanel"><p>Overview text.</p><button>Compare plans</button></div></div>';
  const sections = ({ h = ['Overview', 'Pricing'], action = true, tag = 'h2' } = {}) => `<div class="s">${h.map((n, i) => `<section>${n ? `<${tag}>${n}</${tag}>` : ''}<p>${i ? 'Pricing text.' : 'Overview text.'}</p>${!i && action ? '<button>Compare plans</button>' : ''}</section>`).join('')}</div>`;
  assert.deepEqual({
    headedSections: await gate({ default: P(tabs + sections()) }),
    roleHeading: await gate({ default: P(tabs + '<div class="s"><div role="heading" aria-level="2">Overview</div><p>Overview text.</p><button>Compare plans</button><div role="heading" aria-level="2">Pricing</div><p>Pricing text.</p></div>') }),
    missingHeading: await gate({ default: P(tabs + sections({ h: ['Overview', ''] })) }),
    renamedHeading: await gate({ default: P(tabs + sections({ h: ['Overview', 'Prices'] })) }),
    droppedAction: await gate({ default: P(tabs + sections({ action: false })) }),
    plainParagraphs: await gate({ default: P(tabs + sections({ tag: 'p' })) }),
  }, {
    // R26 (Fadel): tabs to headed sections now needs every tab panel declared as a state; these pages declare only the
    // default (Overview) panel, so the swap does not apply (R26 adds the declared-panel passes in panel-r26.test.mjs)
    headedSections: { pass: false, rules: ['not shown at this width'] }, roleHeading: { pass: false, rules: ['not shown at this width'] },
    missingHeading: { pass: false, rules: ['not shown at this width'] }, renamedHeading: { pass: false, rules: ['not shown at this width'] },
    droppedAction: { pass: false, rules: ['not shown at this width'] }, plainParagraphs: { pass: false, rules: ['not shown at this width'] },
  });
}));
