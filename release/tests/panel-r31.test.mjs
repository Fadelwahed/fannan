// R31 (panel round 31): real-Chrome regressions for Sol's accepted fix specs R31-M-01..M-13
// (M-06 REJECTED by Mi'mar override; M-14..M-19 rejected). Standing rejections: R27 (a), R30-M-10, R30-M-21.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const release = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const deps = process.env.FANNAN_DEPS || resolve(release, '..', 'runtime-deps');
const chrome = process.env.FANNAN_TEST_CHROME || '/usr/bin/google-chrome';
const haveChrome = existsSync(join(deps, 'node_modules/playwright-core')) && existsSync(chrome);
const skip = !haveChrome && 'test-only deps or local Chrome absent';

const withBrowser = async fn => {
  const { chromium } = createRequire(join(deps, 'node_modules/'))('playwright-core');
  const dir = mkdtempSync(join(tmpdir(), 'fannan-r31-'));
  const browser = await chromium.launch({ executablePath: chrome, args: ['--headless=new'] });
  const open = async (html, javaScriptEnabled = true) => {
    const file = join(dir, `p${Math.random().toString(36).slice(2)}.html`); writeFileSync(file, html);
    const ctx = await browser.newContext({ javaScriptEnabled, viewport: { width: 1440, height: 900 } });
    const main = await ctx.newPage(); await main.goto(pathToFileURL(file).href); await main.waitForLoadState('load'); await main.waitForTimeout(100);
    return { main };
  };
  try { await fn({ open }); } finally { await browser.close(); rmSync(dir, { recursive: true, force: true }); }
};

const W = (body, script = '', dir = 'ltr') => `<!doctype html><html lang="${dir === 'rtl' ? 'ar' : 'en'}" dir="${dir}"><head></head><body style="background:#fff;margin:0;font:16px/1.5 sans-serif;color:#1a1a1a"><main style="padding:20px"><h1>${dir === 'rtl' ? 'عنوان' : 'Title'}</h1>${body}</main>${script ? `<script>${script}</script>` : ''}</body></html>`;
const ws = await import('../tools/width-screen.mjs');
const D = (html, opener, reveals) => ({ html, opener, reveals });
const scopesOf = async (open, list, dir = 'ltr', desktop = [1440]) => {
  const probes = list.filter(x => x.opener && x.reveals).map(x => ({ state: x.state, opener: x.opener, reveals: x.reveals }));
  const scopes = [];
  for (const x of list) {
    scopes.push({
      scope: { screen: 'home', state: x.state, lang: dir === 'rtl' ? 'ar' : 'en' },
      widths: await ws.screenWidths((await open(x.html)).main, desktop, null, 900, probes),
      declaration: x.opener && x.reveals ? { opener: x.opener, reveals: x.reveals } : null,
    });
  }
  const r = ws.resolveReveals(scopes);
  return { pass: r.pass && scopes.every(s => s.widths.pass), scopes, r };
};
const gateOf = (open, desktop = [1440]) => async (states, dir = 'ltr') => {
  const decl = Object.entries(states).map(([state, v]) => [state, typeof v === 'string' ? { html: v } : v]);
  const list = decl.map(([state, v]) => ({ state, html: v.html, opener: v.opener, reveals: v.reveals }));
  return scopesOf(open, list, dir, desktop);
};
const P = (body, css = '', dir = 'ltr') => W(`${css ? `<style>${css}</style>` : ''}${body}`, '', dir);
const flat = s => s.replace(/\s+/g, ' ');

test('R31-M-01: declared menu covers each screened width independently', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open, [1440, 1280]);
  const css = `@media(max-width:1300px){.wide{display:none}}@media(min-width:1301px){.mobile{display:none}}`;
  const page = (openState) => P(`<a class="wide" href="/about">About</a><button id="m" class="mobile" aria-controls="p" aria-expanded="${openState}">Menu</button><nav id="p" class="mobile"${openState === 'true' ? '' : ' hidden'}><a href="/about">About</a></nav>`, css);
  assert.equal((await gate({ default: page('false'), 'menu-open': D(page('true'), '#m', '#p') })).pass, true);
}));

