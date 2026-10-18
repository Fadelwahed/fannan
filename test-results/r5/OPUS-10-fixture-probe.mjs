import { createRequire } from 'node:module'; import { pathToFileURL } from 'node:url';
const { chromium } = createRequire('/workspace/fannan-testdeps/node_modules/')('playwright-core');
const { spacingProbe } = await import(process.argv[2]);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--headless=new'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); await p.goto(pathToFileURL(process.argv[3]).href);
console.log(JSON.stringify(await p.evaluate(spacingProbe))); await b.close();
