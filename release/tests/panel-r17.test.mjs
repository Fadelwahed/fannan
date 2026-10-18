// R17 (panel round 17): real-Chrome regressions for the rendered-visibility backstop (R17-MIMAR-01, R17-GPT-02,
// R17-MIMAR-02), the control value/name split (R17-GPT-01) and native copy screening (R17-GPT-03). Each case was
// first run against the 86e2a31 sources and failed there at its assertion (test-results/r17/R17-*-before.log).
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as integrity from '../tools/integrity.mjs';
import { designProbe } from '../tools/design-probe.mjs';
import { copySignals } from '../tools/copy-signals.mjs';

const { contentProbe, contrastProbe, compareIntegrity, VECTOR } = integrity;
const release = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const deps = process.env.FANNAN_DEPS || resolve(release, '..', 'runtime-deps');
const chrome = process.env.FANNAN_TEST_CHROME || '/usr/bin/google-chrome';
const haveChrome = existsSync(join(deps, 'node_modules/playwright-core')) && existsSync(chrome);
const skip = !haveChrome && 'test-only deps or local Chrome absent';
const withBrowser = async fn => {
  const { chromium } = createRequire(join(deps, 'node_modules/'))('playwright-core');
  const { isolatedPage } = await import('../tools/probe-world.mjs');
  const dir = mkdtempSync(join(tmpdir(), 'fannan-r17-'));
  const browser = await chromium.launch({ executablePath: chrome, args: ['--headless=new'] });
  const open = async (html, javaScriptEnabled = true) => {
    const file = join(dir, `p${Math.random().toString(36).slice(2)}.html`); writeFileSync(file, html);
    const ctx = await browser.newContext({ javaScriptEnabled, viewport: { width: 1440, height: 900 } });
    const main = await ctx.newPage(); await main.goto(pathToFileURL(file).href); await main.waitForLoadState('load'); await main.waitForTimeout(50);
    return { main, probe: await isolatedPage(main) };
  };
  try { await fn({ open }); } finally { await browser.close(); rmSync(dir, { recursive: true, force: true }); }
};
const widths = { 1440: 0, 320: 0 };
const base = Object.fromEntries(Object.entries(VECTOR).map(([k, t]) => [k, t === 'flag' ? false : t === 'text' ? '#123456' : t === 'widths' ? widths : t === 'coverage' ? 5 : 0]));
const scope = { screen: 'home', state: 'default', lang: 'en' };
const FIELDS = ['textMeasured', 'textObscured', 'textUnreadable', 'textUnmeasured', 'textHidden'];
// one rendering measured as pre-handoff-check measures it: the CSS contrast pass plus the visibility backstop
const measure = async pg => {
  const v = { ...base, ...await pg.evaluate(contrastProbe) };
  if (typeof integrity.visibilityScan === 'function') { const vis = await integrity.visibilityScan(pg); for (const k of FIELDS) v[k] = vis[k]; v.visibility = vis; }
  return { vector: v, content: await pg.evaluate(contentProbe) };
};
const both = async (open, html) => {
  const on = await measure((await open(html)).probe), off = await measure((await open(html, false)).probe);
  return { on, off, integrity: compareIntegrity({ probe: on, page: on, jsOff: off, tamperSigns: [], scope }) };
};
const page = (body, script = '', head = '') => `<html lang="en"><head>${head}</head><body style="background:#fff;margin:0;font:16px/1.5 sans-serif"><main style="padding:20px"><h1>Title</h1>${body}</main>${script ? `<script>${script}</script>` : ''}</body></html>`;
const loss = r => [...new Set(r.integrity.mismatches.filter(m => m.source === 'js-off').map(m => m.check))].sort();