test('R31-M-02: declared read-more permits an already visible introduction', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const clamp = `#bio{width:160px;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;line-height:24px}#bio p{margin:0}`;
  const long = 'These cancellation terms explain the notice period and all the steps required before ending the subscription.';
  const def = P(`<div id="bio"><p>Intro.</p><p>${long}</p></div><button id="m" aria-controls="bio" aria-expanded="false">Read more</button>`, clamp);
  const exp = P(`<div id="bio"><p>Intro.</p><p>${long}</p></div><button id="m" aria-controls="bio" aria-expanded="true">Read more</button>`);
  const missing = P(`<div id="bio"><p>Intro.</p></div><button id="m" aria-controls="bio" aria-expanded="true">Read more</button>`);
  assert.equal((await gate({ default: def, expanded: D(exp, '#m', '#bio') })).pass, true);
  assert.equal((await gate({ default: def, expanded: D(missing, '#m', '#bio') })).pass, false);
  assert.equal((await gate({ default: def, expanded: exp })).pass, false);
}));

test('R31-M-03: descriptive and Arabic carousel steps verify actual slide transitions', { skip }, async () => withBrowser(async ({ open }) => {
  const car = (tx, label, dir = 'ltr') => P(
    `<div class="viewport" style="width:200px;overflow:hidden;direction:ltr"><div class="track" style="display:flex;width:400px;transform:translateX(${tx}px);direction:ltr"><div class="slide" style="flex:0 0 200px"><p>Slide one unique</p></div><div class="slide" style="flex:0 0 200px"><p>Slide two unique</p></div></div></div><button class="next" aria-label="${label}">›</button>`,
    '', dir);
  const run = async (label, dir) => {
    const g = await scopesOf(open, [
      { state: 'default', html: car(0, label, dir) },
      { state: 'slide-2', html: car(-200, label, dir), opener: '.next', reveals: '.slide:nth-child(2)' },
    ], dir);
    return g.pass;
  };
  assert.equal(await run('Next slide', 'ltr'), true);
  assert.equal(await run('التالي', 'rtl'), true);
  const stuck = await scopesOf(open, [
    { state: 'default', html: car(0, 'Next slide') },
    { state: 'slide-2', html: car(0, 'Next slide'), opener: '.next', reveals: '.slide:nth-child(2)' },
  ]);
  assert.equal(stuck.pass, false);
}));

test('R31-M-04: unresolved opener target IDs invalidate reveal declarations', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const css = `@media(max-width:600px){.wide{display:none}}@media(min-width:601px){.mobile{display:none}}`;
  const page = (openState, controls) => P(
    `<a class="wide" href="/about">About</a><button id="m" class="mobile"${controls ? ` aria-controls="${controls}"` : ''} aria-expanded="${openState}">Menu</button><nav id="p" class="mobile"${openState === 'true' ? '' : ' hidden'}><a href="/about">About</a></nav>`, css);
  const why = async (controls) => {
    const g = await gate({ default: page('false', controls), 'menu-open': D(page('true', controls), '#m', '#p') });
    const decls = g.scopes.flatMap(s => (s.widths.results || []).flatMap(r => r.declarations || []));
    return { pass: g.pass, decls };
  };
  assert.equal((await why('missing-panel')).pass, false);
  assert.equal((await why('p missing-panel')).pass, false);
  assert.equal((await why('p')).pass, true);
  assert.equal((await why('')).pass, true);
  const miss = await why('missing-panel');
  assert.ok(miss.decls.some(d => (d.why || []).some(w => /unresolved|contradicts/i.test(w))), 'unresolved-target diagnostic');
}));

