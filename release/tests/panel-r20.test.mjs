// R20 (panel round 20): real-Chrome regressions for Mi'mar's clipping tiebreak (R20-GPT-01, R20-MIMAR-01: one rule
// based on states and widths, the 320 px floor restored), the faintest-text measure of the contrast resolver
// (R20-GPT-03), the JavaScript-off baseline of a script-only state (R20-GPT-05), the truncation-fade label (R20-GPT-02,
// P3) and text fingerprints for the requiresScript claim (R20-GPT-04, P3). Each test was first run against the b4747e3
// sources and failed there at its assertion (test-results/r20/R20-*-before.log).
import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as integrity from '../tools/integrity.mjs';
import * as visibility from '../tools/visibility.mjs';
import { screenWidths } from '../tools/width-screen.mjs';

const { contentProbe, contrastProbe, compareIntegrity, VECTOR } = integrity;
const release = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const deps = process.env.FANNAN_DEPS || resolve(release, '..', 'runtime-deps');
const chrome = process.env.FANNAN_TEST_CHROME || '/usr/bin/google-chrome';
const haveChrome = existsSync(join(deps, 'node_modules/playwright-core')) && existsSync(chrome);
const skip = !haveChrome && 'test-only deps or local Chrome absent';
// a noisy photograph stand-in (seeded random RGB noise with soft bands), as an 8-bit RGB PNG
const photo = () => {
  const w = 320, h = 200, raw = Buffer.alloc((w * 3 + 1) * h); let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3, base = 90 + 80 * Math.sin(x / 23) * Math.cos(y / 17); for (let c = 0; c < 3; c++) raw[o + c] = Math.max(0, Math.min(255, base + [40, 10, -20][c] + (rnd() - 0.5) * 120)); }
  const crc = b => { let c = ~0; for (const x of b) { c ^= x; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1; } return ~c >>> 0; };
  const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
};
const withBrowser = async fn => {
  const { chromium } = createRequire(join(deps, 'node_modules/'))('playwright-core');
  const { isolatedPage } = await import('../tools/probe-world.mjs');
  const dir = mkdtempSync(join(tmpdir(), 'fannan-r20-'));
  writeFileSync(join(dir, 'photo.png'), photo());
  const browser = await chromium.launch({ executablePath: chrome, args: ['--headless=new'] });
  const open = async (html, javaScriptEnabled = true) => {
    const file = join(dir, `p${Math.random().toString(36).slice(2)}.html`); writeFileSync(file, html);
    const ctx = await browser.newContext({ javaScriptEnabled, viewport: { width: 1440, height: 900 } });
    const main = await ctx.newPage(); await main.goto(pathToFileURL(file).href); await main.waitForLoadState('load'); await main.waitForTimeout(100);
    return { main, probe: await isolatedPage(main) };
  };
  try { await fn({ open }); } finally { await browser.close(); rmSync(dir, { recursive: true, force: true }); }
};
const widths = { 1440: 0, 320: 0 };
const base = Object.fromEntries(Object.entries(VECTOR).map(([k, t]) => [k, t === 'flag' ? false : t === 'text' ? '#123456' : t === 'widths' ? widths : t === 'coverage' ? 5 : 0]));
const scope = { screen: 'home', state: 'default', lang: 'en' };
const FIELDS = ['textMeasured', 'textObscured', 'textUnreadable', 'textUnmeasured', 'textHidden'];
// one rendering measured as pre-handoff-check measures it: the CSS contrast pass plus the visibility backstop
const measure = async (pg, opts) => {
  const v = { ...base, ...await pg.evaluate(contrastProbe) };
  const vis = await integrity.visibilityScan(pg, opts ? { ...integrity.VISIBILITY, ...opts } : undefined); for (const k of FIELDS) v[k] = vis[k] ?? 0; v.visibility = vis;
  return { vector: v, content: await pg.evaluate(contentProbe) };
};
const both = async (open, html) => {
  const on = await measure((await open(html)).probe), off = await measure((await open(html, false)).probe);
  return { on, off, integrity: compareIntegrity({ probe: on, page: on, jsOff: off, tamperSigns: [], scope }) };
};
const page = (body, script = '', head = '') => `<!doctype html><html lang="en"><head>${head}</head><body style="background:#fff;margin:0;font:16px/1.5 sans-serif"><main style="padding:20px"><h1>Title</h1>${body}</main>${script ? `<script>${script}</script>` : ''}</body></html>`;
const W = (body, script = '', dir = 'ltr') => `<!doctype html><html lang="${dir === 'rtl' ? 'ar' : 'en'}" dir="${dir}"><head></head><body style="background:#fff;margin:0;font:16px/1.5 sans-serif;color:#1a1a1a"><main style="padding:20px"><h1>${dir === 'rtl' ? 'عنوان' : 'Title'}</h1>${body}</main>${script ? `<script>${script}</script>` : ''}</body></html>`;

