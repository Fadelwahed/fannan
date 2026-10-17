import test from 'node:test';
import assert from 'node:assert/strict';
import { focusStyleProbe } from '../tools/focus-screen.mjs';

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
    styles.borderLeftColor = 'black';
    assert.equal(focusStyleProbe(), true, 'border-only focus change must be detected');
    focusStyleProbe({ capture: true });
    styles.outlineStyle = 'solid'; styles.outlineWidth = '2px';
    assert.equal(focusStyleProbe(), true, 'outline change must be detected');
    const wrapper = {}; button.parentElement = wrapper;
    const wrapperStyle = { backgroundColor: 'white' }, pseudoStyle = { boxShadow: 'none' };
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
