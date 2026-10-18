// R22 (panel round 22): real-Chrome regressions for Fadel's R22 tiebreaks. Text over images is graded in three zones on
// the faintest real glyph cluster: (a) clearly at or above AA passes (a text-shadow halo is the text's background,
// R22-MIMAR-01; opacity is measured, not refused, R22-GPT-01), (b) clearly below 3:1 fails whatever the review says (thin
// letters are kept at 12 and 14 px, R22-GPT-02), (c) between, or unmeasurable, needs a PASS wcag-review that cites the
// screenshot and names the worst region checked. Width screen: fallback content of video, audio, object and canvas is
// not text on screen (R22-GPT-03); content prints are typed, `text:` for text and `role:name` for a control, so an icon
// link, an aria-labelledby checkbox and a button are content in their own right and a heading cannot stand in for a
// button (R22-GPT-04, R22-GPT-05); a control whose shown label shortens to a prefix or abbreviation of its 1440 name is
// not lost (R22-MIMAR-02, P3); a read-more expanded state must show every text print of the clamped box (R22-GPT-06).
// The content-visibility and popover regressions cover R21-MIMAR-02 (R22-GPT-07 noted them missing); they pass at
// d9e1049 and fail against the 700297d sources. Each other test was first run against the d9e1049 sources and failed
// there at its assertion (test-results/r22/R22-*-before.log).
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
  const dir = mkdtempSync(join(tmpdir(), 'fannan-r22-'));
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

const ws = await import('../tools/width-screen.mjs');
// states: { stateName: html }; the overall result after resolving reveals, truncations and losses across the declared states
const gateOf = open => async (states, dir = 'ltr') => {
  const scopes = []; for (const [state, html] of Object.entries(states)) scopes.push({ scope: { screen: 'home', state, lang: dir === 'rtl' ? 'ar' : 'en' }, widths: await ws.screenWidths((await open(html)).main, [1440], null) });
  const r = ws.resolveReveals(scopes);
  const rules = [...new Set(scopes.flatMap(s => s.widths.results.flatMap(x => [...x.clipped.filter(c => !c.revealedBy).map(c => c.rule), ...(x.offscreenLeft.length ? ['offscreenLeft'] : []), ...((x.lost || []).filter(l => !l.reachableIn).length ? ['not shown at this width'] : [])])))].sort();
  if (process.env.DUMP) console.log(JSON.stringify(Object.keys(states)), JSON.stringify(scopes.map(s => s.widths.results.map(x => [x.width, x.clipped, x.lost, x.offscreenLeft]))).slice(0, 3000));
  return { pass: r.pass && scopes.every(s => s.widths.pass), rules };
};
const img = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000"><rect width="1600" height="1000" fill="#7a9"/><circle cx="800" cy="500" r="300" fill="#345"/></svg>');

// the page each 'l' element is hidden below 600 px and each 's' element above it (the panel's repro pattern)
const LS = '<style>@media (max-width:600px){.l{display:none}}@media (min-width:601px){.s{display:none}}</style>';
const svgBand = (fill, patch, width) => `background:url('data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="200"><rect width="1200" height="200" fill="${fill}"/>${patch ? `<rect width="${width}" height="200" fill="${patch}"/>` : ''}</svg>`)}')`;
// one contrast-incomplete element (#t) measured as pre-handoff-check measures it, then resolved with three reviews
const zones = async (open, html) => {
  const r = {};
  for (const js of [true, false]) {
    const { probe } = await open(html, js);
    const paths = await visibility.contrastPaths(probe, [{ id: 'color-contrast', nodes: [{ target: ['#t'] }] }]);
    r[js ? 'on' : 'off'] = { vis: await visibility.visibilityScan(probe), glyph: await visibility.glyphContrast(probe, paths.map(p => p.path)), paths };
  }
  const resolve = review => visibility.resolveContrastIncomplete({ incomplete: [{ id: 'color-contrast' }], paths: r.on.paths, integrity: { probeWorld: { visibility: r.on.vis }, jsOff: { visibility: r.off.vis }, glyph: { scripted: r.on.glyph, jsOff: r.off.glyph } }, review, shots: ['shot.png'] }).pass;
  const cited = { id: 'wcag-review', decision: 'PASS', artifact: 'shot.png', note: 'checked shot.png' };
  return { noReview: resolve(null), cited: resolve(cited), citedWithRegion: resolve({ ...cited, worstRegion: 'first words over the lightest part of the image' }) };
};
const PASS = { noReview: true, cited: true, citedWithRegion: true }, FAIL = { noReview: false, cited: false, citedWithRegion: false }, MIDDLE = { noReview: false, cited: false, citedWithRegion: true };

