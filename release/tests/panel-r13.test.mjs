// R13 (panel round 13): regressions for the browser items. Each real-Chrome case was first run against the f9a8d7e
// sources and reached its assertion there (test-results/r13/repro-before.log); see reviews/MIMAR-R13-changes-*.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rawGlass, designProbe } from '../tools/design-probe.mjs';
import { screenWidths } from '../tools/width-screen.mjs';
import { spacingProbe } from '../tools/spacing-scale.mjs';
import { rafCounterInit, rafLoopFrom, nativeCheck, contentProbe } from '../tools/integrity.mjs';

const release = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const deps = process.env.FANNAN_DEPS || resolve(release, '..', 'runtime-deps');
const chrome = process.env.FANNAN_TEST_CHROME || '/usr/bin/google-chrome';
const haveChrome = existsSync(join(deps, 'node_modules/playwright-core')) && existsSync(chrome);
const skip = !haveChrome && 'test-only deps or local Chrome absent';
const withBrowser = async fn => {
  const { chromium } = createRequire(join(deps, 'node_modules/'))('playwright-core');
  const browser = await chromium.launch({ executablePath: chrome, args: ['--headless=new'] });
  try { await fn(browser); } finally { await browser.close(); }
};
const screen = async (page, html, width, body = 'margin:0') => {
  await page.setContent(`<html lang="en"><body style="${body}"><main><h1>Page</h1>${html}</main></body></html>`); await page.waitForTimeout(50);
  return (await screenWidths(page, [1440], { lang: 'en', dir: 'ltr' })).results.find(r => r.width === width);
};

test('R13 N08/N09: JavaScript escapes are decoded and comment markers inside strings cannot hide glass (cheap defence)', () => {
  for (const t of ["el.style.setProperty('-webkit-backdrop\\x2dfilter','blur(4px)')", "el.style.webkitBackdrop\\u0046ilter='blur(4px)'", "el.style.setProperty('backdrop\\u{2d}filter','blur(4px)')", 'const a="/*"; el.style.webkitBackdropFilter="blur(4px)"; const b="*/";']) assert.equal(rawGlass(t, 'script'), true, t);
  assert.equal(rawGlass('const css = ".a{backdrop\\x2dfilter: none}";', 'script'), false, 'an explicit none stays allowed after decoding');
  assert.equal(rawGlass('/* .a{-webkit-backdrop-filter: blur(6px)} */ .b{color:red}'), false, 'a real CSS comment is still stripped');
});

test('R13 N07: data: and blob: stylesheets are refused and unreadable unserved ones fail, on the page and on every state', () => {
  const source = readFileSync(join(release, 'tools/pre-handoff-check.mjs'), 'utf8');
  assert.match(source, /refused = list\.filter\(x => \/\^\(data\|blob\):\/i\.test\(x\.href \|\| ''\)\)/);
  assert.match(source, /unscanned = list\.filter\(x => !x\.readable && !refused\.includes\(x\) && !\(x\.href && served\.has\(x\.href\)\)\)/);
  assert.match(source, /&& stylesheets\.pass && integrity\.pass/);
  assert.match(source, /stylesheetsUnscanned: sheetsCheck\(d\)\.refused\.length \+ sheetsCheck\(d\)\.unscanned\.length/);
});

test('R13 N04/q1: every nested-document element is a frame for the probes and the width screen', () => {
  for (const f of ['tools/design-probe.mjs', 'tools/width-screen.mjs']) assert.match(readFileSync(join(release, f), 'utf8'), /'iframe, frame, object, embed, fencedframe, portal'/, f);
  assert.doesNotMatch(readFileSync(join(release, 'tools/handoff-contract.mjs'), 'utf8'), /frameExceptions/, 'q1: no frame exceptions');
});

