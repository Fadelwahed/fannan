import { resolveScoped } from './exceptions.mjs';
// width-screen.mjs: R8, ported from codex/fannan-r3-review 2733317 (release/tools/browser-probes.mjs screenWidths/inspectLayout).
// Screening only: renders the page at every declared desktop width plus 320 CSS px (desktop 400% reflow equivalent) and
// flags horizontal overflow, clipped or ellipsised text, and a language/direction mismatch. Actual zoom, text spacing,
// WCAG reflow exceptions and layout quality still need manual evidence. 320 px is not a mobile design approval.
export const REFLOW_WIDTH = 320;

// R11 (Asad panel S3, panel D1 decision B): WCAG 1.4.10 excuses only the smallest region whose usage or meaning needs a
// two-dimensional layout. At the 320 px reflow width, ordinary text or media that overflows a sideways scroller (left
// or right) fails. A table, pre, code, role=grid/table with real rows, or an element marked data-fannan-2d="<reason>"
// is only a CANDIDATE: it is recorded with its element and reason, never excused automatically. A candidate's
// scroller must fit inside 320 px and be keyboard-usable (tabindex or a focusable child), and an unresolved candidate
// blocks the final handoff (resolveReflowCandidates). Resizable media (img, svg, video, canvas, iframe) is not a
// candidate unless it sits inside a marked data-fannan-2d region. No count caps.
export const TWO_D = 'table, pre, code, [role="grid"], [role="table"], [data-fannan-2d]';

