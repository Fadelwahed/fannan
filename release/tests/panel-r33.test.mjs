// R33 (panel round 33): real-Chrome regressions for Sol's accepted fix specs R33-M-01..M-08
// (M-09..M-20 rejected). Standing rejections unchanged.
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
  const dir = mkdtempSync(join(tmpdir(), 'fannan-r33-'));
  const browser = await chromium.launch({ executablePath: chrome, args: ['--headless=new'] });
  const open = async (html) => {
    const file = join(dir, `p${Math.random().toString(36).slice(2)}.html`); writeFileSync(file, html);
    const ctx = await browser.newContext({ javaScriptEnabled: true, viewport: { width: 1440, height: 900 } });
    const main = await ctx.newPage(); await main.goto(pathToFileURL(file).href); await main.waitForLoadState('load'); await main.waitForTimeout(100);
    return { main };
  };
  try { await fn({ open }); } finally { await browser.close(); rmSync(dir, { recursive: true, force: true }); }
};

const W = (body, script = '', dir = 'ltr', lang = null) => `<!doctype html><html lang="${lang || (dir === 'rtl' ? 'ar' : 'en')}" dir="${dir}"><head></head><body style="background:#fff;margin:0;font:16px/24px sans-serif;color:#1a1a1a"><main style="margin:20px"><h1>${dir === 'rtl' ? 'عنوان' : 'Title'}</h1>${body}</main>${script ? `<script>${script}</script>` : ''}</body></html>`;
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
const gateOf = (open) => async (states, dir = 'ltr') => {
  const list = Object.entries(states).map(([state, v]) => ({ state, html: typeof v === 'string' ? v : v.html, opener: v.opener, reveals: v.reveals }));
  return scopesOf(open, list, dir);
};
const P = (body, css = '', dir = 'ltr') => W(`${css ? `<style>${css}</style>` : ''}${body}`, '', dir);
const flat = s => s.replace(/\s+/g, ' ');
const hide320 = '#p{display:none}';
const showCss = (extra = '') => `@media(max-width:600px){${hide320}}${extra}`;

test('R33-M-01: ordinary clipped flex and grid disclosures require an open signal', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const hide = '@media(max-width:600px){#p{display:none}}';
  const layouts = [
    (opened, exp) => W(`<style>body{overflow-x:hidden}${opened ? '' : hide}</style>
      <header style="display:flex;gap:8px"><button id="m"${exp !== undefined ? ` aria-expanded="${exp}"` : ''}>More</button>
      <div id="p"><a href="/x">Unique flex link</a></div></header>`),
    (opened, exp) => P(`<div style="overflow:hidden;border-radius:8px;display:flex;flex-direction:column">
      <button id="m"${exp !== undefined ? ` aria-expanded="${exp}"` : ''}>Details</button>
      <div id="p"><p>Unique card details text.</p></div></div>`, opened ? '' : hide),
    (opened, exp) => P(`<div style="overflow:hidden;display:grid;grid-template-columns:1fr 1fr">
      <button id="m"${exp !== undefined ? ` aria-expanded="${exp}"` : ''}>Show more</button>
      <div id="p"><p>Unique grid item copy.</p></div></div>`, opened ? '' : hide),
    (opened, exp) => W(`<style>body{overflow-x:hidden}${opened ? '' : hide}</style>
      <div style="display:flex;flex-direction:column"><button id="m"${exp !== undefined ? ` aria-expanded="${exp}"` : ''}>FAQ</button>
      <div id="p"><p>Unique FAQ answer text.</p></div></div>`),
  ];
  for (const mk of layouts) {
    const g = await gate({ default: mk(false), opened: D(mk(true), '#m', '#p') });
    assert.equal(g.pass, false, 'no open signal must fail');
    const why = (g.scopes[0].widths.results.find(x => x.width === 320)?.declarations || []).flatMap(d => d.why || []);
    assert.ok(why.some(w => /does not show it is open/i.test(w)), why);
  }
  const mk = layouts[0];
  assert.equal((await gate({ default: mk(false, 'false'), opened: D(mk(true, 'true'), '#m', '#p') })).pass, true);
}));

