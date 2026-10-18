import { createRequire } from 'node:module';
const { inspectLayout } = await import('/workspace/panel-r15/testrun/release/tools/width-screen.mjs');
const { chromium } = createRequire('/workspace/fannan-testdeps/node_modules/')('playwright-core');
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--headless=new'] });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await p.setContent('<html style="overflow:hidden"><body style="margin:0"><div><div style="height:1500px">top</div><p>LOWER TEXT</p></div></body></html>');
const r = await p.evaluate(inspectLayout); console.log('control no-wrapper clipped=', r.clipped.length); await b.close();
