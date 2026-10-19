// R29 (panel round 29): real-Chrome regressions for Mi'mar's R29 decision. Reveals are declared, not inferred: a
// state that rescues hidden content declares `opener` and `reveals` selectors, and the gate verifies them (in the losing
// state the region is hidden and every opener visible and operable; in the declared state the opener shows it is open
// and the region is visible). Cover comes only from inside a valid declared region, one to one from one pool per screen
// and width; identical default renderings are accounted once (R29-GPT-01); a section ends at the next heading of the same
// or higher rank or at its sectioning ancestor (R29-GPT-02). Each test was first run against the 564e31b sources
// (test-results/r29/R29-*-before.log).
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
  const dir = mkdtempSync(join(tmpdir(), 'fannan-r29-'));
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
  const probes = decl.filter(([, v]) => v.opener && v.reveals).map(([state, v]) => ({ state, opener: v.opener, reveals: v.reveals, ...(v.carousel ? { carousel: v.carousel } : {}) }));
  const scopes = []; for (const [state, v] of decl) scopes.push({ scope: { screen: 'home', state, lang: dir === 'rtl' ? 'ar' : 'en' }, widths: await ws.screenWidths((await open(v.html)).main, [1440], null, 900, probes), declaration: v.opener && v.reveals ? { opener: v.opener, reveals: v.reveals, ...(v.carousel ? { carousel: v.carousel } : {}) } : null });
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
const D = (html, opener, reveals, carousel) => ({ html, opener, reveals, ...(carousel ? { carousel } : {}) });

const scopesOf = async (open, list, dir = 'ltr') => {
  const probes = list.filter(x => x.opener && x.reveals).map(x => ({ state: x.state, opener: x.opener, reveals: x.reveals, ...(x.carousel ? { carousel: x.carousel } : {}) }));
  const scopes = []; for (const x of list) scopes.push({ scope: { screen: 'home', state: x.state, lang: dir === 'rtl' ? 'ar' : 'en' }, widths: await ws.screenWidths((await open(x.html)).main, [1440], null, 900, probes), declaration: x.opener && x.reveals ? { opener: x.opener, reveals: x.reveals, ...(x.carousel ? { carousel: x.carousel } : {}) } : null });
  const r = ws.resolveReveals(scopes); return { pass: r.pass && scopes.every(s => s.widths.pass), scopes };
};
// R29: the gate verdict plus each declaration's validity and reason at 320 (reported by the gate)
const verdictOf = async (open, list) => { const r = await scopesOf(open, list); const d = r.scopes[0].widths.results.find(x => x.width === 320).declarations || []; return { pass: r.pass, declarations: d.map(x => [x.state, x.valid, x.valid ? '' : x.why.join('; ')]) }; };
const navPage = (opened, { closeLabel = false, footer = true } = {}) => W(`<style>.nav{margin:0;padding:0;list-style:none}@media (max-width:600px){.nav{${opened ? '' : 'display:none'}}}@media (min-width:601px){.menu{display:none}}</style><header><nav aria-label="Main"><button class="menu" aria-expanded="${opened}">${opened && closeLabel ? 'Close' : 'Menu'}</button><ul class="nav"><li><a href="/about">About</a></li><li><a href="/work">Work</a></li></ul></nav></header><p>Body copy.</p>${footer ? '<footer><a href="/about">About</a> <a href="/work">Work</a></footer>' : ''}`);

test('R29-GPT-01: real Chrome: the full checker\'s shape (positional default, declared default, declared menu-open) passes; the default twice alone still fails (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const shape = [{ state: 'default', html: navPage(false) }, { state: 'default', html: navPage(false) }, { state: 'menu-open', html: navPage(true), opener: '.menu', reveals: '.nav' }];
  assert.deepEqual({ checkerShape: (await scopesOf(open, shape)).pass, defaultTwiceAlone: (await scopesOf(open, shape.slice(0, 2))).pass }, { checkerShape: true, defaultTwiceAlone: false });
}));

test('R29-GPT-02: real Chrome: a section ends at its article: an aside Download after the article never counts as the last section\'s (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const LS = '<style>@media (max-width:600px){.l{display:none}}@media (min-width:601px){.s{display:none}}</style>';
  const tabs = sel => `<div class="l"><div role="tablist" aria-label="Reports">${['Sales', 'Costs'].map(t => `<button role="tab" aria-selected="${t === sel}">${t}</button>`).join('')}</div><div role="tabpanel"><p>${sel} text.</p><button>Download</button></div></div>`;
  const page = (sel, keep) => W(LS + tabs(sel) + `<article class="s">${['Sales', 'Costs'].map(h => `<h2>${h}</h2><p>${h} text.</p>${keep.includes(h) ? '<button>Download</button>' : ''}`).join('')}</article><aside class="s"><button>Download</button></aside>`);
  const st = keep => ({ default: page('Sales', keep), 'tab-costs': page('Costs', keep) });
  assert.deepEqual({ missingCostsAside: (await gate(st(['Sales']))).pass, missingSalesAside: (await gate(st(['Costs']))).pass, bothKept: await gate(st(['Sales', 'Costs'])) }, { missingCostsAside: false, missingSalesAside: false, bothKept: { pass: true, rules: [] } });
}));

