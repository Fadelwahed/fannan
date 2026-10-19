// R11 (Asad panel C1): the axe run covers every WCAG A and AA level up to 2.2, so no A/AA rule of the pinned axe is skipped.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const release = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const deps = resolve(release, '../runtime-deps');
const chrome = process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : '/usr/bin/google-chrome';
const haveAxe = existsSync(join(deps, 'node_modules/axe-core/axe.min.js'));

test('R11 C1: the axe tag set is exactly WCAG 2.0, 2.1 and 2.2 at levels A and AA', async () => {
  const { AXE_TAGS, axeOptions } = await import('../tools/axe-tags.mjs');
  assert.deepEqual([...AXE_TAGS], ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa']);
  assert.ok(Object.isFrozen(AXE_TAGS));
  assert.deepEqual(axeOptions(), { runOnly: { type: 'tag', values: [...AXE_TAGS] }, rules: { 'target-size': { enabled: true } } });
});

test('R11 C1: both axe runs (page and every state) use the shared options; no literal tag list remains', () => {
  const source = readFileSync(join(release, 'tools/pre-handoff-check.mjs'), 'utf8');
  assert.match(source, /import \{ axeOptions \} from '\.\/axe-tags\.mjs';/);
  assert.equal(source.split('axe.run(document, options), axeOptions())').length - 1, 2);
  assert.doesNotMatch(source, /runOnly/);
});

test('R11 C1: every non-experimental WCAG A/AA rule in the pinned axe is selected (test-only deps)', { skip: !haveAxe && 'test-only deps absent' }, async () => {
  const { AXE_TAGS } = await import('../tools/axe-tags.mjs');
  const axe = createRequire(join(deps, 'node_modules/'))('axe-core');
  const lock = JSON.parse(readFileSync(join(release, 'runtime/package-lock.json'), 'utf8'));
  assert.equal(axe.version, lock.packages['node_modules/axe-core'].version, 'tested axe is the pinned axe');
  const level = /^wcag\d*a{1,2}$/;
  const missed = axe.getRules().filter(r => !r.tags.includes('experimental') && r.tags.some(t => level.test(t)) && !r.tags.some(t => AXE_TAGS.includes(t)));
  assert.deepEqual(missed.map(r => r.ruleId), []);
  const labelInName = axe.getRules().find(r => r.ruleId === 'label-content-name-mismatch');
  assert.ok(labelInName.tags.includes('wcag21a'), 'SC 2.5.3 is tagged wcag21a only');
});

test('R11 C1: Label in Name (2.5.3) is reported with the shared options (real Chrome, test-only)', { skip: !(haveAxe && existsSync(join(deps, 'node_modules/playwright-core')) && existsSync(chrome)) && 'test-only deps or local Chrome absent' }, async () => {
  const { axeOptions } = await import('../tools/axe-tags.mjs');
  const { chromium } = createRequire(join(deps, 'node_modules/'))('playwright-core');
  const browser = await chromium.launch({ executablePath: chrome, args: ['--headless=new'] });
  try {
    const page = await browser.newPage();
    await page.setContent('<html lang="en"><head><title>t</title></head><body><main><h1>x</h1><button aria-label="Close dialog">Submit order</button></main></body></html>');
    await page.addScriptTag({ content: readFileSync(join(deps, 'node_modules/axe-core/axe.min.js'), 'utf8') });
    const result = await page.evaluate(options => axe.run(document, options), axeOptions());
    assert.ok(result.violations.some(v => v.id === 'label-content-name-mismatch'));
  } finally { await browser.close(); }
});
