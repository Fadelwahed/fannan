// Mi'mar R18 repro B (test-only): pixel floor on thin/light fonts that pass AA by colour.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const T = '/workspace/panel-r18/testrun/release/tools/', R = '/workspace/panel-r18/repro/';
if (!T.includes('panel-r18')) process.exit(99);
const { visibilityScan } = await import(T + 'integrity.mjs');
const { chromium } = createRequire('/workspace/fannan-testdeps/node_modules/')('playwright-core');
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--headless=new'] });
const rows = [];
for (const fam of ['Inter', 'Inter Tight', 'Lato']) for (const wt of [100, 200, 300, 400]) for (const size of [12, 14, 16, 24, 48]) for (const col of ['#1a1a1a', '#595959', '#767676'])
  rows.push({ fam, wt, size, col, id: `t${rows.length}` });
const html = `<!doctype html><html lang="en"><body style="margin:20px;background:#fff">${rows.map(r => `<p id="${r.id}" style="font:${r.wt} ${r.size}px '${r.fam}';color:${r.col};margin:4px 0">Sample ${r.fam} ${r.wt} ${r.size}px</p>`).join('')}</body></html>`;
const file = R + 'case-thin-matrix.html'; writeFileSync(file, html);
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
await p.goto(pathToFileURL(file).href); await p.waitForTimeout(200);
const s = await visibilityScan(p, { floor: 3, smallFloor: 1.5, smallInk: 30, inkDelta: 24, minInk: 3, inkPercentile: 0.9, minTextHeight: 4, animationWaitMs: 2000, maxBands: 60, maxItems: 1000 });
const bad = new Map(s.items.filter(i => i.problem === 'unreadable').map(i => [i.text, i.ratio]));
const fails = rows.filter(r => bad.has(`Sample ${r.fam} ${r.wt} ${r.size}px`) );
console.log('total', rows.length, 'unreadable', s.textUnreadable, 'unmeasured', s.textUnmeasured);
for (const r of rows) { const t = `Sample ${r.fam} ${r.wt} ${r.size}px`; }
const keyed = {}; for (const i of s.items) if (i.problem === 'unreadable') (keyed[i.text] ||= []).push(i.ratio);
console.log(JSON.stringify(keyed));
await b.close();
