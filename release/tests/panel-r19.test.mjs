// R19 (panel round 19): real-Chrome regressions for the width screen's hidden content (R19-GPT-01), covers the hit
// test cannot see (R19-GPT-02, R19-GPT-03 P3), lazy content inside an inner scrollport (R19-GPT-04), the resolver for
// automated colour-contrast incomplete results (R19-MIMAR-01), declared top-layer states (R19-MIMAR-02) and the copy
// deck's hidden aria-labelledby name (R19-GPT-05 P3). Missed cases must fail, false positives must PASS; the honest
// patterns of R18 and R19 are re-run here. Each test was first run against the 613f489 sources and failed there at its
// assertion (test-results/r19/R19-*-before.log).
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
  const dir = mkdtempSync(join(tmpdir(), 'fannan-r19-'));
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
const problems = r => [r.on.vector.visibility.items, r.off.vector.visibility.items];
const clean = r => ({ status: r.integrity.status, problems: problems(r).flat().map(i => `${i.problem}: ${i.text}`) });
const loss = r => ({ status: r.integrity.status, checks: [...new Set(r.integrity.mismatches.map(m => `${m.check}/${m.source}`))].sort() });
const W = (body, script = '') => page(body, script).replace('font:16px/1.5 sans-serif', 'font:16px/1.5 sans-serif;color:#1a1a1a');

test('R19-GPT-01 (as amended by R20-GPT-01): real Chrome: content clipped to nothing by a box that cannot scroll (a collapsed accordion, inactive carousel slides, text pushed past the start) is a reveal clip, which fails one state alone and is resolved only by a declared state that shows it (panel-r20.test.mjs); partly clipped text fails outright (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const at = async html => { const r = await screenWidths((await open(html)).main, [1440], null); return { pass: r.pass, passExceptReveal: r.passExceptReveal, rules: r.results.map(x => x.clipped.map(c => c.rule).join()) }; };
  const out = {
    accordion: await at(W('<button aria-expanded="false">Questions</button><div style="max-height:0;overflow:hidden"><p>Answer one, collapsed.</p><p>Answer two, collapsed.</p></div><button aria-expanded="true">Open question</button><div><p>Open answer.</p></div>')),
    carousel: await at(W('<div style="overflow:hidden;max-width:600px"><div style="display:flex;width:300%"><p style="flex:1 0 0">Slide one</p><p style="flex:1 0 0">Slide two</p><p style="flex:1 0 0">Slide three</p></div></div>')),
    partly: await at(W('<div style="height:30px;overflow:hidden"><p style="margin:0">Line one<br>Line two<br>Line three</p></div>')),
    rtlCarousel: await at(W('<div dir="rtl" style="overflow:hidden;max-width:600px"><div style="display:flex;width:300%"><p style="flex:1 0 0">الشريحة الأولى</p><p style="flex:1 0 0">الشريحة الثانية</p><p style="flex:1 0 0">الشريحة الثالثة</p></div></div>')),
    pushedPastStart: await at(W('<div style="overflow:hidden;width:300px"><p style="margin:0 0 0 -400px;white-space:nowrap">Pushed past the start</p></div>')),
    straddlingSlide: await at(W('<div style="overflow:hidden;max-width:600px"><div style="display:flex;width:160%"><p style="flex:1 0 0">Slide one</p><p style="flex:1 0 0">Slide two cut at the edge</p></div></div>')),
  };
  const reveal = { pass: false, passExceptReveal: true, rules: ['reveal', 'reveal'] }, partlyCut = { pass: false, passExceptReveal: false, rules: ['partly clipped', 'partly clipped'] };
  assert.deepEqual(out, { accordion: reveal, carousel: reveal, rtlCarousel: reveal, pushedPastStart: reveal, partly: partlyCut, straddlingSlide: partlyCut });
}));

