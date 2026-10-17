// Verify the externally installed npm tree against the reviewed release pin before loading its code.
import { readFileSync, readdirSync, lstatSync, readlinkSync, realpathSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export function inventoryDigest(root) {
  root = realpathSync(root);
  const entries = [];
  function walk(dir, prefix = '') {
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name), rel = prefix ? `${prefix}/${name}` : name, st = lstatSync(path);
      if (st.isDirectory()) { entries.push(`d ${rel}`); walk(path, rel); }
      else if (st.isFile()) entries.push(`f ${rel} ${sha(readFileSync(path))}`);
      else if (st.isSymbolicLink()) {
        const target = readlinkSync(path), resolved = realpathSync(path);
        if (resolved !== root && !resolved.startsWith(root + sep)) throw Error(`dependency symlink escapes tree: ${rel}`);
        entries.push(`l ${rel} ${target}`);
      } else throw Error(`unsupported dependency entry: ${rel}`);
    }
  }
  walk(root);
  return sha(entries.join('\n') + '\n');
}

export function verifyDeps(prefix, pin, releaseRoot) {
  if (!prefix || lstatSync(prefix).isSymbolicLink()) throw Error('dependency prefix missing or symlinked');
  const root = realpathSync(prefix), release = realpathSync(releaseRoot);
  if (root === release || root.startsWith(release + sep)) throw Error('dependency prefix must be outside release');
  const lock = join(root, 'package-lock.json');
  if (sha(readFileSync(lock)) !== pin.lockSha256) throw Error('dependency lock mismatch');
  if (inventoryDigest(join(root, 'node_modules')) !== pin.inventorySha256) throw Error('dependency inventory mismatch');
  return root;
}

export function verifiedDeps(prefix, releaseRoot) {
  const pin = JSON.parse(readFileSync(new URL('../runtime/dependency-trust.json', import.meta.url), 'utf8'));
  const ownLock = sha(readFileSync(new URL('../runtime/package-lock.json', import.meta.url)));
  if (pin.lockSha256 !== ownLock) throw Error('release lock differs from dependency trust pin');
  return verifyDeps(prefix, pin, releaseRoot);
}