test('R31-M-05: a policy link does not exempt an undeclared collapsed FAQ', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const faq = h => P(`<div id="answer" style="width:240px;height:${h};overflow:hidden"><p>Shipping answer.</p><a href="/policy">Delivery policy</a></div>`);
  assert.equal((await gate({ default: faq('0'), expanded: faq('auto') })).pass, false);
  const disc = opened => P(`<button id="m" aria-expanded="${opened}">More</button><div id="answer" style="width:240px;height:${opened ? 'auto' : '0'};overflow:hidden"><p>Shipping answer.</p><a href="/policy">Delivery policy</a></div>`);
  assert.equal((await gate({ default: disc(false), expanded: D(disc(true), '#m', '#answer') })).pass, true);
  // horizontal carousel undeclared fallback retained
  const slide = i => P(`<div style="width:200px;overflow:hidden"><div style="display:flex;width:400px;transform:translateX(-${i * 200}px)"><div style="flex:0 0 200px"><p>One</p></div><div style="flex:0 0 200px"><p>Two</p></div></div></div>`);
  assert.equal((await gate({ default: slide(0), 'slide-2': slide(1) })).pass, true);
}));

test('R31-M-07: a disabled fieldset permits its enabled first-legend opener', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const css = '@media(max-width:600px){#p{display:none}}';
  const legend = opened => P(`<fieldset disabled><legend><button id="m" aria-controls="p" aria-expanded="${opened}">Menu</button></legend></fieldset><nav id="p"><a href="/about">About</a></nav>`, opened === 'true' ? '' : css);
  const outside = opened => P(`<fieldset disabled><legend>Group</legend><button id="m" aria-controls="p" aria-expanded="${opened}">Menu</button></fieldset><nav id="p"><a href="/about">About</a></nav>`, opened === 'true' ? '' : css);
  const { main } = await open(legend('false'));
  const native = await main.evaluate(() => document.getElementById('m').matches(':disabled'));
  assert.equal(native, false);
  assert.equal((await gate({ default: legend('false'), 'menu-open': D(legend('true'), '#m', '#p') })).pass, true);
  assert.equal((await gate({ default: outside('false'), 'menu-open': D(outside('true'), '#m', '#p') })).pass, false);
}));

test('R31-M-08: an open-shadow modal excludes inactive background menu losses', { skip }, async () => withBrowser(async ({ open }) => {
  const css = `@media(max-width:600px){.wide{display:none}}@media(min-width:601px){.mobile{display:none}}`;
  const shell = (menuOpen) => `<a class="wide" href="/about">About</a><button id="m" class="mobile" aria-controls="p" aria-expanded="${menuOpen}">Menu</button><nav id="p" class="mobile"${menuOpen === 'true' ? '' : ' hidden'}><a href="/about">About</a></nav><button id="cart-btn">Cart</button>`;
  const def = P(shell('false'), css);
  const menu = P(shell('true'), css);
  const cartScript = (hide) => `const host=document.createElement('div');document.body.appendChild(host);const root=host.attachShadow({mode:'open'});root.innerHTML='${hide ? "<style>@media(max-width:600px){.checkout{display:none}}</style>" : ""}<dialog id="dlg"><h2>Cart</h2><button class="checkout">Checkout</button></dialog>';root.getElementById('dlg').showModal();`;
  const cartOk = W(`<style>${css}</style>${shell('false')}`, cartScript(false));
  const cartBad = W(`<style>${css}</style>${shell('false')}`, cartScript(true));
  assert.equal((await scopesOf(open, [
    { state: 'default', html: def },
    { state: 'menu-open', html: menu, opener: '#m', reveals: '#p' },
    { state: 'cart-open', html: cartOk },
  ])).pass, true);
  assert.equal((await scopesOf(open, [
    { state: 'default', html: def },
    { state: 'menu-open', html: menu, opener: '#m', reveals: '#p' },
    { state: 'cart-open', html: cartBad },
  ])).pass, false);
}));