test('R20-GPT-01, R20-MIMAR-01: real Chrome: one clipping rule by states and widths: content shown at 1440 must stay shown at every width (320 included); content cut wholly at 1440 counts as not displayed only when a declared state shows it; partial cuts and content cut in every state fail (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const ws = await import('../tools/width-screen.mjs');
  const shot = async html => ws.screenWidths((await open(html)).main, [1440], null);
  // states: { stateName: html }; returns the overall result after resolving reveals across the declared states
  const gate = async (states, dir = 'ltr') => {
    const scopes = []; for (const [state, html] of Object.entries(states)) scopes.push({ scope: { screen: 'home', state, lang: dir === 'rtl' ? 'ar' : 'en' }, widths: await shot(html) });
    if (typeof ws.resolveReveals !== 'function') return { pass: scopes.every(s => s.widths.pass), rules: ['no resolveReveals'] };
    const r = ws.resolveReveals(scopes);
    return { pass: r.pass && scopes.every(s => s.widths.pass), rules: [...new Set(scopes.flatMap(s => s.widths.results.flatMap(x => x.clipped.filter(c => !c.revealedBy).map(c => c.rule))))].sort(), ...(process.env.DUMP ? { d: scopes.map(s => [s.widths.shownAt1440, s.widths.results.map(x => [x.width, x.clipped])]) } : {}) };
  };
  const acc = open1 => W(`<button aria-expanded="${open1}">Question</button><div style="${open1 ? '' : 'max-height:0;'}overflow:hidden">Bare answer text, no wrapper element.</div>`);
  const slides = (n, dir = 'ltr') => W(`<div style="overflow:hidden;max-width:600px"><div style="display:flex;width:300%;transform:translateX(${dir === 'rtl' ? '' : '-'}${n * 100 / 3}%)"><p style="flex:1 0 0;margin:0">${dir === 'rtl' ? 'الشريحة الأولى' : 'Slide one'}</p><p style="flex:1 0 0;margin:0">${dir === 'rtl' ? 'الشريحة الثانية' : 'Slide two'}</p><p style="flex:1 0 0;margin:0">${dir === 'rtl' ? 'الشريحة الثالثة' : 'Slide three'}</p></div></div>`, '', dir);
  const card = W('<div style="max-width:320px;height:90px;overflow:hidden;border:1px solid #ccc;padding:8px;box-sizing:border-box"><h3 style="margin:0 0 8px">Card title</h3><p style="margin:0 0 40px">Short line.</p><p style="margin:0">Important paragraph wholly below the fixed height.</p></div>');
  const table = W('<div style="overflow:hidden;width:100%"><table style="width:900px"><tr><th>Plan</th><th>Price</th><th>Seats</th><th>Support</th><th>Storage</th></tr><tr><td>Basic</td><td>$10</td><td>1</td><td>Email</td><td>10 GB</td></tr></table></div>');
  const nav = dir => W(`<nav style="overflow:hidden;white-space:nowrap;border:1px solid #ccc">${(dir === 'rtl' ? ['الرئيسية', 'الخدمات', 'الأسعار', 'دراسات الحالة', 'من نحن', 'الوظائف', 'اتصل بنا'] : ['Home', 'Services', 'Pricing', 'Case studies', 'About us', 'Careers', 'Contact']).map(t => `<a href="#x" style="display:inline-block;padding:8px 16px">${t}</a>`).join('')}</nav>`, '', dir);
  const out = {
    accordionDeclared: await gate({ default: acc(false), expanded: acc(true) }),
    accordionUndeclared: await gate({ default: acc(false) }),
    accordionPartly: await gate({ default: W('<div style="max-height:2em;overflow:hidden"><p style="margin:0">Line one<br>Line two<br>Line three</p></div>'), expanded: W('<div><p style="margin:0">Line one<br>Line two<br>Line three</p></div>') }),
    carouselMiddle: await gate({ default: slides(1), 'slide-1': slides(0), 'slide-3': slides(2) }),
    carouselUndeclared: await gate({ default: slides(1) }),
    cardBelowEdge: await gate({ default: card, hover: card }),
    table320: await gate({ default: table }),
    nav320: await gate({ default: nav('ltr') }),
    navRtl320: await gate({ default: nav('rtl') }, 'rtl'),
    carouselRtl: await gate({ default: slides(1, 'rtl'), 'slide-1': slides(0, 'rtl'), 'slide-3': slides(2, 'rtl') }, 'rtl'),
  };
  const lost = 'shown at 1440, lost at this width';
  // a nav link cut at 320 is either lost wholly or partly cut; both fail, neither may be read as a reveal
  const cutAt320 = r => ({ pass: false, rules: r.rules.length && r.rules.every(x => x === lost || x === 'partly clipped') ? r.rules : ['lost or partly clipped'] });
  if (process.env.DUMP) console.log(JSON.stringify(out));
  assert.deepEqual(out, {
    accordionDeclared: { pass: true, rules: [] }, accordionUndeclared: { pass: false, rules: ['reveal'] }, accordionPartly: { pass: false, rules: ['partly clipped'] },
    carouselMiddle: { pass: true, rules: [] }, carouselUndeclared: { pass: false, rules: ['reveal'] }, cardBelowEdge: { pass: false, rules: ['reveal'] },
    table320: { pass: false, rules: [lost] }, nav320: cutAt320(out.nav320), navRtl320: cutAt320(out.navRtl320), carouselRtl: { pass: true, rules: [] },
  });
}));

