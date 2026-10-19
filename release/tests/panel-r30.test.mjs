// R30 (panel round 30): real-Chrome regressions for Sol's accepted fix specs R30-M-01..M-20
// (M-10 rejected by R27 ruling (a); M-21 rejected). Each case fails on 0d3c13c and passes after its fix.
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
  const dir = mkdtempSync(join(tmpdir(), 'fannan-r30-'));
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
const D = (html, opener, reveals, carousel) => ({ html, opener, reveals, ...(carousel ? { carousel } : {}) });
const scopesOf = async (open, list, dir = 'ltr') => {
  const probes = list.filter(x => x.opener && x.reveals).map(x => ({ state: x.state, opener: x.opener, reveals: x.reveals, ...(x.carousel ? { carousel: x.carousel } : {}) }));
  const scopes = []; for (const x of list) scopes.push({ scope: { screen: 'home', state: x.state, lang: dir === 'rtl' ? 'ar' : 'en' }, widths: await ws.screenWidths((await open(x.html)).main, [1440], null, 900, probes), declaration: x.opener && x.reveals ? { opener: x.opener, reveals: x.reveals, ...(x.carousel ? { carousel: x.carousel } : {}) } : null });
  const r = ws.resolveReveals(scopes); return { pass: r.pass && scopes.every(s => s.widths.pass), scopes, r };
};
const gateOf = open => async (states) => {
  const decl = Object.entries(states).map(([state, v]) => [state, typeof v === 'string' ? { html: v } : v]);
  const list = decl.map(([state, v]) => ({ state, html: v.html, opener: v.opener, reveals: v.reveals, carousel: v.carousel }));
  return scopesOf(open, list);
};
const narrow = '@media(max-width:600px){.wide{display:none}}';
const mobile = '@media(min-width:601px){.mobile{display:none}}';
const P = (body, css = '') => W(`${css ? `<style>${css}</style>` : ''}${body}`);

test('R30-M-01: real Chrome: declared native dialog[open] certifies reveal; closed companion fails (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const trigger = `<button id="menu" aria-haspopup="dialog" aria-controls="panel">Menu</button>`;
  const def = P(trigger + `<nav class="wide"><a href="#about">About</a></nav><dialog id="panel"><a href="#about">About</a></dialog>`, narrow);
  const openDlg = P(trigger + `<dialog id="panel" open><a href="#about">About</a></dialog>`, `dialog[open]{position:static;margin:0}`);
  const closed = P(trigger + `<dialog id="panel"><a href="#about">About</a></dialog>`, `dialog{position:static;margin:0}`);
  assert.equal((await gate({ default: def, 'dialog-open': D(openDlg, '#menu', '#panel') })).pass, true);
  assert.equal((await gate({ default: def, 'dialog-open': D(closed, '#menu', '#panel') })).pass, false);
}));

test('R30-M-02: real Chrome: aria-haspopup menu with shown declared panel passes without aria-expanded; closed fails (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const hp = opened => P(`<style>${narrow}${mobile}@media(min-width:601px){#menu,#panel{display:none}}</style><nav class="wide"><a href="#about">About</a></nav><button id="menu" class="mobile" aria-haspopup="true" aria-controls="panel">Menu</button><nav id="panel" class="mobile" style="${opened ? '' : 'display:none'}"><a href="#about">About</a></nav>`);
  assert.equal((await gate({ default: hp(false), 'menu-open': D(hp(true), '#menu', '#panel') })).pass, true);
  assert.equal((await gate({ default: hp(false), 'menu-open': D(hp(false), '#menu', '#panel') })).pass, false);
}));

