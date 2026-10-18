// Mi'mar R22 cross-check (test-only, box): FP hunt for print-based lost-at-width and the minimum-glyph measure.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const T = '/workspace/panel-r22/testrun/release/tools/', R = '/workspace/panel-r22/repro/';
if (!T.includes('panel-r22') || !R.includes('panel-r22')) process.exit(99);
const { visibilityScan, glyphContrast } = await import(T + 'visibility.mjs');
const { screenWidths } = await import(T + 'width-screen.mjs');
const { isolatedPage } = await import(T + 'probe-world.mjs');
const { chromium } = createRequire('/workspace/fannan-testdeps/node_modules/')('playwright-core');
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--headless=new'] });
const W = x => `<!doctype html><html lang="en"><head><style>body{margin:0;font:16px/1.5 sans-serif;color:#1a1a1a;background:#fff}main{padding:24px}@media (max-width:600px){.l{display:none}}@media (min-width:601px){.s{display:none}}</style></head><body><main><h1>Heading</h1>${x}</main></body></html>`;
const open = async (n, h) => { const f = R + 'e-' + n + '.html'; writeFileSync(f, h); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const m = await ctx.newPage(); await m.goto(pathToFileURL(f).href); await m.waitForTimeout(200); return { ctx, p: await isolatedPage(m) }; };
const out = {};
const widths = { shortLabel: W('<button><span class="l">Request a demo</span><span class="s">Demo</span></button>'),
  shortLabelAria: W('<button aria-label="Request a demo"><span class="l">Request a demo</span><span class="s">Demo</span></button>'),
  wordmark: W('<a href="/"><img alt="" width="24" height="24" src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E"><span class="l">Northwind Studio</span></a><p>Body.</p>'),
  tableToCards: W('<table class="l"><tr><th>Plan</th><th>Price</th></tr><tr><td>Basic</td><td>10</td></tr></table><div class="s"><p>Plan</p><p>Basic</p><p>Price</p><p>10</p></div>'),
  rewordHeading: W('<h2><span class="l">Everything you need to run payroll</span><span class="s">Run payroll</span></h2>') };
for (const [n, h] of Object.entries(widths)) { const { ctx, p } = await open(n, h); const w = await screenWidths(p, [1440], null); out[n] = (w.results || []).map(r => ({ width: r.width, pass: r.pass, lost: (r.lost || []).map(x => x.print || x.text || x), clips: (r.clipped || []).map(c => c.rule) })); await ctx.close(); }
const glyph = { 'g767676-12': '<p style="font-size:12px;color:#767676">Small grey helper text at the AA limit for forms</p>', 'g767676-14-300': '<p style="font-size:14px;font-weight:300;color:#767676">Light grey caption text at the AA limit</p>', 'g767676-16': '<p style="color:#767676">Grey body text at the AA limit for paragraphs</p>', 'g6b6b6b-12': '<p style="font-size:12px;color:#6b6b6b">Small grey helper text with margin above AA</p>', 'g595959-11-italic': '<p style="font-size:11px;font-style:italic;color:#595959">Tiny italic footnote text, comfortably above AA</p>',
  'shadowCaption': '<div style="background:linear-gradient(90deg,#ddd,#888);padding:16px"><p style="color:#fff;font-size:24px;text-shadow:0 1px 3px rgba(0,0,0,.9),0 0 8px rgba(0,0,0,.8)">Caption with a legibility shadow</p></div>',
  'whiteOnGradient': '<div style="background:linear-gradient(90deg,#222,#555);padding:16px"><p style="color:#fff;font-size:18px">White text on a dark gradient band</p></div>' };
for (const [n, h] of Object.entries(glyph)) { const { ctx, p } = await open(n, W(h)); const s = await visibilityScan(p); const paths = Object.keys(s.byElement).filter(k => !/h1:0$/.test(k)); const g = await glyphContrast(p, paths); out[n] = Object.values(g).map(x => ({ ratio: x.ratio, clusters: x.clusters, dropped: x.dropped, reason: x.reason })); await ctx.close(); }
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(18), JSON.stringify(v));
await b.close();
