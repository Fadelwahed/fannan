// R24 (panel round 24): real-Chrome regressions for Mi'mar's R24 tiebreaks. Controls are checked before the media-crop
// branch, so a control's label text is always measured, whatever its border: a borderless button or a nested label cut
// by the button's box is clipped (R24-GPT-01). Matches to an expand or reveal state are one to one, like losses between
// widths: two hidden Downloads need two shown (R24-GPT-02). The only role swaps are a tablist adapted into an accordion
// (disclosures with the same names) and a menubar adapted into a menu in a declared state; a container is covered only
// when every item is matched one to one by name; no other role swap (R24-GPT-03). Each test was first run against the
// ec977f2 sources. R25-GPT-06 correction: in the R24 before-log (test-results/r24/R24-chrome-before.log), R24-GPT-01 failed at
// its assertion but R24-GPT-02 and R24-GPT-03 ended in page.goto timeouts on the overloaded box; the R25 rerun on a quiet
// box (test-results/r25/R24-chrome-before-rerun-r25.log) shows all three failing at their assertions (3 ERR_ASSERTION, 0 timeouts).
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
  const dir = mkdtempSync(join(tmpdir(), 'fannan-r24-'));
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
  // R29: a state is its html, or { html, opener, reveals } when it declares the reveal it rescues (checked by the gate)
  const decl = Object.entries(states).map(([state, v]) => [state, typeof v === 'string' ? { html: v } : v]);
  const probes = decl.filter(([, v]) => v.opener && v.reveals).map(([state, v]) => ({ state, opener: v.opener, reveals: v.reveals }));
  const scopes = []; for (const [state, v] of decl) scopes.push({ scope: { screen: 'home', state, lang: dir === 'rtl' ? 'ar' : 'en' }, widths: await ws.screenWidths((await open(v.html)).main, [1440], null, 900, probes), declaration: v.opener && v.reveals ? { opener: v.opener, reveals: v.reveals } : null });
  const r = ws.resolveReveals(scopes);
  const rules = [...new Set(scopes.flatMap(s => s.widths.results.flatMap(x => [...x.clipped.filter(c => !c.revealedBy).map(c => c.rule), ...(x.offscreenLeft.length ? ['offscreenLeft'] : []), ...((x.lost || []).filter(l => !l.reachableIn).length ? ['not shown at this width'] : [])])))].sort();
  if (process.env.DUMP) console.log(JSON.stringify(Object.keys(states)), JSON.stringify(scopes.map(s => s.widths.results.map(x => [x.width, x.clipped, x.lost, x.offscreenLeft]))).slice(0, 3000));
  return { pass: r.pass && scopes.every(s => s.widths.pass), rules };
};
const img = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000"><rect width="1600" height="1000" fill="#7a9"/><circle cx="800" cy="500" r="300" fill="#345"/></svg>');

// the page each 'l' element is hidden below 600 px and each 's' element above it (the panel's repro pattern)
const LS = '<style>@media (max-width:600px){.l{display:none}}@media (min-width:601px){.s{display:none}}</style>';
const svgBand = (fill, patch, width) => `background:url('data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="200"><rect width="1200" height="200" fill="${fill}"/>${patch ? `<rect width="${width}" height="200" fill="${patch}"/>` : ''}</svg>`)}')`;
const P = x => W(LS + x);


// R29: a declared state that rescues hidden content names its opener and the region it reveals
const D = (html, opener, reveals) => ({ html, opener, reveals });
const ACC = html => D(html, 'button[aria-expanded]', 'button[aria-expanded] + div');

test('R24-GPT-01: real Chrome: controls are checked before the media branch: a borderless button and a nested label cut by the button box are partly clipped; a fitting borderless button passes (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const bare = 'border:0;padding:0;background:none;width:90px;overflow:hidden;white-space:nowrap';
  assert.deepEqual({
    borderless: await gate({ default: W(`<button style="${bare}">Download the annual report</button>`) }),
    nestedLabel: await gate({ default: W(`<button style="${bare}"><span>Download the annual report</span></button>`) }),
    borderlessFits: await gate({ default: W('<button style="border:0;padding:0;background:none;overflow:hidden;white-space:nowrap">Download</button>') }),
  }, { borderless: { pass: false, rules: ['partly clipped'] }, nestedLabel: { pass: false, rules: ['partly clipped'] }, borderlessFits: { pass: true, rules: [] } });
}));

