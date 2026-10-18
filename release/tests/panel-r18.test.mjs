// R18 (panel round 18): real-Chrome regressions for the revised rendered-visibility backstop (R18-GPT-03 to 07,
// R18-MIMAR-01/02), the copy deck's separate accessible name (R18-GPT-01) and the option label (R18-GPT-02, P3).
// Missed cases must fail, false positives must PASS; the honest-pattern set of the round is re-run here. Each test was
// first run against the e0362e6 sources and failed there at its assertion (test-results/r18/R18-*-before.log).
import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as integrity from '../tools/integrity.mjs';
import { designProbe } from '../tools/design-probe.mjs';

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
  const dir = mkdtempSync(join(tmpdir(), 'fannan-r18-'));
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
const filler = n => Array.from({ length: n }, (_, i) => `<p>Paragraph ${i + 1} of ordinary body copy that explains the service in plain words.</p>`).join('');
const loss = r => [...new Set(r.integrity.mismatches.filter(m => m.source === 'js-off').map(m => m.check))].sort();
const problems = r => [...r.on.vector.visibility.items, ...r.off.vector.visibility.items].map(i => `${i.problem}: ${i.text || ''} ${i.reason || ''}`.trim());
const clean = r => ({ status: r.integrity.status, problems: problems(r) });

test('R18-GPT-03/07: real Chrome: a display:contents reveal and a partly clipped multi-line reveal lost with JavaScript off are integrity mismatches (lines measured from text ranges) (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const cases = {
    displayContents: page('<section id="s" style="clip-path:inset(0 100% 0 0)"><span style="display:contents">Display contents reveal text</span></section>', 's.style.clipPath = "none"'),
    partialClip: page('<p id="t" style="clip-path:inset(0 0 66% 0)">First line of three<br>Second line of three<br>Third line of three</p>', 't.style.clipPath = "none"'),
  };
  const out = {};
  for (const [name, html] of Object.entries(cases)) { const r = await both(open, html); out[name] = { onClean: r.on.vector.textUnreadable + r.on.vector.textObscured === 0, offUnreadable: r.off.vector.textUnreadable, status: r.integrity.status, loss: loss(r).includes('textUnreadable') }; }
  assert.deepEqual(out, { displayContents: { onClean: true, offUnreadable: 1, status: 'integrity mismatch', loss: true }, partialClip: { onClean: true, offUnreadable: 2, status: 'integrity mismatch', loss: true } });
}));

test('R18-GPT-04, R18-MIMAR-02: real Chrome: a faint translucent layer and light or thin weights that pass AA by colour are not failed by pixels; unresolved colours are still graded by pixels (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const layer = await both(open, page('<div style="position:relative;padding:20px"><p>Card text under a faint layer</p><div style="position:absolute;inset:0;background:rgba(255,255,255,.03)"></div></div>'));
  const thin = await both(open, page(['font:300 14px Lato;color:#767676', 'font:100 14px Lato;color:#595959', 'font:100 12px Lato;color:#767676', 'font:200 12px Lato;color:#767676', 'font:200 16px Inter;color:#767676', "font:200 16px 'Inter Tight';color:#767676", 'font:100 24px Inter;color:#767676', 'font:300 12px Inter;color:#767676', 'font:200 48px Lato;color:#767676'].map((s, i) => `<p style="${s}">Light weight sample ${i + 1} that passes AA by colour</p>`).join('')));
  // the CSS pass cannot resolve text over a gradient: there the pixels still grade readability (3:1)
  const unknown = await both(open, page('<section style="background:linear-gradient(#fff,#fafafa);padding:20px"><p style="color:#e4e4e4">Pale text over a gradient</p></section>'));
  assert.deepEqual({ layer: clean(layer), thin: clean(thin), unknown: [unknown.integrity.status, unknown.on.vector.textUnreadable, unknown.integrity.mismatches.some(m => m.check === 'textUnreadable' && m.source === 'rendered')] },
    { layer: { status: 'PASS', problems: [] }, thin: { status: 'PASS', problems: [] }, unknown: ['integrity mismatch', 1, true] });
}));

