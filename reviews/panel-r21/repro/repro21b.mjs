// Mi'mar R21 cross-check (test-only, box): GPT-02 glyph measure, GPT-03 reveal identity, GPT-04 display:none at 320, GPT-06 inline wrap.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const T = '/workspace/panel-r21/testrun/release/tools/', R = '/workspace/panel-r21/repro/';
if (!T.includes('panel-r21') || !R.includes('panel-r21')) process.exit(99);
const { visibilityScan, glyphContrast, requiresScriptCheck } = await import(T + 'visibility.mjs');
const { screenWidths, resolveReveals } = await import(T + 'width-screen.mjs');
const { isolatedPage } = await import(T + 'probe-world.mjs');
const { chromium } = createRequire('/workspace/fannan-testdeps/node_modules/')('playwright-core');
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--headless=new'] });
const W = (x, s = '') => `<!doctype html><html lang="en"><head><style>body{margin:0;font:16px/1.5 sans-serif;color:#1a1a1a;background:#fff}main{padding:24px}</style></head><body><main><h1>Heading</h1>${x}</main>${s ? `<script>${s}</script>` : ''}</body></html>`;
const open = async (name, html, js = true) => { const file = R + 'b-' + name + '.html'; writeFileSync(file, html); const ctx = await b.newContext({ javaScriptEnabled: js, viewport: { width: 1440, height: 900 } }); const main = await ctx.newPage(); await main.goto(pathToFileURL(file).href); await main.waitForLoadState('load'); await main.waitForTimeout(200); return { ctx, p: await isolatedPage(main) }; };
const out = {};
// GPT-02: white caption over a dark image with a light patch under the first word only
for (const [n, patch] of [['patch1word', 70], ['patch3words', 260], ['nopatch', 0]]) {
  const svg = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="200"><rect width="1200" height="200" fill="#222"/><rect x="0" y="0" width="${patch}" height="200" fill="#e8e8e8"/></svg>`);
  const { ctx, p } = await open('glyph-' + n, W(`<div style="position:relative;width:1200px;height:200px;background:url('data:image/svg+xml,${svg}')"><p style="position:absolute;top:70px;left:4px;margin:0;font-size:28px;color:#fff">Teams deliver support across forty countries every single day of the year</p></div>`));
  const s = await visibilityScan(p); const paths = Object.keys(s.byElement).filter(k => /div:1\/p:0$/.test(k));
  out['glyph-' + n] = { pixelMin: paths.map(k => s.byElement[k].min), glyph: await glyphContrast(p, paths) };
  await ctx.close();
}
// GPT-03: reveal resolution by path identity
const acc = inner => W(`<button aria-expanded="false">What does it cost?</button><div style="max-height:0;overflow:hidden">${inner}</div>`);
const accOpen = inner => W(`<button aria-expanded="true">What does it cost?</button><div>${inner}</div>`);
const widthsOf = async (n, h) => { const { ctx, p } = await open(n, h); const w = await screenWidths(p, [1440], null); await ctx.close(); return w; };
for (const [n, dflt, exp] of [
  ['same', acc('<p>Plans start at ten dollars.</p>'), accOpen('<p>Plans start at ten dollars.</p>')],
  ['wrapper', acc('<p>Plans start at ten dollars.</p>'), accOpen('<div class="inner"><p>Plans start at ten dollars.</p></div>')],
  ['unrelated', acc('<p>Plans start at ten dollars.</p>'), accOpen('<p>Unrelated sentence in the same place.</p>')],
]) {
  const scopes = [{ scope: { screen: 'home', state: 'default', lang: 'en' }, widths: await widthsOf('rev-d-' + n, dflt) }, { scope: { screen: 'home', state: 'expanded', lang: 'en' }, widths: await widthsOf('rev-e-' + n, exp) }];
  const r = resolveReveals(scopes);
  out['reveal-' + n] = { pass: r.pass, unresolved: r.unresolved.length, defaultRules: scopes[0].widths.results.map(x => x.clipped.map(c => c.rule + (c.revealedBy ? ':' + c.revealedBy : ''))) };
}
// GPT-04: the only Submit control hidden by a media query below 600px
out.hiddenSubmit320 = (await widthsOf('hidden-submit', W('<style>@media (max-width:600px){.cta{display:none}}</style><form><label>Email <input type="email"></label> <button class="cta">Subscribe</button></form><p class="cta">Terms apply to all plans.</p>'))).results.map(r => [r.width, r.pass, r.clipped.length]);
// GPT-06: script splits a text node with an inline span, content unchanged
const s6 = 'const p=document.querySelector("#st");p.innerHTML="Static <span>state</span> text";';
const on = await open('wrap6', W('<p id="st">Static state text</p>', s6), true), sOn = await visibilityScan(on.p); await on.ctx.close();
const off = await open('wrap6', W('<p id="st">Static state text</p>', s6), false), sOff = await visibilityScan(off.p); await off.ctx.close();
out.inlineWrapClaim = requiresScriptCheck({ declaration: { state: 'sent', requiresScript: true, trigger: 'Submit' }, integrity: { probeWorld: { visibility: sOn }, jsOff: { visibility: sOff } } });
for (const [k, v] of Object.entries(out)) console.log(k.padEnd(18), JSON.stringify(v));
await b.close();
