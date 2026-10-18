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
  control: W('<p>Plain body copy.</p>'),
  heroImgSibling: W('<section style="position:relative;height:500px;color:#fff"><img src="photo.png" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"><div style="position:absolute;inset:0;background:rgba(0,0,0,.55)"></div><div style="position:relative;padding:80px"><h2 style="font-size:56px;margin:0">Headline over an img</h2><p>Supporting line over the photo.</p></div></section>'),
  heroImgNoScrim: W('<section style="position:relative;height:500px;color:#fff"><img src="photo.png" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:brightness(1.8)"><div style="position:relative;padding:80px"><p>White text on a pale photo, no scrim</p></div></section>'),
  clippedCard: W('<div style="width:300px;height:60px;overflow:hidden;border:1px solid #ccc;padding:8px"><p style="margin:0">A card description that is far too long for its fixed-height box, so the last lines are cut off by mistake.</p></div>'),
  svgOverlay: W('<section style="position:relative"><p>Body text under a decorative wave drawn after it.</p><svg style="position:absolute;inset:0;width:100%;height:100%" viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M0 9 Q50 7 100 9 V10 H0z" fill="#eef"/></svg></section>'),
  pngSticker: W('<section style="position:relative"><h2 style="font-size:40px">Heading with a sticker</h2><img src="photo.png" alt="" style="position:absolute;left:0;top:0;width:500px;height:60px;opacity:1;clip-path:circle(8px at 10px 10px)"></section>'),
  veilPE70: W('<div style="position:relative"><p>Body text under a 70% white veil with pointer-events none.</p><div style="position:absolute;inset:0;background:rgba(255,255,255,.7);pointer-events:none"></div></div>'),
  veilPE70js: W('<div style="position:relative"><p>Body text under a veil a script removes.</p><div id="v" style="position:absolute;inset:0;background:rgba(255,255,255,.7);pointer-events:none"></div></div><script>v.remove()</script>'),
  veil70: W('<div style="position:relative"><p>Body text under a 70% white veil.</p><div style="position:absolute;inset:0;background:rgba(255,255,255,.7)"></div></div>'),
  focusRing: W('<a href="#" id="l" style="outline:3px solid #005fcc;outline-offset:2px">Focused link</a><script>l.focus()</script>'),
  popoverOpen: W('<button popovertarget="p">Menu</button><div id="p" popover style="margin:0;top:60px;left:40px;padding:12px">Popover menu item</div><p>Paragraph below the popover trigger, partly under it.</p><script>p.showPopover()</script>'),
  dialogOpen: W('<p>Background paragraph behind a modal.</p><dialog id="d"><p>Dialog text</p></dialog><script>d.showModal()</script>'),
  stickyThead: W('<div style="height:200px;overflow:auto;width:500px"><table style="border-collapse:collapse;width:100%"><thead><tr><th style="position:sticky;top:0;background:#fff">Name</th><th style="position:sticky;top:0;background:#fff">Value</th></tr></thead><tbody>' + Array.from({ length: 20 }, (_, i) => `<tr><td>Row ${i}</td><td>${i * 7}</td></tr>`).join('') + '</tbody></table></div>'),
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