test('R33-M-02: declared non-flex and localized carousel transitions remain eligible', { skip }, async () => withBrowser(async ({ open }) => {
  const track = (display, tx, roleDesc) => {
    const slideStyle = 'width:200px;height:80px';
    const trackStyle = display === 'float'
      ? `width:400px;height:80px;transform:translateX(${tx}px)`
      : display === 'positioned'
        ? `position:relative;width:400px;height:80px;transform:translateX(${tx}px)`
      : display === 'inline-grid'
        ? `display:inline-grid;grid-template-columns:200px 200px;width:400px;height:80px;transform:translateX(${tx}px)`
        : `display:${display};width:400px;height:80px;transform:translateX(${tx}px);white-space:nowrap`;
    const child = display === 'float'
      ? `<div id="a" style="${slideStyle};float:left"><p>Slide A unique</p></div><div id="b" style="${slideStyle};float:left"><p>Slide B unique</p></div>`
      : display === 'positioned'
        ? `<div id="a" style="${slideStyle};position:absolute;left:0;top:0"><p>Slide A unique</p></div><div id="b" style="${slideStyle};position:absolute;left:200px;top:0"><p>Slide B unique</p></div>`
        : display === 'inline-grid'
        ? `<div id="a" style="${slideStyle}"><p>Slide A unique</p></div><div id="b" style="${slideStyle}"><p>Slide B unique</p></div>`
        : `<div id="a" style="${slideStyle};${display.includes('inline') ? 'display:inline-block;' : ''}"><p>Slide A unique</p></div><div id="b" style="${slideStyle};${display.includes('inline') ? 'display:inline-block;' : ''}"><p>Slide B unique</p></div>`;
    const role = roleDesc ? ` aria-roledescription="${roleDesc}"` : '';
    return P(`<div style="width:200px;overflow:hidden"${role}><div style="${trackStyle}">${child}</div></div>
      <button id="prev">Previous</button><button id="next">Next</button>`);
  };
  for (const disp of ['inline-block', 'float', 'positioned', 'inline-grid']) {
    const g = await scopesOf(open, [
      { state: 'default', html: track(disp, 0) },
      { state: 'slide-2', html: track(disp, -200), opener: '#next', reveals: '#b' },
    ]);
    assert.equal(g.pass, true, disp);
  }
  // localized role description
  const ar = (tx) => W(`<div style="width:200px;overflow:hidden;direction:ltr" aria-roledescription="كاروسيل"><div style="display:flex;width:400px;transform:translateX(${tx}px)">
    <div id="a" style="flex:0 0 200px"><p>شريحة أ</p></div><div id="b" style="flex:0 0 200px"><p>شريحة ب</p></div></div></div>
    <button id="next">التالي</button>`, '', 'rtl');
  assert.equal((await scopesOf(open, [
    { state: 'default', html: ar(0) },
    { state: 'slide-2', html: ar(-200), opener: '#next', reveals: '#b' },
  ], 'rtl')).pass, true);
  // block display:none/block
  const block = (which) => P(`<div aria-roledescription="carousel" style="width:200px">
    <div id="a" style="display:${which === 'a' ? 'block' : 'none'}"><p>Block A unique</p></div>
    <div id="b" style="display:${which === 'b' ? 'block' : 'none'}"><p>Block B unique</p></div>
    <button id="next">Next</button></div>`);
  const gb = await scopesOf(open, [
    { state: 'default', html: block('a') },
    { state: 'slide-2', html: block('b'), opener: '#next', reveals: '#b' },
  ]);
  const decl = gb.scopes[0].widths.results.find(x => x.width === 320)?.declarations?.[0];
  assert.equal(decl?.valid, true, 'block-track declaration valid');
  // negative: expanded false on target
  const neg = (tx, exp) => P(`<div style="width:200px;overflow:hidden"><div style="display:flex;width:400px;transform:translateX(${tx}px)">
    <div id="a" style="flex:0 0 200px"><p>Neg A</p></div><div id="b" style="flex:0 0 200px"><p>Neg B</p></div></div></div>
    <button id="next"${exp !== undefined ? ` aria-expanded="${exp}"` : ''}>Next</button>`);
  assert.equal((await scopesOf(open, [
    { state: 'default', html: neg(0, 'false') },
    { state: 'slide-2', html: neg(-200, 'false'), opener: '#next', reveals: '#b' },
  ])).pass, false);
}));

