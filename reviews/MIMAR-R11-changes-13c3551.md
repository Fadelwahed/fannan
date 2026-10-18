# Mi'mar R11 changes: Asad panel round 5, built to the panel D1 decisions

Branch `mimar-r4-fixes`, from 607b2e4 (draft PR #1). Last code/package commit: 13c3551. Written Oct 18 2026, about 4:25 AM Gaza (UTC+3). This is the latest round record: the only file besides the registry that may stay unhashed.

Inputs: Asad's multi-tool review (`reviews/ASAD-PANEL-R5-b24fd1f.md`, 8 open items at 607b2e4) and the panel D1 decisions (Opus 5.5 and GPT-6.1-Sol, every item 2-0; `reviews/panel-d1/`). Where the two differ, the panel decisions win. Each finding was checked against the code, and the browser findings in real Chrome 155, before any change. All work was done on Mi'mar's box; Fadel's Mac was not used (rule from 3:55 AM).

## Panel decisions applied

- **A, accent (T1: no requirement that it be on a control).** Fail closed at final handoff. The accent must match the approved palette token (`colors.accent`, else `colors.primary`, from the hash-checked tokens). The message names the variable. Wireframes record DEFERRED, never PASS. The area is an approximate DOM proxy.
- **B, 320 px reflow (T2 BLOCK, T3 no caps).**
  - 2D content is a candidate only, recorded with its element and reason, with no automatic excuse.
  - Ordinary text or media overflowing any sideways scroller, left or right, fails. Resizable media is not a candidate.
  - A candidate's scroller must fit in 320 px and be keyboard-usable.
  - An unresolved candidate blocks the handoff. Only a `reflowExceptions` entry with the element id, a reason and a qaGate/approver reviewer resolves it.
- **C, probe integrity (T4: fail only if unexplained).** Probes and axe run in a CDP isolated world. Integrity cross-checks:
  - page world vs probe world;
  - native probe functions;
  - a JavaScript-off pass.

  An unexplained difference fails as `integrity mismatch`. Expected differences, recorded in `jsOffDifferences` with a reason, are kept in the evidence, not failed.
- **D, other items.**
  - wcag21a added.
  - Glass checked in html, body, ::before/::after, the -webkit- alias, open shadow roots, same-origin frames and constructed sheets.
  - Packaging from an explicit allowlist.
  - Generic pointer at FANNAN-PLAN.md:129.
  - Left, right and logical margins, with auto, 0 and documented exceptions allowed.
  - `desktopWidths` including 1440, already enforced in both phases and unchanged.

## Fixes (each new test fails before and passes after; logs in `test-results/r11/`)

Before logs run the final R11 tests against the 607b2e4 sources (`before-harness.sh.txt`).

| Finding | Commits | Verified against the code | Change |
|---|---|---|---|
| C1 P1 axe tags | 73a153a | Confirmed. `runOnly` listed wcag2a/2aa/21aa/22aa only, so `label-content-name-mismatch` (2.5.3, the only wcag21a rule in axe 4.14.0) never ran. | `tools/axe-tags.mjs`: wcag2a, 2aa, 21a, 21aa, 22a, 22aa plus target-size, used by both axe runs. The test checks every non-experimental A/AA rule of the pinned axe is selected, and that 2.5.3 fires in Chrome. |
| S2/C6 P1/P2 glass | fffefcd, b0c7a6b, 73a153a, 8206878 | Confirmed. Only `body *` was checked. Chrome 155 also computes `none` for the root element and drops the `-webkit-` alias. | Computed check on html, body, visible elements and rendered pseudo-elements, in open shadow roots and same-origin frames. Raw scan of style attributes, `<style>`, constructed sheets, and every served CSS/HTML/SVG/JS file. Any declared non-none filter fails (fail closed). |
| S3 P1/P2 320 px scroller | e11e30e, c6e800b, 8206878 | Confirmed. `inHorizontalScroller` excused everything inside any auto/scroll ancestor. | Candidates only (panel B). `reflowCandidates` in the evidence; `resolveReflowCandidates` blocks unresolved ones. Text is measured with text ranges, so text overflowing its own box counts. |
| C3 P2 page JS vs probes | 73a153a, 8206878 | Confirmed with a hostile page that patches `getComputedStyle` and `querySelectorAll` and pins a fake `axe`. | `tools/probe-world.mjs` (CDP isolated world) and `tools/integrity.mjs` (page vs probe world, native check, JS-off pass). |
| C4 P2 package junk/secrets | 2d8158b, f9d8313 | Confirmed: nothing refused `.env*`, `.DS_Store`, keys. | Suffix allowlist plus denial of secrets, OS junk, editor and VCS files, in package input and among changed paths, before any write. |
| C5 P3 generic instructions | d6844a7, 7890706 | Confirmed: a client name at FANNAN-PLAN.md:129 and in `references/example-project-check.md`; "Gaza" in release time labels. | Generic pointer to the supplied example fixture. Release time labels now say "UTC+3". A test bans the client and country names in release/ (tests excluded). |
| S7 P3 spacing margins | 08fc9a8, b0c7a6b | Confirmed: only top and bottom margins were checked. | Left and right margins (logical margins compute to them) are checked; `auto` is skipped via `computedStyleMap`. `data-fannan-spacing-exception="reason"` is recorded. |
| Panel A accent | b0c7a6b, 8206878 | The accent was whatever the page declared. | `approvedAccent` and `accentCheck` run on the page and on every state. |
| Panel B/C contract | c6e800b | — | `reflowExceptions` and `jsOffDifferences` are validated by `handoff-contract.mjs` and documented in `references/handoff-contract.md`. |
| ENH real-browser glass | b0c7a6b | — | Covered by S2 and panel D tests. |
| R11 ZIP evidence | 2d8158b | `archive_paths()` had no `test-results/r11`. | Added, like R4-R10. |
| Syntax 27 vs 28 | a6d3780 | Every commit from 7508478 to 2059077 has 27 tracked `.mjs` files. R9's 28 came from an untracked file that the scratch copy (tracked + untracked) picked up; its name was not logged and cannot be recovered. **The R9 record and VERIFICATION R9 row were wrong** to imply 28 tracked files. VERIFICATION now carries the correction; the hashed R9 record and raw log are unchanged. | From R11 the syntax log lists every file; the run was on a clean tree. 34 = 27 + 3 tools + 4 tests. |

## Results (Node v22.23.3, Python 3.13.5, Chrome 155 test-only)

| Suite | Result |
|---|---|
| Node, pinned test-only deps | 76/76 pass |
| Node, no deps | 52 pass, 0 fail, 24 SKIPPED |
| Node v20.19.2 | 70 pass, 6 fail: the intended `Node 22.12+ required` refusals (same six as R7-R10) |
| Python guard tools | 10/10 |
| R2 Node / R2 Python | 4/4, 4/4 |
| Package tests | 26/26 in the git checkout; 22 pass, 4 SKIPPED in a no-git copy |
| Package self-test | PASS |
| design.md lint 0.4.0 offline | 0 errors on example, fixture and OPUS-04 sample |
| Syntax | mjs=34 sh=4 py=4 plus the launcher `.internal`, 0 failures |
| `git diff --check eb2d540..HEAD` (logs excluded) | exit 0 |

Fixture, expected stop: `local-fixture.mjs` exit 0. These all PASS:

- browser and contract checks;
- spacing;
- accent (approved `colors.primary`);
- widths (no `scrolledText`, no candidates);
- integrity (all three worlds equal, no tamper signs);
- the served-file glass scan;
- state checks.

The gate then stops at launcher exit 3 (pinned Impeccable binary missing), as the fixture asserts. Not a gate PASS.

## Package

- `build --start 9ee1ca6aaa4a257cb84fb7381056005f48554bf3`:
  - release manifest `1ecccc42cf18521b51e28ac717bba93a15d8976117164592e3f98bc4140c7ef7` (81 files);
  - archive `49a874c60e1d5f91b82349812965c33e42fe257819611995038c4c74390fcaf4` (408 entries).
- **Registry `--registry-sha256 655da232574c37fdbc2eaf7d755a53d4640c36f6ef47e525532a1ab1673f49f7`.** 347 changed, 346 hashed (the registry itself excluded), 0 uncovered. The Asad review, the panel D1 files and the R10 record are hashed. f387d70 was an intermediate package (registry 62f61b41), superseded by 13c3551.
- Anchored verify in a separate clone at 13c3551, trust files at 0444:
  - correct pin: PASS (`registryPin: external`);
  - wrong pin: exit 1 (`registry pin mismatch`);
  - `verify-manifest.sh`: `MANIFEST OK (81 files)`.
- Secret pattern grep over `git diff 607b2e4..HEAD` and the extracted ZIP: 0 hits.

## Effects to know

- Final handoffs now fail when:
  - the page accent differs from the approved token;
  - a 320 px scroller holds ordinary text;
  - a 2D candidate has no `reflowExceptions` decision;
  - the scripted page hides glass or a reflow failure that shows with JavaScript off (unless recorded).
- Any `backdrop-filter` text in served CSS/HTML/SVG/JS fails, even in an unused rule or a script string (fail closed).
- The package build refuses any file type outside the allowlist (.md .mjs .json .sh .sha256 .txt .py .diff .internal .log, plus the ZIP itself). A new file type needs a deliberate edit to `ALLOWED_SUFFIXES`.

## Untested (details in `release/UNTESTED.md`, R11 section)

- Everything browser-side ran in Chrome 155 headless only.
- **Contrast with JavaScript off: NOT cross-checked.** axe does not complete with page scripts disabled in Chrome 155.
- The integrity checks run on the positional page only, not on every state.
- Closed shadow roots and cross-origin frames are not scanned. Cross-origin frames are blocked and listed as `unscannedFrames`; `file://` frames rely on the served-file text scan.
- Keyboard use of a candidate scroller means `tabindex` or a focusable child. Chrome's automatic focusable scrollers are not counted.
- The native-function check is a heuristic; the world comparison backs it up.
- Experimental axe A/AA rules stay manual. Package screening checks file names only, not file contents.
- Still not tested: the real Impeccable binary, a full gate PASS, real zoom and text spacing, the production browser pin and the target host. Installation stays BLOCKED pending Amin's review and Fadel's yes in Fannan's chat.
