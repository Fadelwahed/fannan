// R11 panel D1 (decisions C, T4), R12 M06-M08/M13/M17/M21: probe-integrity cross-checks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compareIntegrity, nativeCheck, contentProbe, contrastProbe, rafCounterInit, rafLoopFrom, VECTOR, INTEGRITY_CHECKS } from '../tools/integrity.mjs';
import { designProbe } from '../tools/design-probe.mjs';

const release = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const deps = process.env.FANNAN_DEPS || resolve(release, '..', 'runtime-deps');
const chrome = process.env.FANNAN_TEST_CHROME || '/usr/bin/google-chrome';
const haveChrome = existsSync(join(deps, 'node_modules/playwright-core')) && existsSync(chrome);

const vector = { glass: 0, h1: 1, placeholders: false, centered: 0, typeSizes: 3, heroGradient: false, purpleBlue: false, iconRows: 0, accent: '#123456', spacingOffScale: 0, horizontalOverflow: false, clipped: 0, offscreenLeft: 0, unreachable: 0, scrolledText: 0, unmeasured: 0, reflowFail: false, contrastFailures: 0 };
const content = { slots: ['hero', 'lede'], h1: 1, lang: 'en', dir: 'ltr' };
const run = (v = {}, c = {}) => ({ vector: { ...vector, ...v }, content: { ...content, ...c } });
const clean = run();
const scope = { screen: 'home', state: 'default', lang: 'en' };
const roles = { settings: { roles: { qaGate: 'Amin', approver: 'Fadel' } } };

test('R11 panel C: identical worlds and JS-off pass; tampering and unexplained JS-off regressions fail as integrity mismatch', () => {
  assert.deepEqual([compareIntegrity({ probe: clean, page: clean, jsOff: clean, scope }).status, compareIntegrity({ probe: clean, page: clean, jsOff: clean, scope }).pass], ['PASS', true]);
  const tamper = compareIntegrity({ probe: run({ glass: 1 }), page: clean, jsOff: run({ glass: 1 }), scope });
  assert.equal(tamper.status, 'integrity mismatch'); assert.match(tamper.mismatches[0].detail, /page world 0, probe world 1/);
  const native = compareIntegrity({ probe: clean, page: clean, jsOff: clean, tamperSigns: ['window.getComputedStyle'], scope });
  assert.deepEqual([native.pass, native.mismatches[0].check], [false, 'native']);
  const jsGlass = compareIntegrity({ probe: clean, page: clean, jsOff: run({ glass: 2 }), scope });
  assert.deepEqual([jsGlass.status, jsGlass.mismatches[0].check, jsGlass.mismatches[0].source], ['integrity mismatch', 'glass', 'js-off'], 'scripts hide glass that is there without them');
  const post = compareIntegrity({ probe: run({ glass: 1 }), page: run({ glass: 1 }), jsOff: clean, scope });
  assert.deepEqual([post.pass, post.postScriptDifferences.length], [true, 1], 'scripted page worse: recorded here, failed by the main glass check');
});

test('R12 M06/M17: every hard-fail field is cross-checked between worlds and with JavaScript off, not only glass and reflow', () => {
  assert.deepEqual(INTEGRITY_CHECKS, [...Object.keys(VECTOR), 'content']);
  for (const k of ['h1', 'placeholders', 'centered', 'typeSizes', 'heroGradient', 'purpleBlue', 'iconRows', 'accent', 'spacingOffScale', 'horizontalOverflow', 'clipped', 'offscreenLeft', 'unreachable', 'scrolledText', 'unmeasured', 'reflowFail', 'contrastFailures']) {
    const worse = VECTOR[k] === 'count' ? vector[k] + 1 : VECTOR[k] === 'flag' ? true : '#ff00ff';
    const between = compareIntegrity({ probe: run({ [k]: worse }), page: clean, jsOff: run({ [k]: worse }), scope });
    assert.deepEqual([between.status, between.mismatches[0]?.check], ['integrity mismatch', k], `${k}: page world vs probe world`);
    const off = compareIntegrity({ probe: clean, page: clean, jsOff: run({ [k]: worse }), scope });
    assert.deepEqual([off.status, off.mismatches[0]?.check, off.mismatches[0]?.source], ['integrity mismatch', k, 'js-off'], `${k}: worse with JavaScript off`);
  }
});