test('R31-M-09: stacked dialogs screen the topmost modal rather than document order', { skip }, async () => withBrowser(async ({ open }) => {
  const base = '<p>Stable body copy for the screen.</p><button id="open">Open</button>';
  const stacked = (order, keep) => {
    const a = `<dialog id="lower"><h2>Lower</h2><p>Lower body</p></dialog>`;
    const b = `<dialog id="confirm"><h2>Confirm</h2><button class="primary">Confirm purchase</button>${keep ? '' : '<style>@media(max-width:600px){.primary{display:none}}</style>'}</dialog>`;
    const body = order === 'confirm-last' ? base + a + b : base + b + a;
    const script = `document.getElementById('lower').showModal();document.getElementById('confirm').showModal();`;
    return W(body, script);
  };
  assert.equal((await scopesOf(open, [
    { state: 'default', html: W(base) },
    { state: 'confirm-open', html: stacked('confirm-last', false) },
  ])).pass, false);
  assert.equal((await scopesOf(open, [
    { state: 'default', html: W(base) },
    { state: 'confirm-open', html: stacked('confirm-first', false) },
  ])).pass, false);
  assert.equal((await scopesOf(open, [
    { state: 'default', html: W(base) },
    { state: 'confirm-open', html: stacked('confirm-last', true) },
  ])).pass, true);
}));

test('R31-M-10: an expanded paragraph cannot cover both a clamp and a distinct loss', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const T = 'A carefully written account of the project and the people who made it.';
  const clamp = `#bio{width:160px;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:1;overflow:hidden;line-height:24px}`;
  const narrow = '@media(max-width:600px){.wide{display:none}}';
  const withWide = (expanded) => P(`<p id="bio">${T}</p><button id="m" aria-controls="bio" aria-expanded="${expanded}">Read more</button><p class="wide">${T}</p>`, expanded === 'true' ? narrow : `${clamp}${narrow}`);
  const solo = (expanded) => P(`<p id="bio">${T}</p><button id="m" aria-controls="bio" aria-expanded="${expanded}">Read more</button>`, expanded === 'true' ? '' : clamp);
  assert.equal((await gate({ default: withWide('false'), expanded: D(withWide('true'), '#m', '#bio') })).pass, false);
  assert.equal((await gate({ default: solo('false'), expanded: D(solo('true'), '#m', '#bio') })).pass, true);
}));

test('R31-M-11: current reveal guidance matches supported popup behavior and allocation scope', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const css = `@media(max-width:600px){.wide{display:none}}@media(min-width:601px){.mobile{display:none}}`;
  const page = (opened) => P(`<a class="wide" href="/about">About</a><button id="m" class="mobile" aria-haspopup="true" aria-controls="p">Menu</button><nav id="p" class="mobile" style="${opened ? '' : 'display:none'}"><a href="/about">About</a></nav>`, css);
  assert.equal((await gate({ default: page(false), 'menu-open': D(page(true), '#m', '#p') })).pass, true);
  const quality = flat(readFileSync(join(release, 'references/design-quality.md'), 'utf8'));
  const contract = flat(readFileSync(join(release, 'references/handoff-contract.md'), 'utf8'));
  const untested = flat(readFileSync(join(release, 'UNTESTED.md'), 'utf8'));
  for (const m of ['dialog[open]', 'checked', 'aria-haspopup', 'carousel', 'losing state', 'evaluation width']) {
    assert.ok(quality.includes(m) || contract.includes(m), `guidance mentions ${m}`);
  }
  assert.ok(/SUPERSEDED.*haspopup/i.test(untested), 'UNTESTED supersedes old haspopup claim');
  assert.ok(!/aria-haspopup with no open state is invalid by design(?!.*SUPERSEDED)/.test(untested) || /SUPERSEDED \(R31-M-11\/M-12\)/.test(untested), 'old haspopup claim marked superseded');
  assert.ok(/carousel/i.test(quality) && /No declaration means no cross-state cover/i.test(quality));
}));

