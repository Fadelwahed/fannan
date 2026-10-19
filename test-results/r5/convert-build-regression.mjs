// Mirrors token-validation.test.mjs fixture: isolated copy of tools, stub dep verifier and safe-write, converts + builds each DESIGN.md.
import { mkdtempSync, mkdirSync, cpSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os'; import { join, resolve } from 'node:path'; import { spawnSync } from 'node:child_process';
const release = resolve('release'), deps = resolve('runtime-deps');
for (const src of process.argv.slice(2)) {
  const root = mkdtempSync(join(tmpdir(), 'r5conv-')), tools = join(root, 'tools'), output = join(root, 'design-output/test');
  cpSync(join(release, 'tools'), tools, { recursive: true });
  writeFileSync(join(tools, 'verify-deps.mjs'), 'export const verifiedDeps = prefix => prefix;\n');
  mkdirSync(join(root, 'runtime'), { recursive: true });
  for (const f of ['dependency-trust.json', 'package-lock.json', 'sd.config.mjs']) cpSync(join(release, 'runtime', f), join(root, 'runtime', f));
  mkdirSync(output, { recursive: true });
  writeFileSync(join(tools, 'safe-write.sh'), `#!${process.execPath}\nconst fs=require('fs');const [p,f]=process.argv.slice(2);fs.writeFileSync(f,fs.readFileSync(0),{flag:'wx'});\n`, { mode: 0o755 });
  const env = { ...process.env, FANNAN_DEPS: deps }, json = join(output, 'tokens.json'), css = join(output, 'v.css');
  const c = spawnSync(process.execPath, [join(tools, 'designmd-to-sd.mjs'), resolve(src), json, 'test'], { env, encoding: 'utf8' });
  const b = c.status === 0 ? spawnSync(process.execPath, [join(tools, 'sd-build.mjs'), json, css, 'test'], { env, encoding: 'utf8' }) : { status: 'skipped' };
  console.log(`${src}: convert rc=${c.status} build rc=${b.status}${c.status ? ' ' + c.stderr.trim() : ''}`);
  rmSync(root, { recursive: true, force: true });
}
