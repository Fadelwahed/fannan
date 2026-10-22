import { readFileSync, lstatSync, realpathSync, readdirSync, readlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isAbsolute, dirname, join, sep, posix } from 'node:path';
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

// hash the whole browser directory (libraries, .pak, ICU data, helpers), not only the executable.
// Same entry format as verify-deps inventoryDigest; unprotected (test) trees may hold symlinks that stay inside.
// in protected mode the root is checked as given (absolute, normalised, not a symlink, not
// /opt/fannan/bin itself, root-owned all the way up) BEFORE it is resolved, and no symlink is allowed in the tree.
export function supportTreeDigest(root, protectedStorage = false) {
  if (protectedStorage) {
    if (typeof root !== 'string' || !isAbsolute(root)) throw Error('browser support tree must be absolute');
    if (posix.normalize(root) !== root || root.endsWith('/')) throw Error('browser support tree must be normalised');
    if (root === '/opt/fannan/bin' || root === '/opt/fannan' || root === '/') throw Error('browser support tree must be the browser\'s own directory under /opt/fannan/bin/');
    if (lstatSync(root).isSymbolicLink()) throw Error('browser support root is a symlink');
    assertProtectedPath(root);
    if (realpathSync(root) !== root) throw Error('browser support tree must be canonical');
  }
  root = realpathSync(root);
  const entries = [];
  (function walk(dir, prefix = '') {
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name), rel = prefix ? `${prefix}/${name}` : name, st = lstatSync(path);
      if (st.isDirectory()) { if (protectedStorage) assertProtectedPath(path); entries.push(`d ${rel}`); walk(path, rel); }
      else if (st.isFile()) { if (protectedStorage) assertProtectedPath(path, true); entries.push(`f ${rel} ${sha(readFileSync(path))}`); }
      else if (st.isSymbolicLink()) {
        if (protectedStorage) throw Error(`browser support symlink forbidden: ${rel}`);
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

// the support tree is the executable's own directory, so the browser must sit in its own directory
// under /opt/fannan/bin, never directly in it, and the path must be absolute and normalised (no '..').
export function assertBrowserPinLocation(path) {
  if (typeof path !== 'string' || !path.startsWith('/opt/fannan/bin/') || posix.normalize(path) !== path) throw Error('browser pin missing protected path or version');
  if (dirname(path) === '/opt/fannan/bin') throw Error('browser must live in its own directory under /opt/fannan/bin/');
}

export function verifiedBrowser() {
  for (const name of ['CHROME_PATH', 'PUPPETEER_EXECUTABLE_PATH'])
    if (process.env[name]) throw Error(`${name} browser override is forbidden`);
  const pin = JSON.parse(readFileSync(join(here, '../runtime/browser-trust.json'), 'utf8'));
  if (pin.status !== 'reviewed') throw Error('browser pin blocked: reviewed target-host executable identity missing');
  if (!pin.version) throw Error('browser pin missing protected path or version');
  assertBrowserPinLocation(pin.path);
  return verifyBrowserPin(pin, true);
}

// the browser child gets only these variables (like the Impeccable launcher), never the checker's
// process.env, so tokens or keys in the caller's environment cannot reach page or browser code. HOME is a fresh
// private directory made by the caller.
export function browserLaunchEnv(home) {
  if (typeof home !== 'string' || !isAbsolute(home)) throw Error('browser HOME must be an absolute private directory');
  return { PATH: '/usr/bin:/bin', LANG: 'C.UTF-8', HOME: home };
}
