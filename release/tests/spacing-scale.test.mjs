import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const release = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const deps = resolve(release, '../runtime-deps');
const chrome = process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : '/usr/bin/google-chrome';

test('OPUS-R2-10: handoff config and both checker passes use the spacing off-scale count', () => {
  const config = JSON.parse(readFileSync(join(release, 'runtime/quality-checks.json'), 'utf8'));
  assert.equal(config.thresholds.spacingOffScale, 0);
  const source = readFileSync(join(release, 'tools/pre-handoff-check.mjs'), 'utf8');
  assert.match(source, /import \{ spacingProbe, approvedSpacing, approvedAccent \} from '\.\/spacing-scale\.mjs';/); // R11 panel A
  assert.match(source, /const approvedScale = approvedSpacing\(handoff\);/); // CODEX-R3-02
  assert.equal(source.split('await p.evaluate(spacingProbe, approvedScale.values)').length - 1, 2, 'page and every declared state, both with the approved scale (CODEX-R3-02)');
  assert.doesNotMatch(source, /evaluate\(spacingProbe\)/, 'no probe call derives the scale from the page');
  assert.equal(source.split('spacingOffScale.length <= q.spacingOffScale').length - 1, 2);
});

test('OPUS-R2-10: spacing probe counts computed margins/paddings/gaps that are not on the built --spacing-* scale (real Chrome, test-only)', { skip: !(existsSync(join(deps, 'node_modules/playwright-core')) && existsSync(chrome)) && 'test-only deps or local Chrome absent' }, async () => {
  const { spacingProbe } = await import('../tools/spacing-scale.mjs');
  const { chromium } = createRequire(join(deps, 'node_modules/'))('playwright-core');
  const browser = await chromium.launch({ executablePath: chrome, args: ['--headless=new'] });
  try {
    const run = async (html, approved = ['8px', '1rem', '24px']) => { const page = await browser.newPage(); await page.setContent(html); const result = await page.evaluate(spacingProbe, approved); await page.close(); return result; }; // CODEX-R3-02: the approved scale comes from the handoff tokens, not the page
    const tokens = ':root{--spacing-sm:8px;--spacing-md:1rem;--spacing-lg:24px}*{margin:0;padding:0}';
    const onScale = await run(`<style>${tokens} main{padding:var(--spacing-md);display:flex;gap:var(--spacing-sm)} p{margin-bottom:24px;padding:8px 16px}</style><main><p>a</p><p>b</p></main>`);
    assert.deepEqual(onScale.spacingScale, ['16px', '24px', '8px']);
    assert.deepEqual(onScale.spacingOffScale, []);
    const offScale = await run(`<style>${tokens} main{padding:13px;display:grid;row-gap:10px} p{margin-top:7px}</style><main><p>a</p></main>`);
    assert.deepEqual(offScale.spacingOffScale.map(v => v.value).sort(), ['10px', '13px', '7px']);
    const hidden = await run(`<style>${tokens} p{padding:13px;display:none} div{margin:0 auto;width:100px;padding:8px}</style><p>x</p><div>y</div>`);
    assert.deepEqual(hidden.spacingOffScale, [], 'hidden elements and auto horizontal margins are ignored');
    const none = await run(`<style>*{margin:0;padding:0} p{padding:8px}</style><p>x</p>`, []);
    assert.deepEqual(none.spacingScale, []);
    assert.deepEqual(none.spacingOffScale.map(v => v.value), ['8px'], 'no scale: every nonzero spacing is off-scale');
  } finally { await browser.close(); }
});

