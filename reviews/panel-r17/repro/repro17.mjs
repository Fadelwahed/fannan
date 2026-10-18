// Mi'mar R17 cross-check repro (test-only, box). Imports the 86e2a31 tools from panel-r17/testrun.
import { createRequire } from 'node:module';
const T = '/workspace/panel-r17/testrun/release/tools/';
if (!T.includes('panel-r17')) process.exit(99);
const { contrastProbe, contentProbe } = await import(T + 'integrity.mjs');
const { chromium } = createRequire('/workspace/fannan-testdeps/node_modules/')('playwright-core');
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--headless=new'] });
const run = async (name, html, js) => { const ctx = await b.newContext({ javaScriptEnabled: js, viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); await p.setContent(html); await p.waitForTimeout(100); const r = await p.evaluate(contrastProbe); const c = await p.evaluate(contentProbe); await p.screenshot({ path: `/workspace/panel-r17/repro/${name}-${js ? 'on' : 'off'}.png`, clip: { x: 0, y: 0, width: 500, height: 140 } }); console.log(name.padEnd(18), js ? 'JS-on ' : 'JS-off', JSON.stringify(r), 'controls', JSON.stringify(c.controls ?? null)); await ctx.close(); };
const W = x => `<html lang="en"><body style="margin:20px;background:#fff">${x}</body></html>`;
const cases = {
  r15filterOpacity: W('<p id="t" style="color:#000;filter:opacity(.1)">Filter faded</p><script>t.style.filter="none"</script>'),
  r15blur: W('<p id="t" style="color:#000;filter:blur(10px)">Blur-in</p><script>t.style.filter="none"</script>'),
  r15blendAncestor: W('<section style="mix-blend-mode:screen"><div style="background:#000"><p style="color:#fff;margin:0">White on black, screen</p></div></section>'),
  r15inputFade: W('<input id="s" type="submit" value="Continue" style="opacity:.05;color:#000"><script>s.style.opacity="1"</script>'),
  r15inputScripted: W('<input id="s" type="submit" value=""><script>s.value="Continue"</script>'),
  maskFadePermanent: W('<p style="color:#000;-webkit-mask-image:linear-gradient(#000 40%,transparent);mask-image:linear-gradient(#000 40%,transparent)">Clamp fade<br>line two<br>line three</p>'),
  dropShadowHeading: W('<h1 style="color:#111;filter:drop-shadow(0 1px 1px rgba(0,0,0,.2))">Shadowed heading</h1>'),
  textFillFaint: W('<p style="color:#000;-webkit-text-fill-color:rgba(0,0,0,.12)">Fill colour faint</p>'),
  textFillReveal: W('<p id="t" style="color:#000;-webkit-text-fill-color:transparent">Fill reveal</p><script>t.style.webkitTextFillColor="currentColor"</script>'),
  clipPathReveal: W('<p id="t" style="color:#000;clip-path:inset(0 100% 0 0)">Clip-path reveal</p><script>t.style.clipPath="none"</script>'),
  transformReveal: W('<p id="t" style="color:#000;transform:scale(0.02)">Scale reveal text</p><script>t.style.transform="none"</script>'),
  placeholderLight: W('<input placeholder="Search docs" style="color:#000">'),
  selectFade: W('<select id="s" style="opacity:.05"><option>Arabic</option></select><script>s.style.opacity="1"</script>'),
  control: W('<p style="color:#000">Plain readable</p>'),
};
for (const [n, h] of Object.entries(cases)) { await run(n, h, true); await run(n, h, false); }
await b.close();
