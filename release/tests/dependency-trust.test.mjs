import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { inventoryDigest, verifyDependencyTree, verifyDeps, PROTECTED_DEPS } from '../tools/verify-deps.mjs';

test('dependency inventory rejects a changed package and wrong ledger', () => {
  const root = mkdtempSync(join(tmpdir(), 'fannan-deps-'));
  try {
    const deps = join(root, 'deps'), release = join(root, 'release');
    mkdirSync(join(deps, 'node_modules'), { recursive: true });
    mkdirSync(release);
    writeFileSync(join(deps, 'package-lock.json'), '{}');
    writeFileSync(join(deps, 'node_modules/example.js'), 'safe');
    const pin = { inventorySha256: inventoryDigest(join(deps, 'node_modules')), lockSha256: createHash('sha256').update('{}').digest('hex') };
    assert.throws(() => verifyDeps(deps, pin, release), /dependency prefix must be/);
    assert.equal(PROTECTED_DEPS, '/opt/fannan/deps');
    assert.equal(verifyDependencyTree(deps, pin, release), realpathSync(deps));
    writeFileSync(join(deps, 'node_modules/example.js'), 'changed');
    assert.throws(() => verifyDependencyTree(deps, pin, release), /inventory/);
    writeFileSync(join(deps, 'node_modules/example.js'), 'safe');
    writeFileSync(join(deps, 'node_modules/extra.js'), 'extra');
    assert.throws(() => verifyDependencyTree(deps, pin, release), /inventory/);
    rmSync(join(deps, 'node_modules/extra.js'));
    assert.throws(() => verifyDependencyTree(deps, { ...pin, lockSha256: '0'.repeat(64) }, release), /lock/);
    assert.throws(() => verifyDependencyTree(deps, pin, root), /outside/);
    writeFileSync(join(root, 'foreign.js'), 'foreign');
    symlinkSync(join(root, 'foreign.js'), join(deps, 'node_modules/escape.js'));
    assert.throws(() => verifyDependencyTree(deps, pin, release), /escapes/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
