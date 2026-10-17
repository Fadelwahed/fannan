import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

// OPUS-R2-09: the focus-state contrast is configurable upward only; 3:1 (WCAG 1.4.11 AA) is the floor.
export function validateQualityChecks(config) {
  const value = config?.thresholds?.focusStateContrast;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 3) throw Error('quality-checks focusStateContrast must be a number >= 3 (WCAG 1.4.11 floor)');
  return config;
}
export const qualityChecks = validateQualityChecks(JSON.parse(readFileSync(new URL('../runtime/quality-checks.json', import.meta.url), 'utf8')));
export const manualIds = qualityChecks.manualIds;
export const states = ['default', 'hover', 'focus', 'disabled', 'empty', 'loading', 'error'];
const filler = /\b(unlock|seamless|empower|cutting[ -]edge|revolutionary|game[ -]changing)\b/i;
const ref = x => typeof x === 'string' && /:\d+(?:-\d+)?$/.test(x);
const file = x => typeof x === 'string' && existsSync(resolve(x)) && statSync(resolve(x)).isFile() && statSync(resolve(x)).size > 0;
const nonempty = x => typeof x === 'string' && !!x.trim();
const sha = x => createHash('sha256').update(readFileSync(resolve(x))).digest('hex');
const pngWidth = x => {
  try {
    const b = readFileSync(resolve(x));
    if (!b.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) return null;
    let i = 8, width, height, depth, color, ended = false; const data = [];
    while (i + 12 <= b.length) {
      const size = b.readUInt32BE(i), type = b.toString('ascii', i + 4, i + 8), start = i + 8;
      if (start + size + 4 > b.length) return null;
      if (type === 'IHDR') { width = b.readUInt32BE(start); height = b.readUInt32BE(start + 4); depth = b[start + 8]; color = b[start + 9]; }
      if (type === 'IDAT') data.push(b.subarray(start, start + size));
      if (type === 'IEND') { ended = true; break; }
      i = start + size + 4;
    }
    const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[color];
    if (!ended || !width || !height || !channels || !data.length) return null;
    const pixels = inflateSync(Buffer.concat(data));
    return pixels.length >= (Math.ceil(width * channels * depth / 8) + 1) * height ? width : null;
  } catch { return null; }
};
const cited = source => {
  if (!file(source?.path) || !ref(source.ref) || !source.ref.startsWith(`${basename(source.path)}:`)) return false;
  const line = Number(source.ref.match(/:(\d+)/)?.[1]);
  return line > 0 && line <= readFileSync(resolve(source.path), 'utf8').split(/\r?\n/).length;
};