test('R12 M08: non-equivalent JavaScript-off content and missing or malformed vectors are INCOMPLETE, never PASS', () => {
  for (const c of [{ slots: ['hero'] }, { h1: 0 }, { lang: 'ar' }, { dir: 'rtl' }]) {
    const r = compareIntegrity({ probe: clean, page: clean, jsOff: run({}, c), scope });
    assert.deepEqual([r.status, r.pass, r.mismatches[0].check], ['INCOMPLETE', false, 'content'], `JS-off content ${JSON.stringify(c)}`);
  }
  assert.equal(compareIntegrity({ probe: clean, page: run({}, { slots: ['hero'] }), jsOff: clean, scope }).status, 'integrity mismatch', 'worlds see different content');
  for (const bad of [null, { vector: null, content }, { vector: { ...vector, glass: '0' }, content }, { vector: { ...vector, reflowFail: undefined }, content }, { vector, content: null }, { vector: { glass: 0, reflowPass: true, scrolledText: 0 }, content }]) {
    for (const which of ['probe', 'page', 'jsOff']) {
      const r = compareIntegrity({ probe: clean, page: clean, jsOff: clean, [which]: bad, scope });
      assert.deepEqual([r.status, r.pass], ['INCOMPLETE', false], `${which} ${JSON.stringify(bad)?.slice(0, 60)}`);
    }
  }
  assert.deepEqual([compareIntegrity({ probe: clean, page: clean, jsOff: clean, tamperSigns: null, scope }).status], ['INCOMPLETE'], 'a native check that could not run is incomplete');
});

test('R12 M21: a JavaScript-off difference is excused only by an entry with the check, this scope, a reason and a qaGate or approver reviewer', () => {
  const off = run({ reflowFail: true });
  const entry = { ...scope, check: 'reflowFail', reason: 'the menu collapses only once its script loads', reviewer: 'Amin' };
  const ok = compareIntegrity({ probe: clean, page: clean, jsOff: off, handoff: { ...roles, jsOffDifferences: [entry] }, scope });
  assert.deepEqual([ok.pass, ok.expectedDifferences.map(d => [d.check, d.reason, d.reviewer])], [true, [['reflowFail', entry.reason, 'Amin']]]);
  for (const bad of [{ ...entry, reviewer: undefined }, { ...entry, reviewer: 'Writer' }, { ...entry, reason: ' ' }, { ...entry, state: 'error' }, { ...entry, lang: 'ar' }, { ...entry, screen: undefined }, { ...entry, check: 'glass' }]) {
    assert.equal(compareIntegrity({ probe: clean, page: clean, jsOff: off, handoff: { ...roles, jsOffDifferences: [bad] }, scope }).pass, false, `entry ${JSON.stringify(bad)} excuses nothing`);
  }
  const contentOk = compareIntegrity({ probe: clean, page: clean, jsOff: run({}, { slots: ['hero'] }), handoff: { ...roles, jsOffDifferences: [{ ...scope, check: 'content', reason: 'lede is written by script', reviewer: 'Fadel' }] }, scope });
  assert.equal(contentOk.status, 'PASS', 'a reviewed content difference is recorded');
});

test('R12 M13: a non-finite or decreasing rAF reading counts as a loop', () => {
  assert.deepEqual([rafLoopFrom(3, 5), rafLoopFrom(3, 20), rafLoopFrom(5, 3), rafLoopFrom(undefined, 3), rafLoopFrom(0, NaN), rafLoopFrom(0, Infinity), rafLoopFrom('1', '2')], [false, true, true, true, true, true, true]);
});

test('R11 panel C, R12 M06-M08/M13: the checker cross-checks the full vector on the positional page and on every declared state', () => {
  const source = readFileSync(join(release, 'tools/pre-handoff-check.mjs'), 'utf8');
  assert.match(source, /import \{ nativeCheck, compareIntegrity, contrastProbe, contentProbe, rafCounterInit, rafLoopFrom \} from '\.\/integrity\.mjs';/);
  assert.match(source, /serviceWorkers: 'block', javaScriptEnabled \}\);/);
  assert.match(source, /await contextFor\(false\)/);
  assert.match(source, /await jsOffPage\.waitForLoadState\('load'\);/);
  assert.match(source, /return compareIntegrity\(\{ probe, page: pageWorld, jsOff, tamperSigns, handoff, scope \}\);/);
  assert.match(source, /catch \(e\) \{ return \{ scope, status: 'INCOMPLETE', pass: false/);
  assert.match(source, /ev\.checks\.integrity = await integrityFor\(page, pageScope\);/);
  assert.match(source, /const integrity = await integrityFor\(st\.page, scopeOf\(st\)\);/);
  assert.match(source, /&& frames\.pass && integrity\.pass && stateResult\.focusFailures/);
  assert.match(source, /if \(!ev\.checks\.integrity\.pass\) fail = true;/);
  for (const k of Object.keys(VECTOR)) assert.match(source, new RegExp(`\\b${k}: `), `the measured vector carries ${k}`);
  assert.match(source, /await rm\.addInitScript\(rafCounterInit\);/);
  assert.match(source, /const rafLoop = rafLoopFrom\(raf1, raf2\);/);
});

