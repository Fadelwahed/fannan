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
  assert.match(source, /import \{ designProbe \} from '\.\/design-probe\.mjs';/);
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