test('R19-GPT-02, R19-GPT-03: real Chrome: a pseudo-element veil and a pointer-events:none veil are possible covers graded by pixels; a fade on a truncated block (text that overflows; R20-GPT-02), a decorative SVG wave and the R19 honest patterns PASS (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const veil = '<div style="position:absolute;inset:0;background:rgba(255,255,255,.7);pointer-events:none"></div>';
  const out = {
    pseudoVeilJs: loss(await both(open, W('<style>.loading{position:relative}.loading::after{content:"";position:absolute;inset:0;background:rgba(255,255,255,.8)}</style><div id="c" class="loading"><p>Card text under a loading veil a script removes.</p></div>', 'c.classList.remove("loading")'))),
    pseudoVeil: loss(await both(open, W('<style>.v{position:relative}.v::before{content:"";position:absolute;inset:0;background:rgba(255,255,255,.8)}</style><div class="v"><p>Card text under a stuck veil.</p></div>'))),
    peVeil: loss(await both(open, W(`<div style="position:relative"><p>Body text under a 70% white veil with pointer-events none.</p>${veil}</div>`))),
    peVeilJs: loss(await both(open, W(`<div style="position:relative"><p>Body text under a veil a script removes.</p>${veil.replace('<div', '<div id="v"')}</div>`, 'v.remove()'))),
    veil: loss(await both(open, W('<div style="position:relative"><p>Body text under a 70% white veil.</p><div style="position:absolute;inset:0;background:rgba(255,255,255,.7)"></div></div>'))),
  };
  const honest = {
    fade: clean(await both(open, W('<style>.clamp{position:relative;max-height:4.5em;overflow:hidden}.clamp::after{content:"";position:absolute;left:0;right:0;bottom:0;height:3em;background:linear-gradient(transparent,#fff)}</style><div class="clamp" style="width:400px"><p style="margin:0">Line one of a long story that is truncated with a fade, line two continues, line three fades away, line four is cut. The story goes on for several more lines that the clamp cuts: line five, line six, line seven and line eight are never shown.</p></div><button>Read more</button>'))),
    svgWave: clean(await both(open, W('<section style="position:relative"><p>Body text under a decorative wave drawn after it.</p><svg style="position:absolute;inset:0;width:100%;height:100%" viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M0 9 Q50 7 100 9 V10 H0z" fill="#eef"/></svg></section>'))),
    pngSticker: clean(await both(open, W('<section style="position:relative"><p>Body text near a small sticker image.</p><img src="photo.png" alt="" style="position:absolute;right:0;top:0;width:40px;height:40px"></section>'))),
    underlineAccent: clean(await both(open, W('<style>a.u{position:relative;color:#0b3d91}a.u::after{content:"";position:absolute;left:0;right:0;bottom:-2px;height:2px;background:#0b3d91}.card{position:relative;padding:16px}.card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:#0b3d91}</style><p><a class="u" href="#x">An underlined link</a></p><div class="card"><p>Card with an accent bar.</p></div>'))),
    behindScrim: clean(await both(open, W('<style>.hero{position:relative;padding:40px;color:#fff;background:#333}.hero::before{content:"";position:absolute;inset:0;background:rgba(0,0,0,.4);z-index:-1}</style><div class="hero" style="isolation:isolate"><p>Light text on a dark hero.</p></div>'))),
    stickyThead: clean(await both(open, W(`<div style="max-height:300px;overflow:auto"><table><thead style="position:sticky;top:0;background:#fff"><tr><th>Name</th><th>Value</th></tr></thead><tbody>${Array.from({ length: 20 }, (_, i) => `<tr><td>Row ${i + 1}</td><td>${i * 3}</td></tr>`).join('')}</tbody></table></div>`))),
  };
  assert.deepEqual({ ...out, honest }, {
    pseudoVeilJs: { status: 'integrity mismatch', checks: ['textUnreadable/js-off'] },
    pseudoVeil: { status: 'integrity mismatch', checks: ['textUnreadable/rendered'] },
    peVeil: { status: 'integrity mismatch', checks: ['textUnreadable/rendered'] },
    peVeilJs: { status: 'integrity mismatch', checks: ['textUnreadable/js-off'] },
    veil: { status: 'integrity mismatch', checks: ['textUnreadable/rendered'] },
    honest: Object.fromEntries(Object.keys(honest).map(k => [k, { status: 'PASS', problems: [] }])),
  });
}));

