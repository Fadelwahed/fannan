// Mi'mar R15 cross-check repro (test-only, box). Imports the 67f3577 tools from the scratch copy.
import { createRequire } from 'node:module';
const T = '/workspace/panel-r16/testrun/release/tools/';
const { inspectLayout } = await import(T + 'width-screen.mjs');
const { contrastProbe } = await import(T + 'integrity.mjs');
const { chromium } = createRequire('/workspace/fannan-testdeps/node_modules/')('playwright-core');
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--headless=new'] });
const run = async (name, html, fn, js = true, width = 1440) => { const ctx = await b.newContext({ javaScriptEnabled: js, viewport: { width, height: 900 } }); const p = await ctx.newPage(); await p.setContent(html); await p.waitForTimeout(100); const r = await p.evaluate(fn); console.log(name, JSON.stringify(r)); await ctx.close(); return r; };
const pick = r => ({ clipped: r.clipped?.length, offscreenLeft: r.offscreenLeft?.length, unreachable: r.unreachable?.length, scrolledText: r.scrolledText?.length });
// GPT-04: hidden viewport, auto-height overflow-y:auto wrapper, text far below the fold
const g4 = '<html style="overflow:hidden"><body style="margin:0"><div style="overflow-y:auto"><div style="height:1500px">top</div><p>LOWER TEXT unreachable</p></div></body></html>';
for (const w of [1440, 320]) { const ctx = await b.newContext({ viewport: { width: w, height: 900 } }); const p = await ctx.newPage(); await p.setContent(g4); const r = await p.evaluate(inspectLayout); const s = await p.evaluate(() => { const d = document.querySelector('div'); return { clientH: d.clientHeight, scrollH: d.scrollHeight, docScroll: document.scrollingElement.scrollHeight }; }); console.log('GPT-04 width', w, JSON.stringify(pick(r)), JSON.stringify(s)); await ctx.close(); }
// control: bounded app shell
{ const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); await p.setContent('<html style="overflow:hidden;height:100%"><body style="margin:0;height:100%"><div style="overflow-y:auto;height:100%"><div style="height:1500px">top</div><p>LOWER</p></div></body></html>'); console.log('GPT-04 control app-shell', JSON.stringify(pick(await p.evaluate(inspectLayout)))); await ctx.close(); }
// GPT-12: opacity .1 text without JS, script sets opacity 1
const g12 = '<html><body style="background:#fff"><p id="t" style="color:#000;opacity:.1">Revealed text</p><script>document.getElementById("t").style.opacity="1"</script></body></html>';
await run('GPT-12 js-on ', g12, contrastProbe, true); await run('GPT-12 js-off', g12, contrastProbe, false);
await run('GPT-12 control light-grey js-off', '<html><body style="background:#fff"><p style="color:#eee">Grey</p></body></html>', contrastProbe, false);
await b.close();