test('R22-GPT-01, R22-MIMAR-01, R22-GPT-02: real Chrome: three zones on the faintest glyph cluster: a 70% opacity caption (on the text, a span or an ancestor) and a white hero with a strong dark halo pass; a weak shadow, a faint translucent caption and thin letters at 12 and 14 px over a light patch fail whatever the review; grey text just at AA needs a review naming the worst region (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const dark = svgBand('#1e2a33');
  const cap = (style, inner = 'Seventy percent caption over a dark photo', wrap = '') => W(`<div style="position:relative;width:1200px;height:200px;${dark};${wrap}"><p id="t" style="position:absolute;top:70px;left:8px;margin:0;font-size:28px;color:#fff;${style}">${inner}</p></div>`);
  const thin = size => W(`<div style="position:relative;width:1200px;height:200px;${svgBand('#1e2a33', '#e6e6e6', size === 12 ? 16 : 22)}"><p id="t" style="position:absolute;top:70px;left:4px;margin:0;font-size:${size}px;color:#fff">ill fill lilt and the rest sits on the dark area of the photo</p></div>`);
  const light = 'background:linear-gradient(90deg,#eee,#bbb)';
  const cases = {
    opacityText: cap('opacity:.7'),
    opacitySpan: W(`<div style="position:relative;width:1200px;height:200px;${dark}"><p style="position:absolute;top:70px;left:8px;margin:0;font-size:28px;color:#fff"><span id="t" style="opacity:.7">Seventy percent caption via a span</span></p></div>`),
    opacityAncestor: W(`<div style="position:relative;width:1200px;height:200px;${dark}"><div style="opacity:.7"><p id="t" style="position:absolute;top:70px;left:8px;margin:0;font-size:28px;color:#fff">Seventy percent caption via an ancestor</p></div></div>`),
    haloHero: W(`<div style="padding:24px;${light}"><p id="t" style="margin:0;font-size:48px;font-weight:700;color:#fff;text-shadow:0 0 6px #000,0 0 3px #000">A hero line with a halo</p></div>`),
    weakShadow: W(`<div style="padding:24px;${light}"><p id="t" style="margin:0;font-size:24px;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.25)">A caption with a weak shadow</p></div>`),
    faintOpacity: cap('opacity:.25'),
    thin12: thin(12), thin14: thin(14),
    greyAtAA: W('<p id="t" style="font-size:12px;color:#767676">Small grey text measured just at the AA floor.</p>'),
  };
  const out = {};
  for (const [name, html] of Object.entries(cases)) out[name] = await zones(open, html);
  assert.deepEqual(out, { opacityText: PASS, opacitySpan: PASS, opacityAncestor: PASS, haloHero: PASS, weakShadow: FAIL, faintOpacity: FAIL, thin12: FAIL, thin14: FAIL, greyAtAA: MIDDLE });
}));

test('R22-GPT-02: glyphRatio: punctuation size is relative to the font: a thin letter stem (1 px wide, tall) over a light patch is kept and fails, while dot-sized clusters on a solid background are dropped; zoneOf grades the three zones', () => {
  const img = (w, h, f) => { const rgb = new Uint8Array(w * h * 3); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) rgb.set(f(x, y), (y * w + x) * 3); return { width: w, height: h, rgb }; };
  // white 1x9 stems every 4 px over #222, the first three over a #e6e6e6 patch; 2x2 dots between them on the dark part
  const stem = (x, y) => y >= 2 && y < 11 && x % 4 === 0, dot = (x, y) => x >= 16 && y >= 12 && y < 14 && x % 4 >= 2, bg = x => (x < 12 ? [230, 230, 230] : [34, 34, 34]);
  const ink = (x, y) => stem(x, y) || dot(x, y);
  const off = img(80, 16, x => bg(x)), on = img(80, 16, (x, y) => (ink(x, y) ? [255, 255, 255] : bg(x)));
  const cover = { fontSize: 12, black: img(80, 16, (x, y) => (ink(x, y) ? [0, 0, 0] : bg(x))), white: img(80, 16, (x, y) => (ink(x, y) ? [255, 255, 255] : bg(x))) };
  const r = visibility.glyphRatio(on, off, cover);
  assert.ok(r.ratio !== null && r.ratio < 1.3, JSON.stringify(r));
  assert.equal(r.clusters, 20, JSON.stringify(r));
  assert.equal(typeof visibility.zoneOf, 'function');
  assert.deepEqual([visibility.zoneOf(2.5, 4.5), visibility.zoneOf(3.6, 4.5), visibility.zoneOf(4.54, 4.5), visibility.zoneOf(7.9, 4.5), visibility.zoneOf(3.4, 3), visibility.zoneOf(null, 4.5)], ['fail', 'incomplete', 'incomplete', 'pass', 'pass', 'incomplete']);
});

