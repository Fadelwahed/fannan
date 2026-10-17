import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { focusSettle, focusStyleProbe } from '../tools/focus-screen.mjs';

test('focus screen compares unfocused and focused appearance rather than decoration presence', () => {
  const saved = Object.fromEntries(['window', 'document', 'getComputedStyle'].map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  const button = {}, styles = { outlineStyle: 'none', outlineWidth: '0px', boxShadow: '0 1px 2px black', backgroundColor: 'white' };
  try {
    globalThis.window = {};
    globalThis.document = { querySelectorAll: () => [button], activeElement: button };
    globalThis.getComputedStyle = () => styles;
    focusStyleProbe({ capture: true });
    assert.equal(focusStyleProbe(), false, 'unchanged decorative shadow must fail');
    styles.backgroundColor = 'yellow';
    assert.equal(focusStyleProbe(), true, 'background focus change must be detected');
    focusStyleProbe({ capture: true });
    styles.borderLeftStyle = 'solid'; styles.borderLeftWidth = '2px'; styles.borderLeftColor = 'black'; // R4-3: a border colour only counts when the border is rendered
    assert.equal(focusStyleProbe(), true, 'border-only focus change must be detected');
    focusStyleProbe({ capture: true });
    styles.outlineStyle = 'solid'; styles.outlineWidth = '2px';
    assert.equal(focusStyleProbe(), true, 'outline change must be detected');
    const wrapper = {}; button.parentElement = wrapper;
    const wrapperStyle = { backgroundColor: 'white' }, pseudoStyle = { content: '""', boxShadow: 'none' }; // R4-3: pseudo-elements count only when rendered
    globalThis.document.querySelectorAll = () => [button, wrapper];
    globalThis.getComputedStyle = (el, pseudo) => pseudo ? pseudoStyle : el === wrapper ? wrapperStyle : styles;
    focusStyleProbe({ capture: true });
    wrapperStyle.backgroundColor = 'yellow';
    assert.equal(focusStyleProbe(), true, 'focus-within wrapper indicator must be detected');
    focusStyleProbe({ capture: true });
    pseudoStyle.boxShadow = '0 0 0 2px black';
    assert.equal(focusStyleProbe(), true, 'pseudo-element indicator must be detected');
    focusStyleProbe({ capture: true });
    assert.equal(focusStyleProbe(), false, 'unchanged wrapper/pseudo decoration must fail');
    globalThis.document.activeElement = {};
    assert.equal(focusStyleProbe(), false, 'missing baseline must fail closed');
  } finally {
    for (const [k, descriptor] of Object.entries(saved)) {
      if (descriptor) Object.defineProperty(globalThis, k, descriptor); else delete globalThis[k];
    }
  }
});

function withDom(elements, styleFor, run) {
  const saved = Object.fromEntries(['window', 'document', 'getComputedStyle'].map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  try {
    globalThis.window = {};
    globalThis.document = { querySelectorAll: () => elements, activeElement: elements[0] };
    globalThis.getComputedStyle = styleFor;
    return run();
  } finally {
    for (const [k, descriptor] of Object.entries(saved)) {
      if (descriptor) Object.defineProperty(globalThis, k, descriptor); else delete globalThis[k];
    }
  }
}

test('R4-3: weak colour-only and unrendered changes do not count as a visible focus indicator', () => {
  const base = () => ({ outlineStyle: 'none', outlineWidth: '0px', outlineColor: 'rgb(0, 0, 0)', boxShadow: 'none', borderLeftStyle: 'none', borderLeftWidth: '0px', borderLeftColor: 'rgb(0, 0, 0)', backgroundColor: 'rgb(255, 255, 255)', color: 'rgb(0, 0, 0)', textDecorationLine: 'none', textDecorationColor: 'rgb(0, 0, 0)' });
  const button = {};
  let styles = base(), pseudo = { content: 'none', backgroundColor: 'rgba(0, 0, 0, 0)' };
  const styleFor = (el, which) => which ? pseudo : styles;
  const check = (mutate, expected, message) => withDom([button], styleFor, () => {
    styles = base(); pseudo = { content: 'none', backgroundColor: 'rgba(0, 0, 0, 0)' };
    focusStyleProbe({ capture: true }); mutate(); assert.equal(focusStyleProbe(), expected, message);
  });
  check(() => { styles.color = 'rgb(1, 1, 1)'; }, false, 'near-identical text colour is not a visible indicator');
  check(() => { styles.backgroundColor = 'rgb(250, 250, 250)'; }, false, 'background change below 3:1 between states is not counted');
  check(() => { styles.outlineColor = 'rgb(0, 0, 255)'; }, false, 'outline colour without a rendered outline is invisible');
  check(() => { styles.outlineWidth = '3px'; }, false, 'outline width without an outline style is invisible');
  check(() => { styles.borderLeftColor = 'rgb(0, 0, 255)'; }, false, 'border colour without a rendered border is invisible');
  check(() => { styles.textDecorationColor = 'rgb(0, 0, 255)'; }, false, 'decoration colour without a decoration line is invisible');
  check(() => { pseudo.backgroundColor = 'rgb(0, 0, 0)'; }, false, 'unrendered pseudo-element change is invisible');
  check(() => { styles.boxShadow = 'rgb(0, 0, 255) 0px 0px 0px 3px'; }, true, 'a new painted shadow ring is visible');
  // CODEX-R2-01: geometry alone is not paint; transparent or near-background indicators must not count.
  check(() => { styles.boxShadow = 'rgb(250, 250, 250) 0px 0px 0px 3px'; }, false, 'a near-white ring on white (about 1:1) is not visible');
  check(() => { styles.boxShadow = 'rgba(0, 0, 0, 0) 0px 0px 0px 3px'; }, false, 'a transparent shadow ring is not visible');
  check(() => { styles.outlineStyle = 'solid'; styles.outlineWidth = '2px'; styles.outlineColor = 'rgba(0, 0, 0, 0)'; }, false, 'a transparent 2px outline is not visible');
  check(() => { styles.outlineStyle = 'solid'; styles.outlineWidth = '2px'; styles.outlineColor = 'transparent'; }, false, 'a transparent keyword outline is not visible');
  check(() => { styles.borderLeftStyle = 'solid'; styles.borderLeftWidth = '2px'; styles.borderLeftColor = 'rgba(0, 0, 0, 0)'; }, false, 'a transparent new border is not visible');
  check(() => { styles.textDecorationLine = 'underline'; styles.textDecorationColor = 'rgba(0, 0, 0, 0)'; }, false, 'a transparent new underline is not visible');
  check(() => { styles.outlineStyle = 'solid'; styles.outlineWidth = '2px'; styles.outlineColor = 'rgb(250, 250, 250)'; }, false, 'a near-background outline is not visible');
  check(() => { styles.outlineStyle = 'solid'; styles.outlineWidth = '2px'; styles.outlineColor = 'rgba(0, 0, 255, 0.9)'; }, true, 'a mostly opaque blue outline is visible');
  check(() => { styles.backgroundColor = 'rgb(0, 0, 0)'; styles.color = 'rgb(255, 255, 255)'; }, true, 'strong background/text change is visible');
  check(() => { styles.backgroundColor = 'rgba(0, 0, 0, 0)'; }, false, 'transparent over white is treated as white (no change)');
  check(() => { styles.outlineStyle = 'solid'; styles.outlineWidth = '2px'; }, true, 'rendered outline is visible');
  check(() => { styles.textDecorationLine = 'underline'; }, true, 'added underline is visible');
  check(() => { styles.backgroundColor = 'color(display-p3 0 0 0)'; }, true, 'unparseable colours fall back to counting the change (no weaker than R3)');
});

test('OPUS-R2-02: indicators are measured against the nearest opaque ancestor background, not white', () => {
  const page = {}, button = { parentElement: page };
  const base = () => ({ outlineStyle: 'none', outlineWidth: '0px', outlineColor: 'rgb(0, 0, 0)', boxShadow: 'none', backgroundColor: 'rgba(0, 0, 0, 0)', color: 'rgb(230, 230, 230)', textDecorationLine: 'none' });
  let styles, pageStyle;
  const styleFor = (el, which) => which ? { content: 'none' } : el === page ? pageStyle : styles;
  const check = (mutate, expected, message, pageBackground = 'rgb(17, 17, 17)') => withDom([button, page], styleFor, () => {
    styles = base(); pageStyle = { ...base(), backgroundColor: pageBackground };
    focusStyleProbe({ capture: true }); mutate(); assert.equal(focusStyleProbe(), expected, message);
  });
  const outline = colour => () => { styles.outlineStyle = 'solid'; styles.outlineWidth = '2px'; styles.outlineColor = colour; };
  check(outline('rgba(255, 255, 255, 0.03)'), false, 'a 3% white outline on a #111 page is not visible');
  check(outline('rgb(0, 0, 0)'), false, 'a black outline on a #111 page is not visible');
  check(() => { styles.boxShadow = 'rgb(0, 0, 0) 0px 0px 0px 3px'; }, false, 'a black ring on a #111 page is not visible');
  check(() => { styles.backgroundColor = 'rgba(255, 255, 255, 0.03)'; }, false, 'a 3% white background on a #111 page is not visible');
  check(outline('rgb(255, 255, 255)'), true, 'a white outline on a #111 page is visible');
  check(outline('rgb(0, 0, 0)'), true, 'the same black outline on a white page is visible', 'rgb(255, 255, 255)');
  check(outline('rgb(0, 0, 0)'), true, 'no opaque ancestor: white fallback', 'rgba(0, 0, 0, 0)');
});

test('R4-3: focus settle waits for finite transitions on the focused element and ancestors, capped', async () => {
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'document');
  try {
    let resolveFinite; const order = [];
    const finite = { effect: { getComputedTiming: () => ({ endTime: 2000 }) }, finished: new Promise(r => { resolveFinite = r; }).then(() => order.push('finite')) };
    const infinite = { effect: { getComputedTiming: () => ({ endTime: Infinity }) }, finished: new Promise(() => {}) };
    const parent = { parentElement: null, getAnimations: () => [infinite] };
    const el = { parentElement: parent, getAnimations: opts => { assert.equal(opts.subtree, true); return [finite]; } };
    globalThis.document = { activeElement: el, body: {} };
    const settled = focusSettle({ maxMs: 5000 }).then(() => order.push('settled'));
    await new Promise(r => setTimeout(r, 20));
    assert.deepEqual(order, [], 'must still be waiting for the finite transition');
    resolveFinite(); await settled;
    assert.deepEqual(order, ['finite', 'settled'], 'resolves after the finite transition; the infinite ancestor animation is ignored');
    const stuck = { effect: { getComputedTiming: () => ({ endTime: 10000 }) }, finished: new Promise(() => {}) };
    globalThis.document = { activeElement: { parentElement: null, getAnimations: () => [stuck] }, body: {} };
    const t0 = Date.now(); await focusSettle({ maxMs: 50 });
    assert.ok(Date.now() - t0 < 1000, 'wait is capped');
    globalThis.document = { activeElement: null, body: {} };
    await focusSettle();
  } finally { if (saved) Object.defineProperty(globalThis, 'document', saved); else delete globalThis.document; }
});

test('R4-3: both checker tab loops settle animations after Tab and before reading focus appearance', () => {
  const source = readFileSync(new URL('../tools/pre-handoff-check.mjs', import.meta.url), 'utf8');
  const loops = source.split("await p.keyboard.press('Tab');").slice(1);
  assert.equal(loops.length, 2);
  for (const after of loops) {
    const settle = after.indexOf('await p.evaluate(focusSettle)'), probe = after.indexOf('await p.evaluate(focusStyleProbe, { minContrast: q.focusStateContrast })'); // OPUS-R2-09 call form
    assert.ok(settle !== -1 && probe !== -1 && settle < probe, 'focusSettle must run between Tab and the probe');
  }
  assert.match(source, /import \{ focusSettle, focusStyleProbe \} from '\.\/focus-screen\.mjs';/);
});

test('OPUS-R2-09: focus-state contrast comes from quality-checks.json, floored at 3:1, and reaches both probe calls', async () => {
  const config = JSON.parse(readFileSync(new URL('../runtime/quality-checks.json', import.meta.url), 'utf8'));
  assert.equal(config.thresholds.focusStateContrast, 3);
  assert.match(config.focusStateContrastReason, /2\.4\.13/);
  assert.match(config.focusStateContrastReason, /1\.4\.11/);
  const { validateQualityChecks } = await import('../tools/handoff-contract.mjs');
  for (const bad of [undefined, 2.9, 0, '3', NaN]) assert.throws(() => validateQualityChecks({ ...config, thresholds: { ...config.thresholds, focusStateContrast: bad } }), /focusStateContrast/, String(bad));
  for (const good of [3, 4.5]) assert.doesNotThrow(() => validateQualityChecks({ ...config, thresholds: { ...config.thresholds, focusStateContrast: good } }));
  const source = readFileSync(new URL('../tools/pre-handoff-check.mjs', import.meta.url), 'utf8');
  assert.equal(source.split('await p.evaluate(focusStyleProbe, { minContrast: q.focusStateContrast })').length - 1, 2, 'both tab loops pass the configured contrast');
  assert.doesNotMatch(source, /await p\.evaluate\(focusStyleProbe\);/);
});