export function inspectLayout({ reflow = false, tag = false, probes = [] } = {}) {
  const TWO_D = 'table, pre, code, [role="grid"], [role="table"], [data-fannan-2d]';
  const MEDIA = 'img, svg, video, audio, canvas, iframe, frame, object, embed, fencedframe, portal, input, select, textarea, button';
  // R22-GPT-03 (Fadel's tiebreak): fallback content inside video, audio, object and canvas is not rendered, so it is not
  // text on screen (the element itself is media, or a nested document for object)
  const FALLBACK = 'video, audio, object, canvas';
  // R22-GPT-04: links and named semantic controls are content in their own right, by their box and accessible name
  // R23-GPT-04 (Fadel's tiebreak): every WAI-ARIA widget role (1.2: button, checkbox, gridcell, link, menuitem,
  // menuitemcheckbox, menuitemradio, option, progressbar, radio, scrollbar, searchbox, separator when focusable, slider,
  // spinbutton, switch, tab, textbox, treeitem; composite widgets combobox, grid, listbox, menu, menubar, radiogroup,
  // tablist, tree, treegrid) and the native equivalents (links, buttons, inputs, select, textarea, summary, progress,
  // meter). tabpanel is a content container, not a control: its text stays text.
  const WIDGET_ROLES = ['button', 'checkbox', 'gridcell', 'link', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'option', 'progressbar', 'radio', 'scrollbar', 'searchbox', 'slider', 'spinbutton', 'switch', 'tab', 'textbox', 'treeitem', 'combobox', 'grid', 'listbox', 'menu', 'menubar', 'radiogroup', 'tablist', 'tree', 'treegrid'];
  const CONTROLS = ['a[href]', 'area[href]', 'button', 'input:not([type="hidden"])', 'select', 'textarea', 'summary', 'progress', 'meter', '[role="separator"][tabindex]', ...WIDGET_ROLES.map(r => `[role="${r}"]`)].join(', ');
  const NESTED = 'iframe, frame, object, embed, fencedframe, portal';
  const clipped = [], offscreenLeft = [], unreachable = [], scrolledText = [], reflowCandidates = [], unmeasured = [], unscannedScopes = [];
  // ARGON-R5-05: visually hidden (sr-only) content is not a clip: clip: rect(0...) / clip-path inset(50%), or a box of at
  // most 1x1 px. R13 N02: the tiny box counts as sr-only only when it also clips (overflow hidden/clip); text that
  // overflows a zero-size visible box is rendered and measured.
  const srOnly = (r, c) => (r.width <= 1 && r.height <= 1 && (['hidden', 'clip'].includes(c.overflowX) || ['hidden', 'clip'].includes(c.overflowY))) || /^rect\(0(px)?,? 0(px)?,? 0(px)?,? 0(px)?\)$/.test(c.clip) || c.clipPath === 'inset(50%)';
  const focusable = e => e.matches('a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])');
  const label = el => el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '');
  // R12 M11: the composed tree. Open shadow roots are walked (they share the page's coordinates); parents follow slots
  // and shadow hosts. Same-origin frames are measured as documents; a frame that cannot be read is an unscanned scope.
  const parentOf = el => el.assignedSlot ?? el.parentElement ?? (el.getRootNode() instanceof ShadowRoot ? el.getRootNode().host : null);
  const all = [];
  const walk = root => { for (const el of root.querySelectorAll('*')) { all.push(el); if (el.shadowRoot) walk(el.shadowRoot); } };
  if (document.body) { all.push(document.body); walk(document.body); }
  const within = (s, d) => { for (let a = d; a; a = parentOf(a)) if (a === s) return true; return false; };
  const inFallback = el => { for (let a = el.parentElement; a; a = a.parentElement) if (a.matches(FALLBACK)) return true; return false; };
  const ownText = el => !inFallback(el) && [...el.childNodes].some(n => n.nodeType === 3 && n.nodeValue.trim());
  const isControl = el => !inFallback(el) && el.matches(CONTROLS);
  // the content itself is measured (text-node ranges, or the media box), so text overflowing its own box counts too
  const textRects = el => [...el.childNodes].filter(n => n.nodeType === 3 && n.nodeValue.trim()).map(n => { const range = document.createRange(); range.selectNodeContents(n); return range.getBoundingClientRect(); }).filter(b => b.width > 0 && b.height > 0);
  // R23-GPT-03: a control is measured by its box AND its own rendered text ranges, so a label cut by the control's box or
  // a wrapper is a text cut, never a media crop
  // R24-GPT-01 (Mi'mar's tiebreak): controls are checked before the media branch (button, input, select and textarea are
  // also in MEDIA), so a control's label text is always measured, whatever its border
  const contentRects = el => isControl(el) ? [...(el.getBoundingClientRect().width > 0 ? [el.getBoundingClientRect()] : []), ...textRects(el)] : el.matches(MEDIA) ? [el.getBoundingClientRect()] : textRects(el);
  // R12 M14, R13 N02: hidden, undisplayed or sr-only content (on the element or a composed ancestor) is never
  // measured. Visibility comes from computed style plus geometry: an element box, or (display:contents, zero-size
  // boxes) its rendered text ranges.
  const srHidden = new Map();
  const inSrOnly = el => { if (!el) return false; if (srHidden.has(el)) return srHidden.get(el); const v = srOnly(el.getBoundingClientRect(), getComputedStyle(el)) || inSrOnly(parentOf(el)); srHidden.set(el, v); return v; };
  // R21-MIMAR-02: what Chrome does not render is not on screen: display:none on any composed ancestor, content-visibility
  // hidden (the content of a closed <details>), an inert closed popover. checkVisibility() covers all of them, as in
  // visibility.mjs; a closed menu's links are not measured at all (its open state is graded only when declared).
  // a display:contents box has no box of its own (checkVisibility is false); its nearest boxed ancestor decides
  const rendered = el => { let a = el; while (a && getComputedStyle(a).display === 'contents') a = parentOf(a); return !a || typeof a.checkVisibility !== 'function' || a.checkVisibility(); };
  // R30-M-04: effective zero opacity (inherited through composed ancestors) is not visible; translucent nonzero stays.
  // R30-M-20: content behind a real active :modal is inactive (same as visibility.mjs); aria-modal alone does not count.
  // R31-M-08/M-09: discover :modal across open shadow roots; pick the topmost via hit-test (not document order)
  let activeModal = null;
  try {
    const modals = [];
    const walkModal = root => {
      let list = []; try { list = [...root.querySelectorAll('dialog')]; } catch { list = []; }
      for (const d of list) { try { if (d.matches(':modal')) modals.push(d); } catch {} }
      for (const el of root.querySelectorAll('*')) if (el.shadowRoot) walkModal(el.shadowRoot);
    };
    if (document.documentElement) walkModal(document);
    const selfHit = [];
    for (const d of modals) {
      const r = d.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) continue;
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      let t = document.elementFromPoint(x, y);
      for (let k = 0; t?.shadowRoot && k < 20; k++) { const n = t.shadowRoot.elementFromPoint(x, y); if (!n || n === t) break; t = n; }
      let inside = false; for (let a = t; a; a = parentOf(a)) if (a === d) { inside = true; break; }
      if (inside) selfHit.push(d);
    }
    activeModal = selfHit.length ? selfHit[selfHit.length - 1] : (modals.length ? modals[modals.length - 1] : null);
  } catch { activeModal = null; }
  const behindModal = el => { if (!activeModal) return false; for (let a = el; a; a = parentOf(a)) { if (a === activeModal) return false; } return true; };
  const effectiveOpaque = el => { let p = 1; for (let a = el; a && a.nodeType === 1; a = parentOf(a)) { p *= Number(getComputedStyle(a).opacity); if (!(p > 0)) return false; } return true; };
  const shown = el => { if (behindModal(el)) return false; const c = getComputedStyle(el); if (c.display === 'none' || c.visibility !== 'visible' || inSrOnly(el) || !rendered(el) || !effectiveOpaque(el)) return false; const r = el.getBoundingClientRect(); return (r.width > 0 && r.height > 0) || textRects(el).length > 0; };
  const isContent = el => (el.matches(MEDIA) && !inFallback(el)) || ownText(el) || isControl(el);
  // R13 N03: composed content detection: an element holds content when it or any composed descendant (open shadow
  // trees included) is shown text or media, so a shadow-only host is screened too.
  const holds = new Set();
  for (const d of all) if (isContent(d) && shown(d)) for (let a = d; a && !holds.has(a); a = parentOf(a)) holds.add(a);
  // R13 N01: body's overflow propagates to the viewport when html's is visible; body is then not a scroll or clip box
  // (the viewport is), so content pushed left of it is offscreenLeft.
  const rootStyle = getComputedStyle(document.documentElement);
  const rtlRoot = rootStyle.direction === 'rtl';
  const bodyPropagates = rootStyle.overflowX === 'visible' && rootStyle.overflowY === 'visible';
  const clipBox = a => a !== document.documentElement && !(a === document.body && bodyPropagates);
  const overflowX = el => getComputedStyle(el).overflowX;
  const scrollerOf = el => { for (let a = parentOf(el); a && a !== document.documentElement; a = parentOf(a)) if (clipBox(a) && overflowX(a) !== 'visible') return a; return null; };
  // R12 M02: the horizontal range a scroller can show. scrollLeft runs 0..max (LTR) or -max..0 (RTL); hidden/clip boxes
  // show only their inner box. Content outside this range is lost on either edge, whatever scrollWidth says.
  const reach = s => {
    const b = s.getBoundingClientRect(), left = b.left + s.clientLeft, right = left + s.clientWidth;
    if (!['auto', 'scroll'].includes(overflowX(s))) return { left, right, inner: { left, right } };
    const max = Math.max(0, s.scrollWidth - s.clientWidth), rtl = getComputedStyle(s).direction === 'rtl';
    const min = rtl ? -max : 0, top = rtl ? 0 : max, cur = s.scrollLeft;
    return { left: left + min - cur, right: right + top - cur, inner: { left, right } };
  };
  const beyond = (e, r) => all.some(d => d !== e && holds.has(d) && within(e, d) && [...(shown(d) && d.getBoundingClientRect().width > 0 ? [d.getBoundingClientRect()] : []), ...contentRects(d)].some(b => b.right > r.right + 1 || b.left < r.left - 1)); // R13 N03: composed ancestry and content
  // R20 (Mi'mar's clipping tiebreak): no CSS-pattern exemptions. Each hidden/clip box reports the content it cuts, by
  // composed path: `whole` (every rect of the element outside the box) and `partial` (a rect straddles the edge, or the
  // element is cut while partly shown). The decision is made per state and width in screenWidths and across the
  // declared states in resolveReveals: content shown at 1440 must stay shown (or reachable) at every width; content cut
  // wholly at 1440 counts as not displayed only when another declared state shows it; partial cuts always fail.
  // R21-MIMAR-01 (Fadel's tiebreak): rules (1)-(3) apply to text and controls only. Cropped media (img, svg, video,
  // canvas, picture, decoration without text or controls, background images) is never clipped content; text or a
  // control inside a cropped media wrapper is still checked. Nested documents (iframe, object, embed) stay content.
  // R21-GPT-03/04: content is matched across widths and states by its print (normalised text, or a control's
  // accessible name), never by position.
  // R22-GPT-05: prints are typed: `text:<normalised text>` for text, `<role>:<accessible name>` for a control (aria-labelledby,
  // aria-label, labels, rendered content with image alt text, title, placeholder, value), `frame:<title>` for a nested
  // document. Text matches only text, so a heading cannot stand in for a lost button. Text inside a control is part of
  // the control (its print is the control's), so a control's shortened label is graded by its name (R22-MIMAR-02).
  const controlOf = d => { for (let a = d; a; a = parentOf(a)) if (isControl(a)) return a; return null; };
  // an image or other media inside a link is still media (a pure image crop inside an available link stays exempt)
  const kindOf = d => d.matches(FALLBACK) && !d.matches(NESTED) ? 'media' : isControl(d) ? 'control' : d.matches(NESTED) ? 'frame' : ownText(d) ? (controlOf(d) ? 'control' : 'text') : d.matches(MEDIA) ? 'media' : 'text';
  const norm = t => String(t || '').replace(/\s+/g, ' ').trim();
  const roleOf = d => { const r = (d.getAttribute('role') || '').trim().split(/\s+/)[0]; if (r) return r; const t = d.tagName.toLowerCase(), type = (d.getAttribute('type') || '').toLowerCase(); return t === 'a' || t === 'area' ? 'link' : t === 'button' || t === 'summary' ? 'button' : t === 'select' ? (d.multiple || d.size > 1 ? 'listbox' : 'combobox') : t === 'textarea' ? 'textbox' : t === 'progress' ? 'progressbar' : t === 'meter' ? 'meter' : t === 'input' ? (['checkbox', 'radio'].includes(type) ? type : ['submit', 'button', 'reset', 'image'].includes(type) ? 'button' : type === 'range' ? 'slider' : type === 'number' ? 'spinbutton' : type === 'search' ? 'searchbox' : 'textbox') : t; };
  // rendered content (display:none, hidden and aria-hidden parts excluded), with image alt and inner aria-label text
  const contentName = el => [...el.childNodes].map(n => { if (n.nodeType === 3) return n.nodeValue; if (n.nodeType !== 1 || n.getAttribute('aria-hidden') === 'true' || !rendered(n) || getComputedStyle(n).display === 'none') return ''; if (n.getAttribute('aria-label')) return ' ' + n.getAttribute('aria-label') + ' '; if (n.matches('img, area, input[type="image"]')) return ' ' + (n.getAttribute('alt') || '') + ' '; if (n.matches('svg')) return ' ' + (n.querySelector('title')?.textContent || '') + ' '; return ' ' + contentName(n) + ' '; }).join('');
  const nameOf = d => {
    const by = (d.getAttribute('aria-labelledby') || '').trim().split(/\s+/).filter(Boolean).map(id => d.getRootNode().getElementById?.(id) || document.getElementById(id)).filter(Boolean).map(e => e.textContent).join(' ');
    const byContent = !d.matches('input, select, textarea') ? contentName(d) : '';
    return norm(by || d.getAttribute('aria-label') || (d.labels && d.labels[0] ? [...d.labels].map(l => l.textContent).join(' ') : '') || byContent || d.getAttribute('title') || d.getAttribute('placeholder') || (d.matches('input') && ['submit', 'button', 'reset'].includes(d.type) ? d.value : '') || (d.matches('input[type="image"]') ? d.getAttribute('alt') : '') || '');
  };
  const printOf = d => { const k = kindOf(d); if (k === 'control') { const c = controlOf(d); return `${roleOf(c)}:${nameOf(c)}`.slice(0, 200); } const t = k === 'frame' ? norm(d.getAttribute('title') || d.getAttribute('src') || d.tagName) : norm([...d.childNodes].filter(n => n.nodeType === 3).map(n => n.nodeValue).join(' ')); return `${k}:${t || d.tagName.toLowerCase()}`.slice(0, 200); };
  const pathOf = el => { const parts = []; for (let a = el; a && a !== document.documentElement; ) { const p = parentOf(a), list = [...(a.parentElement ? a.parentElement.children : (a.getRootNode().children || []))]; parts.unshift(`${a.tagName.toLowerCase()}:${list.indexOf(a)}${a.parentElement ? '' : '#shadow'}`); a = p; } return parts.join('/'); };
  // R28 (Mi'mar's decision A): within one state identity is the DOM node itself. The first screen of a loaded page (1440)
  // tags every element with a session index (data-fannan-ws, never an author id); at the other widths of the same page an
  // item is its tag, and a node created after 1440 is new. Identities are never compared across state pages.
  const TAG = 'data-fannan-ws';
  if (tag) { let n = 0; for (const el of all) el.setAttribute(TAG, String(n++)); }
  const idOf = el => el.hasAttribute(TAG) ? `n${el.getAttribute(TAG)}` : `new:${pathOf(el)}`;
  const contentEls = all.filter(d => isContent(d) && shown(d));
  const cutOf = (e, r) => {
    const left = r.left + e.clientLeft, top = r.top + e.clientTop, right = left + e.clientWidth, bottom = top + e.clientHeight;
    const outside = b => b.right <= left + 1 || b.left >= right - 1 || b.bottom <= top + 1 || b.top >= bottom - 1;
    const inside = b => b.left >= left - 1 && b.right <= right + 1 && b.top >= top - 1 && b.bottom <= bottom + 1;
    const whole = [], partial = [];
    for (const d of contentEls) {
      if (!(d === e || within(e, d))) continue;
      if (kindOf(d) === 'media') continue; // R21-MIMAR-01: a media crop is not a content cut
      const rects = contentRects(d).filter(b => b.width > 0 && b.height > 0);
      if (!rects.length || rects.every(inside)) continue;
      const item = { path: pathOf(d), owner: kindOf(d) === 'control' ? pathOf(controlOf(d) || d) : null, id: idOf(kindOf(d) === 'control' ? controlOf(d) || d : d), tag: d.tagName, kind: kindOf(d), print: printOf(d), text: (d.matches(MEDIA) ? d.getAttribute('alt') || d.getAttribute('aria-label') || d.value || d.tagName : [...d.childNodes].filter(n => n.nodeType === 3).map(n => n.nodeValue).join(' ')).replace(/\s+/g, ' ').trim().slice(0, 60) };
      (rects.every(outside) ? whole : partial).push(item);
    }
    return { whole, partial };
  };
  const boxSig = e => [e.tagName, e.getAttribute('role') || '', norm(e.getAttribute('aria-label') || ''), e.getAttribute('aria-roledescription') || '', e.getAttribute('data-copy-slot') || ''].join('|');
  const cutPaths = new Set(), offPaths = new Set(), mediaCrops = []; // offPaths: off-screen or unreachable content is not shown
  // ARGON-R5-02: body is screened too, so html + body overflow hidden/clip cannot hide a wide layout.
  for (const e of all) {
    const c = getComputedStyle(e), r = e.getBoundingClientRect();
    if (!holds.has(e)) continue; // R13 N02/N03: shown, and holds shown text or media (composed)
    // overflow: clip makes no scroll container, so scrollWidth stays at clientWidth; measure what the box cuts off instead.
    // R12 M02: hidden boxes are measured the same way, so content pushed past their LEFT edge is a clip too.
    const x = (e.scrollWidth > e.clientWidth + 1 && ['hidden', 'clip'].includes(c.overflowX)) || (clipBox(e) && ['hidden', 'clip'].includes(c.overflowX) && beyond(e, r));
    const y = e.scrollHeight > e.clientHeight + 1 && ['hidden', 'clip'].includes(c.overflowY);
    // CODEX-R4-04: ellipsis styling alone is not a clip; only text that actually overflows a hidden/clip box is recorded.
    // R21-MIMAR-01: a box whose cut set is empty, or holds only media and decoration, cuts no content and is not a clip.
    // Read-more tiebreak: an intentional truncation (text-overflow: ellipsis on the cut edge, or line-clamp) is marked so
    // it passes only when a declared state shows the full text.
    if ((x || y)) { const cut = cutOf(e, r); for (const it of [...cut.whole, ...cut.partial]) cutPaths.add(it.path); if (cut.whole.length || cut.partial.length) clipped.push({ tag: e.tagName, sig: boxSig(e), boxPath: pathOf(e), slot: e.getAttribute('data-copy-slot'), x, y, ellipsis: x && c.textOverflow === 'ellipsis', truncation: (x && c.textOverflow === 'ellipsis') || (y && !!c.webkitLineClamp && c.webkitLineClamp !== 'none'), collapsed: e.clientWidth === 0 || e.clientHeight === 0, whole: cut.whole, partial: cut.partial }); else mediaCrops.push({ tag: e.tagName, slot: e.getAttribute('data-copy-slot') }); }
    const s = scrollerOf(e);
    // ARGON-R5-05: text or media pushed past the left edge of the page is lost (no scrollbar reaches it). Exempt: the
    // off-screen skip-link pattern (a focusable absolute/fixed element wholly left of the viewport that appears on
    // focus; the focus probe checks it is visible when focused). Inside a scroller, R12 M02 measures its range instead.
    const left = Math.min(r.width > 0 ? r.left : Infinity, ...contentRects(e).map(b => b.left)); // R13 N02: zero-size boxes by their text
    if (!s && left < -1 && e !== document.body && !(focusable(e) && ['absolute', 'fixed'].includes(c.position) && r.right <= 0)) { offPaths.add(pathOf(e)); offscreenLeft.push({ tag: e.tagName, slot: e.getAttribute('data-copy-slot'), left: Math.round(left) }); }
    // R21 (found with R21-MIMAR-02): in a right-to-left page the viewport cannot scroll past its RIGHT (start) edge either,
    // so content pushed past it is lost the same way (recorded in offscreenLeft with side 'right'); same skip-link exemption.
    const right = Math.max(r.width > 0 ? r.right : -Infinity, ...contentRects(e).map(b => b.right)), vw = document.documentElement.clientWidth;
    if (!s && rtlRoot && right > vw + 1 && e !== document.body && !(focusable(e) && ['absolute', 'fixed'].includes(c.position) && r.left >= vw)) { offPaths.add(pathOf(e)); offscreenLeft.push({ tag: e.tagName, slot: e.getAttribute('data-copy-slot'), side: 'right', right: Math.round(right) }); }
    if (s && ['auto', 'scroll'].includes(overflowX(s)) && (isContent(e) || ['auto', 'scroll'].includes(c.overflowX))) {
      const range = reach(s), rects = isContent(e) ? contentRects(e) : [r];
      const side = rects.some(b => b.left < range.left - 1) ? 'left' : rects.some(b => b.right > range.right + 1) ? 'right' : null;
      if (side && !(focusable(e) && ['absolute', 'fixed'].includes(c.position))) { offPaths.add(pathOf(e)); unreachable.push({ tag: e.tagName, slot: e.getAttribute('data-copy-slot'), side, scroller: label(s) }); }
    }
    // R12 M11: a same-origin frame whose document scrolls sideways is screened at 320 px; an unreadable frame is unscanned.
    // R13 N04: every element that can hold a nested document (object, embed, fencedframe, portal too).
    if (e.matches(NESTED)) { let doc = null; try { doc = e.contentDocument; } catch {} if (!doc?.documentElement) unscannedScopes.push({ tag: e.tagName, src: e.getAttribute('src') || (e.hasAttribute('srcdoc') ? 'srcdoc' : '') }); else if (reflow && doc.documentElement.scrollWidth > doc.documentElement.clientWidth + 1) scrolledText.push({ tag: e.tagName, slot: e.getAttribute('data-copy-slot'), sample: 'frame document scrolls sideways' }); }
  }
  if (reflow) {
    const candidateOf = (d, scroller) => { for (let t = d.closest(TWO_D); t; t = t.parentElement?.closest(TWO_D)) { if (t !== scroller && !scroller.contains(t)) return null; if (!t.matches('[role="grid"], [role="table"]') || t.querySelector('[role="row"]') || t.matches('[data-fannan-2d]')) return t; } return null; };
    const usable = el => shown(el) && !el.disabled && !el.closest('[inert]') && el.tabIndex >= 0;
    for (const e of all) {
      const c = getComputedStyle(e);
      if (!['auto', 'scroll'].includes(c.overflowX) || !holds.has(e)) continue; // R13 N02: a zero-size scroller holding shown text is screened
      const box = reach(e).inner;
      // R12 M01: the scroller's own text counts (bare text in a nowrap box, a directly scrollable pre), and so does
      // content in its open shadow tree; nothing is skipped because scrollWidth did not grow.
      const inside = all.filter(d => within(e, d) && shown(d) && isContent(d));
      const over = inside.filter(d => contentRects(d).some(b => b.right > box.right + 1 || b.left < box.left - 1));
      if (!over.length) {
        // fail closed: the box scrolls and visible elements stick out, but no text or media was measured there
        if (e.scrollWidth > e.clientWidth + 1 && all.some(d => d !== e && within(e, d) && shown(d) && (d.getBoundingClientRect().right > box.right + 1 || d.getBoundingClientRect().left < box.left - 1) && holds.has(d))) unmeasured.push({ tag: e.tagName, slot: e.getAttribute('data-copy-slot'), scroller: label(e) });
        continue; // otherwise only padding or empty boxes overflow
      }
      const plain = over.filter(d => !candidateOf(d, e));
      if (plain.length) { scrolledText.push({ tag: e.tagName, slot: e.getAttribute('data-copy-slot'), sample: ((ownText(plain[0]) ? [...plain[0].childNodes].filter(n => n.nodeType === 3).map(n => n.nodeValue).join('') : plain[0].tagName) || '').trim().slice(0, 60) }); continue; }
      // R12 M10: keyboard use is the scroller itself in the tab order, or usable (shown, enabled, not inert) targets
      // spaced so that tabbing through them scrolls across the whole overflowing extent. R13 N15: focusing a target
      // scrolls it just into view, so the first and last targets must reach the content edges (1 px) and each next
      // target must end within one box width of the previous one's end.
      const extent = inside.flatMap(contentRects).reduce((x, b) => ({ left: Math.min(x.left, b.left), right: Math.max(x.right, b.right) }), { left: Infinity, right: -Infinity });
      const targets = all.filter(d => d !== e && within(e, d) && focusable(d) && usable(d)).map(d => d.getBoundingClientRect()).sort((p, q) => p.left - q.left);
      const span = box.right - box.left;
      const stepped = targets.length > 0 && targets[0].left <= extent.left + 1 && targets.every((t, i) => i === 0 || t.right - targets[i - 1].right <= span) && Math.max(...targets.map(t => t.right)) >= extent.right - 1;
      const keyboard = (e.hasAttribute('tabindex') && e.tabIndex >= 0 && !e.closest('[inert]')) || stepped;
      for (const t of new Set(over.map(d => candidateOf(d, e)))) {
        const marked = t.closest('[data-fannan-2d]');
        const reason = marked ? (marked.getAttribute('data-fannan-2d') || '').trim() || null : (t.getAttribute('role') || t.tagName.toLowerCase());
        const outer = e.getBoundingClientRect();
        reflowCandidates.push({ element: label(t), id: t.id || null, reason, scroller: label(e), fits: outer.left >= -1 && outer.right <= innerWidth + 1, keyboard });
      }
    }
  }
  // R14-GPT-04: the viewport takes html's overflow (or body's, when html's is visible). A viewport that cannot scroll
  // vertically (hidden/clip) loses every shown text or media box below its bottom edge unless a real inner scroller
  // (not html, and not a propagated body) holds it. html's own fixed-height hidden box is the same case.
  const viewportY = rootStyle.overflowY !== 'visible' ? rootStyle.overflowY : bodyPropagates && document.body ? getComputedStyle(document.body).overflowY : 'visible';
  if (['hidden', 'clip'].includes(viewportY)) {
    // R15 A1 (R15-GPT-01): an ancestor with overflow-y auto/scroll holds the box only when that scroller's scrollport
    // lies inside the visible viewport (its bottom at or above innerHeight and above every clipping ancestor's bottom)
    // and its scroll range reaches the box. An unbounded auto-height wrapper (an app shell missing its height) grows
    // past the fold, cannot scroll, and holds nothing.
    const visibleBottom = a => { let limit = innerHeight; for (let c = parentOf(a); c && c !== document.documentElement; c = parentOf(c)) if (clipBox(c) && getComputedStyle(c).overflowY !== 'visible') limit = Math.min(limit, c.getBoundingClientRect().bottom); return limit; };
    const innerScroller = el => {
      const lowest = Math.max(...contentRects(el).map(b => b.bottom));
      for (let a = parentOf(el); a && a !== document.documentElement; a = parentOf(a)) {
        if (!clipBox(a) || !['auto', 'scroll'].includes(getComputedStyle(a).overflowY)) continue;
        const port = a.getBoundingClientRect();
        if (port.bottom > visibleBottom(a) + 1) continue; // scrollport extends past the fold: its lower part is unreachable
        if (lowest - port.top + a.scrollTop <= a.scrollHeight + 1) return true;
      }
      return false;
    };
    for (const e of all) {
      if (!isContent(e) || !shown(e) || getComputedStyle(e).position === 'fixed' || innerScroller(e)) continue;
      const below = contentRects(e).filter(b => b.bottom > innerHeight + 1);
      if (below.length) clipped.push({ tag: e.tagName, slot: e.getAttribute('data-copy-slot'), x: false, y: true, viewport: true, top: Math.round(Math.min(...below.map(b => b.top))) });
    }
  }
  const root = document.documentElement, body = document.body;
  const documentWidth = Math.max(root.scrollWidth, body ? body.scrollWidth : 0);
  // R23-GPT-02: a control's print is listed once per control element (one-to-one matching); a text print once
  const shownEls = contentEls.filter(d => kindOf(d) !== 'media' && !cutPaths.has(pathOf(d)) && !offPaths.has(pathOf(d)));
  const seenControl = new Set(), seenText = new Set(), shownPrints = [];
  for (const d of shownEls) { const c = kindOf(d) === 'control' ? controlOf(d) : null, p = printOf(d); if (c) { if (!seenControl.has(c)) { seenControl.add(c); shownPrints.push(p); } } else if (!seenText.has(p)) { seenText.add(p); shownPrints.push(p); } }
  // R24-GPT-03 (Mi'mar's tiebreak, a closed list): composite containers (tablist, menubar, menu) with the prints of their
  // own items (tab, menuitem family), and the names of shown disclosure buttons (summary, or a button with aria-expanded)
  const ITEM = { tab: 'tablist', menuitem: 'menu', menuitemcheckbox: 'menu', menuitemradio: 'menu' }, groups = new Map();
  for (const i of seenControl) {
    const want = ITEM[roleOf(i)]; if (!want) continue;
    let g = null; for (let a = parentOf(i); a; a = parentOf(a)) { if (a.nodeType !== 1) continue; const ar = roleOf(a); if (['tablist', 'menubar', 'menu'].includes(ar)) { g = (want === 'tablist') === (ar === 'tablist') ? a : null; break; } }
    if (!g) continue; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(`${roleOf(i)}:${nameOf(i)}`);
  }
  const composites = [...groups].map(([g, items]) => ({ print: `${roleOf(g)}:${nameOf(g)}`, role: roleOf(g), items }));
  // R25-GPT-04: the accessible names of shown headings (h1-h6, role=heading), for tabs adapted into headed sections
  const headings = all.filter(h => h.matches('h1, h2, h3, h4, h5, h6, [role="heading"]') && shownEls.some(d => d === h || within(h, d))).map(h => nameOf(h));
  const disclosures = [...seenControl].filter(c => c.matches('summary') || (roleOf(c) === 'button' && c.hasAttribute('aria-expanded'))).map(c => nameOf(c));
  // R28: the ledger of this rendering: every shown control (once, by its owning control element) and every shown text
  // element, by node identity (idOf), with its print. Tab panels are tied to their tablist (aria-controls / aria-labelledby).
  const FAM = ['button', 'link', 'menuitem', 'menuitemcheckbox', 'menuitemradio'];
  const HEAD = 'h1, h2, h3, h4, h5, h6, [role="heading"]';
  const panelEls = all.filter(e => e.getAttribute('role') === 'tabpanel');
  const tablistOfPanel = pnl => { const ids = [pnl.id, ...(pnl.getAttribute('aria-labelledby') || '').split(/\s+/)].filter(Boolean); for (const t of all.filter(e => roleOf(e) === 'tablist')) { if ([...t.querySelectorAll('[role="tab"]')].some(tab => (pnl.id && (tab.getAttribute('aria-controls') || '').split(/\s+/).includes(pnl.id)) || (tab.id && ids.includes(tab.id)))) return t; } const k = all.indexOf(pnl); return all.filter((e, j) => j < k && roleOf(e) === 'tablist' && pnl.parentElement && within(pnl.parentElement, e)).at(-1) || null; }; // else the nearest tablist before it (R28-MIMAR-01)
  const panelTablist = new Map(panelEls.map(pnl => [pnl, tablistOfPanel(pnl)]));
  const panelOf = el => { for (let a = el; a; a = parentOf(a)) if (a.nodeType === 1 && panelTablist.has(a)) return a; return null; };
  const ledgerItems = [], itemOfEl = new Map();
  for (const d of shownEls) { const c = kindOf(d) === 'control' ? controlOf(d) : null, el = c || d; if (itemOfEl.has(el)) continue; const pnl = panelOf(el), tl = pnl && panelTablist.get(pnl); const it = { id: idOf(el), kind: c ? 'control' : 'text', role: c ? roleOf(c) : null, name: c ? nameOf(c) : null, print: printOf(d), path: pathOf(el), panelTablist: tl ? idOf(tl) : null }; itemOfEl.set(el, it); ledgerItems.push(it); }
  const insideItems = region => [...itemOfEl].filter(([el]) => region.some(g => g === el || within(g, el))).map(([, it]) => it);
  // headings, with their section: what follows up to the next heading of the same or higher rank (R28-GPT-04), and
  // inside the section or article the heading opens
  const levelOf = h => /^H[1-6]$/.test(h.tagName) ? Number(h.tagName[1]) : Number(h.getAttribute('aria-level')) || 2;
  const headingItems = [];
  const headingShown = h => h.matches(HEAD) && shownEls.some(d => d === h || within(h, d));
  all.forEach((h, k) => { if (!headingShown(h)) return; const L = levelOf(h), members = [], bound = h.closest('article, section, main, aside'); for (let j = k + 1; j < all.length; j++) { if (headingShown(all[j]) && levelOf(all[j]) <= L) break; if (itemOfEl.has(all[j]) && (!bound || within(bound, all[j]))) members.push(itemOfEl.get(all[j]).id); } const pnl = panelOf(h), tl = pnl && panelTablist.get(pnl); headingItems.push({ id: idOf(h), name: nameOf(h), level: L, members, panelTablist: tl ? idOf(tl) : null }); });
  const disclosureItems = [...seenControl].filter(c => c.matches('summary') || (roleOf(c) === 'button' && c.hasAttribute('aria-expanded'))).map(c => ({ id: idOf(c), name: nameOf(c) }));
  const compositeItems = [...groups].map(([g, items]) => ({ id: idOf(g), role: roleOf(g), name: nameOf(g), items: [...seenControl].filter(i => ITEM[roleOf(i)] && items.includes(`${roleOf(i)}:${nameOf(i)}`) && within(g, i)).map(i => ({ id: idOf(i), role: roleOf(i), name: nameOf(i), selected: i.getAttribute('aria-selected') === 'true' })) }));
  // R29 (Mi'mar's decision): reveals are declared, not inferred. Each probe is a declared state's `opener` and `reveals`
  // selectors, checked in this rendering: how many elements each matches, whether the opener is visible and operable
  // (a hit test at its centre), whether it shows it is open (aria-expanded=true, an open details, :popover-open, or a
  // selected, pressed or current control) and what the region shows. Opener names are never compared.
  // R30-M-15: resolve declaration selectors across the document and open shadow roots (closed roots stay unscanned)
  const queryAllDeep = sel => {
    const out = [], seen = new Set();
    const add = el => { if (el && !seen.has(el)) { seen.add(el); out.push(el); } };
    const walk = root => { let list = []; try { list = [...root.querySelectorAll(sel)]; } catch { return; } for (const el of list) add(el); for (const el of root.querySelectorAll('*')) if (el.shadowRoot) walk(el.shadowRoot); };
    try { for (const el of document.querySelectorAll(sel)) add(el); } catch { return null; }
    if (document.body) walk(document.body);
    else if (document.documentElement) walk(document.documentElement);
    return out;
  };
  const declared = (probes || []).map(pr => {
    let openersFound = [], regions = [];
    try {
      openersFound = queryAllDeep(pr.opener); regions = queryAllDeep(pr.reveals);
      if (openersFound === null || regions === null) return { state: pr.state, error: 'invalid selector' };
    } catch { return { state: pr.state, error: 'invalid selector' }; }
    const isPopoverOpen = el => { try { return el.matches(':popover-open'); } catch { return false; } };
    // R30-M-01: native dialog[open] or :modal; aria-modal alone must not prove open
    const isDialogOpen = el => { if (!el || el.tagName !== 'DIALOG') return false; if (el.open) return true; try { return el.matches(':modal'); } catch { return false; } };
    const regionIndependentlyOpen = regions.some(r => isDialogOpen(r) || isPopoverOpen(r));
    // every element the opener selector matches is checked (one state may open several panels)
    const check = o => {
      let visible = false, hit = false;
      // R30-M-13: a <label for> opener resolves to its control for open-state
      const control = (o.matches('label') && o.control) ? o.control : o;
      const b0 = o.getBoundingClientRect(); visible = shown(o) && b0.width > 0 && b0.height > 0;
      // R30-M-03 / R31-M-07: use native :disabled (includes fieldset + first-legend exception); keep ARIA-disabled and inert
      const disabled = !!(control.disabled || (typeof control.matches === 'function' && control.matches(':disabled')) || control.getAttribute?.('aria-disabled') === 'true' || control.closest?.('[aria-disabled="true"]') || control.closest?.('[inert]') || o.closest?.('[inert]') || o.getAttribute?.('aria-disabled') === 'true');
      if (visible && !disabled) { o.scrollIntoView({ block: 'center', inline: 'nearest' }); const b = o.getBoundingClientRect(), x = b.left + b.width / 2, y = b.top + b.height / 2; let t = document.elementFromPoint(x, y); for (let k = 0; t?.shadowRoot && k < 20; k++) { const d = t.shadowRoot.elementFromPoint(x, y); if (!d || d === t) break; t = d; } hit = !!t && (t === o || within(o, t)); scrollTo(0, 0); }
      if (disabled) hit = false;
      const popId = control.getAttribute?.('popovertarget') || o.getAttribute('popovertarget');
      const resolveId = id => control.getRootNode?.().getElementById?.(id) || o.getRootNode().getElementById?.(id) || document.getElementById(id);
      const popEl = popId ? resolveId(popId) : null;
      const controlsIds = ((control.getAttribute?.('aria-controls') || o.getAttribute('aria-controls') || '') + (popId ? ' ' + popId : '')).trim().split(/\s+/).filter(Boolean);
      // R31-M-04: every supplied target id must resolve
      const unresolvedTargets = controlsIds.filter(id => !resolveId(id));
      const controlled = controlsIds.map(resolveId).filter(Boolean);
      const associatedRegions = regions.filter(r => !controlled.length || controlled.some(t => t === r || within(t, r) || within(r, t)));
      const regionShown = associatedRegions.some(r => shown(r) || isDialogOpen(r) || isPopoverOpen(r));
      // R31-M-12: only supported non-false popup tokens establish haspopup
      const POPUP = new Set(['true', 'menu', 'listbox', 'tree', 'grid', 'dialog']);
      const rawPopup = control.hasAttribute?.('aria-haspopup') ? control.getAttribute('aria-haspopup') : (o.hasAttribute('aria-haspopup') ? o.getAttribute('aria-haspopup') : null);
      const hasPopup = rawPopup !== null && POPUP.has(String(rawPopup).toLowerCase());
      const checked = !!(control.checked || control.getAttribute?.('aria-checked') === 'true' || o.getAttribute('aria-checked') === 'true');
      // R31-M-12 extra / M-03: an explicit false open-state attribute blocks haspopup and step shortcuts
      const explicitlyClosed = ['aria-expanded', 'aria-pressed', 'aria-selected'].some(a => control.getAttribute?.(a) === 'false' || o.getAttribute(a) === 'false');
      const nm = nameOf(control.matches?.('button, [role="button"]') ? control : o).toLowerCase();
      const inHorizTrack = el => { for (let a = parentOf(el); a; a = parentOf(a)) { const c = getComputedStyle(a); if (['hidden', 'clip'].includes(c.overflowX) && a.scrollWidth > a.clientWidth + 1) return true; } return false; };
      // R31-M-03: carousel step via transition evidence (horizontal track), not English-only names
      const isBtn = !!(control.matches?.('button, [role="button"]') || o.matches?.('button, [role="button"]'));
      const carouselStep = !explicitlyClosed && !hasPopup && !popId && regionShown && isBtn &&
        (/\b(next|previous|prev|التالي|السابق)\b/i.test(nm) || associatedRegions.some(inHorizTrack));
      const open = explicitlyClosed ? false : (
        control.getAttribute?.('aria-expanded') === 'true' || o.getAttribute('aria-expanded') === 'true'
        || (o.matches('summary') && !!o.parentElement?.open) || (control.matches?.('summary') && !!control.parentElement?.open)
        || (!!popEl && isPopoverOpen(popEl)) || regions.some(r => isPopoverOpen(r) || isDialogOpen(r))
        || (hasPopup && regionShown)
        || checked
        || carouselStep
        || control.getAttribute?.('aria-selected') === 'true' || o.getAttribute('aria-selected') === 'true'
        || control.getAttribute?.('aria-pressed') === 'true' || o.getAttribute('aria-pressed') === 'true'
        || ((control.hasAttribute?.('aria-current') && control.getAttribute('aria-current') !== 'false') || (o.hasAttribute('aria-current') && o.getAttribute('aria-current') !== 'false'))
      );
      // R30-M-11 / R31-M-04: supplied targets must resolve and agree with reveals
      const targetOk = controlsIds.length === 0 || (unresolvedTargets.length === 0 && regions.every(r => controlled.some(t => t === r || within(t, r) || within(r, t))));
      return { visible, hit, open, targetOk, disabled, unresolvedTargets: unresolvedTargets.length > 0 };
    };
    const checks = openersFound.map(check);
    const openerVisible = checks.length > 0 && checks.every(c => c.visible), openerHit = checks.length > 0 && checks.every(c => c.hit), openerOpen = checks.length > 0 && checks.every(c => c.open);
    const targetAgrees = checks.length === 0 || checks.every(c => c.targetOk);
    // R31-M-13: disabled/inert failures are distinct from hit-test obstruction
    const openerDisabled = checks.length > 0 && checks.some(c => c.disabled) && checks.filter(c => !c.hit).every(c => c.disabled);
    // R30-M-16: exclude the opener and its descendants from revealed-payload items
    const openerSet = new Set(openersFound);
    const inOpener = el => { for (let a = el; a; a = parentOf(a)) if (openerSet.has(a)) return true; return false; };
    const items = [...itemOfEl].filter(([el]) => regions.some(g => g === el || within(g, el)) && !inOpener(el)).map(([, it]) => it);
    return { state: pr.state, openerCount: openersFound.length, regionCount: regions.length, openerVisible, openerHit, openerOpen, openerDisabled, regionVisible: items.length > 0, regionIndependentlyOpen, targetAgrees, items };
  });
  // clipping boxes (overflow hidden or clip, holding shown content) with what they show uncut: the regions of reveals
  const boxes = all.filter(e => holds.has(e) && clipBox(e) && [getComputedStyle(e).overflowX, getComputedStyle(e).overflowY].some(o => ['hidden', 'clip'].includes(o))).map(e => ({ sig: boxSig(e), path: pathOf(e), items: insideItems([e]) }));
  return { width: innerWidth, documentWidth, horizontalOverflow: documentWidth > root.clientWidth + 1, shownPrints, composites, disclosures, headings, ledgerItems, headingItems, disclosureItems, compositeItems, declared, boxes, clipped, mediaCrops, offscreenLeft, unreachable, scrolledText, reflowCandidates, unmeasured, unscannedScopes, lang: root.lang, dir: getComputedStyle(root).direction };
}

