// R26 (panel round 26): real-Chrome regressions for Fadel's root-cause fix: loss accounting by element identity, one ledger
// per screen. An item lost at a narrow width is covered by the same element in any state, or only through the closed swap
// list by a distinct non-ledger element with the same name, each cover used once across the screen. A collapsed box is
// display:none; footer copies never cover nav items, so a declared menu-open that does not open fails (R26-GPT-01). A
// tab panel's own heading is never subtracted (R26-GPT-02). Tabs to headed sections needs every panel declared and the
// panels' total count of each action (R26-GPT-03). Carousel slides are identified by element, so repeated names never
// collide (R26-GPT-04). Motion is settled before each width is measured; infinite animations are left alone
// (R26-MIMAR-01). Each test was first run against the 49169df sources (test-results/r26/R26-*-before.log).
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
  const dir = mkdtempSync(join(tmpdir(), 'fannan-r26-'));
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
  const scopes = []; for (const [state, html] of Object.entries(states)) scopes.push({ scope: { screen: 'home', state, lang: dir === 'rtl' ? 'ar' : 'en' }, widths: await ws.screenWidths((await open(html)).main, [1440], null) });
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




const ws26 = await import('../tools/width-screen.mjs');

test('R26-GPT-01: real Chrome: footer copies never cover nav items: a declared menu-open that does not open fails (max-height:0 or display:none, with or without footer copies); a menu-open that opens passes (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const nav = (how, opened, footer) => W(`<style>.nav{margin:0;padding:0;list-style:none}@media (max-width:600px){.nav{${opened ? '' : how}}}@media (min-width:601px){.menu{display:none}}</style><header><nav aria-label="Main"><button class="menu" aria-expanded="${opened}">Menu</button><ul class="nav"><li><a href="/about">About</a></li><li><a href="/team">Team</a></li></ul></nav></header><p>Body copy.</p>${footer ? '<footer><a href="/about">About</a> <a href="/team">Team</a></footer>' : ''}`);
  const mh = 'max-height:0;overflow:hidden', dn = 'display:none';
  const r = {};
  for (const [n, how] of [['maxHeight', mh], ['displayNone', dn]]) for (const footer of [true, false]) {
    r[`${n}${footer ? 'Footer' : ''}Sloppy`] = (await gate({ default: nav(how, false, footer), 'menu-open': nav(how, false, footer) })).pass;
    r[`${n}${footer ? 'Footer' : ''}Real`] = (await gate({ default: nav(how, false, footer), 'menu-open': nav(how, true, footer) })).pass;
  }
  assert.deepEqual(r, { maxHeightFooterSloppy: false, maxHeightFooterReal: true, maxHeightSloppy: false, maxHeightReal: true, displayNoneFooterSloppy: false, displayNoneFooterReal: true, displayNoneSloppy: false, displayNoneReal: true });
}));

// tabs at 1440 (one tabpanel per state, the selected tab's), stacked headed sections at 320
const tabsPage = (sel, { tabs = ['Overview', 'Pricing'], panelHeading = false, actions = {}, sections = null } = {}) => P(`<div class="l"><div role="tablist" aria-label="Plan details">${tabs.map(t => `<button role="tab" aria-selected="${t === sel}">${t}</button>`).join('')}</div><div role="tabpanel">${panelHeading ? `<h3>${sel}</h3>` : ''}<p>${sel} text.</p>${(actions[sel] || []).map(a => `<button>${a}</button>`).join('')}</div></div><div class="s">${(sections || tabs.map(t => ({ h: t, t, a: actions[t] || [] }))).map(x => `<section>${x.h ? `<h2>${x.h}</h2>` : ''}<p>${x.t} text.</p>${(x.a || []).map(a => `<button>${a}</button>`).join('')}</section>`).join('')}</div>`);