test('R19-GPT-04: real Chrome: content an IntersectionObserver adds at the end of an inner scrollport (an app panel) is collected and graded; honest lazy panel content PASS (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const shell = colour => `<!doctype html><html lang="en"><head><style>html,body{height:100%;overflow:hidden;margin:0;font:16px sans-serif;color:#1a1a1a;background:#fff}main{height:100%;overflow:auto;padding:0 40px;box-sizing:border-box}</style></head><body><main id="m"><h1>App panel</h1><p>Intro text.</p><div style="height:4000px"></div><div id="s" style="height:1px"></div><div id="f"></div></main><script>new IntersectionObserver(e=>{if(e[0].isIntersecting)f.innerHTML='<p style="color:${colour}">Lazy panel text</p>'},{root:m}).observe(s)</script></body></html>`;
  const light = await both(open, shell('#eee')), honest = await both(open, shell('#1a1a1a'));
  assert.deepEqual({ light: { ...loss(light), items: light.on.vector.visibility.items.map(i => `${i.problem}: ${i.text}`) }, honest: { ...clean(honest), measured: honest.on.vector.textMeasured } }, {
    light: { status: 'integrity mismatch', checks: ['textUnreadable/rendered'], items: ['unreadable: Lazy panel text'] },
    honest: { status: 'PASS', problems: [], measured: 3 },
  });
}));

test('R19-MIMAR-02: real Chrome: on a declared state, text made inert by a modal dialog or covered by an open popover is not graded and the dialog text is; a non-modal open dialog keeps covered text graded (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const run = async (html, topLayer) => { const v = await integrity.visibilityScan((await open(html)).probe, { ...integrity.VISIBILITY, topLayer }); return { obscured: v.textObscured, unreadable: v.textUnreadable, hidden: v.textHidden, measured: v.textMeasured }; };
  const modal = W('<p>Background paragraph behind a modal.</p><dialog id="d"><p>Dialog text</p></dialog>', 'd.showModal()');
  const lightModal = W('<p>Background paragraph behind a modal.</p><dialog id="d"><p style="color:#eee">Faint dialog text</p></dialog>', 'd.showModal()');
  const popover = W('<button popovertarget="p">Menu</button><div id="p" popover style="margin:0;top:60px;left:20px;padding:12px">Popover menu item</div><p>Paragraph below the trigger.</p>', 'p.showPopover()');
  const ariaModal = W('<p>Background paragraph behind a custom modal.</p><div role="dialog" aria-modal="true" style="position:fixed;inset:0;background:#fff;padding:40px"><p>Custom dialog text</p></div>');
  const nonModal = W('<p>Paragraph covered by a non-modal dialog.</p><dialog open style="position:absolute;top:60px;left:0;margin:0;width:600px;height:120px;background:#fff;border:0"><p>Non-modal dialog text</p></dialog>');
  assert.deepEqual({
    modal: await run(modal, true), lightModal: await run(lightModal, true), popover: await run(popover, true), ariaModal: await run(ariaModal, true), nonModal: await run(nonModal, true),
    modalUndeclared: await run(modal, false),
  }, {
    modal: { obscured: 0, unreadable: 0, hidden: 2, measured: 1 },
    lightModal: { obscured: 0, unreadable: 1, hidden: 2, measured: 0 },
    popover: { obscured: 0, unreadable: 0, hidden: 1, measured: 3 },
    ariaModal: { obscured: 0, unreadable: 0, hidden: 2, measured: 1 },
    nonModal: { obscured: 2, unreadable: 0, hidden: 0, measured: 1 },
    modalUndeclared: { obscured: 2, unreadable: 0, hidden: 0, measured: 1 },
  });
}));