// R23-GPT-02, R23-MIMAR-01 (Fadel's tiebreak): prefix and abbreviation matching is retired. A control at a width matches
// a 1440 control only by the SAME accessible name, one to one (each lost control needs its own match: a second Remove
// button hidden at 320 is lost). The roles of one action family (button, link, menuitem, menuitemcheckbox,
// menuitemradio) are interchangeable, so an action moved into a declared More menu as a menuitem matches. A label that
// shortens visually needs an aria-label keeping the full name. Text prints match only the same text (any one shown
// copy counts); an empty control name never matches.
const ACTION = new Set(['button', 'link', 'menuitem', 'menuitemcheckbox', 'menuitemradio']);
export const printKey = print => { const i = String(print).indexOf(':'), role = print.slice(0, i); return ACTION.has(role) ? `action:${print.slice(i + 1)}` : print; };
const isControlPrint = print => { const i = String(print).indexOf(':'); return i > 0 && !['text', 'frame'].includes(print.slice(0, i)); };
const counts = list => { const m = new Map(); for (const p of list || []) { const k = printKey(p); m.set(k, (m.get(k) || 0) + 1); } return m; };
// how many of `print` the list shows (controls counted per element; text 1 or 0)
export function printShown(list, print, need = 1) {
  const k = printKey(print); if (isControlPrint(print) && !String(print).slice(print.indexOf(':') + 1)) return false;
  const n = counts(list).get(k) || 0;
  return isControlPrint(print) ? n >= need : n > 0;
}
// the prints lost from `from` in `to`: every text print not shown at all, and every control print shown fewer times
export function lostPrints(from, to) {
  const have = counts(to), want = counts(from), out = [], seen = new Map();
  for (const p of from || []) {
    const k = printKey(p), i = (seen.get(k) || 0) + 1; seen.set(k, i);
    if (isControlPrint(p) ? (!p.slice(p.indexOf(':') + 1) || i > (have.get(k) || 0)) : i === 1 && !have.get(k)) out.push(p);
  }
  return out;
}

