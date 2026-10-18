// R11 panel D1 (decisions C, T4): probe-integrity cross-checks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compareIntegrity, nativeCheck } from '../tools/integrity.mjs';
import { designProbe } from '../tools/design-probe.mjs';

const release = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const deps = process.env.FANNAN_DEPS || resolve(release, '..', 'runtime-deps');
const chrome = process.env.FANNAN_TEST_CHROME || '/usr/bin/google-chrome';

const clean = { glass: 0, reflowPass: true, scrolledText: 0 };

test('R11 panel C: identical worlds and JS-off pass; tampering and unexplained JS-off regressions fail as integrity mismatch', () => {
  assert.deepEqual([compareIntegrity({ probe: clean, page: clean, jsOff: clean }).status, compareIntegrity({ probe: clean, page: clean, jsOff: clean }).pass], ['PASS', true]);
  const tamper = compareIntegrity({ probe: { ...clean, glass: 1 }, page: clean, jsOff: { ...clean, glass: 1 } });
  assert.equal(tamper.status, 'integrity mismatch'); assert.match(tamper.mismatches[0].detail, /page world counts 0 glass, probe world 1/);
  assert.equal(compareIntegrity({ probe: clean, page: { ...clean, reflowPass: false, scrolledText: 1 }, jsOff: clean }).pass, false, 'reflow differs between worlds');
  const native = compareIntegrity({ probe: clean, page: clean, jsOff: clean, tamperSigns: ['window.getComputedStyle'] });
  assert.deepEqual([native.pass, native.mismatches[0].check], [false, 'native']);
  const jsGlass = compareIntegrity({ probe: clean, page: clean, jsOff: { ...clean, glass: 2 } });
  assert.deepEqual([jsGlass.status, jsGlass.mismatches[0].check, jsGlass.mismatches[0].source], ['integrity mismatch', 'glass', 'js-off'], 'scripts hide glass that is there without them');
  const jsReflow = compareIntegrity({ probe: clean, page: clean, jsOff: { ...clean, reflowPass: false } });
  assert.equal(jsReflow.mismatches[0].check, 'reflow');
  const explained = compareIntegrity({ probe: clean, page: clean, jsOff: { ...clean, reflowPass: false }, handoff: { jsOffDifferences: [{ check: 'reflow', reason: 'the menu collapses only once its script loads' }, { check: 'glass', reason: '' }] } });
  assert.deepEqual([explained.pass, explained.expectedDifferences.map(d => [d.check, d.reason])], [true, [['reflow', 'the menu collapses only once its script loads']]], 'an expected post-script difference is recorded, not failed');
  assert.equal(compareIntegrity({ probe: clean, page: clean, jsOff: { ...clean, glass: 1 }, handoff: { jsOffDifferences: [{ check: 'glass', reason: ' ' }] } }).pass, false, 'a blank reason explains nothing');
  const post = compareIntegrity({ probe: { ...clean, glass: 1 }, page: { ...clean, glass: 1 }, jsOff: clean });
  assert.deepEqual([post.pass, post.postScriptDifferences.length], [true, 1], 'scripted page worse: recorded here, failed by the main glass check');
  assert.match(post.untested, /contrast is not cross-checked/);
});

test('R11 panel C: the checker runs the cross-checks on the positional page and fails on a mismatch', () => {
  const source = readFileSync(join(release, 'tools/pre-handoff-check.mjs'), 'utf8');
  assert.match(source, /import \{ nativeCheck, compareIntegrity \} from '\.\/integrity\.mjs';/);
  assert.match(source, /const contextFor = async javaScriptEnabled => \{ const c = await b\.newContext\(\{ viewport: \{ width: 1440, height: 900 \}, serviceWorkers: 'block', javaScriptEnabled \}\);/);
  assert.match(source, /await contextFor\(false\)/);
  assert.match(source, /ev\.checks\.integrity = compareIntegrity\(\{ probe, page: pageWorld, jsOff, tamperSigns, handoff \}\);/);
  assert.match(source, /catch \(e\) \{ ev\.checks\.integrity = \{ status: 'integrity mismatch', pass: false/);
  assert.match(source, /if \(!ev\.checks\.integrity\.pass\) fail = true;/);
});

test('R11 panel C: real Chrome: nativeCheck flags patched functions; the JS-off isolated pass sees glass a script removes (test-only)', { skip: !(existsSync(join(deps, 'node_modules/playwright-core')) && existsSync(chrome)) && 'test-only deps or local Chrome absent' }, async () => {
  const { chromium } = createRequire(join(deps, 'node_modules/'))('playwright-core');
  const { isolatedPage } = await import('../tools/probe-world.mjs');
  const browser = await chromium.launch({ executablePath: chrome, args: ['--headless=new'] });
  try {
    const page = await browser.newPage();
    await page.setContent('<main><h1>x</h1></main>');
    assert.deepEqual(await page.evaluate(nativeCheck), [], 'a plain page has native probe functions');
    await page.setContent('<main><h1>x</h1></main><script>const g = window.getComputedStyle; window.getComputedStyle = (e, p) => g(e, p); Element.prototype.closest = function () { return null; };</script>');
    assert.deepEqual(await page.evaluate(nativeCheck), ['window.getComputedStyle', 'Element.prototype.closest']);
    const html = '<style>.g{backdrop-filter:blur(2px)}</style><main><h1>x</h1><p class="g">g</p></main><script>document.querySelector(".g").className = "";</script>';
    const on = await isolatedPage(await browser.newPage()); await on.setContent(html);
    const offCtx = await browser.newContext({ javaScriptEnabled: false });
    const off = await isolatedPage(await offCtx.newPage()); await off.setContent(html);
    const [gOn, gOff] = [(await on.evaluate(designProbe)).glass, (await off.evaluate(designProbe)).glass];
    assert.ok(gOff > gOn, `JS off shows more glass (${gOff} > ${gOn})`);
    assert.equal(compareIntegrity({ probe: { ...clean, glass: gOn }, page: { ...clean, glass: gOn }, jsOff: { ...clean, glass: gOff } }).status, 'integrity mismatch');
  } finally { await browser.close(); }
});
