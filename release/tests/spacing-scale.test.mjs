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
  assert.match(source, /import \{ spacingProbe \} from '\.\/spacing-scale\.mjs';/);
  assert.equal(source.split('await p.evaluate(spacingProbe)').length - 1, 2, 'page and every declared state');
  assert.equal(source.split('spacingOffScale.length <= q.spacingOffScale').length - 1, 2);
});

test('OPUS-R2-10: spacing probe counts computed margins/paddings/gaps that are not on the built --spacing-* scale (real Chrome, test-only)', { skip: !(existsSync(join(deps, 'node_modules/playwright-core')) && existsSync(chrome)) && 'test-only deps or local Chrome absent' }, async () => {
  const { spacingProbe } = await import('../tools/spacing-scale.mjs');
  const { chromium } = createRequire(join(deps, 'node_modules/'))('playwright-core');
  const browser = await chromium.launch({ executablePath: chrome, args: ['--headless=new'] });
  try {
    const run = async html => { const page = await browser.newPage(); await page.setContent(html); const result = await page.evaluate(spacingProbe); await page.close(); return result; };
    const tokens = ':root{--spacing-sm:8px;--spacing-md:1rem;--spacing-lg:24px}*{margin:0;padding:0}';
    const onScale = await run(`<style>${tokens} main{padding:var(--spacing-md);display:flex;gap:var(--spacing-sm)} p{margin-bottom:24px;padding:8px 16px}</style><main><p>a</p><p>b</p></main>`);
    assert.deepEqual(onScale.spacingScale, ['16px', '24px', '8px']);
    assert.deepEqual(onScale.spacingOffScale, []);
    const offScale = await run(`<style>${tokens} main{padding:13px;display:grid;row-gap:10px} p{margin-top:7px}</style><main><p>a</p></main>`);
    assert.deepEqual(offScale.spacingOffScale.map(v => v.value).sort(), ['10px', '13px', '7px']);
    const hidden = await run(`<style>${tokens} p{padding:13px;display:none} div{margin:0 auto;width:100px;padding:8px}</style><p>x</p><div>y</div>`);
    assert.deepEqual(hidden.spacingOffScale, [], 'hidden elements and auto horizontal margins are ignored');
    const none = await run(`<style>*{margin:0;padding:0} p{padding:8px}</style><p>x</p>`);
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
    const result = await page.evaluate(spacingProbe);
    assert.deepEqual(result.spacingScale, ['16px', '32px', '8px']);
    assert.deepEqual(result.spacingOffScale, []);
  } finally { await browser.close(); }
});
