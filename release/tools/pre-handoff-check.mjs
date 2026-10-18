// pre-handoff-check.mjs: Fannan's Harden gate (project arg, protected external dependencies and executables). Local files only; all network requests blocked.
// Usage: FANNAN_DEPS=<npm prefix> node pre-handoff-check.mjs <DESIGN.md> <page.html> <evidence-dir> <project>
// Checks: (1) design.md lint 0 errors, (2) axe-core WCAG 2.0/2.1/2.2 A and AA tags (axe-tags.mjs) with target-size ENABLED, 0 violations,
// (3) custom WCAG 2.2: 2.4.11 focus not obscured, 2.5.8 targets >= 24x24, reduced motion = no running animation,
// focus visible on every tab stop, every declared desktop width + 320 px reflow screened, (4) impeccable detect (advisory). Writes evidence.json + screenshot.
import { readFileSync, existsSync, realpathSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { checkHandoff, qualityChecks } from './handoff-contract.mjs';
import { verifiedDeps } from './verify-deps.mjs';
import { localAsset } from './local-file-boundary.mjs';
import { copySignals } from './copy-signals.mjs';
import { verifiedBrowser, browserLaunchEnv } from './executable-trust.mjs';
import { focusSettle, focusStyleProbe, focusBaseline } from './focus-screen.mjs';
import { spacingProbe, approvedSpacing, approvedAccent } from './spacing-scale.mjs';
import { designProbe, rawGlass, normColour, accentCheck } from './design-probe.mjs';
import { screenWidths, resolveReflowCandidates, validWidths } from './width-screen.mjs'; // R8, ported from codex/fannan-r3-review 2733317
import { axeOptions } from './axe-tags.mjs';
import { isolatedPage } from './probe-world.mjs';
import { nativeCheck, compareIntegrity, contrastProbe, contentProbe, rafCounterInit, rafLoopFrom, motionSnapshot, motionChanges } from './integrity.mjs';
import { visibilityScan, contrastPaths, resolveContrastIncomplete, requiresScriptCheck } from './visibility.mjs'; // R17: the rendered-visibility backstop
import { copyDeckProbe } from './copy-deck.mjs'; // R18: the copy-deck check, testable on its own
import { scopeOf, resolveScoped } from './exceptions.mjs';
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
// CODEX-R3-02: the approved spacing scale comes from the hash-checked handoff token JSON, never from the page.
const approvedScale = approvedSpacing(handoff);
ev.checks.spacingTokens = { source: approvedScale.source ?? null, values: approvedScale.values, error: approvedScale.error, pass: !approvedScale.error };
if (phase === 'handoff' && !ev.checks.spacingTokens.pass) fail = true;
// R11 panel D1 (decision A): the accent must be the approved palette token; FAIL at handoff, DEFERRED in wireframes.
const approvedAccentToken = approvedAccent(handoff);
const accentFor = async (pg, d) => accentCheck({ design: d, approved: approvedAccentToken, pageColour: await pg.evaluate(normColour, d.accent), approvedColour: approvedAccentToken.value ? await pg.evaluate(normColour, approvedAccentToken.value) : null, phase });
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
const browserHome = mkdtempSync(join(tmpdir(), 'fannan-browser-home-')); // ARGON-R2-06: private HOME, removed on exit
process.on('exit', () => rmSync(browserHome, { recursive: true, force: true }));
let browserIdentity;
try { browserIdentity = verifiedBrowser(); }
catch (e) { console.error('pre-handoff-check: browser untrusted: ' + e.message); process.exit(2); }
const b = await chromium.launch({ executablePath: browserIdentity.path, chromiumSandbox: true, env: browserLaunchEnv(browserHome) });
const runtimeVersion = b.version();
if (runtimeVersion !== browserIdentity.version) { console.error(`pre-handoff-check: browser version ${runtimeVersion} does not match reviewed pin ${browserIdentity.version}`); await b.close(); process.exit(2); } // R4-4
ev.browser = { ...browserIdentity, version: runtimeVersion };
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
await ctx.routeWebSocket(/.*/, ws => ws.close());
const blocked = [];
const OUTPUT_BASE = '/workspace/design-output';
const projectRoot = join(OUTPUT_BASE, project);
const glassFiles = new Set(); // R11 S2: served CSS/HTML that declares a backdrop filter (Chrome drops the -webkit- alias)
// R11: served CSS, HTML, SVG and JavaScript text (constructed sheets and script-set styles; Chrome drops the -webkit- alias when parsing)
const scanGlass = (path, contentType, body) => { if (/text\/(css|html|javascript)|application\/(javascript|ecmascript)|image\/svg\+xml/.test(contentType) && rawGlass(body.toString('utf8'), /text\/css/.test(contentType) ? 'css' : 'script')) glassFiles.add(path); }; // R12 M04: script forms in HTML/JS/SVG
const served = new Set(); // R13 N07: URLs whose bytes the checker served and scanned
const routeLocal = async r => { const u = r.request().url(); try { const asset = localAsset(u, projectRoot); scanGlass(asset.path, asset.contentType, asset.body); served.add(u); await r.fulfill({ body: asset.body, contentType: asset.contentType }); } catch (e) { blocked.push({ url: u, reason: e.message }); await r.abort(); } };
await ctx.route('**/*', routeLocal);
const p = await isolatedPage(await ctx.newPage()); // R11 C3: probes and axe run in an isolated world
const ready = page => page.evaluate(async () => { await document.fonts.ready; const brokenImages = []; await Promise.all([...document.images].map(async img => { try { await img.decode(); } catch { brokenImages.push(img.currentSrc || img.src); } })); return { brokenImages, failedFonts: [...document.fonts].filter(f => f.status === 'error').map(f => f.family) }; });
await p.goto(pathToFileURL(resolve(page)).href); const firstAssets = await ready(p); await p.addScriptTag({ content: axeSrc });
ev.checks.assets = { ...firstAssets, pass: firstAssets.brokenImages.length === 0 && firstAssets.failedFonts.length === 0 };
if (!ev.checks.assets.pass) fail = true;
const copyProbe = (page, st) => page.evaluate(copyDeckProbe, { slots: (handoff?.copySlots || []).filter(c => c.screen === st.screen && c.placements?.some(p => p.lang === st.lang && p.state === st.state)), lang: st.lang, dir: st.dir });
const design = { ...await p.evaluate(designProbe), ...await p.evaluate(spacingProbe, approvedScale.values) }; // OPUS-R2-10
Object.assign(design, copySignals(design.visibleText, design.headlines));
delete design.visibleText; delete design.headlines;
ev.checks.design = { ...design, basis: 'DOM background-area proxy; overlapping backgrounds may double count; screenshots and state-bound manual review required', pass: design.centered <= q.centeredSectionsPerPage && (phase === 'wireframe' || (design.typeSizes.length <= q.typeSizes && design.accentRatio !== null && design.accentRatio <= q.accentAreaRatioFullPage && design.accentViewportRatio !== null && design.accentViewportRatio <= q.accentAreaRatioViewport)) && !design.heroGradient && design.glass <= q.stockGlass && design.iconRows <= q.centeredThreeIconRows && !design.purpleBlue && !design.filler && !design.ruleOfThree && (phase === 'wireframe' || !design.placeholders) && (phase === 'wireframe' || design.spacingOffScale.length <= q.spacingOffScale) && design.h1 === 1 };
if (!ev.checks.design.pass) fail = true;
ev.checks.accent = await accentFor(p, design);
if (!ev.checks.accent.pass) fail = true;
// R12 M03: probes and axe run in the main frame only, so any frame (readable or not) blocks the final handoff.
const framesCheck = d => ({ frames: d.glassScopes.frames + d.glassScopes.unscannedFrames.length, unscanned: d.glassScopes.unscannedFrames, status: phase === 'wireframe' ? 'DEFERRED' : d.glassScopes.frames + d.glassScopes.unscannedFrames.length ? 'FAIL' : 'PASS', note: 'axe and the probes do not run inside frames', pass: phase === 'wireframe' || d.glassScopes.frames + d.glassScopes.unscannedFrames.length === 0 });
ev.checks.frames = framesCheck(design);
if (!ev.checks.frames.pass) fail = true;
// R13 N07: data:/blob: stylesheets are refused, and a stylesheet whose rules could not be read and whose bytes the
// checker did not serve and scan is unscanned; both fail (glass is gated in both phases).
const sheetsCheck = d => { const list = d.stylesheets || [], refused = list.filter(x => /^(data|blob):/i.test(x.href || '')), unscanned = list.filter(x => !x.readable && !refused.includes(x) && !(x.href && served.has(x.href))); return { sheets: list.length, refused: refused.map(x => (x.href || '').slice(0, 80)), unscanned: unscanned.map(x => x.href || x.owner), pass: refused.length === 0 && unscanned.length === 0 }; };
ev.checks.stylesheets = sheetsCheck(design);
if (!ev.checks.stylesheets.pass) fail = true;
// R12 M07/M09/M20: the positional page is scoped by its declared state (screen, state, lang).
const declaredStates = (handoff?.screens || []).flatMap(s => (s.states || []).filter(st => st.applicable !== false).map(st => ({ screen: s.id, ...st })));
// R19-MIMAR-01: the PASS wcag-review manual record for a scope (screen, language, state)
const reviewFor = scope => scope ? (handoff?.manualChecks || []).find(m => m.id === 'wcag-review' && m.screen === scope.screen && m.lang === scope.lang && m.state === scope.state && m.decision === 'PASS') ?? null : null;
const pageScope = scopeOf(declaredStates.find(st => st.page && resolve(st.page) === resolve(page)));
const axe = await p.evaluate(async options => axe.run(document, options), axeOptions()); // R11 C1: WCAG 2.0-2.2 A and AA
ev.checks.axe = { version: axe.testEngine.version, targetSizeEnabled: true, violations: axe.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })), incomplete: axe.incomplete.map(v => v.id), pass: axe.violations.length === 0 && axe.incomplete.length === 0 };
const pagePaths = await contrastPaths(await isolatedPage(p), axe.incomplete); // R19-MIMAR-01, resolved after integrity
const pageIncomplete = axe.incomplete;
if (axe.violations.length) fail = true;
// custom: tab through, check focus visible, not obscured by fixed/sticky elements, target size
await p.evaluate(() => { window.__fid = new WeakMap(); window.__fnext = 0; });
const stops = []; const seen = new Set();
await p.evaluate(focusBaseline); await p.evaluate(focusStyleProbe, { capture: true }); // ARGON-R2-05: one unfocused baseline
for (let i = 0; i < 200; i++) {
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
// R8: every declared desktop width plus 320 px reflow (after the 1440 frame; the viewport returns to 1440)
ev.checks.widths = await screenWidths(p, handoff?.settings?.desktopWidths, null);
if (!ev.checks.widths.pass) fail = true;
// R11 panel D1 (decisions C, T4), R12 M06-M08/M17: integrity cross-checks (integrity.mjs). The full hard-fail vector is
// measured in the probe world, in the page world and with JavaScript off, plus native-function and content checks.
const integrityFor = async (pagePath, scope) => {
  const contexts = [];
  try {
    const contextFor = async javaScriptEnabled => { const c = await b.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block', javaScriptEnabled }); contexts.push(c); await c.routeWebSocket(/.*/, ws => ws.close()); await c.route('**/*', routeLocal); return c; };
    const widthsFor = validWidths(handoff?.settings?.desktopWidths) ? handoff.settings.desktopWidths : [1440];
    // R13 N11/N12: the canonical gate result, per width where the gate is per width.
    // R17: the rendered-visibility backstop runs once per rendering in the probe world (screenshots are shared by both
    // worlds) and its counts enter both vectors; its items are kept as evidence.
    const measure = async (pg, vis) => { try {
      const d = await pg.evaluate(designProbe), sp = await pg.evaluate(spacingProbe, approvedScale.values), ct = await pg.evaluate(contrastProbe);
      Object.assign(d, copySignals(d.visibleText, d.headlines));
      const doc = await pg.evaluate(() => document.documentElement.scrollHeight), ratios = [];
      for (let y = 0; y < doc; y += 900) { await pg.evaluate(y => scrollTo(0, y), y); ratios.push((await pg.evaluate(designProbe)).accentViewportRatio); }
      await pg.evaluate(() => scrollTo(0, 0));
      const rs = (await screenWidths(pg, widthsFor, null)).results, per = k => Object.fromEntries(rs.map(r => [r.width, k === 'horizontalOverflow' ? Number(r.horizontalOverflow) : r[k]?.length ?? 0])), r320 = rs.find(r => r.width === 320);
      return { vector: { glass: d.glass, h1: d.h1, placeholders: d.placeholders, centered: d.centered, typeSizes: d.typeSizes.length, heroGradient: d.heroGradient, purpleBlue: d.purpleBlue, iconRows: d.iconRows, accent: d.accent || null, accentRatio: d.accentRatio, maxViewportAccent: ratios.length && !ratios.includes(null) ? Math.max(...ratios) : null, filler: !!d.filler, ruleOfThree: !!d.ruleOfThree, frames: d.glassScopes.frames + d.glassScopes.unscannedFrames.length, stylesheetsUnscanned: sheetsCheck(d).refused.length + sheetsCheck(d).unscanned.length, spacingOffScale: sp.spacingOffScale.length, horizontalOverflow: per('horizontalOverflow'), clipped: per('clipped'), offscreenLeft: per('offscreenLeft'), unreachable: per('unreachable'), scrolledText: per('scrolledText'), unmeasured: per('unmeasured'), unscannedScopes: per('unscannedScopes'), reflowFail: !r320?.pass, contrastFailures: ct.contrastFailures, contrastUnknown: ct.contrastUnknown, contrastChecked: ct.contrastChecked, contrastEffects: ct.contrastEffects, textMeasured: vis?.textMeasured, textObscured: vis?.textObscured, textUnreadable: vis?.textUnreadable, textUnmeasured: vis?.textUnmeasured, textHidden: vis?.textHidden }, content: await pg.evaluate(contentProbe), visibility: vis ? { ...vis } : null };
    } catch (e) { return { vector: null, content: null, error: e.message }; } };
    const href = pathToFileURL(resolve(pagePath)).href;
    const ic = await contextFor(true), icMain = await ic.newPage(), icProbe = await isolatedPage(icMain);
    await icProbe.goto(href); await ready(icProbe);
    const scan = async pg => { try { return await visibilityScan(pg, { topLayer: !!scope?.state && scope.state !== 'default' }); } catch (e) { return { error: e.message }; } };
    const vis = await scan(icProbe), probe = await measure(icProbe, vis), pageWorld = await measure(icMain, vis);
    let tamperSigns = null; try { tamperSigns = await icMain.evaluate(nativeCheck); } catch {}
    const jc = await contextFor(false), jsOffPage = await isolatedPage(await jc.newPage());
    await jsOffPage.goto(href); await jsOffPage.waitForLoadState('load'); // no ready(): its promises need page scripts
    const jsOff = await measure(jsOffPage, await scan(jsOffPage));
    return compareIntegrity({ probe, page: pageWorld, jsOff, tamperSigns, handoff, scope });
  } catch (e) { return { scope, status: 'INCOMPLETE', pass: false, error: `integrity cross-check could not run: ${e.message}` }; }
  finally { for (const c of contexts) await c.close().catch(() => {}); }
};
// R12 M13, R13 N18: one hardened reduced-motion routine for the positional page and every declared state: running Web
// Animations, moved elements, and the private rAF counter (rafCounterInit, read in the main world on purpose).
const motionFor = async pagePath => {
  const c = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  try {
    await c.routeWebSocket(/.*/, ws => ws.close());
    await c.addInitScript(rafCounterInit);
    await c.route('**/*', routeLocal);
    const main = await c.newPage(), pg = await isolatedPage(main);
    await pg.goto(pathToFileURL(resolve(pagePath)).href); await pg.waitForTimeout(300);
    const snap = () => pg.evaluate(motionSnapshot); // R14-GPT-05: composed tree, stable composed-path keys (integrity.mjs)
    const s1 = await snap(); const raf1 = await main.evaluate(() => window.__raf);
    await pg.waitForTimeout(700);
    const s2 = await snap(); const raf2 = await main.evaluate(() => window.__raf);
    const waapi = await pg.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length);
    const moved = motionChanges(s1, s2);
    const rafLoop = rafLoopFrom(raf1, raf2); // a non-finite or decreasing reading counts as a loop
    return { runningWebAnimations: waapi, elementsChangedOver700ms: moved, rafCallsOver700ms: Number.isFinite(raf2 - raf1) ? raf2 - raf1 : null, rafLoop, pass: waapi === 0 && moved === 0 && !rafLoop };
  } catch (e) { return { pass: false, error: `reduced-motion check could not run: ${e.message}` }; }
  finally { await c.close().catch(() => {}); }
};
ev.checks.states = [];
// R16-GPT-03: the wireframe phase also renders every declared screen in every declared language (its default
// state), with phase-appropriate checks; a missing rendering or page fails instead of being skipped.
const wireframe = phase === 'wireframe';
if (handoff?.screens) {
  const declared = wireframe
    ? handoff.screens.flatMap(s => (handoff.languages || []).map(l => { const st = (s.states || []).find(v => v.state === 'default' && v.lang === l.lang && v.dir === l.dir && v.applicable !== false); return st ? { screen: s.id, ...st } : { screen: s.id, state: 'default', lang: l.lang, dir: l.dir, page: null }; }))
    : handoff.screens.flatMap(s => (s.states || []).filter(st => st.applicable !== false).map(st => ({ screen: s.id, ...st })));
  if (!declared.some(st => st.page && resolve(st.page) === resolve(page))) { ev.checks.states.push({ pass: false, error: 'positional page absent from declared states' }); fail = true; }
  for (const st of declared) {
    if (!st.page || !existsSync(resolve(st.page))) { ev.checks.states.push({ screen: st.screen, lang: st.lang, state: st.state, pass: false, error: st.page ? 'declared page does not exist' : 'no rendering declared for this screen and language' }); fail = true; continue; }
    try {
      await p.goto(pathToFileURL(resolve(st.page)).href);
      const assets = await ready(p);
      const copy = await copyProbe(p, st);
      const frameBytes = await p.screenshot({ fullPage: true });
      const renderedSha256 = digest(frameBytes);
      await p.addScriptTag({ content: axeSrc });
      const a = await p.evaluate(async options => axe.run(document, options), axeOptions()); // R11 C1
      const paths = await contrastPaths(await isolatedPage(p), a.incomplete); // R19-MIMAR-01
      const d = { ...await p.evaluate(designProbe), ...await p.evaluate(spacingProbe, approvedScale.values) }; // OPUS-R2-10
      Object.assign(d, copySignals(d.visibleText, d.headlines));
      const accent = await accentFor(p, d); // R11 panel A, every state
      delete d.visibleText; delete d.headlines;
      const doc = await p.evaluate(() => ({ lang: document.documentElement.lang, dir: getComputedStyle(document.documentElement).direction, height: document.documentElement.scrollHeight }));
      const viewportRatios = [];
      for (let y = 0; y < doc.height; y += 900) { await p.evaluate(y => scrollTo(0, y), y); viewportRatios.push((await p.evaluate(designProbe)).accentViewportRatio); }
      await p.evaluate(() => scrollTo(0, 0));
      const focus = [];
      await p.evaluate(() => { window.__stateFocus = new WeakSet(); });
      await p.evaluate(focusBaseline); await p.evaluate(focusStyleProbe, { capture: true }); // ARGON-R2-05
      for (let i = 0; i < 200; i++) {
        await p.keyboard.press('Tab');
        await p.evaluate(focusSettle);
        const focusVisible = await p.evaluate(focusStyleProbe, { minContrast: q.focusStateContrast });
        const f = await p.evaluate(() => { const el = document.activeElement; if (!el || el === document.body || window.__stateFocus.has(el)) return null; window.__stateFocus.add(el); const r = el.getBoundingClientRect(), x = r.left+r.width/2, y = r.top+r.height/2, top = document.elementFromPoint(Math.max(0,Math.min(innerWidth-1,x)),Math.max(0,Math.min(innerHeight-1,y))); const inlineLink = el.tagName === 'A' && /^(P|LI|SPAN|TD|DD)$/.test(el.parentElement?.tagName || '') && el.parentElement.textContent.trim().length > el.textContent.trim().length; return { small: (r.width < 24 || r.height < 24) && !inlineLink, obscured: !!top && top !== el && !el.contains(top) && !top.contains(el) }; });
        if (!f) break;
        f.invisible = !focusVisible;
        focus.push(f);
      }
      const widths = await screenWidths(p, handoff?.settings?.desktopWidths, { lang: st.lang, dir: st.dir }); // R8
      const frames = framesCheck(d); // R12 M03
      const integrity = await integrityFor(st.page, scopeOf(st)); // R12 M07: every declared state
      const filename = `${st.screen}-${st.lang}-${st.state}-1440.png`;
      const scriptClaim = requiresScriptCheck({ declaration: st, integrity }); // R19b
      if (scriptClaim.claimed && scriptClaim.rendersWithoutScript) { integrity.mismatches = [...(integrity.mismatches || []), { check: 'requiresScript', source: 'js-off', reason: 'requiresScript is declared but the state renders with JavaScript off' }]; integrity.status = 'integrity mismatch'; integrity.pass = false; }
      const contrastResolution = resolveContrastIncomplete({ incomplete: a.incomplete, paths, integrity, review: reviewFor(scopeOf(st)), shots: [st.frame?.path, filename], scriptOnly: scriptClaim.valid }); // R19-MIMAR-01
      const stylesheets = sheetsCheck(d); // R13 N07
      const reducedMotion = await motionFor(st.page); // R13 N18: the same hardened routine as the page
      const maxViewportAccent = viewportRatios.length && !viewportRatios.includes(null) ? Math.max(...viewportRatios) : null; // ARGON-R5-01: Math.max(null) is 0
      const stateResult = { screen: st.screen, lang: st.lang, state: st.state, renderedSha256, approvedSha256: st.frame?.sha256, browserVersion: b.version(), axeViolations: a.violations.map(v => v.id), axeIncomplete: a.incomplete.map(v => v.id), axeIncompleteUnresolved: contrastResolution.unresolved, requiresScript: scriptClaim, axeContrastNodes: contrastResolution.contrastNodes, assets, copy, centered: d.centered, typeSizes: d.typeSizes.length, accentRatio: d.accentRatio, maxViewportAccent, gradients: d.gradients, heroGradient: d.heroGradient, glass: d.glass, purpleBlue: d.purpleBlue, iconRows: d.iconRows, spacingOffScale: d.spacingOffScale, spacingExceptions: d.spacingExceptions, accent, frames, integrity, filler: d.filler, ruleOfThree: d.ruleOfThree, placeholders: d.placeholders, focusFailures: focus.filter(f => f.small || f.invisible || f.obscured), widths, reducedMotion, stylesheets, language: doc.lang, direction: doc.dir };
      stateResult.pass = (wireframe || renderedSha256 === st.frame?.sha256) && copy.pass && assets.brokenImages.length === 0 && assets.failedFonts.length === 0 && a.violations.length === 0 && contrastResolution.pass && d.centered <= q.centeredSectionsPerPage && (wireframe || (d.typeSizes.length <= q.typeSizes && d.accentRatio !== null && d.accentRatio <= q.accentAreaRatioFullPage && maxViewportAccent !== null && maxViewportAccent <= q.accentAreaRatioViewport)) && !d.heroGradient && d.glass <= q.stockGlass && !d.purpleBlue && d.iconRows <= q.centeredThreeIconRows && !d.filler && !d.ruleOfThree && (wireframe || !d.placeholders) && (wireframe || d.spacingOffScale.length <= q.spacingOffScale) && d.h1 === 1 && accent.pass && frames.pass && stylesheets.pass && integrity.pass && stateResult.focusFailures.length === 0 && widths.pass && reducedMotion.pass && doc.lang === st.lang && doc.dir === st.dir;
      if (!/^[a-zA-Z0-9_-]+\.png$/.test(filename)) throw Error('unsafe screen/state filename');
      evidenceWrite(filename, frameBytes);
      ev.checks.states.push(stateResult);
      if (!stateResult.pass) fail = true;
    } catch (e) { ev.checks.states.push({ screen: st.screen, state: st.state, pass: false, error: e.message }); fail = true; }
  }
}
// R11 panel D1 (decisions B, T2): every 2D reflow candidate (page and states) needs a recorded decision; unresolved BLOCKS.
ev.checks.reflowCandidates = resolveReflowCandidates([{ scope: pageScope, w: ev.checks.widths }, ...ev.checks.states.map(st => ({ scope: scopeOf(st), w: st.widths }))].flatMap(({ scope, w }) => (w?.results || []).flatMap(r => (r.reflowCandidates || []).map(c => ({ ...scopeOf(scope), ...c })))), handoff, phase); // R12 M09: scoped
if (!ev.checks.reflowCandidates.pass) fail = true;
// R12 M20: every documented spacing exception needs a scoped handoff `spacingExceptions` entry naming the approver.
const spacingItems = [{ scope: pageScope, list: design.spacingExceptions }, ...ev.checks.states.map(st => ({ scope: scopeOf(st), list: st.spacingExceptions }))].flatMap(({ scope, list }) => (list || []).map(x => ({ ...scopeOf(scope), ...x })));
const spacingResolved = resolveScoped({ items: spacingItems, entries: handoff?.spacingExceptions, roles: [handoff?.settings?.roles?.approver], phase, what: 'spacingExceptions' });
ev.checks.spacingExceptions = { exceptions: spacingResolved.items, unresolved: spacingResolved.unresolved, status: spacingResolved.status, pass: spacingResolved.pass };
if (!ev.checks.spacingExceptions.pass) fail = true;
ev.checks.reducedMotion = await motionFor(page); // R12 M13, R13 N18
if (!ev.checks.reducedMotion.pass) fail = true;
// R11 panel D1 (decisions C, T4), R12 M06-M08: integrity cross-checks on the positional page (and, above, every state).
ev.checks.integrity = await integrityFor(page, pageScope);
if (!ev.checks.integrity.pass) fail = true;
{ // R19-MIMAR-01: the positional page's automated incomplete results, resolved against the backstop and the review
  const st = declaredStates.find(x => x.page && resolve(x.page) === resolve(page));
  const scriptClaim = requiresScriptCheck({ declaration: st, integrity: ev.checks.integrity }); // R19b
  if (scriptClaim.claimed && scriptClaim.rendersWithoutScript) { const i = ev.checks.integrity; i.mismatches = [...(i.mismatches || []), { check: 'requiresScript', source: 'js-off', reason: 'requiresScript is declared but the state renders with JavaScript off' }]; i.status = 'integrity mismatch'; i.pass = false; fail = true; }
  ev.checks.axe.requiresScript = scriptClaim;
  const r = resolveContrastIncomplete({ incomplete: pageIncomplete, paths: pagePaths, integrity: ev.checks.integrity, review: reviewFor(pageScope), shots: [st?.frame?.path, 'page-1440.png'], scriptOnly: scriptClaim.valid });
  Object.assign(ev.checks.axe, { unresolvedIncomplete: r.unresolved, contrastNodes: r.contrastNodes, pass: ev.checks.axe.violations.length === 0 && r.pass });
  if (!ev.checks.axe.pass) fail = true;
}
await b.close();
ev.externalRequestsBlocked = blocked;
ev.checks.resourceBoundary = { pass: blocked.length === 0, blockedRequests: blocked.length };
if (blocked.length) fail = true;
for (const file of [page, ...(handoff?.screens || []).flatMap(sc => (sc.states || []).map(st => st.page))].filter(Boolean)) { try { scanGlass(resolve(file), 'text/html', readFileSync(resolve(file))); } catch {} }
ev.checks.glassSource = { files: [...glassFiles], pass: glassFiles.size === 0 };
if (!ev.checks.glassSource.pass) fail = true;
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