test('R19-MIMAR-01: real Chrome: an automated colour-contrast incomplete result is resolved only for an element measured at AA in both renderings with a review record citing the screenshot (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const { readFileSync } = await import('node:fs');
  const req = createRequire(join(deps, 'node_modules/')), axeSrc = readFileSync(req.resolve('axe-core/axe.min.js'), 'utf8');
  const { axeOptions } = await import('../tools/axe-tags.mjs');
  const shot = '/evidence/home-en-default-1440.png', review = { id: 'wcag-review', decision: 'PASS', artifact: shot, note: 'text over the hero photo checked on the screenshot' };
  const hero = (scrim, colour = '#fff', script = '') => W(`<section id="h" style="position:relative;height:420px;color:${colour}"><img src="photo.png" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"><div style="position:absolute;inset:0;background:rgba(0,0,0,${scrim})"></div><div style="position:relative;padding:60px"><h2 style="font-size:56px;margin:0">Headline over a photo</h2><p>Supporting line over the photo.</p></div></section>`, script);
  const resolve19 = async (html, rev = review, extra = []) => {
    if (typeof visibility.resolveContrastIncomplete !== 'function') return 'no resolver';
    const r = await both(open, html), { main, probe } = await open(html);
    await main.addScriptTag({ content: axeSrc }); const a = await main.evaluate(async o => axe.run(document, o), axeOptions());
    const incomplete = [...a.incomplete, ...extra], paths = await visibility.contrastPaths(probe, incomplete);
    // R20-GPT-03: AA is graded on the faintest glyphs, measured per rendering as pre-handoff-check measures them
    const glyph = { scripted: await visibility.glyphContrast(probe, paths.map(x => x.path)), jsOff: await visibility.glyphContrast((await open(html, false)).probe, paths.map(x => x.path)) };
    const out = visibility.resolveContrastIncomplete({ incomplete, paths, integrity: { probeWorld: r.on.vector, jsOff: r.off.vector, glyph }, review: rev, shots: [shot] });
    return { incomplete: incomplete.map(v => v.id), unresolved: out.unresolved, reasons: [...new Set(out.contrastNodes.map(n => n.reason))] };
  };
  const ok = { incomplete: ['color-contrast'], unresolved: [], reasons: [null] };
  const out = {
    scrim: await resolve19(hero(0.6)),
    noReview: await resolve19(hero(0.6), null),
    otherArtifact: await resolve19(hero(0.6), { ...review, artifact: '/evidence/other.png', note: 'checked' }),
    noteCites: await resolve19(hero(0.6), { ...review, artifact: '/evidence/notes.md', note: 'checked on home-en-default-1440.png' }),
    darkText: await resolve19(hero(0.6, '#222')),
    scrimByScriptOnly: await resolve19(hero(0, '#fff', 'h.children[1].style.background = "rgba(0,0,0,.6)"')),
    otherRule: await resolve19(hero(0.6), review, [{ id: 'aria-valid-attr-value', nodes: [] }]),
  };
  assert.deepEqual(out, {
    scrim: ok,
    noReview: { incomplete: ['color-contrast'], unresolved: ['color-contrast'], reasons: ['no PASS wcag-review record citing the screenshot'] },
    otherArtifact: { incomplete: ['color-contrast'], unresolved: ['color-contrast'], reasons: ['no PASS wcag-review record citing the screenshot'] },
    noteCites: ok,
    darkText: { incomplete: ['color-contrast'], unresolved: ['color-contrast'], reasons: out.darkText.reasons?.length && out.darkText.reasons.every?.(x => /^faintest glyphs measured [\d.]+:1, below (4\.5|3):1$/.test(x)) ? out.darkText.reasons : ['below AA'] },
    scrimByScriptOnly: { incomplete: ['color-contrast'], unresolved: ['color-contrast'], reasons: out.scrimByScriptOnly.reasons?.some?.(x => /below/.test(x || '')) ? out.scrimByScriptOnly.reasons : ['below AA with JavaScript off'] },
    otherRule: { incomplete: ['color-contrast', 'aria-valid-attr-value'], unresolved: ['aria-valid-attr-value'], reasons: [null] },
  });
}));

test('R19-GPT-05: real Chrome: an accessible name taken by aria-labelledby from a hidden element is an accessible name to approve (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const { copyDeckProbe } = await import('../tools/copy-deck.mjs');
  const slot = (id, text, extra = {}) => ({ id, text, ...extra });
  const run = async (body, slots) => (await (await open(page(body).replace('<h1>', '<h1 data-copy-slot="title" id="ttl">'))).probe.evaluate(copyDeckProbe, { slots: [slot('title', 'Title'), ...slots], lang: 'en', dir: 'ltr' })).errors;
  const hidden = '<span id="lbl" hidden>Start the service</span><button data-copy-slot="button" aria-labelledby="lbl">Start</button>';
  assert.deepEqual({
    hiddenUnapproved: await run(hidden, [slot('button', 'Start')]),
    hiddenApproved: await run(hidden, [slot('button', 'Start', { ariaLabel: 'Start the service' })]),
    visibleRef: await run('<section aria-labelledby="ttl" data-copy-slot="body"><p>Body copy</p></section>', [slot('body', 'Body copy')]),
  }, { hiddenUnapproved: ['accessible name in slot button differs from deck (no ariaLabel approved): Start the service'], hiddenApproved: [], visibleRef: [] });
}));

