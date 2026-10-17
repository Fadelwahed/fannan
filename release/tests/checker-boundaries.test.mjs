import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../tools/pre-handoff-check.mjs', import.meta.url), 'utf8');
test('checker detector call leaves executable selection to the pinned launcher', () => {
  // Run the actual invocation block with a recording boundary, never a detector substitute in a full gate.
  const block = source.slice(source.indexOf("{\n  let out = '', status = 0;"), source.indexOf('\nev.phase = phase;'));
  let calls = 0;
  const ev = { checks: {} };
  vm.runInNewContext(block, {
    here: '/release/tools', project: 'test', page: '/workspace/design-output/test/space name.html', ev, fail: false,
    join: (...parts) => parts.join('/'),
    process: { env: { IMPECCABLE_BIN: '/untrusted/override' } },
    execFileSync: (file, argv, options) => {
      calls++;
      assert.equal(file, '/release/tools/launcher-impeccable.sh');
      assert.deepEqual(Array.from(argv), ['detect', '--json', '/workspace/design-output/test/space name.html']);
      assert.deepEqual(Object.keys(options.env).sort(), ['FANNAN_PROJECT', 'PATH']);
      assert.equal(options.env.FANNAN_PROJECT, 'test');
      return '[]';
    }
  });
  assert.equal(calls, 1);
  assert.equal(ev.checks.impeccable.ran, true);
});
test('checker verifies browser before launch and records checked identity and runtime version', async () => {
  const start = source.indexOf('let browserIdentity;');
  assert.notEqual(start, -1);
  const block = source.slice(start, source.indexOf('\nconst ctx =', start));
  let launched = false;
  const denied = { verifiedBrowser() { throw Error('pin blocked'); }, console: { error() {} }, process: { exit() { throw Error('blocked exit'); } }, chromium: { launch() { launched = true; } }, ev: {} };
  await assert.rejects(vm.runInNewContext(`(async () => { ${block} })()`, denied), /blocked exit/);
  assert.equal(launched, false);
  const ev = {};
  await vm.runInNewContext(`(async () => { ${block} })()`, {
    verifiedBrowser: () => ({ path: '/opt/reviewed/browser', sha256: 'checked-digest', version: 'tested-version' }), ev, // R4-4: pin carries the reviewed version
    chromium: { async launch(options) { assert.equal(options.executablePath, '/opt/reviewed/browser'); assert.equal(options.chromiumSandbox, true); return { version: () => 'tested-version' }; } }
  });
  assert.equal(ev.browser.sha256, 'checked-digest');
  assert.equal(ev.browser.version, 'tested-version');
});
test('R4-4: checker refuses a browser whose runtime version differs from the reviewed pin', async () => {
  const start = source.indexOf('let browserIdentity;');
  const block = source.slice(start, source.indexOf('\nconst ctx =', start));
  let closed = false, exitCode = null;
  const ev = {};
  await assert.rejects(vm.runInNewContext(`(async () => { ${block} })()`, {
    verifiedBrowser: () => ({ path: '/opt/fannan/bin/browser/chrome', sha256: 'checked-digest', version: '154.0.8037.97' }), ev,
    console: { error() {} }, process: { exit(code) { exitCode = code; throw Error('blocked exit'); } },
    chromium: { async launch() { return { version: () => '155.0.0.1', async close() { closed = true; } }; } }
  }), /blocked exit/);
  assert.equal(exitCode, 2);
  assert.equal(closed, true, 'mismatched browser is closed before any page work');
  assert.equal(ev.browser, undefined, 'no evidence is recorded for an unverified version');
});
