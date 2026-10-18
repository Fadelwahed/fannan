import { createRequire } from 'node:module';
const { chromium } = createRequire('/workspace/fannan-testdeps/node_modules/')('playwright-core');
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--headless=new'] });
for (const lang of ['ar', 'en']) for (const js of [true, false]) {
  const ctx = await b.newContext({ viewport: { width: 320, height: 800 }, javaScriptEnabled: js }); const p = await ctx.newPage();
  await p.goto(`http://127.0.0.1:8931/${lang}/`); await p.waitForTimeout(500);
  const info = await p.evaluate(() => {
    const out = [];
    for (const a of document.querySelectorAll('a')) { const r = a.getBoundingClientRect(); if (r.width && (r.left < -1 || r.right > innerWidth + 1)) {
      const chain = []; for (let e = a; e && e !== document.body; e = e.parentElement) { const s = getComputedStyle(e); chain.push(`${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}${e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}[${s.display},${s.overflowX},${s.position},${s.transform !== 'none' ? 'T' : ''},vis=${s.visibility},w=${Math.round(e.getBoundingClientRect().width)},L=${Math.round(e.getBoundingClientRect().left)},inert=${e.inert},aria-hidden=${e.getAttribute('aria-hidden')}]`); }
      out.push({ text: a.textContent.trim().slice(0, 30), left: Math.round(r.left), right: Math.round(r.right), tabbable: a.tabIndex >= 0, chain: chain.slice(0, 5) }); } }
    const toggles = [...document.querySelectorAll('button,[aria-expanded],[aria-controls]')].filter(e => e.getBoundingClientRect().width > 0).map(e => ({ tag: e.tagName, label: (e.getAttribute('aria-label') || e.textContent).trim().slice(0, 30), expanded: e.getAttribute('aria-expanded') }));
    return { dir: document.dir, scrollW: document.documentElement.scrollWidth, htmlOverflowX: getComputedStyle(document.documentElement).overflowX, bodyOverflowX: getComputedStyle(document.body).overflowX, out, toggles };
  });
  console.log(lang, js ? 'js-on' : 'js-off', JSON.stringify(info));
  if (lang === 'ar' && js) { await p.screenshot({ path: '/workspace/panel-r21/repro/site-ar-320.png' }); await p.evaluate(() => scrollTo(-10000, 0)); await p.waitForTimeout(100); console.log('ar scrollX after scrollTo(-10000):', await p.evaluate(() => scrollX)); }
  await ctx.close();
}
await b.close();
