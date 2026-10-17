# Verification — 16 October 2026

**Verdict: review candidate produced; full live handoff and installation BLOCKED.** Tests below were run on the local Mac with `/Users/fadelwaheed/.hermes/node/bin/node` v22.22.3 and Chrome 155.0.8059.85. The original Node20 Linux host was not accessed. Commands use the task directory as working directory unless stated otherwise. No paid tools, live skill install, credential mutation, saved-memory write, message or production repository change occurred.

| Command/check | Observed result | What it proves |
|---|---|---|
| `shasum -a 256 -c PACK-MANIFEST.sha256` from `input/fannan-review-pack/` | Exit 0; **51/51** entries OK | Supplied input bytes preserved; historical 43-file count is not this pack |
| `npm ci --prefix runtime-deps --ignore-scripts --no-audit --no-fund` | Implementation lane installed 200 packages outside `release/` | Pinned dependencies usable without contaminating candidate tree; not a new npm security audit |
| `npm ls --prefix runtime-deps --depth=0` | Exit 0; Google DESIGN.md 0.4.0, axe-core 4.14.0, Playwright Core 1.64.0, Style Dictionary 5.6.1, yaml 2.9.1 | Exact direct versions match supplied tool choices |
| `node --test release/tests/handoff-contract.test.mjs` | Root rerun exit 0, **1/1 test** | Synthetic contract validation and negative assertions: unsourced copy, absent N/A reviewer, approval frame omission, broken PNG, contradictory/duplicate manual FAIL, critic copy FAIL, BLOCK FAIL, token JSON/CSS alias |
| `node --check` for each `.mjs` in tools/runtime/tests; `/bin/sh -n` for each tool `.sh` | Exit 0; **7 JS modules and 4 shell scripts** | Syntax only, not full runtime or policy enforcement |
| `node release/tests/local-fixture.mjs` | Root rerun exit 0 for fixture assertions | Converter, CSS generation, browser checks, scoped copy comparison and approved-frame drift refusal work in the isolated fixture |
| Fixture `designmd-to-sd.mjs <DESIGN.md> <tokens.json> test` with external `FANNAN_DEPS` | Exit 0; colors, radius, spacing, **breakpoints**, typography and components emitted | Copied labelled example token input converts; no real project design claim |
| Fixture `sd-build.mjs <tokens.json> <variables.css> test` | Exit 0; `--colors-primary`, `--breakpoints-desktop` and `.build.json` hash receipt present | Existing Style Dictionary 5.6.1 generates CSS from JSON with reviewed config |
| Fixture `pre-handoff-check.mjs <DESIGN.md> <home.html> <fresh-evidence> test <handoff.json>` | **Exit 1 / overall FAIL** in all full-gate cases because protected detector is absent | Missing detector cannot be silently waived |
| Valid authored fixture | Contract PASS; lint zero errors; axe zero violations/incomplete; applicable state PASS; matching rendered/approved PNG SHA256; copy slots PASS; focus/target/reduced-motion checks PASS | The covered local browser and contract paths work; manual fixture verdicts are synthetic |
| Mutated HTML fixture | State FAIL; copy-deck mismatch; rendered SHA256 differs from approved SHA256 | Changed text/render cannot use stale approval as a PASS |
| Original `/bin/sh release/tools/readonly-precheck.sh /workspace/design-output/review-test/ review-test` on this Mac | **Exit 1**, `realpath: illegal option -- m` | Original guard is GNU/Linux-specific and does not run unchanged on this Mac |
| Active-set `rg` scan for old skill names | No old skill callers in active skills; old names remain only in the explicit migration map | Atomic rename candidate is internally consistent; external host callers remain untested |
| Whole-set `rg -n 'proto-' release --glob '!package-lock.json'` | Only migration-map entries and the intentionally unchanged helper/data path | Those occurrences are deliberate migration/history identifiers, not stale callers |
| Skill frontmatter validation using pinned yaml package | **16/16** names/descriptions parse and match folders; Gotchas present | Structural validity; bundled Python validator could not run without PyYAML |
| Skill relative links and genericity/paid-rule scans | No broken supporting links, named-role/project facts or obsolete paid thresholds in skills/proposed memory | Required genericity and exact save-8 wording retained |
| Eighteen document-coverage assertions plus source review | PASS for checked rule/step presence; independent review integrated | Coverage aid, not semantic or live approval certification |

