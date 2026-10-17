import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, cpSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { inferTokenType, validateTokens } from '../tools/token-references.mjs';

const release = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const deps = resolve(release, '../runtime-deps');

test('shared token validation rejects malformed values and incompatible references', () => {
  const leaf = ($type, $value) => ({ $type, $value });
  for (const [tokens, message] of [
    [{ spacing: { sm: leaf('dimension', 16) } }, /invalid dimension value/],
    [{ colors: { primary: leaf('bogus', 'x') } }, /unknown token type/],
    [{ a: leaf('toString', 'x') }, /unknown token type/],
    [{ a: { 'bad.key': leaf('bogus', 'x') }, 'a.bad': { key: leaf('number', 1) } }, /ambiguous token name/],
    [{ spacing: { sm: leaf('number', Infinity) } }, /invalid number value/],
    [{ typography: { body: { fontFamily: leaf('fontFamily', []) } } }, /invalid fontFamily value/],
    [{ typography: { body: { fontWeight: leaf('fontWeight', 1001) } } }, /invalid fontWeight value/],
    [{ typography: { body: { fontWeight: leaf('fontWeight', 'heavy-ish') } } }, /invalid fontWeight value/],
    [{ typography: { body: { fontWeight: leaf('fontWeight', 'semi-bold') } } }, /invalid fontWeight value/], // R4-1: DTCG alias is not valid CSS
    [{ colors: { primary: leaf('color', '#123456') }, spacing: { sm: { $value: '{colors.primary}' } } }, /incompatible token type/],
    [{ colors: { primary: { $value: '{colors.missing}' } } }, /missing token reference/],
    [{ colors: { primary: { $value: '{colors.primary}' } } }, /cyclic token reference/],
    [{ colors: { primary: { $value: '{colors.secondary}' }, secondary: { $value: '{colors.primary}' } } }, /cyclic token reference/]
  ]) assert.throws(() => validateTokens(tokens), message);
  assert.equal(inferTokenType('typography.body.fontFamily', ['Inter', 'sans-serif']), 'fontFamily');
  assert.equal(inferTokenType('typography.body.lineHeight', '150%'), 'dimension');
  assert.equal(inferTokenType('typography.body.fontWeight', 'heavy-ish'), undefined);
  assert.equal(inferTokenType('components.button.label', 'mysterious'), undefined);
  assert.doesNotThrow(() => validateTokens({ typography: { body: { fontFamily: leaf('fontFamily', ['Inter', 'sans-serif']), lineHeight: leaf('dimension', '150%'), fontWeight: leaf('fontWeight', 700) } } }));
  for (const keyword of ['normal', 'bold']) assert.doesNotThrow(() => validateTokens({ typography: { body: { fontWeight: leaf('fontWeight', keyword) } } }));
});

test('CSS build rejects hand-edited malformed token JSON before dependencies or writes', () => {
  const root = mkdtempSync(join(tmpdir(), 'fannan-build-boundary-'));
  try {
    const input = join(root, 'tokens.json'), output = join(root, 'variables.css');
    for (const [tokens, message] of [
      [{ a: { $type: 'dimension', $value: 16 } }, /invalid dimension value/],
      [{ a: { $type: 'bogus', $value: 'x' } }, /unknown token type/],
      [{ typography: { body: { fontWeight: { $type: 'fontWeight', $value: 'semi-bold' } } } }, /invalid fontWeight value/],
      [{ colors: { primary: { $type: 'color', $value: '#123456' } }, spacing: { sm: { $value: '{colors.primary}' } } }, /incompatible token type/]
    ]) {
      writeFileSync(input, JSON.stringify(tokens));
      const result = spawnSync(process.execPath, [join(release, 'tools/sd-build.mjs'), input, output, 'test'], { env: { FANNAN_DEPS: '/opt/fannan/deps' }, encoding: 'utf8' });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, message);
      assert.equal(existsSync(output), false);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('token conversion validates types, dimensions and references before writing', { skip: !existsSync(join(deps, 'node_modules')) && 'existing runtime dependencies absent' }, () => {
  const root = mkdtempSync(join(tmpdir(), 'fannan-tokens-'));
  try {
    const tools = join(root, 'tools'), output = join(root, 'design-output/test');
    cpSync(join(release, 'tools'), tools, { recursive: true });
    writeFileSync(join(tools, 'verify-deps.mjs'), "export const verifiedDeps = prefix => prefix;\n"); // Isolated fixture only; production verifier remains intact.
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
      ['colors:\n  primary: "{colors.secondary}"\n  secondary: "{colors.primary}"', /cyclic token reference/],
      ['colors:\n  primary: "#123456"\nspacing:\n  sm: "{colors.primary}"', /incompatible token type/],
      ['spacing:\n  sm: .Inf', /unknown token type/],
      ['typography:\n  body:\n    fontWeight: heavy-ish', /unknown token type/]
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
    assert.equal(convert('typography:\n  body:\n    fontFamily: [Inter, sans-serif]\n    fontWeight: semi-bold\n    lineHeight: "150%"').status, 0);
    const familyTokens = JSON.parse(readFileSync(json, 'utf8'));
    assert.deepEqual(familyTokens.typography.body.fontFamily.$value, ['Inter', 'sans-serif']);
    assert.equal(familyTokens.typography.body.fontWeight.$type, 'fontWeight');
    assert.equal(familyTokens.typography.body.fontWeight.$value, 600); // R4-1: DTCG alias mapped to a CSS-valid number
    const weightCss = join(output, 'weights.css');
    const weightBuild = spawnSync(process.execPath, [join(tools, 'sd-build.mjs'), json, weightCss, 'test'], { env, encoding: 'utf8' });
    assert.equal(weightBuild.status, 0, weightBuild.stderr);
    assert.match(readFileSync(weightCss, 'utf8'), /--typography-body-font-weight:\s*600;/);
    for (const [alias, number] of [['thin', 100], ['hairline', 100], ['extra-light', 200], ['ultra-light', 200], ['light', 300], ['regular', 400], ['book', 400], ['medium', 500], ['demi-bold', 600], ['extra-bold', 800], ['ultra-bold', 800], ['black', 900], ['heavy', 900], ['extra-black', 950], ['ultra-black', 950]]) {
      assert.equal(convert(`typography:\n  body:\n    fontWeight: ${alias}`).status, 0, alias);
      assert.equal(JSON.parse(readFileSync(json, 'utf8')).typography.body.fontWeight.$value, number, alias);
    }
    assert.equal(familyTokens.typography.body.lineHeight.$value, '150%');
    assert.equal(convert('colors:\n  primary: "#123456"\ntypography:\n  body:\n    fontSize: 16px').status, 0);
    const css = join(output, 'variables.css');
    const built = spawnSync(process.execPath, [join(tools, 'sd-build.mjs'), json, css, 'test'], { env, encoding: 'utf8' });
    assert.equal(built.status, 0, built.stderr);
    assert.match(readFileSync(css, 'utf8'), /--typography-body-font-size:\s*16px/);
    for (const [tokens, message] of [
      [{ spacing: { sm: { $value: 16, $type: 'dimension' } } }, /invalid dimension value/],
      [{ colors: { primary: { $value: 'x', $type: 'bogus' } } }, /unknown token type/]
    ]) {
      rmSync(css, { force: true });
      writeFileSync(json, JSON.stringify(tokens));
      const result = spawnSync(process.execPath, [join(tools, 'sd-build.mjs'), json, css, 'test'], { env, encoding: 'utf8' });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, message);
      assert.equal(existsSync(css), false);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});