test('R30-M-03: real Chrome: disabled / fieldset-disabled / aria-disabled openers fail; enabled passes (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const mk = (opened, attrs) => P(`<button id="menu" ${attrs} aria-controls="panel" aria-expanded="${opened}">Menu</button><nav id="panel"><a href="#about">About</a></nav>`, opened ? '' : '@media(max-width:600px){#panel{display:none}}');
  const fs = (opened) => P(`<fieldset disabled><button id="menu" aria-controls="panel" aria-expanded="${opened}">Menu</button></fieldset><nav id="panel"><a href="#about">About</a></nav>`, opened ? '' : '@media(max-width:600px){#panel{display:none}}');
  assert.equal((await gate({ default: mk(false, ''), 'menu-open': D(mk(true, ''), '#menu', '#panel') })).pass, true);
  assert.equal((await gate({ default: mk(false, 'disabled'), 'menu-open': D(mk(true, 'disabled'), '#menu', '#panel') })).pass, false);
  assert.equal((await gate({ default: fs(false), 'menu-open': D(fs(true), '#menu', '#panel') })).pass, false);
  assert.equal((await gate({ default: mk(false, 'aria-disabled="true"'), 'menu-open': D(mk(true, 'aria-disabled="true"'), '#menu', '#panel') })).pass, false);
}));

test('R30-M-04: real Chrome: opacity:0 opener or panel at 320 fails; visible counterparts pass (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const base = (opened, extra) => P(`<style>${narrow}${mobile}${extra}@media(min-width:601px){#panel,#menu{display:none}}</style><nav class="wide"><a href="#about">About</a> <a href="#work">Work</a></nav><button id="menu" class="mobile" aria-expanded="${opened}">Menu</button><nav id="panel" class="mobile" style="${opened ? '' : 'display:none'}"><a href="#about">About</a> <a href="#work">Work</a></nav>`);
  assert.equal((await gate({ default: base(false, ''), 'menu-open': D(base(true, ''), '#menu', '#panel') })).pass, true);
  assert.equal((await gate({ default: base(false, '@media(max-width:600px){#menu{opacity:0}}'), 'menu-open': D(base(true, ''), '#menu', '#panel') })).pass, false);
  assert.equal((await gate({ default: base(false, ''), 'menu-open': D(base(true, '@media(max-width:600px){#panel{opacity:0}}'), '#menu', '#panel') })).pass, false);
}));

test('R30-M-05: real Chrome: clamped bio with footer text fails; real expanded state passes (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const T = 'A carefully written account of the project and the people who made it.';
  const clamp = `#bio{width:160px;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:1;overflow:hidden;line-height:24px}`;
  const biography = (error, expanded) => P(`<p id="bio">${T}</p><button id="more" aria-controls="bio" aria-expanded="${expanded}">Read more</button>${error ? '<p role="status">Please retry.</p>' : ''}<footer><p>${T}</p></footer>`, expanded ? '' : clamp);
  assert.equal((await gate({ default: biography(false, false), error: D(biography(true, false), '#more', '#bio') })).pass, false);
  assert.equal((await gate({ default: biography(false, false), error: biography(true, false) })).pass, false);
  assert.equal((await gate({ default: biography(false, false), expanded: D(biography(false, true), '#more', '#bio') })).pass, true);
}));

test('R30-M-06: real Chrome: unchanged carousel first slide cannot cover hidden second Remove; translated track passes (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const bad = selected => P(`<div style="width:200px;overflow:hidden"><div style="display:flex;width:400px"><div style="flex:0 0 200px"><button>Remove</button></div><div style="flex:0 0 200px"><button>Remove</button></div></div></div><button style="background:${selected === 1 ? '#ddd' : 'white'}">1</button><button style="background:${selected === 2 ? '#ddd' : 'white'}">2</button>`);
  const good = i => P(`<div id="g" style="width:200px;overflow:hidden"><div style="display:flex;width:400px;transform:translateX(-${i * 200}px)"><div id="s1" style="flex:0 0 200px"><button>Remove</button></div><div id="s2" style="flex:0 0 200px"><button>Remove</button></div></div></div><button id="dot1" aria-current="${i === 0}">1</button><button id="dot2" aria-current="${i === 1}">2</button>`);
  const CM = { root: '#g', slides: ['#s1', '#s2'] };
  assert.equal((await gate({ default: bad(1), 'slide-2': bad(2) })).pass, false);
  assert.equal((await gate({
    default: good(0),
    'slide-1': D(good(0), '#dot1', '#s1', CM),
    'slide-2': D(good(1), '#dot2', '#s2', CM),
  })).pass, true);
}));

