// Verify the externally installed npm tree against the reviewed release pin before loading its code.
import { readFileSync, readdirSync, lstatSync, readlinkSync, realpathSync } from 'node:fs';
import { join, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { assertProtectedPath } from './executable-trust.mjs';

export const PROTECTED_DEPS = '/opt/fannan/deps';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function assertProtectedTree(root) {
  assertProtectedPath(root);
  for (const name of readdirSync(root)) {
    const path = join(root, name), st = lstatSync(path);
    if (st.isDirectory()) assertProtectedTree(path);
    else if (st.isFile()) assertProtectedPath(path, true);
    else if (st.isSymbolicLink()) {
      const resolved = realpathSync(path);
      if (!resolved.startsWith(PROTECTED_DEPS + sep)) throw Error(`dependency symlink escapes protected tree: ${path}`);
      assertProtectedPath(resolved, lstatSync(resolved).isFile());
    } else throw Error(`unsupported dependency entry: ${path}`);
  }
}
export function inventoryDigest(root, protectedStorage = false) {
  root = realpathSync(root);
  if (protectedStorage) assertProtectedPath(root);
  const entries = [];
  function walk(dir, prefix = '') {
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name), rel = prefix ? `${prefix}/${name}` : name, st = lstatSync(path);
      if (st.isDirectory()) { if (protectedStorage) assertProtectedPath(path); entries.push(`d ${rel}`); walk(path, rel); }
      else if (st.isFile()) { if (protectedStorage) assertProtectedPath(path, true); entries.push(`f ${rel} ${sha(readFileSync(path))}`); }
      else if (st.isSymbolicLink()) {
        const target = readlinkSync(path), resolved = realpathSync(path);
        if (resolved !== root && !resolved.startsWith(root + sep)) throw Error(`dependency symlink escapes tree: ${rel}`);
        if (protectedStorage) assertProtectedPath(resolved, lstatSync(resolved).isFile());
        entries.push(`l ${rel} ${target}`);
      } else throw Error(`unsupported dependency entry: ${rel}`);
    }
  }
  walk(root);
  return sha(entries.join('\n') + '\n');
}

export function verifyDependencyTree(prefix, pin, releaseRoot, protectedStorage = false) {
  if (!prefix || lstatSync(prefix).isSymbolicLink()) throw Error('dependency prefix missing or symlinked');
  const root = realpathSync(prefix), release = realpathSync(releaseRoot);
  if (root === release || root.startsWith(release + sep)) throw Error('dependency prefix must be outside release');
  const lock = join(root, 'package-lock.json');
  if (protectedStorage) assertProtectedTree(root);
  if (sha(readFileSync(lock)) !== pin.lockSha256) throw Error('dependency lock mismatch');
  if (inventoryDigest(join(root, 'node_modules'), protectedStorage) !== pin.inventorySha256) throw Error('dependency inventory mismatch');
  return root;
}

export function verifyDeps(prefix, pin, releaseRoot) {
  if (prefix !== PROTECTED_DEPS) throw Error(`dependency prefix must be ${PROTECTED_DEPS}`);
  return verifyDependencyTree(prefix, pin, releaseRoot, true);
}

export function verifiedDeps(prefix, releaseRoot) {
  const pin = JSON.parse(readFileSync(new URL('../runtime/dependency-trust.json', import.meta.url), 'utf8'));
  const ownLock = sha(readFileSync(new URL('../runtime/package-lock.json', import.meta.url)));
  if (pin.lockSha256 !== ownLock) throw Error('release lock differs from dependency trust pin');
  return verifyDeps(prefix, pin, releaseRoot);
}