// R24-GPT-03 (Mi'mar's tiebreak): the only role swaps allowed. (1) A tablist at 1440 adapted into an accordion: each lost
// tab is matched one to one by a shown disclosure (summary, or a button with aria-expanded) of the same name, and the
// lost tablist counts as covered only when every one of its tabs is matched that way. (2) A menubar adapted into a menu
// (in a declared state): the lost menubar counts as covered only when a shown menu's items match every menubar item one to
// one by name (the menuitem family). No other role swaps.
const nameOfPrint = p => String(p).slice(String(p).indexOf(':') + 1);
export function coverByEquivalents(lost, from, at) {
  // a pool of names shown at the width, less those shown at 1440 (they match themselves); taken atomically per tablist
  const poolOf = key => { const m = new Map(); for (const n of at?.[key] || []) m.set(n, (m.get(n) || 0) + 1); for (const n of from?.[key] || []) if (m.get(n)) m.set(n, m.get(n) - 1); return m; };
  const pools = { disclosures: poolOf('disclosures'), headings: poolOf('headings') };
  const takeAll = (pool, names) => { const t = new Map(pool); for (const n of names) { if (!t.get(n)) return false; t.set(n, t.get(n) - 1); } for (const [k, v] of t) pool.set(k, v); return true; };
  const covered = new Set();
  const lostSet = new Set(lost);
  for (const c of (from?.composites || []).filter(c => c.role === 'tablist' && lostSet.has(c.print))) {
    const tabs = c.items.filter(i => lostSet.has(i)), names = tabs.map(nameOfPrint);
    // an accordion (R24-GPT-03) or headed sections (R25-GPT-04): every tab is matched one to one by name, in one form;
    // the panels' text and actions are checked by the ordinary one-to-one rules
    if (tabs.length === c.items.length && c.items.length && (takeAll(pools.disclosures, names) || takeAll(pools.headings, names))) { covered.add(c.print); tabs.forEach(t => covered.add(t)); }
  }
  for (const c of (from?.composites || []).filter(c => c.role === 'menubar' && lostSet.has(c.print))) {
    const want = c.items.map(i => `action:${nameOfPrint(i)}`);
    const ok = c.items.length && (at?.composites || []).some(m => { if (m.role !== 'menu') return false; const have = new Map(); for (const i of m.items) { const k = `action:${nameOfPrint(i)}`; have.set(k, (have.get(k) || 0) + 1); } return want.every(k => { if (!have.get(k)) return false; have.set(k, have.get(k) - 1); return true; }); });
    if (ok) covered.add(c.print);
  }
  return covered;
}

