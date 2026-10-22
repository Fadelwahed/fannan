// R23 (panel round 23): real-Chrome regressions for Fadel's R23 tiebreaks. A control at a narrow width matches its 1440
// control only by the SAME accessible name, one to one; button, link, menuitem, menuitemcheckbox and menuitemradio are
// one action family, so an action moved into a declared More menu passes, while 'Save as' hidden next to 'Save' fails
// (R23-GPT-02, R23-MIMAR-01; prefix and abbreviation matching is gone). A wrapper is a media crop only if its cut set is
// media or decoration: a control's label text cut by its box is clipped (R23-GPT-03). Every WAI-ARIA widget role and its
// native equivalent is a control (R23-GPT-04). A clamp may only hide text: a control cut by it, wholly or partly, is
// never excused (R23-GPT-05). An unmeasured faintest glyph is zone (c), resolvable by a citing PASS review naming the
// worst region; measured below 3:1 stays an unconditional fail (R23-GPT-01, P3). Each test was first run against the
// eeeb371 sources and failed there at its assertion (test-results/r23/R23-*-before.log).
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
  const dir = mkdtempSync(join(tmpdir(), 'fannan-r23-'));
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

test('R23-GPT-02, R23-MIMAR-01: real Chrome: a control matches only by the same accessible name, one to one, within an action family: Save as hidden next to Save, Cancel subscription next to Cancel, Compare all plans next to Compare, a second Remove button and a shortened label fail; Export report moved into a declared More menu as a menuitem, a link becoming a button and a shortened label keeping its aria-label pass (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const toolbar = open => P(`<div role="toolbar"><button>Print</button> <button class="l">Export report</button> <button class="s" aria-expanded="${open}">More</button>${open ? '<div role="menu" class="s"><div role="menuitem" tabindex="-1">Export report</div></div>' : ''}</div>`);
  assert.deepEqual({
    saveAs: await gate({ default: P('<button>Save</button> <button class="l">Save as</button>') }),
    cancelSubscription: await gate({ default: P('<button class="l">Cancel subscription</button> <button>Cancel</button>') }),
    compareAllPlans: await gate({ default: P('<a href="/plans" class="l">Compare all plans</a> <a href="/compare">Compare</a>') }),
    secondRemove: await gate({ default: P('<button>Remove</button> <button class="l">Remove</button>') }),
    shortLabel: await gate({ default: P('<button><span class="l">Request a demo</span><span class="s">Demo</span></button>') }),
    exportToMenuitem: await gate({ default: toolbar(false), 'more-open': D(toolbar(true), '[aria-expanded]', '[role="menu"]') }),
    linkToButton: await gate({ default: P('<a href="/sales" class="l">Contact sales</a><button class="s">Contact sales</button>') }),
    shortLabelAria: await gate({ default: P('<button aria-label="Request a demo"><span class="l">Request a demo</span><span class="s">Demo</span></button>') }),
  }, {
    saveAs: { pass: false, rules: ['not shown at this width'] }, cancelSubscription: { pass: false, rules: ['not shown at this width'] }, compareAllPlans: { pass: false, rules: ['not shown at this width'] },
    secondRemove: { pass: false, rules: ['not shown at this width'] }, shortLabel: { pass: false, rules: ['not shown at this width'] },
    exportToMenuitem: { pass: true, rules: [] }, linkToButton: { pass: true, rules: [] }, shortLabelAria: { pass: true, rules: [] },
  });
}));

test('R23-GPT-03: real Chrome: a control\'s label text cut by its box or a wrapper is clipped, not a media crop; a fitting label and a link wrapping a cropped image pass (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  assert.deepEqual({
    linkLabelCut: await gate({ default: W('<div style="width:100px;overflow:hidden"><a href="/x" style="display:inline-block;width:100px;white-space:nowrap">Download the annual report</a></div>') }),
    buttonLabelCut: await gate({ default: W('<button style="width:90px;overflow:hidden;white-space:nowrap">Download the annual report</button>') }),
    labelFits: await gate({ default: W('<div style="width:240px;overflow:hidden"><a href="/x" style="display:inline-block;white-space:nowrap">Annual report</a></div>') }),
    imageLink: await gate({ default: W(`<a href="/case" style="display:block;overflow:hidden;max-width:300px;height:120px"><img src="${img}" alt="Case study" style="display:block;width:500px"></a>`) }),
  }, { linkLabelCut: { pass: false, rules: ['partly clipped'] }, buttonLabelCut: { pass: false, rules: ['partly clipped'] }, labelFits: { pass: true, rules: [] }, imageLink: { pass: true, rules: [] } });
}));