test('R20-GPT-03: real Chrome: the contrast resolver grades the faintest glyphs (p10 of glyph-cluster contrast against the local background): pale text over a light photo with one dark band stays blocked even with a PASS wcag-review; an honest scrim hero and dark text over a light gradient resolve (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const svg = encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="200"><rect width="800" height="200" fill="#f0f0f0"/><rect x="200" width="40" height="200" fill="#111"/></svg>');
  const block = (bg, colour, size = 24) => W(`<div style="position:relative;width:800px;height:200px;${bg}"><p id="t" style="position:absolute;top:80px;left:20px;margin:0;width:760px;font-size:${size}px;color:${colour}">Caption text over an image with some detail</p></div>`);
  const cases = {
    paleOverLightPhoto: block(`background:url('data:image/svg+xml,${svg}')`, '#d0d0d0'),
    scrimHero: W('<section style="position:relative;width:800px;height:240px;color:#fff"><img src="photo.png" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"><div style="position:absolute;inset:0;background:rgba(0,0,0,.6)"></div><p id="t" style="position:relative;margin:0;padding:48px;font-size:48px;font-weight:700">Over a photo</p></section>'),
    darkOverGradient: block('background:linear-gradient(90deg,#fff,#e8eef8)', '#1a1a1a', 18),
  };
  const review = { id: 'wcag-review', decision: 'PASS', artifact: 'shot.png' };
  const out = {};
  for (const [name, html] of Object.entries(cases)) {
    const r = {};
    for (const js of [true, false]) {
      const { probe } = await open(html, js);
      const paths = await visibility.contrastPaths(probe, [{ id: 'color-contrast', nodes: [{ target: ['#t'] }] }]);
      r[js ? 'on' : 'off'] = { vis: await visibility.visibilityScan(probe), glyph: visibility.glyphContrast ? await visibility.glyphContrast(probe, paths.map(p => p.path)) : null, paths };
    }
    const res = visibility.resolveContrastIncomplete({ incomplete: [{ id: 'color-contrast' }], paths: r.on.paths, integrity: { probeWorld: { visibility: r.on.vis }, jsOff: { visibility: r.off.vis }, glyph: { scripted: r.on.glyph, jsOff: r.off.glyph } }, review, shots: ['shot.png'] });
    const n = res.contrastNodes[0];
    out[name] = { pass: res.pass, faintBelowAA: typeof n.scripted === 'number' ? n.scripted < n.floor : null };
  }
  assert.deepEqual(out, { paleOverLightPhoto: { pass: false, faintBelowAA: true }, scrimHero: { pass: true, faintBelowAA: false }, darkOverGradient: { pass: true, faintBelowAA: false } });
}));

test('R20-GPT-03: glyphRatio: the 10th percentile of cluster contrast decides; nothing separable is INCOMPLETE (null)', () => {
  const img = (w, h, f) => { const rgb = new Uint8Array(w * h * 3); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) rgb.set(f(x, y), (y * w + x) * 3); return { width: w, height: h, rgb }; };
  // ten 5x5 glyphs: nine pale (#d0d0d0 over #f0f0f0), one over a dark band (#d0d0d0 over #111111)
  const glyph = (x, y) => y >= 1 && y < 6 && x % 6 >= 0 && x % 6 < 5;
  const bg = x => (x >= 54 ? [17, 17, 17] : [240, 240, 240]);
  const off = img(60, 7, x => bg(x)), on = img(60, 7, (x, y) => (glyph(x, y) ? [208, 208, 208] : bg(x)));
  assert.equal(typeof visibility.glyphRatio, 'function', 'glyphRatio exported');
  const r = visibility.glyphRatio(on, off);
  assert.equal(r.clusters, 10); assert.ok(r.ratio < 1.4 && r.max > 10, JSON.stringify(r));
  assert.equal(visibility.glyphRatio(off, off).ratio, null);
});