// R28 (Mi'mar's decision): loss accounting in two steps, one group per screen and language.
// (A) Within one state, identity is the DOM node (tagged at 1440 in the same session). An item shown at 1440 is shown at a
//     narrow width only if the same node shows the same print there; a reworded or renamed node is lost. Inside the same
//     state a lost item may be covered by a distinct node not shown at 1440 (one cover each): the same role family and
//     name, or the same text; tabs adapted into an accordion (disclosures named like every tab) or into headed sections
//     (headings named like every tab, every tab's panel declared as a state). When tabs become headed sections, a lost
//     panel item is covered only inside that tablist's own sections (a section ends at the next heading of the same or
//     higher rank), one to one per tablist; nothing else covers it.
// (B) Another declared state R covers a lost item of state S at width W only through a reveal: in S at W the item sits in
//     the region of exactly one visible opener (summary, a button or tab with aria-controls, an aria-expanded button),
//     whose signature (kind, role family, name) is unique in S and in R, and R at W shows that region with an item of the
//     same role family and name (or text) inside it, one to one per region. No ids are compared across states; nothing
//     outside the revealed region (a footer, a sticky button) can cover.
const EMPTY_LEDGER = { items: [], headings: [], disclosures: [], composites: [], declared: [], boxes: [] };
const fam = role => ACTION.has(role) ? 'action' : role;
const sameItem = (x, e) => x.kind === 'text' ? e.kind === 'text' && e.print === x.print : e.kind === 'control' && !!x.name && e.name === x.name && fam(e.role) === fam(x.role);
const ledgerOf = (g, width) => ({ ...EMPTY_LEDGER, ...(g.widths?.ledgerByWidth?.[width] || {}) });
// R29: a declaration of state R is valid at a width only when, in the losing state S, every element the opener
// selector matches is visible and operable (hit test) and the region is hidden; and in R the opener shows it is open and
// the region is visible. Returns the reasons it is invalid (empty when valid).
export function declarationProblems(inS, inR, opts = {}) {
  if (!inS || !inR) return ['the declaration was not probed in both renderings'];
  if (inS.error || inR.error) return [inS.error || inR.error];
  const why = [];
  if (inS.openerCount < 1) why.push('opener matches nothing in the losing state');
  else if (!inS.openerVisible) why.push('opener not visible in the losing state');
  else if (!inS.openerHit) {
    // R31-M-13: preserve disabled/inert vs obstruction
    if (inS.openerDisabled) why.push('opener is disabled or inert in the losing state');
    else why.push('opener not operable in the losing state (another element is on top of it)');
  }
  // R31-M-02: truncation verification may permit an already-visible introduction; ordinary losses keep the hidden-region rule
  if (inS.regionVisible && !opts.allowVisibleRegion) why.push('region already visible in the losing state');
  // R30-M-11 / R31-M-04: reveals must agree; unresolved supplied target ids invalidate
  if (inS.targetAgrees === false || inR.targetAgrees === false) why.push('reveals contradicts the opener\'s aria-controls or popovertarget (or a target id is unresolved)');
  // R30-M-17: a verified source trigger may disappear after opening an associated region whose open state is independent (dialog[open]/:modal/:popover-open)
  if (inR.openerCount < 1) {
    if (!(inS.openerCount >= 1 && inR.regionVisible && inR.regionIndependentlyOpen)) why.push('opener matches nothing in the declared state');
  } else if (!inR.openerOpen) {
    why.push('opener does not show it is open in the declared state');
  }
  if (!inR.regionVisible) why.push('region not visible in the declared state');
  return why;
}
const probeOf = (g, width, state) => (g.widths?.ledgerByWidth?.[width]?.declared || []).find(d => d.state === state);
// R29-GPT-01: identical renderings of one state (the positional page and the declared default) are accounted once
// R30-M-08: coalesce only when declaration probes, operability, region membership, headings and composites also match
const renderingKey = g => JSON.stringify((g.widths?.results || []).map(r => {
  const L = g.widths.ledgerByWidth?.[r.width] || {};
  return [r.width, (L.items || []).map(i => i.print), (r.lostItems || []).map(i => i.print),
    (L.declared || []).map(d => [d.state, d.openerCount, d.regionCount, d.openerVisible, d.openerHit, d.openerOpen, d.regionVisible, d.regionIndependentlyOpen, d.targetAgrees, (d.items || []).map(i => i.print)]),
    (L.headings || []).map(h => [h.name, h.level, h.members]), (L.composites || []).map(c => [c.role, c.name, (c.items || []).map(i => [i.name, i.selected])])];
}));
export function accountLosses(all, phase = 'handoff', sharedSpent = null) {
  const unresolved = [];
  const stateOf = g => g.scope?.state ?? 'default';
  const twins = new Map(), group = [];
  for (const g of all) { const k = `${stateOf(g)}|${renderingKey(g)}`; if (twins.has(k)) twins.get(k).push(g); else { twins.set(k, [g]); group.push(g); } }
  const spent = sharedSpent || new Map(); // R30-M-09/M-07: one pool per source rendering and width; clip path may pre-seed it
  for (const S of group) {
    const at1440 = ledgerOf(S, 1440), ledger = new Set(at1440.items.map(i => i.id));
    for (const r of S.widths?.results || []) {
      if (r.width === 1440) { r.lost = []; r.equivalent = []; continue; }
      const W = r.width, here = ledgerOf(S, W), lostItems = r.lostItems || [], covered = new Map(), used = new Set();
      const fresh = e => !ledger.has(e.id) && !used.has(e.id);
      const sectionTablists = new Set();
      // (A) tabs to an accordion or to headed sections, inside this state
      for (const tl of at1440.composites.filter(c => c.role === 'tablist' && c.items.length)) {
        const lostTabs = [tl, ...tl.items].map(t => lostItems.find(x => x.id === t.id)).filter(Boolean); // the tablist and its tabs
        if (!lostTabs.length) continue;
        const pick = (pool, ok) => { const out = []; for (const t of tl.items) { const e = pool.find(e => e.name === t.name && ok(e) && !out.includes(e)); if (!e) return null; out.push(e); } return out; };
        let m = pick(here.disclosures, fresh), how = 'accordion';
        if (!m) {
          const declared = tl.items.every(t => group.some(g => ledgerOf(g, 1440).composites.some(c => c.role === 'tablist' && c.name === tl.name && c.items.some(i => i.name === t.name && i.selected))));
          m = declared ? pick(here.headings, e => !used.has(e.id) && (!ledger.has(e.id) || e.panelTablist === tl.id)) : null; how = 'headed sections';
        }
        if (!m) continue;
        m.forEach(e => used.add(e.id)); lostTabs.forEach(x => covered.set(x.id, stateOf(S)));
        if (how === 'headed sections') {
          sectionTablists.add(tl.id);
          // the shown panel is the selected tab's: its items are covered only inside that tab's section
          const sel = tl.items.findIndex(t => t.selected), secs = sel >= 0 ? [m[sel]] : m;
          const pool = [...new Set(secs.flatMap(h => h.members))].map(id => here.items.find(i => i.id === id)).filter(Boolean);
          for (const x of lostItems.filter(x => x.panelTablist === tl.id && !covered.has(x.id))) { const e = pool.find(e => fresh(e) && sameItem(x, e)); if (e) { used.add(e.id); covered.set(x.id, stateOf(S)); } else if (x.kind === 'text' && tl.items.some(t => x.print === `text:${t.name}`)) covered.set(x.id, stateOf(S)); }
        }
      }
      // (A) single items: a distinct node not shown at 1440, same role family and name, or same text, one cover each
      for (const x of lostItems.filter(x => !covered.has(x.id) && !(x.panelTablist && sectionTablists.has(x.panelTablist)))) {
        const e = here.items.find(e => fresh(e) && sameItem(x, e)); if (e) { used.add(e.id); covered.set(x.id, stateOf(S)); }
      }
      // (B) R29: another state covers only through its declared, verified reveal: an item inside R's `reveals` region,
      // same role family and name (or text), one to one from one pool per screen and width (nested regions never
      // count twice). Nothing visible in S takes part (a valid declaration has S's region hidden). No declaration, no cover.
      r.declarations = [];
      // R30-M-09 / R31-M-01: pools keyed by losing state, rendering and evaluation width (independent capacity per width)
      const pk = `${stateOf(S)}|${renderingKey(S)}|${W}`; if (!spent.has(pk)) spent.set(pk, new Set()); const pool = spent.get(pk);
      for (const R of group.filter(R => R !== S && R.declaration && stateOf(R) !== stateOf(S))) {
        const inR = probeOf(R, W, stateOf(R)), why = declarationProblems(probeOf(S, W, stateOf(R)), inR);
        r.declarations.push({ state: stateOf(R), opener: R.declaration.opener, reveals: R.declaration.reveals, valid: !why.length, why });
        if (why.length) continue;
        for (const x of lostItems.filter(x => !covered.has(x.id))) { const e = inR.items.find(e => !pool.has(`${stateOf(R)}|${e.id}`) && sameItem(x, e)); if (e) { pool.add(`${stateOf(R)}|${e.id}`); covered.set(x.id, stateOf(R)); } }
      }
      // a lost composite (tablist, menubar, menu) is covered when every one of its items is (R24-GPT-03: menubar to menu)
      for (const c of at1440.composites) { const x = lostItems.find(x => x.id === c.id); if (!x || covered.has(x.id) || !c.items.length || !c.items.every(i => !lostItems.some(l => l.id === i.id) || covered.has(i.id))) continue; const by = c.items.map(i => covered.get(i.id)).find(st => st && st !== stateOf(S)); covered.set(x.id, by || stateOf(S)); }
      const self = x => covered.get(x.id) === stateOf(S);
      r.equivalent = lostItems.filter(self).map(x => x.print);
      r.lost = lostItems.filter(x => !self(x)).map(x => ({ print: x.print, id: x.id, reachableIn: covered.get(x.id) ?? null }));
      if (S.scope) for (const l of r.lost.filter(l => !l.reachableIn)) { l.deferred = phase === 'wireframe'; unresolved.push({ ...S.scope, width: W, rule: 'shown at 1440, not shown at this width', paths: [l.id], text: [l.print.slice(0, 60)], deferred: l.deferred }); }
    }
  }
  for (const [, [first, ...copies]] of twins) for (const c of copies) for (const r of c.widths?.results || []) { const f = (first.widths?.results || []).find(x => x.width === r.width); if (f) { r.lost = f.lost.map(l => ({ ...l })); r.equivalent = [...(f.equivalent || [])]; r.declarations = f.declarations; r.twinOf = stateOf(first); } }
  return unresolved;
}

