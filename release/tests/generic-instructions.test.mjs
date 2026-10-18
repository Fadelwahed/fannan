// R11 (Asad panel C5): shipped release text stays generic. No client, company or country name; project facts live in
// project settings, and the example project is described generically (its file names stay in the immutable input).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const release = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const walk = dir => readdirSync(dir).flatMap(name => { const p = join(dir, name); return statSync(p).isDirectory() ? walk(p) : [p]; });
const banned = new RegExp(['digital[\\s_-]*cloud', '\\bgaza\\b', 'palestin'].join('|'), 'i');

test('R11 C5: no client, company or country name anywhere in release/ (tests excluded)', () => {
  const hits = walk(release).filter(p => !relative(release, p).startsWith('tests/') && !p.endsWith('package-lock.json'))
    .flatMap(p => readFileSync(p, 'utf8').split('\n').map((line, i) => banned.test(line) ? `${relative(release, p)}:${i + 1}` : null).filter(Boolean));
  assert.deepEqual(hits, []);
});
