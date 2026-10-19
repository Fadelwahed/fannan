// Mi'mar R18 cross-check repro (test-only, box): the R17 visibility backstop on honest pages and very long pages.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const T = '/workspace/panel-r18/testrun/release/tools/', R = '/workspace/panel-r18/repro/';
if (!T.includes('panel-r18') || !R.includes('panel-r18')) process.exit(99);
const { visibilityScan, contrastProbe } = await import(T + 'integrity.mjs');
const { chromium } = createRequire('/workspace/fannan-testdeps/node_modules/')('playwright-core');
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--headless=new'] });
const W = (x, head = '') => `<!doctype html><html lang="en"><head><style>body{margin:0;font:16px/1.5 Inter,sans-serif;color:#1a1a1a;background:#fff}main{padding:40px}</style>${head}</head><body><main><h1>Page heading</h1>${x}</main></body></html>`;
const filler = n => Array.from({ length: n }, (_, i) => `<p>Paragraph ${i + 1} of ordinary body copy that explains the service in plain words.</p>`).join('');
const cases = {
  control: W(filler(5)),
  longStatic: W('<div style="height:40000px"></div><p id="far">Footer text beyond the scan cap</p>'),
  longLazy: W('<div style="height:40000px"></div><div id="s" style="height:1px"></div><footer id="f"></footer><script>new IntersectionObserver(e=>{if(e[0].isIntersecting)f.innerHTML="<p>Lazy footer text</p>"}).observe(s)</script>'),
  longCvAuto: W('<div style="height:40000px"></div><section style="content-visibility:auto;contain-intrinsic-size:auto 300px"><p>Section rendered on demand</p></section>'),
  carousel: W('<div style="overflow:hidden;width:800px"><div style="display:flex;width:2400px"><div style="width:800px;background:#eee;padding:20px">Slide one caption</div><div style="width:800px;padding:20px">Slide two caption</div><div style="width:800px;padding:20px">Slide three caption</div></div></div>' + filler(3)),
  carouselAuto: W('<div style="overflow:hidden;width:800px"><div id="t" style="display:flex;width:2400px;transition:transform .6s"><div style="width:800px;padding:20px">Slide one</div><div style="width:800px;padding:20px">Slide two</div><div style="width:800px;padding:20px">Slide three</div></div></div><script>let i=0;setInterval(()=>{i=(i+1)%3;t.style.transform=`translateX(${-800*i}px)`},700)</script>' + filler(3)),
  accordion: W('<button aria-expanded="false">Shipping questions</button><div style="max-height:0;overflow:hidden;transition:max-height .3s"><p>Answer text inside a collapsed accordion panel.</p></div>' + filler(3)),
  tabStrip: W('<nav style="overflow-x:auto;white-space:nowrap;width:600px">' + Array.from({ length: 14 }, (_, i) => `<a href="#" style="display:inline-block;padding:8px 16px">Category ${i + 1}</a>`).join('') + '</nav>' + filler(3)),
  stickyHeader: `<!doctype html><html lang="en"><body style="margin:0;font:16px/1.5 Inter,sans-serif"><header style="position:sticky;top:0;background:#fff;height:80px;border-bottom:1px solid #ddd;z-index:5"><a href="#">Home</a> <a href="#">About</a></header><main style="padding:40px">${filler(80)}</main></body></html>`,
  fixedHeader: `<!doctype html><html lang="en"><body style="margin:0;font:16px/1.5 Inter,sans-serif"><header style="position:fixed;top:0;left:0;right:0;background:#fff;height:80px;z-index:5"><a href="#">Home</a></header><main style="padding:100px 40px">${filler(80)}</main></body></html>`,
  cookieBanner: W(filler(40) + '<div style="position:fixed;bottom:0;left:0;right:0;background:#111;color:#fff;padding:24px">We use cookies. <button>Accept</button></div>'),
  photoScrim: W('<section style="position:relative;height:600px;background:url(photo.png) center/cover"><div style="position:absolute;inset:0;background:rgba(0,0,0,.55)"></div><div style="position:relative;padding:80px;color:#fff"><h2 style="font-size:56px;margin:0">Headline over a photo</h2><p>Supporting line over the photo with a proper scrim.</p></div></section>'),
  photoImgScrim: W('<figure style="position:relative;margin:0"><img src="photo.png" style="display:block;width:100%;height:500px;object-fit:cover"><figcaption style="position:absolute;left:0;right:0;bottom:0;padding:32px;background:linear-gradient(transparent,rgba(0,0,0,.8));color:#fff;font-size:20px">Caption on an image with a gradient scrim</figcaption></figure>'),
  thinLight: W('<p style="font:100 14px Lato;color:#595959">Hairline light text that passes AA at 7:1 by colour</p><p style="font:300 12px Inter;color:#767676">Light 12px secondary label at 4.5:1</p><p style="font:200 13px \'Inter Tight\';color:#6b6b6b">Extra-light caption text</p>'),
  arabic: '<!doctype html><html lang="ar" dir="rtl"><body style="margin:40px;font:18px/1.8 sans-serif"><h1>عنوان الصفحة</h1><p>نَصٌّ عَرَبِيٌّ مُشَكَّلٌ بِالكامِلِ لِلتَّجْرِبَةِ</p><p>English inline 123 مع أرقام ٤٥٦</p><p>Emoji 😀 ✅ 🚀</p></body></html>',
  bigHeading: W('<h2 style="font-size:160px;line-height:1;margin:0">Huge display heading across lines and lines</h2>' + filler(3)),
  iconsUnderline: W('<p>Read the <a href="#" style="text-decoration:underline">full report <svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" fill="none"/></svg></a> today.</p><button style="padding:8px"><svg width="16" height="16"><circle cx="8" cy="8" r="6" fill="#333"/></svg> Save</button><button aria-label="Close" style="width:32px;height:32px;padding:0"><svg width="16" height="16"><path d="M3 3l10 10M13 3L3 13" stroke="#111" stroke-width="2"/></svg></button>'),
  badgeOverlap: W('<div style="position:relative;width:400px;padding:24px;background:#f4f4f4"><span style="position:absolute;top:-10px;right:-10px;background:#c00;color:#fff;border-radius:12px;padding:2px 8px;font-size:12px">New</span><h3 style="margin:0">Card title</h3><p>Card body text sits here.</p></div>'),
  tooltipHidden: W('<span style="position:relative">Help<span role="tooltip" style="position:absolute;top:100%;left:0;background:#111;color:#fff;padding:4px;opacity:0;visibility:hidden">Tooltip text</span></span>' + filler(2)),
  marquee: W('<div style="overflow:hidden;white-space:nowrap"><div style="display:inline-block;animation:m 10s linear infinite">Logos and partner names scrolling in a marquee strip</div></div><style>@keyframes m{to{transform:translateX(-50%)}}</style>' + filler(2)),
};
for (const [n, h] of Object.entries(cases)) {
  const file = R + 'case-' + n + '.html'; writeFileSync(file, h);
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
  await p.goto(pathToFileURL(file).href); await p.waitForLoadState('load'); await p.waitForTimeout(100);
  const s = await visibilityScan(p); const c = await p.evaluate(contrastProbe);
  console.log(n.padEnd(14), JSON.stringify({ measured: s.textMeasured, obscured: s.textObscured, unreadable: s.textUnreadable, unmeasured: s.textUnmeasured, assistive: s.textAssistive, bands: s.bands, unsettled: s.unsettledBands, ms: s.ms, cssFail: c.contrastFailures, cssUnknown: c.contrastUnknown }), JSON.stringify(s.items.slice(0, 4).map(i => [i.problem, (i.text || '').slice(0, 28), i.reason || i.ratio || i.covered])));
  await ctx.close();
}
await b.close();