// R26-MIMAR-01: pause, then finish, every running finite animation or transition of the document (open shadow roots
// included by getAnimations({ subtree: true })); infinite ones are untouched. Returns what was moving.
export function settleMotion() {
  const moving = [];
  const list = typeof document.getAnimations === 'function' ? document.getAnimations() : [];
  for (const a of list) {
    let t = null; try { t = a.effect?.getComputedTiming?.(); } catch {}
    if (!t || !Number.isFinite(t.endTime) || t.iterations === Infinity) continue;
    if (a.playState !== 'running' && a.playState !== 'paused') continue;
    const was = a.playState === 'running' && (t.progress ?? 1) < 1;
    try { a.pause(); a.finish(); } catch { continue; }
    if (was) moving.push({ kind: a.constructor?.name === 'CSSTransition' ? 'transition' : 'animation', name: a.transitionProperty || a.animationName || a.id || '', target: a.effect?.target?.tagName || '' });
  }
  return moving;
}

const SETTLE_AND_INSPECT = new Function('arg', `const motion = (${settleMotion.toString()})(); const r = (${inspectLayout.toString()})(arg); r.motionAtCapture = motion; return r;`);

export const validWidths = widths => Array.isArray(widths) && widths.length > 0 && widths.includes(1440) && widths.every(w => Number.isInteger(w) && w > 0) && new Set(widths).size === widths.length;

