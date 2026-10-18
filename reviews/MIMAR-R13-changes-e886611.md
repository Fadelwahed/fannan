# Mi'mar R13 changes: panel round 13 (Opus and GPT)

Branch `mimar-r4-fixes`, from f9a8d7e (draft PR #1). Last code/package commit: e886611. Written Oct 18 2026, about 5:55 AM Gaza (UTC+3). This is the latest round record: the only file besides the registry that may stay unhashed. The R12 record (`reviews/MIMAR-R12-changes-eb048fc.md`) is now hashed in the registry.

Inputs: `reviews/panel-r13/MERGED.md` (21 agreed items N01-N21, 1 disputed D1, questions q1/q2) plus the round-1 and cross-check reports (`r1-*.md`, `x-*.md`). The raw `.log`, `.runner` and `.time` files were not copied; the copied files were secret-scanned with no hits. Every agreed item was fixed at the HIGHER of the two severities, within the threat model Fadel set for this round.

Registry: `trust/R3-CHANGES.sha256` sha256 `7acba324946a5211705c03407ed93dbb31dffd3495b5e46ff2bcf1157d6f3309`.

## Threat model and convergence rule (Fadel, this round)

Both are now in `release/FANNAN-PLAN.md` ("Threat model for the pre-handoff gate", "Review convergence rule") and are referenced from `VERIFICATION.md` (R13 section) and `UNTESTED.md` (R13 section). In short, pages come from honest but possibly sloppy authors. The gate catches ordinary patterns completely and fails closed on what it cannot measure. Deliberate obfuscation gets cheap defences where they are simple; anything beyond that is a known limit, ENH in future rounds. A round passes with zero P0, P1 and P2 findings; P3 and ENH items are batched and don't block.

## Items

| Item | Severity used | Result |
|---|---|---|
| N01 | P1 | FIXED. When `html` overflow is visible, `body` overflow propagates to the viewport, so `body` is not treated as a clipping box; text pushed past the left edge (negative margin, transform) is `offscreenLeft` at 1440 and 320 (Chrome regression). |
| N02 | P1 | FIXED. Visibility uses computed style plus text-range rects; a tiny box counts as screen-reader-only only if it also clips (`overflow` hidden/clip). `display: contents`, 0x0 nowrap inline-block and a height:0 heading pushed left all fail now; a real sr-only label still passes. |
| N03 | P2 | FIXED. Composed ancestry (`within`, a `holds` set through shadow hosts) and composed text detection: open-shadow text clipped by its host is `clipped`. |
| N04 | P2 | FIXED. `iframe`, `frame`, `object`, `embed`, `fencedframe` and `portal` are frames for the probes (`unscannedFrames`, so the handoff fails) and unscanned scopes for the width screen. `<object>`/`<embed>` regression in Chrome; fencedframe/portal by selector only (UNTESTED). |
| N05 | P2 | FIXED. Executed fixture negative runs: a `srcdoc` iframe gives a handoff FAIL, a failing state and DEFERRED in wireframes. A spacing exception without an entry FAILs, and with an approver entry it PASSes (the contract passes too). |
| N06 | P2 | FIXED. Fixture: a state page whose script removes a wide element fails its state with an integrity mismatch (`horizontalOverflow`, `reflowFail`), while the positional page and default state pass. Every R13 before log fails at an assertion, not at module load (checked; one `mismatches[0].check` was made `?.` so it stays an assertion). R12 record corrected below. |
| N07 | P2 | FIXED. The probe lists every stylesheet (document, open shadow roots, one level of `@import`, adopted sheets) with href, owner and readability. `data:`/`blob:` hrefs are refused; an unreadable sheet the checker did not serve fails. The check runs on the page and on every state, and the count is in the integrity vector. Base64 regression in Chrome. |
| N08 | P2 | FIXED (cheap version, per the threat model). For HTML/JS/SVG text, `\xNN`, `\uNNNN` and `\u{...}` are decoded before matching; CSS keeps its own unescape. Remaining limits (concatenation, `fromCharCode`, `atob`, runtime-built names) are in UNTESTED.md. |
| N09 | P1 | FIXED (cheap version). The raw and the comment-stripped text are both matched, and either match counts, so `"/*"` ... `"*/"` inside strings cannot hide glass. A real CSS comment is still stripped. |
| N10 | P2 | FIXED (with q2). A credential word anywhere in a path part (credential, secret, service account, token, password, passwd, API key, private key, access key; plural and infix too) is refused, in package input and in changed paths. Exact reviewed names are kept: `token-references.mjs`, `token-validation.test.mjs`, `secret-scan.json`. Temp-tree tests cover 13 names. |
| N11 | P2 | FIXED. The vector is the canonical gate result and now adds accent ratios (and the scrolled-viewport maximum), filler, rule of three, frames, unscanned stylesheets, unscanned scopes and contrast unknown/coverage. Width fields are per-width maps, so a failure moving between widths is a difference. Tests: ratio-only, copy-signal-only (via the full-vector loop) and width-swapped cases. |
| N12 | P2 | FIXED. `contrastUnknown` and `contrastChecked` are in the vector. Zero JavaScript-off coverage, where the probe had coverage, is INCOMPLETE. |
| N13 | P1 | FIXED. The content record compares normalised visible text per copy slot and per heading (level and text), including open shadow roots. An empty-skeleton JavaScript-off rendering is INCOMPLETE. |
| N14 | P2 | FIXED (Fadel: INCOMPLETE, no new status). Non-equivalent JavaScript-off content is never PASS. Unexplained, it is a mismatch. With a reviewed `content` entry, the entry is kept in `expectedDifferences` and the result stays INCOMPLETE. A between-world tampering sign outranks INCOMPLETE. |
| N15 | P2 | FIXED. Keyboard reach needs targets that start at the extent's left edge, step by at most the visible span, and reach the right edge, or a focusable scroller. Narrow-overflow table regression (one 40px link in a 340px table) fails. |
| N16 | P1 | FIXED. Closed shadow roots are counted through CDP `DOM.getDocument({depth:-1, pierce:true})` and listed as `unscannedScopes` at every width, so the handoff fails. If counting fails, the run records a document-level unscanned scope. |
| N17 | P2 | FIXED. The rAF wrapper binds the native function at install (`Function.prototype.call.bind(requestAnimationFrame)`), so a patch-capture-restore of `Function.prototype.call` captures nothing (Chrome: before, the page captured the native rAF and ran 44 callbacks with the counter stuck at 1; after, nothing is captured). `call`, `apply`, `bind` and `Reflect.apply` are in `nativeCheck`. |
| N18 | P2 | FIXED. One hardened `motionFor` routine (reduced-motion context, private rAF counter read in the main world, Web Animations, element snapshots) runs for the positional page and every declared state; the old weaker per-state block was removed. Child-frame rAF coverage is not separately tested (UNTESTED). |
| N19 | ENH | FIXED. `tamperSigns` has no default; omitted, undefined, null or a non-array is INCOMPLETE. |
| N20 | P2 | FIXED. One composed-tree walk (open shadow roots) for spacingProbe, designProbe counters, placeholders, h1 and the copy walker; Chrome regression per check. |
| N21 | P3 | FIXED. UNTESTED.md and design-quality.md now say frames are "partially inspected, for glass and width, and every frame fails the handoff"; the R11/R12 lines are marked superseded. Hashes refreshed by the package build. |
| D1 | disputed | CLOSED (Fadel). His rule bans negative spacing tokens: the approved scale only holds positive lengths, so negatives are always off-scale. A scoped, approver-named margin exception may still excuse a negative margin on one element; that is a reviewed per-element decision, not a token. Recorded in design-quality.md. |
| q1 | decision | Blanket frame stop kept and extended to `object`, `embed`, `fencedframe` (and `portal`). No `frameExceptions`. Embedded third-party content is handed off as a static poster plus an engineering note in `HANDOFF.md`, as documented in design-quality.md. In-frame scanning will be revisited only once every gate runs inside frames. |
| q2 | decision | `tokens.json` is allowed only where the `handoff.json` beside it declares that path (`tokens.json.path` ends with it) and its sha256, and the content is design tokens: every leaf is a `$value` node, with no credential keys (access, refresh or id tokens, client secrets, passwords, API or private keys). Every other credential-style name is refused. A stdlib content screen refuses obvious secrets in every packaged or hashed file. |

## Corrections of earlier claims

- **R12 overclaim (N06):** the R12 record (line 46) said "every R12 group fails on the d8408d4 sources". That was not behavioural for every group. `R12-M06-M08-M13-M17-M21-integrity-before.log` failed at module load (`SyntaxError`: no export `VECTOR` in the d8408d4 `integrity.mjs`), so none of its assertions ran. In `R12-M15-M16-M20-spacing-before.log` the M20 test failed at a missing module (`tools/exceptions.mjs`), not at an assertion. Those two before results are module-load failures, not behavioural evidence. R12 also claimed per-state integrity (M07) without a fixture where only a state fails; R13 adds that fixture (N06). In R13 every before failure is an assertion failure.
- **R11/R12 frames wording (N21):** "frame content is still not inspected" and "same-origin frames are measured" are superseded by "partially inspected, for glass and width, and every frame fails the handoff".

## Verification

- Node 22: 94/94 with test-only deps; 63 PASS + 31 SKIPPED without deps. Python guard tests: 10. `revisions/r2`: 4 + 4. Package tests: 30 (git checkout), or 26 + 4 skipped (no-git copy). Self-test passes. Syntax: mjs=36, sh=4, py=4, plus the launcher. design.md lint: 0 errors. Node 20 (informational): 88 PASS, plus the same 6 Style Dictionary failures as before.
- Fixture: exit 0, the expected stop (pinned Impeccable binary absent). Claims and negative runs are asserted (`test-results/r13/local-fixture.log`, `local-fixture-evidence.json`).
- Before/after: `test-results/r13/R13-*-{before,after}.log`. Before means the R13 tests run against the f9a8d7e sources; every group fails there at assertions and passes on R13. The fixture before run stops at its R13 claims assertion (stylesheets, state reduced motion), before the negative runs. Chrome reproduction: `repro-before.log` / `repro-after.log`.
- Anchored verify in a fresh GitHub clone after the push, plus the manifest check and the secret grep: see the final report for this round.

## UNTESTED (labelled)

- No test renders a `fencedframe` or `portal`; only the selectors are checked.
- A closed shadow root inside a frame. The CDP-unavailable path (it records an unscanned scope) is not exercised.
- `@import` chains deeper than one level, and imports inside shadow-root sheets.
- Raw-glass obfuscation beyond the decoded escapes (concatenation, `fromCharCode`, `atob`, runtime-built names): a known limit, ENH.
- rAF from an `about:blank` child frame created after the init script; patches hidden from `Function.prototype.toString`; timer-driven motion after 700 ms.
- JavaScript-off equivalence for CSS-generated text (`content:`); slotted light-DOM content in nested shadow trees.
- Secrets in formats the content screen does not know, and binary files.
- Chrome 155 headless only. No other browser or OS.