test('R33-M-03: carousel information panel does not inherit the slide shortcut', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  // Slides fit without clipping; aside is the auxiliary region under the carousel root
  const shell = (infoCss, exp) => P(`<div aria-roledescription="carousel">
    <div class="slides"><div id="a"><p>Slide A</p></div><div id="b" style="display:none"><p>Slide B</p></div></div>
    <aside id="info"><a href="/info">Information details</a></aside>
  </div>
  <button id="i" aria-controls="info"${exp !== undefined ? ` aria-expanded="${exp}"` : ''}>Show information</button>`, infoCss);
  assert.equal((await gate({
    default: shell('@media(max-width:600px){#info{display:none}}'),
    'info-open': D(shell(''), '#i', '#info'),
  })).pass, false);
  assert.equal((await gate({
    default: shell('@media(max-width:600px){#info{display:none}}', 'false'),
    'info-open': D(shell('', 'true'), '#i', '#info'),
  })).pass, true);
}));

test('R33-M-04: mobile teaser preserves a desktop-baseline reveal', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const clamp = `#bio{width:200px;height:0;overflow:hidden}#bio p{margin:0;line-height:24px}@media(max-width:600px){#bio{height:24px}}`;
  const def = P(`<div id="bio"><p>Short introduction.</p><p>Remaining account details.</p></div><button id="m" aria-controls="bio" aria-expanded="false">Read more</button>`, clamp);
  const exp = P(`<div id="bio"><p>Short introduction.</p><p>Remaining account details.</p></div><button id="m" aria-controls="bio" aria-expanded="true">Read more</button>`);
  assert.equal((await gate({ default: def, expanded: D(exp, '#m', '#bio') })).pass, true);
  const script = `const apply=()=>{const m=document.getElementById('m'); if(matchMedia('(max-width:600px)').matches) m.disabled=true; else m.disabled=false;}; apply(); addEventListener('resize', apply);`;
  const badDef = W(`<style>${clamp}</style><div id="bio"><p>Short introduction.</p><p>Remaining account details.</p></div><button id="m" aria-controls="bio" aria-expanded="false">Read more</button>`, script);
  assert.equal((await scopesOf(open, [
    { state: 'default', html: badDef },
    { state: 'expanded', html: exp, opener: '#m', reveals: '#bio' },
  ])).pass, false);
}));

// M-05 docs assertions must run without Chrome
test('R33-M-05: popup guidance documents the expansion-only veto', async () => {
  const untested = flat(readFileSync(join(release, 'UNTESTED.md'), 'utf8'));
  assert.ok(!/aria-expanded\/pressed\/selected="false" blocks|expanded\/pressed\/selected.*blocks the haspopup|pressed\/selected="false" blocks/i.test(untested)
    && !/explicit aria-expanded\/pressed\/selected="false" blocks the haspopup shortcut/i.test(untested), 'obsolete combined veto must be absent');
  assert.ok(/only explicit aria-expanded="false" blocks/i.test(untested), 'expansion-only rule stated');
  if (skip) return;
  await withBrowser(async ({ open }) => {
    const gate = gateOf(open);
    const css = `@media(max-width:600px){#p{display:none}}`;
    const page = (shown) => P(`<button id="m" aria-haspopup="menu" aria-selected="false" aria-controls="p">Menu</button><nav id="p"${shown ? '' : '' }><a href="/about">About</a></nav>`, shown ? '' : css);
    // default: p visible at 1440, hidden at 320
    const def = P(`<button id="m" aria-haspopup="menu" aria-selected="false" aria-controls="p">Menu</button><nav id="p"><a href="/about">About</a></nav>`, css);
    const openMenu = P(`<button id="m" aria-haspopup="menu" aria-selected="false" aria-controls="p">Menu</button><nav id="p"><a href="/about">About</a></nav>`);
    assert.equal((await gate({ default: def, 'menu-open': D(openMenu, '#m', '#p') })).pass, true);
    const stuck = P(`<button id="m" aria-haspopup="menu" aria-selected="false" aria-controls="p" aria-expanded="false">Menu</button><nav id="p"><a href="/about">About</a></nav>`);
    assert.equal((await gate({ default: def, 'menu-open': D(stuck, '#m', '#p') })).pass, false);
  });
});

