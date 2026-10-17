// pre-handoff-check.mjs: Fannan's Harden gate (project arg, protected external dependencies and executables). Local files only; all network requests blocked.
// Usage: FANNAN_DEPS=<npm prefix> node pre-handoff-check.mjs <DESIGN.md> <page.html> <evidence-dir> <project>
// Checks: (1) design.md lint 0 errors, (2) axe-core WCAG 2.2 AA tags with target-size ENABLED, 0 violations,
// (3) custom WCAG 2.2: 2.4.11 focus not obscured, 2.5.8 targets >= 24x24, reduced motion = no running animation,
// focus visible on every tab stop, (4) impeccable detect (advisory). Writes evidence.json + screenshot.
import { readFileSync, existsSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { checkHandoff, qualityChecks } from './handoff-contract.mjs';
import { verifiedDeps } from './verify-deps.mjs';
import { localAsset } from './local-file-boundary.mjs';
import { copySignals } from './copy-signals.mjs';
import { verifiedBrowser } from './executable-trust.mjs';
import { focusSettle, focusStyleProbe } from './focus-screen.mjs';
const here = dirname(fileURLToPath(import.meta.url));
const [, , designMd, page, outDir, project, handoffPath, phaseArg] = process.argv;
if (!designMd || !page || !outDir || !project || !handoffPath || (phaseArg && !['--phase=wireframe', '--phase=handoff'].includes(phaseArg))) { console.error('usage: FANNAN_DEPS=<npm prefix> node pre-handoff-check.mjs <DESIGN.md> <page.html> <evidence-dir> <project> <handoff.json> [--phase=wireframe|handoff]'); process.exit(2); }
const phase = phaseArg?.split('=')[1] || 'handoff';
const q = qualityChecks.thresholds;
const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(Number);
if (nodeMajor < 22 || (nodeMajor === 22 && nodeMinor < 12)) { console.error('pre-handoff-check: Node 22.12+ is required (package.json engines); found ' + process.versions.node); process.exit(2); }
// npm deps live in protected storage OUTSIDE the manifest-covered tree (N2).
const releaseRoot = realpathSync(join(here, '..'));
let depsRoot;
try { depsRoot = verifiedDeps(process.env.FANNAN_DEPS, releaseRoot); }
catch (e) { console.error('pre-handoff-check: dependencies untrusted: ' + e.message); process.exit(2); }
let chromium;
try { ({ chromium } = await import(pathToFileURL(join(depsRoot, 'node_modules/playwright-core/index.mjs')).href)); }
catch (e) { console.error('pre-handoff-check: playwright-core missing from FANNAN_DEPS: ' + e.message); process.exit(2); }
// A fresh evidence directory prevents clobbering an earlier review; each output uses safe-write.
if (existsSync(outDir)) { console.error('pre-handoff-check: evidence directory already exists; use a fresh versioned path'); process.exit(2); }
const evidenceWrite = (name, value) => execFileSync(join(here, 'safe-write.sh'), [project, join(resolve(outDir), name)], { input: value });
const digest = value => createHash('sha256').update(value).digest('hex');
try { execFileSync(join(here, 'readonly-precheck.sh'), [resolve(outDir) + '/evidence.json', project], { encoding: 'utf8' }); }
catch (e) { console.error('pre-handoff-check: readonly-precheck refused the evidence folder: ' + String(e.stderr || e.message).trim()); process.exit(2); }
const ev = { when: new Date().toISOString(), designMd: resolve(designMd), page: resolve(page), checks: {} };
let fail = false;
let handoff;
try { handoff = JSON.parse(readFileSync(handoffPath, 'utf8')); ev.checks.contract = { errors: checkHandoff(handoff, phase) }; }
catch (e) { ev.checks.contract = { errors: [`handoff JSON cannot be read: ${e.message}`] }; }
ev.checks.contract.pass = ev.checks.contract.errors.length === 0;
if (!ev.checks.contract.pass) fail = true;
// 1 lint
try {
  const r = execFileSync(process.execPath, [join(depsRoot, 'node_modules/@google/design.md/dist/index.js'), 'lint', designMd], { encoding: 'utf8' });
  const j = JSON.parse(r.slice(r.indexOf('{'))); const errors = j.summary?.errors ?? j.errors ?? null;
  ev.checks.lint = { errors, pass: errors === 0 }; if (errors !== 0) fail = true;
} catch (e) { ev.checks.lint = { pass: false, error: String(e.stdout || e.message).slice(0, 400) }; fail = true; }
// 2-3 browser checks
let axeSrc;
try { axeSrc = readFileSync(join(depsRoot, 'node_modules/axe-core/axe.min.js'), 'utf8'); }
catch (e) { console.error('pre-handoff-check: axe-core missing from FANNAN_DEPS: ' + e.message); process.exit(2); }
let browserIdentity;
try { browserIdentity = verifiedBrowser(); }
catch (e) { console.error('pre-handoff-check: browser untrusted: ' + e.message); process.exit(2); }
const b = await chromium.launch({ executablePath: browserIdentity.path, chromiumSandbox: true });
const runtimeVersion = b.version();
if (runtimeVersion !== browserIdentity.version) { console.error(`pre-handoff-check: browser version ${runtimeVersion} does not match reviewed pin ${browserIdentity.version}`); await b.close(); process.exit(2); } // R4-4
ev.browser = { ...browserIdentity, version: runtimeVersion };
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
await ctx.routeWebSocket(/.*/, ws => ws.close());
const blocked = [];
const OUTPUT_BASE = '/workspace/design-output';
const projectRoot = join(OUTPUT_BASE, project);
const routeLocal = async r => { const u = r.request().url(); try { const asset = localAsset(u, projectRoot); await r.fulfill({ body: asset.body, contentType: asset.contentType }); } catch (e) { blocked.push({ url: u, reason: e.message }); await r.abort(); } };
await ctx.route('**/*', routeLocal);
const p = await ctx.newPage();
const ready = page => page.evaluate(async () => { await document.fonts.ready; const brokenImages = []; await Promise.all([...document.images].map(async img => { try { await img.decode(); } catch { brokenImages.push(img.currentSrc || img.src); } })); return { brokenImages, failedFonts: [...document.fonts].filter(f => f.status === 'error').map(f => f.family) }; });
await p.goto(pathToFileURL(resolve(page)).href); const firstAssets = await ready(p); await p.addScriptTag({ content: axeSrc });
ev.checks.assets = { ...firstAssets, pass: firstAssets.brokenImages.length === 0 && firstAssets.failedFonts.length === 0 };
if (!ev.checks.assets.pass) fail = true;
const designProbe = () => {
  const visible = e => { const r = e.getBoundingClientRect(), c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.display !== 'none'; };
  const sections = [...document.querySelectorAll('main section, section')].filter(visible);
  const centered = sections.filter(e => { const c = getComputedStyle(e); return c.textAlign === 'center' && e.getBoundingClientRect().width > 300; }).length;
  const sizes = [...new Set([...document.querySelectorAll('body *')].filter(visible).map(e => getComputedStyle(e).fontSize))];
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  const pageArea = Math.max(document.documentElement.scrollHeight, innerHeight) * document.documentElement.clientWidth;
  const rects = [...document.querySelectorAll('body *')].filter(visible).map(e => ({e,r:e.getBoundingClientRect(),c:getComputedStyle(e)}));
  const swatch = document.createElement('span'); swatch.style.color = accent; document.body.append(swatch);
  const accentComputed = accent ? getComputedStyle(swatch).color : ''; swatch.remove();
  const painted = rects.filter(({c}) => c.backgroundColor === accentComputed);
  const accentArea = accent ? painted.reduce((sum,{r}) => sum + Math.max(0, Math.min(r.width, innerWidth)) * r.height, 0) : null;
  const accentViewportArea = accent ? painted.reduce((sum,{r}) => sum + Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0)) * Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)), 0) : null;
  const gradients = rects.filter(({c}) => c.backgroundImage.includes('gradient(')).length;
  const heroGradient = [...document.querySelectorAll('main > section:first-child, main > header:first-child, .hero, [data-hero]')].some(e => getComputedStyle(e).backgroundImage.includes('gradient('));
  const glass = rects.filter(({c}) => c.backdropFilter !== 'none').length;
  const iconRows = sections.filter(e => { const icons = e.querySelectorAll('svg, i, [class*="icon"]'); return getComputedStyle(e).textAlign === 'center' && icons.length === 3; }).length;
  const purpleBlue = rects.some(({c}) => /rgb\((?:1[0-5]\d|[2-9]\d),\s*(?:[0-9]|[1-9]\d),\s*(?:1[3-9]\d|2\d\d)\)/.test(c.backgroundColor)) && rects.some(({c}) => /rgb\((?:[0-9]|[1-9]\d),\s*(?:[0-9]|[1-9]\d),\s*(?:1[3-9]\d|2\d\d)\)/.test(c.backgroundColor));
  const text = document.body.innerText;
  return { centered, typeSizes: sizes, accent, accentArea, accentRatio: accentArea === null ? null : accentArea / pageArea, accentViewportRatio: accentViewportArea === null ? null : accentViewportArea / (innerWidth * innerHeight), gradients, heroGradient, glass, iconRows, purpleBlue, visibleText: text, headlines: [...document.querySelectorAll('h1,h2,[data-tagline]')].map(e => e.innerText), placeholders: /\[placeholder\]|lorem ipsum|\btbd\b/i.test(text), h1: document.querySelectorAll('h1').length };
};
const copyProbe = (page, st) => page.evaluate(({ slots, lang, dir }) => {
  const norm = x => (x || '').replace(/\s+/g, ' ').trim();
  const wanted = new Map(slots.map(c => [c.id, norm(c.variants?.find(v => v.lang === lang && v.dir === dir)?.text || c.text)]));
  const errors = [], used = new Set();
  const nodes = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (nodes.nextNode()) {
    const n = nodes.currentNode, value = norm(n.nodeValue);
    if (!value || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(n.parentElement?.tagName)) continue;
    const style = getComputedStyle(n.parentElement), range = document.createRange(); range.selectNodeContents(n);
    if (style.display === 'none' || style.visibility === 'hidden' || range.getClientRects().length === 0) continue;
    const el = n.parentElement?.closest('[data-copy-slot]'), id = el?.getAttribute('data-copy-slot');
    if (!id || !wanted.has(id)) { errors.push(`unlisted visible copy: ${value.slice(0, 60)}`); continue; }
    used.add(id);
  }
  for (const [id, text] of wanted) {
    const matches = [...document.querySelectorAll('[data-copy-slot]')].filter(e => e.getAttribute('data-copy-slot') === id);
    if (matches.length !== 1 || norm(matches[0].textContent) !== text) errors.push(`copy slot ${id} differs from deck`);
    if (!used.has(id)) errors.push(`copy slot ${id} not visible`);
  }
  return { errors, pass: errors.length === 0 };
}, { slots: (handoff?.copySlots || []).filter(c => c.screen === st.screen && c.placements?.some(p => p.lang === st.lang && p.state === st.state)), lang: st.lang, dir: st.dir });
const design = await p.evaluate(designProbe);
Object.assign(design, copySignals(design.visibleText, design.headlines));
delete design.visibleText; delete design.headlines;
ev.checks.design = { ...design, basis: 'DOM background-area proxy; overlapping backgrounds may double count; screenshots and state-bound manual review required', pass: design.centered <= q.centeredSectionsPerPage && (phase === 'wireframe' || (design.typeSizes.length <= q.typeSizes && design.accentRatio !== null && design.accentRatio <= q.accentAreaRatioFullPage && design.accentViewportRatio !== null && design.accentViewportRatio <= q.accentAreaRatioViewport)) && !design.heroGradient && design.iconRows <= q.centeredThreeIconRows && !design.purpleBlue && !design.filler && !design.ruleOfThree && (phase === 'wireframe' || !design.placeholders) && design.h1 === 1 };
if (!ev.checks.design.pass) fail = true;
const axe = await p.evaluate(async () => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { 'target-size': { enabled: true } } }));
ev.checks.axe = { version: axe.testEngine.version, targetSizeEnabled: true, violations: axe.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })), incomplete: axe.incomplete.map(v => v.id), pass: axe.violations.length === 0 && axe.incomplete.length === 0 };
if (!ev.checks.axe.pass) fail = true;
// custom: tab through, check focus visible, not obscured by fixed/sticky elements, target size
await p.evaluate(() => { window.__fid = new WeakMap(); window.__fnext = 0; });
const stops = []; const seen = new Set();
for (let i = 0; i < 200; i++) {
  await p.evaluate(focusStyleProbe, { capture: true });
  await p.keyboard.press('Tab');
  await p.evaluate(focusSettle);
  const focusVisible = await p.evaluate(focusStyleProbe, { minContrast: q.focusStateContrast });
  const info = await p.evaluate(() => {
    const el = document.activeElement; if (!el || el === document.body) return null;
    if (!window.__fid.has(el)) window.__fid.set(el, ++window.__fnext);
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const top = document.elementFromPoint(Math.min(Math.max(cx, 0), innerWidth - 1), Math.min(Math.max(cy, 0), innerHeight - 1));
    const obscured = top && top !== el && !el.contains(top) && !top.contains(el);
    const inlineLink = el.tagName === 'A' && el.parentElement && /^(P|LI|SPAN|TD|DD)$/.test(el.parentElement.tagName) && (el.parentElement.textContent || '').trim().length > (el.textContent || '').trim().length;
    return { id: window.__fid.get(el), tag: el.tagName, name: el.getAttribute('aria-label') || el.name || (el.textContent || '').trim().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height), obscured: !!obscured, inlineLink };
  });
  if (info) info.focusVisible = focusVisible;
  if (!info) break;            // focus left the document (end of tab order)
  if (seen.has(info.id)) break; // same ELEMENT again = wrapped around (identity, not name)
  seen.add(info.id); stops.push(info);
}
const keyboardTrapSuspect = stops.length >= 200;
const small = stops.filter(s => (s.w < 24 || s.h < 24) && !s.inlineLink), noFocus = stops.filter(s => !s.focusVisible), obsc = stops.filter(s => s.obscured);
ev.checks.custom22 = { tabStops: stops.length, targetUnder24: small, focusNotVisible: noFocus, focusObscured: obsc, keyboardTrapSuspect, pass: !small.length && !noFocus.length && !obsc.length && !keyboardTrapSuspect, note: 'focus appearance change is a screening heuristic (settled after transitions; colour-only changes under the configured focusStateContrast (3:1 floor) between states, indicators below it against their backdrop and unrendered outline/border/decoration/pseudo changes do not count); manual visibility/contrast and WCAG evidence remain mandatory; inline-link exception needs manual review' };
if (!ev.checks.custom22.pass) fail = true;
evidenceWrite('page-1440.png', await p.screenshot({ fullPage: true }));
ev.checks.states = [];
if (phase === 'handoff' && handoff?.screens) {
  const declared = handoff.screens.flatMap(s => (s.states || []).filter(st => st.applicable !== false).map(st => ({ screen: s.id, ...st })));
  if (!declared.some(st => resolve(st.page) === resolve(page))) { ev.checks.states.push({ pass: false, error: 'positional page absent from declared states' }); fail = true; }
  for (const st of declared) {
    if (!st.page) continue;
    try {
      await p.goto(pathToFileURL(resolve(st.page)).href);
      const assets = await ready(p);
      const copy = await copyProbe(p, st);
      const frameBytes = await p.screenshot({ fullPage: true });
      const renderedSha256 = digest(frameBytes);
      await p.addScriptTag({ content: axeSrc });
      const a = await p.evaluate(async () => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { 'target-size': { enabled: true } } }));
      const d = await p.evaluate(designProbe);
      Object.assign(d, copySignals(d.visibleText, d.headlines));
      delete d.visibleText; delete d.headlines;
      const doc = await p.evaluate(() => ({ lang: document.documentElement.lang, dir: getComputedStyle(document.documentElement).direction, height: document.documentElement.scrollHeight }));
      const viewportRatios = [];
      for (let y = 0; y < doc.height; y += 900) { await p.evaluate(y => scrollTo(0, y), y); viewportRatios.push((await p.evaluate(designProbe)).accentViewportRatio); }
      await p.evaluate(() => scrollTo(0, 0));
      const focus = [];
      await p.evaluate(() => { window.__stateFocus = new WeakSet(); });
      for (let i = 0; i < 200; i++) {
        await p.evaluate(focusStyleProbe, { capture: true });
        await p.keyboard.press('Tab');
        await p.evaluate(focusSettle);
        const focusVisible = await p.evaluate(focusStyleProbe, { minContrast: q.focusStateContrast });
        const f = await p.evaluate(() => { const el = document.activeElement; if (!el || el === document.body || window.__stateFocus.has(el)) return null; window.__stateFocus.add(el); const r = el.getBoundingClientRect(), x = r.left+r.width/2, y = r.top+r.height/2, top = document.elementFromPoint(Math.max(0,Math.min(innerWidth-1,x)),Math.max(0,Math.min(innerHeight-1,y))); const inlineLink = el.tagName === 'A' && /^(P|LI|SPAN|TD|DD)$/.test(el.parentElement?.tagName || '') && el.parentElement.textContent.trim().length > el.textContent.trim().length; return { small: (r.width < 24 || r.height < 24) && !inlineLink, obscured: !!top && top !== el && !el.contains(top) && !top.contains(el) }; });
        if (!f) break;
        f.invisible = !focusVisible;
        focus.push(f);
      }
      const rmState = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
      await rmState.routeWebSocket(/.*/, ws => ws.close());
      await rmState.route('**/*', routeLocal);
      const rp = await rmState.newPage();
      await rp.goto(pathToFileURL(resolve(st.page)).href);
      await rp.waitForTimeout(300);
      const motion1 = await rp.evaluate(() => [...document.querySelectorAll('body *')].map(e => { const r=e.getBoundingClientRect(), c=getComputedStyle(e); return `${Math.round(r.x)}|${Math.round(r.y)}|${c.transform}|${c.opacity}`; }));
      await rp.waitForTimeout(700);
      const motion2 = await rp.evaluate(() => [...document.querySelectorAll('body *')].map(e => { const r=e.getBoundingClientRect(), c=getComputedStyle(e); return `${Math.round(r.x)}|${Math.round(r.y)}|${c.transform}|${c.opacity}`; }));
      const running = await rp.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length);
      await rmState.close();
      const maxViewportAccent = Math.max(...viewportRatios);
      const stateResult = { screen: st.screen, lang: st.lang, state: st.state, renderedSha256, approvedSha256: st.frame?.sha256, browserVersion: b.version(), axeViolations: a.violations.map(v => v.id), axeIncomplete: a.incomplete.map(v => v.id), assets, copy, centered: d.centered, typeSizes: d.typeSizes.length, accentRatio: d.accentRatio, maxViewportAccent, gradients: d.gradients, heroGradient: d.heroGradient, glass: d.glass, purpleBlue: d.purpleBlue, iconRows: d.iconRows, filler: d.filler, ruleOfThree: d.ruleOfThree, placeholders: d.placeholders, focusFailures: focus.filter(f => f.small || f.invisible || f.obscured), reducedMotion: { running, changed: motion1.some((x,i) => x !== motion2[i]) }, language: doc.lang, direction: doc.dir };
      stateResult.pass = renderedSha256 === st.frame?.sha256 && copy.pass && assets.brokenImages.length === 0 && assets.failedFonts.length === 0 && a.violations.length === 0 && a.incomplete.length === 0 && d.centered <= q.centeredSectionsPerPage && d.typeSizes.length <= q.typeSizes && d.accentRatio !== null && d.accentRatio <= q.accentAreaRatioFullPage && maxViewportAccent <= q.accentAreaRatioViewport && !d.heroGradient && !d.purpleBlue && d.iconRows <= q.centeredThreeIconRows && !d.filler && !d.ruleOfThree && !d.placeholders && d.h1 === 1 && stateResult.focusFailures.length === 0 && running === 0 && !stateResult.reducedMotion.changed && doc.lang === st.lang && doc.dir === st.dir;
      const filename = `${st.screen}-${st.lang}-${st.state}-1440.png`;
      if (!/^[a-zA-Z0-9_-]+\.png$/.test(filename)) throw Error('unsafe screen/state filename');
      evidenceWrite(filename, frameBytes);
      ev.checks.states.push(stateResult);
      if (!stateResult.pass) fail = true;
    } catch (e) { ev.checks.states.push({ screen: st.screen, state: st.state, pass: false, error: e.message }); fail = true; }
  }
}
const rm = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
await rm.routeWebSocket(/.*/, ws => ws.close());
await rm.addInitScript(() => { window.__raf = 0; const o = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (cb) => { window.__raf++; return o(cb); }; });
await rm.route('**/*', routeLocal);
const p2 = await rm.newPage();
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
ev.checks.resourceBoundary = { pass: blocked.length === 0, blockedRequests: blocked.length };
if (blocked.length) fail = true;
// 4 impeccable detect: findings are advisory, but it MUST run and return parseable output
{
  let out = '', status = 0;
  try { out = execFileSync(join(here, 'launcher-impeccable.sh'), ['detect', '--json', page], { encoding: 'utf8', env: { PATH: '/usr/bin:/bin', FANNAN_PROJECT: project } }); }
  catch (e) { out = String(e.stdout || ''); status = e.status; }
  let findings = null; try { const j = JSON.parse(out); if (Array.isArray(j)) findings = j; } catch {}
  if (findings === null || (status !== 0 && status !== 2)) { ev.checks.impeccable = { ran: false, exit: status, pass: false, note: 'detect did not run or gave no parseable output' }; fail = true; }
  else ev.checks.impeccable = { ran: true, exit: status, advisory: true, findings: findings.map(f => f.antipattern || f.name), pass: true };
}
ev.phase = phase;
ev.pass = !fail;
ev.handoffReady = ev.pass && phase === 'handoff';
evidenceWrite('evidence.json', JSON.stringify(ev, null, 1));
if (ev.handoffReady) {
  const rows = handoff.screens.flatMap(s => s.acceptance.map(a => `| ${s.id} | ${a.id} | ${a.severity} | ${a.decision} | ${a.check.replaceAll('|', '\\|')} | ${a.evidence} |`));
  const frames = handoff.screens.flatMap(s => s.states.filter(st => st.applicable !== false).map(st => `| ${s.id} | ${st.lang} | ${st.state} | ${st.frame.version} | ${st.frame.sha256} | ${st.frame.path} |`));
  const checklist = ['# Design and QA handoff', '', `Project: ${project}`, `Engineer: ${handoff.settings.roles.engineer}`, `QA gate: ${handoff.settings.roles.qaGate}`, `Writer: ${handoff.settings.roles.writer}`, `Approver: ${handoff.settings.roles.approver}`, `Approval record: ${handoff.approval.record}`, `Repository: ${handoff.settings.repository}`, `Stack: ${handoff.settings.stack}`, `Design link: ${handoff.designLink.url}`, `Token JSON: ${handoff.tokens.json.path}`, `Token CSS: ${handoff.tokens.css.path}`, `Build evidence: ${handoff.tokens.buildEvidence.path}`, 'Automated evidence: evidence.json', '', '## Screen and state frames', '', '| Screen | Language | State | Version | SHA-256 | Frame |', '|---|---|---|---|---|---|', ...frames, '', '## Acceptance and QA criteria', '', '| Screen | ID | Severity | Design decision | Check | Design evidence |', '|---|---|---|---|---|---|', ...rows, '', 'QA gate records build SHA, result and evidence against each criterion ID after implementation; design PASS is not QA PASS.', ''];
  evidenceWrite('HANDOFF.md', checklist.join('\n'));
}
console.log(JSON.stringify({ pass: ev.pass, lint: ev.checks.lint.pass, axe: ev.checks.axe.violations, custom22: ev.checks.custom22.pass, reducedMotion: ev.checks.reducedMotion.pass, impeccable: ev.checks.impeccable }));
process.exit(ev.pass ? 0 : 1);
