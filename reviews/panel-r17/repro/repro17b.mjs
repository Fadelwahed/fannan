// Mi'mar R17 cross-check repro B (test-only, box): GPT-01/02 rendering in Chrome 155.
import { createRequire } from 'node:module';
const T = '/workspace/panel-r17/testrun/release/tools/';
if (!T.includes('panel-r17')) process.exit(99);
const { contrastProbe, contentProbe } = await import(T + 'integrity.mjs');
const { chromium } = createRequire('/workspace/fannan-testdeps/node_modules/')('playwright-core');
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--headless=new'] });
const W = x => `<html lang="en"><body style="margin:20px;background:#fff"><h1>Heading</h1>${x}</body></html>`;
const cases = {
  g1ariaSubmit: W('<input id="g1" type="submit" aria-label="Start now" value="" style="font-size:24px"><script>g1.value="Start now"</script>'),
  g2phRestore: W('<style>#g2::placeholder{color:#000;opacity:.05}</style><input id="g2" style="font-size:24px" placeholder="name@example.org"><script>const s=document.createElement("style");s.textContent="#g2::placeholder{opacity:1}";document.head.append(s)</script>'),
};
for (const [n, h] of Object.entries(cases)) for (const js of [true, false]) { const ctx = await b.newContext({ javaScriptEnabled: js, viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); await p.setContent(h); await p.waitForTimeout(100); const el = await p.$('input'); const box = await el.boundingBox(); await p.screenshot({ path: `${n}-${js ? 'on' : 'off'}.png`, clip: box }); console.log(n.padEnd(14), js ? 'JS-on ' : 'JS-off', JSON.stringify(await p.evaluate(contrastProbe)), JSON.stringify((await p.evaluate(contentProbe)).controls)); await ctx.close(); }
await b.close();
