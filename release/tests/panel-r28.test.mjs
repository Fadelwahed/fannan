// R28 (panel round 28): real-Chrome regressions for Mi'mar's R28 decision. (A) Within one state identity is the DOM
// node, tagged at 1440 in the same session, never an author id: a reworded or renamed node fails (R28-GPT-01), repeated
// ids in two shadow roots are two nodes (R28-GPT-03), regenerated ids across states do not matter (R28-GPT-05). (B) Another
// state covers a lost item only through the region a visible opener reveals: a panel hidden directly is not rescued by
// another tab state (R28-GPT-02) and an error state hiding Save fails (R28-MIMAR-02). Tabs to headed sections match inside
// each tablist's own sections, a section ending at the next heading of the same or higher rank (R28-GPT-04, R28-MIMAR-01).
// Each test was first run against the 9cc38f1 sources (test-results/r28/R28-*-before.log).
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
  const dir = mkdtempSync(join(tmpdir(), 'fannan-r28-'));
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






const mq = 'matchMedia("(max-width:600px)")';
// R29: a declared state that rescues hidden content names its opener and the region it reveals
const D = (html, opener, reveals) => ({ html, opener, reveals });

test('R28-GPT-01: real Chrome: identity within a state is the node: a heading or button with an id that a script rewords at 320 fails; unchanged it passes (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const page = (id, change) => W(`<h2${id ? ' id="headline"' : ''}>Everything you need to run payroll</h2><button${id ? ' id="save"' : ''}>Save draft</button>`, change ? `const m = ${mq}, h = document.querySelector('h2'), b = document.querySelector('button'); const f = () => { h.textContent = m.matches ? 'Payroll, simply' : 'Everything you need to run payroll'; b.textContent = m.matches ? 'Keep' : 'Save draft'; }; f(); m.addEventListener('change', f);` : '');
  assert.deepEqual({ rewordedWithId: (await gate({ default: page(true, true) })).pass, rewordedNoId: (await gate({ default: page(false, true) })).pass, unchangedWithId: await gate({ default: page(true, false) }) }, { rewordedWithId: false, rewordedNoId: false, unchangedWithId: { pass: true, rules: [] } });
}));

const tabs2 = (sel, hide) => W(`<style>@media (max-width:600px){.gone{display:none}}</style><div role="tablist" aria-label="Reports"><button role="tab" id="t-s" aria-selected="${sel === 'Sales'}">Sales</button><button role="tab" id="t-c" aria-selected="${sel === 'Costs'}">Costs</button></div><div role="tabpanel" aria-labelledby="${sel === 'Sales' ? 't-s' : 't-c'}"><p>${sel} figures.</p><button${hide ? ' class="gone"' : ''}>Download</button></div>`);
test('R28-GPT-02: real Chrome: a tab panel tied by aria-labelledby that hides its Download at 320 fails though another tab state shows a Download; both kept pass (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  assert.deepEqual({ costsHides: (await gate({ default: tabs2('Sales', false), 'tab-costs': tabs2('Costs', true) })).pass, bothKeep: await gate({ default: tabs2('Sales', false), 'tab-costs': tabs2('Costs', false) }) }, { costsHides: false, bothKeep: { pass: true, rules: [] } });
}));

test('R28-GPT-03: real Chrome: two shadow components repeating id="download" are two nodes: one hidden at 320 fails; both kept pass (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const comp = (name, hide) => `<div><template shadowrootmode="open"><style>@media (max-width:600px){.gone{display:none}}</style><p>${name} report.</p><button id="download"${hide ? ' class="gone"' : ''}>Download</button></template></div>`;
  assert.deepEqual({ oneHidden: (await gate({ default: W(comp('Sales', false) + comp('Costs', true)) })).pass, bothKept: await gate({ default: W(comp('Sales', false) + comp('Costs', false)) }) }, { oneHidden: false, bothKept: { pass: true, rules: [] } });
}));

const LS2 = '<style>@media (max-width:600px){.l{display:none}}@media (min-width:601px){.s{display:none}}</style>';
const tabset = (label, tabs, sel) => `<div class="l"><div role="tablist" aria-label="${label}">${tabs.map(t => `<button role="tab" aria-selected="${t === sel}">${t}</button>`).join('')}</div><div role="tabpanel"><p>${sel} text.</p><button>Download</button></div></div>`;
const flat = (heads, keep, extra = '') => `<article class="s">${heads.map(h => `<h2>${h}</h2><p>${h} text.</p>${keep.includes(h) ? '<button>Download</button>' : ''}`).join('')}</article>${extra}`;
test('R28-GPT-04: real Chrome: tabs into one flat article of headed sections: a section missing its Download fails with or without a sticky Download; both kept pass (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const sticky = '<div class="s" style="position:sticky;bottom:0"><button>Download</button></div>';
  const st = (keep, extra) => ({ default: W(LS2 + tabset('Reports', ['Sales', 'Costs'], 'Sales') + flat(['Sales', 'Costs'], keep, extra)), 'tab-costs': W(LS2 + tabset('Reports', ['Sales', 'Costs'], 'Costs') + flat(['Sales', 'Costs'], keep, extra)) });
  assert.deepEqual({ missingSales: (await gate(st(['Costs'], ''))).pass, missingSalesSticky: (await gate(st(['Costs'], sticky))).pass, bothKept: await gate(st(['Sales', 'Costs'], '')) }, { missingSales: false, missingSalesSticky: false, bothKept: { pass: true, rules: [] } });
}));

