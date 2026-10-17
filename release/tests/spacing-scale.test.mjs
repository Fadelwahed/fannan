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