test('R18-GPT-05, R18-MIMAR-01: real Chrome: inner scroll panels are scrolled to their text; text clipped the same way in both renderings (carousel slides, collapsed accordions) is not displayed; the round\'s honest patterns pass (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const shell = '<!doctype html><html lang="en"><head><style>html,body{height:100%;overflow:hidden;margin:0;font:16px/1.5 sans-serif;background:#fff}main{height:100%;overflow:auto}</style></head><body><main><h1>App</h1>' + filler(30) + '</main></body></html>';
  const tabs = page('<nav style="overflow-x:auto;white-space:nowrap;width:600px">' + Array.from({ length: 14 }, (_, i) => `<a href="#" style="display:inline-block;padding:8px 16px">Category ${i + 1}</a>`).join('') + '</nav>' + filler(3));
  const carousel = page('<div style="overflow:hidden;width:800px"><div style="display:flex;width:2400px"><div style="width:800px;background:#eee;padding:20px">Slide one caption</div><div style="width:800px;padding:20px">Slide two caption</div><div style="width:800px;padding:20px">Slide three caption</div></div></div>' + filler(3));
  const autoplay = page('<div style="overflow:hidden;width:800px"><div id="t" style="display:flex;width:2400px;transition:transform .6s"><div style="width:800px;padding:20px">Slide one</div><div style="width:800px;padding:20px">Slide two</div><div style="width:800px;padding:20px">Slide three</div></div></div>' + filler(3), 'let i = 0; setInterval(() => { i = (i + 1) % 3; t.style.transform = `translateX(${-800 * i}px)`; }, 700);');
  const accordion = page('<button aria-expanded="false">Shipping questions</button><div style="max-height:0;overflow:hidden;transition:max-height .3s"><p>Answer text inside a collapsed accordion panel.</p></div>' + filler(3));
  const honest = {
    sticky: `<!doctype html><html lang="en"><body style="margin:0;font:16px/1.5 sans-serif;background:#fff"><header style="position:sticky;top:0;background:#fff;height:80px;border-bottom:1px solid #ddd;z-index:5"><a href="#">Home</a> <a href="#">About</a></header><main style="padding:40px"><h1>Title</h1>${filler(80)}</main></body></html>`,
    fixed: `<!doctype html><html lang="en"><body style="margin:0;font:16px/1.5 sans-serif;background:#fff"><header style="position:fixed;top:0;left:0;right:0;background:#fff;height:80px;z-index:5"><a href="#">Home</a></header><main style="padding:100px 40px"><h1>Title</h1>${filler(80)}</main></body></html>`,
    photoScrim: page('<section style="position:relative;height:600px;background:url(photo.png) center/cover"><div style="position:absolute;inset:0;background:rgba(0,0,0,.55)"></div><div style="position:relative;padding:80px;color:#fff"><h2 style="font-size:56px;margin:0">Headline over a photo</h2><p>Supporting line over the photo with a proper scrim.</p></div></section>'),
    imgScrim: page('<figure style="position:relative;margin:0"><img src="photo.png" alt="" style="display:block;width:100%;height:500px;object-fit:cover"><figcaption style="position:absolute;left:0;right:0;bottom:0;padding:32px;background:linear-gradient(transparent,rgba(0,0,0,.8));color:#fff;font-size:20px">Caption on an image with a gradient scrim</figcaption></figure>'),
    arabic: '<!doctype html><html lang="ar" dir="rtl"><body style="margin:40px;font:18px/1.8 sans-serif;background:#fff"><h1>عنوان الصفحة</h1><p>نَصٌّ عَرَبِيٌّ مُشَكَّلٌ بِالكامِلِ لِلتَّجْرِبَةِ</p><p>English inline 123 مع أرقام ٤٥٦</p><p>Emoji 😀 ✅ 🚀</p></body></html>',
    bigHeading: page('<h2 style="font-size:160px;line-height:1;margin:0">Huge display heading across lines and lines</h2>' + filler(3)),
    icons: page('<p>Read the <a href="#" style="text-decoration:underline">full report <svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" fill="none"/></svg></a> today.</p><button style="padding:8px"><svg width="16" height="16"><circle cx="8" cy="8" r="6" fill="#333"/></svg> Save</button><button aria-label="Close" style="width:32px;height:32px;padding:0"><svg width="16" height="16"><path d="M3 3l10 10M13 3L3 13" stroke="#111" stroke-width="2"/></svg></button>'),
    badge: page('<div style="position:relative;width:400px;padding:24px;background:#f4f4f4"><span style="position:absolute;top:-10px;right:-10px;background:#c00;color:#fff;border-radius:12px;padding:2px 8px;font-size:12px">New</span><h3 style="margin:0">Card title</h3><p>Card body text sits here.</p></div>'),
    tooltip: page('<span style="position:relative">Help<span role="tooltip" style="position:absolute;top:100%;left:0;background:#111;color:#fff;padding:4px;opacity:0;visibility:hidden">Tooltip text</span></span>' + filler(2)),
    marquee: page('<div style="overflow:hidden;white-space:nowrap"><div style="display:inline-block;animation:m 10s linear infinite">Logos and partner names scrolling in a marquee strip</div></div><style>@keyframes m{to{transform:translateX(-50%)}}</style>' + filler(2)),
  };
  const out = {};
  for (const [name, html] of Object.entries({ shell, tabs, carousel, autoplay, accordion, ...honest })) { const r = await both(open, html); out[name] = { ...clean(r), hidden: r.on.vector.textHidden }; }
  const ok = hidden => ({ status: 'PASS', problems: [], hidden });
  assert.deepEqual(out, { shell: ok(0), tabs: ok(0), carousel: ok(2), autoplay: ok(2), accordion: ok(1), ...Object.fromEntries(Object.keys(honest).map(k => [k, ok(0)])) });
  // a fixed cookie banner that covers the last paragraph at every scroll position stays a true positive
  const banner = await both(open, page(filler(40) + '<div style="position:fixed;bottom:0;left:0;right:0;background:#111;color:#fff;padding:24px">We use cookies. <button>Accept</button></div>'));
  // the accordion that only script opens: more hidden text with JavaScript off is a js-off mismatch
  const opened = await both(open, page('<div id="a" style="max-height:0;overflow:hidden"><p>Answer that script opens</p></div>' + filler(2), 'a.style.maxHeight = "none"'));
  assert.deepEqual({ banner: [banner.integrity.status, banner.on.vector.textObscured], opened: [opened.integrity.status, opened.on.vector.textHidden, opened.off.vector.textHidden, loss(opened).includes('textHidden')] },
    { banner: ['integrity mismatch', 1], opened: ['integrity mismatch', 0, 1, true] });
}));