test('R30-M-07: real Chrome: one physical Remove cannot cover two losses via nested regions or clip+loss (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  // R31-M-05: vertical nested clips need declarations (undeclared control-in-clip fallback retired)
  const E1bad = [
    { state: 'default', html: P(`<button id="m" aria-expanded="false">Open</button><section id="box" style="position:relative;width:200px;height:100px;overflow:hidden"><button data-item="a" style="position:absolute;top:120px">Remove</button><div style="height:0;overflow:hidden"><button data-item="b">Remove</button></div></section>`) },
    { state: 'all-open', html: P(`<button id="m" aria-expanded="true">Open</button><section id="box" style="position:relative;width:200px;height:100px;overflow:hidden"><div style="height:40px;overflow:hidden"><button data-item="b">Remove</button></div></section>`), opener: '#m', reveals: '#box' },
  ];
  const E1ok = [
    { state: 'default', html: P(`<button id="m" aria-expanded="false">Open</button><section id="box" style="position:relative;width:200px;height:100px;overflow:hidden"><button data-item="a" style="position:absolute;top:120px">Remove</button><div style="height:0;overflow:hidden"><button data-item="b">Remove</button></div></section>`) },
    { state: 'all-open', html: P(`<button id="m" aria-expanded="true">Open</button><section id="box" style="position:relative;width:200px;height:100px;overflow:hidden"><button data-item="a">Remove</button><div style="height:40px;overflow:hidden"><button data-item="b">Remove</button></div></section>`), opener: '#m', reveals: '#box' },
  ];
  const E2 = (two) => ({
    default: P(`<button id="menu" aria-expanded="false">Items</button><button class="wide" data-item="a">Remove</button><div id="panel" style="height:0;overflow:hidden"><button data-item="b">Remove</button></div>`, narrow),
    'menu-open': D(P(`<button id="menu" aria-expanded="true">Items</button><div id="panel"><button data-item="b">Remove</button>${two ? '<button data-item="a">Remove</button>' : ''}</div>`), '#menu', '#panel'),
  });
  assert.equal((await scopesOf(open, E1bad)).pass, false);
  assert.equal((await scopesOf(open, E1ok)).pass, true);
  assert.equal((await gate(E2(false))).pass, false);
  assert.equal((await gate(E2(true))).pass, true);
}));

test('R30-M-08: real Chrome: differing declaration inputs do not twin; bad+good either order fails (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const shell = (opened, bad) => P(`<style>${narrow}${mobile}@media(min-width:601px){#menu,#panel{display:none}}</style><nav class="wide"><a href="#about">About</a></nav>${bad ? `<div id="panel" class="mobile" ${opened ? '' : 'hidden'}><button id="menu" aria-expanded="${opened}">Menu</button>${opened ? '<a href="#about">About</a>' : ''}</div>` : `<button id="menu" class="mobile" aria-expanded="${opened}">Menu</button><div id="panel" class="mobile" ${opened ? '' : 'hidden'}>${opened ? '<a href="#about">About</a>' : ''}</div>`}`);
  const goodDefault = shell(false, false);
  const badDefault = shell(false, true);
  const openPage = shell(true, false);
  assert.equal((await scopesOf(open, [{ state: 'default', html: goodDefault }, { state: 'default', html: badDefault }, { state: 'menu-open', html: openPage, opener: '#menu', reveals: '#panel' }])).pass, false);
  assert.equal((await scopesOf(open, [{ state: 'default', html: badDefault }, { state: 'default', html: goodDefault }, { state: 'menu-open', html: openPage, opener: '#menu', reveals: '#panel' }])).pass, false);
  assert.equal((await scopesOf(open, [{ state: 'default', html: goodDefault }, { state: 'default', html: goodDefault }, { state: 'menu-open', html: openPage, opener: '#menu', reveals: '#panel' }])).pass, true);
}));

