import { createRequire } from 'node:module';
const { chromium } = createRequire('/workspace/fannan-testdeps/node_modules/')('playwright-core');
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--headless=new'] });
for (const lang of ['ar', 'en']) {
  const ctx = await b.newContext({ viewport: { width: 320, height: 700 } }); const p = await ctx.newPage();
  await p.goto(`http://127.0.0.1:8931/${lang}/`); await p.waitForTimeout(500);
  const i = await p.evaluate(() => { const d = document.querySelector('details.mnav'); const pn = d.querySelector('.panel'); const s = getComputedStyle(pn); const sm = d.querySelector('summary');
    return { open: d.open, summary: sm && { label: (sm.getAttribute('aria-label') || sm.textContent).trim().slice(0, 40), rect: sm.getBoundingClientRect().toJSON() }, panelInSummary: !!(sm && sm.contains(pn)), panel: { display: s.display, pos: s.position, insetInlineStart: s.insetInlineStart, insetInlineEnd: s.insetInlineEnd, left: s.left, right: s.right, width: s.width, minWidth: s.minWidth, top: s.top, opacity: s.opacity, clip: s.clip, clipPath: s.clipPath, contentVisibility: getComputedStyle(d).contentVisibility, rect: pn.getBoundingClientRect().toJSON() },
      elementAtLink: (() => { const a = pn.querySelector('a'); const r = a.getBoundingClientRect(); const x = Math.min(Math.max(r.left + 5, 1), innerWidth - 1); const e = document.elementFromPoint(x, r.top + r.height / 2); return e && (e === a || a.contains(e)) ? 'link on top' : e?.tagName; })(),
      css: [...document.styleSheets].flatMap(ss => { try { return [...ss.cssRules].map(r => r.cssText).filter(t => /mnav|\.panel/.test(t)).slice(0, 12); } catch { return []; } }) };
  });
  console.log(lang, JSON.stringify(i).slice(0, 2500));
  await p.screenshot({ path: `/workspace/panel-r21/repro/site-${lang}-320.png` });
  await p.click('details.mnav summary'); await p.waitForTimeout(200);
  const after = await p.evaluate(() => { const d = document.querySelector('details.mnav'); return { open: d.open, links: [...d.querySelectorAll('.panel a')].map(a => { const r = a.getBoundingClientRect(); return [a.textContent.trim().slice(0, 20), Math.round(r.left), Math.round(r.right), Math.round(r.width)]; }) }; });
  console.log(lang, 'after summary click', JSON.stringify(after));
  await p.screenshot({ path: `/workspace/panel-r21/repro/site-${lang}-320-open.png` });
  await ctx.close();
}
await b.close();
