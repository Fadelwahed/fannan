import { readFileSync, lstatSync, realpathSync, readdirSync, readlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isAbsolute, dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const here = dirname(fileURLToPath(import.meta.url));

export function assertProtectedMetadata(st, path, file = false) {
  if (st.isSymbolicLink() || st.uid !== 0 || (st.mode & 0o022)) throw Error(`unprotected path: ${path}`);
  if (file && (st.mode & 0o222)) throw Error(`protected file must be read-only: ${path}`);
  if (file ? !st.isFile() : !st.isDirectory()) throw Error(`protected path has wrong type: ${path}`);
}

export function assertProtectedPath(path, file = false) {
  if (!isAbsolute(path)) throw Error('protected path must be absolute');
  for (let at = path; ; at = dirname(at)) {
    assertProtectedMetadata(lstatSync(at), at, at === path && file);
    if (at === dirname(at)) break;
  }
}

export function verifyExecutable(pin, protectedStorage = false) {
  if (!pin?.sha256 || !/^[a-f0-9]{64}$/.test(pin.sha256)) throw Error('executable pin missing');
  if (!isAbsolute(pin.path)) throw Error('executable path must be absolute');
  if (lstatSync(pin.path).isSymbolicLink()) throw Error('executable path is a symlink');
  if (pin.path !== realpathSync(pin.path)) throw Error('executable path must be canonical without symlink or traversal');
  if (protectedStorage) {
    assertProtectedPath(pin.path, true);
    if (!(lstatSync(pin.path).mode & 0o111)) throw Error('protected executable is not executable');
  }
  else if (!lstatSync(pin.path).isFile()) throw Error('executable path is not a file');
  const actual = sha(readFileSync(pin.path));
  if (actual !== pin.sha256) throw Error('executable hash mismatch');
  return { path: pin.path, sha256: actual, version: pin.version };
}

// R4-4: hash the whole browser directory (libraries, .pak, ICU data, helpers), not only the executable.
// Same entry format as verify-deps inventoryDigest; symlinks must stay inside the tree.
export function supportTreeDigest(root, protectedStorage = false) {
  root = realpathSync(root);
  if (protectedStorage) assertProtectedPath(root);
  const entries = [];
  (function walk(dir, prefix = '') {
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name), rel = prefix ? `${prefix}/${name}` : name, st = lstatSync(path);
      if (st.isDirectory()) { if (protectedStorage) assertProtectedPath(path); entries.push(`d ${rel}`); walk(path, rel); }
      else if (st.isFile()) { if (protectedStorage) assertProtectedPath(path, true); entries.push(`f ${rel} ${sha(readFileSync(path))}`); }
      else if (st.isSymbolicLink()) {
        const target = readlinkSync(path), resolved = realpathSync(path);
        if (resolved !== root && !resolved.startsWith(root + sep)) throw Error(`browser support symlink escapes tree: ${rel}`);
        entries.push(`l ${rel} ${target}`);
      } else throw Error(`unsupported browser support entry: ${rel}`);
    }
  })(root);
  return sha(entries.join('\n') + '\n');
}

export function verifyBrowserPin(pin, protectedStorage = true) {
  if (!pin?.version) throw Error('browser pin missing version');
  if (!/^[a-f0-9]{64}$/.test(pin.supportTreeSha256 ?? '')) throw Error('browser support tree pin missing');
  const identity = verifyExecutable(pin, protectedStorage);
  const supportTreeSha256 = supportTreeDigest(dirname(pin.path), protectedStorage);
  if (supportTreeSha256 !== pin.supportTreeSha256) throw Error('browser support tree mismatch');
  return { ...identity, supportTreeSha256 };
}

export function verifiedBrowser() {
  for (const name of ['CHROME_PATH', 'PUPPETEER_EXECUTABLE_PATH'])
    if (process.env[name]) throw Error(`${name} browser override is forbidden`);
  const pin = JSON.parse(readFileSync(join(here, '../runtime/browser-trust.json'), 'utf8'));
  if (pin.status !== 'reviewed') throw Error('browser pin blocked: reviewed target-host executable identity missing');
  if (!pin.path?.startsWith('/opt/fannan/bin/') || !pin.version) throw Error('browser pin missing protected path or version');
  // The support tree is the executable's own directory, so the browser must not sit directly in /opt/fannan/bin.
  if (dirname(pin.path) === '/opt/fannan/bin') throw Error('browser must live in its own directory under /opt/fannan/bin/');
  return verifyBrowserPin(pin, true);
}
