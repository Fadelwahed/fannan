import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, symlinkSync, realpathSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { assertProtectedMetadata, verifyExecutable, verifiedBrowser } from '../tools/executable-trust.mjs';

test('protected storage rejects shared ownership, writable modes and links', () => {
  const meta = (uid, mode, link = false, type = 'directory') => ({ uid, mode, isSymbolicLink: () => link, isDirectory: () => type === 'directory', isFile: () => type === 'file' });
  assert.doesNotThrow(() => assertProtectedMetadata(meta(0, 0o755), '/opt'));
  for (const m of [meta(1000, 0o555), meta(0, 0o775), meta(0, 0o755, true)])
    assert.throws(() => assertProtectedMetadata(m, '/opt'), /protected/);
  assert.throws(() => assertProtectedMetadata(meta(0, 0o644, false, 'file'), '/opt/deps/file', true), /read-only/);
  assert.throws(() => assertProtectedMetadata(meta(0, 0o555, false, 'file'), '/opt/deps'), /wrong type/);
  assert.throws(() => assertProtectedMetadata(meta(0, 0o555), '/opt/deps/browser', true), /wrong type/);
});
test('executable identity requires exact bytes and a real absolute file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fannan-exec-'));
  try {
    const path = join(realpathSync(dir), 'browser'); writeFileSync(path, 'reviewed');
    const pin = { path, sha256: createHash('sha256').update('reviewed').digest('hex') };
    assert.equal(verifyExecutable(pin).sha256, pin.sha256);
    writeFileSync(path, 'modified');
    assert.throws(() => verifyExecutable(pin), /hash mismatch/);
    assert.throws(() => verifyExecutable({ ...pin, sha256: null }), /pin missing/);
    symlinkSync(path, join(dir, 'alias'));
    assert.throws(() => verifyExecutable({ ...pin, path: join(dir, 'alias') }), /symlink/);
    const nested = join(realpathSync(dir), 'nested'); mkdirSync(nested);
    writeFileSync(join(nested, 'browser'), 'reviewed');
    symlinkSync(nested, join(dir, 'nested-alias'));
    assert.throws(() => verifyExecutable({ ...pin, path: join(dir, 'nested-alias', 'browser') }), /canonical/);
    assert.throws(() => verifyExecutable({ ...pin, path: `${dir}/nested-alias/../browser` }), /canonical/);
    assert.throws(() => verifyExecutable({ ...pin, path: `${nested}/../browser` }), /canonical/);
    assert.throws(() => verifyExecutable({ ...pin, path: 'relative' }), /absolute/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('production browser refuses an environment override before execution', () => {
  const old = process.env.CHROME_PATH;
  try { process.env.CHROME_PATH = '/tmp/not-a-browser'; assert.throws(verifiedBrowser, /override/); }
  finally { if (old === undefined) delete process.env.CHROME_PATH; else process.env.CHROME_PATH = old; }
});
test('production browser remains blocked without a reviewed target-host pin', () => {
  assert.throws(verifiedBrowser, /pin blocked/);
});
