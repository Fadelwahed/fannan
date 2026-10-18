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

const widths = (n = 0) => ({ 1440: 0, 320: n });
const vector = { glass: 0, h1: 1, placeholders: false, centered: 0, typeSizes: 3, heroGradient: false, purpleBlue: false, iconRows: 0, accent: '#123456', accentRatio: 0.05, maxViewportAccent: 0.1, filler: false, ruleOfThree: false, frames: 0, stylesheetsUnscanned: 0, spacingOffScale: 0, horizontalOverflow: widths(), clipped: widths(), offscreenLeft: widths(), unreachable: widths(), scrolledText: widths(), unmeasured: widths(), unscannedScopes: widths(), reflowFail: false, contrastFailures: 0, contrastUnknown: 0, contrastChecked: 5, contrastEffects: 0 };
const content = { slots: [['hero', 'Welcome home'], ['lede', 'Plans that fit']], headings: [[1, 'Welcome home']], h1: 1, lang: 'en', dir: 'ltr' };
const run = (v = {}, c = {}) => ({ vector: { ...vector, ...v }, content: { ...content, ...c } });
const clean = run();
const scope = { screen: 'home', state: 'default', lang: 'en' };
const roles = { settings: { roles: { qaGate: 'Amin', approver: 'Fadel' } } };
const cmp = a => compareIntegrity({ tamperSigns: [], scope, ...a }); // R13 N19: tamperSigns is required, so tests pass []
const worse = k => ({ count: vector[k] + 1, flag: true, text: '#ff00ff', ratio: (vector[k] ?? 0) + 0.5, widths: widths(1) })[VECTOR[k]];

test('R11 panel C: identical worlds and JS-off pass; tampering and unexplained JS-off regressions fail as integrity mismatch', () => {
  assert.deepEqual([cmp({ probe: clean, page: clean, jsOff: clean }).status, cmp({ probe: clean, page: clean, jsOff: clean }).pass], ['PASS', true]);
  const tamper = cmp({ probe: run({ glass: 1 }), page: clean, jsOff: run({ glass: 1 }) });
  assert.equal(tamper.status, 'integrity mismatch'); assert.match(tamper.mismatches[0].detail, /page world 0, probe world 1/);
  const native = cmp({ probe: clean, page: clean, jsOff: clean, tamperSigns: ['window.getComputedStyle'] });
  assert.deepEqual([native.pass, native.mismatches[0].check], [false, 'native']);
  const jsGlass = cmp({ probe: clean, page: clean, jsOff: run({ glass: 2 }) });
  assert.deepEqual([jsGlass.status, jsGlass.mismatches[0].check, jsGlass.mismatches[0].source], ['integrity mismatch', 'glass', 'js-off'], 'scripts hide glass that is there without them');
  const post = cmp({ probe: run({ glass: 1 }), page: run({ glass: 1 }), jsOff: clean });
  assert.deepEqual([post.pass, post.postScriptDifferences.length], [true, 1], 'scripted page worse: recorded here, failed by the main glass check');
});

test('R12 M06/M17, R13 N11/N12: every hard-fail input is cross-checked between worlds and with JavaScript off', () => {
  assert.deepEqual(INTEGRITY_CHECKS, [...Object.keys(VECTOR), 'content']);
  for (const k of ['accentRatio', 'maxViewportAccent', 'filler', 'ruleOfThree', 'frames', 'stylesheetsUnscanned', 'unscannedScopes', 'contrastUnknown', 'contrastChecked']) assert.ok(k in VECTOR, `R13 N11/N12: the vector carries ${k}`);
  for (const k of Object.keys(VECTOR)) {
    const changed = VECTOR[k] === 'coverage' ? vector[k] + 1 : worse(k);
    const between = cmp({ probe: run({ [k]: changed }), page: clean, jsOff: run({ [k]: changed }) });
    assert.deepEqual([between.status, between.mismatches[0]?.check], ['integrity mismatch', k], `${k}: page world vs probe world`);
    if (VECTOR[k] === 'coverage') continue;
    const off = cmp({ probe: clean, page: clean, jsOff: run({ [k]: changed }) });
    assert.deepEqual([off.status, off.mismatches[0]?.check, off.mismatches[0]?.source], [k === 'contrastEffects' ? 'INCOMPLETE' : 'integrity mismatch', k, 'js-off'], `${k}: worse with JavaScript off (R16-GPT-01: unresolved compositing is INCOMPLETE)`);
  }
  // N11: per-width maps; the same total at different widths is a difference.
  const a = run({ horizontalOverflow: { 1440: 1, 320: 0 } }), b = run({ horizontalOverflow: { 1440: 0, 320: 1 } });
  assert.equal(cmp({ probe: a, page: b, jsOff: a }).status, 'integrity mismatch', 'a failure moved to another width between worlds');
  assert.equal(cmp({ probe: a, page: a, jsOff: b }).mismatches[0]?.check, 'horizontalOverflow', 'a failure moved to another width with JavaScript off');
  // N11: an accent ratio the JavaScript-off pass could not measure is worse, never ignored.
  assert.equal(cmp({ probe: clean, page: clean, jsOff: run({ accentRatio: null }) }).mismatches[0]?.check, 'accentRatio');
  // N12: zero contrast coverage with JavaScript off, while the scripted page had coverage, proves nothing.
  const blind = cmp({ probe: clean, page: clean, jsOff: run({ contrastChecked: 0, contrastFailures: 0 }) });
  assert.deepEqual([blind.status, blind.pass], ['INCOMPLETE', false]); assert.match(blind.incomplete.join(' '), /coverage is zero/);
  assert.equal(cmp({ probe: clean, page: clean, jsOff: run({ contrastUnknown: 3 }) }).mismatches[0]?.check, 'contrastUnknown');
});

