import { readFileSync, lstatSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isAbsolute, dirname, join } from 'node:path';
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

export function verifiedBrowser() {
  for (const name of ['CHROME_PATH', 'PUPPETEER_EXECUTABLE_PATH'])
    if (process.env[name]) throw Error(`${name} browser override is forbidden`);
  const pin = JSON.parse(readFileSync(join(here, '../runtime/browser-trust.json'), 'utf8'));
  if (pin.status !== 'reviewed') throw Error('browser pin blocked: reviewed target-host executable identity missing');
  if (!pin.path?.startsWith('/opt/fannan/bin/') || !pin.version) throw Error('browser pin missing protected path or version');
  return verifyExecutable(pin, true);
}
