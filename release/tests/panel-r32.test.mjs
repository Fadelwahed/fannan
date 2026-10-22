// R32 (panel round 32): real-Chrome regressions for Sol's accepted fix specs R32-M-01..M-11
// (M-12..M-17 rejected). Standing rejections unchanged.
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
const T = 'These cancellation terms explain the notice period and every step required before ending a subscription.';

const withBrowser = async fn => {
  const { chromium } = createRequire(join(deps, 'node_modules/'))('playwright-core');
  const dir = mkdtempSync(join(tmpdir(), 'fannan-r32-'));
  const browser = await chromium.launch({ executablePath: chrome, args: ['--headless=new'] });
  const open = async (html) => {
    const file = join(dir, `p${Math.random().toString(36).slice(2)}.html`); writeFileSync(file, html);
    const ctx = await browser.newContext({ javaScriptEnabled: true, viewport: { width: 1440, height: 900 } });
    const main = await ctx.newPage(); await main.goto(pathToFileURL(file).href); await main.waitForLoadState('load'); await main.waitForTimeout(100);
    return { main };
  };
  try { await fn({ open }); } finally { await browser.close(); rmSync(dir, { recursive: true, force: true }); }
};

const W = (body, script = '', dir = 'ltr') => `<!doctype html><html lang="${dir === 'rtl' ? 'ar' : 'en'}" dir="${dir}"><head></head><body style="background:#fff;margin:0;font:16px/24px sans-serif;color:#1a1a1a"><main style="margin:20px"><h1>${dir === 'rtl' ? 'عنوان' : 'Title'}</h1>${body}</main>${script ? `<script>${script}</script>` : ''}</body></html>`;
const ws = await import('../tools/width-screen.mjs');
const vis = await import('../tools/visibility.mjs');
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
  const list = Object.entries(states).map(([state, v]) => ({ state, html: typeof v === 'string' ? v : v.html, opener: v.opener, reveals: v.reveals }));
  return scopesOf(open, list, dir, desktop);
};
const P = (body, css = '', dir = 'ltr') => W(`${css ? `<style>${css}</style>` : ''}${body}`, '', dir);
const flat = s => s.replace(/\s+/g, ' ');
const clamp = `#bio{width:160px;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:1;overflow:hidden;line-height:24px}#bio p{margin:0}`;

test('R32-M-01: checker-shaped duplicate defaults share one truncation allocation', { skip }, async () => withBrowser(async ({ open }) => {
  const def = P(`<p id="bio">${T}</p><button id="m" aria-controls="bio" aria-expanded="false">Read more</button>`, clamp);
  const exp = P(`<p id="bio">${T}</p><button id="m" aria-controls="bio" aria-expanded="true">Read more</button>`);
  const list = [
    { state: 'default', html: def },
    { state: 'default', html: def },
    { state: 'expanded', html: exp, opener: '#m', reveals: '#bio' },
  ];
  assert.equal((await scopesOf(open, list)).pass, true);
  const badDef = P(`<p id="bio">${T}</p><button id="m" aria-controls="bio" aria-expanded="false">Read more</button>`, `${clamp}@media(max-width:600px){#m{pointer-events:none}}`);
  // disabled via native attribute at narrow — use script listener shape for disabled
  const badDef2 = W(`<style>${clamp}</style><p id="bio">${T}</p><button id="m" aria-controls="bio" aria-expanded="false">Read more</button>`,
    `const apply=()=>{const m=document.getElementById('m'); if(matchMedia('(max-width:600px)').matches) m.disabled=true; else m.disabled=false;}; apply(); addEventListener('resize', apply);`);
  assert.equal((await scopesOf(open, [
    { state: 'default', html: def },
    { state: 'default', html: badDef2 },
    { state: 'expanded', html: exp, opener: '#m', reveals: '#bio' },
  ])).pass, false);
}));