test('R22-GPT-03: real Chrome: fallback content inside video, audio, object and canvas is not rendered, so a cropped video or canvas with fallback text and an audio element pass, and the visibility backstop does not count fallback text; a real caption cut by the same crop still fails (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const crop = inner => W(`<div style="overflow:hidden;height:200px;max-width:900px;position:relative">${inner}</div><p>Body copy.</p>`);
  assert.deepEqual({
    video: await gate({ default: crop('<video muted style="display:block;width:100%;min-width:500px;aspect-ratio:16/10;background:#333">Your browser does not support this video.</video>') }),
    videoNested: await gate({ default: crop('<video muted style="display:block;width:100%;min-width:500px;aspect-ratio:16/10;background:#333"><p>Your browser does not support this video. <a href="film.mp4">Download the film</a>.</p></video>') }),
    canvas: await gate({ default: crop('<canvas width="1200" height="600" style="display:block;width:1200px">A chart of sales by quarter.</canvas>') }),
    audio: await gate({ default: W('<audio>Your browser does not support audio.</audio><p>Body copy.</p>') }),
    captionCut: await gate({ default: crop('<video muted style="display:block;width:100%;min-width:500px;aspect-ratio:16/10;background:#333">Fallback.</video><p style="position:absolute;top:185px;left:20px;margin:0;font-size:24px">A caption cut by the crop</p>') }),
  }, { video: { pass: true, rules: [] }, videoNested: { pass: true, rules: [] }, canvas: { pass: true, rules: [] }, audio: { pass: true, rules: [] }, captionCut: { pass: false, rules: ['partly clipped'] } });
  // the visibility backstop does not count fallback text as on-screen text either (it was unmeasured: no box)
  const vis = await visibility.visibilityScan((await open(crop('<video muted style="display:block;width:100%;min-width:500px;aspect-ratio:16/10;background:#333">Your browser does not support this video.</video>'))).probe);
  assert.deepEqual({ measured: vis.textMeasured, unmeasured: vis.textUnmeasured }, { measured: 2, unmeasured: 0 }); // the h1 and the body copy
}));

test('R22-GPT-04, R22-GPT-05: real Chrome: prints are typed: an icon-only link (aria-label), a checkbox named by aria-labelledby and a button hidden at 320 are lost even when the same words remain as text; a control shown at 320 under the same role and name passes (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const P = x => W(LS + x);
  assert.deepEqual({
    iconLink: await gate({ default: P('<nav><a href="/profile" aria-label="Your profile" class="l"><svg width="24" height="24" aria-hidden="true"><circle cx="12" cy="12" r="10"/></svg></a></nav><p>Body.</p>') }),
    iconLinkMoved: await gate({ default: P('<nav><a href="/profile" aria-label="Your profile" class="l"><svg width="24" height="24" aria-hidden="true"><circle cx="12" cy="12" r="10"/></svg></a><a href="/profile" class="s">Your profile</a></nav><p>Body.</p>') }),
    labelledBy: await gate({ default: P('<p id="a">Email me news</p><input type="checkbox" aria-labelledby="a"><p id="b">Email me offers</p><input type="checkbox" aria-labelledby="b" class="l">') }),
    buttonUnderHeading: await gate({ default: P('<h2>Subscribe</h2><form><label>Email <input type="email"></label> <button class="l">Subscribe</button></form>') }),
    buttonMoved: await gate({ default: P('<h2>Newsletter</h2><form><label>Email <input type="email"></label> <button class="l">Subscribe</button></form><button class="s">Subscribe</button>') }),
    linkText: await gate({ default: P('<p>Read the <a href="/terms" class="l">full terms</a>.</p><p class="s">See the full terms.</p>') }),
  }, {
    iconLink: { pass: false, rules: ['not shown at this width'] }, iconLinkMoved: { pass: true, rules: [] },
    labelledBy: { pass: false, rules: ['not shown at this width'] }, buttonUnderHeading: { pass: false, rules: ['not shown at this width'] },
    buttonMoved: { pass: true, rules: [] }, linkText: { pass: false, rules: ['not shown at this width'] },
  });
}));