Guard argument negatives also passed locally: no arguments, one argument and an empty project each returned 2; project `a/b` returned 11. Setting `FANNAN_DEPS` to `release/runtime` returned 2 with the required outside-tree refusal. These early argument checks do not validate the GNU/Linux path/symlink/hard-link enforcement. Evidence: `test-results/boundary-checks.json`.

## Fixture boundaries and exact browser evidence

`release/tests/local-fixture.mjs` copies the tools under `test-results/local-fixture/` and replaces **only those copies** of the two filesystem guards with a Node test adapter rooted in that fixture. It never alters the production guard. It uses a copied example DESIGN.md with one added test breakpoint, a tiny synthetic page, synthetic role/approval records and local screenshots. This is why fixture exit zero must not be called production pre-handoff PASS.

The valid frame's rendered and approved SHA256 both equal `8d66325bf2462eb2b75f51d9f71bd62eb99fd894ad3bc165f0c17afb628f0214` in the root rerun. After the deliberate copy mutation the render hash is `56cadf21a310b9c11c2c40d9250c212f698eb075bdc05b00770a94404e553dea`; the checker records `copy slot description differs from deck`. The protected detector still fails with launcher exit 3. Evidence files are in `test-results/local-fixture/design-output/test/evidence*/evidence.json`.

The successful full-gate branch that writes `HANDOFF.md` is code-reviewed but **not executed end to end** with the protected detector, because that binary is absent. The code now renders frame versions and criterion-level BLOCK/WARN/check/decision/evidence rows from the canonical JSON; a production success/output is not claimed.

The DOM accent measurement is a conservative background-rectangle proxy, not a pixel mask. Semantic patterns, CSS-generated/canvas text, ARIA-only labels, truth, rights and human-review authorship still need the specified manual evidence. Exact frame hashing requires the approved browser/font/render environment; cross-environment matching is not tested. The current fixture covers one simple screen/default state, not every complex UI or locale.

## Independent review closure

The read-only native reviewer requested three final fixes: visible copy binding, a useful generated checklist and approved-frame/render binding. The first and third are exercised by the root rerun's changed-copy/frame rejection. The generated checklist implementation was read back and remains a success-branch runtime gap above. Earlier reviewer findings on contradictory verdicts and artifact validity are covered by negative assertions. This is not Amin's per-file approval and does not close R3-2.

## Done-means audit

The seven requested deliverables are present in the combined Markdown, in order. The nine steps, Scope rules, AA minimum, desktop/grayscale gates, paid-action approvals, role lookup, tool choices, code read-only boundary and Amin/Fadel install gate are retained. All 16 skill files and supporting details are supplied, plus the tools, token script/config, rename map and new candidate integrity files. Unsupported media commands were removed; no missing helper behavior was invented. The labelled example is used only to detect workflow blockers.

**Unmet external conditions are explicit:** R3-2 and R3-4 cannot be honestly closed without actual reviewer/access evidence; N5's successful protected binary path and a full real gate PASS remain blocked; live paid-rule/memory activation and atomic deployment remain pending. The original target's Node22 installation and the GNU/Linux guard path are not validated. Therefore the requested all-seven-P1/live-readiness condition is **not achieved**, and this candidate is not install-ready.

Candidate hashes and exact inventory are verified separately after documentation is frozen; the manifest and its pin are outside `release/`. This verifies packaging integrity, not the missing reviewer identity or deployment authority.