test('R33-M-06: equivalent default captures preserve independent offscreen failures', { skip }, async () => withBrowser(async ({ open }) => {
  const clean = P(`<h2>Heading</h2><p>Fitting paragraph copy.</p>`);
  const dirty = P(`<h2>Heading</h2><p>Fitting paragraph copy.</p><div style="position:absolute;left:-200px;top:200px;width:100px">Hidden</div>`);
  const scopes = [
    { scope: { screen: 'home', state: 'default', lang: 'en' }, widths: await ws.screenWidths((await open(clean)).main, [1440], null, 900, []), declaration: null },
    { scope: { screen: 'home', state: 'default', lang: 'en' }, widths: await ws.screenWidths((await open(dirty)).main, [1440], null, 900, []), declaration: null },
  ];
  const r320 = scopes[1].widths.results.find(x => x.width === 320) || scopes[1].widths.results.find(x => x.width === 1440);
  // offscreen is recorded on the dirty capture
  const anyOff = scopes[1].widths.results.some(r => (r.offscreenLeft || []).length > 0) || (scopes[1].widths.results[0]?.offscreenLeft || []).length > 0;
  // Inspect raw inspect via results — passExceptReveal
  const dirty1440 = scopes[1].widths.results.find(x => x.width === 1440);
  assert.ok(dirty1440.passExceptReveal === false || (dirty1440.offscreenLeft || []).length > 0 || scopes[1].widths.pass === false
    || scopes[1].widths.results.some(r => r.passExceptReveal === false), 'dirty has independent failure');
  const r = ws.resolveReveals(scopes);
  assert.equal(r.pass && scopes.every(s => s.widths.pass), false);
  assert.equal(scopes[1].widths.pass, false);
}));

test('R33-M-07: carousel word in a FAQ label does not exempt a vertical disclosure', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const faq = (h) => P(`<div style="width:200px;height:${h};overflow:hidden" aria-label="Questions about the carousel"><p style="margin:0">Shipping answer.</p></div>`);
  assert.equal((await gate({ default: faq('0'), expanded: faq('auto') })).pass, false);
  const slide = i => P(`<div style="width:200px;overflow:hidden"><div style="display:flex;width:400px;transform:translateX(-${i * 200}px)"><div style="flex:0 0 200px"><p>One</p></div><div style="flex:0 0 200px"><p>Two</p></div></div></div>`);
  assert.equal((await gate({ default: slide(0), 'slide-2': slide(1) })).pass, true);
}));

test('R33-M-08: a single pointer-transparent native modal still inerts its background', { skip }, async () => withBrowser(async ({ open }) => {
  const base = '<h2>Stable heading</h2><p>Stable paragraph copy.</p>';
  const def = W(base);
  const sheet = W(`${base}<a class="wide" href="/about">About</a>
    <dialog id="sheet" style="position:fixed;inset:0;margin:0;border:0;padding:0;max-width:none;max-height:none;width:100vw;height:100vh;background:transparent;pointer-events:none">
      <div style="position:absolute;left:0;right:0;bottom:0;height:30vh;background:#fff;pointer-events:auto;color:#000">
        <h2>Sheet</h2><button class="ok">Continue</button>
      </div>
    </dialog>
    <style>@media(max-width:600px){.wide{display:none}}</style>`,
    `document.getElementById('sheet').showModal();`);
  const g = await scopesOf(open, [
    { state: 'default', html: def },
    { state: 'sheet-open', html: sheet },
  ]);
  assert.equal(g.pass, true);
  const items1440 = g.scopes[1].widths.ledgerByWidth[1440]?.items?.map(i => i.print) || [];
  assert.ok(!items1440.some(p => /About/i.test(p)), items1440);
  const { main } = await open(sheet);
  const band = await main.evaluate(vis.visibilityBand, { mode: 'measure', topLayer: true });
  const about = (band.targets || []).filter(t => /About/i.test(t.text || ''));
  assert.ok(about.length && about.every(t => t.status === 'inert'), JSON.stringify(about));
}));