test('R22-MIMAR-02 (P3): real Chrome: a control is not lost when its shown label shortens at a width while its accessible name stays, or when its shown label is a prefix or abbreviation of its 1440 name; a wordmark link left with no name, a different label and a reworded heading still fail (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const P = x => W(LS + x);
  assert.deepEqual({
    shortLabel: await gate({ default: P('<button><span class="l">Request a demo</span><span class="s">Demo</span></button>') }),
    sameName: await gate({ default: P('<button aria-label="Request a demo"><span class="l">Request a demo</span><span class="s">Demo</span></button>') }),
    abbreviation: await gate({ default: P('<a href="/pricing"><span class="l">Pricing and plans</span><span class="s">Pricing</span></a>') }),
    wordmark: await gate({ default: P('<a href="/"><img alt="" width="24" height="24" src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E"><span class="l">Northwind Studio</span></a><p>Body.</p>') }),
    otherLabel: await gate({ default: P('<button><span class="l">Request a demo</span><span class="s">Contact</span></button>') }),
    rewordedHeading: await gate({ default: P('<h2><span class="l">Everything you need to run payroll</span><span class="s">Run payroll</span></h2>') }),
  }, {
    shortLabel: { pass: true, rules: [] }, sameName: { pass: true, rules: [] }, abbreviation: { pass: true, rules: [] },
    wordmark: { pass: false, rules: ['not shown at this width'] }, otherLabel: { pass: false, rules: ['not shown at this width'] }, rewordedHeading: { pass: false, rules: ['not shown at this width'] },
  });
}));

test('R22-GPT-06: real Chrome: a read-more expanded state must show every text print of the clamped box: a clamp that cuts paragraph one and hides paragraph two fails when the expanded state shows only paragraph one, passes when it shows both; a control inside a clamp is never excused (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const p1 = 'First paragraph of the excerpt keeps going for long enough to wrap onto a third line inside the narrow column so the clamp cuts it.', p2 = 'Second paragraph with the cancellation terms.';
  const clamp = W(`<div style="max-width:260px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden"><p style="margin:0">${p1}</p><p style="margin:0">${p2}</p></div><button aria-expanded="false">Read more</button>`);
  const clampLink = W(`<div style="max-width:260px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden"><p style="margin:0">${p1} <a href="/story">Open the story</a></p></div><button aria-expanded="false">Read more</button>`);
  const exp = (...ps) => W(`<div style="max-width:260px">${ps.map(p => `<p style="margin:0">${p}</p>`).join('')}</div><button aria-expanded="true">Read less</button>`);
  assert.deepEqual({
    onlyFirst: await gate({ default: clamp, expanded: exp(p1) }),
    both: await gate({ default: clamp, expanded: exp(p1, p2) }),
    controlInClamp: await gate({ default: clampLink, expanded: W(`<div style="max-width:260px"><p style="margin:0">${p1} <a href="/story">Open the story</a></p></div><button aria-expanded="true">Read less</button>`) }),
  }, { onlyFirst: { pass: false, rules: ['truncated'] }, both: { pass: true, rules: [] }, controlInClamp: { pass: false, rules: ['partly clipped'] } });
}));

test('R22-GPT-07 (R21-MIMAR-02 regressions): real Chrome: content inside content-visibility:hidden and a closed popover is not on screen, so it is not off-screen or clipped content at 320; the same panel shown and pushed past the edge fails (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const links = '<a href="#a" style="display:block">Products</a><a href="#b" style="display:block">Contact</a>';
  const cv = hidden => W(`<p>Page copy.</p><div style="position:absolute;top:80px;left:-400px;width:300px;${hidden ? 'content-visibility:hidden' : ''}">${links}</div><nav>${links}</nav>`);
  const pop = (script = '') => W(`<button popovertarget="m">Menu</button><div id="m" popover style="margin:0;position:fixed;inset:auto;top:60px;left:-150px;width:240px">${links}</div><nav>${links}</nav><p>Page copy.</p>`, script);
  assert.deepEqual({
    contentVisibilityHidden: await gate({ default: cv(true) }),
    contentVisibilityShown: await gate({ default: cv(false) }),
    popoverClosed: await gate({ default: pop() }),
    popoverOpenCut: await gate({ default: pop('document.getElementById("m").showPopover()') }),
  }, { contentVisibilityHidden: { pass: true, rules: [] }, contentVisibilityShown: { pass: false, rules: ['offscreenLeft'] }, popoverClosed: { pass: true, rules: [] }, popoverOpenCut: { pass: false, rules: ['offscreenLeft'] } });
}));