test('R29-GPT-03: real Chrome: an error state hiding Save at 320 fails even when the form has an aria-expanded Help toggle (no declaration, no cover) (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const form = err => W(`<style>@media (max-width:600px){.err .save{display:none}}</style><form class="${err ? 'err' : ''}"><label>Name <input></label><button type="button" aria-expanded="false">Help</button><p hidden>Use your full name.</p>${err ? '<p role="alert">Enter a name.</p>' : ''}<button class="save">Save</button></form>`);
  assert.equal((await gate({ default: form(false), error: form(true) })).pass, false);
}));

test('R29-GPT-04: real Chrome: a still-visible Remove covers nothing: a declared region already visible in the losing state is invalid (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const list = (opened) => W(`<style>@media (max-width:600px){.second{display:none}}</style><button class="more" aria-expanded="${opened}">More</button><ul class="items"><li>Cart item one <button>Remove</button></li><li class="second">Cart item two <button>Remove</button></li></ul>`);
  assert.equal((await gate({ default: list(false), 'all-open': D(list(true), '.more', '.items') })).pass, false);
  assert.deepEqual(await verdictOf(open, [{ state: 'default', html: list(false) }, { state: 'all-open', html: list(true), opener: '.more', reveals: '.items' }]),
    { pass: false, declarations: [['all-open', false, 'region already visible in the losing state']] });
}));

test('R29-GPT-05: real Chrome: nested regions never count twice: one Remove in the open state covers one lost Remove, not two (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const page = opened => W(`<style>@media (max-width:600px){.desk{display:none}}@media (min-width:601px){.mob{display:none}}</style><div class="desk"><p>Item A <button>Remove</button></p><p>Item B <button>Remove</button></p></div><div class="mob"><button class="opener" aria-expanded="${opened}">Items</button><div class="outer"${opened ? '' : ' hidden'}><p>Item A</p><details${opened ? ' open' : ''}><summary>Item B</summary><p>Item B <button>Remove</button></p></details></div></div>`);
  assert.equal((await gate({ default: page(false), 'all-open': D(page(true), '.opener', '.outer') })).pass, false);
  assert.deepEqual(await verdictOf(open, [{ state: 'default', html: page(false) }, { state: 'all-open', html: page(true), opener: '.opener', reveals: '.outer' }]),
    { pass: false, declarations: [['all-open', true, '']] }, 'the declaration is valid; the second Remove stays lost (one to one)');
}));

test('R29-GPT-06: real Chrome: opener names are never compared: Menu becoming Close in the open state passes; two menus both named Menu each pass with their own declaration (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const two = (a, b) => W(`<style>@media (max-width:600px){.d{display:none}.m1 ul{${a ? '' : 'display:none'}}.m2 ul{${b ? '' : 'display:none'}}}@media (min-width:601px){.m1,.m2{display:none}}</style><nav class="d" aria-label="Main"><a href="/about">About</a></nav><nav class="m1" aria-label="Main mobile"><button aria-expanded="${a}">Menu</button><ul><li><a href="/about">About</a></li></ul></nav><p>Copy.</p><nav class="d" aria-label="Help"><a href="/faq">FAQ</a></nav><nav class="m2" aria-label="Help mobile"><button aria-expanded="${b}">Menu</button><ul><li><a href="/faq">FAQ</a></li></ul></nav>`);
  assert.deepEqual({
    menuToClose: await gate({ default: navPage(false), 'menu-open': D(navPage(true, { closeLabel: true }), '.menu', '.nav') }),
    twoMenus: await gate({ default: two(false, false), 'main-open': D(two(true, false), '.m1 button', '.m1 ul'), 'help-open': D(two(false, true), '.m2 button', '.m2 ul') }),
  }, { menuToClose: { pass: true, rules: [] }, twoMenus: { pass: true, rules: [] } });
}));

test('R29-GPT-07: real Chrome: a popovertarget menu passes with its declaration; an aria-haspopup menu whose declared popup is shown passes without aria-expanded (R30-M-02) (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const pop = opened => W(`<style>@media (max-width:600px){.d{display:none}}@media (min-width:601px){.m,#pm{display:none}}</style><nav class="d" aria-label="Main"><a href="/about">About</a> <a href="/work">Work</a></nav><button class="m" popovertarget="pm">Menu</button><div id="pm" popover><a href="/about">About</a> <a href="/work">Work</a></div>`, opened ? 'document.getElementById("pm").showPopover();' : '');
  const hp = opened => W(`<style>@media (max-width:600px){.d{display:none}.mm{${opened ? '' : 'display:none'}}}@media (min-width:601px){.m,.mm{display:none}}</style><nav class="d" aria-label="Main"><a href="/about">About</a></nav><button class="m" aria-haspopup="true">Menu</button><div class="mm"><a href="/about">About</a></div>`);
  assert.deepEqual({ popover: await gate({ default: pop(false), 'menu-open': D(pop(true), '.m', '#pm') }), haspopupShown: await gate({ default: hp(false), 'menu-open': D(hp(true), '.m', '.mm') }) }, { popover: { pass: true, rules: [] }, haspopupShown: { pass: true, rules: [] } });
}));