test('R12 M08, R13 N13: non-equivalent JavaScript-off content (slot or heading text too) and missing or malformed vectors are INCOMPLETE, never PASS', () => {
  for (const c of [{ slots: [['hero', 'Welcome home']] }, { slots: [['hero', 'Welcome home'], ['lede', '']] }, { headings: [[1, 'Loading']] }, { headings: [] }, { h1: 0 }, { lang: 'ar' }, { dir: 'rtl' }]) {
    const r = cmp({ probe: clean, page: clean, jsOff: run({}, c) });
    assert.deepEqual([r.status, r.pass, r.mismatches[0]?.check], ['INCOMPLETE', false, 'content'], `JS-off content ${JSON.stringify(c)}`);
  }
  assert.equal(cmp({ probe: clean, page: run({}, { slots: [['hero', 'Welcome home']] }), jsOff: clean }).status, 'integrity mismatch', 'worlds see different content');
  assert.equal(cmp({ probe: clean, page: run({ glass: 1 }), jsOff: run({}, { h1: 0 }) }).status, 'integrity mismatch', 'a tampering sign outranks INCOMPLETE');
  const old = { slots: ['hero', 'lede'], h1: 1, lang: 'en', dir: 'ltr' };
  for (const bad of [null, { vector: null, content }, { vector: { ...vector, glass: '0' }, content }, { vector: { ...vector, reflowFail: undefined }, content }, { vector: { ...vector, horizontalOverflow: 0 }, content }, { vector: { ...vector, clipped: {} }, content }, { vector: { ...vector, accentRatio: NaN }, content }, { vector: { ...vector, contrastChecked: undefined }, content }, { vector, content: null }, { vector, content: old }, { vector: { glass: 0, reflowPass: true, scrolledText: 0 }, content }]) {
    for (const which of ['probe', 'page', 'jsOff']) {
      const r = cmp({ probe: clean, page: clean, jsOff: clean, [which]: bad });
      assert.deepEqual([r.status, r.pass], ['INCOMPLETE', false], `${which} ${JSON.stringify(bad)?.slice(0, 60)}`);
    }
  }
  for (const signs of [null, undefined, 'none', {}]) assert.equal(compareIntegrity({ probe: clean, page: clean, jsOff: clean, tamperSigns: signs, scope }).status, 'INCOMPLETE', `R13 N19: tamperSigns ${String(signs)} is incomplete`);
  assert.equal(compareIntegrity({ probe: clean, page: clean, jsOff: clean, scope }).status, 'INCOMPLETE', 'R13 N19: an omitted native check has no default');
});