test('R17-MIMAR-01/02, R17-GPT-02: real Chrome: text hidden by any CSS means with JavaScript off is caught by the rendered-visibility backstop (hit test and pixels), never PASS (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const cases = {
    clipPath: page('<p id="t" style="color:#000;clip-path:inset(0 100% 0 0)">Clip-path reveal text</p>', 't.style.clipPath = "none"'),
    scale: page('<p id="t" style="color:#000;transform:scale(.02)">Scale-in reveal text</p>', 't.style.transform = "none"'),
    whitePreloader: page('<p style="color:#000">Content under a preloader</p><div id="pl" style="position:fixed;inset:0;background:#fff"></div>', 'pl.remove()'),
    placeholderOpacity: page('<input id="g" style="font-size:24px;color:#000;background:#fff" placeholder="name@example.org">', 'g.classList.add("ok")', '<style>#g::placeholder{color:#000;opacity:.05}#g.ok::placeholder{opacity:1}</style>'),
    textFillColor: page('<p id="t" style="color:#000;-webkit-text-fill-color:transparent">Text-fill reveal</p>', 't.style.webkitTextFillColor = "currentColor"'),
    gradientFade: page('<div style="position:relative"><p style="color:#000;margin:0">First line of the article<br>second line<br>third line</p><div id="f" style="position:absolute;inset:0;background:linear-gradient(transparent,#fff 60%)"></div></div>', 'f.remove()'),
  };
  const results = {};
  for (const [name, html] of Object.entries(cases)) {
    const r = await both(open, html);
    // JavaScript on: everything readable and on top; JavaScript off: the lost text is obscured or unreadable
    results[name] = { onClean: r.on.vector.textObscured === 0 && r.on.vector.textUnreadable === 0 && r.on.vector.textMeasured > 0, offLost: (r.off.vector.textObscured ?? 0) + (r.off.vector.textUnreadable ?? 0) >= 1, status: r.integrity.status, pass: r.integrity.pass, visibilityLoss: loss(r).some(c => /^text(Obscured|Unreadable)$/.test(c)) };
  }
  const want = { onClean: true, offLost: true, status: 'integrity mismatch', pass: false, visibilityLoss: true };
  assert.deepEqual(results, Object.fromEntries(Object.keys(cases).map(k => [k, want])));
}));

// R18-MIMAR-01 changed the third case: text clipped to nothing by a box that cannot be scrolled, the same with JavaScript
// on and off, is not displayed (textHidden, graded through the declared states) instead of INCOMPLETE.
test('R17-MIMAR-01: real Chrome: text that is obscured or unreadable with JavaScript on fails; R18: text clipped to nothing in both renderings is not displayed (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const permanent = await both(open, page('<div style="position:relative"><p style="color:#000;margin:0">Covered by a fade<br>second line<br>third line</p><div style="position:absolute;inset:0;background:linear-gradient(transparent,#fff 60%)"></div></div>'));
  const faint = await both(open, page('<p style="color:#000;-webkit-text-fill-color:rgba(0,0,0,.08)">Faint text-fill colour</p>'));
  const clipped = await both(open, page('<div style="height:0;overflow:hidden"><p style="color:#000">Clipped to nothing</p></div>'));
  const pick = r => [r.integrity.status, r.integrity.pass, r.integrity.mismatches.some(m => m.source === 'rendered')];
  assert.deepEqual({ permanent: pick(permanent), faint: pick(faint), clipped: [clipped.integrity.status, clipped.integrity.pass, clipped.on.vector.textHidden >= 1 && clipped.on.vector.textUnmeasured === 0] },
    { permanent: ['integrity mismatch', false, true], faint: ['integrity mismatch', false, true], clipped: ['PASS', true, true] });
}));

test('R17: real Chrome: healthy pages and normal animations pass the backstop with JavaScript on and off (no false positives) (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const long = Array.from({ length: 20 }, (_, i) => `<section style="padding:40px 0;background:${i % 2 ? '#f4f4f4' : '#fff'}"><h2>Section ${i}</h2><p style="color:#555">Paragraph ${i} in grey on a light background.</p></section>`).join('');
  const healthy = page('<header style="position:sticky;top:0;background:#fff;padding:8px"><a href="#a">Home</a> <button aria-label="Open menu"><svg width="16" height="16" aria-hidden="true"><rect width="16" height="16"/></svg></button></header><p>Readable body copy with <a href="#b">a link</a> and <strong>bold</strong> text.</p><label for="e">Email</label> <input id="e" type="email" placeholder="you@example.org"> <select><option>One</option></select> <input type="submit" value="Send"> <button>Go</button> <button disabled>Unavailable</button> <span>Home</span> <span style="color:#767676">·</span> <span>Help</span><span style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Visually hidden label</span>' + long + '<footer style="background:#222;color:#eee;padding:20px">Footer text</footer>');
  const reveal = Array.from({ length: 8 }, (_, i) => `<p class="r" style="margin:160px 0">Reveal paragraph ${i}</p>`).join('');
  const animated = page('<span class="sp"></span><p class="k">Fade-in on load</p>' + reveal, 'const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && e.target.classList.add("in"))); document.querySelectorAll(".r").forEach(e => io.observe(e));', '<style>.r{opacity:0;transform:translateY(20px);transition:opacity .6s,transform .6s}.r.in{opacity:1;transform:none}@keyframes fi{from{opacity:0}to{opacity:1}}.k{animation:fi .8s}@keyframes spin{to{transform:rotate(360deg)}}.sp{display:inline-block;width:10px;height:10px;border:2px solid #000;animation:spin 1s linear infinite}</style><noscript><style>.r{opacity:1;transform:none}</style></noscript>');
  // patterns from a real site ('real' adds one paragraph by script, so JavaScript off measures one fewer): a skip
  // link above or left of the page, a closed details menu, a display:none mobile
  // menu with a labelled button, a script-driven (requestAnimationFrame) scroll reveal and content that grows the page
  const real = page('<a href="#m" style="position:absolute;top:-40px;left:0;background:#000;color:#fff">Skip to content</a><a href="#m" style="position:absolute;left:-9999px">Skip again</a><details><summary>Menu</summary><nav aria-label="Main"><a href="#x">Hidden link</a></nav></details><div style="display:none"><button aria-label="Close menu">x</button></div>' + Array.from({ length: 6 }, (_, i) => `<p class="tw" style="margin:200px 0;opacity:0">Tweened paragraph ${i}</p>`).join('') + '<div id="more"></div>', 'const tween = e => { const t0 = performance.now(); const step = t => { const k = Math.min(1, (t - t0) / 700); e.style.opacity = String(k); e.style.transform = `translateY(${20 * (1 - k)}px)`; if (k < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); }; const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); tween(e.target); } })); document.querySelectorAll(".tw").forEach(e => io.observe(e)); document.getElementById("more").innerHTML = "<p style=\\"margin-top:1500px\\">Late content at the end</p>";', '<noscript><style>.tw{opacity:1 !important}</style></noscript>');
  const results = {};
  for (const [name, html] of Object.entries({ healthy, animated, real })) {
    const r = await both(open, html);
    results[name] = { measured: r.on.vector.textMeasured > 0 && r.off.vector.textMeasured === r.on.vector.textMeasured - (name === 'real' ? 1 : 0), problems: [...(r.on.vector.visibility?.items || []), ...(r.off.vector.visibility?.items || [])], status: r.integrity.status };
  }
  assert.deepEqual(results, { healthy: { measured: true, problems: [], status: 'PASS' }, animated: { measured: true, problems: [], status: 'PASS' }, real: { measured: true, problems: [], status: 'PASS' } });
}));