test('R26-GPT-02: real Chrome: tabs to headed sections with the selected panel keeping its own heading pass (the panel heading is never subtracted); a missing heading or a duplicated, renamed one fails (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const both = o => gate({ default: tabsPage('Overview', o), 'tab-pricing': tabsPage('Pricing', o) });
  assert.deepEqual({
    panelHeadingKept: await both({ panelHeading: true }),
    noPanelHeading: await both({}),
    missingHeading: (await both({ panelHeading: true, sections: [{ h: 'Overview', t: 'Overview' }, { h: '', t: 'Pricing' }] })).pass,
    duplicatedRenamed: (await both({ panelHeading: true, sections: [{ h: 'Overview', t: 'Overview' }, { h: 'Overview', t: 'Pricing' }] })).pass,
  }, { panelHeadingKept: { pass: true, rules: [] }, noPanelHeading: { pass: true, rules: [] }, missingHeading: false, duplicatedRenamed: false });
}));

test('R26-GPT-03: real Chrome: tabs to headed sections counts each action across the declared tab panels: two report tabs with a Download each pass with both Downloads at 320 and fail with one dropped; a tab panel with no declared state stops the swap (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const o = (drop = false) => ({ tabs: ['Sales', 'Costs'], actions: { Sales: ['Download'], Costs: ['Download'] }, sections: [{ h: 'Sales', t: 'Sales', a: ['Download'] }, { h: 'Costs', t: 'Costs', a: drop ? [] : ['Download'] }] });
  assert.deepEqual({
    bothKept: await gate({ default: tabsPage('Sales', o()), 'tab-costs': tabsPage('Costs', o()) }),
    oneDropped: (await gate({ default: tabsPage('Sales', o(true)), 'tab-costs': tabsPage('Costs', o(true)) })).pass,
    tabStateMissing: (await gate({ default: tabsPage('Sales', o()) })).pass,
  }, { bothKept: { pass: true, rules: [] }, oneDropped: false, tabStateMissing: false });
}));

test('R26-GPT-04: real Chrome: carousel slides are identified by element: a fluid carousel whose slides all say Shop now passes with every slide declared; a missing slide state fails (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const car = (i, cta = k => 'Shop now') => W(`<div style="overflow:hidden;width:100%;max-width:600px"><div style="display:flex;width:300%;transform:translateX(-${i * 100 / 3}%)">${[0, 1, 2].map(k => `<div style="flex:0 0 33.3333%"><p>Slide ${k + 1}</p><button>${cta(k)}</button></div>`).join('')}</div></div>`);
  assert.deepEqual({
    repeatedAllDeclared: await gate({ default: car(0), 'slide-2': car(1), 'slide-3': car(2) }),
    distinctAllDeclared: await gate({ default: car(0, k => `Shop ${k}`), 'slide-2': car(1, k => `Shop ${k}`), 'slide-3': car(2, k => `Shop ${k}`) }),
    repeatedMissingSlide: (await gate({ default: car(0), 'slide-2': car(1) })).pass,
  }, { repeatedAllDeclared: { pass: true, rules: [] }, distinctAllDeclared: { pass: true, rules: [] }, repeatedMissingSlide: false });
}));

test('R26-MIMAR-01 (P3): real Chrome: motion is settled before each width is measured: a slide caught mid-transition is finished, not graded partly clipped, and motion at capture is recorded; an infinite animation is left running (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const html = W('<style>@keyframes spin{to{transform:rotate(360deg)}}</style><div id="sp" style="width:20px;height:20px;background:#555;animation:spin 2s linear infinite"></div><div style="overflow:hidden;width:300px"><div id="t" style="display:flex;width:900px;transition:transform 20s linear"><div style="flex:0 0 300px"><p>Slide one</p></div><div style="flex:0 0 300px"><p>Slide two</p></div><div style="flex:0 0 300px"><p>Slide three</p></div></div></div>', 'requestAnimationFrame(() => requestAnimationFrame(() => { document.getElementById("t").style.transform = "translateX(-300px)"; }));');
  const { main } = await open(html); await main.waitForTimeout(300);
  const w = await ws26.screenWidths(main, [1440], null);
  const r1440 = w.results.find(r => r.width === 1440);
  const infinite = await main.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length);
  assert.deepEqual({ motion: (r1440.motionAtCapture || []).map(m => m.kind), partly: w.results.flatMap(r => r.clipped.map(c => c.rule)).filter(x => x === 'partly clipped').length, infiniteRunning: infinite >= 1 }, { motion: ['transition'], partly: 0, infiniteRunning: true });
}));
