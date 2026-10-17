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
      settings: { path: settings, repository: 'repo-x', stack: 'stack-x', roles: { engineer: 'engineer-x', qaGate: 'qa-x', writer: 'writer-x', approver: 'approver-x' } },
      pointOfView: { idea: 'Residents first', briefRefs: ['brief.md:1'] },
      screens: [{ id: 'home', page: frame, headingOutline: [{ level: 1, text: 'Specific headline.' }], seoIntent: 'service page', schemaIntent: 'none', images: [], actions: [], states: [{ state: 'default', lang: 'en', dir: 'ltr', page: frame, frame: { path: frame, width: 1440, version: 'v1', sha256: hash } }, ...states.slice(1).map(na)], components: [{ id: 'heading', states: [{ state: 'default', lang: 'en', dir: 'ltr', applicable: true, evidence: frame }, ...states.slice(1).map(na)] }], acceptance: [{ id: 'title', severity: 'BLOCK', decision: 'PASS', check: 'title visible', evidence: frame }], wcag: { standard: '2.2 AA', contrastEvidence: frame, focusOrderEvidence: frame, targetSizeEvidence: frame } }],
      copySlots: [{ id: 'hero', screen: 'home', kind: 'interface', purpose: 'state service', text: 'Specific headline.', minChars: 5, maxChars: 30, tone: 'direct', placementScreenshot: frame, placements: [{ lang: 'en', state: 'default', screenshot: frame }], source: { kind: 'brief', path: brief, ref: 'brief.md:2' }, lang: 'en', dir: 'ltr', variants: [{ lang: 'en', dir: 'ltr', text: 'Specific headline.', source: { path: brief, ref: 'brief.md:2' } }] }],
      facts: [], placeholders: [], openQuestions: [], languages: [{ lang: 'en', dir: 'ltr' }], assets: [], motion: [],
      manualChecks: manualIds.map(id => ({ id, screen: 'home', lang: 'en', state: 'default', decision: 'PASS', reviewer: 'reviewer-x', artifact: frame, note: 'inspected', briefRefs: ['brief.md:1'] })),
      critic: { referenceWork: frame, rounds: [{ decision: 'PASS', reviewer: 'critic-x', evidence: frame, copyChecks: [{ decision: 'PASS', evidence: frame }], designChecks: [{ decision: 'PASS', evidence: frame }] }] },
      approval: { decision: 'approved', approver: 'approver-x', record: approved, frameIds: [frameId] }
    };
    assert.deepEqual(checkHandoff(h), []);
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