test('R20-GPT-05: real Chrome: a valid requiresScript state is compared with the default state\'s JavaScript-off rendering; content only the scripted state shows passes only as approved copy slots placed in that state (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const def = '<p data-copy-slot="intro">Intro copy</p><button data-copy-slot="start">Start</button>';
  const dialog = '<dialog id="d" data-copy-slot="dialog"><h2>Confirm the start</h2><p>Dialog body</p><button data-copy-slot="confirm">Confirm</button></dialog>';
  const offDefault = await measure((await open(W(def), false)).probe, { topLayer: false });
  const run = async (stateHtml, allowedSlots) => {
    const on = await measure((await open(stateHtml)).probe, { topLayer: true });
    const r = compareIntegrity({ probe: on, page: on, jsOff: offDefault, tamperSigns: [], scope: { screen: 'home', state: 'dialog-open', lang: 'en' }, baseline: { page: 'default.html', state: 'default', allowedSlots } });
    return { status: r.status, content: r.mismatches.some(m => m.check === 'content') };
  };
  assert.deepEqual({
    slotted: await run(W(def + dialog, 'd.showModal()'), ['dialog', 'confirm']),
    slotNotPlaced: await run(W(def + dialog, 'd.showModal()'), ['dialog']),
    unslottedExtra: await run(W(def + dialog, 'd.showModal(); const h = document.createElement("h2"); h.textContent = "Injected heading"; document.querySelector("main").prepend(h)'), ['dialog', 'confirm']),
  }, { slotted: { status: 'PASS', content: false }, slotNotPlaced: { status: 'INCOMPLETE', content: true }, unslottedExtra: { status: 'INCOMPLETE', content: true } });
}));

test('R20-GPT-04 (P3): real Chrome: the requiresScript claim compares text fingerprints, so a script that only shifts element indices cannot make a static state look script-only (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const check = async html => {
    const on = await measure((await open(html)).probe, { topLayer: true }), off = await measure((await open(html, false)).probe, { topLayer: true });
    const c = visibility.requiresScriptCheck({ declaration: { state: 'dialog-open', requiresScript: true, trigger: 'opens on click' }, integrity: { probeWorld: on.vector, jsOff: off.vector } });
    return { valid: c.valid, rendersWithoutScript: c.rendersWithoutScript };
  };
  assert.deepEqual({
    shifted: await check(W('<p>Static state text</p>', 'document.querySelector("main").prepend(document.createElement("div"))')),
    scripted: await check(W('<dialog id="d"><p>Dialog text</p></dialog>', 'd.showModal()')),
  }, { shifted: { valid: false, rendersWithoutScript: true }, scripted: { valid: true, rendersWithoutScript: false } });
}));

test('R20-GPT-02 (P3): real Chrome: a gradient veil over a card whose text fits is a cover graded by its pixels, not a truncation fade; a fade at the cut edge of overflowing text is still the truncation fade (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const scan = async html => { const v = (await measure((await open(html)).probe)).vector; return { hidden: v.textHidden > 0, flagged: v.textUnreadable + v.textObscured > 0 }; };
  assert.deepEqual({
    veil: await scan(W('<style>.c::after{content:"";position:absolute;inset:0;background:linear-gradient(rgba(255,255,255,.8),rgba(255,255,255,.9))}</style><div class="c" style="position:relative;overflow:hidden;padding:16px;width:400px"><p style="margin:0">Card text that fully fits inside the card.</p></div>')),
    fade: await scan(W('<style>.clamp{position:relative;max-height:4.5em;overflow:hidden}.clamp::after{content:"";position:absolute;left:0;right:0;bottom:0;height:3em;background:linear-gradient(transparent,#fff)}</style><div class="clamp" style="width:400px"><p style="margin:0">Line one of a long story that is truncated with a fade, line two continues, line three fades away, line four is cut, line five is cut too, and line six is never shown. The story goes on for several more lines that the clamp cuts: line seven, line eight, line nine and line ten are never shown.</p></div><button>Read more</button>')),
  }, { veil: { hidden: false, flagged: true }, fade: { hidden: false, flagged: false } }); // the clamp's cut lines are neither hidden elements nor flagged
}));
