import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const T = '/workspace/panel-r20/testrun/release/tools/', R = '/workspace/panel-r20/repro/';
if (!T.includes('panel-r20') || !R.includes('panel-r20')) process.exit(99);
const { visibilityScan } = await import(T + 'visibility.mjs');
const { isolatedPage } = await import(T + 'probe-world.mjs');
const { chromium } = createRequire('/workspace/fannan-testdeps/node_modules/')('playwright-core');
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--headless=new'] });
for (const sw of [40, 80, 160, 320]) {
  const svg = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="200"><rect width="800" height="200" fill="#f0f0f0"/><rect x="200" y="0" width="${sw}" height="200" fill="#111"/></svg>`);
  const html = `<!doctype html><html lang="en"><head><style>body{margin:0;font:16px/1.5 sans-serif}main{padding:24px}</style></head><body><main><div style="position:relative;width:800px;height:200px;background:url('data:image/svg+xml,${svg}')"><p style="position:absolute;top:80px;left:20px;margin:0;font-size:24px;color:#d0d0d0">Pale caption text over a light photo with a dark detail</p></div></main></body></html>`;
  const file = R + `d-${sw}.html`; writeFileSync(file, html);
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const main = await ctx.newPage();
  await main.goto(pathToFileURL(file).href); await main.waitForTimeout(200); if (sw === 160) await main.screenshot({ path: R + 'photoStripe-160.png' });
  const p = await isolatedPage(main); const s = await visibilityScan(p);
  console.log('stripe', sw, JSON.stringify({ unread: s.textUnreadable, meas: s.textMeasured, byElement: Object.values(s.byElement).map(e => [e.min, e.complete]) }));
  await ctx.close();
}
await b.close();