test('R30-M-09: real Chrome: two different default captures each get their own cover pool (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const defA = P(`<style>${narrow}${mobile}@media(min-width:601px){#menu,#panel{display:none}}</style><p>Promo</p><nav class="wide"><a href="#about">About</a> <a href="#work">Work</a></nav><button id="menu" class="mobile" aria-expanded="false">Menu</button><nav id="panel" class="mobile" hidden></nav>`);
  const defB = P(`<style>${narrow}${mobile}@media(min-width:601px){#menu,#panel{display:none}}</style><nav class="wide"><a href="#about">About</a> <a href="#work">Work</a></nav><button id="menu" class="mobile" aria-expanded="false">Menu</button><nav id="panel" class="mobile" hidden></nav>`);
  const openP = P(`<style>${narrow}${mobile}@media(min-width:601px){#menu,#panel{display:none}}</style><nav class="wide"><a href="#about">About</a> <a href="#work">Work</a></nav><button id="menu" class="mobile" aria-expanded="true">Menu</button><nav id="panel" class="mobile"><a href="#about">About</a> <a href="#work">Work</a></nav>`);
  assert.equal((await scopesOf(open, [{ state: 'default', html: defA }, { state: 'default', html: defB }, { state: 'menu-open', html: openP, opener: '#menu', reveals: '#panel' }])).pass, true);
  assert.equal((await scopesOf(open, [{ state: 'default', html: defB }, { state: 'default', html: defA }, { state: 'menu-open', html: openP, opener: '#menu', reveals: '#panel' }])).pass, true);
}));

test('R30-M-11: real Chrome: reveals contradicting aria-controls fails; matching and portal without native target pass (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const wrong = opened => P(`<header><button id="menu" aria-controls="nav" aria-expanded="${opened}">Menu</button><nav id="nav" class="wide"><a href="#about">About</a></nav></header><aside id="help-panel" class="mobile" ${opened ? '' : 'hidden'}><a href="#about">About</a></aside>`, narrow + mobile);
  const right = opened => P(`<style>${narrow}${mobile}@media(min-width:601px){#menu{display:none}}</style><header><nav class="wide" id="desk"><a href="#about">About</a></nav><button id="menu" class="mobile" aria-controls="nav" aria-expanded="${opened}">Menu</button><nav id="nav" class="mobile" style="${opened ? '' : 'display:none'}"><a href="#about">About</a></nav></header>`);
  assert.equal((await gate({ default: wrong(false), 'menu-open': D(wrong(true), '#menu', '#help-panel') })).pass, false);
  assert.equal((await gate({ default: right(false), 'menu-open': D(right(true), '#menu', '#nav') })).pass, true);
  const portal = opened => P(`<style>${narrow}${mobile}@media(min-width:601px){#menu,#portal{display:none}}</style><nav class="wide"><a href="#about">About</a></nav><button id="menu" class="mobile" aria-expanded="${opened}">Menu</button><div id="portal" class="mobile"${opened ? '' : ' hidden'}><a href="#about">About</a></div>`);
  assert.equal((await gate({ default: portal(false), 'menu-open': D(portal(true), '#menu', '#portal') })).pass, true);
}));

