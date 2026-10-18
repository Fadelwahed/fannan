// Mi'mar R20 repro B (test-only): what is actually visible at 320 px for the nav and table cases.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const R = '/workspace/panel-r20/repro/';
if (!R.includes('panel-r20')) process.exit(99);
const { chromium } = createRequire('/workspace/fannan-testdeps/node_modules/')('playwright-core');
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--headless=new'] });
for (const n of ['navOverflow', 'tableCut']) {
  const ctx = await b.newContext({ viewport: { width: 320, height: 900 } }); const p = await ctx.newPage();
  await p.goto(pathToFileURL(R + 'case-' + n + '.html').href);
  const r = await p.evaluate(() => { const box = (document.querySelector('nav') || document.querySelector('table').parentElement).getBoundingClientRect(); return [...document.querySelectorAll('nav a, th, td')].map(e => { const q = e.getBoundingClientRect(); return [e.textContent, q.left >= box.right ? 'HIDDEN (wholly past right edge)' : q.right > box.right ? 'partly cut' : 'visible']; }); });
  await p.screenshot({ path: R + n + '-320.png' });
  console.log(n, JSON.stringify(r));
  await ctx.close();
}
await b.close();
