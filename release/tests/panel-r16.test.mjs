// R16 (panel round 16, R16-GPT-01 and 02): real-Chrome regressions for the contrast and content probes. Each case was
// first run against the 5fe9101 sources and failed there at its assertion (test-results/r16/R16-*-before.log).
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
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
  const dir = mkdtempSync(join(tmpdir(), 'fannan-r16-'));
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

const page = (body, script = '') => `<html lang="en"><body style="background:#fff;margin:0"><main><h1>Title</h1>${body}</main>${script ? `<script>${script}</script>` : ''}</body></html>`;
const both = async (open, html) => {
  const on = await open(html), off = await open(html, false);
  const r = { on: await on.probe.evaluate(contrastProbe), off: await off.probe.evaluate(contrastProbe), onContent: await on.probe.evaluate(contentProbe), offContent: await off.probe.evaluate(contentProbe) };
  r.integrity = compareIntegrity({ probe: run(r.on, r.onContent), page: run(r.on, r.onContent), jsOff: run(r.off, r.offContent), tamperSigns: [], scope });
  return r;
};

test('R16-GPT-01: real Chrome: filters, blend modes, backdrop filters and masks on the text or any ancestor are resolved or unknown, never a silent pass (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const results = {};
  // filter opacity() is resolved like opacity: a filter-faded reveal fails without JavaScript (contrast mismatch)
  const fade = await both(open, page('<p id="t" style="color:#000;filter:opacity(.1)">Filter faded reveal text</p>', 't.style.filter = "none"'));
  results.filterOpacity = [fade.on.contrastFailures, fade.off.contrastFailures, fade.integrity.status, fade.integrity.pass];
  // unresolvable effects are unknown and counted in contrastEffects; the cross-check is INCOMPLETE, never PASS
  const unresolved = {
    blur: page('<p id="t" style="color:#000;filter:blur(10px)">Blur-in reveal text</p>', 't.style.filter = "none"'),
    brightness: page('<section id="s" style="filter:brightness(4)"><p style="color:#000">Ancestor filter text</p></section>', 's.style.filter = "none"'),
    blendAboveOpaque: page('<section style="mix-blend-mode:screen"><div style="background:#000"><p style="color:#fff;margin:0;padding:20px">White on black, screen-blended</p></div></section>'),
    backdrop: page('<div style="backdrop-filter:blur(4px)"><p style="color:#000">Text over a backdrop filter</p></div>'),
    mask: page('<div style="mask-image:linear-gradient(transparent, #000)"><p style="color:#000">Masked text</p></div>'),
  };
  for (const [name, html] of Object.entries(unresolved)) {
    const r = await both(open, html);
    results[name] = [r.off.contrastEffects >= 1, r.off.contrastUnknown >= 1, r.integrity.status, r.integrity.pass];
  }
  // identity filters and a plain page stay measured and pass
  const plain = await both(open, page('<p style="color:#000;filter:opacity(1) brightness(1)">Plain readable text</p>'));
  results.identity = [plain.off.contrastEffects ?? 0, plain.off.contrastUnknown, plain.integrity.status, plain.integrity.pass];
  assert.deepEqual(results, {
    filterOpacity: [0, 1, 'integrity mismatch', false],
    blur: [true, true, 'INCOMPLETE', false], brightness: [true, true, 'INCOMPLETE', false], blendAboveOpaque: [true, true, 'INCOMPLETE', false],
    backdrop: [true, true, 'INCOMPLETE', false], mask: [true, true, 'INCOMPLETE', false],
    identity: [0, 0, 'PASS', true],
  });
}));

test('R16-GPT-02: real Chrome: native control text is contrast-checked and controls, labels and accessible names are compared with JavaScript off (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const results = {};
  // a submit input faded to .05 and restored by script: unreadable without JavaScript, a contrast mismatch
  const faded = await both(open, page('<input id="s" type="submit" value="Continue" style="opacity:.05;color:#000;background:#fff;border:1px solid #000">', 's.style.opacity = "1"'));
  results.fadedSubmit = [faded.on.contrastChecked, faded.on.contrastFailures, faded.off.contrastFailures, faded.integrity.mismatches.find(m => m.check === 'contrastFailures')?.source, faded.integrity.pass];
  // a placeholder in a light colour and a select's option text are measured
  const fields = await (await open(page('<input placeholder="Search the catalogue" style="color:#000;background:#fff"><style>input::placeholder{color:#ddd}</style><select style="color:#000;background:#fff"><option>First choice</option></select><textarea style="color:#000;background:#fff">Typed text</textarea>'), false)).probe.evaluate(contrastProbe);
  results.fields = [fields.contrastChecked, fields.contrastFailures];
  // text that only script supplies: a button value, a label, an aria-label and aria-labelledby text
  const scripted = {
    value: ['<input id="s" type="submit" value="">', 's.value = "Continue"'],
    label: ['<label id="l" for="e"></label><input id="e" type="email">', 'l.textContent = "Email address"'],
    ariaLabel: ['<button id="b" type="button"><svg width="16" height="16" aria-hidden="true"><rect width="16" height="16"/></svg></button>', 'b.setAttribute("aria-label", "Close dialog")'],
    labelledby: ['<span id="n"></span><button type="button" aria-labelledby="n"><svg width="16" height="16" aria-hidden="true"><rect width="16" height="16"/></svg></button>', 'n.textContent = "Open menu"'],
  };
  for (const [name, [body, script]] of Object.entries(scripted)) {
    const r = await both(open, page(body, script));
    results[name] = [r.integrity.mismatches.some(m => m.check === 'content' && m.source === 'js-off'), r.integrity.pass];
  }
  const same = await both(open, page('<label for="e">Email address</label><input id="e" type="email"><input type="submit" value="Continue">'));
  results.stable = [same.integrity.status, same.integrity.pass, same.onContent.controls?.map(c => c[1])];
  assert.deepEqual(results, {
    fadedSubmit: [2, 0, 1, 'js-off', false],
    fields: [4, 1],
    value: [true, false], label: [true, false], ariaLabel: [true, false], labelledby: [true, false],
    stable: ['PASS', true, ['Email address', 'Continue']],
  });
}));
