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

test('ARGON-R5-02: overflow hidden or clip on html and body together cannot hide a wide layout (real Chrome, test-only)', { skip: !(existsSync(join(deps, 'node_modules/playwright-core')) && existsSync(chrome)) && 'test-only deps or local Chrome absent' }, async () => {
  const { screenWidths } = await import('../tools/width-screen.mjs');
  const { chromium } = createRequire(join(deps, 'node_modules/'))('playwright-core');
  const browser = await chromium.launch({ executablePath: chrome, args: ['--headless=new'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const en = { lang: 'en', dir: 'ltr' };
    const wide = '<main style="width:1400px"><h1>Fixed wide layout</h1></main>';
    for (const [name, html, body] of [['body hidden', '', 'overflow-x:hidden'], ['body clip', '', 'overflow-x:clip'], ['html hidden', 'overflow-x:hidden', ''], ['html and body hidden', 'overflow-x:hidden', 'overflow-x:hidden'], ['html and body clip', 'overflow-x:clip', 'overflow-x:clip'], ['html clip', 'overflow-x:clip', ''], ['html hidden, body clip', 'overflow-x:hidden', 'overflow-x:clip'], ['html clip, body hidden', 'overflow-x:clip', 'overflow-x:hidden']]) {
      await page.setContent(`<html lang="en" style="${html}"><body style="margin:0;${body}">${wide}</body></html>`);
      const r = await screenWidths(page, [1440, 1280], en);
      assert.equal(r.results[1].pass, false, `${name}: a 1400px layout at 1280 must fail`);
      assert.ok(r.results[1].horizontalOverflow || r.results[1].clipped.some(c => c.tag === 'BODY' && c.x), `${name}: recorded as overflow or a body clip`);
    }
    await page.setContent('<html lang="en" style="overflow-x:hidden"><body style="margin:0;overflow-x:hidden"><main style="max-width:60rem;margin:auto"><h1>Fluid</h1><p>Wraps.</p></main></body></html>');
    assert.equal((await screenWidths(page, [1440, 1280], en)).pass, true, 'a fluid page with hidden overflow still passes');
  } finally { await browser.close(); }
});

test('ARGON-R5-05: content pushed past the left edge fails; visually hidden and off-screen skip-link patterns do not (real Chrome, test-only)', { skip: !(existsSync(join(deps, 'node_modules/playwright-core')) && existsSync(chrome)) && 'test-only deps or local Chrome absent' }, async () => {
  const { inspectLayout } = await import('../tools/width-screen.mjs');
  const { chromium } = createRequire(join(deps, 'node_modules/'))('playwright-core');
  const browser = await chromium.launch({ executablePath: chrome, args: ['--headless=new'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const run = async body => { await page.setContent(`<html lang="en"><body style="margin:0">${body}</body></html>`); return page.evaluate(inspectLayout); };
    const left = await run('<p style="position:relative;left:-200px;width:300px">Pushed off the left edge</p>');
    assert.equal(left.offscreenLeft.length, 1, 'text past the left edge is recorded');
    const img = await run('<img alt="x" style="position:relative;left:-50px;width:100px;height:100px" src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E">');
    assert.equal(img.offscreenLeft.length, 1, 'an image past the left edge is recorded');
    const srOnly = await run('<a href="#m" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0">Skip to content</a><p id="m">ok</p>');
    assert.deepEqual([srOnly.offscreenLeft, srOnly.clipped], [[], []], 'sr-only pattern is neither off-screen content nor a clip');
    const skip = await run('<a href="#m" style="position:absolute;left:-9999px;top:0">Skip to content</a><p id="m">ok</p>');
    assert.deepEqual(skip.offscreenLeft, [], 'an off-screen focusable skip link (shown on focus) is exempt');
    const hiddenText = await run('<p style="position:absolute;left:-9999px">Not focusable, pushed away</p>');
    assert.equal(hiddenText.offscreenLeft.length, 1, 'non-focusable text pushed off-screen is not a skip link');
    const scroller = await run(`<div id="s" style="width:600px;overflow-x:auto;white-space:nowrap">${'<span style="display:inline-block;width:300px">card</span>'.repeat(6)}</div>`);
    await page.evaluate(() => { document.getElementById('s').scrollLeft = 400; });
    const scrolled = await page.evaluate(inspectLayout);
    assert.deepEqual([scroller.offscreenLeft, scrolled.offscreenLeft], [[], []], 'items inside a horizontal scroller are exempt');
    const ok = await run('<main style="max-width:60rem;margin:auto"><h1>Fine</h1></main>');
    assert.deepEqual(ok.offscreenLeft, []);
  } finally { await browser.close(); }
});

test('ARGON-R5-05: off-screen-left content fails the width screen', () => {
  const source = readFileSync(join(release, 'tools/width-screen.mjs'), 'utf8');
  assert.match(source, /pass: !result\.horizontalOverflow && result\.clipped\.length === 0 && result\.offscreenLeft\.length === 0 && result\.scrolledText\.length === 0 && language/); // R11 S3 adds scrolledText
});

test('R11 S3: at 320 px, ordinary text that needs sideways scrolling in a scroller fails; only 2D content is excused (real Chrome, test-only)', { skip: !(existsSync(join(deps, 'node_modules/playwright-core')) && existsSync(chrome)) && 'test-only deps or local Chrome absent' }, async () => {
  const { screenWidths } = await import('../tools/width-screen.mjs');
  const { chromium } = createRequire(join(deps, 'node_modules/'))('playwright-core');
  const browser = await chromium.launch({ executablePath: chrome, args: ['--headless=new'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const en = { lang: 'en', dir: 'ltr' };
    const at320 = async inner => { await page.setContent(`<html lang="en"><body style="margin:0"><main><h1>Page</h1>${inner}</main></body></html>`); return (await screenWidths(page, [1440], en)).results.find(r => r.width === 320); };
    const cards = `<div style="overflow-x:auto;white-space:nowrap">${'<span style="display:inline-block;width:280px">Ordinary card text</span>'.repeat(4)}</div>`;
    const text = await at320(cards);
    assert.equal(text.pass, false, 'ordinary text in a horizontal scroller fails at 320 px');
    assert.equal(text.scrolledText.length, 1);
    const wideP = await at320('<div style="overflow-x:auto"><p style="width:900px">A paragraph that needs sideways scrolling to read.</p></div>');
    assert.equal(wideP.pass, false);
    for (const [name, inner] of [['table', '<div style="overflow-x:auto"><table style="width:900px"><tr><td>a</td><td>b</td></tr></table></div>'], ['pre', '<div style="overflow-x:auto"><pre>const aVeryLongLineOfCode = somethingThatDoesNotWrap(1, 2, 3, 4, 5, 6, 7);</pre></div>'], ['role=grid', '<div style="overflow-x:auto"><div role="grid" style="width:900px">grid cells</div></div>'], ['svg', '<div style="overflow-x:auto"><svg width="900" height="50"><text x="10" y="20">diagram</text></svg></div>']]) {
      const r = await at320(inner);
      assert.equal(r.pass, true, `${name}: 2D content is excused`);
      assert.equal(r.twoDimensional.length, 1, `${name}: the excused scroller is recorded`);
    }
    const marked = await at320('<div data-fannan-2d="timeline diagram" style="overflow-x:auto"><div style="width:900px">2026 · 2027 · 2028</div></div>');
    assert.equal(marked.pass, true);
    assert.deepEqual(marked.twoDimensional.map(t => t.reason), ['timeline diagram'], 'the data-fannan-2d reason is recorded for review');
    const mixed = await at320('<div style="overflow-x:auto"><table style="width:900px"><tr><td>a</td></tr></table><p style="width:900px">Ordinary text next to the table.</p></div>');
    assert.equal(mixed.pass, false, 'ordinary text beside a table in the same scroller still fails');
    const fits = await at320('<div style="overflow-x:auto"><p>Short text that fits.</p></div>');
    assert.equal(fits.pass, true, 'a scroller that does not scroll is fine');
    await page.setContent(`<html lang="en"><body style="margin:0"><main><h1>Page</h1>${cards}</main></body></html>`);
    const desktop = (await screenWidths(page, [1440], en)).results[0];
    assert.equal(desktop.width, 1440); assert.deepEqual(desktop.scrolledText, [], 'declared desktop widths keep the scroller exemption');
  } finally { await browser.close(); }
});
