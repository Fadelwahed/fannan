// R11 (Asad panel C3): page JavaScript cannot fake what the probes measure. Probes and axe run in a CDP isolated world:
// same DOM, separate globals and prototypes, created after each navigation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { designProbe } from '../tools/design-probe.mjs';

const release = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const deps = resolve(release, '../runtime-deps');
const chrome = process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : '/usr/bin/google-chrome';

test('R11 C3: the checker wraps every page in the isolated probe world; only the rAF counter reads the main world', () => {
  const source = readFileSync(join(release, 'tools/pre-handoff-check.mjs'), 'utf8');
  assert.match(source, /import \{ isolatedPage \} from '\.\/probe-world\.mjs';/);
  assert.match(source, /const p = await isolatedPage\(await ctx\.newPage\(\)\);/);
  // R13 N18: one reduced-motion routine (motionFor) serves the page and every state; only its rAF counter reads the main world.
  assert.match(source, /const main = await c\.newPage\(\), pg = await isolatedPage\(main\);/);
  assert.deepEqual(source.match(/main\.evaluate\([^;]*/g).filter(x => !x.startsWith('icMain')), ['main.evaluate(() => window.__raf)', 'main.evaluate(() => window.__raf)']);
});

test('R11 C3: a page script that patches getComputedStyle, querySelectorAll and axe fools the main world but not the probe world (real Chrome, test-only)', { skip: !(existsSync(join(deps, 'node_modules/playwright-core')) && existsSync(chrome)) && 'test-only deps or local Chrome absent' }, async () => {
  const { isolatedPage } = await import('../tools/probe-world.mjs');
  const { chromium } = createRequire(join(deps, 'node_modules/'))('playwright-core');
  const axeSrc = readFileSync(join(deps, 'node_modules/axe-core/axe.min.js'), 'utf8');
  const dir = mkdtempSync(join(tmpdir(), 'fannan-world-'));
  const browser = await chromium.launch({ executablePath: chrome, args: ['--headless=new'] });
  try {
    const hostile = `<!doctype html><html lang="en"><head><title>h</title><style>.card{backdrop-filter:blur(8px)}</style><script>
      const real = window.getComputedStyle;
      window.getComputedStyle = (e, p) => new Proxy(real(e, p), { get: (t, k) => k === 'backdropFilter' ? 'none' : (typeof t[k] === 'function' ? t[k].bind(t) : t[k]) });
      Document.prototype.querySelectorAll = function () { return []; };
      Object.defineProperty(Document.prototype, 'styleSheets', { get: () => [] }); // R12 M05: designProbe now reads CSSOM sheets too
      Object.defineProperty(window, 'axe', { value: { run: async () => ({ violations: [], incomplete: [], passes: [] }) }, writable: false, configurable: false });
    </script></head><body><main><h1>x</h1><div class="card">card</div><button aria-label="Close dialog">Submit order</button></main></body></html>`;
    writeFileSync(join(dir, 'hostile.html'), hostile);
    writeFileSync(join(dir, 'second.html'), '<!doctype html><html lang="en"><head><title>second</title></head><body><main><h1>y</h1></main></body></html>');
    const raw = await browser.newPage();
    const p = await isolatedPage(raw);
    await p.goto(pathToFileURL(join(dir, 'hostile.html')).href);
    assert.equal((await raw.evaluate(designProbe)).glass, 0, 'main world: the patched page hides its glass');
    assert.ok((await p.evaluate(designProbe)).glass >= 1, 'probe world: the real glass is counted (the card and its <style> text)');
    await raw.addScriptTag({ content: axeSrc });
    assert.deepEqual((await raw.evaluate(() => axe.run(document))).violations, [], 'main world: the page pins a fake axe');
    await p.addScriptTag({ content: axeSrc });
    const real = await p.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag21a'] } }));
    assert.ok(real.violations.some(v => v.id === 'label-content-name-mismatch'), 'probe world: real axe runs');
    await p.evaluate(() => { window.__probeState = 7; });
    assert.equal(await p.evaluate(() => window.__probeState), 7, 'probe state persists within one document');
    assert.equal(await raw.evaluate(() => window.__probeState), undefined, 'and is invisible to the page');
    await p.goto(pathToFileURL(join(dir, 'second.html')).href);
    assert.equal(await p.evaluate(() => document.title), 'second', 'a new world follows navigation');
    assert.equal(await p.evaluate(() => window.__probeState), undefined);
    assert.equal(await p.evaluate(x => x * 2, 21), 42, 'arguments are passed');
    await assert.rejects(p.evaluate(() => { throw new Error('boom'); }), /boom/);
  } finally { await browser.close(); rmSync(dir, { recursive: true, force: true }); }
});