test('R32-M-02: two distinct truncated paragraphs require two expanded targets', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const def = P(`<div id="bio"><p>${T}</p><p>${T}</p></div><button id="m" aria-controls="bio" aria-expanded="false">Read more</button>`, clamp);
  const one = P(`<div id="bio"><p>${T}</p></div><button id="m" aria-controls="bio" aria-expanded="true">Read more</button>`);
  const two = P(`<div id="bio"><p>${T}</p><p>${T}</p></div><button id="m" aria-controls="bio" aria-expanded="true">Read more</button>`);
  assert.equal((await gate({ default: def, expanded: D(one, '#m', '#bio') })).pass, false);
  assert.equal((await gate({ default: def, expanded: D(two, '#m', '#bio') })).pass, true);
}));

test('R32-M-03: Next labels and overflowing wrappers cannot certify disclosures', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const disc = (h) => P(`<button id="m" aria-controls="p">Next delivery dates</button><div id="p" style="width:200px;height:${h};overflow:hidden"><p>Shipping answer.</p></div>`);
  assert.equal((await gate({ default: disc('0'), expanded: D(disc('auto'), '#m', '#p') })).pass, false);
  const css = `@media(max-width:600px){.wide{display:none}}@media(min-width:601px){.mobile{display:none}}`;
  const menu = (opened) => P(`<a class="wide" href="/about">About</a><div class="wrap mobile" style="width:100%;overflow-x:hidden"><div style="width:110%"></div><button id="m">More</button><nav id="p" style="${opened ? '' : 'display:none'}"><a href="/about">About</a></nav></div>`, css);
  assert.equal((await gate({ default: menu(false), 'menu-open': D(menu(true), '#m', '#p') })).pass, false);
  // genuine translated-track carousel still PASS
  const car = (tx) => P(`<div style="width:200px;overflow:hidden;direction:ltr"><div style="display:flex;width:400px;transform:translateX(${tx}px)"><div class="slide" style="flex:0 0 200px"><p>One unique</p></div><div class="slide" style="flex:0 0 200px"><p>Two unique</p></div></div></div><button class="next" aria-label="Next slide">›</button>`);
  assert.equal((await scopesOf(open, [
    { state: 'default', html: car(0) },
    { state: 'slide-2', html: car(-200), opener: '.next', reveals: '.slide:nth-child(2)' },
  ])).pass, true);
}));

test('R32-M-04: localized responsive carousels pass without overflowing tracks', { skip }, async () => withBrowser(async ({ open }) => {
  const mk = (labels, dir, which) => {
    // which: 'both' | 'a' | 'b' — at CSS, both at 1440; at 320 show only a or b
    const show = which === 'both' ? '' : which === 'a'
      ? '@media(max-width:600px){#b{display:none}}'
      : '@media(max-width:600px){#a{display:none}}';
    const status = which === 'a' ? '<p>Status A</p>' : which === 'b' ? '<p>Status B</p>' : '';
    return P(`<div aria-roledescription="carousel"><div id="a" role="group"><p>Slide Alpha content</p></div><div id="b" role="group"><p>Slide Beta content</p></div>
      <button id="prev" aria-controls="a" aria-label="${labels[0]}">‹</button>
      <button id="next" aria-controls="b" aria-label="${labels[1]}">›</button>${status}</div>`, show, dir);
  };
  for (const [labels, dir] of [[['السابق', 'التالي'], 'rtl'], [['Précédent', 'Suivant'], 'ltr'], [['Previous', 'Next'], 'ltr']]) {
    const g = await scopesOf(open, [
      { state: 'default', html: mk(labels, dir, 'a') },
      { state: 'slide-a', html: mk(labels, dir, 'a'), opener: '#prev', reveals: '#a' },
      { state: 'slide-b', html: mk(labels, dir, 'b'), opener: '#next', reveals: '#b' },
    ], dir);
    assert.equal(g.pass, true, `${labels} ${dir}`);
  }
}));

test('R32-M-05: mixed-axis FAQ overflow does not enable undeclared fallback', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const faq = (h, wrap) => P(`<div id="answer" style="width:200px;height:${h};overflow:hidden"><p style="margin:0;${wrap ? '' : 'white-space:nowrap'}">${T}</p></div>`);
  assert.equal((await gate({ default: faq('0', false), expanded: faq('auto', true) })).pass, false);
  const disc = (opened) => P(`<button id="m" aria-expanded="${opened}">More</button><div id="answer" style="width:200px;height:${opened ? 'auto' : '0'};overflow:hidden"><p style="margin:0">${T}</p></div>`);
  assert.equal((await gate({ default: disc(false), expanded: D(disc(true), '#m', '#answer') })).pass, true);
  const slide = i => P(`<div style="width:200px;overflow:hidden"><div style="display:flex;width:400px;transform:translateX(-${i * 200}px)"><div style="flex:0 0 200px"><p>One</p></div><div style="flex:0 0 200px"><p>Two</p></div></div></div>`);
  assert.equal((await gate({ default: slide(0), 'slide-2': slide(1) })).pass, true);
}));