test('R18-GPT-06: real Chrome: text far down a long page and content added on scroll are reached; a scan that cannot finish is INCOMPLETE, never PASS (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const longStatic = await both(open, page('<div style="height:40000px"></div><p>Footer text far below the fold</p>'));
  const lazyHtml = page('<div style="height:40000px"></div><div id="s" style="height:1px"></div><footer id="f"></footer>', 'new IntersectionObserver(e => { if (e[0].isIntersecting) f.innerHTML = "<p>Lazy footer text</p>"; }).observe(s);');
  const lazy = await measure((await open(lazyHtml)).probe);
  // an endless list: every time the sentinel is near, another paragraph and spacer are appended
  const endless = await measure((await open(page('<div id="list"></div><div id="s" style="height:1px"></div>', 'let n = 0; new IntersectionObserver(() => { const p = document.createElement("p"); p.textContent = "Item " + (++n); p.style.marginBottom = "1200px"; list.append(p); }, { rootMargin: "200px" }).observe(s);'))).probe, { maxSteps: 25 });
  assert.deepEqual({
    longStatic: { ...clean(longStatic), measured: longStatic.on.vector.textMeasured },
    lazy: { problems: lazy.vector.visibility.items, measured: lazy.vector.textMeasured },
    endless: [endless.vector.textUnmeasured >= 1, endless.vector.visibility.items.some(i => /scan stopped|still added/.test(i.reason || ''))],
  }, { longStatic: { status: 'PASS', problems: [], measured: 2 }, lazy: { problems: [], measured: 2 }, endless: [true, true] });
}));

test('R18-GPT-01, R18-GPT-02: real Chrome: the copy deck approves displayed text and the accessible name separately, identical value and name count once; an option shows its label (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const deck = await import('../tools/copy-deck.mjs').catch(() => null);
  const slot = (id, text, extra = {}) => ({ id, text, ...extra });
  const run = async (body, slots) => deck ? (await (await open(page(body).replace('<h1>', '<h1 data-copy-slot="title">'))).probe.evaluate(deck.copyDeckProbe, { slots: [slot('title', 'Title'), ...slots], lang: 'en', dir: 'ltr' })).errors : null;
  const out = {
    module: typeof deck?.copyDeckProbe,
    sameValueAndName: await run('<input type="submit" data-copy-slot="button" value="Start" aria-label="Start">', [slot('button', 'Start')]),
    approvedName: await run('<button data-copy-slot="button" aria-label="Start the service">Start</button>', [slot('button', 'Start', { ariaLabel: 'Start the service' })]),
    approvedVariantName: await run('<button data-copy-slot="button" aria-label="Start the service">Start</button>', [slot('button', 'Start', { variants: [{ lang: 'en', dir: 'ltr', text: 'Start', ariaLabel: 'Start the service' }] })]),
    iconOnly: await run('<button data-copy-slot="close" aria-label="Close"><svg width="16" height="16" aria-hidden="true"></svg></button>', [slot('close', 'Close')]),
    unapprovedName: await run('<button data-copy-slot="button" aria-label="Start the service">Start</button>', [slot('button', 'Start')]),
    wrongName: await run('<button data-copy-slot="button" aria-label="Begin now">Start</button>', [slot('button', 'Start', { ariaLabel: 'Start the service' })]),
  };
  const d = await (await open(page('<select><option label="[placeholder]">Basic plan</option></select>'))).probe.evaluate(designProbe);
  assert.deepEqual({ ...out, optionLabel: d.placeholders }, {
    module: 'function', sameValueAndName: [], approvedName: [], approvedVariantName: [], iconOnly: [],
    unapprovedName: ['accessible name in slot button differs from deck (no ariaLabel approved): Start the service'],
    wrongName: ['accessible name in slot button differs from deck: Begin now'],
    optionLabel: true,
  });
}));