test('R11 panel C: real Chrome: nativeCheck flags patched functions; the JS-off isolated pass sees glass a script removes (test-only)', { skip: !haveChrome && 'test-only deps or local Chrome absent' }, async () => {
  const { chromium } = createRequire(join(deps, 'node_modules/'))('playwright-core');
  const { isolatedPage } = await import('../tools/probe-world.mjs');
  const browser = await chromium.launch({ executablePath: chrome, args: ['--headless=new'] });
  try {
    const page = await browser.newPage();
    await page.setContent('<main><h1>x</h1></main>');
    assert.deepEqual(await page.evaluate(nativeCheck), [], 'a plain page has native probe functions');
    await page.setContent('<main><h1>x</h1></main><script>const g = window.getComputedStyle; window.getComputedStyle = (e, p) => g(e, p); Element.prototype.closest = function () { return null; };</script>');
    assert.deepEqual(await page.evaluate(nativeCheck), ['window.getComputedStyle', 'Element.prototype.closest']);
    const html = '<main><h1>x</h1><p class="g" style="backdrop-filter:blur(2px)" data-copy-slot="lede">g</p></main><script>const g = document.querySelector(".g"); g.removeAttribute("style"); g.removeAttribute("data-copy-slot");</script>';
    const on = await isolatedPage(await browser.newPage()); await on.setContent(html);
    const offCtx = await browser.newContext({ javaScriptEnabled: false });
    const off = await isolatedPage(await offCtx.newPage()); await off.setContent(html);
    const [gOn, gOff] = [(await on.evaluate(designProbe)).glass, (await off.evaluate(designProbe)).glass];
    assert.ok(gOff > gOn, `JS off shows more glass (${gOff} > ${gOn})`);
    const [cOn, cOff] = [await on.evaluate(contentProbe), await off.evaluate(contentProbe)];
    assert.deepEqual([cOn.slots, cOff.slots], [[], ['lede']], 'the content probe sees the slot a script removes');
    assert.equal(compareIntegrity({ probe: run({ glass: gOn }, cOn), page: run({ glass: gOn }, cOn), jsOff: run({ glass: gOff }, cOff), scope }).status, 'INCOMPLETE', 'JS-off content differs, so its metrics prove nothing');
    assert.equal(compareIntegrity({ probe: run({ glass: gOn }), page: run({ glass: gOn }), jsOff: run({ glass: gOff }), scope }).status, 'integrity mismatch');
    await page.setContent('<main><h1>x</h1><p style="color:#777;background:#888">low</p><p style="color:#000;background:#fff">ok</p></main>');
    const ct = await page.evaluate(contrastProbe);
    assert.equal(ct.contrastFailures, 1, 'the contrast diagnostic counts low-contrast text with JavaScript off too');
  } finally { await browser.close(); }
});

test('R12 M13: real Chrome: a page that resets __raf or replaces requestAnimationFrame cannot hide a rAF loop (test-only)', { skip: !haveChrome && 'test-only deps or local Chrome absent' }, async () => {
  const { chromium } = createRequire(join(deps, 'node_modules/'))('playwright-core');
  const browser = await chromium.launch({ executablePath: chrome, args: ['--headless=new'] });
  try {
    const ctx = await browser.newContext(); await ctx.addInitScript(rafCounterInit);
    const pg = await ctx.newPage();
    await pg.setContent(`<main><h1>x</h1></main><script>
      try { window.__raf = 0; } catch {} try { Object.defineProperty(window, '__raf', { value: 0 }); } catch {}
      const native = window.requestAnimationFrame; try { window.requestAnimationFrame = cb => setTimeout(cb, 16); } catch {}
      try { Object.defineProperty(window, 'requestAnimationFrame', { value: cb => setTimeout(cb, 16) }); } catch {}
      const loop = () => { window.requestAnimationFrame(loop); }; loop();
      setInterval(() => { try { window.__raf = 0; } catch {} }, 5);
    </script>`);
    const r1 = await pg.evaluate(() => window.__raf); await pg.waitForTimeout(700); const r2 = await pg.evaluate(() => window.__raf);
    assert.ok(Number.isFinite(r1) && r2 - r1 > 10, `the loop is still counted (${r1} -> ${r2})`);
    assert.equal(rafLoopFrom(r1, r2), true);
  } finally { await browser.close(); }
});
