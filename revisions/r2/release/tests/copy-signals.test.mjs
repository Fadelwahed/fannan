import test from 'node:test';
import assert from 'node:assert/strict';
import { copySignals } from '../tools/copy-signals.mjs';

test('flags English and Arabic clichés and three-part headlines, not body lists', () => {
  assert.equal(copySignals('Unlock your future').filler, true);
  assert.equal(copySignals('أطلق العنان لإمكاناتك').filler, true);
  assert.equal(copySignals('خدمة السكان').filler, false);
  assert.equal(copySignals('تاريخ الآثوريين').filler, false);
  assert.equal(copySignals('Ordinary body', ['Fast and simple and secure']).ruleOfThree, true);
  assert.equal(copySignals('خدمة', ['سريع وسهل وآمن']).ruleOfThree, true);
  assert.equal(copySignals('Ordinary body', ['Fast. Simple. Secure.']).ruleOfThree, true);
  assert.equal(copySignals('Ordinary body', ['سريع. سهل. آمن.']).ruleOfThree, true);
  assert.equal(copySignals('One, two, three in a paragraph', ['Resident services']).ruleOfThree, false);
});