// R13 N16: closed shadow roots cannot be reached from page script, so they are counted through the DevTools protocol
// (DOM.getDocument with pierce). Each one is an unscanned scope and fails the width screen; if the count itself
// cannot be taken, the document is an unscanned scope (fail closed).
export async function closedShadowRoots(page) {
  let session = null;
  try {
    session = await page.context().newCDPSession(page);
    const { root } = await session.send('DOM.getDocument', { depth: -1, pierce: true });
    const hosts = [];
    const walk = n => { for (const r of n.shadowRoots || []) { if (r.shadowRootType === 'closed') hosts.push(n.localName); walk(r); } for (const c of n.children || []) walk(c); if (n.contentDocument) walk(n.contentDocument); if (n.templateContent) walk(n.templateContent); };
    walk(root);
    return hosts;
  } catch { return null; } finally { if (session) await session.detach().catch(() => {}); }
}

// expected: { lang, dir } for a declared state, or null for the positional page (language checked per state).
export async function screenWidths(page, widths, expected = null, height = 900, probes = []) {
  if (!validWidths(widths)) return { results: [], pass: false, error: 'settings.desktopWidths invalid; no width screened' };
  const results = [];
  try {
    const order = [...widths, ...(widths.includes(REFLOW_WIDTH) ? [] : [REFLOW_WIDTH])];
    // R28 (decision A): 1440 first, so it tags the nodes the other widths of this page are compared by
    for (const width of [1440, ...order.filter(x => x !== 1440)]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => { scrollTo(0, 0); return new Promise(done => { setTimeout(done, 250); requestAnimationFrame(() => requestAnimationFrame(done)); }); }); // settle resize handlers (bounded)
      // R14-GPT-03: closed shadow roots are counted at each width, after the resize, so a root that exists only at
      // one width is still an unscanned scope there.
      const closed = await closedShadowRoots(page);
      const closedScopes = closed === null ? [{ tag: 'DOCUMENT', src: 'closed shadow roots could not be counted' }] : closed.map(host => ({ tag: host.toUpperCase(), src: 'closed shadow root' }));
      // R26-MIMAR-01 (P3, Fadel): settle motion first, in the same task as the measure (no timer can start a new slide in
      // between): every running finite animation and transition is paused and finished; infinite animations are left
      // alone (the marquee rule grades them). Anything that was moving is recorded as 'motion at capture'.
      // a real function (Playwright pages and the isolated probe world both evaluate fn.toString() with its argument)
      const result = await page.evaluate(SETTLE_AND_INSPECT, { reflow: width === REFLOW_WIDTH, tag: width === 1440, probes });
      result.unscannedScopes.push(...closedScopes);
      const language = !expected || (result.lang === expected.lang && result.dir === expected.dir);
      results.push({ ...result, purpose: widths.includes(width) ? 'declared desktop width' : 'desktop accessibility reflow (400% of 1280); not mobile approval', rest: !result.horizontalOverflow && result.offscreenLeft.length === 0 && result.unreachable.length === 0 && result.scrolledText.length === 0 && result.unmeasured.length === 0 && result.unscannedScopes.length === 0 && result.reflowCandidates.every(c => c.fits && c.keyboard) && language });
      results.at(-1).pass = results.at(-1).rest && result.clipped.length === 0; // refined below (lost content, reveals)
    }
    results.sort((a, b) => order.indexOf(a.width) - order.indexOf(b.width));
  } finally {
    await page.setViewportSize({ width: 1440, height });
  }
  // R20 (Mi'mar's tiebreak): (1) content shown at 1440 must be fully shown or reachable at every width (320 included);
  // (3) content cut partly anywhere fails; (2) content cut wholly at 1440 (and not shown there) is a `reveal` clip: it
  // fails here and resolveReveals passes it only when another declared state of the same screen and language shows it.
  // R21-GPT-04 (WCAG 1.4.10, Fadel's tiebreak): text or a control shown at 1440 that is not shown at a width (display:none
  // there, or cut) is `lost` at that width; resolveReveals passes it only when a declared state of the same screen and
  // language shows the same text or accessible name at that width (a menu-open state). Prints, not positions.
  // Read-more: a partial cut that is only an intentional truncation is `truncated` and needs a declared state showing
  // the full text at that width; any other partial cut fails.
  const shownAt1440 = results.find(r => r.width === 1440)?.shownPrints || [];
  const shown1440 = new Set(shownAt1440), shownByWidth = {}, groupsByWidth = {};
  const groups1440 = results.find(r => r.width === 1440) || {};
  const g1440 = { composites: groups1440.composites || [], disclosures: groups1440.disclosures || [], headings: groups1440.headings || [] };
  // R28: identity of a cut item: its owning control, else the element itself (the tagged node)
  const idOf = p => p.id;
  const ledger1440 = results.find(r => r.width === 1440)?.ledgerItems || [];
  const ids1440 = new Set(ledger1440.map(i => i.id));
  const ledgerByWidth = {};
  for (const r of results) {
    ledgerByWidth[r.width] = { items: r.ledgerItems || [], headings: r.headingItems || [], disclosures: r.disclosureItems || [], composites: r.compositeItems || [], declared: r.declared || [], boxes: r.boxes || [] };
    shownByWidth[r.width] = r.shownPrints; groupsByWidth[r.width] = { composites: r.composites || [], disclosures: r.disclosures || [], headings: r.headings || [] };
    // R22-GPT-06: a control is never excused by a truncation
    // R23-GPT-05: a clamp may only hide text: a clamp or ellipsis box whose cut set (whole or partial) holds a control fails
    // R26-GPT-04: whether a narrow-width whole cut was shown at 1440 is decided by the element itself, not its name.
    // R26 (Fadel): a box collapsed to zero visible area at a narrow width behaves exactly like display:none: its cut is
    // not a clip; what it hides is accounted in the identity ledger (resolveReveals) like any other loss. Content it hides
    // that was never shown at 1440 stays a `reveal`, as at 1440.
    for (const c of r.clipped) c.rule = c.viewport || !(c.whole?.length || c.partial?.length) ? 'clip' : c.truncation && [...c.whole, ...c.partial].some(p => p.kind === 'control') ? 'partly clipped' : c.partial.length ? (c.truncation ? 'truncated' : 'partly clipped') : r.width !== 1440 && c.whole.some(p => ids1440.has(idOf(p))) ? (c.collapsed ? 'collapsed' : 'shown at 1440, lost at this width') : 'reveal';
    r.collapsedBoxes = r.clipped.filter(c => c.rule === 'collapsed'); r.clipped = r.clipped.filter(c => c.rule !== 'collapsed');
    const cutIds = new Set(r.clipped.flatMap(c => [...(c.whole || []), ...(c.partial || [])].map(idOf))); // reported once, by its clip rule
    // the same node with the same print (R28-GPT-01); a role change within the action family keeps it (R27-GPT-03)
    const here = new Set((r.ledgerItems || []).map(i => `${i.id}|${printKey(i.print)}`));
    r.lostItems = r.width === 1440 ? [] : ledger1440.filter(i => !here.has(`${i.id}|${printKey(i.print)}`) && !cutIds.has(i.id));
    r.passExceptReveal = r.rest && r.clipped.every(c => ['reveal', 'truncated', 'collapsed'].includes(c.rule));
    delete r.shownPrints; delete r.rest; delete r.composites; delete r.disclosures; delete r.headings; delete r.ledgerItems; delete r.headingItems; delete r.disclosureItems; delete r.compositeItems; delete r.declared; delete r.boxes;
  }
  const w = { results, shownAt1440, shownByWidth, ledgerByWidth, pass: results.every(r => r.pass), passExceptReveal: results.every(r => r.passExceptReveal), note: 'Automated width screen only; 320 CSS px approximates a 1280 px desktop at 400% zoom. Actual zoom, text spacing and WCAG reflow exceptions still require manual evidence; every reflow candidate needs a recorded decision.' };
  // provisional, this rendering alone (resolveReveals redoes it across the declared states of the screen)
  accountLosses([{ scope: null, widths: w }]);
  for (const r of results) { r.pass = r.passExceptReveal && r.clipped.every(c => c.rule === 'collapsed') && r.lost.every(l => l.reachableIn); }
  w.pass = results.every(r => r.pass);
  return w;
}

