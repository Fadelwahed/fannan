# Mi'mar R10 changes: Argon round 5 (ARGON-R5-01..05)

Branch `mimar-r4-fixes`, from b24fd1f (draft PR #1). Last code/package commit: dacc74a. Written Oct 18 2026, about 3:45 AM Gaza (UTC+3). This record is the latest round record: the only file besides the registry left unhashed (OPUS-R2-03 rule, `release/PACKAGING.md`). `reviews/MIMAR-R9-changes-e88cf69.md` is now hashed in the registry and left unchanged. Argon's review is saved verbatim as `reviews/ARGON-R5-b24fd1f.md` (hashed, not in the ZIP). No `GROK-*` or `CODEX-*` file was added or changed. `main`, `grok-review`, `codex-r3-fixes` and `codex/fannan-r3-review` were not touched. No force push.

Argon closed ARGON-R2-06, -07 and -09. Each finding was checked against the code (and, for the browser findings, in real Chrome 155) before any change.

## Decisions recorded

- **Accent: fail closed (ARGON-R5-01).** Argon asked for a decision. Mi'mar's choice is to fail closed: a declared accent token that is not a valid colour, or no accent token at all, gives null ratios, and null is a FAIL on the handoff page check and on every state check, never a skipped check or a zero area. This matches the existing rule in `design-quality.md` ("borderline or unmeasurable coverage remains FAIL pending evidence"). In the wireframe phase the accent area stays deferred to Step 6, as the plan already says (wireframes are grayscale), so it is recorded (`accentInvalid`) but does not fail a wireframe run. Fadel can overrule this.
- **desktopWidths in the wireframe phase (ARGON-R5-03).** Fadel's rule is that every handoff declares `settings.desktopWidths` including 1440. The plan treats the Step 4 wireframe as a 1440 px desktop page set that goes through the wireframe phase of the gate, so it is a handoff under that rule. The contract already applies the rule in both phases, so nothing defaults to `[1440]`; see below.

## Fixes (each new test fails before and passes after, except 03; logs in `test-results/r10/`)

| Finding | Commit | Verified against the code | Change | Before / after |
|---|---|---|---|---|
| ARGON-R5-01 P1 `design-probe.mjs` | 084d870 | Confirmed. The area lines branched on `accent`, not on the normalised colour, so `--colors-accent: not-a-colour` gave `accentRatio` 0 (the R9 test even asserted 0). The first non-empty variable won, so an invalid `--accent` shadowed a valid `--colors-accent`. Sibling: `maxViewportAccent = Math.max(...viewportRatios)` turns null into 0. | The first VALID candidate is measured; `accentInvalid` lists declared invalid names; any invalid name or no valid one gives null ratios. `maxViewportAccent` is null if any scrolled ratio is null, and the state check requires `!== null`. | before: 3 fail / after: 3 pass. Invalid `--accent` over valid `--colors-accent` gives null, `accentInvalid: ['--accent']`; invalid only gives null; valid > 0; none gives null |
| ARGON-R5-02 P2 `width-screen.mjs` | 56713fa | Partly confirmed. `body{overflow-x:hidden}` alone was already caught (it moves to the viewport, and `scrollWidth` stays 1400). `html` and `body` both hidden or clip, `html` clip alone, and mixed hidden/clip were missed: the root `scrollWidth` stayed at 1280, `body` was outside `body *`, and `overflow: clip` reports no scroll width. | Screens `body, body *`; `documentWidth = max(root, body scrollWidth)`; an `overflow-x: clip` box is clipped when a descendant's box crosses its left or right edge. | before: fail / after: pass, for 8 html/body combinations at 1280 px; a fluid page with hidden overflow still passes |
| ARGON-R5-03 P2 wireframe widths | 7f5903d | **Not reproduced.** `checkHandoff` has no wireframe early return: the `desktopWidths` rule (handoff-contract.mjs:66-67) runs in both phases, so a wireframe without widths already fails the contract as well as the width screen. That matches Fadel's rule. | No code change. A regression test pins the rule for the wireframe phase (missing, empty and 1440-less lists fail; `[1440]` passes), and `handoff-contract.md` now says "in both phases". | passes before and after (pin test) |
| ARGON-R5-04 P2 `package-r3.py` | 75c34de | Confirmed. The registry names from `coverage(start)` were hashed only after five outputs were replaced. A deleted path raised `FileNotFoundError` mid-write. A symlinked file, or a file under a symlinked folder, was silently hashed through the link. | `names` is computed once, before any write. Every name except this build's own outputs must be a regular file with no symlink at any level of its path (`regular_in_root`). The same list feeds the registry. | before: 3 fail + 1 error / after: 4 pass. Each rejected case keeps all six outputs byte-for-byte |
| ARGON-R5-05 ENH left edge | 56713fa | Confirmed: `position:relative; left:-200px` text gave no finding. Also found: the existing clip rule flagged a standard sr-only skip link (1×1 px, `overflow:hidden`) as clipped text. | Text or media with `r.left < -1` is recorded in `offscreenLeft` and fails the width. Exempt: items inside an `overflow-x: auto/scroll` ancestor, sr-only content (≤1×1 px, `clip: rect(0 0 0 0)`, `clip-path: inset(50%)`; also exempt from the clip rule now), and a focusable absolute/fixed element wholly left of the viewport (skip-link pattern). Documented in `design-quality.md` and `UNTESTED.md`. | before: 2 fail / after: 2 pass |
| R10 ZIP evidence | 29510c1 | `archive_paths()` had no `test-results/r10`. | Added, like R4-R9; the test also asserts the Argon review is not in the ZIP. | before: fail / after: pass |
| R10 whitespace sibling | 7746f54 | The source-only whitespace gate (it excludes only `*.log`) failed on `test-results/r9/versions.txt:3` (trailing space from `google-chrome --version`). The R9 record's "exit 0" claim was wrong for that file. | Trailing space stripped (version text unchanged); the R10 `versions.txt` is written the same way. | `git diff --check eb2d540..HEAD -- . ':(exclude)test-results/**/*.log'`: failed before, exit 0 after |

## Results (Node v22.23.3, Python 3.13.5, Chrome 155 test-only)

Executed:

| Suite | Result |
|---|---|
| Node, pinned test-only deps | 59/59 pass, 0 fail |
| Node, no deps | 43 pass, 0 fail |
| Node v20.19.2 | 53 pass, 6 fail: the intended `Node 22.12+ required` refusals (same six as R7-R9) |
| Python guard tools | 10/10 |
| R2 Node / R2 Python | 4/4, 4/4 |
| Package tests | 22/22 in the git checkout; 19 pass in a no-git copy |
| Package self-test | PASS |
| design.md lint 0.4.0 offline | example 0 errors/1 warning; fixture 0/2; OPUS-04 sample 0/0 |
| Syntax | mjs=27 sh=4 py=4 plus the launcher `.internal`, 0 failures (R9's log said 28; no `.mjs` was added or removed since, and the cause of that difference is UNVERIFIED) |
| `git diff --check eb2d540..HEAD` (logs excluded) | exit 0 |

SKIPPED (not run, not counted): 16 Node tests without deps (need deps or Chrome); 3 package tests in the no-git copy.

Fixture, expected stop: `local-fixture.mjs` exit 0 (run in the checkout, because it refuses a symlinked deps folder). Browser, contract, spacing, widths (1440 + 320, page and state, with the new body and left-edge screens) and state checks pass, then every gate run stops at launcher exit 3 `pinned binary missing; no download fallback` (asserted). This is **not** a gate PASS; the real detector never ran.

## Package

- `build --start 9ee1ca6aaa4a257cb84fb7381056005f48554bf3`: release manifest `041c2ef600c91be81a48920bd5ef2403f738ec472d8915b24ec7515d73e08879` (74 files), archive `17c5dcae9a617cac779fcaf9743c52d86bd9ae29b4e7963349bcb31d7f758ee2` (362 entries, including 25 in `test-results/r10`, and no Mi'mar, CODEX or ARGON records).
- `--registry-sha256 ca2a5fd252e34c092ea1e7abeee32e5a6b6ac395f7acc88a81f2217924ec1008`. 288 changed, 287 hashed, 0 uncovered; at build only the registry is excluded. The R9 record and the Argon review are hashed.
- Anchored verify in a separate clone at dacc74a, trust files at 0444: PASS, `registryPin: external`. Wrong pin: exit 1 (`registry pin mismatch`). No pin: exit 1 (`unanchored registry`). `verify-manifest.sh`: `MANIFEST OK (74 files)`.
- Secret pattern grep over `git diff b24fd1f..HEAD` and the extracted ZIP: 0 hits.

## Effects to know

- A page whose accent token is declared but invalid (or, for `--accent`, shadows a valid Style Dictionary name with an invalid value) now fails the handoff check instead of passing with zero accent area.
- Pages with `html, body { overflow-x: hidden }` (or `clip`) and a layout wider than a declared width now fail the width screen; text or images positioned off the left edge fail too.
- A standard sr-only skip link is no longer reported as clipped text.
- `package-r3.py build` now refuses a changed path that is deleted, symlinked or under a symlinked folder before writing anything (earlier: mid-write crash, or a silent hash through the link).

## Untested

- Accent: Chrome 155 only; colours outside sRGB may round differently. Wireframe runs record an invalid accent but do not fail on it (deferred visual check).
- Width screen: Chrome 155 only. sr-only variants other than the three patterns above may be reported and need a manual decision. Whether an exempt skip link actually appears on focus is left to the focus probe and manual review. Content cut off on the right by a clipping ancestor other than `body` is reported only through that box's text overflow.
- Package: the registry pre-check was tested with temporary trees; the live build ran on a clean tree.
- Still not tested: the real Impeccable binary, a full gate PASS, real zoom and text spacing, the production browser pin and the target host. Installation stays BLOCKED pending Amin's review and Fadel's yes in Fannan's chat.
