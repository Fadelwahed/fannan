// R14 (panel round 14, R14-GPT-01 to 06): regressions for the gate items. Each real-Chrome case was first run against
// the 7fc0d6f sources and failed there at its assertion (test-results/r14/R14-*-before.log).
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { screenWidths } from '../tools/width-screen.mjs';
import * as integrity from '../tools/integrity.mjs';

const { contentProbe, contrastProbe, compareIntegrity, VECTOR } = integrity;
const release = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const deps = process.env.FANNAN_DEPS || resolve(release, '..', 'runtime-deps');
const chrome = process.env.FANNAN_TEST_CHROME || '/usr/bin/google-chrome';
const haveChrome = existsSync(join(deps, 'node_modules/playwright-core')) && existsSync(chrome);
const skip = !haveChrome && 'test-only deps or local Chrome absent';
const withBrowser = async fn => {
  const { chromium } = createRequire(join(deps, 'node_modules/'))('playwright-core');
  const { isolatedPage } = await import('../tools/probe-world.mjs');
  const dir = mkdtempSync(join(tmpdir(), 'fannan-r14-'));
  const browser = await chromium.launch({ executablePath: chrome, args: ['--headless=new'] });
  // a page file opened with JavaScript on and off, measured in the isolated probe world as the checker does
  const open = async (html, javaScriptEnabled = true, viewport = { width: 1440, height: 900 }) => {
    const file = join(dir, `p${Math.random().toString(36).slice(2)}.html`); writeFileSync(file, html);
    const ctx = await browser.newContext({ javaScriptEnabled, viewport });
    const main = await ctx.newPage(); await main.goto(pathToFileURL(file).href); await main.waitForLoadState('load'); await main.waitForTimeout(50);
    return { main, probe: await isolatedPage(main) };
  };
  try { await fn({ browser, open }); } finally { await browser.close(); rmSync(dir, { recursive: true, force: true }); }
};
const widths = { 1440: 0, 320: 0 };
const vector = Object.fromEntries(Object.entries(VECTOR).map(([k, t]) => [k, t === 'flag' ? false : t === 'text' ? '#123456' : t === 'widths' ? widths : t === 'coverage' ? 5 : 0]));
const run = (v, c) => ({ vector: { ...vector, ...v }, content: c });
const scope = { screen: 'home', state: 'default', lang: 'en' };

test('R14-GPT-01: real Chrome: a display:contents or zero-size copy slot filled by script is compared by its text; empty without JavaScript is INCOMPLETE (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const html = '<html lang="en"><body><main><h1>Title</h1><p data-copy-slot="lede" style="display:contents"></p><div data-copy-slot="hero" style="width:0;height:0;white-space:nowrap"></div></main><script>document.querySelector("[data-copy-slot=lede]").textContent = "Approved lede"; document.querySelector("[data-copy-slot=hero]").textContent = "Approved hero";</script></body></html>';
  const on = await (await open(html)).probe.evaluate(contentProbe), off = await (await open(html, false)).probe.evaluate(contentProbe);
  assert.deepEqual(on.slots, [['hero', 'Approved hero'], ['lede', 'Approved lede']], 'the scripted slots are rendered (text ranges), so they are recorded with their text');
  assert.deepEqual(off.slots, [], 'empty without JavaScript');
  const r = compareIntegrity({ probe: run({}, on), page: run({}, on), jsOff: run({}, off), tamperSigns: [], scope });
  assert.deepEqual([r.status, r.pass], ['INCOMPLETE', false]);
}));

test('R14-GPT-02: real Chrome: contrast covers open (declarative) shadow roots; white-on-white shadow text only without JavaScript fails integrity (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const html = '<html lang="en"><body style="background:#fff"><main><h1>Title</h1><div id="host"><template shadowrootmode="open"><p id="t" style="color:#fff">Shadow paragraph text</p></template></div></main><script>document.getElementById("host").shadowRoot.getElementById("t").style.color = "#111";</script></body></html>';
  const on = await (await open(html)).probe.evaluate(contrastProbe), off = await (await open(html, false)).probe.evaluate(contrastProbe);
  assert.equal(on.contrastFailures, 0, 'scripted: readable');
  assert.equal(off.contrastFailures, 1, 'JavaScript off: the shadow text is white on white and is counted');
  assert.equal(off.contrastChecked, on.contrastChecked, 'the same text is measured both ways');
  const content = { slots: [], headings: [[1, 'Title']], h1: 1, lang: 'en', dir: 'ltr' };
  const r = compareIntegrity({ probe: run(on, content), page: run(on, content), jsOff: run(off, content), tamperSigns: [], scope });
  assert.deepEqual([r.status, r.mismatches[0]?.check, r.mismatches[0]?.source], ['integrity mismatch', 'contrastFailures', 'js-off']);
}));

