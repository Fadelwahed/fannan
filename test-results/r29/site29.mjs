// R29 real site in the full checker's shape: [positional default, declared default, (declared menu-open)], probes from the handoff
import { createRequire } from 'node:module'; import { readFileSync } from 'node:fs';
const T = process.env.TOOLS; const ws = await import(T + '/width-screen.mjs'); const { isolatedPage } = await import(T + '/probe-world.mjs'); // JS off: settle callbacks only run in the isolated world, as in the checker
const H = JSON.parse(readFileSync('/workspace/fannan-mimar-wt/test-results/r29/site-handoff.json', 'utf8'));
const { chromium } = createRequire('/workspace/fannan-testdeps/node_modules/')('playwright-core');
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--headless=new'] });
const open = async (url, js, menu) => { const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: js, serviceWorkers: 'block' }); const m = await isolatedPage(await ctx.newPage()); await m.goto(url, { timeout: 60000 }); await m.waitForLoadState('load'); await m.waitForTimeout(300);  if (menu) await m.evaluate(() => { const d = document.querySelector('details.mnav'); if (d) d.open = true; }); return m; };
for (const lang of ['en', 'ar']) for (const js of (process.env.JS ? [process.env.JS === 'on'] : [true, false])) for (const shape of [['default', 'default'], ['default', 'default', 'menu-open']]) {
  const decl = H.screens[0].states.filter(s => s.lang === lang);
  const probes = decl.filter(s => s.opener && s.reveals).map(s => ({ state: s.id, opener: s.opener, reveals: s.reveals }));
  const scopes = [];
  for (const st of shape) { const d = decl.find(s => s.id === st); scopes.push({ scope: { screen: 'home', state: st, lang }, widths: await ws.screenWidths(await open(`http://127.0.0.1:8917/${lang}/`, js, st === 'menu-open'), [1440, 320], null, 900, probes), declaration: d.opener ? { opener: d.opener, reveals: d.reveals } : null }); }
  const r = ws.resolveReveals(scopes);
  const lost = scopes.flatMap((s, i) => s.widths.results.flatMap(x => (x.lost || []).filter(l => !l.reachableIn && !l.deferred).map(l => `${i}:${s.scope.state}@${x.width}:${l.print}`)));
  const decls = scopes.flatMap(s => (s.widths.results.flatMap(x => x.declarations || [])).map(d => `${d.state}:${d.valid ? 'valid' : 'invalid ' + d.why}`));
  console.log(lang, js ? 'js-on ' : 'js-off', shape.join('+').padEnd(26), r.pass && scopes.every(s => s.widths.pass) ? 'PASS' : 'FAIL', 'unrescued=' + lost.length, JSON.stringify(lost).slice(0, 300), [...new Set(decls)].join(' '));
}
await b.close();
