import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { checkHandoff, manualIds, states } from '../tools/handoff-contract.mjs';

test('complete handoff passes; missing provenance, state or approval fails', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fannan-contract-'));
  const write = (name, value = 'evidence') => { const path = join(dir, name); writeFileSync(path, value); return path; };
  try {
    const brief = write('brief.md', 'A service for residents.\nSpecific headline.');
    const rules = write('rules.md');
    const settings = write('settings.md', 'repo-x stack-x engineer-x qa-x writer-x approver-x');
    const chunk = (type, data) => { const len = Buffer.alloc(4), crc = Buffer.alloc(4); len.writeUInt32BE(data.length); let sum = -1; for (const byte of Buffer.concat([Buffer.from(type), data])) { sum ^= byte; for (let i=0;i<8;i++) sum = sum >>> 1 ^ (sum & 1 ? 0xedb88320 : 0); } crc.writeUInt32BE((sum ^ -1) >>> 0); return Buffer.concat([len, Buffer.from(type), data, crc]); };
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(1440,0); ihdr.writeUInt32BE(1,4); ihdr[8]=8; ihdr[9]=6;
    const png = Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'), chunk('IHDR',ihdr), chunk('IDAT',deflateSync(Buffer.alloc(1+1440*4))), chunk('IEND',Buffer.alloc(0))]);
    const frame = write('home-default.png', png);
    const hash = createHash('sha256').update(png).digest('hex');
    const frameId = `home/en/default/v1/${hash}`;
    const approved = write('approved.md', `2026-10-16 approver-x ${frameId}`);
    const token = write('tokens.json', '{"colors":{}}'), css = write('variables.css', ':root { --colors-primary: #123456; }');
    const art = path => ({ path, sha256: createHash('sha256').update(readFileSync(path)).digest('hex') });
    const tokenArtifacts = { json: art(token), css: art(css), buildScript: art(fileURLToPath(new URL('../tools/sd-build.mjs', import.meta.url))), config: art(fileURLToPath(new URL('../runtime/sd.config.mjs', import.meta.url))), lock: art(fileURLToPath(new URL('../runtime/package-lock.json', import.meta.url))) };
    const buildEvidence = write('variables.css.build.json', JSON.stringify({ styleDictionaryVersion: '5.6.1', inputSha256: tokenArtifacts.json.sha256, outputSha256: tokenArtifacts.css.sha256, scriptSha256: tokenArtifacts.buildScript.sha256, configSha256: tokenArtifacts.config.sha256, lockSha256: tokenArtifacts.lock.sha256 }));
    tokenArtifacts.buildEvidence = { path: buildEvidence };
    const na = state => ({ state, lang: 'en', dir: 'ltr', applicable: false, reason: 'static screen', reviewer: 'reviewer-x', evidence: brief });
    const h = {
      version: 1, phase: 'handoff', brief: { path: brief }, rules: { path: rules },
      designLink: { url: 'https://example.invalid/private', private: true, evidence: brief }, tokens: tokenArtifacts, toolEvidence: [{ tool: 'fixture', version: '1', artifact: brief }],
      settings: { desktopWidths: [1440, 1280], path: settings, repository: 'repo-x', stack: 'stack-x', roles: { engineer: 'engineer-x', qaGate: 'qa-x', writer: 'writer-x', approver: 'approver-x' } },
      pointOfView: { idea: 'Residents first', briefRefs: ['brief.md:1'] },
      screens: [{ id: 'home', page: frame, headingOutline: [{ level: 1, text: 'Specific headline.' }], seoIntent: 'service page', schemaIntent: 'none', images: [], actions: [], states: [{ state: 'default', lang: 'en', dir: 'ltr', page: frame, frame: { path: frame, width: 1440, version: 'v1', sha256: hash } }, ...states.slice(1).map(na)], components: [{ id: 'heading', states: [{ state: 'default', lang: 'en', dir: 'ltr', applicable: true, evidence: frame }, ...states.slice(1).map(na)] }], acceptance: [{ id: 'title', severity: 'BLOCK', decision: 'PASS', check: 'title visible', evidence: frame }], wcag: { standard: '2.2 AA', contrastEvidence: frame, focusOrderEvidence: frame, targetSizeEvidence: frame } }],
      copySlots: [{ id: 'hero', screen: 'home', kind: 'interface', purpose: 'state service', text: 'Specific headline.', minChars: 5, maxChars: 30, tone: 'direct', placementScreenshot: frame, placements: [{ lang: 'en', state: 'default', screenshot: frame }], source: { kind: 'brief', path: brief, ref: 'brief.md:2' }, lang: 'en', dir: 'ltr', variants: [{ lang: 'en', dir: 'ltr', text: 'Specific headline.', source: { path: brief, ref: 'brief.md:2' } }] }],
      facts: [], placeholders: [], openQuestions: [], languages: [{ lang: 'en', dir: 'ltr' }], assets: [], motion: [],
      manualChecks: manualIds.map(id => ({ id, screen: 'home', lang: 'en', state: 'default', decision: 'PASS', reviewer: 'reviewer-x', artifact: frame, note: 'inspected', briefRefs: ['brief.md:1'] })),
      critic: { referenceWork: frame, rounds: [{ decision: 'PASS', reviewer: 'critic-x', evidence: frame, copyChecks: [{ decision: 'PASS', evidence: frame }], designChecks: [{ decision: 'PASS', evidence: frame }] }] },
      approval: { decision: 'approved', approver: 'approver-x', record: approved, frameIds: [frameId] }
    };
    assert.deepEqual(checkHandoff(h), []);
    // R8, ported from codex/fannan-r3-review 2733317: declared desktop widths are unique positive integers and include the canonical 1440.
    for (const bad of [undefined, [], [1280], [1440, 1440], [1440, 0], [1440, -1280], [1440, 1280.5], ['1440'], '1440']) {
      h.settings.desktopWidths = bad;
      assert.match(checkHandoff(h).join('\n'), /settings\.desktopWidths/, `desktopWidths ${JSON.stringify(bad)} must fail`);
    }
    h.settings.desktopWidths = [1440];
    assert.deepEqual(checkHandoff(h), [], '1440 alone is enough');
    // ARGON-R5-03 (not reproduced, pinned): the wireframe phase is a handoff too, so it must declare desktopWidths with 1440;
    // there is no wireframe early return and no default to [1440].
    const wire = JSON.parse(JSON.stringify({ ...h, phase: 'wireframe' }));
    for (const bad of [undefined, [], [1280]]) {
      wire.settings.desktopWidths = bad;
      assert.match(checkHandoff(wire, 'wireframe').join('\n'), /settings\.desktopWidths/, `wireframe desktopWidths ${JSON.stringify(bad)} must fail`);
    }
    wire.settings.desktopWidths = [1440];
    assert.doesNotMatch(checkHandoff(wire, 'wireframe').join('\n'), /settings\.desktopWidths/, 'wireframe with [1440] satisfies the width rule');
    // R11 panel D1, R12 M09/M20/M21: optional reflowExceptions / jsOffDifferences / spacingExceptions records are scoped
    // to a declared screen/state/lang and name their reviewer; a reason alone excuses nothing.
    const home = { screen: 'home', state: 'default', lang: 'en' };
    h.reflowExceptions = [{ ...home, id: 't1', reason: 'comparison table', reviewer: 'qa-x' }, { ...home, id: 't2', reason: 'route map', reviewer: 'approver-x' }];
    h.jsOffDifferences = [{ ...home, check: 'reflowFail', reason: 'menu collapses after its script loads', reviewer: 'qa-x' }, { ...home, check: 'content', reason: 'the status line is written by script', reviewer: 'approver-x' }];
    h.spacingExceptions = [{ ...home, id: 'logo', reason: 'optical alignment of the logo mark', reviewer: 'approver-x' }];
    assert.deepEqual(checkHandoff(h), [], 'valid records pass');
    for (const bad of [{}, [{ ...home, id: 't1', reason: '', reviewer: 'qa-x' }], [{ ...home, id: 't1', reason: 'r', reviewer: 'writer-x' }], [{ ...home, reason: 'r', reviewer: 'qa-x' }], [{ ...home, id: 'a', reason: 'r', reviewer: 'qa-x' }, { ...home, id: 'a', reason: 'r', reviewer: 'qa-x' }], [{ id: 't1', reason: 'r', reviewer: 'qa-x' }], [{ ...home, state: 'error', id: 't1', reason: 'r', reviewer: 'qa-x' }], [{ ...home, lang: 'ar', id: 't1', reason: 'r', reviewer: 'qa-x' }]]) {
      h.reflowExceptions = bad; assert.match(checkHandoff(h).join('\n'), /reflowExceptions/, `reflowExceptions ${JSON.stringify(bad)} must fail`);
    }
    h.reflowExceptions = [{ ...home, id: 't1', reason: 'r', reviewer: 'qa-x' }, { ...home, screen: 'about', id: 't1', reason: 'r', reviewer: 'qa-x' }];
    assert.match(checkHandoff(h).join('\n'), /reflowExceptions/, 'an undeclared screen fails');
    delete h.reflowExceptions;
    for (const bad of [{}, [{ ...home, check: 'contrast', reason: 'r', reviewer: 'qa-x' }], [{ ...home, check: 'glass', reason: ' ', reviewer: 'qa-x' }], [{ ...home, check: 'glass', reason: 'a', reviewer: 'qa-x' }, { ...home, check: 'glass', reason: 'b', reviewer: 'qa-x' }], [{ ...home, check: 'glass', reason: 'r' }], [{ ...home, check: 'glass', reason: 'r', reviewer: 'writer-x' }], [{ check: 'glass', reason: 'r', reviewer: 'qa-x' }]]) {
      h.jsOffDifferences = bad; assert.match(checkHandoff(h).join('\n'), /jsOffDifferences/, `jsOffDifferences ${JSON.stringify(bad)} must fail`);
    }
    delete h.jsOffDifferences;
    for (const bad of [{}, [{ ...home, id: 'logo', reason: 'r', reviewer: 'qa-x' }], [{ ...home, id: 'logo', reason: 'r' }], [{ ...home, reason: 'r', reviewer: 'approver-x' }], [{ ...home, id: 'logo', reason: ' ', reviewer: 'approver-x' }], [{ id: 'logo', reason: 'r', reviewer: 'approver-x' }], [{ ...home, id: 'a', reason: 'r', reviewer: 'approver-x' }, { ...home, id: 'a', reason: 'r', reviewer: 'approver-x' }]]) {
      h.spacingExceptions = bad; assert.match(checkHandoff(h).join('\n'), /spacingExceptions/, `spacingExceptions ${JSON.stringify(bad)} must fail`);
    }
    delete h.spacingExceptions;
    h.settings.desktopWidths = [1440, 1280];
    h.manualChecks.push({ ...h.manualChecks[0], decision: 'FAIL' });
    assert.match(checkHandoff(h).join('\n'), /manual check IDs must be unique|manual FAIL/);
    h.manualChecks.pop();
    h.critic.rounds[0].copyChecks[0].decision = 'FAIL';
    assert.match(checkHandoff(h).join('\n'), /all final copy\/design checks PASS/);
    h.critic.rounds[0].copyChecks[0].decision = 'PASS';
    h.screens[0].acceptance[0].decision = 'FAIL';
    assert.match(checkHandoff(h).join('\n'), /passing BLOCK items/);
    h.screens[0].acceptance[0].decision = 'PASS';
    h.tokens.css = h.tokens.json;
    assert.match(checkHandoff(h).join('\n'), /distinct JSON and CSS/);
    h.tokens.css = art(css);
    const broken = write('broken.png', Buffer.alloc(24));
    h.screens[0].states[0].frame.path = broken;
    h.screens[0].states[0].frame.sha256 = createHash('sha256').update(readFileSync(broken)).digest('hex');
    assert.match(checkHandoff(h).join('\n'), /hash-checked 1440px PNG/);
    h.screens[0].states[0].frame.path = frame; h.screens[0].states[0].frame.sha256 = hash;
    h.copySlots[0].text = 'Invented headline.';
    assert.match(checkHandoff(h).join('\n'), /absent from cited source/);
    h.copySlots[0].text = 'Specific headline.';
    h.screens[0].states[1].reviewer = '';
    assert.match(checkHandoff(h).join('\n'), /N\/A needs reason/);
    h.screens[0].states[1].reviewer = 'reviewer-x';
    h.approval.frameIds = [];
    assert.match(checkHandoff(h).join('\n'), /approval/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