const carousel = (cls, i) => `<div class="${cls}"><div id="root-${cls}" style="overflow:hidden;width:300px"><div style="display:flex;width:900px;transform:translateX(-${i * 300}px)">${[1, 2, 3].map(k => `<div class="slide" id="${cls}-s${k}" style="flex:0 0 300px"><p>${cls} slide ${k}</p><a href="/s${k}">Shop now</a></div>`).join('')}</div></div><div class="dots">${[1, 2, 3].map(k => `<button aria-current="${k === i + 1}">${k}</button>`).join('')}</div></div>`;
const CM = cls => ({ root: `#root-${cls}`, slides: [`#${cls}-s1`, `#${cls}-s2`, `#${cls}-s3`] });
const slideState = (cls, i, html) => D(html, `.${cls} .dots button:nth-child(${i + 1})`, `#${cls}-s${i + 1}`, CM(cls));
test('R29-GPT-08: real Chrome: unlabelled carousels with declared slide controls pass beside an image crop, and two unlabelled carousels each pass; an undeclared slide still fails (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const crop = `<div style="overflow:hidden;width:200px;height:80px"><img src="photo.png" alt="" style="display:block;width:400px;height:160px"></div>`;
  const one = i => W(carousel('a', i) + crop), two = (i, j) => W(carousel('a', i) + carousel('b', j));
  assert.deepEqual({
    withCrop: await gate({ default: one(0), 'slide-1': slideState('a', 0, one(0)), 'slide-2': slideState('a', 1, one(1)), 'slide-3': slideState('a', 2, one(2)) }),
    twoCarousels: await gate({ default: two(0, 0), 'a-1': slideState('a', 0, two(0, 0)), 'a-2': slideState('a', 1, two(1, 0)), 'a-3': slideState('a', 2, two(2, 0)), 'b-1': slideState('b', 0, two(0, 0)), 'b-2': slideState('b', 1, two(0, 1)), 'b-3': slideState('b', 2, two(0, 2)) }),
    undeclaredSlide: (await gate({ default: one(0), 'slide-2': slideState('a', 1, one(1)) })).pass,
  }, { withCrop: { pass: true, rules: [] }, twoCarousels: { pass: true, rules: [] }, undeclaredSlide: false });
}));

test('R29-MIMAR-01: real Chrome: a sloppy menu-open that never opens fails even when it declares the menu and the page has footer copies (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  assert.equal((await gate({ default: navPage(false), 'menu-open': D(navPage(false), '.menu', '.nav') })).pass, false);
  const v = await verdictOf(open, [{ state: 'default', html: navPage(false) }, { state: 'menu-open', html: navPage(false), opener: '.menu', reveals: '.nav' }]);
  assert.deepEqual([v.pass, v.declarations.map(d => d[1])], [false, [false]]);
  assert.match(v.declarations[0][2], /region not visible in the declared state|does not show it is open/);
}));

test('R29 invalid declarations: a wrong opener, a region not actually opened and a region visible in the losing state rescue nothing, with the reason reported (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const notOpened = W(`<style>@media (max-width:600px){.nav{display:none}}@media (min-width:601px){.menu{display:none}}</style><nav aria-label="Main"><button class="menu" aria-expanded="true">Menu</button><ul class="nav"><li><a href="/about">About</a></li><li><a href="/work">Work</a></li></ul></nav><p>Body copy.</p><footer><a href="/about">About</a> <a href="/work">Work</a></footer>`);
  const cases = {
    wrongOpener: { state: 'menu-open', html: navPage(true), opener: 'footer a', reveals: '.nav' },
    notOpened: { state: 'menu-open', html: notOpened, opener: '.menu', reveals: '.nav' },
    visibleInLosing: { state: 'menu-open', html: navPage(true), opener: '.menu', reveals: 'footer' },
  };
  const out = {};
  for (const [k, decl] of Object.entries(cases)) { const r = await scopesOf(open, [{ state: 'default', html: navPage(false) }, decl]); const d = r.scopes[0].widths.results.find(x => x.width === 320).declarations[0]; out[k] = [r.pass, d.valid, d.why.length > 0]; }
  assert.deepEqual(out, { wrongOpener: [false, false, true], notOpened: [false, false, true], visibleInLosing: [false, false, true] });
  const valid = await scopesOf(open, [{ state: 'default', html: navPage(false) }, { state: 'menu-open', html: navPage(true), opener: '.menu', reveals: '.nav' }]);
  assert.deepEqual([valid.pass, valid.scopes[0].widths.results.find(x => x.width === 320).declarations[0].valid], [true, true]);
}));
