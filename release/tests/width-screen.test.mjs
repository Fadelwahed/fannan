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
  assert.match(source, /import \{ screenWidths, resolveReflowCandidates, validWidths \} from '\.\/width-screen\.mjs';/); // R11 panel B adds the resolver, R12 the width list check
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
  assert.match(source, /pass: !result\.horizontalOverflow && result\.clipped\.length === 0 && result\.offscreenLeft\.length === 0 && result\.unreachable\.length === 0 && result\.scrolledText\.length === 0 && result\.unmeasured\.length === 0 && result\.unscannedScopes\.length === 0 && result\.reflowCandidates\.every\(c => c\.fits && c\.keyboard\) && language/); // R11 S3 + panel B + R12 M01/M02/M11
});

test('R11 S3 / panel B: at 320 px, ordinary text or media in a sideways scroller fails (left and right); 2D content is a recorded candidate, never excused automatically (real Chrome, test-only)', { skip: !(existsSync(join(deps, 'node_modules/playwright-core')) && existsSync(chrome)) && 'test-only deps or local Chrome absent' }, async () => {
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
    assert.equal((await at320('<div style="overflow-x:auto"><p style="width:900px">A paragraph that needs sideways scrolling to read.</p></div>')).pass, false);
    const rtl = await at320(`<div dir="rtl" style="overflow-x:auto"><p style="white-space:nowrap">${'نص عادي يحتاج إلى تمرير جانبي '.repeat(6)}</p></div>`);
    assert.equal(rtl.pass, false, 'overflow to the left (RTL) fails too'); assert.equal(rtl.scrolledText.length, 1);
    assert.equal((await at320('<div style="overflow-x:auto"><img alt="photo" width="900" height="40" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></div>')).pass, false, 'resizable media is not a candidate');
    assert.equal((await at320(`<div style="overflow-x:auto" tabindex="0"><div role="grid" style="white-space:nowrap">${'no rows, only text '.repeat(20)}</div></div>`)).pass, false, 'role=grid without real rows is not a candidate');
    const kb = '<div style="overflow-x:auto" tabindex="0" aria-label="scroll">';
    for (const [name, inner, element, reason] of [['table', `${kb}<table id="t1" style="width:900px"><tr><td>a</td><td>b</td></tr></table></div>`, 'table#t1', 'table'], ['pre', `${kb}<pre id="p1">const aVeryLongLineOfCode = somethingThatDoesNotWrap(1, 2, 3, 4, 5, 6, 7);</pre></div>`, 'pre#p1', 'pre'], ['role=grid', `${kb}<div id="g1" role="grid" style="width:900px"><div role="row" style="display:flex;gap:400px"><span role="gridcell">a</span><span role="gridcell">b</span><span role="gridcell">c</span></div></div></div>`, 'div#g1', 'grid'], ['marked svg', `${kb}<figure id="map" data-fannan-2d="route map"><svg width="900" height="50"><text x="10" y="20">diagram</text></svg></figure></div>`, 'figure#map', 'route map']]) {
      const r = await at320(inner);
      assert.equal(r.pass, true, `${name}: a keyboard-usable candidate that fits does not fail the width screen itself`);
      assert.deepEqual(r.reflowCandidates.map(c => [c.element, c.reason, c.fits, c.keyboard]), [[element, reason, true, true]], `${name}: recorded as a candidate with element and reason`);
      assert.equal('twoDimensional' in r, false, 'no automatic excuse list');
    }
    const noKb = await at320('<div style="overflow-x:auto"><table id="t2" style="width:900px"><tr><td>a</td><td>b</td></tr></table></div>');
    assert.equal(noKb.pass, false, 'a candidate scroller that is not keyboard-usable fails'); assert.equal(noKb.reflowCandidates[0].keyboard, false);
    const wide = await at320(`<div style="overflow-x:auto;width:500px" tabindex="0"><table id="t3" style="width:1400px"><tr><td>a</td><td>b</td></tr></table></div>`);
    assert.equal(wide.pass, false, 'a candidate scroller wider than 320 px fails'); assert.equal(wide.reflowCandidates[0].fits, false);
    const mixed = await at320(`${kb}<table style="width:900px"><tr><td>a</td></tr></table><p style="width:900px">Ordinary text next to the table, long enough to run past the scroller edge.</p></div>`);
    assert.equal(mixed.pass, false, 'ordinary text beside a table in the same scroller still fails (smallest region only)');
    const marked = await at320(`${kb}<div data-fannan-2d=" " style="white-space:nowrap">${'2026 · 2027 · 2028 · '.repeat(10)}</div></div>`);
    assert.equal(marked.reflowCandidates[0].reason, null, 'a blank data-fannan-2d reason is recorded as missing');
    assert.equal((await at320('<div style="overflow-x:auto"><p>Short text that fits.</p></div>')).pass, true, 'a scroller that does not scroll is fine');
    await page.setContent(`<html lang="en"><body style="margin:0"><main><h1>Page</h1>${cards}</main></body></html>`);
    const desktop = (await screenWidths(page, [1440], en)).results[0];
    assert.equal(desktop.width, 1440); assert.deepEqual(desktop.scrolledText, [], 'declared desktop widths keep the scroller exemption');
  } finally { await browser.close(); }
});

