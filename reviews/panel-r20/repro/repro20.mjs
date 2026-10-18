// Mi'mar R20 cross-check repro (test-only, box): new exemptions vs honest mistakes; via the probe world.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const T = '/workspace/panel-r20/testrun/release/tools/', R = '/workspace/panel-r20/repro/';
if (!T.includes('panel-r20') || !R.includes('panel-r20')) process.exit(99);
const { visibilityScan } = await import(T + 'integrity.mjs');
const { screenWidths } = await import(T + 'width-screen.mjs');
const { isolatedPage } = await import(T + 'probe-world.mjs');
const { chromium } = createRequire('/workspace/fannan-testdeps/node_modules/')('playwright-core');
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--headless=new'] });
const W = x => `<!doctype html><html lang="en"><head><style>body{margin:0;font:16px/1.5 Inter,sans-serif;color:#1a1a1a;background:#fff}main{padding:24px}</style></head><body><main><h1>Heading</h1>${x}</main></body></html>`;
const cases = {
  control: W('<p>Plain body copy.</p>'),
  navOverflow: W('<nav style="overflow:hidden;white-space:nowrap;border:1px solid #ccc">' + ['Home', 'Services', 'Pricing', 'Case studies', 'About us', 'Careers', 'Contact'].map(t => `<a href="#" style="display:inline-block;padding:8px 16px">${t}</a>`).join('') + '</nav>'),
  cardBlockEnd: W('<div style="width:320px;height:120px;overflow:hidden;border:1px solid #ccc;padding:8px;box-sizing:border-box"><h3 style="margin:0 0 8px">Card title</h3><p style="margin:0 0 40px">Short description.</p><p style="margin:0">Important second paragraph that lies wholly below the fixed height.</p></div>'),
  cardPartial: W('<div style="width:320px;height:70px;overflow:hidden;border:1px solid #ccc;padding:8px"><p style="margin:0">A long description that keeps going and is cut through its third line by the fixed height of the card box.</p></div>'),
  tableCut: W('<div style="overflow:hidden;width:100%"><table style="width:900px"><tr><th>Plan</th><th>Price</th><th>Seats</th><th>Support</th><th>Storage</th></tr><tr><td>Basic</td><td>$10</td><td>1</td><td>Email</td><td>10 GB</td></tr></table></div>'),
};
for (const [n, h] of Object.entries(cases)) for (const js of [true, false]) {
  const file = R + 'case-' + n + '.html'; writeFileSync(file, h);
  const ctx = await b.newContext({ javaScriptEnabled: js, viewport: { width: 1440, height: 900 } }); const main = await ctx.newPage();
  await main.goto(pathToFileURL(file).href); await main.waitForLoadState('load'); await main.waitForTimeout(150); const p = await isolatedPage(main);
  const w = await screenWidths(p, [1440, 1280], null);
  const at320 = (w.results || []).find(r => r.width === 320);
  await p.evaluate(() => scrollTo(0, 0));
  const s = await visibilityScan(p);
  console.log(n.padEnd(13), js ? 'on ' : 'off', JSON.stringify({ widthsPass: w.pass, perWidth: (w.results || []).map(r => [r.width, r.clipped?.length, r.pass]), meas: s.textMeasured, hidden: s.textHidden, unread: s.textUnreadable, unmeas: s.textUnmeasured }));
  await ctx.close();
}
await b.close();
