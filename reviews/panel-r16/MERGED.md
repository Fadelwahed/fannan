# Fannan panel, round 16: merged review (Mi'mar cross-check)

Head: `5fe9101` (Fadelwahed/fannan, mimar-r4-fixes), fresh clone at /workspace/panel-r16/fannan (status clean after the run).
Scope: `git diff 67f3577..5fe9101`, reviews/MIMAR-R15-changes-2ab5663.md, reviews/panel-r15/MERGED.md. Threat model: honest but sloppy authors; deliberate obfuscation = ENH. Convergence: a pass needs zero P0/P1/P2.
Guard: run.sh aborts (rc 99) unless every path contains `panel-r16` and the clone HEAD is 5fe9101. Self-test with a panel-r15 prompt aborted correctly.

## Participants (Gaza time, UTC+3)
| Reviewer | Window | Result | Cost |
|---|---|---|---|
| Grok CLI (one test) | 7:24:36–7:24:46 AM | 402: Grok Build usage balance exhausted | none |
| Opus 5.5 (one health call) | 7:24:46–7:24:47 AM | 403: Insufficient account balance, so no review | $0 |
| GPT-6.1-Sol (codex-dce, read-only, high) | 7:24:46–7:29:16 AM (270 s) | 4 findings | 154,852 tokens (ChatGPT plan, no $ reported) |

## Mi'mar re-checks (box, scratch copies only)
- R15 tests at 5fe9101: 34/34 pass, package tests OK.
- The R15 tests bite: run against the 67f3577 tool code, 6 of 11 fail (B1, B2, B3/B4, complete-handoff contract, A1 Chrome, A3 Chrome), all ERR_ASSERTION with no load or export errors. The 5 passing tests are older R14 tests. With the 67f3577 package-r3.py there are 4 package FAILs (zip contents, two camelCase JSON credential tests, sections/retired wording).
- R15 repro cases in Chrome 155: A1 auto-height wrapper now clipped=1 at 1440 and 320 (app-shell control 0). A3 opacity reveal JS-off now contrastFailures=1 (JS-on 0, grey control 1).

## Status of R15 items
| R15 item | Status at 5fe9101 |
|---|---|
| A1 scrollport clipping | Fixed (repro + test bite) |
| A2 JSON credential keys | Fixed (package tests bite) |
| A3 composited opacity | Opacity fixed. Other compositing effects are still unhandled (new R16-GPT-01) |
| B1 full wireframe gate in Step 5 | Wording fixed. The contract and runner cover only part of it (new R16-GPT-03) |
| B2 exact wording + RETIRED_SECTIONS | Fixed |
| B3 feedback-log | Fixed |
| B4 craft manual IDs + criticRows | Fixed |

GPT gave no per-item list. It confirmed nothing explicitly and reported only gaps. These statuses come from my own reruns.

## Findings (GPT's IDs renamed R14-GPT-NN to R16-GPT-NN; the prompt template had a stale ID line)
| ID | Part | GPT | Mi'mar verification | Final |
|---|---|---|---|---|
| R16-GPT-01 | A | P2 | **Confirmed in Chrome 155** (repro/repro16.mjs, out/mimar-repro-r16.log). `filter:opacity(.1)` and `filter:blur(10px)` reveals removed by script: the JS-off screenshot has no dark pixels (min luminance 230/226), but contrastProbe reports failures 0, unknown 0, checked 1. An ancestor `mix-blend-mode:screen` above an opaque black child renders a fully white image in both worlds and also probes 0/0/1. Cause: integrity.mjs:66 stops at the first opaque background and never reads `filter`. Blur-in or filter fade reveals are ordinary honest patterns, the same class as A3. | **P2 agreed** |
| R16-GPT-02 | A | P2 | **Confirmed in Chrome.** `<input type=submit value=Continue style=opacity:.05>` restored by script is visibly faded JS-off (screenshot), yet contrastChecked=1 counts only the H1. integrity.mjs:59 skips elements without text nodes. Value set by script (`value=""` JS-off) renders an empty button, and contentProbe shows identical slots/headings in both worlds. Native control text is outside both the contrast and content checks. | **P2 agreed** |
| R16-GPT-03 | B | P2 | **Confirmed by execution** (out/mimar-probe-gpt03.log). Wireframe-phase checkHandoff with both screens on nonexistent pages, languages en+ar and English-only manual records returns only `copy hero: missing ar/rtl variant`. There is no page-existence error and no Arabic manual-coverage error. handoff-contract.mjs:139 uses `languages[0]` only in wireframe. pre-handoff-check.mjs:225 iterates declared pages only for `phase==='handoff'`. The plan (line 69/71) requires the complete gate over the complete scoped set. | **P2 agreed** |
| R16-GPT-04 | B | P2 | **Confirmed by reading.** Components are listed per screen (`screens[].components`). There is no shared component registry and no cross-screen comparison. None of the 24 manualIds or the 8 critic rows covers consistency. The a11y skill's "consistent help" is WCAG 3.2.6, not component consistency. Inconsistent controls across screens are a typical sloppy-author failure that a design lead would block. | **P2 agreed (tiebreak)**: weakest of the four, but a real rule gap, not polish |

Agreed: R16-GPT-01, 02, 03, 04. Rejected: none. Disputed: R16-GPT-04 only on severity (P2 vs P3). Tiebreak is P2 because the per-screen component model allows divergent specs of the same control with every check passing.

## Verdict
**4 ISSUES (A: 2 P2, B: 2 P2; 0 P0, 0 P1). Not ZERO ISSUES, so the round does not converge.**
Fix direction: as GPT proposed in out/r1-gpt.md.
- R16-GPT-01/02: walk the full composed chain, and treat filter, blend or backdrop-filter as unknown, which makes JS-off INCOMPLETE. Include native control text in the contrast and content checks.
- R16-GPT-03: wireframe phase iterates every declared screen and locale, and requires that the pages exist.
- R16-GPT-04: canonical component spec plus a `component-consistency` manual ID.

## Untested
- Opus and Grok gave no review because both balances are exhausted.
- R16-GPT-01/02: only the probe functions were run in Chrome, not the full pre-handoff-check pipeline end to end.
- `backdrop-filter`, `select`/`placeholder` text and closed shadow roots were not probed.
- R16-GPT-03: the runner-side gap (pre-handoff-check wireframe iteration) was confirmed only by reading the code.
- R16-GPT-04: confirmed only by reading, no executed probe.
