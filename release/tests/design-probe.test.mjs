import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { designProbe } from '../tools/design-probe.mjs';

const release = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const deps = resolve(release, '../runtime-deps');
const chrome = process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : '/usr/bin/google-chrome';

test('ARGON-R2-09: stock glassmorphism is gated at zero in both phases (design-quality.md: zero stock glassmorphism, both)', () => {
  const config = JSON.parse(readFileSync(join(release, 'runtime/quality-checks.json'), 'utf8'));
  assert.equal(config.thresholds.stockGlass, 0);
  assert.doesNotMatch(config.reason, /backdrop filters are signals/);
  const source = readFileSync(join(release, 'tools/pre-handoff-check.mjs'), 'utf8');
  assert.equal(source.split('design.glass <= q.stockGlass').length - 1 + source.split('d.glass <= q.stockGlass').length - 1, 2, 'page gate (both phases) and every declared state');
  assert.match(source, /import \{ designProbe, rawGlass, normColour, accentCheck \} from '\.\/design-probe\.mjs';/); // R11: rawGlass for served CSS/HTML
});

test('ARGON-R2-09: accent falls back to the Style Dictionary names; centred icon trios are found in any wrapper (real Chrome, test-only)', { skip: !(existsSync(join(deps, 'node_modules/playwright-core')) && existsSync(chrome)) && 'test-only deps or local Chrome absent' }, async () => {
  const { chromium } = createRequire(join(deps, 'node_modules/'))('playwright-core');
  const browser = await chromium.launch({ executablePath: chrome, args: ['--headless=new'] });
  try {
    const run = async html => { const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }); await page.setContent(html); const result = await page.evaluate(designProbe); await page.close(); return result; };
    const icon = '<svg width="24" height="24"><rect width="24" height="24"/></svg>';
    const sdAccent = await run(`<style>:root{--colors-accent:rgb(11,61,145)} b{display:block;width:100px;height:100px;background:var(--colors-accent)}</style><main><h1>x</h1><b></b></main>`);
    assert.equal(sdAccent.accentVar, '--colors-accent');
    assert.ok(sdAccent.accentRatio > 0, 'accent area measured, not null');
    const primary = await run(`<style>:root{--colors-primary:rgb(11,61,145)}</style><main><h1>x</h1></main>`);
    assert.equal(primary.accentVar, '--colors-primary');
    const legacy = await run(`<style>:root{--accent:#123;--colors-accent:#456}</style><main><h1>x</h1></main>`);
    assert.equal(legacy.accentVar, '--accent', '--accent wins when declared');
    const none = await run('<main><h1>x</h1></main>');
    assert.equal(none.accentRatio, null);
    const divTrio = await run(`<main><h1>x</h1><section><h2>Why</h2><div class="row" style="display:flex;text-align:center">${[1, 2, 3].map(() => `<div>${icon}<p>feature</p></div>`).join('')}</div></section></main>`);
    assert.equal(divTrio.iconRows, 1, 'centred trio inside a child div wrapper');
    const childCentred = await run(`<main><h1>x</h1><div style="display:grid;grid-template-columns:1fr 1fr 1fr">${[1, 2, 3].map(() => `<article style="text-align:center">${icon}<p>f</p></article>`).join('')}</div></main>`);
    assert.equal(childCentred.iconRows, 1, 'each card centred, no section at all');
    const sectionTrio = await run(`<main><h1>x</h1><section style="text-align:center">${icon}${icon}${icon}</section></main>`);
    assert.equal(sectionTrio.iconRows, 1, 'the R3 section rule still counts');
    const leftTrio = await run(`<main><h1>x</h1><div style="display:flex">${[1, 2, 3].map(() => `<div>${icon}<p>f</p></div>`).join('')}</div></main>`);
    assert.equal(leftTrio.iconRows, 0, 'left-aligned trio is not the centred trope');
    const four = await run(`<main><h1>x</h1><div style="text-align:center">${[1, 2, 3, 4].map(() => `<div>${icon}<p>f</p></div>`).join('')}</div></main>`);
    assert.equal(four.iconRows, 0);
  } finally { await browser.close(); }
});

