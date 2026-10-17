// R8 PORT-03, ported from codex/fannan-r3-review 2733317: stricter install wording in references/security-and-install.md,
// kept consistent with our launcher pin and with the runtime proposal status (no REPORTED COMPLETE/INSTALLED text taken).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const doc = read('references/security-and-install.md').replace(/\s+/g, ' ');

test('R8 PORT-03: access proof forbids mutation probes and does not treat 403/422 as proof of read-only', () => {
  assert.match(doc, /A 403\/422 response is not an authoritative read-only-permission classifier/);
  assert.match(doc, /A 200\/404 comparison alone is not proof of scope/);
  assert.match(doc, /zero-SHA ref-create request/);
  assert.match(doc, /No verification step or test may write to the repository/);
  assert.match(doc, /A branch API 403 alone .* does not prove a free-plan limitation/);
});

test('R8 PORT-03: the daily check must have run within its interval, otherwise it escalates', () => {
  assert.match(doc, /last-run timestamp with time zone/);
  assert.match(doc, /The latest daily-check run must be within its documented daily interval; an overdue, failed or unavailable result escalates to the concrete engineer owner and approver/);
});

test('R8 PORT-03: a separate runtime identity is mandatory and the shared uid 1000 folders do not qualify', () => {
  assert.match(doc, /A dedicated runtime identity is mandatory, not optional hardening/);
  assert.match(doc, /Shared uid 1000 ownership of `\/workspace` or `\/workspace\/design-output` fails this boundary/);
  assert.match(doc, /Do not chown shared directories/);
});

test('R8 PORT-03: the detector has one fixed path and one pinned source, matching the launcher pin', () => {
  const launcher = read('tools/launcher-impeccable.sh.internal');
  const bin = launcher.match(/^PINNED_BIN=(\S+)$/m)[1], digest = launcher.match(/^PINNED_SHA256=([0-9a-f]{64})$/m)[1];
  assert.ok(doc.includes(`fixed \`${bin}\` path`), 'doc path equals the launcher PINNED_BIN');
  assert.ok(doc.includes(digest), 'doc digest equals the launcher PINNED_SHA256');
  assert.match(doc, /https:\/\/github\.com\/pbakaus\/impeccable\/releases\/tag\/engine-v0\.1\.14`, asset `impeccable-linux-x64`; never substitute a later engine/);
  assert.match(doc, /refuses any other `IMPECCABLE_BIN` value and symlinked path components/);
  assert.doesNotMatch(doc, /agent-data\/fannan-bin/, 'the cloud agent-data path conflicts with our /opt/fannan/bin pin');
});

test('R8 PORT-03: runtime stays a proposal; cloud "reported complete/installed" text is not taken', () => {
  assert.doesNotMatch(doc, /REPORTED COMPLETE|REPORTED_INSTALLED|not grounds for a redundant install or fresh approval/);
  assert.equal(JSON.parse(read('runtime/node-runtime.json')).status, 'PROPOSED_REQUIRES_REVIEW_AND_APPROVAL');
  assert.match(doc, /This is an exact proposal, not an installed or Amin-approved runtime/);
});