export function checkHandoff(h, phase = 'handoff') {
  const errors = [];
  const need = (ok, message) => { if (!ok) errors.push(message); };
  need(h?.version === 1, 'version must be 1');
  need(h?.phase === phase, `phase must be ${phase}`);
  need(file(h?.brief?.path), 'brief.path must exist');
  need(file(h?.rules?.path), 'rules.path must exist');
  need(file(h?.settings?.path) && nonempty(h?.settings?.repository) && nonempty(h?.settings?.stack) && ['engineer', 'qaGate', 'writer', 'approver'].every(k => nonempty(h?.settings?.roles?.[k])), 'settings path, repo, stack and four roles required');
  if (file(h?.settings?.path)) {
    const settingText = readFileSync(resolve(h.settings.path), 'utf8');
    for (const v of [h.settings.repository, h.settings.stack, ...Object.values(h.settings.roles || {})].filter(nonempty)) need(settingText.includes(v), `settings value ${v} absent from project file`);
  }
  need(nonempty(h?.pointOfView?.idea) && h.pointOfView?.briefRefs?.length > 0 && h.pointOfView.briefRefs.every(ref), 'point of view needs an idea and brief line refs');
  need(Array.isArray(h?.screens) && h.screens.length > 0, 'screens required');
  need(Array.isArray(h?.copySlots) && h.copySlots.length > 0, 'copy slots required before layout');
  need(new Set((h?.copySlots || []).map(c => c.id)).size === (h?.copySlots || []).length, 'copy slot IDs must be unique');
  need(new Set((h?.facts || []).map(f => f.id)).size === (h?.facts || []).length, 'fact IDs must be unique');
  const facts = new Map((h?.facts || []).map(f => [f.id, f]));
  for (const f of h?.facts || []) {
    const sourceLine = cited(f.source) ? readFileSync(resolve(f.source.path), 'utf8').split(/\r?\n/)[Number(f.source.ref.match(/:(\d+)/)[1]) - 1] : '';
    need(nonempty(f.id) && nonempty(f.claim) && f.status === 'confirmed' && cited(f.source) && nonempty(f.source.excerpt) && sourceLine.includes(f.source.excerpt) && f.source.sha256 === sha(f.source.path) && nonempty(f.checkedBy) && /^20\d\d-\d\d-\d\d$/.test(f.checkedAt || ''), `fact ${f.id}: checked confirmed claim, cited excerpt, source hash, reviewer and date required`);
  }
  need(Array.isArray(h?.placeholders) && (phase !== 'handoff' || h.placeholders.length === 0), 'placeholders must be listed and cleared for handoff');
  for (const c of h?.copySlots || []) {
    const prefix = `copy ${c.id || '?'}:`;
    need(nonempty(c.id) && nonempty(c.screen) && nonempty(c.purpose) && nonempty(c.tone), `${prefix} id, screen, purpose, tone required`);
    need(Number.isInteger(c.minChars) && Number.isInteger(c.maxChars) && c.minChars >= 0 && c.maxChars >= c.minChars, `${prefix} valid character range required`);
    need(nonempty(c.text) && (phase === 'wireframe' || !/\[placeholder\]|lorem ipsum|\btbd\b/i.test(c.text || '')) && !filler.test(c.text || ''), `${prefix} placeholder or filler copy`);
    if (phase === 'wireframe' && /\[placeholder\]/i.test(c.text || '')) need(h.placeholders?.some(p => p.slotId === c.id && nonempty(p.owner) && nonempty(p.reason)), `${prefix} visible wireframe placeholder must be listed with owner and reason`);
    need((c.text || '').length >= c.minChars && (c.text || '').length <= c.maxChars, `${prefix} text outside character range`);
    if (!(phase === 'wireframe' && /\[placeholder\]/i.test(c.text || ''))) need(['brief', 'writer'].includes(c.source?.kind) && cited(c.source), `${prefix} brief/writer source with line ref required`);
    need(['claim', 'interface'].includes(c.kind) && (c.kind !== 'claim' || c.claimRefs?.length > 0), `${prefix} claim copy needs confirmed fact refs`);
    if (file(c.source?.path) && nonempty(c.text) && !(phase === 'wireframe' && /\[placeholder\]/i.test(c.text))) need(readFileSync(resolve(c.source.path), 'utf8').includes(c.text), `${prefix} text absent from cited source`);
    need(['ltr', 'rtl'].includes(c.dir) && nonempty(c.lang), `${prefix} language and direction required`);
    if (phase === 'handoff') need(file(c.placementScreenshot), `${prefix} placement screenshot required`);
    if (phase === 'handoff') {
      const targets = (h.screens || []).filter(s => s.id === c.screen).flatMap(s => (s.states || []).filter(st => st.applicable !== false));
      need(Array.isArray(c.placements) && c.placements.length > 0 && c.placements.every(p => file(p.screenshot) && targets.some(st => st.lang === p.lang && st.state === p.state)), `${prefix} placements must name applicable states with screenshots`);
      for (const lang of h.languages || []) need(c.placements?.some(p => p.lang === lang.lang), `${prefix} placement missing ${lang.lang}`);
    }
    if (phase === 'handoff') need(Array.isArray(c.variants) && c.variants.length > 0 && c.variants.every(v => nonempty(v.lang) && ['ltr', 'rtl'].includes(v.dir) && nonempty(v.text) && v.text.length <= c.maxChars && file(v.source?.path) && ref(v.source?.ref) && readFileSync(resolve(v.source.path), 'utf8').includes(v.text)), `${prefix} language variants need text, direction, length and source proof`);
    for (const lang of h.languages || []) need(c.variants?.some(v => v.lang === lang.lang && v.dir === lang.dir), `${prefix} missing ${lang.lang}/${lang.dir} variant`);
    for (const id of c.claimRefs || []) need(facts.has(id) && facts.get(id).status === 'confirmed', `${prefix} claim ${id} lacks confirmed fact`);
    if (/\b\d+(?:[.,]\d+)?\s*(%|million|billion|years?|clients?|users?)\b|[“”"]/.test(c.text || '')) need(c.claimRefs?.length > 0, `${prefix} statistic or quote needs a confirmed fact`);
  }
  for (const s of h?.screens || []) {
    need(nonempty(s.id) && nonempty(s.page), `screen ${s.id || '?'}: id/page required`);
    need(Array.isArray(s.headingOutline) && s.headingOutline.filter(x => x.level === 1).length === 1, `screen ${s.id}: exactly one H1 in outline`);
    need(nonempty(s.seoIntent) && nonempty(s.schemaIntent), `screen ${s.id}: SEO/schema intent required`);
    need(Array.isArray(s.images) && s.images.every(i => nonempty(i.id) && nonempty(i.altIntent) && typeof i.alt === 'string'), `screen ${s.id}: image alt text and intent required`);
    need(Array.isArray(s.actions) && s.actions.every(a => nonempty(a.id) && nonempty(a.label) && !/^(click here|learn more|read more)$/i.test(a.label)), `screen ${s.id}: standalone action labels required`);
    if (phase === 'handoff') {
      need(Array.isArray(s.states) && (h.languages || []).every(lang => states.every(state => s.states.some(v => v.state === state && v.lang === lang.lang && v.dir === lang.dir))), `screen ${s.id}: seven screen states required in every language/direction`);
      need(s.states?.find(st => st.state === 'default')?.applicable !== false, `screen ${s.id}: default state must be applicable`);
      for (const st of s.states || []) {
        need((h.languages || []).some(lang => st.lang === lang.lang && st.dir === lang.dir), `screen ${s.id}/${st.state}: undeclared language/direction`);
        if (st.applicable === false) need(nonempty(st.reason) && nonempty(st.reviewer) && file(st.evidence), `screen ${s.id}/${st.state}: N/A needs reason, reviewer, evidence`);
        else need(file(st.page) && st.frame?.width === 1440 && nonempty(st.frame.version) && file(st.frame.path) && /^[a-f0-9]{64}$/.test(st.frame.sha256 || '') && (file(st.frame?.path) ? sha(st.frame.path) === st.frame.sha256 && pngWidth(st.frame.path) === 1440 : false), `screen ${s.id}/${st.state}: page and hash-checked 1440px PNG required`);
      }
      const applicableHashes = (s.states || []).filter(st => st.applicable !== false).map(st => st.frame?.sha256);
      need(applicableHashes.length === new Set(applicableHashes).size, `screen ${s.id}: applicable states cannot reuse the same frame`);
      need(new Set((s.states || []).map(st => `${st.lang}/${st.state}`)).size === s.states.length, `screen ${s.id}: duplicate language/state`);
      const completeComponents = Array.isArray(s.components) && s.components.length > 0 && s.components.every(c => nonempty(c.id) && (h.languages || []).every(lang => states.every(v => c.states?.some(st => st.state === v && st.lang === lang.lang && st.dir === lang.dir && (st.applicable !== false || (nonempty(st.reason) && nonempty(st.reviewer) && file(st.evidence)))))));
      need(completeComponents, `screen ${s.id}: components need seven accounted states`);
      need(s.components?.every(c => (h.languages || []).every(lang => c.states?.some(st => st.state === 'default' && st.lang === lang.lang && st.applicable !== false))), `screen ${s.id}: component default states must be applicable`);
      need(Array.isArray(s.acceptance) && s.acceptance.length > 0 && new Set(s.acceptance.map(a => a.id)).size === s.acceptance.length && s.acceptance.every(a => nonempty(a.id) && ['BLOCK', 'WARN'].includes(a.severity) && ['PASS', 'FAIL'].includes(a.decision) && (a.severity !== 'BLOCK' || a.decision === 'PASS') && (a.decision !== 'FAIL' || (a.disposition?.decision === 'accepted' && a.disposition.approver === h.settings?.roles?.approver && file(a.disposition.record))) && nonempty(a.check) && file(a.evidence)), `screen ${s.id}: acceptance checks/evidence, passing BLOCK items and disposition for WARN FAIL required`);
      need(s.wcag?.standard === '2.2 AA' && file(s.wcag.contrastEvidence) && file(s.wcag.focusOrderEvidence) && file(s.wcag.targetSizeEvidence), `screen ${s.id}: WCAG 2.2 AA contrast/focus/target evidence required`);
    }
  }
  need(Array.isArray(h.languages) && h.languages.length > 0 && h.languages.every(l => nonempty(l.lang) && ['ltr', 'rtl'].includes(l.dir)), 'languages/directions required');
  const manual = h?.manualChecks || [];
  need(new Set(manual.map(m => `${m.screen}/${m.lang}/${m.state}/${m.id}`)).size === manual.length, 'manual check IDs must be unique per screen/language/state');
  const ids = new Set(manual.filter(m => m.decision === 'PASS' && nonempty(m.reviewer) && file(m.artifact) && nonempty(m.note) && m.briefRefs?.length > 0 && m.briefRefs.every(ref)).map(m => `${m.screen}/${m.lang}/${m.state}/${m.id}`));
  const deferred = new Set(manual.filter(m => m.decision === 'DEFERRED' && nonempty(m.reviewer) && file(m.artifact) && nonempty(m.note)).map(m => `${m.screen}/${m.lang}/${m.state}/${m.id}`));
  need(manual.every(m => m.decision === 'PASS' || (phase === 'wireframe' && m.decision === 'DEFERRED' && ['accent-area', 'palette'].includes(m.id))), 'manual FAIL or unjustified DEFERRED blocks');
  for (const s of h?.screens || []) for (const st of (phase === 'handoff' ? s.states || [] : [{ state: 'wireframe', lang: h.languages?.[0]?.lang }])) {
    if (st.applicable === false) continue;
    for (const id of manualIds) {
      const key = `${s.id}/${st.lang}/${st.state}/${id}`;
      need(phase === 'wireframe' && ['accent-area', 'palette'].includes(id) ? deferred.has(key) : ids.has(key), `manual ${key}: required phase decision with reviewer/artifact/brief refs`);
    }
  }
  if (phase === 'handoff') {
    need(h.designLink?.private === true && /^https:\/\//.test(h.designLink?.url || '') && file(h.designLink.evidence), 'private design link with evidence required');
    const trusted = { buildScript: fileURLToPath(new URL('./sd-build.mjs', import.meta.url)), config: fileURLToPath(new URL('../runtime/sd.config.mjs', import.meta.url)), lock: fileURLToPath(new URL('../runtime/package-lock.json', import.meta.url)) };
    for (const name of ['json', 'css', 'buildScript', 'config', 'lock']) {
      const a = h.tokens?.[name];
      need(file(a?.path) && /^[a-f0-9]{64}$/.test(a?.sha256 || '') && (file(a?.path) ? sha(a.path) === a.sha256 : false), `tokens.${name} path and matching SHA-256 required`);
      if (trusted[name]) need(resolve(a?.path || '') === resolve(trusted[name]), `tokens.${name} must use reviewed release artifact`);
    }
    need(h.tokens?.json?.path?.endsWith('.json') && h.tokens?.css?.path?.endsWith('.css') && resolve(h.tokens.json.path) !== resolve(h.tokens.css.path), 'tokens need distinct JSON and CSS files');
    let build = null; try { if (file(h.tokens?.buildEvidence?.path)) build = JSON.parse(readFileSync(resolve(h.tokens.buildEvidence.path), 'utf8')); } catch {}
    need(file(h.tokens?.buildEvidence?.path) && build?.styleDictionaryVersion === '5.6.1' && build.inputSha256 === h.tokens.json.sha256 && build.outputSha256 === h.tokens.css.sha256 && build.scriptSha256 === h.tokens.buildScript.sha256 && build.configSha256 === h.tokens.config.sha256 && build.lockSha256 === h.tokens.lock.sha256, 'Style Dictionary build evidence must match reviewed artifacts and output hashes');
    try { need(typeof JSON.parse(readFileSync(resolve(h.tokens.json.path), 'utf8')) === 'object' && /:root\s*\{/.test(readFileSync(resolve(h.tokens.css.path), 'utf8')) && /--[a-z0-9-]+\s*:/.test(readFileSync(resolve(h.tokens.css.path), 'utf8')), 'tokens must contain JSON object and CSS variables'); } catch { need(false, 'tokens JSON/CSS cannot be parsed'); }
    need(Array.isArray(h.toolEvidence) && h.toolEvidence.length > 0 && h.toolEvidence.every(t => nonempty(t.tool) && file(t.artifact) && nonempty(t.version)), 'tool evidence/artifacts required');
    need(Array.isArray(h.assets) && h.assets.every(a => file(a.path) && nonempty(a.source) && nonempty(a.license) && file(a.consentRecord)), 'assets need file, source, licence and consent record');
    need(Array.isArray(h.motion) && h.motion.every(m => nonempty(m.id) && Number.isFinite(m.duration) && nonempty(m.easing) && nonempty(m.trigger) && nonempty(m.reducedMotion)), 'motion needs duration/easing/trigger/reduced-motion');
    need(Array.isArray(h.critic?.rounds) && h.critic.rounds.length > 0 && h.critic.rounds.length <= 3 && h.critic.rounds.every(r => ['PASS', 'FAIL'].includes(r.decision) && nonempty(r.reviewer) && file(r.evidence) && Array.isArray(r.copyChecks) && r.copyChecks.length > 0 && r.copyChecks.every(c => ['PASS', 'FAIL'].includes(c.decision) && file(c.evidence)) && Array.isArray(r.designChecks) && r.designChecks.length > 0 && r.designChecks.every(c => ['PASS', 'FAIL'].includes(c.decision) && file(c.evidence))) && h.critic.rounds.at(-1).decision === 'PASS' && h.critic.rounds.at(-1).copyChecks.every(c => c.decision === 'PASS') && h.critic.rounds.at(-1).designChecks.every(c => c.decision === 'PASS') && file(h.critic.referenceWork), 'critic needs 1-3 evidenced rounds, all final copy/design checks PASS');
    const frameIds = (h.screens || []).flatMap(s => (s.states || []).filter(st => st.applicable !== false).map(st => `${s.id}/${st.lang}/${st.state}/${st.frame?.version}/${st.frame?.sha256}`));
    const approvalText = file(h.approval?.record) ? readFileSync(resolve(h.approval.record), 'utf8') : '';
    need(h.approval?.decision === 'approved' && h.approval.approver === h.settings?.roles?.approver && file(h.approval.record) && /\b20\d\d-\d\d-\d\d\b/.test(approvalText) && approvalText.includes(h.approval.approver) && Array.isArray(h.approval.frameIds) && frameIds.every(id => h.approval.frameIds.includes(id) && approvalText.includes(id)), 'dated approval record must name approver and every versioned frame hash');
    need(Array.isArray(h.openQuestions) && h.openQuestions.length === 0, 'open questions block handoff');
  }
  return errors;
}