test('R32-M-06: desktop reveal cannot bypass a disabled 320 opener', { skip }, async () => withBrowser(async ({ open }) => {
  const script = `const apply=()=>{const m=document.getElementById('m'); if(matchMedia('(max-width:600px)').matches) m.disabled=true; else m.disabled=false;}; apply(); addEventListener('resize', apply);`;
  const page = (opened, withDisable) => W(
    `<button id="m" aria-controls="p" aria-expanded="${opened}">More</button><div id="p" style="width:200px;height:${opened === 'true' ? 'auto' : '0'};overflow:hidden"><p>Shipping answer.</p></div>`,
    withDisable ? script : '');
  const bad = await scopesOf(open, [
    { state: 'default', html: page('false', true) },
    { state: 'expanded', html: page('true', false), opener: '#m', reveals: '#p' },
  ]);
  assert.equal(bad.pass, false);
  const r320 = bad.scopes[0].widths.results.find(x => x.width === 320);
  const whys = (r320?.declarations || []).flatMap(d => d.why || []);
  assert.ok(whys.some(w => /disabled|inert/i.test(w)), JSON.stringify(whys));
  assert.equal((await scopesOf(open, [
    { state: 'default', html: page('false', false) },
    { state: 'expanded', html: page('true', false), opener: '#m', reveals: '#p' },
  ])).pass, true);
}));

test('R32-M-07: oversized top modal is screened when its centre is off viewport', { skip }, async () => withBrowser(async ({ open }) => {
  const base = '<p>Stable body copy for the screen.</p>';
  const confirm = (keep) => W(`${base}
    <dialog id="top" style="position:fixed;left:0;top:0;margin:0;width:240px;height:2400px;max-height:none">
      <h2>Confirm</h2><button class="primary">Confirm purchase</button>
      ${keep ? '' : '<style>@media(max-width:600px){.primary{display:none}}</style>'}
    </dialog>
    <dialog id="lower"><h2>Lower</h2><p>Lower body</p></dialog>`,
    `document.getElementById('lower').showModal();document.getElementById('top').showModal();`);
  assert.equal((await scopesOf(open, [
    { state: 'default', html: W(base) },
    { state: 'confirm-open', html: confirm(false) },
  ])).pass, false);
  assert.equal((await scopesOf(open, [
    { state: 'default', html: W(base) },
    { state: 'confirm-open', html: confirm(true) },
  ])).pass, true);
}));

test('R32-M-08: shadow-modal background is inert in width and visibility probes', { skip }, async () => withBrowser(async ({ open }) => {
  const bg = '<h2>Background heading</h2><p>Background paragraph that must become inert.</p><button id="cart-btn">Cart</button>';
  const script = (openModal) => `const host=document.createElement('div');document.body.appendChild(host);const root=host.attachShadow({mode:'open'});
    root.innerHTML='<dialog id="dlg" style="position:fixed;inset:0;margin:0;max-width:none;max-height:none;width:100vw;height:100vh;border:0;background:#fff;color:#000"><h2>Cart</h2><button class="checkout">Checkout</button></dialog>';
    ${openModal ? "root.getElementById('dlg').showModal();" : ''}`;
  const def = W(bg, script(false));
  const cart = W(bg, script(true));
  const g = await scopesOf(open, [
    { state: 'default', html: def },
    { state: 'cart-open', html: cart },
  ]);
  assert.equal(g.pass, true);
  const { main } = await open(cart);
  const band = await main.evaluate(vis.visibilityBand, { mode: 'measure', topLayer: true });
  const statuses = (band.targets || []).map(t => ({ text: t.text, status: t.status }));
  assert.ok(statuses.some(t => /Cart|Checkout/i.test(t.text) && t.status !== 'inert'), JSON.stringify(statuses));
  assert.ok(statuses.filter(t => /Background/i.test(t.text)).every(t => t.status === 'inert'), JSON.stringify(statuses));
}));