test('ARGON-R2-06: a secret-looking variable in the checker environment does not reach the browser process (real Chrome, Linux /proc, test-only)', { skip: !(process.platform === 'linux' && existsSync(join(deps, 'node_modules/playwright-core')) && existsSync(chrome)) && 'Linux, test-only deps or local Chrome absent' }, async () => {
  const { browserLaunchEnv } = await import('../tools/executable-trust.mjs');
  const { readdirSync, mkdtempSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { chromium } = createRequire(join(deps, 'node_modules/'))('playwright-core');
  const home = mkdtempSync(join(tmpdir(), 'fannan-browser-home-'));
  process.env.FANNAN_R6_SENTINEL = 'must-not-leak';
  const browser = await chromium.launch({ executablePath: chrome, args: ['--headless=new'], env: browserLaunchEnv(home) });
  try {
    const children = readdirSync('/proc').filter(pid => /^\d+$/.test(pid)).filter(pid => { try { return /^PPid:\s*(\d+)$/m.exec(readFileSync(`/proc/${pid}/status`, 'utf8'))[1] === String(process.pid); } catch { return false; } });
    const envs = children.map(pid => { try { return readFileSync(`/proc/${pid}/environ`, 'utf8').split('\0'); } catch { return null; } }).filter(Boolean);
    assert.ok(envs.length >= 1, 'browser child found');
    for (const env of envs) {
      assert.ok(!env.some(v => v.startsWith('FANNAN_R6_SENTINEL=')), 'sentinel absent');
      assert.ok(env.includes(`HOME=${home}`) && env.includes('PATH=/usr/bin:/bin'));
    }
  } finally { await browser.close(); delete process.env.FANNAN_R6_SENTINEL; rmSync(home, { recursive: true, force: true }); }
});

test('OPUS-R2-10 follow-up: the bundled fixture page uses the built spacing scale and passes the spacing check unweakened (real Chrome, test-only)', { skip: !(existsSync(join(deps, 'node_modules/playwright-core')) && existsSync(chrome)) && 'test-only deps or local Chrome absent' }, async () => {
  const { fixturePage } = await import('./fixture-page.mjs');
  const { spacingProbe } = await import('../tools/spacing-scale.mjs');
  const html = fixturePage('variables.css');
  assert.match(html, /<link rel="stylesheet" href="variables\.css">/, 'loads the built token CSS');
  const { chromium } = createRequire(join(deps, 'node_modules/'))('playwright-core');
  const browser = await chromium.launch({ executablePath: chrome, args: ['--headless=new'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.route('**/variables.css', route => route.fulfill({ contentType: 'text/css', body: ':root{--spacing-sm:8px;--spacing-md:16px;--spacing-lg:32px}' })); // the example DESIGN.md scale
    await page.route('http://fixture.invalid/home.html', route => route.fulfill({ contentType: 'text/html', body: html }));
    await page.goto('http://fixture.invalid/home.html');
    const result = await page.evaluate(spacingProbe, ['8px', '16px', '32px']); // CODEX-R3-02: approved scale passed in
    assert.deepEqual(result.spacingScale, ['16px', '32px', '8px']);
    assert.deepEqual(result.spacingOffScale, []);
  } finally { await browser.close(); }
});

test('CODEX-R3-02: a page-declared --spacing-* variable does not legitimise off-scale spacing; only the approved scale counts (real Chrome, test-only)', { skip: !(existsSync(join(deps, 'node_modules/playwright-core')) && existsSync(chrome)) && 'test-only deps or local Chrome absent' }, async () => {
  const { spacingProbe } = await import('../tools/spacing-scale.mjs');
  const { chromium } = createRequire(join(deps, 'node_modules/'))('playwright-core');
  const browser = await chromium.launch({ executablePath: chrome, args: ['--headless=new'] });
  try {
    const page = await browser.newPage();
    await page.setContent('<style>:root{--spacing-sm:8px;--spacing-md:1rem;--spacing-offscale:13px}*{margin:0;padding:0} main{padding:var(--spacing-offscale)} p{padding:var(--spacing-sm)}</style><main><p>a</p></main>');
    const result = await page.evaluate(spacingProbe, ['8px', '1rem']);
    assert.deepEqual(result.spacingScale, ['16px', '8px']);
    assert.deepEqual(result.spacingOffScale.map(v => v.value), ['13px'], 'the extra page variable is not part of the scale');
    const tampered = await page.evaluate(spacingProbe, ['8px', '13px; padding: 0', { value: '13px' }, 'var(--spacing-offscale)', '-13px']);
    assert.deepEqual(tampered.spacingOffScale.map(v => v.value), ['13px'], 'only plain px/rem/em lengths are taken from the approved list');
  } finally { await browser.close(); }
});

test('CODEX-R3-02: the approved spacing scale is read from the hash-checked handoff token JSON and its build evidence', async () => {
  const { approvedSpacing } = await import('../tools/spacing-scale.mjs');
  const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { createHash } = await import('node:crypto');
  const root = mkdtempSync(join(tmpdir(), 'fannan-spacing-r7-'));
  try {
    const json = join(root, 'tokens.json'), build = join(root, 'variables.css.build.json');
    const tokens = { spacing: { none: { $type: 'dimension', $value: 0 }, sm: { $type: 'dimension', $value: '8px' }, md: { $type: 'dimension', $value: '1rem' }, alias: { $value: '{spacing.sm}' }, section: { lg: { $type: 'dimension', $value: '32px' } } }, colors: { primary: { $type: 'color', $value: '#123456' } } };
    const bytes = JSON.stringify(tokens), sha = createHash('sha256').update(bytes).digest('hex');
    writeFileSync(json, bytes); writeFileSync(build, JSON.stringify({ inputSha256: sha }));
    const handoff = { tokens: { json: { path: json, sha256: sha }, buildEvidence: { path: build } } };
    const ok = approvedSpacing(handoff);
    assert.equal(ok.error, undefined);
    assert.deepEqual(ok.values, ['1rem', '32px', '8px']);
    assert.deepEqual(ok.source, { path: json, sha256: sha });
    for (const [bad, message] of [
      [{}, /tokens\.json path and SHA-256 required/],
      [{ tokens: { json: { path: json, sha256: '0'.repeat(64) }, buildEvidence: { path: build } } }, /does not match the handoff/],
      [{ tokens: { json: { path: json, sha256: sha } } }, /build evidence/],
      [{ tokens: { json: { path: join(root, 'missing.json'), sha256: sha }, buildEvidence: { path: build } } }, /cannot be read/]
    ]) assert.match(approvedSpacing(bad).error, message);
    // R11 panel A: the approved accent comes from the same hash-checked tokens (colors.accent, else colors.primary).
    const { approvedAccent } = await import('../tools/spacing-scale.mjs');
    assert.deepEqual(approvedAccent(handoff), { token: 'colors.primary', value: '#123456', source: { path: json, sha256: sha } });
    const withAccent = { ...tokens, colors: { ...tokens.colors, brand: { $type: 'color', $value: '#abcdef' }, accent: { $value: '{colors.brand}' } } };
    const b2 = JSON.stringify(withAccent), sha2 = createHash('sha256').update(b2).digest('hex');
    const json2 = join(root, 'tokens2.json'), build2 = join(root, 'b2.json');
    writeFileSync(json2, b2); writeFileSync(build2, JSON.stringify({ inputSha256: sha2 }));
    assert.deepEqual(approvedAccent({ tokens: { json: { path: json2, sha256: sha2 }, buildEvidence: { path: build2 } } }).value, '#abcdef', 'colors.accent wins and references resolve');
    const noColour = JSON.stringify({ spacing: tokens.spacing }), sha3 = createHash('sha256').update(noColour).digest('hex');
    writeFileSync(json2, noColour); writeFileSync(build2, JSON.stringify({ inputSha256: sha3 }));
    assert.match(approvedAccent({ tokens: { json: { path: json2, sha256: sha3 }, buildEvidence: { path: build2 } } }).error, /no colors\.accent or colors\.primary/);
    assert.match(approvedAccent({}).error, /tokens\.json path and SHA-256 required/);
    writeFileSync(build, JSON.stringify({ inputSha256: '1'.repeat(64) }));
    assert.match(approvedSpacing(handoff).error, /build evidence/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('CODEX-R4-02: page CSS cannot change the approved scale, and em is converted at each element\'s own font size (real Chrome, test-only)', { skip: !(existsSync(join(deps, 'node_modules/playwright-core')) && existsSync(chrome)) && 'test-only deps or local Chrome absent' }, async () => {
  const { spacingProbe } = await import('../tools/spacing-scale.mjs');
  const source = readFileSync(join(release, 'tools/spacing-scale.mjs'), 'utf8');
  const { chromium } = createRequire(join(deps, 'node_modules/'))('playwright-core');
  const browser = await chromium.launch({ executablePath: chrome, args: ['--headless=new'] });
  try {
    const page = await browser.newPage();
    // a hostile !important rule on every div would have turned each approved value into 13px through a measuring div
    await page.setContent('<style>*{margin:0;padding:0} div{padding-top:13px!important} p{padding:8px}</style><p>a</p><div>b</div>');
    const hijack = await page.evaluate(spacingProbe, ['8px', '1rem']);
    assert.deepEqual(hijack.spacingScale, ['16px', '8px'], 'the scale is computed numerically');
    assert.deepEqual(hijack.spacingOffScale.map(v => v.value), ['13px'], 'the override is still reported off-scale');
    // 1em must be accepted on text of any size: 16px body, 24px heading, 12px small
    await page.setContent('<style>*{margin:0;padding:0} body{font-size:16px} h2{font-size:24px;padding:1em} small{display:block;font-size:12px;padding:1em} p{padding:1em}</style><h2>H</h2><p>p</p><small>s</small>');
    const em = await page.evaluate(spacingProbe, ['1em']);
    assert.deepEqual(em.spacingOffScale, [], '24px on 24px text, 16px on 16px text and 12px on 12px text are all 1em');
    await page.setContent('<style>*{margin:0;padding:0} body{font-size:16px} h2{font-size:24px;padding:16px}</style><h2>H</h2>');
    assert.deepEqual((await page.evaluate(spacingProbe, ['1em'])).spacingOffScale.map(v => v.value), ['16px'], '16px on 24px text is not 1em');
    await page.setContent('<style>html{font-size:20px} *{margin:0;padding:0} p{padding:1rem}</style><p>p</p>');
    const rem = await page.evaluate(spacingProbe, ['1rem']);
    assert.deepEqual(rem.spacingScale, ['20px']); assert.deepEqual(rem.spacingOffScale, [], 'rem follows the root computed font size');
    assert.doesNotMatch(source.slice(source.indexOf('export function spacingProbe'), source.indexOf('export function approvedSpacing')), /createElement/, 'no measuring element');
  } finally { await browser.close(); }
});

test('R11 (Asad note): left and right margins are screened too; auto margins are not (real Chrome, test-only)', { skip: !(existsSync(join(deps, 'node_modules/playwright-core')) && existsSync(chrome)) && 'test-only deps or local Chrome absent' }, async () => {
  const { spacingProbe } = await import('../tools/spacing-scale.mjs');
  const { chromium } = createRequire(join(deps, 'node_modules/'))('playwright-core');
  const browser = await chromium.launch({ executablePath: chrome, args: ['--headless=new'] });
  try {
    const run = async html => { const page = await browser.newPage(); await page.setContent(`<style>*{margin:0;padding:0}</style>${html}`); const r = await page.evaluate(spacingProbe, ['8px', '1rem', '24px']); await page.close(); return r; };
    const off = await run('<p style="margin-left:13px">a</p><p style="margin-right:7px">b</p>');
    assert.deepEqual(off.spacingOffScale.map(v => `${v.property}=${v.value}`).sort(), ['marginLeft=13px', 'marginRight=7px']);
    assert.deepEqual((await run('<p style="margin-left:24px;margin-right:1rem">a</p>')).spacingOffScale, [], 'on-scale horizontal margins pass');
    assert.deepEqual((await run('<div style="width:300px;margin:0 auto">a</div><div style="width:300px;margin-left:auto">b</div>')).spacingOffScale, [], 'auto margins resolve to used pixels and are skipped');
    // R11 panel D1 (decision D): logical margins, 0 and documented exceptions.
    const logical = await run('<p style="margin-inline-start:13px">a</p><p dir="rtl" style="margin-inline-end:9px">b</p><p style="margin-inline:0">c</p>');
    assert.deepEqual(logical.spacingOffScale.map(v => `${v.property}=${v.value}`).sort(), ['marginLeft=13px', 'marginLeft=9px'].sort(), 'logical margins are measured (they compute to left/right); 0 passes');
    const exc = await run('<p data-fannan-spacing-exception="optical alignment of the logo mark" style="margin-left:3px">a</p><p data-fannan-spacing-exception=" " style="margin-left:5px">b</p>');
    assert.deepEqual(exc.spacingOffScale.map(v => v.value), ['5px'], 'a blank exception reason does not excuse');
    assert.deepEqual(exc.spacingExceptions, [{ element: 'p', id: null, reason: 'optical alignment of the logo mark', values: ['3px'] }], 'a documented exception is recorded, not silently skipped');
  } finally { await browser.close(); }
});

test('R12 M15: margins on html and body are screened too (real Chrome, test-only)', { skip: !(existsSync(join(deps, 'node_modules/playwright-core')) && existsSync(chrome)) && 'test-only deps or local Chrome absent' }, async () => {
  const { spacingProbe } = await import('../tools/spacing-scale.mjs');
  const { chromium } = createRequire(join(deps, 'node_modules/'))('playwright-core');
  const browser = await chromium.launch({ executablePath: chrome, args: ['--headless=new'] });
  try {
    const run = async css => { const page = await browser.newPage(); await page.setContent(`<style>*{margin:0;padding:0}${css}</style><p>a</p>`); const r = await page.evaluate(spacingProbe, ['8px', '1rem', '24px']); await page.close(); return r.spacingOffScale.map(v => `${v.example}:${v.property}=${v.value}`).sort(); };
    assert.deepEqual(await run('body{margin-left:13px}'), ['body:marginLeft=13px']);
    assert.deepEqual(await run('html{padding-top:5px}'), ['html:paddingTop=5px']);
    assert.deepEqual(await run('body{margin:0 24px}'), [], 'on-scale body margins pass');
  } finally { await browser.close(); }
});

test('R12 M20: a data-fannan-spacing-exception excuses nothing unless a handoff entry with its id, scope, a reason and the approver matches', async () => {
  const { resolveScoped } = await import('../tools/exceptions.mjs');
  const home = { screen: 'home', state: 'default', lang: 'en' };
  const item = { ...home, element: 'p#logo', id: 'logo', reason: 'optical alignment of the logo mark', values: ['3px'] };
  const roles = [ 'Fadel' ];
  const ok = resolveScoped({ items: [item], entries: [{ ...home, id: 'logo', reason: 'logo optical alignment', reviewer: 'Fadel' }], roles, phase: 'handoff', what: 'spacingExceptions' });
  assert.deepEqual([ok.pass, ok.status, ok.items[0].resolved], [true, 'PASS', true]);
  const reasons = [[[{ ...item, id: null }], []], [[item], []], [[item], [{ ...home, id: 'logo', reason: 'r', reviewer: 'Amin' }]], [[item], [{ ...home, id: 'logo', reason: ' ', reviewer: 'Fadel' }]], [[item], [{ ...home, state: 'error', id: 'logo', reason: 'r', reviewer: 'Fadel' }]], [[{ ...item, screen: null, state: null, lang: null }], [{ ...home, id: 'logo', reason: 'r', reviewer: 'Fadel' }]]];
  for (const [items, entries] of reasons) {
    const r = resolveScoped({ items, entries, roles, phase: 'handoff', what: 'spacingExceptions' });
    assert.deepEqual([r.pass, r.status], [false, 'FAIL'], JSON.stringify([items, entries]).slice(0, 200));
  }
  assert.equal(resolveScoped({ items: [item], entries: [], roles, phase: 'wireframe', what: 'spacingExceptions' }).status, 'DEFERRED');
  const source = readFileSync(join(release, 'tools/pre-handoff-check.mjs'), 'utf8');
  assert.match(source, /resolveScoped\(\{ items: spacingItems, entries: handoff\?\.spacingExceptions, roles: \[handoff\?\.settings\?\.roles\?\.approver\], phase, what: 'spacingExceptions' \}\)/);
  assert.match(source, /if \(!ev\.checks\.spacingExceptions\.pass\) fail = true;/);
  assert.match(source, /\{ scope: pageScope, list: design\.spacingExceptions \}, \.\.\.ev\.checks\.states\.map\(st => \(\{ scope: scopeOf\(st\), list: st\.spacingExceptions \}\)\)/);
});

test('R12 M16: the configured spacing reason matches what is screened (horizontal margins, html and body, approver-backed exceptions)', () => {
  const config = JSON.parse(readFileSync(join(release, 'runtime/quality-checks.json'), 'utf8'));
  assert.doesNotMatch(config.thresholds.spacingOffScaleReason ?? config.spacingOffScaleReason ?? JSON.stringify(config), /Horizontal margins are not counted/);
  assert.match(JSON.stringify(config), /margin \(left, right, top and bottom, on html and body too\)/);
  assert.match(JSON.stringify(config), /spacingExceptions entry that names the approver/);
});
