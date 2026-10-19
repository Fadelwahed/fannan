// Mi'mar R22 cross-check (test-only, box): GPT-01..06 in Chrome.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const T = '/workspace/panel-r22/testrun/release/tools/', R = '/workspace/panel-r22/repro/';
if (!T.includes('panel-r22') || !R.includes('panel-r22')) process.exit(99);
const { visibilityScan, glyphContrast } = await import(T + 'visibility.mjs');
const { screenWidths, resolveReveals } = await import(T + 'width-screen.mjs');
const { isolatedPage } = await import(T + 'probe-world.mjs');
const { chromium } = createRequire('/workspace/fannan-testdeps/node_modules/')('playwright-core');
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--headless=new'] });
const W = x => `<!doctype html><html lang="en"><head><style>body{margin:0;font:16px/1.5 sans-serif;color:#1a1a1a;background:#fff}main{padding:24px}@media (max-width:600px){.l{display:none}}</style></head><body><main><h1>Heading</h1>${x}</main></body></html>`;
const open = async (n, h) => { const f = R + 'f-' + n + '.html'; writeFileSync(f, h); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const m = await ctx.newPage(); await m.goto(pathToFileURL(f).href); await m.waitForTimeout(200); return { ctx, p: await isolatedPage(m) }; };
const out = {};
const svgBg = (patchX, patchW, light) => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="200"><rect width="1200" height="200" fill="#1e2a33"/><rect x="${patchX}" width="${patchW}" height="200" fill="${light}"/></svg>`);
const g = async (n, inner) => { const { ctx, p } = await open(n, W(inner)); const s = await visibilityScan(p); const paths = Object.keys(s.byElement).filter(k => /div:1\/p:0$/.test(k)); const r = await glyphContrast(p, paths); await ctx.close(); return Object.values(r).map(x => ({ ratio: x.ratio, min: x.min, clusters: x.clusters, dropped: x.dropped, reason: x.reason })); };
out.opacity70 = await g('op70', `<div style="position:relative;width:1200px;height:200px;background:url('${svgBg(0, 0, '#fff')}')"><p style="position:absolute;top:70px;left:8px;margin:0;font-size:28px;color:#fff;opacity:.7">Seventy percent caption over a dark photo</p></div>`);
out.opacity70ancestor = await g('op70a', `<div style="position:relative;width:1200px;height:200px;background:url('${svgBg(0, 0, '#fff')}')"><p style="position:absolute;top:70px;left:8px;margin:0;font-size:28px;color:#fff"><span style="opacity:.7">Seventy percent caption via a span</span></p></div>`);
// thin letters "ill" over a near-white patch, 14px; other words over dark
out.thinLetters14 = await g('thin14', `<div style="position:relative;width:1200px;height:200px;background:url('${svgBg(0, 22, '#e6e6e6')}')"><p style="position:absolute;top:70px;left:4px;margin:0;font-size:14px;color:#fff">ill fill lilt still and the rest sits on the dark area</p></div>`);
out.thinLetters12 = await g('thin12', `<div style="position:relative;width:1200px;height:200px;background:url('${svgBg(0, 16, '#e6e6e6')}')"><p style="position:absolute;top:70px;left:4px;margin:0;font-size:12px;color:#fff">il lit fill and the rest sits on the dark area of the photo</p></div>`);
const sw = async (n, h) => { const { ctx, p } = await open(n, h); const w = await screenWidths(p, [1440], null); await ctx.close(); return w; };
const brief = w => (w.results || []).map(r => [r.width, r.pass, (r.clipped || []).map(c => c.rule + ':' + (c.partial || []).map(x => x.kind || x.tag).join('+')), (r.lost || []).map(x => x.print || x.text || x)]);
out.videoFallback = brief(await sw('vidfb', W('<div style="overflow:hidden;height:200px;max-width:900px"><video muted style="display:block;width:100%;min-width:500px;aspect-ratio:16/10;background:#333">Your browser does not support this video.</video></div>')));
out.iconLinkHidden = brief(await sw('iconlink', W('<nav><a href="/profile" aria-label="Your profile" class="l"><svg width="24" height="24" aria-hidden="true"><circle cx="12" cy="12" r="10"/></svg></a></nav><p>Body.</p>')));
out.buttonVsHeading = brief(await sw('btnhead', W('<h2>Subscribe</h2><form><label>Email <input type="email"></label> <button class="l">Subscribe</button></form>')));
out.labelledbyCheckbox = brief(await sw('lblby', W('<p id="a">Email me news</p><input type="checkbox" aria-labelledby="a"><p id="b">Email me offers</p><input type="checkbox" aria-labelledby="b" class="l">')));
// GPT-06: clamp partly cuts paragraph one, wholly hides paragraph two; expanded state shows only paragraph one
const p1 = 'First paragraph of the excerpt keeps going for long enough to wrap onto a third line inside the narrow column so the clamp cuts it.';
const clampD = W(`<div style="max-width:260px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden"><p style="margin:0">${p1}</p><p style="margin:0">Second paragraph with the cancellation terms.</p></div><button aria-expanded="false">Read more</button>`);
const clampE = W(`<div style="max-width:260px"><p style="margin:0">${p1}</p></div><button aria-expanded="true">Read less</button>`);
const scopes = [{ scope: { screen: 'home', state: 'default', lang: 'en' }, widths: await sw('clampd', clampD) }, { scope: { screen: 'home', state: 'expanded', lang: 'en' }, widths: await sw('clampe', clampE) }];
const rr = resolveReveals(scopes);
out.clampOmits = { pass: rr.pass, unresolved: rr.unresolved.length, default: scopes[0].widths.results.map(r => [r.width, r.pass, r.clipped.map(c => c.rule + ' whole=' + (c.whole || []).length + ' partial=' + (c.partial || []).length)]) };
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(18), JSON.stringify(v));
await b.close();