test('R13 N01/N02/N03/N04/N15/N16: real Chrome: the width screen sees body-clipped, zero-box, shadow-clipped and nested-scope content (test-only)', { skip }, async () => withBrowser(async browser => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  for (const w of [1440, 320]) {
    // N01: body overflow-x:hidden propagates to the viewport; content pushed past the left edge is off-screen.
    for (const p of ['<p style="margin-left:-400px">Pushed left text</p>', '<p style="transform:translateX(-400px)">Translated text</p>']) {
      const r = await screen(page, p, w, 'margin:0;overflow-x:hidden');
      assert.deepEqual([r.pass, r.offscreenLeft.length], [false, 1], `N01 @${w} ${p}`);
    }
  }
  // N02: zero-size and display:contents boxes still hold text.
  const contents = await screen(page, `<div style="overflow-x:auto"><span style="display:contents;white-space:nowrap">${'contents text '.repeat(60)}</span></div>`, 320);
  assert.deepEqual([contents.pass, contents.scrolledText.length], [false, 1], 'N02 display:contents');
  const zero = await screen(page, `<div style="overflow-x:auto"><span style="display:inline-block;width:0;height:0;white-space:nowrap">${'zero box text '.repeat(60)}</span></div>`, 320);
  assert.deepEqual([zero.pass, zero.scrolledText.length], [false, 1], 'N02 0x0 inline-block');
  const flat = await screen(page, '<h2 style="height:0;margin:0 0 0 -400px">Zero height heading</h2>', 1440);
  assert.deepEqual([flat.pass, flat.offscreenLeft.length], [false, 1], 'N02 height:0 heading');
  const sr = await screen(page, '<span style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Skip to content</span>', 320);
  assert.equal(sr.pass, true, 'N02: a real screen-reader-only label is still exempt');
  // N03: open shadow text clipped by its host's left edge.
  const shadow = await screen(page, `<div id="h" style="overflow:hidden;width:300px;margin-left:100px"></div><script>document.getElementById('h').attachShadow({mode:'open'}).innerHTML='<p style="margin-left:-200px;white-space:nowrap">Shadow text cut off at the left</p>';</script>`, 1440);
  assert.deepEqual([shadow.pass, shadow.clipped.length], [false, 1], 'N03');
  // N04: object/embed are nested scopes the screen cannot enter.
  const obj = await screen(page, '<object type="text/html" data="data:text/html,<p>x</p>" width="200" height="100"></object>', 320);
  assert.deepEqual([obj.pass, obj.unscannedScopes.length], [false, 1], 'N04 object');
  await page.setContent('<main><h1>x</h1><object type="text/html" data="data:text/html,<p>x</p>" width="200" height="100"></object><embed src="data:text/html,<p>y</p>" width="200" height="100"></main>'); await page.waitForTimeout(200);
  assert.equal((await page.evaluate(designProbe)).glassScopes.unscannedFrames.length, 2, 'N04: object and embed are counted as frames');
  // N15: one link in the first cell is not keyboard reach across a 340px table.
  const table = await screen(page, '<div style="overflow-x:auto;width:320px"><table id="t" style="width:340px;border-collapse:collapse"><tr><td style="padding:0"><a href="#a" style="display:inline-block;width:40px">link</a></td><td style="padding:0;text-align:right">far</td></tr></table></div>', 320);
  assert.deepEqual([table.pass, table.reflowCandidates.map(c => c.keyboard)], [false, [false]], 'N15');
  // N16: a closed shadow root is an unscanned scope.
  const closed = await screen(page, `<div id="c"></div><script>document.getElementById('c').attachShadow({mode:'closed'}).innerHTML='<div style="overflow-x:auto"><p style="width:900px">${'closed text '.repeat(20)}</p></div>';</script>`, 320);
  assert.deepEqual([closed.pass, closed.unscannedScopes.map(s => s.src)], [false, ['closed shadow root']], 'N16');
  const plain = await screen(page, '<p>Plain text</p>', 320);
  assert.equal(plain.pass, true, 'a plain page still passes');
}));

test('R13 N17: real Chrome: a page that patches Function.prototype.call cannot capture the native rAF; the patch is a tamper sign (test-only)', { skip }, async () => withBrowser(async browser => {
  const ctx = await browser.newContext(); await ctx.addInitScript(rafCounterInit); const pg = await ctx.newPage();
  await pg.setContent(`<main><h1>x</h1></main><script>let nat; const oc = Function.prototype.call; Function.prototype.call = function (...a) { nat = this; return oc.apply(this, a); }; requestAnimationFrame(() => {}); Function.prototype.call = oc; window.__captured = typeof nat === 'function'; const loop = () => nat.apply(window, [loop]); if (nat) loop();</script>`);
  assert.equal(await pg.evaluate(() => window.__captured), false, 'the wrapper never looks up Function.prototype.call');
  const loopPage = await ctx.newPage();
  await loopPage.setContent('<main><h1>x</h1></main><script>const loop = () => requestAnimationFrame(loop); loop();</script>');
  const a = await loopPage.evaluate(() => window.__raf); await loopPage.waitForTimeout(400); const b = await loopPage.evaluate(() => window.__raf);
  assert.equal(rafLoopFrom(a, b), true, 'an ordinary loop is still counted');
  const patched = await ctx.newPage();
  await patched.setContent('<main><h1>x</h1></main><script>Function.prototype.call = function (...a) { return Reflect.apply(this, a[0], a.slice(1)); };</script>');
  assert.deepEqual(await patched.evaluate(nativeCheck), ['Function.prototype.call']);
}));

test('R13 N20/N13: real Chrome: spacing, placeholders, h1 and the content record include open shadow roots (test-only)', { skip }, async () => withBrowser(async browser => {
  const page = await browser.newPage();
  await page.setContent(`<main><h1>x</h1><p data-copy-slot="lede">Hello</p></main><div id="s"></div><script>document.getElementById('s').attachShadow({mode:'open'}).innerHTML='<p style="padding-left:17px">lorem ipsum shadow</p><h1>Second</h1>';</script>`);
  const sp = await page.evaluate(spacingProbe, ['8px', '16px', '24px']), d = await page.evaluate(designProbe), c = await page.evaluate(contentProbe);
  assert.ok(sp.spacingOffScale.some(v => v.property === 'paddingLeft' && v.value === '17px'), 'shadow spacing is screened');
  assert.deepEqual([d.placeholders, d.h1], [true, 2], 'shadow placeholder text and a second h1 are counted');
  assert.deepEqual([c.slots, c.headings], [[['lede', 'Hello']], [[1, 'x'], [1, 'Second']]], 'N13: slot and heading text, shadow included');
}));
