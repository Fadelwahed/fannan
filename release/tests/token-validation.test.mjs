import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, cpSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const release = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const deps = resolve(release, '../runtime-deps');

test('token conversion validates types, dimensions and references before writing', () => {
  const root = mkdtempSync(join(tmpdir(), 'fannan-tokens-'));
  try {
    const tools = join(root, 'tools'), output = join(root, 'design-output/test');
    cpSync(join(release, 'tools'), tools, { recursive: true });
    mkdirSync(join(root, 'runtime'), { recursive: true });
    cpSync(join(release, 'runtime/dependency-trust.json'), join(root, 'runtime/dependency-trust.json'));
    cpSync(join(release, 'runtime/package-lock.json'), join(root, 'runtime/package-lock.json'));
    cpSync(join(release, 'runtime/sd.config.mjs'), join(root, 'runtime/sd.config.mjs'));
    mkdirSync(output, { recursive: true });
    writeFileSync(join(tools, 'safe-write.sh'), `#!${process.execPath}\nconst fs=require('fs'),path=require('path');const root=${JSON.stringify(output)};const [project,file]=process.argv.slice(2);if(project!=='test'||!path.resolve(file).startsWith(root+path.sep))process.exit(10);fs.writeFileSync(file,fs.readFileSync(0),{flag:'wx'});\n`, { mode: 0o755 });
    const env = { ...process.env, FANNAN_DEPS: deps };
    const design = join(output, 'DESIGN.md'), json = join(output, 'tokens.json');
    const convert = yaml => {
      rmSync(json, { force: true });
      writeFileSync(design, `---\n${yaml}\n---\n`);
      return spawnSync(process.execPath, [join(tools, 'designmd-to-sd.mjs'), design, json, 'test'], { env, encoding: 'utf8' });
    };
    for (const [yaml, expected] of [
      ['components:\n  button:\n    label: mysterious', /unknown token type.*components\.button\.label/],
      ['typography:\n  body:\n    fontSize: 16', /units required.*typography\.body\.fontSize/],
      ['breakpoints:\n  desktop: 1440', /units required.*breakpoints\.desktop/],
      ['colors:\n  primary: "{colors.missing}"', /missing token reference/],
      ['colors:\n  primary: "{colors.primary}"', /cyclic token reference/],
      ['colors:\n  primary: "{colors.secondary}"\n  secondary: "{colors.primary}"', /cyclic token reference/]
    ]) {
      const result = convert(yaml);
      assert.notEqual(result.status, 0, yaml);
      assert.match(result.stderr, expected, yaml);
      assert.equal(existsSync(json), false, yaml);
    }
    assert.equal(convert('colors:\n  primary: "#123456"\n  link: "{colors.primary}"\ntypography:\n  body:\n    fontSize: 16px\n    lineHeight: 1.5\nspacing:\n  sm: 8').status, 0);
    const tokens = JSON.parse(readFileSync(json, 'utf8'));
    assert.equal(tokens.spacing.sm.$type, 'number');
    assert.equal(tokens.typography.body.fontSize.$type, 'dimension');
    assert.equal(tokens.typography.body.lineHeight.$type, 'number');
    assert.equal(tokens.colors.link.$type, undefined);
    const css = join(output, 'variables.css');
    const built = spawnSync(process.execPath, [join(tools, 'sd-build.mjs'), json, css, 'test'], { env, encoding: 'utf8' });
    assert.equal(built.status, 0, built.stderr);
    assert.match(readFileSync(css, 'utf8'), /--typography-body-font-size:\s*16px/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
