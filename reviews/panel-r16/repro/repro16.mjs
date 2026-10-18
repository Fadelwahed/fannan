// Mi'mar R16 cross-check repro (test-only, box). Imports the 5fe9101 tools from panel-r16/testrun.
import { createRequire } from 'node:module';
const T = '/workspace/panel-r16/testrun/release/tools/';
if (!T.includes('panel-r16')) process.exit(99);
const { contrastProbe, contentProbe } = await import(T + 'integrity.mjs');
const { chromium } = createRequire('/workspace/fannan-testdeps/node_modules/')('playwright-core');
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--headless=new'] });
const run = async (name, html, js) => { const ctx = await b.newContext({ javaScriptEnabled: js, viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); await p.setContent(html); await p.waitForTimeout(100); const r = await p.evaluate(contrastProbe); const c = await p.evaluate(contentProbe); const shot = await p.screenshot({ path: `/workspace/panel-r16/repro/${name}-${js ? 'on' : 'off'}.png`, clip: { x: 0, y: 0, width: 400, height: 120 } }); console.log(name, js ? 'JS-on ' : 'JS-off', JSON.stringify(r), 'content', JSON.stringify(c.slots), JSON.stringify(c.headings)); await ctx.close(); };
const cases = {
  blendAncestor: '<html><body style="margin:0;background:#fff"><section style="mix-blend-mode:screen"><div style="background:#000"><p style="color:#fff;margin:0;padding:20px">White on black, section screen-blended over white</p></div></section></body></html>',
  filterOpacity: '<html><body style="background:#fff"><p id="t" style="color:#000;filter:opacity(.1)">Filter faded text</p><script>t.style.filter="none"</script></body></html>',
  filterBlur: '<html><body style="background:#fff"><p id="t" style="color:#000;filter:blur(10px)">Blur-in reveal text</p><script>t.style.filter="none"</script></body></html>',
  inputFade: '<html><body style="background:#fff"><h1>Checkout</h1><input id="s" type="submit" value="Continue" style="opacity:.05;color:#000"><script>s.style.opacity="1"</script></body></html>',
  inputValueMissing: '<html><body style="background:#fff"><h1>Checkout</h1><input id="s" type="submit" value=""><script>s.value="Continue"</script></body></html>',
  control: '<html><body style="background:#fff"><p style="color:#000">Plain readable</p></body></html>',
};
for (const [n, h] of Object.entries(cases)) { await run(n, h, true); await run(n, h, false); }
await b.close();
