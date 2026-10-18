// Mi'mar R21 cross-check (test-only, box): image cropping vs the R20 clipping rule; marquee; real Arabic site at 320.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const T = process.env.TOOLS || '/workspace/panel-r21/testrun/release/tools/', R = '/workspace/panel-r21/repro/';
if (!T.includes('panel-r21') || !R.includes('panel-r21')) process.exit(99);
const { screenWidths } = await import(T + 'width-screen.mjs');
const { isolatedPage } = await import(T + 'probe-world.mjs');
const { chromium } = createRequire('/workspace/fannan-testdeps/node_modules/')('playwright-core');
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--headless=new'] });
const img = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000"><rect width="1600" height="1000" fill="#7a9"/><circle cx="800" cy="500" r="300" fill="#345"/></svg>');
const W = x => `<!doctype html><html lang="en"><head><style>body{margin:0;font:16px/1.5 sans-serif;color:#1a1a1a;background:#fff}main{padding:24px}img,video{display:block}</style></head><body><main><h1>Heading</h1><p>Body copy.</p>${x}</main></body></html>`;
const cases = {
  control: W(''),
  heroImgCrop: W(`<div style="overflow:hidden;height:300px;max-width:1200px"><img src="${img}" alt="Team at work" style="width:100%;min-width:600px;height:auto"></div>`),
  objectFit: W(`<div style="height:300px;max-width:1200px"><img src="${img}" alt="Team at work" style="width:100%;height:100%;object-fit:cover"></div>`),
  pictureCentered: W(`<div style="overflow:hidden;height:320px;max-width:800px;position:relative"><picture><img src="${img}" alt="Office" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:1000px"></picture></div>`),
  zoomHover: W(`<a href="#" style="display:block;overflow:hidden;border-radius:12px;max-width:400px"><img src="${img}" alt="Case study" style="width:100%;transform:scale(1.08)"></a>`),
  avatarCircle: W(`<div style="width:64px;height:64px;border-radius:50%;overflow:hidden"><img src="${img}" alt="Portrait" style="width:80px;height:80px;margin:-8px"></div>`),
  videoCrop: W(`<div style="overflow:hidden;height:240px;max-width:900px"><video muted style="width:100%;min-width:500px;aspect-ratio:16/10;background:#333" aria-label="Product film"></video></div>`),
  bgImage: W(`<section style="height:300px;background:url('${img}') center/cover"><p style="margin:0;padding:24px;background:#fff;display:inline-block">Over a background</p></section>`),
  svgDecorCrop: W(`<section style="overflow:hidden;position:relative;padding:48px"><svg aria-hidden="true" width="600" height="600" style="position:absolute;right:-200px;top:-100px"><circle cx="300" cy="300" r="300" fill="#eef"/></svg><p style="position:relative">Section copy</p></section>`),
  blobDiv: W(`<section style="overflow:hidden;position:relative;padding:48px"><div style="position:absolute;right:-200px;top:-100px;width:600px;height:600px;border-radius:50%;background:#eef"></div><p style="position:relative">Section copy</p></section>`),
  marquee: W(`<style>@keyframes m{to{transform:translateX(-50%)}}</style><div style="overflow:hidden;white-space:nowrap"><div style="display:inline-block;animation:m 20s linear infinite">Trusted by agencies in forty countries · Trusted by agencies in forty countries · Trusted by agencies in forty countries · Trusted by agencies in forty countries</div></div>`),
};
const summarize = w => (w.results || []).map(r => ({ width: r.width, pass: r.pass, passExceptReveal: r.passExceptReveal, clips: (r.clipped || []).map(c => ({ tag: c.tag, rule: c.rule, whole: (c.whole || []).map(x => x.tag), partial: (c.partial || []).map(x => x.tag) })), offLeft: (r.offscreenLeft || []).length, unreach: (r.unreachable || []).length, hOverflow: r.horizontalOverflow }));
for (const [n, h] of Object.entries(cases)) {
  const file = R + 'case-' + n + '.html'; writeFileSync(file, h);
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const main = await ctx.newPage();
  await main.goto(pathToFileURL(file).href); await main.waitForLoadState('load'); await main.waitForTimeout(150); const p = await isolatedPage(main);
  const w = await screenWidths(p, [1440], null);
  console.log(n.padEnd(16), JSON.stringify(summarize(w)));
  await ctx.close();
}
if (!process.env.SKIPSITE) for (const lang of ['ar', 'en']) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const main = await ctx.newPage();
  await main.goto(`http://127.0.0.1:8931/${lang}/`); await main.waitForLoadState('load'); await main.waitForTimeout(500); const p = await isolatedPage(main);
  const w = await screenWidths(p, [1440], null);
  const r320 = (w.results || []).find(r => r.width === 320);
  console.log('SITE-' + lang, JSON.stringify(summarize(w)));
  console.log('SITE-' + lang + '-320-detail', JSON.stringify({ offscreenLeft: r320?.offscreenLeft, unreachable: r320?.unreachable, clipped: r320?.clipped?.map(c => ({ tag: c.tag, rule: c.rule, partial: c.partial, whole: c.whole })), documentWidth: r320?.documentWidth }).slice(0, 3000));
  await ctx.close();
}
await b.close();