// R20 (Mi'mar's clipping tiebreak, rule 2): a `reveal` clip (content cut wholly at 1440 in one state) is resolved only
// when another declared, applicable state of the same screen and language shows every cut element at 1440 (an
// accordion's expanded state, a carousel slide state); that state is graded normally. In the wireframe phase (only the
// default state is rendered) an unresolved reveal is DEFERRED. Mutates each widths result: per-width pass, overall pass
// and `reveals` (with `revealedBy`). scopes: [{ scope: { screen, state, lang }, widths }].
export function resolveReveals(scopes, phase = 'handoff') {
  const unresolved = [];
  // R30-M-07: one allocation ledger per losing rendering and width across clips and ordinary losses
  const groups = new Map();
  for (const sc of scopes) { if (!sc.widths?.results || !sc.scope) continue; const k = `${sc.scope.screen}|${sc.scope.lang}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(sc); }
  const sharedByGroup = new Map(); // groupKey -> spent Map
  for (const [gk, groupScopes] of groups) {
    const sharedSpent = new Map();
    sharedByGroup.set(gk, sharedSpent);
    for (const { scope, widths: w } of groupScopes) {
      if (!w?.results) continue;
      for (const r of w.results) {
        const others = groupScopes.filter(o => o.scope.state !== scope.state);
        const at = (o, width) => (width === 1440 ? o.widths?.shownAt1440 : o.widths?.shownByWidth?.[width]) || [];
        const resolvable = c => ['reveal', 'truncated'].includes(c.rule);
        const usedBy = new Map(others.map(o => [o, new Map()]));
        const usedAt = (o, width) => { const m = usedBy.get(o); if (!m.has(width)) m.set(width, new Map()); return m.get(width); };
        const done = new Map();
        // R31-M-01: shared allocations keyed by losing state, rendering and evaluation width
        const clipSpentFor = evalW => {
          const k = `${scope.state}|${renderingKey({ scope, widths: w })}|${evalW}`;
          if (!sharedSpent.has(k)) sharedSpent.set(k, new Set());
          return sharedSpent.get(k);
        };
        const physical = clipSpentFor(r.width);
        const localUsed = new Set(); // R30-M-07: one spend ledger across all clips of this rendering/width
        for (const c of r.clipped.filter(resolvable)) {
          const raw = c.rule === 'reveal' ? c.whole : [...c.whole, ...c.partial], width = c.rule === 'reveal' ? 1440 : r.width;
          const seenOwner = new Set(), items = raw.filter(p => { if (p.kind !== 'control' || !p.owner) return true; if (seenOwner.has(p.owner)) return false; seenOwner.add(p.owner); return true; });
          const pool = o => at(o, width);
          const capacity = (o, used, p) => { if (!isControlPrint(p)) return printShown(pool(o), p); const k = printKey(p), n = (counts(pool(o)).get(k) || 0) - (used.get(k) || 0); return n > 0; };
          const assign = (o, used, p) => { if (!capacity(o, used, p)) return false; if (isControlPrint(p)) used.set(printKey(p), (used.get(printKey(p)) || 0) + 1); return true; };
          const mine = w.ledgerByWidth?.[width] || {};
          // R31-M-05: undeclared fallback requires horizontal-track/carousel evidence; a control inside a vertical clip does not qualify
          const carouselLike = !!(c.x || (c.sig || '').toLowerCase().includes('carousel'));
          const regionFor = (o, p) => {
            const theirs = o.widths?.ledgerByWidth?.[width] || {};
            if (o.declaration) {
              const inR = probeOf(o, width, o.scope.state);
              if (declarationProblems(probeOf({ widths: w }, width, o.scope.state), inR).length) return null;
              return { key: `${o.scope.state}|declared`, items: inR.items, mineBox: null, theirsBox: null, declared: true };
            }
            if (!carouselLike) return null; // R30-M-19
            const real = list => (list || []).filter(b => b.sig === c.sig && b.items.length);
            const a = real(mine.boxes), b = real(theirs.boxes);
            if (a.length <= 1 && b.length === 1) return { key: `${o.scope.state}|b:${c.sig}`, items: b[0].items, mineBox: a[0] || null, theirsBox: b[0], declared: false };
            const atp = b.filter(x => x.path === c.boxPath);
            return atp.length === 1 ? { key: `${o.scope.state}|b:${c.sig}|${c.boxPath}`, items: atp[0].items, mineBox: a.find(x => x.path === c.boxPath) || a[0] || null, theirsBox: atp[0], declared: false } : null;
          };
          const asItem = p => { const k = String(p.print).indexOf(':'); return p.kind === 'control' ? { kind: 'control', role: p.print.slice(0, k), name: p.print.slice(k + 1), print: p.print } : { kind: 'text', print: p.print }; };
          // physical/localUsed shared across clips; also seeded into sharedSpent for ordinary losses (M-07).
          const pick = (o, p) => {
            const key = p.kind === 'control' && p.owner ? `${width}|${p.owner}` : null; if (key && done.has(key)) return done.get(key) === o;
            const reg = regionFor(o, p); if (!reg) return false;
            // R30-M-06: undeclared carousel cover must correspond to the formerly hidden slide (same structural path);
            // reserve target items that still serve source-visible slide paths so an unchanged first slide cannot cover.
            if (!reg.declared && reg.mineBox && reg.theirsBox) {
              const srcPaths = new Set(reg.mineBox.items.map(i => i.path));
              for (const e of reg.theirsBox.items) if (srcPaths.has(e.path)) { localUsed.add(`${o.scope.state}|${e.id}`); physical.add(`${o.scope.state}|${e.id}`); }
            }
            // R30-M-06: when the target rendering still has the cut item's structural path (same carousel markup), require it;
            // otherwise (restructured nested boxes, M-07 E1) fall back to name matching after reservation.
            const pathAvailable = !reg.declared && !!p.path && (reg.theirsBox?.items || []).some(e => e.path === p.path);
            const e = reg.items.find(e => !localUsed.has(`${o.scope.state}|${e.id}`) && sameItem(asItem(p), e) && (!pathAvailable || e.path === p.path)); if (!e) return false;
            localUsed.add(`${o.scope.state}|${e.id}`); physical.add(`${o.scope.state}|${e.id}`); if (key) done.set(key, o); return true;
          };
          let full = null;
          // R30-M-05 / R31-M-02 / R31-M-10: truncation via verified declaration; allow visible intro; spend targets in the shared ledger
          if (c.rule === 'truncated') {
            for (const o of others) {
              if (!o.declaration) continue;
              const inR = probeOf(o, width, o.scope.state);
              if (declarationProblems(probeOf({ widths: w }, width, o.scope.state), inR, { allowVisibleRegion: true }).length) continue;
              if (!items.every(p => inR.items.some(e => e.kind === 'text' && e.print === p.print) || (isControlPrint(p.print) && inR.items.some(e => sameItem(asItem(p), e))))) continue;
              const spentKeys = [];
              let okSpend = true;
              for (const p of items) {
                const e = inR.items.find(e => !physical.has(`${o.scope.state}|${e.id}`) && !localUsed.has(`${o.scope.state}|${e.id}`) && (
                  (p.kind !== 'control' && e.kind === 'text' && e.print === p.print) ||
                  (isControlPrint(p.print) && sameItem(asItem(p), e))
                ));
                if (!e) { okSpend = false; break; }
                spentKeys.push(`${o.scope.state}|${e.id}`);
              }
              if (!okSpend) continue;
              for (const k of spentKeys) { localUsed.add(k); physical.add(k); }
              full = o.scope.state; break;
            }
          }
          const states = c.rule === 'truncated' ? items.map(() => full) : items.map(p => others.find(o => pick(o, p))?.scope.state);
          const by = states.every(Boolean);
          c.revealedBy = by ? [...new Set(states)] : null;
          if (!by) { c.deferred = phase === 'wireframe'; unresolved.push({ ...scope, width: r.width, rule: c.rule, paths: items.filter((p, i) => !states[i]).map(p => p.path), text: items.filter((p, i) => !states[i]).map(p => p.text), deferred: c.deferred }); }
        }
        r.pass = r.passExceptReveal && r.clipped.every(c => !resolvable(c) || c.revealedBy || c.deferred);
      }
    }
    unresolved.push(...accountLosses(groupScopes, phase, sharedSpent));
  }
  // scopes with no group (missing scope) still get a pass bit update
  for (const { widths: w } of scopes) {
    if (!w?.results) continue;
    for (const r of w.results) r.pass = r.pass && (r.lost || []).every(l => l.reachableIn || l.deferred);
    w.pass = w.results.every(r => r.pass);
  }
  return { unresolved, pass: unresolved.every(u => u.deferred) };
}

// R11 panel D1 (decisions B, T2), R12 M09: a candidate is resolved only by a handoff `reflowExceptions` entry naming
// the same screen, state, lang and element id, a non-empty reason and a reviewer who holds the qaGate or approver role
// (exceptions.mjs). Every occurrence keeps its scope; an unresolved candidate BLOCKS the final handoff.
export function resolveReflowCandidates(candidates, handoff, phase = 'handoff') {
  const r = resolveScoped({ items: candidates.map(c => ({ screen: null, state: null, lang: null, ...c })), entries: handoff?.reflowExceptions, roles: [handoff?.settings?.roles?.qaGate, handoff?.settings?.roles?.approver], phase, what: 'reflowExceptions', shape: c => `${c.element}|${c.scroller}` });
  return { candidates: r.items, unresolved: r.unresolved, status: r.status, pass: r.pass };
}
