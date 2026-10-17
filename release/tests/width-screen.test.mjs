// R8, ported from codex/fannan-r3-review 2733317: screen every declared desktop width (plus 320 px reflow) in the checker.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const release = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const deps = resolve(release, '../runtime-deps');
const chrome = process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : '/usr/bin/google-chrome';

test('R8 PORT-02: the checker screens handoff.settings.desktopWidths next to the focus probe, on the page and on every declared state', () => {
  const source = readFileSync(join(release, 'tools/pre-handoff-check.mjs'), 'utf8');
  assert.match(source, /import \{ screenWidths \} from '\.\/width-screen\.mjs';/);
  assert.equal(source.split('await screenWidths(p, handoff?.settings?.desktopWidths').length - 1, 2, 'page and every declared state');
  assert.match(source, /ev\.checks\.widths = await screenWidths\(p, handoff\?\.settings\?\.desktopWidths, null\);\nif \(!ev\.checks\.widths\.pass\) fail = true;/);
  assert.match(source, /const widths = await screenWidths\(p, handoff\?\.settings\?\.desktopWidths, \{ lang: st\.lang, dir: st\.dir \}\);/);
  assert.match(source, /&& widths\.pass && running === 0/, 'a failing width fails the state');
  const focusEnd = source.indexOf("ev.checks.custom22 = {"), widthsAt = source.indexOf('ev.checks.widths = await screenWidths');
  assert.ok(focusEnd > 0 && widthsAt > focusEnd, 'runs after the page focus probe');
  assert.ok(widthsAt > source.indexOf("evidenceWrite('page-1440.png'"), 'after the 1440 screenshot, so the reference frame is unchanged');
});

test('R8 PORT-02: screenWidths refuses an invalid width list instead of falling back', async () => {
  const { screenWidths } = await import('../tools/width-screen.mjs');
  let calls = 0;
  const page = { setViewportSize() { calls++; }, evaluate() { calls++; } };
  for (const bad of [undefined, [], [1280], [1440, 1440], [1440, 0], [1440, 99.5]]) {
    const r = await screenWidths(page, bad);
    assert.equal(r.pass, false); assert.match(r.error, /desktopWidths invalid/); assert.deepEqual(r.results, []);
  }
  assert.equal(calls, 0, 'nothing rendered for an invalid list');
});

test('R8 PORT-02: every declared width and 320 px reflow are screened for overflow, clipping and language (real Chrome, test-only)', { skip: !(existsSync(join(deps, 'node_modules/playwright-core')) && existsSync(chrome)) && 'test-only deps or local Chrome absent' }, async () => {
  const { screenWidths } = await import('../tools/width-screen.mjs');
  const { chromium } = createRequire(join(deps, 'node_modules/'))('playwright-core');
  const browser = await chromium.launch({ executablePath: chrome, args: ['--headless=new'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const en = { lang: 'en', dir: 'ltr' };
    await page.setContent('<html lang="en"><body style="margin:0"><main style="max-width:60rem;margin:auto"><h1>Service</h1><p>Readable text that wraps at any width.</p></main></body></html>');
    const fluid = await screenWidths(page, [1440, 1280], en);
    assert.deepEqual(fluid.results.map(r => r.width), [1440, 1280, 320], 'declared widths in order, then 320 reflow');
    assert.equal(fluid.pass, true);
    assert.deepEqual(page.viewportSize(), { width: 1440, height: 900 }, 'viewport restored to the canonical 1440');
    await page.setContent('<html lang="en"><body style="margin:0"><main style="width:1400px"><h1>Fixed</h1></main></body></html>');
    const fixed = await screenWidths(page, [1440, 1280], en);
    assert.deepEqual(fixed.results.map(r => [r.width, r.horizontalOverflow]), [[1440, false], [1280, true], [320, true]], 'a 1400px layout overflows 1280 and 320');
    assert.equal(fixed.pass, false);
    await page.setContent('<html lang="en"><body style="margin:0"><p style="width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">A sentence far too long for its fixed box that is cut off</p></body></html>');
    const clipped = await screenWidths(page, [1440], en);
    assert.equal(clipped.pass, false); assert.equal(clipped.results[0].clipped.length, 1);
    await page.setContent('<html lang="ar" dir="rtl"><body><p>نص</p></body></html>');
    assert.equal((await screenWidths(page, [1440], en)).pass, false, 'language/direction must match the declared state');
    assert.equal((await screenWidths(page, [1440], { lang: 'ar', dir: 'rtl' })).pass, true);
    assert.equal((await screenWidths(page, [1440], null)).pass, true, 'positional page: language checked per state');
  } finally { await browser.close(); }
});

test('CODEX-R4-04: ellipsis styling on text that fits is not a clip; overflowing ellipsised text is (real Chrome, test-only)', { skip: !(existsSync(join(deps, 'node_modules/playwright-core')) && existsSync(chrome)) && 'test-only deps or local Chrome absent' }, async () => {
  const { inspectLayout } = await import('../tools/width-screen.mjs');
  const { chromium } = createRequire(join(deps, 'node_modules/'))('playwright-core');
  const browser = await chromium.launch({ executablePath: chrome, args: ['--headless=new'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const style = 'width:300px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
    await page.setContent(`<html lang="en"><body><p style="${style}">Short</p></body></html>`);
    assert.deepEqual((await page.evaluate(inspectLayout)).clipped, [], 'fitting text with ellipsis styling passes');
    await page.setContent(`<html lang="en"><body><p style="${style}">${'A sentence far too long for its fixed box '.repeat(4)}</p></body></html>`);
    const over = (await page.evaluate(inspectLayout)).clipped;
    assert.equal(over.length, 1); assert.equal(over[0].x, true); assert.equal(over[0].ellipsis, true);
    await page.setContent(`<html lang="en"><body><p style="width:300px;white-space:nowrap;overflow:hidden">${'Cut without ellipsis '.repeat(6)}</p></body></html>`);
    const cut = (await page.evaluate(inspectLayout)).clipped;
    assert.equal(cut.length, 1); assert.equal(cut[0].ellipsis, false);
  } finally { await browser.close(); }
});
