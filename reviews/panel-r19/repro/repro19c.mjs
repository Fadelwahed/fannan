// Mi'mar R19 cross-check repro (test-only, box): R18 backstop on honest pages and honest mistakes, JS on and off.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const T = '/workspace/panel-r19/testrun/release/tools/', R = '/workspace/panel-r19/repro/';
if (!T.includes('panel-r19') || !R.includes('panel-r19')) process.exit(99);
const { visibilityScan, contrastProbe } = await import(T + 'integrity.mjs');
const { inspectLayout } = await import(T + 'width-screen.mjs');
const { isolatedPage } = await import(T + 'probe-world.mjs');
const { chromium } = createRequire('/workspace/fannan-testdeps/node_modules/')('playwright-core');
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--headless=new'] });
const W = x => `<!doctype html><html lang="en"><head><style>body{margin:0;font:16px/1.5 Inter,sans-serif;color:#1a1a1a;background:#fff}main{padding:40px}</style></head><body><main><h1>Page heading</h1>${x}</main></body></html>`;
const cases = {
  darkTextDarkImg: W('<section style="position:relative;height:400px"><img src="photo.png" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:brightness(.35)"><div style="position:relative;padding:80px;color:#222"><p style="font-size:20px">Dark text over a dark photo, no scrim</p></div></section>'),
  pseudoVeilJs: W('<style>.loading{position:relative}.loading::after{content:"";position:absolute;inset:0;background:rgba(255,255,255,.8)}</style><div id="c" class="loading"><p>Card text under a loading veil a script removes.</p></div><script>c.classList.remove("loading")</script>'),
  pseudoFade: W('<style>.clamp{position:relative;max-height:4.5em;overflow:hidden}.clamp::after{content:"";position:absolute;left:0;right:0;bottom:0;height:3em;background:linear-gradient(transparent,#fff)}</style><div class="clamp" style="width:400px"><p style="margin:0">Line one of a long story that is truncated with a fade, line two continues, line three fades away, line four is cut.</p></div><button>Read more</button>'),
  innerLazy: `<!doctype html><html lang="en"><head><style>html,body{height:100%;overflow:hidden;margin:0;font:16px Inter}main{height:100%;overflow:auto;padding:0 40px;box-sizing:border-box}</style></head><body><main id="m"><h1>App panel</h1><p>Intro text.</p><div style="height:4000px"></div><div id="s" style="height:1px"></div><div id="f"></div></main><script>new IntersectionObserver(e=>{if(e[0].isIntersecting)f.innerHTML='<p style="color:#eee">Lazy panel text, very light</p>'},{root:m}).observe(s)</script></body></html>`,
  docLazyLight: W('<div style="height:4000px"></div><div id="s" style="height:1px"></div><div id="f"></div><script>new IntersectionObserver(e=>{if(e[0].isIntersecting)f.innerHTML=\'<p style="color:#eee">Lazy doc text, very light</p>\'}).observe(s)</script>'),
};
for (const [n, h] of Object.entries(cases)) for (const js of [true, false]) {
  const file = R + 'case-' + n + '.html'; writeFileSync(file, h);
  const ctx = await b.newContext({ javaScriptEnabled: js, viewport: { width: 1440, height: 900 } }); const main = await ctx.newPage();
  await main.goto(pathToFileURL(file).href); await main.waitForLoadState('load'); await main.waitForTimeout(150); const p = await isolatedPage(main);
  const s = await visibilityScan(p); const c = await p.evaluate(contrastProbe); const lay = await p.evaluate(inspectLayout);
  console.log(n.padEnd(15), js ? 'on ' : 'off', JSON.stringify({ meas: s.textMeasured, obsc: s.textObscured, unread: s.textUnreadable, unmeas: s.textUnmeasured, hidden: s.textHidden, steps: s.steps, cssFail: c.contrastFailures, cssUnk: c.contrastUnknown, clipped: lay.clipped?.length }), JSON.stringify(s.items.slice(0, 3).map(i => [i.problem, (i.text || '').slice(0, 24), i.reason || i.ratio || i.covered || i.graded])));
  await ctx.close();
}
await b.close();
