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
    [{ scale: { sm: leaf('number', Infinity) } }, /invalid number value/], // R4-6: spacing no longer takes numbers, so the G-7 case uses an untyped group
    [{ spacing: { sm: leaf('number', 8) } }, /incompatible token type/], // R4-6: unitless spacing rejected in hand-edited JSON too
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
  // R4-2: CSS allows a unitless zero length; other unitless dimensions stay rejected.
  assert.equal(inferTokenType('rounded.none', 0), 'dimension');
  assert.equal(inferTokenType('components.button.padding', 0), 'dimension');
  assert.equal(inferTokenType('rounded.sm', 4), undefined);
  assert.doesNotThrow(() => validateTokens({ rounded: { none: leaf('dimension', 0) }, components: { button: { padding: leaf('dimension', 0), gap: leaf('dimension', 0), margin: leaf('dimension', 0) } }, breakpoints: { min: leaf('dimension', 0) } }));
  assert.throws(() => validateTokens({ rounded: { sm: leaf('dimension', 4) } }), /invalid dimension value/);
  assert.throws(() => validateTokens({ rounded: { sm: leaf('dimension', -0.5) } }), /invalid dimension value/);
  // R4-6 (Fadel, 17 Oct 2026 6:18 AM): spacing requires units; a bare 0 stays allowed.
  assert.equal(inferTokenType('spacing.sm', 8), undefined);
  assert.equal(inferTokenType('spacing.sm', '8px'), 'dimension');
  assert.equal(inferTokenType('spacing.none', 0), 'dimension');
  assert.doesNotThrow(() => validateTokens({ spacing: { none: leaf('dimension', 0), sm: leaf('dimension', '8px') } }));
  // CODEX-R2-02: every physical/logical padding*/margin*/inset*/scroll-padding*/scroll-margin* and row/column gap key is a dimension.
  const spacingKeys = ['paddingTop', 'paddingInline', 'paddingInlineStart', 'paddingBlockEnd', 'marginBlock', 'marginLeft', 'marginInlineEnd', 'rowGap', 'columnGap', 'inset', 'insetInline', 'scrollPadding', 'scrollPaddingBlockStart', 'scrollMargin', 'scrollMarginTop'];
  for (const key of spacingKeys) {
    assert.equal(inferTokenType(`components.card.${key}`, 8), undefined, key);
    assert.equal(inferTokenType(`components.card.${key}`, 0), 'dimension', key);
    assert.equal(inferTokenType(`components.card.${key}`, '8px'), 'dimension', key);
    assert.throws(() => validateTokens({ components: { card: { [key]: leaf('number', 8) } } }), /incompatible token type/, key);
    assert.throws(() => validateTokens({ components: { card: { [key]: leaf('dimension', 8) } } }), /invalid dimension value/, key);
    assert.doesNotThrow(() => validateTokens({ components: { card: { [key]: leaf('dimension', '8px') } } }), key);
  }
  // ARGON-R2-07: dimension edge cases. Only 0 may be bare (number 0, -0 or the string "0"); numeric strings, NaN,
  // Infinity, exponents and other units are refused; negative lengths are refused where CSS forbids them.
  for (const v of [0, -0, '0', '8px', '.5rem', '1.25em', '-0px']) assert.equal(inferTokenType('spacing.x', v), 'dimension', String(v));
  for (const v of ['8', 8, '-8', NaN, Infinity, '1e2px', '8pt', '8%', '8 px', '5.px', 'px', '', null, '8PX']) assert.equal(inferTokenType('spacing.x', v), undefined, String(v));
  for (const path of ['spacing.sm', 'rounded.sm', 'breakpoints.md', 'typography.body.fontSize', 'components.card.padding', 'components.card.paddingInline', 'components.card.gap', 'components.button.width', 'components.button.minHeight', 'components.button.rounded', 'components.card.scrollPaddingTop']) {
    assert.equal(inferTokenType(path, '-4px'), undefined, path);
    assert.throws(() => validateTokens(path.split('.').reduceRight((child, key) => ({ [key]: child }), leaf('dimension', '-4px'))), /negative length/, path);
  }
  for (const path of ['components.card.margin', 'components.card.marginTop', 'components.card.inset', 'components.card.scrollMarginTop', 'typography.body.letterSpacing'])
    assert.equal(inferTokenType(path, '-4px'), 'dimension', path);
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
      [{ spacing: { sm: { $type: 'number', $value: 8 } } }, /incompatible token type/], // R4-6
      [{ components: { card: { paddingInline: { $type: 'number', $value: 8 } } } }, /incompatible token type/], // CODEX-R2-02
      [{ components: { card: { marginBlock: { $type: 'number', $value: 8 } } } }, /incompatible token type/], // CODEX-R2-02
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
      ['spacing:\n  sm: 8', /units required.*spacing\.sm/], // R4-6
      ['components:\n  card:\n    paddingInline: 8', /units required.*components\.card\.paddingInline/], // CODEX-R2-02
      ['components:\n  card:\n    paddingTop: 8', /units required.*components\.card\.paddingTop/],
      ['components:\n  card:\n    marginBlock: 8', /units required.*components\.card\.marginBlock/],
      ['components:\n  card:\n    rowGap: 8', /units required.*components\.card\.rowGap/],
      ['components:\n  button:\n    size: 40', /units required.*components\.button\.size/], // OPUS-R2-01
      ['components:\n  button:\n    width: 40', /units required.*components\.button\.width/], // OPUS-R2-01
      ['components:\n  button:\n    height: 40', /units required.*components\.button\.height/], // OPUS-R2-01
      ['components:\n  button:\n    minWidth: 40', /units required.*components\.button\.minWidth/], // OPUS-R2-01
      ['components:\n  button:\n    maxWidth: 40', /units required.*components\.button\.maxWidth/], // OPUS-R2-01
      ['components:\n  button:\n    minHeight: 40', /units required.*components\.button\.minHeight/], // OPUS-R2-01
      ['components:\n  button:\n    maxHeight: 40', /units required.*components\.button\.maxHeight/], // OPUS-R2-01
      ['typography:\n  body:\n    fontWeight: heavy-ish', /unknown token type/]
    ]) {
      const result = convert(yaml);
      assert.notEqual(result.status, 0, yaml);
      assert.match(result.stderr, expected, yaml);
      assert.equal(existsSync(json), false, yaml);
    }
    assert.equal(convert('colors:\n  primary: "#123456"\n  link: "{colors.primary}"\ntypography:\n  body:\n    fontSize: 16px\n    lineHeight: 1.5\nspacing:\n  sm: 8px\n  none: 0').status, 0);
    const tokens = JSON.parse(readFileSync(json, 'utf8'));
    assert.equal(tokens.spacing.sm.$type, 'dimension'); // R4-6: was 'number' for a bare 8
    assert.deepEqual(tokens.spacing.none, { $value: 0, $type: 'dimension' });
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
    // R4-2: caller compatibility with d2c36c1 for zero radii/padding; non-zero unitless values still fail.
    assert.equal(convert('rounded:\n  none: 0\n  sm: 4px\ncomponents:\n  button:\n    padding: 0\n    gap: 0\n    margin: 0').status, 0);
    const zeroTokens = JSON.parse(readFileSync(json, 'utf8'));
    assert.deepEqual([zeroTokens.rounded.none, zeroTokens.components.button.padding], [{ $value: 0, $type: 'dimension' }, { $value: 0, $type: 'dimension' }]);
    const zeroCss = join(output, 'zero.css');
    const zeroBuild = spawnSync(process.execPath, [join(tools, 'sd-build.mjs'), json, zeroCss, 'test'], { env, encoding: 'utf8' });
    assert.equal(zeroBuild.status, 0, zeroBuild.stderr);
    assert.match(readFileSync(zeroCss, 'utf8'), /--rounded-none:\s*0(rem|px)?;/);
    assert.match(readFileSync(zeroCss, 'utf8'), /--components-button-padding:\s*0(rem|px)?;/);
    for (const [yaml, expected] of [['rounded:\n  sm: 4', /units required.*rounded\.sm/], ['components:\n  button:\n    height: 40', /units required.*components\.button\.height/], ['components:\n  button:\n    rounded: 4', /units required.*components\.button\.rounded/], ['typography:\n  body:\n    fontSize: 16', /units required/], ['breakpoints:\n  desktop: 1440', /units required/]]) {
      const result = convert(yaml); assert.notEqual(result.status, 0, yaml); assert.match(result.stderr, expected, yaml);
    }
    // ARGON-R2-07: negative lengths refused where CSS forbids them; negative margins and a quoted "0" accepted and built.
    for (const [yaml, expected] of [['spacing:\n  sm: -4px', /negative length.*spacing\.sm/], ['components:\n  card:\n    paddingTop: -4px', /negative length.*components\.card\.paddingTop/], ['rounded:\n  sm: -2px', /negative length.*rounded\.sm/], ['spacing:\n  sm: "8"', /unknown token type.*spacing\.sm/]]) {
      const result = convert(yaml); assert.notEqual(result.status, 0, yaml); assert.match(result.stderr, expected, yaml); assert.equal(existsSync(json), false, yaml);
    }
    assert.equal(convert('spacing:\n  none: "0"\n  sm: 8px\ncomponents:\n  card:\n    marginTop: -4px').status, 0);
    const negCss = join(output, 'neg.css');
    const negBuild = spawnSync(process.execPath, [join(tools, 'sd-build.mjs'), json, negCss, 'test'], { env, encoding: 'utf8' });
    assert.equal(negBuild.status, 0, negBuild.stderr);
    assert.match(readFileSync(negCss, 'utf8'), /--components-card-margin-top:\s*-4px;/);
    assert.match(readFileSync(negCss, 'utf8'), /--spacing-none:\s*0;/);
    // CODEX-R2-02: converter + real build accept 0 and 8px for logical/physical spacing keys.
    assert.equal(convert('components:\n  card:\n    paddingInline: 8px\n    paddingTop: 0\n    marginBlock: 1rem\n    rowGap: 0\n    columnGap: 4px').status, 0);
    const cardTokens = JSON.parse(readFileSync(json, 'utf8')).components.card;
    for (const key of ['paddingInline', 'paddingTop', 'marginBlock', 'rowGap', 'columnGap']) assert.equal(cardTokens[key].$type, 'dimension', key);
    const cardCss = join(output, 'card.css');
    const cardBuild = spawnSync(process.execPath, [join(tools, 'sd-build.mjs'), json, cardCss, 'test'], { env, encoding: 'utf8' });
    assert.equal(cardBuild.status, 0, cardBuild.stderr);
    assert.match(readFileSync(cardCss, 'utf8'), /--components-card-padding-inline:\s*8px;/);
    assert.match(readFileSync(cardCss, 'utf8'), /--components-card-padding-top:\s*0;/);
    // OPUS-R2-01: size/width/height/min/max are dimensions; 0 and units accepted, typed and built.
    assert.equal(convert('components:\n  button:\n    size: 40px\n    width: 0\n    height: 2.5rem\n    minWidth: 44px\n    maxWidth: 20em\n    minHeight: 44px\n    maxHeight: 0').status, 0);
    const sizeTokens = JSON.parse(readFileSync(json, 'utf8')).components.button;
    for (const key of ['size', 'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight']) assert.equal(sizeTokens[key].$type, 'dimension', key);
    const sizeCss = join(output, 'size.css');
    const sizeBuild = spawnSync(process.execPath, [join(tools, 'sd-build.mjs'), json, sizeCss, 'test'], { env, encoding: 'utf8' });
    assert.equal(sizeBuild.status, 0, sizeBuild.stderr);
    assert.match(readFileSync(sizeCss, 'utf8'), /--components-button-min-height:\s*44px;/);
    for (const key of ['size', 'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight']) assert.throws(() => validateTokens({ components: { button: { [key]: { $value: 40, $type: 'number' } } } }), /incompatible token type/, key);
    // OPUS-R2-04: the design.md spec permits composite {typography.<name>} references inside components.
    // The converter expands them to per-property references, so the token JSON and CSS stay primitive.
    assert.equal(convert('colors:\n  primary: "#123456"\ntypography:\n  label:\n    fontSize: 14px\n    fontWeight: 500\n    lineHeight: 1.4\ncomponents:\n  button:\n    backgroundColor: "{colors.primary}"\n    typography: "{typography.label}"').status, 0);
    const composite = JSON.parse(readFileSync(json, 'utf8')).components.button.typography;
    assert.deepEqual(composite, { fontSize: { $value: '{typography.label.fontSize}' }, fontWeight: { $value: '{typography.label.fontWeight}' }, lineHeight: { $value: '{typography.label.lineHeight}' } });
    const compositeCss = join(output, 'composite.css');
    const compositeBuild = spawnSync(process.execPath, [join(tools, 'sd-build.mjs'), json, compositeCss, 'test'], { env, encoding: 'utf8' });
    assert.equal(compositeBuild.status, 0, compositeBuild.stderr);
    assert.match(readFileSync(compositeCss, 'utf8'), /--components-button-typography-font-size:\s*(14px|var\(--typography-label-font-size\));/);
    for (const [yaml, expected] of [
      ['typography:\n  label:\n    fontSize: 14px\ncolors:\n  primary: "{typography.label}"', /composite reference not allowed at colors\.primary/],
      ['typography:\n  label:\n    fontSize: 14px\ncomponents:\n  button:\n    backgroundColor: "{typography.label}"', /composite reference not allowed at components\.button\.backgroundColor/],
      ['typography:\n  label:\n    fontSize: 14px\nspacing:\n  sm: "{typography.label}"', /composite reference not allowed at spacing\.sm/],
      ['colors:\n  primary: "#123456"\ncomponents:\n  button:\n    typography: "{colors.primary}"', /components\.button\.typography must reference a typography group/],
      ['typography:\n  label:\n    fontSize: 14px\ncomponents:\n  button:\n    typography: "{typography.missing}"', /components\.button\.typography must reference a typography group/]
    ]) {
      const result = convert(yaml); assert.notEqual(result.status, 0, yaml); assert.match(result.stderr, expected, yaml); assert.equal(existsSync(json), false, yaml);
    }
    for (const [alias, number] of [['normal', 400], ['bold', 700], ['thin', 100], ['hairline', 100], ['extra-light', 200], ['ultra-light', 200], ['light', 300], ['regular', 400], ['book', 400], ['medium', 500], ['demi-bold', 600], ['extra-bold', 800], ['ultra-bold', 800], ['black', 900], ['heavy', 900], ['extra-black', 950], ['ultra-black', 950]]) {
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

test('OPUS-R2-08: stitch-design-md skill states the units rule the converter enforces', () => {
  const skill = readFileSync(join(release, 'skills/stitch-design-md/SKILL.md'), 'utf8');
  assert.match(skill, /every spacing, rounded, breakpoint and component size token carries `px`, `rem` or `em`/);
  assert.match(skill, /only `0` may be bare/);
  assert.match(skill, /\{typography\.<name>\}/, 'composite component typography reference documented (OPUS-R2-04)');
});

// R7 helper: the same isolated converter/builder fixture as above (test-only shims; production tools unchanged).
function tokenFixture() {
  const root = mkdtempSync(join(tmpdir(), 'fannan-tokens-r7-'));
  const tools = join(root, 'tools'), output = join(root, 'design-output/test');
  cpSync(join(release, 'tools'), tools, { recursive: true });
  writeFileSync(join(tools, 'verify-deps.mjs'), "export const verifiedDeps = prefix => prefix;\n"); // Isolated fixture only.
  mkdirSync(join(root, 'runtime'), { recursive: true });
  for (const name of ['dependency-trust.json', 'package-lock.json', 'sd.config.mjs']) cpSync(join(release, 'runtime', name), join(root, 'runtime', name));
  mkdirSync(output, { recursive: true });
  writeFileSync(join(tools, 'safe-write.sh'), `#!${process.execPath}\nconst fs=require('fs'),path=require('path');const root=${JSON.stringify(output)};const [project,file]=process.argv.slice(2);if(project!=='test'||!path.resolve(file).startsWith(root+path.sep))process.exit(10);fs.writeFileSync(file,fs.readFileSync(0),{flag:'wx'});\n`, { mode: 0o755 });
  const env = { ...process.env, FANNAN_DEPS: deps };
  const design = join(output, 'DESIGN.md'), json = join(output, 'tokens.json'), css = join(output, 'variables.css');
  const convert = yaml => { rmSync(json, { force: true }); writeFileSync(design, `---\n${yaml}\n---\n`); return spawnSync(process.execPath, [join(tools, 'designmd-to-sd.mjs'), design, json, 'test'], { env, encoding: 'utf8' }); };
  const build = () => { rmSync(css, { force: true }); rmSync(css + '.build.json', { force: true }); return spawnSync(process.execPath, [join(tools, 'sd-build.mjs'), json, css, 'test'], { env, encoding: 'utf8' }); };
  return { root, json, css, convert, build, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}
const buildRejects = (tokens, message) => {
  const root = mkdtempSync(join(tmpdir(), 'fannan-build-r7-'));
  try {
    const input = join(root, 'tokens.json'), output = join(root, 'variables.css');
    writeFileSync(input, JSON.stringify(tokens));
    const result = spawnSync(process.execPath, [join(release, 'tools/sd-build.mjs'), input, output, 'test'], { env: { FANNAN_DEPS: '/opt/fannan/deps' }, encoding: 'utf8' });
    assert.notEqual(result.status, 0, JSON.stringify(tokens));
    assert.match(result.stderr, message, JSON.stringify(tokens));
    assert.equal(existsSync(output), false);
  } finally { rmSync(root, { recursive: true, force: true }); }
};

test('CODEX-R3-01: numeric negatives and references to negative values are refused where CSS forbids negatives (validator and builder)', () => {
  const leaf = ($type, $value) => ({ $type, $value });
  assert.equal(inferTokenType('typography.body.lineHeight', -1), undefined);
  assert.equal(inferTokenType('typography.body.lineHeight', 1.5), 'number');
  assert.throws(() => validateTokens({ typography: { body: { lineHeight: leaf('number', -1) } } }), /negative length at typography\.body\.lineHeight/);
  assert.throws(() => validateTokens({ typography: { body: { lineHeight: leaf('number', -0.5) } } }), /negative length/);
  const tracking = { typography: { body: { letterSpacing: leaf('dimension', '-1px') } } };
  assert.doesNotThrow(() => validateTokens(tracking), 'letter spacing may be negative');
  assert.throws(() => validateTokens({ ...tracking, components: { card: { padding: { $value: '{typography.body.letterSpacing}' } } } }), /negative length at components\.card\.padding/);
  assert.throws(() => validateTokens({ ...tracking, components: { card: { gap: { $value: '{typography.body.letterSpacing}' } } } }), /negative length at components\.card\.gap/);
  assert.throws(() => validateTokens({ ...tracking, spacing: { tight: { $value: '{typography.body.letterSpacing}' } } }), /negative length at spacing\.tight/);
  assert.throws(() => validateTokens({ ...tracking, components: { card: { marginTop: { $value: '{typography.body.letterSpacing}' } } }, spacing: { chained: { $value: '{components.card.marginTop}' } } }), /negative length at spacing\.chained/, 'chained reference');
  assert.throws(() => validateTokens({ scale: { neg: leaf('number', -1) }, typography: { body: { lineHeight: { $value: '{scale.neg}' } } } }), /negative length at typography\.body\.lineHeight/);
  assert.doesNotThrow(() => validateTokens({ ...tracking, components: { card: { marginTop: { $value: '{typography.body.letterSpacing}' }, padding: { $value: '{spacing.sm}' } } }, spacing: { sm: leaf('dimension', '4px'), none: leaf('dimension', 0) } }));
  assert.doesNotThrow(() => validateTokens({ typography: { body: { lineHeight: leaf('number', 0) } } }));
  buildRejects({ typography: { body: { lineHeight: leaf('number', -1) } } }, /negative length at typography\.body\.lineHeight/);
  buildRejects({ ...tracking, components: { card: { padding: { $value: '{typography.body.letterSpacing}' } } } }, /negative length at components\.card\.padding/);
});

test('CODEX-R3-01: the converter refuses numeric negatives and references to negative values, and still builds allowed negatives (real Style Dictionary, test-only deps)', { skip: !existsSync(join(deps, 'node_modules')) && 'existing runtime dependencies absent' }, () => {
  const f = tokenFixture();
  try {
    for (const [yaml, expected] of [
      ['typography:\n  body:\n    lineHeight: -1', /negative length.*typography\.body\.lineHeight/],
      ['typography:\n  body:\n    letterSpacing: -1px\ncomponents:\n  card:\n    padding: "{typography.body.letterSpacing}"', /negative length at components\.card\.padding/],
      ['typography:\n  body:\n    letterSpacing: -1px\nspacing:\n  tight: "{typography.body.letterSpacing}"', /negative length at spacing\.tight/]
    ]) {
      const result = f.convert(yaml); assert.notEqual(result.status, 0, yaml); assert.match(result.stderr, expected, yaml); assert.equal(existsSync(f.json), false, yaml);
    }
    assert.equal(f.convert('typography:\n  body:\n    letterSpacing: -1px\n    lineHeight: 1.5\ncomponents:\n  card:\n    marginTop: "{typography.body.letterSpacing}"').status, 0);
    const built = f.build(); assert.equal(built.status, 0, built.stderr);
    assert.match(readFileSync(f.css, 'utf8'), /--components-card-margin-top:\s*(-1px|var\(--typography-body-letter-spacing\));/);
  } finally { f.cleanup(); }
});