test('R12 M21, R13 N14: a JavaScript-off difference is excused only by a reviewed entry; a content difference is never PASS', () => {
  const off = run({ reflowFail: true });
  const entry = { ...scope, check: 'reflowFail', reason: 'the menu collapses only once its script loads', reviewer: 'Amin' };
  const ok = cmp({ probe: clean, page: clean, jsOff: off, handoff: { ...roles, jsOffDifferences: [entry] } });
  assert.deepEqual([ok.pass, ok.expectedDifferences.map(d => [d.check, d.reason, d.reviewer])], [true, [['reflowFail', entry.reason, 'Amin']]]);
  for (const bad of [{ ...entry, reviewer: undefined }, { ...entry, reviewer: 'Writer' }, { ...entry, reason: ' ' }, { ...entry, state: 'error' }, { ...entry, lang: 'ar' }, { ...entry, screen: undefined }, { ...entry, check: 'glass' }]) {
    assert.equal(cmp({ probe: clean, page: clean, jsOff: off, handoff: { ...roles, jsOffDifferences: [bad] } }).pass, false, `entry ${JSON.stringify(bad)} excuses nothing`);
  }
  const waived = cmp({ probe: clean, page: clean, jsOff: run({ glass: 3 }, { slots: [['hero', 'Welcome home']] }), handoff: { ...roles, jsOffDifferences: [{ ...scope, check: 'content', reason: 'lede is written by script', reviewer: 'Fadel' }] } });
  assert.deepEqual([waived.status, waived.pass], ['INCOMPLETE', false], 'R13 N14: a reviewed content waiver is recorded but never PASS');
  assert.deepEqual(waived.expectedDifferences.map(d => [d.check, d.reviewer]), [['content', 'Fadel']], 'the waiver is kept as evidence');
  assert.match(waived.incomplete.join(' '), /reviewed waiver recorded/);
});

test('R12 M13: a non-finite or decreasing rAF reading counts as a loop', () => {
  assert.deepEqual([rafLoopFrom(3, 5), rafLoopFrom(3, 20), rafLoopFrom(5, 3), rafLoopFrom(undefined, 3), rafLoopFrom(0, NaN), rafLoopFrom(0, Infinity), rafLoopFrom('1', '2')], [false, true, true, true, true, true, true]);
});

test('R11 panel C, R12 M06-M08/M13: the checker cross-checks the full vector on the positional page and on every declared state', () => {
  const source = readFileSync(join(release, 'tools/pre-handoff-check.mjs'), 'utf8');
  assert.match(source, /import \{ nativeCheck, compareIntegrity, contrastProbe, contentProbe, rafCounterInit, rafLoopFrom, motionSnapshot, motionChanges \} from '\.\/integrity\.mjs';/);
  assert.match(source, /serviceWorkers: 'block', javaScriptEnabled \}\);/);
  assert.match(source, /await contextFor\(false\)/);
  assert.match(source, /await jsOffPage\.waitForLoadState\('load'\);/);
  assert.match(source, /return compareIntegrity\(\{ probe, page: pageWorld, jsOff, tamperSigns, handoff, scope \}\);/);
  assert.match(source, /catch \(e\) \{ return \{ scope, status: 'INCOMPLETE', pass: false/);
  assert.match(source, /ev\.checks\.integrity = await integrityFor\(page, pageScope\);/);
  assert.match(source, /const integrity = await integrityFor\(st\.page, scopeOf\(st\)\);/);
  assert.match(source, /&& frames\.pass && stylesheets\.pass && integrity\.pass && stateResult\.focusFailures/);
  assert.match(source, /if \(!ev\.checks\.integrity\.pass\) fail = true;/);
  for (const k of Object.keys(VECTOR)) assert.match(source, new RegExp(`\\b${k}: `), `the measured vector carries ${k}`);
  assert.match(source, /await c\.addInitScript\(rafCounterInit\);/);
  assert.match(source, /const rafLoop = rafLoopFrom\(raf1, raf2\);/);
  // R13 N18: the positional page and every declared state use the same hardened reduced-motion routine.
  assert.match(source, /ev\.checks\.reducedMotion = await motionFor\(page\);/);
  assert.match(source, /const reducedMotion = await motionFor\(st\.page\);/);
  assert.match(source, /&& widths\.pass && reducedMotion\.pass && doc\.lang/);
  assert.doesNotMatch(source, /rmState/, 'the weaker per-state routine is gone');
  assert.match(source, /const snap = \(\) => pg\.evaluate\(motionSnapshot\);/, 'R14-GPT-05: the composed-tree snapshot');
  assert.match(source, /const moved = motionChanges\(s1, s2\);/);
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
    assert.deepEqual([cOn.slots, cOff.slots], [[], [['lede', 'g']]], 'the content probe sees the slot (and its text) a script removes');
    assert.equal(cmp({ probe: run({ glass: gOn }, cOn), page: run({ glass: gOn }, cOn), jsOff: run({ glass: gOff }, cOff) }).status, 'INCOMPLETE', 'JS-off content differs, so its metrics prove nothing');
    assert.equal(cmp({ probe: run({ glass: gOn }), page: run({ glass: gOn }), jsOff: run({ glass: gOff }) }).status, 'integrity mismatch');
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
