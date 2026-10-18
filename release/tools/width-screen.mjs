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

export function inspectLayout({ reflow = false } = {}) {
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
  const shown = el => { const c = getComputedStyle(el); if (c.display === 'none' || c.visibility !== 'visible' || inSrOnly(el) || !rendered(el)) return false; const r = el.getBoundingClientRect(); return (r.width > 0 && r.height > 0) || textRects(el).length > 0; };
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
      const item = { path: pathOf(d), tag: d.tagName, kind: kindOf(d), print: printOf(d), text: (d.matches(MEDIA) ? d.getAttribute('alt') || d.getAttribute('aria-label') || d.value || d.tagName : [...d.childNodes].filter(n => n.nodeType === 3).map(n => n.nodeValue).join(' ')).replace(/\s+/g, ' ').trim().slice(0, 60) };
      (rects.every(outside) ? whole : partial).push(item);
    }
    return { whole, partial };
  };
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
    if ((x || y)) { const cut = cutOf(e, r); for (const it of [...cut.whole, ...cut.partial]) cutPaths.add(it.path); if (cut.whole.length || cut.partial.length) clipped.push({ tag: e.tagName, slot: e.getAttribute('data-copy-slot'), x, y, ellipsis: x && c.textOverflow === 'ellipsis', truncation: (x && c.textOverflow === 'ellipsis') || (y && !!c.webkitLineClamp && c.webkitLineClamp !== 'none'), whole: cut.whole, partial: cut.partial }); else mediaCrops.push({ tag: e.tagName, slot: e.getAttribute('data-copy-slot') }); }
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
  const disclosures = [...seenControl].filter(c => c.matches('summary') || (roleOf(c) === 'button' && c.hasAttribute('aria-expanded'))).map(c => nameOf(c));
  return { width: innerWidth, documentWidth, horizontalOverflow: documentWidth > root.clientWidth + 1, shownPrints, composites, disclosures, clipped, mediaCrops, offscreenLeft, unreachable, scrolledText, reflowCandidates, unmeasured, unscannedScopes, lang: root.lang, dir: getComputedStyle(root).direction };
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
  const pool = new Map(); for (const n of at?.disclosures || []) pool.set(n, (pool.get(n) || 0) + 1);
  for (const n of from?.disclosures || []) if (pool.get(n)) pool.set(n, pool.get(n) - 1); // disclosures shown at 1440 match themselves
  const take = n => { if (!pool.get(n)) return false; pool.set(n, pool.get(n) - 1); return true; };
  const covered = new Set();
  const lostSet = new Set(lost);
  for (const c of (from?.composites || []).filter(c => c.role === 'tablist' && lostSet.has(c.print))) {
    const tabs = c.items.filter(i => lostSet.has(i));
    if (tabs.length === c.items.length && c.items.length && tabs.every(t => take(nameOfPrint(t)))) { covered.add(c.print); tabs.forEach(t => covered.add(t)); }
  }
  for (const c of (from?.composites || []).filter(c => c.role === 'menubar' && lostSet.has(c.print))) {
    const want = c.items.map(i => `action:${nameOfPrint(i)}`);
    const ok = c.items.length && (at?.composites || []).some(m => { if (m.role !== 'menu') return false; const have = new Map(); for (const i of m.items) { const k = `action:${nameOfPrint(i)}`; have.set(k, (have.get(k) || 0) + 1); } return want.every(k => { if (!have.get(k)) return false; have.set(k, have.get(k) - 1); return true; }); });
    if (ok) covered.add(c.print);
  }
  return covered;
}

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
export async function screenWidths(page, widths, expected = null, height = 900) {
  if (!validWidths(widths)) return { results: [], pass: false, error: 'settings.desktopWidths invalid; no width screened' };
  const results = [];
  try {
    for (const width of [...widths, ...(widths.includes(REFLOW_WIDTH) ? [] : [REFLOW_WIDTH])]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => { scrollTo(0, 0); return new Promise(done => { setTimeout(done, 250); requestAnimationFrame(() => requestAnimationFrame(done)); }); }); // settle resize handlers (bounded)
      // R14-GPT-03: closed shadow roots are counted at each width, after the resize, so a root that exists only at
      // one width is still an unscanned scope there.
      const closed = await closedShadowRoots(page);
      const closedScopes = closed === null ? [{ tag: 'DOCUMENT', src: 'closed shadow roots could not be counted' }] : closed.map(host => ({ tag: host.toUpperCase(), src: 'closed shadow root' }));
      const result = await page.evaluate(inspectLayout, { reflow: width === REFLOW_WIDTH });
      result.unscannedScopes.push(...closedScopes);
      const language = !expected || (result.lang === expected.lang && result.dir === expected.dir);
      results.push({ ...result, purpose: widths.includes(width) ? 'declared desktop width' : 'desktop accessibility reflow (400% of 1280); not mobile approval', rest: !result.horizontalOverflow && result.offscreenLeft.length === 0 && result.unreachable.length === 0 && result.scrolledText.length === 0 && result.unmeasured.length === 0 && result.unscannedScopes.length === 0 && result.reflowCandidates.every(c => c.fits && c.keyboard) && language });
      results.at(-1).pass = results.at(-1).rest && result.clipped.length === 0; // refined below (lost content, reveals)
    }
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
  const g1440 = { composites: groups1440.composites || [], disclosures: groups1440.disclosures || [] };
  for (const r of results) {
    shownByWidth[r.width] = r.shownPrints; groupsByWidth[r.width] = { composites: r.composites || [], disclosures: r.disclosures || [] };
    // R22-GPT-06: a control is never excused by a truncation
    // R23-GPT-05: a clamp may only hide text: a clamp or ellipsis box whose cut set (whole or partial) holds a control fails
    for (const c of r.clipped) c.rule = c.viewport || !(c.whole?.length || c.partial?.length) ? 'clip' : c.truncation && [...c.whole, ...c.partial].some(p => p.kind === 'control') ? 'partly clipped' : c.partial.length ? (c.truncation ? 'truncated' : 'partly clipped') : r.width !== 1440 && c.whole.some(p => shown1440.has(p.print)) ? 'shown at 1440, lost at this width' : 'reveal';
    const lostByClip = new Set(r.clipped.flatMap(c => [...(c.whole || []), ...(c.partial || [])].map(p => p.print))); // reported once, by its clip rule
    const lostHere = r.width === 1440 ? [] : lostPrints(shownAt1440, r.shownPrints).filter(p => !lostByClip.has(p));
    const eq = coverByEquivalents(lostHere, g1440, groupsByWidth[r.width]); // R24-GPT-03: tabs adapted into an accordion
    r.lost = lostHere.filter(p => !eq.has(p)).map(print => ({ print }));
    if (eq.size) r.equivalent = [...eq];
    r.passExceptReveal = r.rest && r.clipped.every(c => ['reveal', 'truncated'].includes(c.rule));
    r.pass = r.passExceptReveal && r.clipped.length === 0 && r.lost.length === 0;
    delete r.shownPrints; delete r.rest; delete r.composites; delete r.disclosures;
  }
  return { results, shownAt1440, shownByWidth, groups1440: g1440, groupsByWidth, pass: results.every(r => r.pass), passExceptReveal: results.every(r => r.passExceptReveal), note: 'Automated width screen only; 320 CSS px approximates a 1280 px desktop at 400% zoom. Actual zoom, text spacing and WCAG reflow exceptions still require manual evidence; every reflow candidate needs a recorded decision.' };
}

