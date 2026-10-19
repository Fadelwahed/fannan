# Fannan read-only review comparison
**Reviewed commit: b24fd1f** (mimar-r4-fixes, PR #1). Status also checked against **607b2e4** (fresh GitHub clone at /workspace/asad-fannan-607, never from Mi'mar's copy). Times are Asia/Gaza (UTC+3), 18 Oct 2026.

| Tool | Ran | Time | Verdict |
|---|---|---|---|
| Codex (`codex-dce`, read-only sandbox) | yes | 03:35:10–03:37:11 (2 min) | VERDICT: 3 ISSUES |
| Claude Code (`claude -p`, Read/Grep/Glob) | yes | 03:35:10–03:46:13 (11 min) | VERDICT: 9 ISSUES |
| Grok CLI | no | 03:35:10, failed after 2s | `API error (status 402 Payment Required): Grok Build usage balance exhausted` |

## Shared findings (both tools)
| # | Sev (Codex/Claude) | Finding | My check at b24fd1f | 607b2e4 |
|---|---|---|---|---|
| S1 | P1/P2 | package-r3.py:190-191 hashes changed-file registry inputs (git diff incl. deleted paths) only AFTER FANNAN-REWRITE.md, trust files, ZIP, report are written → partial outputs on failure; contradicts R9 "validate before write" | **Confirmed** (writes at 184-189, `manifest(...names)` at 191) | **Fixed**: ARGON-R5-04 pre-write `unhashable` check for missing/symlinked/non-regular registry inputs before any write |
| S2 | P1/P2 | design-probe.mjs:13/24 glass check only scans `body *`: misses html, body (and ::before/::after per Claude) → backdrop-filter hard fail bypassable | **Confirmed** (code reading; not run in browser) | **Still open**: design-probe.mjs:10,28 still `querySelectorAll('body *')` + `c.backdropFilter` |
| S3 | P1/P2(UNVERIFIED) | width-screen.mjs 320px reflow: Codex — text inside `overflow-x:auto` scroller passes; Claude — html/body clip not screened | **Confirmed** at b24fd1f (loop `body *` only, clip only for hidden/clip, overflow only on root) | **Partly fixed**: body now screened (ARGON-R5-02) and clip measured; nested `auto/scroll` scrollers are now explicitly *exempted* (`inHorizontalScroller`) → Codex's case **still open** (unverified by run) |

## Unique — Claude only
| # | Sev | Finding | My check | 607b2e4 |
|---|---|---|---|---|
| C1 | P1 | axe runOnly omits `wcag21a` (pre-handoff-check.mjs:110,157); `label-content-name-mismatch` (SC 2.5.3, Level A) tagged only wcag21a in pinned axe 4.14.0 → below WCAG 2.2 AA floor | **Confirmed** (axe.js:37472 tags) | **Still open** |
| C2 | P2 | Accent taken from page-declared var; invalid accent → area 0 → passes | **Confirmed** at b24fd1f | **Fixed** (ARGON-R5-01 fails closed on invalid/missing). Self-declared accent source remains (partly) |
| C3 | P2 | Probes run in page main world after page JS; page can monkeypatch getComputedStyle etc. | **Partly**: no javaScriptEnabled:false / pristine-builtin capture found; exploit not run | Still open (unverified exploit) |
| C4 | P2 | package-r3.py files() would package git-ignored `.env`/.DS_Store | **Confirmed** no such filter in package-r3.py | Still open |
| C5 | P3 | FANNAN-PLAN.md:129 names a real company ("Digital Cloud") in generic plan | **Confirmed** | Still open |
| C6 | ENH | No real-Chrome test for glass on pseudo/body/html | Confirmed (follows S2) | Still open |

## Unique — Codex only
None beyond the shared three.

## My own extra note (not from tools)
- spacing-scale.mjs:23 checks marginTop/Bottom but not marginLeft/Right (P3, confirmed by reading; still present in 607b2e4).
- Hard-fail `stockGlass` threshold is 0 in config (test design-probe.test.mjs:15), so "any glass" is enforced *where detected*.

## Raw outputs
- out/codex.log (full transcript), out/codex.findings.md, out/claude.log, out/grok.log, out/*.time; prompt: prompt.md

---

# Appendix: raw outputs (copied verbatim from /workspace/scratch/fannan-review on 18 Oct 2026, about 3:55 AM Gaza)

Scanned for secret patterns before copying: 0 hits. Not copied: `out/codex.log` (356,547 bytes, the full Codex transcript; also 0 secret-pattern hits); its final findings are `out/codex.findings.md` below.

## prompt.md

````text
You are an independent READ-ONLY reviewer of the Fannan repo, a local clone at the current directory, detached at b24fd1f (branch mimar-r4-fixes, draft PR #1). Never edit, create, move or delete files; no commits, pushes, installs or network. Read-only commands (git, grep, running existing tests) are fine. Someone else implements fixes.

Files: plan release/FANNAN-PLAN.md, release/OPEN-QUESTIONS.md, release/UNTESTED.md, release/INSTALL-ACCEPTANCE.md, release/VERIFICATION.md, release/PACKAGING.md. Code release/tools/*.mjs *.sh *.py (key: pre-handoff-check, handoff-contract, width-screen, focus-screen, spacing-scale, token-references, design-probe, executable-trust, verify-deps, local-file-boundary, safe-write) and scripts/package-r3.py. Tests release/tests/ and scripts/test_package_r3.py. Latest change record reviews/MIMAR-R9-changes-e88cf69.md (earlier R5-R8 in reviews/).

Focus:
1. Are the round-4 fixes right? Package validates everything before writing and swaps outputs atomically; px/rem/em spacing converted correctly; accent colour read from a detached canvas; a single checkValue checks both literals and references; clipping counts only on real overflow.
2. Hard fails enforced: any backdrop-filter or glass effect; negative spacing tokens; bare unitless spacing numbers (0 allowed); 320px reflow; settings.desktopWidths missing or without 1440; WCAG 2.2 AA as the minimum.
3. Bypasses: symlinks, protected-path order, anchored registry pin (--registry-sha256), unhashed files. Only the registry and the latest MIMAR record may stay unhashed.
4. Instructions stay generic (no client, country or company facts); tools stay swappable.
5. Anything untested described as tested. Known untested (don't report these as new): Impeccable binary, full gate PASS, /opt/fannan/bin, production pin, target host, calc()/clamp() spacing.

Severity: P1 gate loosened / fix wrong / data loss / broken build; P2 real bug, limited impact; P3 minor; ENH improvement.
Rules: evidence for every finding (file:line + quote). Unconfirmed => prefix UNVERIFIED:. No praise, no summary. Never print secrets.
Output ONLY a list: `- [SEV] file:line — problem (why) — fix`, sorted P1..ENH. End with `VERDICT: N ISSUES`, or `VERDICT: ZERO ISSUES` if none.
````

## out/codex.findings.md

````text
- [P1] scripts/package-r3.py:191 — Changed-file inputs are hashed only after five outputs are replaced: `manifest([ROOT / name for name in names], ...)`. A deleted or unreadable changed file outside the archive therefore leaves a rejected build with overwritten outputs and an old registry; reproduced with an in-memory writer — Validate and read every registry input before writing, and stage all six outputs before replacement.

- [P1] release/tools/design-probe.mjs:13 — Glass detection examines only `document.querySelectorAll('body *')`, then counts `c.backdropFilter !== 'none'` at line 24. Filters on `html`, `body`, or rendered pseudo-elements escape the hard fail; an in-memory body-filter probe returned `glass: 0` — Include root/body styles and rendered pseudo-elements, with regression cases for each.
- [P1] release/tools/width-screen.mjs:12 — Overflow detection restricts descendants to `['hidden', 'clip']`; line 18 checks horizontal overflow only on the document root. Ordinary text inside an `overflow-x:auto` container can require horizontal scrolling at 320px while the width gate reports PASS; reproduced in memory — Detect nested horizontal scrolling and fail ordinary text reflow, requiring explicit reviewed evidence for applicable WCAG exceptions.
VERDICT: 3 ISSUES
tokens used
100,262
````

## out/claude.log

````text
- [P1] release/tools/pre-handoff-check.mjs:110 — `runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }` leaves out `wcag21a`. In the pinned axe-core 4.14.0, `label-content-name-mismatch` is tagged only `'wcag21a', 'wcag253'` (`/workspace/fannan-testdeps/node_modules/axe-core/axe.js:37472`). So the WCAG 2.1 Level A rule for SC 2.5.3 Label in Name never runs, and the gate falls below the stated "WCAG 2.2 AA" minimum. Same list at :157 for every state. — Add `'wcag21a'` (and `'wcag22a'` so later axe versions are covered) at both call sites. Add a test that checks the full A/AA tag set.
- [P2] release/tools/design-probe.mjs:10-11,17-20 — The accent budget relies on a colour the page declares itself: `['--accent', '--colors-accent', '--colors-primary'].find(...)`, and a hand-declared `--accent` wins. After R9, an invalid accent gives `accentComputed = null` → `painted = []` → `accentArea = 0`. That passes `design.accentRatio <= q.accentAreaRatioFullPage` (pre-handoff-check.mjs:108), and the test locks it in as expected behaviour (`design-probe.test.mjs:63` `accentRatio, 0, 'an invalid accent matches nothing'`). A page can set `--accent:x` or any unused colour and paint its real accent over any area. This is the same class of issue as CODEX-R3-02 (scale read from the page). — Take the accent from the hash-checked handoff tokens, as `approvedSpacing` does for spacing. Return `accentRatio: null` (fail) when the accent can't be normalised.
- [P2] scripts/package-r3.py:166,190-191 — `coverage(start)` before writing only lists names. It doesn't check that they exist. `changed()` uses `git diff --name-only` (line 108), which includes deleted paths. So when a file was deleted since `--start`, `manifest([ROOT / name for name in names], ...)` hits `FileNotFoundError` in `sha()`. That happens after FANNAN-REWRITE.md, both trust files, the ZIP and the report have already been replaced (lines 184-189). This breaks the R9 claim "all inputs are checked before the first write" (MIMAR-R9 record line 15) and leaves a partial mix of new outputs. — Build the registry bytes before any write and fail early on missing or non-regular names (or use `--diff-filter=d` and decide deliberately how deletions are recorded). Add a deleted-file case to `BuildOrderTests`.
- [P2] release/tools/design-probe.mjs:24 — `const glass = rects.filter(({c}) => c.backdropFilter !== 'none').length;` reads only `getComputedStyle(e)` for `body *`. It misses `::before`/`::after` (`.card::before{backdrop-filter:blur(8px)}`), and it misses `body` and `html` themselves. So a glass effect passes the "any backdrop-filter = hard fail" rule. — Also check `getComputedStyle(e, '::before'/'::after')`, `document.body` and `document.documentElement`. Include `-webkit-backdrop-filter` if the pinned browser reports it separately. Add a pseudo-element test.
- [P2] release/tools/pre-handoff-check.mjs:105 — `designProbe`, `spacingProbe` and `inspectLayout` run through `p.evaluate` in the page's main world, after page scripts run (`.js` is an allowed asset type, local-file-boundary.mjs:5). Page JS can redefine `window.getComputedStyle`, `Element.prototype.getBoundingClientRect` or the canvas `fillStyle` setter, and so make every probe report clean. The R9 hardening only covers page CSS. — Run the probes with `javaScriptEnabled: false` for measurement, or capture pristine built-ins in an `addInitScript` before page code runs. Add a test with a page script that monkeypatches `getComputedStyle`.
- [P2] UNVERIFIED: release/tools/width-screen.mjs:9,18 — Clipping is only checked for `document.querySelectorAll('body *')`, and overflow only through `root.scrollWidth > root.clientWidth + 1`. A page with `html{overflow-x:clip} body{overflow-x:clip}` (or `body{overflow:hidden;width:100vw}`) can cut wide content at 320 px with no root scroll overflow and no flagged descendant. That would get around the 320 px reflow hard fail. — Include `body` and `html` in the clip loop. Also compare the max descendant `getBoundingClientRect().right` against `innerWidth`.
- [P2] scripts/package-r3.py:28-35 — `files()` refuses symlinks, caches, `node_modules` and `.git` only. It packages every other file in `release/`, `input/` and `test-results/r*`, including git-ignored ones (`.gitignore:6-7` `.env`, `.env.*`, and `.DS_Store`). A stray `release/.env` would be hashed into MANIFEST.sha256 and shipped in the ZIP. — Refuse `.env`, `.env.*` (except `.env.example`) and `.DS_Store`, or refuse anything `git check-ignore` matches. Add a test.
- [P3] release/FANNAN-PLAN.md:129 — "The supplied **labelled Digital Cloud example** is used only as a dry-run…" puts a real company name in the generic plan, which is meant to carry no client or company facts. The same name is the file title at `release/references/example-project-check.md:1`. — Use a neutral label (for example, "supplied example project") and keep the company name only in evidence and provenance files.
- [ENH] release/tests/design-probe.test.mjs:13-19 — The glass gate test only counts source strings (`'design.glass <= q.stockGlass'`) and the one real-Chrome case covers element-level `backdrop-filter`. No test puts a glass effect on a pseudo-element, `body` or `html`. — Add real-Chrome cases for those placements.

VERDICT: 9 ISSUES
````

## out/grok.log

````text
Internal error: {
  "message": "API error (status 402 Payment Required): Grok Build usage balance exhausted",
  "http_status": 402
}
Error: Internal error: {
  "message": "API error (status 402 Payment Required): Grok Build usage balance exhausted",
  "http_status": 402
}
````

## out/codex.time

````text
START Sun Oct 18 03:35:10 EEST 2026
END Sun Oct 18 03:37:11 EEST 2026 rc=0 secs=121
````

## out/claude.time

````text
START Sun Oct 18 03:35:10 EEST 2026
END Sun Oct 18 03:46:13 EEST 2026 rc=0 secs=663
````

## out/grok.time

````text
START Sun Oct 18 03:35:10 EEST 2026
END Sun Oct 18 03:35:12 EEST 2026 rc=1 secs=2
````
