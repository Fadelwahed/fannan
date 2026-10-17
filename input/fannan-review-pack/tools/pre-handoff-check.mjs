// pre-handoff-check.mjs: Fannan's Harden gate (round 5: project arg, deps outside the checked tree, IMPECCABLE_BIN set). Local files only; all network requests blocked.
// Usage: FANNAN_DEPS=<npm prefix> node pre-handoff-check.mjs <DESIGN.md> <page.html> <evidence-dir> <project>
// Checks: (1) design.md lint 0 errors, (2) axe-core WCAG 2.2 AA tags with target-size ENABLED, 0 violations,
// (3) custom WCAG 2.2: 2.4.11 focus not obscured, 2.5.8 targets >= 24x24, reduced motion = no running animation,
// focus visible on every tab stop, (4) impeccable detect (advisory). Writes evidence.json + screenshot.
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
const here = dirname(fileURLToPath(import.meta.url));
const [, , designMd, page, outDir, project] = process.argv;
if (!designMd || !page || !outDir || !project) { console.error('usage: FANNAN_DEPS=<npm prefix> node pre-handoff-check.mjs <DESIGN.md> <page.html> <evidence-dir> <project>'); process.exit(2); }
const [nodeMajor] = process.versions.node.split('.').map(Number);
if (nodeMajor < 22) { console.error('pre-handoff-check: Node 22.12+ is required (package.json engines); found ' + process.versions.node); process.exit(2); }
// npm deps live OUTSIDE the manifest-covered tree (N2): npm ci --prefix /home/box/agent-data/fannan-deps
const DEPS = process.env.FANNAN_DEPS;
if (!DEPS) { console.error('pre-handoff-check: FANNAN_DEPS is not set; refusing to run'); process.exit(2); }
const { chromium } = await import(pathToFileURL(join(DEPS, 'node_modules/playwright-core/index.mjs')).href);
// Mandatory read-only precheck on the evidence folder (fails closed).
try { execFileSync(join(here, 'readonly-precheck.sh'), [resolve(outDir) + '/evidence.json', project], { encoding: 'utf8' }); }
catch (e) { console.error('pre-handoff-check: readonly-precheck refused the evidence folder: ' + String(e.stderr || e.message).trim()); process.exit(2); }
mkdirSync(outDir, { recursive: true });
const ev = { when: new Date().toISOString(), designMd: resolve(designMd), page: resolve(page), checks: {} };
let fail = false;
// 1 lint
try {
  const r = execFileSync(join(DEPS, 'node_modules/.bin/design.md'), ['lint', designMd], { encoding: 'utf8' });
  const j = JSON.parse(r.slice(r.indexOf('{'))); const errors = j.summary?.errors ?? j.errors ?? null;
  ev.checks.lint = { errors, pass: errors === 0 }; if (errors !== 0) fail = true;
} catch (e) { ev.checks.lint = { pass: false, error: String(e.stdout || e.message).slice(0, 400) }; fail = true; }
// 2-3 browser checks
const axeSrc = readFileSync(join(DEPS, 'node_modules/axe-core/axe.min.js'), 'utf8');
const b = await chromium.launch({ executablePath: CHROME, args: process.env.CHROME_NO_SANDBOX === '1' ? ['--no-sandbox'] : [] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
await ctx.routeWebSocket(/.*/, ws => ws.close());
const p = await ctx.newPage(); const blocked = [];
await p.route('**/*', r => { const u = r.request().url(); if (u.startsWith('file:')) r.continue(); else { blocked.push(u); r.abort(); } });
await p.goto(pathToFileURL(resolve(page)).href); await p.addScriptTag({ content: axeSrc });
const axe = await p.evaluate(async () => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { 'target-size': { enabled: true } } }));
ev.checks.axe = { version: axe.testEngine.version, targetSizeEnabled: true, violations: axe.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })), incomplete: axe.incomplete.map(v => v.id), pass: axe.violations.length === 0 };
if (axe.violations.length) fail = true;
// custom: tab through, check focus visible, not obscured by fixed/sticky elements, target size
await p.evaluate(() => { window.__fid = new WeakMap(); window.__fnext = 0; });
const stops = []; const seen = new Set();
for (let i = 0; i < 200; i++) {
  await p.keyboard.press('Tab');
  const info = await p.evaluate(() => {
    const el = document.activeElement; if (!el || el === document.body) return null;
    if (!window.__fid.has(el)) window.__fid.set(el, ++window.__fnext);
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    const visible = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none';
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const top = document.elementFromPoint(Math.min(Math.max(cx, 0), innerWidth - 1), Math.min(Math.max(cy, 0), innerHeight - 1));
    const obscured = top && top !== el && !el.contains(top) && !top.contains(el);
    const inlineLink = el.tagName === 'A' && el.parentElement && /^(P|LI|SPAN|TD|DD)$/.test(el.parentElement.tagName) && (el.parentElement.textContent || '').trim().length > (el.textContent || '').trim().length;
    return { id: window.__fid.get(el), tag: el.tagName, name: el.getAttribute('aria-label') || el.name || (el.textContent || '').trim().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height), focusVisible: visible, obscured: !!obscured, inlineLink };
  });
  if (!info) break;            // focus left the document (end of tab order)
  if (seen.has(info.id)) break; // same ELEMENT again = wrapped around (identity, not name)
  seen.add(info.id); stops.push(info);
}
const keyboardTrapSuspect = stops.length >= 200;
const small = stops.filter(s => (s.w < 24 || s.h < 24) && !s.inlineLink), noFocus = stops.filter(s => !s.focusVisible), obsc = stops.filter(s => s.obscured);
ev.checks.custom22 = { tabStops: stops.length, targetUnder24: small, focusNotVisible: noFocus, focusObscured: obsc, keyboardTrapSuspect, pass: !small.length && !noFocus.length && !obsc.length && !keyboardTrapSuspect, note: 'focus-visible is heuristic (outline or box-shadow); inline text links are exempt from 2.5.8 per the WCAG exception' };
if (!ev.checks.custom22.pass) fail = true;
await p.screenshot({ path: join(outDir, 'page-1440.png'), fullPage: true });
const rm = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
await rm.routeWebSocket(/.*/, ws => ws.close());
await rm.addInitScript(() => { window.__raf = 0; const o = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (cb) => { window.__raf++; return o(cb); }; });
const p2 = await rm.newPage();
await p2.route('**/*', r => r.request().url().startsWith('file:') ? r.continue() : r.abort());
await p2.goto(pathToFileURL(resolve(page)).href); await p2.waitForTimeout(300);
const snap = () => p2.evaluate(() => [...document.querySelectorAll('body *')].map(e => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height), c.transform, c.opacity].join('|'); }));
const s1 = await snap(); const raf1 = await p2.evaluate(() => window.__raf);
await p2.waitForTimeout(700);
const s2 = await snap(); const raf2 = await p2.evaluate(() => window.__raf);
const waapi = await p2.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length);
const moved = s1.reduce((n, v, k) => n + (v !== s2[k] ? 1 : 0), 0);
const rafLoop = raf2 - raf1 > 10;
ev.checks.reducedMotion = { runningWebAnimations: waapi, elementsChangedOver700ms: moved, rafCallsOver700ms: raf2 - raf1, pass: waapi === 0 && moved === 0 && !rafLoop };
if (!ev.checks.reducedMotion.pass) fail = true;
await b.close();
ev.externalRequestsBlocked = blocked;
// 4 impeccable detect: findings are advisory, but it MUST run and return parseable output
{
  let out = '', status = 0;
  try { out = execFileSync(join(here, '../latest/impeccable/scripts/impeccable'), ['detect', '--json', page], { encoding: 'utf8', env: { ...process.env, IMPECCABLE_BIN: process.env.IMPECCABLE_BIN || join(here, '../latest/impeccable/bin/impeccable-linux-x64') } }); }
  catch (e) { out = String(e.stdout || ''); status = e.status; }
  let findings = null; try { const j = JSON.parse(out); if (Array.isArray(j)) findings = j; } catch {}
  if (findings === null || (status !== 0 && status !== 2)) { ev.checks.impeccable = { ran: false, exit: status, pass: false, note: 'detect did not run or gave no parseable output' }; fail = true; }
  else ev.checks.impeccable = { ran: true, exit: status, advisory: true, findings: findings.map(f => f.antipattern || f.name), pass: true };
}
ev.pass = !fail;
writeFileSync(join(outDir, 'evidence.json'), JSON.stringify(ev, null, 1));
console.log(JSON.stringify({ pass: ev.pass, lint: ev.checks.lint.pass, axe: ev.checks.axe.violations, custom22: ev.checks.custom22.pass, reducedMotion: ev.checks.reducedMotion.pass, impeccable: ev.checks.impeccable }));
process.exit(fail ? 1 : 0);