test('R9 (sibling of CODEX-R4-02): page CSS cannot change the accent colour the probe measures (real Chrome, test-only)', { skip: !(existsSync(join(deps, 'node_modules/playwright-core')) && existsSync(chrome)) && 'test-only deps or local Chrome absent' }, async () => {
  const { chromium } = createRequire(join(deps, 'node_modules/'))('playwright-core');
  const browser = await chromium.launch({ executablePath: chrome, args: ['--headless=new'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const body = '<main><h1>x</h1><b style="display:block;width:400px;height:400px;background:var(--colors-accent)"></b></main>';
    await page.setContent(`<style>:root{--colors-accent:rgb(11,61,145)}</style>${body}`);
    const clean = await page.evaluate(designProbe);
    await page.setContent(`<style>:root{--colors-accent:rgb(11,61,145)} span{color:rgb(1,2,3)!important}</style>${body}`);
    const hostile = await page.evaluate(designProbe);
    assert.ok(clean.accentRatio > 0);
    assert.equal(hostile.accentRatio, clean.accentRatio, 'a span override does not hide the accent area');
    await page.setContent(`<style>:root{--colors-accent:not-a-colour}</style>${body}`);
    assert.equal((await page.evaluate(designProbe)).accentRatio, null, 'ARGON-R5-01: an invalid accent fails closed (null), it is not a zero-area pass');
  } finally { await browser.close(); }
});

test('ARGON-R5-01: a declared but invalid accent fails closed; it never shadows a valid one into a pass (real Chrome, test-only)', { skip: !(existsSync(join(deps, 'node_modules/playwright-core')) && existsSync(chrome)) && 'test-only deps or local Chrome absent' }, async () => {
  const { chromium } = createRequire(join(deps, 'node_modules/'))('playwright-core');
  const browser = await chromium.launch({ executablePath: chrome, args: ['--headless=new'] });
  try {
    const run = async css => { const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }); await page.setContent(`<style>${css} b{display:block;width:400px;height:400px;background:var(--colors-accent)}</style><main><h1>x</h1><b></b></main>`); const r = await page.evaluate(designProbe); await page.close(); return r; };
    const shadowed = await run(':root{--accent:not-a-colour;--colors-accent:rgb(11,61,145)}');
    assert.deepEqual(shadowed.accentInvalid, ['--accent']);
    assert.equal(shadowed.accentVar, '--colors-accent', 'the first VALID candidate is the one measured');
    assert.equal(shadowed.accentRatio, null, 'an invalid declared accent fails closed');
    assert.equal(shadowed.accentViewportRatio, null);
    const invalidOnly = await run(':root{--colors-accent:nope}');
    assert.equal(invalidOnly.accentVar, null); assert.equal(invalidOnly.accentRatio, null); assert.equal(invalidOnly.accentViewportRatio, null);
    const valid = await run(':root{--colors-accent:rgb(11,61,145)}');
    assert.deepEqual(valid.accentInvalid, []); assert.ok(valid.accentRatio > 0); assert.ok(valid.accentViewportRatio > 0);
    const missing = await run('');
    assert.equal(missing.accentRatio, null, 'no accent declared: null, which the handoff gate fails');
  } finally { await browser.close(); }
});

test('ARGON-R5-01: the gate treats a null accent as a FAIL on the page and on every state, including the scrolled viewport maximum', () => {
  const source = readFileSync(join(release, 'tools/pre-handoff-check.mjs'), 'utf8');
  assert.match(source, /design\.accentRatio !== null && design\.accentRatio <= q\.accentAreaRatioFullPage && design\.accentViewportRatio !== null/);
  assert.match(source, /const maxViewportAccent = viewportRatios\.length && !viewportRatios\.includes\(null\) \? Math\.max\(\.\.\.viewportRatios\) : null;/, 'Math.max(null) is 0, so a null ratio must not reach it');
  assert.match(source, /d\.accentRatio !== null && d\.accentRatio <= q\.accentAreaRatioFullPage && maxViewportAccent !== null && maxViewportAccent <= q\.accentAreaRatioViewport/);
});

test('R11 S2/C6: glass on html, body, rendered ::before/::after and -webkit-backdrop-filter is counted (real Chrome, test-only)', { skip: !(existsSync(join(deps, 'node_modules/playwright-core')) && existsSync(chrome)) && 'test-only deps or local Chrome absent' }, async () => {
  const { chromium } = createRequire(join(deps, 'node_modules/'))('playwright-core');
  const browser = await chromium.launch({ executablePath: chrome, args: ['--headless=new'] });
  try {
    const run = async html => { const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }); await page.setContent(html); const r = await page.evaluate(designProbe); await page.close(); return r; };
    const body = '<main><h1>x</h1><div class="card">card</div></main>';
    for (const [name, css] of [['html', 'html{backdrop-filter:blur(8px)}'], ['body', 'body{backdrop-filter:blur(8px)}'], ['::before', '.card::before{content:"";backdrop-filter:blur(8px)}'], ['::after', '.card::after{content:"";position:absolute;inset:0;backdrop-filter:blur(8px)}'], ['element', '.card{backdrop-filter:blur(8px)}'], ['-webkit- in a style element', '.card{-webkit-backdrop-filter:blur(8px)}']]) {
      assert.ok((await run(`<style>${css}</style>${body}`)).glass >= 1, `${name}: glass counted`);
    }
    assert.ok((await run(`<main><h1>x</h1><div style="-webkit-backdrop-filter: blur(4px)">card</div></main>`)).glass >= 1, '-webkit- in a style attribute');
    assert.ok((await run(`<style>.card::after{backdrop-filter:blur(8px)}</style>${body}`)).glass >= 1, 'a declared filter counts even on an unrendered ::after (fail closed)');
    assert.equal((await run(`<style>.card{backdrop-filter:none;-webkit-backdrop-filter:none}</style>${body}`)).glass, 0, 'none is not glass');
    assert.equal((await run(`<style>/* .card{-webkit-backdrop-filter:blur(2px)} */</style>${body}`)).glass, 0, 'a commented-out rule is not glass');
  } finally { await browser.close(); }
});