test('R32-M-09: conditionally mounted menu preserves strict target validation', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const css = `@media(max-width:600px){.wide{display:none}}@media(min-width:601px){.mobile{display:none}}`;
  const closed = (controls) => P(`<a class="wide" href="/about">About</a><button id="m" class="mobile" aria-controls="${controls}" aria-expanded="false">Menu</button>`, css);
  const opened = (controls) => P(`<a class="wide" href="/about">About</a><button id="m" class="mobile" aria-controls="${controls}" aria-expanded="true">Menu</button><nav id="p" class="mobile"><a href="/about">About</a></nav>`, css);
  assert.equal((await gate({ default: closed('p'), 'menu-open': D(opened('p'), '#m', '#p') })).pass, true);
  assert.equal((await gate({ default: closed('p missing-panel'), 'menu-open': D(opened('p missing-panel'), '#m', '#p') })).pass, false);
  assert.equal((await gate({ default: closed('missing-panel'), 'menu-open': D(opened('missing-panel'), '#m', '#p') })).pass, false);
}));

test('R32-M-10: expanded unselected tree branch supplies a valid reveal', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const tree = (exp) => P(`<ul role="tree"><li>
    <button id="b" role="treeitem" aria-controls="sub" aria-selected="false" aria-expanded="${exp}">Docs</button>
    <ul id="sub" role="group" style="height:${exp === 'true' ? 'auto' : '0'};overflow:hidden;margin:0;padding:0;list-style:none">
      <li><a role="treeitem" href="/api">API</a></li>
    </ul></li></ul>`);
  assert.equal((await gate({ default: tree('false'), 'docs-open': D(tree('true'), '#b', '#sub') })).pass, true);
  const css = `@media(max-width:600px){.wide{display:none}}@media(min-width:601px){.mobile{display:none}}`;
  const stuck = (opened) => P(`<a class="wide" href="/about">About</a><button id="m" class="mobile" aria-haspopup="true" aria-controls="p" aria-expanded="false">Menu</button><nav id="p" class="mobile" style="${opened ? '' : 'display:none'}"><a href="/about">About</a></nav>`, css);
  assert.equal((await gate({ default: stuck(false), 'menu-open': D(stuck(true), '#m', '#p') })).pass, false);
}));

test('R32-M-11: reveal guidance documents targets transitions and allocation scope', { skip }, async () => withBrowser(async ({ open }) => {
  const quality = flat(readFileSync(join(release, 'references/design-quality.md'), 'utf8'));
  const contract = flat(readFileSync(join(release, 'references/handoff-contract.md'), 'utf8'));
  const skill = flat(readFileSync(join(release, 'skills/design-prototype/SKILL.md'), 'utf8'));
  const untested = flat(readFileSync(join(release, 'UNTESTED.md'), 'utf8'));
  assert.ok(/supplied target|target id|aria-controls/i.test(contract) && /unmounted|conditionally mounted|absent region/i.test(contract + skill), 'target resolution + unmounted exception');
  assert.ok(/transition/i.test(quality) && !/name matching proves a transition/i.test(quality), 'transition verification without name-proves claim');
  assert.ok(/equivalent capture|duplicate default|share/i.test(quality + untested), 'shared equivalent captures');
  const css = `@media(max-width:600px){.wide{display:none}}@media(min-width:601px){.mobile{display:none}}`;
  const page = (opened, controls) => P(`<a class="wide" href="/about">About</a><button id="m" class="mobile" aria-controls="${controls}" aria-expanded="${opened}">Menu</button><nav id="p" class="mobile"${opened === 'true' ? '' : ' hidden'}><a href="/about">About</a></nav>`, css);
  const gate = gateOf(open);
  assert.equal((await gate({ default: page('false', 'p'), 'menu-open': D(page('true', 'p'), '#m', '#p') })).pass, true);
  assert.equal((await gate({ default: page('false', 'p missing-panel'), 'menu-open': D(page('true', 'p missing-panel'), '#m', '#p') })).pass, false);
}));
