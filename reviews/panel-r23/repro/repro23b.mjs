// Mi'mar R23 cross-check (test-only, box): GPT-01..05.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const T = '/workspace/panel-r23/testrun/release/tools/', R = '/workspace/panel-r23/repro/';
if (!T.includes('panel-r23') || !R.includes('panel-r23')) process.exit(99);
const { visibilityScan, glyphContrast, resolveContrastIncomplete } = await import(T + 'visibility.mjs');
const { screenWidths, resolveReveals } = await import(T + 'width-screen.mjs');
const { isolatedPage } = await import(T + 'probe-world.mjs');
const { chromium } = createRequire('/workspace/fannan-testdeps/node_modules/')('playwright-core');
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--headless=new'] });
const W = x => `<!doctype html><html lang="en"><head><style>body{margin:0;font:16px/1.5 sans-serif;color:#1a1a1a;background:#fff}main{padding:24px}@media (max-width:600px){.l{display:none}}</style></head><body><main><h1>Heading</h1>${x}</main></body></html>`;
const open = async (n, h) => { const f = R + 'k-' + n + '.html'; writeFileSync(f, h); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const m = await ctx.newPage(); await m.goto(pathToFileURL(f).href); await m.waitForTimeout(250); return { ctx, p: await isolatedPage(m) }; };
const out = {};
// GPT-01: resolver with a citing PASS review + worstRegion and an unmeasured glyph result
const el = { min: 9, complete: true, large: false };
const integ = (ga, gb) => ({ probeWorld: { visibility: { byElement: { 'x': el } } }, jsOff: { visibility: { byElement: { 'x': el } } }, glyph: { scripted: { x: { ratio: ga } }, jsOff: { x: { ratio: gb } } } });
const review = { id: 'wcag-review', decision: 'PASS', artifact: 'shot.png', note: 'checked', worstRegion: 'top-left over the bright sky' };
for (const [n, ga, gb] of [['null,8', null, 8], ['null,null', null, null], ['4,4 (zone c)', 4, 4]]) out['resolver ' + n] = (({ pass, contrastNodes }) => ({ pass, zone: contrastNodes[0].zone, reason: contrastNodes[0].reason }))(resolveContrastIncomplete({ incomplete: [{ id: 'color-contrast' }], paths: [{ path: 'x', target: ['p'] }], integrity: integ(ga, gb), review, shots: ['shot.png'] }));
// Can an honest page produce an unmeasured glyph? thin hairline weights, tiny text, and emoji-led text over a photo
const svg = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="200"><rect width="1200" height="200" fill="#1e2a33"/><rect x="400" width="400" height="200" fill="#2e4050"/></svg>');
for (const [n, style, text] of [['hair-100', 'font-weight:100;font-size:20px', 'Hairline caption over a photo'], ['tiny-9px', 'font-size:9px', 'Photo credit: city archive, 1998'], ['emoji', 'font-size:20px', '📍 Gaza City · 🕒 Open daily']]) {
  const { ctx, p } = await open('g-' + n, W(`<div style="position:relative;width:1200px;height:200px;background:url('${svg}')"><p style="position:absolute;top:80px;left:420px;margin:0;color:#fff;${style}">${text}</p></div>`));
  const s = await visibilityScan(p); const paths = Object.keys(s.byElement).filter(k => /div:1\/p:0$/.test(k)); const r = await glyphContrast(p, paths); out['glyph ' + n] = Object.values(r).map(x => ({ ratio: x.ratio, reason: x.reason, clusters: x.clusters })); await ctx.close();
}
const sw = async (n, h) => { const { ctx, p } = await open(n, h); const w = await screenWidths(p, [1440], null); await ctx.close(); return w; };
const brief = w => (w.results || []).map(r => [r.width, r.pass, (r.clipped || []).map(c => c.rule), (r.lost || []).map(x => x.print || x), (r.mediaCrops || []).length]);
out.saveSaveAs = brief(await sw('saveas', W('<div role="toolbar"><button>Save</button> <button class="l">Save as</button></div>')));
// toolbar action moved into a declared overflow-menu state at 320
const tb = open1 => W(`<div role="toolbar"><button>Save</button> <button class="l">Export report</button> <button class="s" aria-expanded="${open1}" aria-haspopup="menu">More</button>${open1 ? '<div role="menu"><div role="menuitem" tabindex="-1">Export report</div></div>' : ''}</div><style>@media (min-width:601px){.s{display:none}}</style>`);
const scopes = [{ scope: { screen: 'home', state: 'default', lang: 'en' }, widths: await sw('tb-d', tb(false)) }, { scope: { screen: 'home', state: 'more-open', lang: 'en' }, widths: await sw('tb-o', tb(true)) }];
const rr = resolveReveals(scopes); out.exportToMenuitem = { pass: rr.pass, unresolved: rr.unresolved.map(u => u.text || u.prints || u.paths).slice(0, 3), default320: scopes[0].widths.results.find(r => r.width === 320)?.pass };
const tbb = open1 => tb(open1).replace('<div role="menuitem" tabindex="-1">Export report</div>', '<button>Export report</button>').replace('role="menu"', '');
const scopes2 = [{ scope: { screen: 'home', state: 'default', lang: 'en' }, widths: await sw('tbb-d', tbb(false)) }, { scope: { screen: 'home', state: 'more-open', lang: 'en' }, widths: await sw('tbb-o', tbb(true)) }];
out.exportToButtonControl = { pass: resolveReveals(scopes2).pass };
out.linkTextOverflow = brief(await sw('linkov', W('<div style="width:100px;overflow:hidden"><a href="/x" style="display:inline-block;width:100px;white-space:nowrap">Download the annual report</a></div>')));
out.linkTextOverflow320 = out.linkTextOverflow;
out.sliderHidden = brief(await sw('slider', W('<div role="slider" aria-label="Volume" aria-valuenow="40" aria-valuemin="0" aria-valuemax="100" tabindex="0" class="l" style="width:200px;height:8px;background:#ccc"></div><p>Body.</p>')));
// GPT-05: clamp ending at a line boundary with a Download button wholly below; expanded state shows the button
const clampD = W('<div style="max-width:260px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden"><p style="margin:0">Two short lines of excerpt that fit.</p><p style="margin:0">Second line here.</p><button style="display:block">Download</button></div><button aria-expanded="false">Read more</button>');
const clampE = W('<div style="max-width:260px"><p style="margin:0">Two short lines of excerpt that fit.</p><p style="margin:0">Second line here.</p><button style="display:block">Download</button></div><button aria-expanded="true">Read less</button>');
const s3 = [{ scope: { screen: 'home', state: 'default', lang: 'en' }, widths: await sw('cl-d', clampD) }, { scope: { screen: 'home', state: 'expanded', lang: 'en' }, widths: await sw('cl-e', clampE) }];
const r3 = resolveReveals(s3); out.clampWholeButton = { pass: r3.pass, default: s3[0].widths.results.map(r => [r.width, r.pass, r.clipped.map(c => c.rule + ' whole=' + (c.whole || []).map(x => x.kind || x.tag).join('+') + ' partial=' + (c.partial || []).length)]) };
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(20), JSON.stringify(v));
await b.close();