test('R11 panel D: glass inside open shadow roots, same-origin frames and constructed stylesheets is counted, also from the isolated probe world (real Chrome, test-only)', { skip: !(existsSync(join(deps, 'node_modules/playwright-core')) && existsSync(chrome)) && 'test-only deps or local Chrome absent' }, async () => {
  const { chromium } = createRequire(join(deps, 'node_modules/'))('playwright-core');
  const { isolatedPage } = await import('../tools/probe-world.mjs');
  const browser = await chromium.launch({ executablePath: chrome, args: ['--headless=new'] });
  try {
    const body = '<main><h1>x</h1><div id="host">host</div></main>';
    const shadow = (css, mode = 'open') => `${body}<script>const r = document.getElementById('host').attachShadow({ mode: '${mode}' }); r.innerHTML = '<style>${css}</style><p class="g">inside</p>';</script>`;
    const cases = [
      ['shadow <style>', shadow('.g{backdrop-filter:blur(6px)}'), 1],
      ['shadow ::after', shadow('.g::after{content:attr(class);backdrop-filter:blur(6px)}'), 1],
      ['shadow -webkit-', shadow('.g{-webkit-backdrop-filter:blur(6px)}'), 1],
      ['nested shadow', `${body}<script>const a = document.getElementById('host').attachShadow({ mode: 'open' }); a.innerHTML = '<div id="in">x</div>'; const b = a.getElementById('in').attachShadow({ mode: 'open' }); b.innerHTML = '<p style="backdrop-filter:blur(2px)">deep</p>';</script>`, 1],
      ['adoptedStyleSheets', `${body}<script>const r = document.getElementById('host').attachShadow({ mode: 'open' }); const sh = new CSSStyleSheet(); sh.replaceSync('.unused{backdrop-filter:blur(3px)}'); r.adoptedStyleSheets = [sh]; r.innerHTML = '<p class="g">x</p>';</script>`, 1],
      ['document adoptedStyleSheets', `${body}<script>const sh = new CSSStyleSheet(); sh.replaceSync('.unused{backdrop-filter:blur(3px)}'); document.adoptedStyleSheets = [sh];</script>`, 1],
      ['srcdoc frame', `${body}<iframe srcdoc="<style>p{backdrop-filter:blur(4px)}</style><p>framed</p>"></iframe>`, 1],
      ['frame ::before', `${body}<iframe srcdoc="<style>p::before{content:'';-webkit-backdrop-filter:blur(4px)}</style><p>framed</p>"></iframe>`, 1],
      ['clean shadow and frame', `${shadow('.g{color:red}')}<iframe srcdoc="<p>framed</p>"></iframe>`, 0],
    ];
    for (const [name, html, min] of cases) {
      const raw = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await raw.setContent(html); await raw.waitForTimeout(50);
      const main = await raw.evaluate(designProbe);
      const iso = await (await isolatedPage(raw)).evaluate(designProbe);
      if (min) { assert.ok(main.glass >= min, `${name}: counted`); assert.ok(iso.glass >= min, `${name}: counted from the isolated world`); }
      else { assert.equal(main.glass, 0, `${name}: none`); assert.equal(iso.glass, 0, `${name}: none (isolated)`); }
      await raw.close();
    }
    // Chrome drops the -webkit- alias when it parses a constructed sheet, so that case is caught only by the checker's
    // raw scan of the served HTML/JS text (rawGlass), as here:
    const { rawGlass } = await import('../tools/design-probe.mjs');
    assert.equal(rawGlass("sh.replaceSync('.g{-webkit-backdrop-filter:blur(3px)}')"), true);
    const raw = await browser.newPage(); await raw.setContent(`${body}<iframe srcdoc="<p>x</p>"></iframe>`); await raw.waitForTimeout(50);
    const scopes = (await raw.evaluate(designProbe)).glassScopes;
    assert.deepEqual([scopes.frames, scopes.unscannedFrames], [1, []], 'scanned frames are recorded');
    await raw.close();
  } finally { await browser.close(); }
});