test('R23-GPT-04: real Chrome: every WAI-ARIA widget role and its native equivalent is a control: a slider, spinbutton, listbox, option, treeitem, menuitemcheckbox, menuitemradio, searchbox, gridcell or native range hidden at 320 is lost; all of them shown pass (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const widgets = {
    slider: '<div role="slider" aria-label="Volume" aria-valuenow="5" tabindex="0" style="width:120px;height:12px;background:#ccc"></div>',
    spinbutton: '<div role="spinbutton" aria-label="Guests" aria-valuenow="2" tabindex="0" style="width:60px;height:24px;border:1px solid #888"></div>',
    listbox: '<div role="listbox" aria-label="Sort order" tabindex="0" style="width:140px;height:24px;border:1px solid #888"></div>',
    option: '<div role="listbox" aria-label="Plans"><div role="option" aria-selected="true">Basic</div><div role="option" class="l" aria-selected="false">Premium</div></div>',
    treeitem: '<div role="tree" aria-label="Files"><div role="treeitem">Reports</div><div role="treeitem" class="l">Archive</div></div>',
    menuitemcheckbox: '<div role="menu" aria-label="View"><div role="menuitemcheckbox" aria-checked="true" class="l">Show grid</div></div>',
    menuitemradio: '<div role="menu" aria-label="Size"><div role="menuitemradio" aria-checked="true" class="l">Large</div></div>',
    searchbox: '<div role="searchbox" aria-label="Search the archive" tabindex="0" style="width:160px;height:24px;border:1px solid #888"></div>',
    gridcell: '<div role="grid" aria-label="Seats"><div role="row"><div role="gridcell" tabindex="0" aria-label="Seat 1A" style="width:20px;height:20px;background:#ccc"></div></div></div>',
    nativeRange: '<label for="v">Brightness</label> <input id="v" type="range">',
  };
  const hide = (n, h) => ['option', 'treeitem', 'menuitemcheckbox', 'menuitemradio'].includes(n) ? h : n === 'nativeRange' ? h.replace('type="range"', 'type="range" class="l"') : h.replace(/^<div role="(\w+)"/, '<div class="l" role="$1"');
  const out = {};
  for (const [n, h] of Object.entries(widgets)) out[n] = (await gate({ default: P(hide(n, h)) })).pass;
  out.allShown = (await gate({ default: W(Object.values(widgets).join('')) })).pass;
  assert.deepEqual(out, { ...Object.fromEntries(Object.keys(widgets).map(n => [n, false])), allShown: true });
}));

test('R23-GPT-05: real Chrome: a clamp may only hide text: a control cut wholly by a line-clamp ending on a line boundary fails even with an expanded state; a collapsed accordion holding a control still passes with its declared state (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const clamp = W('<div style="max-width:260px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden"><p style="margin:0">Two short lines of excerpt that fit.</p><p style="margin:0">Second line here.</p><button style="display:block">Download</button></div><button aria-expanded="false">Read more</button>');
  const expanded = W('<div style="max-width:260px"><p style="margin:0">Two short lines of excerpt that fit.</p><p style="margin:0">Second line here.</p><button style="display:block">Download</button></div><button aria-expanded="true">Read less</button>');
  const acc = exp => W(`<button aria-expanded="${exp}">Billing</button><div style="${exp ? '' : 'max-height:0;overflow:hidden'}"><p>Invoices are sent monthly.</p><a href="/invoices">See invoices</a></div>`);
  assert.deepEqual({
    controlWhollyClamped: await gate({ default: clamp, expanded }),
    accordionWithControl: await gate({ default: acc(false), expanded: ACC(acc(true)) }),
  }, { controlWhollyClamped: { pass: false, rules: ['partly clipped'] }, accordionWithControl: { pass: true, rules: [] } });
}));

test('R23-GPT-01 (P3): resolveContrastIncomplete: an unmeasured faintest glyph is zone (c): a citing PASS review naming the worst region resolves it; without worstRegion it stays INCOMPLETE; a measured value below 3:1 in either rendering fails whatever the review', () => {
  const path = 'html/body/p', paths = [{ target: ['#t'], path, large: false }];
  const vis = { byElement: { [path]: { complete: true } } };
  const cited = { id: 'wcag-review', decision: 'PASS', artifact: 'shot.png' };
  const run = (on, off, review) => visibility.resolveContrastIncomplete({ incomplete: [{ id: 'color-contrast' }], paths, integrity: { probeWorld: { visibility: vis }, jsOff: { visibility: vis }, glyph: { scripted: { [path]: { ratio: on } }, jsOff: { [path]: { ratio: off } } } }, review, shots: ['shot.png'] }).pass;
  const region = { ...cited, worstRegion: 'the lightest part of the image behind the first words' };
  assert.deepEqual({
    nullEightRegion: run(null, 8, region), nullNullRegion: run(null, null, region), fourFourRegion: run(4, 4, region),
    nullNullNoRegion: run(null, null, cited), nullNullNoReview: run(null, null, null),
    nullTwoRegion: run(null, 2, region), twoNullRegion: run(2, null, region), eightEightNoReview: run(8, 8, null),
  }, { nullEightRegion: true, nullNullRegion: true, fourFourRegion: true, nullNullNoRegion: false, nullNullNoReview: false, nullTwoRegion: false, twoNullRegion: false, eightEightNoReview: true });
});