test('R17-GPT-02, R17-MIMAR-02: real Chrome: the CSS pass composites placeholder opacity and reads the text-fill colour (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const ph = await (await open(page('<input style="color:#000;background:#fff;font-size:16px" placeholder="name@example.org">', '', '<style>input::placeholder{color:#000;opacity:.05}</style>'))).probe.evaluate(contrastProbe);
  const fill = await (await open(page('<p style="color:#000;-webkit-text-fill-color:rgba(0,0,0,.12)">Faint fill</p>'))).probe.evaluate(contrastProbe);
  const plain = await (await open(page('<input style="color:#000;background:#fff" placeholder="name@example.org"><p style="color:#000">Plain</p>', '', '<style>input::placeholder{color:#333}</style>'))).probe.evaluate(contrastProbe);
  assert.deepEqual({ ph: ph.contrastFailures, fill: fill.contrastFailures, plain: plain.contrastFailures }, { ph: 1, fill: 1, plain: 0 });
}));

test('R17-GPT-01: real Chrome: a control\'s displayed value and its accessible name are compared separately with JavaScript on and off (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const r = await both(open, page('<input id="g" type="submit" aria-label="Start now" value="" style="font-size:24px">', 'g.value = "Start now"'));
  const control = c => c.controls.find(x => x[0] === 'input:submit');
  assert.deepEqual({ on: control(r.on.content), off: control(r.off.content), contentLoss: loss(r).includes('content'), pass: r.integrity.pass },
    { on: ['input:submit', 'Start now', 'Start now'], off: ['input:submit', 'Start now', ''], contentLoss: true, pass: false });
}));

test('R17-GPT-03: real Chrome: button values, placeholders, option labels and accessible names reach the placeholder and filler screens (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const screen = async body => { const d = await (await open(page(body))).probe.evaluate(designProbe); return { placeholders: d.placeholders, filler: copySignals(d.visibleText, d.headlines).filler }; };
  assert.deepEqual({
    placeholder: await screen('<input placeholder="[placeholder]">'),
    lorem: await screen('<input placeholder="Lorem ipsum dolor sit amet">'),
    option: await screen('<select><option>TBD</option></select>'),
    value: await screen('<input type="submit" value="Unlock seamless growth">'),
    name: await screen('<button aria-label="Empower your team"><svg width="16" height="16" aria-hidden="true"></svg></button>'),
    clean: await screen('<input placeholder="you@example.org"><input type="submit" value="Send"><select><option>Basic plan</option></select>'),
  }, {
    placeholder: { placeholders: true, filler: false }, lorem: { placeholders: true, filler: false }, option: { placeholders: true, filler: false },
    value: { placeholders: false, filler: true }, name: { placeholders: false, filler: true }, clean: { placeholders: false, filler: false },
  });
}));