// R20 (Mi'mar's clipping tiebreak, rule 2): a `reveal` clip (content cut wholly at 1440 in one state) is resolved only
// when another declared, applicable state of the same screen and language shows every cut element at 1440 (an
// accordion's expanded state, a carousel slide state); that state is graded normally. In the wireframe phase (only the
// default state is rendered) an unresolved reveal is DEFERRED. Mutates each widths result: per-width pass, overall pass
// and `reveals` (with `revealedBy`). scopes: [{ scope: { screen, state, lang }, widths }].
export function resolveReveals(scopes, phase = 'handoff') {
  const unresolved = [];
  for (const { scope, widths: w } of scopes) {
    if (!w?.results) continue;
    for (const r of w.results) {
      const others = scopes.filter(o => o.scope && scope && o.scope.screen === scope.screen && o.scope.lang === scope.lang && o.scope.state !== scope.state);
      // R21-GPT-03: matched by print (normalised text or accessible name), never by DOM position
      const at = (o, width) => (width === 1440 ? o.widths?.shownAt1440 : o.widths?.shownByWidth?.[width]) || [];
      for (const c of r.clipped.filter(c => ['reveal', 'truncated'].includes(c.rule))) {
        // each cut element needs a declared state that shows it (a carousel's slides are shown by different slide states);
        // a reveal is shown at 1440, a truncation's full text at the same width
        // R22-GPT-06: a truncation's expanded state must show ALL the clamped content (every whole and partial item) at
        // that width, in one declared state
        // R24-GPT-02 (Mi'mar's tiebreak): matches to a reveal or expand state are one to one, like losses between widths: each
        // hidden control consumes one shown control of the same name (action family) in that state (two hidden Downloads
        // need two shown; a carousel's slides are still shown by different slide states); text keeps any-copy matching
        const items = c.rule === 'reveal' ? c.whole : [...c.whole, ...c.partial], width = c.rule === 'reveal' ? 1440 : r.width;
        const capacity = (o, used, p) => { if (!isControlPrint(p)) return printShown(at(o, width), p); const k = printKey(p), n = (counts(at(o, width)).get(k) || 0) - (used.get(k) || 0); return n > 0; };
        const assign = (o, used, p) => { if (!capacity(o, used, p)) return false; if (isControlPrint(p)) used.set(printKey(p), (used.get(printKey(p)) || 0) + 1); return true; };
        const full = c.rule === 'truncated' ? others.find(o => { const used = new Map(); return items.every(p => assign(o, used, p.print)); })?.scope.state : null;
        const usedBy = new Map(others.map(o => [o, new Map()]));
        const states = c.rule === 'truncated' ? items.map(() => full) : items.map(p => others.find(o => assign(o, usedBy.get(o), p.print))?.scope.state);
        const by = states.every(Boolean);
        c.revealedBy = by ? [...new Set(states)] : null;
        if (!by) { c.deferred = phase === 'wireframe'; unresolved.push({ ...scope, width: r.width, rule: c.rule, paths: items.filter((p, i) => !states[i]).map(p => p.path), text: items.filter((p, i) => !states[i]).map(p => p.text), deferred: c.deferred }); }
      }
      for (const l of r.lost || []) {
        // one to one: the declared state must show as many controls of that name (action family) as 1440 shows here
        const need = (w.shownAt1440 || []).filter(p => printKey(p) === printKey(l.print)).length || 1;
        l.reachableIn = others.find(o => printShown(at(o, r.width), l.print, need) || coverByEquivalents((r.lost || []).map(x => x.print), w.groups1440, o.widths?.groupsByWidth?.[r.width]).has(l.print))?.scope.state || null;
        if (!l.reachableIn) { l.deferred = phase === 'wireframe'; unresolved.push({ ...scope, width: r.width, rule: 'shown at 1440, not shown at this width', paths: [], text: [l.print.slice(0, 60)], deferred: l.deferred }); }
      }
      r.pass = r.passExceptReveal && r.clipped.every(c => !['reveal', 'truncated'].includes(c.rule) || c.revealedBy || c.deferred) && (r.lost || []).every(l => l.reachableIn || l.deferred);
    }
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