test('R19b: real Chrome: a declared non-default state reachable only by script (requiresScript, trigger recorded) resolves a colour-contrast incomplete on the scripted rendering alone; the default state needs both renderings; a false claim is caught (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  if (typeof visibility.requiresScriptCheck !== 'function') return assert.fail('no requiresScriptCheck');
  const shot = '/evidence/home-en-dialog-open-1440.png', review = { id: 'wcag-review', decision: 'PASS', artifact: shot, note: 'dialog checked on the screenshot' };
  const modal = W('<p>Background paragraph behind a modal.</p><dialog id="d"><p>Dialog text at full contrast</p></dialog>', 'd.showModal()');
  const lightModal = W('<p>Background paragraph behind a modal.</p><dialog id="d"><p style="color:#999">Faint dialog text</p></dialog>', 'd.showModal()');
  const staticPage = W('<p>A state that renders without script.</p>');
  const incomplete = sel => [{ id: 'color-contrast', nodes: [{ target: [sel] }] }];
  const run = async (html, declaration, sel, rev = review) => {
    const on = await measure((await open(html)).probe, { topLayer: declaration.state !== 'default' }), off = await measure((await open(html, false)).probe, { topLayer: declaration.state !== 'default' });
    const integrityR = { probeWorld: on.vector, jsOff: off.vector }, claim = visibility.requiresScriptCheck({ declaration, integrity: integrityR });
    const onProbe = (await open(html)).probe, paths = await visibility.contrastPaths(onProbe, incomplete(sel));
    integrityR.glyph = { scripted: await visibility.glyphContrast(onProbe, paths.map(x => x.path)), jsOff: await visibility.glyphContrast((await open(html, false)).probe, paths.map(x => x.path)) }; // R20-GPT-03
    const r = visibility.resolveContrastIncomplete({ incomplete: incomplete(sel), paths, integrity: integrityR, review: rev, shots: [shot], scriptOnly: claim.valid });
    return { valid: claim.valid, rendersWithoutScript: claim.rendersWithoutScript, unresolved: r.unresolved, reason: r.contrastNodes[0]?.reason?.replace(/(\d\.\d)\d:/, '$1:') ?? null };
  };
  const dialogState = { state: 'dialog-open', requiresScript: true, trigger: 'click Start (opens the dialog with showModal)' };
  assert.deepEqual({
    scripted: await run(modal, dialogState, '#d > p'),
    notDeclared: await run(modal, { state: 'dialog-open' }, '#d > p'),
    noTrigger: await run(modal, { state: 'dialog-open', requiresScript: true }, '#d > p'),
    defaultState: await run(modal, { state: 'default', requiresScript: true, trigger: 'on load' }, '#d > p'),
    belowAA: await run(lightModal, dialogState, '#d > p'),
    noReview: await run(modal, dialogState, '#d > p', null),
    falseClaim: await run(staticPage, dialogState, 'main > p'),
  }, {
    scripted: { valid: true, rendersWithoutScript: false, unresolved: [], reason: null },
    notDeclared: { valid: false, rendersWithoutScript: null, unresolved: ['color-contrast'], reason: 'not measured by the visibility backstop in both renderings' },
    noTrigger: { valid: false, rendersWithoutScript: false, unresolved: ['color-contrast'], reason: 'not measured by the visibility backstop in both renderings' },
    defaultState: { valid: false, rendersWithoutScript: false, unresolved: ['color-contrast'], reason: 'not measured by the visibility backstop in both renderings' },
    belowAA: { valid: true, rendersWithoutScript: false, unresolved: ['color-contrast'], reason: 'faintest glyphs measured 2.8:1, below 4.5:1' },
    noReview: { valid: true, rendersWithoutScript: false, unresolved: ['color-contrast'], reason: 'no PASS wcag-review record citing the screenshot' },
    falseClaim: { valid: false, rendersWithoutScript: true, unresolved: [], reason: null },
  });
}));