test('R31-M-12: false haspopup does not certify a generic reveal opener', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const css = `@media(max-width:600px){.wide{display:none}}@media(min-width:601px){.mobile{display:none}}`;
  const page = (opened, popup) => P(
    `<a class="wide" href="/about">About</a><button id="m" class="mobile" aria-haspopup="${popup}" aria-controls="p">Details</button><nav id="p" class="mobile" style="${opened ? '' : 'display:none'}"><a href="/about">About</a></nav>`, css);
  assert.equal((await gate({ default: page(false, 'false'), 'menu-open': D(page(true, 'false'), '#m', '#p') })).pass, false);
  assert.equal((await gate({ default: page(false, ''), 'menu-open': D(page(true, ''), '#m', '#p') })).pass, false);
  assert.equal((await gate({ default: page(false, 'bogus'), 'menu-open': D(page(true, 'bogus'), '#m', '#p') })).pass, false);
  assert.equal((await gate({ default: page(false, 'menu'), 'menu-open': D(page(true, 'menu'), '#m', '#p') })).pass, true);
  // Mi'mar addition: aria-expanded stuck at false with valid haspopup must FAIL
  const stuck = (opened) => P(
    `<a class="wide" href="/about">About</a><button id="m" class="mobile" aria-haspopup="true" aria-controls="p" aria-expanded="false">Menu</button><nav id="p" class="mobile" style="${opened ? '' : 'display:none'}"><a href="/about">About</a></nav>`, css);
  assert.equal((await gate({ default: stuck(false), 'menu-open': D(stuck(true), '#m', '#p') })).pass, false);
  // M-03 companion: real Next transition with aria-haspopup="false" still PASS
  const car = (tx) => P(`<div style="width:200px;overflow:hidden"><div style="display:flex;width:400px;transform:translateX(${tx}px)"><div class="slide" style="flex:0 0 200px"><p>A unique</p></div><div class="slide" style="flex:0 0 200px"><p>B unique</p></div></div></div><button class="next" aria-haspopup="false" aria-label="Next slide">›</button>`);
  assert.equal((await scopesOf(open, [
    { state: 'default', html: car(0) },
    { state: 'slide-2', html: car(-200), opener: '.next', reveals: '.slide:nth-child(2)' },
  ])).pass, true);
}));

test('R31-M-13: disabled disclosure failures report disabled rather than an overlay', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const css = `@media(max-width:600px){.wide{display:none}}@media(min-width:601px){.mobile{display:none}}`;
  const page = (opened, extra = '') => P(
    `<a class="wide" href="/about">About</a><button id="m" class="mobile" ${extra} aria-controls="p" aria-expanded="${opened}">Menu</button><nav id="p" class="mobile"${opened === 'true' ? '' : ' hidden'}><a href="/about">About</a></nav>`, css);
  const g = await gate({ default: page('false', 'disabled'), 'menu-open': D(page('true', 'disabled'), '#m', '#p') });
  assert.equal(g.pass, false);
  const whys = g.scopes.flatMap(s => (s.widths.results || []).flatMap(r => (r.declarations || []).flatMap(d => d.why || [])));
  assert.ok(whys.some(w => /disabled|inert/i.test(w)), `expected disabled reason, got ${JSON.stringify(whys)}`);
  assert.ok(!whys.some(w => /on top of it/i.test(w)), 'must not allege overlay for disabled');
  const covered = (opened) => P(
    `<a class="wide" href="/about">About</a><div id="cover" style="position:fixed;inset:0;z-index:9"></div><button id="m" class="mobile" style="position:relative;z-index:1" aria-controls="p" aria-expanded="${opened}">Menu</button><nav id="p" class="mobile"${opened === 'true' ? '' : ' hidden'}><a href="/about">About</a></nav>`, css);
  const ov = await gate({ default: covered('false'), 'menu-open': D(covered('true'), '#m', '#p') });
  assert.equal(ov.pass, false);
  const oWhys = ov.scopes.flatMap(s => (s.widths.results || []).flatMap(r => (r.declarations || []).flatMap(d => d.why || [])));
  assert.ok(oWhys.some(w => /on top of it/i.test(w)), `expected obstruction, got ${JSON.stringify(oWhys)}`);
}));