test('R24-GPT-02: real Chrome: reveal matches are one to one: a collapsed panel with two Download buttons is not cleared by an expanded state showing one; showing both passes; carousel slides shown by different slide states still pass (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const panel = (exp, n) => W(`<button aria-expanded="${exp}">Downloads</button><div style="${exp ? '' : 'max-height:0;overflow:hidden'}"><p>Files for this release.</p>${exp ? '<button>Download</button> '.repeat(n) : '<button>Download</button> <button>Download</button>'}</div>`);
  const slides = ['Shop shoes', 'Shop bags', 'Shop hats'];
  const carousel = i => W(`<div style="overflow:hidden;width:300px"><div style="display:flex;width:900px;transform:translateX(-${i * 300}px)">${slides.map((s, k) => `<div style="flex:0 0 300px"><p>Slide ${k + 1}</p><button>${s}</button></div>`).join('')}</div></div>`);
  const r = {
    expandedShowsOne: await gate({ default: panel(false), expanded: ACC(panel(true, 1)) }),
    expandedShowsTwo: await gate({ default: panel(false), expanded: ACC(panel(true, 2)) }),
    carousel: await gate({ default: carousel(0), 'slide-2': carousel(1), 'slide-3': carousel(2) }),
  };
  assert.deepEqual({ expandedShowsOne: r.expandedShowsOne.pass, expandedShowsTwo: r.expandedShowsTwo, carousel: r.carousel.pass }, { expandedShowsOne: false, expandedShowsTwo: { pass: true, rules: [] }, carousel: true });
}));

test('R24-GPT-03: real Chrome: the closed list of role swaps: tabs adapted into an accordion with the same names, and a menubar adapted into a menu in a declared state, pass; a missing tab or menu item, tabs becoming plain buttons, and tabs becoming listbox options fail (test-only)', { skip }, async () => withBrowser(async ({ open }) => {
  const gate = gateOf(open);
  const tabs = '<div class="l"><div role="tablist" aria-label="Plan details"><button role="tab" aria-selected="true">Overview</button><button role="tab" aria-selected="false">Pricing</button></div><div role="tabpanel"><p>Overview text.</p></div></div>';
  const acc = names => `<div class="s">${names.map((n, i) => `<details${i ? '' : ' open'}><summary>${n}</summary><p>${i ? 'Pricing text.' : 'Overview text.'}</p></details>`).join('')}</div>`;
  const bar = '<div role="menubar" aria-label="Document actions" class="l"><div role="menuitem" tabindex="0">Open</div><div role="menuitem" tabindex="-1">Share</div></div>';
  const menu = (open, items) => P(`${bar}<button class="s" aria-expanded="${open}">Actions</button>${open ? `<div role="menu" aria-label="Actions" class="s">${items.map(n => `<div role="menuitem" tabindex="-1">${n}</div>`).join('')}</div>` : ''}`);
  assert.deepEqual({
    tabsToAccordion: await gate({ default: P(tabs + acc(['Overview', 'Pricing'])) }),
    accordionMissingTab: await gate({ default: P(tabs + acc(['Overview'])) }),
    tabsToPlainButtons: await gate({ default: P(tabs + '<div class="s"><button>Overview</button><button>Pricing</button><p>Overview text.</p></div>') }),
    tabsToOptions: await gate({ default: P(tabs + '<div class="s" role="listbox" aria-label="Plan details"><div role="option" aria-selected="true">Overview</div><div role="option" aria-selected="false">Pricing</div><p>Overview text.</p></div>') }),
    menubarToMenu: await gate({ default: menu(false, []), 'menu-open': D(menu(true, ['Open', 'Share']), 'button[aria-expanded]', '[role=\"menu\"]') }),
    menuMissingItem: await gate({ default: menu(false, []), 'menu-open': D(menu(true, ['Open']), 'button[aria-expanded]', '[role=\"menu\"]') }),
  }, {
    tabsToAccordion: { pass: true, rules: [] }, accordionMissingTab: { pass: false, rules: ['not shown at this width'] },
    tabsToPlainButtons: { pass: false, rules: ['not shown at this width'] }, tabsToOptions: { pass: false, rules: ['not shown at this width'] },
    menubarToMenu: { pass: true, rules: [] }, menuMissingItem: { pass: false, rules: ['not shown at this width'] },
  });
}));