test('R28-GPT-05: real Chrome: default and menu-open pages with regenerated ids on the same nav links pass; a menu-open that stays closed fails (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const nav = (opened, seed) => W(`<style>@media (max-width:600px){.nav{${opened ? '' : 'display:none'}}}@media (min-width:601px){.menu{display:none}}</style><header><nav aria-label="Main"><button class="menu" aria-expanded="${opened}">Menu</button><ul class="nav">${['About', 'Work'].map((t, i) => `<li><a id="nav-${seed}-${i}" href="/${t.toLowerCase()}">${t}</a></li>`).join('')}</ul></nav></header><p>Body copy.</p>`);
  assert.deepEqual({ regenerated: await gate({ default: nav(false, 'a1'), 'menu-open': D(nav(true, 'z9'), '.menu', '.nav') }), stillClosed: (await gate({ default: nav(false, 'a1'), 'menu-open': D(nav(false, 'z9'), '.menu', '.nav') })).pass }, { regenerated: { pass: true, rules: [] }, stillClosed: false });
}));

test('R28-MIMAR-01: real Chrome: two independent tabsets into headed sections, every panel declared and every Download kept, pass; one Download dropped in either fails (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const page = (a, b, dropA, dropB) => W(LS2 + tabset('Reports', ['Sales', 'Costs'], a) + tabset('Archive', ['Q1', 'Q2'], b) + `<div class="s">${['Sales', 'Costs'].map(h => `<section><h2>${h}</h2><p>${h} text.</p>${h === dropA ? '' : '<button>Download</button>'}</section>`).join('')}${['Q1', 'Q2'].map(h => `<section><h2>${h}</h2><p>${h} text.</p>${h === dropB ? '' : '<button>Download</button>'}</section>`).join('')}</div>`);
  const all = (dA, dB) => ({ default: page('Sales', 'Q1', dA, dB), 'tab-costs': page('Costs', 'Q1', dA, dB), 'tab-q2': page('Sales', 'Q2', dA, dB) });
  // the panel's r27 g02_twoTabsets page: each tabset followed by its own flat headed sections (no section elements)
  const ts = (lab, names, sel, drop) => `<div role="tablist" aria-label="${lab}" class="l">${names.map(n => `<button role="tab" aria-selected="${n === sel}">${n}</button>`).join('')}</div><div role="tabpanel" class="l"><p>${lab} ${sel} text</p><button>Download</button></div><div class="s">${names.map(n => `<h2>${n}</h2><p>${lab} ${n} text</p>${n === drop ? '' : '<button>Download</button>'}`).join('')}</div>`;
  const two = (a, c, drop) => W(LS2 + ts('Reports', ['Sales', 'Costs'], a) + ts('Archive', ['Q1', 'Q2'], c, drop));
  const flat3 = drop => ({ s1: two('Sales', 'Q1', drop), s2: two('Costs', 'Q1', drop), s3: two('Sales', 'Q2', drop) });
  assert.deepEqual({ allKept: await gate(all()), droppedReports: (await gate(all('Costs'))).pass, droppedArchive: (await gate(all(null, 'Q2'))).pass, flatTwoTabsets: await gate(flat3()), flatDroppedQ2: (await gate(flat3('Q2'))).pass }, { allKept: { pass: true, rules: [] }, droppedReports: false, droppedArchive: false, flatTwoTabsets: { pass: true, rules: [] }, flatDroppedQ2: false });
}));

test('R28-MIMAR-02: real Chrome: an error state whose Save is hidden at 320 fails though the default state shows Save; a details/summary menu-open still passes (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const form = err => W(`<style>@media (max-width:600px){.err .save{display:none}}</style><form class="${err ? 'err' : ''}"><label>Name <input></label>${err ? '<p role="alert">Enter a name.</p>' : ''}<button class="save">Save</button></form>`);
  const det = opened => W(`<style>@media (max-width:600px){.dnav{display:none}}@media (min-width:601px){details{display:none}}</style><header><nav class="dnav"><a href="/a">About</a> <a href="/w">Work</a></nav><details${opened ? ' open' : ''}><summary>Menu</summary><a href="/a">About</a> <a href="/w">Work</a></details></header><p>Copy.</p><footer><a href="/a">About</a></footer>`);
  assert.deepEqual({ errorHidesSave: (await gate({ default: form(false), error: form(true) })).pass, detailsMenuOpen: await gate({ default: det(false), 'menu-open': D(det(true), 'details > summary', 'details > a') }), detailsUndeclared: (await gate({ default: det(false) })).pass }, { errorHidesSave: false, detailsMenuOpen: { pass: true, rules: [] }, detailsUndeclared: false });
}));