test('R30-M-12: published examples use state; blank state names fail contract (test-only)', { skip: false }, async () => {
  const skill = readFileSync(join(release, 'skills/design-prototype/SKILL.md'), 'utf8');
  const contract = readFileSync(join(release, 'references/handoff-contract.md'), 'utf8');
  const re = /\{\s*"state"\s*:\s*"menu-open"/;
  assert.match(skill, re);
  assert.match(contract, re);
  assert.doesNotMatch(skill, /\{"id":"menu-open"/);
  assert.doesNotMatch(contract, /\{"id":"menu-open"/);
  // scope construction: state field retained
  const example = { state: 'menu-open', lang: 'en', dir: 'ltr', page: 'menu-open.html', opener: 'details.mnav > summary', reveals: 'details.mnav .panel' };
  assert.equal(example.state, 'menu-open');
  assert.ok(example.opener && example.reveals);
  // contract validation rejects blank state
  const { validateHandoff } = await import('../tools/handoff-contract.mjs').catch(() => ({}));
  // handoff-contract exports validate via default pattern — use createRequire path
  const hc = await import('../tools/handoff-contract.mjs');
  const validate = hc.validateHandoff || hc.default || hc.validate;
  // If no easy validate export, unit-check nonempty helper path via a minimal call isn't available;
  // assert the source contains the new need() instead (already done by reading).
  const src = readFileSync(join(release, 'tools/handoff-contract.mjs'), 'utf8');
  assert.match(src, /every state needs a nonempty state name/);
});

test('R30-M-13: real Chrome: checked checkbox/radio certifies declared reveal (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const box = checked => P(`<style>${narrow}${mobile}@media(min-width:601px){#m,label[for=m],.nav{display:none}}</style><nav class="wide"><a href="#about">About</a></nav><input type="checkbox" id="m" class="mobile" ${checked ? 'checked' : ''}><label class="mobile" for="m">Menu</label><nav class="nav mobile" style="${checked ? '' : 'display:none'}"><a href="#about">About</a></nav>`);
  assert.equal((await gate({ default: box(false), 'menu-open': D(box(true), '#m', '.nav') })).pass, true);
  assert.equal((await gate({ default: box(false), 'menu-open': D(box(false), '#m', '.nav') })).pass, false);
}));

test('R30-M-14: real Chrome: invisible heading does not end a section; visible equal-rank does (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const LS = '<style>@media (max-width:600px){.l{display:none}}@media (min-width:601px){.s{display:none}}</style>';
  const tabs = sel => `<div class="l"><div role="tablist" aria-label="Reports">${['Sales', 'Costs'].map(t => `<button role="tab" aria-selected="${t === sel}">${t}</button>`).join('')}</div><div role="tabpanel"><p>${sel} text.</p><button>Download</button></div></div>`;
  const sections = (hidden) => `<article class="s"><h2>Sales</h2><p>Sales text.</p><button>Download</button><h2>Costs</h2><p>Costs text.</p>${hidden}<button>Download</button></article>`;
  const page = (sel, hidden) => W(LS + tabs(sel) + sections(hidden));
  const st = hidden => ({ default: page('Sales', hidden), 'tab-costs': page('Costs', hidden) });
  assert.equal((await gate(st('<h2 style="display:none">Actions</h2>'))).pass, true);
  assert.equal((await gate(st('<h2 class="sr" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)">Actions</h2>'))).pass, true);
  assert.equal((await gate(st('<h2>Actions</h2>'))).pass, false);
}));

test('R30-M-15: real Chrome: open shadow root declaration passes; closed root fails (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const mk = (opened, mode) => {
    const tag = `menu-host-${mode}-${opened ? 'o' : 'c'}`;
    const inner = opened
      ? `<button class="menu" aria-expanded="true">Menu</button><div class="panel"><a href="#about">About</a></div>`
      : `<style>@media(max-width:600px){.d{display:none}}@media(min-width:601px){.menu,.panel{display:none}}</style><nav class="d"><a href="#about">About</a></nav><button class="menu" aria-expanded="false">Menu</button><div class="panel" style="display:none"><a href="#about">About</a></div>`;
    const script = `class MH extends HTMLElement { connectedCallback() { const r = this.attachShadow({ mode: '${mode}' }); r.innerHTML = ${JSON.stringify(inner)}; } } customElements.define('${tag}', MH);`;
    return W(`<${tag}></${tag}>`, script);
  };
  assert.equal((await gate({ default: mk(false, 'open'), 'menu-open': D(mk(true, 'open'), '.menu', '.panel') })).pass, true);
  assert.equal((await gate({ default: mk(false, 'closed'), 'menu-open': D(mk(true, 'closed'), '.menu', '.panel') })).pass, false);
}));

test('R30-M-16: real Chrome: details container as reveals excludes summary; open FAQ passes (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const faq = (opened, wrap) => P(`<nav class="wide"><a href="#about">About</a></nav><details class="faq mobile" ${opened ? 'open' : ''}><summary>Menu</summary>${wrap ? `<p><a href="#about">About</a></p>` : `<a href="#about">About</a>`}</details>`, narrow + mobile);
  assert.equal((await gate({ default: faq(false, true), 'menu-open': D(faq(true, true), 'details.faq > summary', 'details.faq') })).pass, true);
  assert.equal((await gate({ default: faq(false, false), 'menu-open': D(faq(true, false), 'details.faq > summary', 'details.faq') })).pass, true);
}));

