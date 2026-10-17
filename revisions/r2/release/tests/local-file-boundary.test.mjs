import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { localAsset } from '../tools/local-file-boundary.mjs';

test('browser only serves bytes from selected project', () => {
  const root = mkdtempSync(join(tmpdir(), 'fannan-browser-'));
  try {
    const project = join(root, 'selected'); mkdirSync(project);
    const inside = join(project, 'page.html'), outside = join(root, 'secret.txt');
    writeFileSync(inside, '<h1>safe</h1>'); writeFileSync(outside, 'secret');
    assert.equal(localAsset(pathToFileURL(inside).href, project).body.toString(), '<h1>safe</h1>');
    assert.throws(() => localAsset(pathToFileURL(outside).href, project), /outside/);
    symlinkSync(outside, join(project, 'leak.html'));
    assert.throws(() => localAsset(pathToFileURL(join(project, 'leak.html')).href, project), /outside/);
    assert.throws(() => localAsset('https://example.com/', project), /local/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
