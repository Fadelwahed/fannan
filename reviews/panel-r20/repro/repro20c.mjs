// Mi'mar R20 cross-check (test-only, box): GPT-03 photo stripe, GPT-04 requiresScript path test, GPT-01/02 band checks.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const T = '/workspace/panel-r20/testrun/release/tools/', R = '/workspace/panel-r20/repro/';
if (!T.includes('panel-r20') || !R.includes('panel-r20')) process.exit(99);
const { visibilityScan, requiresScriptCheck } = await import(T + 'visibility.mjs');
const { screenWidths } = await import(T + 'width-screen.mjs');
const { isolatedPage } = await import(T + 'probe-world.mjs');
const { chromium } = createRequire('/workspace/fannan-testdeps/node_modules/')('playwright-core');
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--headless=new'] });
const W = (x, s = '') => `<!doctype html><html lang="en"><head><style>body{margin:0;font:16px/1.5 sans-serif;color:#1a1a1a;background:#fff}main{padding:24px}</style></head><body><main><h1>Heading</h1>${x}</main>${s ? `<script>${s}</script>` : ''}</body></html>`;
const scan = async (name, html, js) => {
  const file = R + 'c-' + name + '.html'; writeFileSync(file, html);
  const ctx = await b.newContext({ javaScriptEnabled: js, viewport: { width: 1440, height: 900 } }); const main = await ctx.newPage();
  await main.goto(pathToFileURL(file).href); await main.waitForLoadState('load'); await main.waitForTimeout(200); const p = await isolatedPage(main);
  const w = await screenWidths(p, [1440], null); await p.evaluate(() => scrollTo(0, 0));
  const s = await visibilityScan(p); await ctx.close();
  return { w: (w.results || []).map(r => [r.width, r.clipped?.length, r.pass]), s };
};
const out = {};
// GPT-01: fixed-height card whose whole second paragraph is below; collapsed accordion with bare text; carousel showing middle slide
out.cardWholeBelow = await scan('cardbelow', W('<div style="width:320px;height:90px;overflow:hidden;border:1px solid #ccc;padding:8px;box-sizing:border-box"><h3 style="margin:0 0 8px">Card title</h3><p style="margin:0 0 40px">Short line.</p><p style="margin:0">Important paragraph wholly below the fixed height.</p></div>'), true);
out.accordionBare = await scan('accbare', W('<button aria-expanded="false">Question</button><div style="max-height:0;overflow:hidden">Bare answer text, no wrapper element.</div>'), true);
out.carouselMiddle = await scan('carmid', W('<div style="overflow:hidden;width:600px"><div style="display:flex;width:1800px;transform:translateX(-600px)"><p style="flex:0 0 600px;margin:0">Slide one</p><p style="flex:0 0 600px;margin:0">Slide two</p><p style="flex:0 0 600px;margin:0">Slide three</p></div></div>'), true);
// GPT-02: full-card gradient veil on an overflow-hidden card (text fits); honest truncation fade with no read-more
out.gradientVeil = await scan('gveil', W('<div class="c" style="position:relative;overflow:hidden;border-radius:12px;border:1px solid #ccc;padding:16px;width:400px"><p style="margin:0">Card text that fully fits inside the card.</p></div>', ''), true);
out.gradientVeil = await scan('gveil', W('<style>.c::after{content:"";position:absolute;inset:0;background:linear-gradient(rgba(255,255,255,.8),rgba(255,255,255,.9))}</style><div class="c" style="position:relative;overflow:hidden;border-radius:12px;border:1px solid #ccc;padding:16px;width:400px"><p style="margin:0">Card text that fully fits inside the card.</p></div>'), true);
out.fadeNoMore = await scan('fade', W('<style>.t::after{content:"";position:absolute;left:0;right:0;bottom:0;height:3em;background:linear-gradient(rgba(255,255,255,0),#fff)}</style><div class="t" style="position:relative;overflow:hidden;max-height:6em;width:400px"><p style="margin:0">Line one of an important description. Line two keeps going with detail. Line three has the price terms. Line four has the cancellation terms that readers need. Line five more terms. Line six more.</p></div>'), true);
// GPT-03: pale text over a light image with a dark stripe inside the line box
const svg = encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="200"><rect width="800" height="200" fill="#f0f0f0"/><rect x="600" y="0" width="40" height="200" fill="#111"/></svg>');
out.photoStripe = await scan('photo', W(`<div style="position:relative;width:800px;height:200px;background:url('data:image/svg+xml,${svg}')"><p id="t" style="position:absolute;top:80px;left:20px;margin:0;width:760px;font-size:24px;color:#d0d0d0">Pale caption text over a light photo with a dark detail</p></div>`), true);
// GPT-04: state renders without script but script wraps the text (path change) -> claim judged valid; text replaced in existing node -> claim judged false
const wrapS = 'const h=document.querySelector("#hero");h.innerHTML="<span>"+h.textContent+"</span>";';
const wrapOn = await scan('wrap', W('<p id="hero">Hero copy shown with or without script</p>', wrapS), true), wrapOff = await scan('wrap', W('<p id="hero">Hero copy shown with or without script</p>', wrapS), false);
const replS = 'document.querySelector("#status").textContent="Thanks, your message was sent";';
const replOn = await scan('repl', W('<p id="status">Fill in the form below</p>', replS), true), replOff = await scan('repl', W('<p id="status">Fill in the form below</p>', replS), false);
const integ = (on, off) => ({ probeWorld: { visibility: on.s }, jsOff: { visibility: off.s } });
const decl = { state: 'sent', requiresScript: true, trigger: 'Submit' };
out.wrapClaim = requiresScriptCheck({ declaration: decl, integrity: integ(wrapOn, wrapOff) });
out.replaceClaim = requiresScriptCheck({ declaration: decl, integrity: integ(replOn, replOff) });
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(15), JSON.stringify(v.s ? { w: v.w, meas: v.s.textMeasured, hidden: v.s.textHidden, unread: v.s.textUnreadable, obsc: v.s.textObscured, unmeas: v.s.textUnmeasured, byElement: Object.fromEntries(Object.entries(v.s.byElement || {}).map(([p, e]) => [p.slice(-40), [e.min, e.complete]])) } : v));
await b.close();