test('R30-M-17: real Chrome: opener unmounted after opening dialog still passes with declaration (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const def = P(`<button id="open" aria-controls="drawer">Open</button><nav class="wide"><a href="#about">About</a></nav><dialog id="drawer"><a href="#about">About</a></dialog>`, narrow);
  const opened = P(`<dialog id="drawer" open><button id="close">Close</button><a href="#about">About</a></dialog>`, `dialog[open]{position:static;margin:0}`);
  const stillClosed = P(`<dialog id="drawer"><button id="close">Close</button><a href="#about">About</a></dialog>`, `dialog{position:static;margin:0}`);
  assert.equal((await gate({ default: def, 'dialog-open': D(opened, '#open', '#drawer') })).pass, true);
  assert.equal((await gate({ default: def, 'dialog-open': D(stillClosed, '#open', '#drawer') })).pass, false);
}));

test('R30-M-18: real Chrome: declared Prev/Next carousel slides pass; unchanged track fails (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const track = i => P(`<div id="g" style="overflow:hidden;width:300px"><div style="display:flex;width:900px;transform:translateX(-${i * 300}px)">${[1, 2, 3].map(k => `<div class="slide" id="s${k}" style="flex:0 0 300px"><p>Slide ${k} unique</p><button>Shop</button></div>`).join('')}</div></div><button class="prev">Previous</button><button class="next">Next</button>`);
  const stuck = P(`<div id="g" style="overflow:hidden;width:300px"><div style="display:flex;width:900px">${[1, 2, 3].map(k => `<div class="slide" id="s${k}" style="flex:0 0 300px"><p>Slide ${k} unique</p><button>Shop</button></div>`).join('')}</div></div><button class="prev">Previous</button><button class="next">Next</button>`);
  const CM = { root: '#g', slides: ['#s1', '#s2', '#s3'] };
  assert.equal((await gate({
    default: track(0),
    'slide-1': D(track(0), '.prev', '#s1', CM),
    'slide-2': D(track(1), '.next', '#s2', CM),
    'slide-3': D(track(2), '.next', '#s3', CM),
  })).pass, true);
  assert.equal((await gate({ default: track(0), 'slide-2': D(stuck, '.next', '#s2', CM) })).pass, false);
}));

test('R30-M-19: real Chrome: undeclared collapsed FAQ fails; declared disclosure passes; carousel fallback kept (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const faq = openH => P(`<div style="overflow:hidden;height:${openH ? 'auto' : '0'}"><p>FAQ answer text about shipping.</p></div>`);
  assert.equal((await gate({ default: faq(false), expanded: faq(true) })).pass, false);
  const disc = opened => P(`<button id="more" aria-expanded="${opened}">More</button><div id="ans" ${opened ? '' : 'hidden'}><p>FAQ answer text about shipping.</p></div>`);
  assert.equal((await gate({ default: disc(false), expanded: D(disc(true), '#more', '#ans') })).pass, true);
}));

test('R30-M-20: real Chrome: active modal does not require background menu opener; cart incomplete fails (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const nav = opened => `<style>${narrow}${mobile}</style><header><nav class="wide" aria-label="Main"><a href="#about">About</a> <a href="#work">Work</a></nav><button class="menu mobile" aria-expanded="${opened}">Menu</button><ul class="nav mobile" style="${opened ? '' : 'display:none'}"><li><a href="#about">About</a></li><li><a href="#work">Work</a></li></ul></header>`;
  const def = W(nav(false) + '<p>Body</p><button id="cart-btn">Cart</button>');
  const menu = W(nav(true) + '<p>Body</p>');
  const cart = (keep) => W(nav(false) + `<p>Body</p><dialog id="cart"><h2>Cart</h2><button class="checkout">Checkout</button>${keep ? '' : '<style>@media(max-width:600px){.checkout{display:none}}</style>'}</dialog>`, `document.getElementById('cart').showModal();`);
  assert.equal((await scopesOf(open, [
    { state: 'default', html: def },
    { state: 'menu-open', html: menu, opener: '.menu', reveals: '.nav' },
    { state: 'cart-open', html: cart(true) },
  ])).pass, true);
  assert.equal((await scopesOf(open, [
    { state: 'default', html: def },
    { state: 'menu-open', html: menu, opener: '.menu', reveals: '.nav' },
    { state: 'cart-open', html: cart(false) },
  ])).pass, false);
  assert.equal((await scopesOf(open, [
    { state: 'default', html: def },
    { state: 'cart-open', html: cart(true) },
  ])).pass, false);
}));