test('R11 panel B/T2, R12 M09: an unresolved reflow candidate blocks the handoff; only a scope- and id-matched entry with a reason and a qaGate/approver reviewer resolves it', async () => {
  const { resolveReflowCandidates } = await import('../tools/width-screen.mjs');
  const home = { screen: 'home', state: 'default', lang: 'en' };
  const handoff = { settings: { roles: { qaGate: 'Amin', approver: 'Fadel', writer: 'W', engineer: 'E' } }, reflowExceptions: [{ ...home, id: 't1', reason: 'comparison table: rows and columns carry meaning', reviewer: 'Amin' }, { ...home, id: 'p1', reason: '', reviewer: 'Fadel' }, { ...home, id: 'g1', reason: 'grid', reviewer: 'W' }] };
  const c = (element, id, reason = 'table', scope = home, scroller = 'div') => ({ ...scope, element, id, reason, scroller, fits: true, keyboard: true });
  const r = resolveReflowCandidates([c('table#t1', 't1'), c('table#t1', 't1'), c('pre#p1', 'p1'), c('div#g1', 'g1'), c('table', null), c('div#m', 'm', null)], handoff);
  assert.deepEqual(r.candidates.map(x => [x.element, x.resolved, x.unresolvedBecause]), [['table#t1', true, null], ['pre#p1', false, 'reflowExceptions entry has no reason'], ['div#g1', false, 'reflowExceptions reviewer is not Amin or Fadel'], ['table', false, 'reflowExceptions has no element id to resolve'], ['div#m', false, 'reflowExceptions reason on the page is blank']]);
  assert.deepEqual([r.status, r.pass, r.unresolved], ['FAIL', false, 4]);
  assert.deepEqual(r.candidates[0].decision, { reason: 'comparison table: rows and columns carry meaning', reviewer: 'Amin' });
  assert.deepEqual([resolveReflowCandidates([c('table#t1', 't1')], handoff).status, resolveReflowCandidates([c('table#t1', 't1')], handoff).pass], ['PASS', true]);
  // R12 M09: a later occurrence with a blank reason is kept (not deduplicated away); scope is part of the match
  const blankLater = resolveReflowCandidates([c('table#t1', 't1'), c('table#t1', 't1', null)], handoff);
  assert.deepEqual([blankLater.pass, blankLater.candidates.length, blankLater.candidates[1].unresolvedBecause], [false, 2, 'reflowExceptions reason on the page is blank']);
  const otherState = resolveReflowCandidates([c('table#t1', 't1', 'table', { screen: 'home', state: 'error', lang: 'en' })], handoff);
  assert.deepEqual([otherState.pass, otherState.candidates[0].unresolvedBecause], [false, 'no reflowExceptions entry for this id, screen, state and lang'], 'one #t1 entry does not resolve #t1 on another state');
  const clash = resolveReflowCandidates([c('table#t1', 't1'), c('pre#t1', 't1', 'pre')], handoff);
  assert.deepEqual(clash.candidates.map(x => x.unresolvedBecause), ['id t1 names different elements in this scope', 'id t1 names different elements in this scope']);
  assert.equal(resolveReflowCandidates([{ element: 'table#t1', id: 't1', reason: 'table', scroller: 'div', fits: true, keyboard: true }], handoff).candidates[0].unresolvedBecause, 'reflowExceptions has no declared screen/state scope');
  assert.deepEqual([resolveReflowCandidates([c('table', null)], handoff, 'wireframe').status, resolveReflowCandidates([c('table', null)], handoff, 'wireframe').pass], ['DEFERRED', true]);
  assert.equal(resolveReflowCandidates(Array.from({ length: 40 }, (_, i) => c(`table#t${i}`, `t${i}`)), { ...handoff, reflowExceptions: Array.from({ length: 40 }, (_, i) => ({ ...home, id: `t${i}`, reason: 'r', reviewer: 'Amin' })) }).pass, true, 'no count cap (panel T3)');
  const source = readFileSync(new URL('../tools/pre-handoff-check.mjs', import.meta.url), 'utf8');
  assert.match(source, /ev\.checks\.reflowCandidates = resolveReflowCandidates\(/);
  assert.match(source, /if \(!ev\.checks\.reflowCandidates\.pass\) fail = true;/);
  assert.match(source, /\.\.\.scopeOf\(/, 'candidates carry their screen, state and lang');
});

test('R12 M01/M02/M10/M11/M14: bare and direct text, content lost past either scroller edge, shadow scrollers, real keyboard reach and hidden content (real Chrome, test-only)', { skip: !(existsSync(join(deps, 'node_modules/playwright-core')) && existsSync(chrome)) && 'test-only deps or local Chrome absent' }, async () => {
  const { screenWidths } = await import('../tools/width-screen.mjs');
  const { chromium } = createRequire(join(deps, 'node_modules/'))('playwright-core');
  const browser = await chromium.launch({ executablePath: chrome, args: ['--headless=new'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const en = { lang: 'en', dir: 'ltr' };
    const at = async (inner, width = 320) => { await page.setContent(`<html lang="en"><body style="margin:0"><main><h1>Page</h1>${inner}</main></body></html>`); return (await screenWidths(page, [1440], en)).results.find(r => r.width === width); };
    // M01: the scroller's own text
    const bare = await at(`<div style="overflow-x:auto;white-space:nowrap">${'bare text '.repeat(60)}</div>`);
    assert.deepEqual([bare.pass, bare.scrolledText.length], [false, 1], 'bare text directly in a nowrap scroller fails');
    const pre = await at(`<pre id="code" style="overflow-x:auto">${'x'.repeat(300)}</pre>`);
    assert.deepEqual(pre.reflowCandidates.map(c => [c.element, c.keyboard]), [['pre#code', false]], 'a directly scrollable pre is a candidate and must be keyboard-usable');
    assert.equal(pre.pass, false);
    assert.equal((await at(`<div style="overflow-x:auto"><div style="width:900px;height:1px"></div>short</div>`)).pass, true, 'an empty overflowing spacer is not a failure');
    // M02: lost past either edge, also in overflow-y-only scrollers, at every width
    for (const [name, inner] of [['negative margin in an overflow-y scroller', '<div style="overflow-y:auto;height:100px"><p style="margin-left:-200px">Pushed left text that is lost</p></div>'], ['transform in an auto scroller', '<div style="overflow-x:auto"><p style="transform:translateX(-200px)">Translated left text lost</p></div>'], ['relative left in a hidden box', '<div style="overflow:hidden"><p style="position:relative;left:-300px">Hidden past the left edge</p></div>']]) {
      for (const width of [1440, 320]) {
        const r = await at(inner, width);
        assert.equal(r.pass, false, `${name} at ${width}: fails`);
        assert.ok(r.unreachable.length + r.clipped.length + r.scrolledText.length >= 1, `${name} at ${width}: recorded`);
      }
    }
    assert.deepEqual((await at('<div style="overflow-y:auto;height:100px"><p style="margin-left:-200px">x</p></div>', 1440)).unreachable.map(u => u.side), ['left']);
    const rtlOk = await at('<div dir="rtl" style="overflow-x:auto;width:300px" tabindex="0"><table id="r" style="width:900px"><tr><td>أ</td><td>ب</td><td>ج</td></tr></table></div>');
    assert.deepEqual([rtlOk.unreachable, rtlOk.pass], [[], true], 'RTL content reachable by scrolling is not lost');
    // M10: keyboard reach
    for (const [name, inner] of [['a hidden disabled button', '<div style="overflow-x:auto"><table id="t" style="width:900px"><tr><td><button disabled style="display:none">x</button>a</td><td>b</td></tr></table></div>'], ['one link in the first cell', '<div style="overflow-x:auto"><table id="t" style="width:900px"><tr><td><a href="#a">a</a></td><td>b</td></tr></table></div>'], ['an inert scroller', '<div inert style="overflow-x:auto" tabindex="0"><table id="t" style="width:900px"><tr><td>a</td><td>b</td></tr></table></div>']]) {
      const r = await at(inner);
      assert.deepEqual([r.reflowCandidates[0]?.keyboard, r.pass], [false, false], `${name}: not keyboard-usable`);
    }
    const stepped = await at('<div style="overflow-x:auto"><table id="t" style="width:900px"><tr><td><a href="#a">a</a></td><td><a href="#b">b</a></td><td><a href="#c">c</a></td></tr></table></div>');
    assert.equal(stepped.reflowCandidates[0].keyboard, true, 'links spaced across the whole extent let tabbing scroll it');
    // M11: open shadow roots
    const shadow = await at(`<div id="h"></div><script>document.getElementById('h').attachShadow({ mode: 'open' }).innerHTML = '<div style="overflow-x:auto"><p style="width:900px">${'shadow text '.repeat(20)}</p></div>';</script>`);
    assert.deepEqual([shadow.pass, shadow.scrolledText.length], [false, 1], 'a scroller inside an open shadow root is screened');
    const frame = await at(`<iframe style="width:300px" srcdoc="<p style='white-space:nowrap'>${'framed text '.repeat(40)}</p>"></iframe>`);
    assert.equal(frame.pass, false, 'a same-origin frame that scrolls sideways fails');
    const sandboxed = await at('<iframe sandbox style="width:300px" srcdoc="<p>x</p>"></iframe>');
    assert.deepEqual([sandboxed.pass, sandboxed.unscannedScopes.length], [false, 1], 'an unreadable frame is an unscanned scope and fails closed');
    // M14: hidden inactive content is not measured
    const hidden = await at(`<div style="overflow-x:auto"><p style="width:900px;visibility:hidden">${'hidden inactive text '.repeat(10)}</p><p>ok</p></div>`);
    assert.deepEqual([hidden.pass, hidden.scrolledText], [true, []], 'visibility:hidden text is not reported');
  } finally { await browser.close(); }
});