test('R11 S2: the node side scans served CSS and HTML for -webkit-backdrop-filter, which Chrome drops', async () => {
  const { rawGlass } = await import('../tools/design-probe.mjs');
  assert.equal(rawGlass('.a{-webkit-backdrop-filter: blur(6px)}'), true);
  assert.equal(rawGlass('.a{backdrop-filter:saturate(2)}'), true);
  assert.equal(rawGlass('.a{backdrop-filter: none; -webkit-backdrop-filter:none}'), false);
  assert.equal(rawGlass('/* .a{-webkit-backdrop-filter: blur(6px)} */ .b{color:red}'), false);
  const source = readFileSync(join(release, 'tools/pre-handoff-check.mjs'), 'utf8');
  assert.match(source, /ev\.checks\.glassSource = \{ files: \[\.\.\.glassFiles\], pass: glassFiles\.size === 0 \};\nif \(!ev\.checks\.glassSource\.pass\) fail = true;/);
  assert.match(source, /\/text\\\/\(css\|html\|javascript\)\|application\\\/\(javascript\|ecmascript\)\|image\\\/svg\\\+xml\/\.test\(contentType\)/, 'served CSS, HTML, JS and SVG are scanned (panel D)');
});

test('R11 panel A: the accent fails closed at handoff, names the variable, binds to the approved token and is DEFERRED in wireframes', async () => {
  const { accentCheck } = await import('../tools/design-probe.mjs');
  const approved = { token: 'colors.primary', value: '#0B3D91' };
  const ok = { design: { accentVar: '--colors-primary', accent: '#0b3d91', accentInvalid: [] }, approved, pageColour: '#0b3d91', approvedColour: '#0b3d91' };
  assert.deepEqual([accentCheck({ ...ok, phase: 'handoff' }).status, accentCheck({ ...ok, phase: 'handoff' }).pass], ['PASS', true]);
  const cases = [
    [{ design: { accentVar: '--colors-accent', accent: '#fff', accentInvalid: ['--accent'] } }, /--accent is not a valid colour/],
    [{ design: { accentVar: null, accent: '', accentInvalid: [] } }, /no accent variable declared/],
    [{ approved: { token: null, value: null, error: 'tokens.json SHA-256 does not match the handoff' } }, /approved accent token unavailable: tokens\.json SHA-256/],
    [{ approvedColour: null }, /approved accent token colors\.primary \(#0B3D91\) is not a valid colour/],
    [{ design: { accentVar: '--colors-primary', accent: '#ff00aa', accentInvalid: [] }, pageColour: '#ff00aa' }, /accent variable --colors-primary \(#ff00aa\) does not match the approved token colors\.primary \(#0B3D91\)/],
  ];
  for (const [change, message] of cases) {
    const r = accentCheck({ ...ok, ...change, phase: 'handoff' });
    assert.equal(r.status, 'FAIL'); assert.equal(r.pass, false); assert.match(r.message, message);
    const w = accentCheck({ ...ok, ...change, phase: 'wireframe' });
    assert.equal(w.status, 'DEFERRED', 'wireframes never PASS or FAIL the accent'); assert.match(w.message, message, 'the problem is still recorded');
  }
  assert.equal(accentCheck({ ...ok, phase: 'wireframe' }).status, 'DEFERRED', 'a valid accent in a wireframe is DEFERRED, not PASS');
  assert.match(accentCheck({ ...ok, phase: 'handoff' }).areaBasis, /approximate/);
  const source = readFileSync(new URL('../tools/pre-handoff-check.mjs', import.meta.url), 'utf8');
  assert.match(source, /const approvedAccentToken = approvedAccent\(handoff\);/);
  assert.match(source, /ev\.checks\.accent = await accentFor\(p, design\);\nif \(!ev\.checks\.accent\.pass\) fail = true;/, 'the page');
  assert.match(source, /const accent = await accentFor\(p, d\);/, 'every state');
  assert.match(source, /&& accent\.pass && frames\.pass && integrity\.pass && stateResult\.focusFailures/, 'a state fails on the accent');
});

test('R12 M04/M05: served HTML/JS/SVG script forms and CSS-escaped property names count as glass; only an explicit none does not', async () => {
  const { rawGlass } = await import('../tools/design-probe.mjs');
  for (const t of ["el.style.webkitBackdropFilter='blur(4px)'", "el.style.WebkitBackdropFilter = 'blur(4px)'", "el.style.backdropFilter='blur(4px)'", "el.style.setProperty('-webkit-backdrop-filter','blur(4px)')", "el.style.setProperty('backdrop-filter', v)", "el.style['backdrop-filter'] = 'blur(2px)'", '<div style="backdrop-filter:blur(2px)">', '<svg><style>.a{-webkit-backdrop-filter:blur(1px)}</style></svg>']) assert.equal(rawGlass(t, 'script'), true, t);
  for (const t of ['.a{backdrop\\2d filter:blur(2px)}', 'html{backdrop\\-filter:blur(2px)}', '.a{back\\64 rop-filter:blur(2px)}', '.a{-webkit-backdrop\\-filter:blur(2px)}', '.a{backdrop-filter/**/:/**/blur(2px)}']) {
    assert.equal(rawGlass(t, 'css'), true, t); assert.equal(rawGlass(t, 'script'), true, `${t} in HTML`);
  }
  for (const t of ['.a{backdrop-filter:none}', '.a{color:red}', '/* backdrop-filter: blur(2px) */']) assert.equal(rawGlass(t, 'css'), false, t);
  for (const t of ["el.style.setProperty('color','red')", '<div style="backdrop-filter: none">', '<p>filters</p>']) assert.equal(rawGlass(t, 'script'), false, t);
  assert.equal(rawGlass("el.style.backdropFilter='blur(4px)'"), false, 'CSS files keep the declaration rule only (identifiers are not CSS)');
  const source = readFileSync(join(release, 'tools/pre-handoff-check.mjs'), 'utf8');
  assert.match(source, /rawGlass\(body\.toString\('utf8'\), \/text\\\/css\/\.test\(contentType\) \? 'css' : 'script'\)/, 'the served-file scan passes the kind');
});

test('R12 M05: real Chrome: an escaped root-element glass rule in a stylesheet is counted through the CSSOM (test-only)', { skip: !(existsSync(join(deps, 'node_modules/playwright-core')) && existsSync(chrome)) && 'test-only deps or local Chrome absent' }, async () => {
  const { chromium } = createRequire(join(deps, 'node_modules/'))('playwright-core');
  const browser = await chromium.launch({ executablePath: chrome, args: ['--headless=new'] });
  try {
    const page = await browser.newPage();
    await page.setContent('<style>html{backdrop\\2d filter:blur(2px)}</style><main><h1>x</h1></main>');
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).backdropFilter), 'none', 'Chrome 155 computes none on html');
    assert.ok((await page.evaluate(designProbe)).glass >= 1, 'counted anyway');
    await page.setContent('<style>html{backdrop-filter:none}</style><main><h1>x</h1></main>');
    assert.equal((await page.evaluate(designProbe)).glass, 0);
  } finally { await browser.close(); }
});

test('R12 M03: any frame, readable or not, fails the final handoff (axe and probes do not run inside frames); wireframes record it', async () => {
  const source = readFileSync(join(release, 'tools/pre-handoff-check.mjs'), 'utf8');
  assert.match(source, /const framesCheck = d => \(\{ frames: d\.glassScopes\.frames \+ d\.glassScopes\.unscannedFrames\.length,/);
  assert.match(source, /status: phase === 'wireframe' \? 'DEFERRED' : d\.glassScopes\.frames \+ d\.glassScopes\.unscannedFrames\.length \? 'FAIL' : 'PASS'/);
  assert.match(source, /ev\.checks\.frames = framesCheck\(design\);\nif \(!ev\.checks\.frames\.pass\) fail = true;/);
  assert.match(source, /const frames = framesCheck\(d\);/);
  if (!(existsSync(join(deps, 'node_modules/playwright-core')) && existsSync(chrome))) return;
  const { chromium } = createRequire(join(deps, 'node_modules/'))('playwright-core');
  const browser = await chromium.launch({ executablePath: chrome, args: ['--headless=new'] });
  try {
    for (const html of ['<iframe src="data:text/html,<p>x</p>"></iframe>', '<iframe sandbox srcdoc="<p>x</p>"></iframe>', '<iframe srcdoc="<p>x</p>"></iframe>']) {
      const page = await browser.newPage();
      await page.setContent(`<main><h1>x</h1>${html}</main>`); await page.waitForTimeout(100);
      const g = (await page.evaluate(designProbe)).glassScopes;
      assert.ok(g.frames + g.unscannedFrames.length >= 1, `${html} is seen as a frame`);
    }
  } finally { await browser.close(); }
});