test('R14-GPT-03: real Chrome: a closed shadow root that exists only at 320 px is an unscanned scope at 320 (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const html = '<html lang="en"><body style="margin:0"><main><h1>Title</h1></main><script>const mq = matchMedia("(max-width: 400px)"); const f = () => { const old = document.getElementById("narrow"); if (mq.matches && !old) { const h = document.createElement("div"); h.id = "narrow"; document.body.append(h); h.attachShadow({ mode: "closed" }).innerHTML = "<p>narrow only</p>"; } else if (!mq.matches && old) old.remove(); }; mq.addEventListener("change", f); f();</script></body></html>';
  const { main } = await open(html);
  const r = await screenWidths(main, [1440]);
  const at = w => r.results.find(x => x.width === w);
  assert.deepEqual(at(1440).unscannedScopes, [], 'no closed root at 1440');
  assert.deepEqual(at(320).unscannedScopes.map(s => s.src), ['closed shadow root'], 'counted after the resize to 320');
  assert.deepEqual([at(1440).pass, at(320).pass, r.pass], [true, false, false]);
}));

test('R14-GPT-04: real Chrome: a root or propagated body that cannot scroll hides lower text at 1440 and 320; a real inner scroller is fine (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const lower = '<main><h1>Top</h1><div style="height:1500px"></div><p>Lower text nobody can reach</p></main>';
  const cases = [['html fixed-height hidden', `<html lang="en" style="height:100vh;overflow:hidden"><body style="margin:0">${lower}</body></html>`], ['body overflow hidden (propagated)', `<html lang="en"><body style="margin:0;overflow:hidden">${lower}</body></html>`], ['html overflow-y clip', `<html lang="en" style="overflow-y:clip"><body style="margin:0">${lower}</body></html>`]];
  for (const [name, html] of cases) {
    const { main } = await open(html);
    const r = await screenWidths(main, [1440]);
    for (const w of [1440, 320]) { const x = r.results.find(y => y.width === w); assert.equal(x.pass, false, `${name} @${w}`); assert.ok(x.clipped.some(c => c.viewport && c.y), `${name} @${w}: clipped below the viewport`); }
  }
  const shell = `<html lang="en" style="height:100%;overflow:hidden"><body style="margin:0;height:100%"><main style="height:100%;overflow-y:auto"><h1>Top</h1><div style="height:1500px"></div><p>Lower text in a scroller</p></main></body></html>`;
  const ok = await screenWidths((await open(shell)).main, [1440]);
  assert.deepEqual(ok.results.map(x => [x.width, x.pass]), [[1440, true], [320, true]], 'an app shell with an inner scroller still passes');
  const plain = await screenWidths((await open(`<html lang="en"><body style="margin:0">${lower}</body></html>`)).main, [1440]);
  assert.equal(plain.pass, true, 'a normally scrolling long page passes');
}));

test('R14-GPT-05: real Chrome: the reduced-motion snapshot sees timer-driven motion inside an open shadow root (test-only)', { skip }, async () => withBrowser(async ({ browser, open }) => {
  assert.equal(typeof integrity.motionSnapshot, 'function', 'the checker snapshots through integrity.motionSnapshot');
  const html = '<html lang="en"><body><main><h1>Title</h1><div id="m"></div></main><script>const r = document.getElementById("m").attachShadow({ mode: "open" }); r.innerHTML = \'<span style="display:inline-block;width:12px;height:12px;background:#000"></span>\'; let x = 0; setInterval(() => { x += 4; r.firstChild.style.transform = "translateX(" + x + "px)"; }, 50);</script></body></html>';
  const { probe } = await open(html);
  const s1 = await probe.evaluate(integrity.motionSnapshot); await probe.waitForTimeout(700); const s2 = await probe.evaluate(integrity.motionSnapshot);
  assert.ok(s1.some(v => v.includes('#shadow/SPAN:0')), 'shadow elements are keyed by composed path');
  assert.ok(integrity.motionChanges(s1, s2) > 0, 'the moving shadow span is counted');
  const still = await open('<html lang="en"><body><main><h1>Title</h1><div id="m"></div></main><script>document.getElementById("m").attachShadow({ mode: "open" }).innerHTML = "<span>still</span>";</script></body></html>');
  const a = await still.probe.evaluate(integrity.motionSnapshot); await still.probe.waitForTimeout(300); const b = await still.probe.evaluate(integrity.motionSnapshot);
  assert.equal(integrity.motionChanges(a, b), 0, 'a static shadow tree does not count');
}));
