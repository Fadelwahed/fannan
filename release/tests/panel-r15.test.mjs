// R15 (panel round 15, A1 and A3): real-Chrome regressions for the gate items. Each case was first run against the
// 67f3577 sources and failed there at its assertion (test-results/r15/R15-*-before.log).
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as widthScreen from '../tools/width-screen.mjs';
import * as integrity from '../tools/integrity.mjs';

const { screenWidths } = widthScreen;
const { contentProbe, contrastProbe, compareIntegrity, VECTOR } = integrity;
const release = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const deps = process.env.FANNAN_DEPS || resolve(release, '..', 'runtime-deps');
const chrome = process.env.FANNAN_TEST_CHROME || '/usr/bin/google-chrome';
const haveChrome = existsSync(join(deps, 'node_modules/playwright-core')) && existsSync(chrome);
const skip = !haveChrome && 'test-only deps or local Chrome absent';
const withBrowser = async fn => {
  const { chromium } = createRequire(join(deps, 'node_modules/'))('playwright-core');
  const { isolatedPage } = await import('../tools/probe-world.mjs');
  const dir = mkdtempSync(join(tmpdir(), 'fannan-r15-'));
  const browser = await chromium.launch({ executablePath: chrome, args: ['--headless=new'] });
  const open = async (html, javaScriptEnabled = true, viewport = { width: 1440, height: 900 }) => {
    const file = join(dir, `p${Math.random().toString(36).slice(2)}.html`); writeFileSync(file, html);
    const ctx = await browser.newContext({ javaScriptEnabled, viewport });
    const main = await ctx.newPage(); await main.goto(pathToFileURL(file).href); await main.waitForLoadState('load'); await main.waitForTimeout(50);
    return { main, probe: await isolatedPage(main) };
  };
  try { await fn({ open }); } finally { await browser.close(); rmSync(dir, { recursive: true, force: true }); }
};
const widths = { 1440: 0, 320: 0 };
const vector = Object.fromEntries(Object.entries(VECTOR).map(([k, t]) => [k, t === 'flag' ? false : t === 'text' ? '#123456' : t === 'widths' ? widths : t === 'coverage' ? 5 : 0]));
const run = (v, c) => ({ vector: { ...vector, ...v }, content: c });
const scope = { screen: 'home', state: 'default', lang: 'en' };

test('R15-A1: real Chrome: an unbounded overflow-y:auto wrapper under a hidden viewport cannot scroll, so lower text fails at 1440 and 320; a bounded app shell passes (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const lower = '<h1>Top</h1><div style="height:1500px"></div><p>Lower text nobody can reach</p>';
  const cases = [
    ['auto-height wrapper', `<html lang="en" style="overflow:hidden"><body style="margin:0"><main style="overflow-y:auto">${lower}</main></body></html>`],
    ['scroll wrapper taller than the viewport', `<html lang="en" style="overflow:hidden"><body style="margin:0"><main style="overflow-y:scroll;height:2000px">${lower}</main></body></html>`],
    ['bounded scroller clipped by a short hidden ancestor', `<html lang="en" style="overflow:hidden"><body style="margin:0"><div style="height:400px;overflow:hidden"><main style="height:800px;overflow-y:auto">${lower}</main></div></body></html>`],
  ];
  for (const [name, html] of cases) {
    const r = await screenWidths((await open(html)).main, [1440]);
    for (const w of [1440, 320]) { const x = r.results.find(y => y.width === w); assert.equal(x?.pass, false, `${name} @${w}`); assert.ok(x.clipped.some(c => c.viewport && c.y), `${name} @${w}: clipped below the viewport`); }
  }
  const shell = `<html lang="en" style="height:100%;overflow:hidden"><body style="margin:0;height:100%"><main style="height:100%;overflow-y:auto">${lower}</main></body></html>`;
  const ok = await screenWidths((await open(shell)).main, [1440]);
  assert.deepEqual(ok.results.map(x => [x.width, x.pass]), [[1440, true], [320, true]], 'a bounded app shell with an inner scroller still passes');
  const nested = `<html lang="en" style="height:100%;overflow:hidden"><body style="margin:0;height:100%"><div style="height:100%;overflow-y:auto"><main style="overflow-y:auto">${lower}</main></div></body></html>`;
  const ok2 = await screenWidths((await open(nested)).main, [1440]);
  assert.deepEqual(ok2.results.map(x => [x.width, x.pass]), [[1440, true], [320, true]], 'an unbounded wrapper inside a bounded scroller is held by the outer scroller');
}));

test('R15-A3: real Chrome: text faded by opacity on the element or an ancestor and raised by script fails integrity without JavaScript; opaque or slightly translucent text is unchanged (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const cases = [
    ['element opacity', '<p id="t" style="color:#000;opacity:.1">Revealed paragraph text</p>', 'document.getElementById("t").style.opacity = "1"'],
    ['ancestor opacity', '<section id="s" style="opacity:.1"><p style="color:#000">Revealed paragraph text</p></section>', 'document.getElementById("s").style.opacity = "1"'],
    ['ancestor with its own background', '<section id="s" style="opacity:.1;background:#000"><p style="color:#fff">Revealed paragraph text</p></section>', 'document.getElementById("s").style.opacity = "1"'],
  ];
  for (const [name, body, script] of cases) {
    const html = `<html lang="en"><body style="background:#fff"><main><h1>Title</h1>${body}</main><script>${script}</script></body></html>`;
    const onPage = await open(html), offPage = await open(html, false);
    const on = await onPage.probe.evaluate(contrastProbe), off = await offPage.probe.evaluate(contrastProbe);
    assert.equal(on.contrastFailures, 0, `${name}: scripted, readable`);
    assert.equal(off.contrastFailures, 1, `${name}: JavaScript off, the faded text is counted`);
    assert.equal(off.contrastChecked, on.contrastChecked, `${name}: the same text is measured both ways`);
    const content = await onPage.probe.evaluate(contentProbe);
    const r = compareIntegrity({ probe: run(on, content), page: run(on, content), jsOff: run(off, content), tamperSigns: [], scope });
    assert.deepEqual([r.status, r.mismatches[0]?.check, r.mismatches[0]?.source], ['integrity mismatch', 'contrastFailures', 'js-off'], name);
  }
  const steady = await (await open('<html lang="en"><body style="background:#fff"><main><h1>Title</h1><p style="color:#000;opacity:.9">Slightly translucent text</p><section style="background:#123;opacity:.95"><p style="color:#fff">Light on dark</p></section></main></body></html>', false)).probe.evaluate(contrastProbe);
  assert.deepEqual([steady.contrastFailures, steady.contrastUnknown], [0, 0], 'readable translucent text still passes');
  const blend = await (await open('<html lang="en"><body style="background:#fff"><main><h1>Title</h1><p style="color:#000;mix-blend-mode:difference">Blended text</p></main></body></html>', false)).probe.evaluate(contrastProbe);
  assert.equal(blend.contrastUnknown, 1, 'a blend mode cannot be resolved and is counted unknown');
}));
